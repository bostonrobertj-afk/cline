---
---

# Step 2: Context Gathering (Direct Mode)

**Goal:** Quickly gather context for direct instructions - files, patterns, dependencies.

**Note:** This step only runs for Mode B (direct instructions). If `{execution_mode}` is "tech-spec", this step was skipped.

---

# step 02 context gathering

## META

- Goal: context gathering
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Identify Files to Modify">
  <action>Search for relevant files using glob/grep</action>
  <action>Identify the specific files that need changes</action>
  <action>Note file locations and purposes</action>
</step>

<step n="2" goal="Find Relevant Patterns">
  <action>Code style and conventions used</action>
  <action>Existing patterns for similar functionality</action>
  <action>Import/export patterns</action>
  <action>Error handling approaches</action>
  <action>Test patterns (if tests exist nearby)</action>
</step>

<step n="3" goal="Note Dependencies">
  <action>External libraries used</action>
  <action>Internal module dependencies</action>
  <action>Configuration files that may need updates</action>
  <action>Related files that might be affected</action>
</step>

<step n="4" goal="Create Mental Plan">
  <action>{task 1}</action>
  <action>{task 2}</action>
  <action>List of tasks to complete</action>
  <action>Acceptance criteria (inferred from user request)</action>
  <action>Order of operations</action>
  <ask>Synthesize gathered context into: - List of tasks to complete - Acceptance criteria (inferred from user request) - Order of operations - Files to touch --- ## PRESENT PLAN Display to user: - y: Proceed to execution - n: Gather more context or clarify - adjust: Modify the plan based on feedback --- ## NEXT STEP DIRECTIVE CRITICAL: When user confirms ready, explicitly state: - y: &quot;NEXT: Read fully and follow: ./step-03-execute.md&quot; - n/adjust: Continue gathering context, then re-present plan --- ## SUCCESS METRICS - Files to modify identified - Relevant patterns documented - Dependencies noted - Mental plan created with tasks and AC - User confirmed readiness to proceed ## FAILURE MODES - Executing this step when Mode A (tech-spec) - Proceeding without identifying files to modify - Not presenting plan for user confirmation - Missing obvious patterns in existing code</ask>
  <output>Synthesize gathered context into: - List of tasks to complete - Acceptance criteria (inferred from user request) - Order of operations - Files to touch --- ## PRESENT PLAN Display to user: - y: Proceed to execution - n: Gather more context or clarify - adjust: Modify the plan based on feedback --- ## NEXT STEP DIRECTIVE CRITICAL: When user confirms ready, explicitly state: - y: &quot;NEXT: Read fully and follow: ./step-03-execute.md&quot; - n/adjust: Continue gathering context, then re-present plan --- ## SUCCESS METRICS - Files to modify identified - Relevant patterns documented - Dependencies noted - Mental plan created with tasks and AC - User confirmed readiness to proceed ## FAILURE MODES - Executing this step when Mode A (tech-spec) - Proceeding without identifying files to modify - Not presenting plan for user confirmation - Missing obvious patterns in existing code</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./step-03-execute.md

## REFERENCE

<prose>
## AVAILABLE STATE

From step-01:

- `{baseline_commit}` - Git HEAD at workflow start
- `{execution_mode}` - Should be "direct"
- `{project_context}` - Loaded if exists

---

## EXECUTION SEQUENCE

### 1. Identify Files to Modify

Based on user's direct instructions:

- Search for relevant files using glob/grep
- Identify the specific files that need changes
- Note file locations and purposes

### 2. Find Relevant Patterns

Examine the identified files and their surroundings:

- Code style and conventions used
- Existing patterns for similar functionality
- Import/export patterns
- Error handling approaches
- Test patterns (if tests exist nearby)

### 3. Note Dependencies

Identify:

- External libraries used
- Internal module dependencies
- Configuration files that may need updates
- Related files that might be affected

### 4. Create Mental Plan

Synthesize gathered context into:

- List of tasks to complete
- Acceptance criteria (inferred from user request)
- Order of operations
- Files to touch

---

## PRESENT PLAN

Display to user:

```
**Context Gathered:**

**Files to modify:**
- {list files}

**Patterns identified:**
- {key patterns}

**Plan:**
1. {task 1}
2. {task 2}
...

**Inferred AC:**
- {acceptance criteria}

Ready to execute? (y/n/adjust)
```

- **y:** Proceed to execution
- **n:** Gather more context or clarify
- **adjust:** Modify the plan based on feedback

---

## NEXT STEP DIRECTIVE

**CRITICAL:** When user confirms ready, explicitly state:

- **y:** "**NEXT:** Read fully and follow: `./step-03-execute.md`"
- **n/adjust:** Continue gathering context, then re-present plan

---

## SUCCESS METRICS

- Files to modify identified
- Relevant patterns documented
- Dependencies noted
- Mental plan created with tasks and AC
- User confirmed readiness to proceed

## FAILURE MODES

- Executing this step when Mode A (tech-spec)
- Proceeding without identifying files to modify
- Not presenting plan for user confirmation
- Missing obvious patterns in existing code
</prose>
