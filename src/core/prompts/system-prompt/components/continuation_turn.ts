import { MULTI_ROOT_HINT } from "../constants"
import type { PromptVariant, SystemPromptContext } from "../types"
import { getAgentFeedbackPromptGuidanceLine } from "./agent_feedback"
import { getIndxrExplorationGuidance } from "./mcp"
import { getCurrentModeResponseToolsLine } from "./response_tools"

export async function getContinuationTurnSection(
	_variant: PromptVariant,
	context: SystemPromptContext,
): Promise<string | undefined> {
	if (context.isContinuationTurn !== true) {
		return undefined
	}

	const lines = [
		"CONTINUATION TURN",
		"",
		"Continue the current task from the latest tool results and conversation state.",
		"",
		"- Before any tool call, check the native tool schema for that tool's exact name, required fields, and argument shape. Do not rely on memory or prior examples.",
		`- Operate from ${context.cwd || process.cwd()}; use explicit paths.`,
		getCurrentModeResponseToolsLine(context),
		getAgentFeedbackPromptGuidanceLine(),
		"- Ask the user only if required to unblock progress or reduce risk.",
		"- Prefer completing the next concrete step instead of restating prior context.",
	]

	if (context.isMultiRootEnabled) {
		lines.push(`- ${MULTI_ROOT_HINT.trim()}`)
	}

	const indxrGuidance = getIndxrExplorationGuidance(context)
	if (indxrGuidance) {
		lines.push(`- ${indxrGuidance}`)
	}

	const workflowSystemBlock = context.continuationTurnWorkflowSystemInstructionsBlock
	if (typeof workflowSystemBlock === "string" && workflowSystemBlock.trim().length > 0) {
		lines.push("", workflowSystemBlock)
	}

	const workflowInputBlock = context.continuationTurnWorkflowInputInstructionsBlock
	if (typeof workflowInputBlock === "string" && workflowInputBlock.trim().length > 0) {
		lines.push("", workflowInputBlock)
	}

	return lines.join("\n")
}
