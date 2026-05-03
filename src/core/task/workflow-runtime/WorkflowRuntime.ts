import type {
	ClineWorkflowStepResolutionStatus,
	WorkflowFormConditionDefinition,
	WorkflowFormDefinitionPayload,
	WorkflowFormFieldDefinition,
	WorkflowFormOptionDefinition,
	WorkflowFormPanelDefinition,
	WorkflowFormResolvedPanelPayload,
	WorkflowFormSubmittedValuePayload,
} from "@shared/ExtensionMessage"
import { WorkflowFormAction, type WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"
import { randomUUID } from "crypto"
import { mkdir, readFile, writeFile } from "fs/promises"
import { dirname, join } from "path"
import { isSerializedToolFailureResultText } from "@/core/prompts/responses"
import type { TaskState } from "@/core/task/TaskState"
import { buildWorkflowFormPayload } from "@/core/task/workflow-form/buildWorkflowFormPayload"
import { isWorkflowFormSubmittedValuePayload } from "@/core/task/workflow-form/schema"
import type {
	WorkflowFormRuntimeOutcome,
	WorkflowFormSessionData,
	WorkflowFormSessionState,
} from "@/core/task/workflow-form/types"
import { WorkflowFormRuntime } from "@/core/task/workflow-form/WorkflowFormRuntime"
import {
	WORKFLOW_ARTIFACT_FAMILY_REGISTRY,
	WorkflowArtifactFamily,
	type WorkflowArtifactFamilyDefinition,
} from "@/core/task/workflow-runtime/artifactFamilies"
import { discoverWorkflowCandidates } from "@/core/task/workflow-runtime/discovery"
import { resolveWorkflowDefinition } from "@/core/task/workflow-runtime/WorkflowRegistry"
import { buildWorkflowStepResolutionStatusPayload } from "@/core/task/workflow-step-resolution/buildWorkflowStepResolutionStatusPayload"
import type {
	WorkflowStepResolutionSessionState,
	WorkflowToolBackedOperationExecutionRequest,
} from "@/core/task/workflow-step-resolution/types"
import { ClineDefaultTool } from "@/shared/tools"
import type {
	ActiveWorkflowSession,
	PersistedWorkflowSession,
	WorkflowArtifactDefinition,
	WorkflowArtifactOutputValueKeys,
	WorkflowBranchContextState,
	WorkflowBranchFailureState,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionAction,
	WorkflowDecisionBranchEvaluationInput,
	WorkflowDecisionBranchRoute,
	WorkflowDefinition,
	WorkflowNextAction,
	WorkflowProjectSelectionState,
	WorkflowProjectSubfolder,
	WorkflowPromptBuilderInput,
	WorkflowPromptProjection,
	WorkflowStepDefinition,
	WorkflowValidationResult,
	WorkflowValue,
	WorkflowValues,
	WorkflowWorkspacePathPolicy,
} from "./types"
import {
	areWorkflowValuesEqual,
	isWorkflowValue,
	readRequiredStringWorkflowValue,
	stringifyWorkflowValueForPrompt,
} from "./workflowValues"

const WORKFLOW_PROJECT_SUBFOLDERS: readonly WorkflowProjectSubfolder[] = [
	"discovery",
	"planning",
	"implementation",
	"review",
	"testing",
]
const WORKFLOW_ENTRY_FORM_ID = "__workflow_runtime_entry_form__"
const WORKFLOW_ENTRY_INFO_PANEL_ID = "__workflow_runtime_entry_info__"
const WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID = "__workflow_runtime_entry_project_selection__"
const WORKFLOW_ENTRY_PROJECT_MODE_FIELD_KEY = "__workflow_runtime_project_mode__"
const WORKFLOW_ENTRY_EXISTING_PROJECT_FIELD_KEY = "__workflow_runtime_existing_project__"
const WORKFLOW_ENTRY_NEW_PROJECT_TITLE_FIELD_KEY = "__workflow_runtime_new_project_title__"

export interface WorkflowArtifactAllocationOutput {
	artifactId: string
	projectTitle: string
	projectFolderName: string
	artifactFamily: string
	artifactIdentity: string
	artifactFilename: string
	artifactRelativePath: string
	artifactAbsolutePath: string
	parentIdentity: string | undefined
	targetIdentity: string | undefined
	workflowValueWrites: WorkflowValues
}

export interface WorkflowArtifactCreationResult extends WorkflowArtifactAllocationOutput {
	changedWorkflowValues: WorkflowValues
	unchangedWorkflowValues: WorkflowValues
}

interface WorkflowArtifactIdentityResolution {
	artifactIdentity: string
	parentIdentity: string | undefined
	targetIdentity: string | undefined
}

interface ParsedWorkflowArtifactIdentity {
	artifactIdentity: string
	epicNumber: number
	storyNumber: number | undefined
	remediationStoryNumber: number | undefined
}

interface WorkflowEpicsIndexEntry {
	identity: string
	title: string
}

interface WorkflowEpicsIndex {
	version: 1
	epics: WorkflowEpicsIndexEntry[]
}

export class WorkflowRuntime {
	private readonly cwd: string
	private readonly workspacePathPolicy: WorkflowWorkspacePathPolicy
	private readonly workflowFormRuntime = new WorkflowFormRuntime()

	constructor(args: { cwd: string; workspacePathPolicy: WorkflowWorkspacePathPolicy }) {
		this.cwd = args.cwd
		this.workspacePathPolicy = args.workspacePathPolicy
	}

	private assertWorkspacePathAllowed(filePath: string): void {
		if (!this.workspacePathPolicy.validateAccess(filePath)) {
			throw new Error(`Workflow runtime path is blocked by workspace path policy: ${filePath}`)
		}
	}

	async activateWorkflow(args: {
		taskState: TaskState
		workflowName: WorkflowDefinition["name"]
		parentSession?: ActiveWorkflowSession
	}): Promise<WorkflowNextAction> {
		const { taskState, workflowName, parentSession } = args
		const workflow = resolveWorkflowDefinition(workflowName)
		if (!workflow) {
			return { kind: "no_op" }
		}

		const validationResult = this.validateWorkflowDefinition(workflow)
		if (!validationResult.valid) {
			return { kind: "no_op" }
		}

		const firstStepNumber = this.getFirstStepNumber(workflow)
		if (firstStepNumber === undefined) {
			return { kind: "no_op" }
		}

		const firstStep = workflow.steps[`step-${firstStepNumber}`]
		if (!firstStep) {
			return { kind: "no_op" }
		}

		if (
			parentSession &&
			(parentSession.projectSelection.projectTitle.trim() === "" ||
				parentSession.projectSelection.projectFolderName.trim() === "")
		) {
			return { kind: "no_op" }
		}

		const workflowValues: WorkflowValues = {}
		for (const inheritanceRule of workflow.childInheritance ?? []) {
			const parentValue = parentSession?.workflowValues[inheritanceRule.parentKey]
			if (parentValue !== undefined) {
				workflowValues[inheritanceRule.childKey] = parentValue
			}
		}

		const projectSelection = parentSession
			? { ...parentSession.projectSelection }
			: {
					projectMode: "new" as const,
					projectTitle: "",
					projectFolderName: "",
				}

		taskState.activeWorkflowName = workflow.name
		taskState.activeWorkflowSession = {
			activeStepNumber: firstStepNumber,
			workflowValues,
			projectSelection,
			ui: {
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionDefinitionIds: [],
			},
			branchContext: this.createInitialBranchContext(firstStep),
		}

		this.refreshCurrentFocusChainChecklist(taskState)

		return this.resolveNextAction({ taskState })
	}

	async resolveNextAction(args: { taskState: TaskState }): Promise<WorkflowNextAction> {
		const { taskState } = args
		const session = taskState.activeWorkflowSession
		if (!session || !taskState.activeWorkflowName) {
			return { kind: "no_op" }
		}

		const definition = resolveWorkflowDefinition(taskState.activeWorkflowName)
		if (!definition) {
			return this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		const validationResult = this.validateWorkflowDefinition(definition)
		if (!validationResult.valid) {
			return this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		if (activeStep.decisionTree.branches[session.branchContext.activeBranchId] === undefined) {
			return this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		this.refreshCurrentFocusChainChecklist(taskState)

		if (session.projectSelection.projectTitle === "" || session.projectSelection.projectFolderName === "") {
			return this.buildWorkflowEntryFormNextAction({
				taskState,
				workflow: definition,
			})
		}

		if (activeStep.completionRules?.some((rule) => rule.isComplete(session))) {
			await this.teardownWorkflow({ taskState })
			return { kind: "complete_workflow" }
		}

		const pendingTriggerEvent = session.branchContext.lastTriggerEvent
		const matchingDecisionTreeRoute = this.resolveDecisionTreeRoute({
			taskState,
			session,
			step: activeStep,
		})
		if (!matchingDecisionTreeRoute) {
			if (pendingTriggerEvent?.kind === "tool_backed_operation_failed") {
				return await this.buildTerminalErrorNextAction({
					taskState,
					errorMessage: pendingTriggerEvent.errorMessage,
				})
			}

			return { kind: "no_op" }
		}

		return this.buildNextActionFromDecisionTreeRoute({
			taskState,
			definition,
			route: matchingDecisionTreeRoute.route,
			nextActiveBranchId: matchingDecisionTreeRoute.nextActiveBranchId,
		})
	}

	async submitWorkflowForm(args: {
		taskState: TaskState
		request: WorkflowFormSubmissionRequest
	}): Promise<WorkflowNextAction> {
		const { taskState, request } = args
		const session = taskState.activeWorkflowSession
		const formSession = session?.ui.formSession

		if (!session || !formSession || request.sessionId !== formSession.sessionId) {
			return { kind: "no_op" }
		}

		const outcome = this.workflowFormRuntime.handleSubmission(formSession, request)
		if (this.isWorkflowEntryFormSession(formSession)) {
			return this.handleWorkflowEntryFormOutcome({
				taskState,
				request,
				outcome,
			})
		}

		switch (outcome.kind) {
			case "render_form": {
				if (outcome.session.failure === undefined) {
					await this.persistWorkflowFormValues({
						taskState,
						formSession: outcome.session,
					})
				}
				session.ui.formSession = outcome.session
				const definition = this.getActiveWorkflowDefinition(taskState)
				if (!definition) {
					return this.teardownWorkflowAndRequirePersistence({ taskState })
				}

				return {
					kind: "render_workflow_form",
					formSession: outcome.session,
					payload: await this.buildWorkflowFormRenderPayload({
						taskState,
						workflow: definition,
						session: outcome.session,
					}),
				}
			}
			case "complete_success":
				await this.persistWorkflowFormValues({
					taskState,
					formSession: outcome.session,
				})
				session.ui.formSession = undefined
				if (!session.ui.suppressedWorkflowFormIds.includes(outcome.session.workflowFormId)) {
					session.ui.suppressedWorkflowFormIds.push(outcome.session.workflowFormId)
				}
				session.branchContext.lastTriggerEvent = {
					kind: "workflow_form_completed",
					workflowFormId: outcome.session.workflowFormId,
				}
				return this.resolveNextAction({ taskState })
		}
	}

	async handleToolBackedOperationToolResult(args: {
		taskState: TaskState
		toolResultText?: string
	}): Promise<WorkflowNextAction> {
		const { taskState, toolResultText } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		if (session.ui.stepResolutionSession) {
			const definition = this.getActiveWorkflowDefinition(taskState)
			const stepResolutionSession = session.ui.stepResolutionSession
			const toolBackedOperationDefinition = definition?.toolBackedOperationDefinitions?.[stepResolutionSession.definitionId]
			if (!definition || !toolBackedOperationDefinition) {
				return { kind: "no_op" }
			}

			if (isSerializedToolFailureResultText(toolResultText)) {
				session.ui.stepResolutionSession = undefined
				if (!session.ui.suppressedWorkflowStepResolutionDefinitionIds.includes(stepResolutionSession.definitionId)) {
					session.ui.suppressedWorkflowStepResolutionDefinitionIds.push(stepResolutionSession.definitionId)
				}
				return this.completeToolBackedOperationFailure({
					taskState,
					toolBackedOperationId: stepResolutionSession.definitionId,
					errorMessage: toolResultText,
				})
			}

			const evaluation = toolBackedOperationDefinition.evaluateToolExecutionResult(stepResolutionSession, {
				toolResultText,
			})

			if (evaluation.succeeded) {
				session.ui.stepResolutionSession = undefined
				if (!session.ui.suppressedWorkflowStepResolutionDefinitionIds.includes(stepResolutionSession.definitionId)) {
					session.ui.suppressedWorkflowStepResolutionDefinitionIds.push(stepResolutionSession.definitionId)
				}
				return this.completeToolBackedOperationSuccess({
					taskState,
					toolBackedOperationId: stepResolutionSession.definitionId,
				})
			}

			session.ui.stepResolutionSession = undefined
			if (!session.ui.suppressedWorkflowStepResolutionDefinitionIds.includes(stepResolutionSession.definitionId)) {
				session.ui.suppressedWorkflowStepResolutionDefinitionIds.push(stepResolutionSession.definitionId)
			}
			return this.completeToolBackedOperationFailure({
				taskState,
				toolBackedOperationId: stepResolutionSession.definitionId,
				errorMessage: evaluation.errorMessage,
			})
		}

		const pendingArtifactAllocationId = this.findPendingArtifactAllocationId({ taskState })
		if (pendingArtifactAllocationId) {
			if (isSerializedToolFailureResultText(toolResultText)) {
				return this.completeToolBackedOperationFailure({
					taskState,
					toolBackedOperationId: pendingArtifactAllocationId,
					errorMessage: toolResultText,
				})
			}

			return this.completeToolBackedOperationSuccess({
				taskState,
				toolBackedOperationId: pendingArtifactAllocationId,
			})
		}

		const pendingDocumentBuilderId = this.findPendingDocumentBuilderId({ taskState })
		if (!pendingDocumentBuilderId) {
			return { kind: "no_op" }
		}

		if (isSerializedToolFailureResultText(toolResultText)) {
			return this.completeToolBackedOperationFailure({
				taskState,
				toolBackedOperationId: pendingDocumentBuilderId,
				errorMessage: toolResultText,
			})
		}

		return this.completeToolBackedOperationSuccess({
			taskState,
			toolBackedOperationId: pendingDocumentBuilderId,
		})
	}

	isWorkflowProgressRequestAllowed(args: { taskState: TaskState }): boolean {
		const { taskState } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return false
		}

		const definition = this.getActiveWorkflowDefinition(taskState)
		if (!definition) {
			return false
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return false
		}

		if (session.projectSelection.projectTitle === "" || session.projectSelection.projectFolderName === "") {
			return false
		}

		return (
			this.hasDecisionTreeRouteForTriggerEvent({
				session,
				step: activeStep,
				triggerEvent: {
					kind: "workflow_progress_request_confirmed",
				},
			}) ||
			this.hasDecisionTreeRouteForTriggerEvent({
				session,
				step: activeStep,
				triggerEvent: {
					kind: "workflow_progress_request_denied",
				},
			})
		)
	}

	async submitWorkflowProgressRequest(args: { taskState: TaskState; approved: boolean }): Promise<WorkflowNextAction> {
		const { taskState, approved } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const definition = this.getActiveWorkflowDefinition(taskState)
		if (!definition) {
			return { kind: "no_op" }
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return { kind: "no_op" }
		}

		if (session.projectSelection.projectTitle === "" || session.projectSelection.projectFolderName === "") {
			return { kind: "no_op" }
		}

		const triggerEvent: WorkflowBranchTriggerEvent = approved
			? {
					kind: "workflow_progress_request_confirmed",
				}
			: {
					kind: "workflow_progress_request_denied",
				}

		if (
			!this.hasDecisionTreeRouteForTriggerEvent({
				session,
				step: activeStep,
				triggerEvent,
			})
		) {
			return { kind: "no_op" }
		}

		session.branchContext.lastTriggerEvent = triggerEvent

		return this.resolveNextAction({ taskState })
	}

	async applyWorkflowValueWrites(args: {
		taskState: TaskState
		values: WorkflowValues
	}): Promise<{ changedValues: WorkflowValues; unchangedValues: WorkflowValues }> {
		const { taskState, values } = args
		const session = taskState.activeWorkflowSession
		const definition = session ? this.getActiveWorkflowDefinition(taskState) : undefined
		const allowedKeys = new Set(definition?.workflowValueKeys ?? [])

		const changedValues: WorkflowValues = {}
		const unchangedValues: WorkflowValues = {}

		for (const [key, rawValue] of Object.entries(values)) {
			if (!isWorkflowValue(rawValue)) {
				throw new Error(`Workflow value ${key} must be a JSON-safe workflow value.`)
			}

			if (!allowedKeys.has(key)) {
				unchangedValues[key] = rawValue
				continue
			}

			const currentValue = session?.workflowValues[key]
			if (areWorkflowValuesEqual(currentValue, rawValue)) {
				unchangedValues[key] = rawValue
				continue
			}

			if (!session) {
				unchangedValues[key] = rawValue
				continue
			}

			session.workflowValues[key] = rawValue
			changedValues[key] = rawValue
		}

		const changedKeys = Object.keys(changedValues)
		if (changedKeys.length > 0) {
			this.recordWorkflowValuesPersistedTriggerIfRouted({
				taskState,
				changedKeys,
			})
		}

		return {
			changedValues,
			unchangedValues,
		}
	}

	private recordWorkflowValuesPersistedTriggerIfRouted(args: { taskState: TaskState; changedKeys: readonly string[] }): void {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return
		}

		const definition = this.getActiveWorkflowDefinition(args.taskState)
		if (!definition) {
			return
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return
		}

		if (session.projectSelection.projectTitle.trim() === "" || session.projectSelection.projectFolderName.trim() === "") {
			return
		}

		const triggerEvent: WorkflowBranchTriggerEvent = {
			kind: "workflow_values_persisted",
			changedKeys: args.changedKeys,
		}

		if (
			!this.hasDecisionTreeRouteForTriggerEvent({
				session,
				step: activeStep,
				triggerEvent,
			})
		) {
			return
		}

		session.branchContext.lastTriggerEvent = triggerEvent
	}

	async prepareWorkflowArtifactCreation(args: {
		taskState: TaskState
		artifactId: string
	}): Promise<WorkflowArtifactAllocationOutput> {
		const { taskState, artifactId } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			throw new Error("Cannot allocate workflow artifact without an active workflow session.")
		}

		const workflow = this.getActiveWorkflowDefinition(taskState)
		if (!workflow) {
			throw new Error("Cannot allocate workflow artifact without an active workflow definition.")
		}

		const artifactDefinition = workflow.artifacts?.[artifactId]
		if (!artifactDefinition || artifactDefinition.id !== artifactId) {
			throw new Error(`Active workflow ${workflow.name} does not define artifactId ${artifactId}.`)
		}

		return this.resolveWorkflowArtifactAllocation({
			workflow,
			session,
			artifactDefinition,
		})
	}

	async createWorkflowArtifact(args: {
		taskState: TaskState
		artifactId: string
		expectedArtifactAbsolutePath: string | undefined
	}): Promise<WorkflowArtifactCreationResult> {
		const allocation = await this.prepareWorkflowArtifactCreation({
			taskState: args.taskState,
			artifactId: args.artifactId,
		})

		if (
			args.expectedArtifactAbsolutePath !== undefined &&
			args.expectedArtifactAbsolutePath !== allocation.artifactAbsolutePath
		) {
			throw new Error("Workflow artifact allocation changed before file creation.")
		}

		const artifactParentDirectory = dirname(allocation.artifactAbsolutePath)
		this.assertWorkspacePathAllowed(artifactParentDirectory)
		await mkdir(artifactParentDirectory, { recursive: true })
		this.assertWorkspacePathAllowed(allocation.artifactAbsolutePath)
		await writeFile(allocation.artifactAbsolutePath, "", { encoding: "utf8", flag: "wx" })

		const workflowValueWriteResult = await this.applyWorkflowValueWrites({
			taskState: args.taskState,
			values: allocation.workflowValueWrites,
		})

		return {
			...allocation,
			changedWorkflowValues: workflowValueWriteResult.changedValues,
			unchangedWorkflowValues: workflowValueWriteResult.unchangedValues,
		}
	}

	async buildTurnProjection(args: { taskState: TaskState }): Promise<WorkflowPromptProjection> {
		const { taskState } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return {}
		}

		const definition = this.getActiveWorkflowDefinition(taskState)
		if (!definition) {
			return {}
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return {}
		}

		const promptBuilderInput: WorkflowPromptBuilderInput = {
			session,
			step: activeStep,
			renderWorkflowValue: stringifyWorkflowValueForPrompt,
		}
		const promptSource = activeStep.buildPromptSource(promptBuilderInput)
		const workflowStepList = this.buildWorkflowStepChecklist(definition, session)
		const workflowToolSchemaOverride = activeStep.buildToolSchema(promptBuilderInput)

		return {
			fullTurnWorkflowSystemInstructionsBlock: this.joinPromptSections([
				`## WORKFLOW\nWorkflow: ${definition.name}`,
				taskState.apiRequestCount === 1 ? `## WORKFLOW PERSONA\n${definition.persona}` : undefined,
				`## WORKFLOW STEPS\n${workflowStepList}`,
				promptSource.workflowSystemInstructions
					? `## WORKFLOW INSTRUCTIONS\n${promptSource.workflowSystemInstructions}`
					: undefined,
			]),
			fullTurnWorkflowInputInstructionsBlock: this.joinPromptSections([
				`## CURRENT STEP\nStep ${activeStep.stepNumber}: ${activeStep.checklistLabel}`,
				promptSource.currentStepInstructions,
			]),
			workflowToolSchemaOverride,
			continuationTurnWorkflowSystemInstructionsBlock: this.joinPromptSections([
				`## WORKFLOW\nWorkflow: ${definition.name}`,
				`## WORKFLOW STEPS\n${workflowStepList}`,
				promptSource.workflowSystemInstructions
					? `## WORKFLOW INSTRUCTIONS\n${promptSource.workflowSystemInstructions}`
					: undefined,
			]),
			continuationTurnWorkflowInputInstructionsBlock: this.joinPromptSections([
				`## WORKFLOW CONTINUATION\nContinue working on step ${activeStep.stepNumber}: ${activeStep.checklistLabel}.`,
			]),
		}
	}

	buildToolBackedOperationStatusPayload(args: {
		taskState: TaskState
		session: WorkflowStepResolutionSessionState
	}): ClineWorkflowStepResolutionStatus | undefined {
		const definition = this.getActiveWorkflowDefinition(args.taskState)
		const toolBackedOperationDefinition = definition?.toolBackedOperationDefinitions?.[args.session.definitionId]
		if (!toolBackedOperationDefinition) {
			return undefined
		}

		return buildWorkflowStepResolutionStatusPayload(
			args.session,
			toolBackedOperationDefinition.buildStatusDefinition(args.session),
		)
	}

	private cloneWorkflowSession(session: ActiveWorkflowSession): ActiveWorkflowSession {
		return {
			activeStepNumber: session.activeStepNumber,
			workflowValues: structuredClone(session.workflowValues),
			projectSelection: structuredClone(session.projectSelection),
			ui: structuredClone(session.ui),
			branchContext: structuredClone(session.branchContext),
		}
	}

	private isPlainRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && Array.isArray(value) === false
	}

	private isStringArray(value: unknown): value is string[] {
		return Array.isArray(value) && value.every((entry) => typeof entry === "string")
	}

	private isRestorableWorkflowValueRecord(value: unknown, definition: WorkflowDefinition): value is WorkflowValues {
		if (this.isPlainRecord(value) === false) {
			return false
		}

		const allowedKeys = new Set(definition.workflowValueKeys)
		return Object.entries(value).every(([key, entry]) => allowedKeys.has(key) && isWorkflowValue(entry))
	}

	private isWorkflowProjectSelectionState(value: unknown): value is WorkflowProjectSelectionState {
		if (this.isPlainRecord(value) === false) {
			return false
		}

		return (
			(value.projectMode === "new" || value.projectMode === "existing") &&
			typeof value.projectTitle === "string" &&
			typeof value.projectFolderName === "string"
		)
	}

	private isWorkflowBranchFailureState(value: unknown): value is WorkflowBranchFailureState {
		if (this.isPlainRecord(value) === false) {
			return false
		}

		const retryAttemptCount = value.retryAttemptCount
		const terminalErrorMessageIsValid =
			value.terminalErrorMessage === undefined || typeof value.terminalErrorMessage === "string"
		return (
			typeof retryAttemptCount === "number" &&
			Number.isInteger(retryAttemptCount) &&
			retryAttemptCount >= 0 &&
			terminalErrorMessageIsValid
		)
	}

	private isWorkflowBranchTriggerEvent(value: unknown): value is WorkflowBranchTriggerEvent {
		if (this.isPlainRecord(value) === false) {
			return false
		}

		switch (value.kind) {
			case "project_selection_completed":
			case "workflow_progress_request_confirmed":
			case "workflow_progress_request_denied":
				return true
			case "workflow_form_completed":
				return typeof value.workflowFormId === "string" && value.workflowFormId.trim() !== ""
			case "workflow_values_persisted":
				return this.isStringArray(value.changedKeys)
			case "tool_backed_operation_succeeded":
				return typeof value.toolBackedOperationId === "string" && value.toolBackedOperationId.trim() !== ""
			case "tool_backed_operation_failed":
				return (
					typeof value.toolBackedOperationId === "string" &&
					value.toolBackedOperationId.trim() !== "" &&
					(value.errorMessage === undefined || typeof value.errorMessage === "string")
				)
			default:
				return false
		}
	}

	private isWorkflowFormSessionData(value: unknown): value is WorkflowFormSessionData {
		if (this.isPlainRecord(value) === false) {
			return false
		}

		return Object.values(value).every(
			(entry) =>
				entry === undefined ||
				typeof entry === "string" ||
				typeof entry === "number" ||
				typeof entry === "boolean" ||
				Array.isArray(entry) ||
				this.isPlainRecord(entry),
		)
	}

	private validateAndNormalizePersistedFormSessionForRestore(args: {
		persistedFormSession: unknown
		definition: WorkflowDefinition
		activeStep: WorkflowStepDefinition
		activeBranchId: string
		projectSelection: WorkflowProjectSelectionState
	}): WorkflowFormSessionState | undefined {
		const { persistedFormSession, definition, activeStep, activeBranchId, projectSelection } = args
		if (this.isPlainRecord(persistedFormSession) === false) {
			return undefined
		}

		const sessionId = persistedFormSession.sessionId
		if (typeof sessionId !== "string" || sessionId.trim() === "") {
			return undefined
		}

		const workflowFormId = persistedFormSession.workflowFormId
		if (typeof workflowFormId !== "string" || workflowFormId.trim() === "") {
			return undefined
		}

		let definitionPayload: WorkflowFormDefinitionPayload
		if (workflowFormId === WORKFLOW_ENTRY_FORM_ID) {
			if (projectSelection.projectTitle !== "" && projectSelection.projectFolderName !== "") {
				return undefined
			}

			definitionPayload = this.buildWorkflowEntryFormDefinition(definition)
		} else {
			const workflowFormDefinitionPayload = definition.workflowForms?.[workflowFormId]
			if (workflowFormDefinitionPayload === undefined) {
				return undefined
			}

			const continuationRoute = this.findContinuationSourceRoute({
				step: activeStep,
				activeBranchId,
				matches: (route) =>
					route.action.kind === "render_workflow_form" && route.action.workflowFormId === workflowFormId,
			})
			if (continuationRoute === undefined) {
				return undefined
			}

			definitionPayload = workflowFormDefinitionPayload
		}

		const currentPanelId = persistedFormSession.currentPanelId
		if (typeof currentPanelId !== "string" || definitionPayload.panels[currentPanelId] === undefined) {
			return undefined
		}

		if (this.isPlainRecord(persistedFormSession.values) === false) {
			return undefined
		}

		const currentFieldKeys = new Set<string>()
		for (const panel of Object.values(definitionPayload.panels)) {
			for (const field of panel.fields) {
				currentFieldKeys.add(field.key)
			}
		}

		const values: WorkflowFormSessionState["values"] = {}
		for (const [key, value] of Object.entries(persistedFormSession.values)) {
			if (currentFieldKeys.has(key) === false) {
				return undefined
			}

			if (isWorkflowFormSubmittedValuePayload(value) === false) {
				return undefined
			}

			values[key] = structuredClone(value)
		}

		if (this.isWorkflowFormSessionData(persistedFormSession.data) === false) {
			return undefined
		}

		const normalizedSession: WorkflowFormSessionState = {
			sessionId,
			workflowFormId,
			definitionVersion: definitionPayload.definitionVersion,
			definitionPayload,
			firstPanelId: definitionPayload.firstPanelId,
			currentPanelId,
			values,
			data: structuredClone(persistedFormSession.data),
		}

		const failure = persistedFormSession.failure
		if (failure !== undefined) {
			if (this.isPlainRecord(failure) === false) {
				return undefined
			}

			const failurePanelId = failure.panelId
			const failureErrorMessage = failure.errorMessage
			if (
				typeof failurePanelId !== "string" ||
				definitionPayload.panels[failurePanelId] === undefined ||
				typeof failureErrorMessage !== "string"
			) {
				return undefined
			}

			normalizedSession.failure = {
				panelId: failurePanelId,
				errorMessage: failureErrorMessage,
			}
		}

		return normalizedSession
	}

	private validateAndNormalizePersistedStepResolutionSessionForRestore(args: {
		persistedStepResolutionSession: unknown
		definition: WorkflowDefinition
		activeStep: WorkflowStepDefinition
		activeBranchId: string
		activeWorkflowName: string
	}): WorkflowStepResolutionSessionState | undefined {
		const { persistedStepResolutionSession, definition, activeStep, activeBranchId, activeWorkflowName } = args
		if (this.isPlainRecord(persistedStepResolutionSession) === false) {
			return undefined
		}

		if (
			typeof persistedStepResolutionSession.sessionId !== "string" ||
			persistedStepResolutionSession.sessionId.trim() === ""
		) {
			return undefined
		}

		if (
			typeof persistedStepResolutionSession.definitionId !== "string" ||
			persistedStepResolutionSession.definitionId.trim() === "" ||
			definition.toolBackedOperationDefinitions?.[persistedStepResolutionSession.definitionId] === undefined
		) {
			return undefined
		}

		if (persistedStepResolutionSession.triggerSource !== "execute_tool_backed_operation") {
			return undefined
		}

		if (persistedStepResolutionSession.state !== "pending") {
			return undefined
		}

		if (this.isPlainRecord(persistedStepResolutionSession.owner) === false) {
			return undefined
		}

		if (
			persistedStepResolutionSession.owner.kind !== "workflow_step" ||
			persistedStepResolutionSession.owner.workflowName !== activeWorkflowName ||
			persistedStepResolutionSession.owner.stepNumber !== activeStep.stepNumber
		) {
			return undefined
		}

		if (
			persistedStepResolutionSession.lastError !== undefined &&
			typeof persistedStepResolutionSession.lastError !== "string"
		) {
			return undefined
		}

		const continuationRoute = this.findContinuationSourceRoute({
			step: activeStep,
			activeBranchId,
			matches: (route) =>
				route.action.kind === "execute_tool_backed_operation" &&
				route.action.toolBackedOperationId === persistedStepResolutionSession.definitionId,
		})
		if (continuationRoute === undefined) {
			return undefined
		}

		const normalizedSession: WorkflowStepResolutionSessionState = {
			sessionId: persistedStepResolutionSession.sessionId,
			definitionId: persistedStepResolutionSession.definitionId,
			triggerSource: "execute_tool_backed_operation",
			owner: {
				kind: "workflow_step",
				workflowName: activeWorkflowName,
				stepNumber: activeStep.stepNumber,
			},
			state: "pending",
		}

		if (persistedStepResolutionSession.lastError !== undefined) {
			normalizedSession.lastError = persistedStepResolutionSession.lastError
		}

		return normalizedSession
	}

	private isWorkflowBranchTriggerEventCompatibleWithDefinition(
		definition: WorkflowDefinition,
		triggerEvent: WorkflowBranchTriggerEvent,
	): boolean {
		switch (triggerEvent.kind) {
			case "workflow_form_completed":
				return definition.workflowForms?.[triggerEvent.workflowFormId] !== undefined
			case "workflow_values_persisted":
				return triggerEvent.changedKeys.every((key) => definition.workflowValueKeys.includes(key))
			case "tool_backed_operation_succeeded":
				return definition.toolBackedOperationDefinitions?.[triggerEvent.toolBackedOperationId] !== undefined
			case "tool_backed_operation_failed":
				return definition.toolBackedOperationDefinitions?.[triggerEvent.toolBackedOperationId] !== undefined
			default:
				return true
		}
	}

	private validatePersistedWorkflowSessionForRestore(args: {
		persistedSession: unknown
		definition: WorkflowDefinition
		activeWorkflowName: string
	}): PersistedWorkflowSession | undefined {
		const { persistedSession, definition, activeWorkflowName } = args
		if (this.isPlainRecord(persistedSession) === false) {
			return undefined
		}

		const activeStepNumber = persistedSession.activeStepNumber
		if (typeof activeStepNumber !== "number" || Number.isInteger(activeStepNumber) === false) {
			return undefined
		}

		const activeStep = definition.steps[`step-${activeStepNumber}`]
		if (activeStep === undefined) {
			return undefined
		}

		if (this.isRestorableWorkflowValueRecord(persistedSession.workflowValues, definition) === false) {
			return undefined
		}

		if (this.isWorkflowProjectSelectionState(persistedSession.projectSelection) === false) {
			return undefined
		}

		if (this.isPlainRecord(persistedSession.branchContext) === false) {
			return undefined
		}

		if (
			typeof persistedSession.branchContext.activeBranchId !== "string" ||
			activeStep.decisionTree.branches[persistedSession.branchContext.activeBranchId] === undefined
		) {
			return undefined
		}

		const branchContext: WorkflowBranchContextState = {
			activeBranchId: persistedSession.branchContext.activeBranchId,
		}

		if (persistedSession.branchContext.lastTriggerEvent !== undefined) {
			if (this.isWorkflowBranchTriggerEvent(persistedSession.branchContext.lastTriggerEvent) === false) {
				return undefined
			}

			if (
				this.isWorkflowBranchTriggerEventCompatibleWithDefinition(
					definition,
					persistedSession.branchContext.lastTriggerEvent,
				) === false
			) {
				return undefined
			}

			branchContext.lastTriggerEvent = structuredClone(persistedSession.branchContext.lastTriggerEvent)
		}

		if (persistedSession.branchContext.failureState !== undefined) {
			if (this.isWorkflowBranchFailureState(persistedSession.branchContext.failureState) === false) {
				return undefined
			}

			branchContext.failureState = structuredClone(persistedSession.branchContext.failureState)
		}

		if (this.isPlainRecord(persistedSession.ui) === false) {
			return undefined
		}

		if (this.isStringArray(persistedSession.ui.suppressedWorkflowFormIds) === false) {
			return undefined
		}

		const workflowFormIds = new Set(Object.keys(definition.workflowForms ?? {}))
		if (
			persistedSession.ui.suppressedWorkflowFormIds.some((workflowFormId) => workflowFormIds.has(workflowFormId) === false)
		) {
			return undefined
		}

		if (this.isStringArray(persistedSession.ui.suppressedWorkflowStepResolutionDefinitionIds) === false) {
			return undefined
		}

		const toolBackedOperationIds = new Set(Object.keys(definition.toolBackedOperationDefinitions ?? {}))
		if (
			persistedSession.ui.suppressedWorkflowStepResolutionDefinitionIds.some(
				(definitionId) => toolBackedOperationIds.has(definitionId) === false,
			)
		) {
			return undefined
		}

		if (persistedSession.ui.formSession !== undefined && persistedSession.ui.stepResolutionSession !== undefined) {
			return undefined
		}

		let formSession: WorkflowFormSessionState | undefined
		if (persistedSession.ui.formSession !== undefined) {
			formSession = this.validateAndNormalizePersistedFormSessionForRestore({
				persistedFormSession: persistedSession.ui.formSession,
				definition,
				activeStep,
				activeBranchId: branchContext.activeBranchId,
				projectSelection: persistedSession.projectSelection,
			})
			if (formSession === undefined) {
				return undefined
			}
		}

		let stepResolutionSession: WorkflowStepResolutionSessionState | undefined
		if (persistedSession.ui.stepResolutionSession !== undefined) {
			stepResolutionSession = this.validateAndNormalizePersistedStepResolutionSessionForRestore({
				persistedStepResolutionSession: persistedSession.ui.stepResolutionSession,
				definition,
				activeStep,
				activeBranchId: branchContext.activeBranchId,
				activeWorkflowName,
			})
			if (stepResolutionSession === undefined) {
				return undefined
			}
		}

		return {
			activeStepNumber,
			workflowValues: structuredClone(persistedSession.workflowValues),
			projectSelection: {
				projectMode: persistedSession.projectSelection.projectMode,
				projectTitle: persistedSession.projectSelection.projectTitle,
				projectFolderName: persistedSession.projectSelection.projectFolderName,
			},
			ui: {
				formSession,
				stepResolutionSession,
				suppressedWorkflowFormIds: [...persistedSession.ui.suppressedWorkflowFormIds],
				suppressedWorkflowStepResolutionDefinitionIds: [
					...persistedSession.ui.suppressedWorkflowStepResolutionDefinitionIds,
				],
			},
			branchContext,
		}
	}

	getPersistedSession(args: { taskState: TaskState }): PersistedWorkflowSession | undefined {
		return args.taskState.activeWorkflowSession ? this.cloneWorkflowSession(args.taskState.activeWorkflowSession) : undefined
	}

	async restorePersistedSession(args: {
		taskState: TaskState
		persistedSession?: PersistedWorkflowSession
	}): Promise<WorkflowNextAction | undefined> {
		const { taskState, persistedSession } = args
		if (!persistedSession) {
			return undefined
		}

		const activeWorkflowName = taskState.activeWorkflowName
		if (activeWorkflowName === undefined) {
			return await this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		const definition = resolveWorkflowDefinition(activeWorkflowName)
		if (!definition) {
			return this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		const validationResult = this.validateWorkflowDefinition(definition)
		if (!validationResult.valid) {
			return this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		const validatedPersistedSession = this.validatePersistedWorkflowSessionForRestore({
			persistedSession,
			definition,
			activeWorkflowName,
		})
		if (validatedPersistedSession === undefined) {
			return this.teardownWorkflowAndRequirePersistence({ taskState })
		}

		taskState.activeWorkflowSession = this.cloneWorkflowSession(validatedPersistedSession)
		this.refreshCurrentFocusChainChecklist(taskState)

		return this.resolveNextAction({ taskState })
	}

	async teardownWorkflow(args: { taskState: TaskState }): Promise<void> {
		const { taskState } = args
		taskState.activeWorkflowName = undefined
		taskState.activeWorkflowSession = undefined
		taskState.currentFocusChainChecklist = null
	}

	private async teardownWorkflowAndRequirePersistence(args: { taskState: TaskState }): Promise<WorkflowNextAction> {
		await this.teardownWorkflow({ taskState: args.taskState })
		return { kind: "persist_workflow_teardown" }
	}

	private getActiveWorkflowDefinition(taskState: TaskState): WorkflowDefinition | undefined {
		return taskState.activeWorkflowName ? resolveWorkflowDefinition(taskState.activeWorkflowName) : undefined
	}

	private getActiveStepDefinition(
		definition: WorkflowDefinition,
		session: Pick<ActiveWorkflowSession, "activeStepNumber">,
	): WorkflowStepDefinition | undefined {
		return definition.steps[`step-${session.activeStepNumber}`]
	}

	private getFirstStepNumber(workflow: WorkflowDefinition): number | undefined {
		return Object.values(workflow.steps)
			.sort((left, right) => left.stepNumber - right.stepNumber)
			.at(0)?.stepNumber
	}

	private createInitialBranchContext(step: WorkflowStepDefinition): WorkflowBranchContextState {
		return {
			activeBranchId: step.decisionTree.entryBranchId,
		}
	}

	private buildWorkflowFormSubmittedValueComparableValue(value: WorkflowFormSubmittedValuePayload | undefined): unknown {
		if (!value) {
			return undefined
		}

		switch (value.valueType) {
			case "string":
				return value.stringValue
			case "boolean":
				return value.booleanValue
			case "integer":
				return value.integerValue
			case "number":
				return value.numberValue
			case "array":
				return (value.arrayValue ?? []).map((entry) => this.buildWorkflowFormSubmittedValueComparableValue(entry))
			case "object":
				return Object.fromEntries(
					(value.objectValue ?? []).map((entry) => [
						entry.key,
						this.buildWorkflowFormSubmittedValueComparableValue(entry.value),
					]),
				)
		}
	}

	private isWorkflowFormSubmittedValuePayload(value: unknown): value is WorkflowFormSubmittedValuePayload {
		return value !== null && typeof value === "object" && !Array.isArray(value) && "valueType" in value
	}

	private isWorkflowFormComparableValue(value: unknown): value is string | boolean | number {
		return typeof value === "string" || typeof value === "boolean" || typeof value === "number"
	}

	private convertWorkflowFormSubmittedValueToWorkflowValue(
		value: WorkflowFormSubmittedValuePayload | undefined,
	): { ok: true; value: WorkflowValue } | { ok: false; errorMessage: string } {
		if (!value) {
			return {
				ok: false,
				errorMessage: "Malformed workflow form submitted value: missing submitted value.",
			}
		}

		switch (value.valueType) {
			case "string":
				if (value.stringValue === undefined) {
					return {
						ok: false,
						errorMessage: "Malformed workflow form submitted value: string value is missing.",
					}
				}
				return { ok: true, value: value.stringValue }
			case "boolean":
				if (value.booleanValue === undefined) {
					return {
						ok: false,
						errorMessage: "Malformed workflow form submitted value: boolean value is missing.",
					}
				}
				return { ok: true, value: value.booleanValue }
			case "integer":
				if (value.integerValue === undefined || !Number.isInteger(value.integerValue)) {
					return {
						ok: false,
						errorMessage: "Malformed workflow form submitted value: integer value is missing or invalid.",
					}
				}
				return { ok: true, value: value.integerValue }
			case "number":
				if (value.numberValue === undefined || !Number.isFinite(value.numberValue)) {
					return {
						ok: false,
						errorMessage: "Malformed workflow form submitted value: number value is missing or invalid.",
					}
				}
				return { ok: true, value: value.numberValue }
			case "array": {
				if (value.arrayValue === undefined) {
					return {
						ok: false,
						errorMessage: "Malformed workflow form submitted value: array value is missing.",
					}
				}

				const arrayValue: WorkflowValue[] = []
				for (const entry of value.arrayValue) {
					const convertedEntry = this.convertWorkflowFormSubmittedValueToWorkflowValue(entry)
					if (!convertedEntry.ok) {
						return convertedEntry
					}
					arrayValue.push(convertedEntry.value)
				}

				return { ok: true, value: arrayValue }
			}
			case "object": {
				if (value.objectValue === undefined) {
					return {
						ok: false,
						errorMessage: "Malformed workflow form submitted value: object value is missing.",
					}
				}

				const objectValue: { [key: string]: WorkflowValue } = {}
				for (const entry of value.objectValue) {
					if (entry.key.trim() === "") {
						return {
							ok: false,
							errorMessage: "Malformed workflow form submitted value: object entry key is empty.",
						}
					}

					const convertedEntry = this.convertWorkflowFormSubmittedValueToWorkflowValue(entry.value)
					if (!convertedEntry.ok) {
						return convertedEntry
					}
					objectValue[entry.key] = convertedEntry.value
				}

				return { ok: true, value: objectValue }
			}
			default:
				return {
					ok: false,
					errorMessage: `Unsupported workflow form submitted value type: ${String(value.valueType)}.`,
				}
		}
	}

	private collectWorkflowValueWritesFromFormSession(
		formSession: Pick<WorkflowFormSessionState, "definitionPayload" | "values">,
	): WorkflowValues {
		const workflowValueWrites: WorkflowValues = {}
		const workflowValueKeyByFieldKey: Record<string, string> = {}

		for (const panel of Object.values(formSession.definitionPayload.panels)) {
			for (const field of panel.fields) {
				if (field.workflowValueKey === undefined) {
					continue
				}

				workflowValueKeyByFieldKey[field.key] = field.workflowValueKey
			}
		}

		for (const [fieldKey, submittedValue] of Object.entries(formSession.values)) {
			const workflowValueKey = workflowValueKeyByFieldKey[fieldKey]
			if (workflowValueKey === undefined) {
				continue
			}

			const conversion = this.convertWorkflowFormSubmittedValueToWorkflowValue(submittedValue)
			if (!conversion.ok) {
				throw new Error(conversion.errorMessage)
			}

			workflowValueWrites[workflowValueKey] = conversion.value
		}

		return workflowValueWrites
	}

	private async persistWorkflowFormValues(args: {
		taskState: TaskState
		formSession: WorkflowFormSessionState
	}): Promise<void> {
		const workflowValueWrites = this.collectWorkflowValueWritesFromFormSession(args.formSession)
		if (Object.keys(workflowValueWrites).length === 0) {
			return
		}

		await this.applyWorkflowValueWrites({
			taskState: args.taskState,
			values: workflowValueWrites,
		})
	}

	private isWorkflowEntryFormSession(formSession: Pick<WorkflowFormSessionState, "workflowFormId">): boolean {
		return formSession.workflowFormId === WORKFLOW_ENTRY_FORM_ID
	}

	private buildWorkflowEntryTitle(workflowName: string): string {
		const transformedName = workflowName
			.split("-")
			.map((token) => token.charAt(0).toUpperCase() + token.slice(1))
			.join(" ")

		return `Welcome to the ${transformedName} Workflow!`
	}

	private buildWorkflowEntryModeVisibilityCondition(
		projectMode: WorkflowProjectSelectionState["projectMode"],
	): WorkflowFormConditionDefinition {
		return {
			sourceKey: WORKFLOW_ENTRY_PROJECT_MODE_FIELD_KEY,
			operator: "equals",
			value: projectMode,
		}
	}

	private buildWorkflowEntryFormDefinition(workflow: WorkflowDefinition): WorkflowFormDefinitionPayload {
		return {
			definitionVersion: 1,
			title: this.buildWorkflowEntryTitle(workflow.name),
			toolDictionaryTitle: "",
			toolDictionaryMarkdown: "",
			firstPanelId: WORKFLOW_ENTRY_INFO_PANEL_ID,
			panels: {
				[WORKFLOW_ENTRY_INFO_PANEL_ID]: {
					panelId: WORKFLOW_ENTRY_INFO_PANEL_ID,
					title: "Workflow Overview",
					promptMarkdown: workflow.entryPanel.promptMarkdown,
					fields: [],
					allowedActions: ["submit"],
					actionLabels: {
						submit: "Continue",
					},
					transition: {
						type: "sequential",
						nextPanelId: WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID,
					},
				},
				[WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID]: {
					panelId: WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID,
					title: "Project Selection",
					promptMarkdown: "Choose whether to start a new project or continue with an existing project.",
					fields: [
						{
							key: WORKFLOW_ENTRY_PROJECT_MODE_FIELD_KEY,
							kind: "radio_group",
							label: "Project mode",
							helpText: "Select how this workflow should resolve its active project.",
							required: true,
							options: [
								{
									value: "new",
									label: "New Project",
								},
								{
									value: "existing",
									label: "Existing Project",
								},
							],
						},
						{
							key: WORKFLOW_ENTRY_EXISTING_PROJECT_FIELD_KEY,
							kind: "dropdown",
							label: "Existing project",
							helpText: "Select an existing project output folder.",
							required: true,
							visibilityCondition: this.buildWorkflowEntryModeVisibilityCondition("existing"),
							selectorDiscovery: {
								root: {
									kind: "project_output_root",
								},
								entryType: "directory",
								immediateChildrenOnly: true,
								sort: "alpha_asc",
							},
						},
						{
							key: WORKFLOW_ENTRY_NEW_PROJECT_TITLE_FIELD_KEY,
							kind: "small_text",
							label: "Project title",
							helpText: "Provide the human-facing title for the new project.",
							required: true,
							placeholder: "Enter a project title",
							visibilityCondition: this.buildWorkflowEntryModeVisibilityCondition("new"),
						},
					],
					allowedActions: ["submit", "back"],
					actionLabels: {
						submit: "Start Workflow",
						back: "Back",
					},
					transition: {
						type: "sequential",
						nextPanelId: WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID,
					},
				},
			},
		}
	}

	private async buildWorkflowEntryFormNextAction(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const definitionPayload = this.buildWorkflowEntryFormDefinition(args.workflow)
		const existingFormSession = session.ui.formSession
		const formSession =
			existingFormSession && this.isWorkflowEntryFormSession(existingFormSession)
				? {
						...existingFormSession,
						definitionPayload,
						firstPanelId: definitionPayload.firstPanelId,
					}
				: this.workflowFormRuntime.createSession({
						workflowFormId: WORKFLOW_ENTRY_FORM_ID,
						definitionPayload,
					})

		session.ui.formSession = formSession

		const payload = await this.buildWorkflowFormRenderPayload({
			taskState: args.taskState,
			workflow: args.workflow,
			session: formSession,
		})

		return {
			kind: "render_workflow_form",
			formSession,
			payload,
		}
	}

	private readWorkflowEntryFormStringValue(
		formSession: Pick<WorkflowFormSessionState, "values">,
		key: string,
	): string | undefined {
		const submittedValue = formSession.values[key]
		if (!submittedValue || submittedValue.valueType !== "string") {
			return undefined
		}

		return submittedValue.stringValue?.trim()
	}

	private async resolveWorkflowEntryProjectSelection(args: { formSession: Pick<WorkflowFormSessionState, "values"> }): Promise<
		| {
				projectSelection: WorkflowProjectSelectionState
		  }
		| {
				errorMessage: string
		  }
	> {
		const projectMode = this.readWorkflowEntryFormStringValue(args.formSession, WORKFLOW_ENTRY_PROJECT_MODE_FIELD_KEY)
		if (projectMode === "existing") {
			const selectedExistingProject = this.readWorkflowEntryFormStringValue(
				args.formSession,
				WORKFLOW_ENTRY_EXISTING_PROJECT_FIELD_KEY,
			)
			if (!selectedExistingProject) {
				return {
					errorMessage: "Select an existing project before continuing.",
				}
			}

			const existingProjectOptions = await discoverWorkflowCandidates({
				baseDirectory: this.cwd,
				workspacePathPolicy: this.workspacePathPolicy,
				entryType: "directory",
				immediateChildrenOnly: true,
				sort: "alpha_asc",
				buildLabel: (entryName) => entryName,
			})
			if (!existingProjectOptions.some((option) => option.value === selectedExistingProject)) {
				return {
					errorMessage: "Select an existing project from the discovered project list.",
				}
			}

			return {
				projectSelection: {
					projectMode: "existing",
					projectTitle: selectedExistingProject,
					projectFolderName: selectedExistingProject,
				},
			}
		}

		if (projectMode === "new") {
			const projectTitle = this.readWorkflowEntryFormStringValue(
				args.formSession,
				WORKFLOW_ENTRY_NEW_PROJECT_TITLE_FIELD_KEY,
			)
			if (!projectTitle) {
				return {
					errorMessage: "Provide a project title before continuing.",
				}
			}

			const projectFolderName = this.normalizeProjectFolderName(projectTitle)
			if (projectFolderName === "") {
				return {
					errorMessage: "Provide a project title that can be normalized into a folder name.",
				}
			}

			return {
				projectSelection: {
					projectMode: "new",
					projectTitle,
					projectFolderName,
				},
			}
		}

		return {
			errorMessage: "Select a project mode before continuing.",
		}
	}

	private async handleWorkflowEntryFormOutcome(args: {
		taskState: TaskState
		request: WorkflowFormSubmissionRequest
		outcome: WorkflowFormRuntimeOutcome
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		switch (args.outcome.kind) {
			case "render_form":
			case "complete_success": {
				if (
					args.request.action === WorkflowFormAction.SUBMIT &&
					args.request.panelId === WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID &&
					!args.outcome.session.failure
				) {
					const selectionResult = await this.resolveWorkflowEntryProjectSelection({
						formSession: args.outcome.session,
					})
					if ("errorMessage" in selectionResult) {
						session.ui.formSession = {
							...args.outcome.session,
							failure: {
								panelId: WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID,
								errorMessage: selectionResult.errorMessage,
							},
						}
						return this.resolveNextAction({ taskState: args.taskState })
					}

					const workflow = this.getActiveWorkflowDefinition(args.taskState)
					if (!workflow) {
						return this.teardownWorkflowAndRequirePersistence({ taskState: args.taskState })
					}

					session.projectSelection = selectionResult.projectSelection
					session.ui.formSession = undefined
					await this.applyWorkflowValueWrites({
						taskState: args.taskState,
						values: {
							[workflow.entryProjectValueKeys.projectMode]: selectionResult.projectSelection.projectMode,
							[workflow.entryProjectValueKeys.projectTitle]: selectionResult.projectSelection.projectTitle,
							[workflow.entryProjectValueKeys.projectFolderName]:
								selectionResult.projectSelection.projectFolderName,
						},
					})
					await this.ensureProjectFoldersExist(session)
					session.branchContext.lastTriggerEvent = {
						kind: "project_selection_completed",
					}
					this.refreshCurrentFocusChainChecklist(args.taskState)
					return this.resolveNextAction({ taskState: args.taskState })
				}

				session.ui.formSession = args.outcome.session
				return this.resolveNextAction({ taskState: args.taskState })
			}
		}
	}

	private resolveWorkflowFormComparableSourceValue(
		session: Pick<WorkflowFormSessionState, "values" | "data">,
		sourceKey: string,
	): unknown {
		if (sourceKey in session.values) {
			return this.buildWorkflowFormSubmittedValueComparableValue(session.values[sourceKey])
		}

		if (sourceKey in session.data) {
			const value = session.data[sourceKey]
			if (this.isWorkflowFormSubmittedValuePayload(value)) {
				return this.buildWorkflowFormSubmittedValueComparableValue(value)
			}

			return value
		}

		const pathSegments = sourceKey.split(".")
		let current: unknown = session.data
		for (const pathSegment of pathSegments) {
			if (
				current === null ||
				current === undefined ||
				typeof current !== "object" ||
				Array.isArray(current) ||
				!(pathSegment in current)
			) {
				return undefined
			}

			const matchingEntry = Object.entries(current).find(([entryKey]) => entryKey === pathSegment)
			current = matchingEntry?.[1]
		}

		return current
	}

	private evaluateWorkflowFormCondition(args: {
		condition: WorkflowFormConditionDefinition | undefined
		session: Pick<WorkflowFormSessionState, "values" | "data">
	}): boolean {
		const { condition, session } = args
		if (!condition) {
			return true
		}

		const sourceValue = this.resolveWorkflowFormComparableSourceValue(session, condition.sourceKey)
		const operator = condition.operator ?? "equals"
		const conditionValues = condition.values ?? []

		switch (operator) {
			case "equals":
				if (conditionValues.length > 0) {
					return this.isWorkflowFormComparableValue(sourceValue) && conditionValues.includes(sourceValue)
				}

				return sourceValue === condition.value
			case "not_equals":
				if (conditionValues.length > 0) {
					return !this.isWorkflowFormComparableValue(sourceValue) || !conditionValues.includes(sourceValue)
				}

				return sourceValue !== condition.value
			case "contains":
				if (Array.isArray(sourceValue)) {
					return sourceValue.includes(condition.value)
				}

				if (typeof sourceValue === "string" && typeof condition.value === "string") {
					return sourceValue.includes(condition.value)
				}

				return false
			case "not_contains":
				if (Array.isArray(sourceValue)) {
					return !sourceValue.includes(condition.value)
				}

				if (typeof sourceValue === "string" && typeof condition.value === "string") {
					return !sourceValue.includes(condition.value)
				}

				return true
			case "is_truthy":
				return Boolean(sourceValue)
			case "is_falsy":
				return !sourceValue
		}
	}

	private async buildWorkflowFormRenderPayload(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		session: WorkflowFormSessionState
	}): Promise<ReturnType<typeof buildWorkflowFormPayload>> {
		const { session } = args
		const panelId = session.failure?.panelId ?? session.currentPanelId
		const panel = this.getWorkflowFormPanel(session.definitionPayload, panelId)
		const resolvedPanel = await this.buildResolvedWorkflowFormPanelPayload({
			taskState: args.taskState,
			workflow: args.workflow,
			session,
			panel,
		})
		this.storeResolvedWorkflowFormPanelFields(session, panelId, resolvedPanel.fields)

		return buildWorkflowFormPayload({
			session,
			definition: session.definitionPayload,
			panel: resolvedPanel,
			errorMessage: session.failure?.errorMessage,
		})
	}

	private storeResolvedWorkflowFormPanelFields(
		session: WorkflowFormSessionState,
		panelId: string,
		fields: WorkflowFormFieldDefinition[],
	): void {
		const panel = session.definitionPayload.panels[panelId]
		if (!panel) {
			throw new Error(`Workflow form definition references an unknown panel: ${panelId}`)
		}

		const resolvedFieldsByKey = new Map(fields.map((field) => [field.key, field]))
		session.definitionPayload.panels[panelId] = {
			...panel,
			fields: panel.fields.map((field) => resolvedFieldsByKey.get(field.key) ?? field),
		}
	}

	private getWorkflowFormPanel(definition: WorkflowFormDefinitionPayload, panelId: string): WorkflowFormPanelDefinition {
		const panel = definition.panels[panelId]
		if (!panel) {
			throw new Error(`Workflow form definition references an unknown panel: ${panelId}`)
		}

		return panel
	}

	private async buildResolvedWorkflowFormPanelPayload(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		session: WorkflowFormSessionState
		panel: WorkflowFormPanelDefinition
	}): Promise<WorkflowFormResolvedPanelPayload> {
		return {
			panelId: args.panel.panelId,
			title: args.panel.title,
			promptMarkdown: args.panel.promptMarkdown,
			fields: await this.resolveWorkflowFormPanelFields(args),
			allowedActions: args.panel.allowedActions,
			actionLabels: args.panel.actionLabels,
		}
	}

	private async resolveWorkflowFormPanelFields(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		session: Pick<WorkflowFormSessionState, "values" | "data">
		panel: WorkflowFormPanelDefinition
	}): Promise<WorkflowFormFieldDefinition[]> {
		const visibleFields = args.panel.fields
			.filter((field) => field.visible !== false)
			.filter((field) =>
				this.evaluateWorkflowFormCondition({
					condition: field.visibilityCondition,
					session: args.session,
				}),
			)

		const resolvedFields: WorkflowFormFieldDefinition[] = []
		for (const field of visibleFields) {
			const conditionalOptions = field.conditionalOptions?.find((entry) =>
				this.evaluateWorkflowFormCondition({
					condition: entry.when,
					session: args.session,
				}),
			)
			const conditionalOverride = field.conditionalFieldOverrides?.find((entry) =>
				this.evaluateWorkflowFormCondition({
					condition: entry.when,
					session: args.session,
				}),
			)

			const resolvedField: WorkflowFormFieldDefinition = {
				...field,
				options: conditionalOptions ? conditionalOptions.options : field.options,
			}

			if (conditionalOverride) {
				if (conditionalOverride.allowedValueType !== undefined) {
					resolvedField.allowedValueType = conditionalOverride.allowedValueType
				}
				if (conditionalOverride.required !== undefined) {
					resolvedField.required = conditionalOverride.required
				}
				if (conditionalOverride.selectionCardinality !== undefined) {
					resolvedField.selectionCardinality = conditionalOverride.selectionCardinality
				}
				if (conditionalOverride.selectionCount !== undefined) {
					resolvedField.selectionCount = conditionalOverride.selectionCount
				}
				if (conditionalOverride.minimumSelectionCount !== undefined) {
					resolvedField.minimumSelectionCount = conditionalOverride.minimumSelectionCount
				}
				if (conditionalOverride.contentMarkdown !== undefined) {
					resolvedField.contentMarkdown = conditionalOverride.contentMarkdown
				}
			}

			resolvedFields.push(
				await this.populateWorkflowFormSelectorOptions({
					taskState: args.taskState,
					workflow: args.workflow,
					field: resolvedField,
				}),
			)
		}

		return resolvedFields
	}

	private async populateWorkflowFormSelectorOptions(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		field: WorkflowFormFieldDefinition
	}): Promise<WorkflowFormFieldDefinition> {
		const discoveredOptions = await this.discoverWorkflowFormSelectorOptions(args)
		if (!discoveredOptions) {
			return args.field
		}

		return {
			...args.field,
			options: discoveredOptions,
		}
	}

	private async discoverWorkflowFormSelectorOptions(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		field: WorkflowFormFieldDefinition
	}): Promise<WorkflowFormOptionDefinition[] | undefined> {
		const discoveryConfig = args.field.selectorDiscovery
		if (!discoveryConfig) {
			return undefined
		}

		let targetPathSegments = discoveryConfig.targetPathSegments
		const namingPattern = discoveryConfig.namingPattern === undefined ? undefined : new RegExp(discoveryConfig.namingPattern)

		if (discoveryConfig.root.kind === "selected_project_root") {
			const session = args.taskState.activeWorkflowSession
			if (!session || session.projectSelection.projectFolderName === "") {
				return undefined
			}

			targetPathSegments = [session.projectSelection.projectFolderName, ...(discoveryConfig.targetPathSegments ?? [])]
		}

		return discoverWorkflowCandidates({
			baseDirectory: this.cwd,
			workspacePathPolicy: this.workspacePathPolicy,
			targetPathSegments,
			namingPattern,
			entryType: discoveryConfig.entryType,
			immediateChildrenOnly: discoveryConfig.immediateChildrenOnly,
			sort: discoveryConfig.sort,
			buildLabel: (entryName) => discoveryConfig.labelTemplate?.replace("{entryName}", entryName) ?? entryName,
		})
	}

	private buildDecisionTreeEvaluationInput(
		session: ActiveWorkflowSession,
		step: WorkflowStepDefinition,
	): WorkflowDecisionBranchEvaluationInput {
		return {
			activeBranchId: session.branchContext.activeBranchId,
			workflowValues: session.workflowValues,
			step,
		}
	}

	private doesDecisionTreeRouteMatch(args: {
		session: ActiveWorkflowSession
		step: WorkflowStepDefinition
		route: WorkflowDecisionBranchRoute
		triggerEvent?: WorkflowBranchTriggerEvent
	}): boolean {
		const { session, step, route, triggerEvent } = args
		const evaluationInput = this.buildDecisionTreeEvaluationInput(session, step)

		switch (route.trigger.kind) {
			case "always":
				return true
			case "on_event":
				return triggerEvent?.kind === route.trigger.eventKind
			case "session_predicate":
				return route.trigger.matches(evaluationInput)
			case "event_predicate":
				if (!triggerEvent) {
					return false
				}

				return route.trigger.matches({
					...evaluationInput,
					triggerEvent,
				})
		}
	}

	private resolveDecisionTreeRoute(args: {
		taskState?: TaskState
		session: ActiveWorkflowSession
		step: WorkflowStepDefinition
		triggerEvent?: WorkflowBranchTriggerEvent
	}):
		| {
				route: WorkflowDecisionBranchRoute
				nextActiveBranchId: string
		  }
		| undefined {
		const { session, step, taskState } = args
		const triggerEvent = args.triggerEvent ?? session.branchContext.lastTriggerEvent
		const initialBranch =
			step.decisionTree.branches[session.branchContext.activeBranchId] ??
			step.decisionTree.branches[step.decisionTree.entryBranchId]
		if (!initialBranch) {
			return undefined
		}

		const visitedBranchIds = new Set<string>()
		let currentBranch = initialBranch

		while (!visitedBranchIds.has(currentBranch.id)) {
			visitedBranchIds.add(currentBranch.id)

			let matchedRoute: WorkflowDecisionBranchRoute | undefined
			for (const route of currentBranch.routes) {
				if (
					this.doesDecisionTreeRouteMatch({
						session,
						step,
						route,
						triggerEvent,
					})
				) {
					matchedRoute = route
					break
				}
			}

			if (!matchedRoute) {
				break
			}

			const nextActiveBranchId = matchedRoute.followingBranchId ?? currentBranch.id
			if (
				matchedRoute.action.kind === "no_op" &&
				matchedRoute.targetStepNumber === undefined &&
				matchedRoute.followingBranchId !== undefined
			) {
				const followingBranch = step.decisionTree.branches[matchedRoute.followingBranchId]
				if (!followingBranch) {
					return undefined
				}

				currentBranch = followingBranch
				continue
			}

			return {
				route: matchedRoute,
				nextActiveBranchId,
			}
		}

		if (triggerEvent) {
			return undefined
		}

		if (!taskState) {
			return undefined
		}

		return this.resolveDecisionTreeContinuationRoute({
			taskState,
			step,
			activeBranchId: initialBranch.id,
		})
	}

	private hasDecisionTreeRouteForTriggerEvent(args: {
		session: ActiveWorkflowSession
		step: WorkflowStepDefinition
		triggerEvent: WorkflowBranchTriggerEvent
	}): boolean {
		const activeBranch =
			args.step.decisionTree.branches[args.session.branchContext.activeBranchId] ??
			args.step.decisionTree.branches[args.step.decisionTree.entryBranchId]
		if (!activeBranch) {
			return false
		}

		return activeBranch.routes.some((route) => {
			if (route.trigger.kind !== "on_event" && route.trigger.kind !== "event_predicate") {
				return false
			}

			return this.doesDecisionTreeRouteMatch({
				session: args.session,
				step: args.step,
				route,
				triggerEvent: args.triggerEvent,
			})
		})
	}

	private resolveDecisionTreeContinuationRoute(args: {
		taskState: TaskState
		step: WorkflowStepDefinition
		activeBranchId: string
	}):
		| {
				route: WorkflowDecisionBranchRoute
				nextActiveBranchId: string
		  }
		| undefined {
		const { taskState, step, activeBranchId } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return undefined
		}

		const activeFormSession = session.ui.formSession
		if (activeFormSession) {
			const continuationRoute = this.findContinuationSourceRoute({
				step,
				activeBranchId,
				matches: (route) =>
					route.action.kind === "render_workflow_form" &&
					route.action.workflowFormId === activeFormSession.workflowFormId,
			})
			if (continuationRoute) {
				return {
					route: continuationRoute,
					nextActiveBranchId: activeBranchId,
				}
			}
		}

		const activeStepResolutionSession = session.ui.stepResolutionSession
		if (activeStepResolutionSession?.state === "pending") {
			const continuationRoute = this.findContinuationSourceRoute({
				step,
				activeBranchId,
				matches: (route) =>
					route.action.kind === "execute_tool_backed_operation" &&
					route.action.toolBackedOperationId === activeStepResolutionSession.definitionId,
			})
			if (continuationRoute) {
				return {
					route: continuationRoute,
					nextActiveBranchId: activeBranchId,
				}
			}
		}

		const artifactAllocationContinuationRoute = this.findContinuationSourceRoute({
			step,
			activeBranchId,
			matches: (route) => route.action.kind === "allocate_artifact",
		})
		if (artifactAllocationContinuationRoute) {
			return {
				route: artifactAllocationContinuationRoute,
				nextActiveBranchId: activeBranchId,
			}
		}

		return undefined
	}

	private findContinuationSourceRoute(args: {
		step: WorkflowStepDefinition
		activeBranchId: string
		matches(route: WorkflowDecisionBranchRoute): boolean
	}): WorkflowDecisionBranchRoute | undefined {
		for (const branch of Object.values(args.step.decisionTree.branches)) {
			for (const route of branch.routes) {
				if (route.followingBranchId !== args.activeBranchId) {
					continue
				}

				if (args.matches(route)) {
					return route
				}
			}
		}

		return undefined
	}

	private transitionToStep(args: {
		taskState: TaskState
		definition: WorkflowDefinition
		targetStepNumber: number
		targetBranchId?: string
	}): WorkflowStepDefinition | undefined {
		const { taskState, definition, targetStepNumber, targetBranchId } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return undefined
		}

		const targetStep = definition.steps[`step-${targetStepNumber}`]
		if (!targetStep) {
			return undefined
		}

		const nextBranchId =
			targetBranchId !== undefined && targetStep.decisionTree.branches[targetBranchId] !== undefined
				? targetBranchId
				: targetStep.decisionTree.entryBranchId

		session.activeStepNumber = targetStepNumber
		session.ui.formSession = undefined
		session.ui.stepResolutionSession = undefined
		session.ui.suppressedWorkflowFormIds = []
		session.ui.suppressedWorkflowStepResolutionDefinitionIds = []
		session.branchContext = {
			activeBranchId: nextBranchId,
		}
		this.refreshCurrentFocusChainChecklist(taskState)

		return targetStep
	}

	private async buildNextActionFromDecisionTreeAction(args: {
		taskState: TaskState
		definition: WorkflowDefinition
		action: WorkflowDecisionAction
	}): Promise<WorkflowNextAction> {
		const { taskState, definition, action } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		switch (action.kind) {
			case "render_workflow_form": {
				if (session.ui.formSession?.workflowFormId === action.workflowFormId) {
					const payload = await this.buildWorkflowFormRenderPayload({
						taskState,
						workflow: definition,
						session: session.ui.formSession,
					})
					return {
						kind: "render_workflow_form",
						formSession: session.ui.formSession,
						payload,
					}
				}

				const definitionPayload = definition.workflowForms?.[action.workflowFormId]
				if (!definitionPayload) {
					return { kind: "no_op" }
				}

				const formSession = this.workflowFormRuntime.createSession({
					workflowFormId: action.workflowFormId,
					definitionPayload,
				})
				session.ui.formSession = formSession
				const payload = await this.buildWorkflowFormRenderPayload({
					taskState,
					workflow: definition,
					session: formSession,
				})

				return {
					kind: "render_workflow_form",
					formSession,
					payload,
				}
			}
			case "execute_tool_backed_operation": {
				const activeStep = this.getActiveStepDefinition(definition, session)
				if (!activeStep) {
					return { kind: "no_op" }
				}

				const toolBackedOperationDefinition = definition.toolBackedOperationDefinitions?.[action.toolBackedOperationId]
				if (toolBackedOperationDefinition) {
					const stepResolutionSession =
						session.ui.stepResolutionSession?.definitionId === action.toolBackedOperationId
							? session.ui.stepResolutionSession
							: this.createToolBackedOperationSession({
									definitionId: action.toolBackedOperationId,
									triggerSource: "execute_tool_backed_operation",
									owner: {
										kind: "workflow_step",
										workflowName: definition.name,
										stepNumber: activeStep.stepNumber,
									},
								})
					const toolRequest = toolBackedOperationDefinition.buildToolExecutionRequest({
						toolBackedOperationSession: stepResolutionSession,
						activeWorkflowSession: session,
					})
					session.ui.stepResolutionSession = stepResolutionSession

					return {
						kind: "execute_tool_backed_operation",
						toolRequest,
						toolBackedOperationSession: stepResolutionSession,
					}
				}

				return { kind: "no_op" }
			}
			case "build_workflow_document": {
				const activeStep = this.getActiveStepDefinition(definition, session)
				if (!activeStep || !(activeStep.documentBuilderIds ?? []).includes(action.documentBuilderId)) {
					return { kind: "no_op" }
				}

				const toolRequest = await this.buildDocumentBuilderToolRequest({
					taskState,
					workflow: definition,
					session,
					documentBuilderId: action.documentBuilderId,
				})
				if (!toolRequest) {
					return { kind: "no_op" }
				}

				session.ui.stepResolutionSession = undefined
				return {
					kind: "execute_tool_backed_operation",
					toolRequest,
				}
			}
			case "allocate_artifact": {
				const artifactDefinition = definition.artifacts?.[action.artifactId]
				if (!artifactDefinition || artifactDefinition.id !== action.artifactId) {
					return { kind: "no_op" }
				}

				return {
					kind: "execute_tool_backed_operation",
					toolRequest: {
						toolName: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
						toolInput: {},
						toolParams: {
							artifact_id: action.artifactId,
						},
					},
				}
			}
			case "project_prompt": {
				const promptProjection = await this.buildTurnProjection({ taskState })
				return {
					kind: "project_prompt",
					promptProjection,
				}
			}
			case "terminal_error":
				return await this.buildTerminalErrorNextAction({ taskState, errorMessage: action.errorMessage })
			case "no_op":
				return { kind: "no_op" }
			case "complete_workflow":
				await this.teardownWorkflow({ taskState })
				return { kind: "complete_workflow" }
		}
	}

	private async buildNextActionFromDecisionTreeRoute(args: {
		taskState: TaskState
		definition: WorkflowDefinition
		route: WorkflowDecisionBranchRoute
		nextActiveBranchId: string
	}): Promise<WorkflowNextAction> {
		const { taskState, definition, route, nextActiveBranchId } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		if (route.targetStepNumber !== undefined) {
			const transitionedStep = this.transitionToStep({
				taskState,
				definition,
				targetStepNumber: route.targetStepNumber,
				targetBranchId: route.followingBranchId,
			})
			if (!transitionedStep) {
				return { kind: "no_op" }
			}
		} else {
			session.branchContext.activeBranchId = nextActiveBranchId
		}

		session.branchContext.lastTriggerEvent = undefined

		return this.buildNextActionFromDecisionTreeAction({
			taskState,
			definition,
			action: route.action,
		})
	}

	private normalizeProjectFolderName(title: string): string {
		return title
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-+|-+$/g, "")
	}

	private resolveWorkflowProjectOutputFolder(session: ActiveWorkflowSession): string {
		if (session.projectSelection.projectFolderName.trim() === "") {
			throw new Error("Cannot resolve workflow artifact path without a selected project folder.")
		}

		return join(this.cwd, session.projectSelection.projectFolderName)
	}

	private async resolveWorkflowArtifactAllocation(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		artifactDefinition: WorkflowArtifactDefinition
	}): Promise<WorkflowArtifactAllocationOutput> {
		const familyDefinition = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[args.artifactDefinition.family]
		const identityResolution = await this.resolveWorkflowArtifactIdentity({
			workflow: args.workflow,
			session: args.session,
			artifactDefinition: args.artifactDefinition,
			familyDefinition,
		})
		const artifactFilename = this.buildWorkflowArtifactFilename({
			familyDefinition,
			artifactIdentity: identityResolution.artifactIdentity,
		})
		const artifactRelativePath = join(args.workflow.projectSubfolder, artifactFilename)
		const artifactAbsolutePath = join(this.resolveWorkflowProjectOutputFolder(args.session), artifactRelativePath)
		const output = {
			artifactId: args.artifactDefinition.id,
			projectTitle: args.session.projectSelection.projectTitle,
			projectFolderName: args.session.projectSelection.projectFolderName,
			artifactFamily: args.artifactDefinition.family,
			artifactIdentity: identityResolution.artifactIdentity,
			artifactFilename,
			artifactRelativePath,
			artifactAbsolutePath,
			parentIdentity: identityResolution.parentIdentity,
			targetIdentity: identityResolution.targetIdentity,
		}

		return {
			...output,
			workflowValueWrites: this.buildWorkflowArtifactOutputValueWrites({
				outputValueKeys: args.artifactDefinition.outputValueKeys,
				output,
			}),
		}
	}

	private async discoverWorkflowArtifactFilenames(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		familyDefinition: WorkflowArtifactFamilyDefinition
		searchProjectWide: boolean
	}): Promise<string[]> {
		const projectFolderName = args.session.projectSelection.projectFolderName.trim()
		if (projectFolderName === "") {
			throw new Error("Cannot discover workflow artifacts without a selected project folder.")
		}

		const subfolders = args.searchProjectWide ? WORKFLOW_PROJECT_SUBFOLDERS : [args.workflow.projectSubfolder]
		const filenames: string[] = []
		for (const subfolder of subfolders) {
			const candidates = await discoverWorkflowCandidates({
				baseDirectory: this.cwd,
				workspacePathPolicy: this.workspacePathPolicy,
				targetPathSegments: [projectFolderName, subfolder],
				entryType: "file",
				immediateChildrenOnly: true,
				namingPattern: args.familyDefinition.discoveryPattern,
				sort: "alpha_asc",
				buildLabel: (entryName) => entryName,
			})
			filenames.push(...candidates.map((candidate) => candidate.value))
		}

		return filenames
	}

	private async resolveWorkflowArtifactIdentity(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		artifactDefinition: WorkflowArtifactDefinition
		familyDefinition: WorkflowArtifactFamilyDefinition
	}): Promise<WorkflowArtifactIdentityResolution> {
		switch (args.artifactDefinition.family) {
			case WorkflowArtifactFamily.Epics:
			case WorkflowArtifactFamily.EpicsIndex: {
				if (args.familyDefinition.allocationMode !== "singleton_project") {
					throw new Error(`Workflow artifact ${args.artifactDefinition.id} requires a singleton project family.`)
				}

				return {
					artifactIdentity: args.familyDefinition.singletonIdentity,
					parentIdentity: undefined,
					targetIdentity: undefined,
				}
			}
			case WorkflowArtifactFamily.EpicDeliverySpec:
				return {
					artifactIdentity: await this.deriveNextEpicDeliverySpecIdentity(args),
					parentIdentity: undefined,
					targetIdentity: undefined,
				}
			case WorkflowArtifactFamily.Story: {
				const parentIdentity = this.normalizeWorkflowArtifactIdentityInput(
					this.readWorkflowArtifactIdentitySource({
						session: args.session,
						artifactId: args.artifactDefinition.id,
						sourceKey: args.artifactDefinition.parentIdentitySource.key,
					}),
				)
				const parsedParentIdentity = this.parseDottedWorkflowArtifactIdentity(parentIdentity)
				if (parsedParentIdentity.storyNumber !== undefined) {
					throw new Error(`Workflow artifact ${args.artifactDefinition.id} requires a parent epic identity.`)
				}
				await this.requireExistingWorkflowArtifactIdentity({
					workflow: args.workflow,
					session: args.session,
					family: WorkflowArtifactFamily.EpicDeliverySpec,
					identity: parentIdentity,
					artifactId: args.artifactDefinition.id,
				})

				const storyIdentity = await this.allocateNextStoryIdentity({
					workflow: args.workflow,
					session: args.session,
					parentEpicNumber: parsedParentIdentity.epicNumber,
				})

				return {
					artifactIdentity: storyIdentity,
					parentIdentity,
					targetIdentity: undefined,
				}
			}
			case WorkflowArtifactFamily.RemediationStory: {
				const parentIdentity = this.normalizeWorkflowArtifactIdentityInput(
					this.readWorkflowArtifactIdentitySource({
						session: args.session,
						artifactId: args.artifactDefinition.id,
						sourceKey: args.artifactDefinition.parentIdentitySource.key,
					}),
				)
				const parsedParentIdentity = this.parseDottedWorkflowArtifactIdentity(parentIdentity)
				if (parsedParentIdentity.storyNumber === undefined || parsedParentIdentity.remediationStoryNumber !== undefined) {
					throw new Error(`Workflow artifact ${args.artifactDefinition.id} requires a parent story identity.`)
				}
				await this.requireExistingWorkflowArtifactIdentity({
					workflow: args.workflow,
					session: args.session,
					family: WorkflowArtifactFamily.Story,
					identity: parentIdentity,
					artifactId: args.artifactDefinition.id,
				})

				const remediationStoryIdentity = await this.allocateNextRemediationStoryIdentity({
					workflow: args.workflow,
					session: args.session,
					parentEpicNumber: parsedParentIdentity.epicNumber,
					parentStoryNumber: parsedParentIdentity.storyNumber,
				})

				return {
					artifactIdentity: remediationStoryIdentity,
					parentIdentity,
					targetIdentity: undefined,
				}
			}
			case WorkflowArtifactFamily.ReviewBlindHunter:
			case WorkflowArtifactFamily.ReviewEdgeCaseHunter:
			case WorkflowArtifactFamily.AdversarialReview:
			case WorkflowArtifactFamily.ReviewInputMarkdown:
			case WorkflowArtifactFamily.ReviewInputDiff: {
				const targetIdentity = this.normalizeWorkflowArtifactIdentityInput(
					this.readWorkflowArtifactIdentitySource({
						session: args.session,
						artifactId: args.artifactDefinition.id,
						sourceKey: args.artifactDefinition.targetIdentitySource.key,
					}),
				)
				await this.requireExistingReviewTargetIdentity({
					workflow: args.workflow,
					session: args.session,
					targetIdentity,
					artifactId: args.artifactDefinition.id,
				})

				return {
					artifactIdentity: targetIdentity,
					parentIdentity: undefined,
					targetIdentity,
				}
			}
		}
	}

	private async requireExistingReviewTargetIdentity(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		targetIdentity: string
		artifactId: string
	}): Promise<void> {
		const parsedTargetIdentity = this.parseDottedWorkflowArtifactIdentity(args.targetIdentity)
		if (parsedTargetIdentity.storyNumber === undefined) {
			throw new Error(
				`Cannot allocate workflow artifact ${args.artifactId} because review artifacts require a selected story or remediation-story target.`,
			)
		}

		const targetFamily =
			parsedTargetIdentity.remediationStoryNumber === undefined
				? WorkflowArtifactFamily.Story
				: WorkflowArtifactFamily.RemediationStory

		await this.requireExistingWorkflowArtifactIdentity({
			workflow: args.workflow,
			session: args.session,
			family: targetFamily,
			identity: parsedTargetIdentity.artifactIdentity,
			artifactId: args.artifactId,
		})
	}

	private async deriveNextEpicDeliverySpecIdentity(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		artifactDefinition: WorkflowArtifactDefinition
	}): Promise<string> {
		const epicsIndex = await this.loadEpicsIndex({
			workflow: args.workflow,
			session: args.session,
			artifactId: args.artifactDefinition.id,
		})
		if (epicsIndex.epics.length === 0) {
			throw new Error(
				`Cannot allocate workflow artifact ${args.artifactDefinition.id} because Epics.index.json does not contain any indexed epics.`,
			)
		}

		const familyDefinition = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[WorkflowArtifactFamily.EpicDeliverySpec]
		const discoveredFilenames = await this.discoverWorkflowArtifactFilenames({
			workflow: args.workflow,
			session: args.session,
			familyDefinition,
			searchProjectWide: true,
		})
		const existingDeliverySpecIdentities = new Set(
			discoveredFilenames
				.map((filename) => this.parseWorkflowArtifactFilenameIdentity(familyDefinition, filename))
				.filter((identity): identity is ParsedWorkflowArtifactIdentity => identity !== undefined)
				.map((identity) => identity.artifactIdentity),
		)
		const nextIndexedEpic = [...epicsIndex.epics]
			.sort((left, right) => Number.parseInt(left.identity, 10) - Number.parseInt(right.identity, 10))
			.find((epic) => !existingDeliverySpecIdentities.has(epic.identity))

		if (!nextIndexedEpic) {
			throw new Error(
				`Cannot allocate workflow artifact ${args.artifactDefinition.id} because every indexed epic already has a delivery spec.`,
			)
		}

		return nextIndexedEpic.identity
	}

	private async loadEpicsIndex(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		artifactId: string
	}): Promise<WorkflowEpicsIndex> {
		const epicsIndexPath = join(
			this.resolveWorkflowProjectOutputFolder(args.session),
			args.workflow.projectSubfolder,
			"Epics.index.json",
		)
		this.assertWorkspacePathAllowed(epicsIndexPath)

		let epicsIndexText: string
		try {
			epicsIndexText = await readFile(epicsIndexPath, "utf8")
		} catch (error) {
			const errorMessage = error instanceof Error ? ` ${error.message}` : ""
			throw new Error(
				`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json could not be read.${errorMessage}`,
			)
		}

		return this.parseEpicsIndexJson({ artifactId: args.artifactId, epicsIndexText })
	}

	private parseEpicsIndexJson(args: { artifactId: string; epicsIndexText: string }): WorkflowEpicsIndex {
		let parsedIndex: unknown
		try {
			parsedIndex = JSON.parse(args.epicsIndexText)
		} catch (error) {
			const errorMessage = error instanceof Error ? ` ${error.message}` : ""
			throw new Error(
				`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json is malformed JSON.${errorMessage}`,
			)
		}

		if (!this.isRecord(parsedIndex)) {
			throw new Error(
				`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json must be a JSON object.`,
			)
		}

		this.assertOnlyEpicsIndexKeys({
			artifactId: args.artifactId,
			record: parsedIndex,
			allowedKeys: ["version", "epics"],
			context: "Epics.index.json",
		})

		if (parsedIndex.version !== 1) {
			throw new Error(`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json version must be 1.`)
		}

		const epicsValue = parsedIndex.epics
		if (!this.isUnknownArray(epicsValue)) {
			throw new Error(
				`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json epics must be an array.`,
			)
		}

		const epics = epicsValue.map((entry, index) => {
			if (!this.isRecord(entry)) {
				throw new Error(
					`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json epics[${index}] must be an object.`,
				)
			}

			this.assertOnlyEpicsIndexKeys({
				artifactId: args.artifactId,
				record: entry,
				allowedKeys: ["identity", "title"],
				context: `Epics.index.json epics[${index}]`,
			})

			const identity = entry.identity
			if (typeof identity !== "string" || !/^[1-9]\d*$/.test(identity)) {
				throw new Error(
					`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json epics[${index}].identity must be a positive numeric string.`,
				)
			}

			const title = entry.title
			if (typeof title !== "string" || title.trim() === "") {
				throw new Error(
					`Cannot allocate workflow artifact ${args.artifactId} because Epics.index.json epics[${index}].title must be a non-empty string.`,
				)
			}

			return { identity, title }
		})

		return { version: 1, epics }
	}

	private assertOnlyEpicsIndexKeys(args: {
		artifactId: string
		record: Record<string, unknown>
		allowedKeys: readonly string[]
		context: string
	}): void {
		for (const key of Object.keys(args.record)) {
			if (!args.allowedKeys.includes(key)) {
				throw new Error(
					`Cannot allocate workflow artifact ${args.artifactId} because ${args.context} contains unsupported key ${key}.`,
				)
			}
		}
	}

	private async allocateNextStoryIdentity(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		parentEpicNumber: number
	}): Promise<string> {
		const familyDefinition = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[WorkflowArtifactFamily.Story]
		const discoveredFilenames = await this.discoverWorkflowArtifactFilenames({
			workflow: args.workflow,
			session: args.session,
			familyDefinition,
			searchProjectWide: true,
		})
		const existingStoryNumbers = discoveredFilenames
			.map((filename) => this.parseWorkflowArtifactFilenameIdentity(familyDefinition, filename))
			.filter((identity): identity is ParsedWorkflowArtifactIdentity => identity !== undefined)
			.filter((identity) => identity.epicNumber === args.parentEpicNumber)
			.map((identity) => identity.storyNumber)
			.filter((storyNumber): storyNumber is number => storyNumber !== undefined)

		return `${args.parentEpicNumber}.${this.getNextPositiveInteger(existingStoryNumbers)}`
	}

	private async allocateNextRemediationStoryIdentity(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		parentEpicNumber: number
		parentStoryNumber: number
	}): Promise<string> {
		const familyDefinition = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[WorkflowArtifactFamily.RemediationStory]
		const discoveredFilenames = await this.discoverWorkflowArtifactFilenames({
			workflow: args.workflow,
			session: args.session,
			familyDefinition,
			searchProjectWide: true,
		})
		const existingRemediationStoryNumbers = discoveredFilenames
			.map((filename) => this.parseWorkflowArtifactFilenameIdentity(familyDefinition, filename))
			.filter((identity): identity is ParsedWorkflowArtifactIdentity => identity !== undefined)
			.filter(
				(identity) => identity.epicNumber === args.parentEpicNumber && identity.storyNumber === args.parentStoryNumber,
			)
			.map((identity) => identity.remediationStoryNumber)
			.filter((remediationStoryNumber): remediationStoryNumber is number => remediationStoryNumber !== undefined)

		return `${args.parentEpicNumber}.${args.parentStoryNumber}.${this.getNextPositiveInteger(existingRemediationStoryNumbers)}`
	}

	private getNextPositiveInteger(existingNumbers: readonly number[]): number {
		return existingNumbers.reduce((highestNumber, currentNumber) => Math.max(highestNumber, currentNumber), 0) + 1
	}

	private async requireExistingWorkflowArtifactIdentity(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		family: WorkflowArtifactFamily
		identity: string
		artifactId: string
	}): Promise<void> {
		const exists = await this.doesWorkflowArtifactIdentityExist(args)
		if (exists) {
			return
		}

		throw new Error(
			`Cannot allocate workflow artifact ${args.artifactId} because required artifact identity ${args.identity} was not found in the selected project.`,
		)
	}

	private async doesWorkflowArtifactIdentityExist(args: {
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		family: WorkflowArtifactFamily
		identity: string
	}): Promise<boolean> {
		const familyDefinition = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[args.family]
		const discoveredFilenames = await this.discoverWorkflowArtifactFilenames({
			workflow: args.workflow,
			session: args.session,
			familyDefinition,
			searchProjectWide: true,
		})

		return discoveredFilenames.some((filename) => {
			const parsedIdentity = this.parseWorkflowArtifactFilenameIdentity(familyDefinition, filename)
			return parsedIdentity?.artifactIdentity === args.identity
		})
	}

	private parseWorkflowArtifactFilenameIdentity(
		familyDefinition: WorkflowArtifactFamilyDefinition,
		filename: string,
	): ParsedWorkflowArtifactIdentity | undefined {
		familyDefinition.discoveryPattern.lastIndex = 0
		const match = familyDefinition.discoveryPattern.exec(filename)
		if (!match) {
			return undefined
		}

		switch (familyDefinition.family) {
			case WorkflowArtifactFamily.Epics:
			case WorkflowArtifactFamily.EpicsIndex:
				return undefined
			case WorkflowArtifactFamily.EpicDeliverySpec:
				return this.parseDottedWorkflowArtifactIdentity(match[1])
			case WorkflowArtifactFamily.Story:
				return this.parseDottedWorkflowArtifactIdentity(`${match[1]}.${match[2]}`)
			case WorkflowArtifactFamily.RemediationStory:
				return this.parseDottedWorkflowArtifactIdentity(`${match[1]}.${match[2]}.${match[3]}`)
			case WorkflowArtifactFamily.ReviewBlindHunter:
			case WorkflowArtifactFamily.ReviewEdgeCaseHunter:
			case WorkflowArtifactFamily.AdversarialReview:
			case WorkflowArtifactFamily.ReviewInputMarkdown:
			case WorkflowArtifactFamily.ReviewInputDiff:
				return this.parseDottedWorkflowArtifactIdentity(match[1].replace(/-/g, "."))
		}
	}

	private normalizeWorkflowArtifactIdentityInput(rawIdentity: string): string {
		const trimmedIdentity = rawIdentity.trim()
		const epicDeliverySpecMatch = /^Epic-(\d+)-delivery-spec\.md$/.exec(trimmedIdentity)
		if (epicDeliverySpecMatch) {
			return epicDeliverySpecMatch[1]
		}

		const storyMatch = /^Story-(\d+)-(\d+)\.md$/.exec(trimmedIdentity)
		if (storyMatch) {
			return `${storyMatch[1]}.${storyMatch[2]}`
		}

		const remediationStoryMatch = /^Remediation-story-(\d+)-(\d+)-(\d+)\.md$/.exec(trimmedIdentity)
		if (remediationStoryMatch) {
			return `${remediationStoryMatch[1]}.${remediationStoryMatch[2]}.${remediationStoryMatch[3]}`
		}

		const reviewArtifactMatch =
			/^(?:Review-blind-hunter|Review-edge-case-hunter|Adversarial-review|Review-input)-(\d+-\d+(?:-\d+)?)\.(?:md|diff)$/.exec(
				trimmedIdentity,
			)
		if (reviewArtifactMatch) {
			return reviewArtifactMatch[1].replace(/-/g, ".")
		}

		return trimmedIdentity.replace(/-/g, ".")
	}

	private parseDottedWorkflowArtifactIdentity(identity: string): ParsedWorkflowArtifactIdentity {
		const segments = identity.split(".")
		if (segments.length < 1 || segments.length > 3) {
			throw new Error(`Workflow artifact identity ${identity} must use dotted numeric form.`)
		}

		const parsedSegments = segments.map((segment) => {
			if (!/^[1-9]\d*$/.test(segment)) {
				throw new Error(`Workflow artifact identity ${identity} must use dotted numeric form.`)
			}

			return Number.parseInt(segment, 10)
		})
		const epicNumber = parsedSegments[0]
		if (epicNumber === undefined) {
			throw new Error(`Workflow artifact identity ${identity} must use dotted numeric form.`)
		}

		return {
			artifactIdentity: parsedSegments.join("."),
			epicNumber,
			storyNumber: parsedSegments[1],
			remediationStoryNumber: parsedSegments[2],
		}
	}

	private readWorkflowArtifactIdentitySource(args: {
		session: ActiveWorkflowSession
		artifactId: string
		sourceKey: string
	}): string {
		return readRequiredStringWorkflowValue({
			workflowValues: args.session.workflowValues,
			key: args.sourceKey,
			context: `artifact identity resolution for workflow artifact ${args.artifactId}`,
		})
	}

	private buildWorkflowArtifactFilename(args: {
		familyDefinition: WorkflowArtifactFamilyDefinition
		artifactIdentity: string
	}): string {
		const hyphenatedIdentity = args.artifactIdentity.replace(/\./g, "-")
		const identitySegments = hyphenatedIdentity.split("-")

		return args.familyDefinition.filenamePattern
			.replace("{E}", identitySegments[0] ?? "")
			.replace("{S}", identitySegments[1] ?? "")
			.replace("{R}", identitySegments[2] ?? "")
			.replace("{target}", hyphenatedIdentity)
	}

	private buildWorkflowArtifactOutputValueWrites(args: {
		outputValueKeys: WorkflowArtifactOutputValueKeys
		output: Omit<WorkflowArtifactAllocationOutput, "workflowValueWrites">
	}): WorkflowValues {
		const workflowValueWrites: WorkflowValues = {
			[args.outputValueKeys.projectTitle]: args.output.projectTitle,
			[args.outputValueKeys.projectFolderName]: args.output.projectFolderName,
			[args.outputValueKeys.artifactFamily]: args.output.artifactFamily,
			[args.outputValueKeys.artifactIdentity]: args.output.artifactIdentity,
			[args.outputValueKeys.artifactFilename]: args.output.artifactFilename,
			[args.outputValueKeys.artifactRelativePath]: args.output.artifactRelativePath,
			[args.outputValueKeys.artifactAbsolutePath]: args.output.artifactAbsolutePath,
		}

		if (args.outputValueKeys.parentIdentity !== undefined && args.output.parentIdentity !== undefined) {
			workflowValueWrites[args.outputValueKeys.parentIdentity] = args.output.parentIdentity
		}

		if (args.outputValueKeys.targetIdentity !== undefined && args.output.targetIdentity !== undefined) {
			workflowValueWrites[args.outputValueKeys.targetIdentity] = args.output.targetIdentity
		}

		return workflowValueWrites
	}

	private findPendingDocumentBuilderId(args: { taskState: TaskState }): string | undefined {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return undefined
		}

		const definition = this.getActiveWorkflowDefinition(args.taskState)
		if (!definition) {
			return undefined
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return undefined
		}

		const continuationRoute = this.findContinuationSourceRoute({
			step: activeStep,
			activeBranchId: session.branchContext.activeBranchId,
			matches: (route) =>
				route.action.kind === "build_workflow_document" &&
				(activeStep.documentBuilderIds ?? []).includes(route.action.documentBuilderId),
		})
		if (!continuationRoute || continuationRoute.action.kind !== "build_workflow_document") {
			return undefined
		}

		return continuationRoute.action.documentBuilderId
	}

	private findPendingArtifactAllocationId(args: { taskState: TaskState }): string | undefined {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return undefined
		}

		const definition = this.getActiveWorkflowDefinition(args.taskState)
		if (!definition) {
			return undefined
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			return undefined
		}

		const continuationRoute = this.findContinuationSourceRoute({
			step: activeStep,
			activeBranchId: session.branchContext.activeBranchId,
			matches: (route) =>
				route.action.kind === "allocate_artifact" && definition.artifacts?.[route.action.artifactId] !== undefined,
		})
		if (!continuationRoute || continuationRoute.action.kind !== "allocate_artifact") {
			return undefined
		}

		return continuationRoute.action.artifactId
	}

	private createToolBackedOperationSession(args: {
		definitionId: string
		triggerSource: WorkflowStepResolutionSessionState["triggerSource"]
		owner: WorkflowStepResolutionSessionState["owner"]
	}): WorkflowStepResolutionSessionState {
		return {
			sessionId: randomUUID(),
			definitionId: args.definitionId,
			triggerSource: args.triggerSource,
			owner: args.owner,
			state: "pending",
		}
	}

	private normalizeToolBackedOperationFailureMessage(errorMessage: string | undefined): string {
		const trimmedMessage = errorMessage?.trim()
		return trimmedMessage && trimmedMessage.length > 0 ? trimmedMessage : "Tool-backed operation failed."
	}

	private joinPromptSections(sections: Array<string | undefined>): string | undefined {
		const nonEmptySections = sections
			.map((section) => section?.trim())
			.filter((section): section is string => section !== undefined && section.length > 0)

		return nonEmptySections.length > 0 ? nonEmptySections.join("\n\n") : undefined
	}

	private async buildTerminalErrorNextAction(args: {
		taskState: TaskState
		errorMessage?: string
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const normalizedErrorMessage = this.normalizeToolBackedOperationFailureMessage(
			args.errorMessage ?? session.branchContext.failureState?.terminalErrorMessage,
		)

		await this.teardownWorkflow({ taskState: args.taskState })

		return {
			kind: "terminal_error",
			errorMessage: normalizedErrorMessage,
		}
	}

	private async completeToolBackedOperationSuccess(args: {
		taskState: TaskState
		toolBackedOperationId: string
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		session.branchContext.lastTriggerEvent = {
			kind: "tool_backed_operation_succeeded",
			toolBackedOperationId: args.toolBackedOperationId,
		}
		session.branchContext.failureState = undefined
		return this.resolveNextAction({ taskState: args.taskState })
	}

	private async completeToolBackedOperationFailure(args: {
		taskState: TaskState
		toolBackedOperationId: string
		errorMessage?: string
	}): Promise<WorkflowNextAction> {
		const session = args.taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		const normalizedErrorMessage = this.normalizeToolBackedOperationFailureMessage(args.errorMessage)
		const previousRetryAttemptCount = session.branchContext.failureState?.retryAttemptCount ?? 0
		session.branchContext.lastTriggerEvent = {
			kind: "tool_backed_operation_failed",
			toolBackedOperationId: args.toolBackedOperationId,
			errorMessage: normalizedErrorMessage,
		}
		session.branchContext.failureState = {
			retryAttemptCount: previousRetryAttemptCount + 1,
			terminalErrorMessage: normalizedErrorMessage,
		}
		return this.resolveNextAction({ taskState: args.taskState })
	}

	private async buildDocumentBuilderToolRequest(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		session: ActiveWorkflowSession
		documentBuilderId: string
	}): Promise<WorkflowToolBackedOperationExecutionRequest | undefined> {
		const documentBuilder = args.workflow.documentBuilders?.[args.documentBuilderId]
		if (!documentBuilder) {
			return undefined
		}

		const artifactDefinition = args.workflow.artifacts?.[documentBuilder.artifactId]
		if (!artifactDefinition) {
			return undefined
		}

		const destinationPath = readRequiredStringWorkflowValue({
			workflowValues: args.session.workflowValues,
			key: artifactDefinition.outputValueKeys.artifactAbsolutePath,
			context: `artifact destination resolution for document builder ${args.documentBuilderId}`,
		})

		const content = await documentBuilder.buildContent(args.session)

		return {
			toolName: ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,
			toolInput: documentBuilder.workflowValueWrites
				? {
						workflow_value_writes: documentBuilder.workflowValueWrites,
					}
				: {},
			toolParams: {
				artifact_id: documentBuilder.artifactId,
				destination_path: destinationPath,
				content,
			},
		}
	}

	private validateWorkflowDefinition(workflow: WorkflowDefinition): WorkflowValidationResult {
		if (workflow.name.trim() === "") {
			return { valid: false, errorMessage: "Workflow name must not be empty." }
		}

		if (workflow.slashCommandName.trim() === "") {
			return { valid: false, errorMessage: "Workflow slashCommandName must not be empty." }
		}

		if (workflow.useSkillName.trim() === "") {
			return { valid: false, errorMessage: "Workflow useSkillName must not be empty." }
		}

		if (workflow.entryPanel.promptMarkdown.trim() === "") {
			return { valid: false, errorMessage: "Workflow entryPanel promptMarkdown must not be empty." }
		}

		const workflowValueKeys = new Set<string>()
		for (const workflowValueKey of workflow.workflowValueKeys) {
			if (workflowValueKey.trim() === "") {
				return { valid: false, errorMessage: "Workflow workflowValueKeys entries must not be empty." }
			}

			if (workflowValueKey.trim() !== workflowValueKey) {
				return {
					valid: false,
					errorMessage: `Workflow workflowValueKeys entry ${workflowValueKey} must already be trimmed.`,
				}
			}

			if (workflowValueKeys.has(workflowValueKey)) {
				return {
					valid: false,
					errorMessage: `Workflow workflowValueKeys entry ${workflowValueKey} is duplicated.`,
				}
			}
			workflowValueKeys.add(workflowValueKey)
		}

		const entryProjectValueKeys = [
			{
				name: "projectMode",
				workflowValueKey: workflow.entryProjectValueKeys.projectMode,
			},
			{
				name: "projectTitle",
				workflowValueKey: workflow.entryProjectValueKeys.projectTitle,
			},
			{
				name: "projectFolderName",
				workflowValueKey: workflow.entryProjectValueKeys.projectFolderName,
			},
		]
		for (const entryProjectValueKey of entryProjectValueKeys) {
			if (entryProjectValueKey.workflowValueKey.trim() === "") {
				return {
					valid: false,
					errorMessage: `Workflow entryProjectValueKeys.${entryProjectValueKey.name} must not be empty.`,
				}
			}
			if (entryProjectValueKey.workflowValueKey.trim() !== entryProjectValueKey.workflowValueKey) {
				return {
					valid: false,
					errorMessage: `Workflow entryProjectValueKeys.${entryProjectValueKey.name} ${entryProjectValueKey.workflowValueKey} must already be trimmed.`,
				}
			}
			if (!workflowValueKeys.has(entryProjectValueKey.workflowValueKey)) {
				return {
					valid: false,
					errorMessage: `Workflow entryProjectValueKeys.${entryProjectValueKey.name} ${entryProjectValueKey.workflowValueKey} must be declared in workflowValueKeys.`,
				}
			}
		}

		const steps = Object.values(workflow.steps)
		if (steps.length === 0) {
			return { valid: false, errorMessage: "Workflow must contain at least one step." }
		}

		const seenStepNumbers = new Set<number>()
		const workflowForms = workflow.workflowForms ?? {}
		const toolBackedOperationDefinitions = workflow.toolBackedOperationDefinitions ?? {}
		const artifacts = workflow.artifacts ?? {}
		const documentBuilders = workflow.documentBuilders ?? {}
		const runtimeOwnedToolNames = new Set<ClineDefaultTool>([
			ClineDefaultTool.SET_WORKFLOW_VALUES,
			ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
			ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,
			ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
		])

		for (const [workflowFormId, workflowForm] of Object.entries(workflowForms)) {
			for (const panel of Object.values(workflowForm.panels)) {
				for (const field of panel.fields) {
					if (field.workflowValueKey === undefined) {
						continue
					}
					if (field.workflowValueKey.trim() === "") {
						return {
							valid: false,
							errorMessage: `Workflow form ${workflowFormId} field ${field.key} workflowValueKey must not be empty.`,
						}
					}
					if (field.workflowValueKey.trim() !== field.workflowValueKey) {
						return {
							valid: false,
							errorMessage: `Workflow form ${workflowFormId} field ${field.key} workflowValueKey ${field.workflowValueKey} must already be trimmed.`,
						}
					}
					if (!workflowValueKeys.has(field.workflowValueKey)) {
						return {
							valid: false,
							errorMessage: `Workflow form ${workflowFormId} field ${field.key} workflowValueKey ${field.workflowValueKey} must be declared in workflowValueKeys.`,
						}
					}
				}
			}
		}

		for (const [artifactId, artifactDefinition] of Object.entries(artifacts)) {
			const artifactValidation = this.validateWorkflowArtifactDefinition({
				artifactId,
				artifactDefinition,
				workflowValueKeys,
			})
			if (!artifactValidation.valid) {
				return artifactValidation
			}
		}

		for (const [documentBuilderId, documentBuilder] of Object.entries(documentBuilders)) {
			if (Object.hasOwn(documentBuilder, "artifactAbsolutePathWorkflowValueKey")) {
				return {
					valid: false,
					errorMessage: `Workflow documentBuilder ${documentBuilderId} must not declare artifactAbsolutePathWorkflowValueKey.`,
				}
			}

			const artifactDefinition = artifacts[documentBuilder.artifactId]
			if (artifactDefinition === undefined) {
				return {
					valid: false,
					errorMessage: `Workflow documentBuilder ${documentBuilderId} references missing artifactId ${documentBuilder.artifactId}.`,
				}
			}

			for (const workflowValueWriteKey of Object.keys(documentBuilder.workflowValueWrites ?? {})) {
				if (!workflowValueKeys.has(workflowValueWriteKey)) {
					return {
						valid: false,
						errorMessage: `Workflow documentBuilder ${documentBuilderId} writes undeclared workflow value key ${workflowValueWriteKey}.`,
					}
				}
			}
		}

		for (const [operationDefinitionId, operationDefinition] of Object.entries(toolBackedOperationDefinitions)) {
			if (runtimeOwnedToolNames.has(operationDefinition.toolName)) {
				return {
					valid: false,
					errorMessage: `Workflow toolBackedOperationDefinitions entry ${operationDefinitionId} must not use runtime-owned tool ${operationDefinition.toolName}.`,
				}
			}
		}

		for (const inheritanceRule of workflow.childInheritance ?? []) {
			if (!workflowValueKeys.has(inheritanceRule.childKey)) {
				return {
					valid: false,
					errorMessage: `Workflow childInheritance childKey ${inheritanceRule.childKey} must be declared in workflowValueKeys.`,
				}
			}
		}

		for (const step of steps) {
			if (step.id !== `step-${step.stepNumber}`) {
				return { valid: false, errorMessage: `Workflow step id must match step-${step.stepNumber}.` }
			}

			if (step.checklistLabel.trim() === "") {
				return { valid: false, errorMessage: `Workflow step ${step.id} checklistLabel must not be empty.` }
			}

			if (seenStepNumbers.has(step.stepNumber)) {
				return { valid: false, errorMessage: `Workflow stepNumber ${step.stepNumber} is duplicated.` }
			}
			seenStepNumbers.add(step.stepNumber)

			for (const documentBuilderId of step.documentBuilderIds ?? []) {
				if (!documentBuilders[documentBuilderId]) {
					return {
						valid: false,
						errorMessage: `Workflow step ${step.id} references missing documentBuilderId ${documentBuilderId}.`,
					}
				}
			}

			const entryBranch = step.decisionTree.branches[step.decisionTree.entryBranchId]
			if (!entryBranch) {
				return {
					valid: false,
					errorMessage: `Workflow step ${step.id} has an invalid decision-tree entryBranchId ${step.decisionTree.entryBranchId}.`,
				}
			}

			for (const [branchId, branch] of Object.entries(step.decisionTree.branches)) {
				if (branch.id !== branchId) {
					return {
						valid: false,
						errorMessage: `Workflow step ${step.id} decision-tree branch ${branchId} must have a matching branch id.`,
					}
				}

				if (branch.routes.length === 0) {
					return {
						valid: false,
						errorMessage: `Workflow step ${step.id} decision-tree branch ${branch.id} must declare at least one route.`,
					}
				}

				for (const route of branch.routes) {
					if (
						route.followingBranchId !== undefined &&
						step.decisionTree.branches[route.followingBranchId] === undefined
					) {
						return {
							valid: false,
							errorMessage: `Workflow step ${step.id} route ${route.id} references missing followingBranchId ${route.followingBranchId}.`,
						}
					}

					if (route.targetStepNumber !== undefined && workflow.steps[`step-${route.targetStepNumber}`] === undefined) {
						return {
							valid: false,
							errorMessage: `Workflow step ${step.id} route ${route.id} references missing targetStepNumber ${route.targetStepNumber}.`,
						}
					}

					switch (route.action.kind) {
						case "render_workflow_form":
							if (workflowForms[route.action.workflowFormId] === undefined) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} references missing workflowFormId ${route.action.workflowFormId}.`,
								}
							}
							break
						case "execute_tool_backed_operation":
							if (toolBackedOperationDefinitions[route.action.toolBackedOperationId] !== undefined) {
								break
							}
							return {
								valid: false,
								errorMessage: `Workflow step ${step.id} route ${route.id} references missing toolBackedOperationId ${route.action.toolBackedOperationId}.`,
							}
						case "build_workflow_document":
							if (
								(step.documentBuilderIds ?? []).includes(route.action.documentBuilderId) &&
								documentBuilders[route.action.documentBuilderId] !== undefined
							) {
								break
							}
							return {
								valid: false,
								errorMessage: `Workflow step ${step.id} route ${route.id} references missing documentBuilderId ${route.action.documentBuilderId}.`,
							}
						case "allocate_artifact":
							if (artifacts[route.action.artifactId] === undefined) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} references missing artifactId ${route.action.artifactId}.`,
								}
							}
							break
						case "project_prompt":
							break
						case "terminal_error":
							if (route.action.errorMessage.trim().length === 0) {
								return {
									valid: false,
									errorMessage: `Workflow step ${step.id} route ${route.id} terminal_error errorMessage must not be empty.`,
								}
							}
							break
						case "complete_workflow":
						case "no_op":
							break
					}
				}
			}
		}

		return { valid: true }
	}

	private validateWorkflowArtifactDefinition(args: {
		artifactId: string
		artifactDefinition: WorkflowArtifactDefinition
		workflowValueKeys: Set<string>
	}): WorkflowValidationResult {
		const artifactRecord = args.artifactDefinition as Record<string, unknown>
		if (args.artifactDefinition.id !== args.artifactId) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} must have a matching artifact id.`,
			}
		}

		for (const forbiddenKey of [
			"filenamePattern",
			"fileExtension",
			"extension",
			"contentKind",
			"numberingScope",
			"singletonIdentity",
			"discoveryPattern",
		]) {
			if (forbiddenKey in artifactRecord) {
				return {
					valid: false,
					errorMessage: `Workflow artifact ${args.artifactId} must not declare runtime-owned ${forbiddenKey}.`,
				}
			}
		}

		const artifactFamily = artifactRecord.family
		if (typeof artifactFamily !== "string" || !(artifactFamily in WORKFLOW_ARTIFACT_FAMILY_REGISTRY)) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} references unknown artifact family ${String(artifactFamily)}.`,
			}
		}

		const familyDefinition = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[artifactFamily as WorkflowArtifactFamily]
		const outputValueKeyValidation = this.validateWorkflowArtifactOutputValueKeys({
			artifactId: args.artifactId,
			familyDefinition,
			outputValueKeys: artifactRecord.outputValueKeys,
			workflowValueKeys: args.workflowValueKeys,
		})
		if (!outputValueKeyValidation.valid) {
			return outputValueKeyValidation
		}

		if (
			(familyDefinition.allocationMode === "singleton_project" ||
				familyDefinition.allocationMode === "derived_from_epic_index" ||
				familyDefinition.allocationMode === "new_numbered") &&
			args.artifactDefinition.intentMode !== "new"
		) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} must declare new artifact intent.`,
			}
		}

		if (familyDefinition.allocationMode === "derived_from_target" && args.artifactDefinition.intentMode !== "derived") {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} must declare derived artifact intent.`,
			}
		}

		switch (familyDefinition.identityRequirement) {
			case "none":
			case "epic_index":
				if (
					args.artifactDefinition.parentIdentitySource !== undefined ||
					args.artifactDefinition.targetIdentitySource !== undefined
				) {
					return {
						valid: false,
						errorMessage: `Workflow artifact ${args.artifactId} must not declare parent or target identity sources.`,
					}
				}
				break
			case "parent_epic_delivery_spec":
			case "parent_story": {
				if (args.artifactDefinition.targetIdentitySource !== undefined) {
					return {
						valid: false,
						errorMessage: `Workflow artifact ${args.artifactId} must not declare targetIdentitySource.`,
					}
				}
				const parentSourceValidation = this.validateWorkflowArtifactIdentitySource({
					artifactId: args.artifactId,
					sourceName: "parentIdentitySource",
					source: artifactRecord.parentIdentitySource,
					workflowValueKeys: args.workflowValueKeys,
				})
				if (!parentSourceValidation.valid) {
					return parentSourceValidation
				}
				break
			}
			case "target_story_or_remediation_story": {
				if (args.artifactDefinition.parentIdentitySource !== undefined) {
					return {
						valid: false,
						errorMessage: `Workflow artifact ${args.artifactId} must not declare parentIdentitySource.`,
					}
				}
				const targetSourceValidation = this.validateWorkflowArtifactIdentitySource({
					artifactId: args.artifactId,
					sourceName: "targetIdentitySource",
					source: artifactRecord.targetIdentitySource,
					workflowValueKeys: args.workflowValueKeys,
				})
				if (!targetSourceValidation.valid) {
					return targetSourceValidation
				}
				break
			}
		}

		return { valid: true }
	}

	private validateWorkflowArtifactIdentitySource(args: {
		artifactId: string
		sourceName: "parentIdentitySource" | "targetIdentitySource"
		source: unknown
		workflowValueKeys: Set<string>
	}): WorkflowValidationResult {
		if (!this.isRecord(args.source)) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} must declare ${args.sourceName}.`,
			}
		}

		if (args.source.kind !== "workflow_value") {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} ${args.sourceName} must use workflow_value.`,
			}
		}

		const sourceKey = args.source.key
		if (typeof sourceKey !== "string" || sourceKey.trim() === "") {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} ${args.sourceName} key must not be empty.`,
			}
		}

		if (sourceKey.trim() !== sourceKey) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} ${args.sourceName} key ${sourceKey} must already be trimmed.`,
			}
		}

		if (!args.workflowValueKeys.has(sourceKey)) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} ${args.sourceName} key ${sourceKey} must be declared in workflowValueKeys.`,
			}
		}

		return { valid: true }
	}

	private validateWorkflowArtifactOutputValueKeys(args: {
		artifactId: string
		familyDefinition: WorkflowArtifactFamilyDefinition
		outputValueKeys: unknown
		workflowValueKeys: Set<string>
	}): WorkflowValidationResult {
		if (!this.isRecord(args.outputValueKeys)) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} must declare outputValueKeys.`,
			}
		}

		for (const outputKeyName of [
			"projectTitle",
			"projectFolderName",
			"artifactFamily",
			"artifactIdentity",
			"artifactFilename",
			"artifactRelativePath",
			"artifactAbsolutePath",
		]) {
			const outputKeyValidation = this.validateWorkflowArtifactOutputKey({
				artifactId: args.artifactId,
				outputValueKeys: args.outputValueKeys,
				outputKeyName,
				required: true,
				workflowValueKeys: args.workflowValueKeys,
			})
			if (!outputKeyValidation.valid) {
				return outputKeyValidation
			}
		}

		switch (args.familyDefinition.identityRequirement) {
			case "none":
			case "epic_index":
				if (args.outputValueKeys.parentIdentity !== undefined || args.outputValueKeys.targetIdentity !== undefined) {
					return {
						valid: false,
						errorMessage: `Workflow artifact ${args.artifactId} must not declare parent or target output keys.`,
					}
				}
				break
			case "parent_epic_delivery_spec":
			case "parent_story": {
				const parentOutputKeyValidation = this.validateWorkflowArtifactOutputKey({
					artifactId: args.artifactId,
					outputValueKeys: args.outputValueKeys,
					outputKeyName: "parentIdentity",
					required: true,
					workflowValueKeys: args.workflowValueKeys,
				})
				if (!parentOutputKeyValidation.valid) {
					return parentOutputKeyValidation
				}
				if (args.outputValueKeys.targetIdentity !== undefined) {
					return {
						valid: false,
						errorMessage: `Workflow artifact ${args.artifactId} must not declare target output key.`,
					}
				}
				break
			}
			case "target_story_or_remediation_story": {
				const targetOutputKeyValidation = this.validateWorkflowArtifactOutputKey({
					artifactId: args.artifactId,
					outputValueKeys: args.outputValueKeys,
					outputKeyName: "targetIdentity",
					required: true,
					workflowValueKeys: args.workflowValueKeys,
				})
				if (!targetOutputKeyValidation.valid) {
					return targetOutputKeyValidation
				}
				if (args.outputValueKeys.parentIdentity !== undefined) {
					return {
						valid: false,
						errorMessage: `Workflow artifact ${args.artifactId} must not declare parent output key.`,
					}
				}
				break
			}
		}

		return { valid: true }
	}

	private validateWorkflowArtifactOutputKey(args: {
		artifactId: string
		outputValueKeys: Record<string, unknown>
		outputKeyName: string
		required: boolean
		workflowValueKeys: Set<string>
	}): WorkflowValidationResult {
		const outputValueKey = args.outputValueKeys[args.outputKeyName]
		if (outputValueKey === undefined && !args.required) {
			return { valid: true }
		}

		if (typeof outputValueKey !== "string" || outputValueKey.trim() === "") {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} outputValueKeys.${args.outputKeyName} must not be empty.`,
			}
		}

		if (outputValueKey.trim() !== outputValueKey) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} outputValueKeys.${args.outputKeyName} ${outputValueKey} must already be trimmed.`,
			}
		}

		if (!args.workflowValueKeys.has(outputValueKey)) {
			return {
				valid: false,
				errorMessage: `Workflow artifact ${args.artifactId} outputValueKeys.${args.outputKeyName} ${outputValueKey} must be declared in workflowValueKeys.`,
			}
		}

		return { valid: true }
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null
	}

	private isUnknownArray(value: unknown): value is unknown[] {
		return Array.isArray(value)
	}

	private async ensureProjectFoldersExist(session: ActiveWorkflowSession): Promise<void> {
		const projectRoot = join(this.cwd, session.projectSelection.projectFolderName)
		this.assertWorkspacePathAllowed(projectRoot)
		const projectSubfolderPaths = WORKFLOW_PROJECT_SUBFOLDERS.map((subfolderName) => join(projectRoot, subfolderName))
		for (const projectSubfolderPath of projectSubfolderPaths) {
			this.assertWorkspacePathAllowed(projectSubfolderPath)
		}

		await mkdir(projectRoot, { recursive: true })

		for (const projectSubfolderPath of projectSubfolderPaths) {
			await mkdir(projectSubfolderPath, { recursive: true })
		}
	}

	private refreshCurrentFocusChainChecklist(taskState: TaskState): void {
		const session = taskState.activeWorkflowSession
		if (!session) {
			taskState.currentFocusChainChecklist = null
			return
		}

		const definition = this.getActiveWorkflowDefinition(taskState)
		if (!definition) {
			taskState.currentFocusChainChecklist = null
			return
		}

		const validationResult = this.validateWorkflowDefinition(definition)
		if (!validationResult.valid || !this.getActiveStepDefinition(definition, session)) {
			taskState.currentFocusChainChecklist = null
			return
		}

		taskState.currentFocusChainChecklist = this.buildWorkflowStepChecklist(definition, session)
	}

	private buildWorkflowStepChecklist(definition: WorkflowDefinition, session: ActiveWorkflowSession): string {
		return Object.values(definition.steps)
			.sort((left, right) => left.stepNumber - right.stepNumber)
			.map((step) =>
				step.stepNumber < session.activeStepNumber ? `- [x] ${step.checklistLabel}` : `- [ ] ${step.checklistLabel}`,
			)
			.join("\n")
	}
}
