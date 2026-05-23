import type { WorkflowFormDefinitionPayload, WorkflowFormPanelDefinition } from "@shared/ExtensionMessage"
import { expect } from "chai"
import { readFileSync } from "fs"
import { describe, it } from "mocha"
import { resolve } from "path"
import { WorkflowArtifactFamily } from "../../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionAction,
	WorkflowDecisionBranchRoute,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowValues,
} from "../../../types"
import { renderWorkflowPromptTemplate } from "../../../workflowPromptTemplates"
import { buildCreateArchitectureDocumentFromSession } from "../createArchitectureDocument"
import {
	buildCreateArchitectureStep1ToolSchemas,
	buildCreateArchitectureStep2ToolSchemas,
	buildCreateArchitectureStep3ToolSchemas,
	buildCreateArchitectureStep4ToolSchemas,
	buildCreateArchitectureStep5ToolSchemas,
	buildCreateArchitectureStep6ToolSchemas,
	buildCreateArchitectureStep7ToolSchemas,
	buildCreateArchitectureStep8ToolSchemas,
	buildCreateArchitectureStep9ToolSchemas,
} from "../createArchitectureToolSchemas"
import { createArchitectureWorkflowDefinition } from "../createArchitectureWorkflow"

interface ProgressionRouteExpectation {
	stepId: WorkflowStepDefinition["id"]
	branchId: string
	confirmedRouteId: string
	deniedRouteId: string
	nextStepNumber: number
}

interface StepToolSchemaBuilderExpectation {
	stepId: WorkflowStepDefinition["id"]
	buildToolSchema: WorkflowStepDefinition["buildToolSchema"]
}

interface PromptExpectation {
	stepId: WorkflowStepDefinition["id"]
	requiredSnippets: readonly string[]
}

const OUTPUT_FILE = "/tmp/create-architecture-project/planning/architecture.md"

