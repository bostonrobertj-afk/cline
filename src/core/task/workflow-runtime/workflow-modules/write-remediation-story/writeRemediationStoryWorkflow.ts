import { basename, dirname, join, normalize } from "node:path"
import type { WorkflowFormDefinitionPayload, WorkflowFormPanelAction } from "@shared/ExtensionMessage"
import type { WorkflowFormSessionData } from "@/core/task/workflow-form/types"
import { WorkflowArtifactFamily } from "../../artifactFamilies"
import { buildEpicStoriesIndexFilename } from "../../storyArtifacts"
import type {
	ActiveWorkflowSession,
	WorkflowDecisionBranchTrigger,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowDeterministicProcedureResult,
	WorkflowFormContinuationReplacement,
	WorkflowFormContinuationReplacementBuilder,
	WorkflowPersonaDefinition,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowStepPromptSource,
	WorkflowValues,
} from "../../types"
import {
	buildWriteRemediationStoryStep1ToolSchemas,
	buildWriteRemediationStoryStep2ToolSchemas,
	buildWriteRemediationStoryStep3ToolSchemas,
	buildWriteRemediationStoryStep4ToolSchemas,
} from "./writeRemediationStoryToolSchemas"

export const WRITE_REMEDIATION_STORY_WORKFLOW_NAME = "write-remediation-story"
export const WRITE_REMEDIATION_STORY_WORKFLOW_SLASH_COMMAND_NAME = "write-remediation-story"
export const WRITE_REMEDIATION_STORY_WORKFLOW_USE_SKILL_NAME = "write-remediation-story"
export const WRITE_REMEDIATION_STORY_WORKFLOW_DISPLAY_NAME = "write remediation story"
export const WRITE_REMEDIATION_STORY_WORKFLOW_DESCRIPTION =
	"In this workflow, the agent completes a drafted remediation story by adding tasks & subtasks focused on review findings for a completed story."
export const WRITE_REMEDIATION_STORY_WORKFLOW_PROJECT_SUBFOLDER = "planning"
export const WRITE_REMEDIATION_STORY_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "Bob",
	role: "Scrum Master",
	identity: "producing clear, actionable stories.",
	capabilities: ["story validation & story task/ subtask authoring."],
	communicationStyle: "crisp, checklist-driven, and ambiguity-free.",
	principles: ["always assessing runtime code & tracing seams end-to-end to ensure task coverage is comprehensive."],
}

export enum WriteRemediationStoryWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	CodeReviewOutput = "code_review_output",
	TargetStory = "target_story",
	TargetStoryFilename = "target_story_filename",
	SelectedStoryIdentity = "selected_story_identity",
	OriginatingStory = "originating_story",
	OriginatingStoryIdentity = "originating_story_identity",
	EpicIdentity = "epic_identity",
	StoriesIndex = "stories_index",
	ReplacementDocumentChoice = "replacement_document_choice",
}

export const WRITE_REMEDIATION_STORY_WORKFLOW_VALUE_KEYS: readonly WriteRemediationStoryWorkflowValueKey[] = Object.values(
	WriteRemediationStoryWorkflowValueKey,
)

export const WRITE_REMEDIATION_STORY_ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: WriteRemediationStoryWorkflowValueKey.ProjectMode,
	projectTitle: WriteRemediationStoryWorkflowValueKey.ProjectTitle,
	projectFolderName: WriteRemediationStoryWorkflowValueKey.ProjectFolderName,
}

export const WRITE_REMEDIATION_STORY_CODE_REVIEW_OUTPUT_PREREQUISITE_ID = WriteRemediationStoryWorkflowValueKey.CodeReviewOutput
export const WRITE_REMEDIATION_STORY_TARGET_STORY_PREREQUISITE_ID = WriteRemediationStoryWorkflowValueKey.TargetStory
export const WRITE_REMEDIATION_STORY_CODE_REVIEW_OUTPUT_FILENAME_PATTERN = /^code-review-\d+-\d+(?:-\d+)?\.md$/
export const WRITE_REMEDIATION_STORY_TARGET_STORY_FILENAME_PATTERN = /^Remediation-story-\d+-\d+-\d+\.md$/

export const WRITE_REMEDIATION_STORY_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]> = {
	[WRITE_REMEDIATION_STORY_CODE_REVIEW_OUTPUT_PREREQUISITE_ID]: {
		id: WRITE_REMEDIATION_STORY_CODE_REVIEW_OUTPUT_PREREQUISITE_ID,
		requirement: "required",
		producingWorkflowName: "code-review",
		projectSubfolderSegments: ["review"],
		match: {
			kind: "naming_pattern",
			pattern: WRITE_REMEDIATION_STORY_CODE_REVIEW_OUTPUT_FILENAME_PATTERN,
		},
		workflowValueKey: WriteRemediationStoryWorkflowValueKey.CodeReviewOutput,
		outputDocumentReference: "none",
	},
	[WRITE_REMEDIATION_STORY_TARGET_STORY_PREREQUISITE_ID]: {
		id: WRITE_REMEDIATION_STORY_TARGET_STORY_PREREQUISITE_ID,
		requirement: "required",
		producingWorkflowName: "code-review",
		projectSubfolderSegments: ["implementation", "drafts"],
		match: {
			kind: "naming_pattern",
			pattern: WRITE_REMEDIATION_STORY_TARGET_STORY_FILENAME_PATTERN,
		},
		workflowValueKey: WriteRemediationStoryWorkflowValueKey.TargetStory,
		outputDocumentReference: "none",
	},
}

