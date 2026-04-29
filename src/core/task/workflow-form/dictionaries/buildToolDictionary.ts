import type { BackendWorkflowToolContract } from "@/core/task/tools/backendWorkflowToolContractTypes"
import { ClineDefaultTool } from "@/shared/tools"
import { resolveWorkflowFormToolContract } from "../schema"
import {
	PHASE_1_SYSTEM_DICTIONARY_KEYS,
	type WorkflowFormSystemDictionaryKey,
	workflowFormSystemDictionary,
} from "./systemDictionary"

export interface WorkflowFormToolDictionaryContractConfig {
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

function buildToolDictionaryEntryLines(
	config: WorkflowFormToolDictionaryContractConfig,
	tool: BackendWorkflowToolContract,
): string[] {
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

export function buildToolDictionaryMarkdownFromConfig(config: WorkflowFormToolDictionaryContractConfig): string {
	const tool = resolveWorkflowFormToolContract(config.toolName)
	const lines = [
		"# Workflow UI Surface Tool Dictionary",
		"",
		"Generated from `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`.",
		"",
		...buildToolDictionaryEntryLines(config, tool),
	]

	return `${lines.join("\n").trimEnd()}\n`
}

export function buildRuntimeToolDictionaryMarkdownFromConfig(config: WorkflowFormToolDictionaryContractConfig): string {
	return `${buildToolDictionaryEntryLines(config, resolveWorkflowFormToolContract(config.toolName)).join("\n").trimEnd()}\n`
}
