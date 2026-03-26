import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const getActVsPlanModeTemplateText = `ACT MODE V.S. PLAN MODE

In each user message, the environment_details will specify the current mode. There are two modes:

## What is PLAN MODE?

- Plan Mode is for planning out work before implementation
- Ask to switch to Act Mode after presenting a plan and gaining user alignment`

export async function getActVsPlanModeSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	if (context.useMinimalGptPrompt === true) {
		return new TemplateEngine().resolve(
			`Active Mode in environment_details`,

			context,
			{},
		)
	}

	const template = variant.componentOverrides?.[SystemPromptSection.ACT_VS_PLAN]?.template || getActVsPlanModeTemplateText

	return new TemplateEngine().resolve(template, context, {})
}
