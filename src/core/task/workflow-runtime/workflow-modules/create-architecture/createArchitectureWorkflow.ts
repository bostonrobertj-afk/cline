import type { WorkflowFormDefinitionPayload } from "@shared/ExtensionMessage"
import { WorkflowArtifactFamily } from "../../artifactFamilies"
import type {
	WorkflowDecisionAction,
	WorkflowDecisionBranchTrigger,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowDeterministicProcedureResult,
	WorkflowPersonaDefinition,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowStepPromptSource,
} from "../../types"
import { buildCreateArchitectureDocumentFromSession, buildInitialCreateArchitectureDocument } from "./createArchitectureDocument"
import {
	buildCreateArchitectureStep1ToolSchemas,
	buildCreateArchitectureStep2ToolSchemas,
	buildCreateArchitectureStep3ToolSchemas,
	buildCreateArchitectureStep4ToolSchemas,
	buildCreateArchitectureStep5ToolSchemas,
	buildCreateArchitectureStep6ToolSchemas,
	buildCreateArchitectureStep7ToolSchemas,
	buildCreateArchitectureStep8ToolSchemas,
	buildCreateArchitectureStep9ToolSchemas,
} from "./createArchitectureToolSchemas"

enum CreateArchitectureWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	CreationRequired = "creation_required",
	HasContextFiles = "has_context_files",
	ContextFiles = "context_files",
	ChangePlan = "change_plan",
	Scope = "scope",
	HasArchitecturalGoals = "has_architectural_goals",
	ArchitecturalGoals = "architectural_goals",
	HasCoreArchitecturalRules = "has_core_architectural_rules",
	CoreArchitecturalRules = "core_architectural_rules",
	OutputFile = "output_file",
	OutputArtifactFamily = "output_artifact_family",
	OutputArtifactIdentity = "output_artifact_identity",
	OutputArtifactFilename = "output_artifact_filename",
	OutputArtifactRelativePath = "output_artifact_relative_path",
}

const CREATE_ARCHITECTURE_WORKFLOW_DISPLAY_NAME = "Create Architecture"
const CREATE_ARCHITECTURE_WORKFLOW_DESCRIPTION =
	"Create a complete architecture document through collaborative discovery, explicit design decisions, and a final readiness review."
const ARCHITECTURE_DOCUMENT_ARTIFACT_ID = "architecture_document"
const STEP_2_INPUT_FORM_ID = "step-2-user-input-form"
const STEP_2_CHANGE_PLAN_CHECK_PANEL_ID = "step-2-change-plan-check-panel"
const STEP_2_CHANGE_PLAN_DETAIL_PANEL_ID = "step-2-change-plan-detail-panel"
const CREATE_ARCHITECTURE_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "Winston",
	role: "Architect",
	identity: "Designs scalable systems and chooses practical technology with care.",
	capabilities: ["distributed systems", "cloud", "API design", "scalability"],
	communicationStyle: "Calm, pragmatic, and tradeoff-aware.",
	principles: [
		"Prefer simple, boring solutions that scale when needed.",
		"Let user journeys, business value, and developer productivity guide technical decisions.",
	],
}

const CREATE_ARCHITECTURE_WORKFLOW_VALUE_KEYS = [
	CreateArchitectureWorkflowValueKey.ProjectMode,
	CreateArchitectureWorkflowValueKey.ProjectTitle,
	CreateArchitectureWorkflowValueKey.ProjectFolderName,
	CreateArchitectureWorkflowValueKey.CreationRequired,
	CreateArchitectureWorkflowValueKey.HasContextFiles,
	CreateArchitectureWorkflowValueKey.ContextFiles,
	CreateArchitectureWorkflowValueKey.ChangePlan,
	CreateArchitectureWorkflowValueKey.Scope,
	CreateArchitectureWorkflowValueKey.HasArchitecturalGoals,
	CreateArchitectureWorkflowValueKey.ArchitecturalGoals,
	CreateArchitectureWorkflowValueKey.HasCoreArchitecturalRules,
	CreateArchitectureWorkflowValueKey.CoreArchitecturalRules,
	CreateArchitectureWorkflowValueKey.OutputFile,
	CreateArchitectureWorkflowValueKey.OutputArtifactFamily,
	CreateArchitectureWorkflowValueKey.OutputArtifactIdentity,
	CreateArchitectureWorkflowValueKey.OutputArtifactFilename,
	CreateArchitectureWorkflowValueKey.OutputArtifactRelativePath,
]

