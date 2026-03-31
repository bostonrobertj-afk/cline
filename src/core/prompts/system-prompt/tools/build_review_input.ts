import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.BUILD_REVIEW_INPUT

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "build_review_input",
	description:
		"Build and replace the stable review-input artifact at {review_input} from a story file plus the workflow-owned diff artifact at {diff_output}. The human must only provide story_path.",
	parameters: [
		{
			name: "story_path",
			required: true,
			type: "string",
			instruction: "Required path to the story markdown file that is being reviewed.",
		},
	],
}

export const build_review_input_variants = [generic]
