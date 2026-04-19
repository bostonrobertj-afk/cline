import type {
	WorkflowFormConditionDefinition,
	WorkflowFormDefinitionPayload,
	WorkflowFormFieldDefinition,
	WorkflowFormOptionDefinition,
} from "@shared/ExtensionMessage"
import { formatResponse } from "@/core/prompts/responses"
import { buildWorkflowStartRuntimeToolDictionary } from "@/core/task/workflow-form/dictionaries/buildToolDictionary"
import { ClineDefaultTool } from "@/shared/tools"
import {
	convertWorkflowFormSubmittedValueToToolInput,
	deriveWorkflowFormFieldKind,
	deriveWorkflowFormOptions,
	resolveWorkflowFormSchema,
	type WorkflowFormFieldSchemaBinding,
} from "./schema"
import type {
	WorkflowFormResolverDefinition,
	WorkflowFormResolverId,
	WorkflowFormSessionState,
	WorkflowFormStartRequirements,
	WorkflowFormToolExecutionRequest,
} from "./types"

export const BRAINSTORMING_STEP_2_PREPARE_SESSION_RESOLVER_ID = "brainstorming_step_2_prepare_session"
export const BRAINSTORMING_STEP_4_CHOOSE_APPROACH_RESOLVER_ID = "brainstorming_step_4_choose_approach"
export const WORKFLOW_START_SET_WORKFLOW_VALUES_RESOLVER_ID = "workflow_start_set_workflow_values"

const WORKFLOW_START_PANEL_ID = "workflow_start_inputs"
const BRAINSTORMING_STEP_2_SESSION_STRATEGY_PANEL_ID = "session_strategy"
const BRAINSTORMING_STEP_2_SESSION_SELECTION_PANEL_ID = "session_selection"
const BRAINSTORMING_STEP_4_APPROACH_SELECTION_PANEL_ID = "approach_selection"
const BRAINSTORMING_STEP_4_TECHNIQUE_SELECTION_PANEL_ID = "technique_selection"
const BRAINSTORMING_STEP_4_RANDOM_PREVIEW_PANEL_ID = "random_preview"

const SESSION_STRATEGY_FIELD_KEY = "session_strategy"
const BRAINSTORMING_OUTPUT_FILE_FIELD_KEY = "output_file"
const BRAINSTORMING_SELECTED_APPROACH_FIELD_KEY = "selected_approach"
const BRAINSTORMING_TECHNIQUE_CATEGORY_FIELD_KEY = "technique_category"
const BRAINSTORMING_TECHNIQUE_NAME_FIELD_KEY = "technique_name"
const BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY = "random_preview"

const WORKFLOW_START_SUCCESS_MESSAGE = "Workflow start inputs were stored."
const WORKFLOW_START_FAILURE_MESSAGE =
	"The workflow form could not store the workflow start inputs. Review the values and try again."
const BRAINSTORMING_STEP_2_SUCCESS_MESSAGE = "The brainstorming session file is ready."
const BRAINSTORMING_STEP_2_FAILURE_MESSAGE =
	"The workflow form could not prepare the brainstorming session. Review the session choice and try again."
const BRAINSTORMING_STEP_4_SUCCESS_MESSAGE = "The brainstorming technique is ready."
const BRAINSTORMING_STEP_4_SUGGESTION_SUCCESS_MESSAGE = "The brainstorming technique suggestion request is ready."
const BRAINSTORMING_STEP_4_FAILURE_MESSAGE =
	"The workflow form could not store the brainstorming approach or technique. Review the selection and try again."

const BRAINSTORMING_SESSION_STRATEGY_OPTIONS: WorkflowFormOptionDefinition[] = [
	{
		value: "continue_newest",
		label: "Continue newest session",
	},
	{
		value: "start_new",
		label: "Start new session",
	},
	{
		value: "list_all",
		label: "List all sessions",
	},
]

const BRAINSTORMING_APPROACH_OPTIONS: WorkflowFormOptionDefinition[] = [
	{
		value: "user_choose",
		label: "Choose by category",
	},
	{
		value: "random_technique",
		label: "Pick a random technique",
	},
	{
		value: "suggest_technique",
		label: "Ask for a technique suggestion",
	},
]

