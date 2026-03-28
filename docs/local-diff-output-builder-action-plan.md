# Local Diff Output Builder Action Plan

This document is the implementation plan for the concept and requirements captured in [local-diff-output-builder.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/local-diff-output-builder.md).

The executing agent must follow this plan literally. Do not rename the tool, change the contract, introduce fallback behaviors not listed here, or move work into different files unless this plan explicitly says to.

## Locked Decisions

- Tool enum member: `BUILD_REVIEW_DIFF_OUTPUT`
- Tool name/id exposed to the model: `build_review_diff_output`
- Prompt-tool spec file: `src/core/prompts/system-prompt/tools/build_review_diff_output.ts`
- Runtime handler file: `src/core/task/tools/handlers/BuildReviewDiffOutputToolHandler.ts`
- Runtime handler class: `BuildReviewDiffOutputToolHandler`
- Stable placeholder path:
  - `{diff_output}` must resolve from `.cline/workflow-config.yaml`
  - the tool must not call `set_workflow_placeholders`
- Approval model:
  - the tool must use the existing edit-file approval settings already surfaced in the UI
  - local writes must follow the existing local edit auto-approval setting
  - external writes must follow the existing external edit auto-approval setting
  - when auto-approval does not apply, the tool must use the existing manual approval flow before writing
- Git implementation:
  - use `simple-git`
  - do not use `execute_command` / raw shell execution inside the handler
- Output location:
  - always write to `{output_folder}/review-input.diff`
  - no `output_path` input is allowed
- Output replacement behavior:
  - replace the entire file atomically
  - do not append
  - do not merge with prior content
- Workflow scope:
  - update only `/Users/robertboston/Documents/Cline/Workflows/code-review.md`
  - do not change the downstream reviewer workflows in this pass
- Prompt scope:
  - make the tool globally available through the existing prompt variants
  - drive preference from workflow guidance, not new workflow-id-specific prompt gating

## Step 1: Add The Stable Placeholder

### File
- `.cline/workflow-config.yaml:3-12`

### Change
Add the stable `diff_output` placeholder immediately after the existing `output_folder` entry.

### Exact Edit
Change the bottom of the file from:

```yaml
user_name: Rob
communication_language: English
document_output_language: English
output_folder: "{project-root}/_bmad-output"
```

to:

```yaml
user_name: Rob
communication_language: English
document_output_language: English
output_folder: "{project-root}/_bmad-output"
diff_output: "{output_folder}/review-input.diff"
```

### Notes
- Do not add comments.
- Do not move existing keys.

## Step 2: Register The New Tool Id

### File
- `src/shared/tools.ts:8-40`

### Change
Add the new tool id to `ClineDefaultTool`.

### Exact Edit
Insert this enum member directly after `SET_WORKFLOW_PLACEHOLDERS` and before `USE_SUBAGENTS`:

```ts
	BUILD_REVIEW_DIFF_OUTPUT = "build_review_diff_output",
```

### File
- `src/shared/tools.ts:60-74`

### Change
Do not add the new tool to `READ_ONLY_TOOLS`.

### Required Result
- `build_review_diff_output` must be part of `toolUseNames`
- `build_review_diff_output` must not be treated as read-only

## Step 3: Register The Tool In Runtime Dispatch

### File
- `src/core/task/tools/ToolExecutorCoordinator.ts:5-32`

### Change
Add the new handler import near the existing workflow-support handlers.

### Exact Edit
Add:

```ts
import { BuildReviewDiffOutputToolHandler } from "./handlers/BuildReviewDiffOutputToolHandler"
```

Place it near:
- `CompleteWorkflowItemToolHandler`
- `SetWorkflowPlaceholdersToolHandler`

### File
- `src/core/task/tools/ToolExecutorCoordinator.ts:83-117`

### Change
Register the new handler in `toolHandlersMap`.

### Exact Edit
Insert this entry directly after `SET_WORKFLOW_PLACEHOLDERS` and before `USE_SUBAGENTS`:

```ts
		[ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT]: (_v: ToolValidator) => new BuildReviewDiffOutputToolHandler(),
```

### File
- `src/core/task/tools/response/ResponseToolRegistry.ts:1-80`

