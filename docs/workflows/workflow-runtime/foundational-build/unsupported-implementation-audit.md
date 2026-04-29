# Workflow Runtime Foundational Build Unsupported Implementation Audit

Date: `2026-04-23`

Reviewed commit range:
- Start: `62decf6c652de952ff52358c6ec70b91b6892e80`
- End: `685582ec1feccfa26f335ff76dc2797e2ffa2b51`

Authoritative source-of-truth documents checked:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build/requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md`

## 1. Executive Verdict

No. The touched range from `62decf6c652de952ff52358c6ec70b91b6892e80` through `685582ec1feccfa26f335ff76dc2797e2ffa2b51` is not fully backed by the approved requirements and architecture.

The primary unsupported drift is concentrated in:
- deterministic progression ownership
- prompt projection contract shape
- `set_workflow_values` execution semantics
- workflow-form payload ownership
- persistence and mirror-state topology
- tests and implementation-planning docs that codified those drifted contracts

## 2. Findings

### Finding 1

- severity: `Critical`
- short title: `Deterministic and approval progression were hardcoded instead of remaining workflow-defined`
- why the change is not directly/completely supported:
  - `WorkflowRuntime` increments `activeStepNumber` by exactly `1` on deterministic success.
  - `WorkflowRuntime` also increments `activeStepNumber` by exactly `1` after approved `workflow_progress_request`.
  - Deterministic failure suppresses the definition id and immediately re-evaluates instead of executing a workflow-defined retry procedure and surfacing a final user-visible error.
  - This narrows progression into one specific implementation that the approved docs did not authorize.
- exact git-scoped evidence:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:483`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:489`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:495`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:501`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:572`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:583`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts:199`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:611`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:621`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:666`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:710`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:768`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:773`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:417`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:418`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:419`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:2826`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:2827`
  - commit introducing the runtime behavior: `62decf6c652de952ff52358c6ec70b91b6892e80`
  - later doc/test reinforcement in range: `685582ec1feccfa26f335ff76dc2797e2ffa2b51`
- exact source-of-truth references checked:
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md:281-286`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md:332`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md:333-341`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md:351-359`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md:361-369`
- unsupported addition/narrowing/ownership drift:
  - The implementation hardcodes unconditional step advancement and suppression-array-driven failure handling where the approved docs require workflow-defined remain/advance rules and workflow-defined retry/error behavior.

### Finding 2

- severity: `High`
- short title: `Prompt projection was narrowed to a single raw projection path`
- why the change is not directly/completely supported:
  - The runtime contract exposes one system block and one input block only.
  - The prompt-builder input has no full-turn versus continuation-turn selector.
  - `WorkflowRuntime.buildTurnProjection(...)` returns the exact step projection rather than performing runtime-owned turn-variant selection.
  - Tests then encode the same projection contract on continuation turns.
- exact git-scoped evidence:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts:51`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts:52`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts:53`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts:96`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts:147`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:651`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:668`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts:2945`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts:2969`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts:2971`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts:2258`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts:2281`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts:2304`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts:2327`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:129-148`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:436`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:2808`
  - commit introducing the runtime shape: `62decf6c652de952ff52358c6ec70b91b6892e80`
  - later test/doc reinforcement in range: `685582ec1feccfa26f335ff76dc2797e2ffa2b51`
- exact source-of-truth references checked:
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md:295-316`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md:469-476`
- unsupported addition/narrowing/ownership drift:
  - The implementation collapses the approved full-turn/continuation-turn runtime projection contract into a single raw step projection seam.

### Finding 3

- severity: `High`
- short title: ``set_workflow_values` fallback schema is exposed, but default execution is blocked`
- why the change is not directly/completely supported:
  - `applyWorkflowValueWrites(...)` starts with an empty allowed-key set.
  - Keys become writable only if a step-specific override exposes `values` object properties.
  - When no override exists, every requested key is returned as unchanged and nothing is persisted.
  - That narrows the approved shared fallback behavior into an override-required behavior not authorized by the docs.
- exact git-scoped evidence:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:601-642`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:779-846`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:2828-2833`
  - commit introducing the runtime behavior: `62decf6c652de952ff52358c6ec70b91b6892e80`
  - later doc/test reinforcement in range: `685582ec1feccfa26f335ff76dc2797e2ffa2b51`
