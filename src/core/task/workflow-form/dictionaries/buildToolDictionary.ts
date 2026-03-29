import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { build_review_diff_output_variants } from "@/core/prompts/system-prompt/tools/build_review_diff_output"
import {
	PHASE_1_SYSTEM_DICTIONARY_KEYS,
	type WorkflowFormSystemDictionaryKey,
	workflowFormSystemDictionary,
} from "./systemDictionary"

const TOOL_HEADING = "## build_review_diff_output"

function getBuildReviewDiffOutputSpec(): ClineToolSpec {
	const tool = build_review_diff_output_variants.find((candidate) => candidate.name === "build_review_diff_output")
	if (!tool) {
		throw new Error("build_review_diff_output schema is not available")
	}

	return tool
}

function getParameterDescription(parameterName: string): string {
	const dictionary = workflowFormSystemDictionary

	switch (parameterName) {
		case "source":
			return `${dictionary.source.label}. ${dictionary.source.medium} Supported variants: \`commit\`, \`commit_range\`, \`ref_diff\`, and \`worktree_head_scoped\`.`
		case "scoped_paths":
			return `${dictionary.scoped_paths.label}. ${dictionary.scoped_paths.medium} Required when the source is \`worktree_head_scoped\`.`
		case "context_lines":
			return `${dictionary.context_lines.label}. ${dictionary.context_lines.medium} Defaults to 3 when omitted.`
		default:
			return "No dictionary description is available for this parameter."
	}
}

function getVariantReferenceLine(key: WorkflowFormSystemDictionaryKey): string {
	const entry = workflowFormSystemDictionary[key]
	return `- \`${key}\`: ${entry.label}. ${entry.medium}`
}

export const TOOL_DICTIONARY_TERM_KEYS = PHASE_1_SYSTEM_DICTIONARY_KEYS
export const WORKFLOW_FORM_TOOL_DICTIONARY_HEADING = TOOL_HEADING

export function buildToolDictionaryMarkdown(): string {
	const tool = getBuildReviewDiffOutputSpec()
	const parameters = tool.parameters ?? []

	const lines = [
		"# Workflow UI Surface Tool Dictionary",
		"",
		"Generated from `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`.",
		"",
		TOOL_HEADING,
		"",
		`${workflowFormSystemDictionary.artifact.label}. ${workflowFormSystemDictionary.artifact.medium}`,
		"",
		`${workflowFormSystemDictionary.source.label}. ${workflowFormSystemDictionary.source.medium}`,
		"",
		"### Supported Source Variants",
		"",
		getVariantReferenceLine("commit"),
		getVariantReferenceLine("commit_range"),
		getVariantReferenceLine("ref_diff"),
		getVariantReferenceLine("worktree_head_scoped"),
		"",
		"### Parameters",
		"",
	]

	for (const parameter of parameters) {
		const parameterType = parameter.type ?? "string"
		const requiredStatus = parameter.required ? "required" : "optional"
		lines.push(`- \`${parameter.name}\` (${requiredStatus}, ${parameterType}): ${getParameterDescription(parameter.name)}`)
	}

	lines.push("")
	lines.push("### Term Reference")
	lines.push("")

	for (const key of TOOL_DICTIONARY_TERM_KEYS) {
		lines.push(getVariantReferenceLine(key))
	}

	return `${lines.join("\n").trimEnd()}\n`
}
