# Step 4: Present

## META

- Goal: Present
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Group remaining findings by category">
  <action>Group remaining findings by category.</action>
</step>

<step n="2" goal="Present to the user in this order (include a section only if findings exist in that category):">
  <action>Present to the user in this order (include a section only if findings exist in that category):</action>
  <action>Intent Gaps: &quot;These findings suggest the captured intent is incomplete. Consider clarifying intent before proceeding.&quot;</action>
  <action>List each with title + detail.</action>
  <action>Bad Spec: &quot;These findings suggest the spec should be amended. Consider regenerating or amending the spec with this context:&quot;</action>
  <action>List each with title + detail + suggested spec amendment.</action>
</step>

<step n="3" goal="Summary line: X intent_gap, Y bad_spec, Z patch, W defer findings">
  <action>Summary line: X intent_gap, Y bad_spec, Z patch, W defer findings. R findings rejected as noise.</action>
  <action>R findings rejected as noise.</action>
</step>

<step n="4" goal="If clean review (zero findings across all layers after triage): state that N findings were raised but all were classified as noise, or that no findings were raised at all (as applicable)">
  <action>If clean review (zero findings across all layers after triage): state that N findings were raised but all were classified as noise, or that no findings were raised at all (as applicable).</action>
</step>

<step n="5" goal="Offer the user next steps (recommendations, not automated actions):">
  <action>Offer the user next steps (recommendations, not automated actions):</action>
  <action>If patch findings exist: &quot;These can be addressed in a follow-up implementation pass or manually.&quot;</action>
  <action>If intent_gap or bad_spec findings exist: &quot;Consider running the planning workflow to clarify intent or amend the spec before continuing.&quot;</action>
  <action>If only defer findings remain: &quot;No action needed for this change. Deferred items are noted for future attention.&quot;</action>
</step>

## CHECKPOINT

Complete the current required actions in order before moving to the next workflow phase.

## ADVISORY

- Use the prose block below for the full agent-facing guidance that complements the structured execution steps.

## REFERENCE

<prose>
---
---

# Step 4: Present

## RULES

- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`
- Do NOT auto-fix anything. Present findings and let the user decide next steps.

## INSTRUCTIONS

1. Group remaining findings by category.

2. Present to the user in this order (include a section only if findings exist in that category):

   - **Intent Gaps**: "These findings suggest the captured intent is incomplete. Consider clarifying intent before proceeding."
     - List each with title + detail.

   - **Bad Spec**: "These findings suggest the spec should be amended. Consider regenerating or amending the spec with this context:"
     - List each with title + detail + suggested spec amendment.

   - **Patch**: "These are fixable code issues:"
     - List each with title + detail + location (if available).

   - **Defer**: "Pre-existing issues surfaced by this review (not caused by current changes):"
     - List each with title + detail.

3. Summary line: **X** intent_gap, **Y** bad_spec, **Z** patch, **W** defer findings. **R** findings rejected as noise.

4. If clean review (zero findings across all layers after triage): state that N findings were raised but all were classified as noise, or that no findings were raised at all (as applicable).

5. Offer the user next steps (recommendations, not automated actions):
   - If `patch` findings exist: "These can be addressed in a follow-up implementation pass or manually."
   - If `intent_gap` or `bad_spec` findings exist: "Consider running the planning workflow to clarify intent or amend the spec before continuing."
   - If only `defer` findings remain: "No action needed for this change. Deferred items are noted for future attention."

Workflow complete.
</prose>
