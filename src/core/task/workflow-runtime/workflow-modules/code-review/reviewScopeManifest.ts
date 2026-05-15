import { isAbsolute, normalize, relative } from "node:path"
import {
	getAllowedFileEntriesForCompletedStory,
	type ParsedStoryTask,
	parseDevStoryDocument,
	type StoryTaskAllowedFileEntry,
} from "@/core/task/story-tools/storyTaskDocument"

export enum ReviewScopeChangedFileStatus {
	Added = "added",
	Modified = "modified",
	Deleted = "deleted",
	Renamed = "renamed",
	Copied = "copied",
}

export type ReviewScopeLineCount = number | "binary"

export interface ReviewScopeLineDelta {
	additions: ReviewScopeLineCount
	deletions: ReviewScopeLineCount
}

export interface ReviewScopeParseFailure {
	lineNumber: number
	line: string
	message: string
}

export type ReviewScopeParseResult<TRecord> =
	| { ok: true; records: readonly TRecord[] }
	| { ok: false; failures: readonly ReviewScopeParseFailure[] }

export enum ReviewScopeAllowedFileComparisonKind {
	AllowedAndTouched = "allowed_and_touched",
	AllowedNotTouched = "allowed_not_touched",
	TouchedOutsideAllowedFiles = "touched_outside_allowed_files",
}

export interface ReviewScopeAllowedFileComparison {
	kind: ReviewScopeAllowedFileComparisonKind
	path: string
	ownerIds: readonly string[]
}

export interface ReviewScopeStorySubtaskSummary {
	id: string
	rawLine: string
	completed: boolean
	allowedFiles: readonly string[]
}

export interface ReviewScopeStoryTaskSummary {
	id: string
	rawLine: string
	completed: boolean
	allowedFiles: readonly string[]
	subtasks: readonly ReviewScopeStorySubtaskSummary[]
}

export type ReviewScopeChangedFile =
	| {
			status:
				| ReviewScopeChangedFileStatus.Added
				| ReviewScopeChangedFileStatus.Modified
				| ReviewScopeChangedFileStatus.Deleted
			path: string
			previousPath: undefined
			additions: ReviewScopeLineCount
			deletions: ReviewScopeLineCount
			allowedFileComparison: ReviewScopeAllowedFileComparisonKind
	  }
	| {
			status: ReviewScopeChangedFileStatus.Renamed | ReviewScopeChangedFileStatus.Copied
			path: string
			previousPath: string
			additions: ReviewScopeLineCount
			deletions: ReviewScopeLineCount
			allowedFileComparison: ReviewScopeAllowedFileComparisonKind
	  }

export type ReviewScopeNameStatusRecord =
	| {
			status:
				| ReviewScopeChangedFileStatus.Added
				| ReviewScopeChangedFileStatus.Modified
				| ReviewScopeChangedFileStatus.Deleted
			path: string
			previousPath: undefined
	  }
	| {
			status: ReviewScopeChangedFileStatus.Renamed | ReviewScopeChangedFileStatus.Copied
			path: string
			previousPath: string
	  }

export interface ReviewScopeNumstatRecord {
	path: string
	previousPath: string | undefined
	additions: ReviewScopeLineCount
	deletions: ReviewScopeLineCount
}

export interface ReviewScopeManifestSourceMetadata {
	commitHash: string
	parentHash: string
	targetStoryPath: string
}

export interface ReviewScopeManifestSummary {
	fileCount: number
	addedFileCount: number
	modifiedFileCount: number
	deletedFileCount: number
	totalAdditions: ReviewScopeLineCount
	totalDeletions: ReviewScopeLineCount
}

export interface ReviewScopeManifestModel {
	source: ReviewScopeManifestSourceMetadata
	summary: ReviewScopeManifestSummary
	changedFiles: readonly ReviewScopeChangedFile[]
	allowedFileComparisons: readonly ReviewScopeAllowedFileComparison[]
	storyTasks: readonly ReviewScopeStoryTaskSummary[]
	reviewTargetCommands: readonly string[]
}

