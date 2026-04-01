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

# Edge Case Hunter Deterministic Progression Buildout

## Step Gates
- Step 1: Both `review_input` and `diff_output` resolve to existing files.
- Step 2: `{output_folder}/edge-case-review-findings.md` was written during the current task and still exists.
- Step 3: `attempt_completion` executed successfully in the current turn.

## Action Plan

[x] Step 1: Extend the deterministic workflow name contract and support allowlist to include `review-edge-case-hunter.md`.
Allowed files: `src/core/task/TaskState.ts`, `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
In [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L30), update the `DeterministicPlaceholderWorkflowName` union from `"code-review.md" | "dev-story.md" | "review-adversarial-general.md" | "blind-review.md"` to `"code-review.md" | "dev-story.md" | "review-adversarial-general.md" | "blind-review.md" | "review-edge-case-hunter.md"`.
Do not change `AutoCompletedPlaceholderWorkflowStepNotice`, `ActivePlaceholderWorkflowDeterministicState`, or any other `TaskState` field in this step.
In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L29), update `isDeterministicPlaceholderWorkflowSupported(...)` so it returns `true` for `workflowName === "review-edge-case-hunter.md"` in addition to the four currently supported names.
Do not change any helper function in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts) during this step.

[x] Step 2: Add a dedicated `review-edge-case-hunter.md` evaluator that implements the approved three-step gate contract.
Allowed files: `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L372), leave `evaluateBlindReviewStep(...)` unchanged.
Immediately after the closing brace of `evaluateBlindReviewStep(...)` at [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L428), insert a new function named `evaluateEdgeCaseHunterStep(args: { taskState: TaskState; stepNumber: number; toolContext?: DeterministicPlaceholderToolContext }): Promise<DeterministicStepEvaluationResult>`.
Inside `evaluateEdgeCaseHunterStep(...)`, use `const placeholders = getMergedPlaceholderValues(args.taskState)` and implement these exact branches:
- `case 1`:
  - read `placeholders.review_input?.trim()` into `reviewInput`
  - read `placeholders.diff_output?.trim()` into `diffOutput`
  - return `{ completed: false }` immediately if either is missing or blank
  - resolve both paths through `resolveArtifactPlaceholderPath(placeholders, ...)`
  - require `fileExistsForPlaceholderWorkflowWriteProof(...)` to succeed for both resolved paths
  - return `{ completed: true, reason: "review_input and diff_output resolve to existing file paths." }` only when both checks succeed
- `case 2`:
  - resolve `{output_folder}/edge-case-review-findings.md` via `resolveOutputFolderFile(placeholders, "edge-case-review-findings.md")`
  - resolve that path through `resolveArtifactPlaceholderPath(...)`
  - require both `taskStateHasPlaceholderWorkflowWriteProof(args.taskState, resolvedFindingsArtifactPath)` and `fileExistsForPlaceholderWorkflowWriteProof(resolvedFindingsArtifactPath)`
  - return `{ completed: true, reason: "edge-case-review-findings.md was written during this task and the artifact still exists." }` only when both checks succeed
- `case 3`:
  - require `didSuccessfulAttemptCompletionOccur(args.toolContext)`
  - return `{ completed: true, reason: "attempt_completion was executed successfully to deliver edge-case findings." }` only when that helper returns true
- `default`:
  - return `{ completed: false }`
Do not introduce any placeholder mutation, deterministic state mutation, shared helper, metadata parser, workflow-name aliasing, or workflow-prose parsing in this step.
In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L522), update `evaluateDeterministicStep(...)` so it dispatches `workflowName === "review-edge-case-hunter.md"` to `evaluateEdgeCaseHunterStep(...)` and leaves the existing `code-review.md`, `dev-story.md`, `review-adversarial-general.md`, and `blind-review.md` branches unchanged.
After this edit, the final fallback return in `evaluateDeterministicStep(...)` must remain the generic `{ completed: false }` path and must not absorb the new workflow implicitly.

