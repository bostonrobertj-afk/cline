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
import { ClineDefaultTool } from "@/shared/tools"
import type {
	ActiveWorkflowSession,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionAction,
	WorkflowDecisionBranchRoute,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowValue,
	WorkflowValues,
} from "../../../types"
import { PiPlanningWorkflowValueKey, piPlanningWorkflowDefinition } from "../piPlanningWorkflow"

const PROJECT_ROOT = "/tmp/pi-planning-project"
const EPICS_INDEX_PATH = `${PROJECT_ROOT}/planning/Epics.index.json`
const SAMPLE_WORKFLOW_VALUES: WorkflowValues = {
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

function renderWorkflowValue(value: WorkflowValue): string {
	if (typeof value === "string") {
		return value
	}

	return JSON.stringify(value)
}

function createPromptInput(step: WorkflowStepDefinition, workflowValues: WorkflowValues): WorkflowPromptBuilderInput {
	return {
		session: createSession(workflowValues),
		step,
		renderWorkflowValue,
	}
}

function buildPrompt(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): string {
	const step = getStep(stepId)
	const promptSource = step.buildPromptSource(createPromptInput(step, workflowValues))
	const prompt = promptSource.currentStepInstructions
	if (prompt === undefined) {
		throw new Error(`Missing prompt source for ${stepId}.`)
	}

	return prompt
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
		args.route.trigger.matches({
			activeBranchId: args.activeBranchId,
			workflowValues: args.workflowValues,
			step: args.step,
			triggerEvent: args.triggerEvent,
		}),
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
		args.route.trigger.matches({
			activeBranchId: args.activeBranchId,
			workflowValues: args.workflowValues,
			step: args.step,
			triggerEvent: args.triggerEvent,
		}),
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
		expect(piPlanningWorkflowDefinition.projectSubfolder).to.equal("planning")
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
				producingWorkflowName: "create-architecture",
				projectSubfolderSegments: ["planning"],
				match: { kind: "exact_filename", filename: "architecture.md" },
				workflowValueKey: PiPlanningWorkflowValueKey.ArchitectureDocument,
				outputDocumentReference: "none",
			},
			[PiPlanningWorkflowValueKey.EpicsDocument]: {
				id: PiPlanningWorkflowValueKey.EpicsDocument,
				requirement: "required",
				producingWorkflowName: "create-epics",
				projectSubfolderSegments: ["planning"],
				match: { kind: "exact_filename", filename: "Epics.md" },
				workflowValueKey: PiPlanningWorkflowValueKey.EpicsDocument,
				outputDocumentReference: "none",
			},
			[PiPlanningWorkflowValueKey.EpicsIndex]: {
				id: PiPlanningWorkflowValueKey.EpicsIndex,
				requirement: "required",
				producingWorkflowName: "create-epics",
				projectSubfolderSegments: ["planning"],
				match: { kind: "exact_filename", filename: "Epics.index.json" },
				workflowValueKey: PiPlanningWorkflowValueKey.EpicsIndex,
				outputDocumentReference: "none",
			},
			[PiPlanningWorkflowValueKey.BrainstormingDocument]: {
				id: PiPlanningWorkflowValueKey.BrainstormingDocument,
				requirement: "optional",
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

		expect(field).to.deep.include({
			key: PiPlanningWorkflowValueKey.EpicIdentity,
			workflowValueKey: PiPlanningWorkflowValueKey.EpicIdentity,
			kind: "dropdown",
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
	})

	it("defines Step 1 Panel B as informational prerequisite confirmation", () => {
		const panelB = getPanel(getStep1InputForm(), "step-1-required-context-panel")

		expect(panelB.fields).to.deep.equal([])
		expect(panelB.promptMarkdown).to.include("[Epics.index.json](<{workflow.epics_index}>)")
		expect(panelB.promptMarkdown).to.include("[Epics.md](<{workflow.epics_document}>)")
		expect(panelB.promptMarkdown).to.include("[architecture.md](<{workflow.architecture_document}>)")
		expect(panelB.allowedActions).to.deep.equal(["submit"])
		expect(panelB.actionLabels).to.deep.equal({ submit: "Continue" })
		expect(panelB.transition).to.deep.equal({
			type: "sequential",
			nextPanelId: "step-1-additional-context-panel",
		})
	})

	it("defines Step 1 Panel C as optional additional context persisted to additional_context", () => {
		const panelC = getPanel(getStep1InputForm(), "step-1-additional-context-panel")
		const field = getSingleField(panelC)

		expect(field).to.deep.include({
			key: PiPlanningWorkflowValueKey.AdditionalContext,
			workflowValueKey: PiPlanningWorkflowValueKey.AdditionalContext,
			kind: "large_text",
			required: false,
			allowedValueType: "string",
		})
		expect(field.presentation).to.deep.equal({ textareaSize: "large" })
		expect(panelC.allowedActions).to.deep.equal(["submit", "back"])
		expect(panelC.transition).to.deep.equal({
			type: "conditional",
			conditionSourceKey: "__terminal__",
			branches: [],
			defaultTerminal: true,
		})
	})

	it("routes Step 1 through prerequisites, folder persistence, input form, selected epic derivation, and Step 2", async () => {
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
		expect(renderFormRoute.followingBranchId).to.equal("step-1-await-input-form")

		const derivationRoute = findRoute("step-1", "step-1-await-input-form", "step-1-derive-selected-epic-values")
		expectEventPredicateMatches({
			route: derivationRoute,
			activeBranchId: "step-1-await-input-form",
			workflowValues: {},
			step: step1,
			triggerEvent: buildWorkflowFormCompletedEvent("step-1-input-form"),
		})
		expect(derivationRoute.action.kind).to.equal("run_deterministic_procedure")
		expect(derivationRoute.followingBranchId).to.equal("step-1-await-selected-epic-values")

		const transitionRoute = findRoute("step-1", "step-1-await-selected-epic-values", "step-1-transition-to-step-2")
		expectEventPredicateMatches({
			route: transitionRoute,
			activeBranchId: "step-1-await-selected-epic-values",
			workflowValues: {},
			step: step1,
			triggerEvent: buildWorkflowValuesPersistedEvent([PiPlanningWorkflowValueKey.TargetEpic]),
		})
		expect(transitionRoute.action).to.deep.equal({
			kind: "transition_step",
			target: {
				kind: "entry_branch",
				stepNumber: 2,
			},
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

			const derivationRoute = findRoute("step-1", "step-1-await-input-form", "step-1-derive-selected-epic-values")
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

	it("renders Step 2 through Step 6 prompts with required workflow value references and no backend-only tools", () => {
		const promptExpectations: ReadonlyArray<{
			stepId: WorkflowStepDefinition["id"]
			requiredSnippets: readonly string[]
		}> = [
			{
				stepId: "step-2",
				requiredSnippets: [
					"Epic 1: Improve workflow runtime",
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
					"Epic 1: Improve workflow runtime",
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.StoriesIndex].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.DraftsFolder].toString(),
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-4",
				requiredSnippets: [
					"Epic 1: Improve workflow runtime",
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.EpicIdentity].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.ImplementationFolder].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.StoriesIndex].toString(),
					"plan_story_artifacts",
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-5",
				requiredSnippets: [
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.EpicIdentity].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.DraftsFolder].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.StoriesIndex].toString(),
					"generate_story_files",
				],
			},
			{
				stepId: "step-6",
				requiredSnippets: [
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.DraftsFolder].toString(),
					"Scope",
					"Scope Boundary",
					"Requirements",
					"Objective",
					"Known Issues/ Risks/ Technical Debt",
					"attempt_completion",
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
		}
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
		expect(step3ExistingPrompt).to.include("An existing story index is present")
		const step3NewPrompt = buildPrompt("step-3", storyIndexPresentButCreatedDuringWorkflowValues)
		expect(step3NewPrompt).not.to.include("An existing story index is present")

		const step4ExistingPrompt = buildPrompt("step-4", existingIndexValues)
		expect(step4ExistingPrompt).to.include("Review the existing story index.")
		const step4NewPrompt = buildPrompt("step-4", storyIndexPresentButCreatedDuringWorkflowValues)
		expect(step4NewPrompt).to.include("no `stories_index` existed at workflow start")
		expect(step4NewPrompt).not.to.include("Review the existing story index.")

		const step5ExistingPrompt = buildPrompt("step-5", existingIndexValues)
		expect(step5ExistingPrompt).to.include("existing `stories_index` was present at workflow start")
		const step5NewPrompt = buildPrompt("step-5", storyIndexPresentButCreatedDuringWorkflowValues)
		expect(step5NewPrompt).to.include("no story index existed at workflow start")
		expect(step5NewPrompt).not.to.include("existing `stories_index` was present at workflow start")
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
