import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import type {
	WorkflowFormFieldControl,
	WorkflowFormFieldOption,
	WorkflowFormJsonSchema,
	WorkflowFormJsonSchemaType,
} from "@/shared/ExtensionMessage"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

export interface WorkflowFormFieldSchemaBinding {
	parameterName: string
	propertyPath?: string[]
	useAdditionalProperties?: boolean
}

type WorkflowFormSchemaSource = {
	type?: WorkflowFormJsonSchemaType
	enum?: unknown
	const?: string | number | boolean
	items?: WorkflowFormSchemaSource
	properties?: Record<string, WorkflowFormSchemaSource>
	required?: string[] | boolean
	requiredProperties?: string[]
	additionalProperties?: WorkflowFormSchemaSource
	oneOf?: WorkflowFormSchemaSource[]
}

export function resolveWorkflowFormToolSpec(toolName: ClineDefaultTool): ClineToolSpec {
	registerClineToolSets()
	const tool = ClineToolSet.getToolByNameWithFallback(toolName, ModelFamily.GENERIC)
	if (!tool) {
		throw new Error(`Unknown workflow-form tool spec: ${toolName}`)
	}

	return tool.config
}

function normalizeWorkflowFormSchema(schema: WorkflowFormSchemaSource | undefined): WorkflowFormJsonSchema {
	if (!schema?.type) {
		throw new Error("Workflow form schema binding could not be resolved.")
	}

	const normalized: WorkflowFormJsonSchema = {
		type: schema.type,
	}

	if (Array.isArray(schema.enum) && schema.enum.every((value): value is string => typeof value === "string")) {
		normalized.enum = schema.enum
	}

	if (schema.const !== undefined) {
		normalized.const = schema.const
	}

	if (schema.items) {
		normalized.items = normalizeWorkflowFormSchema(schema.items)
	}

	if (schema.properties) {
		normalized.properties = Object.fromEntries(
			Object.entries(schema.properties).map(([key, value]) => [key, normalizeWorkflowFormSchema(value)]),
		)
	}

	const required = Array.isArray(schema.required) ? schema.required : schema.requiredProperties
	if (required) {
		normalized.required = required
	}

	if (schema.additionalProperties) {
		normalized.additionalProperties = normalizeWorkflowFormSchema(schema.additionalProperties)
	}

	if (schema.oneOf) {
		normalized.oneOf = schema.oneOf.map((entry) => normalizeWorkflowFormSchema(entry))
	}

	return normalized
}

export function resolveWorkflowFormSchema(
	toolName: ClineDefaultTool,
	binding: WorkflowFormFieldSchemaBinding,
): WorkflowFormJsonSchema {
	const tool = resolveWorkflowFormToolSpec(toolName)
	const parameter = tool.parameters?.find((entry) => entry.name === binding.parameterName)
	if (!parameter) {
		throw new Error("Workflow form schema binding could not be resolved.")
	}

	if (binding.useAdditionalProperties === true) {
		if (!parameter.additionalProperties) {
			throw new Error("Workflow form schema binding could not be resolved.")
		}

		return normalizeWorkflowFormSchema(parameter.additionalProperties)
	}

	if (binding.propertyPath) {
		let currentSchema: WorkflowFormSchemaSource | undefined = parameter
		for (const segment of binding.propertyPath) {
			currentSchema = currentSchema?.properties?.[segment]
			if (!currentSchema) {
				throw new Error("Workflow form schema binding could not be resolved.")
			}
		}

		return normalizeWorkflowFormSchema(currentSchema)
	}

	return normalizeWorkflowFormSchema(parameter)
}

export function deriveWorkflowFormControl(schema: WorkflowFormJsonSchema): WorkflowFormFieldControl {
	if (schema.enum?.every((value) => typeof value === "string")) {
		return "select"
	}

	switch (schema.type) {
		case "boolean":
			return "select"
		case "integer":
			return "number"
		case "array":
		case "object":
			return "textarea"
		default:
			return "text"
	}
}

export function deriveWorkflowFormOptions(schema: WorkflowFormJsonSchema): WorkflowFormFieldOption[] | undefined {
	if (schema.enum?.every((value) => typeof value === "string")) {
		return schema.enum.map((value) => ({ value, label: value }))
	}

	if (schema.type === "boolean") {
		return [
			{ value: "true", label: "True" },
			{ value: "false", label: "False" },
		]
	}

	return undefined
}

export function resolveWorkflowFormOneOfVariant(
	schema: WorkflowFormJsonSchema,
	discriminatorProperty: string,
	discriminatorValue: string | undefined,
): WorkflowFormJsonSchema | undefined {
	if (!discriminatorValue) {
		return undefined
	}

	for (const variant of schema.oneOf ?? []) {
		const discriminatorSchema = variant.properties?.[discriminatorProperty]
		if (discriminatorSchema?.const === discriminatorValue) {
			return variant
		}
	}

	return undefined
}

export function parseWorkflowFormRawValue(rawValue: string | undefined, schema: WorkflowFormJsonSchema): unknown {
	const trimmedRawValue = rawValue?.trim()
	if (!trimmedRawValue) {
		return undefined
	}

	switch (schema.type) {
		case "string":
			return trimmedRawValue
		case "integer":
			if (!/^-?\d+$/.test(trimmedRawValue)) {
				return undefined
			}

			return Number.parseInt(trimmedRawValue, 10)
		case "boolean":
			if (/^true$/i.test(trimmedRawValue)) {
				return true
			}
			if (/^false$/i.test(trimmedRawValue)) {
				return false
			}
			return undefined
		case "array":
			if (schema.items?.type === "string") {
				return trimmedRawValue
					.split("\n")
					.map((line) => line.trim())
					.filter((line) => line.length > 0)
			}

			try {
				const parsedValue = JSON.parse(trimmedRawValue)
				return Array.isArray(parsedValue) ? parsedValue : undefined
			} catch {
				return undefined
			}
		case "object":
			try {
				const parsedValue = JSON.parse(trimmedRawValue)
				return parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue) ? parsedValue : undefined
			} catch {
				return undefined
			}
		default:
			return trimmedRawValue
	}
}
