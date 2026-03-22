## META

- Goal: Capture domain-specific constraints, regulations, integrations, and risk mitigations.
- Speak to the user in `{communication_language}`.
- Skip generic filler and focus on domain-specific obligations.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Check domain complexity and relevance">
  <action>Determine whether the project domain introduces special constraints, regulations, integrations, or terminology that the PRD must capture.</action>
</step>

<step n="2" goal="Load domain references and explore domain-specific concerns">
  <action>Load any domain reference materials or previously discovered documents needed for this analysis.</action>
  <ask>Guide the user through compliance, technical constraints, integration requirements, and key risk mitigations relevant to the domain.</ask>
</step>

<step n="3" goal="Document domain requirements">
  <branch if="the project domain introduces material constraints" optional="true">
    <output>Create concise PRD-ready domain-specific requirements grouped by the concerns identified in discovery.</output>
  </branch>
  <branch if="the project domain is simple and does not add material constraints" optional="true">
    <output>State that the domain section can remain concise because no additional domain-specific obligations were identified.</output>
  </branch>
</step>

<step n="4" goal="Review, save, and continue">
  <ask>Present the proposed domain requirements to the user for review and completion validation.</ask>
  <branch if="the user confirms the domain section" optional="true">
    <action>Save the approved content into the PRD.</action>
    <handoff path="./step-06-innovation.md">Proceed to innovation analysis.</handoff>
  </branch>
</step>

## CHECKPOINT

Wait for the user to confirm the domain-specific requirements before saving them.

## ADVISORY

- If the project domain is simple, keep this section short rather than inventing complexity.
