---
# File references (ONLY variables used in this step)
prdPurpose: '{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-prd/data/prd-purpose.md'
---

# Look for most recent validation report in the PRD folder

## META

- Goal: Understand what the user wants to edit in the PRD, detect PRD format/type, check for validation report guidance, and route appropriately.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Load PRD Purpose Standards">
  <action>Internalize this understanding - it will guide improvement recommendations.</action>
  <output>Load and read the complete file at: {prdPurpose} (data/prd-purpose.md) This file defines what makes a great BMAD PRD.</output>
</step>

<step n="2" goal="Discover PRD to Edit">
  <ask>Which PRD would you like to edit? Please provide the path to the PRD file you want to edit.</ask>
</step>

<step n="3" goal="Validate PRD Exists and Load">
  <action>Check if PRD file exists at specified path</action>
  <action>If not found: &quot;I cannot find a PRD at that path. Please check the path and try again.&quot;</action>
  <action>If found: Load the complete PRD file including frontmatter</action>
</step>

<step n="4" goal="Check for Existing Validation Report">
  <branch if="a validation report exists in the PRD folder" optional="true">
    <action>Load the validation report file</action>
    <action>Extract findings, issues, and improvement suggestions</action>
    <action>Note: &quot;Validation report loaded - will use it to guide prioritized improvements&quot;</action>
  </branch>
  <branch if="no validation report exists">
    <action>Proceeding with manual edit discovery</action>
  </branch>
</step>

<step n="5" goal="Ask About Validation Report">
  <ask>Do you have a validation report to guide edits? If so, provide its path or type 'none'.</ask>
  <branch if="a validation report path is provided" optional="true">
    <action>Load the validation report</action>
    <action>Extract findings, severity, improvement suggestions</action>
    <action>Note: &quot;Validation report loaded - will use it to guide prioritized improvements&quot;</action>
  </branch>
  <branch if="none is provided" optional="true">
    <action>Proceeding with manual edit discovery</action>
  </branch>
</step>

<step n="6" goal="Discover Edit Requirements">
  <action>Fix specific issues (information density, implementation leakage, etc.)</action>
  <action>Add missing sections or content</action>
  <action>Improve structure and flow</action>
  <action>Convert to BMAD format (if legacy PRD)</action>
  <action>General improvements</action>
</step>

<step n="7" goal="Detect PRD Format">
  <action>Executive Summary</action>
  <action>Success Criteria</action>
  <action>Product Scope</action>
  <action>User Journeys</action>
  <action>Functional Requirements</action>
  <output>BMAD Standard: 5-6 core sections present</output>
  <output>BMAD Variant: 3-4 core sections present, generally follows BMAD patterns</output>
</step>

<step n="8" goal="Route Based on Format and Context">
  <ask>What are your edit goals? How would you like to proceed?</ask>
  <branch if="validation report provided or PRD is BMAD Standard/Variant">
    <output>Display a confirmation that the edit requirements are understood, name the detected PRD format, note whether a validation report will be used, and summarize the user’s edit goals before proceeding to deep review and analysis.</output>
    <handoff path="./step-e-02-review.md">Begin the deep review step.</handoff>
  </branch>
  <branch if="PRD is Legacy (Non-Standard) and no validation report" optional="true">
    <output>Display that a legacy PRD format was detected and that the document does not follow the BMAD standard structure because only a subset of the core sections are present.</output>
  </branch>
</step>

<step n="9" goal="Present MENU OPTIONS (Legacy PRDs Only)">
  <action>ALWAYS halt and wait for user input</action>
  <action>Only proceed based on user selection</action>
  <branch if="user selects C">
    <handoff path="./step-e-01b-legacy-conversion.md">Convert the legacy PRD to BMAD structure.</handoff>
  </branch>
  <branch if="user selects E" optional="true">
    <output>Display &quot;Proceeding with edits...&quot;</output>
    <handoff path="./step-e-02-review.md">Begin the deep review step.</handoff>
  </branch>
  <branch if="user selects X" optional="true">
    <exit>Display summary and exit.</exit>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
