import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.BUILD_REVIEW_INPUT

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "build_review_input",
	description:
		"Build and replace the stable review-input artifact at {review_input} from the workflow-owned story file at {story_path} plus the workflow-owned diff artifact at {diff_output}. Resolve all inputs from workflow state.",
	parameters: [],
}

export const build_review_input_variants = [generic]
