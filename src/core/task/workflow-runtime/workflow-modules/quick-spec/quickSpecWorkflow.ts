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
import { buildInitialQuickSpecDocument } from "./quickSpecDocument"
import {
	buildQuickSpecStep1ToolSchemas,
	buildQuickSpecStep2ToolSchemas,
	buildQuickSpecStep3ToolSchemas,
	buildQuickSpecStep4ToolSchemas,
} from "./quickSpecToolSchemas"

export const QUICK_SPEC_WORKFLOW_NAME = "quick-spec"
export const QUICK_SPEC_WORKFLOW_SLASH_COMMAND_NAME = "quick-spec"
export const QUICK_SPEC_WORKFLOW_USE_SKILL_NAME = "quick-spec"
export const QUICK_SPEC_WORKFLOW_DISPLAY_NAME = "quick spec"
export const QUICK_SPEC_WORKFLOW_PROJECT_SUBFOLDER = "planning"
export const QUICK_SPEC_WORKFLOW_DESCRIPTION =
	"In this workflow, the agent builds a delivery spec for a small enhancement or update. This workflow is intended for limited-scope projects. For larger projects, use the standard workflow process beginning with the Create Architecture workflow."

const QUICK_SPEC_ARTIFACT_ID = "quick_spec"
const STEP_1_INPUT_FORM_ID = "step-1-quick-spec-input-form"
const STEP_1_EXISTING_DOCUMENTATION_PANEL_ID = "step-1-existing-documentation-panel"
const STEP_1_DOCUMENTATION_FILE_PATHS_PANEL_ID = "step-1-documentation-file-paths-panel"
const STEP_1_VISION_STATEMENT_PANEL_ID = "step-1-vision-statement-panel"

export const QUICK_SPEC_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "Bob",
	role: "Scrum Master",
	identity: "A pragmatic scrum master with a background in software development",
	communicationStyle: "crisp, checklist-driven, and ambiguity-free.",
	capabilities: ["translating user vision into a delivery spec via interviews and codebase assessment"],
	principles: ["bridging the gap between stakeholder vision and product reality requires patience and diligence."],
}

export enum QuickSpecWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	AdditionalContext = "additional_context",
	VisionStatement = "vision_statement",
	OutputDocument = "output_document",
	OutputArtifactFamily = "output_artifact_family",
	OutputArtifactIdentity = "output_artifact_identity",
	OutputArtifactFilename = "output_artifact_filename",
	OutputArtifactRelativePath = "output_artifact_relative_path",
}

export const QUICK_SPEC_WORKFLOW_VALUE_KEYS: readonly QuickSpecWorkflowValueKey[] = [
	QuickSpecWorkflowValueKey.ProjectMode,
	QuickSpecWorkflowValueKey.ProjectTitle,
	QuickSpecWorkflowValueKey.ProjectFolderName,
	QuickSpecWorkflowValueKey.AdditionalContext,
	QuickSpecWorkflowValueKey.VisionStatement,
	QuickSpecWorkflowValueKey.OutputDocument,
	QuickSpecWorkflowValueKey.OutputArtifactFamily,
	QuickSpecWorkflowValueKey.OutputArtifactIdentity,
	QuickSpecWorkflowValueKey.OutputArtifactFilename,
	QuickSpecWorkflowValueKey.OutputArtifactRelativePath,
]

export const QUICK_SPEC_ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: QuickSpecWorkflowValueKey.ProjectMode,
	projectTitle: QuickSpecWorkflowValueKey.ProjectTitle,
	projectFolderName: QuickSpecWorkflowValueKey.ProjectFolderName,
}

const QUICK_SPEC_STEP_2_READ_LIST_WITH_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE = `You have been called inside a Quick Spec workflow. Your role is to assist the user in building out a delivery spec for a limited-scope project.
Read the following:
- {workflow.output_document}
- {workflow.additional_context}`