export const WRITE_REMEDIATION_STORY_STEP_1_FORM_ID = "step-1-write-remediation-story-replacement-form"
export const WRITE_REMEDIATION_STORY_PANEL_A_INCOMPATIBLE_FILES_ID = "step-1-panel-a-incompatible-files"
export const WRITE_REMEDIATION_STORY_PANEL_B_REPLACE_STORY_ID = "step-1-panel-b-replace-story-document"
export const WRITE_REMEDIATION_STORY_PANEL_C_REPLACE_FINDINGS_ID = "step-1-panel-c-replace-findings-document"
export const WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_FIELD_KEY = "replacement_document_choice"
export const WRITE_REMEDIATION_STORY_REPLACEMENT_TARGET_STORY_FIELD_KEY = "replacement_target_story"
export const WRITE_REMEDIATION_STORY_REPLACEMENT_CODE_REVIEW_OUTPUT_FIELD_KEY = "replacement_code_review_output"
export const WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_REVIEW_FINDINGS = "review_findings"
export const WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_REMEDIATION_STORY = "remediation_story"

export const WRITE_REMEDIATION_STORY_INCOMPATIBLE_FILES_TERMINAL_ERROR =
	"The provided files are not associated with one another. Please ensure that correct upstream workflows have completed and produced their output documentation, then retry this workflow in a new thread."
export const WRITE_REMEDIATION_STORY_ORIGINATING_STORY_MISSING_TERMINAL_ERROR =
	"The origin story on which the provided findings are based could not be located. Please retry this workflow in a new thread once the appropriate origin story file is restored in the project's implementation/stories-complete subfolder."
export const WRITE_REMEDIATION_STORY_INDEX_MISSING_OR_MALFORMED_TERMINAL_ERROR =
	"The required story index file is either missing or incorrectly formatted. Please ensure a correctly-formatted story index is file is present in the project's implementation subfolder before retrying this workflow. You may run the pi-planning workflow to generate one."
export const WRITE_REMEDIATION_STORY_MISSING_REMEDIATION_ENTRY_TERMINAL_ERROR =
	"The selected remediation story is missing from the story index. Please add the remediation story to the story index, then retry this workflow."
export const WRITE_REMEDIATION_STORY_MALFORMED_REMEDIATION_ENTRY_TERMINAL_ERROR =
	"The selected remediation story's story index entry is malformed. Please update it, then retry this workflow."
export const WRITE_REMEDIATION_STORY_TOOL_BACKED_OPERATION_FAILED_FALLBACK = "Tool-backed operation failed."

function buildRuntimeRoutedTransition(
	staleValueKeysToClear: readonly string[] = [],
): WorkflowFormDefinitionPayload["panels"][string]["transition"] {
	if (staleValueKeysToClear.length === 0) {
		return { type: "runtime_routed" }
	}

	return { type: "runtime_routed", staleValueKeysToClear: [...staleValueKeysToClear] }
}

function readWorkflowStringValue(workflowValues: WorkflowValues, key: WriteRemediationStoryWorkflowValueKey): string | undefined {
	const value = workflowValues[key]
	if (typeof value !== "string") {
		return undefined
	}

	const trimmedValue = value.trim()
	return trimmedValue.length > 0 ? trimmedValue : undefined
}

function buildWriteRemediationStoryFormSessionData(session: ActiveWorkflowSession): WorkflowFormSessionData {
	return {
		code_review_output_filename: basename(
			readWorkflowStringValue(session.workflowValues, WriteRemediationStoryWorkflowValueKey.CodeReviewOutput) ?? "",
		),
		target_story_filename: basename(
			readWorkflowStringValue(session.workflowValues, WriteRemediationStoryWorkflowValueKey.TargetStory) ?? "",
		),
	}
}

