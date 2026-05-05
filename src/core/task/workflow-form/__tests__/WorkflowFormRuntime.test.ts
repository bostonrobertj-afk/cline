import type { WorkflowFormDefinitionPayload, WorkflowFormFieldKind, WorkflowFormPanelDefinition } from "@shared/ExtensionMessage"
import { WorkflowFormAction, WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"
import { expect } from "chai"
import { describe, it } from "mocha"
import type { WorkflowFormSessionData, WorkflowFormSessionState } from "../types"
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

function createTerminalTransition(): WorkflowFormPanelDefinition["transition"] {
	return {
		type: "conditional",
		conditionSourceKey: "__terminal__",
		branches: [],
		defaultTerminal: true,
	}
}

describe("WorkflowFormRuntime", () => {
	it("creates a V2 session without runtime-owned panel payload assembly", () => {
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
					transition: createTerminalTransition(),
				},
			},
		})

		const session = createSession({ runtime, definitionPayload })

		expect(session.definitionVersion).to.equal(2)
		expect(session.firstPanelId).to.equal("intro")
		expect(session.currentPanelId).to.equal("intro")
		expect(session.values).to.deep.equal({})
		expect(session.data).to.deep.equal({})
		expect(session.failure).to.equal(undefined)
	})

	it("creates a session at a requested non-first start panel", () => {
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
						type: "sequential",
						nextPanelId: "details",
					},
				},
				details: {
					panelId: "details",
					title: "Details",
					promptMarkdown: "Continue here.",
					fields: [],
					allowedActions: ["submit"],
					transition: createTerminalTransition(),
				},
			},
		})

		const session = runtime.createSession({
			workflowFormId: "test-form",
			definitionPayload,
			startPanelId: "details",
		})

		expect(session.firstPanelId).to.equal("intro")
		expect(session.currentPanelId).to.equal("details")
	})

	it("creates a session with cloned seed data", () => {
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
					transition: createTerminalTransition(),
				},
			},
		})
		const nestedData = { label: "original" }
		const callerData: WorkflowFormSessionData = {
			topic: "alpha",
			nested: nestedData,
		}

		const session = runtime.createSession({
			workflowFormId: "test-form",
			definitionPayload,
			data: callerData,
		})
		callerData.topic = "changed"
		nestedData.label = "changed"

		expect(session.data).to.deep.equal({
			topic: "alpha",
			nested: {
				label: "original",
			},
		})
	})

	it("rejects a requested start panel missing from the definition", () => {
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
					transition: createTerminalTransition(),
				},
			},
		})

		expect(() =>
			runtime.createSession({
				workflowFormId: "test-form",
				definitionPayload,
				startPanelId: "missing",
			}),
		).to.throw("Workflow form requested start panel is missing from definition: missing")
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
						transition: createTerminalTransition(),
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
						transition: createTerminalTransition(),
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
		expect("payload" in outcome).to.equal(false)
		expect(outcome.session.values.plan).to.deep.equal({
			valueType: "string",
			stringValue: "rollout",
		})
	})

	it("accepts an optional text field submitted as an explicit clear", () => {
		const runtime = createRuntime()
		const session = createSession({
			runtime,
			definitionPayload: createDefinition({
				firstPanelId: "details",
				panels: {
					details: {
						panelId: "details",
						title: "Details",
						promptMarkdown: "Optionally capture notes.",
						fields: [
							{
								key: "notes",
								kind: "small_text",
								label: "Notes",
								required: false,
								allowedValueType: "string",
							},
						],
						allowedActions: ["submit"],
						transition: createTerminalTransition(),
					},
				},
			}),
		})
		const seededSession: WorkflowFormSessionState = {
			...session,
			values: {
				notes: {
					valueType: "string",
					stringValue: "old notes",
				},
			},
		}

		const outcome = runtime.handleSubmission(
			seededSession,
			createSubmitRequest({
				sessionId: seededSession.sessionId,
				panelId: "details",
				fields: [
					{
						key: "notes",
						value: { stringValue: "" },
					},
				],
			}),
		)

		expect(outcome.kind).to.equal("complete_success")
		if (outcome.kind !== "complete_success") {
			throw new Error(`Expected complete_success, received ${outcome.kind}.`)
		}
		expect(outcome.session.values.notes).to.equal(undefined)
		expect(outcome.valueChanges).to.deep.equal({
			submittedValueKeys: [],
			clearedValueKeys: ["notes"],
		})
	})

	it("accepts an optional checkbox group submitted as an explicit empty-array clear", () => {
		const runtime = createRuntime()
		const session = createSession({
			runtime,
			definitionPayload: createDefinition({
				firstPanelId: "tags",
				panels: {
					tags: {
						panelId: "tags",
						title: "Tags",
						promptMarkdown: "Optionally select tags.",
						fields: [
							{
								key: "selected_tags",
								kind: "checkbox_group",
								label: "Tags",
								required: false,
								allowedValueType: "array",
								options: [
									{ value: "alpha", label: "Alpha" },
									{ value: "beta", label: "Beta" },
								],
							},
						],
						allowedActions: ["submit"],
						transition: createTerminalTransition(),
					},
				},
			}),
		})
		const seededSession: WorkflowFormSessionState = {
			...session,
			values: {
				selected_tags: {
					valueType: "array",
					arrayValue: [{ valueType: "string", stringValue: "alpha" }],
				},
			},
		}

		const outcome = runtime.handleSubmission(
			seededSession,
			createSubmitRequest({
				sessionId: seededSession.sessionId,
				panelId: "tags",
				fields: [
					{
						key: "selected_tags",
						value: { arrayValue: { values: [] } },
					},
				],
			}),
		)

		expect(outcome.kind).to.equal("complete_success")
		if (outcome.kind !== "complete_success") {
			throw new Error(`Expected complete_success, received ${outcome.kind}.`)
		}
		expect(outcome.session.values.selected_tags).to.equal(undefined)
		expect(outcome.valueChanges).to.deep.equal({
			submittedValueKeys: [],
			clearedValueKeys: ["selected_tags"],
		})
	})

	it("does not report omitted active optional fields as explicit clears", () => {
		const runtime = createRuntime()
		const session = createSession({
			runtime,
			definitionPayload: createDefinition({
				firstPanelId: "details",
				panels: {
					details: {
						panelId: "details",
						title: "Details",
						promptMarkdown: "Optionally capture notes.",
						fields: [
							{
								key: "notes",
								kind: "small_text",
								label: "Notes",
								required: false,
								allowedValueType: "string",
							},
						],
						allowedActions: ["submit"],
						transition: createTerminalTransition(),
					},
				},
			}),
		})
		const seededSession: WorkflowFormSessionState = {
			...session,
			values: {
				notes: {
					valueType: "string",
					stringValue: "old notes",
				},
			},
		}

		const outcome = runtime.handleSubmission(
			seededSession,
			createSubmitRequest({
				sessionId: seededSession.sessionId,
				panelId: "details",
			}),
		)

		expect(outcome.kind).to.equal("complete_success")
		if (outcome.kind !== "complete_success") {
			throw new Error(`Expected complete_success, received ${outcome.kind}.`)
		}
		expect(outcome.session.values.notes).to.equal(undefined)
		expect(outcome.valueChanges).to.deep.equal({
			submittedValueKeys: [],
			clearedValueKeys: [],
		})
	})

	it("reports resetValueKeysOnChange stale value keys even when the target was absent", () => {
		const runtime = createRuntime()
		const session = createSession({
			runtime,
			definitionPayload: createDefinition({
				firstPanelId: "details",
				panels: {
					details: {
						panelId: "details",
						title: "Details",
						promptMarkdown: "Capture dependent details.",
						fields: [
							{
								key: "source",
								kind: "small_text",
								label: "Source",
								required: true,
								allowedValueType: "string",
								resetValueKeysOnChange: ["dependent"],
							},
							{
								key: "dependent",
								kind: "small_text",
								label: "Dependent",
								required: false,
								allowedValueType: "string",
							},
						],
						allowedActions: ["submit"],
						transition: createTerminalTransition(),
					},
				},
			}),
		})
		const seededSession: WorkflowFormSessionState = {
			...session,
			values: {
				source: {
					valueType: "string",
					stringValue: "old source",
				},
			},
		}

		const outcome = runtime.handleSubmission(
			seededSession,
			createSubmitRequest({
				sessionId: seededSession.sessionId,
				panelId: "details",
				fields: [
					{
						key: "source",
						value: { stringValue: "new source" },
					},
				],
			}),
		)

		expect(outcome.kind).to.equal("complete_success")
		if (outcome.kind !== "complete_success") {
			throw new Error(`Expected complete_success, received ${outcome.kind}.`)
		}
		expect(outcome.session.values.dependent).to.equal(undefined)
		expect(outcome.valueChanges).to.deep.equal({
			submittedValueKeys: ["source"],
			clearedValueKeys: ["dependent"],
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
						transition: createTerminalTransition(),
					},
					right_panel: {
						panelId: "right_panel",
						title: "Right",
						promptMarkdown: "Right branch.",
						fields: [],
						allowedActions: ["submit", "back"],
						transition: createTerminalTransition(),
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
		expect("payload" in outcome).to.equal(false)
	})

	it("navigates sequentially without producing operation tool requests", () => {
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
							type: "sequential",
							nextPanelId: "preview_result",
						},
					},
					preview_result: {
						panelId: "preview_result",
						title: "Preview Result",
						promptMarkdown: "Preview ready.",
						fields: [],
						allowedActions: ["submit", "back"],
						transition: createTerminalTransition(),
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

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${outcome.kind}.`)
		}

		expect(outcome.session.currentPanelId).to.equal("preview_result")
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
						transition: createTerminalTransition(),
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
		expect(backOutcome.valueChanges.clearedValueKeys).to.deep.equal(["source.detail"])
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
						transition: createTerminalTransition(),
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
						transition: createTerminalTransition(),
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
		expect("payload" in outcome).to.equal(false)
	})

	it("rejects selectorDiscovery dropdown submissions when rendered options are empty", () => {
		const runtime = createRuntime()
		const session = createSession({
			runtime,
			definitionPayload: createDefinition({
				firstPanelId: "selectors",
				panels: {
					selectors: {
						panelId: "selectors",
						title: "Selectors",
						promptMarkdown: "Choose a discovered value.",
						fields: [
							{
								key: "project",
								kind: "dropdown",
								label: "Project",
								required: true,
								allowedValueType: "string",
								options: [],
								selectorDiscovery: {
									root: {
										kind: "project_output_root",
									},
									entryType: "directory",
									immediateChildrenOnly: true,
									sort: "alpha_asc",
								},
							},
						],
						allowedActions: ["submit"],
						transition: createTerminalTransition(),
					},
				},
			}),
		})

		const outcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "selectors",
				fields: [
					{
						key: "project",
						value: { stringValue: "ghost-project" },
					},
				],
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${outcome.kind}.`)
		}
		expect(outcome.session.failure).to.deep.equal({
			panelId: "selectors",
			errorMessage: 'Field "project" does not satisfy the declared selection rules.',
		})
	})

	for (const selectorCase of [
		{ kind: "file_path", key: "selected_file", submittedValue: "missing.md" },
		{ kind: "directory_path", key: "selected_folder", submittedValue: "missing-folder" },
		{ kind: "artifact_picker", key: "selected_artifact", submittedValue: "missing-artifact.md" },
	] satisfies Array<{ kind: WorkflowFormFieldKind; key: string; submittedValue: string }>) {
		it(`rejects selectorDiscovery ${selectorCase.kind} submissions outside rendered options`, () => {
			const runtime = createRuntime()
			const session = createSession({
				runtime,
				definitionPayload: createDefinition({
					firstPanelId: "selectors",
					panels: {
						selectors: {
							panelId: "selectors",
							title: "Selectors",
							promptMarkdown: "Choose a discovered path.",
							fields: [
								{
									key: selectorCase.key,
									kind: selectorCase.kind,
									label: "Selector",
									required: true,
									allowedValueType: "string",
									options: [{ value: "allowed.md", label: "allowed.md" }],
									selectorDiscovery: {
										root: {
											kind: "selected_project_root",
										},
										entryType: "file",
										immediateChildrenOnly: true,
										sort: "alpha_asc",
									},
								},
							],
							allowedActions: ["submit"],
							transition: createTerminalTransition(),
						},
					},
				}),
			})

			const outcome = runtime.handleSubmission(
				session,
				createSubmitRequest({
					sessionId: session.sessionId,
					panelId: "selectors",
					fields: [
						{
							key: selectorCase.key,
							value: { stringValue: selectorCase.submittedValue },
						},
					],
				}),
			)

			expect(outcome.kind).to.equal("render_form")
			if (outcome.kind !== "render_form") {
				throw new Error(`Expected render_form, received ${outcome.kind}.`)
			}
			expect(outcome.session.failure).to.deep.equal({
				panelId: "selectors",
				errorMessage: `Field "${selectorCase.key}" does not satisfy the declared selection rules.`,
			})
		})
	}

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
							type: "sequential",
							nextPanelId: "done",
						},
					},
					done: {
						panelId: "done",
						title: "Done",
						promptMarkdown: "Finished.",
						fields: [],
						allowedActions: ["submit", "back"],
						transition: createTerminalTransition(),
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

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${outcome.kind}.`)
		}

		expect(outcome.session.values.count).to.deep.equal({
			valueType: "number",
			numberValue: 3,
		})
		expect(outcome.session.values.tags.valueType).to.equal("array")
		expect(JSON.stringify(outcome.session.values.tags)).to.contain("alpha")
		expect(JSON.stringify(outcome.session.values.tags)).to.contain("beta")
	})

	it("does not expose legacy payload-builder methods on the generic runtime surface", () => {
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
						transition: createTerminalTransition(),
					},
				},
			}),
		})

		expect("buildFailurePayload" in runtime).to.equal(false)
		expect("buildSuccessPayload" in runtime).to.equal(false)
		expect("buildPayload" in runtime).to.equal(false)
		expect(session.currentPanelId).to.equal("confirmation")
	})
})
