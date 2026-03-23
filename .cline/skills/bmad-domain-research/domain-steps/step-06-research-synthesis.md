## META

- Progress: Step 6 of 6
- Goal: synthesize the completed domain research into the final document, present the summary, and wait for explicit completion confirmation.
- Speak in `{communication_language}`.
- Verify any final synthesis claims that still need current-source confirmation before finalizing.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Reconfirm the research basis and fill any final source gaps">
  <action>Review the completed research document and the findings written in steps 2 through 5.</action>
  <action>Check whether any major synthesis claim still needs fresh source verification before finalizing the document.</action>
  <branch if="a synthesis claim needs updated verification" optional="true">
    <action>Run targeted web searches to verify the current fact before using it in the final synthesis.</action>
  </branch>
</step>

<step n="2" goal="Assemble the final research structure">
  <action>Organize the finished document into a coherent final flow.</action>
  <detail>
    The final document should include a compelling title, an executive summary, a table of contents when appropriate, integrated analysis sections, strategic recommendations, and methodology or source notes where needed.
  </detail>
</step>

<step n="3" goal="Write the final synthesis and recommendations">
  <action>Write or revise the final synthesis sections in the research document.</action>
  <detail>
    Connect the major findings across industry, competition, regulation, and technology.
    Surface the most important strategic implications, opportunities, risks, and uncertainty.
  </detail>
  <branch if="current sources disagree on a major conclusion" optional="true">
    <output>State the disagreement clearly in the document instead of smoothing it over.</output>
  </branch>
</step>

<step n="4" goal="Present the final research summary">
  <output>Summarize the most important domain conclusions, strategic implications, and recommended next actions for `{{research_topic}}`.</output>
</step>

<step n="5" goal="Handle completion confirmation">
  <ask>Ask the user to choose `[C] Complete` to finalize the domain research workflow or provide final corrections first.</ask>
  <branch if="the user provides final corrections" optional="true">
    <action>Apply corrections that materially improve accuracy, clarity, or completeness, then re-present the summary.</action>
  </branch>
  <branch if="the user selects `[C] Complete`" optional="true">
    <action>Update frontmatter so `stepsCompleted` includes steps 1 through 6 and mark the workflow complete.</action>
    <exit />
  </branch>
</step>

## CHECKPOINT

After ensuring that all task list items are complete (one-by-one, in order, using the complete_workflow_item tool),
Use the attempt_completion tool to send a final message to the user informing them that this workflow is complete, then HALT and await further instruction.
## ADVISORY

- Keep the final document in `{document_output_language}`.
- Preserve exact source references for downstream citation and auditing.
- Prefer synthesis over repetition.
