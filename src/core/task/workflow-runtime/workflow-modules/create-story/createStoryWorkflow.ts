import { access, readdir, readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { WorkflowFormDefinitionPayload, WorkflowFormPanelAction } from "@shared/ExtensionMessage"
import type { WorkflowStoryIndex, WorkflowStoryIndexEntry, WorkflowStoryStatus } from "../../storyArtifacts"
import { buildEpicStoriesIndexFilename, parseWorkflowStoryIndexJson } from "../../storyArtifacts"
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
	"story-index-generated": boolean
}

interface CreateStoryEpicsIndexJson {
	version: 1
	epics: readonly CreateStoryEpicsIndexEntry[]
}

const POSITIVE_NUMERIC_ID_PATTERN = /^[1-9]\d*$/
export const CREATE_STORY_STEP_1_FORM_ID = "step-1-create-story-form"
export const CREATE_STORY_PANEL_A_EPIC_SELECTION_ID = "step-1-panel-a-epic-selection"
export const CREATE_STORY_PANEL_B_STORY_SELECTION_ID = "step-1-panel-b-story-selection"
export const CREATE_STORY_PANEL_C_MISSING_STORY_INDEX_ID = "step-1-panel-c-missing-story-index"
export const CREATE_STORY_PANEL_D_MISSING_STORY_FILE_ID = "step-1-panel-d-missing-story-file"
export const CREATE_STORY_PANEL_E_STORY_READY_FOR_IMPLEMENTATION_ID = "step-1-panel-e-story-ready-for-implementation"
export const CREATE_STORY_PANEL_F_RUN_DEV_STORY_WORKFLOW_ID = "step-1-panel-f-run-dev-story-workflow"
export const CREATE_STORY_PANEL_G_STORY_ALREADY_IMPLEMENTED_ID = "step-1-panel-g-story-already-implemented"
const STORY_STATUS_FOLDER_SEGMENTS: Readonly<Record<WorkflowStoryStatus, readonly string[]>> = {
	draft: ["implementation", "drafts"],
	backlog: ["implementation", "stories-backlog"],
	review: ["implementation", "stories-review"],
	complete: ["implementation", "stories-complete"],
}

function buildRuntimeRoutedTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"] {
	return {
		type: "runtime_routed",
	}
}

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

const CREATE_STORY_STEP_2_REVISE_BACKLOG_PROMPT_TEMPLATE = `In this workflow you will be assisting the user in revising an existing story file.

The target story for this workflow is: {workflow.target_story}

Before doing anything else, ensure that the existing content within the target story file fully aligns with the project's foundational documents, including:
- Project Architecture: {workflow.architecture_document}
- Epics Document: {workflow.epics_document}
If you detect any conflict or misalignment, notify the user and work with them to identify the appropriate resolution. Only proceed once the story file's objective, scope, scope boundary, requirements, and Known Issues/ Risks/ Technical Debt sections fully align with the project's foundational documents.

Then, ask the user to explain the revisions they require. If they ask you for suggestions regarding task/subtask revisions, ground your response in the provided context and existing runtime code/tests.

Once you've reviewed context and ensured that the target story's existing non-task content aligns with the provided project documentation, call workflow_progress_request to unlock the next step's instructions.`

const CREATE_STORY_STEP_2_DRAFT_PRIMARY_PROMPT_TEMPLATE = `In this workflow, you'll be preparing a story file for implementation by adding tasks and subtasks.

The target story for this workflow is: {workflow.target_story}

Before beginning work on the story's tasks & subtasks, ensure that the existing content within the target story file fully aligns with the project's foundational documents, including:
- Project Architecture: {workflow.architecture_document}
- Epics Document: {workflow.epics_document}

If you detect any conflict or misalignment, notify the user and work with them to identify the appropriate resolution. Only proceed once the story file's objective, scope, scope boundary, requirements, and Known Issues/ Risks/ Technical Debt sections fully align with the project's foundational documents.

Once you've reviewed context and ensured that the target story's existing non-task content aligns with the provided project documentation, call workflow_progress_request to unlock the next step's instructions.`

