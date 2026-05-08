import type { WorkflowFormDefinitionPayload } from "@shared/ExtensionMessage"
import { mkdir, readFile, writeFile } from "fs/promises"
import { dirname } from "path"
import { WorkflowArtifactFamily } from "../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowDecisionBranchTrigger,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowFinalDeliveryFinalizer,
	WorkflowPersonaDefinition,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowStepPromptSource,
} from "../../types"
import { buildEpicsIndexJson, buildInitialCreateEpicsDocumentFromSession } from "./createEpicsDocument"
import { buildCreateEpicsStep1ToolSchemas, buildCreateEpicsStep2ToolSchemas } from "./createEpicsToolSchemas"

export enum CreateEpicsWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	ArchitectureDocument = "architecture_document",
	HasBrainstormingDocument = "has_brainstorming_document",
	BrainstormingDocument = "brainstorming_document",
	AdditionalContextFiles = "additional_context_files",
	OutputFile = "output_file",
	EpicsIndexFile = "epics_index_file",
	OutputArtifactFamily = "output_artifact_family",
	OutputArtifactIdentity = "output_artifact_identity",
	OutputArtifactFilename = "output_artifact_filename",
	OutputArtifactRelativePath = "output_artifact_relative_path",
	EpicsIndexArtifactFamily = "epics_index_artifact_family",
	EpicsIndexArtifactIdentity = "epics_index_artifact_identity",
	EpicsIndexArtifactFilename = "epics_index_artifact_filename",
	EpicsIndexArtifactRelativePath = "epics_index_artifact_relative_path",
}

const CREATE_EPICS_WORKFLOW_NAME = "create-epics"
const CREATE_EPICS_WORKFLOW_DISPLAY_NAME = "Create Epics"
const CREATE_EPICS_WORKFLOW_SLASH_COMMAND_NAME = "create-epics"
const CREATE_EPICS_WORKFLOW_USE_SKILL_NAME = "create-epics"
const CREATE_EPICS_WORKFLOW_PROJECT_SUBFOLDER = "planning"
const CREATE_EPICS_WORKFLOW_DESCRIPTION =
	"Create a project-level epics document from an existing architecture document, then generate the structured epic index used by downstream planning workflows."
const EPICS_DOCUMENT_ARTIFACT_ID = "epics"
const EPICS_INDEX_ARTIFACT_ID = "epics_index"
const ARCHITECTURE_PREREQUISITE_ID = "architecture_document"
const STEP_1_CONTEXT_FORM_ID = "step-1-context-form"
const STEP_1_BRAINSTORMING_CHECK_PANEL_ID = "step-1-brainstorming-check-panel"
const STEP_1_BRAINSTORMING_PATH_PANEL_ID = "step-1-brainstorming-path-panel"
const STEP_1_ADDITIONAL_CONTEXT_PANEL_ID = "step-1-additional-context-panel"
const CREATE_EPICS_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "John",
	role: "Product Manager",
	identity: "Drives PRDs through interviews, discovery, and stakeholder alignment.",
	capabilities: ["PRD creation", "discovery", "stakeholder alignment", "interviews"],
	communicationStyle: "Relentlessly asks why. Direct, data-sharp, and cuts the fluff.",
	principles: [
		"Use user-centered design, Jobs-to-be-Done, and opportunity scoring.",
		"Discover real needs from interviews, ship the smallest validator, and put user value first.",
	],
}

