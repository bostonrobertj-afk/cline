import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.STORY_TASK_COMPLETE

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "story_task_complete",
	description:
		"Mark the addressed story task or subtask complete in the workflow-owned story file at {story_path}. Resolve the story path from workflow state.",
	parameters: [
		{
			name: "storyTaskId",
			required: true,
			instruction: "The 1-based top-level task ordinal copied from the injected current task block.",
		},
		{
			name: "storySubtaskId",
			required: false,
			instruction:
				"The optional 1-based subtask ordinal under that parent task, copied from the injected current task block.",
		},
	],
}

export const story_task_complete_variants = [generic]
