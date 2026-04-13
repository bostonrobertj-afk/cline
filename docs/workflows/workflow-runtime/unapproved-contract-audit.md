# Workflow Runtime Unapproved Contract Audit

## Purpose

This document lists the code-facing names I introduced in the workflow runtime architecture, requirements, and action-plan documents without a clear explicit approval from you for the exact identifier.

This is intentionally conservative. If I prescribed a file, type, field, function, export, callback, helper, property, or contract label and I cannot point to explicit user approval of that exact name, it is included here for review.

## Important Clarification

`ClineWorkflowForm` was not created by me. It already exists in the live codebase at [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L562). My mistake was treating the surrounding contract as safely mutable in the action plan without tracing that shared type end to end.

Approved after this audit was written:

- rename shared payload type `ClineWorkflowForm` -> `WorkflowForm`
- rename the shared workflow-form identity field to `workflowFormId`
- `WorkflowRegistry.ts`
- `resolveWorkflowDefinition`
- `resolveWorkflowBySlashCommand`
- `resolveWorkflowByUseSkillName`
- `getShippedWorkflowSlashCommands`
- `getWorkflowSkillMetadata`

## New File And Module Names I Introduced Without Explicit Approval

- `docs/workflows/workflow-runtime/architecture.md`
  Source: [architecture.md:1](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md#L1)
  Note: You asked me to draft the architecture document, but not this exact filename.

- `docs/workflows/workflow-runtime/requirements.md`
  Source: [requirements.md:1](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md#L1)
  Note: You asked me to draft the requirements document, but not this exact filename.

- `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Source: [action-plan.md:46](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L46)
  Note: This matched the direction we discussed conceptually, but I do not have explicit approval recorded for this exact path.

- `src/core/task/workflow-runtime/workflows/<workflow>/definition.ts`
  Source: [action-plan.md:47](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L47)
  Note: You approved the idea of per-workflow definition modules, but I prescribed this exact path and filename.

- `src/core/task/workflow-runtime/workflows/<workflow>/artifacts.ts`
  Source: [action-plan.md:286](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L286)
  Note: I introduced this exact sibling file contract.

- `src/core/task/workflow-runtime/workflows/<workflow>/data.ts`
  Source: [action-plan.md:300](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L300)
  Note: I introduced this exact sibling file contract.

## Type And Interface Names I Introduced Without Explicit Approval

- `WorkflowSession`
  Source: [architecture.md:235](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md#L235)
  Note: I introduced this as a static decomposition label even though the live code uses `WorkflowSessionState`.

- `WorkflowArtifactDefinition`
  Source: [action-plan.md:224](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L224)

- `WorkflowDataAsset`
  Source: [action-plan.md:225](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L225)

- `WorkflowInvocationSeam`
  Source: [architecture.md:151](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md#L151)

- `Runtime Projection Adapters`
  Source: [architecture.md:159](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md#L159)
  Note: This is an architectural building-block name, not an approved code contract.

## Field And Property Names I Introduced Without Explicit Approval

- `workflowRuntime`
  Sources: [action-plan.md:37](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L37), [action-plan.md:244](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L244), [action-plan.md:267](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L267)
  Note: I prescribed this exact property name on `TaskConfig`, `Task`, and `ToolExecutor`.

- `artifacts`
  Sources: [action-plan.md:229](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L229), [requirements.md:220](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md#L220)

- `dataAssets`
  Sources: [action-plan.md:229](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L229), [requirements.md:220](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md#L220)

- `workflowForms`
  Sources: [action-plan.md:230](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L230), [action-plan.md:283](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L283)

- `deterministicResolvers`
  Sources: [action-plan.md:230](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L230), [action-plan.md:283](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L283)

- `deterministicResolverId`
  Source: [action-plan.md:227](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L227)

- `relativePathPattern`
  Sources: [action-plan.md:249](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L249), [action-plan.md:293](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L293)

- `initialContent`
  Sources: [action-plan.md:250](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L250), [action-plan.md:294](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L294)

- `collisionStrategy`
  Sources: [action-plan.md:251](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L251), [action-plan.md:295](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L295)

- `workflowReminderText`
  Sources: [action-plan.md:196](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L196), [action-plan.md:283](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L283)

- `progress.mechanism`
  Sources: [action-plan.md:150](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L150), [action-plan.md:282](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L282)
  Note: I prescribed this exact nested field name without explicit approval of the final shape.

- `activeWorkflowSession`
  Sources: [action-plan.md:871](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L871), [action-plan.md:875](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L875)

- `workflowValues`
  Sources: [action-plan.md:875](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L875), [action-plan.md:935](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L935)

- `activeWorkflowProgressRequestEnabled`
  Source: [action-plan.md:1091](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L1091)

## Function, Method, Callback, And Helper Names I Introduced Without Explicit Approval

- `executeWorkflowFormOperationAndSync(args: { taskState: TaskState; operationId: string; toolResultText?: string }): Promise<void>`
  Sources: [action-plan.md:232](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L232), [action-plan.md:821](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L821)
  Note: The live code already has a method with this name in `task/index.ts`, but I prescribed its move into the runtime contract without explicit approval of that exact interface.

- `executeWorkflowStepResolutionToolAndSync(args: { taskState: TaskState; toolResultText?: string }): Promise<void>`
  Sources: [action-plan.md:232](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L232), [action-plan.md:825](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L825)

- `maybeResolveWorkflowFormBeforeTurn(...)`
  Sources: [action-plan.md:813](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L813), [action-plan.md:841](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L841)

- `maybeResolveDeterministicStepBeforeTurn(...)`
  Sources: [action-plan.md:817](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L817), [action-plan.md:845](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L845)

- `maybeResolveStartCardBeforeTurn(...)`
  Source: [action-plan.md:837](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L837)

- `handleWorkflowProgressApproval`
  Sources: [action-plan.md:867](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L867), [action-plan.md:871](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L871)

- `buildTurnProjection(state)`
  Source: [action-plan.md:1043](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L1043)

- `activateAssignedWorkflowIfPresent(...)`
  Source: [action-plan.md:1047](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L1047)

- `activateWorkflow(...)`
  Source: [action-plan.md:1047](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L1047)

- `expandWorkflowToolBundles(...)`
  Source: [action-plan.md:1099](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L1099)

## Export Names I Introduced Without Explicit Approval

- `advancedElicitationWorkflowDefinition`
  Source: [action-plan.md:309](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L309)

- `blindReviewWorkflowDefinition`
  Source: [action-plan.md:313](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L313)

- `brainstormingArtifacts`
  Source: [action-plan.md:317](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L317)

- `brainstormingDataAssets`
  Source: [action-plan.md:321](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L321)

- `brainstormingWorkflowDefinition`
  Source: [action-plan.md:325](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L325)

- `checkImplementationReadinessArtifacts`
  Source: [action-plan.md:329](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L329)

- `checkImplementationReadinessDataAssets`
  Source: [action-plan.md:333](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L333)

- `checkImplementationReadinessWorkflowDefinition`
  Source: [action-plan.md:337](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L337)

- `cisDesignThinkingWorkflowDefinition`
  Source: [action-plan.md:341](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L341)

- `cisInnovationStrategyWorkflowDefinition`
  Source: [action-plan.md:345](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L345)

- `cisProblemSolvingWorkflowDefinition`
  Source: [action-plan.md:349](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L349)

## Contract Labels And Shape Decisions I Introduced Without Explicit Approval

- `WorkflowFormSessionOwner.kind: "workflow_step" | "workflow_start"`
  Sources: [action-plan.md:208](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L208), [action-plan.md:263](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L263)

- `WorkflowStepDefinition.id` format `step-<number>`
  Source: [action-plan.md:226](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L226)

- `collisionStrategy?: "overwrite" | "append_numeric_suffix"`
  Source: [action-plan.md:251](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L251)

- Artifact key/id `output_file`
  Source: [action-plan.md:317](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L317)
  Note: I used this exact key for brainstorming in the plan.

- Data-asset key/id `brain_methods`
  Source: [action-plan.md:321](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L321)
  Note: This exact key became a blocker because I had not originally prescribed it clearly enough.

- Data-asset format `csv`
  Source: [action-plan.md:321](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md#L321)

## Names I Should Not Have Treated As Approved By Implication

- `activeWorkflowSession.workflowValues`
  Note: This was a concrete state-shape decision, not a user-approved fact.

- `activeWorkflowProgressRequestEnabled`
  Note: I introduced this as a test-visible projection name without explicit approval of the final field name.

## What This Means

The action plan should not be trusted as executable until every identifier above is either:

- explicitly approved as written
- replaced with an explicitly approved identifier
- removed from the design

## Recommended Next Step

Before any more implementation work, I should perform a full action-plan contract audit and rewrite every remaining subtask so each prescribed identifier has one of these sources:

- explicitly user-approved naming
- pre-existing live code contract
- exact same-step explicit declaration in an earlier approved subtask with every downstream consumer traced
