import { ModelFamily } from "@/shared/prompts"
import { shouldExposeWorkflowProgressRequest } from "@/shared/workflow-progress-request"
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

const UPDATING_TASK_PROGRESS_WORKFLOW_PROGRESS_REQUEST = `UPDATING TASK PROGRESS

The user has triggered a workflow with a prebuilt checklist.
- Detailed instructions are automatically sent when a checklist item first becomes the active step.
- When the active step's "Done Signal" is true, use \`workflow_progress_request\`.
- Do not include \`task_progress\` on \`workflow_progress_request\`; the runtime-owned \`Yes\` branch completes the next checklist step before the next model request is built.
- If the user selects \`No\`, continue the conversation on the next turn without advancing the workflow.`

const UPDATING_TASK_PROGRESS_PLACEHOLDER_WORKFLOW = `UPDATING TASK PROGRESS

The user has triggered a workflow with a prebuilt checklist.
- Detailed instructions are automatically sent when a checklist item first becomes the active step.
- DO inform the user when the Done Signal for the current step is true using send_user_message, and include \`task_progress\` as a parameter on that tool call to complete the step.
- When the active step's "Done Signal" is true, use \`send_user_message\` tool call to briefly tell the user what step you are completing, and include \`task_progress\` with \`__COMPLETE_NEXT_STEP__\`. Use it only once in that assistant turn.`

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

	if (
		shouldExposeWorkflowProgressRequest({
			workflowName: context.activePlaceholderWorkflowName,
			stepNumber: context.activePlaceholderWorkflowStepNumber,
			yoloModeToggled: context.yoloModeToggled,
		})
	) {
		return UPDATING_TASK_PROGRESS_WORKFLOW_PROGRESS_REQUEST
	}

	if (context.activeDeterministicPlaceholderWorkflowEnabled === true) {
		return undefined
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