function getStep2Form(): WorkflowFormDefinitionPayload {
	const form = createArchitectureWorkflowDefinition.workflowForms?.["step-2-user-input-form"]
	if (form === undefined) {
		throw new Error("Missing Step 2 input workflow form.")
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

function findRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const step = createArchitectureWorkflowDefinition.steps[stepId]
	const route = step?.decisionTree.branches[branchId]?.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Missing route ${stepId}/${branchId}/${routeId}.`)
	}

	return route
}

function getAction(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionAction {
	const route = findRoute(stepId, branchId, routeId)
	return route.action
}

function buildEntryArtifactResolutionCompletedEvent(creationRequired: boolean): WorkflowBranchTriggerEvent {
	return {
		kind: "entry_artifact_resolution_completed",
		artifactResolutions: [
			{
				artifactId: "architecture_document",
				artifactFamily: WorkflowArtifactFamily.ArchitectureDocument,
				artifactIdentity: "architecture_document",
				artifactFilename: "architecture.md",
				artifactRelativePath: "planning/architecture.md",
				artifactAbsolutePath: OUTPUT_FILE,
				creationRequired,
				existingArtifactAction: creationRequired ? "none" : "continue_existing",
			},
		],
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
		route.trigger.matches({
			activeBranchId: "step-1-resolve-entry-artifact",
			workflowValues: {},
			step: createArchitectureWorkflowDefinition.steps["step-1"],
			triggerEvent: buildEntryArtifactResolutionCompletedEvent(creationRequired),
		}),
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
		route.trigger.matches({
			activeBranchId: "step-1-await-allocation",
			workflowValues: {},
			step: createArchitectureWorkflowDefinition.steps["step-1"],
			triggerEvent: buildToolBackedOperationEvent(kind, branchId, routeId),
		}),
	).to.equal(true)
}

function listRouteActionKinds(step: WorkflowStepDefinition): readonly WorkflowDecisionAction["kind"][] {
	return Object.values(step.decisionTree.branches).flatMap((branch) => branch.routes.map((route) => route.action.kind))
}

function createSession(workflowValues: WorkflowValues): ActiveWorkflowSession {
	return {
		activeStepNumber: 1,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Create Architecture Project",
			projectFolderName: "create-architecture-project",
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
			activeBranchId: "entry",
		},
	}
}

function createPromptInput(step: WorkflowStepDefinition, workflowValues: WorkflowValues): WorkflowPromptBuilderInput {
	return {
		session: createSession(workflowValues),
		step,
	}
}

function buildPrompt(
	stepId: WorkflowStepDefinition["id"],
	workflowValues: WorkflowValues = { output_file: OUTPUT_FILE, creation_required: true },
): string {
	const step = createArchitectureWorkflowDefinition.steps[stepId]
	const promptSource = step.buildPromptSource(createPromptInput(step, workflowValues))
	if (promptSource.kind !== "current_step_instruction_template") {
		throw new Error(`Missing current step instruction template for ${stepId}.`)
	}

	const template = promptSource.currentStepInstructionTemplate
	return renderWorkflowPromptTemplate({
		template,
		workflowValueKeys: createArchitectureWorkflowDefinition.workflowValueKeys,
		workflowValues,
		context: `create-architecture ${stepId} test prompt`,
	})
}

describe("createArchitectureWorkflowDefinition", () => {
	it("declares workflow identity, persona, project subfolder, entry copy, checklist labels, value inventory, and entry keys", () => {
		expect(createArchitectureWorkflowDefinition.name).to.equal("create-architecture")
		expect(createArchitectureWorkflowDefinition.displayName).to.equal("Create Architecture")
		expect(createArchitectureWorkflowDefinition.description).to.equal(
			"Create a complete architecture document through collaborative discovery, explicit design decisions, and a final readiness review.",
		)
		expect(createArchitectureWorkflowDefinition.useSkillName).to.equal("create-architecture")
		expect(createArchitectureWorkflowDefinition.slashCommandName).to.equal("create-architecture")
		expect(createArchitectureWorkflowDefinition.persona).to.deep.equal({
			name: "Winston",
			role: "Architect",
			identity: "Designs scalable systems and chooses practical technology with care.",
			capabilities: ["distributed systems", "cloud", "API design", "scalability"],
			communicationStyle: "Calm, pragmatic, and tradeoff-aware.",
			principles: [
				"Prefer simple, boring solutions that scale when needed.",
				"Let user journeys, business value, and developer productivity guide technical decisions.",
			],
		})
		expect(createArchitectureWorkflowDefinition.projectSubfolder).to.equal("planning")
		expect(createArchitectureWorkflowDefinition.entryPanel.promptMarkdown).to.equal(
			createArchitectureWorkflowDefinition.description,
		)
		expect(Object.values(createArchitectureWorkflowDefinition.steps).map((step) => step.checklistLabel)).to.deep.equal([
			"Generate Output Document",
			"Gather User Inputs",
			"Establish Architecture Foundational Elements",
			"Revolve Responsibility & Ownership",
			"Code Alignment Assessment",
			"Identify Key Tradeoffs & Risks",
			"Map out Blast Radius",
			"Build Project Roadmap",
			"Finalize Architecture Document",
		])
		expect(createArchitectureWorkflowDefinition.workflowValueKeys).to.deep.equal([
			"projectMode",
			"projectTitle",
			"projectFolderName",
			"creation_required",
			"has_context_files",
			"context_files",
			"change_plan",
			"scope",
			"has_architectural_goals",
			"architectural_goals",
			"has_core_architectural_rules",
			"core_architectural_rules",
			"output_file",
			"output_artifact_family",
			"output_artifact_identity",
			"output_artifact_filename",
			"output_artifact_relative_path",
		])
		expect(createArchitectureWorkflowDefinition.entryProjectValueKeys).to.deep.equal({
			projectMode: "projectMode",
			projectTitle: "projectTitle",
			projectFolderName: "projectFolderName",
		})
	})

	it("declares the architecture singleton artifact definition", () => {
		const artifact = createArchitectureWorkflowDefinition.artifacts?.architecture_document

		expect(artifact).to.deep.equal({
			id: "architecture_document",
			family: WorkflowArtifactFamily.ArchitectureDocument,
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
	})

	it("defines the Step 2 input form panels, transitions, durable fields, and stale clearing", () => {
		const form = getStep2Form()
		expect(form.firstPanelId).to.equal("step-2-context-files-check-panel")
		expect(Object.keys(form.panels)).to.deep.equal([
			"step-2-context-files-check-panel",
			"step-2-context-files-detail-panel",
			"step-2-scope-panel",
			"step-2-architectural-goals-check-panel",
			"step-2-architectural-goals-detail-panel",
			"step-2-core-rules-check-panel",
			"step-2-core-rules-detail-panel",
			"step-2-change-plan-check-panel",
			"step-2-change-plan-detail-panel",
		])

		const contextCheckPanel = getPanel(form, "step-2-context-files-check-panel")
		expect(contextCheckPanel.promptMarkdown).to.equal(
			"Are there any files which you'd like to provide as context for this session?",
		)
		expect(contextCheckPanel.fields[0]).to.deep.include({
			key: "has_context_files",
			workflowValueKey: "has_context_files",
			kind: "boolean",
			required: true,
			allowedValueType: "boolean",
		})
		expect(contextCheckPanel.transition).to.deep.equal({
			type: "conditional",
			conditionSourceKey: "has_context_files",
			branches: [
				{ matchValue: true, nextPanelId: "step-2-context-files-detail-panel" },
				{
					matchValue: false,
					nextPanelId: "step-2-scope-panel",
					staleValueKeysToClear: ["context_files"],
				},
			],
			defaultNextPanelId: "step-2-scope-panel",
		})

		const contextDetailPanel = getPanel(form, "step-2-context-files-detail-panel")
		expect(contextDetailPanel.fields[0]).to.deep.include({
			key: "context_files",
			workflowValueKey: "context_files",
			kind: "large_text",
			required: true,
			allowedValueType: "string",
		})
		expect(contextDetailPanel.fields[0]?.presentation).to.deep.equal({ textareaSize: "large" })
		expect(contextDetailPanel.transition).to.deep.equal({
			type: "sequential",
			nextPanelId: "step-2-scope-panel",
		})

		const scopePanel = getPanel(form, "step-2-scope-panel")
		expect(scopePanel.fields[0]).to.deep.include({
			key: "scope",
			workflowValueKey: "scope",
			kind: "large_text",
			required: true,
			allowedValueType: "string",
		})
		expect(scopePanel.fields[0]?.presentation).to.deep.equal({ textareaSize: "large" })
		expect(scopePanel.transition).to.deep.equal({
			type: "sequential",
			nextPanelId: "step-2-architectural-goals-check-panel",
		})

		const goalsCheckPanel = getPanel(form, "step-2-architectural-goals-check-panel")
		expect(goalsCheckPanel.fields[0]).to.deep.include({
			key: "has_architectural_goals",
			workflowValueKey: "has_architectural_goals",
			kind: "boolean",
			required: true,
			allowedValueType: "boolean",
		})
		expect(goalsCheckPanel.transition).to.deep.equal({
			type: "conditional",
			conditionSourceKey: "has_architectural_goals",
			branches: [
				{ matchValue: true, nextPanelId: "step-2-architectural-goals-detail-panel" },
				{
					matchValue: false,
					nextPanelId: "step-2-core-rules-check-panel",
					staleValueKeysToClear: ["architectural_goals"],
				},
			],
			defaultNextPanelId: "step-2-core-rules-check-panel",
		})

		const goalsDetailPanel = getPanel(form, "step-2-architectural-goals-detail-panel")
		expect(goalsDetailPanel.fields[0]).to.deep.include({
			key: "architectural_goals",
			workflowValueKey: "architectural_goals",
			kind: "large_text",
			required: true,
			allowedValueType: "string",
		})
		expect(goalsDetailPanel.fields[0]?.presentation).to.deep.equal({ textareaSize: "large" })
		expect(goalsDetailPanel.transition).to.deep.equal({
			type: "sequential",
			nextPanelId: "step-2-core-rules-check-panel",
		})

		const rulesCheckPanel = getPanel(form, "step-2-core-rules-check-panel")
		expect(rulesCheckPanel.fields[0]).to.deep.include({
			key: "has_core_architectural_rules",
			workflowValueKey: "has_core_architectural_rules",
			kind: "boolean",
			required: true,
			allowedValueType: "boolean",
		})
		expect(rulesCheckPanel.transition).to.deep.equal({
			type: "conditional",
			conditionSourceKey: "has_core_architectural_rules",
			branches: [
				{ matchValue: true, nextPanelId: "step-2-core-rules-detail-panel" },
				{
					matchValue: false,
					terminal: true,
					staleValueKeysToClear: ["core_architectural_rules"],
				},
			],
			defaultTerminal: true,
		})

		const rulesDetailPanel = getPanel(form, "step-2-core-rules-detail-panel")
		expect(rulesDetailPanel.fields[0]).to.deep.include({
			key: "core_architectural_rules",
			workflowValueKey: "core_architectural_rules",
			kind: "large_text",
			required: true,
			allowedValueType: "string",
		})
		expect(rulesDetailPanel.fields[0]?.presentation).to.deep.equal({ textareaSize: "large" })
		expect(rulesDetailPanel.transition).to.deep.equal({
			type: "conditional",
			conditionSourceKey: "__terminal__",
			branches: [],
			defaultTerminal: true,
		})

		expect(getPanel(form, "step-2-change-plan-check-panel")).to.deep.equal({
			panelId: "step-2-change-plan-check-panel",
			title: "Existing Architecture Document",
			promptMarkdown:
				"It looks like this project already has an architecture document. Do you have a change management plan to provide?",
			fields: [
				{
					key: "has_change_plan",
					kind: "boolean",
					label: "select one",
					required: true,
					allowedValueType: "boolean",
					trueLabel: "yes",
					falseLabel: "no",
				},
			],
			allowedActions: ["submit"],
			actionLabels: {
				submit: "submit",
			},
			transition: {
				type: "conditional",
				conditionSourceKey: "has_change_plan",
				branches: [
					{ matchValue: true, nextPanelId: "step-2-change-plan-detail-panel" },
					{
						matchValue: false,
						terminal: true,
						staleValueKeysToClear: ["change_plan"],
					},
				],
				defaultTerminal: true,
			},
		})

		expect(getPanel(form, "step-2-change-plan-detail-panel")).to.deep.equal({
			panelId: "step-2-change-plan-detail-panel",
			title: "Provide File Path",
			promptMarkdown: "Please provide the full file path for your change management plan.",
			fields: [
				{
					key: "change_plan",
					workflowValueKey: "change_plan",
					kind: "small_text",
					label: "file path",
					required: true,
					allowedValueType: "string",
				},
			],
			allowedActions: ["submit", "back"],
			actionLabels: {
				submit: "submit",
				back: "back",
			},
			backDestinationPanelId: "step-2-change-plan-check-panel",
			backStaleValueKeysToClear: ["change_plan"],
			transition: {
				type: "conditional",
				conditionSourceKey: "__terminal__",
				branches: [],
				defaultTerminal: true,
			},
		})
	})

	it("uses entry artifact resolution as the Step 1 entry branch", () => {
		const step1 = createArchitectureWorkflowDefinition.steps["step-1"]
		expect(step1.decisionTree.entryBranchId).to.equal("step-1-resolve-entry-artifact")
	})

	it("allocates architecture_document after entry artifact resolution requires creation", () => {
		const creationRequiredRoute = findRoute("step-1", "step-1-resolve-entry-artifact", "step-1-allocate-artifact")

		expectRouteMatchesEntryArtifactResolution(creationRequiredRoute, true)
		expect(creationRequiredRoute.action).to.deep.include({
			kind: "allocate_artifact",
			artifactId: "architecture_document",
		})
		expect(creationRequiredRoute.followingBranchId).to.equal("step-1-await-allocation")
	})

	it("persists existing architecture document selection before Step 2", async () => {
		const continueExistingRoute = findRoute("step-1", "step-1-resolve-entry-artifact", "step-1-continue-existing-artifact")

		expectRouteMatchesEntryArtifactResolution(continueExistingRoute, false)
		const continueExistingAction = continueExistingRoute.action
		expect(continueExistingAction.kind).to.equal("run_deterministic_procedure")
		if (continueExistingAction.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${continueExistingAction.kind}.`)
		}
		const result = await Promise.resolve(continueExistingAction.instruction.run(createSession({})))
		expect(result).to.deep.equal({
			kind: "succeeded",
			workflowValueWrites: {
				creation_required: false,
			},
		})
		expect(continueExistingRoute.followingBranchId).to.equal("step-1-transition-existing-artifact-to-step-2")
	})

	it("transitions existing architecture documents from Step 1 to Step 2", () => {
		const transitionRoute = findRoute(
			"step-1",
			"step-1-transition-existing-artifact-to-step-2",
			"step-1-transition-existing-artifact-to-step-2",
		)

		expect(transitionRoute.trigger).to.deep.equal({ kind: "always" })
		expect(transitionRoute.action).to.deep.equal({
			kind: "transition_step",
			target: {
				kind: "entry_branch",
				stepNumber: 2,
			},
		})
	})

	it("listens for first allocation results from the entry artifact allocation route", () => {
		const initialShellRoute = findRoute("step-1", "step-1-await-allocation", "step-1-build-initial-shell")
		expectRouteMatchesToolBackedOperationEvent(
			initialShellRoute,
			"tool_backed_operation_succeeded",
			"step-1-resolve-entry-artifact",
			"step-1-allocate-artifact",
		)

		const retryAllocationRoute = findRoute("step-1", "step-1-await-allocation", "step-1-retry-allocate-artifact")
		expectRouteMatchesToolBackedOperationEvent(
			retryAllocationRoute,
			"tool_backed_operation_failed",
			"step-1-resolve-entry-artifact",
			"step-1-allocate-artifact",
		)
	})

	it("persists creation_required while building new architecture document shells", () => {
		const initialShellRoute = findRoute("step-1", "step-1-await-allocation", "step-1-build-initial-shell")
		const retryShellRoute = findRoute("step-1", "step-1-await-retry-allocation", "step-1-build-initial-shell-after-retry")
		for (const route of [initialShellRoute, retryShellRoute]) {
			const action = route.action
			expect(action.kind).to.equal("build_workflow_document")
			if (action.kind !== "build_workflow_document") {
				throw new Error(`Expected build_workflow_document, received ${action.kind}.`)
			}
			expect(action.instruction.workflowValueWrites).to.deep.equal({
				creation_required: true,
			})
		}
	})

	it("renders the creation Step 2 form from the initial input panel", () => {
		const route = findRoute("step-2", "step-2-render-input-form", "step-2-render-creation-input-form")

		expect(route.action).to.deep.equal({
			kind: "render_workflow_form",
			workflowFormId: "step-2-user-input-form",
			startPanelId: "step-2-context-files-check-panel",
		})
		expect(route.followingBranchId).to.equal("step-2-await-input-form")
		const trigger = route.trigger
		expect(trigger.kind).to.equal("session_predicate")
		if (trigger.kind !== "session_predicate") {
			throw new Error(`Expected session_predicate, received ${trigger.kind}.`)
		}
		expect(
			trigger.matches({
				activeBranchId: "step-2-render-input-form",
				workflowValues: { creation_required: true },
				step: createArchitectureWorkflowDefinition.steps["step-2"],
			}),
		).to.equal(true)
		expect(
			trigger.matches({
				activeBranchId: "step-2-render-input-form",
				workflowValues: { creation_required: false },
				step: createArchitectureWorkflowDefinition.steps["step-2"],
			}),
		).to.equal(false)
	})

	it("renders the existing-document Step 2 form from the change-plan panel", () => {
		const route = findRoute("step-2", "step-2-render-input-form", "step-2-render-existing-document-form")

		expect(route.action).to.deep.equal({
			kind: "render_workflow_form",
			workflowFormId: "step-2-user-input-form",
			startPanelId: "step-2-change-plan-check-panel",
		})
		expect(route.followingBranchId).to.equal("step-2-await-input-form")
		const trigger = route.trigger
		expect(trigger.kind).to.equal("session_predicate")
		if (trigger.kind !== "session_predicate") {
			throw new Error(`Expected session_predicate, received ${trigger.kind}.`)
		}
		expect(
			trigger.matches({
				activeBranchId: "step-2-render-input-form",
				workflowValues: { creation_required: false },
				step: createArchitectureWorkflowDefinition.steps["step-2"],
			}),
		).to.equal(true)
		expect(
			trigger.matches({
				activeBranchId: "step-2-render-input-form",
				workflowValues: { creation_required: true },
				step: createArchitectureWorkflowDefinition.steps["step-2"],
			}),
		).to.equal(false)
	})

	it("builds submitted Step 2 values only for new architecture documents", () => {
		const route = findRoute("step-2", "step-2-await-input-form", "step-2-build-submitted-values-document")
		const trigger = route.trigger
		expect(trigger.kind).to.equal("event_predicate")
		if (trigger.kind !== "event_predicate") {
			throw new Error(`Expected event_predicate, received ${trigger.kind}.`)
		}
		expect(
			trigger.matches({
				activeBranchId: "step-2-await-input-form",
				workflowValues: { creation_required: true },
				step: createArchitectureWorkflowDefinition.steps["step-2"],
				triggerEvent: { kind: "workflow_form_completed", workflowFormId: "step-2-user-input-form" },
			}),
		).to.equal(true)
		expect(
			trigger.matches({
				activeBranchId: "step-2-await-input-form",
				workflowValues: { creation_required: false },
				step: createArchitectureWorkflowDefinition.steps["step-2"],
				triggerEvent: { kind: "workflow_form_completed", workflowFormId: "step-2-user-input-form" },
			}),
		).to.equal(false)

		const action = route.action
		expect(action.kind).to.equal("build_workflow_document")
		if (action.kind !== "build_workflow_document") {
			throw new Error(`Expected build_workflow_document, received ${action.kind}.`)
		}
		expect(action.instruction.artifactId).to.equal("architecture_document")
		expect(action.instruction.buildContent).to.equal(buildCreateArchitectureDocumentFromSession)
		expect(action.instruction.workflowValueWrites).to.equal(undefined)
		expect(route.followingBranchId).to.equal("step-2-await-submitted-values-document")
	})

	it("transitions existing architecture documents from Step 2 to Step 9", () => {
		const route = findRoute("step-2", "step-2-await-input-form", "step-2-transition-existing-document-to-step-9")
		const trigger = route.trigger
		expect(trigger.kind).to.equal("event_predicate")
		if (trigger.kind !== "event_predicate") {
			throw new Error(`Expected event_predicate, received ${trigger.kind}.`)
		}
		expect(
			trigger.matches({
				activeBranchId: "step-2-await-input-form",
				workflowValues: { creation_required: false },
				step: createArchitectureWorkflowDefinition.steps["step-2"],
				triggerEvent: { kind: "workflow_form_completed", workflowFormId: "step-2-user-input-form" },
			}),
		).to.equal(true)
		expect(
			trigger.matches({
				activeBranchId: "step-2-await-input-form",
				workflowValues: { creation_required: true },
				step: createArchitectureWorkflowDefinition.steps["step-2"],
				triggerEvent: { kind: "workflow_form_completed", workflowFormId: "step-2-user-input-form" },
			}),
		).to.equal(false)
		expect(route.action).to.deep.equal({
			kind: "transition_step",
			target: {
				kind: "entry_branch",
				stepNumber: 9,
			},
		})
		expect(route).not.to.have.property("followingBranchId")
	})

	it("keeps runtime-driven steps out of project prompts and routes progress decisions for Steps 3 through 8", () => {
		const runtimeDrivenActionKinds: readonly WorkflowDecisionAction["kind"][] = [
			"allocate_artifact",
			"build_workflow_document",
			"render_workflow_form",
			"run_deterministic_procedure",
			"transition_step",
			"terminal_error",
		]

		for (const stepId of ["step-1", "step-2"] as const) {
			const actionKinds = listRouteActionKinds(createArchitectureWorkflowDefinition.steps[stepId])
			expect(actionKinds).not.to.include("project_prompt")
			for (const actionKind of actionKinds) {
				expect(runtimeDrivenActionKinds).to.include(actionKind)
			}
		}

		const progressionCases: readonly ProgressionRouteExpectation[] = [
			{
				stepId: "step-3",
				branchId: "step-3-await-progress-request",
				confirmedRouteId: "step-3-transition-to-step-4",
				deniedRouteId: "step-3-continue-current-step",
				nextStepNumber: 4,
			},
			{
				stepId: "step-4",
				branchId: "step-4-await-progress-request",
				confirmedRouteId: "step-4-transition-to-step-5",
				deniedRouteId: "step-4-continue-current-step",
				nextStepNumber: 5,
			},
			{
				stepId: "step-5",
				branchId: "step-5-await-progress-request",
				confirmedRouteId: "step-5-transition-to-step-6",
				deniedRouteId: "step-5-continue-current-step",
				nextStepNumber: 6,
			},
			{
				stepId: "step-6",
				branchId: "step-6-await-progress-request",
				confirmedRouteId: "step-6-transition-to-step-7",
				deniedRouteId: "step-6-continue-current-step",
				nextStepNumber: 7,
			},
			{
				stepId: "step-7",
				branchId: "step-7-await-progress-request",
				confirmedRouteId: "step-7-transition-to-step-8",
				deniedRouteId: "step-7-continue-current-step",
				nextStepNumber: 8,
			},
			{
				stepId: "step-8",
				branchId: "step-8-await-progress-request",
				confirmedRouteId: "step-8-transition-to-step-9",
				deniedRouteId: "step-8-continue-current-step",
				nextStepNumber: 9,
			},
		]

		for (const progressionCase of progressionCases) {
			const confirmedAction = getAction(progressionCase.stepId, progressionCase.branchId, progressionCase.confirmedRouteId)
			expect(confirmedAction.kind).to.equal("transition_step")
			if (confirmedAction.kind !== "transition_step") {
				throw new Error(`Expected transition_step, received ${confirmedAction.kind}.`)
			}
			expect(confirmedAction.target).to.deep.equal({
				kind: "entry_branch",
				stepNumber: progressionCase.nextStepNumber,
			})

			const deniedAction = getAction(progressionCase.stepId, progressionCase.branchId, progressionCase.deniedRouteId)
			expect(deniedAction).to.deep.equal({
				kind: "project_prompt",
			})
		}
	})

	it("routes the Step 9 project prompt to the attempt-completion await branch", () => {
		const step9ProjectPromptRoute = findRoute("step-9", "step-9-project-prompt", "step-9-project-prompt")

		expect(step9ProjectPromptRoute.action.kind).to.equal("project_prompt")
		expect(step9ProjectPromptRoute.followingBranchId).to.equal("step-9-await-attempt-completion")
	})

	it("listens for successful Step 9 attempt_completion before completing the workflow", () => {
		const completionRoute = findRoute(
			"step-9",
			"step-9-await-attempt-completion",
			"step-9-complete-workflow-after-attempt-completion",
		)

		expect(completionRoute.trigger).to.deep.equal({
			kind: "on_event",
			eventKind: "attempt_completion_succeeded",
		})
	})

	it("completes the workflow after successful Step 9 attempt_completion", () => {
		const completionRoute = findRoute(
			"step-9",
			"step-9-await-attempt-completion",
			"step-9-complete-workflow-after-attempt-completion",
		)

		expect(completionRoute.action).to.deep.equal({
			kind: "complete_workflow",
		})
	})

	it("delegates every buildToolSchema directly to named create-architecture builders", () => {
		const expectations: readonly StepToolSchemaBuilderExpectation[] = [
			{ stepId: "step-1", buildToolSchema: buildCreateArchitectureStep1ToolSchemas },
			{ stepId: "step-2", buildToolSchema: buildCreateArchitectureStep2ToolSchemas },
			{ stepId: "step-3", buildToolSchema: buildCreateArchitectureStep3ToolSchemas },
			{ stepId: "step-4", buildToolSchema: buildCreateArchitectureStep4ToolSchemas },
			{ stepId: "step-5", buildToolSchema: buildCreateArchitectureStep5ToolSchemas },
			{ stepId: "step-6", buildToolSchema: buildCreateArchitectureStep6ToolSchemas },
			{ stepId: "step-7", buildToolSchema: buildCreateArchitectureStep7ToolSchemas },
			{ stepId: "step-8", buildToolSchema: buildCreateArchitectureStep8ToolSchemas },
			{ stepId: "step-9", buildToolSchema: buildCreateArchitectureStep9ToolSchemas },
		]

		for (const expectation of expectations) {
			expect(createArchitectureWorkflowDefinition.steps[expectation.stepId].buildToolSchema).to.equal(
				expectation.buildToolSchema,
			)
		}

		const source = readFileSync(resolve(__dirname, "../createArchitectureWorkflow.ts"), "utf8")
		expect(source).not.to.include("buildToolSchema: () => []")
		expect(source).not.to.match(/buildToolSchema:\s*\([^)]*\)\s*=>\s*\[\s*\]/)
	})

	it("renders Step 3 through Step 8 prompt sources with output_file and required section instructions", () => {
		const promptExpectations: readonly PromptExpectation[] = [
			{
				stepId: "step-3",
				requiredSnippets: [
					`Read \`${OUTPUT_FILE}\`.`,
					"Relevant Context",
					"Project Context Analysis",
					"Scope, Architectural goals, and Core architectural rules",
					"Interpretation",
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-4",
				requiredSnippets: [
					`Read \`${OUTPUT_FILE}\`.`,
					"Responsibility Boundaries",
					"Durable vs Transient Ownership",
					"Required Additional Baseline for Authority Enforcement",
					"runtime code, and tests",
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-5",
				requiredSnippets: [
					`Read \`${OUTPUT_FILE}\`.`,
					"current runtime code and tests",
					"Aligned",
					"Partially aligned",
					"Not aligned / conflicts",
					"Brief the user",
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-6",
				requiredSnippets: [
					`Read \`${OUTPUT_FILE}\``,
					"key tradeoffs and risks",
					"additional code assessment",
					"Tradeoffs and Risks",
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-7",
				requiredSnippets: [
					`Read \`${OUTPUT_FILE}\`.`,
					"comprehensive project blast radius",
					"files, modules, directories, shared components, and integration boundaries",
					"Project Blast Radius",
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-8",
				requiredSnippets: [
					`Read \`${OUTPUT_FILE}\`.`,
					"key dependencies",
					"Dependencies",
					"dependencies and blast radius",
					"Project Roadmap",
					"workflow_progress_request",
				],
			},
		]

		const forbiddenSnippets = [
			"{output_file}",
			"{workflow.output_file}",
			"{workflow.projectTitle}",
			"{workflow.projectFolderName}",
			"{workflow.change_plan}",
			"build_workflow_document",
			"set_workflow_values",
			"/Users/robertboston/Documents/Cline/Workflows/create-architecture.md",
			"create-architecture.md",
			"_bmad",
			".cline/workflow-config.yaml",
			"placeholder workflow",
			"managed-workflow",
		]

		for (const promptExpectation of promptExpectations) {
			const prompt = buildPrompt(promptExpectation.stepId)
			expect(prompt).to.include(OUTPUT_FILE)
			for (const requiredSnippet of promptExpectation.requiredSnippets) {
				expect(prompt).to.include(requiredSnippet)
			}
			for (const forbiddenSnippet of forbiddenSnippets) {
				expect(prompt).not.to.include(forbiddenSnippet)
			}
			expect(prompt.toLowerCase()).not.to.include("bmad")
		}
	})

	it("renders the Step 9 new-document prompt without existing-document values", () => {
		const prompt = buildPrompt("step-9", {
			output_file: OUTPUT_FILE,
			creation_required: true,
			projectTitle: "Create Architecture Project",
			projectFolderName: "create-architecture-project",
			change_plan: "/tmp/change-management-plan.md",
		})

		expect(prompt).not.to.equal("")
		expect(prompt).not.to.include(OUTPUT_FILE)
		expect(prompt).not.to.include("Create Architecture Project")
		expect(prompt).not.to.include("create-architecture-project")
		expect(prompt).not.to.include("/tmp/change-management-plan.md")
		for (const forbiddenSnippet of [
			"{output_file}",
			"{projectTitle}",
			"{projectFolderName}",
			"{change_plan}",
			"{workflow.output_file}",
			"{workflow.projectTitle}",
			"{workflow.projectFolderName}",
			"{workflow.change_plan}",
			"output_document",
		]) {
			expect(prompt).not.to.include(forbiddenSnippet)
		}
	})

	it("renders the Step 9 existing-document prompt without a change plan", () => {
		const prompt = buildPrompt("step-9", {
			output_file: OUTPUT_FILE,
			creation_required: false,
			projectTitle: "Create Architecture Project",
			projectFolderName: "create-architecture-project",
		})

		expect(prompt).not.to.equal("")
		expect(prompt).to.include(OUTPUT_FILE)
		expect(prompt).to.include("Create Architecture Project")
		expect(prompt).to.include("create-architecture-project")
		for (const forbiddenSnippet of [
			"{output_file}",
			"{projectTitle}",
			"{projectFolderName}",
			"{change_plan}",
			"{workflow.output_file}",
			"{workflow.projectTitle}",
			"{workflow.projectFolderName}",
			"{workflow.change_plan}",
			"output_document",
		]) {
			expect(prompt).not.to.include(forbiddenSnippet)
		}
	})

	it("renders the Step 9 existing-document prompt with a change plan", () => {
		const prompt = buildPrompt("step-9", {
			output_file: OUTPUT_FILE,
			creation_required: false,
			projectTitle: "Create Architecture Project",
			projectFolderName: "create-architecture-project",
			change_plan: "/tmp/change-management-plan.md",
		})

		expect(prompt).not.to.equal("")
		expect(prompt).to.include(OUTPUT_FILE)
		expect(prompt).to.include("/tmp/change-management-plan.md")
		for (const forbiddenSnippet of [
			"{output_file}",
			"{projectTitle}",
			"{projectFolderName}",
			"{change_plan}",
			"{workflow.output_file}",
			"{workflow.projectTitle}",
			"{workflow.projectFolderName}",
			"{workflow.change_plan}",
			"output_document",
		]) {
			expect(prompt).not.to.include(forbiddenSnippet)
		}
	})
})
