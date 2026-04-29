import { strict as assert } from "node:assert"
import { ClineDefaultTool } from "@shared/tools"
import { describe, it } from "mocha"
import { parseAssistantMessageV2, type ToolUse } from "../../assistant-message"
import { canonicalizeAttemptCompletionParams } from "../ToolExecutor"

describe("ToolExecutor canonicalization", () => {
	it("canonicalizes attempt_completion response into result", () => {
		const block: ToolUse = {
			type: "tool_use",
			name: ClineDefaultTool.ATTEMPT,
			params: {
				response: "final answer from response field",
			},
			partial: false,
		}

		const didCanonicalize = canonicalizeAttemptCompletionParams(block)

		assert.equal(didCanonicalize, true)
		assert.equal(block.params.result, "final answer from response field")
		assert.equal(block.params.response, "final answer from response field")
	})

	it("does not canonicalize when attempt_completion already has result", () => {
		const block: ToolUse = {
			type: "tool_use",
			name: ClineDefaultTool.ATTEMPT,
			params: {
				result: "already canonical",
				response: "extra text",
			},
			partial: false,
		}

		const didCanonicalize = canonicalizeAttemptCompletionParams(block)

		assert.equal(didCanonicalize, false)
		assert.equal(block.params.result, "already canonical")
	})

	it("does not canonicalize non-attempt tools", () => {
		const block: ToolUse = {
			type: "tool_use",
			name: ClineDefaultTool.ACT_MODE,
			params: {
				response: "act mode response",
			},
			partial: false,
		}

		const didCanonicalize = canonicalizeAttemptCompletionParams(block)

		assert.equal(didCanonicalize, false)
		assert.equal(block.params.result, undefined)
	})

	it("does not parse retired brainstorming and select-target tags as tool-use blocks", () => {
		const captureTopicTagName = ["capture", "brainstorming", "topic"].join("_")
		const selectTargetTagName = ["select", "target", "epic"].join("_")
		const blocks = parseAssistantMessageV2(`<${captureTopicTagName}>
<topic>New product launch</topic>
</${captureTopicTagName}>
<${selectTargetTagName}>
<epic_id>epic-1</epic_id>
</${selectTargetTagName}>`)
		const toolUseBlocks = blocks.filter((block) => block.type === "tool_use")
		const textContent = blocks.map((block) => (block.type === "text" ? block.content : "")).join("")

		assert.deepEqual(toolUseBlocks, [])
		assert.equal(textContent.includes(captureTopicTagName), true)
		assert.equal(textContent.includes(selectTargetTagName), true)
	})
})
