import { readFile } from "node:fs/promises"
import { basename, dirname, join, normalize } from "node:path"
import type {
	WorkflowFormDefinitionPayload,
	WorkflowFormPanelDefinition,
	WorkflowStepResolutionStatusDefinition,
} from "@shared/ExtensionMessage"
import {
	areAllStoryTasksComplete,
	DevStorySectionKey,
	formatStoryTaskDetail,
	getFirstIncompleteStoryTaskDetail,
	type ParsedStorySubtask,
	type ParsedStoryTask,
	type ParsedTasksSection,
	parseDevStoryDocument,
	type StoryTaskAllowedFileEntry,
	type StoryTaskDetail,
} from "@/core/task/story-tools/storyTaskDocument"
import type { WorkflowToolBackedActionInstruction } from "@/core/task/workflow-step-resolution/types"
import { ClineDefaultTool } from "@/shared/tools"
import { parseWorkflowStoryIndexJson, type WorkflowStoryType } from "../../storyArtifacts"
import type {
	ActiveWorkflowSession,
	WorkflowDecisionBranchTrigger,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowDeterministicProcedureResult,
	WorkflowFormContinuationReplacementBuilder,
	WorkflowPersonaDefinition,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowStepPromptSource,
	WorkflowValue,
	WorkflowValues,
} from "../../types"
import {
	buildDevStoryStep1ToolSchemas,
	buildDevStoryStep2ToolSchemas,
	buildDevStoryStep3ToolSchemas,
	buildDevStoryStep4ToolSchemas,
} from "./devStoryToolSchemas"

export const DEV_STORY_WORKFLOW_NAME = "dev-story"
export const DEV_STORY_WORKFLOW_DISPLAY_NAME = "dev-story"
export const DEV_STORY_WORKFLOW_SLASH_COMMAND_NAME = "dev-story"
export const DEV_STORY_WORKFLOW_USE_SKILL_NAME = "dev-story"
export const DEV_STORY_WORKFLOW_PROJECT_SUBFOLDER = "implementation"
export const DEV_STORY_WORKFLOW_DESCRIPTION =
	"In this workflow, a story's tasks and subtasks will be implemented through structured task execution. At the end of the workflow, the files touched during implementation will be staged and committed."
export const DEV_STORY_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "Amelia",
	role: "Developer Agent",
	identity: "describe executing approved stories precisely and following team standards",
	communicationStyle: "ultra-succinct, using file paths and acceptance-criteria or task IDs with no fluff",
	capabilities: ["story execution and code implementation"],
	principles: [
		"all tests must pass before review and that every task and subtask must be covered with unit tests before being marked complete",
	],
}

export enum DevStoryWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	TargetStory = "target_story",
	TargetStoryFilename = "target_story_filename",
	SelectedStoryIdentity = "selected_story_identity",
	EpicIdentity = "epic_identity",
	StoriesIndex = "stories_index",
	SelectedStoryType = "selected_story_type",
	StoryGeneralInstructions = "story_general_instructions",
	StoryObjective = "story_objective",
	StoryScope = "story_scope",
	StoryScopeBoundary = "story_scope_boundary",
	StoryRequirements = "story_requirements",
	StoryIssues = "story_issues",
	StoryTaskInventory = "story_task_inventory",
	CurrentStoryTaskId = "current_story_task_id",
	UnpermittedFilePaths = "unpermitted_file_paths",
	SelectedUnpermittedFilePaths = "selected_unpermitted_file_paths",
	CommitStagedFiles = "commit_staged_files",
}

export const DEV_STORY_WORKFLOW_VALUE_KEYS: readonly DevStoryWorkflowValueKey[] = Object.values(DevStoryWorkflowValueKey)

export const DEV_STORY_ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: DevStoryWorkflowValueKey.ProjectMode,
	projectTitle: DevStoryWorkflowValueKey.ProjectTitle,
	projectFolderName: DevStoryWorkflowValueKey.ProjectFolderName,
} as const

export const DEV_STORY_TARGET_STORY_PREREQUISITE_ID = DevStoryWorkflowValueKey.TargetStory
export const DEV_STORY_STORY_FILENAME_PATTERN = /^(Story-\d+-\d+|Remediation-story-\d+-\d+-\d+)\.md$/
export const DEV_STORY_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]> = {
	[DEV_STORY_TARGET_STORY_PREREQUISITE_ID]: {
		id: DEV_STORY_TARGET_STORY_PREREQUISITE_ID,
		requirement: "required",
		producingWorkflowName: "create-story",
		projectSubfolderSegments: ["implementation", "stories-backlog"],
		match: {
			kind: "naming_pattern",
			pattern: DEV_STORY_STORY_FILENAME_PATTERN,
		},
		workflowValueKey: DevStoryWorkflowValueKey.TargetStory,
		outputDocumentReference: "none",
	},
}

export const DEV_STORY_STEP_2_INITIAL_PROMPT_BRANCH_ID = "step-2-initial-prompt"
export const DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID = "step-2-task-loop"
export const DEV_STORY_STEP_4_FORM_ID = "step-4-dev-story-finalization-form"
export const DEV_STORY_STEP_4_PANEL_A_UNPERMITTED_FILES_ID = "step-4-panel-a-unpermitted-files"
export const DEV_STORY_STEP_4_PANEL_B_COMMIT_CONFIRMATION_ID = "step-4-panel-b-commit-confirmation"

