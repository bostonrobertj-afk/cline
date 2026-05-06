import { MULTI_ROOT_HINT } from "../constants"
import type { PromptVariant, SystemPromptContext } from "../types"
import { getIndxrExplorationGuidance } from "./mcp"
import { getCurrentModeResponseToolsLine } from "./response_tools"

export async function getContinuationTurnSection(
	_variant: PromptVariant,
	context: SystemPromptContext,
): Promise<string | undefined> {
	if (context.isContinuationTurn !== true) {
		return undefined
	}

	const responseToolsLine = getCurrentModeResponseToolsLine(context)
	const lines = [
		"CONTINUATION TURN",
		"",
		"Continue the current task from the latest tool results and conversation state.",
		"",
		"- Before any tool call, check the native tool schema for that tool's exact name, required fields, and argument shape. Do not rely on memory or prior examples.",
		`- Operate from ${context.cwd || process.cwd()}; use explicit paths.`,
	]

	if (responseToolsLine !== undefined) {
		lines.push(responseToolsLine)
	}

	lines.push(
		"- Ask the user only if required to unblock progress or reduce risk.",
		"- Prefer completing the next concrete step instead of restating prior context.",
	)

	if (context.isMultiRootEnabled) {
		lines.push(`- ${MULTI_ROOT_HINT.trim()}`)
	}

	const indxrGuidance = getIndxrExplorationGuidance(context)
	if (indxrGuidance) {
		lines.push(`- ${indxrGuidance}`)
	}

	return lines.join("\n")
}
