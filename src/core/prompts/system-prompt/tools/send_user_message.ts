import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

/**
 * ## send_user_message
Description: Send a direct user-visible message when other response tools are not the right fit. Use this for ordinary communication such as acknowledgements, short clarifications, brief reactions, and conversational steering that are not task completion, not a follow-up question, and not a plan presentation. This tool is available in both ACT MODE and PLAN MODE.
Parameters:
- message: (required) The message to provide to the user. Do not try to use tools in this parameter; this is simply a user-visible chat message. (You MUST use the message parameter, do not simply place the message text directly within <send_user_message> tags.)
Usage:
<send_user_message>
<message>Your message here</message>
</send_user_message>
 */

const id = ClineDefaultTool.SEND_USER_MESSAGE

const generic: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id,
	name: "send_user_message",
	description:
		"Send a direct user-visible message when other response tools are not appropriate or available. On success, this tool displays the message to the user, returns `[Message displayed.]`, and ends your current turn. Any later user reply arrives on the following turn as normal human-authored input.",
	parameters: [
		{
			name: "message",
			required: true,
			instruction:
				"The message to provide to the user. Do not try to use tools in this parameter; this is simply a user-visible chat message. (You MUST use the message parameter, do not simply place the message text directly within <send_user_message> tags.)",
			usage: "Your message here",
		},
	],
}

const NATIVE_GPT_5: ClineToolSpec = {
	variant: ModelFamily.NATIVE_GPT_5,
	id,
	name: "send_user_message",
	description:
		"Send a direct user-visible message when other response tools are not appropriate or available. On success, this tool displays the message to the user, returns `[Message displayed.]`, and ends your current turn. Any later user reply arrives on the following turn as normal human-authored input.",
	parameters: [
		{
			name: "message",
			required: true,
			instruction: "The direct message to show to the user.",
		},
	],
}

const NATIVE_GPT_5_1: ClineToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.NATIVE_GPT_5_1,
}

const NATIVE_NEXT_GEN: ClineToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.NATIVE_NEXT_GEN,
}

const GEMINI_3: ClineToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.GEMINI_3,
}

export const send_user_message_variants = [generic, NATIVE_GPT_5, NATIVE_GPT_5_1, NATIVE_NEXT_GEN, GEMINI_3]
