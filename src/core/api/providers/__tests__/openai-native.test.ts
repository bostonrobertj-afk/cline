import "should"
import sinon from "sinon"
import { Logger } from "@/shared/services/Logger"
import { OpenAiNativeHandler } from "../openai-native"

describe("OpenAiNativeHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	const createAsyncIterable = (data: any[] = []) => ({
		[Symbol.asyncIterator]: async function* () {
			yield* data
		},
	})

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

	it("should retry with full context when OpenAI reports a missing tool output for a chained function call", () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-mini-2026-03-17",
		})

		const shouldRetry = (handler as any).shouldRetryWithFullContext(
			new Error("400 No tool output found for function call call_jFR9GQbj4wRVT6jV03mQelcY."),
			true,
		)

		shouldRetry.should.equal(true)
	})

	it("should log production-readable native request path details without previous_response_id", async () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-mini-2026-03-17",
		})

		const createStub = sinon.stub().resolves(
			createAsyncIterable([
				{
					type: "response.completed",
					response: {
						id: "resp_native_logging_no_prev",
						usage: {
							input_tokens: 10,
							output_tokens: 5,
						},
					},
				},
			]),
		)
		const fakeClient = {
			responses: {
				create: createStub,
			},
		}
		sinon.stub(handler as any, "ensureClient").returns(fakeClient as any)
		sinon.stub(handler as any, "useWebsocketMode").returns(false)
		const infoStub = sinon.stub(Logger, "info")

		const tools = [
			{
				type: "function",
				function: {
					name: "read_file",
					description: "Read a file",
					parameters: { type: "object" },
				},
			},
		] as any

		for await (const _chunk of handler.createMessage("system", [{ role: "user", content: "hi" }] as any, tools)) {
			// drain
		}

		infoStub.called.should.equal(true)
		infoStub.firstCall.args[0].should.containEql("[OpenAI] Native Responses request path")
		infoStub.firstCall.args[0].should.containEql('"usingPreviousResponseId":false')
		infoStub.firstCall.args[0].should.containEql('"usingFullHistoryFallback":false')
		infoStub
			.getCalls()
			.some((call) => call.args[0].includes("[OpenAI] Native Responses request completed without previous_response_id"))
			.should.equal(true)
		infoStub
			.getCalls()
			.some((call) => call.args[0].includes("Total tokens from Responses API usage:"))
			.should.equal(true)
	})

	it("should log native fallback usage when previous_response_id retry falls back to full history", async () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-mini-2026-03-17",
		})

		const createStub = sinon
			.stub()
			.onFirstCall()
			.rejects({ code: "previous_response_not_found", message: "missing response chain", status: 404 })
			.onSecondCall()
			.resolves(
				createAsyncIterable([
					{
						type: "response.completed",
						response: {
							id: "resp_native_logging_fallback",
							usage: {
								input_tokens: 10,
								output_tokens: 5,
							},
						},
					},
				]),
			)

		const fakeClient = {
			responses: {
				create: createStub,
			},
		}
		sinon.stub(handler as any, "ensureClient").returns(fakeClient as any)
		sinon.stub(handler as any, "useWebsocketMode").returns(false)
		sinon.stub(Logger, "info")
		const warnStub = sinon.stub(Logger, "warn")
		const errorStub = sinon.stub(Logger, "error")

		const messages = [
			{
				role: "assistant",
				content: "prior",
				id: "resp_prev_chain",
				ts: Date.now(),
				modelInfo: { providerId: "openai-native" },
			},
			{
				role: "user",
				content: "continue",
			},
		] as any

		const tools = [
			{
				type: "function",
				function: {
					name: "read_file",
					description: "Read a file",
					parameters: { type: "object" },
				},
			},
		] as any

		for await (const _chunk of handler.createMessage("system", messages, tools)) {
			// drain
		}

		errorStub.firstCall.args[0].should.containEql("[OpenAI] Native Responses request failed")
		errorStub.firstCall.args[0].should.containEql('"code":"previous_response_not_found"')
		warnStub.firstCall.args[0].should.containEql("[OpenAI] Native retrying with full-history fallback")
		warnStub.firstCall.args[0].should.containEql('"usingFullHistoryFallback":true')
		createStub.callCount.should.equal(2)
	})

	it("should include reasoning tokens in Responses API output usage totals", async () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-2026-03-05",
		})

		const fakeClient = {
			responses: {
				create: sinon.stub().resolves(
					createAsyncIterable([
						{
							type: "response.completed",
							response: {
								id: "resp_reasoning_usage",
								usage: {
									input_tokens: 120,
									input_tokens_details: {
										cached_tokens: 20,
									},
									output_tokens: 30,
									output_tokens_details: {
										reasoning_tokens: 70,
									},
									total_tokens: 220,
								},
							},
						},
					]),
				),
			},
		}
		sinon.stub(handler as any, "ensureClient").returns(fakeClient as any)
		sinon.stub(handler as any, "useWebsocketMode").returns(false)

		const tools = [
			{
				type: "function",
				function: {
					name: "read_file",
					description: "Read a file",
					parameters: { type: "object" },
				},
			},
		] as any

		const chunks: any[] = []
		for await (const chunk of handler.createMessage("system", [{ role: "user", content: "hi" }] as any, tools)) {
			chunks.push(chunk)
		}

		const usageChunk = chunks.find((chunk) => chunk.type === "usage")
		usageChunk.should.not.equal(undefined)
		usageChunk.inputTokens.should.equal(100)
		usageChunk.cacheReadTokens.should.equal(20)
		usageChunk.outputTokens.should.equal(100)
	})

	it("should avoid duplicating Responses function call arguments when delta and done events both arrive", async () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-mini-2026-03-17",
		})

		const chunks = createAsyncIterable([
			{
				type: "response.output_item.added",
				item: {
					type: "function_call",
					id: "fc_test_123",
					call_id: "call_test_123",
					name: "complete_workflow_item",
					arguments: "",
				},
			},
			{
				type: "response.function_call_arguments.delta",
				item_id: "fc_test_123",
				delta: '{"item_id":"step-1"}',
			},
			{
				type: "response.function_call_arguments.done",
				item_id: "fc_test_123",
				name: "complete_workflow_item",
				arguments: '{"item_id":"step-1"}',
			},
			{
				type: "response.output_item.done",
				item: {
					type: "function_call",
					id: "fc_test_123",
					call_id: "call_test_123",
					name: "complete_workflow_item",
					arguments: '{"item_id":"step-1"}',
				},
			},
		] as any[])

		const toolCallChunks: any[] = []
		for await (const chunk of (handler as any).processResponsesEvents(chunks as any, handler.getModel().info)) {
			if (chunk.type === "tool_calls") {
				toolCallChunks.push(chunk)
			}
		}

		toolCallChunks.should.have.length(1)
		toolCallChunks[0].tool_call.call_id.should.equal("call_test_123")
		toolCallChunks[0].tool_call.function.name.should.equal("complete_workflow_item")
		toolCallChunks[0].tool_call.function.arguments.should.equal('{"item_id":"step-1"}')
	})
})
