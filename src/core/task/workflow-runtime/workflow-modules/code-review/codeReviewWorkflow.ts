import { access, readdir, readFile, writeFile } from "node:fs/promises"
import { basename, dirname, join, normalize } from "node:path"
import type { WorkflowFormDefinitionPayload } from "@shared/ExtensionMessage"
import { execa } from "execa"
import type { WorkflowToolBackedActionInstruction } from "@/core/task/workflow-step-resolution/types"
import { ClineDefaultTool } from "@/shared/tools"
import { WorkflowArtifactFamily } from "../../artifactFamilies"
import { buildEpicStoriesIndexFilename, parseWorkflowStoryIndexJson } from "../../storyArtifacts"
import type {
	ActiveWorkflowSession,
	WorkflowDecisionBranchTrigger,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowDeterministicProcedureResult,
	WorkflowFormContinuationReplacementBuilder,
	WorkflowPersonaDefinition,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowStepPromptSource,
	WorkflowValues,
} from "../../types"
import {
	buildCodeReviewStep1ToolSchemas,
	buildCodeReviewStep2ToolSchemas,
	buildCodeReviewStep3ToolSchemas,
	buildCodeReviewStep4ToolSchemas,
} from "./codeReviewToolSchemas"
import {
	buildReviewScopeManifestMarkdown,
	buildReviewScopeManifestModel,
	parseGitShowNameStatus,
	parseGitShowNumstat,
} from "./reviewScopeManifest"

export const CODE_REVIEW_WORKFLOW_NAME = "code-review"
export const CODE_REVIEW_WORKFLOW_SLASH_COMMAND_NAME = "code-review"
export const CODE_REVIEW_WORKFLOW_USE_SKILL_NAME = "code-review"
export const CODE_REVIEW_WORKFLOW_DISPLAY_NAME = "code review"
export const CODE_REVIEW_WORKFLOW_DESCRIPTION =
	"This workflow performs a thorough assessment of a completed story to ensure that the prescribed updates were implemented correctly. You should only run this workflow after a story has been implemented via the dev-story workflow, and the files touched during implementation have been staged and committed."
export const CODE_REVIEW_WORKFLOW_PROJECT_SUBFOLDER = "review"
export const CODE_REVIEW_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "Fred",
	role: "Quality Control",
	identity:
		"Coordinates quality review after implementation to ensure that code is functional and compliant before it ships to production.",
	capabilities: ["QA findings triage & documentation"],
	communicationStyle: "precise and detailed",
	principles: ["lazily formatted and noncompliant code must never hit the production environment."],
}

export enum CodeReviewWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	ReviewFolder = "review_folder",
	TargetStory = "target_story",
	SelectedStoryIdentity = "selected_story_identity",
	SelectedStoryFilename = "selected_story_filename",
	EpicIdentity = "epic_identity",
	StoriesIndex = "stories_index",
	EpicsDocument = "epics_document",
	ArchitectureDocument = "architecture_document",
	CodeReviewOutput = "code_review_output",
	CodeReviewOutputArtifactFamily = "code_review_output_artifact_family",
	CodeReviewOutputArtifactIdentity = "code_review_output_artifact_identity",
	CodeReviewOutputArtifactFilename = "code_review_output_artifact_filename",
	CodeReviewOutputArtifactRelativePath = "code_review_output_artifact_relative_path",
	ReviewScopeManifest = "review_scope_manifest",
	ReviewScopeManifestArtifactFamily = "review_scope_manifest_artifact_family",
	ReviewScopeManifestArtifactIdentity = "review_scope_manifest_artifact_identity",
	ReviewScopeManifestArtifactFilename = "review_scope_manifest_artifact_filename",
	ReviewScopeManifestArtifactRelativePath = "review_scope_manifest_artifact_relative_path",
	BlindReviewOutput = "blind_review_output",
	AcceptanceAuditOutput = "acceptance_audit_output",
	EdgeCaseReviewOutput = "edge_case_review_output",
	MissingSubagentOutputFiles = "missing_subagent_output_files",
	ReviewCommitHash = "review_commit_hash",
	ReviewCommitParent = "review_commit_parent",
	RemediationStory = "remediation_story",
	RemediationStoryArtifactFamily = "remediation_story_artifact_family",
	RemediationStoryArtifactIdentity = "remediation_story_artifact_identity",
	RemediationStoryArtifactFilename = "remediation_story_artifact_filename",
	RemediationStoryArtifactRelativePath = "remediation_story_artifact_relative_path",
	RemediationStoryParentIdentity = "remediation_story_parent_identity",
	ReviewFindingsPresent = "review_findings_present",
	UpstreamFindingsPresent = "upstream_findings_present",
}

export const CODE_REVIEW_WORKFLOW_VALUE_KEYS: readonly CodeReviewWorkflowValueKey[] = Object.values(CodeReviewWorkflowValueKey)

export const CODE_REVIEW_ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: CodeReviewWorkflowValueKey.ProjectMode,
	projectTitle: CodeReviewWorkflowValueKey.ProjectTitle,
	projectFolderName: CodeReviewWorkflowValueKey.ProjectFolderName,
} as const

export const CODE_REVIEW_TARGET_STORY_PREREQUISITE_ID = CodeReviewWorkflowValueKey.TargetStory
export const CODE_REVIEW_TARGET_STORY_FILENAME_PATTERN = /^(Story-\d+-\d+|Remediation-story-\d+-\d+-\d+)\.md$/
export const CODE_REVIEW_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]> = {
	[CODE_REVIEW_TARGET_STORY_PREREQUISITE_ID]: {
		id: CODE_REVIEW_TARGET_STORY_PREREQUISITE_ID,
		requirement: "required",
		producingWorkflowName: "dev-story",
		projectSubfolderSegments: ["implementation", "stories-review"],
		match: {
			kind: "naming_pattern",
			pattern: CODE_REVIEW_TARGET_STORY_FILENAME_PATTERN,
		},
		workflowValueKey: CodeReviewWorkflowValueKey.TargetStory,
		outputDocumentReference: "none",
	},
}

export const CODE_REVIEW_STEP_1_FORM_ID = "step-1-code-review-commit-form"
export const CODE_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID = "step-1-panel-a-commit-hash"
export const CODE_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID = "step-1-panel-b-invalid-commit"
export const CODE_REVIEW_COMMIT_HASH_FIELD_KEY = "commit_hash"
export const CODE_REVIEW_FINDINGS_DOCUMENT_INITIAL_CONTENT = `# Code Review Findings

## Task Failures

## Dev Agent Failures

## Upstream Failures
`

export const CODE_REVIEW_REMEDIATION_STORY_SHELL = `# Story

## General Instructions

## Objective

## Scope

## Scope Boundary

## Requirements

## Known Issues/ Risks/ Technical Debt

## Tasks

## Validation
`

const CODE_REVIEW_STEP_2_INITIAL_PROMPT = `You have been tasked with conducting a QA review for a completed development story through a structured review workflow. You will be provided with instructions which you must follow precisely. If at any point your next task seems unclear or ambiguous, stop and ask the user for guidance.

Your first task is to dispatch subagents and task them with performing specialized code reviews. Your role in this phase is to act as a coordinator while subagents perform the actual code review legwork. Do not perform your own code review. Let the subagents run their specialized workflows, then collect their findings.

*** Launch Subagents: ***
It is critical that you use the exact "use_skill" subagent prompt verbiage provided below. This verbiage triggers a runtime-driven workflow for the subagent which provides them with the instructions needed for their specialized code review.
Launch three subagents and assign their specialized code review workflows:
- Blind Review:
    - You MUST assign the appropriate workflow to this subagent by including this exact phrase, with identical formatting and punctuation in your prompt: Skill: use_skill('blind-review')
    - The blind-review workflow will then activate and provide the subagent with detailed instructions.
- Edge Case Hunter:
     - You MUST assign the appropriate workflow to this subagent by including this exact phrase, with identical formatting and punctuation in your prompt: Skill: use_skill('edge-case-hunter-review')
     - The edge-case-hunter workflow will then activate and provide the subagent with detailed instructions.
- Acceptance Audit Review:
    - You MUST assign the appropriate workflow to this subagent by including this exact phrase, with identical formatting and punctuation in your prompt: Skill: use_skill('acceptance-audit-review')
    - The acceptance-audit-review workflow will then activate and provide the subagent with detailed instructions.
- Track any review layer that fails, times out, or returns no useful output. Once the subagents complete their work, shut them down.

Once all three subagents are done and shut down, call workflow_progress_request to unlock the next workflow step's instructions.`

