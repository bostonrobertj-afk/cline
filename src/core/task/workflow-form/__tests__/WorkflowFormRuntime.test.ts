import type { WorkflowFormDefinitionPayload } from "@shared/ExtensionMessage"
import { WorkflowFormAction, WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"
import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineDefaultTool } from "@/shared/tools"
import type { WorkflowFormResolverDefinition, WorkflowFormSessionState } from "../types"
import {
	BRAINSTORMING_STEP_4_CHOOSE_APPROACH_RESOLVER_ID,
	buildBrainstormingStep4DefinitionPayload,
	buildWorkflowStartDefinitionPayload,
	CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID,
	getWorkflowFormResolverDefinition,
	PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID,
} from "../WorkflowFormRegistry"
import { WorkflowFormRuntime } from "../WorkflowFormRuntime"

const testResolvers = new Map<string, WorkflowFormResolverDefinition>()

function createResolver(args: {
	id: string
	buildDefinition: (session: WorkflowFormSessionState) => WorkflowFormDefinitionPayload
}): WorkflowFormResolverDefinition {
	return {
		id: args.id,
		buildDefinition: args.buildDefinition,
		buildOperationRequest: () => ({
			toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
			toolInput: {},
			toolParams: {},
		}),
		applyOperationResult: (session) => ({
			succeeded: true,
			operationData: {
				sessionId: session.sessionId,
			},
		}),
		buildFailureFallbackMessage: () => "fallback",
	}
}

