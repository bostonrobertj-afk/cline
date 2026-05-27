import type {
	WorkflowDecisionBranchTrigger,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowPersonaDefinition,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowStepPromptSource,
} from "../../types"
import { buildValidateStoryStep1ToolSchemas } from "./validateStoryToolSchemas"

export const VALIDATE_STORY_WORKFLOW_NAME = "validate-story"
export const VALIDATE_STORY_WORKFLOW_SLASH_COMMAND_NAME = "validate-story"
export const VALIDATE_STORY_WORKFLOW_USE_SKILL_NAME = "validate-story"
export const VALIDATE_STORY_WORKFLOW_DISPLAY_NAME = "validate story"
export const VALIDATE_STORY_WORKFLOW_DESCRIPTION =
	"In this workflow, the agent assesses an implementation-ready story to ensure that it is correctly-written in compliance with project requirements and workflow quality standards."
export const VALIDATE_STORY_WORKFLOW_PROJECT_SUBFOLDER = "planning"

export const VALIDATE_STORY_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "Bob",
	role: "Scrum Master",
	identity: "producing clear, actionable stories.",
	capabilities: ["story validation & story task/ subtask authoring."],
	communicationStyle: "crisp, checklist-driven, and ambiguity-free.",
	principles: ["always assessing runtime code & tracing seams end-to-end to ensure task coverage is comprehensive."],
}

export enum ValidateStoryWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	TargetStory = "target_story",
	EpicsDocument = "epics_document",
	ArchitectureDocument = "architecture_document",
	OriginatingStory = "originating_story",
	CodeReviewOutput = "code_review_output",
}

export const VALIDATE_STORY_WORKFLOW_VALUE_KEYS: readonly ValidateStoryWorkflowValueKey[] = [
	ValidateStoryWorkflowValueKey.ProjectMode,
	ValidateStoryWorkflowValueKey.ProjectTitle,
	ValidateStoryWorkflowValueKey.ProjectFolderName,
	ValidateStoryWorkflowValueKey.TargetStory,
	ValidateStoryWorkflowValueKey.EpicsDocument,
	ValidateStoryWorkflowValueKey.ArchitectureDocument,
	ValidateStoryWorkflowValueKey.OriginatingStory,
	ValidateStoryWorkflowValueKey.CodeReviewOutput,
]

export const VALIDATE_STORY_ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: ValidateStoryWorkflowValueKey.ProjectMode,
	projectTitle: ValidateStoryWorkflowValueKey.ProjectTitle,
	projectFolderName: ValidateStoryWorkflowValueKey.ProjectFolderName,
}

export const VALIDATE_STORY_TARGET_STORY_PREREQUISITE_ID = ValidateStoryWorkflowValueKey.TargetStory
export const VALIDATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID = ValidateStoryWorkflowValueKey.EpicsDocument
export const VALIDATE_STORY_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID = ValidateStoryWorkflowValueKey.ArchitectureDocument
export const VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN =
	/^(Story-[1-9]\d*-[1-9]\d*|Remediation-story-[1-9]\d*-[1-9]\d*-[1-9]\d*)\.md$/

export const VALIDATE_STORY_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]> = {
	[VALIDATE_STORY_TARGET_STORY_PREREQUISITE_ID]: {
		id: VALIDATE_STORY_TARGET_STORY_PREREQUISITE_ID,
		requirement: "required",
		producingWorkflowName: "create-story",
		projectSubfolderSegments: ["implementation", "stories-backlog"],
		match: { kind: "naming_pattern", pattern: VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN },
		workflowValueKey: ValidateStoryWorkflowValueKey.TargetStory,
		outputDocumentReference: "none",
	},
	[VALIDATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID]: {
		id: VALIDATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID,
		requirement: "required",
		producingWorkflowName: "create-epics",
		projectSubfolderSegments: ["planning"],
		match: { kind: "exact_filename", filename: "Epics.md" },
		workflowValueKey: ValidateStoryWorkflowValueKey.EpicsDocument,
		outputDocumentReference: "none",
	},
	[VALIDATE_STORY_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID]: {
		id: VALIDATE_STORY_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID,
		requirement: "required",
		producingWorkflowName: "create-architecture",
		projectSubfolderSegments: ["planning"],
		match: { kind: "exact_filename", filename: "architecture.md" },
		workflowValueKey: ValidateStoryWorkflowValueKey.ArchitectureDocument,
		outputDocumentReference: "none",
	},
}

export const VALIDATE_STORY_STEP_1_IMPLEMENTATION_STORY_HEADER = `You are performing a pre-implementation review of an implementation-story document before it is passed to the developer for implementation.
- Project: {workflow.projectTitle}
- Project Folder: {workflow.projectFolderName}
- Architecture Document: {workflow.architecture_document}
- Epics Documentation: {workflow.epics_document}
- Target Story: {workflow.target_story}`

