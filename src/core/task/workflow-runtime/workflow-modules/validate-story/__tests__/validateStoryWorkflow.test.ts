import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { WorkflowFormAction, WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"
import { expect } from "chai"
import { describe, it } from "mocha"
import { TaskState } from "@/core/task/TaskState"
import type {
	ActiveWorkflowSession,
	WorkflowDecisionBranchEvaluationInput,
	WorkflowNextAction,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowValues,
	WorkflowWorkspacePathPolicy,
} from "../../../types"
import {
	resolveWorkflowBySlashCommand,
	resolveWorkflowByUseSkillName,
	resolveWorkflowDefinition,
} from "../../../WorkflowRegistry"
import { WorkflowRuntime } from "../../../WorkflowRuntime"
import { renderWorkflowPromptTemplate } from "../../../workflowPromptTemplates"
import { buildValidateStoryStep1ToolSchemas } from "../validateStoryToolSchemas"
import {
	VALIDATE_STORY_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID,
	VALIDATE_STORY_ENTRY_PROJECT_VALUE_KEYS,
	VALIDATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID,
	VALIDATE_STORY_PREREQUISITE_FILES,
	VALIDATE_STORY_STEP_1_PROMPT_TEMPLATES,
	VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN,
	VALIDATE_STORY_TARGET_STORY_PREREQUISITE_ID,
	VALIDATE_STORY_WORKFLOW_DESCRIPTION,
	VALIDATE_STORY_WORKFLOW_DISPLAY_NAME,
	VALIDATE_STORY_WORKFLOW_NAME,
	VALIDATE_STORY_WORKFLOW_PERSONA,
	VALIDATE_STORY_WORKFLOW_PROJECT_SUBFOLDER,
	VALIDATE_STORY_WORKFLOW_SLASH_COMMAND_NAME,
	VALIDATE_STORY_WORKFLOW_USE_SKILL_NAME,
	VALIDATE_STORY_WORKFLOW_VALUE_KEYS,
	ValidateStoryWorkflowValueKey,
	validateStoryWorkflowDefinition,
} from "../validateStoryWorkflow"

const PROJECT_TITLE = "Validate Story Session"
const PROJECT_FOLDER_NAME = "validate-story-session"
const TARGET_STORY_PATH = "/tmp/validate-story-project/implementation/stories-backlog/Story-1-1.md"
const EPICS_DOCUMENT_PATH = "/tmp/validate-story-project/planning/Epics.md"
const ARCHITECTURE_DOCUMENT_PATH = "/tmp/validate-story-project/planning/architecture.md"
const ORIGINATING_STORY_PATH = "/tmp/validate-story-project/implementation/stories-complete/Story-1-0.md"
const CODE_REVIEW_OUTPUT_PATH = "/tmp/validate-story-project/review/code-review-1-1.md"
const QUICK_SPEC_OUTPUT_DOCUMENT_PATH = "/tmp/validate-story-project/planning/quick-spec.md"
const RUNTIME_PROJECT_FOLDER_NAME = "validate-story-runtime-project"
const PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY = "__workflow_runtime_prerequisite_single_match_confirmation__"
const PREREQUISITE_CANNOT_CONTINUE_PANEL_ID = "__workflow_runtime_prerequisite_cannot_continue__"

function getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition {
	const step = validateStoryWorkflowDefinition.steps[stepId]
	if (step === undefined) {
		throw new Error(`Missing ${stepId}.`)
	}

	return step
}

function createWorkflowValues(overrides: WorkflowValues = {}): WorkflowValues {
	return {
		[ValidateStoryWorkflowValueKey.ProjectMode]: "existing",
		[ValidateStoryWorkflowValueKey.ProjectTitle]: PROJECT_TITLE,
		[ValidateStoryWorkflowValueKey.ProjectFolderName]: PROJECT_FOLDER_NAME,
		[ValidateStoryWorkflowValueKey.TargetStory]: TARGET_STORY_PATH,
		[ValidateStoryWorkflowValueKey.EpicsDocument]: EPICS_DOCUMENT_PATH,
		[ValidateStoryWorkflowValueKey.ArchitectureDocument]: ARCHITECTURE_DOCUMENT_PATH,
		...overrides,
	}
}

function createPromptBuilderInput(
	args: { workflowValues?: WorkflowValues; parentWorkflowName?: string } = {},
): WorkflowPromptBuilderInput {
	return {
		session: {
			activeStepNumber: 1,
			workflowValues: args.workflowValues ?? createWorkflowValues(),
			projectSelection: {
				projectMode: "existing",
				projectTitle: PROJECT_TITLE,
				projectFolderName: PROJECT_FOLDER_NAME,
			},
			lifecycle: {
				projectSelectionCompleted: true,
				...(args.parentWorkflowName === undefined ? {} : { parentWorkflowName: args.parentWorkflowName }),
			},
			entryArtifactResolution: undefined,
			ui: {
				formSession: undefined,
				stepResolutionSession: undefined,
				suppressedWorkflowFormIds: [],
				suppressedWorkflowStepResolutionRoutes: [],
			},
			branchContext: {
				activeBranchId: "step-1-await-attempt-completion",
			},
		},
		step: getStep("step-1"),
	}
}

function createDecisionEvaluationInput(parentWorkflowName?: string): WorkflowDecisionBranchEvaluationInput {
	const promptInput = createPromptBuilderInput({ parentWorkflowName })
	return {
		activeBranchId: "step-1-route-by-invocation",
		workflowValues: promptInput.session.workflowValues,
		step: promptInput.step,
		session: promptInput.session,
	}
}

function createAllowAllWorkspacePathPolicy(): WorkflowWorkspacePathPolicy {
	return {
		validateAccess: (): boolean => true,
	}
}

function createActiveRuntimeSession(workflowValues: WorkflowValues = {}): ActiveWorkflowSession {
	return {
		activeStepNumber: 1,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Validate Story Runtime Project",
			projectFolderName: RUNTIME_PROJECT_FOLDER_NAME,
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
			activeBranchId: "step-1-route-by-invocation",
		},
	}
}

