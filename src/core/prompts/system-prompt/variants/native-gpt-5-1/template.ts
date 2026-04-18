import { SystemPromptSection } from "../../templates/placeholders"

/**
 * Base template for GPT-5 variant with structured sections
 */
export const BASE = `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}

{{${SystemPromptSection.TOOL_USE}}}

====

{{${SystemPromptSection.ACT_VS_PLAN}}}

====

{{${SystemPromptSection.CAPABILITIES}}}

====

{{${SystemPromptSection.SKILLS}}}

====

{{${SystemPromptSection.FEEDBACK}}}

====

{{${SystemPromptSection.RULES}}}

====

{{${SystemPromptSection.SYSTEM_INFO}}}

====

{{${SystemPromptSection.OBJECTIVE}}}

====

{{${SystemPromptSection.WORKFLOW_INPUT}}}

====

{{${SystemPromptSection.USER_INSTRUCTIONS}}}`

export const GPT_5_1_TEMPLATE_OVERRIDES = {
	BASE,
} as const
