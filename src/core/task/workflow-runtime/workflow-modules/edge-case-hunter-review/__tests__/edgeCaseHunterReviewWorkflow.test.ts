import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import type {
	WorkflowFormDefinitionPayload,
	WorkflowFormFieldDefinition,
	WorkflowFormPanelAction,
	WorkflowFormPanelDefinition,
} from "@shared/ExtensionMessage"
import { expect } from "chai"
import { describe, it } from "mocha"
import { TaskState } from "@/core/task/TaskState"
import type { WorkflowFormSessionState } from "@/core/task/workflow-form/types"
import { ClineDefaultTool } from "@/shared/tools"
import { WorkflowArtifactFamily } from "../../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionAction,
	WorkflowDecisionBranchEvaluationInput,
	WorkflowDecisionBranchRoute,
	WorkflowDeterministicProcedureResult,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowValues,
	WorkflowWorkspacePathPolicy,
} from "../../../types"
import {
	resolveWorkflowBySlashCommand,
	resolveWorkflowByUseSkillName,
	resolveWorkflowDefinition,
} from "../../../WorkflowRegistry"
import { WorkflowRuntime } from "../../../WorkflowRuntime"
import { renderWorkflowPromptTemplate } from "../../../workflowPromptTemplates"
import {
	buildAndPersistEdgeCaseHunterReviewScopeManifest,
	buildEdgeCaseHunterReviewStep1WorkflowForm,
	deriveEdgeCaseHunterReviewTargetStoryValues,
	EDGE_CASE_HUNTER_REVIEW_ARTIFACTS,
	EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY,
	EDGE_CASE_HUNTER_REVIEW_ENTRY_PROJECT_VALUE_KEYS,
	EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID,
	EDGE_CASE_HUNTER_REVIEW_PREREQUISITE_FILES,
	EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID,
	EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID,
	EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
	EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
	EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID,
	EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DESCRIPTION,
	EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DISPLAY_NAME,
	EDGE_CASE_HUNTER_REVIEW_WORKFLOW_NAME,
	EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PERSONA,
	EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PROJECT_SUBFOLDER,
	EDGE_CASE_HUNTER_REVIEW_WORKFLOW_SLASH_COMMAND_NAME,
	EDGE_CASE_HUNTER_REVIEW_WORKFLOW_USE_SKILL_NAME,
	EDGE_CASE_HUNTER_REVIEW_WORKFLOW_VALUE_KEYS,
	EdgeCaseHunterReviewWorkflowValueKey,
	edgeCaseHunterReviewWorkflowDefinition,
	failEdgeCaseHunterReviewOutputArtifactAllocation,
	failEdgeCaseHunterReviewScopeManifestArtifactAllocation,
	failMissingInheritedEdgeCaseHunterReviewEvidence,
	runEdgeCaseHunterReviewGitCommand,
	validateAndPersistEdgeCaseHunterReviewCommit,
} from ".."

