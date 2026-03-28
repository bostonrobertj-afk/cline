import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "build_review_diff_output",
	description:
		"Build and replace the stable review diff artifact at {diff_output} from an explicit Git-backed source. Use this for code-review workflow Step 3 when the diff source is a supported commit, commit range, ref diff, or HEAD-scoped worktree diff. Do not use set_workflow_placeholders for diff_output; it is stable in .cline/workflow-config.yaml.",
	parameters: [
		{
			name: "source",
			required: true,
			type: "object",
			instruction:
				'Required source object. Supported shape: {"type":"commit","commit":"<ref>"} | {"type":"commit_range","base":"<ref>","head":"<ref>"} | {"type":"ref_diff","base":"<ref>","head":"<ref>"} | {"type":"worktree_head_scoped"}.',
		},
		{
			name: "scoped_paths",
			required: false,
			type: "array",
			instruction:
				'Optional array of repository-relative paths to scope the diff. Required for {"type":"worktree_head_scoped"}. Optional for the other source types.',
			items: { type: "string" },
		},
		{
			name: "context_lines",
			required: false,
			type: "integer",
			instruction: "Optional unified diff context line count. Defaults to 3.",
		},
	],
}

export const build_review_diff_output_variants = [generic]
