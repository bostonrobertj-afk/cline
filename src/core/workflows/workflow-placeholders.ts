import fs from "fs/promises"
import * as yaml from "js-yaml"
import path from "path"

export type WorkflowPlaceholderMap = Record<string, string>
export const CANONICAL_WORKFLOW_CONFIG_RELATIVE_PATH = path.join(".cline", "workflow-config.yaml")
const WORKFLOW_PLACEHOLDER_TOKEN_REGEX = /\{\{\s*([^{}]+?)\s*\}\}|\{\s*([^{}]+?)\s*\}/g

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0
}

export function toWorkflowPlaceholderString(value: unknown): string | undefined {
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

function resolveToken(text: string, placeholders: WorkflowPlaceholderMap, pattern: RegExp): string {
	return text.replace(pattern, (match, rawKey) => {
		const key = String(rawKey ?? "").trim()
		const resolved = placeholders[key]
		return resolved !== undefined ? resolved : match
	})
}

export function resolveWorkflowPlaceholderText(
	text: string | undefined,
	placeholders: WorkflowPlaceholderMap,
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

export function mergeWorkflowPlaceholderMaps(...maps: Array<WorkflowPlaceholderMap | undefined>): WorkflowPlaceholderMap {
	return Object.assign({}, ...maps.filter((map): map is WorkflowPlaceholderMap => !!map))
}

export function findUnresolvedWorkflowPlaceholders(text: string | undefined): string[] {
	if (!isNonEmptyString(text)) {
		return []
	}

	const unresolved = new Set<string>()
	for (const match of text.matchAll(WORKFLOW_PLACEHOLDER_TOKEN_REGEX)) {
		unresolved.add(match[0])
	}

	return Array.from(unresolved)
}

function toConfigSource(cwd: string, configPath?: string): string | undefined {
	if (!configPath) {
		return undefined
	}

	const relativePath = path.relative(cwd, configPath)
	const normalizedPath = (relativePath && !relativePath.startsWith("..") ? relativePath : configPath).replace(/\\/g, "/")
	return normalizedPath
}

export function getCanonicalWorkflowConfigPath(cwd: string): string {
	return path.resolve(cwd, CANONICAL_WORKFLOW_CONFIG_RELATIVE_PATH)
}

export async function buildWorkflowStablePlaceholders(args: {
	cwd: string
	configPath?: string
}): Promise<WorkflowPlaceholderMap> {
	const configPath = args.configPath ?? getCanonicalWorkflowConfigPath(args.cwd)
	const configSource = toConfigSource(args.cwd, configPath)
	const placeholders: WorkflowPlaceholderMap = {
		"project-root": args.cwd,
		project_root: args.cwd,
		cwd: args.cwd,
		date: new Date().toISOString().split("T")[0],
		...(configSource ? { config_source: configSource } : {}),
	}

	try {
		const raw = await fs.readFile(configPath, "utf8")
		const parsed = yaml.load(raw, { schema: yaml.JSON_SCHEMA })
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
				const rawValue = toWorkflowPlaceholderString(value)
				if (!rawValue) {
					continue
				}

				const resolvedValue = resolveWorkflowPlaceholderText(rawValue, placeholders)
				if (resolvedValue) {
					placeholders[key] = resolvedValue
				}
			}
		}
	} catch {
		// If the config is missing or malformed, keep the base runtime placeholders.
	}

	for (let pass = 0; pass < 2; pass++) {
		let changed = false
		for (const [key, value] of Object.entries(placeholders)) {
			const resolvedValue = resolveWorkflowPlaceholderText(value, placeholders)
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
