# Workflow UI Surface Phase 3 Requirements

## Purpose

This document defines the Phase 3 requirements for extending the workflow UI surface capability so the `code-review.md` workflow can deterministically build `review_input.md` from a story file through a new `build_review_input` tool and a dedicated workflow-form path.

Phase 3 builds on:

- [discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-3/discovery.md)
- [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/requirements.md)
- [phase-2/requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-2/requirements.md)

This phase is specifically about the story-file-backed `review_input.md` generation path for the `code-review.md` workflow.

## Phase 3 Scope

Phase 3 delivers one new deterministic workflow-form use case:

- target workflow: `code-review.md`
- target artifact: `review_input.md`
- invoked tool: `build_review_input`
- human-provided input: story file path
- system-provided supporting input: the stable `diff_output` artifact path resolved internally by `build_review_input`

Phase 3 is limited to story-file-backed review-input generation. If the active review source is not a story file, the workflow must fall back to the existing AI/manual Step 3 behavior.

## Core Requirement

The system must support a workflow-form-driven path that:

- asks whether the user has a story file path to provide
- collects the story file path when the user does have one
- invokes `build_review_input` through the existing tool execution path
- produces a normalized `review_input.md` artifact for downstream review workflows
- falls back to the existing Step 3 AI/manual path when deterministic extraction cannot be completed

The capability must continue to keep raw human form inputs out of model-visible conversational context.

## Architectural Invariants

Everything below is mandatory for Phase 3.

### 1. Existing systems remain authoritative

This update must not replace:

- workflow-form runtime ownership
- tool execution
- deterministic workflow progression
- placeholder persistence
- workflow fallback behavior

The new Phase 3 path must insert into those existing systems and then return control to them.

### 2. Raw human inputs must not enter model context

The submitted story file path must not be replayed into AI-visible prompt context as ordinary user text, recap text, or synthetic tool-call narration.

Only the normal tool result, artifact writes, placeholder effects, and workflow-state changes may remain visible after execution.

### 3. Step instructions remain valid fallback guidance

The `code-review.md` Step 3 instructions must remain sufficient fallback instructions for the AI agent when:

- the user does not provide a story file path
- the form is cancelled
- the form fails
- the diff artifact does not identify recent story-file changes
- the source document is not suitable for deterministic extraction

### 4. Stable system-owned artifact inputs must not be recollected from the user

If a required supporting input is already system-owned and stable, the workflow form must not ask the user to provide it.

For this phase, `diff_output` is such an input and must be resolved automatically from workflow state/runtime configuration rather than from human form submission.

## Cross-Silo Workflow Requirements

### 1. Workflow reauthoring requirement

The `code-review.md` workflow must be updated so the deterministic `build_review_input` path only runs in a workflow state where `diff_output` is already available.

Phase 3 must not rely on a runtime ordering that contradicts the authored workflow step order.

### 2. Story-file-only deterministic path

The deterministic `build_review_input` path applies only when the human provides a story file path.

If the human does not have a story file path to provide:

- the workflow form path must stop
- the workflow must return control to the fallback Step 3 AI/manual instructions

### 3. Non-story fallback

If the review source is a spec document, PRD, action plan, or any other non-story source, Phase 3 must not attempt to force deterministic story extraction rules onto that file.

The workflow must return control to the fallback AI/manual Step 3 path instead.

## Silo Ownership Map

Phase 3 implementation is intentionally split across three distinct silos.

Action plans authored from this document should cite only the silo section they own plus any explicitly referenced cross-silo sections needed for shared invariants or fallback behavior.

### 1. Tool silo

This silo owns:

- the `build_review_input` tool
- story-file parsing and normalization
- diff-assisted extraction logic
- `review_input.md` creation/replacement
- the tool's success/failure result contract

This silo does not own:

- workflow-form triggering
- deterministic workflow gates
- workflow step advancement

### 2. Workflow-form silo

This silo owns:

- the Phase 3 workflow-form resolver/use case
- story-file-path collection
- workflow-form success/retry/fallback UX
- invocation of `build_review_input` through the existing tool path

This silo does not own:

- story extraction logic inside the tool
- deterministic gate evaluation
- workflow step advancement

### 3. Deterministic progression silo

This silo owns:

- the pre-form and post-form workflow gates
- step-completion evaluation
- checklist advancement
- the workflow step/tool-schema matrix alignment for the reauthored `code-review.md`

This silo does not own:

- workflow-form submission UX
- story parsing or artifact construction inside `build_review_input`

## Tool Silo Requirements

### 1. New tool

Phase 3 must introduce a new tool named `build_review_input`.

That tool must be the only tool-specific implementation surface responsible for deterministic story-file extraction and `review_input.md` construction.

### 2. Tool inputs

The tool must accept:

- the story file path as a human-provided input
- the resolved stable `diff_output` path as a system-provided input

The user must not be asked to provide the `diff_output` path manually.

### 3. Tool outputs

On success, the tool must:

- create or replace `review_input.md`
- produce a result that allows the workflow runtime to recognize success
- support the existing review-input placeholder/update flow required by the workflow

### 4. Deterministic dependency on diff output

The tool must require the diff artifact to identify:

- tasks/subtasks completed in the most recent dev cycle
- completion-note bullets added in the most recent dev cycle

The tool must treat the diff as the recency boundary for those two extractions.

## Tool Silo Extraction Requirements

