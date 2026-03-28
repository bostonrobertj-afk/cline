import { strict as assert } from "node:assert"
import * as disk from "@core/storage/disk"
import { describe, it } from "mocha"
import sinon from "sinon"
import { Logger } from "@/shared/services/Logger"
import type { TaskConfig } from "../../types/TaskConfig"
import { buildAgentFeedbackAuditEntry, emitAgentFeedback, readAgentFeedbackMessage } from "../agent-feedback"

describe("agent-feedback helpers", () => {
	it("reads absent, invalid, and valid agent_feedback payloads", () => {
		assert.deepEqual(readAgentFeedbackMessage({}), {
			invalid: false,
			message: undefined,
		})
		assert.deepEqual(readAgentFeedbackMessage({ agent_feedback: "invalid" }), {
			invalid: true,
			message: undefined,
		})
		assert.deepEqual(readAgentFeedbackMessage({ agent_feedback: { message: "  Blocked on flaky output.  " } }), {
			invalid: false,
			message: "Blocked on flaky output.",
		})
	})

	it("builds audit entries using the next api request count for both identifiers", () => {
		const entry = buildAgentFeedbackAuditEntry(
			{
				taskId: "task-123",
				messageState: {
					getClineMessages: () => [{ say: "api_req_started" }, { say: "text" }, { say: "api_req_started" }] as any,
				},
			} as TaskConfig,
			"send_user_message",
			"Blocked on unstable behavior.",
		)

		assert.match(entry.timestamp, /^\d{4}-\d{2}-\d{2}T/)
		assert.notEqual(entry.timestamp.length, 0)
		assert.equal(entry.taskId, "task-123")
		assert.equal(entry.toolName, "send_user_message")
		assert.equal(entry.turnIdentifier, entry.apiCallIdentifier)
		assert.equal(entry.apiCallIdentifier, 3)
	})

	it("continues to emit the UI row when audit persistence fails", async () => {
		const appendStub = sinon.stub(disk, "appendAgentFeedbackAuditEntry").rejects(new Error("disk full"))
		const warnStub = sinon.stub(Logger, "warn")
		const say = sinon.stub().resolves(undefined)

		await assert.doesNotReject(
			emitAgentFeedback(
				{
					taskId: "task-123",
					messageState: {
						getClineMessages: () => [],
					},
					callbacks: {
						say,
					},
				} as unknown as TaskConfig,
				"send_user_message",
				"Blocked on unstable behavior.",
			),
		)

		sinon.assert.calledOnce(appendStub)
		sinon.assert.calledOnce(warnStub)
		sinon.assert.calledOnce(say)
		assert.equal(say.firstCall.args[0], "agent_feedback")

		appendStub.restore()
		warnStub.restore()
	})
})