const STEP_3_PROMPT = `Review {workflow.output_file} and any additional files listed within it as relevant context.

If files were provided in the relevant context section, draft and propose content for the project context analysis section, then save it to {workflow.output_file} once the user approves.

Ensure that the scope, architectural goals, and core architectural rules are sufficient to enable completion of the remaining document sections. If the existing is vague, overly broad, or lacks sufficient detail, engage the user and guide them through improving the content of these sections until it is appropriate for a project architecture document and sufficient to act as a basis for the remaining document sections.

Once the scope, architectural goals, and core architectural rules sections are sufficient, draft and propose content for the interpretation section of the document to the user, and save it to {workflow.output_file} once the user approves.

Once you've saved user-approved content to the document's interpretation section, use workflow_progress_request to confirm and unlock the next workflow step.`

const STEP_4_PROMPT = `Guide the user through documenting the following sections of {workflow.output_file}:
- Responsibility Boundaries
- Durable vs Transient Ownership
- Required Additional Baseline for Authority Enforcement

Refer to relevant context, runtime code, and tests frequently to help keep things grounded in reality and ensure that the section's final content is comprehensive.

Once the user is aligned with this content, use workflow_progress_request to confirm and unlock the next workflow step.`

const STEP_5_PROMPT = `Inform the user that you will now assess current runtime code & tests to identify what existing code is aligned, partially aligned, and not aligned with the intended architecture, then do a thorough assessment of the repository and record your findings in {workflow.output_file} under the appropriate section headings.

Brief the user on your findings, answer any questions they have, make adjustments if needed, then use workflow_progress_request to unlock the next workflow step once the user approves the content you've added based on your code alignment assessment.`

const STEP_6_PROMPT = `Identify the key tradeoffs and risks based on the existing contents of {workflow.output_file}, performing additional code assessment if needed. Provide a proposed draft for the key tradeoffs and risks section of the document to the user, refine as needed based on their feedback, and save the final version under the appropriate document headings once the user approves.

Once the tradeoffs and risks sections are populated with user-approved content, use workflow_progress_request to unlock the next workflow step.`

const STEP_7_PROMPT = `Draft and propose a comprehensive blast radius for this project encompassing all files, modules, directories, shared components, and integration boundaries to the user, adjust based on their feedback, and save the approved content under the appropriate heading in {workflow.output_file}.

Once the blast radius section of the architecture document is populated with user-approved content, use workflow_progress_request to unlock the next workflow step.`

const STEP_8_PROMPT = `Identify the key dependencies that will matter during project implementation, provide them to the user, adjust based on their feedback, then save them in the dependencies section of {workflow.output_file}.

Next, build an implementation roadmap which establishes high-level project implementation sequencing based on the identified dependencies & blast radius. Provide the proposed draft to the user, adjust based on their feedback, then save it to the project roadmap section of {workflow.output_file}.

Once you've populated the dependencies and implementation roadmap sections of {workflow.output_file} with user-approved content, use workflow_progress_request to unlock the final workflow step.`

const STEP_9_EXISTING_DOCUMENT_HEADER_PROMPT = `You have been called inside a workflow focused on revising an existing architecture document within the following project:
- Project: {workflow.projectTitle}
- Project Folder: {workflow.projectFolderName}
- Architecture Document: {workflow.output_file}`
const STEP_9_CHANGE_PLAN_PROMPT_LINE = "- Change Management Plan: {workflow.change_plan}"

const STEP_9_EXISTING_DOCUMENT_BODY_PROMPT = `Steps 1-8 were automatically completed by the system.

Review the architecture document and any files listed in the "Relevant Context" section.
After reviewing, confirm the scope of revisions that the user wishes to make in the architecture document, then work with them to identify the correct revisions to the existing document and update {workflow.output_file} appropriately.`

const STEP_9_NEW_DOCUMENT_REVIEW_PROMPT = `Review the full architecture for coherence and pattern and structure alignment.
Classify any issues as critical, important, or minor.
If there are critical issues, present them and ask how the user wants to resolve them before implementation. If there are important or minor issues, present them as refinements and ask whether to address them now.`

const STEP_9_FINAL_PROMPT = `When finished, present a short completion summary using attempt_completion and explain that the architecture document is now the technical source of truth and is ready to inform the create-epics workflow.`

function buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"] {
	return {
		type: "conditional",
		conditionSourceKey: "__terminal__",
		branches: [],
		defaultTerminal: true,
	}
}

function sourceRouteMatches(sourceRoute: { branchId: string; routeId: string }, branchId: string, routeId: string): boolean {
	return sourceRoute.branchId === branchId && sourceRoute.routeId === routeId
}

function toolBackedOperationSucceeded(branchId: string, routeId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "tool_backed_operation_succeeded" &&
			sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId),
	}
}

function toolBackedOperationFailed(branchId: string, routeId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "tool_backed_operation_failed" &&
			sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId),
	}
}

