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
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowStepPromptSource,
	WorkflowValues,
} from "../../types"
import {
	buildCreateStoryStep1ToolSchemas,
	buildCreateStoryStep2ToolSchemas,
	buildCreateStoryStep3ToolSchemas,
	buildCreateStoryStep4ToolSchemas,
} from "./createStoryToolSchemas"

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
	stepNumber: 1 | 2 | 3 | 4
	checklistLabel: string
	decisionTree: WorkflowDecisionTree
	buildPromptSource?: WorkflowStepDefinition["buildPromptSource"]
	buildToolSchema: WorkflowStepDefinition["buildToolSchema"]
}): WorkflowStepDefinition {
	return {
		id: `step-${args.stepNumber}`,
		stepNumber: args.stepNumber,
		checklistLabel: args.checklistLabel,
		buildPromptSource: args.buildPromptSource ?? createEmptyPromptSource,
		buildToolSchema: args.buildToolSchema,
		decisionTree: args.decisionTree,
	}
}

function renderWorkflowValueByKey(input: WorkflowPromptBuilderInput, key: CreateStoryWorkflowValueKey): string {
	return input.renderWorkflowValue(input.session.workflowValues[key] ?? key)
}

function buildStep2VariantInstructions(input: WorkflowPromptBuilderInput): string {
	const selectedStoryStatus = readWorkflowStringValue(
		input.session.workflowValues,
		CreateStoryWorkflowValueKey.SelectedStoryStatus,
	)
	const selectedStoryType = readWorkflowStringValue(input.session.workflowValues, CreateStoryWorkflowValueKey.SelectedStoryType)
	const reviseBacklogStory = readWorkflowBooleanValue(
		input.session.workflowValues,
		CreateStoryWorkflowValueKey.ReviseBacklogStory,
	)
	const targetStory = renderWorkflowValueByKey(input, CreateStoryWorkflowValueKey.TargetStory)

	if (selectedStoryStatus === "backlog" && reviseBacklogStory === true) {
		return `You are revising an existing story file at \`${targetStory}\`.
Ask the user to explain the required revisions before proposing changes, and ground any suggested revisions in provided context plus existing runtime code and tests.`
	}

	if (selectedStoryStatus === "draft" && selectedStoryType === "remediation") {
		const parentStory = renderWorkflowValueByKey(input, CreateStoryWorkflowValueKey.ParentStory)
		const findingsDocument = renderWorkflowValueByKey(input, CreateStoryWorkflowValueKey.FindingsDocument)
		return `You are preparing a remediation story file for implementation by adding tasks and subtasks.
Use parent story \`${parentStory}\` and findings document \`${findingsDocument}\` as required context.`
	}

	return `You are preparing a story file for implementation by adding tasks and subtasks.`
}

function buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const targetStory = renderWorkflowValueByKey(input, CreateStoryWorkflowValueKey.TargetStory)
	const architectureDocument = renderWorkflowValueByKey(input, CreateStoryWorkflowValueKey.ArchitectureDocument)
	const epicsDocument = renderWorkflowValueByKey(input, CreateStoryWorkflowValueKey.EpicsDocument)
	const brainstormingDocument = renderWorkflowValueByKey(input, CreateStoryWorkflowValueKey.BrainstormingDocument)
	const parentStory = renderWorkflowValueByKey(input, CreateStoryWorkflowValueKey.ParentStory)
	const findingsDocument = renderWorkflowValueByKey(input, CreateStoryWorkflowValueKey.FindingsDocument)

	return {
		currentStepInstructions: `${buildStep2VariantInstructions(input)}

Focus on \`${targetStory}\`.
Read \`${targetStory}\`.
Read \`${architectureDocument}\`.
Read \`${epicsDocument}\`.
Read \`${brainstormingDocument}\` when present.
For remediation stories, read \`${parentStory}\` and \`${findingsDocument}\`.

Ensure existing non-task story content fully aligns with project architecture and epics context.
For remediation stories, ensure the target remediation story aligns with the QA findings that produced it.
Identify conflicts or misalignment before task/subtask authoring begins.
Notify the user of conflicts, ambiguities, or missing information.
Work with the user to identify the appropriate resolution when a decision is needed.
Proceed only once the story objective, scope, scope boundary, requirements, and known issues/risks/technical-debt sections align with the provided project documentation.
For backlog revisions, ask the user to explain the required revisions and ground any suggested revisions in provided context and existing runtime code/tests.

		Call \`workflow_progress_request\` only after context review is complete and blocking issues are resolved or the user confirms the current context is sufficient.`,
	}
}

function buildStep3VariantInstructions(input: WorkflowPromptBuilderInput): string {
	const selectedStoryStatus = readWorkflowStringValue(
		input.session.workflowValues,
		CreateStoryWorkflowValueKey.SelectedStoryStatus,
	)
	const targetStory = renderWorkflowValueByKey(input, CreateStoryWorkflowValueKey.TargetStory)

	if (selectedStoryStatus === "backlog") {
		return `Review existing tasks and subtasks in \`${targetStory}\` and determine whether they satisfy all requirements, scope, scope boundary, objective, story instructions, test coverage expectations, and action-plan quality rules.`
	}

	return `Review runtime code and tests, then identify the full set of in-scope revisions needed to deliver the story's requirements and objective.`
}

