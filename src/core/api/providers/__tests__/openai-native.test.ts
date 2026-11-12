import { strict as assert } from "node:assert"
import "should"
import type OpenAI from "openai"
import type { ChatCompletionTool } from "openai/resources/chat/completions"
import sinon from "sinon"
import type { MessageStateHandler } from "@/core/task/message-state"
import { updateApiReqMsg } from "@/core/task/utils"
import { openAiNativeModels } from "@/shared/api"
import type { ClineMessage } from "@/shared/ExtensionMessage"
import { getApiMetrics, getLastApiReqTotalTokens } from "@/shared/getApiMetrics"
import type { ClineStorageMessage } from "@/shared/messages/content"
import { Logger } from "@/shared/services/Logger"
import { calculateApiCostOpenAI } from "@/utils/cost"
import type { ApiStream, ApiStreamChunk } from "../../transform/stream"
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
	const MODEL_IDS = ["gpt-5.5", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"] as const
	const readTool: ChatCompletionTool[] = [
		{
			type: "function",
			function: {
				name: "read_file",
				description: "Read a file",
				parameters: {
					type: "object",
					properties: { path: { type: "string" } },
					required: ["path"],
					additionalProperties: false,
				},
			},
		},
	]
	const collect = async (stream: ApiStream): Promise<ApiStreamChunk[]> => {
		const chunks: ApiStreamChunk[] = []
		for await (const chunk of stream) {
			chunks.push(chunk)
		}
		return chunks
	}
	const interruptedHistory = (modelId: string): ClineStorageMessage[] => [
		{ role: "user", content: "hi" },
		{
			role: "assistant",
			id: "resp_early",
			modelInfo: { providerId: "openai-native", modelId, mode: "act" },
			content: [
				{
					type: "tool_use",
					id: "fc_1",
					call_id: "call_1",
					name: "read_file",
					input: { path: "README.md" },
				},
			],
		},
		{
			role: "user",
			content: [
				{
					type: "tool_result",
					tool_use_id: "fc_1",
					call_id: "call_1",
					content: "file contents",
				},
			],
		},
	]

	for (const id of MODEL_IDS) {
		it(`${id} uses stored HTTP Responses and the selected model`, async () => {
			const handler = new OpenAiNativeHandler({ openAiNativeApiKey: "test-api-key", apiModelId: id })
			const createStub = sinon.stub().resolves(createAsyncIterable([]))
			sinon.stub(handler as any, "ensureClient").returns({ responses: { create: createStub } } as any)
			sinon.stub(handler as any, "useWebsocketMode").returns(false)

			await collect(handler.createMessage("system", [{ role: "user", content: "hi" }], readTool))

			assert.equal(handler.getModel().id, id)
			assert.equal(createStub.callCount, 1)
			const request = createStub.firstCall.args[0]
			assert.equal(request.model, id)
			assert.equal(request.store, true)
			assert.equal(request.stream, true)
			assert.equal(request.instructions, "system")
			assert.deepEqual(request.tools, [
				{
					type: "function",
					name: "read_file",
					description: "Read a file",
					parameters: {
						type: "object",
						properties: { path: { type: "string" } },
						required: ["path"],
						additionalProperties: false,
					},
					strict: true,
				},
			])
			assert.deepEqual(request.context_management, [{ type: "compaction", compact_threshold: 120_000 }])
			for (const key of [
				"temperature",
				"top_p",
				"top_logprobs",
				"include",
				"max_output_tokens",
				"service_tier",
				"prompt_cache_options",
				"previous_response_id",
			]) {
				assert.equal(key in request, false)
			}
		})

		it(`${id} enforces native tools`, async () => {
			const handler = new OpenAiNativeHandler({ openAiNativeApiKey: "test-api-key", apiModelId: id })
			const createStub = sinon.stub().resolves(createAsyncIterable([]))
			sinon.stub(handler as any, "ensureClient").returns({ responses: { create: createStub } } as any)
			sinon.stub(handler as any, "useWebsocketMode").returns(false)

			await assert.rejects(() => collect(handler.createMessage("system", [{ role: "user", content: "hi" }], undefined)), {
				message: "Native Tool Call must be enabled in your setting for OpenAI Responses API",
			})
			assert.equal(createStub.callCount, 0)
		})

		it(`${id} transmits model-supported effort`, () => {
			const expectedByInput: ReadonlyArray<readonly [string, string]> =
				id === "gpt-5.5"
					? [
							["none", "none"],
							["low", "low"],
							["medium", "medium"],
							["high", "high"],
							["xhigh", "xhigh"],
							["max", "medium"],
							["invalid", "medium"],
						]
					: id === "gpt-6-astra"
						? [
								["none", "low"],
								["low", "low"],
								["medium", "medium"],
								["high", "high"],
								["xhigh", "xhigh"],
								["max", "max"],
								["invalid", "medium"],
							]
						: [
								["none", "none"],
								["low", "low"],
								["medium", "medium"],
								["high", "high"],
								["xhigh", "xhigh"],
								["max", "max"],
								["invalid", "medium"],
							]

			for (const [input, expected] of expectedByInput) {
				const handler = new OpenAiNativeHandler({
					openAiNativeApiKey: "test-api-key",
					apiModelId: id,
					reasoningEffort: input,
				})
				const params = (handler as any).buildResponseCreateParams({
					modelId: id,
					modelInfo: handler.getModel().info,
					systemPrompt: "system",
					input: [],
					tools: [],
					store: true,
				})
				assert.equal(params.reasoning.effort, expected)
				assert.equal(params.reasoning.summary, "auto")
			}

			const noSummaryHandler = new OpenAiNativeHandler({
				openAiNativeApiKey: "test-api-key",
				apiModelId: id,
				reasoningEffort: "medium",
				reasoningSummary: "none",
			})
			const noSummaryParams = (noSummaryHandler as any).buildResponseCreateParams({
				modelId: id,
				modelInfo: noSummaryHandler.getModel().info,
				systemPrompt: "system",
				input: [],
				tools: [],
				store: true,
			})
			assert.equal("summary" in noSummaryParams.reasoning, false)
		})

		it(`${id} continues an interrupted tool turn from its early response ID`, async () => {
			const handler = new OpenAiNativeHandler({ openAiNativeApiKey: "test-api-key", apiModelId: id })
			const firstEvents = [
				{ type: "response.created", response: { id: "resp_early" } },
				{ type: "response.in_progress", response: { id: "resp_early" } },
				{
					type: "response.output_item.added",
					item: { type: "function_call", id: "fc_1", call_id: "call_1", name: "read_file", arguments: "" },
				},
				{ type: "response.function_call_arguments.delta", item_id: "fc_1", delta: '{"path":"README.md"}' },
			]
			const createStub = sinon.stub()
			createStub.onFirstCall().resolves(createAsyncIterable(firstEvents))
			createStub.onSecondCall().resolves(createAsyncIterable([]))
			sinon.stub(handler as any, "ensureClient").returns({ responses: { create: createStub } } as any)
			sinon.stub(handler as any, "useWebsocketMode").returns(false)

			const firstChunks = await collect(handler.createMessage("system", [{ role: "user", content: "hi" }], readTool))
			const responseIds = firstChunks.filter((chunk) => chunk.type === "response_id")
			assert.deepEqual(responseIds, [{ type: "response_id", id: "resp_early" }])
			assert.ok(
				firstChunks.findIndex((chunk) => chunk.type === "response_id") <
					firstChunks.findIndex((chunk) => chunk.type === "tool_calls"),
			)

			await collect(handler.createMessage("system", interruptedHistory(id), readTool))
			assert.equal(createStub.callCount, 2)
			const request = createStub.secondCall.args[0]
			assert.equal(request.previous_response_id, "resp_early")
			assert.ok(Array.isArray(request.input))
			const output = request.input.find((item: OpenAI.Responses.ResponseInputItem) => item.type === "function_call_output")
			assert.ok(output && output.type === "function_call_output")
			assert.equal(output.call_id, "call_1")
			assert.equal(output.output, "file contents")
			assert.equal(
				request.input.some((item: OpenAI.Responses.ResponseInputItem) => item.type === "function_call"),
				false,
			)
			assert.equal(JSON.stringify(request.input).includes('"hi"'), false)
		})

		it(`${id} retains broken-chain recovery`, async () => {
			const handler = new OpenAiNativeHandler({ openAiNativeApiKey: "test-api-key", apiModelId: id })
			const createStub = sinon.stub()
			createStub
				.onFirstCall()
				.rejects({ code: "previous_response_not_found", message: "missing response chain", status: 404 })
			createStub.onSecondCall().resolves(createAsyncIterable([]))
			sinon.stub(handler as any, "ensureClient").returns({ responses: { create: createStub } } as any)
			sinon.stub(handler as any, "useWebsocketMode").returns(false)

			await collect(handler.createMessage("system", interruptedHistory(id), readTool))
			assert.equal(createStub.callCount, 2)
			const firstRequest = createStub.firstCall.args[0]
			const secondRequest = createStub.secondCall.args[0]
			assert.equal(firstRequest.previous_response_id, "resp_early")
			assert.equal("previous_response_id" in secondRequest, false)
			assert.ok(Array.isArray(secondRequest.input))
			assert.equal(JSON.stringify(secondRequest.input).includes('"hi"'), true)
			const functionCall = secondRequest.input.find(
				(item: OpenAI.Responses.ResponseInputItem) => item.type === "function_call",
			)
			assert.ok(functionCall && functionCall.type === "function_call")
			assert.equal(functionCall.call_id, "call_1")
			assert.equal(functionCall.name, "read_file")
			const output = secondRequest.input.find(
				(item: OpenAI.Responses.ResponseInputItem) => item.type === "function_call_output",
			)
			assert.ok(output && output.type === "function_call_output")
			assert.equal(output.call_id, "call_1")
			assert.equal(output.output, "file contents")
		})

		it(`${id} emits compaction for the selected model`, async () => {
			const handler = new OpenAiNativeHandler({ openAiNativeApiKey: "test-api-key", apiModelId: id })
			const createStub = sinon
				.stub()
				.resolves(
					createAsyncIterable([
						{
							type: "response.output_item.done",
							item: { type: "compaction", id: "cmp_1", encrypted_content: "encrypted" },
						},
					]),
				)
			sinon.stub(handler as any, "ensureClient").returns({ responses: { create: createStub } } as any)
			sinon.stub(handler as any, "useWebsocketMode").returns(false)

			const chunks = await collect(handler.createMessage("system", [{ role: "user", content: "hi" }], readTool))
			assert.deepEqual(
				chunks.filter((chunk) => chunk.type === "context_compacted"),
				[{ type: "context_compacted", id: "cmp_1" }],
			)
		})
	}

	it("should keep HTTP response chains stored across tool turns", () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-2026-03-05",
		})

		const params = (handler as any).buildResponseCreateParams({
			modelId: "gpt-5.4-2026-03-05",
			modelInfo: handler.getModel().info,
			systemPrompt: "system",
			input: [],
			tools: [],
			previousResponseId: "resp_123",
			store: true,
		})

		params.store.should.equal(true)
		params.previous_response_id.should.equal("resp_123")
		params.context_management.should.deepEqual([{ type: "compaction", compact_threshold: 120000 }])
	})

	it("should add server-side compaction to native GPT-5 Responses requests with a scaled threshold", () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-mini-2026-03-17",
		})

		const params = (handler as any).buildResponseCreateParams({
			modelId: "gpt-5.4-mini-2026-03-17",
			modelInfo: handler.getModel().info,
			systemPrompt: "system",
			input: [],
			tools: [],
			store: true,
		})

		params.context_management.should.deepEqual([{ type: "compaction", compact_threshold: 120000 }])
	})

	it("should honor configured reasoning summary for Responses requests", () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-mini-2026-03-17",
			reasoningSummary: "concise",
		})

		const params = (handler as any).buildResponseCreateParams({
			modelId: "gpt-5.4-mini-2026-03-17",
			modelInfo: handler.getModel().info,
			systemPrompt: "system",
			input: [],
			tools: [],
			store: true,
		})

		params.reasoning.should.deepEqual({ effort: "medium", summary: "concise" })
	})

	it("should omit reasoning summary when configured as none", () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-mini-2026-03-17",
			reasoningSummary: "none",
		})

		const params = (handler as any).buildResponseCreateParams({
			modelId: "gpt-5.4-mini-2026-03-17",
			modelInfo: handler.getModel().info,
			systemPrompt: "system",
			input: [],
			tools: [],
			store: true,
		})

		params.reasoning.should.deepEqual({ effort: "medium" })
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

	it("should disable previous_response_id chaining when the latest assistant turn marked the chain as broken", async () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-mini-2026-03-17",
		})

		const createStub = sinon.stub().resolves(
			createAsyncIterable([
				{
					type: "response.completed",
					response: {
						id: "resp_after_chain_break",
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
		const warnStub = sinon.stub(Logger, "warn")

		const messages = [
			{
				role: "assistant",
				content: "older safe response",
				id: "resp_safe_older",
				ts: Date.now(),
				modelInfo: { providerId: "openai-native", modelId: "gpt-5.4-mini-2026-03-17", mode: "act" },
			},
			{
				role: "assistant",
				content: "unsafe skipped native tool turn",
				id: "resp_broken_boundary",
				ts: Date.now(),
				modelInfo: { providerId: "openai-native", modelId: "gpt-5.4-mini-2026-03-17", mode: "act" },
				previousResponseIdChainBroken: true,
				previousResponseIdChainBrokenReason: "native_tool_call_missing_provider_output:call_skip_1",
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

		const requestParams = createStub.firstCall.args[0]
		;("previous_response_id" in requestParams).should.equal(false)
		warnStub
			.getCalls()
			.some((call) => call.args[0].includes("[OpenAI] Native disabling previous_response_id chaining for the next request"))
			.should.equal(true)
		warnStub
			.getCalls()
			.some((call) => call.args[0].includes("native_tool_call_missing_provider_output:call_skip_1"))
			.should.equal(true)
	})

	it("counts inclusive Responses output tokens once", async () => {
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
										reasoning_tokens: 20,
									},
									total_tokens: 150,
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
		usageChunk.outputTokens.should.equal(30)
	})

	it("emits context_compacted when a Responses compaction output item completes", async () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-mini-2026-03-17",
		})

		const fakeClient = {
			responses: {
				create: sinon.stub().resolves(
					createAsyncIterable([
						{
							type: "response.output_item.done",
							item: {
								type: "compaction",
								id: "cmp_test_123",
								encrypted_content: "encrypted",
							},
						},
						{
							type: "response.completed",
							response: {
								id: "resp_compaction_done",
								usage: {
									input_tokens: 10,
									input_tokens_details: {
										cached_tokens: 0,
									},
									output_tokens: 5,
									output_tokens_details: {
										reasoning_tokens: 0,
									},
									total_tokens: 15,
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

		chunks.some((chunk) => chunk.type === "context_compacted").should.equal(true)
		const contextCompactedChunk = chunks.find((chunk) => chunk.type === "context_compacted")
		contextCompactedChunk.should.not.equal(undefined)
		contextCompactedChunk.id.should.equal("cmp_test_123")
	})

	it("emits a single response_id before tool calls when Responses streaming starts a native tool turn", async () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-mini-2026-03-17",
		})

		const fakeClient = {
			responses: {
				create: sinon.stub().resolves(
					createAsyncIterable([
						{
							type: "response.created",
							response: {
								id: "resp_early_anchor_123",
							},
						},
						{
							type: "response.in_progress",
							response: {
								id: "resp_early_anchor_123",
							},
						},
						{
							type: "response.output_item.added",
							item: {
								type: "function_call",
								id: "fc_test_early_123",
								call_id: "call_test_early_123",
								name: "read_file",
								arguments: "",
							},
						},
						{
							type: "response.function_call_arguments.delta",
							item_id: "fc_test_early_123",
							delta: '{"path":"README.md"}',
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

		const responseIdChunks = chunks.filter((chunk) => chunk.type === "response_id")
		responseIdChunks.should.have.length(1)
		responseIdChunks[0].id.should.equal("resp_early_anchor_123")
		chunks.some((chunk) => chunk.type === "tool_calls").should.equal(true)
		chunks
			.findIndex((chunk) => chunk.type === "response_id")
			.should.be.lessThan(chunks.findIndex((chunk) => chunk.type === "tool_calls"))
	})

	it("does not emit duplicate response_id chunks when created and in_progress share the same response id", async () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.4-mini-2026-03-17",
		})

		const fakeClient = {
			responses: {
				create: sinon.stub().resolves(
					createAsyncIterable([
						{
							type: "response.created",
							response: {
								id: "resp_early_anchor_123",
							},
						},
						{
							type: "response.in_progress",
							response: {
								id: "resp_early_anchor_123",
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

		const responseIdChunks = chunks.filter((chunk) => chunk.type === "response_id")
		responseIdChunks.should.have.length(1)
		responseIdChunks[0].id.should.equal("resp_early_anchor_123")
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
					name: "read_file",
					arguments: "",
				},
			},
			{
				type: "response.function_call_arguments.delta",
				item_id: "fc_test_123",
				delta: '{"path":"README.md"}',
			},
			{
				type: "response.function_call_arguments.done",
				item_id: "fc_test_123",
				name: "read_file",
				arguments: '{"path":"README.md"}',
			},
			{
				type: "response.output_item.done",
				item: {
					type: "function_call",
					id: "fc_test_123",
					call_id: "call_test_123",
					name: "read_file",
					arguments: '{"path":"README.md"}',
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
		toolCallChunks[0].tool_call.function.name.should.equal("read_file")
		toolCallChunks[0].tool_call.function.arguments.should.equal('{"path":"README.md"}')
	})

	it("preserves cached reads and writes through persisted request metrics", async () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-5.6-sol",
		})
		const createStub = sinon.stub().resolves(
			createAsyncIterable([
				{
					type: "response.completed",
					response: {
						id: "resp_usage",
						usage: {
							input_tokens: 1_000,
							input_tokens_details: { cached_tokens: 200, cache_write_tokens: 300 },
							output_tokens: 100,
							output_tokens_details: { reasoning_tokens: 70 },
							total_tokens: 1_100,
						},
					},
				},
			]),
		)
		sinon.stub(handler as any, "ensureClient").returns({ responses: { create: createStub } } as any)
		sinon.stub(handler as any, "useWebsocketMode").returns(false)

		const chunks = await collect(handler.createMessage("system", [{ role: "user", content: "hi" }], readTool))
		const usage = chunks.find((chunk) => chunk.type === "usage")
		if (!usage || usage.type !== "usage") {
			throw new Error("Expected a usage chunk")
		}
		assert.equal(usage.inputTokens, 500)
		assert.equal(usage.cacheReadTokens, 200)
		assert.equal(usage.cacheWriteTokens, 300)
		assert.equal(usage.outputTokens, 100)
		assert.ok(usage.totalCost !== undefined && Math.abs(usage.totalCost - 0.00558) < 1e-12)

		const messages: ClineMessage[] = [{ ts: 1, type: "say", say: "api_req_started", text: '{"request":"test"}' }]
		const messageStateHandler = {
			getClineMessages: () => messages,
			updateClineMessage: async (index: number, patch: Partial<ClineMessage>) => {
				messages[index] = { ...messages[index], ...patch }
			},
		} as unknown as MessageStateHandler
		await updateApiReqMsg({
			messageStateHandler,
			lastApiReqIndex: 0,
			inputTokens: usage.inputTokens,
			outputTokens: usage.outputTokens,
			cacheWriteTokens: usage.cacheWriteTokens ?? 0,
			cacheReadTokens: usage.cacheReadTokens ?? 0,
			totalCost: usage.totalCost,
			api: handler,
		})

		const persistedMessages: ClineMessage[] = JSON.parse(JSON.stringify(messages))
		const persisted = JSON.parse(persistedMessages[0].text ?? "{}")
		assert.equal(persisted.tokensIn, 500)
		assert.equal(persisted.tokensOut, 100)
		assert.equal(persisted.cacheReads, 200)
		assert.equal(persisted.cacheWrites, 300)
		assert.equal(persisted.cost, 0.00558)
		assert.deepEqual(getApiMetrics(persistedMessages), {
			totalTokensIn: 500,
			totalTokensOut: 100,
			totalCacheReads: 200,
			totalCacheWrites: 300,
			totalCost: usage.totalCost,
		})
		assert.equal(getLastApiReqTotalTokens(persistedMessages), 1_100)
	})

	it("uses independent per-response cost tiers", () => {
		const rows = [
			["gpt-5.5", 5, 0.5, 0, 30],
			["gpt-5.6-sol", 4, 0.4, 5, 20],
			["gpt-5.6-terra", 2, 0.2, 2.5, 12],
			["gpt-5.6-luna", 0.2, 0.02, 0.25, 1.2],
			["gpt-6-astra", 10, 1, 12.5, 50],
		] as const

		for (const [id, inputRate, readRate, writeRate, outputRate] of rows) {
			const writes = id === "gpt-5.5" ? 0 : 2_000
			for (const [totalInput, inputMultiplier, outputMultiplier] of [
				[271_999, 1, 1],
				[272_000, 1, 1],
				[272_001, 2, 1.5],
			] as const) {
				const actual = calculateApiCostOpenAI(openAiNativeModels[id], totalInput, 100, writes, 1_000)
				const expected =
					((totalInput - 1_000 - writes) * inputRate * inputMultiplier +
						1_000 * readRate * inputMultiplier +
						writes * writeRate * inputMultiplier +
						100 * outputRate * outputMultiplier) /
					1_000_000
				assert.ok(Math.abs(actual - expected) < 1e-12)
			}

			const resetActual = calculateApiCostOpenAI(openAiNativeModels[id], 1_000, 100, 0, 0)
			const resetExpected = (1_000 * inputRate + 100 * outputRate) / 1_000_000
			assert.ok(Math.abs(resetActual - resetExpected) < 1e-12)
		}
	})

	it("defaults missing optional cache usage to zero", async () => {
		const handler = new OpenAiNativeHandler({
			openAiNativeApiKey: "test-api-key",
			apiModelId: "gpt-6-astra",
		})
		const createStub = sinon.stub().resolves(
			createAsyncIterable([
				{
					type: "response.completed",
					response: {
						id: "resp_missing_optional_usage",
						usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
					},
				},
			]),
		)
		sinon.stub(handler as any, "ensureClient").returns({ responses: { create: createStub } } as any)
		sinon.stub(handler as any, "useWebsocketMode").returns(false)

		const chunks = await collect(handler.createMessage("system", [{ role: "user", content: "hi" }], readTool))
		const usage = chunks.find((chunk) => chunk.type === "usage")
		if (!usage || usage.type !== "usage") {
			throw new Error("Expected a usage chunk")
		}
		assert.equal(usage.inputTokens, 10)
		assert.equal(usage.outputTokens, 5)
		assert.equal(usage.cacheReadTokens, 0)
		assert.equal(usage.cacheWriteTokens, 0)
		assert.equal(usage.totalCost, 0.00035)
		assert.equal(Number.isFinite(usage.totalCost), true)
	})

	for (const id of ["gpt-5.4-2026-03-05", "gpt-5.4-mini-2026-03-17", "gpt-5.2"] as const) {
		for (const [input, expected] of [
			["max", "medium"],
			["MAX", "medium"],
			["invalid", "medium"],
			["xhigh", "xhigh"],
			["none", undefined],
		] as const) {
			it(`${id} preserves older native reasoning requests for ${input}`, async () => {
				const handler = new OpenAiNativeHandler({
					openAiNativeApiKey: "test-api-key",
					apiModelId: id,
					reasoningEffort: input,
				})
				const responsesCreate = sinon.stub().resolves(createAsyncIterable([]))
				const chatCreate = sinon.stub().resolves(createAsyncIterable([]))
				const fakeClient = {
					responses: { create: responsesCreate },
					chat: { completions: { create: chatCreate } },
				}
				sinon.stub(handler as any, "ensureClient").returns(fakeClient as any)
				sinon.stub(handler as any, "useWebsocketMode").returns(false)

				await collect(handler.createMessage("system", [{ role: "user", content: "hi" }], readTool))

				assert.equal((handler as any).options.reasoningEffort, input)
				if (id === "gpt-5.2") {
					assert.equal(responsesCreate.callCount, 0)
					assert.equal(chatCreate.callCount, 1)
					assert.equal(chatCreate.firstCall.args[0].reasoning_effort, expected)
				} else {
					assert.equal(responsesCreate.callCount, 1)
					assert.equal(chatCreate.callCount, 0)
					const request = responsesCreate.firstCall.args[0]
					if (expected === undefined) {
						assert.equal("reasoning" in request, false)
					} else {
						assert.equal(request.reasoning.effort, expected)
					}
				}
			})
		}
	}
})
