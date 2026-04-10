import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { getBackendWorkflowToolContract } from "@/core/task/tools/backendWorkflowToolContracts"
import type {
	BackendWorkflowToolContract,
	BackendWorkflowToolParameterContract,
	BackendWorkflowToolSchemaNode,
} from "@/core/task/tools/backendWorkflowToolContractTypes"
import type {
	WorkflowFormFieldKind,
	WorkflowFormJsonSchema,
	WorkflowFormOptionDefinition,
	WorkflowFormSubmittedValueObjectEntry,
	WorkflowFormSubmittedValuePayload,
} from "@/shared/ExtensionMessage"
import { ModelFamily } from "@/shared/prompts"
import type { WorkflowFormValue } from "@/shared/proto/cline/task"
import { ClineDefaultTool } from "@/shared/tools"

export interface WorkflowFormFieldSchemaBinding {
	parameterName: string
	propertyPath?: string[]
	useAdditionalProperties?: boolean
}

type WorkflowFormSchemaSource = BackendWorkflowToolSchemaNode

export function resolveWorkflowFormToolContract(toolName: ClineDefaultTool): BackendWorkflowToolContract {
	const backendToolContract = getBackendWorkflowToolContract(toolName)
	if (backendToolContract) {
		return backendToolContract
	}

	registerClineToolSets()
	const tool = ClineToolSet.getToolByNameWithFallback(toolName, ModelFamily.GENERIC)
	if (!tool) {
		throw new Error(`Unknown workflow-form tool contract: ${toolName}`)
	}

	return {
		id: tool.config.id,
		name: tool.config.name,
		parameters: (tool.config.parameters ?? []).map(
			(parameter): BackendWorkflowToolParameterContract => ({
				name: parameter.name,
				required: parameter.required,
				description: parameter.description,
				type: parameter.type,
				enum: parameter.enum,
				const: parameter.const as string | number | boolean | undefined,
				items: parameter.items as BackendWorkflowToolSchemaNode | undefined,
				properties: parameter.properties as Record<string, BackendWorkflowToolSchemaNode> | undefined,
				requiredProperties: parameter.requiredProperties,
				additionalProperties: parameter.additionalProperties as BackendWorkflowToolSchemaNode | undefined,
				oneOf: parameter.oneOf as BackendWorkflowToolSchemaNode[] | undefined,
			}),
		),
	}
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
	const tool = resolveWorkflowFormToolContract(toolName)
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

export function deriveWorkflowFormFieldKind(schema: WorkflowFormJsonSchema): WorkflowFormFieldKind {
	if (schema.enum?.every((value) => typeof value === "string")) {
		return "dropdown"
	}

	switch (schema.type) {
		case "boolean":
			return "boolean"
		case "integer":
			return "number"
		case "array":
			return schema.items?.type === "string" ? "multi_select" : "large_text"
		case "object":
			return "large_text"
		default:
			return "small_text"
	}
}

export function deriveWorkflowFormOptions(schema: WorkflowFormJsonSchema): WorkflowFormOptionDefinition[] | undefined {
	if (schema.enum?.every((value) => typeof value === "string")) {
		return schema.enum.map((value) => ({ value, label: value }))
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

function hasSingleTypedValue(value: WorkflowFormValue): boolean {
	return (
		[
			value.stringValue,
			value.booleanValue,
			value.integerValue,
			value.numberValue,
			value.arrayValue,
			value.objectValue,
		].filter((entry) => entry !== undefined).length === 1
	)
}

export function normalizeWorkflowFormSubmittedValue(
	value: WorkflowFormValue | undefined,
): WorkflowFormSubmittedValuePayload | undefined {
	if (!value) {
		return undefined
	}

	if (!hasSingleTypedValue(value)) {
		throw new Error("Workflow form submission values must contain exactly one typed value.")
	}

	if (value.stringValue !== undefined) {
		return {
			valueType: "string",
			stringValue: value.stringValue,
		}
	}

	if (value.booleanValue !== undefined) {
		return {
			valueType: "boolean",
			booleanValue: value.booleanValue,
		}
	}

	if (value.integerValue !== undefined) {
		return {
			valueType: "integer",
			integerValue: value.integerValue,
		}
	}

	if (value.numberValue !== undefined) {
		return {
			valueType: "number",
			numberValue: value.numberValue,
		}
	}

	if (value.arrayValue) {
		return {
			valueType: "array",
			arrayValue: value.arrayValue.values
				.map((entry) => normalizeWorkflowFormSubmittedValue(entry))
				.filter((entry): entry is WorkflowFormSubmittedValuePayload => entry !== undefined),
		}
	}

	if (value.objectValue) {
		return {
			valueType: "object",
			objectValue: value.objectValue.entries
				.map((entry): WorkflowFormSubmittedValueObjectEntry | undefined => {
					const normalized = normalizeWorkflowFormSubmittedValue(entry.value)
					if (!normalized) {
						return undefined
					}

					return {
						key: entry.key,
						value: normalized,
					}
				})
				.filter((entry): entry is WorkflowFormSubmittedValueObjectEntry => entry !== undefined),
		}
	}

	return undefined
}

export function convertWorkflowFormSubmittedValueToToolInput(value: WorkflowFormSubmittedValuePayload | undefined): unknown {
	if (!value) {
		return undefined
	}

	switch (value.valueType) {
		case "string":
			return value.stringValue
		case "boolean":
			return value.booleanValue
		case "integer":
			return value.integerValue
		case "number":
			return value.numberValue
		case "array":
			return (value.arrayValue ?? []).map((entry) => convertWorkflowFormSubmittedValueToToolInput(entry))
		case "object":
			return Object.fromEntries(
				(value.objectValue ?? []).map((entry) => [entry.key, convertWorkflowFormSubmittedValueToToolInput(entry.value)]),
			)
		default:
			return undefined
	}
}

function validateToolInputAgainstWorkflowFormSchema(value: unknown, schema: WorkflowFormJsonSchema): boolean {
	if (schema.oneOf?.length) {
		return schema.oneOf.some((variant) => validateToolInputAgainstWorkflowFormSchema(value, variant))
	}

	if (schema.const !== undefined) {
		return value === schema.const
	}

	if (schema.enum) {
		return typeof value === "string" && schema.enum.includes(value)
	}

	switch (schema.type) {
		case "string":
			return typeof value === "string"
		case "integer":
			return Number.isInteger(value)
		case "boolean":
			return typeof value === "boolean"
		case "array":
			if (!Array.isArray(value)) {
				return false
			}

			return schema.items ? value.every((entry) => validateToolInputAgainstWorkflowFormSchema(entry, schema.items!)) : true
		case "object": {
			if (!value || typeof value !== "object" || Array.isArray(value)) {
				return false
			}

			const objectValue = value as Record<string, unknown>
			const requiredKeys = schema.required ?? []
			if (requiredKeys.some((key) => objectValue[key] === undefined)) {
				return false
			}

			const declaredProperties = schema.properties ?? {}
			for (const [key, propertySchema] of Object.entries(declaredProperties)) {
				if (
					objectValue[key] !== undefined &&
					!validateToolInputAgainstWorkflowFormSchema(objectValue[key], propertySchema)
				) {
					return false
				}
			}

			if (schema.additionalProperties) {
				const declaredKeys = new Set(Object.keys(declaredProperties))
				for (const [key, entryValue] of Object.entries(objectValue)) {
					if (
						!declaredKeys.has(key) &&
						!validateToolInputAgainstWorkflowFormSchema(entryValue, schema.additionalProperties)
					) {
						return false
					}
				}
			}

			return true
		}
		default:
			return false
	}
}

export function validateWorkflowFormSubmittedValueAgainstSchema(
	value: WorkflowFormSubmittedValuePayload | undefined,
	schema: WorkflowFormJsonSchema,
): boolean {
	return validateToolInputAgainstWorkflowFormSchema(convertWorkflowFormSubmittedValueToToolInput(value), schema)
}
