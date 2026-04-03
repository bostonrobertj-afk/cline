import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.STORY_TASK_REMINDER

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "story_task_reminder",
	description:
		"Resend the current first incomplete story task and its subtasks from the workflow-owned story file at {story_path}. Resolve the story path from workflow state.",
	parameters: [],
}

export const story_task_reminder_variants = [generic]
