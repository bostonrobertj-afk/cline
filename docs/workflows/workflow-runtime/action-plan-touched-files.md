# Action Plan Touched Files

This document lists every unique path referenced by an `Allowed files:` line in [action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md), and under each file lists every task/subtask whose `Allowed files:` entry includes that path. Each quoted block below reproduces the corresponding action-plan entry text.

## `src/core/task/workflow-form/types.ts`

Summary: Subtask 1.1, Subtask 1.2, Subtask 1.9b touch this file; same-code overlap appears in Subtask 1.1 and Subtask 1.9b; Subtask 1.2 and Subtask 1.9b.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.1
  Allowed files: `src/core/task/workflow-form/types.ts`
  Revision: In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L9-L67), replace the top contract block so it uses `WorkflowFormId`, `WorkflowFormDefinition`, `workflowFormId`, and `WorkflowFormSessionOwner.kind: "workflow_step" | "workflow_start"`. Keep `WorkflowFormToolExecutionRequest` and `WorkflowFormOperationApplicationResult` structurally identical.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.2
  Allowed files: `src/core/task/workflow-form/types.ts`
  Revision: In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L74-L134), replace the session/runtime block so `WorkflowFormSessionState`, `WorkflowFormRuntimeCreateSessionOptions`, and `WorkflowFormRuntimeLike` use `workflowFormId` and the renamed owner literals everywhere. No `resolverId`, `WorkflowFormResolverId`, `"placeholder_workflow_step"`, or `"slash_command"` string may remain in this file.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9b
  Allowed files: `src/core/task/workflow-form/types.ts`
  Revision: In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L1-L123), replace every `ClineWorkflowForm` import and return-type reference with `WorkflowForm`.
```

## `src/core/task/workflow-step-resolution/types.ts`

Summary: Only Subtask 1.3 touches this file; the trace does not show same-file churn here.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.3
  Allowed files: `src/core/task/workflow-step-resolution/types.ts`
  Revision: In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/types.ts#L8-L60), replace the owner/session contract block so `WorkflowStepResolutionSessionOwner.kind` is exactly `"workflow_step"` and the owner payload remains `{ workflowName: string; stepNumber: number }`.
```

## `src/core/task/workflow-runtime/types.ts`

Summary: Subtask 1.4, Subtask 1.8 touch this file; same-code overlap appears in Subtask 1.4 and Subtask 1.8.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.4
  Allowed files: `src/core/task/workflow-runtime/types.ts`
  Revision: Replace the entire contents of [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/types.ts#L1-L103) with the comprehensive workflow-owned contract. The replacement file must:
  - keep `WorkflowName`, `WorkflowToolBundleName`, `WorkflowProgressMechanism`, `WorkflowPromptSection`, `WorkflowPromptProjection`, `WorkflowFocusChainProjection`, `WorkflowTurnProjection`, and `WorkflowSessionState`
  - import `WorkflowFormDefinition` and `WorkflowFormStartRequirements` from `@/core/task/workflow-form/types`
  - import `WorkflowStepResolutionDefinition` from `@/core/task/workflow-step-resolution/types`
  - add the initial `WorkflowArtifactDefinition` contract, then apply the generated-document correction in Subtask 1.8 before any `artifacts.ts` implementation work continues
  - add `WorkflowDataAsset { id; format; contents }`
  - require every `WorkflowStepDefinition.id` to follow the exact format `step-<number>`
  - keep `WorkflowStepDefinition.workflowFormId?: string` and `deterministicResolverId?: string` as references into module-owned maps
  - replace the inline `workflowStartForm` shape with `workflowStartForm?: WorkflowFormStartRequirements`
  - replace `artifactTemplateIds?: string[]` with `artifacts?: Record<string, WorkflowArtifactDefinition>` and `dataAssets?: Record<string, WorkflowDataAsset>`
  - add `workflowForms?: Record<string, WorkflowFormDefinition>` and `deterministicResolvers?: Record<string, WorkflowStepResolutionDefinition>` to `WorkflowDefinition`
  - add `projectSubfolder: "discovery" | "planning" | "implementation" | "review" | "testing"` to `WorkflowDefinition`
  - add `inheritedWorkflowValueKeys?: string[]` to `WorkflowDefinition` for explicit same-key parent-to-child workflow-value initialization only
  - preserve `completionToolId?: ClineDefaultTool`
  - extend `WorkflowRuntimeLike.activateWorkflow(...)` so its args include optional `parentWorkflowValues?: Record<string, unknown>`
  - extend `WorkflowRuntimeLike` with the exact method `applyWorkflowValueWrites(args: { taskState: TaskState; values: Record<string, unknown> }): Promise<{ changedKeys: string[]; unchangedKeys: string[] }>`
  - extend `WorkflowRuntimeLike` with the exact method `ensureProjectOutputScaffold(args: { taskState: TaskState; projectTitle: string }): Promise<void>`
  - extend `WorkflowRuntimeLike` with the exact method `resolveWorkflowArtifactPath(args: { taskState: TaskState; artifactId: string }): string`
  - extend `WorkflowRuntimeLike` with exact method names for task/index delegation: `executeWorkflowFormOperationAndSync(args: { taskState: TaskState; operationId: string; toolResultText?: string }): Promise<void>` and `executeWorkflowStepResolutionToolAndSync(args: { taskState: TaskState; toolResultText?: string }): Promise<void>`
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.8
  Allowed files: `src/core/task/workflow-runtime/types.ts`
  Revision: In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/types.ts#L1-L160), revise the `WorkflowArtifactDefinition` contract added in Subtask 1.4 so it models generated workflow documents rather than source template files. Make these exact changes in one contiguous edit:
  - replace `relativePath` with `relativePathPattern`
  - replace `template` with `initialContent`
  - add `collisionStrategy?: "overwrite" | "append_numeric_suffix"`
  - require artifact record keys to equal artifact `id`
  - `relativePathPattern` must always describe the generated document path contract and must never point at a source template file such as `template.md`
  - `initialContent` must hold the runtime-coded starter body copied from the current template dependency
```

## `src/core/task/workflow-runtime/WorkflowRuntime.ts`

Summary: Subtask 1.5, Subtask 1.11i, Subtask 4.5, Subtask 4.6, Subtask 6.5a1, Subtask 6.5a2, Subtask 6.6, Subtask 6.7, Subtask 6.8, Subtask 6.9, Subtask 6.10 touch this file; same-code overlap appears in Subtask 1.5 and Subtask 1.11i; Subtask 1.5 and Subtask 4.5; Subtask 1.5 and Subtask 4.6; Subtask 1.5 and Subtask 6.5a1; and other overlapping edits.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.5
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: In [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L1-L157), update imports and compile-time typing only so the class matches the Subtask 1.4 contract without adding new orchestration logic yet.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.11i
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: In the projection methods at [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L47-L83), import `resolveWorkflowRuntimeText` from `@/core/task/workflow-runtime/workflowRuntimeConfig`, resolve `activeStep.promptText` against `session.workflowValues`, and use the resolved value in both `buildTurnProjection(...)` and `buildCurrentStepPrompt(...)`. Leave checklist rendering and tool-bundle projection unchanged.
```

### Post-Module Buildout Phase 4: Move activation, persistence, projection, completion, and teardown into WorkflowRuntime
```md
- [ ] Subtask 4.5
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: In [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L47-L83), replace the projection block so `buildTurnProjection(...)` and `buildCurrentStepPrompt(...)` use module-owned prompt sections and tool bundles from the active workflow definition and active step id.
```

### Post-Module Buildout Phase 4: Move activation, persistence, projection, completion, and teardown into WorkflowRuntime
```md
- [ ] Subtask 4.6
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: In [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L85-L157), replace the stubbed runtime methods and helper block so the class owns step advancement, completion detection from `completedStepIds`, teardown, artifact/data lookup, active-step lookup from the canonical workflow session, and the canonical workflow-value mutation seam. In that same block, implement `applyWorkflowValueWrites(...)` so backend-owned logic and AI-callable workflow-value persistence both write through one runtime-owned method that:
  - writes only into `taskState.activeWorkflowSession.workflowValues`
  - returns exact `changedKeys` and `unchangedKeys` arrays
  - normalizes artifact-path workflow values using the existing artifact-path normalization rules that currently live in `SetWorkflowPlaceholdersToolHandler.ts`
  - leaves persistence ownership with callers, but never writes to any placeholder-era or managed-workflow state field
  - implement `ensureProjectOutputScaffold(...)` so it normalizes the provided project title using the approved filesystem rules from the architecture document, ensures the per-project folder exists beneath the visible project output root, ensures the canonical subfolders `discovery`, `planning`, `implementation`, `review`, and `testing` exist inside that project folder, and writes `project_name`, `output_folder`, `planning_artifacts`, and `implementation_artifacts` into the active workflow session through the same canonical workflow-value mutation seam
  - implement `resolveWorkflowArtifactPath(...)` so it reads the active workflow definition's `projectSubfolder`, resolves the artifact's `relativePathPattern` beneath `<output_folder>/<projectSubfolder>`, and applies the runtime-owned artifact identity and numbering policy instead of leaving epic/story/remediation numbering in individual handlers
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.5a1
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: In [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L1-L24), add the `WorkflowRuntimeTaskAdapter` type immediately above `export class WorkflowRuntime`. The adapter contract must expose only these already-existing Task-owned seams and names:
  - `renderWorkflowStartCardMessage`
  - `persistWorkflowStartCardSession`
  - `clearWorkflowStartCardSession`
  - `waitForWorkflowStartCardResolution`
  - `renderWorkflowFormMessage`
  - `persistWorkflowFormSession`
  - `clearWorkflowFormSession`
  - `waitForWorkflowFormOutcome`
  - `renderWorkflowStepResolutionStatusMessage`
  - `persistWorkflowStepResolutionSession`
  - `clearWorkflowStepResolutionSession`
  - `dismissTrailingCommandOutputAskIfPresent`
  - `executeDeterministicToolRequest`
  The `executeDeterministicToolRequest` method must be typed to accept `{ callId: string; toolName: ClineDefaultTool; toolParams: Record<string, unknown>; toolInput: Record<string, unknown> }` and return `Promise<{ toolResultText?: string }>`.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.5a2
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: In the constructor signature at [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L12-L14), extend `WorkflowRuntime` so it stores the injected adapter by changing the constructor to `constructor(private readonly resolveDefinition: WorkflowDefinitionResolver = () => undefined, private readonly cwd: string = process.cwd(), private readonly taskAdapter?: WorkflowRuntimeTaskAdapter) {}`. Do not implement any adapter calls in this subtask.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.6
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: Add the runtime-owned `maybeResolveStartCardBeforeTurn(...)` implementation in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L85-L90), sourcing the workflow-start configuration from the active workflow definition and using the injected adapter from Subtasks 6.5a1-6.5a3 for start-card render/persist/wait behavior.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.7
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: Add the runtime-owned `maybeResolveWorkflowFormBeforeTurn(...)` implementation in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L85-L90), sourcing definitions from `WorkflowDefinition.workflowForms` and using the injected adapter from Subtasks 6.5a1-6.5a3 for render/persist/outcome-loop behavior. In that same implementation, the shared pre-workflow project-selection gate must run before workflow-specific step orchestration:
  - present the approved `new` versus `existing` project choice
  - if `existing` is chosen, derive the available choices from the per-project folder names beneath the visible project output root
  - if `new` is chosen, collect the user-provided project title
  - after either path resolves a project title, call `await this.ensureProjectOutputScaffold({ taskState, projectTitle })` before any workflow-specific step form or deterministic step can proceed
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.8
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: Add the runtime-owned `maybeResolveDeterministicStepBeforeTurn(...)` implementation in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L85-L90), sourcing definitions from `WorkflowDefinition.deterministicResolvers` and using the injected adapter from Subtasks 6.5a1-6.5a3 for status rendering, persistence, and deterministic tool execution.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.9
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: Add the exact `executeWorkflowFormOperationAndSync(...)` method required by Subtask 1.4, using `activeWorkflowFormSession.workflowFormId`, workflow-module-owned form definitions, and the injected adapter from Subtasks 6.5a1-6.5a3 rather than the old registry layer.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.10
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: Add the exact `executeWorkflowStepResolutionToolAndSync(...)` method required by Subtask 1.4, using `activeWorkflowStepResolutionSession.definitionId`, workflow-module-owned deterministic resolver definitions, and the injected adapter from Subtasks 6.5a1-6.5a3 rather than the old registry layer.
```

## `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

Summary: Subtask 1.6, Subtask 1.8b, Subtask 4.6a touch this file; same-code overlap appears in Subtask 1.6 and Subtask 1.8b; Subtask 1.6 and Subtask 4.6a; Subtask 1.8b and Subtask 4.6a.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.6
  Allowed files: `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
  Revision: In [WorkflowRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts#L8-L166), update the fixture and assertions so the test file compiles against the Subtasks 1.1-1.4 contract changes.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.8b
  Allowed files: `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
  Revision: In [WorkflowRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts#L8-L220), update the fixture shape so it matches the revised `WorkflowArtifactDefinition` contract from Subtask 1.8.
```

### Post-Module Buildout Phase 4: Move activation, persistence, projection, completion, and teardown into WorkflowRuntime
```md
- [ ] Subtask 4.6a
  Allowed files: `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
  Revision: In [WorkflowRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts#L1-L260), add runtime-owned coverage for `ensureProjectOutputScaffold(...)` and `resolveWorkflowArtifactPath(...)`. The new assertions in that same file must verify exactly these contracts:
  - `ensureProjectOutputScaffold(...)` writes `project_name` as the human-facing title and `output_folder` as the per-project folder path
  - `ensureProjectOutputScaffold(...)` writes `planning_artifacts` and `implementation_artifacts` as `<output_folder>/planning` and `<output_folder>/implementation`
  - `resolveWorkflowArtifactPath(...)` prepends the active workflow definition's `projectSubfolder` rather than hardcoding workflow-local folder prefixes inside artifact definitions
  - teardown clears those project-scaffold workflow values by clearing `activeWorkflowSession`
```

## `src/core/task/tools/types/TaskConfig.ts`

Summary: Subtask 1.7, Subtask 7.1a touch this file; same-code overlap appears in Subtask 1.7 and Subtask 7.1a.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.7
  Allowed files: `src/core/task/tools/types/TaskConfig.ts`
  Revision: In [TaskConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/types/TaskConfig.ts#L128-L155), add `workflowRuntime: WorkflowRuntimeLike` to the task config contract so `UseSkillToolHandler`, workflow-specific deterministic handlers, and subagent orchestration can delegate into the shared runtime from the start of implementation.
```

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.1a
  Allowed files: `src/core/task/tools/types/TaskConfig.ts`
  Revision: In the `TaskCallbacks` interface at [TaskConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/types/TaskConfig.ts#L120-L140), add the exact callback `handleWorkflowProgressApproval: (approved: boolean) => Promise<{ advanced: boolean; feedback?: string }>` immediately after `updateFCListFromToolResponse(...)`.
```

## `src/shared/ExtensionMessage.ts`

Summary: Only Subtask 1.9a touches this file; the trace does not show same-file churn here.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9a
  Allowed files: `src/shared/ExtensionMessage.ts`
  Revision: In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L562-L573), replace the `ClineWorkflowForm` interface block with `WorkflowForm`, and rename the payload identity field from `resolverId` to `workflowFormId` in that same block.
```

## `src/core/task/workflow-form/buildWorkflowFormPayload.ts`

Summary: Only Subtask 1.9c touches this file; the trace does not show same-file churn here.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9c
  Allowed files: `src/core/task/workflow-form/buildWorkflowFormPayload.ts`
  Revision: In [buildWorkflowFormPayload.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/buildWorkflowFormPayload.ts#L1-L19), replace the imported/returned payload type `ClineWorkflowForm` with `WorkflowForm`, and emit `workflowFormId: args.session.workflowFormId` instead of `resolverId`.
```

## `src/core/task/workflow-form/WorkflowFormRuntime.ts`

Summary: Subtask 1.9d, Subtask 1.9da, Subtask 1.9e, Subtask 1.9f, Subtask 6.1a touch this file; same-code overlap appears in Subtask 1.9d and Subtask 6.1a; Subtask 1.9e and Subtask 6.1a.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9d
  Allowed files: `src/core/task/workflow-form/WorkflowFormRuntime.ts`
  Revision: In the import block at [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L1-L29), replace the imported payload type `ClineWorkflowForm` with `WorkflowForm`.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9da
  Allowed files: `src/core/task/workflow-form/WorkflowFormRuntime.ts`
  Revision: In the payload-method block at [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L645-L672), replace every `ClineWorkflowForm` return type with `WorkflowForm`.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9e
  Allowed files: `src/core/task/workflow-form/WorkflowFormRuntime.ts`
  Revision: In the `createSession(...)` return block at [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L615-L630), replace `resolverId: options.resolverId` with `workflowFormId: options.workflowFormId`, remove the `triggerSource: options.triggerSource` line entirely, and leave the rest of the created session shape unchanged.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9f
  Allowed files: `src/core/task/workflow-form/WorkflowFormRuntime.ts`
  Revision: In the definition-rebuild/helper block at [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L1016-L1141), replace the session-field lookup `session.resolverId` with `session.workflowFormId`, rename the helper parameter from `resolverId` to `workflowFormId`, and keep the registry-backed resolver lookup behavior intact.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.1a
  Allowed files: `src/core/task/workflow-form/WorkflowFormRuntime.ts`
  Revision: In the import/constructor block at [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L19-L29) and [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L613-L615), delete the `workflowFormRegistry` import and remove the default constructor value `= workflowFormRegistry`. After this edit, `WorkflowFormRuntime` must require an explicit `Record<string, WorkflowFormResolverDefinition>` from the caller and must not own a fallback registry.
```

## `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

Summary: Subtask 1.9g, Subtask 1.9h, Subtask 1.9i, Subtask 1.9j, Subtask 6.1b, Subtask 6.1c, Subtask 6.1d, Subtask 6.1e touch this file; same-code overlap appears in Subtask 1.9g and Subtask 6.1b; Subtask 1.9h and Subtask 6.1c; Subtask 1.9i and Subtask 6.1d; Subtask 1.9j and Subtask 6.1e; multi-pass helper block edits in Subtask 1.9g, Subtask 6.1b.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9g
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the helper block at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L61-L127), replace draft-session, create-session, and registry-session helper fixtures so they use `workflowFormId`, omit `triggerSource`, and use owner kinds `"workflow_step"` and `"workflow_start"` instead of the legacy literals.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9h
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the Brainstorming Step 4 session-construction block at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L506-L515), replace `resolverId` with `workflowFormId`, remove `triggerSource`, and replace `kind: "placeholder_workflow_step"` with `kind: "workflow_step"`.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9i
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the workflow-start session-construction blocks at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1047-L1056) and [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1088-L1097), replace `resolverId` with `workflowFormId`, remove `triggerSource`, and replace `kind: "slash_command"` with `kind: "workflow_start"`.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9j
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the registry-session call at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1320-L1324), replace the argument key `resolverId` with `workflowFormId`.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.1b
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the helper block at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1-L140), add one helper named `createRuntimeFromRegistry(...resolverIds: string[])` that returns `new WorkflowFormRuntime(Object.fromEntries(resolverIds.map((id) => [id, getWorkflowFormResolverDefinition(id)])))`. Do not change any existing test body in this subtask.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.1c
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the Brainstorming Step 4 test block at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L493-L535), replace `const runtime = new WorkflowFormRuntime()` with `const runtime = createRuntimeFromRegistry(BRAINSTORMING_STEP_4_CHOOSE_APPROACH_RESOLVER_ID)`.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.1d
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the workflow-start validation pair at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1035-L1098), replace both `const runtime = new WorkflowFormRuntime()` call sites with `const runtime = createRuntimeFromRegistry(PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID)`.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.1e
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the registry-backed conditional field test at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1320-L1365), replace `const runtime = new WorkflowFormRuntime()` with `const runtime = createRuntimeFromRegistry(CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID)`.

