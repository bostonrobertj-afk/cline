import type { WorkflowFormDefinition, WorkflowFormFieldDefinition, WorkflowFormFieldOption } from "@shared/ExtensionMessage"
import { formatResponse } from "@/core/prompts/responses"
import {
	buildReviewDiffOutputToolDictionaryConfig,
	buildRuntimeToolDictionaryMarkdownFromConfig,
} from "@/core/task/workflow-form/dictionaries/buildToolDictionary"
import { workflowFormSystemDictionary } from "@/core/task/workflow-form/dictionaries/systemDictionary"
import { ClineDefaultTool } from "@/shared/tools"
import type { WorkflowFormResolverDefinition, WorkflowFormResolverId, WorkflowFormValues } from "./types"

export const CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID = "code_review_step_3_diff_source"
export const PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID =
	"placeholder_workflow_start_set_workflow_placeholders"

const SOURCE_TYPE_FIELD_KEY = "source.type"
const SOURCE_COMMIT_FIELD_KEY = "source.commit"
const SOURCE_BASE_FIELD_KEY = "source.base"
const SOURCE_HEAD_FIELD_KEY = "source.head"
const SCOPED_PATHS_FIELD_KEY = "scoped_paths"
const CONTEXT_LINES_FIELD_KEY = "context_lines"

function getStringValue(values: WorkflowFormValues, key: string): string | undefined {
	return values[key]?.stringValue?.trim()
}

function getStringArrayValue(values: WorkflowFormValues, key: string): string[] {
	const normalized = values[key]?.stringArrayValue ?? []
	return normalized.map((value: string) => value.trim()).filter(Boolean)
}

function getIntegerValue(values: WorkflowFormValues, key: string): number | undefined {
	const value = values[key]?.integerValue
	return Number.isInteger(value) ? value : undefined
}

function buildSourceTypeOptions(): WorkflowFormFieldOption[] {
	return [
		{
			value: "commit",
			label: workflowFormSystemDictionary.commit.label,
			description: workflowFormSystemDictionary.commit.medium,
		},
		{
			value: "commit_range",
			label: workflowFormSystemDictionary.commit_range.label,
			description: workflowFormSystemDictionary.commit_range.medium,
		},
		{
			value: "ref_diff",
			label: workflowFormSystemDictionary.ref_diff.label,
			description: workflowFormSystemDictionary.ref_diff.medium,
		},
		{
			value: "worktree_head_scoped",
			label: workflowFormSystemDictionary.worktree_head_scoped.label,
			description: workflowFormSystemDictionary.worktree_head_scoped.medium,
		},
	]
}

function buildSourceSelectionFieldDefinitions(): WorkflowFormFieldDefinition[] {
	return [
		{
			key: SOURCE_TYPE_FIELD_KEY,
			label: workflowFormSystemDictionary.source.label,
			help: workflowFormSystemDictionary.source.medium,
			control: "select",
			required: true,
			options: buildSourceTypeOptions(),
			visible: true,
		},
	]
}

