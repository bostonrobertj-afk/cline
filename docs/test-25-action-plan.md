---
title: Test 25 Token Reduction Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, stop, then read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - Stop at every PAUSE POINT and provide an update so the work can be checked before continuing.
  - If any ambiguity is discovered, or any code/test/snapshot change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Test 25 Token Reduction Action Plan

This plan implements the requirements in `docs/test-25-remediation.md`.

Locked scope:
- Reduce token growth in the live OpenAI Responses `previous_response_id` case by reducing what enters the thread up front.
- Enforce bounded full-source reads for both native file tools and Indxr/MCP `read_source`.
- Preserve targeted read capability for real coding work.
- Add stable positional metadata and overlap suppression for targeted reads.
- Lower GPT-5 Responses server-side compaction thresholds.
- Update prompt guidance so it reinforces the runtime policy instead of contradicting it.

Out of scope:
- Breaking or resetting OpenAI Responses threads.
- Changing local-history behavior as a substitute for live-thread reduction.
- Editing any MCP server implementation outside this repository.
- UI/token-label changes.
- Any threshold other than the exact values prescribed below.

Implementation constants required by this plan:
- Full-file/full-source raw read limit: `300` lines or `16_384` bytes.
- Substantial overlap threshold: `0.6`.
- Per-file tracked source windows cap: `12`.
- GPT-5 Responses compaction constants:
  - `OPENAI_SERVER_SIDE_COMPACTION_MAX_THRESHOLD = 120_000`
  - `OPENAI_SERVER_SIDE_COMPACTION_MIN_THRESHOLD = 80_000`
  - `OPENAI_SERVER_SIDE_COMPACTION_RATIO = 0.5`

## Step 1
[x] Add the shared bounded-read and overlap helpers, plus task-state tracking for targeted source windows.

Allowed files:
- `src/core/task/tools/utils/readFileContentUtils.ts`
- `src/core/task/TaskState.ts`

Exact edits:
1. In `src/core/task/tools/utils/readFileContentUtils.ts` immediately after the existing `DIFF_FALLBACK_RATIO` constant at line 7, insert these constants exactly:

```ts
export const MAX_FULL_SOURCE_READ_LINES = 300
export const MAX_FULL_SOURCE_READ_BYTES = 16_384
export const SOURCE_RANGE_OVERLAP_REUSE_RATIO = 0.6
export const MAX_TRACKED_SOURCE_WINDOWS_PER_FILE = 12
```

2. In `src/core/task/tools/utils/readFileContentUtils.ts` immediately after `buildReadFileDelta(...)`, insert these helpers exactly:

```ts
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
```

3. Do not change the existing `extractReadFileRange(...)` implementation in this step.

4. In `src/core/task/TaskState.ts` immediately after the existing `fileReadCache` block at lines 114-124, insert this field exactly:

```ts
	sourceReadWindowCache: Map<string, Array<{ startLine: number; endLine: number }>> = new Map()
```

5. Do not add any other fields or helpers in either file during this step.

PAUSE POINT:
- Stop after Step 1, report that the shared constants/helpers and task-state tracking were added, and wait for approval before continuing.

## Step 2
[x] Enforce the bounded full-file read policy in `read_file` and cover it with repeat-read regression tests.

Allowed files:
- `src/core/task/tools/handlers/ReadFileToolHandler.ts`
- `src/core/task/tools/handlers/__tests__/ReadFileToolHandler.repeatReads.test.ts`

Exact edits in `src/core/task/tools/handlers/ReadFileToolHandler.ts`:
1. At the import block near lines 15-16, replace:

```ts
import { buildReadFileDelta, createReadFileSnapshot } from "../utils/readFileContentUtils"
```

with:

```ts
import {
	buildReadFileDelta,
	createReadFileSnapshot,
	evaluateFullSourceReadAllowance,
} from "../utils/readFileContentUtils"
```

