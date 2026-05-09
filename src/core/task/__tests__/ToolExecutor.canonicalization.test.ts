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

	it("parses XML-style plan_story_artifacts parameters", () => {
		const blocks = parseAssistantMessageV2(`<plan_story_artifacts>
<epic_identity>4</epic_identity>
<story_count>3</story_count>
</plan_story_artifacts>`)
		const block = blocks.find((candidate) => candidate.type === "tool_use")

		assert.notEqual(block, undefined)
		if (block === undefined || block.type !== "tool_use") {
			throw new Error("Expected a parsed plan_story_artifacts tool-use block.")
		}
		assert.equal(block.name, ClineDefaultTool.PLAN_STORY_ARTIFACTS)
		assert.deepEqual(block.params, {
			epic_identity: "4",
			story_count: "3",
		})
	})

	it("parses XML-style plan_remediation_story_artifact parameters", () => {
		const blocks = parseAssistantMessageV2(`<plan_remediation_story_artifact>
<epic_identity>4</epic_identity>
<target_story_identity>4.2</target_story_identity>
</plan_remediation_story_artifact>`)
		const block = blocks.find((candidate) => candidate.type === "tool_use")

		assert.notEqual(block, undefined)
		if (block === undefined || block.type !== "tool_use") {
			throw new Error("Expected a parsed plan_remediation_story_artifact tool-use block.")
		}
		assert.equal(block.name, ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT)
		assert.deepEqual(block.params, {
			epic_identity: "4",
			target_story_identity: "4.2",
		})
	})

	it("parses XML-style generate_story_files parameters", () => {
		const blocks = parseAssistantMessageV2(`<generate_story_files>
<epic_identity>4</epic_identity>
</generate_story_files>`)
		const block = blocks.find((candidate) => candidate.type === "tool_use")

		assert.notEqual(block, undefined)
		if (block === undefined || block.type !== "tool_use") {
			throw new Error("Expected a parsed generate_story_files tool-use block.")
		}
		assert.equal(block.name, ClineDefaultTool.GENERATE_STORY_FILES)
		assert.deepEqual(block.params, {
			epic_identity: "4",
		})
	})
})
