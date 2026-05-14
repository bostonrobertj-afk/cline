import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import fs from "fs/promises"
import {
	buildCurrentStoryTaskPrompt,
	DEV_STORY_WORKFLOW_NAME,
	resolveActiveStoryPath,
} from "@/core/task/story-tools/storyTaskDocument"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"

function resolveDevStoryTargetStoryPath(config: TaskConfig): { storyPath: string } | { errorMessage: string } {
	const session = config.taskState.activeWorkflowSession
	if (config.taskState.activeWorkflowName !== DEV_STORY_WORKFLOW_NAME || session === undefined) {
		return { errorMessage: "requires an active dev-story workflow session." }
	}

	const resolvedStoryPath = resolveActiveStoryPath({
		cwd: config.cwd,
		workflowValues: session.workflowValues,
	})
	if (!resolvedStoryPath.ok) {
		return { errorMessage: resolvedStoryPath.message }
	}

	return { storyPath: resolvedStoryPath.storyPath }
}

export class StoryTaskReminderToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.STORY_TASK_REMINDER

	getDescription(_block: ToolUse): string {
		return "[story_task_reminder]"
	}

	async handlePartialBlock(_block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		await uiHelpers.say("tool", JSON.stringify({ tool: "storyTaskReminder" }), undefined, undefined, true)
	}

	async execute(config: TaskConfig, _block: ToolUse): Promise<ToolResponse> {
		const resolvedStoryPath = resolveDevStoryTargetStoryPath(config)
		if ("errorMessage" in resolvedStoryPath) {
			return formatResponse.toolError(`story_task_reminder failed: ${resolvedStoryPath.errorMessage}`)
		}

		try {
			const storyMarkdown = await fs.readFile(resolvedStoryPath.storyPath, "utf8")
			const promptPayload = buildCurrentStoryTaskPrompt(storyMarkdown)
			if ("error" in promptPayload) {
				return formatResponse.toolError(`story_task_reminder failed: ${promptPayload.error}`)
			}

			return formatResponse.toolResult(promptPayload.promptText)
		} catch (error) {
			return formatResponse.toolError(
				`story_task_reminder failed: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
}