function deriveAllowedValueType(
	schema: ReturnType<typeof resolveWorkflowFormSchema>,
): WorkflowFormFieldDefinition["allowedValueType"] {
	switch (schema.type) {
		case "string":
			return "string"
		case "boolean":
			return "boolean"
		case "integer":
			return "integer"
		case "array":
			return "array"
		case "object":
			return "object"
		default:
			return undefined
	}
}

function buildSchemaBackedField(args: {
	toolName: ClineDefaultTool
	binding: WorkflowFormFieldSchemaBinding
	key: string
	label: string
	helpText: string
	required: boolean
	oneOfGroupId?: string
	placeholder?: string
	options?: WorkflowFormOptionDefinition[]
	kind?: WorkflowFormFieldDefinition["kind"]
	allowedValueType?: WorkflowFormFieldDefinition["allowedValueType"]
	visibilityCondition?: WorkflowFormConditionDefinition
	presentation?: WorkflowFormFieldDefinition["presentation"]
	resetValueKeysOnChange?: string[]
	resetDataKeysOnChange?: string[]
}): WorkflowFormFieldDefinition {
	const valueSchema = resolveWorkflowFormSchema(args.toolName, args.binding)

	return {
		key: args.key,
		kind: args.kind ?? deriveWorkflowFormFieldKind(valueSchema),
		label: args.label,
		helpText: args.helpText,
		required: args.required,
		oneOfGroupId: args.oneOfGroupId,
		allowedValueType: args.allowedValueType ?? deriveAllowedValueType(valueSchema),
		placeholder: args.placeholder,
		options: args.options ?? deriveWorkflowFormOptions(valueSchema),
		visibilityCondition: args.visibilityCondition,
		valueSchema,
		presentation: args.presentation,
		resetValueKeysOnChange: args.resetValueKeysOnChange,
		resetDataKeysOnChange: args.resetDataKeysOnChange,
	}
}

function getSubmittedValueAsToolInput(session: WorkflowFormSessionState, key: string): unknown {
	return convertWorkflowFormSubmittedValueToToolInput(session.values[key])
}

