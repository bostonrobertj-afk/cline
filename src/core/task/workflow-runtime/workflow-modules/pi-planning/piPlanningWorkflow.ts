import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type {
	WorkflowFormDefinitionPayload,
	WorkflowFormOptionDefinition,
	WorkflowFormPanelAction,
	WorkflowFormPanelDefinition,
	WorkflowStepResolutionStatusDefinition,
} from "@shared/ExtensionMessage"
import type { WorkflowFormSessionData } from "@/core/task/workflow-form/types"
import type {
	WorkflowToolBackedActionInstruction,
	WorkflowToolBackedOperationEvaluationResult,
	WorkflowToolBackedOperationExecutionRequest,
} from "@/core/task/workflow-step-resolution/types"
import { ClineDefaultTool } from "@/shared/tools"
import { WorkflowArtifactFamily } from "../../artifactFamilies"
import type { WorkflowStoryStatus } from "../../storyArtifacts"
import type {
	ActiveWorkflowSession,
	WorkflowDecisionAction,
	WorkflowDecisionBranchTrigger,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowDeterministicProcedureResult,
	WorkflowFormContinuationReplacement,
	WorkflowPersonaDefinition,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowStepPromptSource,
	WorkflowValues,
} from "../../types"
import {
	buildPiPlanningStep1ToolSchemas,
	buildPiPlanningStep2ToolSchemas,
	buildPiPlanningStep3ToolSchemas,
	buildPiPlanningStep4ToolSchemas,
	buildPiPlanningStep5ToolSchemas,
	buildPiPlanningStep6ToolSchemas,
} from "./piPlanningToolSchemas"

export enum PiPlanningEditIntent {
	CompleteInitialStoryBuildout = "Complete initial story buildout",
	EditExistingStoryFile = "edit existing story file",
}

export enum PiPlanningWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	ImplementationFolder = "implementation_folder",
	DraftsFolder = "drafts_folder",
	ArchitectureDocument = "architecture_document",
	EpicsDocument = "epics_document",
	EpicsIndex = "epics_index",
	BrainstormingDocument = "brainstorming_document",
	AdditionalContext = "additional_context",
	TargetEpic = "target_epic",
	EpicIdentity = "epic_identity",
	StoriesIndex = "stories_index",
	StoriesIndexExistedAtWorkflowStart = "stories_index_existed_at_workflow_start",
	EditIntent = "edit_intent",
	SelectedStoryIdentity = "selected_story_identity",
	SelectedStoryFileName = "selected_story_file_name",
	SelectedStoryStatus = "selected_story_status",
	TargetStory = "target_story",
}

const PI_PLANNING_WORKFLOW_NAME = "pi-planning"
const PI_PLANNING_WORKFLOW_DISPLAY_NAME = "PI Planning"
const PI_PLANNING_WORKFLOW_SLASH_COMMAND_NAME = "pi-planning"
const PI_PLANNING_WORKFLOW_USE_SKILL_NAME = "pi-planning"
const PI_PLANNING_WORKFLOW_PROJECT_SUBFOLDER = "planning"
const PI_PLANNING_WORKFLOW_DESCRIPTION =
	"Break a selected epic into implementation-ready draft story files using architecture, epics, and optional discovery context."
const PI_PLANNING_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "John",
	role: "Product Manager",
	identity: "Breaks well-defined epics down into deliverable stories with clear scope.",
	capabilities: ["Breaking epics into deliverable stories with clear scope"],
	communicationStyle: "Detailed, diligent, to-the-point, and careful to avoid assumptions.",
	principles: ["Validate documentation coverage and consistency against existing runtime code when forming story coverage."],
}
const PI_PLANNING_WORKFLOW_VALUE_KEYS = Object.values(PiPlanningWorkflowValueKey)
const ARCHITECTURE_PREREQUISITE_ID = PiPlanningWorkflowValueKey.ArchitectureDocument
const EPICS_DOCUMENT_PREREQUISITE_ID = PiPlanningWorkflowValueKey.EpicsDocument
const EPICS_INDEX_PREREQUISITE_ID = PiPlanningWorkflowValueKey.EpicsIndex
const BRAINSTORMING_PREREQUISITE_ID = PiPlanningWorkflowValueKey.BrainstormingDocument
const POSITIVE_NUMERIC_ID_PATTERN = /^[1-9]\d*$/
const STEP_1_INPUT_FORM_ID = "step-1-input-form"
const STEP_1_TARGET_EPIC_PANEL_ID = "step-1-target-epic-panel"
const STEP_1_EDIT_INTENT_PANEL_ID = "step-1-edit-intent-panel"
const STEP_1_SELECT_STORY_PANEL_ID = "step-1-select-story-panel"
const STEP_1_ADDITIONAL_CONTEXT_PANEL_ID = "step-1-additional-context-panel"

interface PiPlanningEpicIndexEntry {
	identity: string
	title: string
	"story-index-generated": boolean
}

interface PiPlanningEpicsIndexJson {
	version: 1
	epics: readonly PiPlanningEpicIndexEntry[]
}

function buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"] {
	return {
		type: "conditional",
		conditionSourceKey: "__terminal__",
		branches: [],
		defaultTerminal: true,
	}
}

function buildRuntimeRoutedTransition(): WorkflowFormPanelDefinition["transition"] {
	return { type: "runtime_routed" }
}

function buildOption(value: string): WorkflowFormOptionDefinition {
	return { value, label: value }
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && Array.isArray(value) === false
}

function parseEpicsIndexEntry(value: unknown): PiPlanningEpicIndexEntry | undefined {
	if (!isRecord(value)) {
		return undefined
	}

	const identity = value.identity
	const title = value.title
	const storyIndexGenerated = value["story-index-generated"]
	if (typeof identity !== "string" || typeof title !== "string" || typeof storyIndexGenerated !== "boolean") {
		return undefined
	}

	const trimmedIdentity = identity.trim()
	const trimmedTitle = title.trim()
	if (!POSITIVE_NUMERIC_ID_PATTERN.test(trimmedIdentity) || trimmedTitle.length === 0) {
		return undefined
	}

	return {
		identity: trimmedIdentity,
		title: trimmedTitle,
		"story-index-generated": storyIndexGenerated,
	}
}

function parseEpicsIndexJson(value: unknown): PiPlanningEpicsIndexJson | undefined {
	if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.epics) || value.epics.length === 0) {
		return undefined
	}

	const epics: PiPlanningEpicIndexEntry[] = []
	for (const epicValue of value.epics) {
		const epic = parseEpicsIndexEntry(epicValue)
		if (epic === undefined) {
			return undefined
		}
		epics.push(epic)
	}

	return {
		version: 1,
		epics,
	}
}

function readWorkflowStringValue(workflowValues: WorkflowValues, key: PiPlanningWorkflowValueKey): string | undefined {
	const value = workflowValues[key]
	if (typeof value !== "string") {
		return undefined
	}

	const trimmedValue = value.trim()
	return trimmedValue.length > 0 ? trimmedValue : undefined
}

