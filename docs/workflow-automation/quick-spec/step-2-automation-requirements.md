# Quick Spec Step 2 Automation Requirements

## Purpose

This document defines the requirements for the system-owned Step 2 automation in [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md).

This slice covers only the runtime behavior that creates the initial quick-spec scaffold artifact after workflow-start input collection has already occurred.

This document does not define:

- workflow-start form behavior
- workflow-start placeholder collection for `title`
- deterministic completion of Step 2 after the scaffold exists
- Step 3 and later prompting behavior
- contextual tool matrix changes
- persona activation

Those belong to separate capability documents.

## Approved Scope Shift

The current authored workflow still places this scaffold-build behavior in Step 1. For this requirements slice, the approved target contract is that the system-owned scaffold-build behavior runs in Step 2 after a separate workflow-start surface has already collected the required workflow-owned `title` value.

This document therefore defines the intended Step 2 automation placement, not the current pre-refactor workflow numbering.

## Source Of Truth

These requirements are grounded in:

- [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md)
- [enablement-tracker](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/quick-spec/enablement-tracker)
- [tech-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-quick-spec/tech-spec-template.md)
- [local-diff-output-builder.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/local-diff-output-builder.md)
- [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md)
- [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)
- [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)
- [workflow-placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts)
- [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts)
- [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts)
- [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts)
- [placeholderWorkflowWriteProofs.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts)

## Capability Boundary

This slice introduces a new workflow-owned built-in tool for quick-spec scaffold creation plus the workflow-form automatic-status wiring needed to run that tool as a zero-human-input system-owned step.

The canonical tool id and exposed tool name must be:

- `build_tech_spec_document`

This slice must not:

- recollect `title` from the user
- define the workflow-start form that captures `title`
- ask followup questions
- require human-authored tool arguments
- write later planning content into the tech spec
- change the canonical artifact path away from `tech-spec-wip.md`

## Core Requirement

When `quick-spec.md` Step 2 is active and the canonical quick-spec scaffold is not already available, the runtime must support a workflow-owned tool named `build_tech_spec_document` that:

1. resolves the active workflow-owned `title` from placeholder workflow state
2. derives a filesystem-safe `slug` from that `title`
3. loads the canonical quick-spec template
4. builds the canonical scaffold artifact at `{implementation_artifacts}/tech-spec-wip.md`
5. preserves the full template structure and headings
6. initializes the scaffold with the resolved `title`, derived `slug`, current `date`, and template status `backlog`
7. records write-proof for that artifact during the current task
8. persists the final artifact path as `output_file`
9. runs through the existing non-interactive automatic workflow-preparation status-card architecture in chat

## Tool Contract

### 1. Tool identity

The tool id must be:

- `build_tech_spec_document`

### 2. Workflow-owned input model

`build_tech_spec_document` must be workflow-owned.

The model must not provide user-authored tool arguments for:

- `title`
- `slug`
- artifact path
- template path
- status
- date

The runtime must own all of those values.

### 3. Step scope

This tool is the Step 2 automation for `quick-spec.md` under the approved sequencing change described above.

This document does not require global exposure of the tool outside the intended workflow/step gating for this automation.

## Runtime Input Resolution Requirements

### 1. Placeholder resolution

The tool must resolve workflow-owned inputs from merged placeholder workflow state using the existing placeholder-resolution path.

### 2. Required dynamic placeholders

The tool must require:

- `title`

### 3. Required stable placeholders

The tool must require stable placeholder resolution for:

- `implementation_artifacts`
- `project-root` / `project_root` path expansion support through the existing stable-placeholder path

### 4. Missing-input failures

The tool must fail with a tool error if any required workflow-owned or stable input cannot be resolved.

The tool must not silently invent:

- a fallback title
- a fallback artifact directory
- a fallback template path

## Canonical Paths

### 1. Template source path

The canonical template source path must be:

- `{project-root}/.cline/skills/bmad-quick-spec/tech-spec-template.md`

The tool may resolve that path through the existing stable-placeholder path support for `project-root` / `project_root`, but this slice does not require a new dedicated stable placeholder key like `story_template`.

### 2. Artifact directory

The output artifact must be written under:

- `{implementation_artifacts}`

### 3. Artifact naming convention

The canonical artifact path must be:

- `{implementation_artifacts}/tech-spec-wip.md`

Step 2 automation must not derive a feature-specific filename in this slice.

### 4. Persisted placeholder value

After a successful build, `output_file` must be persisted as the full resolved artifact file path for this task/session.

## Title And Slug Initialization Requirements

### 1. Title source

The generated scaffold must use the workflow-owned `title` placeholder value captured before Step 2 begins.

The tool must not rewrite, summarize, or embellish the resolved `title`.

### 2. Slug derivation

The tool must derive `slug` deterministically from `title` using kebab-case normalization:

- trim outer whitespace
- lowercase the result
- replace spaces and other word separators with `-`
- remove punctuation that is not filesystem-safe
- collapse repeated `-`

Example:

- `title = "Quick Spec Workflow"`
- `slug = "quick-spec-workflow"`

### 3. Date source

The generated scaffold must use the current stable workflow placeholder `date`.

### 4. Status source

The generated scaffold must preserve the template’s initial non-terminal status:

- `backlog`

Step 2 automation must not mark the artifact `ready-for-dev`, `in-progress`, `in-review`, or any later-stage status.

## Template Population Requirements

### 1. Canonical template

The tool must load the canonical template from [tech-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-quick-spec/tech-spec-template.md).

### 2. Full-template carry-through

The generated quick-spec document must be created from the full canonical template, not from a partial reconstruction.

That means the output document must preserve the template’s overall structure and headings, with Step 2 replacing only the placeholder values this slice owns.

### 3. Required placeholder replacement

At minimum, Step 2 must replace the live template placeholders for:

- `{title}`
- `{slug}`
- `{date}`

The output document must not leave those raw placeholder tokens unresolved.

### 4. Header initialization

The generated document must initialize the top heading using the resolved title.

Given the current template contract, that means:

- `# Tech-Spec: {title}`

must become:

- `# Tech-Spec: <resolved title>`

### 5. Frontmatter initialization

The generated document must initialize the template frontmatter with:

- `title: '<resolved title>'`
- `slug: '<derived slug>'`
- `created: '<resolved date>'`
- `status: 'backlog'`

The tool must preserve the remaining frontmatter structure already defined by the template.

### 6. Preservation of unowned structure

Any template headings, scaffold sections, and frontmatter fields not owned by Step 2 must remain in the generated artifact.

This includes the current section structure for:

- `## Overview`
- `### Problem Statement`
- `### Solution`
- `### Scope`
- `#### In Scope`
- `#### Out of Scope`
- `## Context for Development`
- `### Codebase Patterns`
- `### Files to Reference`
- `### Technical Decisions`
- `## Implementation Plan`
- `### Acceptance Criteria`
- `### Implementation Seams`
- `### Tasks`
- `## Latest Review Findings`

## Artifact Persistence Requirements

### 1. Overwrite behavior

If `{implementation_artifacts}/tech-spec-wip.md` already exists, the tool must replace it with the newly initialized scaffold.

This slice does not require resume/merge behavior for preexisting scaffold contents.

### 2. Atomic persistence

When the tool writes `tech-spec-wip.md`, it must use the same class of atomic replacement behavior used by the sibling artifact-building tools so partial writes do not leave a corrupted planning artifact behind.

### 3. Write-proof behavior

When the tool writes `tech-spec-wip.md`, it must record placeholder-workflow write proof for the artifact in the same way sibling workflow-owned edit tools do today.

### 4. Cache invalidation and edit-state tracking

After a successful write, the runtime must:

- mark the task as having edited a file
- clear any stale file-read cache entry for the artifact path

## Workflow-State Outcome Requirements

### 1. `output_file` availability

On successful completion, the workflow-observable state must satisfy the Step 2 contract that the canonical `tech-spec-wip.md` path is available as `output_file` for Step 3 and later steps.

### 2. No human recollection

The tool must not ask the user to resupply:

- title
- artifact path
- template path

when those are already available through workflow-owned state and stable runtime resolution.

## Result Contract Requirements

The tool must return structured, machine-checkable success/failure output consistent with the sibling deterministic artifact tools.

On success, the result must clearly communicate:

- whether an artifact was written during this call
- the resolved canonical artifact path
- whether the workflow now has an `output_file`-ready scaffold

On failure, the tool must return a concrete tool error rather than vague prose.

## Workflow-Form Automatic-Status Requirements

### 1. Existing architecture

Step 2 must use the existing workflow-form automatic-status-card architecture described in [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md).

This slice must not introduce a new pre-turn UI transport or a new chat rendering pattern.

### 2. Zero-input resolver shape

The Step 2 workflow-form resolver must be a zero-human-input automatic-status resolver:

- no collected input fields
- workflow-owned tool execution
- pending, success, and fallback-to-manual terminal states

### 3. Triggering model

The runtime must be able to intercept the active quick-spec Step 2 context and open the automatic-status card before the AI turn begins, following the same class of runtime path already used for:

- `code-review.md` automatic workflow-preparation
- `write-remediation-story.md` automatic workflow-preparation

### 4. Failure behavior

If the Step 2 automatic-status path fails, the workflow must fall back to the normal agent path rather than dead-end the task.

## Registration Requirements

The sibling-pattern registration surfaces for `build_tech_spec_document` must include:

- a new enum member in [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts)
- a prompt-tool spec file under [tools](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools)
- registration through [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts)
- a tool handler registered through [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts)
- edit-file auto-approval treatment in [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts)
- an explicit non-response-tool entry in [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts)

## Prompt Exposure Requirements

This slice must gate the new tool to the intended quick-spec Step 2 context rather than leaving it globally available.

That gating must be reflected through the same class of prompt-surface seams used by sibling workflow-owned builder tools:

- shared workflow/step exposure helper
- prompt-tool `contextRequirements`
- contextual tool matrix alignment where applicable

## Non-Requirements

This buildout does not require:

- a workflow-start form
- a new start-card capability
- a new stable placeholder in `.cline/workflow-config.yaml`
- a feature-specific final spec filename
- Step 3+ planning content generation
- deterministic Step 2 auto-completion logic

## Test Requirements

### 1. Registration coverage

Add tests proving the tool is registered across the standard sibling surfaces:

- tool enum
- tool spec registry
- executor handler registry
- auto-approval classification
- response-tool registry exhaustiveness

### 2. Positive handler coverage

Add focused handler tests proving that when placeholder state contains a valid `title` and stable placeholders resolve:

- the template is loaded
- the canonical artifact path is used
- a preexisting `tech-spec-wip.md` file is overwritten atomically
- frontmatter `title`, `slug`, `created`, and `status` are correctly initialized
- the top heading is correctly initialized
- `output_file` is persisted
- write proof is recorded

### 3. Missing-input coverage

Add focused handler tests proving the tool fails cleanly when:

- `title` is missing from placeholder state
- `implementation_artifacts` cannot be resolved
- the canonical template cannot be read

### 4. Automatic-status workflow-form coverage

Add coverage proving quick-spec Step 2 uses the existing automatic-status workflow-form architecture:

- the resolver shape is zero-input
- the step-trigger path opens the automatic-status card in the intended Step 2 context
- success returns control to workflow progression
- failure falls back to the agent path

### 5. Prompt exposure coverage

Add tests proving the tool is only exposed for the intended quick-spec Step 2 context and does not appear outside its approved gating.
