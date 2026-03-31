# Adding Another Deterministically Supported Placeholder Workflow

## Purpose

This guide explains how to add one more placeholder workflow to the set of workflows supported by deterministic workflow progression.

It is grounded in the current implementation, not just the original design docs. The current system is centered on:

- [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)
- [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)
- [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts)
- [placeholderWorkflowWriteProofs.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts)

As of this document, the deterministically supported workflows are:

- `code-review.md`
- `dev-story.md`

## Important Current-State Notes

Before adding a new workflow, align with these implementation facts:

- Deterministic support is keyed by the canonical workflow source filename, including the `.md` suffix. The support gate currently lives in `isDeterministicPlaceholderWorkflowSupported(...)` in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts).
- Placeholder step resolution depends on actual workflow headings like `## Step 1: ...` and the first incomplete checklist row. That parsing lives in [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts).
- File-based completion is no longer based only on file existence or `mtime`. For artifact-backed steps, the runtime usually requires proof that the current task wrote the file by checking `activePlaceholderWorkflowTaskWriteProofPaths` through [placeholderWorkflowWriteProofs.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts).
- Prompt behavior for supported workflows is already generic. Once the new workflow passes the deterministic support gate, the focus-chain prompt automatically switches to the deterministic-safe branch in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts).

## Step 1: Verify The Workflow Can Be Parsed Reliably

Open the workflow source and confirm it matches the parser’s expectations in [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts).

The workflow should satisfy all of the following:

- Each actionable step is defined by a heading shaped like `## Step N: Title` or `## Step N - Title`.
- The first incomplete checklist item generated from the workflow should map back to one concrete step heading.
- If the runtime cannot match the checklist row to a step heading, deterministic progression will stop because `getActivePlaceholderWorkflowStepDetails(...)` will return `undefined`.

If the workflow cannot be parsed deterministically from its headings and titles, fix the workflow structure first. Do not start by adding resolver logic.

## Step 2: Write Down The Deterministic Rule For Each Candidate Step

Only onboard steps whose completion signal is runtime-observable and machine-checkable.

Good deterministic signals in the current implementation:

- a required placeholder value exists and is non-empty
- a specific artifact path was written during the current task
- a file contains a top-level `Status:` value from an allowed set
- a markdown section contains no unchecked checklist items
- runtime-owned derived state proves bookkeeping work already happened

Avoid onboarding steps that still require model judgment, such as:

- “the review is thorough enough”
- “the implementation is correct”
- “the plan is well reasoned”

For each step, decide all of the following before touching code:

- What exact workflow filename will be supported, for example `my-workflow.md`
- What step number is being resolved
- What exact condition returns `completed: true`
- What user-visible `reason` string should be stored in the next-turn auto-complete notice
- Whether the step needs runtime side effects such as writing a derived placeholder value or deterministic state

If a step cannot be expressed as a strict boolean rule, leave it on the normal `task_progress` path.

## Step 3: Add The Workflow To The Central Support Gate

Update the workflow-name union in [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts) and the support helper in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts).

Make these changes together:

- Extend `DeterministicPlaceholderWorkflowName` with the exact canonical filename, for example `"my-workflow.md"`.
- Extend `isDeterministicPlaceholderWorkflowSupported(...)` so it returns `true` for that exact filename.
- Extend `evaluateDeterministicStep(...)` so the new workflow routes to its own evaluator.

Do not use fuzzy matching, basename matching, or slash-command aliases here. The runtime expects the canonical source name.

## Step 4: Implement A Dedicated Step Evaluator

Add a workflow-specific evaluator in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts), following the same shape as `evaluateCodeReviewStep(...)` and `evaluateDevStoryStep(...)`.

The evaluator should:

- read merged placeholder values through `getMergedPlaceholderValues(...)`
- switch on `stepNumber`
- return `{ completed: false }` when any prerequisite is missing
- return `{ completed: true, reason: "..." }` only when the runtime can prove the step is done
- set `placeholderValuesChanged` only when it mutates `taskState.activePlaceholderWorkflowValues`
- set `deterministicStateChanged` only when it mutates `taskState.activePlaceholderWorkflowDeterministicState`

Prefer to reuse existing helpers when possible:

- `readFileIfExists(...)`
- `hasTopLevelStatusValue(...)`
- `extractMarkdownSection(...)`
- `sectionHasNoUncheckedChecklistItems(...)`
- artifact-path resolution helpers

If the new workflow needs a helper that is reusable across more than one step, add it in this module near the existing private helpers instead of scattering logic into other files.

## Step 5: Handle Artifact-Backed Steps Correctly

If the new workflow treats file creation or file updates as the done signal, decide whether bare file existence is strong enough. In the current codebase, the safer default is to require current-task write proof.

Follow the existing pattern from `code-review.md` steps:

- resolve the artifact path from placeholders
- normalize relative paths against workflow context when needed
- require that the path is present in `activePlaceholderWorkflowTaskWriteProofPaths`
- require that the file still exists on disk

The current write-proof utilities live in [placeholderWorkflowWriteProofs.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts).

If no existing tool records the write proof for that artifact, add that recording where the file is successfully created or replaced. Do not weaken the deterministic rule just to avoid wiring write proof tracking.

