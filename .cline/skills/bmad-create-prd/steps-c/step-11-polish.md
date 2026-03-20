## META

- Goal: review and polish the PRD for coherence, completeness, and flow.
- Speak to the user in `{communication_language}`.
- Preserve substantive decisions while improving readability and consistency.

## EXECUTION

<step n="1" goal="Load the full PRD context">
  <action>Read the current PRD and any important supporting context before editing.</action>
</step>

<step n="2" goal="Review document quality">
  <action>Inspect the document for gaps, duplication, ordering problems, unclear language, and coherence issues.</action>
</step>

<step n="3" goal="Reconcile brainstorming material when relevant">
  <action>If brainstorming or exploratory inputs exist, ensure useful ideas are captured and noise is excluded.</action>
</step>

<step n="4" goal="Optimize the PRD">
  <action>Improve structure, transitions, wording, and consistency without changing validated decisions arbitrarily.</action>
</step>

<step n="5" goal="Generate the polished version">
  <output>Produce the optimized PRD content and summarize the major quality improvements made.</output>
</step>

<step n="6" goal="Review, save, and continue">
  <ask>Present the polished result to the user for final review before completion.</ask>
  <action>Save the polished PRD.</action>
  <ask>Present the continuation menu for moving to workflow completion.</ask>
  <action>If the user chooses to continue, append this step to `stepsCompleted` and load `./step-12-complete.md`.</action>
</step>

## CHECKPOINT

Wait for the user to approve the polished PRD before moving to completion.

## ADVISORY

- Preserve important information even when tightening language or structure.

## REFERENCE

- Polish improves flow and readiness; it should not reopen core product decisions unless a real issue is discovered.
