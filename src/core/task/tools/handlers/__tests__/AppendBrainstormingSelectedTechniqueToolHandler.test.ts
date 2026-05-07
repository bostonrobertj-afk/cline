import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { expect } from "chai"
import { describe, it } from "mocha"
import sinon from "sinon"
import { TaskState } from "@/core/task/TaskState"
import type { ActiveWorkflowSession, WorkflowValues } from "@/core/task/workflow-runtime/types"
import {
	BRAINSTORMING_TECHNIQUES,
	type BrainstormingTechnique,
} from "@/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingTechniqueRegistry"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../.."
import type { TaskConfig } from "../../types/TaskConfig"
import { validateTaskConfig } from "../../types/TaskConfig"
import { AppendBrainstormingSelectedTechniqueToolHandler } from "../AppendBrainstormingSelectedTechniqueToolHandler"

interface AppendBrainstormingSelectedTechniqueTestConfig {
	config: TaskConfig
	stubs: {
		applyWorkflowValueWrites: sinon.SinonStub
		resolveNextAction: sinon.SinonStub
		queueWorkflowNextAction: sinon.SinonStub
	}
}

function createAppendBrainstormingSelectedTechniqueBlock(parameters: Record<string, string>): ToolUse {
	const params: ToolUse["params"] = {}
	Object.assign(params, parameters)

	return {
		type: "tool_use",
		name: ClineDefaultTool.APPEND_BRAINSTORMING_SELECTED_TECHNIQUE,
		params,
		partial: false,
		isNativeToolCall: true,
		call_id: "append_brainstorming_selected_technique_1",
	}
}

function createBrainstormingSession(workflowValues: WorkflowValues): ActiveWorkflowSession {
	return {
		activeStepNumber: 3,
		workflowValues,
		projectSelection: {
			projectMode: "new",
			projectTitle: "Project One",
			projectFolderName: "project-one",
		},
		entryArtifactResolution: undefined,
		ui: {
			formSession: undefined,
			stepResolutionSession: undefined,
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext: {
			activeBranchId: "project_prompt",
		},
	}
}

function getTechnique(name: string): BrainstormingTechnique {
	const technique = BRAINSTORMING_TECHNIQUES.find((entry) => entry.name === name)
	if (technique === undefined) {
		throw new Error(`Missing expected brainstorming technique fixture: ${name}`)
	}

	return technique
}

function stableStringify(value: unknown): string {
	return JSON.stringify(value)
}

function createApplyWorkflowValueWritesStub(session: ActiveWorkflowSession | undefined): sinon.SinonStub {
	if (session === undefined) {
		return sinon.stub().resolves({
			changedValues: {},
			unchangedValues: {},
		})
	}

	return sinon
		.stub()
		.callsFake(
			async (args: {
				taskState: TaskState
				values: WorkflowValues
			}): Promise<{ changedValues: WorkflowValues; unchangedValues: WorkflowValues }> => {
				const changedValues: WorkflowValues = {}
				const unchangedValues: WorkflowValues = {}

				for (const [key, value] of Object.entries(args.values)) {
					const existingValue = session.workflowValues[key]
					if (existingValue !== undefined && stableStringify(existingValue) === stableStringify(value)) {
						unchangedValues[key] = value
						continue
					}

					session.workflowValues[key] = value
					changedValues[key] = value
				}

				return {
					changedValues,
					unchangedValues,
				}
			},
		)
}

function createConfig(
	workflowName: string | undefined,
	session: ActiveWorkflowSession | undefined,
): AppendBrainstormingSelectedTechniqueTestConfig {
	const taskState = new TaskState()
	if (workflowName !== undefined) {
		taskState.activeWorkflowName = workflowName
	}
	if (session !== undefined) {
		taskState.activeWorkflowSession = session
	}

	const applyWorkflowValueWrites = createApplyWorkflowValueWritesStub(session)
	const resolveNextAction = sinon.stub().resolves({ kind: "project_prompt", promptProjection: {} })
	const queueWorkflowNextAction = sinon.stub()
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		ask: sinon.stub().resolves({ response: "yesButtonClicked" }),
		saveCheckpoint: sinon.stub().resolves(),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
		removeLastPartialMessageIfExistsWithType: sinon.stub().resolves(),
		upsertPartialResponseToolSayPreview: sinon.stub().resolves(false),
		clearPartialResponseToolPreview: sinon.stub().resolves(false),
		executeCommandTool: sinon.stub().resolves([false, "ok"]),
		cancelRunningCommandTool: sinon.stub().resolves(false),
		doesLatestTaskCompletionHaveNewChanges: sinon.stub().resolves(false),
		updateFCListFromToolResponse: sinon.stub().resolves({ accepted: true }),
		queueWorkflowNextAction,
		shouldAutoApproveTool: sinon.stub().returns([false, false]),
		shouldAutoApproveToolWithPath: sinon.stub().resolves(false),
		postStateToWebview: sinon.stub().resolves(),
		reinitExistingTaskFromId: sinon.stub().resolves(),
		cancelTask: sinon.stub().resolves(),
		updateTaskHistory: sinon.stub().resolves([]),
		applyLatestBrowserSettings: sinon.stub().resolves(undefined),
		switchToActMode: sinon.stub().resolves(false),
		setActiveHookExecution: sinon.stub().resolves(),
		clearActiveHookExecution: sinon.stub().resolves(),
		getActiveHookExecution: sinon.stub().resolves(undefined),
		runUserPromptSubmitHook: sinon.stub().resolves({}),
	}
	const config = {
		taskId: "task-1",
		ulid: "ulid-1",
		cwd: "/tmp",
		mode: "act",
		strictPlanModeEnabled: false,
		yoloModeToggled: false,
		doubleCheckCompletionEnabled: false,
		vscodeTerminalExecutionMode: "backgroundExec",
		enableParallelToolCalling: true,
		isSubagentExecution: true,
		taskState,
		messageState: {
			getClineMessages: () => [],
			saveClineMessagesAndUpdateHistory: sinon.stub().resolves(),
		},
		api: {
			getModel: () => ({ id: "test-model", info: {} }),
		},
		services: {
			mcpHub: {},
			browserSession: {},
			urlContentFetcher: {},
			diffViewProvider: {},
			fileContextTracker: {},
			clineIgnoreController: {},
			commandPermissionController: {},
			contextManager: {},
			stateManager: {
				getGlobalSettingsKey: () => undefined,
			},
		},
		autoApprovalSettings: {
			enableNotifications: false,
			actions: {
				executeSafeCommands: false,
				executeAllCommands: false,
			},
		},
		autoApprover: {
			shouldAutoApproveTool: sinon.stub().returns([false, false]),
		},
		browserSettings: {},
		focusChainSettings: {},
		callbacks,
		workflowRuntime: {
			applyWorkflowValueWrites,
			resolveNextAction,
		},
		coordinator: {
			getHandler: sinon.stub(),
		},
	}
	validateTaskConfig(config)

	return {
		config,
		stubs: {
			applyWorkflowValueWrites,
			resolveNextAction,
			queueWorkflowNextAction,
		},
	}
}

