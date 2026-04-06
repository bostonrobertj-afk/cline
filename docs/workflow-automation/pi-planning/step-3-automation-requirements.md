# PI Planning Step 3 Automation Requirements

## Purpose

This document defines the requirements for the Step 3 automation in [pi-planning.md](/Users/robertboston/Documents/Cline/Workflows/pi-planning.md).

This slice covers only the system-owned Step 3 behavior used when a new delivery spec must be created:

- resolve the active workflow inputs from placeholder state
- build the canonical epic delivery spec artifact from the approved template
- extract the required epic sections from `{epics_document}` for `{target_epic}`
- write the artifact atomically into the canonical implementation-artifacts location
- persist the resulting artifact path as `epic_delivery_spec`

This document does not define:

- workflow-start form behavior
- Step 2 epic selection behavior
- deterministic Step 3 completion rules after `epic_delivery_spec` is present
- Step 4 or Step 5 prompting behavior
- contextual tool matrix rollout
- persona activation

Those belong to separate capability documents.

## Source Of Truth

These requirements are grounded in:

- [pi-planning.md](/Users/robertboston/Documents/Cline/Workflows/pi-planning.md)
- [progress-tracker.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/pi-planning/progress-tracker.md)
- [how-to-add-a-tool.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/tools-reference/how-to-add-a-tool.md)
- [epic-delivery-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/create-epics/epic-delivery-spec-template.md)
- [epics-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md)
- [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts)
- [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts)
- [placeholderWorkflowWriteProofs.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts)

## Capability Boundary

This slice introduces a new workflow-owned built-in tool for Step 3.

The canonical tool id and exposed tool name must be:

- `build_epic_delivery_spec`

This slice must not:

- run when `epic_delivery_spec` was already provided at Step 1
- introduce a workflow form
- ask the user followup questions
- require human-authored tool arguments
- write stories into the output artifact

## Core Requirement

When `pi-planning.md` Step 3 is active and `epic_delivery_spec` is not already available from prior workflow state, the runtime must support a workflow-owned tool named `build_epic_delivery_spec` that:

1. resolves `{epics_document}` and `{target_epic}` from active placeholder workflow state
2. reads the canonical epics document
3. loads the canonical epic delivery spec template
4. extracts the required epic content for the selected epic
5. creates or replaces the canonical Step 3 delivery spec artifact atomically
6. records write-proof for that artifact during the current task
7. persists the final artifact path as `epic_delivery_spec`

## Tool Contract

### 1. Tool identity

The tool id must be:

- `build_epic_delivery_spec`

### 2. Workflow-owned input model

`build_epic_delivery_spec` must be workflow-owned.

The model must not provide user-authored tool arguments for:

- source document paths
- selected epic text
- artifact path
- template path
- replacement content

The runtime must own all of those values.

### 3. Step scope

This tool is the Step 3 automation for `pi-planning.md`.

This document does not require global exposure of the tool outside the intended workflow/step gating for this automation.

## Runtime Input Resolution Requirements

### 1. Placeholder resolution

The tool must resolve all workflow-owned inputs from merged placeholder workflow state using the existing placeholder-resolution path.

### 2. Required dynamic placeholders

The tool must require:

- `epics_document`
- `target_epic`

### 3. Required stable placeholders

The tool must require stable placeholder resolution for:

- `output_folder`
- `project-root` / `project_root` path expansion support through the existing stable-placeholder path

### 4. Missing input failures

The tool must fail with a tool error if any required input cannot be resolved from the active placeholder workflow state or stable workflow placeholders.

## Canonical Paths

### 1. Template source path

The canonical template source path must follow the install-safe placeholder convention already used elsewhere in the repo:

- `{project-root}/.cline/skills/create-epics/epic-delivery-spec-template.md`

### 2. Artifact directory

The output artifact must be written under:

- `{output_folder}/implementation-artifacts`

### 3. Artifact naming convention

The canonical naming convention must be:

- `epic-<number>-delivery-spec.md`

Example:

- `target_epic = "Epic 3: Checkout"`
- artifact file name = `epic-3-delivery-spec.md`

### 4. Persisted placeholder value

After a successful build, `epic_delivery_spec` must be persisted as the full resolved artifact file path for this task/session.

## Target Epic Extraction Requirements

### 1. Canonical selected-epic shape

The selected epic is expected to be stored exactly as the Step 2 display label:

- `Epic N: Title`

### 2. Epic-number extraction

The Step 3 automation must derive the canonical artifact filename from the selected epic number in `target_epic`.

### 3. Canonical epics-document source shape

The canonical epics document is built from [epics-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md).

The selected-epic section in that source must be located using the canonical heading shape:

- `### Epic N: Title`

matching the selected `target_epic`.

### 4. Required section extraction

From the selected epic section in `{epics_document}`, the tool must extract exactly these sections:

- `#### Objective`
- `#### Description`
- `#### Success Measures`
- `#### Scope`
- `#### Scope Boundary`

