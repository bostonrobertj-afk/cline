import { access, readdir, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { WorkflowFormDefinitionPayload } from "@shared/ExtensionMessage"
import type { WorkflowStoryIndex, WorkflowStoryIndexEntry, WorkflowStoryStatus } from "../../storyArtifacts"
import { buildEpicStoriesIndexFilename, parseWorkflowStoryIndexJson } from "../../storyArtifacts"
import type {
	ActiveWorkflowSession,
	WorkflowDecisionBranchTrigger,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowDeterministicProcedureResult,
	WorkflowPersonaDefinition,
	WorkflowStepDefinition,
	WorkflowStepPromptSource,
	WorkflowValues,
} from "../../types"
import { buildCreateStoryStep1ToolSchemas } from "./createStoryToolSchemas"

export const CREATE_STORY_WORKFLOW_NAME = "create-story"
export const CREATE_STORY_WORKFLOW_DISPLAY_NAME = "Create Story"
export const CREATE_STORY_WORKFLOW_SLASH_COMMAND_NAME = "create-story"
export const CREATE_STORY_WORKFLOW_USE_SKILL_NAME = "create-story"
export const CREATE_STORY_WORKFLOW_PROJECT_SUBFOLDER = "planning"
export const CREATE_STORY_WORKFLOW_DESCRIPTION =
	"Prepare an existing draft or backlog story file for implementation by adding or revising actionable tasks and subtasks."
export const CREATE_STORY_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "Bob",
	role: "Scrum Master",
	identity: "Produces clear, actionable stories that are ready for implementation.",
	capabilities: ["Story validation", "story task and subtask authoring"],
	communicationStyle: "Crisp, checklist-driven, and ambiguity-free.",
	principles: ["Always assess runtime code and trace seams end-to-end to ensure task coverage is comprehensive."],
}

export enum CreateStoryWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	ArchitectureDocument = "architecture_document",
	EpicsDocument = "epics_document",
	EpicsIndex = "epics_index",
	BrainstormingDocument = "brainstorming_document",
	TargetEpic = "target_epic",
	EpicIdentity = "epic_identity",
	StoriesIndex = "stories_index",
	SelectedStoryIdentity = "selected_story_identity",
	SelectedStoryFileName = "selected_story_file_name",
	SelectedStoryType = "selected_story_type",
	SelectedStoryStatus = "selected_story_status",
	SelectedStoryFileGenerated = "selected_story_file_generated",
	TargetStory = "target_story",
	ParentStoryIdentity = "parent_story_identity",
	ParentStory = "parent_story",
	FindingsDocument = "findings_document",
	ReviseBacklogStory = "revise_backlog_story",
	TargetStoryFilenameForMove = "target_story_filename_for_move",
}

export const CREATE_STORY_WORKFLOW_VALUE_KEYS: readonly CreateStoryWorkflowValueKey[] = Object.values(CreateStoryWorkflowValueKey)

export const CREATE_STORY_ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: CreateStoryWorkflowValueKey.ProjectMode,
	projectTitle: CreateStoryWorkflowValueKey.ProjectTitle,
	projectFolderName: CreateStoryWorkflowValueKey.ProjectFolderName,
} as const

export const CREATE_STORY_ARCHITECTURE_PREREQUISITE_ID = CreateStoryWorkflowValueKey.ArchitectureDocument
export const CREATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID = CreateStoryWorkflowValueKey.EpicsDocument
export const CREATE_STORY_EPICS_INDEX_PREREQUISITE_ID = CreateStoryWorkflowValueKey.EpicsIndex
export const CREATE_STORY_BRAINSTORMING_PREREQUISITE_ID = CreateStoryWorkflowValueKey.BrainstormingDocument

export const CREATE_STORY_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]> = {
	[CREATE_STORY_ARCHITECTURE_PREREQUISITE_ID]: {
		id: CREATE_STORY_ARCHITECTURE_PREREQUISITE_ID,
		requirement: "required",
		producingWorkflowName: "create-architecture",
		projectSubfolderSegments: ["planning"],
		match: { kind: "exact_filename", filename: "architecture.md" },
		workflowValueKey: CreateStoryWorkflowValueKey.ArchitectureDocument,
		outputDocumentReference: "none",
	},
	[CREATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID]: {
		id: CREATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID,
		requirement: "required",
		producingWorkflowName: "create-epics",
		projectSubfolderSegments: ["planning"],
		match: { kind: "exact_filename", filename: "Epics.md" },
		workflowValueKey: CreateStoryWorkflowValueKey.EpicsDocument,
		outputDocumentReference: "none",
	},
	[CREATE_STORY_EPICS_INDEX_PREREQUISITE_ID]: {
		id: CREATE_STORY_EPICS_INDEX_PREREQUISITE_ID,
		requirement: "required",
		producingWorkflowName: "create-epics",
		projectSubfolderSegments: ["planning"],
		match: { kind: "exact_filename", filename: "Epics.index.json" },
		workflowValueKey: CreateStoryWorkflowValueKey.EpicsIndex,
		outputDocumentReference: "none",
	},
	[CREATE_STORY_BRAINSTORMING_PREREQUISITE_ID]: {
		id: CREATE_STORY_BRAINSTORMING_PREREQUISITE_ID,
		requirement: "optional",
		producingWorkflowName: "brainstorming",
		projectSubfolderSegments: ["discovery"],
		match: { kind: "exact_filename", filename: "brainstorming.md" },
		workflowValueKey: CreateStoryWorkflowValueKey.BrainstormingDocument,
		outputDocumentReference: "none",
	},
}