## Step 6: Extend Task State Only If The Workflow Needs Runtime-Owned State

Most workflows will not need new task-state types beyond the existing notices array.

Only extend [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts) and [ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts) if the workflow needs state that cannot be derived from placeholders or files alone.

Use this only for cases like:

- tracking which subagent-produced artifacts have already been observed
- remembering which deterministic fallback path completed a step
- storing workflow-owned bookkeeping that should survive persistence and resume

If you add workflow-specific deterministic state:

- extend `ActivePlaceholderWorkflowDeterministicState`
- persist the new shape through existing task metadata plumbing
- make sure workflow activation still clears that state when switching workflows

If the workflow does not need persistent runtime-owned state, skip this step.

## Step 7: Add Any Conditional Sidecar Integrations

The resolver is the center of the feature, but some workflows need one or more extra seams.

Only add these when the new workflow truly depends on them.

### Subagent completion tracking

If a step becomes complete when certain subagent runs finish, follow the `code-review.md` pattern in [SubagentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SubagentToolHandler.ts):

- detect the active workflow by canonical name
- inspect completed subagent prompts or outputs
- record deterministic progress state immediately after the subagent batch finishes

### Workflow-form interception

If a step must be blocked behind a runtime-owned form before the API turn, follow the `code-review.md` Step 3 pattern in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts), specifically `shouldInterceptWorkflowFormBeforeApiTurn(...)`.

Use this only when the runtime must gather structured data before the step can proceed.

### Step-specific tool filtering

If the workflow needs step-specific tool restrictions or allowances, update [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts).

This is separate from deterministic progression. Do not modify the tool matrix unless the new workflow already has a concrete tool-routing need.

## Step 8: Confirm Prompt Behavior

Most of the prompt behavior is already generic once the workflow enters the deterministic support set.

After adding the workflow to the support gate, verify that all of the following remain true:

- the focus-chain prompt says the next step will be shown automatically
- unresolved-step fallback no longer tells the model to manually advance `task_progress`
- auto-completed notices render once and then clear
- unsupported workflows still stay on the legacy `task_progress` path

The relevant logic is in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts) and the system-prompt task-progress component in [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts).

You should not need new prompt wording just because a workflow was added to the deterministic registry. If you find yourself changing general prompt copy, stop and confirm that the change is truly workflow-specific.

## Step 9: Add Regression Tests At The Same Time

Do not onboard a workflow without tests.

At minimum, add resolver tests in [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts) covering:

- the support gate now accepts the new workflow filename
- every deterministically supported step has at least one success case
- every non-trivial step has at least one failure case
- unsupported workflows still remain unchanged

Add focus-chain tests in [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts) when the onboarding changes prompt behavior, notices, unresolved fallback behavior, or workflow-form interception.

Add persistence tests in [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts) if the workflow introduces:

- new deterministic state
- new metadata persistence requirements
- new write-proof expectations across task resume

Add handler tests only when you changed the relevant handler:

- [SubagentToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/SubagentToolHandler.test.ts)
- system-prompt integration tests if you changed contextual tool filtering or prompt assembly

## Step 10: Use This Decision Checklist Before Merging

The onboarding is ready only if all of the following are true:

- The workflow is identified by its exact canonical filename with `.md`.
- Every deterministically completed step has a strict runtime check and a stable reason string.
- Artifact-backed checks use current-task write proof when the step depends on the task having created or replaced the file.
- Any workflow-owned runtime state is persisted and cleared correctly on workflow switches.
- The workflow gets deterministic-safe prompt behavior automatically through the existing support gate.
- Regression tests cover success, failure, unsupported fallback, and any sidecar integration you added.

## Recommended Minimal Change Order

When implementing the next workflow, use this order:

1. Inspect the workflow headings and write down the deterministic rule for each candidate step.
2. Add the workflow name to `DeterministicPlaceholderWorkflowName` and `isDeterministicPlaceholderWorkflowSupported(...)`.
3. Implement the workflow evaluator in `deterministicPlaceholderProgression.ts`.
4. Add task-state extensions only if the evaluator cannot rely on placeholders and files alone.
5. Add any required sidecar integration such as write-proof recording, subagent tracking, or workflow-form interception.
6. Add regression tests.
7. Run the targeted test files that cover the resolver plus any handler or prompt seam you changed.

## Anti-Patterns To Avoid

- Do not parse freeform `Done Signal:` prose at runtime.
- Do not spread workflow-specific `if` checks across unrelated prompt files when the resolver can own the rule.
- Do not treat a stale pre-existing artifact as proof that the current task completed the step.
- Do not key deterministic support off a slash-command alias when the runtime source name is different.
- Do not add new prompt wording first and hope the runtime logic catches up later.

## Summary

In the current fork, adding another deterministically supported workflow is usually a focused resolver-onboarding task:

- register the canonical workflow filename
- implement strict step checks in the central progression module
- add sidecar plumbing only when the workflow truly needs it
- prove the behavior with resolver, prompt, and persistence tests as appropriate

If the workflow can be described with strict, runtime-observable step-completion rules, it should fit cleanly into the existing architecture.
