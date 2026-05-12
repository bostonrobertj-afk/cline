import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import type {
	WorkflowFormDefinitionPayload,
	WorkflowFormFieldDefinition,
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
	WorkflowValue,
	WorkflowValues,
} from "../../../types"
import {
	CREATE_STORY_ARCHITECTURE_PREREQUISITE_ID,
	CREATE_STORY_BRAINSTORMING_PREREQUISITE_ID,
	CREATE_STORY_CANNOT_CONTINUE_FORM_ID,
	CREATE_STORY_ENTRY_PROJECT_VALUE_KEYS,
	CREATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID,
	CREATE_STORY_EPICS_INDEX_PREREQUISITE_ID,
	CREATE_STORY_MISSING_STORY_INDEX_PANEL_ID,
	CREATE_STORY_PANEL_A_TARGET_EPIC_ID,
	CREATE_STORY_PANEL_B_TARGET_STORY_ID,
	CREATE_STORY_PANEL_C_BACKLOG_REVISION_ID,
	CREATE_STORY_PANEL_D_NO_REVISION_CONFIRMATION_ID,
	CREATE_STORY_PANEL_E_IMPLEMENTED_STORY_BLOCKED_ID,
	CREATE_STORY_STORY_FILE_NOT_GENERATED_PANEL_ID,
	CREATE_STORY_STORY_SELECTION_FORM_ID,
	CREATE_STORY_TARGET_EPIC_FORM_ID,
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

function renderWorkflowValue(value: WorkflowValue): string {
	if (typeof value === "string") {
		return value
	}

	return JSON.stringify(value)
}

function createPromptInput(): WorkflowPromptBuilderInput {
	const step = getStep("step-1")
	return {
		session: createSession({}),
		step,
		renderWorkflowValue,
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
		renderWorkflowValue,
	}
}

function getPromptInstructions(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): string {
	const promptSource = getStep(stepId).buildPromptSource(createPromptInputForStep(stepId, workflowValues))
	if (promptSource.currentStepInstructions === undefined) {
		throw new Error(`Missing prompt instructions for ${stepId}.`)
	}

	return promptSource.currentStepInstructions
}

function getToolNamesForStep(stepId: WorkflowStepDefinition["id"]): string[] {
	return getStep(stepId)
		.buildToolSchema(createPromptInputForStep(stepId, {}))
		.map((schema) => schema.name)
}

function buildWorkflowValuesPersistedEvent(changedKeys: readonly string[]): WorkflowBranchTriggerEvent {
	return {
		kind: "workflow_values_persisted",
		changedKeys,
	}
}

function buildWorkflowFormCompletedEvent(workflowFormId: string): WorkflowBranchTriggerEvent {
	return {
		kind: "workflow_form_completed",
		workflowFormId,
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

function expectTerminalTransition(panel: WorkflowFormPanelDefinition): void {
	expect(panel.transition).to.deep.equal({
		type: "conditional",
		conditionSourceKey: "__terminal__",
		branches: [],
		defaultTerminal: true,
	})
}

function expectRenderStartPanel(action: WorkflowDecisionAction, workflowFormId: string, startPanelId: string): void {
	const renderAction = expectRenderWorkflowFormAction(action)
	expect(renderAction.workflowFormId).to.equal(workflowFormId)
	if ("startPanelId" in renderAction === false) {
		throw new Error(`Expected render action for ${workflowFormId} to declare startPanelId.`)
	}
	expect(renderAction.startPanelId).to.equal(startPanelId)
}

async function createProjectWithStoryIndex(args?: {
	storyIndexContent?: string
	includeStoriesIndex?: boolean
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
						"story-index-generated": true,
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
	it("defines Panel A target epic form and derives the story index before Panel B can render", async () => {
		const project = await createProjectWithStoryIndex()
		try {
			const form = getWorkflowForm(CREATE_STORY_TARGET_EPIC_FORM_ID)
			const panel = getPanel(form, CREATE_STORY_PANEL_A_TARGET_EPIC_ID)
			const field = getSingleField(panel)
			expect(form.firstPanelId).to.equal(CREATE_STORY_PANEL_A_TARGET_EPIC_ID)
			expect(panel.promptMarkdown).to.equal("Which epic are we focusing on during this workflow?")
			expect(field).to.deep.include({
				key: CreateStoryWorkflowValueKey.EpicIdentity,
				workflowValueKey: CreateStoryWorkflowValueKey.EpicIdentity,
				kind: "dropdown",
				label: "Target epic",
				required: true,
				allowedValueType: "string",
			})
			expect(field.jsonOptionsSource).to.deep.equal({
				root: {
					kind: "selected_project_root",
				},
				sourcePathSegments: ["planning", "Epics.index.json"],
				itemsPath: "epics",
				valueProperty: "identity",
				labelTemplate: "Epic {identity}: {title}",
				descriptionTemplate: "Story index generated: {story-index-generated}",
			})
			expectTerminalTransition(panel)

			const derivationResult = await runDeterministicRoute({
				branchId: "step-1-await-target-epic-form",
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

			const renderStorySelectionRoute = findRoute("step-1-await-selected-epic-values", "step-1-render-story-selection-form")
			expectEventPredicateMatches({
				route: renderStorySelectionRoute,
				workflowValues: {
					[CreateStoryWorkflowValueKey.TargetEpic]: "Epic 1: Runtime workflow module",
					[CreateStoryWorkflowValueKey.StoriesIndex]: project.storiesIndex,
				},
				triggerEvent: buildWorkflowValuesPersistedEvent([
					CreateStoryWorkflowValueKey.TargetEpic,
					CreateStoryWorkflowValueKey.StoriesIndex,
				]),
			})
			expectRenderStartPanel(
				renderStorySelectionRoute.action,
				CREATE_STORY_STORY_SELECTION_FORM_ID,
				CREATE_STORY_PANEL_B_TARGET_STORY_ID,
			)
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("blocks before Panel B when the selected epic story index is missing", async () => {
		const project = await createProjectWithStoryIndex({ includeStoriesIndex: false })
		try {
			const derivationResult = await runDeterministicRoute({
				branchId: "step-1-await-target-epic-form",
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
				"step-1-await-selected-epic-values",
				"step-1-render-missing-story-index-form",
			)
			expectEventPredicateMatches({
				route: missingStoryIndexRoute,
				workflowValues: {
					[CreateStoryWorkflowValueKey.TargetEpic]: "Epic 1: Runtime workflow module",
				},
				triggerEvent: buildWorkflowValuesPersistedEvent([CreateStoryWorkflowValueKey.TargetEpic]),
			})
			expectRenderStartPanel(
				missingStoryIndexRoute.action,
				CREATE_STORY_CANNOT_CONTINUE_FORM_ID,
				CREATE_STORY_MISSING_STORY_INDEX_PANEL_ID,
			)

			const cannotContinueForm = getWorkflowForm(CREATE_STORY_CANNOT_CONTINUE_FORM_ID)
			expect(getPanel(cannotContinueForm, CREATE_STORY_MISSING_STORY_INDEX_PANEL_ID).promptMarkdown).to.contain(
				"Run the pi-planning workflow",
			)
		} finally {
			await rm(project.root, { recursive: true, force: true })
		}
	})

	it("defines Panel B with selected-project jsonOptionsSource and interpolated story-index segments", () => {
		const form = getWorkflowForm(CREATE_STORY_STORY_SELECTION_FORM_ID)
		const panel = getPanel(form, CREATE_STORY_PANEL_B_TARGET_STORY_ID)
		const field = getSingleField(panel)
		expect(form.firstPanelId).to.equal(CREATE_STORY_PANEL_B_TARGET_STORY_ID)
		expect(panel.promptMarkdown).to.equal("Which story should I focus on during this workflow?")
		expect(field.workflowValueKey).to.equal(CreateStoryWorkflowValueKey.SelectedStoryIdentity)
		expect(field.jsonOptionsSource).to.deep.equal({
			root: {
				kind: "selected_project_root",
			},
			sourcePathSegments: ["implementation", "epic-{workflow.epic_identity}-stories.index.json"],
			itemsPath: "stories",
			valueProperty: "story_identity",
			labelTemplate: "Story {story_identity}: {story_file_name}",
			descriptionTemplate: "Status: {status}; generated: {story_file_generated}; type: {story_type}",
		})
		expectTerminalTransition(panel)
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
			const route = findRoute("step-1-await-story-selection-form", "step-1-derive-selected-story-values")
			expectEventPredicateMatches({
				route,
				workflowValues: {
					[CreateStoryWorkflowValueKey.SelectedStoryIdentity]: "1.2",
				},
				triggerEvent: buildWorkflowFormCompletedEvent(CREATE_STORY_STORY_SELECTION_FORM_ID),
			})

			const result = await runDeterministicRoute({
				branchId: "step-1-await-story-selection-form",
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

	it("routes generated-file blocking to the cannot-continue story-file panel", () => {
		const route = findRoute("step-1-await-selected-story-values", "step-1-render-story-file-not-generated-form")
		expectEventPredicateMatches({
			route,
			workflowValues: createWorkflowValuesForSelectedStory({
				status: "draft",
				storyFileGenerated: false,
			}),
			triggerEvent: buildWorkflowValuesPersistedEvent([CreateStoryWorkflowValueKey.SelectedStoryFileGenerated]),
		})
		expectRenderStartPanel(route.action, CREATE_STORY_CANNOT_CONTINUE_FORM_ID, CREATE_STORY_STORY_FILE_NOT_GENERATED_PANEL_ID)

		const cannotContinueForm = getWorkflowForm(CREATE_STORY_CANNOT_CONTINUE_FORM_ID)
		expect(getPanel(cannotContinueForm, CREATE_STORY_STORY_FILE_NOT_GENERATED_PANEL_ID).promptMarkdown).to.contain(
			"generate a story file",
		)
	})

	it("branches selected story statuses to draft target derivation, Panel C, or Panel E", () => {
		const draftRoute = findRoute("step-1-await-selected-story-values", "step-1-derive-draft-target-story")
		expectEventPredicateMatches({
			route: draftRoute,
			workflowValues: createWorkflowValuesForSelectedStory({
				status: "draft",
				storyFileGenerated: true,
			}),
			triggerEvent: buildWorkflowValuesPersistedEvent([CreateStoryWorkflowValueKey.SelectedStoryStatus]),
		})
		expectRunDeterministicProcedureAction(draftRoute.action)

		const backlogRoute = findRoute("step-1-await-selected-story-values", "step-1-render-backlog-revision-form")
		expectEventPredicateMatches({
			route: backlogRoute,
			workflowValues: createWorkflowValuesForSelectedStory({
				status: "backlog",
				storyFileGenerated: true,
			}),
			triggerEvent: buildWorkflowValuesPersistedEvent([CreateStoryWorkflowValueKey.SelectedStoryStatus]),
		})
		expectRenderStartPanel(
			backlogRoute.action,
			CREATE_STORY_STORY_SELECTION_FORM_ID,
			CREATE_STORY_PANEL_C_BACKLOG_REVISION_ID,
		)

		const implementedRoute = findRoute("step-1-await-selected-story-values", "step-1-render-implemented-story-blocked-form")
		for (const status of ["review", "complete"]) {
			expectEventPredicateMatches({
				route: implementedRoute,
				workflowValues: createWorkflowValuesForSelectedStory({
					status,
					storyFileGenerated: true,
				}),
				triggerEvent: buildWorkflowValuesPersistedEvent([CreateStoryWorkflowValueKey.SelectedStoryStatus]),
			})
		}
		expectRenderStartPanel(
			implementedRoute.action,
			CREATE_STORY_STORY_SELECTION_FORM_ID,
			CREATE_STORY_PANEL_E_IMPLEMENTED_STORY_BLOCKED_ID,
		)
	})

	it("derives target story paths and transitions actionable stories to Step 2", async () => {
		const project = await createProjectWithStoryIndex()
		try {
			const result = await runDeterministicRoute({
				branchId: "step-1-await-selected-story-values",
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
			expectEventPredicateMatches({
				route: transitionRoute,
				workflowValues: {
					[CreateStoryWorkflowValueKey.TargetStory]: join(project.root, "implementation", "drafts", "Story-1-1.md"),
				},
				triggerEvent: buildWorkflowValuesPersistedEvent([CreateStoryWorkflowValueKey.TargetStory]),
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
			const findingsDocument = join(project.root, "review", "Adversarial-review-1-1.md")
			await mkdir(join(project.root, "implementation", "stories-complete"), { recursive: true })
			await mkdir(join(project.root, "review"), { recursive: true })
			await writeFile(parentStory, "# Parent story\n")
			await writeFile(findingsDocument, "# Findings\n")

			const result = await runDeterministicRoute({
				branchId: "step-1-await-selected-story-values",
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

	it("defines Panel C back behavior and branches yes/no answers", () => {
		const panel = getPanel(getWorkflowForm(CREATE_STORY_STORY_SELECTION_FORM_ID), CREATE_STORY_PANEL_C_BACKLOG_REVISION_ID)
		expect(panel.allowedActions).to.deep.equal(["submit", "back"])
		expect(panel.backDestinationPanelId).to.equal(CREATE_STORY_PANEL_B_TARGET_STORY_ID)
		expect(panel.backStaleValueKeysToClear).to.deep.equal([CreateStoryWorkflowValueKey.ReviseBacklogStory])
		expect(getSingleField(panel)).to.deep.include({
			key: CreateStoryWorkflowValueKey.ReviseBacklogStory,
			workflowValueKey: CreateStoryWorkflowValueKey.ReviseBacklogStory,
			kind: "boolean",
			required: true,
			allowedValueType: "boolean",
		})

		const yesRoute = findRoute(
			"step-1-await-backlog-revision-form",
			"step-1-derive-backlog-target-story-after-revision-approved",
		)
		expectEventPredicateMatches({
			route: yesRoute,
			workflowValues: {
				[CreateStoryWorkflowValueKey.ReviseBacklogStory]: true,
			},
			triggerEvent: buildWorkflowFormCompletedEvent(CREATE_STORY_STORY_SELECTION_FORM_ID),
		})
		expectRunDeterministicProcedureAction(yesRoute.action)

		const noRoute = findRoute("step-1-await-backlog-revision-form", "step-1-render-no-revision-confirmation-form")
		expectEventPredicateMatches({
			route: noRoute,
			workflowValues: {
				[CreateStoryWorkflowValueKey.ReviseBacklogStory]: false,
			},
			triggerEvent: buildWorkflowFormCompletedEvent(CREATE_STORY_STORY_SELECTION_FORM_ID),
		})
		expectRenderStartPanel(
			noRoute.action,
			CREATE_STORY_STORY_SELECTION_FORM_ID,
			CREATE_STORY_PANEL_D_NO_REVISION_CONFIRMATION_ID,
		)

		const backRoute = findRoute(
			"step-1-await-backlog-revision-form",
			"step-1-derive-selected-story-values-after-backlog-back",
		)
		expectEventPredicateMatches({
			route: backRoute,
			workflowValues: {
				[CreateStoryWorkflowValueKey.SelectedStoryIdentity]: "1.2",
			},
			triggerEvent: buildWorkflowFormCompletedEvent(CREATE_STORY_STORY_SELECTION_FORM_ID),
		})
		expectRunDeterministicProcedureAction(backRoute.action)
	})

	it("routes Panel D confirmation directly to workflow completion", () => {
		const panel = getPanel(
			getWorkflowForm(CREATE_STORY_STORY_SELECTION_FORM_ID),
			CREATE_STORY_PANEL_D_NO_REVISION_CONFIRMATION_ID,
		)
		expect(panel.promptMarkdown).to.equal(
			"Since the selected story already has been populated with tasks and subtasks, your next step is to run the dev-story workflow and select this story as the implementation target.",
		)
		expect(panel.allowedActions).to.deep.equal(["submit"])
		expectTerminalTransition(panel)

		const route = findRoute(
			"step-1-await-no-revision-confirmation-form",
			"step-1-complete-workflow-after-no-revision-confirmation",
		)
		expectEventPredicateMatches({
			route,
			workflowValues: {},
			triggerEvent: buildWorkflowFormCompletedEvent(CREATE_STORY_STORY_SELECTION_FORM_ID),
		})
		expect(route.action.kind).to.equal("complete_workflow")
	})

	it("defines Panel E back behavior returning to Panel B", () => {
		const panel = getPanel(
			getWorkflowForm(CREATE_STORY_STORY_SELECTION_FORM_ID),
			CREATE_STORY_PANEL_E_IMPLEMENTED_STORY_BLOCKED_ID,
		)
		expect(panel.promptMarkdown).to.equal(
			"This story has already been implemented. New tasks should not be added to stories after implementation. If findings were documented during QA, the QA agent generated a remediation story to address those findings. Please go back and select the appropriate remediation story as the target for this workflow.",
		)
		expect(panel.allowedActions).to.deep.equal(["back"])
		expect(panel.backDestinationPanelId).to.equal(CREATE_STORY_PANEL_B_TARGET_STORY_ID)

		const route = findRoute("step-1-await-blocked-story-form", "step-1-derive-selected-story-values-after-blocked-back")
		expectEventPredicateMatches({
			route,
			workflowValues: {
				[CreateStoryWorkflowValueKey.SelectedStoryIdentity]: "1.1.1",
			},
			triggerEvent: buildWorkflowFormCompletedEvent(CREATE_STORY_STORY_SELECTION_FORM_ID),
		})
		expectRunDeterministicProcedureAction(route.action)
	})
})

describe("createStoryWorkflowDefinition Step 2", () => {
	it("builds a primary draft context-review prompt", () => {
		const prompt = getPromptInstructions("step-2", {
			[CreateStoryWorkflowValueKey.TargetStory]: "/tmp/create-story-project/implementation/drafts/Story-1-1.md",
			[CreateStoryWorkflowValueKey.ArchitectureDocument]: "/tmp/create-story-project/planning/architecture.md",
			[CreateStoryWorkflowValueKey.EpicsDocument]: "/tmp/create-story-project/planning/Epics.md",
			[CreateStoryWorkflowValueKey.BrainstormingDocument]: "/tmp/create-story-project/discovery/brainstorming.md",
			[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "draft",
			[CreateStoryWorkflowValueKey.SelectedStoryType]: "primary",
		})

		expect(prompt).to.include("preparing a story file for implementation by adding tasks and subtasks")
		expect(prompt).to.include("Focus on `/tmp/create-story-project/implementation/drafts/Story-1-1.md`.")
		expect(prompt).to.include("Read `/tmp/create-story-project/planning/architecture.md`.")
		expect(prompt).to.include("Read `/tmp/create-story-project/planning/Epics.md`.")
		expect(prompt).to.include("Read `/tmp/create-story-project/discovery/brainstorming.md` when present.")
		expect(prompt).to.include("story objective, scope, scope boundary, requirements")
		expect(prompt).to.include("workflow_progress_request")
	})

	it("builds a remediation draft context-review prompt with parent and findings context", () => {
		const prompt = getPromptInstructions("step-2", {
			[CreateStoryWorkflowValueKey.TargetStory]:
				"/tmp/create-story-project/implementation/drafts/Remediation-story-1-1-1.md",
			[CreateStoryWorkflowValueKey.ArchitectureDocument]: "/tmp/create-story-project/planning/architecture.md",
			[CreateStoryWorkflowValueKey.EpicsDocument]: "/tmp/create-story-project/planning/Epics.md",
			[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "draft",
			[CreateStoryWorkflowValueKey.SelectedStoryType]: "remediation",
			[CreateStoryWorkflowValueKey.ParentStory]: "/tmp/create-story-project/implementation/stories-complete/Story-1-1.md",
			[CreateStoryWorkflowValueKey.FindingsDocument]: "/tmp/create-story-project/review/Adversarial-review-1-1.md",
		})

		expect(prompt).to.include("preparing a remediation story file for implementation")
		expect(prompt).to.include("/tmp/create-story-project/implementation/stories-complete/Story-1-1.md")
		expect(prompt).to.include("/tmp/create-story-project/review/Adversarial-review-1-1.md")
		expect(prompt).to.include("QA findings")
		expect(prompt).to.include("workflow_progress_request")
	})

	it("builds a backlog revision context-review prompt", () => {
		const prompt = getPromptInstructions("step-2", {
			[CreateStoryWorkflowValueKey.TargetStory]: "/tmp/create-story-project/implementation/stories-backlog/Story-1-2.md",
			[CreateStoryWorkflowValueKey.ArchitectureDocument]: "/tmp/create-story-project/planning/architecture.md",
			[CreateStoryWorkflowValueKey.EpicsDocument]: "/tmp/create-story-project/planning/Epics.md",
			[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "backlog",
			[CreateStoryWorkflowValueKey.SelectedStoryType]: "primary",
			[CreateStoryWorkflowValueKey.ReviseBacklogStory]: true,
		})

		expect(prompt).to.include("revising an existing story file")
		expect(prompt).to.include("/tmp/create-story-project/implementation/stories-backlog/Story-1-2.md")
		expect(prompt).to.include("ask the user to explain the required revisions")
		expect(prompt).to.include("existing runtime code/tests")
		expect(prompt).to.include("workflow_progress_request")
	})
})

describe("createStoryWorkflowDefinition Step 3", () => {
	it("builds a draft task/subtask authoring prompt", () => {
		const prompt = getPromptInstructions("step-3", {
			[CreateStoryWorkflowValueKey.TargetStory]: "/tmp/create-story-project/implementation/drafts/Story-1-1.md",
			[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "draft",
		})

		expect(prompt).to.include("Review runtime code and tests")
		expect(prompt).to.include("full set of in-scope revisions")
		expect(prompt).to.include("Inspect relevant runtime code and tests")
		expect(prompt).to.include("Author implementation-ready tasks and subtasks")
		expect(prompt).to.include("single revision in a single target file")
		expect(prompt).to.include("workflow_progress_request")
	})

	it("builds a backlog revision task/subtask authoring prompt", () => {
		const prompt = getPromptInstructions("step-3", {
			[CreateStoryWorkflowValueKey.TargetStory]: "/tmp/create-story-project/implementation/stories-backlog/Story-1-2.md",
			[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "backlog",
		})

		expect(prompt).to.include("Review existing tasks and subtasks")
		expect(prompt).to.include("action-plan quality rules")
		expect(prompt).to.include("/tmp/create-story-project/implementation/stories-backlog/Story-1-2.md")
		expect(prompt).to.include("Provide the user with the identified revision set")
		expect(prompt).to.include("Ask the user to review the tasks/subtasks section")
		expect(prompt).to.include("workflow_progress_request")
	})
})

describe("createStoryWorkflowDefinition Step 2 and Step 3 progression", () => {
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
	it("builds a final validation prompt and exposes attempt_completion only in Step 4", () => {
		const prompt = getPromptInstructions("step-4", {
			[CreateStoryWorkflowValueKey.TargetStory]: "/tmp/create-story-project/implementation/drafts/Story-1-1.md",
		})

		expect(prompt).to.include("complete implementation handoff")
		expect(prompt).to.include("every acceptance criterion")
		expect(prompt).to.include("task order is executable and non-conflicting")
		expect(prompt).to.include("ambiguity, contradiction, missing coverage, or unsafe handoff content")
		expect(prompt).to.include("attempt_completion")
		expect(prompt).to.include("only after validation passes")

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
