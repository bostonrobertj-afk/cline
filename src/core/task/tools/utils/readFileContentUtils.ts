import { structuredPatch } from "diff"

const SNAPSHOT_MAX_CHARS = 150_000
const DIFF_CONTEXT_LINES = 2
const DIFF_MAX_CHARS = 16_000
const DIFF_MAX_HUNKS = 12
const DIFF_FALLBACK_RATIO = 0.75
export const MAX_FULL_SOURCE_READ_LINES = 300
export const MAX_FULL_SOURCE_READ_BYTES = 16_384
export const SOURCE_RANGE_OVERLAP_REUSE_RATIO = 0.6
export const MAX_TRACKED_SOURCE_WINDOWS_PER_FILE = 12

export function createReadFileSnapshot(text: string, hasImageBlock: boolean): string | undefined {
	if (hasImageBlock || text.length === 0 || text.length > SNAPSHOT_MAX_CHARS) {
		return undefined
	}

	return text
}

export function buildReadFileDelta(displayPath: string, previousText: string, nextText: string): string | undefined {
	const patch = structuredPatch(displayPath, displayPath, previousText, nextText, "previous", "current", {
		context: DIFF_CONTEXT_LINES,
	})

	if (patch.hunks.length === 0 || patch.hunks.length > DIFF_MAX_HUNKS) {
		return undefined
	}

	const hunks = patch.hunks
		.map((hunk) => `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n${hunk.lines.join("\n")}`)
		.join("\n\n")

	if (
		hunks.length === 0 ||
		hunks.length > DIFF_MAX_CHARS ||
		hunks.length >= Math.max(1, Math.floor(nextText.length * DIFF_FALLBACK_RATIO))
	) {
		return undefined
	}

	return `[File changed since last read] '${displayPath}' changed since your previous full read in this task. Returning only the changed hunks. Use read_file_range if you need more nearby context.\n\n${hunks}`
}

export function getTextLineCount(text: string): number {
	return text.length === 0 ? 0 : text.split("\n").length
}

export function evaluateFullSourceReadAllowance(text: string): {
	allowed: boolean
	totalBytes: number
	totalLines: number
} {
	const totalBytes = Buffer.byteLength(text, "utf8")
	const totalLines = getTextLineCount(text)

	return {
		allowed: totalBytes <= MAX_FULL_SOURCE_READ_BYTES && totalLines <= MAX_FULL_SOURCE_READ_LINES,
		totalBytes,
		totalLines,
	}
}

export function calculateLineRangeOverlapRatio(
	requestedStartLine: number,
	requestedEndLine: number,
	existingStartLine: number,
	existingEndLine: number,
): number {
	const overlapStart = Math.max(requestedStartLine, existingStartLine)
	const overlapEnd = Math.min(requestedEndLine, existingEndLine)
	if (overlapEnd < overlapStart) {
		return 0
	}

	const overlapLength = overlapEnd - overlapStart + 1
	const requestedLength = requestedEndLine - requestedStartLine + 1
	return requestedLength > 0 ? overlapLength / requestedLength : 0
}

export function findTrackedSourceOverlap(
	windows: Array<{ startLine: number; endLine: number }>,
	requestedStartLine: number,
	requestedEndLine: number,
):
	| {
			type: "contained" | "substantial"
			window: { startLine: number; endLine: number }
	  }
	| undefined {
	for (const window of windows) {
		if (requestedStartLine >= window.startLine && requestedEndLine <= window.endLine) {
			return { type: "contained", window }
		}

		const overlapRatio = calculateLineRangeOverlapRatio(
			requestedStartLine,
			requestedEndLine,
			window.startLine,
			window.endLine,
		)
		if (overlapRatio >= SOURCE_RANGE_OVERLAP_REUSE_RATIO) {
			return { type: "substantial", window }
		}
	}

	return undefined
}

export function recordTrackedSourceWindow(
	cache: Map<string, Array<{ startLine: number; endLine: number }>>,
	cacheKey: string,
	window: { startLine: number; endLine: number },
): void {
	const existing = cache.get(cacheKey) ?? []
	existing.push(window)
	if (existing.length > MAX_TRACKED_SOURCE_WINDOWS_PER_FILE) {
		existing.splice(0, existing.length - MAX_TRACKED_SOURCE_WINDOWS_PER_FILE)
	}
	cache.set(cacheKey, existing)
}

export function extractReadFileRange(
	text: string,
	startLine: number,
	endLine: number,
): {
	selection: string
	totalLines: number
	startLine: number
	endLine: number
} {
	const lines = text.split("\n")
	const totalLines = lines.length
	const clampedStart = Math.min(Math.max(startLine, 1), totalLines)
	const clampedEnd = Math.min(Math.max(endLine, clampedStart), totalLines)
	const selection = lines.slice(clampedStart - 1, clampedEnd).join("\n")

	return {
		selection,
		totalLines,
		startLine: clampedStart,
		endLine: clampedEnd,
	}
}