[x] Step 3: Add focused deterministic unit coverage for `review-edge-case-hunter.md` and retire the now-stale unsupported-workflow assertions.
Allowed files: `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
In the support test at [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L51), change `expect(isDeterministicPlaceholderWorkflowSupported("review-edge-case-hunter.md")).to.equal(false)` to `.to.equal(true)`.
Immediately after the existing `does not complete blind-review step 3 when attempt_completion was not executed` test ending at [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L703), insert a new `review-edge-case-hunter.md` test block with these exact cases:
- `completes review-edge-case-hunter step 1 when review_input and diff_output both resolve to existing files`
- `does not complete review-edge-case-hunter step 1 when review_input is missing`
- `does not complete review-edge-case-hunter step 1 when diff_output is missing`
- `does not complete review-edge-case-hunter step 1 when review_input points to a missing file`
- `completes review-edge-case-hunter step 1 from stable relative review_input and diff_output when resolution succeeds`
- `completes review-edge-case-hunter step 2 when the findings artifact exists with a current-task write proof`
- `does not complete review-edge-case-hunter step 2 when the findings artifact exists without a write proof`
- `completes review-edge-case-hunter step 2 from a relative output_folder when the findings artifact exists with a current-task write proof`
- `completes review-edge-case-hunter step 3 from successful attempt_completion tool context`
- `does not complete review-edge-case-hunter step 3 when attempt_completion was not executed`
For the Step 1 tests:
- use `workflowName: "review-edge-case-hunter.md"`
- use workflow contents whose Step 1 heading is exactly `## Step 1: Receive Content (may auto-advance)` and whose Step 2 heading is exactly `## Step 2: Exhaustive Path Analysis`
- require both `review_input` and `diff_output` placeholders in the fixtures
- for the relative-path success case, set both `cwd` and `project_root` in `stablePlaceholderValues` and store relative placeholder values for both artifact paths
- assert the Step 1 success notice string exactly `"review_input and diff_output resolve to existing file paths."`
For the Step 2 tests:
- use the exact artifact filename `edge-case-review-findings.md`
- assert the Step 2 success notice string exactly `"edge-case-review-findings.md was written during this task and the artifact still exists."`
- keep current-task write-proof behavior identical to the existing adversarial-general and blind-review artifact-backed tests
For the Step 3 tests:
- use a Step 3 workflow heading exactly `## Step 3: Present Findings`
- keep `toolName: "attempt_completion"`
- in the success case, assert the final reason string exactly `"attempt_completion was executed successfully to deliver edge-case findings."`
- in the negative case, keep `toolWasExecuted: false` and assert that no notices are added
At the bottom of the file, replace the existing unsupported-workflow regression at [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L1435) so it no longer uses `workflowName: "review-edge-case-hunter.md"`.
In that bottom regression:
- rename the test to `"leaves still-unsupported placeholder workflows unchanged and adds no notices"`
- use a new unsupported fixture workflow name exactly `"unsupported-placeholder-review.md"`
- keep the expectation that the checklist remains unchanged and `pendingAutoCompletedPlaceholderWorkflowStepNotices` stays empty
Do not delete, reorder, or weaken any existing `review-adversarial-general.md`, `blind-review.md`, `code-review.md`, or `dev-story.md` assertions outside these prescribed replacements.

[x] Step 4: Update the canonical deterministic-progression readme so the supported-workflow list and examples include `review-edge-case-hunter.md`.
Allowed files: `docs/workflows/deterministic-workflow-progression-readme.md`
In the supported-workflows list at [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L70), add `review-edge-case-hunter.md` immediately after `blind-review.md`.
In the `Current evaluator examples` section at [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L94), insert a new top-level bullet for `review-edge-case-hunter.md` immediately after the existing `blind-review.md` bullet with these exact sub-bullets:
- `Step 1 completes when review_input and diff_output both resolve to existing file paths`
- `Step 2 completes when edge-case-review-findings.md was written during the current task and still exists`
- `Step 3 completes when the current turn successfully executes attempt_completion`
In the `Examples` section at [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L153), add these exact bullets immediately after the existing `blind-review.md` examples:
- `In review-edge-case-hunter.md, if review_input and diff_output both resolve to existing files, Step 1 can complete immediately on the next deterministic pass.`
- `In review-edge-case-hunter.md, if Step 2 writes {output_folder}/edge-case-review-findings.md during the current task and the artifact still exists, Step 2 can auto-complete.`
- `In review-edge-case-hunter.md, Step 3 can auto-complete when the current turn successfully executes attempt_completion.`
Do not modify `/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md`, workflow-form registries, or any non-canonical deterministic docs in this step.

[x] Step 5: Run the focused deterministic progression verification and stop when it passes.
Allowed files: none
Run `npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`.
If the test run fails because a prescribed `review-edge-case-hunter.md` assertion or expected reason string was missed, fix only the prescribed files from Steps 1 through 4 and rerun the same command.
If the test run fails for any reason that requires touching a file outside the allowed files from Steps 1 through 4, stop and ask the user before proceeding.
After the targeted test passes, do not make any additional cleanup edits in subagent execution, workflow forms, placeholder persistence, or non-canonical docs as part of this plan.
