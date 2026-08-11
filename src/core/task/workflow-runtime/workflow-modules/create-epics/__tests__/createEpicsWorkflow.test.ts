import type { WorkflowFormDefinitionPayload, WorkflowFormPanelDefinition } from "@shared/ExtensionMessage"
import { expect } from "chai"
import { describe, it } from "mocha"
import { WorkflowArtifactFamily } from "../../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionBranchEvaluationInput,
	WorkflowDecisionBranchRoute,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowValues,
} from "../../../types"
import { renderWorkflowPromptTemplate } from "../../../workflowPromptTemplates"
import { createEpicsWorkflowDefinition } from "../createEpicsWorkflow"

const OUTPUT_FILE = "/tmp/create-epics-project/planning/Epics.md"

function findRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const step = createEpicsWorkflowDefinition.steps[stepId]
	const route = step?.decisionTree.branches[branchId]?.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Missing route ${stepId}/${branchId}/${routeId}.`)
	}

	return route
}

function buildEntryArtifactResolutionCompletedEvent(creationRequired: boolean): WorkflowBranchTriggerEvent {
	return {
		kind: "entry_artifact_resolution_completed",
		artifactResolutions: [
			{
				artifactId: "epics",
				artifactFamily: WorkflowArtifactFamily.Epics,
				artifactIdentity: "epics",
				artifactFilename: "Epics.md",
				artifactRelativePath: "planning/Epics.md",
				artifactAbsolutePath: OUTPUT_FILE,
				creationRequired,
				existingArtifactAction: creationRequired ? "none" : "continue_existing",
			},
		],
	}
}

function buildWorkflowFormCompletedEvent(workflowFormId: string): WorkflowBranchTriggerEvent {
	return {
		kind: "workflow_form_completed",
		workflowFormId,
	}
}

function buildAttemptCompletionSucceededEvent(): WorkflowBranchTriggerEvent {
	return {
		kind: "attempt_completion_succeeded",
	}
}

function buildToolBackedOperationEvent(
	kind: "tool_backed_operation_succeeded" | "tool_backed_operation_failed",
	branchId: string,
	routeId: string,
): WorkflowBranchTriggerEvent {
	if (kind === "tool_backed_operation_succeeded") {
		return {
			kind,
			sourceRoute: {
				branchId,
				routeId,
			},
		}
	}

	return {
		kind,
		sourceRoute: {
			branchId,
			routeId,
		},
	}
}

function expectRouteMatchesEntryArtifactResolution(route: WorkflowDecisionBranchRoute, creationRequired: boolean): void {
	if (route.trigger.kind !== "event_predicate") {
		throw new Error(`Expected event_predicate trigger, received ${route.trigger.kind}.`)
	}

	expect(
		route.trigger.matches(
			createEventPredicateInput({
				activeBranchId: "step-1-resolve-entry-artifact",
				workflowValues: {},
				step: createEpicsWorkflowDefinition.steps["step-1"],
				triggerEvent: buildEntryArtifactResolutionCompletedEvent(creationRequired),
			}),
		),
	).to.equal(true)
}

function expectRouteMatchesWorkflowFormCompleted(route: WorkflowDecisionBranchRoute, workflowFormId: string): void {
	if (route.trigger.kind !== "event_predicate") {
		throw new Error(`Expected event_predicate trigger, received ${route.trigger.kind}.`)
	}

	expect(
		route.trigger.matches(
			createEventPredicateInput({
				activeBranchId: "step-1-await-context-form",
				workflowValues: {},
				step: createEpicsWorkflowDefinition.steps["step-1"],
				triggerEvent: buildWorkflowFormCompletedEvent(workflowFormId),
			}),
		),
	).to.equal(true)
}

function expectRouteMatchesToolBackedOperationEvent(
	route: WorkflowDecisionBranchRoute,
	kind: "tool_backed_operation_succeeded" | "tool_backed_operation_failed",
	branchId: string,
	routeId: string,
): void {
	if (route.trigger.kind !== "event_predicate") {
		throw new Error(`Expected event_predicate trigger, received ${route.trigger.kind}.`)
	}

	expect(
		route.trigger.matches(
			createEventPredicateInput({
				activeBranchId: branchId,
				workflowValues: {},
				step: createEpicsWorkflowDefinition.steps["step-1"],
				triggerEvent: buildToolBackedOperationEvent(kind, branchId, routeId),
			}),
		),
	).to.equal(true)
}

function expectStep2RouteMatchesAttemptCompletionSucceeded(
	route: WorkflowDecisionBranchRoute,
	workflowValues: WorkflowValues,
): void {
	if (route.trigger.kind !== "event_predicate") {
		throw new Error(`Expected event_predicate trigger, received ${route.trigger.kind}.`)
	}

	expect(
		route.trigger.matches(
			createEventPredicateInput({
				activeBranchId: "step-2-await-attempt-completion",
				workflowValues,
				step: createEpicsWorkflowDefinition.steps["step-2"],
				triggerEvent: buildAttemptCompletionSucceededEvent(),
			}),
		),
	).to.equal(true)
}

function expectStep2RouteMatchesToolBackedOperationEvent(
	route: WorkflowDecisionBranchRoute,
	kind: "tool_backed_operation_succeeded" | "tool_backed_operation_failed",
	branchId: string,
	routeId: string,
): void {
	if (route.trigger.kind !== "event_predicate") {
		throw new Error(`Expected event_predicate trigger, received ${route.trigger.kind}.`)
	}

	expect(
		route.trigger.matches(
			createEventPredicateInput({
				activeBranchId: "step-2-await-index-build",
				workflowValues: {},
				step: createEpicsWorkflowDefinition.steps["step-2"],
				triggerEvent: buildToolBackedOperationEvent(kind, branchId, routeId),
			}),
		),
	).to.equal(true)
}

function getStep1ContextForm(): WorkflowFormDefinitionPayload {
	const form = createEpicsWorkflowDefinition.workflowForms?.["step-1-context-form"]
	if (form === undefined) {
		throw new Error("Missing Step 1 context workflow form.")
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

function listBranchActionKinds(branchIds: readonly string[]): readonly string[] {
	return branchIds.flatMap((branchId) =>
		(createEpicsWorkflowDefinition.steps["step-1"].decisionTree.branches[branchId]?.routes ?? []).map(
			(route) => route.action.kind,
		),
	)
}

function createSession(workflowValues: WorkflowValues): ActiveWorkflowSession {
	return {
		activeStepNumber: 2,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Create Epics Project",
			projectFolderName: "create-epics-project",
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
			activeBranchId: "step-2-project-prompt",
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

function createPromptInput(step: WorkflowStepDefinition, workflowValues: WorkflowValues): WorkflowPromptBuilderInput {
	return {
		session: createSession(workflowValues),
		step,
	}
}

describe("createEpicsWorkflowDefinition", () => {
	it("declares workflow identity, metadata, persona, value inventory, entry keys, and artifact mappings", () => {
		expect(createEpicsWorkflowDefinition.name).to.equal("create-epics")
		expect(createEpicsWorkflowDefinition.displayName).to.equal("Create Epics")
		expect(createEpicsWorkflowDefinition.description).to.be.a("string")
		expect(createEpicsWorkflowDefinition.description).to.not.equal("")
		expect(createEpicsWorkflowDefinition.slashCommandName).to.equal("create-epics")
		expect(createEpicsWorkflowDefinition.useSkillName).to.equal("create-epics")
		expect(createEpicsWorkflowDefinition.projectSelection).to.deep.equal({ kind: "interactive" })
		expect(createEpicsWorkflowDefinition.projectOutputPlacement).to.deep.equal({
			kind: "selected_project_subfolder",
			subfolder: "planning",
		})
		expect(Object.hasOwn(createEpicsWorkflowDefinition, "projectSubfolder")).to.equal(false)
		expect(createEpicsWorkflowDefinition.entryPanel.promptMarkdown).to.equal(createEpicsWorkflowDefinition.description)
		const retiredFinalizerPropertyName = ["finalDelivery", "Finalizer"].join("")
		expect(Reflect.has(createEpicsWorkflowDefinition, retiredFinalizerPropertyName)).to.equal(false)

		const persona = createEpicsWorkflowDefinition.persona
		expect(persona).to.not.equal("product-manager")
		expect(persona.name).to.be.a("string")
		expect(persona.name).to.not.equal("")
		expect(persona.role).to.equal("Product Manager")
		expect(persona.identity).to.be.a("string")
		expect(persona.identity).to.not.equal("")
		expect(persona.communicationStyle).to.be.a("string")
		expect(persona.communicationStyle).to.not.equal("")
		expect(persona.capabilities).to.be.an("array").that.is.not.empty
		for (const capability of persona.capabilities) {
			expect(capability).to.be.a("string")
			expect(capability).to.not.equal("")
		}
		expect(persona.principles).to.be.an("array").that.is.not.empty
		for (const principle of persona.principles) {
			expect(principle).to.be.a("string")
			expect(principle).to.not.equal("")
		}

		expect(Object.keys(createEpicsWorkflowDefinition.steps)).to.deep.equal(["step-1", "step-2"])
		expect(Object.values(createEpicsWorkflowDefinition.steps).map((step) => step.checklistLabel)).to.deep.equal([
			"Gather Inputs",
			"Draft Epics",
		])
		expect(createEpicsWorkflowDefinition.workflowValueKeys).to.deep.equal([
			"projectMode",
			"projectTitle",
			"projectFolderName",
			"architecture_document",
			"has_brainstorming_document",
			"brainstorming_document",
			"additional_context_files",
			"output_file",
			"epics_index_file",
			"output_artifact_family",
			"output_artifact_identity",
			"output_artifact_filename",
			"output_artifact_relative_path",
			"epics_index_artifact_family",
			"epics_index_artifact_identity",
			"epics_index_artifact_filename",
			"epics_index_artifact_relative_path",
		])
		expect(createEpicsWorkflowDefinition.entryProjectValueKeys).to.deep.equal({
			projectMode: "projectMode",
			projectTitle: "projectTitle",
			projectFolderName: "projectFolderName",
		})
		expect(createEpicsWorkflowDefinition.artifacts?.epics).to.deep.equal({
			id: "epics",
			family: WorkflowArtifactFamily.Epics,
			intentMode: "new",
			parentIdentitySource: undefined,
			targetIdentitySource: undefined,
			outputValueKeys: {
				projectTitle: "projectTitle",
				projectFolderName: "projectFolderName",
				artifactFamily: "output_artifact_family",
				artifactIdentity: "output_artifact_identity",
				artifactFilename: "output_artifact_filename",
				artifactRelativePath: "output_artifact_relative_path",
				artifactAbsolutePath: "output_file",
				parentIdentity: undefined,
				targetIdentity: undefined,
			},
		})
		expect(createEpicsWorkflowDefinition.artifacts?.epics_index).to.deep.equal({
			id: "epics_index",
			family: WorkflowArtifactFamily.EpicsIndex,
			intentMode: "new",
			parentIdentitySource: undefined,
			targetIdentitySource: undefined,
			outputValueKeys: {
				projectTitle: "projectTitle",
				projectFolderName: "projectFolderName",
				artifactFamily: "epics_index_artifact_family",
				artifactIdentity: "epics_index_artifact_identity",
				artifactFilename: "epics_index_artifact_filename",
				artifactRelativePath: "epics_index_artifact_relative_path",
				artifactAbsolutePath: "epics_index_file",
				parentIdentity: undefined,
				targetIdentity: undefined,
			},
		})
	})

	it("declares the required architecture prerequisite and resolves it through Step 1", () => {
		expect(createEpicsWorkflowDefinition.prerequisiteFiles?.architecture_document).to.deep.equal({
			id: "architecture_document",
			requirement: "required",
			resolutionMode: "interactive",
			projectSubfolderSegments: ["planning"],
			match: { kind: "exact_filename", filename: "architecture.md" },
			producingWorkflowName: "create-architecture",
			workflowValueKey: "architecture_document",
			outputDocumentReference: "module_document_builder",
		})

		const newArtifactRoute = findRoute(
			"step-1",
			"step-1-resolve-entry-artifact",
			"step-1-resolve-prerequisites-for-new-artifact",
		)
		const existingArtifactRoute = findRoute(
			"step-1",
			"step-1-resolve-entry-artifact",
			"step-1-resolve-prerequisites-for-existing-artifact",
		)

		expectRouteMatchesEntryArtifactResolution(newArtifactRoute, true)
		expect(newArtifactRoute.action).to.deep.equal({
			kind: "resolve_prerequisite_files",
			prerequisiteIds: ["architecture_document"],
		})
		expect(newArtifactRoute.followingBranchId).to.equal("step-1-render-context-form-for-new-artifact")
		expectRouteMatchesEntryArtifactResolution(existingArtifactRoute, false)
		expect(existingArtifactRoute.action).to.deep.equal({
			kind: "resolve_prerequisite_files",
			prerequisiteIds: ["architecture_document"],
		})
		expect(existingArtifactRoute.followingBranchId).to.equal("step-1-render-context-form-for-existing-artifact")
	})

	it("defines the Step 1 context form panels and durable context fields", () => {
		const form = getStep1ContextForm()
		expect(form.firstPanelId).to.equal("step-1-brainstorming-check-panel")
		expect(Object.keys(form.panels)).to.deep.equal([
			"step-1-brainstorming-check-panel",
			"step-1-brainstorming-path-panel",
			"step-1-additional-context-panel",
		])

		const panelA = getPanel(form, "step-1-brainstorming-check-panel")
		expect(panelA.promptMarkdown).to.be.a("string")
		expect(panelA.promptMarkdown).to.not.equal("")
		expect(panelA.fields[0]).to.deep.include({
			key: "has_brainstorming_document",
			workflowValueKey: "has_brainstorming_document",
			kind: "boolean",
			required: true,
			allowedValueType: "boolean",
		})
		expect(panelA.transition).to.deep.equal({
			type: "conditional",
			conditionSourceKey: "has_brainstorming_document",
			branches: [
				{ matchValue: true, nextPanelId: "step-1-brainstorming-path-panel" },
				{
					matchValue: false,
					nextPanelId: "step-1-additional-context-panel",
					staleValueKeysToClear: ["brainstorming_document"],
				},
			],
			defaultNextPanelId: "step-1-additional-context-panel",
		})

		const panelB = getPanel(form, "step-1-brainstorming-path-panel")
		expect(panelB.promptMarkdown).to.be.a("string")
		expect(panelB.promptMarkdown).to.not.equal("")
		expect(panelB.fields[0]).to.deep.include({
			key: "brainstorming_document",
			workflowValueKey: "brainstorming_document",
			kind: "small_text",
			required: true,
			allowedValueType: "string",
		})
		expect(panelB.transition).to.deep.equal({
			type: "sequential",
			nextPanelId: "step-1-additional-context-panel",
		})

		const panelC = getPanel(form, "step-1-additional-context-panel")
		expect(panelC.promptMarkdown).to.be.a("string")
		expect(panelC.promptMarkdown).to.not.equal("")
		expect(panelC.fields[0]).to.deep.include({
			key: "additional_context_files",
			workflowValueKey: "additional_context_files",
			kind: "large_text",
			required: false,
			allowedValueType: "string",
		})
		expect(panelC.fields[0]?.presentation).to.deep.equal({ textareaSize: "large" })
	})

	it("routes new Epics.md creation through prerequisites, context form, allocation, shell build, and Step 2", () => {
		const prerequisiteRoute = findRoute(
			"step-1",
			"step-1-resolve-entry-artifact",
			"step-1-resolve-prerequisites-for-new-artifact",
		)
		expectRouteMatchesEntryArtifactResolution(prerequisiteRoute, true)
		expect(prerequisiteRoute.action).to.deep.equal({
			kind: "resolve_prerequisite_files",
			prerequisiteIds: ["architecture_document"],
		})
		expect(prerequisiteRoute.followingBranchId).to.equal("step-1-render-context-form-for-new-artifact")

		const renderFormRoute = findRoute(
			"step-1",
			"step-1-render-context-form-for-new-artifact",
			"step-1-render-context-form-for-new-artifact",
		)
		expect(renderFormRoute.trigger).to.deep.equal({ kind: "always" })
		expect(renderFormRoute.action).to.deep.equal({
			kind: "render_workflow_form",
			workflowFormId: "step-1-context-form",
		})
		expect(renderFormRoute.followingBranchId).to.equal("step-1-await-context-form-for-new-artifact")

		const allocationRoute = findRoute(
			"step-1",
			"step-1-await-context-form-for-new-artifact",
			"step-1-allocate-epics-artifact",
		)
		expectRouteMatchesWorkflowFormCompleted(allocationRoute, "step-1-context-form")
		expect(allocationRoute.action).to.deep.equal({
			kind: "allocate_artifact",
			artifactId: "epics",
		})
		expect(allocationRoute.followingBranchId).to.equal("step-1-await-allocation")

		const buildShellRoute = findRoute("step-1", "step-1-await-allocation", "step-1-build-initial-shell")
		expectRouteMatchesToolBackedOperationEvent(
			buildShellRoute,
			"tool_backed_operation_succeeded",
			"step-1-await-context-form-for-new-artifact",
			"step-1-allocate-epics-artifact",
		)
		expect(buildShellRoute.action.kind).to.equal("build_workflow_document")
		if (buildShellRoute.action.kind !== "build_workflow_document") {
			throw new Error(`Expected build_workflow_document, received ${buildShellRoute.action.kind}.`)
		}
		expect(buildShellRoute.action.instruction.artifactId).to.equal("epics")
		expect(buildShellRoute.followingBranchId).to.equal("step-1-await-initial-shell")

		const transitionRoute = findRoute("step-1", "step-1-await-initial-shell", "step-1-transition-to-step-2")
		expectRouteMatchesToolBackedOperationEvent(
			transitionRoute,
			"tool_backed_operation_succeeded",
			"step-1-await-allocation",
			"step-1-build-initial-shell",
		)
		expect(transitionRoute.action).to.deep.equal({
			kind: "transition_step",
			target: {
				kind: "entry_branch",
				stepNumber: 2,
			},
		})
	})

	it("routes existing Epics.md continuation through prerequisites and context form without allocation or shell build", () => {
		const prerequisiteRoute = findRoute(
			"step-1",
			"step-1-resolve-entry-artifact",
			"step-1-resolve-prerequisites-for-existing-artifact",
		)
		expectRouteMatchesEntryArtifactResolution(prerequisiteRoute, false)
		expect(prerequisiteRoute.action).to.deep.equal({
			kind: "resolve_prerequisite_files",
			prerequisiteIds: ["architecture_document"],
		})
		expect(prerequisiteRoute.followingBranchId).to.equal("step-1-render-context-form-for-existing-artifact")

		const renderFormRoute = findRoute(
			"step-1",
			"step-1-render-context-form-for-existing-artifact",
			"step-1-render-context-form-for-existing-artifact",
		)
		expect(renderFormRoute.action).to.deep.equal({
			kind: "render_workflow_form",
			workflowFormId: "step-1-context-form",
		})
		expect(renderFormRoute.followingBranchId).to.equal("step-1-await-context-form-for-existing-artifact")

		const transitionRoute = findRoute(
			"step-1",
			"step-1-await-context-form-for-existing-artifact",
			"step-1-transition-existing-artifact-to-step-2",
		)
		expectRouteMatchesWorkflowFormCompleted(transitionRoute, "step-1-context-form")
		expect(transitionRoute.action).to.deep.equal({
			kind: "transition_step",
			target: {
				kind: "entry_branch",
				stepNumber: 2,
			},
		})

		const existingArtifactActionKinds = listBranchActionKinds([
			"step-1-render-context-form-for-existing-artifact",
			"step-1-await-context-form-for-existing-artifact",
		])
		expect(existingArtifactActionKinds).to.deep.equal(["render_workflow_form", "transition_step"])
		expect(existingArtifactActionKinds).not.to.include("allocate_artifact")
		expect(existingArtifactActionKinds).not.to.include("build_workflow_document")
	})

	it("routes Step 2 project prompt to await attempt completion", () => {
		const projectPromptRoute = findRoute("step-2", "step-2-project-prompt", "step-2-project-prompt")

		expect(projectPromptRoute.trigger).to.deep.equal({ kind: "always" })
		expect(projectPromptRoute.action).to.deep.equal({
			kind: "project_prompt",
		})
		expect(projectPromptRoute.followingBranchId).to.equal("step-2-await-attempt-completion")
	})

	it("routes attempt completion with an existing Epics.index.json path to index document build", () => {
		const buildIndexRoute = findRoute(
			"step-2",
			"step-2-await-attempt-completion",
			"step-2-build-index-after-attempt-completion",
		)

		expectStep2RouteMatchesAttemptCompletionSucceeded(buildIndexRoute, {
			epics_index_file: "/tmp/create-epics-project/planning/Epics.index.json",
		})
		expect(buildIndexRoute.action.kind).to.equal("build_workflow_document")
		if (buildIndexRoute.action.kind !== "build_workflow_document") {
			throw new Error(`Expected build_workflow_document, received ${buildIndexRoute.action.kind}.`)
		}
		expect(buildIndexRoute.action.instruction.artifactId).to.equal("epics_index")
		expect(buildIndexRoute.followingBranchId).to.equal("step-2-await-index-build")
	})

	it("routes attempt completion without an Epics.index.json path to index artifact allocation", () => {
		const allocateIndexRoute = findRoute(
			"step-2",
			"step-2-await-attempt-completion",
			"step-2-allocate-index-after-attempt-completion",
		)

		expectStep2RouteMatchesAttemptCompletionSucceeded(allocateIndexRoute, {})
		expect(allocateIndexRoute.action).to.deep.equal({
			kind: "allocate_artifact",
			artifactId: "epics_index",
		})
		expect(allocateIndexRoute.followingBranchId).to.equal("step-2-await-index-allocation")
	})

	it("routes successful Epics.index.json builds to workflow completion", () => {
		const completeWorkflowRoute = findRoute(
			"step-2",
			"step-2-await-index-build",
			"step-2-complete-workflow-after-index-build",
		)

		expectStep2RouteMatchesToolBackedOperationEvent(
			completeWorkflowRoute,
			"tool_backed_operation_succeeded",
			"step-2-await-attempt-completion",
			"step-2-build-index-after-attempt-completion",
		)
		expect(completeWorkflowRoute.action).to.deep.equal({
			kind: "complete_workflow",
		})
	})

	it("builds the Step 2 prompt and exposes only the approved model-facing tools", () => {
		const step2 = createEpicsWorkflowDefinition.steps["step-2"]
		const workflowValues: WorkflowValues = {
			output_file: OUTPUT_FILE,
			architecture_document: "/tmp/create-epics-project/planning/architecture.md",
			brainstorming_document: "/tmp/create-epics-project/discovery/brainstorming.md",
			additional_context_files: "/tmp/create-epics-project/research.md",
		}
		const promptSource = step2.buildPromptSource(createPromptInput(step2, workflowValues))
		if (promptSource.kind !== "current_step_instruction_template") {
			throw new Error("Missing current step instruction template for step-2.")
		}
		const prompt = renderWorkflowPromptTemplate({
			template: promptSource.currentStepInstructionTemplate,
			workflowValueKeys: createEpicsWorkflowDefinition.workflowValueKeys,
			workflowValues,
			context: "create-epics step-2 test prompt",
		})
		expect(prompt).to.include(OUTPUT_FILE)
		expect(prompt).to.include("/tmp/create-epics-project/planning/architecture.md")
		expect(prompt).to.include("/tmp/create-epics-project/discovery/brainstorming.md")
		expect(prompt).to.include("/tmp/create-epics-project/research.md")

		expect(prompt).to.include("Read the following:")
		expect(prompt).to.include(`- \`${OUTPUT_FILE}\``)
		expect(prompt).to.include("- `/tmp/create-epics-project/planning/architecture.md`")
		expect(prompt).to.include("- `/tmp/create-epics-project/discovery/brainstorming.md`")
		expect(prompt).to.include("- `/tmp/create-epics-project/research.md`")
		expect(prompt).to.include(
			"Identify the work necessary to deliver the project based on the provided architecture document.",
		)
		expect(prompt).to.include("Each epic must:")
		expect(prompt).to.include("Sequence epics by dependency order with aid from the provided architecture document:")
		expect(prompt).to.include("Do not create epics that are only “backend,” “frontend,” or “tests”")
		expect(prompt).to.include("Use `upsert_epic` to persist every accepted epic and every accepted revision.")
		expect(prompt).to.include("Adjust as needed using `apply_patch` based on their feedback.")
		expect(prompt).to.include("use attempt_completion to provide a final recap")
		expect(prompt).not.to.include("{workflow.output_file}")
		expect(prompt).not.to.include("{workflow.architecture_document}")
		expect(prompt).not.to.include("{workflow.brainstorming_document}")
		expect(prompt).not.to.include("{workflow.additional_context_files}")

		const step2ToolNames = step2.buildToolSchema(createPromptInput(step2, {})).map((schema) => schema.name)
		expect(step2ToolNames).to.deep.equal([
			"read_file",
			"upsert_epic",
			"apply_patch",
			"send_user_message",
			"ask_followup_question",
			"attempt_completion",
		])
		for (const forbiddenToolName of [
			"build_workflow_document",
			"set_workflow_values",
			"workflow_progress_request",
			"create_workflow_artifact",
			"archive_workflow_artifact",
			"delete_workflow_artifact",
			"move_workflow_project_file",
		]) {
			expect(step2ToolNames).not.to.include(forbiddenToolName)
		}
	})

	it("omits Step 2 optional context instructions when optional context values are absent", () => {
		const step2 = createEpicsWorkflowDefinition.steps["step-2"]
		const workflowValues: WorkflowValues = {
			output_file: OUTPUT_FILE,
			architecture_document: "/tmp/create-epics-project/planning/architecture.md",
		}
		const promptSource = step2.buildPromptSource(createPromptInput(step2, workflowValues))
		if (promptSource.kind !== "current_step_instruction_template") {
			throw new Error("Missing current step instruction template for step-2.")
		}
		const prompt = renderWorkflowPromptTemplate({
			template: promptSource.currentStepInstructionTemplate,
			workflowValueKeys: createEpicsWorkflowDefinition.workflowValueKeys,
			workflowValues,
			context: "create-epics step-2 optional context absent test prompt",
		})

		expect(prompt).to.include("Read the following:")
		expect(prompt).to.include(`- \`${OUTPUT_FILE}\``)
		expect(prompt).to.include("- `/tmp/create-epics-project/planning/architecture.md`")
		expect(prompt).not.to.include("brainstorming.md")
		expect(prompt).not.to.include("research.md")
		expect(prompt).not.to.include("{workflow.brainstorming_document}")
		expect(prompt).not.to.include("{workflow.additional_context_files}")
	})

	it("renders each Step 2 optional context instruction only when its value is present", () => {
		const step2 = createEpicsWorkflowDefinition.steps["step-2"]
		const renderStep2Prompt = (workflowValues: WorkflowValues, context: string): string => {
			const promptSource = step2.buildPromptSource(createPromptInput(step2, workflowValues))
			if (promptSource.kind !== "current_step_instruction_template") {
				throw new Error("Missing current step instruction template for step-2.")
			}
			return renderWorkflowPromptTemplate({
				template: promptSource.currentStepInstructionTemplate,
				workflowValueKeys: createEpicsWorkflowDefinition.workflowValueKeys,
				workflowValues,
				context,
			})
		}

		const brainstormingOnlyPrompt = renderStep2Prompt(
			{
				output_file: OUTPUT_FILE,
				architecture_document: "/tmp/create-epics-project/planning/architecture.md",
				brainstorming_document: "/tmp/create-epics-project/discovery/brainstorming.md",
			},
			"create-epics step-2 brainstorming-only test prompt",
		)
		const additionalContextOnlyPrompt = renderStep2Prompt(
			{
				output_file: OUTPUT_FILE,
				architecture_document: "/tmp/create-epics-project/planning/architecture.md",
				additional_context_files: "/tmp/create-epics-project/research.md",
			},
			"create-epics step-2 additional-context-only test prompt",
		)

		expect(brainstormingOnlyPrompt).to.include("- `/tmp/create-epics-project/discovery/brainstorming.md`")
		expect(brainstormingOnlyPrompt).not.to.include("research.md")
		expect(additionalContextOnlyPrompt).to.include("- `/tmp/create-epics-project/research.md`")
		expect(additionalContextOnlyPrompt).not.to.include("brainstorming.md")
	})
})
