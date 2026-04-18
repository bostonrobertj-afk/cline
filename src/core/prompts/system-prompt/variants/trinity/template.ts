import { SystemPromptSection } from "../../templates/placeholders"

export const baseTemplate = `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}

{{${SystemPromptSection.TOOL_USE}}}

====

{{${SystemPromptSection.MCP}}}

====

{{${SystemPromptSection.EDITING_FILES}}}

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
