## META

- Goal: capture domain-specific constraints, regulations, integrations, and risk mitigations.
- Speak to the user in `{communication_language}`.
- Skip generic filler and focus on domain-specific obligations.

## EXECUTION

<step n="1" goal="Check domain complexity and relevance">
  <action>Determine whether the project domain introduces special constraints, regulations, integrations, or terminology that the PRD must capture.</action>
</step>

<step n="2" goal="Load domain references">
  <action>Load any domain reference materials or previously discovered documents needed for this analysis.</action>
</step>

<step n="3" goal="Explore domain-specific concerns">
  <ask>Guide the user through compliance, technical constraints, integration requirements, and key risk mitigations relevant to the domain.</ask>
</step>

<step n="4" goal="Document domain requirements">
  <output>Create concise PRD-ready domain-specific requirements grouped by the concerns identified in discovery.</output>
</step>

<step n="5" goal="Review, save, and continue">
  <ask>Present the proposed domain requirements to the user for review and completion validation.</ask>
  <action>Save the approved content into the PRD.</action>
  <ask>Present the continuation menu for moving to innovation analysis.</ask>
  <action>If the user chooses to continue, append this step to `stepsCompleted` and load `./step-06-innovation.md`.</action>
</step>

## CHECKPOINT

Wait for the user to confirm the domain-specific requirements before saving them.

## ADVISORY

- If the project domain is simple, keep this section short rather than inventing complexity.

## REFERENCE

- Domain requirements should add only the concerns that materially shape design, delivery, or compliance.
