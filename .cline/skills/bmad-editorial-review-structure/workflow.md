# Editorial Review - Structure

## META

- Goal: Review document structure and propose substantive changes to improve clarity and flow before copy editing.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## STEPS

<step n="1" goal="Validate the input and classify the document">
  <detail>
    Inputs:
    - `content` is required and may be markdown, plain text, or structured content
    - `style_guide` is optional and overrides the generic guidance below except for CONTENT IS SACROSANCT
    - `purpose`, `target_audience`, and `length_target` are optional
    - `reader_type` defaults to `humans`
  </detail>
  <action>Check whether `content` is empty or contains fewer than 3 words.</action>
  <branch if="content is empty or fewer than 3 words" optional="true">
    <output>Content too short for substantive review (minimum 3 words required).</output>
    <exit />
  </branch>
  <action>Validate `reader_type` as `humans` or `llm`, defaulting to `humans` when omitted.</action>
  <branch if="reader_type is invalid" optional="true">
    <output>Invalid reader_type. Must be 'humans' or 'llm'.</output>
    <exit />
  </branch>
  <action>Identify the document type and structure, including headings, sections, lists, and major organization patterns.</action>
  <action>Count the words and sections in the current document.</action>
</step>

<step n="2" goal="Understand the document purpose, audience, and operating lens">
  <action>Use `purpose` if provided; otherwise infer the purpose from the content.</action>
  <action>Use `target_audience` if provided; otherwise infer the audience from the content.</action>
  <action>Identify the core question the document answers.</action>
  <output>State in one sentence: "This document exists to help [audience] accomplish [goal]".</output>
  <action>Select the most appropriate structural model from the available models based on purpose and audience.</action>
  <detail>
    Structure models:
    - Tutorial/Guide (Linear): prerequisites before action, strict sequence, clear done state
    - Reference/Database: random access, MECE coverage, consistent schema
    - Explanation (Conceptual): abstract to concrete, scaffolding for complex ideas
    - Prompt/Task Definition (Functional): meta-first, separation of concerns, explicit step-by-step execution
    - Strategic/Context (Pyramid): top-down, grouped support, evidence below the headline
  </detail>
  <detail>
    Reader principles:
    - For humans, preserve visual aids, expectation-setting, mental models, warmth, whitespace, summaries, examples, and flow
    - For llm, prioritize precision, direct language, consistent terminology, structured formats, and examples without emotional filler
  </detail>
</step>

<step n="3" goal="Perform the structural analysis">
  <branch if="style_guide is provided" optional="true">
    <action>Consult the style guide and note its key requirements for this review.</action>
    <detail>Style guide requirements override the default structural and reader principles for the rest of the analysis.</detail>
  </branch>
  <action>Map the document structure by listing each major section with its word count.</action>
  <action>Evaluate the structure against the selected model's primary rules.</action>
  <action>For each section, decide whether it directly serves the stated purpose.</action>
  <branch if="reader_type is humans" optional="true">
    <action>Review each comprehension aid, including visuals, summaries, examples, and callouts, for usefulness.</action>
  </branch>
  <action>Identify sections that could be cut, merged, moved, or split.</action>
  <action>Identify true redundancies, scope violations, and buried critical information.</action>
  <detail>
    Core principles to apply:
    - Optimize for the minimum words needed to maintain understanding
    - Put critical information first
    - Consolidate identical information
    - Cut content that belongs in a different document
    - Preserve content meaning; only reorganize or re-express it
  </detail>
</step>

<step n="4" goal="Analyze flow and reader journey">
  <action>Assess whether the sequence matches how readers will use the document.</action>
  <action>Identify premature detail, missing scaffolding, and anti-patterns such as duplicated overviews or unnecessary appendices.</action>
  <branch if="reader_type is humans" optional="true">
    <action>Assess pacing, whitespace, and visual variety for readability and engagement.</action>
  </branch>
  <detail>
    - Reader journeys should feel natural and linear when the document is meant to teach or guide
    - Missing context should be added before dependent detail
    - Repeated overviews that merely restate the body should be merged or removed
  </detail>
</step>

<step n="5" goal="Generate prioritized recommendations">
  <action>Compile all findings into prioritized recommendations.</action>
  <detail>
    Categorize each recommendation as `CUT`, `MERGE`, `MOVE`, `CONDENSE`, `QUESTION`, or `PRESERVE`.
  </detail>
  <action>State the rationale for each recommendation in one sentence.</action>
  <action>Estimate the word impact for each recommendation.</action>
  <action>If `length_target` is provided, assess whether the recommendations meet it.</action>
  <branch if="reader_type is humans and recommendations would cut comprehension aids" optional="true">
    <output>This cut may impact reader comprehension/engagement.</output>
  </branch>
  <detail>
    - `PRESERVE` is for elements that look cuttable but materially help comprehension
    - `QUESTION` is for changes that require author judgment
    - Treat identical duplication as redundant, but do not count summaries or reinforcement as redundancy
  </detail>
</step>

<step n="6" goal="Output the review results">
  <output>Present the document summary, recommendation list, and estimated total reduction.</output>
  <detail>
    Use this markdown shape for the final response:

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

    ### 2. ...

    ## Summary
    - **Total recommendations:** [N]
    - **Estimated reduction:** [X] words ([Y]% of original)
    - **Meets length target:** [Yes/No/No target specified]
    - **Comprehension trade-offs:** [Note any cuts that sacrifice reader engagement for brevity]
    ```
  </detail>
  <branch if="no structural issues are found" optional="true">
    <output>No substantive changes recommended. Document structure is sound.</output>
  </branch>
  <detail>
    If the source is malformed beyond recovery or the workflow cannot proceed, stop with the most relevant error message rather than fabricating recommendations.
  </detail>
</step>

## CHECKPOINT

Stop if the content is empty, the reader type is invalid, or the review cannot proceed because the source is malformed beyond recovery.
