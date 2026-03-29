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
	resolvePersistableNativeToolUseBlocks,
	Task,
} from "../index"
import { TaskState } from "../TaskState"

describe("response tool turn flow", () => {
	it("formats synthesized normal next-turn content without nesting latest-human-input markers", async () => {
		const taskState = new TaskState()
		taskState.setPendingResponseToolFollowup({
			toolName: ClineDefaultTool.ASK,
			route: "normal_user_turn",
			text: "Continue the review",
		})

		const result = await consumeDeferredResponseToolUserContent(taskState)
		const textBlock = result?.[0]

		assert.ok(textBlock && textBlock.type === "text")
		if (!textBlock || textBlock.type !== "text") {
			throw new Error("expected synthesized normal next-turn user content")
		}
		assert.match(textBlock.text, /\[NORMAL NEXT-TURN HUMAN INPUT\]/)
		assert.doesNotMatch(textBlock.text, /\[LATEST HUMAN USER INPUT\]/)
		assert.match(textBlock.text, /<user_message>\nContinue the review\n<\/user_message>/)
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
		const setThreadDisplayState = sinon.stub().callsFake((nextState: string) => {
			;(fakeTask as any).threadDisplayState = nextState
		})
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
			setThreadDisplayState,
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

	it("continues active_user dialogue as a fresh normal turn even if stale ask metadata remains in prior messages", async () => {
		const say = sinon.stub().resolves()
		const saveCheckpoint = sinon.stub().resolves()
		const runUserPromptSubmitHook = sinon.stub().resolves({})
		const initiateTaskLoop = sinon.stub().resolves()
		const hasHumanAuthoredInput = sinon.stub().returns(true)
		const postStateToWebview = sinon.stub().resolves()
		const setThreadDisplayState = sinon.stub().callsFake((nextState: string) => {
			;(fakeTask as any).threadDisplayState = nextState
		})
		const taskState = new TaskState()
		const fakeTask = {
			say,
			clineMessages: [
				{
					ts: Date.now(),
					type: "ask",
					ask: "tool",
					text: JSON.stringify({ tool: "readFile" }),
				},
			],
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
			setThreadDisplayState,
		}

		await Task.prototype.continueTaskWithFeedback.call(fakeTask as unknown as Task, "resume despite stale ask row", [], [])

		sinon.assert.calledOnceWithExactly(say, "user_feedback", "resume despite stale ask row", [], [])
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
		taskState.completedResponseToolResultContent = [
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
		taskState.completedResponseToolResultContent = [
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
		sinon.assert.calledOnceWithMatch(
			setThreadDisplayState,
			ThreadDisplayStates.ACTIVE_USER,
			"response_tool_turn_ended",
			sinon.match({
				completedResponseTool: ClineDefaultTool.ATTEMPT,
				hasContinuationContent: false,
			}),
		)
		sinon.assert.calledOnce(postStateToWebview)
	})

	it("persists a completed send_user_message tool result into API conversation history", async () => {
		const taskState = new TaskState()
		taskState.completedResponseToolResultContent = [
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
		assert.deepEqual(taskState.completedResponseToolResultContent, [])
	})

	it("persists completed end-turn response-tool feedback alongside the isolated tool result", async () => {
		const taskState = new TaskState()
		taskState.completedResponseToolResultContent = [
			{
				type: "tool_result",
				tool_use_id: "toolu_send_user_message",
				content: "[Message displayed.]",
			},
			{
				type: "text",
				text: 'Do not include `task_progress` on a tool call until the active step\'s "Done Signal" is true.',
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
				{
					type: "text",
					text: 'Do not include `task_progress` on a tool call until the active step\'s "Done Signal" is true.',
				},
			],
			ts: sinon.match.number,
		} as any)
		assert.deepEqual(taskState.completedResponseToolResultContent, [])
	})

	it("persists a completed attempt_completion tool result into API conversation history", async () => {
		const taskState = new TaskState()
		taskState.completedResponseToolResultContent = [
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
		assert.deepEqual(taskState.completedResponseToolResultContent, [])
	})

	it("does not persist the same completed response-tool result twice", async () => {
		const taskState = new TaskState()
		taskState.completedResponseToolResultContent = [
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

	it("drops skipped native tool calls from assistant history while preserving resolved calls", () => {
		const taskState = new TaskState()
		taskState.nativeToolCallIdsWithResults.add("call_keep")
		taskState.nativeToolCallIdsSkipped.add("call_skip")

		const result = resolvePersistableNativeToolUseBlocks(taskState, [
			{
				type: "tool_use",
				id: "toolu_keep",
				name: ClineDefaultTool.FILE_READ,
				input: { path: "src/index.ts" },
				call_id: "call_keep",
			},
			{
				type: "tool_use",
				id: "toolu_skip",
				name: ClineDefaultTool.FILE_READ,
				input: { path: "src/skip.ts" },
				call_id: "call_skip",
			},
		] as any)

		assert.deepEqual(
			result.persistableToolUseBlocks.map((block) => block.call_id),
			["call_keep"],
		)
		assert.deepEqual(result.droppedSkippedCallIds, ["call_skip"])
		assert.deepEqual(result.unresolvedCallIds, [])
	})

	it("flags native tool calls without emitted outputs as unresolved before the next request", () => {
		const taskState = new TaskState()
		taskState.nativeToolCallIdsExecuted.add("call_missing_output")

		const result = resolvePersistableNativeToolUseBlocks(taskState, [
			{
				type: "tool_use",
				id: "toolu_missing_output",
				name: ClineDefaultTool.FILE_READ,
				input: { path: "src/index.ts" },
				call_id: "call_missing_output",
			},
		] as any)

		assert.deepEqual(result.persistableToolUseBlocks, [])
		assert.deepEqual(result.droppedSkippedCallIds, [])
		assert.deepEqual(result.unresolvedCallIds, ["call_missing_output"])
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
