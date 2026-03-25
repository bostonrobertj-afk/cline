import { expect } from "chai"
import { afterEach, beforeEach, describe, it } from "mocha"
import { Logger } from "@/shared/services/Logger"
import { logFocusChainDiagnosticEvent, summarizeFocusChainText, summarizeFocusChainTextBlocks } from "../diagnostics"

describe("focus chain diagnostics", () => {
	let messages: string[]
	let subscriber: (msg: string) => void

	beforeEach(() => {
		messages = []
		subscriber = (msg: string) => {
			messages.push(msg)
		}
		Logger.subscribe(subscriber)
	})

	afterEach(() => {
		Logger.unsubscribe(subscriber)
	})

	it("emits structured output through the shared logger", () => {
		logFocusChainDiagnosticEvent("task-123", "focus_chain_decision", {
			shouldInclude: true,
			placeholderWorkflowActive: true,
		})

		expect(messages).to.have.length(1)
		expect(messages[0]).to.contain("[Task task-123] [focus-chain-diagnostics] focus_chain_decision")
		expect(messages[0]).to.contain('"shouldInclude":true')
		expect(messages[0]).to.contain('"placeholderWorkflowActive":true')
	})

	it("summarizes focus-chain text without logging the full body", () => {
		const textSummary = summarizeFocusChainText("abc TODO LIST UPDATE SUGGESTED def # CURRENT WORKFLOW STEP")
		const blockSummary = summarizeFocusChainTextBlocks([
			{ type: "text", text: "abc TODO LIST UPDATE SUGGESTED" },
			{ type: "text", text: "def # CURRENT WORKFLOW STEP" },
		])

		expect(textSummary).to.deep.equal({
			length: 58,
			containsTodoListUpdateSuggested: true,
			containsCurrentWorkflowStep: true,
		})
		expect(blockSummary).to.deep.equal({
			textBlockCount: 2,
			containsTodoListUpdateSuggested: true,
			containsCurrentWorkflowStep: true,
		})
	})
})
