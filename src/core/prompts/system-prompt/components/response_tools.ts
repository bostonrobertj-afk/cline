import type { SystemPromptContext } from "../types"

function getActModeResponseTools(context: SystemPromptContext): string[] {
	const tools = ["`attempt_completion`", "`send_user_message`"]

	if (context.yoloModeToggled !== true) {
		tools.splice(1, 0, "`ask_followup_question`")
	}

	return tools
}

function getPlanModeResponseTools(context: SystemPromptContext): string[] {
	const tools = ["`generate_plan_output`", "`send_user_message`"]

	if (context.yoloModeToggled !== true) {
		tools.splice(1, 0, "`ask_followup_question`")
	}

	return tools
}

function joinToolNames(toolNames: string[]): string {
	if (toolNames.length === 1) {
		return toolNames[0]
	}

	return `${toolNames.slice(0, -1).join(", ")} and ${toolNames.at(-1)}`
}

export function getResponseToolsSection(context: SystemPromptContext): string {
	const actModeResponseTools = joinToolNames(getActModeResponseTools(context))
	const planModeResponseTools = joinToolNames(getPlanModeResponseTools(context))
	const responseToolLines = [
		"- `attempt_completion`: Use in ACT MODE when the task is complete or when you need to deliver the final direct answer.",
		"- `send_user_message`: Use in either ACT MODE or PLAN MODE when other, more specialized response tools are not appropriate or available.",
	]

	if (context.yoloModeToggled !== true) {
		responseToolLines.push(
			"- `ask_followup_question`: Use when you need a direct answer from the user to improve correctness or unblock the next step.",
		)
	}

	responseToolLines.push("- `generate_plan_output`: Use in PLAN MODE to present a plan or otherwise respond during planning.")

	return `RESPONSE TOOLS
Use these tools to respond to the user. A reply reaches the human user only when you use the appropriate response tool.

${responseToolLines.join("\n")}

In ACT MODE, respond using these: ${actModeResponseTools}. In PLAN MODE, respond using these: ${planModeResponseTools}.`
}