function readStringToolResponse(result: ToolResponse): string {
	if (typeof result === "string") {
		return result
	}

	throw new Error("Expected a string tool response.")
}

describe("AppendBrainstormingSelectedTechniqueToolHandler", () => {
	it("rejects calls unless the brainstorming workflow is active with a session", async () => {
		const handler = new AppendBrainstormingSelectedTechniqueToolHandler()
		const session = createBrainstormingSession({})
		const inactiveWorkflow = createConfig("problem-solving", session)
		const missingSession = createConfig("brainstorming", undefined)
		const block = createAppendBrainstormingSelectedTechniqueBlock({
			name: "Yes And Building",
			description: getTechnique("Yes And Building").description,
		})
		const expectedError = formatResponse.toolError(
			"append_brainstorming_selected_technique can only be used while the brainstorming workflow is active.",
		)

		expect(await handler.execute(inactiveWorkflow.config, block)).to.equal(expectedError)
		expect(await handler.execute(missingSession.config, block)).to.equal(expectedError)
		sinon.assert.notCalled(inactiveWorkflow.stubs.applyWorkflowValueWrites)
		sinon.assert.notCalled(missingSession.stubs.applyWorkflowValueWrites)
	})

	it("rejects missing required parameters before workflow writes", async () => {
		const session = createBrainstormingSession({})
		const { config, stubs } = createConfig("brainstorming", session)
		const handler = new AppendBrainstormingSelectedTechniqueToolHandler()
		const expectedError = formatResponse.toolError(
			"Missing required parameters. Provide non-empty string values for 'name' and 'description'. Optional 'id' and 'category' values must be non-empty strings when provided.",
		)

		const result = await handler.execute(
			config,
			createAppendBrainstormingSelectedTechniqueBlock({
				name: "Yes And Building",
				description: "",
			}),
		)

		expect(result).to.equal(expectedError)
		sinon.assert.notCalled(stubs.applyWorkflowValueWrites)
	})

	it("rejects techniques that do not exist in the registry", async () => {
		const session = createBrainstormingSession({})
		const { config, stubs } = createConfig("brainstorming", session)
		const handler = new AppendBrainstormingSelectedTechniqueToolHandler()

		const result = await handler.execute(
			config,
			createAppendBrainstormingSelectedTechniqueBlock({
				name: "Made Up Technique",
				description: "Not in the registry.",
			}),
		)

		expect(result).to.equal(
			formatResponse.toolError(
				"Unknown brainstorming technique. Provide a technique id or name from get_brainstorming_methods.",
			),
		)
		sinon.assert.notCalled(stubs.applyWorkflowValueWrites)
	})

	it("appends a registry-validated technique without overwriting existing selected techniques", async () => {
		const existingTechnique: WorkflowValues = {
			id: "mind-mapping",
			name: "Mind Mapping",
			category: "Structured",
			description: "Already selected.",
		}
		const session = createBrainstormingSession({
			selected_techniques: [existingTechnique],
		})
		const { config, stubs } = createConfig("brainstorming", session)
		const handler = new AppendBrainstormingSelectedTechniqueToolHandler()
		const acceptedTechnique = getTechnique("Yes And Building")

		const result = await handler.execute(
			config,
			createAppendBrainstormingSelectedTechniqueBlock({
				id: acceptedTechnique.id,
				name: acceptedTechnique.name,
				description: acceptedTechnique.description,
				category: acceptedTechnique.category,
			}),
		)
		const parsedResult: unknown = JSON.parse(readStringToolResponse(result))

		expect(parsedResult).to.deep.equal({
			persisted: true,
			duplicate: false,
			selected_techniques: [
				existingTechnique,
				{
					id: acceptedTechnique.id,
					name: acceptedTechnique.name,
					category: acceptedTechnique.category,
					description: acceptedTechnique.description,
				},
			],
			changed_workflow_value_keys: ["selected_techniques"],
			unchanged_workflow_value_keys: [],
		})
		sinon.assert.calledOnce(stubs.applyWorkflowValueWrites)
		expect(stubs.applyWorkflowValueWrites.firstCall.args[0]).to.deep.equal({
			taskState: config.taskState,
			values: {
				selected_techniques: [
					existingTechnique,
					{
						id: acceptedTechnique.id,
						name: acceptedTechnique.name,
						category: acceptedTechnique.category,
						description: acceptedTechnique.description,
					},
				],
			},
		})
		sinon.assert.calledOnceWithExactly(stubs.resolveNextAction, { taskState: config.taskState })
		sinon.assert.calledOnceWithExactly(stubs.queueWorkflowNextAction, {
			kind: "project_prompt",
			promptProjection: {},
		})
	})

	it("de-dupes by selected technique name without overwriting the existing entry", async () => {
		const existingTechnique: WorkflowValues = {
			name: "Yes And Building",
			description: "Already accepted by the user.",
		}
		const session = createBrainstormingSession({
			selected_techniques: [existingTechnique],
		})
		const { config, stubs } = createConfig("brainstorming", session)
		const handler = new AppendBrainstormingSelectedTechniqueToolHandler()
		const acceptedTechnique = getTechnique("Yes And Building")

		const result = await handler.execute(
			config,
			createAppendBrainstormingSelectedTechniqueBlock({
				name: acceptedTechnique.name,
				description: acceptedTechnique.description,
			}),
		)
		const parsedResult: unknown = JSON.parse(readStringToolResponse(result))

		expect(parsedResult).to.deep.equal({
			persisted: false,
			duplicate: true,
			selected_techniques: [existingTechnique],
			changed_workflow_value_keys: [],
			unchanged_workflow_value_keys: ["selected_techniques"],
		})
		sinon.assert.calledOnce(stubs.applyWorkflowValueWrites)
		expect(stubs.applyWorkflowValueWrites.firstCall.args[0]).to.deep.equal({
			taskState: config.taskState,
			values: {
				selected_techniques: [existingTechnique],
			},
		})
		sinon.assert.notCalled(stubs.resolveNextAction)
		sinon.assert.notCalled(stubs.queueWorkflowNextAction)
	})
})