function readWorkflowBooleanValue(workflowValues: WorkflowValues, key: PiPlanningWorkflowValueKey): boolean | undefined {
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

function sourceRouteMatches(sourceRoute: { branchId: string; routeId: string }, branchId: string, routeId: string): boolean {
	return sourceRoute.branchId === branchId && sourceRoute.routeId === routeId
}

function toolBackedOperationSucceeded(branchId: string, routeId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) => {
			if (triggerEvent.kind !== "tool_backed_operation_succeeded") {
				return false
			}

			return sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId)
		},
	}
}

function toolBackedOperationFailed(branchId: string, routeId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) => {
			if (triggerEvent.kind !== "tool_backed_operation_failed") {
				return false
			}

			return sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId)
		},
	}
}

function workflowFormPanelSubmitted(panelId: string, action: WorkflowFormPanelAction): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) => {
			if (triggerEvent.kind !== "workflow_form_panel_submitted") {
				return false
			}

			return (
				triggerEvent.workflowFormId === STEP_1_INPUT_FORM_ID &&
				triggerEvent.panelId === panelId &&
				triggerEvent.action === action
			)
		},
	}
}

function selectedEpicHasStoriesIndex(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, PiPlanningWorkflowValueKey.StoriesIndex) !== undefined,
	}
}

function selectedEpicDoesNotHaveStoriesIndex(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, PiPlanningWorkflowValueKey.StoriesIndex) === undefined,
	}
}

function editIntentMatches(editIntent: PiPlanningEditIntent): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, PiPlanningWorkflowValueKey.EditIntent) === editIntent,
	}
}

function selectedStoryStatusMatches(status: Extract<WorkflowStoryStatus, "draft" | "backlog">): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, PiPlanningWorkflowValueKey.SelectedStoryStatus) === status,
	}
}

function selectedStoryStatusUnsupported(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) => {
			const selectedStoryStatus = readWorkflowStringValue(workflowValues, PiPlanningWorkflowValueKey.SelectedStoryStatus)
			return selectedStoryStatus !== undefined && selectedStoryStatus !== "draft" && selectedStoryStatus !== "backlog"
		},
	}
}

function workflowFormCompletedWithStoriesIndexExistedAtWorkflowStart(expected: boolean): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) => {
			if (triggerEvent.kind !== "workflow_form_completed") {
				return false
			}

			return (
				triggerEvent.workflowFormId === STEP_1_INPUT_FORM_ID &&
				readWorkflowBooleanValue(workflowValues, PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart) ===
					expected
			)
		},
	}
}

function workflowFormCompletedWithEditIntent(editIntent: PiPlanningEditIntent): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) => {
			if (triggerEvent.kind !== "workflow_form_completed") {
				return false
			}

			return (
				triggerEvent.workflowFormId === STEP_1_INPUT_FORM_ID &&
				readWorkflowStringValue(workflowValues, PiPlanningWorkflowValueKey.EditIntent) === editIntent
			)
		},
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

function attemptCompletionSucceeded(): WorkflowDecisionBranchTrigger {
	return {
		kind: "on_event",
		eventKind: "attempt_completion_succeeded",
	}
}

function workflowValuesPersisted(...keys: readonly string[]): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_values_persisted" && keys.every((key) => triggerEvent.changedKeys.includes(key)),
	}
}

function modelToolSucceeded(toolName: ClineDefaultTool): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) => triggerEvent.kind === "model_tool_succeeded" && triggerEvent.toolName === toolName,
	}
}

function modelToolFailed(toolName: ClineDefaultTool): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) => triggerEvent.kind === "model_tool_failed" && triggerEvent.toolName === toolName,
	}
}

function planStoryArtifactsSucceededWithExistingStoryIndexAtWorkflowStart(): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "model_tool_succeeded" &&
			triggerEvent.toolName === ClineDefaultTool.PLAN_STORY_ARTIFACTS &&
			readWorkflowBooleanValue(workflowValues, PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart) === true,
	}
}

function storiesIndexPersistedForNewStoryIndexAtWorkflowStart(): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "workflow_values_persisted" &&
			triggerEvent.changedKeys.includes(PiPlanningWorkflowValueKey.StoriesIndex) &&
			readWorkflowBooleanValue(workflowValues, PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart) === false,
	}
}

function createEmptyPromptSource(): WorkflowStepPromptSource {
	return { kind: "none" }
}

