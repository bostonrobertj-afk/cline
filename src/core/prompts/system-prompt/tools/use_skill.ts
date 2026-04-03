import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.USE_SKILL

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "use_skill",
	description:
		"Load and activate a skill, workflow, or managed workflow by name. Use this tool when the current task requires one of the available skills or workflow activations shown in the SKILLS section of your system prompt. After activation, follow the returned or injected workflow or skill instructions directly and do not call use_skill again unless a later step explicitly requires a different workflow or skill.",
	contextRequirements: (context) => context.skills !== undefined && context.skills.length > 0,
	parameters: [
		{
			name: "skill_name",
			required: true,
			instruction: "The name of the skill to activate (must match exactly one of the available skill names)",
		},
	],
}

export const use_skill_variants = [generic]
