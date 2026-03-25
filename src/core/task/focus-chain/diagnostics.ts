import { Logger } from "@/shared/services/Logger"

export interface FocusChainDiagnosticEvent {
	event: string
	ts: number
	taskId: string
	data: Record<string, unknown>
}

export function formatFocusChainDiagnosticOutputLine(taskId: string, event: string, data: Record<string, unknown>): string {
	return `[Task ${taskId}] [focus-chain-diagnostics] ${event} ${JSON.stringify(data)}`
}

export function summarizeFocusChainText(text: string | undefined): {
	length: number
	containsTodoListUpdateSuggested: boolean
	containsCurrentWorkflowStep: boolean
} {
	const content = text ?? ""
	return {
		length: content.length,
		containsTodoListUpdateSuggested: content.includes("TODO LIST UPDATE SUGGESTED"),
		containsCurrentWorkflowStep: content.includes("# CURRENT WORKFLOW STEP"),
	}
}

export function summarizeFocusChainTextBlocks(blocks: Array<{ type?: string; text?: string }>): {
	textBlockCount: number
	containsTodoListUpdateSuggested: boolean
	containsCurrentWorkflowStep: boolean
} {
	const textBlocks = blocks.filter((block) => block.type === "text" && typeof block.text === "string")
	return {
		textBlockCount: textBlocks.length,
		containsTodoListUpdateSuggested: textBlocks.some((block) => block.text!.includes("TODO LIST UPDATE SUGGESTED")),
		containsCurrentWorkflowStep: textBlocks.some((block) => block.text!.includes("# CURRENT WORKFLOW STEP")),
	}
}

export function logFocusChainDiagnosticEvent(taskId: string, event: string, data: Record<string, unknown>): void {
	const record: FocusChainDiagnosticEvent = {
		event,
		ts: Date.now(),
		taskId,
		data,
	}
	Logger.info(formatFocusChainDiagnosticOutputLine(taskId, event, record.data))
}
