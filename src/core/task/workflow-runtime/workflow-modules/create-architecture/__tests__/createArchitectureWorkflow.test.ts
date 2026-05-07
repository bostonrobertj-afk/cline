import type { WorkflowFormDefinitionPayload, WorkflowFormPanelDefinition } from "@shared/ExtensionMessage"
import { expect } from "chai"
import { readFileSync } from "fs"
import { describe, it } from "mocha"
import { resolve } from "path"
import { WorkflowArtifactFamily } from "../../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowDecisionAction,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowValue,
	WorkflowValues,
} from "../../../types"
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

function getAction(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionAction {
	const step = createArchitectureWorkflowDefinition.steps[stepId]
	const route = step?.decisionTree.branches[branchId]?.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Missing route ${stepId}/${branchId}/${routeId}.`)
	}

	return route.action
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

function buildPrompt(stepId: WorkflowStepDefinition["id"]): string {
	const step = createArchitectureWorkflowDefinition.steps[stepId]
	const promptSource = step.buildPromptSource(
		createPromptInput(step, {
			output_file: OUTPUT_FILE,
		}),
	)
	const prompt = promptSource.currentStepInstructions
	if (prompt === undefined) {
		throw new Error(`Missing prompt for ${stepId}.`)
	}

	return prompt
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
			"has_context_files",
			"context_files",
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
	})

	it("keeps runtime-driven steps out of project prompts and routes progress decisions for Steps 3 through 8", () => {
		const runtimeDrivenActionKinds: readonly WorkflowDecisionAction["kind"][] = [
			"allocate_artifact",
			"build_workflow_document",
			"render_workflow_form",
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

	it("renders Step 3 through Step 9 prompt sources with output_file and required section instructions", () => {
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
			{
				stepId: "step-9",
				requiredSnippets: [
					`in \`${OUTPUT_FILE}\``,
					"coherence, pattern alignment, and structure alignment",
					"critical, important, or minor",
					"critical issues",
					"important or minor issues",
					"attempt_completion",
					"technical source of truth",
					"create-epics workflow",
				],
			},
		]

		const forbiddenSnippets = [
			"{output_file}",
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
})
