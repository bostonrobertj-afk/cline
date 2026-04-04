---
title: Create Epics Deterministic Progression Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - This plan implements only the deterministic progression capability for `create-epics.md`. Do not modify workflow-form code, tool handlers, workflow source documents, or write-epics requirements docs while executing this plan.
  - The deterministic contract for this pass is the requirements document in `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/write-epics/deterministic-progression-requirements.md`. Even though the live Step 1 text in `/Users/robertboston/Documents/Cline/Workflows/create-epics.md` still says ``PRD``, the deterministic evaluator for this pass must use the canonical runtime key `prd` only. Do not broaden the evaluator to accept both spellings in this silo.
---

# Create Epics Deterministic Progression Action Plan

This plan implements only the deterministic progression requirements described in:

- [deterministic-progression-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/deterministic-progression-requirements.md)
- [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md)
- [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md)

Locked decisions for this pass:

- The only workflow added to deterministic placeholder progression in this pass is `create-epics.md`.
- Only Step 1 is in scope for deterministic evaluation.
- Step 1 completion is placeholder-state-driven only.
- The required canonical placeholder keys are:
  - `architecture_document`
  - `prd`
  - `mode`
- Optional placeholders `ux_spec` and `ui_spec` must not block completion.
- Valid `mode` values are exactly:
  - `new`
  - `continue`
- This pass must not:
  - add any new deterministic state shape
  - mutate placeholder values from the new evaluator
  - require file existence checks, write proofs, or artifact existence for `create-epics.md` Step 1
  - modify `/Users/robertboston/Documents/Cline/Workflows/create-epics.md`
  - modify any workflow-form files under `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/**`

## Step 1
[x] Extend the deterministic runtime contracts so `create-epics.md` is a supported deterministic placeholder workflow with its own Step 1 evaluator.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`

Exact edits:
1. In [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L33-L40), add `"create-epics.md"` to the `DeterministicPlaceholderWorkflowName` union immediately after `"code-review.md"`.
2. In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L32-L43), add `workflowName === "create-epics.md"` to `isDeterministicPlaceholderWorkflowSupported(...)` immediately after the existing `code-review.md` check.
3. In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L650-L718), insert a new helper named exactly `evaluateCreateEpicsStep(...)` immediately before `evaluateWriteRemediationStoryStep(...)`.
4. The new `evaluateCreateEpicsStep(...)` helper must:
   - accept the same argument shape used by the other workflow-specific evaluators:
     - `taskState: TaskState`
     - `stepNumber: number`
     - `toolContext?: DeterministicPlaceholderToolContext`
   - read merged placeholder values using the existing `getMergedPlaceholderValues(args.taskState)` helper
   - trim and read exactly these placeholder keys:
     - `architecture_document`
     - `prd`
     - `mode`
   - implement only this switch behavior:
     - `case 1`
     - `default`
5. `case 1` in `evaluateCreateEpicsStep(...)` must:
   - return `{ completed: false }` when `architecture_document` is missing or empty
   - return `{ completed: false }` when `prd` is missing or empty
   - return `{ completed: false }` when `mode` is missing or empty
   - return `{ completed: false }` when `mode` is not exactly `"new"` or `"continue"`
   - otherwise return:
     - `completed: true`
     - `reason: "architecture_document, prd, and a valid mode were already available in workflow placeholder state."`
6. `default` in `evaluateCreateEpicsStep(...)` must return `{ completed: false }`.
7. Do not add:
   - file access checks
   - artifact path checks
   - write-proof checks
   - placeholder mutations
   - deterministic state mutations
   - tool-context-dependent branching
8. In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L720-L775), add a dedicated dispatch branch for `create-epics.md` in `evaluateDeterministicStep(...)` immediately after the existing `code-review.md` branch and before the `dev-story.md` branch.
9. That new dispatch branch must call only `evaluateCreateEpicsStep(...)`.
10. Do not change:
    - `cloneDeterministicState(...)`
    - `resolveTaskWrittenPlaceholderArtifactPath(...)`
    - any existing evaluator behavior for other workflows
    - `applyDeterministicPlaceholderProgression(...)`

## Step 2
[x] Add focused deterministic progression regression coverage for `create-epics.md` support registration, Step 1 completion, Step 1 rejection paths, and one-step-at-a-time checklist advancement.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`

