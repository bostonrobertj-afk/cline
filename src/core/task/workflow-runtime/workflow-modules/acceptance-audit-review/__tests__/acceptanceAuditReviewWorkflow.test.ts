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
import type { WorkflowFormSessionState } from "@/core/task/workflow-form/types"
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
} from "../../../types"
import {
	resolveWorkflowBySlashCommand,
	resolveWorkflowByUseSkillName,
	resolveWorkflowDefinition,
} from "../../../WorkflowRegistry"
import { renderWorkflowPromptTemplate } from "../../../workflowPromptTemplates"
import {
	ACCEPTANCE_AUDIT_REVIEW_ARTIFACTS,
	ACCEPTANCE_AUDIT_REVIEW_COMMIT_HASH_FIELD_KEY,
	ACCEPTANCE_AUDIT_REVIEW_ENTRY_PROJECT_VALUE_KEYS,
	ACCEPTANCE_AUDIT_REVIEW_OUTPUT_ARTIFACT_ID,
	ACCEPTANCE_AUDIT_REVIEW_PREREQUISITE_FILES,
	ACCEPTANCE_AUDIT_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID,
	ACCEPTANCE_AUDIT_REVIEW_STEP_1_FORM_ID,
	ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
	ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
	ACCEPTANCE_AUDIT_REVIEW_TARGET_STORY_PREREQUISITE_ID,
	ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_DESCRIPTION,
	ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_DISPLAY_NAME,
	ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_NAME,
	ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_PERSONA,
	ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_PROJECT_SUBFOLDER,
	ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_SLASH_COMMAND_NAME,
	ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_USE_SKILL_NAME,
	ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_VALUE_KEYS,
	AcceptanceAuditReviewWorkflowValueKey,
	acceptanceAuditReviewWorkflowDefinition,
	buildAcceptanceAuditReviewStep1WorkflowForm,
	buildAndPersistAcceptanceAuditReviewScopeManifest,
	deriveAcceptanceAuditReviewTargetStoryValues,
	failAcceptanceAuditReviewOutputArtifactAllocation,
	failAcceptanceAuditReviewScopeManifestArtifactAllocation,
	runAcceptanceAuditReviewGitCommand,
	validateAndPersistAcceptanceAuditReviewCommit,
	validateInheritedAcceptanceAuditReviewEvidence,
} from ".."

const PROJECT_ROOT = "/tmp/acceptance-audit-review-project"
const TARGET_STORY_PATH = `${PROJECT_ROOT}/implementation/stories-review/Story-1-1.md`
const EPICS_DOCUMENT_PATH = `${PROJECT_ROOT}/planning/Epics.md`
const ARCHITECTURE_DOCUMENT_PATH = `${PROJECT_ROOT}/planning/architecture.md`
const REVIEW_FOLDER_PATH = `${PROJECT_ROOT}/review`
const REVIEW_SCOPE_MANIFEST_PATH = `${REVIEW_FOLDER_PATH}/review-scope-1-1.md`
const ACCEPTANCE_AUDIT_OUTPUT_PATH = `${REVIEW_FOLDER_PATH}/acceptance-audit-1-1.md`