export type ReviewScopeManifestMarkdown = string

export interface BuildReviewScopeManifestModelInput {
	commitHash: string
	parentHash: string
	targetStoryPath: string
	selectedProjectRoot: string
	storyMarkdown: string
	nameStatusRecords: readonly ReviewScopeNameStatusRecord[]
	numstatRecords: readonly ReviewScopeNumstatRecord[]
}

export type BuildReviewScopeManifestModelResult =
	| { ok: true; manifest: ReviewScopeManifestModel }
	| { ok: false; errorMessage: string }

function normalizeGitOutputLines(output: string): readonly string[] {
	return output.replace(/\r\n/g, "\n").split("\n")
}

function createParseFailure(args: { lineNumber: number; line: string; message: string }): ReviewScopeParseFailure {
	return {
		lineNumber: args.lineNumber,
		line: args.line,
		message: args.message,
	}
}

function parseNameStatusCode(code: string): ReviewScopeChangedFileStatus | undefined {
	switch (code) {
		case "A":
			return ReviewScopeChangedFileStatus.Added
		case "M":
			return ReviewScopeChangedFileStatus.Modified
		case "D":
			return ReviewScopeChangedFileStatus.Deleted
		default:
			if (/^R\d*$/.test(code)) {
				return ReviewScopeChangedFileStatus.Renamed
			}
			if (/^C\d*$/.test(code)) {
				return ReviewScopeChangedFileStatus.Copied
			}
			return undefined
	}
}

function parseLineCount(value: string): ReviewScopeLineCount | undefined {
	if (value === "-") {
		return "binary"
	}

	if (/^\d+$/.test(value) === false) {
		return undefined
	}

	const parsedValue = Number.parseInt(value, 10)
	return Number.isSafeInteger(parsedValue) ? parsedValue : undefined
}

function parseBracePathRename(rawPath: string): { path: string; previousPath: string | undefined } | undefined {
	const arrowIndex = rawPath.indexOf(" => ")
	if (arrowIndex === -1) {
		return undefined
	}

	const openBraceIndex = rawPath.lastIndexOf("{", arrowIndex)
	const closeBraceIndex = rawPath.indexOf("}", arrowIndex)
	if (openBraceIndex === -1 || closeBraceIndex === -1 || closeBraceIndex < arrowIndex) {
		const previousPath = rawPath.slice(0, arrowIndex).trim()
		const path = rawPath.slice(arrowIndex + " => ".length).trim()
		return previousPath.length > 0 && path.length > 0 ? { path, previousPath } : undefined
	}

	const prefix = rawPath.slice(0, openBraceIndex)
	const suffix = rawPath.slice(closeBraceIndex + 1)
	const left = rawPath.slice(openBraceIndex + 1, arrowIndex).trim()
	const right = rawPath.slice(arrowIndex + " => ".length, closeBraceIndex).trim()
	if (left.length === 0 || right.length === 0) {
		return undefined
	}

	return {
		path: `${prefix}${right}${suffix}`,
		previousPath: `${prefix}${left}${suffix}`,
	}
}