export function buildWriteRemediationStoryStep1WorkflowForm(): WorkflowFormDefinitionPayload {
	const panelAPrompt =
		"The findings document and remediation story identified are not associated with one another. Which document would you like to replace?"

	return {
		definitionVersion: 2,
		title: "Incompatible files",
		toolDictionaryTitle: "Incompatible files",
		toolDictionaryMarkdown: panelAPrompt,
		firstPanelId: WRITE_REMEDIATION_STORY_PANEL_A_INCOMPATIBLE_FILES_ID,
		panels: {
			[WRITE_REMEDIATION_STORY_PANEL_A_INCOMPATIBLE_FILES_ID]: {
				panelId: WRITE_REMEDIATION_STORY_PANEL_A_INCOMPATIBLE_FILES_ID,
				title: "Incompatible files",
				promptMarkdown: panelAPrompt,
				fields: [
					{
						key: WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_FIELD_KEY,
						workflowValueKey: WriteRemediationStoryWorkflowValueKey.ReplacementDocumentChoice,
						kind: "radio_group",
						label: "document to replace",
						required: true,
						allowedValueType: "string",
						options: [
							{
								value: WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_REVIEW_FINDINGS,
								label: "review findings",
							},
							{
								value: WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_REMEDIATION_STORY,
								label: "remediation story",
							},
						],
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "submit",
				},
				transition: buildRuntimeRoutedTransition(),
			},
			[WRITE_REMEDIATION_STORY_PANEL_B_REPLACE_STORY_ID]: {
				panelId: WRITE_REMEDIATION_STORY_PANEL_B_REPLACE_STORY_ID,
				title: "Replace Story Document",
				promptMarkdown:
					"Please select a drafted Remediation Story compatible with Findings Document: {data.code_review_output_filename}",
				fields: [
					{
						key: WRITE_REMEDIATION_STORY_REPLACEMENT_TARGET_STORY_FIELD_KEY,
						workflowValueKey: WriteRemediationStoryWorkflowValueKey.TargetStory,
						kind: "dropdown",
						label: "remediation story",
						required: true,
						allowedValueType: "string",
						options: [],
						selectorDiscovery: {
							root: { kind: "selected_project_root" },
							entryType: "file",
							targetPathSegments: ["implementation", "drafts"],
							namingPattern: "^Remediation-story-\\d+-\\d+-\\d+\\.md$",
							labelTemplate: "{entryName}",
							immediateChildrenOnly: true,
							sort: "alpha_asc",
						},
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "submit",
					back: "back",
				},
				transition: buildRuntimeRoutedTransition([WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_FIELD_KEY]),
				backDestinationPanelId: WRITE_REMEDIATION_STORY_PANEL_A_INCOMPATIBLE_FILES_ID,
			},
			[WRITE_REMEDIATION_STORY_PANEL_C_REPLACE_FINDINGS_ID]: {
				panelId: WRITE_REMEDIATION_STORY_PANEL_C_REPLACE_FINDINGS_ID,
				title: "Replace Findings Document",
				promptMarkdown:
					"Please select a drafted Code Review findings document compatible with the Remediation Story: {data.target_story_filename}",
				fields: [
					{
						key: WRITE_REMEDIATION_STORY_REPLACEMENT_CODE_REVIEW_OUTPUT_FIELD_KEY,
						workflowValueKey: WriteRemediationStoryWorkflowValueKey.CodeReviewOutput,
						kind: "dropdown",
						label: "review findings",
						required: true,
						allowedValueType: "string",
						options: [],
						selectorDiscovery: {
							root: { kind: "selected_project_root" },
							entryType: "file",
							targetPathSegments: ["review"],
							namingPattern: "^code-review-\\d+-\\d+(?:-\\d+)?\\.md$",
							labelTemplate: "{entryName}",
							immediateChildrenOnly: true,
							sort: "alpha_asc",
						},
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "submit",
					back: "back",
				},
				transition: buildRuntimeRoutedTransition([WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_FIELD_KEY]),
				backDestinationPanelId: WRITE_REMEDIATION_STORY_PANEL_A_INCOMPATIBLE_FILES_ID,
			},
		},
	}
}

function cloneReplacementPanel(panelId: string): WorkflowFormDefinitionPayload["panels"][string] {
	const panel = buildWriteRemediationStoryStep1WorkflowForm().panels[panelId]
	if (panel === undefined) {
		throw new Error(`Write Remediation Story Step 1 workflow form is missing requested continuation panel ${panelId}.`)
	}

	return panel
}

function buildStep1ContinuationReplacementBuilder(panelId: string): WorkflowFormContinuationReplacementBuilder {
	return (session) => {
		const replacement: WorkflowFormContinuationReplacement = {
			panel: cloneReplacementPanel(panelId),
			data: buildWriteRemediationStoryFormSessionData(session),
		}
		return replacement
	}
}

export const buildReplaceStoryPanelReplacement = buildStep1ContinuationReplacementBuilder(
	WRITE_REMEDIATION_STORY_PANEL_B_REPLACE_STORY_ID,
)
export const buildReplaceFindingsPanelReplacement = buildStep1ContinuationReplacementBuilder(
	WRITE_REMEDIATION_STORY_PANEL_C_REPLACE_FINDINGS_ID,
)

const CODE_REVIEW_OUTPUT_IDENTITY_PATTERN = /^code-review-(\d+)-(\d+)(?:-(\d+))?\.md$/
const REMEDIATION_STORY_FILENAME_PATTERN = /^Remediation-story-(\d+)-(\d+)-(\d+)\.md$/

type ParsedCodeReviewOutputIdentity =
	| {
			readonly kind: "primary_story_review"
			readonly epicIdentity: string
			readonly storyIdentity: string
			readonly remediationStoryNumber: undefined
			readonly originatingStoryIdentity: string
	  }
	| {
			readonly kind: "remediation_story_review"
			readonly epicIdentity: string
			readonly storyIdentity: string
			readonly remediationStoryNumber: string
			readonly originatingStoryIdentity: string
	  }

interface ParsedRemediationStoryIdentity {
	readonly epicIdentity: string
	readonly storyIdentity: string
	readonly remediationStoryNumber: string
	readonly selectedStoryIdentity: string
}

interface ParsedWriteRemediationStoryInputValues {
	readonly codeReviewOutput: string
	readonly codeReviewOutputFilename: string
	readonly targetStory: string
	readonly targetStoryFilename: string
	readonly selectedStoryIdentity: string
	readonly originatingStoryIdentity: string
	readonly epicIdentity: string
	readonly storiesIndex: string
}

type WriteRemediationStoryInputValidationResult =
	| { readonly kind: "valid"; readonly values: ParsedWriteRemediationStoryInputValues }
	| { readonly kind: "failed"; readonly errorMessage: string }

function parseCodeReviewOutputIdentity(filename: string): ParsedCodeReviewOutputIdentity | undefined {
	const match = filename.match(CODE_REVIEW_OUTPUT_IDENTITY_PATTERN)
	const epicIdentity = match?.[1]
	const storyNumber = match?.[2]
	const remediationStoryNumber = match?.[3]
	if (epicIdentity === undefined || storyNumber === undefined) {
		return undefined
	}

	const storyIdentity = `${epicIdentity}.${storyNumber}`
	if (remediationStoryNumber === undefined) {
		return {
			kind: "primary_story_review",
			epicIdentity,
			storyIdentity,
			remediationStoryNumber: undefined,
			originatingStoryIdentity: storyIdentity,
		}
	}

	return {
		kind: "remediation_story_review",
		epicIdentity,
		storyIdentity,
		remediationStoryNumber,
		originatingStoryIdentity: `${storyIdentity}.${remediationStoryNumber}`,
	}
}

function parseRemediationStoryIdentity(filename: string): ParsedRemediationStoryIdentity | undefined {
	const match = filename.match(REMEDIATION_STORY_FILENAME_PATTERN)
	const epicIdentity = match?.[1]
	const storyNumber = match?.[2]
	const remediationStoryNumber = match?.[3]
	if (epicIdentity === undefined || storyNumber === undefined || remediationStoryNumber === undefined) {
		return undefined
	}

	const storyIdentity = `${epicIdentity}.${storyNumber}`
	const selectedStoryIdentity = `${storyIdentity}.${remediationStoryNumber}`
	return { epicIdentity, storyIdentity, remediationStoryNumber, selectedStoryIdentity }
}

function resolveSelectedProjectRootFromTargetStory(targetStory: string):
	| {
			readonly normalizedTargetStory: string
			readonly targetStoryFilename: string
			readonly selectedProjectRoot: string
	  }
	| undefined {
	const normalizedTargetStory = normalize(targetStory)
	const targetStoryFilename = basename(normalizedTargetStory)
	if (WRITE_REMEDIATION_STORY_TARGET_STORY_FILENAME_PATTERN.test(targetStoryFilename) === false) {
		return undefined
	}

	const draftsFolder = dirname(normalizedTargetStory)
	if (basename(draftsFolder) !== "drafts") {
		return undefined
	}

	const implementationFolder = dirname(draftsFolder)
	if (basename(implementationFolder) !== "implementation") {
		return undefined
	}

	return { normalizedTargetStory, targetStoryFilename, selectedProjectRoot: dirname(implementationFolder) }
}

function resolveSelectedProjectRootFromCodeReviewOutput(codeReviewOutput: string):
	| {
			readonly normalizedCodeReviewOutput: string
			readonly codeReviewOutputFilename: string
			readonly selectedProjectRoot: string
	  }
	| undefined {
	const normalizedCodeReviewOutput = normalize(codeReviewOutput)
	const codeReviewOutputFilename = basename(normalizedCodeReviewOutput)
	if (WRITE_REMEDIATION_STORY_CODE_REVIEW_OUTPUT_FILENAME_PATTERN.test(codeReviewOutputFilename) === false) {
		return undefined
	}

	const reviewFolder = dirname(normalizedCodeReviewOutput)
	if (basename(reviewFolder) !== "review") {
		return undefined
	}

	return { normalizedCodeReviewOutput, codeReviewOutputFilename, selectedProjectRoot: dirname(reviewFolder) }
}

function parseWriteRemediationStoryInputValues(workflowValues: WorkflowValues): WriteRemediationStoryInputValidationResult {
	const targetStory = readWorkflowStringValue(workflowValues, WriteRemediationStoryWorkflowValueKey.TargetStory)
	const codeReviewOutput = readWorkflowStringValue(workflowValues, WriteRemediationStoryWorkflowValueKey.CodeReviewOutput)
	const failedResult: WriteRemediationStoryInputValidationResult = {
		kind: "failed",
		errorMessage: WRITE_REMEDIATION_STORY_INCOMPATIBLE_FILES_TERMINAL_ERROR,
	}
	if (targetStory === undefined || codeReviewOutput === undefined) {
		return failedResult
	}

	const targetStoryResult = resolveSelectedProjectRootFromTargetStory(targetStory)
	const codeReviewOutputResult = resolveSelectedProjectRootFromCodeReviewOutput(codeReviewOutput)
	if (
		targetStoryResult === undefined ||
		codeReviewOutputResult === undefined ||
		normalize(targetStoryResult.selectedProjectRoot) !== normalize(codeReviewOutputResult.selectedProjectRoot)
	) {
		return failedResult
	}

	const targetStoryIdentity = parseRemediationStoryIdentity(targetStoryResult.targetStoryFilename)
	const codeReviewIdentity = parseCodeReviewOutputIdentity(codeReviewOutputResult.codeReviewOutputFilename)
	if (
		targetStoryIdentity === undefined ||
		codeReviewIdentity === undefined ||
		targetStoryIdentity.epicIdentity !== codeReviewIdentity.epicIdentity ||
		targetStoryIdentity.storyIdentity !== codeReviewIdentity.storyIdentity
	) {
		return failedResult
	}

	const storiesIndex = join(
		targetStoryResult.selectedProjectRoot,
		"implementation",
		buildEpicStoriesIndexFilename(targetStoryIdentity.epicIdentity),
	)

	return {
		kind: "valid",
		values: {
			codeReviewOutput: codeReviewOutputResult.normalizedCodeReviewOutput,
			codeReviewOutputFilename: codeReviewOutputResult.codeReviewOutputFilename,
			targetStory: targetStoryResult.normalizedTargetStory,
			targetStoryFilename: targetStoryResult.targetStoryFilename,
			selectedStoryIdentity: targetStoryIdentity.selectedStoryIdentity,
			originatingStoryIdentity: codeReviewIdentity.originatingStoryIdentity,
			epicIdentity: targetStoryIdentity.epicIdentity,
			storiesIndex,
		},
	}
}

function selectedFilesAreAssociated(workflowValues: WorkflowValues): boolean {
	return parseWriteRemediationStoryInputValues(workflowValues).kind === "valid"
}

export function validateAndPersistWriteRemediationStoryInputValues(
	session: ActiveWorkflowSession,
): WorkflowDeterministicProcedureResult {
	const validationResult = parseWriteRemediationStoryInputValues(session.workflowValues)
	if (validationResult.kind === "failed") {
		return { kind: "failed", errorMessage: validationResult.errorMessage }
	}

	const values = validationResult.values
	return {
		kind: "succeeded",
		workflowValueWrites: {
			[WriteRemediationStoryWorkflowValueKey.CodeReviewOutput]: values.codeReviewOutput,
			[WriteRemediationStoryWorkflowValueKey.TargetStory]: values.targetStory,
			[WriteRemediationStoryWorkflowValueKey.TargetStoryFilename]: values.targetStoryFilename,
			[WriteRemediationStoryWorkflowValueKey.SelectedStoryIdentity]: values.selectedStoryIdentity,
			[WriteRemediationStoryWorkflowValueKey.OriginatingStoryIdentity]: values.originatingStoryIdentity,
			[WriteRemediationStoryWorkflowValueKey.EpicIdentity]: values.epicIdentity,
			[WriteRemediationStoryWorkflowValueKey.StoriesIndex]: values.storiesIndex,
		},
	}
}

function renderWorkflowValueByKey(input: WorkflowPromptBuilderInput, key: WriteRemediationStoryWorkflowValueKey): string {
	return input.renderWorkflowValue(input.session.workflowValues[key] ?? key)
}

function renderWriteRemediationStoryPromptTemplate(input: WorkflowPromptBuilderInput, template: string): string {
	return template
		.replaceAll("originating_story", renderWorkflowValueByKey(input, WriteRemediationStoryWorkflowValueKey.OriginatingStory))
		.replaceAll("code_review_output", renderWorkflowValueByKey(input, WriteRemediationStoryWorkflowValueKey.CodeReviewOutput))
		.replaceAll("target_story", renderWorkflowValueByKey(input, WriteRemediationStoryWorkflowValueKey.TargetStory))
}

const WRITE_REMEDIATION_STORY_STEP_3_PROMPT_TEMPLATE = `You have been invoked inside a workflow focused on completing a drafted remediation story in response to QA findings after an upstream story in the same project was completed.

Read these files first:
- The originating story: originating_story
- QA findings for the originating story: code_review_output
- Drafted remediation story: target_story

The remediation story's frontmatter has already been populated. Your task is to complete the story document by adding the tasks and subtasks necessary to ensure the documented findings are fully addressed.

The QA findings are organized into these categories:
  - task failure: the story tasks/ subtasks failed to prescribe the exact correct revisions. 
  - dev agent failure: the dev agent failed to implement the tasks/ subtasks exactly as written.
  - upstream failure: the project's backing documentation either prescribed an incorrect solution or underspecified the necessary solution.

A finding may belong to one or more of the selected categories. You must handle each finding in accordance with the categories it belongs to as follows:
  - task failure: Associated tasks and/or subtasks in the originating story were incorrectly authored. The remediation story must include tasks/ subtasks which are correctly-authored versions of the original tasks and/ or subtasks to ensure project-correct implementation.
  - dev agent failure: The associated tasks and/or subtasks in the originating story were correctly authored, but the developer failed to implement them as written. The associated tasks and/or subtasks should be included in the remediation story as they were written in the originating story.
  - upstream failure: Because the project's upstream documents were insufficient, the originating story will not contain tasks/ subtasks which can be easily rewritten or migrated into the remediation story in most cases. These findings will require you to identify and author net-new tasks and/or subtasks. Note that any gaps or issues in the upstream project documents were addressed after the QA review and before this workflow, so the project documentation can be treated as reliable project context during this workflow.

When authoring the tasks and subtasks for the remediation story, you must follow this process:
   
1. Read the requirements in target_story and parse them into observable obligations:
   runtime behavior, persisted values, artifacts, form UI, tool exposure, prompt projection, routing, validation, cleanup, and tests.

2. Map each obligation to the owning layer:
   workflow definition, shared runtime, tool handler, schema builder, artifact registry, prompt integration, runtime tests, handler tests, cleanup, or validation.

3. For each owning layer, inspect the actual target files:
   current code, sibling module patterns, imports, exports, shared types, route/action contracts, workflow value contracts, tool schemas, fixture helpers, and existing test style.

4. Derive the exact delta from code, not from requirement prose:
   add, update, delete, export, register, test, or validate. No “support X” or “cover Y” summaries.

5. Check compile contracts:
   required imports, discriminated unions, required fields, typed return values, event/session/action shape, workflow values, mocks, stubs, fixtures, and no forced casts.

6. Identify the tasks and subtasks necessary to deliver the remediation story's scope and objective following these rules exactly:
  - Every task must meet one of these task methods:
    1. The task is scoped to a single prescribed code revision in a single target file
    2. The task is scoped to a set of revisions in a single target file and is supported by subtasks, each of which are scoped to a single prescribed revision in the same target file
    3. The task is scoped to a set of revisions scoped to a single function or capability across several files, and is supported by subtasks which are each scoped to a single prescribed revision in a single target file. 
      Example of a task appropriately aligned with task method 1:
        [ ] Task 1: In /users/user_name/documents/folder_a/folder_b/task.ts, add import some_function from /users/user_name/documents/folder_b/folder_a/module.ts.
      
      Example of a task approriately aligned with task method 2:
        [ ] Task 1: Add necessary imports in In /users/user_name/documents/folder_a/folder_b/task.ts.
          [ ] Subtask 1.1: In /users/user_name/documents/folder_a/folder_b/task.ts, add import some_function from /users/user_name/documents/folder_b/folder_a/module.ts
          [ ] Subtask 1.2: In /users/user_name/documents/folder_a/folder_b/task.ts, add import some_other_function from /users/user_name/documents/folder_b/folder_b/module.ts

      Example of a task appropriately aligned with task method 3:
        [ ] Task 1: Rename some_function to some_function_a across all files it appears in.
          [ ] Subtask 1.1: In /users/user_name/documents/folder_a/folder_b/task.ts, replace existing import some_function from /users/user_name/documents/folder_b/folder_a/module.ts with import some_function_a from /users/user_name/documents/folder_b/folder_a/module.ts
          [ ] Subtask 1.2: In /users/user_name/documents/folder_a/folder_c/task.ts, replace existing import some_function from /users/user_name/documents/folder_b/folder_a/module.ts with import some_function_a from /users/user_name/documents/folder_b/folder_a/module.ts
  - Tasks & Subtasks must prescribe the following explicitly:
    - imports
    - helper shapes
    - fixture values
    - event/action/session objects
    - stable behavioral assertions
    - test assertions
    - discriminated. unions
    - optional properties
    - tool params/results
    - schema objects
    - event objects
    - persisted metadata
    - stubs
    - mocks
    - compile-safe type narrowing
    - object construction
    - fixture shape
    - helper return typing
  - Identify existing cruft, failed-attempt remnants, and any that may exist after the prescribed revisions and include tasks/ subtasks to clean them up.
  - Prescribe integration with config/strings where appropriate. Do not introduce hardcoded strings or values when they represent configuration, thresholds, labels, messages, or anything reasonably likely to change.
- Avoid these disallowed patterns at all times:
    - "any" typing
    - val as SomeType
    - "as any" in tests
    - unnecessary optional properties when it is possible to model which combinations do and don't exist
    - bang bang operators
    - unneccessary type assertions
    - not using type narrowing
    not defining generics parameters
    - semantic aliasing
    - preservation of legacy variables/functions/types via semantic aliasing

7. Identify tests relevant to the code touched by the tasks and subtasks, and determine whether any test requires revision to compatibility with the updated code. If tests require revision, include tasks and subtasks to ensure they are updated prior to validation.
  - Include tasks/ subtasks prescribing new tests when existing tests cannot reliably check behavior, contracts, regressions, and material risks for the code that will be in place once the prescribed revisions are in place.

8. Finalize the tasks & subtasks by reviewing them one-by-one and ensuring that:
  - The story will culminate in a compile-ready state so that system diagnostics/ tests can be run cleanly between stories.
  - No task or subtask is dependent on another task or subtask which is sequenced after it, or dependent on work that has not been completed and is not within the story's scope.
  - no subtask prescribes more than one revision in a single target file
  - no task which is NOT supported by subordinate subtasks prescribes more than one revision in a single target file
  - every task is clearly aligned with one of the three approved task methods
  - tasks and subtasks start with "[ ]"
  - subtasks are nested under their parent tasks with appropriate indentation
  - tasks and subtasks are numbered sequentially, with subtasks inheriting the parent task ID (e.g. task 1, subtask 1.1)

9. Author the story's validation section by prescribing the most targeted set of unit tests and validations possible while ensuring that the intended revisions and behavior are in place.

Once all tasks and subtasks are added to target_story and you've validated them per step 8 above, use attempt_completion to provide a final update to the user notifying them that the remediation story is ready for implementation.`

function buildStep3PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	return {
		currentStepInstructions: renderWriteRemediationStoryPromptTemplate(input, WRITE_REMEDIATION_STORY_STEP_3_PROMPT_TEMPLATE),
	}
}

export function failWithToolBackedOperationReason(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult {
	return {
		kind: "failed",
		errorMessage:
			session.branchContext.failureState?.terminalErrorMessage ??
			WRITE_REMEDIATION_STORY_TOOL_BACKED_OPERATION_FAILED_FALLBACK,
	}
}

function createEmptyPromptSource(): WorkflowStepPromptSource {
	return {}
}

function createStepDefinition(args: {
	stepNumber: 1 | 2 | 3 | 4
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

function workflowFormPanelSubmitted(panelId: string, action: WorkflowFormPanelAction): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_form_panel_submitted" &&
			triggerEvent.workflowFormId === WRITE_REMEDIATION_STORY_STEP_1_FORM_ID &&
			triggerEvent.panelId === panelId &&
			triggerEvent.action === action,
	}
}

function attemptCompletionSucceeded(): WorkflowDecisionBranchTrigger {
	return { kind: "on_event", eventKind: "attempt_completion_succeeded" }
}

function replacementChoiceIsReviewFindings(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, WriteRemediationStoryWorkflowValueKey.ReplacementDocumentChoice) ===
			WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_REVIEW_FINDINGS,
	}
}

function replacementChoiceIsRemediationStory(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, WriteRemediationStoryWorkflowValueKey.ReplacementDocumentChoice) ===
			WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_REMEDIATION_STORY,
	}
}