Exact edits:
1. In [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L50-L61), update the existing `supports only the prescribed deterministic placeholder workflows` test:
   - add `expect(isDeterministicPlaceholderWorkflowSupported("create-epics.md")).to.equal(true)` immediately after the existing `code-review.md` assertion
   - add `expect(isDeterministicPlaceholderWorkflowSupported("create-epics")).to.equal(false)` immediately after the existing `code-review` near-miss assertion
   - do not remove any existing assertions
2. In [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L2335-L2351), insert the new `create-epics.md` tests immediately before the existing `leaves still-unsupported placeholder workflows unchanged and adds no notices` test.
3. Add a positive test titled exactly:
   - `completes create-epics step 1 when architecture_document, prd, and mode=new are present`
4. That `mode=new` test must:
   - use `workflowName: "create-epics.md"`
   - use this Step 1 workflow heading exactly:
     - `## Step 1: (System-Owned) Confirm the input set`
   - use this Step 2 workflow heading exactly:
     - `## Step 2: (System-Owned) Build the requirements inventory`
   - use checklist markdown exactly:
     - `- [ ] Step 1: (System-Owned) Confirm the input set`
   - set `placeholderValues` to exactly:
     - `architecture_document: "/tmp/architecture.md"`
     - `prd: "/tmp/prd.md"`
     - `mode: "new"`
   - assert the resulting checklist is exactly:
     - `- [x] Step 1: (System-Owned) Confirm the input set`
   - assert the last pending notice reason is exactly:
     - `architecture_document, prd, and a valid mode were already available in workflow placeholder state.`
5. Add a second positive test titled exactly:
   - `completes create-epics step 1 when architecture_document, prd, and mode=continue are present`
6. That `mode=continue` test must mirror the `mode=new` test but set:
   - `mode: "continue"`
   - keep the same expected completion reason
7. Add four negative tests with these exact titles:
   - `does not complete create-epics step 1 when architecture_document is missing`
   - `does not complete create-epics step 1 when prd is missing`
   - `does not complete create-epics step 1 when mode is missing`
   - `does not complete create-epics step 1 when mode is not new or continue`
8. In each negative test:
   - use `workflowName: "create-epics.md"`
   - use the same Step 1 heading text and checklist label as the positive tests
   - omit or invalidate only the one field named in the test title
   - keep the other required fields valid
   - assert the checklist remains exactly:
     - `- [ ] Step 1: (System-Owned) Confirm the input set`
   - assert `taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices` is exactly `[]`
9. Add one chaining regression titled exactly:
   - `advances only create-epics step 1 when the required placeholder state is present`
10. That chaining test must:
    - use `workflowName: "create-epics.md"`
    - use workflow contents with both live headings:
      - `## Step 1: (System-Owned) Confirm the input set`
      - `## Step 2: (System-Owned) Build the requirements inventory`
    - use checklist markdown exactly:
      - `- [ ] Step 1: (System-Owned) Confirm the input set`
      - `- [ ] Step 2: (System-Owned) Build the requirements inventory`
    - set `placeholderValues` to exactly:
      - `architecture_document: "/tmp/architecture.md"`
      - `prd: "/tmp/prd.md"`
      - `mode: "new"`
    - assert the resulting checklist is exactly:
      - `- [x] Step 1: (System-Owned) Confirm the input set`
      - `- [ ] Step 2: (System-Owned) Build the requirements inventory`
    - assert `result.noticesAdded === true`
    - assert `taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices` has length `1`
    - assert the only notice uses:
      - `workflowName: "create-epics.md"`
      - `stepNumber: 1`
      - `reason: "architecture_document, prd, and a valid mode were already available in workflow placeholder state."`
11. Do not add any tests for `PRD` uppercase acceptance. That contract is intentionally out of scope for this deterministic pass.

## Step 3
[x] Run the focused deterministic progression verification for the `create-epics.md` buildout.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/write-epics/deterministic-progression-action-plan.md`

Exact commands:
1. `npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts --exit`
2. `npx tsc --noEmit`

Completion criteria:
- Both commands pass.
- No files outside the allowed files from Steps 1-2 are modified, except this action-plan document’s checkbox updates.
- If either command fails because of a file or seam not explicitly covered above, stop and report the failure without making any additional changes unless the failure is caused by an explicit mistake in this action plan.
