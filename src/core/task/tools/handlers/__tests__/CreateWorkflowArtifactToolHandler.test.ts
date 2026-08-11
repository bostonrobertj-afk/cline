import type { ToolUse } from "@core/assistant-message"
import { expect } from "chai"
import { access, mkdtemp, readFile, rm, writeFile } from "fs/promises"
import { afterEach, beforeEach, describe, it } from "mocha"
import { tmpdir } from "os"
import path from "path"
import sinon from "sinon"
import { ClineIgnoreController } from "@/core/ignore/ClineIgnoreController"
import { formatResponse } from "@/core/prompts/responses"
import { TaskState } from "@/core/task/TaskState"
import { WorkflowArtifactFamily } from "@/core/task/workflow-runtime/artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowDefinition,
	WorkflowPersonaDefinition,
	WorkflowStepDefinition,
	WorkflowWorkspacePathPolicy,
} from "@/core/task/workflow-runtime/types"
import * as WorkflowRegistry from "@/core/task/workflow-runtime/WorkflowRegistry"
import type { WorkflowArtifactAllocationOutput } from "@/core/task/workflow-runtime/WorkflowRuntime"
import { WorkflowRuntime } from "@/core/task/workflow-runtime/WorkflowRuntime"
import { ClineDefaultTool } from "@/shared/tools"
import * as pathUtils from "@/utils/path"
import { ToolValidator } from "../../ToolValidator"
import type { TaskConfig } from "../../types/TaskConfig"
import { ToolHookUtils } from "../../utils/ToolHookUtils"
import { CreateWorkflowArtifactToolHandler } from "../CreateWorkflowArtifactToolHandler"

const ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: "entry_project_mode",
	projectTitle: "entry_project_title",
	projectFolderName: "entry_project_folder_name",
}

const WORKFLOW_PERSONA_FIXTURE: WorkflowPersonaDefinition = {
	name: "Workflow Fixture Persona",
	role: "Workflow artifact tester",
	identity: "A test persona for workflow artifact handler fixtures.",
	capabilities: ["workflow artifact testing"],
	communicationStyle: "Concise and deterministic.",
	principles: ["Keep workflow fixture contracts explicit."],
}

function createArtifactBlock(
	overrides?: Partial<Pick<ToolUse, "partial" | "isNativeToolCall" | "call_id">> & { artifactId?: string },
): ToolUse {
	return {
		type: "tool_use",
		name: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
		params: {
			artifact_id: overrides?.artifactId ?? "epic_doc",
		},
		partial: overrides?.partial ?? false,
		isNativeToolCall: overrides?.isNativeToolCall ?? true,
		call_id: overrides?.call_id ?? "workflow_artifact_1",
	}
}

function createAllocation(cwd: string): WorkflowArtifactAllocationOutput {
	const artifactAbsolutePath = path.join(cwd, "project-one", "planning", "Epics.md")
	return {
		artifactId: "epic_doc",
		projectTitle: "Project One",
		projectFolderName: "project-one",
		artifactFamily: "epics",
		artifactIdentity: "epics",
		artifactFilename: "Epics.md",
		artifactRelativePath: path.join("planning", "Epics.md"),
		artifactAbsolutePath,
		parentIdentity: undefined,
		targetIdentity: undefined,
		workflowValueWrites: {
			artifact_project_title: "Project One",
			artifact_project_folder: "project-one",
			artifact_family: "epics",
			artifact_identity: "epics",
			artifact_filename: "Epics.md",
			artifact_relative_path: path.join("planning", "Epics.md"),
			artifact_absolute_path: artifactAbsolutePath,
		},
	}
}

function createToolValidator(cwd: string): ToolValidator {
	return new ToolValidator(new ClineIgnoreController(cwd))
}

function createAllowAllWorkspacePathPolicy(): WorkflowWorkspacePathPolicy {
	return {
		validateAccess: () => true,
	}
}

