import type { OpenAiCompatibleModelInfo } from "./api"
import { ApiFormat } from "./proto/cline/models"
import type { OpenaiReasoningEffort } from "./storage/types"

export interface OpenAiNativeModelProfile {
	info: OpenAiCompatibleModelInfo
	reasoningEfforts: readonly OpenaiReasoningEffort[]
	gpt54Behavior: true
}

function createModelInfo(
	name: string,
	inputPrice: number,
	outputPrice: number,
	cacheReadsPrice: number,
	cacheWritesPrice?: number,
): OpenAiCompatibleModelInfo {
	return {
		name,
		maxTokens: 128_000,
		contextWindow: 1_050_000,
		supportsImages: true,
		supportsPromptCache: true,
		supportsReasoning: true,
		supportsReasoningEffort: true,
		supportsTools: true,
		apiFormat: ApiFormat.OPENAI_RESPONSES,
		systemRole: "developer",
		inputPrice,
		outputPrice,
		cacheReadsPrice,
		...(cacheWritesPrice !== undefined ? { cacheWritesPrice } : {}),
		tiers: [
			{
				contextWindow: 272_000,
				inputPrice,
				outputPrice,
				cacheReadsPrice,
				...(cacheWritesPrice !== undefined ? { cacheWritesPrice } : {}),
			},
			{
				contextWindow: Number.MAX_SAFE_INTEGER,
				inputPrice: inputPrice * 2,
				outputPrice: outputPrice * 1.5,
				cacheReadsPrice: cacheReadsPrice * 2,
				...(cacheWritesPrice !== undefined ? { cacheWritesPrice: cacheWritesPrice * 2 } : {}),
			},
		],
	}
}

export const openAiNativeModelProfiles = {
	"gpt-5.5": {
		info: createModelInfo("GPT-5.5", 5, 30, 0.5),
		reasoningEfforts: ["none", "low", "medium", "high", "xhigh"],
		gpt54Behavior: true,
	},
	"gpt-5.6-sol": {
		info: createModelInfo("GPT-5.6 Sol", 4, 20, 0.4, 5),
		reasoningEfforts: ["none", "low", "medium", "high", "xhigh", "max"],
		gpt54Behavior: true,
	},
	"gpt-5.6-terra": {
		info: createModelInfo("GPT-5.6 Terra", 2, 12, 0.2, 2.5),
		reasoningEfforts: ["none", "low", "medium", "high", "xhigh", "max"],
		gpt54Behavior: true,
	},
	"gpt-5.6-luna": {
		info: createModelInfo("GPT-5.6 Luna", 0.2, 1.2, 0.02, 0.25),
		reasoningEfforts: ["none", "low", "medium", "high", "xhigh", "max"],
		gpt54Behavior: true,
	},
	"gpt-6-astra": {
		info: createModelInfo("GPT-6 Astra", 10, 50, 1, 12.5),
		reasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
		gpt54Behavior: true,
	},
} satisfies Record<string, OpenAiNativeModelProfile>

const profilesById: ReadonlyMap<string, OpenAiNativeModelProfile> = new Map<string, OpenAiNativeModelProfile>(
	Object.entries(openAiNativeModelProfiles),
)

export function getOpenAiNativeModelProfile(modelId: string, providerId: string): OpenAiNativeModelProfile | undefined {
	return providerId === "openai-native" ? profilesById.get(modelId) : undefined
}

export const extendedOpenAiNativeModels = {
	"gpt-5.5": openAiNativeModelProfiles["gpt-5.5"].info,
	"gpt-5.6-sol": openAiNativeModelProfiles["gpt-5.6-sol"].info,
	"gpt-5.6-terra": openAiNativeModelProfiles["gpt-5.6-terra"].info,
	"gpt-5.6-luna": openAiNativeModelProfiles["gpt-5.6-luna"].info,
	"gpt-6-astra": openAiNativeModelProfiles["gpt-6-astra"].info,
}