const CREATE_EPICS_ARTIFACTS: NonNullable<WorkflowDefinition["artifacts"]> = {
	[EPICS_DOCUMENT_ARTIFACT_ID]: {
		id: EPICS_DOCUMENT_ARTIFACT_ID,
		family: WorkflowArtifactFamily.Epics,
		intentMode: "new",
		parentIdentitySource: undefined,
		targetIdentitySource: undefined,
		outputValueKeys: {
			projectTitle: CreateEpicsWorkflowValueKey.ProjectTitle,
			projectFolderName: CreateEpicsWorkflowValueKey.ProjectFolderName,
			artifactFamily: CreateEpicsWorkflowValueKey.OutputArtifactFamily,
			artifactIdentity: CreateEpicsWorkflowValueKey.OutputArtifactIdentity,
			artifactFilename: CreateEpicsWorkflowValueKey.OutputArtifactFilename,
			artifactRelativePath: CreateEpicsWorkflowValueKey.OutputArtifactRelativePath,
			artifactAbsolutePath: CreateEpicsWorkflowValueKey.OutputFile,
			parentIdentity: undefined,
			targetIdentity: undefined,
		},
	},
	[EPICS_INDEX_ARTIFACT_ID]: {
		id: EPICS_INDEX_ARTIFACT_ID,
		family: WorkflowArtifactFamily.EpicsIndex,
		intentMode: "new",
		parentIdentitySource: undefined,
		targetIdentitySource: undefined,
		outputValueKeys: {
			projectTitle: CreateEpicsWorkflowValueKey.ProjectTitle,
			projectFolderName: CreateEpicsWorkflowValueKey.ProjectFolderName,
			artifactFamily: CreateEpicsWorkflowValueKey.EpicsIndexArtifactFamily,
			artifactIdentity: CreateEpicsWorkflowValueKey.EpicsIndexArtifactIdentity,
			artifactFilename: CreateEpicsWorkflowValueKey.EpicsIndexArtifactFilename,
			artifactRelativePath: CreateEpicsWorkflowValueKey.EpicsIndexArtifactRelativePath,
			artifactAbsolutePath: CreateEpicsWorkflowValueKey.EpicsIndexFile,
			parentIdentity: undefined,
			targetIdentity: undefined,
		},
	},
}

const CREATE_EPICS_WORKFLOW_VALUE_KEYS: readonly CreateEpicsWorkflowValueKey[] = Object.values(CreateEpicsWorkflowValueKey)

function buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"] {
	return {
		type: "conditional",
		conditionSourceKey: "__terminal__",
		branches: [],
		defaultTerminal: true,
	}
}

