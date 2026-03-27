import type { ClineMessage } from "@shared/ExtensionMessage"
import { AwaitingUserResponseSubtypes, ThreadDisplayStates } from "@shared/ExtensionMessage"
import { describe, expect, it } from "vitest"
import {
	filterVisibleMessages,
	groupLowStakesTools,
	isToolGroup,
	shouldAppendThinkingLoaderRow,
	shouldShowThinkingLoaderRow,
} from "./messageUtils"

const createTextMessage = (ts: number, text: string): ClineMessage => ({
	type: "say",
	say: "text",
	text,
	ts,
})

const createToolMessage = (ts: number, tool: string): ClineMessage => ({
	type: "say",
	say: "tool",
	text: JSON.stringify({ tool, path: "src/file.ts" }),
	ts,
})

const createReasoningMessage = (ts: number, text: string): ClineMessage => ({
	type: "say",
	say: "reasoning",
	text,
	ts,
})

const createPartialReasoningMessage = (ts: number, text: string): ClineMessage => ({
	type: "say",
	say: "reasoning",
	text,
	partial: true,
	ts,
})

const createApiReqStartedMessage = (
	ts: number,
	overrides: Partial<Pick<ClineMessage, "partial" | "text">> & { cost?: number | null; cancelReason?: string } = {},
): ClineMessage => ({
	type: "say",
	say: "api_req_started",
	text: JSON.stringify({
		cost: overrides.cost,
		cancelReason: overrides.cancelReason,
	}),
	partial: overrides.partial,
	ts,
})

const createAskMessage = (ts: number, ask: NonNullable<ClineMessage["ask"]>): ClineMessage => ({
	type: "ask",
	ask,
	text: "",
	ts,
})

const createTaskMessage = (ts: number): ClineMessage => ({
	type: "say",
	say: "task",
	text: "",
	ts,
})

const createUserFeedbackMessage = (ts: number, say: "user_feedback" | "user_feedback_diff", text: string): ClineMessage => ({
	type: "say",
	say,
	text,
	ts,
})

const createUseSubagentsMessage = (ts: number, prompts: string[], subagentBatchId?: string): ClineMessage => ({
	type: "ask",
	ask: "use_subagents",
	text: JSON.stringify({ prompts, subagentBatchId }),
	ts,
})

const createSubagentStatusMessage = (
	ts: number,
	subagentBatchId?: string,
	status: "running" | "completed" | "failed" = "running",
): ClineMessage => ({
	type: "say",
	say: "subagent",
	text: JSON.stringify({
		subagentBatchId,
		status,
		total: 1,
		completed: status === "running" ? 0 : 1,
		successes: status === "completed" ? 1 : 0,
		failures: status === "failed" ? 1 : 0,
		toolCalls: 0,
		inputTokens: 0,
		outputTokens: 0,
		contextWindow: 0,
		maxContextTokens: 0,
		maxContextUsagePercentage: 0,
		items: [
			{
				index: 1,
				prompt: "review",
				status: status === "running" ? "running" : status,
				toolCalls: 0,
				inputTokens: 0,
				outputTokens: 0,
				totalCost: 0,
				contextTokens: 0,
				contextWindow: 0,
				contextUsagePercentage: 0,
			},
		],
	}),
	ts,
})

describe("groupLowStakesTools", () => {
	it("keeps text that arrives after a low-stakes tool group by committing the group first", () => {
		const grouped = groupLowStakesTools([
			createTextMessage(1, "Initial text"),
			createToolMessage(2, "readFile"),
			createTextMessage(3, "Late text that should still render"),
		])

		expect(grouped).toHaveLength(3)
		expect(grouped[0]).toMatchObject({ type: "say", say: "text", text: "Initial text" })
		expect(isToolGroup(grouped[1])).toBe(true)
		expect(grouped[2]).toMatchObject({ type: "say", say: "text", text: "Late text that should still render" })

		if (isToolGroup(grouped[1])) {
			expect(grouped[1].every((message) => message.say !== "text")).toBe(true)
		}
	})

	it("keeps text when no low-stakes tool group is active", () => {
		const grouped = groupLowStakesTools([
			createTextMessage(1, "Initial text"),
			createToolMessage(2, "editedExistingFile"),
			createTextMessage(3, "Follow-up text"),
		])

		expect(grouped).toHaveLength(3)
		expect(grouped[0]).toMatchObject({ type: "say", say: "text", text: "Initial text" })
		expect(grouped[1]).toMatchObject({ type: "say", say: "tool" })
		expect(grouped[2]).toMatchObject({ type: "say", say: "text", text: "Follow-up text" })
	})

	it("keeps standalone reasoning when no low-stakes tool group follows", () => {
		const grouped = groupLowStakesTools([
			createReasoningMessage(1, "Thinking through options"),
			createTextMessage(2, "Answer text"),
		])

		expect(grouped).toHaveLength(2)
		expect(grouped[0]).toMatchObject({ type: "say", say: "reasoning", text: "Thinking through options" })
		expect(grouped[1]).toMatchObject({ type: "say", say: "text", text: "Answer text" })
	})

	it("keeps standalone reasoning before a non-low-stakes tool", () => {
		const grouped = groupLowStakesTools([
			createReasoningMessage(1, "Thinking through options"),
			createToolMessage(2, "editedExistingFile"),
		])

		expect(grouped).toHaveLength(2)
		expect(grouped[0]).toMatchObject({ type: "say", say: "reasoning", text: "Thinking through options" })
		expect(grouped[1]).toMatchObject({ type: "say", say: "tool" })
	})

	it("keeps reasoning visible when low-stakes tool group starts immediately after", () => {
		const grouped = groupLowStakesTools([createReasoningMessage(1, "Planning next read"), createToolMessage(2, "readFile")])

		expect(grouped).toHaveLength(2)
		expect(grouped[0]).toMatchObject({ type: "say", say: "reasoning", text: "Planning next read" })
		expect(isToolGroup(grouped[1])).toBe(true)
	})
})

