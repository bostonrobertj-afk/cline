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

# Write Remediation Story Deterministic Progression Action Plan

## Scope

This plan adds deterministic progression support for the canonical workflow source name `write-remediation-story.md` only.

This buildout must remain independent from every existing workflow evaluator:

- do not route `write-remediation-story.md` through `evaluateDevStoryStep(...)`
- do not introduce shared workflow-name aliases or grouped "story workflow" branches
- do not add workflow-specific state under `ActivePlaceholderWorkflowDeterministicState`
- do not change workflow-form registries, prompt/tool filtering, workflow completion automation, or write-proof handler wiring in this pass

The new workflow-specific gate contract for this plan is:

- Step 1: `{story_path}` exists and points to an existing story file
- Step 2: a current-task-written remediation story artifact exists under the resolved implementation-artifacts folder, is distinct from `{story_path}`, contains top-level `Status: ready-for-dev`, and contains all required section headings
- Step 3: `attempt_completion` executed successfully in the current turn

This Step 2 rule intentionally uses runtime-verifiable file and write-proof facts only. It does not attempt to parse freeform prose or infer a remediation-story numbering regex that is not already standardized in live runtime code.

## Action Plan

[x] Step 1: Extend the deterministic workflow-name contract and support allowlist for `write-remediation-story.md`.
Allowed files: `src/core/task/TaskState.ts`, `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
In [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L33), extend the `DeterministicPlaceholderWorkflowName` union by appending the exact canonical filename `"write-remediation-story.md"` after `"review-edge-case-hunter.md"`.
Do not change [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts) `AutoCompletedPlaceholderWorkflowStepNotice`, `CodeReviewDeterministicProgressState`, `ActivePlaceholderWorkflowDeterministicState`, or any non-union `TaskState` field in this step.
In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L31), extend `isDeterministicPlaceholderWorkflowSupported(...)` so it returns `true` for `workflowName === "write-remediation-story.md"` in addition to the five currently supported workflow names.
Do not add fuzzy matching, basename matching, slash-command aliases, or grouped story-workflow helpers in this step.

[x] Step 2: Add a dedicated `write-remediation-story.md` evaluator and a workflow-specific artifact helper without coupling to any other workflow evaluator.
Allowed files: `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
In the import section at [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L1), add `import { arePathsEqual } from "@/utils/path"` as a new top-level import. Do not modify any other import source.
Immediately after the existing `resolveTaskWrittenPlaceholderArtifactPath(...)` helper at [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L141), insert a new helper named `resolveTaskWrittenWriteRemediationStoryArtifactPath(args: { taskState: TaskState; placeholders: Record<string, string>; storyPath?: string }): Promise<string | undefined>`.
Implement `resolveTaskWrittenWriteRemediationStoryArtifactPath(...)` with this exact behavior:
- read `implementationArtifactsRaw` from `args.placeholders.implementation_artifacts?.trim()`
- if `implementationArtifactsRaw` is blank, fall back to `resolveOutputFolderFile(args.placeholders, "implementation-artifacts")`
- if both are blank, return `undefined`
- store the selected non-empty folder string in a local `implementationArtifactsFolderRaw`
- resolve the folder path through `resolveArtifactPlaceholderPath(args.placeholders, implementationArtifactsFolderRaw)`
- resolve `args.storyPath` through `resolveArtifactPlaceholderPath(...)` only when `args.storyPath` is non-empty
- iterate over `args.taskState.activePlaceholderWorkflowTaskWriteProofPaths` in stored order
- for each candidate path:
  - require `arePathsEqual(path.dirname(candidatePath), resolvedImplementationArtifactsDir)`
  - if resolved `storyPath` exists, require `arePathsEqual(candidatePath, resolvedStoryPath) === false`
  - require `await fileExistsForPlaceholderWorkflowWriteProof(candidatePath)` to be `true`
  - load file text through `readFileIfExists(candidatePath)` and continue if it is missing
  - require `hasTopLevelStatusValue(candidateText, ["ready-for-dev"])`
  - require all of these headings to exist by checking `extractMarkdownSection(candidateText, "...") !== undefined` for each exact heading string:
    - `## Acceptance Criteria`
    - `## Allowed Files List`
    - `## Tasks / Subtasks`
    - `## Latest Review Findings`
    - `## Testing Requirements`
    - `## Completion Notes List`
  - return the first candidate path that satisfies every condition
