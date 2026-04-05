import type { WorkflowFormDefinition, WorkflowFormFieldDefinition, WorkflowFormFieldOption } from "@shared/ExtensionMessage"
import { formatResponse } from "@/core/prompts/responses"
import {
	buildReviewDiffOutputToolDictionaryConfig,
	buildReviewInputToolDictionaryConfig,
	buildRuntimeToolDictionaryMarkdownFromConfig,
} from "@/core/task/workflow-form/dictionaries/buildToolDictionary"
import {
	type WorkflowFormSystemDictionaryKey,
	workflowFormSystemDictionary,
} from "@/core/task/workflow-form/dictionaries/systemDictionary"
import { ClineDefaultTool } from "@/shared/tools"
import {
	deriveWorkflowFormControl,
	deriveWorkflowFormOptions,
	parseWorkflowFormRawValue,
	resolveWorkflowFormOneOfVariant,
	resolveWorkflowFormSchema,
	resolveWorkflowFormToolSpec,
	type WorkflowFormFieldSchemaBinding,
} from "./schema"
import type { WorkflowFormResolverDefinition, WorkflowFormResolverId, WorkflowFormValues } from "./types"

export const CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID = "code_review_step_3_diff_source"
export const CODE_REVIEW_STEP_3_REVIEW_INPUT_RESOLVER_ID = "code_review_step_3_review_input"
export const WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_RESOLVER_ID = "write_remediation_story_step_2_review_input"
export const PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID =
	"placeholder_workflow_start_set_workflow_placeholders"
const CODE_REVIEW_STEP_3_REVIEW_INPUT_DIFF_MISMATCH_MESSAGE =
	"diff_output does not identify recent changes to the story file. Proceeding with AI generation of review_input.md using the fallback Step 3 instructions."

const SOURCE_TYPE_FIELD_KEY = "source.type"
const SOURCE_COMMIT_FIELD_KEY = "source.commit"
const SOURCE_BASE_FIELD_KEY = "source.base"
const SOURCE_HEAD_FIELD_KEY = "source.head"
const SCOPED_PATHS_FIELD_KEY = "scoped_paths"
const CONTEXT_LINES_FIELD_KEY = "context_lines"

function getParsedFieldValue(fields: WorkflowFormFieldDefinition[], values: WorkflowFormValues, key: string): unknown {
	const field = fields.find((entry) => entry.key === key)
	return field ? parseWorkflowFormRawValue(values[key]?.rawValue, field.valueSchema) : undefined
}

function getCurrentCollectFields(
	session: Parameters<WorkflowFormResolverDefinition["buildDefinition"]>[0],
	buildDefinition: WorkflowFormResolverDefinition["buildDefinition"],
): WorkflowFormFieldDefinition[] {
	return buildDefinition(session).pages.collect_inputs?.fields ?? []
}

function buildSchemaBackedField(args: {
	toolName: ClineDefaultTool
	binding: WorkflowFormFieldSchemaBinding
	key: string
	label: string
	help: string
	required: boolean
	placeholder?: string
	visible?: boolean
	oneOfGroupId?: string
	options?: WorkflowFormFieldOption[]
}): WorkflowFormFieldDefinition {
	const valueSchema = resolveWorkflowFormSchema(args.toolName, args.binding)

	return {
		key: args.key,
		label: args.label,
		help: args.help,
		control: deriveWorkflowFormControl(valueSchema),
		valueSchema,
		required: args.required,
		oneOfGroupId: args.oneOfGroupId,
		placeholder: args.placeholder,
		options: args.options ?? deriveWorkflowFormOptions(valueSchema),
		visible: args.visible,
	}
}

function getSelectedSourceType(values: WorkflowFormValues): string | undefined {
	return values[SOURCE_TYPE_FIELD_KEY]?.rawValue?.trim()
}

function resolveSelectedSourceVariantSchema(sourceType: string | undefined) {
	const sourceSchema = resolveWorkflowFormSchema(ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT, {
		parameterName: "source",
	})
	return resolveWorkflowFormOneOfVariant(sourceSchema, "type", sourceType)
}

function getSelectedSourceVariantPropertyKeys(sourceType: string | undefined): string[] {
	const variant = resolveSelectedSourceVariantSchema(sourceType)
	return Object.keys(variant?.properties ?? {}).filter((key) => key !== "type")
}

