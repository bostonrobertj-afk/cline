import assert from "node:assert/strict"
import { describe, it } from "mocha"
import { ClineDefaultTool } from "@/shared/tools"
import { ToolResultUtils } from "../ToolResultUtils"

describe("ToolResultUtils", () => {
	it("preserves native call_id as tool_use_id when mapping is unavailable", () => {
		const userMessageContent: any[] = []

		ToolResultUtils.pushToolResult(
			"pwd output",
			{
				type: "tool_use",
				name: ClineDefaultTool.BASH,
				params: { command: "pwd", requires_approval: "false" },
				partial: false,
				isNativeToolCall: true,
				call_id: "call_native_123",
			},
			userMessageContent,
			() => "[execute_command for 'pwd']",
		)

		assert.equal(userMessageContent.length, 1)
		assert.deepEqual(userMessageContent[0], {
			type: "tool_result",
			tool_use_id: "call_native_123",
			call_id: "call_native_123",
			content: "[execute_command for 'pwd'] Result:\npwd output",
		})
	})
})