const CREATE_STORY_STEP_2_DRAFT_REMEDIATION_PROMPT_TEMPLATE = `In this workflow, you'll be preparing a remediation story file for implementation by adding tasks and subtasks.

The target story for this workflow is: {workflow.target_story}

This story was generated due to QA findings after the following story was completed and reviewed:
Originating story: {workflow.parent_story}
The QA findings were documented in this file: {workflow.findings_document}

Before doing anything else, review the originating story and QA findings and ensure that the existing content in the target story document aligns with the QA findings. Then, assess the target story document vs the project's foundational documents, including:
- Project Architecture: {workflow.architecture_document}
- Epics Document: {workflow.epics_document}

If you detect any conflict or misalignment, notify the user and work with them to identify the appropriate resolution. Only proceed once the story file's objective, scope, scope boundary, requirements, and Known Issues/ Risks/ Technical Debt sections fully align with the project's foundational documents.

Once you've reviewed context and ensured that the target story's existing non-task content aligns with the provided project documentation, call workflow_progress_request to unlock the next step's instructions.`

function buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const selectedStoryStatus = readWorkflowStringValue(
		input.session.workflowValues,
		CreateStoryWorkflowValueKey.SelectedStoryStatus,
	)
	const selectedStoryType = readWorkflowStringValue(input.session.workflowValues, CreateStoryWorkflowValueKey.SelectedStoryType)
	const reviseBacklogStory = readWorkflowBooleanValue(
		input.session.workflowValues,
		CreateStoryWorkflowValueKey.ReviseBacklogStory,
	)

	if (selectedStoryStatus === "backlog" && reviseBacklogStory === true) {
		return {
			kind: "current_step_instruction_template",
			currentStepInstructionTemplate: CREATE_STORY_STEP_2_REVISE_BACKLOG_PROMPT_TEMPLATE,
		}
	}

	if (selectedStoryStatus === "draft" && selectedStoryType === "primary") {
		return {
			kind: "current_step_instruction_template",
			currentStepInstructionTemplate: CREATE_STORY_STEP_2_DRAFT_PRIMARY_PROMPT_TEMPLATE,
		}
	}

	if (selectedStoryStatus === "draft" && selectedStoryType === "remediation") {
		return {
			kind: "current_step_instruction_template",
			currentStepInstructionTemplate: CREATE_STORY_STEP_2_DRAFT_REMEDIATION_PROMPT_TEMPLATE,
		}
	}

	throw new Error(
		`Create Story Step 2 prompt does not support selected_story_status ${selectedStoryStatus ?? "unset"}, selected_story_type ${selectedStoryType ?? "unset"}, and revise_backlog_story ${String(reviseBacklogStory)}.`,
	)
}

function buildStep3PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const selectedStoryStatus = readWorkflowStringValue(
		input.session.workflowValues,
		CreateStoryWorkflowValueKey.SelectedStoryStatus,
	)

	if (selectedStoryStatus === "backlog") {
		return {
			kind: "current_step_instruction_template",
			currentStepInstructionTemplate: CREATE_STORY_STEP_3_BACKLOG_PROMPT_TEMPLATE,
		}
	}

	if (selectedStoryStatus === "draft") {
		return {
			kind: "current_step_instruction_template",
			currentStepInstructionTemplate: CREATE_STORY_STEP_3_DRAFT_PROMPT_TEMPLATE,
		}
	}

	throw new Error(`Create Story Step 3 prompt does not support selected_story_status ${selectedStoryStatus ?? "unset"}.`)
}

