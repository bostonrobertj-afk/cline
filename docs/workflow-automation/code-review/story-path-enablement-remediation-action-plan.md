---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not make changes outside the allowed files listed for the current step.
  - Do not edit `/Users/robertboston/Documents/Cline/Workflows/code-review.md` in this plan; the user has already updated the workflow source separately.
  - If any ambiguity is discovered, or if any change is needed outside the allowed files for the current step, stop and ask the user before proceeding.
  - Do not infer additional cleanup, compatibility shims, or unrelated refactors beyond what is explicitly prescribed here.
---

# Code Review Story Path Enablement Remediation Action Plan

## Scope

This plan closes the remaining end-to-end enablement gap after the initial `story_path` contract buildout for `code-review.md`.

The live runtime gap to close is:

- `code-review.md` Step 1 now requires `{story_path}` in the workflow source
- `build_review_input` and `code_review_spec_update` already resolve `{story_path}`
- deterministic progression still auto-completes `code-review.md` Step 1 from `{spec_file}`
- focused runtime coverage does not yet prove that slash-command workflow start stores `story_path` and carries it forward into the Step 3 system-owned form path

This remediation pass must:

- make `code-review.md` Step 1 deterministic progression match the `write-remediation-story.md` Step 1 style exactly
- update focused runtime tests to the `story_path` contract
- add one end-to-end pre-turn chaining test proving slash-command workflow start stores `story_path` and carries it through to the Step 3 review-input form opening
- fix the remaining canonical doc drift in the code-review completion requirements

This remediation pass must not:

- edit the workflow source file
- change the `build_review_input` or `code_review_spec_update` handler contracts
- change workflow-form resolver ids or trigger wiring
- add `spec_file` fallback aliases

## Action Plan

[x] Step 1: Update deterministic progression so `code-review.md` Step 1 resolves from `story_path` and verifies the file exists on disk.
Allowed files: `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L227-L236), replace the entire `case 1` branch inside `evaluateCodeReviewStep(...)` with the same contract shape already used by `evaluateWriteRemediationStoryStep(...)` Step 1:
- read `const storyPath = placeholders.story_path?.trim()`
- if `storyPath` is missing or blank, return `{ completed: false }`
- call `await fs.access(storyPath)` inside a `try` / `catch`
- on success return `{ completed: true, reason: "story_path points to an existing story file." }`
- on failure return `{ completed: false }`
Do not resolve `storyPath` against workflow `cwd`, `project_root`, or any other base path in this step. Match the existing `write-remediation-story.md` Step 1 style exactly.
Do not leave any `spec_file` fallback inside the `code-review.md` evaluator branch.
Do not modify `code-review.md` Steps 2 through 7 in this step.

[x] Step 2: Update deterministic progression and focus-chain notice coverage to the new Step 1 contract.
Allowed files: `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`, `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
In [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L1049-L1071), replace the existing `spec_file` Step 1 test with a story-file existence test:
- rename the test to `completes code-review step 1 when story_path points to an existing story file`
- create a temp directory and `storyPath` file path
- set `placeholderValues: { story_path: storyPath }`
- create the file on disk before running progression
- keep the checklist assertion shape the same
- change the reason assertion to the exact string `story_path points to an existing story file.`
Immediately after that rewritten success test, add a new test named exactly `does not complete code-review step 1 when story_path is missing`:
- build a `code-review.md` Step 1 fixture with no `placeholderValues.story_path`
- run deterministic progression
- assert the checklist remains unresolved
- assert `taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices` is `[]`
Do not change any `code-review.md` Step 2 through Step 7 tests in this file.
In [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L194-L206), update the pending auto-complete notice fixture and prompt assertion:
- change `reason: "spec_file is present."` to `reason: "story_path points to an existing story file."`
- change the rendered prompt assertion from `- Step 1: Gather Context — spec_file is present.` to `- Step 1: Gather Context — story_path points to an existing story file.`
Do not change the checklist label or any other assertion in that test.