export type DevStoryGitFinalizeOperation = "prepare_staging" | "stage_selected_unpermitted" | "commit_staged"

export interface DevStoryStoryMetadata {
	targetStoryFilename: string
	selectedStoryIdentity: string
	selectedStoryType: WorkflowStoryType
	epicIdentity: string
	storiesIndex: string
}

interface DevStorySelectedProjectRoot {
	selectedProjectRoot: string
	targetStoryFilename: string
}

interface DevStoryTaskInventoryRecord {
	id: string
	lineIndex: number
	rawLine: string
	completed: boolean
	allowedFiles: readonly WorkflowValue[]
	subtasks: readonly DevStorySubtaskInventoryRecord[]
}

interface DevStorySubtaskInventoryRecord {
	id: string
	lineIndex: number
	rawLine: string
	completed: boolean
	allowedFiles: readonly WorkflowValue[]
}

const PRIMARY_STORY_FILENAME_PATTERN = /^Story-(\d+)-(\d+)\.md$/
const REMEDIATION_STORY_FILENAME_PATTERN = /^Remediation-story-(\d+)-(\d+)-(\d+)\.md$/

const DEV_STORY_STEP_2_PROMPT_TEMPLATE = `You are tasked with implementing a story with a prescribed set of tasks and subtasks. You will be provided with the story's instructions and frontmatter, then will be provided with the assigned tasks one at a time. Once you've completed all subtasks for the provided task you will be provided with the next task.
You will use the following tools to manage your progress while implementing this story:
- story_task_complete: call this tool to mark a subtask complete. The tool will automatically mark a task complete once you complete all of it's subtasks.
- request_task_detail: call this tool to request the detailed instructions for a given task ID. This info is automatically provided when a task is completed and a new task is unlocked, but you can use this tool if you need the system to re-send that information at any time.
- show_incomplete_tasks: call this tool to request a list of incomplete tasks & subtasks. This tool does not provide detailed instructions; it only provides the list of tasks & subtasks with their IDs.

*** Story Frontmatter ***
General Instructions:
{workflow.story_general_instructions}

Objective:
{workflow.story_objective}

Scope:
{workflow.story_scope}

Scope Boundary:
{workflow.story_scope_boundary}

Requirements:
{workflow.story_requirements}

Known Issues/ Risks/ Technical Debt:
{workflow.story_issues}

**Continue task impelentation until instructed otherwise- when the final task is complete the next workflow step will unlock and further instructions will be provided.**

*** Current Story Task: ***
current_story_task
*** Conditional Prompting: ***
Runtime must provide the first task and it's subtasks exactly as they are written in the target story document. When all subtasks for the provided task are complete, Runtime must provide the next task from the story document in the same manner. Existing tool story_task_reminder can likely be updated to serve this purpose.
*** end conditional prompting block ***`

const DEV_STORY_STEP_3_PROMPT =
	"Use attempt_completion to provide a final recap to the user summarizing the changes that you implemented during this workflow, and remind them to run the code-review workflow before committing the changed files."

function createEmptyPromptSource(): WorkflowStepPromptSource {
	return { kind: "none" }
}