export function parseGitShowNameStatus(output: string): ReviewScopeParseResult<ReviewScopeNameStatusRecord> {
	const records: ReviewScopeNameStatusRecord[] = []
	const failures: ReviewScopeParseFailure[] = []

	for (const [index, line] of normalizeGitOutputLines(output).entries()) {
		if (line.trim() === "") {
			continue
		}

		const lineNumber = index + 1
		const columns = line.split("\t")
		const status = parseNameStatusCode(columns[0] ?? "")
		if (status === undefined) {
			failures.push(createParseFailure({ lineNumber, line, message: "Unsupported name-status code." }))
			continue
		}

		if (status === ReviewScopeChangedFileStatus.Renamed || status === ReviewScopeChangedFileStatus.Copied) {
			const previousPath = columns[1]?.trim()
			const path = columns[2]?.trim()
			if (columns.length !== 3 || previousPath === undefined || previousPath === "" || path === undefined || path === "") {
				failures.push(
					createParseFailure({ lineNumber, line, message: "Renamed and copied records require old and new paths." }),
				)
				continue
			}

			records.push({ status, previousPath, path })
			continue
		}

		const path = columns[1]?.trim()
		if (columns.length !== 2 || path === undefined || path === "") {
			failures.push(createParseFailure({ lineNumber, line, message: "Name-status records require one path." }))
			continue
		}

		records.push({ status, path, previousPath: undefined })
	}

	return failures.length > 0 ? { ok: false, failures } : { ok: true, records }
}

export function parseGitShowNumstat(output: string): ReviewScopeParseResult<ReviewScopeNumstatRecord> {
	const records: ReviewScopeNumstatRecord[] = []
	const failures: ReviewScopeParseFailure[] = []

	for (const [index, line] of normalizeGitOutputLines(output).entries()) {
		if (line.trim() === "") {
			continue
		}

		const lineNumber = index + 1
		const columns = line.split("\t")
		if (columns.length < 3) {
			failures.push(
				createParseFailure({ lineNumber, line, message: "Numstat records require additions, deletions, and path." }),
			)
			continue
		}

		const additions = parseLineCount(columns[0] ?? "")
		const deletions = parseLineCount(columns[1] ?? "")
		if (additions === undefined || deletions === undefined) {
			failures.push(
				createParseFailure({
					lineNumber,
					line,
					message: "Numstat additions and deletions must be non-negative counts or '-' for binary files.",
				}),
			)
			continue
		}

		if (columns.length === 4) {
			const previousPath = columns[2]?.trim()
			const path = columns[3]?.trim()
			if (previousPath === undefined || previousPath === "" || path === undefined || path === "") {
				failures.push(
					createParseFailure({ lineNumber, line, message: "Four-column numstat records require old and new paths." }),
				)
				continue
			}

			records.push({ path, previousPath, additions, deletions })
			continue
		}

		const rawPath = columns.slice(2).join("\t").trim()
		if (rawPath === "") {
			failures.push(createParseFailure({ lineNumber, line, message: "Numstat path must not be empty." }))
			continue
		}

		const parsedRenamePath = parseBracePathRename(rawPath)
		records.push({
			path: parsedRenamePath?.path ?? rawPath,
			previousPath: parsedRenamePath?.previousPath,
			additions,
			deletions,
		})
	}

	return failures.length > 0 ? { ok: false, failures } : { ok: true, records }
}

function normalizeComparisonPath(rawPath: string, selectedProjectRoot: string): string {
	const trimmedPath = rawPath.trim()
	const projectRelativePath = isAbsolute(trimmedPath) ? relative(selectedProjectRoot, trimmedPath) : trimmedPath
	const normalizedPath = normalize(projectRelativePath).replaceAll("\\", "/")
	return normalizedPath.startsWith("./") ? normalizedPath.slice(2) : normalizedPath
}

function createAllowedOwnerMap(args: {
	allowedFiles: readonly StoryTaskAllowedFileEntry[]
	selectedProjectRoot: string
}): Map<string, string[]> {
	const ownerMap = new Map<string, string[]>()

	for (const allowedFile of args.allowedFiles) {
		const normalizedPath = normalizeComparisonPath(allowedFile.path, args.selectedProjectRoot)
		const existingOwners = ownerMap.get(normalizedPath) ?? []
		if (existingOwners.includes(allowedFile.ownerId) === false) {
			existingOwners.push(allowedFile.ownerId)
		}
		ownerMap.set(normalizedPath, existingOwners)
	}

	return ownerMap
}

