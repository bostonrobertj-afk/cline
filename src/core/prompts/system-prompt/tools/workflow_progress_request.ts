import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "workflow_progress_request",
	description:
		"Ask the user to confirm whether the current workflow step is ready to advance. The system will display the exact approval prompt and process the response.",
	parameters: [],
}

export const workflow_progress_request_variants = [generic]
