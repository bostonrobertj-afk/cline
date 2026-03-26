import { getResponseToolsSection } from "../../components/response_tools"
import { SystemPromptSection } from "../../templates/placeholders"
import type { SystemPromptContext } from "../../types"

/**
 * Base template for GPT-5 variant with structured sections
 */
export const BASE = `{{${SystemPromptSection.AGENT_ROLE}}}
{{${SystemPromptSection.TOOL_USE}}}
====
{{${SystemPromptSection.TASK_PROGRESS}}}
====
{{${SystemPromptSection.ACT_VS_PLAN}}}
====
{{${SystemPromptSection.SKILLS}}}
====
{{${SystemPromptSection.FEEDBACK}}}
====
{{${SystemPromptSection.RULES}}}
====
{{${SystemPromptSection.SYSTEM_INFO}}}
====
{{${SystemPromptSection.OBJECTIVE}}}
====
{{${SystemPromptSection.USER_INSTRUCTIONS}}}`

const TASK_PROGRESS = `UPDATING TASK PROGRESS

Use \`task_progress\` only as a checklist parameter on the next tool call, not a standalone tool.

- Use \`task_progress\` to create a task list when switching out of PLAN MODE.
- Keep items brief and milestone-based.
- To create the list, pass a full Markdown checklist as the \`task_progress\` parameter.
- Use \`__COMPLETE_NEXT_STEP__\` as the \`task_progress\` value to complete the next incomplete step.`

const RULES = (_context: SystemPromptContext) => `RULES

- Your current working directory is: {{CWD}} - this is where you will be using tools from.
- Do not use the ~ character or $HOME to refer to the home directory. Use absolute paths instead.
- MCP operations should be used one at a time, similar to other tool usage. Wait for confirmation of success before proceeding with additional operations.
- Before calling a tool, use the available runtime context and ensure required parameters are present or can be reasonably inferred.
- If a required tool parameter is missing, ask the user for input.`

const TOOL_USE = (_context: SystemPromptContext) => `TOOL USE

Use these tools in one response when they are not dependent on one another; if using tools dependent on one another do so sequentially.
- environment_details provides runtime context
- Use list_files when you need directory structure
- For native tool calls, treat the tool schema as the source of truth for canonical parameter names, required fields, and argument shape. Match the schema exactly.

${getResponseToolsSection(_context)}`

const OBJECTIVE = (context: SystemPromptContext) => `OBJECTIVE

Complete the user's task methodically.

1. Analyze the request, define clear goals, and order them logically.
2. Work through those goals step by step, using tools where helpful. You may use multiple tools in one response only for independent work.
3. Before using a tool, use the available context - including environment_details - to decide whether all required parameters are present or can be inferred. If a required value is missing, do not call the tool${context.yoloModeToggled !== true ? "; ask for it with ask_followup_question instead" : ""}. Do not ask for optional parameters unless needed.
4. When the task is complete, use attempt_completion to present the result. You may include a simple command to review the result when useful.
5. If the task is not actionable, use send_user_message to explain why or give a direct answer.`

const FEEDBACK = (_context: SystemPromptContext) => `FEEDBACK

When user is providing you with feedback on how you could improve, you can let the user know to report new issue using the '/reportbug' slash command.`

export const GPT_5_TEMPLATE_OVERRIDES = {
	BASE,
	TASK_PROGRESS,
	RULES,
	TOOL_USE,
	OBJECTIVE,
	FEEDBACK,
} as const
