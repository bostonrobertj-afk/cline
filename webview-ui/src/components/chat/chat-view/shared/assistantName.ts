const FALLBACK_ASSISTANT_NAME = "Cline"

export function getActiveAssistantName(
	currentTaskItem?: {
		activeAgentDisplayName?: string | null
	} | null,
): string {
	const displayName = currentTaskItem?.activeAgentDisplayName?.trim()
	return displayName || FALLBACK_ASSISTANT_NAME
}
