import type { WorkflowFormDefinitionPayload } from "@shared/ExtensionMessage"
import type {
	WorkflowDecisionBranchTrigger,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowPersonaDefinition,
	WorkflowStepDefinition,
	WorkflowStepPromptSource,
} from "../../types"
import { buildQuickReviewStep1ToolSchemas, buildQuickReviewStep2ToolSchemas } from "./quickReviewToolSchemas"

export const QUICK_REVIEW_WORKFLOW_NAME = "quick-review"
export const QUICK_REVIEW_WORKFLOW_DISPLAY_NAME = "quick review"
export const QUICK_REVIEW_WORKFLOW_SLASH_COMMAND_NAME = "quick-review"
export const QUICK_REVIEW_WORKFLOW_USE_SKILL_NAME = "quick-review"
export const QUICK_REVIEW_WORKFLOW_PROJECT_SUBFOLDER = "review"

export const QUICK_REVIEW_WORKFLOW_DESCRIPTION =
	"This workflow performs a thorough assessment of a completed implementation spec to ensure that the prescribed updates were implemented correctly. You should only run this workflow after a phase within an implementation spec has been implemented via the Quick Dev workflow, and the files touched during implementation have been staged and committed."

export const QUICK_REVIEW_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "Fred",
	role: "Quality Control",
	identity:
		"Coordinates quality review after implementation to ensure that code is functional and compliant before it ships to production.",
	capabilities: ["QA findings triage & documentation"],
	communicationStyle: "precise and detailed",
	principles: ["lazily formatted and noncompliant code must never hit the production environment."],
}

export enum QuickReviewWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	SpecFile = "spec_file",
	CommitHash = "commit_hash",
}

export const QUICK_REVIEW_WORKFLOW_VALUE_KEYS: readonly QuickReviewWorkflowValueKey[] = [
	QuickReviewWorkflowValueKey.ProjectMode,
	QuickReviewWorkflowValueKey.ProjectTitle,
	QuickReviewWorkflowValueKey.ProjectFolderName,
	QuickReviewWorkflowValueKey.SpecFile,
	QuickReviewWorkflowValueKey.CommitHash,
]

export const QUICK_REVIEW_ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: QuickReviewWorkflowValueKey.ProjectMode,
	projectTitle: QuickReviewWorkflowValueKey.ProjectTitle,
	projectFolderName: QuickReviewWorkflowValueKey.ProjectFolderName,
}

export const QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID = QuickReviewWorkflowValueKey.SpecFile
export const QUICK_REVIEW_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]> = {
	[QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID]: {
		id: QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID,
		requirement: "required",
		producingWorkflowName: "quick-spec",
		projectSubfolderSegments: ["review"],
		match: { kind: "exact_filename", filename: "quick-spec.md" },
		workflowValueKey: QuickReviewWorkflowValueKey.SpecFile,
		outputDocumentReference: "none",
	},
}

export const QUICK_REVIEW_STEP_1_FORM_ID = "step-1-quick-review-commit-form"
export const QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID = "step-1-panel-a-commit-hash"
export const QUICK_REVIEW_COMMIT_HASH_FIELD_KEY = "commit_hash"

function buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"] {
	return {
		type: "conditional",
		conditionSourceKey: "__terminal__",
		branches: [],
		defaultTerminal: true,
	}
}

export function buildQuickReviewStep1WorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Quick Review",
		toolDictionaryTitle: "Quick Review",
		toolDictionaryMarkdown:
			'You can get the commit hash by opening the github pane, ensuring "graph" is enabled, and right-clicking on the commit from the phase\'s implementation.',
		firstPanelId: QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
		panels: {
			[QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID]: {
				panelId: QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
				title: "Commit Hash",
				promptMarkdown: "Please provide the commit hash for the phase to be reviewed",
				fields: [
					{
						key: QUICK_REVIEW_COMMIT_HASH_FIELD_KEY,
						workflowValueKey: QuickReviewWorkflowValueKey.CommitHash,
						kind: "small_text",
						label: "commit hash",
						required: true,
						allowedValueType: "string",
					},
				],
				allowedActions: ["submit"],
				actionLabels: { submit: "continue" },
				transition: buildTerminalTransition(),
			},
		},
	}
}

