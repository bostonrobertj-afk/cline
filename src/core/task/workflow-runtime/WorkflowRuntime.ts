import {
	type WorkflowFormSubmissionRequest,
	WorkflowStartCardAction,
	type WorkflowStartCardSubmissionRequest,
} from "@shared/proto/cline/task"
import { randomUUID } from "crypto"
import { mkdir } from "fs/promises"
import { join } from "path"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import type { TaskState } from "@/core/task/TaskState"
import { WorkflowFormRuntime } from "@/core/task/workflow-form/WorkflowFormRuntime"
import { discoverWorkflowCandidates } from "@/core/task/workflow-runtime/discovery"
import { resolveWorkflowDefinition } from "@/core/task/workflow-runtime/WorkflowRegistry"
import { WorkflowStepResolutionRuntime } from "@/core/task/workflow-step-resolution/WorkflowStepResolutionRuntime"
import { ClineDefaultTool } from "@/shared/tools"
import type {
	ActiveWorkflowSession,
	PersistedWorkflowSession,
	WorkflowDefinition,
	WorkflowDiscoveryCandidate,
	WorkflowNextAction,
	WorkflowProjectSelectionState,
	WorkflowPromptProjection,
	WorkflowStepDefinition,
	WorkflowValidationResult,
	WorkflowValues,
} from "./types"

export class WorkflowRuntime {
	private readonly cwd: string
	private readonly workflowFormRuntime = new WorkflowFormRuntime()
	private readonly pendingWorkflowFormOperationByTaskState = new WeakMap<
		TaskState,
		{
			session: import("@/core/task/workflow-form/types").WorkflowFormSessionState
			operationId: string
			nextPanelId?: string
			terminal?: boolean
		}
	>()

	constructor(args: { cwd: string }) {
		this.cwd = args.cwd
	}

	async activateWorkflow(args: {
		taskState: TaskState
		workflow: WorkflowDefinition
		parentSession?: ActiveWorkflowSession
	}): Promise<WorkflowNextAction> {
		const { taskState, workflow, parentSession } = args
		const validationResult = this.validateWorkflowDefinition(workflow)
		if (!validationResult.valid) {
			return { kind: "no_op" }
		}

		const firstStepNumber = this.getFirstStepNumber(workflow)
		if (firstStepNumber === undefined) {
			return { kind: "no_op" }
		}

		const workflowValues: WorkflowValues = {}
		for (const inheritanceRule of workflow.childInheritance ?? []) {
			const parentValue = parentSession?.workflowValues[inheritanceRule.parentKey]
			if (parentValue !== undefined) {
				workflowValues[inheritanceRule.childKey] = parentValue
			}
		}

		taskState.activeWorkflowName = workflow.name
		taskState.activeWorkflowSession = {
			workflowName: workflow.name,
			activeStepNumber: firstStepNumber,
			workflowValues,
			projectSelection: {
				projectMode: "new",
				projectTitle: "",
				projectFolderName: "",
			},
			ui: {
				startCardSession: undefined,
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionDefinitionIds: [],
			},
		}

		taskState.activeWorkflowStartCardSession = undefined
		taskState.activeWorkflowFormSession = undefined
		taskState.activeWorkflowStepResolutionSession = undefined
		taskState.suppressedWorkflowFormResolverIds = []
		taskState.suppressedWorkflowStepResolutionDefinitionIds = []
		this.pendingWorkflowFormOperationByTaskState.delete(taskState)
		this.refreshCurrentFocusChainChecklist(taskState)
		this.syncWorkflowSessionMirrors(taskState)

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
			await this.teardownWorkflow({ taskState })
			return { kind: "no_op" }
		}

		const validationResult = this.validateWorkflowDefinition(definition)
		if (!validationResult.valid) {
			await this.teardownWorkflow({ taskState })
			return { kind: "no_op" }
		}

		const activeStep = this.getActiveStepDefinition(definition, session)
		if (!activeStep) {
			await this.teardownWorkflow({ taskState })
			return { kind: "no_op" }
		}

		this.refreshCurrentFocusChainChecklist(taskState)