function createStepDefinition(args: {
	stepNumber: number
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

const PI_PLANNING_STEP_2_BASE_PROMPT_TEMPLATE = `Your goal in this workflow is to break a single epic down into deliverable user stories. In this step, you will prepare by reading relevant context. Do not begin generating stories in this step.
You will be focusing on \`{workflow.target_epic}\` during this workflow.
*** Primary Context: ***
  \`{workflow.epics_index}\`
  \`{workflow.epics_document}\`
  \`{workflow.architecture_document}\``

const PI_PLANNING_STEP_2_SECONDARY_CONTEXT_HEADER_PROMPT_TEMPLATE = `*** Secondary Context ***`

const PI_PLANNING_STEP_2_BRAINSTORMING_CONTEXT_PROMPT_TEMPLATE = `  \`{workflow.brainstorming_document}\``

const PI_PLANNING_STEP_2_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE = `  \`{workflow.additional_context}\``

const PI_PLANNING_STEP_2_ASSESSMENT_PROMPT_TEMPLATE = `Assess the provided context for issues, guidance, scope, risks, or requirements relevant to \`{workflow.target_epic}\`, including:
- conflicts between the target epic and architecture decisions, constraints, components, data models, integrations, or deployment assumptions
- ambiguity in the epic objective, requirements, scope, or scope boundary
- missing architectural guidance needed to sequence or size stories
- missing dependencies, prerequisite capabilities, shared contracts, or validation expectations
- requirements in the epic that appear unsupported by the architecture document
- architecture decisions that imply work not captured in the target epic
- risks that would prevent coherent story breakdown, such as unclear ownership, incomplete external-system behavior, unresolved UX/data/API expectations, or contradictory constraints

Do not silently resolve conflicts or fill gaps with assumptions. If you identify material conflicts, ambiguities, or missing information, summarize them for the user as questions or decisions needed before story drafting can begin.

If issues are minor and do not block story drafting, note them briefly and explain to the user how you will account for them during story decomposition.

Only proceed after the user has clarified blocking issues or confirmed that the current context is sufficient. At that point call workflow_progress_request to unlock the next workflow step's instructions.`

const PI_PLANNING_STEP_3_EXISTING_STORY_INDEX_PROMPT_TEMPLATE = `Review the existing story files for this epic in {workflow.drafts_folder}.`

const PI_PLANNING_STEP_3_BODY_PROMPT_TEMPLATE = `Review provided context and existing runtime code/ tests to determine the full set of stories needed to support delivery of {workflow.target_epic}.

A story should represent one coherent, testable capability outcome. It may include backend, UI, prompt/schema, state, docs, and tests later, but only when those pieces are required to deliver the same outcome.

Split a story if:
- The objective contains multiple independent outcomes.
- One part can ship or be validated without the other.
- It crosses a major lifecycle boundary.
- It would need separate QA gates.
- Its requirements cannot be summarized clearly under one Objective.

Stories should not be created that are only file edits, test updates, cleanup chores, or technical layers unless that layer is itself the deliverable contract.

Once you've determined how many stories are needed, provide an update to the user explaining how many stories are needed, then call workflow_progress_request to unlock the next workflow step's instructions.`

const PI_PLANNING_STEP_4_EXISTING_STORY_INDEX_PROMPT_TEMPLATE = `This system uses a story index as the canonical indicator of which stories must exist for each epic.
Target epic: {workflow.target_epic}
Story Index: {workflow.stories_index}

Review the existing story index, then call plan_story_artifacts if additional stories are required beyond what the story index indicates. Use {workflow.epic_identity} when calling the tool. Indicate how many story files are needed to support delivery of {workflow.target_epic}. This tool will add additional stories to the existing story index when you indicate a number of stories greater than the index already contains. e.g. if a story index exists with three story files, and you call plan_story_artifacts and include story_count: 5, the tool will add 2 additional stories to the index so that it contains a total of 5 stories.

If the existing story index does not need additional stories added, use workflow_progress_request to unlock the next workflow step's instructions.`

const PI_PLANNING_STEP_4_NEW_STORY_INDEX_PROMPT_TEMPLATE = `This system uses a story index as the canonical indicator of which stories must exist for each epic. Generate the story index by calling plan_story_artifacts and including the total number of stories required in the story_count field. Use {workflow.epic_identity} when calling the tool.

Once you generate the story index, call set_workflow_values to set the generated file's full file path as the stories_index workflow session key.`

const PI_PLANNING_STEP_4_STORY_INDEX_LOCATION_PROMPT_TEMPLATE = `The story index file can be found in {workflow.implementation_folder}.`

const PI_PLANNING_STEP_5_EXISTING_STORY_INDEX_PROMPT_TEMPLATE = `Call generate_story_files to generate one templatized story for each story in {workflow.stories_index} for which a story file does not already exist. The tool automatically identifies stories with index entries for which there is not an existing story document and generates the files for you. Use {workflow.epic_identity} when calling the tool.`

const PI_PLANNING_STEP_5_NEW_STORY_INDEX_PROMPT_TEMPLATE = `Call generate_story_files to generate one templatized story file for each story in {workflow.stories_index}. Use {workflow.epic_identity} when calling the tool.`

const PI_PLANNING_STEP_5_STORY_FILES_LOCATION_PROMPT_TEMPLATE = `Generated story files can be found in {workflow.drafts_folder}.`

const PI_PLANNING_STEP_6_EDIT_EXISTING_STORY_FILE_PROMPT_TEMPLATE = `You have been called inside a workflow designed to revise the initial sections of an implementation-ready story file in response to violations found during pre-implementation validation.
- Project: {workflow.projectTitle}
- Project Folder: {workflow.projectFolderName}
- Architecture Document: {workflow.architecture_document}
- Epics Documentation: {workflow.epics_document}
- Target Story: {workflow.target_story}

First, ask the user to share the feedback gathered during story validation. Then, review the following sections in the story document, identify the exact revisions needed to address the violations, and provide them to the user as a proposed story revision.
Once the user approves of your revisions, update the story document. Do not edit the tasks section of the story document.
Sections to review and revise based on validation findings:
- Scope
- Scope Boundary
- Requirements
- Objective
- Known Issues/ Risks/ Technical Debt

Once the approved revisions are saved to the story document, use attempt_completion to provide the user with final confirmation and end this workflow.`

const PI_PLANNING_STEP_6_INITIAL_STORY_DETAILS_PROMPT_TEMPLATE = `Populate the generated story files in {workflow.drafts_folder} to set implementation sequence and story-specific details.

Sequence stories by dependency:
1. Contracts, state shape, and invariants.
2. Core runtime/backend behavior.
3. User-facing forms or lifecycle flows.
4. Prompt/tool/schema behavior.
5. Workflow/module consumers.
6. Cleanup, migration, and validation.

Read each story file with read_file, then use apply_patch to add story-specific content under these existing headings:

Scope:
Define what is in-scope

Scope Boundary:
Define items which are out of scope. Should not be overly exhaustive- focus on the things that could be mistakenly interpreted as in-scope to establish a firm scope boundary.

Requirements:
- List the source requirements this story satisfies.
- State the behavior, constraints, and validation expectations.
- Include relevant “must not” rules or invariants.
- Do not include implementation tasks, subtasks, file lists, or commands.

Objective:
As a [user/system/workflow/runtime actor]
I want [one capability outcome]
so that [the value or enabled downstream behavior]

Known Issues/ Risks/ Technical Debt
Include items relevant to the story

Do not create story files manually- use the appropriate plan_story_artifacts -> generate_story_files process if new stories or story files are needed at any point.

Once every story file in {workflow.drafts_folder} contains the required information, send an update to the user informing them that you've updated the epic's stories with initial story details. Ask the user to review and provide feedback. Continue refining the stories as needed based on user feedback.

Once the user is fully aligned with the story set and each story's content, use attempt_completion to provide a final workflow recap to the user, and remind them to run create_story for each generated story to generate story tasks before implementation.`

function buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const promptSections = [PI_PLANNING_STEP_2_BASE_PROMPT_TEMPLATE]
	const secondaryContextLines: string[] = []
	const brainstormingDocument = input.session.workflowValues[PiPlanningWorkflowValueKey.BrainstormingDocument]
	const additionalContext = input.session.workflowValues[PiPlanningWorkflowValueKey.AdditionalContext]

	if (typeof brainstormingDocument === "string" && brainstormingDocument.trim().length > 0) {
		secondaryContextLines.push(PI_PLANNING_STEP_2_BRAINSTORMING_CONTEXT_PROMPT_TEMPLATE)
	}

	if (typeof additionalContext === "string" && additionalContext.trim().length > 0) {
		secondaryContextLines.push(PI_PLANNING_STEP_2_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE)
	}

	if (secondaryContextLines.length > 0) {
		promptSections.push([PI_PLANNING_STEP_2_SECONDARY_CONTEXT_HEADER_PROMPT_TEMPLATE, ...secondaryContextLines].join("\n"))
	}

	promptSections.push(PI_PLANNING_STEP_2_ASSESSMENT_PROMPT_TEMPLATE)

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: promptSections.join("\n\n"),
	}
}

function buildStep3PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const storiesIndexExistedAtWorkflowStart =
		readWorkflowBooleanValue(input.session.workflowValues, PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart) ===
		true
	const promptSections: string[] = []

	if (storiesIndexExistedAtWorkflowStart === true) {
		promptSections.push(PI_PLANNING_STEP_3_EXISTING_STORY_INDEX_PROMPT_TEMPLATE)
	}

	promptSections.push(PI_PLANNING_STEP_3_BODY_PROMPT_TEMPLATE)

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: promptSections.join("\n\n"),
	}
}

function buildStep4PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const storiesIndexExistedAtWorkflowStart =
		readWorkflowBooleanValue(input.session.workflowValues, PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart) ===
		true
	const branchPromptTemplate =
		storiesIndexExistedAtWorkflowStart === true
			? PI_PLANNING_STEP_4_EXISTING_STORY_INDEX_PROMPT_TEMPLATE
			: PI_PLANNING_STEP_4_NEW_STORY_INDEX_PROMPT_TEMPLATE

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: [branchPromptTemplate, PI_PLANNING_STEP_4_STORY_INDEX_LOCATION_PROMPT_TEMPLATE].join(
			"\n\n",
		),
	}
}

