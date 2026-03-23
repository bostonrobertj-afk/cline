# Purpose

This guide is for authoring the contents of a native Cline workflow document from BMAD workflow source material.

It is not a guide to workflow registration, storage, toggles, or invocation.
Assume the authoring agent is given:

- an empty target file to write
- a BMAD workflow source file or source file set to translate

The goal is to produce a native Cline workflow document in the target file.

# Required Inputs

Before authoring, gather or confirm:

- the target file path for the native Cline workflow document
- the BMAD source file or file set to translate
- any user constraints that should shape the rewrite, if they were explicitly provided

# Core Standard

Author the target workflow as a native Cline workflow document:

- markdown is the primary structure
- use XML tool syntax when precise tool behavior should be preserved
- keep the output concise, but not at the expense of correctness

The target workflow should read like a clean native Cline workflow, not like a mechanically copied managed-workflow file.

# Native Cline Workflow Shape

Every authored workflow should include:

- a single `#` title
- a brief one-sentence description of the workflow objective
- ordered workflow steps using `## Step N: Name`
- within each step, concise instructions in plain language unless exact tool behavior should be preserved with XML

Minimal shape:

`# Workflow Name`
`One-sentence description of the workflow objective and intended outcome.`

`## Step 1: Step Name`
`Describe what this step should accomplish.`

`## Step 2: Next Step`
`Describe the next required action, decision, or validation.`

# XML Policy For This Authoring Process

In this workflow-authoring process, XML should be used when precise behavior is important to preserve.

Use XML when the workflow needs clear, exact control over:

- a specific Cline tool call
- an exact question to the user
- an approval or halt boundary that should not be left implicit
- a tool invocation whose parameters materially affect workflow behavior

Do not add XML just because the BMAD source used XML.
Use it when it improves reliability or preserves important control.

Useful references:

- tool inventory: [src/shared/tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts)
- official workflow authoring docs: https://docs.cline.bot/customization/workflows

Note:
- `src/shared/tools.ts` is the broad tool inventory
- exact workflow authoring patterns and XML examples should be cross-checked against Cline's documentation and the codebase's existing native workflows

Literal XML examples:

`<execute_command>`
`  <command>npm run test</command>`
`  <requires_approval>false</requires_approval>`
`</execute_command>`

`<read_file>`
`  <path>src/config.json</path>`
`</read_file>`

`<ask_followup_question>`
`  <question>Deploy to production or staging?</question>`
`  <options>["Production", "Staging", "Cancel"]</options>`
`</ask_followup_question>`

# Translation Rules For BMAD Source Material

## Preserve These

When translating BMAD source material, preserve:

- the real objective of the workflow
- meaningful step boundaries
- meaningful user-decision gates
- halt conditions
- approval requirements
- required outputs or end-state checks
- placeholder names that later workflow text depends on
- exact file names, status names, and workflow-state labels when they matter

## Remove These

Do not carry over managed-workflow scaffolding unless the target native workflow truly needs an equivalent instruction.

Usually remove:

- checklist-engine instructions
- `complete_workflow_item` reminders
- checkpoint-resolution reminders
- "wait for prompt refresh" instructions
- optional-branch bookkeeping
- repeated phase-mechanics instructions
- handholding written only to support weak or rigid execution engines

## Rewrite These Aggressively

The BMAD source often overuses `<branch if>` structure.
Do not preserve that branch density by default.

Instead:

- keep the real decision gate
- flatten over-nested branches into concise prose when the behavior remains clear
- replace mechanical branch trees with direct instructions when a capable agent can reliably follow them

Good native rewrite:

- "If the review mode is unclear, ask the user to choose the review source."

Poor native rewrite:

- reproducing a five-level branch tree just because the BMAD source used one

# Brevity Rule

The native Cline version should usually be less verbose than the BMAD version.

That is intentional.

BMAD workflows are often written to support weaker models and managed-workflow execution mechanics.
This authoring process is aimed at stronger agents using native Cline workflows.

So:

- compress wording
- remove repeated scaffolding
- simplify nested control structures

But do not:

- remove a real stop/ask/proceed decision
- remove a required approval boundary
- collapse distinct phases that serve different purposes
- replace a real gate with a vague "handle as needed"

Shorter is good.
Looser is not.

# Practical Rewrite Heuristics

Use these heuristics while translating:

1. Preserve intent first.
2. Preserve meaningful gates second.
3. Remove managed-workflow machinery third.
4. Compress wording last.

If a BMAD section exists only to manage the workflow engine, delete it.
If it exists to control user interaction, review scope, approval, or correctness, keep the behavior in a native form.

# Example: Safe Compression

Source behavior to preserve:

`<action>Determine the repo's test command and run the relevant test suite, plus lint or quality checks if configured.</action>`
`<branch if="regressions or test failures occur" optional="true">`
`  <ask>Halt and request guidance if the failure is not obvious to fix quickly.</ask>`
`</branch>`

Good native rewrite:

`## Step N: Validate`
`Determine the repo's test command and run the relevant test suite, plus lint or quality checks if configured.`
`If failures are straightforward to fix, remediate and rerun. If not, stop and ask the user how to proceed.`

This is shorter than the BMAD version while still preserving the real gate.

# Example: Unsafe Compression

Unsafe rewrite:

`Run tests and handle failures as needed.`

Why unsafe:

- it removes the halt/ask boundary
- it leaves too much of the original decision logic unspecified

# Placeholder Rule

If the BMAD source establishes workflow-state placeholders that matter later, preserve the placeholder behavior clearly in the native workflow.

Keep:

- exact placeholder keys
- the step where the value becomes known
- the instruction to persist that value when later workflow text depends on it

Do not silently rename placeholder keys during translation.

# Authoring Output Expectations

The final authored target file should:

- read cleanly as a native Cline workflow
- be shorter and less scaffold-heavy than the BMAD source
- preserve meaningful decision gates and approval points
- use XML only where precision materially helps
- avoid managed-workflow engine instructions that do not belong in a native workflow

# Final Check Before Finishing

Before concluding the authoring pass, verify:

- the title and description are present
- step numbering is clean and sequential
- the rewritten workflow preserves real stop/ask/proceed gates from the source
- unnecessary BMAD scaffolding has been removed
- XML is used only where it improves precision
- placeholder names and important status labels still match the intended workflow behavior
