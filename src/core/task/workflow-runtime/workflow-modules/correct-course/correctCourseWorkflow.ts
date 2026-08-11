import { existsSync, readdirSync } from "node:fs"
import { basename, dirname, join, normalize } from "node:path"
import type { WorkflowFormDefinitionPayload, WorkflowFormPanelAction } from "@shared/ExtensionMessage"
import type { WorkflowFormSessionData } from "@/core/task/workflow-form/types"
import { WorkflowArtifactFamily } from "../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowDecisionBranchTrigger,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowDeterministicProcedureResult,
	WorkflowFormContinuationReplacement,
	WorkflowFormContinuationReplacementBuilder,
	WorkflowPersonaDefinition,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowStepPromptSource,
	WorkflowValues,
} from "../../types"
import { buildInitialCorrectCourseDocument } from "./correctCourseDocument"
import {
	buildCorrectCourseStep1ToolSchemas,
	buildCorrectCourseStep2ToolSchemas,
	buildCorrectCourseStep3ToolSchemas,
} from "./correctCourseToolSchemas"

export const CORRECT_COURSE_WORKFLOW_NAME = "correct-course"
export const CORRECT_COURSE_WORKFLOW_SLASH_COMMAND_NAME = "correct-course"
export const CORRECT_COURSE_WORKFLOW_USE_SKILL_NAME = "correct-course"
export const CORRECT_COURSE_WORKFLOW_DISPLAY_NAME = "correct course"
export const CORRECT_COURSE_WORKFLOW_DESCRIPTION =
	"In this workflow, the agent builds a change management plan in response to a defect, missing documentation, or need for additional scope."
export const CORRECT_COURSE_WORKFLOW_PROJECT_SUBFOLDER = "planning"

export const CORRECT_COURSE_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "Bob",
	role: "Scrum Master",
	identity: "aligning project documentation to enable low-risk implementation.",
	capabilities: ["project management", "technical writing", "project architecture"],
	communicationStyle: "crisp, checklist-driven, and ambiguity-free.",
	principles: ["cohesive and coherent documentation is the most important part of software development."],
}

export enum CorrectCourseWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	ArchitectureDocument = "architecture_document",
	IssueDescription = "issue_description",
	EpicSourceIndicator = "epic_source_indicator",
	EpicSourceIdentifier = "epic_source_identifier",
	EpicsDocument = "epics_document",
	EpicsDocumentArtifactIdentity = "epics_document_artifact_identity",
	StorySourceIndicator = "story_source_indicator",
	StorySourceIdentifier = "story_source_identifier",
	OutputDocument = "output_document",
	OutputDocumentArtifactFamily = "output_document_artifact_family",
	OutputDocumentArtifactIdentity = "output_document_artifact_identity",
	OutputDocumentArtifactFilename = "output_document_artifact_filename",
	OutputDocumentArtifactRelativePath = "output_document_artifact_relative_path",
}

export const CORRECT_COURSE_WORKFLOW_VALUE_KEYS: readonly CorrectCourseWorkflowValueKey[] =
	Object.values(CorrectCourseWorkflowValueKey)

export const CORRECT_COURSE_ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: CorrectCourseWorkflowValueKey.ProjectMode,
	projectTitle: CorrectCourseWorkflowValueKey.ProjectTitle,
	projectFolderName: CorrectCourseWorkflowValueKey.ProjectFolderName,
}

export const CORRECT_COURSE_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID = CorrectCourseWorkflowValueKey.ArchitectureDocument

export const CORRECT_COURSE_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]> = {
	[CORRECT_COURSE_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID]: {
		id: CORRECT_COURSE_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID,
		requirement: "required",
		resolutionMode: "interactive",
		producingWorkflowName: "create-architecture",
		projectSubfolderSegments: ["planning"],
		match: { kind: "exact_filename", filename: "architecture.md" },
		workflowValueKey: CorrectCourseWorkflowValueKey.ArchitectureDocument,
		outputDocumentReference: "none",
	},
}

export const CORRECT_COURSE_CHANGE_MANAGEMENT_PLAN_ARTIFACT_ID = "change_management_plan"

export const CORRECT_COURSE_ARTIFACTS: NonNullable<WorkflowDefinition["artifacts"]> = {
	[CORRECT_COURSE_CHANGE_MANAGEMENT_PLAN_ARTIFACT_ID]: {
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
	},
}

export const CORRECT_COURSE_EPICS_DOCUMENT_RESOLUTION_TERMINAL_ERROR =
	"The selected project's Epics.md file could not be resolved. Please ensure planning/Epics.md exists as a file inside the selected project's planning folder and is permitted by workspace path policy before retrying this workflow."

export const CORRECT_COURSE_STEP_1_FORM_ID = "step-1-correct-course-form"
export const CORRECT_COURSE_PANEL_A_DESCRIBE_PROBLEM_ID = "step-1-panel-a-describe-problem"
export const CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID = "step-1-panel-b-check-epic-source"
export const CORRECT_COURSE_PANEL_C_IDENTIFY_ORIGINATING_EPIC_ID = "step-1-panel-c-identify-originating-epic"
export const CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID = "step-1-panel-d-check-story-source"
export const CORRECT_COURSE_PANEL_E_IDENTIFY_ORIGINATING_STORY_ID = "step-1-panel-e-identify-originating-story"
export const CORRECT_COURSE_PANEL_F_MISSING_EPICS_INDEX_ID = "step-1-panel-f-missing-epics-index"
export const CORRECT_COURSE_PANEL_G_MISSING_STORY_INDEX_ID = "step-1-panel-g-missing-story-index"
export const CORRECT_COURSE_PANEL_H_MISSING_EPICS_FILE_ID = "step-1-panel-h-missing-epics-file"
export const CORRECT_COURSE_MISSING_EPICS_INDEX_CHOICE_FIELD_KEY = "missing_epics_index_choice"
export const CORRECT_COURSE_MISSING_STORY_INDEX_CHOICE_FIELD_KEY = "missing_story_index_choice"
export const CORRECT_COURSE_MISSING_EPICS_FILE_CHOICE_FIELD_KEY = "missing_epics_file_choice"
export const CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE = "continue"
export const CORRECT_COURSE_MISSING_SOURCE_CHOICE_END_WORKFLOW = "end workflow"

