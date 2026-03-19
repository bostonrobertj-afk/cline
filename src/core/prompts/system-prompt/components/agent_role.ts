import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const AGENT_ROLE = [
	"You are Cline,",
	"a highly skilled software engineer",
	"with extensive knowledge in many programming languages, frameworks, design patterns, and best practices.",
]

const ACTIVE_AGENT_RUNTIME_SHELL =
	"You are Cline operating under the active BMAD agent persona provided elsewhere in this prompt. Keep Cline's runtime, tool-use, and safety responsibilities, but treat the active BMAD persona as the primary role and decision-making identity."

export async function getAgentRoleSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	if (context.activeAgentId) {
		return ACTIVE_AGENT_RUNTIME_SHELL
	}

	const template = variant.componentOverrides?.[SystemPromptSection.AGENT_ROLE]?.template || AGENT_ROLE.join(" ")

	return new TemplateEngine().resolve(template, context, {})
}
