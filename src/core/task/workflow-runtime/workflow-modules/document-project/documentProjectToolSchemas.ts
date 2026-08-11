import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

export const DOCUMENT_PROJECT_STEP_4_TOOL_IDS: readonly ClineDefaultTool[] = [
	ClineDefaultTool.BASH,
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.FILE_READ_RANGE,
	ClineDefaultTool.APPLY_PATCH,
	ClineDefaultTool.FILE_NEW,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.ASK,
	ClineDefaultTool.ATTEMPT,
]

function resolveDocumentProjectSharedToolSpec(toolId: ClineDefaultTool): ClineToolSpec {
	registerClineToolSets()
	const tool = ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)
	if (tool === undefined) {
		throw new Error(`Missing shared/default tool schema for ${toolId}.`)
	}

	return tool.config
}

export function buildDocumentProjectStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildDocumentProjectStep2ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildDocumentProjectStep3ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildDocumentProjectStep4ToolSchemas(): readonly ClineToolSpec[] {
	return DOCUMENT_PROJECT_STEP_4_TOOL_IDS.map((toolId) => resolveDocumentProjectSharedToolSpec(toolId))
}
