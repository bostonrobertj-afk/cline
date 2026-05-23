import { access, readFile, writeFile } from "node:fs/promises"
import { basename, dirname, join, normalize } from "node:path"
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
	buildAcceptanceAuditReviewStep1ToolSchemas,
	buildAcceptanceAuditReviewStep2ToolSchemas,
} from "./acceptanceAuditReviewToolSchemas"

export const ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_NAME = "acceptance-audit-review"
export const ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_SLASH_COMMAND_NAME = "acceptance-audit-review"
export const ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_USE_SKILL_NAME = "acceptance-audit-review"
export const ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_DISPLAY_NAME = "acceptance audit review"
export const ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_DESCRIPTION =
	"In this workflow, the agent reviews shipped code vs project specs to ensure that implementation fully aligns with the project's intent, designed functionality, and prescribed code configuration."
export const ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_PROJECT_SUBFOLDER = "review"
export const ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "Fred",
	role: "Quality Control",
	identity:
		"Ensures that shipped code delivers on project expectations without crossing identified scope boundaries or inventing architecture which was not prescribed or approved in project documentation.",
	capabilities: ["rigorous validation of shipped code vs project documentation"],
	communicationStyle: "precise and detailed",
	principles: ["code revisions without clear backing in project documentation are never acceptable."],
}

export enum AcceptanceAuditReviewWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	TargetStory = "target_story",
	SelectedStoryIdentity = "selected_story_identity",
	EpicsDocument = "epics_document",
	ArchitectureDocument = "architecture_document",
	ReviewCommitHash = "review_commit_hash",
	ReviewCommitParent = "review_commit_parent",
	ReviewScopeManifest = "review_scope_manifest",
	ReviewScopeManifestArtifactFamily = "review_scope_manifest_artifact_family",
	ReviewScopeManifestArtifactIdentity = "review_scope_manifest_artifact_identity",
	ReviewScopeManifestArtifactFilename = "review_scope_manifest_artifact_filename",
	ReviewScopeManifestArtifactRelativePath = "review_scope_manifest_artifact_relative_path",
	AcceptanceAuditOutput = "acceptance_audit_output",
	AcceptanceAuditOutputArtifactFamily = "acceptance_audit_output_artifact_family",
	AcceptanceAuditOutputArtifactIdentity = "acceptance_audit_output_artifact_identity",
	AcceptanceAuditOutputArtifactFilename = "acceptance_audit_output_artifact_filename",
	AcceptanceAuditOutputArtifactRelativePath = "acceptance_audit_output_artifact_relative_path",
}

export const ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_VALUE_KEYS: readonly AcceptanceAuditReviewWorkflowValueKey[] = Object.values(
	AcceptanceAuditReviewWorkflowValueKey,
)

export const ACCEPTANCE_AUDIT_REVIEW_ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: AcceptanceAuditReviewWorkflowValueKey.ProjectMode,
	projectTitle: AcceptanceAuditReviewWorkflowValueKey.ProjectTitle,
	projectFolderName: AcceptanceAuditReviewWorkflowValueKey.ProjectFolderName,
}

export const ACCEPTANCE_AUDIT_REVIEW_TARGET_STORY_PREREQUISITE_ID = AcceptanceAuditReviewWorkflowValueKey.TargetStory
export const ACCEPTANCE_AUDIT_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID = AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest
export const ACCEPTANCE_AUDIT_REVIEW_OUTPUT_ARTIFACT_ID = AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutput
export const ACCEPTANCE_AUDIT_REVIEW_TARGET_STORY_FILENAME_PATTERN = /^(Story-\d+-\d+|Remediation-story-\d+-\d+-\d+)\.md$/
export const ACCEPTANCE_AUDIT_REVIEW_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]> = {
	[ACCEPTANCE_AUDIT_REVIEW_TARGET_STORY_PREREQUISITE_ID]: {
		id: ACCEPTANCE_AUDIT_REVIEW_TARGET_STORY_PREREQUISITE_ID,
		requirement: "required",
		producingWorkflowName: "dev-story",
		projectSubfolderSegments: ["implementation", "stories-review"],
		match: {
			kind: "naming_pattern",
			pattern: ACCEPTANCE_AUDIT_REVIEW_TARGET_STORY_FILENAME_PATTERN,
		},
		workflowValueKey: AcceptanceAuditReviewWorkflowValueKey.TargetStory,
		outputDocumentReference: "none",
	},
}

