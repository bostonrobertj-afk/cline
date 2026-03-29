import { expect } from "chai"
import sinon from "sinon"
import { ApiFormat } from "@/shared/proto/index.cline"
import { convertToOpenAIResponsesInput } from "../../transform/openai-response-format"
import { OcaHandler } from "../oca"

function createAsyncIterable(data: any[] = []) {
	return {
		[Symbol.asyncIterator]: async function* () {
			yield* data
		},
	}
}

describe("OcaHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("sends the Responses system prompt via instructions instead of a system input item", async () => {
		const createStub = sinon.stub().resolves(
			createAsyncIterable([
				{
					type: "response.completed",
					response: {
						id: "resp_oca_prompt_transport",
						usage: {
							input_tokens: 12,
							output_tokens: 4,
						},
					},
				},
			]),
		)

		const handler = new OcaHandler({
			ocaModelId: "oracle/gpt-5.4-mini",
			ocaModelInfo: {
				apiFormat: ApiFormat.OPENAI_RESPONSES,
				contextWindow: 200_000,
				supportsReasoning: false,
			} as any,
		})

		sinon.stub(handler as any, "ensureOpenAIClient").returns({
			responses: {
				create: createStub,
			},
		} as any)
		sinon.stub(handler, "calculateCost").resolves(0)

		const messages = [{ role: "user", content: "hi" }] as any
		for await (const _chunk of handler.createMessage("system prompt", messages, [])) {
			// drain
		}

		const request = createStub.firstCall.args[0]
		expect(request.instructions).to.equal("system prompt")
		expect(request.input).to.deep.equal(convertToOpenAIResponsesInput(messages, { usePreviousResponseId: false }).input)
		expect(
			(request.input as Array<{ role?: string; content?: unknown }>).some(
				(item) => item.role === "system" && item.content === "system prompt",
			),
		).to.equal(false)
	})
})
