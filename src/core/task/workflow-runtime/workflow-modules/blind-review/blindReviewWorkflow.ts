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
import { buildBlindReviewStep1ToolSchemas, buildBlindReviewStep2ToolSchemas } from "./blindReviewToolSchemas"

export const BLIND_REVIEW_WORKFLOW_NAME = "blind-review"
export const BLIND_REVIEW_WORKFLOW_SLASH_COMMAND_NAME = "blind-review"
export const BLIND_REVIEW_WORKFLOW_USE_SKILL_NAME = "blind-review"
export const BLIND_REVIEW_WORKFLOW_DISPLAY_NAME = "blind review"
export const BLIND_REVIEW_WORKFLOW_DESCRIPTION =
	"This workflow performs a blind adversarial review using git-backed evidence to identify misconfiguration and use of bad coding habits."
export const BLIND_REVIEW_WORKFLOW_PROJECT_SUBFOLDER = "review"
export const BLIND_REVIEW_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "Jasmine",
	role: "Quality Control",
	identity:
		"You are a cynical, jaded reviewer with zero patience for sloppy work. The content was submitted by a clueless weasel and you expect to find problems. Be skeptical of everything. Look for what's missing, not just what's wrong. Use a precise, professional tone — no profanity or personal attacks.",
	capabilities: ["thorough code review"],
	communicationStyle: "precise and detailed",
	principles: ["lazily formatted and noncompliant code must never hit the production environment."],
}

export enum BlindReviewWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	TargetStory = "target_story",
	SelectedStoryIdentity = "selected_story_identity",
	ReviewCommitHash = "review_commit_hash",
	ReviewCommitParent = "review_commit_parent",
	BlindReviewOutput = "blind_review_output",
	BlindReviewOutputArtifactFamily = "blind_review_output_artifact_family",
	BlindReviewOutputArtifactIdentity = "blind_review_output_artifact_identity",
	BlindReviewOutputArtifactFilename = "blind_review_output_artifact_filename",
	BlindReviewOutputArtifactRelativePath = "blind_review_output_artifact_relative_path",
}

export const BLIND_REVIEW_WORKFLOW_VALUE_KEYS: readonly BlindReviewWorkflowValueKey[] = Object.values(BlindReviewWorkflowValueKey)

export const BLIND_REVIEW_ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: BlindReviewWorkflowValueKey.ProjectMode,
	projectTitle: BlindReviewWorkflowValueKey.ProjectTitle,
	projectFolderName: BlindReviewWorkflowValueKey.ProjectFolderName,
}

export const BLIND_REVIEW_TARGET_STORY_PREREQUISITE_ID = BlindReviewWorkflowValueKey.TargetStory
export const BLIND_REVIEW_TARGET_STORY_FILENAME_PATTERN = /^(Story-\d+-\d+|Remediation-story-\d+-\d+-\d+)\.md$/
export const BLIND_REVIEW_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]> = {
	[BLIND_REVIEW_TARGET_STORY_PREREQUISITE_ID]: {
		id: BLIND_REVIEW_TARGET_STORY_PREREQUISITE_ID,
		requirement: "required",
		resolutionMode: "interactive",
		producingWorkflowName: "dev-story",
		projectSubfolderSegments: ["implementation", "stories-review"],
		match: {
			kind: "naming_pattern",
			pattern: BLIND_REVIEW_TARGET_STORY_FILENAME_PATTERN,
		},
		workflowValueKey: BlindReviewWorkflowValueKey.TargetStory,
		outputDocumentReference: "none",
	},
}

export const BLIND_REVIEW_OUTPUT_ARTIFACT_ID = BlindReviewWorkflowValueKey.BlindReviewOutput
export const BLIND_REVIEW_ARTIFACTS: NonNullable<WorkflowDefinition["artifacts"]> = {
	[BLIND_REVIEW_OUTPUT_ARTIFACT_ID]: {
		id: BLIND_REVIEW_OUTPUT_ARTIFACT_ID,
		family: WorkflowArtifactFamily.BlindReviewOutput,
		intentMode: "derived",
		parentIdentitySource: undefined,
		targetIdentitySource: {
			kind: "workflow_value",
			key: BlindReviewWorkflowValueKey.SelectedStoryIdentity,
		},
		outputValueKeys: {
			projectTitle: BlindReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: BlindReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactFamily,
			artifactIdentity: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactIdentity,
			artifactFilename: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactFilename,
			artifactRelativePath: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactRelativePath,
			artifactAbsolutePath: BlindReviewWorkflowValueKey.BlindReviewOutput,
			parentIdentity: undefined,
			targetIdentity: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactIdentity,
		},
	},
}

