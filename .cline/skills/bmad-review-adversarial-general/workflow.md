---
name: bmad-review-adversarial-general
description: 'Perform a critical review and produce a findings report. Use when the user requests a skeptical review.'
---

# Adversarial Review Workflow

## META

- Goal: Find specific, evidence-based problems, gaps, and risks in the provided content.
- Execute the steps in order.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Receive content and determine review scope">
  <detail>Pause whenever the user must supply content, choose a mode, or approve a workflow gate.</detail>
  <branch if="content is empty or unreadable">
    <ask>Ask the user for valid content to review and stop.</ask>
    <exit />
  </branch>
  <branch if="content is provided" optional="true">
    <action>Load the provided content from the prompt or surrounding context.</action>
    <action>Identify the content type and review scope, such as diff, file, section, plan, or specification.</action>
    <detail>If `also_consider` was provided, include those areas in the review scope.</detail>
  </branch>
</step>

<step n="2" goal="Perform adversarial analysis">
  <action>Inspect the content for missing requirements, incorrect claims, edge cases, risks, regressions, and maintainability problems.</action>
  <action>Compare stated intent to observable evidence and call out anything unsupported.</action>
  <action>Prioritize findings that are specific, actionable, and grounded in the provided material.</action>
  <detail>
    - Favor real defects over speculative complaints.
    - Do not pad the review with invented problems.
    - If the content is a diff, focus on changed lines and nearby context.
    - If the content is a full file or spec, review the entire provided scope.
    - If the result is genuinely clean, report that honestly.
    - Be skeptical, but do not invent issues.
  </detail>
</step>

<step n="3" goal="Present findings">
  <action>Output findings in the format requested by the caller.</action>
  <action>Order findings by severity and include concrete locations when available.</action>
  <action>Keep the report concise and specific.</action>
  <detail>Communicate in the conversation language and tailor detail to the task context.</detail>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