function buildStep3PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const targetStory = renderWorkflowValueByKey(input, CreateStoryWorkflowValueKey.TargetStory)

	return {
		currentStepInstructions: `${buildStep3VariantInstructions(input)}

Inspect relevant runtime code and tests before authoring tasks and subtasks.
Trace any required existing artifact, placeholder, resolver, handler, runtime consumer, test, or document convention end to end.
Perform sibling-pattern audits for any new artifact, tool, schema entry, prompt/tool exposure, approval/path policy, test, snapshot, or canonical document surface.
Provide the user with the identified revision set before translating it into tasks and subtasks.

Author implementation-ready tasks and subtasks in \`${targetStory}\`.
Verify proposed tasks and subtasks for project standards, architecture fit, downstream impact, and code hygiene.
Prefer deep architectural fixes over surface workarounds.
Identify downstream or peripheral risks and propose follow-up mitigations where needed.
Avoid prescribing hardcoded values where configuration or constants are appropriate.
Prescribe removal of cruft and failed-attempt remnants when the story retires or replaces existing behavior.
Avoid \`any\`, broad type assertions, forced assertions, non-boolean boolean checks, stale domain naming, compatibility remaps for retired concepts, and other prohibited code-hygiene patterns.
Avoid introducing architecture not backed by upstream requirements or architecture documents.
Avoid in-plan churn by prescribing the final intended code shape directly.

Ensure the resulting story can end in a repo-valid intermediate state that passes focused tests, formatting, lint, and typecheck.
Ensure each task and subtask is ordered so no item depends on a later item.
Require each subtask to be scoped to a single revision in a single target file with specific allowed files.
		Ask the user to review the tasks/subtasks section in \`${targetStory}\`, refine based on feedback, and call \`workflow_progress_request\` only after the user is satisfied with that section.`,
	}
}

function buildStep4PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const targetStory = renderWorkflowValueByKey(input, CreateStoryWorkflowValueKey.TargetStory)

	return {
		currentStepInstructions: `Validate \`${targetStory}\` as a complete implementation handoff.

Verify every acceptance criterion is covered by one or more tasks.
Verify every task maps to a real part of the approved story scope.
Verify task order is executable and non-conflicting.
Verify no two tasks prescribe contradictory file changes or incompatible invariants.
Verify every planned code change has corresponding test-maintenance coverage where needed.
Verify stale assertions, mocks, snapshots, validators, and type contracts are accounted for when affected.
Verify task/subtask content remains aligned with story objective, scope, scope boundary, requirements, and general instructions.

If you detect ambiguity, contradiction, missing coverage, or unsafe handoff content, correct it when the correction does not require a new user decision. If correction requires a new decision, stop and ask the user.

Call \`attempt_completion\` only after validation passes and the story is complete and ready for implementation.`,
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

function workflowProgressRequestConfirmed(): WorkflowDecisionBranchTrigger {
	return {
		kind: "on_event",
		eventKind: "workflow_progress_request_confirmed",
	}
}

function workflowProgressRequestDenied(): WorkflowDecisionBranchTrigger {
	return {
		kind: "on_event",
		eventKind: "workflow_progress_request_denied",
	}
}

function attemptCompletionSucceededForSelectedStoryStatus(status: WorkflowStoryStatus): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "attempt_completion_succeeded" &&
			readWorkflowStringValue(workflowValues, CreateStoryWorkflowValueKey.SelectedStoryStatus) === status,
	}
}

function attemptCompletionSucceededForBacklogRevision(): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "attempt_completion_succeeded" &&
			readWorkflowStringValue(workflowValues, CreateStoryWorkflowValueKey.SelectedStoryStatus) === "backlog" &&
			readWorkflowBooleanValue(workflowValues, CreateStoryWorkflowValueKey.ReviseBacklogStory) === true,
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
						followingBranchId: "step-2-await-progress-request",
					},
				],
			},
			"step-2-await-progress-request": {
				id: "step-2-await-progress-request",
				routes: [
					{
						id: "step-2-transition-to-step-3",
						trigger: workflowProgressRequestConfirmed(),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 3,
							},
						},
					},
					{
						id: "step-2-return-to-project-prompt",
						trigger: workflowProgressRequestDenied(),
						action: {
							kind: "project_prompt",
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
						action: {
							kind: "project_prompt",
						},
						followingBranchId: "step-3-await-progress-request",
					},
				],
			},
			"step-3-await-progress-request": {
				id: "step-3-await-progress-request",
				routes: [
					{
						id: "step-3-transition-to-step-4",
						trigger: workflowProgressRequestConfirmed(),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 4,
							},
						},
					},
					{
						id: "step-3-return-to-project-prompt",
						trigger: workflowProgressRequestDenied(),
						action: {
							kind: "project_prompt",
						},
					},
				],
			},
		},
	}
}

