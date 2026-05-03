# Workflow Runtime Foundational Build Remediation Action Plan

## FrontMatter
- Read this plan from top to bottom before making any changes.
- Read each step in full immediately before executing it.
- Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.
- After completing a task or subtask, update that step's checkbox from "[ ]" to "[x]".
- Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
- Do not edit any file not listed in the current step's allowed-files list.
- If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.
- Implement tasks and subtasks exactly as instructed. If deviation seems necessary, stop, inform the user, and explain why you believe the task or subtask should be carried out differently than prescribed.
- You must avoid these banned development bad habits:
  - "any" typing
  - val as SomeType
  - as any in tests
  - optional properties most of the time (explicitly model which combinations exist and which don't whenever possible)
  - one-letter generics
  - non-boolean boolean checks
  - bang bang operators (explicitly check for the condition instead)
  - != null (explicitly check for the condition instead)
  - not declaring function return types
  - abuse of type assertions (use them only in special scenarios where the type is clearly known, and give priority to type declarations, interfaces, or generics)
  - Failing to use utility types (use utility types such as partial, pick, omit, etc when appropriate)
  - forcing assertions when types don't match
  - not using enums to manage constants
  - not using generics to abstract duplicated code
  - not using type narrowing
  - not explicitly defining generics parameters

## Scope

This plan remediates the live foundational workflow-runtime implementation so it matches the approved architecture in [../architecture.md](../architecture.md), the scoped requirements in [requirements.md](./requirements.md), the gap inventory in [audit-results.md](./audit-results.md), and the required end states in [audit-remediation.md](./audit-remediation.md).

This plan covers only Foundational Build work. It brings the shared runtime, persistence, prompting, tool projection, workflow-form ownership, and legacy-surface cleanup into compliance without introducing workflow-module population or Module Build-only behavior.

This plan also covers the foundational runtime-owned artifact allocation/create infrastructure required by `FR-20b` through `FR-20p`; it must provide shared numbering, naming, discovery, creation, and workflow-value persistence seams without adding or registering live workflow modules.

## Scope Boundary

- Do not add or ship workflow modules in this plan.
- Do not introduce new architecture beyond what is already prescribed in the workflow-runtime architecture, foundational requirements, audit results, and audit remediation documents.
- Do not preserve placeholder-workflow, managed-workflow, BMAD-document, YAML-config, or other legacy workflow ownership surfaces unless the upstream migration matrix explicitly says they survive.
- Do not add compatibility aliases for removed workflow state, prompt carriers, tool contracts, or registries.
- Do not move final turn-type selection into `WorkflowRuntime`; the main system-prompt machinery remains the chooser of full-turn versus continuation-turn prompt variants.

## Known Issues / Risks / Technical Debt

- The decision-tree contract replacement is the load-bearing remediation. Phases 3 through 6 depend on the new branch model and should not begin until Phase 2 has been reviewed.
- Workflow-form and deterministic-step removals touch persistence, task/runtime orchestration, prompt projection, and tests at the same time. Do not leave compatibility shims behind to make intermediate states pass.
- Prompt and tool cleanup will invalidate touched snapshots and integration assertions across both current and legacy prompt surfaces. Clean those assertions in the same phase that removes the owning legacy surface.
- `workflow_progress_request` and `complete_workflow_item` must not remain statically exposed while prompt projection is being refactored. If the runtime-only override path cannot be completed in the same pass, stop and ask the user instead of shipping mixed ownership.
- Runtime-owned artifact allocation introduces a backend-only workflow execution tool and canonical filename registry. Treat those canonical names as product-owned runtime conventions, not module configuration; do not add static prompt/native exposure, and do not preserve the old `relativePathPattern` artifact model in parallel.
- The current runtime still contains stale branch-action naming around tool-backed workflow operation execution. That naming must not survive as a separate workflow concept: direct runtime-owned deterministic procedures must stay inside `WorkflowRuntime` or shared runtime-owned seams, and only tool-governed work may flow through the normal tool execution path.
- Invalid or stale workflow resume and invalid runtime resolve paths can currently clear in-memory workflow state without guaranteeing persisted metadata cleanup. Phase 25 must make teardown persistence explicit; do not solve this by persisting every `no_op`.
- Current workflow-value persistence is string-only and silently drops workflow-form array/object submissions. Phase 27 must align runtime storage, form persistence, workflow tool parsing, and string-only consumers with `FR-35i` through `FR-35m` and `FR-39l` through `FR-39m`; it must also handle model-authored JSON-string tool parameters and prevent nested workflow-form array/object normalization from dropping malformed entries before durable persistence.
- Runtime workflow filesystem access still bypasses the workspace path-policy seam in discovery, artifact creation, and entry project folder creation. Phase 28 enforced handler-level checks only; Phase 29 wires the existing `ClineIgnoreController.validateAccess(...)` seam into `WorkflowRuntime` and runtime discovery before runtime-owned `readdir`, `mkdir`, or `writeFile`.
- `ActiveWorkflowSession` still carries `workflowName`, and resume still resolves/restores from `persistedSession.workflowName`. Phase 30 must remove workflow identity from the workflow session shape so `activeWorkflowName` remains the only canonical active workflow identity carrier required by `FR-3`, `FR-4`, and architecture AD-3. Do not remove legitimate workflow definition, activation-argument, registry-resolution, or diagnostic uses of `workflowName`.
- Workflow activation and workflow-state-mutating tool paths still drop returned workflow next actions outside the slash-command path. Phase 31 must make next-action consumption a shared runtime-adjacent seam used by slash activation, main-agent workflow `use_skill`, workflow progress requests, workflow value writes, and parent-assigned child workflow activation. `SubagentRunner` may call this seam with a child adapter, but it must not become a second workflow orchestrator.

## Tasks / Subtasks

### Phase 1 - Canonical Session And Activation Ownership

Pause for QA review before moving to Phase 2.

[x] Task 1. Collapse fragmented workflow state into the canonical `activeWorkflowSession` / `activeWorkflowName` ownership model.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 1.1. In `src/core/task/TaskState.ts`, delete the top-level workflow UI/session mirror fields (`activeWorkflowStartCardSession`, `activeWorkflowFormSession`, `activeWorkflowStepResolutionSession`, `suppressedWorkflowStepResolutionDefinitionIds`, and `suppressedWorkflowFormResolverIds`) so workflow-owned state lives only in `activeWorkflowSession`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts`

[x] Subtask 1.2. In `src/core/context/context-tracking/ContextTrackerTypes.ts`, remove the parallel workflow metadata fields so persisted task metadata carries only `activeWorkflowName` and `activeWorkflowSession` for workflow state.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts`

[x] Subtask 1.3. In `src/core/task/index.ts`, replace the current workflow persistence/restore path with one that saves and restores only `activeWorkflowName` plus `activeWorkflowSession`, and delete serialization of the removed mirror fields.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 1.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, delete the mirror-sync helpers and update activation, teardown, resume, and projection code to read and write workflow UI state only through `taskState.activeWorkflowSession`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 1.5. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, replace mirror-field assertions with coverage that proves stale top-level workflow carriers are gone and runtime reconstructs downstream workflow UI state from the canonical session only.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Task 2. Restore the approved activation boundary, workflow skill exposure, child-session inheritance, and shared project-selection gate contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 2.1. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, replace the caller-supplied `WorkflowDefinition` activation contract with runtime-owned registry resolution keyed by canonical workflow identity so `activateWorkflow(...)` no longer accepts a live definition object.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.2. In `src/core/task/index.ts`, `src/core/task/tools/handlers/UseSkillToolHandler.ts`, and `src/core/task/tools/subagent/SubagentRunner.ts`, update every workflow activation call site to set `activeWorkflowName`, pass canonical identity into `WorkflowRuntime`, and stop resolving workflow definitions before activation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 2.2a. In `src/core/task/workflow-runtime/WorkflowRegistry.ts`, replace legacy workflow-to-skill metadata projection with exported `getWorkflowSkillMetadata(): SkillMetadata[]` that maps directly from the product-owned shipped workflow definitions and their module-owned identity fields; do not preserve, alias, or call `createWorkflowSkillMetadata(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[x] Subtask 2.2b. In `src/core/task/index.ts` and `src/core/task/tools/subagent/SubagentRunner.ts`, build main-agent and subagent `useSkill` exposure from the same `getWorkflowSkillMetadata()` projection so local, global, remote, and managed workflow-source discovery do not participate in shipped workflow skill metadata.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 2.2c. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, implement child workflow-value inheritance only inside `activateWorkflow(...)` by copying values declared in the child workflow definition's inheritance rules from the supplied parent session into the new child session, including same-key mappings, without sharing mutable state or mutating the parent session.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `submitWorkflowStartCard(...)` to branch on the generated proto enum values for `projectMode` and keep the shared project-selection gate entirely inside the runtime.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 2.4. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` and `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, replace definition-object and string-cast start-card expectations with canonical name-based activation and real proto enum submissions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 2.4a. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add child-workflow activation coverage proving definition-declared parent-to-child value inheritance is copy-based, supports same-key inheritance, does not inherit undeclared parent values, and leaves parent workflow state unchanged.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

Historical note:
- Subtasks `2.3` and `2.4` were completed before the upstream architecture/requirements correction that removed workflow start cards from the target model.
- That completed Phase 1 wire-contract work must not be treated as preserved end-state architecture.
- Any surviving workflow-start-card entry path must now be replaced during Phase 3 rather than preserved.

### Phase 2 - Decision-Tree Progression And Canonical Approval Handling

Pause for QA review before moving to Phase 3.

[x] Task 3. Replace the flat ordered `nextActionRules` model with the approved module-defined decision-tree contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflowValues.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 3.1. In `src/core/task/workflow-runtime/types.ts`, replace `WorkflowNextActionRule[]`, `condition.matches(session)`, `allowWorkflowProgressRequest`, and the special per-rule workflow-form / deterministic fields with decision-tree types that declare branch ids, branch triggers, following branch targets, explicit step-transition targets, and runtime-readable branch context.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 3.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, replace first-match `.find(...)` next-action evaluation with decision-tree traversal from runtime-owned branch context, and remove the implicit workflow-form and deterministic fallback paths that bypass that tree.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 3.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, change `workflow_progress_request` approval handling so runtime re-validates approval at the canonical mutation seam and derives the post-approval action by re-evaluating the active step’s decision tree instead of incrementing the step by `+1`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 3.4. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, replace the ordered-array, `allowWorkflowProgressRequest`, and `+1` assertions with coverage for branch-context evaluation, re-validation, and explicit target-step progression.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 3.5. In `src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts` and `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`, update `workflow_progress_request` gating and assertions so the handler delegates to the decision-tree-aware runtime validation seam instead of the removed `allowWorkflowProgressRequest` model.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

[x] Subtask 3.6. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, migrate the workflow fixtures and related assertions that activate `WorkflowRuntime` so they use the new decision-tree step contract instead of the removed flat step-rule shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

### Phase 3 - Workflow-Form Ownership, Mandatory Entry Flow, Shared Discovery, And Canonical Value Persistence

Pause for QA review before moving to Phase 4.

[x] Task 4. Move all workflow-form ownership, including the mandatory shared pre-workflow entry flow, into `WorkflowRuntime` and remove live workflow-start-card ownership.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/buildWorkflowStartCardPayload.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/task/submitWorkflowStartCard.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/proto/cline/task.proto`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/proto/cline/task.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/task/__tests__/submitWorkflowStartCard.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts`

Historical note:
- Subtasks `4.1` through `4.5` were executed before the corrected upstream architecture made the mandatory shared entry `WorkflowForm` explicit.
- That earlier work remains valid only insofar as it moved active-step workflow-form ownership toward `WorkflowRuntime`.
- Phase 3 is not complete until the additional unchecked subtasks below replace the live workflow-start-card entry path with the mandatory two-panel shared entry `WorkflowForm`.

[x] Subtask 4.1. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, build active-step `WorkflowForm` payloads directly from workflow-module configuration, including population of existing-project, folder, file, and artifact selectors through the shared discovery/list-builder seam, instead of delegating payload assembly to `workflowFormRuntime.buildPayload(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 4.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, route submitted workflow-form selections through the canonical workflow-value mutation seam and re-enter decision-tree evaluation instead of persisting workflow-specific form mirrors or registry-owned result state.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 4.3. In `src/core/task/workflow-form/WorkflowFormRuntime.ts`, delete `buildPayload(...)` and any workflow-specific result-interpretation or active-panel ownership so only generic session creation, submitted-value normalization, submitted-value validation, generic navigation, and shared message-shape formatting remain.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`

[x] Subtask 4.4. In `src/core/task/workflow-form/WorkflowFormRegistry.ts`, delete the workflow-specific builders, registry maps, resolver lookup helpers, and workflow-start / brainstorming-specific ownership paths that remain in the live foundational runtime.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`

[x] Subtask 4.5. In `src/core/task/index.ts`, `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, and `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`, remove task-layer workflow-form orchestration expectations and replace them with runtime-owned payload/result coverage plus generic-engine-only workflow-form runtime coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

[x] Subtask 4.5a. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, `src/core/task/workflow-runtime/types.ts`, and `src/shared/ExtensionMessage.ts`, delete the field-text heuristic currently used to infer an existing-project selector from `field.key`, `field.label`, or `field.helpText`. Replace it with explicit typed selector/discovery configuration with the correct ownership split: for the mandatory shared pre-workflow entry `WorkflowForm`, `WorkflowRuntime` owns the shared project-selection field definitions, selector/discovery configuration, and option population; for active-step workflow forms, selector/discovery behavior must come only from explicit workflow-module-declared typed configuration consumed by `WorkflowRuntime`. In no case may selector behavior be inferred from user-facing field text.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`

[x] Subtask 4.5b. In `src/core/task/workflow-form/types.ts` and `src/core/task/workflow-form/WorkflowFormRuntime.ts`, remove `buildPayload(...)` and any other payload-assembly ownership from `WorkflowFormRuntimeLike` and related workflow-form runtime contracts so no type surface continues advertising the removed API or the old ownership model.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`

[x] Subtask 4.6. In `src/core/task/workflow-runtime/WorkflowRuntime.ts` and `src/core/task/index.ts`, replace the live `render_workflow_start_card` entry-flow path with the mandatory shared pre-workflow entry `WorkflowForm` path. `WorkflowRuntime` must stop building `buildProjectSelectionStartCardSession(...)`, must stop sourcing entry behavior from `workflow.startCard.*`, and must instead assemble one two-panel `WorkflowForm` whose first panel is informational only and contains workflow-module-supplied informational content, and whose second panel is the runtime-owned shared project-selection panel.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 4.7. In `src/shared/ExtensionMessage.ts`, `proto/cline/task.proto`, `src/shared/proto/cline/task.ts`, `src/core/controller/task/submitWorkflowStartCard.ts`, `webview-ui/src/components/chat/ChatRow.tsx`, and `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`, delete the separate live workflow-start-card contract for workflow entry and replace it with the shared `WorkflowForm` contract and submission path for the two-panel entry flow, where panel 1 carries workflow-module-supplied informational content and panel 2 is the runtime-owned shared project-selection panel.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/proto/cline/task.proto`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/proto/cline/task.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/task/submitWorkflowStartCard.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`

[x] Subtask 4.8. In `src/core/task/workflow-start-card/types.ts`, `src/core/task/workflow-start-card/buildWorkflowStartCardPayload.ts`, and `src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts`, decouple or delete the legacy workflow-start-card surfaces so they are no longer part of the live foundational runtime dependency chain once the replacement entry `WorkflowForm` path is in place.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/buildWorkflowStartCardPayload.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts`

[x] Subtask 4.9. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`, `src/core/controller/task/__tests__/submitWorkflowStartCard.test.ts`, `webview-ui/src/components/chat/ChatRow.test.tsx`, and `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`, replace start-card-specific entry-flow assertions with coverage for the mandatory shared two-panel entry `WorkflowForm` and its normal workflow-form submission/result path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/task/__tests__/submitWorkflowStartCard.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`

### Phase 3.1 - Repository Health Cleanup Before Phase 4

Pause for QA review before moving to Phase 4.

This phase exists only to restore a commit-ready working tree after the approved Phase 1 through Phase 3 architecture changes. Do not implement any new Phase 4+ architecture here. Only delete or re-sync stale code, tests, and compile-time contracts that no longer match the current post-Phase-3 runtime surfaces.

[x] Task 4A. Delete orphaned legacy surfaces that are already out of scope and now block repository compilation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRenderer.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/placeholders.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/__tests__/ManagedWorkflowController.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/__tests__/ManagedWorkflowPhaseExtractor.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/managedWorkflowCoverage.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/workflows/brainstormingTechniqueLibrary.ts`

[x] Subtask 4A.1. Delete the orphaned `src/core/task/managed-workflows/*` package and its direct tests, plus `src/core/task/__tests__/managedWorkflowCoverage.test.ts`, instead of reviving the removed placeholder-era helper imports. These files no longer have surviving production importers outside their own legacy package and are already out of scope under the migration matrix, so this cleanup must remove them rather than reintroducing placeholder-era compatibility code.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRenderer.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/placeholders.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/__tests__/ManagedWorkflowController.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/managed-workflows/__tests__/ManagedWorkflowPhaseExtractor.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/managedWorkflowCoverage.test.ts`

[x] Subtask 4A.2. Delete `src/core/workflows/brainstormingTechniqueLibrary.ts` instead of restoring the missing `brainstormingSessionFiles` dependency. There are no surviving production importers of this loader in the current tree, so the cleanup must remove the orphaned file rather than reviving a dead helper seam.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/workflows/brainstormingTechniqueLibrary.ts`

[x] Task 4B. Re-sync stale compile-time contracts and test fixtures to the current post-Phase-3 runtime surface without introducing Phase 4+ behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/complete_workflow_item.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/SummarizeTaskHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/__tests__/index.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.responseToolFailureBudget.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`

[x] Subtask 4B.1. In `src/core/task/tools/autoApprove.ts`, delete references to retired tool ids that are no longer members of `ClineDefaultTool`. Do not restore deleted enum members; clean this policy surface so it references only the current shared tool set. The legacy `contextualToolMatrix.ts` source file is deleted under the Phase 5 runtime-projected tool-schema architecture, with reference material preserved only in `docs/workflows/workflow-runtime/workflow-modules/legacy-tool-matrix.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`

[x] Subtask 4B.2. In `src/core/prompts/system-prompt/tools/complete_workflow_item.ts` and `src/core/task/index.ts`, delete the stale `managedWorkflowActive` prompt-context contract. Replace tool gating with the currently supported workflow-activity indicator already present on `SystemPromptContext`, and remove the deleted `managedWorkflowActive` property from the `shouldUseContinuationTurnPrompt(...)` call site instead of reintroducing the retired field.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/complete_workflow_item.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 4B.3. In `src/core/task/index.ts`, align the `summarizeTask(...)` invocation with the current helper signature by passing only the supported `cwd` and multi-root arguments.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 4B.4. In `src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`, replace the invalid named `fs` import from `fs/promises` with the correct default import shape so the handler compiles against Node’s actual promise-fs export.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`

[x] Subtask 4B.5. In `src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`, replace the current module-namespace call with the established handler pattern already used by the other tool handlers: destructure `ToolHookUtils` from the dynamic import and call the static `ToolHookUtils.runPreToolUseIfEnabled(config, block)` method directly on the exported class instead of invoking `runPreToolUseIfEnabled(...)` on the module namespace object.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`

[x] Subtask 4B.6. In `src/core/task/tools/handlers/SummarizeTaskHandler.ts`, delete the stale `lastPromptedPlaceholderWorkflowChecklistLabel` reads and writes instead of reviving that removed placeholder-workflow task-state field or its persisted metadata copy.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/SummarizeTaskHandler.ts`

[x] Subtask 4B.7. In `src/core/slash-commands/__tests__/index.test.ts`, replace the stale `WorkflowDefinition` / `WorkflowStepDefinition` fixture shape (`startCard`, `allowWorkflowProgressRequest`) with the current post-Phase-3 workflow contract (`entryPanel`, `decisionTree`, and any other now-required fields).

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/__tests__/index.test.ts`

[x] Subtask 4B.8. In `src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts` and `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, replace the removed `startCardSession` workflow UI fixture shape with the current `WorkflowUiSessionState` / `ActiveWorkflowSession` contract, including the required post-Phase-3 branch context.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 4B.9. In `src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts`, `src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts`, and `src/core/task/__tests__/ToolExecutor.responseToolFailureBudget.test.ts`, update `ToolExecutor` construction to the current parameter order, including the `workflowRuntime` slot that now precedes `cwd`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.responseToolFailureBudget.test.ts`

[x] Subtask 4B.10. In `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`, replace direct assertions against real function-typed `TaskConfig` fields with typed Sinon stubs/spies so the test matches the current callback/runtime types without unsafe assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

[x] Subtask 4B.11. In `src/core/prompts/system-prompt/__tests__/spec.test.ts`, delete the stale unused imports that now fail lint after the Phase 3.1 contract cleanup. Do not broaden this into Phase 5 prompt-surface behavior changes; this subtask is only for restoring a clean, committable tree before Phase 4.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`

Historical note:
- The earlier narrow snapshot-refresh carve-out for `integration.test.ts` was incorrect.
- Remaining prompt-system snapshot/spec drift belongs to Phase 5 Task 6 because it touches runtime-owned prompt assembly, response-tool visibility, workflow override visibility, `agent_feedback`, and `task_progress` prompt/schema behavior.

Phase 3.1 QA validation:

```bash
npm run check-types
npm run test
```

Validation note:
- If `npm run test` first fails in the prompt-system surfaces reserved for Phase 5 (`src/core/prompts/system-prompt/__tests__/integration.test.ts`, `spec.test.ts`, `response_tools.test.ts`, `contextualNativeToolFilter.test.ts`, or touched prompt snapshots), stop and defer there rather than mutating prompt behavior or baselines during Phase 3.1.

### Phase 4 - Generic Branch-Action Execution And Failure Handling

Pause for QA review before moving to Phase 5.

[x] Task 5. Remove legacy deterministic step-resolution as a special feature and make tool invocation a generic runtime-owned branch action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts`

[x] Subtask 5.1. In `src/core/task/workflow-runtime/types.ts` and `src/core/task/workflow-step-resolution/types.ts`, delete `run_deterministic_operation`, `stepResolutionDefinitionId`, `WorkflowStepResolutionDefinition`, `WorkflowStepResolutionToolExecutionRequest`, and the other deterministic-only contracts from the workflow-runtime model.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/types.ts`

[x] Subtask 5.1a. In `src/core/task/workflow-runtime/types.ts`, add the missing workflow artifact contract required by runtime-owned document generation: define `WorkflowArtifactDefinition` with the approved generated-document fields and add `artifacts?: Record<string, WorkflowArtifactDefinition>` to `WorkflowDefinition` so `documentBuilders` can resolve canonical artifact metadata by `artifactId` instead of inventing path rules inside `WorkflowRuntime`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 5.1b. In `src/core/task/workflow-runtime/WorkflowRuntime.ts` and `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, implement and cover the missing runtime-owned `resolveWorkflowArtifactPath(...)` seam so the runtime can derive canonical absolute artifact destinations from the active workflow definition’s `projectSubfolder`, artifact `relativePathPattern`, and collision strategy before any `build_workflow_document` branch action is assembled.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 5.1c. In `src/core/task/workflow-step-resolution/WorkflowStepResolutionRuntime.ts` and `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts`, replace the deleted `WorkflowStepResolutionDefinition` helper contract with the surviving `WorkflowBranchActionDefinition` contract so the interim status/runtime helper compiles and operates against the post-`5.1` branch-action surface until Subtask `5.5` deletes it.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts`

[x] Subtask 5.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts` and `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, replace stale `run_deterministic_operation` / `stepResolutionDefinitions` / deterministic-trigger handling with generic branch-action execution built on `execute_branch_action`, `branchActionDefinitions`, and `branch_action_succeeded` / `branch_action_failed` trigger semantics. This subtask must build a normal tool request for any runtime-prescribed branch action, including `build_workflow_document` payloads derived from workflow-module document-builder definitions plus the runtime-owned artifact definitions / `resolveWorkflowArtifactPath(...)` seam added in Subtasks `5.1a` and `5.1b`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 5.3. In `src/core/task/index.ts`, replace special `run_deterministic_operation` consumption with generic consumption of runtime-owned tool execution actions through the shared tool executor pathway. While Subtask `5.5` has not yet deleted `WorkflowStepResolutionRuntime`, preserve use of the surviving helper only for rendering the interim branch-action status payload when a branch-action session exists; do not preserve deterministic-only next-action kinds or routing. When `consumeWorkflowNextAction()` receives `nextAction.kind === "terminal_error"`, it must not silently return: it must first persist workflow runtime metadata through the existing `persistWorkflowRuntimeMetadata()` seam, then surface the final workflow failure through the repo’s established user-visible task error path by calling `await this.say("error", nextAction.errorMessage)`, and only then return/end that workflow action loop.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 5.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts` and `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, persist branch-action success and failure context in workflow session state, route branch-action failures through shared runtime diagnostics/error handling, and re-evaluate the same decision tree after each result so retry or terminal-error behavior occurs only when the matched branch prescribes it.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 5.5. In `src/core/task/workflow-step-resolution/WorkflowStepResolutionRuntime.ts`, `src/core/task/index.ts`, `src/core/task/workflow-runtime/WorkflowRuntime.ts`, `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts`, and `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, delete the legacy helper/runtime once `WorkflowRuntime` owns the surviving branch-action tracking, remove the remaining production imports/calls from `index.ts` and `WorkflowRuntime.ts`, and move the replacement coverage into `WorkflowRuntime.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/WorkflowStepResolutionRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

### Phase 5 - Runtime-Owned Prompt Variant Assembly And Workflow-Specific Tool Projection

Pause for QA review before moving to Phase 6.

[x] Task 6. Replace passthrough prompt projection with runtime-owned prompt assembly and full module-derived per-turn tool-schema projection.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/__tests__/index.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/workflow_system_instructions.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/workflow_input.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/init.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/workflow_progress_request.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/complete_workflow_item.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/spec.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/config.template.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/*`

[x] Subtask 6.1. In `src/core/task/workflow-runtime/types.ts`, replace the thin `WorkflowPromptProjection` contract with a five-artifact runtime projection contract: full-turn system block, full-turn input block, full module-derived per-turn tool schema override that defines the entire tool surface for that turn, continuation-turn system block, and continuation-turn input block.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 6.2. In `src/core/task/workflow-runtime/types.ts`, narrow the workflow-module contract so workflow steps provide per-step prompt source plus a complete per-step tool-schema source/matrix rather than already-assembled runtime prompt blocks or special-purpose tool override seams. Delete the separate `WorkflowSetWorkflowValuesOverrideSelection` / `setWorkflowValuesToolOverride` architecture instead of preserving a dedicated `set_workflow_values` mechanism outside the full module-derived per-step tool schema.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 6.2a. In `src/core/slash-commands/__tests__/index.test.ts`, update the downstream `WorkflowDefinition` / `WorkflowStepDefinition` fixture to the post-`6.2` module contract by replacing the removed `buildPromptProjection(...)` property with the surviving `buildPromptSource(...)` shape and adding any now-required per-step tool-schema source/matrix fields, without broadening the test beyond fixture-contract alignment.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/__tests__/index.test.ts`

[x] Subtask 6.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, `src/core/task/index.ts`, `src/core/task/tools/subagent/SubagentRunner.ts`, and `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, rewrite `buildTurnProjection()` production and consumption so the runtime assembles both workflow prompt variants and the full tool schema override for the active step from workflow-module prompt content, workflow-module per-step tool-schema source/matrix, and runtime/session state. This subtask must delete the current partial-schema construction built around `setWorkflowValuesToolOverride` plus ad hoc `workflow_progress_request` injection and replace it with the authoritative full per-turn schema for the active step. It must also gate `## WORKFLOW PERSONA` to the first task request only by using the existing first-turn indicator already present in task/subagent state (`apiRequestCount === 1`), so persona appears on the first workflow turn but not on later full-prompt refresh turns. Update the Task 6 runtime/subagent tests to prove persona appears on the first turn and does not reappear on later full-turn refreshes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 6.4. In `src/core/prompts/system-prompt/types.ts`, `src/core/prompts/system-prompt/components/workflow_system_instructions.ts`, `src/core/prompts/system-prompt/components/workflow_input.ts`, `src/core/prompts/system-prompt/components/continuation_turn.ts`, `src/core/prompts/system-prompt/registry/ClineToolSet.ts`, and `src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts`, consume the new projection contract so the system-prompt machinery selects the appropriate runtime-projected prompt variant and treats the runtime-projected full tool schema override as the authoritative per-turn tool surface, not as an additive workflow-only overlay or partial special-case list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/workflow_system_instructions.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/workflow_input.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts`

[x] Subtask 6.5. In `src/core/prompts/system-prompt/tools/init.ts`, `src/core/prompts/system-prompt/tools/index.ts`, `src/core/prompts/system-prompt/tools/set_workflow_values.ts`, `src/core/prompts/system-prompt/tools/workflow_progress_request.ts`, `src/core/prompts/system-prompt/tools/complete_workflow_item.ts`, `src/core/prompts/system-prompt/components/response_tools.ts`, `src/core/prompts/system-prompt/spec.ts`, `src/core/prompts/system-prompt/variants/config.template.ts`, and every affected prompt variant config, remove static workflow-specific tool exposure, response-tool copy, native-schema references, and any remaining dedicated `set_workflow_values` override architecture so the only workflow-owned tool surface is the full module-derived per-turn schema projected by `WorkflowRuntime`. This includes deleting the remaining standalone static `set_workflow_values` schema path, deleting the remaining standalone static `workflow_progress_request` module/schema path, and removing their barrel exports from `tools/index.ts` instead of leaving those tools defined outside runtime-projected module schemas.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/init.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/set_workflow_values.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/workflow_progress_request.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/complete_workflow_item.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/spec.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/config.template.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts`

[x] Subtask 6.6. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, `src/core/prompts/system-prompt/__tests__/spec.test.ts`, `src/core/prompts/system-prompt/__tests__/response_tools.test.ts`, and the touched prompt snapshots, replace the single-projection assertions with coverage that proves runtime-owned full-turn / continuation-turn prompt assembly, full module-derived per-step tool-schema projection, authoritative per-turn schema replacement behavior, native-schema compaction alignment, first-turn-only persona projection, and the absence of the old partial two-tool override architecture. Remove any direct tests/imports of the deleted standalone `set_workflow_values` / `workflow_progress_request` prompt-tool schema paths. Do not recreate or depend on the deleted legacy `contextualNativeToolFilter.test.ts` suite.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/*`

### Phase 6 - Legacy Workflow Surface Deletion And Foundational Cleanup

Pause for QA review before final validation.

[x] Task 7. Delete the remaining legacy workflow surfaces that the foundational migration matrix does not preserve.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/file-utils.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/prompts.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/bmad/syncBundledBmadAssetsToWorkspace.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/bmad/syncBundledBmadAssetsToWorkspace.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/extension.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tokenUsageLogging.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/tokenUsageLogging.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/ActModeRespondHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/AskFollowupQuestionToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/PlanModeRespondHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UseMcpToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/test/hook-executor.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/test/core/controller/marketplace-filtering.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/test/host-provider-test-utils.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/package.json`
- `/Users/robertboston/Documents/Cline Extension/cline/scripts/package-standalone.mjs`
- `/Users/robertboston/Documents/Cline Extension/cline/scripts/package-vsix-with-managed-workflow-verification.mjs`
- `/Users/robertboston/Documents/Cline Extension/cline/scripts/generate-managed-workflows.mjs`
- `/Users/robertboston/Documents/Cline Extension/cline/scripts/audit-managed-workflow-extraction.mjs`
- `/Users/robertboston/Documents/Cline Extension/cline/scripts/verify-managed-workflow-assets.mjs`
- `/Users/robertboston/Documents/Cline Extension/cline/scripts/managed-workflows.shared.mjs`
- `/Users/robertboston/Documents/Cline Extension/cline/scripts/build-tests.js`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/README.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/use_skill.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/access_mcp_resource.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/act_mode_respond.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/apply_patch.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/ask_followup_question.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/list_code_definition_names.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/list_files.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/read_file.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/read_file_range.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/replace_in_file.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/search_files.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/send_user_message.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/use_mcp_tool.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/web_fetch.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/web_search.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/write_to_file.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/hermes/overrides.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/glm/overrides.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/spec.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/build-story-document.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/prepare-brainstorming-session.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/*`

[x] Subtask 7.1. In `src/core/task/index.ts`, delete the focus-chain markdown file watcher startup block at the current `Task` constructor lines `902` through `907`, including the call to `this.FocusChainManager.setupFocusChainFileWatcher()`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.1a. In `src/core/task/focus-chain/index.ts`, delete the markdown file watcher implementation by removing the `chokidar` import, the `focusChainFileWatcher` field, the `fileUpdateDebounceTimer` field, `setupFocusChainFileWatcher()`, `updateFCListFromMarkdownFileAndNotifyUI()`, and the watcher/debounce cleanup from `dispose()`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/index.ts`

[x] Subtask 7.1b. In `src/core/task/focus-chain/index.ts`, delete the markdown file storage path by removing the `fs`, `path`, `writeFile`, `ensureTaskDirectoryExists`, `createFocusChainMarkdownContent`, `extractFocusChainListFromText`, `FocusChainStorageIdentity`, and `getFocusChainFilePath` imports/usages; remove `focusChainStorageTaskId`, `focusChainStorageIdentity`, and `focusChainDocumentLabel` from `FocusChainDependencies`, class fields, and constructor assignment; and delete `resolveFocusChainFilePath()`, `removeFocusChainFileFromDisk()`, `readFocusChainFromDisk()`, and `writeFocusChainToDisk()`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/index.ts`

[x] Subtask 7.1c. In `src/core/task/focus-chain/index.ts`, rewrite `refreshWorkflowChecklistProjection()` and `clearChecklistProjection()` so they update only in-memory task state and call `postStateToWebview()`: `refreshWorkflowChecklistProjection()` must trim `taskState.currentFocusChainChecklist` when present and must not write files or call `say("task_progress", ...)`; `clearChecklistProjection()` must clear `taskState.currentFocusChainChecklist`, `todoListWasUpdatedByUser`, and `apiRequestsSinceLastTodoUpdate` and must not delete files.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/index.ts`

[x] Subtask 7.1d. In `src/core/task/focus-chain/index.ts` and `src/core/task/focus-chain/prompts.ts`, remove the legacy non-workflow `task_progress` prompt path: `getFocusChainInstructionsDecision()` and `shouldIncludeFocusChainInstructions()` must include focus-chain instructions only when `hasActiveWorkflow()` is true; `generateFocusChainInstructions()` must return workflow status only for active workflows and return an empty string when no workflow is active; remove the `FocusChainPrompts` import; delete `src/core/task/focus-chain/prompts.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/prompts.ts`

[x] Subtask 7.1e. In `src/core/task/focus-chain/index.ts`, rewrite `updateFCListFromToolResponse(...)` so it no longer parses or accepts `task_progress` as a focus-chain mutation channel: when a workflow is active, call `refreshWorkflowChecklistProjection()` and return `{ accepted: true }`; when no workflow is active, return `{ accepted: true }` without mutating focus-chain state, reading files, writing files, emitting `task_progress`, or evaluating checklist-shape changes; remove the now-unused `evaluateFocusChainChecklistUpdate` and `buildFocusChainChecklistRejectionFeedback` imports.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/index.ts`

[x] Subtask 7.1e1. Delete `src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts` entirely. This test file validates retired generic `task_progress` focus-chain mutation/rejection behavior and must not be remapped to runtime-owned workflow focus-chain projection.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts`

[x] Subtask 7.1f. In `src/core/task/tools/subagent/SubagentRunner.ts`, remove the subagent markdown-storage plumbing for focus chain by deleting the `ulid` import if it is only used for `subagentFocusChainStorageKey`, the `subagentFocusChainStorageKey` field, `ensureSubagentFocusChainStorageKey()`, the storage-key creation in `getOrCreateSubagentFocusChainManager(...)`, and the `focusChainStorageTaskId`, `focusChainStorageIdentity`, and `focusChainDocumentLabel` arguments passed to `new FocusChainManager(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 7.1g. In `src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts`, replace the file-backed assertions with runtime-projection assertions: remove imports/usages of `fs`, `os`, `path`, `disk.ensureTaskDirectoryExists`, and `getFocusChainFilePath`; assert that active workflow checklist/status projection updates `taskState.currentFocusChainChecklist`, posts state to the webview, does not call `say("task_progress", ...)`, and clears in-memory workflow-owned focus-chain state after workflow teardown.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts`

[x] Subtask 7.1h. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, remove the subagent focus-chain markdown-storage tests and imports: delete the `getFocusChainFilePath` import, delete `getSubagentFocusChainStorageKey(...)`, and replace the two tests currently named `routes subagent task_progress updates to subagent-local focus chain storage instead of the parent callback` and `uses distinct subagent-local focus-chain storage keys across multiple subagent runs` with coverage that subagent focus-chain callbacks do not write markdown files and do not call the parent callback.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 7.1i. Delete `src/core/task/focus-chain/file-utils.ts` after Subtasks 7.1b, 7.1g, and 7.1h remove all live imports of its markdown-file and checklist-mutation helpers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/file-utils.ts`

[x] Subtask 7.1j. In `src/core/task/index.ts`, delete the constructor-time focus-chain initialization block that reads `focusChainSettings` and assigns `this.FocusChainManager = new FocusChainManager(...)`. `Task` construction must not create a focus-chain manager from global focus-chain settings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.1k. In `src/core/task/index.ts`, add a private `getActiveWorkflowFocusChainManager(): FocusChainManager | undefined` helper. If `this.taskState.activeWorkflowName` is absent, the helper must call `this.FocusChainManager?.dispose()`, assign `this.FocusChainManager = undefined`, and return `undefined`. When `this.taskState.activeWorkflowName` is present, the helper must create `this.FocusChainManager` if needed using the same `FocusChainManager` constructor dependencies that were previously used in the constructor, then return it.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.1l. In `src/core/task/index.ts`, update the `ToolExecutor` `updateFCListFromToolResponse` callback so it calls `getActiveWorkflowFocusChainManager()` and returns `{ accepted: true }` without routing through focus chain when that helper returns `undefined`; otherwise call the returned manager's `updateFCListFromToolResponse(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.1m. In `src/core/task/index.ts`, update prompt assembly so focus-chain decision, instruction generation, and instruction injection use a local `const focusChainManager = this.getActiveWorkflowFocusChainManager()` result instead of `this.FocusChainManager`. When the helper returns `undefined`, prompt assembly must not call focus-chain decision or instruction methods.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.1n. In `src/core/task/index.ts`, update the task completion `checkIncompleteProgressOnCompletion(...)` block so it uses `const focusChainManager = this.taskState.activeWorkflowName ? this.FocusChainManager : undefined` and calls `focusChainManager.checkIncompleteProgressOnCompletion(currentModelId, currentProvider)` only when that local exists. Do not call `getActiveWorkflowFocusChainManager()` from this completion cleanup block.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.1n1. In `src/core/task/index.ts`, update final task cleanup so it calls `this.FocusChainManager?.dispose()` and then assigns `this.FocusChainManager = undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.1o. In `src/core/task/tools/subagent/SubagentRunner.ts`, delete the `FocusChainManager` import, `subagentFocusChainManager` field, `subagentFocusChainState` field, `getOrCreateSubagentFocusChainManager(...)` method, and reset/dispose assignments for those fields. Subagent execution must not instantiate `FocusChainManager`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 7.1p. In `src/core/task/tools/subagent/SubagentRunner.ts`, remove the local `focusChainManager` from `createSubagentTaskConfig(...)` and replace the subagent `updateFCListFromToolResponse` callback with `async () => ({ accepted: true })`. Subagents must not mutate focus-chain state.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 7.1q. In `src/core/task/tools/subagent/SubagentRunner.ts`, update `buildSubagentPromptInjectionBlocks(...)` by deleting the `FocusChainManager` call path and returning no focus-chain prompt additions. Keep child workflow prompt content sourced from the existing `WorkflowRuntime.buildTurnProjection(...)` call in `buildPromptContext(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 7.1r. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, delete tests, fixtures, helper functions, and assertions whose only purpose is to verify subagent-local focus-chain managers, subagent focus-chain storage, or subagent focus-chain prompt instructions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 7.1s. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add or update the subagent task-config callback assertion so `updateFCListFromToolResponse(...)` resolves to `{ accepted: true }` and does not call the parent `updateFCListFromToolResponse` callback.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 7.1t. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add or update prompt-context assertions so child workflow prompt content is verified through `WorkflowRuntime.buildTurnProjection(...)` output rather than focus-chain generated instructions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 7.2a. Delete `src/shared/build-story-document.ts` entirely. This file is a Module Build-only `create-story` Step 2 helper and must not remain in the foundational runtime cleanup surface.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/build-story-document.ts`

[x] Subtask 7.2b. Delete `src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts` entirely. This file is a removed Brainstorming module workflow handler shim and must not remain as foundational runtime-adjacent code.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts`

[x] Subtask 7.2c. Delete `src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts` entirely after Subtask `7.2b` deletes the handler it imports.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts`

[x] Subtask 7.2d. In `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`, delete only the static workflow-value dictionary wrapper surface: remove `workflowValueToolDictionaryConfig`, `WORKFLOW_FORM_TOOL_DICTIONARY_HEADING`, `WORKFLOW_FORM_RUNTIME_TOOL_REFERENCE_TITLE`, `buildWorkflowStartRuntimeToolDictionary(...)`, `buildToolDictionaryMarkdown()`, and `buildRuntimeToolDictionaryMarkdown()`. Keep `WorkflowFormToolDictionaryContractConfig`, `buildToolDictionaryMarkdownFromConfig(...)`, `buildRuntimeToolDictionaryMarkdownFromConfig(...)`, `TOOL_DICTIONARY_TERM_KEYS`, and `isWorkflowFormSystemDictionaryKey(...)` unchanged so callers can still render dictionaries from an explicitly supplied tool config.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`

[x] Subtask 7.2e. In `src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts`, remove imports and assertions for `buildToolDictionaryMarkdown`, `buildRuntimeToolDictionaryMarkdown`, `buildWorkflowStartRuntimeToolDictionary`, `WORKFLOW_FORM_TOOL_DICTIONARY_HEADING`, and static `set_workflow_values` dictionary output. Replace them with config-driven assertions that call `buildToolDictionaryMarkdownFromConfig(...)` and `buildRuntimeToolDictionaryMarkdownFromConfig(...)` using an explicit `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT` config, and assert the rendered markdown includes the `## build_workflow_document` heading plus the `artifact_id`, `destination_path`, and `content` parameter rows while the runtime markdown omits `# Workflow UI Surface Tool Dictionary`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts`

[x] Subtask 7.2f. In `src/core/task/workflow-form/dictionaries/systemDictionary.ts`, delete the Module Build-only workflow-start dictionary surface by removing `WORKFLOW_START_SYSTEM_DICTIONARY_KEYS`, removing its spread from `WORKFLOW_FORM_SYSTEM_DICTIONARY_KEYS`, and deleting the matching dictionary entries from `agent_party` through `workflow_status`. Keep `PHASE_1_SYSTEM_DICTIONARY_KEYS`, `WORKFLOW_FORM_SYSTEM_DICTIONARY_KEYS`, `WorkflowFormSystemDictionaryKey`, `workflowFormSystemDictionary`, and `renderSystemDictionaryMarkdown()` limited to the surviving Phase 1 dictionary keys.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts`

[x] Subtask 7.3. In `src/core/task/tools/autoApprove.ts`, `src/core/prompts/system-prompt/tools/README.md`, `docs/system-prompt-tool-reference.md`, `src/core/prompts/system-prompt/__tests__/integration.test.ts`, and the touched prompt snapshots, delete references to retired legacy workflow bundle ids, deleted workflow document tools, `set_workflow_placeholders`, `build_review_diff_output`, `.cline/workflow-config.yaml`, and any other workflow contract already retired by the approved migration matrix so the runtime, tests, and canonical prompt-tool inventories stay aligned.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/README.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/*`

[x] Subtask 7.4. In `src/core/task/index.ts`, remove the unused `resolveWorkflowDefinition` named import from the `@/core/task/workflow-runtime/WorkflowRegistry` import so lint no longer fails on a dead Phase 6 import.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.4a. In `src/core/task/focus-chain/index.ts`, delete `consumeCurrentPlaceholderWorkflowStepPromptForInput(...)` and delete the private `clearWorkflowPromptState()` helper it calls. Do not delete or modify `activeStoryTaskId`, `activeStorySubtaskIds`, or `lastPromptedStoryTaskKey` fields in this subtask.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/index.ts`

[x] Subtask 7.4b. In `src/core/task/index.ts`, remove the `loadContext` prompt-injection block that calls `this.FocusChainManager?.consumeCurrentPlaceholderWorkflowStepPromptForInput(...)`, including the surrounding `previousActiveStoryTaskId`, `previousActiveStorySubtaskIds`, `previousLastPromptedStoryTaskKey`, `currentStepInputPrompt`, `didPromptStateChange`, and `persistActiveStoryTaskPromptState()` logic that exists only for that deleted hook. Do not delete `persistActiveStoryTaskPromptState()` or the story prompt-state metadata fields in this subtask.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.4c. In `src/core/task/focus-chain/index.ts`, rename `refreshManagedWorkflowChecklistProjection()` to `refreshActiveWorkflowChecklistProjection()`. Keep `refreshWorkflowChecklistProjection()` private. In the renamed method, call private `clearChecklistProjection()` directly when no workflow is active; otherwise call private `refreshWorkflowChecklistProjection()`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/index.ts`

[x] Subtask 7.4c1. In `src/core/task/focus-chain/index.ts`, rename `refreshPlaceholderWorkflowChecklistProjection(...)` to `refreshActiveWorkflowChecklistProjectionIfActive(...)`. Keep `refreshWorkflowChecklistProjection()` private. In the renamed method, return without mutation when no workflow is active; otherwise call private `refreshWorkflowChecklistProjection()`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/index.ts`

[x] Subtask 7.4d. In `src/core/task/focus-chain/index.ts`, delete the public `clearManagedWorkflowChecklistProjection()` and `clearPlaceholderWorkflowChecklistProjection()` wrappers after Subtasks `7.4c` and `7.4c1` remove their only required internal call paths.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/index.ts`

[x] Subtask 7.4e. In `src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts`, update the focus-chain projection tests to call `refreshActiveWorkflowChecklistProjection()` and `refreshActiveWorkflowChecklistProjectionIfActive(...)` instead of the retired managed/placeholder method names, without changing the tested runtime/in-memory behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts`

[x] Subtask 7.5. In `src/core/prompts/system-prompt/types.ts`, delete the `TASK_PROGRESS_PARAMETER` export entirely, including its `FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL`-based instruction text, so generic prompt/native tool schemas no longer have a shared `task_progress` parameter source.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/types.ts`

[x] Subtask 7.6. In `src/core/prompts/system-prompt/tools/access_mcp_resource.ts`, `src/core/prompts/system-prompt/tools/apply_patch.ts`, `src/core/prompts/system-prompt/tools/ask_followup_question.ts`, `src/core/prompts/system-prompt/tools/list_code_definition_names.ts`, `src/core/prompts/system-prompt/tools/list_files.ts`, `src/core/prompts/system-prompt/tools/read_file.ts`, `src/core/prompts/system-prompt/tools/read_file_range.ts`, `src/core/prompts/system-prompt/tools/replace_in_file.ts`, `src/core/prompts/system-prompt/tools/search_files.ts`, `src/core/prompts/system-prompt/tools/send_user_message.ts`, `src/core/prompts/system-prompt/tools/use_mcp_tool.ts`, `src/core/prompts/system-prompt/tools/web_fetch.ts`, `src/core/prompts/system-prompt/tools/web_search.ts`, and `src/core/prompts/system-prompt/tools/write_to_file.ts`, remove every `TASK_PROGRESS_PARAMETER` import and every `TASK_PROGRESS_PARAMETER` parameter entry from prompt/native tool specs.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/access_mcp_resource.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/apply_patch.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/ask_followup_question.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/list_code_definition_names.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/list_files.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/read_file.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/read_file_range.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/replace_in_file.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/search_files.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/send_user_message.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/use_mcp_tool.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/web_fetch.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/web_search.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/write_to_file.ts`

[x] Subtask 7.6a. In `src/core/prompts/system-prompt/tools/access_mcp_resource.ts`, remove the prompt-text `task_progress` parameter description and `<task_progress>...</task_progress>` example block so this tool no longer exposes non-workflow task-progress instructions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/access_mcp_resource.ts`

[x] Subtask 7.6b. In `src/core/prompts/system-prompt/tools/use_mcp_tool.ts`, remove the conditional prompt-text `task_progress` parameter description and `<task_progress>...</task_progress>` example block so `focusChainSettings.enabled` no longer exposes non-workflow task-progress instructions through this tool.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/use_mcp_tool.ts`

[x] Subtask 7.6c. In `src/core/prompts/system-prompt/tools/write_to_file.ts`, remove the conditional prompt-text `task_progress` parameter description and `<task_progress>...</task_progress>` example block so `focusChainSettings.enabled` no longer exposes non-workflow task-progress instructions through this tool.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/write_to_file.ts`

[x] Subtask 7.7. In `src/core/prompts/system-prompt/tools/act_mode_respond.ts`, remove the `task_progress` documentation line, usage example tag, and native parameter entry so `act_mode_respond` exposes only the surviving `response` parameter.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/act_mode_respond.ts`

[x] Subtask 7.8. In `src/core/prompts/system-prompt/__tests__/spec.test.ts`, update the test currently named `includes task_progress in send_user_message native schemas for normal non-deterministic contexts` so it asserts the `send_user_message` native schema does not expose a `task_progress` property.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`

[x] Subtask 7.8a. In `src/core/prompts/system-prompt/__tests__/spec.test.ts`, update the test currently named `compacts native GPT tool descriptions and task_progress parameter text in minimal GPT mode` so its mocked native-tool fixture no longer includes a `task_progress` parameter and its assertions verify the compacted/minimal native schema does not include `task_progress`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`

[x] Subtask 7.9. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, delete the prompt-normalization exceptions that specifically preserve `task_progress` preamble, format, sentinel, and `__COMPLETE_NEXT_STEP__` lines.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 7.9a. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, remove the context-specific feature-test case named `TODO content when focus chain is enabled` because non-workflow focus-chain/TODO prompt content is retired.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 7.9b1. In `src/core/prompts/system-prompt/variants/hermes/overrides.ts`, delete every `<task_progress>...</task_progress>` example line from the Hermes override text. Do not replace it with another progress/checklist example.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/hermes/overrides.ts`

[x] Subtask 7.9b2. In `src/core/prompts/system-prompt/variants/glm/overrides.ts`, delete every `<task_progress>...</task_progress>` example line from the GLM override text. Do not replace it with another progress/checklist example.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/glm/overrides.ts`

[x] Subtask 7.9b3. In `src/core/prompts/system-prompt/spec.ts`, delete the compact native-tool parameter branch `if (param.name === "task_progress") { ... }` from `getNativeToolParameterDescription(...)`. Do not replace it with another task-progress fallback description.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/spec.ts`

[x] Subtask 7.9b. In touched system-prompt snapshot files, remove stale snapshot output for generic/non-workflow `task_progress` prompt/native exposure while preserving runtime-owned workflow prompt projection snapshot content.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/*`

[x] Subtask 7.10. In `src/extension.ts`, remove the `syncBundledBmadAssetsToWorkspace` import and delete the startup call that syncs bundled BMAD assets into the workspace. Do not replace it with another workflow/BMAD asset sync path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/extension.ts`

[x] Subtask 7.11. Delete `src/core/bmad/syncBundledBmadAssetsToWorkspace.ts` entirely after Subtask `7.10` removes the startup importer.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/bmad/syncBundledBmadAssetsToWorkspace.ts`

[x] Subtask 7.12. Delete `src/core/bmad/syncBundledBmadAssetsToWorkspace.test.ts` entirely after Subtask `7.11` deletes the sync helper it imports.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/bmad/syncBundledBmadAssetsToWorkspace.test.ts`

[x] Subtask 7.13. Delete `src/shared/prepare-brainstorming-session.ts` entirely. This file is a brainstorming-specific shared helper with legacy `brainstorming.md` step gating and must not remain as a foundational shared runtime surface.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/prepare-brainstorming-session.ts`

[x] Subtask 7.14. In `src/core/task/index.ts`, delete the `const shouldIncludeBmadPromptContext = shouldSendFullPromptAssembly` alias and change the `promptSkills` assignment in prompt assembly to use `shouldSendFullPromptAssembly` directly: when true, pass only `availableSkills` into `buildPromptSkillScope(...)`; when false, keep `promptSkills` as `[]`. Do not introduce a replacement alias for this condition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.14a. In `src/core/task/index.ts`, remove the now-unused `getWorkflowSkillMetadata` named import from the `@/core/task/workflow-runtime/WorkflowRegistry` import after Subtask `7.14` removes the main-task prompt-visible workflow metadata merge.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.14b. In `src/core/task/index.ts`, delete the private `mergePromptSkillEntries(skills: SkillMetadata[], workflows: SkillMetadata[]): SkillMetadata[]` method after Subtask `7.14` removes its only main-task call site.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.14c. In `src/core/task/index.ts`, verify the BMAD prompt-context alias is fully removed by searching this file for `shouldIncludeBmadPromptContext` and `BmadPromptContext`; if either string still appears, delete the remaining reference or stop if the remaining reference cannot be removed within this file.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.15. In `src/core/task/tools/subagent/SubagentRunner.ts`, replace the `availableSkills` assignment that currently calls `this.mergePromptSkillEntries(getAvailableSkills(discoveredSkills), getWorkflowSkillMetadata())` with a direct `getAvailableSkills(discoveredSkills)` assignment so subagent prompt-visible skill context contains only discovered skills.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 7.15a. In `src/core/task/tools/subagent/SubagentRunner.ts`, remove the now-unused `getWorkflowSkillMetadata` named import from the `@/core/task/workflow-runtime/WorkflowRegistry` import while retaining `resolveWorkflowByUseSkillName`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 7.15b. In `src/core/task/tools/subagent/SubagentRunner.ts`, delete the private `mergePromptSkillEntries(skills: SkillMetadata[], workflows: SkillMetadata[]): SkillMetadata[]` method after Subtask `7.15` removes its only subagent prompt-skill call site.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 7.15c. In `src/core/task/index.ts`, add the `TaskMetadata` type import from `@/core/context/context-tracking/ContextTrackerTypes` so the metadata restore helpers added in Subtasks `7.16` and `7.16a` compile without unsafe type assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.16. In `src/core/task/index.ts`, replace `restoreBmadStateFromMetadata()` with a new private `restoreActiveStoryPromptStateFromMetadata(metadata: TaskMetadata): void` helper that assigns only `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey` from the provided metadata object to `this.taskState`; do not include workflow-runtime state or persistence calls in this helper.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.16a. In `src/core/task/index.ts`, add a new private `restoreWorkflowRuntimeStateFromMetadata(metadata: TaskMetadata): Promise<void>` helper that assigns `this.taskState.activeWorkflowName = metadata.activeWorkflowName`, calls `this.workflowRuntime.restorePersistedSession({ taskState: this.taskState, persistedSession: metadata.activeWorkflowSession })`, and preserves the existing stale-session cleanup branch that clears and saves metadata when `metadata.activeWorkflowName` exists without `metadata.activeWorkflowSession`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.16b. In `src/core/task/index.ts`, update the resume initialization call site that currently calls `await this.restoreBmadStateFromMetadata()` so it reads task metadata once, calls `restoreActiveStoryPromptStateFromMetadata(metadata)`, then awaits `restoreWorkflowRuntimeStateFromMetadata(metadata)`. Preserve the existing non-fatal `try/catch` behavior around metadata restore.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.16c. In `src/core/task/index.ts`, delete the old `restoreBmadStateFromMetadata()` method after Subtasks `7.16` through `7.16b` move its surviving behavior into the two non-BMAD helpers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 7.17. In `src/core/task/tokenUsageLogging.ts`, delete the `managedWorkflow` property from `RequestTokenEstimate.systemSections`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tokenUsageLogging.ts`

[x] Subtask 7.17a. In `src/core/task/tokenUsageLogging.ts`, delete the `extractManagedWorkflow(prompt: string): string` helper that parses `<active_bmad_workflow>`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tokenUsageLogging.ts`

[x] Subtask 7.17b. In `src/core/task/tokenUsageLogging.ts`, delete the `managedWorkflowTokens` local variable from `estimateRequestTokenUsage(...)` and remove the returned `managedWorkflow: managedWorkflowTokens` entry from `systemSections`; keep `skills` and `toolUse` token accounting unchanged.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tokenUsageLogging.ts`

[x] Subtask 7.17c. In `src/core/task/__tests__/tokenUsageLogging.test.ts`, remove the `<active_bmad_workflow ...>` fixture block from the first test's `systemPrompt` string and delete the assertion against `estimate.systemSections.managedWorkflow`; keep the existing assertions for `estimatedTotal`, `systemPrompt`, `systemSections.toolUse`, `systemSections.skills`, and history buckets.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/tokenUsageLogging.test.ts`

[x] Subtask 7.18. In `src/core/prompts/system-prompt/tools/use_skill.ts`, update the `generic.description` string by removing the phrase `managed workflow` so the first sentence reads `Load and activate a skill or workflow by name.` Preserve the rest of the description except for grammar required by that phrase removal.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/use_skill.ts`

[x] Subtask 7.18a. In `docs/system-prompt-tool-reference.md`, update the `use_skill` row description from `Load and activate a skill, workflow, or managed workflow by name.` to `Load and activate a skill or workflow by name.`

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`

[x] Subtask 7.19. In `src/core/task/tools/response/ResponseToolRuntime.ts`, delete the `if (message.includes("Managed workflow")) { return "managed_workflow_incomplete" }` branch from `detectFailureCause(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRuntime.ts`

[x] Subtask 7.19a. In `src/core/task/tools/response/types.ts`, delete the `managed_workflow_incomplete` member from `ResponseToolFailureCause`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/types.ts`

[x] Subtask 7.19b. In `src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`, add a `classifyFailureResult(...)` assertion using the formatted tool-error string `The tool execution failed with the following error:\n<error>\nUnrecognized response-tool failure.\n</error>` and assert it returns `{ message: "Unrecognized response-tool failure.", cause: "tool_error" }`. Do not include `Managed workflow` or `managed_workflow_incomplete` in this test.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`

[x] Subtask 7.20. In `src/core/task/tools/handlers/__tests__/ActModeRespondHandler.test.ts`, update `createConfig()` so `callbacks` includes `clearPartialResponseToolPreview: sinon.stub().resolves(false)`. In the two successful `act_mode_respond` tests, store the tool-use block in a local `const block`, pass that block to `handler.execute(...)`, and assert `clearPartialResponseToolPreview` is called once with that block before `callbacks.say`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/ActModeRespondHandler.test.ts`

[x] Subtask 7.21. In `src/core/task/tools/handlers/__tests__/AskFollowupQuestionToolHandler.test.ts`, replace the two `await Promise.resolve()` calls in the `agent_feedback` ordering test with a deterministic promise that resolves from a `callbacks.say` fake when the first argument is `"agent_feedback"`. Await that promise before asserting `callbacks.ask`, `callbacks.say`, and call ordering.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/AskFollowupQuestionToolHandler.test.ts`

[x] Subtask 7.22. In `src/core/task/tools/handlers/__tests__/PlanModeRespondHandler.test.ts`, make the same deterministic `agent_feedback` wait change as Subtask `7.21`; do not use microtask-flush waits.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/PlanModeRespondHandler.test.ts`

[x] Subtask 7.23. In `src/core/task/tools/handlers/__tests__/UseMcpToolHandler.test.ts`, replace the exact JSON substring assertion with `JSON.parse(result as string)` and assert the parsed payload fields `uri`, `path`, and `language`. Keep the assertion that the result does not include pretty-print indentation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UseMcpToolHandler.test.ts`

[x] Subtask 7.24. Fix the VS Code integration-test HostProvider/global-storage fixture leak that blocks `npm run test`. In `src/test/hook-executor.test.ts`, initialize a valid temp-backed HostProvider in `beforeEach(...)` before `executeHook(...)` can call `HookDiscoveryCache.safeCapture`, and reset HostProvider in `afterEach(...)`. In `src/test/core/controller/marketplace-filtering.test.ts`, replace hard-coded `/test/extension` and `/test/storage` HostProvider/context paths with per-test temp directories created under `os.tmpdir()`, and remove them during `afterEach(...)`; this prevents `McpHub.watchMcpSettingsFile()` from creating directories under `/mock` or other invalid roots. In `src/test/host-provider-test-utils.ts`, change the default `extensionFsPath` and `globalStorageFsPath` fallbacks from `/mock/...` to temp-backed paths under `os.tmpdir()` so tests that use the helper do not leak invalid absolute roots into later integration tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/test/hook-executor.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/test/core/controller/marketplace-filtering.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/test/host-provider-test-utils.ts`

[x] Subtask 7.25. Remove managed-workflow/BMAD packaging hooks. In `package.json`, delete `generate-managed-workflows`, `audit-managed-workflow-extraction`, and `verify-managed-workflow-assets`; remove `generate-managed-workflows` and `verify-managed-workflow-assets` from the `package` script; replace `package:vsix:verified` with a non-managed-workflow VSIX package script; and update `test:e2e:build` to use that non-verifying VSIX script. In `scripts/package-standalone.mjs`, delete `verifyManagedWorkflowAssets(...)` and both calls to it. Delete the managed-workflow packaging helper scripts.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/package.json`
- `/Users/robertboston/Documents/Cline Extension/cline/scripts/package-standalone.mjs`
- `/Users/robertboston/Documents/Cline Extension/cline/scripts/package-vsix-with-managed-workflow-verification.mjs`
- `/Users/robertboston/Documents/Cline Extension/cline/scripts/generate-managed-workflows.mjs`
- `/Users/robertboston/Documents/Cline Extension/cline/scripts/audit-managed-workflow-extraction.mjs`
- `/Users/robertboston/Documents/Cline Extension/cline/scripts/verify-managed-workflow-assets.mjs`
- `/Users/robertboston/Documents/Cline Extension/cline/scripts/managed-workflows.shared.mjs`

[x] Subtask 7.26. Fix test build hygiene so deleted test sources cannot survive as stale compiled JS. In `scripts/build-tests.js`, delete `out/src` before running `tsc -p ./tsconfig.test.json --outDir out`; keep the existing `out/packages` esbuild behavior intact.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/scripts/build-tests.js`

### Phase 7 - Workflow Value Inventory Runtime Enforcement

Pause for QA review before moving to Phase 8.

[x] Task 8. Enforce workflow-owned value inventory as the runtime authorization source for workflow value writes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/__tests__/index.test.ts`

[x] Subtask 8.1. In `src/core/task/workflow-runtime/types.ts`, add required `workflowValueKeys: readonly string[]` to `WorkflowDefinition` immediately after `projectSubfolder`; do not add writer-specific permissions, source-specific allowlists, or document-builder-specific value authorization.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 8.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `validateWorkflowDefinition(...)` to reject `workflowValueKeys` entries that are empty strings, trim to a different value, or duplicate another key.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 8.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `validateWorkflowDefinition(...)` so every `WorkflowDocumentBuilderDefinition.workflowValueWrites` key must exist in `workflow.workflowValueKeys`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 8.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `validateWorkflowDefinition(...)` so every `WorkflowChildInheritanceRule.childKey` must exist in `workflow.workflowValueKeys`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 8.5. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, rewrite `applyWorkflowValueWrites(...)` so allowed keys come only from `definition.workflowValueKeys`; delete the active-step `buildToolSchema(...)` and `SET_WORKFLOW_VALUES` schema inspection from this method while preserving trimming and the existing `{ changedValues, unchangedValues }` return shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 8.6. In workflow definition test fixtures, add `workflowValueKeys: []` by default and explicit keys only where tests persist workflow values; remove any `as WorkflowDefinition` assertion made unnecessary by the required field.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/__tests__/index.test.ts`

[x] Subtask 8.7. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, replace schema-derived workflow-value write coverage with coverage proving inventory keys persist even when the active step does not expose `set_workflow_values`, while non-inventory keys remain unchanged/no-op.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

### Phase 8 - Final Foundational Exposure Cleanup

Pause for final QA review before commit.

[x] Task 9. Remove static model-visible `build_workflow_document` prompt/native exposure while preserving runtime branch-action execution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/build_workflow_document.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/init.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/README.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/vertex_gemini3.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_native_next_gen.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5_native.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5_1_native.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`

[x] Subtask 9.1. Delete `src/core/prompts/system-prompt/tools/build_workflow_document.ts` entirely.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/build_workflow_document.ts`

[x] Subtask 9.2. In `src/core/prompts/system-prompt/tools/init.ts`, delete the import line `import { build_workflow_document_variants } from "./build_workflow_document"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/init.ts`

[x] Subtask 9.3. In `src/core/prompts/system-prompt/tools/init.ts`, delete the `...build_workflow_document_variants,` entry from `allToolVariants`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/init.ts`

[x] Subtask 9.4. In `src/core/prompts/system-prompt/tools/index.ts`, delete the `export * from "./build_workflow_document"` line.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/index.ts`

[x] Subtask 9.5. In `src/core/prompts/system-prompt/tools/README.md`, delete the `- build_workflow_document` list item.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/README.md`

[x] Subtask 9.6. In `docs/system-prompt-tool-reference.md`, delete the `build_workflow_document` table row from the prompt-visible tool reference.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`

[x] Subtask 9.7. In `docs/system-prompt-tool-reference.md`, delete the note line that says `build_workflow_document` remains the shared document-generation execution tool used by runtime-owned workflow document actions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`

[x] Subtask 9.8. In `src/core/prompts/system-prompt/variants/generic/config.ts`, delete the `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,` entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts`

[x] Subtask 9.9. In `src/core/prompts/system-prompt/variants/gemini-3/config.ts`, delete the `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,` entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts`

[x] Subtask 9.10. In `src/core/prompts/system-prompt/variants/glm/config.ts`, delete the `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,` entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts`

[x] Subtask 9.11. In `src/core/prompts/system-prompt/variants/devstral/config.ts`, delete the `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,` entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts`

[x] Subtask 9.12. In `src/core/prompts/system-prompt/variants/trinity/config.ts`, delete the `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,` entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts`

[x] Subtask 9.13. In `src/core/prompts/system-prompt/variants/native-next-gen/config.ts`, delete the `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,` entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts`

[x] Subtask 9.14. In `src/core/prompts/system-prompt/variants/next-gen/config.ts`, delete the `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,` entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts`

[x] Subtask 9.15. In `src/core/prompts/system-prompt/variants/xs/config.ts`, delete the `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,` entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts`

[x] Subtask 9.16. In `src/core/prompts/system-prompt/variants/hermes/config.ts`, delete the `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,` entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts`

[x] Subtask 9.17. In `src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`, delete the `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,` entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`

[x] Subtask 9.18. In `src/core/prompts/system-prompt/variants/gpt-5/config.ts`, delete the `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,` entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts`

[x] Subtask 9.19. In `src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`, delete the `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,` entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`

[x] Subtask 9.20. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, change the native-tools assertion in `should generate consistent native tools object when enabled` from `expect(toolNames).to.include("build_workflow_document")` to `expect(toolNames).to.not.include("build_workflow_document")`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 9.21. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, change the context-variation native-tools assertion from `expect(toolNames).to.include("build_workflow_document")` to `expect(toolNames).to.not.include("build_workflow_document")`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 9.22. Regenerate only the exact prompt snapshots listed in Task 9's allowed-files list so static generic/native `build_workflow_document` prompt and native-tool output is removed; do not edit runtime branch-action tests or runtime branch-action code in this subtask.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/vertex_gemini3.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_native_next_gen.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5_native.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5_1_native.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-basic.snap`

[x] Task 10. Remove remaining generic non-workflow focus-chain and `task_progress` UI/slash-command exposure.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatView.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/components/layout/TaskSection.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/task-header/TaskHeader.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gpt51.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gemini3.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/generic.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gemini.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/anthropic.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/__tests__/index.test.ts`

[x] Subtask 10.1. In `webview-ui/src/components/chat/ChatView.tsx`, remove `focusChainSettings` from the `useExtensionState()` destructuring.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatView.tsx`

[x] Subtask 10.2. In `webview-ui/src/components/chat/ChatView.tsx`, replace the `lastProgressMessageText` `useMemo` body so it returns `currentFocusChainChecklist ?? undefined` and depends only on `[currentFocusChainChecklist]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatView.tsx`

[x] Subtask 10.3. In `webview-ui/src/components/chat/ChatView.tsx`, delete the `showFocusChainPlaceholder` `useMemo` block entirely.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatView.tsx`

[x] Subtask 10.4. In `webview-ui/src/components/chat/ChatView.tsx`, remove the `showFocusChainPlaceholder={showFocusChainPlaceholder}` prop from the `TaskSection` component.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatView.tsx`

[x] Subtask 10.5. In `webview-ui/src/components/chat/chat-view/components/layout/TaskSection.tsx`, delete `showFocusChainPlaceholder?: boolean` from `TaskSectionProps`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/components/layout/TaskSection.tsx`

[x] Subtask 10.6. In `webview-ui/src/components/chat/chat-view/components/layout/TaskSection.tsx`, remove `showFocusChainPlaceholder` from the `TaskSection` parameter destructuring.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/components/layout/TaskSection.tsx`

[x] Subtask 10.7. In `webview-ui/src/components/chat/chat-view/components/layout/TaskSection.tsx`, remove the `showFocusChainPlaceholder={showFocusChainPlaceholder}` prop from the `TaskHeader` component.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/components/layout/TaskSection.tsx`

[x] Subtask 10.8. In `webview-ui/src/components/chat/task-header/TaskHeader.tsx`, delete `showFocusChainPlaceholder?: boolean` from `TaskHeaderProps`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/task-header/TaskHeader.tsx`

[x] Subtask 10.9. In `webview-ui/src/components/chat/task-header/TaskHeader.tsx`, remove `showFocusChainPlaceholder` from the `TaskHeader` parameter destructuring.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/task-header/TaskHeader.tsx`

[x] Subtask 10.10. In `webview-ui/src/components/chat/task-header/TaskHeader.tsx`, remove `focusChainSettings` from the `useExtensionState()` destructuring.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/task-header/TaskHeader.tsx`

[x] Subtask 10.11. In `webview-ui/src/components/chat/task-header/TaskHeader.tsx`, change the `FocusChain` render gate from `focusChainSettings.enabled` to `lastProgressMessageText`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/task-header/TaskHeader.tsx`

[x] Subtask 10.12. In `webview-ui/src/components/chat/task-header/TaskHeader.tsx`, remove the `showPlaceholderWhenEmpty={showFocusChainPlaceholder}` prop from the `FocusChain` component.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/task-header/TaskHeader.tsx`

[x] Subtask 10.13. In `src/core/prompts/commands.ts`, change `condenseToolResponse` so it accepts no `focusChainSettings` parameter.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands.ts`

[x] Subtask 10.14. In `src/core/prompts/commands.ts`, delete the conditional `task_progress` parameter description block from the `condenseToolResponse` template.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands.ts`

[x] Subtask 10.15. In `src/core/prompts/commands.ts`, delete the conditional `<task_progress>task_progress list here</task_progress>` usage line from the `condenseToolResponse` template.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands.ts`

[x] Subtask 10.16. In `src/core/prompts/commands.ts`, delete the conditional example `<task_progress>...</task_progress>` block from the `condenseToolResponse` example.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands.ts`

[x] Subtask 10.17. In `src/core/prompts/commands.ts`, change `deepPlanningToolResponse` so it accepts only `providerInfo?: ApiProviderInfo` and `enableNativeToolCalls?: boolean`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands.ts`

[x] Subtask 10.18. In `src/core/prompts/commands.ts`, update `deepPlanningToolResponse(...)` to call `getDeepPlanningPrompt(providerInfo, enableNativeToolCalls)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands.ts`

[x] Subtask 10.19. In `src/core/slash-commands/index.ts`, remove the `focusChainSettings?: { enabled: boolean }` parameter from `parseSlashCommands(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/index.ts`

[x] Subtask 10.20. In `src/core/slash-commands/index.ts`, change the `smol` and `compact` command replacements to call `condenseToolResponse()` with no argument.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/index.ts`

[x] Subtask 10.21. In `src/core/slash-commands/index.ts`, change the `deep-planning` command replacement to call `deepPlanningToolResponse(providerInfo, willUseNativeTools)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/index.ts`

[x] Subtask 10.22. In `src/core/task/index.ts`, delete the local `const focusChainSettings = this.stateManager.getGlobalSettingsKey("focusChainSettings")` inside the slash-command parsing path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 10.23. In `src/core/task/index.ts`, update the `parseSlashCommands(...)` call to remove the deleted `focusChainSettings` argument.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 10.24. In `src/core/slash-commands/__tests__/index.test.ts`, update `parseSlashCommands(...)` calls that pass an obsolete `focusChainSettings` placeholder argument so their arguments match the new signature.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/__tests__/index.test.ts`

[x] Subtask 10.25. In `src/core/prompts/commands/deep-planning/index.ts`, delete the `focusChainIntro` constant.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/index.ts`

[x] Subtask 10.26. In `src/core/prompts/commands/deep-planning/index.ts`, change `getDeepPlanningPrompt(...)` so it accepts only `providerInfo?: ApiProviderInfo` and `enableNativeToolCalls?: boolean`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/index.ts`

[x] Subtask 10.27. In `src/core/prompts/commands/deep-planning/index.ts`, delete the `const focusChainParam = ...` line.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/index.ts`

[x] Subtask 10.28. In `src/core/prompts/commands/deep-planning/index.ts`, update the GPT 5.1 variant call to `generateGPT51Template(enableNativeToolCalls ?? false)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/index.ts`

[x] Subtask 10.29. In `src/core/prompts/commands/deep-planning/index.ts`, update the Gemini 3 variant call to `generateGemini3Template(enableNativeToolCalls ?? false)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/index.ts`

[x] Subtask 10.30. In `src/core/prompts/commands/deep-planning/index.ts`, delete the `template = template.replace("{{FOCUS_CHAIN_PARAM}}", focusChainParam)` line.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/index.ts`

[x] Subtask 10.31. In `src/core/prompts/commands/deep-planning/variants/gpt51.ts`, remove `focusChainEnabled` from `generateGPT51Template(...)` and delete the matching JSDoc `@param focusChainEnabled` line.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gpt51.ts`

[x] Subtask 10.32. In `src/core/prompts/commands/deep-planning/variants/gpt51.ts`, delete the conditional `Track these five steps in task_progress...` template line.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gpt51.ts`

[x] Subtask 10.33. In `src/core/prompts/commands/deep-planning/variants/gpt51.ts`, delete the conditional `Include the current task_progress checklist.` line from the example implementation plan section.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gpt51.ts`

[x] Subtask 10.34. In `src/core/prompts/commands/deep-planning/variants/gpt51.ts`, remove the conditional focus-chain phrase from the `Use the new_task command...` sentence so it no longer mentions `task_progress` or focus chain.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gpt51.ts`

[x] Subtask 10.35. In `src/core/prompts/commands/deep-planning/variants/gpt51.ts`, replace the conditional `Task Progress` / `Markdown Implementation Plan Path` template block with an unconditional `Markdown Implementation Plan Path` block that preserves the existing instruction to include the markdown plan path and contains no `task_progress` or focus-chain wording.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gpt51.ts`

[x] Subtask 10.36. In `src/core/prompts/commands/deep-planning/variants/gemini3.ts`, remove `focusChainEnabled` from `generateGemini3Template(...)` and delete the matching JSDoc `@param focusChainEnabled` line.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gemini3.ts`

[x] Subtask 10.37. In `src/core/prompts/commands/deep-planning/variants/gemini3.ts`, delete the conditional `Track these five steps in task_progress...` template line.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gemini3.ts`

[x] Subtask 10.38. In `src/core/prompts/commands/deep-planning/variants/gemini3.ts`, delete the conditional `Include the current task_progress checklist.` line from the example implementation plan section.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gemini3.ts`

[x] Subtask 10.39. In `src/core/prompts/commands/deep-planning/variants/gemini3.ts`, delete the conditional focus-chain phrase from the `Use the new_task command...` sentence so it no longer mentions `task_progress` or focus chain.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gemini3.ts`

[x] Subtask 10.40. In `src/core/prompts/commands/deep-planning/variants/gemini3.ts`, replace the conditional `Task Progress` / `Markdown Implementation Plan Path` template block with an unconditional `Markdown Implementation Plan Path` block that preserves the existing instruction to include the markdown plan path and contains no `task_progress` or focus-chain wording.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gemini3.ts`

[x] Subtask 10.41. In `src/core/prompts/commands/deep-planning/variants/generic.ts`, delete the sentence `Use the new_task command to create a task for implementing the plan. If focus-chain is enabled, include the current task_progress checklist.` and replace it with `Use the new_task command to create a task for implementing the plan.`

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/generic.ts`

[x] Subtask 10.42. In `src/core/prompts/commands/deep-planning/variants/generic.ts`, delete the `Task Progress` section that tells the model to include the current `task_progress` checklist.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/generic.ts`

[x] Subtask 10.43. In `src/core/prompts/commands/deep-planning/variants/generic.ts`, delete the `{{FOCUS_CHAIN_PARAM}}` placeholder line.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/generic.ts`

[x] Subtask 10.44. In `src/core/prompts/commands/deep-planning/variants/gemini.ts`, delete the sentence telling the model that the new task must include a `<task_progress>` list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gemini.ts`

[x] Subtask 10.45. In `src/core/prompts/commands/deep-planning/variants/gemini.ts`, delete the `Task Progress Format` section that tells the model to include `task_progress` contents in the new task.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gemini.ts`

[x] Subtask 10.46. In `src/core/prompts/commands/deep-planning/variants/gemini.ts`, delete the `{{FOCUS_CHAIN_PARAM}}` placeholder line.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/gemini.ts`

[x] Subtask 10.47. In `src/core/prompts/commands/deep-planning/variants/anthropic.ts`, delete the sentence telling the model that the new task must include a `<task_progress>` list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/anthropic.ts`

[x] Subtask 10.48. In `src/core/prompts/commands/deep-planning/variants/anthropic.ts`, delete the `Task Progress Format` section that tells the model to include `task_progress` contents in the new task.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/anthropic.ts`

[x] Subtask 10.49. In `src/core/prompts/commands/deep-planning/variants/anthropic.ts`, delete the `{{FOCUS_CHAIN_PARAM}}` placeholder line.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/commands/deep-planning/variants/anthropic.ts`

[x] Task 11. Complete module-declared selector discovery payload support.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 11.1. In `src/shared/ExtensionMessage.ts`, add `namingPattern?: string` to `WorkflowFormSelectorDiscoveryConfig`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`

[x] Subtask 11.2. In `src/shared/ExtensionMessage.ts`, add `labelTemplate?: string` to `WorkflowFormSelectorDiscoveryConfig`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`

[x] Subtask 11.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `resolveWorkflowFormSelectorOptions(...)` to convert `discoveryConfig.namingPattern` into a `RegExp` local only when the string is present.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 11.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, pass the `RegExp` local from Subtask `11.3` to `discoverWorkflowCandidates(...)` as `namingPattern`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 11.5. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update the `buildLabel` callback passed to `discoverWorkflowCandidates(...)` so it replaces `{entryName}` in `discoveryConfig.labelTemplate` when present and otherwise returns `entryName`; do not use a non-null assertion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 11.6. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add selector-discovery coverage proving a module-provided `namingPattern` is passed to `discoverWorkflowCandidates(...)` and filters candidate discovery through that runtime seam.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 11.7. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add selector-discovery coverage proving a module-provided `labelTemplate` changes the option label while preserving the canonical option value.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

### Phase 9 - Remove Obsolete Workflow Skill Metadata Projection

Pause for final QA review before commit.

[x] Task 12. Delete the obsolete prompt-visible shipped-workflow skill metadata projection.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[x] Subtask 12.1. In `src/core/task/workflow-runtime/WorkflowRegistry.ts`, delete the `import type { SkillMetadata } from "@/shared/skills"` import.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[x] Subtask 12.2. In `src/core/task/workflow-runtime/WorkflowRegistry.ts`, delete the entire exported `getWorkflowSkillMetadata(): SkillMetadata[]` function.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

### Phase 10 - Delete Focus-Chain Prompt Carrier

[x] Task 13. Remove focus-chain generated workflow prompt injection so workflow prompt status is projected only by `WorkflowRuntime.buildTurnProjection(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 13.1. In `src/core/task/index.ts`, delete the focus-chain prompt-injection path from prompt assembly: remove the `focusChainManager` local used only for prompt instructions, remove the `load_context_snapshot`, `focus_chain_decision`, `focus_chain_generation`, and `load_context_final_summary` diagnostic blocks, remove the call to `getFocusChainInstructionsDecision()`, remove the call to `shouldIncludeFocusChainInstructions()`, remove the call to `generateFocusChainInstructions()`, remove the `promptInjectionBlocks.push(...)` block that appends focus-chain instructions, and remove the now-unused `logFocusChainDiagnosticEvent`, `summarizeFocusChainText`, and `summarizeFocusChainTextBlocks` import. Keep environment-detail prompt injection, clinerules handling, workflow runtime projection, ToolExecutor focus-chain callback wiring, and completion-time focus-chain checks unchanged.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 13.2. In `src/core/task/focus-chain/index.ts`, delete the focus-chain prompt API entirely: remove `FocusChainInstructionDecision`, `joinPromptSections(...)`, `renderChecklistForPrompt(...)`, `getFocusChainInstructionsDecision()`, `generateFocusChainInstructions()`, `logPromptAssemblySnapshot(...)`, `logFocusChainDecision(...)`, `logGeneratedFocusChainInstructions(...)`, `logFinalPromptContentSummary(...)`, and `shouldIncludeFocusChainInstructions()`. Remove constructor dependencies, fields, imports, and assignments that only supported those deleted prompt APIs: `cwd`, `mode`, `stateManager`, `say`, `ClineSay`, `Mode`, `StateManager`, `logFocusChainDiagnosticEvent`, `summarizeFocusChainText`, and `summarizeFocusChainTextBlocks`. Keep in-memory checklist projection, workflow-scoped manager lifecycle, `updateFCListFromToolResponse(...)`, and completion telemetry unchanged.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/index.ts`

[x] Subtask 13.3. In `src/core/task/index.ts`, update the `new FocusChainManager(...)` call in `getActiveWorkflowFocusChainManager()` so the constructor object no longer passes `cwd`, `mode`, `stateManager`, or `say`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 13.4. In `src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts`, delete the test that asserts `generateFocusChainInstructions()` returns `# CURRENT WORKFLOW STATUS`. Update the test fixture to match the reduced `FocusChainDependencies` contract by removing `StateManager` setup and `say` stubbing. Remove remaining assertions that call `generateFocusChainInstructions()` or assert prompt text from focus chain. Keep coverage that active workflow checklist projection updates `taskState.currentFocusChainChecklist`, posts state to webview, and clears after workflow teardown.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts`

[x] Subtask 13.5. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, delete the two redundant assertions that check workflow prompt blocks do not include `# CURRENT WORKFLOW STATUS`. Keep the existing exact assertions for `WorkflowRuntime.buildTurnProjection(...)`-derived workflow system/input blocks.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Task 14. Make mandatory entry `WorkflowForm` rendering main-agent only by having child/subagent workflow activation inherit parent project selection.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 14.1. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `activateWorkflow(...)` so a call with `parentSession` is treated as child workflow activation: before assigning `taskState.activeWorkflowName` or `taskState.activeWorkflowSession`, verify `parentSession.projectSelection.projectTitle.trim()` and `parentSession.projectSelection.projectFolderName.trim()` are both non-empty. If either is empty, return `{ kind: "no_op" }` without mutating the child `taskState`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 14.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update the new `activeWorkflowSession.projectSelection` initialization inside `activateWorkflow(...)`: when `parentSession` is present, assign a copied `projectSelection` object from `parentSession.projectSelection`; when `parentSession` is absent, keep the existing blank `{ projectMode: "new", projectTitle: "", projectFolderName: "" }` initialization so main-agent activation still renders the mandatory entry `WorkflowForm`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 14.3. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add child-activation coverage proving `activateWorkflow(...)` with a complete `parentSession.projectSelection` copies that project selection into the child `activeWorkflowSession`, does not share the parent `projectSelection` object by reference, and does not return a mandatory entry `WorkflowForm` next action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 14.4. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add child-activation coverage proving `activateWorkflow(...)` with `parentSession.projectSelection.projectTitle === ""` or `parentSession.projectSelection.projectFolderName === ""` returns `{ kind: "no_op" }` and leaves the child `taskState.activeWorkflowName` and `taskState.activeWorkflowSession` unset.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 14.5. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add or update assigned-workflow activation coverage proving the subagent child session receives the parent workflow session's `projectSelection` and does not receive a mandatory entry `WorkflowForm` action during auto-activation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Task 15. Remove workflow-value output-folder override from artifact path resolution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 15.1. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `resolveWorkflowProjectOutputFolder(...)` so it no longer reads `session.workflowValues.output_folder`. The method must throw when `session.projectSelection.projectFolderName.trim() === ""`; otherwise it must return `join(this.cwd, session.projectSelection.projectFolderName)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 15.2. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add artifact-path coverage proving `resolveWorkflowArtifactPath(...)` ignores `session.workflowValues.output_folder` and still resolves to `join(cwd, session.projectSelection.projectFolderName, workflow.projectSubfolder, relativeArtifactPath)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 15.3. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, keep or add coverage proving artifact relative paths still cannot be absolute and cannot contain `.` or `..` escape segments.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

### Phase 11 - Remove Legacy User-Authored Workflow Toggle Contracts

Pause for QA review before commit.

[x] Task 16. Remove legacy workflow-toggle protobuf and generated service contracts.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/proto/cline/file.proto`
- `/Users/robertboston/Documents/Cline Extension/cline/proto/cline/state.proto`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/storage/state-keys.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/proto/cline/file.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/proto/cline/state.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/grpc-js/cline/file.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/grpc-js/cline/state.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/nice-grpc/cline/file.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/nice-grpc/cline/state.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/hosts/vscode/protobus-services.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/hosts/vscode/protobus-service-types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/hosts/standalone/protobus-server-setup.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/services/grpc-client.ts`

[x] Subtask 16.1. In `proto/cline/file.proto`, delete the `rpc toggleWorkflow(ToggleWorkflowRequest) returns (ClineRulesToggles);` service entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/proto/cline/file.proto`

[x] Subtask 16.2. In `proto/cline/file.proto`, delete the entire `ToggleWorkflowRequest` message.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/proto/cline/file.proto`

[x] Subtask 16.3. In `proto/cline/file.proto`, delete `local_workflow_toggles` and `global_workflow_toggles` from `RefreshedRules`; do not renumber surviving fields.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/proto/cline/file.proto`

[x] Subtask 16.4. In `src/shared/storage/state-keys.ts`, delete `remoteWorkflowToggles` from `GlobalStateFields`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/storage/state-keys.ts`

[x] Subtask 16.4a. In `src/shared/storage/state-keys.ts`, delete `remoteGlobalWorkflows` from `GlobalStateFields`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/storage/state-keys.ts`

[x] Subtask 16.5. In `src/shared/storage/state-keys.ts`, delete `globalWorkflowToggles` from `UserSettings`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/storage/state-keys.ts`

[x] Subtask 16.6. In `src/shared/storage/state-keys.ts`, delete `"workflowToggles"` from `LocalStateKeys`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/storage/state-keys.ts`

[x] Subtask 16.7. Run `node scripts/generate-state-proto.mjs` so `proto/cline/state.proto` removes the generated `global_workflow_toggles` state field.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/proto/cline/state.proto`

[x] Subtask 16.8. Run `npm run protos` so generated file/state proto outputs, host service bindings, and the webview grpc client remove `toggleWorkflow`, `ToggleWorkflowRequest`, `localWorkflowToggles`, `globalWorkflowToggles`, and `globalWorkflowToggles` state serialization. If the proto/Rosetta process check fails in sandbox, rerun with elevated permissions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/proto/cline/file.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/proto/cline/state.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/grpc-js/cline/file.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/grpc-js/cline/state.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/nice-grpc/cline/file.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/nice-grpc/cline/state.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/hosts/vscode/protobus-services.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/hosts/vscode/protobus-service-types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/hosts/standalone/protobus-server-setup.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/services/grpc-client.ts`

[x] Task 17. Remove backend legacy workflow-toggle implementation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/context/instructions/user-instructions/workflows.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/toggleWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/refreshRules.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/createRuleFile.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/deleteRuleFile.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/context/instructions/user-instructions/rule-helpers.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/storage/disk.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/storage/remote-config/utils.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/remote-config/schema.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/remote-config/constants.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/remote-config/__tests__/schema.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/openFile.ts`

[x] Subtask 17.1. Delete `src/core/context/instructions/user-instructions/workflows.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/context/instructions/user-instructions/workflows.ts`

[x] Subtask 17.2. Delete `src/core/controller/file/toggleWorkflow.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/toggleWorkflow.ts`

[x] Subtask 17.3. In `src/core/controller/file/refreshRules.ts`, delete the `refreshWorkflowToggles` import.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/refreshRules.ts`

[x] Subtask 17.4. In `src/core/controller/file/refreshRules.ts`, delete the `refreshWorkflowToggles(controller, cwd)` call and its `localWorkflowToggles` / `globalWorkflowToggles` locals.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/refreshRules.ts`

[x] Subtask 17.5. In `src/core/controller/file/refreshRules.ts`, remove `localWorkflowToggles` and `globalWorkflowToggles` from the returned `RefreshedRules` object.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/refreshRules.ts`

[x] Subtask 17.6. In `src/core/controller/file/createRuleFile.ts`, delete the `refreshWorkflowToggles` import.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/createRuleFile.ts`

[x] Subtask 17.7. In `src/core/controller/file/createRuleFile.ts`, delete the workflow-file refresh branch that calls `refreshWorkflowToggles(...)`; rule-file creation must refresh only rule toggles.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/createRuleFile.ts`

[x] Subtask 17.8. In `src/core/controller/file/deleteRuleFile.ts`, remove the workflow-specific file-type label branch so deletion text no longer treats `"workflow"` as a rule-file type.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/deleteRuleFile.ts`

[x] Subtask 17.9. In `src/core/controller/file/deleteRuleFile.ts`, delete stale commented workflow-refresh code.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/deleteRuleFile.ts`

[x] Subtask 17.10. In `src/core/context/instructions/user-instructions/rule-helpers.ts`, remove `ensureWorkflowsDirectoryExists` from the storage import.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/context/instructions/user-instructions/rule-helpers.ts`

[x] Subtask 17.11. In `src/core/context/instructions/user-instructions/rule-helpers.ts`, delete workflow-directory conversion branches that reference `.clinerules/workflows` or `GlobalFileNames.workflows`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/context/instructions/user-instructions/rule-helpers.ts`

[x] Subtask 17.12. In `src/core/context/instructions/user-instructions/rule-helpers.ts`, delete workflow-toggle cleanup branches that read or write `globalWorkflowToggles` or workspace `workflowToggles`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/context/instructions/user-instructions/rule-helpers.ts`

[x] Subtask 17.13. In `src/core/storage/disk.ts`, delete the `GlobalFileNames.workflows` member.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/storage/disk.ts`

[x] Subtask 17.14. In `src/core/storage/disk.ts`, delete `ensureWorkflowsDirectoryExists()`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/storage/disk.ts`

[x] Subtask 17.15. In `src/core/storage/remote-config/utils.ts`, remove transformation of `remoteConfig.globalWorkflows` into `transformed.remoteGlobalWorkflows`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/storage/remote-config/utils.ts`

[x] Subtask 17.15a. In `src/shared/remote-config/schema.ts`, delete `globalWorkflows` from the remote config schema.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/remote-config/schema.ts`

[x] Subtask 17.15b. In `src/shared/remote-config/__tests__/schema.test.ts`, remove `globalWorkflows` fixtures and assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/remote-config/__tests__/schema.test.ts`

[x] Subtask 17.15c. In `src/shared/remote-config/constants.ts`, remove comments or examples that describe `remote://workflow/{name}`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/remote-config/constants.ts`

[x] Subtask 17.16. In `src/core/storage/remote-config/utils.ts`, remove all reads and writes of `remoteWorkflowToggles`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/storage/remote-config/utils.ts`

[x] Subtask 17.16a. In `src/core/controller/file/openFile.ts`, update the function comments so `openFile(...)` and `openRemoteFile(...)` document only `remote://rule/{ruleName}` support.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/openFile.ts`

[x] Subtask 17.16b. In `src/core/controller/file/openFile.ts`, change the remote URI regex so `openRemoteFile(...)` accepts only `remote://rule/{name}` and rejects `remote://workflow/{name}`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/openFile.ts`

[x] Subtask 17.16c. In `src/core/controller/file/openFile.ts`, replace the type-based remote item lookup with a direct lookup against `remoteConfig.remoteGlobalRules`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/openFile.ts`

[x] Subtask 17.16d. In `src/core/controller/file/openFile.ts`, replace the type-based error text, read-only header label, and temp filename prefix with rule-only values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/file/openFile.ts`

[x] Subtask 17.17. In `src/core/controller/index.ts`, remove reads of `globalWorkflowToggles`, `remoteWorkflowToggles`, and workspace `workflowToggles`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/index.ts`

[x] Subtask 17.18. In `src/core/controller/index.ts`, remove `localWorkflowToggles`, `globalWorkflowToggles`, and `remoteWorkflowToggles` from the webview state message.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/index.ts`

[x] Task 18. Remove webview and CLI legacy workflow-toggle surfaces.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/context/ExtensionStateContext.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/cline-rules/ClineRulesToggleModal.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/cline-rules/RulesToggleList.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/cline-rules/NewRuleRow.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/cline-rules/RuleRow.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatTextArea.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/SlashCommandMenu.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/utils/slash-commands.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/cli/workspaceState.json`
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/components/App.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/components/ConfigView.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/components/ConfigViewWrapper.tsx`

[x] Subtask 18.1. In `src/shared/ExtensionMessage.ts`, remove `localWorkflowToggles` from extension state message types.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`

[x] Subtask 18.2. In `src/shared/ExtensionMessage.ts`, remove `globalWorkflowToggles` from extension state message types.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`

[x] Subtask 18.3. In `src/shared/ExtensionMessage.ts`, remove `remoteWorkflowToggles` from extension state message types.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`

[x] Subtask 18.4. In `webview-ui/src/context/ExtensionStateContext.tsx`, remove workflow-toggle state defaults for local, global, and remote workflow toggles.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/context/ExtensionStateContext.tsx`

[x] Subtask 18.5. In `webview-ui/src/context/ExtensionStateContext.tsx`, remove workflow-toggle setters and context values for local, global, and remote workflow toggles.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/context/ExtensionStateContext.tsx`

[x] Subtask 18.6. In `webview-ui/src/context/ExtensionStateContext.tsx`, remove workflow-toggle hydration from extension state messages.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/context/ExtensionStateContext.tsx`

[x] Subtask 18.7. In `webview-ui/src/components/cline-rules/ClineRulesToggleModal.tsx`, remove the `ToggleWorkflowRequest` import.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/cline-rules/ClineRulesToggleModal.tsx`

[x] Subtask 18.8. In `webview-ui/src/components/cline-rules/ClineRulesToggleModal.tsx`, remove the `toggleWorkflow(...)` local handler and the remote workflow toggle handler that call `FileServiceClient.toggleWorkflow(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/cline-rules/ClineRulesToggleModal.tsx`

[x] Subtask 18.9. In `webview-ui/src/components/cline-rules/ClineRulesToggleModal.tsx`, remove the Workflows tab and all local, global, and remote workflow sections from the modal render output.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/cline-rules/ClineRulesToggleModal.tsx`

[x] Subtask 18.10. In `webview-ui/src/components/cline-rules/RulesToggleList.tsx`, remove workflow-specific empty-state text and branches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/cline-rules/RulesToggleList.tsx`

[x] Subtask 18.11. In `webview-ui/src/components/cline-rules/NewRuleRow.tsx`, remove workflow-specific labels, placeholders, and file-type handling.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/cline-rules/NewRuleRow.tsx`

[x] Subtask 18.12. In `webview-ui/src/components/cline-rules/RuleRow.tsx`, remove workflow-specific remote URI and display handling.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/cline-rules/RuleRow.tsx`

[x] Subtask 18.13. In `webview-ui/src/utils/slash-commands.ts`, delete `getWorkflowCommands(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/utils/slash-commands.ts`

[x] Subtask 18.14. In `webview-ui/src/utils/slash-commands.ts`, remove workflow-toggle parameters from exported slash-command utility functions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/utils/slash-commands.ts`

[x] Subtask 18.15. In `webview-ui/src/utils/slash-commands.ts`, remove workflow-toggle-derived command synthesis from slash-command list construction; keep backend-provided slash commands from extension state available.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/utils/slash-commands.ts`

[x] Subtask 18.16. In `webview-ui/src/components/chat/SlashCommandMenu.tsx`, remove workflow-toggle props from the component contract and slash-command utility calls.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/SlashCommandMenu.tsx`

[x] Subtask 18.17. In `webview-ui/src/components/chat/ChatTextArea.tsx`, remove workflow-toggle state extraction from extension context.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatTextArea.tsx`

[x] Subtask 18.18. In `webview-ui/src/components/chat/ChatTextArea.tsx`, remove workflow-toggle props passed to `SlashCommandMenu`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatTextArea.tsx`

[x] Subtask 18.19. In `webview-ui/src/components/chat/ChatTextArea.tsx`, remove workflow-toggle arguments passed to slash-command utility functions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatTextArea.tsx`

[x] Subtask 18.20. In `cli/workspaceState.json`, delete the top-level `workflowToggles` entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/cli/workspaceState.json`

[x] Subtask 18.21. In `cli/src/components/ConfigView.tsx`, remove workflow-toggle props, derived workflow-toggle entries, and workflow toggle render output.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/components/ConfigView.tsx`

[x] Subtask 18.22. In `cli/src/components/ConfigViewWrapper.tsx`, remove workflow-toggle state and refresh hydration.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/components/ConfigViewWrapper.tsx`

[x] Subtask 18.23. In `cli/src/components/ConfigViewWrapper.tsx`, remove the dynamic import of `toggleWorkflow` and the workflow-toggle update handler that calls it.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/components/ConfigViewWrapper.tsx`

[x] Subtask 18.24. In `cli/src/components/App.tsx`, remove workflow-toggle props from `App` and from the `ConfigViewWrapper` / `ConfigView` call chain.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/components/App.tsx`

[x] Task 19. Update tests for removed legacy workflow-toggle contracts.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/utils/__tests__/slash-commands.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/storage/__tests__/state-keys.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/utils/fs.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 19.1. In `webview-ui/src/utils/__tests__/slash-commands.test.ts`, remove tests that expect local, global, or remote workflow toggles to synthesize slash commands.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/utils/__tests__/slash-commands.test.ts`

[x] Subtask 19.2. In `webview-ui/src/utils/__tests__/slash-commands.test.ts`, add or update coverage proving backend-provided slash commands remain available without local, global, or remote workflow-toggle inputs.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/utils/__tests__/slash-commands.test.ts`

[x] Subtask 19.3. In `src/shared/storage/__tests__/state-keys.test.ts`, remove expectations for `remoteWorkflowToggles`, `globalWorkflowToggles`, and workspace `workflowToggles`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/storage/__tests__/state-keys.test.ts`

[x] Subtask 19.4. In `src/utils/fs.test.ts`, remove the test named `should exclude .clinerules/workflows directory specifically`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/utils/fs.test.ts`

[x] Subtask 19.5. In `src/utils/fs.test.ts`, update the `.clinerules/hooks` exclusion test so it no longer creates, counts, asserts, or excludes a `.clinerules/workflows` directory.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/utils/fs.test.ts`

[x] Subtask 19.6. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, remove the `generic-managed-workflow` and `generic-project-workflow` entries from the `context.skills` fixture in the workflow prompt-scope test.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

### Phase 12 - Persist Pending Workflow-Form Deterministic Operations

Pause for QA review before commit.

[x] Task 20. Move pending workflow-form deterministic operation state from runtime-local memory into the persisted workflow session.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 20.1. In `src/core/task/workflow-runtime/types.ts`, add `WorkflowPendingFormOperationState` with fields `formSession: WorkflowFormSessionState`, `operationId: string`, `nextPanelId: string | undefined`, and `terminal: boolean`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 20.2. In `src/core/task/workflow-runtime/types.ts`, add `pendingWorkflowFormOperation: WorkflowPendingFormOperationState | undefined` to `ActiveWorkflowSession`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 20.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, delete the `pendingWorkflowFormOperationByTaskState` `WeakMap` field entirely.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 20.4. In `activateWorkflow(...)`, initialize new workflow sessions with `pendingWorkflowFormOperation: undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 20.5. In `handleWorkflowFormOutcome(...)`, replace the `pendingWorkflowFormOperationByTaskState.set(...)` call in the `invoke_deterministic_operation` branch with assignment to `session.pendingWorkflowFormOperation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 20.6. In `handleBranchActionToolResult(...)`, read pending workflow-form operation state from `session.pendingWorkflowFormOperation` instead of the deleted `WeakMap`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 20.7. In `handleBranchActionToolResult(...)`, replace the deleted `WeakMap.delete(...)` call with `session.pendingWorkflowFormOperation = undefined` before interpreting the deterministic tool result.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 20.8. In `handleBranchActionToolResult(...)`, update pending-operation references from `.session` to `.formSession`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 20.9. In `resolveDecisionTreeContinuationRoute(...)`, read pending workflow-form operation state from `session.pendingWorkflowFormOperation` and compare `route.action.workflowFormId` to `pendingWorkflowFormOperation.formSession.workflowFormId`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 20.10. In `buildNextActionFromDecisionTreeAction(...)`, read pending workflow-form operation state from `session.pendingWorkflowFormOperation` and use `pendingWorkflowFormOperation.formSession.workflowFormId` when deciding whether to return an `execute_branch_action`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 20.11. In `restorePersistedSession(...)`, remove the line that clears pending workflow-form operations during restore.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 20.12. In `teardownWorkflow(...)`, remove the deleted `WeakMap` cleanup call; session teardown remains sufficient because `activeWorkflowSession` is cleared.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 20.13. In `transitionToStep(...)`, replace the deleted `WeakMap` cleanup call with `session.pendingWorkflowFormOperation = undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 20.14. In `handleWorkflowEntryFormOutcome(...)`, replace the deleted `WeakMap` cleanup call after successful project selection with `session.pendingWorkflowFormOperation = undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 20.15. In `WorkflowRuntime.test.ts`, add coverage proving an `invoke_deterministic_operation` workflow-form outcome stores the pending operation on `taskState.activeWorkflowSession.pendingWorkflowFormOperation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 20.16. In `WorkflowRuntime.test.ts`, add restore coverage proving a persisted session with `pendingWorkflowFormOperation` restores and `resolveNextAction(...)` returns the deterministic `execute_branch_action` instead of dropping the operation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 20.17. In `WorkflowRuntime.test.ts`, add coverage proving `handleBranchActionToolResult(...)` clears `pendingWorkflowFormOperation` after interpreting the deterministic operation result.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 20.18. In `src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`, add `pendingWorkflowFormOperation: undefined` to the hand-built `taskState.activeWorkflowSession` fixture so it satisfies the Phase 12 `ActiveWorkflowSession` shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

[x] Subtask 20.19. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add `pendingWorkflowFormOperation: undefined` to the two hand-built `ActiveWorkflowSession` fixtures at the assigned-workflow inheritance and existing-workflow test setup sites so they satisfy the Phase 12 `ActiveWorkflowSession` shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 20.20. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update the `session.pendingWorkflowFormOperation` assignment in the `invoke_deterministic_operation` branch so `terminal` is assigned as `outcome.terminal === true` instead of `outcome.terminal`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`


### Phase 13 - Block Direct Subagent use_skill Execution

Pause for QA review before commit.

[x] Task 21. Prevent subagents from directly invoking `use_skill`; subagent workflow activation must remain parent-assigned only.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 21.1. In `UseSkillToolHandler.execute(...)`, add an early guard immediately after missing-`skill_name` validation: if `config.isSubagentExecution === true`, increment `config.taskState.consecutiveMistakeCount` and return `Error: use_skill is not available inside subagent runs.` without resolving skills or workflows.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts`

[x] Subtask 21.2. In `SubagentBuilder.ts`, remove `ClineDefaultTool.USE_SKILL` from the default allowed tool list for subagent runs.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`

[x] Subtask 21.3. In `UseSkillToolHandler.test.ts`, add coverage proving `execute(...)` with `isSubagentExecution: true` returns the subagent-unavailable error and does not call `workflowRuntime.activateWorkflow(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`

[x] Subtask 21.4. In `SubagentRunner.ts`, remove the instruction text that tells subagents to call `use_skill` before reading files, searching the repo, or analyzing code. Do not replace it with another direct subagent `use_skill` instruction.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 21.4a. In `SubagentRunner.test.ts`, update tests that expect assigned prompts to instruct subagents to call `use_skill`; assert assigned workflow activation happens through `autoActivateAssignedWorkflow(...)` instead.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 21.5. In `SubagentRunner.test.ts`, add coverage proving a subagent-emitted `use_skill` tool call is rejected by allowed-tools filtering with `Tool 'use_skill' is not available inside subagent runs.`

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 21.6. In `SubagentRunner.test.ts`, update the `rejects subagent-emitted use_skill through allowed-tools filtering` test so it runs in native-tool mode instead of non-native fallback mode: construct the runner with `createTaskConfig(true)`, stub `SubagentBuilder.prototype.buildNativeTools` to return a non-empty native tool list that does not include `use_skill`, set `promptRegistry.nativeTools` to the same non-empty list in the `PromptRegistry.get` stub, and keep the existing assertion that the user tool result contains `Tool 'use_skill' is not available inside subagent runs.`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

### Phase 14 - Remove Retired task_progress and complete_workflow_item Surfaces

Pause for QA review before commit.

[x] Task 22. Remove retired workflow-progress parser/default-tool surfaces that no longer have prompt/runtime ownership.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/complete_workflow_item.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.canonicalization.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`

[x] Subtask 22.1. In `src/core/assistant-message/index.ts`, remove `"task_progress"` from `toolParamNames`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`

[x] Subtask 22.2. In `src/shared/tools.ts`, delete `COMPLETE_WORKFLOW_ITEM` from `ClineDefaultTool`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[x] Subtask 22.3. In `src/shared/tools.ts`, remove `ClineDefaultTool.COMPLETE_WORKFLOW_ITEM` from `READ_ONLY_TOOLS`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[x] Subtask 22.4. In `ToolExecutorCoordinator.ts`, delete the `ClineDefaultTool.COMPLETE_WORKFLOW_ITEM` handler-map entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

[x] Subtask 22.5. In `ResponseToolRegistry.ts`, delete the `ClineDefaultTool.COMPLETE_WORKFLOW_ITEM` registry entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

[x] Subtask 22.6. Delete `src/core/prompts/system-prompt/tools/complete_workflow_item.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/complete_workflow_item.ts`

[x] Subtask 22.7. In `src/core/prompts/system-prompt/tools/index.ts`, remove the `complete_workflow_item` export.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/index.ts`

[x] Subtask 22.8. In `ToolExecutor.canonicalization.test.ts`, remove `task_progress` from parser/canonicalization fixtures and assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.canonicalization.test.ts`

[x] Subtask 22.9. In `openai-native.test.ts`, remove `complete_workflow_item` native-tool fixtures and expectations.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`

[x] Task 23. Remove retired `task_progress` say/message transport handling after parser/default-tool cleanup.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/proto-conversions/cline-message.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/utils/messageUtils.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/agent/messageTranslator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/agent/messageTranslator.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/utils/display.ts`

[x] Subtask 23.1. In `ExtensionMessage.ts`, remove `"task_progress"` from `ClineSay`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`

[x] Subtask 23.2. In `cline-message.ts`, remove both proto-conversion mappings for `task_progress`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/proto-conversions/cline-message.ts`

[x] Subtask 23.3. In `ChatRow.tsx`, remove the `task_progress` render branch.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`

[x] Subtask 23.4. In `messageUtils.ts`, remove the `task_progress` exclusion/filter branch.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/utils/messageUtils.ts`

[x] Subtask 23.5. In `messageTranslator.ts`, remove the `say: "task_progress"` translation branch.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/agent/messageTranslator.ts`

[x] Subtask 23.6. In `messageTranslator.test.ts`, remove tests that translate `say:task_progress` to plan updates.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/agent/messageTranslator.test.ts`

[x] Subtask 23.7. In `cli/src/utils/display.ts`, remove the `task_progress` display branch.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/utils/display.ts`

### Phase 15 - Use Runtime-Projected Native Tools In Subagent Runs

Pause for QA review before moving to Phase 16.

[x] Task 24. Make subagent native-tool execution use the same workflow-aware native-tool projection as prompt assembly.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 24.1. In `SubagentBuilder.ts`, update `buildNativeTools(context)` so that after `family` is computed, the first branch checks `context.workflowToolSchemaOverride !== undefined`; when true, return `ClineToolSet.getNativeTools(family, context)` directly and do not call `ClineToolSet.getToolsForVariantWithFallback(...)` or filter through `this.allowedTools`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`

[x] Subtask 24.2. In `SubagentRunner.ts`, rename the local `candidateNativeTools` variable in the API-request loop to `projectedNativeTools`, and update the `visibleNativeToolNames` calculation to read from `projectedNativeTools`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 24.3. In `SubagentRunner.ts`, replace `const nativeTools = useNativeToolCalls ? candidateNativeTools : undefined` with `const nativeTools = useNativeToolCalls ? promptRegistry.nativeTools : undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 24.4. In `SubagentBuilder.test.ts`, add a test proving `buildNativeTools(...)` with `context.workflowToolSchemaOverride` returns the native tools generated from that override even when the override contains a tool that is not present in the builder's `allowedTools`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Subtask 24.5. In `SubagentRunner.test.ts`, add a test proving the outbound API request receives `promptRegistry.nativeTools` instead of the pre-prompt `SubagentBuilder.buildNativeTools(...)` result when native tool calls are enabled.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 24.6. In `SubagentRunner.test.ts`, add coverage for a child workflow projection with `workflowToolSchemaOverride`, proving the subagent API request sends the workflow-projected native tools and does not send the static subagent allowed-tool native list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

### Phase 16 - Remove Inert Legacy Brainstorming And Select-Target Workflow Surfaces

Pause for QA review before commit.

[x] Task 25. Delete retired brainstorming/select-target workflow tool identifiers, parser surfaces, and inert registry entries.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/capture-brainstorming-topic.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/select-target-epic.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.canonicalization.test.ts`

[x] Subtask 25.1. In `src/shared/tools.ts`, delete these retired `ClineDefaultTool` members: `CONTINUE_BRAINSTORMING_SESSION`, `CREATE_BRAINSTORMING_SESSION`, `SELECT_BRAINSTORMING_SESSION`, `PERSIST_BRAINSTORMING_APPROACH`, `SELECT_RANDOM_BRAINSTORMING_TECHNIQUE`, `PERSIST_BRAINSTORMING_TECHNIQUE`, `REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION`, `PREPARE_BRAINSTORMING_SESSION`, `CAPTURE_BRAINSTORMING_TOPIC`, and `SELECT_TARGET_EPIC`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[x] Subtask 25.2. In `ToolExecutorCoordinator.ts`, delete the `toolHandlersMap` entries for the retired brainstorming/select-target `ClineDefaultTool` members removed in Subtask 25.1.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

[x] Subtask 25.3. In `ResponseToolRegistry.ts`, delete the registry entries for the retired brainstorming/select-target `ClineDefaultTool` members removed in Subtask 25.1.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

[x] Subtask 25.4. In `ResponseToolRuntime.test.ts`, remove the assertions that `ResponseToolRegistry.get(...)` returns `undefined` for the retired brainstorming/select-target tool ids removed in Subtask 25.1.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`

[x] Subtask 25.5. Delete `src/shared/capture-brainstorming-topic.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/capture-brainstorming-topic.ts`

[x] Subtask 25.6. Delete `src/shared/select-target-epic.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/select-target-epic.ts`

[x] Subtask 25.7. In `integration.test.ts`, remove the negative assertion that checks native tool names do not include `capture_brainstorming_topic`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 25.8. In `ToolExecutor.canonicalization.test.ts`, add parser coverage proving `<capture_brainstorming_topic>` and `<select_target_epic>` are not parsed as tool-use blocks after the retired tool ids are removed from `ClineDefaultTool`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.canonicalization.test.ts`

### Phase 17 - Authorize Child Workflow-Owned Tool Execution

Pause for QA review before moving to Phase 18.

[x] Task 26. Allow subagent execution of tools projected by an active child workflow, while continuing to reject direct subagent `use_skill`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 26.1. In `SubagentRunner.ts`, add a private `buildAllowedToolNamesForTurn(context: SystemPromptContext): Set<ClineDefaultTool>` method that creates a `Set<ClineDefaultTool>` from `this.allowedTools`, adds each `toolSpec.id` from `context.workflowToolSchemaOverride ?? []`, deletes `ClineDefaultTool.USE_SKILL`, and returns the set.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 26.2. In `SubagentRunner.ts`, immediately after `context` is built in the API-request loop, add `const allowedToolNamesForTurn = this.buildAllowedToolNamesForTurn(context)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 26.3. In `SubagentRunner.ts`, replace `if (!this.allowedTools.includes(toolName))` with `if (!allowedToolNamesForTurn.has(toolName))`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 26.4. In `SubagentRunner.test.ts`, add coverage proving a child workflow-projected tool that is not in `SUBAGENT_DEFAULT_ALLOWED_TOOLS` is executed instead of rejected.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 26.5. In `SubagentRunner.test.ts`, add coverage proving `use_skill` is still rejected when it appears in `workflowToolSchemaOverride`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

### Phase 18 - Add Workflow-Value Persistence Branch Trigger

Pause for QA review before commit.

[x] Task 27. Make successful `set_workflow_values` writes emit a runtime-owned branch trigger and re-enter next-action evaluation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 27.1. In `types.ts`, add `{ kind: "workflow_values_persisted"; changedKeys: readonly string[] }` to the `WorkflowBranchTriggerEvent` union.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 27.2. In `WorkflowRuntime.ts`, add a private `recordWorkflowValuesPersistedTriggerIfRouted(args: { taskState: TaskState; changedKeys: readonly string[] }): void` helper. The helper must return without mutation when there is no active session, no active workflow definition, no active step, empty project selection, or no route matching a `workflow_values_persisted` trigger; otherwise it must set `session.branchContext.lastTriggerEvent` to `{ kind: "workflow_values_persisted", changedKeys: args.changedKeys }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 27.3. In `WorkflowRuntime.ts`, update `applyWorkflowValueWrites(...)` so after `changedValues` and `unchangedValues` are computed and before the return object is created, it calls `recordWorkflowValuesPersistedTriggerIfRouted(...)` only when `Object.keys(changedValues).length > 0`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 27.4. In `task/index.ts`, inside `presentAssistantMessage(...)` after `const toolExecutionOutcome = await this.toolExecutor.executeTool(block)` and its existing log call, add a branch that checks `block.name === ClineDefaultTool.SET_WORKFLOW_VALUES && toolExecutionOutcome.status === "executed"` and then calls `await this.consumeWorkflowNextAction(await this.workflowRuntime.resolveNextAction({ taskState: this.taskState }))`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 27.5. In `WorkflowRuntime.test.ts`, add coverage proving a changed workflow value can satisfy an `on_event` route for `workflow_values_persisted`, and that `resolveNextAction(...)` then returns the route's configured action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 27.6. In `WorkflowRuntime.test.ts`, add coverage proving changed workflow values with no matching `workflow_values_persisted` route do not mutate `branchContext.lastTriggerEvent`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

### Phase 19 - Remove Static Prompt Exposure For Story Workflow Tools

Pause for QA review before commit.

[x] Task 28. Retire static/default prompt schemas for story workflow tools while preserving backend execution handlers for future module-projected schemas.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/init.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/README.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/story_task_reminder.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/story_task_complete.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/story_notes_update.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/story_testing_complete.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5_native.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_native_next_gen.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/vertex_gemini3.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5_1_native.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-focus-chain.snap`

[x] Subtask 28.1. In `variants/generic/config.ts`, delete `ClineDefaultTool.STORY_TASK_REMINDER`, `ClineDefaultTool.STORY_TASK_COMPLETE`, `ClineDefaultTool.STORY_NOTES_UPDATE`, and `ClineDefaultTool.STORY_TESTING_COMPLETE` from the default tool list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts`

[x] Subtask 28.2. In `variants/gemini-3/config.ts`, delete `ClineDefaultTool.STORY_TASK_REMINDER`, `ClineDefaultTool.STORY_TASK_COMPLETE`, `ClineDefaultTool.STORY_NOTES_UPDATE`, and `ClineDefaultTool.STORY_TESTING_COMPLETE` from the default tool list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts`

[x] Subtask 28.3. In `variants/glm/config.ts`, delete `ClineDefaultTool.STORY_TASK_REMINDER`, `ClineDefaultTool.STORY_TASK_COMPLETE`, `ClineDefaultTool.STORY_NOTES_UPDATE`, and `ClineDefaultTool.STORY_TESTING_COMPLETE` from the default tool list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts`

[x] Subtask 28.4. In `variants/trinity/config.ts`, delete `ClineDefaultTool.STORY_TASK_REMINDER`, `ClineDefaultTool.STORY_TASK_COMPLETE`, `ClineDefaultTool.STORY_NOTES_UPDATE`, and `ClineDefaultTool.STORY_TESTING_COMPLETE` from the default tool list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts`

[x] Subtask 28.5. In `variants/devstral/config.ts`, delete `ClineDefaultTool.STORY_TASK_REMINDER`, `ClineDefaultTool.STORY_TASK_COMPLETE`, `ClineDefaultTool.STORY_NOTES_UPDATE`, and `ClineDefaultTool.STORY_TESTING_COMPLETE` from the default tool list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts`

[x] Subtask 28.6. In `variants/next-gen/config.ts`, delete `ClineDefaultTool.STORY_TASK_REMINDER`, `ClineDefaultTool.STORY_TASK_COMPLETE`, `ClineDefaultTool.STORY_NOTES_UPDATE`, and `ClineDefaultTool.STORY_TESTING_COMPLETE` from the default tool list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts`

[x] Subtask 28.7. In `variants/xs/config.ts`, delete `ClineDefaultTool.STORY_TASK_REMINDER`, `ClineDefaultTool.STORY_TASK_COMPLETE`, `ClineDefaultTool.STORY_NOTES_UPDATE`, and `ClineDefaultTool.STORY_TESTING_COMPLETE` from the default tool list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts`

[x] Subtask 28.8. In `variants/hermes/config.ts`, delete `ClineDefaultTool.STORY_TASK_REMINDER`, `ClineDefaultTool.STORY_TASK_COMPLETE`, `ClineDefaultTool.STORY_NOTES_UPDATE`, and `ClineDefaultTool.STORY_TESTING_COMPLETE` from the default tool list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts`

[x] Subtask 28.9. In `variants/native-gpt-5/config.ts`, delete `ClineDefaultTool.STORY_TASK_REMINDER`, `ClineDefaultTool.STORY_TASK_COMPLETE`, `ClineDefaultTool.STORY_NOTES_UPDATE`, and `ClineDefaultTool.STORY_TESTING_COMPLETE` from the default tool list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`

[x] Subtask 28.10. In `variants/gpt-5/config.ts`, delete `ClineDefaultTool.STORY_TASK_REMINDER`, `ClineDefaultTool.STORY_TASK_COMPLETE`, `ClineDefaultTool.STORY_NOTES_UPDATE`, and `ClineDefaultTool.STORY_TESTING_COMPLETE` from the default tool list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts`

[x] Subtask 28.11. In `variants/native-gpt-5-1/config.ts`, delete `ClineDefaultTool.STORY_TASK_REMINDER`, `ClineDefaultTool.STORY_TASK_COMPLETE`, `ClineDefaultTool.STORY_NOTES_UPDATE`, and `ClineDefaultTool.STORY_TESTING_COMPLETE` from the default tool list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`

[x] Subtask 28.12. In `variants/native-next-gen/config.ts`, delete `ClineDefaultTool.STORY_TASK_REMINDER`, `ClineDefaultTool.STORY_TASK_COMPLETE`, `ClineDefaultTool.STORY_NOTES_UPDATE`, and `ClineDefaultTool.STORY_TESTING_COMPLETE` from the default tool list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts`

[x] Subtask 28.13. In `tools/init.ts`, remove the four story tool variant imports and remove the four story tool variant spreads from `allToolVariants`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/init.ts`

[x] Subtask 28.14. In `tools/index.ts`, remove the four story tool exports.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/index.ts`

[x] Subtask 28.15. Delete `src/core/prompts/system-prompt/tools/story_task_reminder.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/story_task_reminder.ts`

[x] Subtask 28.16. Delete `src/core/prompts/system-prompt/tools/story_task_complete.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/story_task_complete.ts`

[x] Subtask 28.17. Delete `src/core/prompts/system-prompt/tools/story_notes_update.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/story_notes_update.ts`

[x] Subtask 28.18. Delete `src/core/prompts/system-prompt/tools/story_testing_complete.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/story_testing_complete.ts`

[x] Subtask 28.19. In `spec.test.ts`, remove the story tool variant imports and delete the `describes dev-story task completion and notes-update parameters with the locked runtime ids and section values` test.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`

[x] Subtask 28.20. In `tools/README.md`, remove the four story tool names from the listed prompt-system tool surface.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/README.md`

[x] Subtask 28.21. In `docs/system-prompt-tool-reference.md`, remove the four story workflow tool rows.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`

	[x] Subtask 28.22. Regenerate the system-prompt snapshots so static/default prompt output no longer includes `story_task_reminder`, `story_task_complete`, `story_notes_update`, or `story_testing_complete`; update only the listed snapshot files that currently contain those static story tool names.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5_native.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_native_next_gen.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-basic.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-browser.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-mcp.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/vertex_gemini3.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-focus-chain.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5_1_native.tools.snap`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-focus-chain.snap`

### Phase 20 - Runtime-Owned Artifact Allocation And Creation

Pause for QA review before commit.

[x] Task 29. Add the runtime-owned artifact-family registry and typed workflow artifact allocation contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 29.1. Add `src/core/task/workflow-runtime/artifactFamilies.ts` with a typed `WorkflowArtifactFamily` enum and a runtime-owned registry for `Epic`, `Story`, `RemediationStory`, `ReviewBlindHunter`, `ReviewEdgeCaseHunter`, `AdversarialReview`, `ReviewInputMarkdown`, and `ReviewInputDiff`; the registry must define each family's allocation mode, parent or target requirement, filename pattern, file extension, numbering scope, and discovery pattern exactly as required by `FR-20b2`, `FR-20j3`, and `FR-20j4`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`

[x] Subtask 29.2. In `src/core/task/workflow-runtime/types.ts`, replace `WorkflowArtifactDefinition`'s `relativePathPattern`, `initialContent`, and `collisionStrategy` fields with a typed artifact-intent shape that references a runtime-owned artifact family, declares new-versus-derived mode, declares parent or target workflow-value source when required, and declares the workflow-value keys that receive artifact allocation outputs.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 29.3. In `src/core/task/workflow-runtime/types.ts`, extend `WorkflowDecisionBranchAction` with an `allocate_artifact` action that references a workflow artifact definition id; do not route artifact allocation through module-computed filenames or generic string action ids.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 29.4. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update workflow fixtures that currently depend on `relativePathPattern`, `initialContent`, or `append_numeric_suffix` so they use the new artifact-family and output-value-key contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Task 30. Implement artifact numbering, discovery, target validation, empty-file creation, and workflow-value persistence inside `WorkflowRuntime`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/discovery.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 30.1. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, replace `resolveWorkflowArtifactPath(...)` and its relative-path token substitution helpers with a runtime-owned artifact allocation/derivation seam that consumes the active workflow artifact intent plus the runtime-owned artifact-family registry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 30.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, implement convention-driven artifact discovery through the shared discovery/list-builder seam so numbering considers only files matching the selected artifact family's registry-owned discovery pattern.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 30.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, implement project-scoped epic allocation, parent-epic-scoped story allocation, and parent-story-scoped remediation-story allocation using dotted canonical identities and hyphenated filename identities.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 30.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, implement review artifact derivation so review artifacts inherit the selected `Story-{E}-{S}.md` or `Remediation-story-{E}-{S}-{R}.md` target identity exactly and fail through branch-action failure handling when the target is missing or does not match a registry-owned convention.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 30.5. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, create the empty artifact file at the resolved canonical absolute path and persist artifact output workflow values through `applyWorkflowValueWrites(...)` for project title, project filesystem identity or folder, artifact family, artifact identity, artifact filename, artifact relative path, artifact absolute path, and parent or target identity where applicable.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 30.6. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage for epic, story, remediation-story, and review artifact allocation proving canonical identities, canonical filenames, project-relative paths, absolute paths, target inheritance, and persisted workflow values are correct.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 30.7. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving non-matching files do not influence numbering, missing parent or target identities route through branch-action failure handling, and collision suffixing is not used as the canonical numbering policy.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Task 31. Add the backend-only artifact creation execution tool without static prompt/native exposure.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 31.1. In `src/shared/tools.ts`, add the backend workflow execution id `CREATE_WORKFLOW_ARTIFACT = "create_workflow_artifact"` next to the other foundational workflow execution ids, and do not add it to `READ_ONLY_TOOLS` or any prompt/default tool list.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[x] Subtask 31.2. In `src/core/task/tools/backendWorkflowToolContracts.ts`, add the backend contract for `create_workflow_artifact` with a single required string parameter named `artifact_id`; do not include filename, relative path, absolute path, or number parameters.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`

[x] Subtask 31.3. Add `src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts` so the handler rejects partial blocks, rejects calls where `block.isNativeToolCall !== true`, rejects calls whose `call_id` does not start with `workflow_`, delegates artifact numbering/path/persistence to `WorkflowRuntime`, applies the same approval/path policy shape used by file-writing workflow tools before file creation, and returns structured JSON containing the persisted artifact output values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts`

[x] Subtask 31.4. In `src/core/task/tools/ToolExecutorCoordinator.ts`, register `CreateWorkflowArtifactToolHandler` for `ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT` without changing existing handler registration for `set_workflow_values` or `build_workflow_document`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

[x] Subtask 31.5. In `src/core/task/tools/response/ResponseToolRegistry.ts`, add `ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT` with `undefined` response-tool metadata so artifact creation is not treated as a response tool.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

[x] Subtask 31.6. In `src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`, add handler coverage proving the handler rejects partial blocks, rejects non-native tool calls, rejects call ids without the `workflow_` prefix, applies path approval before creating the file, delegates numbering and persistence to `WorkflowRuntime`, and returns the artifact output JSON.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Subtask 31.7. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, add or update native-tool and prompt assertions proving `create_workflow_artifact` is not present in default prompt text or native tool schemas when no active workflow module projects it.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Task 32. Wire artifact allocation into workflow next-action evaluation and document-builder destination resolution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 32.1. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update decision-tree action evaluation so `allocate_artifact` builds a runtime branch-action request for `create_workflow_artifact` and routes success/failure through the existing `branch_action_succeeded` / `branch_action_failed` trigger semantics.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 32.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `buildDocumentBuilderToolRequest(...)` so `build_workflow_document` consumes the artifact's persisted absolute destination path from workflow values instead of computing a filename or path from module-provided artifact patterns.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 32.3. In `src/core/task/workflow-runtime/types.ts`, update `WorkflowDocumentBuilderDefinition` so document builders reference the workflow artifact output path value produced by allocation and no longer imply document builders own output path construction.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 32.4. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, replace document-builder path-pattern expectations with coverage proving a document builder writes to the previously allocated artifact absolute path and that `build_workflow_document` remains content-only.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Task 33. Remove obsolete artifact-pattern tests and add final runtime artifact validation coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 33.1. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, delete assertions that treat `relativePathPattern`, `initialContent`, or `append_numeric_suffix` as module-owned artifact naming behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 33.2. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add definition-validation coverage proving modules may reference only registry-owned artifact-family ids and may not provide filename patterns, extensions, numbering scopes, or discovery regexes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 33.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, extend workflow definition validation so artifact intents reject unknown artifact-family ids, missing required parent or target sources, missing output workflow-value keys, and output keys absent from the workflow's canonical `workflowValueKeys`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

## Phase 21 - Serialized Deterministic Tool Failure Classification

[x] Task 34. Ensure serialized deterministic tool denial/error results cannot advance runtime success branches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/responses.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/__tests__/responses.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 34.1. In `src/core/prompts/responses.ts`, at current lines 204-206, replace the inline `toolDenied` and `toolError` response strings with file-local constants while preserving byte-for-byte output.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/responses.ts`

[x] Subtask 34.2. In `src/core/prompts/responses.ts`, add one exported helper that classifies serialized tool failure result text using the constants introduced in Subtask `34.1`. It must return failure for missing/empty text, legacy `Error:` text, `toolDenied()` output, and `toolError(...)` output.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/responses.ts`

[x] Subtask 34.3. In `src/core/prompts/__tests__/responses.test.ts`, add coverage proving the helper classifies `formatResponse.toolDenied()`, `formatResponse.toolError("boom")`, empty text, and legacy `Error:` text as failures, while normal success text is not a failure.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/__tests__/responses.test.ts`

[x] Subtask 34.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, at current lines 318-320, short-circuit `session.ui.stepResolutionSession` handling through the shared failure classifier before calling `evaluateToolExecutionResult(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 34.5. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, replace the inline failure check at current line 346 with the shared failure classifier while preserving the existing form-restore behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 34.6. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, replace the inline failure check at current line 372 with the shared failure classifier and keep the failure routed through `completeBranchActionFailure(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 34.7. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, replace the inline failure check at current line 391 with the shared failure classifier and keep the failure routed through `completeBranchActionFailure(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 34.8. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add generic branch-action coverage proving `formatResponse.toolDenied()` and `formatResponse.toolError("boom")` route through `branch_action_failed`, even when the branch-action definition evaluator would otherwise return success.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 34.9. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add workflow-form deterministic operation coverage proving denied/error tool results preserve the form retry path instead of advancing.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 34.10. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add artifact-allocation coverage proving denied/error tool results route through `branch_action_failed`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 34.11. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add document-builder coverage proving denied/error tool results route through `branch_action_failed`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

## Phase 22 - Create Workflow Artifact Workflow-Projected Invocation

[x] Task 35. Align `create_workflow_artifact` with the workflow-projected tool pattern used by `set_workflow_values` while preserving runtime deterministic artifact allocation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`

[x] Subtask 35.1. In `src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts`, remove the `block.isNativeToolCall !== true` rejection so `create_workflow_artifact` can execute when the active workflow module exposes it through the runtime-projected tool schema for a non-native/model-authored call.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts`

[x] Subtask 35.2. In `src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts`, remove the `block.call_id` / `workflow_` prefix rejection so tool authorization is not based on runtime-issued call-id shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts`

[x] Subtask 35.3. In `src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts`, preserve the existing partial-block rejection, non-empty `artifact_id` parameter validation, path approval before file creation, pre-tool-use hook execution, `WorkflowRuntime.prepareWorkflowArtifactCreation(...)` delegation, `WorkflowRuntime.createWorkflowArtifact(...)` delegation, file-read cache invalidation, `didEditFile` mutation, consecutive-mistake reset on success, and structured JSON output.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts`

[x] Subtask 35.4. In `src/core/task/tools/autoApprove.ts`, add `ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT` to the same global-yolo, auto-approve-all, and `autoApprovalSettings.actions.editFiles` branches that already include `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`, because artifact creation creates a file and must obey the existing edit-file approval policy.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`

[x] Subtask 35.5. In `src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`, replace the assertions that expect non-native calls and non-`workflow_` call ids to be rejected with coverage proving a non-native/model-authored `create_workflow_artifact` call succeeds when workflow state is valid.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Subtask 35.6. In `src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`, add or preserve coverage proving a native/runtime-authored `create_workflow_artifact` call succeeds when workflow state is valid.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Subtask 35.7. In `src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`, preserve coverage proving partial blocks are rejected, missing or blank `artifact_id` fails before runtime allocation, approval is requested before file creation when auto-approval is unavailable, the real workflow runtime creates the empty artifact file, numbering/path/persistence remain delegated to `WorkflowRuntime`, and the handler returns structured artifact output JSON.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Subtask 35.8. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, keep the default/global absence coverage for `create_workflow_artifact` and add workflow-projected schema coverage proving `create_workflow_artifact` appears in the workflow-projected native tool surface when native tools are enabled, and in the workflow-projected non-native prompt/tool surface when native tools are disabled, only when supplied through `workflowToolSchemaOverride`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 35.9. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, preserve deterministic `allocate_artifact` coverage proving runtime-authored artifact creation still builds a `ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT` tool request and routes success/failure through next-action evaluation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 35.10. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add or update coverage proving `create_workflow_artifact` can execute as a child workflow-projected tool even though it is absent from the static subagent default allowed tools, matching the existing `set_workflow_values` workflow-projected tool pattern.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 35.11. In `docs/system-prompt-tool-reference.md`, add `create_workflow_artifact` to the workflow runtime tool projection reference without adding it to the normal prompt tool catalog, and describe it as visible only when supplied by the active workflow module's complete per-turn schema.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`

## Phase 23 - Workflow Form Durable Value Persistence

[x] Task 36. Align workflow-form submitted-value persistence with `FR-39f` through `FR-39i` by making durable workflow-value destinations explicit, keeping form field keys form-local by default, and preserving the runtime-owned shared entry project-selection gate so later next-action evaluation can consume persisted workflow/session state under `FR-39j`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/__tests__/index.test.ts`

[x] Subtask 36.1. In `src/shared/ExtensionMessage.ts`, extend `WorkflowFormFieldDefinition` with an explicit optional workflow-value destination key field named `workflowValueKey?: string` immediately after the existing `key: string` field; do not change the existing form field `key` semantics.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`

[x] Subtask 36.2. In `src/core/task/workflow-runtime/types.ts`, add a `WorkflowEntryProjectValueKeys` interface with `projectMode`, `projectTitle`, and `projectFolderName` string fields, then add required `entryProjectValueKeys: WorkflowEntryProjectValueKeys` to `WorkflowDefinition` immediately after `workflowValueKeys`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 36.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, extend `validateWorkflowDefinition(...)` so each `WorkflowDefinition.entryProjectValueKeys` value must be non-empty, already trimmed, and present in the workflow's canonical `workflowValueKeys`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 36.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, extend `validateWorkflowDefinition(...)` so every `workflowValueKey` declared on fields in `workflow.workflowForms` must be non-empty, already trimmed, and present in the workflow's canonical `workflowValueKeys`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 36.5. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, replace `collectWorkflowValueWritesFromFormSession(...)` so it walks `formSession.definitionPayload.panels[*].fields[*]`, reads submitted values by form-local field `key`, and writes only fields with a declared `workflowValueKey` destination into the returned workflow-value write map.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 36.6. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, rename `persistWorkflowFormSelections(...)` to `persistWorkflowFormValues(...)` and update all call sites in `submitWorkflowForm(...)` so the method name reflects generalized form-value persistence rather than selection-specific persistence.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 36.7. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `handleWorkflowEntryFormOutcome(...)` so successful shared entry project selection still assigns `session.projectSelection`, but also persists normalized `projectMode`, `projectTitle`, and `projectFolderName` through `applyWorkflowValueWrites(...)` using the active workflow definition's `entryProjectValueKeys`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 36.8. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving active-step workflow form fields without `workflowValueKey` remain form-local and do not create workflow values, even when the field key matches an entry in `workflow.workflowValueKeys`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 36.9. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving active-step typed fields and runtime-populated selector fields persist through the same `workflowValueKey` destination path when their destination keys are declared in `workflow.workflowValueKeys`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 36.10. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving shared entry project selection writes normalized project mode, project title, and project folder name into `session.workflowValues` through `entryProjectValueKeys` while preserving the existing `session.projectSelection` behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 36.11. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add validation coverage proving workflow definitions are rejected when an `entryProjectValueKeys` value or workflow-form field `workflowValueKey` is blank, untrimmed, or absent from `workflow.workflowValueKeys`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 36.12. In the workflow-definition fixture builders in `WorkflowRuntime.test.ts`, `SubagentRunner.test.ts`, `CreateWorkflowArtifactToolHandler.test.ts`, and `slash-commands/__tests__/index.test.ts`, add declared `entryProjectValueKeys` values and matching `workflowValueKeys` entries so test fixtures satisfy the required `WorkflowDefinition` contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/__tests__/index.test.ts`

Pause for QA review after completing Phase 23 before treating the foundational action plan as ready for final validation.

## Phase 24 - Retire Workflow-Form Operation Mapping And Isolate Tool-Backed Operations

Phase 24 supersedes earlier checked branch-action and pending-form-operation instructions in this action plan. Do not preserve `branch-action`, `execute_branch_action`, `pendingWorkflowFormOperation`, `invoke_deterministic_operation`, or workflow-form `operationId` concepts for compatibility.

[x] Task 37. Remove the workflow-form `operationId` to tool-call mapping path, delete stale branch-action terminology from the active runtime execution path, and enforce `FR-16a` through `FR-16d` so direct runtime-owned deterministic procedures are not modeled as tool calls solely to fit next-action evaluation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/__tests__/index.test.ts`

[x] Subtask 37.1. In `src/shared/ExtensionMessage.ts`, remove `operationId`, `defaultOperationId`, and the entire `{ type: "deterministic_operation", ... }` union member from `WorkflowFormTransitionDefinition`, leaving workflow-form transitions limited to panel navigation, completion, stale-value clearing, and terminal form behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`

[x] Subtask 37.2. In `src/core/task/workflow-form/types.ts`, remove the `invoke_deterministic_operation` union member from `WorkflowFormRuntimeOutcome` so the workflow form runtime can no longer return an operation/tool request.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/types.ts`

[x] Subtask 37.3. In `src/core/task/workflow-form/WorkflowFormRuntime.ts`, remove `operationId` from the internal transition-outcome shape and from `resolveTransitionOutcome(...)` so conditional and sequential transitions can no longer resolve to an operation id.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`

[x] Subtask 37.4. In `src/core/task/workflow-form/WorkflowFormRuntime.ts`, remove the `transitionOutcome.operationId` branch in `handleSubmission(...)` so form submission results can only render a form or complete successfully.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`

[x] Subtask 37.5. In `src/core/task/workflow-form/WorkflowFormRuntime.ts`, remove validation or helper logic that specifically recognizes `transition.type === "deterministic_operation"` because that transition type no longer exists.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`

[x] Subtask 37.6. In `src/core/task/workflow-runtime/types.ts`, delete `WorkflowPendingFormOperationState` and remove `pendingWorkflowFormOperation` from `ActiveWorkflowSession`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 37.6a. In `src/core/task/workflow-step-resolution/types.ts`, rename the active branch-action contracts to tool-backed operation contracts: `WorkflowBranchActionEvaluationResult` becomes `WorkflowToolBackedOperationEvaluationResult`, `WorkflowBranchActionToolExecutionRequest` becomes `WorkflowToolBackedOperationExecutionRequest`, `WorkflowBranchActionDefinition` becomes `WorkflowToolBackedOperationDefinition`, and `WorkflowStepResolutionTriggerSource` must use the literal `"execute_tool_backed_operation"` instead of `"execute_branch_action"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/types.ts`

[x] Subtask 37.6b. In `src/core/task/workflow-step-resolution/types.ts`, update `WorkflowToolBackedOperationDefinition.buildToolExecutionRequest(...)` to accept one object argument shaped as `{ toolBackedOperationSession: WorkflowStepResolutionSessionState; activeWorkflowSession: ActiveWorkflowSession }`, using a type-only import for `ActiveWorkflowSession`, so tool-backed operation payload builders can read persisted workflow values and project selection from runtime session state.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/types.ts`

[x] Subtask 37.6c. In `src/core/task/workflow-runtime/types.ts`, rename `WorkflowBranchActionId` to `WorkflowToolBackedOperationId`, rename `WorkflowExecuteBranchActionNextAction` to `WorkflowExecuteToolBackedOperationNextAction`, rename the next-action payload property `branchActionSession` to `toolBackedOperationSession`, and replace the next-action kind literal `"execute_branch_action"` with `"execute_tool_backed_operation"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 37.6d. In `src/core/task/workflow-runtime/types.ts`, replace the overloaded decision-tree action `{ kind: "execute_branch_action"; branchActionId: ... }` with `{ kind: "execute_tool_backed_operation"; toolBackedOperationId: WorkflowToolBackedOperationId }`, add a separate `{ kind: "build_workflow_document"; documentBuilderId: string }` decision action for document builders, and keep `{ kind: "allocate_artifact"; artifactId: string }` as the dedicated artifact-creation decision action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 37.6e. In `src/core/task/workflow-runtime/types.ts`, rename `WorkflowDefinition.branchActionDefinitions` to `toolBackedOperationDefinitions` and type it as `Record<WorkflowToolBackedOperationId, WorkflowToolBackedOperationDefinition>`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 37.6f. In `src/core/task/workflow-runtime/types.ts`, rename trigger events `branch_action_succeeded` and `branch_action_failed` to `tool_backed_operation_succeeded` and `tool_backed_operation_failed`, and rename the event payload field `branchActionId` to `toolBackedOperationId`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 37.6f1. In `src/core/task/workflow-runtime/types.ts`, rename the `WorkflowRuntimeErrorCategory` literal `"branch_action"` to `"tool_backed_operation"` so diagnostics cannot preserve the retired branch-action concept.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 37.6g. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update the generic tool-backed operation execution path to call `operationDefinition.buildToolExecutionRequest({ toolBackedOperationSession: stepResolutionSession, activeWorkflowSession: session })` and do not pass raw workflow-form session state or raw form submission payloads to tool-backed operation payload builders.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 37.6h. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, replace the `execute_branch_action` switch case with three explicit cases: `execute_tool_backed_operation` for module-owned generic tool-backed operations, `build_workflow_document` for runtime document-builder execution through the shared document builder seam, and `allocate_artifact` for runtime artifact creation through `create_workflow_artifact`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 37.6i. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, rename active helper methods and local variables that currently carry branch-action terminology so they describe tool-backed operation execution: `handleBranchActionToolResult(...)`, `buildBranchActionStatusPayload(...)`, `createBranchActionSession(...)`, `normalizeBranchActionFailureMessage(...)`, `completeBranchActionSuccess(...)`, `completeBranchActionFailure(...)`, `findPendingDocumentBuilderBranchActionId(...)`, and `findPendingArtifactAllocationBranchActionId(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 37.6j. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update workflow-definition validation so `execute_tool_backed_operation` actions must reference `toolBackedOperationDefinitions`, `build_workflow_document` actions must reference a document builder id listed in the active step's `documentBuilderIds`, and `allocate_artifact` actions must reference an artifact definition; do not allow document builders to be reached through generic tool-backed operation definitions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 37.6k. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, add definition validation that rejects any `toolBackedOperationDefinitions` entry whose `toolName` is `ClineDefaultTool.SET_WORKFLOW_VALUES`, `ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT`, `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`, or `ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST`, because those ids are governed by dedicated runtime seams or model-facing workflow projection rather than generic module-owned tool-backed operation definitions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 37.6l. In `src/core/task/index.ts`, consume `nextAction.kind === "execute_tool_backed_operation"` instead of `"execute_branch_action"`, read `nextAction.toolBackedOperationSession`, call the renamed runtime status/result methods, and preserve execution through the existing `toolExecutor.executeTool(...)` path with exactly one tool request.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 37.7. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, remove `pendingWorkflowFormOperation: undefined` from workflow session initialization because pending form operations are no longer part of runtime session state.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 37.8. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, remove the `invoke_deterministic_operation` branch from `submitWorkflowForm(...)` and leave form submission to persist declared form values, update form UI state, record `workflow_form_completed` when applicable, and re-enter `resolveNextAction(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 37.9. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, remove the workflow-form pending-operation branch from `handleBranchActionToolResult(...)`, including form-specific failure restore, terminal suppression, and next-panel restoration behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 37.10. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, remove pending workflow-form operation checks from `resolveDecisionTreeContinuationRoute(...)` so route matching is based on current workflow/session state and module-owned next-action events only.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 37.11. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, remove the `render_workflow_form` case logic in `buildNextActionFromDecisionTreeAction(...)` that converts `pendingWorkflowFormOperation.operationId` into an `execute_branch_action` tool request with empty `toolInput` and `toolParams`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 37.12. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, remove pending workflow-form operation cleanup assignments from workflow entry handling, step transitions, teardown, restore, or other lifecycle paths because the session field no longer exists.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 37.13. In `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`, replace deterministic-operation transition fixtures and assertions with sequential or terminal workflow-form transitions that prove the generic form runtime validates submissions, clears stale values/data, navigates panels, and completes without producing operation/tool requests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

[x] Subtask 37.14. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, delete tests that assert pending workflow-form operations are persisted, restored, converted into `execute_branch_action`, retried through form restore, or cleared after tool-result handling.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 37.15. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving a workflow form submission with declared `workflowValueKey` destinations persists values, records the appropriate form-completion or workflow-values-persisted state, re-enters next-action evaluation, and then a normal module-owned next-action rule emits exactly one `execute_tool_backed_operation` whose operation definition builds its tool payload from `activeWorkflowSession.workflowValues` passed into `buildToolExecutionRequest(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 37.16. In workflow-runtime and tool test fixtures that manually construct `ActiveWorkflowSession`, remove `pendingWorkflowFormOperation: undefined` because that field is no longer part of the session contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Subtask 37.17. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update branch-action helper names, event-kind assertions, decision-action fixtures, and next-action kind assertions to the final tool-backed operation terminology introduced in Subtasks `37.6a` through `37.6f`; do not leave compatibility aliases or duplicate old-name helpers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 37.18. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add definition-validation coverage proving generic `toolBackedOperationDefinitions` cannot use `set_workflow_values`, `create_workflow_artifact`, `build_workflow_document`, or `workflow_progress_request`, and proving document builders must be reached through the dedicated `build_workflow_document` decision action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 37.19. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving direct runtime-owned deterministic procedures do not emit tool-backed operation requests: selector discovery/form option population, declared workflow-form value persistence, shared entry project-selection persistence/folder creation, completion detection, teardown, and next-action re-evaluation must stay inside `WorkflowRuntime` or shared runtime-owned seams.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 37.20. In non-runtime test fixtures that manually construct workflow definitions, replace `branchActionDefinitions`, `execute_branch_action`, `branchActionId`, `branch_action_succeeded`, and `branch_action_failed` with the final tool-backed operation names introduced in Subtasks `37.6a` through `37.6f`; do not leave compatibility aliases in test fixture builders.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/slash-commands/__tests__/index.test.ts`

Pause for QA review after completing Phase 24 before treating the foundational action plan as ready for final validation.

## Phase 25 - Persist Runtime Teardown And Invalid Resume Cleanup

Pause for QA review after completing Phase 25 before treating the foundational action plan as ready for final validation.

[x] Task 38. Make workflow teardown persistence explicit for invalid resolve and invalid resume paths.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 38.1. In `src/core/task/workflow-runtime/types.ts`, add `WorkflowPersistWorkflowTeardownNextAction` with `kind: "persist_workflow_teardown"` and include it in the `WorkflowNextAction` union.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 38.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, add a private `teardownWorkflowAndRequirePersistence(args: { taskState: TaskState }): Promise<WorkflowNextAction>` helper immediately after `teardownWorkflow(...)`; the helper must call `await this.teardownWorkflow({ taskState: args.taskState })` and then return `{ kind: "persist_workflow_teardown" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 38.3. In `WorkflowRuntime.resolveNextAction(...)`, replace the three invalid state-changing teardown branches for missing workflow definition, invalid workflow definition, and missing active step so each returns `await this.teardownWorkflowAndRequirePersistence({ taskState })` instead of calling `teardownWorkflow(...)` and returning `{ kind: "no_op" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 38.4. In `WorkflowRuntime.restorePersistedSession(...)`, keep the existing `Promise<WorkflowNextAction | undefined>` return type, and replace the four invalid persisted-session teardown branches for missing workflow definition, invalid workflow definition, missing active step, and missing active branch so each returns `await this.teardownWorkflowAndRequirePersistence({ taskState })` instead of calling `teardownWorkflow(...)` and returning `undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 38.5. In `src/core/task/index.ts`, update `consumeWorkflowNextAction(...)` so `nextAction.kind === "persist_workflow_teardown"` calls `await this.persistWorkflowRuntimeMetadata()` and then returns; keep the existing `no_op` branch as a return-only path for cases where no workflow state changed.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 38.6. In `src/core/task/index.ts`, update `restoreWorkflowRuntimeStateFromMetadata(metadata)` so it stores the result from `await this.workflowRuntime.restorePersistedSession(...)`; when that result has `kind === "persist_workflow_teardown"`, clear `metadata.activeWorkflowName`, set `metadata.activeWorkflowSession = undefined`, call `removeLegacyWorkflowRuntimeMetadata(metadata)`, save metadata through `await saveTaskMetadata(this.taskId, metadata)`, and return.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 38.7. In `src/core/task/index.ts`, preserve the existing stale-name cleanup in `restoreWorkflowRuntimeStateFromMetadata(metadata)` for the case where `metadata.activeWorkflowName` exists and `metadata.activeWorkflowSession` is absent; keep that branch after the new `persist_workflow_teardown` branch so invalid sessions with both fields present are handled by the explicit runtime teardown outcome first.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 38.8. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update restore tests so missing workflow definition, invalid workflow definition, invalid active step, and invalid active branch each return `persist_workflow_teardown` and clear `taskState.activeWorkflowName`, `taskState.activeWorkflowSession`, and `taskState.currentFocusChainChecklist`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 38.9. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add resolve-next-action tests proving missing workflow definition, invalid workflow definition, and missing active step each return `persist_workflow_teardown`; also assert that the true no-active-workflow path still returns `no_op`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 38.10. In `src/core/task/__tests__/workflow-runtime-metadata.test.ts`, add task-level metadata restore coverage proving invalid persisted workflow metadata with both `activeWorkflowName` and `activeWorkflowSession` is saved back with both workflow metadata fields cleared after `restoreWorkflowRuntimeStateFromMetadata(...)` handles a `persist_workflow_teardown` result.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 38.11. In `src/core/task/__tests__/workflow-runtime-metadata.test.ts`, add task-level next-action consumption coverage proving `consumeWorkflowNextAction({ kind: "persist_workflow_teardown" })` calls the existing metadata persistence path and that `consumeWorkflowNextAction({ kind: "no_op" })` does not persist.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 38.11a. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, remove the unnecessary `as any` assertions from the workflow-value inventory test by asserting directly against `firstWrite.changedValues`, `firstWrite.unchangedValues`, `secondWrite.changedValues`, `secondWrite.unchangedValues`, `noOverrideWrite.changedValues`, and `noOverrideWrite.unchangedValues`. Do not introduce replacement type assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 38.12. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, review all remaining direct calls to `teardownWorkflow(...)`; leave completion teardown paths that already return `complete_workflow`, direct tests, and helper-internal calls intact, but do not leave any invalid resolve or invalid restore path that calls `teardownWorkflow(...)` followed only by `{ kind: "no_op" }` or `undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 38.13. In `WorkflowRuntime.resolveNextAction(...)`, after `activeStep` is resolved and before `this.refreshCurrentFocusChainChecklist(taskState)`, add live active-branch validation: if `activeStep.decisionTree.branches[session.branchContext.activeBranchId] === undefined`, return `this.teardownWorkflowAndRequirePersistence({ taskState })`. Do not fall back to the decision-tree entry branch for invalid live active-branch state.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 38.14. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add live resolve coverage proving an active session whose `branchContext.activeBranchId` is absent from the active step decision tree returns `persist_workflow_teardown` and clears `activeWorkflowName`, `activeWorkflowSession`, and `currentFocusChainChecklist`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

## Phase 26 - Pre-Commit Hygiene Cleanup

Pause for QA review after completing Phase 26 before commit.

[x] Task 39. Remove staged Biome diagnostics from workflow-runtime touched tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

[x] Subtask 39.1. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, delete the unused `getNativeFunctionDescription(...)` helper entirely. Do not rename it with an underscore.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 39.2. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, format the workflow projection fixture so the `continuationTurnWorkflowSystemInstructionsBlock` property is one line: `continuationTurnWorkflowSystemInstructionsBlock: "## WORKFLOW CONTINUATION IDENTITY\nRole: Review Workflow",`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 39.3. In `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`, add type-only imports for `ToolUse` from `@/core/assistant-message` and `ClineMessage` from `@/shared/ExtensionMessage`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

[x] Subtask 39.4. In `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`, replace `lastFollowupMessage?: any` with `lastFollowupMessage?: ClineMessage`, and type the `clineMessages` local as `ClineMessage[]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

[x] Subtask 39.5. In `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`, update both `lastFollowupMessage` fixtures to be valid `ClineMessage` objects with `ts`, `type: "ask"`, `ask: "followup"`, and `text: "{}"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

[x] Subtask 39.6. In `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`, add a `createWorkflowProgressRequestToolUse(): ToolUse` helper that returns `{ type: "tool_use", name: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST, params: {}, partial: false }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

[x] Subtask 39.7. In `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`, replace each inline `workflow_progress_request` tool-use object cast with `createWorkflowProgressRequestToolUse()`. Do not introduce replacement type assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

[x] Subtask 39.8. In `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`, format the `assert.equal(...)` for `workflow_progress_request could not advance the active workflow step.` as one line: `assert.equal(result, formatResponse.toolError("workflow_progress_request could not advance the active workflow step."))`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

## Phase 27 - Typed Workflow Values And Durable Form Persistence

Pause for QA review after completing Phase 27 before commit.

[x] Task 40. Implement JSON-safe workflow-value persistence across the runtime, workflow forms, and workflow tool handlers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/SetWorkflowValuesToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/SetWorkflowValuesToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContractTypes.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/schema.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/schema.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/storyTaskDocument.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 40.1. In `src/core/task/workflow-runtime/types.ts`, replace `export type WorkflowValue = string` with a recursive JSON-safe workflow-value type that supports `string`, `number`, `boolean`, arrays of workflow values, and object maps whose property values are workflow values. Keep `export type WorkflowValues = Record<string, WorkflowValue>` unchanged except for consuming the widened `WorkflowValue` alias.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 40.2. Add `src/core/task/workflow-runtime/workflowValues.ts` exporting these exact helpers: `isWorkflowValue(value: unknown): value is WorkflowValue` validates recursive JSON-safe workflow values; `areWorkflowValuesEqual(left: WorkflowValue | undefined, right: WorkflowValue): boolean` compares JSON-safe values with deterministic deep equality; `readRequiredStringWorkflowValue(args: { workflowValues: WorkflowValues; key: string; context: string }): string` returns a trimmed non-empty string workflow value or throws a clear error naming the key and context; and `stringifyWorkflowValueForPrompt(value: WorkflowValue): string` renders strings as-is, numbers and booleans with `String(value)`, and arrays/objects as stable JSON with deterministic object-key ordering. Import `WorkflowValue` and `WorkflowValues` as type-only imports from `./types`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflowValues.ts`

[x] Subtask 40.2a. In `src/core/task/workflow-runtime/types.ts`, add `renderWorkflowValue(value: WorkflowValue): string` to `WorkflowPromptBuilderInput` so workflow-module prompt builders receive the runtime-owned deterministic workflow-value renderer instead of implementing their own value rendering.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 40.2b. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, import `stringifyWorkflowValueForPrompt` from `./workflowValues`, update `buildTurnProjection(...)` so it builds one `WorkflowPromptBuilderInput` object shaped as `{ session, step: activeStep, renderWorkflowValue: stringifyWorkflowValueForPrompt }`, then passes that object to both `activeStep.buildPromptSource(...)` and `activeStep.buildToolSchema(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 40.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, import `areWorkflowValuesEqual` and `isWorkflowValue` from `./workflowValues`, then revise `applyWorkflowValueWrites(...)` so it no longer calls `.trim()` on each raw workflow value, rejects any value that fails `isWorkflowValue(...)`, compares existing and incoming values with `areWorkflowValuesEqual(...)`, preserves changed values with their original JSON-safe type and shape, and keeps authorization based only on the active workflow definition's `workflowValueKeys`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 40.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, replace `convertWorkflowFormSubmittedValueToWorkflowValue(...)` so its return type is exactly `{ ok: true; value: WorkflowValue } | { ok: false; errorMessage: string }` rather than `string | undefined`; successful results must carry a `WorkflowValue` converted from `string`, `boolean`, `integer`, `number`, `array`, or `object` submitted values, and failed results must carry an error message naming the unsupported or malformed submitted value type.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 40.5. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `collectWorkflowValueWritesFromFormSession(...)` so every field with a declared `workflowValueKey` either writes the successfully converted `WorkflowValue` into the returned `WorkflowValues` map or throws `new Error(conversion.errorMessage)` when `convertWorkflowFormSubmittedValueToWorkflowValue(...)` returns `{ ok: false, ... }`; do not silently continue when a declared durable form value cannot be normalized.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 40.6. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, import `readRequiredStringWorkflowValue` from `./workflowValues`, then replace artifact identity and artifact destination reads that currently call `.trim()` directly on `session.workflowValues[...]` with `readRequiredStringWorkflowValue({ workflowValues: session.workflowValues, key: ..., context: ... })`; the updated context text must clearly identify whether the value is needed for artifact identity or artifact destination resolution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 40.7. In `src/core/task/tools/handlers/SetWorkflowValuesToolHandler.ts`, update `readWorkflowValues(...)` so the `values` parameter accepts either a non-empty object map or a JSON string that parses to a non-empty object map, rejects malformed JSON, array roots, null roots, empty objects, and non-JSON-safe property values, validates every parsed value with `isWorkflowValue(...)`, and preserves the original JSON-safe value type and shape before passing values to `WorkflowRuntime.applyWorkflowValueWrites(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/SetWorkflowValuesToolHandler.ts`

[x] Subtask 40.7a. Add `src/core/task/tools/handlers/__tests__/SetWorkflowValuesToolHandler.test.ts` with coverage proving `set_workflow_values` persists JSON-safe string, number, boolean, array, and object values when `values` is supplied as a JSON string, still persists the same values when `values` is supplied as an object, and rejects malformed JSON, array-root JSON, empty-object JSON, and non-JSON-safe property values before calling `WorkflowRuntime.applyWorkflowValueWrites(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/SetWorkflowValuesToolHandler.test.ts`

[x] Subtask 40.8. In `src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`, update `parseRequest(...)` so optional `workflow_value_writes` accepts either a non-empty object map or a JSON string that parses to a non-empty object map, rejects malformed JSON, array roots, null roots, empty objects, and non-JSON-safe property values, validates every parsed value with `isWorkflowValue(...)`, preserves the original JSON-safe value type and shape before calling `WorkflowRuntime.applyWorkflowValueWrites(...)`, and keeps the invalid-parameter error text aligned to JSON-safe workflow values rather than string-only values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`

[x] Subtask 40.8a. In `src/core/task/tools/backendWorkflowToolContractTypes.ts`, add `"number"` to the `BackendWorkflowToolSchemaNode.type` union so backend workflow tool contracts can represent the JSON-safe workflow-value number type.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContractTypes.ts`

[x] Subtask 40.8b. In `src/shared/ExtensionMessage.ts`, add `"number"` to `WorkflowFormJsonSchemaType` so workflow-form JSON schemas can represent backend workflow tool contract number values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`

[x] Subtask 40.8c. In `src/core/task/workflow-form/schema.ts`, update `deriveWorkflowFormFieldKind(...)` so schema type `"number"` returns `"number"`, and update `validateToolInputAgainstWorkflowFormSchema(...)` so schema type `"number"` accepts only finite JavaScript numbers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/schema.ts`

[x] Subtask 40.8d. In `src/core/task/workflow-form/__tests__/schema.test.ts`, replace the string-only `set_workflow_values` additionalProperties assertion with coverage proving the workflow-value additionalProperties schema accepts JSON-safe workflow values, including string, number, boolean, array, and object values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/schema.test.ts`

[x] Subtask 40.8e. In `src/core/task/workflow-form/schema.ts`, replace the lossy nested array/object branches in `normalizeWorkflowFormSubmittedValue(...)` so malformed nested values throw explicit errors instead of being dropped by `.filter(...)`; array normalization must throw when any nested entry cannot be normalized, and object normalization must throw when any entry key is blank after trimming or any nested entry value cannot be normalized.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/schema.ts`

[x] Subtask 40.8f. In `src/core/task/workflow-form/__tests__/schema.test.ts`, add coverage proving `normalizeWorkflowFormSubmittedValue(...)` throws for malformed nested array entries and malformed nested object entry values instead of returning truncated arrays or objects.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/schema.test.ts`

[x] Subtask 40.8g. In `src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts`, add coverage proving `build_workflow_document` applies JSON-safe workflow value writes when `workflow_value_writes` is supplied as a JSON string, still applies the same values when `workflow_value_writes` is supplied as an object, and rejects malformed JSON, array-root JSON, empty-object JSON, and non-JSON-safe property values before calling `WorkflowRuntime.applyWorkflowValueWrites(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts`

[x] Subtask 40.9. In `src/core/task/tools/backendWorkflowToolContracts.ts`, replace the string-only `additionalProperties: { type: "string" }` schema for `set_workflow_values.values` and `build_workflow_document.workflow_value_writes` with a recursive JSON-safe schema node that allows strings, numbers, booleans, arrays, and objects whose values are workflow values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`

[x] Subtask 40.10. In `src/core/task/story-tools/storyTaskDocument.ts`, import `WorkflowValues` from `@/core/task/workflow-runtime/types`, update `resolveActiveStoryPath(...)` so it accepts `workflowValues?: WorkflowValues`, and replace every direct optional `.trim()` call on workflow values with explicit string checks: `story_path` must be `typeof value === "string"` and non-empty after trimming or the function must return the existing missing-`story_path` error; `cwd`, `project_root`, and `project-root` may contribute to `resolutionBase` only when their stored workflow value is a string.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/story-tools/storyTaskDocument.ts`

[x] Subtask 40.11. In `src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts`, replace every direct optional `.trim()` call on workflow values with explicit string checks: `review_input` and `story_path` must be `typeof value === "string"` and non-empty after trimming or the handler must return the existing missing-`review_input` and missing-`story_path` error messages; `cwd`, `project_root`, and `project-root` may contribute to `resolutionBase` only when their stored workflow value is a string.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts`

[x] Subtask 40.12. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving active-step workflow-form submissions persist declared durable string, number, boolean, array, and object values through `workflowValueKey` destinations; assert arrays and objects are stored as typed values rather than stringified JSON.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 40.13. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving `applyWorkflowValueWrites(...)` treats an unchanged typed array or object as unchanged through deterministic deep equality and records a changed value when any nested JSON-safe value differs.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 40.14. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add or update coverage proving malformed top-level values, malformed nested array entries, and malformed nested object entry values with declared `workflowValueKey` destinations fail explicitly and do not persist missing, skipped, or truncated workflow values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 40.15. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving string-only runtime consumers reject non-string workflow values clearly when artifact identity or artifact destination resolution requires a string workflow value.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Task 41. Unblock repository validation for the workflow progress request handler test.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

[x] Subtask 41.1. In `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`, before each `JSON.parse(lastFollowupMessage.text)` assertion, add an explicit string guard that throws a test error if `lastFollowupMessage.text` is not a string, then parse the guarded string variable. Do not use type assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

[x] Subtask 41.2. In `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`, replace the `as unknown as TaskConfig` test config assertion with a typed `TaskConfig` object or the existing `validateTaskConfig(config)` test helper pattern used by sibling handler tests. Do not introduce replacement type assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

## Phase 28 - Workflow File Path Policy Enforcement

Pause for QA review after completing Phase 28 before commit.

[x] Task 42. Enforce the existing `ToolValidator.checkClineIgnorePath(...)` seam for workflow file-writing tools before approval, hooks, reads, or writes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts`

[x] Subtask 42.1. In `src/core/task/tools/ToolExecutorCoordinator.ts`, change the `BUILD_WORKFLOW_DOCUMENT` handler factory to pass `v` into `new BuildWorkflowDocumentToolHandler(v)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

[x] Subtask 42.2. In `src/core/task/tools/ToolExecutorCoordinator.ts`, change the `CREATE_WORKFLOW_ARTIFACT` handler factory to pass `v` into `new CreateWorkflowArtifactToolHandler(v)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

[x] Subtask 42.3. In `src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts`, import `ToolValidator` as a type and add `constructor(private readonly validator: ToolValidator) {}` to the handler class.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts`

[x] Subtask 42.4. In `src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts`, immediately after `prepareWorkflowArtifactCreation(...)` returns and before building approval text, auto-approval, notification, hooks, or `createWorkflowArtifact(...)`, call `this.validator.checkClineIgnorePath(preparedArtifact.artifactAbsolutePath)` and return `formatResponse.toolError(formatResponse.clineIgnoreError(preparedArtifact.artifactAbsolutePath))` on denial.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts`

[x] Subtask 42.5. In `src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`, import `ToolValidator` as a type and add `constructor(private readonly validator: ToolValidator) {}` to the handler class.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`

[x] Subtask 42.6. In `src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`, immediately after destructuring `destinationPath` from the parsed request and before `fs.readFile(...)`, approval, hooks, or `atomicReplaceTextFile(...)`, call `this.validator.checkClineIgnorePath(destinationPath)` and return `formatResponse.toolError(formatResponse.clineIgnoreError(destinationPath))` on denial.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`

[x] Subtask 42.7. In `src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`, update existing handler construction to pass a real `ToolValidator` built from `ClineIgnoreController`; do not use `any`, `as any`, or replacement type assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Subtask 42.8. In `src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`, add coverage proving a `.clineignore`-blocked artifact path returns a clineignore tool error before approval, hooks, or `WorkflowRuntime.createWorkflowArtifact(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Subtask 42.9. Add `src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts` with coverage proving a `.clineignore`-blocked destination path returns a clineignore tool error before file read, approval, hooks, or write.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts`

## Phase 29 - Runtime Workspace Path Policy Enforcement

Pause for QA review after completing Phase 29 before commit.

[x] Task 43. Add runtime-level workspace path-policy wiring.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/discovery.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 43.1. In `src/core/task/workflow-runtime/types.ts`, add `WorkflowWorkspacePathPolicy` with `validateAccess(filePath: string): boolean`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 43.2. In `src/core/task/workflow-runtime/types.ts`, add required `workspacePathPolicy: WorkflowWorkspacePathPolicy` to `WorkflowDiscoveryRequest`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 43.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, require `workspacePathPolicy: WorkflowWorkspacePathPolicy` in the constructor and store it as a private readonly field.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 43.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, add one private helper that throws when `this.workspacePathPolicy.validateAccess(path)` returns `false`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 43.5. In `src/core/task/workflow-runtime/discovery.ts`, validate the resolved target directory before `fs.readdir(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/discovery.ts`

[x] Subtask 43.6. In `src/core/task/workflow-runtime/discovery.ts`, filter discovered entries through `request.workspacePathPolicy.validateAccess(path.join(resolvedTargetDirectory, entry.name))` before mapping candidates.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/discovery.ts`

[x] Subtask 43.7. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, pass `this.workspacePathPolicy` into existing-project discovery.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 43.8. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, pass `this.workspacePathPolicy` into workflow-form selector discovery.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 43.9. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, pass `this.workspacePathPolicy` into artifact discovery.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 43.10. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, validate `dirname(allocation.artifactAbsolutePath)` before artifact `mkdir`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 43.11. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, validate `allocation.artifactAbsolutePath` before artifact `writeFile`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 43.12. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, validate the entry project root before project-root `mkdir`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 43.13. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, validate each canonical project subfolder before subfolder `mkdir`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 43.14. In `src/core/task/index.ts`, construct `WorkflowRuntime` with `workspacePathPolicy: this.clineIgnoreController`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Task 44. Add path-policy test coverage and constructor fallout fixes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/discovery.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Subtask 44.1. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update every `new WorkflowRuntime(...)` construction to pass an explicit typed allow-all or denial-specific `workspacePathPolicy`; do not use type assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 44.2. In `src/core/task/__tests__/workflow-runtime-metadata.test.ts`, update every `new WorkflowRuntime(...)` construction to pass an explicit typed allow-all `workspacePathPolicy`; do not use type assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 44.3. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, update every `new WorkflowRuntime(...)` construction to pass an explicit typed allow-all `workspacePathPolicy`; do not use type assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 44.4. In `src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`, update every `new WorkflowRuntime(...)` construction to pass an explicit typed allow-all or denial-specific `workspacePathPolicy`; do not use type assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Subtask 44.5. In `src/core/task/workflow-runtime/__tests__/discovery.test.ts`, add discovery coverage proving denied target directories fail before `ENOENT` fallback.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/discovery.test.ts`

[x] Subtask 44.6. In `src/core/task/workflow-runtime/__tests__/discovery.test.ts`, add discovery coverage proving denied child entries are filtered out of returned candidates.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/discovery.test.ts`

[x] Subtask 44.7. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add runtime coverage proving artifact parent-directory denial prevents directory creation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 44.8. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add runtime coverage proving artifact file-path denial prevents file creation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 44.9. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add runtime coverage proving entry project-root denial prevents project folder creation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 44.10. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add runtime coverage proving canonical project-subfolder denial prevents that subfolder creation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 44.11. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving `WorkflowRuntime` passes its constructor-supplied `workspacePathPolicy` into existing-project discovery.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 44.12. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving `WorkflowRuntime` passes its constructor-supplied `workspacePathPolicy` into workflow-form selector discovery.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 44.13. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving `WorkflowRuntime` passes its constructor-supplied `workspacePathPolicy` into artifact discovery.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

## Phase 30 - Remove Parallel Workflow Session Identity Carrier

Pause for QA review after completing Phase 30 before commit.

[x] Task 45. Remove workflow identity from active and persisted workflow session state.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 45.1. In `src/core/task/workflow-runtime/types.ts`, remove the `workflowName: WorkflowName` member from `ActiveWorkflowSession`; keep `export type PersistedWorkflowSession = ActiveWorkflowSession` so persisted sessions no longer carry workflow identity through the session object.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 45.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, remove the `workflowName: workflow.name` property from the `taskState.activeWorkflowSession = { ... }` object created by `activateWorkflow(...)`; keep `taskState.activeWorkflowName = workflow.name` as the canonical active workflow identity assignment.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 45.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, add one private helper named `cloneWorkflowSession(session: ActiveWorkflowSession): ActiveWorkflowSession` that returns a newly constructed object containing only `activeStepNumber`, `workflowValues`, `projectSelection`, `ui`, and `branchContext`; each nested object must be cloned with `structuredClone(...)`, and the helper must not spread or clone the whole session object.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 45.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `getPersistedSession(...)` to return `this.cloneWorkflowSession(args.taskState.activeWorkflowSession)` when an active session exists, instead of directly returning `structuredClone(args.taskState.activeWorkflowSession)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 45.5. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `restorePersistedSession(...)` so a present `persistedSession` with `taskState.activeWorkflowName === undefined` returns `await this.teardownWorkflowAndRequirePersistence({ taskState })` before workflow definition resolution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 45.6. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `restorePersistedSession(...)` so workflow definition resolution calls `resolveWorkflowDefinition(taskState.activeWorkflowName)` instead of `resolveWorkflowDefinition(persistedSession.workflowName)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 45.7. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, remove the assignment `taskState.activeWorkflowName = persistedSession.workflowName` from `restorePersistedSession(...)`; do not replace it with any assignment from the persisted session.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 45.8. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `restorePersistedSession(...)` so restored session state is assigned with `taskState.activeWorkflowSession = this.cloneWorkflowSession(persistedSession)` instead of `structuredClone(persistedSession)`, preventing legacy persisted `workflowName` properties from being retained or re-persisted.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Task 46. Update tests for canonical workflow identity ownership.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

[x] Subtask 46.1. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, remove `workflowName` from every `ActiveWorkflowSession` and `PersistedWorkflowSession` fixture object; keep workflow identity assertions on `taskState.activeWorkflowName`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 46.2. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, replace the active-session assertion `expect(activeSession.workflowName).to.equal(workflow.name)` with an assertion against `taskState.activeWorkflowName`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 46.3. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update the valid restore coverage so `restoredState.activeWorkflowName` is set to `workflow.name` before calling `restorePersistedSession(...)`; assert that restore keeps `restoredState.activeWorkflowName === workflow.name` and that `restoredState.activeWorkflowSession` deep-equals the sanitized persisted session.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 46.4. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add restore coverage that builds a legacy persisted session object by adding an extra `workflowName` property to a valid persisted session through `Object.assign(...)`; restore it with `taskState.activeWorkflowName = workflow.name`, assert the result is valid, and assert neither the restored active session nor `runtime.getPersistedSession(...)` has an own `workflowName` property.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 46.5. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add restore coverage proving a present persisted session with `taskState.activeWorkflowName === undefined` returns `persist_workflow_teardown` and clears `activeWorkflowName`, `activeWorkflowSession`, and `currentFocusChainChecklist`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 46.6. In `src/core/task/__tests__/workflow-runtime-metadata.test.ts`, update `createPersistedSession(...)` so it no longer accepts a `workflowName` argument and no longer writes `workflowName` into the returned `PersistedWorkflowSession`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 46.7. In `src/core/task/__tests__/workflow-runtime-metadata.test.ts`, update the `persists explicit teardown next actions and keeps true no_op actions non-persisting` test to set `metadata.activeWorkflowName` separately and call `createPersistedSession()` without a workflow-name argument.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 46.8. In `src/core/task/__tests__/workflow-runtime-metadata.test.ts`, add metadata restore coverage proving metadata with `activeWorkflowSession` present and `activeWorkflowName === undefined` is saved back with both workflow metadata fields cleared.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 46.9. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, remove `workflowName` from every `ActiveWorkflowSession` fixture object; keep workflow assignment and activation assertions on `activeWorkflowName` or `activateWorkflow(...)` arguments.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 46.10. In `src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`, remove `workflowName: workflow.name` from the `createActiveWorkflowSession(...)` fixture.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Subtask 46.11. In `src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`, remove `workflowName: "dev-story.md"` from the `taskState.activeWorkflowSession` fixture while keeping `taskState.activeWorkflowName = "dev-story.md"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

## Phase 31 - Shared Workflow Next-Action Consumption

Pause for QA review after completing Phase 31 before commit.

[x] Task 47. Extract shared workflow next-action consumption from the main `Task` class.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 47.1. Add `src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts` exporting a `WorkflowNextActionConsumer` class plus typed adapter/result interfaces that cover: abort checks, workflow metadata persistence, workflow form rendering, workflow form completion waiting, workflow step-resolution status rendering, terminal-error reporting, and tool-backed operation execution result capture.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`

[x] Subtask 47.2. In `src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`, move the loop semantics currently inside `Task.consumeWorkflowNextAction(...)` into `WorkflowNextActionConsumer.consume(...)`: `no_op` returns without persistence, `project_prompt` persists workflow metadata then returns, `persist_workflow_teardown` persists then returns, `terminal_error` persists then reports the error, `complete_workflow` persists then returns, `render_workflow_form` persists/renders/waits/re-resolves through the adapter, and `execute_tool_backed_operation` renders status, calls the adapter to execute the requested tool-backed operation, calls `WorkflowRuntime.handleToolBackedOperationToolResult(...)`, persists metadata, and continues.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`

[x] Subtask 47.3. In `src/core/task/index.ts`, replace the body of the private `consumeWorkflowNextAction(...)` method with construction of a main-task adapter for `WorkflowNextActionConsumer` and a single call to `consumer.consume(nextAction)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 47.4. In `src/core/task/index.ts`, remove the `as any` assertion from the workflow tool-backed operation `ToolUse.params` construction by building a typed `Record<string, string>` from `nextAction.toolRequest.toolParams` and `nextAction.toolRequest.toolInput` before passing it to `toolExecutor.executeTool(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Task 48. Add a typed returned-next-action carrier to normal tool execution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/ToolExecutor.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/types/TaskConfig.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/utils/ToolConstants.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/SetWorkflowValuesToolHandler.ts`

[x] Subtask 48.1. In `src/core/task/ToolExecutor.ts`, extend `ToolExecutionOutcome` with `workflowNextActions: WorkflowNextAction[]`, and update every `ToolExecutionOutcome` return path in `ToolExecutor` to include either the collected array or an empty array.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/ToolExecutor.ts`

[x] Subtask 48.2. In `src/core/task/tools/types/TaskConfig.ts`, add a required `queueWorkflowNextAction: (nextAction: WorkflowNextAction) => void` callback to `TaskCallbacks`; import `WorkflowNextAction` from the workflow-runtime types instead of widening the callback parameter.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/types/TaskConfig.ts`

[x] Subtask 48.3. In `src/core/task/tools/utils/ToolConstants.ts`, add `queueWorkflowNextAction` to `TASK_CALLBACKS_KEYS` so runtime `TaskConfig` validation requires the callback for every tool handler config.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/utils/ToolConstants.ts`

[x] Subtask 48.4. In `src/core/task/ToolExecutor.ts`, create a new local `WorkflowNextAction[]` buffer for each complete tool execution, pass a callback that pushes into that buffer through `asToolConfig(...)`, and return that buffer on the final `ToolExecutionOutcome` after the tool result has been emitted.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/ToolExecutor.ts`

[x] Subtask 48.5. In `src/core/task/tools/handlers/UseSkillToolHandler.ts`, after successful workflow activation and before returning the success tool result, call `config.callbacks.queueWorkflowNextAction(nextAction)` for the non-`no_op` activation result; keep the existing rollback only for `no_op` activation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts`

[x] Subtask 48.6. In `src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`, after `submitWorkflowProgressRequest(...)` returns a non-`no_op` next action, call `config.callbacks.queueWorkflowNextAction(nextAction)`; keep the existing "Yes plus `no_op`" error path unchanged.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`

[x] Subtask 48.7. In `src/core/task/tools/handlers/SetWorkflowValuesToolHandler.ts`, after successful `applyWorkflowValueWrites(...)` with at least one changed key, resolve the next workflow action with `config.workflowRuntime.resolveNextAction({ taskState: config.taskState })` and call `config.callbacks.queueWorkflowNextAction(nextAction)` when the resolved action is not `no_op`; do not queue anything for unchanged writes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/SetWorkflowValuesToolHandler.ts`

[x] Subtask 48.8. In `src/core/task/index.ts`, after `toolExecutor.executeTool(block)` returns an executed outcome, consume every returned `workflowNextActions` entry through `consumeWorkflowNextAction(...)`; then delete the existing `set_workflow_values`-only post-tool re-entry block so workflow-state-mutating tools use one shared returned-action path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Task 49. Wire child workflow activation and child workflow-state-mutating tools into shared next-action consumption.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`

[x] Subtask 49.1. In `src/core/task/tools/subagent/SubagentRunner.ts`, add a private child-workflow next-action consumer helper that constructs `WorkflowNextActionConsumer` with the child `TaskState`; this helper must be the only child runtime next-action consumption entry point.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 49.2. In `src/core/task/tools/subagent/SubagentRunner.ts`, update `autoActivateAssignedWorkflow(...)` so a successful non-`no_op` activation result is passed into the child-workflow next-action consumer before the first child model request is assembled.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 49.2a. In `src/core/task/tools/subagent/SubagentRunner.ts`, update `autoActivateAssignedWorkflow(...)` so child workflow activation returns before resolving or activating the assigned workflow when `this.baseConfig.taskState.activeWorkflowSession` is missing, or when the parent session `projectSelection.projectTitle.trim()` or `projectSelection.projectFolderName.trim()` is empty. This guard must leave the child `TaskState.activeWorkflowName` and `TaskState.activeWorkflowSession` unchanged, must not call `WorkflowRuntime.activateWorkflow(...)`, and must not rely on `WorkflowRuntime.activateWorkflow(...)` returning a `render_workflow_form` action for child workflows.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 49.3. In `src/core/task/tools/subagent/SubagentRunner.ts`, update `createSubagentTaskConfig(...)` to accept a `WorkflowNextAction[]` buffer and provide a `queueWorkflowNextAction(...)` callback that pushes into that buffer.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 49.4. In `src/core/task/tools/subagent/SubagentRunner.ts`, after each child tool handler result is serialized and added to `toolResultBlocks`, consume every queued workflow next action through the child-workflow next-action consumer before continuing to the next child model turn.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 49.5. In `src/core/task/tools/subagent/SubagentRunner.ts`, implement the child adapter's `render_workflow_form` handling as an explicit failure with the message `Child workflow configuration is invalid: subagent workflows cannot render workflow forms.`; do not silently return, do not render UI, and do not add a subagent-local form path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 49.6. In `src/core/task/tools/subagent/SubagentRunner.ts`, implement the child adapter's `execute_tool_backed_operation` path through the same child handler execution path used for model-authored subagent tool calls: build a `ToolUse` from `nextAction.toolRequest`, ensure the requested tool name is registered on the child coordinator even when it is workflow-projected rather than statically allowed, get the handler from the child coordinator, execute it with a child `TaskConfig`, serialize the returned tool result, and return that serialized text to `WorkflowNextActionConsumer` for `WorkflowRuntime.handleToolBackedOperationToolResult(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 49.7. In `src/core/task/tools/subagent/SubagentRunner.ts`, implement the child adapter's `terminal_error` handling by throwing an `Error` with the workflow error message so the existing subagent failure path reports the failure; implement `complete_workflow`, `persist_workflow_teardown`, `project_prompt`, and `no_op` with no UI work and child-state-only metadata handling.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Task 50. Add focused coverage for shared next-action consumption and returned-action queueing.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.responseToolFailureBudget.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/SetWorkflowValuesToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 50.1. Add `src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts` proving the shared consumer preserves the main action loop behavior for `no_op`, `project_prompt`, `persist_workflow_teardown`, `terminal_error`, `complete_workflow`, `render_workflow_form`, and `execute_tool_backed_operation`; the `project_prompt` case must assert metadata persistence before returning so non-slash activation is durable.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

[x] Subtask 50.1a. In `src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`, type every Sinon stub returned by `createAdapter()` with the exact argument and return signatures declared on `TestWorkflowNextActionConsumerAdapter`; use `sinon.stub<[], boolean>()`, `sinon.stub<[], Promise<void>>()`, `sinon.stub<[WorkflowForm], Promise<void>>()`, `sinon.stub<[WorkflowFormSessionState], Promise<void>>()`, `sinon.stub<[ClineWorkflowStepResolutionStatus], Promise<void>>()`, `sinon.stub<[string], Promise<void>>()`, and `sinon.stub<[Extract<WorkflowNextAction, { kind: "execute_tool_backed_operation" }>], Promise<{ toolResultText: string | undefined }>>()` as appropriate. Do not use `as any`, `as unknown as`, or broad type assertions to satisfy the test interface.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

[x] Subtask 50.2. In `src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`, add coverage proving successful workflow `use_skill` activation queues the returned non-`no_op` next action and that `no_op` activation still rolls back `activeWorkflowName` without queueing an action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`

[x] Subtask 50.3. In `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`, add coverage proving confirmed and denied workflow progress requests queue the returned non-`no_op` next action, while the existing confirmed-plus-`no_op` path still returns the current tool error.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

[x] Subtask 50.4. In `src/core/task/tools/handlers/__tests__/SetWorkflowValuesToolHandler.test.ts`, add coverage proving changed workflow values resolve and queue the next action, while unchanged workflow values do not queue a next action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/SetWorkflowValuesToolHandler.test.ts`

[x] Subtask 50.5. In `src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts`, update the shared test `TaskConfig` fixture to include a no-op `queueWorkflowNextAction` callback so `validateTaskConfig(config)` continues to prove the complete required callback contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts`

[x] Subtask 50.6. In `src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts` and `src/core/task/__tests__/ToolExecutor.responseToolFailureBudget.test.ts`, update outcome assertions so every executed, skipped, rejected, streaming, and not-handled `ToolExecutionOutcome` includes a typed `workflowNextActions` array.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.responseToolFailureBudget.test.ts`

[x] Subtask 50.7. In `src/core/task/__tests__/workflow-runtime-metadata.test.ts`, add task-level coverage proving `presentAssistantMessage(...)` consumes workflow next actions returned from tool execution and no longer has a `set_workflow_values`-only workflow re-entry path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 50.8. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add coverage proving parent-assigned child workflow activation consumes the activation next action before the first child prompt projection.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 50.8a. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, update the existing `auto-activates an explicitly assigned shipped workflow before the first subagent turn` test fixture so the parent `config.taskState` has `activeWorkflowName` set and has a complete `activeWorkflowSession.projectSelection` before constructing `SubagentRunner`; the fixture must use a complete parent project selection because child workflow activation copies project identity from the parent session and must not render the mandatory entry workflow form.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 50.8b. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add coverage for `autoActivateAssignedWorkflow(...)` proving missing parent `activeWorkflowSession` and incomplete parent `projectSelection` both return without activating a child workflow; assert `WorkflowRuntime.activateWorkflow(...)` is not called and the child `TaskState` remains without `activeWorkflowName` and `activeWorkflowSession`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 50.9. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add coverage proving a child workflow next action of `render_workflow_form` fails clearly with `Child workflow configuration is invalid: subagent workflows cannot render workflow forms.`

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 50.10. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add coverage proving a child workflow `execute_tool_backed_operation` executes through the child handler path, feeds the serialized result back into `WorkflowRuntime.handleToolBackedOperationToolResult(...)`, and continues consuming the resulting next action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 50.10a. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, update the `ToolExecutorCoordinator.prototype.getHandler` stub used by the child workflow `execute_tool_backed_operation` test so each returned handler object uses a concrete `ClineDefaultTool` enum member for `name`; return the `CREATE_WORKFLOW_ARTIFACT` handler only when `toolName === ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT`, return the `LIST_FILES` handler only when `toolName === ClineDefaultTool.LIST_FILES`, and return `undefined` for every other string. Do not assign raw `toolName: string` to `IToolHandler.name`, and do not use type assertions to force compatibility.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 50.10b. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, import `DEFAULT_AUTO_APPROVAL_SETTINGS`, `DEFAULT_BROWSER_SETTINGS`, and `DEFAULT_FOCUS_CHAIN_SETTINGS` from their shared settings modules so the shared `createTaskConfig(...)` fixture can use real typed defaults instead of partial object literals.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 50.10c. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, update `createTaskConfig(...)` so `autoApprovalSettings`, `browserSettings`, and `focusChainSettings` are complete typed values based on the shared defaults; preserve the existing test overrides for `executeSafeCommands`, `executeAllCommands`, `useMcp`, and `enableNotifications`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 50.10d. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, replace the generic `stateManager.getGlobalSettingsKey.callsFake(...)` and `stateManager.getWorkspaceStateKey.returns(undefined)` fixture setup with typed Sinon `withArgs(...).returns(...)` setup for the exact keys used by the test fixture; `getWorkspaceStateKey(...)` must return `{}` because local state keys return `ClineRulesToggles`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 50.10e. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, update the shared `createTaskConfig(...)` fixture's `coordinator.getHandler(...)` handler doubles so each returned object includes the required concrete `name` member for `LIST_FILES`, `SET_WORKFLOW_VALUES`, and `CREATE_WORKFLOW_ARTIFACT`; remove the stale top-level `context: {}` fixture property because `TaskConfig` does not define it; then remove `as unknown as TaskConfig`. Do not use `as any`, `as unknown as`, or broad type assertions to satisfy `TaskConfig` or `IToolHandler`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 50.10f. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, update the `does not reuse the parent ask callback inside subagent task configs` test so it calls the existing typed `createSubagentTaskConfig.call(runner, new TaskState())` helper instead of `(runner as any).createSubagentTaskConfig(new TaskState()) as TaskConfig`; do not use `as any`, `as unknown as`, or broad type assertions to access the private helper.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Task 51. Remove stale one-off workflow next-action paths introduced before the shared consumer.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/SetWorkflowValuesToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 51.1. In `src/core/task/index.ts`, remove any direct post-tool workflow re-entry branch that keys off only `ClineDefaultTool.SET_WORKFLOW_VALUES`; workflow re-entry must be driven only by returned `workflowNextActions`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 51.2. In `src/core/task/tools/handlers/UseSkillToolHandler.ts`, ensure the workflow activation result is not ignored after the `no_op` check; the only allowed handling is queueing the non-`no_op` result through `config.callbacks.queueWorkflowNextAction(nextAction)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts`

[x] Subtask 51.3. In `src/core/task/tools/subagent/SubagentRunner.ts`, ensure `autoActivateAssignedWorkflow(...)` does not stop after checking `nextAction.kind === "no_op"`; the only allowed handling for successful activation is child next-action consumption through the shared consumer helper.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

## Phase 32 - Canonical Artifact Families For Epics Index And Epic Delivery Specs

[x] Task 52. Update the runtime-owned artifact-family registry and artifact definition type contract for singleton project artifacts, epics index artifacts, and epic delivery specs.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 52.1. In `src/core/task/workflow-runtime/artifactFamilies.ts`, replace the `WorkflowArtifactFamily.Epic` enum member with `WorkflowArtifactFamily.Epics`, `WorkflowArtifactFamily.EpicsIndex`, and `WorkflowArtifactFamily.EpicDeliverySpec`; retain the existing `Story`, `RemediationStory`, `ReviewBlindHunter`, `ReviewEdgeCaseHunter`, `AdversarialReview`, `ReviewInputMarkdown`, and `ReviewInputDiff` members.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`

[x] Subtask 52.2. In `src/core/task/workflow-runtime/artifactFamilies.ts`, extend `WorkflowArtifactAllocationMode`, `WorkflowArtifactIdentityRequirement`, `WorkflowArtifactNumberingScope`, and `WorkflowArtifactFamilyDefinition` so the registry can model `singleton_project`, `derived_from_epic_index`, `new_numbered`, and `derived_from_target` families, `.json` extensions, stable singleton identities, and structured sidecar/index behavior without optional-property ambiguity.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`

[x] Subtask 52.3. In `src/core/task/workflow-runtime/artifactFamilies.ts`, replace the old `Epic-{E}.md` registry entry with registry entries for `Epics.md`, `Epics.index.json`, and `Epic-{E}-delivery-spec.md`; `Epics.md` and `Epics.index.json` must be project-level singleton families with stable non-numbered identities, and `Epic-{E}-delivery-spec.md` must be a derived family whose discovery pattern is `^Epic-(\d+)-delivery-spec\.md$`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`

[x] Subtask 52.4. In `src/core/task/workflow-runtime/types.ts`, update `WorkflowArtifactDefinition` so singleton project artifacts support only `WorkflowArtifactFamily.Epics` and `WorkflowArtifactFamily.EpicsIndex` with no parent or target identity source, epic delivery specs support only `WorkflowArtifactFamily.EpicDeliverySpec` with no module-provided numeric identity source, stories require a parent epic-delivery-spec identity source, remediation stories require a parent story identity source, and review/input artifacts require a target story or remediation-story identity source.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Task 53. Update `WorkflowRuntime` artifact allocation, derivation, parsing, and validation to remove the retired `Epic-{E}.md` contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 53.1. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, remove `allocateNextEpicIdentity(...)` and every switch branch or helper path that treats `WorkflowArtifactFamily.Epic` or `Epic-{E}.md` as a canonical artifact family.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 53.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, implement singleton project artifact resolution for `Epics.md` and `Epics.index.json` so the runtime uses the registry-owned singleton identity, fixed filename, project-relative path, absolute path, and existing workflow-value persistence path without allocating or parsing a dotted numeric identity.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 53.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, add path-policy-protected loading and validation for `Epics.index.json`; the runtime must validate the concrete index file path through `assertWorkspacePathAllowed(...)` before reading it, parse it as JSON, reject malformed content explicitly, and must not parse `Epics.md` markdown content for epic identities.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 53.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, implement `Epic-{E}-delivery-spec.md` derivation by reading the structured epic identities from `Epics.index.json`, discovering existing `Epic-{E}-delivery-spec.md` files through the shared artifact discovery seam, selecting the first indexed epic identity without a matching delivery spec, and failing through the existing tool-backed operation failure path when no eligible indexed epic remains.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 53.5. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update story parent validation so `Story-{E}-{S}.md` allocation requires an existing convention-matching `Epic-{E}-delivery-spec.md` for the selected parent epic identity; it must not validate stories against `Epics.index.json` alone or against retired `Epic-{E}.md` files.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 53.6. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update artifact filename identity parsing and normalization so `Epic-{E}-delivery-spec.md` resolves to dotted identity `{E}`, `Story-{E}-{S}.md`, `Remediation-story-{E}-{S}-{R}.md`, and review/input artifact parsing continue to work, and `Epic-{E}.md` is no longer accepted as a canonical artifact identity input.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Task 54. Update runtime and handler tests for singleton artifacts, epics index derivation, and epic delivery spec dependencies.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts`

[x] Subtask 54.1. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, replace artifact-allocation fixtures and assertions that use `WorkflowArtifactFamily.Epic` or `Epic-1.md` with fixtures for `WorkflowArtifactFamily.Epics`, `WorkflowArtifactFamily.EpicsIndex`, and `WorkflowArtifactFamily.EpicDeliverySpec`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 54.2. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving singleton `Epics.md` and `Epics.index.json` artifact creation persists stable non-numbered artifact identities, canonical filenames, project-relative paths, absolute paths, and workflow values without allocating dotted numeric identities.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 54.3. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving `Epic-{E}-delivery-spec.md` allocation reads `Epics.index.json`, ignores `Epics.md` markdown content for identity selection, skips indexed epic identities that already have matching delivery spec files, and chooses the first indexed epic identity without a matching delivery spec.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 54.4. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving story allocation validates the selected parent epic identity against existing `Epic-{E}-delivery-spec.md` files and fails when only `Epics.index.json` or a retired `Epic-{E}.md` file exists.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 54.5. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving malformed, missing, or path-policy-denied `Epics.index.json` causes epic-delivery-spec allocation to fail explicitly before file creation and without falling back to `Epics.md` markdown parsing.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 54.6. In `src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`, replace `Epic-1.md` handler expectations and `.clineignore` fixtures with either singleton `Epics.md` or derived `Epic-1-delivery-spec.md` expectations, matching the artifact family used by each test.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Subtask 54.7. In `src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts`, replace generic write-path fixtures that use retired `Epic-1.md` paths with a surviving canonical workflow artifact path such as `Epic-1-delivery-spec.md`, `Story-1-1.md`, or `Epics.md`, preserving each test's original path-policy or document-writer assertion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts`

## Phase 33 - Workflow Form Submission Next-Action Handoff

Pause for QA review after completing Phase 33 before commit.

[x] Task 55. Update the canonical next-action consumer so workflow-form waits receive the submitted next action instead of re-resolving independently.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`

[x] Subtask 55.1. In `src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`, change `WorkflowNextActionConsumerAdapter.waitForWorkflowFormCompletion(...)` to return `Promise<WorkflowNextAction | undefined>` instead of `Promise<void>`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`

[x] Subtask 55.2. In `src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`, update the `render_workflow_form` case so it stores the action returned by `waitForWorkflowFormCompletion(...)`; after the abort check, return if that action is `undefined`, otherwise assign it to `currentAction` and continue the loop. Remove the `workflowRuntime.resolveNextAction(...)` call from this case.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`

[x] Task 56. Route task-level workflow-form submissions into the live workflow-form wait when present, and consume directly only when no live wait exists.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 56.1. In `src/core/task/index.ts`, add a private `workflowFormSubmissionNextActionResolvers` map on `Task`, keyed by workflow form `sessionId`, whose values resolve `WorkflowNextAction | undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 56.2. In `src/core/task/index.ts`, update `waitForWorkflowFormSubmissionNextAction(...)` so the pending resolver for `formSession.sessionId` remains registered until either `handleWorkflowFormSubmission(...)` resolves it with the submitted `WorkflowNextAction` or `taskState.abort === true`; do not remove or resolve the pending resolver merely because `activeWorkflowSession.ui.formSession` changes while submission processing may be in flight. Keep the existing `finally` cleanup after resolver completion or abort.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 56.3. In `src/core/task/index.ts`, update the `consumeWorkflowNextAction(...)` adapter so `waitForWorkflowFormCompletion(...)` calls `waitForWorkflowFormSubmissionNextAction(...)` and returns its `WorkflowNextAction | undefined` result.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 56.4. In `src/core/task/index.ts`, update `handleWorkflowFormSubmission(...)` to capture the `WorkflowNextAction` returned by `workflowRuntime.submitWorkflowForm(...)`; if a resolver exists for the submitted session, resolve it and return without directly consuming; if no resolver exists, pass the returned action to `consumeWorkflowNextAction(...)`. Remove the submit-and-persist-only path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Task 57. Add regression coverage for workflow-form submission handoff and no double-consumption.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 57.1. In `src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`, update the adapter test type and fixture so `waitForWorkflowFormCompletion(...)` returns `WorkflowNextAction | undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

[x] Subtask 57.2. In `src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`, update the render-form test to prove the consumer uses the action returned by `waitForWorkflowFormCompletion(...)` and does not call `WorkflowRuntime.resolveNextAction(...)` after the wait.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

[x] Subtask 57.3. In `src/core/task/__tests__/workflow-runtime-metadata.test.ts`, add task-level coverage proving `handleWorkflowFormSubmission(...)` passes the returned `WorkflowNextAction` to the pending workflow-form wait resolver when one exists, rather than dropping it or directly double-consuming it.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 57.3a. In `src/core/task/__tests__/workflow-runtime-metadata.test.ts`, add coverage proving a live workflow-form wait resolver still receives the `WorkflowNextAction` returned by `handleWorkflowFormSubmission(...)` when `workflowRuntime.submitWorkflowForm(...)` mutates `taskState.activeWorkflowSession.ui.formSession` before returning; assert direct `consumeWorkflowNextAction(...)` is not called.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 57.4. In `src/core/task/__tests__/workflow-runtime-metadata.test.ts`, add task-level coverage proving `handleWorkflowFormSubmission(...)` consumes the returned `WorkflowNextAction` when no pending workflow-form wait resolver exists.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

## Phase 34 - Fail-Closed Restore Validation For Persisted Workflow UI State

Pause for QA review after completing Phase 34 before commit.

[x] Task 58. Add restore-time validation for persisted workflow session shape before `WorkflowRuntime` accepts metadata state.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/schema.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 58.1. In `src/core/task/workflow-form/schema.ts`, add an exported recursive guard for `WorkflowFormSubmittedValuePayload` near `normalizeWorkflowFormSubmittedValue(...)`; it must validate exactly one typed value, finite numeric values, valid array entries, non-empty object entry keys, and valid nested object values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/schema.ts`

[x] Subtask 58.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, import the new workflow-form submitted-value guard.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 58.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, add private restore-validation helpers near `cloneWorkflowSession(...)` for plain-record checks, string-array checks, workflow-value record validation using existing `isWorkflowValue(...)`, project-selection validation, branch-failure-state validation, and branch-trigger-event validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 58.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `validateAndNormalizePersistedFormSessionForRestore(...)` so it supports both runtime-owned mandatory entry form sessions and module-owned active-step form sessions. If `persistedFormSession.workflowFormId === WORKFLOW_ENTRY_FORM_ID`, rebuild the definition payload with `buildWorkflowEntryFormDefinition(definition)`, require `projectSelection.projectTitle === ""` or `projectSelection.projectFolderName === ""`, validate `currentPanelId`, submitted values, and field keys against that rebuilt entry-form definition, normalize the restored session to that rebuilt definition payload, and do not require a decision-tree continuation route. For every non-entry form, preserve the existing module-owned form behavior: require `definition.workflowForms[workflowFormId]`, require a valid current panel, validate submitted values and field keys, normalize to the current definition payload, and require an active-branch continuation route for that form.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 58.5. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, add a private helper that validates persisted `stepResolutionSession` against the current workflow definition and active step: `definitionId` must exist, `triggerSource` must equal `execute_tool_backed_operation`, `state` must equal `pending`, owner workflow/step must match the active workflow and active step, and the active branch must have a continuation route for that operation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 58.6. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, add a private `validatePersistedWorkflowSessionForRestore(...)` helper that treats the persisted value as untrusted, validates base session shape, validates `ui` suppression arrays against current workflow form/tool-backed operation ids, calls the form/session helpers, and returns a normalized `PersistedWorkflowSession` or `undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 58.7. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, change `restorePersistedSession(...)` so it calls `validatePersistedWorkflowSessionForRestore(...)` before reading `activeStepNumber`, `branchContext.activeBranchId`, `ui.formSession`, or `ui.stepResolutionSession`; invalid results must return `teardownWorkflowAndRequirePersistence(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Task 59. Add regression coverage for fail-closed restore validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 59.1. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving malformed persisted session shape fails closed with `persist_workflow_teardown` and does not throw.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 59.2. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving invalid `workflowValues`, invalid `projectSelection`, invalid suppression arrays, and stale suppression ids fail closed.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 59.3. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving stale `formSession` form ids, stale current panel ids, malformed submitted values, and form sessions without an active-branch continuation route fail closed.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 59.4. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update or extend the existing valid form restore test to prove the restored form session uses the current workflow definition payload and still returns `render_workflow_form`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 59.4a. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving a valid persisted mandatory entry `WorkflowForm` session restores and returns `render_workflow_form`; the restored entry form must use the runtime-rebuilt entry form definition payload, must not require the form id to exist in `workflow.workflowForms`, and must fail closed when project selection is already complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 59.5. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving stale `stepResolutionSession` definition ids, owner mismatches, non-pending state, and missing continuation routes fail closed.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 59.6. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving a valid restored pending step-resolution session returns `execute_tool_backed_operation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

## Phase 35 - Terminal Error Workflow Teardown

Pause for QA review after completing Phase 35 before commit.

[x] Task 60. Make terminal workflow errors teardown workflow state before the next-action consumer persists metadata.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 60.1. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, change `buildTerminalErrorNextAction(...)` to normalize the terminal error message before teardown, call `await this.teardownWorkflow({ taskState: args.taskState })`, and then return `{ kind: "terminal_error", errorMessage: normalizedErrorMessage }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 60.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, change `buildTerminalErrorNextAction(...)` from a synchronous helper to an async helper returning `Promise<WorkflowNextAction>`, and update its caller in the `terminal_error` decision-action case to `return await this.buildTerminalErrorNextAction({ taskState })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Task 61. Update terminal-error regression coverage to assert workflow teardown.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

[x] Subtask 61.1. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update the explicit terminal-error failure-branch test so it still asserts the returned `terminal_error` message and now asserts `activeWorkflowName`, `activeWorkflowSession`, and `currentFocusChainChecklist` are cleared after the runtime emits the terminal error; remove assertions that inspect `branchContext` after terminal error.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 61.2. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update the unmatched tool-backed operation failure terminal-error test so it still asserts the returned `terminal_error` message and now asserts `activeWorkflowName`, `activeWorkflowSession`, and `currentFocusChainChecklist` are cleared after the runtime emits the terminal error; remove assertions that inspect `branchContext` after terminal error.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 61.3. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update any document-builder or artifact-allocation terminal-error assertions so terminal errors clear `activeWorkflowName`, `activeWorkflowSession`, and `currentFocusChainChecklist`; do not retain post-terminal assertions against `session.branchContext.failureState`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 61.4. In `src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`, keep the terminal-error consumer test focused on consumer behavior only: it must assert metadata persistence and error reporting for a `terminal_error` action, and it must not assert runtime teardown because teardown is owned by `WorkflowRuntime`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

## Phase 36 - Workflow Form Durable Value Persistence Scope

Pause for QA review after completing Phase 36 before commit.

[x] Task 62. Scope workflow-form durable value persistence to submitted session values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 62.1. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, replace `collectWorkflowValueWritesFromFormSession(...)` so it no longer converts every `workflowValueKey` field from every panel. The method must first build a field-key to workflow-value-key lookup from `formSession.definitionPayload.panels`, then iterate only `Object.entries(formSession.values)`. For each submitted field value, skip it when no `workflowValueKey` exists for that field key, convert it when a destination exists, throw on failed conversion, and write the converted value to `workflowValueWrites[workflowValueKey]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 62.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, preserve `persistWorkflowFormValues(...)` as the only caller of `applyWorkflowValueWrites(...)` for workflow-form durable values; do not add a second persistence path and do not change `convertWorkflowFormSubmittedValueToWorkflowValue(...)` to treat `undefined` as valid.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Task 63. Add regression coverage for multi-panel workflow-form durable value persistence.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 63.1. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add a workflow-form test with two panels where panel one and panel two each contain a submitted input field with a declared `workflowValueKey`; submitting panel one must return the next `render_workflow_form` action, persist only panel one's durable workflow value, and not throw because panel two's durable field has not been submitted.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 63.2. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, extend the same multi-panel workflow-form test so submitting panel two persists panel two's durable workflow value while preserving panel one's persisted workflow value.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 63.3. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, verify the existing malformed submitted durable-value test still fails explicitly for a submitted field with `workflowValueKey`; do not weaken malformed submitted value handling to make unsubmitted panel fields pass.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

## Phase 37 - Module Decision-Tree Predicate Contract Cleanup

Pause for QA review after completing Phase 37 before commit.

[x] Task 64. Remove the non-emitted `session_initialized` branch event from the module-visible trigger contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 64.1. In `src/core/task/workflow-runtime/types.ts`, remove `{ kind: "session_initialized" }` from the `WorkflowBranchTriggerEvent` union.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 64.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, remove the `session_initialized` case from `isWorkflowBranchTriggerEvent(...)` so restored persisted trigger events with that kind fail restore validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 64.3. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add restore-validation coverage proving a persisted `branchContext.lastTriggerEvent` with kind `session_initialized` fails closed with workflow teardown persistence.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Task 65. Restrict module decision-tree predicate input to documented decision inputs only.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 65.1. In `src/core/task/workflow-runtime/types.ts`, replace `WorkflowDecisionBranchEvaluationInput` so it no longer exposes `session` or `branchContext`; it must expose only `activeBranchId: WorkflowDecisionBranchId`, `workflowValues: WorkflowValues`, and `step: WorkflowStepDefinition`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 65.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `buildDecisionTreeEvaluationInput(...)` to return only `activeBranchId`, `workflowValues`, and `step` from the active session and step.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 65.3. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update the `createWorkflowFormDecisionTree(...)` test helper to remove the `form-completed-session` route that reads `session.ui.suppressedWorkflowFormIds`; form completion tests must rely on the existing `workflow_form_completed` event route instead.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 65.4. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving a `session_predicate` receives `activeBranchId`, `workflowValues`, and `step`, and does not receive `session`, `ui`, `branchContext`, `suppressedWorkflowFormIds`, or `suppressedWorkflowStepResolutionDefinitionIds`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 65.5. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add coverage proving an `event_predicate` receives the sanitized decision input plus `triggerEvent`, and still does not receive `session`, `ui`, `branchContext`, or suppression arrays.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

## Phase 38 - Restore Returned Next-Action Consumption

Pause for QA review after completing Phase 38 before commit.

[x] Task 66. Route restored workflow next actions through the canonical task next-action consumer.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 66.1. In `src/core/task/index.ts`, update `restoreWorkflowRuntimeStateFromMetadata(...)` so the existing `persist_workflow_teardown` branch remains unchanged and returns immediately after saving cleared metadata.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 66.2. In `src/core/task/index.ts`, immediately after the existing `persist_workflow_teardown` branch in `restoreWorkflowRuntimeStateFromMetadata(...)`, add a branch that checks `restoreResult !== undefined && restoreResult.kind !== "no_op"`, calls `await this.consumeWorkflowNextAction(restoreResult)`, and returns immediately after consumption.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 66.3. In `src/core/task/index.ts`, preserve the existing fallback branch for `metadata.activeWorkflowName && !metadata.activeWorkflowSession` after restored-action consumption handling; do not move it before `persist_workflow_teardown` cleanup or before non-`no_op` restored-action consumption.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Task 67. Add task-level metadata restore coverage for restored next-action consumption.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 67.1. In `src/core/task/__tests__/workflow-runtime-metadata.test.ts`, add a test proving `restoreWorkflowRuntimeStateFromMetadata(...)` passes a non-`no_op` action returned from `workflowRuntime.restorePersistedSession(...)` into `consumeWorkflowNextAction(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 67.2. In `src/core/task/__tests__/workflow-runtime-metadata.test.ts`, add or update coverage proving a `persist_workflow_teardown` restore result still clears `metadata.activeWorkflowName`, clears `metadata.activeWorkflowSession`, saves task metadata, and is not routed into `consumeWorkflowNextAction(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 67.3. In `src/core/task/__tests__/workflow-runtime-metadata.test.ts`, add or update coverage proving `undefined` and `{ kind: "no_op" }` restore results are not routed into `consumeWorkflowNextAction(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

## Phase 39 - Subagent Workflow Assignment Marker Consumption

Pause for QA review after completing Phase 39 before commit.

[x] Task 68. Consume and strip parent-authored subagent workflow assignment markers before child prompt construction.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 68.1. In `src/core/task/tools/subagent/SubagentRunner.ts`, replace `extractAssignedSkillNames(prompt: string): string[]` with a typed helper that returns `{ assignedSkillNames: string[]; sanitizedPrompt: string }`; it must extract the same unique trimmed marker names from explicit `use_skill(...)` and `skill_name = ...` markers and remove those marker snippets from `sanitizedPrompt`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 68.2. In `src/core/task/tools/subagent/SubagentRunner.ts`, update `run(...)` to use `sanitizedPrompt` for the initial child user message instead of the original `prompt`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 68.3. In `src/core/task/tools/subagent/SubagentRunner.ts`, delete `buildAssignedSkillDirective(...)` and remove the system-prompt branch that appends `Assigned Workflow Activation`; `systemPrompt` must be built from `baseSystemPrompt` plus existing prompt-injection text only.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Task 69. Fail subagent runs when parent-authored workflow assignment markers cannot be honored.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 69.1. In `src/core/task/tools/subagent/SubagentRunner.ts`, add a typed activation-result union for assigned workflow activation with explicit `no_assignment`, `activated`, and `failed` variants.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 69.2. In `src/core/task/tools/subagent/SubagentRunner.ts`, change `autoActivateAssignedWorkflow(...)` to return the typed activation result; zero markers must return `no_assignment`, and multiple distinct markers must return `failed` with a clear error message.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 69.3. In `src/core/task/tools/subagent/SubagentRunner.ts`, change `autoActivateAssignedWorkflow(...)` so missing parent session, blank parent project title, or blank parent project folder returns `failed` before workflow registry resolution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 69.4. In `src/core/task/tools/subagent/SubagentRunner.ts`, change unresolved workflow markers to return `failed` with a clear error message and no child workflow state mutation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 69.5. In `src/core/task/tools/subagent/SubagentRunner.ts`, change activation that returns `no_op` to restore the previous child workflow identity and return `failed`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 69.6. In `src/core/task/tools/subagent/SubagentRunner.ts`, update `run(...)` so a `failed` assigned-workflow activation result calls `onProgress({ status: "failed", error, stats })`, returns `{ status: "failed", error, stats }`, and does not construct or send the first child model request.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Task 70. Stop assignment markers from controlling child prompt skill exposure and update regression coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 70.1. In `src/core/task/tools/subagent/SubagentRunner.ts`, remove `assignedSkillNames` from `buildPromptContext(...)` parameters and call sites.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 70.2. In `src/core/task/tools/subagent/SubagentRunner.ts`, update `resolvePromptSkills(...)` so it uses only `configuredSkillNames` when provided and otherwise returns `availableSkills`; it must not accept or use assignment marker names.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 70.3. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, update the successful assigned-workflow activation test to assert the first child user message does not contain `use_skill`, `skill_name`, or the assigned workflow marker text.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 70.4. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, replace the assigned-skill narrowing test with coverage proving assignment markers do not narrow `context.skills`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 70.5. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, replace the fallback assigned-skill directive test with coverage proving an unresolvable assignment marker returns failed status, reports an error, does not call the child model, and does not emit `Assigned Workflow Activation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 70.6. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add coverage proving multiple distinct assignment markers return failed status and do not call the child model.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 70.7. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, update incomplete parent project-context coverage so marker-present runs fail before the first child model request.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

## Phase 40 - Subagent Unsafe Cast Cleanup

Pause for QA review after completing Phase 40 before commit.

[x] Task 71. Replace production unsafe `any` usage in `SubagentRunner`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 71.1. In `src/core/task/tools/subagent/SubagentRunner.ts`, change `pushSubagentToolResultBlock(toolResultBlocks: any[], ...)` so `toolResultBlocks` is typed as `ClineUserContent[]`; do not use `any`, `as any`, or replacement type assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 71.2. In `src/core/task/tools/subagent/SubagentRunner.ts`, import `ClineAssistantContent` from `@shared/messages` and replace `const assistantContent = [] as any[]` with `const assistantContent: ClineAssistantContent[] = []`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Task 72. Replace unsafe casts in `SubagentRunner.test.ts` with typed test helpers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 72.1. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add a typed `createNativeTool(name: string): ClineTool` helper that returns an OpenAI-compatible tool object with `type: "function"` and `function: { name, description, parameters }`; use it anywhere the test needs a `ClineTool`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 72.2. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, replace every `[{ name: "list_files" } as any]`, `[] as any`, and `visibleNativeToolNames.map((name) => ({ name })) as any` native-tool fixture with `ClineTool[]` values built by `createNativeTool(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 72.3. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, replace direct `config.services.mcpHub = { getServers: () => [] } as any` assignments by configuring the existing `sinon.createStubInstance(McpHub)` returned from `createTaskConfig(...)`; the fixture must expose a typed way to set `getServers.returns(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 72.4. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, replace `conversation: any[]` callback parameters with `conversation: ClineStorageMessage[]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 72.5. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, replace `sinon.stub(runner as any, "shouldCompactBeforeNextRequest")` with a typed `Reflect.get(SubagentRunner.prototype, "shouldCompactBeforeNextRequest")` helper matching the private method signature, following the existing private-helper pattern in the file.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Task 73. Add typed `SubagentBuilder` seams so builder tests do not force partial objects through runtime types.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Subtask 73.1. In `src/core/task/tools/subagent/SubagentBuilder.ts`, add a typed constructor dependency for config lookup, such as `Pick<AgentConfigLoader, "getCachedConfig">`, defaulting to `AgentConfigLoader.getInstance()`; use that dependency instead of calling `AgentConfigLoader.getInstance()` directly inside the constructor.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`

[x] Subtask 73.2. In `src/core/task/tools/subagent/SubagentBuilder.ts`, change the constructor's `baseConfig` parameter type to a named narrow type containing only the `TaskConfig` members actually used by `SubagentBuilder`: `ulid` and `services.stateManager`; full `TaskConfig` callers must remain assignable without adapters.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`

[x] Subtask 73.3. In `src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`, replace `createTaskConfig(...)` so it returns the new typed narrow builder config directly; remove `as unknown as TaskConfig`. The fixture's `provider` parameter must be typed as `ApiProvider` imported from `@/shared/api`, and the object returned by `stateManager.getApiConfiguration.returns(...)` must assign that `ApiProvider` value to `actModeApiProvider` and `planModeApiProvider`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Subtask 73.4. In `src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`, replace every fake `AgentConfigLoader` object cast with `as unknown as AgentConfigLoader` by passing the typed constructor config-source dependency added in Subtask 73.1.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Subtask 73.5. In `src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`, replace all `mcpHub: {} as any` and MCP server object `as any` fixtures with typed `McpHub` stubs and typed `McpServer[]` values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Subtask 73.6. In `src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`, replace assignments to `(taskConfig.services.stateManager.getGlobalSettingsKey as any)` with typed Sinon stubs configured through the builder config fixture. The fixture must import `DEFAULT_AUTO_APPROVAL_SETTINGS` from `@/shared/AutoApprovalSettings` and configure `stateManager.getGlobalSettingsKey.withArgs("autoApprovalSettings").returns(...)` with a complete `AutoApprovalSettings` object built by spreading `DEFAULT_AUTO_APPROVAL_SETTINGS`, spreading `DEFAULT_AUTO_APPROVAL_SETTINGS.actions`, and overriding only `actions.useMcp`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Task 74. Validate subagent unsafe-cast cleanup.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Subtask 74.1. Run `rg "as any|as unknown as|: any|any\\[\\]" src/core/task/tools/subagent`; it must return no matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Subtask 74.2. Run `npm run test:unit -- src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`, `npm run check-types`, and `npm run lint`; all must pass before Phase 40 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

## Phase 41 - Authoritative Child Workflow Tool Projection

Pause for QA review after completing Phase 41 before commit.

[x] Task 75. Split static subagent prompt suffix from active child-workflow prompt suffix.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`

[x] Subtask 75.1. In `src/core/task/tools/subagent/SubagentBuilder.ts`, add an exported `SUBAGENT_WORKFLOW_SYSTEM_SUFFIX` constant immediately after `SUBAGENT_SYSTEM_SUFFIX`; its text must preserve subagent identity and `attempt_completion` completion framing, must include the sentence `Use only the tools exposed for the current workflow turn.`, and must not include `You can read files, list directories, search for patterns, list code definitions, and run commands.` or `Only use execute_command for readonly operations like ls, grep, git log, git diff, gh, etc.`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`

[x] Subtask 75.2. In `src/core/task/tools/subagent/SubagentBuilder.ts`, add a private `buildSubagentSystemSuffix(context?: SystemPromptContext): string` method. It must return `SUBAGENT_WORKFLOW_SYSTEM_SUFFIX` when `context !== undefined && context.workflowToolSchemaOverride !== undefined`; otherwise it must return `SUBAGENT_SYSTEM_SUFFIX`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`

[x] Subtask 75.3. In `src/core/task/tools/subagent/SubagentBuilder.ts`, update `buildSystemPrompt(...)` so it appends `this.buildSubagentSystemSuffix(context)` instead of appending `SUBAGENT_SYSTEM_SUFFIX` directly.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`

[x] Task 76. Make child workflow tool availability authoritative in `SubagentRunner`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 76.1. In `src/core/task/tools/subagent/SubagentRunner.ts`, rewrite `buildAllowedToolNamesForTurn(context)` so `context.workflowToolSchemaOverride !== undefined` creates the set only from `context.workflowToolSchemaOverride.map((toolSpec) => toolSpec.id)`, and `context.workflowToolSchemaOverride === undefined` creates the set from `this.allowedTools`; after the set is created, always delete `ClineDefaultTool.USE_SKILL`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 76.2. In `src/core/task/tools/subagent/SubagentRunner.ts`, change `createSubagentTaskConfig(...)` to accept a third parameter named `allowedToolNamesForTurn?: ReadonlySet<ClineDefaultTool>` and register coordinator handlers from `allowedToolNamesForTurn ?? new Set<ClineDefaultTool>(this.allowedTools)`; do not iterate directly over `this.allowedTools` when `allowedToolNamesForTurn` is provided.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 76.3. In `src/core/task/tools/subagent/SubagentRunner.ts`, update the model-authored tool execution loop so the `createSubagentTaskConfig(state, workflowNextActions)` call passes the already-computed `allowedToolNamesForTurn` as the third argument.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 76.4. In `src/core/task/tools/subagent/SubagentRunner.ts`, update `executeChildWorkflowToolBackedOperation(...)` so it constructs `const workflowOperationToolNames = new Set<ClineDefaultTool>([toolName])` and passes that set as the third argument to `createSubagentTaskConfig(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Subtask 76.5. In `src/core/task/tools/subagent/SubagentRunner.ts`, delete `ensureChildCoordinatorHasTool(...)` and delete the call to it from `executeChildWorkflowToolBackedOperation(...)`; runtime operation tool registration must happen only through the `workflowOperationToolNames` set prescribed in Subtask 76.4.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

[x] Task 77. Add subagent runner regression coverage for authoritative child workflow tools.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 77.1. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, update the typed private `createSubagentTaskConfig` helper declaration so it accepts the optional third `ReadonlySet<ClineDefaultTool>` parameter added in Subtask 76.2.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 77.2. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add a test for an active child workflow with `workflowToolSchemaOverride` defined that captures the first `systemPrompt` passed to `createMessage(...)` and asserts it does not contain `You can read files, list directories, search for patterns, list code definitions, and run commands.` and does not contain `Only use execute_command for readonly operations like ls, grep, git log, git diff, gh, etc.`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 77.3. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add a test where an active child workflow projects only `ClineDefaultTool.SET_WORKFLOW_VALUES`, the child model first calls `ClineDefaultTool.LIST_FILES`, and the resulting tool result contains `Tool 'list_files' is not available inside subagent runs.`; the same test must prove the static `LIST_FILES` handler result is not returned.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 77.4. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, update the existing child workflow-projected tool execution tests so they still prove `SET_WORKFLOW_VALUES` and `CREATE_WORKFLOW_ARTIFACT` execute when those tools are present in `workflowToolSchemaOverride`, even though they are absent from `SUBAGENT_DEFAULT_ALLOWED_TOOLS`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 77.5. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, keep the existing child workflow `USE_SKILL` rejection coverage and update it if needed so it proves `ClineDefaultTool.USE_SKILL` remains unavailable even when present in `workflowToolSchemaOverride`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Task 78. Add subagent builder regression coverage for workflow-safe prompt suffix selection.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Subtask 78.1. In `src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`, import `SUBAGENT_WORKFLOW_SYSTEM_SUFFIX` from `../SubagentBuilder`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Subtask 78.2. In `src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`, add a test that calls `buildSystemPrompt("generated prompt", context)` with `context.workflowToolSchemaOverride` defined as an empty array and asserts the result equals `generated prompt${SUBAGENT_WORKFLOW_SYSTEM_SUFFIX}`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Subtask 78.3. In `src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`, extend the test added in Subtask 78.2 to assert the workflow-suffix prompt does not contain `You can read files, list directories, search for patterns, list code definitions, and run commands.` and does not contain `Only use execute_command for readonly operations like ls, grep, git log, git diff, gh, etc.`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Subtask 78.4. In `src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`, preserve the existing non-workflow `SUBAGENT_SYSTEM_SUFFIX` assertions so normal subagent runs without `workflowToolSchemaOverride` still receive the static subagent capability suffix.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Task 79. Validate authoritative child workflow tool projection.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Subtask 79.1. Run `rg "ensureChildCoordinatorHasTool" src/core/task/tools/subagent/SubagentRunner.ts`; it must return no matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Subtask 79.2. Run `rg "const allowedToolNames = new Set<ClineDefaultTool>\\(this.allowedTools\\)" src/core/task/tools/subagent/SubagentRunner.ts`; it must return no matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

[x] Subtask 79.3. Run `npm run test:unit -- src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`, `npm run check-types`, and `npm run lint`; all must pass before Phase 41 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentBuilder.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentBuilder.test.ts`

## Phase 42 - Module-Authored Terminal Error Messages

Pause for QA review after completing Phase 42 before commit.

[x] Task 80. Add module-authored terminal error messages to workflow decision actions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 80.1. In `src/core/task/workflow-runtime/types.ts`, change the `WorkflowDecisionAction` union member `{ kind: "terminal_error" }` to `{ kind: "terminal_error"; errorMessage: string }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Task 81. Route module-authored terminal error messages through runtime next-action resolution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 81.1. In `buildNextActionFromDecisionTreeAction(...)`, change the `case "terminal_error"` branch to call `buildTerminalErrorNextAction({ taskState, errorMessage: action.errorMessage })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 81.2. In `validateWorkflowDefinition(...)`, update the `case "terminal_error"` branch so it rejects `route.action.errorMessage.trim().length === 0` with error message `Workflow step ${step.id} route ${route.id} terminal_error errorMessage must not be empty.`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Task 82. Update workflow-runtime tests for module-authored terminal error messages.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 82.1. In `WorkflowRuntime.test.ts`, update every module decision-tree terminal-error action from `{ kind: "terminal_error" }` to include a non-empty `errorMessage`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 82.2. In the explicit terminal-error failure-branch test, assert the returned `WorkflowNextAction.errorMessage` equals the module-authored terminal action message, not the prior tool failure text.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 82.3. Preserve the unmatched failure-branch test expectation that runtime fail-closed terminal errors still use prior failure text when no module terminal-error route matched.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 82.4. Add definition-validation coverage proving terminal-error actions with `errorMessage: ""` and `errorMessage: "   "` are rejected before activation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Task 83. Validate Phase 42.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 83.1. Run `rg "\\{ kind: \"terminal_error\" \\}" src/core/task/workflow-runtime src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`; it must return no bare module decision-action matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 83.2. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, `npm run check-types`, and `npm run lint`; all must pass before Phase 42 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

## Phase 43 - Active-Step Selector Submission Validation

Pause for QA review after completing Phase 43 before commit.

Do not add submission-time rediscovery. The rendered form session must store the selector options shown to the user, and submission validation must use that stored rendered option set.

[x] Task 84. Prevent rendered selector-option writes from mutating shared workflow definitions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`

[x] Subtask 84.1. In `WorkflowFormRuntime.createSession(...)`, change the returned `definitionPayload` assignment from the input object to `structuredClone(options.definitionPayload)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`

[x] Task 85. Persist rendered active-panel selector options into the live form session.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 85.1. In `WorkflowRuntime.ts`, add a private helper named `storeResolvedWorkflowFormPanelFields(...)` that accepts `session: WorkflowFormSessionState`, `panelId: string`, and `fields: WorkflowFormFieldDefinition[]`; the helper must update `session.definitionPayload.panels[panelId].fields` by replacing only fields whose keys appear in the resolved `fields` array, preserving all other panel properties and unrendered fields.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 85.2. In `buildWorkflowFormRenderPayload(...)`, immediately after `resolvedPanel` is built and before `buildWorkflowFormPayload(...)` is called, call `storeResolvedWorkflowFormPanelFields(...)` with the current `session`, `panelId`, and `resolvedPanel.fields`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Task 86. Prevent failed form submissions from persisting durable workflow values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 86.1. In `submitWorkflowForm(...)`, inside the `case "render_form"` branch, call `persistWorkflowFormValues(...)` only when `outcome.session.failure === undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Task 87. Enforce selectorDiscovery submitted values against stored rendered options.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`

[x] Subtask 87.1. In `WorkflowFormRuntime.ts`, add a local helper near `validateSelectionRules(...)` named `requiresDeclaredOptionMatch(field: WorkflowFormFieldDefinition): boolean` that returns `field.selectorDiscovery !== undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`

[x] Subtask 87.2. In `validateSelectionRules(...)`, update the single-selection `dropdown` / `radio_group` branch so selectorDiscovery fields return `allowedOptionValues.has(value.stringValue ?? "")`; preserve the existing empty-options freeform behavior only when `field.selectorDiscovery === undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`

[x] Subtask 87.3. In `validateSelectionRules(...)`, update the multi-selection `dropdown` / `radio_group` branch so selectorDiscovery fields reject every submitted selection that is not in `allowedOptionValues`, including when `allowedOptionValues.size === 0`; preserve existing non-selector behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`

[x] Subtask 87.4. In `validateSelectionRules(...)`, update the `multi_select` / `checkbox_group` branch so selectorDiscovery fields reject every submitted selection that is not in `allowedOptionValues`, including when `allowedOptionValues.size === 0`; preserve existing non-selector behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`

[x] Subtask 87.5. In `validateSelectionRules(...)`, add explicit handling for `file_path`, `directory_path`, and `artifact_picker`: when `selectorDiscovery` is defined, require a string submitted value whose `stringValue` exists in `allowedOptionValues`; when `selectorDiscovery` is undefined, preserve existing freeform behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`

[x] Task 88. Add workflow-runtime selector validation coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 88.1. In the existing selector form test, assert `renderFormAction.formSession.definitionPayload.panels.selectors.fields` contains the rendered discovered `options` for `existing_project_choice`, `selected_folder`, `selected_file`, and `selected_artifact`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 88.2. Add a workflow-runtime test that submits a value not present in the rendered options for each selector field kind already covered by the selector form fixture: `dropdown`, `directory_path`, `file_path`, and `artifact_picker`; each case must use a fresh `TaskState`, return `render_workflow_form` with a failure payload, and leave the destination workflow value key absent from `activeWorkflowSession.workflowValues`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 88.3. In the test from Subtask 88.2, after initial render and before submit, change the discovery stub so the submitted fake value would appear in a new discovery result; assert the fake value still fails because validation uses the rendered session options rather than submission-time rediscovery.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Task 89. Add workflow-form runtime selectorDiscovery unit coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

[x] Subtask 89.1. In `WorkflowFormRuntime.test.ts`, add a test proving a selectorDiscovery `dropdown` with `options: []` rejects a submitted string value.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

[x] Subtask 89.2. In `WorkflowFormRuntime.test.ts`, add a table-driven test proving selectorDiscovery `file_path`, `directory_path`, and `artifact_picker` fields reject submitted string values that are not present in `options`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

[x] Task 90. Validate Phase 43.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 90.1. Run `rg "definitionPayload: options.definitionPayload" src/core/task/workflow-form/WorkflowFormRuntime.ts`; it must return no matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`

[x] Subtask 90.2. Run `npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, `npm run check-types`, and `npm run lint`; all must pass before Phase 43 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

## Phase 44 - Restore Workflow Values Against Declared Inventory

Pause for QA review after completing Phase 44 before commit.

[x] Task 91. Add restore-time workflow-value inventory validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 91.1. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, replace `private isWorkflowValueRecord(value: unknown): value is WorkflowValues` with `private isRestorableWorkflowValueRecord(value: unknown, definition: WorkflowDefinition): value is WorkflowValues`; the new helper must return `false` when `value` is not a plain record, must build `const allowedKeys = new Set(definition.workflowValueKeys)`, and must return `false` for any `Object.entries(value)` entry whose key is absent from `allowedKeys` or whose value fails `isWorkflowValue(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 91.2. In `validatePersistedWorkflowSessionForRestore(...)`, replace the existing `this.isWorkflowValueRecord(persistedSession.workflowValues)` check with `this.isRestorableWorkflowValueRecord(persistedSession.workflowValues, definition)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Task 92. Add restore regression coverage for workflow-value inventory validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 92.1. In the existing `fails closed for invalid restored workflow values, project selection, and ui suppression state` test, add a malformed case named `stale workflow value key` that mutates the persisted session by setting `session.workflowValues.stale_workflow_value = "stale"` and verifies the existing `expectPersistedRestoreFailsClosed(...)` path rejects it.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 92.2. In `WorkflowRuntime.test.ts`, add a restore test proving declared JSON-safe array and object workflow values remain valid: create a workflow with `workflowValueKeys` containing `restored_array` and `restored_object`, create a restorable persisted session, set those two declared keys to JSON-safe array/object values, restore the session, assert restore succeeds, assert both values are present with preserved shape, and assert the restored array/object references are not the same references as the persisted session values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Task 93. Validate Phase 44.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 93.1. Run `rg "isWorkflowValueRecord" src/core/task/workflow-runtime/WorkflowRuntime.ts`; it must return no matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 93.2. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, `npm run check-types`, and `npm run lint`; all must pass before Phase 44 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

## Phase 45 - Persist Pending Tool-Backed Operation State Before Execution

Pause for QA review after completing Phase 45 before commit.

[x] Task 94. Persist pending workflow step-resolution state before executing tool-backed operations.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`

[x] Subtask 94.1. In `src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`, in the `case "execute_tool_backed_operation"` branch, add `await this.adapter.persistWorkflowRuntimeMetadata()` as the first statement inside the existing `if (currentAction.toolBackedOperationSession) { ... }` block, before `buildToolBackedOperationStatusPayload(...)` is called; keep the existing post-result `await this.adapter.persistWorkflowRuntimeMetadata()` after `handleToolBackedOperationToolResult(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`

[x] Task 95. Update existing consumer coverage for tool-backed operation persistence ordering.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

[x] Subtask 95.1. In the existing `executes tool-backed operations, feeds results back to runtime, persists, and continues` test, change the persistence expectation from one call to two calls when `toolBackedOperationSession` is present.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

[x] Subtask 95.2. In the same test, add explicit ordering assertions proving `adapter.persistWorkflowRuntimeMetadata.firstCall` occurs before `adapter.renderWorkflowStepResolutionStatus.firstCall`, `adapter.renderWorkflowStepResolutionStatus.firstCall` occurs before `adapter.executeToolBackedOperation.firstCall`, `adapter.executeToolBackedOperation.firstCall` occurs before `handleToolBackedOperationToolResult.firstCall`, and `handleToolBackedOperationToolResult.firstCall` occurs before `adapter.persistWorkflowRuntimeMetadata.secondCall`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

[x] Task 96. Add regression coverage for interrupted and non-persistent tool-backed operation cases.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

[x] Subtask 96.1. In `WorkflowNextActionConsumer.test.ts`, add a test named `persists pending tool-backed operation state before execution failures are surfaced`; it must create an `execute_tool_backed_operation` action with `toolBackedOperationSession`, make `adapter.executeToolBackedOperation` reject, assert `consumer.consume(action)` rejects, assert `adapter.persistWorkflowRuntimeMetadata` was called exactly once before `adapter.executeToolBackedOperation`, assert `adapter.executeToolBackedOperation` was called with the action, and assert `runtime.handleToolBackedOperationToolResult(...)` was not called.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

[x] Subtask 96.2. In `WorkflowNextActionConsumer.test.ts`, add a test named `does not pre-persist tool-backed operations without pending step-resolution state`; it must create an `execute_tool_backed_operation` action without `toolBackedOperationSession`, assert `adapter.renderWorkflowStepResolutionStatus` is not called, assert `adapter.persistWorkflowRuntimeMetadata` is called exactly once after `runtime.handleToolBackedOperationToolResult(...)`, and assert the operation still executes.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

[x] Task 97. Validate Phase 45.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

[x] Subtask 97.1. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, `npm run check-types`, and `npm run lint`; all must pass before Phase 45 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowNextActionConsumer.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

## Phase 46 - Action-Owned Tool And Document Instructions

Pause for QA review after completing Phase 46 before commit.

[x] Task 98. Replace detached workflow operation/document-builder contracts with action-owned instruction types.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`

[x] Subtask 98.1. In `src/core/task/workflow-step-resolution/types.ts`, delete `WorkflowToolBackedOperationDefinition` and replace it with `WorkflowToolBackedActionInstruction`; the new interface must contain `toolName`, `buildStatusDefinition(...)`, `buildToolExecutionRequest(...)`, and `evaluateToolExecutionResult(...)`, preserving the current function signatures except that the type name must describe an action-owned instruction, not a registry definition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/types.ts`

[x] Subtask 98.2. In `src/core/task/workflow-step-resolution/types.ts`, replace `WorkflowStepResolutionSessionState.definitionId` with `sourceRoute: { branchId: string; routeId: string }`; do not retain `definitionId` as an alias or compatibility field.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/types.ts`

[x] Subtask 98.3. In `src/core/task/workflow-runtime/types.ts`, replace `WorkflowDecisionAction` variants `{ kind: "execute_tool_backed_operation"; toolBackedOperationId: ... }` and `{ kind: "build_workflow_document"; documentBuilderId: string }` with action-owned variants: `{ kind: "execute_tool_backed_operation"; instruction: WorkflowToolBackedActionInstruction }` and `{ kind: "build_workflow_document"; instruction: WorkflowDocumentBuildActionInstruction }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 98.4. In `src/core/task/workflow-runtime/types.ts`, add `WorkflowDocumentBuildActionInstruction` with `artifactId`, `toolContract`, `buildContent(session)`, and optional `workflowValueWrites`; this type must be used only inside the `build_workflow_document` decision action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 98.5. In `src/core/task/workflow-runtime/types.ts`, delete `WorkflowToolBackedOperationId`, `WorkflowDocumentBuilderDefinition`, `WorkflowStepDefinition.documentBuilderIds`, `WorkflowDefinition.toolBackedOperationDefinitions`, and `WorkflowDefinition.documentBuilders`; do not replace them with compatibility aliases.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 98.6. In `src/core/task/workflow-runtime/types.ts`, rename `suppressedWorkflowStepResolutionDefinitionIds` to `suppressedWorkflowStepResolutionRoutes` and make it an array of `{ branchId: string; routeId: string }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 98.7. In `src/shared/ExtensionMessage.ts`, replace `ClineWorkflowStepResolutionStatus.definitionId` with `sourceRoute: { branchId: string; routeId: string }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`

[x] Task 99. Update `WorkflowRuntime` to execute and resume action-owned instructions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/buildWorkflowStepResolutionStatusPayload.ts`

[x] Subtask 99.1. In `WorkflowRuntime.ts`, update `buildNextActionFromDecisionTreeAction(...)` so it receives the selected route source `{ branchId, routeId }` in addition to the action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 99.2. In `WorkflowRuntime.ts`, update the `execute_tool_backed_operation` case to use `action.instruction` directly, create or reuse a `stepResolutionSession` keyed by `sourceRoute`, and call `action.instruction.buildToolExecutionRequest(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 99.3. In `WorkflowRuntime.ts`, update the `build_workflow_document` case to use `action.instruction` directly, resolve the destination path from `instruction.artifactId`, call `instruction.buildContent(session)`, and build the `BUILD_WORKFLOW_DOCUMENT` tool request without looking up `workflow.documentBuilders`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 99.4. In `WorkflowRuntime.ts`, delete `buildDocumentBuilderToolRequest(...)` and `findPendingDocumentBuilderId(...)`; their behavior must be folded into action-owned route handling.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 99.5. In `WorkflowRuntime.ts`, update `handleToolBackedOperationToolResult(...)` so pending step-resolution results resolve the original route/action from `stepResolutionSession.sourceRoute` and call `route.action.instruction.evaluateToolExecutionResult(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 99.6. In `WorkflowRuntime.ts`, replace `completeToolBackedOperationSuccess(...)` and `completeToolBackedOperationFailure(...)` arguments and trigger events so they carry `sourceRoute` instead of `toolBackedOperationId`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 99.7. In `WorkflowRuntime.ts`, update restore validation for `stepResolutionSession` to require `sourceRoute.branchId` and `sourceRoute.routeId`, verify that route exists on the active step, and verify that the route action is `execute_tool_backed_operation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 99.7a. In `WorkflowRuntime.ts`, update every `findContinuationSourceRoute(...)` caller to use the new `matches({ route, sourceRoute })` callback shape; specifically update persisted workflow-form restore continuation matching so it reads `route.action.kind` from the destructured `route` value.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 99.8. In `WorkflowRuntime.ts`, update suppressed step-resolution validation to validate `suppressedWorkflowStepResolutionRoutes` against actual active workflow routes rather than operation definition ids.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 99.9. In `WorkflowRuntime.ts`, update definition validation so generic `execute_tool_backed_operation` actions validate their inline `instruction.toolName` and reject runtime-owned tools; remove validation of `toolBackedOperationDefinitions`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 99.9a. In `WorkflowRuntime.ts`, in the `execute_tool_backed_operation` action path, after `action.instruction.buildToolExecutionRequest(...)` returns `toolRequest` and before returning an `execute_tool_backed_operation` next action, validate that `toolRequest.toolName === action.instruction.toolName`; if not, fail clearly as invalid workflow configuration and do not execute the returned tool request.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 99.9b. In `WorkflowRuntime.ts`, in the same post-build request validation path, reject any returned `toolRequest.toolName` that is runtime-owned under the same runtime-owned tool set used by definition validation; do not execute runtime-owned tools through generic `execute_tool_backed_operation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 99.10. In `WorkflowRuntime.ts`, update definition validation so `build_workflow_document` actions validate `instruction.artifactId`, `instruction.toolContract`, `instruction.buildContent`, and declared `workflowValueWrites`; remove validation of `documentBuilders` and `documentBuilderIds`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 99.11. In `buildWorkflowStepResolutionStatusPayload.ts`, emit `sourceRoute` from the session instead of `definitionId`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/buildWorkflowStepResolutionStatusPayload.ts`

[x] Task 100. Update task/webview-facing status and metadata references.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`

[x] Subtask 100.1. In `src/core/task/index.ts`, replace metadata key `suppressedWorkflowStepResolutionDefinitionIds` with `suppressedWorkflowStepResolutionRoutes`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 100.2. In `src/core/task/index.ts`, update `renderWorkflowStepResolutionStatusMessage(...)` logging/state metadata to use `payload.sourceRoute` instead of `payload.definitionId`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

[x] Subtask 100.3. In `webview-ui/src/components/chat/ChatRow.tsx`, update `ClineWorkflowStepResolutionStatus` parsing/rendering references so the component compiles with `sourceRoute` and contains no `definitionId` reference.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`

[x] Task 101. Update runtime and integration tests for action-owned instructions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

[x] Subtask 101.1. In `WorkflowRuntime.test.ts`, remove `WorkflowToolBackedOperationDefinition` imports, `toolBackedOperationDefinitions` fixtures, `documentBuilders` fixtures, and `documentBuilderIds` fixtures.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 101.2. In `WorkflowRuntime.test.ts`, replace generic tool-backed operation fixtures with inline `execute_tool_backed_operation` action instructions on the relevant route actions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 101.3. In `WorkflowRuntime.test.ts`, replace document-builder catalog fixtures with inline `build_workflow_document` action instructions on the relevant route actions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 101.4. In `WorkflowRuntime.test.ts`, replace all `stepResolutionSession.definitionId` assertions and mutations with `stepResolutionSession.sourceRoute` assertions and mutations.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 101.4a. In `WorkflowRuntime.test.ts`, replace all `suppressedWorkflowStepResolutionDefinitionIds` fixtures, mutations, and assertions with `suppressedWorkflowStepResolutionRoutes`; update restore UI-suppression cases to use `{ branchId: string; routeId: string }` route identity values that either resolve to an existing active-step route or intentionally fail closed when stale.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 101.4b. In `WorkflowRuntime.test.ts`, update tool-backed operation status-payload assertions so `buildToolBackedOperationStatusPayload(...)` is asserted before `handleToolBackedOperationToolResult(...)` mutates branch or step state; do not assert pending source-route status after the workflow has transitioned away from the step that owns that source route.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 101.5. In `WorkflowRuntime.test.ts`, add validation coverage proving workflow definitions fail when `execute_tool_backed_operation` actions attempt to use runtime-owned tools through inline instructions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 101.5a. In `WorkflowRuntime.test.ts`, add regression coverage where an inline generic instruction declares an allowed `instruction.toolName` but `buildToolExecutionRequest(...)` returns a runtime-owned `toolRequest.toolName`; assert runtime does not return an executable `execute_tool_backed_operation` for that request and fails clearly.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 101.6. In `WorkflowRuntime.test.ts`, add validation coverage proving workflow definitions fail when a `build_workflow_document` action references a missing `artifactId` through its inline instruction.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 101.7. In `WorkflowRuntime.test.ts`, add restore coverage proving valid pending step-resolution state restores by source route and stale source route state fails closed.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 101.8. In `WorkflowNextActionConsumer.test.ts`, replace test `definitionId` status/session fixtures with `sourceRoute`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`

[x] Subtask 101.9. In `workflow-runtime-metadata.test.ts`, replace `suppressedWorkflowStepResolutionDefinitionIds` fixtures/assertions with `suppressedWorkflowStepResolutionRoutes`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 101.10. In `SubagentRunner.test.ts`, replace `suppressedWorkflowStepResolutionDefinitionIds` fixtures/assertions with `suppressedWorkflowStepResolutionRoutes`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

[x] Subtask 101.11. In `CreateWorkflowArtifactToolHandler.test.ts`, remove empty `toolBackedOperationDefinitions` and `documentBuilders` fixture fields.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`

[x] Subtask 101.12. In `DevStoryStoryTools.test.ts`, replace `suppressedWorkflowStepResolutionDefinitionIds` fixtures/assertions with `suppressedWorkflowStepResolutionRoutes`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

[x] Task 102. Validate Phase 46.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/buildWorkflowStepResolutionStatusPayload.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

[x] Subtask 102.1. Run `rg "toolBackedOperationDefinitions|documentBuilders|documentBuilderIds|WorkflowDocumentBuilderDefinition|WorkflowToolBackedOperationDefinition|WorkflowToolBackedOperationId|toolBackedOperationId|definitionId|suppressedWorkflowStepResolutionDefinitionIds" src/core/task src/shared/ExtensionMessage.ts webview-ui/src/components/chat/ChatRow.tsx`; it must return no matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/buildWorkflowStepResolutionStatusPayload.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`

[x] Subtask 102.2. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`; it must pass.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

[x] Subtask 102.3. Run `npm run check-types` and `npm run lint`; both must pass before Phase 46 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-step-resolution/buildWorkflowStepResolutionStatusPayload.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`

## Phase 47 - Step Transition Decision Actions

Pause for QA review after completing Phase 47 before commit.

### Phase 47 Scope

Replace route-level active-step transition metadata with an explicit `transition_step` `WorkflowDecisionAction`. A selected route must choose exactly one action. If that action transitions the active step, runtime must mutate the active step, evaluate completion through canonical `resolveNextAction(...)`, and continue from the newly active step.

### Phase 47 Scope Boundary

This phase must not redesign same-step branch traversal, remove `followingBranchId`, add workflow graph-cycle validation, or change workflow prompt/tool projection behavior except where required by `transition_step` re-entry.

### Phase 47 Known Issues / Risks / Technical Debt

This phase does not add whole-graph cycle detection for workflow modules that author infinite transition loops. Such loops are module misconfiguration and are outside this foundational correction.

[ ] Task 103. Replace route-level step-transition typing with an explicit decision action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[ ] Subtask 103.1. In `types.ts`, immediately before `WorkflowDecisionAction`, add `WorkflowStepTransitionTarget` as an explicit union with `{ kind: "entry_branch"; stepNumber: number }` and `{ kind: "named_branch"; stepNumber: number; branchId: WorkflowDecisionBranchId }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[ ] Subtask 103.2. In `WorkflowDecisionAction`, add `{ kind: "transition_step"; target: WorkflowStepTransitionTarget }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[ ] Subtask 103.3. In `WorkflowDecisionBranchRoute`, delete `targetStepNumber?: number`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[ ] Task 104. Update `WorkflowRuntime` to execute step transitions only through `transition_step`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[ ] Subtask 104.1. In the `./types` import list, add `WorkflowStepTransitionTarget`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[ ] Subtask 104.2. In `resolveDecisionTreeRoute(...)`, remove the `matchedRoute.targetStepNumber === undefined` condition from same-step `no_op` branch traversal.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[ ] Subtask 104.3. Change `transitionToStep(...)` to accept `target: WorkflowStepTransitionTarget`; resolve `entry_branch` to the target step's `entryBranchId`, resolve `named_branch` to its explicit `branchId`, and return `undefined` when the named branch is absent instead of falling back.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[ ] Subtask 104.4. In `buildNextActionFromDecisionTreeAction(...)`, add a `transition_step` case that calls `transitionToStep(...)`, clears prior-step UI state through that helper, then calls `resolveNextAction({ taskState })`; if the re-entered result is `no_op`, return a `project_prompt` action built from `buildTurnProjection({ taskState })` so the step mutation is persisted.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[ ] Subtask 104.5. In `buildNextActionFromDecisionTreeRoute(...)`, delete the `route.targetStepNumber` transition block; for non-`transition_step` actions, set `session.branchContext.activeBranchId = nextActiveBranchId`, clear `lastTriggerEvent`, and dispatch `route.action`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[ ] Subtask 104.6. In `validateWorkflowDefinition(...)`, delete validation for `route.targetStepNumber`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[ ] Subtask 104.7. In `validateWorkflowDefinition(...)`, add `transition_step` validation requiring the target step to exist, requiring a `named_branch` target branch to exist on that target step, and rejecting any `transition_step` route that also declares `followingBranchId`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[ ] Task 105. Update runtime tests for action-owned step transitions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 105.1. In `WorkflowRuntime.test.ts`, add typed test helpers for `transition_step` actions targeting an entry branch and a named branch; do not use `as any`, `as unknown as`, or forced type assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 105.2. Remove `targetStepNumber` support from `createProjectPromptDecisionTree(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 105.3. Remove `completionTargetStepNumber` support from `createWorkflowFormDecisionTree(...)`; transition-form cases must pass `completionAction: transition_step`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 105.4. Remove `successTargetStepNumber` and `failureTargetStepNumber` support from `createToolBackedOperationDecisionTree(...)`; success/failure transition cases must pass `successAction` or `failureAction` as `transition_step`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 105.5. Remove `approvedTargetStepNumber` support from `createWorkflowProgressDecisionTree(...)`; approved transition cases must pass the approved route action as `transition_step`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 105.6. Update the explicit target-step progression test so the step-1 success route action is `transition_step`, and assert the next returned action is selected from step 3 rather than from the prior step's route.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 105.7. Add regression coverage proving transition into a step with passing completion rules returns `complete_workflow` and tears down workflow state before any target-step handoff.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 105.8. Add regression coverage proving transition into a step with no selected action returns a `project_prompt` handoff rather than `no_op`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 105.9. Update workflow-progress request tests to use `transition_step` for approved step movement.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 105.10. Add definition-validation coverage for missing `transition_step` target step.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 105.11. Add definition-validation coverage for missing `transition_step` named target branch.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 105.12. Add definition-validation coverage rejecting `transition_step` routes that also declare `followingBranchId`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Task 106. Validate Phase 47.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 106.1. Run `rg "targetStepNumber|successTargetStepNumber|failureTargetStepNumber|completionTargetStepNumber|approvedTargetStepNumber" src/core/task/workflow-runtime src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`; it must return no matches.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 106.2. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts`; it must pass.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[ ] Subtask 106.3. Run `npm run check-types` and `npm run lint`; both must pass before Phase 47 is marked complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

## Validation

After all implementation tasks are complete, run these commands from `/Users/robertboston/Documents/Cline Extension/cline`:

```bash
npm run protos
npm run test
npm run check-types
npm run lint
npm run test:unit -- src/core/task/workflow-runtime/__tests__/*.ts
npm run test:unit -- src/core/prompts/__tests__/responses.test.ts src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts
npm run test:unit -- src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts
npm run test:unit -- src/core/slash-commands/__tests__/index.test.ts
npm run test:unit -- src/core/task/workflow-form/__tests__/*.ts
npm run test:unit -- src/core/task/__tests__/workflow-runtime-metadata.test.ts
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts
npm run test:unit -- src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts
npm run test:unit -- src/core/task/focus-chain/__tests__/*.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/*.ts
npm run test:unit -- src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts
npm run test:unit -- src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts
npm run test:unit -- src/core/task/tools/handlers/__tests__/SetWorkflowValuesToolHandler.test.ts src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts
npm run test:unit -- src/core/task/workflow-form/__tests__/schema.test.ts src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/workflow-runtime/__tests__/discovery.test.ts
npm run test:unit -- src/core/task/__tests__/workflow-runtime-metadata.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts src/core/task/tools/handlers/__tests__/SetWorkflowValuesToolHandler.test.ts src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/workflow-runtime/__tests__/WorkflowNextActionConsumer.test.ts
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts
npm run test:unit -- src/core/task/__tests__/workflow-runtime-metadata.test.ts
npm run test:unit -- src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts
npm run test:unit -- src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts src/core/task/__tests__/ToolExecutor.responseToolFailureBudget.test.ts
```

Validation expectations:
- `test` must pass so precommit and phase-by-phase QA can run without stale repository-wide compile blockers from prior phases.
- Phase 33 QA must verify workflow-form wait resolvers are not removed merely because `activeWorkflowSession.ui.formSession` changes during submission processing; direct consumption is allowed only when no resolver existed for the submitted session.
- Phase 31 QA must verify `WorkflowNextActionConsumer.test.ts` and `SubagentRunner.test.ts` use typed test doubles rather than `any`, raw string handler names, or type assertions to satisfy workflow next-action consumer and tool-handler contracts.
- Phase 31 QA must specifically verify the shared `createTaskConfig(...)` fixture in `SubagentRunner.test.ts` no longer uses `as unknown as TaskConfig`, and that its `coordinator.getHandler(...)` handler doubles include concrete `name: ClineDefaultTool.X` members.
- Phase 31 QA must verify `SubagentRunner.test.ts` has no remaining `as any`, `as unknown as`, or `as TaskConfig` assertions in tests added or modified for Phase 31.
- Phase 31 QA must verify `SubagentRunner.autoActivateAssignedWorkflow(...)` guards missing or incomplete parent project context before workflow activation, and the tests cover both missing parent session and incomplete project selection.
- Phase 34 QA must verify `restorePersistedSession(...)` fails closed before accepting malformed persisted session shape, stale workflow-form UI state, stale tool-backed operation state, or stale suppression ids, and valid restored form/tool-backed operation sessions continue to resume through the canonical next-action path.
- Phase 34 QA must verify valid persisted mandatory entry `WorkflowForm` sessions restore through the runtime-owned entry-form path, while stale module-owned workflow forms still fail closed.
- Phase 35 QA must verify every runtime path that returns `terminal_error` has already cleared `activeWorkflowName`, `activeWorkflowSession`, and workflow-owned focus-chain projection before the next-action consumer persists metadata.
- Phase 36 QA must verify workflow-form durable value persistence iterates submitted session values, not every field in every panel; unsubmitted durable fields must not fail intermediate `render_form` transitions, while malformed submitted durable values must still fail explicitly.
- Phase 37 QA must verify module decision-tree predicates cannot access full `ActiveWorkflowSession`, runtime-owned UI state, `branchContext`, or suppression arrays; predicates may access only `activeBranchId`, `workflowValues`, `step`, and `triggerEvent` for event predicates.
- Phase 37 QA must verify `session_initialized` is absent from runtime workflow trigger types and restore validation, and `rg "session_initialized" src/core/task/workflow-runtime` returns no matches.
- Phase 38 QA must verify every non-`no_op` `WorkflowNextAction` returned by `WorkflowRuntime.restorePersistedSession(...)` is routed into `consumeWorkflowNextAction(...)`, while `persist_workflow_teardown` continues to persist cleared metadata directly and `undefined`/`no_op` restore results remain non-consuming.
- Phase 39 QA must verify parent-authored subagent workflow assignment markers are stripped before the child prompt, invalid marker-present assignments fail before the first child model request, no `Assigned Workflow Activation` fallback remains, and assignment marker names do not filter child prompt skill exposure.
- Phase 40 QA must verify `rg "as any|as unknown as|: any|any\\[\\]" src/core/task/tools/subagent` returns no matches, and that subagent runner/builder tests use typed fixtures instead of forced casts.
- Phase 41 QA must verify active child workflow turns use `workflowToolSchemaOverride` as the authoritative model-authored tool surface, static subagent tools are rejected when not projected, workflow-projected tools outside `SUBAGENT_DEFAULT_ALLOWED_TOOLS` still execute, `use_skill` remains rejected, and active child workflow system prompts do not advertise static file/search/command capabilities.
- Phase 42 QA must verify module-authored `terminal_error` decision actions require a non-empty `errorMessage`, runtime terminal next actions surface that module-authored message, and runtime fail-closed terminal errors without a matched module terminal route still preserve fallback failure text behavior.
- Phase 43 QA must verify active-step selectorDiscovery fields validate submitted values against the rendered options stored in the live form session, failed form submissions do not persist durable workflow values, freeform file/directory fields without selectorDiscovery remain allowed, and no submission-time rediscovery is introduced.
- Phase 47 QA must verify `WorkflowDecisionBranchRoute` no longer has `targetStepNumber`, step movement is represented only by `transition_step` decision actions, transition actions do not execute prior-step actions afterward, target-step completion rules are evaluated immediately after transition, and no `targetStepNumber` test fixtures remain.
- `check-types` must pass without reintroducing removed workflow mirror fields, deterministic-step-resolution types, statically exposed workflow-only tool schemas, or legacy `createWorkflowSkillMetadata(...)` references.
- `lint` must pass without leaving dead imports, compatibility shims, or deleted legacy-surface references behind.
- Phase 7 QA must verify `applyWorkflowValueWrites(...)` no longer derives authorization from active-step `set_workflow_values` schema visibility and instead uses only `WorkflowDefinition.workflowValueKeys`.
- `rg "build_workflow_document|BUILD_WORKFLOW_DOCUMENT|build_workflow_document_variants" src/core/prompts/system-prompt/tools src/core/prompts/system-prompt/variants src/core/prompts/system-prompt/__tests__/__snapshots__ docs/system-prompt-tool-reference.md` must return no matches.
- `rg "task_progress|focusChainSettings|focusChainEnabled|FOCUS_CHAIN_PARAM" src/core/prompts/commands.ts src/core/prompts/commands/deep-planning src/core/slash-commands/index.ts webview-ui/src/components/chat/ChatView.tsx webview-ui/src/components/chat/task-header/TaskHeader.tsx webview-ui/src/components/chat/chat-view/components/layout/TaskSection.tsx` must return no matches.
- Workflow-form selector discovery tests must prove `namingPattern` and `labelTemplate` are carried from shared form payload configuration into `WorkflowRuntime` discovery calls.
- `rg "getWorkflowSkillMetadata" src docs/workflows/workflow-runtime/foundational-build/requirements.md docs/workflows/workflow-runtime/requirements.md docs/workflows/workflow-runtime/architecture.md` must return no matches.
- `rg "shouldIncludeBmadPromptContext|BmadPromptContext" src/core/task/index.ts` must return no matches.
- `rg "restoreBmadStateFromMetadata|BmadState" src/core/task/index.ts` must return no matches.
- `rg "managedWorkflow|active_bmad_workflow|extractManagedWorkflow" src/core/task/tokenUsageLogging.ts src/core/task/__tests__/tokenUsageLogging.test.ts` must return no matches.
- `rg "managed workflow" src/core/prompts/system-prompt/tools/use_skill.ts docs/system-prompt-tool-reference.md` must return no matches.
- `rg "managed_workflow_incomplete|Managed workflow" src/core/task/tools/response` must return no matches.
- `rg "consumeCurrentPlaceholderWorkflowStepPromptForInput|refreshManagedWorkflowChecklistProjection|refreshPlaceholderWorkflowChecklistProjection|clearManagedWorkflowChecklistProjection|clearPlaceholderWorkflowChecklistProjection" src/core/task src/core/task/focus-chain/__tests__` must return no matches.
- `rg "task_progress|__COMPLETE_NEXT_STEP__" src/core/prompts/system-prompt/variants/hermes/overrides.ts src/core/prompts/system-prompt/variants/glm/overrides.ts src/core/prompts/system-prompt/spec.ts` must return no matches.
- `rg "Initialize focus chain manager only if enabled|focusChainSettings.enabled" src/core/task/index.ts` must return no matches.
- `rg "FocusChainManager|subagentFocusChain|getOrCreateSubagentFocusChainManager|generateFocusChainInstructions" src/core/task/tools/subagent/SubagentRunner.ts` must return no matches.
- `rg "generateFocusChainInstructions|getFocusChainInstructionsDecision|shouldIncludeFocusChainInstructions|FocusChainInstructionDecision|CURRENT WORKFLOW STATUS" src/core/task src/core/task/focus-chain/__tests__` must return no matches.
- `rg "focusChainInstructions|summarizeFocusChainText|summarizeFocusChainTextBlocks|focus_chain_decision|focus_chain_generation" src/core/task/index.ts src/core/task/focus-chain/index.ts` must return no matches.
- Workflow-runtime and subagent tests must prove child workflow activation copies parent `projectSelection`, skips mandatory entry `WorkflowForm` rendering, and no-ops without mutating child task state when parent project selection is incomplete.
- `rg "workflowValues\\.output_folder|output_folder" src/core/task/workflow-runtime/WorkflowRuntime.ts src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` must return no matches.
- `rg "toggleWorkflow|ToggleWorkflowRequest|refreshWorkflowToggles|getWorkflowCommands" proto src webview-ui cli` must return no matches.
- `rg "localWorkflowToggles|globalWorkflowToggles|remoteWorkflowToggles|workflowToggles|remoteGlobalWorkflows|globalWorkflows" proto src webview-ui cli` must return no matches.
- `rg "remote://workflow|managed-workflow://|Workspace workflow:|Managed workflow:" src webview-ui cli` must return no matches.
- `rg "\\.clinerules/workflows|ensureWorkflowsDirectoryExists|GlobalFileNames\\.workflows" src webview-ui cli` must return no matches.
- `rg "pendingWorkflowFormOperationByTaskState|WeakMap<" src/core/task/workflow-runtime/WorkflowRuntime.ts` must return no matches.
- `rg "pendingWorkflowFormOperation|WorkflowPendingFormOperationState|invoke_deterministic_operation|deterministic_operation|defaultOperationId|operationId" src/core/task/workflow-runtime src/core/task/workflow-form src/shared/ExtensionMessage.ts` must return no matches.
- `rg "WorkflowBranchAction|BranchAction|branchAction|branch_action|execute_branch_action" src/core/task src/core/slash-commands/__tests__/index.test.ts` must return no matches; branch-context and decision-tree branch terminology may remain, but stale branch-action terminology must not.
- Workflow-runtime tests must prove workflow-form submission persists declared durable values, re-enters next-action evaluation, and lets a normal module-owned next-action rule emit exactly one tool-backed `execute_tool_backed_operation` whose payload is built from persisted workflow/session state.
- Workflow-runtime tests must prove generic `toolBackedOperationDefinitions` cannot use `set_workflow_values`, `create_workflow_artifact`, `build_workflow_document`, or `workflow_progress_request`, and that document builders are reachable only through the dedicated `build_workflow_document` decision action.
- Workflow-runtime tests must prove selector discovery/form option population, declared workflow-form value persistence, shared entry project-selection persistence/folder creation, completion detection, teardown, and next-action re-evaluation remain direct runtime-owned deterministic procedures rather than tool-backed operation requests.
- Workflow-runtime tests must prove invalid resolve and invalid resume teardown paths, including missing workflow definition, invalid workflow definition, invalid active step, and invalid live or persisted active branch, return `persist_workflow_teardown`, clear in-memory workflow state, and do not use `no_op` as the only observable result of a state-changing teardown.
- Task-level workflow metadata tests must prove `persist_workflow_teardown` persists cleared workflow metadata, invalid persisted sessions are not retried after cleanup, and true `no_op` remains non-persisting.
- `rg "as any" src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` must return no matches.
- `rg "getNativeFunctionDescription" src/core/prompts/system-prompt/__tests__/integration.test.ts` must return no matches.
- `rg "as unknown as|as TaskConfig|: any|as any" src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts` must return no matches.
- `npx biome check src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts --no-errors-on-unmatched --files-ignore-unknown=true` must pass.
- Workflow-runtime tests must prove workflow values preserve JSON-safe string, number, boolean, array, and object values through form persistence and `applyWorkflowValueWrites(...)`; arrays and objects must not be stringified for storage.
- Workflow-runtime tests must prove malformed form submissions with declared `workflowValueKey` destinations fail explicitly and do not silently skip, drop, or truncate nested array/object values before persistence.
- Set-workflow-values handler tests must prove model-authored JSON-string `values` payloads and object `values` payloads both persist JSON-safe string, number, boolean, array, and object values through `WorkflowRuntime.applyWorkflowValueWrites(...)`.
- Build-workflow-document handler tests must prove JSON-string `workflow_value_writes` payloads and object `workflow_value_writes` payloads both preserve JSON-safe value type and shape before calling `WorkflowRuntime.applyWorkflowValueWrites(...)`.
- Workflow-form schema tests must prove nested malformed array/object form values throw explicit errors instead of being filtered out of normalized submitted values.
- Workflow-runtime tests must prove string-only runtime consumers fail clearly when artifact identity or artifact destination workflow values are not non-empty strings.
- `rg "isWorkflowValue" src/core/task/workflow-runtime/WorkflowRuntime.ts src/core/task/tools/handlers/SetWorkflowValuesToolHandler.ts src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts src/core/task/workflow-runtime/workflowValues.ts` must show imports/usages from the shared `workflowValues.ts` helper rather than duplicate local JSON-safe workflow-value validators.
- `rg "property values are strings|whose property values are strings" src/core/task/tools/handlers/SetWorkflowValuesToolHandler.ts src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts src/core/task/tools/backendWorkflowToolContracts.ts` must return no matches.
- `rg "const trimmedValue = rawValue\\.trim\\(\\)|rawValue\\.trim\\(\\)|workflowValues\\.[a-zA-Z0-9_-]+\\?\\.trim\\(\\)|session\\.workflowValues\\[[^\\]]+\\]\\?\\.trim\\(\\)" src/core/task/workflow-runtime/WorkflowRuntime.ts src/core/task/story-tools/storyTaskDocument.ts src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts` must return no matches.
- `rg "checkClineIgnorePath" src/core/task/tools/handlers/CreateWorkflowArtifactToolHandler.ts src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts` must show both workflow file-writing handlers enforce path policy before approval, hooks, reads, or writes.
- `rg "new BuildWorkflowDocumentToolHandler\\(\\)|new CreateWorkflowArtifactToolHandler\\(\\)" src/core/task/tools src/core/task/tools/handlers/__tests__` must return no matches.
- `rg "new WorkflowRuntime\\(\\{ cwd: [^,}]+ \\}\\)" src/core/task src/core/task/tools` must return no matches.
- `rg "workspacePathPolicy\\?:" src/core/task/workflow-runtime` must return no matches.
- `rg -U "await this\\.teardownWorkflow\\(\\{ taskState \\}\\)[\\s\\S]{0,120}return \\{ kind: \"no_op\" \\}|await this\\.teardownWorkflow\\(\\{ taskState \\}\\)[\\s\\S]{0,120}return undefined" src/core/task/workflow-runtime/WorkflowRuntime.ts` must return no matches.
- `rg "workflowName: WorkflowName" src/core/task/workflow-runtime/types.ts` must return no matches.
- `rg "persistedSession\\.workflowName|taskState\\.activeWorkflowName = persistedSession\\.workflowName|workflowName: workflow\\.name" src/core/task/workflow-runtime/WorkflowRuntime.ts` must return no matches.
- `rg "workflowName:" src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts` must return no `ActiveWorkflowSession` or `PersistedWorkflowSession` fixture properties; legitimate `WorkflowDefinition`, registry stub, and activation-argument uses may remain.
- Workflow-runtime tests must prove `TaskState.activeWorkflowName` is the only canonical active workflow identity used for restore, valid restore keeps that value unchanged, missing `activeWorkflowName` with a present persisted session tears down with persistence required, and legacy extra `workflowName` properties on persisted session objects are stripped before active-session restore and before re-persistence.
- Shared next-action consumer tests must prove the loop behavior formerly owned by `Task.consumeWorkflowNextAction(...)` is preserved for main-task actions, persists `project_prompt` actions for durable non-slash activation, and is reusable by child workflow adapters.
- Use-skill handler tests must prove main-agent workflow `use_skill` queues the successful activation next action instead of dropping it.
- Workflow progress request tests must prove the next action returned from `submitWorkflowProgressRequest(...)` is queued for post-tool consumption.
- Set-workflow-values tests must prove changed workflow values queue next-action re-evaluation and unchanged values do not.
- Task-level tests must prove `presentAssistantMessage(...)` consumes returned workflow next actions from `ToolExecutionOutcome.workflowNextActions` and no longer special-cases only `set_workflow_values`.
- Subagent tests must prove parent-assigned workflow activation consumes its returned next action, child workflows reject `render_workflow_form` clearly, and child workflow `execute_tool_backed_operation` executes through the child tool handler path before re-entering workflow next-action evaluation.
- `rg "if \\(block\\.name === ClineDefaultTool\\.SET_WORKFLOW_VALUES" src/core/task/index.ts` must return no matches.
- `rg "const nextAction = await config\\.workflowRuntime\\.activateWorkflow" src/core/task/tools/handlers/UseSkillToolHandler.ts` must show the successful non-`no_op` result is passed to `config.callbacks.queueWorkflowNextAction(nextAction)`.
- `rg "const nextAction = await this\\.baseConfig\\.workflowRuntime\\.activateWorkflow" src/core/task/tools/subagent/SubagentRunner.ts` must show the successful non-`no_op` result is passed to the child workflow next-action consumer helper.
- `rg "workflowNextActions" src/core/task/ToolExecutor.ts src/core/task/tools/types/TaskConfig.ts src/core/task/tools/utils/ToolConstants.ts src/core/task/index.ts` must show a typed execution-outcome array, a required callback, runtime validation, and post-tool consumption.
- `rg "Before you read project files, search the repo, or analyze code, call \`use_skill\`" src/core/task/tools/subagent` must return no matches.
- Subagent tests must prove workflows assigned to subagents activate through parent-owned assignment, not direct subagent `use_skill`.
- `rg "task_progress" src/core/assistant-message src/shared webview-ui/src/components/chat cli/src` must return no matches.
- `rg "COMPLETE_WORKFLOW_ITEM|complete_workflow_item|complete_workflow_item_variants" src/shared src/core/task src/core/prompts/system-prompt src/core/api/providers/__tests__` must return no matches.
- Subagent tests must prove native-tool API requests use `promptRegistry.nativeTools` when native tools are enabled, including child workflow runs with `workflowToolSchemaOverride`.
- `rg "const nativeTools = useNativeToolCalls \\? candidateNativeTools : undefined|const nativeTools = useNativeToolCalls \\? projectedNativeTools : undefined" src/core/task/tools/subagent/SubagentRunner.ts` must return no matches.
- `rg "CONTINUE_BRAINSTORMING_SESSION|CREATE_BRAINSTORMING_SESSION|SELECT_BRAINSTORMING_SESSION|PERSIST_BRAINSTORMING_APPROACH|SELECT_RANDOM_BRAINSTORMING_TECHNIQUE|PERSIST_BRAINSTORMING_TECHNIQUE|REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION|PREPARE_BRAINSTORMING_SESSION|CAPTURE_BRAINSTORMING_TOPIC|SELECT_TARGET_EPIC" src/shared src/core webview-ui cli` must return no matches.
- `rg "continue_brainstorming_session|create_brainstorming_session|select_brainstorming_session|persist_brainstorming_approach|select_random_brainstorming_technique|persist_brainstorming_technique|request_brainstorming_technique_suggestion|prepare_brainstorming_session|capture_brainstorming_topic|select_target_epic|capture-brainstorming-topic|select-target-epic" src/shared src/core webview-ui cli` must return no matches.
- Subagent tests must prove child workflow-projected tools execute even when absent from the static subagent allowed list, while direct subagent `use_skill` remains rejected.
- Workflow-runtime tests must prove successful workflow-value writes can emit `workflow_values_persisted` and drive next-action route evaluation.
- `rg "STORY_TASK_REMINDER|STORY_TASK_COMPLETE|STORY_NOTES_UPDATE|STORY_TESTING_COMPLETE" src/core/prompts/system-prompt/variants src/core/prompts/system-prompt/tools src/core/prompts/system-prompt/__tests__/spec.test.ts docs/system-prompt-tool-reference.md` must return no matches.
- `rg "story_task_reminder|story_task_complete|story_notes_update|story_testing_complete" src/core/prompts/system-prompt/variants src/core/prompts/system-prompt/tools src/core/prompts/system-prompt/__tests__/__snapshots__ docs/system-prompt-tool-reference.md` must return no matches.
- Workflow-runtime tests must prove artifact allocation creates and persists canonical outputs for `Epics.md`, `Epics.index.json`, `Epic-{E}-delivery-spec.md`, `Story-{E}-{S}.md`, `Remediation-story-{E}-{S}-{R}.md`, `Review-blind-hunter-{target}.md`, `Review-edge-case-hunter-{target}.md`, `Adversarial-review-{target}.md`, `Review-input-{target}.md`, and `Review-input-{target}.diff`.
- Workflow-runtime tests must prove review artifacts inherit the selected story or remediation-story target identity exactly and fail through tool-backed operation failure handling when the selected target does not resolve to a convention-matching artifact in the active project.
- Workflow-runtime tests must prove document builders consume a previously allocated artifact absolute path and that `build_workflow_document` remains a content writer rather than an artifact identity, filename, or project-folder allocator.
- Workflow-runtime tests must prove workflow form field keys are form-local by default, durable form values persist only through explicit `workflowValueKey` destinations, and runtime-populated project/folder/file/artifact selectors use that same destination-key path as typed user-entered fields.
- Workflow-runtime tests must prove shared entry project selection writes normalized project mode, project title, and project folder name into `session.workflowValues` through `entryProjectValueKeys` while continuing to populate `session.projectSelection`.
- Workflow-runtime definition validation tests must prove `entryProjectValueKeys` values and workflow-form field `workflowValueKey` destinations are rejected when blank, untrimmed, or absent from `workflow.workflowValueKeys`.
- `rg "persistWorkflowFormSelections|workflowValueWrites\\[key\\]" src/core/task/workflow-runtime/WorkflowRuntime.ts` must return no matches.
- Create-workflow-artifact handler tests must prove `create_workflow_artifact` accepts native and non-native calls when workflow state is valid, applies path approval before file creation, creates the empty artifact file, delegates numbering/path/persistence to `WorkflowRuntime`, and returns structured artifact output JSON.
- Prompt/system tests must prove `create_workflow_artifact` is absent from default/global prompt and native tool surfaces when no active workflow module projects it, present in the workflow-projected native tool surface when native tools are enabled, and present in the workflow-projected non-native prompt/tool surface when native tools are disabled, only when supplied through `workflowToolSchemaOverride`.
- Subagent tests must prove `create_workflow_artifact` can execute as a child workflow-projected tool even when absent from the static subagent default allowed tools.
- `rg "create_workflow_artifact|CREATE_WORKFLOW_ARTIFACT" src/core/prompts/system-prompt/tools src/core/prompts/system-prompt/variants src/core/prompts/system-prompt/__tests__/__snapshots__` must return no matches.
- `rg "relativePathPattern|initialContent|append_numeric_suffix" src/core/task/workflow-runtime src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` must return no matches.
- `rg "startsWith\\(\"Error:\"\\)" src/core/task/workflow-runtime/WorkflowRuntime.ts` must return no matches; the legacy serialized failure check may exist only inside the shared classifier in `src/core/prompts/responses.ts`.
- The workflow-runtime, workflow-form, workflow-progress-request, subagent, focus-chain, and system-prompt tests must all pass with the decision-tree progression model, runtime-owned prompt projection, runtime-projected workflow-tool exposure, and legacy-surface cleanup in place.
- Final QA should verify the existing `WorkflowRuntime` definition-validation seam still satisfies `FR-63` and `FR-63a`; module-owned native tool schema contents must not be treated as a foundational runtime validation source during prompt/tool projection.
