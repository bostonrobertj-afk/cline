import { SystemPromptSection } from "../../templates/placeholders"

export const baseTemplate = `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}

## {{${SystemPromptSection.TOOL_USE}}}

## {{${SystemPromptSection.RULES}}}

## {{${SystemPromptSection.ACT_VS_PLAN}}}

## {{${SystemPromptSection.CAPABILITIES}}}

## {{${SystemPromptSection.SKILLS}}}

## {{${SystemPromptSection.EDITING_FILES}}}

## {{${SystemPromptSection.TODO}}}

## {{${SystemPromptSection.MCP}}}

## {{${SystemPromptSection.SYSTEM_INFO}}}

## {{${SystemPromptSection.OBJECTIVE}}}

## {{${SystemPromptSection.WORKFLOW_INPUT}}}

## {{${SystemPromptSection.USER_INSTRUCTIONS}}}`
