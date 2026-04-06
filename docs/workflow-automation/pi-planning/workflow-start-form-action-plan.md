---
title: PI Planning Workflow Start Form Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/doc change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - This plan implements only the workflow-start form requirements in `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/pi-planning/workflow-start-form-requirements.md`.
  - Do not modify `/Users/robertboston/Documents/Cline/Workflows/pi-planning.md`, `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/pi-planning/progress-tracker.md`, production workflow-form runtime source, workflow-form shared types, or any non-test runtime files while executing this plan.
  - This slice is test-first because the live runtime already implements the generic workflow-start path. If any prescribed test exposes a runtime gap that would require production source edits, stop and ask for input instead of expanding scope on your own.
---

# PI Planning Workflow Start Form Action Plan

This plan implements the workflow-start form contract for:

- [workflow-start-form-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/pi-planning/workflow-start-form-requirements.md)

Live seams verified before authoring this plan:

- slash-command workflow-start candidate generation is handled generically in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L46-L98)
- Step 1 directive parsing is handled by [workflowStartRequirements.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/workflowStartRequirements.ts#L17-L44)
- workflow-start form definition and submission are handled by the generic resolver in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L632-L690)
- generic start-form copy currently resolves to:
  - title `Workflow Start Inputs`
  - prompt `Please provide the inputs necessary to start this workflow.`
  - success message `Workflow start inputs were stored.`
  - failure fallback `The workflow form could not store the workflow start inputs. Review the values and try again.`
