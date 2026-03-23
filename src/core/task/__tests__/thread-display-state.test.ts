import { strict as assert } from "node:assert"
import type { ClineMessage } from "@shared/ExtensionMessage"
import { ThreadDisplayStates } from "@shared/ExtensionMessage"
import {
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

	it("keeps passive open distinct from real ask states", () => {
		assert.equal(ThreadDisplayStates.IDLE_OPEN, "idle_open")
		assert.notEqual(ThreadDisplayStates.IDLE_OPEN, ThreadDisplayStates.AWAITING_USER_RESPONSE)
		assert.notEqual(ThreadDisplayStates.IDLE_OPEN, ThreadDisplayStates.COMPLETED)
		assert.notEqual(ThreadDisplayStates.IDLE_OPEN, ThreadDisplayStates.PAUSED)
	})

	it("does not treat passive open as active execution", () => {
		assert.equal(isPassiveThreadDisplayState(ThreadDisplayStates.IDLE_OPEN), true)
		assert.equal(isPassiveThreadDisplayState(ThreadDisplayStates.PAUSED), true)
		assert.equal(isActiveThreadDisplayState(ThreadDisplayStates.IDLE_OPEN), false)
		assert.equal(isActiveThreadDisplayState(ThreadDisplayStates.ACTIVE_RUN), true)
	})
})
