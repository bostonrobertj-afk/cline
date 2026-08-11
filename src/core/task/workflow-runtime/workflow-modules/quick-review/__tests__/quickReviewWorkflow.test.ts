import { expect } from "chai"
import { describe, it } from "mocha"
import type {
	ActiveWorkflowSession,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionBranchEvaluationInput,
	WorkflowDecisionBranchRoute,
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
import { buildQuickReviewStep1ToolSchemas, buildQuickReviewStep2ToolSchemas } from "../quickReviewToolSchemas"
import {
	buildQuickReviewStep1WorkflowForm,
	QUICK_REVIEW_COMMIT_HASH_FIELD_KEY,
	QUICK_REVIEW_ENTRY_PROJECT_VALUE_KEYS,
	QUICK_REVIEW_PREREQUISITE_FILES,
	QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID,
	QUICK_REVIEW_STEP_1_FORM_ID,
	QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
	QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE,
	QUICK_REVIEW_WORKFLOW_DESCRIPTION,
	QUICK_REVIEW_WORKFLOW_PERSONA,
	QUICK_REVIEW_WORKFLOW_VALUE_KEYS,
	QuickReviewWorkflowValueKey,
	quickReviewWorkflowDefinition,
} from "../quickReviewWorkflow"

const TEST_SPEC_FILE = "/tmp/quick-review-project/review/quick-spec.md"
const TEST_COMMIT_HASH = "abc1234"

function getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition {
	const step = quickReviewWorkflowDefinition.steps[stepId]
	if (step === undefined) {
		throw new Error(`Missing quick-review step ${stepId}.`)
	}

	return step
}

function findStepRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const step = getStep(stepId)
	const branch = step.decisionTree.branches[branchId]
	if (branch === undefined) {
		throw new Error(`Missing quick-review branch ${branchId}.`)
	}

	const route = branch.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Missing quick-review route ${branchId}/${routeId}.`)
	}

	return route
}

function createWorkflowValues(): WorkflowValues {
	return {
		[QuickReviewWorkflowValueKey.ProjectMode]: "existing",
		[QuickReviewWorkflowValueKey.ProjectTitle]: "Quick Review Test Project",
		[QuickReviewWorkflowValueKey.ProjectFolderName]: "quick-review-project",
		[QuickReviewWorkflowValueKey.SpecFile]: TEST_SPEC_FILE,
		[QuickReviewWorkflowValueKey.CommitHash]: TEST_COMMIT_HASH,
	}
}

function createSession(args: {
	activeStepNumber: 1 | 2
	activeBranchId: string
	workflowValues?: WorkflowValues
}): ActiveWorkflowSession {
	return {
		activeStepNumber: args.activeStepNumber,
		workflowValues: args.workflowValues ?? createWorkflowValues(),
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Quick Review Test Project",
			projectFolderName: "quick-review-project",
		},
		lifecycle: { projectSelectionCompleted: true },
		entryArtifactResolution: undefined,
		prerequisiteFileResolutions: [],
		ui: {
			formSession: undefined,
			stepResolutionSession: undefined,
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext: { activeBranchId: args.activeBranchId },
	}
}

function createPredicateInput(args: {
	activeStepNumber: 1 | 2
	activeBranchId: string
	workflowValues?: WorkflowValues
	step: WorkflowStepDefinition
	triggerEvent: WorkflowBranchTriggerEvent
}): WorkflowDecisionBranchEvaluationInput & { triggerEvent: WorkflowBranchTriggerEvent } {
	const workflowValues = args.workflowValues ?? createWorkflowValues()
	return {
		activeBranchId: args.activeBranchId,
		workflowValues,
		step: args.step,
		session: createSession({ activeStepNumber: args.activeStepNumber, activeBranchId: args.activeBranchId, workflowValues }),
		triggerEvent: args.triggerEvent,
	}
}

function workflowFormCompletedEvent(workflowFormId: string): WorkflowBranchTriggerEvent {
	return { kind: "workflow_form_completed", workflowFormId }
}

function attemptCompletionSucceededEvent(): WorkflowBranchTriggerEvent {
	return { kind: "attempt_completion_succeeded" }
}

function createPromptInput(stepId: "step-1" | "step-2"): WorkflowPromptBuilderInput {
	const step = getStep(stepId)
	const activeStepNumber = stepId === "step-1" ? 1 : 2
	return { step, session: createSession({ activeStepNumber, activeBranchId: step.decisionTree.entryBranchId }) }
}

function renderStep2Prompt(): string {
	return renderWorkflowPromptTemplate({
		template: QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE,
		workflowValueKeys: QUICK_REVIEW_WORKFLOW_VALUE_KEYS,
		workflowValues: createWorkflowValues(),
		context: "quick-review step-2 test",
	})
}

function collectRoutes(step: WorkflowStepDefinition): WorkflowDecisionBranchRoute[] {
	return Object.values(step.decisionTree.branches).flatMap((branch) => branch.routes)
}

describe("quickReviewWorkflow", () => {
	it("defines the Quick Review workflow identity, prerequisites, forms, and steps", () => {
		expect(quickReviewWorkflowDefinition.name).to.equal("quick-review")
		expect(quickReviewWorkflowDefinition.displayName).to.equal("quick review")
		expect(quickReviewWorkflowDefinition.description).to.equal(QUICK_REVIEW_WORKFLOW_DESCRIPTION)
		expect(quickReviewWorkflowDefinition.slashCommandName).to.equal("quick-review")
		expect(quickReviewWorkflowDefinition.useSkillName).to.equal("quick-review")
		expect(quickReviewWorkflowDefinition.projectSelection).to.deep.equal({ kind: "interactive" })
		expect(quickReviewWorkflowDefinition.projectOutputPlacement).to.deep.equal({
			kind: "selected_project_subfolder",
			subfolder: "review",
		})
		expect(Object.hasOwn(quickReviewWorkflowDefinition, "projectSubfolder")).to.equal(false)
		expect(quickReviewWorkflowDefinition.persona).to.deep.equal(QUICK_REVIEW_WORKFLOW_PERSONA)
		expect(quickReviewWorkflowDefinition.entryPanel).to.deep.equal({
			promptMarkdown: QUICK_REVIEW_WORKFLOW_DESCRIPTION,
		})
		expect(quickReviewWorkflowDefinition.workflowValueKeys).to.deep.equal(QUICK_REVIEW_WORKFLOW_VALUE_KEYS)
		expect(quickReviewWorkflowDefinition.entryProjectValueKeys).to.deep.equal(QUICK_REVIEW_ENTRY_PROJECT_VALUE_KEYS)
		expect(Object.keys(quickReviewWorkflowDefinition.workflowForms ?? {})).to.deep.equal([QUICK_REVIEW_STEP_1_FORM_ID])
		expect(Object.keys(quickReviewWorkflowDefinition.steps)).to.deep.equal(["step-1", "step-2"])
		expect(getStep("step-1").stepNumber).to.equal(1)
		expect(getStep("step-1").checklistLabel).to.equal("Gather Commit Info")
		expect(getStep("step-2").stepNumber).to.equal(2)
		expect(getStep("step-2").checklistLabel).to.equal("Perform Quality Review")
		expect(quickReviewWorkflowDefinition.prerequisiteFiles).to.deep.equal(QUICK_REVIEW_PREREQUISITE_FILES)
		expect(quickReviewWorkflowDefinition.prerequisiteFiles?.[QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID]).to.deep.equal({
			id: QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID,
			requirement: "required",
			resolutionMode: "interactive",
			producingWorkflowName: "quick-spec",
			projectSubfolderSegments: ["review"],
			match: { kind: "exact_filename", filename: "quick-spec.md" },
			workflowValueKey: QuickReviewWorkflowValueKey.SpecFile,
			outputDocumentReference: "none",
		})
	})

	it("does not define generated artifacts or child inheritance", () => {
		expect(quickReviewWorkflowDefinition.artifacts).to.equal(undefined)
		expect(quickReviewWorkflowDefinition.childInheritance).to.equal(undefined)
	})

	it("uses quick-review names without markdown aliases", () => {
		expect(quickReviewWorkflowDefinition.name).to.equal("quick-review")
		expect(quickReviewWorkflowDefinition.slashCommandName).to.equal("quick-review")
		expect(quickReviewWorkflowDefinition.useSkillName).to.equal("quick-review")
		expect(quickReviewWorkflowDefinition.name).to.not.equal("quick-review.md")
		expect(quickReviewWorkflowDefinition.slashCommandName).to.not.equal("quick-review.md")
		expect(quickReviewWorkflowDefinition.useSkillName).to.not.equal("quick-review.md")
	})

	it("registers quick-review without markdown aliases", () => {
		expect(resolveWorkflowDefinition("quick-review")).to.equal(quickReviewWorkflowDefinition)
		expect(resolveWorkflowBySlashCommand("quick-review")).to.equal(quickReviewWorkflowDefinition)
		expect(resolveWorkflowByUseSkillName("quick-review")).to.equal(quickReviewWorkflowDefinition)
		expect(resolveWorkflowDefinition("quick-review.md")).to.equal(undefined)
		expect(resolveWorkflowBySlashCommand("quick-review.md")).to.equal(undefined)
		expect(resolveWorkflowByUseSkillName("quick-review.md")).to.equal(undefined)
	})

	it("builds the exact Step 1 commit-hash workflow form", () => {
		const workflowForms = quickReviewWorkflowDefinition.workflowForms
		expect(workflowForms).to.not.equal(undefined)
		if (workflowForms === undefined) {
			throw new Error("Expected Quick Review workflow forms.")
		}

		const expectedForm = {
			definitionVersion: 2,
			title: "Quick Review",
			toolDictionaryTitle: "Quick Review",
			toolDictionaryMarkdown:
				'You can get the commit hash by opening the github pane, ensuring "graph" is enabled, and right-clicking on the commit from the phase\'s implementation.',
			firstPanelId: QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
			panels: {
				[QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID]: {
					panelId: QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
					title: "Commit Hash",
					promptMarkdown: "Please provide the commit hash for the phase to be reviewed",
					fields: [
						{
							key: QUICK_REVIEW_COMMIT_HASH_FIELD_KEY,
							workflowValueKey: QuickReviewWorkflowValueKey.CommitHash,
							kind: "small_text",
							label: "commit hash",
							required: true,
							allowedValueType: "string",
						},
					],
					allowedActions: ["submit"],
					actionLabels: { submit: "continue" },
					transition: {
						type: "conditional",
						conditionSourceKey: "__terminal__",
						branches: [],
						defaultTerminal: true,
					},
				},
			},
		}

		expect(buildQuickReviewStep1WorkflowForm()).to.deep.equal(expectedForm)
		expect(workflowForms[QUICK_REVIEW_STEP_1_FORM_ID]).to.deep.equal(expectedForm)
	})

	it("routes Step 1 through prerequisite resolution, commit form completion, and Step 2 transition", () => {
		const step = getStep("step-1")
		expect(step.decisionTree.entryBranchId).to.equal("step-1-resolve-spec-file")

		const resolveRoute = findStepRoute("step-1", "step-1-resolve-spec-file", "step-1-resolve-spec-file")
		expect(resolveRoute.action).to.deep.equal({
			kind: "resolve_prerequisite_files",
			prerequisiteIds: [QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID],
		})

		const renderRoute = findStepRoute("step-1", "step-1-render-commit-hash-form", "step-1-render-commit-hash-form")
		expect(renderRoute.action).to.deep.equal({
			kind: "render_workflow_form",
			workflowFormId: QUICK_REVIEW_STEP_1_FORM_ID,
			startPanelId: QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
		})

		const transitionRoute = findStepRoute("step-1", "step-1-await-commit-hash-form", "step-1-transition-to-step-2")
		expect(transitionRoute.action).to.deep.equal({
			kind: "transition_step",
			target: { kind: "entry_branch", stepNumber: 2 },
		})
		if (transitionRoute.trigger.kind !== "event_predicate") {
			throw new Error("Expected Quick Review Step 1 transition route to use an event predicate.")
		}
		expect(
			transitionRoute.trigger.matches(
				createPredicateInput({
					activeStepNumber: 1,
					activeBranchId: "step-1-await-commit-hash-form",
					step,
					triggerEvent: workflowFormCompletedEvent(QUICK_REVIEW_STEP_1_FORM_ID),
				}),
			),
		).to.equal(true)
		expect(
			transitionRoute.trigger.matches(
				createPredicateInput({
					activeStepNumber: 1,
					activeBranchId: "step-1-await-commit-hash-form",
					step,
					triggerEvent: workflowFormCompletedEvent("different-form"),
				}),
			),
		).to.equal(false)

		const actionKinds = collectRoutes(step).map((route) => route.action.kind)
		expect(actionKinds).to.not.include("project_prompt")
		expect(actionKinds).to.not.include("complete_workflow")
	})

	it("routes Step 2 through project prompt and successful attempt completion", () => {
		const step = getStep("step-2")
		expect(step.decisionTree.entryBranchId).to.equal("step-2-project-prompt")

		const projectPromptRoute = findStepRoute("step-2", "step-2-project-prompt", "step-2-project-prompt")
		expect(projectPromptRoute.action).to.deep.equal({ kind: "project_prompt" })
		expect(projectPromptRoute.followingBranchId).to.equal("step-2-await-attempt-completion")

		const completeRoute = findStepRoute("step-2", "step-2-await-attempt-completion", "step-2-complete-workflow")
		expect(completeRoute.trigger).to.deep.equal({
			kind: "on_event",
			eventKind: attemptCompletionSucceededEvent().kind,
		})
		expect(completeRoute.action).to.deep.equal({ kind: "complete_workflow" })

		const actionKinds = collectRoutes(step).map((route) => route.action.kind)
		expect(actionKinds).to.not.include("transition_step")
	})

	it("uses no Step 1 prompt source and no Step 1 model-facing tools", () => {
		const promptInput = createPromptInput("step-1")
		expect(getStep("step-1").buildPromptSource(promptInput)).to.deep.equal({ kind: "none" })
		expect(getStep("step-1").buildToolSchema(promptInput)).to.deep.equal(buildQuickReviewStep1ToolSchemas())
	})

	it("renders Step 2 instructions with workflow values", () => {
		const renderedOutput = renderStep2Prompt()
		expect(renderedOutput.trim()).to.not.equal("")
		expect(renderedOutput).to.include(TEST_SPEC_FILE)
		expect(renderedOutput).to.include(TEST_COMMIT_HASH)
		expect(renderedOutput).to.include("attempt_completion")
		expect(renderedOutput).to.not.equal(QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE)
	})

	it("does not leak raw workflow placeholders or source-document headings into Step 2 instructions", () => {
		const renderedOutput = renderStep2Prompt()
		for (const forbiddenText of [
			"{workflow.spec_file}",
			"{workflow.commit_hash}",
			"workflow.spec_file",
			"workflow.commit_hash",
			"# Module metadata:",
			"# Persona",
			"# Prerequisite Files",
			"### Prompt",
			"# Tool Schema Override",
			"# Focus Chain Tasks",
			"# Workflow Steps",
			"Workflow Form 1:",
			"Panel A:",
			"Field:",
			"allowedActions/ Labels:",
		]) {
			expect(renderedOutput).to.not.include(forbiddenText)
		}
	})

	it("uses Step 2 shared tool schemas and preserves the prompt template", () => {
		const promptInput = createPromptInput("step-2")
		expect(getStep("step-2").buildToolSchema(promptInput)).to.deep.equal(buildQuickReviewStep2ToolSchemas())
		expect(getStep("step-2").promptTemplates).to.deep.equal([QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE])
	})

	it("does not serialize disallowed workflow capabilities or legacy aliases", () => {
		const serializedDefinition = JSON.stringify(quickReviewWorkflowDefinition)
		for (const forbiddenText of [
			"artifacts",
			"childInheritance",
			"build_workflow_document",
			"create_workflow_artifact",
			"archive_workflow_artifact",
			"delete_workflow_artifact",
			"move_workflow_project_file",
			"set_workflow_values",
			"ask_followup_question",
			"workflow_progress_request",
			"use_subagents",
			"use_skill",
			"record_findings",
			"quick-review.md",
			".cline/workflow-config.yaml",
			"bmad",
			"BMAD",
		]) {
			expect(serializedDefinition).to.not.include(forbiddenText)
		}
	})
})