function getSubmittedStringValue(session: WorkflowFormSessionState, key: string): string | undefined {
	const value = getSubmittedValueAsToolInput(session, key)
	if (typeof value !== "string") {
		return undefined
	}

	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
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

function humanizeWorkflowValueKey(key: string): string {
	return key
		.split("_")
		.filter(Boolean)
		.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
		.join(" ")
}

function getWorkflowStartOrderedFieldKeys(args: WorkflowFormStartRequirements): string[] {
	const orderedKeys = [...args.requiredFieldKeys, ...args.optionalFieldKeys, ...(args.oneOfRequirement?.fieldKeys ?? [])]

	return orderedKeys.filter((key, index) => orderedKeys.indexOf(key) === index)
}

function buildWorkflowStartValueFieldDefinitions(args: {
	requiredFieldKeys: string[]
	optionalFieldKeys: string[]
	oneOfRequirement?: { id: string; fieldKeys: string[] }
	override?: WorkflowStartFormOverride
	orderedFieldKeys?: string[]
}): WorkflowFormFieldDefinition[] {
	const orderedKeys = args.orderedFieldKeys ?? getWorkflowStartOrderedFieldKeys(args)
	const requiredFieldKeySet = new Set(args.requiredFieldKeys)
	const oneOfFieldKeySet = new Set(args.oneOfRequirement?.fieldKeys ?? [])

	return orderedKeys.reduce<WorkflowFormFieldDefinition[]>((fields, key) => {
		if (fields.some((field) => field.key === key)) {
			return fields
		}

		fields.push(
			buildSchemaBackedField({
				toolName: ClineDefaultTool.SET_WORKFLOW_VALUES,
				binding: { parameterName: "values", useAdditionalProperties: true },
				key,
				label: args.override?.labels[key] ?? humanizeWorkflowValueKey(key),
				helpText: args.override?.help[key] ?? humanizeWorkflowValueKey(key),
				required: requiredFieldKeySet.has(key),
				oneOfGroupId: oneOfFieldKeySet.has(key) ? args.oneOfRequirement?.id : undefined,
				placeholder: args.override?.placeholders?.[key] ?? "/absolute/path/to/file-or-artifact",
			}),
		)

		return fields
	}, [])
}

export function buildWorkflowStartDefinitionPayload(args: {
	workflowName: string
	workflowStartRequirements: WorkflowFormStartRequirements
}): WorkflowFormDefinitionPayload {
	const override = workflowStartFormOverrides[args.workflowName]
	const orderedFieldKeys = getWorkflowStartOrderedFieldKeys(args.workflowStartRequirements)
	const fields = buildWorkflowStartValueFieldDefinitions({
		requiredFieldKeys: args.workflowStartRequirements.requiredFieldKeys,
		optionalFieldKeys: args.workflowStartRequirements.optionalFieldKeys,
		oneOfRequirement: args.workflowStartRequirements.oneOfRequirement,
		override,
		orderedFieldKeys,
	})
	const { title, markdown } = buildWorkflowStartRuntimeToolDictionary({ fieldKeys: orderedFieldKeys })
	const promptMarkdown = override?.prompt ?? "Please provide the inputs necessary to start this workflow."
	const titleText = override?.title ?? "Workflow Start Inputs"

	return {
		definitionVersion: 2,
		title: titleText,
		toolDictionaryTitle: title,
		toolDictionaryMarkdown: markdown,
		firstPanelId: WORKFLOW_START_PANEL_ID,
		panels: {
			[WORKFLOW_START_PANEL_ID]: {
				panelId: WORKFLOW_START_PANEL_ID,
				title: titleText,
				promptMarkdown,
				fields,
				allowedActions: ["submit", "cancel", "retry"],
				actionLabels: {
					submit: "Submit",
					cancel: "Cancel",
					retry: "Retry",
				},
				transition: {
					type: "deterministic_operation",
					operationId: ClineDefaultTool.SET_WORKFLOW_VALUES,
					terminal: true,
				},
			},
		},
	}
}

export function buildBrainstormingStep2InitialDefinitionPayload(args: {
	sessionOptions: WorkflowFormOptionDefinition[]
}): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Brainstorming Session",
		toolDictionaryTitle: "Brainstorming Session Reference",
		toolDictionaryMarkdown: "## Brainstorming Session Preparation",
		firstPanelId: BRAINSTORMING_STEP_2_SESSION_STRATEGY_PANEL_ID,
		panels: {
			[BRAINSTORMING_STEP_2_SESSION_STRATEGY_PANEL_ID]: {
				panelId: BRAINSTORMING_STEP_2_SESSION_STRATEGY_PANEL_ID,
				title: "Choose Session Strategy",
				promptMarkdown: "Choose how you want to prepare the brainstorming session file.",
				fields: [
					{
						key: SESSION_STRATEGY_FIELD_KEY,
						kind: "radio_group",
						label: "Session Strategy",
						helpText: "Continue the newest session, start a fresh session, or choose from all existing sessions.",
						required: true,
						allowedValueType: "string",
						valueSchema: { type: "string" },
						options: BRAINSTORMING_SESSION_STRATEGY_OPTIONS,
					},
				],
				allowedActions: ["submit", "cancel", "retry"],
				actionLabels: {
					submit: "Continue",
					cancel: "Cancel",
					retry: "Retry",
				},
				transition: {
					type: "conditional",
					conditionSourceKey: SESSION_STRATEGY_FIELD_KEY,
					branches: [
						{
							matchValue: "continue_newest",
							operationId: ClineDefaultTool.CONTINUE_BRAINSTORMING_SESSION,
							terminal: true,
						},
						{
							matchValue: "start_new",
							operationId: ClineDefaultTool.CREATE_BRAINSTORMING_SESSION,
							terminal: true,
						},
						{
							matchValue: "list_all",
							nextPanelId: BRAINSTORMING_STEP_2_SESSION_SELECTION_PANEL_ID,
						},
					],
				},
			},
			[BRAINSTORMING_STEP_2_SESSION_SELECTION_PANEL_ID]: {
				panelId: BRAINSTORMING_STEP_2_SESSION_SELECTION_PANEL_ID,
				title: "Select Session",
				promptMarkdown: "Choose the existing brainstorming session to continue.",
				fields: [
					{
						key: BRAINSTORMING_OUTPUT_FILE_FIELD_KEY,
						kind: "dropdown",
						label: "Session",
						helpText: "Select one of the discovered brainstorming session files.",
						required: true,
						allowedValueType: "string",
						valueSchema: { type: "string" },
						options: args.sessionOptions,
					},
				],
				allowedActions: ["submit", "cancel", "retry"],
				actionLabels: {
					submit: "Select Session",
					cancel: "Cancel",
					retry: "Retry",
				},
				transition: {
					type: "deterministic_operation",
					operationId: ClineDefaultTool.SELECT_BRAINSTORMING_SESSION,
					terminal: true,
				},
			},
		},
	}
}