Resume this phase only after definition-owned workflow forms and deterministic resolvers already exist in shipped workflow definition modules. Creating those workflow-specific definitions is not part of this plan.
```

## `src/core/task/index.ts`

Summary: Subtask 1.9k, Subtask 1.9l, Subtask 1.9m, Subtask 1.9n, Subtask 1.9o, Subtask 1.9p, Subtask 1.10b, Subtask 1.11a, Subtask 1.11b, Subtask 1.11c, Subtask 2.77b, Subtask 2.77c, Subtask 3.1b, Subtask 3.4a, Subtask 3.4b, Subtask 4.1, Subtask 4.2, Subtask 4.3, Subtask 5.2, Subtask 5.3, Subtask 5.4, Subtask 6.5a3, Subtask 6.11, Subtask 6.12, Subtask 6.13, Subtask 6.14, Subtask 6.15 touch this file; same-code overlap appears in Subtask 1.9k and Subtask 2.77b; Subtask 1.9k and Subtask 3.4a; Subtask 1.9n and Subtask 6.11; Subtask 1.9o and Subtask 6.14; and other overlapping edits; multi-pass import block edits in Subtask 1.9k, Subtask 2.77b, Subtask 3.4a.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9k
  Allowed files: `src/core/task/index.ts`
  Revision: In the shared import block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L87-L99), replace `type ClineWorkflowForm` with `type WorkflowForm`.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9l
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1548-L1575), replace `renderWorkflowFormMessage(payload: ClineWorkflowForm)` with `renderWorkflowFormMessage(payload: WorkflowForm)`, replace the thread-display metadata field `resolverId: payload.resolverId` with `workflowFormId: payload.workflowFormId`, and replace `Partial<ClineWorkflowForm>` with `Partial<WorkflowForm>`.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9m
  Allowed files: `src/core/task/index.ts`
  Revision: In the workflow-form submission handling block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1417-L1435), replace every `outcome.session.resolverId` and `activeSession.resolverId` reference with `outcome.session.workflowFormId` and `activeSession.workflowFormId` respectively, leaving the existing `suppressedWorkflowFormResolverIds` array name unchanged in this phase.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9n
  Allowed files: `src/core/task/index.ts`
  Revision: In the workflow-form deterministic-operation block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1842-L1857), replace both registry lookups that currently read `session.resolverId` and `outcome.session.resolverId` so they instead read `session.workflowFormId` and `outcome.session.workflowFormId`.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9o
  Allowed files: `src/core/task/index.ts`
  Revision: In the workflow-form session-creation block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1975-L2012), replace `owner.kind === "slash_command"` with `"workflow_start"`, and replace both workflow-form `createSession(...)` argument objects so they pass `workflowFormId: <candidate>.resolverId` and no longer pass `triggerSource`.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9p
  Allowed files: `src/core/task/index.ts`
  Revision: In the workflow-form fallback-suppression block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2104-L2118), replace both `pendingOperationOutcome.session.resolverId` references with `pendingOperationOutcome.session.workflowFormId`, leaving the suppression-array name unchanged in this phase.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.10b
  Allowed files: `src/core/task/index.ts`
  Revision: In the workflow-step-resolution session-creation block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2169-L2178), replace `kind: "placeholder_workflow_step"` with `kind: "workflow_step"` and leave the rest of the owner payload unchanged.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.11a
  Allowed files: `src/core/task/index.ts`
  Revision: In the runtime field declaration block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L769-L771), insert `private workflowRuntime: WorkflowRuntime` immediately before the existing `workflowFormRuntime` and `workflowStepResolutionRuntime` fields.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.11b
  Allowed files: `src/core/task/index.ts`
  Revision: In the runtime-instantiation block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L871-L876), insert `this.workflowRuntime = new WorkflowRuntime(undefined, cwd)` immediately before the existing workflow-form and workflow-step-resolution runtime instantiations.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.11c
  Allowed files: `src/core/task/index.ts`
  Revision: In the `new ToolExecutor(...)` call at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1094-L1128), insert `this.workflowRuntime` immediately after `this.taskState` and before `this.messageStateHandler`.
```

### Post-Module Buildout Phase 2: Establish the shared shipped-workflow module foundation
```md
- [ ] Subtask 2.77b
  Allowed files: `src/core/task/index.ts`
  Revision: In the import block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1-L120), replace the legacy workflow-resolution import with `resolveWorkflowDefinition` from `@/core/task/workflow-runtime/WorkflowRegistry`.
```

### Post-Module Buildout Phase 2: Establish the shared shipped-workflow module foundation
```md
- [ ] Subtask 2.77c
  Allowed files: `src/core/task/index.ts`
  Revision: In the runtime-instantiation block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L867-L876), replace `this.workflowRuntime = new WorkflowRuntime(undefined, cwd)` with `this.workflowRuntime = new WorkflowRuntime(resolveWorkflowDefinition, cwd)`.
```

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.1b
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2432-L2515), replace the entire body of `applyPersistentSlashCommandAction(...)` with a temporary compile-bridge body that does only `if (!action) { return }`. Do not add any activation or persistence logic in this bridge step; Subtask 4.2 replaces the full body with runtime-owned semantics.
```

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.4a
  Allowed files: `src/core/task/index.ts`
  Revision: In the import block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1-L120), replace the legacy workflow-resolution import with `getWorkflowSkillMetadata` from `@/core/task/workflow-runtime/WorkflowRegistry`.
```

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.4b
  Allowed files: `src/core/task/index.ts`
  Revision: In the prompt-skill assembly block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3867-L3889), delete the `resolveAvailableWorkflows(...)` call and the `workflowEntries` local. Replace `createWorkflowSkillMetadata(workflowEntries)` with `getWorkflowSkillMetadata()`, leaving skill discovery, toggle filtering, `mergePromptSkillEntries(...)`, and `buildPromptSkillScope(...)` otherwise unchanged.