function createEmptyPromptSource(): WorkflowStepPromptSource {
	return { kind: "none" }
}

function createStepDefinition(args: {
	stepNumber: 1 | 2
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

export const QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE = `You have been called inside a review workflow to ensure that an implemented project phase meets quality standards, was implemented as prescribed, and meets expectations for performance and functionality.
Identify the last-completed phase in the implementation spec and ask the user to confirm that your review should focus on that phase.
Implementation Spec: {workflow.spec_file}
Commit hash for the completed phase: {workflow.commit_hash}

Perform a line-by-line validation of tasks and subtasks within the assigned phase. For each task/subtask, verify that the prescribed revisions were implemented as intended by directly reviewing the relevant runtime code and tests. Do not rely on test outcomes alone; assess the code configuration associated with each task/subtask directly. If needed you can use CLI commands with the provided commit hash to identify the revisions made during phase implementation.

Next, ensure that the tasks/subtasks and their associated revisions did not miss any edge cases by performing the following analysis:

Identify every changed file, changed symbol, changed workflow value, changed tool/schema contract, changed route/action, changed persisted artifact, changed test fixture, changed validation path, changed UI surface, or changed configuration surface described by the review scope.

For each changed item, trace outward to the adjacent surfaces that could be affected:
   - callers and callees
   - imports and exports
   - type definitions and discriminated unions
   - schema builders and tool handlers
   - runtime routing and workflow values
   - persisted files, artifact metadata, and cleanup paths
   - prompt projection and continuation behavior
   - validation, error handling, retry, and terminal-error paths
   - tests and fixtures that claim to cover the behavior

Walk the boundary paths for each changed or adjacent surface. Focus on edges where values, states, files, or control flow transition:
   - missing else/default branches
   - null, empty, malformed, duplicate, stale, or missing values
   - renamed, moved, copied, or deleted files
   - partial success, retry, rollback, cancellation, timeout, or failed cleanup
   - ordering dependencies between route actions
   - stale cache, stale workflow values, or un-cleared session state
   - incompatible old callers, persisted data, or restored sessions
   - changed tests that no longer match runtime behavior

Ask, for each boundary path: “Does the current implementation actually handle this path?” Verify using the changed code and narrowly relevant adjacent code. Do not assume coverage from intent, naming, or happy-path tests.

Ask, for each changed item: “What nearby file, registration, type, schema, route, prompt, fixture, or cleanup path should have changed with this, but did not?” Treat missing adjacent updates as findings when supported by evidence.

Once review is complete, do the following:
1. Add your findings (if any) to {workflow.spec_file} at the bottom of the file with a markdown heading identifying the phase they pertain to. For each finding, include:
    - finding: a short title
    - description: a detailed explanation including:
     - what is wrong
     - the trigger condition
     - the likely consequence if not addressed
     - exact supporting code location with file path, start line, and end line for the smallest supporting line range
     - if the finding depends on multiple non-contiguous locations, include each cited location
     - what the cited code proves
2. Reopen, edit, delete, or add tasks and subtasks to the reviewed phase as needed so that a dev agent can take action based on your findings. Do not make code or test changes yourself. Do not make changes to the implementation spec beyond the task and/or subtask revisions necessary based on your findings.
3. Call attempt_completion and include:
    - A summary of your findings or statement that QA passed without findings
    - A summary of any changes made to the target phase based on findings, if applicable
    - A reminder to return to the dev agent who implemented the reviewed phase to complete new and reopened tasks/ subtasks, if applicable
    - A reminder to run the Quick Dev workflow in a fresh conversation thread for the next incomplete phase, if applicable (no findings and there are additional incomplete phases in {workflow.spec_file})

 #### workflow must end on successful use of attempt_completion`

function buildStep2PromptSource(): WorkflowStepPromptSource {
	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE,
	}
}

function workflowFormCompleted(workflowFormId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_form_completed" && triggerEvent.workflowFormId === workflowFormId,
	}
}

