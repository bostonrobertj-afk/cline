import { ModelFamily } from "@/shared/prompts"
import { shouldExposeSelectTargetEpic } from "@/shared/select-target-epic"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.SELECT_TARGET_EPIC

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "select_target_epic",
	description:
		"Show the runtime-owned epic picker for pi-planning Step 2. Resolve {epics_document} from workflow state, extract canonical epic headings from the epics document, ask the exact runtime-owned followup question, and persist the clicked label as {target_epic}. There are no human-supplied parameters.",
	contextRequirements: (context) =>
		shouldExposeSelectTargetEpic({
			workflowName: context.activePlaceholderWorkflowName,
			stepNumber: context.activePlaceholderWorkflowStepNumber,
			yoloModeToggled: context.yoloModeToggled,
		}),
	parameters: [],
}

export const select_target_epic_variants = [generic]