export const VALIDATE_STORY_STEP_1_WRITE_REMEDIATION_STORY_HEADER = `You have been called inside a workflow designed to validate a remediation story before implementation. You will assess the remediation story against quality standards, ensure that the prescribed revisions are correct and comprehensive, and ensure that the story satisfies requirements as-written.
- Story for Review: {workflow.target_story}
- Story which had QA findings leading to generation of the story being reviewed: {workflow.originating_story}
- Findings from QA pass on the original story: {workflow.code_review_output}`

export const VALIDATE_STORY_STEP_1_QUICK_SPEC_HEADER = `You have been called inside a workflow designed to validate an implementation spec for a small project. You will assess the provided spec against quality standards, ensure that the prescribed revisions are correct and comprehensive, and ensure that the spec's tasks and subtasks satisfy the project's objective and requirements.
Spec for review: {workflow.target_story}

Read the entire provided spec, then assess the spec's tasks and subtasks following the criteria below.`

export const VALIDATE_STORY_STEP_1_COMMON_REVIEW_CRITERIA = `Review each task and subtask individually, inspecting the indicated target file and determinining whether the prescribed change meets the following standards:
1. Tasks and subtasks must be sequentially numbered.
2. Tasks may summarize a file or capability area. Subtasks must prescribe exact changes.
3. Each task or subtask must include:
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
4. Tasks & Subtasks must not use vague phrases such as:
- “all helpers”
- “matching sibling pattern”
- “equivalent shape”
- “update tests”
- “as needed”
- “fixture like the existing one”
- “all exported constants”
- “each static branch template”
5. Each task & subtask meets the following quality standards:
- It is requirements-backed.
- It is compile-safe.
- It has exact imports and cleanup.
- It has exact fixture/action/session shapes.
- It has exact assertions where stable contracts are involved.
- It does not invent prose.
- It does not preserve unauthorized legacy behavior.
- It does not require the dev agent to infer implementation details.

After assessing the tasks and subtasks thoroughly, consider whether the combined set delivers on the indicated requirements/objective while respecting the defined scope.`

export const VALIDATE_STORY_STEP_1_SUBAGENT_FINAL_INSTRUCTION =
	"Once you've performed your review, use attempt_completion to provide detailed findings back to the primary agent."

export const VALIDATE_STORY_STEP_1_MAIN_AGENT_FINAL_INSTRUCTION =
	'Once you\'ve reviewed the story document, provide a response to the user using attempt_completion. In your response, list each story section and indicate "no violations" or provide specific violation details. For the task section, provide either a "no violations" or violations details for each task and subtask. If findings were present, instruct the user to run the create-story workflow and provide your findings to the agent in that workflow.'

export const VALIDATE_STORY_STEP_1_PROMPT_TEMPLATES: readonly string[] = [
	VALIDATE_STORY_STEP_1_IMPLEMENTATION_STORY_HEADER,
	VALIDATE_STORY_STEP_1_WRITE_REMEDIATION_STORY_HEADER,
	VALIDATE_STORY_STEP_1_QUICK_SPEC_HEADER,
	VALIDATE_STORY_STEP_1_COMMON_REVIEW_CRITERIA,
	VALIDATE_STORY_STEP_1_SUBAGENT_FINAL_INSTRUCTION,
	VALIDATE_STORY_STEP_1_MAIN_AGENT_FINAL_INSTRUCTION,
]

function resolveValidateStoryStep1Header(parentWorkflowName: WorkflowDefinition["name"] | undefined): string {
	if (parentWorkflowName === "write-remediation-story") {
		return VALIDATE_STORY_STEP_1_WRITE_REMEDIATION_STORY_HEADER
	}
	if (parentWorkflowName === "quick-spec") {
		return VALIDATE_STORY_STEP_1_QUICK_SPEC_HEADER
	}
	return VALIDATE_STORY_STEP_1_IMPLEMENTATION_STORY_HEADER
}

function resolveValidateStoryStep1FinalInstruction(parentWorkflowName: WorkflowDefinition["name"] | undefined): string {
	return parentWorkflowName === undefined
		? VALIDATE_STORY_STEP_1_MAIN_AGENT_FINAL_INSTRUCTION
		: VALIDATE_STORY_STEP_1_SUBAGENT_FINAL_INSTRUCTION
}

function buildStep1PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const parentWorkflowName = input.session.lifecycle.parentWorkflowName
	const sections = [
		resolveValidateStoryStep1Header(parentWorkflowName),
		VALIDATE_STORY_STEP_1_COMMON_REVIEW_CRITERIA,
		resolveValidateStoryStep1FinalInstruction(parentWorkflowName),
	]
	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: sections.join("\n\n"),
	}
}