function createDefinition(args: {
	firstPanelId: string
	panels: WorkflowFormDefinitionPayload["panels"]
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

function createRuntime(resolver: WorkflowFormResolverDefinition) {
	testResolvers.set(resolver.id, resolver)
	return new WorkflowFormRuntime({ [resolver.id]: resolver })
}

function createDraftSession(resolverId: string): WorkflowFormSessionState {
	return {
		sessionId: "draft-session",
		resolverId,
		triggerSource: "deterministic_workflow_progression",
		owner: {
			kind: "placeholder_workflow_step",
			workflowName: "brainstorming.md",
			stepNumber: 2,
		},
		definitionVersion: 2,
		definitionPayload: {
			definitionVersion: 2,
			title: "",
			toolDictionaryTitle: "",
			toolDictionaryMarkdown: "",
			firstPanelId: "",
			panels: {},
		},
		firstPanelId: "",
		currentPanelId: "",
		values: {},
		data: {},
	}
}

function createSession(runtime: WorkflowFormRuntime, resolverId: string) {
	const resolver = testResolvers.get(resolverId)
	if (!resolver) {
		throw new Error(`Missing test resolver: ${resolverId}`)
	}

	return runtime.createSession({
		resolverId,
		triggerSource: "deterministic_workflow_progression",
		owner: {
			kind: "placeholder_workflow_step",
			workflowName: "brainstorming.md",
			stepNumber: 2,
		},
		definitionPayload: resolver.buildDefinition(createDraftSession(resolverId)),
	})
}

function createRegistrySession(args: {
	runtime: WorkflowFormRuntime
	resolverId: string
	owner?: WorkflowFormSessionState["owner"]
}) {
	const resolver = getWorkflowFormResolverDefinition(args.resolverId)
	const draftSession = {
		...createDraftSession(args.resolverId),
		owner:
			args.owner ??
			({
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 2,
			} as const),
	}

	return args.runtime.createSession({
		resolverId: args.resolverId,
		triggerSource: "deterministic_workflow_progression",
		owner: draftSession.owner,
		definitionPayload: resolver.buildDefinition(draftSession),
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
	it("creates V2 sessions with the first panel resolved and persisted definition payload", () => {
		const runtime = createRuntime(
			createResolver({
				id: "simple_session",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "intro",
						panels: {
							intro: {
								panelId: "intro",
								title: "Intro",
								promptMarkdown: "Start here.",
								fields: [],
								allowedActions: ["submit", "cancel"],
								transition: {
									type: "sequential",
									nextPanelId: "details",
								},
							},
							details: {
								panelId: "details",
								title: "Details",
								promptMarkdown: "Collect details.",
								fields: [],
								allowedActions: ["submit", "back"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		const session = createSession(runtime, "simple_session")
		const payload = runtime.buildPayload(session)

		expect(session.definitionVersion).to.equal(2)
		expect(session.firstPanelId).to.equal("intro")
		expect(session.currentPanelId).to.equal("intro")
		expect(session.values).to.deep.equal({})
		expect(session.data).to.deep.equal({})
		expect(session.definitionPayload.firstPanelId).to.equal("intro")
		expect(payload.renderState).to.equal("panel")
		expect(payload.panel?.panelId).to.equal("intro")
	})

	it("rejects stale panel_id mismatches", () => {
		const runtime = createRuntime(
			createResolver({
				id: "panel_mismatch",
				buildDefinition: () =>
					createDefinition({
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
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		const session = createSession(runtime, "panel_mismatch")

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

	it("advances through sequential transitions", () => {
		const runtime = createRuntime(
			createResolver({
				id: "sequential",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "intro",
						panels: {
							intro: {
								panelId: "intro",
								title: "Intro",
								promptMarkdown: "Select a plan.",
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
								promptMarkdown: "More detail.",
								fields: [],
								allowedActions: ["submit", "back"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		const session = createSession(runtime, "sequential")
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
		if (outcome.kind === "render_form") {
			expect(outcome.session.currentPanelId).to.equal("details")
			expect(outcome.payload.panel?.panelId).to.equal("details")
			expect(outcome.session.values.plan).to.deep.equal({
				valueType: "string",
				stringValue: "rollout",
			})
		}
	})

	it("routes through conditional transitions", () => {
		const runtime = createRuntime(
			createResolver({
				id: "conditional",
				buildDefinition: () =>
					createDefinition({
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
			}),
		)

		const session = createSession(runtime, "conditional")
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
		if (outcome.kind === "render_form") {
			expect(outcome.session.currentPanelId).to.equal("right_panel")
			expect(outcome.payload.panel?.panelId).to.equal("right_panel")
		}
	})

	it("supports back navigation and clears declared stale values", () => {
		const runtime = createRuntime(
			createResolver({
				id: "back_navigation",
				buildDefinition: () =>
					createDefinition({
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
										resetValueKeysOnChange: ["source.detail"],
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
			}),
		)

		const firstSession = createSession(runtime, "back_navigation")
		const afterFirstSubmit = runtime.handleSubmission(
			firstSession,
			createSubmitRequest({
				sessionId: firstSession.sessionId,
				panelId: "source",
				fields: [
					{
						key: "source.type",
						value: { stringValue: "commit" },
					},
				],
			}),
		)

		if (afterFirstSubmit.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${afterFirstSubmit.kind}.`)
		}

		const outcome = runtime.handleSubmission(
			afterFirstSubmit.session,
			createSubmitRequest({
				sessionId: afterFirstSubmit.session.sessionId,
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

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.currentPanelId).to.equal("source")
			expect(outcome.session.values["source.detail"]).to.equal(undefined)
			expect(outcome.session.values["source.type"]).to.deep.equal({
				valueType: "string",
				stringValue: "commit",
			})
		}
	})

	it("returns Brainstorming Step 4 technique selection back to approach selection and clears stale technique values", () => {
		const runtime = new WorkflowFormRuntime()
		const definition = buildBrainstormingStep4DefinitionPayload({
			categoryOptions: [{ value: "creative", label: "creative" }],
			techniqueOptionsByCategory: {
				creative: [
					{
						value: "Reverse Brainstorming",
						label: "Reverse Brainstorming",
						description: "Generate problems first.",
					},
				],
			},
		})
		const session = runtime.createSession({
			resolverId: BRAINSTORMING_STEP_4_CHOOSE_APPROACH_RESOLVER_ID,
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "brainstorming.md",
				stepNumber: 4,
			},
			definitionPayload: definition,
		})

		const outcome = runtime.handleSubmission(
			{
				...session,
				currentPanelId: "technique_selection",
				values: {
					selected_approach: {
						valueType: "string",
						stringValue: "user_choose",
					},
					technique_category: {
						valueType: "string",
						stringValue: "creative",
					},
					technique_name: {
						valueType: "string",
						stringValue: "Reverse Brainstorming",
					},
				},
			},
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "technique_selection",
				action: WorkflowFormAction.BACK,
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.currentPanelId).to.equal("approach_selection")
			expect(outcome.session.values.technique_category).to.equal(undefined)
			expect(outcome.session.values.technique_name).to.equal(undefined)
			expect(outcome.session.values.selected_approach).to.deep.equal({
				valueType: "string",
				stringValue: "user_choose",
			})
		}
	})

	it("restarts Retry flows at the first panel and clears failure state", () => {
		const runtime = createRuntime(
			createResolver({
				id: "retry_flow",
				buildDefinition: () =>
					createDefinition({
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
			}),
		)

		const session = createSession(runtime, "retry_flow")
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
		expect(failureOutcome.payload.renderState).to.equal("failure")

		const retryOutcome = runtime.handleSubmission(
			failureOutcome.session,
			createSubmitRequest({
				sessionId: failureOutcome.session.sessionId,
				panelId: "details",
				action: WorkflowFormAction.RETRY,
			}),
		)

		expect(retryOutcome.kind).to.equal("render_form")
		if (retryOutcome.kind === "render_form") {
			expect(retryOutcome.session.currentPanelId).to.equal("source")
			expect(retryOutcome.session.failure).to.equal(undefined)
			expect(retryOutcome.session.values["source.type"]).to.deep.equal({
				valueType: "string",
				stringValue: "commit",
			})
			expect(retryOutcome.session.values["source.detail"]).to.equal(undefined)
		}
	})

	it("dispatches non-terminal deterministic operations", () => {
		const runtime = createRuntime(
			createResolver({
				id: "non_terminal_operation",
				buildDefinition: () =>
					createDefinition({
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
			}),
		)

		const session = createSession(runtime, "non_terminal_operation")
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
		if (outcome.kind === "invoke_deterministic_operation") {
			expect(outcome.operationId).to.equal("load_preview")
			expect(outcome.nextPanelId).to.equal("preview_result")
			expect(outcome.terminal).to.equal(false)
			expect(outcome.rebuildDefinitionAfterSuccess).to.equal(false)
			expect(outcome.recomputeDestinationAfterSuccess).to.equal(false)
			expect(outcome.session.values.topic).to.deep.equal({
				valueType: "string",
				stringValue: "workflow v2",
			})
		}
	})

	it("continues non-terminal deterministic operations by writing operation data to session.data", () => {
		const runtime = createRuntime(
			createResolver({
				id: "operation_data",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "preview_request",
						panels: {
							preview_request: {
								panelId: "preview_request",
								title: "Preview Request",
								promptMarkdown: "Generate a preview.",
								fields: [],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "load_preview",
									nextPanelId: "preview_result",
									terminal: false,
									resultDataKey: "preview_result",
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
			}),
		)

		const session = createSession(runtime, "operation_data")
		const continued = runtime.continueAfterDeterministicOperation({
			session: {
				...session,
				data: {
					preview_result: {
						title: "Preview ready",
					},
				},
			},
			nextPanelId: "preview_result",
			rebuildDefinitionAfterSuccess: false,
			recomputeDestinationAfterSuccess: false,
		})

		expect(continued.kind).to.equal("render_form")
		expect(continued.session.currentPanelId).to.equal("preview_result")
		expect(continued.session.data.preview_result).to.deep.equal({
			title: "Preview ready",
		})
	})

	it("rebuilds the definition after operation success before selecting the next panel", () => {
		const runtime = createRuntime(
			createResolver({
				id: "rebuild_before_continue",
				buildDefinition: (session) =>
					createDefinition({
						firstPanelId: "preview_request",
						panels: {
							preview_request: {
								panelId: "preview_request",
								title: "Preview Request",
								promptMarkdown: "Generate a preview.",
								fields: [],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "load_preview",
									nextPanelId: "preview_result",
									terminal: false,
									rebuildDefinitionAfterSuccess: true,
								},
							},
							preview_result: {
								panelId: "preview_result",
								title: "Preview Result",
								promptMarkdown:
									session.data.preview_result && typeof session.data.preview_result === "object"
										? "Preview rebuilt from operation data."
										: "Preview missing operation data.",
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
			}),
		)

		const session = createSession(runtime, "rebuild_before_continue")
		const continued = runtime.continueAfterDeterministicOperation({
			session: {
				...session,
				data: {
					preview_result: {
						title: "Preview ready",
					},
				},
			},
			nextPanelId: "preview_result",
			rebuildDefinitionAfterSuccess: true,
			recomputeDestinationAfterSuccess: false,
		})

		expect(continued.kind).to.equal("render_form")
		expect(continued.payload.panel?.promptMarkdown).to.equal("Preview rebuilt from operation data.")
	})

	it("recomputes the next destination from rebuilt session state after operation success", () => {
		const runtime = createRuntime(
			createResolver({
				id: "recompute_destination",
				buildDefinition: (session) =>
					createDefinition({
						firstPanelId: "approach_selection",
						panels: {
							approach_selection: {
								panelId: "approach_selection",
								title: "Approach",
								promptMarkdown: "Choose an approach.",
								fields: [],
								allowedActions: ["submit"],
								transition:
									session.data.approach_result &&
									typeof session.data.approach_result === "object" &&
									"nextPanelId" in session.data.approach_result
										? {
												type: "sequential",
												nextPanelId: (session.data.approach_result as { nextPanelId: string })
													.nextPanelId,
											}
										: {
												type: "deterministic_operation",
												operationId: "persist_approach",
												terminal: false,
												resultDataKey: "approach_result",
												rebuildDefinitionAfterSuccess: true,
												recomputeDestinationAfterSuccess: true,
											},
							},
							random_preview: {
								panelId: "random_preview",
								title: "Random Preview",
								promptMarkdown: "Random technique preview.",
								fields: [],
								allowedActions: ["submit", "back"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist_random",
									terminal: true,
								},
							},
							technique_selection: {
								panelId: "technique_selection",
								title: "Technique Selection",
								promptMarkdown: "Select a technique.",
								fields: [],
								allowedActions: ["submit", "back"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist_selection",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		const session = createSession(runtime, "recompute_destination")
		const continued = runtime.continueAfterDeterministicOperation({
			session: {
				...session,
				data: {
					approach_result: {
						nextPanelId: "random_preview",
					},
				},
			},
			rebuildDefinitionAfterSuccess: true,
			recomputeDestinationAfterSuccess: true,
		})

		expect(continued.kind).to.equal("render_form")
		expect(continued.session.currentPanelId).to.equal("random_preview")
		expect(continued.payload.panel?.title).to.equal("Random Preview")
	})

	it("builds terminal success payloads after terminal deterministic-operation completion", () => {
		const runtime = createRuntime(
			createResolver({
				id: "terminal_operation",
				buildDefinition: () =>
					createDefinition({
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
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		const session = createSession(runtime, "terminal_operation")
		const submissionOutcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "confirmation",
			}),
		)

		if (submissionOutcome.kind !== "invoke_deterministic_operation") {
			throw new Error(`Expected invoke_deterministic_operation, received ${submissionOutcome.kind}.`)
		}

		const payload = runtime.buildSuccessPayload(submissionOutcome.session, "Saved successfully.")

		expect(payload.renderState).to.equal("success")
		expect(payload.successMessage).to.equal("Saved successfully.")
		expect(payload.panel).to.equal(undefined)
	})

	it("renders failure-state payloads when validation fails", () => {
		const runtime = createRuntime(
			createResolver({
				id: "failure_render",
				buildDefinition: () =>
					createDefinition({
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
			}),
		)

		const session = createSession(runtime, "failure_render")
		const outcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "details",
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.failure).to.deep.equal({
				panelId: "details",
				errorMessage: 'Field "required_field" is required.',
			})
			expect(outcome.payload.renderState).to.equal("failure")
			expect(outcome.payload.panel?.panelId).to.equal("details")
		}
	})

	it("rejects workflow-start submission when a parsed One of group has no populated alternative", () => {
		const runtime = new WorkflowFormRuntime()
		const definition = buildWorkflowStartDefinitionPayload({
			workflowName: "review-adversarial-general.md",
			workflowStartRequirements: {
				requiredFieldKeys: [],
				optionalFieldKeys: [],
				oneOfRequirement: {
					id: "workflow_start_one_of",
					fieldKeys: ["review_input", "diff_output", "spec_file"],
				},
			},
		})
		const session = runtime.createSession({
			resolverId: PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID,
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			definitionPayload: definition,
		})

		const outcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: definition.firstPanelId,
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.failure).to.deep.equal({
				panelId: definition.firstPanelId,
				errorMessage: "Provide at least one of the allowed alternative inputs before submitting.",
			})
		}
	})

	it("allows workflow-start submission when a parsed One of group has one populated alternative", () => {
		const runtime = new WorkflowFormRuntime()
		const definition = buildWorkflowStartDefinitionPayload({
			workflowName: "review-adversarial-general.md",
			workflowStartRequirements: {
				requiredFieldKeys: [],
				optionalFieldKeys: [],
				oneOfRequirement: {
					id: "workflow_start_one_of",
					fieldKeys: ["review_input", "diff_output", "spec_file"],
				},
			},
		})
		const session = runtime.createSession({
			resolverId: PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID,
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			definitionPayload: definition,
		})

		const outcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: definition.firstPanelId,
				fields: [
					{
						key: "diff_output",
						value: { stringValue: "/tmp/review.diff" },
					},
				],
			}),
		)

		expect(outcome.kind).to.equal("invoke_deterministic_operation")
		if (outcome.kind === "invoke_deterministic_operation") {
			expect(outcome.operationId).to.equal("set_workflow_placeholders")
			expect(outcome.session.values.diff_output).to.deep.equal({
				valueType: "string",
				stringValue: "/tmp/review.diff",
			})
		}
	})

	it("omits inactive conditional fields from the emitted payload", () => {
		const runtime = createRuntime(
			createResolver({
				id: "resolved_visibility",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "details",
						panels: {
							details: {
								panelId: "details",
								title: "Details",
								promptMarkdown: "Show only active fields.",
								fields: [
									{
										key: "mode",
										kind: "small_text",
										label: "Mode",
										required: false,
										allowedValueType: "string",
									},
									{
										key: "hidden_when_basic",
										kind: "small_text",
										label: "Hidden When Basic",
										required: false,
										allowedValueType: "string",
										visibilityCondition: {
											sourceKey: "mode",
											operator: "equals",
											value: "advanced",
										},
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		const session = createSession(runtime, "resolved_visibility")
		const payload = runtime.buildPayload({
			...session,
			values: {
				mode: {
					valueType: "string",
					stringValue: "basic",
				},
			},
		})

		expect(payload.panel?.fields.map((field) => field.key)).to.deep.equal(["mode"])
	})

	it("resolves conditional options before emitting the active panel payload", () => {
		const runtime = createRuntime(
			createResolver({
				id: "resolved_options",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "details",
						panels: {
							details: {
								panelId: "details",
								title: "Details",
								promptMarkdown: "Resolve options from session state.",
								fields: [
									{
										key: "approach",
										kind: "small_text",
										label: "Approach",
										required: false,
										allowedValueType: "string",
									},
									{
										key: "technique",
										kind: "dropdown",
										label: "Technique",
										required: false,
										allowedValueType: "string",
										options: [{ value: "fallback", label: "Fallback" }],
										conditionalOptions: [
											{
												when: {
													sourceKey: "approach",
													operator: "equals",
													value: "category",
												},
												options: [
													{ value: "mind_map", label: "Mind Map" },
													{ value: "starbursting", label: "Starbursting" },
												],
											},
										],
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		const session = createSession(runtime, "resolved_options")
		const payload = runtime.buildPayload({
			...session,
			values: {
				approach: {
					valueType: "string",
					stringValue: "category",
				},
			},
		})

		const techniqueField = payload.panel?.fields.find((field) => field.key === "technique")
		expect(techniqueField?.options).to.deep.equal([
			{ value: "mind_map", label: "Mind Map" },
			{ value: "starbursting", label: "Starbursting" },
		])
	})

	it("applies conditional field overrides before emitting the active panel payload", () => {
		const runtime = createRuntime(
			createResolver({
				id: "resolved_overrides",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "details",
						panels: {
							details: {
								panelId: "details",
								title: "Details",
								promptMarkdown: "Resolve field overrides from session state.",
								fields: [
									{
										key: "format",
										kind: "small_text",
										label: "Format",
										required: false,
										allowedValueType: "string",
									},
									{
										key: "payload",
										kind: "large_text",
										label: "Payload",
										required: false,
										allowedValueType: "string",
										conditionalFieldOverrides: [
											{
												when: {
													sourceKey: "format",
													operator: "equals",
													value: "json",
												},
												allowedValueType: "object",
											},
										],
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		const session = createSession(runtime, "resolved_overrides")
		const payload = runtime.buildPayload({
			...session,
			values: {
				format: {
					valueType: "string",
					stringValue: "json",
				},
			},
		})

		const payloadField = payload.panel?.fields.find((field) => field.key === "payload")
		expect(payloadField?.allowedValueType).to.equal("object")
	})

	it("emits only the active Code Review scoped_paths variant after source.type changes", () => {
		const runtime = new WorkflowFormRuntime()
		const session = createRegistrySession({
			runtime,
			resolverId: CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID,
		})

		const afterConfirm = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "confirm_resolution",
			}),
		)
		if (afterConfirm.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${afterConfirm.kind}.`)
		}

		const worktreeScoped = runtime.handleSubmission(
			afterConfirm.session,
			createSubmitRequest({
				sessionId: afterConfirm.session.sessionId,
				panelId: "source_selection",
				fields: [
					{
						key: "source.type",
						value: { stringValue: "worktree_head_scoped" },
					},
				],
			}),
		)
		if (worktreeScoped.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${worktreeScoped.kind}.`)
		}

		expect(worktreeScoped.payload.panel?.fields.filter((field) => field.key === "scoped_paths")).to.have.lengthOf(1)
		expect(worktreeScoped.payload.panel?.fields.find((field) => field.key === "context_lines")).to.equal(undefined)

		const backToSelection = runtime.handleSubmission(
			worktreeScoped.session,
			createSubmitRequest({
				sessionId: worktreeScoped.session.sessionId,
				panelId: "source_details",
				action: WorkflowFormAction.BACK,
			}),
		)
		if (backToSelection.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${backToSelection.kind}.`)
		}

		const commitScoped = runtime.handleSubmission(
			backToSelection.session,
			createSubmitRequest({
				sessionId: backToSelection.session.sessionId,
				panelId: "source_selection",
				fields: [
					{
						key: "source.type",
						value: { stringValue: "commit" },
					},
				],
			}),
		)
		if (commitScoped.kind !== "render_form") {
			throw new Error(`Expected render_form, received ${commitScoped.kind}.`)
		}

		expect(commitScoped.payload.panel?.fields.filter((field) => field.key === "scoped_paths")).to.have.lengthOf(1)
		expect(commitScoped.payload.panel?.fields.find((field) => field.key === "context_lines")).to.not.equal(undefined)
	})

	it("rejects invalid date submissions", () => {
		const runtime = createRuntime(
			createResolver({
				id: "invalid_date_submission",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "details",
						panels: {
							details: {
								panelId: "details",
								title: "Details",
								promptMarkdown: "Collect a date.",
								fields: [
									{
										key: "due_date",
										kind: "date",
										label: "Due Date",
										required: true,
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		const session = createSession(runtime, "invalid_date_submission")
		const outcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "details",
				fields: [
					{
						key: "due_date",
						value: { stringValue: "2026-02-30" },
					},
				],
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.failure).to.deep.equal({
				panelId: "details",
				errorMessage: 'Field "due_date" has an invalid value.',
			})
		}
	})

	it("rejects invalid date_time submissions", () => {
		const runtime = createRuntime(
			createResolver({
				id: "invalid_datetime_submission",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "details",
						panels: {
							details: {
								panelId: "details",
								title: "Details",
								promptMarkdown: "Collect a date time.",
								fields: [
									{
										key: "scheduled_at",
										kind: "date_time",
										label: "Scheduled At",
										required: true,
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		const session = createSession(runtime, "invalid_datetime_submission")
		const outcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "details",
				fields: [
					{
						key: "scheduled_at",
						value: { stringValue: "2026-04-10 12:30:00Z" },
					},
				],
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.failure).to.deep.equal({
				panelId: "details",
				errorMessage: 'Field "scheduled_at" has an invalid value.',
			})
		}
	})

	it("rejects structured large_text submissions that do not satisfy the declared schema", () => {
		const runtime = createRuntime(
			createResolver({
				id: "invalid_structured_payload",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "details",
						panels: {
							details: {
								panelId: "details",
								title: "Details",
								promptMarkdown: "Collect a structured payload.",
								fields: [
									{
										key: "payload",
										kind: "large_text",
										label: "Payload",
										required: true,
										allowedValueType: "object",
										valueSchema: {
											type: "object",
											required: ["base", "head"],
											properties: {
												base: { type: "string" },
												head: { type: "string" },
											},
										},
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		const session = createSession(runtime, "invalid_structured_payload")
		const outcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "details",
				fields: [
					{
						key: "payload",
						value: {
							objectValue: {
								entries: [
									{
										key: "base",
										value: { stringValue: "main" },
									},
								],
							},
						},
					},
				],
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.failure).to.deep.equal({
				panelId: "details",
				errorMessage: 'Field "payload" has an invalid value.',
			})
		}
	})

	it("rejects empty or multiline file_path submissions", () => {
		const runtime = createRuntime(
			createResolver({
				id: "invalid_file_path_submission",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "details",
						panels: {
							details: {
								panelId: "details",
								title: "Details",
								promptMarkdown: "Collect a file path.",
								fields: [
									{
										key: "artifact_path",
										kind: "file_path",
										label: "Artifact Path",
										required: true,
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		const session = createSession(runtime, "invalid_file_path_submission")
		const emptyOutcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "details",
				fields: [
					{
						key: "artifact_path",
						value: { stringValue: "   " },
					},
				],
			}),
		)
		expect(emptyOutcome.kind).to.equal("render_form")
		if (emptyOutcome.kind === "render_form") {
			expect(emptyOutcome.session.failure).to.deep.equal({
				panelId: "details",
				errorMessage: 'Field "artifact_path" has an invalid value.',
			})
		}

		const multilineOutcome = runtime.handleSubmission(
			session,
			createSubmitRequest({
				sessionId: session.sessionId,
				panelId: "details",
				fields: [
					{
						key: "artifact_path",
						value: { stringValue: "/tmp/one\n/tmp/two" },
					},
				],
			}),
		)
		expect(multilineOutcome.kind).to.equal("render_form")
		if (multilineOutcome.kind === "render_form") {
			expect(multilineOutcome.session.failure).to.deep.equal({
				panelId: "details",
				errorMessage: 'Field "artifact_path" has an invalid value.',
			})
		}
	})

	it("rejects definitions that omit the declared first panel", () => {
		const runtime = createRuntime(
			createResolver({
				id: "missing_first_panel",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "missing_panel",
						panels: {},
					}),
			}),
		)

		expect(() => createSession(runtime, "missing_first_panel")).to.throw(
			"Workflow form definition must declare an existing first panel.",
		)
	})

	it("rejects definitions that reference nonexistent destination panels", () => {
		const runtime = createRuntime(
			createResolver({
				id: "missing_destination",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "intro",
						panels: {
							intro: {
								panelId: "intro",
								title: "Intro",
								promptMarkdown: "Invalid next panel.",
								fields: [],
								allowedActions: ["submit"],
								transition: {
									type: "sequential",
									nextPanelId: "missing_destination",
								},
							},
						},
					}),
			}),
		)

		expect(() => createSession(runtime, "missing_destination")).to.throw(
			"Workflow form definition references a nonexistent destination panel: missing_destination",
		)
	})

	it("rejects invalid dropdown cardinality declarations", () => {
		const runtime = createRuntime(
			createResolver({
				id: "invalid_cardinality",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "intro",
						panels: {
							intro: {
								panelId: "intro",
								title: "Intro",
								promptMarkdown: "Invalid dropdown.",
								fields: [
									{
										key: "selection",
										kind: "dropdown",
										label: "Selection",
										required: true,
										allowedValueType: "array",
										selectionCardinality: "fixed_count",
										options: [{ value: "one", label: "One" }],
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		expect(() => createSession(runtime, "invalid_cardinality")).to.throw(
			"Workflow form definition declares an invalid dropdown cardinality: fixed_count",
		)
	})

	it("rejects unsupported field kinds", () => {
		const runtime = createRuntime(
			createResolver({
				id: "invalid_field_kind",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "intro",
						panels: {
							intro: {
								panelId: "intro",
								title: "Intro",
								promptMarkdown: "Invalid field kind.",
								fields: [
									{
										key: "selection",
										kind: "legacy_control" as never,
										label: "Selection",
										required: true,
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		expect(() => createSession(runtime, "invalid_field_kind")).to.throw(
			"Workflow form definition declares an unsupported field kind: legacy_control",
		)
	})

	it("rejects unsupported allowed value types", () => {
		const runtime = createRuntime(
			createResolver({
				id: "invalid_allowed_value_type",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "intro",
						panels: {
							intro: {
								panelId: "intro",
								title: "Intro",
								promptMarkdown: "Invalid allowed value type.",
								fields: [
									{
										key: "selection",
										kind: "small_text",
										label: "Selection",
										required: true,
										allowedValueType: "json" as never,
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		expect(() => createSession(runtime, "invalid_allowed_value_type")).to.throw(
			"Workflow form definition declares an unsupported allowed value type: json",
		)
	})

	it('rejects small_text fields with allowedValueType "boolean"', () => {
		const runtime = createRuntime(
			createResolver({
				id: "small_text_boolean_incompatible",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "intro",
						panels: {
							intro: {
								panelId: "intro",
								title: "Intro",
								promptMarkdown: "Invalid small text type.",
								fields: [
									{
										key: "selection",
										kind: "small_text",
										label: "Selection",
										required: true,
										allowedValueType: "boolean",
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		expect(() => createSession(runtime, "small_text_boolean_incompatible")).to.throw(
			'Workflow form definition declares an unsupported allowed value type for field kind "small_text": boolean',
		)
	})

	it('rejects number fields with allowedValueType "object"', () => {
		const runtime = createRuntime(
			createResolver({
				id: "number_object_incompatible",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "intro",
						panels: {
							intro: {
								panelId: "intro",
								title: "Intro",
								promptMarkdown: "Invalid number type.",
								fields: [
									{
										key: "selection",
										kind: "number",
										label: "Selection",
										required: true,
										allowedValueType: "object",
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		expect(() => createSession(runtime, "number_object_incompatible")).to.throw(
			'Workflow form definition declares an unsupported allowed value type for field kind "number": object',
		)
	})

	it('rejects single-select dropdown fields with allowedValueType "array"', () => {
		const runtime = createRuntime(
			createResolver({
				id: "dropdown_array_incompatible",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "intro",
						panels: {
							intro: {
								panelId: "intro",
								title: "Intro",
								promptMarkdown: "Invalid dropdown type.",
								fields: [
									{
										key: "selection",
										kind: "dropdown",
										label: "Selection",
										required: true,
										allowedValueType: "array",
										selectionCardinality: "single",
										options: [{ value: "one", label: "One" }],
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		expect(() => createSession(runtime, "dropdown_array_incompatible")).to.throw(
			'Workflow form definition declares an unsupported allowed value type for field kind "dropdown": array',
		)
	})

	it("rejects markdown_display fields with any allowedValueType", () => {
		const runtime = createRuntime(
			createResolver({
				id: "markdown_display_string_incompatible",
				buildDefinition: () =>
					createDefinition({
						firstPanelId: "intro",
						panels: {
							intro: {
								panelId: "intro",
								title: "Intro",
								promptMarkdown: "Invalid markdown display type.",
								fields: [
									{
										key: "notice",
										kind: "markdown_display",
										label: "Notice",
										required: false,
										allowedValueType: "string",
										contentMarkdown: "Read this first.",
									},
								],
								allowedActions: ["submit"],
								transition: {
									type: "deterministic_operation",
									operationId: "persist",
									terminal: true,
								},
							},
						},
					}),
			}),
		)

		expect(() => createSession(runtime, "markdown_display_string_incompatible")).to.throw(
			'Workflow form definition declares an unsupported allowed value type for field kind "markdown_display": string',
		)
	})
})
