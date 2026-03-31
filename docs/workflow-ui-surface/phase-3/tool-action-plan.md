---
title: Workflow UI Surface Phase 3 Tool Silo Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Workflow UI Surface Phase 3 Tool Silo Action Plan

This plan implements only the Phase 3 tool silo described in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-3/requirements.md)
- [discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-3/discovery.md)
- [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md)

This plan does not implement the workflow-form silo or the deterministic-progression silo.

Locked decisions for this pass:

- The new tool id is `build_review_input`.
- The only public tool parameter is `story_path`.
- The tool resolves `diff_output` internally from workflow stable placeholders, falling back to `{output_folder}/review-input.diff` exactly as `build_review_diff_output` falls back for its artifact path.
- The tool writes to a stable system-owned `review_input` artifact path by resolving `stablePlaceholders.review_input` first, then falling back to `{output_folder}/review-input.md`.
- If the provided story file is readable but does not contain the required deterministic story structure, the tool must hard-error rather than returning the diff/story-mismatch fallback result.
- The diff/story mismatch remains the only structured no-go result:
  - `persisted: false`
  - `review_input_available: false`
  - `recent_story_changes_detected: false`
  - `reason: "diff_output does not identify recent changes to the story file."`
- When recent story-file changes do exist but no newly completed task lines are found, the generated artifact must include:
  - `No recent completed tasks were identified from the story-file diff.`
- When recent story-file changes do exist but no newly added completion-note bullets are found, the generated artifact must include:
  - `No recent completion notes were identified from the story-file diff.`