function buildBrainstormingTechniqueConditionalOptions(
	techniqueOptionsByCategory: Record<string, WorkflowFormOptionDefinition[]>,
) {
	return Object.entries(techniqueOptionsByCategory).map(([category, options]) => ({
		when: {
			sourceKey: BRAINSTORMING_TECHNIQUE_CATEGORY_FIELD_KEY,
			operator: "equals" as const,
			value: category,
		},
		options,
	}))
}

function getBrainstormingStep4TechniqueCatalog(definitionPayload: WorkflowFormDefinitionPayload) {
	const techniquePanel = definitionPayload.panels[BRAINSTORMING_STEP_4_TECHNIQUE_SELECTION_PANEL_ID]
	const categoryField = techniquePanel?.fields.find((field) => field.key === BRAINSTORMING_TECHNIQUE_CATEGORY_FIELD_KEY)
	const techniqueField = techniquePanel?.fields.find((field) => field.key === BRAINSTORMING_TECHNIQUE_NAME_FIELD_KEY)
	const techniqueOptionsByCategory = Object.fromEntries(
		(techniqueField?.conditionalOptions ?? [])
			.map((entry) => {
				const category = entry.when.value
				return typeof category === "string" ? [category, entry.options] : undefined
			})
			.filter((entry): entry is [string, WorkflowFormOptionDefinition[]] => Array.isArray(entry)),
	)

	return {
		categoryOptions: categoryField?.options ?? [],
		techniqueOptionsByCategory,
	}
}

