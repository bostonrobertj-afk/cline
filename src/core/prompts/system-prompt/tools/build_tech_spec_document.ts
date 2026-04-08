import { shouldExposeBuildTechSpecDocument } from "@/shared/build-tech-spec-document"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "build_tech_spec_document",
	description:
		"Build the canonical quick-spec Step 2 scaffold at {implementation_artifacts}/tech-spec-wip.md from workflow-owned placeholder state. Resolve {title} from workflow state, derive {slug}, preserve the full tech-spec template structure, and persist the resolved artifact path as {output_file}. There are no human-supplied parameters.",
	contextRequirements: (context) =>
		shouldExposeBuildTechSpecDocument({
			workflowName: context.activePlaceholderWorkflowName,
			stepNumber: context.activePlaceholderWorkflowStepNumber,
		}),
	parameters: [],
}

export const build_tech_spec_document_variants = [generic]
