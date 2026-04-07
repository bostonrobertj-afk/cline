# Create Story Step 2 Automation Requirements

## Purpose

This document defines the requirements for the Step 2 automation in [create-story.md](/Users/robertboston/Documents/Cline/Workflows/create-story.md).

This slice covers only the system-owned Step 2 behavior used to create the initial story artifact:

- resolve the active workflow inputs from placeholder state
- load the canonical story template
- read the selected story from `{epic_delivery_spec}`
- build the canonical story scaffold artifact in `{output_folder}/implementation-artifacts`
- copy the approved story content into the correct story-template sections
- write the artifact atomically
- persist the resulting artifact path as `story_doc`

This document does not define:

- workflow-start form behavior
- deterministic Step 2 completion rules after `story_doc` is present
- Step 3, Step 4, or Step 5 prompting behavior
- persona activation
- changes to the authored `create-story.md` workflow contract

Those belong to separate capability documents.

## Source Of Truth

These requirements are grounded in:

- [create-story.md](/Users/robertboston/Documents/Cline/Workflows/create-story.md)
- [enablement-tracker.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/create-story/enablement-tracker.md)
- [how-to-add-a-tool.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/tools-reference/how-to-add-a-tool.md)
- [template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-story/template.md)
- [epic-delivery-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/create-epics/epic-delivery-spec-template.md)
- [build-epic-delivery-spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/build-epic-delivery-spec.ts)
- [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts)
- [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts)
- [placeholderWorkflowWriteProofs.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts)

## Capability Boundary

This slice introduces a new workflow-owned built-in tool for Step 2.

The canonical tool id and exposed tool name must be:

- `build_story_document`

This slice must not:

- ask the user followup questions
- require human-authored tool arguments
- author Step 3 planning notes or Step 4 tasks/subtasks
- infer story content from anything other than the selected story in `{epic_delivery_spec}` and the live story template
- change the workflow contract from the current `story<epic>.<story>.md` naming convention

## Core Requirement

When `create-story.md` Step 2 is active and `story_doc` is not already available from prior workflow state, the runtime must support a workflow-owned tool named `build_story_document` that:

1. resolves `{epic_delivery_spec}` and `{story_number}` from active placeholder workflow state
2. loads the canonical story template
3. locates the selected story block inside `{epic_delivery_spec}`
4. builds the canonical story artifact at `{output_folder}/implementation-artifacts/story<epic>.<story>.md`
5. preserves the full template structure and headings
6. copies the selected story’s approved content into the correct sections of the new story artifact
7. records write-proof for that artifact during the current task
8. persists the final artifact path as `story_doc`

## Tool Contract

### 1. Tool identity

The tool id must be:

- `build_story_document`

### 2. Workflow-owned input model

`build_story_document` must be workflow-owned.

The model must not provide user-authored tool arguments for:

- source document paths
- selected story number
- artifact path
- template path
- copied story content

The runtime must own all of those values.

### 3. Step scope

This tool is the Step 2 automation for `create-story.md`.

This document does not require global exposure of the tool outside the intended workflow/step gating for this automation.

## Runtime Input Resolution Requirements

### 1. Placeholder resolution

The tool must resolve all workflow-owned inputs from merged placeholder workflow state using the existing placeholder-resolution path.

### 2. Required dynamic placeholders

The tool must require:

- `epic_delivery_spec`
- `story_number`

### 3. Required stable placeholders

The tool must require stable placeholder resolution for:

- `output_folder`
- `story_template`
- `project-root` / `project_root` path expansion support through the existing stable-placeholder path

### 4. Missing input failures

The tool must fail with a tool error if any required input cannot be resolved from the active placeholder workflow state or stable workflow placeholders.

## Canonical Paths

### 1. Template source path

The canonical template source path must be resolved through the stable placeholder for:

- `story_template`

For the current live workflow config, that stable placeholder resolves to:

- `{project-root}/.cline/skills/bmad-create-story/template.md`

### 2. Artifact directory

The output artifact must be written under:

- `{output_folder}/implementation-artifacts`

### 3. Artifact naming convention

The canonical naming convention must follow the current workflow contract exactly:

- `story<epic>.<story>.md`

Example:

- `story_number = "3.2"`
- artifact file name = `story3.2.md`

### 4. Persisted placeholder value

After a successful build, `story_doc` must be persisted as the full resolved artifact file path for this task/session.

## Epic Delivery Spec Extraction Requirements

### 1. Canonical source shape

The selected story must be extracted from `{epic_delivery_spec}` using the canonical heading shape:

- `## Story <story_number>`

For the selected story block, the source sections must be located using these exact subsection headings:

- `### Objective`
- `### Acceptance Criteria`
- `### Sequencing/ Dependencies`

### 2. Required selected-story sections

The Step 2 automation must extract exactly these story-level content surfaces from the selected story block:

- story number identity
- objective content
- acceptance criteria content
- sequencing / dependencies content

### 3. Missing-story behavior

If the selected story cannot be found, or if any required selected-story section is missing or unusable, the tool must fail with a user-visible tool error and must not create a partial story artifact.

## Template Population Requirements

### 1. Canonical template

The tool must load the canonical template from [template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-story/template.md).

### 2. Full-template carry-through