2. In the cached-read branch, immediately after successful `extractFileContent(...)` and before `config.taskState.consecutiveMistakeCount = 0` at lines 189-201, insert this block exactly:

```ts
				if (!fileContent.imageBlock) {
					const allowance = evaluateFullSourceReadAllowance(fileContent.text)
					if (!allowance.allowed) {
						config.taskState.consecutiveMistakeCount = 0
						return `[Full file read blocked] '${displayPath}' is ${allowance.totalLines} lines / ${allowance.totalBytes} bytes, which exceeds the 300-line / 16384-byte full-read limit. Use read_file_range with explicit 1-based start_line and end_line values for the smallest relevant section.`
					}
				}
```

3. In the first-read branch, immediately after successful `extractFileContent(...)` and before the comment `// Only reset mistake count after a successful read...` at lines 233-248, insert this block exactly:

```ts
		if (!fileContent.imageBlock) {
			const allowance = evaluateFullSourceReadAllowance(fileContent.text)
			if (!allowance.allowed) {
				config.taskState.consecutiveMistakeCount = 0
				return `[Full file read blocked] '${displayPath}' is ${allowance.totalLines} lines / ${allowance.totalBytes} bytes, which exceeds the 300-line / 16384-byte full-read limit. Use read_file_range with explicit 1-based start_line and end_line values for the smallest relevant section.`
			}
		}
```

4. Do not alter the existing unchanged-file notice, diff-return behavior, image handling, or cache-key logic.

Exact edits in `src/core/task/tools/handlers/__tests__/ReadFileToolHandler.repeatReads.test.ts`:
1. Insert this new `it(...)` block immediately before the existing `"does not store snapshot text for files above the size cap"` test at line 205:

```ts
	it("blocks full-file reads that exceed the bounded full-read limit", async () => {
		const { config, taskState, validator } = createConfig()
		const handler = new ReadFileToolHandler(validator)
		const relPath = "too-large.ts"
		const absolutePath = path.join(tmpDir, relPath)
		const content = `${Array.from({ length: 301 }, (_, index) => `line ${index + 1}`).join("\n")}\n`
		await fs.writeFile(absolutePath, content)

		const result = await handler.execute(config, makeBlock(relPath))

		assert.ok((result as string).includes("[Full file read blocked]"))
		assert.ok((result as string).includes("300-line / 16384-byte full-read limit"))
		assert.ok((result as string).includes("Use read_file_range with explicit 1-based start_line and end_line values"))
		assert.ok(!(result as string).includes("line 301"))
		assert.equal(taskState.fileReadCache.get(absolutePath.toLowerCase()), undefined)
	})
```

2. Do not modify any existing test titles or assertions outside that insertion.

PAUSE POINT:
- Stop after Step 2, report whether the native bounded-read guard and its regression test are in place, and wait for approval before continuing.

## Step 3
[x] Add overlap suppression for `read_file_range` while preserving its line-numbered targeted-read output.

Allowed files:
- `src/core/task/tools/handlers/ReadFileRangeToolHandler.ts`
- `src/core/task/tools/handlers/__tests__/ReadFileRangeToolHandler.test.ts`

Exact edits in `src/core/task/tools/handlers/ReadFileRangeToolHandler.ts`:
1. At the import block, replace the existing utility import:

```ts
import { extractReadFileRange } from "../utils/readFileContentUtils"
```

with:

```ts
import {
	extractReadFileRange,
	findTrackedSourceOverlap,
	recordTrackedSourceWindow,
} from "../utils/readFileContentUtils"
```

2. In `execute(...)`, immediately after `const range = extractReadFileRange(fileContent.text, startLine, endLine)` at line 177, insert this block exactly:

```ts
			const cacheKey = absolutePath.toLowerCase()
			const trackedWindows = config.taskState.sourceReadWindowCache.get(cacheKey) ?? []
			const overlap = findTrackedSourceOverlap(trackedWindows, range.startLine, range.endLine)
			if (overlap?.type === "contained") {
				config.taskState.consecutiveMistakeCount = 0
				return `[File range already in context] '${displayPath}' lines ${range.startLine}-${range.endLine} are already covered by previously returned lines ${overlap.window.startLine}-${overlap.window.endLine} in this task. Reuse that earlier excerpt or request only novel lines.`
			}
			if (overlap?.type === "substantial") {
				config.taskState.consecutiveMistakeCount = 0
				return `[File range overlap notice] '${displayPath}' lines ${range.startLine}-${range.endLine} substantially overlap previously returned lines ${overlap.window.startLine}-${overlap.window.endLine} in this task. Request only the novel subsection if you need more code.`
			}
			recordTrackedSourceWindow(config.taskState.sourceReadWindowCache, cacheKey, {
				startLine: range.startLine,
				endLine: range.endLine,
			})
```

3. Leave the existing successful targeted-read return format unchanged:

```ts
return `[File range ${range.startLine}-${range.endLine} of ${range.totalLines}] ${displayPath}\n${range.selection}`
```

Exact edits in `src/core/task/tools/handlers/__tests__/ReadFileRangeToolHandler.test.ts`:
1. Insert this new test immediately after `"returns the requested 1-based line range"`:

```ts
	it("returns a compact notice when the requested range is already fully in context", async () => {
		const { config, taskState, validator } = createConfig()
		const handler = new ReadFileRangeToolHandler(validator)
		const relPath = "contained.ts"
		const absolutePath = path.join(tmpDir, relPath)
		await fs.writeFile(absolutePath, "one\ntwo\nthree\nfour\nfive\n")
		taskState.sourceReadWindowCache.set(absolutePath.toLowerCase(), [{ startLine: 2, endLine: 4 }])

		const result = await handler.execute(config, makeBlock({ path: relPath, start_line: "2", end_line: "3" }))

		assert.ok((result as string).includes("[File range already in context]"))
		assert.ok((result as string).includes("lines 2-3"))
		assert.ok(!(result as string).includes("two\nthree"))
	})
```

2. Insert this new test immediately after the contained-range test:

```ts
	it("returns a compact notice for substantially overlapping ranges", async () => {
		const { config, taskState, validator } = createConfig()
		const handler = new ReadFileRangeToolHandler(validator)
		const relPath = "overlap.ts"
		const absolutePath = path.join(tmpDir, relPath)
		await fs.writeFile(absolutePath, Array.from({ length: 20 }, (_, index) => `line ${index + 1}`).join("\n"))
		taskState.sourceReadWindowCache.set(absolutePath.toLowerCase(), [{ startLine: 5, endLine: 14 }])

		const result = await handler.execute(config, makeBlock({ path: relPath, start_line: "7", end_line: "15" }))

		assert.ok((result as string).includes("[File range overlap notice]"))
		assert.ok((result as string).includes("lines 7-15"))
		assert.ok(!(result as string).includes("line 15"))
	})
```

3. Do not modify the existing line-range formatting assertion at lines 121-132.

## Step 4
[x] Normalize and constrain Indxr/MCP `read_source` results so large raw source does not enter the live thread, while also suppressing overlapping targeted MCP reads.

Allowed files:
- `src/core/task/tools/handlers/UseMcpToolHandler.ts`
- `src/core/task/tools/handlers/__tests__/UseMcpToolHandler.test.ts`

Exact edits in `src/core/task/tools/handlers/UseMcpToolHandler.ts`:
1. At the import block, replace:

```ts
import { truncateContent } from "@/shared/content-limits"
```

with:

```ts
import { truncateContent } from "@/shared/content-limits"
import {
	evaluateFullSourceReadAllowance,
	findTrackedSourceOverlap,
	recordTrackedSourceWindow,
} from "../utils/readFileContentUtils"
```

