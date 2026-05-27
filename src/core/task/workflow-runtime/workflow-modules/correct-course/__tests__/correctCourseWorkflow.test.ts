import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { WorkflowFormFieldDefinition, WorkflowFormPanelDefinition } from "@shared/ExtensionMessage"
import { expect } from "chai"
import { afterEach, describe, it } from "mocha"
import {
	resolveWorkflowBySlashCommand,
	resolveWorkflowByUseSkillName,
	resolveWorkflowDefinition,
} from "@/core/task/workflow-runtime/WorkflowRegistry"
import { WorkflowArtifactFamily } from "../../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionBranchEvaluationInput,
	WorkflowDecisionBranchRoute,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowValues,
} from "../../../types"
import { renderWorkflowPromptTemplate } from "../../../workflowPromptTemplates"
import {
	buildCorrectCourseStep1ToolSchemas,
	buildCorrectCourseStep1WorkflowForm,
	buildCorrectCourseStep2ToolSchemas,
	buildCorrectCourseStep3ToolSchemas,
	CORRECT_COURSE_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID,
	CORRECT_COURSE_ARTIFACTS,
	CORRECT_COURSE_CHANGE_MANAGEMENT_PLAN_ARTIFACT_ID,
	CORRECT_COURSE_ENTRY_PROJECT_VALUE_KEYS,
	CORRECT_COURSE_EPICS_DOCUMENT_RESOLUTION_TERMINAL_ERROR,
	CORRECT_COURSE_MISSING_EPICS_FILE_CHOICE_FIELD_KEY,
	CORRECT_COURSE_MISSING_EPICS_INDEX_CHOICE_FIELD_KEY,
	CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE,
	CORRECT_COURSE_MISSING_SOURCE_CHOICE_END_WORKFLOW,
	CORRECT_COURSE_MISSING_STORY_INDEX_CHOICE_FIELD_KEY,
	CORRECT_COURSE_PANEL_A_DESCRIBE_PROBLEM_ID,
	CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID,
	CORRECT_COURSE_PANEL_C_IDENTIFY_ORIGINATING_EPIC_ID,
	CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID,
	CORRECT_COURSE_PANEL_E_IDENTIFY_ORIGINATING_STORY_ID,
	CORRECT_COURSE_PANEL_F_MISSING_EPICS_INDEX_ID,
	CORRECT_COURSE_PANEL_G_MISSING_STORY_INDEX_ID,
	CORRECT_COURSE_PANEL_H_MISSING_EPICS_FILE_ID,
	CORRECT_COURSE_PREREQUISITE_FILES,
	CORRECT_COURSE_STEP_1_FORM_ID,
	CORRECT_COURSE_WORKFLOW_DESCRIPTION,
	CORRECT_COURSE_WORKFLOW_DISPLAY_NAME,
	CORRECT_COURSE_WORKFLOW_NAME,
	CORRECT_COURSE_WORKFLOW_PERSONA,
	CORRECT_COURSE_WORKFLOW_PROJECT_SUBFOLDER,
	CORRECT_COURSE_WORKFLOW_SLASH_COMMAND_NAME,
	CORRECT_COURSE_WORKFLOW_USE_SKILL_NAME,
	CORRECT_COURSE_WORKFLOW_VALUE_KEYS,
	CorrectCourseWorkflowValueKey,
	correctCourseWorkflowDefinition,
	failWithToolBackedOperationReason,
	persistEpicsDocumentArtifactIdentity,
	persistMissingEpicsFileChoice,
	persistMissingEpicsIndexChoice,
	persistMissingStoryIndexChoice,
} from ".."
import { buildInitialCorrectCourseDocument } from "../correctCourseDocument"

const PROJECT_ROOT = "/tmp/correct-course-project"
const ARCHITECTURE_DOCUMENT_PATH = `${PROJECT_ROOT}/planning/architecture.md`
const EPICS_DOCUMENT_PATH = `${PROJECT_ROOT}/planning/Epics.md`
const OUTPUT_DOCUMENT_PATH = `${PROJECT_ROOT}/planning/change-management-plan-1.md`
const SAMPLE_WORKFLOW_VALUES: WorkflowValues = {
	projectMode: "existing",
	projectTitle: "Correct Course Session",
	projectFolderName: "correct-course-project",
	architecture_document: ARCHITECTURE_DOCUMENT_PATH,
	issue_description: "OAuth callback fails in staging.",
	epic_source_indicator: "yes",
	epic_source_identifier: "1",
	epics_document: EPICS_DOCUMENT_PATH,
	epics_document_artifact_identity: "epics",
	story_source_indicator: "yes",
	story_source_identifier: "1.1",
	output_document: OUTPUT_DOCUMENT_PATH,
	output_document_artifact_family: "change_management_plan",
	output_document_artifact_identity: "1",
	output_document_artifact_filename: "change-management-plan-1.md",
	output_document_artifact_relative_path: "planning/change-management-plan-1.md",
}

interface CorrectCourseTempProjectFixture {
	readonly root: string
	readonly planningDir: string
	readonly implementationDir: string
	readonly architectureDocumentPath: string
	readonly epicsIndexPath: string
	readonly epicsDocumentPath: string
	readonly storiesIndexPath: string
}

const tempProjectRoots: string[] = []

afterEach(() => {
	for (const root of tempProjectRoots) {
		rmSync(root, { recursive: true, force: true })
	}
	tempProjectRoots.length = 0
})

function createTempProjectFixture(): CorrectCourseTempProjectFixture {
	const root = mkdtempSync(join(tmpdir(), "correct-course-"))
	tempProjectRoots.push(root)
	const planningDir = join(root, "planning")
	const implementationDir = join(root, "implementation")
	mkdirSync(planningDir, { recursive: true })
	mkdirSync(implementationDir, { recursive: true })
	const architectureDocumentPath = join(planningDir, "architecture.md")
	writeFileSync(architectureDocumentPath, "# Architecture\n")
	return {
		root,
		planningDir,
		implementationDir,
		architectureDocumentPath,
		epicsIndexPath: join(planningDir, "Epics.index.json"),
		epicsDocumentPath: join(planningDir, "Epics.md"),
		storiesIndexPath: join(implementationDir, "epic-1-stories.index.json"),
	}
}