function buildStep4DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-4-project-prompt",
		branches: {
			"step-4-project-prompt": {
				id: "step-4-project-prompt",
				routes: [
					{
						id: "step-4-project-prompt",
						trigger: { kind: "always" },
						action: {
							kind: "project_prompt",
						},
						followingBranchId: "step-4-await-attempt-completion",
					},
				],
			},
			"step-4-await-attempt-completion": {
				id: "step-4-await-attempt-completion",
				routes: [
					{
						id: "step-4-update-draft-story-status-to-backlog",
						trigger: attemptCompletionSucceededForSelectedStoryStatus("draft"),
						action: {
							kind: "update_story_index_status",
							storyIndexWorkflowValueKey: CreateStoryWorkflowValueKey.StoriesIndex,
							storyIdentityWorkflowValueKey: CreateStoryWorkflowValueKey.SelectedStoryIdentity,
							status: "backlog",
							expectedCurrentStatus: "draft",
						},
						followingBranchId: "step-4-await-draft-status-update",
					},
					{
						id: "step-4-confirm-backlog-story-status",
						trigger: attemptCompletionSucceededForBacklogRevision(),
						action: {
							kind: "update_story_index_status",
							storyIndexWorkflowValueKey: CreateStoryWorkflowValueKey.StoriesIndex,
							storyIdentityWorkflowValueKey: CreateStoryWorkflowValueKey.SelectedStoryIdentity,
							status: "backlog",
							expectedCurrentStatus: "backlog",
						},
						followingBranchId: "step-4-await-backlog-status-update",
					},
				],
			},
			"step-4-await-draft-status-update": {
				id: "step-4-await-draft-status-update",
				routes: [
					{
						id: "step-4-move-draft-story-to-backlog",
						trigger: toolBackedOperationSucceeded(
							"step-4-await-attempt-completion",
							"step-4-update-draft-story-status-to-backlog",
						),
						action: {
							kind: "move_project_file",
							sourceFolderSegments: ["implementation", "drafts"],
							destinationFolderSegments: ["implementation", "stories-backlog"],
							filenameWorkflowValueKey: CreateStoryWorkflowValueKey.TargetStoryFilenameForMove,
						},
						followingBranchId: "step-4-await-draft-story-move",
					},
					{
						id: "step-4-terminal-error-after-draft-status-update",
						trigger: toolBackedOperationFailed(
							"step-4-await-attempt-completion",
							"step-4-update-draft-story-status-to-backlog",
						),
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to update selected draft story status to backlog.",
						},
					},
				],
			},
			"step-4-await-draft-story-move": {
				id: "step-4-await-draft-story-move",
				routes: [
					{
						id: "step-4-complete-workflow-after-draft-story-move",
						trigger: toolBackedOperationSucceeded(
							"step-4-await-draft-status-update",
							"step-4-move-draft-story-to-backlog",
						),
						action: {
							kind: "complete_workflow",
						},
					},
					{
						id: "step-4-terminal-error-after-draft-story-move",
						trigger: toolBackedOperationFailed(
							"step-4-await-draft-status-update",
							"step-4-move-draft-story-to-backlog",
						),
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to move selected draft story to the implementation backlog.",
						},
					},
				],
			},
			"step-4-await-backlog-status-update": {
				id: "step-4-await-backlog-status-update",
				routes: [
					{
						id: "step-4-complete-workflow-after-backlog-status-confirmation",
						trigger: toolBackedOperationSucceeded(
							"step-4-await-attempt-completion",
							"step-4-confirm-backlog-story-status",
						),
						action: {
							kind: "complete_workflow",
						},
					},
					{
						id: "step-4-terminal-error-after-backlog-status-confirmation",
						trigger: toolBackedOperationFailed(
							"step-4-await-attempt-completion",
							"step-4-confirm-backlog-story-status",
						),
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to confirm selected backlog story status.",
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
		"step-2": createStepDefinition({
			stepNumber: 2,
			checklistLabel: "Review Context & Ensure Project Alignment",
			decisionTree: buildStep2DecisionTree(),
			buildPromptSource: buildStep2PromptSource,
			buildToolSchema: buildCreateStoryStep2ToolSchemas,
		}),
		"step-3": createStepDefinition({
			stepNumber: 3,
			checklistLabel: "Author Tasks & Subtasks",
			decisionTree: buildStep3DecisionTree(),
			buildPromptSource: buildStep3PromptSource,
			buildToolSchema: buildCreateStoryStep3ToolSchemas,
		}),
		"step-4": createStepDefinition({
			stepNumber: 4,
			checklistLabel: "Finalize & Validate Story Document",
			decisionTree: buildStep4DecisionTree(),
			buildPromptSource: buildStep4PromptSource,
			buildToolSchema: buildCreateStoryStep4ToolSchemas,
		}),
	},
}
