# Foundational Build Identified Issues

## Scope

This document records the confirmed foundational-build divergences identified in the activation/runtime seam audit performed on April 21, 2026.

This document does not treat intentionally deferred workflow-module buildout work as a foundational-build defect. It only records mismatches in global or foundational contracts that were already supposed to hold during the foundational phase.

Audited seam:
- workflow invocation
- workflow activation
- workflow-definition resolution
- runtime session creation
- persisted-session restore
- subagent child-workflow activation
- foundational tests and remediation entries that encode those seams

Within that audited seam, the list below is intended to be exhaustive.

## Confirmed Divergence Inventory

- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:314-367`
  - foundational planning rewrote `WorkflowRuntime.activateWorkflow(...)` to require a caller-supplied `WorkflowDefinition`
  - foundational planning moved the `activeWorkflowName` write into `WorkflowRuntime.activateWorkflow(...)`
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:812-819`
  - foundational planning made `task/index.ts` resolve the workflow definition before runtime activation
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:898-900`
  - foundational planning made `UseSkillToolHandler.ts` pass a resolved `WorkflowDefinition` into the runtime
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:1148-1158`
  - foundational planning made `SubagentRunner.ts` pass a resolved `WorkflowDefinition` into the runtime for child activation
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:2656-2667`
  - foundational planning codified direct object activation as the runtime test contract
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:4871-4918`
  - Phase 9.4 planning attempted to preserve the wrong contract with an in-memory definition-retention patch and matching tests
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:46-108`
  - live runtime accepts `workflow: WorkflowDefinition`, sets `activeWorkflowName`, and then re-resolves by name
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:684-708`
  - live restore path re-resolves from registry and then sets `activeWorkflowName` inside runtime
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:737-738`
  - live `getActiveWorkflowDefinition(...)` resolves only from `taskState.activeWorkflowName`
- `src/core/task/index.ts:1744-1761`
  - live slash-command activation resolves the definition before runtime activation and does not set `activeWorkflowName` itself
- `src/core/task/index.ts:1841-1849`
  - live resume path pre-seeds `activeWorkflowName` before delegating to runtime restore
- `src/core/task/tools/handlers/UseSkillToolHandler.ts:38-55`
  - live `useSkill` activation resolves the workflow and passes the definition object into runtime
- `src/core/task/tools/subagent/SubagentRunner.ts:941-948`
  - live child-workflow auto-activation resolves the workflow and passes the definition object into runtime
- `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:295-310`
  - live foundational runtime tests normalize direct object activation as the public runtime seam
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts:972-1078`
  - live subagent tests normalize the same runtime contract and prompt projection assumptions

## Derived Reason For The Drift

The foundational build drift appears to have been introduced by an unapproved boundary change during implementation planning:

- The approved architecture/requirements model is:
  - `task/index.ts` detects invocation
  - `task/index.ts` sets `activeWorkflowName`
  - `task/index.ts` invokes `WorkflowRuntime`
  - `WorkflowRuntime` resolves the active workflow definition from the shipped registry
- The implemented/planned model became:
  - caller resolves a `WorkflowDefinition`
  - caller passes that definition object into `WorkflowRuntime.activateWorkflow(...)`
  - `WorkflowRuntime.activateWorkflow(...)` sets `activeWorkflowName`

This shift was never authorized by the architecture or requirements documents. It appears to have been made because the caller-bootstrap shape reduced immediate implementation surface and made direct unit tests easier to write with inline workflow objects. That convenience-driven boundary rewrite then propagated through the runtime, caller seams, tests, and the Phase 9.4 remediation entries.

## Confirmed Issues

### 1. Foundational implementation planning rewrote the activation boundary away from the approved architecture

Approved source of truth:
- `docs/workflows/workflow-runtime/architecture.md:177-200`
- `docs/workflows/workflow-runtime/architecture.md:300-306`
- `docs/workflows/workflow-runtime/requirements.md:201-205`
- `docs/workflows/workflow-runtime/requirements.md:224-229`