2. Immediately before `async execute(...)`, add these private helpers exactly:

```ts
	private hasExplicitReadSourceTarget(parsedArguments: Record<string, unknown> | undefined): boolean {
		if (!parsedArguments) {
			return false
		}

		const symbol = parsedArguments.symbol
		const startLine = parsedArguments.start_line
		const endLine = parsedArguments.end_line

		return (
			(typeof symbol === "string" && symbol.trim().length > 0) ||
			((typeof startLine === "number" || typeof startLine === "string") &&
				(typeof endLine === "number" || typeof endLine === "string"))
		)
	}

	private normalizeReadSourcePayload(item: any): {
		displayPath: string
		source: string
		startLine: number
		endLine: number
	} | undefined {
		const resource = item?.resource
		if (!resource || typeof resource !== "object") {
			return undefined
		}

		const candidate = resource as Record<string, unknown>
		const source = typeof candidate.source === "string" ? candidate.source : undefined
		const rawStartLine = candidate.start_line
		const rawEndLine = candidate.end_line
		const startLine = typeof rawStartLine === "number" ? rawStartLine : Number(rawStartLine)
		const endLine = typeof rawEndLine === "number" ? rawEndLine : Number(rawEndLine)
		const displayPath =
			(typeof candidate.path === "string" && candidate.path) ||
			(typeof candidate.file_path === "string" && candidate.file_path) ||
			(typeof candidate.uri === "string" && candidate.uri) ||
			"(unknown path)"

		if (!source || !Number.isFinite(startLine) || !Number.isFinite(endLine)) {
			return undefined
		}

		return {
			displayPath,
			source,
			startLine,
			endLine,
		}
	}
```

3. In the tool-result assembly block at lines 176-212, replace the existing `toolResultText = ...map(...).join("\n\n")` logic with this exact behavior:
   - Keep image extraction unchanged.
   - Build `toolResultText` with a `map(...)` callback that:
     - returns `item.text` unchanged for plain text items.
     - for `item.type === "resource"` and `tool_name === "read_source"`:
       - call `this.normalizeReadSourcePayload(item)`.
       - if normalization fails, return `JSON.stringify(rest)` exactly, not pretty-printed JSON.
       - if normalization succeeds:
         - compute `cacheKey = normalized.displayPath.toLowerCase()`.
         - compute `overlap = findTrackedSourceOverlap(config.taskState.sourceReadWindowCache.get(cacheKey) ?? [], normalized.startLine, normalized.endLine)`.
         - if `overlap?.type === "contained"`, return exactly:

```ts
`[MCP source already in context] '${normalized.displayPath}' lines ${normalized.startLine}-${normalized.endLine} are already covered by previously returned lines ${overlap.window.startLine}-${overlap.window.endLine} in this task. Reuse that earlier excerpt or request only novel lines.`
```

         - if `overlap?.type === "substantial"`, return exactly:

```ts
`[MCP source overlap notice] '${normalized.displayPath}' lines ${normalized.startLine}-${normalized.endLine} substantially overlap previously returned lines ${overlap.window.startLine}-${overlap.window.endLine} in this task. Reissue read_source for only the novel subsection if you need more code.`
```

         - otherwise compute `allowance = evaluateFullSourceReadAllowance(normalized.source)`.
         - if `!this.hasExplicitReadSourceTarget(parsedArguments) && !allowance.allowed`, return exactly:

```ts
`[MCP full source read blocked] '${normalized.displayPath}' is ${allowance.totalLines} lines / ${allowance.totalBytes} bytes, which exceeds the 300-line / 16384-byte full-read limit. Reissue read_source with an explicit symbol or 1-based start_line/end_line range.`
```

         - otherwise call:

```ts
recordTrackedSourceWindow(config.taskState.sourceReadWindowCache, cacheKey, {
	startLine: normalized.startLine,
	endLine: normalized.endLine,
})
```

         - and return exactly:

```ts
`[MCP source range ${normalized.startLine}-${normalized.endLine}] ${normalized.displayPath}\n${normalized.source}`
```

     - for non-`read_source` resource items, replace `JSON.stringify(rest, null, 2)` with `JSON.stringify(rest)`.

4. Do not change image handling, `mcp_server_request_started`, notification handling, or the final `truncateContent(...)` call.

5. Create a new file `src/core/task/tools/handlers/__tests__/UseMcpToolHandler.test.ts` with tests that use the same `TaskState`/`TaskConfig` stub style as the existing read-tool handler tests and include exactly these four `it(...)` cases:
   - `"blocks oversized non-targeted read_source payloads"`
   - `"normalizes targeted read_source payloads with line metadata"`
   - `"returns a compact overlap notice for substantially overlapping targeted read_source payloads"`
   - `"serializes generic MCP resource payloads without pretty-print indentation"`

6. Implement those four tests with these exact assertions:
   - Oversized non-targeted case:
     - `tool_name: "read_source"`
     - `arguments: JSON.stringify({ path: "src/large.ts" })`
     - MCP `resource` contains `path: "src/large.ts"`, `start_line: 1`, `end_line: 301`, and a `source` body with 301 lines.
     - Assert the result includes `[MCP full source read blocked]`.
     - Assert the result includes `explicit symbol or 1-based start_line/end_line range`.
     - Assert the result does not include `line 301`.
   - Targeted normalization case:
     - `arguments: JSON.stringify({ path: "src/example.ts", start_line: 10, end_line: 12 })`
     - MCP `resource` contains matching path/start/end and source `ten\neleven\ntwelve`.
     - Assert the result includes `[MCP source range 10-12] src/example.ts`.
     - Assert the result includes `ten\neleven\ntwelve`.
   - Overlap notice case:
     - prepopulate `taskState.sourceReadWindowCache` with `src/example.ts` lines `10-20`.
     - targeted MCP result returns `start_line: 12`, `end_line: 21`.
     - Assert the result includes `[MCP source overlap notice]`.
     - Assert the result does not include the raw source body.
   - Compact generic resource case:
     - non-`read_source` MCP resource should return compact single-line JSON and must not contain `\n  ` indentation.

PAUSE POINT:
- Stop after Step 4, report whether native and MCP bounded-read/overlap protections are implemented, and wait for approval before continuing.

## Step 5
[x] Add line numbers to formatted `search_files` output so separate excerpts from the same file remain orderable after chunked reading.

Allowed files:
- `src/services/ripgrep/index.ts`
- `src/services/ripgrep/index.test.ts`

Exact edits in `src/services/ripgrep/index.ts`:
1. Change the signature at line 164 from:

```ts
function formatResults(results: SearchResult[], cwd: string): string {
```

to:

```ts
export function formatResults(results: SearchResult[], cwd: string): string {
```

2. In the `for (let resultIndex = 0; resultIndex < fileResults.length; resultIndex++)` loop at lines 200-253, replace the existing `allLines` and `for (const line of allLines)` construction with this exact numbered-line assembly:

```ts
				const allLines = [...result.beforeContext, result.match, ...result.afterContext]
				const startingLineNumber = result.line - result.beforeContext.length

				let resultBytes = 0
				const resultLines: string[] = []

				for (let lineOffset = 0; lineOffset < allLines.length; lineOffset++) {
					const line = allLines[lineOffset]
					const trimmedLine = line?.trimEnd() ?? ""
					const lineNumber = startingLineNumber + lineOffset
					const lineString = `│${lineNumber}│${trimmedLine}\n`
					const lineBytes = Buffer.byteLength(lineString, "utf8")

					if (byteSize + resultBytes + lineBytes >= MAX_BYTE_SIZE) {
						wasLimitReached = true
						break
					}

					resultLines.push(lineString)
					resultBytes += lineBytes
				}
```