- exact source-of-truth references checked:
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md:306-314`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md:343-349`
- unsupported addition/narrowing/ownership drift:
  - The approved shared fallback schema became non-executable by default.

### Finding 4

- severity: `High`
- short title: `Workflow form per-panel payload ownership still lives in WorkflowFormRuntime`
- why the change is not directly/completely supported:
  - `WorkflowRuntime.resolveNextAction(...)` still delegates form payload construction to `workflowFormRuntime.buildPayload(...)`.
  - `WorkflowFormRuntime` still resolves the active panel and constructs the per-panel payload itself.
  - The approved docs allow generic form engine behavior there, but not workflow-specific per-panel payload ownership.
- exact git-scoped evidence:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:289-305`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts:628-662`
  - commit introducing the runtime delegation in range: `62decf6c652de952ff52358c6ec70b91b6892e80`
- exact source-of-truth references checked:
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md:321-336`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md:331-341`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md:478-487`
- unsupported addition/narrowing/ownership drift:
  - Specialist form mechanics remain mixed with workflow-specific payload ownership instead of moving payload ownership into `WorkflowRuntime`.

### Finding 5

- severity: `High`
- short title: `In-range changes reworked the legacy WorkflowFormRegistry instead of removing live ownership from it`
- why the change is not directly/completely supported:
  - The touched changes renamed placeholder-start behavior to `SET_WORKFLOW_VALUES` inside the legacy registry layer.
  - The file still exports workflow-start and brainstorming-specific definition builders, the registry map, and the resolver lookup helper.
  - The migration matrix requires those live ownership seams to move out rather than be preserved and updated in place.
- exact git-scoped evidence:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts:19-21`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts:281-324`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts:326-447`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts:859-929`
  - commit with in-range registry rewrite: `a3c48a9669cb2282ccdf6090e097b23c682af6fa`
- exact source-of-truth references checked:
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md:434-444`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md:374-379`
- unsupported addition/narrowing/ownership drift:
  - The foundational migration updated a legacy registry seam in place instead of moving live workflow-form ownership into `WorkflowRuntime` and workflow modules as prescribed.

### Finding 6

- severity: `Medium`
- short title: `Canonical session state was added, but parallel top-level workflow mirrors were retained and persisted`
- why the change is not directly/completely supported:
  - `TaskState` and `TaskMetadata` add `activeWorkflowSession` and `PersistedWorkflowSession`.
  - The same in-range changes also preserve separate top-level start-card, form, step-resolution, and suppression carriers.
  - `task/index.ts` persists and restores those carriers separately, and `WorkflowRuntime` syncs them out of `session.ui`.
  - The approved docs call for one canonical workflow session plus downstream projections, not duplicated persistence topology.
- exact git-scoped evidence:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts:121-130`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts:37-46`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts:1287-1297`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts:1845-1858`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:724-734`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-change-map.md:128-139`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:328`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:768-772`
  - commit introducing the foundational state shape: `62decf6c652de952ff52358c6ec70b91b6892e80`
  - later doc reinforcement in range: `3e2d239f0940ac5560477a7fd7760f3b3655bd8a`
  - later doc reinforcement in range: `685582ec1feccfa26f335ff76dc2797e2ffa2b51`
- exact source-of-truth references checked:
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md:220-222`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/requirements.md:344-346`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md:426-437`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/architecture.md:489-498`
- unsupported addition/narrowing/ownership drift:
  - The approved canonical session was introduced, but extra mirrored workflow carriers and separate persisted copies were kept as additional structure without direct approval.

### Finding 7

- severity: `Medium`
- short title: `Tests and implementation-planning docs institutionalized the drift instead of policing the approved design`
- why the change is not directly/completely supported:
  - The implementation-order doc explicitly prescribes:
    - mirror fields
    - single prompt projection contract
    - hardcoded deterministic success/failure behavior
    - separate metadata mirror writes
  - The change-map repeats the same mirror guidance.
  - Runtime tests and prompt integration tests then assert those drifted contracts as expected behavior.
- exact git-scoped evidence:
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:126-155`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:181-192`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:417-419`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:436`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:768-772`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-implementation-order.md:2808-2833`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/foundational-build-change-map.md:128-145`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts:621-845`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts:2258-2338`
  - commits in range encoding the drift:
    - `3e2d239f0940ac5560477a7fd7760f3b3655bd8a`
    - `a3c48a9669cb2282ccdf6090e097b23c682af6fa`
    - `685582ec1feccfa26f335ff76dc2797e2ffa2b51`
    - `62decf6c652de952ff52358c6ec70b91b6892e80`
