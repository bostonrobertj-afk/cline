import { shouldExposeBuildStoryDocument } from "@/shared/build-story-document"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.BUILD_STORY_DOCUMENT

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "build_story_document",
	description:
		"Build the canonical create-story Step 2 scaffold at {output_folder}/implementation-artifacts/story<epic>.<story>.md from workflow-owned placeholder state. Resolve {epic_delivery_spec}, {story_number}, and {story_template} from workflow state, preserve the full story template structure, and persist the resolved artifact path as {story_doc}. There are no human-supplied parameters.",
	contextRequirements: (context) =>
		shouldExposeBuildStoryDocument({
			workflowName: context.activePlaceholderWorkflowName,
			stepNumber: context.activePlaceholderWorkflowStepNumber,
		}),
	parameters: [],
}

export const build_story_document_variants = [generic]