Those documents require:
- the workflow invocation seam at `task/index.ts`
- `task/index.ts` to set `activeWorkflowName`
- `task/index.ts` to invoke the runtime
- `WorkflowRuntime` to resolve the active workflow definition from the shipped registry

The foundational implementation-order document instead prescribed:
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:314`
  - `activateWorkflow(args: { taskState: TaskState; workflow: WorkflowDefinition; parentSession?: ActiveWorkflowSession })`
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:356-367`
  - `activateWorkflow(...)` sets `taskState.activeWorkflowName = workflow.name`
  - `resolveNextAction(...)` resolves the definition only after activation

This is the original planning drift. The rest of the issues below are downstream consequences of this one.

### 2. `WorkflowRuntime.ts` implements the wrong public activation contract

Live code:
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:46-50`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:70-98`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:101-108`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:684-708`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:737-738`

Current behavior:
- `activateWorkflow(...)` requires a full `WorkflowDefinition`
- `activateWorkflow(...)` sets `taskState.activeWorkflowName`
- `resolveNextAction(...)` re-resolves from `taskState.activeWorkflowName`
- `restorePersistedSession(...)` resolves from the registry and then sets `taskState.activeWorkflowName`
- `getActiveWorkflowDefinition(...)` resolves only from `taskState.activeWorkflowName`

Why this is misaligned:
- the approved architecture says `WorkflowRuntime` should resolve the workflow definition as part of runtime orchestration after invocation seam identity has been set
- the live code instead makes the caller responsible for supplying the definition object up front

Impact:
- the runtime API itself is built against the wrong ownership boundary
- every caller of `activateWorkflow(...)` was then forced to conform to that wrong API

### 3. `task/index.ts` slash-command activation is doing registry-resolution work that the runtime was supposed to own

Approved source of truth:
- `docs/workflows/workflow-runtime/architecture.md:198-200`
- `docs/workflows/workflow-runtime/architecture.md:302-305`

Live code:
- `src/core/task/index.ts:1744-1761`

Current behavior:
- `task/index.ts` resolves the definition with `resolveWorkflowDefinition(action.workflowName)`
- `task/index.ts` does not set `taskState.activeWorkflowName` in the slash-command activation path before runtime activation
- `task/index.ts` passes that definition object into `this.workflowRuntime.activateWorkflow(...)`

Why this is misaligned:
- the architecture says the invocation seam should detect invocation, set `activeWorkflowName`, and invoke runtime
- the architecture says runtime should resolve the workflow definition
- slash-command activation currently does both invocation-seam work and runtime registry-resolution work in `task/index.ts`

Impact:
- the slash-command path is built against the wrong runtime boundary
- `task/index.ts` became a workflow-definition bootstrapper instead of remaining the thin invocation seam described in the architecture

### 4. `task/index.ts` resume path pre-seeds workflow identity before delegating restore to the runtime

Approved source of truth:
- `docs/workflows/workflow-runtime/architecture.md:222-229`
- `docs/workflows/workflow-runtime/requirements.md:227-229`

Live code:
- `src/core/task/index.ts:1840-1863`

Current behavior:
- `restoreBmadStateFromMetadata()` sets `this.taskState.activeWorkflowName = metadata.activeWorkflowName`
- only after that does it call `this.workflowRuntime.restorePersistedSession(...)`
- `restorePersistedSession(...)` then sets `taskState.activeWorkflowName = persistedSession.workflowName` again inside `WorkflowRuntime.ts`

Why this is misaligned:
- persisted-session restore is supposed to be runtime-owned
- pre-seeding `activeWorkflowName` in `task/index.ts` before runtime restore blurs the boundary between application-level orchestration and runtime-owned restore/session re-entry
- the current implementation therefore duplicates workflow-identity mutation across both `task/index.ts` and `WorkflowRuntime.ts`

Impact:
- even the resume path now reflects mixed ownership of workflow identity
- this increases ambiguity about whether `task/index.ts` or `WorkflowRuntime` is the true owner of activation/restore state transitions

### 5. `UseSkillToolHandler.ts` and `SubagentRunner.ts` were forced to consume the wrong runtime activation API

Important distinction:
- `UseSkillToolHandler.ts` is allowed to remain a workflow activation caller/bootstrap seam per `docs/workflows/workflow-runtime/requirements.md:544`
- `SubagentRunner.ts` is allowed to remain the child execution bootstrap seam per `docs/workflows/workflow-runtime/requirements.md:638` and `FR-62` at `docs/workflows/workflow-runtime/requirements.md:642-646`

Live code:
- `src/core/task/tools/handlers/UseSkillToolHandler.ts:38-55`
- `src/core/task/tools/subagent/SubagentRunner.ts:932-952`

Current behavior:
- `UseSkillToolHandler.ts` resolves the workflow with `resolveWorkflowByUseSkillName(...)` and passes the definition object into `config.workflowRuntime.activateWorkflow(...)`
- `SubagentRunner.ts` resolves the child workflow with `resolveWorkflowByUseSkillName(...)` and passes the definition object into `this.baseConfig.workflowRuntime.activateWorkflow(...)`
- neither caller sets `activeWorkflowName` before invoking the runtime; they rely on the drifted runtime API to do it

Why this is still a documented issue:
- the callers themselves are allowed bootstrap seams
- but they were forced to target the wrong runtime API introduced by Issue 1 and Issue 2
- because `WorkflowRuntime.activateWorkflow(...)` was designed around a caller-supplied `WorkflowDefinition`, both callers became coupled to the wrong activation contract

Impact:
- correcting the runtime activation boundary will require revisiting both bootstrap seams
- these two files are not necessarily the root cause, but they currently encode and depend on the same drift

### 6. `WorkflowRuntime.test.ts` encodes the wrong activation contract as the foundational test model

Live test surface:
- `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:295-310`
- repeated direct object activation pattern throughout the file, including the many `activateWorkflow({ taskState, workflow })` calls listed by `rg`

Current behavior:
- tests create inline workflow definitions in the test file
- tests call `runtime.activateWorkflow({ taskState, workflow })` directly
- the foundational test strategy treats direct object injection as the normal activation contract

Why this is misaligned:
- these tests were written against the drifted runtime API rather than the documented activation ownership model
- they therefore reinforced the wrong boundary instead of catching it

Impact:
- the foundational runtime test suite cannot currently be treated as trustworthy evidence that the activation contract matches the architecture
- any remediation that preserves this direct object activation seam is suspect until the boundary is re-derived

### 7. `SubagentRunner.test.ts` encodes the same drifted runtime contract

Live test surface:
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts:972-986`
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts:1049-1078`

Current behavior:
- tests directly call `config.workflowRuntime.activateWorkflow({ taskState: state, workflow: createResolvedWorkflow(...) })`
- child-workflow prompt projection tests assume the runtime will accept full definition objects supplied by the caller/bootstrap seam

Why this is misaligned:
- these tests are not just validating subagent behavior
- they are also validating the wrong runtime activation API

Impact:
- the subagent test suite currently bakes in the same incorrect assumption as the runtime test suite
- this is part of why the Phase 9.4 remediation drifted toward preserving caller-supplied definitions

### 8. The foundational implementation-order document propagated the same wrong boundary into multiple downstream rows

Confirmed planning propagation:
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:314-367`
  - foundational `WorkflowRuntime.ts` contract
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:812-819`
  - `task/index.ts` slash-command activation contract
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:898-900`
  - `UseSkillToolHandler.ts` activation contract
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:1148-1158`
  - `SubagentRunner.ts` child activation contract
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:2656-2846`
  - foundational `WorkflowRuntime.test.ts` design and coverage plan

