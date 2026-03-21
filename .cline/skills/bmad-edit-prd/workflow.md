---
main_config: '{project-root}/_bmad/bmm/config.yaml'
---

# bmad edit prd workflow

## META

- Goal: Edit an existing PRD through discovery, review, implementation, and completion phases.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Only the active phase's instructions should be surfaced at a time.
- Reveal the next phase's details only after the current phase is completed.
- If an optional branch is skipped, mark the skipped optional work complete so the workflow can advance cleanly.
- Headings such as `## META`, `## EXECUTION`, `## CHECKPOINT`, and `## ADVISORY` are workflow controls, not PRD content.

## EXECUTION

<step n="1" goal="Load workflow configuration">
  <action>
    Resolve the shared workflow settings from `{main_config}`.
    <detail>
      Resolve `project_name`, `output_folder`, `planning_artifacts`, `user_name`, `communication_language`, `document_output_language`, `user_skill_level`, and `date`.
    </detail>
  </action>
  <output>
    Speak to the user in `{communication_language}` and write any artifact or document content in `{document_output_language}`.
  </output>
  <detail>
    Use the resolved values directly in prompts and guidance instead of asking the model to infer them.
  </detail>
</step>

<step n="2" goal="Start the PRD edit flow">
  <output>Begin with `./steps-e/step-e-01-discovery.md`.</output>
  <handoff path="./steps-e/step-e-01-discovery.md" />
</step>

## CHECKPOINT

Advance only after the active phase completes its required work and any required user confirmation.

## ADVISORY

- This workflow is phase-driven through the files in `./steps-e/`.
- Keep the active step's advisory guidance inside that step file so the prompt can render the current phase cleanly.
- Do not expose future-phase detail until the current phase is complete.