const PROJECT_ROOT = "/tmp/edge-case-hunter-review-project"
const TARGET_STORY_PATH = `${PROJECT_ROOT}/implementation/stories-review/Story-1-1.md`
const REVIEW_FOLDER_PATH = `${PROJECT_ROOT}/review`
const REVIEW_SCOPE_MANIFEST_PATH = `${REVIEW_FOLDER_PATH}/review-scope-1-1.md`
const EDGE_CASE_REVIEW_OUTPUT_PATH = `${REVIEW_FOLDER_PATH}/edge-case-hunter-1-1.md`
const SAMPLE_WORKFLOW_VALUES: WorkflowValues = {
	[EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: TARGET_STORY_PATH,
	[EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1",
	[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash]: "abc123",
	[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent]: "def456",
	[EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest]: REVIEW_SCOPE_MANIFEST_PATH,
	[EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifestArtifactFamily]: "review_scope_manifest",
	[EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity]: "1.1",
	[EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifestArtifactFilename]: "review-scope-1-1.md",
	[EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifestArtifactRelativePath]: "review/review-scope-1-1.md",
	[EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutput]: EDGE_CASE_REVIEW_OUTPUT_PATH,
	[EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutputArtifactFamily]: "edge_case_review_output",
	[EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutputArtifactIdentity]: "1.1",
	[EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutputArtifactFilename]: "edge-case-hunter-1-1.md",
	[EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutputArtifactRelativePath]: "review/edge-case-hunter-1-1.md",
}

const STEP_2_TOOL_NAMES: readonly string[] = [
	"execute_command",
	"list_files",
	"search_files",
	"list_code_definition_names",
	"read_file",
	"read_file_range",
	"apply_patch",
	"write_to_file",
	"send_user_message",
	"attempt_completion",
]

const FORBIDDEN_MODEL_FACING_TOOL_NAMES: readonly string[] = [
	"web_search",
	"web_fetch",
	"browser_action",
	"ask_followup_question",
	"use_subagents",
	"use_skill",
	"set_workflow_values",
	"build_workflow_document",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
	"workflow_progress_request",
	"use_mcp_tool",
	"access_mcp_resource",
	"load_mcp_documentation",
	"build_review_input",
	"build_review_diff_output",
	"code_review_spec_update",
	"record_findings",
]

function createSession(
	workflowValues: WorkflowValues,
	projectRoot = PROJECT_ROOT,
	branchContext: ActiveWorkflowSession["branchContext"] = { activeBranchId: "step-1-route-by-existing-values" },
	formSession: WorkflowFormSessionState | undefined = undefined,
): ActiveWorkflowSession {
	return {
		activeStepNumber: 1,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: basename(projectRoot),
			projectFolderName: basename(projectRoot),
		},
		lifecycle: {
			projectSelectionCompleted: true,
		},
		entryArtifactResolution: undefined,
		ui: {
			formSession,
			stepResolutionSession: undefined,
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext,
	}
}

function createPredicateSession(args: { activeBranchId: string; workflowValues: WorkflowValues }): ActiveWorkflowSession {
	return {
		activeStepNumber: 1,
		workflowValues: args.workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Predicate Test Project",
			projectFolderName: "predicate-test-project",
		},
		lifecycle: {
			projectSelectionCompleted: true,
		},
		entryArtifactResolution: undefined,
		ui: {
			formSession: undefined,
			stepResolutionSession: undefined,
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext: {
			activeBranchId: args.activeBranchId,
		},
	}
}

function createSessionPredicateInput(args: {
	activeBranchId: string
	workflowValues: WorkflowValues
	step: WorkflowStepDefinition
}): WorkflowDecisionBranchEvaluationInput {
	return {
		activeBranchId: args.activeBranchId,
		workflowValues: args.workflowValues,
		step: args.step,
		session: createPredicateSession({
			activeBranchId: args.activeBranchId,
			workflowValues: args.workflowValues,
		}),
	}
}

function createEventPredicateInput(args: {
	activeBranchId: string
	workflowValues: WorkflowValues
	step: WorkflowStepDefinition
	triggerEvent: WorkflowBranchTriggerEvent
}): WorkflowDecisionBranchEvaluationInput & { triggerEvent: WorkflowBranchTriggerEvent } {
	return {
		activeBranchId: args.activeBranchId,
		workflowValues: args.workflowValues,
		step: args.step,
		session: createPredicateSession({
			activeBranchId: args.activeBranchId,
			workflowValues: args.workflowValues,
		}),
		triggerEvent: args.triggerEvent,
	}
}

function buildCommitFormSession(commitHash: string): WorkflowFormSessionState {
	const definitionPayload = buildEdgeCaseHunterReviewStep1WorkflowForm()
	return {
		sessionId: "test-edge-case-hunter-review-form-session",
		workflowFormId: EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID,
		definitionVersion: definitionPayload.definitionVersion,
		definitionPayload,
		firstPanelId: EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
		currentPanelId: EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
		values: {
			[EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY]: {
				valueType: "string",
				stringValue: commitHash,
			},
		},
		data: {},
	}
}

function getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition {
	const step = edgeCaseHunterReviewWorkflowDefinition.steps[stepId]
	if (step === undefined) {
		throw new Error(`Missing step ${stepId}.`)
	}

	return step
}

function findRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const route = getStep(stepId).decisionTree.branches[branchId]?.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Missing route ${stepId}/${branchId}/${routeId}.`)
	}

	return route
}

function getWorkflowForm(workflowFormId: string): WorkflowFormDefinitionPayload {
	const form = edgeCaseHunterReviewWorkflowDefinition.workflowForms?.[workflowFormId]
	if (form === undefined) {
		throw new Error(`Missing workflow form ${workflowFormId}.`)
	}

	return form
}

function getPanel(form: WorkflowFormDefinitionPayload, panelId: string): WorkflowFormPanelDefinition {
	const panel = form.panels[panelId]
	if (panel === undefined) {
		throw new Error(`Missing panel ${panelId}.`)
	}

	return panel
}

function getSingleField(panel: WorkflowFormPanelDefinition): WorkflowFormFieldDefinition {
	const field = panel.fields[0]
	if (field === undefined) {
		throw new Error(`Missing field for panel ${panel.panelId}.`)
	}

	return field
}

function createPromptInput(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): WorkflowPromptBuilderInput {
	const step = getStep(stepId)
	return {
		session: createSession(workflowValues),
		step,
	}
}

function buildPrompt(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): string {
	const promptSource = getStep(stepId).buildPromptSource(createPromptInput(stepId, workflowValues))
	if (promptSource.kind !== "current_step_instruction_template") {
		throw new Error(`Missing current step instruction template for ${stepId}.`)
	}

	const template = promptSource.currentStepInstructionTemplate
	return renderWorkflowPromptTemplate({
		template,
		workflowValueKeys: edgeCaseHunterReviewWorkflowDefinition.workflowValueKeys,
		workflowValues,
		context: `edge-case-hunter-review ${stepId} test prompt`,
	})
}

function getToolNamesForStep(stepId: WorkflowStepDefinition["id"]): readonly string[] {
	return getStep(stepId)
		.buildToolSchema(createPromptInput(stepId, {}))
		.map((schema) => schema.name)
}

function buildWorkflowFormPanelSubmittedEvent(
	panelId: string,
	action: WorkflowFormPanelAction = "submit",
): WorkflowBranchTriggerEvent {
	return {
		kind: "workflow_form_panel_submitted",
		workflowFormId: EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID,
		panelId,
		action,
		submittedValueKeys: [],
		clearedValueKeys: [],
	}
}

function buildToolBackedOperationSucceededEvent(branchId: string, routeId: string): WorkflowBranchTriggerEvent {
	return {
		kind: "tool_backed_operation_succeeded",
		sourceRoute: {
			branchId,
			routeId,
		},
	}
}

function buildToolBackedOperationFailedEvent(branchId: string, routeId: string): WorkflowBranchTriggerEvent {
	return {
		kind: "tool_backed_operation_failed",
		sourceRoute: {
			branchId,
			routeId,
		},
		errorMessage: "backend failure",
	}
}

function buildAttemptCompletionSucceededEvent(): WorkflowBranchTriggerEvent {
	return {
		kind: "attempt_completion_succeeded",
	}
}

function expectTransitionStepAction(action: WorkflowDecisionAction, stepNumber: number): void {
	if (action.kind !== "transition_step") {
		throw new Error(`Expected transition_step, received ${action.kind}.`)
	}

	expect(action.target).to.deep.equal({
		kind: "entry_branch",
		stepNumber,
	})
}

function expectEventPredicateMatches(args: {
	stepId: WorkflowStepDefinition["id"]
	route: WorkflowDecisionBranchRoute
	workflowValues: WorkflowValues
	triggerEvent: WorkflowBranchTriggerEvent
}): void {
	if (args.route.trigger.kind !== "event_predicate") {
		throw new Error(`Expected event_predicate trigger, received ${args.route.trigger.kind}.`)
	}

	expect(
		args.route.trigger.matches(
			createEventPredicateInput({
				activeBranchId: "test-branch",
				workflowValues: args.workflowValues,
				step: getStep(args.stepId),
				triggerEvent: args.triggerEvent,
			}),
		),
	).to.equal(true)
}

function expectSessionPredicateMatches(args: {
	stepId: WorkflowStepDefinition["id"]
	route: WorkflowDecisionBranchRoute
	workflowValues: WorkflowValues
}): void {
	if (args.route.trigger.kind !== "session_predicate") {
		throw new Error(`Expected session_predicate trigger, received ${args.route.trigger.kind}.`)
	}

	expect(
		args.route.trigger.matches(
			createSessionPredicateInput({
				activeBranchId: "test-branch",
				workflowValues: args.workflowValues,
				step: getStep(args.stepId),
			}),
		),
	).to.equal(true)
}

function expectSucceeded(
	result: WorkflowDeterministicProcedureResult,
): Extract<WorkflowDeterministicProcedureResult, { kind: "succeeded" }> {
	expect(result.kind).to.equal("succeeded")
	if (result.kind !== "succeeded") {
		throw new Error(result.errorMessage)
	}

	return result
}

function expectSucceededWithoutCommitWrites(result: WorkflowDeterministicProcedureResult): void {
	const succeededResult = expectSucceeded(result)
	expect(succeededResult.workflowValueWrites).to.equal(undefined)
}

async function runRequiredGitCommand(selectedProjectRoot: string, gitArgs: readonly string[]): Promise<string> {
	const result = await runEdgeCaseHunterReviewGitCommand({ selectedProjectRoot, gitArgs })
	if (result.exitCode !== 0) {
		throw new Error(`Git command failed: git ${gitArgs.join(" ")}\n${result.stderr}`)
	}

	return result.stdout.trim()
}

async function createTemporaryGitProject(): Promise<{
	root: string
	targetStory: string
	firstCommitHash: string
	secondCommitHash: string
}> {
	const root = await mkdtemp(join(tmpdir(), "edge-case-hunter-review-workflow-"))
	const reviewStoriesFolder = join(root, "implementation", "stories-review")
	const targetStory = join(reviewStoriesFolder, "Story-1-1.md")
	const implementationFile = join(root, "implementation-source.ts")

	await mkdir(reviewStoriesFolder, { recursive: true })
	await writeFile(targetStory, "# Story\n", "utf8")
	await runRequiredGitCommand(root, ["init"])
	await runRequiredGitCommand(root, ["config", "user.email", "edge-case-hunter-review@example.com"])
	await runRequiredGitCommand(root, ["config", "user.name", "Edge Case Hunter Review Test"])

	await writeFile(implementationFile, "export const value = 1\n", "utf8")
	await runRequiredGitCommand(root, ["add", "implementation-source.ts"])
	await runRequiredGitCommand(root, ["commit", "-m", "first commit"])
	const firstCommitHash = await runRequiredGitCommand(root, ["rev-parse", "HEAD"])

	await writeFile(implementationFile, "export const value = 2\n", "utf8")
	await runRequiredGitCommand(root, ["add", "implementation-source.ts"])
	await runRequiredGitCommand(root, ["commit", "-m", "second commit"])
	const secondCommitHash = await runRequiredGitCommand(root, ["rev-parse", "HEAD"])

	return {
		root,
		targetStory,
		firstCommitHash,
		secondCommitHash,
	}
}

describe("edgeCaseHunterReviewWorkflowDefinition", () => {
	it("declares workflow identity, Fred persona, entry panel, value keys, and entry project keys", () => {
		expect(edgeCaseHunterReviewWorkflowDefinition.name).to.equal(EDGE_CASE_HUNTER_REVIEW_WORKFLOW_NAME)
		expect(edgeCaseHunterReviewWorkflowDefinition.displayName).to.equal(EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DISPLAY_NAME)
		expect(edgeCaseHunterReviewWorkflowDefinition.description).to.equal(EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DESCRIPTION)
		expect(edgeCaseHunterReviewWorkflowDefinition.slashCommandName).to.equal(
			EDGE_CASE_HUNTER_REVIEW_WORKFLOW_SLASH_COMMAND_NAME,
		)
		expect(edgeCaseHunterReviewWorkflowDefinition.useSkillName).to.equal(EDGE_CASE_HUNTER_REVIEW_WORKFLOW_USE_SKILL_NAME)
		expect(edgeCaseHunterReviewWorkflowDefinition.projectSubfolder).to.equal(
			EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PROJECT_SUBFOLDER,
		)
		expect(edgeCaseHunterReviewWorkflowDefinition.persona).to.deep.equal(EDGE_CASE_HUNTER_REVIEW_WORKFLOW_PERSONA)
		expect(edgeCaseHunterReviewWorkflowDefinition.entryPanel.promptMarkdown).to.equal(
			EDGE_CASE_HUNTER_REVIEW_WORKFLOW_DESCRIPTION,
		)
		expect(edgeCaseHunterReviewWorkflowDefinition.workflowValueKeys).to.deep.equal(
			EDGE_CASE_HUNTER_REVIEW_WORKFLOW_VALUE_KEYS,
		)
		expect(edgeCaseHunterReviewWorkflowDefinition.entryProjectValueKeys).to.deep.equal(
			EDGE_CASE_HUNTER_REVIEW_ENTRY_PROJECT_VALUE_KEYS,
		)
	})

	it("declares child inheritance for parent-provided review evidence", () => {
		expect(edgeCaseHunterReviewWorkflowDefinition.childInheritance).to.deep.equal([
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
			{
				parentKey: "review_scope_manifest",
				childKey: "review_scope_manifest",
			},
		])
	})

	it("resolves edge-case-hunter-review through every registry lookup", () => {
		expect(resolveWorkflowDefinition("edge-case-hunter-review")).to.equal(edgeCaseHunterReviewWorkflowDefinition)
		expect(resolveWorkflowBySlashCommand("edge-case-hunter-review")).to.equal(edgeCaseHunterReviewWorkflowDefinition)
		expect(resolveWorkflowByUseSkillName("edge-case-hunter-review")).to.equal(edgeCaseHunterReviewWorkflowDefinition)
	})

	it("does not preserve retired edge-case-hunter workflow aliases", () => {
		const retiredNames: readonly string[] = [
			"review-edge-case-hunter",
			"review-edge-case-hunter.md",
			"edge-case-hunter-review.md",
		]

		for (const name of retiredNames) {
			expect(resolveWorkflowDefinition(name)).to.equal(undefined)
			expect(resolveWorkflowBySlashCommand(name)).to.equal(undefined)
			expect(resolveWorkflowByUseSkillName(name)).to.equal(undefined)
		}
	})

	it("activates from a parent session through the registered workflow name", async () => {
		const workspacePathPolicy: WorkflowWorkspacePathPolicy = { validateAccess: () => true }
		const runtime = new WorkflowRuntime({ cwd: PROJECT_ROOT, workspacePathPolicy })
		const taskState = new TaskState()
		const parentSession = createSession(SAMPLE_WORKFLOW_VALUES)

		const result = await runtime.activateWorkflow({
			taskState,
			workflowName: "edge-case-hunter-review",
			parentSession,
			parentWorkflowName: "parent-workflow",
		})

		expect(result.kind).to.equal("execute_tool_backed_operation")
		if (result.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${result.kind}.`)
		}
		expect(result.toolRequest.toolName).to.equal(ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT)
		expect(result.toolRequest.toolParams.artifact_id).to.equal(EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID)
		expect(taskState.activeWorkflowName).to.equal("edge-case-hunter-review")

		const childSession = taskState.activeWorkflowSession
		expect(childSession).not.to.equal(undefined)
		if (childSession === undefined) {
			throw new Error("Expected active edge-case-hunter-review child workflow session.")
		}
		expect(childSession.projectSelection).to.deep.equal(parentSession.projectSelection)
		expect(childSession.projectSelection).not.to.equal(parentSession.projectSelection)
		expect(childSession.lifecycle).to.deep.equal({ projectSelectionCompleted: true, parentWorkflowName: "parent-workflow" })
		expect(childSession.workflowValues).to.deep.include({
			[EdgeCaseHunterReviewWorkflowValueKey.TargetStory]:
				parentSession.workflowValues[EdgeCaseHunterReviewWorkflowValueKey.TargetStory],
			[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash]:
				parentSession.workflowValues[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash],
			[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent]:
				parentSession.workflowValues[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent],
			[EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest]:
				parentSession.workflowValues[EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest],
		})
	})

	it("declares the target story prerequisite", () => {
		const prerequisite =
			edgeCaseHunterReviewWorkflowDefinition.prerequisiteFiles?.[EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID]

		if (prerequisite === undefined) {
			throw new Error("Missing target story prerequisite.")
		}

		expect(prerequisite).to.deep.equal(
			EDGE_CASE_HUNTER_REVIEW_PREREQUISITE_FILES[EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID],
		)
		expect(prerequisite.producingWorkflowName).to.equal("dev-story")
		expect(prerequisite.projectSubfolderSegments).to.deep.equal(["implementation", "stories-review"])
		expect(prerequisite.workflowValueKey).to.equal(EdgeCaseHunterReviewWorkflowValueKey.TargetStory)
		expect(prerequisite.outputDocumentReference).to.equal("none")
		expect(prerequisite.match.kind).to.equal("naming_pattern")
		if (prerequisite.match.kind !== "naming_pattern") {
			throw new Error("Expected naming_pattern prerequisite match.")
		}
		expect(prerequisite.match.pattern.test("Story-1-1.md")).to.equal(true)
		expect(prerequisite.match.pattern.test("Remediation-story-1-1-1.md")).to.equal(true)
	})

	it("declares the review scope manifest artifact", () => {
		expect(edgeCaseHunterReviewWorkflowDefinition.artifacts).to.deep.equal(EDGE_CASE_HUNTER_REVIEW_ARTIFACTS)

		const artifact = EDGE_CASE_HUNTER_REVIEW_ARTIFACTS[EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID]
		if (artifact === undefined) {
			throw new Error("Missing review scope manifest artifact.")
		}

		expect(artifact.family).to.equal(WorkflowArtifactFamily.ReviewScopeManifest)
		expect(artifact.intentMode).to.equal("derived")
		expect(artifact.parentIdentitySource).to.equal(undefined)
		expect(artifact.targetIdentitySource).to.deep.equal({
			kind: "workflow_value",
			key: EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity,
		})
		expect(artifact.outputValueKeys).to.deep.equal({
			projectTitle: EdgeCaseHunterReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: EdgeCaseHunterReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifestArtifactFamily,
			artifactIdentity: EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity,
			artifactFilename: EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifestArtifactFilename,
			artifactRelativePath: EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifestArtifactRelativePath,
			artifactAbsolutePath: EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest,
			parentIdentity: undefined,
			targetIdentity: EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity,
		})
	})

	it("declares the edge-case review output artifact", () => {
		const artifact = EDGE_CASE_HUNTER_REVIEW_ARTIFACTS[EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID]
		if (artifact === undefined) {
			throw new Error("Missing edge-case review output artifact.")
		}

		expect(artifact.family).to.equal(WorkflowArtifactFamily.EdgeCaseReviewOutput)
		expect(artifact.intentMode).to.equal("derived")
		expect(artifact.parentIdentitySource).to.equal(undefined)
		expect(artifact.targetIdentitySource).to.deep.equal({
			kind: "workflow_value",
			key: EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity,
		})
		expect(artifact.outputValueKeys).to.deep.equal({
			projectTitle: EdgeCaseHunterReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: EdgeCaseHunterReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutputArtifactFamily,
			artifactIdentity: EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutputArtifactIdentity,
			artifactFilename: EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutputArtifactFilename,
			artifactRelativePath: EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutputArtifactRelativePath,
			artifactAbsolutePath: EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutput,
			parentIdentity: undefined,
			targetIdentity: EdgeCaseHunterReviewWorkflowValueKey.EdgeCaseReviewOutputArtifactIdentity,
		})
	})

	it("defines the Step 1 commit form Panel A", () => {
		const form = getWorkflowForm(EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID)
		expect(form).to.deep.equal(buildEdgeCaseHunterReviewStep1WorkflowForm())
		expect(form.firstPanelId).to.equal(EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)

		const panel = getPanel(form, EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)
		expect(panel.title).to.equal("Identify Implementation Evidence")
		expect(panel.promptMarkdown).to.equal("Provide the commit hash for the target story's commit.")
		expect(panel.allowedActions).to.deep.equal(["submit"])
		expect(panel.actionLabels).to.deep.equal({ submit: "submit" })
		expect(panel.transition).to.deep.equal({ type: "runtime_routed" })

		const field = getSingleField(panel)
		expect(field).to.deep.include({
			key: EDGE_CASE_HUNTER_REVIEW_COMMIT_HASH_FIELD_KEY,
			kind: "small_text",
			label: "commit hash",
			required: true,
			allowedValueType: "string",
		})
	})

	it("defines the Step 1 invalid commit Panel B", () => {
		const panel = getPanel(
			getWorkflowForm(EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID),
			EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
		)

		expect(panel.title).to.equal("Invalid Commit Hash")
		expect(panel.promptMarkdown).to.equal(
			"The provided commit hash is invalid. Please go back and provide a valid commit hash.",
		)
		expect(panel.fields).to.deep.equal([])
		expect(panel.allowedActions).to.deep.equal(["back"])
		expect(panel.actionLabels).to.deep.equal({ back: "back" })
		expect(panel.transition).to.deep.equal({
			type: "conditional",
			conditionSourceKey: "__terminal__",
			branches: [],
			defaultTerminal: true,
		})
		expect(panel.backDestinationPanelId).to.equal(EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)
	})

	it("declares exact step labels and model-facing tool surfaces", () => {
		expect(getStep("step-1").checklistLabel).to.equal("Gather Inputs & Generate Output File")
		expect(getStep("step-2").checklistLabel).to.equal("Conduct Exhaustive Path Analysis")
		expect(getToolNamesForStep("step-1")).to.deep.equal([])
		expect(getToolNamesForStep("step-2")).to.deep.equal(STEP_2_TOOL_NAMES)

		const stepIds: readonly WorkflowStepDefinition["id"][] = ["step-1", "step-2"]
		for (const stepId of stepIds) {
			const toolNames = getToolNamesForStep(stepId)
			for (const forbiddenToolName of FORBIDDEN_MODEL_FACING_TOOL_NAMES) {
				expect(toolNames).not.to.include(forbiddenToolName)
			}
		}
	})

	it("declares Step 1 entry route order", () => {
		const entryBranch = getStep("step-1").decisionTree.branches["step-1-route-by-existing-values"]
		if (entryBranch === undefined) {
			throw new Error("Missing Step 1 entry branch.")
		}

		expect(entryBranch.routes.map((route) => route.id)).to.deep.equal([
			"step-1-fail-missing-inherited-review-evidence",
			"step-1-derive-existing-target-story-values",
			"step-1-resolve-target-story",
		])
	})

	it("routes missing inherited review evidence to deterministic failure", () => {
		const route = findRoute("step-1", "step-1-route-by-existing-values", "step-1-fail-missing-inherited-review-evidence")

		expectSessionPredicateMatches({ stepId: "step-1", route, workflowValues: {} })
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		expect(route.action.instruction.run).to.equal(failMissingInheritedEdgeCaseHunterReviewEvidence)
	})

	it("routes complete inherited review evidence to output allocation without prerequisite or form", () => {
		const route = findRoute("step-1", "step-1-route-by-existing-values", "step-1-derive-existing-target-story-values")

		expectSessionPredicateMatches({ stepId: "step-1", route, workflowValues: SAMPLE_WORKFLOW_VALUES })
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		expect(route.action.instruction.run).to.equal(deriveEdgeCaseHunterReviewTargetStoryValues)
		expect(route.followingBranchId).to.equal("step-1-allocate-edge-case-review-output")
	})

	it("routes main-agent entry project values with missing evidence to prerequisite resolution", () => {
		const route = findRoute("step-1", "step-1-route-by-existing-values", "step-1-resolve-target-story")

		expectSessionPredicateMatches({
			stepId: "step-1",
			route,
			workflowValues: {
				[EdgeCaseHunterReviewWorkflowValueKey.ProjectMode]: "existing",
				[EdgeCaseHunterReviewWorkflowValueKey.ProjectTitle]: "Edge Case Hunter Review Session",
				[EdgeCaseHunterReviewWorkflowValueKey.ProjectFolderName]: "test-project",
			},
		})
		expect(route.action).to.deep.equal({
			kind: "resolve_prerequisite_files",
			prerequisiteIds: [EDGE_CASE_HUNTER_REVIEW_TARGET_STORY_PREREQUISITE_ID],
		})
		expect(route.followingBranchId).to.equal("step-1-derive-target-story-values")
	})

	it("routes Step 1 target-story derivation", () => {
		const route = findRoute("step-1", "step-1-derive-target-story-values", "step-1-derive-target-story-values")

		expect(route.trigger).to.deep.equal({ kind: "always" })
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		expect(route.action.instruction.run).to.equal(deriveEdgeCaseHunterReviewTargetStoryValues)
		expect(route.followingBranchId).to.equal("step-1-render-commit-hash-panel")
	})

	it("routes Step 1 commit form rendering", () => {
		const route = findRoute("step-1", "step-1-render-commit-hash-panel", "step-1-render-commit-hash-panel")

		expect(route.trigger).to.deep.equal({ kind: "always" })
		if (route.action.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${route.action.kind}.`)
		}
		expect(route.action.workflowFormId).to.equal(EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID)
		if ("startPanelId" in route.action === false) {
			throw new Error("Expected Step 1 commit panel render action to declare startPanelId.")
		}
		expect(route.action.startPanelId).to.equal(EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)
		expect(route.followingBranchId).to.equal("step-1-await-commit-form-panel")
	})

	it("routes Panel A submission to commit validation", () => {
		const route = findRoute("step-1", "step-1-await-commit-form-panel", "step-1-validate-commit-hash")

		expectEventPredicateMatches({
			stepId: "step-1",
			route,
			workflowValues: {},
			triggerEvent: buildWorkflowFormPanelSubmittedEvent(EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID),
		})
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		expect(route.action.instruction.run).to.equal(validateAndPersistEdgeCaseHunterReviewCommit)
		expect(route.followingBranchId).to.equal("step-1-route-after-commit-validation")
	})

	it("routes valid commit metadata to review-scope artifact allocation", () => {
		const route = findRoute("step-1", "step-1-route-after-commit-validation", "step-1-allocate-review-scope-manifest")

		expectSessionPredicateMatches({
			stepId: "step-1",
			route,
			workflowValues: {
				[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash]: "abc123",
				[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent]: "def456",
			},
		})
		expect(route.action).to.deep.equal({
			kind: "allocate_artifact",
			artifactId: EDGE_CASE_HUNTER_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID,
		})
		expect(route.followingBranchId).to.equal("step-1-await-review-scope-manifest-allocation")
	})

	it("routes invalid commit metadata to Panel B continuation", async () => {
		const route = findRoute("step-1", "step-1-route-after-commit-validation", "step-1-continue-to-invalid-commit-panel")

		expectSessionPredicateMatches({ stepId: "step-1", route, workflowValues: {} })
		if (route.action.kind !== "continue_workflow_form") {
			throw new Error(`Expected continue_workflow_form, received ${route.action.kind}.`)
		}
		expect(route.action.workflowFormId).to.equal(EDGE_CASE_HUNTER_REVIEW_STEP_1_FORM_ID)
		expect(route.action.panelId).to.equal(EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID)
		expect(route.followingBranchId).to.equal("step-1-await-commit-form-panel")
		expect(await Promise.resolve(route.action.buildReplacement(createSession({})))).to.deep.equal({
			panel: getPanel(
				buildEdgeCaseHunterReviewStep1WorkflowForm(),
				EDGE_CASE_HUNTER_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
			),
			data: {},
		})
	})

	it("routes review-scope artifact allocation success to manifest build", () => {
		const route = findRoute(
			"step-1",
			"step-1-await-review-scope-manifest-allocation",
			"step-1-route-after-review-scope-manifest-allocation",
		)

		expectEventPredicateMatches({
			stepId: "step-1",
			route,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-1-route-after-commit-validation",
				"step-1-allocate-review-scope-manifest",
			),
		})
		expect(route.action).to.deep.equal({ kind: "no_op" })
		expect(route.followingBranchId).to.equal("step-1-build-review-scope-manifest")
	})

	it("routes review-scope artifact allocation failure to deterministic failure", () => {
		const route = findRoute(
			"step-1",
			"step-1-await-review-scope-manifest-allocation",
			"step-1-fail-after-review-scope-manifest-allocation",
		)

		expectEventPredicateMatches({
			stepId: "step-1",
			route,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationFailedEvent(
				"step-1-route-after-commit-validation",
				"step-1-allocate-review-scope-manifest",
			),
		})
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		expect(route.action.instruction.run).to.equal(failEdgeCaseHunterReviewScopeManifestArtifactAllocation)
	})

	it("routes review-scope manifest build to edge-case output allocation", () => {
		const route = findRoute("step-1", "step-1-build-review-scope-manifest", "step-1-build-review-scope-manifest")

		expect(route.trigger).to.deep.equal({ kind: "always" })
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		expect(route.action.instruction.run).to.equal(buildAndPersistEdgeCaseHunterReviewScopeManifest)
		expect(route.followingBranchId).to.equal("step-1-allocate-edge-case-review-output")
	})

	it("routes edge-case output artifact allocation", () => {
		const route = findRoute("step-1", "step-1-allocate-edge-case-review-output", "step-1-allocate-edge-case-review-output")

		expect(route.trigger).to.deep.equal({ kind: "always" })
		expect(route.action).to.deep.equal({
			kind: "allocate_artifact",
			artifactId: EDGE_CASE_HUNTER_REVIEW_OUTPUT_ARTIFACT_ID,
		})
		expect(route.followingBranchId).to.equal("step-1-await-edge-case-review-output-allocation")
	})

	it("routes edge-case output artifact allocation success to Step 2", () => {
		const route = findRoute("step-1", "step-1-await-edge-case-review-output-allocation", "step-1-transition-to-step-2")

		expectEventPredicateMatches({
			stepId: "step-1",
			route,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-1-allocate-edge-case-review-output",
				"step-1-allocate-edge-case-review-output",
			),
		})
		expectTransitionStepAction(route.action, 2)
	})

	it("routes edge-case output artifact allocation failure to deterministic failure", () => {
		const route = findRoute(
			"step-1",
			"step-1-await-edge-case-review-output-allocation",
			"step-1-fail-after-edge-case-review-output-allocation",
		)

		expectEventPredicateMatches({
			stepId: "step-1",
			route,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationFailedEvent(
				"step-1-allocate-edge-case-review-output",
				"step-1-allocate-edge-case-review-output",
			),
		})
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		expect(route.action.instruction.run).to.equal(failEdgeCaseHunterReviewOutputArtifactAllocation)
	})

	it("derives primary story identity from target_story", async () => {
		const result = expectSucceeded(
			await deriveEdgeCaseHunterReviewTargetStoryValues(
				createSession({ [EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: TARGET_STORY_PATH }),
			),
		)

		expect(result.workflowValueWrites).to.deep.equal({
			[EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1",
		})
	})

	it("derives remediation story identity from target_story", async () => {
		const result = expectSucceeded(
			await deriveEdgeCaseHunterReviewTargetStoryValues(
				createSession({
					[EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: `${PROJECT_ROOT}/implementation/stories-review/Remediation-story-1-1-1.md`,
				}),
			),
		)

		expect(result.workflowValueWrites).to.deep.equal({
			[EdgeCaseHunterReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1.1",
		})
	})

	it("fails target story derivation when target_story is missing", async () => {
		const result = await deriveEdgeCaseHunterReviewTargetStoryValues(createSession({}))

		expect(result.kind).to.equal("failed")
		if (result.kind !== "failed") {
			throw new Error("Expected target story derivation to fail.")
		}
		expect(result.errorMessage).to.include("target_story")
	})

	it("fails target story derivation for unsupported story filename", async () => {
		const result = await deriveEdgeCaseHunterReviewTargetStoryValues(
			createSession({
				[EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: `${PROJECT_ROOT}/implementation/stories-review/Not-a-story.md`,
			}),
		)

		expect(result.kind).to.equal("failed")
		if (result.kind !== "failed") {
			throw new Error("Expected target story derivation to fail.")
		}
		expect(result.errorMessage).to.include("does not match")
	})

	it("fails target story derivation for story outside implementation stories-review", async () => {
		const result = await deriveEdgeCaseHunterReviewTargetStoryValues(
			createSession({
				[EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: `${PROJECT_ROOT}/implementation/stories-backlog/Story-1-1.md`,
			}),
		)

		expect(result.kind).to.equal("failed")
		if (result.kind !== "failed") {
			throw new Error("Expected target story derivation to fail.")
		}
		expect(result.errorMessage).to.include("implementation/stories-review")
	})

	it("validates and persists reviewed commit metadata from a temporary Git repository", async () => {
		const project = await createTemporaryGitProject()
		try {
			const result = expectSucceeded(
				await validateAndPersistEdgeCaseHunterReviewCommit(
					createSession(
						{
							[EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: project.targetStory,
						},
						project.root,
						{ activeBranchId: "step-1-await-commit-form-panel" },
						buildCommitFormSession(project.secondCommitHash),
					),
				),
			)

			expect(result.workflowValueWrites).to.deep.equal({
				[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash]: project.secondCommitHash,
				[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent]: project.firstCommitHash,
			})
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("does not write commit workflow values when commit form value is missing", async () => {
		const project = await createTemporaryGitProject()
		try {
			expectSucceededWithoutCommitWrites(
				await validateAndPersistEdgeCaseHunterReviewCommit(
					createSession({ [EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: project.targetStory }, project.root),
				),
			)
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("does not write commit workflow values for an invalid commit hash", async () => {
		const project = await createTemporaryGitProject()
		try {
			expectSucceededWithoutCommitWrites(
				await validateAndPersistEdgeCaseHunterReviewCommit(
					createSession(
						{
							[EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: project.targetStory,
						},
						project.root,
						{ activeBranchId: "step-1-await-commit-form-panel" },
						buildCommitFormSession("not-a-commit"),
					),
				),
			)
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("does not write commit workflow values when the submitted commit has no parent", async () => {
		const project = await createTemporaryGitProject()
		try {
			expectSucceededWithoutCommitWrites(
				await validateAndPersistEdgeCaseHunterReviewCommit(
					createSession(
						{
							[EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: project.targetStory,
						},
						project.root,
						{ activeBranchId: "step-1-await-commit-form-panel" },
						buildCommitFormSession(project.firstCommitHash),
					),
				),
			)
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("does not write commit workflow values when selected project root is not a Git repository", async () => {
		const root = await mkdtemp(join(tmpdir(), "edge-case-hunter-review-no-git-"))
		const targetStory = join(root, "implementation", "stories-review", "Story-1-1.md")
		try {
			await mkdir(join(root, "implementation", "stories-review"), { recursive: true })
			await writeFile(targetStory, "# Story\n", "utf8")

			expectSucceededWithoutCommitWrites(
				await validateAndPersistEdgeCaseHunterReviewCommit(
					createSession(
						{
							[EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: targetStory,
						},
						root,
						{ activeBranchId: "step-1-await-commit-form-panel" },
						buildCommitFormSession("abc123"),
					),
				),
			)
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})

	it("builds and persists the review scope manifest", async () => {
		const root = await mkdtemp(join(tmpdir(), "edge-case-hunter-review-manifest-"))
		const reviewStoriesFolder = join(root, "implementation", "stories-review")
		const targetStory = join(reviewStoriesFolder, "Story-1-1.md")
		const reviewFolder = join(root, "review")
		const sourceFolder = join(root, "src")
		const manifestPath = join(reviewFolder, "review-scope-1-1.md")

		try {
			await mkdir(reviewStoriesFolder, { recursive: true })
			await mkdir(reviewFolder, { recursive: true })
			await mkdir(sourceFolder, { recursive: true })
			await writeFile(
				targetStory,
				[
					"# Story",
					"",
					"## General Instructions",
					"",
					"General instructions.",
					"",
					"## Objective",
					"",
					"Objective.",
					"",
					"## Scope",
					"",
					"Scope.",
					"",
					"## Scope Boundary",
					"",
					"Scope boundary.",
					"",
					"## Requirements",
					"",
					"Requirements.",
					"",
					"## Known Issues/ Risks/ Technical Debt",
					"",
					"Known issues.",
					"",
					"## Tasks",
					"",
					"- [x] Task 1. Implement runtime helpers.",
					"Allowed files:",
					"- src/allowed.ts",
					"- src/deleted.ts",
					"  - [x] Subtask 1.1. Implement parser.",
					"  Allowed files:",
					"  - src/renamed.ts",
					"- [x] Task 2. Add tests.",
					"Allowed files:",
					"- src/untouched.ts",
					"",
				].join("\n"),
				"utf8",
			)
			await writeFile(join(sourceFolder, "allowed.ts"), "export const allowed = 1\n", "utf8")
			await writeFile(join(sourceFolder, "deleted.ts"), "export const deleted = 1\n", "utf8")
			await writeFile(join(sourceFolder, "renamed.ts"), "export const renamed = 1\n", "utf8")
			await writeFile(join(sourceFolder, "untouched.ts"), "export const untouched = 1\n", "utf8")

			await runRequiredGitCommand(root, ["init"])
			await runRequiredGitCommand(root, ["config", "user.email", "edge-case-hunter-review@example.com"])
			await runRequiredGitCommand(root, ["config", "user.name", "Edge Case Hunter Review Test"])
			await runRequiredGitCommand(root, ["add", "."])
			await runRequiredGitCommand(root, ["commit", "-m", "first commit"])
			const firstCommitHash = await runRequiredGitCommand(root, ["rev-parse", "HEAD"])

			await writeFile(join(sourceFolder, "allowed.ts"), "export const allowed = 2\n", "utf8")
			await rm(join(sourceFolder, "deleted.ts"))
			await writeFile(join(sourceFolder, "new-outside.ts"), "export const outside = 1\n", "utf8")
			await runRequiredGitCommand(root, ["add", "."])
			await runRequiredGitCommand(root, ["commit", "-m", "second commit"])
			const secondCommitHash = await runRequiredGitCommand(root, ["rev-parse", "HEAD"])

			expectSucceeded(
				await buildAndPersistEdgeCaseHunterReviewScopeManifest(
					createSession(
						{
							...SAMPLE_WORKFLOW_VALUES,
							[EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: targetStory,
							[EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest]: manifestPath,
							[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash]: secondCommitHash,
							[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent]: firstCommitHash,
						},
						root,
					),
				),
			)

			const manifest = await readFile(manifestPath, "utf8")
			const headings = [
				"# Review Scope Manifest",
				"## Source",
				"## Summary",
				"## Changed Files",
				"## Review Targets",
				"## Suggested Review Strategy",
			]
			let previousHeadingIndex = -1
			for (const heading of headings) {
				const headingIndex = manifest.indexOf(heading)
				expect(headingIndex).to.be.greaterThan(previousHeadingIndex)
				previousHeadingIndex = headingIndex
			}
			expect(manifest).to.include(`Commit: ${secondCommitHash}`)
			expect(manifest).to.include(`Parent: ${firstCommitHash}`)
			expect(manifest).to.include(`Story: ${targetStory}`)
			expect(manifest).to.include(`Generated from: git show --name-status --numstat ${secondCommitHash}`)
			expect(manifest).to.include("| Status | Path | Additions | Deletions |")
			expect(manifest).to.include("allowed_and_touched: src/allowed.ts")
			expect(manifest).to.include("allowed_and_touched: src/deleted.ts")
			expect(manifest).to.include("touched_outside_allowed_files: src/new-outside.ts")
			expect(manifest).to.include("allowed_not_touched: src/renamed.ts")
			expect(manifest).to.include("allowed_not_touched: src/untouched.ts")
			expect(manifest).to.include("Task 1: - [x] Task 1. Implement runtime helpers.")
			expect(manifest).to.include("Subtask 1.1:   - [x] Subtask 1.1. Implement parser.")
			expect(manifest).to.include("Task 2: - [x] Task 2. Add tests.")
			expect(manifest).to.include(`git show ${secondCommitHash} -- src/allowed.ts`)
			expect(manifest).to.include(`git show ${secondCommitHash} -- src/deleted.ts`)
			expect(manifest).to.include(`git show ${secondCommitHash} -- src/new-outside.ts`)
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})

	it("fails review-scope manifest build when required workflow values are missing", async () => {
		const result = await buildAndPersistEdgeCaseHunterReviewScopeManifest(createSession({}))

		expect(result.kind).to.equal("failed")
		if (result.kind !== "failed") {
			throw new Error("Expected review-scope manifest build to fail.")
		}
		expect(result.errorMessage).to.include("target_story")
		expect(result.errorMessage).to.include("review_scope_manifest")
		expect(result.errorMessage).to.include("review_commit_hash")
		expect(result.errorMessage).to.include("review_commit_parent")
	})

	it("fails review-scope manifest build for bad target story path", async () => {
		const result = await buildAndPersistEdgeCaseHunterReviewScopeManifest(
			createSession({
				...SAMPLE_WORKFLOW_VALUES,
				[EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: `${PROJECT_ROOT}/implementation/stories-backlog/Story-1-1.md`,
			}),
		)

		expect(result.kind).to.equal("failed")
		if (result.kind !== "failed") {
			throw new Error("Expected review-scope manifest build to fail.")
		}
		expect(result.errorMessage).to.include("implementation/stories-review")
	})

	it("fails review-scope manifest build when target story cannot be read", async () => {
		const project = await createTemporaryGitProject()
		try {
			const missingTargetStory = join(project.root, "implementation", "stories-review", "Story-9-9.md")
			const result = await buildAndPersistEdgeCaseHunterReviewScopeManifest(
				createSession(
					{
						...SAMPLE_WORKFLOW_VALUES,
						[EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: missingTargetStory,
						[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash]: project.secondCommitHash,
						[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent]: project.firstCommitHash,
						[EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest]: join(
							project.root,
							"review",
							"review-scope-1-1.md",
						),
					},
					project.root,
				),
			)

			expect(result.kind).to.equal("failed")
			if (result.kind !== "failed") {
				throw new Error("Expected review-scope manifest build to fail.")
			}
			expect(result.errorMessage).to.include("target story read")
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("fails review-scope manifest build when manifest parent folder does not exist", async () => {
		const project = await createTemporaryGitProject()
		try {
			await writeFile(
				project.targetStory,
				[
					"# Story",
					"",
					"## General Instructions",
					"",
					"General instructions.",
					"",
					"## Objective",
					"",
					"Objective.",
					"",
					"## Scope",
					"",
					"Scope.",
					"",
					"## Scope Boundary",
					"",
					"Scope boundary.",
					"",
					"## Requirements",
					"",
					"Requirements.",
					"",
					"## Known Issues/ Risks/ Technical Debt",
					"",
					"Known issues.",
					"",
					"## Tasks",
					"",
					"- [x] Task 1. Implement runtime helpers.",
					"",
				].join("\n"),
				"utf8",
			)
			const result = await buildAndPersistEdgeCaseHunterReviewScopeManifest(
				createSession(
					{
						...SAMPLE_WORKFLOW_VALUES,
						[EdgeCaseHunterReviewWorkflowValueKey.TargetStory]: project.targetStory,
						[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash]: project.secondCommitHash,
						[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent]: project.firstCommitHash,
						[EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest]: join(
							project.root,
							"missing-review-folder",
							"review-scope-1-1.md",
						),
					},
					project.root,
				),
			)

			expect(result.kind).to.equal("failed")
			if (result.kind !== "failed") {
				throw new Error("Expected review-scope manifest build to fail.")
			}
			expect(result.errorMessage).to.include("review scope manifest write")
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("reports every missing inherited evidence workflow value", () => {
		const result = failMissingInheritedEdgeCaseHunterReviewEvidence(createSession({}))

		expect(result.kind).to.equal("failed")
		if (result.kind !== "failed") {
			throw new Error("Expected inherited review evidence helper to fail.")
		}
		expect(result.errorMessage).to.include("target_story")
		expect(result.errorMessage).to.include("review_commit_hash")
		expect(result.errorMessage).to.include("review_commit_parent")
		expect(result.errorMessage).to.include("review_scope_manifest")
	})

	it("preserves concrete review-scope allocation backend failure reason", () => {
		const result = failEdgeCaseHunterReviewScopeManifestArtifactAllocation(
			createSession(SAMPLE_WORKFLOW_VALUES, PROJECT_ROOT, {
				activeBranchId: "step-1-await-review-scope-manifest-allocation",
				failureState: { retryAttemptCount: 1, terminalErrorMessage: "backend failure" },
			}),
		)

		expect(result).to.deep.equal({
			kind: "failed",
			errorMessage: `Edge Case Hunter Review review-scope manifest artifact creation failed for target_story ${TARGET_STORY_PATH}: backend failure`,
		})
	})

	it("preserves concrete edge-case output allocation backend failure reason", () => {
		const result = failEdgeCaseHunterReviewOutputArtifactAllocation(
			createSession(SAMPLE_WORKFLOW_VALUES, PROJECT_ROOT, {
				activeBranchId: "step-1-await-edge-case-review-output-allocation",
				failureState: { retryAttemptCount: 1, terminalErrorMessage: "backend failure" },
			}),
		)

		expect(result).to.deep.equal({
			kind: "failed",
			errorMessage: `Edge Case Hunter Review output artifact creation failed for target_story ${TARGET_STORY_PATH}: backend failure`,
		})
	})

	it("projects Step 2 prompt instructions with materialized workflow values", () => {
		const prompt = buildPrompt("step-2", SAMPLE_WORKFLOW_VALUES)
		expect(prompt).to.include(SAMPLE_WORKFLOW_VALUES[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitParent].toString())
		expect(prompt).to.include(SAMPLE_WORKFLOW_VALUES[EdgeCaseHunterReviewWorkflowValueKey.ReviewCommitHash].toString())
		expect(prompt).to.include(SAMPLE_WORKFLOW_VALUES[EdgeCaseHunterReviewWorkflowValueKey.TargetStory].toString())
		expect(prompt).to.include(SAMPLE_WORKFLOW_VALUES[EdgeCaseHunterReviewWorkflowValueKey.ReviewScopeManifest].toString())

		expect(prompt.trim().length).to.be.greaterThan(0)
		expect(prompt).to.include(REVIEW_SCOPE_MANIFEST_PATH)
		expect(prompt).to.include(TARGET_STORY_PATH)
		expect(prompt).to.include("abc123")
		expect(prompt).to.include("def456")
		expect(prompt).to.include(EDGE_CASE_REVIEW_OUTPUT_PATH)
		expect(prompt).not.to.include("{workflow.edge_case_review_output}")
		expect(prompt).not.to.include("{workflow.review_commit_parent}")
		expect(prompt).not.to.include("{workflow.review_commit_hash}")
		expect(prompt).not.to.include("{workflow.target_story}")
		expect(prompt).not.to.include("{workflow.review_scope_manifest}")
		expect(prompt).not.to.include("edge_case_review_output")
	})

	it("routes Step 2 attempt completion directly to workflow completion", () => {
		const route = findRoute("step-2", "step-2-await-attempt-completion", "step-2-complete-workflow")

		expect(route.trigger).to.deep.equal({
			kind: "on_event",
			eventKind: buildAttemptCompletionSucceededEvent().kind,
		})
		expect(route.action).to.deep.equal({ kind: "complete_workflow" })
	})

	it("does not add forbidden Step 2 completion side-effect actions", () => {
		const forbiddenActionKinds: readonly WorkflowDecisionAction["kind"][] = [
			"update_story_index_status",
			"move_project_file",
			"run_deterministic_procedure",
			"allocate_artifact",
			"execute_tool_backed_operation",
			"transition_step",
			"project_prompt",
		]

		for (const branch of Object.values(getStep("step-2").decisionTree.branches)) {
			for (const route of branch.routes) {
				if (route.id === "step-2-project-prompt") {
					expect(route.action.kind).to.equal("project_prompt")
					continue
				}

				expect(forbiddenActionKinds).not.to.include(route.action.kind)
			}
		}
	})

	it("does not use singleton entry artifact resolution startup flow", () => {
		for (const branch of Object.values(getStep("step-1").decisionTree.branches)) {
			for (const route of branch.routes) {
				expect(route.id.includes("creationRequired")).to.equal(false)

				if (route.trigger.kind === "on_event") {
					expect(route.trigger.eventKind).not.to.equal("entry_artifact_resolution_completed")
				}

				if (route.trigger.kind === "event_predicate") {
					expect(
						route.trigger.matches(
							createEventPredicateInput({
								activeBranchId: "test-branch",
								workflowValues: SAMPLE_WORKFLOW_VALUES,
								step: getStep("step-1"),
								triggerEvent: {
									kind: "entry_artifact_resolution_completed",
									artifactResolutions: [],
								},
							}),
						),
					).to.equal(false)
				}
			}
		}
	})
})
