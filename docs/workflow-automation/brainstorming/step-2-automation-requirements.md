# Brainstorming Step 2 Automation Requirements

## Purpose

This document defines the requirements for the Step 2 automation in [brainstorming.md](/Users/robertboston/Documents/Cline/Workflows/brainstorming.md).

This slice covers only the system-owned Step 2 behavior:

- inspect the brainstorming session output directory
- detect existing brainstorming session files
- identify the newest continuation candidate
- let the user choose whether to continue the newest session, start a new session, or list all sessions
- if the user starts a new session, create the output directory if needed and copy the canonical brainstorming template into a new date-based brainstorming session file
- if the user continues an existing session, persist that existing session path as `{output_file}`
- if the user asks to list all sessions, present a dropdown-based picker so they can choose one existing session
- persist the chosen path as `{output_file}`

This document does not define:

- deterministic Step 2 completion rules
- workflow start form behavior
- Step 3 topic/goals automation
- Step 4 technique-selection automation
- contextual tool matrix rollout
- persona activation

Those belong to separate capability documents.

## Source Of Truth

These requirements are grounded in:

- [brainstorming.md](/Users/robertboston/Documents/Cline/Workflows/brainstorming.md)
- [enablement-tracker.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/brainstorming/enablement-tracker.md)
- [template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-brainstorming/template.md)
- [brain-methods.csv](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-brainstorming/brain-methods.csv)
- [.cline/workflow-config.yaml](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/workflow-config.yaml)
- [SelectTargetEpicToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts)
- [BuildTechSpecDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts)
- [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts)
- [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)

## Capability Boundary

This slice defines the runtime-owned Step 2 session-preparation behavior for `brainstorming.md`.

This slice must:

- keep Step 2 system-owned
- resolve all paths from workflow-owned placeholder state and stable workflow placeholders
- persist only the final chosen session path as `{output_file}`
- support the user-visible `continue`, `start new`, and `list all sessions` branches described in the workflow

This slice must not:

- modify deterministic workflow progression support
- define Step 2 done-signal evaluation
- automate Step 3 or Step 4
- ask the model to choose which session file to use
- persist brainstorming topic, approach, or technique data

## Core Requirement

