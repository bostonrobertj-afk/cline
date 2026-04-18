import type { WorkflowFormDefinitionPayload, WorkflowFormSubmittedValuePayload } from "@shared/ExtensionMessage"
import { expect } from "chai"
import { describe, it } from "mocha"
import type { WorkflowFormSessionState } from "../types"
import {
	BRAINSTORMING_STEP_2_PREPARE_SESSION_RESOLVER_ID,
	BRAINSTORMING_STEP_3_CAPTURE_TOPIC_RESOLVER_ID,
	BRAINSTORMING_STEP_4_CHOOSE_APPROACH_RESOLVER_ID,
	buildBrainstormingStep2InitialDefinitionPayload,
	buildBrainstormingStep4DefinitionPayload,
	buildWorkflowStartDefinitionPayload,
	CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID,
	getWorkflowFormResolverDefinition,
	PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID,
} from "../WorkflowFormRegistry"

const EMPTY_DEFINITION: WorkflowFormDefinitionPayload = {
	definitionVersion: 2,
	title: "",
	toolDictionaryTitle: "",
	toolDictionaryMarkdown: "",
	firstPanelId: "",
	panels: {},
}

function createSession(args: {
	workflowFormId?: string
	definitionPayload?: WorkflowFormDefinitionPayload
	values?: Record<string, WorkflowFormSubmittedValuePayload>
	currentPanelId?: string
	data?: WorkflowFormSessionState["data"]
}): WorkflowFormSessionState {
	const definitionPayload = args.definitionPayload ?? EMPTY_DEFINITION

	return {
		sessionId: `session-${args.workflowFormId ?? "test-form"}`,
		workflowFormId: args.workflowFormId ?? "test-form",
		definitionVersion: 2,
		definitionPayload,
		firstPanelId: definitionPayload.firstPanelId,
		currentPanelId: args.currentPanelId ?? definitionPayload.firstPanelId,
		values: args.values ?? {},
		data: args.data ?? {},
	}
}

