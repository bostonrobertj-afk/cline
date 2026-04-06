---
title: PI Planning Deterministic Progression Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/doc change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - This plan implements only the step-progression requirements in `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/pi-planning/deterministic-progression-requirements.md`.
  - Do not modify `/Users/robertboston/Documents/Cline/Workflows/pi-planning.md`, `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/pi-planning/progress-tracker.md`, workflow-form code, contextual tool matrix files, or prompt-component source files while executing this plan.
  - Progression-critical overlap with the shared `workflow_progress_request` support map is in scope for this plan. Broader workflow tool configuration and prompting work remains out of scope.
  - Preserve the current runtime validation boundary for `workflow_progress_request`: this slice may extend supported workflow names and steps through the shared support map, but it must not add new handler-side step-number validation.
---

# PI Planning Deterministic Progression Action Plan

This plan implements the deterministic step-progression contract for:

- [deterministic-progression-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/pi-planning/deterministic-progression-requirements.md)

Live seams verified before authoring this plan:

- deterministic workflow support is typed in [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L33-L40)
- deterministic support registration, helper reuse, and evaluator dispatch live in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L32-L44) and [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L812-L875)
- the deterministic progression loop already re-checks the next active step immediately after a successful auto-completion in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L877-L952)
- `workflow_progress_request` workflow/step support is centralized in [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1-L56)
- the handler accepts supported workflow names but does not validate step numbers in [WorkflowProgressRequestToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts#L40-L52)
- prompt teaching already keys off `shouldExposeWorkflowProgressRequest(...)` in [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L57-L82) and [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L13-L29), so no prompt-component code changes are needed in this slice

Locked decisions for this pass:

- `pi-planning.md` becomes a supported deterministic placeholder workflow.
- Step 1 completes when `epics_document` and `architecture_document` are present and non-empty in merged placeholder state.
- Step 2 completes when `target_epic` is present and non-empty after trimming.
- Step 3 is re-evaluated immediately after Step 2 auto-completes. If `epic_delivery_spec` already resolves to an existing file, Step 3 completes immediately. Otherwise Step 3 remains active until the automation path creates the artifact and sets `epic_delivery_spec`.
- The deterministic evaluator distinguishes Step 3 completion reasons using runtime facts only:
  - existing resolved file with no current-task write proof
  - existing resolved file with a current-task write proof
- Steps 4 and 5 are not evaluator-completed; they transition through the existing governed `workflow_progress_request` path.
- This slice extends the shared `workflow_progress_request` support map to `pi-planning.md` Steps 4 and 5, but it does not add `pi-planning.md` rows to `contextualToolMatrix.ts`.

## Step 1
[x] Align the Step 3 requirements text with the approved resolved-file-first runtime contract before changing code.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/pi-planning/deterministic-progression-requirements.md`

Exact edits:
1. In [deterministic-progression-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/pi-planning/deterministic-progression-requirements.md#L135-L174), replace the current Step 3 subsection structure with one Step 3 section that reflects the approved clarified behavior.
2. Remove the two subsection headings:
   - `#### Step 3 completion mode A: existing spec provided at Step 1`
   - `#### Step 3 completion mode B: spec created during the current task`
3. Replace their combined content with these exact Step 3 requirements:
   - Step 3 completes when:
     - `epic_delivery_spec` is present and non-empty in merged workflow placeholder state
     - the resolved `epic_delivery_spec` path exists on disk
   - immediately after Step 2 auto-completes, deterministic progression must re-evaluate Step 3 in the same progression pass
   - if `epic_delivery_spec` already resolves to an existing file at that point, Step 3 must complete immediately
   - if `epic_delivery_spec` does not yet resolve to an existing file, Step 3 must remain active until the Step 3 automation creates the artifact and sets `epic_delivery_spec`
   - if the resolved file has a current-task placeholder-workflow write proof, the Step 3 completion reason must indicate that the delivery spec was written during the current task
   - if the resolved file exists without a current-task placeholder-workflow write proof, the Step 3 completion reason must indicate that an existing delivery spec already resolved
4. Keep these existing shared Step 3 rules unchanged:
   - progression is keyed from `epic_delivery_spec`
   - relative paths resolve through the existing placeholder path-resolution behavior
   - completion does not depend on model-authored `task_progress`
   - the evaluator does not create or modify the artifact itself
5. In [deterministic-progression-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/pi-planning/deterministic-progression-requirements.md#L257-L275), replace the Step 3 test requirements so they now require:
   - one positive existing-file test
   - one positive current-task-written-file test
   - one missing-placeholder negative test
   - one missing-file negative test
   - one chaining test proving Step 3 is re-checked immediately after Step 2 in the same deterministic pass
6. Remove the stale negative requirement about a current-task-created mode lacking a required write proof.
7. Do not change the Step 1, Step 2, Step 4, or Step 5 requirements in this step.

## Step 2
[x] Add `pi-planning.md` to the deterministic support type and workflow allowlist.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`

Exact edits:
1. In [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L33-L40), add the exact literal union member `"pi-planning.md"` to `DeterministicPlaceholderWorkflowName`.
2. Insert `"pi-planning.md"` directly after `"create-epics.md"` so the order becomes:
   - `"code-review.md"`
   - `"create-epics.md"`
   - `"pi-planning.md"`
   - `"dev-story.md"`
   - remaining existing members unchanged
3. In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L32-L44), add `workflowName === "pi-planning.md"` to `isDeterministicPlaceholderWorkflowSupported(...)`.
4. Insert the new allowlist clause directly after `workflowName === "create-epics.md"` and before `workflowName === "dev-story.md"`.
5. Do not change any other type, deterministic state shape, or allowlist member in this step.

## Step 3
[x] Add a dedicated deterministic evaluator for `pi-planning.md` Steps 1 through 3, and keep Steps 4 and 5 non-deterministic.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`

Exact edits:
1. In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L742-L810), insert a new helper named exactly `evaluatePiPlanningStep(args: { taskState: TaskState; stepNumber: number; toolContext?: DeterministicPlaceholderToolContext }): Promise<DeterministicStepEvaluationResult>` directly after `evaluateCreateEpicsStep(...)` and before `evaluateWriteRemediationStoryStep(...)`.
2. Inside `evaluatePiPlanningStep(...)`, read the merged placeholders once with `getMergedPlaceholderValues(args.taskState)` into a local named exactly `placeholders`.
3. Still inside `evaluatePiPlanningStep(...)`, trim these placeholders into locals with these exact names:
   - `epicsDocument = placeholders.epics_document?.trim()`
   - `architectureDocument = placeholders.architecture_document?.trim()`
   - `targetEpic = placeholders.target_epic?.trim()`
   - `epicDeliverySpec = placeholders.epic_delivery_spec?.trim()`
4. Implement `switch (args.stepNumber)` with exact cases `1`, `2`, `3`, and `default`.
5. `case 1` must:
   - return `{ completed: false }` when `epicsDocument` is absent or empty
   - return `{ completed: false }` when `architectureDocument` is absent or empty
   - otherwise return exactly:
     - `completed: true`
     - `reason: "epics_document and architecture_document were already available in workflow placeholder state."`
6. `case 2` must:
   - return `{ completed: false }` when `targetEpic` is absent or empty after trimming
   - otherwise return exactly:
     - `completed: true`
     - `reason: "target_epic was already available in workflow placeholder state."`
7. `case 3` must:
   - return `{ completed: false }` when `epicDeliverySpec` is absent or empty
   - resolve the placeholder path with `resolveArtifactPlaceholderPath(placeholders, epicDeliverySpec)` into a local named exactly `resolvedEpicDeliverySpecPath`
   - return `{ completed: false }` when `fileExistsForPlaceholderWorkflowWriteProof(resolvedEpicDeliverySpecPath)` resolves `false`
   - if `taskStateHasPlaceholderWorkflowWriteProof(args.taskState, resolvedEpicDeliverySpecPath)` is `true`, return exactly:
     - `completed: true`
     - `reason: "epic_delivery_spec was written during this task and the artifact still exists."`
   - otherwise return exactly:
     - `completed: true`
     - `reason: "epic_delivery_spec already resolves to an existing file."`
8. Do not require `task_progress`, `toolContext`, or any file-content parsing for `pi-planning.md` Step 3.
9. Do not add any deterministic completion branch for Step 4 or Step 5. `default` must remain `return { completed: false }`.
10. In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L812-L875), add a dedicated dispatch branch:
    - `if (args.workflowName === "pi-planning.md") { return evaluatePiPlanningStep({ ... }) }`