const STEP_3_SHARED_PROMPT_TEMPLATE = `You must follow these rules when authoring story tasks & subtasks:
1. Verify solution quality and standards
   - Ensure the proposed code or fix is appropriate, elegant, and consistent with modern, industry-standard practices for the project's tech stack, including CLEAN architecture.
   - If you must deviate from best practices (e.g., due to constraints), clearly explain why and what the ideal pattern would be.
2. Prescribe deep, architectural fixes over surface workarounds
   - Check whether the issue can and should be solved at a deeper architectural layer (design, data flow, responsibilities) rather than with a shallow or hacky workaround.
   - If you choose a workaround for pragmatic reasons, explicitly label it as such and describe the deeper architectural fix that would be ideal.
3. Look for underlying design-pattern flaws
   - Examine whether the issue reveals deeper design or pattern problems (e.g., responsibilities mixed, poor separation of concerns, leaky abstractions).
   - If such problems exist, call them out explicitly and propose how they could be addressed, even if the full fix is out of scope for the immediate change.
4. Consider downstream and peripheral impact
   - Evaluate how the change may affect other modules, call sites, and features, including edge cases and lifecycle interactions. Search the codbase and read peripheral files if uncertain.
   - If the change is likely to cause downstream or peripheral issues, that is acceptable only if:
     a) You clearly identify and describe these risks, AND
     b) You propose follow-up steps or mitigations as part of the solution.
5. Avoid hardcoded values; prescribe integration with config/strings where appropriate
   - Do NOT introduce hardcoded strings or values when they represent configuration, thresholds, labels, messages, or anything reasonably likely to change.
   - Instead, integrate such values into the app’s configuration system when appropriate for user/admin/dev tweaking
   - All user-facing or UI strings MUST go into a strings.xml (or similar)
   - If you cannot follow this rule for some reason, explicitly state why.
6. Prescribe removal of cruft and failed-attempt remnants
   - Ensure that your changes do not leave behind obsolete code/imports, commented-out experiments, dead branches, or outdated patterns related to prior failed attempts.
   - Consider related/downstream modules that may now contain redundant or inconsistent code as a result of your change.
   - De-crufting should be treated as part of the fix: either perform it in your changes, or clearly specify what should be removed/refactored and where.
- When deleting or retiring a domain concept, delete its named gates, helper methods, variables, and tests rather than repointing them at another surviving concept.
7. Practice Good Code Hygiene by avoiding common bad habits:
    - "any" typing
    - val as SomeType
    - as any in tests
    - optional properties most of the time (explicitly model which combinations exist and which don't whenever possible)
    - one-letter generics
    - non-boolean boolean checks
    - bang bang operators (explicitly check for the condition instead)
    - != null (explicitly check for the condition instead)
    - not declaring function return types
    - abuse of type assertions (use them only in special scenarios where the type is clearly known, and give priority to type declarations, interfaces, or generics)
    - Failing to use utility types (use utility types such as partial, pick, omit, etc when appropriate)
    - forcing assertions when types don't match
    - not using enums to manage constants
    - not using generics to abstract duplicated code
    - not using type narrowing
    - not explicitly defining generics parameters
    - semantic aliasing, where a variable/function/type with an old domain meaning is reassigned to a new generic or unrelated concept instead of being deleted
    - stale domain naming after behavior migration; names must describe the current approved responsibility, not the historical source of the code
    - compatibility remaps that preserve retired concepts by pointing them at surviving generic behavior unless the upstream requirements explicitly approve that remap
    - boolean aliases whose name does not exactly match the condition they represent; use the existing boolean directly or introduce a correctly named concept only if the architecture requires it
    - retaining obsolete gates/seams/flags after their original behavior is removed
8. Do not introduce architecture in the action plan that is not prescribed in an upstream document.
    - The action plan must not introduce architectural concepts or solutions which are not backed by existing project documentation. If something is not explicitly prescribed, you must gain user alignment and approval before including it in the action plan.
    - If you determine that additional or different architecture is necessary while authoring the action plan, you must stop and inform the user so that the appropriate revisions can be made to upstream documents first.
9. Avoid in-plan churn. Do not prescribe code in one task/ subtask only to replace the prescribed code in a subsequent task/ subtask. Identify the final shape of every line being prescribed, and require the dev agent to implement it that way in one task / subtask.
10. The action plan must end in a repo-valid intermediate state that passes the same static gates required before commit, including formatting, lint, typecheck and any focused tests prescribed for that phase.
    - Do not prescribe unused imports, unused helpers, placeholder scaffolding, future-step code, or partially wired definitions unless the story's tasks/ subtasks also wire them into legitimate runtime use.
11. Tasks & Subtasks must be on their own lines starting with "[ ]" so that dev agents can mark completion as they progress through the action plan.
    - tasks & subtasks must have numerical IDs, with subtasks inheriting the parent task ID, e.g. task 1, subtasks 1.1, 1.2.
    - Subtasks must prescribe exact line-level revisions with target file indicated.
    - Subtasks must never prescribe more than ONE required revision
12. NEVER prescribe retyping, casting, renaming, or otherwise mutating existing capabilities/functionality within a task or subtask unless you have surfaced the proposed change as a single topic to the user and gained their approval.

If at any point you cannot satisfy one or more of these rules (for example, due to missing context or constraints in the existing architecture), you MUST:
- Explicitly state which rule(s) you cannot fully satisfy, and why.
- Propose the best available compromise, and outline what a more ideal long-term fix would look like.

After authoring the tasks & subtasks, reach each line of the story and seek out any inconsistencies or conflicts. During this review, assess each task and subtask for internal dependencies, and ensure that no task or subtask is dependent upon a task or subtask which is sequenced after it in the story. Resolve them appropriately, asking the user for input if necessary, before indicating that the tasks & subtasks are complete.

*** User Review & Feedback ***
Provide the user with the full path for {workflow.target_story} and ask them to review the tasks / subtasks section and provide feedback. Refine based on the user's feedback as needed. Once the user is satisfied with the tasks / subtasks section, unlock the next step's instructions by calling workflow_progress_request.`

