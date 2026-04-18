import { SystemPromptSection } from "../templates/placeholders"
import { getActVsPlanModeSection } from "./act_vs_plan_mode"
import { getCapabilitiesSection } from "./capabilities"
import { getContinuationTurnSection } from "./continuation_turn"
import { getEditingFilesSection } from "./editing_files"
import { getFeedbackSection } from "./feedback"
import { getMcp } from "./mcp"
import { getObjectiveSection } from "./objective"
import { getRulesSection } from "./rules"
import { getSkillsSection } from "./skills"
import { getSystemInfo } from "./system_info"
import { getToolUseSection } from "./tool_use"
import { getUserInstructions } from "./user_instructions"
import { getWorkflowInputSection } from "./workflow_input"
import { getWorkflowSystemInstructionsSection } from "./workflow_system_instructions"

/**
 * Registers all tool variants with the ClineToolSet provider.
 * This function should be called once during application initialization
 * to make all tools available for use.
 */
export function getSystemPromptComponents() {
	return [
		{
			id: SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS,
			fn: getWorkflowSystemInstructionsSection,
		},
		{ id: SystemPromptSection.CONTINUATION_TURN, fn: getContinuationTurnSection },
		{ id: SystemPromptSection.SYSTEM_INFO, fn: getSystemInfo },
		{ id: SystemPromptSection.MCP, fn: getMcp },
		{
			id: SystemPromptSection.USER_INSTRUCTIONS,
			fn: getUserInstructions,
		},
		{ id: SystemPromptSection.TOOL_USE, fn: getToolUseSection },
		{
			id: SystemPromptSection.EDITING_FILES,
			fn: getEditingFilesSection,
		},
		{
			id: SystemPromptSection.CAPABILITIES,
			fn: getCapabilitiesSection,
		},
		{ id: SystemPromptSection.SKILLS, fn: getSkillsSection },
		{ id: SystemPromptSection.RULES, fn: getRulesSection },
		{ id: SystemPromptSection.OBJECTIVE, fn: getObjectiveSection },
		{
			id: SystemPromptSection.ACT_VS_PLAN,
			fn: getActVsPlanModeSection,
		},
		{
			id: SystemPromptSection.FEEDBACK,
			fn: getFeedbackSection,
		},
		{ id: SystemPromptSection.WORKFLOW_INPUT, fn: getWorkflowInputSection },
	]
}