function buildSourceSelectionFieldDefinitions(): WorkflowFormFieldDefinition[] {
	const options =
		deriveWorkflowFormOptions(
			resolveWorkflowFormSchema(ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT, {
				parameterName: "source",
				propertyPath: ["type"],
			}),
		)?.map((option) => {
			if (Object.hasOwn(workflowFormSystemDictionary, option.value)) {
				const entry = workflowFormSystemDictionary[option.value as WorkflowFormSystemDictionaryKey]
				return {
					value: option.value,
					label: entry.label,
					description: entry.medium,
				}
			}

			return option
		}) ?? []

	return [
		buildSchemaBackedField({
			toolName: ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT,
			binding: { parameterName: "source", propertyPath: ["type"] },
			key: SOURCE_TYPE_FIELD_KEY,
			label: workflowFormSystemDictionary.source.label,
			help: workflowFormSystemDictionary.source.medium,
			required: true,
			options,
			visible: true,
		}),
	]
}

function buildConcreteInputFieldDefinitions(values: WorkflowFormValues): WorkflowFormFieldDefinition[] {
	const sourceType = getSelectedSourceType(values)
	const worktreeScoped = sourceType === "worktree_head_scoped"
	const fields: WorkflowFormFieldDefinition[] = []

	for (const propertyKey of getSelectedSourceVariantPropertyKeys(sourceType)) {
		if (propertyKey === "commit") {
			fields.push(
				buildSchemaBackedField({
					toolName: ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT,
					binding: { parameterName: "source", propertyPath: ["commit"] },
					key: SOURCE_COMMIT_FIELD_KEY,
					label: workflowFormSystemDictionary.commit.label,
					help: workflowFormSystemDictionary.commit.medium,
					required: true,
					placeholder: "abc1234",
					visible: true,
				}),
			)
			continue
		}

		if (propertyKey === "base") {
			fields.push(
				buildSchemaBackedField({
					toolName: ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT,
					binding: { parameterName: "source", propertyPath: ["base"] },
					key: SOURCE_BASE_FIELD_KEY,
					label: workflowFormSystemDictionary.base.label,
					help: workflowFormSystemDictionary.base.medium,
					required: true,
					placeholder: "main",
					visible: true,
				}),
			)
			continue
		}

		fields.push(
			buildSchemaBackedField({
				toolName: ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT,
				binding: { parameterName: "source", propertyPath: ["head"] },
				key: SOURCE_HEAD_FIELD_KEY,
				label: workflowFormSystemDictionary.head.label,
				help: workflowFormSystemDictionary.head.medium,
				required: true,
				placeholder: "HEAD",
				visible: true,
			}),
		)
	}

	if (sourceType) {
		fields.push(
			buildSchemaBackedField({
				toolName: ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT,
				binding: { parameterName: "scoped_paths" },
				key: SCOPED_PATHS_FIELD_KEY,
				label: workflowFormSystemDictionary.scoped_paths.label,
				help: workflowFormSystemDictionary.scoped_paths.medium,
				required: worktreeScoped,
				placeholder: "src/core/task/index.ts",
				visible: true,
			}),
		)
	}

	if (sourceType && !worktreeScoped) {
		fields.push(
			buildSchemaBackedField({
				toolName: ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT,
				binding: { parameterName: "context_lines" },
				key: CONTEXT_LINES_FIELD_KEY,
				label: workflowFormSystemDictionary.context_lines.label,
				help: workflowFormSystemDictionary.context_lines.medium,
				required: false,
				placeholder: "3",
				visible: true,
			}),
		)
	}

	return fields
}