```

### Post-Module Buildout Phase 4: Move activation, persistence, projection, completion, and teardown into WorkflowRuntime
```md
- [ ] Subtask 4.1
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L213-L217), replace `shouldIncludePersistentPromptContext(...)` so it accepts `Pick<TaskState, "activeWorkflowName">` and returns `!!taskState.activeWorkflowName`.
```

### Post-Module Buildout Phase 4: Move activation, persistence, projection, completion, and teardown into WorkflowRuntime
```md
- [ ] Subtask 4.2
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2432-L2514), replace the temporary compile-bridge body from Subtask 3.1b with runtime-owned activation logic keyed to the `activate_workflow` action shape introduced in Subtask 3.1a. Persist only `activeWorkflowName`, `activeWorkflowSession`, `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, and `activeWorkflowStepResolutionSession`.
```

### Post-Module Buildout Phase 4: Move activation, persistence, projection, completion, and teardown into WorkflowRuntime
```md
- [ ] Subtask 4.3
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2639-L2696), replace the legacy workflow restore block with runtime-owned restore logic that restores only the runtime workflow fields and then calls `await this.workflowRuntime.restoreWorkflowSession({ taskState: this.taskState, metadata })`.
```

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.2
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2593-L2607), delete `buildWorkflowPromptInstructions(...)`. After this edit, all workflow prompt/persona/reminder projection must come from `WorkflowRuntime.buildTurnProjection(...)`.
```

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.3
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3891-L3958), replace the workflow prompt-context assembly with `const workflowProjection = await this.workflowRuntime.buildTurnProjection(this.taskState)` and project only runtime-owned workflow prompt/tool fields into `SystemPromptContext`.
```

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.4
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2517-L2544), replace `buildPlaceholderWorkflowActivationInstructions(...)` with a runtime-owned activation helper that reads `activeWorkflowName`, `activeWorkflowSession.workflowValues`, and `activeStepId` instead of `activePlaceholderWorkflowSource` and placeholder values. Preserve the current `dev-story.md` special-case behavior.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.5a3
  Allowed files: `src/core/task/index.ts`
  Revision: In the runtime-instantiation block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L867-L876), replace the current `new WorkflowRuntime(resolveWorkflowDefinition, cwd)` call with `new WorkflowRuntime(resolveWorkflowDefinition, cwd, { ... })` and inline an adapter object whose methods delegate only to the already-existing Task methods and state in this file:
  - `renderWorkflowStartCardMessage: this.renderWorkflowStartCardMessage.bind(this)`
  - `persistWorkflowStartCardSession: this.persistWorkflowStartCardSession.bind(this)`
  - `clearWorkflowStartCardSession: this.clearWorkflowStartCardSession.bind(this)`
  - `waitForWorkflowStartCardResolution: async () => { await pWaitFor(() => !this.taskState.activeWorkflowStartCardSession || this.taskState.abort, { interval: 100 }) }`
  - `renderWorkflowFormMessage: this.renderWorkflowFormMessage.bind(this)`
  - `persistWorkflowFormSession: this.persistWorkflowFormSession.bind(this)`
  - `clearWorkflowFormSession: this.clearWorkflowFormSession.bind(this)`
  - `waitForWorkflowFormOutcome: async () => { await pWaitFor(() => this.pendingWorkflowFormOutcome !== undefined || this.taskState.abort, { interval: 100 }); const outcome = this.pendingWorkflowFormOutcome; this.pendingWorkflowFormOutcome = undefined; return outcome }`
  - `renderWorkflowStepResolutionStatusMessage: this.renderWorkflowStepResolutionStatusMessage.bind(this)`
  - `persistWorkflowStepResolutionSession: this.persistWorkflowStepResolutionSession.bind(this)`
  - `clearWorkflowStepResolutionSession: this.clearWorkflowStepResolutionSession.bind(this)`
  - `dismissTrailingCommandOutputAskIfPresent: async () => dismissTrailingCommandOutputAskIfPresent({ getClineMessages: () => this.messageStateHandler.getClineMessages(), dismissCommandOutputAsk: async () => { await this.say("command_output", "") } })`
  - `executeDeterministicToolRequest: async ({ callId, toolName, toolParams, toolInput }) => { const previousUserMessageContentLength = this.taskState.userMessageContent.length; await this.toolExecutor.executeTool({ type: "tool_use", name: toolName, params: toolParams as any, partial: false, isNativeToolCall: true, call_id: callId }); await this.syncDeterministicProgressionAfterWorkflowFormTool({ toolName, toolParams: toolInput, toolResult: this.taskState.userMessageContent.at(-1), toolWasExecuted: true }); return { toolResultText: this.getWorkflowFormToolResultText(previousUserMessageContentLength) } }`
  Do not move message rendering, `say(...)`, persistence ownership, or direct tool execution ownership out of `task/index.ts` in this subtask.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.11
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1853-L1898), replace `executeWorkflowFormOperationAndSync(...)` with a one-line delegation into `this.workflowRuntime.executeWorkflowFormOperationAndSync(...)`.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.12
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1900-L1930), replace `executeWorkflowStepResolutionToolAndSync(...)` with a one-line delegation into `this.workflowRuntime.executeWorkflowStepResolutionToolAndSync(...)`.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.13
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1932-L1970), replace `maybeResolveWorkflowStartCardBeforeApiTurn(...)` with delegation into `this.workflowRuntime.maybeResolveStartCardBeforeTurn(...)`.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.14
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1972-L2157), replace `maybeResolveWorkflowFormBeforeApiTurn(...)` with delegation into `this.workflowRuntime.maybeResolveWorkflowFormBeforeTurn(...)`.
```

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.15
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2159-L2271), replace `maybeResolveWorkflowStepResolutionBeforeApiTurn(...)` with delegation into `this.workflowRuntime.maybeResolveDeterministicStepBeforeTurn(...)`.
```

## `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Summary: Subtask 1.9q, Subtask 1.9r, Subtask 1.9s, Subtask 4.9 touch this file; same-code overlap appears in Subtask 1.9q and Subtask 4.9; Subtask 1.9r and Subtask 4.9.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9q
  Allowed files: `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
  Revision: In the helper block at [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1-L164), replace the imported payload type `ClineWorkflowForm` with `WorkflowForm`, replace session fixtures so they use `workflowFormId`, remove `triggerSource`, replace `kind: "placeholder_workflow_step"` with `kind: "workflow_step"`, and replace the helper payload field `resolverId` with `workflowFormId`.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9r
  Allowed files: `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
  Revision: In the restore-fixture block at [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L201-L249), replace every would-be V2 workflow-form fixture field `resolverId` with `workflowFormId`, remove the legacy V2-only `triggerSource` fixture field, and replace `kind: "placeholder_workflow_step"` with `kind: "workflow_step"` where present.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.9s
  Allowed files: `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
  Revision: In the render/resume test block at [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L290-L338), replace the callback payload type `ClineWorkflowForm` with `WorkflowForm`, replace the Brainstorming session fixture key `resolverId` with `workflowFormId`, and replace `kind: "placeholder_workflow_step"` with `kind: "workflow_step"`.
```

### Post-Module Buildout Phase 4: Move activation, persistence, projection, completion, and teardown into WorkflowRuntime
```md
- [ ] Subtask 4.9
  Allowed files: `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
  Revision: Update [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1-L220) so it asserts only the runtime-owned persisted workflow fields.
```

## `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts`

Summary: Only Subtask 1.10a touches this file; the trace does not show same-file churn here.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.10a
  Allowed files: `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts`
  Revision: In [WorkflowStepResolutionRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts#L8-L89), replace every `owner.kind: "placeholder_workflow_step"` literal with `owner.kind: "workflow_step"`.
```

## `src/core/task/ToolExecutor.ts`

Summary: Subtask 1.11d, Subtask 1.11e, Subtask 7.1c touch this file; same-code overlap appears in Subtask 1.11e and Subtask 7.1c.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.11d
  Allowed files: `src/core/task/ToolExecutor.ts`
  Revision: In the constructor signature at [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L71-L137), insert a new constructor parameter `private workflowRuntime: WorkflowRuntimeLike` immediately after `private taskState: TaskState`.
```

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.11e
  Allowed files: `src/core/task/ToolExecutor.ts`
  Revision: In `asToolConfig()` at [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L147-L223), add `workflowRuntime: this.workflowRuntime` immediately after `taskState: this.taskState`.
```

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.1c
  Allowed files: `src/core/task/ToolExecutor.ts`
  Revision: In `asToolConfig()` at [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L175-L217), add `handleWorkflowProgressApproval: async (approved) => this.workflowRuntime.handleWorkflowProgressApproval({ taskState: this.taskState, approved })` immediately after `updateFCListFromToolResponse: this.updateFCListFromToolResponse`.
