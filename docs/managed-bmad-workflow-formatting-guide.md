# Managed BMAD Workflow Formatting Guide

This guide defines the target authoring format for managed BMAD workflow files such as `workflow.md` and `step-*.md`.

Use this guide when:

- authoring new managed workflow files
- reformatting legacy workflow files
- reviewing workflow files for parser compatibility
- migrating XML-like step files into the new checklist-plus-details format

The current target format is the parser-friendly structure used in [step-01-gather-context.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-code-review/steps/step-01-gather-context.md).

## Goals

The managed workflow format should support two complementary layers:

- Checklist layer
  - clean step rows the runtime can extract reliably
  - one line per meaningful workflow step
  - easy to render in a managed checklist UI
- Detail layer
  - the full instructions the model needs for the currently active step
  - examples, tool snippets, conditional logic, heuristics, warnings, and output expectations
  - attached to the owning step without turning every nuance into a checklist row

The intended result is:

- the parser extracts stable checklist items from step lines only
- a separate detail extractor renders the `## Details` block for the first incomplete step
- authors can preserve rich workflow guidance without breaking checklist extraction

## Target File Shape

A managed workflow file should usually follow this high-level shape:

```md
---
placeholder_name: '' # optional runtime placeholder declarations
---

# Phase Title

## Meta
- top-level execution guidance
- phase progression rules
- placeholder persistence rules

- [ ] Step 1: Step Description
## Details
Instructions for step 1.

- [ ] Step 2: Step Description
## Details
Instructions for step 2.
```

Key properties:

- frontmatter is required when the file defines runtime placeholders
- `# Title` is allowed and should name the phase or workflow clearly
- `## Meta` is allowed before the first step and is the preferred place for top-level execution rules
- each step is represented by exactly one checklist line
- each step is immediately followed by exactly one `## Details` heading
- the detail block continues until the next step line or end of file

## Parser Contract

The managed parser behavior this format is designed for is:

1. checklist extractor
- scans for lines that start with `- [ ] `
- stores only those lines as checklist items

2. detail extractor
- finds the `## Details` section immediately beneath the selected step line
- renders the detail content for the first incomplete checklist item

Because of that, these formatting rules are mandatory.

### Step Line Rules

Every managed workflow step must use this exact shape:

```md
- [ ] Step N: Step Description
```

Required rules:

- begin the line with exactly `- [ ] `
- include the literal word `Step`
- include the step number on the same line
- include the human-readable step description on the same line
- make the line complete enough to stand on its own in checklist form

Good examples:

```md
- [ ] Step 1: Determine Review Source
- [ ] Step 2: Construct Review Input
- [ ] Step 3: Load Spec and Context Documents
```

Bad examples:

```md
- [ ] Determine review source
- [ ] Step 1
- [ ] Step One: Review source
```

Why this matters:

- the checklist extractor only sees the step line
- if the step line is vague, the checklist becomes vague
- if the step line is malformed, the parser may miss it entirely

### `## Details` Rules

Each step must be followed immediately by its details heading:

```md
- [ ] Step 2: Construct Review Input
## Details
...
```

Required rules:

- `## Details` must appear immediately below the step line
- do not place any prose, blank section, or other heading between the step line and `## Details`
- each step must have exactly one `## Details` heading
- do not use extra `## Details` headings elsewhere in the file

The detail extractor assumes adjacency. If anything sits between the step line and `## Details`, extraction may become ambiguous or fail.

## Authoring Rules

### 1. Keep `## Meta` Short and Operational

`## Meta` should contain only top-level execution rules that apply to the whole file.

Good content for `## Meta`:

- execute this file in order
- halt whenever user input or gating is required
- preserve certain artifacts when both exact and contextual inputs exist
- store runtime values with `set_workflow_placeholders` when they are established

Avoid:

- repeating full step procedures in `## Meta`
- step-specific branching logic in `## Meta`
- duplicated guidance that already exists inside a step's details

### 2. Each Step Should Represent One Meaningful Work Unit

A step should correspond to one checklist-worthy unit of progress.