const CODE_REVIEW_STEP_3_PROMPT = `Subagent findings are available:
Blind Review: blind_review_output
Edge Case Hunter: edge_case_review_output
Acceptance Audit: acceptance_audit_output

You must read all three documents, assess them following the instructions below, then persist final findings using record_findings.

You may leverage the following additional documents when validating the subagents' findings:
- target_story
- review_scope_manifest
- epics_document
- architecture_document

*** You must build a combined findings record following the following guidelines: ***

1: Validate each finding using the available documentation, performing tightly-scoped line-targeted file reads only when necessary. Drop any findings which you determine to be invalid or false-positives.
2: Assign each finding to one or more of the following categories:
    - task failure: the story tasks/ subtasks failed to prescribe the exact correct revisions. For these findings, you must indicate the relevant task and/or subtask ID from the target story.
    - dev agent failure: the dev agent failed to implement the tasks/ subtasks exactly as written. For these findings, you must indicate the relevant task and/or subtask ID from the target story.
    - upstream failure: the project's backing documentation either prescribed an incorrect solution or underspecified the necessary solution. For these findings, you must indicate the supporting project document which requires revision to support resolution of the finding.

Call record_findings to persist your final set of validated and classified findings. In your tool call, use the following formatting:

{
  findings: Array<{
    finding: string
    categories: Array<"task_failure" | "dev_agent_failure" | "upstream_failure">
    description: string
  }>
}

Once you've persisted the final set of findings (if any), send the user a message providing them with the findings you persisted, or stating that the review is complete with no actionable findings.

After presenting findings to the user, call workflow_progress_request to unlock the next workflow step's instructions.`

const CODE_REVIEW_STEP_4_BASE_PROMPT = "Review the findings in code_review_output."

const CODE_REVIEW_STEP_4_UPSTREAM_FAILURE_PROMPT = `*** Conditional prompting: Runtime must assess the findings in the code-review-output document. If any findings are present under "upstream failure", then the following prompt must be shown: ***
For findings listed under "upstream failure", determine which project documents require revision before a remediation story can be generated. Project documents include:
- architecture_document
- epics_document

Determine the exact revisions necessary, then message the user providing the exact proposed revisions and justification. Upon user approval, update the project documents with the approved revisions only, then follow the additional instructions below.
*** end conditional prompt block ***`

const CODE_REVIEW_STEP_4_REMEDIATION_STORY_PROMPT = `*** Conditional prompting: shown only if a remediation story was generated: ***
You'll now prepare a remediation story based on the documented review findings.
Read the following relevant files:
- architecture_document
- epics_document
- target_story

The story file has been generated from a template for you here:
- remediation_story

Your task is to populate the following sections in the generated story document:
- objective
- scope
- scope boundary
- requirements
- known issues/ risks/ technical debt

Present proposed drafts for the content to be added to the user, and add it to the generated document upon user approval. Do not add, delete, or modify document headings.

You must not populate the tasks section of the story document. 

Once you've populated the assigned sections of the story document, use attempt_completion to send a final message to the user informing them that you have produced the remediation story. Include the full file path to the document in your message, which is remediation_story, and remind the user to run the write-remediation-story workflow to finalize the story by generating tasks and subtasks.
*** End conditional prompt block ***`

const CODE_REVIEW_FINDINGS_HEADINGS = ["## Task Failures", "## Dev Agent Failures", "## Upstream Failures"] as const

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

export const CODE_REVIEW_OUTPUT_ARTIFACT_ID = CodeReviewWorkflowValueKey.CodeReviewOutput
export const CODE_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID = CodeReviewWorkflowValueKey.ReviewScopeManifest
export const CODE_REVIEW_REMEDIATION_STORY_ARTIFACT_ID = CodeReviewWorkflowValueKey.RemediationStory

export const CODE_REVIEW_ARTIFACTS: NonNullable<WorkflowDefinition["artifacts"]> = {
	[CODE_REVIEW_OUTPUT_ARTIFACT_ID]: {
		id: CODE_REVIEW_OUTPUT_ARTIFACT_ID,
		family: WorkflowArtifactFamily.CodeReviewOutput,
		intentMode: "derived",
		parentIdentitySource: undefined,
		targetIdentitySource: {
			kind: "workflow_value",
			key: CodeReviewWorkflowValueKey.SelectedStoryIdentity,
		},
		outputValueKeys: {
			projectTitle: CodeReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: CodeReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: CodeReviewWorkflowValueKey.CodeReviewOutputArtifactFamily,
			artifactIdentity: CodeReviewWorkflowValueKey.CodeReviewOutputArtifactIdentity,
			artifactFilename: CodeReviewWorkflowValueKey.CodeReviewOutputArtifactFilename,
			artifactRelativePath: CodeReviewWorkflowValueKey.CodeReviewOutputArtifactRelativePath,
			artifactAbsolutePath: CodeReviewWorkflowValueKey.CodeReviewOutput,
			parentIdentity: undefined,
			targetIdentity: CodeReviewWorkflowValueKey.CodeReviewOutputArtifactIdentity,
		},
	},
	[CODE_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID]: {
		id: CODE_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID,
		family: WorkflowArtifactFamily.ReviewScopeManifest,
		intentMode: "derived",
		parentIdentitySource: undefined,
		targetIdentitySource: {
			kind: "workflow_value",
			key: CodeReviewWorkflowValueKey.SelectedStoryIdentity,
		},
		outputValueKeys: {
			projectTitle: CodeReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: CodeReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: CodeReviewWorkflowValueKey.ReviewScopeManifestArtifactFamily,
			artifactIdentity: CodeReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity,
			artifactFilename: CodeReviewWorkflowValueKey.ReviewScopeManifestArtifactFilename,
			artifactRelativePath: CodeReviewWorkflowValueKey.ReviewScopeManifestArtifactRelativePath,
			artifactAbsolutePath: CodeReviewWorkflowValueKey.ReviewScopeManifest,
			parentIdentity: undefined,
			targetIdentity: CodeReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity,
		},
	},
	[CODE_REVIEW_REMEDIATION_STORY_ARTIFACT_ID]: {
		id: CODE_REVIEW_REMEDIATION_STORY_ARTIFACT_ID,
		family: WorkflowArtifactFamily.RemediationStory,
		intentMode: "new",
		parentIdentitySource: {
			kind: "workflow_value",
			key: CodeReviewWorkflowValueKey.RemediationStoryParentIdentity,
		},
		targetIdentitySource: undefined,
		outputValueKeys: {
			projectTitle: CodeReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: CodeReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: CodeReviewWorkflowValueKey.RemediationStoryArtifactFamily,
			artifactIdentity: CodeReviewWorkflowValueKey.RemediationStoryArtifactIdentity,
			artifactFilename: CodeReviewWorkflowValueKey.RemediationStoryArtifactFilename,
			artifactRelativePath: CodeReviewWorkflowValueKey.RemediationStoryArtifactRelativePath,
			artifactAbsolutePath: CodeReviewWorkflowValueKey.RemediationStory,
			parentIdentity: CodeReviewWorkflowValueKey.RemediationStoryParentIdentity,
			targetIdentity: undefined,
		},
	},
}

function buildRuntimeRoutedTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"] {
	return {
		type: "runtime_routed",
	}
}

function buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"] {
	return {
		type: "conditional",
		conditionSourceKey: "__terminal__",
		branches: [],
		defaultTerminal: true,
	}
}

export function buildCodeReviewStep1WorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Identify Implementation Evidence",
		toolDictionaryTitle: "Identify Implementation Evidence",
		toolDictionaryMarkdown: "Provide the commit hash for the target story's commit.",
		firstPanelId: CODE_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
		panels: {
			[CODE_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID]: {
				panelId: CODE_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
				title: "Identify Implementation Evidence",
				promptMarkdown: "Provide the commit hash for the target story's commit.",
				fields: [
					{
						key: CODE_REVIEW_COMMIT_HASH_FIELD_KEY,
						kind: "small_text",
						label: "commit hash",
						required: true,
						allowedValueType: "string",
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "submit",
				},
				transition: buildRuntimeRoutedTransition(),
			},
			[CODE_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID]: {
				panelId: CODE_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
				title: "Invalid Commit Hash",
				promptMarkdown: "The provided commit hash is invalid. Please go back and provide a valid commit hash.",
				fields: [],
				allowedActions: ["back"],
				actionLabels: {
					back: "back",
				},
				transition: buildTerminalTransition(),
				backDestinationPanelId: CODE_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
			},
		},
	}
}

interface CodeReviewSelectedProjectRoot {
	selectedProjectRoot: string
	selectedStoryFilename: string
}

interface CodeReviewTargetStoryMetadata extends CodeReviewSelectedProjectRoot {
	selectedStoryIdentity: string
	epicIdentity: string
	storiesIndex: string
	reviewFolder: string
	epicsDocument: string
	architectureDocument: string
}

export interface CodeReviewGitCommandResult {
	exitCode: number
	stdout: string
	stderr: string
}

const PRIMARY_STORY_FILENAME_PATTERN = /^Story-(\d+)-(\d+)\.md$/
const REMEDIATION_STORY_FILENAME_PATTERN = /^Remediation-story-(\d+)-(\d+)-(\d+)\.md$/

function readWorkflowStringValue(workflowValues: WorkflowValues, key: CodeReviewWorkflowValueKey): string | undefined {
	const value = workflowValues[key]
	if (typeof value !== "string") {
		return undefined
	}

	const trimmedValue = value.trim()
	return trimmedValue.length > 0 ? trimmedValue : undefined
}

function readWorkflowStringArrayValue(workflowValues: WorkflowValues, key: CodeReviewWorkflowValueKey): readonly string[] {
	const value = workflowValues[key]
	if (Array.isArray(value) === false) {
		return []
	}

	const stringValues: string[] = []
	for (const item of value) {
		if (typeof item === "string" && item.trim().length > 0) {
			stringValues.push(item)
		}
	}

	return stringValues
}

function readWorkflowBooleanValue(workflowValues: WorkflowValues, key: CodeReviewWorkflowValueKey): boolean | undefined {
	const value = workflowValues[key]
	return typeof value === "boolean" ? value : undefined
}

function renderWorkflowValueByKey(input: WorkflowPromptBuilderInput, key: CodeReviewWorkflowValueKey): string {
	return input.renderWorkflowValue(input.session.workflowValues[key] ?? key)
}

function renderCodeReviewPromptTemplate(input: WorkflowPromptBuilderInput, template: string): string {
	return template
		.replaceAll("blind_review_output", renderWorkflowValueByKey(input, CodeReviewWorkflowValueKey.BlindReviewOutput))
		.replaceAll("acceptance_audit_output", renderWorkflowValueByKey(input, CodeReviewWorkflowValueKey.AcceptanceAuditOutput))
		.replaceAll("edge_case_review_output", renderWorkflowValueByKey(input, CodeReviewWorkflowValueKey.EdgeCaseReviewOutput))
		.replaceAll("code_review_output", renderWorkflowValueByKey(input, CodeReviewWorkflowValueKey.CodeReviewOutput))
		.replaceAll("target_story", renderWorkflowValueByKey(input, CodeReviewWorkflowValueKey.TargetStory))
		.replaceAll("review_scope_manifest", renderWorkflowValueByKey(input, CodeReviewWorkflowValueKey.ReviewScopeManifest))
		.replaceAll("epics_document", renderWorkflowValueByKey(input, CodeReviewWorkflowValueKey.EpicsDocument))
		.replaceAll("architecture_document", renderWorkflowValueByKey(input, CodeReviewWorkflowValueKey.ArchitectureDocument))
		.replaceAll("remediation_story", renderWorkflowValueByKey(input, CodeReviewWorkflowValueKey.RemediationStory))
}

function readFormStringValue(session: ActiveWorkflowSession, key: string): string | undefined {
	const formValue = session.ui.formSession?.values[key]
	if (formValue === undefined || formValue.valueType !== "string") {
		return undefined
	}

	const rawValue = formValue.stringValue
	if (typeof rawValue !== "string") {
		return undefined
	}

	const trimmedValue = rawValue.trim()
	return trimmedValue.length > 0 ? trimmedValue : undefined
}

function resolveReviewStoryProjectRoot(targetStory: string): CodeReviewSelectedProjectRoot | { errorMessage: string } {
	const normalizedTargetStory = normalize(targetStory)
	const selectedStoryFilename = basename(normalizedTargetStory)
	if (CODE_REVIEW_TARGET_STORY_FILENAME_PATTERN.test(selectedStoryFilename) === false) {
		return {
			errorMessage: `Code Review setup failed: target story filename ${selectedStoryFilename} does not match the required story filename pattern.`,
		}
	}

	const reviewStoriesFolder = dirname(normalizedTargetStory)
	const implementationFolder = dirname(reviewStoriesFolder)
	if (basename(reviewStoriesFolder) !== "stories-review" || basename(implementationFolder) !== "implementation") {
		return {
			errorMessage: `Code Review setup failed: target story path ${normalizedTargetStory} must remain under implementation/stories-review.`,
		}
	}

	return {
		selectedProjectRoot: dirname(implementationFolder),
		selectedStoryFilename,
	}
}

function deriveStoryIdentityFromFilename(selectedStoryFilename: string): string | { errorMessage: string } {
	const primaryMatch = selectedStoryFilename.match(PRIMARY_STORY_FILENAME_PATTERN)
	if (primaryMatch) {
		const epicIdentity = primaryMatch[1]
		const storyNumber = primaryMatch[2]
		if (epicIdentity !== undefined && storyNumber !== undefined) {
			return `${epicIdentity}.${storyNumber}`
		}
	}

	const remediationMatch = selectedStoryFilename.match(REMEDIATION_STORY_FILENAME_PATTERN)
	if (remediationMatch) {
		const epicIdentity = remediationMatch[1]
		const storyNumber = remediationMatch[2]
		const remediationNumber = remediationMatch[3]
		if (epicIdentity !== undefined && storyNumber !== undefined && remediationNumber !== undefined) {
			return `${epicIdentity}.${storyNumber}.${remediationNumber}`
		}
	}

	return {
		errorMessage: `Code Review setup failed: could not derive selected story identity from ${selectedStoryFilename}.`,
	}
}

function deriveEpicIdentity(selectedStoryIdentity: string): string | { errorMessage: string } {
	const epicIdentity = selectedStoryIdentity.split(".")[0]
	if (epicIdentity === undefined || /^\d+$/.test(epicIdentity) === false) {
		return {
			errorMessage: `Code Review setup failed: could not derive epic identity from selected story identity ${selectedStoryIdentity}.`,
		}
	}

	return epicIdentity
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path)
		return true
	} catch {
		return false
	}
}

async function validateRequiredPath(args: { path: string; description: string }): Promise<string | undefined> {
	if ((await pathExists(args.path)) === true) {
		return undefined
	}

	return `Code Review setup failed: required ${args.description} does not exist at ${args.path}.`
}

