# Step 03 - Graceful Exit
Workflow ID: `bmad-party-mode`

## META
- workflow_id: bmad-party-mode

## EXECUTION
<step n="1" goal="Recognize the end of the party session">
  <action>Detect an explicit exit trigger or a user request to end the discussion.</action>
  <action>Confirm the session is concluding naturally if the conversation has tapered off.</action>
</step>

<step n="2" goal="Generate representative farewells">
  <output>Have 2-3 representative agents say goodbye in character and thank the user.</output>
  <detail>Choose agents who reflect the discussion and give the user a memorable wrap-up.</detail>
</step>

<step n="3" goal="Summarize the session and restore control">
  <output>Share a brief summary of the discussion highlights and useful takeaways.</output>
  <action>Mark party mode inactive and clear any temporary selection state.</action>
  <output>Return control to the invoking workflow or finish the session cleanly if none exists.</output>
  <detail>If this workflow was entered from a parent workflow, restore that parent's control flow after the farewell sequence.</detail>
</step>

## CHECKPOINT
Do not leave the exit step until the farewell sequence and state cleanup are complete.

## ADVISORY
- Keep the goodbye sequence brief, upbeat, and characterful.
- Avoid abrupt shutdowns or generic closing text.
