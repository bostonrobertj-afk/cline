import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import fs from "fs/promises"
import { markStoryStatusReview } from "@/core/task/story-tools/storyTaskDocument"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import {
	askForManualStoryUpdate,
	buildStoryWriteCompleteMessage,
	finalizeSuccessfulStoryWrite,
	resolveStoryPathFromTaskState,
	runStoryWritePreToolHook,
	writeStoryFileWithRetry,
} from "./StoryTaskCompleteToolHandler"

export class StoryTestingCompleteToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.STORY_TESTING_COMPLETE

	getDescription(_block: ToolUse): string {
		return "[story_testing_complete]"
	}

	async handlePartialBlock(_block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		await uiHelpers.say("tool", JSON.stringify({ tool: "storyTestingComplete" }), undefined, undefined, true)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const resolvedStoryPath = resolveStoryPathFromTaskState(config)
		if ("errorMessage" in resolvedStoryPath) {
			return formatResponse.toolError(resolvedStoryPath.errorMessage)
		}

		try {
			const storyMarkdown = await fs.readFile(resolvedStoryPath.storyPath, "utf8")
			const statusResult = markStoryStatusReview(storyMarkdown)
			if ("error" in statusResult) {
				return formatResponse.toolError(statusResult.error)
			}

			const preToolHookResponse = await runStoryWritePreToolHook(config, block)
			if (preToolHookResponse) {
				return preToolHookResponse
			}

			const didWriteSucceed = await writeStoryFileWithRetry({
				storyPath: resolvedStoryPath.storyPath,
				updatedMarkdown: statusResult.updatedMarkdown,
			})
			if (!didWriteSucceed) {
				await askForManualStoryUpdate({
					config,
					readablePath: resolvedStoryPath.readablePath,
					manualPatch: statusResult.manualPatch,
					failureIntro: "Automatic story status update failed.",
				})
				return formatResponse.toolResult(
					JSON.stringify({
						status_updated: false,
						awaiting_manual_update: true,
					}),
				)
			}

			const completeMessage = await buildStoryWriteCompleteMessage({
				config,
				storyPath: resolvedStoryPath.storyPath,
				tool: "storyTestingComplete",
				content: `Story file: ${resolvedStoryPath.readablePath}`,
			})
			await finalizeSuccessfulStoryWrite({
				config,
				storyPath: resolvedStoryPath.storyPath,
				completeMessage,
			})

			return formatResponse.toolResult(
				JSON.stringify({
					status_updated: true,
					status: "review",
				}),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