interface CreateStoryEpicsIndexEntry {
	identity: string
	title: string
}

interface CreateStoryEpicsIndexJson {
	version: 1
	epics: readonly CreateStoryEpicsIndexEntry[]
}

const POSITIVE_NUMERIC_ID_PATTERN = /^[1-9]\d*$/
export const CREATE_STORY_TARGET_EPIC_FORM_ID = "step-1-target-epic-form"
export const CREATE_STORY_STORY_SELECTION_FORM_ID = "step-1-story-selection-form"
export const CREATE_STORY_CANNOT_CONTINUE_FORM_ID = "step-1-cannot-continue-form"
export const CREATE_STORY_PANEL_A_TARGET_EPIC_ID = "step-1-panel-a-target-epic"
export const CREATE_STORY_PANEL_B_TARGET_STORY_ID = "step-1-panel-b-target-story"
export const CREATE_STORY_PANEL_C_BACKLOG_REVISION_ID = "step-1-panel-c-backlog-revision"
export const CREATE_STORY_PANEL_D_NO_REVISION_CONFIRMATION_ID = "step-1-panel-d-no-revision-confirmation"
export const CREATE_STORY_PANEL_E_IMPLEMENTED_STORY_BLOCKED_ID = "step-1-panel-e-implemented-story-blocked"
export const CREATE_STORY_MISSING_STORY_INDEX_PANEL_ID = "step-1-missing-story-index"
export const CREATE_STORY_STORY_FILE_NOT_GENERATED_PANEL_ID = "step-1-story-file-not-generated"
const STORY_STATUS_FOLDER_SEGMENTS: Readonly<Record<WorkflowStoryStatus, readonly string[]>> = {
	draft: ["implementation", "drafts"],
	backlog: ["implementation", "stories-backlog"],
	review: ["implementation", "stories-review"],
	complete: ["implementation", "stories-complete"],
}

function buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"] {
	return {
		type: "conditional",
		conditionSourceKey: "__terminal__",
		branches: [],
		defaultTerminal: true,
	}
}

function createEmptyPromptSource(): WorkflowStepPromptSource {
	return {}
}

function createStepDefinition(args: {
	stepNumber: 1
	checklistLabel: string
	decisionTree: WorkflowDecisionTree
	buildToolSchema: WorkflowStepDefinition["buildToolSchema"]
}): WorkflowStepDefinition {
	return {
		id: `step-${args.stepNumber}`,
		stepNumber: args.stepNumber,
		checklistLabel: args.checklistLabel,
		buildPromptSource: createEmptyPromptSource,
		buildToolSchema: args.buildToolSchema,
		decisionTree: args.decisionTree,
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && Array.isArray(value) === false
}

function parseCreateStoryEpicsIndexEntry(value: unknown): CreateStoryEpicsIndexEntry | undefined {
	if (isRecord(value) === false) {
		return undefined
	}

	const identity = value.identity
	const title = value.title
	if (typeof identity !== "string" || typeof title !== "string") {
		return undefined
	}

	const trimmedIdentity = identity.trim()
	const trimmedTitle = title.trim()
	if (POSITIVE_NUMERIC_ID_PATTERN.test(trimmedIdentity) === false || trimmedTitle.length === 0) {
		return undefined
	}

	return {
		identity: trimmedIdentity,
		title: trimmedTitle,
	}
}

function parseCreateStoryEpicsIndexJson(rawJson: string): CreateStoryEpicsIndexJson {
	let parsedJson: unknown
	try {
		parsedJson = JSON.parse(rawJson)
	} catch (error) {
		const detail = error instanceof Error ? ` ${error.message}` : ""
		throw new Error(`Create Story Epics.index.json is malformed JSON.${detail}`)
	}

	if (isRecord(parsedJson) === false || parsedJson.version !== 1 || Array.isArray(parsedJson.epics) === false) {
		throw new Error("Create Story Epics.index.json must contain version 1 and an epics array.")
	}

	const epics: CreateStoryEpicsIndexEntry[] = []
	for (const epicValue of parsedJson.epics) {
		const epic = parseCreateStoryEpicsIndexEntry(epicValue)
		if (epic === undefined) {
			throw new Error("Create Story Epics.index.json contains an invalid epic entry.")
		}
		epics.push(epic)
	}

	if (epics.length === 0) {
		throw new Error("Create Story Epics.index.json must contain at least one epic.")
	}

	return {
		version: 1,
		epics,
	}
}

function readWorkflowStringValue(workflowValues: WorkflowValues, key: CreateStoryWorkflowValueKey): string | undefined {
	const value = workflowValues[key]
	if (typeof value !== "string") {
		return undefined
	}

	const trimmedValue = value.trim()
	return trimmedValue.length > 0 ? trimmedValue : undefined
}

function readWorkflowBooleanValue(workflowValues: WorkflowValues, key: CreateStoryWorkflowValueKey): boolean | undefined {
	const value = workflowValues[key]
	return typeof value === "boolean" ? value : undefined
}

function workflowFormCompleted(workflowFormId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_form_completed" && triggerEvent.workflowFormId === workflowFormId,
	}
}

