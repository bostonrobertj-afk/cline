# Editorial Review - Prose

This workflow reviews prose for communication issues that impede comprehension and returns suggested fixes in a three-column table.

## Meta

- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## STEPS

<step n="1" goal="Validate the input and confirm the review scope.">
  <detail>
    Required input is `content`. Optional inputs are `style_guide` and `reader_type`, with `reader_type` defaulting to `humans`.
    Skip code blocks, frontmatter, and other structural markup when evaluating the text.
  </detail>
  <branch if="content is empty or contains fewer than 3 words">
    <output>HALT with error: "Content too short for editorial review (minimum 3 words required)"</output>
    <exit />
  </branch>
  <branch if="reader_type is invalid">
    <output>HALT with error: "Invalid reader_type. Must be 'humans' or 'llm'"</output>
    <exit />
  </branch>
  <action>Identify the content type and note any code blocks, frontmatter, or structural markup to skip.</action>
</step>

<step n="2" goal="Analyze the style and calibrate the review approach.">
  <action>Analyze the style, tone, and voice of the input text.</action>
  <detail>
    Be precise, professional, and skeptical without becoming warm or cynical.
    Preserve intentional stylistic choices such as informal tone, technical jargon, or rhetorical patterns.
    Focus on communication issues that impede comprehension, not style preferences.
  </detail>
  <branch if="reader_type = llm" optional="true">
    <detail>Prioritize unambiguous references, consistent terminology, explicit structure, and no hedging.</detail>
  </branch>
  <branch if="reader_type = humans" optional="true">
    <detail>Prioritize clarity, flow, readability, and natural progression.</detail>
  </branch>
</step>

<step n="3" goal="Perform the editorial review.">
  <branch if="style_guide is provided" optional="true">
    <detail>
      Consult the style guide now and let it override the generic principles for this review, except for CONTENT IS SACROSANCT.
      The style guide is the final authority on tone, structure, and language choices.
    </detail>
  </branch>
  <action>Review all prose sections while skipping code blocks, frontmatter, and structural markup.</action>
  <action>Identify communication issues that impede comprehension.</action>
  <action>For each issue, determine the smallest fix that achieves clarity.</action>
  <detail>
    Deduplicate repeated issues, merge overlapping fixes, and phrase uncertain changes as a query such as "Consider: [suggestion]?".
    Preserve author voice and do not improve intentional stylistic choices.
    Never challenge the ideas in the text; only clarify how they are expressed.
  </detail>
</step>

<step n="4" goal="Output the review results.">
  <branch if="issues were found" optional="true">
    <output>Return a three-column markdown table with all suggested fixes.</output>
    <detail>Use the columns `Original Text`, `Revised Text`, and `Changes`.</detail>
  </branch>
  <branch if="no issues were found" optional="true">
    <output>No editorial issues identified</output>
  </branch>
</step>


## HALT CONDITIONS

- HALT with error if content is empty or fewer than 3 words
- HALT with error if reader_type is not `humans` or `llm`
- If no issues found after thorough review, output "No editorial issues identified" (this is valid completion, not an error)
