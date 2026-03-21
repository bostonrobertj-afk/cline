
# step 07 project type

## META

- Goal: Capture requirements that are specific to the project’s type or delivery model.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction and handoff.

## EXECUTION

<step n="1" goal="Load project-type guidance">
  <action>Load any project-type configuration or reference data relevant to the current classification.</action>
</step>

<step n="2" goal="Run guided project-type discovery">
  <ask>Ask the key questions needed to expose project-type-specific requirements, implementation considerations, and constraints.</ask>
</step>

<step n="3" goal="Document project-type requirements">
  <action>Capture the requirements and architectural implications that are unique to this project type.</action>
</step>

<step n="4" goal="Generate project-type content">
  <output>Create PRD-ready content covering overview, technical architecture considerations, and implementation considerations for this project type.</output>
</step>

<step n="5" goal="Review, save, and continue">
  <ask>Present the project-type content to the user for review and refinement.</ask>
  <action>Save the approved content into the PRD.</action>
  <ask>Present the continuation menu for moving to scoping.</ask>
  <action>If the user chooses to continue, append this step to `stepsCompleted` and load `./step-08-scoping.md`.</action>
</step>

## CHECKPOINT

Wait for the user to approve the project-type section before saving it.

## ADVISORY
- Keep this section grounded in the actual project type rather than generic software advice.
