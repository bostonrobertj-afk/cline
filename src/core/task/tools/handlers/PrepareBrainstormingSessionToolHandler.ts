import type { ToolUse } from "@core/assistant-message"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"

const REMOVAL_MESSAGE =
	"prepare_brainstorming_session has been removed from the live workflow path. Brainstorming Step 2 now resolves through Workflow Form v2 and this tool must not be used."

export class PrepareBrainstormingSessionToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.PREPARE_BRAINSTORMING_SESSION

	getDescription(_block: ToolUse): string {
		return "[prepare_brainstorming_session]"
	}

	async execute(_config: TaskConfig, _block: ToolUse): Promise<ToolResponse> {
		throw new Error(REMOVAL_MESSAGE)
	}
}
