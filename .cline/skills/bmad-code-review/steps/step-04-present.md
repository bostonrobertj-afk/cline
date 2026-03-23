# Step 4: Present

## META

- Goal: present the triaged findings clearly and recommend next actions.
- This is the final phase of the workflow.
- Halt whenever user input, confirmation, or workflow gating is required. Engage in dialogue with the user to ensure they understand your findings and recommendations.
- Do not auto-fix anything in this step.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- Do not attempt to complete checklist items from earlier or later phases while this phase is active.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
- Never try to complete checkpoints using the complete_workflow_item tool. Resolve checkpoints using the workflow-native checkpoint-resolution mechanism.

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
<detail>This step should involve dialogue with the user. Give the user a chance to ask questions about your findings before marking this step as complete.</detail>
  <output>Provide a summary line with the counts for `intent_gap`, `bad_spec`, `patch`, `defer`, and rejected-noise findings.</output>
  <branch if="the review is clean" optional="true">
    <output>State whether no findings were raised at all or whether raised findings were ultimately rejected as noise.</output>
  </branch>
  <branch if="{failed_layers} is non-empty" optional="true">
    <output>Warn that the review may be incomplete because some review layers failed or returned no usable results.</output>
  </branch>
</step>

<step n="4" goal="Offer next-step recommendations">
<detail> If the target of this review was a completed story, ensure that you added the QA findings to the story's document with suggested remediation tasks, and inform the user that the standard procedure is for the user to dispatch a separate dev agent assigned to the bmad-dev-story workflow and have them execute remediation for the story.</detail>
  <branch if="patch findings exist" optional="true">
    <output>Recommend addressing the patch findings in a follow-up implementation pass or by manual fixes.</output>
  </branch>
  <branch if="intent_gap or bad_spec findings exist" optional="true">
    <output>Recommend clarifying intent or amending the spec before continuing implementation.</output>
  </branch>
  <branch if="only defer findings remain" optional="true">
    <output>Explain that no action is required for the current change and that the deferred items can be tracked for future work.</output>
  </branch>
</step>

## CHECKPOINT

If you have completed every numbered step in the workflow, resolve the checkpoint using the workflow-native checkpoint-resolution mechanism, then use the attempt_completion tool to send a final message to the user informing them that this workflow is complete, then HALT and await further instruction.
## ADVISORY

- Keep the final report concise, specific, and evidence-based.
- Preserve the distinction between fix-now issues and deferred or intent-level concerns.
