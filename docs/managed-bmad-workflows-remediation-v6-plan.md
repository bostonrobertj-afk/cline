# Managed BMAD Workflows Remediation V6 Plan

## Purpose

This remediation pass shifts the next round of work away from adding more parser heuristics and toward revising the managed workflow source documents themselves.

The goal is to make the supported BMAD workflow files machine-legible enough that [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts) can extract deterministic checklist items with minimal guesswork.

## Execution Status

Status: In progress, with the first conversion wave implemented in this pass.

Completed in this pass:

- Rewrote all `bmad-create-prd` phase files under `.cline/skills/bmad-create-prd/steps-c/` to the canonical `META / EXECUTION / CHECKPOINT / ADVISORY / REFERENCE` layout.
- Rewrote `.cline/skills/bmad-create-ux-design/steps/step-14-complete.md` into the same structured layout so completion guidance no longer depends on prose parsing.
- Rewrote `.cline/skills/bmad-sprint-status/workflow.md` so the primary interactive flow, data mode, and validate mode are authored explicitly with structured step blocks.
- Rewrote `.cline/skills/bmad-advanced-elicitation/workflow.md` into a structured single-file flow.
- Updated `scripts/managed-workflows.shared.mjs` so converted workflows prefer `workflow-steps` extraction.
- Regenerated `_bmad/_config/managed-workflows.json`.

Verification run after the rewrite:

- `node scripts/generate-managed-workflows.mjs`
- `node scripts/verify-managed-workflow-assets.mjs`
- `node scripts/audit-managed-workflow-extraction.mjs`

Observed results from the audit:

- `bmad-create-prd` dropped from the previous inflated extraction shape to `138` required items total, with step-tag extraction now driving the workflow.
- `bmad-create-ux-design` still remains largely prose-driven except for the converted completion step, so its total remains high.
- `bmad-sprint-status` remains structured and stable at `15` required items for the managed interactive branch.

Known follow-up from this pass:

- `bmad-advanced-elicitation/workflow.md` was converted to structured `<step>` markup, but the audit output still reports it as a one-item workflow even though direct file inspection shows six `<step>` blocks and step-tag extraction surfaces multiple labels. That inconsistency should be treated as unresolved until the audit/runtime parity is rechecked for that specific single-file workflow.

This plan is based on:

- the supported workflow allowlist in [managed-bmad-workflows-implementation-spec.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflows-implementation-spec.md)
- the current extractor behavior in [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts)
- the latest review findings that section scoping and prose-derived extraction are still too brittle for parts of the allowlist

## Why This Pass Is Needed

The current runtime is now fairly strict:

- it builds backend-owned checklist items
- it requires required items to complete in order
- it blocks `attempt_completion` until all required items are done

That means extraction accuracy matters a lot more than it did when workflows were only prompt guidance.

Right now the extractor still has to infer execution intent from prose-heavy markdown. That causes two structural problems:

1. section scoping can miss the intended execution section and fall back to the full file
2. bullets, bold labels, notes, menus, examples, and success/failure language can be promoted into blocking required checklist items

Examples already visible in the allowlist:

- [step-01-init.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-prd/steps-c/step-01-init.md)
- [step-02-discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-prd/steps-c/step-02-discovery.md)
- [workflow.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-sprint-status/workflow.md)
- [step-14-complete.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-ux-design/steps/step-14-complete.md)

The most defensible fix is to revise the workflow documents so the extractor reads explicit execution structures instead of reverse-engineering them from author prose.

## Scope

This pass should revise the source workflow documents for the supported managed-workflow allowlist only:

- `bmad-advanced-elicitation`
- `bmad-check-implementation-readiness`
- `bmad-cis-design-thinking`
- `bmad-cis-innovation-strategy`
- `bmad-cis-problem-solving`
- `bmad-cis-storytelling`
- `bmad-code-review`
- `bmad-correct-course`
- `bmad-create-architecture`
- `bmad-create-epics-and-stories`
- `bmad-create-prd`
- `bmad-create-product-brief`
- `bmad-create-story`
- `bmad-create-ux-design`
- `bmad-dev-story`
- `bmad-distillator`
- `bmad-document-project`
- `bmad-edit-prd`
- `bmad-help`
- `bmad-quick-dev`
- `bmad-review-adversarial-general`
- `bmad-review-edge-case-hunter`
- `bmad-sprint-planning`
- `bmad-sprint-status`

This pass should not:

- broaden the allowlist
- add a full declarative branch engine
- require source authors to preserve human-friendly prose structure where it conflicts with deterministic parsing

The user has explicitly said these files are not intended for direct human consumption, so this plan should optimize for machine-readability first.

## Core Conclusion

The managed workflow docs should become structured execution assets, not prose documents with executable hints embedded inside them.

The extractor should be able to operate on an explicit authoring contract like:

- one canonical execution section
- explicit executable tags
- explicit advisory/reference sections
- explicit branch and mode boundaries
- explicit handoff markers

The less the extractor has to infer from ordinary markdown bullets and headings, the more reliable managed workflow progression will be.

## Findings Driving This Plan

### 1. Section Header Matching Is Too Fragile

