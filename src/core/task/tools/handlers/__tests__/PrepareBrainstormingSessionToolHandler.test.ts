import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import sinon from "sinon"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { PrepareBrainstormingSessionToolHandler } from "../PrepareBrainstormingSessionToolHandler"

describe("PrepareBrainstormingSessionToolHandler", () => {
	it("throws the removal-shim runtime error", async () => {
		const config = {
			taskId: "task-1",
			ulid: "ulid-1",
			cwd: process.cwd(),
			mode: "act",
			strictPlanModeEnabled: false,
			yoloModeToggled: false,
			doubleCheckCompletionEnabled: false,
			vscodeTerminalExecutionMode: "backgroundExec",
			enableParallelToolCalling: true,
			isSubagentExecution: true,
			taskState: new TaskState(),
			messageState: {} as any,
			api: {} as any,
			autoApprovalSettings: {} as any,
			autoApprover: {} as any,
			browserSettings: {} as any,
			focusChainSettings: {} as any,
			services: {
				stateManager: {
					getGlobalSettingsKey: sinon.stub(),
				},
			} as any,
			callbacks: {} as any,
			coordinator: {
				getHandler: sinon.stub(),
			} as any,
		} as TaskConfig
		const handler = new PrepareBrainstormingSessionToolHandler()

		await assert.rejects(
			handler.execute(config, {
				type: "tool_use",
				name: "prepare_brainstorming_session",
				params: {},
				partial: false,
			} as any),
			(error: unknown) =>
				error instanceof Error &&
				error.message ===
					"prepare_brainstorming_session has been removed from the live workflow path. Brainstorming Step 2 now resolves through Workflow Form v2 and this tool must not be used.",
		)
	})
})