function entryArtifactResolutionCompletedWithCreationRequired(creationRequired: boolean): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "entry_artifact_resolution_completed" &&
			triggerEvent.artifactResolutions.some(
				(artifactResolution) =>
					artifactResolution.artifactId === ARCHITECTURE_DOCUMENT_ARTIFACT_ID &&
					artifactResolution.creationRequired === creationRequired,
			),
	}
}

function buildPersistCreationRequiredAction(
	creationRequired: boolean,
): Extract<WorkflowDecisionAction, { kind: "run_deterministic_procedure" }> {
	return {
		kind: "run_deterministic_procedure",
		instruction: {
			run: (): WorkflowDeterministicProcedureResult => ({
				kind: "succeeded",
				workflowValueWrites: {
					[CreateArchitectureWorkflowValueKey.CreationRequired]: creationRequired,
				},
			}),
		},
	}
}

function workflowFormCompletedWithCreationRequired(
	workflowFormId: string,
	creationRequired: boolean,
): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "workflow_form_completed" &&
			triggerEvent.workflowFormId === workflowFormId &&
			workflowValues[CreateArchitectureWorkflowValueKey.CreationRequired] === creationRequired,
	}
}

function workflowProgressRequestConfirmed(): WorkflowDecisionBranchTrigger {
	return {
		kind: "on_event",
		eventKind: "workflow_progress_request_confirmed",
	}
}

function workflowProgressRequestDenied(): WorkflowDecisionBranchTrigger {
	return {
		kind: "on_event",
		eventKind: "workflow_progress_request_denied",
	}
}

function readBooleanWorkflowValue(
	input: WorkflowPromptBuilderInput,
	key: CreateArchitectureWorkflowValueKey,
): boolean | undefined {
	const value = input.session.workflowValues[key]
	if (typeof value === "boolean") {
		return value
	}

	return undefined
}

function readNonEmptyStringWorkflowValue(
	input: WorkflowPromptBuilderInput,
	key: CreateArchitectureWorkflowValueKey,
): string | undefined {
	const value = input.session.workflowValues[key]
	if (typeof value !== "string") {
		return undefined
	}

	const trimmedValue = value.trim()
	if (trimmedValue.length > 0) {
		return trimmedValue
	}

	return undefined
}

function createEmptyPromptSource(): WorkflowStepPromptSource {
	return { kind: "none" }
}

function createStepDefinition(args: {
	stepNumber: number
	checklistLabel: string
	decisionTree: WorkflowDecisionTree
	buildPromptSource?: WorkflowStepDefinition["buildPromptSource"]
	promptTemplates?: WorkflowStepDefinition["promptTemplates"]
	buildToolSchema: WorkflowStepDefinition["buildToolSchema"]
}): WorkflowStepDefinition {
	const stepDefinition: WorkflowStepDefinition = {
		id: `step-${args.stepNumber}`,
		stepNumber: args.stepNumber,
		checklistLabel: args.checklistLabel,
		buildPromptSource: args.buildPromptSource ?? createEmptyPromptSource,
		buildToolSchema: args.buildToolSchema,
		decisionTree: args.decisionTree,
	}

	if (args.promptTemplates !== undefined) {
		return { ...stepDefinition, promptTemplates: args.promptTemplates }
	}

	return stepDefinition
}

