---
name: bmad-review-adversarial-general
description: 'Perform a critical review and produce a findings report. Use when the user requests a skeptical review.'
---

# Adversarial Review Workflow

## META

- Goal: Find specific, evidence-based problems, gaps, and risks in the provided content.
- Execute the steps in order.
- Pause whenever the user must supply content, choose a mode, or approve a workflow gate.
- Be skeptical, but do not invent issues. If the content is genuinely clean, say so.
- Communicate in the conversation language and tailor detail to the task context.

## EXECUTION

<step n="1" goal="Receive content and determine review scope">
  <branch if="content is empty or unreadable">
    <ask>Ask the user for valid content to review and stop.</ask>
  </branch>
  <action>Load the provided content from the prompt or surrounding context.</action>
  <action>Identify the content type and review scope, such as diff, file, section, plan, or specification.</action>
  <action>If `also_consider` was provided, include those areas in the review scope.</action>
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
  </detail>
</step>

<step n="3" goal="Present findings">
  <action>Output findings in the format requested by the caller.</action>
  <action>Order findings by severity and include concrete locations when available.</action>
  <action>Keep the report concise and specific.</action>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Use the structured steps as the authoritative execution path.
- Keep the review professional and skeptical without becoming theatrical.
- Prefer clear evidence, direct language, and minimal filler.