function toStoryTaskSummary(tasks: readonly ParsedStoryTask[]): readonly ReviewScopeStoryTaskSummary[] {
	return tasks.map((task) => ({
		id: task.id,
		rawLine: task.rawLine,
		completed: task.completed,
		allowedFiles: task.allowedFiles.map((allowedFile) => allowedFile.path),
		subtasks: task.subtasks.map((subtask) => ({
			id: subtask.id,
			rawLine: subtask.rawLine,
			completed: subtask.completed,
			allowedFiles: subtask.allowedFiles.map((allowedFile) => allowedFile.path),
		})),
	}))
}

function lineCountsMatchPath(record: ReviewScopeNumstatRecord, changedFile: ReviewScopeNameStatusRecord): boolean {
	if (record.path === changedFile.path) {
		return true
	}

	return (
		changedFile.previousPath !== undefined &&
		record.previousPath === changedFile.previousPath &&
		record.path === changedFile.path
	)
}

function findLineDelta(
	numstatRecords: readonly ReviewScopeNumstatRecord[],
	changedFile: ReviewScopeNameStatusRecord,
): ReviewScopeLineDelta | undefined {
	const record = numstatRecords.find((candidate) => lineCountsMatchPath(candidate, changedFile))
	if (record === undefined) {
		return undefined
	}

	return {
		additions: record.additions,
		deletions: record.deletions,
	}
}

function classifyTouchedPath(args: {
	path: string
	allowedOwnerMap: ReadonlyMap<string, readonly string[]>
	selectedProjectRoot: string
}): ReviewScopeAllowedFileComparisonKind {
	const normalizedPath = normalizeComparisonPath(args.path, args.selectedProjectRoot)
	return args.allowedOwnerMap.has(normalizedPath)
		? ReviewScopeAllowedFileComparisonKind.AllowedAndTouched
		: ReviewScopeAllowedFileComparisonKind.TouchedOutsideAllowedFiles
}

function addLineCount(left: ReviewScopeLineCount, right: ReviewScopeLineCount): ReviewScopeLineCount {
	if (left === "binary" || right === "binary") {
		return "binary"
	}

	return left + right
}

function calculateManifestSummary(changedFiles: readonly ReviewScopeChangedFile[]): ReviewScopeManifestSummary {
	return {
		fileCount: changedFiles.length,
		addedFileCount: changedFiles.filter((file) => file.status === ReviewScopeChangedFileStatus.Added).length,
		modifiedFileCount: changedFiles.filter(
			(file) =>
				file.status === ReviewScopeChangedFileStatus.Modified ||
				file.status === ReviewScopeChangedFileStatus.Renamed ||
				file.status === ReviewScopeChangedFileStatus.Copied,
		).length,
		deletedFileCount: changedFiles.filter((file) => file.status === ReviewScopeChangedFileStatus.Deleted).length,
		totalAdditions: changedFiles.reduce<ReviewScopeLineCount>((total, file) => addLineCount(total, file.additions), 0),
		totalDeletions: changedFiles.reduce<ReviewScopeLineCount>((total, file) => addLineCount(total, file.deletions), 0),
	}
}

function buildChangedFile(args: {
	nameStatusRecord: ReviewScopeNameStatusRecord
	lineDelta: ReviewScopeLineDelta
	allowedFileComparison: ReviewScopeAllowedFileComparisonKind
}): ReviewScopeChangedFile {
	if (
		args.nameStatusRecord.status === ReviewScopeChangedFileStatus.Renamed ||
		args.nameStatusRecord.status === ReviewScopeChangedFileStatus.Copied
	) {
		return {
			status: args.nameStatusRecord.status,
			path: args.nameStatusRecord.path,
			previousPath: args.nameStatusRecord.previousPath,
			additions: args.lineDelta.additions,
			deletions: args.lineDelta.deletions,
			allowedFileComparison: args.allowedFileComparison,
		}
	}

	return {
		status: args.nameStatusRecord.status,
		path: args.nameStatusRecord.path,
		previousPath: undefined,
		additions: args.lineDelta.additions,
		deletions: args.lineDelta.deletions,
		allowedFileComparison: args.allowedFileComparison,
	}
}

