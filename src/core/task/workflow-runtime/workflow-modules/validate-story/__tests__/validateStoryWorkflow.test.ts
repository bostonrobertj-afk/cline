import { expect } from "chai"
import { describe, it } from "mocha"
import type {
	WorkflowDecisionBranchRoute,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowValues,
} from "../../../types"
import { renderWorkflowPromptTemplate } from "../../../workflowPromptTemplates"
import { buildValidateStoryStep1ToolSchemas } from "../validateStoryToolSchemas"
import {
	VALIDATE_STORY_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID,
	VALIDATE_STORY_ENTRY_PROJECT_VALUE_KEYS,
	VALIDATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID,
	VALIDATE_STORY_PREREQUISITE_FILES,
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

function getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition {
	const step = validateStoryWorkflowDefinition.steps[stepId]
	if (step === undefined) {
		throw new Error(`Missing ${stepId}.`)
	}

	return step
}

function findRoute(branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const branch = getStep("step-1").decisionTree.branches[branchId]
	if (branch === undefined) {
		throw new Error(`Missing branch ${branchId}.`)
	}

	const route = branch.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Missing route ${routeId}.`)
	}

	return route
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

function createPromptBuilderInput(workflowValues: WorkflowValues = createWorkflowValues()): WorkflowPromptBuilderInput {
	return {
		session: {
			activeStepNumber: 1,
			workflowValues,
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
				activeBranchId: "step-1-await-attempt-completion",
			},
		},
		step: getStep("step-1"),
	}
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

	it("declares workflow values without AI-writable values forms artifacts or child inheritance", () => {
		expect(validateStoryWorkflowDefinition.workflowValueKeys).to.deep.equal(VALIDATE_STORY_WORKFLOW_VALUE_KEYS)
		expect(validateStoryWorkflowDefinition.entryProjectValueKeys).to.deep.equal(VALIDATE_STORY_ENTRY_PROJECT_VALUE_KEYS)
		expect(Reflect.has(validateStoryWorkflowDefinition, "aiWritableWorkflowValueKeys")).to.equal(false)
		expect(validateStoryWorkflowDefinition.workflowForms).to.equal(undefined)
		expect(validateStoryWorkflowDefinition.artifacts).to.equal(undefined)
		expect(validateStoryWorkflowDefinition.childInheritance).to.equal(undefined)
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
		expect(getStep("step-1").promptTemplates).to.deep.equal([promptSource.currentStepInstructionTemplate])
	})

	it("renders Step 1 prompt with materialized workflow values and without raw placeholders", () => {
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
		expect(prompt).not.to.include("{workflow.projectTitle}")
		expect(prompt).not.to.include("{workflow.projectFolderName}")
		expect(prompt).not.to.include("{workflow.target_story}")
		expect(prompt).not.to.include("{workflow.epics_document}")
		expect(prompt).not.to.include("{workflow.architecture_document}")
		expect(prompt).not.to.include("projectTitle")
		expect(prompt).not.to.include("projectFolderName")
		expect(prompt).not.to.include("target_story")
		expect(prompt).not.to.include("epics_document")
		expect(prompt).not.to.include("architecture_document")
	})

	it("routes Step 1 through prerequisite resolution project prompt and completion", () => {
		expect(getStep("step-1").decisionTree.entryBranchId).to.equal("step-1-resolve-prerequisites")
		expect(Object.keys(getStep("step-1").decisionTree.branches)).to.deep.equal([
			"step-1-resolve-prerequisites",
			"step-1-start-review",
			"step-1-await-attempt-completion",
		])
		const resolvePrerequisitesRoute = findRoute("step-1-resolve-prerequisites", "step-1-resolve-prerequisites")
		expect(resolvePrerequisitesRoute.action).to.deep.equal({
			kind: "resolve_prerequisite_files",
			prerequisiteIds: [
				VALIDATE_STORY_TARGET_STORY_PREREQUISITE_ID,
				VALIDATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID,
				VALIDATE_STORY_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID,
			],
		})
		expect(resolvePrerequisitesRoute.followingBranchId).to.equal("step-1-start-review")
		const projectPromptRoute = findRoute("step-1-start-review", "step-1-project-prompt")
		expect(projectPromptRoute.action).to.deep.equal({ kind: "project_prompt" })
		expect(projectPromptRoute.followingBranchId).to.equal("step-1-await-attempt-completion")
		const completionRoute = findRoute("step-1-await-attempt-completion", "step-1-complete-workflow")
		expect(completionRoute.trigger).to.deep.equal({ kind: "on_event", eventKind: "attempt_completion_succeeded" })
		expect(completionRoute.action).to.deep.equal({ kind: "complete_workflow" })
	})
})
