import { readFile, writeFile } from "node:fs/promises"
import { basename, dirname, normalize } from "node:path"
import type { WorkflowFormDefinitionPayload } from "@shared/ExtensionMessage"
import { execa } from "execa"
import { WorkflowArtifactFamily } from "../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowDecisionBranchTrigger,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowDeterministicProcedureResult,
	WorkflowFormContinuationReplacementBuilder,
	WorkflowPersonaDefinition,
	WorkflowStepDefinition,
	WorkflowStepPromptSource,
	WorkflowValues,
} from "../../types"
import {
	buildReviewScopeManifestMarkdown,
	buildReviewScopeManifestModel,
	parseGitShowNameStatus,
	parseGitShowNumstat,
} from "../code-review/reviewScopeManifest"
import {
	buildEdgeCaseHunterReviewStep1ToolSchemas,
	buildEdgeCaseHunterReviewStep2ToolSchemas,
} from "./edgeCaseHunterReviewToolSchemas"

export const EDGE_CASE_HUNTER_REVIEW_WORKFLOW_NAME = "edge-case-hunter-review"
export const EDGE_CASE_HUNTER_REVIEW_WORKFLOW_SLASH_COMMAND_NAME = "edge-case-hunter-review"
export const EDGE_CASE_HUNTER_REVIEW_WORKFLOW_USE_SKILL_NAME = "edge-case-hunter-review"
export const EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DISPLAY_NAME = "edge case hunter review"
export const EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DESCRIPTION =
	"In this workflow, the agent acts as a path tracer, walking every branching path to identify every edge case associated with recent code updates to ensure that no detail was overlooked during implementation."
export const EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PROJECT_SUBFOLDER = "review"
export const EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "Fred",
	role: "Quality Control",
	identity:
		"Coordinates quality review after implementation to ensure that code is functional and compliant before it ships to production.",
	capabilities: ["rigorous edge case analysis of preproduction code"],
	communicationStyle: "precise and detailed",
	principles: [
		"small details at overlooked boundaries can make or break a product. Finding the small things up-front saves countless hours of triage and bug-fixing later.",
	],
}

export enum EdgeCaseHunterReviewWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	TargetStory = "target_story",
	SelectedStoryIdentity = "selected_story_identity",
	ReviewCommitHash = "review_commit_hash",
	ReviewCommitParent = "review_commit_parent",
	ReviewScopeManifest = "review_scope_manifest",
	ReviewScopeManifestArtifactFamily = "review_scope_manifest_artifact_family",
	ReviewScopeManifestArtifactIdentity = "review_scope_manifest_artifact_identity",
	ReviewScopeManifestArtifactFilename = "review_scope_manifest_artifact_filename",
	ReviewScopeManifestArtifactRelativePath = "review_scope_manifest_artifact_relative_path",
	EdgeCaseReviewOutput = "edge_case_review_output",
	EdgeCaseReviewOutputArtifactFamily = "edge_case_review_output_artifact_family",
	EdgeCaseReviewOutputArtifactIdentity = "edge_case_review_output_artifact_identity",
	EdgeCaseReviewOutputArtifactFilename = "edge_case_review_output_artifact_filename",
	EdgeCaseReviewOutputArtifactRelativePath = "edge_case_review_output_artifact_relative_path",
}

export const EDGE_CASE_HUNTER_REVIEW_WORKFLOW_VALUE_KEYS: readonly EdgeCaseHunterReviewWorkflowValueKey[] = Object.values(
	EdgeCaseHunterReviewWorkflowValueKey,
)

export const EDGE_CASE_HUNTER_REVIEW_ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: EdgeCaseHunterReviewWorkflowValueKey.ProjectMode,
	projectTitle: EdgeCaseHunterReviewWorkflowValueKey.ProjectTitle,
	projectFolderName: EdgeCaseHunterReviewWorkflowValueKey.ProjectFolderName,
}

