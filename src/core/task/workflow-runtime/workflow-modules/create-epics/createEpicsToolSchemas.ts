import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

const CREATE_EPICS_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5

const CREATE_EPICS_STEP_2_SHARED_TOOL_IDS_BEFORE_UPSERT_EPIC: readonly ClineDefaultTool[] = [ClineDefaultTool.FILE_READ]

const CREATE_EPICS_STEP_2_SHARED_TOOL_IDS_AFTER_UPSERT_EPIC: readonly ClineDefaultTool[] = [
	ClineDefaultTool.APPLY_PATCH,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.ASK,
	ClineDefaultTool.ATTEMPT,
]

function resolveCreateEpicsSharedToolSpec(toolId: ClineDefaultTool): ClineToolSpec {
	registerClineToolSets()
	const tool = ClineToolSet.getToolByNameWithFallback(toolId, CREATE_EPICS_TOOL_SCHEMA_VARIANT)
	if (tool === undefined) {
		throw new Error(`Missing shared/default tool schema for ${toolId}.`)
	}

	return tool.config
}

export function buildCreateEpicsStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildCreateEpicsUpsertEpicToolSchema(): ClineToolSpec {
	return {
		variant: CREATE_EPICS_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.UPSERT_EPIC,
		name: "upsert_epic",
		description: "Insert or replace one user-aligned canonical epic section in the active create-epics document.",
		parameters: [
			{
				name: "identity",
				required: true,
				type: "string",
				instruction: "Positive numeric epic identity, such as 1.",
				description: "Positive numeric epic identity.",
			},
			{
				name: "title",
				required: true,
				type: "string",
				instruction: "Non-empty epic title.",
				description: "Non-empty epic title.",
			},
			{
				name: "objective",
				required: true,
				type: "object",
				instruction: "Epic objective with required as_a, i_want, and so_that string fields.",
				description: "Epic objective with as_a, i_want, and so_that fields.",
				properties: {
					as_a: { type: "string" },
					i_want: { type: "string" },
					so_that: { type: "string" },
				},
				requiredProperties: ["as_a", "i_want", "so_that"],
			},
			{
				name: "description",
				required: true,
				type: "string",
				instruction: "Non-empty epic description.",
				description: "Non-empty epic description.",
			},
			{
				name: "requirements",
				required: true,
				type: "array",
				items: { type: "string" },
				instruction: "Array of non-empty requirement statements for this epic.",
				description: "Non-empty requirement statements for this epic.",
			},
			{
				name: "scope",
				required: true,
				type: "array",
				items: { type: "string" },
				instruction: "Array of non-empty in-scope items for this epic.",
				description: "Non-empty in-scope items for this epic.",
			},
			{
				name: "scope_boundary",
				required: true,
				type: "array",
				items: { type: "string" },
				instruction: "Array of non-empty out-of-scope boundary items for this epic.",
				description: "Non-empty out-of-scope boundary items for this epic.",
			},
		],
	}
}

export function buildCreateEpicsStep2ToolSchemas(): readonly ClineToolSpec[] {
	return [
		...CREATE_EPICS_STEP_2_SHARED_TOOL_IDS_BEFORE_UPSERT_EPIC.map((toolId) => resolveCreateEpicsSharedToolSpec(toolId)),
		buildCreateEpicsUpsertEpicToolSchema(),
		...CREATE_EPICS_STEP_2_SHARED_TOOL_IDS_AFTER_UPSERT_EPIC.map((toolId) => resolveCreateEpicsSharedToolSpec(toolId)),
	]
}