function selectedFilesAreAssociatedTrigger(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) => selectedFilesAreAssociated(workflowValues),
	}
}

function selectedFilesAreNotAssociatedTrigger(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) => selectedFilesAreAssociated(workflowValues) === false,
	}
}

function originatingStoryIdentityIsPrimaryTrigger(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			/^\d+\.\d+$/.test(
				readWorkflowStringValue(workflowValues, WriteRemediationStoryWorkflowValueKey.OriginatingStoryIdentity) ?? "",
			),
	}
}

function originatingStoryIdentityIsRemediationTrigger(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			/^\d+\.\d+\.\d+$/.test(
				readWorkflowStringValue(workflowValues, WriteRemediationStoryWorkflowValueKey.OriginatingStoryIdentity) ?? "",
			),
	}
}

function originatingStoryIdentityIsInvalidTrigger(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) => {
			const value =
				readWorkflowStringValue(workflowValues, WriteRemediationStoryWorkflowValueKey.OriginatingStoryIdentity) ?? ""
			return /^\d+\.\d+$/.test(value) === false && /^\d+\.\d+\.\d+$/.test(value) === false
		},
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
								WRITE_REMEDIATION_STORY_CODE_REVIEW_OUTPUT_PREREQUISITE_ID,
								WRITE_REMEDIATION_STORY_TARGET_STORY_PREREQUISITE_ID,
							],
						},
						followingBranchId: "step-1-route-by-association",
					},
				],
			},
			"step-1-route-by-association": {
				id: "step-1-route-by-association",
				routes: [
					{
						id: "step-1-persist-associated-values",
						trigger: selectedFilesAreAssociatedTrigger(),
						action: {
							kind: "run_deterministic_procedure",
							instruction: { run: validateAndPersistWriteRemediationStoryInputValues },
						},
						followingBranchId: "step-1-validate-story-index",
					},
					{
						id: "step-1-render-incompatible-files-form",
						trigger: selectedFilesAreNotAssociatedTrigger(),
						action: {
							kind: "render_workflow_form",
							workflowFormId: WRITE_REMEDIATION_STORY_STEP_1_FORM_ID,
							startPanelId: WRITE_REMEDIATION_STORY_PANEL_A_INCOMPATIBLE_FILES_ID,
							buildSessionData: buildWriteRemediationStoryFormSessionData,
						},
						followingBranchId: "step-1-await-replacement-form",
					},
				],
			},
			"step-1-await-replacement-form": {
				id: "step-1-await-replacement-form",
				routes: [
					{
						id: "step-1-route-panel-a-submit",
						trigger: workflowFormPanelSubmitted(WRITE_REMEDIATION_STORY_PANEL_A_INCOMPATIBLE_FILES_ID, "submit"),
						action: { kind: "no_op" },
						followingBranchId: "step-1-route-replacement-choice",
					},
					{
						id: "step-1-resolve-replacement-story-artifact",
						trigger: workflowFormPanelSubmitted(WRITE_REMEDIATION_STORY_PANEL_B_REPLACE_STORY_ID, "submit"),
						action: {
							kind: "resolve_existing_project_artifact",
							artifactFamily: WorkflowArtifactFamily.RemediationStory,
							artifactIdentityWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.TargetStory,
							projectSubfolderSegments: ["implementation", "drafts"],
							outputWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.TargetStory,
							missingArtifactErrorMessage: WRITE_REMEDIATION_STORY_INCOMPATIBLE_FILES_TERMINAL_ERROR,
						},
						followingBranchId: "step-1-route-after-replacement-submit",
					},
					{
						id: "step-1-resolve-replacement-findings-artifact",
						trigger: workflowFormPanelSubmitted(WRITE_REMEDIATION_STORY_PANEL_C_REPLACE_FINDINGS_ID, "submit"),
						action: {
							kind: "resolve_existing_project_artifact",
							artifactFamily: WorkflowArtifactFamily.CodeReviewOutput,
							artifactIdentityWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.CodeReviewOutput,
							projectSubfolderSegments: ["review"],
							outputWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.CodeReviewOutput,
							missingArtifactErrorMessage: WRITE_REMEDIATION_STORY_INCOMPATIBLE_FILES_TERMINAL_ERROR,
						},
						followingBranchId: "step-1-route-after-replacement-submit",
					},
				],
			},
			"step-1-route-replacement-choice": {
				id: "step-1-route-replacement-choice",
				routes: [
					{
						id: "step-1-continue-to-replace-findings-panel",
						trigger: replacementChoiceIsReviewFindings(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: WRITE_REMEDIATION_STORY_STEP_1_FORM_ID,
							panelId: WRITE_REMEDIATION_STORY_PANEL_C_REPLACE_FINDINGS_ID,
							buildReplacement: buildReplaceFindingsPanelReplacement,
						},
						followingBranchId: "step-1-await-replacement-form",
					},
					{
						id: "step-1-continue-to-replace-story-panel",
						trigger: replacementChoiceIsRemediationStory(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: WRITE_REMEDIATION_STORY_STEP_1_FORM_ID,
							panelId: WRITE_REMEDIATION_STORY_PANEL_B_REPLACE_STORY_ID,
							buildReplacement: buildReplaceStoryPanelReplacement,
						},
						followingBranchId: "step-1-await-replacement-form",
					},
				],
			},
			"step-1-route-after-replacement-submit": {
				id: "step-1-route-after-replacement-submit",
				routes: [
					{
						id: "step-1-persist-associated-values-after-replacement",
						trigger: selectedFilesAreAssociatedTrigger(),
						action: {
							kind: "run_deterministic_procedure",
							instruction: { run: validateAndPersistWriteRemediationStoryInputValues },
						},
						followingBranchId: "step-1-validate-story-index",
					},
					{
						id: "step-1-terminal-error-after-invalid-replacement",
						trigger: selectedFilesAreNotAssociatedTrigger(),
						action: {
							kind: "terminal_error",
							errorMessage: WRITE_REMEDIATION_STORY_INCOMPATIBLE_FILES_TERMINAL_ERROR,
						},
					},
				],
			},
			"step-1-validate-story-index": {
				id: "step-1-validate-story-index",
				routes: [
					{
						id: "step-1-validate-story-index",
						trigger: { kind: "always" },
						action: {
							kind: "validate_story_index_entry",
							storyIndexWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.StoriesIndex,
							storyIdentityWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.SelectedStoryIdentity,
							storyFilenameWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.TargetStoryFilename,
							requiredStoryType: "remediation",
							requiredStatus: "draft",
							missingOrMalformedIndexErrorMessage:
								WRITE_REMEDIATION_STORY_INDEX_MISSING_OR_MALFORMED_TERMINAL_ERROR,
							missingEntryErrorMessage: WRITE_REMEDIATION_STORY_MISSING_REMEDIATION_ENTRY_TERMINAL_ERROR,
							invalidEntryErrorMessage: WRITE_REMEDIATION_STORY_MALFORMED_REMEDIATION_ENTRY_TERMINAL_ERROR,
						},
						followingBranchId: "step-1-transition-to-step-2",
					},
				],
			},
			"step-1-transition-to-step-2": {
				id: "step-1-transition-to-step-2",
				routes: [
					{
						id: "step-1-transition-to-step-2",
						trigger: { kind: "always" },
						action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } },
					},
				],
			},
		},
	}
}

