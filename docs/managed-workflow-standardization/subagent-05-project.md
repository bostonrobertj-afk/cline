# Subagent 05 Project

## Objective
Review and update the assigned workflow families so their `workflow.md` and `step-*.md` files are fully aligned with [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md).

Write for the managed workflow prompt model, where the AI sees only the current phase checklist and the current active step instructions.

## Assigned Workflows
- `cline-skills/bmad-editorial-review-structure`
- `cline-skills/bmad-quick-spec`
- `cline-skills/bmad-sprint-planning`
- `cline-skills/bmad-sprint-status`
- `cline-skills/bmad-teach-me-testing`

## Required Grounding
- Use [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md) as the governing standard.
- Review file by file.
- Do not use a broad helper or one-command migration.
- Preserve each workflow family’s existing file structure.

## Problems To Look For
- Missing `<branch if="...">` for planning modes, data vs validate modes, structural alternatives, or user-choice paths
- Missing `optional="true"` on conditional or mutually exclusive branches
- Missing `<detail>` for explanation, examples, output formatting expectations, or technique guidance
- `<detail>` at the wrong level instead of nested under the exact step, branch, action, ask, or output it supports
- Internal duplication through `## REFERENCE`, `<prose>`, or other copied legacy layers
- Legacy `<check if="...">` usage
- Legacy `Read fully and follow` routing wording
- Self-referential file-reading instructions
- Asks written as actions
- Empty or degraded `## META` sections where meaningful goal text should remain
- Old extractor-control metadata:
- `managed_workflow_extraction: enabled`
- `phase_type: ...`
- `source_format: ...`
- Over-fragmented checklist structure where one semantic teaching or planning phase has been split into too many top-level steps

## Execution Rules
1. Read the current file and understand the authored flow before editing.
2. Preserve the workflow’s actual planning, teaching, or structural-review behavior.
3. If duplicate legacy content exists, use it as source material and rewrite it into the active structured form.
4. Rewrite wording so the active-step prompt makes sense on its own.
5. Use `<branch if="...">` for real conditional routing.
6. Use `optional="true"` for conditional alternatives or non-blocking paths.
7. Use and correctly nest `<detail>` for supporting guidance.
8. Use `<ask>` for user-facing prompts, confirmations, or clarifications.
9. Keep top-level checklist steps semantically meaningful rather than overly granular.

## Prompt-Model Reminders
- The model will not see the whole file.
- It will only see the current phase checklist and the active-step instructions.
- If guidance matters during execution, it must be present in structured content or nested detail for the active step.
- Standalone `## ADVISORY` text will not currently be injected into the managed prompt.

## QA Checklist
- No internal duplicated reference/prose layer remains.
- No `<check if="...">` remains.
- No `Read fully and follow` wording remains.
- No `read this file/document` wording remains.
- No banned extractor-control metadata remains.
- Conditional logic uses `<branch if="...">` where appropriate.
- Alternative or skippable paths use `optional="true"` where appropriate.
- `<detail>` exists where appropriate and is nested correctly.
- `<ask>` is used where the agent must ask the user something.
- Top-level checklist steps still reflect meaningful workflow progression.

## Deliverable
Return with:
- the list of files updated
- any workflow-specific ambiguities
- confirmation that all assigned files were manually reviewed against the guide and the QA checklist above
