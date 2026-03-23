import { getBuiltinBmadAgentAllowlist } from "@/core/task/bmad-agent-mode"
import type { PromptVariant, SystemPromptContext } from "../types"

const builtinBmadAgentSkillNames = new Set(getBuiltinBmadAgentAllowlist().map((agent) => agent.id))

function isPromptVisibleSkillName(skillName: string): boolean {
	return !builtinBmadAgentSkillNames.has(skillName)
}

/**
 * Generate the skills section for the system prompt.
 */
export async function getSkillsSection(_variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined> {
	const skills = (context.skills ?? []).filter((skill) => (context.activeAgentId ? true : isPromptVisibleSkillName(skill.name)))
	if (!skills || skills.length === 0) return undefined

	if (context.useMinimalGptPrompt === true) {
		const skillNames = skills.map((skill) => `\`${skill.name}\``).join(", ")

		if (context.activeAgentId) {
			return `SKILLS

Allowed workflow skills for the active BMAD agent: ${skillNames}

If you need to run one of these workflows, do not activate it in the current thread.
Spawn a dedicated subagent and assign it the exact workflow skill in the prompt using a line like \`Skill: use_skill('workflow-skill-name')\`.
The subagent runtime will activate that assigned workflow before analysis begins.`
		}

		return `SKILLS

Installed skills and workflow activations available on this turn: ${skillNames}`
	}

	if (context.activeAgentId) {
		const skillsList = skills.map((skill) => `  - "${skill.name}": ${skill.description}`).join("\n")

		return `SKILLS

Allowed workflow skills for the active BMAD agent:
${skillsList}

When this active BMAD agent needs one of the workflows above, do not activate it in the current thread. Starting a workflow in the current thread can change or replace the current persona context.

Instead:
1. Spawn a dedicated subagent for that workflow run
2. Assign the exact workflow skill in the subagent prompt using a line like \`Skill: use_skill('workflow-skill-name')\`
3. Give the subagent the specific input context and expected output format for that workflow
4. Have the subagent report back, then continue the parent workflow in the current thread`
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
