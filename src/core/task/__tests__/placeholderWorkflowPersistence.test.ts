import * as disk from "@core/storage/disk"
import type { ClineWorkflowForm } from "@shared/ExtensionMessage"
import { expect } from "chai"
import { describe, it } from "mocha"
import sinon from "sinon"
import { Task } from "../index"
import { TaskState } from "../TaskState"
import type { WorkflowFormSessionState } from "../workflow-form/types"

type TaskMethod<Args extends unknown[], Result> = (this: Record<string, unknown>, ...args: Args) => Result

const restoreBmadStateFromMetadata = Reflect.get(Task.prototype, "restoreBmadStateFromMetadata") as TaskMethod<[], Promise<void>>
const persistWorkflowFormSession = Reflect.get(Task.prototype, "persistWorkflowFormSession") as TaskMethod<[], Promise<void>>
const maybeResolveWorkflowFormBeforeApiTurn = Reflect.get(Task.prototype, "maybeResolveWorkflowFormBeforeApiTurn") as TaskMethod<
	[unknown?],
	Promise<void>
>

function createDefinitionPayload() {
	return {
		definitionVersion: 2,
		title: "Workflow Form V2",
		toolDictionaryTitle: "Workflow Dictionary",
		toolDictionaryMarkdown: "## workflow_form",
		firstPanelId: "preview",
		panels: {
			preview: {
				panelId: "preview",
				title: "Preview",
				promptMarkdown: "Resume the workflow form.",
				fields: [],
				allowedActions: ["submit", "cancel"],
				transition: {
					type: "deterministic_operation" as const,
					operationId: "persist",
					terminal: true,
				},
			},
		},
	}
}

function createBrainstormingStep4DefinitionPayload() {
	return {
		definitionVersion: 2,
		title: "Choose Brainstorming Approach",
		toolDictionaryTitle: "Brainstorming Technique Reference",
		toolDictionaryMarkdown: "## Brainstorming Technique Selection",
		firstPanelId: "approach_selection",
		panels: {
			approach_selection: {
				panelId: "approach_selection",
				title: "Choose Approach",
				promptMarkdown: "Choose the brainstorming technique path.",
				fields: [],
				allowedActions: ["submit", "cancel"],
				transition: {
					type: "deterministic_operation" as const,
					operationId: "persist_brainstorming_approach",
					terminal: false,
					rebuildDefinitionAfterSuccess: true,
					recomputeDestinationAfterSuccess: true,
				},
			},
			random_preview: {
				panelId: "random_preview",
				title: "Random Technique Preview",
				promptMarkdown: "Review the random technique.",
				fields: [
					{
						key: "random_preview_name",
						kind: "markdown_display" as const,
						label: "Technique Name",
						required: false,
						contentMarkdown: "### Reverse Brainstorming",
					},
					{
						key: "random_preview_description",
						kind: "markdown_display" as const,
						label: "Technique Description",
						required: false,
						contentMarkdown: "Generate problems first.",
					},
				],
				allowedActions: ["submit", "cancel", "back"],
				transition: {
					type: "deterministic_operation" as const,
					operationId: "persist_brainstorming_technique",
					terminal: true,
				},
				backDestinationPanelId: "approach_selection",
				backStaleDataKeysToClear: ["random_preview"],
			},
		},
	}
}

function createWorkflowFormSession(overrides: Partial<WorkflowFormSessionState> = {}): WorkflowFormSessionState {
	return {
		sessionId: "workflow-form-session",
		resolverId: "code_review_step_3_diff_source",
		triggerSource: "deterministic_workflow_progression",
		owner: {
			kind: "placeholder_workflow_step",
			workflowName: "code-review.md",
			stepNumber: 2,
		},
		definitionVersion: 2,
		definitionPayload: createDefinitionPayload(),
		firstPanelId: "preview",
		currentPanelId: "preview",
		values: {
			"source.type": {
				valueType: "string",
				stringValue: "commit",
			},
		},
		data: {},
		...overrides,
	}
}