```

## `src/core/task/tools/utils/ToolConstants.ts`

Summary: Subtask 1.11f, Subtask 7.1b touch this file; multi-pass file touch across Subtask 1.11f, Subtask 7.1b.

### Phase 1: Normalize the canonical contracts before any workflow-module migration
```md
- [x] Subtask 1.11f
  Allowed files: `src/core/task/tools/utils/ToolConstants.ts`
  Revision: In the `TASK_CONFIG_KEYS` array at [ToolConstants.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/utils/ToolConstants.ts#L12-L33), insert `"workflowRuntime"` immediately after `"taskState"`.
```

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.1b
  Allowed files: `src/core/task/tools/utils/ToolConstants.ts`
  Revision: In `TASK_CALLBACKS_KEYS` at [ToolConstants.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/utils/ToolConstants.ts#L48-L70), insert `"handleWorkflowProgressApproval"` immediately after `"updateFCListFromToolResponse"`.
```

## `src/core/task/workflow-runtime/workflowRuntimeConfig.ts`

Summary: Only Subtask 5.11 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.11
  Allowed files: `src/core/task/workflow-runtime/workflowRuntimeConfig.ts`
  Revision: In [workflowRuntimeConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/workflowRuntimeConfig.ts#L1-L119), add one exported helper named `expandWorkflowToolBundles(allowedBundles: readonly string[], mcpTools: ClineToolSpec[]): ClineToolSpec[]` that expands runtime bundle names into exact native-tool specs and MCP tool specs using the existing bundle maps.
```

## `src/core/task/workflow-runtime/workflows/index.ts`

Summary: Only Subtask 2.76 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 2: Establish the shared shipped-workflow module foundation
```md
- [ ] Subtask 2.76
  Allowed files: `src/core/task/workflow-runtime/workflows/index.ts`
  Revision: Create `src/core/task/workflow-runtime/workflows/index.ts` and export one named import for every already-existing shipped workflow `definition.ts` module, using the exact export names declared by those modules.
```

## `src/core/task/workflow-runtime/WorkflowRegistry.ts`

Summary: Only Subtask 2.77a touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 2: Establish the shared shipped-workflow module foundation
```md
- [ ] Subtask 2.77a
  Allowed files: `src/core/task/workflow-runtime/WorkflowRegistry.ts`
  Revision: Create `WorkflowRegistry.ts`. Import every named workflow-definition export from [workflows/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/workflows/index.ts), plus `type WorkflowDefinition` and `type WorkflowName` from [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/types.ts#L1-L95) and `type SkillMetadata` from [skills.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/skills.ts#L1-L14). In that one file, export exactly these approved functions and no additional exported types or constants:
  - `resolveWorkflowDefinition(workflowName: WorkflowName): WorkflowDefinition | undefined`
  - `resolveWorkflowBySlashCommand(commandName: string): WorkflowDefinition | undefined`
  - `resolveWorkflowByUseSkillName(skillName: string): WorkflowDefinition | undefined`
  - `getShippedWorkflowSlashCommands(): Array<{ name: WorkflowName; description: string }>`
  - `getWorkflowSkillMetadata(): SkillMetadata[]`
  Each function must read only from the shipped workflow-definition set imported from `workflows/index.ts`; no legacy resolution helper, toggle state, workspace scan, remote workflow source, or managed-workflow registry may be referenced in this file. `getShippedWorkflowSlashCommands()` must return one entry per shipped workflow with `name: definition.slashCommandName` and `description: \`Shipped workflow: ${definition.name}\``. `getWorkflowSkillMetadata()` must return one entry per shipped workflow with `name: definition.useSkillName`, `description: \`Shipped workflow: ${definition.name}\``, `path: \`shipped-workflow://${definition.name}\``, and `source: "global"`.
```

## `src/core/slash-commands/index.ts`

Summary: Subtask 3.1a, Subtask 3.2a touch this file; multi-pass file touch across Subtask 3.1a, Subtask 3.2a.

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.1a
  Allowed files: `src/core/slash-commands/index.ts`
  Revision: In the import/type block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/index.ts#L1-L27), remove the legacy workflow-resolution and placeholder-workflow imports, add `type WorkflowName` from `@/core/task/workflow-runtime/types` plus `resolveWorkflowBySlashCommand` from `@/core/task/workflow-runtime/WorkflowRegistry`, and replace the `PersistentSlashCommandAction` union with this exact shape:
  ```ts
  export type PersistentSlashCommandAction = {
  	type: "activate_workflow"
  	workflowName: WorkflowName
  	invocationSource: "slash_command"
  }
  ```
```

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.2a
  Allowed files: `src/core/slash-commands/index.ts`
  Revision: In the workflow-resolution block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/index.ts#L149-L276), delete the remote-toggle lookup, `resolveWorkflowByName(...)` call, managed-workflow branch, and placeholder-workflow branch. Replace them with one `const definition = resolveWorkflowBySlashCommand(commandName)` lookup that, when defined, returns `persistentSlashCommandAction: { type: "activate_workflow", workflowName: definition.name, invocationSource: "slash_command" }` and otherwise falls through to the built-in command and MCP logic unchanged.
```

## `src/core/slash-commands/__tests__/index.test.ts`

Summary: Subtask 3.2b, Subtask 3.2c, Subtask 3.2d touch this file; modified earlier in Subtask 3.2b, Subtask 3.2c and later deleted in Subtask 3.2d.

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.2b
  Allowed files: `src/core/slash-commands/__tests__/index.test.ts`
  Revision: In the import block at [index.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/__tests__/index.test.ts#L1-L9), remove the file-system, temp-directory, `StateManager`, and `getCanonicalWorkflowConfigPath` imports that are used only by the deleted local/global/remote workflow-discovery tests.
```

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.2c
  Allowed files: `src/core/slash-commands/__tests__/index.test.ts`
  Revision: In the workflow-persona regression block at [index.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/__tests__/index.test.ts#L146-L178), replace the test `still resolves managed workflow aliases to managed workflow activation` with a shipped-workflow test that calls `parseSlashCommands("<task>/code-review.md help me untangle this issue</task>", {}, {}, "test-ulid")` and asserts `persistentSlashCommandAction` equals `{ type: "activate_workflow", workflowName: "code-review.md", invocationSource: "slash_command" }`.
```

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.2d
  Allowed files: `src/core/slash-commands/__tests__/index.test.ts`
  Revision: Delete the entire `describe("parseSlashCommands workflow resolution", ...)` block at [index.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/__tests__/index.test.ts#L224-L336). Those tests cover local, global, and remote workflow discovery paths that the approved shipped-only architecture removes.
```

## `src/core/controller/slash/getAvailableSlashCommands.ts`

Summary: Subtask 3.3a, Subtask 3.3b touch this file; multi-pass file touch across Subtask 3.3a, Subtask 3.3b.

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.3a
  Allowed files: `src/core/controller/slash/getAvailableSlashCommands.ts`
  Revision: In the import block at [getAvailableSlashCommands.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/slash/getAvailableSlashCommands.ts#L1-L5), replace `resolveAvailableWorkflows` with `getShippedWorkflowSlashCommands` from `@/core/task/workflow-runtime/WorkflowRegistry`.
```

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.3b
  Allowed files: `src/core/controller/slash/getAvailableSlashCommands.ts`
  Revision: In the workflow-listing block at [getAvailableSlashCommands.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/slash/getAvailableSlashCommands.ts#L22-L50), delete the workspace-manager, toggle-state, remote-config, and `resolveAvailableWorkflows(...)` code. Replace the `for (const workflow of workflows)` loop with `for (const workflow of getShippedWorkflowSlashCommands())`, preserving the built-in slash-command assembly and the `SlashCommandInfo.create({ name, description, section: "custom", cliCompatible: true })` call shape.
```

## `src/core/task/tools/handlers/UseSkillToolHandler.ts`

Summary: Subtask 3.5a, Subtask 3.5b, Subtask 3.6 touch this file; multi-pass file touch across Subtask 3.5a, Subtask 3.5b, Subtask 3.6.

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.5a
  Allowed files: `src/core/task/tools/handlers/UseSkillToolHandler.ts`
  Revision: In the import block at [UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts#L1-L14), remove `activateManagedWorkflowInTaskState`, `activatePlaceholderWorkflowInTaskState`, `buildPlaceholderWorkflowChecklist`, and `resolveWorkflowByName`. Add `resolveWorkflowByUseSkillName` from `@/core/task/workflow-runtime/WorkflowRegistry`.
```

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.5b
  Allowed files: `src/core/task/tools/handlers/UseSkillToolHandler.ts`
  Revision: In the workflow-activation block at [UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts#L32-L160), delete the legacy toggle reads, `resolveWorkflowByName(...)` call, managed-workflow branch, and placeholder-workflow branch. Replace them with one shipped-workflow branch that:
  - resolves `skill_name` through `resolveWorkflowByUseSkillName(skillName)`
  - if the same workflow is already active and `config.taskState.activeWorkflowSession` is already set, does not call `config.workflowRuntime.activateWorkflow(...)` again and returns the `"active again"` message variant
  - otherwise calls `await config.workflowRuntime.activateWorkflow({ taskState: config.taskState, workflowName: definition.name, invocationSource: "use_skill" })`
  - on non-subagent execution, loads task metadata, calls `await config.workflowRuntime.persistWorkflowSession({ taskState: config.taskState, metadata })`, and saves that metadata
  - calls `await config.callbacks.updateFCListFromToolResponse(undefined)`
  - returns workflow-activation text that refers to the shared workflow runtime and current focus chain, not managed or placeholder ownership
  Leave the ordinary skill-discovery fallback below this branch intact for now.
```

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.6
  Allowed files: `src/core/task/tools/handlers/UseSkillToolHandler.ts`
  Revision: In [UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts#L190-L223), delete the non-workflow branch statements that write `activeWorkflowId`, `activePlaceholderWorkflowId`, `activePlaceholderWorkflowSource`, `activePlaceholderWorkflowStableValues`, `activePlaceholderWorkflowValues`, `activePlaceholderWorkflowDeterministicState`, `lastPromptedPlaceholderWorkflowChecklistLabel`, `pendingAutoCompletedPlaceholderWorkflowStepNotices`, and `activeWorkflowJustStarted`. After this edit, activating a non-workflow skill must not mutate any workflow-state field.
```

## `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`

Summary: Subtask 3.5c, Subtask 3.5d, Subtask 11.1 touch this file; same-code overlap appears in Subtask 3.5d and Subtask 11.1.

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.5c
  Allowed files: `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
  Revision: In `createConfig(...)` at [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L63-L123), add a `workflowRuntime` stub object that exposes `activateWorkflow: sinon.stub().callsFake(async ({ taskState, workflowName }) => { taskState.activeWorkflowName = workflowName; taskState.activeWorkflowSession = { workflowName, activeStepId: "step-1", completedStepIds: [], workflowValues: {}, artifactWriteProofPaths: [], suppressedWorkflowFormIds: [], suppressedStepResolutionIds: [] } })` and `persistWorkflowSession: sinon.stub().callsFake(async ({ taskState, metadata }) => { metadata.activeWorkflowName = taskState.activeWorkflowName; metadata.activeWorkflowSession = taskState.activeWorkflowSession; metadata.activeWorkflowStartCardSession = taskState.activeWorkflowStartCardSession; metadata.activeWorkflowFormSession = taskState.activeWorkflowFormSession; metadata.activeWorkflowStepResolutionSession = taskState.activeWorkflowStepResolutionSession })`.
```

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.5d
  Allowed files: `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
  Revision: Replace the contiguous `use_skill` workflow-activation test cluster at [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L1470-L2060) with exactly these runtime-owned cases and no local/global/remote/placeholder cases:
  - main-thread shipped workflow activation persists `activeWorkflowName` and `activeWorkflowSession`, calls `workflowRuntime.activateWorkflow`, calls `workflowRuntime.persistWorkflowSession`, saves metadata once, and calls `updateFCListFromToolResponse(undefined)`
  - subagent-local shipped workflow activation updates only child task state and does not read or save parent metadata
  - re-invoking `use_skill` for the already-active shipped workflow leaves the existing session intact, does not call `workflowRuntime.activateWorkflow`, and returns the `"active again"` message variant
  - activating a plain non-workflow skill leaves `activeWorkflowName` and `activeWorkflowSession` unchanged
  In the replacement assertions, do not mention `managedWorkflowRun`, `activeWorkflowId`, `activePlaceholderWorkflowId`, `activePlaceholderWorkflowSource`, or placeholder checklist text.
```

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.1
  Allowed files: `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
  Revision: Replace the managed-workflow assertions in [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L866-L4691) with runtime-owned workflow handler coverage. Do not delete this file; it still owns surviving `use_skill`, deterministic document-build, brainstorming, and `set_workflow_placeholders` workflow-value persistence coverage.
```

## `src/core/task/__tests__/prompt-context.test.ts`

Summary: Only Subtask 3.7 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry
```md
- [ ] Subtask 3.7
  Allowed files: `src/core/task/__tests__/prompt-context.test.ts`
  Revision: Update [prompt-context.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/prompt-context.test.ts#L1-L86) so `shouldIncludePersistentPromptContext(...)` asserts only against `activeWorkflowName`.
```

## `src/core/task/workflowCompletionRunner.ts`

Summary: Only Subtask 4.7 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 4: Move activation, persistence, projection, completion, and teardown into WorkflowRuntime
```md
- [ ] Subtask 4.7
  Allowed files: `src/core/task/workflowCompletionRunner.ts`
  Revision: Delete [workflowCompletionRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionRunner.ts) after Subtasks 4.4-4.6 land and no caller imports it.
```

## `src/core/task/workflowCompletionHandler.ts`

Summary: Only Subtask 4.8 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 4: Move activation, persistence, projection, completion, and teardown into WorkflowRuntime
```md
- [ ] Subtask 4.8
  Allowed files: `src/core/task/workflowCompletionHandler.ts`
  Revision: Delete [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts) after Subtasks 4.4-4.6 land and no caller imports it.
```

## `src/core/task/__tests__/workflowCompletionRunner.test.ts`

Summary: Only Subtask 4.10 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 4: Move activation, persistence, projection, completion, and teardown into WorkflowRuntime
```md
- [ ] Subtask 4.10
  Allowed files: `src/core/task/__tests__/workflowCompletionRunner.test.ts`
  Revision: Replace the runner-focused assertions in [workflowCompletionRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionRunner.test.ts#L1-L200) with direct `WorkflowRuntime.evaluateCompletionAndMaybeTeardown(...)` coverage keyed to runtime session state. The replacement assertions must verify that teardown clears `activeWorkflowName`, `activeWorkflowSession`, `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, and `activeWorkflowStepResolutionSession` together so workflow values disappear by session clear rather than by a separate mirrored clear path.
```

## `src/core/prompts/system-prompt/types.ts`

Summary: Subtask 5.1, Subtask 5.12a touch this file; same-code overlap appears in Subtask 5.1 and Subtask 5.12a.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.1
  Allowed files: `src/core/prompts/system-prompt/types.ts`
  Revision: In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts#L95-L143), add these exact runtime-owned fields to `SystemPromptContext`, but preserve the legacy placeholder/managed workflow fields until Subtask 5.12a so current callers continue to compile during the cutover:
  ```ts
  	readonly activeWorkflowPromptSections?: readonly string[]
  	readonly activeWorkflowPersonaInstruction?: string
  	readonly activeWorkflowStepLabel?: string
  	readonly activeWorkflowStepNumber?: number
  	readonly activeWorkflowProgressRequestEnabled?: boolean
  	readonly activeWorkflowAllowedToolBundles?: readonly string[]
  ```
```

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.12a
  Allowed files: `src/core/prompts/system-prompt/types.ts`
  Revision: After Subtasks 5.2-5.12 land and no production caller reads the legacy placeholder/managed workflow prompt-context fields, delete `activeWorkflowPersonaInstructions`, `activeWorkflowReminder`, `activeWorkflowSupportsPlaceholders`, `activePlaceholderWorkflowName`, `activePlaceholderWorkflowStepNumber`, `activeDeterministicPlaceholderWorkflowEnabled`, and `managedWorkflowActive` from [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts#L95-L143).
```

## `src/core/prompts/system-prompt/components/agent_role.ts`

Summary: Only Subtask 5.5 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.5
  Allowed files: `src/core/prompts/system-prompt/components/agent_role.ts`
  Revision: In [agent_role.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_role.ts#L11-L18), replace `context.activeWorkflowPersonaInstructions` with `context.activeWorkflowPersonaInstruction`.
```

## `src/core/prompts/system-prompt/components/user_instructions.ts`

Summary: Only Subtask 5.6 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.6
  Allowed files: `src/core/prompts/system-prompt/components/user_instructions.ts`
  Revision: In [user_instructions.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/user_instructions.ts#L10-L77), replace `activeWorkflowReminder` usage with `context.activeWorkflowPromptSections?.join("\n\n")`.
```

## `src/core/prompts/system-prompt/components/task_progress.ts`

Summary: Only Subtask 5.7 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.7
  Allowed files: `src/core/prompts/system-prompt/components/task_progress.ts`
  Revision: Replace the entire implementation of [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L1-L96) with runtime-owned guidance that never mentions `task_progress`, instructs the model to use `workflow_progress_request` only when `context.activeWorkflowProgressRequestEnabled === true`, and states that runtime-owned state controls progression.
```

## `src/core/prompts/system-prompt/components/continuation_turn.ts`

Summary: Only Subtask 5.8 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.8
  Allowed files: `src/core/prompts/system-prompt/components/continuation_turn.ts`
  Revision: In [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L13-L75), replace placeholder-workflow reminder logic with runtime-owned behavior keyed only to `context.activeWorkflowProgressRequestEnabled` and `context.currentFocusChainChecklist`.
```

## `src/core/prompts/system-prompt/components/response_tools.ts`

Summary: Only Subtask 5.9 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.9
  Allowed files: `src/core/prompts/system-prompt/components/response_tools.ts`
  Revision: In [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts#L17-L104), replace `shouldExposeWorkflowProgressRequest(...)` checks with direct checks on `context.activeWorkflowProgressRequestEnabled === true`.
```

## `src/core/prompts/system-prompt/tools/workflow_progress_request.ts`

Summary: Only Subtask 5.10 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.10
  Allowed files: `src/core/prompts/system-prompt/tools/workflow_progress_request.ts`
  Revision: In [workflow_progress_request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/workflow_progress_request.ts#L8-L23), rewrite the description so it refers to the active workflow runtime step rather than a placeholder workflow step and is exposed only when `context.activeWorkflowProgressRequestEnabled === true`.
```

## `src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts`

Summary: Only Subtask 5.10a touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.10a
  Allowed files: `src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts`
  Revision: In [set_workflow_placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts#L1-L29), keep the tool id and tool name exactly `set_workflow_placeholders`, but rewrite the tool as the runtime-owned AI-callable workflow-value persistence seam. Make these exact changes in one edit:
  - replace placeholder wording in the description with runtime-owned workflow-value wording
  - remove the sentence that says stable config-backed placeholders come from `.cline/workflow-config.yaml`
  - preserve the wrapper shape `{"values": {...}}`
  - preserve `parameters[0].name === "values"` and the object-map schema
  - replace `contextRequirements` with `context.activeWorkflowName !== undefined`
```

## `src/core/prompts/system-prompt/spec.ts`

Summary: Subtask 5.10b, Subtask 8.4 touch this file; multi-pass file touch across Subtask 5.10b, Subtask 8.4.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.10b
  Allowed files: `src/core/prompts/system-prompt/spec.ts`
  Revision: In the compact native-tool description block and the compact parameter-description block at [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L468-L560), replace the `set_workflow_placeholders` placeholder-era copy with runtime-owned workflow-value wording. Preserve the wrapper-shape guidance `{"values": {...}}`, but remove the `.cline/workflow-config.yaml` reference and every remaining mention of placeholder ownership in those two `set_workflow_placeholders` branches.
```

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.4
  Allowed files: `src/core/prompts/system-prompt/spec.ts`
  Revision: Remove every remaining `task_progress` parameter description and validation branch from [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L1-L260).
```

## `src/core/prompts/system-prompt/registry/ClineToolSet.ts`

Summary: Only Subtask 5.12 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.12
  Allowed files: `src/core/prompts/system-prompt/registry/ClineToolSet.ts`
  Revision: In [ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts#L171-L199), replace `filterContextualNativeToolSpecs(...)` with `expandWorkflowToolBundles(...)`, preserving current-mode response tools and always-preserved tools.
```

## `src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts`

Summary: Only Subtask 5.13 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.13
  Allowed files: `src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts`
  Revision: Delete [workflowPersonaRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts) after shipped workflow definition modules exist, Subtasks 2.76-2.78 land, Subtasks 5.1-5.12a land, and no caller imports it.
```

## `src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts`

Summary: Only Subtask 5.14 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.14
  Allowed files: `src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts`
  Revision: Delete [contextualNativeToolFilter.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts) after shipped workflow definition modules exist, Subtasks 2.76-2.78 land, Subtasks 5.1-5.12a land, and no caller imports it.
```

## `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`

Summary: Only Subtask 5.15 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.15
  Allowed files: `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
  Revision: Delete [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts) after every shipped workflow definition module has copied its tool bundle ownership and no caller imports it.
```

## `src/shared/workflow-progress-request.ts`

Summary: Only Subtask 5.16 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.16
  Allowed files: `src/shared/workflow-progress-request.ts`
  Revision: Delete [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts) after runtime-owned `progress.mechanism` fully replaces it and no caller imports it.
```

## `src/core/task/bmad-agent-mode.ts`

Summary: Only Subtask 5.17 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam
```md
- [ ] Subtask 5.17
  Allowed files: `src/core/task/bmad-agent-mode.ts`
  Revision: Delete [bmad-agent-mode.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/bmad-agent-mode.ts) after all workflow reminder/persona projection comes from workflow modules and no caller imports it.
```

## `src/core/task/workflow-form/WorkflowFormRegistry.ts`

Summary: Only Subtask 6.16 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.16
  Allowed files: `src/core/task/workflow-form/WorkflowFormRegistry.ts`
  Revision: Delete [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts) after Subtasks 6.1a-6.15 land and no caller imports it.
```

## `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`

Summary: Only Subtask 6.17 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.17
  Allowed files: `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`
  Revision: Delete [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts) after Subtasks 6.1a-6.15 land and no caller imports it.
```

## `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts`

Summary: Only Subtask 6.18 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.18
  Allowed files: `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts`
  Revision: Delete [WorkflowStepResolutionRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts) after Subtasks 6.1a-6.15 land and no caller imports it.
```

## `src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts`

Summary: Only Subtask 6.19 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime
```md
- [ ] Subtask 6.19
  Allowed files: `src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts`
  Revision: Delete [WorkflowStepResolutionTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts) after Subtasks 6.1a-6.15 land and no caller imports it.
```

## `src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`

Summary: Subtask 7.2a, Subtask 7.2b touch this file; multi-pass file touch across Subtask 7.2a, Subtask 7.2b.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.2a
  Allowed files: `src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`
  Revision: In the import block at [WorkflowProgressRequestToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts#L1-L16), delete the `FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL` import. Keep `isWorkflowProgressRequestWorkflowName(...)` imported from `@/shared/workflow-progress-request`.
```

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.2b
  Allowed files: `src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`
  Revision: In `execute(...)` at [WorkflowProgressRequestToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts#L40-L89), replace the placeholder-workflow gate and checklist-advance branch with runtime-owned progression logic:
  - gate on `isWorkflowProgressRequestWorkflowName(config.taskState.activeWorkflowName)`
  - require `config.taskState.activeWorkflowSession?.activeStepId`
  - when the followup answer is `"Yes"`, call `await config.callbacks.handleWorkflowProgressApproval(true)`
  - when the followup answer is `"No"`, call `await config.callbacks.handleWorkflowProgressApproval(false)`
  - when the callback returns `{ advanced: false, feedback }` for the `"Yes"` branch, return `formatResponse.toolError(feedback ?? "Failed to advance the active workflow step.")`
  - remove the old `updateFCListFromToolResponse(FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL)` branch entirely
  - replace the two placeholder-owned error strings with runtime-owned wording that refers to an active supported workflow step and an active workflow session
```

## `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

Summary: Subtask 7.2c, Subtask 7.2d, Subtask 11.6 touch this file; same-code overlap appears in Subtask 7.2c and Subtask 11.6; Subtask 7.2d and Subtask 11.6.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.2c
  Allowed files: `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
  Revision: In the import/setup block at [WorkflowProgressRequestToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts#L1-L95), delete the `FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL` import, remove the `updateFCListFromToolResponse` callback stub, and add `handleWorkflowProgressApproval: sinon.stub().resolves({ advanced: true })`.
```

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.2d
  Allowed files: `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
  Revision: Replace the contiguous test body block at [WorkflowProgressRequestToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts#L102-L277) so it seeds `taskState.activeWorkflowName` plus `taskState.activeWorkflowSession = { workflowName, activeStepId, completedStepIds: [], workflowValues: {}, artifactWriteProofPaths: [], suppressedWorkflowFormIds: [], suppressedStepResolutionIds: [] }`, asserts `handleWorkflowProgressApproval(true)` for `"Yes"` and `handleWorkflowProgressApproval(false)` for `"No"`, and removes every assertion that mentions placeholder workflow sources, checklists, or `FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL`.
```

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.6
  Allowed files: `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
  Revision: Update [WorkflowProgressRequestToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts#L1-L320) so it uses `activeWorkflowName`, `activeWorkflowSession.activeStepId`, and runtime-owned approval callbacks rather than `activePlaceholderWorkflowSource`.
```

## `src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts`

Summary: Only Subtask 7.3a touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.3a
  Allowed files: `src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts`
  Revision: In [placeholderWorkflowWriteProofs.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts#L7-L48), keep the existing export names but replace their state ownership so they read and write `taskState.activeWorkflowSession?.artifactWriteProofPaths` instead of `activePlaceholderWorkflowTaskWriteProofPaths`. In `recordAndPersistPlaceholderWorkflowWriteProof(...)`, persist the updated write-proof list by saving `metadata.activeWorkflowSession = args.taskState.activeWorkflowSession`.
```

## `src/core/workflows/brainstormingSessionFiles.ts`

Summary: Subtask 7.3b, Subtask 7.3c touch this file; multi-pass file touch across Subtask 7.3b, Subtask 7.3c.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.3b
  Allowed files: `src/core/workflows/brainstormingSessionFiles.ts`
  Revision: In the import-and-resolution block at [brainstormingSessionFiles.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/brainstormingSessionFiles.ts#L1-L64), remove placeholder-rendering and workflow-placeholder imports. Add `brainstormingArtifacts` from `@/core/task/workflow-runtime/workflows/brainstorming/artifacts`. Replace `resolveBrainstormingOutputFolderPath(...)` and `resolveBrainstormingOutputFilePath(...)` so they read `output_folder` and `output_file` from `config.taskState.activeWorkflowSession?.workflowValues`, resolve relative paths from `config.cwd`, and never read placeholder state.
```

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.3c
  Allowed files: `src/core/workflows/brainstormingSessionFiles.ts`
  Revision: In [brainstormingSessionFiles.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/brainstormingSessionFiles.ts#L132-L154), delete `resolveCanonicalBrainstormingSkillPath(...)` entirely and replace `readCanonicalBrainstormingTemplate(cwd)` with a runtime-coded template reader that returns `brainstormingArtifacts.output_file.initialContent`. Keep the exported function name `readCanonicalBrainstormingTemplate`.
```

## `src/core/workflows/brainstormingTechniqueLibrary.ts`

Summary: Only Subtask 7.3d touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.3d
  Allowed files: `src/core/workflows/brainstormingTechniqueLibrary.ts`
  Revision: In the loader block at [brainstormingTechniqueLibrary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/brainstormingTechniqueLibrary.ts#L1-L71), remove the filesystem import and the `resolveCanonicalBrainstormingSkillPath(...)` dependency. Add `brainstormingDataAssets` from `@/core/task/workflow-runtime/workflows/brainstorming/data`, and replace `loadBrainstormingTechniqueEntries(...)` so it parses `brainstormingDataAssets.brain_methods.contents`.
```

## `src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts`

Summary: Subtask 7.4a, Subtask 7.4b touch this file; multi-pass file touch across Subtask 7.4a, Subtask 7.4b.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.4a
  Allowed files: `src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts`
  Revision: In the import/helper block at [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L3-L20) and [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L103-L163), delete the managed-workflow, placeholder-rendering, and workflow-placeholder imports plus the placeholder-mutation helpers `applyGenericWorkflowPlaceholders(...)` and `persistOutputFilePlaceholder(...)`. Replace that helper block with one runtime-owned persistence helper that calls `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { output_file: artifactPath } })`, then on main-thread execution persists only `activeWorkflowName`, `activeWorkflowSession`, `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, and `activeWorkflowStepResolutionSession`, and finally calls `updateFCListFromToolResponse(undefined)`.
```

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.4b
  Allowed files: `src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts`
  Revision: In the value-resolution block at [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L176-L247), replace placeholder-derived reads with runtime-session reads from `config.taskState.activeWorkflowSession?.workflowValues` for `mode`, `architecture_document`, `prd`, `ui_spec`, and `ux_spec`. In that same block, import and use `createEpicsArtifacts.output_file` from `@/core/task/workflow-runtime/workflows/create-epics/artifacts`, replace the file read of the old markdown template with `createEpicsArtifacts.output_file.initialContent`, and replace local artifact-path derivation with `config.workflowRuntime.resolveWorkflowArtifactPath({ taskState: config.taskState, artifactId: "output_file" })`.
```

## `src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts`

Summary: Subtask 7.5a, Subtask 7.5b touch this file; multi-pass file touch across Subtask 7.5a, Subtask 7.5b.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.5a
  Allowed files: `src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts`
  Revision: In the import/helper block at [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts#L3-L18) and [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts#L61-L76), remove placeholder-rendering, placeholder-step-details, workflow-placeholder, and `SetWorkflowPlaceholdersToolHandler` imports. Replace `resolveActivePiPlanningStepThree(...)` with a pure runtime-session gate that returns truthy only when `config.taskState.activeWorkflowName === "pi-planning.md"` and `config.taskState.activeWorkflowSession?.activeStepId === "step-3"`.
```

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.5b
  Allowed files: `src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts`
  Revision: In the main execution block at [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts#L119-L276), replace placeholder-derived reads with `activeWorkflowSession.workflowValues.epics_document` and `target_epic`, import `piPlanningArtifacts.epic_delivery_spec` from `@/core/task/workflow-runtime/workflows/pi-planning/artifacts`, build `templateMarkdown` from `piPlanningArtifacts.epic_delivery_spec.initialContent`, replace local artifact-path derivation with `config.workflowRuntime.resolveWorkflowArtifactPath({ taskState: config.taskState, artifactId: "epic_delivery_spec" })`, and replace the tail `persistWorkflowPlaceholderValues(config, { epic_delivery_spec: artifactPath })` call with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { epic_delivery_spec: artifactPath } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`. The handler must not own epic-delivery-spec numbering or path composition after this cutover.
```

## `src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts`

Summary: Subtask 7.6a, Subtask 7.6b touch this file; multi-pass file touch across Subtask 7.6a, Subtask 7.6b.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.6a
  Allowed files: `src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts`
  Revision: In the import/helper block at [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts#L3-L18) and [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts#L61-L76), remove placeholder-rendering, placeholder-step-details, workflow-placeholder, and `SetWorkflowPlaceholdersToolHandler` imports. Replace `resolveActiveCreateStoryStepTwo(...)` with a pure runtime-session gate that returns truthy only when `config.taskState.activeWorkflowName === "create-story.md"` and `config.taskState.activeWorkflowSession?.activeStepId === "step-2"`.
```

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.6b
  Allowed files: `src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts`
  Revision: In the main execution block at [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts#L119-L277), replace placeholder-derived reads with `activeWorkflowSession.workflowValues.epic_delivery_spec` and `story_number`, import `createStoryArtifacts.story_doc` from `@/core/task/workflow-runtime/workflows/create-story/artifacts`, build `templateMarkdown` from `createStoryArtifacts.story_doc.initialContent`, replace local artifact-path derivation with `config.workflowRuntime.resolveWorkflowArtifactPath({ taskState: config.taskState, artifactId: "story_doc" })`, and replace the tail `persistWorkflowPlaceholderValues(config, { story_doc: artifactPath })` call with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { story_doc: artifactPath } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`. The handler must not own story-number path composition after this cutover.
```

## `src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts`

Summary: Subtask 7.7a, Subtask 7.7b touch this file; multi-pass file touch across Subtask 7.7a, Subtask 7.7b.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.7a
  Allowed files: `src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts`
  Revision: In the import/helper block at [BuildTechSpecDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts#L3-L18) and [BuildTechSpecDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts#L48-L63), remove placeholder-rendering, placeholder-step-details, workflow-placeholder, and `SetWorkflowPlaceholdersToolHandler` imports. Replace `resolveActiveQuickSpecStepTwo(...)` with a pure runtime-session gate that returns truthy only when `config.taskState.activeWorkflowName === "quick-spec.md"` and `config.taskState.activeWorkflowSession?.activeStepId === "step-2"`.
```

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.7b
  Allowed files: `src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts`
  Revision: In the main execution block at [BuildTechSpecDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts#L72-L189), replace placeholder-derived reads with `activeWorkflowSession.workflowValues.title` and `date`, import `quickSpecArtifacts.output_file` from `@/core/task/workflow-runtime/workflows/quick-spec/artifacts`, build `templateMarkdown` from `quickSpecArtifacts.output_file.initialContent`, replace local artifact-path derivation with `config.workflowRuntime.resolveWorkflowArtifactPath({ taskState: config.taskState, artifactId: "output_file" })`, and replace the tail `persistWorkflowPlaceholderValues(config, { output_file: artifactPath })` call with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { output_file: artifactPath } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.
```

## `src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts`

Summary: Only Subtask 7.8 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.8
  Allowed files: `src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts`
  Revision: In [CaptureBrainstormingTopicToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts#L3-L65), remove the placeholder-step-details import and replace `resolveActiveBrainstormingStepThree(...)` with a runtime-session gate that requires `activeWorkflowName === "brainstorming.md"` and `activeWorkflowSession?.activeStepId === "step-3"`. Leave the file-write behavior unchanged, but replace the `output_file` error text so it refers to runtime workflow values rather than placeholder state.
```

## `src/core/task/tools/handlers/CreateBrainstormingSessionToolHandler.ts`

Summary: Only Subtask 7.9 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.9
  Allowed files: `src/core/task/tools/handlers/CreateBrainstormingSessionToolHandler.ts`
  Revision: In [CreateBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CreateBrainstormingSessionToolHandler.ts#L3-L72), remove the placeholder-step-details import, replace the active-step helper with a runtime-session gate for `brainstorming.md` Step 2, replace the stable-placeholder `date` read with `String(config.taskState.activeWorkflowSession?.workflowValues.date ?? "")`, and replace `persistWorkflowPlaceholderValues(config, { output_file: artifactPath })` with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { output_file: artifactPath } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.
```

## `src/core/task/tools/handlers/ContinueBrainstormingSessionToolHandler.ts`

Summary: Only Subtask 7.10 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.10
  Allowed files: `src/core/task/tools/handlers/ContinueBrainstormingSessionToolHandler.ts`
  Revision: In [ContinueBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/ContinueBrainstormingSessionToolHandler.ts#L3-L54), remove the placeholder-step-details import, replace the active-step helper with a runtime-session gate for `brainstorming.md` Step 2, and replace `persistWorkflowPlaceholderValues(config, { output_file: newestSession.absolutePath })` with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { output_file: newestSession.absolutePath } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.
```

## `src/core/task/tools/handlers/PersistBrainstormingApproachToolHandler.ts`

Summary: Only Subtask 7.11 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.11
  Allowed files: `src/core/task/tools/handlers/PersistBrainstormingApproachToolHandler.ts`
  Revision: In [PersistBrainstormingApproachToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PersistBrainstormingApproachToolHandler.ts#L3-L129), remove the placeholder-step-details import, replace the active-step helper with a runtime-session gate for `brainstorming.md` Step 4, and replace `persistWorkflowPlaceholderValues(config, { selected_approach: selectedApproach })` with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { selected_approach: selectedApproach } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.
```

## `src/core/task/tools/handlers/PersistBrainstormingTechniqueToolHandler.ts`

Summary: Only Subtask 7.12 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.12
  Allowed files: `src/core/task/tools/handlers/PersistBrainstormingTechniqueToolHandler.ts`
  Revision: In [PersistBrainstormingTechniqueToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PersistBrainstormingTechniqueToolHandler.ts#L3-L140), remove the placeholder-step-details import, replace the active-step helper with a runtime-session gate for `brainstorming.md` Step 4, and replace `persistWorkflowPlaceholderValues(config, { selected_technique: techniqueName })` with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { selected_technique: techniqueName } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.
```

## `src/core/task/tools/handlers/RequestBrainstormingTechniqueSuggestionToolHandler.ts`

Summary: Only Subtask 7.13 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.13
  Allowed files: `src/core/task/tools/handlers/RequestBrainstormingTechniqueSuggestionToolHandler.ts`
  Revision: In [RequestBrainstormingTechniqueSuggestionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/RequestBrainstormingTechniqueSuggestionToolHandler.ts#L3-L129), remove the placeholder-step-details import, replace the active-step helper with a runtime-session gate for `brainstorming.md` Step 4, and replace `persistWorkflowPlaceholderValues(config, { selected_technique: TECHNIQUE_SUGGESTION_SENTINEL })` with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { selected_technique: TECHNIQUE_SUGGESTION_SENTINEL } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.
```

## `src/core/task/tools/handlers/SelectBrainstormingSessionToolHandler.ts`

Summary: Only Subtask 7.14 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.14
  Allowed files: `src/core/task/tools/handlers/SelectBrainstormingSessionToolHandler.ts`
  Revision: In [SelectBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SelectBrainstormingSessionToolHandler.ts#L3-L60), remove the placeholder-step-details import, replace the active-step helper with a runtime-session gate for `brainstorming.md` Step 2, and replace `persistWorkflowPlaceholderValues(config, { output_file: selectedOutputFile })` with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { output_file: selectedOutputFile } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.
```

## `src/core/task/tools/handlers/SelectRandomBrainstormingTechniqueToolHandler.ts`

Summary: Only Subtask 7.15 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.15
  Allowed files: `src/core/task/tools/handlers/SelectRandomBrainstormingTechniqueToolHandler.ts`
  Revision: In [SelectRandomBrainstormingTechniqueToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SelectRandomBrainstormingTechniqueToolHandler.ts#L3-L44), remove the placeholder-step-details import, replace the active-step helper with a runtime-session gate for `brainstorming.md` Step 4, and leave the tool-result payload unchanged. Do not add any workflow-value write in this subtask; this handler only returns a suggested technique payload.
```

## `src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts`

Summary: Only Subtask 7.16 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.16
  Allowed files: `src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts`
  Revision: In [SelectTargetEpicToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts#L13-L149), remove placeholder-rendering and placeholder-step-details imports, replace `resolveActivePiPlanningStepTwo(...)` with a runtime-session gate for `pi-planning.md` Step 2, replace `resolveEpicsDocumentPath(...)` so it reads `epics_document` from `activeWorkflowSession.workflowValues`, and replace `persistWorkflowPlaceholderValues(config, { [SELECT_TARGET_EPIC_PLACEHOLDER_KEY]: text })` with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { [SELECT_TARGET_EPIC_PLACEHOLDER_KEY]: text } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.
```

## `src/core/task/tools/handlers/SubagentToolHandler.ts`

Summary: Subtask 7.17a, Subtask 7.17b touch this file; multi-pass file touch across Subtask 7.17a, Subtask 7.17b.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.17a
  Allowed files: `src/core/task/tools/handlers/SubagentToolHandler.ts`
  Revision: In the workflow-detection and deterministic-state block at [SubagentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SubagentToolHandler.ts#L56-L70) and [SubagentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SubagentToolHandler.ts#L314-L337), replace placeholder-owned code-review state with runtime-owned state:
  - `isActiveCodeReviewPlaceholderWorkflow(...)` must become a runtime gate on `config.taskState.activeWorkflowName === "code-review.md"`
  - completed review-layer writes must target `config.taskState.activeWorkflowSession?.deterministicState.codeReview.completedReviewLayers`
  - no `activePlaceholderWorkflowDeterministicState` write may remain in those regions
```

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.17b
  Allowed files: `src/core/task/tools/handlers/SubagentToolHandler.ts`
  Revision: In the metadata-persist block at [SubagentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SubagentToolHandler.ts#L358-L375), delete the placeholder-workflow and managed-workflow metadata writes. Persist only `activeWorkflowName`, `activeWorkflowSession`, `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, and `activeWorkflowStepResolutionSession`.
```

## `src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts`

Summary: Only Subtask 7.18 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.18
  Allowed files: `src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts`
  Revision: Delete [CompleteWorkflowItemToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts) after `WorkflowRuntime.handleWorkflowProgressApproval(...)` fully replaces managed-workflow item completion and no caller imports it.
```

## `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts`

Summary: Only Subtask 7.19 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state
```md
- [ ] Subtask 7.19
  Allowed files: `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts`
  Revision: In [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts#L1-L320), preserve the tool handler file and tool id, but cut it over from placeholder ownership to runtime-owned workflow-value persistence. Make these exact changes in one file:
  - delete managed-workflow, placeholder-workflow, and deterministic-placeholder imports and helpers
  - keep the existing `values` wrapper parsing behavior
  - replace `persistWorkflowPlaceholderValues(...)` with `persistWorkflowValueWrites(...)` that calls `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values })`
  - on changed values, persist only the runtime workflow metadata fields on main-thread execution and call `updateFCListFromToolResponse(undefined)`
  - rewrite all user-facing strings so they refer to workflow values and active workflow session state rather than placeholders, while preserving the existing “do not call again unless one of those values changes” guidance
  - preserve artifact-path normalization by moving that logic onto the runtime-owned mutation seam from Subtask 4.6 instead of re-implementing separate write logic here
```

## `src/core/task/focus-chain/updateFromToolResponse.ts`

Summary: Only Subtask 8.1 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.1
  Allowed files: `src/core/task/focus-chain/updateFromToolResponse.ts`
  Revision: In [updateFromToolResponse.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/updateFromToolResponse.ts#L4-L56), remove the `task_progress` carrier from the post-tool path so this helper no longer accepts model-authored workflow-state mutations.
```

## `src/core/task/focus-chain/prompts.ts`

Summary: Only Subtask 8.2 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.2
  Allowed files: `src/core/task/focus-chain/prompts.ts`
  Revision: Replace the literal strings in [prompts.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/prompts.ts#L1-L48) so no prompt in this file tells the model to create or mutate `task_progress`.
```

## `src/core/task/focus-chain/index.ts`

Summary: Only Subtask 8.3 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.3
  Allowed files: `src/core/task/focus-chain/index.ts`
  Revision: Replace the placeholder-workflow ownership paths in [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L255-L964) with downstream-only workflow projection helpers that render runtime-owned checklist state but never derive the active step from checklist contents and never own progression.
```

## `src/core/prompts/system-prompt/tools/access_mcp_resource.ts`

Summary: Only Subtask 8.5 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.5
  Allowed files: `src/core/prompts/system-prompt/tools/access_mcp_resource.ts`
  Revision: Remove the `task_progress` parameter and every checklist instruction from [access_mcp_resource.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/access_mcp_resource.ts#L1-L120).
```

## `src/core/prompts/system-prompt/tools/generate_plan_output.ts`

Summary: Only Subtask 8.6 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.6
  Allowed files: `src/core/prompts/system-prompt/tools/generate_plan_output.ts`
  Revision: Remove the `task_progress` parameter and every checklist instruction from [generate_plan_output.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/generate_plan_output.ts#L1-L160).
```

## `src/core/prompts/system-prompt/tools/act_mode_respond.ts`

Summary: Only Subtask 8.7 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.7
  Allowed files: `src/core/prompts/system-prompt/tools/act_mode_respond.ts`
  Revision: Remove the `task_progress` parameter and every checklist instruction from [act_mode_respond.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/act_mode_respond.ts#L1-L120).
```

## `src/core/prompts/system-prompt/tools/use_mcp_tool.ts`

Summary: Only Subtask 8.8 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.8
  Allowed files: `src/core/prompts/system-prompt/tools/use_mcp_tool.ts`
  Revision: Remove the `task_progress` parameter and every checklist instruction from [use_mcp_tool.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/use_mcp_tool.ts#L1-L120).
```

## `src/core/prompts/system-prompt/tools/write_to_file.ts`

Summary: Only Subtask 8.9 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.9
  Allowed files: `src/core/prompts/system-prompt/tools/write_to_file.ts`
  Revision: Remove the `task_progress` parameter and every checklist instruction from [write_to_file.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/write_to_file.ts#L1-L120).
```

## `src/core/prompts/system-prompt/tools/attempt_completion.ts`

Summary: Only Subtask 8.10 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.10
  Allowed files: `src/core/prompts/system-prompt/tools/attempt_completion.ts`
  Revision: Remove the `task_progress` parameter and every checklist instruction from [attempt_completion.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/attempt_completion.ts#L1-L180).
```

## `src/core/prompts/system-prompt/variants/gpt-5/template.ts`

Summary: Only Subtask 8.11 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.11
  Allowed files: `src/core/prompts/system-prompt/variants/gpt-5/template.ts`
  Revision: Remove every `task_progress` instruction from [template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/template.ts#L1-L120).
```

## `src/core/prompts/system-prompt/variants/native-gpt-5/template.ts`

Summary: Only Subtask 8.12 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.12
  Allowed files: `src/core/prompts/system-prompt/variants/native-gpt-5/template.ts`
  Revision: Remove every `task_progress` instruction from [template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/template.ts#L1-L120).
```

## `src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts`

Summary: Only Subtask 8.13 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.13
  Allowed files: `src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts`
  Revision: Remove every `task_progress` instruction from [overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts#L1-L120).
```

## `src/core/prompts/system-prompt/variants/gemini-3/overrides.ts`

Summary: Only Subtask 8.14 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.14
  Allowed files: `src/core/prompts/system-prompt/variants/gemini-3/overrides.ts`
  Revision: Remove every `task_progress` instruction from [overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/overrides.ts#L1-L120).
```

## `src/core/prompts/system-prompt/variants/glm/overrides.ts`

Summary: Only Subtask 8.15 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.15
  Allowed files: `src/core/prompts/system-prompt/variants/glm/overrides.ts`
  Revision: Remove every `task_progress` instruction from [overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/glm/overrides.ts#L1-L120).
```

## `src/core/prompts/system-prompt/variants/hermes/overrides.ts`

Summary: Only Subtask 8.16 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.16
  Allowed files: `src/core/prompts/system-prompt/variants/hermes/overrides.ts`
  Revision: Remove every `task_progress` instruction from [overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/hermes/overrides.ts#L1-L120).
```

## `src/core/prompts/contextManagement.ts`

Summary: Only Subtask 8.17 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.17
  Allowed files: `src/core/prompts/contextManagement.ts`
  Revision: Remove every active `task_progress` instruction, XML example, and continuation requirement from [contextManagement.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/contextManagement.ts#L1-L140).
```

## `src/core/prompts/commands.ts`

Summary: Only Subtask 8.18 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.18
  Allowed files: `src/core/prompts/commands.ts`
  Revision: Remove every active `task_progress` parameter description and example block from [commands.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/commands.ts#L1-L160).
```

## `src/core/prompts/commands/deep-planning/index.ts`

Summary: Only Subtask 8.19 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.19
  Allowed files: `src/core/prompts/commands/deep-planning/index.ts`
  Revision: Remove the `task_progress` carry-forward instruction from [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/commands/deep-planning/index.ts#L1-L80).
```

## `src/core/prompts/commands/deep-planning/variants/gpt51.ts`

Summary: Only Subtask 8.20 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.20
  Allowed files: `src/core/prompts/commands/deep-planning/variants/gpt51.ts`
  Revision: Remove every `task_progress` instruction from [gpt51.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/commands/deep-planning/variants/gpt51.ts#L1-L260).
```

## `src/core/prompts/commands/deep-planning/variants/gemini3.ts`

Summary: Only Subtask 8.21 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.21
  Allowed files: `src/core/prompts/commands/deep-planning/variants/gemini3.ts`
  Revision: Remove every `task_progress` instruction from [gemini3.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/commands/deep-planning/variants/gemini3.ts#L1-L260).
```

## `src/core/prompts/commands/deep-planning/variants/generic.ts`

Summary: Only Subtask 8.22 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.22
  Allowed files: `src/core/prompts/commands/deep-planning/variants/generic.ts`
  Revision: Remove every `task_progress` instruction from [generic.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/commands/deep-planning/variants/generic.ts#L1-L260).
```

## `src/core/prompts/commands/deep-planning/variants/gemini.ts`

Summary: Only Subtask 8.23 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.23
  Allowed files: `src/core/prompts/commands/deep-planning/variants/gemini.ts`
  Revision: Remove every `task_progress` instruction from [gemini.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/commands/deep-planning/variants/gemini.ts#L1-L280).
```

## `src/core/prompts/commands/deep-planning/variants/anthropic.ts`

Summary: Only Subtask 8.24 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection
```md
- [ ] Subtask 8.24
  Allowed files: `src/core/prompts/commands/deep-planning/variants/anthropic.ts`
  Revision: Remove every `task_progress` instruction from [anthropic.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/commands/deep-planning/variants/anthropic.ts#L1-L280).
```

## `src/core/task/tools/subagent/SubagentRunner.ts`

Summary: Subtask 9.1a, Subtask 9.1b, Subtask 9.2a, Subtask 9.2b, Subtask 9.2c, Subtask 9.3a, Subtask 9.3b, Subtask 9.3c, Subtask 9.3d, Subtask 9.3e touch this file; modified earlier in Subtask 9.1a, Subtask 9.1b, Subtask 9.2a, Subtask 9.2b, Subtask 9.2c, Subtask 9.3a, Subtask 9.3b, Subtask 9.3c, Subtask 9.3d and later deleted in Subtask 9.3e; same-code overlap appears in Subtask 9.1a and Subtask 9.3a; Subtask 9.1a and Subtask 9.3d; Subtask 9.1b and Subtask 9.3c; Subtask 9.3a and Subtask 9.3d; multi-pass import block edits in Subtask 9.1a, Subtask 9.3a, Subtask 9.3d.

### Post-Module Buildout Phase 9: Route child workflow activation and child prompt/tool projection through the shared WorkflowRuntime
```md
- [ ] Subtask 9.1a
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In the import block at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1-L40), remove `createWorkflowSkillMetadata` from the legacy workflow-resolution import and add `getWorkflowSkillMetadata` from `@/core/task/workflow-runtime/WorkflowRegistry`. Keep `resolveAvailableWorkflows` imported in this subtask only; it is removed later in Subtask 9.3d after the activation call site no longer uses `workflowEntries`.
```

### Post-Module Buildout Phase 9: Route child workflow activation and child prompt/tool projection through the shared WorkflowRuntime
```md
- [ ] Subtask 9.1b
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In the available-skills assembly block at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L469-L484), leave the existing `workflowEntries` local in place for now, but replace `createWorkflowSkillMetadata(workflowEntries)` with `getWorkflowSkillMetadata()`.
```

### Post-Module Buildout Phase 9: Route child workflow activation and child prompt/tool projection through the shared WorkflowRuntime
```md
- [ ] Subtask 9.2a
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In `buildPromptContext(...)` at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L958-L1017), delete the legacy placeholder/managed prompt-context assembly (`activePlaceholderWorkflowSource`, `resolveWorkflowPersonaInstructions(...)`, `buildManagedWorkflowPrompt(...)`, `getBmadWorkflowReminder(...)`, `resolveActivePlaceholderWorkflowPromptContext(...)`, and `isDeterministicPlaceholderWorkflowSupported(...)`). Replace it with:
  - `const workflowProjection = await this.baseConfig.workflowRuntime.buildTurnProjection(params.state)`
  - `activeWorkflowName: params.state.activeWorkflowName`
  - `activeWorkflowPromptSections: params.shouldSendFullPromptAssembly ? workflowProjection?.prompt.promptSections.map((section) => section.text) : undefined`
  - `activeWorkflowPersonaInstruction: params.shouldSendFullPromptAssembly ? workflowProjection?.prompt.personaInstruction : undefined`
  - `activeWorkflowStepLabel: workflowProjection?.prompt.stepLabel`
  - `activeWorkflowStepNumber: workflowProjection?.prompt.stepNumber`
  - `activeWorkflowProgressRequestEnabled: workflowProjection?.prompt.workflowProgressRequestEnabled ?? false`
  - `activeWorkflowAllowedToolBundles: workflowProjection?.allowedToolBundles`
  - `currentFocusChainChecklist: workflowProjection?.focusChain.checklistMarkdown ?? params.state.currentFocusChainChecklist`
  Preserve the existing `skills`, `providerInfo`, `cwd`, `ide`, `browserSettings`, `mcpHub`, `enableNativeToolCalls`, `enableParallelToolCalling`, and `isSubagentRun` fields.
```

### Post-Module Buildout Phase 9: Route child workflow activation and child prompt/tool projection through the shared WorkflowRuntime
```md
- [ ] Subtask 9.2b
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In `maybeAppendCurrentStepInputPrompt(...)` at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1156-L1168), replace the focus-chain placeholder call `consumeCurrentPlaceholderWorkflowStepPromptForInput(...)` with `await this.baseConfig.workflowRuntime.buildCurrentStepPrompt(state, { forceAuxPrompt: true })` and keep the existing `content.push({ type: "text", text: prompt })` behavior for non-empty prompts.
```

### Post-Module Buildout Phase 9: Route child workflow activation and child prompt/tool projection through the shared WorkflowRuntime
```md
- [ ] Subtask 9.2c
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In `clearSubagentCurrentStepPromptMarkerForContextCompaction(...)` at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1170-L1173), delete the placeholder marker resets and replace them with a runtime-session marker reset that leaves all other workflow session fields intact:
  ```ts
  if (state.activeWorkflowSession) {
  	state.activeWorkflowSession = {
  		...state.activeWorkflowSession,
  		lastPromptedStepId: undefined,
  		lastPromptedAuxPromptKey: undefined,
  	}
  }
  ```
```

### Post-Module Buildout Phase 9: Route child workflow activation and child prompt/tool projection through the shared WorkflowRuntime
```md
- [ ] Subtask 9.3a
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In the import block at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1-L40), remove `getManagedWorkflowDefinition`, `activateManagedWorkflowInTaskState`, `activatePlaceholderWorkflowInTaskState`, `findResolvedWorkflowByName`, `resolveWorkflowPersonaInstructions`, `getBmadWorkflowReminder`, `buildManagedWorkflowPrompt`, `resolveActivePlaceholderWorkflowPromptContext`, `getPlaceholderWorkflowValueMap`, `extractWorkflowPlaceholderKeys`, and `isDeterministicPlaceholderWorkflowSupported`. Add `resolveWorkflowByUseSkillName` from `@/core/task/workflow-runtime/WorkflowRegistry`.
```

### Post-Module Buildout Phase 9: Route child workflow activation and child prompt/tool projection through the shared WorkflowRuntime
```md
- [ ] Subtask 9.3b
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In `autoActivateAssignedWorkflow(...)` at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1037-L1077), replace the entire method body with shared-runtime activation logic. Keep the method name, but change the third parameter to the optional compile-bridge form `workflowEntries?: unknown` and do not read it. The replacement method must:
  - return early unless `assignedSkillNames.length === 1`
  - return early when `state.activeWorkflowName` and `state.activeWorkflowSession` are already set
  - resolve the assigned skill through `resolveWorkflowByUseSkillName(assignedSkillNames[0])`
  - return early when no shipped workflow matches
  - call `await this.baseConfig.workflowRuntime.activateWorkflow({ taskState: state, workflowName: definition.name, invocationSource: "use_skill", parentWorkflowValues: this.baseConfig.taskState.activeWorkflowSession?.workflowValues })`
  Do not reference managed-workflow state, placeholder-workflow state, deterministic placeholder progression, or focus-chain checklist seeding in the replacement body. Parent-to-child workflow-value transfer must happen only through the runtime-owned `parentWorkflowValues` input and the child definition's `inheritedWorkflowValueKeys`.
```

### Post-Module Buildout Phase 9: Route child workflow activation and child prompt/tool projection through the shared WorkflowRuntime
```md
- [ ] Subtask 9.3c
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In the run-loop setup block at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L469-L484), delete the `workflowEntries = await resolveAvailableWorkflows(...)` local entirely and replace `await this.autoActivateAssignedWorkflow(state, assignedSkillNames, workflowEntries)` with `await this.autoActivateAssignedWorkflow(state, assignedSkillNames)`.
```

### Post-Module Buildout Phase 9: Route child workflow activation and child prompt/tool projection through the shared WorkflowRuntime
```md
- [ ] Subtask 9.3d
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In the import block at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1-L40), remove the now-unused `resolveAvailableWorkflows` import after Subtask 9.3c lands.
```

### Post-Module Buildout Phase 9: Route child workflow activation and child prompt/tool projection through the shared WorkflowRuntime
```md
- [ ] Subtask 9.3e
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: Delete the contiguous legacy helper block at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1079-L1154): `inheritSharedParentPlaceholdersToActivatedWorkflow(...)`, `applyInitialDeterministicPlaceholderProgressionIfNeeded(...)`, and `seedPlaceholderChecklistIfNeeded(...)`. After this edit, no child-workflow inheritance logic may remain outside `WorkflowRuntime.activateWorkflow(...)`.
```

## `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

Summary: Subtask 9.4a, Subtask 9.4b, Subtask 9.4c, Subtask 11.7 touch this file; same-code overlap appears in Subtask 9.4a and Subtask 11.7; Subtask 9.4b and Subtask 11.7.

### Post-Module Buildout Phase 9: Route child workflow activation and child prompt/tool projection through the shared WorkflowRuntime
```md
- [ ] Subtask 9.4a
  Allowed files: `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
  Revision: In the import/setup block at [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1-L64), remove the imports of `workflowActivation`, `workflowResolution`, and `resolveWorkflowPersonaInstructions`. Add imports for `WorkflowRuntime` from `@/core/task/workflow-runtime/WorkflowRuntime` and `resolveWorkflowDefinition` from `@/core/task/workflow-runtime/WorkflowRegistry`. Then update `createTaskConfig(...)` so the returned `TaskConfig` includes `workflowRuntime: new WorkflowRuntime(resolveWorkflowDefinition)`.
```

### Post-Module Buildout Phase 9: Route child workflow activation and child prompt/tool projection through the shared WorkflowRuntime
```md
- [ ] Subtask 9.4b
  Allowed files: `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
  Revision: In the `beforeEach(...)` block at [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L236-L242), delete the default stub of `workflowResolution.resolveAvailableWorkflows`. No registry-resolution stub should remain in this block after the Phase 9 cutover.
```

### Post-Module Buildout Phase 9: Route child workflow activation and child prompt/tool projection through the shared WorkflowRuntime
```md
- [ ] Subtask 9.4c
  Allowed files: `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
  Revision: Replace the workflow-specific test clusters at [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1000-L2705) so they no longer mention managed workflows, placeholder workflows, local/global/remote workflow discovery, `resolveAvailableWorkflows`, `activatePlaceholderWorkflowInTaskState`, inherited parent placeholders, or placeholder prompt/reminder fields. The replacement coverage in that same contiguous region must assert exactly these runtime-owned child-session behaviors:
  - prompt skill exposure includes normal skills plus shipped workflow skill metadata from `getWorkflowSkillMetadata()`
  - assigning one shipped workflow through `use_skill` activates only `activeWorkflowName` plus `activeWorkflowSession` in the child `TaskState`
  - when the child workflow definition declares `inheritedWorkflowValueKeys`, `autoActivateAssignedWorkflow(...)` passes parent session values into `workflowRuntime.activateWorkflow(...)` and only those declared same-key values are copied into the child session
  - `buildPromptContext(...)` projects `activeWorkflowName`, `activeWorkflowPromptSections`, `activeWorkflowPersonaInstruction`, `activeWorkflowStepLabel`, and `currentFocusChainChecklist` from `workflowRuntime.buildTurnProjection(...)`
  - `maybeAppendCurrentStepInputPrompt(...)` injects the active step prompt from `workflowRuntime.buildCurrentStepPrompt(...)`
  - clearing the prompt marker for context compaction resets only `activeWorkflowSession.lastPromptedStepId` and `activeWorkflowSession.lastPromptedAuxPromptKey`
  - a non-workflow assigned skill leaves child workflow state unset and falls back to the assigned-skill directive
```

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.7
  Allowed files: `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
  Revision: Update [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1-L260) so it asserts child-local runtime workflow activation with copy-based parent-value initialization only when `inheritedWorkflowValueKeys` is declared, and no shared mutable parent/child workflow session state.
```

## `src/core/task/workflow-activation.ts`

Summary: Only Subtask 10.1 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 10: Remove the legacy workflow owners only after every caller has been cut over
```md
- [ ] Subtask 10.1
  Allowed files: `src/core/task/workflow-activation.ts`
  Revision: Delete [workflow-activation.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts) after Phases 2-9 land and no caller imports it.
```

## `src/core/workflows/resolution/resolveAvailableWorkflows.ts`

Summary: Only Subtask 10.2 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 10: Remove the legacy workflow owners only after every caller has been cut over
```md
- [ ] Subtask 10.2
  Allowed files: `src/core/workflows/resolution/resolveAvailableWorkflows.ts`
  Revision: Delete [resolveAvailableWorkflows.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/resolution/resolveAvailableWorkflows.ts) only after Subtasks 3.3a through 3.5d and 9.4a through 9.4c land and no production or test caller imports it.
```

## `src/core/workflows/resolution/__tests__/resolveAvailableWorkflows.test.ts`

Summary: Only Subtask 10.3 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 10: Remove the legacy workflow owners only after every caller has been cut over
```md
- [ ] Subtask 10.3
  Allowed files: `src/core/workflows/resolution/__tests__/resolveAvailableWorkflows.test.ts`
  Revision: Delete [resolveAvailableWorkflows.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/resolution/__tests__/resolveAvailableWorkflows.test.ts) only after `WorkflowRegistry.ts` replacement coverage exists in the slash-command, main-task, `use_skill`, and subagent test surfaces and no code path uses `resolveAvailableWorkflows`.
```

## `src/core/workflows/placeholder-workflow-step-details.ts`

Summary: Only Subtask 10.4 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 10: Remove the legacy workflow owners only after every caller has been cut over
```md
- [ ] Subtask 10.4
  Allowed files: `src/core/workflows/placeholder-workflow-step-details.ts`
  Revision: Delete [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts) after Phases 6-9 land and no caller imports it.
```

## `src/core/workflows/placeholder-workflow-rendering.ts`

Summary: Only Subtask 10.5 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 10: Remove the legacy workflow owners only after every caller has been cut over
```md
- [ ] Subtask 10.5
  Allowed files: `src/core/workflows/placeholder-workflow-rendering.ts`
  Revision: Delete [placeholder-workflow-rendering.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-rendering.ts) after Phases 6-9 land and no caller imports it.
```

## `src/core/workflows/workflow-placeholders.ts`

Summary: Only Subtask 10.6 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 10: Remove the legacy workflow owners only after every caller has been cut over
```md
- [ ] Subtask 10.6
  Allowed files: `src/core/workflows/workflow-placeholders.ts`
  Revision: Delete [workflow-placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts) after Phases 6-9 land and no caller imports it.
```

## `src/core/task/managed-workflows/**`

Summary: Only Subtask 10.7 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 10: Remove the legacy workflow owners only after every caller has been cut over
```md
- [ ] Subtask 10.7
  Allowed files: `src/core/task/managed-workflows/**`
  Revision: Delete the entire `src/core/task/managed-workflows/` directory only after no runtime code path, slash-command path, use-skill path, prompt path, or subagent path imports any managed-workflow module.
```

## `src/core/prompts/system-prompt/__tests__/response_tools.test.ts`

Summary: Only Subtask 11.2 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.2
  Allowed files: `src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
  Revision: Update [response_tools.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts#L1-L220) so it asserts runtime-projected `activeWorkflowProgressRequestEnabled` and runtime-projected tool bundles only.
```

## `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`

Summary: Only Subtask 11.3 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.3
  Allowed files: `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
  Revision: Update [task_progress.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts#L1-L220) so it asserts the runtime-owned workflow progression instructions and the absence of `task_progress`.
```

## `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`

Summary: Only Subtask 11.4 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.4
  Allowed files: `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
  Revision: Replace [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L1-L220) with tests for `expandWorkflowToolBundles(...)`.
```

## `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`

Summary: Only Subtask 11.5 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.5
  Allowed files: `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`
  Revision: Update [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L1-L220) so it asserts runtime-owned workflow restore and focus-chain projection instead of placeholder workflow ownership.
```

## `src/core/prompts/system-prompt/__tests__/spec.test.ts`

Summary: Only Subtask 11.7a touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.7a
  Allowed files: `src/core/prompts/system-prompt/__tests__/spec.test.ts`
  Revision: Update the `set_workflow_placeholders` assertions in [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L328-L366) and the compact-description assertions in [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L854-L875) so they expect runtime-owned workflow-value wording, `context.activeWorkflowName` gating, and the unchanged `{"values": {...}}` wrapper shape.
```

## `src/core/prompts/system-prompt/__tests__/integration.test.ts`

Summary: Only Subtask 11.7b touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.7b
  Allowed files: `src/core/prompts/system-prompt/__tests__/integration.test.ts`
  Revision: Update the `set_workflow_placeholders` prompt/tool coverage in [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1364-L2249) so it no longer uses `activeWorkflowSupportsPlaceholders`, `managedWorkflowActive`, `activePlaceholderWorkflowName`, or `activePlaceholderWorkflowStepNumber`. Replace those cases with runtime-owned prompt/tool assertions using `activeWorkflowName`, `activeWorkflowStepNumber`, and workflow-runtime-projected tool bundles, while preserving the existing expectations about which workflow steps do or do not expose `set_workflow_placeholders`.
```

## `docs/agent-101.md`

Summary: Only Subtask 11.8 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.8
  Allowed files: `docs/agent-101.md`
  Revision: Update [agent-101.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/agent-101.md) so it no longer describes managed workflows, placeholder markdown ownership, or `task_progress` as the workflow progression contract.
```

## `docs/workflows/workflow-document-runtime-review.md`

Summary: Only Subtask 11.9 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.9
  Allowed files: `docs/workflows/workflow-document-runtime-review.md`
  Revision: Update [workflow-document-runtime-review.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-document-runtime-review.md) so it documents code-owned workflow modules and runtime-owned session state rather than placeholder markdown ownership.
```

## `docs/workflows/workflow-automation-readme.md`

Summary: Only Subtask 11.10 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.10
  Allowed files: `docs/workflows/workflow-automation-readme.md`
  Revision: Update [workflow-automation-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-automation-readme.md) so it documents workflow runtime orchestration instead of legacy activation and placeholder flow.
```

## `docs/workflows/deterministic-workflow-progression-readme.md`

Summary: Only Subtask 11.11 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.11
  Allowed files: `docs/workflows/deterministic-workflow-progression-readme.md`
  Revision: Update [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md) so it documents deterministic resolution as workflow-module-owned definitions orchestrated by `WorkflowRuntime`.
```

## `docs/system-prompt-tool-reference.md`

Summary: Only Subtask 11.12 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.12
  Allowed files: `docs/system-prompt-tool-reference.md`
  Revision: Update [system-prompt-tool-reference.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/system-prompt-tool-reference.md) so it documents runtime-owned workflow prompt/tool projection, the retained `set_workflow_placeholders` tool as the AI-callable workflow-value persistence seam, and the removal of `task_progress`.
```

## `docs/workflow-ui-surface/workflow-form-readme.md`

Summary: Only Subtask 11.13 touches this file; the trace does not show same-file churn here.

### Post-Module Buildout Phase 11: Align tests and docs with the final runtime-owned workflow architecture
```md
- [ ] Subtask 11.13
  Allowed files: `docs/workflow-ui-surface/workflow-form-readme.md`
  Revision: Update [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md) so it documents workflow modules as the owner of form definitions and `WorkflowRuntime` as the owner of orchestration.

## Required Validation After Phase 11

Run these exact commands after implementation is complete:

1. `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
2. `npm run test:unit -- src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
3. `npm run test:unit -- src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`
4. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
5. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
6. `npm run test:unit -- src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
7. `npm run test:unit -- src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
8. `npm run test:unit -- src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
9. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts`
10. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`

If any command fails for a reason not explicitly covered by this plan, stop and ask the user before widening scope.
```