function buildConcreteInputFieldDefinitions(values: WorkflowFormValues): WorkflowFormFieldDefinition[] {
	const sourceType = getStringValue(values, SOURCE_TYPE_FIELD_KEY)
	const showsCommitField = sourceType === "commit"
	const showsBaseAndHeadFields = sourceType === "commit_range" || sourceType === "ref_diff"
	const showsScopedPaths = Boolean(sourceType)
	const worktreeScoped = sourceType === "worktree_head_scoped"

	return [
		{
			key: SOURCE_COMMIT_FIELD_KEY,
			label: workflowFormSystemDictionary.commit.label,
			help: workflowFormSystemDictionary.commit.medium,
			control: "text",
			required: showsCommitField,
			placeholder: "abc1234",
			visible: showsCommitField,
		},
		{
			key: SOURCE_BASE_FIELD_KEY,
			label: workflowFormSystemDictionary.base.label,
			help: workflowFormSystemDictionary.base.medium,
			control: "text",
			required: showsBaseAndHeadFields,
			placeholder: "main",
			visible: showsBaseAndHeadFields,
		},
		{
			key: SOURCE_HEAD_FIELD_KEY,
			label: workflowFormSystemDictionary.head.label,
			help: workflowFormSystemDictionary.head.medium,
			control: "text",
			required: showsBaseAndHeadFields,
			placeholder: "HEAD",
			visible: showsBaseAndHeadFields,
		},
		{
			key: SCOPED_PATHS_FIELD_KEY,
			label: workflowFormSystemDictionary.scoped_paths.label,
			help: workflowFormSystemDictionary.scoped_paths.medium,
			control: "textarea",
			required: worktreeScoped,
			placeholder: "src/core/task/index.ts",
			visible: showsScopedPaths,
		},
		{
			key: CONTEXT_LINES_FIELD_KEY,
			label: workflowFormSystemDictionary.context_lines.label,
			help: workflowFormSystemDictionary.context_lines.medium,
			control: "number",
			required: false,
			placeholder: "3",
			visible: Boolean(sourceType) && !worktreeScoped,
		},
	]
}

const WORKFLOW_START_TOOL_DICTIONARY_CONFIG = {
	toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
	heading: "## set_workflow_placeholders",
	runtimeTitle: "Workflow Placeholder Reference",
	overviewLines: ["Persist dynamic placeholder values for the active workflow before the first AI turn begins."],
	parameterDescriptions: {
		values: "Workflow placeholder key/value map. Submit only the placeholders the human actually supplied.",
	},
	termKeys: [],
}

interface WorkflowStartFormOverride {
	title: string
	prompt: string
	labels: Record<string, string>
	help: Record<string, string>
}

const workflowStartFormOverrides: Record<string, WorkflowStartFormOverride> = {
	"review-adversarial-general.md": {
		title: "Adversarial Review Inputs",
		prompt: "Provide the review material needed to begin this workflow. Supply at least one review target. If you also have a supporting spec or story file, include it as `spec_file`.",
		labels: {
			review_input: "Review Input File",
			diff_output: "Review Diff File",
			spec_file: "Spec or Story File",
		},
		help: {
			review_input: "Path to an existing review-input markdown file for this review.",
			diff_output: "Path to an existing review-input diff file for this review.",
			spec_file: "Optional path to a story, spec, or requirements file that defines expected behavior.",
		},
	},
}

function humanizeWorkflowPlaceholderKey(key: string): string {
	return key
		.split("_")
		.filter(Boolean)
		.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
		.join(" ")
}

function buildWorkflowStartPlaceholderFieldDefinitions(args: {
	requiredFieldKeys: string[]
	optionalFieldKeys: string[]
	oneOfRequirement?: { id: string; fieldKeys: string[] }
	override?: WorkflowStartFormOverride
}): WorkflowFormFieldDefinition[] {
	const orderedKeys = [...args.requiredFieldKeys, ...args.optionalFieldKeys, ...(args.oneOfRequirement?.fieldKeys ?? [])]
	const requiredFieldKeySet = new Set(args.requiredFieldKeys)
	const oneOfFieldKeySet = new Set(args.oneOfRequirement?.fieldKeys ?? [])

	return orderedKeys.reduce<WorkflowFormFieldDefinition[]>((fields, key) => {
		if (fields.some((field) => field.key === key)) {
			return fields
		}

		fields.push({
			key,
			label: args.override?.labels[key] ?? humanizeWorkflowPlaceholderKey(key),
			help: args.override?.help[key] ?? humanizeWorkflowPlaceholderKey(key),
			control: "text",
			required: requiredFieldKeySet.has(key),
			oneOfGroupId: oneOfFieldKeySet.has(key) ? args.oneOfRequirement?.id : undefined,
			placeholder: "/absolute/path/to/file-or-artifact",
			visible: true,
		})

		return fields
	}, [])
}