- exact source-of-truth references checked:
  - the same approved requirements and architecture lines cited in Findings 1 through 6
- unsupported addition/narrowing/ownership drift:
  - Governance artifacts and tests ratified invented foundational contracts rather than enforcing the approved ones.

## 3. Touched File Audit

```text
path | reviewed | status | note
docs/workflows/workflow-runtime/foundational-build-change-map.md | yes | Partially Supported | Mixed alignment; also codifies unsupported mirror/projection guidance.
docs/workflows/workflow-runtime/foundational-build-implementation-order.md | yes | Partially Supported | Mixed alignment; also codifies unsupported progression/prompt/mirror guidance.
docs/workflows/workflow-runtime/requirements.md | yes | Cannot Verify | Authoritative baseline used for this audit.
proto/cline/file.proto | yes | Supported | Deletes retired focus-chain file-open RPC.
proto/cline/task.proto | yes | Supported | WorkflowForm/project-selection contract alignment.
src/core/context/context-tracking/ContextTrackerTypes.ts | yes | Partially Supported | Adds canonical session but keeps extra top-level workflow mirrors.
src/core/controller/file/openFocusChainFile.ts | yes | Supported | Deleted legacy file-open surface.
src/core/controller/slash/getAvailableSlashCommands.ts | yes | Supported | Uses shipped workflow registry.
src/core/prompts/contextManagement.ts | yes | Supported | Retires workflow task_progress ownership.
src/core/prompts/system-prompt/__tests__/PromptBuilder.test.ts | yes | Supported | Prompt projection alignment.
src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts | yes | Supported | Deleted legacy workflow gating test.
src/core/prompts/system-prompt/__tests__/integration.test.ts | yes | Partially Supported | Encodes single-block continuation projection contract.
src/core/prompts/system-prompt/__tests__/response_tools.test.ts | yes | Supported | Response-tool alignment.
src/core/prompts/system-prompt/__tests__/task_progress.test.ts | yes | Supported | Deleted retired workflow task_progress test.
src/core/prompts/system-prompt/components/agent_role.ts | yes | Supported | Deleted legacy persona component.
src/core/prompts/system-prompt/components/continuation_turn.ts | yes | Supported | Consumes runtime-projected workflow blocks.
src/core/prompts/system-prompt/components/index.ts | yes | Supported | Export alignment.
src/core/prompts/system-prompt/components/mcp.ts | yes | Supported | Prompt assembly alignment.
src/core/prompts/system-prompt/components/response_tools.ts | yes | Supported | Tool-surface alignment.
src/core/prompts/system-prompt/components/task_progress.ts | yes | Supported | Deleted retired workflow task_progress component.
src/core/prompts/system-prompt/components/user_instructions.ts | yes | Supported | Removes legacy workflow prompt injection.
src/core/prompts/system-prompt/components/workflow_input.ts | yes | Supported | Runtime input-block carrier.
src/core/prompts/system-prompt/components/workflow_system_instructions.ts | yes | Supported | Runtime system-block carrier.
src/core/prompts/system-prompt/registry/ClineToolSet.ts | yes | Supported | Workflow tool override wiring.
src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts | yes | Supported | Workflow override wiring.
src/core/prompts/system-prompt/registry/contextualToolMatrix.ts | yes | Supported | Removes legacy workflow gating ownership.
src/core/prompts/system-prompt/templates/placeholders.ts | yes | Supported | Placeholder-era workflow dependency reduced.
src/core/prompts/system-prompt/tools/attempt_completion.ts | yes | Supported | Workflow task_progress surface retired.
src/core/prompts/system-prompt/tools/build_review_diff_output.ts | yes | Supported | Deleted bespoke workflow document tool schema.
src/core/prompts/system-prompt/tools/build_workflow_document.ts | yes | Supported | Shared workflow document-generation schema.
src/core/prompts/system-prompt/tools/generate_plan_output.ts | yes | Supported | Workflow task_progress surface retired.
src/core/prompts/system-prompt/tools/index.ts | yes | Supported | Tool export alignment.
src/core/prompts/system-prompt/tools/init.ts | yes | Supported | Tool initialization alignment.
src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts | yes | Supported | Deleted placeholder-era workflow tool schema.
src/core/prompts/system-prompt/tools/set_workflow_values.ts | yes | Supported | Shared fallback workflow-value schema.
src/core/prompts/system-prompt/tools/workflow_progress_request.ts | yes | Supported | Runtime-owned progression request exposure.
src/core/prompts/system-prompt/types.ts | yes | Supported | Runtime workflow prompt-context fields.
src/core/prompts/system-prompt/variants/config.template.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/devstral/config.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/devstral/overrides.ts | yes | Supported | Deleted obsolete variant override layer.
src/core/prompts/system-prompt/variants/devstral/template.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/gemini-3/config.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/gemini-3/overrides.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/gemini-3/template.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/generic/config.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/generic/template.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/glm/config.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/glm/overrides.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/glm/template.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/gpt-5/config.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/gpt-5/template.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/hermes/config.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/hermes/overrides.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/hermes/template.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/native-gpt-5-1/template.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/native-gpt-5/config.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/native-gpt-5/template.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/native-next-gen/config.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/native-next-gen/template.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/next-gen/config.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/next-gen/template.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/trinity/config.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/trinity/template.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/variant-validator.ts | yes | Supported | Workflow prompt/tool validation alignment.
src/core/prompts/system-prompt/variants/xs/config.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/xs/overrides.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/prompts/system-prompt/variants/xs/template.ts | yes | Supported | Workflow prompt/tool wiring.
src/core/slash-commands/__tests__/index.test.ts | yes | Supported | Slash-command registry coverage alignment.
src/core/slash-commands/index.ts | yes | Supported | Canonical slash-command activation seam.
src/core/task/TaskState.ts | yes | Partially Supported | Adds canonical session but preserves extra mirrored carriers.
src/core/task/ToolExecutor.ts | yes | Supported | Injects workflowRuntime and removes legacy wrapper path.
src/core/task/__tests__/prompt-context.test.ts | yes | Supported | Deleted legacy prompt-context test surface.
src/core/task/__tests__/prompt-refresh.test.ts | yes | Supported | Prompt refresh alignment.
src/core/task/__tests__/workflowCompletionRunner.test.ts | yes | Supported | Deleted legacy workflow-completion test surface.
src/core/task/bmad-agent-mode.test.ts | yes | Supported | Deleted BMAD reminder test surface.
src/core/task/bmad-agent-mode.ts | yes | Supported | Deleted BMAD reminder runtime surface.
src/core/task/focus-chain/__tests__/diagnostics.test.ts | yes | Supported | Focus-chain downstream-runtime coverage.
src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts | yes | Supported | Focus-chain downstream-runtime coverage.
src/core/task/focus-chain/deterministicPlaceholderProgression.ts | yes | Supported | Deleted placeholder deterministic progression seam.
src/core/task/focus-chain/index.ts | yes | Supported | Focus chain reduced to downstream reflection.
src/core/task/focus-chain/updateFromToolResponse.ts | yes | Supported | Deleted legacy pre/post tool workflow wrapper seam.
src/core/task/index.ts | yes | Partially Supported | Delegates to runtime, but persists extra mirrors and consumes single projection path.
src/core/task/prompt-refresh.ts | yes | Supported | Refresh logic aligned to runtime workflow activity.
src/core/task/tools/ToolExecutorCoordinator.ts | yes | Supported | Foundational workflow handler registry cleanup.
src/core/task/tools/autoApprove.ts | yes | Supported | Tool auto-approval alignment.
src/core/task/tools/backendWorkflowToolContracts.ts | yes | Supported | Canonical workflow contracts reduced to shared tools.
src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts | yes | Supported | Deleted bespoke workflow document handler.
src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts | yes | Supported | Deleted bespoke workflow document handler.
src/core/task/tools/handlers/BuildReviewDiffOutputToolHandler.ts | yes | Supported | Deleted bespoke workflow document handler.
src/core/task/tools/handlers/BuildReviewInputToolHandler.ts | yes | Supported | Deleted legacy review-input handler.
src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts | yes | Supported | Deleted bespoke workflow document handler.
src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts | yes | Supported | Deleted bespoke workflow document handler.
src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts | yes | Supported | Shared document-generation handler.
src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts | yes | Supported | Deleted workflow-specific handler.
src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts | yes | Supported | Updated to canonical workflow-value carrier.
src/core/task/tools/handlers/ContinueBrainstormingSessionToolHandler.ts | yes | Supported | Deleted workflow-specific handler.
src/core/task/tools/handlers/CreateBrainstormingSessionToolHandler.ts | yes | Supported | Deleted workflow-specific handler.
src/core/task/tools/handlers/PersistBrainstormingApproachToolHandler.ts | yes | Supported | Deleted workflow-specific handler.
src/core/task/tools/handlers/PersistBrainstormingTechniqueToolHandler.ts | yes | Supported | Deleted workflow-specific handler.
src/core/task/tools/handlers/RequestBrainstormingTechniqueSuggestionToolHandler.ts | yes | Supported | Deleted workflow-specific handler.
src/core/task/tools/handlers/SelectBrainstormingSessionToolHandler.ts | yes | Supported | Deleted workflow-specific handler.
src/core/task/tools/handlers/SelectRandomBrainstormingTechniqueToolHandler.ts | yes | Supported | Deleted workflow-specific handler.
src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts | yes | Supported | Deleted workflow-specific handler.
src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts | yes | Supported | Deleted placeholder-era workflow-value handler.
src/core/task/tools/handlers/SetWorkflowValuesToolHandler.ts | yes | Supported | Canonical workflow-value persistence handler.
src/core/task/tools/handlers/UseSkillToolHandler.ts | yes | Supported | Registry/runtime activation seam.
src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts | yes | Supported | Delegates approval result to runtime.
src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts | yes | Supported | Deleted legacy handler test surface.
src/core/task/tools/handlers/__tests__/buildReviewInputExtraction.test.ts | yes | Supported | Deleted legacy helper test surface.
src/core/task/tools/handlers/buildReviewInputExtraction.ts | yes | Supported | Deleted legacy helper.
src/core/task/tools/response/ResponseToolRegistry.ts | yes | Supported | Response-tool registry aligned to new workflow tools.
src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts | yes | Supported | Response-tool coverage alignment.
src/core/task/tools/subagent/SubagentRunner.ts | yes | Supported | Uses WorkflowRuntime/WorkflowRegistry and preserves isolation seam.
src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts | yes | Supported | Child-session workflow isolation coverage.
src/core/task/tools/types/TaskConfig.ts | yes | Supported | Carries shared workflowRuntime seam.
src/core/task/tools/utils/ToolConstants.ts | yes | Supported | Tool constant alignment.
src/core/task/workflow-activation.ts | yes | Supported | Deleted legacy activation file.
src/core/task/workflow-form/WorkflowFormRegistry.ts | yes | Partially Supported | In-range changes reworked legacy registry instead of moving live ownership out.
src/core/task/workflow-form/WorkflowFormRuntime.ts | yes | Partially Supported | Still owns per-panel payload construction.
src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts | yes | Supported | Deleted legacy form-trigger registry.
src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts | yes | Supported | Deleted legacy registry test suite.
src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts | yes | Supported | Generic form-engine coverage.
src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts | yes | Supported | Deleted legacy trigger-registry test suite.
src/core/task/workflow-form/__tests__/schema.test.ts | yes | Supported | Schema/tool-binding alignment.
src/core/task/workflow-form/buildWorkflowFormPayload.ts | yes | Supported | Shared payload-formatting helper.
src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts | yes | Supported | Tool-dictionary coverage alignment.
src/core/task/workflow-form/dictionaries/buildToolDictionary.ts | yes | Supported | Tool-dictionary alignment.
src/core/task/workflow-form/types.ts | yes | Supported | WorkflowForm terminology alignment.
src/core/task/workflow-form/workflowStartRequirements.ts | yes | Supported | Deleted legacy workflow-start requirements surface.
src/core/task/workflow-runtime/WorkflowRegistry.ts | yes | Supported | Product-owned workflow registry seam.
src/core/task/workflow-runtime/WorkflowRuntime.ts | yes | Partially Supported | Progression, prompt, and form-ownership drift inside otherwise aligned runtime.
src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts | yes | Partially Supported | Encodes drifted progression and value-write contracts.
src/core/task/workflow-runtime/discovery.ts | yes | Supported | Shared runtime-owned enumeration seam.
src/core/task/workflow-runtime/types.ts | yes | Partially Supported | Single-projection and fallback contract drift.
src/core/task/workflow-start-card/WorkflowStartCardRegistry.ts | yes | Supported | Deleted legacy start-card registry.
src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts | yes | Supported | Start-card payload contract alignment.
src/core/task/workflow-start-card/buildWorkflowStartCardPayload.ts | yes | Supported | Start-card payload alignment.
src/core/task/workflow-start-card/types.ts | yes | Supported | Start-card type alignment.
src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts | yes | Supported | Deleted legacy step-resolution registry.
src/core/task/workflow-step-resolution/WorkflowStepResolutionRuntime.ts | yes | Supported | Generic step-resolution session runtime.
src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts | yes | Supported | Deleted legacy step-resolution trigger registry.
src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRegistry.test.ts | yes | Supported | Deleted legacy registry test suite.
src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts | yes | Supported | Generic step-resolution runtime coverage.
src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionTriggerRegistry.test.ts | yes | Supported | Deleted legacy trigger test suite.
src/core/task/workflow-step-resolution/types.ts | yes | Supported | Terminology alignment in touched diff.
src/core/task/workflowCompletionHandler.ts | yes | Supported | Deleted legacy completion surface.
src/core/task/workflowCompletionRunner.ts | yes | Supported | Deleted legacy completion surface.
src/core/workflows/__tests__/placeholder-workflow-rendering.test.ts | yes | Supported | Deleted placeholder workflow test surface.
src/core/workflows/__tests__/placeholder-workflow-step-details.test.ts | yes | Supported | Deleted placeholder workflow test surface.
src/core/workflows/__tests__/workflow-placeholders.test.ts | yes | Supported | Deleted placeholder workflow test surface.
src/core/workflows/brainstormingSessionFiles.ts | yes | Supported | Deleted legacy brainstorming helper.
src/core/workflows/placeholder-workflow-rendering.ts | yes | Supported | Deleted placeholder workflow renderer.
src/core/workflows/placeholder-workflow-step-details.ts | yes | Supported | Deleted placeholder workflow prompt helper.
src/core/workflows/resolution/__tests__/resolveAvailableWorkflows.test.ts | yes | Supported | Deleted legacy workflow-resolution test surface.
src/core/workflows/resolution/loadResolvedWorkflowContent.ts | yes | Supported | Deleted legacy workflow-content loader.
src/core/workflows/resolution/resolveAvailableWorkflows.ts | yes | Supported | Deleted legacy workflow resolver.
src/core/workflows/workflow-placeholders.ts | yes | Supported | Deleted placeholder helper.
src/shared/ExtensionMessage.ts | yes | Supported | WorkflowForm/workflowFormId rename alignment.
src/shared/tools.ts | yes | Supported | Shared workflow tool-id surface cleanup.
src/shared/workflow-progress-request.ts | yes | Supported | Shared progression request alignment.
src/test/slash-commands.test.ts | yes | Supported | Slash-command workflow activation coverage.
webview-ui/src/components/chat/ChatRow.test.tsx | yes | Supported | UI contract rename alignment.
webview-ui/src/components/chat/ChatRow.tsx | yes | Supported | UI contract rename alignment.
webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx | yes | Supported | UI contract rename alignment.
webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts | yes | Supported | UI contract rename alignment.
webview-ui/src/components/chat/task-header/FocusChain.tsx | yes | Supported | Removes retired focus-chain file-open affordance.
```

