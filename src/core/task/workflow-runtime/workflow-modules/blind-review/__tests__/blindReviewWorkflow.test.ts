import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
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
import { WorkflowArtifactFamily } from "../../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionAction,
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
	BLIND_REVIEW_ARTIFACTS,
	BLIND_REVIEW_COMMIT_HASH_FIELD_KEY,
	BLIND_REVIEW_ENTRY_PROJECT_VALUE_KEYS,
	BLIND_REVIEW_OUTPUT_ARTIFACT_ID,
	BLIND_REVIEW_PREREQUISITE_FILES,
	BLIND_REVIEW_STEP_1_FORM_ID,
	BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
	BLIND_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
	BLIND_REVIEW_TARGET_STORY_PREREQUISITE_ID,
	BLIND_REVIEW_WORKFLOW_DESCRIPTION,
	BLIND_REVIEW_WORKFLOW_DISPLAY_NAME,
	BLIND_REVIEW_WORKFLOW_NAME,
	BLIND_REVIEW_WORKFLOW_PERSONA,
	BLIND_REVIEW_WORKFLOW_PROJECT_SUBFOLDER,
	BLIND_REVIEW_WORKFLOW_SLASH_COMMAND_NAME,
	BLIND_REVIEW_WORKFLOW_USE_SKILL_NAME,
	BLIND_REVIEW_WORKFLOW_VALUE_KEYS,
	BlindReviewWorkflowValueKey,
	blindReviewWorkflowDefinition,
	buildBlindReviewStep1WorkflowForm,
	deriveBlindReviewTargetStoryValues,
	failBlindReviewOutputArtifactAllocation,
	runBlindReviewGitCommand,
	validateAndPersistBlindReviewCommit,
} from ".."