function parseWorkflowFormJsonToolResult(text?: string): Record<string, unknown> | undefined {
	if (!text) {
		return undefined
	}

	try {
		const parsed = JSON.parse(text)
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : undefined
	} catch {
		return undefined
	}
}

function isWorkflowFormFailureText(text?: string): boolean {
	const trimmed = text?.trim()
	if (!trimmed) {
		return true
	}

	return (
		trimmed === formatResponse.toolDenied() ||
		trimmed.startsWith("The tool execution failed with the following error:") ||
		trimmed.startsWith("Error:")
	)
}

export const workflowFormRegistry: Record<string, WorkflowFormResolverDefinition> = {
	[CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID]: {
		id: CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID,
		toolName: ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT,
		buildDefinition(session): WorkflowFormDefinition {
			return {
				toolName: ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT,
				title: "Review Diff Artifact",
				toolDictionaryTitle: "Diff Source Reference",
				toolDictionaryMarkdown: buildRuntimeToolDictionaryMarkdownFromConfig(buildReviewDiffOutputToolDictionaryConfig),
				pages: {
					confirm: {
						prompt: "This workflow requires the following tool-produced artifact: `review-input.diff`.\n\nCan you provide the inputs required to produce `review-input.diff`?",
						options: ["Yes", "No"],
					},
					select_source: {
						prompt: "This workflow requires the tool-produced artifact `review-input.diff`.\n\nChoose which diff source you have so we can collect the right inputs.",
						fields: buildSourceSelectionFieldDefinitions(),
						submitLabel: "Next",
						cancelLabel: "Cancel",
					},
					collect_inputs: {
						prompt: "Provide the concrete inputs needed to produce `review-input.diff`.",
						fields: buildConcreteInputFieldDefinitions(session.values),
						submitLabel: "Submit",
						cancelLabel: "Cancel",
					},
					retry_error: {
						prompt: "The system could not produce `review-input.diff`. Update the inputs or retry the request.",
						fields: buildConcreteInputFieldDefinitions(session.values),
						submitLabel: "Submit",
						cancelLabel: "Cancel",
						retryLabel: "Start Over",
					},
				},
				successMessage: "The Step 3 diff artifact is ready.",
			}
		},
		buildToolExecutionFailureFallbackMessage() {
			return "The workflow form could not build the Step 3 diff artifact. Review the input and try again."
		},
		buildToolExecutionRequest(_session, values) {
			const sourceType = getStringValue(values, SOURCE_TYPE_FIELD_KEY)
			const scopedPaths = getStringArrayValue(values, SCOPED_PATHS_FIELD_KEY)
			const contextLines = getIntegerValue(values, CONTEXT_LINES_FIELD_KEY)
			let toolInput: Record<string, unknown>

			switch (sourceType) {
				case "commit":
					toolInput = {
						source: {
							type: "commit",
							commit: getStringValue(values, SOURCE_COMMIT_FIELD_KEY) ?? "",
						},
					}
					break
				case "commit_range":
					toolInput = {
						source: {
							type: "commit_range",
							base: getStringValue(values, SOURCE_BASE_FIELD_KEY) ?? "",
							head: getStringValue(values, SOURCE_HEAD_FIELD_KEY) ?? "",
						},
					}
					break
				case "ref_diff":
					toolInput = {
						source: {
							type: "ref_diff",
							base: getStringValue(values, SOURCE_BASE_FIELD_KEY) ?? "",
							head: getStringValue(values, SOURCE_HEAD_FIELD_KEY) ?? "",
						},
					}
					break
				case "worktree_head_scoped":
					toolInput = {
						source: {
							type: "worktree_head_scoped",
						},
						scoped_paths: scopedPaths,
					}
					break
				default:
					throw new Error(`Unsupported workflow form source type: ${sourceType ?? "undefined"}`)
			}

			if (sourceType !== "worktree_head_scoped" && scopedPaths.length > 0) {
				toolInput.scoped_paths = scopedPaths
			}

			if (contextLines !== undefined) {
				toolInput.context_lines = contextLines
			}

			const toolParams: Record<string, string> = {
				source: JSON.stringify(toolInput.source),
			}

			if (toolInput.scoped_paths !== undefined) {
				toolParams.scoped_paths = JSON.stringify(toolInput.scoped_paths)
			}

			if (toolInput.context_lines !== undefined) {
				toolParams.context_lines = String(toolInput.context_lines)
			}

			return {
				toolName: ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT,
				toolInput,
				toolParams,
			}
		},
		evaluateToolExecutionResult(session, args) {
			const parsed = parseWorkflowFormJsonToolResult(args.toolResultText)
			if (parsed?.persisted === true && parsed?.diff_available === true) {
				return { succeeded: true }
			}

			if (typeof parsed?.reason === "string") {
				return { succeeded: false, errorMessage: parsed.reason }
			}

			if (isWorkflowFormFailureText(args.toolResultText)) {
				return {
					succeeded: false,
					errorMessage: args.toolResultText?.trim() ?? this.buildToolExecutionFailureFallbackMessage(session),
				}
			}

			return {
				succeeded: false,
				errorMessage: this.buildToolExecutionFailureFallbackMessage(session),
			}
		},
	},
	[PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID]: {
		id: PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID,
		toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
		buildDefinition(session): WorkflowFormDefinition {
			const workflowName = session.context?.workflowName
			const workflowStartRequirements = session.context?.workflowStartRequirements
			if (!workflowName || !workflowStartRequirements) {
				throw new Error("Workflow start form definition requires workflowName and workflowStartRequirements.")
			}

			const override = workflowStartFormOverrides[workflowName]
			const fields = buildWorkflowStartPlaceholderFieldDefinitions({
				requiredFieldKeys: workflowStartRequirements.requiredFieldKeys,
				optionalFieldKeys: workflowStartRequirements.optionalFieldKeys,
				oneOfRequirement: workflowStartRequirements.oneOfRequirement,
				override,
			})
			const prompt =
				override?.prompt ?? "Provide any Step 1 workflow inputs you already have before the first AI turn begins."

			return {
				toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
				title: override?.title ?? "Workflow Start Inputs",
				toolDictionaryTitle: "Workflow Placeholder Reference",
				toolDictionaryMarkdown: buildRuntimeToolDictionaryMarkdownFromConfig(WORKFLOW_START_TOOL_DICTIONARY_CONFIG),
				pages: {
					collect_inputs: {
						prompt,
						fields,
						submitLabel: "Submit",
						cancelLabel: "Cancel",
					},
					retry_error: {
						prompt,
						fields,
						submitLabel: "Submit",
						cancelLabel: "Cancel",
						retryLabel: "Start Over",
					},
				},
				successMessage: "Workflow start inputs were stored.",
			}
		},
		buildToolExecutionFailureFallbackMessage() {
			return "The workflow form could not store the workflow start inputs. Review the values and try again."
		},
		buildToolExecutionRequest(session, values) {
			const fields = this.buildDefinition(session).pages.collect_inputs?.fields ?? []
			const filteredValues = fields.reduce<Record<string, string>>((acc, field) => {
				const value = values[field.key]?.stringValue?.trim()
				if (value) {
					acc[field.key] = value
				}

				return acc
			}, {})

			return {
				toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
				toolInput: { values: filteredValues },
				toolParams: { values: JSON.stringify(filteredValues) },
			}
		},
		evaluateToolExecutionResult(session, args) {
			if (isWorkflowFormFailureText(args.toolResultText)) {
				return {
					succeeded: false,
					errorMessage: args.toolResultText?.trim() ?? this.buildToolExecutionFailureFallbackMessage(session),
				}
			}

			return { succeeded: true }
		},
	},
}

export function getWorkflowFormResolverDefinition(resolverId: WorkflowFormResolverId): WorkflowFormResolverDefinition {
	const resolver = workflowFormRegistry[resolverId]
	if (!resolver) {
		throw new Error(`Unknown workflow form resolver: ${resolverId}`)
	}

	return resolver
}