		if (session.projectSelection.projectTitle === "" || session.projectSelection.projectFolderName === "") {
			const existingProjectOptions = await discoverWorkflowCandidates({
				baseDirectory: this.cwd,
				entryType: "directory",
				immediateChildrenOnly: true,
				sort: "alpha_asc",
				buildLabel: (entryName) => entryName,
			})
			const startCardSession = this.buildProjectSelectionStartCardSession({
				session,
				workflow: definition,
				existingProjectOptions,
			})
			session.ui.startCardSession = startCardSession
			this.syncWorkflowSessionMirrors(taskState)

			return {
				kind: "render_workflow_start_card",
				startCardSession,
			}
		}

		const pendingWorkflowFormOperation = this.pendingWorkflowFormOperationByTaskState.get(taskState)
		if (pendingWorkflowFormOperation) {
			return {
				kind: "run_deterministic_operation",
				toolRequest: {
					toolName: pendingWorkflowFormOperation.operationId as ClineDefaultTool,
					toolInput: {},
					toolParams: {},
				},
			}
		}

		if (session.ui.formSession) {
			this.syncWorkflowSessionMirrors(taskState)
			const payload = this.workflowFormRuntime.buildPayload(session.ui.formSession)
			return {
				kind: "render_workflow_form",
				formSession: session.ui.formSession,
				payload,
			} as WorkflowNextAction
		}

		if (session.ui.stepResolutionSession?.state === "pending") {
			const stepResolutionDefinition = definition.stepResolutionDefinitions?.[session.ui.stepResolutionSession.definitionId]
			if (!stepResolutionDefinition) {
				return { kind: "no_op" }
			}

			const stepResolutionRuntime = new WorkflowStepResolutionRuntime(definition.stepResolutionDefinitions ?? {})
			const stepResolutionSession = session.ui.stepResolutionSession
			const toolRequest = stepResolutionDefinition.buildToolExecutionRequest(stepResolutionSession)
			session.ui.stepResolutionSession = stepResolutionSession
			taskState.activeWorkflowStepResolutionSession = stepResolutionSession
			void stepResolutionRuntime

			return {
				kind: "run_deterministic_operation",
				toolRequest,
				stepResolutionSession,
			}
		}

		if (activeStep.completionRules?.some((rule) => rule.isComplete(session))) {
			await this.teardownWorkflow({ taskState })
			return { kind: "complete_workflow" }
		}

		const matchingNextActionRule = activeStep.nextActionRules?.find((rule) => rule.condition.matches(session))
		if (matchingNextActionRule) {
			switch (matchingNextActionRule.action) {
				case "render_workflow_start_card": {
					const existingProjectOptions = await discoverWorkflowCandidates({
						baseDirectory: this.cwd,
						entryType: "directory",
						immediateChildrenOnly: true,
						sort: "alpha_asc",
						buildLabel: (entryName) => entryName,
					})
					const startCardSession = this.buildProjectSelectionStartCardSession({
						session,
						workflow: definition,
						existingProjectOptions,
					})
					session.ui.startCardSession = startCardSession
					this.syncWorkflowSessionMirrors(taskState)

					return {
						kind: "render_workflow_start_card",
						startCardSession,
					}
				}
				case "render_workflow_form": {
					const workflowFormId = matchingNextActionRule.workflowFormId
					const definitionPayload = workflowFormId ? definition.workflowForms?.[workflowFormId] : undefined
					if (!workflowFormId || !definitionPayload) {
						return { kind: "no_op" }
					}

					const formSession = this.workflowFormRuntime.createSession({
						workflowFormId,
						definitionPayload,
					})
					session.ui.formSession = formSession
					this.syncWorkflowSessionMirrors(taskState)
					const payload = this.workflowFormRuntime.buildPayload(formSession)

					return {
						kind: "render_workflow_form",
						formSession,
						payload,
					} as WorkflowNextAction
				}
				case "run_deterministic_operation": {
					const definitionId = matchingNextActionRule.stepResolutionDefinitionId
					const stepResolutionDefinition = definitionId
						? definition.stepResolutionDefinitions?.[definitionId]
						: undefined
					if (!definitionId || !stepResolutionDefinition) {
						return { kind: "no_op" }
					}

					const stepResolutionRuntime = new WorkflowStepResolutionRuntime(definition.stepResolutionDefinitions ?? {})
					const stepResolutionSession =
						session.ui.stepResolutionSession?.definitionId === definitionId
							? session.ui.stepResolutionSession
							: stepResolutionRuntime.createSession({
									definitionId,
									triggerSource: "deterministic_workflow_progression",
									owner: {
										kind: "workflow_step",
										workflowName: definition.name,
										stepNumber: activeStep.stepNumber,
									},
								})
					const toolRequest = stepResolutionDefinition.buildToolExecutionRequest(stepResolutionSession)
					session.ui.stepResolutionSession = stepResolutionSession
					taskState.activeWorkflowStepResolutionSession = stepResolutionSession

					return {
						kind: "run_deterministic_operation",
						toolRequest,
						stepResolutionSession,
					}
				}
				case "complete_workflow":
					await this.teardownWorkflow({ taskState })
					return { kind: "complete_workflow" }
				case "project_prompt": {
					const promptProjection = await this.buildTurnProjection({ taskState })
					return {
						kind: "project_prompt",
						promptProjection,
					}
				}
				case "no_op":
					return { kind: "no_op" }
			}
		}

