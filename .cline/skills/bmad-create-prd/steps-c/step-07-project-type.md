## META

- Goal: Capture requirements that are specific to the project's type or delivery model.
- Speak to the user in `{communication_language}`.
- Use the confirmed classification as the driver for this step.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load project-type guidance">
  <action>Load any project-type configuration or reference data relevant to the current classification.</action>
</step>

<step n="2" goal="Run guided project-type discovery">
  <ask>Ask the key questions needed to expose project-type-specific requirements, implementation considerations, and constraints.</ask>
  <detail>Keep this section grounded in the actual project type rather than generic software advice.</detail>
</step>

<step n="3" goal="Document project-type requirements">
  <output>Create PRD-ready content covering overview, technical architecture considerations, and implementation considerations for this project type.</output>
</step>

<step n="4" goal="Review, save, and continue">
  <ask>Present the project-type content to the user for review and refinement.</ask>
  <branch if="the user approves the project-type section" optional="true">
    <action>Save the approved content into the PRD.</action>
    <handoff path="./step-08-scoping.md">Proceed to scoping.</handoff>
  </branch>
</step>

## CHECKPOINT

Wait for the user to approve the project-type section before saving it.

## ADVISORY

- Project-type content should make later architecture and planning work easier, not noisier.