async function validateStoryIndexForTarget(args: {
	storiesIndex: string
	selectedStoryIdentity: string
	selectedStoryFilename: string
}): Promise<string | undefined> {
	let storyIndexText: string
	try {
		storyIndexText = await readFile(args.storiesIndex, "utf8")
	} catch (error) {
		const detail = error instanceof Error ? ` ${error.message}` : ""
		return `Code Review setup failed: stories index could not be read at ${args.storiesIndex}.${detail}`
	}

	try {
		const storyIndex = parseWorkflowStoryIndexJson(storyIndexText)
		const matchingStory = storyIndex.stories.find((story) => story.story_identity === args.selectedStoryIdentity)
		if (matchingStory === undefined) {
			return `Code Review setup failed: stories index ${args.storiesIndex} does not contain selected story identity ${args.selectedStoryIdentity}.`
		}
		if (matchingStory.story_file_name !== args.selectedStoryFilename) {
			return `Code Review setup failed: stories index ${args.storiesIndex} maps selected story identity ${args.selectedStoryIdentity} to ${matchingStory.story_file_name}, not ${args.selectedStoryFilename}.`
		}
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error)
		return `Code Review setup failed: stories index ${args.storiesIndex} is invalid for selected story ${args.selectedStoryIdentity}. ${detail}`
	}

	return undefined
}

async function deriveTargetStoryMetadata(targetStory: string): Promise<CodeReviewTargetStoryMetadata | { errorMessage: string }> {
	const projectRootResult = resolveReviewStoryProjectRoot(targetStory)
	if ("errorMessage" in projectRootResult) {
		return projectRootResult
	}

	const selectedStoryIdentity = deriveStoryIdentityFromFilename(projectRootResult.selectedStoryFilename)
	if (typeof selectedStoryIdentity !== "string") {
		return selectedStoryIdentity
	}

	const epicIdentity = deriveEpicIdentity(selectedStoryIdentity)
	if (typeof epicIdentity !== "string") {
		return epicIdentity
	}

	const storiesIndex = join(
		projectRootResult.selectedProjectRoot,
		"implementation",
		buildEpicStoriesIndexFilename(epicIdentity),
	)
	const reviewFolder = join(projectRootResult.selectedProjectRoot, "review")
	const epicsDocument = join(projectRootResult.selectedProjectRoot, "planning", "Epics.md")
	const architectureDocument = join(projectRootResult.selectedProjectRoot, "planning", "architecture.md")
	const requiredPathFailures = [
		await validateRequiredPath({ path: targetStory, description: "target story" }),
		await validateRequiredPath({ path: storiesIndex, description: "stories index" }),
		await validateRequiredPath({ path: epicsDocument, description: "epics document" }),
		await validateRequiredPath({ path: architectureDocument, description: "architecture document" }),
	].filter((failure): failure is string => failure !== undefined)
	if (requiredPathFailures.length > 0) {
		return { errorMessage: requiredPathFailures[0] ?? "Code Review setup failed: required path validation failed." }
	}

	const storyIndexFailure = await validateStoryIndexForTarget({
		storiesIndex,
		selectedStoryIdentity,
		selectedStoryFilename: projectRootResult.selectedStoryFilename,
	})
	if (storyIndexFailure !== undefined) {
		return { errorMessage: storyIndexFailure }
	}

	return {
		...projectRootResult,
		selectedStoryIdentity,
		epicIdentity,
		storiesIndex,
		reviewFolder,
		epicsDocument,
		architectureDocument,
	}
}

export async function deriveCodeReviewTargetStoryValues(
	session: ActiveWorkflowSession,
): Promise<WorkflowDeterministicProcedureResult> {
	const targetStory = readWorkflowStringValue(session.workflowValues, CodeReviewWorkflowValueKey.TargetStory)
	if (targetStory === undefined) {
		return {
			kind: "failed",
			errorMessage: "Code Review setup failed: target_story workflow value is missing.",
		}
	}

	const metadata = await deriveTargetStoryMetadata(targetStory)
	if ("errorMessage" in metadata) {
		return {
			kind: "failed",
			errorMessage: metadata.errorMessage,
		}
	}

	return {
		kind: "succeeded",
		workflowValueWrites: {
			[CodeReviewWorkflowValueKey.SelectedStoryFilename]: metadata.selectedStoryFilename,
			[CodeReviewWorkflowValueKey.SelectedStoryIdentity]: metadata.selectedStoryIdentity,
			[CodeReviewWorkflowValueKey.EpicIdentity]: metadata.epicIdentity,
			[CodeReviewWorkflowValueKey.StoriesIndex]: metadata.storiesIndex,
			[CodeReviewWorkflowValueKey.ReviewFolder]: metadata.reviewFolder,
			[CodeReviewWorkflowValueKey.EpicsDocument]: metadata.epicsDocument,
			[CodeReviewWorkflowValueKey.ArchitectureDocument]: metadata.architectureDocument,
		},
	}
}

export async function runCodeReviewGitCommand(args: {
	selectedProjectRoot: string
	gitArgs: readonly string[]
}): Promise<CodeReviewGitCommandResult> {
	const result = await execa("git", [...args.gitArgs], {
		cwd: args.selectedProjectRoot,
		shell: false,
		reject: false,
	})
	const exitCode = typeof result.exitCode === "number" ? result.exitCode : 1

	return {
		exitCode,
		stdout: result.stdout,
		stderr: result.stderr,
	}
}

function gitCommandFailed(result: CodeReviewGitCommandResult): boolean {
	return result.exitCode !== 0
}

export async function validateAndPersistReviewCommit(
	session: ActiveWorkflowSession,
): Promise<WorkflowDeterministicProcedureResult> {
	const targetStory = readWorkflowStringValue(session.workflowValues, CodeReviewWorkflowValueKey.TargetStory)
	if (targetStory === undefined) {
		return {
			kind: "failed",
			errorMessage: "Code Review commit validation failed: target_story workflow value is missing.",
		}
	}

	const projectRootResult = resolveReviewStoryProjectRoot(targetStory)
	if ("errorMessage" in projectRootResult) {
		return {
			kind: "failed",
			errorMessage: projectRootResult.errorMessage,
		}
	}

	const submittedCommitHash = readFormStringValue(session, CODE_REVIEW_COMMIT_HASH_FIELD_KEY)
	if (submittedCommitHash === undefined) {
		return { kind: "succeeded" }
	}

	const gitRepositoryCheck = await runCodeReviewGitCommand({
		selectedProjectRoot: projectRootResult.selectedProjectRoot,
		gitArgs: ["rev-parse", "--is-inside-work-tree"],
	})
	if (gitCommandFailed(gitRepositoryCheck)) {
		return { kind: "succeeded" }
	}

	const commitResolution = await runCodeReviewGitCommand({
		selectedProjectRoot: projectRootResult.selectedProjectRoot,
		gitArgs: ["rev-parse", "--verify", `${submittedCommitHash}^{commit}`],
	})
	if (gitCommandFailed(commitResolution)) {
		return { kind: "succeeded" }
	}

	const normalizedCommitHash = commitResolution.stdout.trim()
	if (normalizedCommitHash.length === 0) {
		return { kind: "succeeded" }
	}

	const parentResolution = await runCodeReviewGitCommand({
		selectedProjectRoot: projectRootResult.selectedProjectRoot,
		gitArgs: ["rev-parse", `${normalizedCommitHash}^`],
	})
	if (gitCommandFailed(parentResolution)) {
		return { kind: "succeeded" }
	}

	const parentHash = parentResolution.stdout.trim()
	if (parentHash.length === 0) {
		return { kind: "succeeded" }
	}

	return {
		kind: "succeeded",
		workflowValueWrites: {
			[CodeReviewWorkflowValueKey.ReviewCommitHash]: normalizedCommitHash,
			[CodeReviewWorkflowValueKey.ReviewCommitParent]: parentHash,
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

function toolBackedOperationSucceededFromAny(
	sourceRoutes: readonly { branchId: string; routeId: string }[],
): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "tool_backed_operation_succeeded" &&
			sourceRoutes.some((sourceRoute) =>
				sourceRouteMatches(triggerEvent.sourceRoute, sourceRoute.branchId, sourceRoute.routeId),
			),
	}
}

function toolBackedOperationFailedFromAny(
	sourceRoutes: readonly { branchId: string; routeId: string }[],
): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "tool_backed_operation_failed" &&
			sourceRoutes.some((sourceRoute) =>
				sourceRouteMatches(triggerEvent.sourceRoute, sourceRoute.branchId, sourceRoute.routeId),
			),
	}
}

