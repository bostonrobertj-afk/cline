import type { WorkflowFormDefinitionPayload } from "@shared/ExtensionMessage"
import { WorkflowArtifactFamily } from "../../artifactFamilies"
import type {
	WorkflowDecisionBranchTrigger,
	WorkflowDecisionTree,
	WorkflowDefinition,
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
	HasContextFiles = "has_context_files",
	ContextFiles = "context_files",
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
	CreateArchitectureWorkflowValueKey.HasContextFiles,
	CreateArchitectureWorkflowValueKey.ContextFiles,
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

const STEP_3_PROMPT = `Read \`{output_file}\`.

Use any files listed in the Relevant Context section when they would help ground the architecture.

Draft and propose content for Project Context Analysis. After the user approves it, save the approved content to \`{output_file}\`.

Review Scope, Architectural goals, and Core architectural rules for sufficiency. If any section is vague, overly broad, or insufficient for the remaining architecture work, ask the user for clarification or improvement and save approved refinements to \`{output_file}\`.

Draft and propose content for Interpretation. After the user approves it, save the approved content to \`{output_file}\`.

After approved interpretation content has been saved, use \`workflow_progress_request\` to confirm and unlock the next workflow step.`

const STEP_4_PROMPT = `Read \`{output_file}\`.

Guide the user through documenting Responsibility Boundaries, Durable vs Transient Ownership, and Required Additional Baseline for Authority Enforcement.

Refer to relevant context, runtime code, and tests frequently so the content stays grounded in the project reality.

Draft, discuss, and refine the content with the user. Save approved content under the matching headings in \`{output_file}\`.

Once the user is aligned with the saved content, use \`workflow_progress_request\` to confirm and unlock the next workflow step.`

const STEP_5_PROMPT = `Read \`{output_file}\`.

Tell the user that you will assess the current runtime code and tests for alignment with the intended architecture.

Perform a thorough repository assessment using code and test files. Write findings under Aligned, Partially aligned, and Not aligned / conflicts in \`{output_file}\`.

Brief the user on the findings. Answer questions, revise the assessment when needed, and save approved changes to \`{output_file}\`.

Once the user approves the assessment content, use \`workflow_progress_request\` to confirm and unlock the next workflow step.`

const STEP_6_PROMPT = `Read \`{output_file}\` and identify key tradeoffs and risks from the current architecture content.

Perform additional code assessment if needed to keep the tradeoffs and risks concrete.

Propose draft content for Tradeoffs and Risks, refine it based on user feedback, and save approved final content under the matching headings in \`{output_file}\`.

Once Tradeoffs and Risks are populated with approved content, use \`workflow_progress_request\` to confirm and unlock the next workflow step.`

const STEP_7_PROMPT = `Read \`{output_file}\`.

Draft a comprehensive project blast radius. Include files, modules, directories, shared components, and integration boundaries.

Propose the blast radius to the user, adjust based on feedback, and save approved content under Project Blast Radius in \`{output_file}\`.

Once Project Blast Radius is populated with approved content, use \`workflow_progress_request\` to confirm and unlock the next workflow step.`

const STEP_8_PROMPT = `Read \`{output_file}\`.

Identify key dependencies that will matter during project implementation. Present those dependencies to the user, adjust based on feedback, and save approved dependencies under Dependencies in \`{output_file}\`.

Build an implementation roadmap establishing high-level project implementation sequencing based on dependencies and blast radius. Present the roadmap to the user, adjust based on feedback, and save approved roadmap content under Project Roadmap in \`{output_file}\`.

Once Dependencies and Project Roadmap are populated with approved content, use \`workflow_progress_request\` to confirm and unlock the final workflow step.`

const STEP_9_PROMPT = `Read and review the full architecture in \`{output_file}\` for coherence, pattern alignment, and structure alignment.

Classify issues as critical, important, or minor.

If critical issues exist, present them to the user and ask how they want to resolve them before implementation.

If important or minor issues exist, present them as refinements and ask whether to address them now.

When the document is ready, use \`attempt_completion\` to present a short completion summary. In that summary, explain that the architecture document is now the technical source of truth and is ready to inform the create-epics workflow.`

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

function workflowFormCompleted(workflowFormId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_form_completed" && triggerEvent.workflowFormId === workflowFormId,
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

function replaceOutputFilePlaceholder(input: WorkflowPromptBuilderInput, prompt: string): string {
	const outputFileValue = input.session.workflowValues[CreateArchitectureWorkflowValueKey.OutputFile]
	if (outputFileValue === undefined) {
		return prompt.replace(/\{output_file\}/g, input.renderWorkflowValue(CreateArchitectureWorkflowValueKey.OutputFile))
	}

	return prompt.replace(/\{output_file\}/g, input.renderWorkflowValue(outputFileValue))
}

function createEmptyPromptSource(): WorkflowStepPromptSource {
	return {}
}

function createStepDefinition(args: {
	stepNumber: number
	checklistLabel: string
	decisionTree: WorkflowDecisionTree
	buildPromptSource?: WorkflowStepDefinition["buildPromptSource"]
	buildToolSchema: WorkflowStepDefinition["buildToolSchema"]
}): WorkflowStepDefinition {
	return {
		id: `step-${args.stepNumber}`,
		stepNumber: args.stepNumber,
		checklistLabel: args.checklistLabel,
		buildPromptSource: args.buildPromptSource ?? createEmptyPromptSource,
		buildToolSchema: args.buildToolSchema,
		decisionTree: args.decisionTree,
	}
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
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 3,
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
						id: "step-2-render-input-form",
						trigger: { kind: "always" },
						action: {
							kind: "render_workflow_form",
							workflowFormId: STEP_2_INPUT_FORM_ID,
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
						trigger: workflowFormCompleted(STEP_2_INPUT_FORM_ID),
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: ARCHITECTURE_DOCUMENT_ARTIFACT_ID,
								buildContent: buildCreateArchitectureDocumentFromSession,
							},
						},
						followingBranchId: "step-2-await-submitted-values-document",
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

function buildStep3PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	return {
		currentStepInstructions: replaceOutputFilePlaceholder(input, STEP_3_PROMPT),
	}
}

function buildStep4PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	return {
		currentStepInstructions: replaceOutputFilePlaceholder(input, STEP_4_PROMPT),
	}
}

