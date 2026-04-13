---
title: Workflow Runtime Action Plan
instructions:
  - Read this plan from top to bottom before making any code change.
  - Read each step in full immediately before executing it.
  - Execute only the current step.
  - After completing a step, change that step's checkbox from "[ ]" to "[x]".
  - After marking a step complete, return to this document and read the next step in full before making any further change.
  - Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
  - Do not edit any file not listed in the current step's allowed-files list.
  - Do not modify any workflow source file under `/Users/robertboston/Documents/Cline/Workflows/`; those files are migration sources only.
  - If any ambiguity is discovered, or if any code, test, snapshot, or documentation change appears necessary that is not explicitly prescribed below, stop and ask the user before proceeding.
  - Preserve the current shipped workflow identifier strings exactly as they exist today, including the `.md` suffix. `activeWorkflowName` must use those exact strings.
  - The workflow runtime is the new canonical owner of workflow identity, session state, active step, prompting projection, tool projection, progression, completion, persistence, resume, and child-session isolation.
  - Focus chain becomes a workflow-only downstream projection surface. `task_progress` is retired as a model-controlled progression/update contract.
  - Existing specialist capabilities remain specialist capabilities: final system prompt assembly stays in the system-prompt architecture; workflow-form rendering stays in the workflow-form UI surface; start-card rendering stays in the start-card UI surface; normal deterministic operations stay on the normal tool execution path.
---

# Workflow Runtime Action Plan

This plan implements the approved end-state described in:

- [project-overview.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/project-overview.md)
- [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md)

## Live Seams Verified Before Authoring

