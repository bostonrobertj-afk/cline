# Foundational Build Audit Results

## Scope

This document records the live-code design-compliance audit performed on April 22, 2026 for the Workflow Runtime Foundational Build.

Primary audit sources:
- `docs/workflows/workflow-runtime/foundational-build/requirements.md`
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md`

Secondary context used only to clarify intent when needed:
- `docs/workflows/workflow-runtime/architecture.md`
- `docs/workflows/workflow-runtime/requirements.md`

Audit rules used for this pass:
- review live code only
- do not trust status labels or prior claims
- treat semantic mismatch as failure even when code compiles
- review touched files against both the foundational requirements and the implementation-order intent
- for Foundational Build, where no workflow modules exist yet, treat workflow-specific naming in foundational/runtime-adjacent code and tests as a defect by default unless the exact surface is explicitly dispositioned to Module Build or Cleanup work

## Executive Verdict

The Workflow Runtime Foundational Build is not fully compliant.

The codebase contains substantial foundational work, but it still fails core foundational requirements around activation/runtime ownership boundaries, runtime session retention, prompt/tool projection, deterministic execution design, progression validation, removal of legacy workflow surfaces, and touched-file conformance.

## Coverage Summary

- Requirements reviewed: `122`
- Status counts:
  - `54` Compliant
  - `27` Partially Compliant
  - `30` Non-Compliant
  - `11` Cannot Verify
- Touched files reviewed: `246` unique paths from the implementation-order inventory
- Missing touched paths: `72`
- Missing touched-path assessment: all `72` missing paths matched delete/remove intent in the implementation-order document; no unexpected missing keep-file was found
- Governance requirements with no verifiable implementation path in live code:
  - `FR-57h`
  - `FR-57j`
  - `FR-57k`
- Requirements blocked from direct live verification because shipped workflow module population is deferred to Module Build, so no live in-scope workflow module definitions exist yet to inspect:
  - `FR-5a`
  - `FR-29b`
  - `FR-33`
  - `FR-33a`
  - `FR-57a`

## Highest Severity Findings

### 1. Critical: `WorkflowRuntime` still loses activated in-memory workflow definitions

Requirements:
- `FR-9`
- `FR-50`
- `FR-52`

Why this is non-compliant:
- `activateWorkflow(...)` accepts a `WorkflowDefinition`, but `resolveNextAction(...)` and `restorePersistedSession(...)` still re-resolve only by `activeWorkflowName`
- the required Phase 9.4 definition-retention seam was not implemented
- workflows activated from in-memory definitions are therefore not durable for the life of the task state unless they are registry-resolvable by name

Evidence:
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:108-112`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:675-708`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:711-739`
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:4875-4883`

### 2. High: foundational implementation drifted the activation boundary away from the approved invocation/runtime ownership model

Requirements:
- `FR-1`
- `FR-5`
- `FR-9`
- `FR-50`
- `FR-52`

Why this is non-compliant:
- the approved architecture assigns `task/index.ts` the invocation-seam duties of detecting workflow invocation, setting `activeWorkflowName`, and invoking the runtime, while `WorkflowRuntime` resolves the active definition from the shipped registry
- the foundational implementation-order rows instead prescribed a caller-supplied `WorkflowDefinition` activation contract, and the live code followed that drift
- slash-command activation, `useSkill`, subagent bootstrap, resume handling, and foundational tests therefore encode the same wrong boundary rather than the approved one

Evidence:
- `docs/workflows/workflow-runtime/architecture.md:177-200`
- `docs/workflows/workflow-runtime/architecture.md:300-306`
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:314-367`
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:812-819`
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:898-900`
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:1148-1158`
- `docs/workflows/workflow-runtime/foundational-build-implementation-order.md:2656-2688`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:46-112`
- `src/core/task/index.ts:1744-1761`
- `src/core/task/index.ts:1845-1858`
- `src/core/task/tools/handlers/UseSkillToolHandler.ts:38-55`
- `src/core/task/tools/subagent/SubagentRunner.ts:941-952`
- `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:295-310`
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts:972-1078`

### 3. High: the mandatory shared pre-workflow entry flow was implemented through the legacy workflow-start-card capability instead of `WorkflowForm`

Requirements:
- `FR-10d`
- `FR-10d1`
- `FR-10e`
- `FR-10f`
- `FR-39`
- `FR-39d`
- `FR-40`
- `FR-44b`

Why this is non-compliant:
- `WorkflowRuntime.resolveNextAction(...)` still routes unresolved pre-workflow project selection through `render_workflow_start_card`
- `WorkflowRuntime` builds that entry-flow state through `buildProjectSelectionStartCardSession(...)`, sourcing informational copy from `workflow.startCard.*` and combining it with project-selection inputs in one start-card session
- `task/index.ts` then renders the entry flow through `buildWorkflowStartCardPayload(...)` and the `workflow_start_card` ask path instead of the `WorkflowForm` path
- the shared message contract, proto contract, and UI request builder still expose a separate `WorkflowStartCard` / `WorkflowStartCardSubmissionRequest` path for this entry interaction
- the approved architecture requires one mandatory shared pre-workflow entry `WorkflowForm` for every workflow invocation, with panel 1 carrying the informational content legacy start cards used to carry and panel 2 collecting the shared project-selection inputs
- so the live foundational implementation preserves the wrong capability model entirely; the defect is no longer just an enum mismatch inside that legacy path

Evidence:
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:142-176`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:1631-1660`
- `src/core/task/index.ts:1494-1508`
- `src/shared/ExtensionMessage.ts:562-605`
- `proto/cline/task.proto:165-183`
- `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts:49-67`
- `src/core/task/workflow-start-card/buildWorkflowStartCardPayload.ts:1-23`

### 4. High: deterministic execution is incomplete

Requirements:
- `FR-42a`
- `FR-43`
- `FR-65`

Why this is non-compliant:
- the runtime validates `documentBuilderId` references but never orchestrates document builders as deterministic next actions
- deterministic failure handling has no workflow-defined retry procedure
- deterministic failure handling also has no final user-visible error path

Evidence:
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:197-286`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:465-545`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:822-858`

