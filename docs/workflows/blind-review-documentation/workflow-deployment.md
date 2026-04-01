# Requirements

## Update code-review workflow deterministic progression
- replace current config tied to adversarial_general and replace with blind_review (blind-review.md workflow)
- Update code-review Step 5 completion accounting so the required review layers are:
  - `blind_review`
  - `edge_case_hunter`
- Remove `adversarial_general` from the code-review deterministic progression path for this workflow family.
- Required runtime seams to update:
  - `TaskState.ts`
    - replace the `codeReview.completedReviewLayers` key union so it tracks `blind_review` and `edge_case_hunter`
  - `deterministicPlaceholderProgression.ts`
    - replace the code-review fallback-prompt layer mapping that currently points `adversarial_general` to `review-adversarial-general.md`
    - make the code-review Step 5 deterministic completion loop require `blind-review.md` and `review-edge-case-hunter.md`
    - preserve the existing completion-source contract of `subagent_report | fallback_prompt`
  - `SubagentToolHandler.ts`
    - replace the current code-review layer detection that maps `review-adversarial-general.md` prompts to `adversarial_general`
    - detect `blind-review.md` prompts and map them to `blind_review`
- Required behavioral outcome:
  - When code-review launches its blind reviewer subagent using `Skill: use_skill('blind-review.md')`, any successful reviewer completion or fallback reviewer prompt artifact must satisfy the `blind_review` layer rather than `adversarial_general`.
  - Code-review Step 5 must no longer wait on `review-adversarial-general.md`.
  - Code-review Step 5 must now wait on `blind-review.md` and `review-edge-case-hunter.md`.
- Fallback artifact requirement:
  - the code-review fallback prompt artifact path previously tied to `review-adversarial-general.md` must resolve to `blind-review.md`
  - the `review-edge-case-hunter.md` fallback artifact path remains unchanged
- Test updates required:
  - update deterministic progression tests that assert code-review fallback prompt layer completion so they expect `blind_review` instead of `adversarial_general`
  - update any subagent handler tests that currently assert `adversarial_general` completion from `review-adversarial-general.md` prompts so they assert `blind_review` completion from `blind-review.md` prompts
  - preserve the existing `edge_case_hunter` assertions
- Scope constraint:
  - this is a code-review orchestration swap only
  - do not reintroduce `review-adversarial-general.md` as a required code-review review layer elsewhere in deterministic progression once `blind-review.md` is substituted

## Update Contextual Tool Matrix
- Add config for blind-review.md to contextualToolMatrix.ts
- Add a dedicated per-step row for `blind-review.md` based on the workflow document:
  - Step 1: `["DOC_READ", "PLACEHOLDER_WRITE"]`
  - Step 2: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE"]`
  - Step 3: `[]`
- Step 1 rationale:
  - The step must inspect the user's provided context and any already-available workflow context to determine whether `diff_output` is already known.
  - The step must persist `diff_output` via `set_workflow_placeholders`.
  - No code execution, web research, subagent coordination, or local shell access is required by the workflow text.
- Step 2 rationale:
  - The step must read `{diff_output}` and inspect only the changed non-Markdown code plus the minimum additional supporting code required to validate findings.
  - Prefer Indxr-first code inspection for supporting-code lookup and symbol/source navigation:
    - `INDXR_DISCOVERY`
    - `INDXR_SOURCE_READ`
    - `INDXR_SYMBOL_GRAPH`
  - Retain `CODE_READ` and `DOC_READ` so the agent can read the diff artifact itself and directly inspect narrowly relevant files/lines when exact raw text evidence is required.
  - The step must create `adversarial-review-findings.md` in `{output_folder}`, so the effective write surface for this matrix row must allow the workflow's required file-creation path.
  - Do not include `LOCAL_EXEC`, `EXTERNAL_RESEARCH`, `PLACEHOLDER_WRITE`, `WORKFLOW_ROUTE`, or `SUBAGENT_COORD`; the workflow does not require them.
- Step 3 rationale:
  - The workflow only requires delivery through `attempt_completion`.
  - No additional contextual bundles are needed because response tools are preserved outside the per-step matrix row.
- Implementation note:
  - The workflow explicitly requires `write_to_file` and explicitly forbids `apply_patch` for Step 2 artifact creation.
  - The current `DOC_WRITE` bundle in `contextualToolMatrix.ts` maps to `apply_patch`, so updating the blind-review row alone is not sufficient if the runtime must strictly enforce the workflow's required `write_to_file` path during Step 2.
  - Before implementation, verify whether the contextual tool-bundle contract should be extended to expose `write_to_file` for this workflow step, or whether an existing bundle already covers the intended file-creation tool path elsewhere in runtime filtering.

# Action Plan

