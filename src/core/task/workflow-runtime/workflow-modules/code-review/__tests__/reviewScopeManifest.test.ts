import { expect } from "chai"
import { describe, it } from "mocha"
import {
	buildReviewScopeManifestMarkdown,
	buildReviewScopeManifestModel,
	parseGitShowNameStatus,
	parseGitShowNumstat,
	ReviewScopeAllowedFileComparisonKind,
	ReviewScopeChangedFileStatus,
	type ReviewScopeManifestModel,
	type ReviewScopeNameStatusRecord,
	type ReviewScopeNumstatRecord,
	type ReviewScopeParseResult,
} from "../reviewScopeManifest"

const COMMIT_HASH = "abc1234"
const PARENT_HASH = "def5678"
const PROJECT_ROOT = "/tmp/code-review-project"
const TARGET_STORY_PATH = `${PROJECT_ROOT}/implementation/stories-review/Story-1-1.md`

function createStoryMarkdown(): string {
	return `# Story

## General Instructions

Follow the plan.

## Objective

Build review scope.

## Scope

Review changed files.

## Scope Boundary

Do not inspect unrelated files.

## Requirements

Use allowed files.

## Known Issues/ Risks/ Technical Debt

None.

## Tasks

- [x] Task 1 Implement runtime helpers.
  Allowed files:
  - \`src/allowed.ts\`
  - \`src/deleted.ts\`
  - \`src/old-name.ts\`
  - [x] Subtask 1.1 Implement parser.
    Allowed files:
    - \`src/renamed.ts\`
- [x] Task 2 Add tests.
  Allowed files:
  - \`src/untouched.ts\`
`
}

function expectParsedRecords<TRecord>(result: ReviewScopeParseResult<TRecord>): readonly TRecord[] {
	if (result.ok === false) {
		throw new Error(result.failures.map((failure) => failure.message).join(", "))
	}

	return result.records
}

function buildManifest(): ReviewScopeManifestModel {
	const nameStatusRecords: readonly ReviewScopeNameStatusRecord[] = expectParsedRecords(
		parseGitShowNameStatus(
			["M\tsrc/allowed.ts", "A\tsrc/new-outside.ts", "D\tsrc/deleted.ts", "R100\tsrc/old-name.ts\tsrc/renamed.ts"].join(
				"\n",
			),
		),
	)
	const numstatRecords: readonly ReviewScopeNumstatRecord[] = expectParsedRecords(
		parseGitShowNumstat(
			[
				"5\t1\tsrc/allowed.ts",
				"10\t0\tsrc/new-outside.ts",
				"0\t7\tsrc/deleted.ts",
				"3\t2\tsrc/{old-name.ts => renamed.ts}",
			].join("\n"),
		),
	)
	const result = buildReviewScopeManifestModel({
		commitHash: COMMIT_HASH,
		parentHash: PARENT_HASH,
		targetStoryPath: TARGET_STORY_PATH,
		selectedProjectRoot: PROJECT_ROOT,
		storyMarkdown: createStoryMarkdown(),
		nameStatusRecords,
		numstatRecords,
	})
	if (result.ok === false) {
		throw new Error(result.errorMessage)
	}

	return result.manifest
}

function headingIndex(markdown: string, heading: string): number {
	const index = markdown.indexOf(heading)
	if (index === -1) {
		throw new Error(`Missing heading ${heading}.`)
	}

	return index
}