function buildStep2InputWorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Architecture Inputs",
		toolDictionaryTitle: "Architecture Inputs",
		toolDictionaryMarkdown: "Provide the initial context for the architecture document.",
		firstPanelId: "step-2-context-files-check-panel",
		panels: {
			"step-2-context-files-check-panel": {
				panelId: "step-2-context-files-check-panel",
				title: "Context Files",
				promptMarkdown: "Are there any files which you'd like to provide as context for this session?",
				fields: [
					{
						key: CreateArchitectureWorkflowValueKey.HasContextFiles,
						workflowValueKey: CreateArchitectureWorkflowValueKey.HasContextFiles,
						kind: "boolean",
						label: "Context files",
						required: true,
						allowedValueType: "boolean",
						trueLabel: "Yes",
						falseLabel: "No",
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "Continue",
				},
				transition: {
					type: "conditional",
					conditionSourceKey: CreateArchitectureWorkflowValueKey.HasContextFiles,
					branches: [
						{
							matchValue: true,
							nextPanelId: "step-2-context-files-detail-panel",
						},
						{
							matchValue: false,
							nextPanelId: "step-2-scope-panel",
							staleValueKeysToClear: [CreateArchitectureWorkflowValueKey.ContextFiles],
						},
					],
					defaultNextPanelId: "step-2-scope-panel",
				},
			},
			"step-2-context-files-detail-panel": {
				panelId: "step-2-context-files-detail-panel",
				title: "Context File Paths",
				promptMarkdown: "Please provide the full file path for each file you'd like to use as session context.",
				fields: [
					{
						key: CreateArchitectureWorkflowValueKey.ContextFiles,
						workflowValueKey: CreateArchitectureWorkflowValueKey.ContextFiles,
						kind: "large_text",
						label: "Context file paths",
						required: true,
						allowedValueType: "string",
						presentation: {
							textareaSize: "large",
						},
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Back",
				},
				transition: {
					type: "sequential",
					nextPanelId: "step-2-scope-panel",
				},
			},
			"step-2-scope-panel": {
				panelId: "step-2-scope-panel",
				title: "Scope",
				promptMarkdown: "Please describe the scope of this architecture document",
				fields: [
					{
						key: CreateArchitectureWorkflowValueKey.Scope,
						workflowValueKey: CreateArchitectureWorkflowValueKey.Scope,
						kind: "large_text",
						label: "Scope",
						required: true,
						allowedValueType: "string",
						presentation: {
							textareaSize: "large",
						},
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Back",
				},
				transition: {
					type: "sequential",
					nextPanelId: "step-2-architectural-goals-check-panel",
				},
			},
			"step-2-architectural-goals-check-panel": {
				panelId: "step-2-architectural-goals-check-panel",
				title: "Architectural Goals",
				promptMarkdown: "Would you like to provide architectural goals?",
				fields: [
					{
						key: CreateArchitectureWorkflowValueKey.HasArchitecturalGoals,
						workflowValueKey: CreateArchitectureWorkflowValueKey.HasArchitecturalGoals,
						kind: "boolean",
						label: "Architectural goals",
						required: true,
						allowedValueType: "boolean",
						trueLabel: "Yes",
						falseLabel: "No",
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Back",
				},
				transition: {
					type: "conditional",
					conditionSourceKey: CreateArchitectureWorkflowValueKey.HasArchitecturalGoals,
					branches: [
						{
							matchValue: true,
							nextPanelId: "step-2-architectural-goals-detail-panel",
						},
						{
							matchValue: false,
							nextPanelId: "step-2-core-rules-check-panel",
							staleValueKeysToClear: [CreateArchitectureWorkflowValueKey.ArchitecturalGoals],
						},
					],
					defaultNextPanelId: "step-2-core-rules-check-panel",
				},
			},
			"step-2-architectural-goals-detail-panel": {
				panelId: "step-2-architectural-goals-detail-panel",
				title: "Architectural Goal Details",
				promptMarkdown: "Please provide the architectural goals below.",
				fields: [
					{
						key: CreateArchitectureWorkflowValueKey.ArchitecturalGoals,
						workflowValueKey: CreateArchitectureWorkflowValueKey.ArchitecturalGoals,
						kind: "large_text",
						label: "Architectural goals",
						required: true,
						allowedValueType: "string",
						presentation: {
							textareaSize: "large",
						},
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Back",
				},
				transition: {
					type: "sequential",
					nextPanelId: "step-2-core-rules-check-panel",
				},
			},
			"step-2-core-rules-check-panel": {
				panelId: "step-2-core-rules-check-panel",
				title: "Core Architectural Rules",
				promptMarkdown: "Would you like to provide the core architectural rules now?",
				fields: [
					{
						key: CreateArchitectureWorkflowValueKey.HasCoreArchitecturalRules,
						workflowValueKey: CreateArchitectureWorkflowValueKey.HasCoreArchitecturalRules,
						kind: "boolean",
						label: "Core architectural rules",
						required: true,
						allowedValueType: "boolean",
						trueLabel: "Yes",
						falseLabel: "No",
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Back",
				},
				transition: {
					type: "conditional",
					conditionSourceKey: CreateArchitectureWorkflowValueKey.HasCoreArchitecturalRules,
					branches: [
						{
							matchValue: true,
							nextPanelId: "step-2-core-rules-detail-panel",
						},
						{
							matchValue: false,
							terminal: true,
							staleValueKeysToClear: [CreateArchitectureWorkflowValueKey.CoreArchitecturalRules],
						},
					],
					defaultTerminal: true,
				},
			},
			"step-2-core-rules-detail-panel": {
				panelId: "step-2-core-rules-detail-panel",
				title: "Core Architectural Rule Details",
				promptMarkdown: "Please provide the core architectural rules below.",
				fields: [
					{
						key: CreateArchitectureWorkflowValueKey.CoreArchitecturalRules,
						workflowValueKey: CreateArchitectureWorkflowValueKey.CoreArchitecturalRules,
						kind: "large_text",
						label: "Core architectural rules",
						required: true,
						allowedValueType: "string",
						presentation: {
							textareaSize: "large",
						},
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Back",
				},
				transition: buildTerminalTransition(),
			},
			[STEP_2_CHANGE_PLAN_CHECK_PANEL_ID]: {
				panelId: STEP_2_CHANGE_PLAN_CHECK_PANEL_ID,
				title: "Existing Architecture Document",
				promptMarkdown:
					"It looks like this project already has an architecture document. Do you have a change management plan to provide?",
				fields: [
					{
						key: "has_change_plan",
						kind: "boolean",
						label: "select one",
						required: true,
						allowedValueType: "boolean",
						trueLabel: "yes",
						falseLabel: "no",
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "submit",
				},
				transition: {
					type: "conditional",
					conditionSourceKey: "has_change_plan",
					branches: [
						{
							matchValue: true,
							nextPanelId: STEP_2_CHANGE_PLAN_DETAIL_PANEL_ID,
						},
						{
							matchValue: false,
							terminal: true,
							staleValueKeysToClear: [CreateArchitectureWorkflowValueKey.ChangePlan],
						},
					],
					defaultTerminal: true,
				},
			},
			[STEP_2_CHANGE_PLAN_DETAIL_PANEL_ID]: {
				panelId: STEP_2_CHANGE_PLAN_DETAIL_PANEL_ID,
				title: "Provide File Path",
				promptMarkdown: "Please provide the full file path for your change management plan.",
				fields: [
					{
						key: CreateArchitectureWorkflowValueKey.ChangePlan,
						workflowValueKey: CreateArchitectureWorkflowValueKey.ChangePlan,
						kind: "small_text",
						label: "file path",
						required: true,
						allowedValueType: "string",
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "submit",
					back: "back",
				},
				backDestinationPanelId: STEP_2_CHANGE_PLAN_CHECK_PANEL_ID,
				backStaleValueKeysToClear: [CreateArchitectureWorkflowValueKey.ChangePlan],
				transition: buildTerminalTransition(),
			},
		},
	}
}

function buildStep1DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-1-resolve-entry-artifact",
		branches: {
			"step-1-resolve-entry-artifact": {
				id: "step-1-resolve-entry-artifact",
				routes: [
					{
						id: "step-1-allocate-artifact",
						trigger: entryArtifactResolutionCompletedWithCreationRequired(true),
						action: {
							kind: "allocate_artifact",
							artifactId: ARCHITECTURE_DOCUMENT_ARTIFACT_ID,
						},
						followingBranchId: "step-1-await-allocation",
					},
					{
						id: "step-1-continue-existing-artifact",
						trigger: entryArtifactResolutionCompletedWithCreationRequired(false),
						action: buildPersistCreationRequiredAction(false),
						followingBranchId: "step-1-transition-existing-artifact-to-step-2",
					},
				],
			},
			"step-1-transition-existing-artifact-to-step-2": {
				id: "step-1-transition-existing-artifact-to-step-2",
				routes: [
					{
						id: "step-1-transition-existing-artifact-to-step-2",
						trigger: { kind: "always" },
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 2,
							},
						},
					},
				],
			},
			"step-1-await-allocation": {
				id: "step-1-await-allocation",
				routes: [
					{
						id: "step-1-build-initial-shell",
						trigger: toolBackedOperationSucceeded("step-1-resolve-entry-artifact", "step-1-allocate-artifact"),
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: ARCHITECTURE_DOCUMENT_ARTIFACT_ID,
								buildContent: buildInitialCreateArchitectureDocument,
								workflowValueWrites: {
									[CreateArchitectureWorkflowValueKey.CreationRequired]: true,
								},
							},
						},
						followingBranchId: "step-1-await-initial-shell",
					},
					{
						id: "step-1-retry-allocate-artifact",
						trigger: toolBackedOperationFailed("step-1-resolve-entry-artifact", "step-1-allocate-artifact"),
						action: {
							kind: "allocate_artifact",
							artifactId: ARCHITECTURE_DOCUMENT_ARTIFACT_ID,
						},
						followingBranchId: "step-1-await-retry-allocation",
					},
				],
			},
			"step-1-await-retry-allocation": {
				id: "step-1-await-retry-allocation",
				routes: [
					{
						id: "step-1-build-initial-shell-after-retry",
						trigger: toolBackedOperationSucceeded("step-1-await-allocation", "step-1-retry-allocate-artifact"),
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: ARCHITECTURE_DOCUMENT_ARTIFACT_ID,
								buildContent: buildInitialCreateArchitectureDocument,
								workflowValueWrites: {
									[CreateArchitectureWorkflowValueKey.CreationRequired]: true,
								},
							},
						},
						followingBranchId: "step-1-await-initial-shell",
					},
					{
						id: "step-1-terminal-error-after-retry-allocation",
						trigger: toolBackedOperationFailed("step-1-await-allocation", "step-1-retry-allocate-artifact"),
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to allocate architecture.md after retrying artifact creation.",
						},
					},
				],
			},
			"step-1-await-initial-shell": {
				id: "step-1-await-initial-shell",
				routes: [
					{
						id: "step-1-transition-to-step-2",
						trigger: {
							kind: "event_predicate",
							matches: ({ triggerEvent }) =>
								triggerEvent.kind === "tool_backed_operation_succeeded" &&
								(sourceRouteMatches(
									triggerEvent.sourceRoute,
									"step-1-await-allocation",
									"step-1-build-initial-shell",
								) ||
									sourceRouteMatches(
										triggerEvent.sourceRoute,
										"step-1-await-retry-allocation",
										"step-1-build-initial-shell-after-retry",
									)),
						},
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 2,
							},
						},
					},
					{
						id: "step-1-terminal-error-after-initial-shell",
						trigger: {
							kind: "event_predicate",
							matches: ({ triggerEvent }) =>
								triggerEvent.kind === "tool_backed_operation_failed" &&
								(sourceRouteMatches(
									triggerEvent.sourceRoute,
									"step-1-await-allocation",
									"step-1-build-initial-shell",
								) ||
									sourceRouteMatches(
										triggerEvent.sourceRoute,
										"step-1-await-retry-allocation",
										"step-1-build-initial-shell-after-retry",
									)),
						},
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to initialize architecture.md.",
						},
					},
				],
			},
		},
	}
}

