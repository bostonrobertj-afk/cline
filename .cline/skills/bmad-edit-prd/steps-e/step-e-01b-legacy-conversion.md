---
# File references (ONLY variables used in this step)
prdFile: '{{prd_file_path}}'
prdPurpose: '{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-prd/data/prd-purpose.md'
---

# step e 01b legacy conversion

## META

- Goal: Analyze legacy PRD against BMAD standards, identify gaps, propose conversion strategy, and let user choose how to proceed.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Attempt Sub-Process Assessment">
  <action>Content gaps in each section</action>
  <action>Overall conversion effort: Quick / Moderate / Substantial</action>
  <action>Recommended approach: Full restructuring vs targeted improvements</action>
  <action>Manually check PRD for each BMAD section</action>
  <action>Estimate conversion effort</action>
  <ask>Does PRD have this section? (Executive Summary, Success Criteria, Product Scope, User Journeys, Functional Requirements, Non-Functional Requirements)</ask>
  <ask>If present: Is it complete and well-structured?</ask>
  <ask>If missing: What content exists that could migrate to this section?</ask>
  <output>Effort to create/complete: Minimal / Moderate / Significant</output>
  <output>Core sections present: report the detected number of BMAD core sections out of 6.</output>
  <output>Note what's present and what's missing</output>
</step>

<step n="2" goal="Build Gap Analysis">
  <action>Gap: [what's missing or incomplete]</action>
  <action>Effort to Complete: [Minimal/Moderate/Significant]</action>
  <action>Total Conversion Effort: [Quick/Moderate/Substantial]</action>
  <action>Recommended: [Full restructuring / Targeted improvements]</action>
  <output>Present: [Yes/No/Partial]</output>
  <output>Sections present: report the detected number of BMAD core sections out of 6.</output>
</step>

<step n="3" goal="Present Conversion Assessment">
  <output>Core sections present: report the detected number of BMAD core sections out of 6.</output>
</step>

<step n="4" goal="Present MENU OPTIONS">
  <action>ALWAYS halt and wait for user input</action>
  <action>Only proceed based on user selection</action>
  <branch if="user selects R">
    <action>Note conversion mode as full restructuring.</action>
    <handoff path="./step-e-02-review.md">Begin the deep review step.</handoff>
  </branch>
  <branch if="user selects I" optional="true">
    <action>Note conversion mode as targeted improvements.</action>
    <handoff path="./step-e-02-review.md">Begin the deep review step.</handoff>
  </branch>
  <branch if="user selects E" optional="true">
    <action>Note conversion mode as both restructuring and targeted improvements.</action>
    <handoff path="./step-e-02-review.md">Begin the deep review step.</handoff>
  </branch>
  <branch if="user selects X" optional="true">
    <exit>Display summary and exit.</exit>
  </branch>
</step>

<step n="5" goal="Document Conversion Strategy">
  <detail>Store the selected conversion mode, the user's edit requirements, and the gap analysis for the next step.</detail>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Preserve the assessed conversion mode, user requirements, and gap analysis for the review step.
