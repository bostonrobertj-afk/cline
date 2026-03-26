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
		"- `attempt_completion`: Use in ACT MODE when you are ready to present a structured final outcome, such as a completion report or QA findings.",
		"- `send_user_message`: Use in either ACT MODE or PLAN MODE when other, more specialized response tools are not appropriate or available. This is the appropriate response tool for general dialogue.",
	]

	if (context.yoloModeToggled !== true) {
		responseToolLines.push(
			"- `ask_followup_question`: Use when you need a direct answer from the user to improve correctness or unblock the next step.",
		)
	}

	if (context.enableNativeToolCalls) {
		responseToolLines.push(
			"- `act_mode_respond`: Use in ACT MODE when you want to send a progress update or preamble to the user and then wait for their next reply before continuing.",
		)
	}

	responseToolLines.push("- `generate_plan_output`: Use in PLAN MODE to present a plan or otherwise respond during planning.")

	return `RESPONSE TOOLS
Use these tools to respond to the user. A reply reaches the human user only when you use the appropriate response tool.
Governed user-facing response flows share one contract:
- Success displays the message, returns \`[Message displayed.]\`, and ends your current turn.
- The next turn does not begin until the human user responds.
- Any human reply arrives on the following turn as normal human-authored input, not same-turn tool output.
- Only tool purpose and UI presentation differ.
- If \`generate_plan_output\` sets \`needs_more_exploration=true\`, that branch is internal control flow and does not use this contract.

${responseToolLines.join("\n")}

In ACT MODE, respond using these: ${actModeResponseTools}. In PLAN MODE, respond using these: ${planModeResponseTools}.`
}
