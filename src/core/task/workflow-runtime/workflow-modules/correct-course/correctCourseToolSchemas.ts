import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

const CORRECT_COURSE_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5

export const CORRECT_COURSE_STEP_3_TOOL_IDS: readonly ClineDefaultTool[] = [
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

function resolveCorrectCourseSharedToolSpec(toolId: ClineDefaultTool): ClineToolSpec {
	registerClineToolSets()
	const tool = ClineToolSet.getToolByNameWithFallback(toolId, CORRECT_COURSE_TOOL_SCHEMA_VARIANT)
	if (tool === undefined) {
		throw new Error(`Missing shared/default tool schema for ${toolId}.`)
	}

	return tool.config
}

export function buildCorrectCourseStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildCorrectCourseStep2ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildCorrectCourseStep3ToolSchemas(): readonly ClineToolSpec[] {
	return CORRECT_COURSE_STEP_3_TOOL_IDS.map((toolId) => resolveCorrectCourseSharedToolSpec(toolId))
}