function createStepDefinition(args: {
	stepNumber: 1 | 2 | 3 | 4
	checklistLabel: string
	decisionTree: WorkflowDecisionTree
	buildPromptSource?: WorkflowStepDefinition["buildPromptSource"]
	promptTemplates?: WorkflowStepDefinition["promptTemplates"]
	buildToolSchema: WorkflowStepDefinition["buildToolSchema"]
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && Array.isArray(value) === false
}

function readWorkflowStringValue(workflowValues: WorkflowValues, key: DevStoryWorkflowValueKey): string | undefined {
	const value = workflowValues[key]
	if (typeof value !== "string") {
		return undefined
	}

	const trimmedValue = value.trim()
	return trimmedValue.length > 0 ? trimmedValue : undefined
}

function readWorkflowStringArrayValue(workflowValues: WorkflowValues, key: DevStoryWorkflowValueKey): readonly string[] {
	const value = workflowValues[key]
	if (Array.isArray(value) === false) {
		return []
	}

	const stringValues: string[] = []
	for (const item of value) {
		if (typeof item === "string") {
			stringValues.push(item)
		}
	}

	return stringValues
}

function resolveBacklogStoryProjectRoot(targetStory: string): DevStorySelectedProjectRoot | { errorMessage: string } {
	const normalizedTargetStory = normalize(targetStory)
	const targetStoryFilename = basename(normalizedTargetStory)
	if (DEV_STORY_STORY_FILENAME_PATTERN.test(targetStoryFilename) === false) {
		return {
			errorMessage: `Dev Story setup failed: target story filename ${targetStoryFilename} does not match the required story filename pattern.`,
		}
	}

	const backlogFolder = dirname(normalizedTargetStory)
	const implementationFolder = dirname(backlogFolder)
	if (basename(backlogFolder) !== "stories-backlog" || basename(implementationFolder) !== "implementation") {
		return {
			errorMessage: `Dev Story setup failed: target story path ${normalizedTargetStory} must remain under implementation/stories-backlog.`,
		}
	}

	return {
		selectedProjectRoot: dirname(implementationFolder),
		targetStoryFilename,
	}
}

export function deriveDevStoryMetadataFromFilename(args: {
	selectedProjectRoot: string
	targetStoryFilename: string
}): DevStoryStoryMetadata | { errorMessage: string } {
	const primaryMatch = PRIMARY_STORY_FILENAME_PATTERN.exec(args.targetStoryFilename)
	const primaryEpicIdentity = primaryMatch?.[1]
	const primaryStoryNumber = primaryMatch?.[2]
	if (primaryEpicIdentity !== undefined && primaryStoryNumber !== undefined) {
		return {
			targetStoryFilename: args.targetStoryFilename,
			selectedStoryIdentity: `${primaryEpicIdentity}.${primaryStoryNumber}`,
			selectedStoryType: "primary",
			epicIdentity: primaryEpicIdentity,
			storiesIndex: join(args.selectedProjectRoot, "implementation", `epic-${primaryEpicIdentity}-stories.index.json`),
		}
	}

	const remediationMatch = REMEDIATION_STORY_FILENAME_PATTERN.exec(args.targetStoryFilename)
	const remediationEpicIdentity = remediationMatch?.[1]
	const remediationStoryNumber = remediationMatch?.[2]
	const remediationNumber = remediationMatch?.[3]
	if (remediationEpicIdentity !== undefined && remediationStoryNumber !== undefined && remediationNumber !== undefined) {
		return {
			targetStoryFilename: args.targetStoryFilename,
			selectedStoryIdentity: `${remediationEpicIdentity}.${remediationStoryNumber}.${remediationNumber}`,
			selectedStoryType: "remediation",
			epicIdentity: remediationEpicIdentity,
			storiesIndex: join(args.selectedProjectRoot, "implementation", `epic-${remediationEpicIdentity}-stories.index.json`),
		}
	}

	return {
		errorMessage: `Dev Story setup failed: target story filename ${args.targetStoryFilename} does not match a supported story filename convention.`,
	}
}

function buildAllowedFileInventoryValue(allowedFile: StoryTaskAllowedFileEntry): WorkflowValue {
	return {
		path: allowedFile.path,
		rawLine: allowedFile.rawLine,
		lineIndex: allowedFile.lineIndex,
		ownerId: allowedFile.ownerId,
		ownerKind: allowedFile.ownerKind,
	}
}

function buildSubtaskInventoryValue(subtask: ParsedStorySubtask): WorkflowValue {
	return {
		id: subtask.id,
		lineIndex: subtask.lineIndex,
		rawLine: subtask.rawLine,
		completed: subtask.completed,
		allowedFiles: subtask.allowedFiles.map((allowedFile) => buildAllowedFileInventoryValue(allowedFile)),
	}
}

function buildTaskInventoryValue(task: ParsedStoryTask): WorkflowValue {
	return {
		id: task.id,
		lineIndex: task.lineIndex,
		rawLine: task.rawLine,
		completed: task.completed,
		allowedFiles: task.allowedFiles.map((allowedFile) => buildAllowedFileInventoryValue(allowedFile)),
		subtasks: task.subtasks.map((subtask) => buildSubtaskInventoryValue(subtask)),
	}
}

export function buildDevStoryTaskInventoryValue(parsedTasks: ParsedTasksSection): WorkflowValue {
	return {
		tasks: parsedTasks.tasks.map((task) => buildTaskInventoryValue(task)),
	}
}

function toSubtaskInventoryRecord(value: unknown): DevStorySubtaskInventoryRecord | undefined {
	if (isRecord(value) === false) {
		return undefined
	}

	const id = value.id
	const lineIndex = value.lineIndex
	const rawLine = value.rawLine
	const completed = value.completed
	const allowedFiles = value.allowedFiles
	if (
		typeof id !== "string" ||
		typeof lineIndex !== "number" ||
		typeof rawLine !== "string" ||
		typeof completed !== "boolean" ||
		Array.isArray(allowedFiles) === false
	) {
		return undefined
	}

	return {
		id,
		lineIndex,
		rawLine,
		completed,
		allowedFiles,
	}
}

function toTaskInventoryRecord(value: unknown): DevStoryTaskInventoryRecord | undefined {
	if (isRecord(value) === false) {
		return undefined
	}

	const id = value.id
	const lineIndex = value.lineIndex
	const rawLine = value.rawLine
	const completed = value.completed
	const allowedFiles = value.allowedFiles
	const subtasks = value.subtasks
	if (
		typeof id !== "string" ||
		typeof lineIndex !== "number" ||
		typeof rawLine !== "string" ||
		typeof completed !== "boolean" ||
		Array.isArray(allowedFiles) === false ||
		Array.isArray(subtasks) === false
	) {
		return undefined
	}

	const parsedSubtasks: DevStorySubtaskInventoryRecord[] = []
	for (const subtask of subtasks) {
		const parsedSubtask = toSubtaskInventoryRecord(subtask)
		if (parsedSubtask === undefined) {
			return undefined
		}
		parsedSubtasks.push(parsedSubtask)
	}

	return {
		id,
		lineIndex,
		rawLine,
		completed,
		allowedFiles,
		subtasks: parsedSubtasks,
	}
}

function readStoryTaskInventoryRecords(workflowValues: WorkflowValues): readonly DevStoryTaskInventoryRecord[] {
	const inventory = workflowValues[DevStoryWorkflowValueKey.StoryTaskInventory]
	if (isRecord(inventory) === false || Array.isArray(inventory.tasks) === false) {
		return []
	}

	const tasks: DevStoryTaskInventoryRecord[] = []
	for (const taskValue of inventory.tasks) {
		const task = toTaskInventoryRecord(taskValue)
		if (task !== undefined) {
			tasks.push(task)
		}
	}

	return tasks
}

function areStoryTaskInventoryRecordsComplete(tasks: readonly DevStoryTaskInventoryRecord[]): boolean {
	return tasks.length > 0 && tasks.every((task) => task.completed && task.subtasks.every((subtask) => subtask.completed))
}

function findCurrentStoryTaskRecord(workflowValues: WorkflowValues): DevStoryTaskInventoryRecord | undefined {
	const tasks = readStoryTaskInventoryRecords(workflowValues)
	const currentStoryTaskId = readWorkflowStringValue(workflowValues, DevStoryWorkflowValueKey.CurrentStoryTaskId)
	if (currentStoryTaskId !== undefined) {
		return tasks.find((task) => task.id === currentStoryTaskId)
	}

	return tasks.find((task) => task.completed === false || task.subtasks.some((subtask) => subtask.completed === false))
}

function buildStoryTaskDetailFromInventory(task: DevStoryTaskInventoryRecord): StoryTaskDetail {
	return {
		taskId: task.id,
		rawTaskLine: task.rawLine,
		completed: task.completed,
		allowedFiles: [],
		subtasks: task.subtasks.map((subtask) => ({
			subtaskId: subtask.id,
			rawSubtaskLine: subtask.rawLine,
			completed: subtask.completed,
			allowedFiles: [],
		})),
	}
}

export function renderCurrentDevStoryTaskDetail(workflowValues: WorkflowValues): string | undefined {
	const currentTask = findCurrentStoryTaskRecord(workflowValues)
	if (currentTask === undefined) {
		return undefined
	}

	return formatStoryTaskDetail(buildStoryTaskDetailFromInventory(currentTask))
}

function buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const currentTaskDetail = renderCurrentDevStoryTaskDetail(input.session.workflowValues)
	if (currentTaskDetail === undefined) {
		throw new Error("Dev Story Step 2 prompt requires a current incomplete story task.")
	}

	if (input.session.branchContext.activeBranchId === DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID) {
		return {
			kind: "current_step_instruction_template",
			currentStepInstructionTemplate: currentTaskDetail,
		}
	}

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: DEV_STORY_STEP_2_PROMPT_TEMPLATE.replaceAll("current_story_task", currentTaskDetail),
	}
}