const CORRECT_COURSE_TOOL_BACKED_OPERATION_FAILED_FALLBACK = "Tool-backed operation failed."

function buildRuntimeRoutedTransition(
	staleValueKeysToClear: readonly string[] = [],
): WorkflowFormDefinitionPayload["panels"][string]["transition"] {
	if (staleValueKeysToClear.length === 0) {
		return { type: "runtime_routed" }
	}

	return { type: "runtime_routed", staleValueKeysToClear: [...staleValueKeysToClear] }
}

function buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"] {
	return { type: "conditional", conditionSourceKey: "__terminal__", branches: [], defaultTerminal: true }
}

function buildCorrectCourseFormSessionData(): WorkflowFormSessionData {
	return {}
}

export function buildCorrectCourseStep1WorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: CORRECT_COURSE_WORKFLOW_DISPLAY_NAME,
		toolDictionaryTitle: CORRECT_COURSE_WORKFLOW_DISPLAY_NAME,
		toolDictionaryMarkdown: CORRECT_COURSE_WORKFLOW_DESCRIPTION,
		firstPanelId: CORRECT_COURSE_PANEL_A_DESCRIBE_PROBLEM_ID,
		panels: {
			[CORRECT_COURSE_PANEL_A_DESCRIBE_PROBLEM_ID]: {
				panelId: CORRECT_COURSE_PANEL_A_DESCRIBE_PROBLEM_ID,
				title: "Describe the Problem",
				promptMarkdown: "Please provide a detailed description of the issue.",
				fields: [
					{
						key: CorrectCourseWorkflowValueKey.IssueDescription,
						workflowValueKey: CorrectCourseWorkflowValueKey.IssueDescription,
						kind: "large_text",
						label: "Project Issue Description",
						required: true,
						allowedValueType: "string",
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: { submit: "submit", back: "back" },
				transition: { type: "sequential", nextPanelId: CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID },
			},
			[CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID]: {
				panelId: CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID,
				title: "Check Epic Source",
				promptMarkdown: "Was this issue discovered while building out a specific epic?",
				fields: [
					{
						key: CorrectCourseWorkflowValueKey.EpicSourceIndicator,
						workflowValueKey: CorrectCourseWorkflowValueKey.EpicSourceIndicator,
						kind: "radio_group",
						label: "response",
						required: true,
						allowedValueType: "string",
						options: [
							{ value: "yes", label: "yes" },
							{ value: "no", label: "no" },
						],
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: { submit: "submit", back: "back" },
				backDestinationPanelId: CORRECT_COURSE_PANEL_A_DESCRIBE_PROBLEM_ID,
				transition: buildRuntimeRoutedTransition([
					CorrectCourseWorkflowValueKey.EpicSourceIdentifier,
					CorrectCourseWorkflowValueKey.EpicsDocument,
					CorrectCourseWorkflowValueKey.EpicsDocumentArtifactIdentity,
					CorrectCourseWorkflowValueKey.StorySourceIndicator,
					CorrectCourseWorkflowValueKey.StorySourceIdentifier,
				]),
			},
			[CORRECT_COURSE_PANEL_C_IDENTIFY_ORIGINATING_EPIC_ID]: {
				panelId: CORRECT_COURSE_PANEL_C_IDENTIFY_ORIGINATING_EPIC_ID,
				title: "Identify Originating Epic",
				promptMarkdown: "Which epic?",
				fields: [
					{
						key: CorrectCourseWorkflowValueKey.EpicSourceIdentifier,
						workflowValueKey: CorrectCourseWorkflowValueKey.EpicSourceIdentifier,
						kind: "dropdown",
						label: "epic selection",
						required: true,
						allowedValueType: "string",
						options: [],
						jsonOptionsSource: {
							root: { kind: "selected_project_root" },
							sourcePathSegments: ["planning", "Epics.index.json"],
							itemsPath: "epics",
							valueProperty: "identity",
							labelTemplate: "Epic {identity}: {title}",
						},
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: { submit: "submit", back: "back" },
				backDestinationPanelId: CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID,
				transition: buildRuntimeRoutedTransition([
					CorrectCourseWorkflowValueKey.EpicsDocument,
					CorrectCourseWorkflowValueKey.EpicsDocumentArtifactIdentity,
				]),
			},
			[CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID]: {
				panelId: CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID,
				title: "Check Story Source",
				promptMarkdown: "Was this issue revealed while building, implementing, or reviewing a specific story?",
				fields: [
					{
						key: CorrectCourseWorkflowValueKey.StorySourceIndicator,
						workflowValueKey: CorrectCourseWorkflowValueKey.StorySourceIndicator,
						kind: "radio_group",
						label: "response",
						required: true,
						allowedValueType: "string",
						options: [
							{ value: "yes", label: "yes" },
							{ value: "no", label: "no" },
						],
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: { submit: "submit", back: "back" },
				backDestinationPanelId: CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID,
				transition: buildRuntimeRoutedTransition([CorrectCourseWorkflowValueKey.StorySourceIdentifier]),
			},
			[CORRECT_COURSE_PANEL_E_IDENTIFY_ORIGINATING_STORY_ID]: {
				panelId: CORRECT_COURSE_PANEL_E_IDENTIFY_ORIGINATING_STORY_ID,
				title: "Identify Originating Story",
				promptMarkdown: "Which story?",
				fields: [
					{
						key: CorrectCourseWorkflowValueKey.StorySourceIdentifier,
						workflowValueKey: CorrectCourseWorkflowValueKey.StorySourceIdentifier,
						kind: "dropdown",
						label: "story selection",
						required: true,
						allowedValueType: "string",
						options: [],
						jsonOptionsSource: {
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
						},
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: { submit: "submit", back: "back" },
				backDestinationPanelId: CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID,
				transition: buildTerminalTransition(),
			},
			[CORRECT_COURSE_PANEL_F_MISSING_EPICS_INDEX_ID]: {
				panelId: CORRECT_COURSE_PANEL_F_MISSING_EPICS_INDEX_ID,
				title: "Missing Epics Index",
				promptMarkdown: "There is no epics index file for this project. Proceed anyway?",
				fields: [
					{
						key: CORRECT_COURSE_MISSING_EPICS_INDEX_CHOICE_FIELD_KEY,
						kind: "radio_group",
						label: "select one",
						required: true,
						allowedValueType: "string",
						options: [
							{
								value: CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE,
								label: CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE,
							},
							{
								value: CORRECT_COURSE_MISSING_SOURCE_CHOICE_END_WORKFLOW,
								label: CORRECT_COURSE_MISSING_SOURCE_CHOICE_END_WORKFLOW,
							},
						],
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: { submit: "submit", back: "back" },
				backDestinationPanelId: CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID,
				transition: buildRuntimeRoutedTransition([
					CorrectCourseWorkflowValueKey.EpicSourceIdentifier,
					CorrectCourseWorkflowValueKey.EpicsDocument,
					CorrectCourseWorkflowValueKey.EpicsDocumentArtifactIdentity,
				]),
			},
			[CORRECT_COURSE_PANEL_G_MISSING_STORY_INDEX_ID]: {
				panelId: CORRECT_COURSE_PANEL_G_MISSING_STORY_INDEX_ID,
				title: "Missing Story Index",
				promptMarkdown: "There are no story index files for this project. Proceed anyway?",
				fields: [
					{
						key: CORRECT_COURSE_MISSING_STORY_INDEX_CHOICE_FIELD_KEY,
						kind: "radio_group",
						label: "select one",
						required: true,
						allowedValueType: "string",
						options: [
							{
								value: CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE,
								label: CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE,
							},
							{
								value: CORRECT_COURSE_MISSING_SOURCE_CHOICE_END_WORKFLOW,
								label: CORRECT_COURSE_MISSING_SOURCE_CHOICE_END_WORKFLOW,
							},
						],
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: { submit: "submit", back: "back" },
				backDestinationPanelId: CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID,
				transition: buildRuntimeRoutedTransition([CorrectCourseWorkflowValueKey.StorySourceIndicator]),
			},
			[CORRECT_COURSE_PANEL_H_MISSING_EPICS_FILE_ID]: {
				panelId: CORRECT_COURSE_PANEL_H_MISSING_EPICS_FILE_ID,
				title: "Missing Epics File",
				promptMarkdown: "The Epics.md file for the selected epic is missing. Proceed Anyway?",
				fields: [
					{
						key: CORRECT_COURSE_MISSING_EPICS_FILE_CHOICE_FIELD_KEY,
						kind: "radio_group",
						label: "select one",
						required: true,
						allowedValueType: "string",
						options: [
							{
								value: CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE,
								label: CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE,
							},
							{
								value: CORRECT_COURSE_MISSING_SOURCE_CHOICE_END_WORKFLOW,
								label: CORRECT_COURSE_MISSING_SOURCE_CHOICE_END_WORKFLOW,
							},
						],
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: { submit: "submit", back: "back" },
				backDestinationPanelId: CORRECT_COURSE_PANEL_C_IDENTIFY_ORIGINATING_EPIC_ID,
				transition: buildRuntimeRoutedTransition([
					CorrectCourseWorkflowValueKey.EpicsDocument,
					CorrectCourseWorkflowValueKey.EpicsDocumentArtifactIdentity,
				]),
			},
		},
	}
}

function cloneStep1Panel(panelId: string): WorkflowFormDefinitionPayload["panels"][string] {
	const panel = buildCorrectCourseStep1WorkflowForm().panels[panelId]
	if (panel === undefined) {
		throw new Error(`Correct Course Step 1 workflow form is missing requested continuation panel ${panelId}.`)
	}

	return panel
}

function buildStep1ContinuationReplacementBuilder(panelId: string): WorkflowFormContinuationReplacementBuilder {
	return () => {
		const replacement: WorkflowFormContinuationReplacement = {
			panel: cloneStep1Panel(panelId),
			data: buildCorrectCourseFormSessionData(),
		}
		return replacement
	}
}

function createEmptyPromptSource(): WorkflowStepPromptSource {
	return { kind: "none" }
}

function createStepDefinition(args: {
	stepNumber: 1 | 2 | 3
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

function readWorkflowStringValue(workflowValues: WorkflowValues, key: CorrectCourseWorkflowValueKey): string | undefined {
	const value = workflowValues[key]
	if (typeof value !== "string") {
		return undefined
	}

	const trimmedValue = value.trim()
	if (trimmedValue.length === 0) {
		return undefined
	}

	return trimmedValue
}

function readFormStringValue(session: ActiveWorkflowSession, key: string): string | undefined {
	const formValue = session.ui.formSession?.values[key]
	if (formValue?.valueType !== "string" || typeof formValue.stringValue !== "string") {
		return undefined
	}

	const trimmedValue = formValue.stringValue.trim()
	if (trimmedValue.length === 0) {
		return undefined
	}

	return trimmedValue
}

function resolveSelectedProjectRootFromArchitectureDocument(architectureDocument: string): string | undefined {
	const normalizedArchitectureDocument = normalize(architectureDocument)
	if (basename(normalizedArchitectureDocument) !== "architecture.md") {
		return undefined
	}

	const planningFolder = dirname(normalizedArchitectureDocument)
	if (basename(planningFolder) !== "planning") {
		return undefined
	}

	return dirname(planningFolder)
}

function resolveSelectedProjectRootFromWorkflowValues(workflowValues: WorkflowValues): string | undefined {
	const architectureDocument = readWorkflowStringValue(workflowValues, CorrectCourseWorkflowValueKey.ArchitectureDocument)
	if (architectureDocument === undefined) {
		return undefined
	}

	return resolveSelectedProjectRootFromArchitectureDocument(architectureDocument)
}

function selectedProjectPathAppearsPresent(workflowValues: WorkflowValues, pathSegments: readonly string[]): boolean {
	const selectedProjectRoot = resolveSelectedProjectRootFromWorkflowValues(workflowValues)
	if (selectedProjectRoot === undefined) {
		return false
	}

	return existsSync(join(selectedProjectRoot, ...pathSegments))
}

function selectedProjectDiscoveredFilesExist(
	workflowValues: WorkflowValues,
	targetPathSegments: readonly string[],
	namingPattern: RegExp,
): boolean {
	const selectedProjectRoot = resolveSelectedProjectRootFromWorkflowValues(workflowValues)
	if (selectedProjectRoot === undefined) {
		return false
	}

	try {
		const entries = readdirSync(join(selectedProjectRoot, ...targetPathSegments), { withFileTypes: true })
		return entries.some((entry) => entry.isFile() && namingPattern.test(entry.name))
	} catch {
		return false
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

function workflowFormPanelSubmitted(panelId: string, action: WorkflowFormPanelAction): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_form_panel_submitted" &&
			triggerEvent.workflowFormId === CORRECT_COURSE_STEP_1_FORM_ID &&
			triggerEvent.panelId === panelId &&
			triggerEvent.action === action,
	}
}

function workflowFormCompleted(): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_form_completed" && triggerEvent.workflowFormId === CORRECT_COURSE_STEP_1_FORM_ID,
	}
}

function workflowValueEquals(key: CorrectCourseWorkflowValueKey, value: string, workflowValues: WorkflowValues): boolean {
	return readWorkflowStringValue(workflowValues, key) === value
}

function workflowFormPanelSubmittedWhen(
	panelId: string,
	action: WorkflowFormPanelAction,
	matchesWorkflowValues: (workflowValues: WorkflowValues) => boolean,
): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "workflow_form_panel_submitted" &&
			triggerEvent.workflowFormId === CORRECT_COURSE_STEP_1_FORM_ID &&
			triggerEvent.panelId === panelId &&
			triggerEvent.action === action &&
			matchesWorkflowValues(workflowValues),
	}
}

function panelBYesWithEpicsIndexExists(): WorkflowDecisionBranchTrigger {
	return workflowFormPanelSubmittedWhen(
		CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID,
		"submit",
		(workflowValues) =>
			workflowValueEquals(CorrectCourseWorkflowValueKey.EpicSourceIndicator, "yes", workflowValues) &&
			selectedProjectPathAppearsPresent(workflowValues, ["planning", "Epics.index.json"]),
	)
}

function panelBYesWithEpicsIndexMissing(): WorkflowDecisionBranchTrigger {
	return workflowFormPanelSubmittedWhen(
		CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID,
		"submit",
		(workflowValues) =>
			workflowValueEquals(CorrectCourseWorkflowValueKey.EpicSourceIndicator, "yes", workflowValues) &&
			!selectedProjectPathAppearsPresent(workflowValues, ["planning", "Epics.index.json"]),
	)
}

function panelBNoSubmitted(): WorkflowDecisionBranchTrigger {
	return workflowFormPanelSubmittedWhen(CORRECT_COURSE_PANEL_B_CHECK_EPIC_SOURCE_ID, "submit", (workflowValues) =>
		workflowValueEquals(CorrectCourseWorkflowValueKey.EpicSourceIndicator, "no", workflowValues),
	)
}

function panelCSubmittedWithEpicsDocumentExists(): WorkflowDecisionBranchTrigger {
	return workflowFormPanelSubmittedWhen(CORRECT_COURSE_PANEL_C_IDENTIFY_ORIGINATING_EPIC_ID, "submit", (workflowValues) =>
		selectedProjectPathAppearsPresent(workflowValues, ["planning", "Epics.md"]),
	)
}

function panelCSubmittedWithEpicsDocumentMissing(): WorkflowDecisionBranchTrigger {
	return workflowFormPanelSubmittedWhen(
		CORRECT_COURSE_PANEL_C_IDENTIFY_ORIGINATING_EPIC_ID,
		"submit",
		(workflowValues) => !selectedProjectPathAppearsPresent(workflowValues, ["planning", "Epics.md"]),
	)
}

function panelDYesWithStoryIndexesExist(): WorkflowDecisionBranchTrigger {
	return workflowFormPanelSubmittedWhen(
		CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID,
		"submit",
		(workflowValues) =>
			workflowValueEquals(CorrectCourseWorkflowValueKey.StorySourceIndicator, "yes", workflowValues) &&
			selectedProjectDiscoveredFilesExist(workflowValues, ["implementation"], /^epic-\d+-stories\.index\.json$/),
	)
}

function panelDYesWithStoryIndexesMissing(): WorkflowDecisionBranchTrigger {
	return workflowFormPanelSubmittedWhen(
		CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID,
		"submit",
		(workflowValues) =>
			workflowValueEquals(CorrectCourseWorkflowValueKey.StorySourceIndicator, "yes", workflowValues) &&
			!selectedProjectDiscoveredFilesExist(workflowValues, ["implementation"], /^epic-\d+-stories\.index\.json$/),
	)
}

function panelDNoSubmitted(): WorkflowDecisionBranchTrigger {
	return workflowFormPanelSubmittedWhen(CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID, "submit", (workflowValues) =>
		workflowValueEquals(CorrectCourseWorkflowValueKey.StorySourceIndicator, "no", workflowValues),
	)
}

function epicsIndexFallbackAccepted(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			workflowValueEquals(CorrectCourseWorkflowValueKey.EpicSourceIdentifier, "not found", workflowValues),
	}
}

function storyIndexFallbackAccepted(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			workflowValueEquals(CorrectCourseWorkflowValueKey.StorySourceIndicator, "not found", workflowValues),
	}
}

function epicsDocumentFallbackAccepted(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			workflowValueEquals(CorrectCourseWorkflowValueKey.EpicsDocument, "missing", workflowValues),
	}
}

export function persistEpicsDocumentArtifactIdentity(): WorkflowDeterministicProcedureResult {
	return {
		kind: "succeeded",
		workflowValueWrites: { [CorrectCourseWorkflowValueKey.EpicsDocumentArtifactIdentity]: "epics" },
	}
}

export function persistMissingEpicsIndexChoice(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult {
	const choice = readFormStringValue(session, CORRECT_COURSE_MISSING_EPICS_INDEX_CHOICE_FIELD_KEY)
	if (choice === CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE) {
		return {
			kind: "succeeded",
			workflowValueWrites: {
				[CorrectCourseWorkflowValueKey.EpicSourceIdentifier]: "not found",
				[CorrectCourseWorkflowValueKey.EpicsDocument]: "not found",
			},
		}
	}

	return { kind: "succeeded" }
}

export function persistMissingStoryIndexChoice(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult {
	const choice = readFormStringValue(session, CORRECT_COURSE_MISSING_STORY_INDEX_CHOICE_FIELD_KEY)
	if (choice === CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE) {
		return {
			kind: "succeeded",
			workflowValueWrites: { [CorrectCourseWorkflowValueKey.StorySourceIndicator]: "not found" },
		}
	}

	return { kind: "succeeded" }
}

export function persistMissingEpicsFileChoice(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult {
	const choice = readFormStringValue(session, CORRECT_COURSE_MISSING_EPICS_FILE_CHOICE_FIELD_KEY)
	if (choice === CORRECT_COURSE_MISSING_SOURCE_CHOICE_CONTINUE) {
		return {
			kind: "succeeded",
			workflowValueWrites: { [CorrectCourseWorkflowValueKey.EpicsDocument]: "missing" },
		}
	}

	return { kind: "succeeded" }
}

export function failWithToolBackedOperationReason(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult {
	return {
		kind: "failed",
		errorMessage:
			session.branchContext.failureState?.terminalErrorMessage ?? CORRECT_COURSE_TOOL_BACKED_OPERATION_FAILED_FALLBACK,
	}
}

const CORRECT_COURSE_STEP_3_BASE_PROMPT_TEMPLATE = `You are a Scrum Master navigating change management. Analyze the triggering issue, assess impact across project artifacts, and produce an actionable change management plan with clear handoff. You will document your plan in the provided change management plan. You should actively engage the user while carrying out the steps prescribed below to ensure that they are kept abreast of your progress and are able to provide input.

- Project: {workflow.projectTitle}
- Project Folder: {workflow.projectFolderName}
- Architecture Document: {workflow.architecture_document}
- Change Management Plan: {workflow.output_document}

The project folder contains all existing documentation for this project, which can include:
- discovery documents
- planning documents, including previous change management, architecture, epics, and epics index files
- implementation documents, including story files and story index files
- review files including documented findings from implemented stories which have been assessed via the code review workflow`

const CORRECT_COURSE_STEP_3_EPIC_SOURCE_PROMPT_TEMPLATE = `Discovered while authoring a specific epic: {workflow.epic_source_indicator}
Epic: {workflow.epic_source_identifier}
Epic Document: {workflow.epics_document}`

const CORRECT_COURSE_STEP_3_STORY_SOURCE_PROMPT_TEMPLATE = `Discovered while authoring, implementing, or reviewing a specific story: {workflow.story_source_indicator}
Story: {workflow.story_source_identifier}`

const CORRECT_COURSE_STEP_3_FINAL_PROMPT_TEMPLATE = `Define the core problem and assign it to one of the following categories:
- technical limitation discovered during implementation
- new requirement emerged
- requirements mistranslated in story document
- strategic pivot desired
- failed approach requires a solution

- Assess initial impact and gather supporting evidence including concrete examples, error messages, user feedback, or technical constraints. Record your findings under the "Impact Assessment" heading in {workflow.output_document} and note the issue's source under the "Issue Source" heading.

Assess the project's stories:
Keep analysis and modification constrained to stories belonging to a single epic whenever feasible. Consider the following:
- Can the issue be addressed by modifying existing stories?
- Should new stories be added within the current epic structure?
- Would this approach maintain project timeline and scope as documented in {workflow.architecture_document}?
- Would reverting work from recently-completed stories simplify addressing this issue?
- If so, which stories' changes should be rolled back?

Add content under the "Story Modifications" heading in {workflow.output_document} indicating what work is needed for each story that should be touched as part of this change management process.

Assess the project's epics:
- Evaluate the story's parent epic and, if needed, other epics in the same project and consider:
    - Can the parent epic still be delivered as-documented?
    - Do future epics in the project require revisions?
    - Does the issue invalidate any existing epics?
    - Do new epics need to be introduced?
    - Does the sequencing of the project's epics need to be modified?
- Determine which of the following are necessary:
    - modify existing epic
    - add new epic
    - remove an existing epic

Add content under the "Epic Modifications" heading in {workflow.output_document} indicating what work is needed for each epic that should be touched as part of this change management process.

Assess the project's architecture:
- Evaluate {workflow.architecture_document} and consider:
-   Do the project's scope, architectural goals, core architectural rules, responsibility boundaries, or durable vs transient ownership, blast radius, dependencies, or roadmap need to be modified?

Add content under the "Architecture Modifications" heading in {workflow.output_document} indicating what work is needed in the architecture document as part of this change management process.

Build a change management action plan using the following guidelines:
Indicate workflows which should be run with intended sequencing. This is the standard sequential workflow structure:
    - create-architecture: defines initial architectural expectations, produces the architecture document
    - create-epics: breaks the project down into clearly-scoped epics, sequences them appropriately, and generates Epics.md and epics.index.json.
    - pi-planning: breaks a single epic down into user stories, defines each story's objective, scope, scope boundary, and requirements, and generates story documents and a story index file for the target epic.
    - create-story: builds out the tasks and subtasks for a single story, adds them to story documents generated during the pi-planning workflow
    - dev-story: implements a single user story
    - code-review: conducts QA analysis on a completed user story, produces findings documents and, if needed, a remediation story with initial story content
    - write-remediation-story: Builds tasks and subtasks for a single remediation story, adds them to a story document produced by the code-review workflow

For each prescribed workflow, include details regarding what should be done to resolve the identified issue which agents executing those workflows can follow.

Add the action plan under the "Change Management Implementation" heading in {workflow.output_document}.

Provide an overview of what you've documented to the user including the full file path for {workflow.output_document}. Revise as needed based on their feedback. Once they are satisfied with your documentation, use attempt_completion to provide them with a closing set of instructions which include the following where relevant:
    - if the user needs to run the create-architecture or create-epics workflows, they must provide the full file path to {workflow.output_document} when prompted for context files.
    - if epics are to be deleted, added, or resequenced, or if stories are to be added, deleted, or resequenced, the user must run the following workflows in order:
        - create-epics (once)
        - pi-planning (once per modified/new epic)
        - create-story (once per modified/new story)
    - The user should not resume the normal dev-story - > code-review - > write-remediation-story cycle until all project documentation has been updated per the change management plan.`

function buildStep3PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const promptSections = [CORRECT_COURSE_STEP_3_BASE_PROMPT_TEMPLATE]

	if (input.session.workflowValues[CorrectCourseWorkflowValueKey.EpicSourceIndicator] === "yes") {
		promptSections.push(CORRECT_COURSE_STEP_3_EPIC_SOURCE_PROMPT_TEMPLATE)
	}

	if (input.session.workflowValues[CorrectCourseWorkflowValueKey.StorySourceIndicator] === "yes") {
		promptSections.push(CORRECT_COURSE_STEP_3_STORY_SOURCE_PROMPT_TEMPLATE)
	}

	promptSections.push(CORRECT_COURSE_STEP_3_FINAL_PROMPT_TEMPLATE)

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: promptSections.join("\n\n"),
	}
}

function buildStep1DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-1-resolve-prerequisites",
		branches: {
			"step-1-resolve-prerequisites": {
				id: "step-1-resolve-prerequisites",
				routes: [
					{
						id: "step-1-resolve-architecture-document",
						trigger: { kind: "always" },
						action: {
							kind: "resolve_prerequisite_files",
							prerequisiteIds: [CORRECT_COURSE_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID],
						},
						followingBranchId: "step-1-render-workflow-form",
					},
				],
			},
			"step-1-render-workflow-form": {
				id: "step-1-render-workflow-form",
				routes: [
					{
						id: "step-1-render-issue-source-form",
						trigger: { kind: "always" },
						action: {
							kind: "render_workflow_form",
							workflowFormId: CORRECT_COURSE_STEP_1_FORM_ID,
							buildSessionData: buildCorrectCourseFormSessionData,
						},
						followingBranchId: "step-1-await-runtime-routed-panels",
					},
				],
			},
			"step-1-await-runtime-routed-panels": {
				id: "step-1-await-runtime-routed-panels",
				routes: [
					{
						id: "step-1-continue-to-epic-selection-panel",
						trigger: panelBYesWithEpicsIndexExists(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: CORRECT_COURSE_STEP_1_FORM_ID,
							panelId: CORRECT_COURSE_PANEL_C_IDENTIFY_ORIGINATING_EPIC_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								CORRECT_COURSE_PANEL_C_IDENTIFY_ORIGINATING_EPIC_ID,
							),
						},
						followingBranchId: "step-1-await-runtime-routed-panels",
					},
					{
						id: "step-1-continue-to-missing-epics-index-panel",
						trigger: panelBYesWithEpicsIndexMissing(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: CORRECT_COURSE_STEP_1_FORM_ID,
							panelId: CORRECT_COURSE_PANEL_F_MISSING_EPICS_INDEX_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								CORRECT_COURSE_PANEL_F_MISSING_EPICS_INDEX_ID,
							),
						},
						followingBranchId: "step-1-await-runtime-routed-panels",
					},
					{
						id: "step-1-continue-to-story-source-panel",
						trigger: panelBNoSubmitted(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: CORRECT_COURSE_STEP_1_FORM_ID,
							panelId: CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								CORRECT_COURSE_PANEL_D_CHECK_STORY_SOURCE_ID,
							),
						},
						followingBranchId: "step-1-await-runtime-routed-panels",
					},
					{
						id: "step-1-persist-epics-document-artifact-identity",
						trigger: panelCSubmittedWithEpicsDocumentExists(),
						action: {
							kind: "run_deterministic_procedure",
							instruction: { run: persistEpicsDocumentArtifactIdentity },
						},
						followingBranchId: "step-1-resolve-epics-document",
					},
					{
						id: "step-1-continue-to-missing-epics-file-panel",
						trigger: panelCSubmittedWithEpicsDocumentMissing(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: CORRECT_COURSE_STEP_1_FORM_ID,
							panelId: CORRECT_COURSE_PANEL_H_MISSING_EPICS_FILE_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								CORRECT_COURSE_PANEL_H_MISSING_EPICS_FILE_ID,
							),
						},
						followingBranchId: "step-1-await-runtime-routed-panels",
					},
					{
						id: "step-1-continue-to-story-selection-panel",
						trigger: panelDYesWithStoryIndexesExist(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: CORRECT_COURSE_STEP_1_FORM_ID,
							panelId: CORRECT_COURSE_PANEL_E_IDENTIFY_ORIGINATING_STORY_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								CORRECT_COURSE_PANEL_E_IDENTIFY_ORIGINATING_STORY_ID,
							),
						},
						followingBranchId: "step-1-await-runtime-routed-panels",
					},
					{
						id: "step-1-continue-to-missing-story-index-panel",
						trigger: panelDYesWithStoryIndexesMissing(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: CORRECT_COURSE_STEP_1_FORM_ID,
							panelId: CORRECT_COURSE_PANEL_G_MISSING_STORY_INDEX_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								CORRECT_COURSE_PANEL_G_MISSING_STORY_INDEX_ID,
							),
						},
						followingBranchId: "step-1-await-runtime-routed-panels",
					},
					{
						id: "step-1-story-source-no-transition-to-step-2",
						trigger: panelDNoSubmitted(),
						action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } },
					},
					{
						id: "step-1-persist-missing-epics-index-choice",
						trigger: workflowFormPanelSubmitted(CORRECT_COURSE_PANEL_F_MISSING_EPICS_INDEX_ID, "submit"),
						action: {
							kind: "run_deterministic_procedure",
							instruction: { run: persistMissingEpicsIndexChoice },
						},
						followingBranchId: "step-1-route-after-missing-source-choice",
					},
					{
						id: "step-1-persist-missing-story-index-choice",
						trigger: workflowFormPanelSubmitted(CORRECT_COURSE_PANEL_G_MISSING_STORY_INDEX_ID, "submit"),
						action: {
							kind: "run_deterministic_procedure",
							instruction: { run: persistMissingStoryIndexChoice },
						},
						followingBranchId: "step-1-route-after-missing-source-choice",
					},
					{
						id: "step-1-persist-missing-epics-file-choice",
						trigger: workflowFormPanelSubmitted(CORRECT_COURSE_PANEL_H_MISSING_EPICS_FILE_ID, "submit"),
						action: {
							kind: "run_deterministic_procedure",
							instruction: { run: persistMissingEpicsFileChoice },
						},
						followingBranchId: "step-1-route-after-missing-source-choice",
					},
					{
						id: "step-1-story-selected-transition-to-step-2",
						trigger: workflowFormCompleted(),
						action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } },
					},
				],
			},
			"step-1-resolve-epics-document": {
				id: "step-1-resolve-epics-document",
				routes: [
					{
						id: "step-1-resolve-epics-document",
						trigger: { kind: "always" },
						action: {
							kind: "resolve_existing_project_artifact",
							artifactFamily: WorkflowArtifactFamily.Epics,
							artifactIdentityWorkflowValueKey: CorrectCourseWorkflowValueKey.EpicsDocumentArtifactIdentity,
							projectSubfolderSegments: ["planning"],
							outputWorkflowValueKey: CorrectCourseWorkflowValueKey.EpicsDocument,
							missingArtifactErrorMessage: CORRECT_COURSE_EPICS_DOCUMENT_RESOLUTION_TERMINAL_ERROR,
						},
						followingBranchId: "step-1-transition-to-step-2",
					},
				],
			},
			"step-1-route-after-missing-source-choice": {
				id: "step-1-route-after-missing-source-choice",
				routes: [
					{
						id: "step-1-continue-after-missing-epics-index",
						trigger: epicsIndexFallbackAccepted(),
						action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } },
					},
					{
						id: "step-1-continue-after-missing-story-index",
						trigger: storyIndexFallbackAccepted(),
						action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } },
					},
					{
						id: "step-1-continue-after-missing-epics-file",
						trigger: epicsDocumentFallbackAccepted(),
						action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } },
					},
					{
						id: "step-1-complete-after-missing-source-end-workflow",
						trigger: { kind: "always" },
						action: { kind: "complete_workflow" },
					},
				],
			},
			"step-1-transition-to-step-2": {
				id: "step-1-transition-to-step-2",
				routes: [
					{
						id: "step-1-transition-step-2",
						trigger: { kind: "always" },
						action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } },
					},
				],
			},
		},
	}
}

