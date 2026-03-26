import type { SystemPromptContext } from "../types"

function getActModeResponseTools(context: SystemPromptContext): string[] {
	const tools = ["`attempt_completion`", "`send_user_message`"]

	if (context.yoloModeToggled !== true) {
		tools.splice(1, 0, "`ask_followup_question`")
	}

	if (context.enableNativeToolCalls) {
		tools.splice(tools.length - 1, 0, "`act_mode_respond`")
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
		"- `attempt_completion`: Use once at the end of each workflow",
		"- `send_user_message`: Use by default to send messages to the user",
	]

	if (context.yoloModeToggled !== true) {
		responseToolLines.push("- `ask_followup_question`: Use to ask a question + present options for user to select")
	}

	if (context.enableNativeToolCalls) {
		responseToolLines.push("- `act_mode_respond`: prefer send_user_message over this tool.")
	}

	responseToolLines.push("- `generate_plan_output`: Use to present a structured plan")

	return `RESPONSE TOOLS
Use these tools to respond to the user. A reply reaches the human user only when you use the appropriate response tool.
Governed user-facing response flows share one contract:
- Success displays the message, returns \`[Message displayed.]\`, and ends your current turn.
- The next turn does not begin until the human user responds.

${responseToolLines.join("\n")}

In ACT MODE, respond using these: ${actModeResponseTools}. In PLAN MODE, respond using these: ${planModeResponseTools}.`
}