function buildStep1ContextWorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Create Epics Context",
		toolDictionaryTitle: "Create Epics Context",
		toolDictionaryMarkdown: "Provide optional context files for the create-epics session.",
		firstPanelId: STEP_1_BRAINSTORMING_CHECK_PANEL_ID,
		panels: {
			[STEP_1_BRAINSTORMING_CHECK_PANEL_ID]: {
				panelId: STEP_1_BRAINSTORMING_CHECK_PANEL_ID,
				title: "Brainstorming Context",
				promptMarkdown: "Do you have a brainstorming workflow file you'd like to use during this session?",
				fields: [
					{
						key: CreateEpicsWorkflowValueKey.HasBrainstormingDocument,
						workflowValueKey: CreateEpicsWorkflowValueKey.HasBrainstormingDocument,
						kind: "boolean",
						label: "Brainstorming workflow file",
						required: true,
						allowedValueType: "boolean",
						trueLabel: "Yes",
						falseLabel: "No",
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "Continue",
				},
				transition: {
					type: "conditional",
					conditionSourceKey: CreateEpicsWorkflowValueKey.HasBrainstormingDocument,
					branches: [
						{
							matchValue: true,
							nextPanelId: STEP_1_BRAINSTORMING_PATH_PANEL_ID,
						},
						{
							matchValue: false,
							nextPanelId: STEP_1_ADDITIONAL_CONTEXT_PANEL_ID,
							staleValueKeysToClear: [CreateEpicsWorkflowValueKey.BrainstormingDocument],
						},
					],
					defaultNextPanelId: STEP_1_ADDITIONAL_CONTEXT_PANEL_ID,
				},
			},
			[STEP_1_BRAINSTORMING_PATH_PANEL_ID]: {
				panelId: STEP_1_BRAINSTORMING_PATH_PANEL_ID,
				title: "Brainstorming File Path",
				promptMarkdown: "Please provide the full file path to your brainstorming workflow file below.",
				fields: [
					{
						key: CreateEpicsWorkflowValueKey.BrainstormingDocument,
						workflowValueKey: CreateEpicsWorkflowValueKey.BrainstormingDocument,
						kind: "small_text",
						label: "Brainstorming workflow file path",
						required: true,
						allowedValueType: "string",
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Back",
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
					"If you'd like to provide any additional files as context please provide their full file paths below.",
				fields: [
					{
						key: CreateEpicsWorkflowValueKey.AdditionalContextFiles,
						workflowValueKey: CreateEpicsWorkflowValueKey.AdditionalContextFiles,
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

function entryArtifactResolutionCompletedWithCreationRequired(creationRequired: boolean): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "entry_artifact_resolution_completed" &&
			triggerEvent.artifactResolutions.some(
				(artifactResolution) =>
					artifactResolution.artifactId === EPICS_DOCUMENT_ARTIFACT_ID &&
					artifactResolution.creationRequired === creationRequired,
			),
	}
}

function workflowFormCompleted(workflowFormId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_form_completed" && triggerEvent.workflowFormId === workflowFormId,
	}
}

function createEmptyPromptSource(): WorkflowStepPromptSource {
	return {}
}

function createStepDefinition(args: {
	stepNumber: 1 | 2
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

function renderWorkflowValueByKey(input: WorkflowPromptBuilderInput, key: CreateEpicsWorkflowValueKey): string {
	return input.renderWorkflowValue(input.session.workflowValues[key] ?? key)
}

function buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const outputFile = renderWorkflowValueByKey(input, CreateEpicsWorkflowValueKey.OutputFile)
	const architectureDocument = renderWorkflowValueByKey(input, CreateEpicsWorkflowValueKey.ArchitectureDocument)
	const brainstormingDocument = renderWorkflowValueByKey(input, CreateEpicsWorkflowValueKey.BrainstormingDocument)
	const additionalContextFiles = renderWorkflowValueByKey(input, CreateEpicsWorkflowValueKey.AdditionalContextFiles)

	return {
		currentStepInstructions: `Read \`${outputFile}\`.
Read \`${architectureDocument}\`.
Read \`${brainstormingDocument}\` when present.
Read any files listed in \`${additionalContextFiles}\` when present.
Read any other files provided within \`${outputFile}\` as additional context, including files listed under Additional Context when useful.

Identify the work necessary to deliver the project based on the architecture document.

Provide your understanding of the necessary work to the user and confirm alignment before drafting epics.

Break the project into epics by coherent capability outcomes, not by files, layers, or implementation chores.

Ensure each epic delivers one testable outcome, groups requirements that change together, has clear dependencies and completion criteria, and is small enough to implement through a focused set of downstream stories.

Split epics that contain multiple independent outcomes or major lifecycle transitions.

Sequence epics by dependency order with aid from the architecture document.

Avoid epics that are only \`backend\`, \`frontend\`, or \`tests\` unless that is genuinely the user-facing capability boundary.

Call \`upsert_epic\` for each user-aligned epic. Use \`upsert_epic\` to persist every accepted epic and every accepted revision. Do not use \`apply_patch\`, \`build_workflow_document\`, \`set_workflow_values\`, or raw markdown editing for epic creation or revision.

Do not draft stories, tasks, subtasks, acceptance criteria, action plans, implementation checklists, delivery specs, or downstream implementation plans.

Notify the user and ask them to review the drafted epics.

Revise epics through \`upsert_epic\` as needed based on user feedback.

After the user indicates alignment with the drafted epics, use \`attempt_completion\` to provide a final recap and remind the user to run the \`pi-planning\` workflow for each epic to define that epic's user stories.`,
	}
}

function buildStep1DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-1-resolve-entry-artifact",
		branches: {
			"step-1-resolve-entry-artifact": {
				id: "step-1-resolve-entry-artifact",
				routes: [
					{
						id: "step-1-resolve-prerequisites-for-new-artifact",
						trigger: entryArtifactResolutionCompletedWithCreationRequired(true),
						action: {
							kind: "resolve_prerequisite_files",
							prerequisiteIds: [ARCHITECTURE_PREREQUISITE_ID],
						},
						followingBranchId: "step-1-render-context-form-for-new-artifact",
					},
					{
						id: "step-1-resolve-prerequisites-for-existing-artifact",
						trigger: entryArtifactResolutionCompletedWithCreationRequired(false),
						action: {
							kind: "resolve_prerequisite_files",
							prerequisiteIds: [ARCHITECTURE_PREREQUISITE_ID],
						},
						followingBranchId: "step-1-render-context-form-for-existing-artifact",
					},
				],
			},
			"step-1-render-context-form-for-new-artifact": {
				id: "step-1-render-context-form-for-new-artifact",
				routes: [
					{
						id: "step-1-render-context-form-for-new-artifact",
						trigger: { kind: "always" },
						action: {
							kind: "render_workflow_form",
							workflowFormId: STEP_1_CONTEXT_FORM_ID,
						},
						followingBranchId: "step-1-await-context-form-for-new-artifact",
					},
				],
			},
			"step-1-render-context-form-for-existing-artifact": {
				id: "step-1-render-context-form-for-existing-artifact",
				routes: [
					{
						id: "step-1-render-context-form-for-existing-artifact",
						trigger: { kind: "always" },
						action: {
							kind: "render_workflow_form",
							workflowFormId: STEP_1_CONTEXT_FORM_ID,
						},
						followingBranchId: "step-1-await-context-form-for-existing-artifact",
					},
				],
			},
			"step-1-await-context-form-for-existing-artifact": {
				id: "step-1-await-context-form-for-existing-artifact",
				routes: [
					{
						id: "step-1-transition-existing-artifact-to-step-2",
						trigger: workflowFormCompleted(STEP_1_CONTEXT_FORM_ID),
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
			"step-1-await-context-form-for-new-artifact": {
				id: "step-1-await-context-form-for-new-artifact",
				routes: [
					{
						id: "step-1-allocate-epics-artifact",
						trigger: workflowFormCompleted(STEP_1_CONTEXT_FORM_ID),
						action: {
							kind: "allocate_artifact",
							artifactId: EPICS_DOCUMENT_ARTIFACT_ID,
						},
						followingBranchId: "step-1-await-allocation",
					},
				],
			},
			"step-1-await-allocation": {
				id: "step-1-await-allocation",
				routes: [
					{
						id: "step-1-build-initial-shell",
						trigger: toolBackedOperationSucceeded(
							"step-1-await-context-form-for-new-artifact",
							"step-1-allocate-epics-artifact",
						),
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: EPICS_DOCUMENT_ARTIFACT_ID,
								buildContent: buildInitialCreateEpicsDocumentFromSession,
							},
						},
						followingBranchId: "step-1-await-initial-shell",
					},
					{
						id: "step-1-retry-allocate-epics-artifact",
						trigger: toolBackedOperationFailed(
							"step-1-await-context-form-for-new-artifact",
							"step-1-allocate-epics-artifact",
						),
						action: {
							kind: "allocate_artifact",
							artifactId: EPICS_DOCUMENT_ARTIFACT_ID,
						},
						followingBranchId: "step-1-await-retry-allocation",
					},
				],
			},
			"step-1-await-retry-allocation": {
				id: "step-1-await-retry-allocation",
				routes: [
					{
						id: "step-1-build-initial-shell-after-retry",
						trigger: toolBackedOperationSucceeded("step-1-await-allocation", "step-1-retry-allocate-epics-artifact"),
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: EPICS_DOCUMENT_ARTIFACT_ID,
								buildContent: buildInitialCreateEpicsDocumentFromSession,
							},
						},
						followingBranchId: "step-1-await-initial-shell",
					},
					{
						id: "step-1-terminal-error-after-retry-allocation",
						trigger: toolBackedOperationFailed("step-1-await-allocation", "step-1-retry-allocate-epics-artifact"),
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to allocate Epics.md after retrying artifact creation.",
						},
					},
				],
			},
			"step-1-await-initial-shell": {
				id: "step-1-await-initial-shell",
				routes: [
					{
						id: "step-1-transition-to-step-2",
						trigger: {
							kind: "event_predicate",
							matches: ({ triggerEvent }) =>
								triggerEvent.kind === "tool_backed_operation_succeeded" &&
								(sourceRouteMatches(
									triggerEvent.sourceRoute,
									"step-1-await-allocation",
									"step-1-build-initial-shell",
								) ||
									sourceRouteMatches(
										triggerEvent.sourceRoute,
										"step-1-await-retry-allocation",
										"step-1-build-initial-shell-after-retry",
									)),
						},
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 2,
							},
						},
					},
					{
						id: "step-1-terminal-error-after-initial-shell",
						trigger: {
							kind: "event_predicate",
							matches: ({ triggerEvent }) =>
								triggerEvent.kind === "tool_backed_operation_failed" &&
								(sourceRouteMatches(
									triggerEvent.sourceRoute,
									"step-1-await-allocation",
									"step-1-build-initial-shell",
								) ||
									sourceRouteMatches(
										triggerEvent.sourceRoute,
										"step-1-await-retry-allocation",
										"step-1-build-initial-shell-after-retry",
									)),
						},
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to initialize Epics.md.",
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
					},
				],
			},
		},
	}
}