Prefer:

- `Step 1: Determine Review Source`
- `Step 2: Construct Review Input`

Avoid:

- one giant step for the entire phase
- tiny micro-steps that only exist because the legacy file had many tags

### 3. Put All Execution Nuance Inside `## Details`

Use the detail block for:

- conditional logic
- examples
- tool snippets
- heuristics
- validation rules
- exceptions
- fallback behavior

Within `## Details`, express logic using normal markdown prose and bullets.

Recommended patterns:

- imperative sentences for actions
- `If ...` bullets for conditional logic
- flat bullets for ordered guidance
- indented sub-bullets only when they improve clarity

### 4. Preserve Placeholder Semantics Explicitly

If a step establishes a runtime value that later steps use, the detail block for that step must explicitly say to store it with `set_workflow_placeholders` and must name the exact placeholder key.

Good example:

```md
- Set `{spec_file}` to the resolved story file path using the `set_workflow_placeholders` tool.
```

Do not rely on the agent to infer that a later step will need the value.

### 5. Write for Prompt Injection, Not File Self-Reference

The agent typically sees:

- the checklist
- the currently active step's details

Do not write instructions like:

- "read this document below"
- "review the advisory section"
- "follow the prose later in this file"

Instead:

- put the actual instruction directly inside the owning step's `## Details`
- keep the file executable even when only one step's details are visible

### 6. Do Not Use Trailing Legacy Sections as Execution Dependencies

Avoid relying on sections like:

- `## CHECKPOINT`
- `## ADVISORY`
- `## REFERENCE`
- duplicated legacy appendices

If that guidance matters for execution, move it into:

- `## Meta` if it applies to the whole file
- the relevant step's `## Details` if it applies to one step

The final parser-friendly file should not depend on a hidden end section to communicate required behavior.

## Migration Rules: Legacy XML-Like Format to Checklist Format

Many existing managed workflow files still use XML-like structures such as:

- `<step n="..." goal="...">`
- `<action>`
- `<ask>`
- `<output>`
- `<branch if="...">`
- `<detail>`

When migrating those files, preserve behavior, not tag syntax.

### Convert `<step>` to a Checklist Step

Legacy:

```xml
<step n="2" goal="Construct review input">
  ...
</step>
```

Converted:

```md
- [ ] Step 2: Construct Review Input
## Details
...
```

Rules:

- use the legacy step number as `N`
- convert the `goal` into the checklist step description
- title-case the step description when appropriate
- keep the description concise but meaningful

### Convert `<action>`, `<ask>`, and `<output>` into Detail Instructions

There are no separate XML tags in the new format.

Rewrite them into plain markdown instructions inside `## Details`:

- `<action>` -> imperative instruction bullet or paragraph
- `<ask>` -> explicit bullet telling the agent to ask the user
- `<output>` -> explicit bullet telling the agent to present or report something

Examples:

Legacy:

```xml
<action>Verify the base branch exists.</action>
<ask if="base branch does not exist">Ask the user for a valid branch.</ask>
<output>Explain the available modes.</output>
```

Converted:

```md
## Details
- Verify the base branch exists.
- If the base branch does not exist, ask the user for a valid branch.
- Present the available modes to the user.
```

### Convert `<branch if="...">` into Explicit Conditional Bullets

Legacy:

```xml
<branch if="review mode is branch diff">
  <action>Run `git diff origin/main...HEAD`.</action>
</branch>
```

Converted:

```md
## Details
If the review mode is branch diff:
- Run `git diff origin/main...HEAD`.
```

Rules:

- preserve the condition text clearly
- use `If ...:` as the branch lead-in
- keep the branch content nested beneath it
- do not split mutually exclusive branches into separate top-level steps unless they are truly separate workflow units

### Convert `<detail>` into Subordinate Bullets

Legacy `<detail>` content should remain attached to the instruction it qualifies.

Legacy:

```xml
<action>
  Determine the review mode.
  <detail>
    - "staged" means staged changes only
    - "branch diff" means compare against base branch
  </detail>
</action>
```

