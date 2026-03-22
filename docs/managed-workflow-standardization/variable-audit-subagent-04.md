# Variable Audit Subagent 04

## Objective
Audit the assigned managed workflow families under `cline-skills/` and update them where needed so variable references in `workflow.md` and companion step files can be resolved correctly by the managed workflow runtime.

This audit is specifically about placeholder correctness and placeholder sourceability. The goal is not to redesign the workflows. The goal is to ensure that when a workflow or step file references a variable, that variable:
- has a real source that the managed workflow runtime can use for resolution
- uses the correct placeholder syntax in the document
- is not left as bare text, backticked text, or malformed template text when runtime resolution is expected

## Workflow-Agnostic Audit Instruction Set

### Required Grounding
- Use [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md) as the formatting source of truth.
- Use [managed-workflow-placeholder-resolution-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-workflow-standardization/managed-workflow-placeholder-resolution-plan.md) as the source of truth for placeholder-resolution intent.
- Work file by file.
- Do not use a broad helper, broad regex migration, or single-command mass edit.
- Update existing files only. Do not add duplicate workflow files or change the workflow family structure.

### In Scope Per Workflow Family
- `workflow.md`
- all phase or step instruction files actually used by that family
- this includes directories such as `steps/`, `steps-c/`, `steps-e/`, `steps-v/`, `technical-steps/`, `domain-steps/`, and `workflows/` when present

### What Counts As A Valid Placeholder Source
- A stable runtime or config value that the runtime seeds directly, such as `project-root`, `date`, or other known config-backed values
- A workflow frontmatter key whose value is derived from a stable source, for example:
- `config_source: '{project-root}/_bmad/bmm/config.yaml'`
- `implementation_artifacts: '{config_source}:implementation_artifacts'`
- `sprint_status_file: '{implementation_artifacts}/sprint-status.yaml'`
- A dynamic workflow-state value intended to be set during execution, such as `{{mode}}`, `{{next_story_id}}`, or other named workflow outputs or state variables

### What Must Be Corrected
- Bare variable references that should be placeholders, such as `project_context`, `sprint_status_file`, `story_location`, or similar tokens used as if they were runtime values
- Backticked variable references that should be placeholders, such as `` `project_context` `` when runtime resolution is intended
- Placeholder references whose source cannot be traced to frontmatter, runtime/config seeding, or dynamic workflow state
- Placeholder syntax that does not match intent
- Use `{placeholder}` for stable runtime, config, and frontmatter-derived values
- Use `{{placeholder}}` for dynamic workflow-state values, template outputs, and values expected to be set during execution
- Malformed chains in frontmatter that break sourceability
- References that imply a value will resolve even though no source exists

### Variable Audit Procedure
1. Open `workflow.md` and list every placeholder-like token and every bare token that appears to be functioning as a variable.
2. Trace each variable to its source.
3. Confirm whether the source is:
- stable runtime/config
- frontmatter-derived through another placeholder chain
- dynamic workflow-state
- not actually resolvable
4. Audit every companion step or workflow instruction file in the family and repeat the same tracing.
5. Correct formatting where needed.
6. If a reference is meant to be literal text rather than a runtime value, leave it literal.
7. If a reference clearly intends runtime resolution but no real source exists, fix it only if the proper source can be confidently inferred from the existing workflow family. Otherwise leave the file unchanged and report it as a blocker.

### QA Checklist
- Every variable intended for runtime resolution uses placeholder syntax rather than bare text.
- Stable values use `{placeholder}`.
- Dynamic workflow-state values use `{{placeholder}}`.
- Every placeholder in the audited files has a traceable source.
- No step or workflow file introduces a new unresolved placeholder.
- No placeholder was converted if the value was actually meant to be literal prose.
- No duplicate internal `## REFERENCE`, `<prose>`, or similar legacy layer was added.
- The file structure of the workflow family is unchanged.

## Assigned Workflows
- `cline-skills/bmad-market-research`
- `cline-skills/bmad-party-mode`
- `cline-skills/bmad-qa-generate-e2e-tests`
- `cline-skills/bmad-quick-dev`
- `cline-skills/bmad-quick-dev-new-preview`
- `cline-skills/bmad-quick-spec`
- `cline-skills/bmad-retrospective`
- `cline-skills/bmad-review-adversarial-general`

## Deliverable
Return with:
- the list of files reviewed
- the list of files updated
- every unresolved or ambiguous variable source you found
- confirmation that each assigned family was audited file by file against the rules above
