---
main_config: '{project-root}/_bmad/bmm/config.yaml'
---

# Editorial Review - Prose

## META
- Goal: Review prose for communication issues and return minimal, specific fixes in a three-column table.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Show detail only for the current step. The next step's detail becomes visible after the current step is completed. If an optional branch or step is skipped, mark it complete before advancing so the next step detail can be revealed.

## EXECUTION
<step n="1" goal="Load review context and validate the inputs">
  <action>Load and resolve `{main_config}`.</action>
  <detail>
    Resolve `project_name`, `user_name`, `user_skill_level`, `communication_language`, `document_output_language`, and `date`.
  </detail>
  <action>Resolve the review inputs: `content` is required; `style_guide` is optional; `reader_type` is optional and defaults to `humans`.</action>
  <action>Identify the content type and mark any code blocks, frontmatter, structural markup, or other non-prose regions to skip.</action>
  <branch if="content is empty or contains fewer than 3 words">
    <output>HALT with error: "Content too short for editorial review (minimum 3 words required)"</output>
    <exit />
  </branch>
  <branch if="reader_type is invalid">
    <output>HALT with error: "Invalid reader_type. Must be 'humans' or 'llm'"</output>
    <exit />
  </branch>
  <detail>
    Advisory:
    - Keep all user-facing communication in `{communication_language}`.
    - Use `{user_name}` when addressing the user.
    - Calibrate any explanation you provide to `{user_skill_level}`.
    - Only the current step's detail is visible during execution. The next step's detail appears after this step is completed.
    - If you skip an optional branch or step, mark it complete before advancing so the next step's detail can be revealed.
  </detail>
</step>

<step n="2" goal="Calibrate the review approach">
  <action>Analyze the style, tone, voice, and intentional rhetorical choices in the input.</action>
  <detail>
    Preserve informal tone, technical jargon, and deliberate rhetorical patterns when they are intentional and comprehensible.
  </detail>
  <branch if="style_guide is provided">
    <action>Use the provided style guide as the highest-priority authority for tone, structure, and language choices, while preserving the meaning of the content.</action>
    <detail>
      The style guide overrides the default editorial principles for this run, except for content preservation.
    </detail>
  </branch>
  <action>Calibrate the review approach based on `reader_type`.</action>
  <detail>
    - `llm`: prioritize unambiguous references, consistent terminology, explicit structure, and minimal hedging
    - `humans`: prioritize clarity, flow, readability, and natural progression
  </detail>
</step>

<step n="3" goal="Review prose and collect minimal fixes">
  <action>Review all prose sections only, skipping code blocks, frontmatter, structural markup, tables used as formatting, and other non-prose regions.</action>
  <detail>
    If the input contains format-looking language such as headings, lists, XML tags, tables, fenced code, or templating syntax, treat those as structural or literal formatting unless the wording inside them is the item being edited.
  </detail>
  <action>Identify communication issues that impede comprehension.</action>
  <detail>
    Apply the smallest fix that restores clarity, preserve structure, deduplicate repeated issues, merge overlapping issues, and keep author voice intact.
  </detail>
  <branch if="a fix is uncertain">
    <output>Phrase the suggestion as a query, using "Consider: [suggestion]?" rather than a definitive rewrite.</output>
  </branch>
</step>

<step n="4" goal="Present results and finish">
  <branch if="issues were found">
    <output>Produce a three-column markdown table with columns `Original Text`, `Revised Text`, and `Changes`.</output>
    <detail>Keep the table concise, include all suggested fixes, and group repeated issues into one row when appropriate.</detail>
  </branch>
  <branch if="no issues were found">
    <output>No editorial issues identified</output>
  </branch>
  <output>Use `{document_output_language}` for any supporting explanation that accompanies the result.</output>
  <exit />
</step>