function buildStep3PromptSource(): WorkflowStepPromptSource {
	return { kind: "current_step_instruction_template", currentStepInstructionTemplate: DEV_STORY_STEP_3_PROMPT }
}

export async function setupDevStoryFromTargetStory(
	session: ActiveWorkflowSession,
): Promise<WorkflowDeterministicProcedureResult> {
	const targetStory = readWorkflowStringValue(session.workflowValues, DevStoryWorkflowValueKey.TargetStory)
	if (targetStory === undefined) {
		return {
			kind: "failed",
			errorMessage: "Dev Story setup failed: workflow value target_story is required before story setup.",
		}
	}

	const projectRoot = resolveBacklogStoryProjectRoot(targetStory)
	if ("errorMessage" in projectRoot) {
		return {
			kind: "failed",
			errorMessage: projectRoot.errorMessage,
		}
	}

	const metadata = deriveDevStoryMetadataFromFilename({
		selectedProjectRoot: projectRoot.selectedProjectRoot,
		targetStoryFilename: projectRoot.targetStoryFilename,
	})
	if ("errorMessage" in metadata) {
		return {
			kind: "failed",
			errorMessage: metadata.errorMessage,
		}
	}

	let storyMarkdown: string
	try {
		storyMarkdown = await readFile(targetStory, "utf8")
	} catch (error) {
		return {
			kind: "failed",
			errorMessage: `Dev Story setup failed: target story ${targetStory} could not be read. ${error instanceof Error ? error.message : String(error)}`,
		}
	}

	const parsedDocument = parseDevStoryDocument(storyMarkdown)
	if (parsedDocument.ok === false) {
		return {
			kind: "failed",
			errorMessage: `Dev Story setup failed: target story ${targetStory} could not be parsed. ${parsedDocument.message}`,
		}
	}

	if (areAllStoryTasksComplete(parsedDocument.document)) {
		return {
			kind: "failed",
			errorMessage: `Dev Story setup failed: target story ${targetStory} has no incomplete tasks to implement.`,
		}
	}

	const firstIncompleteTask = getFirstIncompleteStoryTaskDetail(parsedDocument.document)
	if (firstIncompleteTask === undefined) {
		return {
			kind: "failed",
			errorMessage: `Dev Story setup failed: target story ${targetStory} has no incomplete current story task.`,
		}
	}

	return {
		kind: "succeeded",
		workflowValueWrites: {
			[DevStoryWorkflowValueKey.TargetStoryFilename]: metadata.targetStoryFilename,
			[DevStoryWorkflowValueKey.SelectedStoryIdentity]: metadata.selectedStoryIdentity,
			[DevStoryWorkflowValueKey.SelectedStoryType]: metadata.selectedStoryType,
			[DevStoryWorkflowValueKey.EpicIdentity]: metadata.epicIdentity,
			[DevStoryWorkflowValueKey.StoriesIndex]: metadata.storiesIndex,
			[DevStoryWorkflowValueKey.StoryGeneralInstructions]:
				parsedDocument.document.sections[DevStorySectionKey.GeneralInstructions],
			[DevStoryWorkflowValueKey.StoryObjective]: parsedDocument.document.sections[DevStorySectionKey.Objective],
			[DevStoryWorkflowValueKey.StoryScope]: parsedDocument.document.sections[DevStorySectionKey.Scope],
			[DevStoryWorkflowValueKey.StoryScopeBoundary]: parsedDocument.document.sections[DevStorySectionKey.ScopeBoundary],
			[DevStoryWorkflowValueKey.StoryRequirements]: parsedDocument.document.sections[DevStorySectionKey.Requirements],
			[DevStoryWorkflowValueKey.StoryIssues]: parsedDocument.document.sections[DevStorySectionKey.Issues],
			[DevStoryWorkflowValueKey.StoryTaskInventory]: {
				tasks: parsedDocument.document.tasks.map((task) => buildTaskInventoryValue(task)),
			},
			[DevStoryWorkflowValueKey.CurrentStoryTaskId]: firstIncompleteTask.taskId,
		},
	}
}