const QUICK_SPEC_STEP_2_READ_LIST_WITHOUT_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE = `You have been called inside a Quick Spec workflow. Your role is to assist the user in building out a delivery spec for a limited-scope project.
Read the following:
- {workflow.output_document}`

const QUICK_SPEC_STEP_2_MIDDLE_PROMPT_TEMPLATE = `The system generated the spec file for you from a standardized template here:
- {workflow.output_document}

The user provided a vision statement for this product update:
{workflow.vision_statement}

Review the vision statement and add it to the spec file under the "Product Vision" Heading.`

const QUICK_SPEC_STEP_2_ADDITIONAL_CONTEXT_DOCUMENT_UPDATE_SENTENCE =
	'Add the additional context provided to the spec file under the "User Context" heading.'

const QUICK_SPEC_STEP_2_FINAL_PROMPT_TEMPLATE = `Next, inform the user that the first step is to develop a buildable solution from the product vision, starting by defining the boundaries and constraints. Aid the user in defining the project's scope, boundaries, and constraints, assessing runtime code where necessary, and updating {workflow.output_document} to reflect decisions under the "Project Scope" and "Boundaries & Constraints" headings.

Once scope, boundaries, and constraints are clear, inform the user that the next step is to document any technical decisions needed to inform the solution. Identify any technical solutions relevant to the project, gain alignment from the user, then update the "Technical Decisions" section of {workflow.output_document} to reflect the approved technical decisions.

Do not touch any of the sections in the spec file beyond the "Technical Decisions" section in this step. Instructions for populating the remaining sections will be provided in later workflow steps.

Once the spec file is complete up to and including the "Technical Decisions" section, call workflow_progress_request to unlock the next step's instructions.`

const QUICK_SPEC_STEP_3_PROMPT_TEMPLATE = `The next step is to capture the solution overview based on what was added to {workflow.output_document} in step 2. Work with the user to draft an approved solution overview, then add it to the spec file under the "Solution Overview" heading.

Once the solution overview is complete, inform the user that you will scan the codebase to identify the seams which must be touched during implementation, then review runtime code & test configuration to identify all revisions necessary to deliver the intended solution. Add content to {workflow.output_document} under the "Code Map" heading indicating all surfaces which must be touched during implementation with guidance on what needs to be added, removed, or updated.

After reviewing code and populating the "Code Map" section in the spec file, notify the user that you've mapped the solution to it's implementation seams and provide them with the content you added to the "Code Map" section of the spec file. Revise or expand as needed based on their feedback before moving on. Once the use approves the code map content, move on.

Lastly, inform the user that you'll identify the correct implementation sequence based on the code map and dependencies within the codebase. Review the surfaces to be touched based on the code map, identify where dependencies exist, and populate the "Sequencing" section of {workflow.output_document} with a suggested implementation sequence. Then provide the user with the sequencing content and adjust as needed based on their feedback.

Once the user approves the content under the spec file's "Sequencing" heading, call workflow_progress_request to unlock the next workflow step's instructions.`

