# workflow

## META

- Goal: Walk every branching path and boundary condition in provided content and report only unhandled edge cases.
- Execute this workflow in order.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
## EXECUTION

<step n="1" goal="Load the review input and determine scope">
  <detail>Halt whenever the input is missing, user input is required, or workflow gating is needed.</detail>
  <branch if="content is empty or cannot be decoded as text">
    <output>Return `[{"location":"N/A","trigger_condition":"Input empty or undecodable","guard_snippet":"Provide valid content to review","potential_consequence":"Review skipped - no analysis performed"}]` and stop.</output>
    <exit />
  </branch>
  <branch if="content is provided" optional="true">
    <action>Read the provided content exactly as given.</action>
    <action>Identify whether the input is a diff, full file, or function.</action>
    <detail>Capture any optional `also_consider` areas and include them in scope.</detail>
  </branch>
</step>

<step n="2" goal="Analyze every reachable edge case within scope">
  <action>Walk every branching path and boundary condition that the provided content exposes.</action>
  <action>Derive edge classes from the content itself rather than from a fixed checklist.</action>
  <detail>Include control flow branches, loops, error paths, early returns, null or empty inputs, off-by-one boundaries, coercion issues, race conditions, timeout gaps, and similar transitions that are directly reachable from the reviewed content.</detail>
  <action>For diffs, inspect only the changed hunks and the boundaries directly reachable from them.</action>
  <action>For full files or functions, treat the entire provided content as the scope and ignore unrelated code unless it is explicitly referenced by the input.</action>
  <action>Collect only unhandled paths as findings and silently discard handled ones.</action>
</step>

<step n="3" goal="Validate completeness before finalizing findings">
  <action>Revisit the edge classes discovered in Step 2 and confirm no additional unhandled paths remain.</action>
  <detail>Check for missing else or default handling, unguarded inputs, incomplete boundary coverage, and any newly surfaced edge classes from the same scope.</detail>
  <action>Add any newly found unhandled paths to the findings list.</action>
</step>

<step n="4" goal="Present findings in the required JSON format">
  <action>Return only a valid JSON array of objects.</action>
  <detail>Each object must contain exactly `location`, `trigger_condition`, `guard_snippet`, and `potential_consequence`.</detail>
  <detail>If no unhandled paths are found, return `[]`.</detail>
  <detail>Keep the review mechanical and exhaustive, and report only unhandled paths.</detail>
</step>

## CHECKPOINT

Halt for missing input, required user confirmation, or workflow gating before proceeding.
