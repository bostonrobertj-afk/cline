import type { OpenaiReasoningEffort } from "@shared/storage/types"
import { describe, expect, it, vi } from "vitest"
import { nextReasoningEffort, normalizeCliReasoningEffort } from "./reasoning-effort"

describe("CLI reasoning effort", () => {
	it("parses every recognized effort without a model fallback", () => {
		const warn = vi.fn()
		const rows: Array<[string, OpenaiReasoningEffort]> = [
			["none", "none"],
			["low", "low"],
			["medium", "medium"],
			["high", "high"],
			["xhigh", "xhigh"],
			["max", "max"],
			["MAX", "max"],
		]

		for (const [input, expected] of rows) {
			expect(normalizeCliReasoningEffort(input, warn)).toBe(expected)
		}
		expect(normalizeCliReasoningEffort(undefined, warn)).toBeUndefined()
		expect(warn).not.toHaveBeenCalled()

		expect(normalizeCliReasoningEffort("invalid", warn)).toBe("medium")
		expect(warn).toHaveBeenCalledExactlyOnceWith(
			"Invalid --reasoning-effort 'invalid'. Using 'medium'. Valid values: none, low, medium, high, xhigh, max.",
		)
	})

	it("cycles only supported model efforts", () => {
		const nativeRows: Array<{ modelId: string; efforts: OpenaiReasoningEffort[] }> = [
			{ modelId: "gpt-5.5", efforts: ["none", "low", "medium", "high", "xhigh"] },
			{ modelId: "gpt-5.6-sol", efforts: ["none", "low", "medium", "high", "xhigh", "max"] },
			{ modelId: "gpt-5.6-terra", efforts: ["none", "low", "medium", "high", "xhigh", "max"] },
			{ modelId: "gpt-5.6-luna", efforts: ["none", "low", "medium", "high", "xhigh", "max"] },
			{ modelId: "gpt-6-astra", efforts: ["low", "medium", "high", "xhigh", "max"] },
		]

		for (const { modelId, efforts } of nativeRows) {
			for (const [index, effort] of efforts.entries()) {
				expect(nextReasoningEffort(effort, modelId, "openai-native")).toBe(efforts[(index + 1) % efforts.length])
			}
		}

		const legacyEfforts: OpenaiReasoningEffort[] = ["none", "low", "medium", "high", "xhigh"]
		const legacyRows = [
			{ modelId: "gpt-5.4-mini", providerId: "openai-native" },
			{ modelId: "gpt-5.4", providerId: "openai-native" },
			{ modelId: "gpt-5.2", providerId: "openai-native" },
			{ modelId: "gpt-5.6-sol", providerId: "openai" },
			{ modelId: "gpt-5.6-sol", providerId: "openai-codex" },
			{ modelId: "gpt-5.6-sol", providerId: "openrouter" },
			{ modelId: "gpt-5.6-sol", providerId: "vercel-ai-gateway" },
			{ modelId: "gpt-5.6-sol", providerId: "cline" },
			{ modelId: "gpt-5.6-sol", providerId: "gemini" },
			{ modelId: "gpt-5.6-sol", providerId: "vertex" },
		]

		for (const { modelId, providerId } of legacyRows) {
			for (const [index, effort] of legacyEfforts.entries()) {
				expect(nextReasoningEffort(effort, modelId, providerId)).toBe(legacyEfforts[(index + 1) % legacyEfforts.length])
			}
		}
	})

	it("cycles from the effective value without rewriting the input preference", () => {
		const rows: Array<{
			configuration: { saved: OpenaiReasoningEffort; modelId: string; providerId: string }
			expected: OpenaiReasoningEffort
		}> = [
			{ configuration: { saved: "none", modelId: "gpt-6-astra", providerId: "openai-native" }, expected: "medium" },
			{ configuration: { saved: "max", modelId: "gpt-5.5", providerId: "openai-native" }, expected: "high" },
			{ configuration: { saved: "max", modelId: "gpt-5.6-sol", providerId: "openai" }, expected: "high" },
		]

		for (const { configuration, expected } of rows) {
			const originalSaved = configuration.saved
			expect(nextReasoningEffort(configuration.saved, configuration.modelId, configuration.providerId)).toBe(expected)
			expect(configuration.saved).toBe(originalSaved)
		}
	})
})