export const EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID = EdgeCaseHunterReviewWorkflowValueKey.TargetStory
export const EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_FILENAME_PATTERN = /^(Story-\d+-\d+|Remediation-story-\d+-\d+-\d+)\.md$/
export const EDGE_CASE_HUNTER_REVIEW_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]> = {
	[EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID]: {
		id: EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID,
		requirement: "required",
		producingWorkflowName: "dev-story",
		projectSubfolderSegments: ["implementation", "stories-review"],
		match: {
			kind: "naming_pattern",
			pattern: EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_FILENAME_PATTERN,
		},
		workflowValueKey: EdgeCaseHunterReviewWorkflowValueKey.TargetStory,
		outputDocumentReference: "none",
	},
}

export const EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID = EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest
export const EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID = EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutput

export const EDGE_CASE_HUNTER_REVIEW_ARTIFACTS: NonNullable<WorkflowDefinition["artifacts"]> = {
	[EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID]: {
		id: EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID,
		family: WorkflowArtifactFamily.ReviewScopeManifest,
		intentMode: "derived",
		parentIdentitySource: undefined,
		targetIdentitySource: {
			kind: "workflow_value",
			key: EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity,
		},
		outputValueKeys: {
			projectTitle: EdgeCaseHunterReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: EdgeCaseHunterReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifestArtifactFamily,
			artifactIdentity: EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity,
			artifactFilename: EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifestArtifactFilename,
			artifactRelativePath: EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifestArtifactRelativePath,
			artifactAbsolutePath: EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest,
			parentIdentity: undefined,
			targetIdentity: EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity,
		},
	},
	[EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID]: {
		id: EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID,
		family: WorkflowArtifactFamily.EdgeCaseReviewOutput,
		intentMode: "derived",
		parentIdentitySource: undefined,
		targetIdentitySource: {
			kind: "workflow_value",
			key: EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity,
		},
		outputValueKeys: {
			projectTitle: EdgeCaseHunterReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: EdgeCaseHunterReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutputArtifactFamily,
			artifactIdentity: EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutputArtifactIdentity,
			artifactFilename: EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutputArtifactFilename,
			artifactRelativePath: EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutputArtifactRelativePath,
			artifactAbsolutePath: EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutput,
			parentIdentity: undefined,
			targetIdentity: EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutputArtifactIdentity,
		},
	},
}

export const EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID = "step-1-edge-case-hunter-review-commit-form"
export const EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID = "step-1-panel-a-commit-hash"
export const EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID = "step-1-panel-b-invalid-commit"
export const EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY = "commit_hash"

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