function buildStep2DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-2-allocate-change-management-plan",
		branches: {
			"step-2-allocate-change-management-plan": {
				id: "step-2-allocate-change-management-plan",
				routes: [
					{
						id: "step-2-allocate-change-management-plan",
						trigger: { kind: "always" },
						action: {
							kind: "allocate_artifact",
							artifactId: CORRECT_COURSE_CHANGE_MANAGEMENT_PLAN_ARTIFACT_ID,
						},
						followingBranchId: "step-2-await-artifact-allocation",
					},
				],
			},
			"step-2-await-artifact-allocation": {
				id: "step-2-await-artifact-allocation",
				routes: [
					{
						id: "step-2-build-change-management-plan",
						trigger: toolBackedOperationSucceeded(
							"step-2-allocate-change-management-plan",
							"step-2-allocate-change-management-plan",
						),
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: CORRECT_COURSE_CHANGE_MANAGEMENT_PLAN_ARTIFACT_ID,
								buildContent: buildInitialCorrectCourseDocument,
							},
						},
						followingBranchId: "step-2-await-document-build",
					},
					{
						id: "step-2-fail-artifact-allocation",
						trigger: toolBackedOperationFailed(
							"step-2-allocate-change-management-plan",
							"step-2-allocate-change-management-plan",
						),
						action: {
							kind: "run_deterministic_procedure",
							instruction: { run: failWithToolBackedOperationReason },
						},
					},
				],
			},
			"step-2-await-document-build": {
				id: "step-2-await-document-build",
				routes: [
					{
						id: "step-2-transition-to-step-3",
						trigger: toolBackedOperationSucceeded(
							"step-2-await-artifact-allocation",
							"step-2-build-change-management-plan",
						),
						action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 3 } },
					},
					{
						id: "step-2-fail-document-build",
						trigger: toolBackedOperationFailed(
							"step-2-await-artifact-allocation",
							"step-2-build-change-management-plan",
						),
						action: {
							kind: "run_deterministic_procedure",
							instruction: { run: failWithToolBackedOperationReason },
						},
					},
				],
			},
		},
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
						action: { kind: "project_prompt" },
						followingBranchId: "step-3-await-attempt-completion",
					},
				],
			},
			"step-3-await-attempt-completion": {
				id: "step-3-await-attempt-completion",
				routes: [
					{
						id: "step-3-complete-after-attempt-completion",
						trigger: { kind: "on_event", eventKind: "attempt_completion_succeeded" },
						action: { kind: "complete_workflow" },
					},
				],
			},
		},
	}
}