const PROJECT_ROOT = "/tmp/blind-review-project"
const TARGET_STORY_PATH = `${PROJECT_ROOT}/implementation/stories-review/Story-1-1.md`
const REVIEW_FOLDER_PATH = `${PROJECT_ROOT}/review`
const SAMPLE_WORKFLOW_VALUES: WorkflowValues = {
	[BlindReviewWorkflowValueKey.TargetStory]: TARGET_STORY_PATH,
	[BlindReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1",
	[BlindReviewWorkflowValueKey.ReviewCommitHash]: "abc123",
	[BlindReviewWorkflowValueKey.ReviewCommitParent]: "def456",
	[BlindReviewWorkflowValueKey.BlindReviewOutput]: `${REVIEW_FOLDER_PATH}/blind-review-1-1.md`,
	[BlindReviewWorkflowValueKey.BlindReviewOutputArtifactFamily]: "blind_review_output",
	[BlindReviewWorkflowValueKey.BlindReviewOutputArtifactIdentity]: "1.1",
	[BlindReviewWorkflowValueKey.BlindReviewOutputArtifactFilename]: "blind-review-1-1.md",
	[BlindReviewWorkflowValueKey.BlindReviewOutputArtifactRelativePath]: "review/blind-review-1-1.md",
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

function buildCommitFormSession(commitHash: string): WorkflowFormSessionState {
	const definitionPayload = buildBlindReviewStep1WorkflowForm()
	return {
		sessionId: "test-blind-review-form-session",
		workflowFormId: BLIND_REVIEW_STEP_1_FORM_ID,
		definitionVersion: definitionPayload.definitionVersion,
		definitionPayload,
		firstPanelId: BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
		currentPanelId: BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
		values: {
			[BLIND_REVIEW_COMMIT_HASH_FIELD_KEY]: {
				valueType: "string",
				stringValue: commitHash,
			},
		},
		data: {},
	}
}

function getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition {
	return blindReviewWorkflowDefinition.steps[stepId]
}

function findRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const route = getStep(stepId).decisionTree.branches[branchId]?.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Missing route ${stepId}/${branchId}/${routeId}.`)
	}

	return route
}

function getWorkflowForm(workflowFormId: string): WorkflowFormDefinitionPayload {
	const form = blindReviewWorkflowDefinition.workflowForms?.[workflowFormId]
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
		workflowValueKeys: blindReviewWorkflowDefinition.workflowValueKeys,
		workflowValues,
		context: `blind-review ${stepId} test prompt`,
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
		workflowFormId: BLIND_REVIEW_STEP_1_FORM_ID,
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

function isActionKind<Kind extends WorkflowDecisionAction["kind"]>(
	action: WorkflowDecisionAction,
	kind: Kind,
): action is Extract<WorkflowDecisionAction, { kind: Kind }> {
	return action.kind === kind
}

function expectActionKind<Kind extends WorkflowDecisionAction["kind"]>(
	action: WorkflowDecisionAction,
	kind: Kind,
): Extract<WorkflowDecisionAction, { kind: Kind }> {
	expect(action.kind).to.equal(kind)
	if (isActionKind(action, kind) === false) {
		throw new Error(`Expected ${kind}, received ${action.kind}.`)
	}

	return action
}

function expectTransitionStepAction(action: WorkflowDecisionAction, stepNumber: number): void {
	const transitionAction = expectActionKind(action, "transition_step")
	expect(transitionAction.target).to.deep.equal({
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
		args.route.trigger.matches({
			activeBranchId: "test-branch",
			workflowValues: args.workflowValues,
			step: getStep(args.stepId),
			triggerEvent: args.triggerEvent,
		}),
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
		args.route.trigger.matches({
			activeBranchId: "test-branch",
			workflowValues: args.workflowValues,
			step: getStep(args.stepId),
		}),
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

async function runRequiredGitCommand(selectedProjectRoot: string, gitArgs: readonly string[]): Promise<string> {
	const result = await runBlindReviewGitCommand({ selectedProjectRoot, gitArgs })
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
	const root = await mkdtemp(join(tmpdir(), "blind-review-workflow-"))
	const reviewStoriesFolder = join(root, "implementation", "stories-review")
	const targetStory = join(reviewStoriesFolder, "Story-1-1.md")
	const implementationFile = join(root, "implementation-source.ts")

	await mkdir(reviewStoriesFolder, { recursive: true })
	await writeFile(targetStory, "# Story\n", "utf8")
	await runRequiredGitCommand(root, ["init"])
	await runRequiredGitCommand(root, ["config", "user.email", "blind-review@example.com"])
	await runRequiredGitCommand(root, ["config", "user.name", "Blind Review Test"])

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

function expectSucceededWithoutCommitWrites(result: WorkflowDeterministicProcedureResult): void {
	const succeededResult = expectSucceeded(result)
	expect(succeededResult.workflowValueWrites).to.equal(undefined)
}

describe("blindReviewWorkflowDefinition", () => {
	it("declares the workflow identity, Jasmine persona, entry panel, value keys, and child inheritance", () => {
		expect(blindReviewWorkflowDefinition.name).to.equal(BLIND_REVIEW_WORKFLOW_NAME)
		expect(blindReviewWorkflowDefinition.displayName).to.equal(BLIND_REVIEW_WORKFLOW_DISPLAY_NAME)
		expect(blindReviewWorkflowDefinition.description).to.equal(BLIND_REVIEW_WORKFLOW_DESCRIPTION)
		expect(blindReviewWorkflowDefinition.slashCommandName).to.equal(BLIND_REVIEW_WORKFLOW_SLASH_COMMAND_NAME)
		expect(blindReviewWorkflowDefinition.useSkillName).to.equal(BLIND_REVIEW_WORKFLOW_USE_SKILL_NAME)
		expect(blindReviewWorkflowDefinition.projectSubfolder).to.equal(BLIND_REVIEW_WORKFLOW_PROJECT_SUBFOLDER)
		expect(blindReviewWorkflowDefinition.persona).to.deep.equal(BLIND_REVIEW_WORKFLOW_PERSONA)
		expect(blindReviewWorkflowDefinition.entryPanel.promptMarkdown).to.equal(BLIND_REVIEW_WORKFLOW_DESCRIPTION)
		expect(blindReviewWorkflowDefinition.workflowValueKeys).to.deep.equal(BLIND_REVIEW_WORKFLOW_VALUE_KEYS)
		expect(blindReviewWorkflowDefinition.entryProjectValueKeys).to.deep.equal(BLIND_REVIEW_ENTRY_PROJECT_VALUE_KEYS)
		expect(blindReviewWorkflowDefinition.childInheritance).to.deep.equal([
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
		])
	})

	it("resolves through registry names without preserving the legacy markdown alias", () => {
		expect(resolveWorkflowDefinition("blind-review")).to.equal(blindReviewWorkflowDefinition)
		expect(resolveWorkflowBySlashCommand("blind-review")).to.equal(blindReviewWorkflowDefinition)
		expect(resolveWorkflowByUseSkillName("blind-review")).to.equal(blindReviewWorkflowDefinition)
		expect(resolveWorkflowDefinition("blind-review.md")).to.equal(undefined)
		expect(resolveWorkflowBySlashCommand("blind-review.md")).to.equal(undefined)
		expect(resolveWorkflowByUseSkillName("blind-review.md")).to.equal(undefined)
	})

	it("activates from a parent session without rendering the commit form", async () => {
		const workspacePathPolicy: WorkflowWorkspacePathPolicy = { validateAccess: () => true }
		const runtime = new WorkflowRuntime({ cwd: PROJECT_ROOT, workspacePathPolicy })
		const taskState = new TaskState()
		const parentSession: ActiveWorkflowSession = createSession(SAMPLE_WORKFLOW_VALUES)

		const result = await runtime.activateWorkflow({ taskState, workflowName: "blind-review", parentSession })

		expect(result.kind).not.to.equal("render_workflow_form")
		const activeSession = taskState.activeWorkflowSession
		if (activeSession === undefined) {
			throw new Error("Expected active blind-review child workflow session.")
		}
		expect(activeSession.workflowValues).to.deep.include({
			[BlindReviewWorkflowValueKey.TargetStory]: TARGET_STORY_PATH,
			[BlindReviewWorkflowValueKey.ReviewCommitHash]: "abc123",
			[BlindReviewWorkflowValueKey.ReviewCommitParent]: "def456",
		})
		expect(activeSession.projectSelection).to.deep.equal(parentSession.projectSelection)
		expect(activeSession.projectSelection).not.to.equal(parentSession.projectSelection)
	})

	it("returns the concrete terminal error when blind-review output allocation fails", async () => {
		const workspacePathPolicy: WorkflowWorkspacePathPolicy = { validateAccess: () => true }
		const runtime = new WorkflowRuntime({ cwd: PROJECT_ROOT, workspacePathPolicy })
		const taskState = new TaskState()
		taskState.activeWorkflowName = "blind-review"
		taskState.activeWorkflowSession = createSession(SAMPLE_WORKFLOW_VALUES, PROJECT_ROOT, {
			activeBranchId: "step-1-await-blind-review-output-allocation",
			lastTriggerEvent: buildToolBackedOperationFailedEvent(
				"step-1-allocate-blind-review-output",
				"step-1-allocate-blind-review-output",
			),
			failureState: { retryAttemptCount: 1, terminalErrorMessage: "backend failure" },
		})

		const result = await runtime.resolveNextAction({ taskState })

		expect(result).to.deep.equal({
			kind: "terminal_error",
			errorMessage: `Blind Review output artifact creation failed for target_story ${TARGET_STORY_PATH}: backend failure`,
		})
	})

	it("declares the target-story prerequisite", () => {
		const prerequisite = blindReviewWorkflowDefinition.prerequisiteFiles?.[BLIND_REVIEW_TARGET_STORY_PREREQUISITE_ID]

		expect(prerequisite).to.deep.equal(BLIND_REVIEW_PREREQUISITE_FILES[BLIND_REVIEW_TARGET_STORY_PREREQUISITE_ID])
		expect(prerequisite?.producingWorkflowName).to.equal("dev-story")
		expect(prerequisite?.projectSubfolderSegments).to.deep.equal(["implementation", "stories-review"])
		expect(prerequisite?.workflowValueKey).to.equal(BlindReviewWorkflowValueKey.TargetStory)
		expect(prerequisite?.outputDocumentReference).to.equal("none")
		expect(prerequisite?.match.kind).to.equal("naming_pattern")
		if (prerequisite?.match.kind !== "naming_pattern") {
			throw new Error("Expected naming_pattern prerequisite match.")
		}
		expect(prerequisite.match.pattern.test("Story-1-1.md")).to.equal(true)
		expect(prerequisite.match.pattern.test("Remediation-story-1-1-1.md")).to.equal(true)
	})

	it("declares the blind-review output artifact", () => {
		expect(blindReviewWorkflowDefinition.artifacts).to.deep.equal(BLIND_REVIEW_ARTIFACTS)
		expect(Object.keys(BLIND_REVIEW_ARTIFACTS)).to.deep.equal([BLIND_REVIEW_OUTPUT_ARTIFACT_ID])

		const blindReviewOutput = BLIND_REVIEW_ARTIFACTS[BLIND_REVIEW_OUTPUT_ARTIFACT_ID]
		expect(blindReviewOutput.family).to.equal(WorkflowArtifactFamily.BlindReviewOutput)
		expect(blindReviewOutput.intentMode).to.equal("derived")
		expect(blindReviewOutput.targetIdentitySource).to.deep.equal({
			kind: "workflow_value",
			key: BlindReviewWorkflowValueKey.SelectedStoryIdentity,
		})
		expect(blindReviewOutput.outputValueKeys).to.deep.equal({
			projectTitle: BlindReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: BlindReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactFamily,
			artifactIdentity: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactIdentity,
			artifactFilename: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactFilename,
			artifactRelativePath: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactRelativePath,
			artifactAbsolutePath: BlindReviewWorkflowValueKey.BlindReviewOutput,
			parentIdentity: undefined,
			targetIdentity: BlindReviewWorkflowValueKey.BlindReviewOutputArtifactIdentity,
		})
	})

	it("defines the Step 1 form panels", () => {
		const form = getWorkflowForm(BLIND_REVIEW_STEP_1_FORM_ID)
		expect(form).to.deep.equal(buildBlindReviewStep1WorkflowForm())
		expect(form.firstPanelId).to.equal(BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)

		const panelA = getPanel(form, BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)
		expect(panelA.title).to.equal("Identify Implementation Evidence")
		expect(panelA.promptMarkdown).to.equal("Provide the commit hash for the target story's commit.")
		expect(panelA.allowedActions).to.deep.equal(["submit"])
		expect(panelA.actionLabels).to.deep.equal({ submit: "submit" })
		expect(panelA.transition).to.deep.equal({ type: "runtime_routed" })

		const commitHashField = getSingleField(panelA)
		expect(commitHashField).to.deep.include({
			key: BLIND_REVIEW_COMMIT_HASH_FIELD_KEY,
			kind: "small_text",
			label: "commit hash",
			required: true,
			allowedValueType: "string",
		})

		const panelB = getPanel(form, BLIND_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID)
		expect(panelB.title).to.equal("Invalid Commit Hash")
		expect(panelB.promptMarkdown).to.equal(
			"The provided commit hash is invalid. Please go back and provide a valid commit hash.",
		)
		expect(panelB.fields).to.deep.equal([])
		expect(panelB.allowedActions).to.deep.equal(["back"])
		expect(panelB.actionLabels).to.deep.equal({ back: "back" })
		expect(panelB.transition).to.deep.equal({
			type: "conditional",
			conditionSourceKey: "__terminal__",
			branches: [],
			defaultTerminal: true,
		})
		expect(panelB.backDestinationPanelId).to.equal(BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)
	})

	it("declares exact step labels and model-facing tool surfaces", () => {
		expect(getStep("step-1").checklistLabel).to.equal("Prepare Inputs & Set Workflow Variables")
		expect(getStep("step-2").checklistLabel).to.equal("Perform Blind Adversarial Review")
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

	it("routes Step 1 through existing-value bypass, prerequisite collection, commit validation, and artifact allocation", async () => {
		const entryBranch = getStep("step-1").decisionTree.branches["step-1-route-by-existing-values"]
		if (entryBranch === undefined) {
			throw new Error("Missing Step 1 entry branch.")
		}
		expect(entryBranch.routes.map((route) => route.id)).to.deep.equal([
			"step-1-derive-existing-target-story-values",
			"step-1-resolve-target-story",
		])

		const existingValuesRoute = findRoute(
			"step-1",
			"step-1-route-by-existing-values",
			"step-1-derive-existing-target-story-values",
		)
		expectSessionPredicateMatches({
			stepId: "step-1",
			route: existingValuesRoute,
			workflowValues: {
				[BlindReviewWorkflowValueKey.TargetStory]: TARGET_STORY_PATH,
				[BlindReviewWorkflowValueKey.ReviewCommitHash]: "abc123",
				[BlindReviewWorkflowValueKey.ReviewCommitParent]: "def456",
			},
		})
		const existingValuesAction = expectActionKind(existingValuesRoute.action, "run_deterministic_procedure")
		expect(existingValuesAction.instruction.run).to.equal(deriveBlindReviewTargetStoryValues)
		expect(existingValuesRoute.followingBranchId).to.equal("step-1-allocate-blind-review-output")

		const missingValuesRoute = findRoute("step-1", "step-1-route-by-existing-values", "step-1-resolve-target-story")
		expectSessionPredicateMatches({ stepId: "step-1", route: missingValuesRoute, workflowValues: {} })
		expect(missingValuesRoute.action).to.deep.equal({
			kind: "resolve_prerequisite_files",
			prerequisiteIds: [BLIND_REVIEW_TARGET_STORY_PREREQUISITE_ID],
		})
		expect(missingValuesRoute.followingBranchId).to.equal("step-1-derive-target-story-values")

		const deriveRoute = findRoute("step-1", "step-1-derive-target-story-values", "step-1-derive-target-story-values")
		const deriveAction = expectActionKind(deriveRoute.action, "run_deterministic_procedure")
		expect(deriveAction.instruction.run).to.equal(deriveBlindReviewTargetStoryValues)
		expect(deriveRoute.followingBranchId).to.equal("step-1-render-commit-hash-panel")

		const renderRoute = findRoute("step-1", "step-1-render-commit-hash-panel", "step-1-render-commit-hash-panel")
		const renderAction = expectActionKind(renderRoute.action, "render_workflow_form")
		expect(renderAction.workflowFormId).to.equal(BLIND_REVIEW_STEP_1_FORM_ID)
		if ("startPanelId" in renderAction === false) {
			throw new Error("Expected Step 1 commit panel render action to declare startPanelId.")
		}
		expect(renderAction.startPanelId).to.equal(BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)
		expect(renderRoute.followingBranchId).to.equal("step-1-await-commit-form-panel")

		const validateRoute = findRoute("step-1", "step-1-await-commit-form-panel", "step-1-validate-commit-hash")
		expectEventPredicateMatches({
			stepId: "step-1",
			route: validateRoute,
			workflowValues: {},
			triggerEvent: buildWorkflowFormPanelSubmittedEvent(BLIND_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID),
		})
		const validateAction = expectActionKind(validateRoute.action, "run_deterministic_procedure")
		expect(validateAction.instruction.run).to.equal(validateAndPersistBlindReviewCommit)

		const invalidCommitRoute = findRoute(
			"step-1",
			"step-1-route-after-commit-validation",
			"step-1-continue-to-invalid-commit-panel",
		)
		expectSessionPredicateMatches({ stepId: "step-1", route: invalidCommitRoute, workflowValues: {} })
		const invalidCommitAction = expectActionKind(invalidCommitRoute.action, "continue_workflow_form")
		expect(invalidCommitAction.workflowFormId).to.equal(BLIND_REVIEW_STEP_1_FORM_ID)
		expect(invalidCommitAction.panelId).to.equal(BLIND_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID)
		expect(invalidCommitRoute.followingBranchId).to.equal("step-1-await-commit-form-panel")
		expect(await Promise.resolve(invalidCommitAction.buildReplacement(createSession({})))).to.deep.equal({
			panel: getPanel(buildBlindReviewStep1WorkflowForm(), BLIND_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID),
			data: {},
		})

		const validCommitRoute = findRoute("step-1", "step-1-route-after-commit-validation", "step-1-route-valid-commit-metadata")
		expectSessionPredicateMatches({
			stepId: "step-1",
			route: validCommitRoute,
			workflowValues: {
				[BlindReviewWorkflowValueKey.ReviewCommitHash]: "abc123",
				[BlindReviewWorkflowValueKey.ReviewCommitParent]: "def456",
			},
		})
		expect(validCommitRoute.action).to.deep.equal({ kind: "no_op" })
		expect(validCommitRoute.followingBranchId).to.equal("step-1-allocate-blind-review-output")

		const allocateRoute = findRoute("step-1", "step-1-allocate-blind-review-output", "step-1-allocate-blind-review-output")
		expect(allocateRoute.action).to.deep.equal({
			kind: "allocate_artifact",
			artifactId: BLIND_REVIEW_OUTPUT_ARTIFACT_ID,
		})

		const allocationSuccessRoute = findRoute(
			"step-1",
			"step-1-await-blind-review-output-allocation",
			"step-1-transition-to-step-2",
		)
		expectEventPredicateMatches({
			stepId: "step-1",
			route: allocationSuccessRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-1-allocate-blind-review-output",
				"step-1-allocate-blind-review-output",
			),
		})
		expectTransitionStepAction(allocationSuccessRoute.action, 2)

		const allocationFailureRoute = findRoute(
			"step-1",
			"step-1-await-blind-review-output-allocation",
			"step-1-fail-after-blind-review-output-allocation",
		)
		expectEventPredicateMatches({
			stepId: "step-1",
			route: allocationFailureRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationFailedEvent(
				"step-1-allocate-blind-review-output",
				"step-1-allocate-blind-review-output",
			),
		})
		const allocationFailureAction = expectActionKind(allocationFailureRoute.action, "run_deterministic_procedure")
		expect(allocationFailureAction.instruction.run).to.equal(failBlindReviewOutputArtifactAllocation)
	})

	it("derives target story identities from primary and remediation story paths", async () => {
		const primaryResult = expectSucceeded(
			await deriveBlindReviewTargetStoryValues(
				createSession({
					[BlindReviewWorkflowValueKey.TargetStory]: TARGET_STORY_PATH,
				}),
			),
		)
		expect(primaryResult.workflowValueWrites).to.deep.equal({
			[BlindReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1",
		})

		const remediationResult = expectSucceeded(
			await deriveBlindReviewTargetStoryValues(
				createSession({
					[BlindReviewWorkflowValueKey.TargetStory]: `${PROJECT_ROOT}/implementation/stories-review/Remediation-story-1-1-1.md`,
				}),
			),
		)
		expect(remediationResult.workflowValueWrites).to.deep.equal({
			[BlindReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1.1",
		})
	})

	it("fails target story derivation for missing values, wrong filenames, and wrong folders", async () => {
		const missingTargetStoryResult = await deriveBlindReviewTargetStoryValues(createSession({}))
		expect(missingTargetStoryResult.kind).to.equal("failed")

		const wrongFilenameResult = await deriveBlindReviewTargetStoryValues(
			createSession({
				[BlindReviewWorkflowValueKey.TargetStory]: `${PROJECT_ROOT}/implementation/stories-review/Not-a-story.md`,
			}),
		)
		expect(wrongFilenameResult.kind).to.equal("failed")

		const wrongFolderResult = await deriveBlindReviewTargetStoryValues(
			createSession({
				[BlindReviewWorkflowValueKey.TargetStory]: `${PROJECT_ROOT}/implementation/stories-backlog/Story-1-1.md`,
			}),
		)
		expect(wrongFolderResult.kind).to.equal("failed")
	})

	it("validates and persists reviewed commit metadata from a temporary Git repository", async () => {
		const project = await createTemporaryGitProject()
		try {
			const result = expectSucceeded(
				await validateAndPersistBlindReviewCommit(
					createSession(
						{
							[BlindReviewWorkflowValueKey.TargetStory]: project.targetStory,
						},
						project.root,
						{ activeBranchId: "step-1-await-commit-form-panel" },
						buildCommitFormSession(project.secondCommitHash),
					),
				),
			)

			expect(result.workflowValueWrites).to.deep.equal({
				[BlindReviewWorkflowValueKey.ReviewCommitHash]: project.secondCommitHash,
				[BlindReviewWorkflowValueKey.ReviewCommitParent]: project.firstCommitHash,
			})
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("does not write commit workflow values for missing or invalid commit evidence", async () => {
		const project = await createTemporaryGitProject()
		try {
			expectSucceededWithoutCommitWrites(
				await validateAndPersistBlindReviewCommit(
					createSession(
						{
							[BlindReviewWorkflowValueKey.TargetStory]: project.targetStory,
						},
						project.root,
					),
				),
			)
			expectSucceededWithoutCommitWrites(
				await validateAndPersistBlindReviewCommit(
					createSession(
						{
							[BlindReviewWorkflowValueKey.TargetStory]: project.targetStory,
						},
						project.root,
						{ activeBranchId: "step-1-await-commit-form-panel" },
						buildCommitFormSession("not-a-commit"),
					),
				),
			)
			expectSucceededWithoutCommitWrites(
				await validateAndPersistBlindReviewCommit(
					createSession(
						{
							[BlindReviewWorkflowValueKey.TargetStory]: project.targetStory,
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

	it("does not write commit workflow values when the selected project root is not a Git repository", async () => {
		const root = await mkdtemp(join(tmpdir(), "blind-review-no-git-"))
		const targetStory = join(root, "implementation", "stories-review", "Story-1-1.md")
		try {
			await mkdir(join(root, "implementation", "stories-review"), { recursive: true })
			await writeFile(targetStory, "# Story\n", "utf8")

			expectSucceededWithoutCommitWrites(
				await validateAndPersistBlindReviewCommit(
					createSession(
						{
							[BlindReviewWorkflowValueKey.TargetStory]: targetStory,
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

	it("projects Step 2 prompt instructions with materialized workflow values", () => {
		const prompt = buildPrompt("step-2", SAMPLE_WORKFLOW_VALUES)
		expect(prompt).to.include(SAMPLE_WORKFLOW_VALUES[BlindReviewWorkflowValueKey.ReviewCommitParent].toString())
		expect(prompt).to.include(SAMPLE_WORKFLOW_VALUES[BlindReviewWorkflowValueKey.ReviewCommitHash].toString())
		expect(prompt).to.include(SAMPLE_WORKFLOW_VALUES[BlindReviewWorkflowValueKey.BlindReviewOutput].toString())
		const blindReviewOutput = SAMPLE_WORKFLOW_VALUES[BlindReviewWorkflowValueKey.BlindReviewOutput]
		if (typeof blindReviewOutput !== "string" || blindReviewOutput.length === 0) {
			throw new Error("Expected SAMPLE_WORKFLOW_VALUES to define a blind_review_output path.")
		}

		expect(prompt.trim().length).to.be.greaterThan(0)
		expect(prompt).to.include("abc123")
		expect(prompt).to.include("def456")
		expect(prompt).to.include(blindReviewOutput)
		expect(prompt).to.include("git diff --name-status def456 abc123")
		expect(prompt).to.include("git diff def456 abc123 -- <path>")
		expect(prompt).not.to.include("{workflow.review_commit_parent}")
		expect(prompt).not.to.include("{workflow.review_commit_hash}")
		expect(prompt).not.to.include("{workflow.blind_review_output}")
		expect(prompt).not.to.include(TARGET_STORY_PATH)
	})

	it("routes Step 2 attempt completion directly to workflow completion", () => {
		const route = findRoute("step-2", "step-2-await-attempt-completion", "step-2-complete-workflow")
		const attemptCompletionEvent = buildAttemptCompletionSucceededEvent()
		expect(route.trigger).to.deep.equal({
			kind: "on_event",
			eventKind: attemptCompletionEvent.kind,
		})
		expect(route.action).to.deep.equal({ kind: "complete_workflow" })

		const forbiddenActionKinds: readonly WorkflowDecisionAction["kind"][] = [
			"update_story_index_status",
			"move_project_file",
			"run_deterministic_procedure",
			"allocate_artifact",
			"execute_tool_backed_operation",
			"transition_step",
		]
		for (const branch of Object.values(getStep("step-2").decisionTree.branches)) {
			for (const candidateRoute of branch.routes) {
				expect(forbiddenActionKinds).not.to.include(candidateRoute.action.kind)
			}
		}
	})
})