function createConfig(args?: { cwd?: string; taskState?: TaskState; workflowRuntime?: TaskConfig["workflowRuntime"] }): {
	config: TaskConfig
	stubs: {
		ask: sinon.SinonStub
		prepareWorkflowArtifactCreation: sinon.SinonStub
		createWorkflowArtifact: sinon.SinonStub
		shouldAutoApproveToolWithPath: sinon.SinonStub
	}
	allocation: WorkflowArtifactAllocationOutput
} {
	const cwd = args?.cwd ?? path.join(process.cwd(), "tmp-create-workflow-artifact-test")
	const taskState = args?.taskState ?? new TaskState()
	const allocation = createAllocation(cwd)
	const ask = sinon.stub().resolves({ response: "yesButtonClicked" })
	const prepareWorkflowArtifactCreation = sinon.stub().resolves(allocation)
	const createWorkflowArtifact = sinon.stub().resolves({
		...allocation,
		changedWorkflowValues: allocation.workflowValueWrites,
		unchangedWorkflowValues: {},
	})
	const shouldAutoApproveToolWithPath = sinon.stub().resolves(false)
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		ask,
		saveCheckpoint: sinon.stub().resolves(),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
		removeLastPartialMessageIfExistsWithType: sinon.stub().resolves(),
		upsertPartialResponseToolSayPreview: sinon.stub().resolves(false),
		clearPartialResponseToolPreview: sinon.stub().resolves(false),
		executeCommandTool: sinon.stub().resolves([false, "ok"]),
		cancelRunningCommandTool: sinon.stub().resolves(false),
		doesLatestTaskCompletionHaveNewChanges: sinon.stub().resolves(false),
		updateFCListFromToolResponse: sinon.stub().resolves({ accepted: true }),
		shouldAutoApproveTool: sinon.stub().returns([false, false]),
		shouldAutoApproveToolWithPath,
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
		cwd,
		mode: "act",
		strictPlanModeEnabled: false,
		yoloModeToggled: false,
		doubleCheckCompletionEnabled: false,
		vscodeTerminalExecutionMode: "backgroundExec",
		enableParallelToolCalling: true,
		isSubagentExecution: false,
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
				getGlobalSettingsKey: (key: string) => (key === "hooksEnabled" ? false : undefined),
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
		workflowRuntime: args?.workflowRuntime ?? {
			prepareWorkflowArtifactCreation,
			createWorkflowArtifact,
		},
		coordinator: {
			getHandler: sinon.stub(),
		},
	} as unknown as TaskConfig

	return {
		config,
		stubs: {
			ask,
			prepareWorkflowArtifactCreation,
			createWorkflowArtifact,
			shouldAutoApproveToolWithPath,
		},
		allocation,
	}
}

function createStandaloneArtifactOutputValueKeys(prefix: string) {
	return {
		projectTitle: `${prefix}_project_title`,
		projectFolderName: `${prefix}_project_folder`,
		artifactFamily: `${prefix}_artifact_family`,
		artifactIdentity: `${prefix}_artifact_identity`,
		artifactFilename: `${prefix}_artifact_filename`,
		artifactRelativePath: `${prefix}_artifact_relative_path`,
		artifactAbsolutePath: `${prefix}_artifact_absolute_path`,
		parentIdentity: undefined,
		targetIdentity: undefined,
	}
}

function collectArtifactOutputWorkflowValueKeys(
	outputValueKeys: ReturnType<typeof createStandaloneArtifactOutputValueKeys>,
): string[] {
	return Object.values(outputValueKeys).filter((value): value is string => typeof value === "string")
}

function createWorkflowStepDefinition(): WorkflowStepDefinition {
	return {
		id: "step-1",
		stepNumber: 1,
		checklistLabel: "Step 1",
		promptTemplates: ["input"],
		buildPromptSource: () => ({
			kind: "current_step_instruction_template",
			currentStepInstructionTemplate: "input",
		}),
		buildToolSchema: () => [],
		decisionTree: {
			entryBranchId: "project-prompt",
			branches: {
				"project-prompt": {
					id: "project-prompt",
					routes: [
						{
							id: "project-prompt-route",
							trigger: { kind: "always" },
							action: { kind: "project_prompt" },
						},
					],
				},
			},
		},
	}
}