function buildStep2DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-2-render-input-form",
		branches: {
			"step-2-render-input-form": {
				id: "step-2-render-input-form",
				routes: [
					{
						id: "step-2-render-creation-input-form",
						trigger: {
							kind: "session_predicate",
							matches: ({ workflowValues }) =>
								workflowValues[CreateArchitectureWorkflowValueKey.CreationRequired] === true,
						},
						action: {
							kind: "render_workflow_form",
							workflowFormId: STEP_2_INPUT_FORM_ID,
							startPanelId: "step-2-context-files-check-panel",
						},
						followingBranchId: "step-2-await-input-form",
					},
					{
						id: "step-2-render-existing-document-form",
						trigger: {
							kind: "session_predicate",
							matches: ({ workflowValues }) =>
								workflowValues[CreateArchitectureWorkflowValueKey.CreationRequired] === false,
						},
						action: {
							kind: "render_workflow_form",
							workflowFormId: STEP_2_INPUT_FORM_ID,
							startPanelId: STEP_2_CHANGE_PLAN_CHECK_PANEL_ID,
						},
						followingBranchId: "step-2-await-input-form",
					},
				],
			},
			"step-2-await-input-form": {
				id: "step-2-await-input-form",
				routes: [
					{
						id: "step-2-build-submitted-values-document",
						trigger: workflowFormCompletedWithCreationRequired(STEP_2_INPUT_FORM_ID, true),
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: ARCHITECTURE_DOCUMENT_ARTIFACT_ID,
								buildContent: buildCreateArchitectureDocumentFromSession,
							},
						},
						followingBranchId: "step-2-await-submitted-values-document",
					},
					{
						id: "step-2-transition-existing-document-to-step-9",
						trigger: workflowFormCompletedWithCreationRequired(STEP_2_INPUT_FORM_ID, false),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 9,
							},
						},
					},
				],
			},
			"step-2-await-submitted-values-document": {
				id: "step-2-await-submitted-values-document",
				routes: [
					{
						id: "step-2-transition-to-step-3",
						trigger: toolBackedOperationSucceeded(
							"step-2-await-input-form",
							"step-2-build-submitted-values-document",
						),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 3,
							},
						},
					},
					{
						id: "step-2-terminal-error-after-submitted-values-document",
						trigger: toolBackedOperationFailed("step-2-await-input-form", "step-2-build-submitted-values-document"),
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to write architecture input values to architecture.md.",
						},
					},
				],
			},
		},
	}
}

