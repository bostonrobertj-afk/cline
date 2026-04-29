import type { WorkflowForm } from "@shared/ExtensionMessage"
import { WorkflowFormAction } from "@shared/proto/cline/task"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockSubmitWorkflowForm } = vi.hoisted(() => ({
	mockSubmitWorkflowForm: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/services/grpc-client", () => ({
	SlashServiceClient: {},
	TaskServiceClient: {
		submitWorkflowForm: mockSubmitWorkflowForm,
	},
}))

import { buildWorkflowFormSubmissionRequest, submitWorkflowForm } from "./useMessageHandlers"

function createWorkflowForm(fields: NonNullable<WorkflowForm["panel"]>["fields"]): WorkflowForm {
	return {
		sessionId: "workflow-form-session",
		workflowFormId: "brainstorming_step_4_choose_approach",
		title: "Workflow Form V2",
		toolDictionaryTitle: "Workflow Dictionary",
		toolDictionaryMarkdown: "## workflow_form",
		renderState: "panel",
		panel: {
			panelId: "active_panel",
			title: "Active Panel",
			promptMarkdown: "Fill the panel.",
			fields,
			allowedActions: ["submit", "back", "cancel"],
		},
		values: {},
	}
}

describe("useMessageHandlers workflow form submit builders", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("submits boolean values through the typed transport", async () => {
		await submitWorkflowForm(
			createWorkflowForm([
				{
					key: "confirmed",
					kind: "boolean",
					label: "Confirmed",
					required: true,
				},
			]),
			WorkflowFormAction.SUBMIT,
			{ confirmed: true },
		)

		expect(mockSubmitWorkflowForm).toHaveBeenCalledTimes(1)
		expect(mockSubmitWorkflowForm.mock.calls[0]?.[0]).toMatchObject({
			sessionId: "workflow-form-session",
			panelId: "active_panel",
			action: WorkflowFormAction.SUBMIT,
			fields: [
				{
					key: "confirmed",
					value: {
						booleanValue: true,
					},
				},
			],
		})
	})

	it("submits integer values through the typed transport", async () => {
		await submitWorkflowForm(
			createWorkflowForm([
				{
					key: "context_lines",
					kind: "number",
					label: "Context Lines",
					required: true,
					allowedValueType: "integer",
				},
			]),
			WorkflowFormAction.SUBMIT,
			{ context_lines: "7" },
		)

		expect(mockSubmitWorkflowForm.mock.calls[0]?.[0]).toMatchObject({
			panelId: "active_panel",
			fields: [
				{
					key: "context_lines",
					value: {
						integerValue: 7,
					},
				},
			],
		})
		expect(mockSubmitWorkflowForm.mock.calls[0]?.[0]?.fields?.[0]?.value?.stringValue).toBeUndefined()
	})

	it("rejects decimal input for an integer field instead of truncating it", () => {
		const request = buildWorkflowFormSubmissionRequest(
			createWorkflowForm([
				{
					key: "context_lines",
					kind: "number",
					label: "Context Lines",
					required: true,
					allowedValueType: "integer",
				},
			]),
			WorkflowFormAction.SUBMIT,
			{ context_lines: "7.5" },
		)

		expect(request.fields).toEqual([])
	})

	it("emits integerValue for integer-typed small_text fields", () => {
		const request = buildWorkflowFormSubmissionRequest(
			createWorkflowForm([
				{
					key: "step_number",
					kind: "small_text",
					label: "Step Number",
					required: true,
					allowedValueType: "integer",
				},
			]),
			WorkflowFormAction.SUBMIT,
			{ step_number: "42" },
		)

		expect(request).toMatchObject({
			panelId: "active_panel",
			fields: [
				{
					key: "step_number",
					value: {
						integerValue: 42,
					},
				},
			],
		})
		expect(request.fields[0]?.value?.stringValue).toBeUndefined()
	})

	it("submits number values through the typed transport", async () => {
		await submitWorkflowForm(
			createWorkflowForm([
				{
					key: "score",
					kind: "number",
					label: "Score",
					required: true,
					allowedValueType: "number",
				},
			]),
			WorkflowFormAction.SUBMIT,
			{ score: "3.5" },
		)

		expect(mockSubmitWorkflowForm.mock.calls[0]?.[0]).toMatchObject({
			panelId: "active_panel",
			fields: [
				{
					key: "score",
					value: {
						numberValue: 3.5,
					},
				},
			],
		})
	})

	it("submits multi-select arrays through the typed transport", async () => {
		await submitWorkflowForm(
			createWorkflowForm([
				{
					key: "scoped_paths",
					kind: "multi_select",
					label: "Scoped Paths",
					required: true,
					options: [
						{ value: "src/a.ts", label: "src/a.ts" },
						{ value: "src/b.ts", label: "src/b.ts" },
					],
				},
			]),
			WorkflowFormAction.SUBMIT,
			{ scoped_paths: ["src/a.ts", "src/b.ts"] },
		)

		expect(mockSubmitWorkflowForm.mock.calls[0]?.[0]).toMatchObject({
			panelId: "active_panel",
			fields: [
				{
					key: "scoped_paths",
					value: {
						arrayValue: {
							values: [{ stringValue: "src/a.ts" }, { stringValue: "src/b.ts" }],
						},
					},
				},
			],
		})
	})

	it("submits object-backed large_text values through the typed transport", async () => {
		await submitWorkflowForm(
			createWorkflowForm([
				{
					key: "source",
					kind: "large_text",
					label: "Source",
					required: true,
					allowedValueType: "object",
				},
			]),
			WorkflowFormAction.SUBMIT,
			{
				source: JSON.stringify({
					base: "main",
					head: "feature/workflow-v2",
				}),
			},
		)

		expect(mockSubmitWorkflowForm.mock.calls[0]?.[0]).toMatchObject({
			panelId: "active_panel",
			fields: [
				{
					key: "source",
					value: {
						objectValue: {
							entries: [
								{ key: "base", value: { stringValue: "main" } },
								{ key: "head", value: { stringValue: "feature/workflow-v2" } },
							],
						},
					},
				},
			],
		})
	})

	it("builds and submits shared entry workflow-form requests for existing-project selection", async () => {
		const entryWorkflowForm: WorkflowForm = {
			...createWorkflowForm([
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
						{ value: "existing-a", label: "Existing Project A" },
						{ value: "existing-b", label: "Existing Project B" },
					],
				},
			]),
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
							{ value: "existing-a", label: "Existing Project A" },
							{ value: "existing-b", label: "Existing Project B" },
						],
					},
				],
				allowedActions: ["submit", "back"],
			},
			values: {},
		}

		const request = buildWorkflowFormSubmissionRequest(entryWorkflowForm, WorkflowFormAction.SUBMIT, {
			__workflow_runtime_project_mode__: "existing",
			__workflow_runtime_existing_project__: "existing-b",
		})

		expect(request).toMatchObject({
			sessionId: "workflow-form-session",
			panelId: "__workflow_runtime_entry_project_selection__",
			action: WorkflowFormAction.SUBMIT,
			fields: [
				{
					key: "__workflow_runtime_project_mode__",
					value: {
						stringValue: "existing",
					},
				},
				{
					key: "__workflow_runtime_existing_project__",
					value: {
						stringValue: "existing-b",
					},
				},
			],
		})

		await submitWorkflowForm(entryWorkflowForm, WorkflowFormAction.SUBMIT, {
			__workflow_runtime_project_mode__: "existing",
			__workflow_runtime_existing_project__: "existing-b",
		})

		expect(mockSubmitWorkflowForm).toHaveBeenCalledTimes(1)
		expect(mockSubmitWorkflowForm.mock.calls[0]?.[0]).toMatchObject({
			panelId: "__workflow_runtime_entry_project_selection__",
			action: WorkflowFormAction.SUBMIT,
		})
	})

	it("builds and submits shared entry workflow-form requests for new-project selection", async () => {
		const entryWorkflowForm: WorkflowForm = {
			...createWorkflowForm([
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
					key: "__workflow_runtime_new_project_title__",
					kind: "small_text",
					label: "Project title",
					required: true,
				},
			]),
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
						key: "__workflow_runtime_new_project_title__",
						kind: "small_text",
						label: "Project title",
						required: true,
					},
				],
				allowedActions: ["submit", "back"],
			},
		}

		const request = buildWorkflowFormSubmissionRequest(entryWorkflowForm, WorkflowFormAction.SUBMIT, {
			__workflow_runtime_project_mode__: "new",
			__workflow_runtime_new_project_title__: "Fresh Workspace",
		})

		expect(request).toMatchObject({
			panelId: "__workflow_runtime_entry_project_selection__",
			fields: [
				{
					key: "__workflow_runtime_project_mode__",
					value: {
						stringValue: "new",
					},
				},
				{
					key: "__workflow_runtime_new_project_title__",
					value: {
						stringValue: "Fresh Workspace",
					},
				},
			],
		})

		await submitWorkflowForm(entryWorkflowForm, WorkflowFormAction.SUBMIT, {
			__workflow_runtime_project_mode__: "new",
			__workflow_runtime_new_project_title__: "Fresh Workspace",
		})

		expect(mockSubmitWorkflowForm).toHaveBeenCalledTimes(1)
		expect(mockSubmitWorkflowForm.mock.calls[0]?.[0]).toMatchObject({
			panelId: "__workflow_runtime_entry_project_selection__",
			action: WorkflowFormAction.SUBMIT,
		})
	})
})
