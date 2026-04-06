# PI Planning Tool Configuration Requirements

## Purpose

This document defines the remaining tool-configuration slice for [pi-planning.md](/Users/robertboston/Documents/Cline/Workflows/pi-planning.md).

This slice covers:

- contextual native-tool exposure for active `pi-planning.md` workflow steps
- `workflow_progress_request` support-map alignment for `pi-planning.md`
- prompt-teaching behavior for `workflow_progress_request` during `pi-planning.md` Steps 4 and 5

This slice does not define:

- workflow-start form behavior
- deterministic step progression rules
- Step 2 tool implementation
- Step 3 tool implementation
- persona activation
- `workflow_progress_request` handler behavior

Those belong to separate capability documents.

## Source Of Truth

These requirements are grounded in:

- [pi-planning.md](/Users/robertboston/Documents/Cline/Workflows/pi-planning.md)
- [progress-tracker.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/pi-planning/progress-tracker.md)
- [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md)
- [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts)
- [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts)
- [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts)
- [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts)
- [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts)
- [workflow_progress_request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/workflow_progress_request.ts)

## Capability Boundary

This slice is about tool configuration and prompt exposure only.

It must:

- define the intended step-level native-tool rows for `pi-planning.md`
- ensure `workflow_progress_request` is exposed for `pi-planning.md` Steps 4 and 5
- ensure prompt guidance follows that same exposure decision

It must not:

- alter the runtime-owned `workflow_progress_request` question text
- alter the runtime-owned `workflow_progress_request` Yes/No option labels
- add new workflow-specific response tools
- introduce workflow-form controls
- change the deterministic Step 1 through Step 5 completion contract

## Overall Configuration Requirement

`pi-planning.md` must have a fully-defined step-level native-tool configuration for its active AI turns.

For this workflow, the canonical active-step native-tool configuration must be:

- Step 2: `TARGET_EPIC_SELECT`
- Step 3: `EPIC_DELIVERY_SPEC_BUILD`
- Step 4: `WORKFLOW_PROGRESS_REQUEST`
- Step 5: `DOC_READ`, `DOC_WRITE`, `WORKFLOW_PROGRESS_REQUEST`

This document does not require a Step 1 contextual row because the workflow-start input collection for Step 1 is handled before the normal active-step tool-selection phase.

## Contextual Tool Matrix Requirements

### 1. Step 2 row

`pi-planning.md` Step 2 must expose only:

- `TARGET_EPIC_SELECT`

### 2. Step 3 row

`pi-planning.md` Step 3 must expose only:

- `EPIC_DELIVERY_SPEC_BUILD`

### 3. Step 4 row

`pi-planning.md` Step 4 must expose only:

- `WORKFLOW_PROGRESS_REQUEST`

Rationale grounded in the workflow:

- Step 4 is an expectations-setting step
- the workflow explicitly says not to search or read files to answer project-specific questions in this step
- completion is governed by `workflow_progress_request`

### 4. Step 5 row

`pi-planning.md` Step 5 must expose exactly:

- `DOC_READ`
- `DOC_WRITE`
- `WORKFLOW_PROGRESS_REQUEST`

Rationale grounded in the workflow:

- Step 5 must read `{epic_delivery_spec}`
- Step 5 may use `{epics_document}` as secondary context
- Step 5 must use `{architecture_document}` as a constraint document
- Step 5 must write story updates back into `{epic_delivery_spec}`
- Step 5 exits through `workflow_progress_request`

### 5. No extra step-local bundles

This slice does not require adding any additional `pi-planning.md` Step 4 or Step 5 bundle beyond those listed above.

In particular, this slice does not require Step 4 or Step 5 exposure of:

- `PLACEHOLDER_WRITE`
- `LOCAL_EXEC`
- `WORKFLOW_ROUTE`
- `SUBAGENT_COORD`
- `EXTERNAL_RESEARCH`

unless a separate approved capability later changes the workflow contract.

## Workflow Progress Request Support Requirements

### 1. Supported workflow-step map

The shared `workflow_progress_request` support map must include:

- `pi-planning.md`: Steps 4 and 5

### 2. Step-specific support

For `pi-planning.md`:

- Step 4 must be treated as a supported `workflow_progress_request` step
- Step 5 must be treated as a supported `workflow_progress_request` step
- Step 2 must not be treated as a supported `workflow_progress_request` step
- Step 3 must not be treated as a supported `workflow_progress_request` step

### 3. Scope of this requirement

