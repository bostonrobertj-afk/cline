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

## Required Phase Progression Guidance

This is a required authoring rule for managed workflow `workflow.md` files, step files such as `step-*.md`, and checklist-style managed phase docs.

Because managed workflow prompt injection only shows the current phase checklist and the current active item, each managed workflow document must explicitly tell the agent how checklist progression works.

Required guidance:

- tell the agent to call `complete_workflow_item` as soon as the current active checklist item is actually finished
- tell the agent not to begin work from the next checklist item until the current one has been marked complete
- tell the agent that after the final checklist item in the current phase is complete, it must stop and wait for the prompt to refresh before doing work from the next phase
- tell the agent not to attempt checklist items from another phase while the current phase is active

Recommended placement:

- for files that use `## META`, include these rules in `## META`
- for checklist-style files that use another top-of-file guidance format, include equivalent language in that file's top-level critical/meta guidance block

These rules are required because without them the model may:

- continue into triage or presentation work while still operating on a stale earlier-phase prompt
- try to complete checklist items from the wrong phase
- produce valid work but fail managed workflow progression because it skipped explicit checklist completion

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

Hard rules:

- If the agent must ask the user something and wait for a response, use `<ask>`.
- Do not model user prompts, confirmations, selections, approvals, or clarification requests as `<action>`.
- Do not model clear user questions as `<output>`.
- If a step both presents information and asks for a decision, use `<output>` for the presentation and `<ask>` for the actual question.

Common migration mistakes:

- wrong: `<action>Ask the user which mode to use.</action>`
- wrong: `<output>Which mode would you like to use?</output>`
- right:

```xml
<output>Explain the available modes and what each one does.</output>
<ask>Ask the user which mode they want to use.</ask>
```

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

Hard rules:

- Use `<output>` when the agent is presenting, reporting, summarizing, or showing something to the user.
- Do not use `<output>` for questions that require a user response.
- Do not use `<output>` as a generic wrapper for mixed logic. If the agent needs to present information and then take a different path based on user response or state, separate that into `<output>`, `<ask>`, and `<branch if="...">` as needed.

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

Hard rules:

- If the workflow path changes based on a condition, use `<branch if="...">`.
- If several alternatives all achieve one semantic step goal, keep them inside one `<step>` and express the variants as sibling `<branch if="...">` blocks.
- Do not flatten conditional logic into sequential top-level steps when the steps are really alternative paths through the same outcome.
- Do not leave branch logic as plain prose if the condition materially affects what the agent should do.

Common cases that should almost always become `<branch if="...">`:

- user chooses one of several modes
- artifact exists vs does not exist
- new document vs existing document
- continue vs start fresh
- parsing/validation succeeds vs fails
- one of several mutually exclusive review or generation paths applies

Migration examples:

Wrong:

```xml
<step n="1" goal="Prepare the session">
  <action>Detect whether the user is continuing an existing session.</action>
</step>
<step n="2" goal="Handle existing session">
  <action>Load the existing session state.</action>
</step>
<step n="3" goal="Handle new session">
  <action>Create a fresh session state.</action>
</step>
```

Right:

```xml
<step n="1" goal="Prepare the session">
  <action>Determine whether the user is continuing an existing session or starting a new one.</action>
  <branch if="user is continuing an existing session" optional="true">
    <action>Load the existing session state.</action>
  </branch>
  <branch if="user is starting a new session" optional="true">
    <action>Create a fresh session state.</action>
  </branch>
</step>
```

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
- Do not leave examples, heuristics, warnings, or formatting guidance stranded in legacy duplicated sections when they really belong as `<detail>`.
- Do not use `<detail>` as a dumping ground for a second copy of the procedure. `<detail>` should support the action path, not duplicate it.

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
- mutually exclusive alternatives inside one semantic step
- new-vs-existing, success-vs-failure, or mode-selection variants where only some branches execute

Hard rules:

- When sibling branches are alternatives rather than cumulative requirements, mark the branches `optional="true"`.
- When a branch may be skipped because its condition is not met, mark it `optional="true"` unless the runtime is expected to enforce it as blocking.
- Do not force every conditional branch to look mandatory when the workflow clearly intends only one path to execute.
- Use `optional="true"` on item-level asks/actions/outputs only when that specific item is itself non-blocking or conditionally skippable.

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

Hard migration rule:

- Final converted files should not rely on prose-only routing like `Read fully and follow`, `Jump to Step`, `Continue below`, or `Return to the earlier section`.
- Rewrite that logic into explicit structured control flow and surrounding step/branch content.

## Legacy Tags and Migration Rules

### `<check if="...">`

Treat `<check if="...">` as legacy branch syntax.

Migration rule:

- replace `<check if="..."> ... </check>` with `<branch if="..."> ... </branch>`

Why:

- `<check>` is being used as a first-class control-flow container in many files
- `<branch>` is clearer and aligns better with the target schema

Final-state rule:

- Do not leave `<check if="...">` in a completed migrated file.

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
- If a top-level step mainly exists to carry examples, caveats, or sub-bullets, those belong in `<detail>` under the real step instead.

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

Related rule:

- If a legacy `## ADVISORY` section contains operational guidance the model needs during execution, rewrite that meaning into step/branch/item-level `<detail>` instead of assuming the advisory section will be shown to the model.

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

Final-state rule for completed migrations:

- A fully migrated workflow file should have one authoritative structured layer.
- Do not leave a second internally duplicated copy of the workflow in `## REFERENCE`, `<prose>`, or another mirrored block once the structured layer has been completed.
- Do not duplicate the file body into a legacy appendix and then also keep the structured version above it.
- If meaningful legacy content exists only in the duplicated layer, rewrite that meaning into `<step>`, `<branch>`, `<ask>`, `<output>`, `<action>`, and nested `<detail>`, then remove the duplicated layer.

Practical migration rule:

- During conversion, treat duplicated legacy content as source material.
- In the final converted file, keep only the rewritten structured version unless there is an explicit temporary reason to preserve the legacy block.

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
14. Are user prompts authored as `<ask>` rather than `<action>`?
15. If a step contains alternatives, are those alternatives represented as `<branch if="...">` instead of separate pseudo-steps or prose?
16. If sibling branches are mutually exclusive or conditionally skipped, are they marked `optional="true"` where appropriate?
17. Are `<detail>` blocks nested under the exact item they qualify whenever possible?
18. Does the final file avoid internal duplication through `## REFERENCE`, `<prose>`, or mirrored legacy blocks?
19. If meaningful guidance used to live in `## ADVISORY`, has that guidance been rewritten into structured execution content where needed?
20. Does the file explicitly instruct the agent to call `complete_workflow_item` as soon as the current active checklist item is finished?
21. Does the file explicitly instruct the agent to stop after the final item in the current phase and wait for the prompt to refresh before doing next-phase work?
22. Does the file explicitly forbid attempting checklist items from another phase while the current phase is active?

## Migration Summary

During broad conversion work, prefer these rewrites:

- `<check if="...">` -> `<branch if="...">`
- prose routing directives -> `<goto/>`, `<handoff/>`, `<return/>`, `<exit/>`
- giant mixed action blobs -> `action + detail` or `branch + action/ask/output`
- user-facing prompts inside `<action>` -> `<ask>`
- annotation-only tags -> detail layer
- duplicated `## REFERENCE` / `<prose>` workflow copies -> rewrite meaning into the structured layer, then remove the duplicate
- checkpoint-as-step hacks -> `## CHECKPOINT`
- missing phase-progression rules -> add explicit `complete_workflow_item`, prompt-refresh, and current-phase-only guidance to the file's top-level meta/critical instructions

## Scope Note

This guide defines the target schema for managed BMAD workflow authoring.

It does not claim that every tag described here is already fully supported by deterministic code today. The purpose of this guide is to give future agents and maintainers one consistent format to author against, while extractor and renderer support is updated to match.
