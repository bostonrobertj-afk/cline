import { isOpenaiReasoningEffort, OPENAI_REASONING_EFFORT_OPTIONS, type OpenaiReasoningEffort } from "@shared/storage/types"
import { getModelReasoningEfforts, resolveModelReasoningEffort } from "@shared/utils/reasoning-support"

export function normalizeCliReasoningEffort(
	value: string | undefined,
	warn: (message: string) => void,
): OpenaiReasoningEffort | undefined {
	if (value === undefined) {
		return undefined
	}

	const normalized = value.toLowerCase()
	if (isOpenaiReasoningEffort(normalized)) {
		return normalized
	}

	warn(`Invalid --reasoning-effort '${value}'. Using 'medium'. Valid values: ${OPENAI_REASONING_EFFORT_OPTIONS.join(", ")}.`)
	return "medium"
}

export function nextReasoningEffort(current: OpenaiReasoningEffort, modelId: string, providerId: string): OpenaiReasoningEffort {
	const options = getModelReasoningEfforts(modelId, providerId)
	const effective = resolveModelReasoningEffort(modelId, providerId, current)
	const index = options.indexOf(effective)
	return options[(index + 1) % options.length] ?? "medium"
}