export const ACCEPTANCE_AUDIT_REVIEW_ARTIFACTS: NonNullable<WorkflowDefinition["artifacts"]> = {
	[ACCEPTANCE_AUDIT_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID]: {
		id: ACCEPTANCE_AUDIT_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID,
		family: WorkflowArtifactFamily.ReviewScopeManifest,
		intentMode: "derived",
		parentIdentitySource: undefined,
		targetIdentitySource: {
			kind: "workflow_value",
			key: AcceptanceAuditReviewWorkflowValueKey.SelectedStoryIdentity,
		},
		outputValueKeys: {
			projectTitle: AcceptanceAuditReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: AcceptanceAuditReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifestArtifactFamily,
			artifactIdentity: AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity,
			artifactFilename: AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifestArtifactFilename,
			artifactRelativePath: AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifestArtifactRelativePath,
			artifactAbsolutePath: AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest,
			parentIdentity: undefined,
			targetIdentity: AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity,
		},
	},
	[ACCEPTANCE_AUDIT_REVIEW_OUTPUT_ARTIFACT_ID]: {
		id: ACCEPTANCE_AUDIT_REVIEW_OUTPUT_ARTIFACT_ID,
		family: WorkflowArtifactFamily.AcceptanceAuditOutput,
		intentMode: "derived",
		parentIdentitySource: undefined,
		targetIdentitySource: {
			kind: "workflow_value",
			key: AcceptanceAuditReviewWorkflowValueKey.SelectedStoryIdentity,
		},
		outputValueKeys: {
			projectTitle: AcceptanceAuditReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: AcceptanceAuditReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutputArtifactFamily,
			artifactIdentity: AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutputArtifactIdentity,
			artifactFilename: AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutputArtifactFilename,
			artifactRelativePath: AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutputArtifactRelativePath,
			artifactAbsolutePath: AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutput,
			parentIdentity: undefined,
			targetIdentity: AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutputArtifactIdentity,
		},
	},
}

export const ACCEPTANCE_AUDIT_REVIEW_STEP_1_FORM_ID = "step-1-acceptance-audit-review-commit-form"
export const ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID = "step-1-panel-a-commit-hash"
export const ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID = "step-1-panel-b-invalid-commit"
export const ACCEPTANCE_AUDIT_REVIEW_COMMIT_HASH_FIELD_KEY = "commit_hash"

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