Why this matters:
- this was not one isolated code mistake
- the wrong activation ownership model was documented, repeated, then implemented across the foundational phase

Impact:
- multiple “completed” foundational rows are now potentially built on the wrong contract
- remediation has to start from the contract, not from individual failing lines

### 9. The current Phase 9.4 remediation entry for `WorkflowRuntime.ts` is invalid because it patches the wrong boundary instead of correcting it

Current remediation entry:
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:4871-4884`

Current related test/remediation entries:
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:4886-4903`
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:4905-4918`

Why this entry is invalid:
- it tries to preserve the drifted runtime API by adding a private in-memory cache for caller-supplied workflow definitions
- that is a symptom patch for the wrong boundary
- it does not realign the runtime with the approved architecture where the invocation seam sets identity and the runtime resolves the active definition

Impact:
- this Phase 9.4 entry must not be treated as ready for implementation
- the matching `WorkflowRuntime.test.ts` and `SubagentRunner.test.ts` remediation rows that depend on this cache idea are also not trustworthy in their current form

### 10. The live deterministic runtime model narrows deterministic workflow steps to one tool request at a time, and that limit is not prescribed in the reviewed requirements/architecture lines

Reviewed source-of-truth lines:
- `docs/workflows/workflow-runtime/requirements.md:263`
- `docs/workflows/workflow-runtime/requirements.md:293`
- `docs/workflows/workflow-runtime/requirements.md:341-343`
- `docs/workflows/workflow-runtime/architecture.md:337-358`

Those lines prescribe:
- workflow modules define deterministic step-resolution rules
- the canonical next action may invoke a deterministic operation
- workflow runtime invokes deterministic operations through the normal tool path
- workflow runtime interprets the result and updates workflow state

Those reviewed lines do not prescribe:
- that deterministic workflow-step success is limited to the result of exactly one tool request
- that deterministic workflow-step success may only be derived from a single tool-result evaluation rather than broader workflow-module-defined conditions interpreted by `WorkflowRuntime`

Live code:
- `src/core/task/workflow-runtime/types.ts:69-72`
  - `WorkflowRunDeterministicNextAction` carries one `toolRequest`
- `src/core/task/workflow-step-resolution/types.ts:20-34`
  - `WorkflowStepResolutionDefinition` exposes one `buildToolExecutionRequest(...)` method that returns one `WorkflowStepResolutionToolExecutionRequest`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:153-158`
  - pending workflow-form deterministic execution returns `kind: "run_deterministic_operation"` with one `toolRequest`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:180-186`
  - pending step-resolution execution returns `kind: "run_deterministic_operation"` with one `toolRequest`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:264-269`
  - next-action-rule deterministic execution returns `kind: "run_deterministic_operation"` with one `toolRequest`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:329-334`
  - step-owned deterministic execution returns `kind: "run_deterministic_operation"` with one `toolRequest`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:495-510`
  - deterministic failure records a terminal failure state, checks boolean `fallbackToAgent`, and immediately re-runs `resolveNextAction(...)`
  - there is no step-defined retry invocation and no explicit user-facing deterministic-failure error path

