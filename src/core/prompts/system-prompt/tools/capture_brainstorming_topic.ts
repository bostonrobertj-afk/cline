import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "capture_brainstorming_topic",
	description:
		"Capture the runtime-owned brainstorming Step 3 topic text. Resolve {output_file} from workflow state, replace only the body of the canonical ## Topic section with the submitted long-form topic/goals text, preserve the rest of the brainstorming template unchanged, and persist the updated artifact.",
	parameters: [
		{
			name: "topic",
			required: true,
			type: "string",
			description: "Long-form raw topic/goals text captured from the Step 3 workflow form.",
			instruction: "Provide the raw Step 3 topic/goals text exactly as collected from the workflow form.",
		},
	],
}

export const capture_brainstorming_topic_variants = [generic]
