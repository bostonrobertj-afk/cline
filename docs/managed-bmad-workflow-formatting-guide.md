# Managed BMAD Workflow Formatting Guide

This guide defines the target authoring format for managed BMAD workflow files in `cline-skills/`.

It is intended to help future agents:

- author new managed workflow files consistently
- review existing workflow files against a single schema
- migrate legacy workflow files away from ad hoc prose-heavy structures
- keep Focus Chain and backend-managed checklists readable without starving the model of necessary detail

This guide describes the target schema we want workflow files to follow. Some of these semantics are not yet fully enforced by code. Where that is true, the guide still treats them as the desired format so files can be authored consistently ahead of extractor/runtime updates.

## Goals

The workflow format should support two separate but complementary layers:

- Checklist layer
  - clean, operational units that can appear in Focus Chain and managed workflow checklists
  - should avoid noisy rows that restate every example, warning, or branch nuance
- Detail layer
  - rich supporting information the LLM should still see in the prompt
  - may include examples, rationale, branch nuance, warnings, annotations, and structured output guidance
  - should be attached to the relevant step without becoming checklist clutter

The intended result is:

- the backend tracks the meaningful work units
- the model still receives the full procedural context needed to execute each step correctly

## Core Model

Use this mental model when authoring:

- workflow phase = one `workflow.md` or `step-*.md` file
- workflow step = one `<step ...>`
- step execution units = `<action>`, `<ask>`, `<output>`
- conditional routing inside a step = `<branch if="...">`
- supporting detail = `<detail>` and other non-checklist annotations
- checkpoint gating = `## CHECKPOINT`

## Canonical Tags

### `<step>`

`<step>` is the primary checklist unit.

Each step should represent one meaningful workflow step, not a whole phase and not every tiny sub-detail.

Example:

```xml
<step n="3" goal="Construct `{diff_output}` from the chosen source.">
  <branch if="review mode is branch diff" optional="true">
    <action optional="true">
      Verify the base branch exists before running `git diff`.
    </action>
    <ask if="base branch does not exist" optional="true">
      HALT and ask the user for a valid branch.
    </ask>
  </branch>
</step>
```

Authoring rules:

- every `<step>` should have `n="..."` and `goal="..."`
- `goal` should describe the step at a human-readable level
- avoid stuffing multiple unrelated goals into one step
- avoid using `<step>` only as a wrapper around giant prose blobs
- if several conditional paths all serve one semantic purpose, keep them inside one `<step>` and express the variants with `<branch if="...">` instead of splitting them into separate top-level steps
- top-level steps should represent the units the agent should think of as checklist progress, not every internal decision or sub-case needed to carry that step out

### `<action>`

Use `<action>` for work the agent performs.

Examples:

- read a file
- analyze content
- update a document
- validate an assumption

Use a single `<action>` when the work unit is genuinely one thing. If the body gets long because it contains examples or nuance, move that nuance into `<detail>`.

Example:

```xml
<action>
  Check the triggering prompt for phrases that map to a review mode.
  <detail>
    - "staged" means staged changes only
    - "branch diff" means compare against a base branch
  </detail>
</action>
```

### `<ask>`

Use `<ask>` for user-facing questions or prompts that require a user response.

Examples:

- ask the user to choose a mode
- ask for confirmation
- ask for a path or baseline

Example:

```xml
<ask>
  Is there a spec or story file that provides context for these changes?
</ask>
```

Do not model clear user questions as `<output>`.

### `<output>`

Use `<output>` for information the agent should present or report to the user.

Examples:

- explain a recommendation
- show a summary
- present findings

Example:

```xml
<output>
  Explain that the starter provides a solid architectural foundation and saves the team from making many low-level setup decisions manually.
</output>
```

### `<branch if="...">`

`<branch>` is the canonical conditional container.

Use it when a condition governs a whole branch of logic, especially if that branch contains more than one child item.

Example:

```xml
<branch if="user_skill_level = beginner">
  <ask>
    I found {starter_name}, which is like a pre-built foundation for your project. Should we use it?
  </ask>
</branch>
```