Converted:

```md
## Details
- Determine the review mode.
  - `staged` means staged changes only.
  - `branch diff` means compare against the base branch.
```

Rules:

- keep examples and heuristics under the relevant parent bullet
- do not duplicate them elsewhere in the file
- do not leave a second legacy prose block containing the same logic

## Workflow and Step File Conventions

These rules apply to both `workflow.md` files and `step-*.md` files.

### Frontmatter

Use frontmatter when the file declares runtime placeholders.

Example:

```yaml
---
diff_output: '' # set at runtime
review_input: '' # set at runtime
review_mode: '' # set at runtime
---
```

Rules:

- keep comments short and operational
- declare only placeholders the file truly uses
- if a placeholder is written at runtime, the relevant step must also instruct the agent to persist it with `set_workflow_placeholders`

### Title

Use one top-level `#` heading to name the workflow or phase.

Examples:

- `# Code Review`
- `# Step 02 Review`
- `# Create Story`

The title should help a human identify the file, but the parser should not depend on it for step extraction.

### Step Ordering

Step numbers must:

- start at `1`
- increase sequentially
- remain stable unless the phase is intentionally restructured

Do not skip numbers unless there is a deliberate, documented reason.

## Phase Progression Guidance

If the runtime still depends on explicit progression guidance, put it in `## Meta`, not in a separate trailing section.

Typical examples:

- complete the current checklist item before starting the next one
- halt when user input or confirmation is required
- stop after the final item if the runtime will refresh the prompt before the next phase

Keep this guidance short and phase-wide.

## What to Remove During Migration

A completed migration should not leave behind:

- XML tags such as `<step>`, `<action>`, `<ask>`, `<output>`, `<branch>`, or `<detail>`
- duplicated legacy workflow copies
- mixed old-format and new-format step definitions in the same file
- parser-ambiguous extra `## Details` headings
- required execution guidance stranded in `## ADVISORY` or similar trailing sections

Treat legacy content as source material. The final file should contain only the rewritten checklist-plus-details version.

## Authoring Checklist

When writing or reviewing a managed workflow file, verify:

1. Does each executable step use the exact form `- [ ] Step N: Step Description`?
2. Does every step have exactly one `## Details` heading immediately beneath it?
3. Is the step line meaningful on its own when shown in a checklist?
4. Does each step represent one real unit of progress?
5. Is all step-specific nuance located inside that step's `## Details` block?
6. Is `## Meta` short, operational, and limited to phase-wide guidance?
7. If a step establishes a runtime placeholder, does it explicitly name `set_workflow_placeholders` and the exact placeholder key?
8. Have legacy XML-like tags been fully translated rather than partially preserved?
9. Have legacy branch conditions been rewritten as clear `If ...` logic inside the owning step?
10. Have examples and heuristics been preserved under the correct instruction rather than dropped?
11. Does the file avoid relying on `## CHECKPOINT`, `## ADVISORY`, or other trailing sections for required execution behavior?
12. If both contextual and exact review artifacts exist, does the file explain how each should be preserved and used?
13. Would the file still make sense if the model only saw the active step line and its `## Details` block?

## Migration Summary

When converting a legacy managed workflow file, prefer these rewrites:

- `<step n="2" goal="Construct review input">` -> `- [ ] Step 2: Construct Review Input`
- `<action>` -> imperative markdown instruction
- `<ask>` -> explicit "ask the user" instruction
- `<output>` -> explicit "present/report" instruction
- `<branch if="...">` -> `If ...:` plus nested bullets
- `<detail>` -> subordinate bullets under the owning instruction
- trailing advisory/checkpoint prose -> move the required meaning into `## Meta` or the correct step's `## Details`
- duplicated legacy appendices -> remove after the meaning has been rewritten into the new structure

## Scope Note

This guide defines the current target format for managed BMAD workflow authoring.

If an older file still uses the XML-like structure, treat that file as legacy source material to be migrated into the checklist-plus-details format described here. For new files and completed migrations, this markdown format is the authoritative target.