export async function validateDerivedStoryIndexBeforeFinalization(
	session: ActiveWorkflowSession,
): Promise<WorkflowDeterministicProcedureResult> {
	const storiesIndex = readWorkflowStringValue(session.workflowValues, DevStoryWorkflowValueKey.StoriesIndex)
	const selectedStoryIdentity = readWorkflowStringValue(session.workflowValues, DevStoryWorkflowValueKey.SelectedStoryIdentity)
	const targetStoryFilename = readWorkflowStringValue(session.workflowValues, DevStoryWorkflowValueKey.TargetStoryFilename)
	if (storiesIndex === undefined || selectedStoryIdentity === undefined || targetStoryFilename === undefined) {
		return {
			kind: "failed",
			errorMessage:
				"Dev Story finalization failed: stories_index, selected_story_identity, and target_story_filename are required before project record updates.",
		}
	}

	let storyIndexContent: string
	try {
		storyIndexContent = await readFile(storiesIndex, "utf8")
	} catch (error) {
		return {
			kind: "failed",
			errorMessage: `Dev Story finalization failed: story index ${storiesIndex} for story ${selectedStoryIdentity} could not be read before story file relocation. ${error instanceof Error ? error.message : String(error)}`,
		}
	}

	try {
		const storyIndex = parseWorkflowStoryIndexJson(storyIndexContent)
		const selectedStory = storyIndex.stories.find((story) => story.story_identity === selectedStoryIdentity)
		if (selectedStory === undefined) {
			return {
				kind: "failed",
				errorMessage: `Dev Story finalization failed: story index ${storiesIndex} does not contain selected story ${selectedStoryIdentity} before story file relocation.`,
			}
		}
		if (selectedStory.story_file_name !== targetStoryFilename) {
			return {
				kind: "failed",
				errorMessage: `Dev Story finalization failed: story index ${storiesIndex} maps selected story ${selectedStoryIdentity} to ${selectedStory.story_file_name}, not ${targetStoryFilename}.`,
			}
		}
	} catch (error) {
		return {
			kind: "failed",
			errorMessage: `Dev Story finalization failed: story index ${storiesIndex} is malformed for selected story ${selectedStoryIdentity}. ${error instanceof Error ? error.message : String(error)}`,
		}
	}

	return {
		kind: "succeeded",
	}
}

function workflowValuesPersisted(...keys: readonly DevStoryWorkflowValueKey[]): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_values_persisted" && keys.every((key) => triggerEvent.changedKeys.includes(key)),
	}
}

function modelStoryTaskCompleteSucceededWithAllTasksComplete(): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "model_tool_succeeded" &&
			triggerEvent.toolName === ClineDefaultTool.STORY_TASK_COMPLETE &&
			areStoryTaskInventoryRecordsComplete(readStoryTaskInventoryRecords(workflowValues)),
	}
}

function modelStoryTaskCompleteSucceededWithIncompleteTasks(): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "model_tool_succeeded" &&
			triggerEvent.toolName === ClineDefaultTool.STORY_TASK_COMPLETE &&
			areStoryTaskInventoryRecordsComplete(readStoryTaskInventoryRecords(workflowValues)) === false,
	}
}

function attemptCompletionSucceeded(): WorkflowDecisionBranchTrigger {
	return {
		kind: "on_event",
		eventKind: "attempt_completion_succeeded",
	}
}

function workflowFormPanelSubmitted(panelId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_form_panel_submitted" &&
			triggerEvent.workflowFormId === DEV_STORY_STEP_4_FORM_ID &&
			triggerEvent.panelId === panelId &&
			triggerEvent.action === "submit",
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

function prepareStagingSucceededWithUnpermittedFiles(): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "tool_backed_operation_succeeded" &&
			sourceRouteMatches(triggerEvent.sourceRoute, "step-4-await-story-status-update", "step-4-prepare-staging") &&
			readWorkflowStringArrayValue(workflowValues, DevStoryWorkflowValueKey.UnpermittedFilePaths).length > 0,
	}
}

