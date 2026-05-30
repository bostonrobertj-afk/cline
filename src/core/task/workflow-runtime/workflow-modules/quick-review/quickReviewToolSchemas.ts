import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

const QUICK_REVIEW_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5

export const QUICK_REVIEW_STEP_2_TOOL_IDS: readonly ClineDefaultTool[] = [
	ClineDefaultTool.BASH,
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.FILE_READ_RANGE,
	ClineDefaultTool.APPLY_PATCH,
	ClineDefaultTool.FILE_NEW,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.ATTEMPT,
]

function resolveQuickReviewSharedToolSpec(toolId: ClineDefaultTool): ClineToolSpec {
	registerClineToolSets()
	const tool = ClineToolSet.getToolByNameWithFallback(toolId, QUICK_REVIEW_TOOL_SCHEMA_VARIANT)
	if (tool === undefined) {
		throw new Error(`Missing shared/default tool schema for Quick Review tool: ${toolId}`)
	}

	return tool.config
}

export function buildQuickReviewStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildQuickReviewStep2ToolSchemas(): readonly ClineToolSpec[] {
	return QUICK_REVIEW_STEP_2_TOOL_IDS.map((toolId) => resolveQuickReviewSharedToolSpec(toolId))
}