function buildProgressionDecisionTree(
	currentStepNumber: 3 | 4 | 5 | 6 | 7 | 8,
	nextStepNumber: 4 | 5 | 6 | 7 | 8 | 9,
): WorkflowDecisionTree {
	const projectPromptBranchId = `step-${currentStepNumber}-project-prompt`
	const awaitProgressRequestBranchId = `step-${currentStepNumber}-await-progress-request`

	return {
		entryBranchId: projectPromptBranchId,
		branches: {
			[projectPromptBranchId]: {
				id: projectPromptBranchId,
				routes: [
					{
						id: `step-${currentStepNumber}-project-prompt`,
						trigger: { kind: "always" },
						action: {
							kind: "project_prompt",
						},
						followingBranchId: awaitProgressRequestBranchId,
					},
				],
			},
			[awaitProgressRequestBranchId]: {
				id: awaitProgressRequestBranchId,
				routes: [
					{
						id: `step-${currentStepNumber}-transition-to-step-${nextStepNumber}`,
						trigger: workflowProgressRequestConfirmed(),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: nextStepNumber,
							},
						},
					},
					{
						id: `step-${currentStepNumber}-continue-current-step`,
						trigger: workflowProgressRequestDenied(),
						action: {
							kind: "project_prompt",
						},
					},
				],
			},
		},
	}
}