function workflowFormPanelSubmitted(panelId: string, action: "submit" | "back"): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_form_panel_submitted" &&
			triggerEvent.workflowFormId === CODE_REVIEW_STEP_1_FORM_ID &&
			triggerEvent.panelId === panelId &&
			triggerEvent.action === action,
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

function reviewCommitHashIsValid(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, CodeReviewWorkflowValueKey.ReviewCommitHash) !== undefined &&
			readWorkflowStringValue(workflowValues, CodeReviewWorkflowValueKey.ReviewCommitParent) !== undefined,
	}
}

function childOutputsAreReady(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, CodeReviewWorkflowValueKey.BlindReviewOutput) !== undefined &&
			readWorkflowStringValue(workflowValues, CodeReviewWorkflowValueKey.AcceptanceAuditOutput) !== undefined &&
			readWorkflowStringValue(workflowValues, CodeReviewWorkflowValueKey.EdgeCaseReviewOutput) !== undefined &&
			readWorkflowStringArrayValue(workflowValues, CodeReviewWorkflowValueKey.MissingSubagentOutputFiles).length === 0,
	}
}

function childOutputsAreMissing(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringArrayValue(workflowValues, CodeReviewWorkflowValueKey.MissingSubagentOutputFiles).length > 0,
	}
}

function reviewFindingsAreAbsent(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowBooleanValue(workflowValues, CodeReviewWorkflowValueKey.ReviewFindingsPresent) === false,
	}
}

function reviewFindingsArePresent(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowBooleanValue(workflowValues, CodeReviewWorkflowValueKey.ReviewFindingsPresent) === true,
	}
}

function reviewCommitHashIsInvalid(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, CodeReviewWorkflowValueKey.ReviewCommitHash) === undefined ||
			readWorkflowStringValue(workflowValues, CodeReviewWorkflowValueKey.ReviewCommitParent) === undefined,
	}
}

function buildStep1ContinuationReplacementBuilder(panelId: string): WorkflowFormContinuationReplacementBuilder {
	return () => {
		const panel = buildCodeReviewStep1WorkflowForm().panels[panelId]
		if (panel === undefined) {
			throw new Error(`Code Review Step 1 workflow form is missing requested continuation panel ${panelId}.`)
		}

		return {
			panel,
			data: {},
		}
	}
}

function formatGitCommandFailure(args: { operation: string; result: CodeReviewGitCommandResult }): string {
	const stderr = args.result.stderr.trim()
	const stdout = args.result.stdout.trim()
	const detail = stderr.length > 0 ? stderr : stdout
	return detail.length > 0
		? `Code Review review-scope preparation failed during ${args.operation}: ${detail}`
		: `Code Review review-scope preparation failed during ${args.operation}.`
}

function parseGitOutputFailure(args: {
	operation: string
	failures: readonly { lineNumber: number; message: string }[]
}): string {
	const detail = args.failures.map((failure) => `line ${failure.lineNumber}: ${failure.message}`).join("; ")
	return `Code Review review-scope preparation failed during ${args.operation}: ${detail}`
}

export async function buildAndPersistReviewScopeManifest(
	session: ActiveWorkflowSession,
): Promise<WorkflowDeterministicProcedureResult> {
	const targetStory = readWorkflowStringValue(session.workflowValues, CodeReviewWorkflowValueKey.TargetStory)
	const reviewScopeManifest = readWorkflowStringValue(session.workflowValues, CodeReviewWorkflowValueKey.ReviewScopeManifest)
	const commitHash = readWorkflowStringValue(session.workflowValues, CodeReviewWorkflowValueKey.ReviewCommitHash)
	const parentHash = readWorkflowStringValue(session.workflowValues, CodeReviewWorkflowValueKey.ReviewCommitParent)
	if (targetStory === undefined || reviewScopeManifest === undefined || commitHash === undefined || parentHash === undefined) {
		return {
			kind: "failed",
			errorMessage:
				"Code Review review-scope preparation failed: target_story, review_scope_manifest, review_commit_hash, and review_commit_parent workflow values are required.",
		}
	}

	const projectRootResult = resolveReviewStoryProjectRoot(targetStory)
	if ("errorMessage" in projectRootResult) {
		return { kind: "failed", errorMessage: projectRootResult.errorMessage }
	}

	const nameStatusOutput = await runCodeReviewGitCommand({
		selectedProjectRoot: projectRootResult.selectedProjectRoot,
		gitArgs: ["show", "--name-status", "--format=", commitHash],
	})
	if (gitCommandFailed(nameStatusOutput)) {
		return {
			kind: "failed",
			errorMessage: formatGitCommandFailure({ operation: "git show --name-status", result: nameStatusOutput }),
		}
	}

	const numstatOutput = await runCodeReviewGitCommand({
		selectedProjectRoot: projectRootResult.selectedProjectRoot,
		gitArgs: ["show", "--numstat", "--format=", commitHash],
	})
	if (gitCommandFailed(numstatOutput)) {
		return {
			kind: "failed",
			errorMessage: formatGitCommandFailure({ operation: "git show --numstat", result: numstatOutput }),
		}
	}

	const parsedNameStatus = parseGitShowNameStatus(nameStatusOutput.stdout)
	if (parsedNameStatus.ok === false) {
		return {
			kind: "failed",
			errorMessage: parseGitOutputFailure({
				operation: "git show --name-status parsing",
				failures: parsedNameStatus.failures,
			}),
		}
	}

	const parsedNumstat = parseGitShowNumstat(numstatOutput.stdout)
	if (parsedNumstat.ok === false) {
		return {
			kind: "failed",
			errorMessage: parseGitOutputFailure({
				operation: "git show --numstat parsing",
				failures: parsedNumstat.failures,
			}),
		}
	}

	let storyMarkdown: string
	try {
		storyMarkdown = await readFile(targetStory, "utf8")
	} catch (error) {
		const detail = error instanceof Error ? ` ${error.message}` : ""
		return {
			kind: "failed",
			errorMessage: `Code Review review-scope preparation failed while reading target story ${targetStory}.${detail}`,
		}
	}

	const manifestModel = buildReviewScopeManifestModel({
		commitHash,
		parentHash,
		targetStoryPath: targetStory,
		selectedProjectRoot: projectRootResult.selectedProjectRoot,
		storyMarkdown,
		nameStatusRecords: parsedNameStatus.records,
		numstatRecords: parsedNumstat.records,
	})
	if (manifestModel.ok === false) {
		return {
			kind: "failed",
			errorMessage: manifestModel.errorMessage,
		}
	}

	try {
		await writeFile(reviewScopeManifest, buildReviewScopeManifestMarkdown(manifestModel.manifest), "utf8")
	} catch (error) {
		const detail = error instanceof Error ? ` ${error.message}` : ""
		return {
			kind: "failed",
			errorMessage: `Code Review review-scope preparation failed while writing review scope manifest ${reviewScopeManifest}.${detail}`,
		}
	}

	return { kind: "succeeded" }
}

