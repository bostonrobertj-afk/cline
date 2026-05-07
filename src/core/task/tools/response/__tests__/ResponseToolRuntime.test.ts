import { strict as assert } from "node:assert"
import { afterEach, describe, it } from "mocha"
import sinon from "sinon"
import { ThreadDisplayStates } from "@/shared/ExtensionMessage"
import { ClineDefaultTool } from "@/shared/tools"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { ResponseToolRegistry } from "../ResponseToolRegistry"
import { ResponseToolRuntime } from "../ResponseToolRuntime"
import { RESPONSE_TOOL_SUCCESS_MESSAGE } from "../types"

describe("ResponseToolRuntime", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("dismisses command_output asks before opening a blocking response ask", async () => {
		const runtime = new ResponseToolRuntime()
		const taskState = new TaskState()
		const callbacks = {
			say: sinon.stub().resolves(undefined),
			ask: sinon.stub().resolves({ response: "yesButtonClicked" }),
		}

		const config = {
			taskState,
			messageState: {
				getClineMessages: () => [{ ask: "command_output" }],
			},
			callbacks,
		} as unknown as TaskConfig

		const result = await runtime.askForResponse(config, ClineDefaultTool.ATTEMPT, "completion_result", "")

		assert.equal(result.response, "yesButtonClicked")
		sinon.assert.calledWithExactly(callbacks.say, "command_output", "")
		sinon.assert.calledWithExactly(callbacks.ask, "completion_result", "", false)
		assert.equal(taskState.activeResponseToolName, ClineDefaultTool.ATTEMPT)
	})

	it("does not dismiss command_output when the trailing message is not a command_output ask", async () => {
		const runtime = new ResponseToolRuntime()
		const taskState = new TaskState()
		const callbacks = {
			say: sinon.stub().resolves(undefined),
			ask: sinon.stub().resolves({ response: "yesButtonClicked" }),
		}

		const config = {
			taskState,
			messageState: {
				getClineMessages: () => [{ ask: "followup" }],
			},
			callbacks,
		} as unknown as TaskConfig

		const result = await runtime.askForResponse(config, ClineDefaultTool.ATTEMPT, "completion_result", "")

		assert.equal(result.response, "yesButtonClicked")
		sinon.assert.notCalled(callbacks.say)
		sinon.assert.calledWithExactly(callbacks.ask, "completion_result", "", false)
		assert.equal(taskState.activeResponseToolName, ClineDefaultTool.ATTEMPT)
	})

	it("returns command execution options that suppress only blocking asks", () => {
		const runtime = new ResponseToolRuntime()

		assert.deepEqual(runtime.getCommandExecutionOptions(ClineDefaultTool.ATTEMPT), {
			suppressBlockingAsk: true,
		})
		assert.equal(runtime.getCommandExecutionOptions(ClineDefaultTool.SEND_USER_MESSAGE), undefined)
	})

	it("registers all governed response tools as turn-ending", () => {
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.ATTEMPT)?.defaultTurnBehavior, "end_turn")
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.SEND_USER_MESSAGE)?.defaultTurnBehavior, "end_turn")
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.ASK)?.defaultTurnBehavior, "end_turn")
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.PLAN_MODE)?.defaultTurnBehavior, "end_turn")
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.ACT_MODE)?.defaultTurnBehavior, "end_turn")
	})

	it("keeps workflow-owned deterministic tools registered as non-response tools", () => {
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.SET_WORKFLOW_VALUES), undefined)
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT), undefined)
	})

	it("keeps workflow file-operation tools registered as non-response tools", () => {
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.ARCHIVE_WORKFLOW_ARTIFACT), undefined)
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.DELETE_WORKFLOW_ARTIFACT), undefined)
		assert.equal(ResponseToolRegistry.get(ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE), undefined)
	})

	it("registers post-turn thread display states for governed response tools", () => {
		assert.equal(
			ResponseToolRegistry.get(ClineDefaultTool.ATTEMPT)?.threadDisplayStateAfterTurnEnds,
			ThreadDisplayStates.ACTIVE_USER,
		)
		assert.equal(
			ResponseToolRegistry.get(ClineDefaultTool.SEND_USER_MESSAGE)?.threadDisplayStateAfterTurnEnds,
			ThreadDisplayStates.ACTIVE_USER,
		)
		assert.equal(
			ResponseToolRegistry.get(ClineDefaultTool.ASK)?.threadDisplayStateAfterTurnEnds,
			ThreadDisplayStates.ACTIVE_USER,
		)
		assert.equal(
			ResponseToolRegistry.get(ClineDefaultTool.PLAN_MODE)?.threadDisplayStateAfterTurnEnds,
			ThreadDisplayStates.ACTIVE_USER,
		)
		assert.equal(
			ResponseToolRegistry.get(ClineDefaultTool.ACT_MODE)?.threadDisplayStateAfterTurnEnds,
			ThreadDisplayStates.ACTIVE_USER,
		)
	})

	it("exposes the shared success result scaffold", () => {
		const runtime = new ResponseToolRuntime()
		assert.equal(runtime.getSuccessResult(), RESPONSE_TOOL_SUCCESS_MESSAGE)
	})

	it("tracks and clears response-tool failure scaffolding on task state", () => {
		const taskState = new TaskState()

		taskState.recordResponseToolFailure(ClineDefaultTool.ASK, "missing question", "missing_parameter")

		assert.deepEqual(taskState.getResponseToolFailureState(), {
			failureCount: 1,
			lastFailedTool: ClineDefaultTool.ASK,
			lastFailureMessage: "missing question",
			lastFailureCause: "missing_parameter",
		})

		taskState.clearResponseToolTurnState()

		assert.deepEqual(taskState.getResponseToolFailureState(), {
			failureCount: 0,
			lastFailedTool: undefined,
			lastFailureMessage: undefined,
			lastFailureCause: undefined,
		})
	})

	it("classifies missing-parameter tool errors as governed response failures", () => {
		const runtime = new ResponseToolRuntime()

		assert.deepEqual(
			runtime.classifyFailureResult(
				"The tool execution failed with the following error:\n<error>\nMissing value for required parameter 'question'.\n</error>",
			),
			{
				message: "Missing value for required parameter 'question'.",
				cause: "missing_parameter",
			},
		)
	})

	it("classifies unrecognized formatted tool errors as generic tool errors", () => {
		const runtime = new ResponseToolRuntime()

		assert.deepEqual(
			runtime.classifyFailureResult(
				"The tool execution failed with the following error:\n<error>\nUnrecognized response-tool failure.\n</error>",
			),
			{
				message: "Unrecognized response-tool failure.",
				cause: "tool_error",
			},
		)
	})

	it("treats plan-mode needs_more_exploration as non-governed internal control", () => {
		const runtime = new ResponseToolRuntime()

		assert.equal(
			runtime.isGovernedResponseAttempt({
				config: { mode: "plan", yoloModeToggled: false } as any,
				block: {
					name: ClineDefaultTool.PLAN_MODE,
					params: { needs_more_exploration: "true" },
				} as any,
			}),
			false,
		)
	})

	it("formats a human-visible second-failure error message", () => {
		const runtime = new ResponseToolRuntime()

		assert.equal(
			runtime.buildSecondFailureUserMessage(ClineDefaultTool.ASK, {
				message: "Missing value for required parameter 'question'.",
				cause: "missing_parameter",
			}),
			[
				"Response tool failed twice in the current AI turn.",
				`Tool: ${ClineDefaultTool.ASK}`,
				"Error: Missing value for required parameter 'question'.",
				"Detected cause: missing_parameter",
			].join("\n"),
		)
	})

	it("stores post-turn thread display state in shared task state on success", () => {
		const runtime = new ResponseToolRuntime()
		const taskState = new TaskState()
		const config = { taskState } as TaskConfig

		const result = runtime.finalizeSuccess(config, ClineDefaultTool.SEND_USER_MESSAGE)
		const completed = taskState.consumeCompletedResponseTool()

		assert.equal(result, RESPONSE_TOOL_SUCCESS_MESSAGE)
		assert.deepEqual(completed, {
			toolName: ClineDefaultTool.SEND_USER_MESSAGE,
			threadDisplayStateAfterTurnEnds: ThreadDisplayStates.ACTIVE_USER,
		})
	})

	it("stores active_user as the shared post-turn state for attempt_completion too", () => {
		const runtime = new ResponseToolRuntime()
		const taskState = new TaskState()
		const config = { taskState } as TaskConfig

		runtime.finalizeSuccess(config, ClineDefaultTool.ATTEMPT)
		const completed = taskState.consumeCompletedResponseTool()

		assert.deepEqual(completed, {
			toolName: ClineDefaultTool.ATTEMPT,
			threadDisplayStateAfterTurnEnds: ThreadDisplayStates.ACTIVE_USER,
		})
	})
})