### 5. Missing-section behavior

If the selected epic cannot be found, or if any required section is missing or unusable, the tool must fail and surface this exact message to the user in the UI:

- `Unable to populate delivery spec from the epics document. Please ensure the epics document is complete before attempting this workflow.`

The tool must not create a partial delivery spec in this case.

## Template Population Requirements

### 1. Canonical template

The tool must load the canonical template from [epic-delivery-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/create-epics/epic-delivery-spec-template.md).

### 2. Full-template carry-through

The generated delivery spec must be created from the full canonical template, not from a partial reconstruction.

That means the output document must preserve the template's overall structure and headings, with Step 3 replacing and populating only the parts this slice owns.

### 3. Top heading replacement

The template’s top headings must be replaced with the selected epic identity.

If `target_epic` is:

- `Epic 3: Checkout`

the generated document must begin with:

- `# Epic 3: Checkout`
- `### Epic 3: Checkout`

### 4. Section population

The extracted epic content from `{epics_document}` must populate the corresponding sections in the template:

- `Objective`
- `Description`
- `Success Measures`
- `Scope`
- `Scope Boundary`

### 5. Preservation of unpopulated template structure

Any template headings or scaffold content not owned by Step 3 population must still remain in the generated artifact.

This includes the template’s later story-writing structure for future workflow steps.

This slice must not populate:

- `# User Stories`
- the story template block under it

## Write Requirements

### 1. Atomic replacement

If the canonical Step 3 artifact path already exists and Step 3 needs to create a new delivery spec, the tool must overwrite it atomically.

### 2. Write proof

After a successful write, the tool must record placeholder-workflow write proof for the created artifact through the existing write-proof mechanism.

### 3. Cache and edit semantics

After a successful write, the runtime must preserve the normal file-write side effects already used by sibling workflow-owned artifact builders:

- file-read cache invalidation for the artifact
- edited-file task state marking

## Persistence Requirements

### 1. Placeholder persistence path

After a successful build, the runtime must persist `epic_delivery_spec` through the existing workflow placeholder persistence path.

### 2. Placeholder key

The placeholder key must be exactly:

- `epic_delivery_spec`

### 3. Stored value

The stored value must be the resolved full artifact path written by this tool.

### 4. Reuse of existing persistence semantics

The tool must reuse the existing placeholder persistence semantics rather than inventing a separate storage mechanism.

That includes:

- in-memory placeholder state updates
- normal task metadata persistence
- normal deterministic re-check triggering after placeholder persistence

## Existing-Spec Bypass Requirements

If `epic_delivery_spec` was already available from prior workflow state and resolves to an existing file, Step 3 completion is handled by deterministic progression and this Step 3 automation is not required to run.

This tool does not need to implement a separate bypass branch; it only needs to satisfy the artifact-building path used when a new spec must be created.

## Failure Requirements

The tool must fail with a tool error if any of these are true:

- no active placeholder workflow is available
- `pi-planning.md` is not the active workflow context for this automation
- `epics_document` cannot be resolved
- `target_epic` cannot be resolved
- `output_folder` cannot be resolved from stable placeholders
- the template path cannot be resolved
- the template file cannot be read
- the epics document cannot be read
- the selected epic cannot be matched in the epics document
- any required extracted section is missing
- the artifact cannot be written
- `epic_delivery_spec` cannot be persisted after a successful write

For the missing-epic / missing-section content failure case, the user-facing error message must be exactly:

- `Unable to populate delivery spec from the epics document. Please ensure the epics document is complete before attempting this workflow.`

## Non-Requirements

This slice does not require:

- story drafting
- acceptance-criteria generation
- sequencing/dependency generation
- title-only artifact naming
- using `target_epic-delivery-spec.md`
- workflow forms
- user followup prompts
- a new UI payload type
- support for non-canonical epic section headings

## Test Requirements

Add or update tests proving:

- `build_epic_delivery_spec` is registered as a built-in non-response tool
- the tool resolves the canonical template path using the install-safe `{project-root}` convention
- the tool fails when `epics_document` is missing
- the tool fails when `target_epic` is missing
- the tool fails when `output_folder` cannot be resolved
- the tool fails when the template file cannot be read
- the tool fails when the selected epic cannot be found
- the tool fails with the exact approved user-facing message when required epic sections are missing
- the tool extracts the selected epic from the canonical `### Epic N: Title` section shape
- the generated artifact path uses `epic-<number>-delivery-spec.md`
- the generated document preserves the full canonical template structure rather than rebuilding only the populated sections
- the generated document replaces the top two template headings with `Epic N: Title`
- the generated document populates the five required sections
- the generated document preserves the user-stories scaffold for later steps
- an existing artifact at the canonical path is overwritten atomically
- write proof is recorded for the artifact
- `epic_delivery_spec` is persisted as the resolved full artifact path
- deterministic re-check still occurs through the normal placeholder-update path after persistence
