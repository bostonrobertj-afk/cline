# Editorial Review - Structure

## META
- Purpose: Structural editorial review for document structure and clarity.
- Output: Recommendations only; do not edit the source document in place.
- Scope: Preserve meaning while improving structure, sequencing, density, and presentation.

## EXECUTION
<step n="1" goal="Validate the input and establish review context">
  <action>Check that the provided content contains at least 3 words and that `reader_type`, if supplied, is either `humans` or `llm`.</action>
  <action>Identify the document type, major headings or sections, current word count, and section count.</action>
  <detail>
    - If content is empty or shorter than 3 words, halt with error: "Content too short for substantive review (minimum 3 words required)"
    - If reader_type is invalid, halt with error: "Invalid reader_type. Must be 'humans' or 'llm'"
  </detail>
</step>

<step n="2" goal="Infer the document purpose and review lens">
  <action>Use provided `purpose` and `target_audience` when available; otherwise infer both from the content.</action>
  <output>State the document's purpose in one sentence using the pattern: "This document exists to help [audience] accomplish [goal]".</output>
  <action>Select the most appropriate structure model: Tutorial/Guide, Reference/Database, Explanation, Prompt/Task Definition, or Strategic/Context.</action>
  <action>Note the active `reader_type` and apply the matching principle set for humans or llm readers.</action>
  <detail>
    - If `reader_type = humans`, preserve comprehension aids unless they are clearly wasteful
    - If `reader_type = llm`, optimize for precision, dependency order, and unambiguous terminology
  </detail>
</step>

<step n="3" goal="Analyze structure, density, and flow">
  <action>Use `style_guide` as the final authority for tone, structure, and language when it is provided.</action>
  <action>Map each major section and estimate its word count.</action>
  <action>Check whether each section directly serves the stated purpose.</action>
  <action>Identify true redundancies, scope violations, burying, premature detail, missing scaffolding, and sections that should be cut, merged, moved, or split.</action>
  <action if="reader_type = humans">Evaluate whether summaries, examples, callouts, and whitespace improve comprehension and pacing.</action>
</step>

<step n="4" goal="Prioritize editorial recommendations">
  <action>Compile findings into prioritized recommendations.</action>
  <action>Categorize each recommendation as CUT, MERGE, MOVE, CONDENSE, QUESTION, or PRESERVE.</action>
  <action>For each recommendation, provide a one-sentence rationale and an estimated word impact.</action>
  <action if="a length_target was provided">Assess whether the recommendation set meets the requested reduction target.</action>
  <detail>
    - Flag comprehension trade-offs when a recommendation removes examples, summaries, callouts, or other reader-supporting material
    - Preserve content meaning; only change structure, sequencing, density, and presentation
  </detail>
</step>

<step n="5" goal="Present the review results">
  <output>Present the document summary, the prioritized recommendations, and the estimated total reduction if all recommendations are accepted.</output>
  <output if="no substantive changes are recommended">No substantive changes recommended -- document structure is sound.</output>
  <detail>
    Use this summary shape:

    ```markdown
    ## Document Summary
    - **Purpose:** [inferred or provided purpose]
    - **Audience:** [inferred or provided audience]
    - **Reader type:** [selected reader type]
    - **Structure model:** [selected structure model]
    - **Current length:** [X] words across [Y] sections

    ## Recommendations

    ### 1. [CUT/MERGE/MOVE/CONDENSE/QUESTION/PRESERVE] - [Section or element name]
    **Rationale:** [One sentence explanation]
    **Impact:** ~[X] words
    **Comprehension note:** [If applicable, note impact on reader understanding]

    ## Summary
    - **Total recommendations:** [N]
    - **Estimated reduction:** [X] words ([Y]% of original)
    - **Meets length target:** [Yes/No/No target specified]
    - **Comprehension trade-offs:** [Note any cuts that sacrifice reader engagement for brevity]
    ```
  </detail>
</step>

<step n="6" goal="Close the review cleanly">
  <action>Report completion clearly and stop without making document changes.</action>
</step>

## CHECKPOINT
Workflow progress can advance only after the required outputs, approvals, and routing conditions in this file are satisfied.

## ADVISORY
- This workflow is an editorial analysis pass only.
- Preserve ideas and meaning; change only structure, sequencing, density, and presentation.
- Do not treat the workflow file as source content to be summarized back to the user.
