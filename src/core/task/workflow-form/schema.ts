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
		case "number":
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && Array.isArray(value) === false
}

export function isWorkflowFormSubmittedValuePayload(value: unknown): value is WorkflowFormSubmittedValuePayload {
	if (isPlainRecord(value) === false) {
		return false
	}

	let typedValueCount = 0
	if (value.stringValue !== undefined) {
		typedValueCount += 1
	}
	if (value.booleanValue !== undefined) {
		typedValueCount += 1
	}
	if (value.integerValue !== undefined) {
		typedValueCount += 1
	}
	if (value.numberValue !== undefined) {
		typedValueCount += 1
	}
	if (value.arrayValue !== undefined) {
		typedValueCount += 1
	}
	if (value.objectValue !== undefined) {
		typedValueCount += 1
	}

	if (typedValueCount !== 1) {
		return false
	}

	switch (value.valueType) {
		case "string":
			return typeof value.stringValue === "string"
		case "boolean":
			return typeof value.booleanValue === "boolean"
		case "integer":
			return Number.isInteger(value.integerValue)
		case "number":
			return typeof value.numberValue === "number" && Number.isFinite(value.numberValue)
		case "array":
			return (
				Array.isArray(value.arrayValue) && value.arrayValue.every((entry) => isWorkflowFormSubmittedValuePayload(entry))
			)
		case "object":
			return (
				Array.isArray(value.objectValue) &&
				value.objectValue.every(
					(entry) =>
						isPlainRecord(entry) &&
						typeof entry.key === "string" &&
						entry.key.trim() !== "" &&
						isWorkflowFormSubmittedValuePayload(entry.value),
				)
			)
		default:
			return false
	}
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
		const arrayValue: WorkflowFormSubmittedValuePayload[] = []
		for (const entry of value.arrayValue.values) {
			const normalizedEntry = normalizeWorkflowFormSubmittedValue(entry)
			if (normalizedEntry === undefined) {
				throw new Error("Malformed workflow form submitted value: array entry is missing.")
			}
			arrayValue.push(normalizedEntry)
		}

		return {
			valueType: "array",
			arrayValue,
		}
	}

	if (value.objectValue) {
		const objectValue: WorkflowFormSubmittedValueObjectEntry[] = []
		for (const entry of value.objectValue.entries) {
			if (entry.key.trim() === "") {
				throw new Error("Malformed workflow form submitted value: object entry key is empty.")
			}

			const normalizedEntryValue = normalizeWorkflowFormSubmittedValue(entry.value)
			if (normalizedEntryValue === undefined) {
				throw new Error("Malformed workflow form submitted value: object entry value is missing.")
			}

			objectValue.push({
				key: entry.key,
				value: normalizedEntryValue,
			})
		}

		return {
			valueType: "object",
			objectValue,
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
		case "number":
			return typeof value === "number" && Number.isFinite(value)
		case "boolean":
			return typeof value === "boolean"
		case "array":
			if (!Array.isArray(value)) {
				return false
			}

			const itemSchema = schema.items
			return itemSchema ? value.every((entry) => validateToolInputAgainstWorkflowFormSchema(entry, itemSchema)) : true
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
