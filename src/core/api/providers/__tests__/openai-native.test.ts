import "should"
import { OpenAiNativeHandler } from "../openai-native"

describe("OpenAiNativeHandler", () => {
	it("should keep HTTP response chains stored across tool turns", () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-2026-03-05",
		})

		const params = (handler as any).buildResponseCreateParams({
			modelId: "gpt-5.4-2026-03-05",
			systemPrompt: "system",
			input: [],
			tools: [],
			previousResponseId: "resp_123",
			store: true,
		})

		params.store.should.equal(true)
		params.previous_response_id.should.equal("resp_123")
	})

	it("should retry with full context when OpenAI reports a missing stored item", () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-2026-03-05",
		})

		const shouldRetry = (handler as any).shouldRetryWithFullContext(new Error("404 Item with id 'rs_123' not found."), true)

		shouldRetry.should.equal(true)
	})
})
