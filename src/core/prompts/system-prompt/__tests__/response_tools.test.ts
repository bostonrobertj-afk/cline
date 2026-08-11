import { expect } from "chai"
import { describe, it } from "mocha"
import type { ActiveWorkflowSession, WorkflowPromptBuilderInput } from "@/core/task/workflow-runtime/types"
import { createArchitectureWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/create-architecture"
import { createEpicsWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/create-epics"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import { getCurrentModeResponseToolsLine, getResponseToolsSection } from "../components/response_tools"
import type { ClineToolSpec } from "../spec"
import type { SystemPromptContext } from "../types"

const makeContext = (overrides: Partial<SystemPromptContext> = {}): SystemPromptContext =>
	({
		ide: "TestIde",
		providerInfo: {
			mode: "act",
			providerId: "test",
			model: { id: "test-model", info: { supportsPromptCache: false } },
		},
		yoloModeToggled: false,
		...overrides,
	}) as SystemPromptContext

const buildWorkflowDocumentToolSpec: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,
	name: "build_workflow_document",
	description: "Build a workflow document.",
}

const workflowProgressRequestToolSpec: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
	name: "workflow_progress_request",
	description: "Ask the user to confirm whether the current workflow step is ready to advance.",
}

const archiveWorkflowArtifactToolSpec: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.ARCHIVE_WORKFLOW_ARTIFACT,
	name: "archive_workflow_artifact",
	description: "Archive a workflow artifact.",
}

const deleteWorkflowArtifactToolSpec: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.DELETE_WORKFLOW_ARTIFACT,
	name: "delete_workflow_artifact",
	description: "Delete a workflow artifact.",
}

const moveWorkflowProjectFileToolSpec: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE,
	name: "move_workflow_project_file",
	description: "Move a workflow project file.",
}

type CreateArchitectureResponseToolStepId = "step-3" | "step-4" | "step-9"

interface CreateArchitectureResponseToolCase {
	stepId: CreateArchitectureResponseToolStepId
	activeStepNumber: 3 | 4 | 9
	expectedLine: string
	expectedSectionNames: readonly string[]
	absentSectionNames: readonly string[]
}

