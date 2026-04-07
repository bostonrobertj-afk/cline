# Create Story Tool Configuration Requirements

## Purpose

This document defines the contextual tool-matrix and supporting prompt-exposure requirements for [create-story.md](/Users/robertboston/Documents/Cline/Workflows/create-story.md).

This slice covers:

- contextual native-tool exposure for active `create-story.md` workflow steps
- `workflow_progress_request` support-map alignment for `create-story.md`
- prompt-teaching behavior for `workflow_progress_request` during `create-story.md` Steps 3 and 4
- canonical documentation alignment for the contextual tool schema inventory

This slice does not define:

- workflow-start form behavior
- deterministic step progression rules
- Step 2 automation or the Step 2 scaffold-building tool contract
- persona activation
- `workflow_progress_request` handler behavior

Those belong to separate capability documents.

## Source Of Truth

These requirements are grounded in:

- [create-story.md](/Users/robertboston/Documents/Cline/Workflows/create-story.md)
- [enablement-tracker.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/create-story/enablement-tracker.md)
- [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md)
- [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts)
- [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts)
- [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts)
- [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts)
- [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts)
- [workflow_progress_request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/workflow_progress_request.ts)

## Capability Boundary

This slice is about tool configuration and prompt exposure only.

It must:

- define the intended step-level native-tool rows for `create-story.md` Steps 3 through 5
- ensure `workflow_progress_request` is exposed for `create-story.md` Steps 3 and 4
- ensure prompt guidance follows that same exposure decision
- leave Step 2 tool exposure undefined until the separate Step 2 automation slice defines the canonical tool contract

It must not:

- invent a Step 2 tool id or Step 2 tool bundle before the Step 2 automation slice is designed
- alter the runtime-owned `workflow_progress_request` question text
- alter the runtime-owned `workflow_progress_request` Yes/No option labels
- add new workflow-specific response tools
- introduce workflow-form controls
- change the deterministic Step 1 through Step 5 completion contract

## Overall Configuration Requirement

`create-story.md` must have a fully defined step-level native-tool configuration for its post-start, post-scaffold active AI turns.

For this slice, the canonical active-step native-tool configuration must be:

- Step 3: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `WORKFLOW_PROGRESS_REQUEST`
- Step 4: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `SUBAGENT_COORD`, `WORKFLOW_PROGRESS_REQUEST`
- Step 5: `DOC_READ`, `DOC_WRITE`

This document does not require a Step 1 contextual row because the workflow-start input collection for Step 1 is handled before the normal active-step tool-selection phase.

This document intentionally does not define a Step 2 contextual row because the Step 2 automation slice has not yet defined the canonical scaffold-building tool path.

## Contextual Tool Matrix Requirements

### 1. Step 3 row

`create-story.md` Step 3 must expose exactly:

- `DOC_READ`
- `DOC_WRITE`
- `CODE_READ`
- `INDXR_DISCOVERY`
- `INDXR_SOURCE_READ`
- `INDXR_SYMBOL_GRAPH`
- `WORKFLOW_PROGRESS_REQUEST`

Rationale grounded in the workflow:

- Step 3 must read `{story_doc}`, `{epic_delivery_spec}`, `{prd}`, `{architecture_document}`, and `{project_context}`
- Step 3 must verify live repo structure against documented structure expectations
- Step 3 must update `{story_doc}`
- Step 3 exits only after user confirmation via `workflow_progress_request`

### 2. Step 4 row

`create-story.md` Step 4 must expose exactly:

- `DOC_READ`
- `DOC_WRITE`
- `CODE_READ`
- `INDXR_DISCOVERY`
- `INDXR_SOURCE_READ`
- `INDXR_SYMBOL_GRAPH`
- `SUBAGENT_COORD`
- `WORKFLOW_PROGRESS_REQUEST`

Rationale grounded in the workflow:

- Step 4 must read the active story and supporting planning/context documents
- Step 4 must inspect live implementation seams deeply enough to author exact tasks and subtasks
- Step 4 explicitly allows the main agent to coordinate subagents for bounded task discovery
- Step 4 must update `{story_doc}`
- Step 4 exits only after user review and confirmation via `workflow_progress_request`

