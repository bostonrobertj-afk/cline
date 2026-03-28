import { FocusChainPrompts } from "@/core/task/focus-chain/prompts"
import { MULTI_ROOT_HINT } from "../constants"
import type { PromptVariant, SystemPromptContext } from "../types"
import { hasConnectedIndxrServer, INDXR_EXPLORATION_PREFERENCE_GUIDANCE } from "./mcp"
import { getCurrentModeResponseToolsLine } from "./response_tools"
import { PLACEHOLDER_WORKFLOW_DONE_SIGNAL_REMINDER } from "./task_progress"

function renderChecklistForPrompt(checklist: string): string {
	return ["```text", checklist.trim(), "```"].join("\n")
}

function getFocusChainReminderLine(context: SystemPromptContext): string {
	if (context.activeWorkflowSupportsPlaceholders && !context.managedWorkflowActive) {
		return `- ${PLACEHOLDER_WORKFLOW_DONE_SIGNAL_REMINDER}`
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
		"- Ask the user only if required to unblock progress or reduce risk.",
		"- Prefer completing the next concrete step instead of restating prior context.",
	]

	if (context.isMultiRootEnabled) {
		lines.push(`- ${MULTI_ROOT_HINT.trim()}`)
	}

	if (hasConnectedIndxrServer(context)) {
		lines.push(`- ${INDXR_EXPLORATION_PREFERENCE_GUIDANCE}`)
	}

	const checklist = context.currentFocusChainChecklist?.trim()
	if (checklist) {
		lines.push("", "CURRENT TASK LIST", renderChecklistForPrompt(checklist), getFocusChainReminderLine(context))
	}

	return lines.join("\n")
}
