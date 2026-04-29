import { ClineStorageMessage } from "@/shared/messages"

const CHARS_PER_TOKEN_ESTIMATE = 4

export interface RequestTokenEstimate {
	estimatedTotal: number
	systemPrompt: number
	systemSections: {
		skills: number
		toolUse: number
	}
	history: {
		total: number
		priorTurns: number
		currentUserInput: number
		toolOutputs: number
		toolCalls: number
	}
}

export interface TokenEstimateLogPayload extends RequestTokenEstimate {
	taskId: string
	ulid: string
	apiRequestCount: number
	modelId: string
	providerId: string
}

function estimateTextTokens(text: string | undefined): number {
	if (!text) {
		return 0
	}

	return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE)
}

function extractSection(prompt: string, header: string): string {
	const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	const match = prompt.match(new RegExp(`(?:^|\\n)${escapedHeader}\\n\\n([\\s\\S]*?)(?:\\n====|$)`))
	return match?.[1]?.trim() ?? ""
}

function stringifyUnknown(value: unknown): string {
	if (typeof value === "string") {
		return value
	}

	if (value == null) {
		return ""
	}

	try {
		return JSON.stringify(value)
	} catch {
		return String(value)
	}
}

function extractContentText(content: ClineStorageMessage["content"]): string {
	if (typeof content === "string") {
		return content
	}

	return content
		.map((block: any) => {
			switch (block?.type) {
				case "text":
					return block.text ?? ""
				case "thinking":
					return block.thinking ?? ""
				case "redacted_thinking":
					return block.data ?? ""
				case "tool_use":
					return `${block.name ?? ""} ${stringifyUnknown(block.input)}`
				case "tool_result":
					return stringifyUnknown(block.content)
				case "image":
					return "[image]"
				case "document":
					return stringifyUnknown(block.source ?? block.content)
				default:
					return stringifyUnknown(block)
			}
		})
		.join("\n")
}

function estimateMessageTokens(message: ClineStorageMessage): number {
	return estimateTextTokens(extractContentText(message.content))
}

function hasHumanFacingUserContent(message: ClineStorageMessage): boolean {
	if (message.role !== "user") {
		return false
	}

	if (typeof message.content === "string") {
		return true
	}

	return message.content.some((block: any) => block?.type !== "tool_result")
}

function estimateToolOutputTokens(message: ClineStorageMessage): number {
	if (!Array.isArray(message.content) || message.role !== "user") {
		return 0
	}

	const text = message.content
		.filter((block: any) => block?.type === "tool_result")
		.map((block: any) => stringifyUnknown(block.content))
		.join("\n")

	return estimateTextTokens(text)
}

function estimateToolCallTokens(message: ClineStorageMessage): number {
	if (!Array.isArray(message.content) || message.role !== "assistant") {
		return 0
	}

	const text = message.content
		.filter((block: any) => block?.type === "tool_use")
		.map((block: any) => `${block.name ?? ""} ${stringifyUnknown(block.input)}`)
		.join("\n")

	return estimateTextTokens(text)
}

export function estimateRequestTokenUsage(systemPrompt: string, messages: ClineStorageMessage[]): RequestTokenEstimate {
	const systemPromptTokens = estimateTextTokens(systemPrompt)
	const skillsTokens = estimateTextTokens(extractSection(systemPrompt, "SKILLS"))
	const toolUseTokens = estimateTextTokens(extractSection(systemPrompt, "TOOL USE"))

	const historyTotal = messages.reduce((sum, message) => sum + estimateMessageTokens(message), 0)
	const lastHumanUserIndex = [...messages].reverse().findIndex((message) => hasHumanFacingUserContent(message))
	const latestHumanUserMessage = lastHumanUserIndex === -1 ? undefined : messages[messages.length - 1 - lastHumanUserIndex]
	const currentUserInputTokens = latestHumanUserMessage ? estimateMessageTokens(latestHumanUserMessage) : 0
	const priorTurnsTokens = Math.max(0, historyTotal - currentUserInputTokens)
	const toolOutputTokens = messages.reduce((sum, message) => sum + estimateToolOutputTokens(message), 0)
	const toolCallTokens = messages.reduce((sum, message) => sum + estimateToolCallTokens(message), 0)

	return {
		estimatedTotal: systemPromptTokens + historyTotal,
		systemPrompt: systemPromptTokens,
		systemSections: {
			skills: skillsTokens,
			toolUse: toolUseTokens,
		},
		history: {
			total: historyTotal,
			priorTurns: priorTurnsTokens,
			currentUserInput: currentUserInputTokens,
			toolOutputs: toolOutputTokens,
			toolCalls: toolCallTokens,
		},
	}
}

export function buildTokenEstimateLogPayload(params: {
	taskId: string
	ulid: string
	apiRequestCount: number
	modelId: string
	providerId: string
	estimate: RequestTokenEstimate
}): TokenEstimateLogPayload {
	return {
		taskId: params.taskId,
		ulid: params.ulid,
		apiRequestCount: params.apiRequestCount,
		modelId: params.modelId,
		providerId: params.providerId,
		...params.estimate,
	}
}
