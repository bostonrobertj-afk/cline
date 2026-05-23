import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import type {
	WorkflowFormDefinitionPayload,
	WorkflowFormFieldDefinition,
	WorkflowFormPanelAction,
	WorkflowFormPanelDefinition,
} from "@shared/ExtensionMessage"
import { expect } from "chai"
import { describe, it } from "mocha"
import type {
	ActiveWorkflowSession,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionAction,
	WorkflowDecisionBranchRoute,
	WorkflowDeterministicProcedureResult,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowValues,
} from "../../../types"
import {
	resolveWorkflowBySlashCommand,
	resolveWorkflowByUseSkillName,
	resolveWorkflowDefinition,
} from "../../../WorkflowRegistry"
import { renderWorkflowPromptTemplate } from "../../../workflowPromptTemplates"
import {
	CREATE_STORY_ARCHITECTURE_PREREQUISITE_ID,
	CREATE_STORY_BRAINSTORMING_PREREQUISITE_ID,
	CREATE_STORY_ENTRY_PROJECT_VALUE_KEYS,
	CREATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID,
	CREATE_STORY_EPICS_INDEX_PREREQUISITE_ID,
	CREATE_STORY_PANEL_A_EPIC_SELECTION_ID,
	CREATE_STORY_PANEL_B_STORY_SELECTION_ID,
	CREATE_STORY_PANEL_C_MISSING_STORY_INDEX_ID,
	CREATE_STORY_PANEL_D_MISSING_STORY_FILE_ID,
	CREATE_STORY_PANEL_E_STORY_READY_FOR_IMPLEMENTATION_ID,
	CREATE_STORY_PANEL_F_RUN_DEV_STORY_WORKFLOW_ID,
	CREATE_STORY_PANEL_G_STORY_ALREADY_IMPLEMENTED_ID,
	CREATE_STORY_STEP_1_FORM_ID,
	CREATE_STORY_WORKFLOW_DESCRIPTION,
	CREATE_STORY_WORKFLOW_PERSONA,
	CREATE_STORY_WORKFLOW_VALUE_KEYS,
	CreateStoryWorkflowValueKey,
	createStoryWorkflowDefinition,
} from ".."

interface ProjectPaths {
	root: string
	epicsIndex: string
	storiesIndex: string
}

interface ProgressionRouteExpectation {
	stepId: WorkflowStepDefinition["id"]
	projectPromptBranchId: string
	projectPromptRouteId: string
	awaitBranchId: string
	confirmedRouteId: string
	deniedRouteId: string
	nextStepNumber: number
}

function createSession(workflowValues: WorkflowValues, projectRoot = "/tmp/create-story-project"): ActiveWorkflowSession {
	return {
		activeStepNumber: 1,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: basename(projectRoot),
			projectFolderName: basename(projectRoot),
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
			activeBranchId: "step-1-resolve-prerequisites",
		},
	}
}

function getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition {
	return createStoryWorkflowDefinition.steps[stepId]
}

function findRoute(branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const route = getStep("step-1").decisionTree.branches[branchId]?.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Missing route ${branchId}/${routeId}.`)
	}

	return route
}

function findStepRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const route = getStep(stepId).decisionTree.branches[branchId]?.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Missing route ${stepId}/${branchId}/${routeId}.`)
	}

	return route
}

function getWorkflowForm(workflowFormId: string): WorkflowFormDefinitionPayload {
	const form = createStoryWorkflowDefinition.workflowForms?.[workflowFormId]
	if (form === undefined) {
		throw new Error(`Missing workflow form ${workflowFormId}.`)
	}

	return form
}

function getPanel(form: WorkflowFormDefinitionPayload, panelId: string): WorkflowFormPanelDefinition {
	const panel = form.panels[panelId]
	if (panel === undefined) {
		throw new Error(`Missing panel ${panelId}.`)
	}

	return panel
}

function getSingleField(panel: WorkflowFormPanelDefinition): WorkflowFormFieldDefinition {
	const field = panel.fields[0]
	if (field === undefined) {
		throw new Error(`Missing field for panel ${panel.panelId}.`)
	}

	return field
}

function createPromptInput(): WorkflowPromptBuilderInput {
	const step = getStep("step-1")
	return {
		session: createSession({}),
		step,
	}
}

function createPromptInputForStep(
	stepId: WorkflowStepDefinition["id"],
	workflowValues: WorkflowValues,
): WorkflowPromptBuilderInput {
	const step = getStep(stepId)
	return {
		session: createSession(workflowValues),
		step,
	}
}

function getPromptInstructions(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): string {
	const promptSource = getStep(stepId).buildPromptSource(createPromptInputForStep(stepId, workflowValues))
	if (promptSource.kind !== "current_step_instruction_template") {
		throw new Error(`Missing current step instruction template for ${stepId}.`)
	}

	const template = promptSource.currentStepInstructionTemplate
	return renderWorkflowPromptTemplate({
		template,
		workflowValueKeys: createStoryWorkflowDefinition.workflowValueKeys,
		workflowValues,
		context: `create-story ${stepId} test prompt`,
	})
}

function expectNoCreateStoryWorkflowPromptTokens(prompt: string): void {
	const promptTokens: readonly string[] = [
		"{workflow.target_story}",
		"{workflow.architecture_document}",
		"{workflow.epics_document}",
		"{workflow.parent_story}",
		"{workflow.findings_document}",
	]
	for (const promptToken of promptTokens) {
		expect(prompt).not.to.include(promptToken)
	}
}

function getToolNamesForStep(stepId: WorkflowStepDefinition["id"]): string[] {
	return getStep(stepId)
		.buildToolSchema(createPromptInputForStep(stepId, {}))
		.map((schema) => schema.name)
}

function buildWorkflowFormPanelSubmittedEvent(args: {
	panelId: string
	action?: WorkflowFormPanelAction
	submittedValueKeys?: readonly string[]
	clearedValueKeys?: readonly string[]
}): WorkflowBranchTriggerEvent {
	return {
		kind: "workflow_form_panel_submitted",
		workflowFormId: CREATE_STORY_STEP_1_FORM_ID,
		panelId: args.panelId,
		action: args.action ?? "submit",
		submittedValueKeys: args.submittedValueKeys ?? [],
		clearedValueKeys: args.clearedValueKeys ?? [],
	}
}

function buildToolBackedOperationSucceededEvent(branchId: string, routeId: string): WorkflowBranchTriggerEvent {
	return {
		kind: "tool_backed_operation_succeeded",
		sourceRoute: {
			branchId,
			routeId,
		},
	}
}

function buildToolBackedOperationFailedEvent(branchId: string, routeId: string): WorkflowBranchTriggerEvent {
	return {
		kind: "tool_backed_operation_failed",
		sourceRoute: {
			branchId,
			routeId,
		},
	}
}