function createFakeTask() {
	return {
		taskId: "task-placeholder-persistence",
		cwd: process.cwd(),
		taskState: new TaskState(),
		pendingWorkflowFormOutcome: undefined,
		messageStateHandler: {
			getClineMessages: sinon.stub().returns([]),
		},
		workflowFormRuntime: {
			createSession: sinon.stub(),
			buildPayload: sinon.stub(),
			buildSuccessPayload: sinon.stub(),
			continueAfterDeterministicOperation: sinon.stub(),
		},
		persistWorkflowFormSession: sinon.stub().resolves(),
		renderWorkflowFormMessage: sinon.stub().resolves(),
		setThreadDisplayState: sinon.stub(),
		postStateToWebview: sinon.stub().resolves(),
		say: sinon.stub().resolves(),
		abort: false,
	} as Record<string, unknown>
}

function createPayloadFromSession(session: WorkflowFormSessionState): ClineWorkflowForm {
	return {
		sessionId: session.sessionId,
		resolverId: session.resolverId,
		title: session.definitionPayload.title,
		toolDictionaryTitle: session.definitionPayload.toolDictionaryTitle,
		toolDictionaryMarkdown: session.definitionPayload.toolDictionaryMarkdown,
		renderState: "panel",
		panel: {
			panelId: session.currentPanelId,
			title: session.definitionPayload.panels[session.currentPanelId].title,
			promptMarkdown: session.definitionPayload.panels[session.currentPanelId].promptMarkdown,
			fields: [],
			allowedActions: ["submit", "cancel"],
		},
		values: session.values,
	}
}