11. Insert the new dispatch branch directly after the existing `create-epics.md` branch and before the `dev-story.md` branch.
12. Do not modify any other workflow evaluator, helper contract, or progression loop in this step.

## Step 4
[x] Add deterministic progression tests for `pi-planning.md` support, Steps 1 through 3, immediate Step 3 re-checking, and non-deterministic Steps 4 and 5.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`

Exact edits:
1. In [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L51-L63), extend the supported-workflows test with:
   - `expect(isDeterministicPlaceholderWorkflowSupported("pi-planning.md")).to.equal(true)`
   - `expect(isDeterministicPlaceholderWorkflowSupported("pi-planning")).to.equal(false)`
2. Insert the two new assertions directly after the existing `create-epics.md` and `create-epics` assertions.
3. In that same test, do not remove or reorder any other existing assertions.
4. In [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L2775-L2791), insert the full `pi-planning.md` test block immediately before `it("leaves still-unsupported placeholder workflows unchanged and adds no notices", ...)`.
5. Add the following tests with these exact titles and exact expectations:

   `it("completes pi-planning step 1 when epics_document and architecture_document are present", async () => { ... })`
   - `workflowName: "pi-planning.md"`
   - workflow headings exactly:
     - `## Step 1:  (System-Owned) Gather Requirements`
     - `## Step 2: (System-Owned) Identify Target Epic`
   - checklist exactly:
     - `- [ ] Step 1:  (System-Owned) Gather Requirements`
     - `- [ ] Step 2: (System-Owned) Identify Target Epic`
   - placeholder values exactly:
     - `epics_document: "/tmp/epics.md"`
     - `architecture_document: "/tmp/architecture.md"`
   - expected checklist:
     - `- [x] Step 1:  (System-Owned) Gather Requirements`
     - `- [ ] Step 2: (System-Owned) Identify Target Epic`
   - expected reason exactly:
     - `epics_document and architecture_document were already available in workflow placeholder state.`

   `it("does not complete pi-planning step 1 when epics_document is missing", async () => { ... })`
   - same Step 1 heading/checklist shape as above
   - only `architecture_document` present
   - expected checklist unchanged
   - expected notices `[]`

   `it("does not complete pi-planning step 1 when architecture_document is missing", async () => { ... })`
   - same Step 1 heading/checklist shape as above
   - only `epics_document` present
   - expected checklist unchanged
   - expected notices `[]`

   `it("completes pi-planning step 2 when target_epic is present and non-empty", async () => { ... })`
   - workflow headings exactly:
     - `## Step 2: (System-Owned) Identify Target Epic`
     - `## Step 3:  (System-Owned) Build Epic Delivery Spec`
   - checklist exactly:
     - `- [ ] Step 2: (System-Owned) Identify Target Epic`
     - `- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec`
   - placeholder values exactly:
     - `target_epic: "Epic 3 - Checkout"`
   - expected checklist advances only Step 2
   - expected reason exactly:
     - `target_epic was already available in workflow placeholder state.`

   `it("does not complete pi-planning step 2 when target_epic is missing", async () => { ... })`
   - same Step 2 / Step 3 heading and checklist shape
   - no `target_epic`
   - expected checklist unchanged
   - expected notices `[]`

   `it("does not complete pi-planning step 2 when target_epic is blank after trimming", async () => { ... })`
   - same Step 2 / Step 3 heading and checklist shape
   - placeholder values exactly:
     - `target_epic: "   "`
   - expected checklist unchanged
   - expected notices `[]`

   `it("completes pi-planning step 3 when epic_delivery_spec already resolves to an existing file", async () => { ... })`
   - create `tempDir`, `outputDir = path.join(tempDir, "output")`, and `artifactPath = path.join(outputDir, "implementation-artifacts", "epic-3-delivery-spec.md")`
   - workflow heading exactly:
     - `## Step 3:  (System-Owned) Build Epic Delivery Spec`
   - checklist exactly:
     - `- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec`
   - `stablePlaceholderValues` exactly:
     - `cwd: tempDir`
     - `project_root: tempDir`
   - `placeholderValues` exactly:
     - `epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md")`
   - write the artifact with `writeFileWithMtime(...)`
   - do not record a task write proof
   - expected checklist:
     - `- [x] Step 3:  (System-Owned) Build Epic Delivery Spec`
   - expected reason exactly:
     - `epic_delivery_spec already resolves to an existing file.`

   `it("completes pi-planning step 3 when epic_delivery_spec resolves to an existing task-written file", async () => { ... })`
   - use the same temp-dir layout, heading, checklist, and relative placeholder path as the previous test
   - write the artifact with `writeFileWithMtime(...)`
   - record the current-task write proof with `recordTaskWriteProof(taskState, artifactPath)`
   - expected checklist:
     - `- [x] Step 3:  (System-Owned) Build Epic Delivery Spec`
   - expected reason exactly:
     - `epic_delivery_spec was written during this task and the artifact still exists.`

   `it("does not complete pi-planning step 3 when epic_delivery_spec is missing", async () => { ... })`
   - same Step 3 heading and checklist shape
   - no `epic_delivery_spec`
   - expected checklist unchanged
   - expected notices `[]`

   `it("does not complete pi-planning step 3 when epic_delivery_spec resolves to a missing file", async () => { ... })`
   - same Step 3 heading and checklist shape
   - `stablePlaceholderValues.cwd` and `project_root` point at a temp dir
   - `placeholderValues.epic_delivery_spec` is the relative path `output/implementation-artifacts/missing-delivery-spec.md`
   - do not create the file
   - expected checklist unchanged
   - expected notices `[]`

   `it("advances through pi-planning steps 1 and 2 in one deterministic pass when the setup placeholders are already present", async () => { ... })`
   - workflow headings exactly:
     - `## Step 1:  (System-Owned) Gather Requirements`
     - `## Step 2: (System-Owned) Identify Target Epic`
     - `## Step 3:  (System-Owned) Build Epic Delivery Spec`
   - checklist exactly:
     - `- [ ] Step 1:  (System-Owned) Gather Requirements`
     - `- [ ] Step 2: (System-Owned) Identify Target Epic`
     - `- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec`
   - placeholder values exactly:
     - `epics_document: "/tmp/epics.md"`
     - `architecture_document: "/tmp/architecture.md"`
     - `target_epic: "Epic 3 - Checkout"`
   - do not set `epic_delivery_spec`
   - expected checklist exactly:
     - `- [x] Step 1:  (System-Owned) Gather Requirements`
     - `- [x] Step 2: (System-Owned) Identify Target Epic`
     - `- [ ] Step 3:  (System-Owned) Build Epic Delivery Spec`
   - expected notice count exactly `2`
   - expected notice reasons in order:
     - `epics_document and architecture_document were already available in workflow placeholder state.`
     - `target_epic was already available in workflow placeholder state.`

   `it("advances through pi-planning steps 1, 2, and 3 in one deterministic pass when epic_delivery_spec already resolves to an existing file", async () => { ... })`
   - use the same Step 1 / Step 2 / Step 3 headings and checklist shape as the previous test
   - set `stablePlaceholderValues.cwd` and `project_root` to a temp dir
   - set `placeholderValues` exactly:
     - `epics_document: "/tmp/epics.md"`
     - `architecture_document: "/tmp/architecture.md"`
     - `target_epic: "Epic 3 - Checkout"`
     - `epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md")`
   - create the artifact on disk at the resolved relative path
   - do not record a write proof
   - expected checklist exactly:
     - `- [x] Step 1:  (System-Owned) Gather Requirements`
     - `- [x] Step 2: (System-Owned) Identify Target Epic`
     - `- [x] Step 3:  (System-Owned) Build Epic Delivery Spec`
   - expected notice count exactly `3`
   - expected final notice reason exactly:
     - `epic_delivery_spec already resolves to an existing file.`

   `it("does not deterministically complete pi-planning step 4 when setup placeholders and artifacts are already present", async () => { ... })`
   - workflow heading exactly:
     - `## Step 4: Set Expectations`
   - checklist exactly:
     - `- [ ] Step 4: Set Expectations`
   - include populated placeholder values for:
     - `epics_document`
     - `architecture_document`
     - `target_epic`
     - `epic_delivery_spec`
   - create the resolved `epic_delivery_spec` artifact on disk
   - expected checklist unchanged
   - expected notices `[]`

   `it("does not deterministically complete pi-planning step 5 when setup placeholders and artifacts are already present", async () => { ... })`
   - workflow heading exactly:
     - `## Step 5: Build User Stories`
   - checklist exactly:
     - `- [ ] Step 5: Build User Stories`
   - include the same populated placeholder values and existing `epic_delivery_spec` artifact setup as the Step 4 negative test
   - expected checklist unchanged
   - expected notices `[]`

