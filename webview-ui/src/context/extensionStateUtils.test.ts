import type { ClineMessage } from "@shared/ExtensionMessage"
import { ThreadDisplayStates } from "@shared/ExtensionMessage"
import { describe, expect, it } from "vitest"
import { shouldPreservePreviousClineMessages } from "./extensionStateUtils"

const createTextMessage = (ts: number, text: string): ClineMessage => ({
	type: "say",
	say: "text",
	text,
	ts,
})

describe("shouldPreservePreviousClineMessages", () => {
	it("preserves previous messages for the same active task when the new payload is empty", () => {
		expect(
			shouldPreservePreviousClineMessages({
				previousClineMessages: [createTextMessage(1, "stale but still active")],
				previousTaskItem: { id: "task-1", threadDisplayState: ThreadDisplayStates.ACTIVE_RUN },
				nextClineMessages: [],
				nextTaskItem: { id: "task-1", threadDisplayState: ThreadDisplayStates.ACTIVE_RUN },
			}),
		).toBe(true)
	})

	it("does not preserve previous messages when the same task is already user-ready", () => {
		expect(
			shouldPreservePreviousClineMessages({
				previousClineMessages: [createTextMessage(1, "stale loader row")],
				previousTaskItem: { id: "task-1", threadDisplayState: ThreadDisplayStates.ACTIVE_RUN },
				nextClineMessages: [],
				nextTaskItem: { id: "task-1", threadDisplayState: ThreadDisplayStates.ACTIVE_USER },
			}),
		).toBe(false)
	})
})