		const workflowFormId = activeStep.workflowFormId
		if (workflowFormId && !session.ui.suppressedWorkflowFormIds.includes(workflowFormId)) {
			const definitionPayload = definition.workflowForms?.[workflowFormId]
			if (definitionPayload) {
				const formSession = this.workflowFormRuntime.createSession({
					workflowFormId,
					definitionPayload,
				})
				session.ui.formSession = formSession
				this.syncWorkflowSessionMirrors(taskState)
				const payload = this.workflowFormRuntime.buildPayload(formSession)

				return {
					kind: "render_workflow_form",
					formSession,
					payload,
				} as WorkflowNextAction
			}
		}

		const stepResolutionDefinitionId = activeStep.stepResolutionDefinitionId
		if (
			stepResolutionDefinitionId &&
			!session.ui.suppressedWorkflowStepResolutionDefinitionIds.includes(stepResolutionDefinitionId)
		) {
			const stepResolutionDefinition = definition.stepResolutionDefinitions?.[stepResolutionDefinitionId]
			if (stepResolutionDefinition) {
				const stepResolutionRuntime = new WorkflowStepResolutionRuntime(definition.stepResolutionDefinitions ?? {})
				const stepResolutionSession =
					session.ui.stepResolutionSession?.definitionId === stepResolutionDefinitionId
						? session.ui.stepResolutionSession
						: stepResolutionRuntime.createSession({
								definitionId: stepResolutionDefinitionId,
								triggerSource: "deterministic_workflow_progression",
								owner: {
									kind: "workflow_step",
									workflowName: definition.name,
									stepNumber: activeStep.stepNumber,
								},
							})
				const toolRequest = stepResolutionDefinition.buildToolExecutionRequest(stepResolutionSession)
				session.ui.stepResolutionSession = stepResolutionSession
				taskState.activeWorkflowStepResolutionSession = stepResolutionSession

				return {
					kind: "run_deterministic_operation",
					toolRequest,
					stepResolutionSession,
				}
			}
		}