describe("placeholder workflow persistence", () => {
	let getTaskMetadataStub: sinon.SinonStub
	let saveTaskMetadataStub: sinon.SinonStub

	beforeEach(() => {
		getTaskMetadataStub = sinon.stub(disk, "getTaskMetadata")
		saveTaskMetadataStub = sinon.stub(disk, "saveTaskMetadata").resolves()
	})

	afterEach(() => {
		sinon.restore()
	})

	it("restores an active V2 workflow-form session", async () => {
		const session = createWorkflowFormSession()
		const fakeTask = createFakeTask()

		getTaskMetadataStub.resolves({
			files_in_context: [],
			model_usage: [],
			environment_history: [],
			activeWorkflowFormSession: session,
			suppressedWorkflowFormResolverIds: ["code_review_step_3_diff_source"],
		})

		await restoreBmadStateFromMetadata.call(fakeTask)

		expect(fakeTask.taskState.activeWorkflowFormSession).to.deep.equal(session)
		expect(fakeTask.taskState.suppressedWorkflowFormResolverIds).to.deep.equal(["code_review_step_3_diff_source"])
		expect(saveTaskMetadataStub.called).to.equal(false)
	})

	it("restores a non-V2 workflow-form session by clearing and persisting it", async () => {
		const fakeTask = createFakeTask()

		getTaskMetadataStub.resolves({
			files_in_context: [],
			model_usage: [],
			environment_history: [],
			activeWorkflowFormSession: {
				sessionId: "legacy-session",
				resolverId: "code_review_step_3_diff_source",
				phase: "confirm",
			},
			suppressedWorkflowFormResolverIds: [],
		})

		await restoreBmadStateFromMetadata.call(fakeTask)

		expect(fakeTask.taskState.activeWorkflowFormSession).to.equal(undefined)
		sinon.assert.calledOnce(saveTaskMetadataStub)
		expect(saveTaskMetadataStub.firstCall.args[1].activeWorkflowFormSession).to.equal(undefined)
	})

	it("rejects a would-be V2 session that lacks the persisted definitionPayload", async () => {
		const fakeTask = createFakeTask()

		getTaskMetadataStub.resolves({
			files_in_context: [],
			model_usage: [],
			environment_history: [],
			activeWorkflowFormSession: {
				sessionId: "broken-v2-session",
				resolverId: "code_review_step_3_diff_source",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 2,
				},
				definitionVersion: 2,
				firstPanelId: "preview",
				currentPanelId: "preview",
				values: {},
				data: {},
			},
			suppressedWorkflowFormResolverIds: [],
		})

		await restoreBmadStateFromMetadata.call(fakeTask)

		expect(fakeTask.taskState.activeWorkflowFormSession).to.equal(undefined)
		sinon.assert.calledOnce(saveTaskMetadataStub)
		expect(saveTaskMetadataStub.firstCall.args[1].activeWorkflowFormSession).to.equal(undefined)
	})

	it("persists an active V2 workflow-form session", async () => {
		const session = createWorkflowFormSession()
		const fakeTask = createFakeTask()
		fakeTask.taskState.activeWorkflowFormSession = session
		fakeTask.taskState.suppressedWorkflowFormResolverIds = ["code_review_step_3_diff_source"]

		getTaskMetadataStub.resolves({
			files_in_context: [],
			model_usage: [],
			environment_history: [],
		})

		await persistWorkflowFormSession.call(fakeTask)

		sinon.assert.calledOnce(saveTaskMetadataStub)
		expect(saveTaskMetadataStub.firstCall.args[1].activeWorkflowFormSession).to.deep.equal(session)
		expect(saveTaskMetadataStub.firstCall.args[1].suppressedWorkflowFormResolverIds).to.deep.equal([
			"code_review_step_3_diff_source",
		])
	})

	it("resumes a V2 session that already contains non-terminal deterministic-operation-produced session data", async () => {
		const session = createWorkflowFormSession({
			data: {
				selected_preview: {
					valueType: "object",
					objectValue: [
						{
							key: "name",
							value: {
								valueType: "string",
								stringValue: "review-input.diff",
							},
						},
					],
				},
			},
		})
		const payload = createPayloadFromSession(session)
		const fakeTask = createFakeTask()
		fakeTask.taskState.activeWorkflowFormSession = session
		fakeTask.workflowFormRuntime.buildPayload = sinon.stub().callsFake((activeSession: WorkflowFormSessionState) => {
			expect(activeSession.data).to.deep.equal(session.data)
			return payload
		})
		fakeTask.renderWorkflowFormMessage = sinon.stub().callsFake(async (renderedPayload: ClineWorkflowForm) => {
			expect(renderedPayload.values).to.deep.equal(session.values)
			fakeTask.taskState.abort = true
		})

		await maybeResolveWorkflowFormBeforeApiTurn.call(fakeTask, undefined)

		sinon.assert.calledOnce(fakeTask.workflowFormRuntime.buildPayload as sinon.SinonStub)
		sinon.assert.notCalled(fakeTask.workflowFormRuntime.continueAfterDeterministicOperation as sinon.SinonStub)
		sinon.assert.calledOnce(fakeTask.renderWorkflowFormMessage as sinon.SinonStub)
	})

	it("resumes a Brainstorming Step 4 V2 session that already contains random-technique operation data", async () => {
		const session = createWorkflowFormSession({
			resolverId: "brainstorming_step_4_choose_approach",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "brainstorming.md",
				stepNumber: 4,
			},
			definitionPayload: createBrainstormingStep4DefinitionPayload(),
			currentPanelId: "random_preview",
			data: {
				random_preview: {
					technique_name: "Reverse Brainstorming",
					technique_description: "Generate problems first.",
					technique_category: "creative",
				},
			},
		})
		const payload = createPayloadFromSession(session)
		const fakeTask = createFakeTask()
		fakeTask.taskState.activeWorkflowFormSession = session
		fakeTask.workflowFormRuntime.buildPayload = sinon.stub().callsFake((activeSession: WorkflowFormSessionState) => {
			expect(activeSession.currentPanelId).to.equal("random_preview")
			expect(activeSession.data.random_preview).to.deep.equal(session.data.random_preview)
			return payload
		})
		fakeTask.renderWorkflowFormMessage = sinon.stub().callsFake(async (renderedPayload: ClineWorkflowForm) => {
			expect(renderedPayload.panel?.panelId).to.equal("random_preview")
			fakeTask.taskState.abort = true
		})

		await maybeResolveWorkflowFormBeforeApiTurn.call(fakeTask, undefined)

		sinon.assert.calledOnce(fakeTask.workflowFormRuntime.buildPayload as sinon.SinonStub)
		sinon.assert.notCalled(fakeTask.workflowFormRuntime.continueAfterDeterministicOperation as sinon.SinonStub)
		sinon.assert.calledOnce(fakeTask.renderWorkflowFormMessage as sinon.SinonStub)
	})
})
