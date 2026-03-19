import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import { openAiNativeModels } from "../api"
import { ApiFormat } from "../proto/cline/models"

describe("openAiNativeModels", () => {
	it("uses the Responses API for GPT-5.4 models", () => {
		assert.equal(openAiNativeModels["gpt-5.4-2026-03-05"].apiFormat, ApiFormat.OPENAI_RESPONSES)
		assert.equal(openAiNativeModels["gpt-5.4-mini-2026-03-17"].apiFormat, ApiFormat.OPENAI_RESPONSES)
	})
})