function buildExpectedChildOutputFilenames(selectedStoryIdentity: string): {
	blindReviewFilename: string
	acceptanceAuditFilename: string
	edgeCaseReviewFilename: string
} {
	const targetIdentity = selectedStoryIdentity.replace(/\./g, "-")
	return {
		blindReviewFilename: `blind-review-${targetIdentity}.md`,
		acceptanceAuditFilename: `acceptance-audit-${targetIdentity}.md`,
		edgeCaseReviewFilename: `edge-case-hunter-${targetIdentity}.md`,
	}
}

async function fileExistsAndIsNonEmpty(path: string): Promise<boolean> {
	try {
		const content = await readFile(path, "utf8")
		return content.trim().length > 0
	} catch {
		return false
	}
}

export async function discoverChildReviewOutputs(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult> {
	const selectedStoryIdentity = readWorkflowStringValue(
		session.workflowValues,
		CodeReviewWorkflowValueKey.SelectedStoryIdentity,
	)
	const reviewFolder = readWorkflowStringValue(session.workflowValues, CodeReviewWorkflowValueKey.ReviewFolder)
	if (selectedStoryIdentity === undefined || reviewFolder === undefined) {
		return {
			kind: "failed",
			errorMessage:
				"Code Review child-output discovery failed: selected_story_identity and review_folder workflow values are required.",
		}
	}

	const expectedFilenames = buildExpectedChildOutputFilenames(selectedStoryIdentity)
	let reviewEntries: readonly string[]
	try {
		reviewEntries = await readdir(reviewFolder)
	} catch {
		reviewEntries = []
	}

	const expectedOutputPaths = [
		{
			filename: expectedFilenames.blindReviewFilename,
			workflowValueKey: CodeReviewWorkflowValueKey.BlindReviewOutput,
		},
		{
			filename: expectedFilenames.acceptanceAuditFilename,
			workflowValueKey: CodeReviewWorkflowValueKey.AcceptanceAuditOutput,
		},
		{
			filename: expectedFilenames.edgeCaseReviewFilename,
			workflowValueKey: CodeReviewWorkflowValueKey.EdgeCaseReviewOutput,
		},
	]
	const missingFilenames: string[] = []
	const workflowValueWrites: WorkflowValues = {}

	for (const expectedOutputPath of expectedOutputPaths) {
		const outputPath = join(reviewFolder, expectedOutputPath.filename)
		if (
			reviewEntries.includes(expectedOutputPath.filename) === false ||
			(await fileExistsAndIsNonEmpty(outputPath)) === false
		) {
			missingFilenames.push(expectedOutputPath.filename)
			continue
		}

		workflowValueWrites[expectedOutputPath.workflowValueKey] = outputPath
	}

	if (missingFilenames.length > 0) {
		return {
			kind: "succeeded",
			workflowValueWrites: {
				[CodeReviewWorkflowValueKey.MissingSubagentOutputFiles]: missingFilenames,
			},
		}
	}

	return {
		kind: "succeeded",
		workflowValueWrites: {
			...workflowValueWrites,
			[CodeReviewWorkflowValueKey.MissingSubagentOutputFiles]: [],
		},
	}
}

function buildStep1DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-1-resolve-target-story",
		branches: {
			"step-1-resolve-target-story": {
				id: "step-1-resolve-target-story",
				routes: [
					{
						id: "step-1-resolve-target-story",
						trigger: { kind: "always" },
						action: {
							kind: "resolve_prerequisite_files",
							prerequisiteIds: [CODE_REVIEW_TARGET_STORY_PREREQUISITE_ID],
						},
						followingBranchId: "step-1-derive-target-story-values",
					},
				],
			},
			"step-1-derive-target-story-values": {
				id: "step-1-derive-target-story-values",
				routes: [
					{
						id: "step-1-derive-target-story-values",
						trigger: { kind: "always" },
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveCodeReviewTargetStoryValues,
							},
						},
						followingBranchId: "step-1-allocate-code-review-output",
					},
				],
			},
			"step-1-allocate-code-review-output": {
				id: "step-1-allocate-code-review-output",
				routes: [
					{
						id: "step-1-allocate-code-review-output",
						trigger: { kind: "always" },
						action: {
							kind: "allocate_artifact",
							artifactId: CODE_REVIEW_OUTPUT_ARTIFACT_ID,
						},
						followingBranchId: "step-1-await-code-review-output-allocation",
					},
				],
			},
			"step-1-await-code-review-output-allocation": {
				id: "step-1-await-code-review-output-allocation",
				routes: [
					{
						id: "step-1-build-initial-code-review-output",
						trigger: toolBackedOperationSucceeded(
							"step-1-allocate-code-review-output",
							"step-1-allocate-code-review-output",
						),
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: CODE_REVIEW_OUTPUT_ARTIFACT_ID,
								buildContent: () => CODE_REVIEW_FINDINGS_DOCUMENT_INITIAL_CONTENT,
							},
						},
						followingBranchId: "step-1-await-code-review-output-build",
					},
				],
			},
			"step-1-await-code-review-output-build": {
				id: "step-1-await-code-review-output-build",
				routes: [
					{
						id: "step-1-render-commit-hash-panel",
						trigger: toolBackedOperationSucceeded(
							"step-1-await-code-review-output-allocation",
							"step-1-build-initial-code-review-output",
						),
						action: {
							kind: "render_workflow_form",
							workflowFormId: CODE_REVIEW_STEP_1_FORM_ID,
							startPanelId: CODE_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
						},
						followingBranchId: "step-1-await-commit-form-panel",
					},
				],
			},
			"step-1-await-commit-form-panel": {
				id: "step-1-await-commit-form-panel",
				routes: [
					{
						id: "step-1-validate-commit-hash",
						trigger: workflowFormPanelSubmitted(CODE_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID, "submit"),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: validateAndPersistReviewCommit,
							},
						},
						followingBranchId: "step-1-route-after-commit-validation",
					},
				],
			},
			"step-1-route-after-commit-validation": {
				id: "step-1-route-after-commit-validation",
				routes: [
					{
						id: "step-1-allocate-review-scope-manifest",
						trigger: reviewCommitHashIsValid(),
						action: {
							kind: "allocate_artifact",
							artifactId: CODE_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID,
						},
						followingBranchId: "step-1-await-review-scope-manifest-allocation",
					},
					{
						id: "step-1-continue-to-invalid-commit-panel",
						trigger: reviewCommitHashIsInvalid(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: CODE_REVIEW_STEP_1_FORM_ID,
							panelId: CODE_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								CODE_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
							),
						},
						followingBranchId: "step-1-await-commit-form-panel",
					},
				],
			},
			"step-1-await-review-scope-manifest-allocation": {
				id: "step-1-await-review-scope-manifest-allocation",
				routes: [
					{
						id: "step-1-build-review-scope-manifest",
						trigger: toolBackedOperationSucceeded(
							"step-1-route-after-commit-validation",
							"step-1-allocate-review-scope-manifest",
						),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: buildAndPersistReviewScopeManifest,
							},
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

function buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const missingSubagentOutputFiles = readWorkflowStringArrayValue(
		input.session.workflowValues,
		CodeReviewWorkflowValueKey.MissingSubagentOutputFiles,
	)
	if (missingSubagentOutputFiles.length === 0) {
		return {
			currentStepInstructions: CODE_REVIEW_STEP_2_INITIAL_PROMPT,
		}
	}

	return {
		currentStepInstructions: `These subagent output files were not found in the project's review folder:
${missingSubagentOutputFiles.join("\n")}
Please launch a new subagent and assign them to the workflow associated with the missing file.`,
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
						action: {
							kind: "project_prompt",
						},
						followingBranchId: "step-2-await-progress-request",
					},
				],
			},
			"step-2-await-progress-request": {
				id: "step-2-await-progress-request",
				routes: [
					{
						id: "step-2-discover-child-review-outputs",
						trigger: workflowProgressRequestConfirmed(),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: discoverChildReviewOutputs,
							},
						},
						followingBranchId: "step-2-route-after-child-output-discovery",
					},
					{
						id: "step-2-return-to-project-prompt-after-denial",
						trigger: workflowProgressRequestDenied(),
						action: {
							kind: "project_prompt",
						},
					},
				],
			},
			"step-2-route-after-child-output-discovery": {
				id: "step-2-route-after-child-output-discovery",
				routes: [
					{
						id: "step-2-transition-to-step-3",
						trigger: childOutputsAreReady(),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 3,
							},
						},
					},
					{
						id: "step-2-project-missing-output-prompt",
						trigger: childOutputsAreMissing(),
						action: {
							kind: "project_prompt",
						},
						followingBranchId: "step-2-await-progress-request",
					},
				],
			},
		},
	}
}

