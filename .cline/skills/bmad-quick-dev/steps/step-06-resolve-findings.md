---
---

# Step 6: Resolve Findings

**Goal:** Handle adversarial review findings interactively, apply fixes, finalize tech-spec.

---

# step 06 resolve findings

## META

- Goal: resolve findings
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Present the finding with context">
  <action>Present the finding with context</action>
</step>

<step n="2" goal="Ask: fix now / skip / discuss">
  <ask>Ask: fix now / skip / discuss</ask>
</step>

<step n="3" goal="If fix: Apply the fix immediately">
  <action>If fix: Apply the fix immediately</action>
</step>

<step n="4" goal="If skip: Note as acknowledged, continue">
  <action>If skip: Note as acknowledged, continue</action>
</step>

<step n="5" goal="If discuss: Provide more context, re-ask">
  <ask>If discuss: Provide more context, re-ask</ask>
</step>

<step n="6" goal="Move to next finding">
  <action>Move to next finding</action>
  <action>---</action>
</step>

<step n="7" goal="Filter findings to only those classified as &quot;real&quot;">
  <action>Filter findings to only those classified as &quot;real&quot;</action>
</step>

<step n="8" goal="Apply fixes for each real finding">
  <action>Apply fixes for each real finding</action>
</step>

<step n="9" goal="Report what was fixed:">
  <action>Report what was fixed:</action>
  <action>F1: {description of fix}</action>
  <action>F3: {description of fix}</action>
</step>

<step n="10" goal="Acknowledge all findings were reviewed">
  <action>Acknowledge all findings were reviewed</action>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Use the prose block below for the full agent-facing guidance that complements the structured execution steps.

## REFERENCE

<prose>
## AVAILABLE STATE

From previous steps:

- `{baseline_commit}` - Git HEAD at workflow start
- `{execution_mode}` - "tech-spec" or "direct"
- `{tech_spec_path}` - Tech-spec file (if Mode A)
- Findings table from step-05

---

## RESOLUTION OPTIONS

Present: "How would you like to handle these findings?"

Display:

**[W] Walk through** - Discuss each finding individually
**[F] Fix automatically** - Automatically fix issues classified as "real"
**[S] Skip** - Acknowledge and proceed to commit

### Menu Handling Logic:

- IF W: Execute WALK THROUGH section below
- IF F: Execute FIX AUTOMATICALLY section below
- IF S: Execute SKIP section below

### EXECUTION RULES:

- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed when user makes a selection

---

## WALK THROUGH [W]

For each finding in order:

1. Present the finding with context
2. Ask: **fix now / skip / discuss**
3. If fix: Apply the fix immediately
4. If skip: Note as acknowledged, continue
5. If discuss: Provide more context, re-ask
6. Move to next finding

After all findings processed, summarize what was fixed/skipped.

---

## FIX AUTOMATICALLY [F]

1. Filter findings to only those classified as "real"
2. Apply fixes for each real finding
3. Report what was fixed:

```
**Auto-fix Applied:**
- F1: {description of fix}
- F3: {description of fix}
...

Skipped (noise/uncertain): F2, F4
```

---

## SKIP [S]

1. Acknowledge all findings were reviewed
2. Note that user chose to proceed without fixes
3. Continue to completion

---

## UPDATE TECH-SPEC (Mode A only)

If `{execution_mode}` is "tech-spec":

1. Load `{tech_spec_path}`
2. Update status to "Completed"
3. Add review notes:
   ```
   ## Review Notes
   - Adversarial review completed
   - Findings: {count} total, {fixed} fixed, {skipped} skipped
   - Resolution approach: {walk-through/auto-fix/skip}
   ```
4. Save changes

---

## COMPLETION OUTPUT

```
**Review complete. Ready to commit.**

**Implementation Summary:**
- {what was implemented}
- Files modified: {count}
- Tests: {status}
- Review findings: {X} addressed, {Y} skipped

{Explain what was implemented based on user_skill_level}
```

---

## WORKFLOW COMPLETE

This is the final step. The Quick Dev workflow is now complete.

User can:

- Commit changes
- Run additional tests
- Start new Quick Dev session

---

## SUCCESS METRICS

- User presented with resolution options
- Chosen approach executed correctly
- Fixes applied cleanly (if applicable)
- Tech-spec updated with final status (Mode A)
- Completion summary provided
- User understands what was implemented

## FAILURE MODES

- Not presenting resolution options
- Auto-fixing "noise" or "uncertain" findings
- Not updating tech-spec after resolution (Mode A)
- No completion summary
- Leaving user unclear on next steps
</prose>