function buildStep2DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-2-route-originating-story-family",
		branches: {
			"step-2-route-originating-story-family": {
				id: "step-2-route-originating-story-family",
				routes: [
					{
						id: "step-2-resolve-primary-originating-story",
						trigger: originatingStoryIdentityIsPrimaryTrigger(),
						action: {
							kind: "resolve_existing_project_artifact",
							artifactFamily: WorkflowArtifactFamily.Story,
							artifactIdentityWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.OriginatingStoryIdentity,
							projectSubfolderSegments: ["implementation", "stories-complete"],
							outputWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.OriginatingStory,
							missingArtifactErrorMessage: WRITE_REMEDIATION_STORY_ORIGINATING_STORY_MISSING_TERMINAL_ERROR,
						},
						followingBranchId: "step-2-transition-to-step-3",
					},
					{
						id: "step-2-resolve-remediation-originating-story",
						trigger: originatingStoryIdentityIsRemediationTrigger(),
						action: {
							kind: "resolve_existing_project_artifact",
							artifactFamily: WorkflowArtifactFamily.RemediationStory,
							artifactIdentityWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.OriginatingStoryIdentity,
							projectSubfolderSegments: ["implementation", "stories-complete"],
							outputWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.OriginatingStory,
							missingArtifactErrorMessage: WRITE_REMEDIATION_STORY_ORIGINATING_STORY_MISSING_TERMINAL_ERROR,
						},
						followingBranchId: "step-2-transition-to-step-3",
					},
					{
						id: "step-2-terminal-error-invalid-originating-story-identity",
						trigger: originatingStoryIdentityIsInvalidTrigger(),
						action: {
							kind: "terminal_error",
							errorMessage: WRITE_REMEDIATION_STORY_ORIGINATING_STORY_MISSING_TERMINAL_ERROR,
						},
					},
				],
			},
			"step-2-transition-to-step-3": {
				id: "step-2-transition-to-step-3",
				routes: [
					{
						id: "step-2-transition-to-step-3",
						trigger: { kind: "always" },
						action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 3 } },
					},
				],
			},
		},
	}
}

