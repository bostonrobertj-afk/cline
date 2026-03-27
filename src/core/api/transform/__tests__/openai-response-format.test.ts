import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import "should"
import { ClineStorageMessage } from "@/shared/messages/content"
import { buildUserMessageContent } from "../../../task/utils/buildUserMessageContent"
import { convertToOpenAIResponsesInput } from "../openai-response-format"

describe("convertToOpenAIResponsesInput", () => {
	it("should preserve full tool chains when rebuilding full context", () => {
		const messages: ClineStorageMessage[] = [
			{
				role: "assistant",
				id: "resp_123",
				ts: Date.now(),
				modelInfo: {
					modelId: "gpt-5-codex",
					providerId: "openai-codex",
					mode: "act",
				},
				content: [
					{
						type: "tool_use",
						id: "fc_tool_123",
						call_id: "call_tool_123",
						name: "read_file",
						input: { path: "README.md" },
					} as any,
				],
			},
			{
				role: "user",
				content: [
					{
						type: "tool_result",
						tool_use_id: "fc_tool_123",
						call_id: "call_tool_123",
						content: [
							{ type: "text", text: "Line 1" },
							{ type: "text", text: "Line 2" },
						],
					} as any,
				],
			},
		]

		const fullContext = convertToOpenAIResponsesInput(messages, { usePreviousResponseId: false })

		;(fullContext.previousResponseId === undefined).should.be.true()
		fullContext.input.should.have.length(2)
		;(fullContext.input[0] as any).type.should.equal("function_call")
		;(fullContext.input[0] as any).call_id.should.equal("call_tool_123")
		;(fullContext.input[1] as any).type.should.equal("function_call_output")
		;(fullContext.input[1] as any).call_id.should.equal("call_tool_123")
		;(fullContext.input[1] as any).output.should.equal("Line 1\nLine 2")
	})

	it("should use provider-specific previous response ids when requested", () => {
		const messages: ClineStorageMessage[] = [
			{
				role: "assistant",
				id: "resp_456",
				ts: Date.now(),
				modelInfo: {
					modelId: "gpt-5-codex",
					providerId: "openai-codex",
					mode: "act",
				},
				content: [
					{
						type: "tool_use",
						id: "fc_tool_456",
						call_id: "call_tool_456",
						name: "search_files",
						input: { path: ".", regex: "test" },
					} as any,
				],
			},
			{
				role: "user",
				content: [
					{
						type: "tool_result",
						tool_use_id: "fc_tool_456",
						call_id: "call_tool_456",
						content: "Found 1 result",
					} as any,
				],
			},
		]

		const chained = convertToOpenAIResponsesInput(messages, {
			usePreviousResponseId: true,
			previousResponseProviderIds: ["openai-codex"],
		})

		chained.previousResponseId?.should.equal("resp_456")
		chained.input.should.have.length(1)
		;(chained.input[0] as any).type.should.equal("function_call_output")
		;(chained.input[0] as any).call_id.should.equal("call_tool_456")
		;(chained.input[0] as any).output.should.equal("Found 1 result")
	})

	it("should stop previous_response_id chaining at an explicit broken-chain assistant boundary", () => {
		const messages: ClineStorageMessage[] = [
			{
				role: "assistant",
				id: "resp_safe_older",
				ts: Date.now(),
				modelInfo: {
					modelId: "gpt-5.4-mini-2026-03-17",
					providerId: "openai-native",
					mode: "act",
				},
				content: "older safe response",
			},
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
				content: "continue after unsafe turn",
			},
		]

		const chained = convertToOpenAIResponsesInput(messages, { usePreviousResponseId: true })

		;(chained.previousResponseId === undefined).should.be.true()
		chained.previousResponseIdChainBreakReason?.should.equal("native_tool_call_missing_provider_output:call_skip_1")
		chained.input.should.have.length(3)
		;(chained.input[0] as any).type.should.equal("message")
		;(chained.input[0] as any).role.should.equal("assistant")
		;(chained.input[1] as any).type.should.equal("message")
		;(chained.input[1] as any).role.should.equal("assistant")
		;(chained.input[2] as any).type.should.equal("message")
		;(chained.input[2] as any).role.should.equal("user")
	})

	it("should omit stored response item ids when rebuilding full context after a tool turn", () => {
		const messages: ClineStorageMessage[] = [
			{
				role: "assistant",
				id: "resp_789",
				ts: Date.now(),
				modelInfo: {
					modelId: "gpt-5.4-2026-03-05",
					providerId: "openai-native",
					mode: "act",
				},
				content: [
					{
						type: "thinking",
						thinking: "Need to inspect the workspace before answering.",
						call_id: "rs_123",
						summary: [{ type: "summary_text", text: "Inspect workspace first." }],
					} as any,
					{
						type: "tool_use",
						id: "fc_tool_789",
						call_id: "call_tool_789",
						name: "exec_command",
						input: { cmd: "pwd" },
					} as any,
				],
			},
			{
				role: "user",
				content: [
					{
						type: "tool_result",
						tool_use_id: "fc_tool_789",
						call_id: "call_tool_789",
						content: "/workspace",
					} as any,
				],
			},
		]

		const fullContext = convertToOpenAIResponsesInput(messages, { usePreviousResponseId: false })

		fullContext.input.should.have.length(3)
		;(fullContext.input[0] as any).type.should.equal("reasoning")
		;("id" in (fullContext.input[0] as any)).should.equal(false)
		;(fullContext.input[1] as any).type.should.equal("function_call")
		;(fullContext.input[1] as any).call_id.should.equal("call_tool_789")
		;("id" in (fullContext.input[1] as any)).should.equal(false)
		;(fullContext.input[2] as any).type.should.equal("function_call_output")
		;(fullContext.input[2] as any).call_id.should.equal("call_tool_789")
		;(fullContext.input[2] as any).output.should.equal("/workspace")
	})

	it("should fall back to the tool_use_id when rebuilding full context from stored tool calls without explicit call_id metadata", () => {
		const messages: ClineStorageMessage[] = [
			{
				role: "assistant",
				id: "resp_missing_call_id",
				ts: Date.now(),
				modelInfo: {
					modelId: "gpt-5.4-2026-03-05",
					providerId: "openai-native",
					mode: "act",
				},
				content: [
					{
						type: "tool_use",
						id: "fc_0ad17b3bd677d97e0069bcce385b648193a2ccc93a433d1581",
						name: "execute_command",
						input: { command: "pwd" },
					} as any,
				],
			},
			{
				role: "user",
				content: [
					{
						type: "tool_result",
						tool_use_id: "fc_0ad17b3bd677d97e0069bcce385b648193a2ccc93a433d1581",
						content: "/workspace",
					} as any,
				],
			},
		]

		const fullContext = convertToOpenAIResponsesInput(messages, { usePreviousResponseId: false })

		fullContext.input.should.have.length(2)
		;(fullContext.input[0] as any).type.should.equal("function_call")
		;(fullContext.input[0] as any).call_id.should.equal("fc_0ad17b3bd677d97e0069bcce385b648193a2ccc93a433d1581")
		;(fullContext.input[1] as any).type.should.equal("function_call_output")
		;(fullContext.input[1] as any).call_id.should.equal("fc_0ad17b3bd677d97e0069bcce385b648193a2ccc93a433d1581")
	})

	it("should serialize deferred post-completion follow-up as a normal user message", async () => {
		const messages: ClineStorageMessage[] = [
			{
				role: "user",
				content: await buildUserMessageContent("one more change"),
			},
		]

		const fullContext = convertToOpenAIResponsesInput(messages, { usePreviousResponseId: false })

		fullContext.input.should.have.length(1)
		;(fullContext.input[0] as any).type.should.equal("message")
		;(fullContext.input[0] as any).role.should.equal("user")
		;(fullContext.input[0] as any).content[0].type.should.equal("input_text")
		fullContext.input.some((item: any) => item.type === "function_call_output").should.be.false()
		assert.match(String((fullContext.input[0] as any).content[0].text), /<user_message>/)
		assert.match(String((fullContext.input[0] as any).content[0].text), /one more change/)
	})
})
