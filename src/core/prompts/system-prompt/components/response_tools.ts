import type { SystemPromptContext } from "../types"

function getActModeResponseTools(context: SystemPromptContext): string[] {
	return context.yoloModeToggled !== true ? ["`attempt_completion`", "`ask_followup_question`"] : ["`act_mode_respond`"]
}

function getPlanModeResponseTools(): string[] {
	return ["`plan_mode_respond`", "`ask_followup_question`"]
}

function joinToolNames(toolNames: string[]): string {
	if (toolNames.length === 1) {
		return toolNames[0]
	}

	return `${toolNames.slice(0, -1).join(", ")} and ${toolNames.at(-1)}`
}

export function getResponseToolsSection(context: SystemPromptContext): string {
	const actModeTools = getActModeResponseTools(context)
	const responseToolLines = ["- `attempt_completion`: Use at the end of a workflow or task"]

	if (context.yoloModeToggled !== true) {
		responseToolLines.push("- `ask_followup_question`: Use to ask the user a question at any time")
	}

	responseToolLines.push("- `plan_mode_respond`: Use in PLAN MODE for plan presentation and other user-facing replies.")

	return `RESPONSE TOOLS
Use these tools to respond to the user. Responses that fail to use these tools will not reach the user.

${responseToolLines.join("\n")}

In ACT MODE, respond using these: ${joinToolNames(actModeTools)}. In PLAN MODE, respond using \`plan_mode_respond\`.`
}

export function getActVsPlanModeResponseRules(context: SystemPromptContext): string {
	const actModeResponseTools = joinToolNames(getActModeResponseTools(context))
	const planModeResponseTools = joinToolNames(getPlanModeResponseTools())

	return `- ACT MODE: Engage in dialogue and execute tasks/workflows. To message the user, use these: ${actModeResponseTools}.
- PLAN MODE: Engage in dialogue focused on planning out future tasks. To message the user, use these: ${planModeResponseTools}. Do not send a raw assistant reply.`
}
