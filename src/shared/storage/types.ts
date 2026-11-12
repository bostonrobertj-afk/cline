export const OPENAI_REASONING_EFFORT_OPTIONS = ["none", "low", "medium", "high", "xhigh", "max"] as const

export type OpenaiReasoningEffort = (typeof OPENAI_REASONING_EFFORT_OPTIONS)[number]

export function isOpenaiReasoningEffort(value: unknown): value is OpenaiReasoningEffort {
	return OPENAI_REASONING_EFFORT_OPTIONS.some((allowed) => allowed === value)
}

export function normalizeOpenaiReasoningEffort(effort?: string): OpenaiReasoningEffort {
	const value = (effort || "medium").toLowerCase()
	return isOpenaiReasoningEffort(value) ? value : "medium"
}

export const OPENAI_REASONING_SUMMARY_OPTIONS = ["none", "auto", "concise", "detailed"] as const

export type OpenaiReasoningSummary = (typeof OPENAI_REASONING_SUMMARY_OPTIONS)[number]

export function isOpenaiReasoningSummary(value: unknown): value is OpenaiReasoningSummary {
	return typeof value === "string" && OPENAI_REASONING_SUMMARY_OPTIONS.includes(value as OpenaiReasoningSummary)
}

export function normalizeOpenaiReasoningSummary(summary?: string): OpenaiReasoningSummary {
	const value = (summary || "auto").toLowerCase()
	return isOpenaiReasoningSummary(value) ? value : "auto"
}

export type Mode = "plan" | "act"
