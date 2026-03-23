import type { SystemPromptContext } from "../types"

function getActModeResponseTools(context: SystemPromptContext): string[] {
	return context.yoloModeToggled !== true ? ["`attempt_completion`", "`ask_followup_question`"] : ["`attempt_completion`"]
}

function joinToolNames(toolNames: string[]): string {
	if (toolNames.length === 1) {
		return toolNames[0]
	}

	return `${toolNames.slice(0, -1).join(", ")} and ${toolNames.at(-1)}`
}

export function getResponseToolsSection(context: SystemPromptContext): string {
	const actModeTools = getActModeResponseTools(context)
	const responseToolLines = [
		"- `attempt_completion`: Use in ACT MODE when the task is complete or when you need to deliver the final direct answer.",
	]

	if (context.yoloModeToggled !== true) {
		responseToolLines.push(
			"- `ask_followup_question`: Use in ACT MODE when clarification from the user would improve correctness, reduce risk, or unblock the next step.",
		)
	}

	responseToolLines.push("- `plan_mode_respond`: Use in PLAN MODE for plan presentation and other user-facing replies.")

	return `RESPONSE TOOLS

These are the required response channels for user-visible replies. Do not end a completed turn with raw assistant text. A reply reaches the human user only when you use the appropriate response tool.

${responseToolLines.join("\n")}

In ACT MODE, user-visible replies must go through ${joinToolNames(actModeTools)}. In PLAN MODE, user-visible replies must go through \`plan_mode_respond\`.`
}

export function getActVsPlanModeResponseRules(context: SystemPromptContext): string {
	const actModeResponseTools = joinToolNames(getActModeResponseTools(context))

	return `- ACT MODE: use tools to complete the task. The only tools that can deliver a reply to the user in this mode are ${actModeResponseTools}. Do not send a raw assistant reply.
- PLAN MODE: gather context as needed. The only tool that can deliver a reply to the user in this mode is \`plan_mode_respond\`. Do not send a raw assistant reply.`
}
