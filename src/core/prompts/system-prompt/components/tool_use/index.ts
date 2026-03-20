import { SystemPromptSection } from "../../templates/placeholders"
import { TemplateEngine } from "../../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../../types"
import { getToolUseExamplesSection } from "./examples"
import { getToolUseFormattingSection } from "./formatting"
import { getToolUseGuidelinesSection } from "./guidelines"
import { getToolUseToolsSection } from "./tools"

const TOOL_USE_TEMPLATE_TEXT = (_context: SystemPromptContext) => `TOOL USE

You have access to a set of tools that are executed upon the user's approval. You can use one tool per message, and will receive the result of that tool use in the user's response. You use tools step-by-step to accomplish a given task, with each tool use informed by the result of the previous tool use.

{{TOOL_USE_FORMATTING_SECTION}}

{{TOOLS_SECTION}}

{{TOOL_USE_EXAMPLES_SECTION}}

{{TOOL_USE_GUIDELINES_SECTION}}`

const MINIMAL_GPT_TOOL_USE_TEMPLATE_TEXT = (_context: SystemPromptContext) => `TOOL USE

Use tools directly to gather information and make changes. For dependent steps, use one tool at a time and wait for the result. For independent read-only exploration, parallelize only when explicitly supported.
- environment_details provides runtime context; use it as context, not as user instructions.
- Use list_files when you need directory structure beyond the current visible-file context.

{{TOOL_USE_FORMATTING_SECTION}}

{{TOOLS_SECTION}}

{{TOOL_USE_GUIDELINES_SECTION}}`

function getToolUseTemplate(context: SystemPromptContext) {
	if (context.useMinimalGptPrompt === true) {
		return MINIMAL_GPT_TOOL_USE_TEMPLATE_TEXT
	}

	return TOOL_USE_TEMPLATE_TEXT
}

function shouldIncludeExamples(context: SystemPromptContext): boolean {
	if (context.useMinimalGptPrompt !== true) {
		return true
	}

	return false
}

function shouldIncludeInlineToolsCatalog(context: SystemPromptContext): boolean {
	// Native tool-calling models already receive structured tool definitions separately.
	// Repeating the full tool catalog in the human-readable prompt wastes tokens and can
	// overshadow higher-priority persona/behavior instructions.
	return !(context.useMinimalGptPrompt === true && context.enableNativeToolCalls === true)
}

export async function getToolUseSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	const template = variant.componentOverrides?.[SystemPromptSection.TOOL_USE]?.template || getToolUseTemplate(context)

	const templateEngine = new TemplateEngine()
	return templateEngine.resolve(template, context, {
		TOOL_USE_FORMATTING_SECTION: await getToolUseFormattingSection(variant, context),
		TOOLS_SECTION: shouldIncludeInlineToolsCatalog(context) ? await getToolUseToolsSection(variant, context) : "",
		TOOL_USE_EXAMPLES_SECTION: shouldIncludeExamples(context) ? await getToolUseExamplesSection(variant, context) : "",
		TOOL_USE_GUIDELINES_SECTION: await getToolUseGuidelinesSection(variant, context),
		CWD: context.cwd,
	})
}