The generated story document must be created from the full canonical template, not from a partial reconstruction.

That means the output document must preserve the template’s overall structure and headings, with Step 2 replacing and populating only the parts this slice owns.

### 3. Top heading replacement

The template’s top story heading must be replaced with the selected story number identity.

If `story_number` is:

- `3.2`

the generated document must begin with:

- `# Story 3.2`

This slice does not require a story-title suffix in the H1 because the current live template no longer includes that requirement.

### 4. Status preservation

The generated story document must preserve the template’s initial non-terminal workflow status:

- `Status: backlog`

Step 2 automation must not mark the story `ready-for-dev`, `review`, or any other later-stage status.

### 5. Section population mapping

The extracted story content from `{epic_delivery_spec}` must populate these exact destination sections in the story template:

- `### Objective` maps to `## Story`
- `### Acceptance Criteria` maps to `## Acceptance Criteria`
- `### Sequencing/ Dependencies` maps to `## Sequencing / Dependencies`

### 6. Objective mapping requirement

The `## Story` section in the output artifact must be replaced with the selected story’s objective content from `{epic_delivery_spec}`.

The Step 2 tool must not leave the template’s placeholder body:

- `As a`
- `I want`
- `so that`

### 7. Acceptance criteria mapping requirement

The `## Acceptance Criteria` section in the output artifact must contain the selected story’s acceptance criteria content from `{epic_delivery_spec}`.

The Step 2 tool must not leave the section empty.

### 8. Sequencing / dependencies mapping requirement

The `## Sequencing / Dependencies` section in the output artifact must contain the selected story’s sequencing/dependencies content from `{epic_delivery_spec}`.

The Step 2 tool must not leave the section empty when the selected story block contains sequencing/dependencies content.

### 9. Preservation of unowned template structure

Any template headings or scaffold content not owned by Step 2 population must remain in the generated artifact.

This includes:

- `## Tasks / Subtasks`
- `## Latest Review Findings`
- `## Dev Notes`
- `### Project Structure Notes`
- `### References`
- `## Dev Agent Record`
- `### Debug Log References`
- `### Completion Notes List`
- `### File List`

This slice must not populate planning-owned or implementation-owned sections beyond the three copied surfaces above.

## Write Requirements

### 1. Atomic replacement

If the canonical Step 2 artifact path already exists and Step 2 needs to create a new story scaffold, the tool must overwrite it atomically.

### 2. Write proof

After a successful write, the tool must record placeholder-workflow write proof for the created artifact through the existing write-proof mechanism.

### 3. Cache and edit semantics

After a successful write, the runtime must preserve the normal file-write side effects already used by sibling workflow-owned artifact builders:

- file-read cache invalidation for the artifact
- edited-file task state marking

## Persistence Requirements

### 1. Placeholder persistence path

After a successful build, the runtime must persist `story_doc` through the existing workflow placeholder persistence path.

### 2. Placeholder key

The placeholder key must be exactly:

- `story_doc`

### 3. Persisted value shape

The persisted value must be the full resolved artifact file path, not a relative display path.

## Workflow Gating Requirements

### 1. Step-specific availability

`build_story_document` must be gated to `create-story.md` Step 2 only.

### 2. Wrong-context protection

If the tool is invoked outside `create-story.md` Step 2, it must fail with a tool error instead of writing any artifact.

### 3. No human-parameter fallback

The runtime must not expose a parameterized fallback mode where the model or user manually supplies the copied story content.

## Registration Requirements

This slice requires the same end-to-end registration pattern used by other workflow-owned built-in tools in this fork.

At minimum, implementation must cover:

- shared tool id registration in `ClineDefaultTool`
- shared workflow-step gating helper for `build_story_document`
- prompt-tool spec registration
- prompt-tool init/index registration
- variant exposure in the active prompt variants
- runtime handler registration in `ToolExecutorCoordinator`
- approval routing in `autoApprove.ts`
- response-tool exhaustiveness in `ResponseToolRegistry.ts`
- native-schema compaction in `spec.ts`

## Test Requirements

At minimum, coverage must be added or updated for:

- prompt-spec gating in `spec.test.ts`
- runtime handler behavior in `ManagedWorkflowHandlers.test.ts`
- contextual/native integration coverage if tool exposure changes require it
- response-tool exhaustiveness coverage if needed by the touched registry

The handler coverage must include:

- successful build of the canonical story document from the full template
- persistence of `story_doc`
- write-proof recording for the artifact
- atomic overwrite behavior when the canonical artifact already exists
- failure when `epic_delivery_spec` is missing
- failure when `story_number` is missing
- failure when `output_folder` cannot be resolved
- failure when `story_template` cannot be resolved or read
- failure when the selected story block cannot be found
- failure when `### Objective` is missing
- failure when `### Acceptance Criteria` is missing
- failure when `### Sequencing/ Dependencies` is missing
- proof that the copied objective, acceptance criteria, and sequencing/dependencies land in the correct destination sections

## Non-Requirements

This slice does not require:

- changing the authored `create-story.md` workflow text
- changing the deterministic Step 2 completion contract
- authoring Step 3 project structure notes
- authoring Step 4 tasks and subtasks
- setting `Status: ready-for-dev`