const CREATE_STORY_STEP_3_BACKLOG_PROMPT_TEMPLATE = `Review the existing tasks and subtasks in {workflow.target_story} and determine whether they meet the following criteria:
- They fully satisfy the story's requirements
- They respect the story's scope and scope boundary
- They support achievement of the story's objective
- They prescribe changes in a manner which complies with the story's general instructions
- Subtasks are scoped to a single revision in a single target file
- Each subtask includes specific allowed files
- Tasks & subtasks provide specific prescriptive revisions without deferring decision space to the implementing agent.
- Requirements do not ask for delivery of imports, helpers, placeholder scaffolding, future-step code, or partially-wired definitions unless the story will also wire them into legitimate runtime use.
- Prescribed tests provide adequate coverage of both happy paths and failure paths for all code revisions
- Tests are prescribed only for behavior, contracts, regression, and material risks required by the story document and project documentation
- Any tests built via the story's tasks use exact assertions for canonical machine-consumed outputs and stable contracts, including tool names/ schema shape, artifact file formats, and persisted metadata.
- Any tests built via the story's tasks use shape and invariant assertions for editable content: required fields exist, strings are non-empty, mappings are correct, and forbidden legacy values are absent.
- Any tests built via the story's tasks do not add static guards unless they protect an approved boundary, forbidden legacy dependency, or known regression risk.

Notify the user that you've reviwed the existing tasks & subtasks for coverage, consistency, and quality, surface any issues you've identified to them, and ask them what additional issues or concerns they'd like you to address.

${STEP_3_SHARED_PROMPT_TEMPLATE}`

const CREATE_STORY_STEP_3_DRAFT_PROMPT_TEMPLATE = `Review runtime code & tests and identify the full set of in-scope revisions needed to deliver the story's requirements and objective.
If the story requires touching existing artifacts or placeholders, trace the exact runtime resolution path end to end:
    config/source of truth
    resolver/helper
    handler/runtime consumer
    tests/docs that assert the convention
    For any plan that introduces a new artifact, tool, or schema entry, perform a sibling-pattern audit:
    registration
    executor wiring
    prompt/tool exposure
    approval/path policy
    tests
    snapshots/generated surfaces
    docs/reference surfaces if treated as canonical in-repo
Provide the user with the identified revision set and tell them your next step is to translate these revisions into implementation-ready tasks and subtasks.
Next, build the story's tasks & subtasks using the identified revision set.

${STEP_3_SHARED_PROMPT_TEMPLATE}`

const CREATE_STORY_STEP_4_PROMPT_TEMPLATE = `Verify that {workflow.target_story} is complete, correctly formatted, internally consistent, and safe to hand off for implementation.

Validate the story as a complete implementation handoff:
- every acceptance criterion is covered by one or more tasks
- every task maps to a real part of the approved story scope
- task order is executable and non-conflicting
- no two tasks prescribe contradictory file changes or incompatible invariants
- every planned code change has corresponding test-maintenance coverage where needed
- stale assertions, mocks, snapshots, validators, and type contracts are accounted for when affected

If you detect ambiguity, contradiction, or missing coverage, correct it. If correction requires a new decision, stop and ask the user.

When validation passes, use attempt_completion to notify the user that the story is complete and ready for implementation.`

function buildStep4PromptSource(): WorkflowStepPromptSource {
	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: CREATE_STORY_STEP_4_PROMPT_TEMPLATE,
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
	const storyIndexGenerated = value["story-index-generated"]
	if (typeof identity !== "string" || typeof title !== "string" || typeof storyIndexGenerated !== "boolean") {
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
		"story-index-generated": storyIndexGenerated,
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

function workflowFormPanelSubmitted(panelId: string, action: WorkflowFormPanelAction): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_form_panel_submitted" &&
			triggerEvent.workflowFormId === CREATE_STORY_STEP_1_FORM_ID &&
			triggerEvent.panelId === panelId &&
			triggerEvent.action === action,
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

function selectedEpicHasStoriesIndex(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, CreateStoryWorkflowValueKey.StoriesIndex) !== undefined,
	}
}

function selectedEpicDoesNotHaveStoriesIndex(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, CreateStoryWorkflowValueKey.StoriesIndex) === undefined,
	}
}