### 5. High: foundational implementation preserves legacy deterministic step-resolution as a special runtime feature instead of expressing branch behavior through `WorkflowRuntime`'s module-defined decision tree

Source-of-truth context:
- `docs/workflows/workflow-runtime/architecture.md:337-359`
- `docs/workflows/workflow-runtime/requirements.md:262-264`
- `docs/workflows/workflow-runtime/requirements.md:281-286`
- `docs/workflows/workflow-runtime/requirements.md:330-332`

Why this is non-compliant:
- the live foundational runtime still models deterministic behavior as a distinct feature category with a special next-action kind (`run_deterministic_operation`), a special step config seam (`stepResolutionDefinitionId`), a special definition contract (`WorkflowStepResolutionDefinition`), and a special runtime/result path (`WorkflowStepResolutionRuntime` plus `handleDeterministicToolResult(...)`)
- that means `WorkflowRuntime` is not simply evaluating the active module-defined branch and doing what that branch prescribes
- instead, legacy deterministic step resolution remains a privileged modeling seam that hard-wires branch behavior around tool-backed request/result handling
- the approved requirements and architecture allow normal tool execution as one runtime capability, but they do not authorize preserving deterministic step resolution as a separate canonical feature/model in the new architecture

Evidence:
- `src/core/task/workflow-runtime/types.ts:88-118`
- `src/core/task/workflow-runtime/types.ts:143-154`
- `src/core/task/workflow-step-resolution/types.ts:20-34`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:197-287`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:465-510`

### 6. High: prompt and native-tool projection is not runtime-owned end to end

Requirements:
- `FR-25`
- `FR-31`
- `FR-31a`
- `FR-34`
- `FR-35`
- `FR-35f`
- `FR-36`
- `FR-37`

Why this is non-compliant:
- `WorkflowRuntime.buildTurnProjection()` does not assemble workflow prompt outputs from workflow-module content plus runtime/session state; it simply returns `activeStep.buildPromptProjection(...)`
- the runtime projection contract still carries only one workflow system block, one workflow input block, and one workflow tool override instead of separate workflow prompt variants prepared for full-prompt and continuation-turn use
- the prompt components and continuation-turn assembler simply consume those same raw projected fields, so runtime is not the true owner of workflow prompt variant assembly
- workflow-specific tools like `workflow_progress_request` and `complete_workflow_item` are still statically exposed in prompt-variant tool lists instead of being surfaced only when the runtime-projected workflow tool override includes them
- prompt integration tests ratify this passthrough projection model by asserting continuation behavior directly from the same raw workflow block fields instead of from runtime-owned prompt-variant assembly

