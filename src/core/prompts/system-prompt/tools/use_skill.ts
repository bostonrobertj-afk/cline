import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.USE_SKILL

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "use_skill",
	description:
		"Load and activate a skill or managed workflow by name. Use this tool when the current task requires one of the available skills shown in the SKILLS section of your system prompt. If a parent active-agent prompt says workflow activation must happen through a subagent, follow that instruction and call use_skill from the subagent instead of the current thread. After activation, follow the returned or injected instructions directly and do not call use_skill again unless a later step explicitly requires a different workflow.",
	contextRequirements: (context) =>
		context.activeAgentId === undefined && context.skills !== undefined && context.skills.length > 0,
	parameters: [
		{
			name: "skill_name",
			required: true,
			instruction: "The name of the skill to activate (must match exactly one of the available skill names)",
		},
	],
}

export const use_skill_variants = [generic]
