import { ApiHandler } from "@core/api"
import { OpenAiHandler } from "@core/api/providers/openai"

/**
 * Gets context window information for the given API handler
 *
 * @param api The API handler to get context window information for
 * @returns An object containing the raw context window size and the effective max allowed size
 */
export function getContextWindowInfo(api: ApiHandler) {
	let contextWindow = api.getModel().info.contextWindow || 128_000
	// FIXME: hack to get anyone using openai compatible with deepseek to have the proper context window instead of the default 128k. We need a way for the user to specify the context window for models they input through openai compatible

	// Handle special cases like DeepSeek
	if (api instanceof OpenAiHandler && api.getModel().id.toLowerCase().includes("deepseek")) {
		contextWindow = 128_000
	}

	let maxAllowedSize: number
	switch (contextWindow) {
		case 64_000: // deepseek models
			maxAllowedSize = contextWindow - 27_000
			break
		case 128_000: // most models
			maxAllowedSize = contextWindow - 30_000
			break
		case 200_000: // claude models
			maxAllowedSize = contextWindow - 40_000
			break
		default:
			maxAllowedSize = Math.max(contextWindow - 40_000, contextWindow * 0.8) // for deepseek, 80% of 64k meant only ~10k buffer which was too small and resulted in users getting context window errors.
	}

	return { contextWindow, maxAllowedSize }
}

/**
 * Determines whether an OpenAI Responses request should include an explicit max_output_tokens cap.
 *
 * For long-running GPT-5 threads, treating the model's published max output capability as a per-turn
 * default can unnecessarily shrink the usable input window. We therefore only preserve an explicit cap
 * when it is lower than the model's capability ceiling.
 */
export function getSafeOpenAIResponsesMaxOutputTokens(options: {
	contextWindow?: number
	configuredMaxTokens?: number
	capabilityMaxTokens?: number
}): number | undefined {
	const configuredMaxTokens = options.configuredMaxTokens
	if (!configuredMaxTokens || configuredMaxTokens <= 0) {
		return undefined
	}

	const capabilityMaxTokens = options.capabilityMaxTokens
	if (capabilityMaxTokens && configuredMaxTokens >= capabilityMaxTokens) {
		return undefined
	}

	if (!options.contextWindow || options.contextWindow <= 0) {
		return configuredMaxTokens
	}

	// Keep obviously invalid caps from exceeding the full request window even when a reduced explicit cap is set.
	return Math.min(configuredMaxTokens, options.contextWindow)
}