function buildStep3PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	return {
		currentStepInstructions: renderCodeReviewPromptTemplate(input, CODE_REVIEW_STEP_3_PROMPT),
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
						action: {
							kind: "project_prompt",
						},
						followingBranchId: "step-3-await-progress-request",
					},
				],
			},
			"step-3-await-progress-request": {
				id: "step-3-await-progress-request",
				routes: [
					{
						id: "step-3-transition-to-step-4",
						trigger: workflowProgressRequestConfirmed(),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 4,
							},
						},
					},
					{
						id: "step-3-return-to-project-prompt-after-denial",
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

function buildStep4PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const promptSections = [CODE_REVIEW_STEP_4_BASE_PROMPT]
	if (readWorkflowBooleanValue(input.session.workflowValues, CodeReviewWorkflowValueKey.UpstreamFindingsPresent) === true) {
		promptSections.push(CODE_REVIEW_STEP_4_UPSTREAM_FAILURE_PROMPT)
	}
	if (readWorkflowStringValue(input.session.workflowValues, CodeReviewWorkflowValueKey.RemediationStory) !== undefined) {
		promptSections.push(CODE_REVIEW_STEP_4_REMEDIATION_STORY_PROMPT)
	}

	const joinedPrompt = promptSections.join("\n\n")
	return {
		currentStepInstructions: renderCodeReviewPromptTemplate(input, joinedPrompt),
	}
}

function findHeadingContent(markdown: string, heading: string): string | undefined {
	const lines = markdown.replace(/\r\n/g, "\n").split("\n")
	const headingIndex = lines.findIndex((line) => line.trim() === heading)
	if (headingIndex === -1) {
		return undefined
	}

	let endIndex = lines.length
	for (let index = headingIndex + 1; index < lines.length; index += 1) {
		if (/^##\s+/.test(lines[index] ?? "")) {
			endIndex = index
			break
		}
	}

	return lines
		.slice(headingIndex + 1, endIndex)
		.join("\n")
		.trim()
}

function deriveRemediationStoryParentIdentity(selectedStoryIdentity: string): string | { errorMessage: string } {
	const identitySegments = selectedStoryIdentity.split(".")
	const epicIdentity = identitySegments[0]
	const storyNumber = identitySegments[1]
	if (
		epicIdentity === undefined ||
		storyNumber === undefined ||
		/^\d+$/.test(epicIdentity) === false ||
		/^\d+$/.test(storyNumber) === false
	) {
		return {
			errorMessage: `Code Review findings evaluation failed: selected_story_identity ${selectedStoryIdentity} must contain at least epic and story numeric segments.`,
		}
	}

	return `${epicIdentity}.${storyNumber}`
}