export function buildEdgeCaseHunterReviewStep1WorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Identify Implementation Evidence",
		toolDictionaryTitle: "Identify Implementation Evidence",
		toolDictionaryMarkdown: "Provide the commit hash for the target story's commit.",
		firstPanelId: EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
		panels: {
			[EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID]: {
				panelId: EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
				title: "Identify Implementation Evidence",
				promptMarkdown: "Provide the commit hash for the target story's commit.",
				fields: [
					{
						key: EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY,
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
			[EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID]: {
				panelId: EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
				title: "Invalid Commit Hash",
				promptMarkdown: "The provided commit hash is invalid. Please go back and provide a valid commit hash.",
				fields: [],
				allowedActions: ["back"],
				actionLabels: {
					back: "back",
				},
				transition: buildTerminalTransition(),
				backDestinationPanelId: EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
			},
		},
	}
}

interface EdgeCaseHunterReviewSelectedProjectRoot {
	selectedProjectRoot: string
	selectedStoryFilename: string
}

export interface EdgeCaseHunterReviewGitCommandResult {
	exitCode: number
	stdout: string
	stderr: string
}

const PRIMARY_STORY_FILENAME_PATTERN = /^Story-(\d+)-(\d+)\.md$/
const REMEDIATION_STORY_FILENAME_PATTERN = /^Remediation-story-(\d+)-(\d+)-(\d+)\.md$/

function readWorkflowStringValue(workflowValues: WorkflowValues, key: EdgeCaseHunterReviewWorkflowValueKey): string | undefined {
	const value = workflowValues[key]
	if (typeof value !== "string") {
		return undefined
	}

	const trimmedValue = value.trim()
	return trimmedValue.length > 0 ? trimmedValue : undefined
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

function resolveEdgeCaseHunterReviewStoryProjectRoot(
	targetStory: string,
): EdgeCaseHunterReviewSelectedProjectRoot | { errorMessage: string } {
	const normalizedTargetStory = normalize(targetStory)
	const selectedStoryFilename = basename(normalizedTargetStory)
	if (EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_FILENAME_PATTERN.test(selectedStoryFilename) === false) {
		return {
			errorMessage: `Edge Case Hunter Review setup failed: target story filename ${selectedStoryFilename} does not match the required story filename pattern.`,
		}
	}

	const reviewStoriesFolder = dirname(normalizedTargetStory)
	const implementationFolder = dirname(reviewStoriesFolder)
	if (basename(reviewStoriesFolder) !== "stories-review" || basename(implementationFolder) !== "implementation") {
		return {
			errorMessage: `Edge Case Hunter Review setup failed: target story path ${normalizedTargetStory} must remain under implementation/stories-review.`,
		}
	}

	return {
		selectedProjectRoot: dirname(implementationFolder),
		selectedStoryFilename,
	}
}

function deriveStoryIdentityFromFilename(selectedStoryFilename: string): string | { errorMessage: string } {
	const primaryMatch = selectedStoryFilename.match(PRIMARY_STORY_FILENAME_PATTERN)
	if (primaryMatch !== null) {
		const epicIdentity = primaryMatch[1]
		const storyNumber = primaryMatch[2]
		if (epicIdentity !== undefined && storyNumber !== undefined) {
			return `${epicIdentity}.${storyNumber}`
		}
	}

	const remediationMatch = selectedStoryFilename.match(REMEDIATION_STORY_FILENAME_PATTERN)
	if (remediationMatch !== null) {
		const epicIdentity = remediationMatch[1]
		const storyNumber = remediationMatch[2]
		const remediationNumber = remediationMatch[3]
		if (epicIdentity !== undefined && storyNumber !== undefined && remediationNumber !== undefined) {
			return `${epicIdentity}.${storyNumber}.${remediationNumber}`
		}
	}

	return {
		errorMessage: `Edge Case Hunter Review setup failed: could not derive selected story identity from ${selectedStoryFilename}.`,
	}
}

export async function deriveEdgeCaseHunterReviewTargetStoryValues(
	session: ActiveWorkflowSession,
): Promise<WorkflowDeterministicProcedureResult> {
	const targetStory = readWorkflowStringValue(session.workflowValues, EdgeCaseHunterReviewWorkflowValueKey.TargetStory)
	if (targetStory === undefined) {
		return {
			kind: "failed",
			errorMessage: "Edge Case Hunter Review setup failed: target_story workflow value is missing.",
		}
	}

	const projectRootResult = resolveEdgeCaseHunterReviewStoryProjectRoot(targetStory)
	if ("errorMessage" in projectRootResult) {
		return {
			kind: "failed",
			errorMessage: projectRootResult.errorMessage,
		}
	}

	const selectedStoryIdentity = deriveStoryIdentityFromFilename(projectRootResult.selectedStoryFilename)
	if (typeof selectedStoryIdentity !== "string") {
		return {
			kind: "failed",
			errorMessage: selectedStoryIdentity.errorMessage,
		}
	}

	return {
		kind: "succeeded",
		workflowValueWrites: {
			[EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity]: selectedStoryIdentity,
		},
	}
}

export async function runEdgeCaseHunterReviewGitCommand(args: {
	selectedProjectRoot: string
	gitArgs: readonly string[]
}): Promise<EdgeCaseHunterReviewGitCommandResult> {
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

function gitCommandFailed(result: EdgeCaseHunterReviewGitCommandResult): boolean {
	return result.exitCode !== 0
}

export async function validateAndPersistEdgeCaseHunterReviewCommit(
	session: ActiveWorkflowSession,
): Promise<WorkflowDeterministicProcedureResult> {
	const targetStory = readWorkflowStringValue(session.workflowValues, EdgeCaseHunterReviewWorkflowValueKey.TargetStory)
	if (targetStory === undefined) {
		return {
			kind: "failed",
			errorMessage: "Edge Case Hunter Review commit validation failed: target_story workflow value is missing.",
		}
	}

	const projectRootResult = resolveEdgeCaseHunterReviewStoryProjectRoot(targetStory)
	if ("errorMessage" in projectRootResult) {
		return {
			kind: "failed",
			errorMessage: projectRootResult.errorMessage,
		}
	}

	const submittedCommitHash = readFormStringValue(session, EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY)
	if (submittedCommitHash === undefined) {
		return { kind: "succeeded" }
	}

	const gitRepositoryCheck = await runEdgeCaseHunterReviewGitCommand({
		selectedProjectRoot: projectRootResult.selectedProjectRoot,
		gitArgs: ["rev-parse", "--is-inside-work-tree"],
	})
	if (gitCommandFailed(gitRepositoryCheck)) {
		return { kind: "succeeded" }
	}

	const commitResolution = await runEdgeCaseHunterReviewGitCommand({
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

	const parentResolution = await runEdgeCaseHunterReviewGitCommand({
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
			[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash]: normalizedCommitHash,
			[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent]: parentHash,
		},
	}
}

function formatGitCommandFailure(args: { operation: string; result: EdgeCaseHunterReviewGitCommandResult }): string {
	const stderr = args.result.stderr.trim()
	const stdout = args.result.stdout.trim()
	const detail = stderr.length > 0 ? stderr : stdout
	return detail.length > 0
		? `Edge Case Hunter Review review-scope preparation failed during ${args.operation}: ${detail}`
		: `Edge Case Hunter Review review-scope preparation failed during ${args.operation}.`
}

function parseGitOutputFailure(args: {
	operation: string
	failures: readonly { lineNumber: number; message: string }[]
}): string {
	const detail = args.failures.map((failure) => `line ${failure.lineNumber}: ${failure.message}`).join("; ")
	return `Edge Case Hunter Review review-scope preparation failed during ${args.operation}: ${detail}`
}

export async function buildAndPersistEdgeCaseHunterReviewScopeManifest(
	session: ActiveWorkflowSession,
): Promise<WorkflowDeterministicProcedureResult> {
	const targetStory = readWorkflowStringValue(session.workflowValues, EdgeCaseHunterReviewWorkflowValueKey.TargetStory)
	const reviewScopeManifest = readWorkflowStringValue(
		session.workflowValues,
		EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest,
	)
	const commitHash = readWorkflowStringValue(session.workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash)
	const parentHash = readWorkflowStringValue(session.workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent)
	if (targetStory === undefined || reviewScopeManifest === undefined || commitHash === undefined || parentHash === undefined) {
		return {
			kind: "failed",
			errorMessage:
				"Edge Case Hunter Review review-scope preparation failed: target_story, review_scope_manifest, review_commit_hash, and review_commit_parent workflow values are required.",
		}
	}

	const projectRootResult = resolveEdgeCaseHunterReviewStoryProjectRoot(targetStory)
	if ("errorMessage" in projectRootResult) {
		return { kind: "failed", errorMessage: projectRootResult.errorMessage }
	}

	const nameStatusOutput = await runEdgeCaseHunterReviewGitCommand({
		selectedProjectRoot: projectRootResult.selectedProjectRoot,
		gitArgs: ["show", "--name-status", "--format=", commitHash],
	})
	if (gitCommandFailed(nameStatusOutput)) {
		return {
			kind: "failed",
			errorMessage: formatGitCommandFailure({ operation: "git show --name-status", result: nameStatusOutput }),
		}
	}

	const numstatOutput = await runEdgeCaseHunterReviewGitCommand({
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
			errorMessage: `Edge Case Hunter Review review-scope preparation failed during target story read ${targetStory}.${detail}`,
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
			errorMessage: `Edge Case Hunter Review review-scope preparation failed during manifest model build: ${manifestModel.errorMessage}`,
		}
	}

	try {
		await writeFile(reviewScopeManifest, buildReviewScopeManifestMarkdown(manifestModel.manifest), "utf8")
	} catch (error) {
		const detail = error instanceof Error ? ` ${error.message}` : ""
		return {
			kind: "failed",
			errorMessage: `Edge Case Hunter Review review-scope preparation failed during review scope manifest write ${reviewScopeManifest}.${detail}`,
		}
	}

	return { kind: "succeeded" }
}

export function failMissingInheritedEdgeCaseHunterReviewEvidence(
	session: ActiveWorkflowSession,
): WorkflowDeterministicProcedureResult {
	const requiredEvidenceKeys: readonly EdgeCaseHunterReviewWorkflowValueKey[] = [
		EdgeCaseHunterReviewWorkflowValueKey.TargetStory,
		EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash,
		EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent,
		EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest,
	]
	const missingKeys = requiredEvidenceKeys.filter((key) => readWorkflowStringValue(session.workflowValues, key) === undefined)

	return {
		kind: "failed",
		errorMessage: `Edge Case Hunter Review cannot start without parent-provided review evidence. Missing or invalid workflow values: ${missingKeys.join(", ")}.`,
	}
}

export function failEdgeCaseHunterReviewScopeManifestArtifactAllocation(
	session: ActiveWorkflowSession,
): WorkflowDeterministicProcedureResult {
	const targetStory =
		readWorkflowStringValue(session.workflowValues, EdgeCaseHunterReviewWorkflowValueKey.TargetStory) ??
		"unknown target_story"
	const backendReason = session.branchContext.failureState?.terminalErrorMessage ?? "Tool-backed operation failed."

	return {
		kind: "failed",
		errorMessage: `Edge Case Hunter Review review-scope manifest artifact creation failed for target_story ${targetStory}: ${backendReason}`,
	}
}

export function failEdgeCaseHunterReviewOutputArtifactAllocation(
	session: ActiveWorkflowSession,
): WorkflowDeterministicProcedureResult {
	const targetStory =
		readWorkflowStringValue(session.workflowValues, EdgeCaseHunterReviewWorkflowValueKey.TargetStory) ??
		"unknown target_story"
	const backendReason = session.branchContext.failureState?.terminalErrorMessage ?? "Tool-backed operation failed."

	return {
		kind: "failed",
		errorMessage: `Edge Case Hunter Review output artifact creation failed for target_story ${targetStory}: ${backendReason}`,
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

function workflowFormPanelSubmitted(panelId: string, action: "submit" | "back"): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_form_panel_submitted" &&
			triggerEvent.workflowFormId === EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID &&
			triggerEvent.panelId === panelId &&
			triggerEvent.action === action,
	}
}

function attemptCompletionSucceeded(): WorkflowDecisionBranchTrigger {
	return {
		kind: "on_event",
		eventKind: "attempt_completion_succeeded",
	}
}

function reviewEvidenceValuesPresent(workflowValues: WorkflowValues): boolean {
	return (
		readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.TargetStory) !== undefined &&
		readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash) !== undefined &&
		readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent) !== undefined &&
		readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest) !== undefined
	)
}

function reviewEvidenceValuesMissing(workflowValues: WorkflowValues): boolean {
	return (
		readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.TargetStory) === undefined ||
		readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash) === undefined ||
		readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent) === undefined ||
		readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest) === undefined
	)
}

