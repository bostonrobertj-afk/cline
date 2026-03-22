# Subagent 01 Project

## Objective
Review and update the assigned workflow families so their `workflow.md` and `step-*.md` files are fully aligned with [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md).

These files feed managed workflow prompt injection. Author them for the prompt the AI agent actually sees:
- workflow id
- current phase title
- current phase checklist
- current active step and its rendered instructions

Do not write instructions that assume the model can read the whole source file.

## Assigned Workflows
- `cline-skills/bmad-brainstorming`
- `cline-skills/bmad-create-ux-design`
- `cline-skills/bmad-edit-prd`
- `cline-skills/bmad-retrospective`
- `cline-skills/bmad-party-mode`

## Required Grounding
- Use [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md) as the formatting source of truth.
- Work file by file.
- Do not use a broad helper, broad regex migration, or single-command mass edit.
- Update existing files only. Do not add duplicate files or change the target workflow family structure.

## Problems To Look For
- Conditional flow flattened into plain sequential steps instead of `<branch if="...">`
- Mutually exclusive or non-blocking branches missing `optional="true"`
- Missing `<detail>` blocks where supporting guidance clearly belongs with a step, branch, action, ask, or output
- `<detail>` attached at the wrong level instead of nested under the specific item it qualifies
- Entire file duplicated internally through `## REFERENCE`, `<prose>`, or similar legacy dual-layer content
- Legacy `<check if="...">` still present instead of `<branch if="...">`
- User-facing prompts incorrectly authored as `<action>` instead of `<ask>`
- Self-referential instructions like `read this file`, `read this document`, `review the prose below`, or `treat the prose as authoritative`
- Legacy routing language like `Read fully and follow`
- Empty `## META` sections caused by deleting meaningful human-facing metadata
- Old extractor-control metadata that should be removed:
- `managed_workflow_extraction: enabled`
- `phase_type: ...`
- `source_format: ...`
- Iterative facilitation or loop-like work modeled as too many top-level checklist steps instead of one main step with nested detail
- Branches split into separate top-level steps when they really belong under one semantic parent step
- Important guidance left only in `## ADVISORY`, which does not currently get injected into the managed workflow prompt

## Execution Rules
1. Open the current file and understand the real authored procedure before editing.
2. Preserve substantive workflow logic. Do not delete real instructions just because they are verbose.
3. If legacy duplicated content exists, use the real authored content as source material and rewrite it into the new structure instead of keeping the duplicate block.
4. Replace old wrapper behavior with prompt-injection-aware wording.
5. Use `<branch if="...">` wherever the workflow clearly depends on a condition, menu path, continuation state, or user choice.
6. Add `optional="true"` on branches that are conditional alternatives, mutually exclusive paths, or explicitly skippable paths.
7. Add `<detail>` where explanatory guidance is needed, and nest it under the exact `step`, `branch`, `action`, `ask`, or `output` it qualifies.
8. Use `<ask>` for things the agent must ask the user. Do not hide asks inside `<action>`.
9. Keep top-level steps meaningful checklist units. Do not explode one semantic step into many tiny checklist rows.
10. If a loop or facilitation pattern repeats across many turns, keep it as one main step with supporting detail unless there is a real phase transition.

## Prompt-Model Reminders
- The model does not get the full file.
- The model only gets the current phase checklist and current active step instructions.
- If guidance must influence execution, it needs to live in executable structure or nested detail for the active step.
- `## ADVISORY` by itself is not enough if the content is operationally important.

## QA Checklist
- No duplicated internal `## REFERENCE` / `<prose>` layer remains.
- No legacy `<check if="...">` remains.
- No `Read fully and follow` wording remains.
- No self-referential `read this file/document` wording remains.
- No banned extractor-control metadata remains.
- Conditional logic uses `<branch if="...">` where appropriate.
- Alternative or skippable branches use `optional="true"` where appropriate.
- `<detail>` exists where supporting instruction is needed and is nested at the correct level.
- User prompts are expressed with `<ask>` tags where appropriate.
- Top-level steps still reflect real checklist units rather than over-fragmented detail.

## Deliverable
Return with:
- the list of files updated
- any workflow-specific ambiguities or risks
- confirmation that the assigned families were reviewed file by file against the guide and the QA checklist above
