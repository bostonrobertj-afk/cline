import "should"
import { ClineStorageMessage } from "@/shared/messages/content"
import { ApiFormat } from "@/shared/proto/cline/models"
import { prepareApiConversationHistoryForResume } from "../index"

describe("prepareApiConversationHistoryForResume", () => {
	it("should keep api conversation history intact when openai-native responses can resume from an aged anchor", () => {
		const existingApiConversationHistory: ClineStorageMessage[] = [
			{
				role: "assistant",
				id: "resp_prev_chain_aged",
				ts: Date.now() - 48 * 60 * 60 * 1000,
				modelInfo: {
					modelId: "gpt-5.4-mini-2026-03-17",
					providerId: "openai-native",
					mode: "act",
				},
				content: "prior response",
			},
			{
				role: "user",
				content: [{ type: "text", text: "continue" }] as any,
			},
		]

		const result = prepareApiConversationHistoryForResume(existingApiConversationHistory, {
			providerId: "openai-native",
			model: {
				id: "gpt-5.4-mini-2026-03-17",
				info: { apiFormat: ApiFormat.OPENAI_RESPONSES } as any,
			},
		})

		result.resumeUsesStoredResponsesChain.should.equal(true)
		result.apiConversationHistory.length.should.equal(existingApiConversationHistory.length)
		result.carryForwardUserContent.should.deepEqual([])
	})

	it("should carry forward trailing user content after an explicit stored chain-break boundary", () => {
		const trailingUserContent = [{ type: "text", text: "continue after broken chain" }] as any
		const existingApiConversationHistory: ClineStorageMessage[] = [
			{
				role: "assistant",
				id: "resp_broken_boundary",
				ts: Date.now(),
				modelInfo: {
					modelId: "gpt-5.4-mini-2026-03-17",
					providerId: "openai-native",
					mode: "act",
				},
				previousResponseIdChainBroken: true,
				previousResponseIdChainBrokenReason: "native_tool_call_missing_provider_output:call_skip_1",
				content: "response containing an unsafe native tool turn",
			},
			{
				role: "user",
				content: trailingUserContent,
			},
		]

		const result = prepareApiConversationHistoryForResume(existingApiConversationHistory, {
			providerId: "openai-native",
			model: {
				id: "gpt-5.4-mini-2026-03-17",
				info: { apiFormat: ApiFormat.OPENAI_RESPONSES } as any,
			},
		})

		result.resumeUsesStoredResponsesChain.should.equal(false)
		result.apiConversationHistory.should.deepEqual(existingApiConversationHistory.slice(0, -1))
		result.carryForwardUserContent.should.deepEqual(trailingUserContent)
	})
})