function entryProjectValuesPresent(workflowValues: WorkflowValues): boolean {
	return (
		readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ProjectMode) !== undefined &&
		readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ProjectTitle) !== undefined &&
		readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ProjectFolderName) !== undefined
	)
}

function entryProjectValuesMissing(workflowValues: WorkflowValues): boolean {
	return (
		readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ProjectMode) === undefined ||
		readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ProjectTitle) === undefined ||
		readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ProjectFolderName) === undefined
	)
}

type WorkflowSessionPredicateTrigger = Extract<WorkflowDecisionBranchTrigger, { kind: "session_predicate" }>

function reviewEvidenceValuesArePresent(): WorkflowSessionPredicateTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) => reviewEvidenceValuesPresent(workflowValues),
	}
}

function reviewEvidenceValuesAreMissing(): WorkflowSessionPredicateTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) => reviewEvidenceValuesMissing(workflowValues),
	}
}

function entryProjectValuesArePresent(): WorkflowSessionPredicateTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) => entryProjectValuesPresent(workflowValues),
	}
}

function entryProjectValuesArePresentAndReviewEvidenceIsMissing(): WorkflowDecisionBranchTrigger {
	const entryProjectValuesTrigger = entryProjectValuesArePresent()
	const reviewEvidenceValuesTrigger = reviewEvidenceValuesAreMissing()
	return {
		kind: "session_predicate",
		matches: (input) => entryProjectValuesTrigger.matches(input) && reviewEvidenceValuesTrigger.matches(input),
	}
}