Why this is a documented issue:
- the live foundational runtime hardens deterministic workflow execution into a single-tool-request model
- the reviewed requirements and architecture lines above prescribe deterministic execution through the normal tool path, but do not prescribe that one-tool-request limitation
- the live deterministic failure path is reduced to a boolean-style fallback branch rather than a workflow-defined failure-handling path
- the runtime does not execute a retry mechanism for the failing deterministic step before deciding the next action
- the runtime does not surface an explicit deterministic-failure error path to the user from this branch

Impact:
- the current runtime type and execution model are narrower than the reviewed deterministic-operation contract in the docs
- the live deterministic step model cannot natively represent step success that depends on multiple runtime-owned factors interpreted together, including workflow-form input, discovered project/file/artifact state, required file presence, or required file contents
- the live `run_deterministic_operation` and `WorkflowStepResolutionDefinition` shapes harden deterministic success around one tool request and one tool-result evaluation pass
- deterministic failure handling is narrower than the reviewed runtime-owned failure-decision contract
- the current runtime cannot natively represent “retry this step's deterministic method, then surface an explicit user error if retry also fails”
- the live `fallbackToAgent` boolean is an unstructured failure-control seam that obscures the required workflow-defined retry/error behavior

### 11. `submitWorkflowProgressRequest(...)` mutates canonical workflow state without re-validating that progression is allowed for the active step

