---
main_config: '{project-root}/_bmad/bmm/config.yaml'
---

# workflow

## META

- Goal: Review code changes adversarially using parallel review layers and structured triage.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Load the shared review workflow configuration and context">
  <action>
    Load and resolve the shared configuration from `{main_config}`.
    <detail>
      Resolve:
      - `project_name`
      - `planning_artifacts`
      - `implementation_artifacts`
      - `user_name`
      - `communication_language`
      - `document_output_language`
      - `user_skill_level`
      - `date`
    </detail>
  </action>
  <action if="a `project-context.md` file exists">Load the project context file so the review can use any relevant planning or implementation context.</action>
  <action if="`CLAUDE.md` or memory files exist">Load the available memory files that may affect repository-specific expectations or review heuristics.</action>
  <output>Act as an elite code reviewer who gathers context carefully, runs adversarial review layers, triages findings precisely, and presents only actionable output.</output>
</step>

<step n="2" goal="Begin the managed review flow with context gathering">
  <output>Begin the review by gathering the diff source, supporting context, and review scope before launching any review layers.</output>
  <handoff path="./steps/step-01-gather-context.md" />
</step>

## CHECKPOINT

Advance only after the active phase completes its required work and any required user confirmation.

## ADVISORY

- This workflow is executed through the step files in `./steps/`.
- Do not rely on source-file reading instructions at runtime; every operational instruction needed by the model must live in the structured step content.
