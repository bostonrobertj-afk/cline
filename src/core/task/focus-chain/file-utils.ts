import { isFocusChainItem } from "@shared/focus-chain-utils"
import * as fs from "fs/promises"
import * as path from "path"
import { ensureTaskDirectoryExists } from "../../storage/disk"
import type { FocusChainChecklistUpdateResult, ParsedFocusChainItem } from "./types"

export interface FocusChainStorageIdentity {
	key?: string
	scope?: "task" | "subagent"
}

function sanitizeFocusChainStorageKey(storageKey: string): string {
	return storageKey.replace(/[^a-zA-Z0-9._-]/g, "_")
}

/**
 * Generate the standard file path for a task's focusChain markdown file
 */
export function getFocusChainFilePath(taskDir: string, taskId: string, storageIdentity?: FocusChainStorageIdentity): string {
	const storageKey = sanitizeFocusChainStorageKey(storageIdentity?.key ?? taskId)
	if (storageIdentity?.scope === "subagent") {
		return path.join(taskDir, "subagents", `focus_chain_subagent_${storageKey}.md`)
	}

	return path.join(taskDir, `focus_chain_taskid_${storageKey}.md`)
}

/**
 * Create the standard markdown content structure for a focusChain file
 */
export function createFocusChainMarkdownContent(
	taskId: string,
	focusChainList: string,
	documentLabel = `Task ${taskId}`,
): string {
	return `# Focus Chain List for ${documentLabel}

<!-- Edit this markdown file to update your focus chain list -->
<!-- Use the format: - [ ] for incomplete items and - [x] for completed items -->

${focusChainList}

<!-- Save this file and the focus chain list will be updated in the task -->`
}

/**
 * Extract focusChain items from text content (markdown or message text)
 * Returns array of lines that match focusChain item format
 */
export function extractFocusChainItemsFromText(text: string): string[] {
	const lines = text.split("\n")
	return lines.filter((line) => {
		const trimmed = line.trim()
		return isFocusChainItem(trimmed)
	})
}

/**
 * Extract focusChain items and return as joined string, or null if no items found
 */
export function extractFocusChainListFromText(text: string): string | null {
	const focusChainLines = extractFocusChainItemsFromText(text)
	return focusChainLines.length > 0 ? focusChainLines.join("\n") : null
}

export function normalizeFocusChainItemLabel(label: string): string {
	return label.trim().replace(/\s+/g, " ")
}

export function parseFocusChainChecklistItems(text: string): ParsedFocusChainItem[] {
	return extractFocusChainItemsFromText(text)
		.map((line) => {
			const trimmedLine = line.trim()
			const checkedMatch = /^\s*-\s*\[([ xX])\]\s*(.+)$/.exec(trimmedLine)
			if (!checkedMatch) {
				return undefined
			}

			const label = checkedMatch[2].trim()
			return {
				checked: checkedMatch[1] === "x" || checkedMatch[1] === "X",
				label,
				normalizedLabel: normalizeFocusChainItemLabel(label),
			}
		})
		.filter((item): item is ParsedFocusChainItem => !!item)
}

export function formatFocusChainChecklistItem(checked: boolean, label: string): string {
	return `${checked ? "- [x]" : "- [ ]"} ${label.trim()}`
}

export function evaluateFocusChainChecklistUpdate(
	existingChecklist: string,
	incomingChecklist: string,
): FocusChainChecklistUpdateResult {
	const existingItems = parseFocusChainChecklistItems(existingChecklist)
	const incomingItems = parseFocusChainChecklistItems(incomingChecklist)

	if (existingItems.length !== incomingItems.length) {
		return {
			accepted: false,
			feedback: buildFocusChainChecklistRejectionFeedback(existingChecklist),
		}
	}

	for (let i = 0; i < existingItems.length; i++) {
		if (existingItems[i].normalizedLabel !== incomingItems[i].normalizedLabel) {
			return {
				accepted: false,
				feedback: buildFocusChainChecklistRejectionFeedback(existingChecklist),
			}
		}
	}

	return {
		accepted: true,
		checklist:
			existingItems.length === 0
				? incomingChecklist.trim()
				: existingItems
						.map((existingItem, index) =>
							formatFocusChainChecklistItem(incomingItems[index].checked, existingItem.label),
						)
						.join("\n"),
	}
}

export function buildFocusChainChecklistRejectionFeedback(existingChecklist: string): string {
	return [
		"A task list already exists.",
		"Do not replace it with a different shape. Only checkbox states may change.",
		"Complete it or ask the human to cancel it before creating a new one.",
		"Current checklist:",
		existingChecklist.trim(),
	]
		.filter((part) => part.length > 0)
		.join("\n\n")
}

/**
 * Ensure a focusChain file exists, creating it with provided content if it doesn't exist
 * Returns the file path
 */
export async function ensureFocusChainFile(
	taskId: string,
	initialFocusChainContent?: string,
	storageIdentity?: FocusChainStorageIdentity,
	documentLabel?: string,
): Promise<string> {
	const taskDir = await ensureTaskDirectoryExists(taskId)
	const focusChainFilePath = getFocusChainFilePath(taskDir, taskId, storageIdentity)

	// Check if file exists
	let fileExists = false
	try {
		await fs.access(focusChainFilePath)
		fileExists = true
	} catch {
		// File doesn't exist
	}

	// Create file if it doesn't exist
	if (!fileExists) {
		const focusChainContent =
			initialFocusChainContent ||
			`- [ ] Example checklist item
- [ ] Another checklist item
- [x] Completed example item`

		await fs.mkdir(path.dirname(focusChainFilePath), { recursive: true })
		const fileContent = createFocusChainMarkdownContent(taskId, focusChainContent, documentLabel)
		await fs.writeFile(focusChainFilePath, fileContent, "utf8")
	}

	return focusChainFilePath
}