describe("filterVisibleMessages", () => {
	it("keeps only the latest subagent status row for a batch id", () => {
		const filtered = filterVisibleMessages([
			createSubagentStatusMessage(1, "batch-1", "running"),
			createSubagentStatusMessage(2, "batch-1", "completed"),
		])

		expect(filtered).toHaveLength(1)
		expect(filtered[0]).toMatchObject({ type: "say", say: "subagent", ts: 2 })
	})

	it("hides the use_subagents row when a later subagent status row has the same batch id", () => {
		const filtered = filterVisibleMessages([
			createUseSubagentsMessage(1, ["first", "second"], "batch-1"),
			createSubagentStatusMessage(2, "batch-1", "running"),
		])

		expect(filtered).toHaveLength(1)
		expect(filtered[0]).toMatchObject({ type: "say", say: "subagent", ts: 2 })
	})

	it("keeps separate subagent batches visible", () => {
		const filtered = filterVisibleMessages([
			createSubagentStatusMessage(1, "batch-1", "completed"),
			createSubagentStatusMessage(2, "batch-2", "completed"),
		])

		expect(filtered).toHaveLength(2)
		expect(filtered.map((message) => message.ts)).toEqual([1, 2])
	})

	it("preserves legacy broad hiding behavior when use_subagents has no batch id", () => {
		const filtered = filterVisibleMessages([
			createUseSubagentsMessage(1, ["first"]),
			createSubagentStatusMessage(2, "batch-1", "running"),
		])

		expect(filtered).toHaveLength(1)
		expect(filtered[0]).toMatchObject({ type: "say", say: "subagent", ts: 2 })
	})
})

describe("shouldShowThinkingLoaderRow", () => {
	it("does not show Thinking for a completed non-partial assistant tail", () => {
		const messages: ClineMessage[] = [createTextMessage(1, "Completed response")]

		expect(shouldShowThinkingLoaderRow(messages, 1)).toBe(false)
	})

	it("shows Thinking for an incomplete api_req_started before any visible content", () => {
		const messages: ClineMessage[] = [createApiReqStartedMessage(1, { cost: null })]

		expect(shouldShowThinkingLoaderRow(messages, 0)).toBe(true)
	})

	it("shows Thinking for the initial task row before any visible content", () => {
		const messages: ClineMessage[] = [createTaskMessage(1)]

		expect(shouldShowThinkingLoaderRow(messages, 0)).toBe(true)
	})

	it("appends a synthetic Thinking row before visible content", () => {
		const messages: ClineMessage[] = [createApiReqStartedMessage(1, { cost: null })]

		expect(shouldAppendThinkingLoaderRow(messages, 0, undefined, undefined)).toBe(true)
	})

	it("does not append a synthetic Thinking row when a partial visible row is already present", () => {
		const messages: ClineMessage[] = [createPartialReasoningMessage(1, "Thinking through the next step")]

		expect(shouldAppendThinkingLoaderRow(messages, 1, undefined, messages[0])).toBe(false)
	})

	it("does not show Thinking for active_user threads", () => {
		const messages: ClineMessage[] = [createApiReqStartedMessage(1, { cost: null })]

		expect(shouldShowThinkingLoaderRow(messages, 0, ThreadDisplayStates.ACTIVE_USER)).toBe(false)
	})

	it("does not show Thinking for awaiting_user_response.user threads", () => {
		const messages: ClineMessage[] = [createApiReqStartedMessage(1, { cost: null })]

		expect(
			shouldShowThinkingLoaderRow(
				messages,
				0,
				ThreadDisplayStates.AWAITING_USER_RESPONSE,
				AwaitingUserResponseSubtypes.USER,
			),
		).toBe(false)
	})

	it("still allows Thinking for awaiting_user_response.system when the last row is an in-flight API marker", () => {
		const messages: ClineMessage[] = [createApiReqStartedMessage(1, { cost: null })]

		expect(
			shouldShowThinkingLoaderRow(
				messages,
				0,
				ThreadDisplayStates.AWAITING_USER_RESPONSE,
				AwaitingUserResponseSubtypes.SYSTEM,
			),
		).toBe(true)
		expect(
			shouldAppendThinkingLoaderRow(
				messages,
				0,
				ThreadDisplayStates.AWAITING_USER_RESPONSE,
				undefined,
				AwaitingUserResponseSubtypes.SYSTEM,
			),
		).toBe(true)
	})

	it("shows Thinking for user_feedback follow-up states", () => {
		const messages: ClineMessage[] = [createUserFeedbackMessage(1, "user_feedback", "User follow-up")]

		expect(shouldShowThinkingLoaderRow(messages, 1)).toBe(true)
		expect(shouldAppendThinkingLoaderRow(messages, 1, undefined, messages[0])).toBe(true)
	})

	it("does not show Thinking for ask states", () => {
		const messages: ClineMessage[] = [createAskMessage(1, "followup")]

		expect(shouldShowThinkingLoaderRow(messages, 0)).toBe(false)
	})
})