### Change
Extend the exhaustive response-tool metadata record for the new enum member.

### Exact Edit
Add this entry near the other non-response tools:

```ts
	[ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT]: undefined,
```

### Required Result
- TypeScript must recognize that the new tool is intentionally not a response tool.

## Step 4: Map The Tool To Existing Edit Approval Settings

### File
- `src/core/task/tools/autoApprove.ts:42-119`

### Change
Treat the new tool exactly like the existing file-edit tools for auto-approval purposes.

### Exact Edits

In the `yoloModeToggled` switch, add `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` to the branch that currently contains:
- `NEW_RULE`
- `FILE_NEW`
- `FILE_EDIT`
- `APPLY_PATCH`

In the `autoApproveAllToggled` switch, add `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` to the same edit-file branch.

In the main `autoApprovalSettings` switch, add `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` to the same branch that currently returns:

```ts
[autoApprovalSettings.actions.editFiles, autoApprovalSettings.actions.editFilesExternally ?? false]
```

### Required Result
- `shouldAutoApproveTool(BUILD_REVIEW_DIFF_OUTPUT)` must return the existing edit-file tuple
- `shouldAutoApproveToolWithPath(...)` must therefore honor local vs external file write settings without any new settings schema

## Step 5: Add The Prompt-Tool Spec File

### New File
- `src/core/prompts/system-prompt/tools/build_review_diff_output.ts`

### Required Contents
Create a generic-only tool spec that mirrors the style of `complete_workflow_item.ts` and `set_workflow_placeholders.ts`.

Use this exact structure:

```ts
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "build_review_diff_output",
	description:
		'Build and replace the stable review diff artifact at {diff_output} from an explicit Git-backed source. Use this for code-review workflow Step 3 when the diff source is a supported commit, commit range, ref diff, or HEAD-scoped worktree diff. Do not use set_workflow_placeholders for diff_output; it is stable in .cline/workflow-config.yaml.',
	parameters: [
		{
			name: "source",
			required: true,
			type: "object",
			instruction:
				'Required source object. Supported shape: {"type":"commit","commit":"<ref>"} | {"type":"commit_range","base":"<ref>","head":"<ref>"} | {"type":"ref_diff","base":"<ref>","head":"<ref>"} | {"type":"worktree_head_scoped"}.',
		},
		{
			name: "scoped_paths",
			required: false,
			type: "array",
			instruction:
				'Optional array of repository-relative paths to scope the diff. Required for {"type":"worktree_head_scoped"}. Optional for the other source types.',
			items: { type: "string" },
		},
		{
			name: "context_lines",
			required: false,
			type: "integer",
			instruction: "Optional unified diff context line count. Defaults to 3.",
		},
	],
}

export const build_review_diff_output_variants = [generic]
```

### Notes
- Do not add `contextRequirements`.
- Do not create per-model variants.
- Do not add `output_path`.

## Step 6: Export And Register The Tool Spec

### File
- `src/core/prompts/system-prompt/tools/index.ts:1-26`

### Change
Export the new tool spec file.

### Exact Edit
Add:

```ts
export * from "./build_review_diff_output"
```

Place it near the other workflow-support exports, preferably after `browser_action` and before `execute_command`, or adjacent to `set_workflow_placeholders`. Preserve alphabetical-ish ordering used by the file.

### File
- `src/core/prompts/system-prompt/tools/init.ts:3-29`

### Change
Import the new tool variant array.

### Exact Edit
Add:

```ts
import { build_review_diff_output_variants } from "./build_review_diff_output"
```

### File
- `src/core/prompts/system-prompt/tools/init.ts:38-66`

### Change
Register the new tool variants in `allToolVariants`.

### Exact Edit
Insert:

```ts
		...build_review_diff_output_variants,
```

Place it immediately after `...browser_action_variants,` and before `...complete_workflow_item_variants,`.

## Step 7: Expose The Tool In Every Existing Prompt Variant