6. Use the existing helper functions already present in the file:
   - `createTaskState(...)`
   - `recordTaskWriteProof(...)`
   - `getChecklistMarkdown(...)`
   - `writeFileWithMtime(...)`
7. Do not change any existing `create-epics.md` tests in this step.

## Step 5
[x] Extend the shared `workflow_progress_request` support map to cover `pi-planning.md` Steps 4 and 5 only.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/workflow-progress-request.ts`

Exact edits:
1. In [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1-L4), add the exact entry:
   - `"pi-planning.md": [4, 5],`
2. Insert that entry directly after `"create-epics.md": [3],`.
3. In [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L10-L21), extend `normalizeWorkflowProgressRequestWorkflowName(...)` with one new branch:
   - return exactly `"pi-planning.md"` for either `pi-planning.md` or `pi-planning`
4. Insert the new `pi-planning` normalization branch directly after the existing `create-epics` branch and before `return undefined`.
5. Do not change:
   - `WORKFLOW_PROGRESS_REQUEST_QUESTION`
   - `WORKFLOW_PROGRESS_REQUEST_OPTIONS`
   - helper signatures
   - the local `allowedSteps: readonly number[]` typing
   - any existing `create-prd.md` or `create-epics.md` step lists

## Step 6
[x] Add focused support-map, prompt-guidance, and handler tests for `pi-planning.md` Steps 4 and 5 without changing prompt-component source.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

Exact edits:
1. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L355-L386), rename the existing gating test to exactly:
   - `gates workflow_progress_request to create-prd steps 3 through 14, create-epics step 3, and pi-planning steps 4 and 5`
2. Keep the existing `create-prd.md` Step 3 and Step 2 assertions unchanged.
3. Keep the existing `create-epics.md` Step 3 and Step 2 assertions unchanged.
4. Add three new assertions in that same test:
   - `activePlaceholderWorkflowName: "pi-planning.md", activePlaceholderWorkflowStepNumber: 4` must return `true`
   - `activePlaceholderWorkflowName: "pi-planning.md", activePlaceholderWorkflowStepNumber: 5` must return `true`
   - `activePlaceholderWorkflowName: "pi-planning.md", activePlaceholderWorkflowStepNumber: 3` must return `false`
5. In [task_progress.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts#L68-L98), keep the existing `create-prd.md` and `create-epics.md` tests unchanged.
6. Immediately after the `create-epics.md` test and before the closing `})` for the `"placeholder workflow task progress prompt"` describe block, add a new test titled exactly:
   - `teaches workflow_progress_request for pi-planning step 4 even when the workflow is deterministic`
7. That new `task_progress` test must:
   - set `managedWorkflowActive: false`
   - set `activeWorkflowSupportsPlaceholders: true`
   - set `activeDeterministicPlaceholderWorkflowEnabled: true`
   - set `activePlaceholderWorkflowName: "pi-planning.md"`
   - set `activePlaceholderWorkflowStepNumber: 4`
   - assert the returned string contains `workflow_progress_request`
   - assert it does not contain `send_user_message`
   - assert it contains `Do not include \`task_progress\` on \`workflow_progress_request\``