describe("reviewScopeManifest", () => {
	it("parses git show name-status output for added, modified, deleted, renamed, and copied records", () => {
		const records = expectParsedRecords(
			parseGitShowNameStatus(
				[
					"A\tsrc/added.ts",
					"M\tsrc/modified.ts",
					"D\tsrc/deleted.ts",
					"R100\tsrc/old.ts\tsrc/new.ts",
					"C75\tsrc/base.ts\tsrc/copy.ts",
				].join("\n"),
			),
		)

		expect(records).to.deep.equal([
			{ status: ReviewScopeChangedFileStatus.Added, path: "src/added.ts", previousPath: undefined },
			{ status: ReviewScopeChangedFileStatus.Modified, path: "src/modified.ts", previousPath: undefined },
			{ status: ReviewScopeChangedFileStatus.Deleted, path: "src/deleted.ts", previousPath: undefined },
			{ status: ReviewScopeChangedFileStatus.Renamed, previousPath: "src/old.ts", path: "src/new.ts" },
			{ status: ReviewScopeChangedFileStatus.Copied, previousPath: "src/base.ts", path: "src/copy.ts" },
		])
	})

	it("returns typed failures for malformed name-status rows", () => {
		const result = parseGitShowNameStatus("R100\tsrc/old.ts\nX\tsrc/unknown.ts")

		expect(result.ok).to.equal(false)
		if (result.ok === true) {
			throw new Error("Expected name-status parsing to fail.")
		}
		expect(result.failures.map((failure) => failure.lineNumber)).to.deep.equal([1, 2])
	})

	it("parses git show numstat output including renamed paths and binary files", () => {
		const records = expectParsedRecords(
			parseGitShowNumstat(["12\t3\tsrc/modified.ts", "-\t-\tassets/image.png", "2\t1\tsrc/{old.ts => new.ts}"].join("\n")),
		)

		expect(records).to.deep.equal([
			{ path: "src/modified.ts", previousPath: undefined, additions: 12, deletions: 3 },
			{ path: "assets/image.png", previousPath: undefined, additions: "binary", deletions: "binary" },
			{ path: "src/new.ts", previousPath: "src/old.ts", additions: 2, deletions: 1 },
		])
	})

	it("returns typed failures for malformed numstat rows", () => {
		const result = parseGitShowNumstat("x\t1\tsrc/file.ts\n1\t2")

		expect(result.ok).to.equal(false)
		if (result.ok === true) {
			throw new Error("Expected numstat parsing to fail.")
		}
		expect(result.failures.map((failure) => failure.lineNumber)).to.deep.equal([1, 2])
	})

	it("builds deleted, renamed, and allowed-vs-touched comparisons without treating tasks as implementation proof", () => {
		const manifest = buildManifest()

		expect(manifest.changedFiles.map((file) => file.status)).to.deep.equal([
			ReviewScopeChangedFileStatus.Modified,
			ReviewScopeChangedFileStatus.Added,
			ReviewScopeChangedFileStatus.Deleted,
			ReviewScopeChangedFileStatus.Renamed,
		])
		expect(manifest.changedFiles[2]?.path).to.equal("src/deleted.ts")
		expect(manifest.changedFiles[3]).to.deep.include({
			status: ReviewScopeChangedFileStatus.Renamed,
			previousPath: "src/old-name.ts",
			path: "src/renamed.ts",
		})
		expect(manifest.allowedFileComparisons).to.deep.include({
			kind: ReviewScopeAllowedFileComparisonKind.TouchedOutsideAllowedFiles,
			path: "src/new-outside.ts",
			ownerIds: [],
		})
		expect(manifest.allowedFileComparisons).to.deep.include({
			kind: ReviewScopeAllowedFileComparisonKind.AllowedNotTouched,
			path: "src/untouched.ts",
			ownerIds: ["2"],
		})
		expect(manifest.storyTasks[0]?.rawLine).to.contain("Task 1")
	})

	it("renders required headings, source metadata, changed-file table shape, commands, and strategy", () => {
		const markdown = buildReviewScopeManifestMarkdown(buildManifest())
		const headings = [
			"# Review Scope Manifest",
			"## Source",
			"## Summary",
			"## Changed Files",
			"## Review Targets",
			"## Suggested Review Strategy",
		]
		const headingIndexes = headings.map((heading) => headingIndex(markdown, heading))

		expect(headingIndexes).to.deep.equal([...headingIndexes].sort((left, right) => left - right))
		expect(markdown).to.contain(`Commit: ${COMMIT_HASH}`)
		expect(markdown).to.contain(`Parent: ${PARENT_HASH}`)
		expect(markdown).to.contain(`Story: ${TARGET_STORY_PATH}`)
		expect(markdown).to.contain(`Generated from: git show --name-status --numstat ${COMMIT_HASH}`)
		expect(markdown).to.contain("| Status | Path | Additions | Deletions |")
		expect(markdown).to.contain("| modified | src/allowed.ts | 5 | 1 |")
		expect(markdown).to.contain("| renamed | src/old-name.ts -> src/renamed.ts | 3 | 2 |")
		expect(markdown).to.contain(`Command: git show ${COMMIT_HASH} -- src/allowed.ts`)
		expect(markdown).to.contain(`Command: git show ${COMMIT_HASH} -- src/renamed.ts`)
		expect(markdown).to.contain("- Start with modified/added implementation files.")
		expect(markdown).to.contain("- Inspect deleted files only for unintended removal.")
		expect(markdown).to.contain("- Use targeted git show commands per file rather than loading the whole commit diff.")
		expect(markdown).not.to.contain("diff --git")
		expect(markdown).not.to.contain(`git show ${COMMIT_HASH}\n`)
	})
})