const SAMPLE_WORKFLOW_VALUES: WorkflowValues = {
	[AcceptanceAuditReviewWorkflowValueKey.TargetStory]: TARGET_STORY_PATH,
	[AcceptanceAuditReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1",
	[AcceptanceAuditReviewWorkflowValueKey.EpicsDocument]: EPICS_DOCUMENT_PATH,
	[AcceptanceAuditReviewWorkflowValueKey.ArchitectureDocument]: ARCHITECTURE_DOCUMENT_PATH,
	[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash]: "abc123",
	[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent]: "def456",
	[AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest]: REVIEW_SCOPE_MANIFEST_PATH,
	[AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifestArtifactFamily]: "review_scope_manifest",
	[AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity]: "1.1",
	[AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifestArtifactFilename]: "review-scope-1-1.md",
	[AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifestArtifactRelativePath]: "review/review-scope-1-1.md",
	[AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutput]: ACCEPTANCE_AUDIT_OUTPUT_PATH,
	[AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutputArtifactFamily]: "acceptance_audit_output",
	[AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutputArtifactIdentity]: "1.1",
	[AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutputArtifactFilename]: "acceptance-audit-1-1.md",
	[AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutputArtifactRelativePath]: "review/acceptance-audit-1-1.md",
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
		prerequisiteFileResolutions: [],
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
		prerequisiteFileResolutions: [],
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
	const definitionPayload = buildAcceptanceAuditReviewStep1WorkflowForm()
	return {
		sessionId: "test-acceptance-audit-review-form-session",
		workflowFormId: ACCEPTANCE_AUDIT_REVIEW_STEP_1_FORM_ID,
		definitionVersion: definitionPayload.definitionVersion,
		definitionPayload,
		firstPanelId: ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
		currentPanelId: ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
		values: {
			[ACCEPTANCE_AUDIT_REVIEW_COMMIT_HASH_FIELD_KEY]: {
				valueType: "string",
				stringValue: commitHash,
			},
		},
		data: {},
	}
}

function getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition {
	const step = acceptanceAuditReviewWorkflowDefinition.steps[stepId]
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
	const form = acceptanceAuditReviewWorkflowDefinition.workflowForms?.[workflowFormId]
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
	return {
		session: createSession(workflowValues),
		step: getStep(stepId),
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
		workflowValueKeys: acceptanceAuditReviewWorkflowDefinition.workflowValueKeys,
		workflowValues,
		context: `acceptance-audit-review ${stepId} test prompt`,
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
		workflowFormId: ACCEPTANCE_AUDIT_REVIEW_STEP_1_FORM_ID,
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
	const result = await runAcceptanceAuditReviewGitCommand({ selectedProjectRoot, gitArgs })
	if (result.exitCode !== 0) {
		throw new Error(`Git command failed: git ${gitArgs.join(" ")}\n${result.stderr}`)
	}

	return result.stdout.trim()
}

async function createTemporaryGitProject(): Promise<{
	root: string
	targetStory: string
	epicsDocument: string
	architectureDocument: string
	firstCommitHash: string
	secondCommitHash: string
}> {
	const root = await mkdtemp(join(tmpdir(), "acceptance-audit-review-workflow-"))
	const planningFolder = join(root, "planning")
	const reviewFolder = join(root, "review")
	const storiesFolder = join(root, "implementation", "stories-review")
	const sourceFolder = join(root, "src")
	const targetStory = join(storiesFolder, "Story-1-1.md")
	const epicsDocument = join(planningFolder, "Epics.md")
	const architectureDocument = join(planningFolder, "architecture.md")

	await mkdir(planningFolder, { recursive: true })
	await mkdir(reviewFolder, { recursive: true })
	await mkdir(storiesFolder, { recursive: true })
	await mkdir(sourceFolder, { recursive: true })
	await writeFile(epicsDocument, "# Epics\n", "utf8")
	await writeFile(architectureDocument, "# Architecture\n", "utf8")
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
	await runRequiredGitCommand(root, ["config", "user.email", "acceptance-audit-review@example.com"])
	await runRequiredGitCommand(root, ["config", "user.name", "Acceptance Audit Review Test"])
	await runRequiredGitCommand(root, ["add", "."])
	await runRequiredGitCommand(root, ["commit", "-m", "first commit"])
	const firstCommitHash = await runRequiredGitCommand(root, ["rev-parse", "HEAD"])

	await writeFile(join(sourceFolder, "allowed.ts"), "export const allowed = 2\n", "utf8")
	await rm(join(sourceFolder, "deleted.ts"))
	await writeFile(join(sourceFolder, "new-outside.ts"), "export const outside = 1\n", "utf8")
	await runRequiredGitCommand(root, ["add", "."])
	await runRequiredGitCommand(root, ["commit", "-m", "second commit"])
	const secondCommitHash = await runRequiredGitCommand(root, ["rev-parse", "HEAD"])

	return {
		root,
		targetStory,
		epicsDocument,
		architectureDocument,
		firstCommitHash,
		secondCommitHash,
	}
}

describe("acceptanceAuditReviewWorkflowDefinition", () => {
	it("resolves through canonical workflow activation names", () => {
		expect(resolveWorkflowDefinition("acceptance-audit-review")).to.equal(acceptanceAuditReviewWorkflowDefinition)
		expect(resolveWorkflowBySlashCommand("acceptance-audit-review")).to.equal(acceptanceAuditReviewWorkflowDefinition)
		expect(resolveWorkflowByUseSkillName("acceptance-audit-review")).to.equal(acceptanceAuditReviewWorkflowDefinition)
	})

	it("does not resolve the retired markdown workflow alias", () => {
		expect(resolveWorkflowDefinition("acceptance-audit-review.md")).to.equal(undefined)
		expect(resolveWorkflowBySlashCommand("acceptance-audit-review.md")).to.equal(undefined)
		expect(resolveWorkflowByUseSkillName("acceptance-audit-review.md")).to.equal(undefined)
	})

	it("declares workflow identity", () => {
		expect(acceptanceAuditReviewWorkflowDefinition.name).to.equal(ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_NAME)
		expect(acceptanceAuditReviewWorkflowDefinition.displayName).to.equal(ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_DISPLAY_NAME)
		expect(acceptanceAuditReviewWorkflowDefinition.description).to.equal(ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_DESCRIPTION)
		expect(acceptanceAuditReviewWorkflowDefinition.slashCommandName).to.equal(
			ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_SLASH_COMMAND_NAME,
		)
		expect(acceptanceAuditReviewWorkflowDefinition.useSkillName).to.equal(ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_USE_SKILL_NAME)
		expect(acceptanceAuditReviewWorkflowDefinition.projectSelection).to.deep.equal({ kind: "interactive" })
		expect(acceptanceAuditReviewWorkflowDefinition.projectOutputPlacement).to.deep.equal({
			kind: "selected_project_subfolder",
			subfolder: ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_PROJECT_SUBFOLDER,
		})
		expect(Object.hasOwn(acceptanceAuditReviewWorkflowDefinition, "projectSubfolder")).to.equal(false)
	})

	it("declares the Fred quality-control persona", () => {
		expect(acceptanceAuditReviewWorkflowDefinition.persona).to.deep.equal(ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_PERSONA)
	})

	it("declares the description-backed entry panel", () => {
		expect(acceptanceAuditReviewWorkflowDefinition.entryPanel.promptMarkdown).to.equal(
			ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_DESCRIPTION,
		)
	})

	it("declares the complete workflow value inventory", () => {
		expect(acceptanceAuditReviewWorkflowDefinition.workflowValueKeys).to.deep.equal(
			ACCEPTANCE_AUDIT_REVIEW_WORKFLOW_VALUE_KEYS,
		)
	})

	it("declares entry project workflow value keys", () => {
		expect(acceptanceAuditReviewWorkflowDefinition.entryProjectValueKeys).to.deep.equal(
			ACCEPTANCE_AUDIT_REVIEW_ENTRY_PROJECT_VALUE_KEYS,
		)
	})

	it("declares child inheritance for parent-provided review evidence, selected story identity, and project documents", () => {
		expect(acceptanceAuditReviewWorkflowDefinition.childInheritance).to.deep.equal([
			{ parentKey: "review_commit_hash", childKey: "review_commit_hash" },
			{ parentKey: "review_commit_parent", childKey: "review_commit_parent" },
			{ parentKey: "target_story", childKey: "target_story" },
			{ parentKey: "selected_story_identity", childKey: "selected_story_identity" },
			{ parentKey: "epics_document", childKey: "epics_document" },
			{ parentKey: "architecture_document", childKey: "architecture_document" },
			{ parentKey: "review_scope_manifest", childKey: "review_scope_manifest" },
		])
	})

	it("declares the target story prerequisite", () => {
		const prerequisite =
			acceptanceAuditReviewWorkflowDefinition.prerequisiteFiles?.[ACCEPTANCE_AUDIT_REVIEW_TARGET_STORY_PREREQUISITE_ID]
		if (prerequisite === undefined) {
			throw new Error("Missing target story prerequisite.")
		}

		expect(prerequisite).to.deep.equal(
			ACCEPTANCE_AUDIT_REVIEW_PREREQUISITE_FILES[ACCEPTANCE_AUDIT_REVIEW_TARGET_STORY_PREREQUISITE_ID],
		)
		expect(prerequisite.id).to.equal(ACCEPTANCE_AUDIT_REVIEW_TARGET_STORY_PREREQUISITE_ID)
		expect(prerequisite.producingWorkflowName).to.equal("dev-story")
		expect(prerequisite.projectSubfolderSegments).to.deep.equal(["implementation", "stories-review"])
		expect(prerequisite.workflowValueKey).to.equal(AcceptanceAuditReviewWorkflowValueKey.TargetStory)
		expect(prerequisite.outputDocumentReference).to.equal("none")
		expect(prerequisite.match.kind).to.equal("naming_pattern")
		if (prerequisite.match.kind !== "naming_pattern") {
			throw new Error("Expected naming_pattern prerequisite match.")
		}
		expect(prerequisite.match.pattern.test("Story-1-1.md")).to.equal(true)
		expect(prerequisite.match.pattern.test("Remediation-story-1-1-1.md")).to.equal(true)
	})

	it("declares the review scope manifest artifact", () => {
		const artifact =
			acceptanceAuditReviewWorkflowDefinition.artifacts?.[ACCEPTANCE_AUDIT_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID]
		if (artifact === undefined) {
			throw new Error("Missing review scope manifest artifact.")
		}

		expect(artifact).to.deep.equal(
			ACCEPTANCE_AUDIT_REVIEW_ARTIFACTS[ACCEPTANCE_AUDIT_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID],
		)
		expect(artifact.id).to.equal(ACCEPTANCE_AUDIT_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID)
		expect(artifact.family).to.equal(WorkflowArtifactFamily.ReviewScopeManifest)
		expect(artifact.intentMode).to.equal("derived")
		expect(artifact.parentIdentitySource).to.equal(undefined)
		expect(artifact.targetIdentitySource).to.deep.equal({
			kind: "workflow_value",
			key: AcceptanceAuditReviewWorkflowValueKey.SelectedStoryIdentity,
		})
		expect(artifact.outputValueKeys).to.deep.equal({
			projectTitle: AcceptanceAuditReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: AcceptanceAuditReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifestArtifactFamily,
			artifactIdentity: AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity,
			artifactFilename: AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifestArtifactFilename,
			artifactRelativePath: AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifestArtifactRelativePath,
			artifactAbsolutePath: AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest,
			parentIdentity: undefined,
			targetIdentity: AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity,
		})
	})

	it("declares the acceptance audit output artifact", () => {
		const artifact = acceptanceAuditReviewWorkflowDefinition.artifacts?.[ACCEPTANCE_AUDIT_REVIEW_OUTPUT_ARTIFACT_ID]
		if (artifact === undefined) {
			throw new Error("Missing acceptance audit output artifact.")
		}

		expect(artifact).to.deep.equal(ACCEPTANCE_AUDIT_REVIEW_ARTIFACTS[ACCEPTANCE_AUDIT_REVIEW_OUTPUT_ARTIFACT_ID])
		expect(artifact.id).to.equal(ACCEPTANCE_AUDIT_REVIEW_OUTPUT_ARTIFACT_ID)
		expect(artifact.family).to.equal(WorkflowArtifactFamily.AcceptanceAuditOutput)
		expect(artifact.intentMode).to.equal("derived")
		expect(artifact.parentIdentitySource).to.equal(undefined)
		expect(artifact.targetIdentitySource).to.deep.equal({
			kind: "workflow_value",
			key: AcceptanceAuditReviewWorkflowValueKey.SelectedStoryIdentity,
		})
		expect(artifact.outputValueKeys).to.deep.equal({
			projectTitle: AcceptanceAuditReviewWorkflowValueKey.ProjectTitle,
			projectFolderName: AcceptanceAuditReviewWorkflowValueKey.ProjectFolderName,
			artifactFamily: AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutputArtifactFamily,
			artifactIdentity: AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutputArtifactIdentity,
			artifactFilename: AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutputArtifactFilename,
			artifactRelativePath: AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutputArtifactRelativePath,
			artifactAbsolutePath: AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutput,
			parentIdentity: undefined,
			targetIdentity: AcceptanceAuditReviewWorkflowValueKey.AcceptanceAuditOutputArtifactIdentity,
		})
	})

	it("defines the Step 1 commit form Panel A", () => {
		const form = getWorkflowForm(ACCEPTANCE_AUDIT_REVIEW_STEP_1_FORM_ID)
		expect(form).to.deep.equal(buildAcceptanceAuditReviewStep1WorkflowForm())
		expect(form.firstPanelId).to.equal(ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)

		const panel = getPanel(form, ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)
		expect(panel.title).to.equal("Identify Implementation Evidence")
		expect(panel.promptMarkdown).to.equal("Provide the commit hash for the target story's commit.")
		expect(panel.allowedActions).to.deep.equal(["submit"])
		expect(panel.actionLabels).to.deep.equal({ submit: "submit" })
		expect(panel.transition).to.deep.equal({ type: "runtime_routed" })
		expect(getSingleField(panel)).to.deep.include({
			key: ACCEPTANCE_AUDIT_REVIEW_COMMIT_HASH_FIELD_KEY,
			kind: "small_text",
			label: "commit hash",
			required: true,
			allowedValueType: "string",
		})
	})

	it("defines the Step 1 invalid commit Panel B", () => {
		const panel = getPanel(
			getWorkflowForm(ACCEPTANCE_AUDIT_REVIEW_STEP_1_FORM_ID),
			ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
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
		expect(panel.backDestinationPanelId).to.equal(ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)
	})

	it("declares exact step labels", () => {
		expect(getStep("step-1").checklistLabel).to.equal("Gather Inputs & Generate Output File")
		expect(getStep("step-2").checklistLabel).to.equal("Conduct Acceptance Audit")
	})

	it("declares empty Step 1 model-facing tools", () => {
		expect(getToolNamesForStep("step-1")).to.deep.equal([])
	})

	it("declares exact Step 2 model-facing tools", () => {
		expect(getToolNamesForStep("step-2")).to.deep.equal(STEP_2_TOOL_NAMES)
	})

	it("does not expose forbidden model-facing tools", () => {
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
			"step-1-validate-inherited-review-evidence",
			"step-1-validate-existing-review-evidence",
			"step-1-resolve-target-story",
		])
	})

	it("routes missing inherited review evidence to deterministic failure", () => {
		const route = findRoute("step-1", "step-1-route-by-existing-values", "step-1-fail-missing-inherited-review-evidence")

		expectSessionPredicateMatches({ stepId: "step-1", route, workflowValues: {} })
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		expect(route.action.instruction.run).to.equal(validateInheritedAcceptanceAuditReviewEvidence)
	})

	it("routes complete inherited review evidence and selected story identity directly to output allocation after validation", () => {
		const route = findRoute("step-1", "step-1-route-by-existing-values", "step-1-validate-inherited-review-evidence")

		expectSessionPredicateMatches({ stepId: "step-1", route, workflowValues: SAMPLE_WORKFLOW_VALUES })
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		expect(route.action.instruction.run).to.equal(validateInheritedAcceptanceAuditReviewEvidence)
		expect(route.followingBranchId).to.equal("step-1-allocate-acceptance-audit-output")
	})

	it("routes complete existing project values and review evidence directly to output allocation after validation", () => {
		const route = findRoute("step-1", "step-1-route-by-existing-values", "step-1-validate-existing-review-evidence")
		const workflowValues: WorkflowValues = {
			...SAMPLE_WORKFLOW_VALUES,
			[AcceptanceAuditReviewWorkflowValueKey.ProjectMode]: "existing",
			[AcceptanceAuditReviewWorkflowValueKey.ProjectTitle]: "Test Project",
			[AcceptanceAuditReviewWorkflowValueKey.ProjectFolderName]: "test-project",
		}

		expectSessionPredicateMatches({ stepId: "step-1", route, workflowValues })
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		expect(route.action.instruction.run).to.equal(validateInheritedAcceptanceAuditReviewEvidence)
		expect(route.followingBranchId).to.equal("step-1-allocate-acceptance-audit-output")
	})

	it("routes main-agent entry project values with missing evidence to prerequisite resolution", () => {
		const route = findRoute("step-1", "step-1-route-by-existing-values", "step-1-resolve-target-story")

		expectSessionPredicateMatches({
			stepId: "step-1",
			route,
			workflowValues: {
				[AcceptanceAuditReviewWorkflowValueKey.ProjectMode]: "existing",
				[AcceptanceAuditReviewWorkflowValueKey.ProjectTitle]: "Test Project",
				[AcceptanceAuditReviewWorkflowValueKey.ProjectFolderName]: "test-project",
			},
		})
		expect(route.action).to.deep.equal({
			kind: "resolve_prerequisite_files",
			prerequisiteIds: [ACCEPTANCE_AUDIT_REVIEW_TARGET_STORY_PREREQUISITE_ID],
		})
	})

	it("routes Step 1 target-story derivation for main-agent activation", () => {
		const route = findRoute("step-1", "step-1-derive-target-story-values", "step-1-derive-target-story-values")

		expect(route.trigger).to.deep.equal({ kind: "always" })
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		expect(route.action.instruction.run).to.equal(deriveAcceptanceAuditReviewTargetStoryValues)
		expect(route.followingBranchId).to.equal("step-1-render-commit-hash-panel")
	})

	it("trusts inherited selected_story_identity and does not declare child-path selected-story derivation", () => {
		expect(acceptanceAuditReviewWorkflowDefinition.childInheritance).to.deep.include({
			parentKey: "selected_story_identity",
			childKey: "selected_story_identity",
		})
		expect(getStep("step-1").decisionTree.branches["step-1-derive-existing-target-story-values"]).to.equal(undefined)
	})

	it("routes Step 1 commit form rendering", () => {
		const route = findRoute("step-1", "step-1-render-commit-hash-panel", "step-1-render-commit-hash-panel")

		expect(route.trigger).to.deep.equal({ kind: "always" })
		if (route.action.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${route.action.kind}.`)
		}
		expect(route.action.workflowFormId).to.equal(ACCEPTANCE_AUDIT_REVIEW_STEP_1_FORM_ID)
		if ("startPanelId" in route.action === false) {
			throw new Error("Expected Step 1 commit panel render action to declare startPanelId.")
		}
		expect(route.action.startPanelId).to.equal(ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID)
		expect(route.followingBranchId).to.equal("step-1-await-commit-form-panel")
	})

	it("routes Panel A submission to commit validation", () => {
		const route = findRoute("step-1", "step-1-await-commit-form-panel", "step-1-validate-commit-hash")

		expectEventPredicateMatches({
			stepId: "step-1",
			route,
			workflowValues: {},
			triggerEvent: buildWorkflowFormPanelSubmittedEvent(ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID),
		})
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		expect(route.action.instruction.run).to.equal(validateAndPersistAcceptanceAuditReviewCommit)
		expect(route.followingBranchId).to.equal("step-1-route-after-commit-validation")
	})

	it("routes valid commit metadata to review-scope artifact allocation", () => {
		const route = findRoute("step-1", "step-1-route-after-commit-validation", "step-1-allocate-review-scope-manifest")

		expectSessionPredicateMatches({
			stepId: "step-1",
			route,
			workflowValues: {
				[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash]: "abc123",
				[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent]: "def456",
			},
		})
		expect(route.action).to.deep.equal({
			kind: "allocate_artifact",
			artifactId: ACCEPTANCE_AUDIT_REVIEW_REVIEW_SCOPE_MANIFEST_ARTIFACT_ID,
		})
		expect(route.followingBranchId).to.equal("step-1-await-review-scope-manifest-allocation")
	})

	it("routes invalid commit metadata to Panel B continuation", async () => {
		const route = findRoute("step-1", "step-1-route-after-commit-validation", "step-1-continue-to-invalid-commit-panel")

		expectSessionPredicateMatches({ stepId: "step-1", route, workflowValues: {} })
		if (route.action.kind !== "continue_workflow_form") {
			throw new Error(`Expected continue_workflow_form, received ${route.action.kind}.`)
		}
		expect(route.action.workflowFormId).to.equal(ACCEPTANCE_AUDIT_REVIEW_STEP_1_FORM_ID)
		expect(route.action.panelId).to.equal(ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID)
		expect(route.followingBranchId).to.equal("step-1-await-commit-form-panel")
		expect(await Promise.resolve(route.action.buildReplacement(createSession({})))).to.deep.equal({
			panel: getPanel(
				buildAcceptanceAuditReviewStep1WorkflowForm(),
				ACCEPTANCE_AUDIT_REVIEW_STEP_1_PANEL_B_INVALID_COMMIT_ID,
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

	it("routes review-scope artifact allocation failure to terminal procedure", () => {
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
		expect(route.action.instruction.run).to.equal(failAcceptanceAuditReviewScopeManifestArtifactAllocation)
	})

	it("routes review-scope manifest build", () => {
		const route = findRoute("step-1", "step-1-build-review-scope-manifest", "step-1-build-review-scope-manifest")

		expect(route.trigger).to.deep.equal({ kind: "always" })
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		expect(route.action.instruction.run).to.equal(buildAndPersistAcceptanceAuditReviewScopeManifest)
		expect(route.followingBranchId).to.equal("step-1-allocate-acceptance-audit-output")
	})

	it("routes acceptance-audit output allocation and success transition", () => {
		const allocationRoute = findRoute(
			"step-1",
			"step-1-allocate-acceptance-audit-output",
			"step-1-allocate-acceptance-audit-output",
		)
		const successRoute = findRoute("step-1", "step-1-await-acceptance-audit-output-allocation", "step-1-transition-to-step-2")

		expect(allocationRoute.action).to.deep.equal({
			kind: "allocate_artifact",
			artifactId: ACCEPTANCE_AUDIT_REVIEW_OUTPUT_ARTIFACT_ID,
		})
		expectEventPredicateMatches({
			stepId: "step-1",
			route: successRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-1-allocate-acceptance-audit-output",
				"step-1-allocate-acceptance-audit-output",
			),
		})
		expectTransitionStepAction(successRoute.action, 2)
	})

	it("routes acceptance-audit output allocation failure to terminal procedure", () => {
		const route = findRoute(
			"step-1",
			"step-1-await-acceptance-audit-output-allocation",
			"step-1-fail-after-acceptance-audit-output-allocation",
		)

		expectEventPredicateMatches({
			stepId: "step-1",
			route,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationFailedEvent(
				"step-1-allocate-acceptance-audit-output",
				"step-1-allocate-acceptance-audit-output",
			),
		})
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		expect(route.action.instruction.run).to.equal(failAcceptanceAuditReviewOutputArtifactAllocation)
	})

	it("derives selected story and project document workflow values", async () => {
		const { root, targetStory, epicsDocument, architectureDocument } = await createTemporaryGitProject()
		try {
			const result = expectSucceeded(
				await deriveAcceptanceAuditReviewTargetStoryValues(
					createSession({ [AcceptanceAuditReviewWorkflowValueKey.TargetStory]: targetStory }, root),
				),
			)

			expect(result.workflowValueWrites).to.deep.equal({
				[AcceptanceAuditReviewWorkflowValueKey.SelectedStoryIdentity]: "1.1",
				[AcceptanceAuditReviewWorkflowValueKey.EpicsDocument]: epicsDocument,
				[AcceptanceAuditReviewWorkflowValueKey.ArchitectureDocument]: architectureDocument,
			})
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})

	it("fails target-story derivation when Epics.md is missing", async () => {
		const { root, targetStory, epicsDocument } = await createTemporaryGitProject()
		try {
			await rm(epicsDocument, { force: true })
			const result = await deriveAcceptanceAuditReviewTargetStoryValues(
				createSession({ [AcceptanceAuditReviewWorkflowValueKey.TargetStory]: targetStory }, root),
			)

			expect(result.kind).to.equal("failed")
			if (result.kind !== "failed") {
				throw new Error("Expected target-story derivation to fail.")
			}
			expect(result.errorMessage).to.include("planning/Epics.md")
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})

	it("fails target-story derivation when architecture.md is missing", async () => {
		const { root, targetStory, architectureDocument } = await createTemporaryGitProject()
		try {
			await rm(architectureDocument, { force: true })
			const result = await deriveAcceptanceAuditReviewTargetStoryValues(
				createSession({ [AcceptanceAuditReviewWorkflowValueKey.TargetStory]: targetStory }, root),
			)

			expect(result.kind).to.equal("failed")
			if (result.kind !== "failed") {
				throw new Error("Expected target-story derivation to fail.")
			}
			expect(result.errorMessage).to.include("planning/architecture.md")
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})

	it("validates and persists normalized commit metadata", async () => {
		const { root, targetStory, firstCommitHash, secondCommitHash } = await createTemporaryGitProject()
		try {
			const result = expectSucceeded(
				await validateAndPersistAcceptanceAuditReviewCommit(
					createSession(
						{ [AcceptanceAuditReviewWorkflowValueKey.TargetStory]: targetStory },
						root,
						{ activeBranchId: "step-1-await-commit-form-panel" },
						buildCommitFormSession(secondCommitHash),
					),
				),
			)

			expect(result.workflowValueWrites).to.deep.equal({
				[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash]: secondCommitHash,
				[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent]: firstCommitHash,
			})
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})

	it("succeeds without commit writes for invalid commit input", async () => {
		const { root, targetStory } = await createTemporaryGitProject()
		try {
			expectSucceededWithoutCommitWrites(
				await validateAndPersistAcceptanceAuditReviewCommit(
					createSession(
						{ [AcceptanceAuditReviewWorkflowValueKey.TargetStory]: targetStory },
						root,
						{ activeBranchId: "step-1-await-commit-form-panel" },
						buildCommitFormSession("not-a-commit"),
					),
				),
			)
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})

	it("succeeds without commit writes when parent hash cannot be resolved", async () => {
		const { root, targetStory, firstCommitHash } = await createTemporaryGitProject()
		try {
			expectSucceededWithoutCommitWrites(
				await validateAndPersistAcceptanceAuditReviewCommit(
					createSession(
						{ [AcceptanceAuditReviewWorkflowValueKey.TargetStory]: targetStory },
						root,
						{ activeBranchId: "step-1-await-commit-form-panel" },
						buildCommitFormSession(firstCommitHash),
					),
				),
			)
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})

	it("succeeds without commit writes when target project is not a git work tree", async () => {
		const root = await mkdtemp(join(tmpdir(), "acceptance-audit-review-non-git-"))
		const storiesFolder = join(root, "implementation", "stories-review")
		const targetStory = join(storiesFolder, "Story-1-1.md")
		try {
			await mkdir(storiesFolder, { recursive: true })
			await writeFile(targetStory, "# Story\n", "utf8")
			expectSucceededWithoutCommitWrites(
				await validateAndPersistAcceptanceAuditReviewCommit(
					createSession(
						{ [AcceptanceAuditReviewWorkflowValueKey.TargetStory]: targetStory },
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

	it("persists review-scope manifest source metadata and heading order", async () => {
		const { root, targetStory, firstCommitHash, secondCommitHash } = await createTemporaryGitProject()
		try {
			const manifestPath = join(root, "review", "review-scope-1-1.md")
			expectSucceeded(
				await buildAndPersistAcceptanceAuditReviewScopeManifest(
					createSession(
						{
							...SAMPLE_WORKFLOW_VALUES,
							[AcceptanceAuditReviewWorkflowValueKey.TargetStory]: targetStory,
							[AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest]: manifestPath,
							[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash]: secondCommitHash,
							[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent]: firstCommitHash,
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
			const headingIndexes = headings.map((heading) => manifest.indexOf(heading))
			for (const headingIndex of headingIndexes) {
				expect(headingIndex).to.be.greaterThanOrEqual(0)
			}
			for (let index = 1; index < headingIndexes.length; index += 1) {
				expect(headingIndexes[index]).to.be.greaterThan(headingIndexes[index - 1])
			}
			expect(manifest).to.include(`Commit: ${secondCommitHash}`)
			expect(manifest).to.include(`Parent: ${firstCommitHash}`)
			expect(manifest).to.include(`Story: ${targetStory}`)
			expect(manifest).to.include(`Generated from: git show --name-status --numstat ${secondCommitHash}`)
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})

	it("persists review-scope changed-file table and allowed-file comparison", async () => {
		const { root, targetStory, firstCommitHash, secondCommitHash } = await createTemporaryGitProject()
		try {
			const manifestPath = join(root, "review", "review-scope-1-1.md")
			expectSucceeded(
				await buildAndPersistAcceptanceAuditReviewScopeManifest(
					createSession(
						{
							...SAMPLE_WORKFLOW_VALUES,
							[AcceptanceAuditReviewWorkflowValueKey.TargetStory]: targetStory,
							[AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest]: manifestPath,
							[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash]: secondCommitHash,
							[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent]: firstCommitHash,
						},
						root,
					),
				),
			)
			const manifest = await readFile(manifestPath, "utf8")

			expect(manifest).to.include("| Status | Path | Additions | Deletions |")
			expect(manifest).to.include("allowed_and_touched: src/allowed.ts")
			expect(manifest).to.include("allowed_and_touched: src/deleted.ts")
			expect(manifest).to.include("touched_outside_allowed_files: src/new-outside.ts")
			expect(manifest).to.include("allowed_not_touched: src/renamed.ts")
			expect(manifest).to.include("allowed_not_touched: src/untouched.ts")
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})

	it("persists review-scope task guidance and targeted review commands", async () => {
		const { root, targetStory, firstCommitHash, secondCommitHash } = await createTemporaryGitProject()
		try {
			const manifestPath = join(root, "review", "review-scope-1-1.md")
			expectSucceeded(
				await buildAndPersistAcceptanceAuditReviewScopeManifest(
					createSession(
						{
							...SAMPLE_WORKFLOW_VALUES,
							[AcceptanceAuditReviewWorkflowValueKey.TargetStory]: targetStory,
							[AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest]: manifestPath,
							[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash]: secondCommitHash,
							[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent]: firstCommitHash,
						},
						root,
					),
				),
			)
			const manifest = await readFile(manifestPath, "utf8")

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
		const result = await buildAndPersistAcceptanceAuditReviewScopeManifest(createSession({}))

		expect(result.kind).to.equal("failed")
		if (result.kind !== "failed") {
			throw new Error("Expected review-scope manifest build to fail.")
		}
		expect(result.errorMessage).to.include(
			"target_story, review_scope_manifest, review_commit_hash, and review_commit_parent",
		)
	})

	it("fails review-scope manifest build when target_story cannot resolve project root", async () => {
		const { root, firstCommitHash, secondCommitHash } = await createTemporaryGitProject()
		try {
			const result = await buildAndPersistAcceptanceAuditReviewScopeManifest(
				createSession(
					{
						...SAMPLE_WORKFLOW_VALUES,
						[AcceptanceAuditReviewWorkflowValueKey.TargetStory]: join(root, "Story-1-1.md"),
						[AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest]: join(root, "review", "review-scope-1-1.md"),
						[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash]: secondCommitHash,
						[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent]: firstCommitHash,
					},
					root,
				),
			)

			expect(result.kind).to.equal("failed")
			if (result.kind !== "failed") {
				throw new Error("Expected review-scope manifest build to fail.")
			}
			expect(result.errorMessage).to.include("must remain under implementation/stories-review")
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})

	it("fails review-scope manifest build when git backend rejects review_commit_hash", async () => {
		const { root, targetStory, firstCommitHash } = await createTemporaryGitProject()
		try {
			const manifestPath = join(root, "review", "review-scope-1-1.md")
			const result = await buildAndPersistAcceptanceAuditReviewScopeManifest(
				createSession(
					{
						...SAMPLE_WORKFLOW_VALUES,
						[AcceptanceAuditReviewWorkflowValueKey.TargetStory]: targetStory,
						[AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest]: manifestPath,
						[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash]: "not-a-commit",
						[AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent]: firstCommitHash,
					},
					root,
				),
			)

			expect(result.kind).to.equal("failed")
			if (result.kind !== "failed") {
				throw new Error("Expected review-scope manifest build to fail.")
			}
			expect(result.errorMessage).to.include(
				"Acceptance Audit Review review-scope preparation failed during git show --name-status",
			)
			expect(result.errorMessage).to.include("not-a-commit")
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})

	it("reports exact backend reason for review-scope manifest artifact allocation failure", () => {
		const result = failAcceptanceAuditReviewScopeManifestArtifactAllocation(
			createSession(SAMPLE_WORKFLOW_VALUES, PROJECT_ROOT, {
				activeBranchId: "step-1-await-review-scope-manifest-allocation",
				failureState: {
					retryAttemptCount: 1,
					terminalErrorMessage: "artifact backend denied write",
				},
			}),
		)

		expect(result).to.deep.equal({
			kind: "failed",
			errorMessage: `Acceptance Audit Review review-scope manifest artifact creation failed for target_story ${TARGET_STORY_PATH}: artifact backend denied write`,
		})
	})

	it("reports exact backend reason for acceptance-audit output artifact allocation failure", () => {
		const result = failAcceptanceAuditReviewOutputArtifactAllocation(
			createSession(SAMPLE_WORKFLOW_VALUES, PROJECT_ROOT, {
				activeBranchId: "step-1-await-acceptance-audit-output-allocation",
				failureState: {
					retryAttemptCount: 1,
					terminalErrorMessage: "artifact backend denied write",
				},
			}),
		)

		expect(result).to.deep.equal({
			kind: "failed",
			errorMessage: `Acceptance Audit Review output artifact creation failed for target_story ${TARGET_STORY_PATH}: artifact backend denied write`,
		})
	})

	it("validates complete inherited review evidence", () => {
		expectSucceeded(validateInheritedAcceptanceAuditReviewEvidence(createSession(SAMPLE_WORKFLOW_VALUES)))
	})

	it("fails inherited evidence validation when target_story is missing", () => {
		const result = validateInheritedAcceptanceAuditReviewEvidence(
			createSession({ ...SAMPLE_WORKFLOW_VALUES, [AcceptanceAuditReviewWorkflowValueKey.TargetStory]: "" }),
		)

		expect(result.kind).to.equal("failed")
		if (result.kind !== "failed") {
			throw new Error("Expected inherited evidence validation to fail.")
		}
		expect(result.errorMessage).to.include("target_story")
	})

	it("fails inherited evidence validation when selected_story_identity is missing", () => {
		const result = validateInheritedAcceptanceAuditReviewEvidence(
			createSession({ ...SAMPLE_WORKFLOW_VALUES, [AcceptanceAuditReviewWorkflowValueKey.SelectedStoryIdentity]: "" }),
		)

		expect(result.kind).to.equal("failed")
		if (result.kind !== "failed") {
			throw new Error("Expected inherited evidence validation to fail.")
		}
		expect(result.errorMessage).to.include("selected_story_identity")
	})

	it("fails inherited evidence validation when review_commit_hash is missing", () => {
		const result = validateInheritedAcceptanceAuditReviewEvidence(
			createSession({ ...SAMPLE_WORKFLOW_VALUES, [AcceptanceAuditReviewWorkflowValueKey.ReviewCommitHash]: "" }),
		)

		expect(result.kind).to.equal("failed")
		if (result.kind !== "failed") {
			throw new Error("Expected inherited evidence validation to fail.")
		}
		expect(result.errorMessage).to.include("review_commit_hash")
	})

	it("fails inherited evidence validation when review_commit_parent is missing", () => {
		const result = validateInheritedAcceptanceAuditReviewEvidence(
			createSession({ ...SAMPLE_WORKFLOW_VALUES, [AcceptanceAuditReviewWorkflowValueKey.ReviewCommitParent]: "" }),
		)

		expect(result.kind).to.equal("failed")
		if (result.kind !== "failed") {
			throw new Error("Expected inherited evidence validation to fail.")
		}
		expect(result.errorMessage).to.include("review_commit_parent")
	})

	it("fails inherited evidence validation when epics_document is missing", () => {
		const result = validateInheritedAcceptanceAuditReviewEvidence(
			createSession({ ...SAMPLE_WORKFLOW_VALUES, [AcceptanceAuditReviewWorkflowValueKey.EpicsDocument]: "" }),
		)

		expect(result.kind).to.equal("failed")
		if (result.kind !== "failed") {
			throw new Error("Expected inherited evidence validation to fail.")
		}
		expect(result.errorMessage).to.include("epics_document")
	})

	it("fails inherited evidence validation when architecture_document is missing", () => {
		const result = validateInheritedAcceptanceAuditReviewEvidence(
			createSession({ ...SAMPLE_WORKFLOW_VALUES, [AcceptanceAuditReviewWorkflowValueKey.ArchitectureDocument]: "" }),
		)

		expect(result.kind).to.equal("failed")
		if (result.kind !== "failed") {
			throw new Error("Expected inherited evidence validation to fail.")
		}
		expect(result.errorMessage).to.include("architecture_document")
	})

	it("fails inherited evidence validation when review_scope_manifest is invalid", () => {
		const result = validateInheritedAcceptanceAuditReviewEvidence(
			createSession({ ...SAMPLE_WORKFLOW_VALUES, [AcceptanceAuditReviewWorkflowValueKey.ReviewScopeManifest]: "" }),
		)

		expect(result.kind).to.equal("failed")
		if (result.kind !== "failed") {
			throw new Error("Expected inherited evidence validation to fail.")
		}
		expect(result.errorMessage).to.include("review_scope_manifest")
	})

	it("materializes the Step 2 prompt without leaking workflow placeholders", () => {
		const prompt = buildPrompt("step-2", SAMPLE_WORKFLOW_VALUES)

		expect(prompt).to.include(TARGET_STORY_PATH)
		expect(prompt).to.include(EPICS_DOCUMENT_PATH)
		expect(prompt).to.include(ARCHITECTURE_DOCUMENT_PATH)
		expect(prompt).to.include(REVIEW_SCOPE_MANIFEST_PATH)
		expect(prompt).to.include("abc123")
		expect(prompt).to.include("def456")
		expect(prompt).to.include(ACCEPTANCE_AUDIT_OUTPUT_PATH)

		const rawPlaceholders: readonly string[] = [
			"{workflow.target_story}",
			"{workflow.epics_document}",
			"{workflow.architecture_document}",
			"{workflow.review_scope_manifest}",
			"{workflow.review_commit_hash}",
			"{workflow.review_commit_parent}",
			"{workflow.acceptance_audit_output}",
		]
		for (const rawPlaceholder of rawPlaceholders) {
			expect(prompt).not.to.include(rawPlaceholder)
		}
	})

	it("routes Step 2 completion through attempt_completion", () => {
		const route = findRoute("step-2", "step-2-await-attempt-completion", "step-2-complete-workflow")

		expect(buildAttemptCompletionSucceededEvent()).to.deep.equal({ kind: "attempt_completion_succeeded" })
		expect(route.trigger).to.deep.equal({ kind: "on_event", eventKind: "attempt_completion_succeeded" })
		expect(route.action).to.deep.equal({ kind: "complete_workflow" })
	})

	it("does not mutate story status or parent workflow state on completion", () => {
		const route = findRoute("step-2", "step-2-await-attempt-completion", "step-2-complete-workflow")
		const forbiddenActionKinds: readonly WorkflowDecisionAction["kind"][] = [
			"update_story_index_status",
			"move_project_file",
			"allocate_artifact",
			"execute_tool_backed_operation",
		]

		expect(route.action).to.deep.equal({ kind: "complete_workflow" })
		for (const branch of Object.values(getStep("step-2").decisionTree.branches)) {
			for (const candidateRoute of branch.routes) {
				expect(forbiddenActionKinds).not.to.include(candidateRoute.action.kind)
			}
		}
	})

	it("does not declare legacy review workflow dependencies", () => {
		expect(acceptanceAuditReviewWorkflowDefinition.name).not.to.include(".md")
		expect(acceptanceAuditReviewWorkflowDefinition.slashCommandName).not.to.include(".md")
		expect(acceptanceAuditReviewWorkflowDefinition.useSkillName).not.to.include(".md")

		const retiredWorkflowValues: readonly string[] = [
			"workflow_state",
			"managed_workflow_state",
			"placeholder_workflow_state",
		]
		for (const retiredWorkflowValue of retiredWorkflowValues) {
			expect(acceptanceAuditReviewWorkflowDefinition.workflowValueKeys).not.to.include(retiredWorkflowValue)
		}

		const toolNames = [...getToolNamesForStep("step-1"), ...getToolNamesForStep("step-2")]
		const retiredToolNames: readonly string[] = [
			"build_review_input",
			"build_review_diff_output",
			"code_review_spec_update",
			"record_findings",
		]
		for (const retiredToolName of retiredToolNames) {
			expect(toolNames).not.to.include(retiredToolName)
		}
	})
})
