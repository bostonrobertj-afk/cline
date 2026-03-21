---
failed_layers: '' # set at runtime: comma-separated list of layers that failed or returned empty
---

# step 02 review

## META

- Goal: launch the review layers, handle fallbacks cleanly, and collect findings from the completed reviewers.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Launch the review layers with the correct context boundaries">
  <action>
    Launch the Blind Hunter review layer with diff-only context.
    <detail>
      Invoke `bmad-review-adversarial-general` and pass `{diff_output}` only. Do not provide the spec or project context to this layer.
    </detail>
  </action>
  <action>
    Launch the Edge Case Hunter review layer with diff and project read access.
    <detail>
      Invoke `bmad-review-edge-case-hunter` and pass `{diff_output}` with repository read access so it can inspect surrounding implementation details.
    </detail>
  </action>
  <branch if="`{review_mode}` is `full`">
    <action>
      Launch the Acceptance Auditor with diff, spec, and loaded context documents.
      <detail>
        Use this prompt:
        - You are an Acceptance Auditor.
        - Review this diff against the spec and context docs.
        - Check for violations of acceptance criteria, deviations from spec intent, missing implementation of specified behavior, and contradictions between spec constraints and actual code.
        - Output findings as a markdown list.
        - Each finding should include a one-line title, the violated AC or constraint, and evidence from the diff.
      </detail>
    </action>
  </branch>
  <branch if="`{review_mode}` is `no-spec`">
    <output>Acceptance Auditor skipped because no spec file was provided.</output>
  </branch>
</step>

<step n="2" goal="Handle unavailable or failed review layers without blocking the review">
  <action>If any review layer fails, times out, or returns empty results, append the layer name to `{failed_layers}` and continue with the remaining findings.</action>
  <branch if="subagents or review-layer execution are not available">
    <action>
      Generate fallback prompt files in `{implementation_artifacts}` for each active reviewer.
      <detail>
        Generate:
        - `review-blind-hunter.md`
        - `review-edge-case-hunter.md`
        - `review-acceptance-auditor.md` only when `{review_mode}` is `full`
      </detail>
    </action>
    <ask>Tell the user to run each prompt in a separate session and paste back the findings, then halt until those findings are returned.</ask>
  </branch>
</step>

<step n="3" goal="Collect the findings from the completed review layers">
  <action>Collect and preserve the findings returned by every completed review layer so triage can operate on the combined result set.</action>
</step>

## CHECKPOINT

Complete the review-layer execution and collect the available findings before advancing to triage.

## ADVISORY

- The Blind Hunter receives diff only.
- The Edge Case Hunter receives diff plus project read access.
- The Acceptance Auditor receives diff, spec, and loaded context only when `{review_mode}` is `full`.
