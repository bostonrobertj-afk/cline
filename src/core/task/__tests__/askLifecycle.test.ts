import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import sinon from "sinon"
import { AwaitingUserResponseSubtypes, ThreadDisplayStates } from "@/shared/ExtensionMessage"
import { Task } from "../index"
import { TaskState } from "../TaskState"

describe("ask lifecycle", () => {
	it("records awaiting_user_response.system for ask_partial_started", async () => {
		const taskState = new TaskState()
		const addToClineMessages = sinon.stub().resolves()
		const postStateToWebview = sinon.stub().resolves()
		const fakeTask = {
			taskState,
			threadDisplayState: ThreadDisplayStates.ACTIVE_RUN,
			awaitingUserResponseSubtype: undefined,
			messageStateHandler: {
				getClineMessages: sinon.stub().returns([]),
				addToClineMessages,
			},
			setThreadDisplayState: sinon
				.stub()
				.callsFake((nextState: string, _reason: string, _details: unknown, awaitingUserResponseSubtype?: string) => {
					;(fakeTask as any).threadDisplayState = nextState
					;(fakeTask as any).awaitingUserResponseSubtype =
						nextState === ThreadDisplayStates.AWAITING_USER_RESPONSE ? awaitingUserResponseSubtype : undefined
				}),
			postStateToWebview,
			getThreadDisplayStateForAsk: sinon.stub().returns(ThreadDisplayStates.AWAITING_USER_RESPONSE),
			getAwaitingUserResponseSubtypeForAsk: sinon.stub().returns(AwaitingUserResponseSubtypes.SYSTEM),
		}

		await assert.rejects(
			Task.prototype.ask.call(fakeTask as unknown as Task, "tool", "partial tool preview", true),
			/Current ask promise was ignored 2/,
		)

		assert.equal((fakeTask as any).threadDisplayState, ThreadDisplayStates.AWAITING_USER_RESPONSE)
		assert.equal((fakeTask as any).awaitingUserResponseSubtype, AwaitingUserResponseSubtypes.SYSTEM)
		sinon.assert.calledWithMatch(
			fakeTask.setThreadDisplayState,
			ThreadDisplayStates.AWAITING_USER_RESPONSE,
			"ask_partial_started",
			sinon.match({ askType: "tool", partial: true }),
			AwaitingUserResponseSubtypes.SYSTEM,
		)
		sinon.assert.calledWithMatch(
			addToClineMessages,
			sinon.match({
				type: "ask",
				ask: "tool",
				threadDisplayState: ThreadDisplayStates.AWAITING_USER_RESPONSE,
				awaitingUserResponseSubtype: AwaitingUserResponseSubtypes.SYSTEM,
				partial: true,
			}),
		)
		sinon.assert.calledOnce(postStateToWebview)
	})

	it("emits ask_completed and posts state when a partial ask is finalized", async () => {
		const taskState = new TaskState()
		const setThreadDisplayState = sinon
			.stub()
			.callsFake((nextState: string, _reason: string, _details: unknown, subtype?: string) => {
				;(fakeTask as any).threadDisplayState = nextState
				;(fakeTask as any).awaitingUserResponseSubtype =
					nextState === ThreadDisplayStates.AWAITING_USER_RESPONSE ? subtype : undefined
			})
		const postStateToWebview = sinon.stub().resolves()
		const messages = [
			{
				ts: 123,
				type: "ask",
				ask: "tool",
				text: "partial tool preview",
				partial: true,
				threadDisplayState: ThreadDisplayStates.AWAITING_USER_RESPONSE,
				awaitingUserResponseSubtype: AwaitingUserResponseSubtypes.SYSTEM,
			},
		]
		const messageStateHandler = {
			getClineMessages: sinon.stub().returns(messages),
			updateClineMessage: sinon.stub().callsFake(async (_index: number, update: Record<string, unknown>) => {
				Object.assign(messages[0], update)
			}),
		}
		const runNotificationHook = sinon.stub().callsFake(async () => {
			taskState.askResponse = "messageResponse"
		})
		const fakeTask = {
			taskState,
			threadDisplayState: ThreadDisplayStates.AWAITING_USER_RESPONSE,
			awaitingUserResponseSubtype: AwaitingUserResponseSubtypes.SYSTEM,
			messageStateHandler,
			setThreadDisplayState,
			postStateToWebview,
			runNotificationHook,
			getThreadDisplayStateForAsk: sinon.stub().returns(ThreadDisplayStates.AWAITING_USER_RESPONSE),
			getAwaitingUserResponseSubtypeForAsk: sinon.stub().returns(AwaitingUserResponseSubtypes.USER),
		}

		const result = await Task.prototype.ask.call(fakeTask as unknown as Task, "tool", "completed preview", false)

		assert.equal(result.response, "messageResponse")
		assert.equal((fakeTask as any).awaitingUserResponseSubtype, undefined)
		assert.equal(messages[0].threadDisplayState, ThreadDisplayStates.AWAITING_USER_RESPONSE)
		assert.equal(messages[0].awaitingUserResponseSubtype, AwaitingUserResponseSubtypes.USER)
		sinon.assert.calledWithMatch(
			setThreadDisplayState,
			ThreadDisplayStates.AWAITING_USER_RESPONSE,
			"ask_completed",
			sinon.match({ askType: "tool", partial: false, updatedPartial: true }),
			AwaitingUserResponseSubtypes.USER,
		)
		sinon.assert.calledWithMatch(
			setThreadDisplayState,
			ThreadDisplayStates.ACTIVE_RUN,
			"ask_resolved",
			sinon.match({ askType: "tool" }),
		)
		sinon.assert.called(postStateToWebview)
	})

	it("records awaiting_user_response.user for ask_started", async () => {
		const taskState = new TaskState()
		const addedMessages: Array<Record<string, unknown>> = []
		const addToClineMessages = sinon.stub().callsFake(async (message: Record<string, unknown>) => {
			addedMessages.push(message)
		})
		const setThreadDisplayState = sinon
			.stub()
			.callsFake((nextState: string, _reason: string, _details: unknown, subtype?: string) => {
				;(fakeTask as any).threadDisplayState = nextState
				;(fakeTask as any).awaitingUserResponseSubtype =
					nextState === ThreadDisplayStates.AWAITING_USER_RESPONSE ? subtype : undefined
			})
		const postStateToWebview = sinon.stub().resolves()
		const runNotificationHook = sinon.stub().callsFake(async () => {
			taskState.askResponse = "messageResponse"
		})
		const fakeTask = {
			taskState,
			threadDisplayState: ThreadDisplayStates.ACTIVE_RUN,
			awaitingUserResponseSubtype: undefined,
			messageStateHandler: {
				getClineMessages: sinon.stub().returns([]),
				addToClineMessages,
			},
			setThreadDisplayState,
			postStateToWebview,
			runNotificationHook,
			getThreadDisplayStateForAsk: sinon.stub().returns(ThreadDisplayStates.AWAITING_USER_RESPONSE),
			getAwaitingUserResponseSubtypeForAsk: sinon.stub().returns(AwaitingUserResponseSubtypes.USER),
		}

		const result = await Task.prototype.ask.call(fakeTask as unknown as Task, "tool", "final ask text")

		assert.equal(result.response, "messageResponse")
		assert.equal(addedMessages.length, 1)
		assert.equal(addedMessages[0]?.threadDisplayState, ThreadDisplayStates.AWAITING_USER_RESPONSE)
		assert.equal(addedMessages[0]?.awaitingUserResponseSubtype, AwaitingUserResponseSubtypes.USER)
		assert.equal((fakeTask as any).awaitingUserResponseSubtype, undefined)
		sinon.assert.calledWithMatch(
			setThreadDisplayState,
			ThreadDisplayStates.AWAITING_USER_RESPONSE,
			"ask_started",
			sinon.match({ askType: "tool", partial: false }),
			AwaitingUserResponseSubtypes.USER,
		)
		sinon.assert.calledWithMatch(
			setThreadDisplayState,
			ThreadDisplayStates.ACTIVE_RUN,
			"ask_resolved",
			sinon.match({ askType: "tool" }),
		)
	})

	it("repairs awaiting_user_response when a stale partial ask row is removed", async () => {
		const taskState = new TaskState()
		const setThreadDisplayState = sinon.stub().callsFake((nextState: string) => {
			;(fakeTask as any).threadDisplayState = nextState
			;(fakeTask as any).awaitingUserResponseSubtype =
				nextState === ThreadDisplayStates.AWAITING_USER_RESPONSE
					? (fakeTask as any).awaitingUserResponseSubtype
					: undefined
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
			awaitingUserResponseSubtype: AwaitingUserResponseSubtypes.SYSTEM,
			messageStateHandler,
			setThreadDisplayState,
			postStateToWebview,
		}

		await Task.prototype.removeLastPartialMessageIfExistsWithType.call(fakeTask as unknown as Task, "ask", "tool")

		assert.equal((fakeTask as any).threadDisplayState, ThreadDisplayStates.ACTIVE_RUN)
		assert.equal((fakeTask as any).awaitingUserResponseSubtype, undefined)
		assert.equal(messages.length, 1)
		assert.equal(messages[0]?.type, "say")
		sinon.assert.calledWithExactly(setThreadDisplayState, ThreadDisplayStates.ACTIVE_RUN, "partial_ask_removed")
		sinon.assert.calledOnce(postStateToWebview)
	})

	it("does not repair awaiting_user_response.user when a stale partial ask row is removed", async () => {
		const taskState = new TaskState()
		const setThreadDisplayState = sinon.stub()
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
			awaitingUserResponseSubtype: AwaitingUserResponseSubtypes.USER,
			messageStateHandler,
			setThreadDisplayState,
			postStateToWebview,
		}

		await Task.prototype.removeLastPartialMessageIfExistsWithType.call(fakeTask as unknown as Task, "ask", "tool")

		assert.equal((fakeTask as any).threadDisplayState, ThreadDisplayStates.AWAITING_USER_RESPONSE)
		assert.equal((fakeTask as any).awaitingUserResponseSubtype, AwaitingUserResponseSubtypes.USER)
		assert.equal(messages.length, 1)
		sinon.assert.notCalled(setThreadDisplayState)
		sinon.assert.notCalled(postStateToWebview)
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
