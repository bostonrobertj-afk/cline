import {
	mergeWorkflowPlaceholderMaps,
	resolveWorkflowPlaceholderText,
	type WorkflowPlaceholderMap,
} from "./workflow-placeholders"

export type PlaceholderWorkflowValueMap = WorkflowPlaceholderMap

export function getPlaceholderWorkflowValueMap(
	stableValues?: PlaceholderWorkflowValueMap,
	dynamicValues?: PlaceholderWorkflowValueMap,
): PlaceholderWorkflowValueMap | undefined {
	const merged = mergeWorkflowPlaceholderMaps(stableValues, dynamicValues)
	return Object.keys(merged).length > 0 ? merged : undefined
}

export function resolvePlaceholderWorkflowText(
	text: string | undefined,
	placeholders?: PlaceholderWorkflowValueMap,
): string | undefined {
	if (!placeholders || Object.keys(placeholders).length === 0) {
		return text
	}
	return resolveWorkflowPlaceholderText(text, placeholders)
}