function createRealArtifactWorkflow(): WorkflowDefinition {
	const artifactOutputKeys = createStandaloneArtifactOutputValueKeys("epic")

	return {
		name: "create-workflow-artifact-real-test",
		displayName: "Create Workflow Artifact Real Test",
		description: "Test workflow for creating a real workflow artifact.",
		slashCommandName: "create-workflow-artifact-real-test",
		useSkillName: "create-workflow-artifact-real-test",
		persona: WORKFLOW_PERSONA_FIXTURE,
		projectSelection: { kind: "interactive" },
		projectOutputPlacement: { kind: "selected_project_subfolder", subfolder: "planning" },
		workflowValueKeys: [
			...Object.values(ENTRY_PROJECT_VALUE_KEYS),
			...collectArtifactOutputWorkflowValueKeys(artifactOutputKeys),
		],
		entryProjectValueKeys: ENTRY_PROJECT_VALUE_KEYS,
		entryPanel: {
			promptMarkdown: "Start this workflow",
		},
		steps: {
			"step-1": createWorkflowStepDefinition(),
		},
		workflowForms: {},
		artifacts: {
			epic_doc: {
				id: "epic_doc",
				family: WorkflowArtifactFamily.Epics,
				intentMode: "new",
				parentIdentitySource: undefined,
				targetIdentitySource: undefined,
				outputValueKeys: artifactOutputKeys,
			},
		},
		childInheritance: [],
	}
}

function createRealBrainstormingArtifactWorkflow(): WorkflowDefinition {
	const artifactOutputKeys = {
		...createStandaloneArtifactOutputValueKeys("brainstorming"),
		artifactAbsolutePath: "output_file",
	}

	return {
		name: "create-workflow-artifact-brainstorming-test",
		displayName: "Create Workflow Artifact Brainstorming Test",
		description: "Test workflow for creating a brainstorming workflow artifact.",
		slashCommandName: "create-workflow-artifact-brainstorming-test",
		useSkillName: "create-workflow-artifact-brainstorming-test",
		persona: WORKFLOW_PERSONA_FIXTURE,
		projectSelection: { kind: "interactive" },
		projectOutputPlacement: { kind: "selected_project_subfolder", subfolder: "discovery" },
		workflowValueKeys: [
			...Object.values(ENTRY_PROJECT_VALUE_KEYS),
			...collectArtifactOutputWorkflowValueKeys(artifactOutputKeys),
		],
		entryProjectValueKeys: ENTRY_PROJECT_VALUE_KEYS,
		entryPanel: {
			promptMarkdown: "Start this workflow",
		},
		steps: {
			"step-1": createWorkflowStepDefinition(),
		},
		workflowForms: {},
		artifacts: {
			brainstorming_session: {
				id: "brainstorming_session",
				family: WorkflowArtifactFamily.BrainstormingSession,
				intentMode: "new",
				parentIdentitySource: undefined,
				targetIdentitySource: undefined,
				outputValueKeys: artifactOutputKeys,
			},
		},
		childInheritance: [],
	}
}

function createRealArchitectureArtifactWorkflow(): WorkflowDefinition {
	const artifactOutputKeys = {
		...createStandaloneArtifactOutputValueKeys("architecture"),
		artifactAbsolutePath: "output_file",
	}

	return {
		name: "create-workflow-artifact-architecture-test",
		displayName: "Create Workflow Artifact Architecture Test",
		description: "Test workflow for creating an architecture workflow artifact.",
		slashCommandName: "create-workflow-artifact-architecture-test",
		useSkillName: "create-workflow-artifact-architecture-test",
		persona: WORKFLOW_PERSONA_FIXTURE,
		projectSelection: { kind: "interactive" },
		projectOutputPlacement: { kind: "selected_project_subfolder", subfolder: "planning" },
		workflowValueKeys: [
			...Object.values(ENTRY_PROJECT_VALUE_KEYS),
			...collectArtifactOutputWorkflowValueKeys(artifactOutputKeys),
		],
		entryProjectValueKeys: ENTRY_PROJECT_VALUE_KEYS,
		entryPanel: {
			promptMarkdown: "Start this workflow",
		},
		steps: {
			"step-1": createWorkflowStepDefinition(),
		},
		workflowForms: {},
		artifacts: {
			architecture_document: {
				id: "architecture_document",
				family: WorkflowArtifactFamily.ArchitectureDocument,
				intentMode: "new",
				parentIdentitySource: undefined,
				targetIdentitySource: undefined,
				outputValueKeys: artifactOutputKeys,
			},
		},
		childInheritance: [],
	}
}