- return `undefined` if no candidate satisfies the rule
Do not parse or enforce the `storynumber_remediation_#` filename prose in this helper. Do not add new helper files, task-state fields, metadata persistence, or handler changes.
Immediately after the closing brace of `evaluateDevStoryStep(...)` at [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L584), insert a new function named `evaluateWriteRemediationStoryStep(args: { taskState: TaskState; stepNumber: number; toolContext?: DeterministicPlaceholderToolContext }): Promise<DeterministicStepEvaluationResult>`.
Inside `evaluateWriteRemediationStoryStep(...)`, use `const placeholders = getMergedPlaceholderValues(args.taskState)` and `const storyPath = placeholders.story_path?.trim()`, then implement these exact branches:
- `case 1`:
  - if `storyPath` is missing or blank, return `{ completed: false }`
  - call `await fs.access(storyPath)` in a `try`/`catch`
  - on success return `{ completed: true, reason: "story_path points to an existing story file." }`
  - on failure return `{ completed: false }`
- `case 2`:
  - call `resolveTaskWrittenWriteRemediationStoryArtifactPath({ taskState: args.taskState, placeholders, storyPath })`
  - if it returns `undefined`, return `{ completed: false }`
  - otherwise return `{ completed: true, reason: "A remediation story artifact distinct from story_path was written during this task and contains Status: ready-for-dev plus all required section headings." }`
- `case 3`:
  - require `didSuccessfulAttemptCompletionOccur(args.toolContext)`
  - on success return `{ completed: true, reason: "attempt_completion was executed successfully for the remediation story delivery." }`
- `default`:
  - return `{ completed: false }`
Do not mutate `taskState.activePlaceholderWorkflowValues`, `taskState.activePlaceholderWorkflowDeterministicState`, or any other workflow state inside `evaluateWriteRemediationStoryStep(...)`.
In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L586), update `evaluateDeterministicStep(...)` so `workflowName === "write-remediation-story.md"` dispatches to `evaluateWriteRemediationStoryStep(...)`.
Keep the existing explicit branches for `code-review.md`, `dev-story.md`, `review-adversarial-general.md`, `blind-review.md`, and `review-edge-case-hunter.md` intact. Do not rewrite `dev-story.md` to absorb this workflow. The final fallback return must remain `return { completed: false }`.

