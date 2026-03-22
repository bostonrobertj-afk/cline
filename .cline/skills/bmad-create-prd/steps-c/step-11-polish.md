## META

- Goal: Review and polish the PRD for coherence, completeness, and flow.
- Speak to the user in `{communication_language}`.
- Preserve substantive decisions while improving readability and consistency.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load the full PRD context">
  <action>Read the current PRD and any important supporting context before editing.</action>
</step>

<step n="2" goal="Review document quality">
  <action>Inspect the document for gaps, duplication, ordering problems, unclear language, and coherence issues.</action>
  <branch if="brainstorming or exploratory inputs exist" optional="true">
    <action>Ensure useful ideas are captured and noise is excluded.</action>
  </branch>
</step>

<step n="3" goal="Optimize the PRD without reopening settled decisions">
  <action>Improve structure, transitions, wording, and consistency without changing validated decisions arbitrarily.</action>
  <output>Produce the optimized PRD content and summarize the major quality improvements made.</output>
</step>

<step n="4" goal="Review, save, and continue">
  <ask>Present the polished result to the user for final review before completion.</ask>
  <branch if="the user approves the polished PRD" optional="true">
    <action>Save the polished PRD.</action>
    <handoff path="./step-12-complete.md">Proceed to workflow completion.</handoff>
  </branch>
</step>

## CHECKPOINT

Wait for the user to approve the polished PRD before moving to completion.

## ADVISORY

- Preserve important information even when tightening language or structure.
