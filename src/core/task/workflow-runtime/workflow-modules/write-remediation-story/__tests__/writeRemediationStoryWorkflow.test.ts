import { basename } from "node:path"
import type {
	WorkflowFormDefinitionPayload,
	WorkflowFormFieldDefinition,
	WorkflowFormPanelDefinition,
} from "@shared/ExtensionMessage"
import { expect } from "chai"
import { describe, it } from "mocha"
import {
	resolveWorkflowBySlashCommand,
	resolveWorkflowByUseSkillName,
	resolveWorkflowDefinition,
} from "@/core/task/workflow-runtime/WorkflowRegistry"
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
} from "../../../types"
import { renderWorkflowPromptTemplate } from "../../../workflowPromptTemplates"
import {
	buildWriteRemediationStoryStep1ToolSchemas,
	buildWriteRemediationStoryStep1WorkflowForm,
	buildWriteRemediationStoryStep2ToolSchemas,
	buildWriteRemediationStoryStep3ToolSchemas,
	buildWriteRemediationStoryStep4ToolSchemas,
	failWithToolBackedOperationReason,
	validateAndPersistWriteRemediationStoryInputValues,
	WRITE_REMEDIATION_STORY_CODE_REVIEW_OUTPUT_PREREQUISITE_ID,
	WRITE_REMEDIATION_STORY_ENTRY_PROJECT_VALUE_KEYS,
	WRITE_REMEDIATION_STORY_INCOMPATIBLE_FILES_TERMINAL_ERROR,
	WRITE_REMEDIATION_STORY_INDEX_MISSING_OR_MALFORMED_TERMINAL_ERROR,
	WRITE_REMEDIATION_STORY_MALFORMED_REMEDIATION_ENTRY_TERMINAL_ERROR,
	WRITE_REMEDIATION_STORY_MISSING_REMEDIATION_ENTRY_TERMINAL_ERROR,
	WRITE_REMEDIATION_STORY_ORIGINATING_STORY_MISSING_TERMINAL_ERROR,
	WRITE_REMEDIATION_STORY_PANEL_A_INCOMPATIBLE_FILES_ID,
	WRITE_REMEDIATION_STORY_PANEL_B_REPLACE_STORY_ID,
	WRITE_REMEDIATION_STORY_PANEL_C_REPLACE_FINDINGS_ID,
	WRITE_REMEDIATION_STORY_PREREQUISITE_FILES,
	WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_FIELD_KEY,
	WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_REMEDIATION_STORY,
	WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_REVIEW_FINDINGS,
	WRITE_REMEDIATION_STORY_STEP_1_FORM_ID,
	WRITE_REMEDIATION_STORY_TARGET_STORY_PREREQUISITE_ID,
	WRITE_REMEDIATION_STORY_WORKFLOW_DESCRIPTION,
	WRITE_REMEDIATION_STORY_WORKFLOW_DISPLAY_NAME,
	WRITE_REMEDIATION_STORY_WORKFLOW_NAME,
	WRITE_REMEDIATION_STORY_WORKFLOW_PERSONA,
	WRITE_REMEDIATION_STORY_WORKFLOW_PROJECT_SUBFOLDER,
	WRITE_REMEDIATION_STORY_WORKFLOW_SLASH_COMMAND_NAME,
	WRITE_REMEDIATION_STORY_WORKFLOW_USE_SKILL_NAME,
	WRITE_REMEDIATION_STORY_WORKFLOW_VALUE_KEYS,
	WriteRemediationStoryWorkflowValueKey,
	writeRemediationStoryWorkflowDefinition,
} from ".."

const PROJECT_ROOT = "/tmp/write-remediation-story-project"
const CODE_REVIEW_OUTPUT_PATH = `${PROJECT_ROOT}/review/code-review-1-1.md`
const TARGET_STORY_PATH = `${PROJECT_ROOT}/implementation/drafts/Remediation-story-1-1-1.md`
const ORIGINATING_STORY_PATH = `${PROJECT_ROOT}/implementation/stories-complete/Story-1-1.md`
const STORIES_INDEX_PATH = `${PROJECT_ROOT}/implementation/epic-1-stories.index.json`

const SAMPLE_WORKFLOW_VALUES: WorkflowValues = {
	[WriteRemediationStoryWorkflowValueKey.ProjectMode]: "existing",
	[WriteRemediationStoryWorkflowValueKey.ProjectTitle]: "Write Remediation Story Session",
	[WriteRemediationStoryWorkflowValueKey.ProjectFolderName]: "write-remediation-story-project",
	[WriteRemediationStoryWorkflowValueKey.CodeReviewOutput]: CODE_REVIEW_OUTPUT_PATH,
	[WriteRemediationStoryWorkflowValueKey.TargetStory]: TARGET_STORY_PATH,
	[WriteRemediationStoryWorkflowValueKey.TargetStoryFilename]: "Remediation-story-1-1-1.md",
	[WriteRemediationStoryWorkflowValueKey.SelectedStoryIdentity]: "1.1.1",
	[WriteRemediationStoryWorkflowValueKey.OriginatingStory]: ORIGINATING_STORY_PATH,
	[WriteRemediationStoryWorkflowValueKey.OriginatingStoryIdentity]: "1.1",
	[WriteRemediationStoryWorkflowValueKey.EpicIdentity]: "1",
	[WriteRemediationStoryWorkflowValueKey.StoriesIndex]: STORIES_INDEX_PATH,
}

