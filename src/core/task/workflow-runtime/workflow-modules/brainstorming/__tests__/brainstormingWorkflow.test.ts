import { expect } from "chai"
import { describe, it } from "mocha"
import { WorkflowArtifactFamily } from "../../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowDecisionAction,
	WorkflowDecisionBranchRoute,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowValue,
	WorkflowValues,
} from "../../../types"
import { buildBrainstormingDocumentFromSession } from "../brainstormingDocument"
import { BRAINSTORMING_TECHNIQUES } from "../brainstormingTechniqueRegistry"
import {
	buildBrainstormingStep1ToolSchemas,
	buildBrainstormingStep2ToolSchemas,
	buildBrainstormingStep3ToolSchemas,
	buildBrainstormingStep4ToolSchemas,
} from "../brainstormingToolSchemas"
import { brainstormingWorkflowDefinition } from "../brainstormingWorkflow"

const OUTPUT_FILE = "/tmp/brainstorming-project/discovery/brainstorming.md"

function createSession(workflowValues: WorkflowValues): ActiveWorkflowSession {
	return {
		activeStepNumber: 1,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Brainstorming Project",
			projectFolderName: "brainstorming-project",
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

function findRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const step = brainstormingWorkflowDefinition.steps[stepId]
	const route = step?.decisionTree.branches[branchId]?.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Missing route ${stepId}/${branchId}/${routeId}.`)
	}

	return route
}

function getAction(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionAction {
	return findRoute(stepId, branchId, routeId).action
}

function expectToolNames(toolNames: readonly string[], expectedToolNames: readonly string[]): void {
	expect(toolNames).to.deep.equal(expectedToolNames)
}

function listRouteActionKinds(step: WorkflowStepDefinition): readonly WorkflowDecisionAction["kind"][] {
	return Object.values(step.decisionTree.branches).flatMap((branch) => branch.routes.map((route) => route.action.kind))
}

describe("brainstormingWorkflowDefinition", () => {
	it("declares workflow identity, checklist labels, value inventory, entry project keys, and artifact mapping", () => {
		expect(brainstormingWorkflowDefinition.name).to.equal("brainstorming")
		expect(brainstormingWorkflowDefinition.displayName).to.equal("Brainstorming")
		expect(brainstormingWorkflowDefinition.description).to.equal(
			"This workflow guides an interactive brainstorming session, captures the session topic and goals, helps resolve an appropriate brainstorming technique, records generated ideas, and writes the session output to brainstorming.md.",
		)
		expect(brainstormingWorkflowDefinition.slashCommandName).to.equal("brainstorming")
		expect(brainstormingWorkflowDefinition.useSkillName).to.equal("brainstorming")
		expect(brainstormingWorkflowDefinition.persona).to.deep.equal({
			name: "Mary",
			role: "Analyst",
			identity:
				"Mary is an insightful analyst who helps turn messy ideas into clear options through brainstorming, market research, competitive analysis, and requirements elicitation.",
			capabilities: ["brainstorming", "ideation", "market research", "competitive analysis", "requirements elicitation"],
			communicationStyle: "Curious, precise, evidence-driven, and discovery-oriented.",
			principles: [
				"Use structured analysis such as Porter's Five Forces, SWOT, root-cause analysis, brainstorming methods, and competitive intelligence to uncover what matters.",
			],
		})
		expect(brainstormingWorkflowDefinition.persona.name).to.equal("Mary")
		expect(brainstormingWorkflowDefinition.persona).not.to.equal("analyst")
		expect(brainstormingWorkflowDefinition.projectSubfolder).to.equal("discovery")
		expect(Object.values(brainstormingWorkflowDefinition.steps).map((step) => step.checklistLabel)).to.deep.equal([
			"Gather Inputs",
			"Resolve Session Approach",
			"Perform Interactive Brainstorming",
			"Organize Ideas & Plan Next Actions",
		])

		expect(brainstormingWorkflowDefinition.workflowValueKeys).to.include.members([
			"projectMode",
			"projectTitle",
			"projectFolderName",
			"context_file",
			"session_topic",
			"has_session_goals",
			"session_goals",
			"selected_approach",
			"selected_techniques",
			"random_technique_candidate",
			"random_technique_rejected_ids",
			"random_technique_confirmation",
			"techniques_used",
			"ideas_generated",
			"output_file",
			"output_artifact_family",
			"output_artifact_identity",
			"output_artifact_filename",
			"output_artifact_relative_path",
			"chosen_technique_id",
		])
		expect(brainstormingWorkflowDefinition.workflowValueKeys).not.to.include("selected_technique")
		expect(brainstormingWorkflowDefinition.entryProjectValueKeys).to.deep.equal({
			projectMode: "projectMode",
			projectTitle: "projectTitle",
			projectFolderName: "projectFolderName",
		})

		expect(brainstormingWorkflowDefinition.entryPanel.promptMarkdown).to.include(
			"guides an interactive brainstorming session",
		)
		expect(brainstormingWorkflowDefinition.entryPanel.promptMarkdown).to.equal(brainstormingWorkflowDefinition.description)
		const artifact = brainstormingWorkflowDefinition.artifacts?.brainstorming_session
		expect(artifact).to.deep.equal({
			id: "brainstorming_session",
			family: WorkflowArtifactFamily.BrainstormingSession,
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

	it("defines the Step 1 setup form and ordered artifact/form/document pipeline", () => {
		const step1 = brainstormingWorkflowDefinition.steps["step-1"]
		expect(step1.buildToolSchema).to.equal(buildBrainstormingStep1ToolSchemas)

		const setupForm = brainstormingWorkflowDefinition.workflowForms?.["step-1-setup-form"]
		expect(setupForm?.firstPanelId).to.equal("step-1-context-panel")
		expect(Object.keys(setupForm?.panels ?? {})).to.deep.equal([
			"step-1-context-panel",
			"step-1-topic-panel",
			"step-1-goals-check-panel",
			"step-1-goals-detail-panel",
		])
		expect(setupForm?.panels["step-1-context-panel"]?.promptMarkdown).to.equal(
			"You can provide a file to be used as context. If you have a file you'd like to use, enter the file path below. If not, leave the text box empty and click continue",
		)
		expect(setupForm?.panels["step-1-topic-panel"]?.fields[0]).to.include({
			key: "session_topic",
			workflowValueKey: "session_topic",
			kind: "large_text",
			required: true,
		})
		expect(setupForm?.panels["step-1-goals-check-panel"]?.fields[0]).to.include({
			key: "has_session_goals",
			workflowValueKey: "has_session_goals",
			kind: "boolean",
			required: true,
		})
		const noSessionGoalsBranch =
			setupForm?.panels["step-1-goals-check-panel"]?.transition.type === "conditional"
				? setupForm.panels["step-1-goals-check-panel"]?.transition.branches.find((branch) => branch.matchValue === false)
				: undefined
		expect(noSessionGoalsBranch?.staleValueKeysToClear).to.deep.equal(["session_goals"])
		expect(setupForm?.panels["step-1-goals-detail-panel"]?.promptMarkdown).to.equal("What are your goals for this session?")

		const entryRoute = findRoute("step-1", "step-1-allocate-artifact", "step-1-allocate-artifact")
		expect(entryRoute.action).to.deep.include({
			kind: "allocate_artifact",
			artifactId: "brainstorming_session",
		})
		expect(entryRoute.followingBranchId).to.equal("step-1-await-allocation")
		expect(getAction("step-1", "step-1-await-allocation", "step-1-retry-allocate-artifact")).to.deep.include({
			kind: "allocate_artifact",
			artifactId: "brainstorming_session",
		})
		expect(
			getAction("step-1", "step-1-await-retry-allocation", "step-1-terminal-error-after-retry-allocation").kind,
		).to.equal("terminal_error")
		expect(getAction("step-1", "step-1-await-allocation", "step-1-build-initial-shell").kind).to.equal(
			"build_workflow_document",
		)
		expect(getAction("step-1", "step-1-await-initial-shell", "step-1-terminal-error-after-initial-shell").kind).to.equal(
			"terminal_error",
		)
		expect(getAction("step-1", "step-1-await-initial-shell", "step-1-render-setup-form")).to.deep.include({
			kind: "render_workflow_form",
			workflowFormId: "step-1-setup-form",
		})
		expect(getAction("step-1", "step-1-await-setup-form", "step-1-build-submitted-values-document").kind).to.equal(
			"build_workflow_document",
		)
		expect(getAction("step-1", "step-1-await-submitted-values-document", "step-1-transition-to-step-2")).to.deep.include({
			kind: "transition_step",
		})
	})

	it("defines one Step 2 approach form with choose panels and the random confirmation interpolation panel", () => {
		const step2 = brainstormingWorkflowDefinition.steps["step-2"]
		expect(step2.buildToolSchema).to.equal(buildBrainstormingStep2ToolSchemas)

		const workflowForms = brainstormingWorkflowDefinition.workflowForms ?? {}
		const forbiddenRandomConfirmationFormId = ["step-2-random", "confirmation-form"].join("-")
		expect(Object.keys(workflowForms)).not.to.include(forbiddenRandomConfirmationFormId)
		const approachForm = workflowForms["step-2-approach-form"]
		expect(approachForm?.firstPanelId).to.equal("step-2-approach-panel")
		expect(Object.keys(approachForm?.panels ?? {})).to.deep.equal([
			"step-2-approach-panel",
			"step-2-category-panel",
			"step-2-technique-panel",
			"step-2-random-confirmation-panel",
		])

		const approachPanel = approachForm?.panels["step-2-approach-panel"]
		expect(approachPanel?.promptMarkdown).to.equal(
			"How would you like to select the brainstorming approach for this session?",
		)
		expect(approachPanel?.fields[0]?.kind).to.equal("radio_group")
		expect(approachPanel?.fields[0]?.workflowValueKey).to.equal("selected_approach")
		expect(approachPanel?.fields[0]?.options?.map((option) => option.value)).to.deep.equal([
			"I want to choose",
			"I want a random technique",
			"I want you to suggest a technique",
		])

		const categoryPanel = approachForm?.panels["step-2-category-panel"]
		expect(categoryPanel?.title).to.equal("Which category would you like to explore?")
		expect(categoryPanel?.fields[0]?.workflowValueKey).to.equal(undefined)
		expect(categoryPanel?.fields[0]?.options?.map((option) => option.value)).to.deep.equal([
			"Collaborative",
			"Creative",
			"Deep",
			"Introspective Delight",
			"Structured",
			"Theatrical",
			"Wild",
			"Biomimetic",
			"Quantum",
			"Cultural",
		])

		const techniquePanel = approachForm?.panels["step-2-technique-panel"]
		expect(techniquePanel?.title).to.equal("Which technique would you like?")
		expect(techniquePanel?.fields[0]?.workflowValueKey).to.equal("chosen_technique_id")
		const deepOptions = techniquePanel?.fields[0]?.conditionalOptions?.find((entry) => entry.when.value === "Deep")?.options
		expect(deepOptions?.map((option) => option.value)).to.include("five-whys")
		expect(techniquePanel?.backStaleValueKeysToClear).to.deep.equal(["chosen_technique_id"])

		const randomPanel = approachForm?.panels["step-2-random-confirmation-panel"]
		expect(randomPanel?.promptMarkdown).to.equal(
			"Random Technique: {workflow.random_technique_candidate.name}\n\nAbout This Technique: {workflow.random_technique_candidate.description}\n\nReady to get started?",
		)
		expect(randomPanel?.fields[0]?.workflowValueKey).to.equal("random_technique_confirmation")
		expect(randomPanel?.fields[0]?.options?.map((option) => option.value)).to.deep.equal(["confirm", "retry"])
	})

	it("keeps Step 1 and Step 2 decision trees out of project_prompt routing", () => {
		const step1ActionKinds = listRouteActionKinds(brainstormingWorkflowDefinition.steps["step-1"])
		const step2ActionKinds = listRouteActionKinds(brainstormingWorkflowDefinition.steps["step-2"])

		expect(step1ActionKinds).not.to.include("project_prompt")
		expect(step2ActionKinds).not.to.include("project_prompt")
	})

	it("keeps random confirmation inside the Step 2 approach form route", () => {
		const workflowFormIds = Object.keys(brainstormingWorkflowDefinition.workflowForms ?? {})
		const renderRandomConfirmationAction = getAction(
			"step-2",
			"step-2-after-random-selection",
			"step-2-render-random-confirmation",
		)

		expect(workflowFormIds).to.include("step-2-approach-form")
		expect(workflowFormIds).to.not.include("step-2-random-confirmation-form")
		expect(renderRandomConfirmationAction).to.deep.include({
			kind: "render_workflow_form",
			workflowFormId: "step-2-approach-form",
			startPanelId: "step-2-random-confirmation-panel",
		})
	})

	it("implements Step 2 choose, suggest, and random routes without a random-selection tool", async () => {
		const chooseAction = getAction("step-2", "step-2-after-approach-form", "step-2-persist-chosen-technique")
		expect(chooseAction.kind).to.equal("run_deterministic_procedure")
		if (chooseAction.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${chooseAction.kind}.`)
		}
		const chooseResult = await chooseAction.instruction.run(
			createSession({
				selected_approach: "I want to choose",
				chosen_technique_id: "five-whys",
			}),
		)
		expect(chooseResult.kind).to.equal("succeeded")
		if (chooseResult.kind !== "succeeded") {
			throw new Error(`Expected succeeded, received ${chooseResult.kind}.`)
		}
		expect(chooseResult.workflowValueWrites?.selected_techniques).to.deep.equal([
			{
				id: "five-whys",
				name: "Five Whys",
				description:
					"Drill down through layers of causation to uncover root causes - essential for solving problems at source rather than symptoms by asking 'Why did this happen?' repeatedly until reaching fundamental drivers and ultimate causes",
				category: "Deep",
			},
		])

		const chosenDocumentAction = getAction("step-2", "step-2-write-chosen-document", "step-2-write-chosen-document")
		expect(chosenDocumentAction.kind).to.equal("build_workflow_document")
		if (chosenDocumentAction.kind !== "build_workflow_document") {
			throw new Error(`Expected build_workflow_document, received ${chosenDocumentAction.kind}.`)
		}
		const chosenDocument = await chosenDocumentAction.instruction.buildContent(
			createSession({
				selected_approach: "I want to choose",
				selected_techniques: [
					{
						id: "five-whys",
						name: "Five Whys",
						description: "Drill into root causes.",
						category: "Deep",
					},
				],
			}),
		)
		expect(chosenDocument).to.include("# selected approach\n\nI want to choose")
		expect(chosenDocument).to.include("# selected techniques\n\n- Five Whys: Drill into root causes.")

		const suggestAction = getAction("step-2", "step-2-after-approach-form", "step-2-write-suggestion-placeholder")
		expect(suggestAction.kind).to.equal("build_workflow_document")
		if (suggestAction.kind !== "build_workflow_document") {
			throw new Error(`Expected build_workflow_document, received ${suggestAction.kind}.`)
		}
		const suggestDocument = await suggestAction.instruction.buildContent(
			createSession({
				selected_approach: "I want you to suggest a technique",
			}),
		)
		expect(suggestDocument).to.include("# selected approach\n\nI want you to suggest a technique")
		expect(suggestDocument).to.include("# selected techniques\n\nuser requested technique suggestion")

		const randomSelectionAction = getAction("step-2", "step-2-after-approach-form", "step-2-select-random-technique")
		expect(randomSelectionAction.kind).to.equal("run_deterministic_procedure")
		if (randomSelectionAction.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${randomSelectionAction.kind}.`)
		}
		const excludedIds = BRAINSTORMING_TECHNIQUES.slice(1).map((technique) => technique.id)
		const randomSelectionResult = await randomSelectionAction.instruction.run(
			createSession({
				selected_approach: "I want a random technique",
				random_technique_rejected_ids: excludedIds,
			}),
		)
		expect(randomSelectionResult.kind).to.equal("succeeded")
		if (randomSelectionResult.kind !== "succeeded") {
			throw new Error(`Expected succeeded, received ${randomSelectionResult.kind}.`)
		}
		expect(randomSelectionResult.workflowValueWrites?.random_technique_candidate).to.deep.equal({
			id: BRAINSTORMING_TECHNIQUES[0]?.id,
			name: BRAINSTORMING_TECHNIQUES[0]?.name,
			description: BRAINSTORMING_TECHNIQUES[0]?.description,
			category: BRAINSTORMING_TECHNIQUES[0]?.category,
		})

		const renderRandomConfirmationAction = getAction(
			"step-2",
			"step-2-after-random-selection",
			"step-2-render-random-confirmation",
		)
		expect(renderRandomConfirmationAction).to.deep.include({
			kind: "render_workflow_form",
			workflowFormId: "step-2-approach-form",
			startPanelId: "step-2-random-confirmation-panel",
		})

		const randomConfirmAction = getAction(
			"step-2",
			"step-2-after-random-confirmation-form",
			"step-2-persist-confirmed-random-technique",
		)
		expect(randomConfirmAction.kind).to.equal("run_deterministic_procedure")
		if (randomConfirmAction.kind !== "run_deterministic_procedure") {
			throw new Error(`Expected run_deterministic_procedure, received ${randomConfirmAction.kind}.`)
		}
		const randomConfirmResult = await randomConfirmAction.instruction.run(
			createSession({
				random_technique_candidate: {
					id: "five-whys",
					name: "Five Whys",
					description: "Drill into root causes.",
					category: "Deep",
				},
			}),
		)
		expect(randomConfirmResult.kind).to.equal("succeeded")
		if (randomConfirmResult.kind !== "succeeded") {
			throw new Error(`Expected succeeded, received ${randomConfirmResult.kind}.`)
		}
		expect(randomConfirmResult.workflowValueWrites?.selected_techniques).to.deep.equal([
			{
				id: "five-whys",
				name: "Five Whys",
				description: "Drill into root causes.",
				category: "Deep",
			},
		])
	})

	it("does not reference a random technique selector tool in Step 2 routes or Step 3 schemas", () => {
		const forbiddenToolName = "select_random_brainstorming_technique"
		const step2 = brainstormingWorkflowDefinition.steps["step-2"]
		const step3 = brainstormingWorkflowDefinition.steps["step-3"]
		const step2RouteSurfaces = Object.values(step2.decisionTree.branches).flatMap((branch) =>
			branch.routes.map((route) => JSON.stringify(route)),
		)
		const step3ToolSchemaSurfaces = [
			{
				selected_approach: "I want you to suggest a technique",
			},
			{
				selected_approach: "I want to choose",
			},
			{
				selected_approach: "I want a random technique",
			},
		].flatMap((workflowValues) =>
			step3.buildToolSchema(createPromptInput(step3, workflowValues)).map((schema) => JSON.stringify(schema)),
		)

		expect(step2RouteSurfaces.some((routeSurface) => routeSurface.includes(forbiddenToolName))).to.equal(false)
		expect(step3ToolSchemaSurfaces.some((schemaSurface) => schemaSurface.includes(forbiddenToolName))).to.equal(false)
	})

	it("builds Step 3 prompt and tool variants and routes workflow progress decisions", () => {
		const step3 = brainstormingWorkflowDefinition.steps["step-3"]
		expect(step3.buildToolSchema).to.equal(buildBrainstormingStep3ToolSchemas)
		const suggestPromptSource = step3.buildPromptSource(
			createPromptInput(step3, {
				selected_approach: "I want you to suggest a technique",
				output_file: OUTPUT_FILE,
			}),
		)
		expect(suggestPromptSource).to.not.have.property("workflowSystemInstructions")
		const suggestPrompt = suggestPromptSource.currentStepInstructions
		expect(suggestPrompt).to.include(`Read \`${OUTPUT_FILE}\`.`)
		expect(suggestPrompt).to.include("Call `get_brainstorming_methods`")
		expect(suggestPrompt).to.include("Do not call `set_workflow_values` for `selected_techniques`.")
		expect(suggestPrompt).to.include("Once the user indicates they're ready")

		const choosePromptSource = step3.buildPromptSource(
			createPromptInput(step3, {
				selected_approach: "I want to choose",
				output_file: OUTPUT_FILE,
			}),
		)
		expect(choosePromptSource).to.not.have.property("workflowSystemInstructions")
		const choosePrompt = choosePromptSource.currentStepInstructions
		expect(choosePrompt).to.include(`Read \`${OUTPUT_FILE}\`.`)
		expect(choosePrompt).to.include("If at any point the user asks to switch to a new brainstorming technique")
		expect(choosePrompt).to.include("get_brainstorming_methods")

		const approvedStep3ToolNames = [
			"get_brainstorming_methods",
			"append_brainstorming_selected_technique",
			"read_file",
			"apply_patch",
			"send_user_message",
			"ask_followup_question",
			"workflow_progress_request",
		]
		const step3ToolNamesByApproach = [
			step3
				.buildToolSchema(
					createPromptInput(step3, {
						selected_approach: "I want you to suggest a technique",
					}),
				)
				.map((schema) => schema.name),
			step3
				.buildToolSchema(
					createPromptInput(step3, {
						selected_approach: "I want to choose",
					}),
				)
				.map((schema) => schema.name),
			step3
				.buildToolSchema(
					createPromptInput(step3, {
						selected_approach: "I want a random technique",
					}),
				)
				.map((schema) => schema.name),
		]
		for (const step3ToolNames of step3ToolNamesByApproach) {
			expectToolNames(step3ToolNames, approvedStep3ToolNames)
			expect(step3ToolNames).not.to.include("build_workflow_document")
			expect(step3ToolNames).not.to.include("set_workflow_values")
		}

		expect(getAction("step-3", "step-3-await-progress-request", "step-3-transition-to-step-4")).to.deep.include({
			kind: "transition_step",
		})
		expect(getAction("step-3", "step-3-await-progress-request", "step-3-continue-brainstorming")).to.deep.include({
			kind: "project_prompt",
		})
	})

	it("builds Step 4 prompt and exposes only governed file-edit plus final delivery tools", () => {
		const step4 = brainstormingWorkflowDefinition.steps["step-4"]
		expect(step4.buildToolSchema).to.equal(buildBrainstormingStep4ToolSchemas)
		const promptSource = step4.buildPromptSource(
			createPromptInput(step4, {
				output_file: OUTPUT_FILE,
			}),
		)
		expect(promptSource).to.not.have.property("workflowSystemInstructions")
		const prompt = promptSource.currentStepInstructions
		expect(prompt).to.include("Review the captured ideas, cluster them into themes")
		expect(prompt).to.include("Do not extend into solutioning during this workflow.")
		expect(prompt).to.include("create architecture")
		expect(prompt).to.include("quick spec")
		expect(prompt).to.include(`Append the themes, priorities, and summary to \`${OUTPUT_FILE}\`.`)
		expect(prompt).to.include("using `attempt_completion`")
		const step4ToolNames = step4.buildToolSchema(createPromptInput(step4, {})).map((schema) => schema.name)
		expectToolNames(step4ToolNames, [
			"read_file",
			"apply_patch",
			"send_user_message",
			"ask_followup_question",
			"attempt_completion",
		])
		expect(step4ToolNames).not.to.include("build_workflow_document")
		expect(step4ToolNames).not.to.include("set_workflow_values")
		expect(getAction("step-4", "step-4-project-prompt", "step-4-project-prompt")).to.deep.include({
			kind: "project_prompt",
		})
	})

	it("keeps document rendering compatible with selected technique arrays", () => {
		const selectedTechnique = {
			id: "five-whys",
			name: "Five Whys",
			description: "Drill into root causes.",
			category: "Deep",
		}
		const document = buildBrainstormingDocumentFromSession(
			createSession({
				selected_approach: "I want a random technique",
				selected_techniques: [selectedTechnique],
			}),
		)

		expect(document).to.include("# selected approach\n\nI want a random technique")
		expect(document).to.include("# selected techniques\n\n- Five Whys: Drill into root causes.")
	})
})
