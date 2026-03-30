import type { ClineMessage, WorkflowFormPhase } from "@shared/ExtensionMessage"
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

function createWorkflowFormMessage(phase: WorkflowFormPhase): ClineMessage {
	const sourceSelectionFields = [
		{
			key: "source.type",
			label: "Source type",
			help: "Choose a diff source.",
			control: "select" as const,
			required: true,
			options: [
				{ value: "commit", label: "Commit" },
				{ value: "commit_range", label: "Commit range" },
			],
		},
	]
	const concreteCommitFields = [
		{
			key: "source.commit",
			label: "Commit",
			help: "Enter the commit SHA.",
			control: "text" as const,
			required: true,
			placeholder: "abc1234",
		},
		{
			key: "scoped_paths",
			label: "Scoped paths",
			help: "Optional path filter.",
			control: "textarea" as const,
			required: false,
			placeholder: "src/core/task/index.ts",
		},
		{
			key: "context_lines",
			label: "Context lines",
			help: "Optional context lines.",
			control: "number" as const,
			required: false,
			placeholder: "3",
		},
	]

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
					: phase === "select_source"
						? "This workflow requires the tool-produced artifact `review-input.diff`.\n\nChoose which diff source you have so we can collect the right inputs."
						: phase === "collect_inputs"
							? "Provide the concrete inputs needed to produce `review-input.diff`."
							: phase === "retry_error"
								? "The system could not produce `review-input.diff`. Update the inputs or retry the request."
								: "The workflow form completed successfully.",
			phase,
			toolDictionaryTitle: "Diff Source Reference",
			toolDictionaryMarkdown: "## build_review_diff_output\n\nTool reference body.",
			options: phase === "confirm" ? ["Yes", "No"] : undefined,
			fields:
				phase === "select_source"
					? sourceSelectionFields
					: phase === "collect_inputs" || phase === "retry_error"
						? concreteCommitFields
						: undefined,
			values:
				phase === "collect_inputs" || phase === "retry_error"
					? {
							confirm: { stringValue: "yes" },
							"source.type": { stringValue: "commit" },
						}
					: undefined,
			submitLabel:
				phase === "select_source" ? "Next" : phase === "collect_inputs" || phase === "retry_error" ? "Submit" : undefined,
			cancelLabel:
				phase === "select_source" || phase === "collect_inputs" || phase === "retry_error" ? "Cancel" : undefined,
			retryLabel: phase === "retry_error" ? "Start Over" : undefined,
			errorMessage: phase === "retry_error" ? "The system could not produce review-input.diff." : undefined,
			successMessage: phase === "success" ? "The workflow form completed successfully." : undefined,
		}),
	}
}

function renderWorkflowFormRow(phase: WorkflowFormPhase) {
	return render(
		<ChatRowContent
			inputValue=""
			isExpanded={true}
			isLast={true}
			message={createWorkflowFormMessage(phase)}
			onSetQuote={vi.fn()}
			onToggleExpand={vi.fn()}
		/>,
	)
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

	it("renders the select_source workflow form with Next and without Submit", () => {
		renderWorkflowFormRow("select_source")

		expect(screen.getByLabelText("Source type")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument()
	})

	it("renders the collect_inputs workflow form with concrete commit inputs and Submit", () => {
		renderWorkflowFormRow("collect_inputs")

		expect(screen.getByLabelText("Commit")).toBeInTheDocument()
		expect(screen.getByLabelText("Scoped paths")).toBeInTheDocument()
		expect(screen.getByLabelText("Context lines")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument()
	})

	it("renders the retry_error workflow form with the error banner, Start Over, and Submit", () => {
		renderWorkflowFormRow("retry_error")

		expect(screen.getByText("The system could not produce review-input.diff.")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Start Over" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument()
	})

	it("keeps Next disabled in select_source until source.type is chosen", () => {
		renderWorkflowFormRow("select_source")

		const nextButton = screen.getByRole("button", { name: "Next" })
		expect(nextButton).toBeDisabled()

		fireEvent.change(screen.getByLabelText("Source type"), { target: { value: "commit" } })

		expect(nextButton).not.toBeDisabled()
	})

	it("keeps Submit disabled in collect_inputs until required concrete fields are populated", () => {
		renderWorkflowFormRow("collect_inputs")

		const submitButton = screen.getByRole("button", { name: "Submit" })
		expect(submitButton).toBeDisabled()

		fireEvent.change(screen.getByLabelText("Commit"), { target: { value: "abc1234" } })

		expect(submitButton).not.toBeDisabled()
	})

	it("keeps Submit available for corrected retry_error inputs and Start Over available to restart", () => {
		renderWorkflowFormRow("retry_error")

		const submitButton = screen.getByRole("button", { name: "Submit" })
		const startOverButton = screen.getByRole("button", { name: "Start Over" })

		expect(submitButton).toBeDisabled()
		expect(startOverButton).not.toBeDisabled()

		fireEvent.change(screen.getByLabelText("Commit"), { target: { value: "def5678" } })

		expect(submitButton).not.toBeDisabled()
		expect(startOverButton).not.toBeDisabled()
	})
})