Use `<branch>` instead of nested same-tag structures like `<action><action>...</action></action>`.

### `<detail>`

`<detail>` holds supporting information that the model should see but that should not become checklist rows.

Examples:

- examples
- explanatory nuance
- sub-bullets
- heuristics
- branch explanation
- edge-case notes

Example:

```xml
<action>
  Check the triggering prompt for phrases that map to a review mode.
  <detail>
    - "staged" / "staged changes" -> staged changes only
    - "uncommitted" / "working tree" -> staged + unstaged changes
    - prefer the most specific match when multiple phrases match
  </detail>
</action>
```

Formatting rules:

- Nest `<detail>` inside the specific `<action>`, `<ask>`, or `<output>` it explains when the detail applies only to that item.
- Use step-level `<detail>` only when the guidance applies to the entire `<step>` rather than to one child item.
- Do not use a sibling `<detail>` as a substitute for item-specific detail when the detail clearly belongs to a single ask, action, or output.
- If a detail block qualifies content inside a `<branch>`, place it inside the relevant child item whenever possible. Use a branch-level `<detail>` only when the guidance applies to the whole branch.
- Prefer nested `<detail>` over expanding the parent tag into a long prose blob.

Examples:

Item-specific detail:

```xml
<ask>
  Ask whether the proposed changes should be applied to the document.
  <detail>Be super friendly and frame the choice as collaborative refinement.</detail>
</ask>
```

Step-level detail:

```xml
<step n="2" goal="Present elicitation choices to the user">
  <output>Display the advanced elicitation menu with options `1-5`, `r`, `a`, and `x`.</output>
  <ask>Ask the user to choose a method, reshuffle, list all methods, provide direct feedback, or proceed.</ask>
  <detail>
    - `1-5`: execute one of the currently presented methods
    - `r`: reshuffle and present 5 new methods
    - `a`: list all available methods compactly with descriptions
    - `x`: stop elicitation and keep the current enhanced result
  </detail>
</step>
```

Target behavior:

- the extractor should ignore `<detail>` when building Focus Chain and checklist items
- the renderer should still surface `<detail>` beneath the relevant step in the prompt

## Optional and Conditional Behavior

### `if="..."`

Conditions may be:

- deterministic/state-based
- model-assessed/judgment-based

For now, conditions are primarily author guidance for the LLM. Future runtime updates may add deterministic enforcement for some conditions.

Examples:

```xml
<branch if="review mode is branch diff">
```

```xml
<ask if="provided diff is not parseable" optional="true">
```

Use normalized, readable condition phrases. Prefer:

- `user confirms`
- `user declines`
- `review mode is branch diff`
- `range does not resolve`

Avoid noisy or inconsistent phrasing.

### `optional="true"`

Use `optional="true"` for non-blocking work.

Examples:

- advisory branches
- optional follow-up suggestions
- branches where exactly one of several alternatives may happen

Target behavior:

- optional steps/items should not block workflow completion
- optional items may still be shown to the model and optionally surfaced in task progress as advisory or non-blocking

## Checkpoints

`## CHECKPOINT` remains a special workflow section.

Use it for a required gate that should block forward progress until the checkpoint condition is satisfied.

Recommended format:

```md
## CHECKPOINT
Present a summary before proceeding: diff stats, review mode, and loaded context docs. HALT and wait for user confirmation to proceed.
```

Why this stays special:

- checkpoints are distinct from ordinary steps
- current managed workflow runtime already has special checkpoint semantics
- keeping them explicit avoids turning ordinary step logic into controller-level gates accidentally

Do not use a normal `<step>` as a substitute for checkpoint semantics unless the runtime is explicitly updated to treat it that way.

## Routing and Control Flow

Routing instructions should be expressed with explicit control-flow tags instead of ad hoc prose like:

- `Read fully and follow ...`
- `Jump to Step 20`
- `Continue to Step 1`
- `Return to caller`
- `Exit workflow`

Target routing tags:

- `<goto step="..."/>`
- `<handoff path="..."/>`
- `<return/>`
- `<exit/>`

Examples:

```xml
<branch if="mode == data">
  <goto step="20" />
</branch>
```

```xml
<branch if="user confirms ready">
  <handoff path="./step-03-execute.md" />
</branch>
```

```xml
<step n="20" goal="Data mode output">
  <action>Load and parse {sprint_status_file} same as Step 2.</action>
  <action>Compute recommendation same as Step 3.</action>
  <return />
</step>
```

Until extractor/runtime support is updated, these tags define the target authoring style for new and migrated workflows.

## Legacy Tags and Migration Rules

### `<check if="...">`

Treat `<check if="...">` as legacy branch syntax.

Migration rule:

- replace `<check if="..."> ... </check>` with `<branch if="..."> ... </branch>`

Why:

- `<check>` is being used as a first-class control-flow container in many files
- `<branch>` is clearer and aligns better with the target schema

### `<template-output>`

`<template-output>` is currently more of a schema-looking prompt convention than a fully deterministic runtime primitive.

Use it as detail-layer guidance for structured artifact content or structured return payloads.

Examples:

- generated fields for a document
- data-mode return values
- named artifact fragments

Recommended handling:

- do not turn `<template-output>` into Focus Chain checklist rows
- do surface it to the model as step-level detail
- it may remain as its own tag or be treated as detail-layer content by the renderer

Example:

```xml
<step n="20" goal="Data mode output">
  <action>Load and parse {sprint_status_file} same as Step 2.</action>
  <action>Compute recommendation same as Step 3.</action>
  <template-output>next_workflow_id = {{next_workflow_id}}</template-output>
  <template-output>next_story_id = {{next_story_id}}</template-output>
  <return />
</step>
```

### Annotation Tags

Tags such as:

- `<critical>`
- `<note>`
- `<guideline>`

should be treated as detail-layer annotations unless and until deterministic runtime support is added.

Recommended handling:

- surface them beneath the relevant step
- do not create checklist rows from them
- preserve their wording because they often materially affect execution quality

## No Same-Tag Nesting

Do not nest a tag inside another tag of the same type.

Avoid:

```xml
<action if="...">
  ...
  <action>...</action>
</action>
```

Use instead:

- sibling actions
- `<detail>` for subordinate explanation
- `<branch>` for nested conditional structure

Preferred:

```xml
<branch if="clear match is found">
  <output>Announce the detected mode.</output>
  <action>Proceed directly to constructing `{diff_output}`.</action>
</branch>
```

## Keep Step Bodies Clean

Avoid malformed or overloaded step bodies where:

- one sentence is split across several unrelated tags
- tags contain giant mixed prose blobs
- a step tries to represent multiple disjoint branches without structure

Prefer:

- one semantic step
- shared content at the step level
- branches for mutually exclusive variants
- details for examples and nuance

Additional authoring rules:

- If several top-level steps are really just conditional ways to achieve one outcome, collapse them into one `<step>` with `<branch if="...">` children.
- Do not split "detect state", "handle existing case", and "handle new case" into separate top-level steps when they are all part of one setup/preparation step.
- Keep document-write steps scoped to the actual lifecycle they support. If a write/update action can apply to both new and existing documents, write the step that way instead of scoping it only to brand-new documents.

Example:

```xml
<step n="7" goal="Present starter options">
  <output>
    Explain that the starter provides a solid architectural foundation and saves the team from making many low-level setup decisions manually.
  </output>

  <branch if="user_skill_level = expert">
    <ask>
      Found {starter_name}, which provides {starter_capabilities}. This would establish our base architecture with these technical decisions already made. Should we use it?
    </ask>
  </branch>

  <branch if="user_skill_level = intermediate">
    <ask>
      I found {starter_name}, which is a well-maintained starter for this kind of project. Should we use it?
    </ask>
  </branch>

  <branch if="user_skill_level = beginner">
    <ask>
      I found {starter_name}, which is like a pre-built foundation for your project. It follows best practices and saves us from making dozens of small technical choices up front. Should we use it?
    </ask>
  </branch>
</step>
```

## Repeated and Looping Work

