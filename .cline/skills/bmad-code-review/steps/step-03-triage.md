# step 03 triage

## META

- Goal: normalize, deduplicate, classify, and reduce the review findings into a clean actionable result set.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Normalize findings into a common schema">
  <action>
    Normalize the findings from all completed review layers into one shared format.
    <detail>
      Expected inputs:
      - Blind Hunter: markdown list of descriptions
      - Edge Case Hunter: JSON array with `location`, `trigger_condition`, `guard_snippet`, and `potential_consequence`
      - Acceptance Auditor: markdown list with title, AC or constraint reference, and evidence
    </detail>
    <detail>
      Normalize each finding to include:
      - `id`
      - `source`
      - `title`
      - `detail`
      - `location` when available
    </detail>
  </action>
  <action>If a review layer returns an unexpected format, attempt best-effort parsing and note the parsing issue for the user.</action>
</step>

<step n="2" goal="Deduplicate overlapping findings">
  <action>
    Merge findings that describe the same issue into one surviving record.
    <detail>
      Prefer the most specific finding as the base, especially an edge-case finding with a concrete location.
      Append any unique reasoning, detail, or location references from the merged findings into the surviving record.
      Preserve the merged sources in the `source` field.
    </detail>
  </action>
</step>

<step n="3" goal="Classify each finding into one triage bucket">
  <action>
    Classify every remaining finding into exactly one bucket.
    <detail>
      Allowed buckets:
      - `intent_gap`
      - `bad_spec`
      - `patch`
      - `defer`
      - `reject`
    </detail>
    <detail>
      Only allow `intent_gap` and `bad_spec` when `{review_mode}` is `full`.
      If `{review_mode}` is `no-spec` and a finding would otherwise be `intent_gap` or `bad_spec`, reclassify it as `patch` if code-fixable or `defer` if not.
    </detail>
  </action>
</step>

<step n="4" goal="Drop rejected findings and finalize review-completeness status">
  <action>Drop all findings classified as `reject` and record the reject count for the summary.</action>
  <branch if="`{failed_layers}` is non-empty">
    <output>Report which review layers failed before presenting the triage outcome.</output>
    <branch if="zero findings remain after dropping rejects">
      <output>Warn the user that the review may be incomplete because one or more layers failed, rather than declaring a clean review.</output>
    </branch>
  </branch>
  <branch if="zero findings remain after dropping rejects and no layers failed">
    <output>Note that the review is clean.</output>
  </branch>
</step>

## CHECKPOINT

Complete normalization, deduplication, classification, and reject filtering before advancing to presentation.

## ADVISORY

- Be precise and conservative when classifying findings.
- If classification is ambiguous, prefer the more conservative bucket rather than overstating certainty.
