---
failed_layers: '' # set at runtime: comma-separated list of layers that failed or returned empty
---

# step 02 review

## META

- Goal: run the parallel review layers and collect their findings.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Keep the reviewer roles distinct and preserve the review context boundaries for each layer.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Launch the review layers">
  <action>
    Launch the Blind Hunter review layer with `{diff_output}` only.
    <detail>
      Use `bmad-review-adversarial-general` with no spec and no project access.
    </detail>
  </action>
  <action>
    Launch the Edge Case Hunter review layer with `{diff_output}`.
    <detail>
      Use `bmad-review-edge-case-hunter` with project read access.
    </detail>
  </action>
  <branch if="{review_mode} = `full`" optional="true">
    <action>
      Launch the Acceptance Auditor review layer with `{diff_output}`, `{spec_file}`, and any loaded context docs.
      <detail>
        Prompt the reviewer to check for acceptance-criteria violations, deviations from spec intent, missing specified behavior, and contradictions between spec constraints and the actual code. Its output should be a markdown list where each finding includes a one-line title, the violated AC or constraint, and evidence from the diff.
      </detail>
    </action>
  </branch>
  <branch if="{review_mode} = `no-spec`" optional="true">
    <output>Acceptance Auditor skipped because no spec file was provided.</output>
  </branch>
</step>

<step n="2" goal="Handle review-layer failures and fallback paths">
  <action>Track any review layer that fails, times out, or returns empty results by appending its layer name to `{failed_layers}`.</action>
  <branch if="subagents are available" optional="true">
    <action>Proceed with the completed review layers and keep collecting their findings.</action>
  </branch>
  <branch if="subagents are not available" optional="true">
    <action>
      Generate fallback prompt files in `{implementation_artifacts}` for each active reviewer.
      <detail>
        - `review-blind-hunter.md` always
        - `review-edge-case-hunter.md` always
        - `review-acceptance-auditor.md` only when `{review_mode} = `full``
      </detail>
    </action>
    <output>Tell the user to run each fallback prompt in a separate session and paste back the findings before the review continues.</output>
    <ask>Wait for the user to return with pasted findings from the fallback reviewers.</ask>
  </branch>
</step>

<step n="3" goal="Collect the findings for triage">
  <action>Collect all findings from the completed review layers.</action>
  <branch if="{failed_layers} is non-empty" optional="true">
    <output>Keep note of which review layers failed so the triage step can warn about incomplete coverage.</output>
  </branch>
</step>

## CHECKPOINT

Halt if fallback prompt files were generated and wait for the user to paste back the review-layer findings before proceeding.

## ADVISORY

- Keep the Blind Hunter diff-only.
- Keep the Edge Case Hunter focused on reachable edge cases in the changed scope.
- Only run the Acceptance Auditor when a usable spec context exists.