function buildStep5PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	return {
		currentStepInstructions: replaceOutputFilePlaceholder(input, STEP_5_PROMPT),
	}
}

function buildStep6PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	return {
		currentStepInstructions: replaceOutputFilePlaceholder(input, STEP_6_PROMPT),
	}
}

function buildStep7PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	return {
		currentStepInstructions: replaceOutputFilePlaceholder(input, STEP_7_PROMPT),
	}
}

function buildStep8PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	return {
		currentStepInstructions: replaceOutputFilePlaceholder(input, STEP_8_PROMPT),
	}
}

function buildStep9PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	return {
		currentStepInstructions: replaceOutputFilePlaceholder(input, STEP_9_PROMPT),
	}
}

export const createArchitectureWorkflowDefinition: WorkflowDefinition = {
	name: "create-architecture",
	displayName: CREATE_ARCHITECTURE_WORKFLOW_DISPLAY_NAME,
	description: CREATE_ARCHITECTURE_WORKFLOW_DESCRIPTION,
	slashCommandName: "create-architecture",
	useSkillName: "create-architecture",
	persona: CREATE_ARCHITECTURE_WORKFLOW_PERSONA,
	projectSubfolder: "planning",
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
			buildToolSchema: buildCreateArchitectureStep3ToolSchemas,
		}),
		"step-4": createStepDefinition({
			stepNumber: 4,
			checklistLabel: "Revolve Responsibility & Ownership",
			decisionTree: buildProgressionDecisionTree(4, 5),
			buildPromptSource: buildStep4PromptSource,
			buildToolSchema: buildCreateArchitectureStep4ToolSchemas,
		}),
		"step-5": createStepDefinition({
			stepNumber: 5,
			checklistLabel: "Code Alignment Assessment",
			decisionTree: buildProgressionDecisionTree(5, 6),
			buildPromptSource: buildStep5PromptSource,
			buildToolSchema: buildCreateArchitectureStep5ToolSchemas,
		}),
		"step-6": createStepDefinition({
			stepNumber: 6,
			checklistLabel: "Identify Key Tradeoffs & Risks",
			decisionTree: buildProgressionDecisionTree(6, 7),
			buildPromptSource: buildStep6PromptSource,
			buildToolSchema: buildCreateArchitectureStep6ToolSchemas,
		}),
		"step-7": createStepDefinition({
			stepNumber: 7,
			checklistLabel: "Map out Blast Radius",
			decisionTree: buildProgressionDecisionTree(7, 8),
			buildPromptSource: buildStep7PromptSource,
			buildToolSchema: buildCreateArchitectureStep7ToolSchemas,
		}),
		"step-8": createStepDefinition({
			stepNumber: 8,
			checklistLabel: "Build Project Roadmap",
			decisionTree: buildProgressionDecisionTree(8, 9),
			buildPromptSource: buildStep8PromptSource,
			buildToolSchema: buildCreateArchitectureStep8ToolSchemas,
		}),
		"step-9": createStepDefinition({
			stepNumber: 9,
			checklistLabel: "Finalize Architecture Document",
			decisionTree: buildStep9DecisionTree(),
			buildPromptSource: buildStep9PromptSource,
			buildToolSchema: buildCreateArchitectureStep9ToolSchemas,
		}),
	},
}
