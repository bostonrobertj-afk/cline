import type { ClineWorkflowForm, ClineWorkflowStartCard } from "@shared/ExtensionMessage"
import { WorkflowFormAction, WorkflowStartCardAction } from "@shared/proto/cline/task"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockSubmitWorkflowForm, mockSubmitWorkflowStartCard } = vi.hoisted(() => ({
	mockSubmitWorkflowForm: vi.fn().mockResolvedValue(undefined),
	mockSubmitWorkflowStartCard: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/services/grpc-client", () => ({
	SlashServiceClient: {},
	TaskServiceClient: {
		submitWorkflowForm: mockSubmitWorkflowForm,
		submitWorkflowStartCard: mockSubmitWorkflowStartCard,
	},
}))

import {
	buildWorkflowFormSubmissionRequest,
	buildWorkflowStartCardSubmissionRequest,
	submitWorkflowForm,
	submitWorkflowStartCard,
} from "./useMessageHandlers"

function createWorkflowForm(fields: NonNullable<ClineWorkflowForm["panel"]>["fields"]): ClineWorkflowForm {
	return {
		sessionId: "workflow-form-session",
		resolverId: "brainstorming_step_4_choose_approach",
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

function createWorkflowStartCard(): ClineWorkflowStartCard {
	return {
		sessionId: "start-card-session",
		title: "Workflow Start",
		markdownBody: "Start card body",
		ctaLabel: "Get Started",
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

	it("builds workflow start-card submissions unchanged", async () => {
		const request = buildWorkflowStartCardSubmissionRequest(createWorkflowStartCard())
		expect(request).toMatchObject({
			sessionId: "start-card-session",
			action: WorkflowStartCardAction.CONTINUE,
		})

		await submitWorkflowStartCard(createWorkflowStartCard())
		expect(mockSubmitWorkflowStartCard).toHaveBeenCalledTimes(1)
	})
})