function buildSchemaDerivedPublicToolFieldDefinitions(args: {
	toolName: ClineDefaultTool
	labelOverrides?: Record<string, string>
	helpOverrides?: Record<string, string>
	placeholderOverrides?: Record<string, string>
}): WorkflowFormFieldDefinition[] {
	const tool = resolveWorkflowFormToolSpec(args.toolName)
	return (tool.parameters ?? []).map((parameter) =>
		buildSchemaBackedField({
			toolName: args.toolName,
			binding: { parameterName: parameter.name },
			key: parameter.name,
			label: args.labelOverrides?.[parameter.name] ?? humanizeWorkflowPlaceholderKey(parameter.name),
			help: args.helpOverrides?.[parameter.name] ?? parameter.description ?? humanizeWorkflowPlaceholderKey(parameter.name),
			required: parameter.required ?? false,
			placeholder: args.placeholderOverrides?.[parameter.name],
			visible: true,
		}),
	)
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
	placeholders?: Record<string, string>
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
	"create-epics.md": {
		title: "Inputs for This Workflow",
		prompt: "Provide the following to start the workflow:",
		labels: {
			architecture_document: "Architecture Document",
			prd: "PRD",
			mode: "Mode",
			ux_spec: "UX Spec",
			ui_spec: "UI Spec",
		},
		help: {
			architecture_document: "Provide the path to the architecture document.",
			prd: "Provide the path to the PRD.",
			mode: "Enter `new` to create a new epics document or `continue` to resume an existing one.",
			ux_spec: "Optional path to a UX specification document.",
			ui_spec: "Optional path to a UI specification document.",
		},
		placeholders: {
			architecture_document: "/absolute/path/to/architecture.md",
			prd: "/absolute/path/to/prd.md",
			mode: "new or continue",
			ux_spec: "/absolute/path/to/ux-spec.md",
			ui_spec: "/absolute/path/to/ui-spec.md",
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

		fields.push(
			buildSchemaBackedField({
				toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
				binding: { parameterName: "values", useAdditionalProperties: true },
				key,
				label: args.override?.labels[key] ?? humanizeWorkflowPlaceholderKey(key),
				help: args.override?.help[key] ?? humanizeWorkflowPlaceholderKey(key),
				required: requiredFieldKeySet.has(key),
				oneOfGroupId: oneOfFieldKeySet.has(key) ? args.oneOfRequirement?.id : undefined,
				placeholder: args.override?.placeholders?.[key] ?? "/absolute/path/to/file-or-artifact",
				visible: true,
			}),
		)

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
				successMessage: "The Step 2 diff artifact is ready.",
			}
		},
		buildToolExecutionFailureFallbackMessage() {
			return "The workflow form could not build the Step 2 diff artifact. Review the input and try again."
		},
		buildToolExecutionRequest(session, values) {
			const fields = getCurrentCollectFields({ ...session, values }, this.buildDefinition)
			const sourceType = parseWorkflowFormRawValue(
				values[SOURCE_TYPE_FIELD_KEY]?.rawValue,
				resolveWorkflowFormSchema(ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT, {
					parameterName: "source",
					propertyPath: ["type"],
				}),
			)
			const scopedPathsValue = getParsedFieldValue(fields, values, SCOPED_PATHS_FIELD_KEY)
			const contextLinesValue = getParsedFieldValue(fields, values, CONTEXT_LINES_FIELD_KEY)
			const scopedPaths = Array.isArray(scopedPathsValue) ? scopedPathsValue : []
			const contextLines = typeof contextLinesValue === "number" ? contextLinesValue : undefined
			const selectedSourceType = typeof sourceType === "string" ? sourceType : undefined
			const selectedSourceVariant = resolveSelectedSourceVariantSchema(selectedSourceType)
			if (!selectedSourceVariant) {
				throw new Error(`Unsupported workflow form source type: ${selectedSourceType ?? "undefined"}`)
			}
			const source: Record<string, unknown> = { type: selectedSourceType }
			for (const propertyKey of getSelectedSourceVariantPropertyKeys(selectedSourceType)) {
				const parsedValue = getParsedFieldValue(fields, values, `source.${propertyKey}`)
				if (typeof parsedValue === "string") {
					source[propertyKey] = parsedValue
				}
			}
			const toolInput: Record<string, unknown> = { source }

			if (selectedSourceType === "worktree_head_scoped") {
				toolInput.scoped_paths = scopedPaths
			}

			if (selectedSourceType !== "worktree_head_scoped" && scopedPaths.length > 0) {
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
	[CODE_REVIEW_STEP_3_REVIEW_INPUT_RESOLVER_ID]: {
		id: CODE_REVIEW_STEP_3_REVIEW_INPUT_RESOLVER_ID,
		toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
		defaultInitialPhase: "collect_inputs",
		buildDefinition(): WorkflowFormDefinition {
			return {
				toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
				title: "Review Input Artifact",
				toolDictionaryTitle: "Review Input Reference",
				toolDictionaryMarkdown: buildRuntimeToolDictionaryMarkdownFromConfig(buildReviewInputToolDictionaryConfig),
				presentation: {
					kind: "automatic_status",
					pendingLabel: "Preparing workflow documents",
					successLabel: "Workflow documents ready",
					failureLabel: "Automatic workflow preparation failed- falling back to manual LLM workflow preparation.",
				},
				pages: {
					collect_inputs: {
						prompt: "The system will now build `review-input.md` from the stored `story_path` and the workflow-owned `review-input.diff` artifact.",
						fields: [],
						submitLabel: "Submit",
						cancelLabel: "Cancel",
					},
					retry_error: {
						prompt: "The system could not produce `review-input.md` from the stored workflow inputs. Retry the request or return to the Step 3 fallback instructions.",
						fields: [],
						submitLabel: "Submit",
						cancelLabel: "Cancel",
						retryLabel: "Start Over",
					},
				},
				successMessage: "The Step 3 review-input artifact is ready.",
			}
		},
		buildToolExecutionFailureFallbackMessage() {
			return "The workflow form could not build the Step 3 review-input artifact from stored workflow inputs. The workflow will return to the Step 3 fallback instructions."
		},
		buildToolExecutionRequest(_session, _values) {
			return {
				toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
				toolInput: {},
				toolParams: {},
			}
		},
		evaluateToolExecutionResult(session, args) {
			const parsed = parseWorkflowFormJsonToolResult(args.toolResultText)
			if (parsed?.persisted === true && parsed?.review_input_available === true) {
				return { succeeded: true }
			}

			if (parsed?.reason === "diff_output does not identify recent changes to the story file.") {
				return {
					succeeded: false,
					errorMessage: CODE_REVIEW_STEP_3_REVIEW_INPUT_DIFF_MISMATCH_MESSAGE,
					fallbackToAgent: true,
				}
			}

			if (isWorkflowFormFailureText(args.toolResultText)) {
				return {
					succeeded: false,
					errorMessage: args.toolResultText?.trim() ?? this.buildToolExecutionFailureFallbackMessage(session),
					fallbackToAgent: true,
				}
			}

			return {
				succeeded: false,
				errorMessage: this.buildToolExecutionFailureFallbackMessage(session),
				fallbackToAgent: true,
			}
		},
	},
	[WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_RESOLVER_ID]: {
		id: WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_RESOLVER_ID,
		toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
		defaultInitialPhase: "collect_inputs",
		buildDefinition(): WorkflowFormDefinition {
			return {
				toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
				title: "Review Input Artifact",
				toolDictionaryTitle: "Review Input Reference",
				toolDictionaryMarkdown: buildRuntimeToolDictionaryMarkdownFromConfig(buildReviewInputToolDictionaryConfig),
				presentation: {
					kind: "automatic_status",
					pendingLabel: "Preparing workflow documents",
					successLabel: "Workflow documents ready",
					failureLabel: "Automatic workflow preparation failed- falling back to manual LLM workflow preparation.",
				},
				pages: {
					collect_inputs: {
						prompt: "The system will now build `review-input.md` from the stored `story_path` and the workflow-owned `review-input.diff` artifact.",
						fields: [],
						submitLabel: "Submit",
						cancelLabel: "Cancel",
					},
					retry_error: {
						prompt: "The system could not produce `review-input.md` from the stored workflow inputs. Retry the request or return to the Step 2 fallback instructions.",
						fields: [],
						submitLabel: "Submit",
						cancelLabel: "Cancel",
						retryLabel: "Start Over",
					},
				},
				successMessage: "The Step 2 review-input artifact is ready.",
			}
		},
		buildToolExecutionFailureFallbackMessage() {
			return "The workflow form could not build the Step 2 review-input artifact from stored workflow inputs. The workflow will return to the Step 2 fallback instructions."
		},
		buildToolExecutionRequest(_session, _values) {
			return {
				toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
				toolInput: {},
				toolParams: {},
			}
		},
		evaluateToolExecutionResult(session, args) {
			const parsed = parseWorkflowFormJsonToolResult(args.toolResultText)
			if (parsed?.persisted === true && parsed?.review_input_available === true) {
				return { succeeded: true }
			}

			if (parsed?.reason === "diff_output does not identify recent changes to the story file.") {
				return {
					succeeded: false,
					errorMessage: CODE_REVIEW_STEP_3_REVIEW_INPUT_DIFF_MISMATCH_MESSAGE,
					fallbackToAgent: true,
				}
			}

			if (isWorkflowFormFailureText(args.toolResultText)) {
				return {
					succeeded: false,
					errorMessage: args.toolResultText?.trim() ?? this.buildToolExecutionFailureFallbackMessage(session),
					fallbackToAgent: true,
				}
			}

			return {
				succeeded: false,
				errorMessage: this.buildToolExecutionFailureFallbackMessage(session),
				fallbackToAgent: true,
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
			const fields = getCurrentCollectFields({ ...session, values }, this.buildDefinition)
			const filteredValues = fields.reduce<Record<string, string>>((acc, field) => {
				const value = getParsedFieldValue(fields, values, field.key)
				if (typeof value === "string") {
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