function createCreateArchitecturePromptBuilderInput(args: {
	stepId: CreateArchitectureResponseToolStepId
	activeStepNumber: 3 | 4 | 9
}): WorkflowPromptBuilderInput {
	const step = createArchitectureWorkflowDefinition.steps[args.stepId]
	const session: ActiveWorkflowSession = {
		activeStepNumber: args.activeStepNumber,
		workflowValues: {
			output_file: "/test/project/planning/architecture.md",
		},
		projectSelection: {
			projectMode: "new",
			projectTitle: "Create Architecture Session",
			projectFolderName: "create-architecture-session",
		},
		lifecycle: {
			projectSelectionCompleted: true,
		},
		entryArtifactResolution: undefined,
		prerequisiteFileResolutions: [],
		ui: {
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext: {
			activeBranchId: step.decisionTree.entryBranchId,
		},
	}

	return {
		session,
		step,
	}
}

function buildCreateArchitectureWorkflowToolSchemaOverride(args: {
	stepId: CreateArchitectureResponseToolStepId
	activeStepNumber: 3 | 4 | 9
}): readonly ClineToolSpec[] {
	const step = createArchitectureWorkflowDefinition.steps[args.stepId]
	return step.buildToolSchema(createCreateArchitecturePromptBuilderInput(args))
}

function createCreateEpicsPromptBuilderInput(): WorkflowPromptBuilderInput {
	const step = createEpicsWorkflowDefinition.steps["step-2"]
	const session: ActiveWorkflowSession = {
		activeStepNumber: 2,
		workflowValues: {
			output_file: "/test/project/planning/Epics.md",
			architecture_document: "/test/project/planning/architecture.md",
			brainstorming_document: "/test/project/discovery/brainstorming.md",
			additional_context_files: "/test/project/planning/domain-notes.md",
		},
		projectSelection: {
			projectMode: "new",
			projectTitle: "Create Epics Session",
			projectFolderName: "create-epics-session",
		},
		lifecycle: {
			projectSelectionCompleted: true,
		},
		entryArtifactResolution: undefined,
		prerequisiteFileResolutions: [],
		ui: {
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext: {
			activeBranchId: step.decisionTree.entryBranchId,
		},
	}

	return {
		session,
		step,
	}
}

function buildCreateEpicsWorkflowToolSchemaOverride(): readonly ClineToolSpec[] {
	const step = createEpicsWorkflowDefinition.steps["step-2"]
	return step.buildToolSchema(createCreateEpicsPromptBuilderInput())
}

describe("response tools prompt helpers", () => {
	it("omits workflow_progress_request from non-native ACT response tools", () => {
		const context = makeContext()

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.contain("`attempt_completion`")
		expect(currentModeLine).to.contain("`ask_followup_question`")
		expect(currentModeLine).to.contain("`send_user_message`")
		expect(currentModeLine).to.not.contain("`workflow_progress_request`")
		expect(currentModeLine).to.not.contain("`act_mode_respond`")
		expect(responseToolsSection).to.contain("- `attempt_completion`: Use once at the end of each workflow")
		expect(responseToolsSection).to.contain(
			"- `ask_followup_question`: Use to ask a question + present options for user to select",
		)
		expect(responseToolsSection).to.contain("- `send_user_message`: Use by default to send messages to the user")
		expect(responseToolsSection).to.not.contain("- `workflow_progress_request`:")
		expect(responseToolsSection).to.not.contain("- `act_mode_respond`:")
	})

	it("omits workflow_progress_request from non-native PLAN response tools", () => {
		const context = makeContext({ providerInfo: { ...makeContext().providerInfo, mode: "plan" } })

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.contain("`generate_plan_output`")
		expect(currentModeLine).to.contain("`ask_followup_question`")
		expect(currentModeLine).to.contain("`send_user_message`")
		expect(currentModeLine).to.not.contain("`workflow_progress_request`")
		expect(currentModeLine).to.not.contain("`act_mode_respond`")
		expect(responseToolsSection).to.contain("- `generate_plan_output`: Use to present a structured plan")
		expect(responseToolsSection).to.not.contain("- `workflow_progress_request`:")
	})

	it("renders workflow_progress_request from ACT response tools when native visibility includes it", () => {
		const context = makeContext({
			enableNativeToolCalls: true,
			visibleNativeToolNames: [
				"attempt_completion",
				"ask_followup_question",
				"workflow_progress_request",
				"send_user_message",
			],
		})

		expect(getCurrentModeResponseToolsLine(context)).to.contain("`workflow_progress_request`")
		expect(getResponseToolsSection(context)).to.contain(
			"- `workflow_progress_request`: Use to ask the user to confirm whether the current workflow step is ready to advance",
		)
	})

	it("omits workflow_progress_request from ACT response tools when native visibility excludes it", () => {
		const context = makeContext({
			enableNativeToolCalls: true,
			visibleNativeToolNames: ["attempt_completion", "ask_followup_question", "send_user_message"],
		})

		expect(getCurrentModeResponseToolsLine(context)).to.not.contain("`workflow_progress_request`")
		expect(getResponseToolsSection(context)).to.not.contain("`workflow_progress_request`")
	})

	it("renders ACT response tools when present in native visibility", () => {
		const context = makeContext({
			enableNativeToolCalls: true,
			visibleNativeToolNames: ["attempt_completion", "ask_followup_question", "send_user_message"],
		})

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.contain("`attempt_completion`")
		expect(currentModeLine).to.contain("`ask_followup_question`")
		expect(currentModeLine).to.contain("`send_user_message`")
		expect(responseToolsSection).to.contain("- `attempt_completion`: Use once at the end of each workflow")
		expect(responseToolsSection).to.contain(
			"- `ask_followup_question`: Use to ask a question + present options for user to select",
		)
		expect(responseToolsSection).to.contain("- `send_user_message`: Use by default to send messages to the user")
	})

	it("renders workflow_progress_request from PLAN response tools when native visibility includes it", () => {
		const context = makeContext({
			providerInfo: { ...makeContext().providerInfo, mode: "plan" },
			enableNativeToolCalls: true,
			visibleNativeToolNames: [
				"generate_plan_output",
				"ask_followup_question",
				"workflow_progress_request",
				"send_user_message",
			],
		})

		expect(getCurrentModeResponseToolsLine(context)).to.contain("`workflow_progress_request`")
		expect(getCurrentModeResponseToolsLine(context)).to.not.contain("`act_mode_respond`")
		expect(getResponseToolsSection(context)).to.contain(
			"- `workflow_progress_request`: Use to ask the user to confirm whether the current workflow step is ready to advance",
		)
	})

	it("mentions act_mode_respond only when it is visible in native ACT mode", () => {
		const visibleContext = makeContext({
			enableNativeToolCalls: true,
			visibleNativeToolNames: [
				"attempt_completion",
				"ask_followup_question",
				"workflow_progress_request",
				"send_user_message",
				"act_mode_respond",
			],
		})

		expect(getCurrentModeResponseToolsLine(visibleContext)).to.contain("`act_mode_respond`")
		expect(getResponseToolsSection(visibleContext)).to.contain("`act_mode_respond`")

		const hiddenContext = makeContext({
			enableNativeToolCalls: true,
			visibleNativeToolNames: [
				"attempt_completion",
				"ask_followup_question",
				"workflow_progress_request",
				"send_user_message",
			],
		})

		expect(getCurrentModeResponseToolsLine(hiddenContext)).to.not.contain("`act_mode_respond`")
		expect(getResponseToolsSection(hiddenContext)).to.not.contain("`act_mode_respond`")
	})

	it("renders no response guidance for a non-native workflow override without response tools", () => {
		const context = makeContext({
			enableNativeToolCalls: false,
			workflowToolSchemaOverride: [buildWorkflowDocumentToolSpec],
		})

		expect(getCurrentModeResponseToolsLine(context)).to.equal(undefined)
		expect(getResponseToolsSection(context)).to.equal("")
	})

	it("does not render backend-only workflow file-operation response guidance", () => {
		const nonNativeContext = makeContext({
			enableNativeToolCalls: false,
			workflowToolSchemaOverride: [
				archiveWorkflowArtifactToolSpec,
				deleteWorkflowArtifactToolSpec,
				moveWorkflowProjectFileToolSpec,
			],
		})

		expect(getCurrentModeResponseToolsLine(nonNativeContext)).to.equal(undefined)
		expect(getResponseToolsSection(nonNativeContext)).to.equal("")

		const nativeContext = makeContext({
			enableNativeToolCalls: true,
			visibleNativeToolNames: [
				"send_user_message",
				"archive_workflow_artifact",
				"delete_workflow_artifact",
				"move_workflow_project_file",
			],
		})
		const currentModeLine = getCurrentModeResponseToolsLine(nativeContext)
		const responseToolsSection = getResponseToolsSection(nativeContext)

		expect(currentModeLine).to.contain("`send_user_message`")
		expect(currentModeLine).to.not.contain("`archive_workflow_artifact`")
		expect(currentModeLine).to.not.contain("`delete_workflow_artifact`")
		expect(currentModeLine).to.not.contain("`move_workflow_project_file`")
		expect(responseToolsSection).to.contain("`send_user_message`")
		expect(responseToolsSection).to.not.contain("`archive_workflow_artifact`")
		expect(responseToolsSection).to.not.contain("`delete_workflow_artifact`")
		expect(responseToolsSection).to.not.contain("`move_workflow_project_file`")
	})

	it("renders only projected response guidance for a non-native workflow override", () => {
		const context = makeContext({
			enableNativeToolCalls: false,
			workflowToolSchemaOverride: [workflowProgressRequestToolSpec],
		})

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.equal("- Use `workflow_progress_request` when responding to the user.")
		expect(responseToolsSection).to.contain(
			"- `workflow_progress_request`: Use to ask the user to confirm whether the current workflow step is ready to advance",
		)
		expect(responseToolsSection).to.not.contain("`attempt_completion`")
		expect(responseToolsSection).to.not.contain("`ask_followup_question`")
		expect(responseToolsSection).to.not.contain("`send_user_message`")
		expect(responseToolsSection).to.not.contain("`act_mode_respond`")
		expect(responseToolsSection).to.not.contain("`generate_plan_output`")
	})

	it("derives create-architecture response guidance from active workflow schemas", () => {
		const responseToolCases: readonly CreateArchitectureResponseToolCase[] = [
			{
				stepId: "step-3",
				activeStepNumber: 3,
				expectedLine:
					"- Use `send_user_message`, `ask_followup_question` and `workflow_progress_request` when responding to the user.",
				expectedSectionNames: ["`send_user_message`", "`ask_followup_question`", "`workflow_progress_request`"],
				absentSectionNames: ["`attempt_completion`", "`act_mode_respond`", "`generate_plan_output`"],
			},
			{
				stepId: "step-4",
				activeStepNumber: 4,
				expectedLine:
					"- Use `send_user_message`, `ask_followup_question` and `workflow_progress_request` when responding to the user.",
				expectedSectionNames: ["`send_user_message`", "`ask_followup_question`", "`workflow_progress_request`"],
				absentSectionNames: ["`attempt_completion`", "`act_mode_respond`", "`generate_plan_output`"],
			},
			{
				stepId: "step-9",
				activeStepNumber: 9,
				expectedLine:
					"- Use `send_user_message`, `ask_followup_question` and `attempt_completion` when responding to the user.",
				expectedSectionNames: ["`send_user_message`", "`ask_followup_question`", "`attempt_completion`"],
				absentSectionNames: ["`workflow_progress_request`", "`act_mode_respond`", "`generate_plan_output`"],
			},
		]

		for (const responseToolCase of responseToolCases) {
			const context = makeContext({
				enableNativeToolCalls: false,
				workflowToolSchemaOverride: buildCreateArchitectureWorkflowToolSchemaOverride(responseToolCase),
			})
			const currentModeLine = getCurrentModeResponseToolsLine(context)
			const responseToolsSection = getResponseToolsSection(context)

			expect(currentModeLine).to.equal(responseToolCase.expectedLine)
			for (const expectedSectionName of responseToolCase.expectedSectionNames) {
				expect(responseToolsSection).to.contain(expectedSectionName)
			}
			for (const absentSectionName of responseToolCase.absentSectionNames) {
				expect(responseToolsSection).to.not.contain(absentSectionName)
			}
		}
	})

	it("derives create-epics Step 2 response guidance only from projected response tools", () => {
		const context = makeContext({
			enableNativeToolCalls: false,
			workflowToolSchemaOverride: buildCreateEpicsWorkflowToolSchemaOverride(),
		})
		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.equal(
			"- Use `send_user_message`, `ask_followup_question` and `attempt_completion` when responding to the user.",
		)
		expect(responseToolsSection).to.contain("`send_user_message`")
		expect(responseToolsSection).to.contain("`ask_followup_question`")
		expect(responseToolsSection).to.contain("`attempt_completion`")
		expect(responseToolsSection).to.not.contain("`read_file`")
		expect(responseToolsSection).to.not.contain("`upsert_epic`")
		expect(responseToolsSection).to.not.contain("`workflow_progress_request`")
		expect(responseToolsSection).to.not.contain("`act_mode_respond`")
		expect(responseToolsSection).to.not.contain("`generate_plan_output`")
	})
})