function createSession(workflowValues: WorkflowValues = SAMPLE_WORKFLOW_VALUES): ActiveWorkflowSession {
	return {
		activeStepNumber: 1,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Correct Course Session",
			projectFolderName: "correct-course-project",
		},
		lifecycle: { projectSelectionCompleted: true },
		entryArtifactResolution: undefined,
		ui: { suppressedWorkflowFormIds: [], suppressedWorkflowStepResolutionRoutes: [] },
		branchContext: { activeBranchId: "entry" },
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

function createWorkflowValuesForFixture(
	fixture: CorrectCourseTempProjectFixture,
	overrides: WorkflowValues = {},
): WorkflowValues {
	return {
		...SAMPLE_WORKFLOW_VALUES,
		projectFolderName: fixture.root.split("/").at(-1) ?? "correct-course-project",
		architecture_document: fixture.architectureDocumentPath,
		epics_document: fixture.epicsDocumentPath,
		epics_document_artifact_identity: "epics",
		...overrides,
	}
}

function getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition {
	const step = correctCourseWorkflowDefinition.steps[stepId]
	if (step === undefined) {
		throw new Error(`Missing workflow step ${stepId}.`)
	}

	return step
}

function findRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const branch = getStep(stepId).decisionTree.branches[branchId]
	if (branch === undefined) {
		throw new Error(`Missing branch ${branchId}.`)
	}

	const route = branch.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Missing route ${routeId}.`)
	}

	return route
}

function getSingleField(panel: WorkflowFormPanelDefinition): WorkflowFormFieldDefinition {
	expect(panel.fields).to.have.length(1)
	const field = panel.fields[0]
	if (field === undefined) {
		throw new Error(`Missing field for ${panel.panelId}.`)
	}

	return field
}

function buildFormSubmittedEvent(panelId: string): WorkflowBranchTriggerEvent {
	return {
		kind: "workflow_form_panel_submitted",
		workflowFormId: CORRECT_COURSE_STEP_1_FORM_ID,
		panelId,
		action: "submit",
		submittedValueKeys: [],
		clearedValueKeys: [],
	}
}

function buildFormCompletedEvent(): WorkflowBranchTriggerEvent {
	return { kind: "workflow_form_completed", workflowFormId: CORRECT_COURSE_STEP_1_FORM_ID }
}

function buildToolBackedOperationSucceededEvent(branchId: string, routeId: string): WorkflowBranchTriggerEvent {
	return { kind: "tool_backed_operation_succeeded", sourceRoute: { branchId, routeId } }
}

function buildToolBackedOperationFailedEvent(
	branchId: string,
	routeId: string,
	errorMessage = "backend failed",
): WorkflowBranchTriggerEvent {
	return { kind: "tool_backed_operation_failed", sourceRoute: { branchId, routeId }, errorMessage }
}

function expectEventPredicateMatch(
	route: WorkflowDecisionBranchRoute,
	stepId: WorkflowStepDefinition["id"],
	activeBranchId: string,
	workflowValues: WorkflowValues,
	triggerEvent: WorkflowBranchTriggerEvent,
	expected: boolean,
): void {
	expect(route.trigger.kind).to.equal("event_predicate")
	if (route.trigger.kind !== "event_predicate") {
		throw new Error(`Expected event_predicate trigger for ${route.id}.`)
	}

	expect(
		route.trigger.matches(
			createEventPredicateInput({
				activeBranchId,
				workflowValues,
				step: getStep(stepId),
				triggerEvent,
			}),
		),
	).to.equal(expected)
}

function expectSessionPredicateMatch(
	route: WorkflowDecisionBranchRoute,
	stepId: WorkflowStepDefinition["id"],
	activeBranchId: string,
	workflowValues: WorkflowValues,
	expected: boolean,
): void {
	expect(route.trigger.kind).to.equal("session_predicate")
	if (route.trigger.kind !== "session_predicate") {
		throw new Error(`Expected session_predicate trigger for ${route.id}.`)
	}

	expect(
		route.trigger.matches(
			createSessionPredicateInput({
				activeBranchId,
				workflowValues,
				step: getStep(stepId),
			}),
		),
	).to.equal(expected)
}

function createPromptInput(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): WorkflowPromptBuilderInput {
	return {
		session: createSession(workflowValues),
		step: getStep(stepId),
	}
}

function buildPrompt(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): string {
	const promptSource = getStep(stepId).buildPromptSource(createPromptInput(stepId, workflowValues))
	expect(promptSource.kind).to.equal("current_step_instruction_template")
	if (promptSource.kind !== "current_step_instruction_template") {
		throw new Error(`Missing current step instruction template for ${stepId}.`)
	}

	const template = promptSource.currentStepInstructionTemplate
	expect(template).to.be.a("string").and.not.empty
	return renderWorkflowPromptTemplate({
		template,
		workflowValueKeys: correctCourseWorkflowDefinition.workflowValueKeys,
		workflowValues,
		context: `correct-course ${stepId} test prompt`,
	})
}

function createMissingSourceChoiceSession(fieldKey: string, choice: string, currentPanelId: string): ActiveWorkflowSession {
	const baseSession = createSession()
	return {
		...baseSession,
		ui: {
			...baseSession.ui,
			formSession: {
				sessionId: "missing-source-session",
				workflowFormId: CORRECT_COURSE_STEP_1_FORM_ID,
				definitionVersion: 2,
				definitionPayload: buildCorrectCourseStep1WorkflowForm(),
				firstPanelId: CORRECT_COURSE_PANEL_A_DESCRIBE_PROBLEM_ID,
				currentPanelId,
				values: { [fieldKey]: { valueType: "string", stringValue: choice } },
				data: {},
			},
		},
	}
}

describe("correctCourseWorkflow", () => {
	it("declares canonical workflow identity, persona, entry panel, and values", () => {
		expect(correctCourseWorkflowDefinition.name).to.equal(CORRECT_COURSE_WORKFLOW_NAME)
		expect(correctCourseWorkflowDefinition.slashCommandName).to.equal(CORRECT_COURSE_WORKFLOW_SLASH_COMMAND_NAME)
		expect(correctCourseWorkflowDefinition.useSkillName).to.equal(CORRECT_COURSE_WORKFLOW_USE_SKILL_NAME)
		expect(correctCourseWorkflowDefinition.displayName).to.equal(CORRECT_COURSE_WORKFLOW_DISPLAY_NAME)
		expect(correctCourseWorkflowDefinition.description).to.equal(CORRECT_COURSE_WORKFLOW_DESCRIPTION)
		expect(correctCourseWorkflowDefinition.projectSubfolder).to.equal(CORRECT_COURSE_WORKFLOW_PROJECT_SUBFOLDER)
		expect(correctCourseWorkflowDefinition.persona).to.deep.equal(CORRECT_COURSE_WORKFLOW_PERSONA)
		expect(correctCourseWorkflowDefinition.entryPanel).to.deep.equal({
			promptMarkdown: CORRECT_COURSE_WORKFLOW_DESCRIPTION,
		})
		expect(correctCourseWorkflowDefinition.workflowValueKeys).to.deep.equal(CORRECT_COURSE_WORKFLOW_VALUE_KEYS)
		expect(correctCourseWorkflowDefinition.workflowValueKeys).to.deep.equal([
			CorrectCourseWorkflowValueKey.ProjectMode,
			CorrectCourseWorkflowValueKey.ProjectTitle,
			CorrectCourseWorkflowValueKey.ProjectFolderName,
			CorrectCourseWorkflowValueKey.ArchitectureDocument,
			CorrectCourseWorkflowValueKey.IssueDescription,
			CorrectCourseWorkflowValueKey.EpicSourceIndicator,
			CorrectCourseWorkflowValueKey.EpicSourceIdentifier,
			CorrectCourseWorkflowValueKey.EpicsDocument,
			CorrectCourseWorkflowValueKey.EpicsDocumentArtifactIdentity,
			CorrectCourseWorkflowValueKey.StorySourceIndicator,
			CorrectCourseWorkflowValueKey.StorySourceIdentifier,
			CorrectCourseWorkflowValueKey.OutputDocument,
			CorrectCourseWorkflowValueKey.OutputDocumentArtifactFamily,
			CorrectCourseWorkflowValueKey.OutputDocumentArtifactIdentity,
			CorrectCourseWorkflowValueKey.OutputDocumentArtifactFilename,
			CorrectCourseWorkflowValueKey.OutputDocumentArtifactRelativePath,
		])
		expect(correctCourseWorkflowDefinition.entryProjectValueKeys).to.deep.equal(CORRECT_COURSE_ENTRY_PROJECT_VALUE_KEYS)
	})

	it("resolves from the shipped workflow registry by canonical names only", () => {
		expect(resolveWorkflowDefinition(CORRECT_COURSE_WORKFLOW_NAME)).to.equal(correctCourseWorkflowDefinition)
		expect(resolveWorkflowBySlashCommand(CORRECT_COURSE_WORKFLOW_SLASH_COMMAND_NAME)).to.equal(
			correctCourseWorkflowDefinition,
		)
		expect(resolveWorkflowByUseSkillName(CORRECT_COURSE_WORKFLOW_USE_SKILL_NAME)).to.equal(correctCourseWorkflowDefinition)
		expect(resolveWorkflowDefinition("correct-course.md")).to.equal(undefined)
		expect(resolveWorkflowBySlashCommand("correct-course.md")).to.equal(undefined)
		expect(resolveWorkflowByUseSkillName("correct-course.md")).to.equal(undefined)
	})

	it("declares architecture prerequisite and change management artifact contracts", () => {
		expect(correctCourseWorkflowDefinition.prerequisiteFiles).to.deep.equal(CORRECT_COURSE_PREREQUISITE_FILES)
		expect(CORRECT_COURSE_PREREQUISITE_FILES[CORRECT_COURSE_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID]).to.deep.equal({
			id: CORRECT_COURSE_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID,
			requirement: "required",
			producingWorkflowName: "create-architecture",
			projectSubfolderSegments: ["planning"],
			match: { kind: "exact_filename", filename: "architecture.md" },
			workflowValueKey: CorrectCourseWorkflowValueKey.ArchitectureDocument,
			outputDocumentReference: "none",
		})
		expect(correctCourseWorkflowDefinition.artifacts).to.deep.equal(CORRECT_COURSE_ARTIFACTS)
		expect(CORRECT_COURSE_ARTIFACTS[CORRECT_COURSE_CHANGE_MANAGEMENT_PLAN_ARTIFACT_ID]).to.deep.equal({
			id: CORRECT_COURSE_CHANGE_MANAGEMENT_PLAN_ARTIFACT_ID,
			family: WorkflowArtifactFamily.ChangeManagementPlan,
			intentMode: "new",
			parentIdentitySource: undefined,
			targetIdentitySource: undefined,
			outputValueKeys: {
				projectTitle: CorrectCourseWorkflowValueKey.ProjectTitle,
				projectFolderName: CorrectCourseWorkflowValueKey.ProjectFolderName,
				artifactFamily: CorrectCourseWorkflowValueKey.OutputDocumentArtifactFamily,
				artifactIdentity: CorrectCourseWorkflowValueKey.OutputDocumentArtifactIdentity,
				artifactFilename: CorrectCourseWorkflowValueKey.OutputDocumentArtifactFilename,
				artifactRelativePath: CorrectCourseWorkflowValueKey.OutputDocumentArtifactRelativePath,
				artifactAbsolutePath: CorrectCourseWorkflowValueKey.OutputDocument,
				parentIdentity: undefined,
				targetIdentity: undefined,
			},
		})
	})

	it("declares Step 1 workflow form panels A through H exactly", () => {
		const form = buildCorrectCourseStep1WorkflowForm()
		const panelA = form.panels[CORRECT_COURSE_PANEL_A_DESCRIBE_PROBLEM_ID]
		const panelB = form.panels[CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID]
		const panelC = form.panels[CORRECT_COURSE_PANEL_C_IDENTIFY_ORIGINATING_EPIC_ID]
		const panelD = form.panels[CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID]
		const panelE = form.panels[CORRECT_COURSE_PANEL_E_IDENTIFY_ORIGINATING_STORY_ID]
		const panelF = form.panels[CORRECT_COURSE_PANEL_F_MISSING_EPICS_INDEX_ID]
		const panelG = form.panels[CORRECT_COURSE_PANEL_G_MISSING_STORY_INDEX_ID]
		const panelH = form.panels[CORRECT_COURSE_PANEL_H_MISSING_EPICS_FILE_ID]
		for (const panel of [panelA, panelB, panelC, panelD, panelE, panelF, panelG, panelH]) {
			expect(panel).not.to.equal(undefined)
			if (panel === undefined) {
				throw new Error("Expected panel to be defined.")
			}
			expect(panel.allowedActions).to.deep.equal(["submit", "back"])
			expect(panel.actionLabels).to.deep.equal({ submit: "submit", back: "back" })
		}
		if (
			panelA === undefined ||
			panelB === undefined ||
			panelC === undefined ||
			panelD === undefined ||
			panelE === undefined ||
			panelF === undefined ||
			panelG === undefined ||
			panelH === undefined
		) {
			throw new Error("Missing correct-course panel.")
		}

		expect(panelA.title).to.equal("Describe the Problem")
		expect(panelA.promptMarkdown).to.equal("Please provide a detailed description of the issue.")
		expect(getSingleField(panelA)).to.deep.include({
			key: CorrectCourseWorkflowValueKey.IssueDescription,
			workflowValueKey: CorrectCourseWorkflowValueKey.IssueDescription,
			kind: "large_text",
			label: "Project Issue Description",
			required: true,
			allowedValueType: "string",
		})
		expect(panelA.transition).to.deep.equal({
			type: "sequential",
			nextPanelId: CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID,
		})

		expect(panelB.title).to.equal("Check Epic Source")
		expect(panelB.promptMarkdown).to.equal("Was this issue discovered while building out a specific epic?")
		expect(getSingleField(panelB)).to.deep.include({
			key: CorrectCourseWorkflowValueKey.EpicSourceIndicator,
			workflowValueKey: CorrectCourseWorkflowValueKey.EpicSourceIndicator,
			kind: "radio_group",
			label: "response",
			required: true,
			allowedValueType: "string",
		})
		expect(getSingleField(panelB).options).to.deep.equal([
			{ value: "yes", label: "yes" },
			{ value: "no", label: "no" },
		])
		expect(panelB.backDestinationPanelId).to.equal(CORRECT_COURSE_PANEL_A_DESCRIBE_PROBLEM_ID)
		expect(panelB.transition).to.deep.equal({
			type: "runtime_routed",
			staleValueKeysToClear: [
				CorrectCourseWorkflowValueKey.EpicSourceIdentifier,
				CorrectCourseWorkflowValueKey.EpicsDocument,
				CorrectCourseWorkflowValueKey.EpicsDocumentArtifactIdentity,
				CorrectCourseWorkflowValueKey.StorySourceIndicator,
				CorrectCourseWorkflowValueKey.StorySourceIdentifier,
			],
		})

		expect(panelC.title).to.equal("Identify Originating Epic")
		expect(panelC.promptMarkdown).to.equal("Which epic?")
		expect(getSingleField(panelC)).to.deep.include({
			key: CorrectCourseWorkflowValueKey.EpicSourceIdentifier,
			workflowValueKey: CorrectCourseWorkflowValueKey.EpicSourceIdentifier,
			kind: "dropdown",
			label: "epic selection",
			required: true,
			allowedValueType: "string",
		})
		expect(getSingleField(panelC).options).to.deep.equal([])
		expect(panelC.backDestinationPanelId).to.equal(CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID)
		expect(panelC.transition).to.deep.equal({
			type: "runtime_routed",
			staleValueKeysToClear: [
				CorrectCourseWorkflowValueKey.EpicsDocument,
				CorrectCourseWorkflowValueKey.EpicsDocumentArtifactIdentity,
			],
		})

		expect(panelD.title).to.equal("Check Story Source")
		expect(panelD.promptMarkdown).to.equal(
			"Was this issue revealed while building, implementing, or reviewing a specific story?",
		)
		expect(getSingleField(panelD)).to.deep.include({
			key: CorrectCourseWorkflowValueKey.StorySourceIndicator,
			workflowValueKey: CorrectCourseWorkflowValueKey.StorySourceIndicator,
			kind: "radio_group",
			label: "response",
			required: true,
			allowedValueType: "string",
		})
		expect(getSingleField(panelD).options).to.deep.equal([
			{ value: "yes", label: "yes" },
			{ value: "no", label: "no" },
		])
		expect(panelD.backDestinationPanelId).to.equal(CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID)
		expect(panelD.transition).to.deep.equal({
			type: "runtime_routed",
			staleValueKeysToClear: [CorrectCourseWorkflowValueKey.StorySourceIdentifier],
		})

		expect(panelE.title).to.equal("Identify Originating Story")
		expect(panelE.promptMarkdown).to.equal("Which story?")
		expect(getSingleField(panelE)).to.deep.include({
			key: CorrectCourseWorkflowValueKey.StorySourceIdentifier,
			workflowValueKey: CorrectCourseWorkflowValueKey.StorySourceIdentifier,
			kind: "dropdown",
			label: "story selection",
			required: true,
			allowedValueType: "string",
		})
		expect(getSingleField(panelE).options).to.deep.equal([])
		expect(panelE.backDestinationPanelId).to.equal(CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID)
		expect(panelE.transition).to.deep.equal({
			type: "conditional",
			conditionSourceKey: "__terminal__",
			branches: [],
			defaultTerminal: true,
		})

		expect(panelF.title).to.equal("Missing Epics Index")
		expect(panelF.promptMarkdown).to.equal("There is no epics index file for this project. Proceed anyway?")
		expect(getSingleField(panelF).workflowValueKey).to.equal(undefined)
		expect(getSingleField(panelF)).to.deep.include({
			key: CORRECT_COURSE_MISSING_EPICS_INDEX_CHOICE_FIELD_KEY,
			kind: "radio_group",
			label: "select one",
			required: true,
			allowedValueType: "string",
		})
		expect(getSingleField(panelF).options).to.deep.equal([
			{ value: CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE, label: CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE },
			{
				value: CORRECT_COURSE_MISSING_SOURCE_CHOICE_END_WORKFLOW,
				label: CORRECT_COURSE_MISSING_SOURCE_CHOICE_END_WORKFLOW,
			},
		])
		expect(panelF.backDestinationPanelId).to.equal(CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID)
		expect(panelF.transition).to.deep.equal({
			type: "runtime_routed",
			staleValueKeysToClear: [
				CorrectCourseWorkflowValueKey.EpicSourceIdentifier,
				CorrectCourseWorkflowValueKey.EpicsDocument,
				CorrectCourseWorkflowValueKey.EpicsDocumentArtifactIdentity,
			],
		})

		expect(panelG.title).to.equal("Missing Story Index")
		expect(panelG.promptMarkdown).to.equal("There are no story index files for this project. Proceed anyway?")
		expect(getSingleField(panelG).workflowValueKey).to.equal(undefined)
		expect(getSingleField(panelG)).to.deep.include({
			key: CORRECT_COURSE_MISSING_STORY_INDEX_CHOICE_FIELD_KEY,
			kind: "radio_group",
			label: "select one",
			required: true,
			allowedValueType: "string",
		})
		expect(getSingleField(panelG).options).to.deep.equal(getSingleField(panelF).options)
		expect(panelG.backDestinationPanelId).to.equal(CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID)
		expect(panelG.transition).to.deep.equal({
			type: "runtime_routed",
			staleValueKeysToClear: [CorrectCourseWorkflowValueKey.StorySourceIndicator],
		})

		expect(panelH.title).to.equal("Missing Epics File")
		expect(panelH.promptMarkdown).to.equal("The Epics.md file for the selected epic is missing. Proceed Anyway?")
		expect(getSingleField(panelH).workflowValueKey).to.equal(undefined)
		expect(getSingleField(panelH)).to.deep.include({
			key: CORRECT_COURSE_MISSING_EPICS_FILE_CHOICE_FIELD_KEY,
			kind: "radio_group",
			label: "select one",
			required: true,
			allowedValueType: "string",
		})
		expect(getSingleField(panelH).options).to.deep.equal(getSingleField(panelF).options)
		expect(panelH.backDestinationPanelId).to.equal(CORRECT_COURSE_PANEL_C_IDENTIFY_ORIGINATING_EPIC_ID)
		expect(panelH.transition).to.deep.equal({
			type: "runtime_routed",
			staleValueKeysToClear: [
				CorrectCourseWorkflowValueKey.EpicsDocument,
				CorrectCourseWorkflowValueKey.EpicsDocumentArtifactIdentity,
			],
		})
	})

	it("declares Panel C and Panel E JSON option source contracts", () => {
		const form = buildCorrectCourseStep1WorkflowForm()
		const panelC = form.panels[CORRECT_COURSE_PANEL_C_IDENTIFY_ORIGINATING_EPIC_ID]
		const panelE = form.panels[CORRECT_COURSE_PANEL_E_IDENTIFY_ORIGINATING_STORY_ID]
		if (panelC === undefined || panelE === undefined) {
			throw new Error("Missing JSON option source panel.")
		}
		const panelCField = getSingleField(panelC)
		const panelEField = getSingleField(panelE)

		expect(panelCField.jsonOptionsSource).to.deep.equal({
			root: { kind: "selected_project_root" },
			sourcePathSegments: ["planning", "Epics.index.json"],
			itemsPath: "epics",
			valueProperty: "identity",
			labelTemplate: "Epic {identity}: {title}",
		})
		expect(panelCField.jsonOptionsSource?.descriptionTemplate).to.equal(undefined)
		expect(panelEField.jsonOptionsSource).to.deep.equal({
			root: { kind: "selected_project_root" },
			sourceFileDiscovery: {
				targetPathSegments: ["implementation"],
				namingPattern: "^epic-\\d+-stories\\.index\\.json$",
				immediateChildrenOnly: true,
				sort: "alpha_asc",
			},
			itemsPath: "stories",
			valueProperty: "story_identity",
			labelTemplate: "Story {story_identity}: {story_file_name}",
		})
		expect(panelEField.jsonOptionsSource?.descriptionTemplate).to.equal(undefined)
	})

	it("routes Step 1 through prerequisite resolution and initial form render", () => {
		const prerequisiteRoute = findRoute("step-1", "step-1-resolve-prerequisites", "step-1-resolve-architecture-document")
		expect(prerequisiteRoute.action).to.deep.equal({
			kind: "resolve_prerequisite_files",
			prerequisiteIds: [CORRECT_COURSE_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID],
		})
		expect(prerequisiteRoute.followingBranchId).to.equal("step-1-render-workflow-form")
		const renderRoute = findRoute("step-1", "step-1-render-workflow-form", "step-1-render-issue-source-form")
		expect(renderRoute.action.kind).to.equal("render_workflow_form")
		if (renderRoute.action.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderRoute.action.kind}.`)
		}
		expect(renderRoute.action.workflowFormId).to.equal(CORRECT_COURSE_STEP_1_FORM_ID)
		expect("buildSessionData" in renderRoute.action).to.equal(true)
		if (!("buildSessionData" in renderRoute.action)) {
			throw new Error("Expected render_workflow_form action with buildSessionData.")
		}
		expect(typeof renderRoute.action.buildSessionData).to.equal("function")
	})

	it("routes Panel B yes to Panel C when Epics.index.json exists and to Panel F when missing", () => {
		const fixture = createTempProjectFixture()
		const values = createWorkflowValuesForFixture(fixture, { epic_source_indicator: "yes" })
		const event = buildFormSubmittedEvent(CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID)
		const panelCRoute = findRoute("step-1", "step-1-await-runtime-routed-panels", "step-1-continue-to-epic-selection-panel")
		const panelFRoute = findRoute(
			"step-1",
			"step-1-await-runtime-routed-panels",
			"step-1-continue-to-missing-epics-index-panel",
		)

		expectEventPredicateMatch(panelCRoute, "step-1", "step-1-await-runtime-routed-panels", values, event, false)
		expectEventPredicateMatch(panelFRoute, "step-1", "step-1-await-runtime-routed-panels", values, event, true)
		writeFileSync(fixture.epicsIndexPath, JSON.stringify({ epics: [{ identity: "1", title: "First Epic" }] }))
		expectEventPredicateMatch(panelCRoute, "step-1", "step-1-await-runtime-routed-panels", values, event, true)
		expectEventPredicateMatch(panelFRoute, "step-1", "step-1-await-runtime-routed-panels", values, event, false)
	})

	it("routes Panel B no to Panel D while stale-clearing downstream epic and story values", () => {
		const form = buildCorrectCourseStep1WorkflowForm()
		const panelB = form.panels[CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID]
		if (panelB === undefined) {
			throw new Error("Missing Panel B.")
		}
		expect(panelB.transition).to.deep.equal({
			type: "runtime_routed",
			staleValueKeysToClear: [
				CorrectCourseWorkflowValueKey.EpicSourceIdentifier,
				CorrectCourseWorkflowValueKey.EpicsDocument,
				CorrectCourseWorkflowValueKey.EpicsDocumentArtifactIdentity,
				CorrectCourseWorkflowValueKey.StorySourceIndicator,
				CorrectCourseWorkflowValueKey.StorySourceIdentifier,
			],
		})
		const route = findRoute("step-1", "step-1-await-runtime-routed-panels", "step-1-continue-to-story-source-panel")
		expectEventPredicateMatch(
			route,
			"step-1",
			"step-1-await-runtime-routed-panels",
			{ ...SAMPLE_WORKFLOW_VALUES, epic_source_indicator: "no" },
			buildFormSubmittedEvent(CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID),
			true,
		)
		expect(route.action.kind).to.equal("continue_workflow_form")
		if (route.action.kind !== "continue_workflow_form") {
			throw new Error(`Expected continue_workflow_form, received ${route.action.kind}.`)
		}
		expect(route.action.workflowFormId).to.equal(CORRECT_COURSE_STEP_1_FORM_ID)
		expect(route.action.panelId).to.equal(CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID)
		expect(typeof route.action.buildReplacement).to.equal("function")
		expect(route.followingBranchId).to.equal("step-1-await-runtime-routed-panels")
	})

	it("routes Panel C submit through runtime Epics.md artifact resolution when present and Panel H when missing", () => {
		const fixture = createTempProjectFixture()
		const values = createWorkflowValuesForFixture(fixture)
		const event = buildFormSubmittedEvent(CORRECT_COURSE_PANEL_C_IDENTIFY_ORIGINATING_EPIC_ID)
		const resolveRoute = findRoute(
			"step-1",
			"step-1-await-runtime-routed-panels",
			"step-1-persist-epics-document-artifact-identity",
		)
		const panelHRoute = findRoute(
			"step-1",
			"step-1-await-runtime-routed-panels",
			"step-1-continue-to-missing-epics-file-panel",
		)

		expectEventPredicateMatch(resolveRoute, "step-1", "step-1-await-runtime-routed-panels", values, event, false)
		expectEventPredicateMatch(panelHRoute, "step-1", "step-1-await-runtime-routed-panels", values, event, true)
		writeFileSync(fixture.epicsDocumentPath, "# Epics\n")
		expectEventPredicateMatch(resolveRoute, "step-1", "step-1-await-runtime-routed-panels", values, event, true)
		expectEventPredicateMatch(panelHRoute, "step-1", "step-1-await-runtime-routed-panels", values, event, false)
		expect(persistEpicsDocumentArtifactIdentity()).to.deep.equal({
			kind: "succeeded",
			workflowValueWrites: { [CorrectCourseWorkflowValueKey.EpicsDocumentArtifactIdentity]: "epics" },
		})
		const artifactRoute = findRoute("step-1", "step-1-resolve-epics-document", "step-1-resolve-epics-document")
		expect(artifactRoute.action).to.deep.include({
			kind: "resolve_existing_project_artifact",
			artifactFamily: WorkflowArtifactFamily.Epics,
			artifactIdentityWorkflowValueKey: CorrectCourseWorkflowValueKey.EpicsDocumentArtifactIdentity,
			projectSubfolderSegments: ["planning"],
			outputWorkflowValueKey: CorrectCourseWorkflowValueKey.EpicsDocument,
			missingArtifactErrorMessage: CORRECT_COURSE_EPICS_DOCUMENT_RESOLUTION_TERMINAL_ERROR,
		})
	})

	it("routes Panel D yes to Panel E when story indexes exist and to Panel G when missing", () => {
		const fixture = createTempProjectFixture()
		const values = createWorkflowValuesForFixture(fixture, { story_source_indicator: "yes" })
		const event = buildFormSubmittedEvent(CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID)
		const panelERoute = findRoute("step-1", "step-1-await-runtime-routed-panels", "step-1-continue-to-story-selection-panel")
		const panelGRoute = findRoute(
			"step-1",
			"step-1-await-runtime-routed-panels",
			"step-1-continue-to-missing-story-index-panel",
		)

		expectEventPredicateMatch(panelERoute, "step-1", "step-1-await-runtime-routed-panels", values, event, false)
		expectEventPredicateMatch(panelGRoute, "step-1", "step-1-await-runtime-routed-panels", values, event, true)
		writeFileSync(
			fixture.storiesIndexPath,
			JSON.stringify({ stories: [{ story_identity: "1.1", story_file_name: "Story-1-1.md" }] }),
		)
		expectEventPredicateMatch(panelERoute, "step-1", "step-1-await-runtime-routed-panels", values, event, true)
		expectEventPredicateMatch(panelGRoute, "step-1", "step-1-await-runtime-routed-panels", values, event, false)

		const ignoredFixture = createTempProjectFixture()
		writeFileSync(
			join(ignoredFixture.implementationDir, "ignored.json"),
			JSON.stringify({ stories: [{ story_identity: "1.1", story_file_name: "Story-1-1.md" }] }),
		)
		const ignoredValues = createWorkflowValuesForFixture(ignoredFixture, { story_source_indicator: "yes" })
		expectEventPredicateMatch(panelERoute, "step-1", "step-1-await-runtime-routed-panels", ignoredValues, event, false)
		expectEventPredicateMatch(panelGRoute, "step-1", "step-1-await-runtime-routed-panels", ignoredValues, event, true)
	})

	it("routes Panel D no and Panel E completion to Step 2", () => {
		const panelD = buildCorrectCourseStep1WorkflowForm().panels[CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID]
		if (panelD === undefined) {
			throw new Error("Missing Panel D.")
		}
		expect(panelD.transition).to.deep.equal({
			type: "runtime_routed",
			staleValueKeysToClear: [CorrectCourseWorkflowValueKey.StorySourceIdentifier],
		})
		const panelDRoute = findRoute(
			"step-1",
			"step-1-await-runtime-routed-panels",
			"step-1-story-source-no-transition-to-step-2",
		)
		expectEventPredicateMatch(
			panelDRoute,
			"step-1",
			"step-1-await-runtime-routed-panels",
			{ ...SAMPLE_WORKFLOW_VALUES, story_source_indicator: "no" },
			buildFormSubmittedEvent(CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID),
			true,
		)
		expect(panelDRoute.action).to.deep.equal({ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } })

		const panelERoute = findRoute(
			"step-1",
			"step-1-await-runtime-routed-panels",
			"step-1-story-selected-transition-to-step-2",
		)
		expectEventPredicateMatch(
			panelERoute,
			"step-1",
			"step-1-await-runtime-routed-panels",
			SAMPLE_WORKFLOW_VALUES,
			buildFormCompletedEvent(),
			true,
		)
		expect(panelERoute.action).to.deep.equal({ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } })
	})

	it("applies missing-source continue choices and completes on end workflow choices", () => {
		expect(
			persistMissingEpicsIndexChoice(
				createMissingSourceChoiceSession(
					CORRECT_COURSE_MISSING_EPICS_INDEX_CHOICE_FIELD_KEY,
					CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE,
					CORRECT_COURSE_PANEL_F_MISSING_EPICS_INDEX_ID,
				),
			),
		).to.deep.equal({
			kind: "succeeded",
			workflowValueWrites: {
				[CorrectCourseWorkflowValueKey.EpicSourceIdentifier]: "not found",
				[CorrectCourseWorkflowValueKey.EpicsDocument]: "not found",
			},
		})
		expect(
			persistMissingEpicsIndexChoice(
				createMissingSourceChoiceSession(
					CORRECT_COURSE_MISSING_EPICS_INDEX_CHOICE_FIELD_KEY,
					CORRECT_COURSE_MISSING_SOURCE_CHOICE_END_WORKFLOW,
					CORRECT_COURSE_PANEL_F_MISSING_EPICS_INDEX_ID,
				),
			),
		).to.deep.equal({ kind: "succeeded" })
		expect(
			persistMissingStoryIndexChoice(
				createMissingSourceChoiceSession(
					CORRECT_COURSE_MISSING_STORY_INDEX_CHOICE_FIELD_KEY,
					CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE,
					CORRECT_COURSE_PANEL_G_MISSING_STORY_INDEX_ID,
				),
			),
		).to.deep.equal({
			kind: "succeeded",
			workflowValueWrites: { [CorrectCourseWorkflowValueKey.StorySourceIndicator]: "not found" },
		})
		expect(
			persistMissingStoryIndexChoice(
				createMissingSourceChoiceSession(
					CORRECT_COURSE_MISSING_STORY_INDEX_CHOICE_FIELD_KEY,
					CORRECT_COURSE_MISSING_SOURCE_CHOICE_END_WORKFLOW,
					CORRECT_COURSE_PANEL_G_MISSING_STORY_INDEX_ID,
				),
			),
		).to.deep.equal({ kind: "succeeded" })
		expect(
			persistMissingEpicsFileChoice(
				createMissingSourceChoiceSession(
					CORRECT_COURSE_MISSING_EPICS_FILE_CHOICE_FIELD_KEY,
					CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE,
					CORRECT_COURSE_PANEL_H_MISSING_EPICS_FILE_ID,
				),
			),
		).to.deep.equal({
			kind: "succeeded",
			workflowValueWrites: { [CorrectCourseWorkflowValueKey.EpicsDocument]: "missing" },
		})
		expect(
			persistMissingEpicsFileChoice(
				createMissingSourceChoiceSession(
					CORRECT_COURSE_MISSING_EPICS_FILE_CHOICE_FIELD_KEY,
					CORRECT_COURSE_MISSING_SOURCE_CHOICE_END_WORKFLOW,
					CORRECT_COURSE_PANEL_H_MISSING_EPICS_FILE_ID,
				),
			),
		).to.deep.equal({ kind: "succeeded" })

		const missingEpicsIndexRoute = findRoute(
			"step-1",
			"step-1-route-after-missing-source-choice",
			"step-1-continue-after-missing-epics-index",
		)
		const missingStoryIndexRoute = findRoute(
			"step-1",
			"step-1-route-after-missing-source-choice",
			"step-1-continue-after-missing-story-index",
		)
		const missingEpicsFileRoute = findRoute(
			"step-1",
			"step-1-route-after-missing-source-choice",
			"step-1-continue-after-missing-epics-file",
		)
		for (const route of [missingEpicsIndexRoute, missingStoryIndexRoute, missingEpicsFileRoute]) {
			expect(route.action).to.deep.equal({ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } })
		}
		expectSessionPredicateMatch(
			missingEpicsIndexRoute,
			"step-1",
			"step-1-route-after-missing-source-choice",
			{ ...SAMPLE_WORKFLOW_VALUES, epic_source_identifier: "not found" },
			true,
		)
		expectSessionPredicateMatch(
			missingStoryIndexRoute,
			"step-1",
			"step-1-route-after-missing-source-choice",
			{ ...SAMPLE_WORKFLOW_VALUES, story_source_indicator: "not found" },
			true,
		)
		expectSessionPredicateMatch(
			missingEpicsFileRoute,
			"step-1",
			"step-1-route-after-missing-source-choice",
			{ ...SAMPLE_WORKFLOW_VALUES, epics_document: "missing" },
			true,
		)
		const finalRoute = findRoute(
			"step-1",
			"step-1-route-after-missing-source-choice",
			"step-1-complete-after-missing-source-end-workflow",
		)
		expect(finalRoute.trigger).to.deep.equal({ kind: "always" })
		expect(finalRoute.action).to.deep.equal({ kind: "complete_workflow" })
	})

	it("declares Step 2 artifact allocation, document build, failure, and transition routes", () => {
		const allocationRoute = findRoute(
			"step-2",
			"step-2-allocate-change-management-plan",
			"step-2-allocate-change-management-plan",
		)
		expect(allocationRoute.action).to.deep.equal({
			kind: "allocate_artifact",
			artifactId: CORRECT_COURSE_CHANGE_MANAGEMENT_PLAN_ARTIFACT_ID,
		})
		expect(allocationRoute.followingBranchId).to.equal("step-2-await-artifact-allocation")
		const buildRoute = findRoute("step-2", "step-2-await-artifact-allocation", "step-2-build-change-management-plan")
		expectEventPredicateMatch(
			buildRoute,
			"step-2",
			"step-2-await-artifact-allocation",
			SAMPLE_WORKFLOW_VALUES,
			buildToolBackedOperationSucceededEvent(
				"step-2-allocate-change-management-plan",
				"step-2-allocate-change-management-plan",
			),
			true,
		)
		expect(buildRoute.action.kind).to.equal("build_workflow_document")
		if (buildRoute.action.kind !== "build_workflow_document") {
			throw new Error(`Expected build_workflow_document, received ${buildRoute.action.kind}.`)
		}
		expect(buildRoute.action.instruction.artifactId).to.equal(CORRECT_COURSE_CHANGE_MANAGEMENT_PLAN_ARTIFACT_ID)
		expect(buildRoute.action.instruction.buildContent).to.equal(buildInitialCorrectCourseDocument)
		expect(buildRoute.followingBranchId).to.equal("step-2-await-document-build")
		const transitionRoute = findRoute("step-2", "step-2-await-document-build", "step-2-transition-to-step-3")
		expectEventPredicateMatch(
			transitionRoute,
			"step-2",
			"step-2-await-document-build",
			SAMPLE_WORKFLOW_VALUES,
			buildToolBackedOperationSucceededEvent("step-2-await-artifact-allocation", "step-2-build-change-management-plan"),
			true,
		)
		expect(transitionRoute.action).to.deep.equal({ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 3 } })
		for (const route of [
			findRoute("step-2", "step-2-await-artifact-allocation", "step-2-fail-artifact-allocation"),
			findRoute("step-2", "step-2-await-document-build", "step-2-fail-document-build"),
		]) {
			expect(route.action.kind).to.equal("run_deterministic_procedure")
			if (route.action.kind !== "run_deterministic_procedure") {
				throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
			}
			expect(route.action.instruction.run).to.equal(failWithToolBackedOperationReason)
		}
		expectEventPredicateMatch(
			findRoute("step-2", "step-2-await-artifact-allocation", "step-2-fail-artifact-allocation"),
			"step-2",
			"step-2-await-artifact-allocation",
			SAMPLE_WORKFLOW_VALUES,
			buildToolBackedOperationFailedEvent(
				"step-2-allocate-change-management-plan",
				"step-2-allocate-change-management-plan",
			),
			true,
		)
		expectEventPredicateMatch(
			findRoute("step-2", "step-2-await-document-build", "step-2-fail-document-build"),
			"step-2",
			"step-2-await-document-build",
			SAMPLE_WORKFLOW_VALUES,
			buildToolBackedOperationFailedEvent("step-2-await-artifact-allocation", "step-2-build-change-management-plan"),
			true,
		)
	})

	it("returns concrete Step 2 backend failure reasons", () => {
		expect(
			failWithToolBackedOperationReason({
				...createSession(),
				branchContext: {
					activeBranchId: "step-2-await-artifact-allocation",
					failureState: { retryAttemptCount: 1, terminalErrorMessage: "specific backend failure" },
				},
			}),
		).to.deep.equal({ kind: "failed", errorMessage: "specific backend failure" })
		expect(failWithToolBackedOperationReason(createSession())).to.deep.equal({
			kind: "failed",
			errorMessage: "Tool-backed operation failed.",
		})
	})

	it("declares Step 3 project prompt and completion route", () => {
		expect(findRoute("step-3", "step-3-project-prompt", "step-3-project-prompt").action).to.deep.equal({
			kind: "project_prompt",
		})
		const completionRoute = findRoute("step-3", "step-3-await-attempt-completion", "step-3-complete-after-attempt-completion")
		expect(completionRoute.trigger).to.deep.equal({ kind: "on_event", eventKind: "attempt_completion_succeeded" })
		expect(completionRoute.action).to.deep.equal({ kind: "complete_workflow" })
	})

	it("builds non-empty Step 3 prompts with materialized workflow values and no raw placeholders", () => {
		const prompt = buildPrompt("step-3", SAMPLE_WORKFLOW_VALUES)
		for (const expectedText of [
			"Correct Course Session",
			"correct-course-project",
			ARCHITECTURE_DOCUMENT_PATH,
			OUTPUT_DOCUMENT_PATH,
			"yes",
			"1",
			EPICS_DOCUMENT_PATH,
			"1.1",
		]) {
			expect(prompt).to.include(expectedText)
		}
		for (const rawPlaceholder of [
			"{workflow.projectTitle}",
			"{workflow.projectFolderName}",
			"{workflow.architecture_document}",
			"{workflow.output_document}",
			"{workflow.epic_source_indicator}",
			"{workflow.epic_source_identifier}",
			"{workflow.epics_document}",
			"{workflow.story_source_indicator}",
			"{workflow.story_source_identifier}",
		]) {
			expect(prompt).not.to.include(rawPlaceholder)
		}
	})

	it("includes Step 3 conditional sections only when source indicators are yes", () => {
		const fullPrompt = buildPrompt("step-3", SAMPLE_WORKFLOW_VALUES)
		expect(fullPrompt).to.include("Correct Course Session")
		expect(fullPrompt).to.include("correct-course-project")
		expect(fullPrompt).to.include(ARCHITECTURE_DOCUMENT_PATH)
		expect(fullPrompt).to.include(OUTPUT_DOCUMENT_PATH)
		expect(fullPrompt).to.include("1")
		expect(fullPrompt).to.include(EPICS_DOCUMENT_PATH)
		expect(fullPrompt).to.include("1.1")
		expect(fullPrompt).to.include("Discovered while authoring a specific epic:")
		expect(fullPrompt).to.include("Discovered while authoring, implementing, or reviewing a specific story:")
		expect(fullPrompt).not.to.include("*** conditional")
		expect(fullPrompt).not.to.include("*** end conditional ***")

		const noEpicPrompt = buildPrompt("step-3", { ...SAMPLE_WORKFLOW_VALUES, epic_source_indicator: "no" })
		expect(noEpicPrompt).not.to.include("Discovered while authoring a specific epic:")
		expect(noEpicPrompt).to.include("Discovered while authoring, implementing, or reviewing a specific story:")
		expect(noEpicPrompt).not.to.include("*** conditional")
		expect(noEpicPrompt).not.to.include("*** end conditional ***")

		const notFoundEpicPrompt = buildPrompt("step-3", {
			...SAMPLE_WORKFLOW_VALUES,
			epic_source_indicator: "not found",
		})
		expect(notFoundEpicPrompt).not.to.include("Discovered while authoring a specific epic:")
		expect(notFoundEpicPrompt).to.include("Discovered while authoring, implementing, or reviewing a specific story:")

		const noStoryPrompt = buildPrompt("step-3", { ...SAMPLE_WORKFLOW_VALUES, story_source_indicator: "not found" })
		expect(noStoryPrompt).to.include("Discovered while authoring a specific epic:")
		expect(noStoryPrompt).not.to.include("Discovered while authoring, implementing, or reviewing a specific story:")

		const noStoryIndicatorPrompt = buildPrompt("step-3", { ...SAMPLE_WORKFLOW_VALUES, story_source_indicator: "no" })
		expect(noStoryIndicatorPrompt).to.include("Discovered while authoring a specific epic:")
		expect(noStoryIndicatorPrompt).not.to.include("Discovered while authoring, implementing, or reviewing a specific story:")
		expect(noStoryIndicatorPrompt).not.to.include("*** conditional")
		expect(noStoryIndicatorPrompt).not.to.include("*** end conditional ***")
	})

	it("delegates every step to the module-owned tool schema builders", () => {
		expect(getStep("step-1").buildToolSchema).to.equal(buildCorrectCourseStep1ToolSchemas)
		expect(getStep("step-2").buildToolSchema).to.equal(buildCorrectCourseStep2ToolSchemas)
		expect(getStep("step-3").buildToolSchema).to.equal(buildCorrectCourseStep3ToolSchemas)
		expect(getStep("step-1").buildToolSchema(createPromptInput("step-1", SAMPLE_WORKFLOW_VALUES))).to.deep.equal([])
		expect(getStep("step-2").buildToolSchema(createPromptInput("step-2", SAMPLE_WORKFLOW_VALUES))).to.deep.equal([])
		expect(
			getStep("step-3")
				.buildToolSchema(createPromptInput("step-3", SAMPLE_WORKFLOW_VALUES))
				.map((tool) => tool.name),
		).to.deep.equal([
			"list_files",
			"search_files",
			"list_code_definition_names",
			"read_file",
			"read_file_range",
			"apply_patch",
			"write_to_file",
			"send_user_message",
			"attempt_completion",
		])
	})

	it("does not preserve unauthorized workflow behavior", () => {
		for (const identityValue of [
			correctCourseWorkflowDefinition.name,
			correctCourseWorkflowDefinition.slashCommandName,
			correctCourseWorkflowDefinition.useSkillName,
		]) {
			expect(identityValue).not.to.include(".md")
		}
		for (const forbiddenWorkflowValue of [
			"hidden_availability_marker",
			"ai_writable",
			"placeholder",
			"managedWorkflow",
			"managed_workflow",
			"source_markdown",
			"workflow_config",
		]) {
			expect(correctCourseWorkflowDefinition.workflowValueKeys).not.to.include(forbiddenWorkflowValue)
		}
		const serializedDefinition = JSON.stringify(correctCourseWorkflowDefinition)
		for (const forbiddenText of [
			"correct-course.md",
			".cline/workflow-config.yaml",
			"managed-workflow",
			"workflow-step-resolution",
			"PLACEHOLDER_WORKFLOW_STEP_MATRIX",
			"build_correct_course_document",
			"BuildCorrectCourseDocument",
			"ManagedWorkflow",
		]) {
			expect(serializedDefinition).not.to.include(forbiddenText)
		}
		expect(
			findRoute("step-3", "step-3-await-attempt-completion", "step-3-complete-after-attempt-completion").action,
		).to.deep.equal({ kind: "complete_workflow" })

		const allToolNames = [
			...getStep("step-1").buildToolSchema(createPromptInput("step-1", SAMPLE_WORKFLOW_VALUES)),
			...getStep("step-2").buildToolSchema(createPromptInput("step-2", SAMPLE_WORKFLOW_VALUES)),
			...getStep("step-3").buildToolSchema(createPromptInput("step-3", SAMPLE_WORKFLOW_VALUES)),
		].map((tool) => tool.name)
		for (const forbiddenToolName of [
			"execute_command",
			"replace_in_file",
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
		]) {
			expect(allToolNames).not.to.include(forbiddenToolName)
		}
	})
})
