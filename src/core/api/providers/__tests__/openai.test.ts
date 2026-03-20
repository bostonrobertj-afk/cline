import "should"
import sinon from "sinon"
import { Logger } from "@/shared/services/Logger"
import { OpenAiHandler } from "../openai"

describe("OpenAiHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	const createAsyncIterable = (data: any[] = []) => ({
		[Symbol.asyncIterator]: async function* () {
			yield* data
		},
	})

	it("should preserve response call_id on Responses API function calls", async () => {
		const handler = new OpenAiHandler({
			openAiApiKey: "test-api-key",
			openAiModelId: "gpt-5",
		})

		const fakeClient = {
			responses: {
				create: sinon.stub().resolves(
					createAsyncIterable([
						{
							type: "response.output_item.done",
							output_index: 0,
							item: {
								type: "function_call",
								id: "fc_test_123",
								call_id: "call_test_123",
								name: "read_file",
								arguments: '{"path":"README.md"}',
							},
						},
						{
							type: "response.completed",
							response: {
								id: "resp_test_123",
								usage: {
									input_tokens: 10,
									output_tokens: 5,
								},
							},
						},
					]),
				),
			},
		}
		sinon.stub(handler as any, "ensureClient").returns(fakeClient as any)

		const chunks: any[] = []
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

		for await (const chunk of handler.createMessage("system", [{ role: "user", content: "hi" }] as any, tools)) {
			chunks.push(chunk)
		}

		const toolCallChunk = chunks.find((chunk) => chunk.type === "tool_calls")
		toolCallChunk.should.not.equal(undefined)
		toolCallChunk.tool_call.call_id.should.equal("call_test_123")
		toolCallChunk.tool_call.function.id.should.equal("fc_test_123")
		toolCallChunk.tool_call.function.name.should.equal("read_file")
		toolCallChunk.tool_call.function.arguments.should.equal('{"path":"README.md"}')
	})

	it("should omit max_output_tokens when it only matches the catalog default for gpt-5.4 mini", async () => {
		const handler = new OpenAiHandler({
			openAiApiKey: "test-api-key",
			openAiModelId: "gpt-5.4-mini-2026-03-17",
			openAiModelInfo: {
				maxTokens: 128_000,
				contextWindow: 400_000,
				supportsPromptCache: true,
			},
		})

		const createStub = sinon.stub().resolves(
			createAsyncIterable([
				{
					type: "response.completed",
					response: {
						id: "resp_test_omit_max_tokens",
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

		const request = createStub.firstCall.args[0]
		should(request).not.have.property("max_output_tokens")
	})

	it("should preserve an explicit reduced max_output_tokens cap below the catalog default", async () => {
		const handler = new OpenAiHandler({
			openAiApiKey: "test-api-key",
			openAiModelId: "gpt-5.4-mini-2026-03-17",
			openAiModelInfo: {
				maxTokens: 16_384,
				contextWindow: 400_000,
				supportsPromptCache: true,
			},
		})

		const createStub = sinon.stub().resolves(
			createAsyncIterable([
				{
					type: "response.completed",
					response: {
						id: "resp_test_preserve_max_tokens",
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

		const request = createStub.firstCall.args[0]
		request.max_output_tokens.should.equal(16_384)
	})

	it("should log production-readable request path details without previous_response_id", async () => {
		const handler = new OpenAiHandler({
			openAiApiKey: "test-api-key",
			openAiModelId: "gpt-5.4-mini-2026-03-17",
		})

		const createStub = sinon.stub().resolves(
			createAsyncIterable([
				{
					type: "response.completed",
					response: {
						id: "resp_test_logging_no_prev",
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
		const infoStub = sinon.stub(Logger, "info")

		for await (const _chunk of handler.createMessage("system", [{ role: "user", content: "hi" }] as any, [])) {
			// drain
		}

		infoStub.called.should.equal(true)
		infoStub.firstCall.args[0].should.containEql("[OpenAI] Responses request path")
		infoStub.firstCall.args[0].should.containEql('"usingPreviousResponseId":false')
		infoStub.firstCall.args[0].should.containEql('"usingFullHistoryFallback":false')
		infoStub.secondCall.args[0].should.containEql("[OpenAI] Responses request completed without previous_response_id")
	})

	it("should log fallback usage when previous_response_id retry falls back to full history", async () => {
		const handler = new OpenAiHandler({
			openAiApiKey: "test-api-key",
			openAiModelId: "gpt-5.4-mini-2026-03-17",
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
							id: "resp_test_logging_fallback",
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
		sinon.stub(Logger, "info")
		const warnStub = sinon.stub(Logger, "warn")
		const errorStub = sinon.stub(Logger, "error")

		const messages = [
			{
				role: "assistant",
				content: "prior",
				id: "resp_prev_chain",
				ts: Date.now(),
				modelInfo: { providerId: "openai" },
			},
			{
				role: "user",
				content: "continue",
			},
		] as any

		for await (const _chunk of handler.createMessage("system", messages, [])) {
			// drain
		}

		errorStub.firstCall.args[0].should.containEql("[OpenAI] Responses request failed")
		errorStub.firstCall.args[0].should.containEql('"code":"previous_response_not_found"')
		warnStub.firstCall.args[0].should.containEql("[OpenAI] Retrying with full-history fallback")
		warnStub.firstCall.args[0].should.containEql('"usingFullHistoryFallback":true')
		createStub.callCount.should.equal(2)
	})

	it("should include reasoning and cached tokens in Responses API usage chunks", async () => {
		const handler = new OpenAiHandler({
			openAiApiKey: "test-api-key",
			openAiModelId: "gpt-5.4-2026-03-05",
			openAiModelInfo: {
				contextWindow: 1_000_000,
				maxTokens: 128_000,
				supportsPromptCache: true,
				inputPrice: 5,
				outputPrice: 22.5,
				cacheReadsPrice: 0.5,
			},
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
									input_tokens: 90,
									input_tokens_details: {
										cached_tokens: 15,
									},
									output_tokens: 25,
									output_tokens_details: {
										reasoning_tokens: 35,
									},
								},
							},
						},
					]),
				),
			},
		}
		sinon.stub(handler as any, "ensureClient").returns(fakeClient as any)

		const chunks: any[] = []
		for await (const chunk of handler.createMessage("system", [{ role: "user", content: "hi" }] as any, [])) {
			chunks.push(chunk)
		}

		const usageChunk = chunks.find((chunk) => chunk.type === "usage")
		usageChunk.should.not.equal(undefined)
		usageChunk.inputTokens.should.equal(75)
		usageChunk.cacheReadTokens.should.equal(15)
		usageChunk.outputTokens.should.equal(60)
		usageChunk.totalCost.should.be.a.Number()
	})
})
