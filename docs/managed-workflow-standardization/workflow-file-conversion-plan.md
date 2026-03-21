# Managed Workflow File Conversion Plan

This document is the companion plan to [action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-workflow-standardization/action-plan.md).

It focuses specifically on converting the `workflow.md` and `step-*.md` files under `cline-skills/` so they are fully aligned with:

- [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md)
- the reference conversion in [step-01-gather-context.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-code-review/steps/step-01-gather-context.md)

This plan is written for two separate roles:

- execution: an agent performing the conversion pass should be able to work through the corpus without inventing new rules mid-stream
- QA: a separate agent should be able to review the converted files against a stable checklist and quickly spot schema drift, malformed structure, or partial migrations

## Objective

Convert all managed BMAD workflow source files in `cline-skills/` to a single canonical structure so that:

- each file uses the same workflow schema
- step structure is explicit and clean
- branch logic is expressed with canonical tags
- detail-layer information is preserved without becoming checklist noise
- the files are easier for both the runtime and future agents to reason about

## Scope

### In Scope

- all `workflow.md` files for managed BMAD workflows
- all `step-*.md` files for managed BMAD workflows
- any companion instruction file currently acting as the managed workflow source when it serves the same role as `workflow.md`
- migration of legacy structured tags and prose patterns into the canonical schema

### Out of Scope

- non-managed skills unless they are explicitly included in a later wave
- adding new product behavior beyond what is already captured in the formatting guide and runtime standardization plan
- introducing deterministic execution semantics for every authoring tag

## Source of Truth

These rules are considered settled for the conversion pass:

1. `<step>` is the checklist/progress unit.
2. `<action>`, `<ask>`, and `<output>` remain first-class execution instructions inside a step.
3. Focus Chain should not display `action`, `ask`, or `output` as separate checklist rows.
4. `<detail>` is prompt-visible supporting content and should be ignored for checklist extraction.
5. `<branch if="...">` is the canonical conditional container.
6. Legacy `<check if="...">` should be converted to `<branch if="...">`.
7. `optional="true"` indicates non-blocking behavior.
8. `## CHECKPOINT` remains special and should not be replaced by ordinary step structure.
9. Routing should use explicit tags:
   - `<goto step="..."/>`
   - `<handoff path="..."/>`
   - `<return/>`
   - `<exit/>`
10. Annotation-style tags such as `<critical>`, `<note>`, and `<guideline>` belong to the detail layer.
11. `<template-output>` should be preserved as prompt-visible detail-layer guidance, not checklist structure.

## Canonical Target Shape

Every converted file should be recognizable as following this general pattern:

1. heading and metadata
2. optional rules/advisory sections
3. structured execution section made of `<step>` blocks
4. explicit `## CHECKPOINT` when gating is required
5. optional advisory/reference material that still follows the new schema expectations

At the step level, the canonical structure is:

- one semantic workflow step per `<step>`
- one or more sibling `<action>`, `<ask>`, and `<output>` tags inside the step
- `<branch if="...">` for conditional paths
- `<detail>` for examples, rationale, or nuance that should remain visible to the model

## Anti-Patterns To Eliminate

Every conversion pass should actively remove or rewrite these patterns:

- nested same-tag structures such as `<action><action>...</action></action>`
- giant mixed prose blobs stuffed into a single `action`, `ask`, or `output`
- wrapper-only steps such as “Review detailed guidance” or “Follow workflow” when they exist only to preserve old extraction behavior
- raw duplication where the structured top layer and the authoritative procedure say the same thing in different formats
- `<check if="...">` used as a conditional container
- prose routing directives such as:
  - `Read fully and follow ...`
  - `Jump to Step ...`
  - `Continue to Step ...`
  - `Return to caller`
  - `Exit workflow`
- malformed tag flow where one sentence is split across unrelated sibling tags
- using `<output>` for questions that should be `<ask>`
- using ordinary `<step>` content as a substitute for `## CHECKPOINT`

## Conversion Strategy

The safest conversion approach is wave-based.

### Wave 1: Reference and Validation Set

