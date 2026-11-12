import { getOpenAiNativeModelProfile } from "../openai-native-models"
import { normalizeOpenaiReasoningEffort, type OpenaiReasoningEffort } from "../storage/types"

const DEFAULT_MODEL_REASONING_EFFORTS: readonly OpenaiReasoningEffort[] = ["none", "low", "medium", "high", "xhigh"]

export function supportsReasoningEffortForModel(modelId?: string): boolean {
	if (!modelId) {
		return false
	}

	const id = modelId.toLowerCase()
	return (
		id.includes("gemini") ||
		id.includes("gpt") ||
		id.startsWith("openai/o") ||
		id.includes("/o") ||
		id.startsWith("o") ||
		id.includes("grok")
	)
}

export function getModelReasoningEfforts(modelId: string, providerId: string): readonly OpenaiReasoningEffort[] {
	return getOpenAiNativeModelProfile(modelId, providerId)?.reasoningEfforts ?? DEFAULT_MODEL_REASONING_EFFORTS
}

export function resolveModelReasoningEffort(modelId: string, providerId: string, effort?: string): OpenaiReasoningEffort {
	const normalizedEffort = normalizeOpenaiReasoningEffort(effort)
	if (providerId === "openai-native" && modelId === "gpt-6-astra" && normalizedEffort === "none") {
		return "low"
	}
	return getModelReasoningEfforts(modelId, providerId).find((allowed) => allowed === normalizedEffort) ?? "medium"
}
