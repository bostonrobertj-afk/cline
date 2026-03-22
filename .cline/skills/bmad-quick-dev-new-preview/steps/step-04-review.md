---
deferred_work_file: '{implementation_artifacts}/deferred-work.md'
specLoopIteration: 1
---

# Step 4: Review

## META

- Speak in the configured communication language.
- Review sub-agents receive no conversation context.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Move the spec into review and construct the review inputs">
  <action>Update `{spec_file}` status to `in-review` in the frontmatter.</action>
  <branch if="execution_mode is plan-code-review" optional="true">
    <action>Construct `{diff_output}` from `{baseline_commit}` covering tracked and untracked changes.</action>
    <action>Launch the blind hunter, edge case hunter, and acceptance auditor review paths.</action>
  </branch>
  <branch if="execution_mode is one-shot" optional="true">
    <action>Invoke the adversarial review skill with the changed files.</action>
  </branch>
  <detail>
    Deduplicate findings, classify them, and loop back only for intent gaps or bad spec issues. Append defer findings to `{deferred_work_file}`.
  </detail>
</step>
