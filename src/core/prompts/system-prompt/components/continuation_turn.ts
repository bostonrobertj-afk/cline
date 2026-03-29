import { FocusChainPrompts } from "@/core/task/focus-chain/prompts"
import { MULTI_ROOT_HINT } from "../constants"
import type { PromptVariant, SystemPromptContext } from "../types"
import { getAgentFeedbackPromptGuidanceLine } from "./agent_feedback"
import { getIndxrExplorationGuidance } from "./mcp"
import { getCurrentModeResponseToolsLine } from "./response_tools"

function renderChecklistForPrompt(checklist: string): string {
	return ["```text", checklist.trim(), "```"].join("\n")
}

function getFocusChainReminderLine(context: SystemPromptContext): string {
	if (context.activeDeterministicPlaceholderWorkflowEnabled === true) {
		return "- Once you correctly complete the current step, the next step's details will be shown automatically."
	}

	if (context.activeWorkflowSupportsPlaceholders && !context.managedWorkflowActive) {
		return '- When the active step\'s "Done Signal" is true, use `send_user_message` tool call to briefly tell the user what step you are completing, and include `task_progress` with `__COMPLETE_NEXT_STEP__`. Use it only once in that assistant turn.'
	}

	return `- ${FocusChainPrompts.reminder.trim()}`
}

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

	const checklist = context.currentFocusChainChecklist?.trim()
	if (checklist) {
		if (!context.activePlaceholderWorkflowName) {
			lines.push("", "CURRENT TASK LIST", renderChecklistForPrompt(checklist))
		}

		lines.push(getFocusChainReminderLine(context))
	}

	return lines.join("\n")
}
