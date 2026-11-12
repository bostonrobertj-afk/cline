import { expect } from "chai"
import { describe, it } from "mocha"
import { normalizeOpenaiReasoningEffort as normalizeStoredEffort } from "@/core/controller/state/reasoningEffort"
import { openAiCodexModels, openAiNativeDefaultModelId, openAiNativeModels } from "../api"
import { getOpenAiNativeModelProfile, openAiNativeModelProfiles } from "../openai-native-models"
import { ApiFormat } from "../proto/cline/models"
import { OpenaiReasoningEffort as ProtoOpenaiReasoningEffort } from "../proto/cline/state"
import {
	convertApiConfigurationToProto,
	convertProtoToApiConfiguration,
} from "../proto-conversions/models/api-configuration-conversion"
import { isOpenaiReasoningEffort, normalizeOpenaiReasoningEffort, OPENAI_REASONING_EFFORT_OPTIONS } from "../storage/types"
import { getModelReasoningEfforts, resolveModelReasoningEffort } from "../utils/reasoning-support"

const MODEL_IDS = ["gpt-5.5", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"] as const
const LEGACY_EFFORTS = ["none", "low", "medium", "high", "xhigh"] as const
const EFFORTS_BY_MODEL = {
	"gpt-5.5": LEGACY_EFFORTS,
	"gpt-5.6-sol": [...LEGACY_EFFORTS, "max"],
	"gpt-5.6-terra": [...LEGACY_EFFORTS, "max"],
	"gpt-5.6-luna": [...LEGACY_EFFORTS, "max"],
	"gpt-6-astra": ["low", "medium", "high", "xhigh", "max"],
} as const

describe("OpenAI native model profiles", () => {
	it("registers exactly the approved native models", () => {
		expect(Object.keys(openAiNativeModelProfiles)).to.deep.equal(MODEL_IDS)
		for (const id of MODEL_IDS) {
			const profile = openAiNativeModelProfiles[id]
			expect(openAiNativeModels[id]).to.deep.equal(profile.info)
			expect(profile.info.contextWindow).to.equal(1_050_000)
			expect(profile.info.maxTokens).to.equal(128_000)
			expect(profile.info.apiFormat).to.equal(ApiFormat.OPENAI_RESPONSES)
			expect(profile.info.supportsImages).to.equal(true)
			expect(profile.info.supportsPromptCache).to.equal(true)
			expect(profile.info.supportsReasoning).to.equal(true)
			expect(profile.info.supportsTools).to.equal(true)
		}
		expect(openAiNativeDefaultModelId).to.equal("gpt-5.2")
		expect(openAiNativeModels["gpt-5.4-2026-03-05"]).not.to.equal(undefined)
		expect(openAiNativeModels["gpt-5.4-mini-2026-03-17"]).not.to.equal(undefined)
		for (const id of MODEL_IDS) {
			expect(Object.hasOwn(openAiCodexModels, id)).to.equal(false)
		}
	})

	it("uses JSON-safe per-response price tiers", () => {
		const rows = [
			["gpt-5.5", 5, 30, 0.5, undefined],
			["gpt-5.6-sol", 4, 20, 0.4, 5],
			["gpt-5.6-terra", 2, 12, 0.2, 2.5],
			["gpt-5.6-luna", 0.2, 1.2, 0.02, 0.25],
			["gpt-6-astra", 10, 50, 1, 12.5],
		] as const

		for (const [id, inputPrice, outputPrice, cacheReadsPrice, cacheWritesPrice] of rows) {
			const info = openAiNativeModelProfiles[id].info
			expect(info.tiers).to.deep.equal([
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
			])
			const roundTripped = JSON.parse(JSON.stringify(info.tiers))
			expect(roundTripped[1].contextWindow).to.equal(Number.MAX_SAFE_INTEGER)
		}
	})

	it("limits profiles to exact native provider IDs", () => {
		for (const id of MODEL_IDS) {
			expect(getOpenAiNativeModelProfile(id, "openai-native")).to.equal(openAiNativeModelProfiles[id])
			expect(getOpenAiNativeModelProfile(id, "openai")).to.equal(undefined)
			expect(getOpenAiNativeModelProfile(id, "openai-codex")).to.equal(undefined)
			expect(getOpenAiNativeModelProfile(id, "openrouter")).to.equal(undefined)
		}
		for (const id of ["gpt-6", "gpt-6-mini", "gpt-7", "gpt-6-astra-extra", "toString", "__proto__"]) {
			expect(getOpenAiNativeModelProfile(id, "openai-native")).to.equal(undefined)
		}
	})

	it("recognizes the complete effort vocabulary", () => {
		const recognized = ["none", "low", "medium", "high", "xhigh", "max"] as const
		expect(OPENAI_REASONING_EFFORT_OPTIONS).to.deep.equal(recognized)
		for (const effort of recognized) {
			expect(isOpenaiReasoningEffort(effort)).to.equal(true)
			expect(normalizeOpenaiReasoningEffort(effort)).to.equal(effort)
		}
		for (const value of ["MAX", "invalid", undefined, null, 0, {}]) {
			expect(isOpenaiReasoningEffort(value)).to.equal(false)
		}
		expect(normalizeOpenaiReasoningEffort("MAX")).to.equal("max")
		expect(normalizeOpenaiReasoningEffort(undefined)).to.equal("medium")
		expect(normalizeOpenaiReasoningEffort("")).to.equal("medium")
		expect(normalizeOpenaiReasoningEffort("invalid")).to.equal("medium")
	})

	it("resolves only supported native efforts", () => {
		for (const id of MODEL_IDS) {
			const expected = EFFORTS_BY_MODEL[id]
			expect(getModelReasoningEfforts(id, "openai-native")).to.deep.equal(expected)
			for (const effort of expected) {
				expect(resolveModelReasoningEffort(id, "openai-native", effort)).to.equal(effort)
			}
		}
		expect(resolveModelReasoningEffort("gpt-6-astra", "openai-native", "none")).to.equal("low")
		expect(resolveModelReasoningEffort("gpt-6-astra", "openai-native", "NONE")).to.equal("low")
		expect(resolveModelReasoningEffort("gpt-5.5", "openai-native", "max")).to.equal("medium")
		expect(resolveModelReasoningEffort("gpt-5.5", "openai-native", undefined)).to.equal("medium")
		expect(resolveModelReasoningEffort("gpt-5.5", "openai-native", "")).to.equal("medium")
		expect(resolveModelReasoningEffort("gpt-5.5", "openai-native", "invalid")).to.equal("medium")
		for (const id of ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"]) {
			expect(resolveModelReasoningEffort(id, "openai-native", "MAX")).to.equal("max")
		}
	})

	it("preserves unextended provider and model capabilities", () => {
		for (const id of ["gpt-5.4-2026-03-05", "gpt-5.4-mini-2026-03-17", "gpt-5.2", "gpt-7"]) {
			expect(getModelReasoningEfforts(id, "openai-native")).to.deep.equal(LEGACY_EFFORTS)
			for (const effort of LEGACY_EFFORTS) {
				expect(resolveModelReasoningEffort(id, "openai-native", effort)).to.equal(effort)
			}
			for (const effort of ["max", "MAX", "invalid"]) {
				expect(resolveModelReasoningEffort(id, "openai-native", effort)).to.equal("medium")
			}
		}
		for (const id of MODEL_IDS) {
			for (const provider of ["openai", "openai-codex", "openrouter", "vercel-ai-gateway", "cline", "gemini", "vertex"]) {
				expect(getModelReasoningEfforts(id, provider)).to.deep.equal(LEGACY_EFFORTS)
				for (const effort of LEGACY_EFFORTS) {
					expect(resolveModelReasoningEffort(id, provider, effort)).to.equal(effort)
				}
				for (const effort of ["max", "MAX", "invalid"]) {
					expect(resolveModelReasoningEffort(id, provider, effort)).to.equal("medium")
				}
			}
		}
		expect(normalizeOpenaiReasoningEffort("max")).to.equal("max")
		expect(resolveModelReasoningEffort("gpt-6-astra", "openai", "none")).to.equal("none")
	})

	it("round trips model IDs and saved efforts without applying model fallback", () => {
		for (const id of MODEL_IDS) {
			const proto = convertApiConfigurationToProto({
				planModeApiProvider: "openai-native",
				actModeApiProvider: "openai-native",
				planModeApiModelId: id,
				actModeApiModelId: id,
				planModeReasoningEffort: "max",
				actModeReasoningEffort: "none",
			})
			const restored = convertProtoToApiConfiguration(JSON.parse(JSON.stringify(proto)))
			expect(restored.planModeApiModelId).to.equal(id)
			expect(restored.actModeApiModelId).to.equal(id)
			expect(restored.planModeReasoningEffort).to.equal("max")
			expect(restored.actModeReasoningEffort).to.equal("none")
			if (id === "gpt-6-astra") {
				expect(resolveModelReasoningEffort(id, "openai-native", restored.actModeReasoningEffort)).to.equal("low")
				expect(restored.actModeReasoningEffort).to.equal("none")
			}
		}
		expect(normalizeStoredEffort("max")).to.equal("max")
		expect(normalizeStoredEffort("MAX")).to.equal("max")
		expect(normalizeStoredEffort(ProtoOpenaiReasoningEffort.LOW)).to.equal("low")
		expect(normalizeStoredEffort(ProtoOpenaiReasoningEffort.MEDIUM)).to.equal("medium")
		expect(normalizeStoredEffort(ProtoOpenaiReasoningEffort.HIGH)).to.equal("high")
	})
})
