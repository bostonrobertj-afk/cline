import type {
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowPersonaDefinition,
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
}

export const VALIDATE_STORY_WORKFLOW_VALUE_KEYS: readonly ValidateStoryWorkflowValueKey[] = [
	ValidateStoryWorkflowValueKey.ProjectMode,
	ValidateStoryWorkflowValueKey.ProjectTitle,
	ValidateStoryWorkflowValueKey.ProjectFolderName,
	ValidateStoryWorkflowValueKey.TargetStory,
	ValidateStoryWorkflowValueKey.EpicsDocument,
	ValidateStoryWorkflowValueKey.ArchitectureDocument,
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

const VALIDATE_STORY_STEP_1_PROMPT_TEMPLATE = `You are performing a pre-implementation review of an implementation-story document before it is passed to the developer for implementation.
- Project: {workflow.projectTitle}
- Project Folder: {workflow.projectFolderName}
- Architecture Document: {workflow.architecture_document}
- Epics Documentation: {workflow.epics_document}
- Target Story: {workflow.target_story}

Perform a line-by-line review to ensure that the provided story document meets all relevant project and quality standards, including:
- Objective, scope, scope boundary, and requirements are appropriate for the story and aligned with the upstream epics and architecture documentation
- The story's tasks and subtasks fully comply with the following:
    - Tasks & subtasks must start on a new line beginning with "[ ]", then the ID, then the target file's full file path, then the prescribed change.
    - Tasks and subtasks are numbered sequentially with subtasks inheriting their parent task's ID, e.g. Task 1, Subtasks 1.1, 1.2
    - The tasks/subtasks fully satisfy the story's requirements & objective while adhering to the scope and scope boundary
    - Prescribed revisions are exact and leave no ambiguity for the developer to solve during implementation.
    - Prescribed changes must include exact shapes for helpers, functions, fixtures, transition objects, discriminant narrowing, and object fields.
    - Each subtask or task without subordinate subtasks prescribes exactly one revision in a single target file
    - Tasks & Subtasks align with these quality expectations:
        - Symbol lifecycle: every referenced helper, constant, type, builder, and test utility must be created, exported, and imported before first use. Import subtasks must list exact symbol names; phrases like "all helpers", "all exports", "the builders", or "matching sibling imports" are not permitted.
        - Live contract verification: every prescribed constructor call, method call, return type, runtime action object, path-policy object, session object, form-session object, event object, and submitted-value payload must match the live exported TypeScript contract or a symbol created earlier in the same plan.
        - Single-change granularity: a subtask must not bundle multiple helpers, multiple unrelated tests, or multiple runtime branches when splitting them would make sequencing, imports, or exact assertions clearer.
        - Stable object assertions: tests for machine-consumed contracts must use exact deep-equality or exact field assertions, not "include", "deep-include", "transition type", or "action kind", when the requirements prescribe stable object fields.
        - Fixture completeness: every test fixture must prescribe exact required object fields and exact setup calls/data, including runtime sessions, values, temp files, write data, cleanup, and second/fresh fixture setup where isolation is required.
        - Deterministic helper behavior: helper subtasks must prescribe exact narrowing, intermediate variables, empty checks, return values, and error paths. Internally contradictory wording is not permitted.
        - Filesystem/path-policy behavior: if a requirement involves selected-project containment, file type, workspace path policy, or runtime-owned artifact resolution, the story must prescribe that exact validation path.
        - Legacy/forbidden coverage: unit tests and final validation guards must enumerate every forbidden legacy concept required by the requirements.
    Tasks & subtasks must NEVER include the use of these low-quality code methods:
        - "any" typing
        - val as SomeType
        - as any in tests
        - optional properties most of the time (explicitly model which combinations exist and which don't whenever possible)
        - one-letter generics
        - non-boolean boolean checks
        - bang bang operators (explicitly check for the condition instead)
        - != null (explicitly check for the condition instead)
        - not declaring function return types
        - abuse of type assertions (use them only in special scenarios where the type is clearly known, and give priority to type declarations, interfaces, or generics)
        - Failing to use utility types (use utility types such as partial, pick, omit, etc when appropriate)
        - forcing assertions when types don't match
        - not using enums to manage constants
        - not using generics to abstract duplicated code
        - not using type narrowing
        - not explicitly defining generics parameters
- Prescribed tests provide adequate coverage of both happy paths and failure paths for all code revisions
- Tests are prescribed only for behavior, contracts, regression, and material risks required by the story document and project documentation
- Any tests built via the story's tasks use exact assertions for canonical machine-consumed outputs and stable contracts, including tool names/ schema shape, artifact file formats, and persisted metadata.
- Any tests built via the story's tasks use shape and invariant assertions for editable content: required fields exist, strings are non-empty, mappings are correct, and forbidden legacy values are absent.
- Any tests built via the story's tasks do not add static guards unless they protect an approved boundary, forbidden legacy dependency, or known regression risk.

Once you've reviewed the story document, provide a response to the user using attempt_completion. In your response, list each story section and indicate "no violations" or provide specific violation details. For the task section, provide either a "no violations" or violations details for each task and subtask. If findings were present, instruct the user to run the create-story workflow and provide your findings to the agent in that workflow.`

function buildStep1PromptSource(): WorkflowStepPromptSource {
	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: VALIDATE_STORY_STEP_1_PROMPT_TEMPLATE,
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

function buildStep1DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-1-resolve-prerequisites",
		branches: {
			"step-1-resolve-prerequisites": {
				id: "step-1-resolve-prerequisites",
				routes: [
					{
						id: "step-1-resolve-prerequisites",
						trigger: { kind: "always" },
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
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Assess Story Before Implementation",
			decisionTree: buildStep1DecisionTree(),
			buildPromptSource: buildStep1PromptSource,
			buildToolSchema: buildValidateStoryStep1ToolSchemas,
			promptTemplates: [VALIDATE_STORY_STEP_1_PROMPT_TEMPLATE],
		}),
	},
}
