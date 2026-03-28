# Blast Radius

Assumption for this blast-radius inventory:
- the new tool is globally registered across the existing prompt variants
- the preference for this tool is enforced in the `code-review.md` workflow, not by adding workflow-id-specific tool gating to `SystemPromptContext`
- `{diff_output}` is treated as a stable config-backed placeholder in `.cline/workflow-config.yaml`, so the tool only needs to build/replace `review-input.diff`

Under that scope, these existing files need to be updated.

## Existing Files To Update

- `.cline/workflow-config.yaml:3-12`
  - What changes:
    - add the stable `diff_output` placeholder alongside the existing stable workflow placeholders
  - How changes:
    - append `diff_output: "{output_folder}/review-input.diff"` after the existing `output_folder` entry so placeholder workflows can resolve `{diff_output}` without a dynamic `set_workflow_placeholders` call

- `src/shared/tools.ts:8-40`
  - What changes:
    - add the new default tool id to `ClineDefaultTool`
  - How changes:
    - insert the new enum member adjacent to the existing workflow-support tools (`COMPLETE_WORKFLOW_ITEM`, `SET_WORKFLOW_PLACEHOLDERS`, `USE_SUBAGENTS`) so the tool becomes part of `toolUseNames` and the shared canonical tool id list
  - Line-specific note:
    - do not add the new tool to `READ_ONLY_TOOLS` at `src/shared/tools.ts:60-74`, because it writes `review-input.diff`

- `src/core/task/tools/ToolExecutorCoordinator.ts:5-32`
  - What changes:
    - import the new tool handler
  - How changes:
    - add a handler import in the existing workflow-tool import cluster near `CompleteWorkflowItemToolHandler` and `SetWorkflowPlaceholdersToolHandler`
- `src/core/task/tools/ToolExecutorCoordinator.ts:83-117`
  - What changes:
    - register the new tool handler in `toolHandlersMap`
  - How changes:
    - add a map entry for the new tool id so the coordinator can route the tool call to the new handler

- `src/core/task/tools/response/ResponseToolRegistry.ts:1-80`
  - What changes:
    - extend the exhaustive response-tool metadata record for the new enum member
  - How changes:
    - add `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT: undefined` to `RESPONSE_TOOL_METADATA`
  - Why this file belongs in the blast radius:
    - the registry is typed as `Record<ClineDefaultTool, ResponseToolMetadata | undefined>`, so every new tool enum member must be represented explicitly even when it is not a response tool

- `src/core/prompts/system-prompt/tools/index.ts:1-26`
  - What changes:
    - export the new prompt-tool spec module
  - How changes:
    - add `export * from "./<new-tool-file>"` so the tool can be imported through the prompt-tool barrel

- `src/core/task/tools/autoApprove.ts:42-119`
  - What changes:
    - map the new tool id to the existing edit-file approval settings
  - How changes:
    - add the new tool id to the same switch branches as `FILE_NEW`, `FILE_EDIT`, and `APPLY_PATCH` so `shouldAutoApproveTool(...)` returns `[editFiles, editFilesExternally]` for this tool
  - Why this file belongs in the blast radius:
    - without this mapping, the tool will not obey the existing UI-surfaced approval settings for local vs external file edits

- `src/core/prompts/system-prompt/tools/init.ts:3-29`
  - What changes:
    - import the new tool’s variant array
  - How changes:
    - add an import for the new tool’s `*_variants` array near the existing workflow-support tool imports
- `src/core/prompts/system-prompt/tools/init.ts:38-66`
  - What changes:
    - register the new tool variants in `registerClineToolSets()`
  - How changes:
    - add the new `...<tool>_variants` spread into `allToolVariants` so the tool is available to the prompt registry and native schema builders

- `src/core/prompts/system-prompt/spec.ts:439-487`
  - What changes:
    - add a compact native-description branch for the new tool in `getNativeToolDescription(...)`
  - How changes:
    - add a `case "<new_tool_name>"` branch that returns a short native description explaining that the tool deterministically builds and replaces `{output_folder}/review-input.diff` from an explicit Git-backed source
  - Why this file belongs in the blast radius:
    - native tool schema is sent every turn; without a compact description branch, the new tool’s native schema will be more verbose than the existing workflow-support tools
- `src/core/prompts/system-prompt/spec.ts:489-528`
  - What changes:
    - add compact parameter-description branches for the new tool’s structured inputs
  - How changes:
    - add targeted compaction for the nested `source`, `scoped_paths`, and `context_lines` parameters so minimal/native GPT prompts keep the parameter descriptions concise and consistent with the locked tool contract

- `src/core/prompts/system-prompt/variants/generic/config.ts:58-80`
  - What changes:
    - expose the new tool in the generic prompt variant
  - How changes:
    - insert the new tool id in the workflow-support cluster immediately after `SET_WORKFLOW_PLACEHOLDERS` and before `USE_SUBAGENTS`