### 3. Step 5 row

`create-story.md` Step 5 must expose exactly:

- `DOC_READ`
- `DOC_WRITE`

Rationale grounded in the workflow and the approved scope decision for this slice:

- Step 5 is a final document-validation and finalization pass
- Step 5 must read the full story document and may correct formatting, consistency, and coverage issues inside that document
- Step 5 must not be widened to live code exploration in this slice
- Step 5 does not currently specify `workflow_progress_request` as its exit mechanism

### 4. No Step 2 bundle definition in this slice

This slice must not define a canonical `create-story.md` Step 2 row until the separate Step 2 automation slice defines the actual scaffold-building tool contract.

This means the implementation for this slice may leave Step 2 unchanged or unresolved for now, but it must not claim that this tool-configuration pass has finalized Step 2 exposure.

### 5. No extra step-local bundles

This slice does not require adding any additional `create-story.md` bundles beyond those listed above.

In particular, this slice does not require:

- `EXTERNAL_RESEARCH` for Steps 3 through 5
- `SUBAGENT_COORD` for Step 3
- `SUBAGENT_COORD` for Step 5
- `WORKFLOW_PROGRESS_REQUEST` for Step 5
- `LOCAL_EXEC` for Steps 3 through 5
- `PLACEHOLDER_WRITE` for Steps 3 through 5
- `WORKFLOW_ROUTE` for Steps 3 through 5

unless a separate approved capability later changes the workflow contract.

## Workflow Progress Request Support Requirements

### 1. Supported workflow-step map

The shared `workflow_progress_request` support map must include:

- `create-story.md`: Steps 3 and 4

### 2. Step-specific support

For `create-story.md`:

- Step 3 must be treated as a supported `workflow_progress_request` step
- Step 4 must be treated as a supported `workflow_progress_request` step
- Step 5 must not be treated as a supported `workflow_progress_request` step

### 3. Scope of this requirement

This document requires support-map alignment and prompt exposure alignment.

It does not redefine the runtime handler behavior for `workflow_progress_request`, which is already governed elsewhere.

## Prompt-Teaching Requirements

### 1. Helper-driven prompt behavior

Prompt teaching for `workflow_progress_request` must follow the same workflow/step exposure decision used by the shared support helper.

This means the relevant prompt components must key off the shared support decision rather than inventing a separate `create-story.md`-specific branch.

### 2. Task-progress teaching

When `create-story.md` Step 3 or Step 4 is active, the task-progress guidance must teach:

- use `workflow_progress_request` when the active step's Done Signal is true
- do not include `task_progress` on `workflow_progress_request`
- the runtime-owned `Yes` branch completes the next checklist step before the next model request is built
- if the user selects `No`, the workflow does not advance and the conversation continues normally

### 3. Continuation-turn reminder

When `create-story.md` Step 3 or Step 4 is active on a continuation turn, the continuation reminder must instruct the model to use `workflow_progress_request` when the step is complete.

It must not fall back to the deterministic placeholder reminder:

- `Once you correctly complete the current step, the next step's details will be shown automatically.`

It must not fall back to the placeholder-workflow `send_user_message + task_progress` reminder either.

### 4. Response-tools visibility

When `create-story.md` Step 3 or Step 4 is active, the response-tools guidance must include `workflow_progress_request` among the response tools the model may use.

This applies to:

- the response-tools section
- the current-mode response-tools line used in continuation prompts

### 5. No Step 5 progression teaching

When `create-story.md` Step 5 is active, this slice must not expose or teach `workflow_progress_request` unless the authored workflow contract is later changed to make Step 5 a `workflow_progress_request` exit step.

## Native Tool Surface Requirements

### 1. Preserved tools remain preserved

The contextual matrix rows above define the workflow-specific native bundles only.

They do not remove the existing always-preserved native tools and response-tool behavior already applied by the prompt runtime.

### 2. Step 3 native surface intent

For `create-story.md` Step 3, the native tool surface must include:

- document read/write capability
- live code/repo exploration capability through the code-read and Indxr bundles
- `workflow_progress_request`

The resulting Step 3 native surface must not include subagent coordination.

### 3. Step 4 native surface intent

For `create-story.md` Step 4, the native tool surface must include:

- document read/write capability
- live code/repo exploration capability through the code-read and Indxr bundles
- subagent coordination
- `workflow_progress_request`

The resulting Step 4 native surface must allow the model to:

- inspect implementation seams deeply enough to author exact tasks and subtasks
- coordinate bounded task-discovery subagents
- write approved task/subtask refinements back into `{story_doc}`
- use `workflow_progress_request` when the workflow is ready to move to final validation

### 4. Step 5 native surface intent

For `create-story.md` Step 5, the native tool surface must include only document read/write capability from workflow-specific bundles.

The resulting Step 5 native surface must allow the model to:

- read the full story document
- repair formatting or consistency issues in that document
- finalize the story document contents

The resulting Step 5 native surface must not include workflow-specific code-read, Indxr, subagent, research, or progression bundles from this slice.

## Documentation Requirements

### 1. Canonical matrix document alignment

[contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md) must be updated so the `create-story.md` row matches the runtime matrix required by this document for Steps 3 through 5.

### 2. Exact documented row shape

The canonical `create-story.md` row in the contextual tool schema document must reflect:

- Step 3: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `WORKFLOW_PROGRESS_REQUEST`
- Step 4: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `SUBAGENT_COORD`, `WORKFLOW_PROGRESS_REQUEST`
- Step 5: `DOC_READ`, `DOC_WRITE`

This slice must not leave the runtime matrix and the canonical contextual-tool doc in disagreement for these steps.

## Non-Requirements

This slice does not require:

- defining Step 2 tool exposure
- implementing the Step 2 automation tool
- changing deterministic progression
- changing workflow-start behavior
- changing the `workflow_progress_request` handler semantics
- changing the runtime-owned `workflow_progress_request` question text
- changing the runtime-owned `workflow_progress_request` option labels
- enabling external research for Steps 3 through 5
- widening Step 5 into a live code-reading pass
- adding persona activation

## Test Requirements

Add or update tests proving:

- `workflow_progress_request` remains step-gated for `create-story.md` Steps 3 and 4 through the shared support helper
- `workflow_progress_request` is not exposed for `create-story.md` Step 5
- the `create-story.md` contextual tool matrix row for Step 3 keeps exactly `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, and `WORKFLOW_PROGRESS_REQUEST`
- the `create-story.md` contextual tool matrix row for Step 4 keeps exactly `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `SUBAGENT_COORD`, and `WORKFLOW_PROGRESS_REQUEST`
- the `create-story.md` contextual tool matrix row for Step 5 keeps exactly `DOC_READ` and `DOC_WRITE`
- the Step 3 native-tool filter result includes `workflow_progress_request`, document read/write tools, code-read tools, and Indxr bundles, but excludes subagent coordination
- the Step 4 native-tool filter result includes `workflow_progress_request`, document read/write tools, code-read tools, Indxr bundles, and subagent coordination
- the Step 5 native-tool filter result includes document read and write tools but excludes workflow-specific code-read, Indxr, subagent, research, and progression bundles
- the Step 3 continuation prompt teaches `workflow_progress_request`
- the Step 4 continuation prompt teaches `workflow_progress_request`
- the Step 5 continuation prompt does not teach `workflow_progress_request`
- the Step 3 and Step 4 continuation prompts do not fall back to the deterministic placeholder auto-advance reminder
- the Step 3 and Step 4 continuation prompts do not fall back to the placeholder `send_user_message + task_progress` reminder
- the task-progress guidance for Step 3 teaches `workflow_progress_request`
- the task-progress guidance for Step 4 teaches `workflow_progress_request`
- the task-progress guidance for Step 5 does not teach `workflow_progress_request`
- the response-tools guidance for Step 3 exposes `workflow_progress_request`
- the response-tools guidance for Step 4 exposes `workflow_progress_request`
- the response-tools guidance for Step 5 does not expose `workflow_progress_request`
