import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

const CREATE_STORY_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5

export const CREATE_STORY_STEP_2_TOOL_IDS: readonly ClineDefaultTool[] = [
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.ASK,
	ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
	ClineDefaultTool.APPLY_PATCH,
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.FILE_READ_RANGE,
]

export const CREATE_STORY_STEP_3_TOOL_IDS: readonly ClineDefaultTool[] = [
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.FILE_READ_RANGE,
	ClineDefaultTool.APPLY_PATCH,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.ASK,
	ClineDefaultTool.USE_SUBAGENTS,
	ClineDefaultTool.ATTEMPT,
]

function resolveCreateStorySharedToolSpec(toolId: ClineDefaultTool): ClineToolSpec {
	registerClineToolSets()
	const tool = ClineToolSet.getToolByNameWithFallback(toolId, CREATE_STORY_TOOL_SCHEMA_VARIANT)
	if (tool === undefined) {
		throw new Error(`Missing shared/default tool schema for ${toolId}.`)
	}

	return tool.config
}

export function buildCreateStoryStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildCreateStoryStep2ToolSchemas(): readonly ClineToolSpec[] {
	return CREATE_STORY_STEP_2_TOOL_IDS.map((toolId) => resolveCreateStorySharedToolSpec(toolId))
}

export function buildCreateStoryStep3ToolSchemas(): readonly ClineToolSpec[] {
	return CREATE_STORY_STEP_3_TOOL_IDS.map((toolId) => resolveCreateStorySharedToolSpec(toolId))
}
