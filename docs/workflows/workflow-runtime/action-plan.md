---
title: Workflow Runtime Action Plan
instructions:
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
---

# Workflow Runtime Action Plan

This plan implements the approved end-state described in:

- [project-overview.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/project-overview.md)
- [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md)

## Scope

- Bring the shared workflow-runtime action plan into alignment with the current architecture and requirements for runtime-owned project bootstrap, workflow-module `projectSubfolder` ownership, and runtime-owned artifact path/numbering resolution.
- Keep the main plan focused on shared runtime contracts, shared runtime orchestration, and shared handler cutovers.
- Do not execute workflow-specific module-build tasks as part of this plan.

## Scope Boundary

- Do not add buildout subtasks for any workflow that is not already covered by the approved in-scope set.
- Do not re-open workflow runtime architecture decisions that were not changed in the approved architecture and requirements documents.
- Do not invent a hidden project or artifact registry; project and artifact discovery remains convention-driven filesystem behavior.
- Do not modify `/Users/robertboston/Documents/Cline/Workflows/`; those files remain migration sources only.
- Do not execute `docs/workflows/workflow-runtime/workflow-buildout-extract.md` as part of this plan.

## Known Issues / Risks / Technical Debt

- Workflow-specific module buildout remains intentionally out of scope for this plan.
- `problem-solving.md` remains part of the approved architecture and requirements scope, but its missing workflow-buildout task is intentionally not addressed in this revision because the user explicitly deferred that finding.

## Execution Constraints

- Do not modify any workflow source file under `/Users/robertboston/Documents/Cline/Workflows/`; those files are migration sources only.
- Preserve the current shipped workflow identifier strings exactly as they exist today, including the `.md` suffix. `activeWorkflowName` must use those exact strings.
- The workflow runtime is the new canonical owner of workflow identity, session state, active step, prompting projection, tool projection, progression, completion, persistence, resume, and child-session isolation.
- Focus chain becomes a workflow-only downstream projection surface. `task_progress` is retired as a model-controlled progression/update contract.
- Existing specialist capabilities remain specialist capabilities: final system prompt assembly stays in the system-prompt architecture; workflow-form rendering stays in the workflow-form UI surface; start-card rendering stays in the start-card UI surface; normal deterministic operations stay on the normal tool execution path.

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
- Contextual tool gating as a separate owner is retired; its current contents move into workflow modules plus shared workflow-runtime bundle constants. That migration is not in-scope for this foundational build. contextualToolMatrix.ts must be left in place until later, separate action plans complete the buildout of the supported workflow modules.
- The file `.cline/workflow-config.yaml` must be deleted without replacement. Its current responsibilities are redundant with broader runtime context, workflow-runtime-owned project/artifact resolution, and workflow-module-owned code.
- Workflow-module prompt content must be implemented as code-owned prompt-builder functions that accept explicit typed runtime inputs and return fully assembled prompt strings. Workflow runtime must resolve the needed runtime-owned values before invoking those builders, and workflow prompt content must not rely on placeholder-era token resolution, placeholder workflow markdown, managed-workflow placeholder state, or `.cline/workflow-config.yaml`.
- Workflow forms remain an external specialist capability. Workflow-specific form-definition ownership moves into workflow modules, and workflow-form orchestration moves into `WorkflowRuntime`.
- `WorkflowRuntime` owns deterministic workflow-step orchestration. Workflow modules own the workflow-specific deterministic step definitions and rules, while the underlying deterministic operations invoked during that orchestration continue to run on the normal tool-execution path.
- Focus chain becomes a downstream renderer of runtime-owned workflow state. The model no longer updates workflow state through `task_progress`.
- Subagent workflow sessions remain child-local and never share mutable session state with the parent session. A child workflow may inherit parent workflow values only when the child workflow definition explicitly declares which workflow-value keys are inherited. During activation, WorkflowRuntime copies only those declared keys into the child session as initialization.
- The renamed shared workflow-form payload type is `WorkflowForm`, and its workflow-form identity field is `workflowFormId`.
- `WorkflowDefinition.projectSubfolder` is the canonical workflow-module declaration for which project subfolder receives that workflow's artifacts, using only `"discovery" | "planning" | "implementation" | "review" | "testing"`.
- `workflowValues.project_name` remains the human-facing project title, while `workflowValues.output_folder` becomes the canonical per-project folder path.
- `workflowValues.planning_artifacts` and `workflowValues.implementation_artifacts` remain valid workflow-value keys, but they now resolve to `<output_folder>/planning` and `<output_folder>/implementation`.
- The approved shared helper names for project bootstrap and artifact path resolution are `ensureProjectOutputScaffold(...)` and `resolveWorkflowArtifactPath(...)`.

## Workflow-Buildout Boundary

Workflow-specific module inventory and per-workflow buildout tasks live in a separate document and are not part of this plan's execution scope.

This main plan retains only the shared workflow-runtime contract, registry seam ownership, orchestration, prompt/tool projection, persistence, subagent, teardown, test, and documentation work.

## Task / Subtask Sequence