describe("WorkflowFormRegistry", () => {
	it("builds the create-epics workflow-start V2 definition with the approved override copy", () => {
		const definition = buildWorkflowStartDefinitionPayload({
			workflowName: "create-epics.md",
			workflowStartRequirements: {
				requiredFieldKeys: ["architecture_document", "prd", "mode"],
				optionalFieldKeys: ["ux_spec", "ui_spec"],
			},
		})
		const panel = definition.panels[definition.firstPanelId]

		expect(definition.title).to.equal("Inputs for This Workflow")
		expect(definition.toolDictionaryTitle).to.equal("Workflow Placeholder Reference")
		expect(definition.toolDictionaryMarkdown).to.include("## set_workflow_placeholders")
		expect(definition.toolDictionaryMarkdown).to.include("### Term Reference")
		expect(definition.toolDictionaryMarkdown).to.include("`architecture_document`")
		expect(definition.firstPanelId).to.equal("workflow_start_inputs")
		expect(panel?.promptMarkdown).to.equal("Provide the following to start the workflow:")
		expect(panel?.transition).to.deep.equal({
			type: "deterministic_operation",
			operationId: "set_workflow_placeholders",
			terminal: true,
		})
		expect(panel?.fields.map((field) => field.key)).to.deep.equal([
			"architecture_document",
			"prd",
			"mode",
			"ux_spec",
			"ui_spec",
		])
		expect(panel?.fields[0]?.label).to.equal("Architecture Document")
		expect(panel?.fields[2]?.placeholder).to.equal("new or continue")
		expect(panel?.allowedActions).to.include("retry")
	})

	it("marks workflow-start One of fields with the shared oneOfGroupId", () => {
		const definition = buildWorkflowStartDefinitionPayload({
			workflowName: "review-adversarial-general.md",
			workflowStartRequirements: {
				requiredFieldKeys: ["review_input"],
				optionalFieldKeys: ["spec_file"],
				oneOfRequirement: {
					id: "workflow_start_one_of",
					fieldKeys: ["review_input", "diff_output", "spec_file"],
				},
			},
		})
		const panel = definition.panels[definition.firstPanelId]

		expect(panel?.fields.find((field) => field.key === "review_input")?.oneOfGroupId).to.equal("workflow_start_one_of")
		expect(panel?.fields.find((field) => field.key === "diff_output")?.oneOfGroupId).to.equal("workflow_start_one_of")
		expect(panel?.fields.find((field) => field.key === "spec_file")?.oneOfGroupId).to.equal("workflow_start_one_of")
		expect(panel?.fields.find((field) => field.key === "review_input")?.required).to.equal(true)
	})

	it("serializes workflow-start placeholder submissions into set_workflow_placeholders input", () => {
		const resolver = getWorkflowFormResolverDefinition(PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID)
		const definition = buildWorkflowStartDefinitionPayload({
			workflowName: "review-adversarial-general.md",
			workflowStartRequirements: {
				requiredFieldKeys: ["review_input"],
				optionalFieldKeys: ["spec_file"],
				oneOfRequirement: {
					id: "workflow_start_one_of",
					fieldKeys: ["review_input", "diff_output", "spec_file"],
				},
			},
		})
		const session = createSession({
			workflowFormId: resolver.id,
			definitionPayload: definition,
			values: {
				review_input: { valueType: "string", stringValue: " /tmp/review.md " },
				diff_output: { valueType: "string", stringValue: "   " },
				spec_file: { valueType: "string", stringValue: "/tmp/spec.md" },
			},
		})

		const outcome = resolver.buildOperationRequest(session, "set_workflow_placeholders")

		expect(outcome).to.deep.equal({
			toolName: "set_workflow_placeholders",
			toolInput: {
				values: {
					review_input: "/tmp/review.md",
					spec_file: "/tmp/spec.md",
				},
			},
			toolParams: {
				values: JSON.stringify({
					review_input: "/tmp/review.md",
					spec_file: "/tmp/spec.md",
				}),
			},
		})
	})

	it("classifies workflow-start tool results with the preserved success and failure behavior", () => {
		const resolver = getWorkflowFormResolverDefinition(PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID)
		const definition = buildWorkflowStartDefinitionPayload({
			workflowName: "review-adversarial-general.md",
			workflowStartRequirements: {
				requiredFieldKeys: ["review_input"],
				optionalFieldKeys: [],
			},
		})
		const session = createSession({
			workflowFormId: resolver.id,
			definitionPayload: definition,
		})

		expect(
			resolver.applyOperationResult(session, {
				operationId: "set_workflow_placeholders",
				toolResultText: "Stored 1 workflow placeholder: review_input.",
			}),
		).to.deep.equal({
			succeeded: true,
			terminalSuccessMessage: "Workflow start inputs were stored.",
		})

		const failure = resolver.applyOperationResult(session, {
			operationId: "set_workflow_placeholders",
			toolResultText: "Error: Missing required parameter 'values'. Provide at least one placeholder value to store.",
		})
		expect(failure).to.deep.equal({
			succeeded: false,
			errorMessage: "Error: Missing required parameter 'values'. Provide at least one placeholder value to store.",
		})
	})

	it("builds the Code Review Step 2 V2 definition with the prescribed panel ids and schema-derived source options", () => {
		const resolver = getWorkflowFormResolverDefinition(CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID)
		const definition = resolver.buildDefinition(
			createSession({
				workflowFormId: resolver.id,
			}),
		)
		const sourceSelectionPanel = definition.panels.source_selection
		const sourceDetailsPanel = definition.panels.source_details

		expect(definition.title).to.equal("Review Diff Artifact")
		expect(definition.firstPanelId).to.equal("confirm_resolution")
		expect(Object.keys(definition.panels)).to.deep.equal(["confirm_resolution", "source_selection", "source_details"])
		expect(sourceSelectionPanel?.fields[0]?.key).to.equal("source.type")
		expect(sourceSelectionPanel?.fields[0]?.options?.map((option) => option.value)).to.deep.equal([
			"commit",
			"commit_range",
			"ref_diff",
			"worktree_head_scoped",
		])
		expect(sourceDetailsPanel?.backDestinationPanelId).to.equal("source_selection")
		expect(sourceDetailsPanel?.backStaleValueKeysToClear).to.deep.equal([
			"source.commit",
			"source.base",
			"source.head",
			"scoped_paths",
			"context_lines",
		])
		expect(sourceDetailsPanel?.transition).to.deep.equal({
			type: "deterministic_operation",
			operationId: "build_review_diff_output",
			terminal: true,
		})
		expect(sourceSelectionPanel?.allowedActions).to.include("retry")
		expect(sourceDetailsPanel?.allowedActions).to.include("retry")
		expect(sourceDetailsPanel?.fields.find((field) => field.key === "source.commit")?.visibilityCondition).to.deep.equal({
			sourceKey: "source.type",
			operator: "equals",
			value: "commit",
		})
		expect(sourceDetailsPanel?.fields.find((field) => field.key === "source.base")?.visibilityCondition).to.deep.equal({
			sourceKey: "source.type",
			operator: "equals",
			values: ["commit_range", "ref_diff"],
		})
		expect(sourceDetailsPanel?.fields.find((field) => field.key === "context_lines")?.allowedValueType).to.equal("integer")
	})

	it("serializes the Code Review Step 2 diff request from V2 submitted values", () => {
		const resolver = getWorkflowFormResolverDefinition(CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID)
		const definition = resolver.buildDefinition(
			createSession({
				workflowFormId: resolver.id,
			}),
		)
		const session = createSession({
			workflowFormId: resolver.id,
			definitionPayload: definition,
			currentPanelId: "source_details",
			values: {
				"source.type": { valueType: "string", stringValue: "commit_range" },
				"source.base": { valueType: "string", stringValue: "main" },
				"source.head": { valueType: "string", stringValue: "feature/review-form" },
				scoped_paths: {
					valueType: "string",
					stringValue: "src/core/task/index.ts\nwebview-ui/src/components/chat",
				},
				context_lines: { valueType: "integer", integerValue: 5 },
			},
		})

		const outcome = resolver.buildOperationRequest(session, "build_review_diff_output")

		expect(outcome.toolInput).to.deep.equal({
			source: {
				type: "commit_range",
				base: "main",
				head: "feature/review-form",
			},
			scoped_paths: ["src/core/task/index.ts", "webview-ui/src/components/chat"],
			context_lines: 5,
		})
		expect(outcome.toolParams).to.deep.equal({
			source: JSON.stringify({
				type: "commit_range",
				base: "main",
				head: "feature/review-form",
			}),
			scoped_paths: JSON.stringify(["src/core/task/index.ts", "webview-ui/src/components/chat"]),
			context_lines: "5",
		})
	})

	it("preserves the machine-checkable Code Review Step 2 success and failure classification", () => {
		const resolver = getWorkflowFormResolverDefinition(CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID)
		const session = createSession({
			workflowFormId: resolver.id,
		})

		expect(
			resolver.applyOperationResult(session, {
				operationId: "build_review_diff_output",
				toolResultText: JSON.stringify({
					persisted: true,
					diff_available: true,
					artifact_path: "/tmp/review-input.diff",
				}),
			}),
		).to.deep.equal({
			succeeded: true,
			terminalSuccessMessage: "The Step 2 diff artifact is ready.",
		})

		expect(
			resolver.applyOperationResult(session, {
				operationId: "build_review_diff_output",
				toolResultText: JSON.stringify({
					persisted: false,
					diff_available: false,
					reason: "No Git-backed diff content was available for the requested source and scope.",
				}),
			}),
		).to.deep.equal({
			succeeded: false,
			errorMessage: "No Git-backed diff content was available for the requested source and scope.",
		})
	})

	it("builds the Brainstorming Step 2 V2 definition with the prescribed session panels and dropdown options", () => {
		const definition = buildBrainstormingStep2InitialDefinitionPayload({
			sessionOptions: [
				{
					value: "/workspace/planning/brainstorming/brainstorming-session-2026-04-10-2.md",
					label: "brainstorming-session-2026-04-10-2.md",
					description: "2026-04-10",
				},
				{
					value: "/workspace/planning/brainstorming/brainstorming-session-2026-04-10.md",
					label: "brainstorming-session-2026-04-10.md",
					description: "2026-04-10",
				},
			],
		})

		expect(definition.firstPanelId).to.equal("session_strategy")
		expect(Object.keys(definition.panels)).to.deep.equal(["session_strategy", "session_selection"])
		expect(definition.panels.session_strategy.fields[0]?.options?.map((option) => option.value)).to.deep.equal([
			"continue_newest",
			"start_new",
			"list_all",
		])
		expect(definition.panels.session_selection.fields[0]?.key).to.equal("output_file")
		expect(definition.panels.session_selection.fields[0]?.options?.map((option) => option.label)).to.deep.equal([
			"brainstorming-session-2026-04-10-2.md",
			"brainstorming-session-2026-04-10.md",
		])
		expect(definition.panels.session_strategy.allowedActions).to.include("retry")
		expect(definition.panels.session_selection.allowedActions).to.include("retry")
	})

	it("serializes and classifies Brainstorming Step 2 deterministic operations", () => {
		const resolver = getWorkflowFormResolverDefinition(BRAINSTORMING_STEP_2_PREPARE_SESSION_RESOLVER_ID)
		const definition = buildBrainstormingStep2InitialDefinitionPayload({
			sessionOptions: [
				{
					value: "/workspace/planning/brainstorming/brainstorming-session-2026-04-10.md",
					label: "brainstorming-session-2026-04-10.md",
				},
			],
		})
		const session = createSession({
			workflowFormId: resolver.id,
			definitionPayload: definition,
			currentPanelId: "session_selection",
			values: {
				output_file: {
					valueType: "string",
					stringValue: "/workspace/planning/brainstorming/brainstorming-session-2026-04-10.md",
				},
			},
		})

		expect(resolver.buildOperationRequest(session, "select_brainstorming_session")).to.deep.equal({
			toolName: "select_brainstorming_session",
			toolInput: {
				output_file: "/workspace/planning/brainstorming/brainstorming-session-2026-04-10.md",
			},
			toolParams: {
				output_file: "/workspace/planning/brainstorming/brainstorming-session-2026-04-10.md",
			},
		})

		expect(
			resolver.applyOperationResult(session, {
				operationId: "select_brainstorming_session",
				toolResultText: JSON.stringify({
					persisted: true,
					artifact_path: "/workspace/planning/brainstorming/brainstorming-session-2026-04-10.md",
					output_file_available: true,
					selected: true,
				}),
			}),
		).to.deep.equal({
			succeeded: true,
			terminalSuccessMessage: "The brainstorming session file is ready.",
		})
	})

	it("builds the Brainstorming Step 3 V2 definition as a single-panel large-text form", () => {
		const resolver = getWorkflowFormResolverDefinition(BRAINSTORMING_STEP_3_CAPTURE_TOPIC_RESOLVER_ID)
		const definition = resolver.buildDefinition(
			createSession({
				workflowFormId: resolver.id,
			}),
		)
		const panel = definition.panels[definition.firstPanelId]

		expect(definition.title).to.equal("What topics and/or goals would you like to focus on for this brainstorming session?")
		expect(definition.toolDictionaryTitle).to.equal("Brainstorming Topic Reference")
		expect(panel?.promptMarkdown).to.equal("Be as detailed as you can- we'll worry about formatting later!")
		expect(panel?.fields).to.have.lengthOf(1)
		expect(panel?.fields[0]).to.include({
			key: "topic",
			kind: "large_text",
			label: "Topic and Goals",
			required: true,
			allowedValueType: "string",
		})
		expect(panel?.fields[0]?.presentation).to.deep.equal({ textareaSize: "large" })
		expect(panel?.allowedActions).to.include("retry")
	})

	it("serializes Brainstorming Step 3 topic text and preserves the approved success contract", () => {
		const resolver = getWorkflowFormResolverDefinition(BRAINSTORMING_STEP_3_CAPTURE_TOPIC_RESOLVER_ID)
		const definition = resolver.buildDefinition(
			createSession({
				workflowFormId: resolver.id,
			}),
		)
		const session = createSession({
			workflowFormId: resolver.id,
			definitionPayload: definition,
			values: {
				topic: { valueType: "string", stringValue: "Line one\n\nLine two" },
			},
		})

		expect(resolver.buildOperationRequest(session, "capture_brainstorming_topic")).to.deep.equal({
			toolName: "capture_brainstorming_topic",
			toolInput: { topic: "Line one\n\nLine two" },
			toolParams: { topic: "Line one\n\nLine two" },
		})

		expect(
			resolver.applyOperationResult(session, {
				operationId: "capture_brainstorming_topic",
				toolResultText: '{"persisted":true,"artifact_path":"/tmp/brainstorming.md","topic_captured":true}',
			}),
		).to.deep.equal({
			succeeded: true,
			terminalSuccessMessage: "The brainstorming session topic is ready.",
		})
	})

	it("builds the Brainstorming Step 4 V2 definition with the shared non-terminal approach flow", () => {
		const definition = buildBrainstormingStep4DefinitionPayload({
			categoryOptions: [
				{ value: "creative", label: "creative" },
				{ value: "structured", label: "structured" },
			],
			techniqueOptionsByCategory: {
				creative: [
					{
						value: "Reverse Brainstorming",
						label: "Reverse Brainstorming",
						description: "Generate problems first.",
					},
				],
				structured: [
					{
						value: "Six Thinking Hats",
						label: "Six Thinking Hats",
						description: "Explore six perspectives.",
					},
				],
			},
		})

		expect(definition.firstPanelId).to.equal("approach_selection")
		expect(Object.keys(definition.panels)).to.deep.equal(["approach_selection", "technique_selection", "random_preview"])
		expect(definition.panels.approach_selection.fields[0]?.options?.map((option) => option.value)).to.deep.equal([
			"user_choose",
			"random_technique",
			"suggest_technique",
		])
		expect(definition.panels.approach_selection.transition).to.deep.equal({
			type: "deterministic_operation",
			operationId: "persist_brainstorming_approach",
			terminal: false,
			rebuildDefinitionAfterSuccess: true,
			recomputeDestinationAfterSuccess: true,
		})
		expect(definition.panels.technique_selection.fields.map((field) => field.key)).to.deep.equal([
			"technique_category",
			"technique_name",
		])
		expect(definition.panels.approach_selection.allowedActions).to.include("retry")
		expect(definition.panels.technique_selection.allowedActions).to.include("retry")
		expect(definition.panels.technique_selection.allowedActions).to.include("back")
		expect(definition.panels.technique_selection.backDestinationPanelId).to.equal("approach_selection")
		expect(definition.panels.technique_selection.backStaleValueKeysToClear).to.deep.equal([
			"technique_category",
			"technique_name",
		])
		expect(definition.panels.random_preview.allowedActions).to.deep.equal(["submit", "cancel", "back", "retry"])
	})

	it("serializes and classifies Brainstorming Step 4 deterministic operations", () => {
		const resolver = getWorkflowFormResolverDefinition(BRAINSTORMING_STEP_4_CHOOSE_APPROACH_RESOLVER_ID)
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
		const techniqueSelectionSession = createSession({
			workflowFormId: resolver.id,
			definitionPayload: definition,
			currentPanelId: "technique_selection",
			values: {
				selected_approach: { valueType: "string", stringValue: "user_choose" },
				technique_category: { valueType: "string", stringValue: "creative" },
				technique_name: { valueType: "string", stringValue: "Reverse Brainstorming" },
			},
		})

		expect(resolver.buildOperationRequest(techniqueSelectionSession, "persist_brainstorming_technique")).to.deep.equal({
			toolName: "persist_brainstorming_technique",
			toolInput: {
				technique_name: "Reverse Brainstorming",
				technique_description: "Generate problems first.",
			},
			toolParams: {
				technique_name: "Reverse Brainstorming",
				technique_description: "Generate problems first.",
			},
		})

		expect(
			resolver.applyOperationResult(techniqueSelectionSession, {
				operationId: "select_random_brainstorming_technique",
				toolResultText: JSON.stringify({
					technique_name: "Reverse Brainstorming",
					technique_description: "Generate problems first.",
					technique_category: "creative",
				}),
			}),
		).to.deep.equal({
			succeeded: true,
			operationData: {
				technique_name: "Reverse Brainstorming",
				technique_description: "Generate problems first.",
				technique_category: "creative",
			},
		})

		expect(
			resolver.applyOperationResult(techniqueSelectionSession, {
				operationId: "request_brainstorming_technique_suggestion",
				toolResultText: JSON.stringify({
					persisted: true,
					artifact_path: "/tmp/brainstorming.md",
					selected_technique: "user requested technique suggestion",
					technique_suggestion_requested: true,
				}),
			}),
		).to.deep.equal({
			succeeded: true,
			terminalSuccessMessage: "The brainstorming technique suggestion request is ready.",
		})
	})

	it("throws for an unknown resolver id", () => {
		expect(() => getWorkflowFormResolverDefinition("unknown_resolver")).to.throw(
			"Unknown workflow form resolver: unknown_resolver",
		)
	})
})