- Legacy workflow identity is currently split across `activeWorkflowId`, `activePlaceholderWorkflowId`, and `managedWorkflowRun` in [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L152) and [ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts#L42).
- `task/index.ts` currently owns activation, workflow-form orchestration, step-resolution orchestration, prompt-context assembly, persistence, completion, and teardown across the placeholder and managed paths at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1853), [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1932), [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2432), and [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3905).
- Focus chain currently owns active-step derivation, placeholder step prompting, checklist persistence, and deterministic progression in [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L255), [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L398), [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L598), and [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L763).
- Workflow-form definitions and trigger logic are currently split across [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L42) and [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L151).
- Deterministic step-resolution definitions are currently split across [WorkflowStepResolutionRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts#L5) and the trigger registry under the same folder.
- Workflow completion is currently split across [workflowCompletionRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionRunner.ts#L42) and [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts#L9).
- Prompt/persona/reminder/tool exposure is currently split across [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts#L95), [workflowPersonaRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts#L14), [bmad-agent-mode.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/bmad-agent-mode.ts#L12), [contextualNativeToolFilter.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts#L65), and [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1).
- Workflow-form and deterministic-session callers still consume the legacy field names and owner literals in [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L21), [buildWorkflowFormPayload.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/buildWorkflowFormPayload.ts#L4), and [task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1849). Removing those names before a compatibility cutover leaves later subtasks blocked on stale consumers.
- Tool-handler workflow-runtime plumbing and validation are currently split across [TaskConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/types/TaskConfig.ts#L35), [ToolConstants.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/utils/ToolConstants.ts#L12), [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L147), and [task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1094). `workflowRuntime` is not yet instantiated on `Task`, threaded into `ToolExecutor`, or validated in the task-config key lists.
- Stable shared workflow values still live in `.cline/workflow-config.yaml` and [workflow-placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts#L1-L149), while the new workflow modules already contain runtime-authored `{key}` tokens in `promptText` and `relativePathPattern`. [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L47-L83) currently seeds `workflowValues: {}` and returns `promptText` verbatim, so the current plan must add explicit runtime-owned shared-value seeding and token expansion before later workflow-module migration can complete safely.
- Slash-command workflow discovery still depends on dynamic workflow resolution in [slash-commands/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/index.ts#L24), [getAvailableSlashCommands.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/slash/getAvailableSlashCommands.ts#L25), and [resolveAvailableWorkflows.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/resolution/resolveAvailableWorkflows.ts#L47).
- Subagent workflow activation still depends on the legacy resolution and placeholder paths in [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L471), [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L973), and [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1037).

## Locked Design Decisions For This Plan

- `activeWorkflowName` becomes the sole canonical workflow-identity flag.
- The canonical workflow identifier remains the current shipped workflow name string including `.md`, for example `code-review.md` and `quick-spec.md`.
- Shipped workflows are registered in product-owned runtime code; user-authored workflow discovery is removed.
- One shared runtime lives at `src/core/task/workflow-runtime/WorkflowRuntime.ts`.
- One code-owned workflow definition module lives under `src/core/task/workflow-runtime/workflows/<workflow>/definition.ts` for each shipped workflow.
- Workflow modules own prompt content, start-card text, workflow-start form requirements, per-step native tool bundles, progression rules, deterministic hooks, completion hooks, generated-document artifact builders, and runtime-coded starter-content builders.
- The system-prompt architecture remains the final assembler; it consumes runtime-projected workflow prompt/tool data.
- Contextual tool gating as a separate owner is retired; its current contents move into workflow modules plus shared workflow-runtime bundle constants.
- The stable shared workflow values currently supplied by `.cline/workflow-config.yaml` move into `src/core/task/workflow-runtime/workflowRuntimeConfig.ts` as runtime-owned defaults. `WorkflowRuntime` seeds each new `activeWorkflowSession.workflowValues` map from those defaults and resolves workflow-module `{key}` tokens against that session state.
- Curly-brace variable references remain allowed only as runtime-owned interpolation markers inside workflow-module prompt text and generated-document path patterns. They are no longer described as placeholder-system ownership or as values coming from `.cline/workflow-config.yaml`.
- Workflow forms and step-resolution remain external specialist capabilities, but workflow-specific definition ownership moves into workflow modules and orchestration moves into `WorkflowRuntime`.
- Focus chain becomes a downstream renderer of runtime-owned workflow state. The model no longer updates workflow state through `task_progress`.
- Subagent workflow sessions remain child-local and never share mutable session state with the parent session. When a child workflow definition explicitly declares `inheritedWorkflowValueKeys`, the shared `WorkflowRuntime` seeds only those same-key values into the child session during activation as copy-based initialization.
- The renamed shared workflow-form payload type is `WorkflowForm`, and its workflow-form identity field is `workflowFormId`.

## Workflow Module Inventory And Source Map

Create one workflow definition module for each shipped workflow listed below. For each module:

- Copy the step titles and step body text from the matching external source file under `/Users/robertboston/Documents/Cline/Workflows/`.
- Copy the start-card body from [WorkflowStartCardRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/WorkflowStartCardRegistry.ts#L3).
- Copy the workflow persona instruction text from the matching entry currently resolved through [workflowPersonaRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts#L14).
- Copy the per-step tool bundles from [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L93).
- If the workflow currently participates in workflow-start parsing, workflow forms, deterministic progression, deterministic step resolution, or completion handling, move that behavior into the module using the exact source seams called out later in this plan.

The required workflow modules are:

- `advanced-elicitation`
- `blind-review`
- `brainstorming`
- `check-implementation-readiness`
- `cis-design-thinking`
- `cis-innovation-strategy`
- `cis-problem-solving`
- `cis-storytelling`
- `code-review`
- `correct-course`
- `create-architecture`
- `create-epics`
- `create-prd`
- `create-product-brief`
- `create-story`
- `create-ux-design`
- `dev-story`
- `distillator`
- `document-project`
- `domain-research`
- `edit-prd`
- `editorial-review-prose`
- `editorial-review-structure`
- `generate-project-context`
- `help`
- `index-docs`
- `market-research`
- `party-mode`
- `pi-planning`
- `qa-generate-e2e-tests`
- `quick-dev`
- `quick-dev-new-preview`
- `quick-spec`
- `retrospective`
- `review-adversarial-general`
- `review-edge-case-hunter`
- `shard-doc`
- `sprint-planning`
- `sprint-status`
- `teach-me-testing`
- `technical-research`
- `validate-prd`
- `write-remediation-story`

The workflows whose Step 1 currently feeds workflow-start requirements from authored markdown are:

- `blind-review.md`
- `brainstorming.md`
- `code-review.md`
- `correct-course.md`
- `create-epics.md`
- `create-prd.md`
- `create-story.md`
- `dev-story.md`
- `pi-planning.md`
- `quick-dev.md`
- `quick-spec.md`
- `review-adversarial-general.md`
- `review-edge-case-hunter.md`
- `write-remediation-story.md`

The workflows with current workflow-form hooks are:

- `code-review.md` Step 2 from [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L298)
- `brainstorming.md` Steps 2, 3, and 4 from [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L307)
- the current generic workflow-start placeholder form from [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L46)

The workflows with current deterministic step-resolution hooks are:

- `code-review.md` Step 3 from [WorkflowStepResolutionRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts#L57)
- `write-remediation-story.md` Step 2 from [WorkflowStepResolutionRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts#L99)
- `quick-spec.md` Step 2 from [WorkflowStepResolutionRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts#L141)
- `brainstorming.md` Step 2 from [WorkflowStepResolutionRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts#L175)

The workflows with current `workflow_progress_request` enablement are:

- `create-prd.md` Steps 3 through 14 from [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1)
- `create-story.md` Steps 3 and 4
- `quick-dev.md` Step 2
- `quick-spec.md` Steps 3 through 9
- `create-epics.md` Step 3
- `pi-planning.md` Steps 4 and 5

The exact Phase 2 `progress.mechanism` derivation order is:

1. If the step is listed in the explicit `workflow_progress_request` map immediately below, use `"workflow_progress_request"`.
2. Otherwise, if the authored step heading begins with `(System-Owned)`, or the step is currently intercepted by the verified workflow-form or deterministic step-resolution hook lists above, use `"automatic"`.
3. Otherwise use `"manual_user_turn"`.

The explicit `workflow_progress_request` map for Phase 2 is:

- `create-prd.md` Steps 3 through 14 from [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1)
- `create-story.md` Steps 3 and 4 from [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1)
- `quick-dev.md` Step 2 from [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1)
- `quick-spec.md` Steps 3 through 9 from [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1)
- `create-epics.md` Step 3 from [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1)
- `pi-planning.md` Steps 4 and 5 from [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1)
- `brainstorming.md` Step 4 from authored markdown at `/Users/robertboston/Documents/Cline/Workflows/brainstorming.md` line 76

The workflows with current completion handlers are:

- `code-review.md` via `CODE_REVIEW_SPEC_UPDATE` in [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts#L9)

The exact reminder-source map from `_bmad/_config/workflow-reminders.json` into workflow modules is:

- `brainstorming.md` <= `bmad-brainstorming`
- `market-research.md` <= `bmad-market-research`
- `domain-research.md` <= `bmad-domain-research`
- `technical-research.md` <= `bmad-technical-research`
- `create-product-brief.md` <= `bmad-create-product-brief`
- `document-project.md` <= `bmad-document-project`
- `party-mode.md` <= `bmad-party-mode`
- `create-prd.md` <= `bmad-create-prd`
- `validate-prd.md` <= `bmad-validate-prd`
- `edit-prd.md` <= `bmad-edit-prd`
- `create-epics.md` <= `bmad-create-epics-and-stories`
- `check-implementation-readiness.md` <= `bmad-check-implementation-readiness`
- `correct-course.md` <= `bmad-correct-course`
- `create-architecture.md` <= `bmad-create-architecture`
- `create-ux-design.md` <= `bmad-create-ux-design`
- `sprint-planning.md` <= `bmad-sprint-planning`
- `create-story.md` <= `bmad-create-story`
- `retrospective.md` <= `bmad-retrospective`
- `dev-story.md` <= `bmad-dev-story`
- `code-review.md` <= `bmad-code-review`
- `qa-generate-e2e-tests.md` <= `bmad-qa-generate-e2e-tests`
- `quick-spec.md` <= `bmad-quick-spec`
- `quick-dev.md` <= `bmad-quick-dev`

No workflow module outside the list above should define `workflowReminderText` in this pass.

## Execution Notes

Use the verified line ranges below as the starting anchors. If a previously completed subtask shifts a later file’s absolute line numbers, match on the exact symbol name and pre-edit code block shown in that subtask, then apply only that one contiguous revision.

## Task / Subtask Sequence

### Phase 1: Normalize the canonical contracts before any workflow-module migration

- [x] Subtask 1.1
  Allowed files: `src/core/task/workflow-form/types.ts`
  Revision: In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L9-L67), replace the top contract block so it uses `WorkflowFormId`, `WorkflowFormDefinition`, `workflowFormId`, and `WorkflowFormSessionOwner.kind: "workflow_step" | "workflow_start"`. Keep `WorkflowFormToolExecutionRequest` and `WorkflowFormOperationApplicationResult` structurally identical.

- [x] Subtask 1.2
  Allowed files: `src/core/task/workflow-form/types.ts`
  Revision: In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L74-L134), replace the session/runtime block so `WorkflowFormSessionState`, `WorkflowFormRuntimeCreateSessionOptions`, and `WorkflowFormRuntimeLike` use `workflowFormId` and the renamed owner literals everywhere. No `resolverId`, `WorkflowFormResolverId`, `"placeholder_workflow_step"`, or `"slash_command"` string may remain in this file.

- [x] Subtask 1.3
  Allowed files: `src/core/task/workflow-step-resolution/types.ts`
  Revision: In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/types.ts#L8-L60), replace the owner/session contract block so `WorkflowStepResolutionSessionOwner.kind` is exactly `"workflow_step"` and the owner payload remains `{ workflowName: string; stepNumber: number }`.

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
  - add `inheritedWorkflowValueKeys?: string[]` to `WorkflowDefinition` for explicit same-key parent-to-child workflow-value initialization only
  - preserve `completionToolId?: ClineDefaultTool`
  - extend `WorkflowRuntimeLike.activateWorkflow(...)` so its args include optional `parentWorkflowValues?: Record<string, unknown>`
  - extend `WorkflowRuntimeLike` with the exact method `applyWorkflowValueWrites(args: { taskState: TaskState; values: Record<string, unknown> }): Promise<{ changedKeys: string[]; unchangedKeys: string[] }>`
  - extend `WorkflowRuntimeLike` with exact method names for task/index delegation: `executeWorkflowFormOperationAndSync(args: { taskState: TaskState; operationId: string; toolResultText?: string }): Promise<void>` and `executeWorkflowStepResolutionToolAndSync(args: { taskState: TaskState; toolResultText?: string }): Promise<void>`

- [x] Subtask 1.5
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: In [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L1-L157), update imports and compile-time typing only so the class matches the Subtask 1.4 contract without adding new orchestration logic yet.

- [x] Subtask 1.6
  Allowed files: `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
  Revision: In [WorkflowRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts#L8-L166), update the fixture and assertions so the test file compiles against the Subtasks 1.1-1.4 contract changes.

- [x] Subtask 1.7
  Allowed files: `src/core/task/tools/types/TaskConfig.ts`
  Revision: In [TaskConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/types/TaskConfig.ts#L128-L155), add `workflowRuntime: WorkflowRuntimeLike` to the task config contract so `UseSkillToolHandler`, workflow-specific deterministic handlers, and subagent orchestration can delegate into the shared runtime from the start of implementation.

- [x] Subtask 1.8
  Allowed files: `src/core/task/workflow-runtime/types.ts`, `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
  Revision: In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/types.ts#L1-L160), revise the `WorkflowArtifactDefinition` contract added in Subtask 1.4 so it models generated workflow documents rather than source template files. Make these exact changes in one contiguous edit:
  - replace `relativePath` with `relativePathPattern`
  - replace `template` with `initialContent`
  - add `collisionStrategy?: "overwrite" | "append_numeric_suffix"`
  - require artifact record keys to equal artifact `id`
  - `relativePathPattern` must always describe the generated document path contract and must never point at a source template file such as `template.md`
  - `initialContent` must hold the runtime-coded starter body copied from the current template dependency
  Then update [WorkflowRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts#L8-L220) so its fixture shape matches the revised artifact contract.

- [ ] Subtask 1.9a
  Allowed files: `src/shared/ExtensionMessage.ts`
  Revision: In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L562-L573), replace the `ClineWorkflowForm` interface block with `WorkflowForm`, and rename the payload identity field from `resolverId` to `workflowFormId` in that same block.

- [ ] Subtask 1.9b
  Allowed files: `src/core/task/workflow-form/types.ts`
  Revision: In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L1-L123), replace every `ClineWorkflowForm` import and return-type reference with `WorkflowForm`.

- [ ] Subtask 1.9c
  Allowed files: `src/core/task/workflow-form/buildWorkflowFormPayload.ts`
  Revision: In [buildWorkflowFormPayload.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/buildWorkflowFormPayload.ts#L1-L19), replace the imported/returned payload type `ClineWorkflowForm` with `WorkflowForm`, and emit `workflowFormId: args.session.workflowFormId` instead of `resolverId`.

- [ ] Subtask 1.9d
  Allowed files: `src/core/task/workflow-form/WorkflowFormRuntime.ts`
  Revision: In the import block at [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L1-L29), replace the imported payload type `ClineWorkflowForm` with `WorkflowForm`.

- [ ] Subtask 1.9da
  Allowed files: `src/core/task/workflow-form/WorkflowFormRuntime.ts`
  Revision: In the payload-method block at [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L645-L672), replace every `ClineWorkflowForm` return type with `WorkflowForm`.

- [ ] Subtask 1.9e
  Allowed files: `src/core/task/workflow-form/WorkflowFormRuntime.ts`
  Revision: In the `createSession(...)` return block at [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L615-L630), replace `resolverId: options.resolverId` with `workflowFormId: options.workflowFormId`, remove the `triggerSource: options.triggerSource` line entirely, and leave the rest of the created session shape unchanged.

- [ ] Subtask 1.9f
  Allowed files: `src/core/task/workflow-form/WorkflowFormRuntime.ts`
  Revision: In the definition-rebuild/helper block at [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L1016-L1141), replace the session-field lookup `session.resolverId` with `session.workflowFormId`, rename the helper parameter from `resolverId` to `workflowFormId`, and keep the registry-backed resolver lookup behavior intact.

- [ ] Subtask 1.9g
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the helper block at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L61-L127), replace draft-session, create-session, and registry-session helper fixtures so they use `workflowFormId`, omit `triggerSource`, and use owner kinds `"workflow_step"` and `"workflow_start"` instead of the legacy literals.

- [ ] Subtask 1.9h
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the Brainstorming Step 4 session-construction block at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L506-L515), replace `resolverId` with `workflowFormId`, remove `triggerSource`, and replace `kind: "placeholder_workflow_step"` with `kind: "workflow_step"`.

- [ ] Subtask 1.9i
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the workflow-start session-construction blocks at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1047-L1056) and [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1088-L1097), replace `resolverId` with `workflowFormId`, remove `triggerSource`, and replace `kind: "slash_command"` with `kind: "workflow_start"`.

- [ ] Subtask 1.9j
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the registry-session call at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1320-L1324), replace the argument key `resolverId` with `workflowFormId`.

- [ ] Subtask 1.9k
  Allowed files: `src/core/task/index.ts`
  Revision: In the shared import block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L87-L99), replace `type ClineWorkflowForm` with `type WorkflowForm`.

- [ ] Subtask 1.9l
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1548-L1575), replace `renderWorkflowFormMessage(payload: ClineWorkflowForm)` with `renderWorkflowFormMessage(payload: WorkflowForm)`, replace the thread-display metadata field `resolverId: payload.resolverId` with `workflowFormId: payload.workflowFormId`, and replace `Partial<ClineWorkflowForm>` with `Partial<WorkflowForm>`.

- [ ] Subtask 1.9m
  Allowed files: `src/core/task/index.ts`
  Revision: In the workflow-form submission handling block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1417-L1435), replace every `outcome.session.resolverId` and `activeSession.resolverId` reference with `outcome.session.workflowFormId` and `activeSession.workflowFormId` respectively, leaving the existing `suppressedWorkflowFormResolverIds` array name unchanged in this phase.

- [ ] Subtask 1.9n
  Allowed files: `src/core/task/index.ts`
  Revision: In the workflow-form deterministic-operation block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1842-L1857), replace both registry lookups that currently read `session.resolverId` and `outcome.session.resolverId` so they instead read `session.workflowFormId` and `outcome.session.workflowFormId`.

- [ ] Subtask 1.9o
  Allowed files: `src/core/task/index.ts`
  Revision: In the workflow-form session-creation block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1975-L2012), replace `owner.kind === "slash_command"` with `"workflow_start"`, and replace both workflow-form `createSession(...)` argument objects so they pass `workflowFormId: <candidate>.resolverId` and no longer pass `triggerSource`.

- [ ] Subtask 1.9p
  Allowed files: `src/core/task/index.ts`
  Revision: In the workflow-form fallback-suppression block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2104-L2118), replace both `pendingOperationOutcome.session.resolverId` references with `pendingOperationOutcome.session.workflowFormId`, leaving the suppression-array name unchanged in this phase.

- [ ] Subtask 1.9q
  Allowed files: `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
  Revision: In the helper block at [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1-L164), replace the imported payload type `ClineWorkflowForm` with `WorkflowForm`, replace session fixtures so they use `workflowFormId`, remove `triggerSource`, replace `kind: "placeholder_workflow_step"` with `kind: "workflow_step"`, and replace the helper payload field `resolverId` with `workflowFormId`.

- [ ] Subtask 1.9r
  Allowed files: `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
  Revision: In the restore-fixture block at [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L201-L249), replace every would-be V2 workflow-form fixture field `resolverId` with `workflowFormId`, remove the legacy V2-only `triggerSource` fixture field, and replace `kind: "placeholder_workflow_step"` with `kind: "workflow_step"` where present.

- [ ] Subtask 1.9s
  Allowed files: `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
  Revision: In the render/resume test block at [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L290-L338), replace the callback payload type `ClineWorkflowForm` with `WorkflowForm`, replace the Brainstorming session fixture key `resolverId` with `workflowFormId`, and replace `kind: "placeholder_workflow_step"` with `kind: "workflow_step"`.

- [ ] Subtask 1.10a
  Allowed files: `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts`
  Revision: In [WorkflowStepResolutionRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts#L8-L89), replace every `owner.kind: "placeholder_workflow_step"` literal with `owner.kind: "workflow_step"`.

- [ ] Subtask 1.10b
  Allowed files: `src/core/task/index.ts`
  Revision: In the workflow-step-resolution session-creation block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2169-L2178), replace `kind: "placeholder_workflow_step"` with `kind: "workflow_step"` and leave the rest of the owner payload unchanged.

- [ ] Subtask 1.11a
  Allowed files: `src/core/task/index.ts`
  Revision: In the runtime field declaration block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L769-L771), insert `private workflowRuntime: WorkflowRuntime` immediately before the existing `workflowFormRuntime` and `workflowStepResolutionRuntime` fields.

- [ ] Subtask 1.11b
  Allowed files: `src/core/task/index.ts`
  Revision: In the runtime-instantiation block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L871-L876), insert `this.workflowRuntime = new WorkflowRuntime(undefined, cwd)` immediately before the existing workflow-form and workflow-step-resolution runtime instantiations.

- [ ] Subtask 1.11c
  Allowed files: `src/core/task/index.ts`
  Revision: In the `new ToolExecutor(...)` call at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1094-L1128), insert `this.workflowRuntime` immediately after `this.taskState` and before `this.messageStateHandler`.

- [ ] Subtask 1.11d
  Allowed files: `src/core/task/ToolExecutor.ts`
  Revision: In the constructor signature at [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L71-L137), insert a new constructor parameter `private workflowRuntime: WorkflowRuntimeLike` immediately after `private taskState: TaskState`.

- [ ] Subtask 1.11e
  Allowed files: `src/core/task/ToolExecutor.ts`
  Revision: In `asToolConfig()` at [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L147-L223), add `workflowRuntime: this.workflowRuntime` immediately after `taskState: this.taskState`.

- [ ] Subtask 1.11f
  Allowed files: `src/core/task/tools/utils/ToolConstants.ts`
  Revision: In the `TASK_CONFIG_KEYS` array at [ToolConstants.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/utils/ToolConstants.ts#L12-L33), insert `"workflowRuntime"` immediately after `"taskState"`.

- [ ] Subtask 1.11g
  Allowed files: `src/core/task/workflow-runtime/workflowRuntimeConfig.ts`
  Revision: In [workflowRuntimeConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/workflowRuntimeConfig.ts#L1-L119), add the runtime-owned shared-value and text-resolution helpers immediately below the imports and above `WORKFLOW_NATIVE_TOOL_BUNDLES`. Make one contiguous edit that:
  - adds `import path from "path"`
  - exports `buildWorkflowSharedValueDefaults(cwd: string): Record<string, string>` that returns exactly these keys and values:
    - `"project-root"` => `cwd`
    - `project_root` => `cwd`
    - `cwd` => `cwd`
    - `date` => `new Date().toISOString().split("T")[0]`
    - `project_name` => `"cline"`
    - `user_skill_level` => `"intermediate"`
    - `planning_artifacts` => `path.join(cwd, "_bmad-output", "planning-artifacts").replace(/\\\\/g, "/")`
    - `implementation_artifacts` => `path.join(cwd, "_bmad-output", "implementation-artifacts").replace(/\\\\/g, "/")`
    - `project_knowledge` => `path.join(cwd, "docs").replace(/\\\\/g, "/")`
    - `user_name` => `"Rob"`
    - `communication_language` => `"English"`
    - `document_output_language` => `"English"`
    - `output_folder` => `path.join(cwd, "_bmad-output").replace(/\\\\/g, "/")`
    - `diff_output` => `path.join(cwd, "_bmad-output", "review-input.diff").replace(/\\\\/g, "/")`
    - `review_input` => `path.join(cwd, "_bmad-output", "review-input.md").replace(/\\\\/g, "/")`
    - `project_context` => `path.join(cwd, "_bmad-output", "project-context.md").replace(/\\\\/g, "/")`
  - exports `resolveWorkflowRuntimeText(text: string | undefined, values: Record<string, unknown>): string | undefined` that performs the same three-pass `{key}` and `{{key}}` replacement semantics currently implemented in `resolveWorkflowPlaceholderText(...)`, stringifies string/number/boolean values, leaves unresolved tokens unchanged, and returns the original `text` when it is empty or undefined

- [ ] Subtask 1.11h
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: In the constructor signature, import block, and `createInitialSession(...)` block at [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L1-L157), import `buildWorkflowSharedValueDefaults` from `@/core/task/workflow-runtime/workflowRuntimeConfig`, change the constructor to `constructor(private readonly resolveDefinition: WorkflowDefinitionResolver = () => undefined, private readonly cwd: string = process.cwd()) {}`, and replace `workflowValues: {}` with `workflowValues: buildWorkflowSharedValueDefaults(this.cwd)`.

- [ ] Subtask 1.11i
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: In the projection methods at [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L47-L83), import `resolveWorkflowRuntimeText` from `@/core/task/workflow-runtime/workflowRuntimeConfig`, resolve `activeStep.promptText` against `session.workflowValues`, and use the resolved value in both `buildTurnProjection(...)` and `buildCurrentStepPrompt(...)`. Leave checklist rendering and tool-bundle projection unchanged.

- [ ] Subtask 1.11j
  Allowed files: `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
  Revision: In [WorkflowRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts#L1-L166), update the fixture and assertions so:
  - the Step 2 `promptText` fixture becomes `Inspect the diff at {diff_output} carefully.`
  - the activation test asserts `activeWorkflowSession.workflowValues` contains at least `"project-root"`, `project_root`, `cwd`, `date`, `output_folder`, `diff_output`, `review_input`, and `project_context`
  - the projection test asserts the Step 2 prompt section equals `Inspect the diff at ${taskState.activeWorkflowSession?.workflowValues.diff_output} carefully.`
  - add one activation test fixture whose definition sets `inheritedWorkflowValueKeys: ["project_context"]`, activate it with `parentWorkflowValues: { project_context: "docs/project-context.md", output_folder: "ignored-parent-value" }`, and assert only `project_context` is copied into the child session from the parent input

### Phase 2: Create the shipped workflow module surface one file at a time

Definition creation rule used by every `definition.ts` task below:

- Create exactly one exported `WorkflowDefinition` constant named `<camelCaseWorkflowName>WorkflowDefinition`.
- Set `name`, `slashCommandName`, and `useSkillName` to the exact shipped workflow id including `.md`.
- Transcribe the workflow from the matching file under `/Users/robertboston/Documents/Cline/Workflows/`.
- Set each step id exactly to `step-1`, `step-2`, `step-3`, and so on.
- Set each `stepNumber` to the authored step number and each `stepLabel` to the authored step heading text.
- Preserve authored markdown body text in `promptText` except for placeholder-era ownership wording. Replace any instruction that names `workflow placeholder state`, `stable placeholder`, or `.cline/workflow-config.yaml` with equivalent runtime-owned workflow-session wording while preserving the original step intent and workflow value keys.
- When the authored workflow step explicitly tells the model to persist a workflow-owned value, preserve the tool id `set_workflow_placeholders` as the AI-callable workflow-value persistence tool, but rewrite the surrounding wording so it refers to runtime-owned workflow values rather than placeholder ownership.
- Copy `startCardMarkdown` from the matching `WorkflowStartCardRegistry.ts` entry.
- Copy `personaInstruction` from the current workflow persona registry entry for that workflow.
- Copy `toolBundles` from the matching `contextualToolMatrix.ts` workflow row.
- Populate `progress.mechanism` exactly from the derivation order and explicit step map verified in this plan. Do not infer any other mechanism.
- Preserve `{key}` references only when that key is intended to resolve from `activeWorkflowSession.workflowValues` through the runtime-owned token-expansion seam added in Subtasks 1.11g-1.11i.
- Populate `workflowReminderText`, `workflowStartForm`, `completionToolId`, `artifacts`, `dataAssets`, `workflowForms`, and `deterministicResolvers` only where this plan explicitly instructs it.
- Leave `inheritedWorkflowValueKeys` unset in Phase 2 unless a later subagent-specific task in this plan explicitly prescribes it.
- Do not add helper functions or extra exports to any `definition.ts` file.

Artifact creation rule used by every `artifacts.ts` task below:

- Create exactly one exported constant named `<camelCaseWorkflowName>Artifacts`.
- Type it as `Record<string, WorkflowArtifactDefinition>`.
- Every artifact entry represents a generated workflow document contract, not a source template file.
- The artifact record key must exactly equal the artifact `id`.
- If the current runtime already persists the generated artifact path under a canonical workflow value key, use that exact key as the artifact record key and `id`.
- `relativePathPattern` must describe the generated document path pattern relative to the workflow-controlled output root. It must never be a source template location.
- `relativePathPattern` may include `{key}` tokens only for runtime-owned workflow value keys resolved from `activeWorkflowSession.workflowValues`.
- `initialContent` must inline the runtime-coded starter body copied from the current template dependency path recorded in `_bmad/_config/managed-workflows.json` plus `_bmad/_config/files-manifest.csv`.
- Use `collisionStrategy: "append_numeric_suffix"` only when the current runtime creates numbered sibling files on collision. Otherwise use `collisionStrategy: "overwrite"` or omit it when overwrite is the default runtime behavior.
- Preserve the currently verified artifact-path keys where they already exist in live handlers and tests, including `output_file`, `epic_delivery_spec`, and `story_doc`.

Data-asset creation rule used by every `data.ts` task below:

- Create exactly one exported constant named `<camelCaseWorkflowName>DataAssets`.
- Type it as `Record<string, WorkflowDataAsset>`.
- The data-asset record key must exactly equal the data-asset `id`.
- If the current runtime already reads a static asset through a named helper or canonical file such as `brain-methods.csv`, preserve that source identity in the `id` using snake_case rather than inventing a new label.
- Use `format: "csv"` for comma-separated libraries, `format: "yaml"` for YAML sources, `format: "json"` for JSON sources, and `format: "markdown"` for Markdown content.
- Inline the static data currently sourced by the workflow. No runtime file reads may remain for those data assets after migration.

- [x] Subtask 2.1
  Allowed files: `src/core/task/workflow-runtime/workflows/advanced-elicitation/definition.ts`
  Revision: Create `advanced-elicitation/definition.ts` using the definition creation rule with export `advancedElicitationWorkflowDefinition`. This file has no reminder, no start-form, no artifacts, no data assets, no workflow forms, and no deterministic resolvers.

- [x] Subtask 2.2
  Allowed files: `src/core/task/workflow-runtime/workflows/blind-review/definition.ts`
  Revision: Create `blind-review/definition.ts` using the definition creation rule with export `blindReviewWorkflowDefinition`. Include the Step 1 workflow-start requirements derived from the current authored workflow-start fields for `blind-review.md`. Do not add reminder, artifacts, data assets, workflow forms, or deterministic resolvers.

- [x] Subtask 2.3
  Allowed files: `src/core/task/workflow-runtime/workflows/brainstorming/artifacts.ts`
  Revision: Create `brainstorming/artifacts.ts` using the artifact creation rule with export `brainstormingArtifacts`. This file must export exactly one artifact definition keyed by `output_file` with `id: "output_file"`, `relativePathPattern: "brainstorming/brainstorming-session-{date}.md"`, `collisionStrategy: "append_numeric_suffix"`, and `initialContent` equal to the inlined body currently sourced from `.cline/skills/bmad-brainstorming/template.md`. Do not use `template.md` as an artifact path in this file.

- [x] Subtask 2.4
  Allowed files: `src/core/task/workflow-runtime/workflows/brainstorming/data.ts`
  Revision: Create `brainstorming/data.ts` using the data-asset creation rule with export `brainstormingDataAssets`. This file must export exactly one data asset keyed by `brain_methods` with `id: "brain_methods"`, `format: "csv"`, and `contents` equal to the inlined body currently sourced from `.cline/skills/bmad-brainstorming/brain-methods.csv`.

- [ ] Subtask 2.5
  Allowed files: `src/core/task/workflow-runtime/workflows/brainstorming/definition.ts`
  Revision: Create `brainstorming/definition.ts` using the definition creation rule with export `brainstormingWorkflowDefinition`. Import `brainstormingArtifacts` and `brainstormingDataAssets`, set `workflowReminderText`, include Step 1 workflow-start requirements, and leave `workflowForms` and `deterministicResolvers` unset until Phase 6.

- [ ] Subtask 2.6
  Allowed files: `src/core/task/workflow-runtime/workflows/check-implementation-readiness/artifacts.ts`
  Revision: Create `check-implementation-readiness/artifacts.ts` using the artifact creation rule with export `checkImplementationReadinessArtifacts`.

- [ ] Subtask 2.7
  Allowed files: `src/core/task/workflow-runtime/workflows/check-implementation-readiness/data.ts`
  Revision: Create `check-implementation-readiness/data.ts` using the data-asset creation rule with export `checkImplementationReadinessDataAssets`.

- [ ] Subtask 2.8
  Allowed files: `src/core/task/workflow-runtime/workflows/check-implementation-readiness/definition.ts`
  Revision: Create `check-implementation-readiness/definition.ts` using the definition creation rule with export `checkImplementationReadinessWorkflowDefinition`. Import `checkImplementationReadinessArtifacts` and `checkImplementationReadinessDataAssets`, set `workflowReminderText`, and do not add workflow-start requirements, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.9
  Allowed files: `src/core/task/workflow-runtime/workflows/cis-design-thinking/definition.ts`
  Revision: Create `cis-design-thinking/definition.ts` using the definition creation rule with export `cisDesignThinkingWorkflowDefinition`. No reminder, start-form, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.10
  Allowed files: `src/core/task/workflow-runtime/workflows/cis-innovation-strategy/definition.ts`
  Revision: Create `cis-innovation-strategy/definition.ts` using the definition creation rule with export `cisInnovationStrategyWorkflowDefinition`. No reminder, start-form, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.11
  Allowed files: `src/core/task/workflow-runtime/workflows/cis-problem-solving/definition.ts`
  Revision: Create `cis-problem-solving/definition.ts` using the definition creation rule with export `cisProblemSolvingWorkflowDefinition`. No reminder, start-form, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.12
  Allowed files: `src/core/task/workflow-runtime/workflows/cis-storytelling/definition.ts`
  Revision: Create `cis-storytelling/definition.ts` using the definition creation rule with export `cisStorytellingWorkflowDefinition`. No reminder, start-form, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.13
  Allowed files: `src/core/task/workflow-runtime/workflows/code-review/definition.ts`
  Revision: Create `code-review/definition.ts` using the definition creation rule with export `codeReviewWorkflowDefinition`. Set `workflowReminderText`, include Step 1 workflow-start requirements, set `completionToolId` from the current completion handler mapping, and leave `workflowForms` and `deterministicResolvers` unset until Phase 6.

- [ ] Subtask 2.14
  Allowed files: `src/core/task/workflow-runtime/workflows/correct-course/definition.ts`
  Revision: Create `correct-course/definition.ts` using the definition creation rule with export `correctCourseWorkflowDefinition`. Set `workflowReminderText`, include Step 1 workflow-start requirements, and do not add artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.15
  Allowed files: `src/core/task/workflow-runtime/workflows/create-architecture/artifacts.ts`
  Revision: Create `create-architecture/artifacts.ts` using the artifact creation rule with export `createArchitectureArtifacts`.

- [ ] Subtask 2.16
  Allowed files: `src/core/task/workflow-runtime/workflows/create-architecture/data.ts`
  Revision: Create `create-architecture/data.ts` using the data-asset creation rule with export `createArchitectureDataAssets`.

- [ ] Subtask 2.17
  Allowed files: `src/core/task/workflow-runtime/workflows/create-architecture/definition.ts`
  Revision: Create `create-architecture/definition.ts` using the definition creation rule with export `createArchitectureWorkflowDefinition`. Import `createArchitectureArtifacts` and `createArchitectureDataAssets`, set `workflowReminderText`, and do not add workflow-start requirements, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.18
  Allowed files: `src/core/task/workflow-runtime/workflows/create-epics/artifacts.ts`
  Revision: Create `create-epics/artifacts.ts` using the artifact creation rule with export `createEpicsArtifacts`.

- [ ] Subtask 2.19
  Allowed files: `src/core/task/workflow-runtime/workflows/create-epics/data.ts`
  Revision: Create `create-epics/data.ts` using the data-asset creation rule with export `createEpicsDataAssets`.

- [ ] Subtask 2.20
  Allowed files: `src/core/task/workflow-runtime/workflows/create-epics/definition.ts`
  Revision: Create `create-epics/definition.ts` using the definition creation rule with export `createEpicsWorkflowDefinition`. Import `createEpicsArtifacts` and `createEpicsDataAssets`, set `workflowReminderText`, include Step 1 workflow-start requirements, and do not add workflow forms or deterministic resolvers.

- [ ] Subtask 2.21
  Allowed files: `src/core/task/workflow-runtime/workflows/create-prd/artifacts.ts`
  Revision: Create `create-prd/artifacts.ts` using the artifact creation rule with export `createPrdArtifacts`.

- [ ] Subtask 2.22
  Allowed files: `src/core/task/workflow-runtime/workflows/create-prd/data.ts`
  Revision: Create `create-prd/data.ts` using the data-asset creation rule with export `createPrdDataAssets`.

- [ ] Subtask 2.23
  Allowed files: `src/core/task/workflow-runtime/workflows/create-prd/definition.ts`
  Revision: Create `create-prd/definition.ts` using the definition creation rule with export `createPrdWorkflowDefinition`. Import `createPrdArtifacts` and `createPrdDataAssets`, set `workflowReminderText`, include Step 1 workflow-start requirements, and do not add workflow forms or deterministic resolvers.

- [ ] Subtask 2.24
  Allowed files: `src/core/task/workflow-runtime/workflows/create-product-brief/artifacts.ts`
  Revision: Create `create-product-brief/artifacts.ts` using the artifact creation rule with export `createProductBriefArtifacts`.

- [ ] Subtask 2.25
  Allowed files: `src/core/task/workflow-runtime/workflows/create-product-brief/data.ts`
  Revision: Create `create-product-brief/data.ts` using the data-asset creation rule with export `createProductBriefDataAssets`.

- [ ] Subtask 2.26
  Allowed files: `src/core/task/workflow-runtime/workflows/create-product-brief/definition.ts`
  Revision: Create `create-product-brief/definition.ts` using the definition creation rule with export `createProductBriefWorkflowDefinition`. Import `createProductBriefArtifacts` and `createProductBriefDataAssets`, set `workflowReminderText`, and do not add workflow-start requirements, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.27
  Allowed files: `src/core/task/workflow-runtime/workflows/create-story/artifacts.ts`
  Revision: Create `create-story/artifacts.ts` using the artifact creation rule with export `createStoryArtifacts`.

- [ ] Subtask 2.28
  Allowed files: `src/core/task/workflow-runtime/workflows/create-story/data.ts`
  Revision: Create `create-story/data.ts` using the data-asset creation rule with export `createStoryDataAssets`.

- [ ] Subtask 2.29
  Allowed files: `src/core/task/workflow-runtime/workflows/create-story/definition.ts`
  Revision: Create `create-story/definition.ts` using the definition creation rule with export `createStoryWorkflowDefinition`. Import `createStoryArtifacts` and `createStoryDataAssets`, set `workflowReminderText`, include Step 1 workflow-start requirements, and do not add workflow forms or deterministic resolvers.

- [ ] Subtask 2.30
  Allowed files: `src/core/task/workflow-runtime/workflows/create-ux-design/artifacts.ts`
  Revision: Create `create-ux-design/artifacts.ts` using the artifact creation rule with export `createUxDesignArtifacts`.

- [ ] Subtask 2.31
  Allowed files: `src/core/task/workflow-runtime/workflows/create-ux-design/data.ts`
  Revision: Create `create-ux-design/data.ts` using the data-asset creation rule with export `createUxDesignDataAssets`.

- [ ] Subtask 2.32
  Allowed files: `src/core/task/workflow-runtime/workflows/create-ux-design/definition.ts`
  Revision: Create `create-ux-design/definition.ts` using the definition creation rule with export `createUxDesignWorkflowDefinition`. Import `createUxDesignArtifacts` and `createUxDesignDataAssets`, set `workflowReminderText`, and do not add workflow-start requirements, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.33
  Allowed files: `src/core/task/workflow-runtime/workflows/dev-story/definition.ts`
  Revision: Create `dev-story/definition.ts` using the definition creation rule with export `devStoryWorkflowDefinition`. Set `workflowReminderText`, include Step 1 workflow-start requirements, and do not add artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.34
  Allowed files: `src/core/task/workflow-runtime/workflows/distillator/definition.ts`
  Revision: Create `distillator/definition.ts` using the definition creation rule with export `distillatorWorkflowDefinition`. No reminder, start-form, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.35
  Allowed files: `src/core/task/workflow-runtime/workflows/document-project/definition.ts`
  Revision: Create `document-project/definition.ts` using the definition creation rule with export `documentProjectWorkflowDefinition`. Set `workflowReminderText` and do not add workflow-start requirements, artifacts, data assets, workflow forms, or deterministic resolvers in this pass.

- [ ] Subtask 2.36
  Allowed files: `src/core/task/workflow-runtime/workflows/domain-research/definition.ts`
  Revision: Create `domain-research/definition.ts` using the definition creation rule with export `domainResearchWorkflowDefinition`. Set `workflowReminderText` and do not add workflow-start requirements, artifacts, data assets, workflow forms, or deterministic resolvers in this pass.

- [ ] Subtask 2.37
  Allowed files: `src/core/task/workflow-runtime/workflows/edit-prd/definition.ts`
  Revision: Create `edit-prd/definition.ts` using the definition creation rule with export `editPrdWorkflowDefinition`. Set `workflowReminderText` and do not add workflow-start requirements, artifacts, data assets, workflow forms, or deterministic resolvers in this pass.

- [ ] Subtask 2.38
  Allowed files: `src/core/task/workflow-runtime/workflows/editorial-review-prose/definition.ts`
  Revision: Create `editorial-review-prose/definition.ts` using the definition creation rule with export `editorialReviewProseWorkflowDefinition`. No reminder, start-form, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.39
  Allowed files: `src/core/task/workflow-runtime/workflows/editorial-review-structure/definition.ts`
  Revision: Create `editorial-review-structure/definition.ts` using the definition creation rule with export `editorialReviewStructureWorkflowDefinition`. No reminder, start-form, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.40
  Allowed files: `src/core/task/workflow-runtime/workflows/generate-project-context/artifacts.ts`
  Revision: Create `generate-project-context/artifacts.ts` using the artifact creation rule with export `generateProjectContextArtifacts`.

- [ ] Subtask 2.41
  Allowed files: `src/core/task/workflow-runtime/workflows/generate-project-context/data.ts`
  Revision: Create `generate-project-context/data.ts` using the data-asset creation rule with export `generateProjectContextDataAssets`.

- [ ] Subtask 2.42
  Allowed files: `src/core/task/workflow-runtime/workflows/generate-project-context/definition.ts`
  Revision: Create `generate-project-context/definition.ts` using the definition creation rule with export `generateProjectContextWorkflowDefinition`. Import `generateProjectContextArtifacts` and `generateProjectContextDataAssets` and do not add reminder, workflow-start requirements, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.43
  Allowed files: `src/core/task/workflow-runtime/workflows/help/definition.ts`
  Revision: Create `help/definition.ts` using the definition creation rule with export `helpWorkflowDefinition`. No reminder, start-form, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.44
  Allowed files: `src/core/task/workflow-runtime/workflows/index-docs/definition.ts`
  Revision: Create `index-docs/definition.ts` using the definition creation rule with export `indexDocsWorkflowDefinition`. No reminder, start-form, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.45
  Allowed files: `src/core/task/workflow-runtime/workflows/market-research/artifacts.ts`
  Revision: Create `market-research/artifacts.ts` using the artifact creation rule with export `marketResearchArtifacts`.

- [ ] Subtask 2.46
  Allowed files: `src/core/task/workflow-runtime/workflows/market-research/data.ts`
  Revision: Create `market-research/data.ts` using the data-asset creation rule with export `marketResearchDataAssets`.

- [ ] Subtask 2.47
  Allowed files: `src/core/task/workflow-runtime/workflows/market-research/definition.ts`
  Revision: Create `market-research/definition.ts` using the definition creation rule with export `marketResearchWorkflowDefinition`. Import `marketResearchArtifacts` and `marketResearchDataAssets`, set `workflowReminderText`, and do not add workflow-start requirements, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.48
  Allowed files: `src/core/task/workflow-runtime/workflows/party-mode/definition.ts`
  Revision: Create `party-mode/definition.ts` using the definition creation rule with export `partyModeWorkflowDefinition`. Set `workflowReminderText` and do not add workflow-start requirements, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.49
  Allowed files: `src/core/task/workflow-runtime/workflows/pi-planning/artifacts.ts`
  Revision: Create `pi-planning/artifacts.ts` using the artifact creation rule with export `piPlanningArtifacts`.

- [ ] Subtask 2.50
  Allowed files: `src/core/task/workflow-runtime/workflows/pi-planning/data.ts`
  Revision: Create `pi-planning/data.ts` using the data-asset creation rule with export `piPlanningDataAssets`.

- [ ] Subtask 2.51
  Allowed files: `src/core/task/workflow-runtime/workflows/pi-planning/definition.ts`
  Revision: Create `pi-planning/definition.ts` using the definition creation rule with export `piPlanningWorkflowDefinition`. Import `piPlanningArtifacts` and `piPlanningDataAssets`, include Step 1 workflow-start requirements, and do not add reminder, workflow forms, or deterministic resolvers in this file until later phases require them.

- [ ] Subtask 2.52
  Allowed files: `src/core/task/workflow-runtime/workflows/qa-generate-e2e-tests/definition.ts`
  Revision: Create `qa-generate-e2e-tests/definition.ts` using the definition creation rule with export `qaGenerateE2eTestsWorkflowDefinition`. Set `workflowReminderText` and do not add workflow-start requirements, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.53
  Allowed files: `src/core/task/workflow-runtime/workflows/quick-dev/definition.ts`
  Revision: Create `quick-dev/definition.ts` using the definition creation rule with export `quickDevWorkflowDefinition`. Set `workflowReminderText`, include Step 1 workflow-start requirements, and do not add artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.54
  Allowed files: `src/core/task/workflow-runtime/workflows/quick-dev-new-preview/artifacts.ts`
  Revision: Create `quick-dev-new-preview/artifacts.ts` using the artifact creation rule with export `quickDevNewPreviewArtifacts`.

- [ ] Subtask 2.55
  Allowed files: `src/core/task/workflow-runtime/workflows/quick-dev-new-preview/data.ts`
  Revision: Create `quick-dev-new-preview/data.ts` using the data-asset creation rule with export `quickDevNewPreviewDataAssets`.

- [ ] Subtask 2.56
  Allowed files: `src/core/task/workflow-runtime/workflows/quick-dev-new-preview/definition.ts`
  Revision: Create `quick-dev-new-preview/definition.ts` using the definition creation rule with export `quickDevNewPreviewWorkflowDefinition`. Import `quickDevNewPreviewArtifacts` and `quickDevNewPreviewDataAssets` and do not add reminder, workflow-start requirements, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.57
  Allowed files: `src/core/task/workflow-runtime/workflows/quick-spec/artifacts.ts`
  Revision: Create `quick-spec/artifacts.ts` using the artifact creation rule with export `quickSpecArtifacts`.

- [ ] Subtask 2.58
  Allowed files: `src/core/task/workflow-runtime/workflows/quick-spec/data.ts`
  Revision: Create `quick-spec/data.ts` using the data-asset creation rule with export `quickSpecDataAssets`.

- [ ] Subtask 2.59
  Allowed files: `src/core/task/workflow-runtime/workflows/quick-spec/definition.ts`
  Revision: Create `quick-spec/definition.ts` using the definition creation rule with export `quickSpecWorkflowDefinition`. Import `quickSpecArtifacts` and `quickSpecDataAssets`, set `workflowReminderText`, include Step 1 workflow-start requirements, and leave `workflowForms` and `deterministicResolvers` unset until Phase 6.

- [ ] Subtask 2.60
  Allowed files: `src/core/task/workflow-runtime/workflows/retrospective/definition.ts`
  Revision: Create `retrospective/definition.ts` using the definition creation rule with export `retrospectiveWorkflowDefinition`. Set `workflowReminderText` and do not add workflow-start requirements, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.61
  Allowed files: `src/core/task/workflow-runtime/workflows/review-adversarial-general/definition.ts`
  Revision: Create `review-adversarial-general/definition.ts` using the definition creation rule with export `reviewAdversarialGeneralWorkflowDefinition`. Include Step 1 workflow-start requirements and do not add reminder, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.62
  Allowed files: `src/core/task/workflow-runtime/workflows/review-edge-case-hunter/definition.ts`
  Revision: Create `review-edge-case-hunter/definition.ts` using the definition creation rule with export `reviewEdgeCaseHunterWorkflowDefinition`. Include Step 1 workflow-start requirements and do not add reminder, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.63
  Allowed files: `src/core/task/workflow-runtime/workflows/shard-doc/definition.ts`
  Revision: Create `shard-doc/definition.ts` using the definition creation rule with export `shardDocWorkflowDefinition`. No reminder, start-form, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.64
  Allowed files: `src/core/task/workflow-runtime/workflows/sprint-planning/artifacts.ts`
  Revision: Create `sprint-planning/artifacts.ts` using the artifact creation rule with export `sprintPlanningArtifacts`.

- [ ] Subtask 2.65
  Allowed files: `src/core/task/workflow-runtime/workflows/sprint-planning/data.ts`
  Revision: Create `sprint-planning/data.ts` using the data-asset creation rule with export `sprintPlanningDataAssets`.

- [ ] Subtask 2.66
  Allowed files: `src/core/task/workflow-runtime/workflows/sprint-planning/definition.ts`
  Revision: Create `sprint-planning/definition.ts` using the definition creation rule with export `sprintPlanningWorkflowDefinition`. Import `sprintPlanningArtifacts` and `sprintPlanningDataAssets`, set `workflowReminderText`, and do not add workflow-start requirements, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.67
  Allowed files: `src/core/task/workflow-runtime/workflows/sprint-status/definition.ts`
  Revision: Create `sprint-status/definition.ts` using the definition creation rule with export `sprintStatusWorkflowDefinition`. No reminder, start-form, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.68
  Allowed files: `src/core/task/workflow-runtime/workflows/teach-me-testing/artifacts.ts`
  Revision: Create `teach-me-testing/artifacts.ts` using the artifact creation rule with export `teachMeTestingArtifacts`.

- [ ] Subtask 2.69
  Allowed files: `src/core/task/workflow-runtime/workflows/teach-me-testing/data.ts`
  Revision: Create `teach-me-testing/data.ts` using the data-asset creation rule with export `teachMeTestingDataAssets`.

- [ ] Subtask 2.70
  Allowed files: `src/core/task/workflow-runtime/workflows/teach-me-testing/definition.ts`
  Revision: Create `teach-me-testing/definition.ts` using the definition creation rule with export `teachMeTestingWorkflowDefinition`. Import `teachMeTestingArtifacts` and `teachMeTestingDataAssets` and do not add reminder, workflow-start requirements, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.71
  Allowed files: `src/core/task/workflow-runtime/workflows/technical-research/artifacts.ts`
  Revision: Create `technical-research/artifacts.ts` using the artifact creation rule with export `technicalResearchArtifacts`.

- [ ] Subtask 2.72
  Allowed files: `src/core/task/workflow-runtime/workflows/technical-research/data.ts`
  Revision: Create `technical-research/data.ts` using the data-asset creation rule with export `technicalResearchDataAssets`.

- [ ] Subtask 2.73
  Allowed files: `src/core/task/workflow-runtime/workflows/technical-research/definition.ts`
  Revision: Create `technical-research/definition.ts` using the definition creation rule with export `technicalResearchWorkflowDefinition`. Import `technicalResearchArtifacts` and `technicalResearchDataAssets`, set `workflowReminderText`, and do not add workflow-start requirements, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.74
  Allowed files: `src/core/task/workflow-runtime/workflows/validate-prd/definition.ts`
  Revision: Create `validate-prd/definition.ts` using the definition creation rule with export `validatePrdWorkflowDefinition`. Set `workflowReminderText` and do not add workflow-start requirements, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.75
  Allowed files: `src/core/task/workflow-runtime/workflows/write-remediation-story/definition.ts`
  Revision: Create `write-remediation-story/definition.ts` using the definition creation rule with export `writeRemediationStoryWorkflowDefinition`. Include Step 1 workflow-start requirements and leave `workflowForms` and `deterministicResolvers` unset until Phase 6.

- [ ] Subtask 2.76
  Allowed files: `src/core/task/workflow-runtime/workflows/index.ts`
  Revision: Create `src/core/task/workflow-runtime/workflows/index.ts` and export one named import for every `definition.ts` file created in Subtasks 2.1-2.75, using the exact export names prescribed above.

- [ ] Subtask 2.77a
  Allowed files: `src/core/task/workflow-runtime/WorkflowRegistry.ts`
  Revision: Create `WorkflowRegistry.ts`. Import every named workflow-definition export from [workflows/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/workflows/index.ts), plus `type WorkflowDefinition` and `type WorkflowName` from [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/types.ts#L1-L95) and `type SkillMetadata` from [skills.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/skills.ts#L1-L14). In that one file, export exactly these approved functions and no additional exported types or constants:
  - `resolveWorkflowDefinition(workflowName: WorkflowName): WorkflowDefinition | undefined`
  - `resolveWorkflowBySlashCommand(commandName: string): WorkflowDefinition | undefined`
  - `resolveWorkflowByUseSkillName(skillName: string): WorkflowDefinition | undefined`
  - `getShippedWorkflowSlashCommands(): Array<{ name: WorkflowName; description: string }>`
  - `getWorkflowSkillMetadata(): SkillMetadata[]`
  Each function must read only from the shipped workflow-definition set imported from `workflows/index.ts`; no legacy resolution helper, toggle state, workspace scan, remote workflow source, or managed-workflow registry may be referenced in this file. `getShippedWorkflowSlashCommands()` must return one entry per shipped workflow with `name: definition.slashCommandName` and `description: \`Shipped workflow: ${definition.name}\``. `getWorkflowSkillMetadata()` must return one entry per shipped workflow with `name: definition.useSkillName`, `description: \`Shipped workflow: ${definition.name}\``, `path: \`shipped-workflow://${definition.name}\``, and `source: "global"`.

- [ ] Subtask 2.77b
  Allowed files: `src/core/task/index.ts`
  Revision: In the import block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1-L120), replace the legacy workflow-resolution import with `resolveWorkflowDefinition` from `@/core/task/workflow-runtime/WorkflowRegistry`.

- [ ] Subtask 2.77c
  Allowed files: `src/core/task/index.ts`
  Revision: In the runtime-instantiation block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L867-L876), replace `this.workflowRuntime = new WorkflowRuntime(undefined, cwd)` with `this.workflowRuntime = new WorkflowRuntime(resolveWorkflowDefinition, cwd)`.

- [ ] Subtask 2.78
  Allowed files: `src/core/task/workflow-runtime/workflowRuntimeConfig.ts`
  Revision: In [workflowRuntimeConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/workflowRuntimeConfig.ts#L1-L160), update only the leading comment block so it states that this file owns both shared workflow-runtime bundle constants and runtime-owned shared workflow value defaults. Do not change any helper or constant body in this subtask.

### Phase 3: Replace discovery and activation entrypoints with the shipped runtime registry

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

- [ ] Subtask 3.1b
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2432-L2515), replace the entire body of `applyPersistentSlashCommandAction(...)` with a temporary compile-bridge body that does only `if (!action) { return }`. Do not add any activation or persistence logic in this bridge step; Subtask 4.2 replaces the full body with runtime-owned semantics.

- [ ] Subtask 3.2a
  Allowed files: `src/core/slash-commands/index.ts`
  Revision: In the workflow-resolution block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/index.ts#L149-L276), delete the remote-toggle lookup, `resolveWorkflowByName(...)` call, managed-workflow branch, and placeholder-workflow branch. Replace them with one `const definition = resolveWorkflowBySlashCommand(commandName)` lookup that, when defined, returns `persistentSlashCommandAction: { type: "activate_workflow", workflowName: definition.name, invocationSource: "slash_command" }` and otherwise falls through to the built-in command and MCP logic unchanged.

- [ ] Subtask 3.2b
  Allowed files: `src/core/slash-commands/__tests__/index.test.ts`
  Revision: In the import block at [index.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/__tests__/index.test.ts#L1-L9), remove the file-system, temp-directory, `StateManager`, and `getCanonicalWorkflowConfigPath` imports that are used only by the deleted local/global/remote workflow-discovery tests.

- [ ] Subtask 3.2c
  Allowed files: `src/core/slash-commands/__tests__/index.test.ts`
  Revision: In the workflow-persona regression block at [index.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/__tests__/index.test.ts#L146-L178), replace the test `still resolves managed workflow aliases to managed workflow activation` with a shipped-workflow test that calls `parseSlashCommands("<task>/code-review.md help me untangle this issue</task>", {}, {}, "test-ulid")` and asserts `persistentSlashCommandAction` equals `{ type: "activate_workflow", workflowName: "code-review.md", invocationSource: "slash_command" }`.

- [ ] Subtask 3.2d
  Allowed files: `src/core/slash-commands/__tests__/index.test.ts`
  Revision: Delete the entire `describe("parseSlashCommands workflow resolution", ...)` block at [index.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/__tests__/index.test.ts#L224-L336). Those tests cover local, global, and remote workflow discovery paths that the approved shipped-only architecture removes.

- [ ] Subtask 3.3a
  Allowed files: `src/core/controller/slash/getAvailableSlashCommands.ts`
  Revision: In the import block at [getAvailableSlashCommands.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/slash/getAvailableSlashCommands.ts#L1-L5), replace `resolveAvailableWorkflows` with `getShippedWorkflowSlashCommands` from `@/core/task/workflow-runtime/WorkflowRegistry`.

- [ ] Subtask 3.3b
  Allowed files: `src/core/controller/slash/getAvailableSlashCommands.ts`
  Revision: In the workflow-listing block at [getAvailableSlashCommands.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/slash/getAvailableSlashCommands.ts#L22-L50), delete the workspace-manager, toggle-state, remote-config, and `resolveAvailableWorkflows(...)` code. Replace the `for (const workflow of workflows)` loop with `for (const workflow of getShippedWorkflowSlashCommands())`, preserving the built-in slash-command assembly and the `SlashCommandInfo.create({ name, description, section: "custom", cliCompatible: true })` call shape.

- [ ] Subtask 3.4a
  Allowed files: `src/core/task/index.ts`
  Revision: In the import block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1-L120), replace the legacy workflow-resolution import with `getWorkflowSkillMetadata` from `@/core/task/workflow-runtime/WorkflowRegistry`.

- [ ] Subtask 3.4b
  Allowed files: `src/core/task/index.ts`
  Revision: In the prompt-skill assembly block at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3867-L3889), delete the `resolveAvailableWorkflows(...)` call and the `workflowEntries` local. Replace `createWorkflowSkillMetadata(workflowEntries)` with `getWorkflowSkillMetadata()`, leaving skill discovery, toggle filtering, `mergePromptSkillEntries(...)`, and `buildPromptSkillScope(...)` otherwise unchanged.

- [ ] Subtask 3.5a
  Allowed files: `src/core/task/tools/handlers/UseSkillToolHandler.ts`
  Revision: In the import block at [UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts#L1-L14), remove `activateManagedWorkflowInTaskState`, `activatePlaceholderWorkflowInTaskState`, `buildPlaceholderWorkflowChecklist`, and `resolveWorkflowByName`. Add `resolveWorkflowByUseSkillName` from `@/core/task/workflow-runtime/WorkflowRegistry`.

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

- [ ] Subtask 3.5c
  Allowed files: `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
  Revision: In `createConfig(...)` at [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L63-L123), add a `workflowRuntime` stub object that exposes `activateWorkflow: sinon.stub().callsFake(async ({ taskState, workflowName }) => { taskState.activeWorkflowName = workflowName; taskState.activeWorkflowSession = { workflowName, activeStepId: "step-1", completedStepIds: [], workflowValues: {}, artifactWriteProofPaths: [], suppressedWorkflowFormIds: [], suppressedStepResolutionIds: [] } })` and `persistWorkflowSession: sinon.stub().callsFake(async ({ taskState, metadata }) => { metadata.activeWorkflowName = taskState.activeWorkflowName; metadata.activeWorkflowSession = taskState.activeWorkflowSession; metadata.activeWorkflowStartCardSession = taskState.activeWorkflowStartCardSession; metadata.activeWorkflowFormSession = taskState.activeWorkflowFormSession; metadata.activeWorkflowStepResolutionSession = taskState.activeWorkflowStepResolutionSession })`.

- [ ] Subtask 3.5d
  Allowed files: `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
  Revision: Replace the contiguous `use_skill` workflow-activation test cluster at [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L1470-L2060) with exactly these runtime-owned cases and no local/global/remote/placeholder cases:
  - main-thread shipped workflow activation persists `activeWorkflowName` and `activeWorkflowSession`, calls `workflowRuntime.activateWorkflow`, calls `workflowRuntime.persistWorkflowSession`, saves metadata once, and calls `updateFCListFromToolResponse(undefined)`
  - subagent-local shipped workflow activation updates only child task state and does not read or save parent metadata
  - re-invoking `use_skill` for the already-active shipped workflow leaves the existing session intact, does not call `workflowRuntime.activateWorkflow`, and returns the `"active again"` message variant
  - activating a plain non-workflow skill leaves `activeWorkflowName` and `activeWorkflowSession` unchanged
  In the replacement assertions, do not mention `managedWorkflowRun`, `activeWorkflowId`, `activePlaceholderWorkflowId`, `activePlaceholderWorkflowSource`, or placeholder checklist text.

- [ ] Subtask 3.6
  Allowed files: `src/core/task/tools/handlers/UseSkillToolHandler.ts`
  Revision: In [UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts#L190-L223), delete the non-workflow branch statements that write `activeWorkflowId`, `activePlaceholderWorkflowId`, `activePlaceholderWorkflowSource`, `activePlaceholderWorkflowStableValues`, `activePlaceholderWorkflowValues`, `activePlaceholderWorkflowDeterministicState`, `lastPromptedPlaceholderWorkflowChecklistLabel`, `pendingAutoCompletedPlaceholderWorkflowStepNotices`, and `activeWorkflowJustStarted`. After this edit, activating a non-workflow skill must not mutate any workflow-state field.

- [ ] Subtask 3.7
  Allowed files: `src/core/task/__tests__/prompt-context.test.ts`
  Revision: Update [prompt-context.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/prompt-context.test.ts#L1-L86) so `shouldIncludePersistentPromptContext(...)` asserts only against `activeWorkflowName`.

### Phase 4: Move activation, persistence, projection, completion, and teardown into WorkflowRuntime

- [ ] Subtask 4.1
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L213-L217), replace `shouldIncludePersistentPromptContext(...)` so it accepts `Pick<TaskState, "activeWorkflowName">` and returns `!!taskState.activeWorkflowName`.

- [ ] Subtask 4.2
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2432-L2514), replace the temporary compile-bridge body from Subtask 3.1b with runtime-owned activation logic keyed to the `activate_workflow` action shape introduced in Subtask 3.1a. Persist only `activeWorkflowName`, `activeWorkflowSession`, `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, and `activeWorkflowStepResolutionSession`.

- [ ] Subtask 4.3
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2639-L2696), replace the legacy workflow restore block with runtime-owned restore logic that restores only the runtime workflow fields and then calls `await this.workflowRuntime.restoreWorkflowSession({ taskState: this.taskState, metadata })`.

- [ ] Subtask 4.4
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: In [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L17-L45), replace the activation/restore/persist block so the runtime owns workflow session creation, metadata restore, metadata persist, and canonical clear semantics. The replacement block must:
  - seed each new session from `buildWorkflowSharedValueDefaults(this.cwd)`
  - when `activateWorkflow(...)` receives `parentWorkflowValues`, copy only the keys listed in `definition.inheritedWorkflowValueKeys ?? []` into the new child session's `workflowValues`
  - treat that parent-to-child copy as one-time initialization only
  - keep persistence and restore scoped to `activeWorkflowName`, `activeWorkflowSession`, `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, and `activeWorkflowStepResolutionSession`
  - make canonical clear semantics remove `activeWorkflowName`, `activeWorkflowSession`, `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, and `activeWorkflowStepResolutionSession` together so workflow-owned values are cleared by clearing the workflow session

- [ ] Subtask 4.5
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: In [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L47-L83), replace the projection block so `buildTurnProjection(...)` and `buildCurrentStepPrompt(...)` use module-owned prompt sections and tool bundles from the active workflow definition and active step id.

- [ ] Subtask 4.6
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: In [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L85-L157), replace the stubbed runtime methods and helper block so the class owns step advancement, completion detection from `completedStepIds`, teardown, artifact/data lookup, active-step lookup from the canonical workflow session, and the canonical workflow-value mutation seam. In that same block, implement `applyWorkflowValueWrites(...)` so backend-owned logic and AI-callable workflow-value persistence both write through one runtime-owned method that:
  - writes only into `taskState.activeWorkflowSession.workflowValues`
  - returns exact `changedKeys` and `unchangedKeys` arrays
  - normalizes artifact-path workflow values using the existing artifact-path normalization rules that currently live in `SetWorkflowPlaceholdersToolHandler.ts`
  - leaves persistence ownership with callers, but never writes to any placeholder-era or managed-workflow state field

- [ ] Subtask 4.7
  Allowed files: `src/core/task/workflowCompletionRunner.ts`
  Revision: Delete [workflowCompletionRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionRunner.ts) after Subtasks 4.4-4.6 land and no caller imports it.

- [ ] Subtask 4.8
  Allowed files: `src/core/task/workflowCompletionHandler.ts`
  Revision: Delete [workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts) after Subtasks 4.4-4.6 land and no caller imports it.

- [ ] Subtask 4.9
  Allowed files: `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
  Revision: Update [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1-L220) so it asserts only the runtime-owned persisted workflow fields.

- [ ] Subtask 4.10
  Allowed files: `src/core/task/__tests__/workflowCompletionRunner.test.ts`
  Revision: Replace the runner-focused assertions in [workflowCompletionRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionRunner.test.ts#L1-L200) with direct `WorkflowRuntime.evaluateCompletionAndMaybeTeardown(...)` coverage keyed to runtime session state. The replacement assertions must verify that teardown clears `activeWorkflowName`, `activeWorkflowSession`, `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, and `activeWorkflowStepResolutionSession` together so workflow values disappear by session clear rather than by a separate mirrored clear path.

### Phase 5: Make runtime-owned prompt projection and tool bundles the only workflow prompt/tool seam

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

- [ ] Subtask 5.2
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2593-L2607), delete `buildWorkflowPromptInstructions(...)`. After this edit, all workflow prompt/persona/reminder projection must come from `WorkflowRuntime.buildTurnProjection(...)`.

- [ ] Subtask 5.3
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3891-L3958), replace the workflow prompt-context assembly with `const workflowProjection = await this.workflowRuntime.buildTurnProjection(this.taskState)` and project only runtime-owned workflow prompt/tool fields into `SystemPromptContext`.

- [ ] Subtask 5.4
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2517-L2544), replace `buildPlaceholderWorkflowActivationInstructions(...)` with a runtime-owned activation helper that reads `activeWorkflowName`, `activeWorkflowSession.workflowValues`, and `activeStepId` instead of `activePlaceholderWorkflowSource` and placeholder values. Preserve the current `dev-story.md` special-case behavior.

- [ ] Subtask 5.5
  Allowed files: `src/core/prompts/system-prompt/components/agent_role.ts`
  Revision: In [agent_role.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_role.ts#L11-L18), replace `context.activeWorkflowPersonaInstructions` with `context.activeWorkflowPersonaInstruction`.

- [ ] Subtask 5.6
  Allowed files: `src/core/prompts/system-prompt/components/user_instructions.ts`
  Revision: In [user_instructions.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/user_instructions.ts#L10-L77), replace `activeWorkflowReminder` usage with `context.activeWorkflowPromptSections?.join("\n\n")`.

- [ ] Subtask 5.7
  Allowed files: `src/core/prompts/system-prompt/components/task_progress.ts`
  Revision: Replace the entire implementation of [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts#L1-L96) with runtime-owned guidance that never mentions `task_progress`, instructs the model to use `workflow_progress_request` only when `context.activeWorkflowProgressRequestEnabled === true`, and states that runtime-owned state controls progression.

- [ ] Subtask 5.8
  Allowed files: `src/core/prompts/system-prompt/components/continuation_turn.ts`
  Revision: In [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L13-L75), replace placeholder-workflow reminder logic with runtime-owned behavior keyed only to `context.activeWorkflowProgressRequestEnabled` and `context.currentFocusChainChecklist`.

- [ ] Subtask 5.9
  Allowed files: `src/core/prompts/system-prompt/components/response_tools.ts`
  Revision: In [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts#L17-L104), replace `shouldExposeWorkflowProgressRequest(...)` checks with direct checks on `context.activeWorkflowProgressRequestEnabled === true`.

- [ ] Subtask 5.10
  Allowed files: `src/core/prompts/system-prompt/tools/workflow_progress_request.ts`
  Revision: In [workflow_progress_request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/workflow_progress_request.ts#L8-L23), rewrite the description so it refers to the active workflow runtime step rather than a placeholder workflow step and is exposed only when `context.activeWorkflowProgressRequestEnabled === true`.

- [ ] Subtask 5.10a
  Allowed files: `src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts`
  Revision: In [set_workflow_placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts#L1-L29), keep the tool id and tool name exactly `set_workflow_placeholders`, but rewrite the tool as the runtime-owned AI-callable workflow-value persistence seam. Make these exact changes in one edit:
  - replace placeholder wording in the description with runtime-owned workflow-value wording
  - remove the sentence that says stable config-backed placeholders come from `.cline/workflow-config.yaml`
  - preserve the wrapper shape `{"values": {...}}`
  - preserve `parameters[0].name === "values"` and the object-map schema
  - replace `contextRequirements` with `context.activeWorkflowName !== undefined`

- [ ] Subtask 5.10b
  Allowed files: `src/core/prompts/system-prompt/spec.ts`
  Revision: In the compact native-tool description block and the compact parameter-description block at [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L468-L560), replace the `set_workflow_placeholders` placeholder-era copy with runtime-owned workflow-value wording. Preserve the wrapper-shape guidance `{"values": {...}}`, but remove the `.cline/workflow-config.yaml` reference and every remaining mention of placeholder ownership in those two `set_workflow_placeholders` branches.

- [ ] Subtask 5.11
  Allowed files: `src/core/task/workflow-runtime/workflowRuntimeConfig.ts`
  Revision: In [workflowRuntimeConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/workflowRuntimeConfig.ts#L1-L119), add one exported helper named `expandWorkflowToolBundles(allowedBundles: readonly string[], mcpTools: ClineToolSpec[]): ClineToolSpec[]` that expands runtime bundle names into exact native-tool specs and MCP tool specs using the existing bundle maps.

- [ ] Subtask 5.12
  Allowed files: `src/core/prompts/system-prompt/registry/ClineToolSet.ts`
  Revision: In [ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts#L171-L199), replace `filterContextualNativeToolSpecs(...)` with `expandWorkflowToolBundles(...)`, preserving current-mode response tools and always-preserved tools.

- [ ] Subtask 5.12a
  Allowed files: `src/core/prompts/system-prompt/types.ts`
  Revision: After Subtasks 5.2-5.12 land and no production caller reads the legacy placeholder/managed workflow prompt-context fields, delete `activeWorkflowPersonaInstructions`, `activeWorkflowReminder`, `activeWorkflowSupportsPlaceholders`, `activePlaceholderWorkflowName`, `activePlaceholderWorkflowStepNumber`, `activeDeterministicPlaceholderWorkflowEnabled`, and `managedWorkflowActive` from [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts#L95-L143).

- [ ] Subtask 5.13
  Allowed files: `src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts`
  Revision: Delete [workflowPersonaRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts) after Subtasks 2.1-2.78 and 5.1-5.12a land and no caller imports it.

- [ ] Subtask 5.14
  Allowed files: `src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts`
  Revision: Delete [contextualNativeToolFilter.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts) after Subtasks 2.1-2.78 and 5.1-5.12a land and no caller imports it.

- [ ] Subtask 5.15
  Allowed files: `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
  Revision: Delete [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts) after every workflow definition has copied its tool bundle ownership and no caller imports it.

- [ ] Subtask 5.16
  Allowed files: `src/shared/workflow-progress-request.ts`
  Revision: Delete [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts) after runtime-owned `progress.mechanism` fully replaces it and no caller imports it.

- [ ] Subtask 5.17
  Allowed files: `src/core/task/bmad-agent-mode.ts`
  Revision: Delete [bmad-agent-mode.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/bmad-agent-mode.ts) after all workflow reminder/persona projection comes from workflow modules and no caller imports it.

### Phase 6: Move workflow-start forms, step forms, deterministic resolution, and tool-result orchestration under WorkflowRuntime

- [ ] Subtask 6.1a
  Allowed files: `src/core/task/workflow-form/WorkflowFormRuntime.ts`
  Revision: In the import/constructor block at [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L19-L29) and [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L613-L615), delete the `workflowFormRegistry` import and remove the default constructor value `= workflowFormRegistry`. After this edit, `WorkflowFormRuntime` must require an explicit `Record<string, WorkflowFormResolverDefinition>` from the caller and must not own a fallback registry.

- [ ] Subtask 6.1b
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the helper block at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1-L140), add one helper named `createRuntimeFromRegistry(...resolverIds: string[])` that returns `new WorkflowFormRuntime(Object.fromEntries(resolverIds.map((id) => [id, getWorkflowFormResolverDefinition(id)])))`. Do not change any existing test body in this subtask.

- [ ] Subtask 6.1c
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the Brainstorming Step 4 test block at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L493-L535), replace `const runtime = new WorkflowFormRuntime()` with `const runtime = createRuntimeFromRegistry(BRAINSTORMING_STEP_4_CHOOSE_APPROACH_RESOLVER_ID)`.

- [ ] Subtask 6.1d
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the workflow-start validation pair at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1035-L1098), replace both `const runtime = new WorkflowFormRuntime()` call sites with `const runtime = createRuntimeFromRegistry(PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID)`.

- [ ] Subtask 6.1e
  Allowed files: `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  Revision: In the registry-backed conditional field test at [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1320-L1365), replace `const runtime = new WorkflowFormRuntime()` with `const runtime = createRuntimeFromRegistry(CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID)`.

- [ ] Subtask 6.2
  Allowed files: `src/core/task/workflow-runtime/workflows/code-review/definition.ts`
  Revision: Update `code-review/definition.ts` so `codeReviewWorkflowDefinition` now defines its `workflowForms` and `deterministicResolvers` from the current `WorkflowFormRegistry.ts`, `WorkflowFormTriggerRegistry.ts`, `WorkflowStepResolutionRegistry.ts`, and `WorkflowStepResolutionTriggerRegistry.ts` ownership for `code-review.md`.

- [ ] Subtask 6.3
  Allowed files: `src/core/task/workflow-runtime/workflows/brainstorming/definition.ts`
  Revision: Update `brainstorming/definition.ts` so `brainstormingWorkflowDefinition` now defines its `workflowForms` and `deterministicResolvers` from the current registry ownership for `brainstorming.md`.

- [ ] Subtask 6.4
  Allowed files: `src/core/task/workflow-runtime/workflows/quick-spec/definition.ts`
  Revision: Update `quick-spec/definition.ts` so `quickSpecWorkflowDefinition` now defines its `deterministicResolvers` from the current registry ownership for `quick-spec.md`. Do not add a workflow form map in this file.

- [ ] Subtask 6.5
  Allowed files: `src/core/task/workflow-runtime/workflows/write-remediation-story/definition.ts`
  Revision: Update `write-remediation-story/definition.ts` so `writeRemediationStoryWorkflowDefinition` now defines its `deterministicResolvers` from the current registry ownership for `write-remediation-story.md`. Do not add a workflow form map in this file.

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

- [ ] Subtask 6.5a2
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: In the constructor signature at [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L12-L14), extend `WorkflowRuntime` so it stores the injected adapter by changing the constructor to `constructor(private readonly resolveDefinition: WorkflowDefinitionResolver = () => undefined, private readonly cwd: string = process.cwd(), private readonly taskAdapter?: WorkflowRuntimeTaskAdapter) {}`. Do not implement any adapter calls in this subtask.

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

- [ ] Subtask 6.6
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: Add the runtime-owned `maybeResolveStartCardBeforeTurn(...)` implementation in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L85-L90), sourcing the workflow-start configuration from the active workflow definition and using the injected adapter from Subtasks 6.5a1-6.5a3 for start-card render/persist/wait behavior.

- [ ] Subtask 6.7
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: Add the runtime-owned `maybeResolveWorkflowFormBeforeTurn(...)` implementation in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L85-L90), sourcing definitions from `WorkflowDefinition.workflowForms` and using the injected adapter from Subtasks 6.5a1-6.5a3 for render/persist/outcome-loop behavior.

- [ ] Subtask 6.8
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: Add the runtime-owned `maybeResolveDeterministicStepBeforeTurn(...)` implementation in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L85-L90), sourcing definitions from `WorkflowDefinition.deterministicResolvers` and using the injected adapter from Subtasks 6.5a1-6.5a3 for status rendering, persistence, and deterministic tool execution.

- [ ] Subtask 6.9
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: Add the exact `executeWorkflowFormOperationAndSync(...)` method required by Subtask 1.4, using `activeWorkflowFormSession.workflowFormId`, workflow-module-owned form definitions, and the injected adapter from Subtasks 6.5a1-6.5a3 rather than the old registry layer.

- [ ] Subtask 6.10
  Allowed files: `src/core/task/workflow-runtime/WorkflowRuntime.ts`
  Revision: Add the exact `executeWorkflowStepResolutionToolAndSync(...)` method required by Subtask 1.4, using `activeWorkflowStepResolutionSession.definitionId`, workflow-module-owned deterministic resolver definitions, and the injected adapter from Subtasks 6.5a1-6.5a3 rather than the old registry layer.

- [ ] Subtask 6.11
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1853-L1898), replace `executeWorkflowFormOperationAndSync(...)` with a one-line delegation into `this.workflowRuntime.executeWorkflowFormOperationAndSync(...)`.

- [ ] Subtask 6.12
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1900-L1930), replace `executeWorkflowStepResolutionToolAndSync(...)` with a one-line delegation into `this.workflowRuntime.executeWorkflowStepResolutionToolAndSync(...)`.

- [ ] Subtask 6.13
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1932-L1970), replace `maybeResolveWorkflowStartCardBeforeApiTurn(...)` with delegation into `this.workflowRuntime.maybeResolveStartCardBeforeTurn(...)`.

- [ ] Subtask 6.14
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1972-L2157), replace `maybeResolveWorkflowFormBeforeApiTurn(...)` with delegation into `this.workflowRuntime.maybeResolveWorkflowFormBeforeTurn(...)`.

- [ ] Subtask 6.15
  Allowed files: `src/core/task/index.ts`
  Revision: In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2159-L2271), replace `maybeResolveWorkflowStepResolutionBeforeApiTurn(...)` with delegation into `this.workflowRuntime.maybeResolveDeterministicStepBeforeTurn(...)`.

- [ ] Subtask 6.16
  Allowed files: `src/core/task/workflow-form/WorkflowFormRegistry.ts`
  Revision: Delete [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts) after Subtasks 6.1a-6.15 land and no caller imports it.

- [ ] Subtask 6.17
  Allowed files: `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`
  Revision: Delete [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts) after Subtasks 6.1a-6.15 land and no caller imports it.

- [ ] Subtask 6.18
  Allowed files: `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts`
  Revision: Delete [WorkflowStepResolutionRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts) after Subtasks 6.1a-6.15 land and no caller imports it.

- [ ] Subtask 6.19
  Allowed files: `src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts`
  Revision: Delete [WorkflowStepResolutionTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts) after Subtasks 6.1a-6.15 land and no caller imports it.

### Phase 7: Retire placeholder-driven workflow mutation and make deterministic handlers consume runtime-owned step and value state

- [ ] Subtask 7.1a
  Allowed files: `src/core/task/tools/types/TaskConfig.ts`
  Revision: In the `TaskCallbacks` interface at [TaskConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/types/TaskConfig.ts#L120-L140), add the exact callback `handleWorkflowProgressApproval: (approved: boolean) => Promise<{ advanced: boolean; feedback?: string }>` immediately after `updateFCListFromToolResponse(...)`.

- [ ] Subtask 7.1b
  Allowed files: `src/core/task/tools/utils/ToolConstants.ts`
  Revision: In `TASK_CALLBACKS_KEYS` at [ToolConstants.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/utils/ToolConstants.ts#L48-L70), insert `"handleWorkflowProgressApproval"` immediately after `"updateFCListFromToolResponse"`.

- [ ] Subtask 7.1c
  Allowed files: `src/core/task/ToolExecutor.ts`
  Revision: In `asToolConfig()` at [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L175-L217), add `handleWorkflowProgressApproval: async (approved) => this.workflowRuntime.handleWorkflowProgressApproval({ taskState: this.taskState, approved })` immediately after `updateFCListFromToolResponse: this.updateFCListFromToolResponse`.

- [ ] Subtask 7.2a
  Allowed files: `src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`
  Revision: In the import block at [WorkflowProgressRequestToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts#L1-L16), delete the `FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL` import. Keep `isWorkflowProgressRequestWorkflowName(...)` imported from `@/shared/workflow-progress-request`.

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

- [ ] Subtask 7.2c
  Allowed files: `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
  Revision: In the import/setup block at [WorkflowProgressRequestToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts#L1-L95), delete the `FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL` import, remove the `updateFCListFromToolResponse` callback stub, and add `handleWorkflowProgressApproval: sinon.stub().resolves({ advanced: true })`.

- [ ] Subtask 7.2d
  Allowed files: `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
  Revision: Replace the contiguous test body block at [WorkflowProgressRequestToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts#L102-L277) so it seeds `taskState.activeWorkflowName` plus `taskState.activeWorkflowSession = { workflowName, activeStepId, completedStepIds: [], workflowValues: {}, artifactWriteProofPaths: [], suppressedWorkflowFormIds: [], suppressedStepResolutionIds: [] }`, asserts `handleWorkflowProgressApproval(true)` for `"Yes"` and `handleWorkflowProgressApproval(false)` for `"No"`, and removes every assertion that mentions placeholder workflow sources, checklists, or `FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL`.

- [ ] Subtask 7.3a
  Allowed files: `src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts`
  Revision: In [placeholderWorkflowWriteProofs.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts#L7-L48), keep the existing export names but replace their state ownership so they read and write `taskState.activeWorkflowSession?.artifactWriteProofPaths` instead of `activePlaceholderWorkflowTaskWriteProofPaths`. In `recordAndPersistPlaceholderWorkflowWriteProof(...)`, persist the updated write-proof list by saving `metadata.activeWorkflowSession = args.taskState.activeWorkflowSession`.

- [ ] Subtask 7.3b
  Allowed files: `src/core/workflows/brainstormingSessionFiles.ts`
  Revision: In the import-and-resolution block at [brainstormingSessionFiles.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/brainstormingSessionFiles.ts#L1-L64), remove placeholder-rendering and workflow-placeholder imports. Add `brainstormingArtifacts` from `@/core/task/workflow-runtime/workflows/brainstorming/artifacts`. Replace `resolveBrainstormingOutputFolderPath(...)` and `resolveBrainstormingOutputFilePath(...)` so they read `output_folder` and `output_file` from `config.taskState.activeWorkflowSession?.workflowValues`, resolve relative paths from `config.cwd`, and never read placeholder state.

- [ ] Subtask 7.3c
  Allowed files: `src/core/workflows/brainstormingSessionFiles.ts`
  Revision: In [brainstormingSessionFiles.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/brainstormingSessionFiles.ts#L132-L154), delete `resolveCanonicalBrainstormingSkillPath(...)` entirely and replace `readCanonicalBrainstormingTemplate(cwd)` with a runtime-coded template reader that returns `brainstormingArtifacts.output_file.initialContent`. Keep the exported function name `readCanonicalBrainstormingTemplate`.

- [ ] Subtask 7.3d
  Allowed files: `src/core/workflows/brainstormingTechniqueLibrary.ts`
  Revision: In the loader block at [brainstormingTechniqueLibrary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/brainstormingTechniqueLibrary.ts#L1-L71), remove the filesystem import and the `resolveCanonicalBrainstormingSkillPath(...)` dependency. Add `brainstormingDataAssets` from `@/core/task/workflow-runtime/workflows/brainstorming/data`, and replace `loadBrainstormingTechniqueEntries(...)` so it parses `brainstormingDataAssets.brain_methods.contents`.

- [ ] Subtask 7.4a
  Allowed files: `src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts`
  Revision: In the import/helper block at [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L3-L20) and [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L103-L163), delete the managed-workflow, placeholder-rendering, and workflow-placeholder imports plus the placeholder-mutation helpers `applyGenericWorkflowPlaceholders(...)` and `persistOutputFilePlaceholder(...)`. Replace that helper block with one runtime-owned persistence helper that calls `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { output_file: artifactPath } })`, then on main-thread execution persists only `activeWorkflowName`, `activeWorkflowSession`, `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, and `activeWorkflowStepResolutionSession`, and finally calls `updateFCListFromToolResponse(undefined)`.

- [ ] Subtask 7.4b
  Allowed files: `src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts`
  Revision: In the value-resolution block at [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L176-L247), replace placeholder-derived reads with runtime-session reads from `config.taskState.activeWorkflowSession?.workflowValues` for `mode`, `architecture_document`, `prd`, `ui_spec`, `ux_spec`, and `output_folder`. In that same block, import and use `createEpicsArtifacts.output_file` from `@/core/task/workflow-runtime/workflows/create-epics/artifacts`, derive `artifactPath` from `output_folder` plus `relativePathPattern`, and replace the file read of the old markdown template with `createEpicsArtifacts.output_file.initialContent`.

- [ ] Subtask 7.5a
  Allowed files: `src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts`
  Revision: In the import/helper block at [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts#L3-L18) and [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts#L61-L76), remove placeholder-rendering, placeholder-step-details, workflow-placeholder, and `SetWorkflowPlaceholdersToolHandler` imports. Replace `resolveActivePiPlanningStepThree(...)` with a pure runtime-session gate that returns truthy only when `config.taskState.activeWorkflowName === "pi-planning.md"` and `config.taskState.activeWorkflowSession?.activeStepId === "step-3"`.

- [ ] Subtask 7.5b
  Allowed files: `src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts`
  Revision: In the main execution block at [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts#L119-L276), replace placeholder-derived reads with `activeWorkflowSession.workflowValues.epics_document`, `target_epic`, and `output_folder`, import `piPlanningArtifacts.epic_delivery_spec` from `@/core/task/workflow-runtime/workflows/pi-planning/artifacts`, build `templateMarkdown` from `piPlanningArtifacts.epic_delivery_spec.initialContent`, derive `artifactPath` from `output_folder` plus `piPlanningArtifacts.epic_delivery_spec.relativePathPattern` with `{target_epic_number}` substituted from the selected epic, and replace the tail `persistWorkflowPlaceholderValues(config, { epic_delivery_spec: artifactPath })` call with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { epic_delivery_spec: artifactPath } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.

- [ ] Subtask 7.6a
  Allowed files: `src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts`
  Revision: In the import/helper block at [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts#L3-L18) and [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts#L61-L76), remove placeholder-rendering, placeholder-step-details, workflow-placeholder, and `SetWorkflowPlaceholdersToolHandler` imports. Replace `resolveActiveCreateStoryStepTwo(...)` with a pure runtime-session gate that returns truthy only when `config.taskState.activeWorkflowName === "create-story.md"` and `config.taskState.activeWorkflowSession?.activeStepId === "step-2"`.

- [ ] Subtask 7.6b
  Allowed files: `src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts`
  Revision: In the main execution block at [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts#L119-L277), replace placeholder-derived reads with `activeWorkflowSession.workflowValues.epic_delivery_spec`, `story_number`, and `output_folder`, import `createStoryArtifacts.story_doc` from `@/core/task/workflow-runtime/workflows/create-story/artifacts`, build `templateMarkdown` from `createStoryArtifacts.story_doc.initialContent`, derive `artifactPath` from `output_folder` plus `createStoryArtifacts.story_doc.relativePathPattern` with `{story_number}` substituted, and replace the tail `persistWorkflowPlaceholderValues(config, { story_doc: artifactPath })` call with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { story_doc: artifactPath } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.

- [ ] Subtask 7.7a
  Allowed files: `src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts`
  Revision: In the import/helper block at [BuildTechSpecDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts#L3-L18) and [BuildTechSpecDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts#L48-L63), remove placeholder-rendering, placeholder-step-details, workflow-placeholder, and `SetWorkflowPlaceholdersToolHandler` imports. Replace `resolveActiveQuickSpecStepTwo(...)` with a pure runtime-session gate that returns truthy only when `config.taskState.activeWorkflowName === "quick-spec.md"` and `config.taskState.activeWorkflowSession?.activeStepId === "step-2"`.

- [ ] Subtask 7.7b
  Allowed files: `src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts`
  Revision: In the main execution block at [BuildTechSpecDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts#L72-L189), replace placeholder-derived reads with `activeWorkflowSession.workflowValues.title`, `date`, and `implementation_artifacts`, import `quickSpecArtifacts.output_file` from `@/core/task/workflow-runtime/workflows/quick-spec/artifacts`, build `templateMarkdown` from `quickSpecArtifacts.output_file.initialContent`, derive `artifactPath` from `implementation_artifacts` plus `quickSpecArtifacts.output_file.relativePathPattern`, and replace the tail `persistWorkflowPlaceholderValues(config, { output_file: artifactPath })` call with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { output_file: artifactPath } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.

- [ ] Subtask 7.8
  Allowed files: `src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts`
  Revision: In [CaptureBrainstormingTopicToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts#L3-L65), remove the placeholder-step-details import and replace `resolveActiveBrainstormingStepThree(...)` with a runtime-session gate that requires `activeWorkflowName === "brainstorming.md"` and `activeWorkflowSession?.activeStepId === "step-3"`. Leave the file-write behavior unchanged, but replace the `output_file` error text so it refers to runtime workflow values rather than placeholder state.

- [ ] Subtask 7.9
  Allowed files: `src/core/task/tools/handlers/CreateBrainstormingSessionToolHandler.ts`
  Revision: In [CreateBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CreateBrainstormingSessionToolHandler.ts#L3-L72), remove the placeholder-step-details import, replace the active-step helper with a runtime-session gate for `brainstorming.md` Step 2, replace the stable-placeholder `date` read with `String(config.taskState.activeWorkflowSession?.workflowValues.date ?? "")`, and replace `persistWorkflowPlaceholderValues(config, { output_file: artifactPath })` with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { output_file: artifactPath } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.

- [ ] Subtask 7.10
  Allowed files: `src/core/task/tools/handlers/ContinueBrainstormingSessionToolHandler.ts`
  Revision: In [ContinueBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/ContinueBrainstormingSessionToolHandler.ts#L3-L54), remove the placeholder-step-details import, replace the active-step helper with a runtime-session gate for `brainstorming.md` Step 2, and replace `persistWorkflowPlaceholderValues(config, { output_file: newestSession.absolutePath })` with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { output_file: newestSession.absolutePath } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.

- [ ] Subtask 7.11
  Allowed files: `src/core/task/tools/handlers/PersistBrainstormingApproachToolHandler.ts`
  Revision: In [PersistBrainstormingApproachToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PersistBrainstormingApproachToolHandler.ts#L3-L129), remove the placeholder-step-details import, replace the active-step helper with a runtime-session gate for `brainstorming.md` Step 4, and replace `persistWorkflowPlaceholderValues(config, { selected_approach: selectedApproach })` with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { selected_approach: selectedApproach } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.

- [ ] Subtask 7.12
  Allowed files: `src/core/task/tools/handlers/PersistBrainstormingTechniqueToolHandler.ts`
  Revision: In [PersistBrainstormingTechniqueToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PersistBrainstormingTechniqueToolHandler.ts#L3-L140), remove the placeholder-step-details import, replace the active-step helper with a runtime-session gate for `brainstorming.md` Step 4, and replace `persistWorkflowPlaceholderValues(config, { selected_technique: techniqueName })` with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { selected_technique: techniqueName } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.

- [ ] Subtask 7.13
  Allowed files: `src/core/task/tools/handlers/RequestBrainstormingTechniqueSuggestionToolHandler.ts`
  Revision: In [RequestBrainstormingTechniqueSuggestionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/RequestBrainstormingTechniqueSuggestionToolHandler.ts#L3-L129), remove the placeholder-step-details import, replace the active-step helper with a runtime-session gate for `brainstorming.md` Step 4, and replace `persistWorkflowPlaceholderValues(config, { selected_technique: TECHNIQUE_SUGGESTION_SENTINEL })` with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { selected_technique: TECHNIQUE_SUGGESTION_SENTINEL } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.

- [ ] Subtask 7.14
  Allowed files: `src/core/task/tools/handlers/SelectBrainstormingSessionToolHandler.ts`
  Revision: In [SelectBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SelectBrainstormingSessionToolHandler.ts#L3-L60), remove the placeholder-step-details import, replace the active-step helper with a runtime-session gate for `brainstorming.md` Step 2, and replace `persistWorkflowPlaceholderValues(config, { output_file: selectedOutputFile })` with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { output_file: selectedOutputFile } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.

- [ ] Subtask 7.15
  Allowed files: `src/core/task/tools/handlers/SelectRandomBrainstormingTechniqueToolHandler.ts`
  Revision: In [SelectRandomBrainstormingTechniqueToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SelectRandomBrainstormingTechniqueToolHandler.ts#L3-L44), remove the placeholder-step-details import, replace the active-step helper with a runtime-session gate for `brainstorming.md` Step 4, and leave the tool-result payload unchanged. Do not add any workflow-value write in this subtask; this handler only returns a suggested technique payload.

- [ ] Subtask 7.16
  Allowed files: `src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts`
  Revision: In [SelectTargetEpicToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts#L13-L149), remove placeholder-rendering and placeholder-step-details imports, replace `resolveActivePiPlanningStepTwo(...)` with a runtime-session gate for `pi-planning.md` Step 2, replace `resolveEpicsDocumentPath(...)` so it reads `epics_document` from `activeWorkflowSession.workflowValues`, and replace `persistWorkflowPlaceholderValues(config, { [SELECT_TARGET_EPIC_PLACEHOLDER_KEY]: text })` with the runtime-owned equivalent: call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: { [SELECT_TARGET_EPIC_PLACEHOLDER_KEY]: text } })`, then on main-thread execution persist only the runtime workflow metadata fields, save metadata, and call `updateFCListFromToolResponse(undefined)`.

- [ ] Subtask 7.17a
  Allowed files: `src/core/task/tools/handlers/SubagentToolHandler.ts`
  Revision: In the workflow-detection and deterministic-state block at [SubagentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SubagentToolHandler.ts#L56-L70) and [SubagentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SubagentToolHandler.ts#L314-L337), replace placeholder-owned code-review state with runtime-owned state:
  - `isActiveCodeReviewPlaceholderWorkflow(...)` must become a runtime gate on `config.taskState.activeWorkflowName === "code-review.md"`
  - completed review-layer writes must target `config.taskState.activeWorkflowSession?.deterministicState.codeReview.completedReviewLayers`
  - no `activePlaceholderWorkflowDeterministicState` write may remain in those regions

- [ ] Subtask 7.17b
  Allowed files: `src/core/task/tools/handlers/SubagentToolHandler.ts`
  Revision: In the metadata-persist block at [SubagentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SubagentToolHandler.ts#L358-L375), delete the placeholder-workflow and managed-workflow metadata writes. Persist only `activeWorkflowName`, `activeWorkflowSession`, `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, and `activeWorkflowStepResolutionSession`.

- [ ] Subtask 7.18
  Allowed files: `src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts`
  Revision: Delete [CompleteWorkflowItemToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts) after `WorkflowRuntime.handleWorkflowProgressApproval(...)` fully replaces managed-workflow item completion and no caller imports it.

- [ ] Subtask 7.19
  Allowed files: `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts`
  Revision: In [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts#L1-L320), preserve the tool handler file and tool id, but cut it over from placeholder ownership to runtime-owned workflow-value persistence. Make these exact changes in one file:
  - delete managed-workflow, placeholder-workflow, and deterministic-placeholder imports and helpers
  - keep the existing `values` wrapper parsing behavior
  - replace `persistWorkflowPlaceholderValues(...)` with `persistWorkflowValueWrites(...)` that calls `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values })`
  - on changed values, persist only the runtime workflow metadata fields on main-thread execution and call `updateFCListFromToolResponse(undefined)`
  - rewrite all user-facing strings so they refer to workflow values and active workflow session state rather than placeholders, while preserving the existing “do not call again unless one of those values changes” guidance
  - preserve artifact-path normalization by moving that logic onto the runtime-owned mutation seam from Subtask 4.6 instead of re-implementing separate write logic here

### Phase 8: Retire model-authored task_progress and make focus chain a workflow-only downstream projection

- [ ] Subtask 8.1
  Allowed files: `src/core/task/focus-chain/updateFromToolResponse.ts`
  Revision: In [updateFromToolResponse.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/updateFromToolResponse.ts#L4-L56), remove the `task_progress` carrier from the post-tool path so this helper no longer accepts model-authored workflow-state mutations.

- [ ] Subtask 8.2
  Allowed files: `src/core/task/focus-chain/prompts.ts`
  Revision: Replace the literal strings in [prompts.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/prompts.ts#L1-L48) so no prompt in this file tells the model to create or mutate `task_progress`.

- [ ] Subtask 8.3
  Allowed files: `src/core/task/focus-chain/index.ts`
  Revision: Replace the placeholder-workflow ownership paths in [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L255-L964) with downstream-only workflow projection helpers that render runtime-owned checklist state but never derive the active step from checklist contents and never own progression.

- [ ] Subtask 8.4
  Allowed files: `src/core/prompts/system-prompt/spec.ts`
  Revision: Remove every remaining `task_progress` parameter description and validation branch from [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L1-L260).

- [ ] Subtask 8.5
  Allowed files: `src/core/prompts/system-prompt/tools/access_mcp_resource.ts`
  Revision: Remove the `task_progress` parameter and every checklist instruction from [access_mcp_resource.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/access_mcp_resource.ts#L1-L120).

- [ ] Subtask 8.6
  Allowed files: `src/core/prompts/system-prompt/tools/generate_plan_output.ts`
  Revision: Remove the `task_progress` parameter and every checklist instruction from [generate_plan_output.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/generate_plan_output.ts#L1-L160).

- [ ] Subtask 8.7
  Allowed files: `src/core/prompts/system-prompt/tools/act_mode_respond.ts`
  Revision: Remove the `task_progress` parameter and every checklist instruction from [act_mode_respond.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/act_mode_respond.ts#L1-L120).

- [ ] Subtask 8.8
  Allowed files: `src/core/prompts/system-prompt/tools/use_mcp_tool.ts`
  Revision: Remove the `task_progress` parameter and every checklist instruction from [use_mcp_tool.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/use_mcp_tool.ts#L1-L120).

- [ ] Subtask 8.9
  Allowed files: `src/core/prompts/system-prompt/tools/write_to_file.ts`
  Revision: Remove the `task_progress` parameter and every checklist instruction from [write_to_file.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/write_to_file.ts#L1-L120).

- [ ] Subtask 8.10
  Allowed files: `src/core/prompts/system-prompt/tools/attempt_completion.ts`
  Revision: Remove the `task_progress` parameter and every checklist instruction from [attempt_completion.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/attempt_completion.ts#L1-L180).

- [ ] Subtask 8.11
  Allowed files: `src/core/prompts/system-prompt/variants/gpt-5/template.ts`
  Revision: Remove every `task_progress` instruction from [template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/template.ts#L1-L120).

- [ ] Subtask 8.12
  Allowed files: `src/core/prompts/system-prompt/variants/native-gpt-5/template.ts`
  Revision: Remove every `task_progress` instruction from [template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/template.ts#L1-L120).

- [ ] Subtask 8.13
  Allowed files: `src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts`
  Revision: Remove every `task_progress` instruction from [overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts#L1-L120).

- [ ] Subtask 8.14
  Allowed files: `src/core/prompts/system-prompt/variants/gemini-3/overrides.ts`
  Revision: Remove every `task_progress` instruction from [overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/overrides.ts#L1-L120).

- [ ] Subtask 8.15
  Allowed files: `src/core/prompts/system-prompt/variants/glm/overrides.ts`
  Revision: Remove every `task_progress` instruction from [overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/glm/overrides.ts#L1-L120).

- [ ] Subtask 8.16
  Allowed files: `src/core/prompts/system-prompt/variants/hermes/overrides.ts`
  Revision: Remove every `task_progress` instruction from [overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/hermes/overrides.ts#L1-L120).

- [ ] Subtask 8.17
  Allowed files: `src/core/prompts/contextManagement.ts`
  Revision: Remove every active `task_progress` instruction, XML example, and continuation requirement from [contextManagement.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/contextManagement.ts#L1-L140).

- [ ] Subtask 8.18
  Allowed files: `src/core/prompts/commands.ts`
  Revision: Remove every active `task_progress` parameter description and example block from [commands.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/commands.ts#L1-L160).

- [ ] Subtask 8.19
  Allowed files: `src/core/prompts/commands/deep-planning/index.ts`
  Revision: Remove the `task_progress` carry-forward instruction from [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/commands/deep-planning/index.ts#L1-L80).

- [ ] Subtask 8.20
  Allowed files: `src/core/prompts/commands/deep-planning/variants/gpt51.ts`
  Revision: Remove every `task_progress` instruction from [gpt51.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/commands/deep-planning/variants/gpt51.ts#L1-L260).

- [ ] Subtask 8.21
  Allowed files: `src/core/prompts/commands/deep-planning/variants/gemini3.ts`
  Revision: Remove every `task_progress` instruction from [gemini3.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/commands/deep-planning/variants/gemini3.ts#L1-L260).

- [ ] Subtask 8.22
  Allowed files: `src/core/prompts/commands/deep-planning/variants/generic.ts`
  Revision: Remove every `task_progress` instruction from [generic.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/commands/deep-planning/variants/generic.ts#L1-L260).

- [ ] Subtask 8.23
  Allowed files: `src/core/prompts/commands/deep-planning/variants/gemini.ts`
  Revision: Remove every `task_progress` instruction from [gemini.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/commands/deep-planning/variants/gemini.ts#L1-L280).

- [ ] Subtask 8.24
  Allowed files: `src/core/prompts/commands/deep-planning/variants/anthropic.ts`
  Revision: Remove every `task_progress` instruction from [anthropic.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/commands/deep-planning/variants/anthropic.ts#L1-L280).

### Phase 9: Route child workflow activation and child prompt/tool projection through the shared WorkflowRuntime

Use the shared runtime contract from `TaskConfig.workflowRuntime` against child `TaskState` instances in this phase. Do not introduce a second workflow-runtime owner, `childWorkflowRuntime` property, or any subagent-specific workflow orchestrator.

- [ ] Subtask 9.1a
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In the import block at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1-L40), remove `createWorkflowSkillMetadata` from the legacy workflow-resolution import and add `getWorkflowSkillMetadata` from `@/core/task/workflow-runtime/WorkflowRegistry`. Keep `resolveAvailableWorkflows` imported in this subtask only; it is removed later in Subtask 9.3d after the activation call site no longer uses `workflowEntries`.

- [ ] Subtask 9.1b
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In the available-skills assembly block at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L469-L484), leave the existing `workflowEntries` local in place for now, but replace `createWorkflowSkillMetadata(workflowEntries)` with `getWorkflowSkillMetadata()`.

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

- [ ] Subtask 9.2b
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In `maybeAppendCurrentStepInputPrompt(...)` at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1156-L1168), replace the focus-chain placeholder call `consumeCurrentPlaceholderWorkflowStepPromptForInput(...)` with `await this.baseConfig.workflowRuntime.buildCurrentStepPrompt(state, { forceAuxPrompt: true })` and keep the existing `content.push({ type: "text", text: prompt })` behavior for non-empty prompts.

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

- [ ] Subtask 9.3a
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In the import block at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1-L40), remove `getManagedWorkflowDefinition`, `activateManagedWorkflowInTaskState`, `activatePlaceholderWorkflowInTaskState`, `findResolvedWorkflowByName`, `resolveWorkflowPersonaInstructions`, `getBmadWorkflowReminder`, `buildManagedWorkflowPrompt`, `resolveActivePlaceholderWorkflowPromptContext`, `getPlaceholderWorkflowValueMap`, `extractWorkflowPlaceholderKeys`, and `isDeterministicPlaceholderWorkflowSupported`. Add `resolveWorkflowByUseSkillName` from `@/core/task/workflow-runtime/WorkflowRegistry`.

- [ ] Subtask 9.3b
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In `autoActivateAssignedWorkflow(...)` at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1037-L1077), replace the entire method body with shared-runtime activation logic. Keep the method name, but change the third parameter to the optional compile-bridge form `workflowEntries?: unknown` and do not read it. The replacement method must:
  - return early unless `assignedSkillNames.length === 1`
  - return early when `state.activeWorkflowName` and `state.activeWorkflowSession` are already set
  - resolve the assigned skill through `resolveWorkflowByUseSkillName(assignedSkillNames[0])`
  - return early when no shipped workflow matches
  - call `await this.baseConfig.workflowRuntime.activateWorkflow({ taskState: state, workflowName: definition.name, invocationSource: "use_skill", parentWorkflowValues: this.baseConfig.taskState.activeWorkflowSession?.workflowValues })`
  Do not reference managed-workflow state, placeholder-workflow state, deterministic placeholder progression, or focus-chain checklist seeding in the replacement body. Parent-to-child workflow-value transfer must happen only through the runtime-owned `parentWorkflowValues` input and the child definition's `inheritedWorkflowValueKeys`.

- [ ] Subtask 9.3c
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In the run-loop setup block at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L469-L484), delete the `workflowEntries = await resolveAvailableWorkflows(...)` local entirely and replace `await this.autoActivateAssignedWorkflow(state, assignedSkillNames, workflowEntries)` with `await this.autoActivateAssignedWorkflow(state, assignedSkillNames)`.

- [ ] Subtask 9.3d
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: In the import block at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1-L40), remove the now-unused `resolveAvailableWorkflows` import after Subtask 9.3c lands.

- [ ] Subtask 9.3e
  Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`
  Revision: Delete the contiguous legacy helper block at [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1079-L1154): `inheritSharedParentPlaceholdersToActivatedWorkflow(...)`, `applyInitialDeterministicPlaceholderProgressionIfNeeded(...)`, and `seedPlaceholderChecklistIfNeeded(...)`. After this edit, no child-workflow inheritance logic may remain outside `WorkflowRuntime.activateWorkflow(...)`.

- [ ] Subtask 9.4a
  Allowed files: `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
  Revision: In the import/setup block at [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1-L64), remove the imports of `workflowActivation`, `workflowResolution`, and `resolveWorkflowPersonaInstructions`. Add imports for `WorkflowRuntime` from `@/core/task/workflow-runtime/WorkflowRuntime` and `resolveWorkflowDefinition` from `@/core/task/workflow-runtime/WorkflowRegistry`. Then update `createTaskConfig(...)` so the returned `TaskConfig` includes `workflowRuntime: new WorkflowRuntime(resolveWorkflowDefinition)`.

- [ ] Subtask 9.4b
  Allowed files: `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
  Revision: In the `beforeEach(...)` block at [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L236-L242), delete the default stub of `workflowResolution.resolveAvailableWorkflows`. No registry-resolution stub should remain in this block after the Phase 9 cutover.

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

### Phase 10: Remove the legacy workflow owners only after every caller has been cut over

- [ ] Subtask 10.1
  Allowed files: `src/core/task/workflow-activation.ts`
  Revision: Delete [workflow-activation.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts) after Phases 2-9 land and no caller imports it.

- [ ] Subtask 10.2
  Allowed files: `src/core/workflows/resolution/resolveAvailableWorkflows.ts`
  Revision: Delete [resolveAvailableWorkflows.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/resolution/resolveAvailableWorkflows.ts) only after Subtasks 3.3a through 3.5d and 9.4a through 9.4c land and no production or test caller imports it.

- [ ] Subtask 10.3
  Allowed files: `src/core/workflows/resolution/__tests__/resolveAvailableWorkflows.test.ts`
  Revision: Delete [resolveAvailableWorkflows.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/resolution/__tests__/resolveAvailableWorkflows.test.ts) only after `WorkflowRegistry.ts` replacement coverage exists in the slash-command, main-task, `use_skill`, and subagent test surfaces and no code path uses `resolveAvailableWorkflows`.

- [ ] Subtask 10.4
  Allowed files: `src/core/workflows/placeholder-workflow-step-details.ts`
  Revision: Delete [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts) after Phases 6-9 land and no caller imports it.

- [ ] Subtask 10.5
  Allowed files: `src/core/workflows/placeholder-workflow-rendering.ts`
  Revision: Delete [placeholder-workflow-rendering.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-rendering.ts) after Phases 6-9 land and no caller imports it.

- [ ] Subtask 10.6
  Allowed files: `src/core/workflows/workflow-placeholders.ts`
  Revision: Delete [workflow-placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts) after Phases 6-9 land and no caller imports it.

- [ ] Subtask 10.7
  Allowed files: `src/core/task/managed-workflows/**`
  Revision: Delete the entire `src/core/task/managed-workflows/` directory only after no runtime code path, slash-command path, use-skill path, prompt path, or subagent path imports any managed-workflow module.

### Phase 11: Align tests and docs with the final runtime-owned workflow architecture

- [ ] Subtask 11.1
  Allowed files: `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
  Revision: Replace the managed-workflow assertions in [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L866-L4691) with runtime-owned workflow handler coverage. Do not delete this file; it still owns surviving `use_skill`, deterministic document-build, brainstorming, and `set_workflow_placeholders` workflow-value persistence coverage.

- [ ] Subtask 11.2
  Allowed files: `src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
  Revision: Update [response_tools.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts#L1-L220) so it asserts runtime-projected `activeWorkflowProgressRequestEnabled` and runtime-projected tool bundles only.

- [ ] Subtask 11.3
  Allowed files: `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
  Revision: Update [task_progress.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts#L1-L220) so it asserts the runtime-owned workflow progression instructions and the absence of `task_progress`.

- [ ] Subtask 11.4
  Allowed files: `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
  Revision: Replace [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L1-L220) with tests for `expandWorkflowToolBundles(...)`.

- [ ] Subtask 11.5
  Allowed files: `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`
  Revision: Update [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L1-L220) so it asserts runtime-owned workflow restore and focus-chain projection instead of placeholder workflow ownership.

- [ ] Subtask 11.6
  Allowed files: `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
  Revision: Update [WorkflowProgressRequestToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts#L1-L320) so it uses `activeWorkflowName`, `activeWorkflowSession.activeStepId`, and runtime-owned approval callbacks rather than `activePlaceholderWorkflowSource`.

- [ ] Subtask 11.7
  Allowed files: `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
  Revision: Update [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1-L260) so it asserts child-local runtime workflow activation with copy-based parent-value initialization only when `inheritedWorkflowValueKeys` is declared, and no shared mutable parent/child workflow session state.

- [ ] Subtask 11.7a
  Allowed files: `src/core/prompts/system-prompt/__tests__/spec.test.ts`
  Revision: Update the `set_workflow_placeholders` assertions in [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L328-L366) and the compact-description assertions in [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L854-L875) so they expect runtime-owned workflow-value wording, `context.activeWorkflowName` gating, and the unchanged `{"values": {...}}` wrapper shape.

- [ ] Subtask 11.7b
  Allowed files: `src/core/prompts/system-prompt/__tests__/integration.test.ts`
  Revision: Update the `set_workflow_placeholders` prompt/tool coverage in [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1364-L2249) so it no longer uses `activeWorkflowSupportsPlaceholders`, `managedWorkflowActive`, `activePlaceholderWorkflowName`, or `activePlaceholderWorkflowStepNumber`. Replace those cases with runtime-owned prompt/tool assertions using `activeWorkflowName`, `activeWorkflowStepNumber`, and workflow-runtime-projected tool bundles, while preserving the existing expectations about which workflow steps do or do not expose `set_workflow_placeholders`.

- [ ] Subtask 11.8
  Allowed files: `docs/agent-101.md`
  Revision: Update [agent-101.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/agent-101.md) so it no longer describes managed workflows, placeholder markdown ownership, or `task_progress` as the workflow progression contract.

- [ ] Subtask 11.9
  Allowed files: `docs/workflows/workflow-document-runtime-review.md`
  Revision: Update [workflow-document-runtime-review.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-document-runtime-review.md) so it documents code-owned workflow modules and runtime-owned session state rather than placeholder markdown ownership.

- [ ] Subtask 11.10
  Allowed files: `docs/workflows/workflow-automation-readme.md`
  Revision: Update [workflow-automation-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-automation-readme.md) so it documents workflow runtime orchestration instead of legacy activation and placeholder flow.

- [ ] Subtask 11.11
  Allowed files: `docs/workflows/deterministic-workflow-progression-readme.md`
  Revision: Update [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md) so it documents deterministic resolution as workflow-module-owned definitions orchestrated by `WorkflowRuntime`.

- [ ] Subtask 11.12
  Allowed files: `docs/system-prompt-tool-reference.md`
  Revision: Update [system-prompt-tool-reference.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/system-prompt-tool-reference.md) so it documents runtime-owned workflow prompt/tool projection, the retained `set_workflow_placeholders` tool as the AI-callable workflow-value persistence seam, and the removal of `task_progress`.

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