const STEP_3_TOOL_NAMES: readonly string[] = [
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
	"update_story_index_status",
	"workflow_progress_request",
	"use_mcp_tool",
	"access_mcp_resource",
	"load_mcp_documentation",
	"plan_story_artifacts",
	"plan_remediation_story_artifact",
	"generate_story_files",
	"build_review_input",
	"build_review_diff_output",
	"code_review_spec_update",
	"record_findings",
]

function createSession(
	workflowValues: WorkflowValues,
	projectRoot = PROJECT_ROOT,
	branchContext: ActiveWorkflowSession["branchContext"] = { activeBranchId: "step-1-resolve-prerequisites" },
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
	const step = writeRemediationStoryWorkflowDefinition.steps[stepId]
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
	const form = writeRemediationStoryWorkflowDefinition.workflowForms?.[workflowFormId]
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
		step: getStep(stepId),
		session: createSession(workflowValues),
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
		workflowValueKeys: writeRemediationStoryWorkflowDefinition.workflowValueKeys,
		workflowValues,
		context: `write-remediation-story ${stepId} test prompt`,
	})
}

function getToolNamesForStep(stepId: WorkflowStepDefinition["id"]): readonly string[] {
	return getStep(stepId)
		.buildToolSchema(createPromptInput(stepId, {}))
		.map((schema) => schema.name)
}

function buildWorkflowFormPanelSubmittedEvent(panelId: string, action: "submit" | "back" = "submit"): WorkflowBranchTriggerEvent {
	return {
		kind: "workflow_form_panel_submitted",
		workflowFormId: WRITE_REMEDIATION_STORY_STEP_1_FORM_ID,
		panelId,
		action,
		submittedValueKeys: [],
		clearedValueKeys: [],
	}
}

function buildToolBackedOperationSucceededEvent(branchId: string, routeId: string): WorkflowBranchTriggerEvent {
	return { kind: "tool_backed_operation_succeeded", sourceRoute: { branchId, routeId } }
}

function buildToolBackedOperationFailedEvent(branchId: string, routeId: string): WorkflowBranchTriggerEvent {
	return {
		kind: "tool_backed_operation_failed",
		sourceRoute: { branchId, routeId },
		errorMessage: "backend failure",
	}
}

function buildAttemptCompletionSucceededEvent(): WorkflowBranchTriggerEvent {
	return { kind: "attempt_completion_succeeded" }
}

function expectTransitionStepAction(
	action: WorkflowDecisionAction,
): Extract<WorkflowDecisionAction, { kind: "transition_step" }> {
	if (action.kind !== "transition_step") {
		throw new Error(`Expected transition_step action, received ${action.kind}.`)
	}

	return action
}

function expectResolveExistingProjectArtifactAction(
	action: WorkflowDecisionAction,
): Extract<WorkflowDecisionAction, { kind: "resolve_existing_project_artifact" }> {
	if (action.kind !== "resolve_existing_project_artifact") {
		throw new Error(`Expected resolve_existing_project_artifact action, received ${action.kind}.`)
	}

	return action
}

function expectValidateStoryIndexEntryAction(
	action: WorkflowDecisionAction,
): Extract<WorkflowDecisionAction, { kind: "validate_story_index_entry" }> {
	if (action.kind !== "validate_story_index_entry") {
		throw new Error(`Expected validate_story_index_entry action, received ${action.kind}.`)
	}

	return action
}

function expectSucceeded(
	result: WorkflowDeterministicProcedureResult,
): Extract<WorkflowDeterministicProcedureResult, { kind: "succeeded" }> {
	if (result.kind !== "succeeded") {
		throw new Error(result.errorMessage)
	}

	return result
}

function expectFailed(
	result: WorkflowDeterministicProcedureResult,
): Extract<WorkflowDeterministicProcedureResult, { kind: "failed" }> {
	if (result.kind !== "failed") {
		throw new Error("Expected deterministic procedure to fail.")
	}

	return result
}

