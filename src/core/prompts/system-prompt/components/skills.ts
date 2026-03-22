import type { PromptVariant, SystemPromptContext } from "../types"

/**
 * Generate the skills section for the system prompt.
 */
export async function getSkillsSection(_variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined> {
	const skills = (context.skills ?? []).filter((skill) => (context.activeAgentId ? true : !skill.name.startsWith("bmad-")))
	if (!skills || skills.length === 0) return undefined

	if (context.useMinimalGptPrompt === true) {
		const skillNames = skills.map((skill) => `\`${skill.name}\``).join(", ")

		if (context.activeAgentId) {
			return `SKILLS

Allowed workflow skills for the active BMAD agent: ${skillNames}

If you need to run one of these workflows, do not activate it in the current thread.
Spawn a dedicated subagent, tell that subagent which workflow to run, and instruct it to call \`use_skill\` with the exact skill name.`
		}

		return `SKILLS

Installed skills available on this turn: ${skillNames}`
	}

	if (context.activeAgentId) {
		const skillsList = skills.map((skill) => `  - "${skill.name}": ${skill.description}`).join("\n")

		return `SKILLS

Allowed workflow skills for the active BMAD agent:
${skillsList}

When this active BMAD agent needs one of the workflows above, do not activate it in the current thread. Starting a workflow in the current thread can change or replace the current persona context.

Instead:
1. Spawn a dedicated subagent for that workflow run
2. Tell the subagent exactly which workflow to run
3. Instruct the subagent to call use_skill with the exact skill name
4. Give the subagent the specific input context and expected output format for that workflow
5. Have the subagent report back, then continue the parent workflow in the current thread`
	}

	const skillsList = skills.map((skill) => `  - "${skill.name}": ${skill.description}`).join("\n")

	return `SKILLS

The following skills provide specialized instructions for specific tasks. When a user's request matches a skill description, use the use_skill tool to load and activate the skill.

Available skills:
${skillsList}

To use a skill:
1. Match the user's request to a skill based on its description
2. Call use_skill with the skill_name parameter set to the exact skill name
3. Follow the instructions returned by the tool`
}
