---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not make changes outside the allowed files listed for the current step.
  - If any ambiguity is discovered, or if any change is needed outside the allowed files for the current step, stop and ask the user before proceeding.
  - Do not infer additional cleanup beyond what is explicitly prescribed here.
---

# Blind Review Deterministic Progression Buildout

[x] Step 1: Extend the deterministic workflow name contract and support allowlist to include `blind-review.md`.
Allowed files: `src/core/task/TaskState.ts`, `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
In [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L33), update the `DeterministicPlaceholderWorkflowName` union from `"code-review.md" | "dev-story.md" | "review-adversarial-general.md"` to `"code-review.md" | "dev-story.md" | "review-adversarial-general.md" | "blind-review.md"`.
Do not change `AutoCompletedPlaceholderWorkflowStepNotice`, `ActivePlaceholderWorkflowDeterministicState`, or any other `TaskState` field in this step.
In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L31), update `isDeterministicPlaceholderWorkflowSupported(...)` so it returns `true` for `workflowName === "blind-review.md"` in addition to the three currently supported names.
Do not change any helper function in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts) during this step.

[x] Step 2: Add a dedicated `blind-review.md` evaluator that copies the current `review-adversarial-general.md` progression contract without sharing evaluator control flow.
Allowed files: `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L311), leave `evaluateReviewAdversarialGeneralStep(...)` unchanged.
Immediately after the closing brace of `evaluateReviewAdversarialGeneralStep(...)` at [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L367), insert a new function named `evaluateBlindReviewStep(args: { taskState: TaskState; stepNumber: number; toolContext?: DeterministicPlaceholderToolContext }): Promise<DeterministicStepEvaluationResult>`.
Inside `evaluateBlindReviewStep(...)`, copy the current step structure from `evaluateReviewAdversarialGeneralStep(...)` exactly, with these required behaviors:
- `case 1`: read `placeholders.diff_output?.trim()`, resolve it with `resolveArtifactPlaceholderPath(...)`, require `fileExistsForPlaceholderWorkflowWriteProof(resolvedDiffOutputPath)`, and return `{ completed: true, reason: "diff_output resolves to an existing file path." }` only when that check succeeds.
- `case 2`: resolve `{output_folder}/adversarial-review-findings.md` via `resolveOutputFolderFile(...)`, resolve that path through `resolveArtifactPlaceholderPath(...)`, require both `taskStateHasPlaceholderWorkflowWriteProof(...)` and `fileExistsForPlaceholderWorkflowWriteProof(...)`, and return `{ completed: true, reason: "adversarial-review-findings.md was written during this task and the artifact still exists." }` only when both checks succeed.
- `case 3`: require `didSuccessfulAttemptCompletionOccur(args.toolContext)` and return `{ completed: true, reason: "attempt_completion was executed successfully to deliver blind-review findings." }` only when that helper returns true.
- `default`: return `{ completed: false }`.
Do not introduce any new placeholder mutation, deterministic state mutation, shared helper, metadata parser, or workflow-name aliasing in this step.
In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L461), update `evaluateDeterministicStep(...)` so it dispatches `workflowName === "review-adversarial-general.md"` to `evaluateReviewAdversarialGeneralStep(...)`, dispatches `workflowName === "blind-review.md"` to `evaluateBlindReviewStep(...)`, and leaves the existing `code-review.md` and `dev-story.md` branches unchanged.
After this edit, `evaluateDeterministicStep(...)` must no longer rely on a final fallback return that implicitly treats every non-`dev-story.md` workflow as `review-adversarial-general.md`.

[x] Step 3: Add focused deterministic unit coverage for `blind-review.md` by duplicating the existing adversarial-general scenarios under the new workflow name.
Allowed files: `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
In [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L51), update the support test so it also asserts `expect(isDeterministicPlaceholderWorkflowSupported("blind-review.md")).to.equal(true)`.
Immediately after the existing `does not complete review-adversarial-general step 3 when attempt_completion was not executed` test ending at [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L380), insert a second block of tests for `blind-review.md`.
That inserted block must duplicate the current `review-adversarial-general.md` tests from [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L60) through [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L380) with only these exact substitutions:
- replace every test name fragment `review-adversarial-general` with `blind-review`
- replace every `workflowName: "review-adversarial-general.md"` with `workflowName: "blind-review.md"`
- keep the Step 1 workflow contents and checklist labels identical except for the workflow name carried in `workflowName`
- keep the Step 2 artifact filename exactly `adversarial-review-findings.md`
- keep the Step 1 and Step 2 expected notice reasons exactly `"diff_output resolves to an existing file path."` and `"adversarial-review-findings.md was written during this task and the artifact still exists."`
- in the Step 3 success test, change only the expected final reason string to `"attempt_completion was executed successfully to deliver blind-review findings."`
- in the Step 3 negative test, keep `toolWasExecuted: false` and keep the expectation that no notices are added
Do not delete, reorder, or weaken any existing `review-adversarial-general.md` tests in this file.

[x] Step 4: Update the canonical deterministic-progression readme so the documented supported-workflow list and examples include `blind-review.md`.
Allowed files: `docs/workflows/deterministic-workflow-progression-readme.md`
In [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L68), add `blind-review.md` to the supported-workflows list immediately after `review-adversarial-general.md`.
In the `Current evaluator examples` section at [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L93), insert a new top-level bullet for `blind-review.md` immediately after the existing `review-adversarial-general.md` bullet with these exact sub-bullets:
- `Step 1 completes when diff_output resolves to an existing file path`
- `Step 2 completes when adversarial-review-findings.md was written during the current task and still exists`
- `Step 3 completes when the current turn successfully executes attempt_completion`
In the `Examples` section at [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L146), add these exact bullets immediately after the existing `review-adversarial-general.md` examples:
- `In blind-review.md, if diff_output resolves to an existing file, Step 1 can complete immediately on the next deterministic pass.`
- `In blind-review.md, if Step 2 writes {output_folder}/adversarial-review-findings.md during the current task and the artifact still exists, Step 2 can auto-complete.`
- `In blind-review.md, Step 3 can auto-complete when the current turn successfully executes attempt_completion.`
Do not modify [workflow-document-runtime-review.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-document-runtime-review.md), any workflow file under `/Users/robertboston/Documents/Cline/Workflows/`, or any workflow-form registry file in this step.

[x] Step 5: Run the focused deterministic progression verification and stop when it passes.
Allowed files: none
Run `npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`.
If the test run fails because a prescribed `blind-review.md` assertion or expected reason string was missed, fix only the prescribed files from Steps 1 through 4 and rerun the same command.
If the test run fails for any reason that requires touching a file outside the allowed files from Steps 1 through 4, stop and ask the user before proceeding.
After the targeted test passes, do not make any additional cleanup edits in subagent execution, workflow-form registries, placeholder persistence, or non-canonical docs as part of this plan.
