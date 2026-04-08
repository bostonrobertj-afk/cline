# Quick Dev Workflow Realignment Requirements

## Purpose

This document defines the requirements to realign workflow progression and contextual tool configuration for [quick-dev.md](/Users/robertboston/Documents/Cline/Workflows/quick-dev.md) with the updated 5-step authored workflow.

This slice covers:

- deterministic workflow progression for machine-checkable `quick-dev.md` steps
- shared `workflow_progress_request` support for the user-confirmed quick-dev context step
- contextual native-tool exposure for each authored quick-dev step
- prompt-teaching alignment for `workflow_progress_request`
- canonical documentation alignment for the contextual tool schema inventory

This slice does not define:

- workflow-start form behavior
- workflow-start card behavior
- persona activation
- `spec_file` system-dictionary key registration
- `workflow_progress_request` handler behavior beyond supported workflow/step mapping

Those belong to separate capability documents.

## Source Of Truth

These requirements are grounded in:

- [quick-dev.md](/Users/robertboston/Documents/Cline/Workflows/quick-dev.md)
- [enablement-tracker.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/quick-dev/enablement-tracker.md)
- [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md)
- [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts)
- [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts)
- [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts)
- [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts)
- [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts)
- [workflow_progress_request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/workflow_progress_request.ts)
- [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md)
- [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)
- [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)
- [tech-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-quick-spec/tech-spec-template.md)

## Capability Boundary

This slice must realign the runtime so `quick-dev.md` behaves like the updated authored workflow instead of the stale 6-step configuration currently present in contextual-tool configuration.

It must:

- support `quick-dev.md` as a deterministic placeholder workflow
- align step advancement with the authored 5-step workflow
- expose the correct contextual native tools for each quick-dev step
- expose and teach `workflow_progress_request` for Step 2 only
- update the canonical contextual-tool schema documentation to match runtime

It must not:

- change workflow-start form capability behavior
- redesign the quick-dev workflow document
- introduce new workflow-specific response tools
- change the runtime-owned `workflow_progress_request` question or option labels
- change persona mapping for `quick-dev.md`

## Overall Workflow Realignment Requirement

`quick-dev.md` must be treated as a 5-step workflow with this exact runtime contract:

- Step 1: deterministic completion when `spec_file` is available and resolves to an existing file
- Step 2: advancement only through `workflow_progress_request`
- Step 3: deterministic completion when the `### Tasks` section in `{spec_file}` contains at least one checklist item and no unchecked checklist items remain
- Step 4: deterministic completion when the current turn successfully executes a `git commit` command
- Step 5: deterministic completion only when the current turn successfully executes `attempt_completion`

The contextual native-tool configuration must match the same 5-step workflow.

## Deterministic Workflow Progression Requirements

### 1. Supported-workflow registration

`quick-dev.md` must be added to the deterministic placeholder workflow support allowlist and type unions.

The exact workflow name must be:

- `quick-dev.md`

Support must be keyed by exact workflow name, not loose filename matching.

### 2. Step 1 completion

Step 1 must complete when:

- `spec_file` exists in merged placeholder workflow state
- `spec_file.trim()` is non-empty
- `spec_file` resolves to an existing file on disk

Step 1 must not require any document-content validation beyond file existence.

### 3. Step 2 progression contract

Step 2 must not be deterministically auto-completed from document state.

Step 2 must advance only through shared runtime-owned `workflow_progress_request`.

### 4. Step 3 completion

Step 3 must complete only when the runtime can prove that implementation work has been fully checked off inside the active spec file.

The evaluator must require:

- `spec_file` resolves to an existing file
- the file contains a `### Tasks` section
- the `### Tasks` section contains at least one checklist item
- the `### Tasks` section contains no unchecked checklist items

Checklist items outside the `### Tasks` section must not affect Step 3 completion.

This requirement intentionally mirrors the `dev-story` execution-step completion pattern, but it must be grounded in the actual quick-spec artifact structure rather than the story-specific `## Tasks / Subtasks` section name.

### 5. Step 4 completion

Step 4 must complete only when deterministic progression receives current-turn tool context proving a successful `git commit` command was executed.

The evaluator must require all of the following:

- `toolName === "execute_command"`
- `toolWasExecuted === true`
- the executed command is a `git commit` invocation

Step 4 must not complete from document state alone.

Step 4 must not complete from `attempt_completion`.

### 6. Step 5 completion

Step 5 must complete only when deterministic progression receives current-turn tool context showing that:

- `toolName === "attempt_completion"`
- `toolWasExecuted === true`

Step 5 must not complete from document state alone.

## Shared Workflow Progress Request Requirements

`quick-dev.md` must be added to the shared `workflow_progress_request` workflow-step allowlist with this exact step set:

- `quick-dev.md`: `[2]`

That shared support must drive:

- tool exposure
- prompt teaching
- continuation-turn guidance
- runtime-owned `Yes` branch advancement for Step 2

This slice must not add Steps 3, 4, or 5 to `workflow_progress_request`.

## Contextual Tool Matrix Requirements

The canonical contextual-tool row for `quick-dev.md` must be:

- Step 1: `PLACEHOLDER_WRITE`
- Step 2: `DOC_READ`, `DOC_WRITE`, `WORKFLOW_PROGRESS_REQUEST`
- Step 3: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `LOCAL_EXEC`
- Step 4: `LOCAL_EXEC`
- Step 5: no additional tools

### Step 1 row

`quick-dev.md` Step 1 must expose exactly:

- `PLACEHOLDER_WRITE`

Rationale grounded in the workflow:

- Step 1 is the `spec_file` identification/start-input step
- the workflow-start form handles the normal entry path
- the contextual row exists to preserve the fallback placeholder-entry surface

### Step 2 row

`quick-dev.md` Step 2 must expose exactly:

- `DOC_READ`
- `DOC_WRITE`
- `WORKFLOW_PROGRESS_REQUEST`

Rationale grounded in the workflow:

- Step 2 must read `{spec_file}`
- Step 2 may refine ambiguities or internal conflicts with the user
- Step 2 may update the spec file before execution begins
- Step 2 exits only through `workflow_progress_request`

This slice must not widen Step 2 to live code exploration.

### Step 3 row

`quick-dev.md` Step 3 must expose exactly:

- `DOC_READ`
- `DOC_WRITE`
- `CODE_READ`
- `INDXR_DISCOVERY`
- `INDXR_SOURCE_READ`
- `INDXR_SYMBOL_GRAPH`
- `LOCAL_EXEC`

Rationale grounded in the workflow:

- Step 3 must read the spec and active implementation context
- Step 3 must perform code changes
- Step 3 must update checklist state inside the spec file
- Step 3 must run tests and validation commands

This slice must not add `SUBAGENT_COORD` to Step 3 unless the authored workflow later explicitly allows subagent coordination.

### Step 4 row

`quick-dev.md` Step 4 must expose exactly:

- `LOCAL_EXEC`

Rationale grounded in the workflow:

- Step 4 is exclusively the commit step
- the required action is a `git commit` command
- no additional document-writing or code-discovery bundle is required by the authored workflow text

### Step 5 row

`quick-dev.md` Step 5 must expose no additional contextual native tools.

Rationale grounded in the workflow:

- Step 5 is the final user update step
- response-tool guidance remains available through the normal prompt runtime
- this slice must not widen the final update step into an additional code/document-edit phase

## Prompt-Teaching Requirements

Prompt teaching for `workflow_progress_request` must follow the same workflow/step exposure decision used by the shared support helper.

For `quick-dev.md`:

- Step 2 must expose and teach `workflow_progress_request`
- Steps 1, 3, 4, and 5 must not expose or teach `workflow_progress_request`

When `quick-dev.md` Step 2 is active, the prompt must teach:

- use `workflow_progress_request` when the active step is complete
- do not include `task_progress` on `workflow_progress_request`
- the runtime-owned `Yes` branch advances the workflow before the next model request is built
- if the user selects `No`, the workflow does not advance and the conversation continues normally

Continuation-turn guidance must follow the same Step 2-only rule.

## Documentation Alignment Requirements

The canonical `quick-dev.md` row in [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md) must be updated to match the runtime row exactly.

This slice must remove the stale 6-step quick-dev documentation contract and replace it with the authored 5-step contract.

## Non-Requirements

This slice must not:

- add or change quick-dev persona mapping
- change workflow-start form rendering or field behavior
- invent a document-state completion rule for Step 4 that is not tied to successful `git commit`
- expose `workflow_progress_request` for Step 3, Step 4, or Step 5
- make Step 5 depend on commit detection instead of `attempt_completion`

## Testing Requirements

Focused coverage must be added or updated for:

- deterministic supported-workflow registration for `quick-dev.md`
- Step 1 success when `spec_file` resolves to an existing file
- Step 1 failure when `spec_file` is missing or points to a missing file
- Step 3 success when the `### Tasks` section contains at least one checklist item and no unchecked checklist items
- Step 3 failure when the `### Tasks` section contains an unchecked item
- Step 3 failure when the file has checklist items outside `### Tasks` but none inside `### Tasks`
- Step 4 success from successful `execute_command` tool context running `git commit`
- Step 4 failure when the command is not `git commit`
- Step 5 success from successful `attempt_completion`
- shared `workflow_progress_request` support for `quick-dev.md` Step 2 only
- contextual native-tool filtering for all five quick-dev steps
- prompt teaching and continuation guidance showing `workflow_progress_request` for Step 2 only
- canonical contextual-tool documentation alignment