Reviewed source-of-truth lines:
- `docs/workflows/workflow-runtime/requirements.md:286-287`
- `docs/workflows/workflow-runtime/requirements.md:705`

Those lines prescribe:
- `workflow_progress_request` may be used only when the workflow runtime indicates that mechanism is permitted for the active step
- the workflow runtime must validate whether a progression action is allowed for the active step before mutating canonical workflow state

Live code:
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:548-566`
  - `isWorkflowProgressRequestAllowed(...)` performs the permission checks, including `activeStep.allowWorkflowProgressRequest === true`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:568-588`
  - `submitWorkflowProgressRequest(...)` does not re-run those permission checks before mutating canonical state
  - it checks only `approved === true` and that a session exists, then executes `session.activeStepNumber += 1`

Why this is a documented issue:
- the runtime has a separate permission-checking function for `workflow_progress_request`
- the canonical mutation path does not enforce that same permission contract at mutation time
- this allows workflow progression state to be mutated without re-validating that the active step actually permits `workflow_progress_request`

Impact:
- `workflow_progress_request` progression is not safely guarded at the canonical mutation seam
- the live runtime does not satisfy the requirement that progression actions be validated before canonical workflow-state mutation

## Immediate Consequence

The current foundational-build code and planning artifacts cannot be assumed to faithfully implement the approved activation contract.

At minimum, the following surfaces must be re-derived from the requirements/architecture before further remediation proceeds:
- `WorkflowRuntime.ts`
- `task/index.ts` activation/resume integration
- `UseSkillToolHandler.ts`
- `SubagentRunner.ts`
- `WorkflowRuntime.test.ts`
- `SubagentRunner.test.ts`
- the corresponding implementation-order rows
- the current Phase 9.4 remediation rows

## Summary Judgment

This was not random drift. It was a specific unapproved design substitution:

- required model: identity-first invocation seam, runtime-resolved workflow definition
- substituted model: caller-resolved workflow definition, runtime activated from supplied object

That substitution then propagated through planning, implementation, tests, and remediation.

## Corrected Workflow-Specific Surface Audit

Corrected audit rule used for this pass:

- foundational runtime code and foundational/runtime-adjacent tests should be workflow-agnostic
- any reference to a specific workflow name is a defect by default
- the only allowed exceptions are files explicitly documented in the workflow-runtime project folder as being handled in Module Build or Cleanup work

### Explicitly Dispositioned Exceptions

The following workflow-specific files are not counted here as foundational-build defects solely for existing, because the workflow-runtime project docs already explicitly place them in Module Build or Cleanup handling:

