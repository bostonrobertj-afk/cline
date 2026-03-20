import type { PromptVariant, SystemPromptContext } from "../types"

/**
 * Generate the skills section for the system prompt.
 */
export async function getSkillsSection(_variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined> {
	const skills = context.skills
	if (!skills || skills.length === 0) return undefined

	if (context.useMinimalGptPrompt === true && context.isPromptRefreshTurn !== true) {
		const skillNames = skills.map((skill) => `\`${skill.name}\``).join(", ")

		if (context.activeAgentId) {
			return `SKILLS

Allowed skills for active agent \`${context.activeAgentId}\`: ${skillNames}`
		}

		return `SKILLS

Installed skills available on this turn: ${skillNames}`
	}

	const skillsList = skills.map((skill) => `  - "${skill.name}": ${skill.description}`).join("\n")

	if (context.activeAgentId) {
		return `SKILLS

The following skills are the only workflow-backed skills allowed while the active BMAD agent persona is set.

Allowed skills for active agent \`${context.activeAgentId}\`:
${skillsList}

Use only these skills while this agent mode remains active. Do not select skills outside this list.`
	}

	return `SKILLS

The following skills provide specialized instructions for specific tasks. When a user's request matches a skill description, use the use_skill tool to load and activate the skill.

Available skills:
${skillsList}

To use a skill:
1. Match the user's request to a skill based on its description
2. Call use_skill with the skill_name parameter set to the exact skill name
3. Follow the instructions returned by the tool`
}
