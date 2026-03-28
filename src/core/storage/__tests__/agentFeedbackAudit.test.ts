import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import { pruneAgentFeedbackAuditEntries } from "../disk"

describe("agent feedback audit pruning", () => {
	it("keeps only valid entries from the last 7 days", () => {
		const now = new Date("2026-03-28T12:00:00.000Z")
		const entries = [
			{
				timestamp: "2026-03-27T12:00:00.000Z",
				taskId: "new",
				toolName: "send_user_message",
				message: "new",
				turnIdentifier: 1,
				apiCallIdentifier: 1,
			},
			{
				timestamp: "2026-03-20T11:59:59.999Z",
				taskId: "old",
				toolName: "send_user_message",
				message: "old",
				turnIdentifier: 2,
				apiCallIdentifier: 2,
			},
			{
				timestamp: "not-a-date",
				taskId: "invalid",
				toolName: "send_user_message",
				message: "invalid",
				turnIdentifier: 3,
				apiCallIdentifier: 3,
			},
		]

		assert.deepEqual(pruneAgentFeedbackAuditEntries(entries, now), [entries[0]])
	})
})
