import type { WorkflowFormDefinitionPayload, WorkflowFormPanelDefinition } from "@shared/ExtensionMessage"
import {
	WorkflowFormAction,
	WorkflowFormSubmissionRequest,
	WorkflowStartCardAction,
	type WorkflowStartCardProjectMode,
	type WorkflowStartCardSubmissionRequest,
} from "@shared/proto/cline/task"
import { expect } from "chai"
import { access, mkdtemp, rm } from "fs/promises"
import { afterEach, beforeEach, describe, it } from "mocha"
import { tmpdir } from "os"
import { join } from "path"
import * as sinon from "sinon"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { TaskState } from "@/core/task/TaskState"
import type { WorkflowStepResolutionDefinition } from "@/core/task/workflow-step-resolution/types"
import { ClineDefaultTool } from "@/shared/tools"
import * as WorkflowDiscovery from "../discovery"
import type { ActiveWorkflowSession, WorkflowDefinition, WorkflowStepDefinition, WorkflowValues } from "../types"
import * as WorkflowRegistry from "../WorkflowRegistry"
import { WorkflowRuntime } from "../WorkflowRuntime"

describe("WorkflowRuntime", () => {
	let sandbox: sinon.SinonSandbox
	let cwd: string
	let runtime: WorkflowRuntime
	let taskState: TaskState
	let discoverWorkflowCandidatesStub: sinon.SinonStub
	let resolveWorkflowDefinitionStub: sinon.SinonStub

	beforeEach(async () => {
		sandbox = sinon.createSandbox()
		cwd = await mkdtemp(join(tmpdir(), "workflow-runtime-test-"))
		runtime = new WorkflowRuntime({ cwd })
		taskState = new TaskState()
		discoverWorkflowCandidatesStub = sandbox.stub(WorkflowDiscovery, "discoverWorkflowCandidates").resolves([])
		resolveWorkflowDefinitionStub = sandbox.stub(WorkflowRegistry, "resolveWorkflowDefinition").returns(undefined)
	})

	afterEach(async () => {
		sandbox.restore()
		await rm(cwd, { recursive: true, force: true })
	})

	function createWorkflowDefinition(args?: {
		name?: string
		workflowForms?: Record<string, WorkflowFormDefinitionPayload>
		stepResolutionDefinitions?: Record<string, WorkflowStepResolutionDefinition>
		steps?: WorkflowDefinition["steps"]
		childInheritance?: WorkflowDefinition["childInheritance"]
	}): WorkflowDefinition {
		const defaultSteps: Record<string, WorkflowStepDefinition> = {
			"step-1": {
				id: "step-1",
				stepNumber: 1,
				checklistLabel: "Step 1",
				allowWorkflowProgressRequest: true,
				buildPromptProjection: () => ({
					workflowSystemInstructionsBlock: "system",
					workflowInputInstructionsBlock: "input",
				}),
			} as WorkflowStepDefinition,
			"step-2": {
				id: "step-2",
				stepNumber: 2,
				checklistLabel: "Step 2",
				allowWorkflowProgressRequest: true,
				buildPromptProjection: () => ({
					workflowSystemInstructionsBlock: "system",
					workflowInputInstructionsBlock: "input",
				}),
			} as WorkflowStepDefinition,
		}

		return {
			name: args?.name ?? "workflow-runtime-test",
			slashCommandName: "workflow-runtime-test",
			useSkillName: "workflow-runtime-test",
			persona: "Workflow runtime persona",
			projectSubfolder: ".",
			startCard: {
				markdownBody: "Start this workflow",
				submitLabel: "Start workflow",
			},
			steps: args?.steps ?? defaultSteps,
			workflowForms: args?.workflowForms ?? {},
			stepResolutionDefinitions: args?.stepResolutionDefinitions ?? {},
			childInheritance: args?.childInheritance,
		} as WorkflowDefinition
	}

	function registerResolvedWorkflow(workflow: WorkflowDefinition) {
		resolveWorkflowDefinitionStub.callsFake((workflowName: string) => (workflowName === workflow.name ? workflow : undefined))
	}

	function createStartCardSubmitRequest(args: {
		sessionId: string
		projectMode: "new" | "existing"
		selectedExistingProject?: string
		newProjectTitle?: string
		action?: WorkflowStartCardAction
	}): WorkflowStartCardSubmissionRequest {
		return {
			metadata: undefined,
			sessionId: args.sessionId,
			action: args.action ?? WorkflowStartCardAction.WORKFLOW_START_CARD_ACTION_SUBMIT,
			projectMode: args.projectMode as unknown as WorkflowStartCardProjectMode,
			selectedExistingProject: args.selectedExistingProject ?? "",
			newProjectTitle: args.newProjectTitle ?? "",
		} as WorkflowStartCardSubmissionRequest
	}

	function createFormSubmitRequest(args: {
		sessionId: string
		panelId: string
		action?: WorkflowFormAction
		fields?: WorkflowFormSubmissionRequest["fields"]
	}) {
		return WorkflowFormSubmissionRequest.create({
			sessionId: args.sessionId,
			panelId: args.panelId,
			action: args.action ?? WorkflowFormAction.SUBMIT,
			fields: args.fields ?? [],
		})
	}

	function createWorkflowFormDefinitionPayload(args?: {
		deterministic?: boolean
		nextPanelId?: string
		terminal?: boolean
	}): WorkflowFormDefinitionPayload {
		const nextPanelId = args?.nextPanelId ?? "panel-3"
		const panels: Record<string, WorkflowFormPanelDefinition> = {
			"panel-1": {
				panelId: "panel-1",
				title: "Panel 1",
				promptMarkdown: "Panel 1 prompt",
				fields: [],
				allowedActions: ["submit"],
				transition: { type: "sequential", nextPanelId: "panel-2" },
			},
			"panel-2": {
				panelId: "panel-2",
				title: "Panel 2",
				promptMarkdown: "Panel 2 prompt",
				fields: [],
				allowedActions: ["submit"],
				transition: args?.deterministic
					? {
							type: "deterministic_operation",
							operationId: "persist_form",
							nextPanelId,
							terminal: args.terminal ?? false,
						}
					: {
							type: "deterministic_operation",
							operationId: "persist_form",
							terminal: true,
						},
			},
		}

		if (args?.deterministic) {
			panels[nextPanelId] = {
				panelId: nextPanelId,
				title: "Panel 3",
				promptMarkdown: "Panel 3 prompt",
				fields: [],
				allowedActions: ["submit"],
				transition: {
					type: "deterministic_operation",
					operationId: "persist_form",
					terminal: true,
				},
			}
		}

		return {
			definitionVersion: 2,
			title: "Workflow Form",
			toolDictionaryTitle: "Workflow Form Tools",
			toolDictionaryMarkdown: "Workflow form tools",
			firstPanelId: "panel-1",
			panels,
		} as WorkflowFormDefinitionPayload
	}

	function createStepResolutionDefinition(args?: {
		fallbackToAgent?: boolean
		shouldSucceed?: boolean
	}): WorkflowStepResolutionDefinition {
		return {
			id: "step-resolution-1",
			toolName: ClineDefaultTool.SET_WORKFLOW_VALUES,
			buildStatusDefinition: () => ({
				title: "Step Resolution",
				pendingLabel: "Pending",
				successLabel: "Success",
				failureLabel: "Failure",
			}),
			buildToolExecutionRequest: () => ({
				toolName: ClineDefaultTool.SET_WORKFLOW_VALUES,
				toolInput: {},
				toolParams: {},
			}),
			evaluateToolExecutionResult: () => {
				if (args?.shouldSucceed === false && args.fallbackToAgent) {
					return { succeeded: false, errorMessage: "failure", fallbackToAgent: true }
				}

				if (args?.shouldSucceed === false) {
					return { succeeded: false, errorMessage: "failure" }
				}

				return { succeeded: true }
			},
		} as WorkflowStepResolutionDefinition
	}

	function createAllowedValueWriteOverride(args?: { allowedKeys: string[] }) {
		return {
			contract: {} as never,
			buildToolSchemaOverride: (_input: {
				session: ActiveWorkflowSession
				step: WorkflowStepDefinition
			}): readonly ClineToolSpec[] | undefined => [
				{
					id: ClineDefaultTool.SET_WORKFLOW_VALUES,
					parameters: [
						{
							name: "values",
							type: "object",
							properties: Object.fromEntries((args?.allowedKeys ?? []).map((key) => [key, { type: "string" }])),
						},
					],
				},
			],
		}
	}

	function setDiscoveredProjects(projectNames: string[]) {
		discoverWorkflowCandidatesStub.resolves(
			projectNames.map((name) => ({
				value: name,
				label: name,
			})),
		)
	}

	async function submitNewProjectSelection(state: TaskState, newProjectTitle: string) {
		const sessionId = (state.activeWorkflowStartCardSession as any)?.sessionId
		expect(sessionId).to.be.a("string").and.not.equal("")

		return runtime.submitWorkflowStartCard({
			taskState: state,
			request: createStartCardSubmitRequest({
				sessionId,
				projectMode: "new",
				newProjectTitle,
			}),
		})
	}

	async function submitExistingProjectSelection(state: TaskState, selectedExistingProject: string) {
		const sessionId = (state.activeWorkflowStartCardSession as any)?.sessionId
		expect(sessionId).to.be.a("string").and.not.equal("")

		return runtime.submitWorkflowStartCard({
			taskState: state,
			request: createStartCardSubmitRequest({
				sessionId,
				projectMode: "existing",
				selectedExistingProject,
			}),
		})
	}

	async function submitActiveWorkflowFormPanel(state: TaskState) {
		const activeFormSession = state.activeWorkflowFormSession as any
		expect(activeFormSession?.sessionId).to.be.a("string").and.not.equal("")
		expect(activeFormSession?.panelId).to.be.a("string").and.not.equal("")

		return runtime.submitWorkflowForm({
			taskState: state,
			request: createFormSubmitRequest({
				sessionId: activeFormSession.sessionId,
				panelId: activeFormSession.panelId,
			}),
		})
	}

	it("activates a valid workflow and initializes runtime-owned state", async () => {
		const workflow = createWorkflowDefinition()

		;(taskState as any).activeWorkflowName = "stale-workflow"
		;(taskState as any).activeWorkflowSession = { stale: true }
		;(taskState as any).activeWorkflowStartCardSession = { sessionId: "stale-start-card" }
		;(taskState as any).activeWorkflowFormSession = { sessionId: "stale-form" }
		;(taskState as any).activeWorkflowStepResolutionSession = { id: "stale-step-resolution" }
		;(taskState as any).suppressedWorkflowFormResolverIds = ["stale-form-id"]
		;(taskState as any).suppressedWorkflowStepResolutionDefinitionIds = ["stale-step-resolution-id"]
		;(taskState as any).currentFocusChainChecklist = [{ label: "stale" }]

		const result = await runtime.activateWorkflow({ taskState, workflow })

		expect(result.kind).to.equal("render_workflow_start_card")
		expect(taskState.activeWorkflowName).to.equal(workflow.name)
		expect(taskState.activeWorkflowSession).to.exist
		expect(taskState.activeWorkflowStartCardSession).to.exist
		expect(taskState.activeWorkflowStartCardSession).to.not.deep.equal({ sessionId: "stale-start-card" })
		expect(taskState.activeWorkflowFormSession).to.be.undefined
		expect(taskState.activeWorkflowStepResolutionSession).to.be.undefined
		expect(taskState.suppressedWorkflowFormResolverIds).to.deep.equal([])
		expect(taskState.suppressedWorkflowStepResolutionDefinitionIds).to.deep.equal([])
		expect(taskState.currentFocusChainChecklist).to.be.an("array").with.length(2)
	})

	it("returns no_op and leaves task state unchanged for workflows with no steps", async () => {
		const invalidWorkflow = createWorkflowDefinition({
			steps: {} as WorkflowDefinition["steps"],
		})
		const existingSession = { id: "session-1" }
		const existingStartCardSession = { sessionId: "start-card-1" }
		const existingFormSession = { sessionId: "form-1" }
		const existingStepResolutionSession = { id: "step-resolution-1" }
		const existingChecklist = [{ label: "existing" }]

		;(taskState as any).activeWorkflowName = "existing-workflow"
		;(taskState as any).activeWorkflowSession = existingSession
		;(taskState as any).activeWorkflowStartCardSession = existingStartCardSession
		;(taskState as any).activeWorkflowFormSession = existingFormSession
		;(taskState as any).activeWorkflowStepResolutionSession = existingStepResolutionSession
		;(taskState as any).suppressedWorkflowFormResolverIds = ["existing-form-id"]
		;(taskState as any).suppressedWorkflowStepResolutionDefinitionIds = ["existing-step-id"]
		;(taskState as any).currentFocusChainChecklist = existingChecklist

		const result = await runtime.activateWorkflow({ taskState, workflow: invalidWorkflow })

		expect(result).to.deep.equal({ kind: "no_op" })
		expect(taskState.activeWorkflowName).to.equal("existing-workflow")
		expect(taskState.activeWorkflowSession).to.equal(existingSession)
		expect(taskState.activeWorkflowStartCardSession).to.equal(existingStartCardSession)
		expect(taskState.activeWorkflowFormSession).to.equal(existingFormSession)
		expect(taskState.activeWorkflowStepResolutionSession).to.equal(existingStepResolutionSession)
		expect(taskState.suppressedWorkflowFormResolverIds).to.deep.equal(["existing-form-id"])
		expect(taskState.suppressedWorkflowStepResolutionDefinitionIds).to.deep.equal(["existing-step-id"])
		expect(taskState.currentFocusChainChecklist).to.equal(existingChecklist)
	})

	it("renders start-card project selection and handles new, existing, and invalid submissions", async () => {
		const workflow = createWorkflowDefinition()
		registerResolvedWorkflow(workflow)
		setDiscoveredProjects(["Existing Alpha", "Existing Beta"])

		await runtime.activateWorkflow({ taskState, workflow })
		const startCardAction = await runtime.resolveNextAction({ taskState })

		expect(startCardAction.kind).to.equal("render_workflow_start_card")
		expect((taskState.activeWorkflowStartCardSession as any)?.existingProjectOptions).to.deep.equal([
			{ value: "Existing Alpha", label: "Existing Alpha" },
			{ value: "Existing Beta", label: "Existing Beta" },
		])

		const newSubmissionResult = await submitNewProjectSelection(taskState, "  Launch Plan  ")
		const newProjectSelection = (taskState.activeWorkflowSession as any)?.projectSelection
		const newProjectFolderName = newProjectSelection?.projectFolderName

		expect(newSubmissionResult.kind).to.equal("project_prompt")
		expect(newProjectSelection?.projectTitle).to.equal("Launch Plan")
		expect(newProjectFolderName).to.equal("launch-plan")
		expect(taskState.activeWorkflowStartCardSession).to.be.undefined

		for (const subfolderName of ["discovery", "planning", "implementation", "review", "testing"]) {
			await access(join(cwd, newProjectFolderName, subfolderName))
		}

		const existingTaskState = new TaskState()
		await runtime.activateWorkflow({ taskState: existingTaskState, workflow })
		await runtime.resolveNextAction({ taskState: existingTaskState })
		const existingSubmissionResult = await submitExistingProjectSelection(existingTaskState, "Existing Beta")
		const existingProjectSelection = (existingTaskState.activeWorkflowSession as any)?.projectSelection

		expect(existingSubmissionResult.kind).to.equal("project_prompt")
		expect(existingProjectSelection).to.deep.include({
			projectTitle: "Existing Beta",
			projectFolderName: "Existing Beta",
		})

		const invalidSessionTaskState = new TaskState()
		await runtime.activateWorkflow({ taskState: invalidSessionTaskState, workflow })
		await runtime.resolveNextAction({ taskState: invalidSessionTaskState })
		const invalidSessionResult = await runtime.submitWorkflowStartCard({
			taskState: invalidSessionTaskState,
			request: createStartCardSubmitRequest({
				sessionId: "wrong-session-id",
				projectMode: "new",
				newProjectTitle: "Ignored",
			}),
		})
		const invalidActionResult = await runtime.submitWorkflowStartCard({
			taskState: invalidSessionTaskState,
			request: createStartCardSubmitRequest({
				sessionId: (invalidSessionTaskState.activeWorkflowStartCardSession as any).sessionId,
				projectMode: "new",
				newProjectTitle: "Ignored",
				action: 999 as WorkflowStartCardAction,
			}),
		})

		expect(invalidSessionResult).to.deep.equal({ kind: "no_op" })
		expect(invalidActionResult).to.deep.equal({ kind: "no_op" })

		const emptySlugTaskState = new TaskState()
		await runtime.activateWorkflow({ taskState: emptySlugTaskState, workflow })
		await runtime.resolveNextAction({ taskState: emptySlugTaskState })
		const emptySlugResult = await runtime.submitWorkflowStartCard({
			taskState: emptySlugTaskState,
			request: createStartCardSubmitRequest({
				sessionId: (emptySlugTaskState.activeWorkflowStartCardSession as any).sessionId,
				projectMode: "new",
				newProjectTitle: "!!!",
			}),
		})

		expect(emptySlugResult).to.deep.equal({ kind: "no_op" })
	})

	it("returns project_prompt projections once project selection is satisfied", async () => {
		const workflow = createWorkflowDefinition()

		await runtime.activateWorkflow({ taskState, workflow })
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Projection Project")

		const nextAction = await runtime.resolveNextAction({ taskState })
		const turnProjection = await runtime.buildTurnProjection({ taskState })
		const emptyProjection = await runtime.buildTurnProjection({ taskState: new TaskState() })

		expect(nextAction.kind).to.equal("project_prompt")
		expect(turnProjection).to.deep.equal({
			workflowSystemInstructionsBlock: "system",
			workflowInputInstructionsBlock: "input",
		})
		expect(emptyProjection).to.deep.equal({})
	})

	it("renders workflow forms, persists pending deterministic form state, and handles form outcomes", async () => {
		const terminalFormId = "form-terminal"
		const terminalWorkflow = createWorkflowDefinition({
			workflowForms: {
				[terminalFormId]: createWorkflowFormDefinitionPayload(),
			},
			steps: {
				"step-1": {
					id: "step-1",
					stepNumber: 1,
					checklistLabel: "Step 1",
					allowWorkflowProgressRequest: true,
					workflowFormId: terminalFormId,
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
				"step-2": {
					id: "step-2",
					stepNumber: 2,
					checklistLabel: "Step 2",
					allowWorkflowProgressRequest: true,
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
			},
		})

		await runtime.activateWorkflow({ taskState, workflow: terminalWorkflow })
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Form Terminal Project")
		const initialFormAction = await runtime.resolveNextAction({ taskState })

		expect(initialFormAction.kind).to.equal("render_workflow_form")

		await submitActiveWorkflowFormPanel(taskState)
		expect((taskState.activeWorkflowFormSession as any)?.panelId).to.equal("panel-2")

		await submitActiveWorkflowFormPanel(taskState)
		const terminalPendingAction = await runtime.resolveNextAction({ taskState })
		const terminalSuccessResult = await runtime.handleDeterministicToolResult({
			taskState,
			toolResultText: "ok",
		})

		expect(terminalPendingAction.kind).to.equal("run_deterministic_operation")
		expect(taskState.suppressedWorkflowFormResolverIds).to.deep.equal([terminalFormId])
		expect(terminalSuccessResult.kind).to.equal("project_prompt")

		const deterministicFormId = "form-deterministic"
		const deterministicWorkflow = createWorkflowDefinition({
			workflowForms: {
				[deterministicFormId]: createWorkflowFormDefinitionPayload({ deterministic: true }),
			},
			steps: {
				"step-1": {
					id: "step-1",
					stepNumber: 1,
					checklistLabel: "Step 1",
					allowWorkflowProgressRequest: true,
					workflowFormId: deterministicFormId,
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
				"step-2": {
					id: "step-2",
					stepNumber: 2,
					checklistLabel: "Step 2",
					allowWorkflowProgressRequest: true,
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
			},
		})

		const falsyRestoreState = new TaskState()
		await runtime.activateWorkflow({ taskState: falsyRestoreState, workflow: deterministicWorkflow })
		await runtime.resolveNextAction({ taskState: falsyRestoreState })
		await submitNewProjectSelection(falsyRestoreState, "Falsy Restore Project")
		await runtime.resolveNextAction({ taskState: falsyRestoreState })
		await submitActiveWorkflowFormPanel(falsyRestoreState)
		await submitActiveWorkflowFormPanel(falsyRestoreState)
		expect((await runtime.resolveNextAction({ taskState: falsyRestoreState })).kind).to.equal("run_deterministic_operation")

		await runtime.handleDeterministicToolResult({ taskState: falsyRestoreState })

		expect((await runtime.resolveNextAction({ taskState: falsyRestoreState })).kind).to.equal("render_workflow_form")
		expect((falsyRestoreState.activeWorkflowFormSession as any)?.panelId).to.equal("panel-2")

		const errorRestoreState = new TaskState()
		await runtime.activateWorkflow({ taskState: errorRestoreState, workflow: deterministicWorkflow })
		await runtime.resolveNextAction({ taskState: errorRestoreState })
		await submitNewProjectSelection(errorRestoreState, "Error Restore Project")
		await runtime.resolveNextAction({ taskState: errorRestoreState })
		await submitActiveWorkflowFormPanel(errorRestoreState)
		await submitActiveWorkflowFormPanel(errorRestoreState)
		expect((await runtime.resolveNextAction({ taskState: errorRestoreState })).kind).to.equal("run_deterministic_operation")

		await runtime.handleDeterministicToolResult({
			taskState: errorRestoreState,
			toolResultText: "Error: failure",
		})

		expect((await runtime.resolveNextAction({ taskState: errorRestoreState })).kind).to.equal("render_workflow_form")
		expect((errorRestoreState.activeWorkflowFormSession as any)?.panelId).to.equal("panel-2")

		const nextPanelState = new TaskState()
		await runtime.activateWorkflow({ taskState: nextPanelState, workflow: deterministicWorkflow })
		await runtime.resolveNextAction({ taskState: nextPanelState })
		await submitNewProjectSelection(nextPanelState, "Next Panel Project")
		await runtime.resolveNextAction({ taskState: nextPanelState })
		await submitActiveWorkflowFormPanel(nextPanelState)
		await submitActiveWorkflowFormPanel(nextPanelState)
		expect((await runtime.resolveNextAction({ taskState: nextPanelState })).kind).to.equal("run_deterministic_operation")

		await runtime.handleDeterministicToolResult({
			taskState: nextPanelState,
			toolResultText: "ok",
		})

		expect((nextPanelState.activeWorkflowFormSession as any)?.panelId).to.equal("panel-3")
		expect((await runtime.resolveNextAction({ taskState: nextPanelState })).kind).to.equal("render_workflow_form")
	})

	it("runs deterministic step-resolution definitions and handles success and failure outcomes", async () => {
		const successWorkflow = createWorkflowDefinition({
			stepResolutionDefinitions: {
				"step-resolution-1": createStepResolutionDefinition(),
			},
			steps: {
				"step-1": {
					id: "step-1",
					stepNumber: 1,
					checklistLabel: "Step 1",
					allowWorkflowProgressRequest: true,
					stepResolutionDefinitionId: "step-resolution-1",
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
				"step-2": {
					id: "step-2",
					stepNumber: 2,
					checklistLabel: "Step 2",
					allowWorkflowProgressRequest: true,
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
			},
		})

		await runtime.activateWorkflow({ taskState, workflow: successWorkflow })
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Step Resolution Project")
		const deterministicAction = await runtime.resolveNextAction({ taskState })
		const successResult = await runtime.handleDeterministicToolResult({
			taskState,
			toolResultText: "ok",
		})

		expect(deterministicAction.kind).to.equal("run_deterministic_operation")
		expect((taskState.activeWorkflowSession as any)?.activeStepNumber).to.equal(2)
		expect(taskState.suppressedWorkflowStepResolutionDefinitionIds).to.deep.equal(["step-resolution-1"])
		expect(successResult.kind).to.equal("project_prompt")

		const fallbackWorkflow = createWorkflowDefinition({
			stepResolutionDefinitions: {
				"step-resolution-1": createStepResolutionDefinition({
					shouldSucceed: false,
					fallbackToAgent: true,
				}),
			},
			steps: {
				"step-1": {
					id: "step-1",
					stepNumber: 1,
					checklistLabel: "Step 1",
					allowWorkflowProgressRequest: true,
					stepResolutionDefinitionId: "step-resolution-1",
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
				"step-2": {
					id: "step-2",
					stepNumber: 2,
					checklistLabel: "Step 2",
					allowWorkflowProgressRequest: true,
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
			},
		})
		const fallbackState = new TaskState()
		await runtime.activateWorkflow({ taskState: fallbackState, workflow: fallbackWorkflow })
		await runtime.resolveNextAction({ taskState: fallbackState })
		await submitNewProjectSelection(fallbackState, "Fallback Project")
		expect((await runtime.resolveNextAction({ taskState: fallbackState })).kind).to.equal("run_deterministic_operation")
		const fallbackResult = await runtime.handleDeterministicToolResult({
			taskState: fallbackState,
			toolResultText: "ok",
		})

		expect((fallbackState.activeWorkflowSession as any)?.activeStepNumber).to.equal(1)
		expect(fallbackState.suppressedWorkflowStepResolutionDefinitionIds).to.deep.equal(["step-resolution-1"])
		expect(fallbackResult.kind).to.equal("project_prompt")

		const failureWorkflow = createWorkflowDefinition({
			stepResolutionDefinitions: {
				"step-resolution-1": createStepResolutionDefinition({
					shouldSucceed: false,
				}),
			},
			steps: {
				"step-1": {
					id: "step-1",
					stepNumber: 1,
					checklistLabel: "Step 1",
					allowWorkflowProgressRequest: true,
					stepResolutionDefinitionId: "step-resolution-1",
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
				"step-2": {
					id: "step-2",
					stepNumber: 2,
					checklistLabel: "Step 2",
					allowWorkflowProgressRequest: true,
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
			},
		})
		const failureState = new TaskState()
		await runtime.activateWorkflow({ taskState: failureState, workflow: failureWorkflow })
		await runtime.resolveNextAction({ taskState: failureState })
		await submitNewProjectSelection(failureState, "Failure Project")
		expect((await runtime.resolveNextAction({ taskState: failureState })).kind).to.equal("run_deterministic_operation")
		const failureResult = await runtime.handleDeterministicToolResult({
			taskState: failureState,
			toolResultText: "ok",
		})

		expect((failureState.activeWorkflowSession as any)?.activeStepNumber).to.equal(1)
		expect(failureState.suppressedWorkflowStepResolutionDefinitionIds).to.deep.equal(["step-resolution-1"])
		expect(failureResult.kind).to.equal("project_prompt")
	})

	it("gates workflow progress requests on project selection and active-step settings", async () => {
		const allowedWorkflow = createWorkflowDefinition()

		await runtime.activateWorkflow({ taskState, workflow: allowedWorkflow })

		expect(runtime.isWorkflowProgressRequestAllowed({ taskState })).to.equal(false)

		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Allowed Progress Project")

		expect(runtime.isWorkflowProgressRequestAllowed({ taskState })).to.equal(true)

		const disallowedWorkflow = createWorkflowDefinition({
			steps: {
				"step-1": {
					id: "step-1",
					stepNumber: 1,
					checklistLabel: "Step 1",
					allowWorkflowProgressRequest: false,
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
				"step-2": {
					id: "step-2",
					stepNumber: 2,
					checklistLabel: "Step 2",
					allowWorkflowProgressRequest: true,
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
			},
		})
		const disallowedState = new TaskState()
		await runtime.activateWorkflow({ taskState: disallowedState, workflow: disallowedWorkflow })
		await runtime.resolveNextAction({ taskState: disallowedState })
		await submitNewProjectSelection(disallowedState, "Disallowed Progress Project")

		expect(runtime.isWorkflowProgressRequestAllowed({ taskState: disallowedState })).to.equal(false)

		const rejectedProgress = await runtime.submitWorkflowProgressRequest({
			taskState,
			approved: false,
		})

		expect(rejectedProgress).to.deep.equal({ kind: "no_op" })

		;(taskState as any).suppressedWorkflowFormResolverIds = ["form-1"]
		;(taskState as any).suppressedWorkflowStepResolutionDefinitionIds = ["step-resolution-1"]

		const approvedProgress = await runtime.submitWorkflowProgressRequest({
			taskState,
			approved: true,
		})

		expect((taskState.activeWorkflowSession as any)?.activeStepNumber).to.equal(2)
		expect(taskState.suppressedWorkflowFormResolverIds).to.deep.equal([])
		expect(taskState.suppressedWorkflowStepResolutionDefinitionIds).to.deep.equal([])
		expect(approvedProgress.kind).to.equal("project_prompt")
	})

	it("applies workflow value writes only for allowed keys and trims stored values", async () => {
		const writableWorkflow = createWorkflowDefinition({
			steps: {
				"step-1": {
					id: "step-1",
					stepNumber: 1,
					checklistLabel: "Step 1",
					allowWorkflowProgressRequest: true,
					setWorkflowValuesToolOverride: createAllowedValueWriteOverride({
						allowedKeys: ["alpha", "beta"],
					}),
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
				"step-2": {
					id: "step-2",
					stepNumber: 2,
					checklistLabel: "Step 2",
					allowWorkflowProgressRequest: true,
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
			},
		})
		await runtime.activateWorkflow({ taskState, workflow: writableWorkflow })
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Writable Project")

		const attemptedValues: WorkflowValues = {
			alpha: "  one  ",
			gamma: "  no  ",
		}
		const firstWrite = await runtime.applyWorkflowValueWrites({
			taskState,
			values: attemptedValues,
		})
		const secondWrite = await runtime.applyWorkflowValueWrites({
			taskState,
			values: {
				alpha: " one ",
			},
		})

		expect((taskState.activeWorkflowSession as any)?.workflowValues).to.deep.include({ alpha: "one" })
		expect((firstWrite as any).changedValues).to.deep.equal({ alpha: "one" })
		expect((firstWrite as any).unchangedValues).to.deep.equal({ gamma: "no" })
		expect((secondWrite as any).changedValues).to.deep.equal({})
		expect((secondWrite as any).unchangedValues).to.deep.equal({ alpha: "one" })

		const noOverrideState = new TaskState()
		const noOverrideWorkflow = createWorkflowDefinition()
		await runtime.activateWorkflow({ taskState: noOverrideState, workflow: noOverrideWorkflow })
		await runtime.resolveNextAction({ taskState: noOverrideState })
		await submitNewProjectSelection(noOverrideState, "No Override Project")
		const noOverrideWrite = await runtime.applyWorkflowValueWrites({
			taskState: noOverrideState,
			values: {
				alpha: "  blocked  ",
			},
		})

		expect((noOverrideWrite as any).changedValues).to.deep.equal({})
		expect((noOverrideWrite as any).unchangedValues).to.deep.equal({ alpha: "blocked" })
		expect((noOverrideState.activeWorkflowSession as any)?.workflowValues ?? {}).to.not.have.property("alpha")
	})

	it("deep-clones persisted sessions and restores only valid persisted workflow state", async () => {
		const workflow = createWorkflowDefinition()
		registerResolvedWorkflow(workflow)

		await runtime.activateWorkflow({ taskState, workflow })
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Persisted Project")

		const persistedSession = runtime.getPersistedSession({ taskState })
		expect(persistedSession).to.deep.equal(taskState.activeWorkflowSession)
		expect(persistedSession).to.not.equal(taskState.activeWorkflowSession)

		;(persistedSession as any).projectSelection.projectTitle = "Mutated Persisted Title"
		expect((taskState.activeWorkflowSession as any)?.projectSelection?.projectTitle).to.equal("Persisted Project")

		const undefinedRestore = await runtime.restorePersistedSession({
			taskState: new TaskState(),
			persistedSession: undefined,
		})

		expect(undefinedRestore).to.be.undefined

		const missingWorkflowState = new TaskState()
		resolveWorkflowDefinitionStub.returns(undefined)
		const missingWorkflowRestore = await runtime.restorePersistedSession({
			taskState: missingWorkflowState,
			persistedSession,
		})

		expect(missingWorkflowRestore).to.be.undefined
		expect(missingWorkflowState.activeWorkflowName).to.be.undefined
		expect(missingWorkflowState.activeWorkflowSession).to.be.undefined

		registerResolvedWorkflow(workflow)
		const invalidStepSession = runtime.getPersistedSession({ taskState }) as ActiveWorkflowSession
		;(invalidStepSession as any).activeStepNumber = 999
		const invalidStepState = new TaskState()
		const invalidStepRestore = await runtime.restorePersistedSession({
			taskState: invalidStepState,
			persistedSession: invalidStepSession,
		})

		expect(invalidStepRestore).to.be.undefined
		expect(invalidStepState.activeWorkflowName).to.be.undefined
		expect(invalidStepState.activeWorkflowSession).to.be.undefined

		registerResolvedWorkflow(workflow)
		const validPersistedSession = runtime.getPersistedSession({ taskState }) as ActiveWorkflowSession
		const restoredState = new TaskState()
		const restored = await runtime.restorePersistedSession({
			taskState: restoredState,
			persistedSession: validPersistedSession,
		})

		expect(restored?.kind).to.equal("project_prompt")
		expect(restoredState.activeWorkflowName).to.equal(workflow.name)
		expect(restoredState.activeWorkflowSession).to.deep.equal(validPersistedSession)
	})

	it("completes workflows when completion rules pass and tears down all runtime-owned state", async () => {
		const completionWorkflow = createWorkflowDefinition({
			steps: {
				"step-1": {
					id: "step-1",
					stepNumber: 1,
					checklistLabel: "Step 1",
					allowWorkflowProgressRequest: true,
					completionRules: [
						{
							id: "complete-now",
							isComplete: (_session: ActiveWorkflowSession) => true,
						},
					],
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
				"step-2": {
					id: "step-2",
					stepNumber: 2,
					checklistLabel: "Step 2",
					allowWorkflowProgressRequest: true,
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
			},
		})

		await runtime.activateWorkflow({ taskState, workflow: completionWorkflow })
		await runtime.resolveNextAction({ taskState })
		await submitNewProjectSelection(taskState, "Completion Project")
		const completionResult = await runtime.resolveNextAction({ taskState })

		expect(completionResult.kind).to.equal("complete_workflow")

		const teardownState = new TaskState()
		await runtime.activateWorkflow({ taskState: teardownState, workflow: createWorkflowDefinition() })
		;(teardownState as any).activeWorkflowFormSession = { sessionId: "form-session" }
		;(teardownState as any).activeWorkflowStepResolutionSession = { id: "step-resolution-session" }
		;(teardownState as any).suppressedWorkflowFormResolverIds = ["form-1"]
		;(teardownState as any).suppressedWorkflowStepResolutionDefinitionIds = ["step-resolution-1"]
		;(teardownState as any).currentFocusChainChecklist = [{ label: "checklist" }]

		await runtime.teardownWorkflow({ taskState: teardownState })

		expect(teardownState.activeWorkflowName).to.be.undefined
		expect(teardownState.activeWorkflowSession).to.be.undefined
		expect(teardownState.activeWorkflowStartCardSession).to.be.undefined
		expect(teardownState.activeWorkflowFormSession).to.be.undefined
		expect(teardownState.activeWorkflowStepResolutionSession).to.be.undefined
		expect(teardownState.suppressedWorkflowFormResolverIds).to.deep.equal([])
		expect(teardownState.suppressedWorkflowStepResolutionDefinitionIds).to.deep.equal([])
		expect(teardownState.currentFocusChainChecklist).to.be.undefined

		const pendingFormWorkflow = createWorkflowDefinition({
			workflowForms: {
				"form-1": createWorkflowFormDefinitionPayload({ deterministic: true }),
			},
			steps: {
				"step-1": {
					id: "step-1",
					stepNumber: 1,
					checklistLabel: "Step 1",
					allowWorkflowProgressRequest: true,
					workflowFormId: "form-1",
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
				"step-2": {
					id: "step-2",
					stepNumber: 2,
					checklistLabel: "Step 2",
					allowWorkflowProgressRequest: true,
					buildPromptProjection: () => ({
						workflowSystemInstructionsBlock: "system",
						workflowInputInstructionsBlock: "input",
					}),
				} as WorkflowStepDefinition,
			},
		})
		const pendingFormState = new TaskState()
		await runtime.activateWorkflow({ taskState: pendingFormState, workflow: pendingFormWorkflow })
		await runtime.resolveNextAction({ taskState: pendingFormState })
		await submitNewProjectSelection(pendingFormState, "Pending Form Project")
		await runtime.resolveNextAction({ taskState: pendingFormState })
		await submitActiveWorkflowFormPanel(pendingFormState)
		await submitActiveWorkflowFormPanel(pendingFormState)
		expect((await runtime.resolveNextAction({ taskState: pendingFormState })).kind).to.equal("run_deterministic_operation")

		await runtime.teardownWorkflow({ taskState: pendingFormState })

		expect(await runtime.resolveNextAction({ taskState: pendingFormState })).to.deep.equal({
			kind: "no_op",
		})
	})
})