function selectedStoryDoesNotHaveGeneratedFile(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowBooleanValue(workflowValues, CreateStoryWorkflowValueKey.SelectedStoryFileGenerated) === false,
	}
}

function selectedStoryStatusMatches(...statuses: readonly WorkflowStoryStatus[]): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) => {
			if (readWorkflowBooleanValue(workflowValues, CreateStoryWorkflowValueKey.SelectedStoryFileGenerated) !== true) {
				return false
			}

			const selectedStoryStatus = readWorkflowStringValue(workflowValues, CreateStoryWorkflowValueKey.SelectedStoryStatus)
			return statuses.some((status) => selectedStoryStatus === status)
		},
	}
}

function targetStoryIsPresent(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: ({ workflowValues }) =>
			readWorkflowStringValue(workflowValues, CreateStoryWorkflowValueKey.TargetStory) !== undefined,
	}
}

function workflowFormPanelSubmittedWithBacklogRevisionAnswer(panelId: string, answer: boolean): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "workflow_form_panel_submitted" &&
			triggerEvent.workflowFormId === CREATE_STORY_STEP_1_FORM_ID &&
			triggerEvent.panelId === panelId &&
			triggerEvent.action === "submit" &&
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
	return [`code-review-${targetIdentity}.md`]
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

const PANEL_A_RESET_VALUE_KEYS = [
	CreateStoryWorkflowValueKey.StoriesIndex,
	CreateStoryWorkflowValueKey.SelectedStoryIdentity,
	CreateStoryWorkflowValueKey.SelectedStoryFileName,
	CreateStoryWorkflowValueKey.SelectedStoryType,
	CreateStoryWorkflowValueKey.SelectedStoryStatus,
	CreateStoryWorkflowValueKey.SelectedStoryFileGenerated,
	CreateStoryWorkflowValueKey.TargetStory,
	CreateStoryWorkflowValueKey.ParentStoryIdentity,
	CreateStoryWorkflowValueKey.ParentStory,
	CreateStoryWorkflowValueKey.FindingsDocument,
	CreateStoryWorkflowValueKey.ReviseBacklogStory,
	CreateStoryWorkflowValueKey.TargetStoryFilenameForMove,
]

const PANEL_B_RESET_VALUE_KEYS = [
	CreateStoryWorkflowValueKey.SelectedStoryFileName,
	CreateStoryWorkflowValueKey.SelectedStoryType,
	CreateStoryWorkflowValueKey.SelectedStoryStatus,
	CreateStoryWorkflowValueKey.SelectedStoryFileGenerated,
	CreateStoryWorkflowValueKey.TargetStory,
	CreateStoryWorkflowValueKey.ParentStoryIdentity,
	CreateStoryWorkflowValueKey.ParentStory,
	CreateStoryWorkflowValueKey.FindingsDocument,
	CreateStoryWorkflowValueKey.ReviseBacklogStory,
	CreateStoryWorkflowValueKey.TargetStoryFilenameForMove,
]

