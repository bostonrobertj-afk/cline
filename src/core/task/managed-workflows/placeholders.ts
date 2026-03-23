import fs from "fs/promises"
import * as yaml from "js-yaml"
import path from "path"
import type { ManagedWorkflowRunState } from "./types"

export type ManagedWorkflowPlaceholderMap = Record<string, string>

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0
}

function toPlaceholderString(value: unknown): string | undefined {
	if (value == null) {
		return undefined
	}

	if (typeof value === "string") {
		return value.trim().length > 0 ? value : undefined
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return String(value)
	}

	if (typeof value === "object") {
		try {
			return JSON.stringify(value)
		} catch {
			return undefined
		}
	}

	return undefined
}

function resolveToken(text: string, placeholders: ManagedWorkflowPlaceholderMap, pattern: RegExp): string {
	return text.replace(pattern, (match, rawKey) => {
		const key = String(rawKey ?? "").trim()
		const resolved = placeholders[key]
		return resolved !== undefined ? resolved : match
	})
}

export function resolveManagedWorkflowPlaceholderText(
	text: string | undefined,
	placeholders: ManagedWorkflowPlaceholderMap,
): string | undefined {
	if (!isNonEmptyString(text)) {
		return text
	}

	let resolved = text
	for (let pass = 0; pass < 3; pass++) {
		const doubleCurlyResolved = resolveToken(resolved, placeholders, /\{\{\s*([^{}]+?)\s*\}\}/g)
		const singleCurlyResolved = resolveToken(doubleCurlyResolved, placeholders, /\{\s*([^{}]+?)\s*\}/g)
		if (singleCurlyResolved === resolved) {
			break
		}
		resolved = singleCurlyResolved
	}

	return resolved
}

export function mergeManagedWorkflowPlaceholderMaps(
	...maps: Array<ManagedWorkflowPlaceholderMap | undefined>
): ManagedWorkflowPlaceholderMap {
	return Object.assign({}, ...maps.filter((map): map is ManagedWorkflowPlaceholderMap => !!map))
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
	const placeholders: ManagedWorkflowPlaceholderMap = {
		"project-root": cwd,
		project_root: cwd,
		cwd,
		date: new Date().toISOString().split("T")[0],
		config_source: path.posix.join("_bmad", moduleName, "config.yaml"),
	}

	const configPath = path.resolve(cwd, "_bmad", moduleName, "config.yaml")
	try {
		const raw = await fs.readFile(configPath, "utf8")
		const parsed = yaml.load(raw, { schema: yaml.JSON_SCHEMA })
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
				const rawValue = toPlaceholderString(value)
				if (!rawValue) {
					continue
				}

				const resolvedValue = resolveManagedWorkflowPlaceholderText(rawValue, placeholders)
				if (resolvedValue) {
					placeholders[key] = resolvedValue
				}
			}
		}
	} catch {
		// If the module config is missing or malformed, keep the base runtime placeholders.
	}

	for (let pass = 0; pass < 2; pass++) {
		let changed = false
		for (const [key, value] of Object.entries(placeholders)) {
			const resolvedValue = resolveManagedWorkflowPlaceholderText(value, placeholders)
			if (resolvedValue && resolvedValue !== value) {
				placeholders[key] = resolvedValue
				changed = true
			}
		}

		if (!changed) {
			break
		}
	}

	return placeholders
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
} {
	const current = getManagedWorkflowPlaceholderMap(run)
	const updatedDynamicPlaceholders = { ...(run.dynamicPlaceholders ?? {}) }
	const changedKeys: string[] = []
	const unchangedKeys: string[] = []

	for (const [key, value] of Object.entries(values)) {
		const rawValue = toPlaceholderString(value)
		if (!rawValue) {
			continue
		}

		const resolvedValue = resolveManagedWorkflowPlaceholderText(rawValue, current)
		if (resolvedValue) {
			if (updatedDynamicPlaceholders[key] === resolvedValue) {
				unchangedKeys.push(key)
				continue
			}

			updatedDynamicPlaceholders[key] = resolvedValue
			current[key] = resolvedValue
			changedKeys.push(key)
		}
	}

	if (changedKeys.length === 0) {
		return { run, changedKeys, unchangedKeys }
	}

	return {
		run: {
			...run,
			dynamicPlaceholders: updatedDynamicPlaceholders,
			updatedAt: Date.now(),
		},
		changedKeys,
		unchangedKeys,
	}
}
