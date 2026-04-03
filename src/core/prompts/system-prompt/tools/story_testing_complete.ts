import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.STORY_TESTING_COMPLETE

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "story_testing_complete",
	description:
		"Mark the workflow-owned story file at {story_path} ready for review by setting Status: review. Resolve the story path from workflow state.",
	parameters: [],
}

export const story_testing_complete_variants = [generic]
