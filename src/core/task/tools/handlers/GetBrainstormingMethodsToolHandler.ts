import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { BRAINSTORMING_TECHNIQUES } from "@/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingTechniqueRegistry"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"

export class GetBrainstormingMethodsToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.GET_BRAINSTORMING_METHODS

	getDescription(_block: ToolUse): string {
		return "[get_brainstorming_methods]"
	}

	async execute(_config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const parameterNames = Object.keys(block.params)
		if (parameterNames.length > 0) {
			return formatResponse.toolError("get_brainstorming_methods does not accept parameters.")
		}

		return formatResponse.toolResult(
			JSON.stringify({
				methods: BRAINSTORMING_TECHNIQUES.map((technique) => ({
					id: technique.id,
					category: technique.category,
					name: technique.name,
					description: technique.description,
				})),
			}),
		)
	}
}
