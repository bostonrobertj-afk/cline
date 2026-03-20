import { describe, it } from "mocha"
import "should"
import { ClineStorageMessage } from "@/shared/messages/content"
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
})
