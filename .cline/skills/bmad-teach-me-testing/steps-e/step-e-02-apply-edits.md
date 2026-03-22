---
name: 'step-e-02-apply-edits'
description: 'Apply approved edits to the teaching workflow'

workflowPath: '../'
---

# Edit Step 2: Apply Edits

## META

- Goal: apply only the edits that were approved in the assessment step.
- Preserve workflow structure and avoid unapproved changes.

## EXECUTION

<step n="1" goal="Review the approved edit plan">
  <output>Restate the approved target files and changes before editing begins.</output>
</step>

<step n="2" goal="Apply each approved edit">
  <action>For each approved file, load the current content, show the proposed change, and apply it only after approval.</action>
  <detail>Keep the file paths, folder structure, and workflow roles intact.</detail>
</step>

<step n="3" goal="Validate the updated workflow">
  <action>Check frontmatter, file references, navigation logic, and step sequencing after the edits are applied.</action>
</step>

<step n="4" goal="Summarize the changes">
  <output>List the modified files, describe the changes made, and confirm that the workflow still hangs together.</output>
</step>

<step n="5" goal="Close edit mode">
  <output>Confirm that edit mode is complete and suggest validation or a workflow run as the next action.</output>
</step>

## CHECKPOINT

Halt for any unapproved change, failed validation, or user rejection.

## ADVISORY

- Show changes before applying them.
- Keep the edits limited to the approved workflow family.
