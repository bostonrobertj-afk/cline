import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import sinon from "sinon"
import { ThreadDisplayStates } from "@/shared/ExtensionMessage"
import { Task } from "../index"
import { TaskState } from "../TaskState"

describe("ask lifecycle", () => {
	it("emits ask_completed and posts state when a partial ask is finalized", async () => {
		const taskState = new TaskState()
		const setThreadDisplayState = sinon.stub().callsFake((nextState: string) => {
			;(fakeTask as any).threadDisplayState = nextState
		})
		const postStateToWebview = sinon.stub().resolves()
		const messages = [
			{
				ts: 123,
				type: "ask",
				ask: "tool",
				text: "partial tool preview",
				partial: true,
			},
		]
		const messageStateHandler = {
			getClineMessages: sinon.stub().returns(messages),
			updateClineMessage: sinon.stub().callsFake(async (_index: number, update: { text?: string; partial?: boolean }) => {
				Object.assign(messages[0], update)
			}),
		}
		const runNotificationHook = sinon.stub().callsFake(async () => {
			taskState.askResponse = "messageResponse"
		})
		const fakeTask = {
			taskState,
			threadDisplayState: ThreadDisplayStates.AWAITING_USER_RESPONSE,
			messageStateHandler,
			setThreadDisplayState,
			postStateToWebview,
			runNotificationHook,
			getThreadDisplayStateForAsk: sinon.stub().returns(ThreadDisplayStates.AWAITING_USER_RESPONSE),
		}

		const result = await Task.prototype.ask.call(fakeTask as unknown as Task, "tool", "completed preview", false)

		assert.equal(result.response, "messageResponse")
		sinon.assert.calledWithMatch(
			setThreadDisplayState,
			ThreadDisplayStates.AWAITING_USER_RESPONSE,
			"ask_completed",
			sinon.match({ askType: "tool", partial: false, updatedPartial: true }),
		)
		sinon.assert.calledWithMatch(
			setThreadDisplayState,
			ThreadDisplayStates.ACTIVE_RUN,
			"ask_resolved",
			sinon.match({ askType: "tool" }),
		)
		sinon.assert.called(postStateToWebview)
	})

	it("repairs awaiting_user_response when a stale partial ask row is removed", async () => {
		const taskState = new TaskState()
		const setThreadDisplayState = sinon.stub().callsFake((nextState: string) => {
			;(fakeTask as any).threadDisplayState = nextState
		})
		const postStateToWebview = sinon.stub().resolves()
		const saveClineMessagesAndUpdateHistory = sinon.stub().resolves()
		const messages = [
			{
				ts: 1,
				type: "say",
				say: "text",
				text: "previous assistant text",
			},
			{
				ts: 2,
				type: "ask",
				ask: "tool",
				text: "partial tool preview",
				partial: true,
			},
		]
		const messageStateHandler = {
			getClineMessages: sinon.stub().callsFake(() => messages),
			setClineMessages: sinon.stub().callsFake((nextMessages: typeof messages) => {
				messages.splice(0, messages.length, ...nextMessages)
			}),
			saveClineMessagesAndUpdateHistory,
		}
		const fakeTask = {
			taskState,
			threadDisplayState: ThreadDisplayStates.AWAITING_USER_RESPONSE,
			messageStateHandler,
			setThreadDisplayState,
			postStateToWebview,
		}

		await Task.prototype.removeLastPartialMessageIfExistsWithType.call(fakeTask as unknown as Task, "ask", "tool")

		assert.equal((fakeTask as any).threadDisplayState, ThreadDisplayStates.ACTIVE_RUN)
		assert.equal(messages.length, 1)
		assert.equal(messages[0]?.type, "say")
		sinon.assert.calledWithExactly(setThreadDisplayState, ThreadDisplayStates.ACTIVE_RUN, "partial_ask_removed")
		sinon.assert.calledOnce(postStateToWebview)
	})

	it("does not alter thread state when removing a partial say row", async () => {
		const taskState = new TaskState()
		const setThreadDisplayState = sinon.stub()
		const postStateToWebview = sinon.stub().resolves()
		const saveClineMessagesAndUpdateHistory = sinon.stub().resolves()
		const messages = [
			{
				ts: 1,
				type: "say",
				say: "tool",
				text: "partial tool say",
				partial: true,
			},
		]
		const messageStateHandler = {
			getClineMessages: sinon.stub().callsFake(() => messages),
			setClineMessages: sinon.stub().callsFake((nextMessages: typeof messages) => {
				messages.splice(0, messages.length, ...nextMessages)
			}),
			saveClineMessagesAndUpdateHistory,
		}
		const fakeTask = {
			taskState,
			threadDisplayState: ThreadDisplayStates.AWAITING_USER_RESPONSE,
			messageStateHandler,
			setThreadDisplayState,
			postStateToWebview,
		}

		await Task.prototype.removeLastPartialMessageIfExistsWithType.call(fakeTask as unknown as Task, "say", "tool")

		assert.equal((fakeTask as any).threadDisplayState, ThreadDisplayStates.AWAITING_USER_RESPONSE)
		sinon.assert.notCalled(setThreadDisplayState)
		sinon.assert.notCalled(postStateToWebview)
	})
})
