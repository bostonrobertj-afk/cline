## META

- Goal: Classify the project and gather the foundational context needed for the PRD.
- Speak to the user in `{communication_language}`.
- Use existing document context before asking redundant questions.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Review existing PRD state and reusable context">
  <action>Read the current PRD file and frontmatter before asking discovery questions.</action>
  <action>Identify whether classification data or project context has already been captured.</action>
</step>

<step n="2" goal="Run the project discovery conversation">
  <action>Load any reference data needed to classify project type, domain, and relevant discovery prompts.</action>
  <action>Use already loaded briefs, research, and project context to prefill what can be inferred safely.</action>
  <ask>Guide the user through project discovery to understand product purpose, primary users, domain context, and the classification needed for later PRD steps.</ask>
  <detail>Use collaborative questioning rather than generating assumptions, and avoid asking for information that is already strongly established by the loaded context.</detail>
</step>

<step n="3" goal="Confirm and persist the classification">
  <output>Summarize the proposed classification, the reasoning behind it, and any important assumptions or open questions.</output>
  <ask>Ask the user to confirm or correct the classification before it is saved.</ask>
  <branch if="the user confirms the classification" optional="true">
    <action>Save the confirmed classification results and related metadata to frontmatter.</action>
    <handoff path="./step-02b-vision.md">Proceed to vision refinement.</handoff>
  </branch>
</step>

## CHECKPOINT

Wait for explicit user confirmation of the project classification before saving it and moving forward.

## ADVISORY

- Reuse existing documents aggressively so discovery focuses on gaps rather than repetition.
- Keep the classification concise and actionable because later steps depend on it.