## 4. Unsupported Change Inventory

- `WorkflowRuntime.handleDeterministicToolResult(...)` hardcodes `session.activeStepNumber += 1` on deterministic success.
- `WorkflowRuntime.handleDeterministicToolResult(...)` suppresses deterministic definition ids and re-evaluates on failure instead of invoking a workflow-defined retry procedure and final user-visible error path.
- `WorkflowRuntime.submitWorkflowProgressRequest(...)` hardcodes approval-driven step advancement and clears suppression arrays.
- `src/core/task/workflow-runtime/types.ts` adds `WorkflowDeterministicFallbackDecision = "fallback_to_agent" | "stay_on_step" | "advance_step"` without direct backing.
- `WorkflowPromptProjection` exposes only one system block and one input block.
- `WorkflowPromptBuilderInput` omits any full-turn versus continuation-turn selector.
- `WorkflowStepDefinition.buildPromptProjection(...)` is a single raw builder path rather than a runtime-owned variant-selection contract.
- `WorkflowRuntime.buildTurnProjection(...)` returns the exact step projection with no runtime-owned turn-variant selection.
- `integration.test.ts` blesses the same projected workflow blocks on continuation turns.
- `WorkflowRuntime.applyWorkflowValueWrites(...)` only permits keys enumerated by a step override; the shared fallback schema alone cannot persist workflow values.
- `WorkflowRuntime.resolveNextAction(...)` renders workflow forms by calling `workflowFormRuntime.buildPayload(...)`.
- `WorkflowFormRuntime.buildPayload(...)`, `buildFailurePayload(...)`, and `buildSuccessPayload(...)` still construct per-panel payloads inside `WorkflowFormRuntime`.
- `WorkflowFormRegistry.ts` was reworked in-range to keep live workflow-start and brainstorming builders and registry exports in the legacy registry layer.
- `TaskState` added `activeWorkflowSession` while retaining separate top-level workflow start-card, form, step-resolution, and suppression carriers.
- `TaskMetadata` added `activeWorkflowSession` while retaining separate top-level workflow start-card, form, step-resolution, and suppression carriers.
- `task/index.ts` persists and restores those mirror carriers separately from `activeWorkflowSession`.
- `foundational-build-implementation-order.md` explicitly prescribes the mirror-field topology, the single prompt projection contract, the hardcoded deterministic success/failure behavior, and separate metadata mirror writes.
- `foundational-build-change-map.md` carries the same mirror and persistence guidance.
- `WorkflowRuntime.test.ts` encodes the hardcoded progression and no-override `set_workflow_values` behavior as the expected contract.

## 5. Coverage Summary

- total touched files reviewed: `168`
- total touched commits reviewed: `5`
- count of `Supported` files: `156`
- count of `Partially Supported` files: `11`
- count of `Unsupported` files: `0`
- count of `Cannot Verify` files: `1`
- files I could not assess as downstream artifacts:
  - `docs/workflows/workflow-runtime/requirements.md`
- findings that come from tests/docs/generated files encoding unsupported implementation decisions:
  - `docs/workflows/workflow-runtime/foundational-build-implementation-order.md`
  - `docs/workflows/workflow-runtime/foundational-build-change-map.md`
  - `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
  - `src/core/prompts/system-prompt/__tests__/integration.test.ts`

Notes:
- Uncommitted working-tree lines outside the reviewed git range were excluded from findings.