### Files
- `src/core/prompts/system-prompt/variants/generic/config.ts:58-80`
- `src/core/prompts/system-prompt/variants/gpt-5/config.ts:59-70`
- `src/core/prompts/system-prompt/variants/next-gen/config.ts:64-75`
- `src/core/prompts/system-prompt/variants/xs/config.ts:49-56`
- `src/core/prompts/system-prompt/variants/native-gpt-5/config.ts:71-82`
- `src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts:64-77`
- `src/core/prompts/system-prompt/variants/native-next-gen/config.ts:60-70`
- `src/core/prompts/system-prompt/variants/gemini-3/config.ts:59-72`
- `src/core/prompts/system-prompt/variants/glm/config.ts:49-60`
- `src/core/prompts/system-prompt/variants/hermes/config.ts:50-62`
- `src/core/prompts/system-prompt/variants/devstral/config.ts:50-60`
- `src/core/prompts/system-prompt/variants/trinity/config.ts:50-61`

### Change
Add `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` to each tool list.

### Exact Edit Pattern
Insert the new tool id directly after `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` and before `ClineDefaultTool.USE_SUBAGENTS` in every file listed above.

### Required Result
- The tool must be exposed across textual tool catalogs and native tool schemas for all currently supported prompt variants.

## Step 8: Add Native-Schema Compaction For The New Tool

### File
- `src/core/prompts/system-prompt/spec.ts:439-487`

### Change
Add a compact native description branch to `getNativeToolDescription(...)`.

### Exact Edit
Insert this `case` directly after the existing `set_workflow_placeholders` branch:

```ts
		case "build_review_diff_output":
			return "Build and atomically replace {diff_output} from an explicit Git-backed source. Use for code-review diff artifact construction, not for arbitrary file writes."
```

### File
- `src/core/prompts/system-prompt/spec.ts:489-528`

### Change
Add compact parameter-description handling for the new tool.

### Exact Edit
Insert this block before the `apply_patch` special case:

```ts
	if (tool.name === "build_review_diff_output") {
		switch (param.name) {
			case "source":
				return 'Required source object. Supported shape: {"type":"commit","commit":"<ref>"} | {"type":"commit_range","base":"<ref>","head":"<ref>"} | {"type":"ref_diff","base":"<ref>","head":"<ref>"} | {"type":"worktree_head_scoped"}.'
			case "scoped_paths":
				return 'Optional repository-relative path array. Required for {"type":"worktree_head_scoped"}.'
			case "context_lines":
				return "Optional unified diff context line count. Defaults to 3."
		}
	}
```

### Notes
- Do not try to encode nested object required-ness in the schema layer.
- Nested `source` validation belongs in the runtime handler.

## Step 9: Implement The Runtime Handler

### New File
- `src/core/task/tools/handlers/BuildReviewDiffOutputToolHandler.ts`

### Required Imports
Use the following implementation ingredients:
- `ToolUse` from `@core/assistant-message`
- `formatResponse` from `@core/prompts/responses`
- `buildWorkflowStablePlaceholders` and `resolveWorkflowPlaceholderText` from `@core/workflows/workflow-placeholders`
- `fs/promises`
- `path`
- `simple-git`
- `showNotificationForApproval`
- `getReadablePath`
- `getWorkspaceBasename`
- `isLocatedInWorkspace`
- `ClineDefaultTool`
- `ToolResultUtils`
- `IToolHandler`
- `IPartialBlockHandler`
- `TaskConfig`
- `StronglyTypedUIHelpers`

### Required Helper Types
Define a local source type exactly like this:

```ts
type ReviewDiffSource =
	| { type: "commit"; commit: string }
	| { type: "commit_range"; base: string; head: string }
	| { type: "ref_diff"; base: string; head: string }
	| { type: "worktree_head_scoped" }
```

### Required Helper Functions
Implement local helpers inside this file:

- `parseSource(value: unknown): ReviewDiffSource | null`
  - accept object input
  - also accept JSON-stringified object input
  - return `null` on invalid structure

- `parseScopedPaths(value: unknown): string[]`
  - accept string-array input
  - also accept JSON-stringified array input
  - discard non-string entries
  - trim whitespace
  - discard empty strings

- `parseContextLines(value: unknown): number | null`
  - if omitted, return `3`
  - if numeric string or number is a non-negative integer, return that integer
  - otherwise return `null`