This document requires support-map alignment and prompt exposure alignment.

It does not redefine the runtime handler behavior for `workflow_progress_request`, which is already governed elsewhere.

## Prompt-Teaching Requirements

### 1. Helper-driven prompt behavior

Prompt teaching for `workflow_progress_request` must follow the same workflow/step exposure decision used by the shared support helper.

This means the relevant prompt components must key off the shared support decision rather than inventing a separate `pi-planning.md`-specific branch.

### 2. Task-progress teaching

When `pi-planning.md` Step 4 or Step 5 is active, the task-progress guidance must teach:

- use `workflow_progress_request` when the active step's Done Signal is true
- do not include `task_progress` on `workflow_progress_request`
- the runtime-owned `Yes` branch completes the next checklist step before the next model request is built
- if the user selects `No`, the workflow does not advance and the conversation continues normally

### 3. Continuation-turn reminder

When `pi-planning.md` Step 4 or Step 5 is active on a continuation turn, the continuation reminder must instruct the model to use `workflow_progress_request` when the step is complete.

It must not fall back to the deterministic placeholder reminder:

- `Once you correctly complete the current step, the next step's details will be shown automatically.`

It must not fall back to the placeholder-workflow `send_user_message + task_progress` reminder either.

### 4. Response-tools visibility

When `pi-planning.md` Step 4 or Step 5 is active, the response-tools guidance must include `workflow_progress_request` among the response tools the model may use.

This applies to:

- the response-tools section
- the current-mode response-tools line used in continuation prompts

### 5. No tool-contract drift

This slice must not change the tool contract text for `workflow_progress_request` beyond what is necessary to keep `pi-planning.md` Step 4 and Step 5 exposure aligned with the shared helper-driven behavior.

## Native Tool Surface Requirements

### 1. Preserved tools remain preserved

The contextual matrix rows above define the workflow-specific native bundles only.

They do not remove the existing always-preserved native tools and response-tool behavior already applied by the prompt runtime.

### 2. Step 4 native surface intent

For `pi-planning.md` Step 4, the native tool surface must be restricted to the preserved native tools plus the workflow-owned progression tool.

The resulting Step 4 native surface must include `workflow_progress_request`.

The resulting Step 4 native surface must not include document read or write tools from workflow-specific bundles.

### 3. Step 5 native surface intent

For `pi-planning.md` Step 5, the native tool surface must include document read/write capability plus `workflow_progress_request`.

The resulting Step 5 native surface must allow the model to:

- read relevant workflow documents
- write approved story refinements back to `{epic_delivery_spec}`
- use `workflow_progress_request` when the workflow is ready to exit

## Non-Requirements

This slice does not require:

- changing Step 2 or Step 3 tool behavior
- changing `workflow_progress_request` handler semantics
- changing the runtime-owned `workflow_progress_request` question text
- changing the runtime-owned `workflow_progress_request` option labels
- adding a Step 1 contextual row
- enabling project-specific read/search capability during Step 4
- adding execution or research tools to Step 5
- adding persona activation

## Test Requirements

Add or update tests proving:

- `workflow_progress_request` remains step-gated for `pi-planning.md` Steps 4 and 5 through the shared support helper
- `workflow_progress_request` is not exposed for `pi-planning.md` Steps 2 or 3
- the `pi-planning.md` contextual tool matrix row for Step 4 keeps only `WORKFLOW_PROGRESS_REQUEST`
- the `pi-planning.md` contextual tool matrix row for Step 5 keeps exactly `DOC_READ`, `DOC_WRITE`, and `WORKFLOW_PROGRESS_REQUEST`
- the Step 4 native-tool filter result includes `workflow_progress_request` and excludes workflow-specific read/write bundles
- the Step 5 native-tool filter result includes `workflow_progress_request`, document read tools, and document write tools
- the Step 4 continuation prompt teaches `workflow_progress_request`
- the Step 5 continuation prompt teaches `workflow_progress_request`
- the Step 4 and Step 5 continuation prompts do not fall back to the deterministic placeholder auto-advance reminder
- the Step 4 and Step 5 continuation prompts do not fall back to the placeholder `send_user_message + task_progress` reminder
- the task-progress guidance for Step 4 teaches `workflow_progress_request`
- the task-progress guidance for Step 5 teaches `workflow_progress_request`
- the response-tools guidance for Step 4 exposes `workflow_progress_request`
- the response-tools guidance for Step 5 exposes `workflow_progress_request`