- `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
  - explicitly deferred to Cleanup at:
    - `docs/workflows/workflow-runtime/cleanup/cleanup-implementation.md:13-17`
    - `docs/workflows/workflow-runtime/requirements.md:483-490`
- `src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts`
  - explicitly deferred to Cleanup at:
    - `docs/workflows/workflow-runtime/cleanup/cleanup-implementation.md:7-11`
- `src/core/task/workflow-form/WorkflowFormRegistry.ts`
  - explicitly dispositioned for final cleanup and workflow-module extraction at:
    - `docs/workflows/workflow-runtime/requirements.md:440-450`
- `src/shared/capture-brainstorming-topic.ts`
  - explicitly deferred to Brainstorming Module Build at:
    - `docs/workflows/workflow-runtime/workflow-modules/brainstorming/brainstorming-implementation.md:16-20`
- `src/shared/prepare-brainstorming-session.ts`
  - explicitly deferred to Brainstorming Module Build at:
    - `docs/workflows/workflow-runtime/workflow-modules/brainstorming/brainstorming-implementation.md:22-26`
- `src/shared/select-target-epic.ts`
  - explicitly deferred to PI-planning Module Build at:
    - `docs/workflows/workflow-runtime/workflow-modules/pi-planning/pi-planning-implementation.md:1-5`
- `src/shared/build-tech-spec-document.ts`
  - explicitly deferred to Quick-spec Module Build at:
    - `docs/workflows/workflow-runtime/workflow-modules/quick-spec/quick-spec-implementation.md:1-7`
- `src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`
  - explicitly deferred to Dev-story Module Build at:
    - `docs/workflows/workflow-runtime/workflow-modules/dev-story/dev-story-implementation.md:1`

### Confirmed Unauthorized Workflow-Specific Surfaces

The following files still contain specific workflow references but were not found to be explicitly handled in Module Build or Cleanup planning. Under the corrected audit rule, these are confirmed issues:

- `src/shared/build-story-document.ts:1-33`
  - hard-codes `create-story.md`
  - no matching Module Build or Cleanup handling entry was found in `docs/workflows/workflow-runtime`
- `src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts:7-19`
  - contains workflow-specific `Brainstorming Step 2` removal messaging in live runtime tool-handler code
  - no matching Module Build or Cleanup handling entry was found
- `src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts`
  - remains the matching workflow-specific test surface for the removed brainstorming tool path
  - no matching Module Build or Cleanup handling entry was found
- `src/core/task/workflow-form/dictionaries/systemDictionary.ts:674-679`
  - still names `quick-spec` and `quick-dev` directly in a shared runtime dictionary surface
  - no matching Module Build or Cleanup handling entry was found
- `src/core/task/__tests__/managedWorkflowCoverage.test.ts:5-75`
  - still enumerates specific managed workflows by name in a runtime-adjacent coverage test
  - no matching Module Build or Cleanup handling entry was found for this test file
- `src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts:25-37`
  - still hard-codes `quick-spec` in foundational/runtime-adjacent focus-chain coverage
  - this file is documented for Foundational Build update at `docs/workflows/workflow-runtime/requirements.md:627`, but not as a Module Build or Cleanup exception
- `src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts`
  - still hard-codes specific workflow names such as `quick-spec` and `create-story`
  - this file is documented for Foundational Build update at `docs/workflows/workflow-runtime/requirements.md:611`, but not as a Module Build or Cleanup exception
- `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts:9-88`
  - still hard-codes `quick-spec` in a shared runtime test surface
  - this file is documented for Foundational Build update at `docs/workflows/workflow-runtime/requirements.md:614`, but not as a Module Build or Cleanup exception
- `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts:168-220`
  - still hard-codes `pi-planning` in a foundational/runtime-adjacent workflow-progress test
  - this file is documented for Foundational Build update at `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:4409`, but not as a Module Build or Cleanup exception
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts:972-1078`
  - still hard-codes specific workflows such as `review-workflow`
  - this file is documented for Foundational Build update at `docs/workflows/workflow-runtime/requirements.md:638`, but not as a Module Build or Cleanup exception

### Consequence Of The Corrected Rule

The presence of workflow-specific references in foundational/runtime-adjacent code and tests cannot be treated as acceptable transitional evidence merely because the file already exists in the repo or already has a Foundational Build row. Unless the file is explicitly deferred to Module Build or Cleanup handling, the workflow-specific reference is itself a confirmed defect under the intended foundational-build architecture.