export function buildAcceptanceAuditReviewStep1WorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Identify Implementation Evidence",
		toolDictionaryTitle: "Identify Implementation Evidence",
		toolDictionaryMarkdown: "Provide the commit hash for the target story's commit.",
		firstPanelId: ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
		panels: {
			[ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID]: {
				panelId: ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
				title: "Identify Implementation Evidence",
				promptMarkdown: "Provide the commit hash for the target story's commit.",
				fields: [
					{
						key: ACCEPTANCE_AUDIT_REVIEW_COMMIT_HASH_FIELD_KEY,
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
			[ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID]: {
				panelId: ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
				title: "Invalid Commit Hash",
				promptMarkdown: "The provided commit hash is invalid. Please go back and provide a valid commit hash.",
				fields: [],
				allowedActions: ["back"],
				actionLabels: {
					back: "back",
				},
				transition: buildTerminalTransition(),
				backDestinationPanelId: ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
			},
		},
	}
}

interface AcceptanceAuditReviewSelectedProjectRoot {
	selectedProjectRoot: string
	selectedStoryFilename: string
}

export interface AcceptanceAuditReviewGitCommandResult {
	exitCode: number
	stdout: string
	stderr: string
}

const PRIMARY_STORY_FILENAME_PATTERN = /^Story-(\d+)-(\d+)\.md$/
const REMEDIATION_STORY_FILENAME_PATTERN = /^Remediation-story-(\d+)-(\d+)-(\d+)\.md$/

function readWorkflowStringValue(workflowValues: WorkflowValues, key: AcceptanceAuditReviewWorkflowValueKey): string | undefined {
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

function resolveAcceptanceAuditReviewStoryProjectRoot(
	targetStory: string,
): AcceptanceAuditReviewSelectedProjectRoot | { errorMessage: string } {
	const normalizedTargetStory = normalize(targetStory)
	const selectedStoryFilename = basename(normalizedTargetStory)
	if (ACCEPTANCE_AUDIT_REVIEW_TARGET_STORY_FILENAME_PATTERN.test(selectedStoryFilename) === false) {
		return {
			errorMessage: `Acceptance Audit Review setup failed: target story filename ${selectedStoryFilename} does not match the required story filename pattern.`,
		}
	}

	const reviewStoriesFolder = dirname(normalizedTargetStory)
	const implementationFolder = dirname(reviewStoriesFolder)
	if (basename(reviewStoriesFolder) !== "stories-review" || basename(implementationFolder) !== "implementation") {
		return {
			errorMessage: `Acceptance Audit Review setup failed: target story path ${normalizedTargetStory} must remain under implementation/stories-review.`,
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
		errorMessage: `Acceptance Audit Review setup failed: could not derive selected story identity from ${selectedStoryFilename}.`,
	}
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
	const exists = await pathExists(args.path)
	return exists
		? undefined
		: `Acceptance Audit Review setup failed: required ${args.description} does not exist at ${args.path}.`
}

export async function deriveAcceptanceAuditReviewTargetStoryValues(
	session: ActiveWorkflowSession,
): Promise<WorkflowDeterministicProcedureResult> {
	const targetStory = readWorkflowStringValue(session.workflowValues, AcceptanceAuditReviewWorkflowValueKey.TargetStory)
	if (targetStory === undefined) {
		return {
			kind: "failed",
			errorMessage: "Acceptance Audit Review setup failed: target_story workflow value is missing.",
		}
	}

	const projectRootResult = resolveAcceptanceAuditReviewStoryProjectRoot(targetStory)
	if ("errorMessage" in projectRootResult) {
		return {
			kind: "failed",
			errorMessage: projectRootResult.errorMessage,
		}
	}

	const targetStoryValidationError = await validateRequiredPath({
		path: targetStory,
		description: "target_story",
	})
	if (targetStoryValidationError !== undefined) {
		return {
			kind: "failed",
			errorMessage: targetStoryValidationError,
		}
	}

	const selectedStoryIdentity = deriveStoryIdentityFromFilename(projectRootResult.selectedStoryFilename)
	if (typeof selectedStoryIdentity !== "string") {
		return {
			kind: "failed",
			errorMessage: selectedStoryIdentity.errorMessage,
		}
	}

	const epicsDocument = join(projectRootResult.selectedProjectRoot, "planning", "Epics.md")
	const architectureDocument = join(projectRootResult.selectedProjectRoot, "planning", "architecture.md")
	const epicsValidationError = await validateRequiredPath({
		path: epicsDocument,
		description: "planning/Epics.md",
	})
	if (epicsValidationError !== undefined) {
		return {
			kind: "failed",
			errorMessage: epicsValidationError,
		}
	}

	const architectureValidationError = await validateRequiredPath({
		path: architectureDocument,
		description: "planning/architecture.md",
	})
	if (architectureValidationError !== undefined) {
		return {
			kind: "failed",
			errorMessage: architectureValidationError,
		}
	}

	return {
		kind: "succeeded",
		workflowValueWrites: {
			[AcceptanceAuditReviewWorkflowValueKey.SelectedStoryIdentity]: selectedStoryIdentity,
			[AcceptanceAuditReviewWorkflowValueKey.EpicsDocument]: epicsDocument,
			[AcceptanceAuditReviewWorkflowValueKey.ArchitectureDocument]: architectureDocument,
		},
	}
}

export async function runAcceptanceAuditReviewGitCommand(args: {
	selectedProjectRoot: string
	gitArgs: readonly string[]
}): Promise<AcceptanceAuditReviewGitCommandResult> {
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

function gitCommandFailed(result: AcceptanceAuditReviewGitCommandResult): boolean {
	return result.exitCode !== 0
}

export async function validateAndPersistAcceptanceAuditReviewCommit(
	session: ActiveWorkflowSession,
): Promise<WorkflowDeterministicProcedureResult> {
	const targetStory = readWorkflowStringValue(session.workflowValues, AcceptanceAuditReviewWorkflowValueKey.TargetStory)
	if (targetStory === undefined) {
		return {
			kind: "failed",
			errorMessage: "Acceptance Audit Review commit validation failed: target_story workflow value is missing.",
		}
	}

	const projectRootResult = resolveAcceptanceAuditReviewStoryProjectRoot(targetStory)
	if ("errorMessage" in projectRootResult) {
		return {
			kind: "failed",
			errorMessage: projectRootResult.errorMessage,
		}
	}

	const submittedCommitHash = readFormStringValue(session, ACCEPTANCE_AUDIT_REVIEW_COMMIT_HASH_FIELD_KEY)
	if (submittedCommitHash === undefined) {
		return { kind: "succeeded" }
	}

	const gitRepositoryCheck = await runAcceptanceAuditReviewGitCommand({
		selectedProjectRoot: projectRootResult.selectedProjectRoot,
		gitArgs: ["rev-parse", "--is-inside-work-tree"],
	})
	if (gitCommandFailed(gitRepositoryCheck)) {
		return { kind: "succeeded" }
	}

	const commitResolution = await runAcceptanceAuditReviewGitCommand({
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

	const parentResolution = await runAcceptanceAuditReviewGitCommand({
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
			[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash]: normalizedCommitHash,
			[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent]: parentHash,
		},
	}
}

function formatGitCommandFailure(args: { operation: string; result: AcceptanceAuditReviewGitCommandResult }): string {
	const stderr = args.result.stderr.trim()
	const stdout = args.result.stdout.trim()
	const detail = stderr.length > 0 ? stderr : stdout
	return detail.length > 0
		? `Acceptance Audit Review review-scope preparation failed during ${args.operation}: ${detail}`
		: `Acceptance Audit Review review-scope preparation failed during ${args.operation}.`
}

function parseGitOutputFailure(args: {
	operation: string
	failures: readonly { lineNumber: number; message: string }[]
}): string {
	const detail = args.failures.map((failure) => `line ${failure.lineNumber}: ${failure.message}`).join("; ")
	return `Acceptance Audit Review review-scope preparation failed during ${args.operation}: ${detail}`
}

export async function buildAndPersistAcceptanceAuditReviewScopeManifest(
	session: ActiveWorkflowSession,
): Promise<WorkflowDeterministicProcedureResult> {
	const targetStory = readWorkflowStringValue(session.workflowValues, AcceptanceAuditReviewWorkflowValueKey.TargetStory)
	const reviewScopeManifest = readWorkflowStringValue(
		session.workflowValues,
		AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest,
	)
	const commitHash = readWorkflowStringValue(session.workflowValues, AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash)
	const parentHash = readWorkflowStringValue(session.workflowValues, AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent)
	if (targetStory === undefined || reviewScopeManifest === undefined || commitHash === undefined || parentHash === undefined) {
		return {
			kind: "failed",
			errorMessage:
				"Acceptance Audit Review review-scope preparation failed: target_story, review_scope_manifest, review_commit_hash, and review_commit_parent workflow values are required.",
		}
	}

	const projectRootResult = resolveAcceptanceAuditReviewStoryProjectRoot(targetStory)
	if ("errorMessage" in projectRootResult) {
		return { kind: "failed", errorMessage: projectRootResult.errorMessage }
	}

	const nameStatusOutput = await runAcceptanceAuditReviewGitCommand({
		selectedProjectRoot: projectRootResult.selectedProjectRoot,
		gitArgs: ["show", "--name-status", "--format=", commitHash],
	})
	if (gitCommandFailed(nameStatusOutput)) {
		return {
			kind: "failed",
			errorMessage: formatGitCommandFailure({ operation: "git show --name-status", result: nameStatusOutput }),
		}
	}

	const numstatOutput = await runAcceptanceAuditReviewGitCommand({
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
			errorMessage: `Acceptance Audit Review review-scope preparation failed during target story read ${targetStory}.${detail}`,
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
			errorMessage: `Acceptance Audit Review review-scope preparation failed during manifest model build: ${manifestModel.errorMessage}`,
		}
	}

	try {
		await writeFile(reviewScopeManifest, buildReviewScopeManifestMarkdown(manifestModel.manifest), "utf8")
	} catch (error) {
		const detail = error instanceof Error ? ` ${error.message}` : ""
		return {
			kind: "failed",
			errorMessage: `Acceptance Audit Review review-scope preparation failed during review scope manifest write ${reviewScopeManifest}.${detail}`,
		}
	}

	return { kind: "succeeded" }
}

export function validateInheritedAcceptanceAuditReviewEvidence(
	session: ActiveWorkflowSession,
): WorkflowDeterministicProcedureResult {
	const requiredEvidenceKeys: readonly AcceptanceAuditReviewWorkflowValueKey[] = [
		AcceptanceAuditReviewWorkflowValueKey.TargetStory,
		AcceptanceAuditReviewWorkflowValueKey.SelectedStoryIdentity,
		AcceptanceAuditReviewWorkflowValueKey.EpicsDocument,
		AcceptanceAuditReviewWorkflowValueKey.ArchitectureDocument,
		AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash,
		AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent,
		AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest,
	]
	const missingKeys = requiredEvidenceKeys.filter((key) => readWorkflowStringValue(session.workflowValues, key) === undefined)
	if (missingKeys.length > 0) {
		return {
			kind: "failed",
			errorMessage: `Acceptance Audit Review cannot start without parent-provided review evidence and project documentation. Missing or invalid workflow values: ${missingKeys.join(", ")}.`,
		}
	}

	return { kind: "succeeded" }
}

export function failAcceptanceAuditReviewScopeManifestArtifactAllocation(
	session: ActiveWorkflowSession,
): WorkflowDeterministicProcedureResult {
	const targetStory =
		readWorkflowStringValue(session.workflowValues, AcceptanceAuditReviewWorkflowValueKey.TargetStory) ??
		"unknown target_story"
	const backendReason = session.branchContext.failureState?.terminalErrorMessage ?? "Tool-backed operation failed."

	return {
		kind: "failed",
		errorMessage: `Acceptance Audit Review review-scope manifest artifact creation failed for target_story ${targetStory}: ${backendReason}`,
	}
}

export function failAcceptanceAuditReviewOutputArtifactAllocation(
	session: ActiveWorkflowSession,
): WorkflowDeterministicProcedureResult {
	const targetStory =
		readWorkflowStringValue(session.workflowValues, AcceptanceAuditReviewWorkflowValueKey.TargetStory) ??
		"unknown target_story"
	const backendReason = session.branchContext.failureState?.terminalErrorMessage ?? "Tool-backed operation failed."

	return {
		kind: "failed",
		errorMessage: `Acceptance Audit Review output artifact creation failed for target_story ${targetStory}: ${backendReason}`,
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
	buildToolSchema: WorkflowStepDefinition["buildToolSchema"]
	promptTemplates?: WorkflowStepDefinition["promptTemplates"]
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
			triggerEvent.workflowFormId === ACCEPTANCE_AUDIT_REVIEW_STEP_1_FORM_ID &&
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
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.TargetStory) !== undefined &&
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.SelectedStoryIdentity) !== undefined &&
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.EpicsDocument) !== undefined &&
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ArchitectureDocument) !== undefined &&
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash) !== undefined &&
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent) !== undefined &&
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest) !== undefined
	)
}

