import type { ClineMessage } from "@shared/ExtensionMessage"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ChatRowContent, getFollowupPresentation } from "./ChatRow"

const { mockSubmitWorkflowForm, mockThreadDisplayState } = vi.hoisted(() => ({
	mockSubmitWorkflowForm: vi.fn().mockResolvedValue(undefined),
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

vi.mock("@/services/grpc-client", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/services/grpc-client")>()

	return {
		...actual,
		TaskServiceClient: {
			submitWorkflowForm: mockSubmitWorkflowForm,
		},
		UiServiceClient: {
			openUrl: vi.fn(),
			setTerminalExecutionMode: vi.fn(),
		},
	}
})

function createWorkflowFormMessage(phase: "collect" | "confirm"): ClineMessage {
	return {
		ts: Date.now(),
		type: "ask",
		ask: "workflow_form",
		text: JSON.stringify({
			sessionId: "session-1",
			resolverId: "code_review_step_3_diff_source",
			toolName: "build_review_diff_output",
			title: "Review Diff Artifact",
			prompt:
				phase === "confirm"
					? "This workflow requires the following tool-produced artifact: `review-input.diff`.\n\nCan you provide the inputs required to produce `review-input.diff`?"
					: "Select and provide the inputs needed to produce `review-input.diff`.",
			phase,
			toolDictionaryTitle: "Diff Source Reference",
			toolDictionaryMarkdown: "## build_review_diff_output\n\nTool reference body.",
			options: ["Yes", "No"],
			fields:
				phase === "collect"
					? [
							{
								key: "source.type",
								label: "Source type",
								help: "Choose a diff source.",
								control: "select",
								required: true,
								options: [
									{ value: "commit", label: "Commit" },
									{ value: "commit_range", label: "Commit range" },
								],
							},
						]
					: undefined,
		}),
	}
}

describe("ChatRow followup presentation", () => {
	beforeEach(() => {
		mockThreadDisplayState.value = "idle_open"
		vi.clearAllMocks()
	})

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

	it("renders agent feedback rows", () => {
		mockThreadDisplayState.value = "idle_open"

		const message: ClineMessage = {
			ts: Date.now(),
			type: "say",
			say: "agent_feedback",
			text: JSON.stringify({
				label: "Real-Time Agent Feedback",
				message: "Blocked on unstable behavior.",
				timestamp: "2026-03-28T12:00:00.000Z",
				toolName: "send_user_message",
				taskId: "task-1",
				turnIdentifier: 1,
				apiCallIdentifier: 1,
			}),
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

		expect(screen.getByText("Real-Time Agent Feedback")).toBeInTheDocument()
		expect(screen.getByText("Blocked on unstable behavior.")).toBeInTheDocument()
	})

	it("renders workflow_form confirm rows as a system-owned form", () => {
		const message = createWorkflowFormMessage("confirm")

		render(
			<ChatRowContent
				inputValue=""
				isExpanded={true}
				isLast={true}
				message={message}
				onSetQuote={vi.fn()}
				onToggleExpand={vi.fn()}
			/>,
		)

		expect(screen.getByText("System-owned form:")).toBeInTheDocument()
		expect(screen.getByText("Review Diff Artifact")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Open inputs reference" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument()
	})

	it("opens the workflow dictionary in a read-only dialog", async () => {
		const message = createWorkflowFormMessage("confirm")

		render(
			<ChatRowContent
				inputValue=""
				isExpanded={true}
				isLast={true}
				message={message}
				onSetQuote={vi.fn()}
				onToggleExpand={vi.fn()}
			/>,
		)

		fireEvent.click(screen.getByRole("button", { name: "Open inputs reference" }))

		expect(await screen.findByText("Diff Source Reference")).toBeInTheDocument()
		expect(await screen.findByText("build_review_diff_output")).toBeInTheDocument()
	})
})
