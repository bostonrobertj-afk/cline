import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import { ClineDefaultTool } from "@/shared/tools"
import { formatResponse } from "../../prompts/responses"
import { consumeDeferredResponseToolUserContent } from "../index"
import { TaskState } from "../TaskState"

describe("response tool turn flow", () => {
	it("converts attempt_completion follow-up into normal next-turn user content", async () => {
		const taskState = new TaskState()
		taskState.setPendingResponseToolFollowup({
			toolName: ClineDefaultTool.ATTEMPT,
			route: "normal_user_turn",
			text: "Please tighten the summary.",
			hookContext: "post-completion feedback",
		})

		const result = await consumeDeferredResponseToolUserContent(taskState)

		assert.deepEqual(result, [
			{
				type: "text",
				text: formatResponse.latestHumanInput("user_message", "Please tighten the summary."),
			},
			{
				type: "text",
				text: '<hook_context source="UserPromptSubmit">\npost-completion feedback\n</hook_context>',
			},
		])
		assert.equal(taskState.pendingResponseToolFollowup, undefined)
	})

	it("converts ask_followup_question replies into normal next-turn user content", async () => {
		const taskState = new TaskState()
		taskState.setPendingResponseToolFollowup({
			toolName: ClineDefaultTool.ASK,
			route: "normal_user_turn",
			text: "Use the stricter validation path.",
		})

		const result = await consumeDeferredResponseToolUserContent(taskState)

		assert.deepEqual(result, [
			{
				type: "text",
				text: formatResponse.latestHumanInput("user_message", "Use the stricter validation path."),
			},
		])
		assert.equal(taskState.pendingResponseToolFollowup, undefined)
	})

	it("does not synthesize next-turn user content for non-normal follow-up routes", async () => {
		const taskState = new TaskState()
		taskState.setPendingResponseToolFollowup({
			toolName: ClineDefaultTool.ASK,
			route: "tool_result",
			text: "legacy",
		})

		const result = await consumeDeferredResponseToolUserContent(taskState)

		assert.equal(result, undefined)
		assert.equal(taskState.pendingResponseToolFollowup, undefined)
	})
})
