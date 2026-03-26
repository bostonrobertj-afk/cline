import type { ClineMessage } from "@shared/ExtensionMessage"
import { describe, expect, it } from "vitest"
import { filterVisibleMessages, groupLowStakesTools, isToolGroup } from "./messageUtils"

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
