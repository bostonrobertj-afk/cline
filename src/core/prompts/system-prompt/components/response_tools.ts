import type { SystemPromptContext } from "../types"

const RESPONSE_TOOL_LINES = {
	attempt_completion: "- `attempt_completion`: Use once at the end of each workflow",
	ask_followup_question: "- `ask_followup_question`: Use to ask a question + present options for user to select",
	send_user_message: "- `send_user_message`: Use by default to send messages to the user",
	act_mode_respond:
		"- `act_mode_respond`: Use to send a brief ACT MODE progress update and intentionally wait for the user's next reply",
	generate_plan_output: "- `generate_plan_output`: Use to present a structured plan",
	workflow_progress_request:
		"- `workflow_progress_request`: Use to ask the user to confirm whether the current workflow step is ready to advance",
} as const

type ResponseToolName = keyof typeof RESPONSE_TOOL_LINES

function isResponseToolName(toolName: string): toolName is ResponseToolName {
	return Object.hasOwn(RESPONSE_TOOL_LINES, toolName)
}

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

function getWorkflowOverrideResponseToolNames(context: SystemPromptContext): ResponseToolName[] | undefined {
	if (context.workflowToolSchemaOverride === undefined) {
		return undefined
	}

	const responseToolNames: ResponseToolName[] = []
	for (const tool of context.workflowToolSchemaOverride) {
		const toolName = tool.name ?? tool.id
		if (isResponseToolName(toolName)) {
			responseToolNames.push(toolName)
		}
	}

	return responseToolNames
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

export function getCurrentModeResponseToolsLine(context: SystemPromptContext): string | undefined {
	const visibleResponseToolNames = getVisibleResponseToolNames(context)
	if (visibleResponseToolNames.length === 0) {
		return undefined
	}

	const currentModeTools = formatResponseToolNames(visibleResponseToolNames)
	return `- Use ${joinToolNames(currentModeTools)} when responding to the user.`
}

function getVisibleResponseToolNames(context: SystemPromptContext): ResponseToolName[] {
	const workflowOverrideResponseToolNames = getWorkflowOverrideResponseToolNames(context)
	if (workflowOverrideResponseToolNames !== undefined) {
		return workflowOverrideResponseToolNames
	}

	const currentModeToolNames =
		context.providerInfo.mode === "plan" ? getPlanModeResponseToolNames(context) : getActModeResponseToolNames(context)

	if (context.enableNativeToolCalls === true && context.visibleNativeToolNames) {
		const orderedToolNames: ResponseToolName[] = [...currentModeToolNames]
		if (context.providerInfo.mode !== "plan") {
			orderedToolNames.push("act_mode_respond")
		}
		orderedToolNames.push("workflow_progress_request")

		const visibleToolNames = new Set(context.visibleNativeToolNames.filter(isResponseToolName))
		return orderedToolNames.filter((toolName) => visibleToolNames.has(toolName))
	}

	return currentModeToolNames
}

export function getResponseToolsSection(context: SystemPromptContext): string {
	const responseToolLines = getVisibleResponseToolNames(context).map((toolName) => RESPONSE_TOOL_LINES[toolName])
	if (responseToolLines.length === 0) {
		return ""
	}

	return `RESPONSE TOOLS
Use these tools to respond to the user. A reply reaches the human user only when you use the appropriate response tool.

${responseToolLines.join("\n")}`
}
