import path from "path"
import {
	buildWorkflowStablePlaceholders,
	mergeWorkflowPlaceholderMaps,
	resolveWorkflowPlaceholderText,
	toWorkflowPlaceholderString,
	type WorkflowPlaceholderMap,
} from "@/core/workflows/workflow-placeholders"
import type { ManagedWorkflowRunState } from "./types"

export type ManagedWorkflowPlaceholderMap = WorkflowPlaceholderMap

export function resolveManagedWorkflowPlaceholderText(
	text: string | undefined,
	placeholders: ManagedWorkflowPlaceholderMap,
): string | undefined {
	return resolveWorkflowPlaceholderText(text, placeholders)
}

export function mergeManagedWorkflowPlaceholderMaps(
	...maps: Array<ManagedWorkflowPlaceholderMap | undefined>
): ManagedWorkflowPlaceholderMap {
	return mergeWorkflowPlaceholderMaps(...maps)
}

export function getManagedWorkflowPlaceholderMap(
	run: Pick<ManagedWorkflowRunState, "stablePlaceholders" | "dynamicPlaceholders">,
): ManagedWorkflowPlaceholderMap {
	return mergeManagedWorkflowPlaceholderMaps(run.stablePlaceholders, run.dynamicPlaceholders)
}

export async function buildManagedWorkflowStablePlaceholders(
	cwd: string,
	moduleName: string,
): Promise<ManagedWorkflowPlaceholderMap> {
	return buildWorkflowStablePlaceholders({
		cwd,
		configPath: path.resolve(cwd, "_bmad", moduleName, "config.yaml"),
	})
}

export function updateManagedWorkflowDynamicPlaceholders(
	run: ManagedWorkflowRunState,
	values: Record<string, unknown>,
): ManagedWorkflowRunState {
	return applyManagedWorkflowDynamicPlaceholders(run, values).run
}

export function applyManagedWorkflowDynamicPlaceholders(
	run: ManagedWorkflowRunState,
	values: Record<string, unknown>,
): {
	run: ManagedWorkflowRunState
	changedKeys: string[]
	unchangedKeys: string[]
	unchangedDynamicKeys: string[]
	unchangedStableKeys: string[]
} {
	const current = getManagedWorkflowPlaceholderMap(run)
	const updatedDynamicPlaceholders = { ...(run.dynamicPlaceholders ?? {}) }
	const changedKeys: string[] = []
	const unchangedKeys: string[] = []
	const unchangedDynamicKeys: string[] = []
	const unchangedStableKeys: string[] = []

	for (const [key, value] of Object.entries(values)) {
		const rawValue = toWorkflowPlaceholderString(value)
		if (!rawValue) {
			continue
		}

		const resolvedValue = resolveManagedWorkflowPlaceholderText(rawValue, current)
		if (resolvedValue) {
			if (current[key] === resolvedValue) {
				unchangedKeys.push(key)
				if (run.dynamicPlaceholders?.[key] === resolvedValue) {
					unchangedDynamicKeys.push(key)
				} else if (run.stablePlaceholders?.[key] === resolvedValue) {
					unchangedStableKeys.push(key)
				}
				continue
			}

			updatedDynamicPlaceholders[key] = resolvedValue
			current[key] = resolvedValue
			changedKeys.push(key)
		}
	}

	if (changedKeys.length === 0) {
		return { run, changedKeys, unchangedKeys, unchangedDynamicKeys, unchangedStableKeys }
	}

	return {
		run: {
			...run,
			dynamicPlaceholders: updatedDynamicPlaceholders,
			updatedAt: Date.now(),
		},
		changedKeys,
		unchangedKeys,
		unchangedDynamicKeys,
		unchangedStableKeys,
	}
}
