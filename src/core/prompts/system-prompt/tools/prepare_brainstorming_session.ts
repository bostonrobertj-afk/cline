import { shouldExposePrepareBrainstormingSession } from "@/shared/prepare-brainstorming-session"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.PREPARE_BRAINSTORMING_SESSION

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "prepare_brainstorming_session",
	description:
		"Show the runtime-owned brainstorming Step 2 session-preparation flow. Resolve {output_folder} from workflow state, inspect {output_folder}/brainstorming/, continue the newest session, start a new session from the canonical template, or launch the structured session picker, then persist the final absolute path as {output_file}. There are no human-supplied parameters.",
	contextRequirements: (context) =>
		shouldExposePrepareBrainstormingSession({
			workflowName: context.activePlaceholderWorkflowName,
			stepNumber: context.activePlaceholderWorkflowStepNumber,
			yoloModeToggled: context.yoloModeToggled,
		}),
	parameters: [],
}

export const prepare_brainstorming_session_variants = [generic]