function buildStep5PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const storiesIndexExistedAtWorkflowStart =
		readWorkflowBooleanValue(input.session.workflowValues, PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart) ===
		true
	const branchPromptTemplate =
		storiesIndexExistedAtWorkflowStart === true
			? PI_PLANNING_STEP_5_EXISTING_STORY_INDEX_PROMPT_TEMPLATE
			: PI_PLANNING_STEP_5_NEW_STORY_INDEX_PROMPT_TEMPLATE

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: [branchPromptTemplate, PI_PLANNING_STEP_5_STORY_FILES_LOCATION_PROMPT_TEMPLATE].join(
			"\n\n",
		),
	}
}

function buildStep6PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const currentStepInstructionTemplate =
		readWorkflowStringValue(input.session.workflowValues, PiPlanningWorkflowValueKey.EditIntent) ===
		PiPlanningEditIntent.EditExistingStoryFile
			? PI_PLANNING_STEP_6_EDIT_EXISTING_STORY_FILE_PROMPT_TEMPLATE
			: PI_PLANNING_STEP_6_INITIAL_STORY_DETAILS_PROMPT_TEMPLATE

	return { kind: "current_step_instruction_template", currentStepInstructionTemplate }
}

function persistProjectFolderValuesFromEpicsIndex(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult {
	const epicsIndex = readWorkflowStringValue(session.workflowValues, PiPlanningWorkflowValueKey.EpicsIndex)
	if (epicsIndex === undefined) {
		return {
			kind: "failed",
			errorMessage: "PI Planning requires a resolved Epics.index.json path before deriving project folders.",
		}
	}

	const projectRoot = dirname(dirname(epicsIndex))
	return {
		kind: "succeeded",
		workflowValueWrites: {
			[PiPlanningWorkflowValueKey.ImplementationFolder]: join(projectRoot, "implementation"),
			[PiPlanningWorkflowValueKey.DraftsFolder]: join(projectRoot, "implementation", "drafts"),
		},
	}
}

async function validateEpicsIndexBeforeStep1InputForm(session: ActiveWorkflowSession): Promise<WorkflowFormSessionData> {
	const epicsIndex = readWorkflowStringValue(session.workflowValues, PiPlanningWorkflowValueKey.EpicsIndex)
	if (epicsIndex === undefined) {
		throw new Error("PI Planning requires a resolved Epics.index.json path before target epic selection.")
	}

	let parsedJson: unknown
	try {
		const indexContent = await readFile(epicsIndex, "utf8")
		parsedJson = JSON.parse(indexContent)
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error."
		throw new Error(`Unable to read or parse PI Planning Epics.index.json before target epic selection: ${errorMessage}`)
	}

	if (parseEpicsIndexJson(parsedJson) === undefined) {
		throw new Error(
			"PI Planning Epics.index.json must contain version 1, a non-empty epics array, and valid epic entries before target epic selection.",
		)
	}

	return {}
}

async function deriveSelectedEpicValuesFromForm(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult> {
	const epicIdentity = readWorkflowStringValue(session.workflowValues, PiPlanningWorkflowValueKey.EpicIdentity)
	const epicsIndex = readWorkflowStringValue(session.workflowValues, PiPlanningWorkflowValueKey.EpicsIndex)
	if (epicIdentity === undefined || epicsIndex === undefined) {
		return {
			kind: "failed",
			errorMessage: "PI Planning requires a selected epic identity and resolved Epics.index.json path.",
		}
	}

	let parsedJson: unknown
	try {
		const indexContent = await readFile(epicsIndex, "utf8")
		parsedJson = JSON.parse(indexContent)
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error."
		return {
			kind: "failed",
			errorMessage: `Unable to read or parse PI Planning Epics.index.json: ${errorMessage}`,
		}
	}

	const epicsIndexJson = parseEpicsIndexJson(parsedJson)
	if (epicsIndexJson === undefined) {
		return {
			kind: "failed",
			errorMessage: "PI Planning Epics.index.json must contain version 1, a non-empty epics array, and valid epic entries.",
		}
	}

	const selectedEpic = epicsIndexJson.epics.find((epic) => epic.identity === epicIdentity)
	if (selectedEpic === undefined) {
		return {
			kind: "failed",
			errorMessage: `PI Planning selected epic ${epicIdentity} was not found in Epics.index.json.`,
		}
	}

	const targetEpic = `Epic ${selectedEpic.identity}: ${selectedEpic.title}`
	if (selectedEpic["story-index-generated"]) {
		const projectRoot = dirname(dirname(epicsIndex))
		const storiesIndexPath = join(projectRoot, "implementation", `epic-${selectedEpic.identity}-stories.index.json`)
		return {
			kind: "succeeded",
			workflowValueWrites: {
				[PiPlanningWorkflowValueKey.TargetEpic]: targetEpic,
				[PiPlanningWorkflowValueKey.StoriesIndex]: storiesIndexPath,
				[PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: true,
			},
		}
	}

	return {
		kind: "succeeded",
		workflowValueWrites: {
			[PiPlanningWorkflowValueKey.TargetEpic]: targetEpic,
			[PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: false,
		},
	}
}

function findStoryIndexRecord(args: { stories: readonly unknown[]; storyIdentity: string }): Record<string, unknown> | undefined {
	for (const storyValue of args.stories) {
		if (isRecord(storyValue) === false) {
			continue
		}

		if (storyValue.story_identity === args.storyIdentity) {
			return storyValue
		}
	}

	return undefined
}

async function deriveSelectedStoryValuesFromForm(session: ActiveWorkflowSession): Promise<WorkflowDeterministicProcedureResult> {
	const selectedStoryIdentity = readWorkflowStringValue(
		session.workflowValues,
		PiPlanningWorkflowValueKey.SelectedStoryIdentity,
	)
	if (selectedStoryIdentity === undefined) {
		return {
			kind: "failed",
			errorMessage: "PI Planning requires a selected story identity before resolving the target story.",
		}
	}

	const storiesIndex = readWorkflowStringValue(session.workflowValues, PiPlanningWorkflowValueKey.StoriesIndex)
	if (storiesIndex === undefined) {
		return {
			kind: "failed",
			errorMessage: "PI Planning requires a resolved stories_index path before resolving the target story.",
		}
	}

	let parsedStoryIndex: unknown
	try {
		const storyIndexText = await readFile(storiesIndex, "utf8")
		parsedStoryIndex = JSON.parse(storyIndexText)
	} catch {
		return {
			kind: "failed",
			errorMessage: "I could not read or parse the selected story index before resolving the target story.",
		}
	}

	if (
		isRecord(parsedStoryIndex) === false ||
		parsedStoryIndex.version !== 1 ||
		Array.isArray(parsedStoryIndex.stories) === false
	) {
		return {
			kind: "failed",
			errorMessage: "I could not read or parse the selected story index before resolving the target story.",
		}
	}
	const storyRecords: readonly unknown[] = parsedStoryIndex.stories

	const selectedStory = findStoryIndexRecord({ stories: storyRecords, storyIdentity: selectedStoryIdentity })
	if (selectedStory === undefined) {
		return {
			kind: "failed",
			errorMessage: "The selected story was not found in the selected story index.",
		}
	}

	const selectedStoryType = selectedStory.story_type
	const selectedStoryStatus = selectedStory.status
	if (selectedStoryType !== "primary" || (selectedStoryStatus !== "draft" && selectedStoryStatus !== "backlog")) {
		return {
			kind: "failed",
			errorMessage: "The selected story has an unsupported story status.",
		}
	}

	const selectedStoryFileName = selectedStory.story_file_name
	if (typeof selectedStoryFileName !== "string") {
		return {
			kind: "failed",
			errorMessage: "I could not read or parse the selected story index before resolving the target story.",
		}
	}

	return {
		kind: "succeeded",
		workflowValueWrites: {
			[PiPlanningWorkflowValueKey.SelectedStoryFileName]: selectedStoryFileName,
			[PiPlanningWorkflowValueKey.SelectedStoryStatus]: selectedStoryStatus,
		},
	}
}

function buildGenerateMissingStoryFilesInstruction(): WorkflowToolBackedActionInstruction {
	return {
		toolName: ClineDefaultTool.GENERATE_STORY_FILES,
		buildStatusDefinition: (): WorkflowStepResolutionStatusDefinition => ({
			title: "Generate Missing Story Files",
			pendingLabel: "Generating missing story files",
			successLabel: "Generated missing story files",
			failureLabel: "Failed to generate missing story files",
		}),
		buildToolExecutionRequest: ({ activeWorkflowSession }): WorkflowToolBackedOperationExecutionRequest => ({
			toolName: ClineDefaultTool.GENERATE_STORY_FILES,
			toolInput: {},
			toolParams: {
				epic_identity:
					readWorkflowStringValue(activeWorkflowSession.workflowValues, PiPlanningWorkflowValueKey.EpicIdentity) ?? "",
			},
		}),
		evaluateToolExecutionResult: (): WorkflowToolBackedOperationEvaluationResult => ({ succeeded: true }),
	}
}

function buildValidateSelectedStoryIndexEntryAction(
	status: Extract<WorkflowStoryStatus, "draft" | "backlog">,
): WorkflowDecisionAction {
	return {
		kind: "validate_story_index_entry",
		storyIndexWorkflowValueKey: PiPlanningWorkflowValueKey.StoriesIndex,
		storyIdentityWorkflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryIdentity,
		storyFilenameWorkflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryFileName,
		requiredStoryType: "primary",
		requiredStatus: status,
		missingOrMalformedIndexErrorMessage:
			"I could not read or parse the selected story index before resolving the target story.",
		missingEntryErrorMessage: "The selected story was not found in the selected story index.",
		invalidEntryErrorMessage: "I could not read or parse the selected story index before resolving the target story.",
	}
}

function buildResolveDraftTargetStoryAction(): WorkflowDecisionAction {
	return {
		kind: "resolve_existing_project_artifact",
		artifactFamily: WorkflowArtifactFamily.Story,
		artifactIdentityWorkflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryIdentity,
		projectSubfolderSegments: ["implementation", "drafts"],
		outputWorkflowValueKey: PiPlanningWorkflowValueKey.TargetStory,
		missingArtifactErrorMessage: "The target story path does not exist.",
	}
}

function buildResolveBacklogTargetStoryAction(): WorkflowDecisionAction {
	return {
		kind: "resolve_existing_project_artifact",
		artifactFamily: WorkflowArtifactFamily.Story,
		artifactIdentityWorkflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryIdentity,
		projectSubfolderSegments: ["implementation", "stories-backlog"],
		outputWorkflowValueKey: PiPlanningWorkflowValueKey.TargetStory,
		missingArtifactErrorMessage: "The target story path does not exist.",
	}
}

function buildStep1TargetEpicPanel(): WorkflowFormPanelDefinition {
	return {
		panelId: STEP_1_TARGET_EPIC_PANEL_ID,
		title: "Target Epic",
		promptMarkdown: "Which epic are we working on during this workflow?",
		fields: [
			{
				key: PiPlanningWorkflowValueKey.EpicIdentity,
				workflowValueKey: PiPlanningWorkflowValueKey.EpicIdentity,
				kind: "dropdown",
				label: "Target Epic",
				required: true,
				allowedValueType: "string",
				resetValueKeysOnChange: [
					PiPlanningWorkflowValueKey.TargetEpic,
					PiPlanningWorkflowValueKey.StoriesIndex,
					PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart,
					PiPlanningWorkflowValueKey.EditIntent,
					PiPlanningWorkflowValueKey.SelectedStoryIdentity,
					PiPlanningWorkflowValueKey.SelectedStoryFileName,
					PiPlanningWorkflowValueKey.SelectedStoryStatus,
					PiPlanningWorkflowValueKey.TargetStory,
					PiPlanningWorkflowValueKey.AdditionalContext,
				],
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
		actionLabels: { submit: "Continue" },
		transition: buildRuntimeRoutedTransition(),
	}
}

function buildStep1EditIntentPanel(): WorkflowFormPanelDefinition {
	return {
		panelId: STEP_1_EDIT_INTENT_PANEL_ID,
		title: "Provide Edit Intent",
		promptMarkdown:
			"It looks like the selected epic already has a story index file with generated story files. Please select one of the following options:",
		fields: [
			{
				key: PiPlanningWorkflowValueKey.EditIntent,
				workflowValueKey: PiPlanningWorkflowValueKey.EditIntent,
				kind: "dropdown",
				label: "select one",
				required: true,
				allowedValueType: "string",
				resetValueKeysOnChange: [
					PiPlanningWorkflowValueKey.SelectedStoryIdentity,
					PiPlanningWorkflowValueKey.SelectedStoryFileName,
					PiPlanningWorkflowValueKey.SelectedStoryStatus,
					PiPlanningWorkflowValueKey.TargetStory,
					PiPlanningWorkflowValueKey.AdditionalContext,
				],
				options: [
					buildOption(PiPlanningEditIntent.CompleteInitialStoryBuildout),
					buildOption(PiPlanningEditIntent.EditExistingStoryFile),
				],
			},
		],
		allowedActions: ["submit", "back"],
		actionLabels: { submit: "Continue", back: "Back" },
		backDestinationPanelId: STEP_1_TARGET_EPIC_PANEL_ID,
		backStaleValueKeysToClear: [
			PiPlanningWorkflowValueKey.EditIntent,
			PiPlanningWorkflowValueKey.SelectedStoryIdentity,
			PiPlanningWorkflowValueKey.SelectedStoryFileName,
			PiPlanningWorkflowValueKey.SelectedStoryStatus,
			PiPlanningWorkflowValueKey.TargetStory,
			PiPlanningWorkflowValueKey.AdditionalContext,
		],
		transition: buildRuntimeRoutedTransition(),
	}
}

function buildStep1SelectStoryPanel(): WorkflowFormPanelDefinition {
	return {
		panelId: STEP_1_SELECT_STORY_PANEL_ID,
		title: "Select Story",
		promptMarkdown: "Which story would you like to edit?",
		fields: [
			{
				key: PiPlanningWorkflowValueKey.SelectedStoryIdentity,
				workflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryIdentity,
				kind: "dropdown",
				label: "Select Story",
				required: true,
				allowedValueType: "string",
				resetValueKeysOnChange: [
					PiPlanningWorkflowValueKey.SelectedStoryFileName,
					PiPlanningWorkflowValueKey.SelectedStoryStatus,
					PiPlanningWorkflowValueKey.TargetStory,
					PiPlanningWorkflowValueKey.AdditionalContext,
				],
				jsonOptionsSource: {
					root: {
						kind: "selected_project_root",
					},
					sourcePathSegments: ["implementation", "epic-{workflow.epic_identity}-stories.index.json"],
					itemsPath: "stories",
					valueProperty: "story_identity",
					labelTemplate: "Story {story_identity}: {story_file_name}",
				},
			},
		],
		allowedActions: ["submit", "back"],
		actionLabels: { submit: "Continue", back: "Back" },
		backDestinationPanelId: STEP_1_EDIT_INTENT_PANEL_ID,
		backStaleValueKeysToClear: [
			PiPlanningWorkflowValueKey.SelectedStoryIdentity,
			PiPlanningWorkflowValueKey.SelectedStoryFileName,
			PiPlanningWorkflowValueKey.SelectedStoryStatus,
			PiPlanningWorkflowValueKey.TargetStory,
			PiPlanningWorkflowValueKey.AdditionalContext,
		],
		transition: buildRuntimeRoutedTransition(),
	}
}

function buildStep1AdditionalContextPanel(): WorkflowFormPanelDefinition {
	return {
		panelId: STEP_1_ADDITIONAL_CONTEXT_PANEL_ID,
		title: "Additional Context",
		promptMarkdown:
			"If you'd like to include any other files as workflow context please provide their full file paths below.",
		fields: [
			{
				key: PiPlanningWorkflowValueKey.AdditionalContext,
				workflowValueKey: PiPlanningWorkflowValueKey.AdditionalContext,
				kind: "large_text",
				label: "Additional context file paths",
				required: false,
				allowedValueType: "string",
				presentation: {
					textareaSize: "large",
				},
			},
		],
		allowedActions: ["submit"],
		actionLabels: { submit: "Continue" },
		transition: buildTerminalTransition(),
	}
}

function buildStep1InputWorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "PI Planning Inputs",
		toolDictionaryTitle: "PI Planning Inputs",
		toolDictionaryMarkdown: "Provide PI Planning target epic and context confirmation inputs.",
		firstPanelId: STEP_1_TARGET_EPIC_PANEL_ID,
		panels: {
			[STEP_1_TARGET_EPIC_PANEL_ID]: buildStep1TargetEpicPanel(),
			[STEP_1_EDIT_INTENT_PANEL_ID]: buildStep1EditIntentPanel(),
			[STEP_1_SELECT_STORY_PANEL_ID]: buildStep1SelectStoryPanel(),
			[STEP_1_ADDITIONAL_CONTEXT_PANEL_ID]: buildStep1AdditionalContextPanel(),
		},
	}
}

function buildStep1ContinuationReplacement(panel: WorkflowFormPanelDefinition): WorkflowFormContinuationReplacement {
	return { panel, data: {} }
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
								ARCHITECTURE_PREREQUISITE_ID,
								EPICS_DOCUMENT_PREREQUISITE_ID,
								EPICS_INDEX_PREREQUISITE_ID,
								BRAINSTORMING_PREREQUISITE_ID,
							],
						},
						followingBranchId: "step-1-persist-project-folder-values",
					},
				],
			},
			"step-1-persist-project-folder-values": {
				id: "step-1-persist-project-folder-values",
				routes: [
					{
						id: "step-1-persist-project-folder-values",
						trigger: { kind: "always" },
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: persistProjectFolderValuesFromEpicsIndex,
							},
						},
						followingBranchId: "step-1-render-input-form",
					},
				],
			},
			"step-1-render-input-form": {
				id: "step-1-render-input-form",
				routes: [
					{
						id: "step-1-render-input-form",
						trigger: { kind: "always" },
						action: {
							kind: "render_workflow_form",
							workflowFormId: STEP_1_INPUT_FORM_ID,
							buildSessionData: validateEpicsIndexBeforeStep1InputForm,
						},
						followingBranchId: "step-1-await-target-epic-panel",
					},
				],
			},
			"step-1-await-target-epic-panel": {
				id: "step-1-await-target-epic-panel",
				routes: [
					{
						id: "step-1-derive-selected-epic-values",
						trigger: workflowFormPanelSubmitted(STEP_1_TARGET_EPIC_PANEL_ID, "submit"),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveSelectedEpicValuesFromForm,
							},
						},
						followingBranchId: "step-1-route-after-target-epic-panel",
					},
				],
			},
			"step-1-route-after-target-epic-panel": {
				id: "step-1-route-after-target-epic-panel",
				routes: [
					{
						id: "step-1-continue-to-edit-intent-panel",
						trigger: selectedEpicHasStoriesIndex(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: STEP_1_INPUT_FORM_ID,
							panelId: STEP_1_EDIT_INTENT_PANEL_ID,
							buildReplacement: (): WorkflowFormContinuationReplacement =>
								buildStep1ContinuationReplacement(buildStep1EditIntentPanel()),
						},
						followingBranchId: "step-1-await-edit-intent-panel",
					},
					{
						id: "step-1-continue-to-additional-context-after-new-index-epic",
						trigger: selectedEpicDoesNotHaveStoriesIndex(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: STEP_1_INPUT_FORM_ID,
							panelId: STEP_1_ADDITIONAL_CONTEXT_PANEL_ID,
							buildReplacement: (): WorkflowFormContinuationReplacement =>
								buildStep1ContinuationReplacement(buildStep1AdditionalContextPanel()),
						},
						followingBranchId: "step-1-await-final-form-submit",
					},
				],
			},
			"step-1-await-edit-intent-panel": {
				id: "step-1-await-edit-intent-panel",
				routes: [
					{
						id: "step-1-route-after-edit-intent",
						trigger: workflowFormPanelSubmitted(STEP_1_EDIT_INTENT_PANEL_ID, "submit"),
						action: { kind: "no_op" },
						followingBranchId: "step-1-route-after-edit-intent-panel",
					},
				],
			},
			"step-1-route-after-edit-intent-panel": {
				id: "step-1-route-after-edit-intent-panel",
				routes: [
					{
						id: "step-1-continue-to-additional-context-after-complete-initial-buildout",
						trigger: editIntentMatches(PiPlanningEditIntent.CompleteInitialStoryBuildout),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: STEP_1_INPUT_FORM_ID,
							panelId: STEP_1_ADDITIONAL_CONTEXT_PANEL_ID,
							buildReplacement: (): WorkflowFormContinuationReplacement =>
								buildStep1ContinuationReplacement(buildStep1AdditionalContextPanel()),
						},
						followingBranchId: "step-1-await-final-form-submit",
					},
					{
						id: "step-1-continue-to-select-story-panel",
						trigger: editIntentMatches(PiPlanningEditIntent.EditExistingStoryFile),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: STEP_1_INPUT_FORM_ID,
							panelId: STEP_1_SELECT_STORY_PANEL_ID,
							buildReplacement: (): WorkflowFormContinuationReplacement =>
								buildStep1ContinuationReplacement(buildStep1SelectStoryPanel()),
						},
						followingBranchId: "step-1-await-select-story-panel",
					},
				],
			},
			"step-1-await-select-story-panel": {
				id: "step-1-await-select-story-panel",
				routes: [
					{
						id: "step-1-derive-selected-story-values",
						trigger: workflowFormPanelSubmitted(STEP_1_SELECT_STORY_PANEL_ID, "submit"),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveSelectedStoryValuesFromForm,
							},
						},
						followingBranchId: "step-1-continue-to-additional-context-after-story-selection",
					},
				],
			},
			"step-1-continue-to-additional-context-after-story-selection": {
				id: "step-1-continue-to-additional-context-after-story-selection",
				routes: [
					{
						id: "step-1-continue-to-additional-context-after-story-selection",
						trigger: { kind: "always" },
						action: {
							kind: "continue_workflow_form",
							workflowFormId: STEP_1_INPUT_FORM_ID,
							panelId: STEP_1_ADDITIONAL_CONTEXT_PANEL_ID,
							buildReplacement: (): WorkflowFormContinuationReplacement =>
								buildStep1ContinuationReplacement(buildStep1AdditionalContextPanel()),
						},
						followingBranchId: "step-1-await-final-form-submit",
					},
				],
			},
			"step-1-await-final-form-submit": {
				id: "step-1-await-final-form-submit",
				routes: [
					{
						id: "step-1-transition-to-step-2-after-new-index-epic",
						trigger: workflowFormCompletedWithStoriesIndexExistedAtWorkflowStart(false),
						action: {
							kind: "transition_step",
							target: { kind: "entry_branch", stepNumber: 2 },
						},
					},
					{
						id: "step-1-transition-to-step-2-after-complete-initial-buildout",
						trigger: workflowFormCompletedWithEditIntent(PiPlanningEditIntent.CompleteInitialStoryBuildout),
						action: {
							kind: "transition_step",
							target: { kind: "entry_branch", stepNumber: 2 },
						},
					},
					{
						id: "step-1-generate-missing-story-files-before-edit",
						trigger: workflowFormCompletedWithEditIntent(PiPlanningEditIntent.EditExistingStoryFile),
						action: {
							kind: "execute_tool_backed_operation",
							instruction: buildGenerateMissingStoryFilesInstruction(),
						},
						followingBranchId: "step-1-await-missing-story-generation",
					},
				],
			},
			"step-1-await-missing-story-generation": {
				id: "step-1-await-missing-story-generation",
				routes: [
					{
						id: "step-1-route-target-story-status-after-missing-story-generation",
						trigger: toolBackedOperationSucceeded(
							"step-1-await-final-form-submit",
							"step-1-generate-missing-story-files-before-edit",
						),
						action: { kind: "no_op" },
						followingBranchId: "step-1-route-target-story-status",
					},
					{
						id: "step-1-fail-after-missing-story-generation",
						trigger: toolBackedOperationFailed(
							"step-1-await-final-form-submit",
							"step-1-generate-missing-story-files-before-edit",
						),
						action: { kind: "terminal_error", errorMessage: "Failed to generate missing story files" },
					},
				],
			},
			"step-1-route-target-story-status": {
				id: "step-1-route-target-story-status",
				routes: [
					{
						id: "step-1-validate-draft-story-index-entry",
						trigger: selectedStoryStatusMatches("draft"),
						action: buildValidateSelectedStoryIndexEntryAction("draft"),
						followingBranchId: "step-1-resolve-draft-target-story",
					},
					{
						id: "step-1-validate-backlog-story-index-entry",
						trigger: selectedStoryStatusMatches("backlog"),
						action: buildValidateSelectedStoryIndexEntryAction("backlog"),
						followingBranchId: "step-1-resolve-backlog-target-story",
					},
					{
						id: "step-1-fail-unsupported-selected-story-status",
						trigger: selectedStoryStatusUnsupported(),
						action: { kind: "terminal_error", errorMessage: "The selected story has an unsupported story status." },
					},
				],
			},
			"step-1-resolve-draft-target-story": {
				id: "step-1-resolve-draft-target-story",
				routes: [
					{
						id: "step-1-resolve-draft-target-story",
						trigger: { kind: "always" },
						action: buildResolveDraftTargetStoryAction(),
						followingBranchId: "step-1-await-target-story-resolution",
					},
				],
			},
			"step-1-resolve-backlog-target-story": {
				id: "step-1-resolve-backlog-target-story",
				routes: [
					{
						id: "step-1-resolve-backlog-target-story",
						trigger: { kind: "always" },
						action: buildResolveBacklogTargetStoryAction(),
						followingBranchId: "step-1-await-target-story-resolution",
					},
				],
			},
			"step-1-await-target-story-resolution": {
				id: "step-1-await-target-story-resolution",
				routes: [
					{
						id: "step-1-transition-to-step-6-after-target-story-resolution",
						trigger: workflowValuesPersisted(PiPlanningWorkflowValueKey.TargetStory),
						action: {
							kind: "transition_step",
							target: { kind: "entry_branch", stepNumber: 6 },
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
						followingBranchId: "step-4-await-story-index",
					},
				],
			},
			"step-4-await-story-index": {
				id: "step-4-await-story-index",
				routes: [
					{
						id: "step-4-return-to-project-prompt",
						trigger: workflowProgressRequestDenied(),
						action: {
							kind: "project_prompt",
						},
					},
					{
						id: "step-4-transition-to-step-5-after-progress-confirmed",
						trigger: workflowProgressRequestConfirmed(),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 5,
							},
						},
					},
					{
						id: "step-4-transition-to-step-5-after-stories-index-persisted",
						trigger: storiesIndexPersistedForNewStoryIndexAtWorkflowStart(),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 5,
							},
						},
					},
					{
						id: "step-4-transition-to-step-5-after-existing-stories-index-reentry",
						trigger: planStoryArtifactsSucceededWithExistingStoryIndexAtWorkflowStart(),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 5,
							},
						},
					},
					{
						id: "step-4-return-to-project-prompt-after-plan-story-artifacts-failed",
						trigger: modelToolFailed(ClineDefaultTool.PLAN_STORY_ARTIFACTS),
						action: {
							kind: "project_prompt",
						},
					},
				],
			},
		},
	}
}