export const correctCourseWorkflowDefinition: WorkflowDefinition = {
	name: CORRECT_COURSE_WORKFLOW_NAME,
	displayName: CORRECT_COURSE_WORKFLOW_DISPLAY_NAME,
	description: CORRECT_COURSE_WORKFLOW_DESCRIPTION,
	slashCommandName: CORRECT_COURSE_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: CORRECT_COURSE_WORKFLOW_USE_SKILL_NAME,
	persona: CORRECT_COURSE_WORKFLOW_PERSONA,
	projectSelection: { kind: "interactive" },
	projectOutputPlacement: { kind: "selected_project_subfolder", subfolder: CORRECT_COURSE_WORKFLOW_PROJECT_SUBFOLDER },
	workflowValueKeys: CORRECT_COURSE_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: CORRECT_COURSE_ENTRY_PROJECT_VALUE_KEYS,
	entryPanel: { promptMarkdown: CORRECT_COURSE_WORKFLOW_DESCRIPTION },
	prerequisiteFiles: CORRECT_COURSE_PREREQUISITE_FILES,
	workflowForms: { [CORRECT_COURSE_STEP_1_FORM_ID]: buildCorrectCourseStep1WorkflowForm() },
	artifacts: CORRECT_COURSE_ARTIFACTS,
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Identify the Issue",
			decisionTree: buildStep1DecisionTree(),
			buildToolSchema: buildCorrectCourseStep1ToolSchemas,
		}),
		"step-2": createStepDefinition({
			stepNumber: 2,
			checklistLabel: "Generate Change Management Document",
			decisionTree: buildStep2DecisionTree(),
			buildToolSchema: buildCorrectCourseStep2ToolSchemas,
		}),
		"step-3": createStepDefinition({
			stepNumber: 3,
			checklistLabel: "Assess Issue & Build Plan",
			decisionTree: buildStep3DecisionTree(),
			buildPromptSource: buildStep3PromptSource,
			buildToolSchema: buildCorrectCourseStep3ToolSchemas,
			promptTemplates: [
				CORRECT_COURSE_STEP_3_BASE_PROMPT_TEMPLATE,
				CORRECT_COURSE_STEP_3_EPIC_SOURCE_PROMPT_TEMPLATE,
				CORRECT_COURSE_STEP_3_STORY_SOURCE_PROMPT_TEMPLATE,
				CORRECT_COURSE_STEP_3_FINAL_PROMPT_TEMPLATE,
			],
		}),
	},
}