function expectEventPredicateMatches(args: {
	route: WorkflowDecisionBranchRoute
	workflowValues: WorkflowValues
	triggerEvent: WorkflowBranchTriggerEvent
}): void {
	if (args.route.trigger.kind !== "event_predicate") {
		throw new Error(`Expected event_predicate trigger, received ${args.route.trigger.kind}.`)
	}

	expect(
		args.route.trigger.matches({
			activeBranchId: "test-branch",
			workflowValues: args.workflowValues,
			step: getStep("step-1"),
			triggerEvent: args.triggerEvent,
		}),
	).to.equal(true)
}

function expectEventPredicateMatchesForStep(args: {
	stepId: WorkflowStepDefinition["id"]
	route: WorkflowDecisionBranchRoute
	workflowValues: WorkflowValues
	triggerEvent: WorkflowBranchTriggerEvent
}): void {
	if (args.route.trigger.kind !== "event_predicate") {
		throw new Error(`Expected event_predicate trigger, received ${args.route.trigger.kind}.`)
	}

	expect(
		args.route.trigger.matches({
			activeBranchId: "test-branch",
			workflowValues: args.workflowValues,
			step: getStep(args.stepId),
			triggerEvent: args.triggerEvent,
		}),
	).to.equal(true)
}

function expectSessionPredicateMatches(args: { route: WorkflowDecisionBranchRoute; workflowValues: WorkflowValues }): void {
	if (args.route.trigger.kind !== "session_predicate") {
		throw new Error(`Expected session_predicate trigger, received ${args.route.trigger.kind}.`)
	}

	expect(
		args.route.trigger.matches({
			activeBranchId: "test-branch",
			workflowValues: args.workflowValues,
			step: getStep("step-1"),
		}),
	).to.equal(true)
}

function expectRunDeterministicProcedureAction(
	action: WorkflowDecisionAction,
): Extract<WorkflowDecisionAction, { kind: "run_deterministic_procedure" }> {
	if (action.kind !== "run_deterministic_procedure") {
		throw new Error(`Expected run_deterministic_procedure, received ${action.kind}.`)
	}

	return action
}

function expectRenderWorkflowFormAction(
	action: WorkflowDecisionAction,
): Extract<WorkflowDecisionAction, { kind: "render_workflow_form" }> {
	if (action.kind !== "render_workflow_form") {
		throw new Error(`Expected render_workflow_form, received ${action.kind}.`)
	}

	return action
}

function expectContinueWorkflowFormAction(
	action: WorkflowDecisionAction,
): Extract<WorkflowDecisionAction, { kind: "continue_workflow_form" }> {
	if (action.kind !== "continue_workflow_form") {
		throw new Error(`Expected continue_workflow_form, received ${action.kind}.`)
	}

	return action
}

function expectTransitionStepAction(action: WorkflowDecisionAction, stepNumber: number): void {
	if (action.kind !== "transition_step") {
		throw new Error(`Expected transition_step, received ${action.kind}.`)
	}

	expect(action.target).to.deep.equal({
		kind: "entry_branch",
		stepNumber,
	})
}

async function runDeterministicRoute(args: {
	branchId: string
	routeId: string
	session: ActiveWorkflowSession
}): Promise<WorkflowDeterministicProcedureResult> {
	const route = findRoute(args.branchId, args.routeId)
	const action = expectRunDeterministicProcedureAction(route.action)
	return action.instruction.run(args.session)
}

function expectSucceededResult(result: WorkflowDeterministicProcedureResult): WorkflowValues {
	if (result.kind !== "succeeded") {
		throw new Error(`Expected deterministic procedure success, received ${result.errorMessage}.`)
	}

	return result.workflowValueWrites ?? {}
}

function buildStoryIndexJson(stories: readonly Record<string, unknown>[]): string {
	return `${JSON.stringify(
		{
			version: 1,
			stories,
		},
		undefined,
		2,
	)}\n`
}

function createWorkflowValuesForSelectedStory(args: { status: string; storyFileGenerated: boolean }): WorkflowValues {
	return {
		[CreateStoryWorkflowValueKey.SelectedStoryFileName]: "Story-1-1.md",
		[CreateStoryWorkflowValueKey.SelectedStoryType]: "primary",
		[CreateStoryWorkflowValueKey.SelectedStoryStatus]: args.status,
		[CreateStoryWorkflowValueKey.SelectedStoryFileGenerated]: args.storyFileGenerated,
	}
}

function expectRuntimeRoutedTransition(panel: WorkflowFormPanelDefinition): void {
	expect(panel.transition).to.deep.equal({
		type: "runtime_routed",
	})
}

function expectContinueStep1Panel(action: WorkflowDecisionAction, panelId: string): void {
	const continueAction = expectContinueWorkflowFormAction(action)
	expect(continueAction.workflowFormId).to.equal(CREATE_STORY_STEP_1_FORM_ID)
	expect(continueAction.panelId).to.equal(panelId)

	const replacement = continueAction.buildReplacement(createSession({}))
	if (replacement instanceof Promise) {
		throw new Error("Expected synchronous create-story Step 1 continuation replacement.")
	}
	expect(replacement.panel.panelId).to.equal(panelId)
	expect(replacement.data).to.deep.equal({})
}

async function createProjectWithStoryIndex(args?: {
	storyIndexContent?: string
	includeStoriesIndex?: boolean
	storyIndexGenerated?: boolean
}): Promise<ProjectPaths> {
	const root = await mkdtemp(join(tmpdir(), "create-story-workflow-"))
	await mkdir(join(root, "planning"), { recursive: true })
	await mkdir(join(root, "implementation"), { recursive: true })
	const epicsIndex = join(root, "planning", "Epics.index.json")
	const storiesIndex = join(root, "implementation", "epic-1-stories.index.json")
	await writeFile(
		epicsIndex,
		`${JSON.stringify(
			{
				version: 1,
				epics: [
					{
						identity: "1",
						title: "Runtime workflow module",
						"story-index-generated": args?.storyIndexGenerated ?? true,
					},
				],
			},
			undefined,
			2,
		)}\n`,
	)
	if (args?.includeStoriesIndex !== false) {
		await writeFile(
			storiesIndex,
			args?.storyIndexContent ??
				buildStoryIndexJson([
					{
						story_identity: "1.1",
						story_file_name: "Story-1-1.md",
						story_type: "primary",
						parent_story_identity: null,
						story_file_generated: true,
						status: "draft",
					},
				]),
		)
	}

	return {
		root,
		epicsIndex,
		storiesIndex,
	}
}