export function buildBrainstormingStep4DefinitionPayload(args: {
	categoryOptions: WorkflowFormOptionDefinition[]
	techniqueOptionsByCategory: Record<string, WorkflowFormOptionDefinition[]>
	session?: WorkflowFormSessionState
}): WorkflowFormDefinitionPayload {
	const selectedApproach = args.session
		? getSubmittedStringValue(args.session, BRAINSTORMING_SELECTED_APPROACH_FIELD_KEY)
		: undefined
	const randomPreviewData =
		args.session?.data[BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY] &&
		typeof args.session.data[BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY] === "object" &&
		!Array.isArray(args.session.data[BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY])
			? (args.session.data[BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY] as Record<string, unknown>)
			: undefined
	const randomTechniqueName =
		typeof randomPreviewData?.technique_name === "string" ? randomPreviewData.technique_name : "Random Technique"
	const randomTechniqueDescription =
		typeof randomPreviewData?.technique_description === "string"
			? randomPreviewData.technique_description
			: "The selected technique preview will appear here after the random technique operation succeeds."
	const approachSelectionTransition =
		selectedApproach === undefined
			? {
					type: "deterministic_operation" as const,
					operationId: ClineDefaultTool.PERSIST_BRAINSTORMING_APPROACH,
					terminal: false,
					rebuildDefinitionAfterSuccess: true,
					recomputeDestinationAfterSuccess: true,
				}
			: selectedApproach === "user_choose"
				? {
						type: "sequential" as const,
						nextPanelId: BRAINSTORMING_STEP_4_TECHNIQUE_SELECTION_PANEL_ID,
					}
				: selectedApproach === "random_technique"
					? {
							type: "deterministic_operation" as const,
							operationId: ClineDefaultTool.SELECT_RANDOM_BRAINSTORMING_TECHNIQUE,
							nextPanelId: BRAINSTORMING_STEP_4_RANDOM_PREVIEW_PANEL_ID,
							terminal: false,
							resultDataKey: BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY,
							rebuildDefinitionAfterSuccess: true,
							staleDataKeysToClear: [BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY],
						}
					: {
							type: "deterministic_operation" as const,
							operationId: ClineDefaultTool.REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION,
							terminal: true,
						}

	return {
		definitionVersion: 2,
		title: "Choose Brainstorming Approach",
		toolDictionaryTitle: "Brainstorming Technique Reference",
		toolDictionaryMarkdown: "## Brainstorming Technique Selection",
		firstPanelId: BRAINSTORMING_STEP_4_APPROACH_SELECTION_PANEL_ID,
		panels: {
			[BRAINSTORMING_STEP_4_APPROACH_SELECTION_PANEL_ID]: {
				panelId: BRAINSTORMING_STEP_4_APPROACH_SELECTION_PANEL_ID,
				title: "Choose Approach",
				promptMarkdown: "Choose how you want to select the brainstorming technique for this session.",
				fields: [
					{
						key: BRAINSTORMING_SELECTED_APPROACH_FIELD_KEY,
						kind: "radio_group",
						label: "Approach",
						helpText: "Choose by category, let the runtime pick a random technique, or request a suggestion.",
						required: true,
						allowedValueType: "string",
						valueSchema: { type: "string" },
						options: BRAINSTORMING_APPROACH_OPTIONS,
						resetValueKeysOnChange: [
							BRAINSTORMING_TECHNIQUE_CATEGORY_FIELD_KEY,
							BRAINSTORMING_TECHNIQUE_NAME_FIELD_KEY,
						],
						resetDataKeysOnChange: [BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY],
					},
				],
				allowedActions: ["submit", "cancel", "retry"],
				actionLabels: {
					submit: "Continue",
					cancel: "Cancel",
					retry: "Retry",
				},
				transition: approachSelectionTransition,
			},
			[BRAINSTORMING_STEP_4_TECHNIQUE_SELECTION_PANEL_ID]: {
				panelId: BRAINSTORMING_STEP_4_TECHNIQUE_SELECTION_PANEL_ID,
				title: "Select Technique",
				promptMarkdown: "Choose a brainstorming category and then select one technique from that category.",
				fields: [
					{
						key: BRAINSTORMING_TECHNIQUE_CATEGORY_FIELD_KEY,
						kind: "dropdown",
						label: "Technique Category",
						helpText: "Choose the category that best fits the brainstorming direction you want.",
						required: true,
						allowedValueType: "string",
						valueSchema: { type: "string" },
						options: args.categoryOptions,
						resetValueKeysOnChange: [BRAINSTORMING_TECHNIQUE_NAME_FIELD_KEY],
					},
					{
						key: BRAINSTORMING_TECHNIQUE_NAME_FIELD_KEY,
						kind: "dropdown",
						label: "Technique",
						helpText: "Select the specific brainstorming technique to use for this session.",
						required: true,
						allowedValueType: "string",
						valueSchema: { type: "string" },
						options: [],
						conditionalOptions: buildBrainstormingTechniqueConditionalOptions(args.techniqueOptionsByCategory),
						dependsOn: [BRAINSTORMING_TECHNIQUE_CATEGORY_FIELD_KEY],
					},
				],
				allowedActions: ["submit", "cancel", "back", "retry"],
				actionLabels: {
					submit: "Use Technique",
					cancel: "Cancel",
					back: "Back",
					retry: "Retry",
				},
				backDestinationPanelId: BRAINSTORMING_STEP_4_APPROACH_SELECTION_PANEL_ID,
				backStaleValueKeysToClear: [BRAINSTORMING_TECHNIQUE_CATEGORY_FIELD_KEY, BRAINSTORMING_TECHNIQUE_NAME_FIELD_KEY],
				transition: {
					type: "deterministic_operation",
					operationId: ClineDefaultTool.PERSIST_BRAINSTORMING_TECHNIQUE,
					terminal: true,
				},
			},
			[BRAINSTORMING_STEP_4_RANDOM_PREVIEW_PANEL_ID]: {
				panelId: BRAINSTORMING_STEP_4_RANDOM_PREVIEW_PANEL_ID,
				title: "Random Technique Preview",
				promptMarkdown: "Review the randomly selected technique and confirm if you want to use it.",
				fields: [
					{
						key: "random_preview_name",
						kind: "markdown_display",
						label: "Technique Name",
						required: false,
						contentMarkdown: `### ${randomTechniqueName}`,
					},
					{
						key: "random_preview_description",
						kind: "markdown_display",
						label: "Technique Description",
						required: false,
						contentMarkdown: randomTechniqueDescription,
					},
				],
				allowedActions: ["submit", "cancel", "back", "retry"],
				actionLabels: {
					submit: "Use Technique",
					cancel: "Cancel",
					back: "Back",
					retry: "Retry",
				},
				backDestinationPanelId: BRAINSTORMING_STEP_4_APPROACH_SELECTION_PANEL_ID,
				backStaleDataKeysToClear: [BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY],
				transition: {
					type: "deterministic_operation",
					operationId: ClineDefaultTool.PERSIST_BRAINSTORMING_TECHNIQUE,
					terminal: true,
				},
			},
		},
	}
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

function buildWorkflowStartOperationRequest(session: WorkflowFormSessionState) {
	const panel = session.definitionPayload.panels[WORKFLOW_START_PANEL_ID]
	const values = panel.fields.reduce<Record<string, string>>((accumulator, field) => {
		const value = getSubmittedStringValue(session, field.key)
		if (value) {
			accumulator[field.key] = value
		}

		return accumulator
	}, {})

	return {
		toolName: ClineDefaultTool.SET_WORKFLOW_VALUES,
		toolInput: { values },
		toolParams: { values: JSON.stringify(values) },
	}
}

function buildBrainstormingStep2OperationRequest(
	session: WorkflowFormSessionState,
	operationId: string,
): WorkflowFormToolExecutionRequest {
	switch (operationId) {
		case ClineDefaultTool.CONTINUE_BRAINSTORMING_SESSION:
			return {
				toolName: ClineDefaultTool.CONTINUE_BRAINSTORMING_SESSION,
				toolInput: {},
				toolParams: {},
			}
		case ClineDefaultTool.CREATE_BRAINSTORMING_SESSION:
			return {
				toolName: ClineDefaultTool.CREATE_BRAINSTORMING_SESSION,
				toolInput: {},
				toolParams: {},
			}
		case ClineDefaultTool.SELECT_BRAINSTORMING_SESSION: {
			const outputFile = getSubmittedStringValue(session, BRAINSTORMING_OUTPUT_FILE_FIELD_KEY) ?? ""
			return {
				toolName: ClineDefaultTool.SELECT_BRAINSTORMING_SESSION,
				toolInput: { output_file: outputFile },
				toolParams: { output_file: outputFile },
			}
		}
		default:
			throw new Error(`Unsupported workflow form operation: ${operationId}`)
	}
}

function resolveTechniqueDescriptionFromSelection(session: WorkflowFormSessionState): string | undefined {
	const panel = session.definitionPayload.panels[BRAINSTORMING_STEP_4_TECHNIQUE_SELECTION_PANEL_ID]
	const techniqueField = panel?.fields.find((field) => field.key === BRAINSTORMING_TECHNIQUE_NAME_FIELD_KEY)
	const selectedTechniqueName = getSubmittedStringValue(session, BRAINSTORMING_TECHNIQUE_NAME_FIELD_KEY)
	if (!selectedTechniqueName || !techniqueField) {
		return undefined
	}

	const selectedCategory = getSubmittedStringValue(session, BRAINSTORMING_TECHNIQUE_CATEGORY_FIELD_KEY)
	const matchingConditionalOptions = techniqueField.conditionalOptions?.find(
		(entry) => entry.when.value === selectedCategory,
	)?.options
	const selectedOption = matchingConditionalOptions?.find((option) => option.value === selectedTechniqueName)
	return selectedOption?.description
}

function buildBrainstormingStep4OperationRequest(
	session: WorkflowFormSessionState,
	operationId: string,
): WorkflowFormToolExecutionRequest {
	switch (operationId) {
		case ClineDefaultTool.PERSIST_BRAINSTORMING_APPROACH: {
			const selectedApproach = getSubmittedStringValue(session, BRAINSTORMING_SELECTED_APPROACH_FIELD_KEY) ?? ""
			return {
				toolName: ClineDefaultTool.PERSIST_BRAINSTORMING_APPROACH,
				toolInput: { selected_approach: selectedApproach },
				toolParams: { selected_approach: selectedApproach },
			}
		}
		case ClineDefaultTool.SELECT_RANDOM_BRAINSTORMING_TECHNIQUE:
			return {
				toolName: ClineDefaultTool.SELECT_RANDOM_BRAINSTORMING_TECHNIQUE,
				toolInput: {},
				toolParams: {},
			}
		case ClineDefaultTool.REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION:
			return {
				toolName: ClineDefaultTool.REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION,
				toolInput: {},
				toolParams: {},
			}
		case ClineDefaultTool.PERSIST_BRAINSTORMING_TECHNIQUE: {
			const randomPreviewData =
				session.data[BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY] &&
				typeof session.data[BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY] === "object" &&
				!Array.isArray(session.data[BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY])
					? (session.data[BRAINSTORMING_RANDOM_PREVIEW_DATA_KEY] as Record<string, unknown>)
					: undefined
			const techniqueName =
				typeof randomPreviewData?.technique_name === "string"
					? randomPreviewData.technique_name
					: (getSubmittedStringValue(session, BRAINSTORMING_TECHNIQUE_NAME_FIELD_KEY) ?? "")
			const techniqueDescription =
				typeof randomPreviewData?.technique_description === "string"
					? randomPreviewData.technique_description
					: (resolveTechniqueDescriptionFromSelection(session) ?? "")

			return {
				toolName: ClineDefaultTool.PERSIST_BRAINSTORMING_TECHNIQUE,
				toolInput: {
					technique_name: techniqueName,
					technique_description: techniqueDescription,
				},
				toolParams: {
					technique_name: techniqueName,
					technique_description: techniqueDescription,
				},
			}
		}
		default:
			throw new Error(`Unsupported workflow form operation: ${operationId}`)
	}
}

function applyWorkflowStartOperationResult(_session: WorkflowFormSessionState, toolResultText?: string) {
	if (isWorkflowFormFailureText(toolResultText)) {
		return {
			succeeded: false as const,
			errorMessage: toolResultText?.trim() ?? WORKFLOW_START_FAILURE_MESSAGE,
		}
	}

	return {
		succeeded: true as const,
		terminalSuccessMessage: WORKFLOW_START_SUCCESS_MESSAGE,
	}
}

function applyBrainstormingStep2OperationResult(operationId: string, toolResultText?: string) {
	const parsed = parseWorkflowFormJsonToolResult(toolResultText)
	if (
		parsed?.persisted === true &&
		parsed?.output_file_available === true &&
		typeof parsed?.artifact_path === "string" &&
		((operationId === ClineDefaultTool.CONTINUE_BRAINSTORMING_SESSION && parsed?.continued === true) ||
			(operationId === ClineDefaultTool.CREATE_BRAINSTORMING_SESSION && parsed?.created === true) ||
			(operationId === ClineDefaultTool.SELECT_BRAINSTORMING_SESSION && parsed?.selected === true))
	) {
		return {
			succeeded: true as const,
			terminalSuccessMessage: BRAINSTORMING_STEP_2_SUCCESS_MESSAGE,
		}
	}

	if (isWorkflowFormFailureText(toolResultText)) {
		return {
			succeeded: false as const,
			errorMessage: toolResultText?.trim() ?? BRAINSTORMING_STEP_2_FAILURE_MESSAGE,
		}
	}

	return {
		succeeded: false as const,
		errorMessage: BRAINSTORMING_STEP_2_FAILURE_MESSAGE,
	}
}

function applyBrainstormingStep4OperationResult(operationId: string, toolResultText?: string) {
	const parsed = parseWorkflowFormJsonToolResult(toolResultText)

	switch (operationId) {
		case ClineDefaultTool.PERSIST_BRAINSTORMING_APPROACH:
			if (parsed?.persisted === true && parsed?.approach_persisted === true) {
				return {
					succeeded: true as const,
				}
			}
			break
		case ClineDefaultTool.SELECT_RANDOM_BRAINSTORMING_TECHNIQUE:
			if (
				typeof parsed?.technique_name === "string" &&
				typeof parsed?.technique_description === "string" &&
				typeof parsed?.technique_category === "string"
			) {
				return {
					succeeded: true as const,
					operationData: parsed,
				}
			}
			break
		case ClineDefaultTool.PERSIST_BRAINSTORMING_TECHNIQUE:
			if (parsed?.persisted === true && parsed?.technique_persisted === true) {
				return {
					succeeded: true as const,
					terminalSuccessMessage: BRAINSTORMING_STEP_4_SUCCESS_MESSAGE,
				}
			}
			break
		case ClineDefaultTool.REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION:
			if (parsed?.persisted === true && parsed?.technique_suggestion_requested === true) {
				return {
					succeeded: true as const,
					terminalSuccessMessage: BRAINSTORMING_STEP_4_SUGGESTION_SUCCESS_MESSAGE,
				}
			}
			break
		default:
			throw new Error(`Unsupported workflow form operation: ${operationId}`)
	}

	if (isWorkflowFormFailureText(toolResultText)) {
		return {
			succeeded: false as const,
			errorMessage: toolResultText?.trim() ?? BRAINSTORMING_STEP_4_FAILURE_MESSAGE,
		}
	}

	return {
		succeeded: false as const,
		errorMessage: BRAINSTORMING_STEP_4_FAILURE_MESSAGE,
	}
}

export const workflowFormRegistry: Record<string, WorkflowFormResolverDefinition> = {
	[BRAINSTORMING_STEP_2_PREPARE_SESSION_RESOLVER_ID]: {
		id: BRAINSTORMING_STEP_2_PREPARE_SESSION_RESOLVER_ID,
		buildDefinition(session) {
			return session.definitionPayload
		},
		buildOperationRequest(session, operationId) {
			return buildBrainstormingStep2OperationRequest(session, operationId)
		},
		applyOperationResult(_session, args) {
			return applyBrainstormingStep2OperationResult(args.operationId, args.toolResultText)
		},
		buildFailureFallbackMessage() {
			return BRAINSTORMING_STEP_2_FAILURE_MESSAGE
		},
	},
	[BRAINSTORMING_STEP_4_CHOOSE_APPROACH_RESOLVER_ID]: {
		id: BRAINSTORMING_STEP_4_CHOOSE_APPROACH_RESOLVER_ID,
		buildDefinition(session) {
			const { categoryOptions, techniqueOptionsByCategory } = getBrainstormingStep4TechniqueCatalog(
				session.definitionPayload,
			)
			return buildBrainstormingStep4DefinitionPayload({
				categoryOptions,
				techniqueOptionsByCategory,
				session,
			})
		},
		buildOperationRequest(session, operationId) {
			return buildBrainstormingStep4OperationRequest(session, operationId)
		},
		applyOperationResult(_session, args) {
			return applyBrainstormingStep4OperationResult(args.operationId, args.toolResultText)
		},
		buildFailureFallbackMessage() {
			return BRAINSTORMING_STEP_4_FAILURE_MESSAGE
		},
	},
	[WORKFLOW_START_SET_WORKFLOW_VALUES_RESOLVER_ID]: {
		id: WORKFLOW_START_SET_WORKFLOW_VALUES_RESOLVER_ID,
		buildDefinition(session) {
			return session.definitionPayload
		},
		buildOperationRequest(session, operationId) {
			if (operationId !== ClineDefaultTool.SET_WORKFLOW_VALUES) {
				throw new Error(`Unsupported workflow form operation: ${operationId}`)
			}

			return buildWorkflowStartOperationRequest(session)
		},
		applyOperationResult(session, args) {
			if (args.operationId !== ClineDefaultTool.SET_WORKFLOW_VALUES) {
				throw new Error(`Unsupported workflow form operation: ${args.operationId}`)
			}

			return applyWorkflowStartOperationResult(session, args.toolResultText)
		},
		buildFailureFallbackMessage() {
			return WORKFLOW_START_FAILURE_MESSAGE
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