3. Do not change the summary text, per-file grouping, or byte-limit truncation message.

4. Create a new file `src/services/ripgrep/index.test.ts` with one `describe("formatResults", ...)` block and one `it("includes explicit 1-based line numbers for match context", ...)` test that:
   - calls `formatResults(...)` directly with one `SearchResult`
   - uses `cwd = "/repo"`
   - uses `filePath = "/repo/src/example.ts"`
   - uses `line = 42`
   - uses `beforeContext = ["const before = true;"]`
   - uses `match = "const target = true;"`
   - uses `afterContext = ["return target;"]`
   - asserts the output includes:
     - `src/example.ts`
     - `│41│const before = true;`
     - `│42│const target = true;`
     - `│43│return target;`

## Step 6
[x] Update prompt guidance so the model is told to prefer targeted reads and only use full-file reads below the exact bounded-read threshold.

Allowed files:
- `src/core/prompts/system-prompt/components/mcp.ts`
- `src/core/prompts/system-prompt/spec.ts`
- `src/core/prompts/system-prompt/variants/gpt-5/template.ts`
- `src/core/prompts/system-prompt/variants/next-gen/template.ts`
- `src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts`
- `src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-basic.snap`
- `src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-browser.snap`
- `src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-focus-chain.snap`
- `src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-mcp.snap`

Exact edits:
1. In `src/core/prompts/system-prompt/components/mcp.ts` lines 190-199, replace the four guidance strings with these exact strings:

```ts
	const readFileGuidance = hasConnectedIndxrServer(context)
		? "When Indxr is available, use its tools first for discovery, summaries, symbol lookup, dependency tracing, and targeted source reads. Use read_file only when you need the exact full raw contents of a file that is at or below 300 lines and 16384 bytes, or when Indxr is insufficient."
		: "Prefer using search_files and list_code_definition_names first to narrow the target, then use read_file_range for targeted inspection. Use read_file only when the file is at or below 300 lines and 16384 bytes and you truly need the exact full contents."

	const readFileRangeGuidance = hasConnectedIndxrServer(context)
		? "Use this when you need exact raw line-based inspection after Indxr has already narrowed the target, or when Indxr is insufficient."
		: "Use this after search_files or list_code_definition_names has already narrowed the problem to a focused region, or when you need a targeted refresher without replaying the entire file."

	const useMcpToolGuidance = hasConnectedIndxrServer(context)
		? ` When Indxr is available, default to its MCP tools first for code exploration, symbol lookup, file understanding, dependency tracing, and targeted source reads before using built-in \`search_files\`, \`list_code_definition_names\`, \`read_file\`, or \`read_file_range\`. For large files, prefer symbol-targeted or explicit line-range reads instead of full raw source reads. Use built-in file tools only when exact raw file contents, regex search, or direct line inspection are required.`
		: ""
```

2. In `src/core/prompts/system-prompt/spec.ts` lines 478-496, replace the Indxr-connected `use_mcp_tool` and `read_file` descriptions with these exact strings:

```ts
			case "use_mcp_tool":
				return hasConnectedIndxrServer(context)
					? "Use a connected MCP tool. When Indxr is available, default to its exploration tools first for code exploration, symbol lookup, file understanding, dependency tracing, and targeted source reads. For large files, prefer symbol-targeted or explicit line-range source reads instead of full raw file reads."
					: firstSentence(resolved)
...
			case "read_file":
				return hasConnectedIndxrServer(context)
					? "Use Indxr first for discovery, summaries, symbol lookup, dependency tracing, and targeted source reads. Use read_file only when exact full raw file contents are required for a file at or below 300 lines and 16384 bytes, or when Indxr is insufficient."
					: firstSentence(resolved)
