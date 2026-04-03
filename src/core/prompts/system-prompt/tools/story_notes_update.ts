import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.STORY_NOTES_UPDATE

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "story_notes_update",
	description:
		"Append one new entry to ## Completion Notes List or ## File List in the workflow-owned story file at {story_path}. Resolve the story path from workflow state.",
	parameters: [
		{
			name: "section",
			required: true,
			instruction: 'The exact target section name; Allowed values: "Completion Notes List" and "File List".',
			enum: ["Completion Notes List", "File List"],
		},
		{
			name: "entry",
			required: true,
			instruction: "One new entry to append verbatim under the selected section heading.",
		},
	],
}

export const story_notes_update_variants = [generic]
