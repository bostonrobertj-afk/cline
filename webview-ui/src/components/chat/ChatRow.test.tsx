import type {
	ClineMessage,
	ClineWorkflowStartCard,
	WorkflowFormAutomaticStatusState,
	WorkflowFormPhase,
} from "@shared/ExtensionMessage"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ChatRowContent, getFollowupPresentation } from "./ChatRow"

const WORKFLOW_START_PROMPT_FIXTURE = "Workflow form prompt content for test coverage."

const { mockSubmitWorkflowForm, mockSubmitWorkflowStartCard, mockThreadDisplayState } = vi.hoisted(() => ({
	mockSubmitWorkflowForm: vi.fn().mockResolvedValue(undefined),
	mockSubmitWorkflowStartCard: vi.fn().mockResolvedValue(undefined),
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
			submitWorkflowStartCard: mockSubmitWorkflowStartCard,
		},
		UiServiceClient: {
			openUrl: vi.fn(),
			setTerminalExecutionMode: vi.fn(),
		},
	}
})

function createWorkflowFormMessage(phase: WorkflowFormPhase, overrides?: Partial<Record<string, unknown>>): ClineMessage {
	const sourceSelectionFields = [
		{
			key: "source.type",
			label: "Source type",
			help: "Choose a diff source.",
			control: "select" as const,
			valueSchema: { type: "string" as const, enum: ["commit", "commit_range"] },
			required: true,
			options: [
				{ value: "commit", label: "Commit" },
				{ value: "commit_range", label: "Commit range" },
			],
			visible: true,
		},
	]
	const concreteCommitFields = [
		{
			key: "source.commit",
			label: "Commit",
			help: "Enter the commit SHA.",
			control: "text" as const,
			valueSchema: { type: "string" as const },
			required: true,
			placeholder: "abc1234",
			visible: true,
		},
		{
			key: "scoped_paths",
			label: "Scoped paths",
			help: "Optional path filter.",
			control: "textarea" as const,
			valueSchema: { type: "array" as const, items: { type: "string" as const } },
			required: false,
			placeholder: "src/core/task/index.ts",
			visible: true,
		},
		{
			key: "context_lines",
			label: "Context lines",
			help: "Optional context lines.",
			control: "number" as const,
			valueSchema: { type: "integer" as const },
			required: false,
			placeholder: "3",
			visible: true,
		},
	]
	const definition = {
		toolName: "build_review_diff_output",
		title: "Review Diff Artifact",
		toolDictionaryTitle: "Diff Output Reference",
		toolDictionaryMarkdown: "## build_review_diff_output\n\nTool reference body.",
		pages: {
			confirm: {
				prompt: "This workflow requires the following tool-produced artifact: `review-input.diff`.\n\nCan you provide the inputs required to produce `review-input.diff`?",
				options: ["Yes", "No"],
			},
			select_source: {
				prompt: "This workflow requires the tool-produced artifact `review-input.diff`.\n\nChoose which diff source you have so we can collect the right inputs.",
				fields: sourceSelectionFields,
				submitLabel: "Next",
				cancelLabel: "Cancel",
			},
			collect_inputs: {
				prompt: "Provide the concrete inputs needed to produce `review-input.diff`.",
				fields: concreteCommitFields,
				submitLabel: "Submit",
				cancelLabel: "Cancel",
			},
			retry_error: {
				prompt: "The system could not produce `review-input.diff`. Update the inputs or retry the request.",
				fields: concreteCommitFields,
				submitLabel: "Submit",
				cancelLabel: "Cancel",
				retryLabel: "Start Over",
			},
		},
		successMessage: "The workflow form completed successfully.",
	}

	return {
		ts: Date.now(),
		type: "ask",
		ask: "workflow_form",
		text: JSON.stringify({
			sessionId: "session-1",
			resolverId: "code_review_step_3_diff_source",
			phase,
			definition,
			values:
				phase === "collect_inputs" || phase === "retry_error"
					? {
							confirm: { rawValue: "yes" },
							"source.type": { rawValue: "commit" },
						}
					: undefined,
			errorMessage: phase === "retry_error" ? "The system could not produce review-input.diff." : undefined,
			successMessage: phase === "success" ? "The workflow form completed successfully." : undefined,
			...overrides,
		}),
	}
}

function createAutomaticWorkflowStatusMessage(
	state: WorkflowFormAutomaticStatusState,
	overrides?: Partial<Record<string, unknown>>,
): ClineMessage {
	return {
		ts: Date.now(),
		type: "say",
		say: "workflow_form",
		text: JSON.stringify({
			sessionId: "automatic-session-1",
			resolverId: "code_review_step_3_review_input",
			phase: state === "pending" ? "collect_inputs" : "success",
			definition: {
				toolName: "build_review_input",
				title: "Review Input Artifact",
				toolDictionaryTitle: "Review Input Reference",
				toolDictionaryMarkdown: "## build_review_input",
				presentation: {
					kind: "automatic_status",
					pendingLabel: "Preparing workflow documents",
					successLabel: "Workflow documents ready",
					failureLabel: "Automatic workflow preparation failed- falling back to manual LLM workflow preparation.",
				},
				pages: {
					collect_inputs: {
						prompt: "The system will now build `review-input.md` from the stored `story_path` and the workflow-owned `review-input.diff` artifact.",
						fields: [],
					},
				},
				successMessage: "The Step 3 review-input artifact is ready.",
			},
			automaticStatusState: state,
			...overrides,
		}),
	}
}

