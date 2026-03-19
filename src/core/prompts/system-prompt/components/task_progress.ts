import { ModelFamily } from "@/shared/prompts"
import { PromptVariant, SystemPromptContext, SystemPromptSection, TemplateEngine } from ".."

const UPDATING_TASK_PROGRESS = `UPDATING TASK PROGRESS

Use the task_progress tool parameter to track the task with a concise Markdown checklist.

- When switching from PLAN MODE to ACT MODE, create an initial checklist.
- Keep items high-level and milestone-based; avoid minor implementation details.
- Simple tasks can use very short checklists.
- When first creating the checklist, mark step 1 complete if the current tool call completed it.
- On each update, include the full current checklist and update any completed or changed steps.
- Use Markdown checkboxes: "- [ ]" and "- [x]".
- Pass task_progress as its own tool parameter, not inside another field.
- System-injected todo reminders are important context.`

const UPDATING_TASK_PROGRESS_NATIVE_NEXT_GEN = `UPDATING TASK PROGRESS

Use the task_progress tool parameter to track the task with a concise Markdown checklist.

- When switching from PLAN MODE to ACT MODE, create an initial checklist.
- Keep items high-level and milestone-based; avoid minor implementation details.
- Simple tasks can use very short checklists.
- When first creating the checklist, mark step 1 complete if the current tool call completed it.
- On each update, include the full current checklist and update any completed or changed steps.
- Use Markdown checkboxes: "- [ ]" and "- [x]".
- Pass task_progress as its own tool parameter, not inside another field.
- System-injected todo reminders are important context.`

const UPDATING_TASK_PROGRESS_NATIVE_GPT5 = `UPDATING TASK PROGRESS

Use the task_progress tool parameter to track the task with a concise Markdown checklist.

- When switching from PLAN MODE to ACT MODE, create an initial checklist.
- Keep items high-level and milestone-based; avoid minor implementation details.
- Simple tasks can use very short checklists.
- When first creating the checklist, mark step 1 complete if the current tool call completed it.
- On each update, include the full current checklist and update any completed or changed steps.
- Use Markdown checkboxes: "- [ ]" and "- [x]".
- Pass task_progress as its own tool parameter, not inside another field.
- System-injected todo reminders are important context.`

export async function getUpdatingTaskProgress(variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined> {
	if (!context.focusChainSettings?.enabled) {
		return undefined
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