const QUICK_SPEC_STEP_4_PROMPT_TEMPLATE = `Next, inform the user that the next step is to divide the work into tightly-scoped seams if needed to make identifying tasks and subtasks easier later. Offer to review what has been captured so far and provide a recommendation. 

*** Determine Task-Discovery Strategy ***
Review {workflow.output_document}, perform any code review necessary (limiting this to only where it is truly necessary) then decide whether this work should be planned as a single story or divided into separate stories.

Keep the work as a single phase when:
- the implementation can be understood as one coherent change slice
- the required revisions cannot be divided into compile-safe chunks
- the affected code follows one primary execution path or one tightly-coupled vertical slice
- likely file touches, tests, typing changes, and wiring impacts can be understood together without separate investigations
- one bounded \`Tasks / Subtasks\` plan can be authored without splitting file ownership or seam boundaries

Break the work into multiple phases when:
- there are 2 or more independently traceable implementation slices
- the work can be divided into compile-safe chunks
- different layers or subsystems require separate repo exploration
- different task groups would naturally require different allowed-files boundaries
- one seam can be analyzed and planned without reading the others in full
- keeping the work as one seam would force broad repo exploration before executable task blocks can be written

Do not break work into multiple phases if the split would create overlapping file ownership, duplicate investigation, or artificial task boundaries.

Share your recommendation for how this project should be divided into implementation phases (if at all), then capture the phase(s) under the "implementation phases" heading in {workflow.output_document}.

Next, inform the user that you will use subagents to quickly identify the exact steps necessary to execute this project, including file and line targets. Then, launch a subagent for each phase, up to four subagents at a time. Provide the spec file's file path to each subagent ({workflow.output_document}) and provide them with clear direction regarding the phase they are assigned to.
Subagents must:
- Confirm the exact runtime code and test revisions necessary to deliver their assigned phase
- Identify the exact code revisions necessary during implementation
- Trace relevant seams end-to-end
- Assess types, interfaces, schemas, validators, imports, and exports to ensure comprehensive task coverage
- Respond with a full set of required revisions including full file path for target files

Once subagents have delivered their output to you, use their responses to build out the implementation phase(s) under the spec file's "Implementation Phases" heading, following these rules exactly:

ACCEPTANCE CRITERIA TRACE:
For each requirement, identify
- Exact required behavior.
- Exact user-facing, terminal-error, panel, option, tool, or schema text
- Required persisted values, artifacts, routes, actions, fixtures, and validation coverage.
- Owning runtime, module, test, documentation, and validation files.

LIVE CONTRACT INSPECTION:
For each affected file, verify the live contract before drafting subtasks:
- Existing imports and exports.
- Helper names, signatures, return types, and call sites.
- Type definitions, discriminated unions, required fields, and narrowing requirements.
- Constructor, method, action, route, event, session, and fixture object shapes.
- Existing assertions and validation commands.
- Existing files and exact paths for every command.
Every referenced symbol must be classified as one of:
- Existing symbol verified in live code.
- New symbol created earlier in the same phase.
- Invalid and requiring rewrite before the plan can be used.

CONFIRM IMPLEMENTATION METHOD:
Use the content in the spec file and any available repo documentation (readmes, etc) to determine the approved implementation method.
If more than one implementation method is viable and the approved documents do not clearly select one, stop and ask the user to choose.
Do not invent architecture, compatibility bridges, aliases, fallback paths, or legacy preservation unless requirements explicitly approve them.

DRAFT TASKS & SUBTASKS:
Tasks and subtasks must be sequentially numbered.
Tasks may summarize a file or capability area. Subtasks must prescribe exact changes.
Each task or subtask must include:
- Full target file path.
- Allowed files list.
- One exact prescribed revision unless subordinate subtasks split the work.
- Exact imports to add or remove.
- Exact helper/function/type/object shape.
- Exact required narrowing before union-field access.
- Exact fixture/session/action/event shape.
- Exact assertions for stable machine-consumed contracts.
- Exact raw-placeholder negative assertions for required prompt placeholders.
- Exact cleanup of now-unused imports, helpers, exports, fixtures, assertions, and validation guards.

Do not use vague phrases such as:
- "all helpers"
- "matching sibling pattern"
- "equivalent shape"
- "update tests"
- "as needed"
- "fixture like the existing one"
- "all exported constants"
- "each static branch template"
Name every symbol, constant, fixture, assertion, and command exactly.

DELTA FALLOUT PASS:
After drafting each task, inspect the consequences of every prescribed change.
For every deletion, replacement, de-parameterization, signature change, type change, or removed call site, prescribe cleanup for:
- Now-unused imports.
- Dead helpers.
- Dead exports.
- Stale fixture fields.
- Stale test assertions.
- Stale validation guards.
- Scope-diff allowlists.
Validation commands do not replace this pass. It is a guide violation to rely on typecheck, lint, or implementation-time discovery to find fallout.

DRAFT VALIDATION:
Validation must be exact and repo-supported.
Include:
- Focused tests for touched runtime and test layers.
- Typecheck.
- Lint or formatting gate required by the repo.
- Package/build validation when required by project guidance.
- Static guards only for approved forbidden legacy concepts or regression risks.
- Scope diff using both \`git diff --name-only\` and \`git ls-files --others --exclude-standard\`.
If a command path does not exist, rewrite the validation command before completing the plan.

COMPLIANCE MATRIX:
Before reporting completion, audit every task and subtask with this matrix:

| Task/Subtask | Requirement Source | Target File | Symbols Verified | Live Contract Verified | Fallout Cleanup Prescribed | Validation Coverage |
| --- | --- | --- | --- | --- | --- | --- |

Every row must be complete. If any row requires inference by the implementing agent, rewrite the task or subtask.

DEV AGENT INSTRUCTIONS:
Add this exact content to the "Dev Agent Instructions" section of {workflow.output_document}. Do not paraphrase or invent additional instructions.
Required instructions:
- Read this plan from top to bottom before making any changes.
- Read each task and subtask in full immediately before executing it.
- Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.
  - Exception: You may execute multiple sequential subtasks with one patch only if they are scoped to the same file, but must review each subtask vs the landed code after the patch to ensure that every subtask was implemented exactly as prescribed before marking the subtask as complete.
  - After completing a task or subtask, update that step's checkbox from "[ ]" to "[x]".
- Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
- Do not edit any file not listed in the current step's allowed-files list.
- If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.
- Implement tasks and subtasks exactly as instructed. If deviation seems necessary, stop, inform the user, and explain why you believe the task or subtask should be carried out differently than prescribed.

FINAL VALIDATION
After authoring the tasks & subtasks, dispatch a subagent to validate that the spec is fully compliant and implementation-ready.
You must provide the subagent with this exact prompt (no paraphrasing or alterations of any kind):
Skill: use_skill('validate-story') Your task is to validate the implementation spec I've just drafted to ensure that it is implementation-ready. You will receive separate workflow instructions which provide exact guidance regarding validation procedure. Complete the validation per the instructions, then respond to me using attempt_completion with your findings. In your response, you must include the exact task and/or subtask numbers for any items which have issues that I need to address.

Once the subagent completes their validation & provides you with their findings, address any issues they've identified. If the subagent identified issues, correct them in the document, shut down the subagent, and repeat the subagent validation process with a fresh subagent. Repeat this process until a subagent completes validation with no findings.

Once you've authored the implementation phases, added the required Dev Instructions, and received a clear validation report from a subagent, call attempt_completion to notify the user that the spec is ready for implementation, and that validation was successfully conducted by a subagent running the Validate Story workflow.`
function buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"] {
	return {
		type: "conditional",
		conditionSourceKey: "__terminal__",
		branches: [],
		defaultTerminal: true,
	}
}

