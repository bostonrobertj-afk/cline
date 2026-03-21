# step 03 create stories

## META

- Goal: Generate stories for each approved epic using the template structure exactly.
- Execute this step in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for checklist items and routing; use `<detail>` for supporting guidance.

## EXECUTION

<step n="1" goal="Load the approved epic structure">
  <action>Review the approved epic list, the FR coverage map, and the template structure in the epics document.</action>
  <detail>
    Keep FRs, NFRs, Architecture requirements, and UX requirements visible during story creation. If UX-DRs exist, make sure they are covered by one or more stories, either inside existing epics or in a dedicated UX-focused epic.
  </detail>
</step>

<step n="2" goal="Explain the story creation approach">
  <action>Keep each story sized for a single dev agent, tied to a clear user value, and written with specific acceptance criteria.</action>
  <detail>
    Stories must follow the template exactly, avoid forward dependencies, and reference the requirements they fulfill. Create tables or entities only when the story needs them.
  </detail>
  <output>Show a good story example and a bad oversized dependency-heavy story example.</output>
</step>

<step n="3" goal="Process the approved epics sequentially">
  <action>For each epic, define the story title, user story, acceptance criteria, and FR coverage.</action>
  <ask>Does this story capture the requirement correctly, is the scope appropriate for a single dev session, and are the acceptance criteria complete and testable?</ask>
  <detail>
    Use Given/When/Then acceptance criteria. Each story should build only on previous stories, not on future ones.
  </detail>
</step>

<step n="4" goal="Complete each epic before moving on">
  <action>Verify the epic’s FRs are covered, summarize the epic, and count the stories created.</action>
  <output>Present the completed epic summary for user confirmation.</output>
</step>

<step n="5" goal="Repeat until all epics are covered">
  <action>Continue the process for each epic in order until the full approved list is complete.</action>
</step>

<step n="6" goal="Finalize the document structure">
  <action>Ensure the epics document contains the overview, requirements inventory, epic list, epic sections, and FR coverage map.</action>
  <detail>
    Verify the document still matches the template structure exactly and that all requirements are represented in the written stories.
  </detail>
</step>

<step n="7" goal="Present the final continuation menu">
  <output>Offer `[C]` continue after the stories are complete and saved.</output>
  <ask>Would you like to continue after the stories are complete?</ask>
  <handoff path="./step-04-final-validation.md" />
  <detail>
    If the user selects `C`, save the content to `{planning_artifacts}/epics.md`, update workflow state, and hand off to `./step-04-final-validation.md`.
    If the user asks questions or adds comments, answer them and redisplay the same menu.
  </detail>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: `./step-04-final-validation.md`
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
