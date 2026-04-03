---
instructions:
  - Read this plan top to bottom before making any changes.
  - Execute only one step at a time.
  - Before starting a step, read that step in full, including its allowed-files list and exact edit instructions.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not edit any file not listed in the current step's allowed-files list.
  - If any ambiguity is discovered, or any additional file or behavior change appears necessary, stop and ask the user before proceeding.
  - Preserve all exact strings, resolver ids, workflow filenames, placeholder keys, and fallback messages prescribed here.
---

# write-remediation-story Step 2 review-input workflow-form action plan

## Scope

This plan wires `write-remediation-story.md` Step 2 into the existing workflow-form runtime so it behaves like the live `code-review.md` Step 3 automatic review-input preparation path.

This plan is intentionally limited to:

- workflow-form resolver registration
- workflow-form trigger registration
- focused regression coverage
- canonical workflow-form documentation

This plan does **not** change:

- `build_review_input` tool handler behavior
- deterministic progression logic for `write-remediation-story.md`
- shared automatic-status UI copy
- the workflow source document at `/Users/robertboston/Documents/Cline/Workflows/write-remediation-story.md`

## Verified live contracts

- Canonical workflow source:
  - [`write-remediation-story.md:6`](/Users/robertboston/Documents/Cline/Workflows/write-remediation-story.md#L6) defines Step 2 as the system-owned `review-input.md` build step.
  - [`write-remediation-story.md:8`](/Users/robertboston/Documents/Cline/Workflows/write-remediation-story.md#L8) uses the canonical placeholder key `{review_input}`.
- Existing sibling trigger:
  - [`WorkflowFormTriggerRegistry.ts:135`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L135) maps `code-review.md` Step 3 to `code_review_step_3_review_input`.
  - [`WorkflowFormTriggerRegistry.ts:99`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L99) already contains the shared `shouldInterceptUntilCurrentTaskArtifactExists(...)` helper for `review_input`.
- Existing sibling resolver:
  - [`WorkflowFormRegistry.ts:25`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L25) defines `CODE_REVIEW_STEP_3_REVIEW_INPUT_RESOLVER_ID`.
  - [`WorkflowFormRegistry.ts:457`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L457) defines the automatic-status `build_review_input` resolver shape already used in production.
- Existing regression seams:
  - [`WorkflowFormTriggerRegistry.test.ts:185`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts#L185) covers the Step 3 `review_input` trigger mapping for `code-review.md`.
  - [`WorkflowFormRegistry.test.ts:18`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L18) and nearby tests cover the sibling resolver metadata, automatic-status presentation, tool request, and success evaluation.
  - [`placeholderWorkflowPersistence.test.ts:1863`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1863) covers the end-to-end pre-turn chaining path for `code-review.md`.
- Canonical workflow-form doc:
  - [`workflow-form-readme.md:164`](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L164) still documents only the `code-review.md` live path today.

## String-contract audit

Use these exact canonical names everywhere in this plan:

- workflow filename: `write-remediation-story.md`
- placeholder key: `review_input`
- tool name: `build_review_input`
- new resolver id: `write_remediation_story_step_2_review_input`
- automatic-status labels:
  - `Preparing workflow documents`
  - `Workflow documents ready`
  - `Automatic workflow preparation failed- falling back to manual LLM workflow preparation.`

[x] Step 1: Add a dedicated `write-remediation-story.md` Step 2 review-input resolver that reuses the existing automatic-status presentation and `build_review_input` tool contract.
Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`

In [`WorkflowFormRegistry.ts:24`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L24), add a new exported resolver id constant immediately after `CODE_REVIEW_STEP_3_REVIEW_INPUT_RESOLVER_ID`:

- `export const WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_RESOLVER_ID = "write_remediation_story_step_2_review_input"`

Immediately after the existing `CODE_REVIEW_STEP_3_REVIEW_INPUT_RESOLVER_ID` resolver block ending at [`WorkflowFormRegistry.ts:528`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L528), add a second resolver block keyed by `WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_RESOLVER_ID` with these exact properties:

- `id: WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_RESOLVER_ID`
- `toolName: ClineDefaultTool.BUILD_REVIEW_INPUT`
- `defaultInitialPhase: "collect_inputs"`

Make the resolver structurally parallel to the existing `code_review_step_3_review_input` resolver, but keep all user-visible Step references aligned to `write-remediation-story.md` Step 2:

- `title: "Review Input Artifact"`
- `toolDictionaryTitle: "Review Input Reference"`
- `toolDictionaryMarkdown: buildRuntimeToolDictionaryMarkdownFromConfig(buildReviewInputToolDictionaryConfig)`
- identical `presentation` object with the exact existing automatic-status labels
- `pages.collect_inputs.prompt`:
  - `The system will now build \`review-input.md\` from the stored \`story_path\` and the workflow-owned \`review-input.diff\` artifact.`
- `pages.collect_inputs.fields: []`
- `pages.retry_error.prompt`:
  - `The system could not produce \`review-input.md\` from the stored workflow inputs. Retry the request or return to the Step 2 fallback instructions.`
- `successMessage`:
  - `The Step 2 review-input artifact is ready.`
- `buildToolExecutionFailureFallbackMessage()`:
  - `The workflow form could not build the Step 2 review-input artifact from stored workflow inputs. The workflow will return to the Step 2 fallback instructions.`
- `buildToolExecutionRequest(_session, _values)` must return the same empty `toolInput` / `toolParams` object shape as the sibling resolver

In `evaluateToolExecutionResult(...)`, keep the exact same success/fallback semantics as the `code_review_step_3_review_input` resolver:

- success when parsed JSON has `persisted === true` and `review_input_available === true`
- `fallbackToAgent: true` for diff-mismatch fallback
- `fallbackToAgent: true` for workflow-form failure text
- `fallbackToAgent: true` for the generic fallback case

Do not refactor the sibling resolver into a shared helper in this pass. Keep this change explicit and workflow-specific.

[x] Step 2: Register the Step 2 trigger for `write-remediation-story.md` using the existing `review_input` interception helper, and add focused trigger/resolver tests.
Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

In [`WorkflowFormTriggerRegistry.ts:11`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L11), extend the import from `./WorkflowFormRegistry` to include `WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_RESOLVER_ID`.

In [`WorkflowFormTriggerRegistry.ts:125`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L125), insert a new registry entry immediately after the existing `code-review.md` Step 3 entry:

- `workflowName: "write-remediation-story.md"`
- `stepNumber: 2`
- `resolverId: WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_RESOLVER_ID`
- `shouldIntercept({ cwd, taskState }) { return shouldInterceptUntilCurrentTaskArtifactExists({ cwd, taskState, placeholderKey: "review_input" }) }`

In [`WorkflowFormTriggerRegistry.test.ts:179`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts#L179), add these exact tests after the existing `code-review.md` trigger mapping assertions:

- `it("maps write-remediation-story step 2 to the review-input workflow-form resolver", ...)`
  - assert `getWorkflowFormWorkflowStepTriggerDefinition("write-remediation-story.md", 2)?.resolverId === "write_remediation_story_step_2_review_input"`
- `it("does not intercept write-remediation-story step 2 when review_input has a current-task write proof and exists on disk", async () => ...)`
  - mirror the existing `code-review.md` Step 3 success fixture, but call `getWorkflowFormWorkflowStepTriggerDefinition("write-remediation-story.md", 2)`
- `it("intercepts write-remediation-story step 2 when review_input is missing a current-task write proof", async () => ...)`
  - mirror the existing `code-review.md` Step 3 missing-write-proof fixture, but call `getWorkflowFormWorkflowStepTriggerDefinition("write-remediation-story.md", 2)`

In [`WorkflowFormRegistry.test.ts:18`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L18), extend the imports to include `WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_RESOLVER_ID`.

Immediately after the existing `code-review step 3 review-input resolver` assertions, add these exact tests:

- `it("returns the write-remediation-story step 2 review-input resolver metadata by id", ...)`
  - assert `resolver.id === "write_remediation_story_step_2_review_input"`
  - assert `resolver.toolName === "build_review_input"`
- `it("declares the write-remediation-story step 2 review-input resolver as automatic workflow preparation", ...)`
  - build a resolver definition with `workflowName: "write-remediation-story.md"` and `stepNumber: 2`
  - assert `resolver.defaultInitialPhase === "collect_inputs"`
  - assert the exact same `automatic_status` presentation object as the sibling resolver
  - assert `definition.successMessage === "The Step 2 review-input artifact is ready."`
- `it("serializes the write-remediation-story step 2 review-input resolver into tool params", ...)`
  - assert empty `toolInput` and empty `toolParams`
- `it("treats persisted write-remediation-story review-input tool results as success", ...)`
  - assert parsed `{ persisted: true, review_input_available: true, artifact_path: "/tmp/review-input.md" }` returns `{ succeeded: true }`

Use `workflowName: "write-remediation-story.md"` and `stepNumber: 2` in every new `WorkflowFormSessionState` fixture for this step.

[x] Step 3: Add a focused pre-turn persistence regression proving `write-remediation-story.md` chains from the Step 1 start form into the automatic Step 2 review-input run instead of falling through to the LLM path.
Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Immediately after the existing chain test beginning at [`placeholderWorkflowPersistence.test.ts:1863`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1863), add a new test with this exact title:

- `it("chains slash-command workflow-start story_path success through write-remediation-story Step 2 automatic review-input preparation", async () => { ... })`

Build the fixture by adapting the existing `code-review.md` chain test with these exact workflow-specific changes:

- `taskState.activePlaceholderWorkflowId = "write-remediation-story.md"`
- `taskState.activePlaceholderWorkflowSource.name = "write-remediation-story.md"`
- remote workflow `contents` must use this exact minimal structure:

```md
# write-remediation-story

## Step 1: (System-Owned) Gather Necessary Inputs
Required: {story_path}

## Step 2: (System-Owned) Build review-input.md
System automatically generates a fresh version of review-input.md in this step.

## Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings
Write the remediation story here.
```

- initial checklist must be:
  - `- [ ] Step 1: Gather Necessary Inputs`
  - `- [ ] Step 2: Build review-input.md`
  - `- [ ] Step 3: Persist Remediation Story with Tasks / Subtasks Based on Recent Review Findings`
- there should be only two sessions:
  - workflow-start session with resolver id `placeholder_workflow_start_set_workflow_placeholders`
  - Step 2 session with resolver id `write_remediation_story_step_2_review_input`
- `workflowFormRuntime.buildPayload(...)` must return:
  - interactive payload for the workflow-start session
  - automatic-status payload for the Step 2 session via the existing `buildAutomaticWorkflowFormPayload(...)` helper
- `renderWorkflowFormMessage(...)` should set `pendingWorkflowFormOutcome` only for the first render, corresponding to the Step 1 placeholder submit
- `executeWorkflowFormToolAndSync(...)` must be called exactly twice:
  - call 1 stores `story_path` and updates the checklist so Step 2 becomes active
  - call 2 asserts `taskState.activePlaceholderWorkflowValues?.story_path === "docs/story.md"`, then stores `review_input`, records a current-task write proof for the `review-input.md` artifact, and updates the checklist so Step 2 is complete and Step 3 is now active

Add these exact assertions at the end of the test:

- `expect(fakeTask.workflowFormRuntime.createSession.callCount).to.equal(2)`
- first resolver id is `placeholder_workflow_start_set_workflow_placeholders`
- second resolver id is `write_remediation_story_step_2_review_input`
- second `initialPhase` is `"collect_inputs"`
- `expect(executeCallCount).to.equal(2)`
- `expect(taskState.activePlaceholderWorkflowValues?.story_path).to.equal("docs/story.md")`
- `expect(taskState.activePlaceholderWorkflowValues?.review_input).to.equal(path.join(tempDir, "workflow-output", "review-input.md"))`
- `expect(fakeTask.renderWorkflowFormMessage.secondCall.args[1]).to.equal("say")`

Do not expand this test into Step 3 remediation-story persistence. The purpose here is only to prove that the system-owned Step 2 workflow form auto-runs before any LLM fallback path can begin.

[x] Step 4: Update the canonical workflow-form readme so it documents `write-remediation-story.md` as a second live automatic review-input preparation consumer.
Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md`

In the `Usage` section at [`workflow-form-readme.md:164`](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L164), keep the existing `code-review.md` walkthrough intact. Immediately after that numbered list, add a short sibling paragraph:

- `Typical live write-remediation-story.md path: Step 1 may open the workflow-start form to collect \`story_path\`, then deterministic progression may advance directly into the Step 2 automatic workflow-preparation status card, which invokes \`build_review_input\` from stored workflow state before the AI reaches Step 3.`

In the `Examples` section at [`workflow-form-readme.md:186`](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L186), add a new example immediately after `Example 2: Workflow-start placeholder form`:

- `Example 3: Automatic review-input preparation`
- `resolver id: write_remediation_story_step_2_review_input`
- `tool: build_review_input`
- `presentation: automatic_status`
- `typical stage: collect_inputs`

Do not remove the existing `code_review_step_3_review_input` coverage from the doc.

[x] Step 5: Run the focused verification command, then perform a final consistency pass without expanding scope.
Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md`

Run this exact command from the repo root:

```bash
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts --exit
```

If the test command fails, fix only the files listed in Steps 1 through 4, then rerun the same command.

Before marking this plan complete, perform a final consistency pass and verify all of the following are true:

- every new registry reference uses `write-remediation-story.md`
- every new resolver reference uses `write_remediation_story_step_2_review_input`
- every new trigger/proof check uses the canonical placeholder key `review_input`
- every new Step reference says `Step 2`, not `Step 3`
- every automatic-status label matches the existing shared strings exactly
- no `build_review_input` handler, workflow source file, deterministic progression file, or UI rendering file was changed as part of this plan