function buildStep1InputWorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Gather Context & Generate Spec Document",
		toolDictionaryTitle: "Gather Context & Generate Spec Document",
		toolDictionaryMarkdown: QUICK_SPEC_WORKFLOW_DESCRIPTION,
		firstPanelId: STEP_1_EXISTING_DOCUMENTATION_PANEL_ID,
		panels: {
			[STEP_1_EXISTING_DOCUMENTATION_PANEL_ID]: {
				panelId: STEP_1_EXISTING_DOCUMENTATION_PANEL_ID,
				title: "Existing Documentation",
				promptMarkdown: "Would you like to provide any existing documentation as context?",
				fields: [
					{
						key: "has_existing_documentation",
						kind: "boolean",
						label: "Existing Documentation",
						required: true,
						allowedValueType: "boolean",
						trueLabel: "yes",
						falseLabel: "no",
					},
				],
				allowedActions: ["submit"],
				actionLabels: { submit: "continue" },
				transition: {
					type: "conditional",
					conditionSourceKey: "has_existing_documentation",
					branches: [
						{
							matchValue: true,
							nextPanelId: STEP_1_DOCUMENTATION_FILE_PATHS_PANEL_ID,
						},
						{
							matchValue: false,
							nextPanelId: STEP_1_VISION_STATEMENT_PANEL_ID,
							staleValueKeysToClear: [QuickSpecWorkflowValueKey.AdditionalContext],
						},
					],
					defaultNextPanelId: STEP_1_VISION_STATEMENT_PANEL_ID,
				},
			},
			[STEP_1_DOCUMENTATION_FILE_PATHS_PANEL_ID]: {
				panelId: STEP_1_DOCUMENTATION_FILE_PATHS_PANEL_ID,
				title: "Documentation File Paths",
				promptMarkdown: "Please provide the full file path(s) for any documentation you'd like to use as context.",
				fields: [
					{
						key: QuickSpecWorkflowValueKey.AdditionalContext,
						workflowValueKey: QuickSpecWorkflowValueKey.AdditionalContext,
						kind: "large_text",
						label: "Documentation File Paths",
						required: true,
						allowedValueType: "string",
						presentation: { textareaSize: "large" },
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: { submit: "continue", back: "back" },
				backDestinationPanelId: STEP_1_EXISTING_DOCUMENTATION_PANEL_ID,
				transition: {
					type: "sequential",
					nextPanelId: STEP_1_VISION_STATEMENT_PANEL_ID,
				},
			},
			[STEP_1_VISION_STATEMENT_PANEL_ID]: {
				panelId: STEP_1_VISION_STATEMENT_PANEL_ID,
				title: "Vision Statement",
				promptMarkdown: "Please describe what you'd like to achieve with this update.",
				fields: [
					{
						key: QuickSpecWorkflowValueKey.VisionStatement,
						workflowValueKey: QuickSpecWorkflowValueKey.VisionStatement,
						kind: "large_text",
						label: "Vision Statement",
						required: true,
						allowedValueType: "string",
						presentation: { textareaSize: "large" },
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: { submit: "Continue", back: "Back" },
				backDestinationPanelId: STEP_1_EXISTING_DOCUMENTATION_PANEL_ID,
				transition: buildTerminalTransition(),
			},
		},
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
					artifactResolution.artifactId === QUICK_SPEC_ARTIFACT_ID &&
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

function attemptCompletionSucceeded(): WorkflowDecisionBranchTrigger {
	return {
		kind: "on_event",
		eventKind: "attempt_completion_succeeded",
	}
}

function readTrimmedWorkflowStringValue(input: WorkflowPromptBuilderInput, key: QuickSpecWorkflowValueKey): string | undefined {
	const value = input.session.workflowValues[key]
	if (typeof value !== "string") {
		return undefined
	}

	const trimmedValue = value.trim()
	if (trimmedValue.length === 0) {
		return undefined
	}

	return trimmedValue
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
							artifactId: QUICK_SPEC_ARTIFACT_ID,
						},
						followingBranchId: "step-1-await-allocation",
					},
					{
						id: "step-1-render-existing-artifact-input-form",
						trigger: entryArtifactResolutionCompletedWithCreationRequired(false),
						action: {
							kind: "render_workflow_form",
							workflowFormId: STEP_1_INPUT_FORM_ID,
							startPanelId: STEP_1_EXISTING_DOCUMENTATION_PANEL_ID,
						},
						followingBranchId: "step-1-await-input-form",
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
								artifactId: QUICK_SPEC_ARTIFACT_ID,
								buildContent: buildInitialQuickSpecDocument,
							},
						},
						followingBranchId: "step-1-await-initial-shell",
					},
					{
						id: "step-1-retry-allocate-artifact",
						trigger: toolBackedOperationFailed("step-1-resolve-entry-artifact", "step-1-allocate-artifact"),
						action: {
							kind: "allocate_artifact",
							artifactId: QUICK_SPEC_ARTIFACT_ID,
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
								artifactId: QUICK_SPEC_ARTIFACT_ID,
								buildContent: buildInitialQuickSpecDocument,
							},
						},
						followingBranchId: "step-1-await-initial-shell",
					},
					{
						id: "step-1-terminal-error-after-retry-allocation",
						trigger: toolBackedOperationFailed("step-1-await-allocation", "step-1-retry-allocate-artifact"),
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to allocate quick-spec.md after retrying artifact creation.",
						},
					},
				],
			},
			"step-1-await-initial-shell": {
				id: "step-1-await-initial-shell",
				routes: [
					{
						id: "step-1-render-input-form",
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
							kind: "render_workflow_form",
							workflowFormId: STEP_1_INPUT_FORM_ID,
							startPanelId: STEP_1_EXISTING_DOCUMENTATION_PANEL_ID,
						},
						followingBranchId: "step-1-await-input-form",
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
							errorMessage: "Unable to initialize quick-spec.md.",
						},
					},
				],
			},
			"step-1-await-input-form": {
				id: "step-1-await-input-form",
				routes: [
					{
						id: "step-1-transition-to-step-2",
						trigger: workflowFormCompleted(STEP_1_INPUT_FORM_ID),
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
		},
	}
}

