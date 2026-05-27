import { expect } from "chai"
import { describe, it } from "mocha"
import { WorkflowArtifactFamily } from "../../../artifactFamilies"
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
import { buildInitialQuickSpecDocument } from "../quickSpecDocument"
import {
	buildQuickSpecStep1ToolSchemas,
	buildQuickSpecStep2ToolSchemas,
	buildQuickSpecStep3ToolSchemas,
	buildQuickSpecStep4ToolSchemas,
} from "../quickSpecToolSchemas"
import { quickSpecWorkflowDefinition } from "../quickSpecWorkflow"

const OUTPUT_DOCUMENT = "/tmp/quick-spec-project/planning/quick-spec.md"

function createSession(workflowValues: WorkflowValues): ActiveWorkflowSession {
	return {
		activeStepNumber: 2,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Quick Spec Project",
			projectFolderName: "quick-spec-project",
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
			activeBranchId: "project-prompt",
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

function findRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const route = quickSpecWorkflowDefinition.steps[stepId]?.decisionTree.branches[branchId]?.routes.find(
		(candidate) => candidate.id === routeId,
	)
	if (route === undefined) {
		throw new Error(`Missing route ${stepId}/${branchId}/${routeId}.`)
	}

	return route
}

function getAction(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionAction {
	return findRoute(stepId, branchId, routeId).action
}

function buildEntryArtifactResolutionCompletedEvent(creationRequired: boolean): WorkflowBranchTriggerEvent {
	return {
		kind: "entry_artifact_resolution_completed",
		artifactResolutions: [
			{
				artifactId: "quick_spec",
				artifactFamily: WorkflowArtifactFamily.QuickSpec,
				artifactIdentity: "quick_spec",
				artifactFilename: "quick-spec.md",
				artifactRelativePath: "planning/quick-spec.md",
				artifactAbsolutePath: OUTPUT_DOCUMENT,
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
			sourceRoute: { branchId, routeId },
		}
	}

	return {
		kind,
		sourceRoute: { branchId, routeId },
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
				step: quickSpecWorkflowDefinition.steps["step-1"],
				triggerEvent: buildEntryArtifactResolutionCompletedEvent(creationRequired),
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
				step: quickSpecWorkflowDefinition.steps["step-1"],
				triggerEvent: buildToolBackedOperationEvent(kind, branchId, routeId),
			}),
		),
	).to.equal(true)
}

function listRouteActionKinds(step: WorkflowStepDefinition): readonly WorkflowDecisionAction["kind"][] {
	return Object.values(step.decisionTree.branches).flatMap((branch) => branch.routes.map((route) => route.action.kind))
}

function buildPrompt(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): string {
	const step = quickSpecWorkflowDefinition.steps[stepId]
	const promptSource = step.buildPromptSource(createPromptInput(step, workflowValues))
	if (promptSource.kind !== "current_step_instruction_template") {
		throw new Error("Expected current step instruction template.")
	}

	return renderWorkflowPromptTemplate({
		template: promptSource.currentStepInstructionTemplate,
		workflowValueKeys: quickSpecWorkflowDefinition.workflowValueKeys,
		workflowValues,
		context: `quick-spec ${stepId} test prompt`,
	})
}

