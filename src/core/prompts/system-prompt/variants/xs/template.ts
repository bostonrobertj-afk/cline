import { SystemPromptSection } from "../../templates/placeholders"

export const baseTemplate = `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}

## {{${SystemPromptSection.RULES}}}

## {{${SystemPromptSection.ACT_VS_PLAN}}}

## {{${SystemPromptSection.CAPABILITIES}}}

## {{${SystemPromptSection.SKILLS}}}

## {{${SystemPromptSection.EDITING_FILES}}}

## {{${SystemPromptSection.TOOL_USE}}}

## {{${SystemPromptSection.OBJECTIVE}}}

## {{${SystemPromptSection.SYSTEM_INFO}}}

## {{${SystemPromptSection.WORKFLOW_INPUT}}}

## {{${SystemPromptSection.USER_INSTRUCTIONS}}}`
