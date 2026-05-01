import type { WorkflowValue, WorkflowValues } from "./types"

function isPlainWorkflowObject(value: object): boolean {
	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

function isWorkflowValueInternal(value: unknown, seenObjects: WeakSet<object>): value is WorkflowValue {
	if (typeof value === "string" || typeof value === "boolean") {
		return true
	}

	if (typeof value === "number") {
		return Number.isFinite(value)
	}

	if (value === null || typeof value !== "object") {
		return false
	}

	if (seenObjects.has(value)) {
		return false
	}
	seenObjects.add(value)

	if (Array.isArray(value)) {
		return value.every((entry) => isWorkflowValueInternal(entry, seenObjects))
	}

	if (!isPlainWorkflowObject(value)) {
		return false
	}

	return Object.values(value).every((entry) => isWorkflowValueInternal(entry, seenObjects))
}

export function isWorkflowValue(value: unknown): value is WorkflowValue {
	return isWorkflowValueInternal(value, new WeakSet<object>())
}

function buildStableJsonValue(value: WorkflowValue): WorkflowValue {
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
		return value
	}

	if (Array.isArray(value)) {
		return value.map((entry) => buildStableJsonValue(entry))
	}

	const sortedValue: { [key: string]: WorkflowValue } = {}
	for (const key of Object.keys(value).sort()) {
		sortedValue[key] = buildStableJsonValue(value[key])
	}

	return sortedValue
}

function stableStringifyWorkflowValue(value: WorkflowValue): string {
	return JSON.stringify(buildStableJsonValue(value))
}

export function areWorkflowValuesEqual(left: WorkflowValue | undefined, right: WorkflowValue): boolean {
	if (left === undefined) {
		return false
	}

	return stableStringifyWorkflowValue(left) === stableStringifyWorkflowValue(right)
}

export function readRequiredStringWorkflowValue(args: { workflowValues: WorkflowValues; key: string; context: string }): string {
	const value = args.workflowValues[args.key]
	if (typeof value !== "string") {
		throw new Error(`Workflow value ${args.key} must be a non-empty string for ${args.context}.`)
	}

	const trimmedValue = value.trim()
	if (trimmedValue === "") {
		throw new Error(`Workflow value ${args.key} must be a non-empty string for ${args.context}.`)
	}

	return trimmedValue
}

export function stringifyWorkflowValueForPrompt(value: WorkflowValue): string {
	if (typeof value === "string") {
		return value
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return String(value)
	}

	return stableStringifyWorkflowValue(value)
}
