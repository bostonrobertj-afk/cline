---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not make changes outside the allowed files listed for the current step.
  - Do not modify runtime code, tests, snapshots, or `/Users/robertboston/Documents/Cline/Workflows/**` in this plan.
  - If any ambiguity is discovered, or if any change is needed outside the allowed files for the current step, stop and ask the user before proceeding.
  - Do not infer additional cleanup, compatibility work, or retrospective refactors beyond what is explicitly prescribed here.
---

# Code Review Story Path Contract Ratification Action Plan

## Scope

This plan formalizes the already-landed `story_path` handler and workflow-form contract for `code-review.md` without changing runtime behavior.

The live runtime already does all of the following:

- `build_review_input` resolves `story_path` from workflow state and exposes no human-input parameters
- the `code-review.md` Step 3 review-input form is a zero-field system-owned resolver that reuses stored workflow state
- `code_review_spec_update` resolves `{story_path}` and returns `story_path_updated` / `story_path_path`

This ratification pass exists because the narrower remediation plan in `story-path-enablement-remediation-action-plan.md` was written as if those contract changes were out of scope, while the live code correctly reflects the earlier broader `story-path-contract-action-plan.md` contract.

This ratification pass must:

- preserve the current runtime as the approved baseline
- align the planning/provenance docs so future agents do not treat the landed `story_path` contract as accidental scope expansion
- clearly mark the obsolete `spec_file` action-plan contract as historical rather than current guidance

This ratification pass must not:

- revert the live `story_path` runtime contract
- introduce any new compatibility alias for `spec_file`
- modify runtime code, tests, or snapshots

## Action Plan

[ ] Step 1: Mark the broader `story_path` contract plan as the authoritative source for the landed handler and form behavior.
Allowed files: `docs/workflow-automation/code-review/story-path-contract-action-plan.md`
In [story-path-contract-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/code-review/story-path-contract-action-plan.md#L15-L35), insert a new `## Ratified Runtime Status` section immediately after the existing end-state bullet list.
That new section must state, in plain prose, all of the following exact points:
- the runtime changes described by this plan have already landed
- `build_review_input`, the Step 3 workflow form, and `code_review_spec_update` now follow the `story_path` contract in live code
- this document is the authoritative planning record for those contract changes
Do not change any completed step text in this file.

[ ] Step 2: Correct the narrower remediation plan so it no longer reads as a reversion boundary for the already-landed handler/form contract.
Allowed files: `docs/workflow-automation/code-review/story-path-enablement-remediation-action-plan.md`
In [story-path-enablement-remediation-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/code-review/story-path-enablement-remediation-action-plan.md#L17-L38), make these exact edits:
- immediately after the paragraph ending with `Step 3 system-owned form path`, add one short paragraph stating that the `build_review_input`, Step 3 workflow-form, and `code_review_spec_update` `story_path` contract changes were already landed by `story-path-contract-action-plan.md` before this remediation pass
- replace the bullet `change the \`build_review_input\` or \`code_review_spec_update\` handler contracts` with `revert or redefine the already-landed \`build_review_input\` / \`code_review_spec_update\` \`story_path\` contract introduced by \`story-path-contract-action-plan.md\``
Do not change any step instructions in this file.

[ ] Step 3: Mark the pre-`story_path` final-documentation action plan as historical so future agents do not reuse its `spec_file` contract.
Allowed files: `docs/workflow-automation/code-review-final-documentation/code-review-spec-update-action-plan.md`
In [code-review-spec-update-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/code-review-final-documentation/code-review-spec-update-action-plan.md#L14-L45), insert a short note block immediately after the paragraph beginning `This plan is limited to the internal runtime tool build.`
That note block must state all of the following exact points:
- this document is historical
- its `{spec_file}`, `spec_file_updated`, and `spec_file_path` contract details were superseded by the later `story_path` contract
- current contract authority lives in `requirements.md` plus the two `story-path-*.md` action plans in `docs/workflow-automation/code-review/`
Do not rewrite the historical step bodies in this file; the purpose of this step is to prevent future misuse, not to retro-edit the full archived plan.

[ ] Step 4: Perform a final provenance-consistency audit.
Allowed files: `docs/workflow-automation/code-review/story-path-contract-action-plan.md`, `docs/workflow-automation/code-review/story-path-enablement-remediation-action-plan.md`, `docs/workflow-automation/code-review-final-documentation/code-review-spec-update-action-plan.md`
Before marking this step complete, verify all of these exact conditions:
- the new ratification language never says or implies that the live runtime should revert to `spec_file`
- `story-path-contract-action-plan.md` is the only plan in this set described as the authoritative handler/form contract record
- `story-path-enablement-remediation-action-plan.md` no longer reads as if the landed handler/form changes were unapproved work to be reversed
- `code-review-spec-update-action-plan.md` is clearly marked historical without changing its archived implementation steps
If any of those checks fail, fix only the mismatch inside the already-allowed files for the relevant earlier step. If any additional file seems necessary, stop and ask the user.