- `formatCommandForArtifact(args: string[]): string`
  - join arguments into a shell-like display string
  - wrap args containing whitespace in `JSON.stringify(arg)`
  - do not add a shell prefix like `zsh -lc`

- `atomicReplaceTextFile(filePath: string, content: string): Promise<void>`
  - create the parent directory recursively
  - write to a temp file in the same directory
  - rename over the target path
  - delete the temp file on error if it still exists

- `buildArtifactContent(...)`
  - build the exact deterministic markdown artifact

### Required Handler Class Structure

Use this class signature:

```ts
export class BuildReviewDiffOutputToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT
	...
}
```

### Required `getDescription(...)`
Return a short stable description. Use:

```ts
	const source = parseSource((block.params as Record<string, unknown>).source)
	const sourceType = source?.type ?? "unknown"
	return `[${block.name} ${sourceType}]`
```

### Required `handlePartialBlock(...)`
Emit a preview tool row only. Use:

```ts
const source = parseSource((block.params as Record<string, unknown>).source)
const sourceType = source?.type ?? "unknown"
await uiHelpers.say("tool", JSON.stringify({ tool: "buildReviewDiffOutput", sourceType }), undefined, undefined, true)
```

### Required `execute(...)` Validation Behavior
Validate in this exact order and return these exact error strings:

1. Missing/invalid `source`

```text
Error: Missing required parameter 'source'. Provide an object with a supported source.type.
```

2. Invalid `context_lines`

```text
Error: 'context_lines' must be a non-negative integer.
```

3. Unsupported `source.type`

```text
Error: Unsupported source.type "<value>". Supported values: commit, commit_range, ref_diff, worktree_head_scoped.
```

4. Missing `commit` for `commit`

```text
Error: source.commit is required when source.type is "commit".
```

5. Missing `base` / `head` for `commit_range`

```text
Error: source.base and source.head are required when source.type is "commit_range".
```

6. Missing `base` / `head` for `ref_diff`

```text
Error: source.base and source.head are required when source.type is "ref_diff".
```

7. Missing `scoped_paths` for `worktree_head_scoped`

```text
Error: scoped_paths is required and must contain at least one path when source.type is "worktree_head_scoped".
```

For every validation error:
- increment `config.taskState.consecutiveMistakeCount`
- return the string directly

### Required placeholder resolution
Inside `execute(...)`, resolve the output path like this:

1. Call:

```ts
const stablePlaceholders = await buildWorkflowStablePlaceholders({ cwd: config.cwd })
```

2. Try to read `stablePlaceholders.diff_output`
3. If absent, compute:

```ts
resolveWorkflowPlaceholderText("{output_folder}/review-input.diff", stablePlaceholders)
```

4. If still absent, return:

```text
Could not resolve stable placeholder 'diff_output' or 'output_folder' from .cline/workflow-config.yaml.
```

wrapped with:

```ts
formatResponse.toolError(...)
```

5. Convert to an absolute path:
   - if already absolute, keep it
   - otherwise `path.resolve(config.cwd, diffOutputRaw)`

### Required typing note
Declare the local variable as:

```ts
let diffOutputRaw: string | undefined = stablePlaceholders.diff_output
```

This annotation is required so the fallback assignment from `resolveWorkflowPlaceholderText(...)` type-checks cleanly.

### Required git setup
Use:

```ts
const git = simpleGit(config.cwd)
```

Then:
- verify repo with `git.checkIsRepo()`
- if false, return:

```ts
formatResponse.toolError(`The current directory (${config.cwd}) is not a git repository.`)
```

### Required ref validation
Before diff generation:
- `commit`: validate `commit`
- `commit_range`: validate `base`, then `head`
- `ref_diff`: validate `base`, then `head`

Use `git.revparse([ref])`.

If validation fails, return:

```ts
formatResponse.toolError(`Invalid git reference '${ref}'. Please provide a valid commit hash, branch name, tag, or relative reference.`)
```

Use the exact failing ref in the message.

Do not validate `HEAD` separately for `worktree_head_scoped`.

### Required diff commands
Use these exact git-raw argument shapes:

- `commit`

```ts
["show", "--format=medium", `--unified=${contextLines}`, source.commit, ...(scopedPaths.length ? ["--", ...scopedPaths] : [])]
```