function attemptCompletionSucceeded(): WorkflowDecisionBranchTrigger {
	return { kind: "on_event", eventKind: "attempt_completion_succeeded" }
}

function buildStep1DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-1-resolve-spec-file",
		branches: {
			"step-1-resolve-spec-file": {
				id: "step-1-resolve-spec-file",
				routes: [
					{
						id: "step-1-resolve-spec-file",
						trigger: { kind: "always" },
						action: {
							kind: "resolve_prerequisite_files",
							prerequisiteIds: [QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID],
						},
						followingBranchId: "step-1-render-commit-hash-form",
					},
				],
			},
			"step-1-render-commit-hash-form": {
				id: "step-1-render-commit-hash-form",
				routes: [
					{
						id: "step-1-render-commit-hash-form",
						trigger: { kind: "always" },
						action: {
							kind: "render_workflow_form",
							workflowFormId: QUICK_REVIEW_STEP_1_FORM_ID,
							startPanelId: QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
						},
						followingBranchId: "step-1-await-commit-hash-form",
					},
				],
			},
			"step-1-await-commit-hash-form": {
				id: "step-1-await-commit-hash-form",
				routes: [
					{
						id: "step-1-transition-to-step-2",
						trigger: workflowFormCompleted(QUICK_REVIEW_STEP_1_FORM_ID),
						action: {
							kind: "transition_step",
							target: { kind: "entry_branch", stepNumber: 2 },
						},
					},
				],
			},
		},
	}
}

function buildStep2DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-2-project-prompt",
		branches: {
			"step-2-project-prompt": {
				id: "step-2-project-prompt",
				routes: [
					{
						id: "step-2-project-prompt",
						trigger: { kind: "always" },
						action: { kind: "project_prompt" },
						followingBranchId: "step-2-await-attempt-completion",
					},
				],
			},
			"step-2-await-attempt-completion": {
				id: "step-2-await-attempt-completion",
				routes: [
					{
						id: "step-2-complete-workflow",
						trigger: attemptCompletionSucceeded(),
						action: { kind: "complete_workflow" },
					},
				],
			},
		},
	}
}

export const quickReviewWorkflowDefinition: WorkflowDefinition = {
	name: QUICK_REVIEW_WORKFLOW_NAME,
	displayName: QUICK_REVIEW_WORKFLOW_DISPLAY_NAME,
	description: QUICK_REVIEW_WORKFLOW_DESCRIPTION,
	slashCommandName: QUICK_REVIEW_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: QUICK_REVIEW_WORKFLOW_USE_SKILL_NAME,
	persona: QUICK_REVIEW_WORKFLOW_PERSONA,
	projectSubfolder: QUICK_REVIEW_WORKFLOW_PROJECT_SUBFOLDER,
	workflowValueKeys: QUICK_REVIEW_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: QUICK_REVIEW_ENTRY_PROJECT_VALUE_KEYS,
	entryPanel: { promptMarkdown: QUICK_REVIEW_WORKFLOW_DESCRIPTION },
	workflowForms: { [QUICK_REVIEW_STEP_1_FORM_ID]: buildQuickReviewStep1WorkflowForm() },
	prerequisiteFiles: QUICK_REVIEW_PREREQUISITE_FILES,
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Gather Commit Info",
			decisionTree: buildStep1DecisionTree(),
			buildToolSchema: buildQuickReviewStep1ToolSchemas,
		}),
		"step-2": createStepDefinition({
			stepNumber: 2,
			checklistLabel: "Perform Quality Review",
			decisionTree: buildStep2DecisionTree(),
			buildPromptSource: buildStep2PromptSource,
			promptTemplates: [QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE],
			buildToolSchema: buildQuickReviewStep2ToolSchemas,
		}),
	},
}