When `brainstorming.md` Step 2 is active, the runtime must perform the exact authored workflow behavior in [brainstorming.md](/Users/robertboston/Documents/Cline/Workflows/brainstorming.md#L7):

1. inspect `{output_folder}/brainstorming/` for existing session files
2. if existing session files are present, treat the newest date-based session as the continuation candidate
3. ask the user whether to continue the newest session, start a new session, or list all sessions
4. if the user starts a new session, create the folder if needed, copy the canonical brainstorming template, and set `{output_file}` to the new date-based brainstorming session file path
5. if the user continues an existing session, set `{output_file}` to that existing session file path
6. if the user asks to list all sessions, present a dropdown picker containing all discovered session files, let the user choose one, and set `{output_file}` to the selected existing session file path

## Path Resolution Requirements

### 1. Stable placeholder source

The Step 2 automation must resolve `output_folder` from the active placeholder workflow state and stable workflow placeholders.

### 2. Canonical session directory

The canonical brainstorming session directory must be:

- `{output_folder}/brainstorming/`

### 3. Canonical new-session file shape

When the user chooses to start a new session, the new session file path must be:

- `{output_folder}/brainstorming/brainstorming-session-{{date}}.md`

### 4. Canonical template source

The canonical template source for new sessions must be:

- `{project-root}/.cline/skills/bmad-brainstorming/template.md`

This must resolve to [template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-brainstorming/template.md).

### 5. Placeholder persistence target

The only placeholder this slice must persist is:

- `output_file`

## Existing Session Discovery Requirements

### 1. Discovery scope

The runtime must inspect only the canonical brainstorming session directory for existing session files.

### 2. Filename filter

The continuation-candidate and list-all logic must consider only files matching these authored date-based patterns:

- `brainstorming-session-<date>.md`
- `brainstorming-session-<date>-<integer>.md`

### 3. Newest-session rule

If multiple session files exist, the continuation candidate must be selected by:

- sorting sessions by ISO date descending
- for equal dates, sorting by numeric suffix descending
- treating the unsuffixed base file as sequence `1`

### 4. Empty-directory rule

If no matching session files exist, the runtime must skip the continue/list choices and go directly down the new-session path.

## User Interaction Requirements

### 1. Existing-session branch options

When one or more existing session files are present, the runtime must present exactly these three user-visible choices:

- `Continue newest session`
- `Start new session`
- `List all sessions`

### 2. Continue-newest behavior

If the user chooses `Continue newest session`, the runtime must:

- select the newest date-based session file
- persist that existing absolute file path as `{output_file}`
- not create a new file
- not copy the template

### 3. Start-new behavior

If the user chooses `Start new session`, the runtime must:

- create the brainstorming output directory if it does not already exist
- copy the canonical brainstorming template into the new date-based brainstorming session file
- persist that new absolute file path as `{output_file}`

### 4. List-all behavior

If the user chooses `List all sessions`, the runtime must present a structured picker using the existing workflow-form surface with:

- one dropdown field
- one option per discovered session file
- the ability to submit one selected existing session

### 5. List-all option contents

Each dropdown option in the list-all picker must identify one existing session file unambiguously enough for the user to distinguish between sessions.

The persisted value for the chosen option must resolve back to the selected file path exactly.

### 6. List-all completion behavior

After the user submits a selection from the list-all picker, the runtime must:

- persist that selected existing absolute file path as `{output_file}`
- not create a new file
- not copy the template

## File Creation Requirements

### 1. Directory creation

On the start-new path, the runtime must create the canonical brainstorming directory if it does not already exist.

### 2. Template-copy semantics

On the start-new path, the runtime must copy the contents of [template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-brainstorming/template.md#L2) into the newly created session file so the resulting file preserves the canonical brainstorming-session structure.

### 3. Existing-file safety

The start-new path must target a newly resolved date-based path and must not overwrite an unrelated pre-existing file.

### 4. Same-day collision handling

When the runtime creates a new same-day session file:

- the first same-day file must use `brainstorming-session-YYYY-MM-DD.md`
- if that file already exists, the next same-day file must use `brainstorming-session-YYYY-MM-DD-2.md`
- later collisions must use the next unused integer suffix

## Persistence Requirements

### 1. Persistence path

After the runtime resolves the chosen session path, it must persist `output_file` through the existing workflow placeholder persistence path implemented by [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts).

### 2. Value shape

The persisted placeholder payload must contain exactly:

- `output_file: "<selected or created absolute session path>"`

### 3. No additional placeholder writes

This slice must not persist:

- `brainstorming_session_output_file`
- `selected_approach`
- `selected_technique`
- topic or goals content

## Turn Behavior Requirements

### 1. System-owned behavior

This automation is fully system-owned.

The runtime must own:

- session discovery
- continuation-candidate selection
- new-session path generation
- template-copy behavior
- list-all session enumeration
- `{output_file}` persistence

### 2. No model-authored selection logic

The model must not be asked to:

- choose the continuation candidate
- infer which existing session to continue
- generate the session list
- decide whether the template should be copied

## Failure Requirements

The Step 2 automation must fail with a runtime/tool error if any of these are true:

- `output_folder` cannot be resolved from workflow state
- the canonical brainstorming template path cannot be resolved
- the canonical brainstorming template cannot be read
- the runtime cannot enumerate the canonical brainstorming directory when existing-session discovery is required
- the runtime cannot create the brainstorming directory on the start-new path
- the runtime cannot create or copy the new session file on the start-new path
- the runtime cannot persist `output_file`
- the user chooses `List all sessions` but the runtime cannot render or complete the structured picker

## Explicit Non-Requirements

This slice does not require:

- deterministic Step 2 completion rules
- changes to the deterministic workflow support registry
- changes to the authored Step 2 workflow text
- changes to the brainstorming template contents
- selection of any brainstorming technique
- writing any data into the `## Topic`, `## Selected Approach`, or `## Selected Techniques` sections

## Verification Expectations

At minimum, implementation coverage for this slice must prove:

- no-existing-session flow creates a new date-based brainstorming session file from the canonical template and persists `{output_file}`
- existing-session flow offers the three required choices
- continue-newest persists the newest existing session without creating a new file
- start-new creates a new date-based brainstorming session file from the canonical template even when existing sessions are present, including the numeric same-day collision suffix rule
- list-all renders a dropdown-based picker populated from discovered sessions and persists the selected session path
- template-read, directory-create, file-create, picker, and persistence failures surface as errors rather than silently falling back
