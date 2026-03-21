# step 02 discovery

## META

- Goal: Classify the project and gather the foundational context needed for the PRD.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction and handoff.

## EXECUTION

<step n="1" goal="Check document state and existing classification">
  <action>Read the current PRD file and its frontmatter before asking discovery questions.</action>
  <action>Identify whether classification data or project context has already been captured.</action>
</step>

<step n="2" goal="Load classification references">
  <action>Load any workflow reference data needed to classify project type, domain, and relevant discovery prompts.</action>
  <action>Use already loaded briefs, research, and project context to prefill what can be inferred safely.</action>
</step>

<step n="3" goal="Run the discovery conversation">
  <ask>Guide the user through project discovery to understand product purpose, primary users, domain context, and the project classification needed for later PRD steps.</ask>
  <action>Use collaborative questioning rather than generating assumptions.</action>
</step>

<step n="4" goal="Confirm the project classification">
  <output>Summarize the proposed classification, the reasoning behind it, and any important assumptions or open questions.</output>
  <ask>Ask the user to confirm or correct the classification before it is saved.</ask>
</step>

<step n="5" goal="Persist discovery results and offer continuation">
  <action>Save confirmed classification results and related metadata to frontmatter.</action>
  <ask>Present the next-step menu so the user can continue to the next PRD phase, revisit discovery, or ask questions.</ask>
  <action>If the user chooses to continue, append this step to `stepsCompleted` and load `./step-02b-vision.md`.</action>
</step>

## CHECKPOINT

Wait for explicit user confirmation of the project classification before saving it and moving forward.

## ADVISORY
- Reuse existing documents aggressively so discovery focuses on gaps rather than repetition.
- Keep the classification concise and actionable because later steps depend on it.
