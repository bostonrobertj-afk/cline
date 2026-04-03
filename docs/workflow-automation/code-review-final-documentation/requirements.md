# Code Review Final Documentation Requirements

## Purpose

This document defines the requirements for a deterministic tool that applies the final triaged review output from `review_input.md` back into `{story_path}` at the end of the `code-review.md` workflow.

The tool id for this capability is `code_review_spec_update`.

`code_review_spec_update` is an internal runtime tool only. It is not exposed in the AI prompt tool catalog or the contextual native-tool matrix.

The tool exists so the primary code-review agent can work against the smaller normalized `review_input.md` surface during Step 6, while the final update of the longer story/spec document remains deterministic, cheap, and machine-checkable.

## Scope

This capability must:

- read `{review_input}` and `{story_path}`
- detect review-authored content in the writable surfaces of `review_input.md`
- merge only that new content into the correct sections of `{story_path}`
- persist the updated `{story_path}`
- record write proof so the Step 6 deterministic done signal can be satisfied
- reset `review_input.md` so it is ready for a future review cycle

This capability must not:

- perform a new code review
- reinterpret reviewer intent from scratch
- rewrite unrelated sections of `{story_path}`
- guess when the merge target cannot be determined deterministically

## Inputs

The tool must consume these two workflow-owned artifacts:

- `{review_input}`
- `{story_path}`

Both paths must be resolved from the merged active placeholder-workflow value map at runtime, using workflow state rather than new user input or tool params.

## Assumptions About `review_input.md`

The tool may assume `review_input.md` follows the normalized Phase 3 shape:

- story title
- top-level `Status:`
- remediation-cycle note when applicable
- `## Acceptance Criteria`
- `## Prior Review Findings` when present
- `## Latest Review Findings`
- `## Tasks / Subtasks`
- `## Completion Notes` when present

The tool must treat these as writable surfaces for the current review cycle:

- top-level `Status:`
- `## Latest Review Findings`
- remediation tasks/subtasks added under `## Tasks / Subtasks`

The tool must treat these as carried-forward context only:

- story title
- remediation-cycle note
- `## Acceptance Criteria`
- `## Prior Review Findings`
- existing carried-forward task content that was extracted from the story
- `## Completion Notes`

## Deterministic Merge Model

The merge must be section-targeted and deterministic.

The tool must not perform a freeform markdown patch against `{story_path}`.

Instead, it must:

1. Parse `{story_path}` into target sections.
2. Parse `review_input.md` into its normalized sections.
3. Compute the review-authored delta from the writable surfaces only.
4. Apply only those deltas to the corresponding sections in `{story_path}`.

## Writable Surface Rules

### 1. Status

`Status:` is a replacement field, not an append-only field.

The tool must:

- read the top-level `Status:` line in `{review_input}`
- read the top-level `Status:` line in `{story_path}`
- replace the `Status:` line in `{story_path}` with the one from `{review_input}`

If `{story_path}` does not contain a top-level `Status:` line, the tool must add one near the beginning of the file.

### 2. Latest Review Findings

`## Latest Review Findings` is append/replace content for the current review cycle.

The tool must:

- treat the full body of `## Latest Review Findings` in `{review_input}` as the desired new current-cycle findings content
- replace the body of `## Latest Review Findings` in `{story_path}` with that body

The tool must not:

- merge old and new latest-review content heuristically
- preserve previous `## Latest Review Findings` content in `{story_path}` when `review_input.md` provides a new body for that section

If `review_input.md` leaves `## Latest Review Findings` empty, the tool must write an empty `## Latest Review Findings` section into `{story_path}` rather than guessing whether old content should remain.

### 3. Tasks / Subtasks

The tool must support review-authored remediation tasks being added to `## Tasks / Subtasks`.

The deterministic rule is:

- preserve existing story tasks already present in `{story_path}`
- detect task lines that are present in `{review_input}` but not present in `{story_path}`
- append only those new task/subtask lines into `{story_path}` under `## Tasks / Subtasks`

The tool must preserve the exact markdown lines authored in `review_input.md`, including indentation and checklist state.

The tool must not:

- remove existing tasks from `{story_path}`
- silently rewrite existing tasks
- re-sort tasks

## Delta Detection Rules

### 1. Status Delta

Status delta is determined by direct string comparison of the top-level `Status:` lines between `{review_input}` and `{story_path}`.

### 2. Latest Review Findings Delta

The tool must not diff `## Latest Review Findings` line by line against `{story_path}`.

Instead, it must treat the `review_input.md` body for that section as the desired authoritative final content for the current cycle and replace the story/spec section body with it.

### 3. Task Delta

For `## Tasks / Subtasks`, delta detection is additive.

The tool must identify lines that:

- appear under `## Tasks / Subtasks` in `{review_input}`
- do not already appear under `## Tasks / Subtasks` in `{story_path}`

Only those newly added lines may be appended to `{story_path}`.

This matching must preserve exact line text and indentation.

## Section Creation Rules

If `{story_path}` is missing any required merge target, the tool must create the missing section rather than failing immediately.

The required merge targets are:

- top-level `Status:`
- `## Latest Review Findings`
- `## Tasks / Subtasks`

When created, missing sections must be appended at the end of `{story_path}` in this order:

1. `## Latest Review Findings`
2. `## Tasks / Subtasks`

`Status:` must be inserted near the beginning of the document rather than at the end.

The tool must not create:

- `## Prior Review Findings`
- `## Acceptance Criteria`
- `## Completion Notes`

as part of the final-documentation merge capability.

Those are not writable targets for this tool.

## Write-Proof And Workflow Completion

After updating `{story_path}`, the tool must:

- persist the file to disk
- record write proof for the updated `{story_path}` path

This write proof is required so deterministic workflow progression can satisfy the Step 6 done signal.

## Reset Behavior For `review_input.md`

After a successful merge, the tool must reset `review_input.md` so it is ready for the next review cycle.

For this capability, “reset” means writing `""` to `{review_input}` after a successful merge.

The tool must not preserve the title, `Status:`, `## Acceptance Criteria`, `## Prior Review Findings`, `## Latest Review Findings`, `## Tasks / Subtasks`, or `## Completion Notes`.

The tool must not delete `review_input.md` outright.

## Failure Handling

### 1. Missing `review_input`

If `{review_input}` cannot be resolved or read, the tool must surface an error in the chat UI and must not modify `{story_path}`.

### 2. Missing `story_path`

If `{story_path}` cannot be resolved or read, the tool must surface an error in the chat UI and must not modify `review_input.md`.

### 3. Missing Required Writable Surface In `review_input`

If `review_input.md` does not contain one or more required writable surfaces:

- top-level `Status:`
- `## Latest Review Findings`
- `## Tasks / Subtasks`

the tool must fail rather than guessing.

### 4. Non-Deterministic Delta

If the tool cannot deterministically distinguish review-authored new content from carried-forward baseline content, it must fail rather than guessing.

This especially applies if:

- the review-input shape has drifted away from the normalized contract
- task content cannot be safely compared against the story/spec task section

### 5. Partial Failure

The tool must not partially update `{story_path}`.

If any required merge step fails, neither the final `{story_path}` update nor the `review_input.md` reset may be persisted.

## Output Contract

On success, the tool must return `formatResponse.toolResult(JSON.stringify({ persisted: true, story_path_updated: true, review_input_cleared: true, story_path_path: "<absolute path>", review_input_path: "<absolute path>" }))`.

On failure, the tool must return surfaced `formatResponse.toolError(...)`.

No structured fallback/no-go payload exists for this tool.

## Non-Goals

This tool is not responsible for:

- deciding what the review findings should be
- validating whether the triage classifications are correct
- generating remediation tasks
- updating deterministic gates by itself
- changing workflow-form behavior

## Action-Plan Readiness

Any action plan built from this document must include work for:

- internal tool id and runtime registration for `code_review_spec_update`
- deterministic parsing of `review_input.md` writable surfaces
- deterministic section-targeted merge into `{story_path}`
- reset behavior for `review_input.md`
- structured result contract
- focused handler and merge tests
- verification of write-proof side effects
- explicit confirmation that prompt/provider/tool-matrix exposure is out of scope for this tool
