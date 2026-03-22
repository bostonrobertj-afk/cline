---
# File references (ONLY variables used in this step)
prdFile: '{prd_file_path}'
validationReport: '{validation_report_path}'  # If provided
prdPurpose: '{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-prd/data/prd-purpose.md'
---

# step e 02 review

## META

- Goal: Thoroughly review the existing PRD, analyze validation report findings (if provided), and prepare a detailed change plan before editing.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Attempt Sub-Process Deep Review">
  <action>Extract all findings from validation report</action>
  <action>Map findings to specific PRD sections</action>
  <action>Prioritize by severity: Critical &gt; Warning &gt; Informational</action>
  <action>For each critical issue: identify specific fix needed</action>
  <action>For user's manual edit goals: identify where in PRD to apply</action>
</step>

<step n="2" goal="Build Change Plan">
  <action>Current State: Brief description of what exists</action>
  <action>Issues Identified: [List from validation report or manual analysis]</action>
  <action>Changes Needed: [Specific changes required]</action>
  <action>Priority: [Critical/High/Medium/Low]</action>
  <action>Sections to add (if missing)</action>
  <ask>User Requirements Met: [Which user edit goals address this section]</ask>
  <output>Sections to update (if present but needs work)</output>
</step>

<step n="3" goal="Prepare Change Plan Summary">
  <action>Additions: {count} sections to add</action>
  <action>Updates: {count} sections to update</action>
  <action>Removals: {count} items to remove</action>
  <action>Restructuring: {yes/no} if format conversion needed</action>
  <action>Critical: {count} changes (must fix)</action>
</step>

<step n="4" goal="Present Change Plan to User">
  <action>Critical: {count} items</action>
  <action>High: {count} items</action>
  <action>Medium: {count} items</action>
  <ask>Does this change plan align with what you had in mind?</ask>
  <ask>Any sections I should add/remove/reprioritize?</ask>
  <ask>Any concerns before I proceed with edits?</ask>
</step>

<step n="5" goal="Get User Confirmation">
  <ask>Does this change plan align with what you had in mind?</ask>
  <branch if="the user requests adjustments" optional="true">
    <action>Discuss requested changes.</action>
    <action>Revise change plan accordingly.</action>
    <ask>Any other changes before I proceed?</ask>
  </branch>
  <branch if="the user approves">
    <action>Note: &quot;Change plan approved. Proceeding to edit step.&quot;</action>
    <handoff path="./step-e-03-edit.md">Begin the edit step.</handoff>
  </branch>
</step>

<step n="6" goal="Document Approved Plan">
  <detail>Store the approved changes, priority order, and confirmation state for the edit step.</detail>
</step>

<step n="7" goal="Present MENU OPTIONS (If User Wants Discussion)">
  <action>ALWAYS halt and wait for user input</action>
  <action>Only proceed to edit when user selects 'C'</action>
  <branch if="user selects C">
    <action>Document approval for the edit plan.</action>
    <handoff path="./step-e-03-edit.md">Begin the edit step.</handoff>
  </branch>
  <branch if="user selects A" optional="true">
    <detail>Invoke the bmad-advanced-elicitation skill, then return to the discussion menu.</detail>
  </branch>
  <branch if="user selects P" optional="true">
    <detail>Invoke the bmad-party-mode skill, then return to the discussion menu.</detail>
  </branch>
  <branch if="any other selection" optional="true">
    <detail>Discuss the request, then redisplay the menu.</detail>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Use the approved plan from this step when editing in step-e-03.
