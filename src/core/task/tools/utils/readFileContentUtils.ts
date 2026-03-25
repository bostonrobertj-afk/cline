import { structuredPatch } from "diff"

const SNAPSHOT_MAX_CHARS = 150_000
const DIFF_CONTEXT_LINES = 2
const DIFF_MAX_CHARS = 16_000
const DIFF_MAX_HUNKS = 12
const DIFF_FALLBACK_RATIO = 0.75

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