function workflowValuesPersistedForSelectedEpicWithStoriesIndex(): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "workflow_values_persisted" &&
			triggerEvent.changedKeys.includes(CreateStoryWorkflowValueKey.TargetEpic) &&
			readWorkflowStringValue(workflowValues, CreateStoryWorkflowValueKey.StoriesIndex) !== undefined,
	}
}

function workflowValuesPersistedForSelectedEpicWithoutStoriesIndex(): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "workflow_values_persisted" &&
			triggerEvent.changedKeys.includes(CreateStoryWorkflowValueKey.TargetEpic) &&
			readWorkflowStringValue(workflowValues, CreateStoryWorkflowValueKey.StoriesIndex) === undefined,
	}
}

function selectedStoryMetadataChanged(changedKeys: readonly string[]): boolean {
	return [
		CreateStoryWorkflowValueKey.SelectedStoryFileName,
		CreateStoryWorkflowValueKey.SelectedStoryType,
		CreateStoryWorkflowValueKey.SelectedStoryStatus,
		CreateStoryWorkflowValueKey.SelectedStoryFileGenerated,
	].some((key) => changedKeys.includes(key))
}

function workflowValuesPersistedForSelectedStoryWithoutGeneratedFile(): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "workflow_values_persisted" &&
			selectedStoryMetadataChanged(triggerEvent.changedKeys) &&
			readWorkflowBooleanValue(workflowValues, CreateStoryWorkflowValueKey.SelectedStoryFileGenerated) === false,
	}
}

function workflowValuesPersistedForSelectedStoryStatus(
	...statuses: readonly WorkflowStoryStatus[]
): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) => {
			if (
				triggerEvent.kind !== "workflow_values_persisted" ||
				selectedStoryMetadataChanged(triggerEvent.changedKeys) === false ||
				readWorkflowBooleanValue(workflowValues, CreateStoryWorkflowValueKey.SelectedStoryFileGenerated) !== true
			) {
				return false
			}

			const selectedStoryStatus = readWorkflowStringValue(workflowValues, CreateStoryWorkflowValueKey.SelectedStoryStatus)
			return statuses.some((status) => selectedStoryStatus === status)
		},
	}
}

function workflowValuesPersistedForTargetStory(): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_values_persisted" &&
			triggerEvent.changedKeys.includes(CreateStoryWorkflowValueKey.TargetStory),
	}
}

function workflowFormCompletedWithoutBacklogRevision(workflowFormId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "workflow_form_completed" &&
			triggerEvent.workflowFormId === workflowFormId &&
			readWorkflowBooleanValue(workflowValues, CreateStoryWorkflowValueKey.ReviseBacklogStory) === undefined,
	}
}

function workflowFormCompletedWithBacklogRevisionAnswer(workflowFormId: string, answer: boolean): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "workflow_form_completed" &&
			triggerEvent.workflowFormId === workflowFormId &&
			readWorkflowBooleanValue(workflowValues, CreateStoryWorkflowValueKey.ReviseBacklogStory) === answer,
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

function resolveSelectedProjectRootFromEpicsIndex(epicsIndex: string): string {
	return dirname(dirname(epicsIndex))
}

async function readCreateStoryEpicsIndex(epicsIndex: string): Promise<CreateStoryEpicsIndexJson> {
	return parseCreateStoryEpicsIndexJson(await readFile(epicsIndex, "utf8"))
}

function resolveStoriesIndexPath(args: { epicsIndex: string; epicIdentity: string }): string {
	return join(
		resolveSelectedProjectRootFromEpicsIndex(args.epicsIndex),
		"implementation",
		buildEpicStoriesIndexFilename(args.epicIdentity),
	)
}

async function readSelectedStoryIndex(storiesIndex: string): Promise<WorkflowStoryIndex> {
	return parseWorkflowStoryIndexJson(await readFile(storiesIndex, "utf8"))
}

function findStoryIndexEntry(args: {
	storyIndex: WorkflowStoryIndex
	storyIdentity: string
}): WorkflowStoryIndexEntry | undefined {
	return args.storyIndex.stories.find((story) => story.story_identity === args.storyIdentity)
}

function resolveStoryFilePath(args: { selectedProjectRoot: string; story: WorkflowStoryIndexEntry }): string {
	return join(args.selectedProjectRoot, ...STORY_STATUS_FOLDER_SEGMENTS[args.story.status], args.story.story_file_name)
}

