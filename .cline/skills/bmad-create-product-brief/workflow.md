# workflow

## META

- Goal: create comprehensive product briefs through collaborative discovery, drafting, and review.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Load workflow configuration">
  <action>
    Resolve the shared workflow settings used by the product brief.
    <detail>
      Load:
      - `project_name`
      - `output_folder`
      - `planning_artifacts`
      - `user_name`
      - `communication_language`
      - `document_output_language`
      - `user_skill_level`
    </detail>
  </action>
</step>

<step n="2" goal="Start product brief initialization">
  <output>Begin with `./steps/step-01-init.md`.</output>
  <handoff path="./steps/step-01-init.md" />
</step>

## CHECKPOINT

Advance only after the active phase completes its required work, reports updates, and pauses for any required user confirmation.

## ADVISORY

- This workflow is phase-driven through the files in `./steps/`.
- Keep all runtime guidance inside the structured step files.