function readRequiredWorkflowStringValue(session: ActiveWorkflowSession, key: CreateEpicsWorkflowValueKey): string {
	const value = session.workflowValues[key]
	if (typeof value !== "string") {
		throw new Error(`Workflow value '${key}' must be a non-empty string.`)
	}

	const trimmedValue = value.trim()
	if (trimmedValue.length === 0) {
		throw new Error(`Workflow value '${key}' must be a non-empty string.`)
	}

	return trimmedValue
}

const CREATE_EPICS_FINAL_DELIVERY_FINALIZER: WorkflowFinalDeliveryFinalizer = {
	async finalize(input) {
		try {
			const resolvedIndexArtifact = await input.resolveArtifactOutput(EPICS_INDEX_ARTIFACT_ID)
			const outputFile = readRequiredWorkflowStringValue(input.session, CreateEpicsWorkflowValueKey.OutputFile)
			const epicsDocumentContent = await readFile(outputFile, "utf8")
			const epicsIndexJson = buildEpicsIndexJson(epicsDocumentContent)
			await mkdir(dirname(resolvedIndexArtifact.artifactAbsolutePath), { recursive: true })
			await writeFile(resolvedIndexArtifact.artifactAbsolutePath, epicsIndexJson, "utf8")

			return {
				kind: "succeeded",
				workflowValueWrites: resolvedIndexArtifact.workflowValueWrites,
			}
		} catch (error) {
			return {
				kind: "failed",
				errorMessage:
					error instanceof Error && error.message.trim() !== ""
						? error.message
						: "Unable to generate Epics.index.json.",
			}
		}
	},
}