Purpose:

- confirm the schema works across different workflow styles before touching the entire corpus

Initial reference set:

- `bmad-code-review`
- `bmad-create-architecture`
- `bmad-sprint-status`

Wave 1 is complete when:

- the converted files match the guide
- the runtime renders them correctly
- they provide enough examples for the broader conversion pass

### Wave 2: Managed Phase-Based Workflows

Purpose:

- convert managed workflows that already use `steps/` directories

Typical examples:

- multi-phase creation workflows
- managed review/planning/design flows

Priority reason:

- these benefit most directly from the standardized step-based runtime

### Wave 3: Managed Single-File Workflows

Purpose:

- convert managed workflows where the main procedure still lives in a single `workflow.md` or instruction file

Typical examples:

- workflows that still rely on wrapper structure
- workflows with mixed `<prose>` and structured content

### Wave 4: Remaining Managed Corpus Cleanup

Purpose:

- normalize lingering inconsistencies after the main conversion is done

Examples:

- condition wording cleanup
- step-title normalization
- routing tag consistency
- annotation/detail placement refinement

## Execution Procedure

Use this exact procedure for each file or workflow group.

### 1. Inventory the File

For each file, identify:

- whether it is a `workflow.md`, `step-*.md`, or equivalent instruction source
- whether it is already partly converted
- whether it still uses wrapper/prose duplication
- whether it contains branching, routing, checkpoints, or annotation tags

Record at minimum:

- path
- current structure type
- main migration risks
- whether it should be converted together with sibling files in the same workflow

### 2. Determine the Authoritative Procedure

Before rewriting, identify which content is actually authoritative today.

Common cases:

- top structured section is authoritative
- `<prose>` block is more complete than the structured section
- the file is split between both and needs synthesis

Rule:

- do not mechanically preserve both layers if they say the same thing
- consolidate into one canonical structured representation

### 3. Normalize File-Level Structure

Bring the file into a consistent outer layout:

- title
- `## META`
- optional rules/advisory sections
- `## EXECUTION` or equivalent structured step section
- `## CHECKPOINT` when applicable
- optional `## ADVISORY` / `## REFERENCE`

If a file still contains duplicated wrapper scaffolding used only for old extraction compatibility, remove that scaffolding during conversion.

### 4. Convert Step Structure

For each workflow step:

- ensure there is exactly one semantic step per `<step>`
- give it a human-readable `goal`
- move operational work into sibling `action`, `ask`, or `output` tags
- move examples or explanatory nuance into `detail`

Do not:

- split a single semantic step into multiple steps just because it contains alternatives
- pack several unrelated workflow goals into one `<step>`

### 5. Convert Conditional Logic

Whenever a condition governs a path:

- replace `<check if="...">` with `<branch if="...">`
- replace prose-only conditional routing with explicit branches
- remove nested same-tag structures in favor of sibling branch content

Rule:

- if the logic is “one step, several possible paths,” keep one step and use branches inside it

### 6. Convert User Interaction Structure

Audit every question and user-facing instruction.

Use:

- `<ask>` for questions or pauses requiring user input
- `<output>` for reporting, explanation, or presentation
- `<action>` for agent-executed work

Rule:

- if the workflow should pause for user input, the structure should make that obvious

### 7. Convert Detail-Layer Content

Move non-checklist support content into `<detail>` or other detail-layer tags where appropriate.

This includes:

- examples
- heuristics
- long bullet enumerations
- rationale
- annotation-style guidance
- template-output guidance

Do not convert these into standalone checklist-like steps unless they are truly operational units.

### 8. Convert Routing Directives

Replace prose routing with explicit tags.

Standard replacements:

- `Jump to Step X` -> `<goto step="X"/>`
- `Read fully and follow ./file.md` -> `<handoff path="./file.md"/>`
- `Return to caller` -> `<return/>`
- `Exit workflow` -> `<exit/>`

When routing is conditional, place it inside a branch.

### 9. Preserve Checkpoints Correctly

If a workflow phase includes a real gate:

- keep it in `## CHECKPOINT`
- keep the checkpoint human-readable
- do not hide it in normal step content

Checkpoint text should describe the gate clearly in plain language.

### 10. Remove Obsolete Legacy Scaffolding

After conversion, remove content that only existed to support the old extraction shape, including:

- wrapper-only steps
- duplicated “read fully and follow” placeholder scaffolding
- raw parallel prose copies when the structured version now fully captures the procedure

This should be done carefully:

- remove only when the structured version fully preserves the intended meaning

## File Review Checklist For The Implementation Agent

Before marking a file conversion complete, verify all of the following:

- every semantic workflow step is represented by a `<step>`
- every `<step>` has `n` and `goal`
- user-facing questions use `<ask>`
- reporting/presentation uses `<output>`
- work performed by the agent uses `<action>`
- conditional logic uses `<branch if="...">`
- old `<check if="...">` containers are removed
- detail-heavy content is in `<detail>` or detail-layer tags
- annotation tags are not masquerading as checklist structure
- routing uses explicit routing tags
- `## CHECKPOINT` remains explicit where needed
- there is no duplicated top-layer/prose layer that restates the same procedure unnecessarily
- the file is readable as a single canonical source of truth

## QA Procedure

This section is written for a separate QA agent or reviewer.

### QA Goal

Confirm that the conversion pass changed the files to the canonical schema without:

- losing workflow meaning
- weakening user interaction points
- breaking branch logic
- leaving behind malformed or contradictory structure

### QA Pass 1: Structural Compliance

For each converted file, verify:

- canonical tags are used correctly
- forbidden legacy patterns are gone or intentionally preserved with documented reason
- branch logic is represented with `<branch>`
- step structure is clear and not overloaded
- detail-layer material is no longer inflating the operational structure

### QA Pass 2: Semantic Preservation

Compare converted files against the pre-conversion intent and confirm:

- no major procedure was dropped
- no user confirmation gate was lost
- no important condition was flattened away
- routing still preserves the intended workflow flow
- optional behavior is still represented as optional

### QA Pass 3: Runtime Alignment

Confirm the converted files are compatible with the managed-workflow runtime assumptions:

- steps remain the checklist unit
- asks/outputs remain visible inside the active step
- details remain visible without becoming checklist rows
- checkpoints still behave as phase gates

### QA Pass 4: Corpus Consistency

Spot-check multiple workflows to ensure the same schema decisions are applied consistently:

- branch wording style
- optional flag usage
- routing tag usage
- checkpoint placement
- detail-layer placement

## Required Deliverables From The Conversion Agent

The conversion pass should leave behind:

1. the converted workflow files
2. any necessary config alignment changes
3. test updates where file-specific expectations changed
4. a short conversion summary that lists:
   - workflows converted
   - files changed
   - any files intentionally deferred
   - any schema edge cases encountered

## Required Deliverables From The QA Agent

The QA pass should produce:

1. findings first, ordered by severity
2. exact file references for each issue
3. explicit note of any semantic drift from the original procedure
4. explicit note of any leftover legacy structure that should have been removed
5. confirmation of which workflows/files were verified successfully

## Recommended Batching

To reduce risk and review burden, convert files in small coherent batches.

Recommended batch shapes:

- one whole workflow family at a time
- one phase-root workflow directory at a time
- one single-file workflow at a time

Avoid:

- mixing unrelated workflows in the same conversion batch if it makes QA harder

## Suggested Work Order

1. finish the reference workflows and confirm they remain clean examples
2. convert remaining managed phase-root workflows
3. convert remaining managed single-file workflows
4. run a consistency cleanup pass across the full corpus
5. run a dedicated QA pass using this document and the formatting guide

## Acceptance Criteria

The file-conversion effort is complete when:

- all targeted managed workflow source files use the canonical schema
- no converted workflow depends on duplicated wrapper/prose scaffolding to express its actual procedure
- branch, detail, routing, and checkpoint semantics are consistently represented
- the converted corpus matches the formatting guide
- a QA pass can validate converted files using a stable, repeatable checklist

