---
---

# Step 3: Execute Implementation

**Goal:** Implement all tasks, write tests, follow patterns, handle errors.

**Critical:** Continue through ALL tasks without stopping for milestones.

---

# step 03 execute

## META

- Goal: execute
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Load Context">
  <action>Read files relevant to this task</action>
  <action>Review patterns from project-context or observed code</action>
  <action>Understand dependencies</action>
  <ask>- Read files relevant to this task - Review patterns from project-context or observed code - Understand dependencies</ask>
</step>

<step n="2" goal="Implement">
  <action>Write code following existing patterns</action>
  <action>Handle errors appropriately</action>
  <action>Follow conventions observed in codebase</action>
  <action>Add appropriate comments where non-obvious</action>
  <output>- Write code following existing patterns - Handle errors appropriately - Follow conventions observed in codebase - Add appropriate comments where non-obvious</output>
</step>

<step n="3" goal="Test">
  <action>Write tests if appropriate for the change</action>
  <action>Run existing tests to catch regressions</action>
  <action>Verify the specific AC for this task</action>
  <ask>- Write tests if appropriate for the change - Run existing tests to catch regressions - Verify the specific AC for this task</ask>
  <output>- Write tests if appropriate for the change - Run existing tests to catch regressions - Verify the specific AC for this task</output>
</step>

<step n="4" goal="Mark Complete">
  <action>Check off task: - [x] Task N</action>
  <action>Continue to next task immediately</action>
  <action>3 consecutive failures on same task</action>
  <action>Tests fail and fix is not obvious</action>
  <action>Blocking dependency discovered</action>
  <ask>- Check off task: - [x] Task N - Continue to next task immediately --- ## HALT CONDITIONS HALT and request guidance if: - 3 consecutive failures on same task - Tests fail and fix is not obvious - Blocking dependency discovered - Ambiguity that requires user decision Do NOT halt for: - Minor issues that can be noted and continued - Warnings that don't block functionality - Style preferences (follow existing patterns) --- ## CONTINUOUS EXECUTION Critical: Do not stop between tasks for approval.</ask>
  <ask>- Execute all tasks in sequence - Only halt for blocking issues - Tests failing = fix before continuing - Track all completed work for self-check --- ## NEXT STEP When ALL tasks are complete (or halted on blocker), read fully and follow: ./step-04-self-check.md.</ask>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./step-04-self-check.md

## REFERENCE

<prose>
## AVAILABLE STATE

From previous steps:

- `{baseline_commit}` - Git HEAD at workflow start
- `{execution_mode}` - "tech-spec" or "direct"
- `{tech_spec_path}` - Tech-spec file (if Mode A)
- `{project_context}` - Project patterns (if exists)

From context:

- Mode A: Tasks and AC extracted from tech-spec
- Mode B: Tasks and AC from step-02 mental plan

---

## EXECUTION LOOP

For each task:

### 1. Load Context

- Read files relevant to this task
- Review patterns from project-context or observed code
- Understand dependencies

### 2. Implement

- Write code following existing patterns
- Handle errors appropriately
- Follow conventions observed in codebase
- Add appropriate comments where non-obvious

### 3. Test

- Write tests if appropriate for the change
- Run existing tests to catch regressions
- Verify the specific AC for this task

### 4. Mark Complete

- Check off task: `- [x] Task N`
- Continue to next task immediately

---

## HALT CONDITIONS

**HALT and request guidance if:**

- 3 consecutive failures on same task
- Tests fail and fix is not obvious
- Blocking dependency discovered
- Ambiguity that requires user decision

**Do NOT halt for:**

- Minor issues that can be noted and continued
- Warnings that don't block functionality
- Style preferences (follow existing patterns)

---

## CONTINUOUS EXECUTION

**Critical:** Do not stop between tasks for approval.

- Execute all tasks in sequence
- Only halt for blocking issues
- Tests failing = fix before continuing
- Track all completed work for self-check

---

## NEXT STEP

When ALL tasks are complete (or halted on blocker), read fully and follow: `./step-04-self-check.md`.

---

## SUCCESS METRICS

- All tasks attempted
- Code follows existing patterns
- Error handling appropriate
- Tests written where appropriate
- Tests passing
- No unnecessary halts

## FAILURE MODES

- Stopping for approval between tasks
- Ignoring existing patterns
- Not running tests after changes
- Giving up after first failure
- Not following project-context rules (if exists)
</prose>