function buildStep5DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-5-project-prompt",
		branches: {
			"step-5-project-prompt": {
				id: "step-5-project-prompt",
				routes: [
					{
						id: "step-5-project-prompt",
						trigger: { kind: "always" },
						action: {
							kind: "project_prompt",
						},
						followingBranchId: "step-5-await-generated-story-files",
					},
				],
			},
			"step-5-await-generated-story-files": {
				id: "step-5-await-generated-story-files",
				routes: [
					{
						id: "step-5-transition-to-step-6",
						trigger: modelToolSucceeded(ClineDefaultTool.GENERATE_STORY_FILES),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 6,
							},
						},
					},
					{
						id: "step-5-return-to-project-prompt-after-generate-story-files-failed",
						trigger: modelToolFailed(ClineDefaultTool.GENERATE_STORY_FILES),
						action: {
							kind: "project_prompt",
						},
					},
				],
			},
		},
	}
}

function buildStep6DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-6-project-prompt",
		branches: {
			"step-6-project-prompt": {
				id: "step-6-project-prompt",
				routes: [
					{
						id: "step-6-project-prompt",
						trigger: { kind: "always" },
						action: {
							kind: "project_prompt",
						},
						followingBranchId: "step-6-await-attempt-completion",
					},
				],
			},
			"step-6-await-attempt-completion": {
				id: "step-6-await-attempt-completion",
				routes: [
					{
						id: "step-6-complete-workflow-after-attempt-completion",
						trigger: attemptCompletionSucceeded(),
						action: {
							kind: "complete_workflow",
						},
					},
				],
			},
		},
	}
}