function entryProjectValuesAreMissingAndReviewEvidenceIsIncomplete(): WorkflowDecisionBranchTrigger {
	const reviewEvidenceValuesTrigger = reviewEvidenceValuesAreMissing()
	return {
		kind: "session_predicate",
		matches: (input) => entryProjectValuesMissing(input.workflowValues) && reviewEvidenceValuesTrigger.matches(input),
	}
}

function reviewCommitHashIsValid(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash) !== undefined &&
			readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent) !== undefined,
	}
}

function reviewCommitHashIsInvalid(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash) === undefined ||
			readWorkflowStringValue(workflowValues, EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent) === undefined,
	}
}

function buildStep1ContinuationReplacementBuilder(panelId: string): WorkflowFormContinuationReplacementBuilder {
	return () => {
		const panel = buildEdgeCaseHunterReviewStep1WorkflowForm().panels[panelId]
		if (panel === undefined) {
			throw new Error(`Edge Case Hunter Review Step 1 workflow form is missing requested continuation panel ${panelId}.`)
		}

		return {
			panel,
			data: {},
		}
	}
}

function buildStep1DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-1-route-by-existing-values",
		branches: {
			"step-1-route-by-existing-values": {
				id: "step-1-route-by-existing-values",
				routes: [
					{
						id: "step-1-fail-missing-inherited-review-evidence",
						trigger: entryProjectValuesAreMissingAndReviewEvidenceIsIncomplete(),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: failMissingInheritedEdgeCaseHunterReviewEvidence,
							},
						},
					},
					{
						id: "step-1-derive-existing-target-story-values",
						trigger: reviewEvidenceValuesArePresent(),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveEdgeCaseHunterReviewTargetStoryValues,
							},
						},
						followingBranchId: "step-1-allocate-edge-case-review-output",
					},
					{
						id: "step-1-resolve-target-story",
						trigger: entryProjectValuesArePresentAndReviewEvidenceIsMissing(),
						action: {
							kind: "resolve_prerequisite_files",
							prerequisiteIds: [EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID],
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
								run: deriveEdgeCaseHunterReviewTargetStoryValues,
							},
						},
						followingBranchId: "step-1-render-commit-hash-panel",
					},
				],
			},
			"step-1-render-commit-hash-panel": {
				id: "step-1-render-commit-hash-panel",
				routes: [
					{
						id: "step-1-render-commit-hash-panel",
						trigger: { kind: "always" },
						action: {
							kind: "render_workflow_form",
							workflowFormId: EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID,
							startPanelId: EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
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
						trigger: workflowFormPanelSubmitted(EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID, "submit"),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: validateAndPersistEdgeCaseHunterReviewCommit,
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
							artifactId: EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID,
						},
						followingBranchId: "step-1-await-review-scope-manifest-allocation",
					},
					{
						id: "step-1-continue-to-invalid-commit-panel",
						trigger: reviewCommitHashIsInvalid(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID,
							panelId: EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
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
						id: "step-1-route-after-review-scope-manifest-allocation",
						trigger: toolBackedOperationSucceeded(
							"step-1-route-after-commit-validation",
							"step-1-allocate-review-scope-manifest",
						),
						action: {
							kind: "no_op",
						},
						followingBranchId: "step-1-build-review-scope-manifest",
					},
					{
						id: "step-1-fail-after-review-scope-manifest-allocation",
						trigger: toolBackedOperationFailed(
							"step-1-route-after-commit-validation",
							"step-1-allocate-review-scope-manifest",
						),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: failEdgeCaseHunterReviewScopeManifestArtifactAllocation,
							},
						},
					},
				],
			},
			"step-1-build-review-scope-manifest": {
				id: "step-1-build-review-scope-manifest",
				routes: [
					{
						id: "step-1-build-review-scope-manifest",
						trigger: { kind: "always" },
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: buildAndPersistEdgeCaseHunterReviewScopeManifest,
							},
						},
						followingBranchId: "step-1-allocate-edge-case-review-output",
					},
				],
			},
			"step-1-allocate-edge-case-review-output": {
				id: "step-1-allocate-edge-case-review-output",
				routes: [
					{
						id: "step-1-allocate-edge-case-review-output",
						trigger: { kind: "always" },
						action: {
							kind: "allocate_artifact",
							artifactId: EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID,
						},
						followingBranchId: "step-1-await-edge-case-review-output-allocation",
					},
				],
			},
			"step-1-await-edge-case-review-output-allocation": {
				id: "step-1-await-edge-case-review-output-allocation",
				routes: [
					{
						id: "step-1-transition-to-step-2",
						trigger: toolBackedOperationSucceeded(
							"step-1-allocate-edge-case-review-output",
							"step-1-allocate-edge-case-review-output",
						),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 2,
							},
						},
					},
					{
						id: "step-1-fail-after-edge-case-review-output-allocation",
						trigger: toolBackedOperationFailed(
							"step-1-allocate-edge-case-review-output",
							"step-1-allocate-edge-case-review-output",
						),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: failEdgeCaseHunterReviewOutputArtifactAllocation,
							},
						},
					},
				],
			},
		},
	}
}