function buildAllowedFileComparisons(args: {
	changedFiles: readonly ReviewScopeChangedFile[]
	allowedOwnerMap: ReadonlyMap<string, readonly string[]>
	selectedProjectRoot: string
}): readonly ReviewScopeAllowedFileComparison[] {
	const touchedPaths = new Set(
		args.changedFiles.map((changedFile) => normalizeComparisonPath(changedFile.path, args.selectedProjectRoot)),
	)
	const comparisons: ReviewScopeAllowedFileComparison[] = args.changedFiles.map((changedFile) => {
		const normalizedPath = normalizeComparisonPath(changedFile.path, args.selectedProjectRoot)
		return {
			kind: changedFile.allowedFileComparison,
			path: changedFile.path,
			ownerIds: args.allowedOwnerMap.get(normalizedPath) ?? [],
		}
	})

	for (const [allowedPath, ownerIds] of args.allowedOwnerMap.entries()) {
		if (touchedPaths.has(allowedPath)) {
			continue
		}

		comparisons.push({
			kind: ReviewScopeAllowedFileComparisonKind.AllowedNotTouched,
			path: allowedPath,
			ownerIds,
		})
	}

	return comparisons
}

export function buildReviewScopeManifestModel(input: BuildReviewScopeManifestModelInput): BuildReviewScopeManifestModelResult {
	const parsedStory = parseDevStoryDocument(input.storyMarkdown)
	if (parsedStory.ok === false) {
		return {
			ok: false,
			errorMessage: `Review scope manifest story parsing failed: ${parsedStory.message}`,
		}
	}

	const allowedOwnerMap = createAllowedOwnerMap({
		allowedFiles: getAllowedFileEntriesForCompletedStory(parsedStory.document),
		selectedProjectRoot: input.selectedProjectRoot,
	})
	const changedFiles: ReviewScopeChangedFile[] = []
	for (const nameStatusRecord of input.nameStatusRecords) {
		const lineDelta = findLineDelta(input.numstatRecords, nameStatusRecord)
		if (lineDelta === undefined) {
			return {
				ok: false,
				errorMessage: `Review scope manifest numstat data is missing for changed path ${nameStatusRecord.path}.`,
			}
		}

		changedFiles.push(
			buildChangedFile({
				nameStatusRecord,
				lineDelta,
				allowedFileComparison: classifyTouchedPath({
					path: nameStatusRecord.path,
					allowedOwnerMap,
					selectedProjectRoot: input.selectedProjectRoot,
				}),
			}),
		)
	}

	return {
		ok: true,
		manifest: {
			source: {
				commitHash: input.commitHash,
				parentHash: input.parentHash,
				targetStoryPath: input.targetStoryPath,
			},
			summary: calculateManifestSummary(changedFiles),
			changedFiles,
			allowedFileComparisons: buildAllowedFileComparisons({
				changedFiles,
				allowedOwnerMap,
				selectedProjectRoot: input.selectedProjectRoot,
			}),
			storyTasks: toStoryTaskSummary(parsedStory.document.tasks),
			reviewTargetCommands: changedFiles.map((changedFile) => `git show ${input.commitHash} -- ${changedFile.path}`),
		},
	}
}

function renderLineCount(value: ReviewScopeLineCount): string {
	return typeof value === "number" ? String(value) : value
}

function renderChangedFilePath(changedFile: ReviewScopeChangedFile): string {
	if (changedFile.previousPath === undefined) {
		return changedFile.path
	}

	return `${changedFile.previousPath} -> ${changedFile.path}`
}

