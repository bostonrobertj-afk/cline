import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { WorkflowFormDefinitionPayload } from "@shared/ExtensionMessage"
import type { WorkflowFormSessionData } from "@/core/task/workflow-form/types"
import { ClineDefaultTool } from "@/shared/tools"
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
	buildPiPlanningStep1ToolSchemas,
	buildPiPlanningStep2ToolSchemas,
	buildPiPlanningStep3ToolSchemas,
	buildPiPlanningStep4ToolSchemas,
	buildPiPlanningStep5ToolSchemas,
	buildPiPlanningStep6ToolSchemas,
} from "./piPlanningToolSchemas"

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
const STEP_1_REQUIRED_CONTEXT_PANEL_ID = "step-1-required-context-panel"
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
	return {}
}

function renderWorkflowValueByKey(input: WorkflowPromptBuilderInput, key: PiPlanningWorkflowValueKey): string {
	return input.renderWorkflowValue(input.session.workflowValues[key] ?? key)
}

function renderOptionalWorkflowValueReference(input: WorkflowPromptBuilderInput, key: PiPlanningWorkflowValueKey): string {
	const value = readWorkflowStringValue(input.session.workflowValues, key)
	return value === undefined ? "not provided" : input.renderWorkflowValue(value)
}

function createStepDefinition(args: {
	stepNumber: number
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

function buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const targetEpic = renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.TargetEpic)
	const epicsIndex = renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.EpicsIndex)
	const epicsDocument = renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.EpicsDocument)
	const architectureDocument = renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.ArchitectureDocument)
	const brainstormingDocument = renderOptionalWorkflowValueReference(input, PiPlanningWorkflowValueKey.BrainstormingDocument)
	const additionalContext = renderOptionalWorkflowValueReference(input, PiPlanningWorkflowValueKey.AdditionalContext)

	return {
		currentStepInstructions: `Prepare to break a single epic down into deliverable user stories.

Focus only on \`${targetEpic}\`.

Read \`${epicsIndex}\`, \`${epicsDocument}\`, and \`${architectureDocument}\`.

Read the optional brainstorming document when present and approved: \`${brainstormingDocument}\`.

Read additional context files when provided and relevant: \`${additionalContext}\`.

Assess the available context for issues, guidance, scope, risks, or requirements relevant to \`${targetEpic}\`.

Identify conflicts between the target epic and architecture decisions, constraints, components, data models, integrations, or deployment assumptions.

Identify ambiguity in the epic objective, requirements, scope, or scope boundary.

Identify missing architectural guidance needed to sequence or size stories.

Identify missing dependencies, prerequisite capabilities, shared contracts, or validation expectations.

Identify requirements in the epic that appear unsupported by the architecture document.

Identify architecture decisions that imply work not captured in the target epic.

Identify risks that would prevent coherent story breakdown.

Do not silently resolve conflicts or fill gaps with assumptions.

Summarize material conflicts, ambiguities, or missing information to the user as questions or decisions needed before story drafting can begin.

Briefly note non-blocking issues and explain how they will be accounted for during story decomposition.

Call \`workflow_progress_request\` only after the user clarifies blocking issues or confirms the current context is sufficient.`,
	}
}

function buildStep3PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const targetEpic = renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.TargetEpic)
	const draftsFolder = renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.DraftsFolder)
	const storiesIndexExistedAtWorkflowStart =
		readWorkflowBooleanValue(input.session.workflowValues, PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart) ===
		true
	const existingStoryIndexInstruction = storiesIndexExistedAtWorkflowStart
		? `

An existing story index is present at \`${renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.StoriesIndex)}\`. Review the existing story files for this epic in \`${draftsFolder}\` before deciding whether more stories are needed.`
		: ""

	return {
		currentStepInstructions: `Review the provided context and existing runtime code/tests to determine the full set of stories needed to support delivery of \`${targetEpic}\`.${existingStoryIndexInstruction}

Treat a story as one coherent, testable capability outcome.

Allow backend, UI, prompt/schema, state, docs, and tests in one story only when those pieces are required to deliver the same outcome.

Split a story when the objective contains multiple independent outcomes, one part can ship or be validated without the other, it crosses a major lifecycle boundary, it would need separate QA gates, or its requirements cannot be summarized clearly under one objective.

Avoid stories that are only file edits, test updates, cleanup chores, or technical layers unless that layer is itself the deliverable contract.

Provide an update to the user explaining how many stories are needed.

Call \`workflow_progress_request\` after explaining the story count.`,
	}
}

