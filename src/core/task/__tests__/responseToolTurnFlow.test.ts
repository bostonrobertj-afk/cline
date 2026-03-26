import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import sinon from "sinon"
import { ThreadDisplayStates } from "@/shared/ExtensionMessage"
import { ClineDefaultTool } from "@/shared/tools"
import { formatResponse } from "../../prompts/responses"
import { consumeDeferredResponseToolUserContent, Task } from "../index"
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
				text: formatResponse.normalNextTurnDialogue("user_message", "Please tighten the summary."),
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
				text: formatResponse.normalNextTurnDialogue("user_message", "Use the stricter validation path."),
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

	it("continues active_user dialogue as a fresh normal turn", async () => {
		const say = sinon.stub().resolves()
		const saveCheckpoint = sinon.stub().resolves()
		const runUserPromptSubmitHook = sinon.stub().resolves({})
		const initiateTaskLoop = sinon.stub().resolves()
		const hasHumanAuthoredInput = sinon.stub().returns(true)
		const postStateToWebview = sinon.stub().resolves()
		const taskState = new TaskState()
		const fakeTask = {
			say,
			checkpointManager: {
				saveCheckpoint,
			},
			runUserPromptSubmitHook,
			taskState,
			postStateToWebview,
			stateManager: {
				getGlobalSettingsKey: sinon.stub().callsFake((key: string) => key === "hooksEnabled"),
			},
			hasHumanAuthoredInput,
			initiateTaskLoop,
		}

		await Task.prototype.continueTaskWithFeedback.call(fakeTask as unknown as Task, "resume as active user", [], [])

		sinon.assert.calledOnceWithExactly(say, "user_feedback", "resume as active user", [], [])
		sinon.assert.calledOnce(saveCheckpoint)
		sinon.assert.calledOnceWithMatch(runUserPromptSubmitHook, sinon.match.array, "feedback")
		sinon.assert.calledOnce(postStateToWebview)
		sinon.assert.calledOnce(initiateTaskLoop)
		assert.equal((fakeTask as any).threadDisplayState, ThreadDisplayStates.ACTIVE_RUN)
		assert.equal(taskState.responseToolTurnShouldEnd, false)
	})
})
