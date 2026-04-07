import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { ClineDefaultTool } from "@/shared/tools"
import { resolveWorkflowFormToolSpec } from "../schema"
import {
	PHASE_1_SYSTEM_DICTIONARY_KEYS,
	type WorkflowFormSystemDictionaryKey,
	workflowFormSystemDictionary,
} from "./systemDictionary"

export interface WorkflowFormToolDictionaryConfig {
	toolName: ClineDefaultTool
	heading: string
	runtimeTitle: string
	overviewLines: string[]
	parameterDescriptions: Record<string, string>
	termKeys?: readonly WorkflowFormSystemDictionaryKey[]
}

function getVariantReferenceLine(key: WorkflowFormSystemDictionaryKey): string {
	const entry = workflowFormSystemDictionary[key]
	return `- \`${key}\`: ${entry.label}. ${entry.medium}`
}

function buildToolDictionaryEntryLines(config: WorkflowFormToolDictionaryConfig, tool: ClineToolSpec): string[] {
	const parameters = tool.parameters ?? []
	const resolvedTermKeys = config.termKeys ?? PHASE_1_SYSTEM_DICTIONARY_KEYS
	const lines = [
		config.heading,
		"",
		...config.overviewLines,
		...(config.overviewLines.length > 0 ? [""] : []),
		"### Parameters",
		"",
	]

	for (const parameter of parameters) {
		const parameterType = parameter.type ?? "string"
		const requiredStatus = parameter.required ? "required" : "optional"
		lines.push(
			`- \`${parameter.name}\` (${requiredStatus}, ${parameterType}): ${config.parameterDescriptions[parameter.name] ?? "No dictionary description is available for this parameter."}`,
		)
	}

	if (resolvedTermKeys.length > 0) {
		lines.push("")
		lines.push("### Term Reference")
		lines.push("")

		for (const key of resolvedTermKeys) {
			lines.push(getVariantReferenceLine(key))
		}
	}

	return lines
}

export const TOOL_DICTIONARY_TERM_KEYS = PHASE_1_SYSTEM_DICTIONARY_KEYS

export function isWorkflowFormSystemDictionaryKey(key: string): key is WorkflowFormSystemDictionaryKey {
	return key in workflowFormSystemDictionary
}

export const buildReviewDiffOutputToolDictionaryConfig: WorkflowFormToolDictionaryConfig = {
	toolName: ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT,
	heading: "## build_review_diff_output",
	runtimeTitle: "Diff Source Reference",
	overviewLines: [
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
	],
	parameterDescriptions: {
		source: `${workflowFormSystemDictionary.source.label}. ${workflowFormSystemDictionary.source.medium} Supported variants: \`commit\`, \`commit_range\`, \`ref_diff\`, and \`worktree_head_scoped\`.`,
		scoped_paths: `${workflowFormSystemDictionary.scoped_paths.label}. ${workflowFormSystemDictionary.scoped_paths.medium} Required when the source is \`worktree_head_scoped\`.`,
		context_lines: `${workflowFormSystemDictionary.context_lines.label}. ${workflowFormSystemDictionary.context_lines.medium} Defaults to 3 when omitted.`,
	},
	termKeys: TOOL_DICTIONARY_TERM_KEYS,
}
export const buildReviewInputToolDictionaryConfig: WorkflowFormToolDictionaryConfig = {
	toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
	heading: "## build_review_input",
	runtimeTitle: "Review Input Reference",
	overviewLines: [
		"Review Input Artifact. Build and replace the stable review-input artifact at {review_input}.",
		"",
		"Workflow-owned Story File. The active workflow must already provide {story_path}; the form does not recollect it from the human.",
		"",
		"Workflow-owned Diff Artifact. The stable diff artifact at {diff_output} is resolved automatically and is not recollected from the human.",
	],
	parameterDescriptions: {},
	termKeys: [],
}
export const WORKFLOW_FORM_TOOL_DICTIONARY_HEADING = buildReviewDiffOutputToolDictionaryConfig.heading
export const WORKFLOW_FORM_RUNTIME_TOOL_REFERENCE_TITLE = buildReviewDiffOutputToolDictionaryConfig.runtimeTitle

export function buildWorkflowStartRuntimeToolDictionary(args: { fieldKeys: readonly string[] }) {
	const termKeys = args.fieldKeys.filter(isWorkflowFormSystemDictionaryKey)
	const config: WorkflowFormToolDictionaryConfig = {
		toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
		heading: "## set_workflow_placeholders",
		runtimeTitle: "Workflow Placeholder Reference",
		overviewLines: ["Persist dynamic placeholder values for the active workflow before the first AI turn begins."],
		parameterDescriptions: {
			values: "Workflow placeholder key/value map. Submit only the placeholders the human actually supplied.",
		},
		termKeys,
	}

	return {
		title: config.runtimeTitle,
		markdown: buildRuntimeToolDictionaryMarkdownFromConfig(config),
	}
}

export function buildToolDictionaryMarkdownFromConfig(config: WorkflowFormToolDictionaryConfig): string {
	const tool = resolveWorkflowFormToolSpec(config.toolName)
	const lines = [
		"# Workflow UI Surface Tool Dictionary",
		"",
		"Generated from `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`.",
		"",
		...buildToolDictionaryEntryLines(config, tool),
	]

	return `${lines.join("\n").trimEnd()}\n`
}

export function buildRuntimeToolDictionaryMarkdownFromConfig(config: WorkflowFormToolDictionaryConfig): string {
	return `${buildToolDictionaryEntryLines(config, resolveWorkflowFormToolSpec(config.toolName)).join("\n").trimEnd()}\n`
}

export function buildToolDictionaryMarkdown(): string {
	return buildToolDictionaryMarkdownFromConfig(buildReviewDiffOutputToolDictionaryConfig)
}

export function buildRuntimeToolDictionaryMarkdown(): string {
	return buildRuntimeToolDictionaryMarkdownFromConfig(buildReviewDiffOutputToolDictionaryConfig)
}