function reviewEvidenceValuesMissing(workflowValues: WorkflowValues): boolean {
	return (
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.TargetStory) === undefined ||
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.SelectedStoryIdentity) === undefined ||
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.EpicsDocument) === undefined ||
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ArchitectureDocument) === undefined ||
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash) === undefined ||
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent) === undefined ||
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest) === undefined
	)
}

function entryProjectValuesPresent(workflowValues: WorkflowValues): boolean {
	return (
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ProjectMode) !== undefined &&
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ProjectTitle) !== undefined &&
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ProjectFolderName) !== undefined
	)
}

function entryProjectValuesMissing(workflowValues: WorkflowValues): boolean {
	return (
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ProjectMode) === undefined ||
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ProjectTitle) === undefined ||
		readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ProjectFolderName) === undefined
	)
}

function entryProjectValuesAreMissingAndReviewEvidenceIsIncomplete(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) => entryProjectValuesMissing(workflowValues) && reviewEvidenceValuesMissing(workflowValues),
	}
}

function entryProjectValuesAreMissingAndReviewEvidenceIsPresent(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) => entryProjectValuesMissing(workflowValues) && reviewEvidenceValuesPresent(workflowValues),
	}
}

function entryProjectValuesArePresentAndReviewEvidenceIsMissing(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) => entryProjectValuesPresent(workflowValues) && reviewEvidenceValuesMissing(workflowValues),
	}
}