The extractor currently relies on heading normalization plus a fixed candidate header set in [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts).

This remains vulnerable to authored formatting such as trailing punctuation:

- `## EXECUTION PROTOCOLS:`
- `## YOUR TASK:`
- `## DISCOVERY SEQUENCE:`

When those miss the candidate filter, extraction falls back to the full file.

### 2. Ordinary Markdown Still Looks Too Much Like Executable Intent

The extractor still promotes content from:

- `###` numbered headings
- ordinary bullet lists
- bold sublabels

That means descriptive material can be mistaken for executable work.

Concrete examples:

- search-location bullets in [step-01-init.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-prd/steps-c/step-01-init.md)
- discovery scaffolding in [step-02-discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-prd/steps-c/step-02-discovery.md)
- next-step guidance in [step-14-complete.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-ux-design/steps/step-14-complete.md)

### 3. Single-File Branching Workflows Need Authored Branch Boundaries

Some supported workflows encode multiple modes or branches in one document.

The clearest example is [workflow.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-sprint-status/workflow.md), which includes:

- the interactive path
- a data mode path
- a validate mode path

The runtime has partial branch-aware filtering now, but the workflow file itself should explicitly distinguish:

- default path
- alternate modes
- terminal outputs

### 4. Completion/Checklist Semantics Should Be Authored, Not Inferred

The current runtime now supports:

- required items
- advisory items
- blocked checkpoints

The workflow source files should express those categories directly, rather than forcing the extractor to deduce them from free-form prose.

## Remediation Strategy

### Guiding Principle

Revise the source workflow documents to a constrained authoring schema that the extractor can parse deterministically.

That means:

- fewer heuristic cues
- more explicit tags
- fewer executable meanings attached to ordinary markdown formatting

## Authoring Contract For Managed Workflow Documents

### 1. Canonical Section Layout

Each managed workflow file should use a small, stable top-level layout.

Recommended section contract:

```md
# Step Title

## META
## EXECUTION
## CHECKPOINT
## ADVISORY
## REFERENCE
```

Rules:

- `## EXECUTION` is the only section the extractor should treat as a source of required/advisory checklist items.
- `## CHECKPOINT` is the only section the extractor should treat as a blocking checkpoint source.
- `## ADVISORY` may be rendered to the model/user but must not block completion.
- `## REFERENCE` must never produce checklist items.
- `## META` can hold progress labels, goal text, setup notes, and role framing that should not become workflow items.

Implication:

- sections such as `## EXECUTION PROTOCOLS:`, `## YOUR TASK:`, `## DISCOVERY SEQUENCE:`, `## SUCCESS METRICS:`, `## FAILURE MODES:`, `## NEXT STEPS GUIDANCE:` should be normalized or collapsed into the canonical structure above

### 2. Executable Tags Only

Inside `## EXECUTION`, executable checklist items should be authored only with explicit structured tags.

Required tags:

- `<step n="1" goal="...">`
- `<action>...</action>`
- `<ask>...</ask>`
- `<output>...</output>`
- `<template-output>...</template-output>`
- `<check if="...">...</check>`

New recommended tags for this pass:

- `<advisory>...</advisory>`
- `<note>...</note>`
- `<branch name="..." default="true|false">...</branch>`
- `<mode name="interactive|data|validate">...</mode>`

Rules:

- plain markdown bullets inside `## EXECUTION` should be treated as descriptive text unless they are nested inside an explicit executable block that the extractor supports
- bold labels must no longer carry executable meaning
- `###` headings may organize the file visually but should not create checklist items by themselves

### 3. Explicit Required vs Advisory Semantics

Checklist blocking semantics should be authored directly:

- `<action>` = required by default
- `<ask>` = required by default
- `<output>` = required by default if it represents a workflow obligation
- `<advisory>` = visible but non-blocking
- `## ADVISORY` = visible but non-blocking

This removes the need for workflow-specific heuristics such as the current `bmad-create-ux-design` completion guidance filter.

### 4. Explicit Branching And Mode Isolation

Single-file workflows with multiple execution modes should isolate each mode explicitly.

Recommended structure for files like `bmad-sprint-status/workflow.md`:

```md
## EXECUTION

<mode name="interactive" default="true">
  <step n="1" goal="...">
    <action>...</action>
  </step>
</mode>

<mode name="data">
  <step n="1" goal="...">
    <action>...</action>
  </step>
</mode>

<mode name="validate">
  <step n="1" goal="...">
    <action>...</action>
  </step>
</mode>
```

This is preferable to embedding “Jump to Step 20” and “Jump to Step 30” control flow inside one shared sequence.

### 5. Explicit Continuation/Handoff Semantics

Files that hand off to another phase file should author that handoff explicitly instead of burying it in prose.

Recommended tag:

```md
<handoff target="./step-02-discovery.md" when="user_selects_continue" />
```

or as an explicit structured action:

```md
<action>On user selecting C, update frontmatter and load ./step-02-discovery.md</action>
```

If a workflow needs deterministic handoff parsing later, the first form is cleaner.

## File Revision Plan

### Workstream 1: Convert Phase-Based Workflows To Canonical Structured Execution