export const BLIND_REVIEW_STEP_1_FORM_ID = "step-1-blind-review-commit-form"
export const BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID = "step-1-panel-a-commit-hash"
export const BLIND_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID = "step-1-panel-b-invalid-commit"
export const BLIND_REVIEW_COMMIT_HASH_FIELD_KEY = "commit_hash"

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

export function buildBlindReviewStep1WorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Identify Implementation Evidence",
		toolDictionaryTitle: "Identify Implementation Evidence",
		toolDictionaryMarkdown: "Provide the commit hash for the target story's commit.",
		firstPanelId: BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
		panels: {
			[BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID]: {
				panelId: BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
				title: "Identify Implementation Evidence",
				promptMarkdown: "Provide the commit hash for the target story's commit.",
				fields: [
					{
						key: BLIND_REVIEW_COMMIT_HASH_FIELD_KEY,
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
			[BLIND_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID]: {
				panelId: BLIND_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
				title: "Invalid Commit Hash",
				promptMarkdown: "The provided commit hash is invalid. Please go back and provide a valid commit hash.",
				fields: [],
				allowedActions: ["back"],
				actionLabels: {
					back: "back",
				},
				transition: buildTerminalTransition(),
				backDestinationPanelId: BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
			},
		},
	}
}

interface BlindReviewSelectedProjectRoot {
	selectedProjectRoot: string
	selectedStoryFilename: string
}

export interface BlindReviewGitCommandResult {
	exitCode: number
	stdout: string
	stderr: string
}

const PRIMARY_STORY_FILENAME_PATTERN = /^Story-(\d+)-(\d+)\.md$/
const REMEDIATION_STORY_FILENAME_PATTERN = /^Remediation-story-(\d+)-(\d+)-(\d+)\.md$/

function readWorkflowStringValue(workflowValues: WorkflowValues, key: BlindReviewWorkflowValueKey): string | undefined {
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

function resolveBlindReviewStoryProjectRoot(targetStory: string): BlindReviewSelectedProjectRoot | { errorMessage: string } {
	const normalizedTargetStory = normalize(targetStory)
	const selectedStoryFilename = basename(normalizedTargetStory)
	if (BLIND_REVIEW_TARGET_STORY_FILENAME_PATTERN.test(selectedStoryFilename) === false) {
		return {
			errorMessage: `Blind Review setup failed: target story filename ${selectedStoryFilename} does not match the required story filename pattern.`,
		}
	}

	const reviewStoriesFolder = dirname(normalizedTargetStory)
	const implementationFolder = dirname(reviewStoriesFolder)
	if (basename(reviewStoriesFolder) !== "stories-review" || basename(implementationFolder) !== "implementation") {
		return {
			errorMessage: `Blind Review setup failed: target story path ${normalizedTargetStory} must remain under implementation/stories-review.`,
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
		errorMessage: `Blind Review setup failed: could not derive selected story identity from ${selectedStoryFilename}.`,
	}
}

export async function deriveBlindReviewTargetStoryValues(
	session: ActiveWorkflowSession,
): Promise<WorkflowDeterministicProcedureResult> {
	const targetStory = readWorkflowStringValue(session.workflowValues, BlindReviewWorkflowValueKey.TargetStory)
	if (targetStory === undefined) {
		return {
			kind: "failed",
			errorMessage: "Blind Review setup failed: target_story workflow value is missing.",
		}
	}

	const projectRootResult = resolveBlindReviewStoryProjectRoot(targetStory)
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
			[BlindReviewWorkflowValueKey.SelectedStoryIdentity]: selectedStoryIdentity,
		},
	}
}

export async function runBlindReviewGitCommand(args: {
	selectedProjectRoot: string
	gitArgs: readonly string[]
}): Promise<BlindReviewGitCommandResult> {
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

function gitCommandFailed(result: BlindReviewGitCommandResult): boolean {
	return result.exitCode !== 0
}

export async function validateAndPersistBlindReviewCommit(
	session: ActiveWorkflowSession,
): Promise<WorkflowDeterministicProcedureResult> {
	const targetStory = readWorkflowStringValue(session.workflowValues, BlindReviewWorkflowValueKey.TargetStory)
	if (targetStory === undefined) {
		return {
			kind: "failed",
			errorMessage: "Blind Review commit validation failed: target_story workflow value is missing.",
		}
	}

	const projectRootResult = resolveBlindReviewStoryProjectRoot(targetStory)
	if ("errorMessage" in projectRootResult) {
		return {
			kind: "failed",
			errorMessage: projectRootResult.errorMessage,
		}
	}

	const submittedCommitHash = readFormStringValue(session, BLIND_REVIEW_COMMIT_HASH_FIELD_KEY)
	if (submittedCommitHash === undefined) {
		return { kind: "succeeded" }
	}

	const gitRepositoryCheck = await runBlindReviewGitCommand({
		selectedProjectRoot: projectRootResult.selectedProjectRoot,
		gitArgs: ["rev-parse", "--is-inside-work-tree"],
	})
	if (gitCommandFailed(gitRepositoryCheck)) {
		return { kind: "succeeded" }
	}

	const commitResolution = await runBlindReviewGitCommand({
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

	const parentResolution = await runBlindReviewGitCommand({
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
			[BlindReviewWorkflowValueKey.ReviewCommitHash]: normalizedCommitHash,
			[BlindReviewWorkflowValueKey.ReviewCommitParent]: parentHash,
		},
	}
}

const BLIND_REVIEW_STEP_2_PROMPT = `Your job is to perform a blind adversarial review using git-backed evidence to identify misconfigured or lazily-written code. You are not to read any project documentation during this review.
Use these commit hashes:
commit hash: {workflow.review_commit_hash}
parent hash: {workflow.review_commit_parent}

Use only the provided commit hash and parent hash to inspect the implementation changes.

1. Run \`git diff --name-status {workflow.review_commit_parent} {workflow.review_commit_hash}\` to identify every changed, added, deleted, renamed, or copied file.

2. For each changed file from the name-status output, inspect the implementation diff with:
   \`git diff {workflow.review_commit_parent} {workflow.review_commit_hash} -- <path>\`
   - Ignore project documents which were included in the name-status output.

3. Review every changed file that is not a project document. Do not skip files because they appear small, generated, deleted, renamed, copied, test-only, or configuration-only.
  - Ignore files located in docs/projects

4. For renamed or copied files, assess both the path change and the content change shown by Git.

5. Do not read the story document, review scope manifest, epics document, architecture document, requirements, action plan, or other planning/source-instruction documents. This is a blind review of the implementation diff only.

6. Based only on the implementation diff, assess the changes using these review lenses:

- Contract pass:
  - For every changed symbol, ask what visible caller, callee, serializer, validator, storage path, UI path, or test depends on this shape, name, default, or behavior.
  - Look for changed code that references symbols, files, routes, tools, values, or tests that were not updated in the same commit.
  - Look for broken or stale imports/exports, inconsistent names/constants, and deleted or renamed files that leave visible stale references.

- Omission pass:
  - Ask what should have changed with this based only on the diff.
  - Look for missing wiring, registrations, migrations, feature flags, permissions, cleanup, or tests that are implied by changed code.

- Failure-path pass:
  - Ignore happy path and test the diff mentally under null, empty, malformed, duplicate, stale, slow, unauthorized, partial, retried, and concurrent conditions.
  - Look for missing error handling around newly introduced failure paths.

- State pass:
  - Track changed state lifecycle by hand: where it is created, transformed, cached, invalidated, retried, rolled back, and cleared.
  - Look for new persistence/writes without a corresponding read/use path visible in the diff.

- Config pass:
  - Check assumptions in constants, defaults, env vars, paths, timeout values, fallback branches, and temporary bypasses.
  - Look for hardcoded values where the diff itself shows an existing constant, enum, helper, or configuration path should be used.

- Compatibility pass:
  - Ask what older callers, persisted data, or partial deploys would do against the changed behavior when that risk is visible from the diff.
  - Look for interface drift: renamed fields, changed enums, altered return shapes, optionality changes, and default changes.

- Type-safety pass:
  - Look for \`any\`, \`as any\`, forced casts used instead of narrowing, non-null assertions where runtime absence is possible, incomplete discriminated-union handling, missing explicit return types on new helpers, and truthy/falsy checks where explicit checks are needed.

- Implementation hygiene pass:
  - Look for unused imports, unused helpers, dead branches, commented-out experiments, duplicate logic, partial scaffolding, broad catches, silent fallbacks, optionalized requirements, deferred TODOs, and code that appears added only to satisfy checks rather than to preserve correctness.

- Test skepticism pass:
  - Treat tests as claims, not proof.
  - Look for tests asserting implementation trivia without behavior, incomplete or malformed fixtures, tests updated inconsistently with runtime behavior, happy-path-only coverage, snapshots hiding logic changes, mocks that no longer match reality, and missing regression coverage.

- Behavioral-risk pass:
  - Look for changed conditionals that appear inverted or unreachable.
  - Look for new async operations without awaiting or error handling.
  - Look for boundary violations visible in the diff, such as trust moved from server to client, authorization checked only in UI, skipped sanitization, or path/command injection risk.

7. Document your findings in {workflow.blind_review_output} including:
   - any findings, ordered by severity.
   - for each finding, include:
    - a brief title for the finding
    - file/path references for each finding
    - a detailed description of the finding
   - a clear statement if no actionable issues were found

Once you've completed your review and documented your findings, use attempt_completion to provide a review summary including:
- number of findings, or statement that no findings were identified
- full file path for your output: {workflow.blind_review_output}`

function buildStep2PromptSource(): WorkflowStepPromptSource {
	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: BLIND_REVIEW_STEP_2_PROMPT,
	}
}

export function failBlindReviewOutputArtifactAllocation(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult {
	const targetStory =
		readWorkflowStringValue(session.workflowValues, BlindReviewWorkflowValueKey.TargetStory) ?? "unknown target_story"
	const backendReason = session.branchContext.failureState?.terminalErrorMessage ?? "Tool-backed operation failed."

	return {
		kind: "failed",
		errorMessage: `Blind Review output artifact creation failed for target_story ${targetStory}: ${backendReason}`,
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
			triggerEvent.workflowFormId === BLIND_REVIEW_STEP_1_FORM_ID &&
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

function reviewEvidenceValuesArePresent(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, BlindReviewWorkflowValueKey.TargetStory) !== undefined &&
			readWorkflowStringValue(workflowValues, BlindReviewWorkflowValueKey.ReviewCommitHash) !== undefined &&
			readWorkflowStringValue(workflowValues, BlindReviewWorkflowValueKey.ReviewCommitParent) !== undefined,
	}
}

function reviewEvidenceValuesAreMissing(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, BlindReviewWorkflowValueKey.TargetStory) === undefined ||
			readWorkflowStringValue(workflowValues, BlindReviewWorkflowValueKey.ReviewCommitHash) === undefined ||
			readWorkflowStringValue(workflowValues, BlindReviewWorkflowValueKey.ReviewCommitParent) === undefined,
	}
}

function reviewCommitHashIsValid(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, BlindReviewWorkflowValueKey.ReviewCommitHash) !== undefined &&
			readWorkflowStringValue(workflowValues, BlindReviewWorkflowValueKey.ReviewCommitParent) !== undefined,
	}
}

