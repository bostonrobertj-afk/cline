---
---

# Step 3: Execute Implementation

## META

- Goal: Implement the requested work, test it, and continue until all tasks are complete.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load context and implement the requested changes">
  <action>Read the files relevant to the task and review the observed patterns and dependencies.</action>
  <action>Implement the requested changes using the codebase's existing conventions.</action>
  <action>Add or update tests when the change warrants them.</action>
  <action>Run the relevant tests and fix failures before moving on.</action>
  <detail>
    Keep the work aligned to the task list or tech-spec, and do not stop for non-blocking milestones.
  </detail>
</step>

<step n="2" goal="Advance to self-check when implementation is complete">
  <output>When the requested work is done, continue with `./step-04-self-check.md`.</output>
</step>