8. In [WorkflowProgressRequestToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts#L102-L161), keep the existing `create-epics.md` Yes-path test and the existing `create-prd.md` No-path test unchanged.
9. Immediately after the existing `create-prd.md` No-path test and before `it("returns a tool error when checklist advancement is rejected", ...)`, add two new tests with these exact titles:
   - `queues selected Yes responses for pi-planning after completing step 4`
   - `queues selected No responses for pi-planning step 5 without advancing the workflow`
10. The new Step 4 Yes-path test must:
    - use `askResult: { text: "Yes" }`
    - set `config.taskState.activePlaceholderWorkflowSource = { name: "pi-planning.md" } as any`
    - set `config.taskState.currentFocusChainChecklist = "- [ ] Step 4: Set Expectations"`
    - assert `callbacks.updateFCListFromToolResponse` was called once with `FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL`
    - assert `config.taskState.pendingResponseToolFollowup` exactly equals:
      - `toolName: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST`
      - `route: "normal_user_turn"`
      - `text: "Yes"`
      - `images: undefined`
      - `files: undefined`
11. The new Step 5 No-path test must:
    - use `askResult: { text: "No" }`
    - set `config.taskState.activePlaceholderWorkflowSource = { name: "pi-planning.md" } as any`
    - set `config.taskState.currentFocusChainChecklist = "- [ ] Step 5: Build User Stories"`
    - assert `callbacks.updateFCListFromToolResponse` was not called
    - assert `config.taskState.pendingResponseToolFollowup` exactly equals:
      - `toolName: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST`
      - `route: "normal_user_turn"`
      - `text: "No"`
      - `images: undefined`
      - `files: undefined`
12. Do not modify:
    - [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts)
    - [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts)
    - [WorkflowProgressRequestToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts)

## Step 7
[x] Update the deterministic workflow progression readme so it reflects the new `pi-planning.md` support and its Step 4/5 boundary.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md`

Exact edits:
1. In [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L68-L81), add `pi-planning.md` to the supported workflows list directly after `create-epics.md`.
2. In [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L97-L129), add a new `pi-planning.md` evaluator example block directly after the `create-epics.md` block with these exact bullets:
   - `- \`pi-planning.md\``
   - `  - Step 1 completes when \`epics_document\` and \`architecture_document\` already exist in workflow placeholder state`
   - `  - Step 2 completes when \`target_epic\` already exists in workflow placeholder state and is non-empty after trimming`
   - `  - Step 3 completes when \`epic_delivery_spec\` resolves to an existing file; a current-task write proof only changes the completion reason`
   - `  - Steps 4 and 5 are not evaluator-completed; they transition through \`workflow_progress_request\``
3. In [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L170-L194), add two new examples directly after the existing `create-epics.md` example:
   - `- In \`pi-planning.md\`, if \`epics_document\` and \`architecture_document\` already exist in placeholder state, Step 1 can complete immediately on the next deterministic pass.`
   - `- In \`pi-planning.md\`, if Step 2 auto-completes and \`epic_delivery_spec\` already resolves to an existing file, Step 3 can also auto-complete in the same deterministic pass without another assistant turn.`
4. Do not add any readme claim that deterministic progression auto-completes Step 4 or Step 5 for `pi-planning.md`.

## Step 8
[x] Run the prescribed verification commands in order, then perform a string-contract audit.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/pi-planning/deterministic-progression-action-plan.md`

Exact commands:
1. `npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
2. `npm run test:unit -- src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
3. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts`
4. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
5. `npm run test:unit -- src/core/task/__tests__/responseToolTurnFlow.test.ts`
6. `npx tsc --noEmit`
7. `rg -n "pi-planning\\.md|workflow_progress_request|epic_delivery_spec|target_epic|epics_document|architecture_document" src/core/task/TaskState.ts src/core/task/focus-chain/deterministicPlaceholderProgression.ts src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts src/shared/workflow-progress-request.ts src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/prompts/system-prompt/__tests__/task_progress.test.ts src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts docs/workflows/deterministic-workflow-progression-readme.md`

Execution rules:
- Run the commands exactly in the order listed above.
- Stop on the first failing command.
- Do not mark this step complete unless every command succeeds.
- Do not edit additional files in response to a failing verification command unless a prior step in this plan explicitly prescribed that exact edit.