function getActiveWorkflowSession(state: TaskState): ActiveWorkflowSession {
	const activeSession = state.activeWorkflowSession
	if (activeSession === undefined) {
		throw new Error("Expected an active workflow session.")
	}

	return activeSession
}

function createFormSubmitRequest(args: {
	sessionId: string
	panelId: string
	action?: WorkflowFormAction
	fields?: WorkflowFormSubmissionRequest["fields"]
}): WorkflowFormSubmissionRequest {
	return WorkflowFormSubmissionRequest.create({
		sessionId: args.sessionId,
		panelId: args.panelId,
		action: args.action ?? WorkflowFormAction.SUBMIT,
		fields: args.fields ?? [],
	})
}

function expectRenderWorkflowForm(action: WorkflowNextAction): Extract<WorkflowNextAction, { kind: "render_workflow_form" }> {
	expect(action.kind).to.equal("render_workflow_form")
	if (action.kind !== "render_workflow_form") {
		throw new Error(`Expected render_workflow_form, received ${action.kind}.`)
	}

	return action
}

async function writeValidateStoryProjectFile(
	cwd: string,
	relativePath: string,
	content = "validate-story prerequisite",
): Promise<string> {
	const absolutePath = join(cwd, "docs", "projects", RUNTIME_PROJECT_FOLDER_NAME, relativePath)
	await mkdir(dirname(absolutePath), { recursive: true })
	await writeFile(absolutePath, content, "utf8")
	return absolutePath
}

async function submitSingleMatchConfirmation(
	runtime: WorkflowRuntime,
	taskState: TaskState,
	action: Extract<WorkflowNextAction, { kind: "render_workflow_form" }>,
	accepted: boolean,
): Promise<WorkflowNextAction> {
	return runtime.submitWorkflowForm({
		taskState,
		request: createFormSubmitRequest({
			sessionId: action.formSession.sessionId,
			panelId: action.formSession.currentPanelId,
			fields: [{ key: PREREQUISITE_SINGLE_MATCH_CONFIRMATION_FIELD_KEY, value: { booleanValue: accepted } }],
		}),
	})
}

function createRuntimeFixture(cwd: string): { runtime: WorkflowRuntime; taskState: TaskState } {
	const runtime = new WorkflowRuntime({ cwd, workspacePathPolicy: createAllowAllWorkspacePathPolicy() })
	const taskState = new TaskState()
	taskState.activeWorkflowName = VALIDATE_STORY_WORKFLOW_NAME
	taskState.activeWorkflowSession = createActiveRuntimeSession()
	return { runtime, taskState }
}