- `src/core/prompts/system-prompt/variants/gpt-5/config.ts:59-70`
  - What changes:
    - expose the new tool in the GPT-5 prompt variant
  - How changes:
    - insert the new tool id in the workflow-support cluster immediately after `SET_WORKFLOW_PLACEHOLDERS` and before `USE_SUBAGENTS`

- `src/core/prompts/system-prompt/variants/next-gen/config.ts:64-75`
  - What changes:
    - expose the new tool in the Next Gen prompt variant
  - How changes:
    - insert the new tool id in the workflow-support cluster immediately after `SET_WORKFLOW_PLACEHOLDERS` and before `USE_SUBAGENTS`

- `src/core/prompts/system-prompt/variants/xs/config.ts:49-56`
  - What changes:
    - expose the new tool in the XS prompt variant
  - How changes:
    - insert the new tool id in the workflow-support cluster immediately after `SET_WORKFLOW_PLACEHOLDERS` and before `USE_SUBAGENTS`

- `src/core/prompts/system-prompt/variants/native-gpt-5/config.ts:71-82`
  - What changes:
    - expose the new tool in the native GPT-5 prompt/tool-schema variant
  - How changes:
    - insert the new tool id in the workflow-support cluster immediately after `SET_WORKFLOW_PLACEHOLDERS` and before `USE_SUBAGENTS`

- `src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts:64-77`
  - What changes:
    - expose the new tool in the native GPT-5.1 prompt/tool-schema variant
  - How changes:
    - insert the new tool id in the workflow-support cluster immediately after `SET_WORKFLOW_PLACEHOLDERS` and before `USE_SUBAGENTS`

- `src/core/prompts/system-prompt/variants/native-next-gen/config.ts:60-70`
  - What changes:
    - expose the new tool in the native Next Gen prompt/tool-schema variant
  - How changes:
    - insert the new tool id in the workflow-support cluster immediately after `SET_WORKFLOW_PLACEHOLDERS` and before `USE_SUBAGENTS`

- `src/core/prompts/system-prompt/variants/gemini-3/config.ts:59-72`
  - What changes:
    - expose the new tool in the Gemini 3 prompt/tool-schema variant
  - How changes:
    - insert the new tool id in the workflow-support cluster immediately after `SET_WORKFLOW_PLACEHOLDERS` and before `USE_SUBAGENTS`

- `src/core/prompts/system-prompt/variants/glm/config.ts:49-60`
  - What changes:
    - expose the new tool in the GLM prompt variant
  - How changes:
    - insert the new tool id in the workflow-support cluster immediately after `SET_WORKFLOW_PLACEHOLDERS` and before `USE_SUBAGENTS`

- `src/core/prompts/system-prompt/variants/hermes/config.ts:50-62`
  - What changes:
    - expose the new tool in the Hermes prompt variant
  - How changes:
    - insert the new tool id in the workflow-support cluster immediately after `SET_WORKFLOW_PLACEHOLDERS` and before `USE_SUBAGENTS`

- `src/core/prompts/system-prompt/variants/devstral/config.ts:50-60`
  - What changes:
    - expose the new tool in the Devstral prompt variant
  - How changes:
    - insert the new tool id in the workflow-support cluster immediately after `SET_WORKFLOW_PLACEHOLDERS` and before `USE_SUBAGENTS`

- `src/core/prompts/system-prompt/variants/trinity/config.ts:50-61`
  - What changes:
    - expose the new tool in the Trinity prompt variant
  - How changes:
    - insert the new tool id in the workflow-support cluster immediately after `SET_WORKFLOW_PLACEHOLDERS` and before `USE_SUBAGENTS`

- `/Users/robertboston/Documents/Cline/Workflows/code-review.md:32-44`
  - What changes:
    - rewrite Step 3 to prefer the new local diff-output builder tool
  - How changes:
    - replace the current freeform “persist a diff artifact” instructions with: use the new tool when a supported Git-backed source exists; keep raw `git show` / `git diff` construction only as fallback when the tool is unavailable, errors, or the requested source is outside the tool contract
    - remove the line at `code-review.md:40` that says to set `{diff_output}` via `set_workflow_placeholders`, because `{diff_output}` is now stable config

- `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts:335-661`
  - What changes:
    - extend the workflow-tool handler test suite with direct runtime tests for the new tool
  - How changes:
    - add tests adjacent to the existing `set_workflow_placeholders` cases covering:
      - managed-workflow and placeholder-workflow availability checks
      - successful artifact replacement at `{output_folder}/review-input.diff`
      - no-diff behavior (`persisted: false`, no new file write)
      - metadata persistence behavior, if the tool emits any non-file task-state updates
      - subagent-local behavior if the tool is called from subagent execution