describe("quickSpecWorkflowDefinition", () => {
	it("declares workflow identity, persona, project subfolder, entry copy, checklist labels, value inventory, entry keys, and artifact mapping", () => {
		expect(quickSpecWorkflowDefinition.name).to.equal("quick-spec")
		expect(quickSpecWorkflowDefinition.displayName).to.equal("quick spec")
		expect(quickSpecWorkflowDefinition.slashCommandName).to.equal("quick-spec")
		expect(quickSpecWorkflowDefinition.useSkillName).to.equal("quick-spec")
		expect(quickSpecWorkflowDefinition.description).to.equal(
			"In this workflow, the agent builds a delivery spec for a small enhancement or update. This workflow is intended for limited-scope projects. For larger projects, use the standard workflow process beginning with the Create Architecture workflow.",
		)
		expect(quickSpecWorkflowDefinition.projectSubfolder).to.equal("planning")
		expect(quickSpecWorkflowDefinition.persona).to.deep.equal({
			name: "Bob",
			role: "Scrum Master",
			identity: "A pragmatic scrum master with a background in software development",
			communicationStyle: "crisp, checklist-driven, and ambiguity-free.",
			capabilities: ["translating user vision into a delivery spec via interviews and codebase assessment"],
			principles: ["bridging the gap between stakeholder vision and product reality requires patience and diligence."],
		})
		expect(quickSpecWorkflowDefinition.entryPanel.promptMarkdown).to.equal(quickSpecWorkflowDefinition.description)
		expect(Object.values(quickSpecWorkflowDefinition.steps).map((step) => step.checklistLabel)).to.deep.equal([
			"Gather Context & Generate Spec Document",
			"Assess Vision & Develop Solution Foundation",
			"Finalize Solution & Implementation Spec",
			"Generate Implementation Details",
		])
		expect(quickSpecWorkflowDefinition.workflowValueKeys).to.deep.equal([
			"projectMode",
			"projectTitle",
			"projectFolderName",
			"additional_context",
			"vision_statement",
			"output_document",
			"output_artifact_family",
			"output_artifact_identity",
			"output_artifact_filename",
			"output_artifact_relative_path",
		])
		expect(quickSpecWorkflowDefinition.entryProjectValueKeys).to.deep.equal({
			projectMode: "projectMode",
			projectTitle: "projectTitle",
			projectFolderName: "projectFolderName",
		})
		expect(quickSpecWorkflowDefinition.prerequisiteFiles).to.equal(undefined)
		expect(quickSpecWorkflowDefinition.childInheritance).to.equal(undefined)
		expect(quickSpecWorkflowDefinition.artifacts?.quick_spec).to.deep.equal({
			id: "quick_spec",
			family: WorkflowArtifactFamily.QuickSpec,
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
				artifactAbsolutePath: "output_document",
				parentIdentity: undefined,
				targetIdentity: undefined,
			},
		})
	})

	it("defines the Step 1 input workflow form exactly", () => {
		const form = quickSpecWorkflowDefinition.workflowForms?.["step-1-quick-spec-input-form"]

		if (form === undefined) {
			throw new Error("Missing quick-spec Step 1 input workflow form.")
		}

		expect(form.title).to.equal("Gather Context & Generate Spec Document")
		expect(form.toolDictionaryTitle).to.equal("Gather Context & Generate Spec Document")
		expect(form.toolDictionaryMarkdown).to.equal(quickSpecWorkflowDefinition.description)
		expect(form.firstPanelId).to.equal("step-1-existing-documentation-panel")
		expect(Object.keys(form.panels)).to.deep.equal([
			"step-1-existing-documentation-panel",
			"step-1-documentation-file-paths-panel",
			"step-1-vision-statement-panel",
		])
		expect(form.panels["step-1-existing-documentation-panel"]).to.deep.equal({
			panelId: "step-1-existing-documentation-panel",
			title: "Existing Documentation",
			promptMarkdown: "Would you like to provide any existing documentation as context?",
			fields: [
				{
					key: "has_existing_documentation",
					kind: "boolean",
					label: "Existing Documentation",
					required: true,
					allowedValueType: "boolean",
					trueLabel: "yes",
					falseLabel: "no",
				},
			],
			allowedActions: ["submit"],
			actionLabels: { submit: "continue" },
			transition: {
				type: "conditional",
				conditionSourceKey: "has_existing_documentation",
				branches: [
					{ matchValue: true, nextPanelId: "step-1-documentation-file-paths-panel" },
					{
						matchValue: false,
						nextPanelId: "step-1-vision-statement-panel",
						staleValueKeysToClear: ["additional_context"],
					},
				],
				defaultNextPanelId: "step-1-vision-statement-panel",
			},
		})
		expect(form.panels["step-1-documentation-file-paths-panel"]).to.deep.equal({
			panelId: "step-1-documentation-file-paths-panel",
			title: "Documentation File Paths",
			promptMarkdown: "Please provide the full file path(s) for any documentation you'd like to use as context.",
			fields: [
				{
					key: "additional_context",
					workflowValueKey: "additional_context",
					kind: "large_text",
					label: "Documentation File Paths",
					required: true,
					allowedValueType: "string",
					presentation: { textareaSize: "large" },
				},
			],
			allowedActions: ["submit", "back"],
			actionLabels: { submit: "continue", back: "back" },
			backDestinationPanelId: "step-1-existing-documentation-panel",
			transition: {
				type: "sequential",
				nextPanelId: "step-1-vision-statement-panel",
			},
		})
		expect(form.panels["step-1-vision-statement-panel"]).to.deep.equal({
			panelId: "step-1-vision-statement-panel",
			title: "Vision Statement",
			promptMarkdown: "Please describe what you'd like to achieve with this update.",
			fields: [
				{
					key: "vision_statement",
					workflowValueKey: "vision_statement",
					kind: "large_text",
					label: "Vision Statement",
					required: true,
					allowedValueType: "string",
					presentation: { textareaSize: "large" },
				},
			],
			allowedActions: ["submit", "back"],
			actionLabels: { submit: "Continue", back: "Back" },
			backDestinationPanelId: "step-1-existing-documentation-panel",
			transition: {
				type: "conditional",
				conditionSourceKey: "__terminal__",
				branches: [],
				defaultTerminal: true,
			},
		})
	})

	it("routes Step 1 creation-required entry through allocation, initial shell build, form rendering, and Step 2 transition", () => {
		const step1 = quickSpecWorkflowDefinition.steps["step-1"]
		const creationRequiredRoute = findRoute("step-1", "step-1-resolve-entry-artifact", "step-1-allocate-artifact")
		const shellBuildRoute = findRoute("step-1", "step-1-await-allocation", "step-1-build-initial-shell")
		const shellSuccessRoute = findRoute("step-1", "step-1-await-initial-shell", "step-1-render-input-form")
		const formCompletionRoute = findRoute("step-1", "step-1-await-input-form", "step-1-transition-to-step-2")

		expect(step1.buildToolSchema).to.equal(buildQuickSpecStep1ToolSchemas)
		expect(step1.decisionTree.entryBranchId).to.equal("step-1-resolve-entry-artifact")
		expectRouteMatchesEntryArtifactResolution(creationRequiredRoute, true)
		expect(creationRequiredRoute.action).to.deep.equal({
			kind: "allocate_artifact",
			artifactId: "quick_spec",
		})
		expect(creationRequiredRoute.followingBranchId).to.equal("step-1-await-allocation")
		expectRouteMatchesToolBackedOperationEvent(
			shellBuildRoute,
			"tool_backed_operation_succeeded",
			"step-1-resolve-entry-artifact",
			"step-1-allocate-artifact",
		)
		expect(shellBuildRoute.action).to.deep.equal({
			kind: "build_workflow_document",
			instruction: {
				artifactId: "quick_spec",
				buildContent: buildInitialQuickSpecDocument,
			},
		})
		expect(shellBuildRoute.followingBranchId).to.equal("step-1-await-initial-shell")
		expectRouteMatchesToolBackedOperationEvent(
			shellSuccessRoute,
			"tool_backed_operation_succeeded",
			"step-1-await-allocation",
			"step-1-build-initial-shell",
		)
		expect(shellSuccessRoute.action).to.deep.equal({
			kind: "render_workflow_form",
			workflowFormId: "step-1-quick-spec-input-form",
			startPanelId: "step-1-existing-documentation-panel",
		})
		expect(shellSuccessRoute.followingBranchId).to.equal("step-1-await-input-form")
		if (formCompletionRoute.trigger.kind !== "event_predicate") {
			throw new Error(`Expected event_predicate trigger, received ${formCompletionRoute.trigger.kind}.`)
		}
		expect(
			formCompletionRoute.trigger.matches(
				createEventPredicateInput({
					activeBranchId: "step-1-await-input-form",
					workflowValues: {},
					step: step1,
					triggerEvent: {
						kind: "workflow_form_completed",
						workflowFormId: "step-1-quick-spec-input-form",
					},
				}),
			),
		).to.equal(true)
		expect(formCompletionRoute.action).to.deep.equal({
			kind: "transition_step",
			target: {
				kind: "entry_branch",
				stepNumber: 2,
			},
		})
		expect(listRouteActionKinds(step1)).to.not.include("project_prompt")
		expect(listRouteActionKinds(step1)).to.not.include("run_deterministic_procedure")
		expect(listRouteActionKinds(step1)).to.not.include("complete_workflow")
	})

	it("routes Step 1 continue-existing entry directly to the same input form without allocation or initial document build", () => {
		const continueExistingRoute = findRoute(
			"step-1",
			"step-1-resolve-entry-artifact",
			"step-1-render-existing-artifact-input-form",
		)

		expectRouteMatchesEntryArtifactResolution(continueExistingRoute, false)
		expect(continueExistingRoute.action).to.deep.equal({
			kind: "render_workflow_form",
			workflowFormId: "step-1-quick-spec-input-form",
			startPanelId: "step-1-existing-documentation-panel",
		})
		expect(continueExistingRoute.followingBranchId).to.equal("step-1-await-input-form")
		expect(continueExistingRoute.action.kind).to.not.equal("allocate_artifact")
		expect(continueExistingRoute.action.kind).to.not.equal("build_workflow_document")
	})

	it("defines allocation retry and terminal-error routes", () => {
		const allocationRetryRoute = findRoute("step-1", "step-1-await-allocation", "step-1-retry-allocate-artifact")
		const retrySuccessRoute = findRoute("step-1", "step-1-await-retry-allocation", "step-1-build-initial-shell-after-retry")
		const retryFailureRoute = findRoute(
			"step-1",
			"step-1-await-retry-allocation",
			"step-1-terminal-error-after-retry-allocation",
		)
		const initialShellFailureRoute = findRoute(
			"step-1",
			"step-1-await-initial-shell",
			"step-1-terminal-error-after-initial-shell",
		)

		expectRouteMatchesToolBackedOperationEvent(
			allocationRetryRoute,
			"tool_backed_operation_failed",
			"step-1-resolve-entry-artifact",
			"step-1-allocate-artifact",
		)
		expect(allocationRetryRoute.action).to.deep.equal({
			kind: "allocate_artifact",
			artifactId: "quick_spec",
		})
		expect(allocationRetryRoute.followingBranchId).to.equal("step-1-await-retry-allocation")
		expectRouteMatchesToolBackedOperationEvent(
			retrySuccessRoute,
			"tool_backed_operation_succeeded",
			"step-1-await-allocation",
			"step-1-retry-allocate-artifact",
		)
		expect(retrySuccessRoute.action).to.deep.equal({
			kind: "build_workflow_document",
			instruction: {
				artifactId: "quick_spec",
				buildContent: buildInitialQuickSpecDocument,
			},
		})
		expectRouteMatchesToolBackedOperationEvent(
			retryFailureRoute,
			"tool_backed_operation_failed",
			"step-1-await-allocation",
			"step-1-retry-allocate-artifact",
		)
		expect(retryFailureRoute.action).to.deep.equal({
			kind: "terminal_error",
			errorMessage: "Unable to allocate quick-spec.md after retrying artifact creation.",
		})
		expectRouteMatchesToolBackedOperationEvent(
			initialShellFailureRoute,
			"tool_backed_operation_failed",
			"step-1-await-allocation",
			"step-1-build-initial-shell",
		)
		expectRouteMatchesToolBackedOperationEvent(
			initialShellFailureRoute,
			"tool_backed_operation_failed",
			"step-1-await-retry-allocation",
			"step-1-build-initial-shell-after-retry",
		)
		expect(initialShellFailureRoute.action).to.deep.equal({
			kind: "terminal_error",
			errorMessage: "Unable to initialize quick-spec.md.",
		})
	})

	it("builds Step 2 prompt with and without additional context", () => {
		const additionalContext = "/tmp/existing-docs.md"
		const visionStatement = "Deliver a compact spec workflow."
		const workflowValues: WorkflowValues = {
			output_document: OUTPUT_DOCUMENT,
			additional_context: additionalContext,
			vision_statement: visionStatement,
		}
		const promptWithAdditionalContext = buildPrompt("step-2", workflowValues)
		const promptWithoutAdditionalContext = buildPrompt("step-2", {
			...workflowValues,
			additional_context: "   ",
		})
		const forbiddenRawMarkers = [
			"{workflow.output_document}",
			"{workflow.additional_context}",
			"{workflow.vision_statement}",
			"*** conditional prompt segment",
			"*** end conditional prompt segment ***",
		]

		expect(promptWithAdditionalContext).to.include(OUTPUT_DOCUMENT)
		expect(promptWithAdditionalContext).to.include(additionalContext)
		expect(promptWithAdditionalContext).to.include(visionStatement)
		expect(promptWithAdditionalContext).to.include(`- ${additionalContext}`)
		expect(promptWithAdditionalContext).to.include(
			'Add the additional context provided to the spec file under the "User Context" heading.',
		)
		expect(promptWithoutAdditionalContext).to.include(OUTPUT_DOCUMENT)
		expect(promptWithoutAdditionalContext).to.include(visionStatement)
		expect(promptWithoutAdditionalContext).to.not.include(additionalContext)
		expect(promptWithoutAdditionalContext).to.not.include(
			'Add the additional context provided to the spec file under the "User Context" heading.',
		)
		for (const forbiddenRawMarker of forbiddenRawMarkers) {
			expect(promptWithAdditionalContext).to.not.include(forbiddenRawMarker)
			expect(promptWithoutAdditionalContext).to.not.include(forbiddenRawMarker)
		}
	})

	it("builds Step 3 and Step 4 prompt sources with materialized workflow values and required invariants", () => {
		const workflowValues: WorkflowValues = {
			output_document: OUTPUT_DOCUMENT,
		}
		const step3Prompt = buildPrompt("step-3", workflowValues)
		const step4Prompt = buildPrompt("step-4", workflowValues)

		expect(step3Prompt).to.include(OUTPUT_DOCUMENT)
		expect(step3Prompt).to.include("Once the use approves")
		expect(step3Prompt).to.include("workflow_progress_request")
		expect(step3Prompt).to.not.include("{workflow.output_document}")
		expect(step3Prompt).to.not.include("*** conditional prompt segment")
		expect(step3Prompt).to.not.include("*** end conditional prompt segment ***")
		expect(step4Prompt).to.include(OUTPUT_DOCUMENT)
		expect(step4Prompt).to.include("use subagents")
		expect(step4Prompt).to.include('under the "implementation phases" heading')
		expect(step4Prompt).to.include('under the spec file\'s "Implementation Phases" heading')
		expect(step4Prompt).to.include("DEV AGENT INSTRUCTIONS:")
		expect(step4Prompt).to.include(
			`Add this exact content to the "Dev Agent Instructions" section of ${OUTPUT_DOCUMENT}. Do not paraphrase or invent additional instructions.`,
		)
		expect(step4Prompt).to.include("Required instructions:")
		expect(step4Prompt).to.include("Read this plan from top to bottom before making any changes.")
		expect(step4Prompt).to.include("Read each task and subtask in full immediately before executing it.")
		expect(step4Prompt).to.include(
			"Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.",
		)
		expect(step4Prompt).to.include(
			"Exception: You may execute multiple sequential subtasks with one patch only if they are scoped to the same file, but must review each subtask vs the landed code after the patch to ensure that every subtask was implemented exactly as prescribed before marking the subtask as complete.",
		)
		expect(step4Prompt).to.include('After completing a task or subtask, update that step\'s checkbox from "[ ]" to "[x]".')
		expect(step4Prompt).to.include(
			"Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.",
		)
		expect(step4Prompt).to.include("Do not edit any file not listed in the current step's allowed-files list.")
		expect(step4Prompt).to.include(
			"If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.",
		)
		expect(step4Prompt).to.include(
			"Implement tasks and subtasks exactly as instructed. If deviation seems necessary, stop, inform the user, and explain why you believe the task or subtask should be carried out differently than prescribed.",
		)
		expect(step4Prompt).to.include("attempt_completion")
		expect(step4Prompt).to.not.include("{workflow.output_document}")
	})

	it("routes Step 2 and Step 3 progress decisions and Step 4 attempt completion", () => {
		const step2ProjectPromptRoute = findRoute("step-2", "project-prompt", "project-prompt")
		const step2ProgressConfirmedRoute = findRoute("step-2", "await-progress-request", "progress-confirmed")
		const step2ProgressDeniedRoute = findRoute("step-2", "await-progress-request", "progress-denied")
		const step3ProjectPromptRoute = findRoute("step-3", "project-prompt", "project-prompt")
		const step3ProgressConfirmedRoute = findRoute("step-3", "await-progress-request", "progress-confirmed")
		const step3ProgressDeniedRoute = findRoute("step-3", "await-progress-request", "progress-denied")
		const step4ProjectPromptRoute = findRoute("step-4", "project-prompt", "project-prompt")
		const step4CompletionRoute = findRoute(
			"step-4",
			"step-4-await-attempt-completion",
			"step-4-complete-after-attempt-completion",
		)

		expect(step2ProjectPromptRoute.action).to.deep.equal({ kind: "project_prompt" })
		expect(step2ProjectPromptRoute.followingBranchId).to.equal("await-progress-request")
		expect(step2ProgressConfirmedRoute.trigger).to.deep.equal({
			kind: "on_event",
			eventKind: "workflow_progress_request_confirmed",
		})
		expect(step2ProgressConfirmedRoute.action).to.deep.equal({
			kind: "transition_step",
			target: { kind: "entry_branch", stepNumber: 3 },
		})
		expect(step2ProgressDeniedRoute.trigger).to.deep.equal({
			kind: "on_event",
			eventKind: "workflow_progress_request_denied",
		})
		expect(step2ProgressDeniedRoute.action).to.deep.equal({ kind: "project_prompt" })
		expect(step2ProgressDeniedRoute.followingBranchId).to.equal("await-progress-request")
		expect(step3ProjectPromptRoute.action).to.deep.equal({ kind: "project_prompt" })
		expect(step3ProjectPromptRoute.followingBranchId).to.equal("await-progress-request")
		expect(step3ProgressConfirmedRoute.trigger).to.deep.equal({
			kind: "on_event",
			eventKind: "workflow_progress_request_confirmed",
		})
		expect(step3ProgressConfirmedRoute.action).to.deep.equal({
			kind: "transition_step",
			target: { kind: "entry_branch", stepNumber: 4 },
		})
		expect(step3ProgressDeniedRoute.trigger).to.deep.equal({
			kind: "on_event",
			eventKind: "workflow_progress_request_denied",
		})
		expect(step3ProgressDeniedRoute.action).to.deep.equal({ kind: "project_prompt" })
		expect(step3ProgressDeniedRoute.followingBranchId).to.equal("await-progress-request")
		expect(step4ProjectPromptRoute.action).to.deep.equal({ kind: "project_prompt" })
		expect(step4ProjectPromptRoute.followingBranchId).to.equal("step-4-await-attempt-completion")
		expect(step4CompletionRoute.trigger).to.deep.equal({
			kind: "on_event",
			eventKind: "attempt_completion_succeeded",
		})
		const step4CompletionAction = getAction(
			"step-4",
			"step-4-await-attempt-completion",
			"step-4-complete-after-attempt-completion",
		)
		expect(step4CompletionAction).to.deep.equal({ kind: "complete_workflow" })
	})

	it("delegates every step to the module-owned tool schema builders and excludes unauthorized legacy behavior", () => {
		const toolNames = Object.values(quickSpecWorkflowDefinition.steps).flatMap((step) =>
			step.buildToolSchema(createPromptInput(step, {})).map((schema) => schema.name),
		)
		const forbiddenModelFacingToolNames = [
			"set_workflow_values",
			"build_workflow_document",
			"create_workflow_artifact",
			"archive_workflow_artifact",
			"delete_workflow_artifact",
			"move_workflow_project_file",
			"write_to_file",
			"build_tech_spec_document",
		]
		const serializedWorkflowDefinition = JSON.stringify(quickSpecWorkflowDefinition)
		const step4 = quickSpecWorkflowDefinition.steps["step-4"]
		const step4ToolNames = step4.buildToolSchema(createPromptInput(step4, {})).map((schema) => schema.name)

		expect(quickSpecWorkflowDefinition.steps["step-1"].buildToolSchema).to.equal(buildQuickSpecStep1ToolSchemas)
		expect(quickSpecWorkflowDefinition.steps["step-2"].buildToolSchema).to.equal(buildQuickSpecStep2ToolSchemas)
		expect(quickSpecWorkflowDefinition.steps["step-3"].buildToolSchema).to.equal(buildQuickSpecStep3ToolSchemas)
		expect(quickSpecWorkflowDefinition.steps["step-4"].buildToolSchema).to.equal(buildQuickSpecStep4ToolSchemas)
		for (const forbiddenModelFacingToolName of forbiddenModelFacingToolNames) {
			expect(toolNames).to.not.include(forbiddenModelFacingToolName)
		}
		expect(step4ToolNames).to.include("use_subagents")
		expect(step4ToolNames).to.include("attempt_completion")
		expect(serializedWorkflowDefinition).to.not.include(".cline/workflow-config.yaml")
		expect(serializedWorkflowDefinition).to.not.include("tech-spec-wip.md")
		expect(serializedWorkflowDefinition).to.not.include("BuildTechSpecDocumentToolHandler")
		expect(serializedWorkflowDefinition).to.not.include("QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID")
		expect(serializedWorkflowDefinition).to.not.include("build_tech_spec_document")
		expect(serializedWorkflowDefinition).to.not.include("build-tech-spec-document")
	})
})