- workflow-start field typing for `set_workflow_placeholders` resolves from `additionalProperties` as `{ type: "string" }` in [schema.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/schema.test.ts#L13-L19)
- existing sibling test patterns already cover:
  - slash-command start candidates in [WorkflowFormTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts#L13-L180)
  - workflow-start registry definitions and serialization in [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L33-L111) and [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L588-L635)
  - end-to-end start-form persistence in [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L2612-L2769)

Locked decisions for this pass:

- `pi-planning.md` uses the generic workflow-start copy rather than a workflow-specific override.
- this plan does not add a `workflowStartFormOverrides["pi-planning.md"]` entry.
- this plan does not change workflow-form transport, schema typing, or production runtime behavior unless a prescribed test proves a real gap
- blank optional `epic_delivery_spec` must be omitted from serialized `set_workflow_placeholders` input
- supplied `epic_delivery_spec` must be included in serialized input and persisted into active placeholder workflow values

## Step 1
[ ] Add `pi-planning.md` slash-command start-candidate coverage to the trigger tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`

Exact edits:
1. In [WorkflowFormTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts#L64-L141), insert three new `pi-planning.md` tests immediately after the existing `create-epics` positive/negative start-candidate tests and before `it("returns undefined when the current turn did not activate a placeholder workflow by slash command", ...)`.
2. Add a positive test titled exactly:
   - `returns a slash-command start candidate for pi-planning step 1 when the workflow uses canonical directive placeholders`
3. In that positive test:
   - set `cwd: "/workspace"`
   - set `taskState.activePlaceholderWorkflowSource.name` to `"pi-planning.md"`
   - set `taskState.activePlaceholderWorkflowSource.contents` exactly to:
     ```md
     # pi-planning

     ## Step 1:  (System-Owned) Gather Requirements
     Required: {epics_document}, {architecture_document}
     Optional: {epic_delivery_spec}

     ## Step 2: (System-Owned) Identify Target Epic
     Continue the workflow.
     ```
   - set `currentFocusChainChecklist` exactly to:
     - `- [ ] Step 1: Gather Requirements`
     - `- [ ] Step 2: Identify Target Epic`
   - set `activePlaceholderWorkflowStableValues` to `{}`
   - set `activePlaceholderWorkflowValues` to `{}`
   - set `currentTurnSlashCommandAction` to:
     - `type: "activate_placeholder_workflow"`
     - `workflowId: "pi-planning"`
     - `workflowSource.name: "pi-planning.md"`
   - assert `candidate?.resolverId === "placeholder_workflow_start_set_workflow_placeholders"`
   - assert `candidate?.initialPhase === "collect_inputs"`
   - assert `candidate?.context` exactly equals:
     - `workflowName: "pi-planning.md"`
     - `workflowStartRequirements.requiredFieldKeys: ["epics_document", "architecture_document"]`
     - `workflowStartRequirements.optionalFieldKeys: ["epic_delivery_spec"]`
4. Add a negative test titled exactly:
   - `returns undefined for pi-planning step 1 when the workflow regresses to backticked bare keys`
5. In that negative test:
   - use the same `cwd`, workflow name, slash-command action, and checklist shape as the positive test
   - set `taskState.activePlaceholderWorkflowSource.contents` exactly to:
     ```md
     # pi-planning

     ## Step 1:  (System-Owned) Gather Requirements
     Required: `epics_document`, `architecture_document`
     Optional: `epic_delivery_spec`
     ```
   - assert `candidate === undefined`
6. Add a second negative test titled exactly:
   - `returns undefined for pi-planning when step 2 is already the active checklist step`
7. In that step-2-active negative test:
   - use the same slash-command activation context and the same canonical directive workflow contents as the positive test
   - set `currentFocusChainChecklist` exactly to:
     - `- [x] Step 1: Gather Requirements`
     - `- [ ] Step 2: Identify Target Epic`
   - assert `candidate === undefined`
8. Do not modify any existing `review-adversarial-general.md` or `create-epics.md` trigger tests.

## Step 2
[ ] Add `pi-planning.md` generic workflow-start definition and serialization coverage to the resolver tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

Exact edits:
1. In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L33-L62), insert a new `pi-planning.md` registry-definition test immediately after the existing `create-epics` definition test and before `it("omits blank optional create-epics values when serializing set_workflow_placeholders", ...)`.
2. Title that new test exactly:
   - `builds the pi-planning workflow-start definition with the generic copy`
3. In that new definition test:
   - obtain the resolver with `getWorkflowFormResolverDefinition(PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID)`
   - call `resolver.buildDefinition(...)` with:
     - `sessionId: "session-pi-planning-definition"`
     - `resolverId: "placeholder_workflow_start_set_workflow_placeholders"`
     - `triggerSource: "slash_command"`
     - `owner.workflowName: "pi-planning.md"`
     - `owner.stepNumber: 1`
     - `phase: "collect_inputs"`
     - `initialPhase: "collect_inputs"`
     - `values: {}`
     - `context.workflowName: "pi-planning.md"`
     - `context.workflowStartRequirements.requiredFieldKeys: ["epics_document", "architecture_document"]`
     - `context.workflowStartRequirements.optionalFieldKeys: ["epic_delivery_spec"]`
   - capture `const fields = definition.pages.collect_inputs?.fields ?? []`
   - assert:
     - `definition.title === "Workflow Start Inputs"`
     - `definition.pages.collect_inputs?.prompt === "Please provide the inputs necessary to start this workflow."`
     - `definition.successMessage === "Workflow start inputs were stored."`
     - `resolver.buildToolExecutionFailureFallbackMessage(...) === "The workflow form could not store the workflow start inputs. Review the values and try again."`
     - `fields.map((field) => field.key)` exactly equals `["epics_document", "architecture_document", "epic_delivery_spec"]`
     - `fields.map((field) => field.label)` exactly equals `["Epics Document", "Architecture Document", "Epic Delivery Spec"]`
     - `fields.every((field) => field.control === "text") === true`
     - `fields.every((field) => field.placeholder === "/absolute/path/to/file-or-artifact") === true`
4. Immediately after the existing `create-epics` blank-optional serialization test and before `it("declares the code-review step 3 review-input resolver as automatic workflow preparation", ...)`, add two new serialization tests.
5. Add the first new serialization test titled exactly:
   - `omits blank optional pi-planning values when serializing set_workflow_placeholders`
6. In that blank-optional test:
   - use `sessionId: "session-pi-planning-serialize-required-only"`
   - use `owner.workflowName: "pi-planning.md"`
   - use `context.workflowName: "pi-planning.md"`
   - set `requiredFieldKeys: ["epics_document", "architecture_document"]`
   - set `optionalFieldKeys: ["epic_delivery_spec"]`
   - pass raw values:
     - `epics_document: { rawValue: "/abs/epics.md" }`
     - `architecture_document: { rawValue: "/abs/architecture.md" }`
     - `epic_delivery_spec: { rawValue: "" }`
   - assert `outcome.toolName === "set_workflow_placeholders"`
   - assert `outcome.toolInput` exactly equals:
     - `values.epics_document: "/abs/epics.md"`
     - `values.architecture_document: "/abs/architecture.md"`
   - assert `outcome.toolParams` exactly equals:
     - `values: JSON.stringify({ epics_document: "/abs/epics.md", architecture_document: "/abs/architecture.md" })`
7. Add the second new serialization test titled exactly:
   - `includes epic_delivery_spec when serializing pi-planning workflow-start inputs`
8. In that optional-supplied test:
   - use `sessionId: "session-pi-planning-serialize-with-spec"`
   - keep the same resolver/session structure and field requirements as the prior test
   - pass raw values:
     - `epics_document: { rawValue: "/abs/epics.md" }`
     - `architecture_document: { rawValue: "/abs/architecture.md" }`
     - `epic_delivery_spec: { rawValue: "/abs/epic-delivery-spec.md" }`
   - assert `outcome.toolInput` exactly equals:
     - `values.epics_document: "/abs/epics.md"`
     - `values.architecture_document: "/abs/architecture.md"`
     - `values.epic_delivery_spec: "/abs/epic-delivery-spec.md"`
   - assert `outcome.toolParams` exactly equals:
     - `values: JSON.stringify({ epics_document: "/abs/epics.md", architecture_document: "/abs/architecture.md", epic_delivery_spec: "/abs/epic-delivery-spec.md" })`
9. Do not modify the production `WorkflowFormRegistry.ts` source in this step.

## Step 3
[ ] Add end-to-end `pi-planning.md` workflow-start persistence coverage for both required-only and optional-supplied submissions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Exact edits:
1. In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L2612-L2769), insert two new `pi-planning.md` workflow-start tests immediately after the existing `create-epics` workflow-start test and before `it("prefers appended decorated tool_result JSON over preceding tool text when evaluating workflow-form tool success", ...)`.
2. Add the first new test titled exactly:
   - `opens the pi-planning workflow-start form on slash-command activation and stores only the required placeholders when the optional spec is omitted`
3. In that required-only end-to-end test:
   - create `workflowStartSession` with:
     - `sessionId: "wf-session-pi-planning-start-required-only"`
     - `resolverId: "placeholder_workflow_start_set_workflow_placeholders"`
     - `triggerSource: "slash_command"`
     - `owner.workflowName: "pi-planning.md"`
     - `owner.stepNumber: 1`
     - `phase: "collect_inputs"`
     - `initialPhase: "collect_inputs"`
     - `values.epics_document.rawValue: "docs/epics.md"`
     - `values.architecture_document.rawValue: "docs/architecture.md"`
     - do not include `epic_delivery_spec` in `values`
     - `context.workflowName: "pi-planning.md"`
     - `context.workflowStartRequirements.requiredFieldKeys: ["epics_document", "architecture_document"]`
     - `context.workflowStartRequirements.optionalFieldKeys: ["epic_delivery_spec"]`
   - set `taskState.activePlaceholderWorkflowId = "pi-planning.md"`
   - set `taskState.activePlaceholderWorkflowSource.name = "pi-planning.md"`
   - set `taskState.activePlaceholderWorkflowSource.contents` exactly to:
     ```md
     # pi-planning

     ## Step 1:  (System-Owned) Gather Requirements
     Required: {epics_document}, {architecture_document}
     Optional: {epic_delivery_spec}

     ## Step 2: (System-Owned) Identify Target Epic
     Extract the list of epics from {epics_document}.

     ## Step 3:  (System-Owned) Build Epic Delivery Spec
     Build the delivery spec.
     ```
   - set `taskState.currentFocusChainChecklist` exactly to:
     - `- [ ] Step 1: Gather Requirements`
     - `- [ ] Step 2: Identify Target Epic`
     - `- [ ] Step 3: Build Epic Delivery Spec`
   - use the same fake-task structure and `buildInteractiveWorkflowFormPayload(...)` pattern as the existing `create-epics` test
   - on first render, set `pendingWorkflowFormOutcome.toolName` to `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS`
   - set the invoked `toolInput` exactly to:
     - `values.epics_document: "docs/epics.md"`
     - `values.architecture_document: "docs/architecture.md"`
   - set `toolParams.values` to `JSON.stringify({ epics_document: "docs/epics.md", architecture_document: "docs/architecture.md" })`
   - inside `executeWorkflowFormToolAndSync`, assert the same `toolInput` and `toolParams`
   - inside `executeWorkflowFormToolAndSync`, set `taskState.activePlaceholderWorkflowValues` exactly to:
     - `epics_document: "docs/epics.md"`
     - `architecture_document: "docs/architecture.md"`
   - after `maybeResolveWorkflowFormBeforeApiTurn.call(fakeTask, { type: "activate_placeholder_workflow", workflowId: "pi-planning", workflowSource.name: "pi-planning.md" })`, assert:
     - `createSession` was called once
     - `createSession.firstCall.args[0]?.resolverId === "placeholder_workflow_start_set_workflow_placeholders"`
     - `executeWorkflowFormToolAndSync.calledOnce === true`
     - `taskState.activePlaceholderWorkflowValues` exactly equals `{ epics_document: "docs/epics.md", architecture_document: "docs/architecture.md" }`
     - `taskState.activePlaceholderWorkflowValues?.epic_delivery_spec === undefined`
     - `taskState.activeWorkflowFormSession === undefined`
     - `fakeTask.renderWorkflowFormMessage.secondCall.args[1] === "ask"`
4. Add the second new test titled exactly:
   - `opens the pi-planning workflow-start form on slash-command activation and stores epic_delivery_spec when it is supplied`
5. In that optional-supplied end-to-end test:
   - mirror the fake-task/session structure from the required-only test
   - use `sessionId: "wf-session-pi-planning-start-with-spec"`
   - include `values.epic_delivery_spec.rawValue: "docs/epic-delivery-spec.md"`
   - set the first rendered `toolInput.values` exactly to:
     - `epics_document: "docs/epics.md"`
     - `architecture_document: "docs/architecture.md"`
     - `epic_delivery_spec: "docs/epic-delivery-spec.md"`
   - set `toolParams.values` to the matching JSON string
   - inside `executeWorkflowFormToolAndSync`, set `taskState.activePlaceholderWorkflowValues` exactly to:
     - `epics_document: "docs/epics.md"`
     - `architecture_document: "docs/architecture.md"`
     - `epic_delivery_spec: "docs/epic-delivery-spec.md"`
   - assert after resolution that `taskState.activePlaceholderWorkflowValues` includes all three keys exactly
   - assert `taskState.activeWorkflowFormSession === undefined`
   - assert `fakeTask.renderWorkflowFormMessage.secondCall.args[1] === "ask"`
6. Do not modify existing `create-epics.md` workflow-start persistence coverage in this step.

## Step 4
[ ] Run the prescribed verification commands in order, then perform a string-contract audit.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/pi-planning/workflow-start-form-action-plan.md`

Exact commands:
1. `npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`
2. `npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`
3. `npm run test:unit -- src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
4. `npx tsc --noEmit`
5. `rg -n "pi-planning\\.md|epics_document|architecture_document|epic_delivery_spec|Workflow Start Inputs|Please provide the inputs necessary to start this workflow\\.|Workflow start inputs were stored\\.|The workflow form could not store the workflow start inputs\\. Review the values and try again\\." src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts docs/workflow-automation/pi-planning/workflow-start-form-requirements.md`

Execution rules:
- Run the commands exactly in the order listed above.
- Stop on the first failing command.
- Do not mark this step complete unless every command succeeds.
- Do not edit additional files in response to a failing verification command unless a prior step in this plan explicitly prescribed that exact edit.
