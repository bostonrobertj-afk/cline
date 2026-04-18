import type { WorkflowFormDefinitionPayload, WorkflowFormPanelDefinition } from "@shared/ExtensionMessage"
import { WorkflowFormAction, WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"
import { expect } from "chai"
import { describe, it } from "mocha"
import type { WorkflowFormSessionState } from "../types"
import { WorkflowFormRuntime } from "../WorkflowFormRuntime"

function createDefinition(args: {
	firstPanelId: string
	panels: Record<string, WorkflowFormPanelDefinition>
	title?: string
}): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: args.title ?? "Workflow Form V2",
		toolDictionaryTitle: "Dictionary",
		toolDictionaryMarkdown: "## tool",
		firstPanelId: args.firstPanelId,
		panels: args.panels,
	}
}

function createRuntime() {
	return new WorkflowFormRuntime()
}

function createSession(args: {
	runtime: WorkflowFormRuntime
	workflowFormId?: string
	definitionPayload: WorkflowFormDefinitionPayload
}) {
	return args.runtime.createSession({
		workflowFormId: args.workflowFormId ?? "test-form",
		definitionPayload: args.definitionPayload,
	})
}

function createSubmitRequest(args: {
	sessionId: string
	panelId: string
	action?: WorkflowFormAction
	fields?: WorkflowFormSubmissionRequest["fields"]
}) {
	return WorkflowFormSubmissionRequest.create({
		sessionId: args.sessionId,
		panelId: args.panelId,
		action: args.action ?? WorkflowFormAction.SUBMIT,
		fields: args.fields ?? [],
	})
}