- `src/core/prompts/system-prompt/__tests__/spec.test.ts:226-236`
  - What changes:
    - add or extend tool-schema gating coverage for the new tool
  - How changes:
    - add a focused assertion for the new tool’s context requirements under the chosen scope (global availability in this pass means the assertion should prove the tool remains available without placeholder-workflow gating)
- `src/core/prompts/system-prompt/__tests__/spec.test.ts:373-400`
  - What changes:
    - add compact native-schema coverage for the new tool
  - How changes:
    - add a test mirroring the `set_workflow_placeholders` compaction test to verify the new tool’s native description and structured parameter descriptions stay concise in minimal/native GPT mode

- `src/core/prompts/system-prompt/__tests__/integration.test.ts:250-275`
  - What changes:
    - update the native-tool snapshot coverage to include the new tool in the generated tool array
  - How changes:
    - extend the assertion block so the native `toolNames` list explicitly includes the new tool before snapshotting

- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts:86-185`
  - What changes:
    - add placeholder-workflow rendering coverage for the migrated Step 3 guidance
  - How changes:
    - add a temp placeholder workflow fixture whose Step 3 text matches the new `code-review.md` guidance, then assert the rendered activation instructions mention `build_review_diff_output` and do not instruct the agent to set `{diff_output}` with `set_workflow_placeholders`

## Generated Baselines Expected To Refresh

- `src/core/prompts/system-prompt/__tests__/__snapshots__/`
  - What changes:
    - prompt and tool-schema snapshots for the affected variants will refresh after the new tool is added to the variant tool lists and the workflow guidance text changes
  - How changes:
    - regenerate snapshots through the existing prompt-system tests rather than hand-editing them
  - Why this is grouped:
    - these are generated baselines, not hand-maintained source files, so line-level anchors are not useful before regeneration

## Existing Files Explicitly Not In Scope Under The Current Assumption

- `src/core/prompts/system-prompt/types.ts`
- `src/core/task/index.ts`
- `src/core/task/tools/subagent/SubagentRunner.ts`
  - Why they are excluded:
    - they would only need changes if we later decide to gate the tool by specific workflow id or slash-command identity; the current scope keeps the tool globally registered and relies on `code-review.md` for context-specific preference

## New Files To Add

- `src/core/prompts/system-prompt/tools/<new-tool-file>.ts`
  - new prompt-tool spec defining the locked tool contract and parameter schema
- `src/core/task/tools/handlers/<NewToolHandler>.ts`
  - new runtime handler that resolves the Git-backed source, builds deterministic diff output, and atomically replaces `{output_folder}/review-input.diff`

# Concept

This workflow step is a strong fit for a dedicated local tool.

The tool's job:
- accept an exact Git-backed diff source
- accept optional scoped paths
- build and persist `review-input.diff`
- return compact metadata describing whether a new diff artifact was persisted

## Locked Tool Contract

Supported source types:
- `commit`
- `commit_range`
- `ref_diff`
- `worktree_head_scoped`

How those map to the workflow step:
- explicit commit -> `type: "commit"`
- commit range -> `type: "commit_range"`
- branch diff / remote branch reference -> `type: "ref_diff"`
- `git diff HEAD -- <scoped-paths>` -> `type: "worktree_head_scoped"`

Exact input model:

```json
{
  "source": {
    "type": "commit" | "commit_range" | "ref_diff" | "worktree_head_scoped",
    "commit": "abc123",
        "base": "origin/main",
        "head": "HEAD"
      },
      "scoped_paths": [
        "src/foo.ts",
        "docs/story.md"
      ],
      "context_lines": 3
    }
    ```

Input notes:
- `context_lines` is optional, defaults to `3`, and is represented as an integer parameter in the tool schema
- `scoped_paths` is optional for `commit`, `commit_range`, and `ref_diff`
- `scoped_paths` is required for `worktree_head_scoped`
- there is no `output_path` parameter

Output path behavior:
- the tool always writes to `{output_folder}/review-input.diff`
- it always replaces the entire file
- replacement should be atomic: write a temp file in the same directory, then rename over the existing file
- it never appends or merges with prior content

Deterministic artifact format:

```md
# Review Diff Output

## Source
- Type: commit
- Commit: `643bcdc306cc0b2d2663904afdb375d2d0e27995`
- Parent: `...`
- Commit message: `Story 3.3: harden create proposal buffering`
- Command: `git show --format=medium --unified=3 643bcdc -- src/...`