function prepareStagingSucceededWithoutUnpermittedFiles(): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "tool_backed_operation_succeeded" &&
			sourceRouteMatches(triggerEvent.sourceRoute, "step-4-await-story-status-update", "step-4-prepare-staging") &&
			readWorkflowStringArrayValue(workflowValues, DevStoryWorkflowValueKey.UnpermittedFilePaths).length === 0,
	}
}

function commitStatusDefinition(operation: DevStoryGitFinalizeOperation): WorkflowStepResolutionStatusDefinition {
	switch (operation) {
		case "prepare_staging":
			return {
				title: "Prepare Staging",
				pendingLabel: "Preparing staged files",
				successLabel: "Prepared staged files",
				failureLabel: "Failed to prepare staged files",
			}
		case "stage_selected_unpermitted":
			return {
				title: "Stage Selected Unpermitted Files",
				pendingLabel: "Staging selected unpermitted files",
				successLabel: "Staged selected unpermitted files",
				failureLabel: "Failed to stage selected unpermitted files",
			}
		case "commit_staged":
			return {
				title: "Commit Staged Files",
				pendingLabel: "Committing staged files",
				successLabel: "Committed staged files",
				failureLabel: "Failed to commit staged files",
			}
	}
}

export function buildDevStoryGitFinalizeInstruction(
	operation: DevStoryGitFinalizeOperation,
): WorkflowToolBackedActionInstruction {
	return {
		toolName: ClineDefaultTool.DEV_STORY_GIT_FINALIZE,
		buildStatusDefinition: () => commitStatusDefinition(operation),
		buildToolExecutionRequest: () => ({
			toolName: ClineDefaultTool.DEV_STORY_GIT_FINALIZE,
			toolInput: {},
			toolParams: {
				operation,
			},
		}),
		evaluateToolExecutionResult: () => ({
			succeeded: true,
		}),
	}
}

function buildRuntimeRoutedTransition(): WorkflowFormPanelDefinition["transition"] {
	return {
		type: "runtime_routed",
	}
}

function buildTerminalTransition(): WorkflowFormPanelDefinition["transition"] {
	return {
		type: "conditional",
		conditionSourceKey: "__terminal__",
		branches: [],
		defaultTerminal: true,
	}
}

export function buildDevStoryStep4WorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Dev Story Finalization",
		toolDictionaryTitle: "Dev Story Finalization",
		toolDictionaryMarkdown: "Finalize dev-story staging and commit choices.",
		firstPanelId: DEV_STORY_STEP_4_PANEL_A_UNPERMITTED_FILES_ID,
		panels: {
			[DEV_STORY_STEP_4_PANEL_A_UNPERMITTED_FILES_ID]: {
				panelId: DEV_STORY_STEP_4_PANEL_A_UNPERMITTED_FILES_ID,
				title: "Unpermitted File Changes Detected",
				promptMarkdown:
					"The following file(s) were created or modified, and are not included in the target story's allowed files list. Please select any files below which should be included in the story's commit.",
				fields: [
					{
						key: DevStoryWorkflowValueKey.SelectedUnpermittedFilePaths,
						workflowValueKey: DevStoryWorkflowValueKey.SelectedUnpermittedFilePaths,
						kind: "checkbox_group",
						label: "unpermitted files",
						required: false,
						allowedValueType: "array",
						selectionCardinality: "unbounded",
						workflowValueOptionsSource: {
							workflowValueKey: DevStoryWorkflowValueKey.UnpermittedFilePaths,
							valueSource: "array_string_entry",
							labelSource: "array_string_entry",
						},
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "submit",
				},
				transition: buildRuntimeRoutedTransition(),
			},
			[DEV_STORY_STEP_4_PANEL_B_COMMIT_CONFIRMATION_ID]: {
				panelId: DEV_STORY_STEP_4_PANEL_B_COMMIT_CONFIRMATION_ID,
				title: "Commit Confirmation",
				promptMarkdown: "",
				fields: [
					{
						key: DevStoryWorkflowValueKey.CommitStagedFiles,
						workflowValueKey: DevStoryWorkflowValueKey.CommitStagedFiles,
						kind: "boolean",
						label: "Would you like to commit the staged files?",
						required: true,
						allowedValueType: "boolean",
						trueLabel: "Yes",
						falseLabel: "No",
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "submit",
				},
				transition: buildTerminalTransition(),
			},
		},
	}
}

function buildStep4ContinuationReplacementBuilder(panelId: string): WorkflowFormContinuationReplacementBuilder {
	return () => {
		const panel = buildDevStoryStep4WorkflowForm().panels[panelId]
		if (panel === undefined) {
			throw new Error(`Dev Story Step 4 workflow form is missing requested continuation panel ${panelId}.`)
		}

		return {
			panel,
			data: {},
		}
	}
}

