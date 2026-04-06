# PI Planning Step 2 Automation Requirements

## Purpose

This document defines the requirements for the Step 2 automation in [pi-planning.md](/Users/robertboston/Documents/Cline/Workflows/pi-planning.md).

This slice covers only the system-owned Step 2 behavior:

- read `{epics_document}`
- extract the canonical epic list
- present the epics as clickable followup-style buttons
- persist the selected epic into `target_epic`
- return control to normal deterministic workflow progression

This document does not define:

- workflow-start form behavior
- deterministic Step 2 completion rules
- Step 3 artifact creation
- contextual tool matrix rollout
- persona activation

Those belong to separate capability documents.

## Source Of Truth

These requirements are grounded in:

- [pi-planning.md](/Users/robertboston/Documents/Cline/Workflows/pi-planning.md)
- [progress-tracker.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/pi-planning/progress-tracker.md)
- [how-to-add-a-tool.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/tools-reference/how-to-add-a-tool.md)
- [epics-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md)
- [AskFollowupQuestionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AskFollowupQuestionToolHandler.ts)
- [WorkflowProgressRequestToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts)
- [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts)

## Capability Boundary

This slice introduces a new workflow-owned built-in tool for Step 2.

The canonical tool id and exposed tool name must be:

- `select_target_epic`

This slice must not:

- add a workflow form for Step 2
- carry the clicked epic back into a normal user turn
- ask the model to choose the epic
- persist any placeholder other than `target_epic`

## Core Requirement

When `pi-planning.md` Step 2 is active, the runtime must support a system-owned tool named `select_target_epic` that:

1. resolves `{epics_document}` from active placeholder workflow state
2. reads that file
3. extracts the canonical epic list from the document
4. presents the user with a followup-style button list labeled `Which epic would you like to work on?`
5. persists the clicked selection as `target_epic`
6. returns control to the existing deterministic workflow path

## Tool Contract

### 1. Tool identity

The tool id must be:

- `select_target_epic`

### 2. Workflow-owned input model

`select_target_epic` must be workflow-owned.

The model must not provide user-authored tool arguments for:

- the question text
- the option labels
- the source document path
- the target placeholder key

The runtime must own all of those values.

### 3. Step scope

This tool is the Step 2 automation for `pi-planning.md`.

This document does not require global exposure of the tool outside the intended workflow/step gating for this automation.

## Runtime Input Resolution Requirements

### 1. Placeholder source

The tool must resolve `epics_document` from merged placeholder workflow state using the existing placeholder-resolution path.

### 2. Missing placeholder failure

If `epics_document` cannot be resolved from active placeholder workflow state, the tool must fail with a tool error.

### 3. File-read failure

If the resolved `epics_document` path cannot be read, the tool must fail with a tool error.

## Epic Extraction Requirements

### 1. Canonical extraction source

The canonical source shape for the epic list is the authored epics template at [epics-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md).

### 2. Canonical anchor

The tool must extract epics from the canonical epic-list section headed by:

- `### Epic List`

### 3. Canonical epic heading format

Within that section, the tool must recognize repeated epic headings in this shape:

- `### Epic N: Title`

where:

- `N` is the displayed epic number
- `Title` is the displayed epic title text after the colon

### 4. Display-label normalization

The markdown heading prefix must not be shown in the UI buttons.

If the source heading is:

- `### Epic 3: Checkout`

the displayed button label must be:

- `Epic 3: Checkout`

### 5. Persisted value shape

When the user clicks a button, `target_epic` must be stored using the exact displayed button label.

Example:

- button label: `Epic 3: Checkout`
- persisted `target_epic`: `Epic 3: Checkout`

### 6. Empty-list failure

If the tool cannot extract any epic headings from the canonical section, it must fail with a tool error rather than presenting an empty followup ask.

## UI / Ask Requirements

### 1. Existing UI surface

This tool must use the existing inline followup ask surface already used by `ask_followup_question` and `workflow_progress_request`.

It must not introduce:

- a workflow form
- a new dedicated UI payload type
- a custom button-rendering system

### 2. Exact question text

The followup question must be labeled exactly:

- `Which epic would you like to work on?`

### 3. Option labels

Each extracted epic must appear as a separate clickable option button using the normalized display label described above.

### 4. Selected-option reflection

After the user clicks an option, the inline followup row must reflect the selected option using the existing selected-option behavior already used by followup asks.

## Persistence Requirements

### 1. Persistence path

After the user selects an option, the runtime must persist `target_epic` through the existing `set_workflow_placeholders` path.

### 2. Placeholder key

The placeholder key must be exactly:

- `target_epic`

### 3. Value payload

The persisted placeholder payload must contain exactly:

- `target_epic: "<selected display label>"`

This slice does not require the tool to persist:

- `epics_document`
- `architecture_document`
- `epic_delivery_spec`
- any derived epic number field

### 4. Reuse of existing persistence semantics

The tool must reuse the existing workflow placeholder persistence semantics rather than inventing a separate storage mechanism.

That includes:

- in-memory placeholder state updates
- normal task metadata persistence
- normal deterministic re-check triggering after placeholder persistence

## Turn Behavior Requirements

### 1. System-owned turn behavior

This automation is fully system-owned.

After the user clicks an epic button, the runtime must:

- persist `target_epic`
- trigger normal deterministic workflow re-evaluation

It must not:

- queue the clicked epic back into a normal user-turn continuation
- insert the clicked value into model-visible chat as user dialogue

### 2. Relationship to Step 4 prompting

The selected epic is expected to appear later through workflow placeholder rendering in Step 4 instructions.

Step 2 does not need to create an additional model-visible recap turn for that to happen.

## Failure Requirements

The tool must fail with a tool error if any of these are true:

- no active placeholder workflow is available
- `pi-planning.md` is not the active workflow context for this automation
- `epics_document` cannot be resolved
- the resolved `epics_document` cannot be read
- no canonical epic headings can be extracted
- no user selection is obtained from the interactive followup ask

## Non-Requirements

This slice does not require:

- support for non-canonical epic heading formats
- support for multiple document templates
- title-only persistence of `target_epic`
- model-authored followup wording
- a workflow form
- a new proto message shape
- Step 3 artifact generation

## Test Requirements

Add or update tests proving:

- `select_target_epic` is registered as a built-in tool with the expected non-response-tool wiring
- the tool fails when `epics_document` is missing
- the tool fails when the resolved document cannot be read
- the tool fails when no canonical epic headings can be extracted
- the tool renders a followup ask with the exact question `Which epic would you like to work on?`
- the tool renders one option per extracted epic using labels like `Epic 3: Checkout` without the `###` prefix
- the selected option is reflected into the existing followup row state
- clicking an option persists `target_epic` through the existing placeholder path
- the persisted value exactly matches the clicked display label
- the tool does not queue a normal user-turn continuation after the click
- deterministic workflow re-check still occurs through the normal placeholder-update path after persistence