## Diff
```diff
...raw diff...
```
```

Artifact format rules:
- keep the artifact minimal and deterministic
- include only source metadata and the raw diff block
- do not include prose notes, “key changes” summaries, or interpretation

Successful return payload:

```json
{
  "persisted": true,
  "diff_available": true,
  "artifact_path": "/absolute/path/to/review-input.diff",
  "source_label": "commit 643bcdc306cc0b2d2663904afdb375d2d0e27995",
  "scoped_path_count": 2
}
```

Return payload note:
- `artifact_path` should be the resolved absolute file path so external `output_folder` values remain unambiguous

No-diff return payload:

```json
{
  "persisted": false,
  "diff_available": false,
  "reason": "No Git-backed diff content was available for the requested source and scope."
}
```

No-diff behavior:
- if no diff is available, the tool does not write a new `review-input.diff` file
- this aligns with the workflow rule that Step 3 may complete without persisting a new diff artifact when no diff sources are available

Why this contract is a good fit:
- exact support for Step 3
- deterministic artifact output
- no model-authored prose required
- clean separation between stable workflow config and dynamic diff generation

## Final Requirements

### Functional Requirements

- The app must expose a new first-class built-in tool for constructing and persisting `review-input.diff`.
- The tool must support exactly these Git-backed source types:
  - `commit`
  - `commit_range`
  - `ref_diff`
  - `worktree_head_scoped`
- The tool must accept the locked structured input contract:
  - `source` object with the source discriminator and source-specific fields
  - optional `scoped_paths`
  - optional `context_lines`, defaulting to `3`
- The tool must not accept an `output_path` parameter.
- The tool must always target the stable artifact path `{output_folder}/review-input.diff`.
- The tool must replace the entire artifact atomically on successful persistence.
- The tool must generate a deterministic artifact body containing only:
  - source metadata
  - the exact Git command used
  - the raw diff block
- The tool must not generate prose interpretation, summaries, or reviewer-oriented notes.
- If no diff content is available for the requested source and scope, the tool must not write a new `review-input.diff` file.
- On completion, the tool must return compact structured metadata indicating whether a new artifact was persisted.

### Tool-Architecture Requirements

- The new tool must be added to `ClineDefaultTool` and registered through the normal tool architecture.
- The new tool must have:
  - a prompt-tool spec file under `src/core/prompts/system-prompt/tools/`
  - a runtime handler under `src/core/task/tools/handlers/`
  - a registration entry in `ToolExecutorCoordinator`
  - registration in `src/core/prompts/system-prompt/tools/init.ts`
  - barrel export coverage in `src/core/prompts/system-prompt/tools/index.ts`
- The new tool must be exposed in the existing prompt variant configs so it appears in both textual tool catalogs and native tool schemas.
- The native-schema compaction layer must include concise description handling for the new tool and its parameters.
- The auto-approval layer must treat the new tool as an edit-file operation so it obeys the existing `editFiles` and `editFilesExternally` settings surfaced in the UI.

### Workflow-Integration Requirements

- `code-review.md` Step 3 must be updated to prefer this tool whenever the requested diff source is inside the supported Git-backed contract.
- `code-review.md` Step 3 must allow raw `git show` / `git diff` construction only as fallback when:
  - the tool is unavailable
  - the tool errors
  - or the requested source is outside the supported contract
- `code-review.md` Step 3 must no longer instruct the agent to set `{diff_output}` with `set_workflow_placeholders`.
- The downstream reviewer workflows that consume `{diff_output}` must remain unchanged in this pass.

### Placeholder / Responsibility Requirements

- `{diff_output}` must be treated as a stable workflow placeholder resolved from `.cline/workflow-config.yaml`.
- The new tool must not call `set_workflow_placeholders`.
- The new tool’s responsibility must end after building or replacing `{output_folder}/review-input.diff` and returning its compact result metadata.
- Dynamic workflow placeholders must remain the responsibility of `set_workflow_placeholders`.

### Behavioral Constraints

- The tool must not be classified as read-only.
- The tool must not require workflow-id-specific prompt gating in this pass.
- The tool must be globally available through the existing prompt variants, with usage preference driven by workflow instructions rather than new `SystemPromptContext` fields.
- The tool must preserve exact Git diff headers and hunk headers so downstream diff-based review workflows can reason over the artifact directly.
- The tool must reuse the existing file-edit approval model:
  - local output paths follow the current local edit auto-approval setting
  - external output paths follow the current external edit auto-approval setting
  - when auto-approval does not apply, the tool must go through the existing manual approval path before writing the artifact

### Test and Regression Requirements

- The workflow-tool handler test suite must gain direct coverage for the new tool’s success and no-diff paths.
- Prompt/spec tests must gain coverage for:
  - the new tool’s registration in native tool schemas
  - the compact native description and parameter descriptions
  - the migrated workflow guidance in `code-review.md`
- Prompt snapshot baselines affected by the new tool’s addition must be refreshed through the existing test suite rather than hand-edited.


# Outstanding Items
