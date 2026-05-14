import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import fs from "fs/promises"
import {
	DevStorySectionKey,
	getIncompleteStoryTaskSummaries,
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

export class ShowIncompleteTasksToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.SHOW_INCOMPLETE_TASKS

	getDescription(_block: ToolUse): string {
		return "[show_incomplete_tasks]"
	}

	async handlePartialBlock(_block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		await uiHelpers.say("tool", JSON.stringify({ tool: "showIncompleteTasks" }), undefined, undefined, true)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const suppliedParamNames = Object.entries(block.params)
			.filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== "")
			.map(([key]) => key)
		if (suppliedParamNames.length > 0) {
			return formatResponse.toolError("show_incomplete_tasks failed: parameters are not accepted.")
		}

		const resolvedStoryPath = resolveStoryPathFromTaskState(config)
		if ("errorMessage" in resolvedStoryPath) {
			return formatResponse.toolError(`show_incomplete_tasks failed: ${resolvedStoryPath.errorMessage}`)
		}

		try {
			const storyMarkdown = await fs.readFile(resolvedStoryPath.storyPath, "utf8")
			const parsedTasks = parseDevStoryTasks(storyMarkdown)
			if (!parsedTasks.ok) {
				return formatResponse.toolError(`show_incomplete_tasks failed: ${parsedTasks.message}`)
			}

			const document = buildTasksOnlyDocument(parsedTasks)
			if (document === undefined) {
				return formatResponse.toolError("show_incomplete_tasks failed: could not parse story tasks.")
			}

			const incompleteTasks = getIncompleteStoryTaskSummaries(document)
			return formatResponse.toolResult(
				JSON.stringify({
					incompleteTasks,
					allStoryTasksComplete: incompleteTasks.length === 0,
				}),
			)
		} catch (error) {
			return formatResponse.toolError(
				`show_incomplete_tasks failed: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
}
