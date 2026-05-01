import { strict as assert } from "node:assert"
import type { ToolUse } from "@core/assistant-message"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import type { WorkflowDefinition, WorkflowNextAction } from "@/core/task/workflow-runtime/types"
import * as WorkflowRegistry from "@/core/task/workflow-runtime/WorkflowRegistry"
import { ClineDefaultTool } from "@/shared/tools"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { UseSkillToolHandler } from "../UseSkillToolHandler"

const ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: "entry_project_mode",
	projectTitle: "entry_project_title",
	projectFolderName: "entry_project_folder_name",
}

function createWorkflowDefinition(): WorkflowDefinition {
	return {
		name: "workflow-runtime-test",
		slashCommandName: "workflow-runtime-test",
		useSkillName: "workflow-runtime-test",
		persona: "engineer",
		projectSubfolder: "planning",
		workflowValueKeys: Object.values(ENTRY_PROJECT_VALUE_KEYS),
		entryProjectValueKeys: ENTRY_PROJECT_VALUE_KEYS,
		entryPanel: {
			promptMarkdown: "Start workflow.",
		},
		steps: {
			"step-1": {
				id: "step-1",
				stepNumber: 1,
				checklistLabel: "Step 1",
				buildPromptSource: () => ({}),
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
			},
		},
	}
}

function createSubagentConfig(): { config: TaskConfig; activateWorkflow: sinon.SinonStub } {
	const activateWorkflow = sinon.stub().resolves({ kind: "no_op" })
	const config = {
		isSubagentExecution: true,
		taskState: new TaskState(),
		services: {
			stateManager: {
				getApiConfiguration: () => ({
					planModeApiProvider: "openai",
					actModeApiProvider: "openai",
				}),
				getGlobalSettingsKey: () => "act",
			},
		},
		workflowRuntime: {
			activateWorkflow,
		},
		callbacks: {
			queueWorkflowNextAction: sinon.stub(),
		},
	} as unknown as TaskConfig

	return { config, activateWorkflow }
}

function createMainAgentConfig(nextAction: WorkflowNextAction): {
	config: TaskConfig
	activateWorkflow: sinon.SinonStub
	queueWorkflowNextAction: sinon.SinonStub
} {
	const activateWorkflow = sinon.stub().resolves(nextAction)
	const queueWorkflowNextAction = sinon.stub()
	const config = {
		ulid: "ulid-1",
		isSubagentExecution: false,
		taskState: new TaskState(),
		api: {
			getModel: () => ({ id: "openai/gpt-5" }),
		},
		services: {
			stateManager: {
				getApiConfiguration: () => ({
					planModeApiProvider: "openai",
					actModeApiProvider: "openai",
				}),
				getGlobalSettingsKey: () => "act",
			},
		},
		callbacks: {
			say: sinon.stub().resolves(undefined),
			queueWorkflowNextAction,
		},
		workflowRuntime: {
			activateWorkflow,
		},
	} as unknown as TaskConfig

	return { config, activateWorkflow, queueWorkflowNextAction }
}

function createUseSkillBlock(): ToolUse {
	return {
		type: "tool_use",
		name: ClineDefaultTool.USE_SKILL,
		params: {
			skill_name: "workflow-runtime-test",
		},
		partial: false,
	}
}

describe("UseSkillToolHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("rejects direct use_skill execution inside subagent runs before workflow activation", async () => {
		const { config, activateWorkflow } = createSubagentConfig()
		const handler = new UseSkillToolHandler()

		const result = await handler.execute(config, createUseSkillBlock())

		assert.equal(result, "Error: use_skill is not available inside subagent runs.")
		assert.equal(config.taskState.consecutiveMistakeCount, 1)
		sinon.assert.notCalled(activateWorkflow)
	})

	it("queues successful workflow activation next actions", async () => {
		const workflow = createWorkflowDefinition()
		const nextAction: WorkflowNextAction = { kind: "project_prompt", promptProjection: {} }
		const { config, activateWorkflow, queueWorkflowNextAction } = createMainAgentConfig(nextAction)
		sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName").returns(workflow)
		const handler = new UseSkillToolHandler()

		const result = await handler.execute(config, createUseSkillBlock())

		assert.match(String(result), /Workflow "workflow-runtime-test" is now active/)
		assert.equal(config.taskState.activeWorkflowName, workflow.name)
		sinon.assert.calledOnceWithExactly(activateWorkflow, {
			taskState: config.taskState,
			workflowName: workflow.name,
		})
		sinon.assert.calledOnceWithExactly(queueWorkflowNextAction, nextAction)
	})

	it("rolls back workflow activation without queueing when runtime returns no_op", async () => {
		const workflow = createWorkflowDefinition()
		const { config, queueWorkflowNextAction } = createMainAgentConfig({ kind: "no_op" })
		config.taskState.activeWorkflowName = "previous-workflow"
		sinon.stub(WorkflowRegistry, "resolveWorkflowByUseSkillName").returns(workflow)
		const handler = new UseSkillToolHandler()

		const result = await handler.execute(config, createUseSkillBlock())

		assert.equal(result, 'Error: Workflow "workflow-runtime-test" could not be activated.')
		assert.equal(config.taskState.activeWorkflowName, "previous-workflow")
		sinon.assert.notCalled(queueWorkflowNextAction)
	})
})
