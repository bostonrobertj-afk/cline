# Step 4: Present

## META

- Goal: present the triaged findings clearly and recommend next actions.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Do not auto-fix anything in this step.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Group the triaged findings for presentation">
  <action>Group the remaining findings by category: `intent_gap`, `bad_spec`, `patch`, and `defer`.</action>
</step>

<step n="2" goal="Present findings in severity-aware category order">
  <branch if="intent_gap findings exist" optional="true">
    <output>
      Present the Intent Gaps section and explain that these findings suggest the captured intent is incomplete and should be clarified before work continues.
      <detail>List each finding with its title and detail.</detail>
    </output>
  </branch>
  <branch if="bad_spec findings exist" optional="true">
    <output>
      Present the Bad Spec section and explain that the spec should likely be amended before implementation continues.
      <detail>List each finding with its title, detail, and suggested spec amendment when one is available.</detail>
    </output>
  </branch>
  <branch if="patch findings exist" optional="true">
    <output>
      Present the Patch section and explain that these are directly fixable code issues.
      <detail>List each finding with its title, detail, and location when available.</detail>
    </output>
  </branch>
  <branch if="defer findings exist" optional="true">
    <output>
      Present the Defer section and explain that these are real issues but are not actionable in the current change.
      <detail>List each finding with its title and detail.</detail>
    </output>
  </branch>
</step>

<step n="3" goal="Summarize the review outcome">
  <output>Provide a summary line with the counts for `intent_gap`, `bad_spec`, `patch`, `defer`, and rejected-noise findings.</output>
  <branch if="the review is clean" optional="true">
    <output>State whether no findings were raised at all or whether raised findings were ultimately rejected as noise.</output>
  </branch>
  <branch if="{failed_layers} is non-empty" optional="true">
    <output>Warn that the review may be incomplete because some review layers failed or returned no usable results.</output>
  </branch>
</step>

<step n="4" goal="Offer next-step recommendations">
  <branch if="patch findings exist" optional="true">
    <output>Recommend addressing the patch findings in a follow-up implementation pass or by manual fixes.</output>
  </branch>
  <branch if="intent_gap or bad_spec findings exist" optional="true">
    <output>Recommend clarifying intent or amending the spec before continuing implementation.</output>
  </branch>
  <branch if="only defer findings remain" optional="true">
    <output>Explain that no action is required for the current change and that the deferred items can be tracked for future work.</output>
  </branch>
  <output>
    Conclude the review after presenting the recommendations unless the user explicitly asked for another workflow or follow-up action in the same request.
    <detail>
      Do not ask a new follow-up question just to keep the workflow open.
      If the user already requested a next action as part of the same task, acknowledge that recommended handoff in the summary.
      Otherwise, finish the review and stop cleanly.
    </detail>
  </output>
</step>

## CHECKPOINT

Present the findings and recommendations, then stop cleanly unless the user explicitly requested another action in the same task.

## ADVISORY

- Keep the final report concise, specific, and evidence-based.
- Preserve the distinction between fix-now issues and deferred or intent-level concerns.
