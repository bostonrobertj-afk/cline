---
main_config: '{project-root}/_bmad/bmm/config.yaml'
project_context: '**/project-context.md'
---

# workflow

## META

- Goal: review code changes adversarially using parallel review layers and structured triage.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Keep the review focused on evidence from the selected diff and any explicitly loaded spec context.
- Details are only shown for the active step. Detail for additional steps will be reviewed once the active step is marked as complete.

## EXECUTION

<step n="1" goal="Load review configuration and context">
  <action>Resolve `{project_name}`, `{planning_artifacts}`, `{implementation_artifacts}`, `{user_name}`, `{communication_language}`, `{document_output_language}`, `{user_skill_level}`, and `{date}` from `{main_config}`.</action>
  <action>Load `{project_context}` if it exists.</action>
  <action>Load `CLAUDE.md` or project memory files if they exist and are relevant.</action>
</step>

<step n="2" goal="Begin the review workflow">
  <handoff path="./steps/step-01-gather-context.md" />
</step>

## CHECKPOINT

Do not advance past the current phase until its required actions, asks, outputs, and review gates are complete.

## ADVISORY

- Only the current step file should be active at a time.
- Keep this workflow read-only unless a later phase explicitly calls for writing an artifact.