function buildStep4PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const targetEpic = renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.TargetEpic)
	const epicIdentity = renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.EpicIdentity)
	const implementationFolder = renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.ImplementationFolder)
	const storiesIndexExistedAtWorkflowStart =
		readWorkflowBooleanValue(input.session.workflowValues, PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart) ===
		true
	const branchInstructions = storiesIndexExistedAtWorkflowStart
		? `Story-index branch: an existing \`stories_index\` is present at \`${renderWorkflowValueByKey(
				input,
				PiPlanningWorkflowValueKey.StoriesIndex,
			)}\`.

Review the existing story index.

Call \`plan_story_artifacts\` only if additional stories are required beyond what the story index indicates.

When calling \`plan_story_artifacts\`, pass \`${epicIdentity}\` as \`epic_identity\`.

When calling \`plan_story_artifacts\`, provide the total number of stories required for \`${targetEpic}\` as \`story_count\`, not the number of newly added stories.

Calling \`plan_story_artifacts\` with a \`story_count\` greater than the existing indexed count appends missing primary story entries up to that total.

Call \`workflow_progress_request\` when no additional stories are required.`
		: `Story-index branch: no \`stories_index\` existed at workflow start for \`${targetEpic}\`.

Call \`plan_story_artifacts\`.

Pass \`${epicIdentity}\` as \`epic_identity\`.

Provide the total number of stories required for \`${targetEpic}\` as \`story_count\`.

After successful story-index generation, call \`set_workflow_values\` to persist the generated story index absolute path as \`stories_index\`. The story index file belongs in \`${implementationFolder}\` and should use the selected epic identity in the generated story-index filename.`

	return {
		currentStepInstructions: `Generate an updated story index for \`${targetEpic}\`.

The story index file is in \`${implementationFolder}\`.

${branchInstructions}`,
	}
}

function buildStep5PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const epicIdentity = renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.EpicIdentity)
	const draftsFolder = renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.DraftsFolder)
	const storiesIndexExistedAtWorkflowStart =
		readWorkflowBooleanValue(input.session.workflowValues, PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart) ===
		true
	const branchInstructions = storiesIndexExistedAtWorkflowStart
		? `Story-file branch: an existing \`stories_index\` was present at workflow start at \`${renderWorkflowValueByKey(
				input,
				PiPlanningWorkflowValueKey.StoriesIndex,
			)}\`. Call \`generate_story_files\` to generate one templatized story for each indexed story that does not already have an existing story document.`
		: "Story-file branch: no story index existed at workflow start. Call `generate_story_files` to generate one templatized story file for each story in `stories_index`."

	return {
		currentStepInstructions: `${branchInstructions}

Pass \`${epicIdentity}\` as \`epic_identity\` when calling \`generate_story_files\`.

Generated story files can be found in \`${draftsFolder}\`.`,
	}
}