function buildProgressGatedDecisionTree(nextStepNumber: number): WorkflowDecisionTree {
	return {
		entryBranchId: "project-prompt",
		branches: {
			"project-prompt": {
				id: "project-prompt",
				routes: [
					{
						id: "project-prompt",
						trigger: { kind: "always" },
						action: { kind: "project_prompt" },
						followingBranchId: "await-progress-request",
					},
				],
			},
			"await-progress-request": {
				id: "await-progress-request",
				routes: [
					{
						id: "progress-confirmed",
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
						id: "progress-denied",
						trigger: workflowProgressRequestDenied(),
						action: { kind: "project_prompt" },
						followingBranchId: "await-progress-request",
					},
				],
			},
		},
	}
}

function buildStep4DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "project-prompt",
		branches: {
			"project-prompt": {
				id: "project-prompt",
				routes: [
					{
						id: "project-prompt",
						trigger: { kind: "always" },
						action: { kind: "project_prompt" },
						followingBranchId: "step-4-await-attempt-completion",
					},
				],
			},
			"step-4-await-attempt-completion": {
				id: "step-4-await-attempt-completion",
				routes: [
					{
						id: "step-4-complete-after-attempt-completion",
						trigger: attemptCompletionSucceeded(),
						action: { kind: "complete_workflow" },
					},
				],
			},
		},
	}
}

function buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const hasAdditionalContext = readTrimmedWorkflowStringValue(input, QuickSpecWorkflowValueKey.AdditionalContext) !== undefined
	const sections: string[] = []

	sections.push(
		hasAdditionalContext
			? QUICK_SPEC_STEP_2_READ_LIST_WITH_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE
			: QUICK_SPEC_STEP_2_READ_LIST_WITHOUT_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE,
	)
	sections.push(QUICK_SPEC_STEP_2_MIDDLE_PROMPT_TEMPLATE)
	if (hasAdditionalContext) {
		sections.push(QUICK_SPEC_STEP_2_ADDITIONAL_CONTEXT_DOCUMENT_UPDATE_SENTENCE)
	}
	sections.push(QUICK_SPEC_STEP_2_FINAL_PROMPT_TEMPLATE)

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: sections.join("\n\n"),
	}
}

function buildStaticPromptSource(template: string): WorkflowStepDefinition["buildPromptSource"] {
	return () => ({
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: template,
	})
}

export const quickSpecWorkflowDefinition: WorkflowDefinition = {
	name: QUICK_SPEC_WORKFLOW_NAME,
	displayName: QUICK_SPEC_WORKFLOW_DISPLAY_NAME,
	description: QUICK_SPEC_WORKFLOW_DESCRIPTION,
	slashCommandName: QUICK_SPEC_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: QUICK_SPEC_WORKFLOW_USE_SKILL_NAME,
	persona: QUICK_SPEC_WORKFLOW_PERSONA,
	projectSubfolder: QUICK_SPEC_WORKFLOW_PROJECT_SUBFOLDER,
	workflowValueKeys: QUICK_SPEC_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: QUICK_SPEC_ENTRY_PROJECT_VALUE_KEYS,
	entryPanel: { promptMarkdown: QUICK_SPEC_WORKFLOW_DESCRIPTION },
	workflowForms: {
		[STEP_1_INPUT_FORM_ID]: buildStep1InputWorkflowForm(),
	},
	artifacts: {
		[QUICK_SPEC_ARTIFACT_ID]: {
			id: QUICK_SPEC_ARTIFACT_ID,
			family: WorkflowArtifactFamily.QuickSpec,
			intentMode: "new",
			parentIdentitySource: undefined,
			targetIdentitySource: undefined,
			outputValueKeys: {
				projectTitle: QuickSpecWorkflowValueKey.ProjectTitle,
				projectFolderName: QuickSpecWorkflowValueKey.ProjectFolderName,
				artifactFamily: QuickSpecWorkflowValueKey.OutputArtifactFamily,
				artifactIdentity: QuickSpecWorkflowValueKey.OutputArtifactIdentity,
				artifactFilename: QuickSpecWorkflowValueKey.OutputArtifactFilename,
				artifactRelativePath: QuickSpecWorkflowValueKey.OutputArtifactRelativePath,
				artifactAbsolutePath: QuickSpecWorkflowValueKey.OutputDocument,
				parentIdentity: undefined,
				targetIdentity: undefined,
			},
		},
	},
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Gather Context & Generate Spec Document",
			decisionTree: buildStep1DecisionTree(),
			buildToolSchema: buildQuickSpecStep1ToolSchemas,
		}),
		"step-2": createStepDefinition({
			stepNumber: 2,
			checklistLabel: "Assess Vision & Develop Solution Foundation",
			decisionTree: buildProgressGatedDecisionTree(3),
			buildPromptSource: buildStep2PromptSource,
			buildToolSchema: buildQuickSpecStep2ToolSchemas,
			promptTemplates: [
				QUICK_SPEC_STEP_2_READ_LIST_WITH_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE,
				QUICK_SPEC_STEP_2_READ_LIST_WITHOUT_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE,
				QUICK_SPEC_STEP_2_MIDDLE_PROMPT_TEMPLATE,
				QUICK_SPEC_STEP_2_ADDITIONAL_CONTEXT_DOCUMENT_UPDATE_SENTENCE,
				QUICK_SPEC_STEP_2_FINAL_PROMPT_TEMPLATE,
			],
		}),
		"step-3": createStepDefinition({
			stepNumber: 3,
			checklistLabel: "Finalize Solution & Implementation Spec",
			decisionTree: buildProgressGatedDecisionTree(4),
			buildPromptSource: buildStaticPromptSource(QUICK_SPEC_STEP_3_PROMPT_TEMPLATE),
			buildToolSchema: buildQuickSpecStep3ToolSchemas,
			promptTemplates: [QUICK_SPEC_STEP_3_PROMPT_TEMPLATE],
		}),
		"step-4": createStepDefinition({
			stepNumber: 4,
			checklistLabel: "Generate Implementation Details",
			decisionTree: buildStep4DecisionTree(),
			buildPromptSource: buildStaticPromptSource(QUICK_SPEC_STEP_4_PROMPT_TEMPLATE),
			buildToolSchema: buildQuickSpecStep4ToolSchemas,
			promptTemplates: [QUICK_SPEC_STEP_4_PROMPT_TEMPLATE],
		}),
	},
}