function buildStep9DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-9-project-prompt",
		branches: {
			"step-9-project-prompt": {
				id: "step-9-project-prompt",
				routes: [
					{
						id: "step-9-project-prompt",
						trigger: { kind: "always" },
						action: {
							kind: "project_prompt",
						},
						followingBranchId: "step-9-await-attempt-completion",
					},
				],
			},
			"step-9-await-attempt-completion": {
				id: "step-9-await-attempt-completion",
				routes: [
					{
						id: "step-9-complete-workflow-after-attempt-completion",
						trigger: { kind: "on_event", eventKind: "attempt_completion_succeeded" },
						action: {
							kind: "complete_workflow",
						},
					},
				],
			},
		},
	}
}

function buildStep3PromptSource(): WorkflowStepPromptSource {
	return { kind: "current_step_instruction_template", currentStepInstructionTemplate: STEP_3_PROMPT }
}

function buildStep4PromptSource(): WorkflowStepPromptSource {
	return { kind: "current_step_instruction_template", currentStepInstructionTemplate: STEP_4_PROMPT }
}

function buildStep5PromptSource(): WorkflowStepPromptSource {
	return { kind: "current_step_instruction_template", currentStepInstructionTemplate: STEP_5_PROMPT }
}

function buildStep6PromptSource(): WorkflowStepPromptSource {
	return { kind: "current_step_instruction_template", currentStepInstructionTemplate: STEP_6_PROMPT }
}

function buildStep7PromptSource(): WorkflowStepPromptSource {
	return { kind: "current_step_instruction_template", currentStepInstructionTemplate: STEP_7_PROMPT }
}

function buildStep8PromptSource(): WorkflowStepPromptSource {
	return { kind: "current_step_instruction_template", currentStepInstructionTemplate: STEP_8_PROMPT }
}

function buildStep9PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const sections: string[] = []
	const creationRequired = readBooleanWorkflowValue(input, CreateArchitectureWorkflowValueKey.CreationRequired)

	if (creationRequired === false) {
		sections.push(STEP_9_EXISTING_DOCUMENT_HEADER_PROMPT)

		const changePlan = readNonEmptyStringWorkflowValue(input, CreateArchitectureWorkflowValueKey.ChangePlan)
		if (changePlan !== undefined) {
			sections.push(STEP_9_CHANGE_PLAN_PROMPT_LINE)
		}

		sections.push(STEP_9_EXISTING_DOCUMENT_BODY_PROMPT)
	}

	if (creationRequired === true) {
		sections.push(STEP_9_NEW_DOCUMENT_REVIEW_PROMPT)
	}

	sections.push(STEP_9_FINAL_PROMPT)

	return { kind: "current_step_instruction_template", currentStepInstructionTemplate: sections.join("\n\n") }
}

