// Import all tool variants
import { ClineToolSet } from "../registry/ClineToolSet"
import { access_mcp_resource_variants } from "./access_mcp_resource"
import { act_mode_respond_variants } from "./act_mode_respond"
import { apply_patch_variants } from "./apply_patch"
import { ask_followup_question_variants } from "./ask_followup_question"
import { attempt_completion_variants } from "./attempt_completion"
import { browser_action_variants } from "./browser_action"
import { build_epic_delivery_spec_variants } from "./build_epic_delivery_spec"
import { build_epics_document_variants } from "./build_epics_document"
import { build_review_diff_output_variants } from "./build_review_diff_output"
import { build_review_input_variants } from "./build_review_input"
import { build_story_document_variants } from "./build_story_document"
import { build_tech_spec_document_variants } from "./build_tech_spec_document"
import { complete_workflow_item_variants } from "./complete_workflow_item"
import { execute_command_variants } from "./execute_command"
import { focus_chain_variants } from "./focus_chain"
import { generate_explanation_variants } from "./generate_explanation"
import { generate_plan_output_variants } from "./generate_plan_output"
import { list_code_definition_names_variants } from "./list_code_definition_names"
import { list_files_variants } from "./list_files"
import { load_mcp_documentation_variants } from "./load_mcp_documentation"
import { new_task_variants } from "./new_task"
import { read_file_variants } from "./read_file"
import { read_file_range_variants } from "./read_file_range"
import { replace_in_file_variants } from "./replace_in_file"
import { search_files_variants } from "./search_files"
import { select_target_epic_variants } from "./select_target_epic"
import { send_user_message_variants } from "./send_user_message"
import { set_workflow_placeholders_variants } from "./set_workflow_placeholders"
import { story_notes_update_variants } from "./story_notes_update"
import { story_task_complete_variants } from "./story_task_complete"
import { story_task_reminder_variants } from "./story_task_reminder"
import { story_testing_complete_variants } from "./story_testing_complete"
import { subagent_variants } from "./subagent"
import { use_mcp_tool_variants } from "./use_mcp_tool"
import { use_skill_variants } from "./use_skill"
import { web_fetch_variants } from "./web_fetch"
import { web_search_variants } from "./web_search"
import { workflow_progress_request_variants } from "./workflow_progress_request"
import { write_to_file_variants } from "./write_to_file"

/**
 * Registers all tool variants with the ClineToolSet provider.
 * This function must be called at prompt registry
 * to allow all tool sets be available at build time.
 */
export function registerClineToolSets(): void {
	// Collect all variants from all tools
	const allToolVariants = [
		...access_mcp_resource_variants,
		...act_mode_respond_variants,
		...ask_followup_question_variants,
		...attempt_completion_variants,
		...browser_action_variants,
		...build_review_diff_output_variants,
		...build_review_input_variants,
		...build_epics_document_variants,
		...build_epic_delivery_spec_variants,
		...build_story_document_variants,
		...build_tech_spec_document_variants,
		...complete_workflow_item_variants,
		...execute_command_variants,
		...focus_chain_variants,
		...generate_explanation_variants,
		...list_code_definition_names_variants,
		...list_files_variants,
		...load_mcp_documentation_variants,
		...new_task_variants,
		...generate_plan_output_variants,
		...read_file_variants,
		...read_file_range_variants,
		...replace_in_file_variants,
		...search_files_variants,
		...select_target_epic_variants,
		...send_user_message_variants,
		...workflow_progress_request_variants,
		...set_workflow_placeholders_variants,
		...story_notes_update_variants,
		...story_task_complete_variants,
		...story_task_reminder_variants,
		...story_testing_complete_variants,
		...subagent_variants,
		...use_mcp_tool_variants,
		...use_skill_variants,
		...web_fetch_variants,
		...web_search_variants,
		...write_to_file_variants,
		...apply_patch_variants,
	]

	// Register each variant
	allToolVariants.forEach((v) => {
		ClineToolSet.register(v)
	})
}
