# Quick Spec Tool Configuration Requirements

## Purpose

This document defines the contextual tool-matrix and supporting prompt-exposure requirements for [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md).

This slice covers:

- contextual native-tool exposure for active `quick-spec.md` workflow steps
- `workflow_progress_request` support-map alignment for `quick-spec.md`
- prompt-teaching behavior for `workflow_progress_request` during `quick-spec.md` Steps 3 through 9
- canonical documentation alignment for the contextual tool schema inventory

This document does not define:

- workflow-start card behavior
- workflow-start form behavior
- deterministic step progression rules
- Step 2 automation or the Step 2 scaffold-building tool contract
- persona activation
- `workflow_progress_request` handler behavior

Those belong to separate capability documents.

## Source Of Truth

These requirements are grounded in:

- [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md)
- [enablement-tracker](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/quick-spec/enablement-tracker)
- [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md)
- [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts)
- [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts)
- [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts)
- [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts)
- [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts)
- [workflow_progress_request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/workflow_progress_request.ts)
- [build-tech-spec-document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/build-tech-spec-document.ts)

## Capability Boundary

This slice is about tool configuration and prompt exposure only.

It must:

- define the intended step-level native-tool rows for `quick-spec.md` Steps 1 through 10
- ensure `workflow_progress_request` is exposed for `quick-spec.md` Steps 3 through 9
- ensure prompt guidance follows that same exposure decision
- align the canonical documentation with the actual quick-spec contextual row

It must not:

- alter the runtime-owned `workflow_progress_request` question text
- alter the runtime-owned `workflow_progress_request` Yes/No option labels
- redefine the Step 2 builder tool contract
- redefine deterministic completion rules
- introduce workflow-form controls
- add new workflow-specific response tools

## Overall Configuration Requirement

`quick-spec.md` must have a fully defined step-level native-tool configuration that matches the live ten-step workflow.

For this slice, the canonical active-step native-tool configuration must be:

- Step 1: `PLACEHOLDER_WRITE`
- Step 2: `TECH_SPEC_DOCUMENT_BUILD`
- Step 3: `DOC_READ`, `DOC_WRITE`, `WORKFLOW_PROGRESS_REQUEST`
- Step 4: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `WORKFLOW_PROGRESS_REQUEST`
- Step 5: `DOC_READ`, `DOC_WRITE`, `WORKFLOW_PROGRESS_REQUEST`
- Step 6: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `WORKFLOW_PROGRESS_REQUEST`
- Step 7: `DOC_READ`, `DOC_WRITE`, `WORKFLOW_PROGRESS_REQUEST`
- Step 8: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `WORKFLOW_PROGRESS_REQUEST`
- Step 9: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `SUBAGENT_COORD`, `WORKFLOW_PROGRESS_REQUEST`
- Step 10: `DOC_READ`, `DOC_WRITE`

## Contextual Tool Matrix Requirements

### Step 1 row

`quick-spec.md` Step 1 must expose exactly:

- `PLACEHOLDER_WRITE`

Rationale grounded in the workflow:

- Step 1 exists to gather the required `title`
- if workflow-start collection falls through to a normal active AI turn, the model needs placeholder-writing support
- Step 1 does not require document read/write or local execution from the authored workflow contract

### Step 2 row

`quick-spec.md` Step 2 must expose exactly:

- `TECH_SPEC_DOCUMENT_BUILD`

Rationale grounded in the workflow:

- Step 2 is a system-owned scaffold-building step
- the canonical builder tool contract already exists for `build_tech_spec_document`
- this step should not expose general read/write/code-exploration bundles in this slice

### Step 3 row

`quick-spec.md` Step 3 must expose exactly:

- `DOC_READ`
- `DOC_WRITE`
- `WORKFLOW_PROGRESS_REQUEST`

Rationale grounded in the workflow:

- Step 3 captures the objective and problem framing in `{output_file}`
- Step 3 must read the working spec and update it
- Step 3 exits only after user confirmation via `workflow_progress_request`

### Step 4 row

`quick-spec.md` Step 4 must expose exactly:

- `DOC_READ`
- `DOC_WRITE`
- `CODE_READ`
- `INDXR_DISCOVERY`
- `INDXR_SOURCE_READ`
- `INDXR_SYMBOL_GRAPH`
- `WORKFLOW_PROGRESS_REQUEST`

Rationale grounded in the workflow:

- Step 4 may review runtime code and provided context to recommend a workable solution
- Step 4 must update `{output_file}`
- Step 4 exits only after user confirmation via `workflow_progress_request`

### Step 5 row

`quick-spec.md` Step 5 must expose exactly:

- `DOC_READ`
- `DOC_WRITE`
- `WORKFLOW_PROGRESS_REQUEST`

Rationale grounded in the workflow:

- Step 5 defines in-scope and out-of-scope boundaries in the spec document
- the step is document-centric and user-confirmed

### Step 6 row

`quick-spec.md` Step 6 must expose exactly:

- `DOC_READ`
- `DOC_WRITE`
- `CODE_READ`
- `INDXR_DISCOVERY`
- `INDXR_SOURCE_READ`
- `INDXR_SYMBOL_GRAPH`
- `WORKFLOW_PROGRESS_REQUEST`

Rationale grounded in the workflow:

- Step 6 establishes repo-specific development context, patterns, and technical decisions
- the workflow explicitly allows code review where necessary
- the step updates `{output_file}` and exits through `workflow_progress_request`

### Step 7 row

`quick-spec.md` Step 7 must expose exactly:

- `DOC_READ`
- `DOC_WRITE`
- `WORKFLOW_PROGRESS_REQUEST`

Rationale grounded in the workflow:

- Step 7 defines acceptance criteria in the working spec
- it is a document-authoring and user-confirmation step

### Step 8 row

`quick-spec.md` Step 8 must expose exactly:

- `DOC_READ`
- `DOC_WRITE`
- `CODE_READ`
- `INDXR_DISCOVERY`
- `INDXR_SOURCE_READ`
- `INDXR_SYMBOL_GRAPH`
- `WORKFLOW_PROGRESS_REQUEST`

Rationale grounded in the workflow:

- Step 8 determines implementation seams and may require bounded code inspection
- it updates `{output_file}`
- it exits only after user confirmation via `workflow_progress_request`

### Step 9 row

`quick-spec.md` Step 9 must expose exactly:

- `DOC_READ`
- `DOC_WRITE`
- `CODE_READ`
- `INDXR_DISCOVERY`
- `INDXR_SOURCE_READ`
- `INDXR_SYMBOL_GRAPH`
- `SUBAGENT_COORD`
- `WORKFLOW_PROGRESS_REQUEST`

Rationale grounded in the workflow:

- Step 9 explicitly instructs the main agent to launch subagents for seam-based task discovery
- the main agent must also read and write the tech spec while consolidating subagent output
- repo/code exploration remains necessary to validate and normalize the resulting tasks
- the step exits only after user confirmation via `workflow_progress_request`

### Step 10 row

`quick-spec.md` Step 10 must expose exactly:

- `DOC_READ`
- `DOC_WRITE`

Rationale grounded in the workflow:

- Step 10 is a final document review and cleanup pass
- it does not use `workflow_progress_request`
- it does not require subagent coordination or code exploration in this slice

## Workflow Progress Request Support Requirements

### Supported workflow-step map

The shared `workflow_progress_request` support map must include:

- `quick-spec.md`: Steps 3 through 9

### Step-specific support

For `quick-spec.md`:

- Step 3 must be treated as a supported `workflow_progress_request` step
- Step 4 must be treated as a supported `workflow_progress_request` step
- Step 5 must be treated as a supported `workflow_progress_request` step
- Step 6 must be treated as a supported `workflow_progress_request` step
- Step 7 must be treated as a supported `workflow_progress_request` step
- Step 8 must be treated as a supported `workflow_progress_request` step
- Step 9 must be treated as a supported `workflow_progress_request` step
- Step 1 must not be treated as a supported `workflow_progress_request` step
- Step 2 must not be treated as a supported `workflow_progress_request` step
- Step 10 must not be treated as a supported `workflow_progress_request` step

## Prompt-Teaching Requirements

### Helper-driven prompt behavior

Prompt teaching for `workflow_progress_request` must follow the same workflow/step exposure decision used by the shared support helper.

The relevant prompt components must key off the shared support decision rather than inventing a separate `quick-spec.md`-specific branch.

### Task-progress teaching

When `quick-spec.md` Steps 3 through 9 are active, the task-progress guidance must teach:

- use `workflow_progress_request` when the active step's Done Signal is true
- do not include `task_progress` on `workflow_progress_request`
- the runtime-owned `Yes` branch completes the next checklist step before the next model request is built
- if the user selects `No`, the workflow does not advance and the conversation continues normally

### Continuation-turn reminder

When `quick-spec.md` Steps 3 through 9 are active on a continuation turn, the continuation reminder must instruct the model to use `workflow_progress_request` when the step is complete.

It must not fall back to the deterministic placeholder reminder:

- `Once you correctly complete the current step, the next step's details will be shown automatically.`

It must not fall back to the placeholder-workflow `send_user_message + task_progress` reminder either.

### Response-tools visibility

When `quick-spec.md` Steps 3 through 9 are active, the response-tools guidance must include `workflow_progress_request` among the available response tools.

This applies to:

- the response-tools section
- the current-mode response-tools line used in continuation prompts

### No Step 10 progression teaching

When `quick-spec.md` Step 10 is active, this slice must not expose or teach `workflow_progress_request`.

## Native Tool Surface Requirements

### Preserved tools remain preserved

The contextual matrix rows above define the workflow-specific native bundles only.

They do not remove the existing always-preserved native tools and response-tool behavior already applied by the prompt runtime.

### Step 2 native surface intent

For `quick-spec.md` Step 2, the native tool surface must include the quick-spec scaffold builder and preserved tools only.

It must not expose:

- general document read/write bundles
- general code-read bundles
- Indxr bundles
- placeholder-writing tools

### Step 9 native surface intent

For `quick-spec.md` Step 9, the native tool surface must allow the model to:

- read and update the working spec
- inspect relevant code seams
- coordinate subagents
- close the step through `workflow_progress_request`

The resulting Step 9 native surface must not omit `SUBAGENT_COORD`.

## Documentation Requirements

The canonical quick-spec entry in [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md) must be updated so it matches the final `quick-spec.md` matrix row.

The documentation must not retain the stale four-step quick-spec inventory.

## Testing Requirements

This slice must add or update regression coverage for:

- the `quick-spec.md` contextual row in the native tool filter
- Step 2 builder-only exposure
- Step 3 `workflow_progress_request` exposure
- Step 9 `SUBAGENT_COORD` plus `workflow_progress_request` exposure
- Step 10 doc-only exposure
- prompt-side continuation/runtime integration proving the updated quick-spec step rows are actually reflected in emitted native tools

This slice does not require new task-progress or response-tools tests if those already pass against the shared `workflow_progress_request` support map and remain aligned after the matrix update.
