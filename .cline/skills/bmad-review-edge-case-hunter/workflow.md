# workflow

## META

- Goal: Walk every branching path and boundary condition in provided content and report only unhandled edge cases.
- Execute this workflow in order.
- Halt whenever the input is missing, user input is required, or workflow gating is needed.
- Use the structured execution tags below as the source of truth.

## EXECUTION

<step n="1" goal="Load the review input and determine scope">
  <action>Read the provided content exactly as given.</action>
  <detail>If the content is empty or cannot be decoded as text, return `[{"location":"N/A","trigger_condition":"Input empty or undecodable","guard_snippet":"Provide valid content to review","potential_consequence":"Review skipped — no analysis performed"}]` and stop.</detail>
  <action>Identify whether the input is a diff, full file, or function.</action>
  <action>Capture any optional `also_consider` areas and include them in scope.</action>
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
</step>

## CHECKPOINT

Halt for missing input, required user confirmation, or workflow gating before proceeding.

## ADVISORY

- Keep the review mechanical and exhaustive.
- Do not editorialize or judge code quality; report only missing handling.
- If the input is a diff, keep findings limited to directly reachable issues introduced or exposed by the changed lines.
- If the input is a full file or function, analyze the entire provided scope only.
- Do not load or rely on broader repository context unless the provided content explicitly points to it.
- If no findings exist, return an empty array rather than an explanation.