function buildReviewFindingsDocumentFilenames(parentStoryIdentity: string): readonly string[] {
	const targetIdentity = parentStoryIdentity.replace(/\./g, "-")
	return [
		`Review-blind-hunter-${targetIdentity}.md`,
		`Review-edge-case-hunter-${targetIdentity}.md`,
		`Adversarial-review-${targetIdentity}.md`,
	]
}

async function resolveReviewFindingsDocumentPath(args: {
	selectedProjectRoot: string
	parentStoryIdentity: string
}): Promise<string> {
	const reviewFolder = join(args.selectedProjectRoot, "review")
	const expectedFilenames = new Set(buildReviewFindingsDocumentFilenames(args.parentStoryIdentity))
	let reviewEntries: string[]
	try {
		reviewEntries = await readdir(reviewFolder)
	} catch (error) {
		const detail = error instanceof Error ? ` ${error.message}` : ""
		throw new Error(`Unable to read review folder while resolving remediation findings document.${detail}`)
	}

	const matchingFilenames = reviewEntries.filter((entryName) => expectedFilenames.has(entryName))
	if (matchingFilenames.length === 0) {
		throw new Error(
			`Unable to locate a review findings document for parent story ${args.parentStoryIdentity} in ${reviewFolder}.`,
		)
	}
	if (matchingFilenames.length > 1) {
		throw new Error(`Multiple review findings documents matched parent story ${args.parentStoryIdentity} in ${reviewFolder}.`)
	}

	const matchingFilename = matchingFilenames[0]
	if (matchingFilename === undefined) {
		throw new Error(`Unable to resolve review findings document for parent story ${args.parentStoryIdentity}.`)
	}

	return join(reviewFolder, matchingFilename)
}

async function deriveRemediationContextValueWrites(args: {
	selectedProjectRoot: string
	storyIndex: WorkflowStoryIndex
	selectedStory: WorkflowStoryIndexEntry
}): Promise<WorkflowValues> {
	if (args.selectedStory.story_type !== "remediation") {
		return {}
	}

	const parentStoryIdentity = args.selectedStory.parent_story_identity
	if (parentStoryIdentity === null) {
		throw new Error(`Remediation story ${args.selectedStory.story_identity} is missing parent_story_identity.`)
	}

	const parentStory = findStoryIndexEntry({
		storyIndex: args.storyIndex,
		storyIdentity: parentStoryIdentity,
	})
	if (parentStory === undefined) {
		throw new Error(
			`Remediation story ${args.selectedStory.story_identity} references missing parent story ${parentStoryIdentity}.`,
		)
	}

	const parentStoryPath = resolveStoryFilePath({
		selectedProjectRoot: args.selectedProjectRoot,
		story: parentStory,
	})
	if ((await pathExists(parentStoryPath)) === false) {
		throw new Error(`Remediation parent story file does not exist: ${parentStoryPath}`)
	}

	const findingsDocument = await resolveReviewFindingsDocumentPath({
		selectedProjectRoot: args.selectedProjectRoot,
		parentStoryIdentity,
	})

	return {
		[CreateStoryWorkflowValueKey.ParentStoryIdentity]: parentStoryIdentity,
		[CreateStoryWorkflowValueKey.ParentStory]: parentStoryPath,
		[CreateStoryWorkflowValueKey.FindingsDocument]: findingsDocument,
	}
}

function resolveRequiredSelectedProjectRoot(session: ActiveWorkflowSession): string {
	const epicsIndex = readWorkflowStringValue(session.workflowValues, CreateStoryWorkflowValueKey.EpicsIndex)
	if (epicsIndex !== undefined) {
		return resolveSelectedProjectRootFromEpicsIndex(epicsIndex)
	}

	throw new Error("Create Story requires a resolved Epics.index.json path before resolving story paths.")
}

function buildStep1TargetEpicWorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Create Story Target Epic",
		toolDictionaryTitle: "Create Story Target Epic",
		toolDictionaryMarkdown: "Select the epic whose story should be prepared for implementation.",
		firstPanelId: CREATE_STORY_PANEL_A_TARGET_EPIC_ID,
		panels: {
			[CREATE_STORY_PANEL_A_TARGET_EPIC_ID]: {
				panelId: CREATE_STORY_PANEL_A_TARGET_EPIC_ID,
				title: "Target Epic",
				promptMarkdown: "Which epic are we focusing on during this workflow?",
				fields: [
					{
						key: CreateStoryWorkflowValueKey.EpicIdentity,
						workflowValueKey: CreateStoryWorkflowValueKey.EpicIdentity,
						kind: "dropdown",
						label: "Target epic",
						required: true,
						allowedValueType: "string",
						jsonOptionsSource: {
							root: {
								kind: "selected_project_root",
							},
							sourcePathSegments: ["planning", "Epics.index.json"],
							itemsPath: "epics",
							valueProperty: "identity",
							labelTemplate: "Epic {identity}: {title}",
							descriptionTemplate: "Story index generated: {story-index-generated}",
						},
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "Continue",
				},
				transition: buildTerminalTransition(),
			},
		},
	}
}

