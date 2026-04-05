import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import { shouldExposeWorkflowProgressRequest } from "@/shared/workflow-progress-request"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "workflow_progress_request",
	description:
		"Ask the user to confirm whether the active supported placeholder-workflow step is ready to advance. The runtime owns the exact Yes/No prompt and option labels. On success, this tool displays the runtime-owned prompt, returns `[Message displayed.]`, and ends your current turn. If the user selects `Yes`, the runtime completes the next placeholder-workflow step before the next model request is built. If the user selects `No`, the workflow does not advance and the user's reply arrives on the following turn as normal human-authored input.",
	contextRequirements: (context) =>
		shouldExposeWorkflowProgressRequest({
			workflowName: context.activePlaceholderWorkflowName,
			stepNumber: context.activePlaceholderWorkflowStepNumber,
			yoloModeToggled: context.yoloModeToggled,
		}),
	parameters: [],
}

export const workflow_progress_request_variants = [generic]