export async function evaluateCodeReviewFindings(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult> {
	const codeReviewOutput = readWorkflowStringValue(session.workflowValues, CodeReviewWorkflowValueKey.CodeReviewOutput)
	if (codeReviewOutput === undefined) {
		return {
			kind: "failed",
			errorMessage: "Code Review findings evaluation failed: code_review_output workflow value is missing.",
		}
	}

	const selectedStoryIdentity = readWorkflowStringValue(
		session.workflowValues,
		CodeReviewWorkflowValueKey.SelectedStoryIdentity,
	)
	if (selectedStoryIdentity === undefined) {
		return {
			kind: "failed",
			errorMessage: "Code Review findings evaluation failed: selected_story_identity workflow value is missing.",
		}
	}

	let findingsMarkdown: string
	try {
		findingsMarkdown = await readFile(codeReviewOutput, "utf8")
	} catch (error) {
		const detail = error instanceof Error ? ` ${error.message}` : ""
		return {
			kind: "failed",
			errorMessage: `Code Review findings evaluation failed: code_review_output could not be read at ${codeReviewOutput}.${detail}`,
		}
	}

	const sectionContents: string[] = []
	for (const heading of CODE_REVIEW_FINDINGS_HEADINGS) {
		const content = findHeadingContent(findingsMarkdown, heading)
		if (content === undefined) {
			return {
				kind: "failed",
				errorMessage: `Code Review findings evaluation failed: code_review_output is missing required heading ${heading}.`,
			}
		}
		sectionContents.push(content)
	}

	const remediationStoryParentIdentity = deriveRemediationStoryParentIdentity(selectedStoryIdentity)
	if (typeof remediationStoryParentIdentity !== "string") {
		return {
			kind: "failed",
			errorMessage: remediationStoryParentIdentity.errorMessage,
		}
	}

	const upstreamFindings = findHeadingContent(findingsMarkdown, "## Upstream Failures")
	return {
		kind: "succeeded",
		workflowValueWrites: {
			[CodeReviewWorkflowValueKey.ReviewFindingsPresent]: sectionContents.some((content) => content.length > 0),
			[CodeReviewWorkflowValueKey.UpstreamFindingsPresent]: upstreamFindings !== undefined && upstreamFindings.length > 0,
			[CodeReviewWorkflowValueKey.RemediationStoryParentIdentity]: remediationStoryParentIdentity,
		},
	}
}

export function failWithToolBackedOperationReason(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult {
	const errorMessage = session.branchContext.failureState?.terminalErrorMessage ?? "Tool-backed operation failed."
	return {
		kind: "failed",
		errorMessage,
	}
}

export function buildPlanRemediationStoryArtifactInstruction(): WorkflowToolBackedActionInstruction {
	return {
		toolName: ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT,
		buildStatusDefinition: () => ({
			title: "Plan Remediation Story",
			pendingLabel: "Planning remediation story",
			successLabel: "Planned remediation story",
			failureLabel: "Failed to plan remediation story",
		}),
		buildToolExecutionRequest: ({ activeWorkflowSession }) => ({
			toolName: ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT,
			toolInput: {},
			toolParams: {
				epic_identity:
					readWorkflowStringValue(activeWorkflowSession.workflowValues, CodeReviewWorkflowValueKey.EpicIdentity) ?? "",
				target_story_identity:
					readWorkflowStringValue(
						activeWorkflowSession.workflowValues,
						CodeReviewWorkflowValueKey.RemediationStoryParentIdentity,
					) ?? "",
			},
		}),
		evaluateToolExecutionResult: () => ({
			succeeded: true,
		}),
	}
}

function buildStep4DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-4-evaluate-findings",
		branches: {
			"step-4-evaluate-findings": {
				id: "step-4-evaluate-findings",
				routes: [
					{
						id: "step-4-evaluate-findings",
						trigger: { kind: "always" },
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: evaluateCodeReviewFindings,
							},
						},
						followingBranchId: "step-4-route-after-findings-evaluation",
					},
				],
			},
			"step-4-route-after-findings-evaluation": {
				id: "step-4-route-after-findings-evaluation",
				routes: [
					{
						id: "step-4-plan-remediation-story",
						trigger: reviewFindingsArePresent(),
						action: {
							kind: "execute_tool_backed_operation",
							instruction: buildPlanRemediationStoryArtifactInstruction(),
						},
						followingBranchId: "step-4-await-remediation-story-planning",
					},
					{
						id: "step-4-update-selected-story-status-no-findings",
						trigger: reviewFindingsAreAbsent(),
						action: {
							kind: "update_story_index_status",
							storyIndexWorkflowValueKey: CodeReviewWorkflowValueKey.StoriesIndex,
							storyIdentityWorkflowValueKey: CodeReviewWorkflowValueKey.SelectedStoryIdentity,
							status: "complete",
							expectedCurrentStatus: "review",
						},
						followingBranchId: "step-4-await-selected-story-status-update",
					},
				],
			},
			"step-4-await-remediation-story-planning": {
				id: "step-4-await-remediation-story-planning",
				routes: [
					{
						id: "step-4-allocate-remediation-story",
						trigger: toolBackedOperationSucceeded(
							"step-4-route-after-findings-evaluation",
							"step-4-plan-remediation-story",
						),
						action: {
							kind: "allocate_artifact",
							artifactId: CODE_REVIEW_REMEDIATION_STORY_ARTIFACT_ID,
						},
						followingBranchId: "step-4-await-remediation-story-allocation",
					},
					{
						id: "step-4-fail-after-remediation-story-planning",
						trigger: toolBackedOperationFailed(
							"step-4-route-after-findings-evaluation",
							"step-4-plan-remediation-story",
						),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: failWithToolBackedOperationReason,
							},
						},
					},
				],
			},
			"step-4-await-remediation-story-allocation": {
				id: "step-4-await-remediation-story-allocation",
				routes: [
					{
						id: "step-4-build-remediation-story-shell",
						trigger: toolBackedOperationSucceeded(
							"step-4-await-remediation-story-planning",
							"step-4-allocate-remediation-story",
						),
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: CODE_REVIEW_REMEDIATION_STORY_ARTIFACT_ID,
								buildContent: () => CODE_REVIEW_REMEDIATION_STORY_SHELL,
							},
						},
						followingBranchId: "step-4-await-remediation-story-build",
					},
					{
						id: "step-4-fail-after-remediation-story-allocation",
						trigger: toolBackedOperationFailed(
							"step-4-await-remediation-story-planning",
							"step-4-allocate-remediation-story",
						),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: failWithToolBackedOperationReason,
							},
						},
					},
				],
			},
			"step-4-await-remediation-story-build": {
				id: "step-4-await-remediation-story-build",
				routes: [
					{
						id: "step-4-project-remediation-story-prompt",
						trigger: toolBackedOperationSucceeded(
							"step-4-await-remediation-story-allocation",
							"step-4-build-remediation-story-shell",
						),
						action: {
							kind: "project_prompt",
						},
						followingBranchId: "step-4-await-attempt-completion",
					},
					{
						id: "step-4-fail-after-remediation-story-build",
						trigger: toolBackedOperationFailed(
							"step-4-await-remediation-story-allocation",
							"step-4-build-remediation-story-shell",
						),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: failWithToolBackedOperationReason,
							},
						},
					},
				],
			},
			"step-4-await-selected-story-status-update": {
				id: "step-4-await-selected-story-status-update",
				routes: [
					{
						id: "step-4-move-selected-story-to-complete",
						trigger: toolBackedOperationSucceededFromAny([
							{
								branchId: "step-4-route-after-findings-evaluation",
								routeId: "step-4-update-selected-story-status-no-findings",
							},
							{
								branchId: "step-4-await-attempt-completion",
								routeId: "step-4-update-selected-story-status-after-remediation",
							},
						]),
						action: {
							kind: "move_project_file",
							sourceFolderSegments: ["implementation", "stories-review"],
							destinationFolderSegments: ["implementation", "stories-complete"],
							filenameWorkflowValueKey: CodeReviewWorkflowValueKey.SelectedStoryFilename,
						},
						followingBranchId: "step-4-await-selected-story-move",
					},
					{
						id: "step-4-fail-after-selected-story-status-update",
						trigger: toolBackedOperationFailedFromAny([
							{
								branchId: "step-4-route-after-findings-evaluation",
								routeId: "step-4-update-selected-story-status-no-findings",
							},
							{
								branchId: "step-4-await-attempt-completion",
								routeId: "step-4-update-selected-story-status-after-remediation",
							},
						]),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: failWithToolBackedOperationReason,
							},
						},
					},
				],
			},
			"step-4-await-selected-story-move": {
				id: "step-4-await-selected-story-move",
				routes: [
					{
						id: "step-4-complete-workflow-after-selected-story-move",
						trigger: toolBackedOperationSucceeded(
							"step-4-await-selected-story-status-update",
							"step-4-move-selected-story-to-complete",
						),
						action: {
							kind: "complete_workflow",
						},
					},
					{
						id: "step-4-fail-after-selected-story-move",
						trigger: toolBackedOperationFailed(
							"step-4-await-selected-story-status-update",
							"step-4-move-selected-story-to-complete",
						),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: failWithToolBackedOperationReason,
							},
						},
					},
				],
			},
			"step-4-await-attempt-completion": {
				id: "step-4-await-attempt-completion",
				routes: [
					{
						id: "step-4-update-selected-story-status-after-remediation",
						trigger: attemptCompletionSucceeded(),
						action: {
							kind: "update_story_index_status",
							storyIndexWorkflowValueKey: CodeReviewWorkflowValueKey.StoriesIndex,
							storyIdentityWorkflowValueKey: CodeReviewWorkflowValueKey.SelectedStoryIdentity,
							status: "complete",
							expectedCurrentStatus: "review",
						},
						followingBranchId: "step-4-await-selected-story-status-update",
					},
				],
			},
		},
	}
}

export const codeReviewWorkflowDefinition: WorkflowDefinition = {
	name: CODE_REVIEW_WORKFLOW_NAME,
	displayName: CODE_REVIEW_WORKFLOW_DISPLAY_NAME,
	description: CODE_REVIEW_WORKFLOW_DESCRIPTION,
	slashCommandName: CODE_REVIEW_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: CODE_REVIEW_WORKFLOW_USE_SKILL_NAME,
	persona: CODE_REVIEW_WORKFLOW_PERSONA,
	projectSubfolder: CODE_REVIEW_WORKFLOW_PROJECT_SUBFOLDER,
	workflowValueKeys: CODE_REVIEW_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: CODE_REVIEW_ENTRY_PROJECT_VALUE_KEYS,
	entryPanel: {
		promptMarkdown: CODE_REVIEW_WORKFLOW_DESCRIPTION,
	},
	workflowForms: {
		[CODE_REVIEW_STEP_1_FORM_ID]: buildCodeReviewStep1WorkflowForm(),
	},
	prerequisiteFiles: CODE_REVIEW_PREREQUISITE_FILES,
	artifacts: CODE_REVIEW_ARTIFACTS,
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Resolve Review Target",
			decisionTree: buildStep1DecisionTree(),
			buildToolSchema: buildCodeReviewStep1ToolSchemas,
		}),
		"step-2": createStepDefinition({
			stepNumber: 2,
			checklistLabel: "Dispatch Specialist Subagent Reviewers",
			decisionTree: buildStep2DecisionTree(),
			buildPromptSource: buildStep2PromptSource,
			buildToolSchema: buildCodeReviewStep2ToolSchemas,
		}),
		"step-3": createStepDefinition({
			stepNumber: 3,
			checklistLabel: "Triage & Consolidate Findings",
			decisionTree: buildStep3DecisionTree(),
			buildPromptSource: buildStep3PromptSource,
			buildToolSchema: buildCodeReviewStep3ToolSchemas,
		}),
		"step-4": createStepDefinition({
			stepNumber: 4,
			checklistLabel: "Process Findings & Complete Workflow",
			decisionTree: buildStep4DecisionTree(),
			buildPromptSource: buildStep4PromptSource,
			buildToolSchema: buildCodeReviewStep4ToolSchemas,
		}),
	},
}
