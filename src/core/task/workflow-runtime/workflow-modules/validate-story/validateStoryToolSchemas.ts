import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

const VALIDATE_STORY_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5

export const VALIDATE_STORY_STEP_1_TOOL_IDS: readonly ClineDefaultTool[] = [
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.FILE_READ_RANGE,
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.BASH,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.ATTEMPT,
]

function resolveValidateStorySharedToolSpec(toolId: ClineDefaultTool): ClineToolSpec {
	registerClineToolSets()
	const tool = ClineToolSet.getToolByNameWithFallback(toolId, VALIDATE_STORY_TOOL_SCHEMA_VARIANT)
	if (tool === undefined) {
		throw new Error(`Missing shared/default tool schema for ${toolId}.`)
	}

	return tool.config
}

export function buildValidateStoryStep1ToolSchemas(): readonly ClineToolSpec[] {
	return VALIDATE_STORY_STEP_1_TOOL_IDS.map((toolId) => resolveValidateStorySharedToolSpec(toolId))
}