- `commit_range`

```ts
["diff", `--unified=${contextLines}`, `${source.base}..${source.head}`, ...(scopedPaths.length ? ["--", ...scopedPaths] : [])]
```

- `ref_diff`

```ts
["diff", `--unified=${contextLines}`, `${source.base}..${source.head}`, ...(scopedPaths.length ? ["--", ...scopedPaths] : [])]
```

- `worktree_head_scoped`

```ts
["diff", `--unified=${contextLines}`, "HEAD", "--", ...scopedPaths]
```

### Required artifact metadata collection
- For `commit` source only:
  - get subject line with:

```ts
git.raw(["show", "-s", "--format=%s", source.commit])
```

  - get first parent line with:

```ts
git.raw(["rev-list", "--parents", "-n", "1", source.commit])
```

  - parse the first parent only
  - if there is no parent, render parent as ``(none)``

- For `commit_range` and `ref_diff`:
  - do not collect commit message or parent

- For `worktree_head_scoped`:
  - include `Ref: \`HEAD\``
  - include a comma-separated scoped path line

### Required no-diff detection
After diff generation:
- if trimmed output is empty, or
- if the output does not contain `diff --git`

then do not write a file and return:

```ts
formatResponse.toolResult(
	JSON.stringify({
		persisted: false,
		diff_available: false,
		reason: "No Git-backed diff content was available for the requested source and scope.",
	}),
)
```

### Required approval flow
Build a `completeMessage` JSON payload with:
- `tool: "buildReviewDiffOutput"`
- `path: getReadablePath(config.cwd, outputPath)`
- `content: \`Source: ${sourceLabel}\nCommand: ${displayCommand}\``
- `operationIsLocatedInWorkspace: await isLocatedInWorkspace(outputPath)`

Then:

1. Compute auto-approval with:

```ts
const shouldAutoApprove =
	config.isSubagentExecution || (await config.callbacks.shouldAutoApproveToolWithPath(block.name, outputPath))
```

2. Auto-approval branch:
   - if not subagent:
     - `removeLastPartialMessageIfExistsWithType("say", "tool")`
     - `say("tool", completeMessage, undefined, undefined, false)`

3. Manual approval branch:
   - show notification:

```ts
showNotificationForApproval(
	`Cline wants to build ${getWorkspaceBasename(outputPath, "BuildReviewDiffOutput.notification")}`,
	config.autoApprovalSettings.enableNotifications,
)
```

   - `removeLastPartialMessageIfExistsWithType("say", "tool")`
   - ask for approval with:

```ts
const didApprove = await ToolResultUtils.askApprovalAndPushFeedback("tool", completeMessage, config)
```

   - on rejection, return:

```ts
formatResponse.toolDenied()
```

### Required PreToolUse hook behavior
After approval and before writing:
- dynamically import `ToolHookUtils`
- run `ToolHookUtils.runPreToolUseIfEnabled(config, block)`
- if it throws `PreToolUseHookCancellationError`, return `formatResponse.toolDenied()`

Follow the same pattern used by `ListFilesToolHandler`.

### Required artifact body
Generate exactly this shape.

For `commit`:

```md
# Review Diff Output

## Source
- Type: commit
- Commit: `<commit>`
- Parent: `<parent-or-(none)>`
- Commit message: `<subject>`
- Command: `<display-command>`

## Diff
```diff
<raw diff>
```
```

For `commit_range`:

```md
# Review Diff Output

## Source
- Type: commit_range
- Base: `<base>`
- Head: `<head>`
- Command: `<display-command>`

## Diff
```diff
<raw diff>
```
```

For `ref_diff`:

```md
# Review Diff Output

## Source
- Type: ref_diff
- Base: `<base>`
- Head: `<head>`
- Command: `<display-command>`

## Diff
```diff
<raw diff>
```
```

For `worktree_head_scoped`:

```md
# Review Diff Output

## Source
- Type: worktree_head_scoped
- Ref: `HEAD`
- Scoped paths: `<comma-separated paths>`
- Command: `<display-command>`

## Diff
```diff
<raw diff>
```
```