function createWorkflowStartCardMessage(overrides?: Partial<ClineWorkflowStartCard>): ClineMessage {
	return {
		ts: Date.now(),
		type: "ask",
		ask: "workflow_start_card",
		text: JSON.stringify({
			sessionId: "start-card-session-1",
			title: "Welcome to the Quick Spec Workflow!",
			markdownBody:
				"In this workflow you will build a small implementation-ready tech spec through guided discovery, scoped planning, and a final review pass.",
			ctaLabel: "Get Started",
			...overrides,
		}),
	}
}

function renderWorkflowFormRow(phase: WorkflowFormPhase, overrides?: Partial<Record<string, unknown>>) {
	return render(
		<ChatRowContent
			inputValue=""
			isExpanded={true}
			isLast={true}
			message={createWorkflowFormMessage(phase, overrides)}
			onSetQuote={vi.fn()}
			onToggleExpand={vi.fn()}
		/>,
	)
}

function renderAutomaticWorkflowStatusRow(state: WorkflowFormAutomaticStatusState, overrides?: Partial<Record<string, unknown>>) {
	return render(
		<ChatRowContent
			inputValue=""
			isExpanded={true}
			isLast={true}
			message={createAutomaticWorkflowStatusMessage(state, overrides)}
			onSetQuote={vi.fn()}
			onToggleExpand={vi.fn()}
		/>,
	)
}

