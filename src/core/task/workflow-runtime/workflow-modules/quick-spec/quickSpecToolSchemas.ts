import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

const QUICK_SPEC_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5

export const QUICK_SPEC_STEP_2_TOOL_IDS: readonly ClineDefaultTool[] = [
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.FILE_READ_RANGE,
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.APPLY_PATCH,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
]

export const QUICK_SPEC_STEP_3_TOOL_IDS: readonly ClineDefaultTool[] = [
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.FILE_READ_RANGE,
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.APPLY_PATCH,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
]

export const QUICK_SPEC_STEP_4_TOOL_IDS: readonly ClineDefaultTool[] = [
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.FILE_READ_RANGE,
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.APPLY_PATCH,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.USE_SUBAGENTS,
	ClineDefaultTool.ATTEMPT,
]

function resolveQuickSpecSharedToolSpec(toolId: ClineDefaultTool): ClineToolSpec {
	registerClineToolSets()
	const tool = ClineToolSet.getToolByNameWithFallback(toolId, QUICK_SPEC_TOOL_SCHEMA_VARIANT)
	if (tool === undefined) {
		throw new Error(`Missing shared/default tool schema for ${toolId}.`)
	}

	return tool.config
}

export function buildQuickSpecStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildQuickSpecStep2ToolSchemas(): readonly ClineToolSpec[] {
	return QUICK_SPEC_STEP_2_TOOL_IDS.map((toolId) => resolveQuickSpecSharedToolSpec(toolId))
}

export function buildQuickSpecStep3ToolSchemas(): readonly ClineToolSpec[] {
	return QUICK_SPEC_STEP_3_TOOL_IDS.map((toolId) => resolveQuickSpecSharedToolSpec(toolId))
}

export function buildQuickSpecStep4ToolSchemas(): readonly ClineToolSpec[] {
	return QUICK_SPEC_STEP_4_TOOL_IDS.map((toolId) => resolveQuickSpecSharedToolSpec(toolId))
}
