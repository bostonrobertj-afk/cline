import { strict as assert } from "node:assert"
import type { ClineMessage } from "@shared/ExtensionMessage"
import { AwaitingUserResponseSubtypes, ThreadDisplayStates } from "@shared/ExtensionMessage"
import {
	AwaitingUserResponseSubtype as ProtoAwaitingUserResponseSubtype,
	ClineAsk as ProtoClineAsk,
	ClineMessage as ProtoClineMessage,
	ThreadDisplayState as ProtoThreadDisplayState,
} from "@shared/proto/cline/ui"
import { convertClineMessageToProto, convertProtoToClineMessage } from "@shared/proto-conversions/cline-message"
import { describe, it } from "mocha"
import { isActiveThreadDisplayState, isPassiveThreadDisplayState } from "../index"

describe("thread display state contract", () => {
	it("represents passive open explicitly in the shared message contract", () => {
		const message: ClineMessage = {
			ts: 123,
			type: "ask",
			ask: "followup",
			threadDisplayState: ThreadDisplayStates.IDLE_OPEN,
		}

		const protoMessage = convertClineMessageToProto(message)
		assert.equal(protoMessage.threadDisplayState, ProtoThreadDisplayState.IDLE_OPEN)
		assert.equal(protoMessage.ask, ProtoClineAsk.FOLLOWUP)

		const serialized = ProtoClineMessage.toJSON(protoMessage)
		const schemaRoundTripped = ProtoClineMessage.fromJSON(serialized)
		assert.equal(schemaRoundTripped.threadDisplayState, ProtoThreadDisplayState.IDLE_OPEN)

		const roundTripped = convertProtoToClineMessage(protoMessage)
		assert.equal(roundTripped.ask, "followup")
		assert.equal(roundTripped.threadDisplayState, ThreadDisplayStates.IDLE_OPEN)
	})

	it("round-trips the full passive/active thread display state contract", () => {
		const states = [
			ThreadDisplayStates.ACTIVE_RUN,
			ThreadDisplayStates.ACTIVE_USER,
			ThreadDisplayStates.AWAITING_USER_RESPONSE,
			ThreadDisplayStates.COMPLETED,
			ThreadDisplayStates.IDLE_OPEN,
			ThreadDisplayStates.PAUSED,
		] as const

		for (const threadDisplayState of states) {
			const message: ClineMessage = {
				ts: 456,
				type: "say",
				say: "text",
				threadDisplayState,
			}

			const protoMessage = convertClineMessageToProto(message)
			const roundTripped = convertProtoToClineMessage(protoMessage)
			assert.equal(roundTripped.threadDisplayState, threadDisplayState)
		}
	})

	it("round-trips awaiting_user_response subtype values on cline messages", () => {
		const subtypes = [AwaitingUserResponseSubtypes.USER, AwaitingUserResponseSubtypes.SYSTEM] as const

		for (const awaitingUserResponseSubtype of subtypes) {
			const message: ClineMessage = {
				ts: 789,
				type: "ask",
				ask: "tool",
				threadDisplayState: ThreadDisplayStates.AWAITING_USER_RESPONSE,
				awaitingUserResponseSubtype,
			}

			const protoMessage = convertClineMessageToProto(message)
			assert.equal(protoMessage.threadDisplayState, ProtoThreadDisplayState.AWAITING_USER_RESPONSE)
			assert.equal(
				protoMessage.awaitingUserResponseSubtype,
				awaitingUserResponseSubtype === AwaitingUserResponseSubtypes.USER
					? ProtoAwaitingUserResponseSubtype.USER
					: ProtoAwaitingUserResponseSubtype.SYSTEM,
			)

			const roundTripped = convertProtoToClineMessage(protoMessage)
			assert.equal(roundTripped.threadDisplayState, ThreadDisplayStates.AWAITING_USER_RESPONSE)
			assert.equal(roundTripped.awaitingUserResponseSubtype, awaitingUserResponseSubtype)
		}
	})

	it("keeps passive open distinct from real ask states", () => {
		assert.equal(ThreadDisplayStates.IDLE_OPEN, "idle_open")
		assert.notEqual(ThreadDisplayStates.IDLE_OPEN, ThreadDisplayStates.ACTIVE_USER)
		assert.notEqual(ThreadDisplayStates.IDLE_OPEN, ThreadDisplayStates.AWAITING_USER_RESPONSE)
		assert.notEqual(ThreadDisplayStates.IDLE_OPEN, ThreadDisplayStates.COMPLETED)
		assert.notEqual(ThreadDisplayStates.IDLE_OPEN, ThreadDisplayStates.PAUSED)
	})

	it("keeps active_user distinct from passive open and structured asks", () => {
		assert.equal(ThreadDisplayStates.ACTIVE_USER, "active_user")
		assert.notEqual(ThreadDisplayStates.ACTIVE_USER, ThreadDisplayStates.IDLE_OPEN)
		assert.notEqual(ThreadDisplayStates.ACTIVE_USER, ThreadDisplayStates.AWAITING_USER_RESPONSE)
		assert.notEqual(ThreadDisplayStates.ACTIVE_USER, ThreadDisplayStates.COMPLETED)
		assert.notEqual(ThreadDisplayStates.ACTIVE_USER, ThreadDisplayStates.PAUSED)
	})

	it("does not treat passive open as active execution", () => {
		assert.equal(isPassiveThreadDisplayState(ThreadDisplayStates.IDLE_OPEN), true)
		assert.equal(isPassiveThreadDisplayState(ThreadDisplayStates.PAUSED), true)
		assert.equal(isActiveThreadDisplayState(ThreadDisplayStates.IDLE_OPEN), false)
		assert.equal(isActiveThreadDisplayState(ThreadDisplayStates.ACTIVE_RUN), true)
	})
})
