/**
 * System Prompt Integration Tests with Snapshot Testing
 *
 * This test suite validates that system prompts remain consistent across different
 * model families and context configurations using snapshot testing.
 *
 * Usage:
 * - Run tests normally: `npm run test:unit`
 *   Tests will fail if generated prompts don't match existing snapshots
 *
 * - Update snapshots: `npm run test:unit -- --update-snapshots`
 *   This will regenerate all snapshot files with current prompt output
 *
 * When tests fail:
 * 1. Review the differences shown in the error message
 * 2. Determine if changes are intentional (e.g., prompt improvements)
 * 3. If changes are correct, run with --update-snapshots to update baselines
 * 4. If changes are unintentional, investigate why prompt generation changed
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"
import { expect } from "chai"
import { TaskState } from "@/core/task/TaskState"
import type {
	ActiveWorkflowSession,
	WorkflowPromptProjection,
	WorkflowValues,
	WorkflowWorkspacePathPolicy,
} from "@/core/task/workflow-runtime/types"
import { WorkflowRuntime } from "@/core/task/workflow-runtime/WorkflowRuntime"
import {
	BlindReviewWorkflowValueKey,
	blindReviewWorkflowDefinition,
	buildBlindReviewStep2ToolSchemas,
} from "@/core/task/workflow-runtime/workflow-modules/blind-review"
import {
	CodeReviewWorkflowValueKey,
	codeReviewWorkflowDefinition,
} from "@/core/task/workflow-runtime/workflow-modules/code-review"
import {
	buildCodeReviewStep2ToolSchemas,
	buildCodeReviewStep3ToolSchemas,
	buildCodeReviewStep4ToolSchemas,
} from "@/core/task/workflow-runtime/workflow-modules/code-review/codeReviewToolSchemas"
import { createArchitectureWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/create-architecture"
import { createEpicsWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/create-epics"
import {
	CreateStoryWorkflowValueKey,
	createStoryWorkflowDefinition,
} from "@/core/task/workflow-runtime/workflow-modules/create-story"
import {
	buildCreateStoryStep2ToolSchemas,
	buildCreateStoryStep3ToolSchemas,
	buildCreateStoryStep4ToolSchemas,
} from "@/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas"
import { DevStoryWorkflowValueKey, devStoryWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/dev-story"
import {
	buildDevStoryStep2ToolSchemas,
	buildDevStoryStep3ToolSchemas,
	buildDevStoryStep4ToolSchemas,
} from "@/core/task/workflow-runtime/workflow-modules/dev-story/devStoryToolSchemas"
import { piPlanningWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/pi-planning"
import type { McpHub } from "@/services/mcp/McpHub"
import type { McpServer } from "@/shared/mcp"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool, type ClineTool } from "@/shared/tools"
import { isGPT5ModelFamily } from "@/utils/model-utils"
import { getSystemPrompt, PromptRegistry } from "../index"
import type { ClineToolSpec } from "../spec"
import type { SystemPromptContext } from "../types"

// ============================================================================
// Configuration
// ============================================================================

const UPDATE_SNAPSHOTS = process.argv.includes("--update-snapshots") || process.env.UPDATE_SNAPSHOTS === "true"
const SNAPSHOTS_DIR = path.join(__dirname, "__snapshots__")
const TEST_TIMEOUT = 30000
const MAX_DIFF_LINES = 10
const STALE_AGENT_FEEDBACK_PROMPT_TEXT =
	"- If you hit a meaningful blocker, material ambiguity, or unstable behavior that affects correctness or progress, include `agent_feedback` on your response tool call with a concise description of the issue."

// ============================================================================
// Snapshot Helpers
// ============================================================================

const formatSnapshotError = (snapshotName: string, details: string): string => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ SNAPSHOT MISMATCH: ${snapshotName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${details}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 To update snapshots: npm run test:unit -- --update-snapshots
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`

const compareStrings = (expected: string, actual: string): string | null => {
	if (expected === actual) {
		return null
	}

	const expectedLines = expected.split("\n")
	const actualLines = actual.split("\n")
	const diffs: string[] = []

	for (let i = 0; i < Math.max(expectedLines.length, actualLines.length) && diffs.length < MAX_DIFF_LINES; i++) {
		const exp = expectedLines[i] || ""
		const act = actualLines[i] || ""
		if (exp !== act) {
			diffs.push(`Line ${i + 1}:`)
			if (exp) {
				diffs.push(`  - Expected: ${exp.substring(0, 100)}${exp.length > 100 ? "..." : ""}`)
			}
			if (act) {
				diffs.push(`  + Actual:   ${act.substring(0, 100)}${act.length > 100 ? "..." : ""}`)
			}
		}
	}

	return [
		`Expected: ${expected.length} chars, ${expectedLines.length} lines`,
		`Actual: ${actual.length} chars, ${actualLines.length} lines`,
		"",
		...diffs,
		diffs.length >= MAX_DIFF_LINES ? "... and more differences" : "",
	].join("\n")
}

async function assertSnapshot(name: string, content: string): Promise<void> {
	const snapshotPath = path.join(SNAPSHOTS_DIR, name)

	if (UPDATE_SNAPSHOTS) {
		await fs.writeFile(snapshotPath, content, "utf-8")
		console.log(`Updated snapshot: ${name} (${content.length} chars)`)
		return
	}

	try {
		const existing = await fs.readFile(snapshotPath, "utf-8")
		const diff = compareStrings(existing, content)
		if (diff) {
			throw new Error(formatSnapshotError(name, diff))
		}
		console.log(`✓ Snapshot matches: ${name}`)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			throw new Error(formatSnapshotError(name, `Snapshot does not exist. Run with --update-snapshots to create it.`))
		}
		throw error
	}
}

function normalizePromptSnapshotSurface(content: string): string {
	const lines = content.split("\n")
	const normalizedLines: string[] = []
	let inResponseToolsSection = false
	let inAccessMcpResourceToolSection = false
	let inVerboseToolSection = false

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		const nextLine = lines[i + 1] ?? ""

		if (
			line.startsWith("## ") &&
			(nextLine.startsWith("Description:") || nextLine.startsWith("Required params:") || nextLine.startsWith("Parameters:"))
		) {
			inVerboseToolSection = true
			continue
		}

		if (inVerboseToolSection) {
			if (
				line.startsWith("## ") &&
				(nextLine.startsWith("Description:") ||
					nextLine.startsWith("Required params:") ||
					nextLine.startsWith("Parameters:"))
			) {
				continue
			}
			if (line.startsWith("# ") || line.startsWith("## ") || line === "====") {
				inVerboseToolSection = false
			} else {
				continue
			}
		}

		if (line === "## access_mcp_resource") {
			inAccessMcpResourceToolSection = true
			continue
		}

		if (inAccessMcpResourceToolSection) {
			if (line.startsWith("## ")) {
				inAccessMcpResourceToolSection = false
			} else {
				continue
			}
		}

		if (line === "RESPONSE TOOLS") {
			inResponseToolsSection = true
			normalizedLines.push(line)
			continue
		}

		if (inResponseToolsSection) {
			if (
				line ===
				"Use these tools to respond to the user. A reply reaches the human user only when you use the appropriate response tool."
			) {
				normalizedLines.push(line)
				continue
			}

			if (line.trim() === "" || line.startsWith("- `") || line.startsWith("In ACT MODE, respond using these:")) {
				continue
			}

			inResponseToolsSection = false
		}

		if (line.startsWith("- ") && !line.includes("`") && !line.startsWith("- [")) {
			normalizedLines.push("- <GUIDANCE>")
			continue
		}

		if (
			!line.startsWith("#") &&
			!line.startsWith("##") &&
			!line.startsWith("```") &&
			!line.startsWith("<") &&
			line.trim().length > 0 &&
			!/^[A-Z0-9 _-]+$/.test(line)
		) {
			normalizedLines.push("<TEXT>")
			continue
		}

		normalizedLines.push(line)
	}

	return normalizedLines.join("\n").replace(/\n{3,}/g, "\n\n")
}

function expectResponseToolNames(prompt: string, expectedNames: string[], absentNames: string[] = []) {
	for (const name of expectedNames) {
		expect(prompt).to.include(name)
	}
	for (const name of absentNames) {
		expect(prompt).to.not.include(name)
	}
}

async function assertNormalizedSnapshot(name: string, content: string, normalizer: (content: string) => string): Promise<void> {
	const snapshotPath = path.join(SNAPSHOTS_DIR, name)

	if (UPDATE_SNAPSHOTS) {
		await fs.writeFile(snapshotPath, content, "utf-8")
		console.log(`Updated snapshot: ${name} (${content.length} chars)`)
		return
	}

	try {
		const existing = await fs.readFile(snapshotPath, "utf-8")
		const diff = compareStrings(normalizer(existing), normalizer(content))
		if (diff) {
			throw new Error(formatSnapshotError(name, diff))
		}
		console.log(`✓ Snapshot matches: ${name}`)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			throw new Error(formatSnapshotError(name, `Snapshot does not exist. Run with --update-snapshots to create it.`))
		}
		throw error
	}
}

// ============================================================================
// Test Context Helpers
// ============================================================================

export const mockProviderInfo = {
	providerId: "test",
	model: { id: "fast", info: { supportsPromptCache: false } },
	mode: "act" as const,
}

const makeProviderInfo = (modelId: string, providerId = "test") => ({
	providerId: modelId.includes("ollama") ? "ollama" : providerId,
	model: { ...mockProviderInfo.model, id: modelId },
	mode: "act" as const,
	customPrompt: providerId.includes("lmstudio") || providerId.includes("ollama") ? "compact" : undefined,
})

type NativeToolEntry = {
	name?: string
	description?: string
}

const makeMcpHub = (servers: McpServer[]): McpHub =>
	({
		getServers: () => servers,
	}) as unknown as McpHub

const makeConnectedServer = (overrides: Partial<McpServer> = {}): McpServer => ({
	uid: "1234567",
	name: "test-server",
	status: "connected",
	config: '{"command": "test"}',
	tools: [{ name: "test_tool", description: "A test tool", inputSchema: { type: "object", properties: {} } }],
	resources: [],
	resourceTemplates: [],
	...overrides,
})

const makeIndxrServer = (overrides: Partial<McpServer> = {}) =>
	makeConnectedServer({
		uid: "indxr-1",
		name: "workspace-index",
		config: '{"command": "indxr"}',
		tools: [
			{ name: "search_relevant", description: "Search relevant code", inputSchema: { type: "object", properties: {} } },
			{ name: "get_file_summary", description: "Summarize file", inputSchema: { type: "object", properties: {} } },
			{ name: "read_source", description: "Read source", inputSchema: { type: "object", properties: {} } },
		],
		...overrides,
	})

const makeWeakIndxrLikeServer = (toolName: string, overrides: Partial<McpServer> = {}) =>
	makeConnectedServer({
		uid: `weak-${toolName}`,
		name: `weak-${toolName}-server`,
		config: '{"command": "generic"}',
		tools: [{ name: toolName, description: `Weak ${toolName}`, inputSchema: { type: "object", properties: {} } }],
		...overrides,
	})

const baseContext: SystemPromptContext = {
	cwd: "/test/project",
	ide: "TestIde",
	supportsBrowserUse: true,
	clineWebToolsEnabled: true,
	subagentsEnabled: true,
	mcpHub: makeMcpHub([makeConnectedServer()]),
	focusChainSettings: { enabled: true, remindClineInterval: 6 },
	browserSettings: { viewport: { width: 1280, height: 720 } },
	globalClineRulesFileInstructions: "Follow global rules",
	localClineRulesFileInstructions: "Follow local rules",
	preferredLanguageInstructions: "Prefer TypeScript",
	isTesting: true,
	providerInfo: mockProviderInfo,
	enableNativeToolCalls: false,
}

const genericWorkflowOverrideToolSpecs: ClineToolSpec[] = [
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.ATTEMPT,
		name: "attempt_completion",
		description: "Attempt completion override",
	},
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.ASK,
		name: "ask_followup_question",
		description: "Ask follow-up override",
	},
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.SEND_USER_MESSAGE,
		name: "send_user_message",
		description: "Send user message override",
	},
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.APPLY_PATCH,
		name: "apply_patch",
		description: "Apply patch override",
	},
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.FILE_READ,
		name: "read_file",
		description: "Read file override",
	},
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.MCP_USE,
		name: "indxr-10mcp0search_relevant",
		description: "workspace-index: Search relevant code",
	},
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.MCP_USE,
		name: "indxr-10mcp0get_file_summary",
		description: "workspace-index: Summarize file",
	},
]

const workflowProgressOnlyToolSpecs: ClineToolSpec[] = [
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
		name: "workflow_progress_request",
		description: "Ask the user to confirm whether the current workflow step is ready to advance.",
	},
]

const workflowBuildDocumentOnlyToolSpecs: ClineToolSpec[] = [
	{
		variant: ModelFamily.GENERIC,
		id: ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,
		name: "build_workflow_document",
		description: "Build a workflow document.",
	},
]

const createWorkflowArtifactNativeOnlyToolSpecs: ClineToolSpec[] = [
	{
		variant: ModelFamily.NATIVE_GPT_5_1,
		id: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
		name: "create_workflow_artifact",
		description: "Create a runtime-allocated workflow artifact.",
		parameters: [
			{
				name: "artifact_id",
				required: true,
				instruction: "Workflow artifact definition id to create.",
				description: "Workflow artifact definition id to create.",
			},
		],
	},
]

const createWorkflowArtifactGenericToolSpecs: ClineToolSpec[] = [
	{
		variant: ModelFamily.GENERIC,
		id: ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT,
		name: "create_workflow_artifact",
		description: "Create a runtime-allocated workflow artifact.",
		parameters: [
			{
				name: "artifact_id",
				required: true,
				instruction: "Workflow artifact definition id to create.",
				description: "Workflow artifact definition id to create.",
			},
		],
	},
]

const getNativeToolEntry = (tool: ClineTool): NativeToolEntry => {
	if ("type" in tool && tool.type === "function") {
		return {
			name: tool.function?.name,
			description: tool.function?.description,
		}
	}

	if ("name" in tool && typeof tool.name === "string") {
		return {
			name: tool.name,
			description: "description" in tool && typeof tool.description === "string" ? tool.description : undefined,
		}
	}

	return {}
}

const getNativeToolEntries = (tools: ClineTool[] | undefined): NativeToolEntry[] => (tools ?? []).map(getNativeToolEntry)

const getNativeToolNames = (tools: ClineTool[] | undefined): string[] =>
	getNativeToolEntries(tools).flatMap((tool) => (tool.name ? [tool.name] : []))

const createBrainstormingWorkflowSession = (input: {
	activeStepNumber: 3 | 4
	workflowValues: WorkflowValues
}): ActiveWorkflowSession => ({
	activeStepNumber: input.activeStepNumber,
	workflowValues: input.workflowValues,
	projectSelection: {
		projectMode: "new",
		projectTitle: "Brainstorming Session",
		projectFolderName: "brainstorming-session",
	},
	lifecycle: {
		projectSelectionCompleted: true,
	},
	entryArtifactResolution: undefined,
	ui: {
		suppressedWorkflowFormIds: [],
		suppressedWorkflowStepResolutionRoutes: [],
	},
	branchContext: {
		activeBranchId: `step-${input.activeStepNumber}`,
	},
})

const buildBrainstormingPromptContext = async (input: {
	activeStepNumber: 3 | 4
	workflowValues: WorkflowValues
}): Promise<SystemPromptContext> => {
	const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
		validateAccess: () => true,
	}
	const runtime = new WorkflowRuntime({ cwd: "/test/project", workspacePathPolicy })
	const taskState = new TaskState()
	taskState.activeWorkflowName = "brainstorming"
	taskState.activeWorkflowSession = createBrainstormingWorkflowSession(input)
	taskState.apiRequestCount = 1
	const workflowProjection = await runtime.buildTurnProjection({ taskState })

	return {
		...baseContext,
		mcpHub: makeMcpHub([]),
		providerInfo: makeProviderInfo("gpt-5-codex", "openai"),
		enableNativeToolCalls: true,
		useMinimalGptPrompt: true,
		...workflowProjection,
	}
}

const CREATE_ARCHITECTURE_OUTPUT_FILE = "/test/project/planning/architecture.md"

const getCreateArchitectureEntryBranchId = (activeStepNumber: 3 | 4 | 9): string => {
	switch (activeStepNumber) {
		case 3:
			return createArchitectureWorkflowDefinition.steps["step-3"].decisionTree.entryBranchId
		case 4:
			return createArchitectureWorkflowDefinition.steps["step-4"].decisionTree.entryBranchId
		case 9:
			return createArchitectureWorkflowDefinition.steps["step-9"].decisionTree.entryBranchId
	}

	const unreachableActiveStepNumber: never = activeStepNumber
	return unreachableActiveStepNumber
}

const createCreateArchitectureWorkflowSession = (activeStepNumber: 3 | 4 | 9): ActiveWorkflowSession => ({
	activeStepNumber,
	workflowValues: {
		output_file: CREATE_ARCHITECTURE_OUTPUT_FILE,
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
	ui: {
		suppressedWorkflowFormIds: [],
		suppressedWorkflowStepResolutionRoutes: [],
	},
	branchContext: {
		activeBranchId: getCreateArchitectureEntryBranchId(activeStepNumber),
	},
})

const buildCreateArchitecturePromptContext = async (
	activeStepNumber: 3 | 4 | 9,
): Promise<SystemPromptContext & WorkflowPromptProjection> => {
	const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
		validateAccess: () => true,
	}
	const runtime = new WorkflowRuntime({ cwd: "/test/project", workspacePathPolicy })
	const taskState = new TaskState()
	taskState.activeWorkflowName = "create-architecture"
	taskState.activeWorkflowSession = createCreateArchitectureWorkflowSession(activeStepNumber)
	taskState.apiRequestCount = 1
	const workflowProjection = await runtime.buildTurnProjection({ taskState })

	return {
		...baseContext,
		mcpHub: makeMcpHub([]),
		providerInfo: makeProviderInfo("gpt-5-codex", "openai"),
		enableNativeToolCalls: true,
		useMinimalGptPrompt: true,
		...workflowProjection,
	}
}

const CREATE_EPICS_OUTPUT_FILE = "/test/project/planning/Epics.md"
const CREATE_EPICS_ARCHITECTURE_DOCUMENT = "/test/project/planning/architecture.md"
const CREATE_EPICS_BRAINSTORMING_DOCUMENT = "/test/project/discovery/brainstorming.md"
const CREATE_EPICS_ADDITIONAL_CONTEXT_FILES = "/test/project/planning/domain-notes.md"

const createCreateEpicsWorkflowSession = (): ActiveWorkflowSession => ({
	activeStepNumber: 2,
	workflowValues: {
		output_file: CREATE_EPICS_OUTPUT_FILE,
		architecture_document: CREATE_EPICS_ARCHITECTURE_DOCUMENT,
		brainstorming_document: CREATE_EPICS_BRAINSTORMING_DOCUMENT,
		additional_context_files: CREATE_EPICS_ADDITIONAL_CONTEXT_FILES,
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
	ui: {
		suppressedWorkflowFormIds: [],
		suppressedWorkflowStepResolutionRoutes: [],
	},
	branchContext: {
		activeBranchId: createEpicsWorkflowDefinition.steps["step-2"].decisionTree.entryBranchId,
	},
})

const buildCreateEpicsPromptContext = async (): Promise<SystemPromptContext & WorkflowPromptProjection> => {
	const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
		validateAccess: () => true,
	}
	const runtime = new WorkflowRuntime({ cwd: "/test/project", workspacePathPolicy })
	const taskState = new TaskState()
	taskState.activeWorkflowName = "create-epics"
	taskState.activeWorkflowSession = createCreateEpicsWorkflowSession()
	taskState.apiRequestCount = 1
	const workflowProjection = await runtime.buildTurnProjection({ taskState })

	return {
		...baseContext,
		mcpHub: makeMcpHub([]),
		providerInfo: makeProviderInfo("gpt-5-codex", "openai"),
		enableNativeToolCalls: true,
		useMinimalGptPrompt: true,
		...workflowProjection,
	}
}

type CreateStoryPromptStepNumber = 2 | 3 | 4

const CREATE_STORY_ARCHITECTURE_DOCUMENT = "/test/project/planning/architecture.md"
const CREATE_STORY_EPICS_DOCUMENT = "/test/project/planning/Epics.md"
const CREATE_STORY_EPICS_INDEX = "/test/project/planning/Epics.index.json"
const CREATE_STORY_BRAINSTORMING_DOCUMENT = "/test/project/discovery/brainstorming.md"
const CREATE_STORY_TARGET_EPIC = "Epic 1: Runtime workflow module"
const CREATE_STORY_EPIC_IDENTITY = "1"
const CREATE_STORY_STORIES_INDEX = "/test/project/implementation/epic-1-stories.index.json"
const CREATE_STORY_SELECTED_STORY_IDENTITY = "1.1"
const CREATE_STORY_SELECTED_STORY_FILE_NAME = "Story-1-1.md"
const CREATE_STORY_TARGET_STORY = "/test/project/implementation/drafts/Story-1-1.md"
const CREATE_STORY_TARGET_STORY_FILENAME_FOR_MOVE = "Story-1-1.md"

const getCreateStoryEntryBranchId = (activeStepNumber: CreateStoryPromptStepNumber): string => {
	switch (activeStepNumber) {
		case 2:
			return createStoryWorkflowDefinition.steps["step-2"].decisionTree.entryBranchId
		case 3:
			return createStoryWorkflowDefinition.steps["step-3"].decisionTree.entryBranchId
		case 4:
			return createStoryWorkflowDefinition.steps["step-4"].decisionTree.entryBranchId
	}

	const unreachableActiveStepNumber: never = activeStepNumber
	return unreachableActiveStepNumber
}

const createCreateStoryWorkflowSession = (activeStepNumber: CreateStoryPromptStepNumber): ActiveWorkflowSession => ({
	activeStepNumber,
	workflowValues: {
		[CreateStoryWorkflowValueKey.ArchitectureDocument]: CREATE_STORY_ARCHITECTURE_DOCUMENT,
		[CreateStoryWorkflowValueKey.EpicsDocument]: CREATE_STORY_EPICS_DOCUMENT,
		[CreateStoryWorkflowValueKey.EpicsIndex]: CREATE_STORY_EPICS_INDEX,
		[CreateStoryWorkflowValueKey.BrainstormingDocument]: CREATE_STORY_BRAINSTORMING_DOCUMENT,
		[CreateStoryWorkflowValueKey.TargetEpic]: CREATE_STORY_TARGET_EPIC,
		[CreateStoryWorkflowValueKey.EpicIdentity]: CREATE_STORY_EPIC_IDENTITY,
		[CreateStoryWorkflowValueKey.StoriesIndex]: CREATE_STORY_STORIES_INDEX,
		[CreateStoryWorkflowValueKey.SelectedStoryIdentity]: CREATE_STORY_SELECTED_STORY_IDENTITY,
		[CreateStoryWorkflowValueKey.SelectedStoryFileName]: CREATE_STORY_SELECTED_STORY_FILE_NAME,
		[CreateStoryWorkflowValueKey.SelectedStoryType]: "primary",
		[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "draft",
		[CreateStoryWorkflowValueKey.SelectedStoryFileGenerated]: true,
		[CreateStoryWorkflowValueKey.TargetStory]: CREATE_STORY_TARGET_STORY,
		[CreateStoryWorkflowValueKey.TargetStoryFilenameForMove]: CREATE_STORY_TARGET_STORY_FILENAME_FOR_MOVE,
	},
	projectSelection: {
		projectMode: "new",
		projectTitle: "Create Story Session",
		projectFolderName: "create-story-session",
	},
	lifecycle: {
		projectSelectionCompleted: true,
	},
	entryArtifactResolution: undefined,
	ui: {
		suppressedWorkflowFormIds: [],
		suppressedWorkflowStepResolutionRoutes: [],
	},
	branchContext: {
		activeBranchId: getCreateStoryEntryBranchId(activeStepNumber),
	},
})

const buildCreateStoryPromptContext = async (
	activeStepNumber: CreateStoryPromptStepNumber,
): Promise<SystemPromptContext & WorkflowPromptProjection> => {
	const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
		validateAccess: () => true,
	}
	const runtime = new WorkflowRuntime({ cwd: "/test/project", workspacePathPolicy })
	const taskState = new TaskState()
	taskState.activeWorkflowName = "create-story"
	taskState.activeWorkflowSession = createCreateStoryWorkflowSession(activeStepNumber)
	taskState.apiRequestCount = 1
	const workflowProjection = await runtime.buildTurnProjection({ taskState })

	return {
		...baseContext,
		mcpHub: makeMcpHub([]),
		providerInfo: makeProviderInfo("gpt-5-codex", "openai"),
		enableNativeToolCalls: true,
		useMinimalGptPrompt: true,
		...workflowProjection,
	}
}

type DevStoryPromptStepNumber = 2 | 3 | 4

const DEV_STORY_TARGET_STORY = "/test/project/implementation/stories-backlog/Story-1-2.md"
const DEV_STORY_TARGET_STORY_FILENAME = "Story-1-2.md"
const DEV_STORY_STORIES_INDEX = "/test/project/implementation/epic-1-stories.index.json"
const DEV_STORY_SELECTED_STORY_IDENTITY = "1.2"

const getDevStoryEntryBranchId = (activeStepNumber: DevStoryPromptStepNumber): string => {
	switch (activeStepNumber) {
		case 2:
			return devStoryWorkflowDefinition.steps["step-2"].decisionTree.entryBranchId
		case 3:
			return devStoryWorkflowDefinition.steps["step-3"].decisionTree.entryBranchId
		case 4:
			return devStoryWorkflowDefinition.steps["step-4"].decisionTree.entryBranchId
	}

	const unreachableActiveStepNumber: never = activeStepNumber
	return unreachableActiveStepNumber
}

const createDevStoryWorkflowValues = (): WorkflowValues => ({
	[DevStoryWorkflowValueKey.TargetStory]: DEV_STORY_TARGET_STORY,
	[DevStoryWorkflowValueKey.TargetStoryFilename]: DEV_STORY_TARGET_STORY_FILENAME,
	[DevStoryWorkflowValueKey.SelectedStoryIdentity]: DEV_STORY_SELECTED_STORY_IDENTITY,
	[DevStoryWorkflowValueKey.EpicIdentity]: "1",
	[DevStoryWorkflowValueKey.StoriesIndex]: DEV_STORY_STORIES_INDEX,
	[DevStoryWorkflowValueKey.SelectedStoryType]: "primary",
	[DevStoryWorkflowValueKey.StoryGeneralInstructions]: "General guidance",
	[DevStoryWorkflowValueKey.StoryObjective]: "Objective detail",
	[DevStoryWorkflowValueKey.StoryScope]: "Scope detail",
	[DevStoryWorkflowValueKey.StoryScopeBoundary]: "Boundary detail",
	[DevStoryWorkflowValueKey.StoryRequirements]: "Requirement detail",
	[DevStoryWorkflowValueKey.StoryIssues]: "Issue detail",
	[DevStoryWorkflowValueKey.StoryTaskInventory]: {
		tasks: [
			{
				id: "1",
				lineIndex: 10,
				rawLine: "- [ ] Task 1: Implement the runtime change",
				completed: false,
				allowedFiles: [],
				subtasks: [
					{
						id: "1.1",
						lineIndex: 11,
						rawLine: "  - [ ] Subtask 1.1: Add the implementation",
						completed: false,
						allowedFiles: [],
					},
				],
			},
		],
	},
	[DevStoryWorkflowValueKey.CurrentStoryTaskId]: "1",
	[DevStoryWorkflowValueKey.UnpermittedFilePaths]: [],
	[DevStoryWorkflowValueKey.SelectedUnpermittedFilePaths]: [],
	[DevStoryWorkflowValueKey.CommitStagedFiles]: false,
})

const createDevStoryWorkflowSession = (activeStepNumber: DevStoryPromptStepNumber): ActiveWorkflowSession => ({
	activeStepNumber,
	workflowValues: createDevStoryWorkflowValues(),
	projectSelection: {
		projectMode: "new",
		projectTitle: "Dev Story Session",
		projectFolderName: "dev-story-session",
	},
	lifecycle: {
		projectSelectionCompleted: true,
	},
	entryArtifactResolution: undefined,
	ui: {
		suppressedWorkflowFormIds: [],
		suppressedWorkflowStepResolutionRoutes: [],
	},
	branchContext: {
		activeBranchId: getDevStoryEntryBranchId(activeStepNumber),
	},
})

const buildDevStoryPromptContext = async (
	activeStepNumber: DevStoryPromptStepNumber,
): Promise<SystemPromptContext & WorkflowPromptProjection> => {
	const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
		validateAccess: () => true,
	}
	const runtime = new WorkflowRuntime({ cwd: "/test/project", workspacePathPolicy })
	const taskState = new TaskState()
	taskState.activeWorkflowName = "dev-story"
	taskState.activeWorkflowSession = createDevStoryWorkflowSession(activeStepNumber)
	taskState.apiRequestCount = 1
	const workflowProjection = await runtime.buildTurnProjection({ taskState })

	return {
		...baseContext,
		mcpHub: makeMcpHub([]),
		providerInfo: makeProviderInfo("gpt-5-codex", "openai"),
		enableNativeToolCalls: true,
		useMinimalGptPrompt: true,
		...workflowProjection,
	}
}

const BLIND_REVIEW_TARGET_STORY = "/test/project/implementation/stories-review/Story-1-1.md"
const BLIND_REVIEW_SELECTED_STORY_IDENTITY = "1.1"
const BLIND_REVIEW_REVIEW_COMMIT_HASH = "abc1234"
const BLIND_REVIEW_REVIEW_COMMIT_PARENT = "def5678"
const BLIND_REVIEW_REVIEW_FOLDER = "/test/project/review"
const BLIND_REVIEW_OUTPUT = `${BLIND_REVIEW_REVIEW_FOLDER}/blind-review-1-1.md`
const BLIND_REVIEW_OUTPUT_ARTIFACT_FAMILY = "blind_review_output"
const BLIND_REVIEW_OUTPUT_ARTIFACT_IDENTITY = "1.1"
const BLIND_REVIEW_OUTPUT_ARTIFACT_FILENAME = "blind-review-1-1.md"
const BLIND_REVIEW_OUTPUT_ARTIFACT_RELATIVE_PATH = "review/blind-review-1-1.md"
const BLIND_REVIEW_FORBIDDEN_PROMPT_TOOL_NAMES: readonly string[] = [
	"web_search",
	"web_fetch",
	"browser_action",
	"ask_followup_question",
	"use_subagents",
	"use_skill",
	"set_workflow_values",
	"build_workflow_document",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
	"workflow_progress_request",
	"use_mcp_tool",
	"access_mcp_resource",
	"load_mcp_documentation",
	"build_review_input",
	"build_review_diff_output",
	"code_review_spec_update",
	"record_findings",
]

type BlindReviewPromptStepNumber = 2

function getBlindReviewEntryBranchId(activeStepNumber: BlindReviewPromptStepNumber): string {
	switch (activeStepNumber) {
		case 2:
			return blindReviewWorkflowDefinition.steps["step-2"].decisionTree.entryBranchId
	}

	const unreachableActiveStepNumber: never = activeStepNumber
	return unreachableActiveStepNumber
}

function createBlindReviewWorkflowValues(overrides: WorkflowValues = {}): WorkflowValues {
	return {
		[BlindReviewWorkflowValueKey.ProjectMode]: "existing",
		[BlindReviewWorkflowValueKey.ProjectTitle]: "Blind Review Session",
		[BlindReviewWorkflowValueKey.ProjectFolderName]: "test-project",
		[BlindReviewWorkflowValueKey.TargetStory]: BLIND_REVIEW_TARGET_STORY,
		[BlindReviewWorkflowValueKey.SelectedStoryIdentity]: BLIND_REVIEW_SELECTED_STORY_IDENTITY,
		[BlindReviewWorkflowValueKey.ReviewCommitHash]: BLIND_REVIEW_REVIEW_COMMIT_HASH,
		[BlindReviewWorkflowValueKey.ReviewCommitParent]: BLIND_REVIEW_REVIEW_COMMIT_PARENT,
		[BlindReviewWorkflowValueKey.BlindReviewOutput]: BLIND_REVIEW_OUTPUT,
		[BlindReviewWorkflowValueKey.BlindReviewOutputArtifactFamily]: BLIND_REVIEW_OUTPUT_ARTIFACT_FAMILY,
		[BlindReviewWorkflowValueKey.BlindReviewOutputArtifactIdentity]: BLIND_REVIEW_OUTPUT_ARTIFACT_IDENTITY,
		[BlindReviewWorkflowValueKey.BlindReviewOutputArtifactFilename]: BLIND_REVIEW_OUTPUT_ARTIFACT_FILENAME,
		[BlindReviewWorkflowValueKey.BlindReviewOutputArtifactRelativePath]: BLIND_REVIEW_OUTPUT_ARTIFACT_RELATIVE_PATH,
		...overrides,
	}
}

function createBlindReviewWorkflowSession(
	activeStepNumber: BlindReviewPromptStepNumber,
	workflowValues: WorkflowValues = createBlindReviewWorkflowValues(),
): ActiveWorkflowSession {
	return {
		activeStepNumber,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Blind Review Session",
			projectFolderName: "test-project",
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
			activeBranchId: getBlindReviewEntryBranchId(activeStepNumber),
		},
	}
}

async function buildBlindReviewPromptContext(
	activeStepNumber: BlindReviewPromptStepNumber = 2,
	workflowValues: WorkflowValues = createBlindReviewWorkflowValues(),
): Promise<SystemPromptContext & WorkflowPromptProjection> {
	const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
		validateAccess: () => true,
	}
	const runtime = new WorkflowRuntime({ cwd: "/test/project", workspacePathPolicy })
	const taskState = new TaskState()
	taskState.activeWorkflowName = "blind-review"
	taskState.activeWorkflowSession = createBlindReviewWorkflowSession(activeStepNumber, workflowValues)
	taskState.apiRequestCount = 1
	const workflowProjection = await runtime.buildTurnProjection({ taskState })

	return {
		...baseContext,
		mcpHub: makeMcpHub([]),
		providerInfo: makeProviderInfo("gpt-5-codex", "openai"),
		enableNativeToolCalls: true,
		useMinimalGptPrompt: true,
		...workflowProjection,
	}
}

type CodeReviewPromptStepNumber = 2 | 3 | 4

const CODE_REVIEW_TARGET_STORY = "/test/project/implementation/stories-review/Story-1-1.md"
const CODE_REVIEW_SELECTED_STORY_IDENTITY = "1.1"
const CODE_REVIEW_SELECTED_STORY_FILENAME = "Story-1-1.md"
const CODE_REVIEW_STORIES_INDEX = "/test/project/implementation/epic-1-stories.index.json"
const CODE_REVIEW_REVIEW_FOLDER = "/test/project/review"
const CODE_REVIEW_EPICS_DOCUMENT = "/test/project/planning/Epics.md"
const CODE_REVIEW_ARCHITECTURE_DOCUMENT = "/test/project/planning/architecture.md"
const CODE_REVIEW_CODE_REVIEW_OUTPUT = `${CODE_REVIEW_REVIEW_FOLDER}/code-review-1-1.md`
const CODE_REVIEW_REVIEW_SCOPE_MANIFEST = `${CODE_REVIEW_REVIEW_FOLDER}/review-scope-1-1.md`
const CODE_REVIEW_BLIND_REVIEW_OUTPUT = `${CODE_REVIEW_REVIEW_FOLDER}/blind-review-1-1.md`
const CODE_REVIEW_EDGE_CASE_REVIEW_OUTPUT = `${CODE_REVIEW_REVIEW_FOLDER}/edge-case-hunter-1-1.md`
const CODE_REVIEW_REVIEW_COMMIT_HASH = "abc1234"
const CODE_REVIEW_REVIEW_COMMIT_PARENT = "def5678"
const CODE_REVIEW_REMEDIATION_STORY = "/test/project/implementation/stories-draft/Remediation-story-1-1-1.md"

function getCodeReviewEntryBranchId(activeStepNumber: CodeReviewPromptStepNumber): string {
	switch (activeStepNumber) {
		case 2:
			return codeReviewWorkflowDefinition.steps["step-2"].decisionTree.entryBranchId
		case 3:
			return codeReviewWorkflowDefinition.steps["step-3"].decisionTree.entryBranchId
		case 4:
			return codeReviewWorkflowDefinition.steps["step-4"].decisionTree.entryBranchId
	}

	const unreachableActiveStepNumber: never = activeStepNumber
	return unreachableActiveStepNumber
}

function createCodeReviewWorkflowValues(overrides: WorkflowValues = {}): WorkflowValues {
	return {
		[CodeReviewWorkflowValueKey.ProjectMode]: "existing",
		[CodeReviewWorkflowValueKey.ProjectTitle]: "Code Review Session",
		[CodeReviewWorkflowValueKey.ProjectFolderName]: "test-project",
		[CodeReviewWorkflowValueKey.ReviewFolder]: CODE_REVIEW_REVIEW_FOLDER,
		[CodeReviewWorkflowValueKey.TargetStory]: CODE_REVIEW_TARGET_STORY,
		[CodeReviewWorkflowValueKey.SelectedStoryIdentity]: CODE_REVIEW_SELECTED_STORY_IDENTITY,
		[CodeReviewWorkflowValueKey.SelectedStoryFilename]: CODE_REVIEW_SELECTED_STORY_FILENAME,
		[CodeReviewWorkflowValueKey.EpicIdentity]: "1",
		[CodeReviewWorkflowValueKey.StoriesIndex]: CODE_REVIEW_STORIES_INDEX,
		[CodeReviewWorkflowValueKey.EpicsDocument]: CODE_REVIEW_EPICS_DOCUMENT,
		[CodeReviewWorkflowValueKey.ArchitectureDocument]: CODE_REVIEW_ARCHITECTURE_DOCUMENT,
		[CodeReviewWorkflowValueKey.CodeReviewOutput]: CODE_REVIEW_CODE_REVIEW_OUTPUT,
		[CodeReviewWorkflowValueKey.CodeReviewOutputArtifactFamily]: "code_review_output",
		[CodeReviewWorkflowValueKey.CodeReviewOutputArtifactIdentity]: "1-1",
		[CodeReviewWorkflowValueKey.CodeReviewOutputArtifactFilename]: "code-review-1-1.md",
		[CodeReviewWorkflowValueKey.CodeReviewOutputArtifactRelativePath]: "review/code-review-1-1.md",
		[CodeReviewWorkflowValueKey.ReviewScopeManifest]: CODE_REVIEW_REVIEW_SCOPE_MANIFEST,
		[CodeReviewWorkflowValueKey.ReviewScopeManifestArtifactFamily]: "review_scope_manifest",
		[CodeReviewWorkflowValueKey.ReviewScopeManifestArtifactIdentity]: "1-1",
		[CodeReviewWorkflowValueKey.ReviewScopeManifestArtifactFilename]: "review-scope-1-1.md",
		[CodeReviewWorkflowValueKey.ReviewScopeManifestArtifactRelativePath]: "review/review-scope-1-1.md",
		[CodeReviewWorkflowValueKey.BlindReviewOutput]: CODE_REVIEW_BLIND_REVIEW_OUTPUT,
		[CodeReviewWorkflowValueKey.EdgeCaseReviewOutput]: CODE_REVIEW_EDGE_CASE_REVIEW_OUTPUT,
		[CodeReviewWorkflowValueKey.MissingSubagentOutputFiles]: [],
		[CodeReviewWorkflowValueKey.ReviewCommitHash]: CODE_REVIEW_REVIEW_COMMIT_HASH,
		[CodeReviewWorkflowValueKey.ReviewCommitParent]: CODE_REVIEW_REVIEW_COMMIT_PARENT,
		[CodeReviewWorkflowValueKey.RemediationStory]: CODE_REVIEW_REMEDIATION_STORY,
		[CodeReviewWorkflowValueKey.RemediationStoryArtifactFamily]: "remediation_story",
		[CodeReviewWorkflowValueKey.RemediationStoryArtifactIdentity]: "1-1-1",
		[CodeReviewWorkflowValueKey.RemediationStoryArtifactFilename]: "Remediation-story-1-1-1.md",
		[CodeReviewWorkflowValueKey.RemediationStoryArtifactRelativePath]:
			"implementation/stories-draft/Remediation-story-1-1-1.md",
		[CodeReviewWorkflowValueKey.RemediationStoryParentIdentity]: CODE_REVIEW_SELECTED_STORY_IDENTITY,
		[CodeReviewWorkflowValueKey.ReviewFindingsPresent]: true,
		[CodeReviewWorkflowValueKey.UpstreamFindingsPresent]: true,
		...overrides,
	}
}

function createCodeReviewWorkflowSession(
	activeStepNumber: CodeReviewPromptStepNumber,
	workflowValues: WorkflowValues = createCodeReviewWorkflowValues(),
): ActiveWorkflowSession {
	return {
		activeStepNumber,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Code Review Session",
			projectFolderName: "test-project",
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
			activeBranchId: getCodeReviewEntryBranchId(activeStepNumber),
		},
	}
}

async function buildCodeReviewPromptContext(
	activeStepNumber: CodeReviewPromptStepNumber,
	workflowValues: WorkflowValues = createCodeReviewWorkflowValues(),
): Promise<SystemPromptContext & WorkflowPromptProjection> {
	const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
		validateAccess: () => true,
	}
	const runtime = new WorkflowRuntime({ cwd: "/test/project", workspacePathPolicy })
	const taskState = new TaskState()
	taskState.activeWorkflowName = "code-review"
	taskState.activeWorkflowSession = createCodeReviewWorkflowSession(activeStepNumber, workflowValues)
	taskState.apiRequestCount = 1
	const workflowProjection = await runtime.buildTurnProjection({ taskState })

	return {
		...baseContext,
		mcpHub: makeMcpHub([]),
		providerInfo: makeProviderInfo("gpt-5-codex", "openai"),
		enableNativeToolCalls: true,
		useMinimalGptPrompt: true,
		...workflowProjection,
	}
}

type PiPlanningPromptStepNumber = 2 | 3 | 4 | 5 | 6

const PI_PLANNING_ARCHITECTURE_DOCUMENT = "/test/project/planning/architecture.md"
const PI_PLANNING_EPICS_DOCUMENT = "/test/project/planning/Epics.md"
const PI_PLANNING_EPICS_INDEX = "/test/project/planning/Epics.index.json"
const PI_PLANNING_BRAINSTORMING_DOCUMENT = "/test/project/discovery/brainstorming.md"
const PI_PLANNING_ADDITIONAL_CONTEXT = "/test/project/discovery/research-notes.md"
const PI_PLANNING_TARGET_EPIC = "Epic 7: Workflow runtime PI planning"
const PI_PLANNING_EPIC_IDENTITY = "7"
const PI_PLANNING_IMPLEMENTATION_FOLDER = "/test/project/implementation"
const PI_PLANNING_DRAFTS_FOLDER = "/test/project/implementation/drafts"
const PI_PLANNING_STORIES_INDEX = "/test/project/implementation/epic-7-stories.index.json"

const getPiPlanningEntryBranchId = (activeStepNumber: PiPlanningPromptStepNumber): string => {
	switch (activeStepNumber) {
		case 2:
			return piPlanningWorkflowDefinition.steps["step-2"].decisionTree.entryBranchId
		case 3:
			return piPlanningWorkflowDefinition.steps["step-3"].decisionTree.entryBranchId
		case 4:
			return piPlanningWorkflowDefinition.steps["step-4"].decisionTree.entryBranchId
		case 5:
			return piPlanningWorkflowDefinition.steps["step-5"].decisionTree.entryBranchId
		case 6:
			return piPlanningWorkflowDefinition.steps["step-6"].decisionTree.entryBranchId
	}

	const unreachableActiveStepNumber: never = activeStepNumber
	return unreachableActiveStepNumber
}

const createPiPlanningWorkflowSession = (activeStepNumber: PiPlanningPromptStepNumber): ActiveWorkflowSession => ({
	activeStepNumber,
	workflowValues: {
		architecture_document: PI_PLANNING_ARCHITECTURE_DOCUMENT,
		epics_document: PI_PLANNING_EPICS_DOCUMENT,
		epics_index: PI_PLANNING_EPICS_INDEX,
		brainstorming_document: PI_PLANNING_BRAINSTORMING_DOCUMENT,
		additional_context: PI_PLANNING_ADDITIONAL_CONTEXT,
		target_epic: PI_PLANNING_TARGET_EPIC,
		epic_identity: PI_PLANNING_EPIC_IDENTITY,
		implementation_folder: PI_PLANNING_IMPLEMENTATION_FOLDER,
		drafts_folder: PI_PLANNING_DRAFTS_FOLDER,
		stories_index: PI_PLANNING_STORIES_INDEX,
		stories_index_existed_at_workflow_start: true,
	},
	projectSelection: {
		projectMode: "new",
		projectTitle: "PI Planning Session",
		projectFolderName: "pi-planning-session",
	},
	lifecycle: {
		projectSelectionCompleted: true,
	},
	entryArtifactResolution: undefined,
	ui: {
		suppressedWorkflowFormIds: [],
		suppressedWorkflowStepResolutionRoutes: [],
	},
	branchContext: {
		activeBranchId: getPiPlanningEntryBranchId(activeStepNumber),
	},
})

const buildPiPlanningPromptContext = async (
	activeStepNumber: PiPlanningPromptStepNumber,
): Promise<SystemPromptContext & WorkflowPromptProjection> => {
	const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
		validateAccess: () => true,
	}
	const runtime = new WorkflowRuntime({ cwd: "/test/project", workspacePathPolicy })
	const taskState = new TaskState()
	taskState.activeWorkflowName = "pi-planning"
	taskState.activeWorkflowSession = createPiPlanningWorkflowSession(activeStepNumber)
	taskState.apiRequestCount = 1
	const workflowProjection = await runtime.buildTurnProjection({ taskState })

	return {
		...baseContext,
		mcpHub: makeMcpHub([]),
		providerInfo: makeProviderInfo("gpt-5-codex", "openai"),
		enableNativeToolCalls: true,
		useMinimalGptPrompt: true,
		...workflowProjection,
	}
}

const isNativeToolsFamily = (family: ModelFamily) =>
	[ModelFamily.NATIVE_NEXT_GEN, ModelFamily.NATIVE_GPT_5, ModelFamily.NATIVE_GPT_5_1, ModelFamily.GEMINI_3].includes(family)

type TestRunner = Mocha.Context & { skip(): void; timeout(ms: number): void }

async function runPromptTest(
	testCtx: TestRunner,
	context: SystemPromptContext,
	modelId: string,
	handler: (result: Awaited<ReturnType<typeof getSystemPrompt>>) => Promise<void>,
): Promise<void> {
	testCtx.timeout(TEST_TIMEOUT)
	try {
		const result = await getSystemPrompt(context)
		await handler(result)
	} catch (error) {
		if (error instanceof Error && error.message.includes("No prompt variant found")) {
			console.log(`Skipping ${modelId} - no variant available (expected)`)
			testCtx.skip()
		} else {
			throw error
		}
	}
}

async function expectPiPlanningProjectedToolNames(
	testCtx: TestRunner,
	activeStepNumber: PiPlanningPromptStepNumber,
	expectedToolNames: readonly string[],
): Promise<void> {
	const context = await buildPiPlanningPromptContext(activeStepNumber)
	const projectedToolNames = (context.workflowToolSchemaOverride ?? []).map((tool) => tool.name)
	expect(projectedToolNames).to.deep.equal(expectedToolNames)

	await runPromptTest(testCtx, context, "gpt-5-codex", async ({ tools }) => {
		expect(getNativeToolNames(tools)).to.deep.equal(expectedToolNames)
	})
}

async function expectCreateStoryProjectedToolSurface(
	testCtx: TestRunner,
	activeStepNumber: CreateStoryPromptStepNumber,
	expectedToolSpecs: readonly ClineToolSpec[],
): Promise<void> {
	const expectedToolNames = expectedToolSpecs.map((tool) => tool.name)
	const context = await buildCreateStoryPromptContext(activeStepNumber)
	expect(context.workflowToolSchemaOverride).to.deep.equal(expectedToolSpecs)

	await runPromptTest(testCtx, context, "gpt-5-codex", async ({ tools }) => {
		expect(getNativeToolNames(tools)).to.deep.equal(expectedToolNames)
	})
}

async function expectDevStoryProjectedToolSurface(
	testCtx: TestRunner,
	activeStepNumber: DevStoryPromptStepNumber,
	expectedToolSpecs: readonly ClineToolSpec[],
): Promise<void> {
	const expectedToolNames = expectedToolSpecs.map((tool) => tool.name)
	const context = await buildDevStoryPromptContext(activeStepNumber)
	expect(context.workflowToolSchemaOverride).to.deep.equal(expectedToolSpecs)

	await runPromptTest(testCtx, context, "gpt-5-codex", async ({ tools }) => {
		expect(getNativeToolNames(tools)).to.deep.equal(expectedToolNames)
	})
}

async function expectBlindReviewProjectedToolSurface(
	testCtx: TestRunner,
	expectedToolSpecs: readonly ClineToolSpec[],
): Promise<void> {
	const expectedToolNames = expectedToolSpecs.map((tool) => tool.name)
	const context = await buildBlindReviewPromptContext(2)
	expect(context.workflowToolSchemaOverride).to.deep.equal(expectedToolSpecs)

	await runPromptTest(testCtx, context, "gpt-5-codex", async ({ tools }) => {
		expect(getNativeToolNames(tools)).to.deep.equal(expectedToolNames)
	})
}

async function expectCodeReviewProjectedToolSurface(
	testCtx: TestRunner,
	activeStepNumber: CodeReviewPromptStepNumber,
	expectedToolSpecs: readonly ClineToolSpec[],
): Promise<void> {
	const expectedToolNames = expectedToolSpecs.map((tool) => tool.name)
	const context = await buildCodeReviewPromptContext(activeStepNumber)
	expect(context.workflowToolSchemaOverride).to.deep.equal(expectedToolSpecs)

	await runPromptTest(testCtx, context, "gpt-5-codex", async ({ tools }) => {
		expect(getNativeToolNames(tools)).to.deep.equal(expectedToolNames)
	})
}

interface CodeReviewStep4PayloadBlocks {
	workflowInputPayloadBlock: string
	continuationWorkflowInputPayloadBlock: string
}

async function expectCodeReviewStep4PromptProjection(
	testCtx: TestRunner,
	context: SystemPromptContext & WorkflowPromptProjection,
): Promise<CodeReviewStep4PayloadBlocks> {
	const projectedToolNames = (context.workflowToolSchemaOverride ?? []).map((tool) => tool.name)
	expect(projectedToolNames).to.deep.equal([
		"read_file",
		"read_file_range",
		"apply_patch",
		"ask_followup_question",
		"send_user_message",
		"attempt_completion",
	])

	const forbiddenToolNames: readonly string[] = [
		"record_findings",
		"workflow_progress_request",
		"create_workflow_artifact",
		"build_workflow_document",
		"plan_remediation_story_artifact",
		"update_story_index_status",
		"move_workflow_project_file",
	]
	for (const forbiddenToolName of forbiddenToolNames) {
		expect(projectedToolNames).to.not.include(forbiddenToolName)
	}

	const workflowInputPayloadBlock = context.workflowInputPayloadBlock
	const continuationWorkflowInputPayloadBlock = context.continuationWorkflowInputPayloadBlock
	if (workflowInputPayloadBlock === undefined || workflowInputPayloadBlock === "") {
		throw new Error("Expected code-review Step 4 workflow input payload.")
	}
	if (continuationWorkflowInputPayloadBlock === undefined || continuationWorkflowInputPayloadBlock === "") {
		throw new Error("Expected code-review Step 4 continuation workflow input payload.")
	}

	const payloadBlocks: readonly string[] = [workflowInputPayloadBlock, continuationWorkflowInputPayloadBlock]
	for (const payloadBlock of payloadBlocks) {
		expect(payloadBlock.trim()).to.not.equal("")
	}

	await runPromptTest(testCtx, context, "gpt-5-codex", async ({ tools }) => {
		const nativeToolNames = getNativeToolNames(tools)
		for (const forbiddenToolName of forbiddenToolNames) {
			expect(nativeToolNames).to.not.include(forbiddenToolName)
		}
	})

	return {
		workflowInputPayloadBlock,
		continuationWorkflowInputPayloadBlock,
	}
}

// ============================================================================
// Test Data
// ============================================================================

const contextVariations: Array<{ name: string; override: Partial<SystemPromptContext> }> = [
	{ name: "basic", override: {} },
	{ name: "no-browser", override: { supportsBrowserUse: false } },
	{ name: "no-mcp", override: { mcpHub: { getServers: () => [] } as unknown as McpHub } },
	{ name: "no-focus-chain", override: { focusChainSettings: { enabled: false, remindClineInterval: 0 } } },
]

const modelTestCases = [
	{ family: ModelFamily.GENERIC, modelId: "gpt-3", providerId: "openai" },
	{ family: ModelFamily.GLM, modelId: "glm-4.6", providerId: "zai" },
	{ family: ModelFamily.HERMES, modelId: "hermes-4", providerId: "test" },
	{ family: ModelFamily.DEVSTRAL, modelId: "devstral", providerId: "cline" },
	{ family: ModelFamily.NEXT_GEN, modelId: "claude-sonnet-4", providerId: "anthropic" },
	{ family: ModelFamily.XS, modelId: "qwen3_coder", providerId: "lmstudio" },
	{ family: ModelFamily.NATIVE_NEXT_GEN, modelId: "claude-4-5-sonnet", providerId: "cline" },
	{ family: ModelFamily.GPT_5, modelId: "gpt-5", providerId: "openai" },
	{ family: ModelFamily.NATIVE_GPT_5, modelId: "gpt-5-codex", providerId: "openai" },
	{ family: ModelFamily.NATIVE_GPT_5_1, modelId: "gpt-5-1", providerId: "openai" },
	{ family: ModelFamily.GEMINI_3, modelId: "gemini-3", providerId: "vertex" },
	{ family: ModelFamily.TRINITY, modelId: "arcee-ai/trinity-large-preview", providerId: "openrouter" },
]
const gemini3ModelTestCases = modelTestCases.filter(({ family }) => family === ModelFamily.GEMINI_3)

// ============================================================================
// Tests
// ============================================================================

describe("Prompt System Integration Tests", () => {
	before(async () => {
		console.log(UPDATE_SNAPSHOTS ? "🔄 SNAPSHOT UPDATE MODE" : "✅ SNAPSHOT TEST MODE")
		await fs.mkdir(SNAPSHOTS_DIR, { recursive: true }).catch(() => {})
	})

	describe("Snapshot Testing", () => {
		for (const { family, modelId, providerId } of modelTestCases) {
			describe(`${family} Model Group`, () => {
				const enableNativeToolCalls = isNativeToolsFamily(family)

				it(`should generate consistent native tools object when enabled`, async function () {
					const context: SystemPromptContext = {
						...baseContext,
						providerInfo: makeProviderInfo(modelId, providerId),
						enableNativeToolCalls,
						useMinimalGptPrompt: isGPT5ModelFamily(modelId),
					}

					await runPromptTest(this, context, modelId, async ({ tools }) => {
						if (!enableNativeToolCalls) {
							expect(tools).to.be.undefined
							return
						}

						expect(tools).to.be.an("array").that.is.not.empty
						const toolNames = getNativeToolNames(tools)
						expect(toolNames).to.not.include("focus_chain")
						expect(JSON.stringify(tools)).to.not.include('"focus_chain"')
						expect(toolNames).to.not.include("build_workflow_document")
						expect(toolNames).to.not.include("create_workflow_artifact")
						const snapshotName = `${providerId}_${family.replace(/[^a-zA-Z0-9]/g, "_")}.tools.snap`
						await assertSnapshot(snapshotName, JSON.stringify(tools, null, 2))
					})
				})

				for (const { name: contextName, override } of contextVariations) {
					it(`should generate consistent prompt for ${providerId}/${modelId} with ${contextName} context`, async function () {
						const context: SystemPromptContext = {
							...baseContext,
							...override,
							providerInfo: makeProviderInfo(modelId, providerId),
							enableNativeToolCalls,
							useMinimalGptPrompt: isGPT5ModelFamily(modelId),
						}

						await runPromptTest(this, context, modelId, async ({ systemPrompt, tools }) => {
							if (enableNativeToolCalls) {
								expect(tools).to.be.an("array").that.is.not.empty
								const toolNames = getNativeToolNames(tools)
								expect(toolNames).to.not.include("focus_chain")
								expect(toolNames).to.not.include("build_workflow_document")
								expect(toolNames).to.not.include("create_workflow_artifact")
							} else {
								expect(tools).to.be.undefined
							}

							expect(systemPrompt).to.be.a("string").with.length.greaterThan(100)
							expect(systemPrompt).to.not.include("{{TOOL_USE_SECTION}}")
							expect(systemPrompt).to.not.include("create_workflow_artifact")

							const snapshotName = `${providerId}_${modelId.replace(/[^a-zA-Z0-9]/g, "_")}-${contextName}.snap`
							await assertNormalizedSnapshot(snapshotName, systemPrompt, normalizePromptSnapshotSurface)
						})
					})
				}
			})
		}

		describe("Gemini 3 Specific", () => {
			for (const { family, modelId, providerId } of gemini3ModelTestCases) {
				const enableNativeToolCalls = isNativeToolsFamily(family)
				it(`should include parallel tool-calling guidance for ${providerId}/${modelId} when enabled`, async function () {
					const context: SystemPromptContext = {
						...baseContext,
						providerInfo: makeProviderInfo(modelId, providerId),
						enableNativeToolCalls,
						enableParallelToolCalling: true,
					}

					await runPromptTest(this, context, modelId, async ({ systemPrompt }) => {
						expect(systemPrompt).to.include(
							"- When multiple operations are independent (for example reading several files or searching in multiple directories), call multiple tools in a single response rather than one at a time.",
						)
						const snapshotName = `${providerId}_${modelId.replace(/[^a-zA-Z0-9]/g, "_")}-parallel-tools.snap`
						await assertNormalizedSnapshot(snapshotName, systemPrompt, normalizePromptSnapshotSurface)
					})
				})
			}
		})
	})

	describe("Continuation Turn Prompt", () => {
		it("generates a basic ACT-mode continuation prompt", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...mockProviderInfo, mode: "act" },
					isContinuationTurn: true,
				},
				"fast",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("CONTINUATION TURN")
					expect(systemPrompt).to.not.include("TOOL USE")
					expect(systemPrompt).to.not.include("RULES")
					expect(systemPrompt).to.not.include("CAPABILITIES")
					expectResponseToolNames(systemPrompt, [
						"`attempt_completion`",
						"`ask_followup_question`",
						"`send_user_message`",
					])
					expect(systemPrompt).to.not.include("CURRENT TASK LIST")
				},
			)
		})

		it("omits stale agent_feedback guidance in continuation-turn prompts", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...mockProviderInfo, mode: "act" },
					isContinuationTurn: true,
				},
				"fast",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.not.include(STALE_AGENT_FEEDBACK_PROMPT_TEXT)
				},
			)
		})

		it("generates an ACT-mode continuation prompt with Indxr and checklist", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...mockProviderInfo, mode: "act" },
					mcpHub: makeMcpHub([makeIndxrServer()]),
					isContinuationTurn: true,
					currentFocusChainChecklist: "- Review diff\n- Update tests",
				},
				"fast",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("CONTINUATION TURN")
					expect(systemPrompt).to.not.include("TOOL USE")
					expect(systemPrompt).to.not.include("RULES")
					expect(systemPrompt).to.not.include("CAPABILITIES")
					expect(systemPrompt).to.not.include("CURRENT TASK LIST")
					expect(systemPrompt).to.include("`search_relevant`")
					expectResponseToolNames(systemPrompt, [
						"`attempt_completion`",
						"`ask_followup_question`",
						"`send_user_message`",
					])
				},
			)
		})

		it("renders workflow_progress_request in generic native GPT-5.1 continuation response guidance when visible", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					isContinuationTurn: true,
					enableNativeToolCalls: true,
					visibleNativeToolNames: [
						"attempt_completion",
						"ask_followup_question",
						"workflow_progress_request",
						"send_user_message",
					],
				},
				"gpt-5-1",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("CONTINUATION TURN")
					expect(systemPrompt).to.include("workflow_progress_request")
					expect(systemPrompt).to.include("attempt_completion")
					expect(systemPrompt).to.include("ask_followup_question")
					expect(systemPrompt).to.include("send_user_message")
				},
			)
		})

		it("omits workflow_progress_request in generic native GPT-5.1 continuation prompts when it is not visible", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					isContinuationTurn: true,
					enableNativeToolCalls: true,
					visibleNativeToolNames: ["attempt_completion", "ask_followup_question", "send_user_message"],
				},
				"gpt-5-1",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("CONTINUATION TURN")
					expect(systemPrompt).to.not.include("workflow_progress_request")
					expect(systemPrompt).to.include("attempt_completion")
					expect(systemPrompt).to.include("ask_followup_question")
					expect(systemPrompt).to.include("send_user_message")
				},
			)
		})
	})

	describe("Context-Specific Features", () => {
		const featureTests = [
			{ name: "browser-specific content when browser is enabled", context: { supportsBrowserUse: true }, check: "browser" },
			{ name: "MCP content when MCP servers are present", context: {}, check: "MCP" },
			{ name: "user instructions when provided", context: {}, check: "USER'S CUSTOM INSTRUCTIONS" },
		]

		for (const { name, context, check } of featureTests) {
			it(`should include ${name}`, async function () {
				await runPromptTest(this, { ...baseContext, ...context }, "default", async ({ systemPrompt }) => {
					expect(systemPrompt.toLowerCase()).to.include(check.toLowerCase())
				})
			})
		}

		it("keeps native GPT-5 minimal prompts on the concise variant-specific tool section", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-codex", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
				},
				"gpt-5-codex",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("TOOL USE")
					expect(systemPrompt).to.not.include("task_progress")
					expect(systemPrompt).to.include("RESPONSE TOOLS")
					expectResponseToolNames(
						systemPrompt,
						["`attempt_completion`", "`ask_followup_question`", "`send_user_message`"],
						["`generate_plan_output`"],
					)
					expect(systemPrompt).to.not.include("In ACT MODE, respond using these:")
					expect(systemPrompt).to.not.include("# Tools")
					expect(systemPrompt).to.not.include("## execute_command")
				},
			)
		})

		it("omits backend-only workflow file-operation tools from default prompt tool surfaces", async function () {
			const backendOnlyWorkflowToolNames = [
				"archive_workflow_artifact",
				"delete_workflow_artifact",
				"move_workflow_project_file",
			]

			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
				},
				"gpt-5-1",
				async ({ systemPrompt, tools }) => {
					const nativeToolNames = getNativeToolNames(tools)
					for (const toolName of backendOnlyWorkflowToolNames) {
						expect(nativeToolNames).to.not.include(toolName)
						expect(systemPrompt).to.not.include(toolName)
					}
				},
			)

			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-3", "openai"),
					enableNativeToolCalls: false,
				},
				"gpt-3",
				async ({ systemPrompt, tools }) => {
					expect(tools).to.be.undefined
					for (const toolName of backendOnlyWorkflowToolNames) {
						expect(systemPrompt).to.not.include(toolName)
					}
				},
			)
		})

		it("omits the textual MCP section for native GPT-5 OpenAI prompts when only generic MCP servers are connected", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.not.include("MCP SERVERS")
					expect(systemPrompt).to.not.include("## test-server (`test`)")
					expect(systemPrompt).to.not.include("Indxr-Aware Exploration")
				},
			)
		})

		it("omits Indxr guidance in native GPT-5.1 prompts when no visible Indxr tools survive filtering", async function () {
			this.timeout(TEST_TIMEOUT)

			const systemPrompt = await PromptRegistry.getInstance().get({
				...baseContext,
				mcpHub: makeMcpHub([makeIndxrServer()]),
				providerInfo: makeProviderInfo("gpt-5-1", "openai"),
				enableNativeToolCalls: true,
				visibleNativeToolNames: [],
			})

			expect(systemPrompt).to.not.include("Indxr-Aware Exploration")
			expect(systemPrompt).to.not.include("`search_relevant`")
		})

		it("names only the caller-supplied visible Indxr subset in native GPT-5.1 prompts", async function () {
			this.timeout(TEST_TIMEOUT)

			const systemPrompt = await PromptRegistry.getInstance().get({
				...baseContext,
				mcpHub: makeMcpHub([makeIndxrServer()]),
				providerInfo: makeProviderInfo("gpt-5-1", "openai"),
				enableNativeToolCalls: true,
				visibleNativeToolNames: ["indxr-10mcp0search_relevant"],
			})

			expect(systemPrompt).to.include("`search_relevant`")
			expect(systemPrompt).to.not.include("`get_file_summary`")
		})

		it("filters native tools through a generic workflow override schema in native GPT-5.1 prompts", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					mcpHub: makeMcpHub([
						makeIndxrServer({
							tools: [
								{
									name: "search_relevant",
									description: "Search relevant code",
									inputSchema: { type: "object", properties: {} },
								},
								{
									name: "get_file_summary",
									description: "Summarize file",
									inputSchema: { type: "object", properties: {} },
								},
								{
									name: "lookup_symbol",
									description: "Lookup symbol",
									inputSchema: { type: "object", properties: {} },
								},
							],
						}),
					]),
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					workflowToolSchemaOverride: genericWorkflowOverrideToolSpecs,
				},
				"gpt-5-1",
				async ({ tools }) => {
					const nativeToolNames = getNativeToolNames(tools)

					expect(nativeToolNames).to.deep.equal([
						"attempt_completion",
						"ask_followup_question",
						"send_user_message",
						"apply_patch",
						"read_file",
						"indxr-10mcp0search_relevant",
						"indxr-10mcp0get_file_summary",
					])
					expect(nativeToolNames).to.not.include("access_mcp_resource")
					expect(nativeToolNames).to.not.include("indxr-10mcp0lookup_symbol")
					expect(nativeToolNames).to.not.include("workflow_progress_request")
					expect(nativeToolNames).to.not.include("search_files")
					expect(nativeToolNames).to.not.include("build_review_input")
					expect(nativeToolNames).to.not.include("generate_plan_output")
				},
			)
		})

		it("renders response tools from workflow-projected native tool schema overrides", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					workflowToolSchemaOverride: genericWorkflowOverrideToolSpecs,
				},
				"gpt-5-1",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("RESPONSE TOOLS")
					expectResponseToolNames(
						systemPrompt,
						["`attempt_completion`", "`ask_followup_question`", "`send_user_message`"],
						["`generate_plan_output`", "`workflow_progress_request`"],
					)
				},
			)
		})

		it("uses the workflow-projected schema as the exact native tool surface", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					workflowToolSchemaOverride: workflowProgressOnlyToolSpecs,
				},
				"gpt-5-1",
				async ({ tools }) => {
					expect(getNativeToolNames(tools)).to.deep.equal(["workflow_progress_request"])
				},
			)
		})

		it("renders native workflow-projected workflow progress request guidance without default response tools", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					workflowToolSchemaOverride: workflowProgressOnlyToolSpecs,
				},
				"gpt-5-1",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("RESPONSE TOOLS")
					expectResponseToolNames(
						systemPrompt,
						["`workflow_progress_request`"],
						["`attempt_completion`", "`ask_followup_question`", "`send_user_message`", "`generate_plan_output`"],
					)
				},
			)
		})

		it("omits default ACT response guidance from non-native workflow overrides without response tools", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-3", "openai"),
					enableNativeToolCalls: false,
					workflowToolSchemaOverride: workflowBuildDocumentOnlyToolSpecs,
				},
				"gpt-3",
				async ({ systemPrompt, tools }) => {
					expect(tools).to.be.undefined
					expect(systemPrompt).to.include("build_workflow_document")
					expect(systemPrompt).to.not.include("RESPONSE TOOLS")
					expectResponseToolNames(
						systemPrompt,
						[],
						[
							"`attempt_completion`",
							"`ask_followup_question`",
							"`send_user_message`",
							"`act_mode_respond`",
							"`generate_plan_output`",
						],
					)
				},
			)
		})

		it("omits invalid continuation response guidance for workflow overrides without response tools", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					isContinuationTurn: true,
					workflowToolSchemaOverride: workflowBuildDocumentOnlyToolSpecs,
				},
				"gpt-5-1",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("CONTINUATION TURN")
					expect(systemPrompt).to.not.include("RESPONSE TOOLS")
					expect(systemPrompt).to.not.include("undefined")
					expect(systemPrompt).to.not.include("and undefined")
				},
			)
		})

		it("projects active brainstorming Step 3 suggest tools into native GPT-5 prompts", async function () {
			const context = await buildBrainstormingPromptContext({
				activeStepNumber: 3,
				workflowValues: {
					selected_approach: "I want you to suggest a technique",
					output_file: "/test/project/discovery/brainstorming.md",
				},
			})

			await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt, tools }) => {
				const nativeToolNames = getNativeToolNames(tools)
				const approvedStep3ToolNames = [
					"get_brainstorming_methods",
					"append_brainstorming_selected_technique",
					"read_file",
					"apply_patch",
					"send_user_message",
					"ask_followup_question",
					"workflow_progress_request",
				]

				expect(nativeToolNames).to.deep.equal(approvedStep3ToolNames)
				expect(nativeToolNames).to.not.include("build_workflow_document")
				expect(nativeToolNames).to.not.include("set_workflow_values")
				expect(systemPrompt).to.not.include("Workflow: brainstorming")
				expect(systemPrompt).to.not.include("Call `get_brainstorming_methods`")
				expect(systemPrompt).to.not.include("call `append_brainstorming_selected_technique`")
			})
		})

		it("projects active create-architecture Step 3 tools into native GPT-5 prompts", async function () {
			const context = await buildCreateArchitecturePromptContext(3)

			await runPromptTest(this, context, "gpt-5-codex", async ({ tools }) => {
				const nativeToolNames = getNativeToolNames(tools)

				expect(nativeToolNames).to.deep.equal([
					"read_file",
					"apply_patch",
					"send_user_message",
					"ask_followup_question",
					"workflow_progress_request",
				])
				expect(nativeToolNames).to.not.include("create_workflow_artifact")
				expect(nativeToolNames).to.not.include("build_workflow_document")
				expect(nativeToolNames).to.not.include("set_workflow_values")
				expect(nativeToolNames).to.not.include("execute_command")
			})
		})

		it("projects active create-architecture Step 4 tools into native GPT-5 prompts", async function () {
			const context = await buildCreateArchitecturePromptContext(4)

			await runPromptTest(this, context, "gpt-5-codex", async ({ tools }) => {
				const nativeToolNames = getNativeToolNames(tools)

				expect(nativeToolNames).to.deep.equal([
					"list_files",
					"search_files",
					"list_code_definition_names",
					"read_file",
					"read_file_range",
					"apply_patch",
					"send_user_message",
					"ask_followup_question",
					"workflow_progress_request",
				])
				expect(nativeToolNames).to.not.include("create_workflow_artifact")
				expect(nativeToolNames).to.not.include("build_workflow_document")
				expect(nativeToolNames).to.not.include("set_workflow_values")
				expect(nativeToolNames).to.not.include("execute_command")
			})
		})

		it("projects active create-architecture Step 9 tools into native GPT-5 prompts", async function () {
			const context = await buildCreateArchitecturePromptContext(9)

			await runPromptTest(this, context, "gpt-5-codex", async ({ tools }) => {
				const nativeToolNames = getNativeToolNames(tools)

				expect(nativeToolNames).to.deep.equal([
					"read_file",
					"apply_patch",
					"send_user_message",
					"ask_followup_question",
					"attempt_completion",
				])
				expect(nativeToolNames).to.not.include("workflow_progress_request")
				expect(nativeToolNames).to.not.include("create_workflow_artifact")
				expect(nativeToolNames).to.not.include("build_workflow_document")
				expect(nativeToolNames).to.not.include("set_workflow_values")
				expect(nativeToolNames).to.not.include("execute_command")
			})
		})

		it("projects active create-epics Step 2 tools into native GPT-5 prompts", async function () {
			const context = await buildCreateEpicsPromptContext()

			await runPromptTest(this, context, "gpt-5-codex", async ({ tools }) => {
				const nativeToolNames = getNativeToolNames(tools)

				expect(nativeToolNames).to.deep.equal([
					"read_file",
					"upsert_epic",
					"send_user_message",
					"ask_followup_question",
					"attempt_completion",
				])
				expect(nativeToolNames).to.not.include("workflow_progress_request")
				expect(nativeToolNames).to.not.include("build_workflow_document")
				expect(nativeToolNames).to.not.include("apply_patch")
				expect(nativeToolNames).to.not.include("set_workflow_values")
				expect(nativeToolNames).to.not.include("create_workflow_artifact")
				expect(nativeToolNames).to.not.include("archive_workflow_artifact")
				expect(nativeToolNames).to.not.include("delete_workflow_artifact")
				expect(nativeToolNames).to.not.include("move_workflow_project_file")
			})
		})

		it("projects active pi-planning Step 2 tools into native GPT-5 prompts", async function () {
			await expectPiPlanningProjectedToolNames(this, 2, [
				"read_file",
				"send_user_message",
				"ask_followup_question",
				"workflow_progress_request",
			])
		})

		it("projects active pi-planning Step 3 tools into native GPT-5 prompts", async function () {
			await expectPiPlanningProjectedToolNames(this, 3, [
				"list_files",
				"search_files",
				"list_code_definition_names",
				"read_file",
				"read_file_range",
				"send_user_message",
				"ask_followup_question",
				"workflow_progress_request",
			])
		})

		it("projects active pi-planning Step 4 tools into native GPT-5 prompts", async function () {
			await expectPiPlanningProjectedToolNames(this, 4, [
				"read_file",
				"plan_story_artifacts",
				"set_workflow_values",
				"send_user_message",
				"ask_followup_question",
				"workflow_progress_request",
			])
		})

		it("projects active pi-planning Step 5 tools into native GPT-5 prompts", async function () {
			await expectPiPlanningProjectedToolNames(this, 5, [
				"generate_story_files",
				"send_user_message",
				"ask_followup_question",
			])
		})

		it("projects active pi-planning Step 6 tools into native GPT-5 prompts", async function () {
			await expectPiPlanningProjectedToolNames(this, 6, [
				"list_files",
				"read_file",
				"apply_patch",
				"plan_story_artifacts",
				"generate_story_files",
				"send_user_message",
				"ask_followup_question",
				"attempt_completion",
			])
		})

		it("projects active create-story step tools from module-owned builders into native GPT-5 prompts", async function () {
			const expectations: readonly {
				activeStepNumber: CreateStoryPromptStepNumber
				expectedToolSpecs: readonly ClineToolSpec[]
			}[] = [
				{
					activeStepNumber: 2,
					expectedToolSpecs: buildCreateStoryStep2ToolSchemas(),
				},
				{
					activeStepNumber: 3,
					expectedToolSpecs: buildCreateStoryStep3ToolSchemas(),
				},
				{
					activeStepNumber: 4,
					expectedToolSpecs: buildCreateStoryStep4ToolSchemas(),
				},
			]

			for (const expectation of expectations) {
				await expectCreateStoryProjectedToolSurface(this, expectation.activeStepNumber, expectation.expectedToolSpecs)
			}
		})

		it("projects active dev-story step tools from module-owned builders into native GPT-5 prompts", async function () {
			const expectations: readonly {
				activeStepNumber: DevStoryPromptStepNumber
				expectedToolSpecs: readonly ClineToolSpec[]
			}[] = [
				{
					activeStepNumber: 2,
					expectedToolSpecs: buildDevStoryStep2ToolSchemas(),
				},
				{
					activeStepNumber: 3,
					expectedToolSpecs: buildDevStoryStep3ToolSchemas(),
				},
				{
					activeStepNumber: 4,
					expectedToolSpecs: buildDevStoryStep4ToolSchemas(),
				},
			]

			for (const expectation of expectations) {
				await expectDevStoryProjectedToolSurface(this, expectation.activeStepNumber, expectation.expectedToolSpecs)
			}
		})

		it("projects active blind-review Step 2 tools from module-owned builders into native GPT-5 prompts", async function () {
			await expectBlindReviewProjectedToolSurface(this, buildBlindReviewStep2ToolSchemas())
		})

		it("projects blind-review Step 2 materialized values into full-turn and continuation payloads", async () => {
			const context = await buildBlindReviewPromptContext(2)
			const workflowInputPayloadBlock = context.workflowInputPayloadBlock
			const continuationWorkflowInputPayloadBlock = context.continuationWorkflowInputPayloadBlock
			if (workflowInputPayloadBlock === undefined || workflowInputPayloadBlock === "") {
				throw new Error("Expected blind-review Step 2 workflow input payload.")
			}
			if (continuationWorkflowInputPayloadBlock === undefined || continuationWorkflowInputPayloadBlock === "") {
				throw new Error("Expected blind-review Step 2 continuation workflow input payload.")
			}

			const payloadBlocks: readonly string[] = [workflowInputPayloadBlock, continuationWorkflowInputPayloadBlock]
			for (const payloadBlock of payloadBlocks) {
				expect(payloadBlock.trim()).to.not.equal("")
				expect(payloadBlock).to.include(BLIND_REVIEW_REVIEW_COMMIT_HASH)
				expect(payloadBlock).to.include(BLIND_REVIEW_REVIEW_COMMIT_PARENT)
				expect(payloadBlock).to.include(BLIND_REVIEW_OUTPUT)
				expect(payloadBlock).to.not.include("review_commit_hash")
				expect(payloadBlock).to.not.include("review_commit_parent")
				expect(payloadBlock).to.not.include("blind_review_output")
			}
		})

		it("does not expose forbidden tools in blind-review Step 2 prompt projection", async function () {
			const context = await buildBlindReviewPromptContext(2)
			const projectedToolNames = (context.workflowToolSchemaOverride ?? []).map((tool) => tool.name)
			for (const forbiddenToolName of BLIND_REVIEW_FORBIDDEN_PROMPT_TOOL_NAMES) {
				expect(projectedToolNames).to.not.include(forbiddenToolName)
			}

			await runPromptTest(this, context, "gpt-5-codex", async ({ tools }) => {
				const nativeToolNames = getNativeToolNames(tools)
				for (const forbiddenToolName of BLIND_REVIEW_FORBIDDEN_PROMPT_TOOL_NAMES) {
					expect(nativeToolNames).to.not.include(forbiddenToolName)
				}
			})
		})

		it("renders blind-review Step 2 tools through non-native prompt text without forbidden tools", async function () {
			const nativeContext = await buildBlindReviewPromptContext(2)
			const context: SystemPromptContext = {
				...nativeContext,
				providerInfo: makeProviderInfo("gpt-3", "openai"),
				enableNativeToolCalls: false,
			}
			const approvedToolNames = buildBlindReviewStep2ToolSchemas().map((tool) => tool.name)

			await runPromptTest(this, context, "gpt-3", async ({ systemPrompt, tools }) => {
				expect(tools).to.equal(undefined)
				for (const approvedToolName of approvedToolNames) {
					expect(systemPrompt).to.include(approvedToolName)
				}
				for (const forbiddenToolName of BLIND_REVIEW_FORBIDDEN_PROMPT_TOOL_NAMES) {
					expect(systemPrompt).to.not.include(forbiddenToolName)
				}
			})
		})

		it("projects active code-review step tools from module-owned builders into native GPT-5 prompts", async function () {
			const expectations: readonly {
				activeStepNumber: CodeReviewPromptStepNumber
				expectedToolSpecs: readonly ClineToolSpec[]
			}[] = [
				{
					activeStepNumber: 2,
					expectedToolSpecs: buildCodeReviewStep2ToolSchemas(),
				},
				{
					activeStepNumber: 3,
					expectedToolSpecs: buildCodeReviewStep3ToolSchemas(),
				},
				{
					activeStepNumber: 4,
					expectedToolSpecs: buildCodeReviewStep4ToolSchemas(),
				},
			]

			for (const expectation of expectations) {
				await expectCodeReviewProjectedToolSurface(this, expectation.activeStepNumber, expectation.expectedToolSpecs)
			}
		})

		it("projects code-review Step 2 review-orchestration details into non-empty prompt payloads", async () => {
			const context = await buildCodeReviewPromptContext(2)
			const projectedToolNames = (context.workflowToolSchemaOverride ?? []).map((tool) => tool.name)
			expect(projectedToolNames).to.deep.equal(["use_subagents", "send_user_message", "workflow_progress_request"])

			const workflowInputPayloadBlock = context.workflowInputPayloadBlock
			const continuationWorkflowInputPayloadBlock = context.continuationWorkflowInputPayloadBlock
			if (workflowInputPayloadBlock === undefined || workflowInputPayloadBlock === "") {
				throw new Error("Expected code-review workflow input payload.")
			}
			if (continuationWorkflowInputPayloadBlock === undefined || continuationWorkflowInputPayloadBlock === "") {
				throw new Error("Expected code-review continuation workflow input payload.")
			}

			const payloadBlocks: readonly string[] = [workflowInputPayloadBlock, continuationWorkflowInputPayloadBlock]
			for (const payloadBlock of payloadBlocks) {
				expect(payloadBlock.trim()).to.not.equal("")
			}
		})

		it("projects code-review Step 3 synthesis values and guards forbidden tools", async function () {
			const context = await buildCodeReviewPromptContext(3)
			const projectedToolNames = (context.workflowToolSchemaOverride ?? []).map((tool) => tool.name)
			expect(projectedToolNames).to.deep.equal([
				"read_file",
				"read_file_range",
				"record_findings",
				"send_user_message",
				"workflow_progress_request",
			])

			const workflowInputPayloadBlock = context.workflowInputPayloadBlock
			const continuationWorkflowInputPayloadBlock = context.continuationWorkflowInputPayloadBlock
			if (workflowInputPayloadBlock === undefined || workflowInputPayloadBlock === "") {
				throw new Error("Expected code-review Step 3 workflow input payload.")
			}
			if (continuationWorkflowInputPayloadBlock === undefined || continuationWorkflowInputPayloadBlock === "") {
				throw new Error("Expected code-review Step 3 continuation workflow input payload.")
			}

			const materializedWorkflowValues: readonly string[] = [
				CODE_REVIEW_BLIND_REVIEW_OUTPUT,
				CODE_REVIEW_EDGE_CASE_REVIEW_OUTPUT,
				CODE_REVIEW_TARGET_STORY,
				CODE_REVIEW_REVIEW_SCOPE_MANIFEST,
				CODE_REVIEW_EPICS_DOCUMENT,
				CODE_REVIEW_ARCHITECTURE_DOCUMENT,
			]
			const payloadBlocks: readonly string[] = [workflowInputPayloadBlock, continuationWorkflowInputPayloadBlock]
			for (const payloadBlock of payloadBlocks) {
				for (const materializedWorkflowValue of materializedWorkflowValues) {
					expect(payloadBlock).to.include(materializedWorkflowValue)
				}
			}

			const forbiddenToolNames: readonly string[] = [
				"attempt_completion",
				"create_workflow_artifact",
				"build_workflow_document",
				"plan_remediation_story_artifact",
				"update_story_index_status",
				"move_workflow_project_file",
			]
			for (const forbiddenToolName of forbiddenToolNames) {
				expect(projectedToolNames).to.not.include(forbiddenToolName)
			}

			await runPromptTest(this, context, "gpt-5-codex", async ({ tools }) => {
				const nativeToolNames = getNativeToolNames(tools)
				for (const forbiddenToolName of forbiddenToolNames) {
					expect(nativeToolNames).to.not.include(forbiddenToolName)
				}
			})
		})

		it("projects code-review Step 4 upstream-findings remediation payload", async function () {
			const context = await buildCodeReviewPromptContext(
				4,
				createCodeReviewWorkflowValues({
					[CodeReviewWorkflowValueKey.UpstreamFindingsPresent]: true,
					[CodeReviewWorkflowValueKey.RemediationStory]: CODE_REVIEW_REMEDIATION_STORY,
				}),
			)
			const payloadBlocks = await expectCodeReviewStep4PromptProjection(this, context)

			const payloadBlockValues: readonly string[] = [
				payloadBlocks.workflowInputPayloadBlock,
				payloadBlocks.continuationWorkflowInputPayloadBlock,
			]
			for (const payloadBlock of payloadBlockValues) {
				expect(payloadBlock).to.include(CODE_REVIEW_REMEDIATION_STORY)
			}
		})

		it("projects code-review Step 4 upstream-absent payload differently from upstream-present", async function () {
			const upstreamPresentContext = await buildCodeReviewPromptContext(
				4,
				createCodeReviewWorkflowValues({
					[CodeReviewWorkflowValueKey.UpstreamFindingsPresent]: true,
					[CodeReviewWorkflowValueKey.RemediationStory]: CODE_REVIEW_REMEDIATION_STORY,
				}),
			)
			const upstreamAbsentContext = await buildCodeReviewPromptContext(
				4,
				createCodeReviewWorkflowValues({
					[CodeReviewWorkflowValueKey.UpstreamFindingsPresent]: false,
				}),
			)
			const upstreamPresentPayloadBlocks = await expectCodeReviewStep4PromptProjection(this, upstreamPresentContext)
			const upstreamAbsentPayloadBlocks = await expectCodeReviewStep4PromptProjection(this, upstreamAbsentContext)
			expect(upstreamPresentPayloadBlocks.workflowInputPayloadBlock).to.not.equal(
				upstreamAbsentPayloadBlocks.workflowInputPayloadBlock,
			)
			expect(upstreamPresentPayloadBlocks.continuationWorkflowInputPayloadBlock).to.not.equal(
				upstreamAbsentPayloadBlocks.continuationWorkflowInputPayloadBlock,
			)

			const upstreamAbsentPayloadBlockValues: readonly string[] = [
				upstreamAbsentPayloadBlocks.workflowInputPayloadBlock,
				upstreamAbsentPayloadBlocks.continuationWorkflowInputPayloadBlock,
			]
			for (const payloadBlock of upstreamAbsentPayloadBlockValues) {
				expect(payloadBlock).to.include(CODE_REVIEW_REMEDIATION_STORY)
			}
		})

		it("projects code-review Step 4 without remediation path when remediation story is empty", async function () {
			const context = await buildCodeReviewPromptContext(
				4,
				createCodeReviewWorkflowValues({
					[CodeReviewWorkflowValueKey.RemediationStory]: "",
				}),
			)
			const payloadBlocks = await expectCodeReviewStep4PromptProjection(this, context)

			const payloadBlockValues: readonly string[] = [
				payloadBlocks.workflowInputPayloadBlock,
				payloadBlocks.continuationWorkflowInputPayloadBlock,
			]
			for (const payloadBlock of payloadBlockValues) {
				expect(payloadBlock).to.not.include(CODE_REVIEW_REMEDIATION_STORY)
			}
		})

		it("projects dev-story Step 2 story tools only while Step 2 is active", async () => {
			const step2Context = await buildDevStoryPromptContext(2)
			const step2ToolNames = (step2Context.workflowToolSchemaOverride ?? []).map((tool) => tool.name)
			expect(step2ToolNames).to.include("story_task_complete")
			expect(step2ToolNames).to.include("request_task_detail")
			expect(step2ToolNames).to.include("show_incomplete_tasks")
			expect(step2ToolNames).to.include("execute_command")

			const laterStepNumbers: readonly DevStoryPromptStepNumber[] = [3, 4]
			for (const activeStepNumber of laterStepNumbers) {
				const context = await buildDevStoryPromptContext(activeStepNumber)
				const projectedToolNames = (context.workflowToolSchemaOverride ?? []).map((tool) => tool.name)
				expect(projectedToolNames).to.not.include("story_task_complete")
				expect(projectedToolNames).to.not.include("request_task_detail")
				expect(projectedToolNames).to.not.include("show_incomplete_tasks")
				expect(projectedToolNames).to.not.include("execute_command")
			}
		})

		it("renders create-story response-tool guidance for progress steps and completion step only", async function () {
			const workflowProgressStepNumbers: readonly CreateStoryPromptStepNumber[] = [2, 3]

			for (const activeStepNumber of workflowProgressStepNumbers) {
				const context = await buildCreateStoryPromptContext(activeStepNumber)
				await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt }) => {
					expectResponseToolNames(systemPrompt, ["`workflow_progress_request`"], ["`attempt_completion`"])
				})
			}

			const completionContext = await buildCreateStoryPromptContext(4)
			await runPromptTest(this, completionContext, "gpt-5-codex", async ({ systemPrompt }) => {
				expectResponseToolNames(systemPrompt, ["`attempt_completion`"], ["`workflow_progress_request`"])
			})
		})

		it("does not statically expose forbidden runtime or story-planning tools in create-story prompt projection", async function () {
			const activeStepNumbers: readonly CreateStoryPromptStepNumber[] = [2, 3, 4]
			const forbiddenToolNames: readonly string[] = [
				"build_workflow_document",
				"create_workflow_artifact",
				"archive_workflow_artifact",
				"delete_workflow_artifact",
				"move_workflow_project_file",
				"plan_story_artifacts",
				"plan_remediation_story_artifact",
				"generate_story_files",
				"set_workflow_values",
				"update_story_index_status",
				"execute_command",
			]

			for (const activeStepNumber of activeStepNumbers) {
				const context = await buildCreateStoryPromptContext(activeStepNumber)
				const projectedToolNames = (context.workflowToolSchemaOverride ?? []).map((tool) => tool.name)
				for (const forbiddenToolName of forbiddenToolNames) {
					expect(projectedToolNames).to.not.include(forbiddenToolName)
				}

				await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt, tools }) => {
					const nativeToolNames = getNativeToolNames(tools)
					for (const forbiddenToolName of forbiddenToolNames) {
						expect(nativeToolNames).to.not.include(forbiddenToolName)
						expect(systemPrompt).to.not.include(forbiddenToolName)
					}
				})
			}
		})

		it("projects create-architecture workflow context into the full-turn input payload only", async function () {
			const context = await buildCreateArchitecturePromptContext(3)
			const workflowInputPayloadBlock = context.workflowInputPayloadBlock
			expect(workflowInputPayloadBlock).to.not.equal(undefined)
			if (workflowInputPayloadBlock === undefined) {
				throw new Error("Expected create-architecture workflow input payload.")
			}

			expect(workflowInputPayloadBlock).to.include("Workflow:\nCreate Architecture")
			expect(workflowInputPayloadBlock).to.include(
				"Description: Create a complete architecture document through collaborative discovery, explicit design decisions, and a final readiness review.",
			)
			expect(workflowInputPayloadBlock).to.include(
				"Persona:\nYou are to adopt this persona throughout your interactions with the user.",
			)
			expect(workflowInputPayloadBlock).to.include("Name: Winston")
			expect(workflowInputPayloadBlock).to.include("Role: Architect")
			expect(workflowInputPayloadBlock).to.include(
				"Identity: Designs scalable systems and chooses practical technology with care.",
			)
			expect(workflowInputPayloadBlock).to.include("Capabilities: distributed systems, cloud, API design, scalability")
			expect(workflowInputPayloadBlock).to.include("Communication Style: Calm, pragmatic, and tradeoff-aware.")
			expect(workflowInputPayloadBlock).to.include("Prefer simple, boring solutions that scale when needed.")
			expect(workflowInputPayloadBlock).to.include("1. Generate Output Document - Complete")
			expect(workflowInputPayloadBlock).to.include("2. Gather User Inputs - Complete")
			expect(workflowInputPayloadBlock).to.include("3. Establish Architecture Foundational Elements - Active")
			expect(workflowInputPayloadBlock).to.include("9. Finalize Architecture Document - Not Started")
			expect(workflowInputPayloadBlock).to.include("CURRENT STEP DETAILED INSTRUCTIONS")
			expect(workflowInputPayloadBlock).to.include("Step 3: Establish Architecture Foundational Elements")
			expect(workflowInputPayloadBlock).to.include(`Read \`${CREATE_ARCHITECTURE_OUTPUT_FILE}\`.`)
			expect(workflowInputPayloadBlock).to.include("Draft and propose content for Project Context Analysis")

			await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt }) => {
				expect(systemPrompt).to.not.include("CURRENT STEP DETAILED INSTRUCTIONS")
				expect(systemPrompt).to.not.include("Step 3: Establish Architecture Foundational Elements")
				expect(systemPrompt).to.not.include(`Read \`${CREATE_ARCHITECTURE_OUTPUT_FILE}\`.`)
				expect(systemPrompt).to.not.include("Draft and propose content for Project Context Analysis")
			})
		})

		it("projects create-epics current step details into the full-turn input payload only", async function () {
			const context = await buildCreateEpicsPromptContext()
			const workflowInputPayloadBlock = context.workflowInputPayloadBlock
			expect(workflowInputPayloadBlock).to.not.equal(undefined)
			if (workflowInputPayloadBlock === undefined) {
				throw new Error("Expected create-epics workflow input payload.")
			}

			expect(workflowInputPayloadBlock).to.include("Workflow:\nCreate Epics")
			expect(workflowInputPayloadBlock).to.include(
				"Description: Create a project-level epics document from an existing architecture document, then generate the structured epic index used by downstream planning workflows.",
			)
			expect(workflowInputPayloadBlock).to.include("Name: John")
			expect(workflowInputPayloadBlock).to.include("Role: Product Manager")
			expect(workflowInputPayloadBlock).to.include("1. Gather Inputs - Complete")
			expect(workflowInputPayloadBlock).to.include("2. Draft Epics - Active")
			expect(workflowInputPayloadBlock).to.include("CURRENT STEP DETAILED INSTRUCTIONS")
			expect(workflowInputPayloadBlock).to.include("Step 2: Draft Epics")
			expect(workflowInputPayloadBlock).to.include(`Read \`${CREATE_EPICS_OUTPUT_FILE}\`.`)
			expect(workflowInputPayloadBlock).to.include(`Read \`${CREATE_EPICS_ARCHITECTURE_DOCUMENT}\`.`)
			expect(workflowInputPayloadBlock).to.include(`Read \`${CREATE_EPICS_BRAINSTORMING_DOCUMENT}\` when present.`)
			expect(workflowInputPayloadBlock).to.include(
				`Read any files listed in \`${CREATE_EPICS_ADDITIONAL_CONTEXT_FILES}\` when present.`,
			)
			expect(workflowInputPayloadBlock).to.include(
				"Call `upsert_epic` for each user-aligned epic. Use `upsert_epic` to persist every accepted epic and every accepted revision.",
			)
			expect(workflowInputPayloadBlock).to.include(
				"After the user indicates alignment with the drafted epics, use `attempt_completion` to provide a final recap and remind the user to run the `pi-planning` workflow for each epic to define that epic's user stories.",
			)

			await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt }) => {
				expect(systemPrompt).to.not.include("CURRENT STEP DETAILED INSTRUCTIONS")
				expect(systemPrompt).to.not.include("Step 2: Draft Epics")
				expect(systemPrompt).to.not.include(`Read \`${CREATE_EPICS_OUTPUT_FILE}\`.`)
				expect(systemPrompt).to.not.include(
					"Call `upsert_epic` for each user-aligned epic. Use `upsert_epic` to persist every accepted epic and every accepted revision.",
				)
				expect(systemPrompt).to.not.include(
					"After the user indicates alignment with the drafted epics, use `attempt_completion` to provide a final recap and remind the user to run the `pi-planning` workflow for each epic to define that epic's user stories.",
				)
			})
		})

		it("projects create-story current step details into the full-turn input payload only", async function () {
			const context = await buildCreateStoryPromptContext(2)
			const workflowInputPayloadBlock = context.workflowInputPayloadBlock
			expect(workflowInputPayloadBlock).to.not.equal(undefined)
			if (workflowInputPayloadBlock === undefined) {
				throw new Error("Expected create-story workflow input payload.")
			}

			expect(workflowInputPayloadBlock).to.include("Workflow:\nCreate Story")
			expect(workflowInputPayloadBlock).to.include("Name: Bob")
			expect(workflowInputPayloadBlock).to.include("Role: Scrum Master")
			expect(workflowInputPayloadBlock).to.include("1. Gather Inputs - Complete")
			expect(workflowInputPayloadBlock).to.include("2. Review Context & Ensure Project Alignment - Active")
			expect(workflowInputPayloadBlock).to.include("4. Finalize & Validate Story Document - Not Started")
			expect(workflowInputPayloadBlock).to.include("CURRENT STEP DETAILED INSTRUCTIONS")
			expect(workflowInputPayloadBlock).to.include("Step 2: Review Context & Ensure Project Alignment")

			await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt }) => {
				expect(systemPrompt).to.not.include("CURRENT STEP DETAILED INSTRUCTIONS")
				expect(systemPrompt).to.not.include("Step 2: Review Context & Ensure Project Alignment")
			})
		})

		it("projects dev-story current step details into the full-turn input payload only", async function () {
			const context = await buildDevStoryPromptContext(2)
			const workflowInputPayloadBlock = context.workflowInputPayloadBlock
			expect(workflowInputPayloadBlock).to.not.equal(undefined)
			if (workflowInputPayloadBlock === undefined) {
				throw new Error("Expected dev-story workflow input payload.")
			}

			expect(workflowInputPayloadBlock).to.include("Workflow:\ndev-story")
			expect(workflowInputPayloadBlock).to.include("Name: Amelia")
			expect(workflowInputPayloadBlock).to.include("Role: Developer Agent")
			expect(workflowInputPayloadBlock).to.include("1. Gather Inputs - Complete")
			expect(workflowInputPayloadBlock).to.include("2. Execute Story Tasks - Active")
			expect(workflowInputPayloadBlock).to.include("4. Update Project Records - Not Started")
			expect(workflowInputPayloadBlock).to.include("CURRENT STEP DETAILED INSTRUCTIONS")
			expect(workflowInputPayloadBlock).to.include("Step 2: Execute Story Tasks")
			expect(workflowInputPayloadBlock).to.include("General guidance")
			expect(workflowInputPayloadBlock).to.include("- [ ] Task 1: Implement the runtime change")
			expect(workflowInputPayloadBlock).to.include("  - [ ] Subtask 1.1: Add the implementation")

			await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt }) => {
				expect(systemPrompt).to.not.include("CURRENT STEP DETAILED INSTRUCTIONS")
				expect(systemPrompt).to.not.include("Step 2: Execute Story Tasks")
				expect(systemPrompt).to.not.include("- [ ] Task 1: Implement the runtime change")
			})
		})

		it("projects pi-planning current step details into the full-turn input payload only", async function () {
			const context = await buildPiPlanningPromptContext(2)
			const workflowInputPayloadBlock = context.workflowInputPayloadBlock
			expect(workflowInputPayloadBlock).to.not.equal(undefined)
			if (workflowInputPayloadBlock === undefined) {
				throw new Error("Expected pi-planning workflow input payload.")
			}

			expect(workflowInputPayloadBlock).to.include("Workflow:\nPI Planning")
			expect(workflowInputPayloadBlock).to.include(
				"Description: Break a selected epic into implementation-ready draft story files using architecture, epics, and optional discovery context.",
			)
			expect(workflowInputPayloadBlock).to.include("Name: John")
			expect(workflowInputPayloadBlock).to.include("Role: Product Manager")
			expect(workflowInputPayloadBlock).to.include("1. Gather Inputs - Complete")
			expect(workflowInputPayloadBlock).to.include("2. Review Context - Active")
			expect(workflowInputPayloadBlock).to.include("6. Populate Story Files with Initial Details - Not Started")
			expect(workflowInputPayloadBlock).to.include("CURRENT STEP DETAILED INSTRUCTIONS")
			expect(workflowInputPayloadBlock).to.include("Step 2: Review Context")
			expect(workflowInputPayloadBlock).to.include("Prepare to break a single epic down into deliverable user stories.")
			expect(workflowInputPayloadBlock).to.include(`Focus only on \`${PI_PLANNING_TARGET_EPIC}\`.`)
			expect(workflowInputPayloadBlock).to.include(
				`Read \`${PI_PLANNING_EPICS_INDEX}\`, \`${PI_PLANNING_EPICS_DOCUMENT}\`, and \`${PI_PLANNING_ARCHITECTURE_DOCUMENT}\`.`,
			)

			await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt }) => {
				expect(systemPrompt).to.not.include("CURRENT STEP DETAILED INSTRUCTIONS")
				expect(systemPrompt).to.not.include("Step 2: Review Context")
				expect(systemPrompt).to.not.include("Prepare to break a single epic down into deliverable user stories.")
				expect(systemPrompt).to.not.include(`Focus only on \`${PI_PLANNING_TARGET_EPIC}\`.`)
				expect(systemPrompt).to.not.include(
					`Read \`${PI_PLANNING_EPICS_INDEX}\`, \`${PI_PLANNING_EPICS_DOCUMENT}\`, and \`${PI_PLANNING_ARCHITECTURE_DOCUMENT}\`.`,
				)
			})
		})

		it("does not statically expose backend-only runtime tools in pi-planning prompt projection", async function () {
			const activeStepNumbers: readonly PiPlanningPromptStepNumber[] = [2, 3, 4, 5, 6]
			const forbiddenToolNames: readonly string[] = [
				"build_workflow_document",
				"create_workflow_artifact",
				"archive_workflow_artifact",
				"delete_workflow_artifact",
				"move_workflow_project_file",
			]

			for (const activeStepNumber of activeStepNumbers) {
				const context = await buildPiPlanningPromptContext(activeStepNumber)
				const projectedToolNames = (context.workflowToolSchemaOverride ?? []).map((tool) => tool.name)
				for (const forbiddenToolName of forbiddenToolNames) {
					expect(projectedToolNames).to.not.include(forbiddenToolName)
				}

				await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt, tools }) => {
					const nativeToolNames = getNativeToolNames(tools)
					for (const forbiddenToolName of forbiddenToolNames) {
						expect(nativeToolNames).to.not.include(forbiddenToolName)
						expect(systemPrompt).to.not.include(forbiddenToolName)
					}
				})
			}
		})

		it("projects active brainstorming Step 3 choose and random tools into native GPT-5 prompts", async function () {
			const selectedApproaches = ["I want to choose", "I want a random technique"] as const
			const approvedStep3ToolNames = [
				"get_brainstorming_methods",
				"append_brainstorming_selected_technique",
				"read_file",
				"apply_patch",
				"send_user_message",
				"ask_followup_question",
				"workflow_progress_request",
			]

			for (const selectedApproach of selectedApproaches) {
				const context = await buildBrainstormingPromptContext({
					activeStepNumber: 3,
					workflowValues: {
						selected_approach: selectedApproach,
						output_file: "/test/project/discovery/brainstorming.md",
					},
				})

				await runPromptTest(this, context, "gpt-5-codex", async ({ tools }) => {
					const nativeToolNames = getNativeToolNames(tools)

					expect(nativeToolNames).to.deep.equal(approvedStep3ToolNames)
					expect(nativeToolNames).to.not.include("build_workflow_document")
					expect(nativeToolNames).to.not.include("set_workflow_values")
				})
			}
		})

		it("projects active brainstorming Step 4 completion tools without workflow progress requests", async function () {
			const context = await buildBrainstormingPromptContext({
				activeStepNumber: 4,
				workflowValues: {
					output_file: "/test/project/discovery/brainstorming.md",
				},
			})

			await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt, tools }) => {
				const nativeToolNames = getNativeToolNames(tools)

				expect(nativeToolNames).to.deep.equal([
					"read_file",
					"apply_patch",
					"send_user_message",
					"ask_followup_question",
					"attempt_completion",
				])
				expect(nativeToolNames).to.not.include("build_workflow_document")
				expect(nativeToolNames).to.not.include("set_workflow_values")
				expect(nativeToolNames).to.not.include("workflow_progress_request")
				expect(systemPrompt).to.not.include("Workflow: brainstorming")
				expect(systemPrompt).to.not.include("using `attempt_completion`")
				expect(systemPrompt).to.not.include("workflow_progress_request")
			})
		})

		it("projects create_workflow_artifact only through workflow override schemas", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					workflowToolSchemaOverride: createWorkflowArtifactNativeOnlyToolSpecs,
				},
				"gpt-5-1",
				async ({ tools }) => {
					expect(getNativeToolNames(tools)).to.deep.equal(["create_workflow_artifact"])
				},
			)

			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-3", "openai"),
					enableNativeToolCalls: false,
					workflowToolSchemaOverride: createWorkflowArtifactGenericToolSpecs,
				},
				"gpt-3",
				async ({ systemPrompt, tools }) => {
					expect(tools).to.be.undefined
					expect(systemPrompt).to.include("create_workflow_artifact")
					expect(systemPrompt).to.include("artifact_id")
				},
			)
		})

		it("shows only the generic visible Indxr guidance exposed by a workflow override schema in native GPT-5.1 prompts", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					mcpHub: makeMcpHub([
						makeIndxrServer({
							tools: [
								{
									name: "search_relevant",
									description: "Search relevant code",
									inputSchema: { type: "object", properties: {} },
								},
								{
									name: "get_file_summary",
									description: "Summarize file",
									inputSchema: { type: "object", properties: {} },
								},
								{
									name: "lookup_symbol",
									description: "Lookup symbol",
									inputSchema: { type: "object", properties: {} },
								},
							],
						}),
					]),
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					workflowToolSchemaOverride: genericWorkflowOverrideToolSpecs,
				},
				"gpt-5-1",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.not.include("Indxr-Aware Exploration")
					expect(systemPrompt).to.not.include("search_relevant")
					expect(systemPrompt).to.not.include("get_file_summary")
					expect(systemPrompt).to.not.include("lookup_symbol")
				},
			)
		})

		it("does not add Indxr-aware guidance for a single weak matching tool", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					mcpHub: makeMcpHub([makeWeakIndxrLikeServer("read_source")]),
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt, tools }) => {
					expect(systemPrompt).to.not.include("## weak-read_source-server (`generic`)")
					expect(systemPrompt).to.include("Indxr-Aware Exploration")
					expect(systemPrompt).to.include("`read_source`")
					expect(systemPrompt).to.not.include("`search_relevant`")

					const nativeTools = getNativeToolEntries(tools)
					const byName = new Map(nativeTools.map((tool) => [tool.name, tool.description]))

					expect(byName.get("search_files")).to.equal(
						"Request to perform a regex search across files in a specified directory, providing context-rich results.",
					)
				},
			)
		})

		it("keeps dedicated subagent Indxr guidance separate from the main MCP prompt guidance", async () => {
			const context: SystemPromptContext = {
				...baseContext,
				mcpHub: makeMcpHub([makeIndxrServer()]),
			}

			const result = await getSystemPrompt(context)
			expect(result.systemPrompt).to.contain("`search_relevant`")
			expect(result.systemPrompt).to.not.contain("# Indxr-Aware Exploration")
		})

		it("teaches the governed response-tool contract in the active prompt guidance", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-3", "openai"),
					enableNativeToolCalls: false,
				},
				"gpt-3",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("RESPONSE TOOLS")
					expectResponseToolNames(
						systemPrompt,
						["`attempt_completion`", "`send_user_message`", "`ask_followup_question`"],
						["`generate_plan_output`"],
					)
					expect(systemPrompt).to.not.include("In ACT MODE, respond using these:")
				},
			)
		})

		it("omits stale agent_feedback guidance in a normal tool-use prompt", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-3", "openai"),
					enableNativeToolCalls: false,
				},
				"gpt-3",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.not.include(STALE_AGENT_FEEDBACK_PROMPT_TEXT)
				},
			)
		})

		it("omits stale agent_feedback guidance in the GPT-5 tool-use prompt", async function () {
			this.timeout(TEST_TIMEOUT)

			const systemPrompt = await PromptRegistry.getInstance().get({
				...baseContext,
				providerInfo: makeProviderInfo("gpt-5", "openai"),
				enableNativeToolCalls: false,
			})

			expect(systemPrompt).to.not.include(STALE_AGENT_FEEDBACK_PROMPT_TEXT)
		})

		it("omits stale agent_feedback guidance in the Hermes tool-use prompt", async function () {
			this.timeout(TEST_TIMEOUT)

			const systemPrompt = await PromptRegistry.getInstance().get({
				...baseContext,
				providerInfo: makeProviderInfo("hermes-4", "test"),
				enableNativeToolCalls: false,
			})

			expect(systemPrompt).to.not.include(STALE_AGENT_FEEDBACK_PROMPT_TEXT)
		})

		it("keeps native response-tool specs aligned with the shared response-tool contract", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5-1", "openai"),
					enableNativeToolCalls: true,
				},
				"gpt-5-1",
				async ({ tools, systemPrompt }) => {
					expect(systemPrompt).to.include("RESPONSE TOOLS")

					const nativeTools = getNativeToolEntries(tools)
					const byName = new Map(nativeTools.map((tool) => [tool.name, tool.description]))

					expect(byName.has("act_mode_respond")).to.equal(true)
					expect(byName.has("attempt_completion")).to.equal(true)
					expect(byName.has("generate_plan_output")).to.equal(false)
					expect(byName.get("attempt_completion")).to.be.a("string").and.not.empty
					expect(byName.get("send_user_message")).to.be.a("string").and.not.empty
					expect(byName.get("ask_followup_question")).to.be.a("string").and.not.empty
					expect(byName.get("act_mode_respond")).to.be.a("string").and.not.empty
				},
			)
		})

		it("filters native response-tool specs for PLAN mode", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: { ...makeProviderInfo("gpt-5-1", "openai"), mode: "plan" },
					enableNativeToolCalls: true,
				},
				"gpt-5-1",
				async ({ tools }) => {
					const nativeTools = getNativeToolEntries(tools)
					const byName = new Map(nativeTools.map((tool) => [tool.name, tool.description]))

					expect(byName.has("generate_plan_output")).to.equal(true)
					expect(byName.has("attempt_completion")).to.equal(false)
					expect(byName.has("act_mode_respond")).to.equal(false)
					expect(byName.has("ask_followup_question")).to.equal(true)
					expect(byName.has("send_user_message")).to.equal(true)
				},
			)
		})
		it("omits workflow placeholder output from full prompts while applying workflow tool overrides", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					workflowToolSchemaOverride: workflowProgressOnlyToolSpecs,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt, tools }) => {
					expect(getNativeToolNames(tools)).to.deep.equal(["workflow_progress_request"])
					expect(systemPrompt).to.not.include("{{WORKFLOW")
					expect(systemPrompt).to.not.include("## WORKFLOW")
					expect(systemPrompt).to.not.include("# CURRENT WORKFLOW STEP")
				},
			)
		})

		it("omits workflow placeholder output from continuation prompts", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					isContinuationTurn: true,
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.include("CONTINUATION TURN")
					expect(systemPrompt).to.not.include("{{WORKFLOW")
					expect(systemPrompt).to.not.include("## WORKFLOW")
					expect(systemPrompt).to.not.include("# CURRENT WORKFLOW STEP")
				},
			)
		})

		it("omits the disabled skills section in non-agent prompts even when skills are provided", async function () {
			await runPromptTest(
				this,
				{
					...baseContext,
					providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai"),
					enableNativeToolCalls: true,
					useMinimalGptPrompt: true,
					skills: [
						{
							name: "generic-skill",
							description: "Generic skill",
							path: "/skills/generic-skill/SKILL.md",
							source: "global",
						},
						{
							name: "generic-persona",
							description: "Generic persona",
							path: "/skills/generic-persona/SKILL.md",
							source: "project",
						},
					],
				},
				"gpt-5.4-2026-03-05",
				async ({ systemPrompt }) => {
					expect(systemPrompt).to.not.include("Installed skills and workflow activations available on this turn")
					expect(systemPrompt).to.not.include("\nSKILLS\n")
					expect(systemPrompt).to.not.include("generic-persona")
				},
			)
		})
	})

	describe("Error Handling", () => {
		it("should handle completely invalid context gracefully", async function () {
			this.timeout(TEST_TIMEOUT)
			const { systemPrompt } = await getSystemPrompt({} as SystemPromptContext)
			expect(systemPrompt).to.be.a("string")
		})

		it("should handle undefined context properties", async function () {
			this.timeout(TEST_TIMEOUT)
			const contextWithNulls: SystemPromptContext = {
				cwd: undefined,
				ide: "",
				supportsBrowserUse: undefined,
				mcpHub: undefined,
				focusChainSettings: undefined,
				providerInfo: mockProviderInfo,
			}

			try {
				const { systemPrompt } = await getSystemPrompt(contextWithNulls)
				expect(systemPrompt).to.be.a("string")
				expect(systemPrompt).to.include("{{TOOL_USE_SECTION}}")
			} catch (error) {
				expect(error).to.be.instanceOf(Error)
			}
		})
	})
})
