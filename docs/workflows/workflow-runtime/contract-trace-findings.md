# Workflow Runtime Contract Trace Findings

## Shared Workflow-Form Contract Family

This trace follows the current workflow-form shared contract end to end across declaration, runtime production, task/runtime consumption, persistence, and tests.

## Traced Declaration And Type Surfaces

- Shared payload declaration:
  [src/shared/ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L553)
  - `WorkflowFormResolvedPanelPayload`
  - `ClineWorkflowForm`
  - current shared payload field: `resolverId`

- Workflow-form runtime types:
  [src/core/task/workflow-form/types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L1)
  - imports `ClineWorkflowForm`
  - `WorkflowFormSessionState` already uses `workflowFormId`
  - `WorkflowFormRuntimeLike` still returns `ClineWorkflowForm`

## Traced Runtime Producers

- Payload builder:
  [src/core/task/workflow-form/buildWorkflowFormPayload.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/buildWorkflowFormPayload.ts#L1)
  - returns `ClineWorkflowForm`
  - currently emits `resolverId: args.session.resolverId`

- Workflow-form runtime:
  [src/core/task/workflow-form/WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L612)
  - `createSession(...)` still writes `resolverId` and `triggerSource` into the session object
  - payload-building methods still return `ClineWorkflowForm`
  - definition rebuild still resolves by `session.resolverId`

## Traced Task/Runtime Consumers

- Task imports and message rendering:
  [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L94)
  - imports `ClineWorkflowForm`
  - `renderWorkflowFormMessage(payload: ClineWorkflowForm)` uses `payload.resolverId` for thread-display metadata
  - existing message parsing uses `Partial<ClineWorkflowForm>`

- Workflow-form submission and suppression flow:
  [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1405)
  - suppression filtering still keys off `outcome.session.resolverId`
  - fallback suppression still keys off `activeSession.resolverId`

- Deterministic workflow-form execution:
  [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1842)
  - failure fallback lookup still uses `getWorkflowFormResolverDefinition(session.resolverId)`
  - deterministic execution still resolves the registry definition from `outcome.session.resolverId`

- Workflow-form turn orchestration:
  [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1972)
  - start-form detection still checks `owner.kind === "slash_command"`
  - workflow-form session creation still passes `resolverId` and `triggerSource`
  - fallback suppression still writes `pendingOperationOutcome.session.resolverId`

## Traced Persistence And Restore Surfaces

- Runtime state holders:
  [src/core/task/TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L155)
  [src/core/context/context-tracking/ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts#L40)
  - both persist `activeWorkflowFormSession?: WorkflowFormSessionState`

- Persistence code:
  [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1514)
  - persists `activeWorkflowFormSession`
  - persists `suppressedWorkflowFormResolverIds`

- Restore code:
  [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2658)
  - restores `activeWorkflowFormSession`
  - restores `suppressedWorkflowFormResolverIds`

## Traced Tests

- Workflow-form runtime tests:
  [src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L61)
  - fixture sessions still use `resolverId`
  - fixture owners still use `placeholder_workflow_step`
  - runtime create-session inputs still pass `resolverId` and `triggerSource`

- Placeholder workflow persistence tests:
  [src/core/task/__tests__/placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L98)
  - fixture sessions still use `resolverId`, `triggerSource`, and `placeholder_workflow_step`
  - helper payload type still imports `ClineWorkflowForm`
  - helper payload builder still emits `resolverId`
  - persisted suppression assertions still use `suppressedWorkflowFormResolverIds`

## What This Proves

The current action-plan `Subtask 1.9` and `Subtask 1.10` are not end-to-end executable because they split one shared contract family across disconnected subtasks.

The workflow-form contract currently spans all of these files:

- `src/shared/ExtensionMessage.ts`
- `src/core/task/workflow-form/types.ts`
- `src/core/task/workflow-form/buildWorkflowFormPayload.ts`
- `src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `src/core/task/index.ts`
- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

## Approval Resolved

The exact shared payload field name replacing `resolverId` on the renamed `WorkflowForm` contract is now approved as:

- `workflowFormId`

Current live state remains inconsistent until implementation lands:

- shared payload contract still uses `resolverId`
- runtime session contract already uses `workflowFormId`

The rewritten action-plan subtasks must therefore treat this as one traced migration family rather than as disconnected local edits.