describe("WorkflowFormRuntime", () => {
	it("creates a V2 session and builds the first panel payload", () => {
		const runtime = createRuntime()
		const definitionPayload = createDefinition({
			firstPanelId: "intro",
			panels: {
				intro: {
					panelId: "intro",
					title: "Intro",
					promptMarkdown: "Start here.",
					fields: [],
					allowedActions: ["submit"],
					transition: {
						type: "deterministic_operation",
						operationId: "persist_intro",
						terminal: true,
					},
				},
			},
		})

		const session = createSession({ runtime, definitionPayload })
		const payload = runtime.buildPayload(session)

		expect(session.definitionVersion).to.equal(2)
		expect(session.firstPanelId).to.equal("intro")
		expect(session.currentPanelId).to.equal("intro")
		expect(session.values).to.deep.equal({})
		expect(session.data).to.deep.equal({})
		expect(payload.renderState).to.equal("panel")
		expect(payload.panel?.panelId).to.equal("intro")
	})

	it("rejects stale panel mismatches", () => {
		const runtime = createRuntime()
		const session = createSession({
			runtime,
			definitionPayload: createDefinition({
				firstPanelId: "intro",
				panels: {
					intro: {
						panelId: "intro",
						title: "Intro",
						promptMarkdown: "Start here.",
						fields: [],
						allowedActions: ["submit"],
						transition: {
							type: "deterministic_operation",
							operationId: "persist_intro",
							terminal: true,
						},
					},
				},
			}),
		})

		expect(() =>
			runtime.handleSubmission(
				session,
				createSubmitRequest({
					sessionId: session.sessionId,
					panelId: "stale_panel",
				}),
			),
		).to.throw("Workflow form submission panel mismatch")
	})

	it("advances through a sequential transition and persists submitted string values", () => {
		const runtime = createRuntime()
		const session = createSession({
			runtime,
			definitionPayload: createDefinition({
				firstPanelId: "intro",
				panels: {
					intro: {
						panelId: "intro",
						title: "Intro",
						promptMarkdown: "Choose a plan.",
						fields: [
							{
								key: "plan",
								kind: "small_text",
								label: "Plan",
								required: true,
								allowedValueType: "string",
							},
						],
						allowedActions: ["submit"],
						transition: {
							type: "sequential",
							nextPanelId: "details",
						},
					},
					details: {
						panelId: "details",
						title: "Details",
						promptMarkdown: "Add more detail.",
						fields: [],
						allowedActions: ["submit", "back"],
						transition: {
							type: "deterministic_operation",
							operationId: "persist_details",
							terminal: true,
						},
					},
				},
			}),
		})

		const outcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "intro",
				fields: [
					{
						key: "plan",
						value: { stringValue: "rollout" },
					},
				],
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${outcome.kind}.`)
		}

		expect(outcome.session.currentPanelId).to.equal("details")
		expect(outcome.payload.panel?.panelId).to.equal("details")
		expect(outcome.session.values.plan).to.deep.equal({
			valueType: "string",
			stringValue: "rollout",
		})
	})

	it("routes through a conditional transition using a radio-group field and lands on the correct next panel", () => {
		const runtime = createRuntime()
		const session = createSession({
			runtime,
			definitionPayload: createDefinition({
				firstPanelId: "decision",
				panels: {
					decision: {
						panelId: "decision",
						title: "Decision",
						promptMarkdown: "Choose a branch.",
						fields: [
							{
								key: "route",
								kind: "radio_group",
								label: "Route",
								required: true,
								allowedValueType: "string",
								options: [
									{ value: "left", label: "Left" },
									{ value: "right", label: "Right" },
								],
							},
						],
						allowedActions: ["submit"],
						transition: {
							type: "conditional",
							conditionSourceKey: "route",
							branches: [
								{ matchValue: "left", nextPanelId: "left_panel" },
								{ matchValue: "right", nextPanelId: "right_panel" },
							],
						},
					},
					left_panel: {
						panelId: "left_panel",
						title: "Left",
						promptMarkdown: "Left branch.",
						fields: [],
						allowedActions: ["submit", "back"],
						transition: {
							type: "deterministic_operation",
							operationId: "persist_left",
							terminal: true,
						},
					},
					right_panel: {
						panelId: "right_panel",
						title: "Right",
						promptMarkdown: "Right branch.",
						fields: [],
						allowedActions: ["submit", "back"],
						transition: {
							type: "deterministic_operation",
							operationId: "persist_right",
							terminal: true,
						},
					},
				},
			}),
		})

		const outcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "decision",
				fields: [
					{
						key: "route",
						value: { stringValue: "right" },
					},
				],
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${outcome.kind}.`)
		}

		expect(outcome.session.currentPanelId).to.equal("right_panel")
		expect(outcome.payload.panel?.panelId).to.equal("right_panel")
	})

	it("returns deterministic-operation outcomes with the declared operation metadata", () => {
		const runtime = createRuntime()
		const session = createSession({
			runtime,
			definitionPayload: createDefinition({
				firstPanelId: "preview_request",
				panels: {
					preview_request: {
						panelId: "preview_request",
						title: "Preview Request",
						promptMarkdown: "Generate a preview.",
						fields: [
							{
								key: "topic",
								kind: "small_text",
								label: "Topic",
								required: true,
								allowedValueType: "string",
							},
						],
						allowedActions: ["submit"],
						transition: {
							type: "deterministic_operation",
							operationId: "load_preview",
							nextPanelId: "preview_result",
							terminal: false,
						},
					},
					preview_result: {
						panelId: "preview_result",
						title: "Preview Result",
						promptMarkdown: "Preview ready.",
						fields: [],
						allowedActions: ["submit", "back"],
						transition: {
							type: "deterministic_operation",
							operationId: "persist_preview",
							terminal: true,
						},
					},
				},
			}),
		})

		const outcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "preview_request",
				fields: [
					{
						key: "topic",
						value: { stringValue: "workflow v2" },
					},
				],
			}),
		)

		expect(outcome.kind).to.equal("invoke_deterministic_operation")
		if (outcome.kind !== "invoke_deterministic_operation") {
			throw new Error(`Expected invoke_deterministic_operation, received ${outcome.kind}.`)
		}

		expect(outcome.operationId).to.equal("load_preview")
		expect(outcome.nextPanelId).to.equal("preview_result")
		expect(outcome.terminal).to.equal(false)
	})

	it("supports back navigation and clears backStaleValueKeysToClear", () => {
		const runtime = createRuntime()
		const session = createSession({
			runtime,
			definitionPayload: createDefinition({
				firstPanelId: "source",
				panels: {
					source: {
						panelId: "source",
						title: "Source",
						promptMarkdown: "Choose a source.",
						fields: [
							{
								key: "source.type",
								kind: "radio_group",
								label: "Source Type",
								required: true,
								allowedValueType: "string",
								options: [
									{ value: "commit", label: "Commit" },
									{ value: "range", label: "Range" },
								],
							},
						],
						allowedActions: ["submit"],
						transition: {
							type: "sequential",
							nextPanelId: "details",
						},
					},
					details: {
						panelId: "details",
						title: "Details",
						promptMarkdown: "Add source details.",
						fields: [
							{
								key: "source.detail",
								kind: "small_text",
								label: "Detail",
								required: false,
								allowedValueType: "string",
							},
						],
						allowedActions: ["submit", "back"],
						backDestinationPanelId: "source",
						backStaleValueKeysToClear: ["source.detail"],
						transition: {
							type: "deterministic_operation",
							operationId: "persist_details",
							terminal: true,
						},
					},
				},
			}),
		})

		const detailsOutcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "source",
				fields: [
					{
						key: "source.type",
						value: { stringValue: "commit" },
					},
				],
			}),
		)
		if (detailsOutcome.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${detailsOutcome.kind}.`)
		}

		const backOutcome = runtime.handleSubmission(
			detailsOutcome.session,
			createSubmitRequest({
				sessionId: detailsOutcome.session.sessionId,
				panelId: "details",
				action: WorkflowFormAction.BACK,
				fields: [
					{
						key: "source.detail",
						value: { stringValue: "HEAD~1" },
					},
				],
			}),
		)

		expect(backOutcome.kind).to.equal("render_form")
		if (backOutcome.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${backOutcome.kind}.`)
		}

		expect(backOutcome.session.currentPanelId).to.equal("source")
		expect(backOutcome.session.values["source.detail"]).to.equal(undefined)
		expect(backOutcome.session.values["source.type"]).to.deep.equal({
			valueType: "string",
			stringValue: "commit",
		})
	})

	it("restarts a retry flow at the first panel and clears failure", () => {
		const runtime = createRuntime()
		const session = createSession({
			runtime,
			definitionPayload: createDefinition({
				firstPanelId: "source",
				panels: {
					source: {
						panelId: "source",
						title: "Source",
						promptMarkdown: "Choose a source.",
						fields: [
							{
								key: "source.type",
								kind: "radio_group",
								label: "Source Type",
								required: true,
								allowedValueType: "string",
								options: [{ value: "commit", label: "Commit" }],
							},
						],
						allowedActions: ["submit"],
						transition: {
							type: "sequential",
							nextPanelId: "details",
						},
					},
					details: {
						panelId: "details",
						title: "Details",
						promptMarkdown: "Add details.",
						fields: [
							{
								key: "source.detail",
								kind: "small_text",
								label: "Detail",
								required: true,
								allowedValueType: "string",
							},
						],
						allowedActions: ["submit", "back", "retry"],
						transition: {
							type: "deterministic_operation",
							operationId: "persist_details",
							terminal: true,
						},
					},
				},
			}),
		})

		const detailsOutcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "source",
				fields: [
					{
						key: "source.type",
						value: { stringValue: "commit" },
					},
				],
			}),
		)
		if (detailsOutcome.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${detailsOutcome.kind}.`)
		}

		const failureOutcome = runtime.handleSubmission(
			detailsOutcome.session,
			createSubmitRequest({
				sessionId: detailsOutcome.session.sessionId,
				panelId: "details",
			}),
		)
		if (failureOutcome.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${failureOutcome.kind}.`)
		}

		const retryOutcome = runtime.handleSubmission(
			failureOutcome.session,
			createSubmitRequest({
				sessionId: failureOutcome.session.sessionId,
				panelId: "details",
				action: WorkflowFormAction.RETRY,
			}),
		)

		expect(retryOutcome.kind).to.equal("render_form")
		if (retryOutcome.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${retryOutcome.kind}.`)
		}

		expect(retryOutcome.session.currentPanelId).to.equal("source")
		expect(retryOutcome.session.failure).to.equal(undefined)
	})

	it("returns a failure render outcome when a required field is missing on submit", () => {
		const runtime = createRuntime()
		const session = createSession({
			runtime,
			definitionPayload: createDefinition({
				firstPanelId: "details",
				panels: {
					details: {
						panelId: "details",
						title: "Details",
						promptMarkdown: "A required field is missing.",
						fields: [
							{
								key: "required_field",
								kind: "small_text",
								label: "Required Field",
								required: true,
								allowedValueType: "string",
							},
						],
						allowedActions: ["submit", "retry"],
						transition: {
							type: "deterministic_operation",
							operationId: "persist",
							terminal: true,
						},
					},
				},
			}),
		})

		const outcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "details",
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${outcome.kind}.`)
		}

		expect(outcome.session.failure).to.deep.equal({
			panelId: "details",
			errorMessage: 'Field "required_field" is required.',
		})
		expect(outcome.payload.renderState).to.equal("failure")
		expect(outcome.payload.panel?.panelId).to.equal("details")
	})

	it("verifies value normalization for numeric and checkbox-group submissions", () => {
		const runtime = createRuntime()
		const session = createSession({
			runtime,
			definitionPayload: createDefinition({
				firstPanelId: "details",
				panels: {
					details: {
						panelId: "details",
						title: "Details",
						promptMarkdown: "Normalize field values.",
						fields: [
							{
								key: "count",
								kind: "number",
								label: "Count",
								required: true,
								allowedValueType: "number",
							},
							{
								key: "tags",
								kind: "checkbox_group",
								label: "Tags",
								required: true,
								allowedValueType: "array",
								options: [
									{ value: "alpha", label: "Alpha" },
									{ value: "beta", label: "Beta" },
								],
							},
						],
						allowedActions: ["submit"],
						transition: {
							type: "deterministic_operation",
							operationId: "persist",
							nextPanelId: "done",
							terminal: false,
						},
					},
					done: {
						panelId: "done",
						title: "Done",
						promptMarkdown: "Finished.",
						fields: [],
						allowedActions: ["submit", "back"],
						transition: {
							type: "deterministic_operation",
							operationId: "persist_done",
							terminal: true,
						},
					},
				},
			}),
		})

		const outcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "details",
				fields: [
					{
						key: "count",
						value: { numberValue: 3 },
					},
					{
						key: "tags",
						value: {
							arrayValue: {
								values: [{ stringValue: "alpha" }, { stringValue: "beta" }],
							},
						},
					},
				],
			}),
		)

		expect(outcome.kind).to.equal("invoke_deterministic_operation")
		if (outcome.kind !== "invoke_deterministic_operation") {
			throw new Error(`Expected invoke_deterministic_operation, received ${outcome.kind}.`)
		}

		expect(outcome.session.values.count).to.deep.equal({
			valueType: "number",
			numberValue: 3,
		})
		expect(outcome.session.values.tags.valueType).to.equal("array")
		expect(JSON.stringify(outcome.session.values.tags)).to.contain("alpha")
		expect(JSON.stringify(outcome.session.values.tags)).to.contain("beta")
	})

	it("verifies buildSuccessPayload returns a success payload with the provided success message", () => {
		const runtime = createRuntime()
		const session: WorkflowFormSessionState = createSession({
			runtime,
			definitionPayload: createDefinition({
				firstPanelId: "confirmation",
				panels: {
					confirmation: {
						panelId: "confirmation",
						title: "Confirmation",
						promptMarkdown: "Confirm the save.",
						fields: [],
						allowedActions: ["submit"],
						transition: {
							type: "deterministic_operation",
							operationId: "persist_confirmation",
							terminal: true,
						},
					},
				},
			}),
		})

		const payload = runtime.buildSuccessPayload(session, "Saved successfully.")

		expect(payload.renderState).to.equal("success")
		expect(payload.successMessage).to.equal("Saved successfully.")
		expect(payload.panel).to.equal(undefined)
	})
})
