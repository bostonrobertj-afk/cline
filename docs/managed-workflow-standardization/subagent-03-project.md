# Subagent 03 Project

## Objective
Review and update the assigned workflow families so their `workflow.md` and `step-*.md` files are fully aligned with [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md).

Author these files for the managed workflow prompt the model actually sees, not for direct source-file reading.

## Assigned Workflows
- `cline-skills/bmad-dev-story`
- `cline-skills/bmad-generate-project-context`
- `cline-skills/bmad-qa-generate-e2e-tests`
- `cline-skills/bmad-quick-dev`
- `cline-skills/bmad-quick-dev-new-preview`

## Required Grounding
- Use [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md) as the source of truth.
- Review manually, file by file.
- No broad helper, bulk conversion, or mass regex rewrite.
- Update existing files only. Do not change workflow family structure.

## Problems To Look For
- Missing `<branch if="...">` for mode detection, preview vs normal flow, artifact availability, failure handling, or completion routing
- Missing `optional="true"` on alternative paths, fallback paths, or non-blocking branches
- Missing `<detail>` for implementation nuance, guardrails, step-local examples, or output-shape guidance
- `<detail>` placed as a loose sibling when it should be nested under the specific action, ask, output, or branch it qualifies
- Duplicated internal content through `## REFERENCE`, `<prose>`, or old dual-layer extraction content
- Remaining `<check if="...">` instead of `<branch if="...">`
- Remaining `Read fully and follow` or similar legacy routing phrasing
- Instructions telling the model to read the file or prose block
- Misuse of `<action>` where the workflow really requires `<ask>`
- Empty or gutted `## META` sections where meaningful goal text should remain
- Old extractor-control metadata:
- `managed_workflow_extraction: enabled`
- `phase_type: ...`
- `source_format: ...`
- Loop-like or ongoing facilitation/development flows incorrectly broken into too many top-level checklist steps

## Execution Rules
1. Read the file and understand the actual intended flow before editing.
2. Preserve substantive workflow behavior, especially gating, fallback, preview, and completion logic.
3. If duplicate legacy content exists, use it as source material and rewrite it into the active structure instead of keeping the duplicate block.
4. Rewrite self-referential language so the active-step prompt is self-contained.
5. Use `<branch if="...">` for any real conditional path.
6. Add `optional="true"` to branches that are alternatives, fallback paths, or explicitly skippable.
7. Add and properly nest `<detail>` where supporting guidance belongs.
8. Use `<ask>` for user-facing questions and confirmations.
9. Keep top-level steps aligned to real checklist progress, not over-detailed implementation submoves.

## Prompt-Model Reminders
- The model only sees the current phase checklist plus the current active step instructions.
- It does not see the whole workflow source file.
- Important execution guidance must be inside the active structured content, not hidden in legacy reference sections or advisory-only text.

## QA Checklist
- No duplicated internal reference/prose layer remains.
- No `<check if="...">` remains.
- No `Read fully and follow` wording remains.
- No `read this file/document` wording remains.
- No banned extractor-control metadata remains.
- Real conditional logic is represented with `<branch if="...">`.
- Optional or alternative branches use `optional="true"` where appropriate.
- `<detail>` is present and correctly nested where needed.
- Top-level steps are not over-fragmented.

## Deliverable
Return with:
- the list of files updated
- any workflow-specific risks or questions
- confirmation that every assigned file was manually reviewed against the guide and the QA checklist above