[x] Step 3: Replace the outdated slash-command workflow-start chaining test with an end-to-end `story_path` carry-through proof for the live code-review path.
Allowed files: `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1680-L1813), replace the entire test currently named `chains slash-command workflow-start success into the code-review Step 2 diff form before returning control` with this exact scenario:
- rename the test to `chains slash-command workflow-start story_path success through code-review Step 2 and opens the Step 3 review-input form with story_path preserved`
- keep `workflowName: "code-review.md"` throughout
- create three sessions in order:
  - `workflowStartSession` with resolver id `placeholder_workflow_start_set_workflow_placeholders`
  - `stepTwoSession` with resolver id `code_review_step_3_diff_source`
  - `stepThreeSession` with resolver id `code_review_step_3_review_input`
- in `workflowStartSession.values`, store `story_path: { rawValue: "docs/story.md" }`
- in `workflowStartSession.context.workflowStartRequirements`, set:
  - `requiredFieldKeys: ["story_path"]`
  - `optionalFieldKeys: ["review_target"]`
- change the remote workflow fixture so Step 1 contains:
  - `Required: {story_path}`
  - `Optional: {review_target}`
- keep Step 2 and Step 3 headings aligned to the live workflow shape
- create a temp directory-local output folder path and initialize `taskState.activePlaceholderWorkflowStableValues` with:
  - `output_folder: path.join(tempDir, "workflow-output")`
  - `review_input: path.join(tempDir, "workflow-output", "review-input.md")`
- stub `workflowFormRuntime.createSession` with three returns in order: start, step 2, step 3
- in `renderWorkflowFormMessage`:
  - on render count `1`, queue `invoke_tool` for `set_workflow_placeholders` with `toolInput: { values: { story_path: "docs/story.md" } }` and matching JSON `toolParams`
  - on render count `3`, queue `invoke_tool` for `build_review_diff_output` with the same commit-source payload already used by the old test
  - on render count `5`, queue `fallback_to_agent` for `stepThreeSession`
- in `executeWorkflowFormToolAndSync`, branch by call order:
  - on the first call, set `taskState.activePlaceholderWorkflowValues = { story_path: "docs/story.md" }` and move the checklist to Step 1 complete / Step 2 incomplete / Step 3 incomplete
  - on the second call, set `taskState.activePlaceholderWorkflowValues = { story_path: "docs/story.md", diff_output: path.join(tempDir, "workflow-output", "review-input.diff") }` and move the checklist to Step 1 complete / Step 2 complete / Step 3 incomplete
  - return `{ succeeded: true }` from both calls
- after `maybeResolveWorkflowFormBeforeApiTurn.call(...)`, assert:
  - `createSession.callCount === 3`
  - the first created resolver id is `placeholder_workflow_start_set_workflow_placeholders`
  - the second created resolver id is `code_review_step_3_diff_source`
  - the third created resolver id is `code_review_step_3_review_input`
  - `taskState.activePlaceholderWorkflowValues?.story_path === "docs/story.md"`
Do not modify the later test `does not reopen the workflow-start form when workflow-start success leaves Step 1 active` in this pass.

[x] Step 4: Update the remaining canonical docs so they describe the enabled `story_path` contract.
Allowed files: `docs/workflow-automation/workflow-end-automation/code-review-completion.md`, `docs/workflows/deterministic-workflow-progression-readme.md`
In [code-review-completion.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/code-review-completion.md#L76-L82), replace the bullet `spec-file mutation` with the exact text `story-file mutation`.
Do not change any other bullet in that section.
In [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L165-L178), insert a new `code-review.md` example bullet immediately before the existing Step 2 example:
- `In \`code-review.md\`, if \`story_path\` points to an existing story file, Step 1 can complete immediately on the next deterministic pass.`
Do not modify any other example bullets in that readme.

[x] Step 5: Run the exact focused verification suite for this remediation pass.
Allowed files: none
Run this exact command:
```bash
npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts src/core/task/__tests__/workflowCompletionHandler.test.ts src/core/task/__tests__/workflowCompletionRunner.test.ts
```
If the command fails, stop and surface the failure instead of making unplanned fixes.

[x] Step 6: Perform a final string-contract and scope-boundary audit before handing the change back.
Allowed files: `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`, `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`, `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`, `docs/workflow-automation/workflow-end-automation/code-review-completion.md`, `docs/workflows/deterministic-workflow-progression-readme.md`
Before marking this step complete, verify all of these exact conditions:
- the `code-review.md` Step 1 evaluator no longer references `spec_file`
- the `code-review.md` Step 1 completion reason string is exactly `story_path points to an existing story file.`
- no updated deterministic-progression or focus-chain test in the allowed set still asserts `spec_file is present.`
- the updated slash-command chaining test proves `story_path` is present in `taskState.activePlaceholderWorkflowValues` when the Step 3 review-input form opens
- `code-review-completion.md` no longer says `spec-file mutation`
- `/Users/robertboston/Documents/Cline/Workflows/code-review.md` remains untouched by this plan
If any of those checks fail, fix only the mismatch inside the already-allowed files for the relevant earlier step. If a mismatch requires any additional file, stop and ask the user.
