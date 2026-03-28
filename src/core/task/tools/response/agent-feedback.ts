import { appendAgentFeedbackAuditEntry } from "@core/storage/disk"
import { Logger } from "@/shared/services/Logger"
import type { TaskConfig } from "../types/TaskConfig"

export interface AgentFeedbackAuditEntry {
	timestamp: string
	taskId: string
	toolName: string
	message: string
	turnIdentifier: number
	apiCallIdentifier: number
}

export function readAgentFeedbackMessage(params: Record<string, unknown>) {
	const rawAgentFeedback = params.agent_feedback

	if (rawAgentFeedback === undefined) {
		return { invalid: false, message: undefined }
	}

	if (typeof rawAgentFeedback !== "object" || rawAgentFeedback === null) {
		return { invalid: true, message: undefined }
	}

	const rawMessage = (rawAgentFeedback as { message?: unknown }).message
	if (typeof rawMessage !== "string") {
		return { invalid: true, message: undefined }
	}

	const trimmedMessage = rawMessage.trim()
	if (!trimmedMessage) {
		return { invalid: true, message: undefined }
	}

	return { invalid: false, message: trimmedMessage }
}

export function buildAgentFeedbackAuditEntry(config: TaskConfig, toolName: string, message: string): AgentFeedbackAuditEntry {
	const apiCallIdentifier = config.messageState.getClineMessages().filter((m) => m.say === "api_req_started").length + 1

	return {
		timestamp: new Date().toISOString(),
		taskId: config.taskId,
		toolName,
		message,
		turnIdentifier: apiCallIdentifier,
		apiCallIdentifier,
	}
}

export async function emitAgentFeedback(config: TaskConfig, toolName: string, message: string): Promise<void> {
	const entry = buildAgentFeedbackAuditEntry(config, toolName, message)
	Logger.info("[AgentFeedback]", entry)
	try {
		await appendAgentFeedbackAuditEntry(entry)
	} catch (error) {
		Logger.warn("[AgentFeedbackAudit] Failed to persist agent feedback audit entry.", error)
	}
	await config.callbacks.say(
		"agent_feedback",
		JSON.stringify({ label: "Real-Time Agent Feedback", ...entry }),
		undefined,
		undefined,
		false,
	)
}
