import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"
import { AGENT_FEEDBACK_PARAMETER } from "../types"

const id = ClineDefaultTool.ATTEMPT

const generic: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id,
	name: "attempt_completion",
	description: `Once you can confirm that the task is complete, use this tool to present the final result of your work to the user. Optionally you may provide a CLI command to showcase the result of your work. On success, this tool displays your message to the user, returns \`[Message displayed.]\`, and ends your current turn. If the user responds afterward, that reply arrives on the following turn as normal human-authored input, which you can use to continue or revise the work. Example: result="Implemented the fix and verified it with tests."
IMPORTANT NOTE: This tool CANNOT be used until you've confirmed from the user that any previous tool uses were successful. Failure to do so will result in code corruption and system failure. Before using this tool, you must ask yourself in <thinking></thinking> tags if you've confirmed from the user that any previous tool uses were successful. If not, then DO NOT use this tool.`,
	parameters: [
		{
			name: "result",
			required: true,
			instruction: "The result of the tool use. This should be a clear, specific description of the result.",
			usage: "Your final result description here",
		},
		{
			name: "command",
			required: false,
			instruction:
				"A CLI command to execute to show a live demo of the result to the user. For example, use `open index.html` to display a created html website, or `open localhost:3000` to display a locally running development server. But DO NOT use commands like `echo` or `cat` that merely print text. This command should be valid for the current operating system. Ensure the command is properly formatted and does not contain any harmful instructions",
			usage: "Your command here (optional)",
		},
		AGENT_FEEDBACK_PARAMETER,
		// Different than the vanilla ASK_PROGRESS_PARAMETER
		{
			name: "task_progress",
			required: false,
			instruction: "Markdown checklist as a top-level parameter on a tool call. Not a standalone tool.",
			usage: "Checklist here (required if you used task_progress in previous tool uses)",
			dependencies: [ClineDefaultTool.TODO],
			contextRequirements: (context) => context.activeDeterministicPlaceholderWorkflowEnabled !== true,
			description:
				"If you were using task_progress to update the task progress, you must include the completed list in the result as well.",
		},
	],
}

const GPT_5: ClineToolSpec = {
	variant: ModelFamily.GPT_5,
	id,
	name: "attempt_completion",
	description: `Once you can confirm that the task is complete, use this tool to present the final result of your work to the user. Optionally you may provide a CLI command to showcase the result of your work. On success, this tool displays your message to the user, returns \`[Message displayed.]\`, and ends your current turn. If the user responds afterward, that reply arrives on the following turn as normal human-authored input, which you can use to continue or revise the work. Example: result="Implemented the fix and verified it with tests."
IMPORTANT NOTE: This tool CANNOT be used until you've confirmed from the user that any previous tool uses were successful and all tasks have been completed in full. Failure to do so will result in code corruption and system failure. Before using this tool, you must ask yourself in <thinking></thinking> tags if you've confirmed from the user that any previous tool uses were successful and all goals defined by the user have been completed. If not, then DO NOT use this tool.`,
	parameters: [
		{
			name: "result",
			required: true,
			instruction: "The result of the tool use. This should be a clear, specific description of the result.",
			usage: "Your final result description here",
		},
		{
			name: "command",
			required: false,
			instruction:
				"A CLI command to execute to show a live demo of the result to the user. For example, use `open index.html` to display a created html website, or `open localhost:3000` to display a locally running development server. But DO NOT use commands like `echo` or `cat` that merely print text. This command should be valid for the current operating system. Ensure the command is properly formatted and does not contain any harmful instructions",
			usage: "Your command here (optional)",
		},
		AGENT_FEEDBACK_PARAMETER,
		// Different than the vanilla ASK_PROGRESS_PARAMETER
		{
			name: "task_progress",
			required: false,
			instruction:
				"A checklist showing task progress after this tool use is completed. (See 'Updating Task Progress' section for more details)",
			usage: "Checklist here (required if you used task_progress in previous tool uses)",
			dependencies: [ClineDefaultTool.TODO],
			contextRequirements: (context) => context.activeDeterministicPlaceholderWorkflowEnabled !== true,
			description:
				"If you were using task_progress to update the task progress, you must include the completed list in the result as well.",
		},
	],
}

const NATIVE_NEXT_GEN: ClineToolSpec = {
	variant: ModelFamily.NATIVE_NEXT_GEN,
	id,
	name: "attempt_completion",
	description:
		"Once you've completed the user's task, use this tool to present the final result to the user, including a brief and very short (1-2 paragraph) summary of the task and what was done to resolve it. On success, this tool displays your message to the user, returns `[Message displayed.]`, and ends your current turn. Any later user reply arrives on the following turn as normal human-authored input. Example: result=\"Implemented the fix and verified it with tests.\" You should only call this tool when you have completed all necessary work for the user's request.",
	parameters: [
		{
			name: "result",
			required: true,
			instruction: "A clear, brief and very short (1-2 paragraph) summary of the final result of the task.",
		},
		{
			name: "command",
			required: false,
			instruction:
				"An actionable terminal command that is non-verbose that allows user to review the result of your work. For example, use `start localhost:3000` to start a locally running development server. Commands like `echo` or `cat` that merely print text or open a file are not allowed. Ensure the command is properly formatted for user's OS and does not contain any harmful instructions",
		},
		AGENT_FEEDBACK_PARAMETER,
		{
			name: "task_progress",
			required: false,
			dependencies: [ClineDefaultTool.TODO],
			contextRequirements: (context) => context.activeDeterministicPlaceholderWorkflowEnabled !== true,
			instruction:
				"A checklist showing task progress with the latest status of each subtasks included previously, if any. If you are calling attempt completion, and all items in this list have been completed, they must be marked as completed in this response.",
		},
	],
}

const NATIVE_GPT_5: ClineToolSpec = {
	...NATIVE_NEXT_GEN,
	variant: ModelFamily.NATIVE_GPT_5,
}

export const attempt_completion_variants = [generic, GPT_5, NATIVE_NEXT_GEN, NATIVE_GPT_5]
