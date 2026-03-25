import { formatResponse } from "@core/prompts/responses"
import { processFilesIntoText } from "@integrations/misc/extract-text"
import type { ClineContent } from "@shared/messages/content"

/**
 * Builds a normal user turn from raw user input.
 * This is used for deferred post-completion follow-up so the next API request
 * sees the reply as ordinary user content instead of tool output.
 */
export async function buildUserMessageContent(
	text?: string,
	images?: string[],
	files?: string[],
	hookContext?: string,
): Promise<ClineContent[]> {
	const content: ClineContent[] = []

	if (text) {
		content.push({
			type: "text",
			text: formatResponse.latestHumanInput("user_message", text),
		})
	}

	if (images && images.length > 0) {
		content.push(...formatResponse.imageBlocks(images))
	}

	if (files && files.length > 0) {
		const fileContentString = await processFilesIntoText(files)
		if (fileContentString) {
			content.push({
				type: "text",
				text: fileContentString,
			})
		}
	}

	if (hookContext) {
		content.push({
			type: "text",
			text: `<hook_context source="UserPromptSubmit">\n${hookContext}\n</hook_context>`,
		})
	}

	return content
}