function renderReviewTargetReason(changedFile: ReviewScopeChangedFile): string {
	if (changedFile.status === ReviewScopeChangedFileStatus.Deleted) {
		return "Inspect only for unintended removal."
	}

	if (changedFile.allowedFileComparison === ReviewScopeAllowedFileComparisonKind.TouchedOutsideAllowedFiles) {
		return "Committed path is outside the story allowed-files list."
	}

	if (changedFile.status === ReviewScopeChangedFileStatus.Renamed) {
		return "Renamed allowed path requires focused review of the destination and removal side."
	}

	if (changedFile.status === ReviewScopeChangedFileStatus.Copied) {
		return "Copied allowed path requires focused review of the new destination."
	}

	return "Committed path is included in the story allowed-files list."
}

function renderAllowedComparison(comparison: ReviewScopeAllowedFileComparison): string {
	const ownerSuffix = comparison.ownerIds.length > 0 ? ` (${comparison.ownerIds.join(", ")})` : ""
	return `- ${comparison.kind}: ${comparison.path}${ownerSuffix}`
}

function renderStoryTaskSummary(task: ReviewScopeStoryTaskSummary): readonly string[] {
	const lines = [`- Task ${task.id}: ${task.rawLine}`]
	for (const allowedFile of task.allowedFiles) {
		lines.push(`  - allowed file: ${allowedFile}`)
	}
	for (const subtask of task.subtasks) {
		lines.push(`  - Subtask ${subtask.id}: ${subtask.rawLine}`)
		for (const allowedFile of subtask.allowedFiles) {
			lines.push(`    - allowed file: ${allowedFile}`)
		}
	}

	return lines
}

export function buildReviewScopeManifestMarkdown(manifest: ReviewScopeManifestModel): ReviewScopeManifestMarkdown {
	const lines: string[] = [
		"# Review Scope Manifest",
		"",
		"## Source",
		"",
		`Commit: ${manifest.source.commitHash}`,
		`Parent: ${manifest.source.parentHash}`,
		`Story: ${manifest.source.targetStoryPath}`,
		`Generated from: git show --name-status --numstat ${manifest.source.commitHash}`,
		"",
		"## Summary",
		"",
		`File count: ${manifest.summary.fileCount}`,
		`Added-file count: ${manifest.summary.addedFileCount}`,
		`Modified-file count: ${manifest.summary.modifiedFileCount}`,
		`Deleted-file count: ${manifest.summary.deletedFileCount}`,
		`Total additions: ${renderLineCount(manifest.summary.totalAdditions)}`,
		`Total deletions: ${renderLineCount(manifest.summary.totalDeletions)}`,
		"",
		"Allowed-file comparison:",
		...manifest.allowedFileComparisons.map(renderAllowedComparison),
		"",
		"Story task/subtask summary:",
		...manifest.storyTasks.flatMap(renderStoryTaskSummary),
		"",
		"## Changed Files",
		"",
		"| Status | Path | Additions | Deletions |",
		"| --- | --- | --- | --- |",
		...manifest.changedFiles.map(
			(changedFile) =>
				`| ${changedFile.status} | ${renderChangedFilePath(changedFile)} | ${renderLineCount(
					changedFile.additions,
				)} | ${renderLineCount(changedFile.deletions)} |`,
		),
		"",
		"## Review Targets",
		"",
	]

	for (const changedFile of manifest.changedFiles) {
		lines.push(
			`- ${changedFile.path}`,
			`  - Status: ${changedFile.status}`,
			`  - Reason: ${renderReviewTargetReason(changedFile)}`,
			`  - Command: git show ${manifest.source.commitHash} -- ${changedFile.path}`,
		)
	}

	lines.push(
		"",
		"## Suggested Review Strategy",
		"",
		"- Start with modified/added implementation files.",
		"- Inspect deleted files only for unintended removal.",
		"- Use targeted git show commands per file rather than loading the whole commit diff.",
	)

	return `${lines.join("\n")}\n`
}