function buildStep1StorySelectionWorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Create Story Story Selection",
		toolDictionaryTitle: "Create Story Story Selection",
		toolDictionaryMarkdown: "Select the story that should be prepared or revised for implementation.",
		firstPanelId: CREATE_STORY_PANEL_B_TARGET_STORY_ID,
		panels: {
			[CREATE_STORY_PANEL_B_TARGET_STORY_ID]: {
				panelId: CREATE_STORY_PANEL_B_TARGET_STORY_ID,
				title: "Target Story",
				promptMarkdown: "Which story should I focus on during this workflow?",
				fields: [
					{
						key: CreateStoryWorkflowValueKey.SelectedStoryIdentity,
						workflowValueKey: CreateStoryWorkflowValueKey.SelectedStoryIdentity,
						kind: "dropdown",
						label: "Target story",
						required: true,
						allowedValueType: "string",
						jsonOptionsSource: {
							root: {
								kind: "selected_project_root",
							},
							sourcePathSegments: ["implementation", "epic-{workflow.epic_identity}-stories.index.json"],
							itemsPath: "stories",
							valueProperty: "story_identity",
							labelTemplate: "Story {story_identity}: {story_file_name}",
							descriptionTemplate: "Status: {status}; generated: {story_file_generated}; type: {story_type}",
						},
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "Continue",
				},
				transition: buildTerminalTransition(),
			},
			[CREATE_STORY_PANEL_C_BACKLOG_REVISION_ID]: {
				panelId: CREATE_STORY_PANEL_C_BACKLOG_REVISION_ID,
				title: "Backlog Story Revision",
				promptMarkdown:
					"The selected story appears to be ready for implementation. Do you want to revise the existing tasks and subtasks before implementing it via the dev-story workflow?",
				fields: [
					{
						key: CreateStoryWorkflowValueKey.ReviseBacklogStory,
						workflowValueKey: CreateStoryWorkflowValueKey.ReviseBacklogStory,
						kind: "boolean",
						label: "Revise backlog story",
						required: true,
						allowedValueType: "boolean",
						trueLabel: "Yes",
						falseLabel: "No",
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Back",
				},
				backDestinationPanelId: CREATE_STORY_PANEL_B_TARGET_STORY_ID,
				backStaleValueKeysToClear: [CreateStoryWorkflowValueKey.ReviseBacklogStory],
				transition: buildTerminalTransition(),
			},
			[CREATE_STORY_PANEL_D_NO_REVISION_CONFIRMATION_ID]: {
				panelId: CREATE_STORY_PANEL_D_NO_REVISION_CONFIRMATION_ID,
				title: "Ready for Dev Story",
				promptMarkdown:
					"Since the selected story already has been populated with tasks and subtasks, your next step is to run the dev-story workflow and select this story as the implementation target.",
				fields: [
					{
						key: "ready_for_dev_story_confirmation",
						kind: "static_notice",
						label: "Ready for dev-story",
						required: false,
						contentMarkdown:
							"Confirm when you are ready to complete this workflow and continue with the dev-story workflow.",
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "Complete",
				},
				transition: buildTerminalTransition(),
			},
			[CREATE_STORY_PANEL_E_IMPLEMENTED_STORY_BLOCKED_ID]: {
				panelId: CREATE_STORY_PANEL_E_IMPLEMENTED_STORY_BLOCKED_ID,
				title: "Story Already Implemented",
				promptMarkdown:
					"This story has already been implemented. New tasks should not be added to stories after implementation. If findings were documented during QA, the QA agent generated a remediation story to address those findings. Please go back and select the appropriate remediation story as the target for this workflow.",
				fields: [],
				allowedActions: ["back"],
				actionLabels: {
					back: "Back",
				},
				backDestinationPanelId: CREATE_STORY_PANEL_B_TARGET_STORY_ID,
				transition: buildTerminalTransition(),
			},
		},
	}
}

function buildCannotContinuePanel(args: {
	panelId: string
	title: string
	promptMarkdown: string
}): WorkflowFormDefinitionPayload["panels"][string] {
	return {
		panelId: args.panelId,
		title: args.title,
		promptMarkdown: args.promptMarkdown,
		fields: [],
		allowedActions: ["submit"],
		actionLabels: {
			submit: "Close",
		},
		transition: buildTerminalTransition(),
	}
}

function buildStep1CannotContinueWorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Create Story Cannot Continue",
		toolDictionaryTitle: "Create Story Cannot Continue",
		toolDictionaryMarkdown: "The create-story workflow cannot continue until upstream planning is complete.",
		firstPanelId: CREATE_STORY_MISSING_STORY_INDEX_PANEL_ID,
		panels: {
			[CREATE_STORY_MISSING_STORY_INDEX_PANEL_ID]: buildCannotContinuePanel({
				panelId: CREATE_STORY_MISSING_STORY_INDEX_PANEL_ID,
				title: "Story Index Missing",
				promptMarkdown:
					"The selected epic does not yet have a story index file. Run the pi-planning workflow to generate the selected epic's story index before running create-story.",
			}),
			[CREATE_STORY_STORY_FILE_NOT_GENERATED_PANEL_ID]: buildCannotContinuePanel({
				panelId: CREATE_STORY_STORY_FILE_NOT_GENERATED_PANEL_ID,
				title: "Story File Missing",
				promptMarkdown:
					"The selected story does not yet have a generated story file. Run the pi-planning workflow to generate a story file for the target story before running create-story.",
			}),
		},
	}
}