describe("createStoryWorkflowDefinition", () => {
	it("defines create-story identity, metadata, and persona", () => {
		expect(createStoryWorkflowDefinition).to.include({
			name: "create-story",
			displayName: "Create Story",
			description: CREATE_STORY_WORKFLOW_DESCRIPTION,
			slashCommandName: "create-story",
			useSkillName: "create-story",
			projectSubfolder: "planning",
		})
		expect(createStoryWorkflowDefinition.entryPanel.promptMarkdown).to.equal(CREATE_STORY_WORKFLOW_DESCRIPTION)
		expect(createStoryWorkflowDefinition.persona).to.deep.equal(CREATE_STORY_WORKFLOW_PERSONA)
		expect(createStoryWorkflowDefinition.persona).to.deep.include({
			name: "Bob",
			role: "Scrum Master",
			communicationStyle: "Crisp, checklist-driven, and ambiguity-free.",
		})
		expect(createStoryWorkflowDefinition.persona.capabilities).to.include("Story validation")
		expect(createStoryWorkflowDefinition.persona.capabilities).to.include("story task and subtask authoring")
		expect(createStoryWorkflowDefinition.persona.principles.join("\n")).to.contain("trace seams end-to-end")
	})

	it("resolves through registry identities without a markdown alias", () => {
		expect(resolveWorkflowDefinition("create-story")).to.equal(createStoryWorkflowDefinition)
		expect(resolveWorkflowBySlashCommand("create-story")).to.equal(createStoryWorkflowDefinition)
		expect(resolveWorkflowByUseSkillName("create-story")).to.equal(createStoryWorkflowDefinition)
		expect(resolveWorkflowDefinition("create-story.md")).to.equal(undefined)
		expect(resolveWorkflowBySlashCommand("create-story.md")).to.equal(undefined)
		expect(resolveWorkflowByUseSkillName("create-story.md")).to.equal(undefined)
	})

	it("declares the complete workflow value inventory and no AI-writable value surface", () => {
		expect(createStoryWorkflowDefinition.workflowValueKeys).to.deep.equal(CREATE_STORY_WORKFLOW_VALUE_KEYS)
		expect(createStoryWorkflowDefinition.workflowValueKeys).to.have.members(Object.values(CreateStoryWorkflowValueKey))
		expect(Reflect.has(createStoryWorkflowDefinition, "aiWritableWorkflowValueKeys")).to.equal(false)
		expect(Reflect.has(createStoryWorkflowDefinition, "workflowWritableValueKeys")).to.equal(false)
		expect(getStep("step-1").buildToolSchema(createPromptInput())).to.deep.equal([])
	})

	it("declares entry project keys and no workflow artifacts", () => {
		expect(createStoryWorkflowDefinition.entryProjectValueKeys).to.deep.equal(CREATE_STORY_ENTRY_PROJECT_VALUE_KEYS)
		expect(createStoryWorkflowDefinition.entryProjectValueKeys).to.deep.equal({
			projectMode: CreateStoryWorkflowValueKey.ProjectMode,
			projectTitle: CreateStoryWorkflowValueKey.ProjectTitle,
			projectFolderName: CreateStoryWorkflowValueKey.ProjectFolderName,
		})
		expect(createStoryWorkflowDefinition.artifacts).to.equal(undefined)
		expect(Object.keys(createStoryWorkflowDefinition.steps)).to.deep.equal(["step-1", "step-2", "step-3", "step-4"])
		expect(getStep("step-1")).to.deep.include({
			id: "step-1",
			stepNumber: 1,
			checklistLabel: "Gather Inputs",
		})
		expect(getStep("step-2")).to.deep.include({
			id: "step-2",
			stepNumber: 2,
			checklistLabel: "Review Context & Ensure Project Alignment",
		})
		expect(getStep("step-3")).to.deep.include({
			id: "step-3",
			stepNumber: 3,
			checklistLabel: "Author Tasks & Subtasks",
		})
		expect(getStep("step-4")).to.deep.include({
			id: "step-4",
			stepNumber: 4,
			checklistLabel: "Finalize & Validate Story Document",
		})
	})

	it("declares required and optional prerequisite files with exact filename matching", () => {
		expect(createStoryWorkflowDefinition.prerequisiteFiles).to.deep.equal({
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
		})
	})
})

