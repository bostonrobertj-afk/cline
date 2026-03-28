import { ModelFamily } from "@/shared/prompts"
import { PromptVariant, SystemPromptContext, SystemPromptSection, TemplateEngine } from ".."

const UPDATING_TASK_PROGRESS = `UPDATING TASK PROGRESS

Use \`task_progress\` only as a checklist parameter on the next tool call, not a standalone tool.

- Use \`task_progress\` to create a task list when switching out of PLAN MODE.
- Keep items brief and milestone-based.
- To create the list, pass a full Markdown checklist as the \`task_progress\` parameter.
- Use \`__COMPLETE_NEXT_STEP__\` as the \`task_progress\` value to complete the next incomplete step.`

const UPDATING_TASK_PROGRESS_NATIVE_NEXT_GEN = `UPDATING TASK PROGRESS

Use \`task_progress\` only as a checklist parameter on the next tool call, not a standalone tool.

- Use \`task_progress\` to create a task list when switching out of PLAN MODE.
- Keep items brief and milestone-based.
- To create the list, pass a full Markdown checklist as the \`task_progress\` parameter.
- Use \`__COMPLETE_NEXT_STEP__\` as the \`task_progress\` value to complete the next incomplete step.`

const UPDATING_TASK_PROGRESS_NATIVE_GPT5 = `UPDATING TASK PROGRESS

Use \`task_progress\` only as a checklist parameter on the next tool call, not a standalone tool.

- Use \`task_progress\` to create a task list when switching out of PLAN MODE.
- Keep items brief and milestone-based.
- To create the list, pass a full Markdown checklist as the \`task_progress\` parameter.
- Use \`__COMPLETE_NEXT_STEP__\` as the \`task_progress\` value to complete the next incomplete step.`

export const PLACEHOLDER_WORKFLOW_DONE_SIGNAL_REMINDER =
	'When the active step\'s "Done Signal" is true, use the next relevant `send_user_message` tool call to briefly tell the user what step you are completing, and include `task_progress` with `__COMPLETE_NEXT_STEP__`. Use it only once in that assistant turn.'

const UPDATING_TASK_PROGRESS_PLACEHOLDER_WORKFLOW = `UPDATING TASK PROGRESS

The user has triggered a workflow with a prebuilt checklist.
- Instructions are automatically sent for the first incomplete item on the checklist each turn.
- Do not include \`task_progress\` on a tool call until the active step's "Done Signal" is true.
- ${PLACEHOLDER_WORKFLOW_DONE_SIGNAL_REMINDER}`

export async function getUpdatingTaskProgress(variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined> {
	if (!context.focusChainSettings?.enabled) {
		return undefined
	}

	if (context.managedWorkflowActive) {
		return `UPDATING TASK PROGRESS

The current checklist was built for you by the user at the beginning of the conversation.

- The checklist shows you tasks which you must complete, then mark as done using the complete_workflow_item tool.
- The system automatically shows you extra details for the 1st incomplete task if any were provided by the user.
- task_progress is rendered based on the user's provided steps and the steps you've marked as complete.`
	}

	if (context.activeWorkflowSupportsPlaceholders) {
		return UPDATING_TASK_PROGRESS_PLACEHOLDER_WORKFLOW
	}

	// Check for component override first
	if (variant.componentOverrides?.[SystemPromptSection.TASK_PROGRESS]?.template) {
		const template = variant.componentOverrides[SystemPromptSection.TASK_PROGRESS].template
		return new TemplateEngine().resolve(template, context, {})
	}

	// Select template based on model family
	let template = UPDATING_TASK_PROGRESS
	if (variant.id === ModelFamily.NATIVE_NEXT_GEN) {
		template = UPDATING_TASK_PROGRESS_NATIVE_NEXT_GEN
	}
	if (variant.id === ModelFamily.NATIVE_GPT_5) {
		template = UPDATING_TASK_PROGRESS_NATIVE_GPT5
	}

	return new TemplateEngine().resolve(template, context, {})
}