function buildStep1DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-1-resolve-target-story",
		branches: {
			"step-1-resolve-target-story": {
				id: "step-1-resolve-target-story",
				routes: [
					{
						id: "step-1-resolve-target-story",
						trigger: { kind: "always" },
						action: {
							kind: "resolve_prerequisite_files",
							prerequisiteIds: [DEV_STORY_TARGET_STORY_PREREQUISITE_ID],
						},
						followingBranchId: "step-1-setup-target-story",
					},
				],
			},
			"step-1-setup-target-story": {
				id: "step-1-setup-target-story",
				routes: [
					{
						id: "step-1-setup-target-story",
						trigger: { kind: "always" },
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: setupDevStoryFromTargetStory,
							},
						},
						followingBranchId: "step-1-await-story-setup-values",
					},
				],
			},
			"step-1-await-story-setup-values": {
				id: "step-1-await-story-setup-values",
				routes: [
					{
						id: "step-1-transition-to-step-2",
						trigger: workflowValuesPersisted(
							DevStoryWorkflowValueKey.TargetStoryFilename,
							DevStoryWorkflowValueKey.SelectedStoryIdentity,
							DevStoryWorkflowValueKey.StoryTaskInventory,
							DevStoryWorkflowValueKey.CurrentStoryTaskId,
						),
						action: {
							kind: "transition_step",
							target: {
								kind: "named_branch",
								stepNumber: 2,
								branchId: DEV_STORY_STEP_2_INITIAL_PROMPT_BRANCH_ID,
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
		entryBranchId: DEV_STORY_STEP_2_INITIAL_PROMPT_BRANCH_ID,
		branches: {
			[DEV_STORY_STEP_2_INITIAL_PROMPT_BRANCH_ID]: {
				id: DEV_STORY_STEP_2_INITIAL_PROMPT_BRANCH_ID,
				routes: [
					{
						id: "step-2-transition-to-step-3-after-all-complete",
						trigger: modelStoryTaskCompleteSucceededWithAllTasksComplete(),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 3,
							},
						},
					},
					{
						id: "step-2-project-next-task-after-parent-complete",
						trigger: modelStoryTaskCompleteSucceededWithIncompleteTasks(),
						action: {
							kind: "project_prompt",
						},
						followingBranchId: DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID,
					},
					{
						id: "step-2-project-initial-prompt",
						trigger: { kind: "always" },
						action: {
							kind: "project_prompt",
						},
						followingBranchId: DEV_STORY_STEP_2_INITIAL_PROMPT_BRANCH_ID,
					},
				],
			},
			[DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID]: {
				id: DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID,
				routes: [
					{
						id: "step-2-transition-to-step-3-after-loop-all-complete",
						trigger: modelStoryTaskCompleteSucceededWithAllTasksComplete(),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 3,
							},
						},
					},
					{
						id: "step-2-project-next-task-after-loop-parent-complete",
						trigger: modelStoryTaskCompleteSucceededWithIncompleteTasks(),
						action: {
							kind: "project_prompt",
						},
						followingBranchId: DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID,
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
						followingBranchId: "step-3-await-attempt-completion",
					},
				],
			},
			"step-3-await-attempt-completion": {
				id: "step-3-await-attempt-completion",
				routes: [
					{
						id: "step-3-transition-to-step-4",
						trigger: attemptCompletionSucceeded(),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 4,
							},
						},
					},
				],
			},
		},
	}
}