const EDGE_CASE_HUNTER_REVIEW_STEP_2_PROMPT = `Your task is to conduct an edge case review before recently built or modified code ships to production.

Your review is not a general implementation review. Your job is to find overlooked boundary, lifecycle, integration, configuration, and adjacent-file cases that may have been missed during implementation.

Review the following:
- Review Scope: {workflow.review_scope_manifest}
- Target Story: {workflow.target_story}
- Commit hash for the implemented code: {workflow.review_commit_hash}
- Parent commit hash before implementation: {workflow.review_commit_parent}

Use \`{workflow.review_scope_manifest}\` as the starting map for the review. Use the commit hash and parent hash to inspect the implementation diff when you need to verify exact changed code.

1. Identify every changed file, changed symbol, changed workflow value, changed tool/schema contract, changed route/action, changed persisted artifact, changed test fixture, changed validation path, changed prompt surface, or changed configuration surface described by the review scope.

2. For each changed item, trace outward to the adjacent surfaces that could be affected:
   - callers and callees
   - imports and exports
   - type definitions and discriminated unions
   - schema builders and tool handlers
   - runtime routing and workflow values
   - persisted files, artifact metadata, and cleanup paths
   - prompt projection and continuation behavior
   - validation, error handling, retry, and terminal-error paths
   - tests and fixtures that claim to cover the behavior

3. Walk the boundary paths for each changed or adjacent surface. Focus on edges where values, states, files, or control flow transition:
   - missing else/default branches
   - null, empty, malformed, duplicate, stale, or missing values
   - renamed, moved, copied, or deleted files
   - partial success, retry, rollback, cancellation, timeout, or failed cleanup
   - ordering dependencies between route actions
   - stale cache, stale workflow values, or un-cleared session state
   - incompatible old callers, persisted data, or restored sessions
   - changed tests that no longer match runtime behavior

4. Ask, for each boundary path: “Does the current implementation actually handle this path?” Verify using the changed code and narrowly relevant adjacent code. Do not assume coverage from intent, naming, or happy-path tests.

5. Ask, for each changed item: “What nearby file, registration, type, schema, route, prompt, fixture, or cleanup path should have changed with this, but did not?” Treat missing adjacent updates as findings when supported by evidence.

6. Collect only unhandled or suspicious boundary paths as findings. Discard paths that are clearly handled.

7. Re-run the review once from the opposite direction: start from tests, schemas, routes, artifact outputs, and persisted workflow values, then trace back to the implementation code. Add any newly discovered unhandled paths to findings.

8. Document your findings in {workflow.edge_case_review_output}. For each finding, include:
   - finding: a short title
   - description: a detailed explanation including:
     - what is wrong
     - the trigger condition
     - the likely consequence if not addressed
     - exact supporting code location with file path, start line, and end line for the smallest supporting line range
     - if the finding depends on multiple non-contiguous locations, include each cited location
     - what the cited code proves

If no findings were identified, add a note to {workflow.edge_case_review_output} stating that no findings were found after thorough edge case review.

9. Use attempt_completion to provide a final report including:
   - number of findings, or a clear statement that no findings were identified
   - the full file path for your recorded findings: {workflow.edge_case_review_output}
   - an overview of the findings you documented, if any`

