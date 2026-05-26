import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST

const generic: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id,
	name: "workflow_progress_request",
	description: "Ask the user to confirm whether the current workflow step is ready to advance.",
	parameters: [],
}

export const workflow_progress_request_variants = [generic]
