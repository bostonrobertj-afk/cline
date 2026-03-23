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
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh into the next phase before doing any triage or presentation work.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
- NEVER attempt to complete checkpoints using the complete_workflow_item tool. Checkpoints must be completed using the attempt_completion tool.

## EXECUTION

<step n="1" goal="Launch the review layers">
<detail> Your job is not to perform direct code review. Your job is to dispatch subagents, ensure they perform their assigned review procedures, and collect their findings before moving on to the next phase of this workflow.</detail>
  <action>
    Dispatch a separate subagent for the Blind Hunter review.
    <detail>
      There is no dedicated Blind Hunter workflow, so assign the workflow skill with a prompt line like `Skill: use_skill('bmad-review-adversarial-general')`.
      Prompt the subagent to review `{diff_output}` only.
      Do not give it `{spec_file}`, project files, or project context.
      Tell it:
      - limit your scope to only the files necessary to perform your assigned task. Do not perform broad-reaching file reads.
      - if `{review_input_type} = "diff"`: `Act as a diff-only Blind Hunter reviewer. Stay grounded only in the provided diff. Return concise markdown findings with a short title, the observed issue, and evidence from the diff when available.`
      - if `{review_input_type} = "file-bundle"`: `Act as a file-scoped Blind Hunter reviewer. Stay grounded only in the provided files and story-described scope. Do not go searching for commits or unrelated project files. Return concise markdown findings with a short title, the observed issue, and evidence from the provided files when available.`
    </detail>
  </action>
  <action>
    Dispatch a separate subagent for the Adversarial General review.
    <detail>
      Assign the workflow skill with a prompt line like `Skill: use_skill('bmad-review-adversarial-general')`.
      Prompt the subagent with `{diff_output}` plus any already loaded project context that helps ground the review.
      When `{review_mode} = `full``, also include `{spec_file}` as supporting context, but tell the subagent to stay focused on general adversarial review rather than AC-by-AC auditing.
      Tell it:
      - if `{review_input_type} = "diff"`: `Review this change skeptically. Stay focused on the provided diff and nearby directly relevant context. Return concise markdown findings with titles, evidence, and file locations when available.`
      - if `{review_input_type} = "file-bundle"`: `Review this implemented story skeptically using only the provided file bundle and loaded story/spec context. Do not infer a commit range or search for a different baseline unless the parent prompt explicitly gives one. Return concise markdown findings with titles, evidence, and file locations when available.`
    </detail>
  </action>
  <action>
    Dispatch a separate subagent for the Edge Case Hunter review.
    <detail>
      Assign the workflow skill with a prompt line like `Skill: use_skill('bmad-review-edge-case-hunter')`.
      Prompt the subagent with `{diff_output}` and project read access.
      Tell it:
      - if `{review_input_type} = "diff"`: `Inspect reachable boundary conditions and branching paths in the changed scope only. Return only the JSON array format expected by the edge-case hunter workflow.`
      - if `{review_input_type} = "file-bundle"`: `Inspect reachable boundary conditions and branching paths in the provided files only. Treat the provided file bundle as the full review scope for this story. Return only the JSON array format expected by the edge-case hunter workflow.`
    </detail>
  </action>
  <branch if="{review_mode} = `full`" optional="true">
    <action>
      Dispatch a separate subagent for the Acceptance Auditor review.
      <detail>
        Use a general-purpose subagent if no dedicated Acceptance Auditor workflow exists.
        Do not call `use_skill` unless a dedicated Acceptance Auditor workflow is introduced later.
        Prompt that subagent with `{diff_output}`, `{spec_file}`, and any loaded context docs.
        Tell it:
        - You are an Acceptance Auditor.
        - Review the provided implementation scope against the spec and context docs.
        - Check for acceptance-criteria violations, deviations from spec intent, missing specified behavior, and contradictions between spec constraints and the actual code.
        - If the review input is a file bundle instead of a diff, treat the provided files as the authoritative implementation scope and do not search for old commits unless one was explicitly provided.
        - Return a markdown list where each finding includes a one-line title, the violated AC or constraint, and evidence from the provided review input.
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
        - `review-adversarial-general.md` always
        - `review-edge-case-hunter.md` always
        - `review-acceptance-auditor.md` only when `{review_mode} = `full``
      </detail>
    </action>
    <output>Tell the user to run each fallback prompt in a separate session and paste back the findings before the review continues.</output>
    <ask>Wait for the user to return with pasted findings from the fallback reviewers.</ask>
  </branch>
</step>

<step n="3" goal="Collect the raw findings for triage">
  <detail>
    This step is only for collecting and preserving the raw reviewer outputs.
    Do not normalize, deduplicate, classify, summarize, or present the review findings in this phase.
    Once the findings bundle is collected, mark this item complete and stop so the workflow can advance to triage on a refreshed prompt.
  </detail>
  <action>Collect all findings from the completed review layers.</action>
  <branch if="{failed_layers} is non-empty" optional="true">
    <output>Keep note of which review layers failed so the triage step can warn about incomplete coverage.</output>
  </branch>
</step>

## CHECKPOINT

Halt if fallback prompt files were generated and wait for the user to paste back the review-layer findings before proceeding.
Once you're confident that you have collected all review findings, use the attempt_completion tool to resolve this checkpoint and unlock the next phase.

## ADVISORY

- Keep the Blind Hunter grounded only in the provided review input.
- Keep the Adversarial General layer grounded in the provided review input plus any explicitly loaded project context.
- Keep the Edge Case Hunter focused on reachable edge cases in the provided review scope.
- Only run the Acceptance Auditor when a usable spec context exists.
- Do not attempt `step-03-triage::*` or `step-04-present::*` checklist items while the current phase is still `step-02-review`.

