import { TemplateEngine } from "../../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../../types"

export const TOOL_USE_GUIDELINES_TEMPLATE_TEXT = `# Tool Use Guidelines

1. In <thinking> tags, assess what information you already have and what information you need to proceed with the task.
2. Choose the most appropriate tool based on the task and the tool descriptions provided. Assess if you need additional information to proceed, and which of the available tools would be most effective for gathering this information. For example using the list_files tool is more effective than running a command like \`ls\` in the terminal. It's critical that you think about each available tool and use the one that best fits the current step in the task.
3. If multiple actions are needed, batch tool calls whenever they are not dependent on one another's output. 
5. After non-response tool uses, the system will return the result of that tool use. This result will provide you with the necessary information to continue your task or make further decisions. This response may include:
  - Information about whether the tool succeeded or failed, along with any reasons for failure.
  - Linter errors that may have arisen due to the changes you made, which you'll need to address.
  - New terminal output in reaction to the changes, which you may need to consider or act upon.
  - Any other relevant feedback or information related to the tool use.
6. Governed user-facing response tools behave differently: on success they display the message to the user, return \`[Message displayed.]\`, and end your current turn. The next turn begins only after the human user replies with normal human-authored input.
7. ALWAYS wait for the appropriate result before proceeding. Never assume the success of a tool use without explicit confirmation of its result.

It is crucial to proceed step-by-step, waiting for the appropriate result after each tool use before moving forward with the task. This approach allows you to:
1. Confirm the success of each step before proceeding.
2. Address any issues or errors that arise immediately.
3. Adapt your approach based on new information or unexpected results.
4. Ensure that each action builds correctly on the previous ones.

By waiting for and carefully considering the result after each tool use, you can react accordingly and make informed decisions about how to proceed with the task. This iterative process helps ensure the overall success and accuracy of your work.`

export async function getToolUseGuidelinesSection(_variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template =
		context.useMinimalGptPrompt === true
			? `# Tool Use Guidelines

1. Pick the smallest tool that moves the task forward.
2. Verify important results before completing the task.
3. Ask a follow-up question only when required input cannot be inferred.`
			: TOOL_USE_GUIDELINES_TEMPLATE_TEXT

	return new TemplateEngine().resolve(template, context, {})
}
