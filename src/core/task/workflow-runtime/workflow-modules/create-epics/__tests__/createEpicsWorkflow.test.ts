import type { WorkflowFormDefinitionPayload, WorkflowFormPanelDefinition } from "@shared/ExtensionMessage"
import { expect } from "chai"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises"
import { describe, it } from "mocha"
import { tmpdir } from "os"
import { join } from "path"
import { WorkflowArtifactFamily } from "../../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionBranchRoute,
	WorkflowFinalDeliveryArtifactResolution,
	WorkflowFinalDeliveryFinalizer,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowValue,
	WorkflowValues,
} from "../../../types"
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
			step: createEpicsWorkflowDefinition.steps["step-1"],
			triggerEvent: buildEntryArtifactResolutionCompletedEvent(creationRequired),
		}),
	).to.equal(true)
}

function expectRouteMatchesWorkflowFormCompleted(route: WorkflowDecisionBranchRoute, workflowFormId: string): void {
	if (route.trigger.kind !== "event_predicate") {
		throw new Error(`Expected event_predicate trigger, received ${route.trigger.kind}.`)
	}

	expect(
		route.trigger.matches({
			activeBranchId: "step-1-await-context-form",
			workflowValues: {},
			step: createEpicsWorkflowDefinition.steps["step-1"],
			triggerEvent: buildWorkflowFormCompletedEvent(workflowFormId),
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
			activeBranchId: branchId,
			workflowValues: {},
			step: createEpicsWorkflowDefinition.steps["step-1"],
			triggerEvent: buildToolBackedOperationEvent(kind, branchId, routeId),
		}),
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

function getFinalizer(): WorkflowFinalDeliveryFinalizer {
	const finalizer = createEpicsWorkflowDefinition.finalDeliveryFinalizer
	if (finalizer === undefined) {
		throw new Error("Missing create-epics final-delivery finalizer.")
	}

	return finalizer
}

function createResolvedIndexArtifact(indexPath: string): WorkflowFinalDeliveryArtifactResolution {
	return {
		artifactId: "epics_index",
		projectTitle: "Create Epics Project",
		projectFolderName: "create-epics-project",
		artifactFamily: WorkflowArtifactFamily.EpicsIndex,
		artifactIdentity: "epics_index",
		artifactFilename: "Epics.index.json",
		artifactRelativePath: "planning/Epics.index.json",
		artifactAbsolutePath: indexPath,
		parentIdentity: undefined,
		targetIdentity: undefined,
		workflowValueWrites: {
			projectTitle: "Create Epics Project",
			projectFolderName: "create-epics-project",
			epics_index_artifact_family: WorkflowArtifactFamily.EpicsIndex,
			epics_index_artifact_identity: "epics_index",
			epics_index_artifact_filename: "Epics.index.json",
			epics_index_artifact_relative_path: "planning/Epics.index.json",
			epics_index_file: indexPath,
		},
	}
}

describe("createEpicsWorkflowDefinition", () => {
	it("declares workflow identity, metadata, persona, value inventory, entry keys, and artifact mappings", () => {
		expect(createEpicsWorkflowDefinition.name).to.equal("create-epics")
		expect(createEpicsWorkflowDefinition.displayName).to.equal("Create Epics")
		expect(createEpicsWorkflowDefinition.description).to.equal(
			"Create a project-level epics document from an existing architecture document, then generate the structured epic index used by downstream planning workflows.",
		)
		expect(createEpicsWorkflowDefinition.slashCommandName).to.equal("create-epics")
		expect(createEpicsWorkflowDefinition.useSkillName).to.equal("create-epics")
		expect(createEpicsWorkflowDefinition.projectSubfolder).to.equal("planning")
		expect(createEpicsWorkflowDefinition.entryPanel.promptMarkdown).to.equal(createEpicsWorkflowDefinition.description)
		expect(createEpicsWorkflowDefinition.persona).to.deep.equal({
			name: "John",
			role: "Product Manager",
			identity: "Drives PRDs through interviews, discovery, and stakeholder alignment.",
			capabilities: ["PRD creation", "discovery", "stakeholder alignment", "interviews"],
			communicationStyle: "Relentlessly asks why. Direct, data-sharp, and cuts the fluff.",
			principles: [
				"Use user-centered design, Jobs-to-be-Done, and opportunity scoring.",
				"Discover real needs from interviews, ship the smallest validator, and put user value first.",
			],
		})
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
		expect(panelA.promptMarkdown).to.equal("Do you have a brainstorming workflow file you'd like to use during this session?")
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
		expect(panelB.promptMarkdown).to.equal("Please provide the full file path to your brainstorming workflow file below.")
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
		expect(panelC.promptMarkdown).to.equal(
			"If you'd like to provide any additional files as context please provide their full file paths below.",
		)
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

	it("builds the Step 2 prompt and exposes only the approved model-facing tools", () => {
		const step2 = createEpicsWorkflowDefinition.steps["step-2"]
		const promptSource = step2.buildPromptSource(
			createPromptInput(step2, {
				output_file: OUTPUT_FILE,
				architecture_document: "/tmp/create-epics-project/planning/architecture.md",
				brainstorming_document: "/tmp/create-epics-project/discovery/brainstorming.md",
				additional_context_files: "/tmp/create-epics-project/research.md",
			}),
		)
		const prompt = promptSource.currentStepInstructions
		if (prompt === undefined) {
			throw new Error("Missing Step 2 prompt source.")
		}

		expect(prompt).to.include(`Read \`${OUTPUT_FILE}\`.`)
		expect(prompt).to.include("Read `/tmp/create-epics-project/planning/architecture.md`.")
		expect(prompt).to.include("Read `/tmp/create-epics-project/discovery/brainstorming.md` when present.")
		expect(prompt).to.include("Read any files listed in `/tmp/create-epics-project/research.md` when present.")
		expect(prompt).to.include("confirm alignment before drafting epics")
		expect(prompt).to.include("coherent capability outcomes")
		expect(prompt).to.include("Call `upsert_epic` for each user-aligned epic.")
		expect(prompt).to.include("Do not use `apply_patch`, `build_workflow_document`, `set_workflow_values`")
		expect(prompt).to.include("Do not draft stories, tasks, subtasks, acceptance criteria, action plans")
		expect(prompt).to.include("run the `pi-planning` workflow for each epic")

		const step2ToolNames = step2.buildToolSchema(createPromptInput(step2, {})).map((schema) => schema.name)
		expect(step2ToolNames).to.deep.equal([
			"read_file",
			"upsert_epic",
			"send_user_message",
			"ask_followup_question",
			"attempt_completion",
		])
		for (const forbiddenToolName of [
			"build_workflow_document",
			"apply_patch",
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

	it("generates Epics.index.json through the final-delivery finalizer and returns index workflow-value writes", async () => {
		const workspace = await mkdtemp(join(tmpdir(), "create-epics-workflow-test-"))
		try {
			const outputFile = join(workspace, "project", "planning", "Epics.md")
			const indexFile = join(workspace, "project", "planning", "Epics.index.json")
			await mkdir(join(workspace, "project", "planning"), { recursive: true })
			await writeFile(
				outputFile,
				`# Context

# Epics

## Epic 2: Second Outcome

### Objective
As a user
I want the second outcome
So that planning can continue

## Epic 1: First Outcome

### Objective
As a user
I want the first outcome
So that planning can start
`,
				"utf8",
			)

			const result = await getFinalizer().finalize({
				session: createSession({ output_file: outputFile }),
				workflowName: "create-epics",
				resolveArtifactOutput: async (artifactId) => {
					expect(artifactId).to.equal("epics_index")
					return createResolvedIndexArtifact(indexFile)
				},
			})

			expect(result.kind).to.equal("succeeded")
			if (result.kind !== "succeeded") {
				throw new Error(`Expected succeeded, received ${result.kind}.`)
			}
			expect(result.workflowValueWrites?.epics_index_file).to.equal(indexFile)
			expect(await readFile(indexFile, "utf8")).to.equal(
				`${JSON.stringify(
					{
						version: 1,
						epics: [
							{ identity: "1", title: "First Outcome" },
							{ identity: "2", title: "Second Outcome" },
						],
					},
					undefined,
					2,
				)}\n`,
			)
		} finally {
			await rm(workspace, { recursive: true, force: true })
		}
	})

	it("returns finalizer failures without writing Epics.index.json", async () => {
		const workspace = await mkdtemp(join(tmpdir(), "create-epics-workflow-test-"))
		try {
			const indexFile = join(workspace, "project", "planning", "Epics.index.json")
			const result = await getFinalizer().finalize({
				session: createSession({}),
				workflowName: "create-epics",
				resolveArtifactOutput: async () => createResolvedIndexArtifact(indexFile),
			})

			expect(result).to.deep.equal({
				kind: "failed",
				errorMessage: "Workflow value 'output_file' must be a non-empty string.",
			})
		} finally {
			await rm(workspace, { recursive: true, force: true })
		}
	})
})
