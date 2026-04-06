import { shouldExposeBuildEpicDeliverySpec } from "@/shared/build-epic-delivery-spec"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "build_epic_delivery_spec",
	description:
		"Build the canonical pi-planning Step 3 delivery spec at {output_folder}/implementation-artifacts/epic-<number>-delivery-spec.md from workflow-owned placeholder state. Resolve {epics_document} and {target_epic} from workflow state, preserve the full template structure, and persist the resolved artifact path as {epic_delivery_spec}. There are no human-supplied parameters.",
	contextRequirements: (context) =>
		shouldExposeBuildEpicDeliverySpec({
			workflowName: context.activePlaceholderWorkflowName,
			stepNumber: context.activePlaceholderWorkflowStepNumber,
		}),
	parameters: [],
}

export const build_epic_delivery_spec_variants = [generic]
