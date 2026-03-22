---
# File references (ONLY variables used in this step)
prdFile: '{prd_file_path}'
prdPurpose: '{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-prd/data/prd-purpose.md'
---

# step e 03 edit

## META

- Goal: Apply changes to the PRD following the approved change plan from step e-02, including content updates, structure improvements, and format conversion if needed.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Retrieve Approved Change Plan">
  <action>Approved changes: Section-by-section list</action>
  <action>Priority order: Sequence to apply changes</action>
  <action>User requirements: Edit goals from step e-01</action>
</step>

<step n="2" goal="Attempt Sub-Process Edits (For Complex Changes)">
  <action>Read current PRD section</action>
  <action>Apply specified changes</action>
  <action>Ensure BMAD PRD principles compliance:</action>
  <action>Section to edit: {section_name}</action>
  <action>Current content: {existing content}</action>
  <output>Return updated section content</output>
  <output>Load PRD section, apply changes, save</output>
</step>

<step n="3" goal="Execute Changes Section-by-Section">
  <action>Read the current PRD section content</action>
  <action>Note what exists</action>
  <action>Updates: Modify existing content per plan</action>
  <action>Removals: Remove specified content</action>
  <action>Restructuring: Reformat content to BMAD standard</action>
  <output>Additions: Create new sections with proper content</output>
  <output>Save updated PRD</output>
</step>

<step n="4" goal="Handle Restructuring (If Needed)">
  <action>Executive Summary</action>
  <action>Success Criteria</action>
  <action>Product Scope</action>
  <action>User Journeys</action>
  <action>Domain Requirements (if applicable)</action>
</step>

<step n="5" goal="Update PRD Frontmatter">
  <action>Ensure frontmatter is complete and accurate.</action>
</step>

<step n="6" goal="Final Review of Changes">
  <action>All approved changes applied correctly</action>
  <action>PRD structure is sound</action>
  <action>No unintended modifications</action>
  <action>Frontmatter is accurate</action>
  <action>Fix them now</action>
</step>

<step n="7" goal="Confirm Completion">
  <action>Use in downstream workflows (UX, Architecture)</action>
  <action>Validation (if not yet validated)</action>
</step>

<step n="8" goal="Present MENU OPTIONS">
  <action>ALWAYS halt and wait for user input</action>
  <action>Only proceed based on user selection</action>
  <branch if="user selects A">
    <action>Accept additional requirements and return to the edit step.</action>
  </branch>
  <branch if="user selects V" optional="true">
    <output>Display &quot;Starting validation workflow...&quot;</output>
    <handoff path="./steps-v/step-v-01-discovery.md">Begin validation of the updated PRD.</handoff>
  </branch>
  <branch if="user selects S" optional="true">
    <exit>Present edit summary and exit.</exit>
  </branch>
  <branch if="user selects X" optional="true">
    <exit>Display summary and exit.</exit>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