```

3. In `src/core/prompts/system-prompt/variants/gpt-5/template.ts` line 76, replace the fallback string with:

```ts
"For code investigation, prefer this order when possible: search_files to narrow candidate files, list_code_definition_names to map relevant symbols and line numbers, then read_file_range or symbol-targeted MCP reads for the smallest relevant section. Use read_file only when the target file is at or below 300 lines and 16384 bytes. Avoid rereading overlapping regions when a narrower range will do."
```

4. In `src/core/prompts/system-prompt/variants/next-gen/template.ts` line 62, replace the fallback string with the same exact text from Step 6.3.

5. In `src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts` line 20, replace the fallback string with:

```ts
"For code exploration, prefer search_files first, then list_code_definition_names, then read_file_range or symbol-targeted MCP reads for the smallest relevant section. Use read_file only when the target file is at or below 300 lines and 16384 bytes. Avoid repeating overlapping reads when a narrower range is enough."
```

6. In `src/core/prompts/system-prompt/__tests__/spec.test.ts` lines 579-586, update the expected strings to match the exact new `read_file` and `use_mcp_tool` descriptions from Step 6.2.

7. Update the four listed snapshot files only by running the snapshot-update command in Step 8. Do not hand-edit snapshot contents.

PAUSE POINT:
- Stop after Step 6, report that the prompt guidance and snapshot-owning test expectations have been updated, and wait for approval before continuing.

## Step 7
[x] Lower GPT-5 Responses compaction thresholds and update the provider regression expectations.

Allowed files:
- `src/core/api/providers/openai-native.ts`
- `src/core/api/providers/__tests__/openai-native.test.ts`

Exact edits:
1. In `src/core/api/providers/openai-native.ts` lines 41-43, replace:

```ts
const OPENAI_SERVER_SIDE_COMPACTION_MAX_THRESHOLD = 200_000
const OPENAI_SERVER_SIDE_COMPACTION_MIN_THRESHOLD = 120_000
const OPENAI_SERVER_SIDE_COMPACTION_RATIO = 0.7
```

with:

```ts
const OPENAI_SERVER_SIDE_COMPACTION_MAX_THRESHOLD = 120_000
const OPENAI_SERVER_SIDE_COMPACTION_MIN_THRESHOLD = 80_000
const OPENAI_SERVER_SIDE_COMPACTION_RATIO = 0.5
```

2. In `src/core/api/providers/__tests__/openai-native.test.ts`, update both `compact_threshold` expectations at lines 35 and 53 from `200000` to `120000`.

3. Do not change any other provider behavior or test assertions in this step.

## Step 8
[ ] Run the exact targeted verification commands, update the prompt snapshots, and stop.

Allowed files:
- `src/core/task/tools/handlers/__tests__/UseMcpToolHandler.test.ts`
- `src/services/ripgrep/index.test.ts`
- `src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-basic.snap`
- `src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-browser.snap`
- `src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-focus-chain.snap`
- `src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-mcp.snap`

Exact commands:
1. First run this exact targeted unit-test command:

```sh
npm run test:unit -- src/core/task/tools/handlers/__tests__/ReadFileToolHandler.repeatReads.test.ts src/core/task/tools/handlers/__tests__/ReadFileRangeToolHandler.test.ts src/core/task/tools/handlers/__tests__/UseMcpToolHandler.test.ts src/services/ripgrep/index.test.ts src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/api/providers/__tests__/openai-native.test.ts --exit
```

2. If and only if Step 8.1 passes, run this exact snapshot-update command:

```sh
UPDATE_SNAPSHOTS=true npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts --exit
```

3. After the snapshot update, run this exact integration verification command:

```sh
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts --exit
```

4. Expected scope of snapshot content changes:
   - `src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-basic.snap`
   - `src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-browser.snap`
   - `src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-focus-chain.snap`
   - `src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-mcp.snap`

5. If any additional file requires edits, any additional snapshot content changes appear, or any command fails in a way that suggests a change outside the steps above is needed, stop immediately and ask for input.
