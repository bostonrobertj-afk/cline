# Subagent 04 Project

## Objective
Review and update the assigned workflow families so their `workflow.md` and `step-*.md` files are fully aligned with [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md).

These workflow documents must be authored for managed prompt injection, where the model only receives the checklist and active-step instructions.

## Assigned Workflows
- `cline-skills/bmad-domain-research`
- `cline-skills/bmad-market-research`
- `cline-skills/bmad-review-adversarial-general`
- `cline-skills/bmad-review-edge-case-hunter`
- `cline-skills/bmad-editorial-review-prose`

## Required Grounding
- Use [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md) as the formatting standard.
- Review each file manually.
- Do not rely on broad helper scripts, bulk rewrites, or one-shot mass edits.
- Keep the existing file structure intact.

## Problems To Look For
- Missing `<branch if="...">` where review or research flow changes based on artifact type, findings, user choice, or severity path
- Missing `optional="true"` on alternative review or research branches
- Missing `<detail>` for severity criteria, evaluation nuance, examples, or report-shape guidance
- `<detail>` not nested under the exact action, ask, output, or branch it qualifies
- Duplicated internal content through `## REFERENCE`, `<prose>`, or similar wrapper-era duplication
- Legacy `<check if="...">` blocks
- Legacy `Read fully and follow` routing language
- Self-referential instructions telling the model to read the file, prose, or reference block
- Prompts to the user expressed as `<action>` instead of `<ask>`
- Accidental loss of meaningful human-facing metadata in `## META`
- Old extractor-control metadata:
- `managed_workflow_extraction: enabled`
- `phase_type: ...`
- `source_format: ...`

## Execution Rules
1. Inspect the file and understand the real authored procedure before editing.
2. Preserve substantive review and research logic, including severity handling, review mode changes, and output expectations.
3. If duplicate content exists, rewrite from the real source material and remove the duplicate block.
4. Replace self-referential wording with prompt-injection-aware wording.
5. Use `<branch if="...">` wherever the workflow genuinely has conditional routing.
6. Use `optional="true"` on alternative or non-blocking branches.
7. Use `<detail>` for supporting guidance and nest it under the specific item it qualifies.
8. Use `<ask>` for user interactions or approvals.
9. Keep top-level checklist steps semantically meaningful.

## Prompt-Model Reminders
- The model does not read the full source file.
- It only sees the checklist and the active step.
- If a review standard or research nuance is important during execution, it must appear in structured active-step content or nested detail.
- `## ADVISORY` content alone will not reach the model unless rewritten into the structured execution content.

## QA Checklist
- No duplicated internal `## REFERENCE` / `<prose>` remains.
- No legacy `<check if="...">` remains.
- No `Read fully and follow` remains.
- No `read this file/document/prose` wording remains.
- No banned extractor-control metadata remains.
- Branching, optionality, and detail placement all reflect the actual workflow logic.
- User-facing prompts are authored with `<ask>` where appropriate.
- Top-level steps remain clean checklist units.

## Deliverable
Return with:
- the list of files updated
- any ambiguous authoring decisions or residual risks
- confirmation that all assigned files were manually reviewed against the guide and the QA checklist above