function buildStep1WorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Create Story",
		toolDictionaryTitle: "Create Story",
		toolDictionaryMarkdown: "Select the epic and story for the create-story workflow.",
		firstPanelId: CREATE_STORY_PANEL_A_EPIC_SELECTION_ID,
		panels: {
			[CREATE_STORY_PANEL_A_EPIC_SELECTION_ID]: {
				panelId: CREATE_STORY_PANEL_A_EPIC_SELECTION_ID,
				title: "Epic Selection",
				promptMarkdown: "Which epic are we focusing on during this workflow?",
				fields: [
					{
						key: CreateStoryWorkflowValueKey.EpicIdentity,
						workflowValueKey: CreateStoryWorkflowValueKey.EpicIdentity,
						kind: "dropdown",
						label: "Target Epic",
						required: true,
						allowedValueType: "string",
						resetValueKeysOnChange: PANEL_A_RESET_VALUE_KEYS,
						jsonOptionsSource: {
							root: {
								kind: "selected_project_root",
							},
							sourcePathSegments: ["planning", "Epics.index.json"],
							itemsPath: "epics",
							valueProperty: "identity",
							labelTemplate: "Epic {identity}: {title}",
						},
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "Continue",
				},
				transition: buildRuntimeRoutedTransition(),
			},
			[CREATE_STORY_PANEL_B_STORY_SELECTION_ID]: {
				panelId: CREATE_STORY_PANEL_B_STORY_SELECTION_ID,
				title: "Story Selection",
				promptMarkdown: "Which story should I focus on during this workflow?",
				fields: [
					{
						key: CreateStoryWorkflowValueKey.SelectedStoryIdentity,
						workflowValueKey: CreateStoryWorkflowValueKey.SelectedStoryIdentity,
						kind: "dropdown",
						label: "Target Story",
						required: true,
						allowedValueType: "string",
						resetValueKeysOnChange: PANEL_B_RESET_VALUE_KEYS,
						jsonOptionsSource: {
							root: {
								kind: "selected_project_root",
							},
							sourcePathSegments: ["implementation", "epic-{workflow.epic_identity}-stories.index.json"],
							itemsPath: "stories",
							valueProperty: "story_identity",
							labelTemplate: "Story {story_identity}",
						},
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "Continue",
				},
				transition: buildRuntimeRoutedTransition(),
			},
			[CREATE_STORY_PANEL_C_MISSING_STORY_INDEX_ID]: {
				panelId: CREATE_STORY_PANEL_C_MISSING_STORY_INDEX_ID,
				title: "Missing Story Index for Selected Epic",
				promptMarkdown:
					"The selected epic does not yet have a story index. Please end this workflow then run the pi-planning workflow in a new conversation to generate this epic's story index before running the create-story workflow.",
				fields: [],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "End Workflow",
					back: "Select Another Epic",
				},
				backDestinationPanelId: CREATE_STORY_PANEL_A_EPIC_SELECTION_ID,
				transition: buildRuntimeRoutedTransition(),
			},
			[CREATE_STORY_PANEL_D_MISSING_STORY_FILE_ID]: {
				panelId: CREATE_STORY_PANEL_D_MISSING_STORY_FILE_ID,
				title: "Missing Story File",
				promptMarkdown:
					"The selected story's document does not exist yet. Run the PI-planning workflow to generate the story document before selecting the story during the create-story workflow.",
				fields: [],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "End workflow",
					back: "Select Another Story",
				},
				backDestinationPanelId: CREATE_STORY_PANEL_B_STORY_SELECTION_ID,
				transition: buildRuntimeRoutedTransition(),
			},
			[CREATE_STORY_PANEL_E_STORY_READY_FOR_IMPLEMENTATION_ID]: {
				panelId: CREATE_STORY_PANEL_E_STORY_READY_FOR_IMPLEMENTATION_ID,
				title: "Story Ready for Implementation",
				promptMarkdown: "The selected story appears to be ready for implementation.",
				fields: [
					{
						key: CreateStoryWorkflowValueKey.ReviseBacklogStory,
						workflowValueKey: CreateStoryWorkflowValueKey.ReviseBacklogStory,
						kind: "boolean",
						label: "Would you like to revise this story's existing tasks?",
						required: true,
						allowedValueType: "boolean",
						trueLabel: "Yes",
						falseLabel: "No",
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Select Another Story",
				},
				backDestinationPanelId: CREATE_STORY_PANEL_B_STORY_SELECTION_ID,
				backStaleValueKeysToClear: [CreateStoryWorkflowValueKey.ReviseBacklogStory],
				transition: buildRuntimeRoutedTransition(),
			},
			[CREATE_STORY_PANEL_F_RUN_DEV_STORY_WORKFLOW_ID]: {
				panelId: CREATE_STORY_PANEL_F_RUN_DEV_STORY_WORKFLOW_ID,
				title: "Run Dev-Story Workflow",
				promptMarkdown:
					"Since the selected story already has been populated with tasks and subtasks, your next step is to run the dev-story workflow and select this story as the implementation target.",
				fields: [],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "End Workflow",
					back: "Select Another Story",
				},
				backDestinationPanelId: CREATE_STORY_PANEL_B_STORY_SELECTION_ID,
				transition: buildRuntimeRoutedTransition(),
			},
			[CREATE_STORY_PANEL_G_STORY_ALREADY_IMPLEMENTED_ID]: {
				panelId: CREATE_STORY_PANEL_G_STORY_ALREADY_IMPLEMENTED_ID,
				title: "Story Already Implemented",
				promptMarkdown:
					"This story has already been implemented. New tasks should not be added to stories after implementation. If findings were documented during QA, the QA agent generated a remediation story to address those findings. Please go back and select the appropriate remediation story as the target for this workflow, or end this workflow.",
				fields: [],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "End Workflow",
					back: "Select Another Story",
				},
				backDestinationPanelId: CREATE_STORY_PANEL_B_STORY_SELECTION_ID,
				transition: buildRuntimeRoutedTransition(),
			},
		},
	}
}

