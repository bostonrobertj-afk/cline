---
title: Code Review Final Documentation Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Code Review Final Documentation Action Plan

This plan implements the deterministic final-documentation tool described in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/code-review-final-documentation/requirements.md)
- [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md)
- [tool-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-3/tool-action-plan.md)

This plan is limited to the internal runtime tool build. It does not define invocation, workflow-form support, deterministic gate changes, prompt exposure, provider exposure, or `/Users/robertboston/Documents/Cline/Workflows/**` edits.

Locked decisions for this pass:

- The tool id is `code_review_spec_update`.
- The tool is internal runtime-only. AI agents must not receive prompt/schema exposure for it.
- The tool must resolve `{review_input}` and `{spec_file}` from the merged active placeholder-workflow value map, using both:
  - `taskState.activePlaceholderWorkflowStableValues`
  - `taskState.activePlaceholderWorkflowValues`
- The tool must follow the same system-wide approval behavior as existing file-writing workflow tools.
- Because this tool mutates two files, auto-approval may only skip approval when both target paths independently satisfy `shouldAutoApproveToolWithPath(...)`.
- On success, `review_input.md` must be cleared to an empty file, not reset to preserved baseline content.
- On success, the tool must return structured JSON through `formatResponse.toolResult(...)` with these exact fields:
  - `persisted: true`
  - `spec_file_updated: true`
  - `review_input_cleared: true`
  - `spec_file_path: "<absolute path>"`
  - `review_input_path: "<absolute path>"`
