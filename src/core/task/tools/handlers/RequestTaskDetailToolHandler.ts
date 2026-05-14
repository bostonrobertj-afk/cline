import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import fs from "fs/promises"
import {
	DevStorySectionKey,
	formatStoryTaskDetail,
	getStoryTaskDetailById,
	type ParsedDevStoryDocument,
	parseDevStoryTasks,
} from "@/core/task/story-tools/storyTaskDocument"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import { resolveStoryPathFromTaskState } from "./StoryTaskCompleteToolHandler"

function buildTasksOnlyDocument(parsedTasks: ReturnType<typeof parseDevStoryTasks>): ParsedDevStoryDocument | undefined {
	if (!parsedTasks.ok) {
		return undefined
	}

	return {
		sections: {
			[DevStorySectionKey.GeneralInstructions]: "",
			[DevStorySectionKey.Objective]: "",
			[DevStorySectionKey.Scope]: "",
			[DevStorySectionKey.ScopeBoundary]: "",
			[DevStorySectionKey.Requirements]: "",
			[DevStorySectionKey.Issues]: "",
		},
		lines: parsedTasks.parsed.lines,
		tasks: parsedTasks.parsed.tasks,
	}
}

export class RequestTaskDetailToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.REQUEST_TASK_DETAIL

	getDescription(_block: ToolUse): string {
		return "[request_task_detail]"
	}

	async handlePartialBlock(_block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		await uiHelpers.say("tool", JSON.stringify({ tool: "requestTaskDetail" }), undefined, undefined, true)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		if (block.params.path !== undefined || block.params.absolutePath !== undefined) {
			return formatResponse.toolError("request_task_detail failed: path parameters are not accepted.")
		}

		const storyTaskId = block.params.storyTaskId?.trim() ?? ""
		if (storyTaskId === "") {
			return formatResponse.toolError("request_task_detail failed: storyTaskId is required.")
		}

		const resolvedStoryPath = resolveStoryPathFromTaskState(config)
		if ("errorMessage" in resolvedStoryPath) {
			return formatResponse.toolError(`request_task_detail failed for ${storyTaskId}: ${resolvedStoryPath.errorMessage}`)
		}

		try {
			const storyMarkdown = await fs.readFile(resolvedStoryPath.storyPath, "utf8")
			const parsedTasks = parseDevStoryTasks(storyMarkdown)
			if (!parsedTasks.ok) {
				return formatResponse.toolError(`request_task_detail failed for ${storyTaskId}: ${parsedTasks.message}`)
			}

			const document = buildTasksOnlyDocument(parsedTasks)
			if (document === undefined) {
				return formatResponse.toolError(`request_task_detail failed for ${storyTaskId}: could not parse story tasks.`)
			}

			const detail = getStoryTaskDetailById(document, storyTaskId)
			if (detail === undefined) {
				return formatResponse.toolError(`request_task_detail failed for ${storyTaskId}: task ID does not exist.`)
			}

			return formatResponse.toolResult(formatStoryTaskDetail(detail))
		} catch (error) {
			return formatResponse.toolError(
				`request_task_detail failed for ${storyTaskId}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
}
