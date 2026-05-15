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
import { ClineDefaultTool } from "@/shared/tools"
import { WorkflowArtifactFamily } from "../../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionAction,
	WorkflowDecisionBranchRoute,
	WorkflowDeterministicProcedureResult,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowValue,
	WorkflowValues,
} from "../../../types"
import {
	buildAndPersistReviewScopeManifest,
	buildCodeReviewStep1WorkflowForm,
	CODE_REVIEW_ARTIFACTS,
	CODE_REVIEW_COMMIT_HASH_FIELD_KEY,
	CODE_REVIEW_ENTRY_PROJECT_VALUE_KEYS,
	CODE_REVIEW_FINDINGS_DOCUMENT_INITIAL_CONTENT,
	CODE_REVIEW_OUTPUT_ARTIFACT_ID,
	CODE_REVIEW_PREREQUISITE_FILES,
	CODE_REVIEW_REMEDIATION_STORY_ARTIFACT_ID,
	CODE_REVIEW_REMEDIATION_STORY_SHELL,
	CODE_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID,
	CODE_REVIEW_STEP_1_FORM_ID,
	CODE_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
	CODE_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
	CODE_REVIEW_TARGET_STORY_PREREQUISITE_ID,
	CODE_REVIEW_WORKFLOW_DESCRIPTION,
	CODE_REVIEW_WORKFLOW_DISPLAY_NAME,
	CODE_REVIEW_WORKFLOW_NAME,
	CODE_REVIEW_WORKFLOW_PERSONA,
	CODE_REVIEW_WORKFLOW_PROJECT_SUBFOLDER,
	CODE_REVIEW_WORKFLOW_SLASH_COMMAND_NAME,
	CODE_REVIEW_WORKFLOW_USE_SKILL_NAME,
	CODE_REVIEW_WORKFLOW_VALUE_KEYS,
	CodeReviewWorkflowValueKey,
	codeReviewWorkflowDefinition,
	deriveCodeReviewTargetStoryValues,
	discoverChildReviewOutputs,
	evaluateCodeReviewFindings,
	failWithToolBackedOperationReason,
	validateAndPersistReviewCommit,
} from ".."

const PROJECT_ROOT = "/tmp/code-review-project"
const TARGET_STORY_PATH = `${PROJECT_ROOT}/implementation/stories-review/Story-1-1.md`
const STORIES_INDEX_PATH = `${PROJECT_ROOT}/implementation/epic-1-stories.index.json`
const REVIEW_FOLDER_PATH = `${PROJECT_ROOT}/review`
const SAMPLE_WORKFLOW_VALUES: WorkflowValues = {
	[CodeReviewWorkflowValueKey.TargetStory]: TARGET_STORY_PATH,
	[CodeReviewWorkflowValueKey.SelectedStoryFilename]: "Story-1-1.md",
	[CodeReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1",
	[CodeReviewWorkflowValueKey.EpicIdentity]: "1",
	[CodeReviewWorkflowValueKey.StoriesIndex]: STORIES_INDEX_PATH,
	[CodeReviewWorkflowValueKey.ReviewFolder]: REVIEW_FOLDER_PATH,
	[CodeReviewWorkflowValueKey.EpicsDocument]: `${PROJECT_ROOT}/planning/Epics.md`,
	[CodeReviewWorkflowValueKey.ArchitectureDocument]: `${PROJECT_ROOT}/planning/architecture.md`,
	[CodeReviewWorkflowValueKey.CodeReviewOutput]: `${REVIEW_FOLDER_PATH}/code-review-1-1.md`,
	[CodeReviewWorkflowValueKey.ReviewScopeManifest]: `${REVIEW_FOLDER_PATH}/review-scope-manifest-1-1.md`,
	[CodeReviewWorkflowValueKey.ReviewCommitHash]: "abc123",
	[CodeReviewWorkflowValueKey.ReviewCommitParent]: "def456",
	[CodeReviewWorkflowValueKey.BlindReviewOutput]: `${REVIEW_FOLDER_PATH}/blind-review-1-1.md`,
	[CodeReviewWorkflowValueKey.EdgeCaseReviewOutput]: `${REVIEW_FOLDER_PATH}/edge-case-hunter-1-1.md`,
	[CodeReviewWorkflowValueKey.RemediationStoryParentIdentity]: "1.1",
	[CodeReviewWorkflowValueKey.RemediationStory]: `${PROJECT_ROOT}/implementation/stories-draft/Remediation-story-1-1-1.md`,
}

function createSession(
	workflowValues: WorkflowValues,
	projectRoot = PROJECT_ROOT,
	branchContext: ActiveWorkflowSession["branchContext"] = { activeBranchId: "step-1-resolve-target-story" },
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
			formSession: undefined,
			stepResolutionSession: undefined,
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext,
	}
}

function getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition {
	return codeReviewWorkflowDefinition.steps[stepId]
}

function findRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const route = getStep(stepId).decisionTree.branches[branchId]?.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Missing route ${stepId}/${branchId}/${routeId}.`)
	}

	return route
}

function getWorkflowForm(workflowFormId: string): WorkflowFormDefinitionPayload {
	const form = codeReviewWorkflowDefinition.workflowForms?.[workflowFormId]
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

function renderWorkflowValue(value: WorkflowValue): string {
	if (typeof value === "string") {
		return value
	}

	return JSON.stringify(value)
}

function createPromptInput(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): WorkflowPromptBuilderInput {
	const step = getStep(stepId)
	return {
		session: createSession(workflowValues),
		step,
		renderWorkflowValue,
	}
}

function buildPrompt(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): string {
	const prompt = getStep(stepId).buildPromptSource(createPromptInput(stepId, workflowValues)).currentStepInstructions
	if (prompt === undefined) {
		throw new Error(`Missing prompt instructions for ${stepId}.`)
	}

	return prompt
}

function getToolNamesForStep(stepId: WorkflowStepDefinition["id"]): readonly string[] {
	return getStep(stepId)
		.buildToolSchema(createPromptInput(stepId, {}))
		.map((schema) => schema.name)
}

function buildWorkflowFormPanelSubmittedEvent(args: {
	panelId: string
	action?: WorkflowFormPanelAction
}): WorkflowBranchTriggerEvent {
	return {
		kind: "workflow_form_panel_submitted",
		workflowFormId: CODE_REVIEW_STEP_1_FORM_ID,
		panelId: args.panelId,
		action: args.action ?? "submit",
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

function isActionKind<TKind extends WorkflowDecisionAction["kind"]>(
	action: WorkflowDecisionAction,
	kind: TKind,
): action is Extract<WorkflowDecisionAction, { kind: TKind }> {
	return action.kind === kind
}

function expectActionKind<TKind extends WorkflowDecisionAction["kind"]>(
	action: WorkflowDecisionAction,
	kind: TKind,
): Extract<WorkflowDecisionAction, { kind: TKind }> {
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

function expectOnEventTrigger(route: WorkflowDecisionBranchRoute, eventKind: WorkflowBranchTriggerEvent["kind"]): void {
	expect(route.trigger).to.deep.equal({
		kind: "on_event",
		eventKind,
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

async function createTargetStoryProject(): Promise<{
	root: string
	targetStory: string
	storiesIndex: string
	reviewFolder: string
}> {
	const root = await mkdtemp(join(tmpdir(), "code-review-workflow-"))
	const planningFolder = join(root, "planning")
	const implementationFolder = join(root, "implementation")
	const reviewStoriesFolder = join(implementationFolder, "stories-review")
	const reviewFolder = join(root, "review")
	const targetStory = join(reviewStoriesFolder, "Story-1-1.md")
	const storiesIndex = join(implementationFolder, "epic-1-stories.index.json")

	await mkdir(planningFolder, { recursive: true })
	await mkdir(reviewStoriesFolder, { recursive: true })
	await mkdir(reviewFolder, { recursive: true })
	await writeFile(join(planningFolder, "Epics.md"), "# Epics\n", "utf8")
	await writeFile(join(planningFolder, "architecture.md"), "# Architecture\n", "utf8")
	await writeFile(targetStory, "# Story\n\n## Tasks\n\n- [x] Task 1 Done.\n", "utf8")
	await writeFile(
		storiesIndex,
		JSON.stringify({
			version: 1,
			stories: [
				{
					story_identity: "1.1",
					story_file_name: "Story-1-1.md",
					story_type: "primary",
					parent_story_identity: null,
					story_file_generated: true,
					status: "review",
				},
			],
		}),
		"utf8",
	)

	return {
		root,
		targetStory,
		storiesIndex,
		reviewFolder,
	}
}

describe("codeReviewWorkflowDefinition", () => {
	it("declares the workflow identity, Fred persona, entry panel, and value keys", () => {
		expect(codeReviewWorkflowDefinition.name).to.equal(CODE_REVIEW_WORKFLOW_NAME)
		expect(codeReviewWorkflowDefinition.displayName).to.equal(CODE_REVIEW_WORKFLOW_DISPLAY_NAME)
		expect(codeReviewWorkflowDefinition.description).to.equal(CODE_REVIEW_WORKFLOW_DESCRIPTION)
		expect(codeReviewWorkflowDefinition.slashCommandName).to.equal(CODE_REVIEW_WORKFLOW_SLASH_COMMAND_NAME)
		expect(codeReviewWorkflowDefinition.useSkillName).to.equal(CODE_REVIEW_WORKFLOW_USE_SKILL_NAME)
		expect(codeReviewWorkflowDefinition.projectSubfolder).to.equal(CODE_REVIEW_WORKFLOW_PROJECT_SUBFOLDER)
		expect(codeReviewWorkflowDefinition.persona).to.deep.equal(CODE_REVIEW_WORKFLOW_PERSONA)
		expect(codeReviewWorkflowDefinition.entryPanel.promptMarkdown).to.equal(CODE_REVIEW_WORKFLOW_DESCRIPTION)
		expect(codeReviewWorkflowDefinition.workflowValueKeys).to.deep.equal(CODE_REVIEW_WORKFLOW_VALUE_KEYS)
		expect(codeReviewWorkflowDefinition.entryProjectValueKeys).to.deep.equal(CODE_REVIEW_ENTRY_PROJECT_VALUE_KEYS)
	})

	it("declares the target-story prerequisite", () => {
		const prerequisite = codeReviewWorkflowDefinition.prerequisiteFiles?.[CODE_REVIEW_TARGET_STORY_PREREQUISITE_ID]

		expect(prerequisite).to.deep.equal(CODE_REVIEW_PREREQUISITE_FILES[CODE_REVIEW_TARGET_STORY_PREREQUISITE_ID])
		expect(prerequisite?.producingWorkflowName).to.equal("dev-story")
		expect(prerequisite?.projectSubfolderSegments).to.deep.equal(["implementation", "stories-review"])
		expect(prerequisite?.workflowValueKey).to.equal(CodeReviewWorkflowValueKey.TargetStory)
		expect(prerequisite?.outputDocumentReference).to.equal("none")
		expect(prerequisite?.match.kind).to.equal("naming_pattern")
		if (prerequisite?.match.kind !== "naming_pattern") {
			throw new Error("Expected naming_pattern prerequisite match.")
		}
		expect(prerequisite.match.pattern.test("Story-1-1.md")).to.equal(true)
		expect(prerequisite.match.pattern.test("Remediation-story-1-1-1.md")).to.equal(true)
	})

	it("declares artifact ids, families, and output keys", () => {
		expect(codeReviewWorkflowDefinition.artifacts).to.deep.equal(CODE_REVIEW_ARTIFACTS)
		expect(Object.keys(CODE_REVIEW_ARTIFACTS)).to.deep.equal([
			CODE_REVIEW_OUTPUT_ARTIFACT_ID,
			CODE_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID,
			CODE_REVIEW_REMEDIATION_STORY_ARTIFACT_ID,
		])

		const codeReviewOutput = CODE_REVIEW_ARTIFACTS[CODE_REVIEW_OUTPUT_ARTIFACT_ID]
		expect(codeReviewOutput.family).to.equal(WorkflowArtifactFamily.CodeReviewOutput)
		expect(codeReviewOutput.intentMode).to.equal("derived")
		expect(codeReviewOutput.targetIdentitySource).to.deep.equal({
			kind: "workflow_value",
			key: CodeReviewWorkflowValueKey.SelectedStoryIdentity,
		})
		expect(codeReviewOutput.outputValueKeys).to.deep.equal({
			projectTitle: CodeReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: CodeReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: CodeReviewWorkflowValueKey.CodeReviewOutputArtifactFamily,
			artifactIdentity: CodeReviewWorkflowValueKey.CodeReviewOutputArtifactIdentity,
			artifactFilename: CodeReviewWorkflowValueKey.CodeReviewOutputArtifactFilename,
			artifactRelativePath: CodeReviewWorkflowValueKey.CodeReviewOutputArtifactRelativePath,
			artifactAbsolutePath: CodeReviewWorkflowValueKey.CodeReviewOutput,
			parentIdentity: undefined,
			targetIdentity: CodeReviewWorkflowValueKey.CodeReviewOutputArtifactIdentity,
		})

		const reviewScopeManifest = CODE_REVIEW_ARTIFACTS[CODE_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID]
		expect(reviewScopeManifest.family).to.equal(WorkflowArtifactFamily.ReviewScopeManifest)
		expect(reviewScopeManifest.intentMode).to.equal("derived")
		expect(reviewScopeManifest.targetIdentitySource).to.deep.equal({
			kind: "workflow_value",
			key: CodeReviewWorkflowValueKey.SelectedStoryIdentity,
		})
		expect(reviewScopeManifest.outputValueKeys).to.deep.equal({
			projectTitle: CodeReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: CodeReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: CodeReviewWorkflowValueKey.ReviewScopeManifestArtifactFamily,
			artifactIdentity: CodeReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity,
			artifactFilename: CodeReviewWorkflowValueKey.ReviewScopeManifestArtifactFilename,
			artifactRelativePath: CodeReviewWorkflowValueKey.ReviewScopeManifestArtifactRelativePath,
			artifactAbsolutePath: CodeReviewWorkflowValueKey.ReviewScopeManifest,
			parentIdentity: undefined,
			targetIdentity: CodeReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity,
		})

		const remediationStory = CODE_REVIEW_ARTIFACTS[CODE_REVIEW_REMEDIATION_STORY_ARTIFACT_ID]
		expect(remediationStory.family).to.equal(WorkflowArtifactFamily.RemediationStory)
		expect(remediationStory.intentMode).to.equal("new")
		expect(remediationStory.parentIdentitySource).to.deep.equal({
			kind: "workflow_value",
			key: CodeReviewWorkflowValueKey.RemediationStoryParentIdentity,
		})
		expect(remediationStory.outputValueKeys).to.deep.equal({
			projectTitle: CodeReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: CodeReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: CodeReviewWorkflowValueKey.RemediationStoryArtifactFamily,
			artifactIdentity: CodeReviewWorkflowValueKey.RemediationStoryArtifactIdentity,
			artifactFilename: CodeReviewWorkflowValueKey.RemediationStoryArtifactFilename,
			artifactRelativePath: CodeReviewWorkflowValueKey.RemediationStoryArtifactRelativePath,
			artifactAbsolutePath: CodeReviewWorkflowValueKey.RemediationStory,
			parentIdentity: CodeReviewWorkflowValueKey.RemediationStoryParentIdentity,
			targetIdentity: undefined,
		})
	})

	it("defines the Step 1 form panels without persisting commit hash before Git validation", () => {
		const form = getWorkflowForm(CODE_REVIEW_STEP_1_FORM_ID)
		expect(form).to.deep.equal(buildCodeReviewStep1WorkflowForm())
		expect(form.firstPanelId).to.equal(CODE_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)

		const panelA = getPanel(form, CODE_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)
		expect(panelA.title).to.equal("Identify Implementation Evidence")
		expect(panelA.promptMarkdown).to.equal("Provide the commit hash for the target story's commit.")
		expect(panelA.allowedActions).to.deep.equal(["submit"])
		expect(panelA.transition).to.deep.equal({ type: "runtime_routed" })

		const commitHashField = getSingleField(panelA)
		expect(commitHashField).to.deep.include({
			key: CODE_REVIEW_COMMIT_HASH_FIELD_KEY,
			kind: "small_text",
			label: "commit hash",
			required: true,
			allowedValueType: "string",
		})
		expect("workflowValueKey" in commitHashField).to.equal(false)

		const panelB = getPanel(form, CODE_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID)
		expect(panelB.title).to.equal("Invalid Commit Hash")
		expect(panelB.promptMarkdown).to.equal(
			"The provided commit hash is invalid. Please go back and provide a valid commit hash.",
		)
		expect(panelB.fields).to.deep.equal([])
		expect(panelB.allowedActions).to.deep.equal(["back"])
		expect(panelB.actionLabels).to.deep.equal({ back: "back" })
		expect(panelB.backDestinationPanelId).to.equal(CODE_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)
	})

	it("declares exact step labels and prompt tool surfaces without backend-only tools", () => {
		expect(getStep("step-1").checklistLabel).to.equal("Resolve Review Target")
		expect(getStep("step-2").checklistLabel).to.equal("Dispatch Specialist Subagent Reviewers")
		expect(getStep("step-3").checklistLabel).to.equal("Triage & Consolidate Findings")
		expect(getStep("step-4").checklistLabel).to.equal("Process Findings & Complete Workflow")
		expect(getToolNamesForStep("step-1")).to.deep.equal([])
		expect(getToolNamesForStep("step-2")).to.deep.equal(["use_subagents", "send_user_message", "workflow_progress_request"])
		expect(getToolNamesForStep("step-3")).to.deep.equal([
			"read_file",
			"read_file_range",
			"record_findings",
			"send_user_message",
			"workflow_progress_request",
		])
		expect(getToolNamesForStep("step-4")).to.deep.equal([
			"read_file",
			"read_file_range",
			"apply_patch",
			"ask_followup_question",
			"send_user_message",
			"attempt_completion",
		])

		for (const stepId of ["step-1", "step-2", "step-3", "step-4"] as const) {
			const toolNames = getToolNamesForStep(stepId)
			expect(toolNames).not.to.include(ClineDefaultTool.SET_WORKFLOW_VALUES)
			expect(toolNames).not.to.include(ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT)
			expect(toolNames).not.to.include(ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT)
			expect(toolNames).not.to.include(ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT)
			expect(toolNames).not.to.include(ClineDefaultTool.UPDATE_STORY_INDEX_STATUS)
			expect(toolNames).not.to.include(ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE)
		}
	})

	it("routes Step 1 from prerequisite resolution through commit validation and review-scope preparation", async () => {
		const resolveRoute = findRoute("step-1", "step-1-resolve-target-story", "step-1-resolve-target-story")
		expect(resolveRoute.action).to.deep.equal({
			kind: "resolve_prerequisite_files",
			prerequisiteIds: [CODE_REVIEW_TARGET_STORY_PREREQUISITE_ID],
		})
		expect(resolveRoute.followingBranchId).to.equal("step-1-derive-target-story-values")

		const deriveRoute = findRoute("step-1", "step-1-derive-target-story-values", "step-1-derive-target-story-values")
		const deriveAction = expectActionKind(deriveRoute.action, "run_deterministic_procedure")
		expect(deriveAction.instruction.run).to.equal(deriveCodeReviewTargetStoryValues)

		const allocateOutputRoute = findRoute(
			"step-1",
			"step-1-allocate-code-review-output",
			"step-1-allocate-code-review-output",
		)
		expect(allocateOutputRoute.action).to.deep.equal({
			kind: "allocate_artifact",
			artifactId: CODE_REVIEW_OUTPUT_ARTIFACT_ID,
		})

		const buildOutputRoute = findRoute(
			"step-1",
			"step-1-await-code-review-output-allocation",
			"step-1-build-initial-code-review-output",
		)
		expectEventPredicateMatches({
			stepId: "step-1",
			route: buildOutputRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-1-allocate-code-review-output",
				"step-1-allocate-code-review-output",
			),
		})
		const buildOutputAction = expectActionKind(buildOutputRoute.action, "build_workflow_document")
		expect(buildOutputAction.instruction.artifactId).to.equal(CODE_REVIEW_OUTPUT_ARTIFACT_ID)
		expect(await Promise.resolve(buildOutputAction.instruction.buildContent(createSession({})))).to.equal(
			CODE_REVIEW_FINDINGS_DOCUMENT_INITIAL_CONTENT,
		)

		const renderFormRoute = findRoute("step-1", "step-1-await-code-review-output-build", "step-1-render-commit-hash-panel")
		const renderFormAction = expectActionKind(renderFormRoute.action, "render_workflow_form")
		expect(renderFormAction.workflowFormId).to.equal(CODE_REVIEW_STEP_1_FORM_ID)
		if ("startPanelId" in renderFormAction === false) {
			throw new Error("Expected Step 1 commit panel render action to declare startPanelId.")
		}
		expect(renderFormAction.startPanelId).to.equal(CODE_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)

		const validateCommitRoute = findRoute("step-1", "step-1-await-commit-form-panel", "step-1-validate-commit-hash")
		expectEventPredicateMatches({
			stepId: "step-1",
			route: validateCommitRoute,
			workflowValues: {},
			triggerEvent: buildWorkflowFormPanelSubmittedEvent({ panelId: CODE_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID }),
		})
		const validateCommitAction = expectActionKind(validateCommitRoute.action, "run_deterministic_procedure")
		expect(validateCommitAction.instruction.run).to.equal(validateAndPersistReviewCommit)

		const invalidCommitRoute = findRoute(
			"step-1",
			"step-1-route-after-commit-validation",
			"step-1-continue-to-invalid-commit-panel",
		)
		expectSessionPredicateMatches({ stepId: "step-1", route: invalidCommitRoute, workflowValues: {} })
		const invalidCommitAction = expectActionKind(invalidCommitRoute.action, "continue_workflow_form")
		expect(invalidCommitAction.workflowFormId).to.equal(CODE_REVIEW_STEP_1_FORM_ID)
		expect(invalidCommitAction.panelId).to.equal(CODE_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID)
		expect(invalidCommitRoute.followingBranchId).to.equal("step-1-await-commit-form-panel")
		expect(await Promise.resolve(invalidCommitAction.buildReplacement(createSession({})))).to.deep.equal({
			panel: getPanel(buildCodeReviewStep1WorkflowForm(), CODE_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID),
			data: {},
		})

		const validCommitRoute = findRoute(
			"step-1",
			"step-1-route-after-commit-validation",
			"step-1-allocate-review-scope-manifest",
		)
		expectSessionPredicateMatches({
			stepId: "step-1",
			route: validCommitRoute,
			workflowValues: {
				[CodeReviewWorkflowValueKey.ReviewCommitHash]: "abc123",
				[CodeReviewWorkflowValueKey.ReviewCommitParent]: "def456",
			},
		})
		expect(validCommitRoute.action).to.deep.equal({
			kind: "allocate_artifact",
			artifactId: CODE_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID,
		})

		const buildManifestRoute = findRoute(
			"step-1",
			"step-1-await-review-scope-manifest-allocation",
			"step-1-build-review-scope-manifest",
		)
		expectEventPredicateMatches({
			stepId: "step-1",
			route: buildManifestRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-1-route-after-commit-validation",
				"step-1-allocate-review-scope-manifest",
			),
		})
		const buildManifestAction = expectActionKind(buildManifestRoute.action, "run_deterministic_procedure")
		expect(buildManifestAction.instruction.run).to.equal(buildAndPersistReviewScopeManifest)

		const transitionRoute = findRoute("step-1", "step-1-transition-to-step-2", "step-1-transition-to-step-2")
		expectTransitionStepAction(transitionRoute.action, 2)
	})

	it("derives Step 1 target-story workflow values from the selected story", async () => {
		const project = await createTargetStoryProject()
		try {
			const result = expectSucceeded(
				await deriveCodeReviewTargetStoryValues(
					createSession({ [CodeReviewWorkflowValueKey.TargetStory]: project.targetStory }, project.root),
				),
			)

			expect(result.workflowValueWrites).to.deep.equal({
				[CodeReviewWorkflowValueKey.SelectedStoryFilename]: "Story-1-1.md",
				[CodeReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1",
				[CodeReviewWorkflowValueKey.EpicIdentity]: "1",
				[CodeReviewWorkflowValueKey.StoriesIndex]: project.storiesIndex,
				[CodeReviewWorkflowValueKey.ReviewFolder]: project.reviewFolder,
				[CodeReviewWorkflowValueKey.EpicsDocument]: join(project.root, "planning", "Epics.md"),
				[CodeReviewWorkflowValueKey.ArchitectureDocument]: join(project.root, "planning", "architecture.md"),
			})
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("discovers Step 2 child outputs and re-prompts when outputs are missing or empty", async () => {
		const project = await createTargetStoryProject()
		try {
			const missingResult = expectSucceeded(
				await discoverChildReviewOutputs(
					createSession(
						{
							[CodeReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1",
							[CodeReviewWorkflowValueKey.ReviewFolder]: project.reviewFolder,
						},
						project.root,
					),
				),
			)
			expect(missingResult.workflowValueWrites).to.deep.equal({
				[CodeReviewWorkflowValueKey.MissingSubagentOutputFiles]: ["blind-review-1-1.md", "edge-case-hunter-1-1.md"],
			})

			await writeFile(join(project.reviewFolder, "blind-review-1-1.md"), "blind review output\n", "utf8")
			await writeFile(join(project.reviewFolder, "edge-case-hunter-1-1.md"), "edge case output\n", "utf8")

			const readyResult = expectSucceeded(
				await discoverChildReviewOutputs(
					createSession(
						{
							[CodeReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1",
							[CodeReviewWorkflowValueKey.ReviewFolder]: project.reviewFolder,
						},
						project.root,
					),
				),
			)
			expect(readyResult.workflowValueWrites).to.deep.equal({
				[CodeReviewWorkflowValueKey.BlindReviewOutput]: join(project.reviewFolder, "blind-review-1-1.md"),
				[CodeReviewWorkflowValueKey.EdgeCaseReviewOutput]: join(project.reviewFolder, "edge-case-hunter-1-1.md"),
				[CodeReviewWorkflowValueKey.MissingSubagentOutputFiles]: [],
			})
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("routes Step 2 after child-output discovery and projects missing-output prompts", () => {
		const discoverRoute = findRoute("step-2", "step-2-await-progress-request", "step-2-discover-child-review-outputs")
		expectOnEventTrigger(discoverRoute, "workflow_progress_request_confirmed")
		const discoverAction = expectActionKind(discoverRoute.action, "run_deterministic_procedure")
		expect(discoverAction.instruction.run).to.equal(discoverChildReviewOutputs)

		const readyRoute = findRoute("step-2", "step-2-route-after-child-output-discovery", "step-2-transition-to-step-3")
		expectSessionPredicateMatches({
			stepId: "step-2",
			route: readyRoute,
			workflowValues: {
				[CodeReviewWorkflowValueKey.BlindReviewOutput]: "/review/blind-review-1-1.md",
				[CodeReviewWorkflowValueKey.EdgeCaseReviewOutput]: "/review/edge-case-hunter-1-1.md",
				[CodeReviewWorkflowValueKey.MissingSubagentOutputFiles]: [],
			},
		})
		expectTransitionStepAction(readyRoute.action, 3)

		const missingRoute = findRoute(
			"step-2",
			"step-2-route-after-child-output-discovery",
			"step-2-project-missing-output-prompt",
		)
		expectSessionPredicateMatches({
			stepId: "step-2",
			route: missingRoute,
			workflowValues: {
				[CodeReviewWorkflowValueKey.MissingSubagentOutputFiles]: ["blind-review-1-1.md"],
			},
		})
		expectActionKind(missingRoute.action, "project_prompt")
		expect(missingRoute.followingBranchId).to.equal("step-2-await-progress-request")

		const missingPrompt = buildPrompt("step-2", {
			[CodeReviewWorkflowValueKey.MissingSubagentOutputFiles]: ["blind-review-1-1.md"],
		})
		expect(missingPrompt.trim().length).to.be.greaterThan(0)
		expect(missingPrompt).to.include("blind-review-1-1.md")
	})

	it("builds non-empty Step 2 and Step 3 prompts with materialized review output paths", () => {
		const step2Prompt = buildPrompt("step-2", {})
		expect(step2Prompt.trim().length).to.be.greaterThan(0)

		const step3Prompt = buildPrompt("step-3", SAMPLE_WORKFLOW_VALUES)
		expect(step3Prompt).to.include(SAMPLE_WORKFLOW_VALUES[CodeReviewWorkflowValueKey.BlindReviewOutput])
		expect(step3Prompt).to.include(SAMPLE_WORKFLOW_VALUES[CodeReviewWorkflowValueKey.EdgeCaseReviewOutput])
		expect(step3Prompt.trim().length).to.be.greaterThan(0)
	})

	it("routes Step 3 workflow_progress_request confirmation to Step 4", () => {
		const route = findRoute("step-3", "step-3-await-progress-request", "step-3-transition-to-step-4")

		expectOnEventTrigger(route, "workflow_progress_request_confirmed")
		expectTransitionStepAction(route.action, 4)
	})

	it("evaluates Step 4 findings and preserves upstream conditional state", async () => {
		const project = await createTargetStoryProject()
		try {
			const noFindingsFile = join(project.reviewFolder, "code-review-no-findings.md")
			await writeFile(noFindingsFile, CODE_REVIEW_FINDINGS_DOCUMENT_INITIAL_CONTENT, "utf8")
			const noFindingsResult = expectSucceeded(
				await evaluateCodeReviewFindings(
					createSession(
						{
							[CodeReviewWorkflowValueKey.CodeReviewOutput]: noFindingsFile,
							[CodeReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1",
						},
						project.root,
					),
				),
			)
			expect(noFindingsResult.workflowValueWrites).to.deep.equal({
				[CodeReviewWorkflowValueKey.ReviewFindingsPresent]: false,
				[CodeReviewWorkflowValueKey.UpstreamFindingsPresent]: false,
				[CodeReviewWorkflowValueKey.RemediationStoryParentIdentity]: "1.1",
			})

			const findingsFile = join(project.reviewFolder, "code-review-findings.md")
			await writeFile(
				findingsFile,
				[
					"# Code Review Findings",
					"",
					"## Task Failures",
					"",
					"- Task issue.",
					"",
					"## Dev Agent Failures",
					"",
					"## Upstream Failures",
					"",
					"- Upstream issue.",
					"",
				].join("\n"),
				"utf8",
			)
			const findingsResult = expectSucceeded(
				await evaluateCodeReviewFindings(
					createSession(
						{
							[CodeReviewWorkflowValueKey.CodeReviewOutput]: findingsFile,
							[CodeReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1",
						},
						project.root,
					),
				),
			)
			expect(findingsResult.workflowValueWrites).to.deep.equal({
				[CodeReviewWorkflowValueKey.ReviewFindingsPresent]: true,
				[CodeReviewWorkflowValueKey.UpstreamFindingsPresent]: true,
				[CodeReviewWorkflowValueKey.RemediationStoryParentIdentity]: "1.1",
			})
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("routes Step 4 no-findings status update, story move, and completion", () => {
		const evaluateRoute = findRoute("step-4", "step-4-evaluate-findings", "step-4-evaluate-findings")
		const evaluateAction = expectActionKind(evaluateRoute.action, "run_deterministic_procedure")
		expect(evaluateAction.instruction.run).to.equal(evaluateCodeReviewFindings)

		const noFindingsRoute = findRoute(
			"step-4",
			"step-4-route-after-findings-evaluation",
			"step-4-update-selected-story-status-no-findings",
		)
		expectSessionPredicateMatches({
			stepId: "step-4",
			route: noFindingsRoute,
			workflowValues: {
				[CodeReviewWorkflowValueKey.ReviewFindingsPresent]: false,
			},
		})
		expect(noFindingsRoute.action).to.deep.equal({
			kind: "update_story_index_status",
			storyIndexWorkflowValueKey: CodeReviewWorkflowValueKey.StoriesIndex,
			storyIdentityWorkflowValueKey: CodeReviewWorkflowValueKey.SelectedStoryIdentity,
			status: "complete",
			expectedCurrentStatus: "review",
		})
		expect(noFindingsRoute.followingBranchId).to.equal("step-4-await-selected-story-status-update")

		const moveRoute = findRoute(
			"step-4",
			"step-4-await-selected-story-status-update",
			"step-4-move-selected-story-to-complete",
		)
		expectEventPredicateMatches({
			stepId: "step-4",
			route: moveRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-4-route-after-findings-evaluation",
				"step-4-update-selected-story-status-no-findings",
			),
		})
		expect(moveRoute.action).to.deep.equal({
			kind: "move_project_file",
			sourceFolderSegments: ["implementation", "stories-review"],
			destinationFolderSegments: ["implementation", "stories-complete"],
			filenameWorkflowValueKey: CodeReviewWorkflowValueKey.SelectedStoryFilename,
		})
		expect(moveRoute.followingBranchId).to.equal("step-4-await-selected-story-move")

		const completionRoute = findRoute(
			"step-4",
			"step-4-await-selected-story-move",
			"step-4-complete-workflow-after-selected-story-move",
		)
		expectEventPredicateMatches({
			stepId: "step-4",
			route: completionRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-4-await-selected-story-status-update",
				"step-4-move-selected-story-to-complete",
			),
		})
		expect(completionRoute.action).to.deep.equal({ kind: "complete_workflow" })
	})

	it("routes Step 4 findings through remediation planning, artifact creation, document build, and prompt projection", async () => {
		const findingsRoute = findRoute("step-4", "step-4-route-after-findings-evaluation", "step-4-plan-remediation-story")
		expectSessionPredicateMatches({
			stepId: "step-4",
			route: findingsRoute,
			workflowValues: {
				[CodeReviewWorkflowValueKey.ReviewFindingsPresent]: true,
			},
		})
		const findingsAction = expectActionKind(findingsRoute.action, "execute_tool_backed_operation")
		expect(findingsAction.instruction.toolName).to.equal(ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT)
		expect(
			findingsAction.instruction.buildToolExecutionRequest({
				activeWorkflowSession: createSession(SAMPLE_WORKFLOW_VALUES),
				toolBackedOperationSession: {
					sessionId: "test-session",
					sourceRoute: {
						branchId: "step-4-route-after-findings-evaluation",
						routeId: "step-4-plan-remediation-story",
					},
					triggerSource: "execute_tool_backed_operation",
					owner: {
						kind: "workflow_step",
						workflowName: CODE_REVIEW_WORKFLOW_NAME,
						stepNumber: 4,
					},
					state: "pending",
				},
			}),
		).to.deep.equal({
			toolName: ClineDefaultTool.PLAN_REMEDIATION_STORY_ARTIFACT,
			toolInput: {},
			toolParams: {
				epic_identity: "1",
				target_story_identity: "1.1",
			},
		})

		const allocateRoute = findRoute("step-4", "step-4-await-remediation-story-planning", "step-4-allocate-remediation-story")
		expectEventPredicateMatches({
			stepId: "step-4",
			route: allocateRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-4-route-after-findings-evaluation",
				"step-4-plan-remediation-story",
			),
		})
		expect(allocateRoute.action).to.deep.equal({
			kind: "allocate_artifact",
			artifactId: CODE_REVIEW_REMEDIATION_STORY_ARTIFACT_ID,
		})

		const buildRoute = findRoute(
			"step-4",
			"step-4-await-remediation-story-allocation",
			"step-4-build-remediation-story-shell",
		)
		expectEventPredicateMatches({
			stepId: "step-4",
			route: buildRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-4-await-remediation-story-planning",
				"step-4-allocate-remediation-story",
			),
		})
		const buildAction = expectActionKind(buildRoute.action, "build_workflow_document")
		expect(buildAction.instruction.artifactId).to.equal(CODE_REVIEW_REMEDIATION_STORY_ARTIFACT_ID)
		expect(await Promise.resolve(buildAction.instruction.buildContent(createSession(SAMPLE_WORKFLOW_VALUES)))).to.equal(
			CODE_REVIEW_REMEDIATION_STORY_SHELL,
		)

		const promptRoute = findRoute("step-4", "step-4-await-remediation-story-build", "step-4-project-remediation-story-prompt")
		expectEventPredicateMatches({
			stepId: "step-4",
			route: promptRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-4-await-remediation-story-allocation",
				"step-4-build-remediation-story-shell",
			),
		})
		expect(promptRoute.action).to.deep.equal({ kind: "project_prompt" })
		expect(promptRoute.followingBranchId).to.equal("step-4-await-attempt-completion")
	})

	it("builds non-empty Step 4 prompts and materializes code-review and remediation paths conditionally", () => {
		const codeReviewOutput = SAMPLE_WORKFLOW_VALUES[CodeReviewWorkflowValueKey.CodeReviewOutput]
		if (typeof codeReviewOutput !== "string" || codeReviewOutput === "") {
			throw new Error("Expected SAMPLE_WORKFLOW_VALUES to define a non-empty code_review_output path.")
		}

		const remediationStory = SAMPLE_WORKFLOW_VALUES[CodeReviewWorkflowValueKey.RemediationStory]
		if (typeof remediationStory !== "string" || remediationStory === "") {
			throw new Error("Expected SAMPLE_WORKFLOW_VALUES to define a non-empty remediation_story path.")
		}

		const basePrompt = buildPrompt("step-4", {
			...SAMPLE_WORKFLOW_VALUES,
			[CodeReviewWorkflowValueKey.UpstreamFindingsPresent]: false,
			[CodeReviewWorkflowValueKey.RemediationStory]: "",
		})
		expect(basePrompt.trim().length).to.be.greaterThan(0)
		expect(basePrompt).not.to.include(remediationStory)

		const upstreamPrompt = buildPrompt("step-4", {
			...SAMPLE_WORKFLOW_VALUES,
			[CodeReviewWorkflowValueKey.UpstreamFindingsPresent]: true,
			[CodeReviewWorkflowValueKey.RemediationStory]: "",
		})
		expect(upstreamPrompt.trim().length).to.be.greaterThan(0)
		expect(upstreamPrompt).not.to.include(remediationStory)
		expect(upstreamPrompt).not.to.equal(basePrompt)

		const remediationPrompt = buildPrompt("step-4", SAMPLE_WORKFLOW_VALUES)
		expect(remediationPrompt.trim().length).to.be.greaterThan(0)
		expect(remediationPrompt).to.include(remediationStory)
		expect(remediationPrompt.trim().length).to.be.greaterThan(upstreamPrompt.trim().length)

		for (const prompt of [basePrompt, upstreamPrompt, remediationPrompt]) {
			expect(prompt).to.include(codeReviewOutput)
			expect(prompt).not.to.include("code_review_output")
		}
	})

	it("preserves concrete Step 4 backend failure reasons", () => {
		const result = failWithToolBackedOperationReason(
			createSession({}, PROJECT_ROOT, {
				activeBranchId: "step-4-await-remediation-story-planning",
				failureState: {
					retryAttemptCount: 1,
					terminalErrorMessage: "specific backend failure",
				},
			}),
		)

		expect(result).to.deep.equal({
			kind: "failed",
			errorMessage: "specific backend failure",
		})

		for (const route of [
			findRoute("step-4", "step-4-await-remediation-story-planning", "step-4-fail-after-remediation-story-planning"),
			findRoute("step-4", "step-4-await-remediation-story-allocation", "step-4-fail-after-remediation-story-allocation"),
			findRoute("step-4", "step-4-await-remediation-story-build", "step-4-fail-after-remediation-story-build"),
			findRoute("step-4", "step-4-await-selected-story-status-update", "step-4-fail-after-selected-story-status-update"),
			findRoute("step-4", "step-4-await-selected-story-move", "step-4-fail-after-selected-story-move"),
		]) {
			const action = expectActionKind(route.action, "run_deterministic_procedure")
			expect(action.instruction.run).to.equal(failWithToolBackedOperationReason)
		}

		const planningFailureRoute = findRoute(
			"step-4",
			"step-4-await-remediation-story-planning",
			"step-4-fail-after-remediation-story-planning",
		)
		expectEventPredicateMatches({
			stepId: "step-4",
			route: planningFailureRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationFailedEvent(
				"step-4-route-after-findings-evaluation",
				"step-4-plan-remediation-story",
			),
		})
	})

	it("routes Step 4 attempt_completion_succeeded through status update, story move, and completion", () => {
		const attemptRoute = findRoute(
			"step-4",
			"step-4-await-attempt-completion",
			"step-4-update-selected-story-status-after-remediation",
		)
		const attemptCompletionEvent = buildAttemptCompletionSucceededEvent()
		expectOnEventTrigger(attemptRoute, attemptCompletionEvent.kind)
		expect(attemptRoute.action).to.deep.equal({
			kind: "update_story_index_status",
			storyIndexWorkflowValueKey: CodeReviewWorkflowValueKey.StoriesIndex,
			storyIdentityWorkflowValueKey: CodeReviewWorkflowValueKey.SelectedStoryIdentity,
			status: "complete",
			expectedCurrentStatus: "review",
		})
		expect(attemptRoute.followingBranchId).to.equal("step-4-await-selected-story-status-update")

		const moveRoute = findRoute(
			"step-4",
			"step-4-await-selected-story-status-update",
			"step-4-move-selected-story-to-complete",
		)
		expectEventPredicateMatches({
			stepId: "step-4",
			route: moveRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-4-await-attempt-completion",
				"step-4-update-selected-story-status-after-remediation",
			),
		})
		expect(moveRoute.action).to.deep.equal({
			kind: "move_project_file",
			sourceFolderSegments: ["implementation", "stories-review"],
			destinationFolderSegments: ["implementation", "stories-complete"],
			filenameWorkflowValueKey: CodeReviewWorkflowValueKey.SelectedStoryFilename,
		})

		const completionRoute = findRoute(
			"step-4",
			"step-4-await-selected-story-move",
			"step-4-complete-workflow-after-selected-story-move",
		)
		expectEventPredicateMatches({
			stepId: "step-4",
			route: completionRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-4-await-selected-story-status-update",
				"step-4-move-selected-story-to-complete",
			),
		})
		expect(completionRoute.action).to.deep.equal({ kind: "complete_workflow" })
	})
})
