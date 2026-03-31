import { extractWorkflowPlaceholderKeys } from "@/core/workflows/workflow-placeholders"
import type { WorkflowFormStartRequirements } from "./types"

export const REQUIRED_DIRECTIVE_PREFIX = "Required:"
export const OPTIONAL_DIRECTIVE_PREFIX = "Optional:"
export const ONE_OF_DIRECTIVE_PREFIX = "One of:"
export const WORKFLOW_START_ONE_OF_LIMIT = 5

function parseDirectiveFieldKeys(value: string): string[] {
	return value
		.split(",")
		.map((segment) => segment.trim())
		.flatMap((segment) => extractWorkflowPlaceholderKeys(segment))
}

function dedupeFieldKeys(fieldKeys: string[]): string[] {
	return fieldKeys.filter((key, index) => fieldKeys.indexOf(key) === index)
}

export function parseWorkflowStartRequirements(rawDetails: string): WorkflowFormStartRequirements | undefined {
	const lines = rawDetails.split("\n").map((line) => line.trim())
	const requiredFieldKeys = dedupeFieldKeys(
		lines
			.filter((line) => line.startsWith(REQUIRED_DIRECTIVE_PREFIX))
			.flatMap((line) => parseDirectiveFieldKeys(line.slice(REQUIRED_DIRECTIVE_PREFIX.length))),
	)
	const optionalFieldKeys = dedupeFieldKeys(
		lines
			.filter((line) => line.startsWith(OPTIONAL_DIRECTIVE_PREFIX))
			.flatMap((line) => parseDirectiveFieldKeys(line.slice(OPTIONAL_DIRECTIVE_PREFIX.length))),
	).filter((key) => !requiredFieldKeys.includes(key))
	const firstOneOfLine = lines.find((line) => line.startsWith(ONE_OF_DIRECTIVE_PREFIX))
	const parsedOneOfFieldKeys = firstOneOfLine
		? parseDirectiveFieldKeys(firstOneOfLine.slice(ONE_OF_DIRECTIVE_PREFIX.length)).slice(0, WORKFLOW_START_ONE_OF_LIMIT)
		: []
	const oneOfFieldKeys = parsedOneOfFieldKeys.length >= 2 ? parsedOneOfFieldKeys : undefined

	if (requiredFieldKeys.length === 0 && optionalFieldKeys.length === 0 && !oneOfFieldKeys) {
		return undefined
	}

	return {
		requiredFieldKeys,
		optionalFieldKeys,
		oneOfRequirement: oneOfFieldKeys
			? {
					id: "workflow_start_one_of",
					fieldKeys: oneOfFieldKeys,
				}
			: undefined,
	}
}