[x] Step 3: Add focused deterministic regression coverage for `write-remediation-story.md` without changing any non-target workflow assertions.
Allowed files: `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
In the support-gate test at [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L51), add these two exact assertions immediately after the existing `review-edge-case-hunter.md` assertion:
- `expect(isDeterministicPlaceholderWorkflowSupported("write-remediation-story.md")).to.equal(true)`
- `expect(isDeterministicPlaceholderWorkflowSupported("write-remediation-story")).to.equal(false)`
Immediately after the existing `completes dev-story step 4 from successful attempt_completion tool context` test ending at [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L1775), insert a new `write-remediation-story.md` test block with these exact test titles:
- `completes write-remediation-story step 1 when story_path points to an existing story file`
- `does not complete write-remediation-story step 1 when story_path is missing`
- `completes write-remediation-story step 2 when a distinct remediation story artifact exists with a current-task write proof, Status: ready-for-dev, and all required headings`
- `does not complete write-remediation-story step 2 when the candidate artifact exists without a current-task write proof`
- `does not complete write-remediation-story step 2 when only story_path itself was updated`
- `does not complete write-remediation-story step 2 when the candidate artifact is missing a required section heading`
- `completes write-remediation-story step 2 from a relative output_folder when the remediation artifact exists with a current-task write proof`
- `completes write-remediation-story step 3 from successful attempt_completion tool context`
- `does not complete write-remediation-story step 3 when attempt_completion was not executed`
Use these exact fixture conventions for the new test block:
- `workflowName: "write-remediation-story.md"` in every new test
- Step 1 fixture heading: `## Step 1: (System-Owned) Gather Necessary Inputs`
- Step 2 fixture heading: `## Step 2: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings`
- Step 3 fixture heading: `## Step 3: Notify User of Completion`
- Step 1 success reason assertion: `"story_path points to an existing story file."`
- Step 2 success reason assertion: `"A remediation story artifact distinct from story_path was written during this task and contains Status: ready-for-dev plus all required section headings."`
- Step 3 success reason assertion: `"attempt_completion was executed successfully for the remediation story delivery."`
For the Step 2 success fixture, create a remediation artifact file under an `implementation-artifacts` directory with this exact minimal shape:
```md
Status: ready-for-dev

# Remediation Story

## Acceptance Criteria
- Criterion

## Allowed Files List
- file.md

## Tasks / Subtasks
- [ ] Task

## Latest Review Findings
- Finding

## Testing Requirements
- test

## Completion Notes List
```
For the Step 2 failure titled `does not complete write-remediation-story step 2 when only story_path itself was updated`, write that exact remediation-story-shaped content to the `story_path` file itself, record a write proof for that same path, and assert the checklist remains incomplete with no added notices.
For the Step 2 failure titled `does not complete write-remediation-story step 2 when the candidate artifact is missing a required section heading`, omit exactly `## Testing Requirements` from the candidate artifact and keep `Status: ready-for-dev` present so the failure proves the required-heading gate specifically.
For the relative-path Step 2 success case:
- set `stablePlaceholderValues.cwd = tempDir`
- set `stablePlaceholderValues.project_root = tempDir`
- set `placeholderValues.output_folder = "output"`
- create the remediation artifact at `path.join(tempDir, "output", "implementation-artifacts", "4-2_remediation_1.md")`
- create the source story file at `path.join(tempDir, "output", "implementation-artifacts", "4-2-original-story.md")`
- record the write proof only for the remediation artifact path
For both Step 3 tests:
- keep `toolName: "attempt_completion"`
- in the negative case keep `toolWasExecuted: false`
- assert the checklist remains unchanged and `pendingAutoCompletedPlaceholderWorkflowStepNotices` stays empty in the negative case
Do not delete, reorder, or weaken any existing `code-review.md`, `dev-story.md`, `review-adversarial-general.md`, `blind-review.md`, `review-edge-case-hunter.md`, or unsupported-workflow assertions outside these prescribed additions.

[x] Step 4: Update the canonical deterministic-progression readme so it documents `write-remediation-story.md` using the same explicit per-workflow methodology as the existing supported workflows.
Allowed files: `docs/workflows/deterministic-workflow-progression-readme.md`
In the supported-workflow list at [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L70), add `write-remediation-story.md` immediately after `review-edge-case-hunter.md`.
In the `Current evaluator examples` section at [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L95), insert a new top-level bullet for `write-remediation-story.md` immediately after the existing `dev-story.md` bullet with these exact sub-bullets:
- `Step 1 completes when story_path points to an existing story file`
- `Step 2 completes when a current-task-written remediation story artifact distinct from story_path exists in implementation-artifacts and contains Status: ready-for-dev plus the required section headings`
- `Step 3 completes when the current turn successfully executes attempt_completion`
In the `Examples` section at [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L160), add these exact bullets immediately after the existing `dev-story.md` example:
- `In write-remediation-story.md, if story_path already points to an existing story file, Step 1 can complete immediately on the next deterministic pass.`
- `In write-remediation-story.md, if a remediation story artifact distinct from story_path is written during the current task under {output_folder}/implementation-artifacts and contains Status: ready-for-dev plus the required section headings, Step 2 can auto-complete.`
- `In write-remediation-story.md, Step 3 can auto-complete when the current turn successfully executes attempt_completion.`
Do not modify [workflow-document-runtime-review.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-document-runtime-review.md), [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md), or [workflow-automation-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-automation-readme.md) in this step. This plan is scoped only to deterministic progression onboarding and its canonical deterministic readme.

[x] Step 5: Run the focused deterministic progression verification and stop after the targeted suite passes.
Allowed files: none
Run `npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`.
If this test run fails because a prescribed `write-remediation-story.md` assertion, reason string, or heading check was missed, fix only the files listed in Steps 1 through 4 and rerun the same command.
If the failure requires edits outside the files listed in Steps 1 through 4, stop and ask the user before proceeding.
After the targeted test passes, do not make any additional cleanup edits in workflow forms, prompt filtering, workflow completion automation, placeholder persistence, or non-canonical docs as part of this plan.