function createStepDefinition(args: {
	stepNumber: 1
	checklistLabel: string
	decisionTree: WorkflowDecisionTree
	buildPromptSource: WorkflowStepDefinition["buildPromptSource"]
	buildToolSchema: WorkflowStepDefinition["buildToolSchema"]
	promptTemplates: NonNullable<WorkflowStepDefinition["promptTemplates"]>
}): WorkflowStepDefinition {
	return {
		id: `step-${args.stepNumber}`,
		stepNumber: args.stepNumber,
		checklistLabel: args.checklistLabel,
		buildPromptSource: args.buildPromptSource,
		buildToolSchema: args.buildToolSchema,
		decisionTree: args.decisionTree,
		promptTemplates: args.promptTemplates,
	}
}

function mainAgentInvocation(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: (input) => input.session.lifecycle.parentWorkflowName === undefined,
	}
}

function parentWorkflowInvocation(parentWorkflowName: WorkflowDefinition["name"]): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: (input) => input.session.lifecycle.parentWorkflowName === parentWorkflowName,
	}
}

function buildStep1DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-1-route-by-invocation",
		branches: {
			"step-1-route-by-invocation": {
				id: "step-1-route-by-invocation",
				routes: [
					{
						id: "step-1-main-agent-resolve-prerequisites",
						trigger: mainAgentInvocation(),
						action: {
							kind: "resolve_prerequisite_files",
							prerequisiteIds: [
								VALIDATE_STORY_TARGET_STORY_PREREQUISITE_ID,
								VALIDATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID,
								VALIDATE_STORY_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID,
							],
						},
						followingBranchId: "step-1-start-review",
					},
					{
						id: "step-1-create-story-project-prompt",
						trigger: parentWorkflowInvocation("create-story"),
						action: { kind: "project_prompt" },
						followingBranchId: "step-1-await-attempt-completion",
					},
					{
						id: "step-1-write-remediation-story-project-prompt",
						trigger: parentWorkflowInvocation("write-remediation-story"),
						action: { kind: "project_prompt" },
						followingBranchId: "step-1-await-attempt-completion",
					},
					{
						id: "step-1-quick-spec-project-prompt",
						trigger: parentWorkflowInvocation("quick-spec"),
						action: { kind: "project_prompt" },
						followingBranchId: "step-1-await-attempt-completion",
					},
				],
			},
			"step-1-start-review": {
				id: "step-1-start-review",
				routes: [
					{
						id: "step-1-project-prompt",
						trigger: { kind: "always" },
						action: { kind: "project_prompt" },
						followingBranchId: "step-1-await-attempt-completion",
					},
				],
			},
			"step-1-await-attempt-completion": {
				id: "step-1-await-attempt-completion",
				routes: [
					{
						id: "step-1-complete-workflow",
						trigger: { kind: "on_event", eventKind: "attempt_completion_succeeded" },
						action: { kind: "complete_workflow" },
					},
				],
			},
		},
	}
}

export const validateStoryWorkflowDefinition: WorkflowDefinition = {
	name: VALIDATE_STORY_WORKFLOW_NAME,
	slashCommandName: VALIDATE_STORY_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: VALIDATE_STORY_WORKFLOW_USE_SKILL_NAME,
	displayName: VALIDATE_STORY_WORKFLOW_DISPLAY_NAME,
	description: VALIDATE_STORY_WORKFLOW_DESCRIPTION,
	projectSubfolder: VALIDATE_STORY_WORKFLOW_PROJECT_SUBFOLDER,
	persona: VALIDATE_STORY_WORKFLOW_PERSONA,
	entryPanel: { promptMarkdown: VALIDATE_STORY_WORKFLOW_DESCRIPTION },
	workflowValueKeys: VALIDATE_STORY_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: VALIDATE_STORY_ENTRY_PROJECT_VALUE_KEYS,
	prerequisiteFiles: VALIDATE_STORY_PREREQUISITE_FILES,
	childInheritance: [
		{ parentKey: "projectTitle", childKey: "projectTitle" },
		{ parentKey: "projectFolderName", childKey: "projectFolderName" },
		{ parentKey: "target_story", childKey: "target_story" },
		{ parentKey: "epics_document", childKey: "epics_document" },
		{ parentKey: "architecture_document", childKey: "architecture_document" },
		{ parentKey: "originating_story", childKey: "originating_story" },
		{ parentKey: "code_review_output", childKey: "code_review_output" },
		{ parentKey: "output_document", childKey: "target_story" },
	],
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Assess Story Before Implementation",
			decisionTree: buildStep1DecisionTree(),
			buildPromptSource: buildStep1PromptSource,
			buildToolSchema: buildValidateStoryStep1ToolSchemas,
			promptTemplates: VALIDATE_STORY_STEP_1_PROMPT_TEMPLATES,
		}),
	},
}