async function deriveSelectedEpicValuesFromForm(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult> {
	const epicIdentity = readWorkflowStringValue(session.workflowValues, CreateStoryWorkflowValueKey.EpicIdentity)
	const epicsIndex = readWorkflowStringValue(session.workflowValues, CreateStoryWorkflowValueKey.EpicsIndex)
	if (epicIdentity === undefined || epicsIndex === undefined) {
		return {
			kind: "failed",
			errorMessage: "Create Story requires a selected epic identity and resolved Epics.index.json path.",
		}
	}

	let epicsIndexJson: CreateStoryEpicsIndexJson
	try {
		epicsIndexJson = await readCreateStoryEpicsIndex(epicsIndex)
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error."
		return {
			kind: "failed",
			errorMessage: `Unable to read Create Story Epics.index.json: ${errorMessage}`,
		}
	}

	const selectedEpic = epicsIndexJson.epics.find((epic) => epic.identity === epicIdentity)
	if (selectedEpic === undefined) {
		return {
			kind: "failed",
			errorMessage: `Create Story selected epic ${epicIdentity} was not found in Epics.index.json.`,
		}
	}

	const storiesIndex = resolveStoriesIndexPath({
		epicsIndex,
		epicIdentity: selectedEpic.identity,
	})
	const workflowValueWrites: WorkflowValues = {
		[CreateStoryWorkflowValueKey.TargetEpic]: `Epic ${selectedEpic.identity}: ${selectedEpic.title}`,
	}
	if ((await pathExists(storiesIndex)) === true) {
		workflowValueWrites[CreateStoryWorkflowValueKey.StoriesIndex] = storiesIndex
	}

	return {
		kind: "succeeded",
		workflowValueWrites,
	}
}

async function deriveSelectedStoryValuesFromForm(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult> {
	const storiesIndex = readWorkflowStringValue(session.workflowValues, CreateStoryWorkflowValueKey.StoriesIndex)
	const selectedStoryIdentity = readWorkflowStringValue(
		session.workflowValues,
		CreateStoryWorkflowValueKey.SelectedStoryIdentity,
	)
	if (storiesIndex === undefined || selectedStoryIdentity === undefined) {
		return {
			kind: "failed",
			errorMessage: "Create Story requires a story index and selected story identity.",
		}
	}

	let storyIndex: WorkflowStoryIndex
	try {
		storyIndex = await readSelectedStoryIndex(storiesIndex)
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error."
		return {
			kind: "failed",
			errorMessage: `Unable to read selected story index: ${errorMessage}`,
		}
	}

	const selectedStory = findStoryIndexEntry({
		storyIndex,
		storyIdentity: selectedStoryIdentity,
	})
	if (selectedStory === undefined) {
		return {
			kind: "failed",
			errorMessage: `Create Story selected story ${selectedStoryIdentity} was not found in the selected story index.`,
		}
	}

	return {
		kind: "succeeded",
		workflowValueWrites: {
			[CreateStoryWorkflowValueKey.SelectedStoryFileName]: selectedStory.story_file_name,
			[CreateStoryWorkflowValueKey.SelectedStoryType]: selectedStory.story_type,
			[CreateStoryWorkflowValueKey.SelectedStoryStatus]: selectedStory.status,
			[CreateStoryWorkflowValueKey.SelectedStoryFileGenerated]: selectedStory.story_file_generated,
		},
	}
}

async function deriveTargetStoryAndRemediationContext(
	session: ActiveWorkflowSession,
): Promise<WorkflowDeterministicProcedureResult> {
	const storiesIndex = readWorkflowStringValue(session.workflowValues, CreateStoryWorkflowValueKey.StoriesIndex)
	const selectedStoryIdentity = readWorkflowStringValue(
		session.workflowValues,
		CreateStoryWorkflowValueKey.SelectedStoryIdentity,
	)
	if (storiesIndex === undefined || selectedStoryIdentity === undefined) {
		return {
			kind: "failed",
			errorMessage: "Create Story requires a story index and selected story identity before deriving target story paths.",
		}
	}

	let storyIndex: WorkflowStoryIndex
	try {
		storyIndex = await readSelectedStoryIndex(storiesIndex)
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error."
		return {
			kind: "failed",
			errorMessage: `Unable to read selected story index while deriving target story paths: ${errorMessage}`,
		}
	}

	const selectedStory = findStoryIndexEntry({
		storyIndex,
		storyIdentity: selectedStoryIdentity,
	})
	if (selectedStory === undefined) {
		return {
			kind: "failed",
			errorMessage: `Create Story selected story ${selectedStoryIdentity} was not found while deriving target story paths.`,
		}
	}
	if (selectedStory.story_file_generated === false) {
		return {
			kind: "failed",
			errorMessage: `Create Story selected story ${selectedStoryIdentity} does not have a generated story file.`,
		}
	}

	const selectedProjectRoot = resolveRequiredSelectedProjectRoot(session)
	const targetStory = resolveStoryFilePath({
		selectedProjectRoot,
		story: selectedStory,
	})

	let remediationContextWrites: WorkflowValues
	try {
		remediationContextWrites = await deriveRemediationContextValueWrites({
			selectedProjectRoot,
			storyIndex,
			selectedStory,
		})
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error."
		return {
			kind: "failed",
			errorMessage,
		}
	}

	return {
		kind: "succeeded",
		workflowValueWrites: {
			[CreateStoryWorkflowValueKey.TargetStory]: targetStory,
			[CreateStoryWorkflowValueKey.TargetStoryFilenameForMove]: selectedStory.story_file_name,
			...remediationContextWrites,
		},
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
						id: "step-1-resolve-prerequisites",
						trigger: { kind: "always" },
						action: {
							kind: "resolve_prerequisite_files",
							prerequisiteIds: [
								CREATE_STORY_ARCHITECTURE_PREREQUISITE_ID,
								CREATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID,
								CREATE_STORY_EPICS_INDEX_PREREQUISITE_ID,
								CREATE_STORY_BRAINSTORMING_PREREQUISITE_ID,
							],
						},
						followingBranchId: "step-1-render-target-epic-form",
					},
				],
			},
			"step-1-render-target-epic-form": {
				id: "step-1-render-target-epic-form",
				routes: [
					{
						id: "step-1-render-target-epic-form",
						trigger: { kind: "always" },
						action: {
							kind: "render_workflow_form",
							workflowFormId: CREATE_STORY_TARGET_EPIC_FORM_ID,
						},
						followingBranchId: "step-1-await-target-epic-form",
					},
				],
			},
			"step-1-await-target-epic-form": {
				id: "step-1-await-target-epic-form",
				routes: [
					{
						id: "step-1-derive-selected-epic-values",
						trigger: workflowFormCompleted(CREATE_STORY_TARGET_EPIC_FORM_ID),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveSelectedEpicValuesFromForm,
							},
						},
						followingBranchId: "step-1-await-selected-epic-values",
					},
				],
			},
			"step-1-await-selected-epic-values": {
				id: "step-1-await-selected-epic-values",
				routes: [
					{
						id: "step-1-render-story-selection-form",
						trigger: workflowValuesPersistedForSelectedEpicWithStoriesIndex(),
						action: {
							kind: "render_workflow_form",
							workflowFormId: CREATE_STORY_STORY_SELECTION_FORM_ID,
							startPanelId: CREATE_STORY_PANEL_B_TARGET_STORY_ID,
						},
						followingBranchId: "step-1-await-story-selection-form",
					},
					{
						id: "step-1-render-missing-story-index-form",
						trigger: workflowValuesPersistedForSelectedEpicWithoutStoriesIndex(),
						action: {
							kind: "render_workflow_form",
							workflowFormId: CREATE_STORY_CANNOT_CONTINUE_FORM_ID,
							startPanelId: CREATE_STORY_MISSING_STORY_INDEX_PANEL_ID,
						},
						followingBranchId: "step-1-await-cannot-continue-form",
					},
				],
			},
			"step-1-await-story-selection-form": {
				id: "step-1-await-story-selection-form",
				routes: [
					{
						id: "step-1-derive-selected-story-values",
						trigger: workflowFormCompleted(CREATE_STORY_STORY_SELECTION_FORM_ID),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveSelectedStoryValuesFromForm,
							},
						},
						followingBranchId: "step-1-await-selected-story-values",
					},
				],
			},
			"step-1-await-selected-story-values": {
				id: "step-1-await-selected-story-values",
				routes: [
					{
						id: "step-1-render-story-file-not-generated-form",
						trigger: workflowValuesPersistedForSelectedStoryWithoutGeneratedFile(),
						action: {
							kind: "render_workflow_form",
							workflowFormId: CREATE_STORY_CANNOT_CONTINUE_FORM_ID,
							startPanelId: CREATE_STORY_STORY_FILE_NOT_GENERATED_PANEL_ID,
						},
						followingBranchId: "step-1-await-cannot-continue-form",
					},
					{
						id: "step-1-derive-draft-target-story",
						trigger: workflowValuesPersistedForSelectedStoryStatus("draft"),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveTargetStoryAndRemediationContext,
							},
						},
						followingBranchId: "step-1-await-target-story-values",
					},
					{
						id: "step-1-render-backlog-revision-form",
						trigger: workflowValuesPersistedForSelectedStoryStatus("backlog"),
						action: {
							kind: "render_workflow_form",
							workflowFormId: CREATE_STORY_STORY_SELECTION_FORM_ID,
							startPanelId: CREATE_STORY_PANEL_C_BACKLOG_REVISION_ID,
						},
						followingBranchId: "step-1-await-backlog-revision-form",
					},
					{
						id: "step-1-render-implemented-story-blocked-form",
						trigger: workflowValuesPersistedForSelectedStoryStatus("review", "complete"),
						action: {
							kind: "render_workflow_form",
							workflowFormId: CREATE_STORY_STORY_SELECTION_FORM_ID,
							startPanelId: CREATE_STORY_PANEL_E_IMPLEMENTED_STORY_BLOCKED_ID,
						},
						followingBranchId: "step-1-await-blocked-story-form",
					},
				],
			},
			"step-1-await-target-story-values": {
				id: "step-1-await-target-story-values",
				routes: [
					{
						id: "step-1-transition-to-step-2",
						trigger: workflowValuesPersistedForTargetStory(),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 2,
							},
						},
					},
				],
			},
			"step-1-await-backlog-revision-form": {
				id: "step-1-await-backlog-revision-form",
				routes: [
					{
						id: "step-1-derive-backlog-target-story-after-revision-approved",
						trigger: workflowFormCompletedWithBacklogRevisionAnswer(CREATE_STORY_STORY_SELECTION_FORM_ID, true),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveTargetStoryAndRemediationContext,
							},
						},
						followingBranchId: "step-1-await-target-story-values",
					},
					{
						id: "step-1-render-no-revision-confirmation-form",
						trigger: workflowFormCompletedWithBacklogRevisionAnswer(CREATE_STORY_STORY_SELECTION_FORM_ID, false),
						action: {
							kind: "render_workflow_form",
							workflowFormId: CREATE_STORY_STORY_SELECTION_FORM_ID,
							startPanelId: CREATE_STORY_PANEL_D_NO_REVISION_CONFIRMATION_ID,
						},
						followingBranchId: "step-1-await-no-revision-confirmation-form",
					},
					{
						id: "step-1-derive-selected-story-values-after-backlog-back",
						trigger: workflowFormCompletedWithoutBacklogRevision(CREATE_STORY_STORY_SELECTION_FORM_ID),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveSelectedStoryValuesFromForm,
							},
						},
						followingBranchId: "step-1-await-selected-story-values",
					},
				],
			},
			"step-1-await-no-revision-confirmation-form": {
				id: "step-1-await-no-revision-confirmation-form",
				routes: [
					{
						id: "step-1-complete-workflow-after-no-revision-confirmation",
						trigger: workflowFormCompleted(CREATE_STORY_STORY_SELECTION_FORM_ID),
						action: {
							kind: "complete_workflow",
						},
					},
				],
			},
			"step-1-await-blocked-story-form": {
				id: "step-1-await-blocked-story-form",
				routes: [
					{
						id: "step-1-derive-selected-story-values-after-blocked-back",
						trigger: workflowFormCompleted(CREATE_STORY_STORY_SELECTION_FORM_ID),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveSelectedStoryValuesFromForm,
							},
						},
						followingBranchId: "step-1-await-selected-story-values",
					},
				],
			},
			"step-1-await-cannot-continue-form": {
				id: "step-1-await-cannot-continue-form",
				routes: [
					{
						id: "step-1-stop-after-cannot-continue-form",
						trigger: workflowFormCompleted(CREATE_STORY_CANNOT_CONTINUE_FORM_ID),
						action: {
							kind: "no_op",
						},
					},
				],
			},
		},
	}
}