function entryProjectValuesArePresentAndReviewEvidenceIsPresent(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) => entryProjectValuesPresent(workflowValues) && reviewEvidenceValuesPresent(workflowValues),
	}
}

function reviewCommitHashIsValid(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash) !== undefined &&
			readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent) !== undefined,
	}
}

function reviewCommitHashIsInvalid(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash) === undefined ||
			readWorkflowStringValue(workflowValues, AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent) === undefined,
	}
}

function buildStep1ContinuationReplacementBuilder(panelId: string): WorkflowFormContinuationReplacementBuilder {
	return () => {
		const panel = buildAcceptanceAuditReviewStep1WorkflowForm().panels[panelId]
		if (panel === undefined) {
			throw new Error(`Acceptance Audit Review Step 1 workflow form is missing requested continuation panel ${panelId}.`)
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
								run: validateInheritedAcceptanceAuditReviewEvidence,
							},
						},
					},
					{
						id: "step-1-validate-inherited-review-evidence",
						trigger: entryProjectValuesAreMissingAndReviewEvidenceIsPresent(),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: validateInheritedAcceptanceAuditReviewEvidence,
							},
						},
						followingBranchId: "step-1-allocate-acceptance-audit-output",
					},
					{
						id: "step-1-validate-existing-review-evidence",
						trigger: entryProjectValuesArePresentAndReviewEvidenceIsPresent(),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: validateInheritedAcceptanceAuditReviewEvidence,
							},
						},
						followingBranchId: "step-1-allocate-acceptance-audit-output",
					},
					{
						id: "step-1-resolve-target-story",
						trigger: entryProjectValuesArePresentAndReviewEvidenceIsMissing(),
						action: {
							kind: "resolve_prerequisite_files",
							prerequisiteIds: [ACCEPTANCE_AUDIT_REVIEW_TARGET_STORY_PREREQUISITE_ID],
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
								run: deriveAcceptanceAuditReviewTargetStoryValues,
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
							workflowFormId: ACCEPTANCE_AUDIT_REVIEW_STEP_1_FORM_ID,
							startPanelId: ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
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
						trigger: workflowFormPanelSubmitted(ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID, "submit"),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: validateAndPersistAcceptanceAuditReviewCommit,
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
							artifactId: ACCEPTANCE_AUDIT_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID,
						},
						followingBranchId: "step-1-await-review-scope-manifest-allocation",
					},
					{
						id: "step-1-continue-to-invalid-commit-panel",
						trigger: reviewCommitHashIsInvalid(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: ACCEPTANCE_AUDIT_REVIEW_STEP_1_FORM_ID,
							panelId: ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
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
								run: failAcceptanceAuditReviewScopeManifestArtifactAllocation,
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
								run: buildAndPersistAcceptanceAuditReviewScopeManifest,
							},
						},
						followingBranchId: "step-1-allocate-acceptance-audit-output",
					},
				],
			},
			"step-1-allocate-acceptance-audit-output": {
				id: "step-1-allocate-acceptance-audit-output",
				routes: [
					{
						id: "step-1-allocate-acceptance-audit-output",
						trigger: { kind: "always" },
						action: {
							kind: "allocate_artifact",
							artifactId: ACCEPTANCE_AUDIT_REVIEW_OUTPUT_ARTIFACT_ID,
						},
						followingBranchId: "step-1-await-acceptance-audit-output-allocation",
					},
				],
			},
			"step-1-await-acceptance-audit-output-allocation": {
				id: "step-1-await-acceptance-audit-output-allocation",
				routes: [
					{
						id: "step-1-transition-to-step-2",
						trigger: toolBackedOperationSucceeded(
							"step-1-allocate-acceptance-audit-output",
							"step-1-allocate-acceptance-audit-output",
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
						id: "step-1-fail-after-acceptance-audit-output-allocation",
						trigger: toolBackedOperationFailed(
							"step-1-allocate-acceptance-audit-output",
							"step-1-allocate-acceptance-audit-output",
						),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: failAcceptanceAuditReviewOutputArtifactAllocation,
							},
						},
					},
				],
			},
		},
	}
}