describe("validateStoryWorkflowDefinition", () => {
	it("declares validate-story identity, persona, entry panel, and project folder", () => {
		expect(validateStoryWorkflowDefinition.name).to.equal(VALIDATE_STORY_WORKFLOW_NAME)
		expect(validateStoryWorkflowDefinition.slashCommandName).to.equal(VALIDATE_STORY_WORKFLOW_SLASH_COMMAND_NAME)
		expect(validateStoryWorkflowDefinition.useSkillName).to.equal(VALIDATE_STORY_WORKFLOW_USE_SKILL_NAME)
		expect(validateStoryWorkflowDefinition.displayName).to.equal(VALIDATE_STORY_WORKFLOW_DISPLAY_NAME)
		expect(validateStoryWorkflowDefinition.description).to.equal(VALIDATE_STORY_WORKFLOW_DESCRIPTION)
		expect(validateStoryWorkflowDefinition.projectSubfolder).to.equal(VALIDATE_STORY_WORKFLOW_PROJECT_SUBFOLDER)
		expect(validateStoryWorkflowDefinition.persona).to.deep.equal(VALIDATE_STORY_WORKFLOW_PERSONA)
		expect(validateStoryWorkflowDefinition.entryPanel).to.deep.equal({
			promptMarkdown: VALIDATE_STORY_WORKFLOW_DESCRIPTION,
		})
	})

	it("declares workflow values child inheritance and no AI-writable values forms or artifacts", () => {
		expect(validateStoryWorkflowDefinition.workflowValueKeys).to.deep.equal(VALIDATE_STORY_WORKFLOW_VALUE_KEYS)
		expect(validateStoryWorkflowDefinition.entryProjectValueKeys).to.deep.equal(VALIDATE_STORY_ENTRY_PROJECT_VALUE_KEYS)
		expect(Reflect.has(validateStoryWorkflowDefinition, "aiWritableWorkflowValueKeys")).to.equal(false)
		expect(validateStoryWorkflowDefinition.workflowForms).to.equal(undefined)
		expect(validateStoryWorkflowDefinition.artifacts).to.equal(undefined)
		expect(validateStoryWorkflowDefinition.childInheritance).to.deep.equal([
			{ parentKey: "projectTitle", childKey: "projectTitle" },
			{ parentKey: "projectFolderName", childKey: "projectFolderName" },
			{ parentKey: "target_story", childKey: "target_story" },
			{ parentKey: "epics_document", childKey: "epics_document" },
			{ parentKey: "architecture_document", childKey: "architecture_document" },
			{ parentKey: "originating_story", childKey: "originating_story" },
			{ parentKey: "code_review_output", childKey: "code_review_output" },
			{ parentKey: "output_document", childKey: "target_story" },
		])
	})

	it("declares required prerequisite files for target story epics document and architecture document", () => {
		const prerequisiteFiles = validateStoryWorkflowDefinition.prerequisiteFiles
		expect(prerequisiteFiles).to.deep.equal(VALIDATE_STORY_PREREQUISITE_FILES)
		if (prerequisiteFiles === undefined) {
			throw new Error("Missing validate-story prerequisite files.")
		}

		expect(prerequisiteFiles[VALIDATE_STORY_TARGET_STORY_PREREQUISITE_ID]).to.deep.equal({
			id: VALIDATE_STORY_TARGET_STORY_PREREQUISITE_ID,
			requirement: "required",
			producingWorkflowName: "create-story",
			projectSubfolderSegments: ["implementation", "stories-backlog"],
			match: { kind: "naming_pattern", pattern: VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN },
			workflowValueKey: ValidateStoryWorkflowValueKey.TargetStory,
			outputDocumentReference: "none",
		})
		expect(prerequisiteFiles[VALIDATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID]).to.deep.equal({
			id: VALIDATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID,
			requirement: "required",
			producingWorkflowName: "create-epics",
			projectSubfolderSegments: ["planning"],
			match: { kind: "exact_filename", filename: "Epics.md" },
			workflowValueKey: ValidateStoryWorkflowValueKey.EpicsDocument,
			outputDocumentReference: "none",
		})
		expect(prerequisiteFiles[VALIDATE_STORY_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID]).to.deep.equal({
			id: VALIDATE_STORY_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID,
			requirement: "required",
			producingWorkflowName: "create-architecture",
			projectSubfolderSegments: ["planning"],
			match: { kind: "exact_filename", filename: "architecture.md" },
			workflowValueKey: ValidateStoryWorkflowValueKey.ArchitectureDocument,
			outputDocumentReference: "none",
		})
		expect(VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN.test("Story-1-1.md")).to.equal(true)
		expect(VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN.test("Remediation-story-1-1-1.md")).to.equal(true)
		expect(VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN.test("Story-0-1.md")).to.equal(false)
		expect(VALIDATE_STORY_TARGET_STORY_FILENAME_PATTERN.test("notes.md")).to.equal(false)
	})

	it("declares Step 1 checklist label prompt builder and exact tool surface", () => {
		expect(getStep("step-1").checklistLabel).to.equal("Assess Story Before Implementation")
		expect(
			getStep("step-1")
				.buildToolSchema(createPromptBuilderInput())
				.map((tool) => tool.name),
		).to.deep.equal(buildValidateStoryStep1ToolSchemas().map((tool) => tool.name))
		const promptSource = getStep("step-1").buildPromptSource(createPromptBuilderInput())
		expect(promptSource.kind).to.equal("current_step_instruction_template")
		if (promptSource.kind !== "current_step_instruction_template") {
			throw new Error("Expected Step 1 current step instruction template.")
		}

		expect(promptSource.currentStepInstructionTemplate).not.to.equal("")
		expect(getStep("step-1").promptTemplates).to.deep.equal(VALIDATE_STORY_STEP_1_PROMPT_TEMPLATES)
	})

	it("renders the main-agent Step 1 prompt variant with materialized workflow values", () => {
		const promptSource = getStep("step-1").buildPromptSource(createPromptBuilderInput())
		if (promptSource.kind !== "current_step_instruction_template") {
			throw new Error("Expected Step 1 current step instruction template.")
		}

		const prompt = renderWorkflowPromptTemplate({
			template: promptSource.currentStepInstructionTemplate,
			workflowValueKeys: validateStoryWorkflowDefinition.workflowValueKeys,
			workflowValues: createWorkflowValues(),
			context: "validate-story step-1 test prompt",
		})
		expect(prompt).to.include(PROJECT_TITLE)
		expect(prompt).to.include(PROJECT_FOLDER_NAME)
		expect(prompt).to.include(TARGET_STORY_PATH)
		expect(prompt).to.include(EPICS_DOCUMENT_PATH)
		expect(prompt).to.include(ARCHITECTURE_DOCUMENT_PATH)
		expect(prompt).to.include(
			"You are performing a pre-implementation review of an implementation-story document before it is passed to the developer for implementation.",
		)
		expect(prompt).to.include(
			"Once you've reviewed the story document, provide a response to the user using attempt_completion.",
		)
		expect(prompt).not.to.include(
			"You have been called inside a workflow designed to validate a remediation story before implementation.",
		)
		expect(prompt).not.to.include(
			"You have been called inside a workflow designed to validate an implementation spec for a small project.",
		)
		expect(prompt).not.to.include(
			"Once you've performed your review, use attempt_completion to provide detailed findings back to the primary agent.",
		)
		expect(prompt).not.to.include("{workflow.projectTitle}")
		expect(prompt).not.to.include("{workflow.projectFolderName}")
		expect(prompt).not.to.include("{workflow.target_story}")
		expect(prompt).not.to.include("{workflow.epics_document}")
		expect(prompt).not.to.include("{workflow.architecture_document}")
		expect(prompt).not.to.include("*** conditional prompt")
		expect(prompt).not.to.include("*** end conditional")
	})

	it("renders the create-story child Step 1 prompt variant with subagent completion guidance", () => {
		const promptSource = getStep("step-1").buildPromptSource(createPromptBuilderInput({ parentWorkflowName: "create-story" }))
		if (promptSource.kind !== "current_step_instruction_template") {
			throw new Error("Expected Step 1 current step instruction template.")
		}

		const prompt = renderWorkflowPromptTemplate({
			template: promptSource.currentStepInstructionTemplate,
			workflowValueKeys: validateStoryWorkflowDefinition.workflowValueKeys,
			workflowValues: createWorkflowValues(),
			context: "validate-story step-1 create-story child test prompt",
		})
		expect(prompt).to.include(PROJECT_TITLE)
		expect(prompt).to.include(PROJECT_FOLDER_NAME)
		expect(prompt).to.include(TARGET_STORY_PATH)
		expect(prompt).to.include(EPICS_DOCUMENT_PATH)
		expect(prompt).to.include(ARCHITECTURE_DOCUMENT_PATH)
		expect(prompt).to.include(
			"You are performing a pre-implementation review of an implementation-story document before it is passed to the developer for implementation.",
		)
		expect(prompt).to.include(
			"Once you've performed your review, use attempt_completion to provide detailed findings back to the primary agent.",
		)
		expect(prompt).not.to.include(
			"You have been called inside a workflow designed to validate a remediation story before implementation.",
		)
		expect(prompt).not.to.include(
			"You have been called inside a workflow designed to validate an implementation spec for a small project.",
		)
		expect(prompt).not.to.include("{workflow.projectTitle}")
		expect(prompt).not.to.include("{workflow.projectFolderName}")
		expect(prompt).not.to.include("{workflow.target_story}")
		expect(prompt).not.to.include("{workflow.epics_document}")
		expect(prompt).not.to.include("{workflow.architecture_document}")
		expect(prompt).not.to.include("*** conditional prompt")
		expect(prompt).not.to.include("*** end conditional")
	})

	it("renders the write-remediation-story child Step 1 prompt variant with inherited remediation context", () => {
		const workflowValues = createWorkflowValues({
			[ValidateStoryWorkflowValueKey.OriginatingStory]: ORIGINATING_STORY_PATH,
			[ValidateStoryWorkflowValueKey.CodeReviewOutput]: CODE_REVIEW_OUTPUT_PATH,
		})
		const promptSource = getStep("step-1").buildPromptSource(
			createPromptBuilderInput({ parentWorkflowName: "write-remediation-story", workflowValues }),
		)
		if (promptSource.kind !== "current_step_instruction_template") {
			throw new Error("Expected Step 1 current step instruction template.")
		}

		const prompt = renderWorkflowPromptTemplate({
			template: promptSource.currentStepInstructionTemplate,
			workflowValueKeys: validateStoryWorkflowDefinition.workflowValueKeys,
			workflowValues,
			context: "validate-story step-1 write-remediation-story child test prompt",
		})
		expect(prompt).to.include(TARGET_STORY_PATH)
		expect(prompt).to.include(ORIGINATING_STORY_PATH)
		expect(prompt).to.include(CODE_REVIEW_OUTPUT_PATH)
		expect(prompt).to.include(
			"You have been called inside a workflow designed to validate a remediation story before implementation.",
		)
		expect(prompt).to.include(
			"Once you've performed your review, use attempt_completion to provide detailed findings back to the primary agent.",
		)
		expect(prompt).not.to.include("- Epics Documentation:")
		expect(prompt).not.to.include("- Architecture Document:")
		expect(prompt).not.to.include(
			"You have been called inside a workflow designed to validate an implementation spec for a small project.",
		)
		expect(prompt).not.to.include("{workflow.target_story}")
		expect(prompt).not.to.include("{workflow.originating_story}")
		expect(prompt).not.to.include("{workflow.code_review_output}")
		expect(prompt).not.to.include("*** conditional prompt")
		expect(prompt).not.to.include("*** end conditional")
	})

	it("renders the quick-spec child Step 1 prompt variant with inherited spec path", () => {
		const workflowValues = createWorkflowValues({
			[ValidateStoryWorkflowValueKey.TargetStory]: QUICK_SPEC_OUTPUT_DOCUMENT_PATH,
		})
		const promptSource = getStep("step-1").buildPromptSource(
			createPromptBuilderInput({ parentWorkflowName: "quick-spec", workflowValues }),
		)
		if (promptSource.kind !== "current_step_instruction_template") {
			throw new Error("Expected Step 1 current step instruction template.")
		}

		const prompt = renderWorkflowPromptTemplate({
			template: promptSource.currentStepInstructionTemplate,
			workflowValueKeys: validateStoryWorkflowDefinition.workflowValueKeys,
			workflowValues,
			context: "validate-story step-1 quick-spec child test prompt",
		})
		expect(prompt).to.include(QUICK_SPEC_OUTPUT_DOCUMENT_PATH)
		expect(prompt).to.include(`Spec for review: ${QUICK_SPEC_OUTPUT_DOCUMENT_PATH}`)
		expect(prompt).to.include(
			"You have been called inside a workflow designed to validate an implementation spec for a small project.",
		)
		expect(prompt).to.include(
			"Once you've performed your review, use attempt_completion to provide detailed findings back to the primary agent.",
		)
		expect(prompt).not.to.include("- Epics Documentation:")
		expect(prompt).not.to.include("- Architecture Document:")
		expect(prompt).not.to.include(
			"You have been called inside a workflow designed to validate a remediation story before implementation.",
		)
		expect(prompt).not.to.include("{workflow.target_story}")
		expect(prompt).not.to.include("*** conditional prompt")
		expect(prompt).not.to.include("*** end conditional")
	})

	it("routes Step 1 by invocation context through prerequisites child prompts and completion", () => {
		expect(getStep("step-1").decisionTree.entryBranchId).to.equal("step-1-route-by-invocation")
		expect(Object.keys(getStep("step-1").decisionTree.branches)).to.deep.equal([
			"step-1-route-by-invocation",
			"step-1-start-review",
			"step-1-await-attempt-completion",
		])

		const routeByInvocation = getStep("step-1").decisionTree.branches["step-1-route-by-invocation"]
		expect(routeByInvocation).to.not.equal(undefined)
		if (routeByInvocation === undefined) {
			throw new Error("Missing validate-story route-by-invocation branch")
		}
		expect(routeByInvocation.id).to.equal("step-1-route-by-invocation")
		expect(routeByInvocation.routes.map((route) => route.id)).to.deep.equal([
			"step-1-main-agent-resolve-prerequisites",
			"step-1-create-story-project-prompt",
			"step-1-write-remediation-story-project-prompt",
			"step-1-quick-spec-project-prompt",
		])

		const mainAgentRoute = routeByInvocation.routes.find((route) => route.id === "step-1-main-agent-resolve-prerequisites")
		expect(mainAgentRoute).to.not.equal(undefined)
		if (mainAgentRoute === undefined) {
			throw new Error("Missing main-agent validate-story route")
		}
		expect(mainAgentRoute.trigger.kind).to.equal("session_predicate")
		if (mainAgentRoute.trigger.kind !== "session_predicate") {
			throw new Error("Expected main-agent validate-story route to use a session predicate")
		}
		expect(mainAgentRoute.trigger.matches(createDecisionEvaluationInput(undefined))).to.equal(true)
		expect(mainAgentRoute.trigger.matches(createDecisionEvaluationInput("create-story"))).to.equal(false)
		expect(mainAgentRoute.action).to.deep.equal({
			kind: "resolve_prerequisite_files",
			prerequisiteIds: ["target_story", "epics_document", "architecture_document"],
		})
		expect(mainAgentRoute.followingBranchId).to.equal("step-1-start-review")

		const createStoryRoute = routeByInvocation.routes.find((route) => route.id === "step-1-create-story-project-prompt")
		expect(createStoryRoute).to.not.equal(undefined)
		if (createStoryRoute === undefined) {
			throw new Error("Missing create-story validate-story route")
		}
		expect(createStoryRoute.trigger.kind).to.equal("session_predicate")
		if (createStoryRoute.trigger.kind !== "session_predicate") {
			throw new Error("Expected create-story validate-story route to use a session predicate")
		}
		expect(createStoryRoute.trigger.matches(createDecisionEvaluationInput("create-story"))).to.equal(true)
		expect(createStoryRoute.trigger.matches(createDecisionEvaluationInput(undefined))).to.equal(false)
		expect(createStoryRoute.action).to.deep.equal({ kind: "project_prompt" })
		expect(createStoryRoute.followingBranchId).to.equal("step-1-await-attempt-completion")

		const remediationRoute = routeByInvocation.routes.find(
			(route) => route.id === "step-1-write-remediation-story-project-prompt",
		)
		expect(remediationRoute).to.not.equal(undefined)
		if (remediationRoute === undefined) {
			throw new Error("Missing write-remediation-story validate-story route")
		}
		expect(remediationRoute.trigger.kind).to.equal("session_predicate")
		if (remediationRoute.trigger.kind !== "session_predicate") {
			throw new Error("Expected write-remediation-story validate-story route to use a session predicate")
		}
		expect(remediationRoute.trigger.matches(createDecisionEvaluationInput("write-remediation-story"))).to.equal(true)
		expect(remediationRoute.trigger.matches(createDecisionEvaluationInput(undefined))).to.equal(false)
		expect(remediationRoute.action).to.deep.equal({ kind: "project_prompt" })
		expect(remediationRoute.followingBranchId).to.equal("step-1-await-attempt-completion")

		const quickSpecRoute = routeByInvocation.routes.find((route) => route.id === "step-1-quick-spec-project-prompt")
		expect(quickSpecRoute).to.not.equal(undefined)
		if (quickSpecRoute === undefined) {
			throw new Error("Missing quick-spec validate-story route")
		}
		expect(quickSpecRoute.trigger.kind).to.equal("session_predicate")
		if (quickSpecRoute.trigger.kind !== "session_predicate") {
			throw new Error("Expected quick-spec validate-story route to use a session predicate")
		}
		expect(quickSpecRoute.trigger.matches(createDecisionEvaluationInput("quick-spec"))).to.equal(true)
		expect(quickSpecRoute.trigger.matches(createDecisionEvaluationInput(undefined))).to.equal(false)
		expect(quickSpecRoute.action).to.deep.equal({ kind: "project_prompt" })
		expect(quickSpecRoute.followingBranchId).to.equal("step-1-await-attempt-completion")

		const startReviewBranch = getStep("step-1").decisionTree.branches["step-1-start-review"]
		expect(startReviewBranch).to.not.equal(undefined)
		if (startReviewBranch === undefined) {
			throw new Error("Missing validate-story start-review branch")
		}
		expect(startReviewBranch.id).to.equal("step-1-start-review")
		expect(startReviewBranch.routes.map((route) => route.id)).to.deep.equal(["step-1-project-prompt"])
		const projectPromptRoute = startReviewBranch.routes[0]
		expect(projectPromptRoute).to.not.equal(undefined)
		if (projectPromptRoute === undefined) {
			throw new Error("Missing validate-story project-prompt route")
		}
		expect(projectPromptRoute.trigger).to.deep.equal({ kind: "always" })
		expect(projectPromptRoute.action).to.deep.equal({ kind: "project_prompt" })
		expect(projectPromptRoute.followingBranchId).to.equal("step-1-await-attempt-completion")

		const completionBranch = getStep("step-1").decisionTree.branches["step-1-await-attempt-completion"]
		expect(completionBranch).to.not.equal(undefined)
		if (completionBranch === undefined) {
			throw new Error("Missing validate-story completion branch")
		}
		expect(completionBranch.id).to.equal("step-1-await-attempt-completion")
		expect(completionBranch.routes.map((route) => route.id)).to.deep.equal(["step-1-complete-workflow"])
		const completionRoute = completionBranch.routes[0]
		expect(completionRoute).to.not.equal(undefined)
		if (completionRoute === undefined) {
			throw new Error("Missing validate-story completion route")
		}
		expect(completionRoute.trigger).to.deep.equal({ kind: "on_event", eventKind: "attempt_completion_succeeded" })
		expect(completionRoute.action).to.deep.equal({ kind: "complete_workflow" })
	})

	it("resolves from the shipped workflow registry by canonical names only", () => {
		expect(resolveWorkflowDefinition(VALIDATE_STORY_WORKFLOW_NAME)).to.equal(validateStoryWorkflowDefinition)
		expect(resolveWorkflowBySlashCommand(VALIDATE_STORY_WORKFLOW_SLASH_COMMAND_NAME)).to.equal(
			validateStoryWorkflowDefinition,
		)
		expect(resolveWorkflowByUseSkillName(VALIDATE_STORY_WORKFLOW_USE_SKILL_NAME)).to.equal(validateStoryWorkflowDefinition)
		expect(resolveWorkflowDefinition("validate-story.md")).to.equal(undefined)
		expect(resolveWorkflowBySlashCommand("validate-story.md")).to.equal(undefined)
		expect(resolveWorkflowByUseSkillName("validate-story.md")).to.equal(undefined)
	})

	it("persists selected prerequisite paths and reaches the Step 1 project prompt", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "validate-story-workflow-test-"))
		try {
			const targetStoryPath = await writeValidateStoryProjectFile(cwd, "implementation/stories-backlog/Story-1-1.md")
			const epicsDocumentPath = await writeValidateStoryProjectFile(cwd, "planning/Epics.md")
			const architectureDocumentPath = await writeValidateStoryProjectFile(cwd, "planning/architecture.md")
			const { runtime, taskState } = createRuntimeFixture(cwd)
			const targetStoryPrompt = expectRenderWorkflowForm(await runtime.resolveNextAction({ taskState }))
			const epicsDocumentPrompt = expectRenderWorkflowForm(
				await submitSingleMatchConfirmation(runtime, taskState, targetStoryPrompt, true),
			)
			const architectureDocumentPrompt = expectRenderWorkflowForm(
				await submitSingleMatchConfirmation(runtime, taskState, epicsDocumentPrompt, true),
			)
			const finalAction = await submitSingleMatchConfirmation(runtime, taskState, architectureDocumentPrompt, true)
			expect(getActiveWorkflowSession(taskState).workflowValues[ValidateStoryWorkflowValueKey.TargetStory]).to.equal(
				targetStoryPath,
			)
			expect(getActiveWorkflowSession(taskState).workflowValues[ValidateStoryWorkflowValueKey.EpicsDocument]).to.equal(
				epicsDocumentPath,
			)
			expect(
				getActiveWorkflowSession(taskState).workflowValues[ValidateStoryWorkflowValueKey.ArchitectureDocument],
			).to.equal(architectureDocumentPath)
			expect(finalAction.kind).to.equal("project_prompt")
			if (finalAction.kind !== "project_prompt") {
				throw new Error(`Expected project_prompt, received ${finalAction.kind}.`)
			}

			const workflowInputPayloadBlock = finalAction.promptProjection.workflowInputPayloadBlock
			if (workflowInputPayloadBlock === undefined || workflowInputPayloadBlock === "") {
				throw new Error("Expected validate-story runtime prompt payload.")
			}
			expect(workflowInputPayloadBlock).to.include(targetStoryPath)
			expect(workflowInputPayloadBlock).to.include(epicsDocumentPath)
			expect(workflowInputPayloadBlock).to.include(architectureDocumentPath)
		} finally {
			await rm(cwd, { recursive: true, force: true })
		}
	})

	it("stops before model-driven work when a required prerequisite has no match", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "validate-story-workflow-test-"))
		try {
			const { runtime, taskState } = createRuntimeFixture(cwd)
			const result = expectRenderWorkflowForm(await runtime.resolveNextAction({ taskState }))
			expect(result.payload.panel?.panelId).to.equal(PREREQUISITE_CANNOT_CONTINUE_PANEL_ID)
			expect(getActiveWorkflowSession(taskState).workflowValues[ValidateStoryWorkflowValueKey.TargetStory]).to.equal(
				undefined,
			)
		} finally {
			await rm(cwd, { recursive: true, force: true })
		}
	})

	it("stops before model-driven work when a required prerequisite is rejected", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "validate-story-workflow-test-"))
		try {
			await writeValidateStoryProjectFile(cwd, "implementation/stories-backlog/Story-1-1.md")
			const { runtime, taskState } = createRuntimeFixture(cwd)
			const prompt = expectRenderWorkflowForm(await runtime.resolveNextAction({ taskState }))
			const rejected = expectRenderWorkflowForm(await submitSingleMatchConfirmation(runtime, taskState, prompt, false))
			expect(rejected.payload.panel?.panelId).to.equal(PREREQUISITE_CANNOT_CONTINUE_PANEL_ID)
			expect(getActiveWorkflowSession(taskState).workflowValues[ValidateStoryWorkflowValueKey.TargetStory]).to.equal(
				undefined,
			)
		} finally {
			await rm(cwd, { recursive: true, force: true })
		}
	})

	it("stops before model-driven work when a required prerequisite selection is canceled", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "validate-story-workflow-test-"))
		try {
			await writeValidateStoryProjectFile(cwd, "implementation/stories-backlog/Story-1-1.md")
			const { runtime, taskState } = createRuntimeFixture(cwd)
			const prompt = expectRenderWorkflowForm(await runtime.resolveNextAction({ taskState }))
			const cancelled = expectRenderWorkflowForm(
				await runtime.submitWorkflowForm({
					taskState,
					request: createFormSubmitRequest({
						sessionId: prompt.formSession.sessionId,
						panelId: prompt.formSession.currentPanelId,
						action: WorkflowFormAction.CANCEL,
					}),
				}),
			)
			expect(cancelled.payload.panel?.panelId).to.equal(PREREQUISITE_CANNOT_CONTINUE_PANEL_ID)
			expect(getActiveWorkflowSession(taskState).workflowValues[ValidateStoryWorkflowValueKey.TargetStory]).to.equal(
				undefined,
			)
		} finally {
			await rm(cwd, { recursive: true, force: true })
		}
	})

	it("activates child contexts directly to project prompt with inherited values and no forms", async () => {
		const cases: Array<{
			parentWorkflowName: string
			parentValues: WorkflowValues
			expectedChildValues: WorkflowValues
		}> = [
			{
				parentWorkflowName: "create-story",
				parentValues: {
					projectTitle: PROJECT_TITLE,
					projectFolderName: PROJECT_FOLDER_NAME,
					target_story: TARGET_STORY_PATH,
					epics_document: EPICS_DOCUMENT_PATH,
					architecture_document: ARCHITECTURE_DOCUMENT_PATH,
					ignored_parent: "drop",
				},
				expectedChildValues: {
					projectTitle: PROJECT_TITLE,
					projectFolderName: PROJECT_FOLDER_NAME,
					target_story: TARGET_STORY_PATH,
					epics_document: EPICS_DOCUMENT_PATH,
					architecture_document: ARCHITECTURE_DOCUMENT_PATH,
				},
			},
			{
				parentWorkflowName: "write-remediation-story",
				parentValues: {
					target_story: TARGET_STORY_PATH,
					originating_story: ORIGINATING_STORY_PATH,
					code_review_output: CODE_REVIEW_OUTPUT_PATH,
				},
				expectedChildValues: {
					target_story: TARGET_STORY_PATH,
					originating_story: ORIGINATING_STORY_PATH,
					code_review_output: CODE_REVIEW_OUTPUT_PATH,
				},
			},
			{
				parentWorkflowName: "quick-spec",
				parentValues: {
					output_document: QUICK_SPEC_OUTPUT_DOCUMENT_PATH,
				},
				expectedChildValues: {
					target_story: QUICK_SPEC_OUTPUT_DOCUMENT_PATH,
				},
			},
		]

		for (const childContextCase of cases) {
			const runtime = new WorkflowRuntime({
				cwd: "/tmp/validate-story-child-context-test",
				workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
			})
			const taskState = new TaskState()
			const parentSession: ActiveWorkflowSession = {
				activeStepNumber: 1,
				workflowValues: { ...childContextCase.parentValues },
				projectSelection: {
					projectMode: "existing",
					projectTitle: PROJECT_TITLE,
					projectFolderName: PROJECT_FOLDER_NAME,
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
					activeBranchId: "parent-workflow-branch",
				},
			}
			const parentWorkflowValuesBeforeActivation = structuredClone(parentSession.workflowValues)

			const result = await runtime.activateWorkflow({
				taskState,
				workflowName: VALIDATE_STORY_WORKFLOW_NAME,
				parentSession,
				parentWorkflowName: childContextCase.parentWorkflowName,
			})
			expect(result.kind).to.equal("project_prompt")
			expect(taskState.activeWorkflowSession?.workflowValues).to.deep.equal(childContextCase.expectedChildValues)
			expect(taskState.activeWorkflowSession?.lifecycle).to.deep.equal({
				projectSelectionCompleted: true,
				parentWorkflowName: childContextCase.parentWorkflowName,
			})
			expect(taskState.activeWorkflowSession?.ui.formSession).to.equal(undefined)
			expect(parentSession.workflowValues).to.deep.equal(parentWorkflowValuesBeforeActivation)
		}
	})
})