- This pass must not modify:
  - `src/core/task/workflow-form/**`
  - `src/core/task/focus-chain/**`
  - `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
  - `/Users/robertboston/Documents/Cline/Workflows/**`

## Step 1
[x] Add the new tool id, prompt spec, prompt registration, provider availability, and prompt-test coverage for `build_review_input`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/build_review_input.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/init.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/spec.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/`

Exact edits:
1. In [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L7-L39), add `BUILD_REVIEW_INPUT = "build_review_input"` immediately after `BUILD_REVIEW_DIFF_OUTPUT`.
2. Add a new file at [build_review_input.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_review_input.ts) that mirrors the structure of [build_review_diff_output.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_review_diff_output.ts#L1-L83) with:
   - `const id = ClineDefaultTool.BUILD_REVIEW_INPUT`
   - `name: "build_review_input"`
   - `variant: ModelFamily.GENERIC`
   - description exactly stating that the tool builds and replaces the stable review-input artifact at `{review_input}` from a story file plus the workflow-owned diff artifact at `{diff_output}`, and that the human must only provide `story_path`
   - exactly one required parameter:
     - `name: "story_path"`
     - `type: "string"`
     - `required: true`
     - instruction text explicitly saying it must be the path to the story markdown file that is being reviewed
   - export `build_review_input_variants = [generic]`
3. In [tools/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/index.ts#L1-L27), export the new `./build_review_input` module immediately after `./build_review_diff_output`.
4. In [tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L1-L72):
   - import `build_review_input_variants`
   - insert `...build_review_input_variants` immediately after `...build_review_diff_output_variants` in `allToolVariants`
5. In [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L474-L529), add a new `case "build_review_input":` immediately after the existing `case "build_review_diff_output":` with compact native text that:
   - keeps the tool globally available without workflow gating
   - describes it as building `review-input.md` from a story file and the stable diff artifact
   - lists only `story_path` as the human-supplied parameter
6. In the same file at [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L521-L529), add the matching parameter-text compaction branch for `tool.name === "build_review_input"` immediately after the existing `build_review_diff_output` branch.
7. In each provider config file listed above, add `ClineDefaultTool.BUILD_REVIEW_INPUT` immediately after `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT`. Do not add it to `contextualToolMatrix.ts` in this pass.
8. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts):
   - import `build_review_input_variants` next to the existing `build_review_diff_output_variants` import
   - add one test immediately after `"keeps build_review_diff_output globally available without workflow gating"` asserting `build_review_input` is also globally available without workflow gating
   - add one test immediately after `"compacts native build_review_diff_output descriptions and parameter text"` asserting the native OpenAI function definition for `build_review_input` contains only the compact description and `story_path`
9. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L418-L442), update only the two general prompt assertions that currently require `"build_review_diff_output"` so they also require `"build_review_input"`.
10. Do not change the step-specific native-tool filter assertions at [integration.test.ts:982](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L982) and [integration.test.ts:1055](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1055) in this pass.
11. Update the prompt snapshots under [__snapshots__](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__) only as required by the Step 1 integration-test changes so the general prompt/tool catalog now includes `build_review_input` adjacent to `build_review_diff_output`.

## Step 2
[x] Add a focused extraction helper that reads the story markdown plus the stable diff artifact and produces the exact normalized `review-input.md` content or the exact deterministic no-go conditions for the handler.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/buildReviewInputExtraction.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/buildReviewInputExtraction.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`

Exact edits:
1. Add a new helper file at [buildReviewInputExtraction.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/buildReviewInputExtraction.ts) with these exact exported interfaces:

```ts
export interface BuildReviewInputExtractionArgs {
	storyMarkdown: string
	storyAbsolutePath: string
	storyRelativePaths: string[]
	diffArtifactMarkdown: string
}

export interface BuildReviewInputExtractionSuccess {
	kind: "success"
	markdown: string
	recentStoryChangesDetected: true
}

export interface BuildReviewInputExtractionNoRecentChanges {
	kind: "no_recent_story_changes"
	recentStoryChangesDetected: false
}

export type BuildReviewInputExtractionResult =
	| BuildReviewInputExtractionSuccess
	| BuildReviewInputExtractionNoRecentChanges
```

2. In the same file, export one top-level function:

```ts
export function buildReviewInputExtraction(
	args: BuildReviewInputExtractionArgs,
): BuildReviewInputExtractionResult
```

3. Implement `buildReviewInputExtraction(...)` as a line-based deterministic parser with these exact required-source checks before any diff filtering:
   - find the first top-level heading matching `/^#\\s+Story\\b/`
   - find the first top-level status line matching `/^Status:\\s*(.+)$/m`
   - find a top-level `## Acceptance Criteria` section
   - if any of the three are missing, throw `new Error("The provided story file does not contain the required story structure for deterministic review-input generation.")`
4. In the same file, parse optional sections exactly by heading boundaries:
   - top-level `## Latest Review Findings`
   - top-level `## Tasks / Subtasks`
   - top-level `## Dev Agent Record`
   - nested `### Completion Notes List` only when it appears inside `## Dev Agent Record`
5. Still in the same file, parse the diff artifact by:
   - extracting the fenced code block immediately under `## Diff`
   - returning `{ kind: "no_recent_story_changes", recentStoryChangesDetected: false }` if that code fence is missing or does not contain any `diff --git` block touching any entry from `storyRelativePaths`
   - matching both `a/<candidate>` and `b/<candidate>` in the diff header for every candidate in `storyRelativePaths`
   - treating the first matching candidate as the story-file diff to filter
6. When a matching story-file diff exists, treat only added lines in the story-file diff as the recency boundary:
   - tasks/subtasks: include only added checklist lines whose content, after removing the leading `"+"`, matches `/^\\s*-\\s*\\[[xX]\\]\\s+/`
   - completion notes: include only added bullet lines under `### Completion Notes List` whose content, after removing the leading `"+"`, matches `/^\\s*-\\s+/`
7. Build the success markdown in exactly this top-level order:
   - story title line
   - status line
   - remediation-cycle note only when `## Latest Review Findings` exists and contains non-whitespace content:
     - `This QA pass is reviewing work performed during a remediation cycle. Only the remediation tasks and subtasks are shown here. These tasks and subtasks may or may not satisfy all provided acceptance criteria. Do not treat failure to fully satisfy all acceptance criteria as a defect.`
   - blank line
   - `## Acceptance Criteria` with the full original section body
   - `## Latest Review Findings` with the full original section body only when that section exists and contains non-whitespace content
   - `## Tasks / Subtasks` containing either the diff-filtered completed checklist lines in original order or exactly `No recent completed tasks were identified from the story-file diff.`
   - `## Completion Notes` only when the source story contains `### Completion Notes List` inside `## Dev Agent Record`; when included, render either the diff-filtered added bullets in original order or exactly `No recent completion notes were identified from the story-file diff.`
8. Preserve source indentation for extracted task and completion-note lines after stripping the leading diff `"+"`.
9. Add [buildReviewInputExtraction.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/buildReviewInputExtraction.test.ts) with exactly four tests:
   - `"builds normalized review-input markdown from a story file and matching story diff"` covering title, status, remediation note, full acceptance criteria, full latest review findings, one added checked task, and one added completion-note bullet
   - `"returns no_recent_story_changes when the diff artifact does not touch the story path"`
   - `"includes the no recent completed tasks note when the story diff has no added checked checklist lines"`
   - `"throws for malformed story files missing deterministic structure"`

## Step 3
[x] Implement `BuildReviewInputToolHandler`, register it with the executor and auto-approval system, and make it use the extraction helper plus the exact result contract approved for this phase.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

Exact edits:
1. Add a new file at [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts) by mirroring the approval/write-proof structure of [BuildReviewDiffOutputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewDiffOutputToolHandler.ts#L1-L416) with these exact differences:
   - import and use `buildReviewInputExtraction(...)` from the Step 2 helper
   - import `simpleGit` from `"simple-git"`
   - the handler class name must be `BuildReviewInputToolHandler`
   - `readonly name = ClineDefaultTool.BUILD_REVIEW_INPUT`
   - copy the local `atomicReplaceTextFile(...)` helper into this file unchanged from the diff handler
2. In the new handler, implement `getDescription(block)` so it:
   - first assigns `const params = block.params as Record<string, unknown>`
   - then derives `storyPath` only from `params.story_path`
   - returns `[build_review_input <basename>]`, where `<basename>` is `path.basename(storyPath)` when `story_path` is a non-empty string, otherwise `unknown`
3. Implement `handlePartialBlock(...)` so it:
   - first assigns `const params = block.params as Record<string, unknown>`
   - then derives `storyPath` only from `params.story_path`
   - emits exactly:
   - `tool: "buildReviewInput"`
   - `storyPathProvided: true|false`
   using the same `uiHelpers.say("tool", JSON.stringify(...), ..., true)` pattern used by the diff handler.
4. In `execute(...)`, parse only `story_path`:
   - trim string input
   - if missing/blank, increment `consecutiveMistakeCount` and return `Error: Missing required parameter 'story_path'.`
5. Resolve artifact paths exactly like this:
   - `stablePlaceholders = await buildWorkflowStablePlaceholders({ cwd: config.cwd })`
   - `diffOutputRaw = stablePlaceholders.diff_output ?? resolveWorkflowPlaceholderText("{output_folder}/review-input.diff", stablePlaceholders)`
   - `reviewInputRaw = stablePlaceholders.review_input ?? resolveWorkflowPlaceholderText("{output_folder}/review-input.md", stablePlaceholders)`
   - if `diffOutputRaw` is still falsy, return `formatResponse.toolError("Could not resolve stable placeholder 'diff_output' or 'output_folder' from .cline/workflow-config.yaml.")`
   - if `reviewInputRaw` is still falsy, return `formatResponse.toolError("Could not resolve stable placeholder 'review_input' or 'output_folder' from .cline/workflow-config.yaml.")`
6. Resolve the absolute story, diff-output, and review-input paths with `path.isAbsolute(...) ? raw : path.resolve(config.cwd, raw)`.
7. Read `story_path` and `diff_output` with `fs.readFile(..., "utf8")`; any read failure must fall through to the outer `catch` and return `formatResponse.toolError(...)`.
8. Derive `storyRelativePaths` exactly like this:
   - start with `path.relative(config.cwd, storyAbsolutePath).replaceAll(path.sep, "/")`
   - then attempt `const gitRoot = (await simpleGit(config.cwd).revparse(["--show-toplevel"])).trim()`
   - if `gitRoot` is non-empty, append `path.relative(gitRoot, storyAbsolutePath).replaceAll(path.sep, "/")`
   - de-duplicate the resulting strings while preserving order
   - do not drop candidates that contain `/`; only drop empty strings
9. Call `buildReviewInputExtraction(...)` with the absolute story path, `storyRelativePaths`, story markdown, and diff artifact markdown.
10. If the helper returns `kind === "no_recent_story_changes"`, return exactly:

```ts
formatResponse.toolResult(
	JSON.stringify({
		persisted: false,
		review_input_available: false,
		recent_story_changes_detected: false,
		reason: "diff_output does not identify recent changes to the story file.",
	}),
)
```

11. If the helper throws the malformed-story error from Step 2, let the outer `catch` return it via `formatResponse.toolError(...)`. Do not convert that case into the structured no-go result.
12. Reuse the diff handler’s manual-approval flow against the resolved `reviewInputPath`:
   - build `completeMessage` exactly as:

```ts
const completeMessage = JSON.stringify({
	tool: "buildReviewInput",
	path: getReadablePath(config.cwd, reviewInputPath),
	content: `Story: ${getReadablePath(config.cwd, storyAbsolutePath)}\nDiff artifact: ${getReadablePath(config.cwd, diffOutputPath)}`,
	operationIsLocatedInWorkspace: await isLocatedInWorkspace(reviewInputPath),
})
```

   - same `shouldAutoApproveToolWithPath(...)`
   - same `showNotificationForApproval(...)`
   - same `ToolResultUtils.askApprovalAndPushFeedback(...)`
   - same pre-tool hook invocation pattern
13. On success, atomically replace `reviewInputPath`, record the write proof with `recordAndPersistPlaceholderWorkflowWriteProof(...)`, set `didEditFile = true`, clear the file-read cache entry for `reviewInputPath`, reset `consecutiveMistakeCount = 0`, and return exactly:

```ts
formatResponse.toolResult(
	JSON.stringify({
		persisted: true,
		review_input_available: true,
		artifact_path: reviewInputPath,
		story_path: storyAbsolutePath,
		recent_story_changes_detected: true,
	}),
)
```

14. In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L1-L117):
   - import `BuildReviewInputToolHandler`
   - register `ClineDefaultTool.BUILD_REVIEW_INPUT` immediately after `BUILD_REVIEW_DIFF_OUTPUT`
15. In [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L35-L111), add `ClineDefaultTool.BUILD_REVIEW_INPUT` everywhere `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` is treated as an edit-file tool.
16. In [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L5-L78), add:
   - `[ClineDefaultTool.BUILD_REVIEW_INPUT]: undefined`
   - place it immediately after `[ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT]: undefined`
   - do not give `build_review_input` response-tool behavior; this entry exists only to keep the `Record<ClineDefaultTool, ...>` exhaustive after the new tool id was added

## Step 4
[x] Add focused tool-handler tests covering the new success path, the structured diff/story no-go path, and the malformed-story hard-error path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`

Exact edits:
1. In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts), keep all existing `BuildReviewDiffOutputToolHandler` tests unchanged.
   - add the `BuildReviewInputToolHandler` import next to the existing `BuildReviewDiffOutputToolHandler` import
2. Add a new helper near the existing `createReviewDiffRepo()` helper that creates:
   - a temporary git repo
   - a story markdown file inside the repo with:
     - top `# Story ...`
     - top-level `Status: review`
     - `## Acceptance Criteria`
     - `## Latest Review Findings`
     - `## Tasks / Subtasks`
     - `## Dev Agent Record`
     - nested `### Completion Notes List` inside `## Dev Agent Record`
   - a stable diff artifact file at `{output_folder}/review-input.diff` containing a markdown artifact in the same format emitted by `BuildReviewDiffOutputToolHandler`, with its `## Diff` fence touching that story file by repo-root-relative path and adding:
     - one checked task line
     - one completion-note bullet
   - a stable output folder path in `.cline/workflow-config.yaml` or the equivalent test config fixture so the new handler resolves both stable artifacts without extra params
3. Add a test named `"builds and atomically replaces review-input.md from a story file and matching stable diff artifact"` that:
   - executes `BuildReviewInputToolHandler` with `params: { story_path: <absolute story path> }`
   - asserts `payload.persisted === true`
   - asserts `payload.review_input_available === true`
   - asserts `payload.recent_story_changes_detected === true`
   - asserts `artifact_path` is absolute
   - asserts the written artifact contains the story title, status, full acceptance criteria heading, full latest review findings heading, `## Tasks / Subtasks`, and `## Completion Notes`
   - asserts the write-proof path list contains the resolved review-input artifact path
4. Add a test named `"returns the structured no-go result when diff_output does not identify recent changes to the story file"` that:
   - uses the same story file but a diff artifact touching some other file
   - asserts `payload.persisted === false`
   - asserts `payload.review_input_available === false`
   - asserts `payload.recent_story_changes_detected === false`
   - asserts `payload.reason === "diff_output does not identify recent changes to the story file."`
   - asserts no review-input artifact is written and no write proof is recorded
5. Add a test named `"hard-errors when the provided story file lacks deterministic story structure"` that:
   - writes a malformed markdown file missing the story heading/status/acceptance-criteria contract
   - executes the handler with that file path
   - asserts the result equals `formatResponse.toolError("The provided story file does not contain the required story structure for deterministic review-input generation.")`

## Step 5
[ ] Run the exact verification commands for the tool-silo pass and verify the prompt snapshots updated in Step 1.

Allowed files:
- none

Exact commands:
1. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/task/tools/handlers/__tests__/buildReviewInputExtraction.test.ts src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts --exit`
2. `npx tsc --noEmit`

Completion criteria:
- Both commands pass.
- The only generated-file diffs outside the Step 1 explicit source files are the prompt snapshots under `src/core/prompts/system-prompt/__tests__/__snapshots__/`.
- If either command reveals any additional required code or generated-file change outside the allowed files from prior steps, stop and ask for input instead of improvising.
- Do not run `src/core/prompts/system-prompt/__tests__/integration.test.ts` in this tool-silo pass. Step-specific native-tool filtering and matrix alignment belong to the later deterministic-progression silo.

## Remediation Step 6
[x] Correct `buildReviewInputExtraction(...)` so diff-backed recent task and completion-note extraction derives section ownership from the parsed story file, not from heading lines that happen to appear inside the diff hunk.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/buildReviewInputExtraction.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/buildReviewInputExtraction.test.ts`

Exact edits:
1. In [buildReviewInputExtraction.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/buildReviewInputExtraction.ts#L152-L209), delete the current `extractRecentStoryLines(storyDiffBlock: string)` implementation that tracks `currentTopLevelSection` and `currentNestedSection` from diff-hunk heading lines.
2. Replace it with three helpers in the same file, directly above `buildReviewInputExtraction(...)`:
   - `buildMultiset(lines: string[]): Map<string, number>`
   - `takeLinesMatchingMultiset(linesInStoryOrder: string[], allowedCounts: Map<string, number>): string[]`
   - `extractRecentStoryLines(args: { storyDiffBlock: string; tasksSection: SectionRange | undefined; completionNotesListSection: SectionRange | undefined }): { completedTasks: string[]; completionNotes: string[]; unmatchedCompletedTaskCount: number; unmatchedCompletionNoteCount: number }`
3. Implement `extractRecentStoryLines(...)` with this exact data flow:
   - parse the story-file diff block into added lines only by scanning lines whose first character is `"+"`
   - ignore diff metadata lines beginning with `"+++"`
   - strip the leading `"+"` before any further matching
   - derive `addedCompletedTaskCandidates` from those added lines using `/^\\s*-\\s*\\[[xX]\\]\\s+/`
   - derive `storyCompletedTaskLines` from `tasksSection?.lines.slice(1)` using the same checked-checklist regex, preserving original story-file order
   - derive `storyCompletionNoteLines` from `completionNotesListSection?.lines.slice(1)` using the same bullet regex, preserving original story-file order
   - derive `addedCompletionNoteCandidates` only from added lines that exactly match entries in `storyCompletionNoteLines`, preserving diff order; do not treat generic added task bullets as completion-note candidates
   - build multisets from the added candidate arrays
   - return:
     - `completedTasks = takeLinesMatchingMultiset(storyCompletedTaskLines, completedTaskMultiset)`
     - `completionNotes = takeLinesMatchingMultiset(storyCompletionNoteLines, completionNoteMultiset)`
4. `takeLinesMatchingMultiset(...)` must preserve story-file order and handle duplicate bullet text correctly by decrementing the count in the multiset each time a matching story line is emitted.
5. Still in `extractRecentStoryLines(...)`, add deterministic-identification accounting:
   - track `unmatchedCompletedTaskCount = sum(completedTaskMultiset.values())` after `takeLinesMatchingMultiset(...)` finishes
   - track `unmatchedCompletionNoteCount = sum(completionNoteMultiset.values())` after `takeLinesMatchingMultiset(...)` finishes
   - return those counts alongside `completedTasks` and `completionNotes`
6. In [buildReviewInputExtraction.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/buildReviewInputExtraction.ts#L235), update the call site to pass:
   - `storyDiffBlock`
   - `tasksSection`
   - `completionNotesListSection`
7. After the `extractRecentStoryLines(...)` call, add this exact fallback decision rule:
   - if `unmatchedCompletedTaskCount > 0`, return `{ kind: "no_recent_story_changes", recentStoryChangesDetected: false }`
   - if `completionNotesListSection` exists and `unmatchedCompletionNoteCount > 0`, return `{ kind: "no_recent_story_changes", recentStoryChangesDetected: false }`
   - otherwise preserve the existing success path
8. This means fallback-note strings may only be emitted when deterministic matching completed successfully and the matched result set is genuinely empty.
9. Do not change in this remediation step:
   - malformed-story validation
   - `no_recent_story_changes` behavior when the story diff block cannot be found
   - output section ordering
   - the exact diff/story mismatch reason string used by the handler
10. In [buildReviewInputExtraction.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/buildReviewInputExtraction.test.ts):
   - keep the existing four tests
   - add one new test immediately after `"builds normalized review-input markdown from a story file and matching story diff"`
   - title it exactly: `"maps added checked tasks and completion notes from the story file even when the diff hunk omits section headings"`
11. In that new test:
   - use a story markdown fixture where:
     - `## Tasks / Subtasks` contains at least one existing checked task before the newly added checked task
     - `## Dev Agent Record -> ### Completion Notes List` contains at least one existing bullet before the newly added bullet
   - use a diff artifact whose story-file hunk includes only the added checked task line and the added completion-note bullet plus nearby ordinary context lines, but does not include:
     - `## Tasks / Subtasks`
     - `## Dev Agent Record`
     - `### Completion Notes List`
   - assert `result.kind === "success"`
   - assert the emitted markdown still contains exactly the newly added checked task line and the newly added completion-note bullet
   - assert the emitted markdown does not include the existing preexisting checked task line or the existing preexisting completion-note bullet
12. Add one additional test immediately after that new heading-omission test:
   - title: `"returns no_recent_story_changes when added task or completion-note candidates cannot be matched back into the parsed story sections"`
   - use a story markdown fixture whose `## Tasks / Subtasks` and `### Completion Notes List` do not contain the added candidate lines present in the diff
   - use a diff artifact that still touches the story file and includes:
     - one added checked task candidate line
     - one added completion-note candidate line
   - assert the result equals:
     - `kind: "no_recent_story_changes"`
     - `recentStoryChangesDetected: false`
   - do not assert fallback-note text in this case, because the success artifact must not be produced when deterministic matching fails
13. In [buildReviewInputExtraction.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/buildReviewInputExtraction.test.ts), update the existing success fixtures so the story markdown represents the post-change file state:
   - the story content used by `"builds normalized review-input markdown from a story file and matching story diff"` must already contain the added checked task line and the added completion-note bullet
   - keep the diff artifact showing those same lines as additions
   - keep the expected output unchanged
14. In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts), update the `createReviewInputRepo()` helper so its success fixture story file also represents the post-change state:
   - the story file written for the default `diffTouchesStory: true` case must already contain the added checked task line under `## Tasks / Subtasks`
   - it must already contain the added completion-note bullet under `## Dev Agent Record -> ### Completion Notes List`
   - keep the diff artifact showing those same lines as additions
15. Do not change the no-go fixture path in `createReviewInputRepo({ diffTouchesStory: false })`; that case should continue proving the structured fallback result when the diff does not touch the story file.

## Remediation Step 7
[x] Re-run the focused tool verification after the extraction fix.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/phase-3/tool-action-plan.md`

Exact commands:
1. `npm run test:unit -- src/core/task/tools/handlers/__tests__/buildReviewInputExtraction.test.ts src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts --exit`
2. `npx tsc --noEmit`

Completion criteria:
- Both commands pass.
- No files outside the Step 6 allowed files are modified, except this action-plan document’s checkbox updates.
- If either command fails because of a seam outside the Step 6 allowed files, stop and report the failure without making any additional changes unless the failure is caused by an explicit mistake in this remediation section.