function buildStep3DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-3-project-prompt",
		branches: {
			"step-3-project-prompt": {
				id: "step-3-project-prompt",
				routes: [
					{
						id: "step-3-project-prompt",
						trigger: { kind: "always" },
						action: { kind: "project_prompt" },
						followingBranchId: "step-3-await-attempt-completion",
					},
				],
			},
			"step-3-await-attempt-completion": {
				id: "step-3-await-attempt-completion",
				routes: [
					{
						id: "step-3-transition-to-step-4",
						trigger: attemptCompletionSucceeded(),
						action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 4 } },
					},
				],
			},
		},
	}
}

function buildStep4DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-4-update-story-index-status",
		branches: {
			"step-4-update-story-index-status": {
				id: "step-4-update-story-index-status",
				routes: [
					{
						id: "step-4-update-story-index-status",
						trigger: { kind: "always" },
						action: {
							kind: "update_story_index_status",
							storyIndexWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.StoriesIndex,
							storyIdentityWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.SelectedStoryIdentity,
							status: "backlog",
							expectedCurrentStatus: "draft",
						},
						followingBranchId: "step-4-await-story-index-status-update",
					},
				],
			},
			"step-4-await-story-index-status-update": {
				id: "step-4-await-story-index-status-update",
				routes: [
					{
						id: "step-4-move-remediation-story-to-backlog",
						trigger: toolBackedOperationSucceeded(
							"step-4-update-story-index-status",
							"step-4-update-story-index-status",
						),
						action: {
							kind: "move_project_file",
							sourceFolderSegments: ["implementation", "drafts"],
							destinationFolderSegments: ["implementation", "stories-backlog"],
							filenameWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.TargetStoryFilename,
						},
						followingBranchId: "step-4-await-remediation-story-move",
					},
					{
						id: "step-4-fail-story-index-status-update",
						trigger: toolBackedOperationFailed(
							"step-4-update-story-index-status",
							"step-4-update-story-index-status",
						),
						action: {
							kind: "run_deterministic_procedure",
							instruction: { run: failWithToolBackedOperationReason },
						},
					},
				],
			},
			"step-4-await-remediation-story-move": {
				id: "step-4-await-remediation-story-move",
				routes: [
					{
						id: "step-4-complete-workflow",
						trigger: toolBackedOperationSucceeded(
							"step-4-await-story-index-status-update",
							"step-4-move-remediation-story-to-backlog",
						),
						action: { kind: "complete_workflow" },
					},
					{
						id: "step-4-fail-remediation-story-move",
						trigger: toolBackedOperationFailed(
							"step-4-await-story-index-status-update",
							"step-4-move-remediation-story-to-backlog",
						),
						action: {
							kind: "run_deterministic_procedure",
							instruction: { run: failWithToolBackedOperationReason },
						},
					},
				],
			},
		},
	}
}