describe("createStoryWorkflowDefinition Step 1", () => {
	it("defines one same-session workflow form containing Panels A-G", () => {
		const workflowForms = createStoryWorkflowDefinition.workflowForms ?? {}
		const form = getWorkflowForm(CREATE_STORY_STEP_1_FORM_ID)

		expect(Object.keys(workflowForms)).to.deep.equal([CREATE_STORY_STEP_1_FORM_ID])
		expect(form.firstPanelId).to.equal(CREATE_STORY_PANEL_A_EPIC_SELECTION_ID)
		expect(Object.keys(form.panels)).to.deep.equal([
			CREATE_STORY_PANEL_A_EPIC_SELECTION_ID,
			CREATE_STORY_PANEL_B_STORY_SELECTION_ID,
			CREATE_STORY_PANEL_C_MISSING_STORY_INDEX_ID,
			CREATE_STORY_PANEL_D_MISSING_STORY_FILE_ID,
			CREATE_STORY_PANEL_E_STORY_READY_FOR_IMPLEMENTATION_ID,
			CREATE_STORY_PANEL_F_RUN_DEV_STORY_WORKFLOW_ID,
			CREATE_STORY_PANEL_G_STORY_ALREADY_IMPLEMENTED_ID,
		])
	})

	it("configures Panel A epic selection with required JSON options and reset keys", () => {
		const form = getWorkflowForm(CREATE_STORY_STEP_1_FORM_ID)
		const panel = getPanel(form, CREATE_STORY_PANEL_A_EPIC_SELECTION_ID)
		const field = getSingleField(panel)

		expect(panel.title).to.equal("Epic Selection")
		expect(panel.promptMarkdown).to.equal("Which epic are we focusing on during this workflow?")
		expect(panel.allowedActions).to.deep.equal(["submit"])
		expect(panel.actionLabels).to.deep.equal({
			submit: "Continue",
		})
		expect(field).to.deep.include({
			key: CreateStoryWorkflowValueKey.EpicIdentity,
			workflowValueKey: CreateStoryWorkflowValueKey.EpicIdentity,
			kind: "dropdown",
			label: "Target Epic",
			required: true,
			allowedValueType: "string",
		})
		expect(field.resetValueKeysOnChange).to.deep.equal([
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
		])
		expect(field.jsonOptionsSource).to.deep.equal({
			root: {
				kind: "selected_project_root",
			},
			sourcePathSegments: ["planning", "Epics.index.json"],
			itemsPath: "epics",
			valueProperty: "identity",
			labelTemplate: "Epic {identity}: {title}",
		})
		expect(field.jsonOptionsSource?.descriptionTemplate).to.equal(undefined)
		expectRuntimeRoutedTransition(panel)
	})

	it("configures Panel B story selection with required JSON options and reset keys", () => {
		const form = getWorkflowForm(CREATE_STORY_STEP_1_FORM_ID)
		const panel = getPanel(form, CREATE_STORY_PANEL_B_STORY_SELECTION_ID)
		const field = getSingleField(panel)

		expect(panel.title).to.equal("Story Selection")
		expect(panel.promptMarkdown).to.equal("Which story should I focus on during this workflow?")
		expect(panel.allowedActions).to.deep.equal(["submit"])
		expect(panel.actionLabels).to.deep.equal({
			submit: "Continue",
		})
		expect(field).to.deep.include({
			key: CreateStoryWorkflowValueKey.SelectedStoryIdentity,
			workflowValueKey: CreateStoryWorkflowValueKey.SelectedStoryIdentity,
			kind: "dropdown",
			label: "Target Story",
			required: true,
			allowedValueType: "string",
		})
		expect(field.resetValueKeysOnChange).to.deep.equal([
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
		])
		expect(field.jsonOptionsSource).to.deep.equal({
			root: {
				kind: "selected_project_root",
			},
			sourcePathSegments: ["implementation", "epic-{workflow.epic_identity}-stories.index.json"],
			itemsPath: "stories",
			valueProperty: "story_identity",
			labelTemplate: "Story {story_identity}",
		})
		expect(field.jsonOptionsSource?.descriptionTemplate).to.equal(undefined)
		expectRuntimeRoutedTransition(panel)
	})

	it("configures Panels C-G with required actions, back destinations, and no extra fields", () => {
		const form = getWorkflowForm(CREATE_STORY_STEP_1_FORM_ID)
		const panelC = getPanel(form, CREATE_STORY_PANEL_C_MISSING_STORY_INDEX_ID)
		const panelD = getPanel(form, CREATE_STORY_PANEL_D_MISSING_STORY_FILE_ID)
		const panelE = getPanel(form, CREATE_STORY_PANEL_E_STORY_READY_FOR_IMPLEMENTATION_ID)
		const panelF = getPanel(form, CREATE_STORY_PANEL_F_RUN_DEV_STORY_WORKFLOW_ID)
		const panelG = getPanel(form, CREATE_STORY_PANEL_G_STORY_ALREADY_IMPLEMENTED_ID)

		expect(panelC.title).to.equal("Missing Story Index for Selected Epic")
		expect(panelC.promptMarkdown).to.include("selected epic does not yet have a story index")
		expect(panelC.fields).to.deep.equal([])
		expect(panelC.allowedActions).to.deep.equal(["submit", "back"])
		expect(panelC.actionLabels).to.deep.equal({ submit: "End Workflow", back: "Select Another Epic" })
		expect(panelC.backDestinationPanelId).to.equal(CREATE_STORY_PANEL_A_EPIC_SELECTION_ID)

		expect(panelD.title).to.equal("Missing Story File")
		expect(panelD.promptMarkdown).to.include("PI-planning workflow")
		expect(panelD.fields).to.deep.equal([])
		expect(panelD.allowedActions).to.deep.equal(["submit", "back"])
		expect(panelD.actionLabels).to.deep.equal({ submit: "End workflow", back: "Select Another Story" })
		expect(panelD.backDestinationPanelId).to.equal(CREATE_STORY_PANEL_B_STORY_SELECTION_ID)

		expect(panelE.title).to.equal("Story Ready for Implementation")
		expect(panelE.promptMarkdown).to.equal("The selected story appears to be ready for implementation.")
		expect(panelE.allowedActions).to.deep.equal(["submit", "back"])
		expect(panelE.actionLabels).to.deep.equal({ submit: "Continue", back: "Select Another Story" })
		expect(panelE.backDestinationPanelId).to.equal(CREATE_STORY_PANEL_B_STORY_SELECTION_ID)
		expect(getSingleField(panelE)).to.deep.include({
			key: CreateStoryWorkflowValueKey.ReviseBacklogStory,
			workflowValueKey: CreateStoryWorkflowValueKey.ReviseBacklogStory,
			kind: "boolean",
			label: "Would you like to revise this story's existing tasks?",
			required: true,
			allowedValueType: "boolean",
			trueLabel: "Yes",
			falseLabel: "No",
		})

		expect(panelF.title).to.equal("Run Dev-Story Workflow")
		expect(panelF.promptMarkdown).to.include("run the dev-story workflow")
		expect(panelF.fields).to.deep.equal([])
		expect(panelF.allowedActions).to.deep.equal(["submit", "back"])
		expect(panelF.actionLabels).to.deep.equal({ submit: "End Workflow", back: "Select Another Story" })
		expect(panelF.backDestinationPanelId).to.equal(CREATE_STORY_PANEL_B_STORY_SELECTION_ID)

		expect(panelG.title).to.equal("Story Already Implemented")
		expect(panelG.promptMarkdown).to.include("This story has already been implemented")
		expect(panelG.fields).to.deep.equal([])
		expect(panelG.allowedActions).to.deep.equal(["submit", "back"])
		expect(panelG.actionLabels).to.deep.equal({ submit: "End Workflow", back: "Select Another Story" })
		expect(panelG.backDestinationPanelId).to.equal(CREATE_STORY_PANEL_B_STORY_SELECTION_ID)

		for (const panel of [panelC, panelD, panelE, panelF, panelG]) {
			expectRuntimeRoutedTransition(panel)
		}
	})

	it("does not add unauthorized Step 1 UI fields or option descriptions", () => {
		const form = getWorkflowForm(CREATE_STORY_STEP_1_FORM_ID)
		const panels = Object.values(form.panels)

		for (const panel of panels) {
			for (const field of panel.fields) {
				expect(field.kind).to.not.equal("static_notice")
				expect(field.helpText).to.equal(undefined)
				expect(field.contentMarkdown).to.equal(undefined)
				expect(field.jsonOptionsSource?.descriptionTemplate).to.equal(undefined)
			}
		}

		expect(getPanel(form, CREATE_STORY_PANEL_A_EPIC_SELECTION_ID).fields.map((field) => field.key)).to.deep.equal([
			CreateStoryWorkflowValueKey.EpicIdentity,
		])
		expect(getPanel(form, CREATE_STORY_PANEL_B_STORY_SELECTION_ID).fields.map((field) => field.key)).to.deep.equal([
			CreateStoryWorkflowValueKey.SelectedStoryIdentity,
		])
		expect(
			getPanel(form, CREATE_STORY_PANEL_E_STORY_READY_FOR_IMPLEMENTATION_ID).fields.map((field) => field.key),
		).to.deep.equal([CreateStoryWorkflowValueKey.ReviseBacklogStory])
	})

	it("renders Panel A through render_workflow_form", () => {
		const route = findRoute("step-1-render-workflow-form", "step-1-render-workflow-form")
		const action = expectRenderWorkflowFormAction(route.action)

		expect(route.trigger).to.deep.equal({ kind: "always" })
		expect(action.workflowFormId).to.equal(CREATE_STORY_STEP_1_FORM_ID)
		expect("startPanelId" in action).to.equal(false)
	})

	it("derives selected epic values and continues to Panel B when the canonical story index flag is true", async () => {
		const project = await createProjectWithStoryIndex()
		try {
			const deriveRoute = findRoute("step-1-await-epic-selection-panel", "step-1-derive-selected-epic-values")
			expectEventPredicateMatches({
				route: deriveRoute,
				workflowValues: {},
				triggerEvent: buildWorkflowFormPanelSubmittedEvent({
					panelId: CREATE_STORY_PANEL_A_EPIC_SELECTION_ID,
					submittedValueKeys: [CreateStoryWorkflowValueKey.EpicIdentity],
				}),
			})

			const derivationResult = await runDeterministicRoute({
				branchId: "step-1-await-epic-selection-panel",
				routeId: "step-1-derive-selected-epic-values",
				session: createSession(
					{
						[CreateStoryWorkflowValueKey.EpicsIndex]: project.epicsIndex,
						[CreateStoryWorkflowValueKey.EpicIdentity]: "1",
					},
					project.root,
				),
			})
			expect(expectSucceededResult(derivationResult)).to.deep.equal({
				[CreateStoryWorkflowValueKey.TargetEpic]: "Epic 1: Runtime workflow module",
				[CreateStoryWorkflowValueKey.StoriesIndex]: project.storiesIndex,
			})

			const renderStorySelectionRoute = findRoute(
				"step-1-route-after-epic-selection",
				"step-1-continue-to-story-selection-panel",
			)
			expectSessionPredicateMatches({
				route: renderStorySelectionRoute,
				workflowValues: {
					[CreateStoryWorkflowValueKey.TargetEpic]: "Epic 1: Runtime workflow module",
					[CreateStoryWorkflowValueKey.StoriesIndex]: project.storiesIndex,
				},
			})
			expectContinueStep1Panel(renderStorySelectionRoute.action, CREATE_STORY_PANEL_B_STORY_SELECTION_ID)
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("continues to Panel C when the canonical story index flag is false", async () => {
		const project = await createProjectWithStoryIndex({ includeStoriesIndex: false, storyIndexGenerated: false })
		try {
			const derivationResult = await runDeterministicRoute({
				branchId: "step-1-await-epic-selection-panel",
				routeId: "step-1-derive-selected-epic-values",
				session: createSession(
					{
						[CreateStoryWorkflowValueKey.EpicsIndex]: project.epicsIndex,
						[CreateStoryWorkflowValueKey.EpicIdentity]: "1",
					},
					project.root,
				),
			})
			expect(expectSucceededResult(derivationResult)).to.deep.equal({
				[CreateStoryWorkflowValueKey.TargetEpic]: "Epic 1: Runtime workflow module",
			})

			const missingStoryIndexRoute = findRoute(
				"step-1-route-after-epic-selection",
				"step-1-continue-to-missing-story-index-panel",
			)
			expectSessionPredicateMatches({
				route: missingStoryIndexRoute,
				workflowValues: {
					[CreateStoryWorkflowValueKey.TargetEpic]: "Epic 1: Runtime workflow module",
				},
			})
			expectContinueStep1Panel(missingStoryIndexRoute.action, CREATE_STORY_PANEL_C_MISSING_STORY_INDEX_ID)
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("runs selected-story derivation after Panel B completion", async () => {
		const project = await createProjectWithStoryIndex({
			storyIndexContent: buildStoryIndexJson([
				{
					story_identity: "1.2",
					story_file_name: "Story-1-2.md",
					story_type: "primary",
					parent_story_identity: null,
					story_file_generated: true,
					status: "backlog",
				},
			]),
		})
		try {
			const route = findRoute("step-1-await-story-selection-panel", "step-1-derive-selected-story-values")
			expectEventPredicateMatches({
				route,
				workflowValues: {
					[CreateStoryWorkflowValueKey.SelectedStoryIdentity]: "1.2",
				},
				triggerEvent: buildWorkflowFormPanelSubmittedEvent({
					panelId: CREATE_STORY_PANEL_B_STORY_SELECTION_ID,
					submittedValueKeys: [CreateStoryWorkflowValueKey.SelectedStoryIdentity],
				}),
			})

			const result = await runDeterministicRoute({
				branchId: "step-1-await-story-selection-panel",
				routeId: "step-1-derive-selected-story-values",
				session: createSession(
					{
						[CreateStoryWorkflowValueKey.StoriesIndex]: project.storiesIndex,
						[CreateStoryWorkflowValueKey.SelectedStoryIdentity]: "1.2",
					},
					project.root,
				),
			})
			expect(expectSucceededResult(result)).to.deep.equal({
				[CreateStoryWorkflowValueKey.SelectedStoryFileName]: "Story-1-2.md",
				[CreateStoryWorkflowValueKey.SelectedStoryType]: "primary",
				[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "backlog",
				[CreateStoryWorkflowValueKey.SelectedStoryFileGenerated]: true,
			})
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("routes Panel B submission to Panel D when the selected story file is missing", () => {
		const route = findRoute("step-1-route-after-story-selection", "step-1-continue-to-missing-story-file-panel")
		expectSessionPredicateMatches({
			route,
			workflowValues: createWorkflowValuesForSelectedStory({
				status: "draft",
				storyFileGenerated: false,
			}),
		})
		expectContinueStep1Panel(route.action, CREATE_STORY_PANEL_D_MISSING_STORY_FILE_ID)
	})

	it("routes Panel B submission by selected story status", () => {
		const draftRoute = findRoute("step-1-route-after-story-selection", "step-1-derive-draft-target-story")
		expectSessionPredicateMatches({
			route: draftRoute,
			workflowValues: createWorkflowValuesForSelectedStory({
				status: "draft",
				storyFileGenerated: true,
			}),
		})
		expectRunDeterministicProcedureAction(draftRoute.action)

		const backlogRoute = findRoute("step-1-route-after-story-selection", "step-1-continue-to-story-ready-panel")
		expectSessionPredicateMatches({
			route: backlogRoute,
			workflowValues: createWorkflowValuesForSelectedStory({
				status: "backlog",
				storyFileGenerated: true,
			}),
		})
		expectContinueStep1Panel(backlogRoute.action, CREATE_STORY_PANEL_E_STORY_READY_FOR_IMPLEMENTATION_ID)

		const implementedRoute = findRoute(
			"step-1-route-after-story-selection",
			"step-1-continue-to-story-already-implemented-panel",
		)
		for (const status of ["review", "complete"]) {
			expectSessionPredicateMatches({
				route: implementedRoute,
				workflowValues: createWorkflowValuesForSelectedStory({
					status,
					storyFileGenerated: true,
				}),
			})
		}
		expectContinueStep1Panel(implementedRoute.action, CREATE_STORY_PANEL_G_STORY_ALREADY_IMPLEMENTED_ID)
	})

	it("derives target story paths and transitions actionable stories to Step 2", async () => {
		const project = await createProjectWithStoryIndex()
		try {
			const result = await runDeterministicRoute({
				branchId: "step-1-route-after-story-selection",
				routeId: "step-1-derive-draft-target-story",
				session: createSession(
					{
						[CreateStoryWorkflowValueKey.EpicsIndex]: project.epicsIndex,
						[CreateStoryWorkflowValueKey.StoriesIndex]: project.storiesIndex,
						[CreateStoryWorkflowValueKey.SelectedStoryIdentity]: "1.1",
					},
					project.root,
				),
			})
			expect(expectSucceededResult(result)).to.deep.equal({
				[CreateStoryWorkflowValueKey.TargetStory]: join(project.root, "implementation", "drafts", "Story-1-1.md"),
				[CreateStoryWorkflowValueKey.TargetStoryFilenameForMove]: "Story-1-1.md",
			})

			const transitionRoute = findRoute("step-1-await-target-story-values", "step-1-transition-to-step-2")
			expectSessionPredicateMatches({
				route: transitionRoute,
				workflowValues: {
					[CreateStoryWorkflowValueKey.TargetStory]: join(project.root, "implementation", "drafts", "Story-1-1.md"),
				},
			})
			expectTransitionStepAction(transitionRoute.action, 2)
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("derives remediation parent story and findings document paths for remediation stories", async () => {
		const project = await createProjectWithStoryIndex({
			storyIndexContent: buildStoryIndexJson([
				{
					story_identity: "1.1",
					story_file_name: "Story-1-1.md",
					story_type: "primary",
					parent_story_identity: null,
					story_file_generated: true,
					status: "complete",
				},
				{
					story_identity: "1.1.1",
					story_file_name: "Remediation-story-1-1-1.md",
					story_type: "remediation",
					parent_story_identity: "1.1",
					story_file_generated: true,
					status: "draft",
				},
			]),
		})
		try {
			const parentStory = join(project.root, "implementation", "stories-complete", "Story-1-1.md")
			const findingsDocument = join(project.root, "review", "code-review-1-1.md")
			await mkdir(join(project.root, "implementation", "stories-complete"), { recursive: true })
			await mkdir(join(project.root, "review"), { recursive: true })
			await writeFile(parentStory, "# Parent story\n")
			await writeFile(findingsDocument, "# Findings\n")

			const result = await runDeterministicRoute({
				branchId: "step-1-route-after-story-selection",
				routeId: "step-1-derive-draft-target-story",
				session: createSession(
					{
						[CreateStoryWorkflowValueKey.EpicsIndex]: project.epicsIndex,
						[CreateStoryWorkflowValueKey.StoriesIndex]: project.storiesIndex,
						[CreateStoryWorkflowValueKey.SelectedStoryIdentity]: "1.1.1",
					},
					project.root,
				),
			})
			expect(expectSucceededResult(result)).to.deep.equal({
				[CreateStoryWorkflowValueKey.TargetStory]: join(
					project.root,
					"implementation",
					"drafts",
					"Remediation-story-1-1-1.md",
				),
				[CreateStoryWorkflowValueKey.TargetStoryFilenameForMove]: "Remediation-story-1-1-1.md",
				[CreateStoryWorkflowValueKey.ParentStoryIdentity]: "1.1",
				[CreateStoryWorkflowValueKey.ParentStory]: parentStory,
				[CreateStoryWorkflowValueKey.FindingsDocument]: findingsDocument,
			})
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("routes Panel E yes/no answers to Step 2 derivation or Panel F continuation", () => {
		const yesRoute = findRoute("step-1-await-story-ready-panel", "step-1-derive-backlog-target-story-after-revision-approved")
		expectEventPredicateMatches({
			route: yesRoute,
			workflowValues: {
				[CreateStoryWorkflowValueKey.ReviseBacklogStory]: true,
			},
			triggerEvent: buildWorkflowFormPanelSubmittedEvent({
				panelId: CREATE_STORY_PANEL_E_STORY_READY_FOR_IMPLEMENTATION_ID,
				submittedValueKeys: [CreateStoryWorkflowValueKey.ReviseBacklogStory],
			}),
		})
		expectRunDeterministicProcedureAction(yesRoute.action)

		const noRoute = findRoute("step-1-await-story-ready-panel", "step-1-continue-to-run-dev-story-panel")
		expectEventPredicateMatches({
			route: noRoute,
			workflowValues: {
				[CreateStoryWorkflowValueKey.ReviseBacklogStory]: false,
			},
			triggerEvent: buildWorkflowFormPanelSubmittedEvent({
				panelId: CREATE_STORY_PANEL_E_STORY_READY_FOR_IMPLEMENTATION_ID,
				submittedValueKeys: [CreateStoryWorkflowValueKey.ReviseBacklogStory],
			}),
		})
		expectContinueStep1Panel(noRoute.action, CREATE_STORY_PANEL_F_RUN_DEV_STORY_WORKFLOW_ID)
	})

	it("routes terminal Panel C, D, F, and G submit events to workflow completion", () => {
		const completionCases: readonly { routeId: string; panelId: string }[] = [
			{
				routeId: "step-1-complete-workflow-after-missing-story-index",
				panelId: CREATE_STORY_PANEL_C_MISSING_STORY_INDEX_ID,
			},
			{
				routeId: "step-1-complete-workflow-after-missing-story-file",
				panelId: CREATE_STORY_PANEL_D_MISSING_STORY_FILE_ID,
			},
			{
				routeId: "step-1-complete-workflow-after-run-dev-story-panel",
				panelId: CREATE_STORY_PANEL_F_RUN_DEV_STORY_WORKFLOW_ID,
			},
			{
				routeId: "step-1-complete-workflow-after-story-already-implemented",
				panelId: CREATE_STORY_PANEL_G_STORY_ALREADY_IMPLEMENTED_ID,
			},
		]

		for (const completionCase of completionCases) {
			const route = findRoute("step-1-await-terminal-panels", completionCase.routeId)
			expectEventPredicateMatches({
				route,
				workflowValues: {},
				triggerEvent: buildWorkflowFormPanelSubmittedEvent({
					panelId: completionCase.panelId,
				}),
			})
			expect(route.action.kind).to.equal("complete_workflow")
		}
	})
})

describe("createStoryWorkflowDefinition Step 2", () => {
	it("builds a non-empty primary draft context-review prompt", () => {
		const prompt = getPromptInstructions("step-2", {
			[CreateStoryWorkflowValueKey.TargetStory]: "/tmp/create-story-project/implementation/drafts/Story-1-1.md",
			[CreateStoryWorkflowValueKey.ArchitectureDocument]: "/tmp/create-story-project/planning/architecture.md",
			[CreateStoryWorkflowValueKey.EpicsDocument]: "/tmp/create-story-project/planning/Epics.md",
			[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "draft",
			[CreateStoryWorkflowValueKey.SelectedStoryType]: "primary",
		})

		expect(prompt).to.be.a("string").and.not.empty
		expect(prompt).to.include("/tmp/create-story-project/implementation/drafts/Story-1-1.md")
		expect(prompt).to.include("/tmp/create-story-project/planning/architecture.md")
		expect(prompt).to.include("/tmp/create-story-project/planning/Epics.md")
		expectNoCreateStoryWorkflowPromptTokens(prompt)
	})

	it("builds a non-empty remediation draft context-review prompt", () => {
		const prompt = getPromptInstructions("step-2", {
			[CreateStoryWorkflowValueKey.TargetStory]:
				"/tmp/create-story-project/implementation/drafts/Remediation-story-1-1-1.md",
			[CreateStoryWorkflowValueKey.ArchitectureDocument]: "/tmp/create-story-project/planning/architecture.md",
			[CreateStoryWorkflowValueKey.EpicsDocument]: "/tmp/create-story-project/planning/Epics.md",
			[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "draft",
			[CreateStoryWorkflowValueKey.SelectedStoryType]: "remediation",
			[CreateStoryWorkflowValueKey.ParentStory]: "/tmp/create-story-project/implementation/stories-complete/Story-1-1.md",
			[CreateStoryWorkflowValueKey.FindingsDocument]: "/tmp/create-story-project/review/code-review-1-1.md",
		})

		expect(prompt).to.be.a("string").and.not.empty
		expect(prompt).to.include("/tmp/create-story-project/implementation/drafts/Remediation-story-1-1-1.md")
		expect(prompt).to.include("/tmp/create-story-project/planning/architecture.md")
		expect(prompt).to.include("/tmp/create-story-project/planning/Epics.md")
		expect(prompt).to.include("/tmp/create-story-project/implementation/stories-complete/Story-1-1.md")
		expect(prompt).to.include("/tmp/create-story-project/review/code-review-1-1.md")
		expectNoCreateStoryWorkflowPromptTokens(prompt)
	})

	it("builds a non-empty backlog revision context-review prompt", () => {
		const prompt = getPromptInstructions("step-2", {
			[CreateStoryWorkflowValueKey.TargetStory]: "/tmp/create-story-project/implementation/stories-backlog/Story-1-2.md",
			[CreateStoryWorkflowValueKey.ArchitectureDocument]: "/tmp/create-story-project/planning/architecture.md",
			[CreateStoryWorkflowValueKey.EpicsDocument]: "/tmp/create-story-project/planning/Epics.md",
			[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "backlog",
			[CreateStoryWorkflowValueKey.SelectedStoryType]: "primary",
			[CreateStoryWorkflowValueKey.ReviseBacklogStory]: true,
		})

		expect(prompt).to.be.a("string").and.not.empty
		expect(prompt).to.include("/tmp/create-story-project/implementation/stories-backlog/Story-1-2.md")
		expect(prompt).to.include("/tmp/create-story-project/planning/architecture.md")
		expect(prompt).to.include("/tmp/create-story-project/planning/Epics.md")
		expectNoCreateStoryWorkflowPromptTokens(prompt)
	})

	it("fails clearly for unsupported Step 2 prompt state", () => {
		expect(() =>
			getPromptInstructions("step-2", {
				[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "backlog",
				[CreateStoryWorkflowValueKey.SelectedStoryType]: "primary",
				[CreateStoryWorkflowValueKey.ReviseBacklogStory]: false,
			}),
		).to.throw("Create Story Step 2 prompt does not support")
	})
})

describe("createStoryWorkflowDefinition Step 3", () => {
	it("builds a non-empty draft task/subtask authoring prompt", () => {
		const prompt = getPromptInstructions("step-3", {
			[CreateStoryWorkflowValueKey.TargetStory]: "/tmp/create-story-project/implementation/drafts/Story-1-1.md",
			[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "draft",
		})

		expect(prompt).to.be.a("string").and.not.empty
		expectNoCreateStoryWorkflowPromptTokens(prompt)
	})

	it("builds a non-empty backlog revision task/subtask authoring prompt", () => {
		const prompt = getPromptInstructions("step-3", {
			[CreateStoryWorkflowValueKey.TargetStory]: "/tmp/create-story-project/implementation/stories-backlog/Story-1-2.md",
			[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "backlog",
		})

		expect(prompt).to.be.a("string").and.not.empty
		expectNoCreateStoryWorkflowPromptTokens(prompt)
	})

	it("fails clearly for unsupported Step 3 prompt state", () => {
		expect(() =>
			getPromptInstructions("step-3", {
				[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "review",
			}),
		).to.throw("Create Story Step 3 prompt does not support")
	})
})

describe("createStoryWorkflowDefinition Step 2 and Step 3 progression", () => {
	it("exposes workflow_progress_request only in progress-request steps", () => {
		expect(getToolNamesForStep("step-1")).not.to.include("workflow_progress_request")
		expect(getToolNamesForStep("step-2")).to.include("workflow_progress_request")
		expect(getToolNamesForStep("step-3")).to.include("workflow_progress_request")
		expect(getToolNamesForStep("step-4")).not.to.include("workflow_progress_request")
	})

	it("routes progress confirmation forward and denial back to the project prompt", () => {
		const progressionCases: readonly ProgressionRouteExpectation[] = [
			{
				stepId: "step-2",
				projectPromptBranchId: "step-2-project-prompt",
				projectPromptRouteId: "step-2-project-prompt",
				awaitBranchId: "step-2-await-progress-request",
				confirmedRouteId: "step-2-transition-to-step-3",
				deniedRouteId: "step-2-return-to-project-prompt",
				nextStepNumber: 3,
			},
			{
				stepId: "step-3",
				projectPromptBranchId: "step-3-project-prompt",
				projectPromptRouteId: "step-3-project-prompt",
				awaitBranchId: "step-3-await-progress-request",
				confirmedRouteId: "step-3-transition-to-step-4",
				deniedRouteId: "step-3-return-to-project-prompt",
				nextStepNumber: 4,
			},
		]

		for (const progressionCase of progressionCases) {
			const projectPromptRoute = findStepRoute(
				progressionCase.stepId,
				progressionCase.projectPromptBranchId,
				progressionCase.projectPromptRouteId,
			)
			expect(projectPromptRoute.trigger).to.deep.equal({ kind: "always" })
			expect(projectPromptRoute.action).to.deep.equal({
				kind: "project_prompt",
			})
			expect(projectPromptRoute.followingBranchId).to.equal(progressionCase.awaitBranchId)

			const confirmedRoute = findStepRoute(
				progressionCase.stepId,
				progressionCase.awaitBranchId,
				progressionCase.confirmedRouteId,
			)
			expect(confirmedRoute.trigger).to.deep.equal({
				kind: "on_event",
				eventKind: "workflow_progress_request_confirmed",
			})
			expectTransitionStepAction(confirmedRoute.action, progressionCase.nextStepNumber)

			const deniedRoute = findStepRoute(
				progressionCase.stepId,
				progressionCase.awaitBranchId,
				progressionCase.deniedRouteId,
			)
			expect(deniedRoute.trigger).to.deep.equal({
				kind: "on_event",
				eventKind: "workflow_progress_request_denied",
			})
			expect(deniedRoute.action).to.deep.equal({
				kind: "project_prompt",
			})
		}
	})
})

describe("createStoryWorkflowDefinition Step 4", () => {
	it("builds a non-empty final validation prompt", () => {
		const prompt = getPromptInstructions("step-4", {
			[CreateStoryWorkflowValueKey.TargetStory]: "/tmp/create-story-project/implementation/drafts/Story-1-1.md",
		})

		expect(prompt).to.be.a("string").and.not.empty
		expectNoCreateStoryWorkflowPromptTokens(prompt)
	})

	it("exposes attempt_completion only in Step 4", () => {
		expect(getToolNamesForStep("step-1")).not.to.include("attempt_completion")
		expect(getToolNamesForStep("step-2")).not.to.include("attempt_completion")
		expect(getToolNamesForStep("step-3")).not.to.include("attempt_completion")

		const step4ToolNames = getToolNamesForStep("step-4")
		expect(step4ToolNames).to.deep.equal([
			"read_file",
			"read_file_range",
			"apply_patch",
			"send_user_message",
			"ask_followup_question",
			"attempt_completion",
		])
		expect(step4ToolNames).not.to.include("workflow_progress_request")
		expect(step4ToolNames).not.to.include("move_workflow_project_file")
		expect(step4ToolNames).not.to.include("update_story_index_status")
	})

	it("routes draft finalization through status update, file move, completion, and terminal errors", () => {
		const projectPromptRoute = findStepRoute("step-4", "step-4-project-prompt", "step-4-project-prompt")
		expect(projectPromptRoute.trigger).to.deep.equal({ kind: "always" })
		expect(projectPromptRoute.action).to.deep.equal({
			kind: "project_prompt",
		})
		expect(projectPromptRoute.followingBranchId).to.equal("step-4-await-attempt-completion")

		const statusUpdateRoute = findStepRoute(
			"step-4",
			"step-4-await-attempt-completion",
			"step-4-update-draft-story-status-to-backlog",
		)
		expectEventPredicateMatchesForStep({
			stepId: "step-4",
			route: statusUpdateRoute,
			workflowValues: {
				[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "draft",
			},
			triggerEvent: {
				kind: "attempt_completion_succeeded",
			},
		})
		expect(statusUpdateRoute.action).to.deep.equal({
			kind: "update_story_index_status",
			storyIndexWorkflowValueKey: CreateStoryWorkflowValueKey.StoriesIndex,
			storyIdentityWorkflowValueKey: CreateStoryWorkflowValueKey.SelectedStoryIdentity,
			status: "backlog",
			expectedCurrentStatus: "draft",
		})
		expect(statusUpdateRoute.followingBranchId).to.equal("step-4-await-draft-status-update")

		const moveRoute = findStepRoute("step-4", "step-4-await-draft-status-update", "step-4-move-draft-story-to-backlog")
		expectEventPredicateMatchesForStep({
			stepId: "step-4",
			route: moveRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-4-await-attempt-completion",
				"step-4-update-draft-story-status-to-backlog",
			),
		})
		expect(moveRoute.action).to.deep.equal({
			kind: "move_project_file",
			sourceFolderSegments: ["implementation", "drafts"],
			destinationFolderSegments: ["implementation", "stories-backlog"],
			filenameWorkflowValueKey: CreateStoryWorkflowValueKey.TargetStoryFilenameForMove,
		})
		expect(moveRoute.followingBranchId).to.equal("step-4-await-draft-story-move")

		const statusFailureRoute = findStepRoute(
			"step-4",
			"step-4-await-draft-status-update",
			"step-4-terminal-error-after-draft-status-update",
		)
		expectEventPredicateMatchesForStep({
			stepId: "step-4",
			route: statusFailureRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationFailedEvent(
				"step-4-await-attempt-completion",
				"step-4-update-draft-story-status-to-backlog",
			),
		})
		expect(statusFailureRoute.action.kind).to.equal("terminal_error")

		const completionRoute = findStepRoute(
			"step-4",
			"step-4-await-draft-story-move",
			"step-4-complete-workflow-after-draft-story-move",
		)
		expectEventPredicateMatchesForStep({
			stepId: "step-4",
			route: completionRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-4-await-draft-status-update",
				"step-4-move-draft-story-to-backlog",
			),
		})
		expect(completionRoute.action).to.deep.equal({
			kind: "complete_workflow",
		})

		const moveFailureRoute = findStepRoute(
			"step-4",
			"step-4-await-draft-story-move",
			"step-4-terminal-error-after-draft-story-move",
		)
		expectEventPredicateMatchesForStep({
			stepId: "step-4",
			route: moveFailureRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationFailedEvent(
				"step-4-await-draft-status-update",
				"step-4-move-draft-story-to-backlog",
			),
		})
		expect(moveFailureRoute.action.kind).to.equal("terminal_error")
	})

	it("routes backlog revision finalization through status confirmation without file movement", () => {
		const statusConfirmationRoute = findStepRoute(
			"step-4",
			"step-4-await-attempt-completion",
			"step-4-confirm-backlog-story-status",
		)
		expectEventPredicateMatchesForStep({
			stepId: "step-4",
			route: statusConfirmationRoute,
			workflowValues: {
				[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "backlog",
				[CreateStoryWorkflowValueKey.ReviseBacklogStory]: true,
			},
			triggerEvent: {
				kind: "attempt_completion_succeeded",
			},
		})
		expect(statusConfirmationRoute.action).to.deep.equal({
			kind: "update_story_index_status",
			storyIndexWorkflowValueKey: CreateStoryWorkflowValueKey.StoriesIndex,
			storyIdentityWorkflowValueKey: CreateStoryWorkflowValueKey.SelectedStoryIdentity,
			status: "backlog",
			expectedCurrentStatus: "backlog",
		})
		expect(statusConfirmationRoute.followingBranchId).to.equal("step-4-await-backlog-status-update")

		const backlogStatusBranch = getStep("step-4").decisionTree.branches["step-4-await-backlog-status-update"]
		if (backlogStatusBranch === undefined) {
			throw new Error("Missing backlog status update branch.")
		}
		expect(backlogStatusBranch.routes.map((route) => route.action.kind)).to.deep.equal([
			"complete_workflow",
			"terminal_error",
		])

		const completionRoute = findStepRoute(
			"step-4",
			"step-4-await-backlog-status-update",
			"step-4-complete-workflow-after-backlog-status-confirmation",
		)
		expectEventPredicateMatchesForStep({
			stepId: "step-4",
			route: completionRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-4-await-attempt-completion",
				"step-4-confirm-backlog-story-status",
			),
		})
		expect(completionRoute.action).to.deep.equal({
			kind: "complete_workflow",
		})
	})
})
