import type { WorkflowValidationResult, WorkflowValue, WorkflowValues } from "./types"
import { stringifyWorkflowValueForPrompt } from "./workflowValues"

export interface WorkflowPromptTemplateValidationArgs {
	template: string
	workflowValueKeys: readonly string[]
	context: string
}

export interface WorkflowPromptTemplateRenderArgs {
	template: string
	workflowValueKeys: readonly string[]
	workflowValues: WorkflowValues
	context: string
}

const WORKFLOW_PROMPT_TEMPLATE_REFERENCE_PATTERN = /\{([^{}]*)\}/g
const WORKFLOW_PROMPT_TEMPLATE_UNCLOSED_WORKFLOW_REFERENCE_PATTERN = /\{workflow(?:\.[^{}\s]*)?(?=$|\s)/g
const WORKFLOW_PROMPT_TEMPLATE_UNOPENED_WORKFLOW_REFERENCE_PATTERN = /(^|[^{])(workflow\.[^{}\s]+\})/g
const WORKFLOW_PROMPT_TEMPLATE_WORKFLOW_PREFIX = "workflow."

interface WorkflowPromptTemplateReference {
	readonly placeholder: string
	readonly reference: string
}

function readWorkflowPromptTemplateReferences(template: string): WorkflowPromptTemplateReference[] {
	const references: WorkflowPromptTemplateReference[] = []
	for (const match of template.matchAll(WORKFLOW_PROMPT_TEMPLATE_REFERENCE_PATTERN)) {
		const placeholder = match[0]
		const reference = match[1]
		if (reference === undefined) {
			continue
		}
		references.push({ placeholder, reference })
	}
	return references
}

export function validateWorkflowPromptTemplate(args: WorkflowPromptTemplateValidationArgs): WorkflowValidationResult {
	const malformedReferences: string[] = []
	for (const match of args.template.matchAll(WORKFLOW_PROMPT_TEMPLATE_UNCLOSED_WORKFLOW_REFERENCE_PATTERN)) {
		malformedReferences.push(match[0])
	}
	for (const match of args.template.matchAll(WORKFLOW_PROMPT_TEMPLATE_UNOPENED_WORKFLOW_REFERENCE_PATTERN)) {
		const malformedReference = match[2]
		if (malformedReference !== undefined) {
			malformedReferences.push(malformedReference)
		}
	}
	if (malformedReferences.length > 0) {
		return {
			valid: false,
			errorMessage: `Workflow prompt template ${args.context} contains malformed workflow value reference ${malformedReferences[0]}.`,
		}
	}

	const workflowValueKeys = new Set(args.workflowValueKeys)
	for (const reference of readWorkflowPromptTemplateReferences(args.template)) {
		if (reference.reference.startsWith(WORKFLOW_PROMPT_TEMPLATE_WORKFLOW_PREFIX) === false) {
			continue
		}

		const workflowValueKey = reference.reference.slice(WORKFLOW_PROMPT_TEMPLATE_WORKFLOW_PREFIX.length)
		if (workflowValueKey.trim() === "") {
			return {
				valid: false,
				errorMessage: `Workflow prompt template ${args.context} contains blank workflow value reference.`,
			}
		}
		if (workflowValueKeys.has(workflowValueKey) === false) {
			return {
				valid: false,
				errorMessage: `Workflow prompt template ${args.context} references undeclared workflow value ${workflowValueKey}.`,
			}
		}
	}
	return { valid: true }
}

interface WorkflowPromptTemplateRenderStringArgs {
	readonly template: string
	readonly workflowValueKeys: ReadonlySet<string>
	readonly workflowValues: WorkflowValues
	readonly context: string
	readonly resolvingKeys: readonly string[]
}

interface WorkflowPromptTemplateRenderValueArgs {
	readonly value: WorkflowValue
	readonly workflowValueKeys: ReadonlySet<string>
	readonly workflowValues: WorkflowValues
	readonly context: string
	readonly resolvingKeys: readonly string[]
}

function renderWorkflowPromptTemplateString(args: WorkflowPromptTemplateRenderStringArgs): string {
	const validationResult = validateWorkflowPromptTemplate({
		template: args.template,
		workflowValueKeys: Array.from(args.workflowValueKeys),
		context: args.context,
	})
	if (validationResult.valid === false) {
		throw new Error(validationResult.errorMessage)
	}

	const workflowValueKeys = new Set(args.workflowValueKeys)
	return args.template.replace(
		WORKFLOW_PROMPT_TEMPLATE_REFERENCE_PATTERN,
		(placeholder: string, reference: string | undefined): string => {
			if (reference === undefined) {
				return placeholder
			}
			if (reference.startsWith(WORKFLOW_PROMPT_TEMPLATE_WORKFLOW_PREFIX) === false) {
				return placeholder
			}

			const workflowValueKey = reference.slice(WORKFLOW_PROMPT_TEMPLATE_WORKFLOW_PREFIX.length)
			if (workflowValueKey.trim() === "") {
				return placeholder
			}
			if (workflowValueKeys.has(workflowValueKey) === false) {
				return placeholder
			}
			if (args.resolvingKeys.includes(workflowValueKey)) {
				throw new Error(
					`Workflow prompt template ${args.context} contains cyclic workflow value reference ${workflowValueKey}.`,
				)
			}

			const workflowValue = args.workflowValues[workflowValueKey]
			if (workflowValue === undefined) {
				return ""
			}

			return renderWorkflowPromptTemplateValue({
				value: workflowValue,
				workflowValueKeys,
				workflowValues: args.workflowValues,
				context: args.context,
				resolvingKeys: [...args.resolvingKeys, workflowValueKey],
			})
		},
	)
}

function resolveWorkflowPromptTemplateValue(args: WorkflowPromptTemplateRenderValueArgs): WorkflowValue {
	if (typeof args.value === "string") {
		return renderWorkflowPromptTemplateString({
			template: args.value,
			workflowValueKeys: args.workflowValueKeys,
			workflowValues: args.workflowValues,
			context: args.context,
			resolvingKeys: args.resolvingKeys,
		})
	}
	if (typeof args.value === "number" || typeof args.value === "boolean") {
		return args.value
	}
	if (Array.isArray(args.value)) {
		const resolvedValues: WorkflowValue[] = []
		for (const nestedValue of args.value) {
			resolvedValues.push(
				resolveWorkflowPromptTemplateValue({
					value: nestedValue,
					workflowValueKeys: args.workflowValueKeys,
					workflowValues: args.workflowValues,
					context: args.context,
					resolvingKeys: args.resolvingKeys,
				}),
			)
		}
		return resolvedValues
	}

	const resolvedValue: { [key: string]: WorkflowValue } = {}
	for (const [key, nestedValue] of Object.entries(args.value)) {
		resolvedValue[key] = resolveWorkflowPromptTemplateValue({
			value: nestedValue,
			workflowValueKeys: args.workflowValueKeys,
			workflowValues: args.workflowValues,
			context: args.context,
			resolvingKeys: args.resolvingKeys,
		})
	}
	return resolvedValue
}

function renderWorkflowPromptTemplateValue(args: WorkflowPromptTemplateRenderValueArgs): string {
	return stringifyWorkflowValueForPrompt(resolveWorkflowPromptTemplateValue(args))
}

export function renderWorkflowPromptTemplate(args: WorkflowPromptTemplateRenderArgs): string {
	const workflowValueKeys = new Set(args.workflowValueKeys)
	return renderWorkflowPromptTemplateString({
		template: args.template,
		workflowValueKeys,
		workflowValues: args.workflowValues,
		context: args.context,
		resolvingKeys: [],
	})
}