		const promptProjection = await this.buildTurnProjection({ taskState })
		return {
			kind: "project_prompt",
			promptProjection,
		}
	}

	async submitWorkflowStartCard(args: {
		taskState: TaskState
		request: WorkflowStartCardSubmissionRequest
	}): Promise<WorkflowNextAction> {
		const { taskState, request } = args
		const session = taskState.activeWorkflowSession
		const startCardSession = taskState.activeWorkflowStartCardSession

		if (
			!session ||
			!startCardSession ||
			request.sessionId !== taskState.activeWorkflowStartCardSession.sessionId ||
			request.action !== WorkflowStartCardAction.WORKFLOW_START_CARD_ACTION_SUBMIT
		) {
			return { kind: "no_op" }
		}

		const rawProjectMode = request.projectMode as unknown
		let nextProjectSelection: WorkflowProjectSelectionState | undefined

		if (rawProjectMode === "existing") {
			if (
				request.selectedExistingProject.trim().length === 0 ||
				!startCardSession.existingProjectOptions.some((option) => option.value === request.selectedExistingProject)
			) {
				return { kind: "no_op" }
			}

			nextProjectSelection = {
				projectMode: "existing",
				projectTitle: request.selectedExistingProject,
				projectFolderName: request.selectedExistingProject,
			}
		} else if (rawProjectMode === "new") {
			const trimmedTitle = request.newProjectTitle.trim()
			if (trimmedTitle.length === 0) {
				return { kind: "no_op" }
			}

			const projectFolderName = this.normalizeProjectFolderName(trimmedTitle)
			if (projectFolderName === "") {
				return { kind: "no_op" }
			}

			nextProjectSelection = {
				projectMode: "new",
				projectTitle: trimmedTitle,
				projectFolderName,
			}
		} else {
			return { kind: "no_op" }
		}

		session.projectSelection = nextProjectSelection

		const definition = this.getActiveWorkflowDefinition(taskState)
		if (!definition) {
			await this.teardownWorkflow({ taskState })
			return { kind: "no_op" }
		}

		const validationResult = this.validateWorkflowDefinition(definition)
		if (!validationResult.valid) {
			await this.teardownWorkflow({ taskState })
			return { kind: "no_op" }
		}

		await this.ensureProjectFoldersExist(session)

		session.ui.startCardSession = undefined
		taskState.activeWorkflowStartCardSession = undefined
		this.pendingWorkflowFormOperationByTaskState.delete(taskState)
		this.refreshCurrentFocusChainChecklist(taskState)
		this.syncWorkflowSessionMirrors(taskState)

		return this.resolveNextAction({ taskState })
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

		switch (outcome.kind) {
			case "render_form":
				session.ui.formSession = outcome.session
				this.syncWorkflowSessionMirrors(taskState)
				return this.resolveNextAction({ taskState })
			case "complete_success":
				session.ui.formSession = undefined
				if (!session.ui.suppressedWorkflowFormIds.includes(outcome.session.workflowFormId)) {
					session.ui.suppressedWorkflowFormIds.push(outcome.session.workflowFormId)
				}
				this.syncWorkflowSessionMirrors(taskState)
				return this.resolveNextAction({ taskState })
			case "invoke_deterministic_operation":
				this.pendingWorkflowFormOperationByTaskState.set(taskState, {
					session: outcome.session,
					operationId: outcome.operationId,
					nextPanelId: outcome.nextPanelId,
					terminal: outcome.terminal,
				})
				session.ui.formSession = undefined
				this.syncWorkflowSessionMirrors(taskState)
				return this.resolveNextAction({ taskState })
		}
	}

	async handleDeterministicToolResult(args: { taskState: TaskState; toolResultText?: string }): Promise<WorkflowNextAction> {
		const { taskState, toolResultText } = args
		const session = taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		if (session.ui.stepResolutionSession) {
			const definition = this.getActiveWorkflowDefinition(taskState)
			const stepResolutionSession = session.ui.stepResolutionSession
			const stepResolutionDefinition = definition?.stepResolutionDefinitions?.[stepResolutionSession.definitionId]
			if (!definition || !stepResolutionDefinition) {
				return { kind: "no_op" }
			}

			const stepResolutionRuntime = new WorkflowStepResolutionRuntime(definition.stepResolutionDefinitions ?? {})
			const evaluation = stepResolutionDefinition.evaluateToolExecutionResult(stepResolutionSession, { toolResultText })

			if (evaluation.succeeded) {
				stepResolutionRuntime.buildTerminalSession(stepResolutionSession, "success")
				session.ui.stepResolutionSession = undefined
				if (!session.ui.suppressedWorkflowStepResolutionDefinitionIds.includes(stepResolutionSession.definitionId)) {
					session.ui.suppressedWorkflowStepResolutionDefinitionIds.push(stepResolutionSession.definitionId)
				}
				session.activeStepNumber += 1
				this.refreshCurrentFocusChainChecklist(taskState)
				this.syncWorkflowSessionMirrors(taskState)
				return this.resolveNextAction({ taskState })
			}

			stepResolutionRuntime.buildTerminalSession(stepResolutionSession, "failure", evaluation.errorMessage)
			session.ui.stepResolutionSession = undefined
			if (!session.ui.suppressedWorkflowStepResolutionDefinitionIds.includes(stepResolutionSession.definitionId)) {
				session.ui.suppressedWorkflowStepResolutionDefinitionIds.push(stepResolutionSession.definitionId)
			}

			const fallbackToAgent = (evaluation as { fallbackToAgent?: boolean }).fallbackToAgent === true
			if (fallbackToAgent) {
				this.refreshCurrentFocusChainChecklist(taskState)
				this.syncWorkflowSessionMirrors(taskState)
				return this.resolveNextAction({ taskState })
			}

			this.refreshCurrentFocusChainChecklist(taskState)
			this.syncWorkflowSessionMirrors(taskState)
			return this.resolveNextAction({ taskState })
		}

		const pendingWorkflowFormOperation = this.pendingWorkflowFormOperationByTaskState.get(taskState)
		if (!pendingWorkflowFormOperation) {
			return { kind: "no_op" }
		}

		this.pendingWorkflowFormOperationByTaskState.delete(taskState)

		if (!toolResultText || toolResultText.startsWith("Error:")) {
			session.ui.formSession = pendingWorkflowFormOperation.session
			this.syncWorkflowSessionMirrors(taskState)
			return this.resolveNextAction({ taskState })
		}

		if (pendingWorkflowFormOperation.terminal === true) {
			if (!session.ui.suppressedWorkflowFormIds.includes(pendingWorkflowFormOperation.session.workflowFormId)) {
				session.ui.suppressedWorkflowFormIds.push(pendingWorkflowFormOperation.session.workflowFormId)
			}
			this.syncWorkflowSessionMirrors(taskState)
			return this.resolveNextAction({ taskState })
		}

		if (pendingWorkflowFormOperation.nextPanelId) {
			session.ui.formSession = {
				...pendingWorkflowFormOperation.session,
				currentPanelId: pendingWorkflowFormOperation.nextPanelId,
			}
			this.syncWorkflowSessionMirrors(taskState)
			return this.resolveNextAction({ taskState })
		}

		session.ui.formSession = pendingWorkflowFormOperation.session
		this.syncWorkflowSessionMirrors(taskState)
		return this.resolveNextAction({ taskState })
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

		return activeStep.allowWorkflowProgressRequest === true
	}

	async submitWorkflowProgressRequest(args: { taskState: TaskState; approved: boolean }): Promise<WorkflowNextAction> {
		const { taskState, approved } = args
		if (approved !== true) {
			return { kind: "no_op" }
		}

		const session = taskState.activeWorkflowSession
		if (!session) {
			return { kind: "no_op" }
		}

		session.activeStepNumber += 1
		session.ui.suppressedWorkflowFormIds = []
		session.ui.suppressedWorkflowStepResolutionDefinitionIds = []
		this.refreshCurrentFocusChainChecklist(taskState)
		this.syncWorkflowSessionMirrors(taskState)

		return this.resolveNextAction({ taskState })
	}

	async applyWorkflowValueWrites(args: {
		taskState: TaskState
		values: WorkflowValues
	}): Promise<{ changedValues: WorkflowValues; unchangedValues: WorkflowValues }> {
		const { taskState, values } = args
		const session = taskState.activeWorkflowSession
		const definition = session ? this.getActiveWorkflowDefinition(taskState) : undefined
		const activeStep = session && definition ? this.getActiveStepDefinition(definition, session) : undefined

		let allowedKeys = new Set<string>()
		if (session && activeStep && activeStep.setWorkflowValuesToolOverride) {
			const toolSchemaOverride: readonly ClineToolSpec[] | undefined =
				activeStep.setWorkflowValuesToolOverride.buildToolSchemaOverride({
					session,
					step: activeStep,
				})
			const setWorkflowValuesToolSpec = toolSchemaOverride?.find(
				(toolSpec) => toolSpec.id === ClineDefaultTool.SET_WORKFLOW_VALUES,
			)
			const valuesParameter = setWorkflowValuesToolSpec?.parameters?.find(
				(parameter) => parameter.name === "values" && parameter.type === "object",
			)
			if (valuesParameter?.properties) {
				allowedKeys = new Set(Object.keys(valuesParameter.properties))
			}
		}

		const changedValues: WorkflowValues = {}
		const unchangedValues: WorkflowValues = {}

		for (const [key, rawValue] of Object.entries(values)) {
			const trimmedValue = rawValue.trim()

			if (!allowedKeys.has(key)) {
				unchangedValues[key] = trimmedValue
				continue
			}

			const currentValue = session?.workflowValues[key]
			if (currentValue === trimmedValue) {
				unchangedValues[key] = trimmedValue
				continue
			}

			if (!session) {
				unchangedValues[key] = trimmedValue
				continue
			}

			session.workflowValues[key] = trimmedValue
			changedValues[key] = trimmedValue
		}

		return {
			changedValues,
			unchangedValues,
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

		return activeStep.buildPromptProjection({ session, step: activeStep })
	}

	getPersistedSession(args: { taskState: TaskState }): PersistedWorkflowSession | undefined {
		return args.taskState.activeWorkflowSession ? structuredClone(args.taskState.activeWorkflowSession) : undefined
	}

	async restorePersistedSession(args: {
		taskState: TaskState
		persistedSession?: PersistedWorkflowSession
	}): Promise<WorkflowNextAction | undefined> {
		const { taskState, persistedSession } = args
		if (!persistedSession) {
			return undefined
		}

		const definition = resolveWorkflowDefinition(persistedSession.workflowName)
		if (!definition) {
			await this.teardownWorkflow({ taskState })
			return undefined
		}

		const validationResult = this.validateWorkflowDefinition(definition)
		if (!validationResult.valid) {
			await this.teardownWorkflow({ taskState })
			return undefined
		}

		const activeStep = this.getActiveStepDefinition(definition, persistedSession)
		if (!activeStep) {
			await this.teardownWorkflow({ taskState })
			return undefined
		}

		taskState.activeWorkflowName = persistedSession.workflowName
		taskState.activeWorkflowSession = structuredClone(persistedSession)
		this.pendingWorkflowFormOperationByTaskState.delete(taskState)
		this.refreshCurrentFocusChainChecklist(taskState)
		this.syncWorkflowSessionMirrors(taskState)

		return this.resolveNextAction({ taskState })
	}

	async teardownWorkflow(args: { taskState: TaskState }): Promise<void> {
		const { taskState } = args
		taskState.activeWorkflowName = undefined
		taskState.activeWorkflowSession = undefined
		taskState.activeWorkflowStartCardSession = undefined
		taskState.activeWorkflowFormSession = undefined
		taskState.activeWorkflowStepResolutionSession = undefined
		taskState.currentFocusChainChecklist = null
		taskState.suppressedWorkflowFormResolverIds = []
		taskState.suppressedWorkflowStepResolutionDefinitionIds = []
		this.pendingWorkflowFormOperationByTaskState.delete(taskState)
	}

	private syncWorkflowSessionMirrors(taskState: TaskState): void {
		const activeWorkflowSession = taskState.activeWorkflowSession
		taskState.activeWorkflowStartCardSession = activeWorkflowSession?.ui.startCardSession
		taskState.activeWorkflowFormSession = activeWorkflowSession?.ui.formSession
		taskState.activeWorkflowStepResolutionSession = activeWorkflowSession?.ui.stepResolutionSession
		taskState.suppressedWorkflowFormResolverIds = activeWorkflowSession
			? [...activeWorkflowSession.ui.suppressedWorkflowFormIds]
			: []
		taskState.suppressedWorkflowStepResolutionDefinitionIds = activeWorkflowSession
			? [...activeWorkflowSession.ui.suppressedWorkflowStepResolutionDefinitionIds]
			: []
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

	private normalizeProjectFolderName(title: string): string {
		return title
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-+|-+$/g, "")
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

		if (workflow.startCard.markdownBody.trim() === "") {
			return { valid: false, errorMessage: "Workflow start card markdownBody must not be empty." }
		}

		if (workflow.startCard.submitLabel.trim() === "") {
			return { valid: false, errorMessage: "Workflow start card submitLabel must not be empty." }
		}

		const steps = Object.values(workflow.steps)
		if (steps.length === 0) {
			return { valid: false, errorMessage: "Workflow must contain at least one step." }
		}

		const seenStepNumbers = new Set<number>()
		const workflowForms = workflow.workflowForms ?? {}
		const stepResolutionDefinitions = workflow.stepResolutionDefinitions ?? {}
		const documentBuilders = workflow.documentBuilders ?? {}

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

			if (step.workflowFormId && !workflowForms[step.workflowFormId]) {
				return {
					valid: false,
					errorMessage: `Workflow step ${step.id} references missing workflowFormId ${step.workflowFormId}.`,
				}
			}

			if (step.stepResolutionDefinitionId && !stepResolutionDefinitions[step.stepResolutionDefinitionId]) {
				return {
					valid: false,
					errorMessage: `Workflow step ${step.id} references missing stepResolutionDefinitionId ${step.stepResolutionDefinitionId}.`,
				}
			}

			for (const documentBuilderId of step.documentBuilderIds ?? []) {
				if (!documentBuilders[documentBuilderId]) {
					return {
						valid: false,
						errorMessage: `Workflow step ${step.id} references missing documentBuilderId ${documentBuilderId}.`,
					}
				}
			}

			for (const nextActionRule of step.nextActionRules ?? []) {
				if (nextActionRule.action === "render_workflow_form") {
					if (!nextActionRule.workflowFormId || !workflowForms[nextActionRule.workflowFormId]) {
						return {
							valid: false,
							errorMessage: `Workflow step ${step.id} has an invalid render_workflow_form next-action rule.`,
						}
					}
				}

				if (nextActionRule.action === "run_deterministic_operation") {
					if (
						!nextActionRule.stepResolutionDefinitionId ||
						!stepResolutionDefinitions[nextActionRule.stepResolutionDefinitionId]
					) {
						return {
							valid: false,
							errorMessage: `Workflow step ${step.id} has an invalid run_deterministic_operation next-action rule.`,
						}
					}
				}

				if (nextActionRule.documentBuilderId && !documentBuilders[nextActionRule.documentBuilderId]) {
					return {
						valid: false,
						errorMessage: `Workflow step ${step.id} references missing next-action documentBuilderId ${nextActionRule.documentBuilderId}.`,
					}
				}
			}
		}

		return { valid: true }
	}

	private async ensureProjectFoldersExist(session: ActiveWorkflowSession): Promise<void> {
		const projectRoot = join(this.cwd, session.projectSelection.projectFolderName)
		await mkdir(projectRoot, { recursive: true })

		for (const subfolderName of ["discovery", "planning", "implementation", "review", "testing"]) {
			await mkdir(join(projectRoot, subfolderName), { recursive: true })
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

		taskState.currentFocusChainChecklist = Object.values(definition.steps)
			.sort((left, right) => left.stepNumber - right.stepNumber)
			.map((step) =>
				step.stepNumber < session.activeStepNumber ? `- [x] ${step.checklistLabel}` : `- [ ] ${step.checklistLabel}`,
			)
			.join("\n")
	}

	private buildProjectSelectionStartCardSession(args: {
		session: ActiveWorkflowSession
		workflow: WorkflowDefinition
		existingProjectOptions: WorkflowDiscoveryCandidate[]
	}): NonNullable<TaskState["activeWorkflowStartCardSession"]> {
		const existingSession = args.session.ui.startCardSession
		const selectedExistingProject =
			existingSession?.selectedExistingProject &&
			args.existingProjectOptions.some((option) => option.value === existingSession.selectedExistingProject)
				? existingSession.selectedExistingProject
				: undefined

		return {
			sessionId: existingSession?.sessionId ?? randomUUID(),
			workflowName: args.workflow.name,
			markdownBody: args.workflow.startCard.markdownBody,
			submitLabel: args.workflow.startCard.submitLabel,
			projectMode: existingSession?.projectMode ?? "new",
			existingProjectOptions: args.existingProjectOptions,
			selectedExistingProject,
			newProjectTitle: existingSession?.newProjectTitle,
		}
	}
}
