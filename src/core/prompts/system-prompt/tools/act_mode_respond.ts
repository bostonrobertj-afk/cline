import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

/**
 * ## act_mode_respond
Description: Send a brief ACT MODE preamble or progress update to the user. On success, the message is displayed, \`[Message displayed.]\` is returned, and your current turn ends. The next turn begins only after the human user responds. This tool is only available in ACT MODE for OpenAI native models. The environment_details will specify the current mode; if it is not ACT_MODE then you should not use this tool.
Use this tool when you want to:
- Explain what you're about to do before executing tools
- Provide progress updates during long-running tasks
- Clarify your approach or reasoning
- Keep the user informed of your progress
Parameters:
- response: (required) The message to provide to the user. This should explain what you're about to do, your current progress, or your reasoning. (You MUST use the response parameter, do not simply place the response text directly within <act_mode_respond> tags.)
Usage:
<act_mode_respond>
<response>Your message here</response>
</act_mode_respond>
 */

const id = ClineDefaultTool.ACT_MODE

const NATIVE_GPT_5: ClineToolSpec = {
	variant: ModelFamily.NATIVE_GPT_5,
	id,
	name: "act_mode_respond",
	description: `Send a brief ACT MODE preamble or progress update to the user. On success, the message is displayed, returns \`[Message displayed.]\`, and ends your current turn. Use it only when you intentionally want to pause and wait for the user's next reply. This tool is only available in ACT MODE and may not be called immediately after a previous act_mode_respond call.`,
	parameters: [
		{
			name: "response",
			required: true,
			instruction: `The message to provide to the user. This should explain what you're about to do, your current progress, or your reasoning. The response should be brief and conversational in tone, aiming to keep the user informed without overwhelming them with details.`,
			usage: "Your message here",
		},
	],
}

const NATIVE_NEXT_GEN: ClineToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.NATIVE_NEXT_GEN,
}

const GEMINI_3: ClineToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.GEMINI_3,
}

export const act_mode_respond_variants = [NATIVE_GPT_5, NATIVE_NEXT_GEN, GEMINI_3]