function buildStep1ContinuationReplacementBuilder(panelId: string): WorkflowFormContinuationReplacementBuilder {
	return () => {
		const panel = buildStep1WorkflowForm().panels[panelId]
		if (panel === undefined) {
			throw new Error(`Create Story Step 1 workflow form is missing requested continuation panel ${panelId}.`)
		}

		return {
			panel,
			data: {},
		}
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
	if (selectedEpic["story-index-generated"] === true) {
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
						followingBranchId: "step-1-render-workflow-form",
					},
				],
			},
			"step-1-render-workflow-form": {
				id: "step-1-render-workflow-form",
				routes: [
					{
						id: "step-1-render-workflow-form",
						trigger: { kind: "always" },
						action: {
							kind: "render_workflow_form",
							workflowFormId: CREATE_STORY_STEP_1_FORM_ID,
						},
						followingBranchId: "step-1-await-epic-selection-panel",
					},
				],
			},
			"step-1-await-epic-selection-panel": {
				id: "step-1-await-epic-selection-panel",
				routes: [
					{
						id: "step-1-derive-selected-epic-values",
						trigger: workflowFormPanelSubmitted(CREATE_STORY_PANEL_A_EPIC_SELECTION_ID, "submit"),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveSelectedEpicValuesFromForm,
							},
						},
						followingBranchId: "step-1-route-after-epic-selection",
					},
				],
			},
			"step-1-route-after-epic-selection": {
				id: "step-1-route-after-epic-selection",
				routes: [
					{
						id: "step-1-continue-to-story-selection-panel",
						trigger: selectedEpicHasStoriesIndex(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: CREATE_STORY_STEP_1_FORM_ID,
							panelId: CREATE_STORY_PANEL_B_STORY_SELECTION_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(CREATE_STORY_PANEL_B_STORY_SELECTION_ID),
						},
						followingBranchId: "step-1-await-story-selection-panel",
					},
					{
						id: "step-1-continue-to-missing-story-index-panel",
						trigger: selectedEpicDoesNotHaveStoriesIndex(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: CREATE_STORY_STEP_1_FORM_ID,
							panelId: CREATE_STORY_PANEL_C_MISSING_STORY_INDEX_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								CREATE_STORY_PANEL_C_MISSING_STORY_INDEX_ID,
							),
						},
						followingBranchId: "step-1-await-terminal-panels",
					},
				],
			},
			"step-1-await-story-selection-panel": {
				id: "step-1-await-story-selection-panel",
				routes: [
					{
						id: "step-1-derive-selected-story-values",
						trigger: workflowFormPanelSubmitted(CREATE_STORY_PANEL_B_STORY_SELECTION_ID, "submit"),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveSelectedStoryValuesFromForm,
							},
						},
						followingBranchId: "step-1-route-after-story-selection",
					},
				],
			},
			"step-1-route-after-story-selection": {
				id: "step-1-route-after-story-selection",
				routes: [
					{
						id: "step-1-continue-to-missing-story-file-panel",
						trigger: selectedStoryDoesNotHaveGeneratedFile(),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: CREATE_STORY_STEP_1_FORM_ID,
							panelId: CREATE_STORY_PANEL_D_MISSING_STORY_FILE_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								CREATE_STORY_PANEL_D_MISSING_STORY_FILE_ID,
							),
						},
						followingBranchId: "step-1-await-terminal-panels",
					},
					{
						id: "step-1-derive-draft-target-story",
						trigger: selectedStoryStatusMatches("draft"),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveTargetStoryAndRemediationContext,
							},
						},
						followingBranchId: "step-1-await-target-story-values",
					},
					{
						id: "step-1-continue-to-story-ready-panel",
						trigger: selectedStoryStatusMatches("backlog"),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: CREATE_STORY_STEP_1_FORM_ID,
							panelId: CREATE_STORY_PANEL_E_STORY_READY_FOR_IMPLEMENTATION_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								CREATE_STORY_PANEL_E_STORY_READY_FOR_IMPLEMENTATION_ID,
							),
						},
						followingBranchId: "step-1-await-story-ready-panel",
					},
					{
						id: "step-1-continue-to-story-already-implemented-panel",
						trigger: selectedStoryStatusMatches("review", "complete"),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: CREATE_STORY_STEP_1_FORM_ID,
							panelId: CREATE_STORY_PANEL_G_STORY_ALREADY_IMPLEMENTED_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								CREATE_STORY_PANEL_G_STORY_ALREADY_IMPLEMENTED_ID,
							),
						},
						followingBranchId: "step-1-await-terminal-panels",
					},
				],
			},
			"step-1-await-target-story-values": {
				id: "step-1-await-target-story-values",
				routes: [
					{
						id: "step-1-transition-to-step-2",
						trigger: targetStoryIsPresent(),
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
			"step-1-await-story-ready-panel": {
				id: "step-1-await-story-ready-panel",
				routes: [
					{
						id: "step-1-derive-backlog-target-story-after-revision-approved",
						trigger: workflowFormPanelSubmittedWithBacklogRevisionAnswer(
							CREATE_STORY_PANEL_E_STORY_READY_FOR_IMPLEMENTATION_ID,
							true,
						),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: deriveTargetStoryAndRemediationContext,
							},
						},
						followingBranchId: "step-1-await-target-story-values",
					},
					{
						id: "step-1-continue-to-run-dev-story-panel",
						trigger: workflowFormPanelSubmittedWithBacklogRevisionAnswer(
							CREATE_STORY_PANEL_E_STORY_READY_FOR_IMPLEMENTATION_ID,
							false,
						),
						action: {
							kind: "continue_workflow_form",
							workflowFormId: CREATE_STORY_STEP_1_FORM_ID,
							panelId: CREATE_STORY_PANEL_F_RUN_DEV_STORY_WORKFLOW_ID,
							buildReplacement: buildStep1ContinuationReplacementBuilder(
								CREATE_STORY_PANEL_F_RUN_DEV_STORY_WORKFLOW_ID,
							),
						},
						followingBranchId: "step-1-await-terminal-panels",
					},
				],
			},
			"step-1-await-terminal-panels": {
				id: "step-1-await-terminal-panels",
				routes: [
					{
						id: "step-1-complete-workflow-after-missing-story-index",
						trigger: workflowFormPanelSubmitted(CREATE_STORY_PANEL_C_MISSING_STORY_INDEX_ID, "submit"),
						action: {
							kind: "complete_workflow",
						},
					},
					{
						id: "step-1-complete-workflow-after-missing-story-file",
						trigger: workflowFormPanelSubmitted(CREATE_STORY_PANEL_D_MISSING_STORY_FILE_ID, "submit"),
						action: {
							kind: "complete_workflow",
						},
					},
					{
						id: "step-1-complete-workflow-after-run-dev-story-panel",
						trigger: workflowFormPanelSubmitted(CREATE_STORY_PANEL_F_RUN_DEV_STORY_WORKFLOW_ID, "submit"),
						action: {
							kind: "complete_workflow",
						},
					},
					{
						id: "step-1-complete-workflow-after-story-already-implemented",
						trigger: workflowFormPanelSubmitted(CREATE_STORY_PANEL_G_STORY_ALREADY_IMPLEMENTED_ID, "submit"),
						action: {
							kind: "complete_workflow",
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
		[CREATE_STORY_STEP_1_FORM_ID]: buildStep1WorkflowForm(),
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
			promptTemplates: [
				CREATE_STORY_STEP_2_REVISE_BACKLOG_PROMPT_TEMPLATE,
				CREATE_STORY_STEP_2_DRAFT_PRIMARY_PROMPT_TEMPLATE,
				CREATE_STORY_STEP_2_DRAFT_REMEDIATION_PROMPT_TEMPLATE,
			],
			buildToolSchema: buildCreateStoryStep2ToolSchemas,
		}),
		"step-3": createStepDefinition({
			stepNumber: 3,
			checklistLabel: "Author Tasks & Subtasks",
			decisionTree: buildStep3DecisionTree(),
			buildPromptSource: buildStep3PromptSource,
			promptTemplates: [CREATE_STORY_STEP_3_BACKLOG_PROMPT_TEMPLATE, CREATE_STORY_STEP_3_DRAFT_PROMPT_TEMPLATE],
			buildToolSchema: buildCreateStoryStep3ToolSchemas,
		}),
		"step-4": createStepDefinition({
			stepNumber: 4,
			checklistLabel: "Finalize & Validate Story Document",
			decisionTree: buildStep4DecisionTree(),
			buildPromptSource: buildStep4PromptSource,
			promptTemplates: [CREATE_STORY_STEP_4_PROMPT_TEMPLATE],
			buildToolSchema: buildCreateStoryStep4ToolSchemas,
		}),
	},
}
