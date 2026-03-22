## META

- Goal: Identify whether the product contains meaningful innovation that the PRD should capture explicitly.
- Speak to the user in `{communication_language}`.
- This step may be skipped if no real innovation needs documenting.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Assess whether innovation analysis is warranted">
  <action>Review the project context and classification for signs of genuine novelty, market differentiation, or unusual implementation patterns.</action>
</step>

<step n="2" goal="Explore innovation only when it is real">
  <branch if="meaningful innovation is present" optional="true">
    <ask>Ask how the product differs from existing approaches, what new patterns it introduces, and what risks or validation needs come with that novelty.</ask>
    <output>Create PRD-ready content covering innovation areas, market context, validation approach, and risk mitigation.</output>
  </branch>
  <branch if="meaningful innovation is not present" optional="true">
    <output>State clearly that this step can be skipped without adding filler content.</output>
  </branch>
</step>

<step n="3" goal="Review, save, and continue">
  <ask>Present the innovation result to the user for approval or skip confirmation.</ask>
  <branch if="the user confirms the result" optional="true">
    <action>Save the approved content when this step produced a section, or record the intentional skip when it did not.</action>
    <handoff path="./step-07-project-type.md">Proceed to project-type requirements.</handoff>
  </branch>
</step>

## CHECKPOINT

Wait for the user to confirm whether this step should produce innovation content or be treated as an intentional skip.

## ADVISORY

- Do not manufacture innovation language for ordinary products.
