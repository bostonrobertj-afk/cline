import { PromptBuilder } from "../../registry/PromptBuilder"
import { TemplateEngine } from "../../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../../types"
import { MULTI_ROOT_HINT } from "../../constants"

export async function getToolUseToolsSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	// Build the tools section
	const toolSections: string[] = ["# Tools"]

	// Get the enabled tool templates for this model family
	const toolsTemplates = await PromptBuilder.getToolsPrompts(variant, context)

	toolSections.push(...toolsTemplates)
	const template = toolSections.join("\n\n")

	// Define multi-root hint based on feature flag
	const multiRootHint = context.isMultiRootEnabled ? MULTI_ROOT_HINT : ""
	return new TemplateEngine().resolve(template, context, {
		BROWSER_VIEWPORT_WIDTH: context.browserSettings?.viewport?.width || 0,
		BROWSER_VIEWPORT_HEIGHT: context.browserSettings?.viewport?.height || 0,
		CWD: context.cwd,
		MULTI_ROOT_HINT: multiRootHint,
	})
}
