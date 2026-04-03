import type { PromptVariant, SystemPromptContext } from "../types"

// Do not switch this gate back on unless a human user has given direct, clear authorization.
const SKILLS_PROMPT_SECTION_GATE: number = 2 // 1 = on, 2 = off

/**
 * Generate the skills section for the system prompt.
 */
export async function getSkillsSection(_variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined> {
	if (SKILLS_PROMPT_SECTION_GATE !== 1) {
		return undefined
	}

	const skills = context.skills ?? []
	if (!skills || skills.length === 0) return undefined

	if (context.useMinimalGptPrompt === true) {
		const skillNames = skills.map((skill) => `\`${skill.name}\``).join(", ")

		return `SKILLS

Installed skills and workflow activations available on this turn: ${skillNames}`
	}

	const skillsList = skills.map((skill) => `  - "${skill.name}": ${skill.description}`).join("\n")

	return `SKILLS

The following skills and workflow activations provide specialized instructions for specific tasks. When a user's request matches a skill or workflow description, use the use_skill tool to load and activate it.

Available skills and workflows:
${skillsList}

To use a skill or workflow:
1. Match the user's request to an entry based on its description
2. Call use_skill with the skill_name parameter set to the exact listed name
3. Follow the instructions returned by the tool`
}
