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
import { TaskState } from "@/core/task/TaskState"
import type { WorkflowStepResolutionSessionState } from "@/core/task/workflow-step-resolution/types"
import { ClineDefaultTool } from "@/shared/tools"
import type {
	ActiveWorkflowSession,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionAction,
	WorkflowDecisionBranchRoute,
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
import {
	buildDevStoryGitFinalizeInstruction,
	DEV_STORY_ENTRY_PROJECT_VALUE_KEYS,
	DEV_STORY_PREREQUISITE_FILES,
	DEV_STORY_STEP_2_INITIAL_PROMPT_BRANCH_ID,
	DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID,
	DEV_STORY_STEP_4_FORM_ID,
	DEV_STORY_STEP_4_PANEL_A_UNPERMITTED_FILES_ID,
	DEV_STORY_STEP_4_PANEL_B_COMMIT_CONFIRMATION_ID,
	DEV_STORY_STORY_FILENAME_PATTERN,
	DEV_STORY_TARGET_STORY_PREREQUISITE_ID,
	DEV_STORY_WORKFLOW_DESCRIPTION,
	DEV_STORY_WORKFLOW_PERSONA,
	DEV_STORY_WORKFLOW_VALUE_KEYS,
	DevStoryWorkflowValueKey,
	deriveDevStoryMetadataFromFilename,
	devStoryWorkflowDefinition,
	setupDevStoryFromTargetStory,
} from ".."

const TEST_PROJECT_ROOT = "/tmp/dev-story-project"
const TEST_TARGET_STORY = `${TEST_PROJECT_ROOT}/implementation/stories-backlog/Story-1-2.md`
const TEST_STORIES_INDEX = `${TEST_PROJECT_ROOT}/implementation/epic-1-stories.index.json`

function buildAllowedFilesValue(): WorkflowValues[string] {
	return []
}

function buildSubtaskInventoryValue(args: { id: string; rawLine: string; completed: boolean }): WorkflowValues[string] {
	return {
		id: args.id,
		lineIndex: 10,
		rawLine: args.rawLine,
		completed: args.completed,
		allowedFiles: buildAllowedFilesValue(),
	}
}

function buildTaskInventoryValue(args: {
	id: string
	rawLine: string
	completed: boolean
	subtasks: readonly WorkflowValues[string][]
}): WorkflowValues[string] {
	return {
		id: args.id,
		lineIndex: 5,
		rawLine: args.rawLine,
		completed: args.completed,
		allowedFiles: buildAllowedFilesValue(),
		subtasks: [...args.subtasks],
	}
}

function buildStoryTaskInventoryValue(args: {
	firstTaskComplete: boolean
	secondTaskComplete: boolean
	thirdTaskComplete: boolean
}): WorkflowValues[string] {
	return {
		tasks: [
			buildTaskInventoryValue({
				id: "1",
				rawLine: "- [ ] Task 1: Update runtime",
				completed: args.firstTaskComplete,
				subtasks: [
					buildSubtaskInventoryValue({
						id: "1.1",
						rawLine: "  - [ ] Subtask 1.1: Update runtime contract",
						completed: args.firstTaskComplete,
					}),
					buildSubtaskInventoryValue({
						id: "1.2",
						rawLine: "  - [ ] Subtask 1.2: Update runtime tests",
						completed: args.firstTaskComplete,
					}),
				],
			}),
			buildTaskInventoryValue({
				id: "2",
				rawLine: "- [ ] Task 2: Update prompt projection",
				completed: args.secondTaskComplete,
				subtasks: [
					buildSubtaskInventoryValue({
						id: "2.1",
						rawLine: "  - [ ] Subtask 2.1: Project task detail",
						completed: args.secondTaskComplete,
					}),
				],
			}),
			buildTaskInventoryValue({
				id: "3",
				rawLine: "- [ ] Task 3: Validate workflow",
				completed: args.thirdTaskComplete,
				subtasks: [
					buildSubtaskInventoryValue({
						id: "3.1",
						rawLine: "  - [ ] Subtask 3.1: Run validation",
						completed: args.thirdTaskComplete,
					}),
				],
			}),
		],
	}
}

function createWorkflowValues(args: {
	currentStoryTaskId: string
	firstTaskComplete: boolean
	secondTaskComplete: boolean
	thirdTaskComplete: boolean
}): WorkflowValues {
	return {
		[DevStoryWorkflowValueKey.TargetStory]: TEST_TARGET_STORY,
		[DevStoryWorkflowValueKey.TargetStoryFilename]: "Story-1-2.md",
		[DevStoryWorkflowValueKey.SelectedStoryIdentity]: "1.2",
		[DevStoryWorkflowValueKey.EpicIdentity]: "1",
		[DevStoryWorkflowValueKey.StoriesIndex]: TEST_STORIES_INDEX,
		[DevStoryWorkflowValueKey.SelectedStoryType]: "primary",
		[DevStoryWorkflowValueKey.StoryGeneralInstructions]: "General guidance",
		[DevStoryWorkflowValueKey.StoryObjective]: "Objective detail",
		[DevStoryWorkflowValueKey.StoryScope]: "Scope detail",
		[DevStoryWorkflowValueKey.StoryScopeBoundary]: "Boundary detail",
		[DevStoryWorkflowValueKey.StoryRequirements]: "Requirement detail",
		[DevStoryWorkflowValueKey.StoryIssues]: "Issue detail",
		[DevStoryWorkflowValueKey.StoryTaskInventory]: buildStoryTaskInventoryValue({
			firstTaskComplete: args.firstTaskComplete,
			secondTaskComplete: args.secondTaskComplete,
			thirdTaskComplete: args.thirdTaskComplete,
		}),
		[DevStoryWorkflowValueKey.CurrentStoryTaskId]: args.currentStoryTaskId,
	}
}

function createSession(args: {
	activeStepNumber: number
	activeBranchId: string
	workflowValues: WorkflowValues
}): ActiveWorkflowSession {
	return {
		activeStepNumber: args.activeStepNumber,
		workflowValues: args.workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: basename(TEST_PROJECT_ROOT),
			projectFolderName: basename(TEST_PROJECT_ROOT),
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

function createSessionWithLastTriggerEvent(args: {
	activeStepNumber: number
	activeBranchId: string
	workflowValues: WorkflowValues
	lastTriggerEvent: WorkflowBranchTriggerEvent
}): ActiveWorkflowSession {
	const session = createSession({
		activeStepNumber: args.activeStepNumber,
		activeBranchId: args.activeBranchId,
		workflowValues: args.workflowValues,
	})
	session.branchContext.lastTriggerEvent = args.lastTriggerEvent
	return session
}

function createTaskStateWithActiveSession(activeSession: ActiveWorkflowSession): TaskState {
	const taskState = new TaskState()
	taskState.activeWorkflowName = "dev-story"
	taskState.activeWorkflowSession = activeSession
	return taskState
}

function createAllowAllWorkspacePathPolicy(): WorkflowWorkspacePathPolicy {
	return {
		validateAccess: () => true,
	}
}

function getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition {
	return devStoryWorkflowDefinition.steps[stepId]
}

function findStepRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const route = getStep(stepId).decisionTree.branches[branchId]?.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Missing route ${stepId}/${branchId}/${routeId}.`)
	}

	return route
}

function getWorkflowForm(workflowFormId: string): WorkflowFormDefinitionPayload {
	const form = devStoryWorkflowDefinition.workflowForms?.[workflowFormId]
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

function createPromptInput(args: {
	stepId: WorkflowStepDefinition["id"]
	activeBranchId: string
	workflowValues: WorkflowValues
}): WorkflowPromptBuilderInput {
	const step = getStep(args.stepId)
	return {
		session: createSession({
			activeStepNumber: step.stepNumber,
			activeBranchId: args.activeBranchId,
			workflowValues: args.workflowValues,
		}),
		step,
	}
}

function getPromptInstructions(args: {
	stepId: WorkflowStepDefinition["id"]
	activeBranchId: string
	workflowValues: WorkflowValues
}): string {
	const promptSource = getStep(args.stepId).buildPromptSource(createPromptInput(args))
	if (promptSource.kind !== "current_step_instruction_template") {
		throw new Error(`Missing current step instruction template for ${args.stepId}.`)
	}

	const template = promptSource.currentStepInstructionTemplate
	return renderWorkflowPromptTemplate({
		template,
		workflowValueKeys: devStoryWorkflowDefinition.workflowValueKeys,
		workflowValues: args.workflowValues,
		context: `dev-story ${args.stepId} test prompt`,
	})
}

function expectNoDevStoryWorkflowPromptTokens(prompt: string): void {
	const promptTokens: readonly string[] = [
		"{workflow.story_general_instructions}",
		"{workflow.story_objective}",
		"{workflow.story_scope_boundary}",
		"{workflow.story_scope}",
		"{workflow.story_requirements}",
		"{workflow.story_issues}",
	]
	for (const promptToken of promptTokens) {
		expect(prompt).not.to.include(promptToken)
	}
}

function buildModelToolSucceededEvent(toolName: ClineDefaultTool): WorkflowBranchTriggerEvent {
	return {
		kind: "model_tool_succeeded",
		toolName,
	}
}

function buildWorkflowValuesPersistedEvent(changedKeys: readonly string[]): WorkflowBranchTriggerEvent {
	return {
		kind: "workflow_values_persisted",
		changedKeys,
	}
}

function buildWorkflowFormPanelSubmittedEvent(panelId: string): WorkflowBranchTriggerEvent {
	return {
		kind: "workflow_form_panel_submitted",
		workflowFormId: DEV_STORY_STEP_4_FORM_ID,
		panelId,
		action: "submit",
		submittedValueKeys: [panelId],
		clearedValueKeys: [],
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

function buildToolBackedOperationFailedEvent(args: {
	branchId: string
	routeId: string
	errorMessage: string
}): WorkflowBranchTriggerEvent {
	return {
		kind: "tool_backed_operation_failed",
		sourceRoute: {
			branchId: args.branchId,
			routeId: args.routeId,
		},
		errorMessage: args.errorMessage,
	}
}

function expectEventPredicateMatches(args: {
	stepId: WorkflowStepDefinition["id"]
	branchId: string
	route: WorkflowDecisionBranchRoute
	workflowValues: WorkflowValues
	triggerEvent: WorkflowBranchTriggerEvent
}): void {
	if (args.route.trigger.kind !== "event_predicate") {
		throw new Error(`Expected event_predicate trigger, received ${args.route.trigger.kind}.`)
	}

	expect(
		args.route.trigger.matches({
			activeBranchId: args.branchId,
			workflowValues: args.workflowValues,
			step: getStep(args.stepId),
			triggerEvent: args.triggerEvent,
		}),
	).to.equal(true)
}

function expectEventPredicateDoesNotMatch(args: {
	stepId: WorkflowStepDefinition["id"]
	branchId: string
	route: WorkflowDecisionBranchRoute
	workflowValues: WorkflowValues
	triggerEvent: WorkflowBranchTriggerEvent
}): void {
	if (args.route.trigger.kind !== "event_predicate") {
		throw new Error(`Expected event_predicate trigger, received ${args.route.trigger.kind}.`)
	}

	expect(
		args.route.trigger.matches({
			activeBranchId: args.branchId,
			workflowValues: args.workflowValues,
			step: getStep(args.stepId),
			triggerEvent: args.triggerEvent,
		}),
	).to.equal(false)
}

function expectTransitionStepAction(action: WorkflowDecisionAction, stepNumber: number): void {
	expect(action.kind).to.equal("transition_step")
	if (action.kind !== "transition_step") {
		throw new Error(`Expected transition_step action, received ${action.kind}.`)
	}

	expect(action.target).to.deep.equal({
		kind: "entry_branch",
		stepNumber,
	})
}

function createStepResolutionSession(branchId: string, routeId: string): WorkflowStepResolutionSessionState {
	return {
		sessionId: "dev-story-operation-session",
		sourceRoute: {
			branchId,
			routeId,
		},
		triggerSource: "execute_tool_backed_operation",
		owner: {
			kind: "workflow_step",
			workflowName: "dev-story",
			stepNumber: 4,
		},
		state: "pending",
	}
}

function buildStoryMarkdown(args: { allComplete: boolean }): string {
	const marker = args.allComplete ? "x" : " "
	return `## General Instructions
General guidance

## Objective
Objective detail

## Scope
Scope detail

## Scope Boundary
Boundary detail

## Requirements
Requirement detail

## Known Issues/ Risks/ Technical Debt
Issue detail

## Tasks
- [${marker}] Task 1: Update runtime
  - [${marker}] Subtask 1.1: Update runtime contract
    Allowed files:
      - src/core/task/workflow-runtime/WorkflowRuntime.ts
- [${marker}] Task 2: Update prompt projection
  - [${marker}] Subtask 2.1: Project task detail
    Allowed files:
      - src/core/prompts/system-prompt/__tests__/integration.test.ts
`
}

describe("devStoryWorkflowDefinition", () => {
	it("defines the dev-story identity, persona, and entry panel", () => {
		expect(devStoryWorkflowDefinition.name).to.equal("dev-story")
		expect(devStoryWorkflowDefinition.slashCommandName).to.equal("dev-story")
		expect(devStoryWorkflowDefinition.useSkillName).to.equal("dev-story")
		expect(devStoryWorkflowDefinition.displayName).to.equal("dev-story")
		expect(devStoryWorkflowDefinition.projectSubfolder).to.equal("implementation")
		expect(devStoryWorkflowDefinition.description).to.equal(DEV_STORY_WORKFLOW_DESCRIPTION)
		expect(devStoryWorkflowDefinition.persona).to.deep.equal(DEV_STORY_WORKFLOW_PERSONA)
		expect(devStoryWorkflowDefinition.entryPanel).to.deep.equal({
			promptMarkdown: DEV_STORY_WORKFLOW_DESCRIPTION,
		})
	})

	it("resolves from the registry by canonical dev-story names and rejects .md aliases", () => {
		expect(resolveWorkflowDefinition("dev-story")).to.equal(devStoryWorkflowDefinition)
		expect(resolveWorkflowBySlashCommand("dev-story")).to.equal(devStoryWorkflowDefinition)
		expect(resolveWorkflowByUseSkillName("dev-story")).to.equal(devStoryWorkflowDefinition)
		expect(resolveWorkflowDefinition("dev-story.md")).to.equal(undefined)
		expect(resolveWorkflowBySlashCommand("dev-story.md")).to.equal(undefined)
		expect(resolveWorkflowByUseSkillName("dev-story.md")).to.equal(undefined)
	})

	it("declares the target story prerequisite and workflow value inventory", () => {
		expect(devStoryWorkflowDefinition.workflowValueKeys).to.deep.equal(DEV_STORY_WORKFLOW_VALUE_KEYS)
		expect(devStoryWorkflowDefinition.entryProjectValueKeys).to.deep.equal(DEV_STORY_ENTRY_PROJECT_VALUE_KEYS)

		const prerequisite = DEV_STORY_PREREQUISITE_FILES[DEV_STORY_TARGET_STORY_PREREQUISITE_ID]
		expect(prerequisite).to.deep.include({
			id: "target_story",
			requirement: "required",
			producingWorkflowName: "create-story",
			workflowValueKey: "target_story",
			outputDocumentReference: "none",
		})
		expect(prerequisite?.projectSubfolderSegments).to.deep.equal(["implementation", "stories-backlog"])
		expect(prerequisite?.match.kind).to.equal("naming_pattern")
		if (prerequisite?.match.kind !== "naming_pattern") {
			throw new Error("Expected naming_pattern prerequisite match.")
		}
		expect(String(prerequisite.match.pattern)).to.equal(String(DEV_STORY_STORY_FILENAME_PATTERN))
		expect(prerequisite.match.pattern.test("Story-1-2.md")).to.equal(true)
		expect(prerequisite.match.pattern.test("Remediation-story-1-2-3.md")).to.equal(true)
	})

	it("does not reference legacy BMAD package paths, legacy task headings, retired prompt state, or stories_index prerequisites", () => {
		const serializedDefinition = JSON.stringify(devStoryWorkflowDefinition)
		if (serializedDefinition === undefined) {
			throw new Error("Expected serializable dev-story workflow definition.")
		}

		const forbiddenDefinitionValues: readonly string[] = [
			".cline/skills/bmad-dev-story",
			"## Tasks / Subtasks",
			"activeStoryTaskId",
			"activeStorySubtaskIds",
			"lastPromptedStoryTaskKey",
		]
		for (const forbiddenDefinitionValue of forbiddenDefinitionValues) {
			expect(serializedDefinition).not.to.include(forbiddenDefinitionValue)
		}

		const prerequisiteIds = Object.keys(devStoryWorkflowDefinition.prerequisiteFiles ?? {})
		const prerequisites = Object.values(devStoryWorkflowDefinition.prerequisiteFiles ?? {})
		expect(prerequisiteIds).not.to.include("stories_index")
		expect(prerequisites.some((prerequisite) => prerequisite.id === "stories_index")).to.equal(false)
		expect(prerequisites.some((prerequisite) => prerequisite.workflowValueKey === "stories_index")).to.equal(false)
	})

	it("routes Step 1 through target-story prerequisite setup and transition to Step 2", () => {
		const resolveRoute = findStepRoute("step-1", "step-1-resolve-target-story", "step-1-resolve-target-story")
		expect(resolveRoute.trigger).to.deep.equal({ kind: "always" })
		expect(resolveRoute.action).to.deep.equal({
			kind: "resolve_prerequisite_files",
			prerequisiteIds: ["target_story"],
		})
		expect(resolveRoute.followingBranchId).to.equal("step-1-setup-target-story")

		const setupRoute = findStepRoute("step-1", "step-1-setup-target-story", "step-1-setup-target-story")
		expect(setupRoute.action.kind).to.equal("run_deterministic_procedure")
		expect(setupRoute.followingBranchId).to.equal("step-1-await-story-setup-values")

		const transitionRoute = findStepRoute("step-1", "step-1-await-story-setup-values", "step-1-transition-to-step-2")
		expectEventPredicateMatches({
			stepId: "step-1",
			branchId: "step-1-await-story-setup-values",
			route: transitionRoute,
			workflowValues: {},
			triggerEvent: buildWorkflowValuesPersistedEvent([
				"target_story_filename",
				"selected_story_identity",
				"story_task_inventory",
				"current_story_task_id",
			]),
		})
		expect(transitionRoute.action.kind).to.equal("transition_step")
		if (transitionRoute.action.kind !== "transition_step") {
			throw new Error(`Expected transition_step action, received ${transitionRoute.action.kind}.`)
		}
		expect(transitionRoute.action.target).to.deep.equal({
			kind: "named_branch",
			stepNumber: 2,
			branchId: DEV_STORY_STEP_2_INITIAL_PROMPT_BRANCH_ID,
		})
	})

	it("derives story metadata and setup workflow values from the selected target story", async () => {
		const primaryMetadata = deriveDevStoryMetadataFromFilename({
			selectedProjectRoot: TEST_PROJECT_ROOT,
			targetStoryFilename: "Story-1-2.md",
		})
		expect(primaryMetadata).to.deep.equal({
			targetStoryFilename: "Story-1-2.md",
			selectedStoryIdentity: "1.2",
			selectedStoryType: "primary",
			epicIdentity: "1",
			storiesIndex: TEST_STORIES_INDEX,
		})

		const remediationMetadata = deriveDevStoryMetadataFromFilename({
			selectedProjectRoot: TEST_PROJECT_ROOT,
			targetStoryFilename: "Remediation-story-1-2-3.md",
		})
		expect(remediationMetadata).to.deep.equal({
			targetStoryFilename: "Remediation-story-1-2-3.md",
			selectedStoryIdentity: "1.2.3",
			selectedStoryType: "remediation",
			epicIdentity: "1",
			storiesIndex: TEST_STORIES_INDEX,
		})

		const tempRoot = await mkdtemp(join(tmpdir(), "dev-story-workflow-"))
		try {
			const storyPath = join(tempRoot, "implementation", "stories-backlog", "Story-1-2.md")
			await mkdir(join(tempRoot, "implementation", "stories-backlog"), { recursive: true })
			await writeFile(storyPath, buildStoryMarkdown({ allComplete: false }), "utf8")

			const result = await setupDevStoryFromTargetStory(
				createSession({
					activeStepNumber: 1,
					activeBranchId: "step-1-setup-target-story",
					workflowValues: {
						[DevStoryWorkflowValueKey.TargetStory]: storyPath,
					},
				}),
			)
			expect(result.kind).to.equal("succeeded")
			if (result.kind !== "succeeded" || result.workflowValueWrites === undefined) {
				throw new Error("Expected successful setup workflow value writes.")
			}

			expect(result.workflowValueWrites[DevStoryWorkflowValueKey.TargetStoryFilename]).to.equal("Story-1-2.md")
			expect(result.workflowValueWrites[DevStoryWorkflowValueKey.SelectedStoryIdentity]).to.equal("1.2")
			expect(result.workflowValueWrites[DevStoryWorkflowValueKey.SelectedStoryType]).to.equal("primary")
			expect(result.workflowValueWrites[DevStoryWorkflowValueKey.EpicIdentity]).to.equal("1")
			expect(result.workflowValueWrites[DevStoryWorkflowValueKey.StoryGeneralInstructions]).to.equal("General guidance")
			expect(result.workflowValueWrites[DevStoryWorkflowValueKey.CurrentStoryTaskId]).to.equal("1")
			expect(JSON.stringify(result.workflowValueWrites[DevStoryWorkflowValueKey.StoryTaskInventory])).to.include(
				"Subtask 1.1",
			)
		} finally {
			await rm(tempRoot, { recursive: true, force: true })
		}
	})

	it("routes parser setup failures or already-complete stories to terminal-error results", async () => {
		const tempRoot = await mkdtemp(join(tmpdir(), "dev-story-complete-"))
		try {
			const storyPath = join(tempRoot, "implementation", "stories-backlog", "Story-1-2.md")
			await mkdir(join(tempRoot, "implementation", "stories-backlog"), { recursive: true })
			await writeFile(storyPath, buildStoryMarkdown({ allComplete: true }), "utf8")

			const result = await setupDevStoryFromTargetStory(
				createSession({
					activeStepNumber: 1,
					activeBranchId: "step-1-setup-target-story",
					workflowValues: {
						[DevStoryWorkflowValueKey.TargetStory]: storyPath,
					},
				}),
			)
			expect(result.kind).to.equal("failed")
			if (result.kind !== "failed") {
				throw new Error("Expected setup failure for already-complete story.")
			}
			expect(result.errorMessage).to.include("no incomplete tasks")
		} finally {
			await rm(tempRoot, { recursive: true, force: true })
		}
	})
})

describe("devStoryWorkflowDefinition Step 2", () => {
	it("projects the initial full Step 2 prompt with current task detail", () => {
		const prompt = getPromptInstructions({
			stepId: "step-2",
			activeBranchId: DEV_STORY_STEP_2_INITIAL_PROMPT_BRANCH_ID,
			workflowValues: createWorkflowValues({
				currentStoryTaskId: "1",
				firstTaskComplete: false,
				secondTaskComplete: false,
				thirdTaskComplete: false,
			}),
		})

		expect(prompt).to.include("General guidance")
		expect(prompt).to.include("Objective detail")
		expect(prompt).to.include("Scope detail")
		expect(prompt).to.include("Boundary detail")
		expect(prompt).to.include("Requirement detail")
		expect(prompt).to.include("Issue detail")
		expect(prompt).to.be.a("string").and.not.empty
		expect(prompt).to.include("General guidance")
		expect(prompt).to.include("Objective detail")
		expect(prompt).to.include("- [ ] Task 1: Update runtime")
		expect(prompt).to.include("  - [ ] Subtask 1.1: Update runtime contract")
		expect(prompt).to.not.include("- [ ] Task 2: Update prompt projection")
		expectNoDevStoryWorkflowPromptTokens(prompt)
	})

	it("does not define an automatic task-loop prompt route for ordinary subtask completions without a queued workflow event", () => {
		const branch = getStep("step-2").decisionTree.branches[DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID]
		if (branch === undefined) {
			throw new Error("Missing Step 2 task-loop branch.")
		}

		expect(branch.routes.some((route) => route.trigger.kind === "always")).to.equal(false)
	})

	it("routes parent completion with remaining tasks to task-loop prompt detail only", () => {
		const route = findStepRoute(
			"step-2",
			DEV_STORY_STEP_2_INITIAL_PROMPT_BRANCH_ID,
			"step-2-project-next-task-after-parent-complete",
		)
		expectEventPredicateMatches({
			stepId: "step-2",
			branchId: DEV_STORY_STEP_2_INITIAL_PROMPT_BRANCH_ID,
			route,
			workflowValues: createWorkflowValues({
				currentStoryTaskId: "2",
				firstTaskComplete: true,
				secondTaskComplete: false,
				thirdTaskComplete: false,
			}),
			triggerEvent: buildModelToolSucceededEvent(ClineDefaultTool.STORY_TASK_COMPLETE),
		})
		expect(route.action).to.deep.equal({
			kind: "project_prompt",
		})
		expect(route.followingBranchId).to.equal(DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID)

		const prompt = getPromptInstructions({
			stepId: "step-2",
			activeBranchId: DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID,
			workflowValues: createWorkflowValues({
				currentStoryTaskId: "2",
				firstTaskComplete: true,
				secondTaskComplete: false,
				thirdTaskComplete: false,
			}),
		})
		expect(prompt).to.include("- [ ] Task 2: Update prompt projection")
		expect(prompt).to.include("  - [ ] Subtask 2.1: Project task detail")
		expect(prompt).to.not.include("General guidance")
		expect(prompt).to.not.include("- [ ] Task 1: Update runtime")
		expectNoDevStoryWorkflowPromptTokens(prompt)
	})

	it("continues task-loop prompt detail while incomplete tasks remain", () => {
		const route = findStepRoute(
			"step-2",
			DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID,
			"step-2-project-next-task-after-loop-parent-complete",
		)
		expectEventPredicateMatches({
			stepId: "step-2",
			branchId: DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID,
			route,
			workflowValues: createWorkflowValues({
				currentStoryTaskId: "3",
				firstTaskComplete: true,
				secondTaskComplete: true,
				thirdTaskComplete: false,
			}),
			triggerEvent: buildModelToolSucceededEvent(ClineDefaultTool.STORY_TASK_COMPLETE),
		})

		const prompt = getPromptInstructions({
			stepId: "step-2",
			activeBranchId: DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID,
			workflowValues: createWorkflowValues({
				currentStoryTaskId: "3",
				firstTaskComplete: true,
				secondTaskComplete: true,
				thirdTaskComplete: false,
			}),
		})
		expect(prompt).to.include("- [ ] Task 3: Validate workflow")
		expect(prompt).to.include("  - [ ] Subtask 3.1: Run validation")
		expect(prompt).to.not.include("Objective detail")
		expect(prompt).to.not.include("- [ ] Task 2: Update prompt projection")
		expectNoDevStoryWorkflowPromptTokens(prompt)
	})

	it("transitions to Step 3 when story task inventory is complete", () => {
		const route = findStepRoute(
			"step-2",
			DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID,
			"step-2-transition-to-step-3-after-loop-all-complete",
		)
		expectEventPredicateMatches({
			stepId: "step-2",
			branchId: DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID,
			route,
			workflowValues: createWorkflowValues({
				currentStoryTaskId: "3",
				firstTaskComplete: true,
				secondTaskComplete: true,
				thirdTaskComplete: true,
			}),
			triggerEvent: buildModelToolSucceededEvent(ClineDefaultTool.STORY_TASK_COMPLETE),
		})
		expectTransitionStepAction(route.action, 3)
	})

	it("does not transition to Step 3 while story task inventory remains incomplete", () => {
		const route = findStepRoute(
			"step-2",
			DEV_STORY_STEP_2_INITIAL_PROMPT_BRANCH_ID,
			"step-2-transition-to-step-3-after-all-complete",
		)
		expectEventPredicateDoesNotMatch({
			stepId: "step-2",
			branchId: DEV_STORY_STEP_2_INITIAL_PROMPT_BRANCH_ID,
			route,
			workflowValues: createWorkflowValues({
				currentStoryTaskId: "1",
				firstTaskComplete: false,
				secondTaskComplete: false,
				thirdTaskComplete: false,
			}),
			triggerEvent: buildModelToolSucceededEvent(ClineDefaultTool.STORY_TASK_COMPLETE),
		})
	})
})

describe("devStoryWorkflowDefinition Step 3 and Step 4", () => {
	it("projects a non-empty Step 3 final recap prompt and routes attempt_completion to Step 4", () => {
		const prompt = getPromptInstructions({
			stepId: "step-3",
			activeBranchId: "step-3-project-prompt",
			workflowValues: createWorkflowValues({
				currentStoryTaskId: "3",
				firstTaskComplete: true,
				secondTaskComplete: true,
				thirdTaskComplete: true,
			}),
		})
		expect(prompt).to.be.a("string").and.not.empty
		expectNoDevStoryWorkflowPromptTokens(prompt)

		const projectPromptRoute = findStepRoute("step-3", "step-3-project-prompt", "step-3-project-prompt")
		expect(projectPromptRoute.action).to.deep.equal({
			kind: "project_prompt",
		})
		expect(projectPromptRoute.followingBranchId).to.equal("step-3-await-attempt-completion")

		const transitionRoute = findStepRoute("step-3", "step-3-await-attempt-completion", "step-3-transition-to-step-4")
		expect(transitionRoute.trigger).to.deep.equal({
			kind: "on_event",
			eventKind: "attempt_completion_succeeded",
		})
		expectTransitionStepAction(transitionRoute.action, 4)
	})

	it("defines Step 4 Panel A and Panel B field shapes", () => {
		const form = getWorkflowForm(DEV_STORY_STEP_4_FORM_ID)
		const panelA = getPanel(form, DEV_STORY_STEP_4_PANEL_A_UNPERMITTED_FILES_ID)
		expect(panelA.title).to.equal("Unpermitted File Changes Detected")
		expect(panelA.promptMarkdown).to.equal(
			"The following file(s) were created or modified, and are not included in the target story's allowed files list. Please select any files below which should be included in the story's commit.",
		)
		expect(panelA.allowedActions).to.deep.equal(["submit"])
		expect(panelA.actionLabels).to.deep.equal({ submit: "submit" })

		const panelAField = getSingleField(panelA)
		expect(panelAField).to.deep.equal({
			key: "selected_unpermitted_file_paths",
			workflowValueKey: "selected_unpermitted_file_paths",
			kind: "checkbox_group",
			label: "unpermitted files",
			required: false,
			allowedValueType: "array",
			selectionCardinality: "unbounded",
			workflowValueOptionsSource: {
				workflowValueKey: "unpermitted_file_paths",
				valueSource: "array_string_entry",
				labelSource: "array_string_entry",
			},
		})

		const panelB = getPanel(form, DEV_STORY_STEP_4_PANEL_B_COMMIT_CONFIRMATION_ID)
		expect(panelB.title).to.equal("Commit Confirmation")
		expect(panelB.promptMarkdown).to.equal("")
		expect(panelB.allowedActions).to.deep.equal(["submit"])
		expect(panelB.actionLabels).to.deep.equal({ submit: "submit" })

		const panelBField = getSingleField(panelB)
		expect(panelBField).to.deep.equal({
			key: "commit_staged_files",
			workflowValueKey: "commit_staged_files",
			kind: "boolean",
			label: "Would you like to commit the staged files?",
			required: true,
			allowedValueType: "boolean",
			trueLabel: "Yes",
			falseLabel: "No",
		})
	})

	it("routes Step 4 move, status update, git finalization, form continuation, and completion", () => {
		const validateRoute = findStepRoute("step-4", "step-4-validate-story-index", "step-4-validate-story-index")
		expect(validateRoute.action.kind).to.equal("run_deterministic_procedure")
		expect(validateRoute.followingBranchId).to.equal("step-4-move-story-to-review")

		const moveRoute = findStepRoute("step-4", "step-4-move-story-to-review", "step-4-move-story-to-review")
		expect(moveRoute.action).to.deep.equal({
			kind: "move_project_file",
			sourceFolderSegments: ["implementation", "stories-backlog"],
			destinationFolderSegments: ["implementation", "stories-review"],
			filenameWorkflowValueKey: "target_story_filename",
		})

		const statusRoute = findStepRoute("step-4", "step-4-await-story-move", "step-4-update-story-index-status-to-review")
		expectEventPredicateMatches({
			stepId: "step-4",
			branchId: "step-4-await-story-move",
			route: statusRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent("step-4-move-story-to-review", "step-4-move-story-to-review"),
		})
		expect(statusRoute.action).to.deep.equal({
			kind: "update_story_index_status",
			storyIndexWorkflowValueKey: "stories_index",
			storyIdentityWorkflowValueKey: "selected_story_identity",
			status: "review",
			expectedCurrentStatus: "backlog",
		})

		const prepareRoute = findStepRoute("step-4", "step-4-await-story-status-update", "step-4-prepare-staging")
		expectEventPredicateMatches({
			stepId: "step-4",
			branchId: "step-4-await-story-status-update",
			route: prepareRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent(
				"step-4-await-story-move",
				"step-4-update-story-index-status-to-review",
			),
		})
		expect(prepareRoute.action.kind).to.equal("execute_tool_backed_operation")
		if (prepareRoute.action.kind !== "execute_tool_backed_operation") {
			throw new Error(`Expected execute_tool_backed_operation, received ${prepareRoute.action.kind}.`)
		}
		expect(prepareRoute.action.instruction.buildToolExecutionRequest).to.be.a("function")
		expect(
			prepareRoute.action.instruction.buildToolExecutionRequest({
				toolBackedOperationSession: createStepResolutionSession(
					"step-4-await-story-status-update",
					"step-4-prepare-staging",
				),
				activeWorkflowSession: createSession({
					activeStepNumber: 4,
					activeBranchId: "step-4-await-story-status-update",
					workflowValues: {},
				}),
			}),
		).to.deep.equal({
			toolName: ClineDefaultTool.DEV_STORY_GIT_FINALIZE,
			toolInput: {},
			toolParams: {
				operation: "prepare_staging",
			},
		})

		const unpermittedRoute = findStepRoute("step-4", "step-4-await-prepare-staging", "step-4-render-unpermitted-files-panel")
		expectEventPredicateMatches({
			stepId: "step-4",
			branchId: "step-4-await-prepare-staging",
			route: unpermittedRoute,
			workflowValues: {
				[DevStoryWorkflowValueKey.UnpermittedFilePaths]: ["src/untracked.ts"],
			},
			triggerEvent: buildToolBackedOperationSucceededEvent("step-4-await-story-status-update", "step-4-prepare-staging"),
		})
		expect(unpermittedRoute.action).to.deep.equal({
			kind: "render_workflow_form",
			workflowFormId: DEV_STORY_STEP_4_FORM_ID,
			startPanelId: DEV_STORY_STEP_4_PANEL_A_UNPERMITTED_FILES_ID,
		})

		const commitPanelRoute = findStepRoute(
			"step-4",
			"step-4-await-prepare-staging",
			"step-4-render-commit-confirmation-panel",
		)
		expectEventPredicateMatches({
			stepId: "step-4",
			branchId: "step-4-await-prepare-staging",
			route: commitPanelRoute,
			workflowValues: {
				[DevStoryWorkflowValueKey.UnpermittedFilePaths]: [],
			},
			triggerEvent: buildToolBackedOperationSucceededEvent("step-4-await-story-status-update", "step-4-prepare-staging"),
		})
		expect(commitPanelRoute.action).to.deep.equal({
			kind: "render_workflow_form",
			workflowFormId: DEV_STORY_STEP_4_FORM_ID,
			startPanelId: DEV_STORY_STEP_4_PANEL_B_COMMIT_CONFIRMATION_ID,
		})

		const stageSelectedRoute = findStepRoute("step-4", "step-4-await-panel-a", "step-4-stage-selected-unpermitted")
		expectEventPredicateMatches({
			stepId: "step-4",
			branchId: "step-4-await-panel-a",
			route: stageSelectedRoute,
			workflowValues: {},
			triggerEvent: buildWorkflowFormPanelSubmittedEvent(DEV_STORY_STEP_4_PANEL_A_UNPERMITTED_FILES_ID),
		})
		expect(stageSelectedRoute.action.kind).to.equal("execute_tool_backed_operation")

		const continueRoute = findStepRoute(
			"step-4",
			"step-4-await-stage-selected-unpermitted",
			"step-4-continue-to-commit-confirmation-panel",
		)
		expectEventPredicateMatches({
			stepId: "step-4",
			branchId: "step-4-await-stage-selected-unpermitted",
			route: continueRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent("step-4-await-panel-a", "step-4-stage-selected-unpermitted"),
		})
		expect(continueRoute.action.kind).to.equal("continue_workflow_form")
		if (continueRoute.action.kind !== "continue_workflow_form") {
			throw new Error(`Expected continue_workflow_form, received ${continueRoute.action.kind}.`)
		}
		expect(continueRoute.action.workflowFormId).to.equal(DEV_STORY_STEP_4_FORM_ID)
		expect(continueRoute.action.panelId).to.equal(DEV_STORY_STEP_4_PANEL_B_COMMIT_CONFIRMATION_ID)

		const commitRoute = findStepRoute("step-4", "step-4-await-panel-b", "step-4-commit-staged")
		expectEventPredicateMatches({
			stepId: "step-4",
			branchId: "step-4-await-panel-b",
			route: commitRoute,
			workflowValues: {},
			triggerEvent: buildWorkflowFormPanelSubmittedEvent(DEV_STORY_STEP_4_PANEL_B_COMMIT_CONFIRMATION_ID),
		})
		expect(commitRoute.action.kind).to.equal("execute_tool_backed_operation")

		const completionRoute = findStepRoute(
			"step-4",
			"step-4-await-commit-staged",
			"step-4-complete-workflow-after-commit-decision",
		)
		expectEventPredicateMatches({
			stepId: "step-4",
			branchId: "step-4-await-commit-staged",
			route: completionRoute,
			workflowValues: {},
			triggerEvent: buildToolBackedOperationSucceededEvent("step-4-await-panel-b", "step-4-commit-staged"),
		})
		expect(completionRoute.action).to.deep.equal({
			kind: "complete_workflow",
		})
	})

	it("uses exact Step 4 git-finalize status definitions", () => {
		const prepareInstruction = buildDevStoryGitFinalizeInstruction("prepare_staging")
		const stageInstruction = buildDevStoryGitFinalizeInstruction("stage_selected_unpermitted")
		const commitInstruction = buildDevStoryGitFinalizeInstruction("commit_staged")
		const session = createStepResolutionSession("step-4-await-story-status-update", "step-4-prepare-staging")

		expect(prepareInstruction.buildStatusDefinition(session)).to.deep.equal({
			title: "Prepare Staging",
			pendingLabel: "Preparing staged files",
			successLabel: "Prepared staged files",
			failureLabel: "Failed to prepare staged files",
		})
		expect(stageInstruction.buildStatusDefinition(session)).to.deep.equal({
			title: "Stage Selected Unpermitted Files",
			pendingLabel: "Staging selected unpermitted files",
			successLabel: "Staged selected unpermitted files",
			failureLabel: "Failed to stage selected unpermitted files",
		})
		expect(commitInstruction.buildStatusDefinition(session)).to.deep.equal({
			title: "Commit Staged Files",
			pendingLabel: "Committing staged files",
			successLabel: "Committed staged files",
			failureLabel: "Failed to commit staged files",
		})
		expect(commitInstruction.evaluateToolExecutionResult(session, { toolResultText: "{}" })).to.deep.equal({
			succeeded: true,
		})
	})

	it("falls back to concrete Step 4 backend failure messages when failed events are unmatched", async () => {
		const runtime = new WorkflowRuntime({
			cwd: TEST_PROJECT_ROOT,
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})
		const failureCases: readonly {
			activeBranchId: string
			sourceBranchId: string
			sourceRouteId: string
			errorMessage: string
		}[] = [
			{
				activeBranchId: "step-4-await-story-move",
				sourceBranchId: "step-4-move-story-to-review",
				sourceRouteId: "step-4-move-story-to-review",
				errorMessage: "story move failed because the review destination already exists",
			},
			{
				activeBranchId: "step-4-await-story-status-update",
				sourceBranchId: "step-4-await-story-move",
				sourceRouteId: "step-4-update-story-index-status-to-review",
				errorMessage: "story index status update failed because the current status is blocked",
			},
			{
				activeBranchId: "step-4-await-prepare-staging",
				sourceBranchId: "step-4-await-story-status-update",
				sourceRouteId: "step-4-prepare-staging",
				errorMessage: "prepare staging failed because no allowed files were stageable",
			},
			{
				activeBranchId: "step-4-await-stage-selected-unpermitted",
				sourceBranchId: "step-4-await-panel-a",
				sourceRouteId: "step-4-stage-selected-unpermitted",
				errorMessage: "stage selected unpermitted files failed because one selected file was blocked",
			},
			{
				activeBranchId: "step-4-await-commit-staged",
				sourceBranchId: "step-4-await-panel-b",
				sourceRouteId: "step-4-commit-staged",
				errorMessage: "commit staged files failed because git rejected the commit",
			},
		]

		for (const failureCase of failureCases) {
			const lastTriggerEvent = buildToolBackedOperationFailedEvent({
				branchId: failureCase.sourceBranchId,
				routeId: failureCase.sourceRouteId,
				errorMessage: failureCase.errorMessage,
			})
			const activeSession = createSessionWithLastTriggerEvent({
				activeStepNumber: 4,
				activeBranchId: failureCase.activeBranchId,
				workflowValues: createWorkflowValues({
					currentStoryTaskId: "3",
					firstTaskComplete: true,
					secondTaskComplete: true,
					thirdTaskComplete: true,
				}),
				lastTriggerEvent,
			})
			const result = await runtime.resolveNextAction({
				taskState: createTaskStateWithActiveSession(activeSession),
			})

			expect(result.kind).to.equal("terminal_error")
			if (result.kind !== "terminal_error") {
				throw new Error(`Expected terminal_error, received ${result.kind}.`)
			}
			expect(result.errorMessage).to.include(failureCase.errorMessage)
		}
	})
})