export const piPlanningWorkflowDefinition: WorkflowDefinition = {
	name: PI_PLANNING_WORKFLOW_NAME,
	displayName: PI_PLANNING_WORKFLOW_DISPLAY_NAME,
	description: PI_PLANNING_WORKFLOW_DESCRIPTION,
	slashCommandName: PI_PLANNING_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: PI_PLANNING_WORKFLOW_USE_SKILL_NAME,
	persona: PI_PLANNING_WORKFLOW_PERSONA,
	projectSubfolder: PI_PLANNING_WORKFLOW_PROJECT_SUBFOLDER,
	workflowValueKeys: PI_PLANNING_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: {
		projectMode: PiPlanningWorkflowValueKey.ProjectMode,
		projectTitle: PiPlanningWorkflowValueKey.ProjectTitle,
		projectFolderName: PiPlanningWorkflowValueKey.ProjectFolderName,
	},
	entryPanel: {
		promptMarkdown: PI_PLANNING_WORKFLOW_DESCRIPTION,
	},
	workflowForms: {
		[STEP_1_INPUT_FORM_ID]: buildStep1InputWorkflowForm(),
	},
	prerequisiteFiles: {
		[ARCHITECTURE_PREREQUISITE_ID]: {
			id: ARCHITECTURE_PREREQUISITE_ID,
			requirement: "required",
			producingWorkflowName: "create-architecture",
			projectSubfolderSegments: ["planning"],
			match: { kind: "exact_filename", filename: "architecture.md" },
			workflowValueKey: PiPlanningWorkflowValueKey.ArchitectureDocument,
			outputDocumentReference: "none",
		},
		[EPICS_DOCUMENT_PREREQUISITE_ID]: {
			id: EPICS_DOCUMENT_PREREQUISITE_ID,
			requirement: "required",
			producingWorkflowName: "create-epics",
			projectSubfolderSegments: ["planning"],
			match: { kind: "exact_filename", filename: "Epics.md" },
			workflowValueKey: PiPlanningWorkflowValueKey.EpicsDocument,
			outputDocumentReference: "none",
		},
		[EPICS_INDEX_PREREQUISITE_ID]: {
			id: EPICS_INDEX_PREREQUISITE_ID,
			requirement: "required",
			producingWorkflowName: "create-epics",
			projectSubfolderSegments: ["planning"],
			match: { kind: "exact_filename", filename: "Epics.index.json" },
			workflowValueKey: PiPlanningWorkflowValueKey.EpicsIndex,
			outputDocumentReference: "none",
		},
		[BRAINSTORMING_PREREQUISITE_ID]: {
			id: BRAINSTORMING_PREREQUISITE_ID,
			requirement: "optional",
			producingWorkflowName: "brainstorming",
			projectSubfolderSegments: ["discovery"],
			match: { kind: "exact_filename", filename: "brainstorming.md" },
			workflowValueKey: PiPlanningWorkflowValueKey.BrainstormingDocument,
			outputDocumentReference: "none",
		},
	},
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Gather Inputs",
			decisionTree: buildStep1DecisionTree(),
			buildToolSchema: buildPiPlanningStep1ToolSchemas,
		}),
		"step-2": createStepDefinition({
			stepNumber: 2,
			checklistLabel: "Review Context",
			decisionTree: buildStep2DecisionTree(),
			buildPromptSource: buildStep2PromptSource,
			promptTemplates: [
				PI_PLANNING_STEP_2_BASE_PROMPT_TEMPLATE,
				PI_PLANNING_STEP_2_SECONDARY_CONTEXT_HEADER_PROMPT_TEMPLATE,
				PI_PLANNING_STEP_2_BRAINSTORMING_CONTEXT_PROMPT_TEMPLATE,
				PI_PLANNING_STEP_2_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE,
				PI_PLANNING_STEP_2_ASSESSMENT_PROMPT_TEMPLATE,
			],
			buildToolSchema: buildPiPlanningStep2ToolSchemas,
		}),
		"step-3": createStepDefinition({
			stepNumber: 3,
			checklistLabel: "Determine How Many Stories Are Needed",
			decisionTree: buildStep3DecisionTree(),
			buildPromptSource: buildStep3PromptSource,
			promptTemplates: [PI_PLANNING_STEP_3_EXISTING_STORY_INDEX_PROMPT_TEMPLATE, PI_PLANNING_STEP_3_BODY_PROMPT_TEMPLATE],
			buildToolSchema: buildPiPlanningStep3ToolSchemas,
		}),
		"step-4": createStepDefinition({
			stepNumber: 4,
			checklistLabel: "Generate an Updated Story Index",
			decisionTree: buildStep4DecisionTree(),
			buildPromptSource: buildStep4PromptSource,
			promptTemplates: [
				PI_PLANNING_STEP_4_EXISTING_STORY_INDEX_PROMPT_TEMPLATE,
				PI_PLANNING_STEP_4_NEW_STORY_INDEX_PROMPT_TEMPLATE,
				PI_PLANNING_STEP_4_STORY_INDEX_LOCATION_PROMPT_TEMPLATE,
			],
			buildToolSchema: buildPiPlanningStep4ToolSchemas,
		}),
		"step-5": createStepDefinition({
			stepNumber: 5,
			checklistLabel: "Generate Story Files from the Story Index",
			decisionTree: buildStep5DecisionTree(),
			buildPromptSource: buildStep5PromptSource,
			promptTemplates: [
				PI_PLANNING_STEP_5_EXISTING_STORY_INDEX_PROMPT_TEMPLATE,
				PI_PLANNING_STEP_5_NEW_STORY_INDEX_PROMPT_TEMPLATE,
				PI_PLANNING_STEP_5_STORY_FILES_LOCATION_PROMPT_TEMPLATE,
			],
			buildToolSchema: buildPiPlanningStep5ToolSchemas,
		}),
		"step-6": createStepDefinition({
			stepNumber: 6,
			checklistLabel: "Populate Story Files with Initial Details",
			decisionTree: buildStep6DecisionTree(),
			buildPromptSource: buildStep6PromptSource,
			promptTemplates: [
				PI_PLANNING_STEP_6_EDIT_EXISTING_STORY_FILE_PROMPT_TEMPLATE,
				PI_PLANNING_STEP_6_INITIAL_STORY_DETAILS_PROMPT_TEMPLATE,
			],
			buildToolSchema: buildPiPlanningStep6ToolSchemas,
		}),
	},
}