function reviewCommitHashIsInvalid(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, BlindReviewWorkflowValueKey.ReviewCommitHash) === undefined ||
			readWorkflowStringValue(workflowValues, BlindReviewWorkflowValueKey.ReviewCommitParent) === undefined,
	}
}

function buildStep1ContinuationReplacementBuilder(panelId: string): WorkflowFormContinuationReplacementBuilder {
	return () => {
		const panel = buildBlindReviewStep1WorkflowForm().panels[panelId]
		if (panel === undefined) {
			throw new Error(`Blind Review Step 1 workflow form is missing requested continuation panel ${panelId}.`)
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
						id: "step-1-derive-existing-target-story-values",
						trigger: reviewEvidenceValuesArePresent(),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveBlindReviewTargetStoryValues,
							},
						},
						followingBranchId: "step-1-allocate-blind-review-output",
					},
					{
						id: "step-1-resolve-target-story",
						trigger: reviewEvidenceValuesAreMissing(),
						action: {
							kind: "resolve_prerequisite_files",
							prerequisiteIds: [BLIND_REVIEW_TARGET_STORY_PREREQUISITE_ID],
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
								run: deriveBlindReviewTargetStoryValues,
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
							workflowFormId: BLIND_REVIEW_STEP_1_FORM_ID,
							startPanelId: BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
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
						trigger: workflowFormPanelSubmitted(BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID, "submit"),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: validateAndPersistBlindReviewCommit,
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
						id: "step-1-route-valid-commit-metadata",
						trigger: reviewCommitHashIsValid(),
						action: {
							kind: "no_op",
						},
						followingBranchId: "step-1-allocate-blind-review-output",
					},
					{
						id: "step-1-continue-to-invalid-commit-panel",
						trigger: reviewCommitHashIsInvalid(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: BLIND_REVIEW_STEP_1_FORM_ID,
							panelId: BLIND_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								BLIND_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
							),
						},
						followingBranchId: "step-1-await-commit-form-panel",
					},
				],
			},
			"step-1-allocate-blind-review-output": {
				id: "step-1-allocate-blind-review-output",
				routes: [
					{
						id: "step-1-allocate-blind-review-output",
						trigger: { kind: "always" },
						action: {
							kind: "allocate_artifact",
							artifactId: BLIND_REVIEW_OUTPUT_ARTIFACT_ID,
						},
						followingBranchId: "step-1-await-blind-review-output-allocation",
					},
				],
			},
			"step-1-await-blind-review-output-allocation": {
				id: "step-1-await-blind-review-output-allocation",
				routes: [
					{
						id: "step-1-transition-to-step-2",
						trigger: toolBackedOperationSucceeded(
							"step-1-allocate-blind-review-output",
							"step-1-allocate-blind-review-output",
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
						id: "step-1-fail-after-blind-review-output-allocation",
						trigger: toolBackedOperationFailed(
							"step-1-allocate-blind-review-output",
							"step-1-allocate-blind-review-output",
						),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: failBlindReviewOutputArtifactAllocation,
							},
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

export const blindReviewWorkflowDefinition: WorkflowDefinition = {
	name: BLIND_REVIEW_WORKFLOW_NAME,
	displayName: BLIND_REVIEW_WORKFLOW_DISPLAY_NAME,
	description: BLIND_REVIEW_WORKFLOW_DESCRIPTION,
	slashCommandName: BLIND_REVIEW_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: BLIND_REVIEW_WORKFLOW_USE_SKILL_NAME,
	persona: BLIND_REVIEW_WORKFLOW_PERSONA,
	projectSelection: { kind: "interactive" },
	projectOutputPlacement: { kind: "selected_project_subfolder", subfolder: BLIND_REVIEW_WORKFLOW_PROJECT_SUBFOLDER },
	workflowValueKeys: BLIND_REVIEW_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: BLIND_REVIEW_ENTRY_PROJECT_VALUE_KEYS,
	entryPanel: {
		promptMarkdown: BLIND_REVIEW_WORKFLOW_DESCRIPTION,
	},
	workflowForms: {
		[BLIND_REVIEW_STEP_1_FORM_ID]: buildBlindReviewStep1WorkflowForm(),
	},
	prerequisiteFiles: BLIND_REVIEW_PREREQUISITE_FILES,
	artifacts: BLIND_REVIEW_ARTIFACTS,
	childInheritance: [
		{
			parentKey: "review_commit_hash",
			childKey: "review_commit_hash",
		},
		{
			parentKey: "review_commit_parent",
			childKey: "review_commit_parent",
		},
		{
			parentKey: "target_story",
			childKey: "target_story",
		},
	],
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Prepare Inputs & Set Workflow Variables",
			decisionTree: buildStep1DecisionTree(),
			buildToolSchema: buildBlindReviewStep1ToolSchemas,
		}),
		"step-2": createStepDefinition({
			stepNumber: 2,
			checklistLabel: "Perform Blind Adversarial Review",
			decisionTree: buildStep2DecisionTree(),
			buildPromptSource: buildStep2PromptSource,
			buildToolSchema: buildBlindReviewStep2ToolSchemas,
			promptTemplates: [BLIND_REVIEW_STEP_2_PROMPT],
		}),
	},
}
