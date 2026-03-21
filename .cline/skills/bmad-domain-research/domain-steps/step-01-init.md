# Domain Research Step 1: Scope Confirmation

## META
- Goal: Confirm the research scope before any web research starts.
- Guardrails: Keep this step focused on scope, topic, and goals only.
- Execution note: The user should only see instructions for the current step until it is completed.

## EXECUTION
<step n="1" goal="Resolve step context and operating rules">
  <action>Load the current research file and resolve `{user_name}`, `{communication_language}`, `{document_output_language}`, `{research_topic}`, `{research_goals}`, and `{date}` from config and the caller context.</action>
  <detail>
    - This step is scope confirmation only.
    - Do not start web research yet.
    - The prompt only exposes detail for the current step. Do not depend on later-step detail until this step is marked complete.
    - If a later branch is optional and you do not need it, mark it complete so the next step can be revealed.
    - Blocks that look like markdown, YAML, or checklist text describe artifact structure, not prose to quote back to the user.
  </detail>
</step>

<step n="2" goal="Confirm the research scope and route forward">
  <output>State your understanding of the topic and goals, explain the scope you will use, and ask the user to confirm or refine it.</output>
  <ask>Does this domain research scope and approach align with your goals for {research_topic}?</ask>
  <detail>
    - Use a brief, confident summary of the topic and goals.
    - Cover industry analysis, regulatory requirements, technology trends, competitive landscape, and synthesis at a high level.
    - Keep the tone collaborative and avoid substantive research content for now.
  </detail>
  <branch if="user confirms scope">
    <action>Write the scope-confirmation block to the research file.</action>
    <action>Update frontmatter `stepsCompleted: [1]`.</action>
    <handoff path="./step-02-domain-analysis.md" />
  </branch>
  <branch if="user requests changes">
    <action>Revise the scope summary and ask for confirmation again.</action>
  </branch>
</step>