function createActiveWorkflowSession(workflow: WorkflowDefinition): ActiveWorkflowSession {
	return {
		activeStepNumber: 1,
		workflowValues: {},
		projectSelection: {
			projectMode: "new",
			projectTitle: "Real Artifact Project",
			projectFolderName: "real-artifact-project",
		},
		lifecycle: {
			projectSelectionCompleted: true,
		},
		entryArtifactResolution: undefined,
		prerequisiteFileResolutions: [],
		ui: {
			formSession: undefined,
			stepResolutionSession: undefined,
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext: {
			activeBranchId: "project-prompt",
		},
	}
}

describe("CreateWorkflowArtifactToolHandler", () => {
	let sandbox: sinon.SinonSandbox

	beforeEach(() => {
		sandbox = sinon.createSandbox()
		sandbox.stub(pathUtils, "isLocatedInWorkspace").resolves(true)
	})

	afterEach(() => {
		sandbox.restore()
	})

	it("rejects partial blocks before runtime allocation", async () => {
		const { config, stubs } = createConfig()
		const handler = new CreateWorkflowArtifactToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, createArtifactBlock({ partial: true }))

		expect(result).to.contain("partial tool blocks")
		sinon.assert.notCalled(stubs.prepareWorkflowArtifactCreation)
		sinon.assert.notCalled(stubs.createWorkflowArtifact)
	})

	it("executes non-native model-authored calls when workflow state is valid", async () => {
		const { config, stubs, allocation } = createConfig()
		const handler = new CreateWorkflowArtifactToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, createArtifactBlock({ isNativeToolCall: false }))

		sinon.assert.calledOnceWithExactly(stubs.prepareWorkflowArtifactCreation, {
			taskState: config.taskState,
			artifactId: "epic_doc",
		})
		sinon.assert.calledOnceWithExactly(stubs.createWorkflowArtifact, {
			taskState: config.taskState,
			artifactId: "epic_doc",
			expectedArtifactAbsolutePath: allocation.artifactAbsolutePath,
		})
		expect(typeof result).to.equal("string")
		if (typeof result !== "string") {
			throw new Error("Expected string tool result.")
		}
		expect(JSON.parse(result)).to.deep.include({
			created: true,
			artifact_id: "epic_doc",
		})
	})

	it("does not authorize artifact creation by workflow call-id prefix", async () => {
		const { config, stubs, allocation } = createConfig()
		const handler = new CreateWorkflowArtifactToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, createArtifactBlock({ call_id: "model_call_1" }))

		sinon.assert.calledOnceWithExactly(stubs.prepareWorkflowArtifactCreation, {
			taskState: config.taskState,
			artifactId: "epic_doc",
		})
		sinon.assert.calledOnceWithExactly(stubs.createWorkflowArtifact, {
			taskState: config.taskState,
			artifactId: "epic_doc",
			expectedArtifactAbsolutePath: allocation.artifactAbsolutePath,
		})
		expect(typeof result).to.equal("string")
		if (typeof result !== "string") {
			throw new Error("Expected string tool result.")
		}
		expect(JSON.parse(result)).to.deep.include({
			created: true,
			artifact_id: "epic_doc",
		})
	})

	it("rejects missing or blank artifact ids before runtime allocation", async () => {
		const { config, stubs } = createConfig()
		const handler = new CreateWorkflowArtifactToolHandler(createToolValidator(config.cwd))
		const block = createArtifactBlock()
		Object.assign(block.params, {
			artifact_id: " ",
		})

		const result = await handler.execute(config, block)

		expect(result).to.contain("Missing required parameter 'artifact_id'")
		sinon.assert.notCalled(stubs.prepareWorkflowArtifactCreation)
		sinon.assert.notCalled(stubs.createWorkflowArtifact)
	})

	it("applies path approval before delegating creation and returns artifact output JSON", async () => {
		const { config, stubs, allocation } = createConfig()
		const handler = new CreateWorkflowArtifactToolHandler(createToolValidator(config.cwd))

		const result = await handler.execute(config, createArtifactBlock())

		sinon.assert.calledOnceWithExactly(stubs.prepareWorkflowArtifactCreation, {
			taskState: config.taskState,
			artifactId: "epic_doc",
		})
		sinon.assert.calledOnceWithExactly(
			stubs.shouldAutoApproveToolWithPath,
			ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
			allocation.artifactAbsolutePath,
		)
		sinon.assert.callOrder(stubs.prepareWorkflowArtifactCreation, stubs.ask, stubs.createWorkflowArtifact)
		sinon.assert.calledOnceWithExactly(stubs.createWorkflowArtifact, {
			taskState: config.taskState,
			artifactId: "epic_doc",
			expectedArtifactAbsolutePath: allocation.artifactAbsolutePath,
		})
		expect(typeof result).to.equal("string")
		if (typeof result !== "string") {
			throw new Error("Expected string tool result.")
		}
		const parsedResult = JSON.parse(result)
		expect(parsedResult).to.deep.include({
			created: true,
			artifact_id: "epic_doc",
			artifact_family: "epics",
			artifact_identity: "epics",
			artifact_filename: "Epics.md",
			artifact_relative_path: path.join("planning", "Epics.md"),
			artifact_absolute_path: allocation.artifactAbsolutePath,
		})
		expect(parsedResult.persisted_artifact_output_values).to.deep.equal(allocation.workflowValueWrites)
		expect(config.taskState.didEditFile).to.equal(true)
	})

	it("returns a clineignore tool error before approval, hooks, or artifact creation for blocked paths", async () => {
		const tmpCwd = await mkdtemp(path.join(tmpdir(), "create-workflow-artifact-clineignore-test-"))
		const clineIgnoreController = new ClineIgnoreController(tmpCwd)
		try {
			await writeFile(path.join(tmpCwd, ".clineignore"), "project-one/planning/Epics.md\n", "utf8")
			await clineIgnoreController.initialize()
			const { config, stubs, allocation } = createConfig({ cwd: tmpCwd })
			const hookStub = sandbox.stub(ToolHookUtils, "runPreToolUseIfEnabled").resolves(true)
			const handler = new CreateWorkflowArtifactToolHandler(new ToolValidator(clineIgnoreController))

			const result = await handler.execute(config, createArtifactBlock())

			expect(result).to.equal(formatResponse.toolError(formatResponse.clineIgnoreError(allocation.artifactAbsolutePath)))
			sinon.assert.calledOnceWithExactly(stubs.prepareWorkflowArtifactCreation, {
				taskState: config.taskState,
				artifactId: "epic_doc",
			})
			sinon.assert.notCalled(stubs.shouldAutoApproveToolWithPath)
			sinon.assert.notCalled(stubs.ask)
			sinon.assert.notCalled(hookStub)
			sinon.assert.notCalled(stubs.createWorkflowArtifact)
		} finally {
			await clineIgnoreController.dispose()
			await rm(tmpCwd, { recursive: true, force: true })
		}
	})

	it("creates an empty artifact file through the real workflow runtime", async () => {
		const tmpCwd = await mkdtemp(path.join(tmpdir(), "create-workflow-artifact-handler-test-"))
		try {
			const workflow = createRealArtifactWorkflow()
			sandbox
				.stub(WorkflowRegistry, "resolveWorkflowDefinition")
				.callsFake((workflowName: string) => (workflowName === workflow.name ? workflow : undefined))
			const taskState = new TaskState()
			taskState.activeWorkflowName = workflow.name
			taskState.activeWorkflowSession = createActiveWorkflowSession(workflow)
			const runtime = new WorkflowRuntime({
				cwd: tmpCwd,
				workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
			})
			const { config } = createConfig({
				cwd: tmpCwd,
				taskState,
				workflowRuntime: runtime,
			})
			const handler = new CreateWorkflowArtifactToolHandler(createToolValidator(config.cwd))

			const result = await handler.execute(config, createArtifactBlock())

			expect(typeof result).to.equal("string")
			if (typeof result !== "string") {
				throw new Error("Expected string tool result.")
			}
			const parsedResult = JSON.parse(result)
			const artifactAbsolutePath = parsedResult.artifact_absolute_path
			expect(artifactAbsolutePath).to.equal(
				path.join(tmpCwd, "docs", "projects", "real-artifact-project", "planning", "Epics.md"),
			)
			await access(artifactAbsolutePath)
			expect(await readFile(artifactAbsolutePath, "utf8")).to.equal("")
			expect(parsedResult.persisted_artifact_output_values.epic_artifact_absolute_path).to.equal(artifactAbsolutePath)
		} finally {
			await rm(tmpCwd, { recursive: true, force: true })
		}
	})

	it("creates the brainstorming singleton artifact through the real workflow runtime", async () => {
		const tmpCwd = await mkdtemp(path.join(tmpdir(), "create-workflow-artifact-brainstorming-handler-test-"))
		try {
			const workflow = createRealBrainstormingArtifactWorkflow()
			sandbox
				.stub(WorkflowRegistry, "resolveWorkflowDefinition")
				.callsFake((workflowName: string) => (workflowName === workflow.name ? workflow : undefined))
			const taskState = new TaskState()
			taskState.activeWorkflowName = workflow.name
			taskState.activeWorkflowSession = createActiveWorkflowSession(workflow)
			const runtime = new WorkflowRuntime({
				cwd: tmpCwd,
				workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
			})
			const { config } = createConfig({
				cwd: tmpCwd,
				taskState,
				workflowRuntime: runtime,
			})
			const handler = new CreateWorkflowArtifactToolHandler(createToolValidator(config.cwd))

			const result = await handler.execute(config, createArtifactBlock({ artifactId: "brainstorming_session" }))

			expect(typeof result).to.equal("string")
			if (typeof result !== "string") {
				throw new Error("Expected string tool result.")
			}
			const parsedResult = JSON.parse(result)
			const artifactAbsolutePath = path.join(
				tmpCwd,
				"docs",
				"projects",
				"real-artifact-project",
				"discovery",
				"brainstorming.md",
			)
			expect(parsedResult).to.deep.include({
				created: true,
				artifact_id: "brainstorming_session",
				artifact_family: "brainstorming_session",
				artifact_identity: "brainstorming_session",
				artifact_filename: "brainstorming.md",
				artifact_relative_path: path.join("discovery", "brainstorming.md"),
				artifact_absolute_path: artifactAbsolutePath,
			})
			expect(parsedResult.persisted_artifact_output_values.output_file).to.equal(artifactAbsolutePath)
			await access(artifactAbsolutePath)
			expect(await readFile(artifactAbsolutePath, "utf8")).to.equal("")
		} finally {
			await rm(tmpCwd, { recursive: true, force: true })
		}
	})

	it("creates the architecture singleton artifact through the real workflow runtime", async () => {
		const tmpCwd = await mkdtemp(path.join(tmpdir(), "create-workflow-artifact-architecture-handler-test-"))
		try {
			const workflow = createRealArchitectureArtifactWorkflow()
			sandbox
				.stub(WorkflowRegistry, "resolveWorkflowDefinition")
				.callsFake((workflowName: string) => (workflowName === workflow.name ? workflow : undefined))
			const taskState = new TaskState()
			taskState.activeWorkflowName = workflow.name
			taskState.activeWorkflowSession = createActiveWorkflowSession(workflow)
			const runtime = new WorkflowRuntime({
				cwd: tmpCwd,
				workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
			})
			const { config } = createConfig({
				cwd: tmpCwd,
				taskState,
				workflowRuntime: runtime,
			})
			const handler = new CreateWorkflowArtifactToolHandler(createToolValidator(config.cwd))

			const result = await handler.execute(config, createArtifactBlock({ artifactId: "architecture_document" }))

			expect(typeof result).to.equal("string")
			if (typeof result !== "string") {
				throw new Error("Expected string tool result.")
			}
			const parsedResult = JSON.parse(result)
			const artifactAbsolutePath = path.join(
				tmpCwd,
				"docs",
				"projects",
				"real-artifact-project",
				"planning",
				"architecture.md",
			)
			expect(parsedResult).to.deep.include({
				created: true,
				artifact_id: "architecture_document",
				artifact_family: "architecture_document",
				artifact_identity: "architecture_document",
				artifact_filename: "architecture.md",
				artifact_relative_path: path.join("planning", "architecture.md"),
				artifact_absolute_path: artifactAbsolutePath,
			})
			expect(parsedResult.persisted_artifact_output_values.output_file).to.equal(artifactAbsolutePath)
			await access(artifactAbsolutePath)
			expect(await readFile(artifactAbsolutePath, "utf8")).to.equal("")
		} finally {
			await rm(tmpCwd, { recursive: true, force: true })
		}
	})
})