These workflows already have separate phase files and should be the easiest conversions:

- `bmad-code-review`
- `bmad-check-implementation-readiness`
- `bmad-create-architecture`
- `bmad-create-epics-and-stories`
- `bmad-create-prd`
- `bmad-create-product-brief`
- `bmad-create-ux-design`
- `bmad-edit-prd`
- `bmad-quick-dev`

Action:

- rewrite each step file so executable content lives only in `## EXECUTION`
- move success/failure metrics, next-step guidance, and examples into `## ADVISORY` or `## REFERENCE`
- replace prose sequences like `### 1.`, `### 2.` with explicit `<step>` blocks

Priority within this group:

1. `bmad-create-prd`
2. `bmad-create-ux-design`
3. `bmad-create-architecture`
4. `bmad-create-epics-and-stories`
5. `bmad-edit-prd`
6. remaining phase-based workflows

Reason:

- these files are currently contributing the most inflated required-item counts and the most parser ambiguity

### Workstream 2: Convert Single-File Branching Workflows

These need explicit mode/branch markup:

- `bmad-sprint-status`
- any other allowlisted single-file workflow that contains mutually exclusive paths, menu branches, or alternate execution modes

Action:

- split alternate execution paths into explicit `<mode>` or `<branch>` containers
- stop using shared numbering with implicit jumps for alternate modes
- ensure only one default path is active for ordinary managed execution

### Workstream 3: Convert Single-File Linear Workflows

These single-file workflows can remain one file, but should still adopt the structured section/tag contract:

- `bmad-advanced-elicitation`
- `bmad-cis-design-thinking`
- `bmad-cis-innovation-strategy`
- `bmad-cis-problem-solving`
- `bmad-cis-storytelling`
- `bmad-correct-course`
- `bmad-create-story`
- `bmad-dev-story`
- `bmad-document-project`
- `bmad-help`
- `bmad-review-adversarial-general`
- `bmad-review-edge-case-hunter`
- `bmad-sprint-planning`

Action:

- move prose guidance into `## REFERENCE` or `## ADVISORY`
- author the actual executable sequence as explicit `<step>` blocks under `## EXECUTION`

### Workstream 4: Decide How To Handle Special-Case Skills

These supported items may need special treatment because they do not fit the dominant workflow shape cleanly:

- `bmad-distillator`

Action:

- decide whether to:
  - convert it to the same structured execution contract, or
  - remove it from managed execution until its source asset shape is aligned

## Detailed Line-Level Intent

### A. Workflow Document Rewrites

Primary target directories:

- `.cline/skills/bmad-*/workflow.md`
- `.cline/skills/bmad-*/steps/*.md`
- `.cline/skills/bmad-*/steps-c/*.md`
- `.cline/skills/bmad-*/steps-e/*.md`
- `.cline/skills/bmad-*/steps-v/*.md`

Authoring intent:

- replace prose-only execution headings with canonical `## EXECUTION`
- replace numbered `###` sequences with explicit `<step>` blocks
- move non-blocking guidance into `## ADVISORY`
- move menus, examples, and success/failure commentary into `## REFERENCE` or `## ADVISORY`
- isolate alternate modes into explicit `<mode>` or `<branch>` containers

### B. Extractor Follow-Up After Document Rewrites

After the workflow docs are revised, the extractor should be simplified instead of further complicated.

Expected follow-up in [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts):

- make `## EXECUTION` the preferred and eventually required primary extraction section for managed workflow assets
- stop promoting plain bullets, bold labels, and `###` headings into checklist items for converted workflows
- reduce workflow-specific policy overrides once the source docs encode advisory/branch semantics directly

This pass does not require those extractor changes yet, but it should plan for them explicitly.

## Acceptance Criteria

The v6 document rewrite should be considered successful when:

- supported managed workflows express executable work primarily through explicit structured tags rather than prose heuristics
- the extractor can scope to `## EXECUTION` without falling back to whole-document parsing for converted workflows
- ordinary bullets and bold labels no longer become blocking required items in converted workflows
- alternate-mode paths are authored explicitly instead of inferred from shared prose
- advisory/next-step guidance is encoded so it does not require workflow-specific filtering to stay non-blocking
- required-item counts for converted workflows become materially smaller and more defensible than the current inflated totals

## Suggested Delivery Order

1. Define the canonical authoring schema and treat it as the required format for managed workflows.
2. Convert `bmad-create-prd` step files.
3. Convert `bmad-create-ux-design` completion and finalization files.
4. Convert `bmad-sprint-status` to explicit mode-separated structure.
5. Convert the remaining phase-based workflows.
6. Convert the remaining single-file linear workflows.
7. Simplify the extractor to rely primarily on the new source format.
8. Re-run the extraction audit and document the reduced required-item counts.

## Review Checklist

- [x] Canonical workflow authoring schema is defined
- [x] Supported workflow docs are prioritized into conversion waves
- [x] Phase-based workflows have a clear rewrite plan
- [x] Single-file branch workflows have a clear rewrite plan
- [x] Advisory/reference content is explicitly separated from executable content in the converted files from this pass
- [x] The plan reduces future extractor complexity instead of increasing it
