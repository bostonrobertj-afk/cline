# Step 01 - Market Research Initialization

Workflow ID: `bmad-market-research`

## EXECUTION
<step n="1" goal="Confirm the research context">
  <action>Read the discovered `research_topic` and `research_goals` from the workflow context.</action>
  <action>Keep the scope limited to market-research setup and do not begin web research yet.</action>
  <detail>Use the existing topic and goals from the triggering conversation so the user does not have to repeat them.</detail>
</step>

<step n="2" goal="Align on scope before research begins">
  <ask>Confirm that the topic, goals, and intended market-research scope are understood.</ask>
  <detail>Cover the core topic, the research goals, the likely market focus, and any region or segment priorities the user wants to add.</detail>
</step>

<step n="3" goal="Document the initial scope">
  <action>Append a brief initialization summary to `{outputFile}` with the confirmed topic, goals, date, scope focus, and research approach.</action>
  <detail>Keep this section about setup only. Do not add market findings in the initialization phase.</detail>
</step>

<step n="4" goal="Present the continuation gate">
  <output>Summarize the confirmed scope and invite the user to continue.</output>
  <ask>Offer `[C] Continue` to proceed or `[Modify]` to adjust the scope.</ask>
  <branch if="user chooses `C`">
    <action>Update frontmatter `stepsCompleted: [1]`.</action>
    <output>Load `./step-02-customer-behavior.md`.</output>
  </branch>
  <branch if="user chooses `Modify`">
    <action>Capture the requested scope adjustments and update the initialization section.</action>
    <output>Re-present the revised scope for confirmation.</output>
  </branch>
</step>

## CHECKPOINT
Halt for user confirmation before moving to customer analysis.

## ADVISORY
- Keep the first phase focused on understanding and framing the research, not on market findings.
- Preserve the append-only flow into the research document.
- Do not advance until the user explicitly chooses to continue.