function renderWorkflowStartCardRow(overrides?: Partial<ClineWorkflowStartCard>) {
	return render(
		<ChatRowContent
			inputValue=""
			isExpanded={true}
			isLast={true}
			message={createWorkflowStartCardMessage(overrides)}
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
		renderWorkflowFormRow("confirm")

		expect(screen.getByText("System-owned form:")).toBeInTheDocument()
		expect(screen.getByText("Review Diff Artifact")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Open inputs reference" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument()
	})

	it("renders workflow_start_card with only the Get Started CTA and submits through the dedicated transport", async () => {
		renderWorkflowStartCardRow()

		expect(screen.getByText("Welcome to the Quick Spec Workflow!")).toBeInTheDocument()
		expect(
			screen.getByText(
				"In this workflow you will build a small implementation-ready tech spec through guided discovery, scoped planning, and a final review pass.",
			),
		).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Get Started" })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Open inputs reference" })).not.toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Yes" })).not.toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "No" })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "Get Started" }))

		expect(mockSubmitWorkflowStartCard).toHaveBeenCalledTimes(1)
		expect(mockSubmitWorkflowStartCard).toHaveBeenCalledWith(
			expect.objectContaining({
				sessionId: "start-card-session-1",
			}),
		)
	})

	it("renders automatic workflow preparation rows with the pending label and no interactive controls", () => {
		renderAutomaticWorkflowStatusRow("pending")

		expect(screen.getByText("Preparing workflow documents")).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Yes" })).not.toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "No" })).not.toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Open inputs reference" })).not.toBeInTheDocument()
	})

	it("renders automatic workflow preparation rows with the success label", () => {
		renderAutomaticWorkflowStatusRow("success")

		expect(screen.getByText("Workflow documents ready")).toBeInTheDocument()
	})

	it("renders automatic workflow preparation rows with the failure label", () => {
		renderAutomaticWorkflowStatusRow("failure")

		expect(
			screen.getByText("Automatic workflow preparation failed- falling back to manual LLM workflow preparation."),
		).toBeInTheDocument()
	})

	it("renders workflow-form title and prompt from the canonical definition", () => {
		renderWorkflowFormRow("collect_inputs", {
			definition: {
				toolName: "set_workflow_placeholders",
				title: "Workflow Start Inputs",
				toolDictionaryTitle: "Workflow Placeholder Reference",
				toolDictionaryMarkdown: "## set_workflow_placeholders",
				pages: {
					collect_inputs: {
						prompt: WORKFLOW_START_PROMPT_FIXTURE,
						fields: [],
						submitLabel: "Submit",
						cancelLabel: "Cancel",
					},
				},
				successMessage: "Workflow start inputs were stored.",
			},
		})

		expect(screen.getByText("Workflow Start Inputs")).toBeInTheDocument()
		const title = screen.getByText("Workflow Start Inputs")
		const promptContainer = title.closest(".border")?.querySelector(".pt-2")

		expect(promptContainer?.textContent?.trim().length ?? 0).toBeGreaterThan(0)
	})

	it("opens the workflow dictionary in a read-only dialog", async () => {
		renderWorkflowFormRow("confirm")

		fireEvent.click(screen.getByRole("button", { name: "Open inputs reference" }))

		expect(await screen.findByText("Diff Output Reference")).toBeInTheDocument()
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

	it("shows a red asterisk on required workflow-start fields", () => {
		renderWorkflowFormRow("collect_inputs", {
			resolverId: "placeholder_workflow_start_set_workflow_placeholders",
			definition: {
				toolName: "set_workflow_placeholders",
				title: "Workflow Start Inputs",
				toolDictionaryTitle: "Workflow Placeholder Reference",
				toolDictionaryMarkdown: "## set_workflow_placeholders",
				pages: {
					collect_inputs: {
						prompt: WORKFLOW_START_PROMPT_FIXTURE,
						fields: [
							{
								key: "review_input",
								label: "Review Input File",
								help: "Path to the review input file.",
								control: "text",
								valueSchema: { type: "string" },
								required: true,
								visible: true,
							},
						],
						submitLabel: "Submit",
						cancelLabel: "Cancel",
					},
				},
				successMessage: "Workflow start inputs were stored.",
			},
			values: {},
		})

		expect(screen.getByText("*")).toBeInTheDocument()
	})

	it("renders the workflow-start one-of group with OR separators", () => {
		renderWorkflowFormRow("collect_inputs", {
			resolverId: "placeholder_workflow_start_set_workflow_placeholders",
			definition: {
				toolName: "set_workflow_placeholders",
				title: "Workflow Start Inputs",
				toolDictionaryTitle: "Workflow Placeholder Reference",
				toolDictionaryMarkdown: "## set_workflow_placeholders",
				pages: {
					collect_inputs: {
						prompt: WORKFLOW_START_PROMPT_FIXTURE,
						fields: [
							{
								key: "review_input",
								label: "Review Input File",
								help: "Path to the review input file.",
								control: "text",
								valueSchema: { type: "string" },
								required: true,
								visible: true,
							},
							{
								key: "diff_output",
								label: "Review Diff File",
								help: "Path to the review diff file.",
								control: "text",
								valueSchema: { type: "string" },
								required: false,
								oneOfGroupId: "workflow_start_one_of",
								visible: true,
							},
							{
								key: "spec_file",
								label: "Spec or Story File",
								help: "Path to the supporting spec or story file.",
								control: "text",
								valueSchema: { type: "string" },
								required: false,
								oneOfGroupId: "workflow_start_one_of",
								visible: true,
							},
						],
						submitLabel: "Submit",
						cancelLabel: "Cancel",
					},
				},
				successMessage: "Workflow start inputs were stored.",
			},
			values: {},
		})

		expect(screen.getByText("Provide one of the following")).toBeInTheDocument()
		expect(screen.getByText("OR")).toBeInTheDocument()
	})

	it("keeps Submit disabled until required fields and the one-of group are satisfied", () => {
		renderWorkflowFormRow("collect_inputs", {
			resolverId: "placeholder_workflow_start_set_workflow_placeholders",
			definition: {
				toolName: "set_workflow_placeholders",
				title: "Workflow Start Inputs",
				toolDictionaryTitle: "Workflow Placeholder Reference",
				toolDictionaryMarkdown: "## set_workflow_placeholders",
				pages: {
					collect_inputs: {
						prompt: WORKFLOW_START_PROMPT_FIXTURE,
						fields: [
							{
								key: "review_input",
								label: "Review Input File",
								help: "Path to the review input file.",
								control: "text",
								valueSchema: { type: "string" },
								required: true,
								visible: true,
							},
							{
								key: "diff_output",
								label: "Review Diff File",
								help: "Path to the review diff file.",
								control: "text",
								valueSchema: { type: "string" },
								required: false,
								oneOfGroupId: "workflow_start_one_of",
								visible: true,
							},
							{
								key: "spec_file",
								label: "Spec or Story File",
								help: "Path to the supporting spec or story file.",
								control: "text",
								valueSchema: { type: "string" },
								required: false,
								oneOfGroupId: "workflow_start_one_of",
								visible: true,
							},
						],
						submitLabel: "Submit",
						cancelLabel: "Cancel",
					},
				},
				successMessage: "Workflow start inputs were stored.",
			},
			values: {},
		})

		const submitButton = screen.getByRole("button", { name: "Submit" })
		expect(submitButton).toBeDisabled()

		fireEvent.change(screen.getByLabelText("Review Input File"), { target: { value: "docs/review.md" } })
		expect(submitButton).toBeDisabled()

		fireEvent.change(screen.getByLabelText("Spec or Story File"), { target: { value: "docs/spec.md" } })
		expect(submitButton).not.toBeDisabled()
	})

	it("prefills workflow_form inputs from raw values", () => {
		renderWorkflowFormRow("collect_inputs", {
			values: {
				confirm: { rawValue: "yes" },
				"source.type": { rawValue: "commit" },
				"source.commit": { rawValue: "abc1234" },
				context_lines: { rawValue: "7" },
			},
		})

		expect(screen.getByDisplayValue("abc1234")).toBeInTheDocument()
		expect(screen.getByDisplayValue("7")).toBeInTheDocument()
	})
})