- On failure, the tool must surface `formatResponse.toolError(...)`; there is no structured fallback/no-go result for this tool.
- This pass must not modify:
  - `src/core/prompts/system-prompt/**`
  - `docs/tools-reference/all-cline-tools.mdx`
  - `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
  - `src/core/task/workflow-form/**`
  - `src/core/task/focus-chain/**`
  - `/Users/robertboston/Documents/Cline/Workflows/**`

## Step 1
[x] Align the requirements document to the approved internal-only tool contract, exact success payload, and empty-file reset behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/code-review-final-documentation/requirements.md`

Exact edits:
1. In [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/code-review-final-documentation/requirements.md#L5-L9), immediately after the existing tool-id sentence, add a short paragraph stating that `code_review_spec_update` is an internal runtime tool and is not exposed in the AI prompt tool catalog or contextual native-tool matrix.
2. In [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/code-review-final-documentation/requirements.md#L31-L36), replace the final sentence of `## Inputs` so it explicitly requires resolution from the merged active placeholder-workflow value map, not from new user input and not from tool params.
3. In [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/code-review-final-documentation/requirements.md#L188-L207), replace the entire `## Reset Behavior For review_input.md` section with the approved contract:
   - after a successful merge, write `""` to `{review_input}`
   - do not preserve title, status, acceptance criteria, prior-review context, tasks, or completion notes
   - do not delete the file outright
4. In [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/code-review-final-documentation/requirements.md#L244-L252), replace the generic output-contract wording with this exact contract:
   - success returns `formatResponse.toolResult(JSON.stringify({ persisted: true, spec_file_updated: true, review_input_cleared: true, spec_file_path: "<absolute path>", review_input_path: "<absolute path>" }))`
   - failure returns surfaced `formatResponse.toolError(...)`
   - no structured fallback/no-go payload exists for this tool
5. In [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/code-review-final-documentation/requirements.md#L264-L274), replace `tool schema and registration` with `internal tool id and runtime registration`, and add an explicit bullet that prompt/provider/tool-matrix exposure is out of scope for this tool.

## Step 2
[x] Add the internal tool id and runtime registration entries without exposing the tool to AI prompts.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

Exact edits:
1. In [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L37-L41), add `CODE_REVIEW_SPEC_UPDATE = "code_review_spec_update"` immediately after `BUILD_REVIEW_INPUT`.
2. Do not add `CODE_REVIEW_SPEC_UPDATE` to [READ_ONLY_TOOLS](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L60-L76).
3. In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L11-L13), add an import for `CodeReviewSpecUpdateToolHandler` immediately after the existing `BuildReviewInputToolHandler` import.
4. In the `toolHandlersMap` at [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L117-L120), add:
   - `[ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE]: (_v: ToolValidator) => new CodeReviewSpecUpdateToolHandler(),`
   immediately after the existing `BUILD_REVIEW_INPUT` entry.
5. In [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L50-L58), [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L76-L84), and [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L104-L110), add `ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE` immediately after `ClineDefaultTool.BUILD_REVIEW_INPUT` in the existing file-edit/write cases.
6. In [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L79-L82), add:
   - `[ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE]: undefined,`
   immediately after `BUILD_REVIEW_INPUT`.
7. Do not modify any prompt-spec, provider-config, contextual-tool-matrix, or docs-reference files in this step.

## Step 3
[x] Add the deterministic merge helper and focused merge tests for `code_review_spec_update`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/codeReviewSpecUpdateMerge.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/codeReviewSpecUpdateMerge.test.ts`

Exact edits:
1. Add a new helper file at [codeReviewSpecUpdateMerge.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/codeReviewSpecUpdateMerge.ts) that exports these exact types:

```ts
export interface CodeReviewSpecUpdateMergeArgs {
	specFileMarkdown: string
	reviewInputMarkdown: string
}

export interface CodeReviewSpecUpdateMergeSuccess {
	kind: "success"
	updatedSpecFileMarkdown: string
	clearedReviewInputMarkdown: ""
}

export interface CodeReviewSpecUpdateMergeFailure {
	kind: "error"
	message: string
}

export type CodeReviewSpecUpdateMergeResult =
	| CodeReviewSpecUpdateMergeSuccess
	| CodeReviewSpecUpdateMergeFailure
```

2. In that file, implement local parsing helpers for:
   - the top-level `Status:` line
   - top-level `## Latest Review Findings`
   - top-level `## Tasks / Subtasks`
   using line-based parsing, not freeform markdown replacement.
3. The helper must fail with `kind: "error"` and these exact messages when `review_input.md` is missing required writable surfaces:
   - `review_input.md does not contain the required top-level Status: line.`
   - `review_input.md does not contain the required ## Latest Review Findings section.`
   - `review_input.md does not contain the required ## Tasks / Subtasks section.`
4. The helper must replace the top-level `Status:` line in `{spec_file}` with the one from `review_input.md`, inserting a top-level `Status:` line near the beginning of the file when missing.
5. The helper must replace the full body of `## Latest Review Findings` in `{spec_file}` with the full body from `review_input.md`, including the empty-body case. If the section is missing in `{spec_file}`, create it at the end of the file.
6. The helper must compute the task delta additively:
   - compare only lines under `## Tasks / Subtasks`
   - append only non-empty lines that appear in `review_input.md` but do not already appear in `{spec_file}`
   - preserve exact line text and indentation for appended lines
   - never remove, rewrite, or sort existing spec-file task lines
7. If `## Tasks / Subtasks` is missing in `{spec_file}`, create it at the end of the file after `## Latest Review Findings` when both sections must be created in the same merge.
8. On success, return:
   - `updatedSpecFileMarkdown` containing the merged spec/story markdown
   - `clearedReviewInputMarkdown: ""`
9. Add a new focused test file at [codeReviewSpecUpdateMerge.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/codeReviewSpecUpdateMerge.test.ts) with these exact test cases:
   - `"replaces status and latest review findings, appends only new remediation tasks, and clears review_input to an empty file"`
   - `"creates missing latest-review-findings and tasks sections at the end of the spec file in the required order"`
   - `"fails when review_input.md is missing the top-level Status line"`
   - `"fails when review_input.md is missing the Latest Review Findings section"`
   - `"fails when review_input.md is missing the Tasks / Subtasks section"`

## Step 4
[x] Add the handler, approval/write path, merged-placeholder resolution, and handler-level test coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`

Exact edits:
1. Add a new handler file at [CodeReviewSpecUpdateToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts) that mirrors the approval/write-proof structure of [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts#L38-L188), but with these exact differences:
   - `readonly name = ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE`
   - `getDescription(...)` returns exactly `[code_review_spec_update]`
   - `handlePartialBlock(...)` emits `{"tool":"codeReviewSpecUpdate"}` through `uiHelpers.say("tool", ...)`
   - `execute(...)` must ignore tool params and resolve paths entirely from merged placeholder state
2. In that handler, import and use:
   - `getPlaceholderWorkflowValueMap` from `@/core/workflows/placeholder-workflow-rendering`
   - `recordAndPersistPlaceholderWorkflowWriteProof` from `@/core/task/focus-chain/placeholderWorkflowWriteProofs`
   - `codeReviewSpecUpdateMerge` from `./codeReviewSpecUpdateMerge`
3. In `execute(...)`, build `placeholders` exactly as:

```ts
const placeholders =
	getPlaceholderWorkflowValueMap(
		config.taskState.activePlaceholderWorkflowStableValues,
		config.taskState.activePlaceholderWorkflowValues,
	) ?? {}
```

4. Resolve the raw placeholder-backed paths exactly from that merged map:
   - `const reviewInputRaw = placeholders.review_input?.trim()`
   - `const specFileRaw = placeholders.spec_file?.trim()`
   If either is missing/blank, return these exact tool errors:
   - `Could not resolve workflow placeholder 'review_input' from the active placeholder workflow state.`
   - `Could not resolve workflow placeholder 'spec_file' from the active placeholder workflow state.`
5. Resolve relative paths against `placeholders.cwd`, `placeholders.project_root`, `placeholders["project-root"]`, falling back to `config.cwd` when none of those placeholder values are present.
6. Read both files with `fs.readFile(..., "utf8")`; any read failure must fall through to the outer `catch` and return `formatResponse.toolError(...)`.
7. Call `codeReviewSpecUpdateMerge(...)`; if it returns `kind: "error"`, return `formatResponse.toolError(result.message)` without modifying either file.
8. Build the approval preview with:
   - `tool: "codeReviewSpecUpdate"`
   - `path: getReadablePath(config.cwd, specFilePath)`
   - `content: "Spec file: <readable spec path>\\nReview input: <readable review-input path>"`
   - `operationIsLocatedInWorkspace: await isLocatedInWorkspace(specFilePath) && await isLocatedInWorkspace(reviewInputPath)`
9. Compute auto-approval exactly as:
   - `config.isSubagentExecution || ((await config.callbacks.shouldAutoApproveToolWithPath(block.name, specFilePath)) && (await config.callbacks.shouldAutoApproveToolWithPath(block.name, reviewInputPath)))`
10. Reuse the existing approval, notification, and pre-tool-hook flow from [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts#L127-L165).
11. Persist both file updates with rollback protection:
   - write temp files for both targets first
   - move the original files to backups
   - rename the temp files into place
   - if any write/rename step fails after backup creation, restore both originals before rethrowing
   - do not allow `{spec_file}` to remain updated while `review_input.md` fails to clear, or vice versa
12. After both writes succeed:
   - record write proof only for `specFilePath`
   - set `config.taskState.didEditFile = true`
   - clear `fileReadCache` for both `specFilePath.toLowerCase()` and `reviewInputPath.toLowerCase()`
   - reset `consecutiveMistakeCount` to `0`
13. Return this exact success payload via `formatResponse.toolResult(JSON.stringify(...))`:

```ts
{
	persisted: true,
	spec_file_updated: true,
	review_input_cleared: true,
	spec_file_path: specFilePath,
	review_input_path: reviewInputPath,
}
```

14. In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L1-L24), add the import for `CodeReviewSpecUpdateToolHandler` next to the existing review-tool handler imports.
15. In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L113-L245), add a new repo helper `createCodeReviewSpecUpdateRepo()` immediately after `createReviewInputRepo()` that creates:
   - a story/spec file with top-level `Status: review`, `## Latest Review Findings`, and `## Tasks / Subtasks`
   - a `review-input.md` file whose writable surfaces contain:
     - terminal `Status: ready-for-dev`
     - non-empty `## Latest Review Findings`
     - one carried-forward task line already present in the spec file
     - one newly added remediation task line not present in the spec file
16. Immediately after the existing `build_review_input` tests at [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L1793-L1912), add these exact handler tests:
   - `"updates spec_file from merged workflow placeholders, clears review_input.md, and records write proof for spec_file"`:
     - instantiate `CodeReviewSpecUpdateToolHandler`
     - set `config.taskState.activePlaceholderWorkflowStableValues = { review_input: reviewInputPath, cwd: repoDir, project_root: repoDir, \"project-root\": repoDir }`
     - set `config.taskState.activePlaceholderWorkflowValues = { spec_file: specFilePath }`
     - assert the parsed payload equals the exact success contract
     - assert the spec file now contains `Status: ready-for-dev`
     - assert the spec file `## Latest Review Findings` body equals the review-input body
     - assert the new remediation task line was appended exactly once
     - assert `review_input.md` equals `\"\"`
     - assert `activePlaceholderWorkflowTaskWriteProofPaths` includes `specFilePath` and does not require `reviewInputPath`
   - `"requires review_input from merged placeholder state"`:
     - omit `review_input`
     - assert the exact tool-error string
   - `"requires spec_file from merged placeholder state"`:
     - omit `spec_file`
     - assert the exact tool-error string
   - `"requires approval when either mutated path is not auto-approved"`:
     - set `isSubagentExecution: false`
     - stub `shouldAutoApproveToolWithPath` to resolve `true` for `specFilePath` and `false` for `reviewInputPath`
     - assert `config.callbacks.ask` was called once
   - `"does not persist either file when merge evaluation fails"`:
     - write malformed `review-input.md` content missing `## Latest Review Findings`
     - assert the returned value equals `formatResponse.toolError("review_input.md does not contain the required ## Latest Review Findings section.")`
     - assert both the original spec-file content and the original `review-input.md` content remain unchanged

## Step 5
[x] Run the focused verification for the internal tool build and confirm no prompt exposure files were touched.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/code-review-final-documentation/code-review-spec-update-action-plan.md`

Exact edits:
1. Run exactly:

```bash
npm run test:unit -- src/core/task/tools/handlers/__tests__/codeReviewSpecUpdateMerge.test.ts src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts --exit
```

2. Then run exactly:

```bash
npx tsc --noEmit
```

3. If both commands pass, update this step to `[x]`.
4. Before marking the plan complete, manually confirm that this pass did not modify:
   - `src/core/prompts/system-prompt/**`
   - `docs/tools-reference/all-cline-tools.mdx`
   - `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
   - `src/core/task/workflow-form/**`
   - `src/core/task/focus-chain/**`