const ACCEPTANCE_AUDIT_REVIEW_STEP_2_PROMPT = `You have been tasked with conducting an acceptance audit of preproduction code against backing project documentation. \n\n1: Before starting your audit, read the following:\n    - target story: {workflow.target_story}\n    - epics document: {workflow.epics_document}\n    - architecture document: {workflow.architecture_document}\n    - review scope manifest: {workflow.review_scope_manifest}\n\n    If needed, you may use the following commit hashes to identify specific code revisions for detailed analysis:\n    - Commit from the implementation cycle: {workflow.review_commit_hash}\n    - Latest commit immediately before the implementation cycle: {workflow.review_commit_parent}\n\n2: Audit all code revisions (adds/edits/deletes). Your goal is to ensure that the work done during implementation satisfies the following:\n    - includes all of the exact changes prescribed by the provided story document, and no other revisions\n    - does not invent solutions and/or architecture not clearly authorized by the provided project documentation\n    - fully satisfies the story's requirements and objective\n\n3: After conducting your audit, document your findings in this document: {workflow.acceptance_audit_output}. \n    - For each finding, you must include:\n        - finding: a short title for the finding\n        - description: a detailed explanation of the finding, including:\n        - the task(s)/ subtask(s) from the target story which are associated with the finding\n        - an explanation of the identified issue\n        - the trigger condition for the finding\n        - the potential consequence if the finding is not addressed\n        - exact supporting code location with file path, start line, and end line for the smallest line range that supports the finding. If a finding depends on more than one non-contiguous location, include each one in the finding description.\n        - an explanation of what in the cited code locations supports the finding\n    - If no findings were identified, add a note to {workflow.acceptance_audit_output} indicating that no findings were found after thorough review.\n\n4: Use attempt_completion to provide a final report to the user including:\n    - number of findings, or clear statement that no findings were identified\n    - The full file path for your recorded findings: {workflow.acceptance_audit_output}\n    - an overview of the findings you documented, if any.`

