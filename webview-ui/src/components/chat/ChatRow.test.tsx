import type { ClineMessage } from "@shared/ExtensionMessage"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChatRowContent, getFollowupPresentation } from "./ChatRow"

const { mockThreadDisplayState } = vi.hoisted(() => ({
	mockThreadDisplayState: { value: "idle_open" as string | null },
}))

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		backgroundEditEnabled: false,
		mcpServers: [],
		mcpMarketplaceCatalog: {},
		currentTaskItem: {
			threadDisplayState: mockThreadDisplayState.value,
		},
		onRelinquishControl: vi.fn(),
		vscodeTerminalExecutionMode: "terminal",
		clineMessages: [],
	}),
}))

describe("ChatRow followup presentation", () => {
	it("renders reopened followup messages as a passive thread label", () => {
		const presentation = getFollowupPresentation(undefined, true)

		expect(presentation.hasQuestion).to.equal(false)
		expect(presentation.title).to.equal("Conversation reopened:")
	})

	it("renders genuine follow-up questions with question framing", () => {
		const presentation = getFollowupPresentation(JSON.stringify({ question: "What should I do next?" }))

		expect(presentation.hasQuestion).to.equal(true)
		expect(presentation.title).to.equal("Cline has a question:")
		expect(presentation.question).to.equal("What should I do next?")
	})

	it("uses the active persona name for follow-up questions when available", () => {
		const presentation = getFollowupPresentation(JSON.stringify({ question: "What should I do next?" }), false, "Barry")

		expect(presentation.hasQuestion).to.equal(true)
		expect(presentation.title).to.equal("Barry has a question:")
	})

	it("renders the reopened banner for idle_open followup rows", () => {
		mockThreadDisplayState.value = "idle_open"

		const message: ClineMessage = {
			ts: Date.now(),
			type: "ask",
			ask: "followup",
			text: JSON.stringify({ question: "What should I do next?" }),
		}

		render(
			<ChatRowContent
				inputValue=""
				isExpanded={true}
				isLast={false}
				message={message}
				onSetQuote={vi.fn()}
				onToggleExpand={vi.fn()}
			/>,
		)

		expect(screen.getByText("Conversation reopened.")).toBeInTheDocument()
		expect(screen.getByText("Conversation reopened:")).toBeInTheDocument()
	})

	it("does not render the reopened banner for active_user followup rows", () => {
		mockThreadDisplayState.value = "active_user"

		const message: ClineMessage = {
			ts: Date.now(),
			type: "ask",
			ask: "followup",
			text: JSON.stringify({ question: "What should I do next?" }),
		}

		render(
			<ChatRowContent
				inputValue=""
				isExpanded={true}
				isLast={false}
				message={message}
				onSetQuote={vi.fn()}
				onToggleExpand={vi.fn()}
			/>,
		)

		expect(screen.queryByText("Conversation reopened.")).not.toBeInTheDocument()
		expect(screen.getByText("Cline has a question:")).toBeInTheDocument()
		expect(screen.getByText("What should I do next?")).toBeInTheDocument()
	})
})
