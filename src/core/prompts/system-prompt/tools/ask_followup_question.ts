import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const generic: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.ASK,
	name: "ask_followup_question",
	description:
		"Ask the user a concise question when clarification or a direct answer is needed. On success, this tool displays the question to the user, returns `[Message displayed.]`, and ends your current turn. The user's answer arrives on the following turn as normal human-authored input rather than same-turn tool output.",
	contextRequirements: (context) => !context.yoloModeToggled,
	parameters: [
		{
			name: "question",
			required: true,
			instruction:
				"The question to ask the user. This should be a clear, specific question that addresses the information you need.",
			usage: "Your question here",
		},
		{
			name: "options",
			required: false,
			instruction:
				"An array of 2-5 options for the user to choose from. Each option should be a string describing a possible answer. You may not always need to provide options, but it may be helpful in many cases where it can save the user from having to type out a response manually. IMPORTANT: NEVER include an option to toggle to Act mode, as this would be something you need to direct the user to do manually themselves if needed.",
			usage: 'Array of options here (optional), e.g. ["Option 1", "Option 2", "Option 3"]',
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_NEXT_GEN: ClineToolSpec = {
	variant: ModelFamily.NATIVE_NEXT_GEN,
	id: ClineDefaultTool.ASK,
	name: "ask_followup_question",
	description:
		"Ask the user a concise question when clarification or a direct answer is needed. On success, this tool displays the question to the user, returns `[Message displayed.]`, and ends your current turn. The user's answer arrives on the following turn as normal human-authored input rather than same-turn tool output.",
	contextRequirements: (context) => !context.yoloModeToggled,
	parameters: [
		{
			name: "question",
			required: true,
			instruction: 'The single question to ask the user. E.g. "How can I help you?"',
		},
		{
			name: "options",
			required: true,
			instruction:
				'An array of 2-5 options (e.x: "["Option 1", "Option 2", "Option 3"]") for the user to choose from. Each option should be a string describing a possible answer to the single question. You may not always need to provide options, but it may be helpful in many cases where it can save the user from having to type out a response manually. IMPORTANT: NEVER include an option to toggle to Act mode, as this would be something you need to direct the user to do manually themselves if needed.',
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_GPT_5: ClineToolSpec = {
	...NATIVE_NEXT_GEN,
	variant: ModelFamily.NATIVE_GPT_5,
}

export const ask_followup_question_variants = [generic, NATIVE_GPT_5, NATIVE_NEXT_GEN]