---
instructions:
  - Read this action plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Checkbox-only updates to this action-plan document are allowed as part of step completion tracking.
  - Do not make changes outside the allowed files listed for the current step.
  - If any ambiguity is discovered, or any additional file change appears necessary beyond what is prescribed here, stop and ask the user before proceeding.
  - Do not infer extra cleanup, refactors, renames, or doc updates beyond what is explicitly prescribed here.
---

# Blind Review Deployment Action Plan

This plan implements only the two requirement sections above in this document:

- `## Update code-review workflow deterministic progression`
- `## Update Contextual Tool Matrix`

This plan does not modify workflow documents under `/Users/robertboston/Documents/Cline/Workflows/`.
This plan does not update workflow-form registry overrides or any `.cline` managed-workflow content.

[x] Step 1: Swap the code-review layer contract from `adversarial_general` to `blind_review` in runtime state and subagent-layer detection.
Allowed files: `src/core/task/TaskState.ts`, `src/core/task/tools/handlers/SubagentToolHandler.ts`
In [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L46), keep `CodeReviewLayerCompletionSource` unchanged.
In [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L48), change `completedReviewLayers` from `Partial<Record<"adversarial_general" | "edge_case_hunter", CodeReviewLayerCompletionSource>>` to `Partial<Record<"blind_review" | "edge_case_hunter", CodeReviewLayerCompletionSource>>`.
Do not change `DeterministicPlaceholderWorkflowName`, `AutoCompletedPlaceholderWorkflowStepNotice`, or any non-code-review deterministic-state type in this step.
In [SubagentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SubagentToolHandler.ts#L57), change the return type of `detectCodeReviewLayerFromPrompt(...)` from `"adversarial_general" | "edge_case_hunter" | undefined` to `"blind_review" | "edge_case_hunter" | undefined`.
In that same function at [SubagentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SubagentToolHandler.ts#L58), remove the branch that detects `review-adversarial-general.md` and returns `"adversarial_general"`.
Replace it with a branch that detects `blind-review.md` and returns `"blind_review"`.
Leave the existing `review-edge-case-hunter.md` branch unchanged.
Do not add any alias detection, legacy workflow-name fallback, or `.cline` prompt handling in this step.

[x] Step 2: Update code-review deterministic progression so Step 5 waits on `blind-review.md` and `review-edge-case-hunter.md`.
Allowed files: `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L120), change the `layer` parameter type of `getCodeReviewFallbackPromptPath(...)` from `"adversarial_general" | "edge_case_hunter"` to `"blind_review" | "edge_case_hunter"`.
At [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L124), replace the current filename selection so `"blind_review"` maps to `"blind-review.md"` and `"edge_case_hunter"` continues to map to `"review-edge-case-hunter.md"`.
In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L244), change the Step 5 required-layer loop from `["adversarial_general", "edge_case_hunter"] as const` to `["blind_review", "edge_case_hunter"] as const`.
Do not change the Step 5 completion reason string.
Do not change the write-proof checks, deterministic-state mutation shape, or the meaning of `"fallback_prompt"` in this step.
Do not change the independent evaluator for `review-adversarial-general.md` or the independent evaluator for `blind-review.md`; this step is only the code-review orchestration swap.

[x] Step 3: Update the affected tests and persistence-contract expectations to use `blind_review`.
Allowed files: `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`, `src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
In [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L1134), keep the test title `completes code-review step 5 when both fallback prompt files exist and were written during this task`.
Inside that test:
- replace `adversarialPromptPath = path.join(outputFolder, "review-adversarial-general.md")` at [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L1139) with a variable named `blindReviewPromptPath = path.join(outputFolder, "blind-review.md")`
- update the corresponding file write and write-proof lines to use `blindReviewPromptPath`
- update the expected `completedReviewLayers` object at [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L1163) so it equals `{ blind_review: "fallback_prompt", edge_case_hunter: "fallback_prompt" }`
In the next test at [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L1172), replace the fallback file path currently written to `review-adversarial-general.md` at [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L1188) with `blind-review.md`.
Do not change the existing `review-adversarial-general.md` tests that validate the standalone blind-review-like workflow evaluator earlier in this file.
In [SubagentToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts#L485), keep the surrounding test and setup unchanged.
Inside that test:
- replace `prompt_1: "run review-adversarial-general.md now"` at [SubagentToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts#L490) with `prompt_1: "run blind-review.md now"`
- update the first assertion at [SubagentToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts#L496) so it reads `completedReviewLayers.blind_review === "subagent_report"`
- leave the `edge_case_hunter` assertion unchanged
In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L126), [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L228), [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L576), [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L690), and [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L736), replace every deterministic-state fixture or expectation that currently uses `adversarial_general: "subagent_report"` with `blind_review: "subagent_report"`.
Do not change the `workflowName: "review-adversarial-general.md"` fixtures in the workflow-persistence tests near the bottom of the file; those belong to the standalone reviewer workflow, not the code-review layer contract.

[x] Step 4: Extend `DOC_WRITE` to include `write_to_file` and add the `blind-review.md` contextual tool-matrix row.
Allowed files: `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L18), keep the existing bundle names unchanged.
At [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L32), change `DOC_WRITE` from `[ClineDefaultTool.APPLY_PATCH]` to `[ClineDefaultTool.APPLY_PATCH, ClineDefaultTool.FILE_NEW]`.
Do not introduce a new bundle name.
At [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L343), insert a new row for `"blind-review.md"` immediately after the existing `"review-adversarial-general.md"` row with this exact step mapping:
- `1: ["DOC_READ", "PLACEHOLDER_WRITE"]`
- `2: ["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE"]`
- `3: []`
Leave the existing `"review-adversarial-general.md"` row unchanged.
Do not modify any workflow row other than `"blind-review.md"` in this step.

[x] Step 5: Add focused contextual-tool filter coverage for the expanded `DOC_WRITE` bundle and the new `blind-review.md` row.
Allowed files: `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
In [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L91), keep the existing test title `applies code-review step 2 row and keeps the configured Indxr bundles`.
Within that test:
- add `makeRegisteredTool(ClineDefaultTool.FILE_NEW)` to the `registeredTools` array immediately after `makeRegisteredTool(ClineDefaultTool.APPLY_PATCH)`
- add `ClineDefaultTool.FILE_NEW` to the expected kept-id members list immediately after `ClineDefaultTool.APPLY_PATCH`
Do not change any other assertions in that test.
Immediately after the existing `review-edge-case-hunter` test ending at [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L266), insert a new test named `applies blind-review step 2 row and keeps write_to_file plus the allowed Indxr tools`.
In that new test, build the `registeredTools` array with exactly these tool ids:
- `LIST_FILES`
- `SEARCH`
- `LIST_CODE_DEF`
- `FILE_READ`
- `FILE_READ_RANGE`
- `APPLY_PATCH`
- `FILE_NEW`
- `SET_WORKFLOW_PLACEHOLDERS`
- `BASH`
- `WEB_SEARCH`
- `ASK`
- `SEND_USER_MESSAGE`
- `ATTEMPT`
- `PLAN_MODE`
- `BROWSER`
- `MCP_ACCESS`
- `MCP_DOCS`
- `NEW_TASK`
Call `filterContextualNativeToolSpecs(...)` with `activePlaceholderWorkflowName: "blind-review.md"` and `activePlaceholderWorkflowStepNumber: 2`.
Use `mcpTools` containing exactly:
- `indxr-10mcp0search_relevant`
- `indxr-10mcp0get_file_summary`
- `indxr-10mcp0lookup_symbol`
- `12345670mcp0test_tool`
Assert that the kept built-in ids include exactly the step-2-required read/write ids plus preserved response/browser/access ids:
- `LIST_FILES`
- `SEARCH`
- `LIST_CODE_DEF`
- `FILE_READ`
- `FILE_READ_RANGE`
- `APPLY_PATCH`
- `FILE_NEW`
- `ASK`
- `SEND_USER_MESSAGE`
- `ATTEMPT`
- `BROWSER`
- `MCP_ACCESS`
- `NEW_TASK`
Assert that the kept ids do not include:
- `SET_WORKFLOW_PLACEHOLDERS`
- `BASH`
- `WEB_SEARCH`
- `PLAN_MODE`
Assert that the kept MCP tool names include:
- `indxr-10mcp0search_relevant`
- `indxr-10mcp0get_file_summary`
- `indxr-10mcp0lookup_symbol`
Assert that the kept MCP tool names do not include `12345670mcp0test_tool`.
Do not add an integration-test update in this plan; keep contextual matrix verification focused in this unit suite.

[x] Step 6: Run only the focused verification for the seams touched by this plan, then stop.
Allowed files: none
Run `npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`.
If the test run fails because one of the prescribed blind-review or `blind_review` substitutions was missed, fix only the files listed in Steps 1 through 5 and rerun the same command.
If the test run fails because the `FILE_NEW` addition requires an additional assertion adjustment inside [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts), make only that prescribed test adjustment and rerun the same command.
If the test run fails for any reason that requires touching a file outside the allowed files from Steps 1 through 5, stop and ask the user before proceeding.
After the targeted test command passes, do not make any additional cleanup edits in workflow-form registries, workflow documents, `.cline` managed-workflow content, or non-canonical documentation during this plan.