### Required post-write task-state updates
After a successful write:
- `config.taskState.didEditFile = true`
- `config.taskState.fileReadCache.delete(outputPath.toLowerCase())`
- `config.taskState.consecutiveMistakeCount = 0`

Do not:
- call `set_workflow_placeholders`
- call `updateFCListFromToolResponse`
- persist workflow metadata

### Required success return payload
Return:

```ts
formatResponse.toolResult(
	JSON.stringify({
		persisted: true,
		diff_available: true,
		artifact_path: outputPath,
		source_label: sourceLabel,
		scoped_path_count: scopedPaths.length,
	}),
)
```

Where:
- `artifact_path` is the resolved absolute path
- `source_label` values are:
  - `commit <commit>`
  - `commit_range <base>..<head>`
  - `ref_diff <base>..<head>`
  - `worktree_head_scoped HEAD`

## Step 10: Update The Code Review Workflow

### File
- `/Users/robertboston/Documents/Cline/Workflows/code-review.md:32-44`

### Change
Replace the entire Step 3 body with an explicit preference for `build_review_diff_output`.

### Exact Replacement
Replace the current Step 3 section with:

```md
## Step 3: Construct & Persist Diff Output File
Goal: Construct a diff output with detailed code changes from the most recent dev cycle

When the requested diff source is inside the supported Git-backed contract, use the `build_review_diff_output` tool to build and replace `{diff_output}`.

Supported tool-backed sources:
- an explicit commit from the user or story
- an explicit commit range from the user or story
- an explicit branch diff or remote branch reference from the user or story
- `git diff HEAD -- <scoped-paths>` for tracked scoped files with unstaged and/or staged changes

Use raw `git show` / `git diff` construction only as fallback when:
- the `build_review_diff_output` tool is unavailable
- the tool errors
- or the requested diff source is outside the tool's supported contract

If no diff sources are available this step may be completed without persisting a new `review-input.diff` file.

Done Signal: You've persisted a new `review-input.diff` file in `{output_folder}`
```

### Important Note
- Remove the old line instructing the agent to set `{diff_output}` with `set_workflow_placeholders`.
- This file is outside the repo workspace. The implementation agent must request elevated permission before editing it if sandboxing requires it.

## Step 11: Add Runtime Tests For The New Handler

### File
- `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`

### Required helper update
In `createConfig(...)`, extend `callbacks` to include:

```ts
shouldAutoApproveToolWithPath: sinon.stub().resolves(true),
```

Keep it under `callbacks`, not `autoApprover`, because the new handler must use the callback path-based approval flow.

### Required import updates
Add imports for:
- `BuildReviewDiffOutputToolHandler`
- `simple-git` if needed for stubbing
- any additional helper imports used by the new tests

### Required new tests
Add the following tests adjacent to the existing workflow-support tool tests:

1. `builds and atomically replaces review-input.diff for a commit source`
   - create a temp repo
   - write `.cline/workflow-config.yaml` with both `output_folder` and `diff_output`
   - make at least one commit touching a scoped file
   - call the handler with `source: { type: "commit", commit: "<hash>" }`
   - assert:
     - result JSON has `persisted: true`
     - `diff_available: true`
     - absolute `artifact_path`
     - file exists at resolved `{diff_output}`
     - artifact contains `# Review Diff Output`
     - artifact contains `## Source`
     - artifact contains `## Diff`
     - artifact contains `diff --git`

2. `does not write a new artifact when no diff content is available`
   - use a valid `commit_range` or `ref_diff` with no changes in scope
   - assert:
     - result JSON has `persisted: false`
     - `diff_available: false`
     - no file was created at `{diff_output}`

3. `requires scoped_paths for worktree_head_scoped`
   - call the handler without `scoped_paths`
   - assert the exact validation error string

4. `respects manual approval when auto-approval does not apply`
   - stub `shouldAutoApproveToolWithPath` to resolve `false`
   - stub `ask` to approve
   - assert the handler still writes the file
   - assert the manual approval callback path was used

5. `returns toolDenied when manual approval rejects the write`
   - stub `shouldAutoApproveToolWithPath` to resolve `false`
   - stub `ask` to reject
   - assert return equals `formatResponse.toolDenied()` output semantics
   - assert no file was written

