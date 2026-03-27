import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import sinon from "sinon"
import { ThreadDisplayStates } from "@/shared/ExtensionMessage"
import { ClineDefaultTool } from "@/shared/tools"
import { formatResponse } from "../../prompts/responses"
import {
	appendQueuedSteerUserContentToRequest,
	consumeCompletedResponseToolContinuationUserContent,
	consumeDeferredResponseToolUserContent,
	consumePendingSteerUserContent,
	handleCompletedResponseToolTurn,
	persistCompletedResponseToolResultIfNeeded,
	Task,
} from "../index"
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

	it("consumes queued steer feedback in FIFO order as normal user content", async () => {
		const taskState = new TaskState()
		taskState.enqueueSteerFeedback({ text: "First steer message" })
		taskState.enqueueSteerFeedback({ text: "Second steer message" })

		const result = await consumePendingSteerUserContent(taskState)

		assert.deepEqual(result, [
			{
				type: "text",
				text: formatResponse.normalNextTurnDialogue("feedback", "First steer message"),
			},
			{
				type: "text",
				text: formatResponse.normalNextTurnDialogue("feedback", "Second steer message"),
			},
		])
		assert.equal(taskState.pendingSteerFeedback.length, 0)
	})

	it("delivers queued steer content on the next API request payload", async () => {
		const taskState = new TaskState()
		taskState.enqueueSteerFeedback({ text: "First steer message" })
		taskState.enqueueSteerFeedback({ text: "Second steer message" })

		const result = await appendQueuedSteerUserContentToRequest(taskState, [
			{
				type: "text",
				text: "existing tool result payload",
			},
		])

		assert.deepEqual(result, [
			{
				type: "text",
				text: "existing tool result payload",
			},
			{
				type: "text",
				text: formatResponse.normalNextTurnDialogue("feedback", "First steer message"),
			},
			{
				type: "text",
				text: formatResponse.normalNextTurnDialogue("feedback", "Second steer message"),
			},
		])
		assert.equal(taskState.pendingSteerFeedback.length, 0)
	})

	it("merges response-tool continuation content with queued steer feedback before handoff", async () => {
		const taskState = new TaskState()
		taskState.setPendingResponseToolFollowup({
			toolName: ClineDefaultTool.ATTEMPT,
			route: "normal_user_turn",
			text: "Tighten the summary.",
		})
		taskState.enqueueSteerFeedback({ text: "Also mention the validation change." })

		const result = await consumeCompletedResponseToolContinuationUserContent(taskState)

		assert.deepEqual(result, [
			{
				type: "text",
				text: formatResponse.normalNextTurnDialogue("user_message", "Tighten the summary."),
			},
			{
				type: "text",
				text: formatResponse.normalNextTurnDialogue("feedback", "Also mention the validation change."),
			},
		])
		assert.equal(taskState.pendingResponseToolFollowup, undefined)
		assert.equal(taskState.pendingSteerFeedback.length, 0)
	})

	it("forces one more request instead of handing off to active_user when steer is queued after a response tool", async () => {
		const taskState = new TaskState()
		taskState.userMessageContent = [
			{
				type: "tool_result",
				tool_use_id: "toolu_send_message",
				content: "[Message displayed.]",
			},
		] as any
		taskState.setPendingResponseToolFollowup({
			toolName: ClineDefaultTool.ATTEMPT,
			route: "normal_user_turn",
			text: "Tighten the summary.",
		})
		taskState.enqueueSteerFeedback({ text: "Also mention the validation change." })

		const recursivelyMakeClineRequests = sinon.stub().resolves(true)
		const setThreadDisplayState = sinon.stub()
		const postStateToWebview = sinon.stub().resolves()
		const messageStateHandler = {
			addToApiConversationHistory: sinon.stub().resolves(),
		}

		const result = await handleCompletedResponseToolTurn({
			taskState,
			completedResponseTool: {
				toolName: ClineDefaultTool.ATTEMPT,
				threadDisplayStateAfterTurnEnds: ThreadDisplayStates.ACTIVE_USER,
			},
			abort: false,
			messageStateHandler,
			recursivelyMakeClineRequests,
			setThreadDisplayState,
			postStateToWebview,
		})

		assert.equal(result, true)
		sinon.assert.calledOnceWithExactly(messageStateHandler.addToApiConversationHistory, {
			role: "user",
			content: [
				{
					type: "tool_result",
					tool_use_id: "toolu_send_message",
					content: "[Message displayed.]",
				},
			],
			ts: sinon.match.number,
		} as any)
		sinon.assert.calledOnceWithExactly(recursivelyMakeClineRequests, [
			{
				type: "text",
				text: formatResponse.normalNextTurnDialogue("user_message", "Tighten the summary."),
			},
			{
				type: "text",
				text: formatResponse.normalNextTurnDialogue("feedback", "Also mention the validation change."),
			},
		])
		sinon.assert.notCalled(setThreadDisplayState)
		sinon.assert.notCalled(postStateToWebview)
	})

	it("hands off to active_user immediately when no response-tool continuation content exists", async () => {
		const taskState = new TaskState()
		taskState.userMessageContent = [
			{
				type: "tool_result",
				tool_use_id: "toolu_attempt_completion",
				content: "[Message displayed.]",
			},
		] as any
		const recursivelyMakeClineRequests = sinon.stub().resolves(true)
		const setThreadDisplayState = sinon.stub()
		const postStateToWebview = sinon.stub().resolves()
		const messageStateHandler = {
			addToApiConversationHistory: sinon.stub().resolves(),
		}

		const result = await handleCompletedResponseToolTurn({
			taskState,
			completedResponseTool: {
				toolName: ClineDefaultTool.ATTEMPT,
				threadDisplayStateAfterTurnEnds: ThreadDisplayStates.ACTIVE_USER,
			},
			abort: false,
			messageStateHandler,
			recursivelyMakeClineRequests,
			setThreadDisplayState,
			postStateToWebview,
		})

		assert.equal(result, true)
		sinon.assert.calledOnceWithExactly(messageStateHandler.addToApiConversationHistory, {
			role: "user",
			content: [
				{
					type: "tool_result",
					tool_use_id: "toolu_attempt_completion",
					content: "[Message displayed.]",
				},
			],
			ts: sinon.match.number,
		} as any)
		sinon.assert.notCalled(recursivelyMakeClineRequests)
		sinon.assert.calledOnceWithExactly(setThreadDisplayState, ThreadDisplayStates.ACTIVE_USER)
		sinon.assert.calledOnce(postStateToWebview)
	})

	it("persists a completed send_user_message tool result into API conversation history", async () => {
		const taskState = new TaskState()
		taskState.userMessageContent = [
			{
				type: "tool_result",
				tool_use_id: "toolu_send_user_message",
				content: "[Message displayed.]",
			},
		] as any
		const messageStateHandler = {
			addToApiConversationHistory: sinon.stub().resolves(),
		}

		const persisted = await persistCompletedResponseToolResultIfNeeded({
			taskState,
			messageStateHandler,
		})

		assert.equal(persisted, true)
		sinon.assert.calledOnceWithExactly(messageStateHandler.addToApiConversationHistory, {
			role: "user",
			content: [
				{
					type: "tool_result",
					tool_use_id: "toolu_send_user_message",
					content: "[Message displayed.]",
				},
			],
			ts: sinon.match.number,
		} as any)
		assert.deepEqual(taskState.userMessageContent, [])
	})

	it("persists a completed attempt_completion tool result into API conversation history", async () => {
		const taskState = new TaskState()
		taskState.userMessageContent = [
			{
				type: "tool_result",
				tool_use_id: "toolu_attempt_completion",
				content: "[Message displayed.]",
			},
		] as any
		const messageStateHandler = {
			addToApiConversationHistory: sinon.stub().resolves(),
		}

		const persisted = await persistCompletedResponseToolResultIfNeeded({
			taskState,
			messageStateHandler,
		})

		assert.equal(persisted, true)
		sinon.assert.calledOnceWithExactly(messageStateHandler.addToApiConversationHistory, {
			role: "user",
			content: [
				{
					type: "tool_result",
					tool_use_id: "toolu_attempt_completion",
					content: "[Message displayed.]",
				},
			],
			ts: sinon.match.number,
		} as any)
		assert.deepEqual(taskState.userMessageContent, [])
	})

	it("does not persist the same completed response-tool result twice", async () => {
		const taskState = new TaskState()
		taskState.userMessageContent = [
			{
				type: "tool_result",
				tool_use_id: "toolu_send_user_message",
				content: "[Message displayed.]",
			},
		] as any
		const messageStateHandler = {
			addToApiConversationHistory: sinon.stub().resolves(),
		}

		const firstPersist = await persistCompletedResponseToolResultIfNeeded({
			taskState,
			messageStateHandler,
		})
		const secondPersist = await persistCompletedResponseToolResultIfNeeded({
			taskState,
			messageStateHandler,
		})

		assert.equal(firstPersist, true)
		assert.equal(secondPersist, false)
		sinon.assert.calledOnce(messageStateHandler.addToApiConversationHistory)
	})

	it("queues steer feedback without changing thread state", async () => {
		const say = sinon.stub().resolves()
		const taskState = new TaskState()
		const fakeTask = {
			say,
			taskState,
			threadDisplayState: ThreadDisplayStates.ACTIVE_RUN,
		}

		await Task.prototype.queueSteerFeedback.call(
			fakeTask as unknown as Task,
			"Queue this for the next request",
			["img-1"],
			["file-1"],
		)

		sinon.assert.calledOnceWithExactly(say, "user_feedback", "Queue this for the next request", ["img-1"], ["file-1"])
		assert.equal(fakeTask.threadDisplayState, ThreadDisplayStates.ACTIVE_RUN)
		assert.deepEqual(taskState.pendingSteerFeedback, [
			{
				text: "Queue this for the next request",
				images: ["img-1"],
				files: ["file-1"],
				ts: taskState.pendingSteerFeedback[0].ts,
			},
		])
	})
})
