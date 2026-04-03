import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import fs from "fs/promises"
import { appendStorySectionEntry } from "@/core/task/story-tools/storyTaskDocument"
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

export class StoryNotesUpdateToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.STORY_NOTES_UPDATE

	getDescription(_block: ToolUse): string {
		return "[story_notes_update]"
	}

	async handlePartialBlock(_block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		await uiHelpers.say("tool", JSON.stringify({ tool: "storyNotesUpdate" }), undefined, undefined, true)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const params = block.params as Record<string, unknown>
		const section = typeof params.section === "string" ? params.section.trim() : ""
		const entry = typeof params.entry === "string" ? params.entry : ""
		const sectionHeading =
			section === "Completion Notes List"
				? "## Completion Notes List"
				: section === "File List"
					? "## File List"
					: undefined
		if (!sectionHeading) {
			return formatResponse.toolError('Invalid section. Allowed values are "Completion Notes List" and "File List".')
		}

		const resolvedStoryPath = resolveStoryPathFromTaskState(config)
		if ("errorMessage" in resolvedStoryPath) {
			return formatResponse.toolError(resolvedStoryPath.errorMessage)
		}

		try {
			const storyMarkdown = await fs.readFile(resolvedStoryPath.storyPath, "utf8")
			const appendResult = appendStorySectionEntry({
				storyMarkdown,
				sectionHeading,
				entry,
			})
			if ("error" in appendResult) {
				return formatResponse.toolError(appendResult.error)
			}

			const preToolHookResponse = await runStoryWritePreToolHook(config, block)
			if (preToolHookResponse) {
				return preToolHookResponse
			}

			const didWriteSucceed = await writeStoryFileWithRetry({
				storyPath: resolvedStoryPath.storyPath,
				updatedMarkdown: appendResult.updatedMarkdown,
			})
			if (!didWriteSucceed) {
				await askForManualStoryUpdate({
					config,
					readablePath: resolvedStoryPath.readablePath,
					manualPatch: appendResult.manualPatch,
					failureIntro: "Automatic story notes update failed.",
				})
				return formatResponse.toolResult(
					JSON.stringify({
						appended: false,
						awaiting_manual_update: true,
					}),
				)
			}

			const completeMessage = await buildStoryWriteCompleteMessage({
				config,
				storyPath: resolvedStoryPath.storyPath,
				tool: "storyNotesUpdate",
				content: `Story file: ${resolvedStoryPath.readablePath}`,
			})
			await finalizeSuccessfulStoryWrite({
				config,
				storyPath: resolvedStoryPath.storyPath,
				completeMessage,
			})

			return formatResponse.toolResult(
				JSON.stringify({
					appended: true,
					section,
				}),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
