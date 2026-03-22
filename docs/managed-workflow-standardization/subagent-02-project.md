# Subagent 02 Project

## Objective
Review and update the assigned workflow families so their `workflow.md` and `step-*.md` files are fully aligned with [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md).

These files must be authored for managed workflow prompt injection, not for direct file reading by the model.

## Assigned Workflows
- `cline-skills/bmad-document-project`
- `cline-skills/bmad-index-docs`
- `cline-skills/bmad-shard-doc`
- `cline-skills/bmad-technical-research`
- `cline-skills/bmad-validate-prd`

## Required Grounding
- Use [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md) as the primary formatting guide.
- Review manually, file by file.
- Do not use broad command-driven rewrites or helper-style mass conversion.
- Preserve the existing file structure for each workflow family.

## Problems To Look For
- Missing `<branch if="...">` for format detection, validation routing, conditional outputs, continuation states, or repair paths
- Missing `optional="true"` on mutually exclusive, conditional, or non-blocking branches
- Missing `<detail>` for format notes, validation nuance, output-shape guidance, or instructional examples
- `<detail>` attached too high instead of nested beneath the precise action, ask, output, or branch it clarifies
- Internal duplication through `## REFERENCE`, `<prose>`, or copied legacy content blocks
- Legacy `<check if="...">` blocks that should be converted to `<branch if="...">`
- Self-referential instructions telling the agent to read the file or prose block
- Legacy `Read fully and follow` text
- Human-meaningful content accidentally stripped from `## META`
- Old extractor-control metadata:
- `managed_workflow_extraction: enabled`
- `phase_type: ...`
- `source_format: ...`
- Step granularity that hides one semantic validation/research phase inside too many checklist steps

## Execution Rules
1. Read the current file and identify the true authored workflow before editing.
2. Preserve substantive logic, including validation rules, research outputs, and decision paths.
3. If you find duplicated legacy content, rewrite from the real authored instructions rather than preserving the duplicate block.
4. Rewrite wording so the active-step prompt makes sense on its own.
5. Use `<branch if="...">` whenever the path changes based on file format, artifact presence, validation result, or user choice.
6. Use `optional="true"` for alternative or skippable branches that should not behave like universally required substeps.
7. Use `<detail>` for supporting instruction and nest it under the exact item it qualifies.
8. Use `<ask>` for explicit user questions or confirmations.
9. Keep top-level steps focused on meaningful checklist progression.

## Prompt-Model Reminders
- The model will not read the source file directly.
- Only the current phase checklist and current active step details are shown.
- Operationally important guidance must live in structured execution content or nested detail.
- `## ADVISORY` content is not enough on its own if the model needs that instruction while executing the step.

## QA Checklist
- No duplicated internal `## REFERENCE` / `<prose>` content remains.
- No `<check if="...">` remains.
- No `Read fully and follow` wording remains.
- No `read this file/document` wording remains.
- No banned extractor-control metadata remains.
- Branching, optionality, and detail placement are all materially improved and correctly nested.
- Any validation or format-detection logic is visibly represented as conditional structure, not flattened prose.
- Files still preserve the original workflow family structure.

## Deliverable
Return with:
- the list of files updated
- any unresolved ambiguities
- confirmation that each file was manually reviewed against the guide and the QA checklist above
