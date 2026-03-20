import "should"
import sinon from "sinon"
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
})