function buildStep4DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-4-validate-story-index",
		branches: {
			"step-4-validate-story-index": {
				id: "step-4-validate-story-index",
				routes: [
					{
						id: "step-4-validate-story-index",
						trigger: { kind: "always" },
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: validateDerivedStoryIndexBeforeFinalization,
							},
						},
						followingBranchId: "step-4-move-story-to-review",
					},
				],
			},
			"step-4-move-story-to-review": {
				id: "step-4-move-story-to-review",
				routes: [
					{
						id: "step-4-move-story-to-review",
						trigger: { kind: "always" },
						action: {
							kind: "move_project_file",
							sourceFolderSegments: ["implementation", "stories-backlog"],
							destinationFolderSegments: ["implementation", "stories-review"],
							filenameWorkflowValueKey: DevStoryWorkflowValueKey.TargetStoryFilename,
						},
						followingBranchId: "step-4-await-story-move",
					},
				],
			},
			"step-4-await-story-move": {
				id: "step-4-await-story-move",
				routes: [
					{
						id: "step-4-update-story-index-status-to-review",
						trigger: toolBackedOperationSucceeded("step-4-move-story-to-review", "step-4-move-story-to-review"),
						action: {
							kind: "update_story_index_status",
							storyIndexWorkflowValueKey: DevStoryWorkflowValueKey.StoriesIndex,
							storyIdentityWorkflowValueKey: DevStoryWorkflowValueKey.SelectedStoryIdentity,
							status: "review",
							expectedCurrentStatus: "backlog",
						},
						followingBranchId: "step-4-await-story-status-update",
					},
				],
			},
			"step-4-await-story-status-update": {
				id: "step-4-await-story-status-update",
				routes: [
					{
						id: "step-4-prepare-staging",
						trigger: toolBackedOperationSucceeded(
							"step-4-await-story-move",
							"step-4-update-story-index-status-to-review",
						),
						action: {
							kind: "execute_tool_backed_operation",
							instruction: buildDevStoryGitFinalizeInstruction("prepare_staging"),
						},
						followingBranchId: "step-4-await-prepare-staging",
					},
				],
			},
			"step-4-await-prepare-staging": {
				id: "step-4-await-prepare-staging",
				routes: [
					{
						id: "step-4-render-unpermitted-files-panel",
						trigger: prepareStagingSucceededWithUnpermittedFiles(),
						action: {
							kind: "render_workflow_form",
							workflowFormId: DEV_STORY_STEP_4_FORM_ID,
							startPanelId: DEV_STORY_STEP_4_PANEL_A_UNPERMITTED_FILES_ID,
						},
						followingBranchId: "step-4-await-panel-a",
					},
					{
						id: "step-4-render-commit-confirmation-panel",
						trigger: prepareStagingSucceededWithoutUnpermittedFiles(),
						action: {
							kind: "render_workflow_form",
							workflowFormId: DEV_STORY_STEP_4_FORM_ID,
							startPanelId: DEV_STORY_STEP_4_PANEL_B_COMMIT_CONFIRMATION_ID,
						},
						followingBranchId: "step-4-await-panel-b",
					},
				],
			},
			"step-4-await-panel-a": {
				id: "step-4-await-panel-a",
				routes: [
					{
						id: "step-4-stage-selected-unpermitted",
						trigger: workflowFormPanelSubmitted(DEV_STORY_STEP_4_PANEL_A_UNPERMITTED_FILES_ID),
						action: {
							kind: "execute_tool_backed_operation",
							instruction: buildDevStoryGitFinalizeInstruction("stage_selected_unpermitted"),
						},
						followingBranchId: "step-4-await-stage-selected-unpermitted",
					},
				],
			},
			"step-4-await-stage-selected-unpermitted": {
				id: "step-4-await-stage-selected-unpermitted",
				routes: [
					{
						id: "step-4-continue-to-commit-confirmation-panel",
						trigger: toolBackedOperationSucceeded("step-4-await-panel-a", "step-4-stage-selected-unpermitted"),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: DEV_STORY_STEP_4_FORM_ID,
							panelId: DEV_STORY_STEP_4_PANEL_B_COMMIT_CONFIRMATION_ID,
							buildReplacement: buildStep4ContinuationReplacementBuilder(
								DEV_STORY_STEP_4_PANEL_B_COMMIT_CONFIRMATION_ID,
							),
						},
						followingBranchId: "step-4-await-panel-b",
					},
				],
			},
			"step-4-await-panel-b": {
				id: "step-4-await-panel-b",
				routes: [
					{
						id: "step-4-commit-staged",
						trigger: workflowFormPanelSubmitted(DEV_STORY_STEP_4_PANEL_B_COMMIT_CONFIRMATION_ID),
						action: {
							kind: "execute_tool_backed_operation",
							instruction: buildDevStoryGitFinalizeInstruction("commit_staged"),
						},
						followingBranchId: "step-4-await-commit-staged",
					},
				],
			},
			"step-4-await-commit-staged": {
				id: "step-4-await-commit-staged",
				routes: [
					{
						id: "step-4-complete-workflow-after-commit-decision",
						trigger: toolBackedOperationSucceeded("step-4-await-panel-b", "step-4-commit-staged"),
						action: {
							kind: "complete_workflow",
						},
					},
				],
			},
		},
	}
}

export const devStoryWorkflowDefinition: WorkflowDefinition = {
	name: DEV_STORY_WORKFLOW_NAME,
	displayName: DEV_STORY_WORKFLOW_DISPLAY_NAME,
	description: DEV_STORY_WORKFLOW_DESCRIPTION,
	slashCommandName: DEV_STORY_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: DEV_STORY_WORKFLOW_USE_SKILL_NAME,
	persona: DEV_STORY_WORKFLOW_PERSONA,
	projectSubfolder: DEV_STORY_WORKFLOW_PROJECT_SUBFOLDER,
	workflowValueKeys: DEV_STORY_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: DEV_STORY_ENTRY_PROJECT_VALUE_KEYS,
	entryPanel: {
		promptMarkdown: DEV_STORY_WORKFLOW_DESCRIPTION,
	},
	workflowForms: {
		[DEV_STORY_STEP_4_FORM_ID]: buildDevStoryStep4WorkflowForm(),
	},
	prerequisiteFiles: DEV_STORY_PREREQUISITE_FILES,
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Gather Inputs",
			decisionTree: buildStep1DecisionTree(),
			buildToolSchema: buildDevStoryStep1ToolSchemas,
		}),
		"step-2": createStepDefinition({
			stepNumber: 2,
			checklistLabel: "Execute Story Tasks",
			decisionTree: buildStep2DecisionTree(),
			buildPromptSource: buildStep2PromptSource,
			promptTemplates: [DEV_STORY_STEP_2_PROMPT_TEMPLATE],
			buildToolSchema: buildDevStoryStep2ToolSchemas,
		}),
		"step-3": createStepDefinition({
			stepNumber: 3,
			checklistLabel: "Final User Recap",
			decisionTree: buildStep3DecisionTree(),
			buildPromptSource: buildStep3PromptSource,
			promptTemplates: [DEV_STORY_STEP_3_PROMPT],
			buildToolSchema: buildDevStoryStep3ToolSchemas,
		}),
		"step-4": createStepDefinition({
			stepNumber: 4,
			checklistLabel: "Update Project Records",
			decisionTree: buildStep4DecisionTree(),
			buildToolSchema: buildDevStoryStep4ToolSchemas,
		}),
	},
}
