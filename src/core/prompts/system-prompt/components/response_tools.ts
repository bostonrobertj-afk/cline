import type { SystemPromptContext } from "../types"

const RESPONSE_TOOL_LINES = {
	attempt_completion: "- `attempt_completion`: Use once at the end of each workflow",
	ask_followup_question: "- `ask_followup_question`: Use to ask a question + present options for user to select",
	workflow_progress_request:
		"- `workflow_progress_request`: Use when the active workflow step is complete and you need the runtime-owned Yes/No confirmation before advancing",
	send_user_message: "- `send_user_message`: Use by default to send messages to the user",
	act_mode_respond:
		"- `act_mode_respond`: Use to send a brief ACT MODE progress update and intentionally wait for the user's next reply",
	generate_plan_output: "- `generate_plan_output`: Use to present a structured plan",
} as const

type ResponseToolName = keyof typeof RESPONSE_TOOL_LINES

function getActModeResponseToolNames(context: SystemPromptContext): ResponseToolName[] {
	const tools: ResponseToolName[] = ["attempt_completion"]

	if (context.yoloModeToggled !== true) {
		tools.push("ask_followup_question")
	}

	tools.push("send_user_message")
	return tools
}

function getPlanModeResponseToolNames(context: SystemPromptContext): ResponseToolName[] {
	const tools: ResponseToolName[] = ["generate_plan_output"]

	if (context.yoloModeToggled !== true) {
		tools.push("ask_followup_question")
	}

	tools.push("send_user_message")
	return tools
}

function formatResponseToolNames(toolNames: ResponseToolName[]): string[] {
	return toolNames.map((toolName) => `\`${toolName}\``)
}

export function getActModeResponseTools(context: SystemPromptContext): string[] {
	return formatResponseToolNames(getActModeResponseToolNames(context))
}

export function getPlanModeResponseTools(context: SystemPromptContext): string[] {
	return formatResponseToolNames(getPlanModeResponseToolNames(context))
}

export function joinToolNames(toolNames: string[]): string {
	if (toolNames.length === 1) {
		return toolNames[0]
	}

	return `${toolNames.slice(0, -1).join(", ")} and ${toolNames.at(-1)}`
}

export function getCurrentModeResponseToolsLine(context: SystemPromptContext): string {
	const currentModeTools = formatResponseToolNames(getVisibleResponseToolNames(context))
	return `- Use ${joinToolNames(currentModeTools)} when responding to the user.`
}

function getVisibleResponseToolNames(context: SystemPromptContext): ResponseToolName[] {
	const currentModeToolNames =
		context.providerInfo.mode === "plan" ? getPlanModeResponseToolNames(context) : getActModeResponseToolNames(context)

	if (context.enableNativeToolCalls === true && context.visibleNativeToolNames) {
		const orderedToolNames: ResponseToolName[] = [
			...currentModeToolNames.slice(0, -1),
			"workflow_progress_request",
			currentModeToolNames.at(-1)!,
		]
		if (context.providerInfo.mode !== "plan") {
			orderedToolNames.push("act_mode_respond")
		}

		const visibleToolNames = new Set(context.visibleNativeToolNames)
		return orderedToolNames.filter((toolName) => visibleToolNames.has(toolName))
	}

	return currentModeToolNames
}

export function getResponseToolsSection(context: SystemPromptContext): string {
	const responseToolLines = getVisibleResponseToolNames(context).map((toolName) => RESPONSE_TOOL_LINES[toolName])

	return `RESPONSE TOOLS
Use these tools to respond to the user. A reply reaches the human user only when you use the appropriate response tool.

${responseToolLines.join("\n")}`
}