export const writeRemediationStoryWorkflowDefinition: WorkflowDefinition = {
	name: WRITE_REMEDIATION_STORY_WORKFLOW_NAME,
	slashCommandName: WRITE_REMEDIATION_STORY_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: WRITE_REMEDIATION_STORY_WORKFLOW_USE_SKILL_NAME,
	displayName: WRITE_REMEDIATION_STORY_WORKFLOW_DISPLAY_NAME,
	description: WRITE_REMEDIATION_STORY_WORKFLOW_DESCRIPTION,
	projectSubfolder: WRITE_REMEDIATION_STORY_WORKFLOW_PROJECT_SUBFOLDER,
	persona: WRITE_REMEDIATION_STORY_WORKFLOW_PERSONA,
	entryPanel: { promptMarkdown: WRITE_REMEDIATION_STORY_WORKFLOW_DESCRIPTION },
	workflowValueKeys: WRITE_REMEDIATION_STORY_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: WRITE_REMEDIATION_STORY_ENTRY_PROJECT_VALUE_KEYS,
	prerequisiteFiles: WRITE_REMEDIATION_STORY_PREREQUISITE_FILES,
	workflowForms: { [WRITE_REMEDIATION_STORY_STEP_1_FORM_ID]: buildWriteRemediationStoryStep1WorkflowForm() },
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Validate Inputs",
			decisionTree: buildStep1DecisionTree(),
			buildToolSchema: buildWriteRemediationStoryStep1ToolSchemas,
		}),
		"step-2": createStepDefinition({
			stepNumber: 2,
			checklistLabel: "Locate Originating Story File",
			decisionTree: buildStep2DecisionTree(),
			buildToolSchema: buildWriteRemediationStoryStep2ToolSchemas,
		}),
		"step-3": createStepDefinition({
			stepNumber: 3,
			checklistLabel: "Complete Remediation Story",
			decisionTree: buildStep3DecisionTree(),
			buildPromptSource: buildStep3PromptSource,
			buildToolSchema: buildWriteRemediationStoryStep3ToolSchemas,
		}),
		"step-4": createStepDefinition({
			stepNumber: 4,
			checklistLabel: "Finalize Remediation Story",
			decisionTree: buildStep4DecisionTree(),
			buildToolSchema: buildWriteRemediationStoryStep4ToolSchemas,
		}),
	},
}