### 1. Story title

The tool must extract the top story-title line in the form:

- `# Story X.Y: Story Name`

and render it at the top of `review_input.md`.

### 2. Status

The tool must extract the story file's top-level `Status:` line and include it near the top of `review_input.md`.

### 3. Acceptance Criteria

The tool must extract the full `## Acceptance Criteria` section.

This section must not be diff-filtered.

### 4. Latest Review Findings

The tool must extract the full `## Latest Review Findings` section when it exists.

This section must not be diff-filtered.

### 5. Remediation-cycle note

If any content is extracted from `## Latest Review Findings`, the tool must add this note directly below the status line:

`This QA pass is reviewing work performed during a remediation cycle. Only the remediation tasks and subtasks are shown here. These tasks and subtasks may or may not satisfy all provided acceptance criteria. Do not treat failure to fully satisfy all acceptance criteria as a defect.`

### 6. Tasks / Subtasks

The tool must extract only the tasks and subtasks corresponding to recent story-file changes identified through `diff_output`.

It must not copy the full story-wide `## Tasks / Subtasks` section into `review_input.md`.

### 7. Completion Notes List

If the story contains `### Completion Notes List`, the tool must extract only the note bullets added in the most recent dev cycle as identified through `diff_output`.

It must not copy the full cumulative completion-notes section when deterministic filtering is possible.

### 8. Output shape

The generated `review_input.md` must support this normalized top-level shape:

- story title
- status line
- remediation-cycle note when applicable
- `## Acceptance Criteria`
- `## Latest Review Findings` when present
- `## Tasks / Subtasks`
- `## Completion Notes` when deterministically derivable

The tool may include explicit fallback notes only when the source document simply does not contain optional supporting material needed for a section.

Phase 3 must not use fallback notes as a substitute for the required diff-backed extraction of recent-cycle tasks or recent-cycle completion notes.

## Cross-Silo Failure And Fallback Requirements

### 1. Diff/story mismatch

If `diff_output` does not identify recent changes to the story file, the workflow UI must surface this exact message:

`diff_output does not identify recent changes to the story file. Proceeding with AI generation of review_input.md using the fallback Step 3 instructions.`

After surfacing that message, the workflow must fall back to the AI/manual Step 3 path.

### 2. No silent guessing

If the tool cannot deterministically identify recent-cycle tasks or completion notes from the diff, the system must not guess.

If that failure is caused by `diff_output` not identifying recent story-file changes, the workflow must surface the required diff/story mismatch message and fall back to the AI/manual Step 3 path.

Phase 3 must not silently fabricate latest-cycle scope.

### 3. Form cancellation

If the user cancels or declines the form path, the workflow must return to the fallback Step 3 AI/manual path.

### 4. Tool failure

If `build_review_input` errors, the workflow must preserve the active workflow and fall back to the Step 3 AI/manual path rather than abandoning the review workflow.

## Workflow-Form Silo Requirements

### 1. Dedicated workflow-form path

The Phase 3 use case must use the existing workflow-form runtime and transport family.

It must not introduce:

- a new ask type
- a second submission transport
- a separate ad hoc prompt-based input path

### 2. Initialization behavior

The form must begin by asking whether the user has a story file path to provide.

If the user answers no, the system-owned path must stop and the workflow must continue through the fallback Step 3 instructions.

### 3. Minimal human input surface

The only human-provided input Phase 3 requires is the story file path.

System-known artifact paths must remain runtime-owned.

## Deterministic Progression Silo Requirements

### 1. Step completion alignment

Once `build_review_input` succeeds and the workflow's Step 3 done signal is satisfied, deterministic progression must remain responsible for:

- detecting step completion
- advancing the checklist
- exposing the next workflow step

Phase 3 must not create a separate post-Step-3 progression system.

### 2. Deterministic gate ownership

The deterministic workflow progression capability remains the owner of workflow gates before and after the Phase 3 workflow-form use case.

For `code-review.md`, that means:

- the prior deterministic gate advances the workflow into the step where the Phase 3 workflow form is allowed to run
- the workflow form is triggered because the active workflow step is the configured form-backed deterministic boundary
- the workflow form and `build_review_input` tool do not directly advance the workflow
- the subsequent deterministic gate must evaluate the runtime/tool outcome and decide whether the workflow advances to the next step

### 3. Manual and system-owned parity

The deterministic gate after the Phase 3 workflow-form step must be satisfiable by either:

- successful system-owned completion through `build_review_input`, or
- successful manual/AI fallback completion that produces the same workflow-observable done signal

Phase 3 must not make deterministic progression depend exclusively on the workflow-form path.

### 4. Workflow alignment after reauthoring

If the workflow step structure changes to support the new deterministic ordering, deterministic progression must be updated to match the reauthored step structure and done signals.

### 5. Workflow step tool-schema matrix alignment

The matrix that governs which tools appear in tool schema for each step of each workflow must be updated after `build_review_input` is introduced.

Because `code-review.md` Step 2 and Step 3 have been flipped, the code-review portion of that matrix must be revised so the authoritative step/tool mapping reflects the reauthored workflow.

## Implementation Phases

Phase 3 is delivered in three implementation phases:

1. Build the `build_review_input` tool.
2. Build the workflow-form use case that invokes `build_review_input`.
3. Update deterministic workflow progression as needed to align with the reauthored workflow step structure.
