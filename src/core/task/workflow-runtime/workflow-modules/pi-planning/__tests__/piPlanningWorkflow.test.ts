import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type {
	WorkflowFormDefinitionPayload,
	WorkflowFormFieldDefinition,
	WorkflowFormPanelDefinition,
} from "@shared/ExtensionMessage"
import { expect } from "chai"
import { describe, it } from "mocha"
import type { WorkflowStepResolutionSessionState } from "@/core/task/workflow-step-resolution/types"
import { ClineDefaultTool } from "@/shared/tools"
import type {
	ActiveWorkflowSession,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionAction,
	WorkflowDecisionBranchEvaluationInput,
	WorkflowDecisionBranchRoute,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowValues,
} from "../../../types"
import { renderWorkflowPromptTemplate } from "../../../workflowPromptTemplates"
import { PiPlanningWorkflowValueKey, piPlanningWorkflowDefinition } from "../piPlanningWorkflow"

const PROJECT_ROOT = "/tmp/pi-planning-project"
const EPICS_INDEX_PATH = `${PROJECT_ROOT}/planning/Epics.index.json`
const SAMPLE_WORKFLOW_VALUES: WorkflowValues = {
	[PiPlanningWorkflowValueKey.ProjectTitle]: "PI Planning Project",
	[PiPlanningWorkflowValueKey.ProjectFolderName]: "pi-planning-project",
	[PiPlanningWorkflowValueKey.ArchitectureDocument]: `${PROJECT_ROOT}/planning/architecture.md`,
	[PiPlanningWorkflowValueKey.EpicsDocument]: `${PROJECT_ROOT}/planning/Epics.md`,
	[PiPlanningWorkflowValueKey.EpicsIndex]: EPICS_INDEX_PATH,
	[PiPlanningWorkflowValueKey.BrainstormingDocument]: `${PROJECT_ROOT}/discovery/brainstorming.md`,
	[PiPlanningWorkflowValueKey.AdditionalContext]: `${PROJECT_ROOT}/research/context.md`,
	[PiPlanningWorkflowValueKey.TargetEpic]: "Epic 1: Improve workflow runtime",
	[PiPlanningWorkflowValueKey.EpicIdentity]: "1",
	[PiPlanningWorkflowValueKey.ImplementationFolder]: `${PROJECT_ROOT}/implementation`,
	[PiPlanningWorkflowValueKey.DraftsFolder]: `${PROJECT_ROOT}/implementation/drafts`,
	[PiPlanningWorkflowValueKey.StoriesIndex]: `${PROJECT_ROOT}/implementation/epic-1-stories.index.json`,
	[PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: true,
	[PiPlanningWorkflowValueKey.EditIntent]: "Complete initial story buildout",
	[PiPlanningWorkflowValueKey.SelectedStoryIdentity]: "1.1",
	[PiPlanningWorkflowValueKey.SelectedStoryFileName]: "Story-1-1.md",
	[PiPlanningWorkflowValueKey.SelectedStoryStatus]: "draft",
	[PiPlanningWorkflowValueKey.TargetStory]: "/tmp/pi-planning-project/implementation/drafts/Story-1-1.md",
}
const FORBIDDEN_BACKEND_ONLY_TOOL_NAMES: readonly string[] = [
	"build_workflow_document",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
	"execute_command",
]

function getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition {
	return piPlanningWorkflowDefinition.steps[stepId]
}

function createSession(workflowValues: WorkflowValues): ActiveWorkflowSession {
	return {
		activeStepNumber: 1,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "PI Planning Project",
			projectFolderName: "pi-planning-project",
		},
		lifecycle: {
			projectSelectionCompleted: true,
		},
		entryArtifactResolution: undefined,
		prerequisiteFileResolutions: [],
		ui: {
			formSession: undefined,
			stepResolutionSession: undefined,
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext: {
			activeBranchId: "step-1-resolve-prerequisites",
		},
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
		prerequisiteFileResolutions: [],
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

function findRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const route = getStep(stepId).decisionTree.branches[branchId]?.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Missing route ${stepId}/${branchId}/${routeId}.`)
	}

	return route
}

function buildWorkflowFormCompletedEvent(workflowFormId: string): WorkflowBranchTriggerEvent {
	return {
		kind: "workflow_form_completed",
		workflowFormId,
	}
}

function buildWorkflowValuesPersistedEvent(changedKeys: readonly string[]): WorkflowBranchTriggerEvent {
	return {
		kind: "workflow_values_persisted",
		changedKeys,
	}
}

function buildWorkflowFormPanelSubmittedEvent(panelId: string, action: "submit" | "back"): WorkflowBranchTriggerEvent {
	return {
		kind: "workflow_form_panel_submitted",
		workflowFormId: "step-1-input-form",
		panelId,
		action,
		submittedValueKeys: [],
		clearedValueKeys: [],
	}
}

function buildToolBackedOperationSucceededEvent(sourceRoute: { branchId: string; routeId: string }): WorkflowBranchTriggerEvent {
	return { kind: "tool_backed_operation_succeeded", sourceRoute }
}

function buildToolBackedOperationFailedEvent(sourceRoute: { branchId: string; routeId: string }): WorkflowBranchTriggerEvent {
	return { kind: "tool_backed_operation_failed", sourceRoute }
}

function buildModelToolSucceededEvent(toolName: ClineDefaultTool): WorkflowBranchTriggerEvent {
	return {
		kind: "model_tool_succeeded",
		toolName,
	}
}

function buildModelToolFailedEvent(toolName: ClineDefaultTool): WorkflowBranchTriggerEvent {
	return {
		kind: "model_tool_failed",
		toolName,
	}
}

function createPromptInput(step: WorkflowStepDefinition, workflowValues: WorkflowValues): WorkflowPromptBuilderInput {
	return {
		session: createSession(workflowValues),
		step,
	}
}

function buildPrompt(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): string {
	const step = getStep(stepId)
	const promptSource = step.buildPromptSource(createPromptInput(step, workflowValues))
	if (promptSource.kind !== "current_step_instruction_template") {
		throw new Error(`Missing current step instruction template for ${stepId}.`)
	}

	const template = promptSource.currentStepInstructionTemplate
	return renderWorkflowPromptTemplate({
		template,
		workflowValueKeys: piPlanningWorkflowDefinition.workflowValueKeys,
		workflowValues,
		context: `pi-planning ${stepId} test prompt`,
	})
}

function expectNoPiPlanningWorkflowPromptTokens(prompt: string): void {
	const forbiddenTokens: readonly string[] = [
		"{workflow.target_epic}",
		"{workflow.epics_index}",
		"{workflow.epics_document}",
		"{workflow.architecture_document}",
		"{workflow.brainstorming_document}",
		"{workflow.additional_context}",
		"{workflow.drafts_folder}",
		"{workflow.stories_index}",
		"{workflow.epic_identity}",
		"{workflow.implementation_folder}",
		"{workflow.projectTitle}",
		"{workflow.projectFolderName}",
		"{workflow.target_story}",
		"Shown only if",
		"end conditional prompt block",
		"Story-index branch",
		"Story-file branch",
		"An existing story index is present",
		"no story index existed at workflow start",
		"Additional Context:",
		"not provided",
	]

	for (const forbiddenToken of forbiddenTokens) {
		expect(prompt).not.to.include(forbiddenToken)
	}
}

function expectTransitionStepAction(action: WorkflowDecisionAction, stepNumber: number): void {
	expect(action.kind).to.equal("transition_step")
	if (action.kind !== "transition_step") {
		throw new Error(`Expected transition_step, received ${action.kind}.`)
	}

	expect(action.target).to.deep.equal({
		kind: "entry_branch",
		stepNumber,
	})
}

async function expectContinueWorkflowFormAction(
	action: WorkflowDecisionAction,
	panelId: string,
): Promise<Extract<WorkflowDecisionAction, { kind: "continue_workflow_form" }>> {
	expect(action.kind).to.equal("continue_workflow_form")
	if (action.kind !== "continue_workflow_form") {
		throw new Error(`Expected continue_workflow_form, received ${action.kind}.`)
	}

	expect(action.workflowFormId).to.equal("step-1-input-form")
	expect(action.panelId).to.equal(panelId)
	const replacement = await action.buildReplacement(createSession(SAMPLE_WORKFLOW_VALUES))
	expect(replacement).to.deep.equal({ panel: getPanel(getStep1InputForm(), panelId), data: {} })
	return action
}

function expectExecuteToolBackedOperationAction(
	action: WorkflowDecisionAction,
): Extract<WorkflowDecisionAction, { kind: "execute_tool_backed_operation" }> {
	expect(action.kind).to.equal("execute_tool_backed_operation")
	if (action.kind !== "execute_tool_backed_operation") {
		throw new Error(`Expected execute_tool_backed_operation, received ${action.kind}.`)
	}

	return action
}

function expectValidateStoryIndexEntryAction(
	action: WorkflowDecisionAction,
): Extract<WorkflowDecisionAction, { kind: "validate_story_index_entry" }> {
	expect(action.kind).to.equal("validate_story_index_entry")
	if (action.kind !== "validate_story_index_entry") {
		throw new Error(`Expected validate_story_index_entry, received ${action.kind}.`)
	}

	return action
}

function expectResolveExistingProjectArtifactAction(
	action: WorkflowDecisionAction,
): Extract<WorkflowDecisionAction, { kind: "resolve_existing_project_artifact" }> {
	expect(action.kind).to.equal("resolve_existing_project_artifact")
	if (action.kind !== "resolve_existing_project_artifact") {
		throw new Error(`Expected resolve_existing_project_artifact, received ${action.kind}.`)
	}

	return action
}

function expectEventPredicateMatches(args: {
	route: WorkflowDecisionBranchRoute
	activeBranchId: string
	workflowValues: WorkflowValues
	step: WorkflowStepDefinition
	triggerEvent: WorkflowBranchTriggerEvent
}): void {
	if (args.route.trigger.kind !== "event_predicate") {
		throw new Error(`Expected event_predicate trigger, received ${args.route.trigger.kind}.`)
	}

	expect(
		args.route.trigger.matches(
			createEventPredicateInput({
				activeBranchId: args.activeBranchId,
				workflowValues: args.workflowValues,
				step: args.step,
				triggerEvent: args.triggerEvent,
			}),
		),
	).to.equal(true)
}

function expectEventPredicateDoesNotMatch(args: {
	route: WorkflowDecisionBranchRoute
	activeBranchId: string
	workflowValues: WorkflowValues
	step: WorkflowStepDefinition
	triggerEvent: WorkflowBranchTriggerEvent
}): void {
	if (args.route.trigger.kind !== "event_predicate") {
		throw new Error(`Expected event_predicate trigger, received ${args.route.trigger.kind}.`)
	}

	expect(
		args.route.trigger.matches(
			createEventPredicateInput({
				activeBranchId: args.activeBranchId,
				workflowValues: args.workflowValues,
				step: args.step,
				triggerEvent: args.triggerEvent,
			}),
		),
	).to.equal(false)
}

function getStep1InputForm(): WorkflowFormDefinitionPayload {
	const form = piPlanningWorkflowDefinition.workflowForms?.["step-1-input-form"]
	if (form === undefined) {
		throw new Error("Missing Step 1 input workflow form.")
	}

	return form
}

function getPanel(form: WorkflowFormDefinitionPayload, panelId: string): WorkflowFormPanelDefinition {
	const panel = form.panels[panelId]
	if (panel === undefined) {
		throw new Error(`Missing workflow form panel ${panelId}.`)
	}

	return panel
}

function getSingleField(panel: WorkflowFormPanelDefinition): WorkflowFormFieldDefinition {
	const field = panel.fields[0]
	if (field === undefined) {
		throw new Error(`Missing workflow form field for panel ${panel.panelId}.`)
	}

	return field
}

describe("piPlanningWorkflowDefinition", () => {
	it("declares workflow identity, metadata, and no .md identity aliases", () => {
		expect(piPlanningWorkflowDefinition.name).to.equal("pi-planning")
		expect(piPlanningWorkflowDefinition.displayName).to.equal("PI Planning")
		expect(piPlanningWorkflowDefinition.slashCommandName).to.equal("pi-planning")
		expect(piPlanningWorkflowDefinition.useSkillName).to.equal("pi-planning")
		expect(piPlanningWorkflowDefinition.description).to.equal(
			"Break a selected epic into implementation-ready draft story files using architecture, epics, and optional discovery context.",
		)
		expect(piPlanningWorkflowDefinition.projectSelection).to.deep.equal({ kind: "interactive" })
		expect(piPlanningWorkflowDefinition.projectOutputPlacement).to.deep.equal({
			kind: "selected_project_subfolder",
			subfolder: "planning",
		})
		expect(Object.hasOwn(piPlanningWorkflowDefinition, "projectSubfolder")).to.equal(false)
		expect(piPlanningWorkflowDefinition.entryPanel.promptMarkdown).to.equal(piPlanningWorkflowDefinition.description)

		const identityValues: readonly string[] = [
			piPlanningWorkflowDefinition.name,
			piPlanningWorkflowDefinition.slashCommandName,
			piPlanningWorkflowDefinition.useSkillName,
		]
		expect(identityValues).not.to.include("pi-planning.md")
		for (const identityValue of identityValues) {
			expect(identityValue.endsWith(".md")).to.equal(false)
		}
	})

	it("declares the product manager persona shape and documentation/runtime-code validation principle", () => {
		const persona = piPlanningWorkflowDefinition.persona

		expect(persona.name).to.equal("John")
		expect(persona.role).to.equal("Product Manager")
		expect(persona.identity).to.be.a("string")
		expect(persona.identity).to.not.equal("")
		expect(persona.capabilities).to.be.an("array").that.is.not.empty
		for (const capability of persona.capabilities) {
			expect(capability).to.be.a("string")
			expect(capability).to.not.equal("")
		}
		expect(persona.communicationStyle).to.be.a("string")
		expect(persona.communicationStyle).to.not.equal("")
		expect(persona.principles).to.be.an("array").that.is.not.empty
		expect(persona.principles.some((principle) => principle.includes("documentation coverage"))).to.equal(true)
		expect(persona.principles.some((principle) => principle.includes("existing runtime code"))).to.equal(true)
	})

	it("declares every workflow value key and uses only declared entry project value keys", () => {
		const expectedWorkflowValueKeys: readonly string[] = [
			PiPlanningWorkflowValueKey.ProjectMode,
			PiPlanningWorkflowValueKey.ProjectTitle,
			PiPlanningWorkflowValueKey.ProjectFolderName,
			PiPlanningWorkflowValueKey.ImplementationFolder,
			PiPlanningWorkflowValueKey.DraftsFolder,
			PiPlanningWorkflowValueKey.ArchitectureDocument,
			PiPlanningWorkflowValueKey.EpicsDocument,
			PiPlanningWorkflowValueKey.EpicsIndex,
			PiPlanningWorkflowValueKey.BrainstormingDocument,
			PiPlanningWorkflowValueKey.AdditionalContext,
			PiPlanningWorkflowValueKey.TargetEpic,
			PiPlanningWorkflowValueKey.EpicIdentity,
			PiPlanningWorkflowValueKey.StoriesIndex,
			PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart,
			PiPlanningWorkflowValueKey.EditIntent,
			PiPlanningWorkflowValueKey.SelectedStoryIdentity,
			PiPlanningWorkflowValueKey.SelectedStoryFileName,
			PiPlanningWorkflowValueKey.SelectedStoryStatus,
			PiPlanningWorkflowValueKey.TargetStory,
		]

		expect(piPlanningWorkflowDefinition.workflowValueKeys).to.deep.equal(expectedWorkflowValueKeys)
		expect(piPlanningWorkflowDefinition.entryProjectValueKeys).to.deep.equal({
			projectMode: PiPlanningWorkflowValueKey.ProjectMode,
			projectTitle: PiPlanningWorkflowValueKey.ProjectTitle,
			projectFolderName: PiPlanningWorkflowValueKey.ProjectFolderName,
		})
		for (const entryProjectValueKey of Object.values(piPlanningWorkflowDefinition.entryProjectValueKeys)) {
			expect(piPlanningWorkflowDefinition.workflowValueKeys).to.include(entryProjectValueKey)
		}
	})

	it("does not declare workflow artifact definitions", () => {
		expect(Reflect.has(piPlanningWorkflowDefinition, "artifacts")).to.equal(false)
		expect(piPlanningWorkflowDefinition.artifacts).to.equal(undefined)
	})

	it("declares exact required and optional prerequisite files", () => {
		expect(piPlanningWorkflowDefinition.prerequisiteFiles).to.deep.equal({
			[PiPlanningWorkflowValueKey.ArchitectureDocument]: {
				id: PiPlanningWorkflowValueKey.ArchitectureDocument,
				requirement: "required",
				resolutionMode: "interactive",
				producingWorkflowName: "create-architecture",
				projectSubfolderSegments: ["planning"],
				match: { kind: "exact_filename", filename: "architecture.md" },
				workflowValueKey: PiPlanningWorkflowValueKey.ArchitectureDocument,
				outputDocumentReference: "none",
			},
			[PiPlanningWorkflowValueKey.EpicsDocument]: {
				id: PiPlanningWorkflowValueKey.EpicsDocument,
				requirement: "required",
				resolutionMode: "interactive",
				producingWorkflowName: "create-epics",
				projectSubfolderSegments: ["planning"],
				match: { kind: "exact_filename", filename: "Epics.md" },
				workflowValueKey: PiPlanningWorkflowValueKey.EpicsDocument,
				outputDocumentReference: "none",
			},
			[PiPlanningWorkflowValueKey.EpicsIndex]: {
				id: PiPlanningWorkflowValueKey.EpicsIndex,
				requirement: "required",
				resolutionMode: "interactive",
				producingWorkflowName: "create-epics",
				projectSubfolderSegments: ["planning"],
				match: { kind: "exact_filename", filename: "Epics.index.json" },
				workflowValueKey: PiPlanningWorkflowValueKey.EpicsIndex,
				outputDocumentReference: "none",
			},
			[PiPlanningWorkflowValueKey.BrainstormingDocument]: {
				id: PiPlanningWorkflowValueKey.BrainstormingDocument,
				requirement: "optional",
				resolutionMode: "interactive",
				producingWorkflowName: "brainstorming",
				projectSubfolderSegments: ["discovery"],
				match: { kind: "exact_filename", filename: "brainstorming.md" },
				workflowValueKey: PiPlanningWorkflowValueKey.BrainstormingDocument,
				outputDocumentReference: "none",
			},
		})
	})

	it("defines Step 1 Panel A as a JSON-backed target epic dropdown persisted to epic_identity", () => {
		const form = getStep1InputForm()
		expect(form.firstPanelId).to.equal("step-1-target-epic-panel")
		const panelA = getPanel(form, "step-1-target-epic-panel")
		const field = getSingleField(panelA)

		expect(panelA.panelId).to.equal("step-1-target-epic-panel")
		expect(panelA.title).to.equal("Target Epic")
		expect(panelA.promptMarkdown).to.equal("Which epic are we working on during this workflow?")
		expect(panelA.allowedActions).to.deep.equal(["submit"])
		expect(panelA.actionLabels).to.deep.equal({ submit: "Continue" })
		expect(field).to.deep.equal({
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
		})
		expect(panelA.transition).to.deep.equal({ type: "runtime_routed" })
	})

	it("does not retain the removed Required Context panel", () => {
		expect(getStep1InputForm().panels["step-1-required-context-panel"]).to.equal(undefined)
	})

	it("defines Step 1 Panel B as the edit-intent panel", () => {
		const panelB = getPanel(getStep1InputForm(), "step-1-edit-intent-panel")
		const field = getSingleField(panelB)

		expect(panelB.panelId).to.equal("step-1-edit-intent-panel")
		expect(panelB.title).to.equal("Provide Edit Intent")
		expect(panelB.promptMarkdown).to.equal(
			"It looks like the selected epic already has a story index file with generated story files. Please select one of the following options:",
		)
		expect(field).to.deep.equal({
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
				{ value: "Complete initial story buildout", label: "Complete initial story buildout" },
				{ value: "edit existing story file", label: "edit existing story file" },
			],
		})
		expect(panelB.allowedActions).to.deep.equal(["submit", "back"])
		expect(panelB.actionLabels).to.deep.equal({ submit: "Continue", back: "Back" })
		expect(panelB.backDestinationPanelId).to.equal("step-1-target-epic-panel")
		expect(panelB.backStaleValueKeysToClear).to.deep.equal([
			PiPlanningWorkflowValueKey.EditIntent,
			PiPlanningWorkflowValueKey.SelectedStoryIdentity,
			PiPlanningWorkflowValueKey.SelectedStoryFileName,
			PiPlanningWorkflowValueKey.SelectedStoryStatus,
			PiPlanningWorkflowValueKey.TargetStory,
			PiPlanningWorkflowValueKey.AdditionalContext,
		])
		expect(panelB.transition).to.deep.equal({ type: "runtime_routed" })
	})

	it("defines Step 1 Panel C as the story-selection panel", () => {
		const panelC = getPanel(getStep1InputForm(), "step-1-select-story-panel")
		const field = getSingleField(panelC)

		expect(panelC.panelId).to.equal("step-1-select-story-panel")
		expect(panelC.title).to.equal("Select Story")
		expect(panelC.promptMarkdown).to.equal("Which story would you like to edit?")
		expect(field).to.deep.equal({
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
				root: { kind: "selected_project_root" },
				sourcePathSegments: ["implementation", "epic-{workflow.epic_identity}-stories.index.json"],
				itemsPath: "stories",
				valueProperty: "story_identity",
				labelTemplate: "Story {story_identity}: {story_file_name}",
			},
		})
		expect(field.kind).to.equal("dropdown")
		if (field.kind !== "dropdown") {
			throw new Error(`Expected dropdown field, received ${field.kind}.`)
		}
		const jsonOptionsSource = field.jsonOptionsSource
		expect(jsonOptionsSource).not.to.equal(undefined)
		if (jsonOptionsSource === undefined) {
			throw new Error("Expected story-selection field to define jsonOptionsSource.")
		}
		expect(jsonOptionsSource.descriptionTemplate).to.equal(undefined)
		expect(panelC.allowedActions).to.deep.equal(["submit", "back"])
		expect(panelC.actionLabels).to.deep.equal({ submit: "Continue", back: "Back" })
		expect(panelC.backDestinationPanelId).to.equal("step-1-edit-intent-panel")
		expect(panelC.backStaleValueKeysToClear).to.deep.equal([
			PiPlanningWorkflowValueKey.SelectedStoryIdentity,
			PiPlanningWorkflowValueKey.SelectedStoryFileName,
			PiPlanningWorkflowValueKey.SelectedStoryStatus,
			PiPlanningWorkflowValueKey.TargetStory,
			PiPlanningWorkflowValueKey.AdditionalContext,
		])
		expect(panelC.transition).to.deep.equal({ type: "runtime_routed" })
	})

	it("defines Step 1 Panel D as optional additional context persisted to additional_context", () => {
		const panelD = getPanel(getStep1InputForm(), "step-1-additional-context-panel")
		const field = getSingleField(panelD)

		expect(panelD.panelId).to.equal("step-1-additional-context-panel")
		expect(panelD.title).to.equal("Additional Context")
		expect(panelD.promptMarkdown).to.equal(
			"If you'd like to include any other files as workflow context please provide their full file paths below.",
		)
		expect(field).to.deep.equal({
			key: PiPlanningWorkflowValueKey.AdditionalContext,
			workflowValueKey: PiPlanningWorkflowValueKey.AdditionalContext,
			kind: "large_text",
			label: "Additional context file paths",
			required: false,
			allowedValueType: "string",
			presentation: { textareaSize: "large" },
		})
		expect(panelD.allowedActions).to.deep.equal(["submit"])
		expect(panelD.actionLabels).to.deep.equal({ submit: "Continue" })
		expect(panelD.backDestinationPanelId).to.equal(undefined)
		expect(panelD.backStaleValueKeysToClear).to.equal(undefined)
		expect(panelD.transition).to.deep.equal({
			type: "conditional",
			conditionSourceKey: "__terminal__",
			branches: [],
			defaultTerminal: true,
		})
	})

	it("routes Step 1 through runtime-routed edit-intent and target-story paths", async () => {
		const step1 = getStep("step-1")
		expect(step1.decisionTree.entryBranchId).to.equal("step-1-resolve-prerequisites")

		const prerequisiteRoute = findRoute("step-1", "step-1-resolve-prerequisites", "step-1-resolve-prerequisites")
		expect(prerequisiteRoute.trigger).to.deep.equal({ kind: "always" })
		expect(prerequisiteRoute.action).to.deep.equal({
			kind: "resolve_prerequisite_files",
			prerequisiteIds: [
				PiPlanningWorkflowValueKey.ArchitectureDocument,
				PiPlanningWorkflowValueKey.EpicsDocument,
				PiPlanningWorkflowValueKey.EpicsIndex,
				PiPlanningWorkflowValueKey.BrainstormingDocument,
			],
		})
		expect(prerequisiteRoute.followingBranchId).to.equal("step-1-persist-project-folder-values")

		const folderRoute = findRoute("step-1", "step-1-persist-project-folder-values", "step-1-persist-project-folder-values")
		expect(folderRoute.trigger).to.deep.equal({ kind: "always" })
		expect(folderRoute.action.kind).to.equal("run_deterministic_procedure")
		if (folderRoute.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${folderRoute.action.kind}.`)
		}
		const folderResult = await folderRoute.action.instruction.run(
			createSession({
				[PiPlanningWorkflowValueKey.EpicsIndex]: EPICS_INDEX_PATH,
			}),
		)
		expect(folderResult.kind).to.equal("succeeded")
		if (folderResult.kind !== "succeeded") {
			throw new Error(`Expected folder persistence to succeed, received ${folderResult.kind}.`)
		}
		expect(folderResult.workflowValueWrites).to.deep.equal({
			[PiPlanningWorkflowValueKey.ImplementationFolder]: `${PROJECT_ROOT}/implementation`,
			[PiPlanningWorkflowValueKey.DraftsFolder]: `${PROJECT_ROOT}/implementation/drafts`,
		})
		expect(folderRoute.followingBranchId).to.equal("step-1-render-input-form")

		const renderFormRoute = findRoute("step-1", "step-1-render-input-form", "step-1-render-input-form")
		expect(renderFormRoute.trigger).to.deep.equal({ kind: "always" })
		expect(renderFormRoute.action.kind).to.equal("render_workflow_form")
		if (renderFormRoute.action.kind !== "render_workflow_form") {
			throw new Error(`Expected render_workflow_form, received ${renderFormRoute.action.kind}.`)
		}
		expect(renderFormRoute.action.workflowFormId).to.equal("step-1-input-form")
		expect("buildSessionData" in renderFormRoute.action).to.equal(true)
		if (!("buildSessionData" in renderFormRoute.action)) {
			throw new Error("Expected render_workflow_form route to define buildSessionData.")
		}
		expect(typeof renderFormRoute.action.buildSessionData).to.equal("function")
		expect(renderFormRoute.followingBranchId).to.equal("step-1-await-target-epic-panel")

		const derivationRoute = findRoute("step-1", "step-1-await-target-epic-panel", "step-1-derive-selected-epic-values")
		expectEventPredicateMatches({
			route: derivationRoute,
			activeBranchId: "step-1-await-target-epic-panel",
			workflowValues: SAMPLE_WORKFLOW_VALUES,
			step: step1,
			triggerEvent: buildWorkflowFormPanelSubmittedEvent("step-1-target-epic-panel", "submit"),
		})
		expect(derivationRoute.action.kind).to.equal("run_deterministic_procedure")
		expect(derivationRoute.followingBranchId).to.equal("step-1-route-after-target-epic-panel")

		const existingIndexRoute = findRoute(
			"step-1",
			"step-1-route-after-target-epic-panel",
			"step-1-continue-to-edit-intent-panel",
		)
		expect(existingIndexRoute.trigger.kind).to.equal("session_predicate")
		if (existingIndexRoute.trigger.kind !== "session_predicate") {
			throw new Error(`Expected session_predicate trigger, received ${existingIndexRoute.trigger.kind}.`)
		}
		expect(
			existingIndexRoute.trigger.matches(
				createSessionPredicateInput({
					activeBranchId: "step-1-route-after-target-epic-panel",
					workflowValues: {
						...SAMPLE_WORKFLOW_VALUES,
						[PiPlanningWorkflowValueKey.StoriesIndex]:
							"/tmp/pi-planning-project/implementation/epic-1-stories.index.json",
					},
					step: step1,
				}),
			),
		).to.equal(true)
		await expectContinueWorkflowFormAction(existingIndexRoute.action, "step-1-edit-intent-panel")
		expect(existingIndexRoute.followingBranchId).to.equal("step-1-await-edit-intent-panel")

		const missingIndexRoute = findRoute(
			"step-1",
			"step-1-route-after-target-epic-panel",
			"step-1-continue-to-additional-context-after-new-index-epic",
		)
		expect(missingIndexRoute.trigger.kind).to.equal("session_predicate")
		if (missingIndexRoute.trigger.kind !== "session_predicate") {
			throw new Error(`Expected session_predicate trigger, received ${missingIndexRoute.trigger.kind}.`)
		}
		const workflowValues: WorkflowValues = { ...SAMPLE_WORKFLOW_VALUES }
		delete workflowValues[PiPlanningWorkflowValueKey.StoriesIndex]
		expect(
			missingIndexRoute.trigger.matches(
				createSessionPredicateInput({
					activeBranchId: "step-1-route-after-target-epic-panel",
					workflowValues,
					step: step1,
				}),
			),
		).to.equal(true)
		await expectContinueWorkflowFormAction(missingIndexRoute.action, "step-1-additional-context-panel")
		expect(missingIndexRoute.followingBranchId).to.equal("step-1-await-final-form-submit")

		const editIntentSubmitRoute = findRoute("step-1", "step-1-await-edit-intent-panel", "step-1-route-after-edit-intent")
		expectEventPredicateMatches({
			route: editIntentSubmitRoute,
			activeBranchId: "step-1-await-edit-intent-panel",
			workflowValues: SAMPLE_WORKFLOW_VALUES,
			step: step1,
			triggerEvent: buildWorkflowFormPanelSubmittedEvent("step-1-edit-intent-panel", "submit"),
		})
		expect(editIntentSubmitRoute.action).to.deep.equal({ kind: "no_op" })
		expect(editIntentSubmitRoute.followingBranchId).to.equal("step-1-route-after-edit-intent-panel")

		const initialBuildoutRoute = findRoute(
			"step-1",
			"step-1-route-after-edit-intent-panel",
			"step-1-continue-to-additional-context-after-complete-initial-buildout",
		)
		expect(initialBuildoutRoute.trigger.kind).to.equal("session_predicate")
		if (initialBuildoutRoute.trigger.kind !== "session_predicate") {
			throw new Error(`Expected session_predicate trigger, received ${initialBuildoutRoute.trigger.kind}.`)
		}
		expect(
			initialBuildoutRoute.trigger.matches(
				createSessionPredicateInput({
					activeBranchId: "step-1-route-after-edit-intent-panel",
					workflowValues: {
						...SAMPLE_WORKFLOW_VALUES,
						[PiPlanningWorkflowValueKey.EditIntent]: "Complete initial story buildout",
					},
					step: step1,
				}),
			),
		).to.equal(true)
		await expectContinueWorkflowFormAction(initialBuildoutRoute.action, "step-1-additional-context-panel")
		expect(initialBuildoutRoute.followingBranchId).to.equal("step-1-await-final-form-submit")

		const editExistingStoryRoute = findRoute(
			"step-1",
			"step-1-route-after-edit-intent-panel",
			"step-1-continue-to-select-story-panel",
		)
		expect(editExistingStoryRoute.trigger.kind).to.equal("session_predicate")
		if (editExistingStoryRoute.trigger.kind !== "session_predicate") {
			throw new Error(`Expected session_predicate trigger, received ${editExistingStoryRoute.trigger.kind}.`)
		}
		expect(
			editExistingStoryRoute.trigger.matches(
				createSessionPredicateInput({
					activeBranchId: "step-1-route-after-edit-intent-panel",
					workflowValues: {
						...SAMPLE_WORKFLOW_VALUES,
						[PiPlanningWorkflowValueKey.EditIntent]: "edit existing story file",
					},
					step: step1,
				}),
			),
		).to.equal(true)
		await expectContinueWorkflowFormAction(editExistingStoryRoute.action, "step-1-select-story-panel")
		expect(editExistingStoryRoute.followingBranchId).to.equal("step-1-await-select-story-panel")

		const selectedStoryRoute = findRoute("step-1", "step-1-await-select-story-panel", "step-1-derive-selected-story-values")
		expectEventPredicateMatches({
			route: selectedStoryRoute,
			activeBranchId: "step-1-await-select-story-panel",
			workflowValues: SAMPLE_WORKFLOW_VALUES,
			step: step1,
			triggerEvent: buildWorkflowFormPanelSubmittedEvent("step-1-select-story-panel", "submit"),
		})
		expect(selectedStoryRoute.action.kind).to.equal("run_deterministic_procedure")
		expect(selectedStoryRoute.followingBranchId).to.equal("step-1-continue-to-additional-context-after-story-selection")

		const storySelectionAdditionalContextRoute = findRoute(
			"step-1",
			"step-1-continue-to-additional-context-after-story-selection",
			"step-1-continue-to-additional-context-after-story-selection",
		)
		expect(storySelectionAdditionalContextRoute.trigger).to.deep.equal({ kind: "always" })
		await expectContinueWorkflowFormAction(storySelectionAdditionalContextRoute.action, "step-1-additional-context-panel")
		expect(storySelectionAdditionalContextRoute.followingBranchId).to.equal("step-1-await-final-form-submit")

		const newIndexFinalRoute = findRoute(
			"step-1",
			"step-1-await-final-form-submit",
			"step-1-transition-to-step-2-after-new-index-epic",
		)
		expectEventPredicateMatches({
			route: newIndexFinalRoute,
			activeBranchId: "step-1-await-final-form-submit",
			workflowValues: { ...SAMPLE_WORKFLOW_VALUES, [PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: false },
			step: step1,
			triggerEvent: buildWorkflowFormCompletedEvent("step-1-input-form"),
		})
		expectEventPredicateDoesNotMatch({
			route: newIndexFinalRoute,
			activeBranchId: "step-1-await-final-form-submit",
			workflowValues: { ...SAMPLE_WORKFLOW_VALUES, [PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: true },
			step: step1,
			triggerEvent: buildWorkflowFormCompletedEvent("step-1-input-form"),
		})
		expect(newIndexFinalRoute.action).to.deep.equal({
			kind: "transition_step",
			target: { kind: "entry_branch", stepNumber: 2 },
		})

		const completeInitialBuildoutFinalRoute = findRoute(
			"step-1",
			"step-1-await-final-form-submit",
			"step-1-transition-to-step-2-after-complete-initial-buildout",
		)
		expectEventPredicateMatches({
			route: completeInitialBuildoutFinalRoute,
			activeBranchId: "step-1-await-final-form-submit",
			workflowValues: {
				...SAMPLE_WORKFLOW_VALUES,
				[PiPlanningWorkflowValueKey.EditIntent]: "Complete initial story buildout",
			},
			step: step1,
			triggerEvent: buildWorkflowFormCompletedEvent("step-1-input-form"),
		})
		expectEventPredicateDoesNotMatch({
			route: completeInitialBuildoutFinalRoute,
			activeBranchId: "step-1-await-final-form-submit",
			workflowValues: {
				...SAMPLE_WORKFLOW_VALUES,
				[PiPlanningWorkflowValueKey.EditIntent]: "edit existing story file",
			},
			step: step1,
			triggerEvent: buildWorkflowFormCompletedEvent("step-1-input-form"),
		})
		expect(completeInitialBuildoutFinalRoute.action).to.deep.equal({
			kind: "transition_step",
			target: { kind: "entry_branch", stepNumber: 2 },
		})

		const generateMissingStoriesRoute = findRoute(
			"step-1",
			"step-1-await-final-form-submit",
			"step-1-generate-missing-story-files-before-edit",
		)
		expectEventPredicateMatches({
			route: generateMissingStoriesRoute,
			activeBranchId: "step-1-await-final-form-submit",
			workflowValues: {
				...SAMPLE_WORKFLOW_VALUES,
				[PiPlanningWorkflowValueKey.EditIntent]: "edit existing story file",
			},
			step: step1,
			triggerEvent: buildWorkflowFormCompletedEvent("step-1-input-form"),
		})
		expectEventPredicateDoesNotMatch({
			route: generateMissingStoriesRoute,
			activeBranchId: "step-1-await-final-form-submit",
			workflowValues: {
				...SAMPLE_WORKFLOW_VALUES,
				[PiPlanningWorkflowValueKey.EditIntent]: "Complete initial story buildout",
			},
			step: step1,
			triggerEvent: buildWorkflowFormCompletedEvent("step-1-input-form"),
		})
		const generateMissingStoriesAction = expectExecuteToolBackedOperationAction(generateMissingStoriesRoute.action)
		const instruction = generateMissingStoriesAction.instruction
		expect(instruction.toolName).to.equal(ClineDefaultTool.GENERATE_STORY_FILES)
		const toolBackedOperationSession: WorkflowStepResolutionSessionState = {
			sessionId: "pi-planning-generate-missing-story-files",
			sourceRoute: {
				branchId: "step-1-await-final-form-submit",
				routeId: "step-1-generate-missing-story-files-before-edit",
			},
			triggerSource: "execute_tool_backed_operation",
			owner: { kind: "workflow_step", workflowName: "pi-planning", stepNumber: 1 },
			state: "pending",
		}
		const statusDefinition = instruction.buildStatusDefinition(toolBackedOperationSession)
		const toolExecutionRequest = instruction.buildToolExecutionRequest({
			toolBackedOperationSession,
			activeWorkflowSession: createSession({
				...SAMPLE_WORKFLOW_VALUES,
				[PiPlanningWorkflowValueKey.EditIntent]: "edit existing story file",
				[PiPlanningWorkflowValueKey.EpicIdentity]: "1",
			}),
		})
		const evaluationResult = instruction.evaluateToolExecutionResult(toolBackedOperationSession, {})
		expect(statusDefinition).to.deep.equal({
			title: "Generate Missing Story Files",
			pendingLabel: "Generating missing story files",
			successLabel: "Generated missing story files",
			failureLabel: "Failed to generate missing story files",
		})
		expect(toolExecutionRequest).to.deep.equal({
			toolName: ClineDefaultTool.GENERATE_STORY_FILES,
			toolInput: {},
			toolParams: { epic_identity: "1" },
		})
		expect(evaluationResult).to.deep.equal({ succeeded: true })
		expect(generateMissingStoriesRoute.followingBranchId).to.equal("step-1-await-missing-story-generation")

		const generationSuccessRoute = findRoute(
			"step-1",
			"step-1-await-missing-story-generation",
			"step-1-route-target-story-status-after-missing-story-generation",
		)
		expectEventPredicateMatches({
			route: generationSuccessRoute,
			activeBranchId: "step-1-await-missing-story-generation",
			workflowValues: SAMPLE_WORKFLOW_VALUES,
			step: step1,
			triggerEvent: buildToolBackedOperationSucceededEvent({
				branchId: "step-1-await-final-form-submit",
				routeId: "step-1-generate-missing-story-files-before-edit",
			}),
		})
		expect(generationSuccessRoute.action).to.deep.equal({ kind: "no_op" })
		expect(generationSuccessRoute.followingBranchId).to.equal("step-1-route-target-story-status")

		const generationFailureRoute = findRoute(
			"step-1",
			"step-1-await-missing-story-generation",
			"step-1-fail-after-missing-story-generation",
		)
		expectEventPredicateMatches({
			route: generationFailureRoute,
			activeBranchId: "step-1-await-missing-story-generation",
			workflowValues: SAMPLE_WORKFLOW_VALUES,
			step: step1,
			triggerEvent: buildToolBackedOperationFailedEvent({
				branchId: "step-1-await-final-form-submit",
				routeId: "step-1-generate-missing-story-files-before-edit",
			}),
		})
		expect(generationFailureRoute.action).to.deep.equal({
			kind: "terminal_error",
			errorMessage: "Failed to generate missing story files",
		})

		const draftValidationRoute = findRoute(
			"step-1",
			"step-1-route-target-story-status",
			"step-1-validate-draft-story-index-entry",
		)
		expect(draftValidationRoute.trigger.kind).to.equal("session_predicate")
		if (draftValidationRoute.trigger.kind !== "session_predicate") {
			throw new Error(`Expected session_predicate trigger, received ${draftValidationRoute.trigger.kind}.`)
		}
		expect(
			draftValidationRoute.trigger.matches(
				createSessionPredicateInput({
					activeBranchId: "step-1-route-target-story-status",
					workflowValues: { ...SAMPLE_WORKFLOW_VALUES, [PiPlanningWorkflowValueKey.SelectedStoryStatus]: "draft" },
					step: step1,
				}),
			),
		).to.equal(true)
		expect(expectValidateStoryIndexEntryAction(draftValidationRoute.action)).to.deep.equal({
			kind: "validate_story_index_entry",
			storyIndexWorkflowValueKey: PiPlanningWorkflowValueKey.StoriesIndex,
			storyIdentityWorkflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryIdentity,
			storyFilenameWorkflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryFileName,
			requiredStoryType: "primary",
			requiredStatus: "draft",
			missingOrMalformedIndexErrorMessage:
				"I could not read or parse the selected story index before resolving the target story.",
			missingEntryErrorMessage: "The selected story was not found in the selected story index.",
			invalidEntryErrorMessage: "I could not read or parse the selected story index before resolving the target story.",
		})
		expect(draftValidationRoute.followingBranchId).to.equal("step-1-resolve-draft-target-story")

		const backlogValidationRoute = findRoute(
			"step-1",
			"step-1-route-target-story-status",
			"step-1-validate-backlog-story-index-entry",
		)
		expect(backlogValidationRoute.trigger.kind).to.equal("session_predicate")
		if (backlogValidationRoute.trigger.kind !== "session_predicate") {
			throw new Error(`Expected session_predicate trigger, received ${backlogValidationRoute.trigger.kind}.`)
		}
		expect(
			backlogValidationRoute.trigger.matches(
				createSessionPredicateInput({
					activeBranchId: "step-1-route-target-story-status",
					workflowValues: { ...SAMPLE_WORKFLOW_VALUES, [PiPlanningWorkflowValueKey.SelectedStoryStatus]: "backlog" },
					step: step1,
				}),
			),
		).to.equal(true)
		expect(expectValidateStoryIndexEntryAction(backlogValidationRoute.action)).to.deep.equal({
			kind: "validate_story_index_entry",
			storyIndexWorkflowValueKey: PiPlanningWorkflowValueKey.StoriesIndex,
			storyIdentityWorkflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryIdentity,
			storyFilenameWorkflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryFileName,
			requiredStoryType: "primary",
			requiredStatus: "backlog",
			missingOrMalformedIndexErrorMessage:
				"I could not read or parse the selected story index before resolving the target story.",
			missingEntryErrorMessage: "The selected story was not found in the selected story index.",
			invalidEntryErrorMessage: "I could not read or parse the selected story index before resolving the target story.",
		})
		expect(backlogValidationRoute.followingBranchId).to.equal("step-1-resolve-backlog-target-story")

		const unsupportedStatusRoute = findRoute(
			"step-1",
			"step-1-route-target-story-status",
			"step-1-fail-unsupported-selected-story-status",
		)
		expect(unsupportedStatusRoute.trigger.kind).to.equal("session_predicate")
		if (unsupportedStatusRoute.trigger.kind !== "session_predicate") {
			throw new Error(`Expected session_predicate trigger, received ${unsupportedStatusRoute.trigger.kind}.`)
		}
		expect(
			unsupportedStatusRoute.trigger.matches(
				createSessionPredicateInput({
					activeBranchId: "step-1-route-target-story-status",
					workflowValues: { ...SAMPLE_WORKFLOW_VALUES, [PiPlanningWorkflowValueKey.SelectedStoryStatus]: "review" },
					step: step1,
				}),
			),
		).to.equal(true)
		expect(unsupportedStatusRoute.action).to.deep.equal({
			kind: "terminal_error",
			errorMessage: "The selected story has an unsupported story status.",
		})

		const draftTargetStoryRoute = findRoute(
			"step-1",
			"step-1-resolve-draft-target-story",
			"step-1-resolve-draft-target-story",
		)
		expect(draftTargetStoryRoute.trigger).to.deep.equal({ kind: "always" })
		expect(expectResolveExistingProjectArtifactAction(draftTargetStoryRoute.action)).to.deep.equal({
			kind: "resolve_existing_project_artifact",
			artifactFamily: "story",
			artifactIdentityWorkflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryIdentity,
			projectSubfolderSegments: ["implementation", "drafts"],
			outputWorkflowValueKey: PiPlanningWorkflowValueKey.TargetStory,
			missingArtifactErrorMessage: "The target story path does not exist.",
		})
		expect(draftTargetStoryRoute.followingBranchId).to.equal("step-1-await-target-story-resolution")

		const backlogTargetStoryRoute = findRoute(
			"step-1",
			"step-1-resolve-backlog-target-story",
			"step-1-resolve-backlog-target-story",
		)
		expect(backlogTargetStoryRoute.trigger).to.deep.equal({ kind: "always" })
		expect(expectResolveExistingProjectArtifactAction(backlogTargetStoryRoute.action)).to.deep.equal({
			kind: "resolve_existing_project_artifact",
			artifactFamily: "story",
			artifactIdentityWorkflowValueKey: PiPlanningWorkflowValueKey.SelectedStoryIdentity,
			projectSubfolderSegments: ["implementation", "stories-backlog"],
			outputWorkflowValueKey: PiPlanningWorkflowValueKey.TargetStory,
			missingArtifactErrorMessage: "The target story path does not exist.",
		})
		expect(backlogTargetStoryRoute.followingBranchId).to.equal("step-1-await-target-story-resolution")

		const targetStoryPersistedRoute = findRoute(
			"step-1",
			"step-1-await-target-story-resolution",
			"step-1-transition-to-step-6-after-target-story-resolution",
		)
		expectEventPredicateMatches({
			route: targetStoryPersistedRoute,
			activeBranchId: "step-1-await-target-story-resolution",
			workflowValues: SAMPLE_WORKFLOW_VALUES,
			step: step1,
			triggerEvent: buildWorkflowValuesPersistedEvent([PiPlanningWorkflowValueKey.TargetStory]),
		})
		expect(targetStoryPersistedRoute.action).to.deep.equal({
			kind: "transition_step",
			target: { kind: "entry_branch", stepNumber: 6 },
		})
	})

	it("derives selected epic values and captures whether the story index existed at workflow start", async () => {
		const projectRoot = await mkdtemp(join(tmpdir(), "pi-planning-workflow-"))
		try {
			const planningFolder = join(projectRoot, "planning")
			await mkdir(planningFolder, { recursive: true })
			const epicsIndex = join(planningFolder, "Epics.index.json")
			await writeFile(
				epicsIndex,
				JSON.stringify({
					version: 1,
					epics: [
						{ identity: "1", title: "Existing story index epic", "story-index-generated": true },
						{ identity: "2", title: "New story index epic", "story-index-generated": false },
					],
				}),
			)

			const derivationRoute = findRoute("step-1", "step-1-await-target-epic-panel", "step-1-derive-selected-epic-values")
			expect(derivationRoute.action.kind).to.equal("run_deterministic_procedure")
			if (derivationRoute.action.kind !== "run_deterministic_procedure") {
				throw new Error(`Expected run_deterministic_procedure, received ${derivationRoute.action.kind}.`)
			}

			const existingIndexResult = await derivationRoute.action.instruction.run(
				createSession({
					[PiPlanningWorkflowValueKey.EpicsIndex]: epicsIndex,
					[PiPlanningWorkflowValueKey.EpicIdentity]: "1",
				}),
			)
			expect(existingIndexResult.kind).to.equal("succeeded")
			if (existingIndexResult.kind !== "succeeded") {
				throw new Error(`Expected selected epic derivation to succeed, received ${existingIndexResult.kind}.`)
			}
			expect(existingIndexResult.workflowValueWrites).to.deep.equal({
				[PiPlanningWorkflowValueKey.TargetEpic]: "Epic 1: Existing story index epic",
				[PiPlanningWorkflowValueKey.StoriesIndex]: join(projectRoot, "implementation", "epic-1-stories.index.json"),
				[PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: true,
			})

			const newIndexResult = await derivationRoute.action.instruction.run(
				createSession({
					[PiPlanningWorkflowValueKey.EpicsIndex]: epicsIndex,
					[PiPlanningWorkflowValueKey.EpicIdentity]: "2",
				}),
			)
			expect(newIndexResult.kind).to.equal("succeeded")
			if (newIndexResult.kind !== "succeeded") {
				throw new Error(`Expected selected epic derivation to succeed, received ${newIndexResult.kind}.`)
			}
			expect(newIndexResult.workflowValueWrites).to.deep.equal({
				[PiPlanningWorkflowValueKey.TargetEpic]: "Epic 2: New story index epic",
				[PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: false,
			})
		} finally {
			await rm(projectRoot, { recursive: true, force: true })
		}
	})

	it("derives selected story file metadata for draft and backlog primary stories", async () => {
		const route = findRoute("step-1", "step-1-await-select-story-panel", "step-1-derive-selected-story-values")
		expect(route.action.kind).to.equal("run_deterministic_procedure")
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}

		const fixtureRoot = await mkdtemp(join(tmpdir(), "pi-planning-workflow-"))
		try {
			const implementationDir = join(fixtureRoot, "implementation")
			await mkdir(implementationDir, { recursive: true })
			const storiesIndexPath = join(implementationDir, "epic-1-stories.index.json")
			await writeFile(
				storiesIndexPath,
				JSON.stringify({
					version: 1,
					stories: [
						{
							story_identity: "1.1",
							story_file_name: "Story-1-1.md",
							story_type: "primary",
							parent_story_identity: null,
							story_file_generated: true,
							status: "draft",
						},
						{
							story_identity: "1.2",
							story_file_name: "Story-1-2.md",
							story_type: "primary",
							parent_story_identity: null,
							story_file_generated: true,
							status: "backlog",
						},
					],
				}),
				"utf8",
			)
			const draftResult = await route.action.instruction.run(
				createSession({
					...SAMPLE_WORKFLOW_VALUES,
					[PiPlanningWorkflowValueKey.StoriesIndex]: storiesIndexPath,
					[PiPlanningWorkflowValueKey.SelectedStoryIdentity]: "1.1",
				}),
			)
			const backlogResult = await route.action.instruction.run(
				createSession({
					...SAMPLE_WORKFLOW_VALUES,
					[PiPlanningWorkflowValueKey.StoriesIndex]: storiesIndexPath,
					[PiPlanningWorkflowValueKey.SelectedStoryIdentity]: "1.2",
				}),
			)
			expect(draftResult).to.deep.equal({
				kind: "succeeded",
				workflowValueWrites: {
					[PiPlanningWorkflowValueKey.SelectedStoryFileName]: "Story-1-1.md",
					[PiPlanningWorkflowValueKey.SelectedStoryStatus]: "draft",
				},
			})
			expect(backlogResult).to.deep.equal({
				kind: "succeeded",
				workflowValueWrites: {
					[PiPlanningWorkflowValueKey.SelectedStoryFileName]: "Story-1-2.md",
					[PiPlanningWorkflowValueKey.SelectedStoryStatus]: "backlog",
				},
			})
		} finally {
			await rm(fixtureRoot, { recursive: true, force: true })
		}
	})

	it("fails selected-story derivation when selected_story_identity is missing", async () => {
		const route = findRoute("step-1", "step-1-await-select-story-panel", "step-1-derive-selected-story-values")
		expect(route.action.kind).to.equal("run_deterministic_procedure")
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		const workflowValues: WorkflowValues = {
			...SAMPLE_WORKFLOW_VALUES,
			[PiPlanningWorkflowValueKey.StoriesIndex]: "/tmp/pi-planning-project/implementation/epic-1-stories.index.json",
		}
		delete workflowValues[PiPlanningWorkflowValueKey.SelectedStoryIdentity]
		const result = await route.action.instruction.run(createSession(workflowValues))
		expect(result).to.deep.equal({
			kind: "failed",
			errorMessage: "PI Planning requires a selected story identity before resolving the target story.",
		})
	})

	it("fails selected-story derivation when stories_index is missing", async () => {
		const route = findRoute("step-1", "step-1-await-select-story-panel", "step-1-derive-selected-story-values")
		expect(route.action.kind).to.equal("run_deterministic_procedure")
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		const workflowValues: WorkflowValues = {
			...SAMPLE_WORKFLOW_VALUES,
			[PiPlanningWorkflowValueKey.SelectedStoryIdentity]: "1.1",
		}
		delete workflowValues[PiPlanningWorkflowValueKey.StoriesIndex]
		const result = await route.action.instruction.run(createSession(workflowValues))
		expect(result).to.deep.equal({
			kind: "failed",
			errorMessage: "PI Planning requires a resolved stories_index path before resolving the target story.",
		})
	})

	it("fails selected-story derivation for unreadable or malformed story index JSON", async () => {
		const route = findRoute("step-1", "step-1-await-select-story-panel", "step-1-derive-selected-story-values")
		expect(route.action.kind).to.equal("run_deterministic_procedure")
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		const fixtureRoot = await mkdtemp(join(tmpdir(), "pi-planning-workflow-"))
		try {
			const implementationDir = join(fixtureRoot, "implementation")
			await mkdir(implementationDir, { recursive: true })
			const storiesIndexPath = join(implementationDir, "epic-1-stories.index.json")
			await writeFile(storiesIndexPath, "{ invalid json", "utf8")
			const result = await route.action.instruction.run(
				createSession({
					...SAMPLE_WORKFLOW_VALUES,
					[PiPlanningWorkflowValueKey.StoriesIndex]: storiesIndexPath,
					[PiPlanningWorkflowValueKey.SelectedStoryIdentity]: "1.1",
				}),
			)
			expect(result).to.deep.equal({
				kind: "failed",
				errorMessage: "I could not read or parse the selected story index before resolving the target story.",
			})
		} finally {
			await rm(fixtureRoot, { recursive: true, force: true })
		}
	})

	it("fails selected-story derivation when the selected story identity is absent from the index", async () => {
		const route = findRoute("step-1", "step-1-await-select-story-panel", "step-1-derive-selected-story-values")
		expect(route.action.kind).to.equal("run_deterministic_procedure")
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		const fixtureRoot = await mkdtemp(join(tmpdir(), "pi-planning-workflow-"))
		try {
			const implementationDir = join(fixtureRoot, "implementation")
			await mkdir(implementationDir, { recursive: true })
			const storiesIndexPath = join(implementationDir, "epic-1-stories.index.json")
			await writeFile(
				storiesIndexPath,
				JSON.stringify({
					version: 1,
					stories: [
						{
							story_identity: "1.9",
							story_file_name: "Story-1-9.md",
							story_type: "primary",
							parent_story_identity: null,
							story_file_generated: true,
							status: "draft",
						},
					],
				}),
				"utf8",
			)
			const result = await route.action.instruction.run(
				createSession({
					...SAMPLE_WORKFLOW_VALUES,
					[PiPlanningWorkflowValueKey.StoriesIndex]: storiesIndexPath,
					[PiPlanningWorkflowValueKey.SelectedStoryIdentity]: "1.1",
				}),
			)
			expect(result).to.deep.equal({
				kind: "failed",
				errorMessage: "The selected story was not found in the selected story index.",
			})
		} finally {
			await rm(fixtureRoot, { recursive: true, force: true })
		}
	})

	it("fails selected-story derivation for unsupported selected story entries", async () => {
		const route = findRoute("step-1", "step-1-await-select-story-panel", "step-1-derive-selected-story-values")
		expect(route.action.kind).to.equal("run_deterministic_procedure")
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		const unsupportedCases = [
			{ story_type: "primary", status: "review" },
			{ story_type: "primary", status: "complete" },
			{ story_type: "remediation", status: "draft" },
		]
		for (const caseValue of unsupportedCases) {
			const fixtureRoot = await mkdtemp(join(tmpdir(), "pi-planning-workflow-"))
			try {
				const implementationDir = join(fixtureRoot, "implementation")
				await mkdir(implementationDir, { recursive: true })
				const storiesIndexPath = join(implementationDir, "epic-1-stories.index.json")
				await writeFile(
					storiesIndexPath,
					JSON.stringify({
						version: 1,
						stories: [
							{
								story_identity: "1.1",
								story_file_name: "Story-1-1.md",
								story_type: caseValue.story_type,
								parent_story_identity: null,
								story_file_generated: true,
								status: caseValue.status,
							},
						],
					}),
					"utf8",
				)
				const result = await route.action.instruction.run(
					createSession({
						...SAMPLE_WORKFLOW_VALUES,
						[PiPlanningWorkflowValueKey.StoriesIndex]: storiesIndexPath,
						[PiPlanningWorkflowValueKey.SelectedStoryIdentity]: "1.1",
					}),
				)
				expect(result).to.deep.equal({
					kind: "failed",
					errorMessage: "The selected story has an unsupported story status.",
				})
			} finally {
				await rm(fixtureRoot, { recursive: true, force: true })
			}
		}
	})

	it("fails selected-story derivation when story_file_name is missing", async () => {
		const route = findRoute("step-1", "step-1-await-select-story-panel", "step-1-derive-selected-story-values")
		expect(route.action.kind).to.equal("run_deterministic_procedure")
		if (route.action.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${route.action.kind}.`)
		}
		const fixtureRoot = await mkdtemp(join(tmpdir(), "pi-planning-workflow-"))
		try {
			const implementationDir = join(fixtureRoot, "implementation")
			await mkdir(implementationDir, { recursive: true })
			const storiesIndexPath = join(implementationDir, "epic-1-stories.index.json")
			await writeFile(
				storiesIndexPath,
				JSON.stringify({
					version: 1,
					stories: [
						{
							story_identity: "1.1",
							story_type: "primary",
							parent_story_identity: null,
							story_file_generated: true,
							status: "draft",
						},
					],
				}),
				"utf8",
			)
			const result = await route.action.instruction.run(
				createSession({
					...SAMPLE_WORKFLOW_VALUES,
					[PiPlanningWorkflowValueKey.StoriesIndex]: storiesIndexPath,
					[PiPlanningWorkflowValueKey.SelectedStoryIdentity]: "1.1",
				}),
			)
			expect(result).to.deep.equal({
				kind: "failed",
				errorMessage: "I could not read or parse the selected story index before resolving the target story.",
			})
		} finally {
			await rm(fixtureRoot, { recursive: true, force: true })
		}
	})

	it("renders Step 2 through Step 5 prompts with required workflow value references and no backend-only tools", () => {
		const promptExpectations: ReadonlyArray<{
			stepId: WorkflowStepDefinition["id"]
			requiredSnippets: readonly string[]
		}> = [
			{
				stepId: "step-2",
				requiredSnippets: [
					"Your goal in this workflow is to break a single epic down into deliverable user stories.",
					"Epic 1: Improve workflow runtime",
					"*** Primary Context: ***",
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.EpicsIndex].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.EpicsDocument].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.ArchitectureDocument].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.BrainstormingDocument].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.AdditionalContext].toString(),
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-3",
				requiredSnippets: [
					"Review the existing story files for this epic in",
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.DraftsFolder].toString(),
					"Review provided context and existing runtime code/ tests to determine the full set of stories needed",
					"Split a story if:",
					"Stories should not be created that are only file edits, test updates, cleanup chores, or technical layers",
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-4",
				requiredSnippets: [
					"This system uses a story index as the canonical indicator of which stories must exist for each epic.",
					"Epic 1: Improve workflow runtime",
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.StoriesIndex].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.EpicIdentity].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.ImplementationFolder].toString(),
					"Review the existing story index, then call plan_story_artifacts",
					"The story index file can be found in",
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-5",
				requiredSnippets: [
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.StoriesIndex].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.EpicIdentity].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.DraftsFolder].toString(),
					"Call generate_story_files to generate one templatized story for each story in",
					"Generated story files can be found in",
				],
			},
		]

		for (const promptExpectation of promptExpectations) {
			const prompt = buildPrompt(promptExpectation.stepId, SAMPLE_WORKFLOW_VALUES)
			for (const requiredSnippet of promptExpectation.requiredSnippets) {
				expect(prompt).to.include(requiredSnippet)
			}
			for (const forbiddenToolName of FORBIDDEN_BACKEND_ONLY_TOOL_NAMES) {
				expect(prompt).not.to.include(forbiddenToolName)
			}
			expectNoPiPlanningWorkflowPromptTokens(prompt)
			if (promptExpectation.stepId === "step-2") {
				expect(prompt).to.include("*** Primary Context: ***")
				expect(prompt).to.include("*** Secondary Context ***")
				expect(prompt).not.to.include("Additional Context:")
				expect(prompt).not.to.include("not provided")
			}
		}
	})

	it("renders Step 2 optional context sections only when backing values are present", () => {
		const brainstormingOnlyPrompt = buildPrompt("step-2", {
			...SAMPLE_WORKFLOW_VALUES,
			[PiPlanningWorkflowValueKey.AdditionalContext]: "",
		})
		const additionalContextOnlyPrompt = buildPrompt("step-2", {
			...SAMPLE_WORKFLOW_VALUES,
			[PiPlanningWorkflowValueKey.BrainstormingDocument]: "",
		})
		const noOptionalContextPrompt = buildPrompt("step-2", {
			...SAMPLE_WORKFLOW_VALUES,
			[PiPlanningWorkflowValueKey.BrainstormingDocument]: "",
			[PiPlanningWorkflowValueKey.AdditionalContext]: "",
		})

		expect(brainstormingOnlyPrompt).to.include(
			SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.BrainstormingDocument].toString(),
		)
		expect(brainstormingOnlyPrompt).not.to.include(
			SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.AdditionalContext].toString(),
		)
		expect(brainstormingOnlyPrompt).to.include("*** Secondary Context ***")
		expect(brainstormingOnlyPrompt).not.to.include("Additional Context:")
		expect(additionalContextOnlyPrompt).to.include(
			SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.AdditionalContext].toString(),
		)
		expect(additionalContextOnlyPrompt).not.to.include(
			SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.BrainstormingDocument].toString(),
		)
		expect(additionalContextOnlyPrompt).to.include("*** Secondary Context ***")
		expect(additionalContextOnlyPrompt).not.to.include("Additional Context:")
		expect(noOptionalContextPrompt).not.to.include(
			SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.BrainstormingDocument].toString(),
		)
		expect(noOptionalContextPrompt).not.to.include(
			SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.AdditionalContext].toString(),
		)
		expect(noOptionalContextPrompt).not.to.include("*** Secondary Context ***")
		expect(noOptionalContextPrompt).not.to.include("Additional Context:")
		for (const prompt of [brainstormingOnlyPrompt, additionalContextOnlyPrompt, noOptionalContextPrompt]) {
			expect(prompt).not.to.include("not provided")
			expectNoPiPlanningWorkflowPromptTokens(prompt)
		}
	})

	it("renders the exact Step 6 initial-buildout prompt", () => {
		const approvedInitialBuildoutPrompt = `Populate the generated story files in drafts_folder to set implementation sequence and story-specific details.

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

Once every story file in drafts_folder contains the required information, send an update to the user informing them that you've updated the epic's stories with initial story details. Ask the user to review and provide feedback. Continue refining the stories as needed based on user feedback.

Once the user is fully aligned with the story set and each story's content, use attempt_completion to provide a final workflow recap to the user, and remind them to run create_story for each generated story to generate story tasks before implementation.`
		const expectedPrompt = approvedInitialBuildoutPrompt.replaceAll(
			"drafts_folder",
			SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.DraftsFolder].toString(),
		)
		const prompt = buildPrompt("step-6", SAMPLE_WORKFLOW_VALUES)

		expect(prompt).to.equal(expectedPrompt)
		expect(prompt).to.include(SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.DraftsFolder].toString())
		expectNoPiPlanningWorkflowPromptTokens(prompt)
		expect(prompt).not.to.include("drafts_folder")
		expect(prompt).not.to.include("target_story")
		expect(prompt).not.to.include("feedback gathered during story validation")
	})

	it("renders the Step 6 edit-existing-story prompt with target story values", () => {
		const prompt = buildPrompt("step-6", {
			...SAMPLE_WORKFLOW_VALUES,
			[PiPlanningWorkflowValueKey.EditIntent]: "edit existing story file",
		})

		expect(prompt).to.include(SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.ProjectTitle].toString())
		expect(prompt).to.include(SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.ProjectFolderName].toString())
		expect(prompt).to.include(SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.ArchitectureDocument].toString())
		expect(prompt).to.include(SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.EpicsDocument].toString())
		expect(prompt).to.include(SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.TargetStory].toString())
		expectNoPiPlanningWorkflowPromptTokens(prompt)
		expect(prompt).to.include("Scope")
		expect(prompt).to.include("Scope Boundary")
		expect(prompt).to.include("Requirements")
		expect(prompt).to.include("Objective")
		expect(prompt).to.include("Known Issues/ Risks/ Technical Debt")
		expect(prompt).not.to.include("drafts_folder")
		expect(prompt).not.to.include("plan_story_artifacts")
		expect(prompt).not.to.include("generate_story_files")
		expect(prompt).not.to.include("create_story")
		expect(prompt).not.to.include("projectTitle")
		expect(prompt).not.to.include("projectFolderName")
		expect(prompt).not.to.include("architecture_document")
		expect(prompt).not.to.include("epics_document")
		expect(prompt).not.to.include("target_story")
	})

	it("uses stories_index_existed_at_workflow_start for Step 3 through Step 5 existing-index prompt branches", () => {
		const existingIndexValues: WorkflowValues = {
			...SAMPLE_WORKFLOW_VALUES,
			[PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: true,
		}
		const storyIndexPresentButCreatedDuringWorkflowValues: WorkflowValues = {
			...SAMPLE_WORKFLOW_VALUES,
			[PiPlanningWorkflowValueKey.StoriesIndex]: `${PROJECT_ROOT}/implementation/epic-1-stories.index.json`,
			[PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: false,
		}

		const step3ExistingPrompt = buildPrompt("step-3", existingIndexValues)
		expect(step3ExistingPrompt).to.include(
			`Review the existing story files for this epic in ${SAMPLE_WORKFLOW_VALUES[
				PiPlanningWorkflowValueKey.DraftsFolder
			].toString()}.`,
		)
		const step3NewPrompt = buildPrompt("step-3", storyIndexPresentButCreatedDuringWorkflowValues)
		expect(step3NewPrompt).not.to.include("Review the existing story files for this epic in")

		const step4ExistingPrompt = buildPrompt("step-4", existingIndexValues)
		expect(step4ExistingPrompt).to.include(
			`Story Index: ${SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.StoriesIndex].toString()}`,
		)
		expect(step4ExistingPrompt).to.include("Review the existing story index, then call plan_story_artifacts")
		const step4NewPrompt = buildPrompt("step-4", storyIndexPresentButCreatedDuringWorkflowValues)
		expect(step4NewPrompt).to.include("Generate the story index by calling plan_story_artifacts")
		expect(step4NewPrompt).not.to.include("Review the existing story index, then call plan_story_artifacts")

		const step5ExistingPrompt = buildPrompt("step-5", existingIndexValues)
		expect(step5ExistingPrompt).to.include(
			`Call generate_story_files to generate one templatized story for each story in ${SAMPLE_WORKFLOW_VALUES[
				PiPlanningWorkflowValueKey.StoriesIndex
			].toString()} for which a story file does not already exist.`,
		)
		const step5NewPrompt = buildPrompt("step-5", storyIndexPresentButCreatedDuringWorkflowValues)
		expect(step5NewPrompt).to.include("Call generate_story_files to generate one templatized story file for each story in")
		expect(step5NewPrompt).to.include(`${PROJECT_ROOT}/implementation/epic-1-stories.index.json`)
		expect(step5NewPrompt).not.to.include("for which a story file does not already exist")
	})

	it("routes Step 2 and Step 3 only through confirmed or denied workflow progress requests", () => {
		const progressionCases: ReadonlyArray<{
			stepId: WorkflowStepDefinition["id"]
			awaitBranchId: string
			confirmedRouteId: string
			deniedRouteId: string
			nextStepNumber: number
		}> = [
			{
				stepId: "step-2",
				awaitBranchId: "step-2-await-progress-request",
				confirmedRouteId: "step-2-transition-to-step-3",
				deniedRouteId: "step-2-return-to-project-prompt",
				nextStepNumber: 3,
			},
			{
				stepId: "step-3",
				awaitBranchId: "step-3-await-progress-request",
				confirmedRouteId: "step-3-transition-to-step-4",
				deniedRouteId: "step-3-return-to-project-prompt",
				nextStepNumber: 4,
			},
		]

		for (const progressionCase of progressionCases) {
			const branch = getStep(progressionCase.stepId).decisionTree.branches[progressionCase.awaitBranchId]
			expect(branch?.routes.map((route) => route.id)).to.deep.equal([
				progressionCase.confirmedRouteId,
				progressionCase.deniedRouteId,
			])

			const confirmedRoute = findRoute(
				progressionCase.stepId,
				progressionCase.awaitBranchId,
				progressionCase.confirmedRouteId,
			)
			expect(confirmedRoute.trigger).to.deep.equal({
				kind: "on_event",
				eventKind: "workflow_progress_request_confirmed",
			})
			expectTransitionStepAction(confirmedRoute.action, progressionCase.nextStepNumber)

			const deniedRoute = findRoute(progressionCase.stepId, progressionCase.awaitBranchId, progressionCase.deniedRouteId)
			expect(deniedRoute.trigger).to.deep.equal({
				kind: "on_event",
				eventKind: "workflow_progress_request_denied",
			})
			expect(deniedRoute.action).to.deep.equal({
				kind: "project_prompt",
			})
		}
	})

	it("routes Step 4 through guarded story-index availability, progress decisions, and plan_story_artifacts failure recovery", () => {
		const step4 = getStep("step-4")
		const branch = step4.decisionTree.branches["step-4-await-story-index"]
		expect(branch?.routes.map((route) => route.id)).to.deep.equal([
			"step-4-return-to-project-prompt",
			"step-4-transition-to-step-5-after-progress-confirmed",
			"step-4-transition-to-step-5-after-stories-index-persisted",
			"step-4-transition-to-step-5-after-existing-stories-index-reentry",
			"step-4-return-to-project-prompt-after-plan-story-artifacts-failed",
		])

		const deniedRoute = findRoute("step-4", "step-4-await-story-index", "step-4-return-to-project-prompt")
		expect(deniedRoute.trigger).to.deep.equal({
			kind: "on_event",
			eventKind: "workflow_progress_request_denied",
		})
		expect(deniedRoute.action).to.deep.equal({
			kind: "project_prompt",
		})

		const confirmedRoute = findRoute(
			"step-4",
			"step-4-await-story-index",
			"step-4-transition-to-step-5-after-progress-confirmed",
		)
		expect(confirmedRoute.trigger).to.deep.equal({
			kind: "on_event",
			eventKind: "workflow_progress_request_confirmed",
		})
		expectTransitionStepAction(confirmedRoute.action, 5)

		const persistedRoute = findRoute(
			"step-4",
			"step-4-await-story-index",
			"step-4-transition-to-step-5-after-stories-index-persisted",
		)
		expectEventPredicateMatches({
			route: persistedRoute,
			activeBranchId: "step-4-await-story-index",
			workflowValues: {
				[PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: false,
			},
			step: step4,
			triggerEvent: buildWorkflowValuesPersistedEvent([PiPlanningWorkflowValueKey.StoriesIndex]),
		})
		expectEventPredicateDoesNotMatch({
			route: persistedRoute,
			activeBranchId: "step-4-await-story-index",
			workflowValues: {
				[PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: true,
			},
			step: step4,
			triggerEvent: buildWorkflowValuesPersistedEvent([PiPlanningWorkflowValueKey.StoriesIndex]),
		})
		expectTransitionStepAction(persistedRoute.action, 5)

		const existingReentryRoute = findRoute(
			"step-4",
			"step-4-await-story-index",
			"step-4-transition-to-step-5-after-existing-stories-index-reentry",
		)
		expectEventPredicateMatches({
			route: existingReentryRoute,
			activeBranchId: "step-4-await-story-index",
			workflowValues: {
				[PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: true,
			},
			step: step4,
			triggerEvent: buildModelToolSucceededEvent(ClineDefaultTool.PLAN_STORY_ARTIFACTS),
		})
		expectEventPredicateDoesNotMatch({
			route: existingReentryRoute,
			activeBranchId: "step-4-await-story-index",
			workflowValues: {
				[PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart]: false,
			},
			step: step4,
			triggerEvent: buildModelToolSucceededEvent(ClineDefaultTool.PLAN_STORY_ARTIFACTS),
		})
		expectTransitionStepAction(existingReentryRoute.action, 5)

		const failedRoute = findRoute(
			"step-4",
			"step-4-await-story-index",
			"step-4-return-to-project-prompt-after-plan-story-artifacts-failed",
		)
		expectEventPredicateMatches({
			route: failedRoute,
			activeBranchId: "step-4-await-story-index",
			workflowValues: {},
			step: step4,
			triggerEvent: buildModelToolFailedEvent(ClineDefaultTool.PLAN_STORY_ARTIFACTS),
		})
		expect(failedRoute.action).to.deep.equal({
			kind: "project_prompt",
		})
	})

	it("routes Step 5 only through generate_story_files success or failure", () => {
		const step5 = getStep("step-5")
		const branch = step5.decisionTree.branches["step-5-await-generated-story-files"]
		expect(branch?.routes.map((route) => route.id)).to.deep.equal([
			"step-5-transition-to-step-6",
			"step-5-return-to-project-prompt-after-generate-story-files-failed",
		])

		const successRoute = findRoute("step-5", "step-5-await-generated-story-files", "step-5-transition-to-step-6")
		expectEventPredicateMatches({
			route: successRoute,
			activeBranchId: "step-5-await-generated-story-files",
			workflowValues: {},
			step: step5,
			triggerEvent: buildModelToolSucceededEvent(ClineDefaultTool.GENERATE_STORY_FILES),
		})
		expectEventPredicateDoesNotMatch({
			route: successRoute,
			activeBranchId: "step-5-await-generated-story-files",
			workflowValues: {},
			step: step5,
			triggerEvent: buildModelToolSucceededEvent(ClineDefaultTool.PLAN_STORY_ARTIFACTS),
		})
		expectTransitionStepAction(successRoute.action, 6)

		const failureRoute = findRoute(
			"step-5",
			"step-5-await-generated-story-files",
			"step-5-return-to-project-prompt-after-generate-story-files-failed",
		)
		expectEventPredicateMatches({
			route: failureRoute,
			activeBranchId: "step-5-await-generated-story-files",
			workflowValues: {},
			step: step5,
			triggerEvent: buildModelToolFailedEvent(ClineDefaultTool.GENERATE_STORY_FILES),
		})
		expect(failureRoute.action).to.deep.equal({
			kind: "project_prompt",
		})
	})

	it("routes Step 6 attempt_completion_succeeded to workflow completion", () => {
		const completionRoute = findRoute(
			"step-6",
			"step-6-await-attempt-completion",
			"step-6-complete-workflow-after-attempt-completion",
		)

		expect(completionRoute.trigger).to.deep.equal({
			kind: "on_event",
			eventKind: "attempt_completion_succeeded",
		})
		expect(completionRoute.action).to.deep.equal({
			kind: "complete_workflow",
		})
	})
})
