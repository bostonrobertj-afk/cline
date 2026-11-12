import { strict as assert } from "node:assert"
import { afterEach, describe, it } from "mocha"
import OpenAI from "openai"
import sinon from "sinon"
import { createOpenRouterStream } from "../../transform/openrouter-stream"
import { createVercelAIGatewayStream } from "../../transform/vercel-ai-gateway-stream"
import { OpenAiHandler } from "../openai"
import { OpenAiCodexHandler } from "../openai-codex"

async function* emptyStream(): AsyncGenerator<never> {}

const effortCases: ReadonlyArray<readonly [string, string | undefined]> = [
	["max", "medium"],
	["MAX", "medium"],
	["invalid", "medium"],
	["xhigh", "xhigh"],
	["none", undefined],
]

function assertEffort(payload: unknown, expected: string | undefined): void {
	assert.ok(typeof payload === "object" && payload !== null)
	if (expected === undefined) {
		assert.ok(!("reasoning" in payload) || payload.reasoning === undefined)
		return
	}
	assert.ok("reasoning" in payload)
	assert.ok(typeof payload.reasoning === "object" && payload.reasoning !== null)
	assert.ok("effort" in payload.reasoning)
	assert.equal(payload.reasoning.effort, expected)
}

async function exhaust(stream: AsyncIterable<unknown>): Promise<void> {
	for await (const _chunk of stream) {
		// Drain the request stream so the real request builder runs.
	}
}

describe("reasoning effort compatibility", () => {
	afterEach(() => {
		sinon.restore()
	})

	for (const [effort, expected] of effortCases) {
		it(`preserves compatible OpenAI reasoning requests for ${effort}`, async () => {
			const requestSpy = sinon.stub().resolves(emptyStream())
			const client = new OpenAI({ apiKey: "test-api-key" })
			Reflect.set(client.responses, "create", requestSpy)
			const handler = new OpenAiHandler({
				openAiApiKey: "test-api-key",
				openAiModelId: "gpt-5.4-2026-03-05",
				reasoningEffort: effort,
			})
			Reflect.set(handler, "client", client)

			await exhaust(handler.createMessage("system", [{ role: "user", content: "hi" }]))

			assert.equal(requestSpy.callCount, 1)
			assertEffort(requestSpy.firstCall.args[0], expected)
		})

		it(`preserves Codex reasoning requests for ${effort}`, () => {
			const handler = new OpenAiCodexHandler({ apiModelId: "gpt-5.3-codex", reasoningEffort: effort })
			const method = Reflect.get(handler, "buildRequestBody")
			assert.equal(typeof method, "function")

			const payload = method.call(handler, handler.getModel(), [], "system")
			assertEffort(payload, expected)
		})
	}

	const gatewayCases: ReadonlyArray<readonly [string | undefined, string | undefined]> = [
		...effortCases,
		[undefined, undefined],
	]
	for (const [effort, expected] of gatewayCases) {
		for (const [name, createStream] of [
			["OpenRouter", createOpenRouterStream],
			["Vercel", createVercelAIGatewayStream],
		] as const) {
			it(`preserves ${name} gateway reasoning requests for ${effort ?? "undefined"}`, async () => {
				const requestSpy = sinon.stub().resolves(emptyStream())
				const client = new OpenAI({ apiKey: "test-api-key" })
				Reflect.set(client.chat.completions, "create", requestSpy)

				await createStream(
					client,
					"system",
					[{ role: "user", content: "hi" }],
					{ id: "openai/gpt-5.6-sol", info: { supportsPromptCache: false } },
					effort,
				)

				assert.equal(requestSpy.callCount, 1)
				const payload = requestSpy.firstCall.args[0]
				assertEffort(payload, expected)
				assert.ok(typeof payload === "object" && payload !== null)
				assert.ok("include_reasoning" in payload)
				assert.equal(payload.include_reasoning, effort === "none" ? false : true)
				assert.ok("model" in payload)
				assert.equal(payload.model, "openai/gpt-5.6-sol")
			})
		}
	}
})
