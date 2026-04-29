import { strict as assert } from "node:assert"
import type { ToolUse } from "@core/assistant-message"
import { describe, it } from "mocha"
import sinon from "sinon"
import { ClineDefaultTool } from "@/shared/tools"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { UseSkillToolHandler } from "../UseSkillToolHandler"

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
	} as unknown as TaskConfig

	return { config, activateWorkflow }
}

describe("UseSkillToolHandler", () => {
	it("rejects direct use_skill execution inside subagent runs before workflow activation", async () => {
		const { config, activateWorkflow } = createSubagentConfig()
		const handler = new UseSkillToolHandler()
		const block: ToolUse = {
			type: "tool_use",
			name: ClineDefaultTool.USE_SKILL,
			params: {
				skill_name: "workflow-runtime-test",
			},
			partial: false,
		}

		const result = await handler.execute(config, block)

		assert.equal(result, "Error: use_skill is not available inside subagent runs.")
		assert.equal(config.taskState.consecutiveMistakeCount, 1)
		sinon.assert.notCalled(activateWorkflow)
	})
})
