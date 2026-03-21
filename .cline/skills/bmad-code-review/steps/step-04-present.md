# step 04 present

## META

- Goal: present the triaged review findings clearly, summarize the outcome, and recommend next steps without auto-fixing anything.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Group the remaining findings by category">
  <action>Group the remaining findings into their final presentation categories before presenting them to the user.</action>
</step>

<step n="2" goal="Present findings in the required category order">
  <output>
    Present findings in this order, including a section only when findings exist in that category.
    <detail>
      Order:
      - Intent Gaps
      - Bad Spec
      - Patch
      - Defer
    </detail>
    <detail>
      Presentation guidance:
      - Intent Gaps: explain that the captured intent appears incomplete and list each finding with title and detail
      - Bad Spec: explain that the spec should be amended and list each finding with title, detail, and suggested spec amendment
      - Patch: present the fixable code issues with title, detail, and location when available
      - Defer: present pre-existing issues surfaced by the review that were not caused by the current change
    </detail>
  </output>
</step>

<step n="3" goal="Summarize the review outcome and handle clean-review cases">
  <output>Present a summary line showing the count of `intent_gap`, `bad_spec`, `patch`, and `defer` findings, plus the number of rejected noise findings.</output>
  <branch if="zero findings remain after triage">
    <output>State either that some findings were raised but all were classified as noise, or that no findings were raised at all, whichever is accurate.</output>
  </branch>
</step>

<step n="4" goal="Offer next-step recommendations without taking automated action">
  <output>
    Recommend next steps based on the remaining finding categories.
    <detail>
      Recommend:
      - for `patch` findings: address them in a follow-up implementation pass or manually
      - for `intent_gap` or `bad_spec` findings: clarify intent or amend the spec before continuing
      - for `defer` findings only: no action is needed for the current change, but the deferred items should be noted for future attention
    </detail>
  </output>
</step>

## CHECKPOINT

Complete the final presentation and recommendations before ending the workflow.

## ADVISORY

- Do not auto-fix anything in this phase.
- Present findings crisply and let the user decide the next action.