Evidence:
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:651-668`
- `src/core/task/workflow-runtime/types.ts:51-54`
- `src/core/prompts/system-prompt/components/workflow_system_instructions.ts:3-9`
- `src/core/prompts/system-prompt/components/workflow_input.ts:3-13`
- `src/core/prompts/system-prompt/components/continuation_turn.ts:37-45`
- `src/core/prompts/system-prompt/variants/gpt-5/config.ts:60-68`
- `src/core/prompts/system-prompt/variants/native-gpt-5/config.ts:72-80`
- `src/core/prompts/system-prompt/registry/ClineToolSet.ts:137-147`
- `src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts:51-73`
- `src/core/prompts/system-prompt/__tests__/integration.test.ts:1037-1104`

### 7. High: workflow-form and workflow-persistence migration is incomplete

Requirements:
- `FR-39b`
- `FR-39d`
- `FR-44b`
- `FR-51`

Why this is non-compliant:
- legacy resolver terminology and fragmented workflow mirrors remain in `TaskState`, context tracking, persistence, restore, and `WorkflowFormRegistry`
- canonical `activeWorkflowSession` was added, but separate top-level start-card, form, step-resolution, and suppression carriers were retained and persisted in parallel instead of remaining downstream projections only
- `task/index.ts` persists and restores those carriers separately, and `WorkflowRuntime` syncs them back out of `session.ui`, leaving duplicated workflow persistence topology instead of one canonical session plus downstream projection
- workflow-specific form ownership has not fully moved into `WorkflowRuntime`
- the foundational migration reworked the legacy `WorkflowFormRegistry` in place instead of removing live ownership from it; workflow-start and brainstorming-specific definition builders, the registry map, and the resolver lookup helper still remain in the live ownership path
- `WorkflowRuntime` still delegates per-panel payload construction to `workflowFormRuntime.buildPayload(...)`, so `WorkflowFormRuntime` still owns active-panel payload assembly

Evidence:
- `src/core/task/TaskState.ts:121-130`
- `src/core/context/context-tracking/ContextTrackerTypes.ts:37-46`
- `src/core/task/index.ts:1287-1297`
- `src/core/task/index.ts:1845-1858`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:724-734`
- `src/core/task/workflow-form/WorkflowFormRegistry.ts:19-21`
- `src/core/task/workflow-form/WorkflowFormRegistry.ts:281-324`
- `src/core/task/workflow-form/WorkflowFormRegistry.ts:326-447`
- `src/core/task/workflow-form/WorkflowFormRegistry.ts:148-181`
- `src/core/task/workflow-form/WorkflowFormRegistry.ts:859-929`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:289-305`
- `src/core/task/workflow-form/WorkflowFormRuntime.ts:498-509`
- `src/core/task/workflow-form/WorkflowFormRuntime.ts:628-637`

### 8. High: `workflow_progress_request` approval mutation is not re-validated at the canonical runtime seam

Requirements:
- `FR-26`

Why this is non-compliant:
- the runtime has a dedicated `isWorkflowProgressRequestAllowed(...)` guard that checks session state, project-selection completion, and `activeStep.allowWorkflowProgressRequest`
- `submitWorkflowProgressRequest(...)` does not re-run that validation before mutating canonical workflow state
- a positive approval therefore advances `session.activeStepNumber` through the canonical runtime mutation path without re-validating that the active step still permits workflow-progress approval

Evidence:
- `docs/workflows/workflow-runtime/foundational-build/requirements.md:56`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:548-589`

### 9. High: `WorkflowRuntime` hardcodes step progression as `+1` instead of deriving the target step from module-owned rules

Source-of-truth context:
- `docs/workflows/workflow-runtime/requirements.md:253`
- `docs/workflows/workflow-runtime/requirements.md:277-284`
- `docs/workflows/workflow-runtime/architecture.md:351-369`

Why this is non-compliant:
- deterministic success unconditionally advances with `session.activeStepNumber += 1`
- approved `workflow_progress_request` also unconditionally advances with `session.activeStepNumber += 1`
- the module contract does not provide a rule-owned transition target for “which step comes next,” so the runtime hardcodes the destination step instead of deriving it from module-owned progression rules
- this blocks compliant branching, skipping, and explicit target-step progression from being expressed through the workflow definition
- `WorkflowRuntime.test.ts` also asserts this hardcoded progression model as expected behavior for deterministic success, deterministic fallback/failure, and approved `workflow_progress_request`

Evidence:
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:481-490`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts:572-589`
- `src/core/task/workflow-runtime/types.ts:143-151`
- `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:620-623`
- `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:666-668`
- `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:710-712`
- `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:768-776`

### 10. Medium: undeferred workflow-specific surfaces remain in foundational/runtime-adjacent code and tests

Requirements:
- `FR-57g`
- `FR-57i`