function buildStep2PromptSource(): WorkflowStepPromptSource {
	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: EDGE_CASE_HUNTER_REVIEW_STEP_2_PROMPT,
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
						action: {
							kind: "complete_workflow",
						},
					},
				],
			},
		},
	}
}

export const edgeCaseHunterReviewWorkflowDefinition: WorkflowDefinition = {
	name: EDGE_CASE_HUNTER_REVIEW_WORKFLOW_NAME,
	displayName: EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DISPLAY_NAME,
	description: EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DESCRIPTION,
	slashCommandName: EDGE_CASE_HUNTER_REVIEW_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: EDGE_CASE_HUNTER_REVIEW_WORKFLOW_USE_SKILL_NAME,
	persona: EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PERSONA,
	projectSubfolder: EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PROJECT_SUBFOLDER,
	workflowValueKeys: EDGE_CASE_HUNTER_REVIEW_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: EDGE_CASE_HUNTER_REVIEW_ENTRY_PROJECT_VALUE_KEYS,
	entryPanel: {
		promptMarkdown: EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DESCRIPTION,
	},
	workflowForms: {
		[EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID]: buildEdgeCaseHunterReviewStep1WorkflowForm(),
	},
	prerequisiteFiles: EDGE_CASE_HUNTER_REVIEW_PREREQUISITE_FILES,
	artifacts: EDGE_CASE_HUNTER_REVIEW_ARTIFACTS,
	childInheritance: [
		{
			parentKey: EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash,
			childKey: EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash,
		},
		{
			parentKey: EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent,
			childKey: EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent,
		},
		{
			parentKey: EdgeCaseHunterReviewWorkflowValueKey.TargetStory,
			childKey: EdgeCaseHunterReviewWorkflowValueKey.TargetStory,
		},
		{
			parentKey: EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest,
			childKey: EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest,
		},
	],
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Gather Inputs & Generate Output File",
			decisionTree: buildStep1DecisionTree(),
			buildToolSchema: buildEdgeCaseHunterReviewStep1ToolSchemas,
		}),
		"step-2": createStepDefinition({
			stepNumber: 2,
			checklistLabel: "Conduct Exhaustive Path Analysis",
			decisionTree: buildStep2DecisionTree(),
			buildPromptSource: buildStep2PromptSource,
			promptTemplates: [EDGE_CASE_HUNTER_REVIEW_STEP_2_PROMPT],
			buildToolSchema: buildEdgeCaseHunterReviewStep2ToolSchemas,
		}),
	},
}