function buildStep2PromptSource(): WorkflowStepPromptSource {
	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: ACCEPTANCE_AUDIT_REVIEW_STEP_2_PROMPT,
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

export const acceptanceAuditReviewWorkflowDefinition: WorkflowDefinition = {
	name: ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_NAME,
	displayName: ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_DISPLAY_NAME,
	description: ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_DESCRIPTION,
	slashCommandName: ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_USE_SKILL_NAME,
	persona: ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_PERSONA,
	projectSubfolder: ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_PROJECT_SUBFOLDER,
	workflowValueKeys: ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: ACCEPTANCE_AUDIT_REVIEW_ENTRY_PROJECT_VALUE_KEYS,
	entryPanel: {
		promptMarkdown: ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_DESCRIPTION,
	},
	workflowForms: {
		[ACCEPTANCE_AUDIT_REVIEW_STEP_1_FORM_ID]: buildAcceptanceAuditReviewStep1WorkflowForm(),
	},
	prerequisiteFiles: ACCEPTANCE_AUDIT_REVIEW_PREREQUISITE_FILES,
	artifacts: ACCEPTANCE_AUDIT_REVIEW_ARTIFACTS,
	childInheritance: [
		{
			parentKey: AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash,
			childKey: AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash,
		},
		{
			parentKey: AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent,
			childKey: AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent,
		},
		{
			parentKey: AcceptanceAuditReviewWorkflowValueKey.TargetStory,
			childKey: AcceptanceAuditReviewWorkflowValueKey.TargetStory,
		},
		{
			parentKey: AcceptanceAuditReviewWorkflowValueKey.SelectedStoryIdentity,
			childKey: AcceptanceAuditReviewWorkflowValueKey.SelectedStoryIdentity,
		},
		{
			parentKey: AcceptanceAuditReviewWorkflowValueKey.EpicsDocument,
			childKey: AcceptanceAuditReviewWorkflowValueKey.EpicsDocument,
		},
		{
			parentKey: AcceptanceAuditReviewWorkflowValueKey.ArchitectureDocument,
			childKey: AcceptanceAuditReviewWorkflowValueKey.ArchitectureDocument,
		},
		{
			parentKey: AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest,
			childKey: AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest,
		},
	],
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Gather Inputs & Generate Output File",
			decisionTree: buildStep1DecisionTree(),
			buildToolSchema: buildAcceptanceAuditReviewStep1ToolSchemas,
		}),
		"step-2": createStepDefinition({
			stepNumber: 2,
			checklistLabel: "Conduct Acceptance Audit",
			decisionTree: buildStep2DecisionTree(),
			buildPromptSource: buildStep2PromptSource,
			buildToolSchema: buildAcceptanceAuditReviewStep2ToolSchemas,
			promptTemplates: [ACCEPTANCE_AUDIT_REVIEW_STEP_2_PROMPT],
		}),
	},
}
