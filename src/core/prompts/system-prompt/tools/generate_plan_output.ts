import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

/**
 * ## generate_plan_output
Description: Respond to the user's inquiry in an effort to plan a solution to the user's task. This tool should ONLY be used when you have already explored the relevant files and are ready to present a concrete plan. DO NOT use this tool to announce what files you're going to read - just read them first. This tool is only available in PLAN MODE. The environment_details will specify the current mode; if it is not PLAN_MODE then you should not use this tool.
However, if while writing your response you realize you actually need to do more exploration before providing a complete plan, you can add the optional needs_more_exploration parameter to indicate this. This allows you to acknowledge that you should have done more exploration first, and signals that your next message will use exploration tools instead.
Parameters:
- response: (required) The response to provide to the user. Do not try to use tools in this parameter, this is simply a chat response. (You MUST use the response parameter, do not simply place the response text directly within <generate_plan_output> tags.)
- needs_more_exploration: (optional) Set to true if while formulating your response that you found you need to do more exploration with tools, for example reading files. (Remember, you can explore the project with tools like read_file in PLAN MODE without the user having to toggle to ACT MODE.) Defaults to false if not specified.
${focusChainSettings.enabled ? `- task_progress: (optional) A checklist showing task progress after this tool use is completed. (See 'Updating Task Progress' section for more details)` : "" }
Usage:
<generate_plan_output>
<response>Your response here</response>
<needs_more_exploration>true or false (optional, but you MUST set to true if in <response> you need to read files or use other exploration tools)</needs_more_exploration>
${focusChainSettings.enabled ? `<task_progress>
Checklist here (If you have presented the user with concrete steps or requirements, you can optionally include a todo list outlining these steps.)
</task_progress>` : "" }
</generate_plan_output>
 */

const id = ClineDefaultTool.PLAN_MODE

const generic: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id,
	name: "generate_plan_output",
	description: `Respond to the user's inquiry in an effort to plan a solution to the user's task. This tool should ONLY be used when you have already explored the relevant files and are ready to present a concrete plan. DO NOT use this tool to announce what files you're going to read - just read them first. This tool is only available in PLAN MODE. The environment_details will specify the current mode; if it is not PLAN_MODE then you should not use this tool.
If you are presenting a plan or other user-facing planning response, success displays the message to the user, returns \`[Message displayed.]\`, and ends your current turn. Any later user reply arrives on the following turn as normal human-authored input.
However, if while writing your response you realize you actually need to do more exploration before providing a complete plan, you can add the optional needs_more_exploration parameter to indicate this. That branch is internal control flow rather than a governed user-facing response, so it does not use the shared response-tool turn-ending contract.`,
	parameters: [
		{
			name: "response",
			required: true,
			instruction: `The response to provide to the user. Do not try to use tools in this parameter, this is simply a chat response. (You MUST use the response parameter, do not simply place the response text directly within <generate_plan_output> tags.)`,
			usage: "Your response here",
		},
		{
			name: "needs_more_exploration",
			required: false,
			instruction:
				"Set to true if while formulating your response that you found you need to do more exploration with tools, for example reading files. (Remember, you can explore the project with tools like read_file in PLAN MODE without the user having to toggle to ACT MODE.) Defaults to false if not specified.",
			usage: "true or false (optional, but you MUST set to true if in <response> you need to read files or use other exploration tools)",
			type: "boolean",
		},
		// Different than the vanilla TASK_PROGRESS_PARAMETER
		{
			name: "task_progress",
			required: false,
			instruction:
				" A checklist showing task progress after this tool use is completed. (See 'Updating Task Progress' section for more details)",
			usage: "Checklist here (If you have presented the user with concrete steps or requirements, you can optionally include a todo list outlining these steps.)",
			dependencies: [ClineDefaultTool.TODO],
		},
	],
}

const NATIVE_GPT_5: ClineToolSpec = {
	variant: ModelFamily.NATIVE_GPT_5,
	id,
	name: "generate_plan_output",
	description: `Respond to the user's inquiry in an effort to plan a solution to the user's task. This tool should ONLY be used when you have already explored the relevant files and are ready to present a concrete plan. DO NOT use this tool to announce what files you're going to read - just read them first. This tool is only available in PLAN MODE. The environment_details will specify the current mode; if it is not PLAN_MODE then you should not use this tool.
If you are presenting a plan or other user-facing planning response, success displays the message to the user, returns \`[Message displayed.]\`, and ends your current turn. Any later user reply arrives on the following turn as normal human-authored input.
However, if while writing your response you realize you actually need to do more exploration before providing a complete plan, you can add the optional needs_more_exploration parameter to indicate this. That branch is internal control flow rather than a governed user-facing response, so it does not use the shared response-tool turn-ending contract.`,
	parameters: [
		{
			name: "response",
			required: true,
			instruction: `The response to provide to the user.`,
		},
		{
			name: "task_progress",
			required: false,
			instruction: "Markdown checklist as a top-level parameter on a tool call. Not a standalone tool.",
		},
	],
}

const GEMINI_3: ClineToolSpec = {
	variant: ModelFamily.GEMINI_3,
	id,
	name: "generate_plan_output",
	description: `Respond with a plan that outlines a solution to the user's request. This tool should ONLY be used when you have already explored the relevant files and are ready to present a concrete plan. Only use this tool after you have explored relevant files and collected sufficient context to create a detailed, accurate plan. This tool is only available in PLAN MODE, as indicated by the environment_details.
If you are presenting a plan or other user-facing planning response, success displays the message to the user, returns \`[Message displayed.]\`, and ends your current turn. Any later user reply arrives on the following turn as normal human-authored input.
If it becomes apparent that additional exploration is required while the generate_plan_output response is being generated, the optional needs_more_exploration parameter can be toggled to enable further research. That branch is internal control flow rather than a governed user-facing response, so it does not use the shared response-tool turn-ending contract.`,
	parameters: [
		{
			name: "response",
			required: true,
			instruction: `A chat message response to the user.`,
			usage: "Your response here",
		},
		{
			name: "needs_more_exploration",
			required: false,
			instruction: `needs_more_exploration can be set to true if it is determined that further exploration with read_file/search tools is necessary to formulate a complete plan. This determination can be reached during the response generation process, but should not be acknowledged until this parameter is set to true if required.`,
			usage: "true or false (optional, but you MUST set to true if in <response> you need to read files or use other exploration tools)",
			type: "boolean",
		},
		{
			name: "task_progress",
			required: false,
			instruction:
				"A checklist showing task progress after this tool use is completed. If you are presenting a final implementation plan to the user with needs_more_exploration set to false, you should include a checklist of items to be completed during Act Mode when implementation is underway. (See 'Updating Task Progress' section for more details)",
			usage: "Checklist here (If you have presented the user with concrete steps or requirements, you can optionally include a todo list outlining these steps.)",
			dependencies: [ClineDefaultTool.TODO],
		},
	],
}

const NATIVE_NEXT_GEN: ClineToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.NATIVE_NEXT_GEN,
}

export const generate_plan_output_variants = [generic, NATIVE_GPT_5, NATIVE_NEXT_GEN, GEMINI_3]
