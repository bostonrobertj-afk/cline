# step 02 design epics

## META

- Goal: Design and get approval for the epic structure that groups requirements by user value.
- Execute this step in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for checklist items and routing; use `<detail>` for supporting guidance.

## EXECUTION

<step n="1" goal="Review the extracted requirements">
  <action>Review the FRs, NFRs, Architecture-derived requirements, and any UX requirements captured in the epics document.</action>
</step>

<step n="2" goal="Explain the epic design principles">
  <action>Keep epics user-value first, cohesive, incremental, and independently valuable.</action>
  <detail>
    Group related FRs into user outcomes, not technical layers. Stories within an epic must not depend on future stories. Foundation work is acceptable only when it directly enables the domain value of that epic.
  </detail>
  <output>Show an example of a good user-value epic and a bad technical-layer epic.</output>
</step>

<step n="3" goal="Design the epic structure collaboratively">
  <action>Propose epic titles, user outcomes, FR coverage, and implementation notes.</action>
  <ask>Which FR numbers does this epic address, and does the grouping match the user journey?</ask>
  <detail>
    Look for natural groupings in the FRs, identify user journeys or workflows, and note any technical or UX considerations that affect how the epic should be delivered.
  </detail>
</step>

<step n="4" goal="Present the epic list for review">
  <action>Summarize the total number of epics, FR coverage per epic, delivered user value, and any natural dependencies.</action>
  <output>Present the draft epic list for user review.</output>
</step>

<step n="5" goal="Create the requirements coverage map">
  <output>Create a coverage map showing how each FR maps to an epic so nothing is missed.</output>
</step>

<step n="6" goal="Refine the proposal with the user">
  <ask>Does this epic structure align with your product vision?</ask>
  <ask>Are all user outcomes properly captured?</ask>
  <ask>Should we adjust any epic groupings?</ask>
  <detail>
    Keep revising the epic structure until the user gives explicit approval.
  </detail>
</step>

<step n="7" goal="Finalize the approved epic structure">
  <action>Replace placeholders in `{planning_artifacts}/epics.md` with the approved epic list and the FR coverage map.</action>
  <action>Ensure every FR is mapped to an epic.</action>
  <output>Re-present the approved epic structure for confirmation.</output>
</step>

<step n="8" goal="Present the continuation menu">
  <output>Offer `[C]` continue after the epic structure is approved.</output>
  <ask>Would you like to continue after approving the epic structure?</ask>
  <handoff path="./step-03-create-stories.md" />
  <detail>
    If the user selects `C`, save the approved epic structure to `{planning_artifacts}/epics.md`, update workflow state, and hand off to `./step-03-create-stories.md`.
    If the user asks questions or adds comments, answer them and redisplay the same menu.
  </detail>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