Why this is non-compliant:
- no workflow modules have been built yet in this phase
- these foundational/runtime-adjacent surfaces still hard-code specific workflow names or workflow-specific behavior
- none of the cited surfaces were found to have an explicit Module Build or Cleanup disposition that would justify keeping them in the foundational live codebase

Evidence:
- `src/shared/build-story-document.ts:1-33`
- `src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts:7-19`
- `src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts:8-53`
- `src/core/task/workflow-form/dictionaries/systemDictionary.ts:674-679`
- `src/core/task/__tests__/managedWorkflowCoverage.test.ts:5-75`
- `src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts:25-37`
- `src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts:6-72`
- `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts:9-112`
- `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts:168-220`
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts:972-1078`

### 11. Medium: legacy managed-workflow and task-progress surfaces are still live

Requirements:
- `FR-4`
- `FR-27`
- `FR-28`
- `FR-38`
- `FR-57g`
- `FR-57i`

Why this is non-compliant:
- the repo still contains managed-workflow registry/controller/renderer behavior
- the prompt layer still renders `<active_bmad_workflow>`
- the system still instructs the model to use `complete_workflow_item`
- the focus-chain layer still uses `task_progress` as a workflow checklist carrier

Evidence:
- `src/core/task/managed-workflows/ManagedWorkflowRegistry.ts:6-39`
- `src/core/task/managed-workflows/ManagedWorkflowController.ts:56-76`
- `src/core/task/managed-workflows/ManagedWorkflowRenderer.ts:178-224`
- `src/core/task/focus-chain/index.ts:140-145`
- `src/core/task/focus-chain/index.ts:266-272`
- `src/core/task/focus-chain/index.ts:516-524`

### 12. Medium: touched prompt snapshots/tests and auto-approval tables still retain deleted legacy workflow contracts

Requirements:
- `FR-57g`
- `FR-57i`

Why this is non-compliant:
- touched prompt snapshots and tests still contain `task_progress`, `build_review_diff_output`, `set_workflow_placeholders`, and `.cline/workflow-config.yaml`
- `autoApprove.ts` still references deleted legacy workflow document tools

Evidence:
- `src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-basic.snap:86`
- `src/core/prompts/system-prompt/__tests__/__snapshots__/vertex_gemini3.tools.snap:368-369`
- `src/core/prompts/system-prompt/__tests__/integration.test.ts:1126-1128`
- `src/core/task/tools/autoApprove.ts:54-60`
- `src/core/task/tools/autoApprove.ts:86-93`
- `src/core/task/tools/autoApprove.ts:120-127`

## Requirement Status Summary

### Non-Compliant Requirements

- `FR-4`
- `FR-10b`
- `FR-25`
- `FR-27`
- `FR-28`
- `FR-29g`
- `FR-31a`
- `FR-31b`
- `FR-34`
- `FR-34a`
- `FR-34b`
- `FR-34c`
- `FR-34d`
- `FR-37`
- `FR-38`
- `FR-39b`
- `FR-39d`
- `FR-39f`
- `FR-42a`
- `FR-43`
- `FR-44b`
- `FR-51`
- `FR-53`
- `FR-55`
- `FR-55a`
- `FR-56`
- `FR-57g`
- `FR-57i`
- `FR-64`
- `FR-65`

### Partially Compliant Requirements

- `FR-1`
- `FR-3`
- `FR-5`
- `FR-9`
- `FR-10`
- `FR-10a`
- `FR-10g2`
- `FR-23`
- `FR-24`
- `FR-26`
- `FR-29a`
- `FR-29d`
- `FR-29f`
- `FR-31`
- `FR-35`
- `FR-35e`
- `FR-35f`
- `FR-39`
- `FR-44`
- `FR-46`
- `FR-49`
- `FR-50`
- `FR-52`
- `FR-57b`
- `FR-57c`
- `FR-57l`
- `FR-60`

### Cannot Verify Requirements

- `FR-5a`
- `FR-29b`
- `FR-33`
- `FR-33a`
- `FR-57d`
- `FR-57e`
- `FR-57f`
- `FR-57a`
- `FR-57h`
- `FR-57j`
- `FR-57k`

Note:
- the activation-boundary drift finding expands the evidence behind existing partial judgments for `FR-1`, `FR-5`, `FR-9`, `FR-50`, and `FR-52`
- `FR-26` was downgraded because `submitWorkflowProgressRequest(...)` mutates canonical state without re-running the runtime's own workflow-progress permission checks
- `FR-5a`, `FR-29b`, `FR-33`, `FR-33a`, and `FR-57a` were blocked because live shipped workflow module population is deferred to Module Build, so no in-scope workflow modules exist yet to inspect

## Key Touched-File Divergences

| File | Status | Note |
| --- | --- | --- |
| `src/core/task/workflow-runtime/WorkflowRuntime.ts` | Non-Compliant | active-definition retention, start-card contract, hardcoded `+1` progression targets, prompt assembly, deterministic retry/error, and legacy mirrors all diverge |
| `src/core/task/index.ts` | Non-Compliant | `managedWorkflowActive` and fragmented workflow persistence/restore remain |
| `src/core/task/tools/handlers/UseSkillToolHandler.ts` | Non-Compliant | `useSkill` activation still depends on the drifted caller-supplied workflow-definition contract |
| `src/core/task/tools/subagent/SubagentRunner.ts` | Non-Compliant | child workflow bootstrap still depends on the same drifted activation contract |
| `src/core/task/TaskState.ts` | Non-Compliant | mirrored workflow UI sessions and `suppressedWorkflowFormResolverIds` remain |
| `src/core/context/context-tracking/ContextTrackerTypes.ts` | Non-Compliant | mirrored workflow session fields remain |
| `src/core/task/workflow-form/WorkflowFormRegistry.ts` | Non-Compliant | foundational changes reworked the legacy registry in place; workflow-specific builders, registry ownership, and resolver lookup still remain here |
| `src/core/task/workflow-form/WorkflowFormRuntime.ts` | Non-Compliant | `buildPayload(...)` and resolved-panel assembly still own canonical per-panel payload construction |
| `src/core/task/workflow-runtime/types.ts` | Non-Compliant | deterministic next-action shape hardens one `toolRequest` per runtime deterministic action |
| `src/core/task/workflow-step-resolution/types.ts` | Non-Compliant | step-resolution definitions harden one request builder and one evaluation pass |
| `src/core/prompts/system-prompt/tools/init.ts` | Non-Compliant | still registers `complete_workflow_item` |
| `src/core/prompts/system-prompt/tools/workflow_progress_request.ts` | Non-Compliant | tool spec lacks runtime-gated exposure semantics |
| `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts` | Non-Compliant | legacy workflow bundle/tool ids remain |
| `src/core/prompts/system-prompt/variants/*/config.ts` | Non-Compliant | variant configs still expose `workflow_progress_request` and `complete_workflow_item` |
| `src/core/task/tools/autoApprove.ts` | Non-Compliant | still references deleted legacy workflow document tool ids |
| `src/core/task/focus-chain/index.ts` | Non-Compliant | `task_progress` remains the workflow checklist carrier |
| `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` | Non-Compliant | hides the proto enum mismatch, lacks active-definition-retention coverage, and ratifies the hardcoded `+1` progression model |
| `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts` | Non-Compliant | hard-coded workflow names and the drifted activation contract remain in foundational subagent coverage |
| `src/core/prompts/system-prompt/__tests__/integration.test.ts` and touched snapshots | Non-Compliant | stale legacy prompt outputs remain, and continuation-turn coverage ratifies the drifted single-projection contract |
| `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts` | Compliant | UI-side submit contract correctly uses the proto enum values |

## Confirmed Foundational Pieces That Did Land

- shared discovery/list-builder seam:
  - `src/core/task/workflow-runtime/discovery.ts:63-85`
- shared `WorkflowForm` contract rename:
  - `src/shared/ExtensionMessage.ts:562-573`
  - `src/core/task/workflow-form/buildWorkflowFormPayload.ts:4-42`
- shared workflow value persistence tool:
  - `src/core/task/tools/handlers/SetWorkflowValuesToolHandler.ts:60-106`
- shared workflow document-generation tool:
  - `src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts:125-240`
- shared step-resolution runtime after registry retirement:
  - `src/core/task/workflow-step-resolution/WorkflowStepResolutionRuntime.ts:12-55`

## Missing Touched Paths

The implementation-order inventory included `72` touched paths that are no longer present in the repo.

Audit result:
- each missing path matched delete/remove/retire intent in the implementation-order entry text
- no touched file that the implementation-order document described as a keep-or-rewrite target was unexpectedly absent

Representative planned deletions:
- `src/core/task/workflow-activation.ts`
- `src/core/task/workflowCompletionRunner.ts`
- `src/core/task/workflowCompletionHandler.ts`
- `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts`
- `src/core/workflows/resolution/resolveAvailableWorkflows.ts`
- `src/core/workflows/placeholder-workflow-rendering.ts`