export const createArchitectureWorkflowDefinition: WorkflowDefinition = {
	name: "create-architecture",
	displayName: CREATE_ARCHITECTURE_WORKFLOW_DISPLAY_NAME,
	description: CREATE_ARCHITECTURE_WORKFLOW_DESCRIPTION,
	slashCommandName: "create-architecture",
	useSkillName: "create-architecture",
	persona: CREATE_ARCHITECTURE_WORKFLOW_PERSONA,
	projectSelection: { kind: "interactive" },
	projectOutputPlacement: { kind: "selected_project_subfolder", subfolder: "planning" },
	workflowValueKeys: CREATE_ARCHITECTURE_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: {
		projectMode: CreateArchitectureWorkflowValueKey.ProjectMode,
		projectTitle: CreateArchitectureWorkflowValueKey.ProjectTitle,
		projectFolderName: CreateArchitectureWorkflowValueKey.ProjectFolderName,
	},
	entryPanel: {
		promptMarkdown: CREATE_ARCHITECTURE_WORKFLOW_DESCRIPTION,
	},
	artifacts: {
		[ARCHITECTURE_DOCUMENT_ARTIFACT_ID]: {
			id: ARCHITECTURE_DOCUMENT_ARTIFACT_ID,
			family: WorkflowArtifactFamily.ArchitectureDocument,
			intentMode: "new",
			parentIdentitySource: undefined,
			targetIdentitySource: undefined,
			outputValueKeys: {
				projectTitle: CreateArchitectureWorkflowValueKey.ProjectTitle,
				projectFolderName: CreateArchitectureWorkflowValueKey.ProjectFolderName,
				artifactFamily: CreateArchitectureWorkflowValueKey.OutputArtifactFamily,
				artifactIdentity: CreateArchitectureWorkflowValueKey.OutputArtifactIdentity,
				artifactFilename: CreateArchitectureWorkflowValueKey.OutputArtifactFilename,
				artifactRelativePath: CreateArchitectureWorkflowValueKey.OutputArtifactRelativePath,
				artifactAbsolutePath: CreateArchitectureWorkflowValueKey.OutputFile,
				parentIdentity: undefined,
				targetIdentity: undefined,
			},
		},
	},
	workflowForms: {
		[STEP_2_INPUT_FORM_ID]: buildStep2InputWorkflowForm(),
	},
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Generate Output Document",
			decisionTree: buildStep1DecisionTree(),
			buildToolSchema: buildCreateArchitectureStep1ToolSchemas,
		}),
		"step-2": createStepDefinition({
			stepNumber: 2,
			checklistLabel: "Gather User Inputs",
			decisionTree: buildStep2DecisionTree(),
			buildToolSchema: buildCreateArchitectureStep2ToolSchemas,
		}),
		"step-3": createStepDefinition({
			stepNumber: 3,
			checklistLabel: "Establish Architecture Foundational Elements",
			decisionTree: buildProgressionDecisionTree(3, 4),
			buildPromptSource: buildStep3PromptSource,
			promptTemplates: [STEP_3_PROMPT],
			buildToolSchema: buildCreateArchitectureStep3ToolSchemas,
		}),
		"step-4": createStepDefinition({
			stepNumber: 4,
			checklistLabel: "Revolve Responsibility & Ownership",
			decisionTree: buildProgressionDecisionTree(4, 5),
			buildPromptSource: buildStep4PromptSource,
			promptTemplates: [STEP_4_PROMPT],
			buildToolSchema: buildCreateArchitectureStep4ToolSchemas,
		}),
		"step-5": createStepDefinition({
			stepNumber: 5,
			checklistLabel: "Code Alignment Assessment",
			decisionTree: buildProgressionDecisionTree(5, 6),
			buildPromptSource: buildStep5PromptSource,
			promptTemplates: [STEP_5_PROMPT],
			buildToolSchema: buildCreateArchitectureStep5ToolSchemas,
		}),
		"step-6": createStepDefinition({
			stepNumber: 6,
			checklistLabel: "Identify Key Tradeoffs & Risks",
			decisionTree: buildProgressionDecisionTree(6, 7),
			buildPromptSource: buildStep6PromptSource,
			promptTemplates: [STEP_6_PROMPT],
			buildToolSchema: buildCreateArchitectureStep6ToolSchemas,
		}),
		"step-7": createStepDefinition({
			stepNumber: 7,
			checklistLabel: "Map out Blast Radius",
			decisionTree: buildProgressionDecisionTree(7, 8),
			buildPromptSource: buildStep7PromptSource,
			promptTemplates: [STEP_7_PROMPT],
			buildToolSchema: buildCreateArchitectureStep7ToolSchemas,
		}),
		"step-8": createStepDefinition({
			stepNumber: 8,
			checklistLabel: "Build Project Roadmap",
			decisionTree: buildProgressionDecisionTree(8, 9),
			buildPromptSource: buildStep8PromptSource,
			promptTemplates: [STEP_8_PROMPT],
			buildToolSchema: buildCreateArchitectureStep8ToolSchemas,
		}),
		"step-9": createStepDefinition({
			stepNumber: 9,
			checklistLabel: "Finalize Architecture Document",
			decisionTree: buildStep9DecisionTree(),
			buildPromptSource: buildStep9PromptSource,
			promptTemplates: [
				STEP_9_EXISTING_DOCUMENT_HEADER_PROMPT,
				STEP_9_CHANGE_PLAN_PROMPT_LINE,
				STEP_9_EXISTING_DOCUMENT_BODY_PROMPT,
				STEP_9_NEW_DOCUMENT_REVIEW_PROMPT,
				STEP_9_FINAL_PROMPT,
			],
			buildToolSchema: buildCreateArchitectureStep9ToolSchemas,
		}),
	},
}
