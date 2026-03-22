# Step 3: Triage

## META

- Goal: normalize, deduplicate, and classify the review findings.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Be conservative when classifying findings and avoid inventing certainty.
- Use the collected first-pass reviewer outputs as the triage input set unless a review layer clearly failed or returned no usable output.
- Do not launch fresh review subagents during triage just to get cleaner formatting, more detail, or a second opinion.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Normalize findings into a common structure">
  <action>
    Normalize the Blind Hunter, Adversarial General, Edge Case Hunter, and Acceptance Auditor outputs into one common finding format.
    <detail>
      Expected source formats:
      - Blind Hunter: markdown list of descriptions
      - Adversarial General: markdown list of findings with concise evidence
      - Edge Case Hunter: JSON array with `location`, `trigger_condition`, `guard_snippet`, and `potential_consequence`
      - Acceptance Auditor: markdown list with title, AC or constraint reference, and evidence
      Use the findings exactly as returned on the first reviewer pass unless a layer failed or its output is unusable.
    </detail>
  </action>
  <action>
    Convert each parsed finding into a unified structure.
    <detail>
      Include:
      - `id`
      - `source`
      - `title`
      - `detail`
      - `location` when available
      - Use `blind`, `general`, `edge`, and `auditor` as the source labels before any source merging.
    </detail>
  </action>
  <branch if="a review layer returns malformed output" optional="true">
    <output>Note the parsing issue for the user, but keep any best-effort findings that can still be recovered.</output>
  </branch>
  <branch if="a review layer returned no usable output at all" optional="true">
    <output>Note that layer as failed coverage instead of silently launching another reviewer pass.</output>
  </branch>
</step>

<step n="2" goal="Deduplicate overlapping findings">
  <action>
    Merge findings that describe the same underlying issue.
    <detail>
      Prefer the most specific finding as the base, especially one with a concrete location. Preserve unique details and reasoning from the duplicates in the surviving record, and merge the source labels.
    </detail>
  </action>
</step>

<step n="3" goal="Classify each finding into the review buckets">
  <action>
    Classify each finding into exactly one bucket: `intent_gap`, `bad_spec`, `patch`, `defer`, or `reject`.
    <detail>
      - `intent_gap`: the captured intent is incomplete and cannot be resolved from what is available
      - `bad_spec`: the spec should have prevented the issue but is wrong or ambiguous
      - `patch`: the code issue is directly fixable without new human input
      - `defer`: the issue is real but pre-existing or not actionable in the current change
      - `reject`: noise, duplicate noise, false positive, or already handled elsewhere
    </detail>
  </action>
  <branch if="{review_mode} = `no-spec` and a finding would otherwise be `intent_gap` or `bad_spec`" optional="true">
    <action>Reclassify that finding as `patch` if it is code-fixable, otherwise reclassify it as `defer`.</action>
  </branch>
</step>

<step n="4" goal="Drop rejected findings and assess review completeness">
  <action>Drop all findings classified as `reject` and record the reject count for the summary.</action>
  <action>
    Assess completeness from the collected reviewer outputs and any already-known failed layers.
    <detail>
      Do not start a fresh independent code review here.
      Do not dispatch more reviewer subagents to hunt for additional findings during completeness assessment.
    </detail>
  </action>
  <branch if="{failed_layers} is non-empty" optional="true">
    <output>Record which review layers failed so the presentation step can warn that the review may be incomplete.</output>
  </branch>
  <branch if="zero findings remain after rejects are removed and {failed_layers} is empty" optional="true">
    <output>Mark the review as clean.</output>
  </branch>
  <branch if="zero findings remain after rejects are removed and {failed_layers} is non-empty" optional="true">
    <output>Mark the review as inconclusive rather than clean because one or more review layers failed.</output>
  </branch>
</step>

## CHECKPOINT

Complete normalization, deduplication, and classification before moving on to presentation.

## ADVISORY

- Prefer the more conservative classification when a finding sits on a boundary.
- Do not keep `reject` findings in the final presentation set.