describe("writeRemediationStoryWorkflow", () => {
	it("declares canonical workflow identity", () => {
		expect(writeRemediationStoryWorkflowDefinition.name).to.equal(WRITE_REMEDIATION_STORY_WORKFLOW_NAME)
		expect(writeRemediationStoryWorkflowDefinition.slashCommandName).to.equal(
			WRITE_REMEDIATION_STORY_WORKFLOW_SLASH_COMMAND_NAME,
		)
		expect(writeRemediationStoryWorkflowDefinition.useSkillName).to.equal(WRITE_REMEDIATION_STORY_WORKFLOW_USE_SKILL_NAME)
		expect(writeRemediationStoryWorkflowDefinition.displayName).to.equal(WRITE_REMEDIATION_STORY_WORKFLOW_DISPLAY_NAME)
		expect(writeRemediationStoryWorkflowDefinition.description).to.equal(WRITE_REMEDIATION_STORY_WORKFLOW_DESCRIPTION)
		expect(writeRemediationStoryWorkflowDefinition.projectSubfolder).to.equal(
			WRITE_REMEDIATION_STORY_WORKFLOW_PROJECT_SUBFOLDER,
		)
	})

	it("resolves from the shipped workflow registry by canonical names only", () => {
		expect(resolveWorkflowDefinition(WRITE_REMEDIATION_STORY_WORKFLOW_NAME)).to.equal(writeRemediationStoryWorkflowDefinition)
		expect(resolveWorkflowBySlashCommand(WRITE_REMEDIATION_STORY_WORKFLOW_SLASH_COMMAND_NAME)).to.equal(
			writeRemediationStoryWorkflowDefinition,
		)
		expect(resolveWorkflowByUseSkillName(WRITE_REMEDIATION_STORY_WORKFLOW_USE_SKILL_NAME)).to.equal(
			writeRemediationStoryWorkflowDefinition,
		)
		expect(resolveWorkflowDefinition("write-remediation-story.md")).to.equal(undefined)
		expect(resolveWorkflowBySlashCommand("write-remediation-story.md")).to.equal(undefined)
		expect(resolveWorkflowByUseSkillName("write-remediation-story.md")).to.equal(undefined)
	})

	it("declares the approved workflow persona and entry panel description", () => {
		expect(writeRemediationStoryWorkflowDefinition.persona).to.deep.equal(WRITE_REMEDIATION_STORY_WORKFLOW_PERSONA)
		expect(writeRemediationStoryWorkflowDefinition.entryPanel).to.deep.equal({
			promptMarkdown: WRITE_REMEDIATION_STORY_WORKFLOW_DESCRIPTION,
		})
	})

	it("declares the exact workflow value inventory and entry project keys", () => {
		expect(writeRemediationStoryWorkflowDefinition.workflowValueKeys).to.deep.equal(
			WRITE_REMEDIATION_STORY_WORKFLOW_VALUE_KEYS,
		)
		expect(writeRemediationStoryWorkflowDefinition.workflowValueKeys).to.include(
			WriteRemediationStoryWorkflowValueKey.ReplacementDocumentChoice,
		)
		expect(writeRemediationStoryWorkflowDefinition.workflowValueKeys).not.to.include("review_input")
		expect(writeRemediationStoryWorkflowDefinition.workflowValueKeys).not.to.include("story_path")
		expect(writeRemediationStoryWorkflowDefinition.workflowValueKeys).not.to.include(
			"write_remediation_story_step_2_review_input",
		)
		expect(writeRemediationStoryWorkflowDefinition.entryProjectValueKeys).to.deep.equal(
			WRITE_REMEDIATION_STORY_ENTRY_PROJECT_VALUE_KEYS,
		)
	})

	it("declares code-review output prerequisite", () => {
		const prerequisite =
			WRITE_REMEDIATION_STORY_PREREQUISITE_FILES[WRITE_REMEDIATION_STORY_CODE_REVIEW_OUTPUT_PREREQUISITE_ID]
		expect(prerequisite.id).to.equal(WRITE_REMEDIATION_STORY_CODE_REVIEW_OUTPUT_PREREQUISITE_ID)
		expect(prerequisite.requirement).to.equal("required")
		expect(prerequisite.producingWorkflowName).to.equal("code-review")
		expect(prerequisite.projectSubfolderSegments).to.deep.equal(["review"])
		expect(prerequisite.match.kind).to.equal("naming_pattern")
		if (prerequisite.match.kind !== "naming_pattern") {
			throw new Error(`Expected naming_pattern match, received ${prerequisite.match.kind}.`)
		}
		expect(prerequisite.match.pattern.source).to.equal("^code-review-\\d+-\\d+(?:-\\d+)?\\.md$")
		expect(prerequisite.workflowValueKey).to.equal(WriteRemediationStoryWorkflowValueKey.CodeReviewOutput)
		expect(prerequisite.outputDocumentReference).to.equal("none")
	})

	it("declares target remediation story prerequisite", () => {
		const prerequisite = WRITE_REMEDIATION_STORY_PREREQUISITE_FILES[WRITE_REMEDIATION_STORY_TARGET_STORY_PREREQUISITE_ID]
		expect(prerequisite.id).to.equal(WRITE_REMEDIATION_STORY_TARGET_STORY_PREREQUISITE_ID)
		expect(prerequisite.requirement).to.equal("required")
		expect(prerequisite.producingWorkflowName).to.equal("code-review")
		expect(prerequisite.projectSubfolderSegments).to.deep.equal(["implementation", "drafts"])
		expect(prerequisite.match.kind).to.equal("naming_pattern")
		if (prerequisite.match.kind !== "naming_pattern") {
			throw new Error(`Expected naming_pattern match, received ${prerequisite.match.kind}.`)
		}
		expect(prerequisite.match.pattern.source).to.equal("^Remediation-story-\\d+-\\d+-\\d+\\.md$")
		expect(prerequisite.workflowValueKey).to.equal(WriteRemediationStoryWorkflowValueKey.TargetStory)
		expect(prerequisite.outputDocumentReference).to.equal("none")
	})

	it("declares replacement Panel A exact shape", () => {
		const form = getWorkflowForm(WRITE_REMEDIATION_STORY_STEP_1_FORM_ID)
		expect(form).to.deep.equal(buildWriteRemediationStoryStep1WorkflowForm())
		const panel = getPanel(form, WRITE_REMEDIATION_STORY_PANEL_A_INCOMPATIBLE_FILES_ID)
		const field = getSingleField(panel)

		expect(panel.title).to.equal("Incompatible files")
		expect(panel.promptMarkdown).to.equal(
			"The findings document and remediation story identified are not associated with one another. Which document would you like to replace?",
		)
		expect(panel.fields).to.have.length(1)
		expect(field.kind).to.equal("radio_group")
		expect(field.key).to.equal(WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_FIELD_KEY)
		expect(field.workflowValueKey).to.equal(WriteRemediationStoryWorkflowValueKey.ReplacementDocumentChoice)
		expect(field.label).to.equal("document to replace")
		expect(field.required).to.equal(true)
		expect(field.allowedValueType).to.equal("string")
		expect(field.options).to.deep.equal([
			{ value: WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_REVIEW_FINDINGS, label: "review findings" },
			{ value: WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_REMEDIATION_STORY, label: "remediation story" },
		])
		expect(panel.allowedActions).to.deep.equal(["submit"])
		expect(panel.actionLabels).to.deep.equal({ submit: "submit" })
		expect(panel.transition).to.deep.equal({ type: "runtime_routed" })
	})

	it("declares replacement Panel B exact shape", () => {
		const panel = getPanel(
			getWorkflowForm(WRITE_REMEDIATION_STORY_STEP_1_FORM_ID),
			WRITE_REMEDIATION_STORY_PANEL_B_REPLACE_STORY_ID,
		)
		const field = getSingleField(panel)

		expect(panel.title).to.equal("Replace Story Document")
		expect(panel.promptMarkdown).to.equal(
			"Please select a drafted Remediation Story compatible with Findings Document: {data.code_review_output_filename}",
		)
		expect(panel.fields).to.have.length(1)
		expect(field.kind).to.equal("dropdown")
		expect(field.key).to.equal("replacement_target_story")
		expect(field.workflowValueKey).to.equal(WriteRemediationStoryWorkflowValueKey.TargetStory)
		expect(field.label).to.equal("remediation story")
		expect(field.required).to.equal(true)
		expect(field.allowedValueType).to.equal("string")
		expect(field.options).to.deep.equal([])
		expect(field.selectorDiscovery).to.deep.equal({
			root: { kind: "selected_project_root" },
			entryType: "file",
			targetPathSegments: ["implementation", "drafts"],
			namingPattern: "^Remediation-story-\\d+-\\d+-\\d+\\.md$",
			labelTemplate: "{entryName}",
			immediateChildrenOnly: true,
			sort: "alpha_asc",
		})
		expect(panel.allowedActions).to.deep.equal(["submit", "back"])
		expect(panel.actionLabels).to.deep.equal({ submit: "submit", back: "back" })
		expect(panel.transition).to.deep.equal({
			type: "runtime_routed",
			staleValueKeysToClear: [WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_FIELD_KEY],
		})
		expect(panel.backDestinationPanelId).to.equal(WRITE_REMEDIATION_STORY_PANEL_A_INCOMPATIBLE_FILES_ID)
	})

	it("declares replacement Panel C exact shape", () => {
		const panel = getPanel(
			getWorkflowForm(WRITE_REMEDIATION_STORY_STEP_1_FORM_ID),
			WRITE_REMEDIATION_STORY_PANEL_C_REPLACE_FINDINGS_ID,
		)
		const field = getSingleField(panel)

		expect(panel.title).to.equal("Replace Findings Document")
		expect(panel.promptMarkdown).to.equal(
			"Please select a drafted Code Review findings document compatible with the Remediation Story: {data.target_story_filename}",
		)
		expect(panel.fields).to.have.length(1)
		expect(field.kind).to.equal("dropdown")
		expect(field.key).to.equal("replacement_code_review_output")
		expect(field.workflowValueKey).to.equal(WriteRemediationStoryWorkflowValueKey.CodeReviewOutput)
		expect(field.label).to.equal("review findings")
		expect(field.required).to.equal(true)
		expect(field.allowedValueType).to.equal("string")
		expect(field.options).to.deep.equal([])
		expect(field.selectorDiscovery).to.deep.equal({
			root: { kind: "selected_project_root" },
			entryType: "file",
			targetPathSegments: ["review"],
			namingPattern: "^code-review-\\d+-\\d+(?:-\\d+)?\\.md$",
			labelTemplate: "{entryName}",
			immediateChildrenOnly: true,
			sort: "alpha_asc",
		})
		expect(panel.allowedActions).to.deep.equal(["submit", "back"])
		expect(panel.actionLabels).to.deep.equal({ submit: "submit", back: "back" })
		expect(panel.transition).to.deep.equal({
			type: "runtime_routed",
			staleValueKeysToClear: [WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_FIELD_KEY],
		})
		expect(panel.backDestinationPanelId).to.equal(WRITE_REMEDIATION_STORY_PANEL_A_INCOMPATIBLE_FILES_ID)
	})

	it("routes Panel A review findings selection to Panel C", async () => {
		const route = findRoute("step-1", "step-1-route-replacement-choice", "step-1-continue-to-replace-findings-panel")
		const workflowValues: WorkflowValues = {
			...SAMPLE_WORKFLOW_VALUES,
			[WriteRemediationStoryWorkflowValueKey.ReplacementDocumentChoice]:
				WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_REVIEW_FINDINGS,
		}
		if (route.trigger.kind !== "session_predicate") {
			throw new Error(`Expected session_predicate trigger, received ${route.trigger.kind}.`)
		}
		expect(
			route.trigger.matches({
				activeBranchId: "step-1-route-replacement-choice",
				workflowValues,
				step: getStep("step-1"),
			}),
		).to.equal(true)
		if (route.action.kind !== "continue_workflow_form") {
			throw new Error(`Expected continue_workflow_form action, received ${route.action.kind}.`)
		}
		expect(route.action.workflowFormId).to.equal(WRITE_REMEDIATION_STORY_STEP_1_FORM_ID)
		expect(route.action.panelId).to.equal(WRITE_REMEDIATION_STORY_PANEL_C_REPLACE_FINDINGS_ID)

		const replacement = await Promise.resolve(route.action.buildReplacement(createSession(workflowValues)))
		expect(replacement).to.deep.equal({
			panel: getPanel(
				getWorkflowForm(WRITE_REMEDIATION_STORY_STEP_1_FORM_ID),
				WRITE_REMEDIATION_STORY_PANEL_C_REPLACE_FINDINGS_ID,
			),
			data: {
				code_review_output_filename: "code-review-1-1.md",
				target_story_filename: "Remediation-story-1-1-1.md",
			},
		})
	})

	it("routes Panel A remediation story selection to Panel B", async () => {
		const route = findRoute("step-1", "step-1-route-replacement-choice", "step-1-continue-to-replace-story-panel")
		const workflowValues: WorkflowValues = {
			...SAMPLE_WORKFLOW_VALUES,
			[WriteRemediationStoryWorkflowValueKey.ReplacementDocumentChoice]:
				WRITE_REMEDIATION_STORY_REPLACEMENT_CHOICE_REMEDIATION_STORY,
		}
		if (route.trigger.kind !== "session_predicate") {
			throw new Error(`Expected session_predicate trigger, received ${route.trigger.kind}.`)
		}
		expect(
			route.trigger.matches({
				activeBranchId: "step-1-route-replacement-choice",
				workflowValues,
				step: getStep("step-1"),
			}),
		).to.equal(true)
		if (route.action.kind !== "continue_workflow_form") {
			throw new Error(`Expected continue_workflow_form action, received ${route.action.kind}.`)
		}
		expect(route.action.workflowFormId).to.equal(WRITE_REMEDIATION_STORY_STEP_1_FORM_ID)
		expect(route.action.panelId).to.equal(WRITE_REMEDIATION_STORY_PANEL_B_REPLACE_STORY_ID)

		const replacement = await Promise.resolve(route.action.buildReplacement(createSession(workflowValues)))
		expect(replacement).to.deep.equal({
			panel: getPanel(
				getWorkflowForm(WRITE_REMEDIATION_STORY_STEP_1_FORM_ID),
				WRITE_REMEDIATION_STORY_PANEL_B_REPLACE_STORY_ID,
			),
			data: {
				code_review_output_filename: "code-review-1-1.md",
				target_story_filename: "Remediation-story-1-1-1.md",
			},
		})
	})

	it("persists derived values for associated primary-story review inputs", () => {
		const result = validateAndPersistWriteRemediationStoryInputValues(createSession(SAMPLE_WORKFLOW_VALUES))
		expect(expectSucceeded(result).workflowValueWrites).to.deep.equal({
			[WriteRemediationStoryWorkflowValueKey.CodeReviewOutput]: CODE_REVIEW_OUTPUT_PATH,
			[WriteRemediationStoryWorkflowValueKey.TargetStory]: TARGET_STORY_PATH,
			[WriteRemediationStoryWorkflowValueKey.TargetStoryFilename]: "Remediation-story-1-1-1.md",
			[WriteRemediationStoryWorkflowValueKey.SelectedStoryIdentity]: "1.1.1",
			[WriteRemediationStoryWorkflowValueKey.OriginatingStoryIdentity]: "1.1",
			[WriteRemediationStoryWorkflowValueKey.EpicIdentity]: "1",
			[WriteRemediationStoryWorkflowValueKey.StoriesIndex]: STORIES_INDEX_PATH,
		})
	})

	it("persists derived values for associated remediation-story review inputs", () => {
		const codeReviewOutputPath = `${PROJECT_ROOT}/review/code-review-1-1-1.md`
		const targetStoryPath = `${PROJECT_ROOT}/implementation/drafts/Remediation-story-1-1-2.md`
		const result = validateAndPersistWriteRemediationStoryInputValues(
			createSession({
				...SAMPLE_WORKFLOW_VALUES,
				[WriteRemediationStoryWorkflowValueKey.CodeReviewOutput]: codeReviewOutputPath,
				[WriteRemediationStoryWorkflowValueKey.TargetStory]: targetStoryPath,
			}),
		)
		expect(expectSucceeded(result).workflowValueWrites).to.deep.equal({
			[WriteRemediationStoryWorkflowValueKey.CodeReviewOutput]: codeReviewOutputPath,
			[WriteRemediationStoryWorkflowValueKey.TargetStory]: targetStoryPath,
			[WriteRemediationStoryWorkflowValueKey.TargetStoryFilename]: "Remediation-story-1-1-2.md",
			[WriteRemediationStoryWorkflowValueKey.SelectedStoryIdentity]: "1.1.2",
			[WriteRemediationStoryWorkflowValueKey.OriginatingStoryIdentity]: "1.1.1",
			[WriteRemediationStoryWorkflowValueKey.EpicIdentity]: "1",
			[WriteRemediationStoryWorkflowValueKey.StoriesIndex]: STORIES_INDEX_PATH,
		})
	})

	it("routes invalid replacement association to terminal error", () => {
		const values: WorkflowValues = {
			...SAMPLE_WORKFLOW_VALUES,
			[WriteRemediationStoryWorkflowValueKey.CodeReviewOutput]: `${PROJECT_ROOT}/review/code-review-1-2.md`,
			[WriteRemediationStoryWorkflowValueKey.TargetStory]: TARGET_STORY_PATH,
		}
		const result = validateAndPersistWriteRemediationStoryInputValues(createSession(values))
		expect(expectFailed(result).errorMessage).to.equal(WRITE_REMEDIATION_STORY_INCOMPATIBLE_FILES_TERMINAL_ERROR)
		const route = findRoute(
			"step-1",
			"step-1-route-after-replacement-submit",
			"step-1-terminal-error-after-invalid-replacement",
		)
		if (route.trigger.kind !== "session_predicate") {
			throw new Error(`Expected session_predicate trigger, received ${route.trigger.kind}.`)
		}
		expect(
			route.trigger.matches({
				activeBranchId: "step-1-route-after-replacement-submit",
				workflowValues: values,
				step: getStep("step-1"),
			}),
		).to.equal(true)
		expect(route.action).to.deep.equal({
			kind: "terminal_error",
			errorMessage: WRITE_REMEDIATION_STORY_INCOMPATIBLE_FILES_TERMINAL_ERROR,
		})
	})

	it("declares replacement remediation story runtime resolution action", () => {
		const route = findRoute("step-1", "step-1-await-replacement-form", "step-1-resolve-replacement-story-artifact")
		if (route.trigger.kind !== "event_predicate") {
			throw new Error(`Expected event_predicate trigger, received ${route.trigger.kind}.`)
		}
		expect(
			route.trigger.matches({
				activeBranchId: "step-1-await-replacement-form",
				workflowValues: SAMPLE_WORKFLOW_VALUES,
				step: getStep("step-1"),
				triggerEvent: buildWorkflowFormPanelSubmittedEvent(WRITE_REMEDIATION_STORY_PANEL_B_REPLACE_STORY_ID),
			}),
		).to.equal(true)
		expect(expectResolveExistingProjectArtifactAction(route.action)).to.deep.include({
			artifactFamily: WorkflowArtifactFamily.RemediationStory,
			artifactIdentityWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.TargetStory,
			projectSubfolderSegments: ["implementation", "drafts"],
			outputWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.TargetStory,
			missingArtifactErrorMessage: WRITE_REMEDIATION_STORY_INCOMPATIBLE_FILES_TERMINAL_ERROR,
		})
	})

	it("declares replacement findings runtime resolution action", () => {
		const route = findRoute("step-1", "step-1-await-replacement-form", "step-1-resolve-replacement-findings-artifact")
		if (route.trigger.kind !== "event_predicate") {
			throw new Error(`Expected event_predicate trigger, received ${route.trigger.kind}.`)
		}
		expect(
			route.trigger.matches({
				activeBranchId: "step-1-await-replacement-form",
				workflowValues: SAMPLE_WORKFLOW_VALUES,
				step: getStep("step-1"),
				triggerEvent: buildWorkflowFormPanelSubmittedEvent(WRITE_REMEDIATION_STORY_PANEL_C_REPLACE_FINDINGS_ID),
			}),
		).to.equal(true)
		expect(expectResolveExistingProjectArtifactAction(route.action)).to.deep.include({
			artifactFamily: WorkflowArtifactFamily.CodeReviewOutput,
			artifactIdentityWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.CodeReviewOutput,
			projectSubfolderSegments: ["review"],
			outputWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.CodeReviewOutput,
			missingArtifactErrorMessage: WRITE_REMEDIATION_STORY_INCOMPATIBLE_FILES_TERMINAL_ERROR,
		})
	})

	it("declares selected remediation story index validation action", () => {
		const route = findRoute("step-1", "step-1-validate-story-index", "step-1-validate-story-index")
		expect(expectValidateStoryIndexEntryAction(route.action)).to.deep.include({
			storyIndexWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.StoriesIndex,
			storyIdentityWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.SelectedStoryIdentity,
			storyFilenameWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.TargetStoryFilename,
			requiredStoryType: "remediation",
			requiredStatus: "draft",
			missingOrMalformedIndexErrorMessage: WRITE_REMEDIATION_STORY_INDEX_MISSING_OR_MALFORMED_TERMINAL_ERROR,
			missingEntryErrorMessage: WRITE_REMEDIATION_STORY_MISSING_REMEDIATION_ENTRY_TERMINAL_ERROR,
			invalidEntryErrorMessage: WRITE_REMEDIATION_STORY_MALFORMED_REMEDIATION_ENTRY_TERMINAL_ERROR,
		})
	})

	it("declares primary originating story runtime resolution action", () => {
		const route = findRoute("step-2", "step-2-route-originating-story-family", "step-2-resolve-primary-originating-story")
		expect(route.action).to.deep.include({
			kind: "resolve_existing_project_artifact",
			artifactFamily: WorkflowArtifactFamily.Story,
			artifactIdentityWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.OriginatingStoryIdentity,
			projectSubfolderSegments: ["implementation", "stories-complete"],
			outputWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.OriginatingStory,
			missingArtifactErrorMessage: WRITE_REMEDIATION_STORY_ORIGINATING_STORY_MISSING_TERMINAL_ERROR,
		})
	})

	it("declares remediation originating story runtime resolution action", () => {
		const route = findRoute("step-2", "step-2-route-originating-story-family", "step-2-resolve-remediation-originating-story")
		expect(route.action).to.deep.include({
			kind: "resolve_existing_project_artifact",
			artifactFamily: WorkflowArtifactFamily.RemediationStory,
			artifactIdentityWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.OriginatingStoryIdentity,
			projectSubfolderSegments: ["implementation", "stories-complete"],
			outputWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.OriginatingStory,
			missingArtifactErrorMessage: WRITE_REMEDIATION_STORY_ORIGINATING_STORY_MISSING_TERMINAL_ERROR,
		})
	})

	it("declares invalid originating story identity terminal route", () => {
		const route = findRoute(
			"step-2",
			"step-2-route-originating-story-family",
			"step-2-terminal-error-invalid-originating-story-identity",
		)
		expect(route.action).to.deep.equal({
			kind: "terminal_error",
			errorMessage: WRITE_REMEDIATION_STORY_ORIGINATING_STORY_MISSING_TERMINAL_ERROR,
		})
	})

	it("projects Step 3 prompt with materialized workflow values and no raw placeholders", () => {
		const prompt = buildPrompt("step-3", SAMPLE_WORKFLOW_VALUES)
		expect(prompt).to.include(ORIGINATING_STORY_PATH)
		expect(prompt).to.include(CODE_REVIEW_OUTPUT_PATH)
		expect(prompt).to.include(TARGET_STORY_PATH)
		expect(prompt).not.to.include("{workflow.originating_story}")
		expect(prompt).not.to.include("{workflow.code_review_output}")
		expect(prompt).not.to.include("{workflow.target_story}")
	})

	it("declares expected tool schemas by step", () => {
		expect(getStep("step-1").buildToolSchema).to.equal(buildWriteRemediationStoryStep1ToolSchemas)
		expect(getStep("step-2").buildToolSchema).to.equal(buildWriteRemediationStoryStep2ToolSchemas)
		expect(getStep("step-3").buildToolSchema).to.equal(buildWriteRemediationStoryStep3ToolSchemas)
		expect(getStep("step-4").buildToolSchema).to.equal(buildWriteRemediationStoryStep4ToolSchemas)
		expect(getToolNamesForStep("step-1")).to.deep.equal([])
		expect(getToolNamesForStep("step-2")).to.deep.equal([])
		expect(getToolNamesForStep("step-4")).to.deep.equal([])
		expect(getToolNamesForStep("step-3")).to.deep.equal(STEP_3_TOOL_NAMES)
	})

	it("routes Step 3 attempt completion to Step 4 instead of workflow completion", () => {
		const route = findRoute("step-3", "step-3-await-attempt-completion", "step-3-transition-to-step-4")
		const event = buildAttemptCompletionSucceededEvent()
		expect(route.trigger).to.deep.equal({ kind: "on_event", eventKind: event.kind })
		expect(expectTransitionStepAction(route.action).target).to.deep.equal({ kind: "entry_branch", stepNumber: 4 })
	})

	it("declares Step 4 status update action shape", () => {
		const route = findRoute("step-4", "step-4-update-story-index-status", "step-4-update-story-index-status")
		expect(route.action).to.deep.include({
			kind: "update_story_index_status",
			storyIndexWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.StoriesIndex,
			storyIdentityWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.SelectedStoryIdentity,
			status: "backlog",
			expectedCurrentStatus: "draft",
		})
	})

	it("declares Step 4 remediation story move action shape", () => {
		const route = findRoute("step-4", "step-4-await-story-index-status-update", "step-4-move-remediation-story-to-backlog")
		if (route.trigger.kind !== "event_predicate") {
			throw new Error(`Expected event_predicate trigger, received ${route.trigger.kind}.`)
		}
		expect(
			route.trigger.matches({
				activeBranchId: "step-4-await-story-index-status-update",
				workflowValues: SAMPLE_WORKFLOW_VALUES,
				step: getStep("step-4"),
				triggerEvent: buildToolBackedOperationSucceededEvent(
					"step-4-update-story-index-status",
					"step-4-update-story-index-status",
				),
			}),
		).to.equal(true)
		expect(route.action).to.deep.include({
			kind: "move_project_file",
			sourceFolderSegments: ["implementation", "drafts"],
			destinationFolderSegments: ["implementation", "stories-backlog"],
			filenameWorkflowValueKey: WriteRemediationStoryWorkflowValueKey.TargetStoryFilename,
		})
	})

	it("declares Step 4 failure and completion routes", () => {
		const statusUpdateFailureRoute = findRoute(
			"step-4",
			"step-4-await-story-index-status-update",
			"step-4-fail-story-index-status-update",
		)
		if (statusUpdateFailureRoute.trigger.kind !== "event_predicate") {
			throw new Error(`Expected event_predicate trigger, received ${statusUpdateFailureRoute.trigger.kind}.`)
		}
		expect(
			statusUpdateFailureRoute.trigger.matches({
				activeBranchId: "step-4-await-story-index-status-update",
				workflowValues: SAMPLE_WORKFLOW_VALUES,
				step: getStep("step-4"),
				triggerEvent: buildToolBackedOperationFailedEvent(
					"step-4-update-story-index-status",
					"step-4-update-story-index-status",
				),
			}),
		).to.equal(true)
		if (statusUpdateFailureRoute.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure action, received ${statusUpdateFailureRoute.action.kind}.`)
		}
		expect(statusUpdateFailureRoute.action.instruction.run).to.equal(failWithToolBackedOperationReason)

		const moveFailureRoute = findRoute("step-4", "step-4-await-remediation-story-move", "step-4-fail-remediation-story-move")
		if (moveFailureRoute.trigger.kind !== "event_predicate") {
			throw new Error(`Expected event_predicate trigger, received ${moveFailureRoute.trigger.kind}.`)
		}
		expect(
			moveFailureRoute.trigger.matches({
				activeBranchId: "step-4-await-remediation-story-move",
				workflowValues: SAMPLE_WORKFLOW_VALUES,
				step: getStep("step-4"),
				triggerEvent: buildToolBackedOperationFailedEvent(
					"step-4-await-story-index-status-update",
					"step-4-move-remediation-story-to-backlog",
				),
			}),
		).to.equal(true)
		if (moveFailureRoute.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure action, received ${moveFailureRoute.action.kind}.`)
		}
		expect(moveFailureRoute.action.instruction.run).to.equal(failWithToolBackedOperationReason)

		const failureResult = failWithToolBackedOperationReason(
			createSession(SAMPLE_WORKFLOW_VALUES, PROJECT_ROOT, {
				activeBranchId: "step-4-await-story-index-status-update",
				failureState: { retryAttemptCount: 1, terminalErrorMessage: "specific backend failure" },
			}),
		)
		expect(failureResult).to.deep.equal({ kind: "failed", errorMessage: "specific backend failure" })

		const completionRoute = findRoute("step-4", "step-4-await-remediation-story-move", "step-4-complete-workflow")
		if (completionRoute.trigger.kind !== "event_predicate") {
			throw new Error(`Expected event_predicate trigger, received ${completionRoute.trigger.kind}.`)
		}
		expect(
			completionRoute.trigger.matches({
				activeBranchId: "step-4-await-remediation-story-move",
				workflowValues: SAMPLE_WORKFLOW_VALUES,
				step: getStep("step-4"),
				triggerEvent: buildToolBackedOperationSucceededEvent(
					"step-4-await-story-index-status-update",
					"step-4-move-remediation-story-to-backlog",
				),
			}),
		).to.equal(true)
		expect(completionRoute.action).to.deep.equal({ kind: "complete_workflow" })
	})

	it("does not preserve legacy source markdown, placeholder, or retired step-resolution concepts", () => {
		const identityValues: readonly string[] = [
			writeRemediationStoryWorkflowDefinition.name,
			writeRemediationStoryWorkflowDefinition.slashCommandName,
			writeRemediationStoryWorkflowDefinition.useSkillName,
		]
		for (const identityValue of identityValues) {
			expect(identityValue).not.to.include(".md")
		}

		expect(writeRemediationStoryWorkflowDefinition.workflowValueKeys).not.to.include("review_input")
		expect(writeRemediationStoryWorkflowDefinition.workflowValueKeys).not.to.include("story_path")
		expect(writeRemediationStoryWorkflowDefinition.workflowValueKeys).not.to.include(
			"write_remediation_story_step_2_review_input",
		)

		const exposedToolNames = [
			...getToolNamesForStep("step-1"),
			...getToolNamesForStep("step-2"),
			...getToolNamesForStep("step-3"),
			...getToolNamesForStep("step-4"),
		]
		for (const toolName of FORBIDDEN_MODEL_FACING_TOOL_NAMES) {
			expect(exposedToolNames).not.to.include(toolName)
		}
	})
})