Some workflow phases are not a strict one-pass sequence. They are long-running, repeated interactions such as facilitation, coaching, ideation, or iterative review.

For those phases:

- use one top-level `<step>` for the repeated execution loop
- place the turn-by-turn coaching pattern, heuristics, pacing rules, and capture guidance inside nested `<detail>` blocks
- keep only true phase transitions or routing choices as separate top-level steps

Do not model a repeated back-and-forth loop as many top-level sequential steps if the agent is supposed to stay inside the same interaction pattern for an extended period.

Bad pattern:

- Step 2: ask for the first response
- Step 3: coach deeper
- Step 4: sustain divergence
- Step 5: document ideas
- Step 6: offer continuation choices

Better pattern:

- Step 2: facilitate one technique element at a time through an iterative coaching loop
  - nested details describe:
    - how to respond to shallow vs rich answers
    - how to preserve divergence and momentum
    - how to capture ideas without breaking flow
    - when to periodically check for continuation choices
- Step 3: handle the user's explicit continuation choice and route accordingly

This keeps the checklist aligned with how the phase actually functions and reduces the chance that the model treats a repeated interaction as a one-time linear script.

## Write for Prompt Injection, Not File Self-Reference

Managed workflow prompt injection does not provide the model with the full source file as a document to inspect. It provides:

- workflow id
- current phase title
- current phase checklist
- current active step and its rendered instructions

Because of that, workflow files should be written as executable instructions that make sense when rendered into the prompt.

Do not write instructions like:

- "read this document"
- "review the advisory, reference, and prose sections in this file"
- "follow the prose below"
- "load the next step by reading this file"

Instead:

- write the actual operational instruction directly in the structured tags
- use `<detail>` to carry nuance, examples, heuristics, and supporting guidance
- use explicit routing tags such as `<handoff>`, `<goto>`, `<return>`, and `<exit>` for movement through the workflow

The file should remain understandable and executable even if the model only sees the rendered step content, not the original markdown file as a whole.

## Transitional `<prose>` Handling

Many current workflow files still contain a duplicated `<prose>` layer.

Short-term guidance:

- preserve `<prose>` where needed during migration
- let the extractor ignore `<prose>` for checklist building
- prefer moving operational meaning into structured tags over time
- do not delete substantive procedure from legacy `<prose>` blocks until that meaning has been deliberately rewritten into structured tags and preserved in the new format

Long-term direction:

- once the structured layer fully captures the intended behavior, `<prose>` can be reduced or removed

## Authoring Checklist

When writing or reviewing a workflow file, check for these:

1. Does each file express real workflow steps through `<step>` tags?
2. Does each step represent one semantic workflow step?
3. Are user questions in `<ask>` rather than `<output>`?
4. Are conditional branches expressed with `<branch if="...">`?
5. Are examples and nuance moved into `<detail>` instead of cluttering checklist items?
6. Are optional items marked with `optional="true"`?
7. Is `## CHECKPOINT` used only for real gating conditions?
8. Are routing directives expressed with explicit control-flow tags instead of prose?
9. Is same-tag nesting avoided?
10. Would the extracted checklist stay readable if every `<detail>` were hidden?
11. If a phase is inherently iterative, does the file model that as a loop-like step rather than a misleading one-pass sequence?
12. If several branches serve one semantic purpose, are they grouped under one top-level step instead of split into separate checklist steps?
13. Do the instructions still make sense when rendered into the prompt without telling the model to "read this file" or "review the prose below"?

## Migration Summary

During broad conversion work, prefer these rewrites:

- `<check if="...">` -> `<branch if="...">`
- prose routing directives -> `<goto/>`, `<handoff/>`, `<return/>`, `<exit/>`
- giant mixed action blobs -> `action + detail` or `branch + action/ask/output`
- annotation-only tags -> detail layer
- checkpoint-as-step hacks -> `## CHECKPOINT`

## Scope Note

This guide defines the target schema for managed BMAD workflow authoring.

It does not claim that every tag described here is already fully supported by deterministic code today. The purpose of this guide is to give future agents and maintainers one consistent format to author against, while extractor and renderer support is updated to match.