export const createStoryWorkflowDefinition: WorkflowDefinition = {
	name: CREATE_STORY_WORKFLOW_NAME,
	displayName: CREATE_STORY_WORKFLOW_DISPLAY_NAME,
	description: CREATE_STORY_WORKFLOW_DESCRIPTION,
	slashCommandName: CREATE_STORY_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: CREATE_STORY_WORKFLOW_USE_SKILL_NAME,
	persona: CREATE_STORY_WORKFLOW_PERSONA,
	projectSubfolder: CREATE_STORY_WORKFLOW_PROJECT_SUBFOLDER,
	workflowValueKeys: CREATE_STORY_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: CREATE_STORY_ENTRY_PROJECT_VALUE_KEYS,
	entryPanel: {
		promptMarkdown: CREATE_STORY_WORKFLOW_DESCRIPTION,
	},
	workflowForms: {
		[CREATE_STORY_TARGET_EPIC_FORM_ID]: buildStep1TargetEpicWorkflowForm(),
		[CREATE_STORY_STORY_SELECTION_FORM_ID]: buildStep1StorySelectionWorkflowForm(),
		[CREATE_STORY_CANNOT_CONTINUE_FORM_ID]: buildStep1CannotContinueWorkflowForm(),
	},
	prerequisiteFiles: CREATE_STORY_PREREQUISITE_FILES,
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Gather Inputs",
			decisionTree: buildStep1DecisionTree(),
			buildToolSchema: buildCreateStoryStep1ToolSchemas,
		}),
	},
}