6. `keeps subagent execution auto-approved and local-only`
   - run with `isSubagentExecution: true`
   - assert no manual approval callbacks fire

### Required test implementation notes
- Use temp dirs and clean them up.
- Use real git repositories in temp directories rather than mocking the handler internals.
- Do not snapshot the artifact body in this test file; use exact substring assertions.

## Step 12: Add Prompt-Spec Tests

### File
- `src/core/prompts/system-prompt/__tests__/spec.test.ts:226-236`

### Change
Add a test proving the tool is globally available without placeholder-workflow gating.

### Required new test
Create a test that:
- resolves the new tool variant
- asserts it has no restrictive `contextRequirements`, or that it remains available under `mockContext`

### File
- `src/core/prompts/system-prompt/__tests__/spec.test.ts:373-400`

### Change
Add a compaction test for the new tool.

### Required new test
Create a test mirroring the existing `set_workflow_placeholders` compaction test and assert:
- native description equals:

```text
Build and atomically replace {diff_output} from an explicit Git-backed source. Use for code-review diff artifact construction, not for arbitrary file writes.
```

- `source` parameter description equals:

```text
Required source object. Supported shape: {"type":"commit","commit":"<ref>"} | {"type":"commit_range","base":"<ref>","head":"<ref>"} | {"type":"ref_diff","base":"<ref>","head":"<ref>"} | {"type":"worktree_head_scoped"}.
```

- `scoped_paths` parameter description equals:

```text
Optional repository-relative path array. Required for {"type":"worktree_head_scoped"}.
```

- `context_lines` parameter description equals:

```text
Optional unified diff context line count. Defaults to 3.
```

## Step 13: Update Prompt Integration Tests

### File
- `src/core/prompts/system-prompt/__tests__/integration.test.ts:250-275`

### Change
Assert that the native tool list now includes `build_review_diff_output`.

### Exact Edit
In both native-tool assertion blocks:
- keep the existing `focus_chain` exclusion checks
- add:

```ts
expect(toolNames).to.include("build_review_diff_output")
```

before snapshot assertion.

### Required result
- refreshed native tool snapshots must include the new tool across native-enabled model families

## Step 14: Update Placeholder Workflow Persistence Test

### File
- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts:86-185`

### Change 1
In the temp workflow config written in the “computes stable placeholder values...” test, add:

```yaml
diff_output: "{output_folder}/review-input.diff"
```

### Change 2
Add a new test verifying migrated Step 3 guidance.

### Required new test
Create a temp placeholder workflow whose Step 3 text matches the new `code-review.md` language and assert the rendered activation instructions:
- include `build_review_diff_output`
- include `{diff_output}` or its resolved stable path naturally through placeholder rendering
- do not instruct the agent to call `set_workflow_placeholders` for `diff_output`

## Step 15: Refresh Prompt Snapshot Baselines

### Files
- `src/core/prompts/system-prompt/__tests__/__snapshots__/...`

### Change
Do not hand-edit snapshots.

### Required procedure
Refresh snapshots only by running the existing prompt/system tests in update mode.

## Step 16: Validation

Run these commands after implementation.

### Required commands

1. Type-check

```sh
npx tsc --noEmit
```

2. Prompt/spec/unit tests

```sh
npm run test:unit -- --update-snapshots --exit src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts
```

### Required validation review
After tests pass, verify manually:
- `.cline/workflow-config.yaml` contains `diff_output`
- the new tool is present in `src/shared/tools.ts`
- the new prompt-tool spec and new runtime handler files exist
- `code-review.md` Step 3 uses `build_review_diff_output` and no longer tells the agent to set `{diff_output}` dynamically

## Step 17: Non-Goals

Do not do any of the following in this implementation:
- do not change `src/core/prompts/system-prompt/types.ts`
- do not add workflow-id-specific gating fields to `SystemPromptContext`
- do not change `src/core/task/index.ts`
- do not change `src/core/task/tools/subagent/SubagentRunner.ts`
- do not modify the downstream reviewer workflows
- do not add an `output_path` parameter
- do not make the tool call `set_workflow_placeholders`
- do not classify the tool as read-only
- do not use `execute_command` inside the handler
- do not persist review summaries or prose notes in the artifact
