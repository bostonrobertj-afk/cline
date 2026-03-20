---
---

# Step 4: Self-Check

**Goal:** Audit completed work against tasks, tests, AC, and patterns before external review.

---

# step 04 self check

## META

- Goal: self check
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Tasks Complete">
  <action>[ ] All tasks from tech-spec or mental plan marked [x]</action>
  <action>[ ] No tasks skipped without documented reason</action>
  <action>[ ] Any blocked tasks have clear explanation</action>
  <ask>Verify all tasks are marked complete: - [ ] All tasks from tech-spec or mental plan marked [x] - [ ] No tasks skipped without documented reason - [ ] Any blocked tasks have clear explanation</ask>
</step>

<step n="2" goal="Tests Passing">
  <action>[ ] All existing tests still pass</action>
  <action>[ ] New tests written for new functionality</action>
  <action>[ ] No test warnings or skipped tests without reason</action>
</step>

<step n="3" goal="Acceptance Criteria Satisfied">
  <action>[ ] AC is demonstrably met</action>
  <action>[ ] Can explain how implementation satisfies AC</action>
  <action>[ ] Edge cases considered</action>
</step>

<step n="4" goal="Patterns Followed">
  <action>Load {tech_spec_path}</action>
  <action>Mark all tasks as [x] complete</action>
  <action>Update status to &quot;Implementation Complete&quot;</action>
  <action>Save changes</action>
  <action>[ ] Follows existing code patterns in codebase</action>
  <ask>Mark all tasks as [x] complete 3.</ask>
  <ask>--- ## SUCCESS METRICS - All tasks verified complete - All tests passing - All AC satisfied - Patterns followed - Tech-spec updated (if Mode A) - Summary presented ## FAILURE MODES - Claiming tasks complete when they're not - Not running tests before proceeding - Missing AC verification - Ignoring pattern violations - Not updating tech-spec status (Mode A)</ask>
  <output>Save changes --- ## IMPLEMENTATION SUMMARY Present summary to transition to review: --- ## NEXT STEP Proceed immediately to ./step-05-adversarial-review.md.</output>
  <output>--- ## SUCCESS METRICS - All tasks verified complete - All tests passing - All AC satisfied - Patterns followed - Tech-spec updated (if Mode A) - Summary presented ## FAILURE MODES - Claiming tasks complete when they're not - Not running tests before proceeding - Missing AC verification - Ignoring pattern violations - Not updating tech-spec status (Mode A)</output>
</step>

## CHECKPOINT

Complete the current required actions in order before moving to the next workflow phase.

## ADVISORY

- Use the prose block below for the full agent-facing guidance that complements the structured execution steps.

## REFERENCE

<prose>
## AVAILABLE STATE

From previous steps:

- `{baseline_commit}` - Git HEAD at workflow start
- `{execution_mode}` - "tech-spec" or "direct"
- `{tech_spec_path}` - Tech-spec file (if Mode A)
- `{project_context}` - Project patterns (if exists)

---

## SELF-CHECK AUDIT

### 1. Tasks Complete

Verify all tasks are marked complete:

- [ ] All tasks from tech-spec or mental plan marked `[x]`
- [ ] No tasks skipped without documented reason
- [ ] Any blocked tasks have clear explanation

### 2. Tests Passing

Verify test status:

- [ ] All existing tests still pass
- [ ] New tests written for new functionality
- [ ] No test warnings or skipped tests without reason

### 3. Acceptance Criteria Satisfied

For each AC:

- [ ] AC is demonstrably met
- [ ] Can explain how implementation satisfies AC
- [ ] Edge cases considered

### 4. Patterns Followed

Verify code quality:

- [ ] Follows existing code patterns in codebase
- [ ] Follows project-context rules (if exists)
- [ ] Error handling consistent with codebase
- [ ] No obvious code smells introduced

---

## UPDATE TECH-SPEC (Mode A only)

If `{execution_mode}` is "tech-spec":

1. Load `{tech_spec_path}`
2. Mark all tasks as `[x]` complete
3. Update status to "Implementation Complete"
4. Save changes

---

## IMPLEMENTATION SUMMARY

Present summary to transition to review:

```
**Implementation Complete!**

**Summary:** {what was implemented}
**Files Modified:** {list of files}
**Tests:** {test summary - passed/added/etc}
**AC Status:** {all satisfied / issues noted}

Proceeding to adversarial code review...
```

---

## NEXT STEP

Proceed immediately to `./step-05-adversarial-review.md`.

---

## SUCCESS METRICS

- All tasks verified complete
- All tests passing
- All AC satisfied
- Patterns followed
- Tech-spec updated (if Mode A)
- Summary presented

## FAILURE MODES

- Claiming tasks complete when they're not
- Not running tests before proceeding
- Missing AC verification
- Ignoring pattern violations
- Not updating tech-spec status (Mode A)
</prose>