function buildStep6PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const draftsFolder = renderWorkflowValueByKey(input, PiPlanningWorkflowValueKey.DraftsFolder)

	return {
		currentStepInstructions: `Populate generated story files in \`${draftsFolder}\`.

Set implementation sequence and story-specific details.

Sequence stories by dependency in this order:

1. contracts, state shape, and invariants
2. core runtime/backend behavior
3. user-facing forms or lifecycle flows
4. prompt/tool/schema behavior
5. workflow/module consumers
6. cleanup, migration, and validation

Read each story file with \`read_file\`.

Use \`apply_patch\` to add story-specific content under existing headings.

Populate these required headings in each story file:

- \`Scope\`
- \`Scope Boundary\`
- \`Requirements\`
- \`Objective\`
- \`Known Issues/ Risks/ Technical Debt\`

Avoid implementation tasks, subtasks, file lists, or commands in story requirements.

Do not manually create story files.

Use the \`plan_story_artifacts\` to \`generate_story_files\` process if new stories or story files are needed at any point.

Send an update to the user after every story file in \`${draftsFolder}\` contains the required information.

Ask the user to review and provide feedback.

Continue refining stories as needed based on user feedback.

Use \`attempt_completion\` only after the user is fully aligned with the story set and story content.

In the final recap, remind the user to run \`create_story\` for each generated story to generate story tasks before implementation.`,
	}
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
		return {
			kind: "succeeded",
			workflowValueWrites: {
				[PiPlanningWorkflowValueKey.TargetEpic]: targetEpic,
				[PiPlanningWorkflowValueKey.StoriesIndex]: join(
					projectRoot,
					"implementation",
					`epic-${selectedEpic.identity}-stories.index.json`,
				),
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

function buildStep1InputWorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "PI Planning Inputs",
		toolDictionaryTitle: "PI Planning Inputs",
		toolDictionaryMarkdown: "Provide PI Planning target epic and context confirmation inputs.",
		firstPanelId: STEP_1_TARGET_EPIC_PANEL_ID,
		panels: {
			[STEP_1_TARGET_EPIC_PANEL_ID]: {
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
				transition: {
					type: "sequential",
					nextPanelId: STEP_1_REQUIRED_CONTEXT_PANEL_ID,
				},
			},
			[STEP_1_REQUIRED_CONTEXT_PANEL_ID]: {
				panelId: STEP_1_REQUIRED_CONTEXT_PANEL_ID,
				title: "Required Context",
				promptMarkdown: `Confirm the required context files for this PI Planning workflow:

- [Epics.index.json](<{workflow.epics_index}>)
- [Epics.md](<{workflow.epics_document}>)
- [architecture.md](<{workflow.architecture_document}>)`,
				fields: [],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "Continue",
				},
				transition: {
					type: "sequential",
					nextPanelId: STEP_1_ADDITIONAL_CONTEXT_PANEL_ID,
				},
			},
			[STEP_1_ADDITIONAL_CONTEXT_PANEL_ID]: {
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
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Back",
				},
				transition: buildTerminalTransition(),
			},
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
						followingBranchId: "step-1-await-input-form",
					},
				],
			},
			"step-1-await-input-form": {
				id: "step-1-await-input-form",
				routes: [
					{
						id: "step-1-derive-selected-epic-values",
						trigger: workflowFormCompleted(STEP_1_INPUT_FORM_ID),
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
						id: "step-1-transition-to-step-2",
						trigger: workflowValuesPersisted(PiPlanningWorkflowValueKey.TargetEpic),
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
			buildToolSchema: buildPiPlanningStep2ToolSchemas,
		}),
		"step-3": createStepDefinition({
			stepNumber: 3,
			checklistLabel: "Determine How Many Stories Are Needed",
			decisionTree: buildStep3DecisionTree(),
			buildPromptSource: buildStep3PromptSource,
			buildToolSchema: buildPiPlanningStep3ToolSchemas,
		}),
		"step-4": createStepDefinition({
			stepNumber: 4,
			checklistLabel: "Generate an Updated Story Index",
			decisionTree: buildStep4DecisionTree(),
			buildPromptSource: buildStep4PromptSource,
			buildToolSchema: buildPiPlanningStep4ToolSchemas,
		}),
		"step-5": createStepDefinition({
			stepNumber: 5,
			checklistLabel: "Generate Story Files from the Story Index",
			decisionTree: buildStep5DecisionTree(),
			buildPromptSource: buildStep5PromptSource,
			buildToolSchema: buildPiPlanningStep5ToolSchemas,
		}),
		"step-6": createStepDefinition({
			stepNumber: 6,
			checklistLabel: "Populate Story Files with Initial Details",
			decisionTree: buildStep6DecisionTree(),
			buildPromptSource: buildStep6PromptSource,
			buildToolSchema: buildPiPlanningStep6ToolSchemas,
		}),
	},
}