export const createEpicsWorkflowDefinition: WorkflowDefinition = {
	name: CREATE_EPICS_WORKFLOW_NAME,
	displayName: CREATE_EPICS_WORKFLOW_DISPLAY_NAME,
	description: CREATE_EPICS_WORKFLOW_DESCRIPTION,
	slashCommandName: CREATE_EPICS_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: CREATE_EPICS_WORKFLOW_USE_SKILL_NAME,
	persona: CREATE_EPICS_WORKFLOW_PERSONA,
	projectSubfolder: CREATE_EPICS_WORKFLOW_PROJECT_SUBFOLDER,
	workflowValueKeys: CREATE_EPICS_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: {
		projectMode: CreateEpicsWorkflowValueKey.ProjectMode,
		projectTitle: CreateEpicsWorkflowValueKey.ProjectTitle,
		projectFolderName: CreateEpicsWorkflowValueKey.ProjectFolderName,
	},
	entryPanel: {
		promptMarkdown: CREATE_EPICS_WORKFLOW_DESCRIPTION,
	},
	artifacts: CREATE_EPICS_ARTIFACTS,
	workflowForms: {
		[STEP_1_CONTEXT_FORM_ID]: buildStep1ContextWorkflowForm(),
	},
	prerequisiteFiles: {
		[ARCHITECTURE_PREREQUISITE_ID]: {
			id: ARCHITECTURE_PREREQUISITE_ID,
			requirement: "required",
			projectSubfolderSegments: ["planning"],
			match: { kind: "exact_filename", filename: "architecture.md" },
			producingWorkflowName: "create-architecture",
			workflowValueKey: CreateEpicsWorkflowValueKey.ArchitectureDocument,
			outputDocumentReference: "module_document_builder",
		},
	},
	finalDeliveryFinalizer: CREATE_EPICS_FINAL_DELIVERY_FINALIZER,
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Gather Inputs",
			decisionTree: buildStep1DecisionTree(),
			buildToolSchema: buildCreateEpicsStep1ToolSchemas,
		}),
		"step-2": createStepDefinition({
			stepNumber: 2,
			checklistLabel: "Draft Epics",
			decisionTree: buildStep2DecisionTree(),
			buildPromptSource: buildStep2PromptSource,
			buildToolSchema: buildCreateEpicsStep2ToolSchemas,
		}),
	},
}
