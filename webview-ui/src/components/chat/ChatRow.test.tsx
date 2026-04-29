import type { ClineMessage } from "@shared/ExtensionMessage"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChatRowContent } from "./ChatRow"

const { mockSubmitWorkflowForm, mockThreadDisplayState } = vi.hoisted(() => ({
	mockSubmitWorkflowForm: vi.fn().mockResolvedValue(undefined),
	mockThreadDisplayState: { value: "awaiting_user_response" as string | null },
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

function createWorkflowFormMessage(payloadOverrides?: Partial<Record<string, unknown>>): ClineMessage {
	return {
		ts: Date.now(),
		type: "ask",
		ask: "workflow_form",
		text: JSON.stringify({
			sessionId: "workflow-form-session",
			workflowFormId: "brainstorming_step_4_choose_approach",
			title: "Workflow Form V2",
			toolDictionaryTitle: "Workflow Dictionary",
			toolDictionaryMarkdown: "## workflow_form",
			renderState: "panel",
			panel: {
				panelId: "active_panel",
				title: "Active Panel",
				promptMarkdown: "Panel prompt markdown.",
				fields: [],
				allowedActions: ["submit", "cancel"],
				actionLabels: {
					submit: "Continue",
					cancel: "Cancel",
				},
			},
			values: {},
			...payloadOverrides,
		}),
	}
}

function renderWorkflowForm(message: ClineMessage) {
	return render(
		<ChatRowContent
			inputValue=""
			isExpanded={true}
			isLast={true}
			message={message}
			onSetQuote={vi.fn()}
			onToggleExpand={vi.fn()}
		/>,
	)
}

describe("ChatRow workflow form v2 rendering", () => {
	it("renders a simple sequential workflow form generically", () => {
		renderWorkflowForm(
			createWorkflowFormMessage({
				panel: {
					panelId: "sequential_panel",
					title: "Sequential Panel",
					promptMarkdown: "Collect sequential inputs.",
					fields: [
						{
							key: "review_input",
							kind: "small_text",
							label: "Review Input",
							required: true,
							allowedValueType: "string",
						},
					],
					allowedActions: ["submit", "cancel"],
					actionLabels: {
						submit: "Next",
						cancel: "Cancel",
					},
				},
			}),
		)

		expect(screen.getByText("Workflow Form V2")).toBeInTheDocument()
		expect(screen.getByText("Sequential Panel")).toBeInTheDocument()
		expect(screen.getByText("Collect sequential inputs.")).toBeInTheDocument()
		expect(screen.getByRole("textbox", { name: "Review Input" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
	})

	it("renders a conditional workflow form with generic actions", () => {
		renderWorkflowForm(
			createWorkflowFormMessage({
				panel: {
					panelId: "conditional_panel",
					title: "Conditional Panel",
					promptMarkdown: "Choose a branch.",
					fields: [
						{
							key: "route",
							kind: "radio_group",
							label: "Route",
							required: true,
							options: [
								{ value: "left", label: "Left" },
								{ value: "right", label: "Right" },
							],
						},
					],
					allowedActions: ["submit", "back", "cancel"],
					actionLabels: {
						submit: "Continue",
						back: "Back",
						cancel: "Cancel",
					},
				},
			}),
		)

		expect(screen.getByText("Conditional Panel")).toBeInTheDocument()
		expect(screen.getByLabelText("Left")).toBeInTheDocument()
		expect(screen.getByLabelText("Right")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument()
	})

	it("hides Retry until the workflow form is rendering a failure state", () => {
		renderWorkflowForm(
			createWorkflowFormMessage({
				renderState: "panel",
				panel: {
					panelId: "normal_panel",
					title: "Normal Panel",
					promptMarkdown: "Normal state should not expose Retry.",
					fields: [],
					allowedActions: ["submit", "retry"],
					actionLabels: {
						submit: "Continue",
						retry: "Retry",
					},
				},
			}),
		)

		expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()
	})

	it("renders a failure-state form with Retry and Back", () => {
		renderWorkflowForm(
			createWorkflowFormMessage({
				renderState: "failure",
				errorMessage: "The operation failed.",
				panel: {
					panelId: "failure_panel",
					title: "Failure Panel",
					promptMarkdown: "Fix the inputs and retry.",
					fields: [
						{
							key: "context_lines",
							kind: "number",
							label: "Context Lines",
							required: true,
							allowedValueType: "integer",
						},
					],
					allowedActions: ["submit", "back", "retry"],
					actionLabels: {
						submit: "Retry Submit",
						back: "Back",
						retry: "Retry",
					},
				},
			}),
		)

		expect(screen.getByText("Failure Panel")).toBeInTheDocument()
		expect(screen.getByText("The operation failed.")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
	})

	it("renders a success-state workflow form", () => {
		renderWorkflowForm(
			createWorkflowFormMessage({
				renderState: "success",
				panel: undefined,
				successMessage: "Workflow form completed successfully.",
			}),
		)

		expect(screen.getByText("Workflow Form V2")).toBeInTheDocument()
		expect(screen.getByText("Workflow form completed successfully.")).toBeInTheDocument()
		expect(screen.queryByText("Open inputs reference")).not.toBeInTheDocument()
	})

	it("renders option descriptions for dropdown, radio_group, and checkbox_group fields", () => {
		renderWorkflowForm(
			createWorkflowFormMessage({
				panel: {
					panelId: "described_options",
					title: "Described Options",
					promptMarkdown: "Render option descriptions.",
					fields: [
						{
							key: "dropdown_choice",
							kind: "dropdown",
							label: "Dropdown Choice",
							required: true,
							options: [{ value: "mind_map", label: "Mind Map", description: "Visual mapping technique" }],
						},
						{
							key: "radio_choice",
							kind: "radio_group",
							label: "Radio Choice",
							required: true,
							options: [{ value: "six_hats", label: "Six Hats", description: "Perspective shifting technique" }],
						},
						{
							key: "checkbox_choice",
							kind: "checkbox_group",
							label: "Checkbox Choice",
							required: false,
							options: [{ value: "reverse", label: "Reverse Brainstorming", description: "Invert the problem" }],
						},
					],
					allowedActions: ["submit"],
				},
			}),
		)

		expect(screen.getByRole("option", { name: "Mind Map - Visual mapping technique" })).toBeInTheDocument()
		expect(screen.getByText("Perspective shifting technique")).toBeInTheDocument()
		expect(screen.getByText("Invert the problem")).toBeInTheDocument()
	})

	it("rebuilds field-level conditional options after rerender", () => {
		const { rerender } = renderWorkflowForm(
			createWorkflowFormMessage({
				panel: {
					panelId: "conditional_options",
					title: "Conditional Options",
					promptMarkdown: "Choose an option.",
					fields: [
						{
							key: "technique",
							kind: "dropdown",
							label: "Technique",
							required: true,
							options: [
								{ value: "mind-map", label: "Mind Map" },
								{ value: "six-hats", label: "Six Hats" },
							],
						},
					],
					allowedActions: ["submit", "back"],
				},
			}),
		)

		expect(screen.getByRole("option", { name: "Mind Map" })).toBeInTheDocument()
		expect(screen.getByRole("option", { name: "Six Hats" })).toBeInTheDocument()

		rerender(
			<ChatRowContent
				inputValue=""
				isExpanded={true}
				isLast={true}
				message={createWorkflowFormMessage({
					panel: {
						panelId: "conditional_options",
						title: "Conditional Options",
						promptMarkdown: "Choose an option.",
						fields: [
							{
								key: "technique",
								kind: "dropdown",
								label: "Technique",
								required: true,
								options: [
									{ value: "crazy-eights", label: "Crazy Eights" },
									{ value: "starbursting", label: "Starbursting" },
								],
							},
						],
						allowedActions: ["submit", "back"],
					},
				})}
				onSetQuote={vi.fn()}
				onToggleExpand={vi.fn()}
			/>,
		)

		expect(screen.getByRole("option", { name: "Crazy Eights" })).toBeInTheDocument()
		expect(screen.getByRole("option", { name: "Starbursting" })).toBeInTheDocument()
		expect(screen.queryByRole("option", { name: "Mind Map" })).not.toBeInTheDocument()
	})

	it("renders only the resolved field set provided by the runtime payload", () => {
		renderWorkflowForm(
			createWorkflowFormMessage({
				panel: {
					panelId: "resolved_only",
					title: "Resolved Only",
					promptMarkdown: "Render the runtime-resolved field set.",
					fields: [
						{
							key: "visible_field",
							kind: "small_text",
							label: "Visible Field",
							required: false,
							allowedValueType: "string",
						},
					],
					allowedActions: ["submit"],
				},
			}),
		)

		expect(screen.getByRole("textbox", { name: "Visible Field" })).toBeInTheDocument()
		expect(screen.queryByRole("textbox", { name: "Hidden Variant" })).not.toBeInTheDocument()
	})

	it("renders every required v2 field kind", () => {
		renderWorkflowForm(
			createWorkflowFormMessage({
				panel: {
					panelId: "all_fields",
					title: "All Fields",
					promptMarkdown: "Render every field kind.",
					fields: [
						{
							key: "dropdown_field",
							kind: "dropdown",
							label: "Dropdown Field",
							required: false,
							options: [{ value: "a", label: "Option A" }],
						},
						{ key: "boolean_field", kind: "boolean", label: "Boolean Field", required: false },
						{ key: "small_text_field", kind: "small_text", label: "Small Text Field", required: false },
						{
							key: "large_text_field",
							kind: "large_text",
							label: "Large Text Field",
							required: false,
							allowedValueType: "string",
						},
						{
							key: "number_field",
							kind: "number",
							label: "Number Field",
							required: false,
							allowedValueType: "integer",
						},
						{
							key: "multi_select_field",
							kind: "multi_select",
							label: "Multi Select Field",
							required: false,
							options: [{ value: "a", label: "Option A" }],
						},
						{
							key: "radio_group_field",
							kind: "radio_group",
							label: "Radio Group Field",
							required: false,
							options: [{ value: "left", label: "Left" }],
						},
						{
							key: "checkbox_group_field",
							kind: "checkbox_group",
							label: "Checkbox Group Field",
							required: false,
							options: [{ value: "check", label: "Check" }],
						},
						{ key: "date_field", kind: "date", label: "Date Field", required: false },
						{ key: "date_time_field", kind: "date_time", label: "Date Time Field", required: false },
						{ key: "file_path_field", kind: "file_path", label: "File Path Field", required: false },
						{ key: "directory_path_field", kind: "directory_path", label: "Directory Path Field", required: false },
						{
							key: "artifact_picker_field",
							kind: "artifact_picker",
							label: "Artifact Picker Field",
							required: false,
						},
						{
							key: "markdown_display_field",
							kind: "markdown_display",
							label: "Markdown Display Field",
							required: false,
							contentMarkdown: "Rendered markdown content.",
						},
						{
							key: "static_notice_field",
							kind: "static_notice",
							label: "Static Notice Field",
							required: false,
							contentMarkdown: "Static notice content.",
						},
					],
					allowedActions: ["submit"],
				},
			}),
		)

		expect(screen.getByLabelText("Dropdown Field")).toBeInTheDocument()
		expect(screen.getByLabelText("Boolean Field")).toBeInTheDocument()
		expect(screen.getByRole("textbox", { name: "Small Text Field" })).toBeInTheDocument()
		expect(screen.getByRole("textbox", { name: "Large Text Field" })).toBeInTheDocument()
		expect(screen.getByLabelText("Number Field")).toBeInTheDocument()
		expect(screen.getByLabelText("Multi Select Field")).toBeInTheDocument()
		expect(screen.getByLabelText("Left")).toBeInTheDocument()
		expect(screen.getByLabelText("Check")).toBeInTheDocument()
		expect(screen.getByLabelText("Date Field")).toBeInTheDocument()
		expect(screen.getByLabelText("Date Time Field")).toBeInTheDocument()
		expect(screen.getByLabelText("File Path Field")).toBeInTheDocument()
		expect(screen.getByLabelText("Directory Path Field")).toBeInTheDocument()
		expect(screen.getByLabelText("Artifact Picker Field")).toBeInTheDocument()
		expect(screen.getByText("Rendered markdown content.")).toBeInTheDocument()
		expect(screen.getByText("Static notice content.")).toBeInTheDocument()
	})
})

describe("ChatRow shared entry workflow form rendering", () => {
	it("renders the informational first panel of the shared entry workflow form", () => {
		renderWorkflowForm(
			createWorkflowFormMessage({
				title: "Welcome to the Planning Workflow!",
				panel: {
					panelId: "__workflow_runtime_entry_info__",
					title: "Workflow Overview",
					promptMarkdown: "Planning workflow overview content.",
					fields: [],
					allowedActions: ["submit"],
					actionLabels: {
						submit: "Continue",
					},
				},
			}),
		)

		expect(screen.getByText("Welcome to the Planning Workflow!")).toBeInTheDocument()
		expect(screen.getByText("Workflow Overview")).toBeInTheDocument()
		expect(screen.getByText("Planning workflow overview content.")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument()
	})

	it("renders the project-selection second panel of the shared entry workflow form", () => {
		renderWorkflowForm(
			createWorkflowFormMessage({
				title: "Welcome to the Planning Workflow!",
				panel: {
					panelId: "__workflow_runtime_entry_project_selection__",
					title: "Project Selection",
					promptMarkdown: "Choose whether to start a new project or continue with an existing project.",
					fields: [
						{
							key: "__workflow_runtime_project_mode__",
							kind: "radio_group",
							label: "Project mode",
							required: true,
							options: [
								{ value: "new", label: "New Project" },
								{ value: "existing", label: "Existing Project" },
							],
						},
						{
							key: "__workflow_runtime_existing_project__",
							kind: "dropdown",
							label: "Existing project",
							required: true,
							options: [
								{ value: "project-alpha", label: "Project Alpha" },
								{ value: "project-beta", label: "Project Beta" },
							],
						},
					],
					allowedActions: ["submit", "back"],
					actionLabels: {
						submit: "Start Workflow",
						back: "Back",
					},
				},
				values: {
					__workflow_runtime_project_mode__: { valueType: "string", stringValue: "existing" },
					__workflow_runtime_existing_project__: { valueType: "string", stringValue: "project-beta" },
				},
			}),
		)

		expect(screen.getByText("Project Selection")).toBeInTheDocument()
		expect(
			screen.getByText("Choose whether to start a new project or continue with an existing project."),
		).toBeInTheDocument()
		expect(screen.getByLabelText("New Project")).toBeInTheDocument()
		expect(screen.getByLabelText("Existing Project")).toBeInTheDocument()
		expect(screen.getByLabelText("Existing project")).toHaveValue("project-beta")
		expect(screen.getByRole("option", { name: "Project Alpha" })).toBeInTheDocument()
		expect(screen.getByRole("option", { name: "Project Beta" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Start Workflow" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument()
	})
})
