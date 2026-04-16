# Foundational Build Change Map

This document maps the code changes needed for the `Foundational Build` phase defined in [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md).

## Scope

- This map covers `Global` requirements that must be satisfied during foundational implementation plus all `Foundational Build` requirements.
- This map does not include workflow-module-specific prompt strings, workflow-form/start-card content, or cleanup-only deletions unless the foundational phase must touch that surface directly. It does include foundational typed contracts for workflow-module document-builder/template definitions and canonical workflow metadata where `Foundational Build` requirements explicitly require those contracts.
- Legacy workflow registries, workflow-specific document handlers, and module-owned content surfaces that are governed primarily by `Module Builds` or `Cleanup` are intentionally omitted unless foundational work must edit them in place.
- This foundational build must introduce no dedicated hardware interfaces and must remain compatible with the repo's existing extension-host, local-development, and extension-execution environment.
- Current line numbers are taken from the live repo as of `2026-04-14`; they will drift once implementation begins.
- This is a change map, not an action plan. It describes what must change per file, but it does not prescribe task ordering or exact code.

## Proposed New Files

### `src/core/task/workflow-runtime/WorkflowRuntime.ts`

- New file, whole file:
  - add the shared `WorkflowRuntime` class as the sole runtime owner of workflow orchestration
  - define the public methods required by caller rewiring in `task/index.ts`, `UseSkillToolHandler.ts`, `WorkflowProgressRequestToolHandler.ts`, and `SubagentRunner.ts`
  - expose `applyWorkflowValueWrites({ taskState, values })` as the canonical workflow-value mutation seam used by `SetWorkflowValuesToolHandler` and later runtime-owned deterministic/document handlers; centralize workflow-value write validation, any runtime-owned normalization, changed/unchanged key classification, and active-step write-permission enforcement in this method instead of re-implementing them in callers
  - own runtime session creation/mutation for `activeWorkflowName`, active step, workflow values, project-selection gate state, deterministic state, completion state, and persisted resume state
  - build the turn projection consumed by prompt assembly: system workflow block, input workflow block, and optional active-turn native-tool-schema override
  - coordinate workflow-form rendering/submission handling, deterministic-operation dispatch/result interpretation, progression approval handling, completion evaluation, teardown, persistence/resume, diagnostics, and parent/child session inheritance
  - consume workflow-module definitions plus the shared discovery/document-generation/specialist seams; do not read from legacy placeholder, managed-workflow, registry, or `.cline/workflow-config.yaml` surfaces

### `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

- create a foundational `WorkflowRuntime` test suite that covers successful main-context workflow activation, shared project-selection gating for `new` vs `existing`, canonical progression only on allowed steps, deterministic execution success plus runtime-owned fallback decisions, workflow-form next-action selection plus submission/result re-evaluation, completion-triggered teardown, persisted-session save plus successful resume reconstruction, safe-resume failure for invalid/stale/incomplete persisted session state, workflow-definition validation failures, active-step permission enforcement before progression or deterministic-state mutation, filesystem-safe project-title normalization behavior, and downstream teardown projection clearing of workflow-owned UI/session surfaces and stale persisted workflow session state

### `src/core/task/workflow-runtime/types.ts`

- New file, whole file:
  - add one root-contract export group for runtime-owned workflow state: `WorkflowName`, `WorkflowValues`, `WorkflowProjectSelectionState`, `ActiveWorkflowSession`, `PersistedWorkflowSession`, and the runtime-owned start-card/form/step-resolution session substate types nested under that session
  - add one next-action contract export group used by `WorkflowRuntime`: a single discriminated-union result covering start-card rendering, workflow-form rendering, deterministic execution, prompt/tool projection, completion/teardown handling, and no-op
  - add one workflow-definition/module contract export group: workflow definition, step definition, next-action rule/condition, prompt-builder input, prompt-projection result, `set_workflow_values` override-selection contract, completion rule, child-inheritance rule, and document-builder definition; make the prompt-projection result carry exactly three outputs only: system-instructions block, input block, and optional native-tool schema override
  - add one support-contract export group: discovery request plus normalized candidate result types with separate display text and canonical value; shipped-workflow metadata carrying workflow identity, persona mapping, and canonical project-subfolder mapping; workflow validation result; runtime error category; deterministic fallback decision; diagnostic event shape
  - make persistence and inheritance contracts explicit here: `PersistedWorkflowSession` carries only resume-required identity, step, values, and still-relevant UI/deterministic state; child-inheritance contracts represent copy-only parent-to-child initialization plus same-key mapping when declared by the workflow definition
  - reuse existing shared/specialist contracts instead of redefining them: `WorkflowForm`-family types from `src/shared/ExtensionMessage.ts` after the foundational rename, step-resolution contracts from `src/core/task/workflow-step-resolution/types.ts`, backend workflow-tool schema contracts from `src/core/task/tools/backendWorkflowToolContractTypes.ts`, and `SkillMetadata` from `src/shared/skills.ts`

### `src/core/task/workflow-runtime/discovery.ts`

- New file, whole file:
  - add one shared runtime-owned filesystem-enumeration export that consumes the typed discovery request contract from `src/core/task/workflow-runtime/types.ts`; the request must carry target-directory resolution inputs, requested entry-type filtering, immediate-child filtering, optional naming-convention matching, candidate-label projection, and deterministic sort behavior
  - resolve the target directory from that request inside this file, then perform enumeration only with `fs.readdir(resolvedTargetDirectory, { withFileTypes: true })`; filter the returned `Dirent`s, apply any naming-convention matcher, and project survivors into the normalized discovery candidate contract
  - keep this file generic: do not read workflow session state, placeholder values, or workflow-specific config, and do not hardcode brainstorming/project/artifact folder names or filename patterns here; workflow-specific discovery rules must arrive through the typed request contract
  - return normalized discovery candidates with separate canonical value and display text so the same result can support project-selection start-card flows, workflow-form artifact-selection flows, and runtime-owned next-action or deterministic evaluation
  - treat `ENOENT` as an empty candidate set and rethrow all other filesystem failures; caller-file edits elsewhere must route convention-driven project/artifact enumeration through this file instead of preserving bespoke helpers such as brainstorming-session discovery

### `src/core/task/workflow-runtime/WorkflowRegistry.ts`

- New file, whole file:
  - directly import the shipped workflow definition modules in this file as those definition modules are introduced by downstream Module Build action plans, plus `type WorkflowDefinition` and `type WorkflowName` from `src/core/task/workflow-runtime/types.ts` and `type SkillMetadata` from `src/shared/skills.ts`; do not introduce or depend on a separate workflow registration barrel/index file as part of this change
  - declare one module-scope shipped-definition collection and three private lookup maps keyed by `definition.name`, `definition.slashCommandName`, and `definition.useSkillName`; downstream Module Build action plans extend that collection by adding the newly approved workflow definition imports for each shipped workflow, and those imported definitions remain the sole source of truth for shipped workflow identity and the Section 2.7 workflow-to-persona-to-project-subfolder mapping already encoded in those definitions
  - export exactly these five functions and no additional exported constants or helper types: `resolveWorkflowDefinition(workflowName)`, `resolveWorkflowBySlashCommand(commandName)`, `resolveWorkflowByUseSkillName(skillName)`, `getShippedWorkflowSlashCommands()`, and `getWorkflowSkillMetadata()`
  - implement `resolveWorkflowDefinition(...)`, `resolveWorkflowBySlashCommand(...)`, and `resolveWorkflowByUseSkillName(...)` as pure lookups over the shipped-definition collection so `WorkflowRuntime`, slash-command activation, and `useSkill` activation all resolve through the same product-owned registry seam
  - implement `getShippedWorkflowSlashCommands()` as a pure projection of the shipped-definition collection that returns one entry per shipped workflow in the shape `{ name: definition.slashCommandName, description: \`Shipped workflow: ${definition.name}\` }` for `getAvailableSlashCommands.ts`
  - implement `getWorkflowSkillMetadata()` as a pure projection of the shipped-definition collection that returns one `SkillMetadata` per shipped workflow in the shape `{ name: definition.useSkillName, description: \`Shipped workflow: ${definition.name}\`, path: \`shipped-workflow://${definition.name}\`, source: "global" }` for main-agent and subagent prompt skill exposure
  - keep this file limited to shipped-workflow definition lookup and metadata projection only; do not read toggle state, workspace state, remote config, managed-workflow registries, BMAD assets, or any legacy workflow-resolution helper such as `resolveAvailableWorkflows(...)`, `resolveWorkflowByName(...)`, or `createWorkflowSkillMetadata(...)`

### `src/core/task/tools/handlers/SetWorkflowValuesToolHandler.ts`

- New file, whole file:
  - implement `SetWorkflowValuesToolHandler` as `IToolHandler, IPartialBlockHandler` with `readonly name = ClineDefaultTool.SET_WORKFLOW_VALUES`
  - treat `block.params.values` as the only canonical input contract: require a non-empty plain object map and reject string, array, null, or empty-object input before any runtime call; do not preserve legacy JSON-string compatibility as part of the new tool contract
  - preserve the lightweight key-list tool preview pattern for partial and full execution, but rewrite it to workflow-value wording only
  - delegate all canonical writes through `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values })` and use only the runtime result to decide success versus no-op responses; do not mutate workflow task-state fields directly in this handler
  - keep handler-side state changes minimal: increment `consecutiveMistakeCount` only on invalid input or runtime error, reset it on successful runtime execution, and do not persist task metadata or workflow session state from this file
  - remove all placeholder-era and managed-workflow-era ownership from this handler: no `activePlaceholderWorkflowValues`, no `managedWorkflowRun`, no `getTaskMetadata` / `saveTaskMetadata`, no `applyManagedWorkflowDynamicPlaceholders`, no deterministic-placeholder guidance, and no `.cline/workflow-config.yaml` reads
  - keep artifact-path normalization and changed/unchanged key classification on the runtime mutation seam; this handler only validates input, emits preview text, calls the runtime, and returns generic success/no-op/error text

### `src/core/prompts/system-prompt/tools/set_workflow_values.ts`

- New file, whole file:
  - import `ModelFamily`, `ClineDefaultTool`, and `type ClineToolSpec`; define one fallback `generic` variant with `id = ClineDefaultTool.SET_WORKFLOW_VALUES`, `variant = ModelFamily.GENERIC`, and `name = "set_workflow_values"`
  - export `set_workflow_values_variants = [generic]` and keep this file limited to the shared fallback schema only; do not implement workflow-specific key lists or per-step restrictions here because those belong to workflow-module override projections
  - define the tool description in workflow-value terms only: wrapper shape `{"values": {...}}`, writes apply to the active workflow session, and no references to placeholders, managed workflows, or `.cline/workflow-config.yaml`
  - define exactly one required parameter named `values` with `type: "object"` and `additionalProperties: { type: "string" }`; do not enumerate fallback keys in this file, and leave workflow-specific key restrictions to runtime validation and workflow-module overrides
  - do not add legacy `contextRequirements` based on `managedWorkflowActive`, `activeWorkflowSupportsPlaceholders`, or `activePlaceholderWorkflowName`; live exposure is handled by the runtime-owned workflow projection and downstream prompt-tool wiring edits already mapped elsewhere

### `src/core/prompts/system-prompt/tools/build_workflow_document.ts`

- New file, whole file:
  - import `ModelFamily`, `ClineDefaultTool`, and `type ClineToolSpec`; define one fallback `generic` variant with `id = ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`, `variant = ModelFamily.GENERIC`, and `name = "build_workflow_document"`
  - export `build_workflow_document_variants = [generic]` and keep this file limited to the shared fallback schema only; do not implement workflow-specific artifact-family branching or workflow-specific destination logic here because those belong to `WorkflowRuntime` plus workflow-module document-builder definitions
  - define the tool description only in normalized request terms: `artifact_id`, `destination_path`, `content`, and optional `workflow_value_writes`; do not reference review diffs, placeholders, managed workflows, BMAD assets, or `.cline/workflow-config.yaml`
  - define exactly these parameters in the fallback schema: required string `artifact_id`, required string `destination_path`, required string `content`, and optional object `workflow_value_writes` with `additionalProperties: { type: "string" }`
  - do not add legacy `contextRequirements` or workflow-name-specific exposure logic here; live exposure is handled by the runtime-owned workflow projection and downstream prompt-tool wiring edits already mapped elsewhere

### `src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`

- New file, whole file:
  - implement `BuildWorkflowDocumentToolHandler` as `IToolHandler, IPartialBlockHandler`; bind `readonly name` to the new shared document-generation tool id added in `src/shared/tools.ts`
  - consume only the shared backend document-generation request contract added in `src/core/task/tools/backendWorkflowToolContracts.ts`; require `artifact_id`, `destination_path`, and `content`, plus optional `workflow_value_writes`, where `artifact_id` is the code-owned artifact/document-builder selection handle and `destination_path` is already resolved upstream by `WorkflowRuntime`
  - keep all workflow resolution out of this file: do not inspect placeholder state, managed-workflow state, workflow markdown, BMAD template files, or `.cline/workflow-config.yaml`, and do not resolve project subfolder, artifact naming, numbering, or builder selection here
  - reuse one shared approval/write path: emit a generic partial/full preview for the target artifact, run the existing approval and pre-tool-hook flow, atomically create or replace the markdown file at the resolved path, invalidate the file-read cache, set `didEditFile`, and return one generic persisted/no-op/error result payload
  - when the normalized request includes workflow-value writebacks, route them through `config.workflowRuntime.applyWorkflowValueWrites(...)`; do not record placeholder write proofs or mutate legacy workflow/task-state carriers in this handler
  - support all workflow-owned markdown artifact families through the normalized request contract rather than per-family handler branches

## Existing Files To Touch

## Core Runtime Bootstrap

### `src/core/task/TaskState.ts`

- Lines `4`-`10`, `35`-`63`, and `152`-`170`: perform one foundational workflow-state rewrite in this file.
  - in the import block, remove placeholder-era and managed-workflow-only imports that become dead with the field rewrite, and add the runtime-owned workflow imports from `src/core/task/workflow-runtime/types.ts` needed for `activeWorkflowName` and the canonical workflow session carrier
  - delete the local placeholder-only type declarations that exist only to support removed task-state fields; do not leave placeholder-era deterministic or auto-complete notice types in this file after the field rewrite
  - replace only the workflow carrier fields in lines `152`-`159` and `163`-`170`; leave `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey` unchanged because create-story module build owns any migration of those fields
  - add the canonical fields `activeWorkflowName?: WorkflowName` and `activeWorkflowSession?: ActiveWorkflowSession`
  - delete `activeWorkflowId`, `activePlaceholderWorkflowId`, `activePlaceholderWorkflowSource`, `activePlaceholderWorkflowStableValues`, `activePlaceholderWorkflowValues`, `activePlaceholderWorkflowDeterministicState`, `activePlaceholderWorkflowTaskWriteProofPaths`, `lastPromptedPlaceholderWorkflowChecklistLabel`, `pendingAutoCompletedPlaceholderWorkflowStepNotices`, `activeWorkflowJustStarted`, and `managedWorkflowRun`
  - keep `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, `activeWorkflowStepResolutionSession`, `suppressedWorkflowStepResolutionDefinitionIds`, and `suppressedWorkflowFormResolverIds` as the surviving workflow UI/specialist-session carriers, aligned to the runtime-owned workflow semantics introduced by the corresponding specialist-type edits elsewhere in this change map

### `src/core/context/context-tracking/ContextTrackerTypes.ts`

- Lines `1`-`60`: align the `TaskMetadata` workflow persistence mirror with the foundational runtime-owned workflow persistence model.
  - remove imports used only by deleted placeholder-era and managed-workflow metadata fields, including `ManagedWorkflowRunState`, `ActivePlaceholderWorkflowDeterministicState`, `AutoCompletedPlaceholderWorkflowStepNotice`, and `ActivePlaceholderWorkflowSource`
  - add the runtime-owned workflow persistence imports from `src/core/task/workflow-runtime/types.ts` needed for canonical workflow identity and the minimum persisted workflow session contract required for safe resume
  - delete the legacy metadata mirror fields `activeWorkflowId`, `activePlaceholderWorkflowId`, `activePlaceholderWorkflowSource`, `activePlaceholderWorkflowStableValues`, `activePlaceholderWorkflowValues`, `activePlaceholderWorkflowDeterministicState`, `activePlaceholderWorkflowTaskWriteProofPaths`, `lastPromptedPlaceholderWorkflowChecklistLabel`, `pendingAutoCompletedPlaceholderWorkflowStepNotices`, and `managedWorkflowRun`
  - leave `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey` unchanged because create-story module build owns any migration of those metadata fields
  - keep `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, and `activeWorkflowStepResolutionSession` as the surviving workflow UI-session metadata mirrors, aligned to the runtime-owned workflow semantics introduced elsewhere in this change map

### `src/core/task/index.ts`

- Lines `42`-`70`, `213`-`320`, and `770`-`876`: replace legacy workflow imports, exported helper seams, and retained runtime fields with the foundational `WorkflowRuntime` and `WorkflowRegistry` seams. Remove `WorkflowFormRuntime`, `WorkflowStepResolutionRuntime`, `getWorkflowFormResolverDefinition(...)` from `@core/task/workflow-form/WorkflowFormRegistry`, `resolveWorkflowFormSlashCommandStartCandidate(...)` and `resolveWorkflowFormWorkflowStepCandidate(...)` from `@core/task/workflow-form/WorkflowFormTriggerRegistry`, workflow-completion imports, and legacy workflow-resolution imports; add `WorkflowRuntime` and `getWorkflowSkillMetadata()`. Update `shouldIncludePersistentPromptContext(...)` to key off canonical runtime workflow activity, and delete the exported placeholder-era interception helpers that keep registry-driven workflow orchestration alive outside `WorkflowRuntime`.
- Lines `1388`-`2271`, `2488`-`2510`, `2639`-`2675`, and `2732`-`2817`: collapse the live workflow control path to thin `WorkflowRuntime` delegation. Route start-card submission, workflow-form submission, next-action evaluation, deterministic-operation execution/fallback, completion/teardown, workflow metadata persistence/restore, and workflow-owned checklist projection through `WorkflowRuntime`. In the workflow-form deterministic-operation path around lines `1842`-`1858`, stop calling `getWorkflowFormResolverDefinition(...)` for fallback error text and deterministic operation requests; ask `WorkflowRuntime` for those outcomes instead. In the workflow-start / workflow-step form interception paths around lines `249`-`252` and `1981`-`1985`, stop calling `resolveWorkflowFormWorkflowStepCandidate(...)` and `resolveWorkflowFormSlashCommandStartCandidate(...)`; ask `WorkflowRuntime` for canonical next-action and start-form decisions instead. In the workflow-start-card session creation block around lines `1948`-`1963`, remove `getWorkflowStartCardRegistryEntry(...)` and stop constructing `activeWorkflowStartCardSession` from `workflowName` plus `markdownBody` alone; build the full session from runtime-owned canonical workflow identity, start-card definition data, and discovery output instead. `task/index.ts` may still render workflow start-card/form/status payloads and relay user responses, but it must stop interpreting workflow-specific state transitions or persisting legacy workflow carriers directly.
- Lines `2593`-`2607` and `3867`-`3927`: remove fragmented workflow prompt assembly and legacy workflow skill discovery. Delete `buildWorkflowPromptInstructions(...)`, remove `resolveAvailableWorkflows(...)` and `createWorkflowSkillMetadata(...)`, use `getWorkflowSkillMetadata()`, and consume only runtime-projected workflow system block, workflow input block, active workflow identity, persona projection, and native-tool-schema override. Stop sourcing prompt context from `activePlaceholderWorkflowSource?.name`, `managedWorkflowRun`, placeholder reminder lookups, or `.md`-suffixed workflow-name assumptions.
- Lines `5425`-`5439`: update the `parseSlashCommands(...)` call to match the foundational slash-command contract. Remove `localWorkflowToggles`, `globalWorkflowToggles`, and `cwd` from this caller once `src/core/slash-commands/index.ts` no longer accepts those legacy workflow-resolution inputs for shipped-workflow slash-command activation.

### `src/core/task/workflow-activation.ts`

- Lines `1`-`173`: delete this file during Foundational Build after caller rewiring in `task/index.ts`, `UseSkillToolHandler.ts`, and `SubagentRunner.ts` is complete. Delete the exported contracts `ManagedWorkflowActivationResult` and `PlaceholderWorkflowActivationResult`, plus `activateManagedWorkflowInTaskState(...)`, `activatePlaceholderWorkflowInTaskState(...)`, `renderActivePlaceholderWorkflowReminder(...)`, and `buildActivePlaceholderWorkflowActivationInstructions(...)`. Do not preserve any managed-workflow activation logic, placeholder-workflow activation logic, placeholder reminder rendering, workflow-config reads, or placeholder rendering helpers here as dead code or reference material; replacement activation behavior belongs in `WorkflowRuntime.activateWorkflow(...)` and replacement prompt projection belongs in `WorkflowRuntime.buildTurnProjection(...)`.

### `src/core/workflows/resolution/resolveAvailableWorkflows.ts`

- Lines `1`-`169`: delete this file during Foundational Build after caller rewiring is complete. Delete the exported contracts `ResolvedWorkflowSource`, `ResolvedWorkflowEntry`, and `WorkflowResolutionOptions`, plus `resolveAvailableWorkflows(...)`, `resolveWorkflowByName(...)`, `findResolvedWorkflowByName(...)`, and `createWorkflowSkillMetadata(...)`. Do not preserve this file as dead code or reference material. Caller rewiring in `task/index.ts`, `UseSkillToolHandler.ts`, `SubagentRunner.ts`, `slash-commands/index.ts`, `getAvailableSlashCommands.ts`, and any remaining `ResolvedWorkflowEntry` consumers must eliminate this file from the compiled runtime.

### `src/core/workflows/resolution/loadResolvedWorkflowContent.ts`

- Lines `1`-`35`: delete this file during Foundational Build after caller rewiring in `workflow-activation.ts` and `slash-commands/index.ts` is complete. Delete the exported contract `LoadedResolvedWorkflowContent` and `loadResolvedWorkflowContent(...)`. Do not preserve any managed/local/global/remote workflow-content loading path here as dead code or reference material; replacement activation and prompt content must come from product-owned workflow definitions resolved by `WorkflowRegistry` and consumed through `WorkflowRuntime`.

### `src/core/workflows/placeholder-workflow-rendering.ts`

- Lines `1`-`20`: delete this file during Foundational Build after the caller-file changes mapped elsewhere eliminate it from the compiled runtime. Delete the exported alias `PlaceholderWorkflowValueMap` plus `getPlaceholderWorkflowValueMap(...)` and `resolvePlaceholderWorkflowText(...)`. Do not preserve this thin placeholder-era merge/text-resolution wrapper as dead code, a compatibility shim, or a shared runtime helper.

### `src/core/workflows/placeholder-workflow-step-details.ts`

- Lines `1`-`370`: delete this file after foundational caller rewiring eliminates it from the compiled runtime. Delete the exported contracts `ActivePlaceholderWorkflowSource`, `ActivePlaceholderWorkflowStepDetails`, and `ActivePlaceholderWorkflowPromptContext`, plus `buildActivePlaceholderWorkflowSource(...)`, `isSameActivePlaceholderWorkflowSource(...)`, `getActivePlaceholderWorkflowStepDetails(...)`, `getActivePlaceholderWorkflowChecklistLabel(...)`, `resolveActivePlaceholderWorkflowPromptContext(...)`, `buildPlaceholderWorkflowChecklist(...)`, and `getRenderedActivePlaceholderWorkflowSourceContents(...)`. Do not preserve placeholder-workflow source parsing, placeholder-rendered step extraction, reminder/prompt-context derivation, or placeholder checklist construction here as dead code or reference material. Caller rewiring in `TaskState.ts`, `task/index.ts`, `workflow-activation.ts`, `focus-chain/index.ts`, `SubagentRunner.ts`, `UseSkillToolHandler.ts`, `ContextTrackerTypes.ts`, `WorkflowFormTriggerRegistry.ts`, and the remaining legacy workflow-specific handlers must replace these helpers with runtime-owned workflow session state plus workflow-module prompt, active-step, and checklist projection through `WorkflowRuntime`.

### `src/core/workflows/workflow-placeholders.ts`

- Lines `1`-`163`: delete this file during Foundational Build. Delete `WorkflowPlaceholderMap`, `CANONICAL_WORKFLOW_CONFIG_RELATIVE_PATH`, `toWorkflowPlaceholderString(...)`, `resolveWorkflowPlaceholderText(...)`, `mergeWorkflowPlaceholderMaps(...)`, `findUnresolvedWorkflowPlaceholders(...)`, `extractWorkflowPlaceholderKeys(...)`, `getCanonicalWorkflowConfigPath(...)`, and `buildWorkflowStablePlaceholders(...)`. Do not preserve YAML config loading, placeholder-token resolution, placeholder-map merging, unresolved-placeholder scanning, key extraction, or stable-placeholder assembly here as dead code or reference material.

### `src/core/task/workflowCompletionRunner.ts`

- Lines `1`-`69`: delete this file during Foundational Build after caller rewiring in `task/index.ts` removes the import/use of `workflowCompletionRunner(...)`. Delete the exported contracts `WorkflowCompletionRunnerArgs`, `WorkflowCompletionRunnerCompletedResult`, and `WorkflowCompletionRunnerResult`, the local helpers `checklistHasIncompleteStep(...)` and `checklistIsFullyComplete(...)`, and the export `workflowCompletionRunner(...)`. Do not preserve placeholder-workflow-id checks, focus-chain checklist transition heuristics, or notice-count-based completion detection here as dead code or a compatibility helper; replacement completion evaluation, completion result shaping, follow-up handling, and teardown decisioning must be owned by `WorkflowRuntime`.

### `src/core/task/workflowCompletionHandler.ts`

- Lines `1`-`32`: delete this standalone completion-follow-up seam during Foundational Build. Remove the completed-workflow-id keyed registry and move workflow-specific completion follow-up actions into workflow-module completion rules orchestrated by `WorkflowRuntime`.

### `src/core/task/tools/handlers/UseSkillToolHandler.ts`

- Lines `1`-`223`: rewrite the workflow-facing portion of this file in one pass so `use_skill` reaches the foundational end state.
  - remove imports of `getTaskMetadata`, `saveTaskMetadata`, `activateManagedWorkflowInTaskState`, `activatePlaceholderWorkflowInTaskState`, `buildPlaceholderWorkflowChecklist`, and `resolveWorkflowByName(...)`
  - replace the local/global/remote/managed workflow resolution block in lines `41`-`56` with shipped-workflow lookup through `resolveWorkflowByUseSkillName(...)` from `@/core/task/workflow-runtime/WorkflowRegistry`
  - delete the managed-workflow activation branch in lines `58`-`90`
  - replace the placeholder-workflow activation branch in lines `102`-`169` with one `WorkflowRuntime` activation path; do not persist workflow metadata here, do not rebuild checklist text locally, and do not mutate workflow task-state carriers directly in this handler
  - remove the direct workflow-state reset in lines `215`-`223`; loading a non-workflow skill must not piggyback on workflow state mutation
  - leave the file with only two behaviors: shipped workflow activation delegated to `WorkflowRuntime`, and generic skill loading that leaves workflow state untouched

### `src/core/task/tools/subagent/SubagentRunner.ts`

- Lines `9`-`35`, `469`-`575`, `799`-`833`, `868`-`872`, and `914`-`1173`: rewrite the workflow-facing portion of this file in one pass so `SubagentRunner` reaches the foundational child-execution end state.
  - remove legacy imports/usages of BMAD reminder/persona lookup, `workflow-activation`, `resolveAvailableWorkflows(...)`, `findResolvedWorkflowByName(...)`, placeholder rendering/helpers, and deterministic-placeholder progression types/helpers
  - replace workflow skill exposure with `getWorkflowSkillMetadata()` and assigned-workflow resolution with `resolveWorkflowByUseSkillName(...)` from `@/core/task/workflow-runtime/WorkflowRegistry`
  - pass the shared `workflowRuntime` into the child `TaskConfig`, keep the child `TaskState` isolated from the parent task state, and do not allow parent/child workflow-session objects to be shared by reference
  - replace prompt-context assembly, continuation-turn workflow gating, and workflow-start bookkeeping with runtime-projected workflow system/input/tool projection; remove direct `activeWorkflowJustStarted` mutation and placeholder-/managed-workflow prompt-context fields from this file
  - replace auto-activation, placeholder-derived parent/child inheritance, and deterministic-placeholder bootstrap with `WorkflowRuntime` child activation plus definition-declared, copy-only parent-session initialization
  - delete the placeholder-specific helper methods in this file, including inherited-placeholder transfer, deterministic placeholder bootstrap, placeholder checklist seeding, current-step prompt consumption, and placeholder checklist-label reset logic

### `src/core/task/bmad-agent-mode.ts`

- Lines `1`-`29`: delete this file during Foundational Build after caller rewiring in `task/index.ts` and `SubagentRunner.ts` removes imports/usages of `getBmadWorkflowReminder(...)`. Delete `WorkflowReminderEntry`, `WorkflowReminderConfig`, `WORKFLOW_REMINDERS_PATH`, and `getBmadWorkflowReminder(...)`. Do not preserve `_bmad/_config/workflow-reminders.json` loading or BMAD reminder rendering as dead code or compatibility helpers.

### `src/core/slash-commands/index.ts`

- Lines `1`-`50` and `149`-`276`: rewrite the workflow-facing portion of this file in one pass so slash-command workflow activation reaches the foundational end state.
  - remove imports/usages of `GlobalInstructionsFile`, `StateManager`, `ActivePlaceholderWorkflowSource`, `buildActivePlaceholderWorkflowSource(...)`, `loadResolvedWorkflowContent(...)`, and `resolveWorkflowByName(...)`
  - replace the legacy `PersistentSlashCommandAction` union with exactly `{ type: "activate_workflow"; workflowName: WorkflowName; invocationSource: "slash_command" }`
  - replace remote/local/global/managed/placeholder workflow resolution and branching with one `resolveWorkflowBySlashCommand(commandName)` lookup from `@/core/task/workflow-runtime/WorkflowRegistry`
  - emit only the canonical persistent slash-command activation action keyed by the unsuffixed shipped `workflowName`
  - delete `localWorkflowToggles` and `globalWorkflowToggles` from `parseSlashCommands(...)` because shipped-workflow slash-command activation no longer depends on local/global workflow toggle state
  - delete `cwd` from `parseSlashCommands(...)` because its only live usages are in the removed legacy workflow-resolution path

### `src/core/controller/slash/getAvailableSlashCommands.ts`

- Lines `1`-`50`: rewrite the workflow-discovery portion of this file in one pass.
  - remove the import of `resolveAvailableWorkflows(...)`
  - add `getShippedWorkflowSlashCommands()` from `@/core/task/workflow-runtime/WorkflowRegistry`
  - delete `workspaceManager`, `cwd`, local/global/remote workflow toggle reads, remote config reads, and the `workflows` local because shipped workflow slash-command exposure no longer depends on workspace state or legacy workflow sources
  - replace the legacy workflow loop with a loop over `getShippedWorkflowSlashCommands()` and project each returned entry into `SlashCommandInfo.create({ name, description, section: "custom", cliCompatible: true })`
  - leave built-in slash-command assembly untouched

## Tool Runtime And Contracts

### `src/shared/tools.ts`

- Lines `8`-`98`: revise this file in one pass so the shared workflow tool-id surface reaches the foundational end state.
  - in `ClineDefaultTool`, add `SET_WORKFLOW_VALUES = "set_workflow_values"`
  - in `ClineDefaultTool`, add `BUILD_WORKFLOW_DOCUMENT = "build_workflow_document"`
  - delete `SET_WORKFLOW_PLACEHOLDERS`
  - delete the workflow-specific document-generation ids being replaced in this phase: `BUILD_REVIEW_DIFF_OUTPUT`, `BUILD_EPICS_DOCUMENT`, `BUILD_EPIC_DELIVERY_SPEC`, `BUILD_STORY_DOCUMENT`, and `BUILD_TECH_SPEC_DOCUMENT`
  - do not delete deferred non-foundational tool ids here, including `BUILD_REVIEW_INPUT` and `CONTINUE_BRAINSTORMING_SESSION`, because other rows defer those removals to later module-build or cleanup phases
  - leave `toolUseNames` in place so it continues to derive automatically from the enum after the enum rewrite
  - leave `READ_ONLY_TOOLS` unchanged, because neither `SET_WORKFLOW_VALUES` nor `BUILD_WORKFLOW_DOCUMENT` is read-only, and none of the removed workflow tool ids are listed in that block today

### `src/core/task/tools/backendWorkflowToolContracts.ts`

- Lines `4`-`160`: rewrite `backendWorkflowToolContracts` in one pass so the foundational canonical workflow-tool contract map matches the new shared tool surface.
  - replace `[ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS]: undefined` with `[ClineDefaultTool.SET_WORKFLOW_VALUES]: { id: ClineDefaultTool.SET_WORKFLOW_VALUES, name: "set_workflow_values", parameters: [{ name: "values", required: true, type: "object", description: "Workflow-value key/value map for the active workflow session.", additionalProperties: { type: "string" } }] }`
  - add `[ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT]: { id: ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT, name: "build_workflow_document", parameters: [{ name: "artifact_id", required: true, type: "string", description: "Canonical workflow artifact id selected upstream from the active workflow module's document-builder/artifact definition." }, { name: "destination_path", required: true, type: "string", description: "Resolved absolute destination path prepared upstream by WorkflowRuntime." }, { name: "content", required: true, type: "string", description: "Fully resolved markdown content to atomically write to the destination path." }, { name: "workflow_value_writes", required: false, type: "object", description: "Optional workflow-value writeback map to persist after a successful document write.", additionalProperties: { type: "string" } }] }`
  - set the replaced workflow-specific document tool entries `BUILD_REVIEW_DIFF_OUTPUT`, `BUILD_EPICS_DOCUMENT`, `BUILD_EPIC_DELIVERY_SPEC`, `BUILD_STORY_DOCUMENT`, and `BUILD_TECH_SPEC_DOCUMENT` to `undefined`
  - set `CONTINUE_BRAINSTORMING_SESSION` to `undefined` so it no longer participates in the foundational canonical workflow-tool surface
  - leave deferred module-build tools like `BUILD_REVIEW_INPUT`, `CREATE_BRAINSTORMING_SESSION`, `SELECT_BRAINSTORMING_SESSION`, `PERSIST_BRAINSTORMING_APPROACH`, `SELECT_RANDOM_BRAINSTORMING_TECHNIQUE`, `PERSIST_BRAINSTORMING_TECHNIQUE`, `REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION`, `CAPTURE_BRAINSTORMING_TOPIC`, and `SELECT_TARGET_EPIC` in place until their own rows retire or replace them
  - leave `getBackendWorkflowToolContract(...)` and `isBackendWorkflowToolContractTool(...)` in place, but aligned to the rewritten map

### `src/core/task/tools/response/ResponseToolRegistry.ts`

- Lines `5`-`121`: rewrite `RESPONSE_TOOL_METADATA` in one pass so it matches the foundational workflow tool surface.
  - remove deleted enum keys `SET_WORKFLOW_PLACEHOLDERS`, `BUILD_REVIEW_DIFF_OUTPUT`, `BUILD_EPICS_DOCUMENT`, `BUILD_EPIC_DELIVERY_SPEC`, `BUILD_STORY_DOCUMENT`, and `BUILD_TECH_SPEC_DOCUMENT`
  - add `[ClineDefaultTool.SET_WORKFLOW_VALUES]: undefined`
  - add `[ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT]: undefined`
  - keep deferred surviving workflow/module tool ids present with `undefined` entries
  - leave the true governed response-tool metadata entries unchanged: `ATTEMPT`, `ASK`, `SEND_USER_MESSAGE`, `WORKFLOW_PROGRESS_REQUEST`, `PLAN_MODE`, and `ACT_MODE`
  - leave `get(...)` and `isResponseTool(...)` unchanged, aligned to the rewritten map

### `src/core/task/tools/ToolExecutorCoordinator.ts`

- Lines `11`-`16`, `21`, `41`, and `104`-`161`: rewrite the workflow-related import block and `toolHandlersMap` in one pass so the coordinator reaches the foundational handler-registry end state.
  - delete imports of `SetWorkflowPlaceholdersToolHandler`, `BuildReviewDiffOutputToolHandler`, `BuildEpicsDocumentToolHandler`, `BuildEpicDeliverySpecToolHandler`, `BuildStoryDocumentToolHandler`, `BuildTechSpecDocumentToolHandler`, and `ContinueBrainstormingSessionToolHandler`
  - add imports of `SetWorkflowValuesToolHandler` and `BuildWorkflowDocumentToolHandler`
  - replace `[ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS]` with `[ClineDefaultTool.SET_WORKFLOW_VALUES]: (_v) => new SetWorkflowValuesToolHandler()`
  - add `[ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT]: (_v) => new BuildWorkflowDocumentToolHandler()`
  - delete the map entries for `BUILD_REVIEW_DIFF_OUTPUT`, `BUILD_EPICS_DOCUMENT`, `BUILD_EPIC_DELIVERY_SPEC`, `BUILD_STORY_DOCUMENT`, and `BUILD_TECH_SPEC_DOCUMENT`
  - change `[ClineDefaultTool.CONTINUE_BRAINSTORMING_SESSION]` from a live handler registration to `(_v) => undefined`
  - leave `BUILD_REVIEW_INPUT` and the other deferred workflow/module handler registrations unchanged in this file during Foundational Build

### `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts`

- Lines `1`-`271`: delete this file during Foundational Build after caller rewiring is complete. Delete `ARTIFACT_PLACEHOLDER_KEYS`, `parseWorkflowPlaceholderValues(...)`, `getWorkflowPlaceholderValues(...)`, `normalizeArtifactPlaceholderPath(...)`, `normalizeArtifactWorkflowPlaceholders(...)`, `getNextStepGuidance(...)`, `WorkflowPlaceholderPersistenceResult`, `applyGenericWorkflowPlaceholders(...)`, `persistWorkflowPlaceholderValues(...)`, and `SetWorkflowPlaceholdersToolHandler`.
- Do not preserve JSON-string placeholder parsing, artifact-path normalization, managed-workflow placeholder mutation, deterministic-placeholder guidance, task-metadata persistence, or placeholder-era UI messaging here as dead code or compatibility helpers; replacement behavior belongs in `SetWorkflowValuesToolHandler` plus `WorkflowRuntime.applyWorkflowValueWrites(...)`.

### `src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts`

- Lines `1`-`393`: delete this file during Foundational Build after compile-time caller rewiring is complete. Delete all imports, local helper functions, and the export `BuildEpicsDocumentToolHandler`; do not preserve YAML frontmatter parsing, template-section replacement, placeholder/workflow-config resolution, output-file placeholder persistence, metadata persistence, or placeholder write-proof recording here as dead code or compatibility helpers. Replacement behavior belongs in `BuildWorkflowDocumentToolHandler` plus runtime-owned document input/path resolution and workflow-value writes through `WorkflowRuntime`.

### `src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts`

- Lines `1`-`286`: delete this file during Foundational Build after compile-time caller rewiring is complete. Delete all imports, the local helper functions `atomicReplaceTextFile(...)`, `replaceTemplateSection(...)`, `escapeRegExp(...)`, `resolveActiveCreateStoryStepTwo(...)`, `extractSelectedStoryBlock(...)`, and `extractRequiredStorySection(...)`, the local error constant `POPULATE_STORY_DOCUMENT_ERROR`, and the export `BuildStoryDocumentToolHandler`. Do not preserve placeholder-workflow step gating, placeholder/stable-placeholder resolution, epic-delivery-spec section extraction, template-section replacement, placeholder write-proof persistence, or `persistWorkflowPlaceholderValues(...)` here as dead code or compatibility helpers; replacement behavior belongs in `BuildWorkflowDocumentToolHandler` plus runtime-owned document input/path resolution and workflow-value writes through `WorkflowRuntime`.

### `src/core/task/tools/handlers/BuildReviewDiffOutputToolHandler.ts`

- Lines `1`-`437`: delete this workflow-specific document-generation handler during Foundational Build after registrations and callers are rewired to the shared `BuildWorkflowDocumentToolHandler`. Remove placeholder rendering/lookups, workflow-config-driven placeholder assembly, and placeholder write-proof coupling from this legacy handler rather than preserving them in reduced form.

### `src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts`

- Lines `1`-`285`: delete this workflow-specific document-generation handler during Foundational Build after registrations and callers are rewired to the shared `BuildWorkflowDocumentToolHandler`. Remove placeholder-workflow rendering/lookups, workflow-step-detail dependencies, workflow-config reads, placeholder persistence calls, and placeholder write-proof coupling from this legacy handler rather than preserving them in reduced form.

### `src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts`

- Lines `1`-`198`: delete this workflow-specific document-generation handler during Foundational Build after registrations and callers are rewired to the shared `BuildWorkflowDocumentToolHandler`. Remove placeholder-workflow rendering/lookups, workflow-step-detail dependencies, workflow-config reads, placeholder persistence calls, and placeholder write-proof coupling from this legacy handler rather than preserving them in reduced form.

### `src/core/task/tools/handlers/CreateBrainstormingSessionToolHandler.ts`

- Lines `1`-`86`: delete this workflow-specific brainstorming handler during Foundational Build after runtime-owned deterministic operation routing is in place. Remove placeholder-workflow step-detail lookups and direct brainstorming session-creation ownership from this legacy handler rather than preserving them in reduced form; replacement behavior belongs in workflow-module deterministic definitions orchestrated by `WorkflowRuntime`.

### `src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts`

- Lines `1`-`137`: delete this workflow-specific brainstorming handler during Foundational Build after runtime-owned deterministic operation routing is in place. Remove placeholder-workflow step-detail lookups, direct topic-capture branching, and direct workflow-state interpretation from this legacy handler rather than preserving them in reduced form; replacement behavior belongs in workflow-module deterministic definitions orchestrated by `WorkflowRuntime`.

### `src/core/task/tools/handlers/RequestBrainstormingTechniqueSuggestionToolHandler.ts`

- Lines `1`-`143`: delete this workflow-specific brainstorming handler during Foundational Build after runtime-owned deterministic operation routing is in place. Remove placeholder-workflow step-detail lookups, brainstorming-step gating, and direct technique-suggestion orchestration from this legacy handler rather than preserving them in reduced form; replacement behavior belongs in workflow-module deterministic definitions orchestrated by `WorkflowRuntime`.

### `src/core/task/tools/handlers/SelectBrainstormingSessionToolHandler.ts`

- Lines `1`-`73`: delete this workflow-specific brainstorming handler during Foundational Build after runtime-owned deterministic operation routing is in place. Remove placeholder-workflow step-detail lookups and direct brainstorming-session selection ownership from this legacy handler rather than preserving them in reduced form; replacement behavior belongs in workflow-module deterministic definitions orchestrated by `WorkflowRuntime`.

### `src/core/task/tools/handlers/SelectRandomBrainstormingTechniqueToolHandler.ts`

- Lines `1`-`56`: delete this workflow-specific brainstorming handler during Foundational Build after runtime-owned deterministic operation routing is in place. Remove placeholder-workflow step-detail lookups and direct random-technique selection ownership from this legacy handler rather than preserving them in reduced form; replacement behavior belongs in workflow-module deterministic definitions orchestrated by `WorkflowRuntime`.

### `src/core/task/tools/handlers/PersistBrainstormingApproachToolHandler.ts`

- Lines `1`-`143`: delete this workflow-specific brainstorming handler during Foundational Build after runtime-owned deterministic operation routing is in place. Remove placeholder-workflow step-detail lookups, direct workflow-value interpretation, and direct brainstorming-approach persistence ownership from this legacy handler rather than preserving them in reduced form; replacement behavior belongs in workflow-module deterministic definitions plus runtime-owned workflow-value mutation through `WorkflowRuntime`.

### `src/core/task/tools/handlers/PersistBrainstormingTechniqueToolHandler.ts`

- Lines `1`-`154`: delete this workflow-specific brainstorming handler during Foundational Build after runtime-owned deterministic operation routing is in place. Remove placeholder-workflow step-detail lookups, direct workflow-value interpretation, and direct brainstorming-technique persistence ownership from this legacy handler rather than preserving them in reduced form; replacement behavior belongs in workflow-module deterministic definitions plus runtime-owned workflow-value mutation through `WorkflowRuntime`.

### `src/core/task/tools/handlers/ContinueBrainstormingSessionToolHandler.ts`

- Lines `1`-`67`: delete this workflow-specific brainstorming handler during Foundational Build after live registration is removed and runtime-owned deterministic operation routing is in place. Remove placeholder-workflow step-detail lookups and direct brainstorming-session continuation ownership from this legacy handler rather than preserving them in reduced form; replacement behavior belongs in workflow-module deterministic definitions orchestrated by `WorkflowRuntime`.

### `src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts`

- Lines `1`-`151`: delete this workflow-specific epic-selection handler during Foundational Build after runtime-owned deterministic operation routing is in place. Remove placeholder-workflow step-detail lookups, direct target-epic selection ownership, and direct workflow-step interpretation from this legacy handler rather than preserving them in reduced form; replacement behavior belongs in workflow-module deterministic definitions orchestrated by `WorkflowRuntime`.

### `src/core/task/tools/types/TaskConfig.ts`

- Lines `1`-`29` and `68`-`70`: update this file in one pass so `TaskConfig` carries the shared workflow runtime contract. Add type import `WorkflowRuntime` from `@/core/task/workflow-runtime/WorkflowRuntime`, and add required field `workflowRuntime: WorkflowRuntime` to `TaskConfig` alongside the existing tool-coordination fields. Do not make the field optional; every constructed `TaskConfig` in the foundational runtime must carry the shared workflow runtime instance.

### `src/core/task/tools/utils/ToolConstants.ts`

- Lines `8`-`33`: update `TASK_CONFIG_KEYS` so runtime `TaskConfig` validation enforces the new shared workflow runtime contract. Add `"workflowRuntime"` to the `TASK_CONFIG_KEYS` array adjacent to the existing tool-coordination keys, and leave `TASK_SERVICES_KEYS`, `TASK_CALLBACKS_KEYS`, and the derived key-type exports unchanged.

### `src/core/task/ToolExecutor.ts`

- Lines `1`-`33`, `71`-`143`, and `147`-`219`: update this file in one pass so `ToolExecutor` carries and forwards the shared workflow runtime. Add the `WorkflowRuntime` import, add/store a constructor dependency for the shared `workflowRuntime` instance alongside the other core task services, and include `workflowRuntime: this.workflowRuntime` in the `TaskConfig` returned by `asToolConfig()`. Leave `registerToolHandlers()` as the generic `toolUseNames`-driven registration loop; do not add workflow-specific registration logic to this file.

## Shared Workflow UI Contracts

### `src/shared/ExtensionMessage.ts`

- Lines `562`-`602`: rewrite the shared workflow-form and workflow-start-card message contracts in one pass. Rename `ClineWorkflowForm` to `WorkflowForm`, rename `resolverId` to `workflowFormId`, and leave no compatibility alias. Rename `ClineWorkflowStartCard` to `WorkflowStartCard`, and replace the fixed markdown-body/continue-only payload with the foundational shared project-selection payload: keep `sessionId`, `title`, and `markdownBody`, replace `ctaLabel` with `submitLabel`, and add `projectMode?: "new" | "existing"`, `existingProjectOptions: Array<{ value: string; label: string }>`, `selectedExistingProject?: string`, and `newProjectTitle?: string`. Do not add a normalized project-id/slug field to this shared message contract; filesystem-safe normalization remains runtime-owned.

### `proto/cline/task.proto`

- Lines `165`-`174`: rewrite the workflow-start-card submission contract in one pass. Replace `WorkflowStartCardAction.CONTINUE` with `WorkflowStartCardAction.SUBMIT`, add enum `WorkflowStartCardProjectMode` with `WORKFLOW_START_CARD_PROJECT_MODE_UNSPECIFIED`, `NEW`, and `EXISTING` values, and expand `WorkflowStartCardSubmissionRequest` to carry `session_id`, `action`, `project_mode`, `selected_existing_project`, and `new_project_title`. The request contract must support exactly one user decision path: `EXISTING` plus `selected_existing_project`, or `NEW` plus `new_project_title`.

### `src/shared/proto/cline/task.ts`

- Generated file from `proto/cline/task.proto`; regenerate via `npm run protos` after the workflow-start-card submission proto changes land so the shared TypeScript message/request types reflect the updated wire contract.

### `src/generated/nice-grpc/cline/task.ts`

- Generated file from `proto/cline/task.proto`; regenerate via `npm run protos` after the workflow-start-card submission proto changes land so the grpc/nice-grpc client types reflect the updated wire contract.

### `src/generated/grpc-js/cline/task.ts`

- Generated file from `proto/cline/task.proto`; regenerate via `npm run protos` after the workflow-start-card submission proto changes land so the grpc-js server/client types reflect the updated wire contract.

### `src/core/task/workflow-start-card/types.ts`

- Lines `1`-`10`: rewrite this file in one pass so it contains only the foundational workflow start-card specialist session contract. Delete `WorkflowStartCardRegistryEntry`, and replace the markdown-only `WorkflowStartCardSessionState` surface with the shared project-selection session state needed to drive `WorkflowStartCard`: keep `sessionId` and canonical `workflowName`, keep `markdownBody` only as supplemental copy sourced from runtime-owned start-card definition data, and add `projectMode?: "new" | "existing"`, `existingProjectOptions: Array<{ value: string; label: string }>`, `selectedExistingProject?: string`, `newProjectTitle?: string`, and `submitLabel`. Do not add filesystem-normalized project identity to this session contract; normalization remains runtime-owned.

### `src/core/task/workflow-start-card/WorkflowStartCardRegistry.ts`

- Lines `1`-`221`: delete this file during Foundational Build after `task/index.ts` and the workflow-start-card builder/runtime path stop importing `getWorkflowStartCardRegistryEntry(...)`. Delete `workflowStartCardRegistry` and `getWorkflowStartCardRegistryEntry(...)`. Do not preserve static workflow-name-to-markdown-body lookup as a compatibility registry; replacement start-card definitions belong to workflow-module-owned definitions resolved and projected through `WorkflowRuntime`.

### `src/core/task/workflow-start-card/buildWorkflowStartCardPayload.ts`

- Lines `1`-`20`: rewrite this file in one pass so it projects `WorkflowStartCardSessionState` into the renamed shared `WorkflowStartCard` contract. Replace the import/return type `ClineWorkflowStartCard` with `WorkflowStartCard`, remove the fixed `ctaLabel`-only payload shape, and map the full project-selection session state into the shared message payload: `sessionId`, `title`, `markdownBody`, `submitLabel`, `projectMode`, `existingProjectOptions`, `selectedExistingProject`, and `newProjectTitle`. Keep title generation aligned to the canonical unsuffixed workflow name already supplied by session state, and do not perform workflow discovery, project normalization, or registry lookups in this file.

### `src/core/task/workflow-form/types.ts`

- Lines `1`-`134`: rewrite this file in one pass so it becomes the generic workflow-form engine contract surface only. Replace all imports/usages of `ClineWorkflowForm` with `WorkflowForm` and rename resolver terminology to workflow-form terminology by replacing `WorkflowFormResolverId` with `WorkflowFormId` and `resolverId` fields with `workflowFormId`. Delete placeholder-specific owner semantics and remove `WorkflowFormTriggerSource` and `WorkflowFormSessionOwner` from the generic session/create-options surface. Delete or move workflow-specific orchestration contracts `WorkflowFormStartRequirements`, `WorkflowFormToolExecutionRequest`, `WorkflowFormOperationApplicationResult`, and `WorkflowFormResolverDefinition` out of this file so `WorkflowRuntime` owns definition lookup, deterministic-operation requests, result application, and failure-fallback messaging. Simplify `WorkflowFormSessionState`, `WorkflowFormRuntimeCreateSessionOptions`, `WorkflowFormRuntimeOutcome`, and `WorkflowFormRuntimeLike` to only the generic engine responsibilities that remain after `WorkflowRuntime` owns workflow-specific selection, identity, and next-action orchestration.

### `src/core/task/workflow-form/buildWorkflowFormPayload.ts`

- Lines `1`-`19`: rewrite this file in one pass so it remains the generic shared workflow-form payload formatter. Replace the import/return type `ClineWorkflowForm` with `WorkflowForm`, replace the base-payload field `resolverId` with `workflowFormId` sourced from `args.session.workflowFormId`, and leave `sessionId`, `title`, `toolDictionaryTitle`, `toolDictionaryMarkdown`, `values`, and the existing success/failure/panel `renderState` branches unchanged. Do not add workflow-definition lookup, panel resolution, or any other workflow-specific orchestration to this file.

### `src/core/task/workflow-form/WorkflowFormRuntime.ts`

- Lines `1`-`29` and `612`-`1145`: rewrite `WorkflowFormRuntime` in one pass so it remains only the generic workflow-form engine. Replace `ClineWorkflowForm` with `WorkflowForm` and `resolverId` with `workflowFormId`, remove the import of `workflowFormRegistry` from `./WorkflowFormRegistry`, remove the `WorkflowFormResolverDefinition`-typed default constructor coupling, and delete `resolvePanelPayload(...)`, `buildValidatedDefinition(...)`, `rebuildSessionDefinition(...)`, and `getResolver(...)`. Keep only generic session creation, submission normalization/validation, value merging/reset handling, back/retry navigation, transition evaluation against the already-supplied definition payload, and shared payload formatting. Do not let this class own workflow-form definition lookup, per-panel payload resolution, workflow-specific fallback decisions, or workflow-specific result/orchestration logic; those belong to `WorkflowRuntime`.

### `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`

- Lines `118`-`135`: rewrite `buildWorkflowStartRuntimeToolDictionary(...)` in one pass so the workflow-start runtime dictionary reflects the foundational workflow-value persistence tool. Replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES`, replace the `## set_workflow_placeholders` heading and placeholder-era title/overview/parameter copy with `set_workflow_values` / workflow-value persistence wording, and keep `termKeys`, the returned `{ title, markdown }` shape, and `buildRuntimeToolDictionaryMarkdownFromConfig(config)` unchanged. Do not add shared document-generation dictionary logic to this function.

### `src/core/task/workflow-step-resolution/types.ts`

- Lines `10`-`14`: replace the placeholder-era owner literal in `WorkflowStepResolutionSessionOwner` so `kind` is exactly `"workflow_step"` instead of `"placeholder_workflow_step"`, leaving the owner payload shape as `{ workflowName: string; stepNumber: number }`.
- Lines `37`-`53`: update `WorkflowStepResolutionSessionState` and `WorkflowStepResolutionRuntimeLike.createSession(...)` only as needed to consume the renamed owner contract everywhere this file references `WorkflowStepResolutionSessionOwner`.
- Leave `WorkflowStepResolutionTriggerSource`, `WorkflowStepResolutionEvaluationResult`, `WorkflowStepResolutionToolExecutionRequest`, `WorkflowStepResolutionDefinition`, and `WorkflowStepResolutionRuntimeOutcome` unchanged in this phase.

### `src/core/task/workflow-step-resolution/WorkflowStepResolutionRuntime.ts`

- Lines `1`-`16` and `51`-`62`: rewrite the registry-coupled portions of this file in one pass so `WorkflowStepResolutionRuntime` remains only the generic shared deterministic-execution runtime.
  - delete imports of `getWorkflowStepResolutionDefinition` and `workflowStepResolutionRegistry`
  - change the constructor so `definitions: Record<string, WorkflowStepResolutionDefinition>` is required input with no registry-backed default
  - replace `getDefinition(...)` with a plain lookup against `this.definitions` that throws `Unknown workflow step resolution definition: ${definitionId}` when missing
  - keep `createSession(...)`, `buildPayload(...)`, and `buildTerminalSession(...)` as the surviving generic runtime API, updating them only as needed to consume the renamed runtime-owned `triggerSource` / `owner` contracts from `types.ts`
  - preserve `randomUUID()` session creation, default `"pending"` state, payload building through `buildWorkflowStepResolutionStatusPayload(...)`, and terminal session shaping; this file must not retain any live workflow-specific registry fallback or trigger ownership

## Prompt Assembly

### `src/core/prompts/system-prompt/types.ts`

- Lines `105`-`113` and `139`-`142`: rewrite the workflow-specific prompt-context fields in one pass so this type surface matches the foundational prompt-projection model.
  - keep `activeWorkflowName`
  - rename `activePlaceholderWorkflowStepNumber` to `activeWorkflowStepNumber`
  - delete `activeWorkflowPersonaInstructions`, `activeWorkflowReminder`, `activeWorkflowSupportsPlaceholders`, `activePlaceholderWorkflowName`, `activeDeterministicPlaceholderWorkflowEnabled`, and `managedWorkflowActive`
  - add `workflowSystemInstructionsBlock?: string`, `workflowInputInstructionsBlock?: string`, and `workflowToolSchemaOverride?: readonly ClineToolSpec[]`
  - leave non-workflow prompt-context fields unchanged

### `src/core/task/prompt-refresh.ts`

- Lines `51`-`60`: rewrite `shouldUseContinuationTurnPrompt(...)` in one pass so this helper no longer depends on legacy workflow state. Delete the `managedWorkflowActive?: boolean` parameter and remove the `params.managedWorkflowActive !== true` gate. Leave the function returning `true` only when `hasHumanAuthoredInput === false` and `shouldSendFullPromptAssembly === false`. Leave `normalizePromptRefreshFrequency(...)`, `getPromptRefreshInterval(...)`, `shouldSendFullPromptAssembly(...)`, and `getNextTurnsSinceFullPromptRefresh(...)` unchanged.

### `src/core/prompts/system-prompt/templates/placeholders.ts`

- Lines `1`-`18` and `23`-`40`: rewrite the prompt-section placeholder surface in one pass so workflow prompting uses only the dedicated foundational workflow carriers.
  - in `SystemPromptSection`, delete `AGENT_ROLE`
  - in `SystemPromptSection`, add `WORKFLOW_SYSTEM_INSTRUCTIONS = "WORKFLOW_SYSTEM_INSTRUCTIONS_SECTION"`
  - in `SystemPromptSection`, add `WORKFLOW_INPUT = "WORKFLOW_INPUT_SECTION"`
  - in `SystemPromptSection`, delete `TASK_PROGRESS`
  - leave `USER_INSTRUCTIONS` in place as the surviving generic user-instructions carrier
  - leave `STANDARD_PLACEHOLDERS` structurally unchanged so it continues to spread `...SystemPromptSection`, which will automatically add the two new workflow placeholders and remove `TASK_PROGRESS`
  - replace `REQUIRED_PLACEHOLDERS` so `STANDARD_PLACEHOLDERS.SYSTEM_INFO` remains required and `STANDARD_PLACEHOLDERS.AGENT_ROLE` is removed
  - leave `OPTIONAL_PLACEHOLDERS` and `validateRequiredPlaceholders(...)` unchanged

### `src/core/prompts/system-prompt/components/index.ts`

- Lines `1`-`15` and `22`-`53`: rewrite the prompt-component import block and `getSystemPromptComponents()` return list in one pass so prompt-section registration matches the foundational workflow prompt architecture.
  - delete the import of `getAgentRoleSection`
  - delete the import of `getUpdatingTaskProgress`
  - add imports for the new dedicated workflow system-instructions section component and workflow input section component
  - delete the registry entry for `SystemPromptSection.AGENT_ROLE`
  - add registry entries for `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT`
  - delete the registry entry for `SystemPromptSection.TASK_PROGRESS`
  - keep the `SystemPromptSection.USER_INSTRUCTIONS` registration in place, but only as the surviving generic user-instructions component
  - leave the rest of the component registrations unchanged

### `src/core/prompts/system-prompt/components/agent_role.ts`

- Lines `1`-`18`: delete this file during Foundational Build. Delete `AGENT_ROLE` and `getAgentRoleSection(...)`; the new architecture must not preserve a standalone generic agent-identity/persona prompt component. Agent identity/persona text must arrive only through the runtime-projected workflow system instructions block.

### `src/core/prompts/system-prompt/components/user_instructions.ts`

- Lines `10`-`77`: delete the legacy workflow prompt-carriage behavior from this generic component entirely. Remove workflow reminder injection and any other workflow-specific prompt assembly from `user_instructions.ts`; workflow-specific input instructions must come only from the runtime-owned workflow input block.

### `src/core/prompts/system-prompt/components/continuation_turn.ts`

- Lines `1`-`33` and `35`-`74`: rewrite this file in one pass so the existing continuation-turn prompt pipeline stays in place while workflow-specific continuation content comes only from `WorkflowRuntime`.
  - delete imports of `FocusChainPrompts` and `shouldExposeWorkflowProgressRequest`
  - delete `renderChecklistForPrompt(...)` and `getFocusChainReminderLine(...)`
  - remove local branching on `activePlaceholderWorkflowName`, `activePlaceholderWorkflowStepNumber`, `activeDeterministicPlaceholderWorkflowEnabled`, `activeWorkflowSupportsPlaceholders`, and `managedWorkflowActive`
  - keep the surviving generic continuation scaffold in `getContinuationTurnSection(...)`: header, cwd guidance, current-mode tools line, agent-feedback line, multi-root hint, and Indxr guidance
  - replace the local checklist/workflow-reminder assembly in lines `65`-`72` with direct consumption of `context.workflowSystemInstructionsBlock` and `context.workflowInputInstructionsBlock`
  - append the runtime-projected workflow blocks in system-block-then-input-block order when present, preserving the block text already supplied by `WorkflowRuntime`
  - do not locally derive checklist text, workflow reminder text, workflow progression guidance, or `Current Step`; the continuation workflow input block must already omit `Current Step` before it reaches this file

### `src/core/prompts/system-prompt/components/response_tools.ts`

- Lines `1`-`2` and `17`-`103`: rewrite this file in one pass so it remains the generic response-tools specialist surface while tool mentioning stays aligned to the turn’s actual projected tool visibility.
  - delete the import of `shouldExposeWorkflowProgressRequest`
  - in `getActModeResponseToolNames(...)`, delete the placeholder-workflow gate and stop conditionally pushing `workflow_progress_request` from `activePlaceholderWorkflowName` / `activePlaceholderWorkflowStepNumber`
  - in `getPlanModeResponseToolNames(...)`, make the same removal
  - leave the generic non-workflow mode defaults in place:
    - ACT mode: `attempt_completion`, optional `ask_followup_question`, `send_user_message`
    - PLAN mode: `generate_plan_output`, optional `ask_followup_question`, `send_user_message`
  - keep `RESPONSE_TOOL_LINES.workflow_progress_request` in place so this file can still describe that tool when it is present in the runtime-projected visible tool surface
  - in `getVisibleResponseToolNames(...)`, preserve the native-tool path that filters the ordered candidate list against `context.visibleNativeToolNames`, so providers with native tools mention only response tools actually exposed in the schema for that turn
  - for non-native-tool turns, fall back to the generic mode tool set only; do not locally add `workflow_progress_request` or any other workflow-specific response tool in this file
  - leave `getCurrentModeResponseToolsLine(...)` and `getResponseToolsSection(...)` as formatting-only consumers of the rewritten visibility logic

### `src/core/prompts/system-prompt/components/task_progress.ts`

- Lines `1`-`96`: delete this file during Foundational Build. Delete `UPDATING_TASK_PROGRESS`, `UPDATING_TASK_PROGRESS_NATIVE_NEXT_GEN`, `UPDATING_TASK_PROGRESS_NATIVE_GPT5`, `UPDATING_TASK_PROGRESS_WORKFLOW_PROGRESS_REQUEST`, `UPDATING_TASK_PROGRESS_PLACEHOLDER_WORKFLOW`, and `getUpdatingTaskProgress(...)`. The new prompt architecture must not preserve `task_progress` as a prompt component or prompt-section carrier.

### `src/core/prompts/system-prompt/components/mcp.ts`

- Lines `112`-`149`, `170`-`212`, and `233`-`284`: rewrite the workflow-sensitive guidance block in one pass so only generic MCP/Indxr prompt behavior survives.
  - delete `normalizeActivePlaceholderWorkflowName(...)`, `isDevStoryImplementationStep(...)`, and `isDirectMaterialReviewStep(...)`
  - in `getIndxrExplorationGuidance(...)`, remove all workflow/step-specific branching for `dev-story`, `blind-review`, `review-adversarial-general`, and `review-edge-case-hunter`; leave only generic native-tool-visible and non-native fallback guidance
  - in `replacePromptPlaceholders(...)`, remove `isDevStoryStep` / `isDirectReviewStep` branching and rewrite the placeholder substitutions to depend only on generic Indxr availability vs non-Indxr fallback
  - leave MCP server discovery, Indxr signature detection, visible-native-tool normalization, generic visible-Indxr extraction, `getSubagentIndxrExplorationGuidance(...)`, `getCodeExplorationGuidance(...)`, `getMcp(...)`, and `getMcpServers(...)` unchanged

### `src/core/prompts/contextManagement.ts`

- Lines `1`-`16`, `46`-`57`, and `95`-`103`: rewrite `summarizeTask(...)` in one pass so this file remains a generic context-compaction prompt surface only.
  - remove the `focusChainSettings?: { enabled: boolean }` parameter from `summarizeTask(...)`
  - delete the `task_progress` completion-gating text in lines `14`-`16`
  - delete the conditional `Updating task progress:` block in lines `46`-`50`
  - delete the `<task_progress>` usage/example output in lines `54`-`57` and `95`-`103`
  - leave the CWD/multi-root text and the rest of the summary instructions unchanged
  - leave `continuationPrompt(...)` unchanged

### `src/core/prompts/system-prompt/tools/init.ts`

- Lines `9`, `24`, and `44`-`78`: rewrite the workflow-tool import/registration surface in one pass so the prompt tool registry matches the foundational workflow tool set.
  - delete the import of `build_review_diff_output_variants`
  - delete the import of `set_workflow_placeholders_variants`
  - add the import of `set_workflow_values_variants`
  - add the import of `build_workflow_document_variants`
  - in `allToolVariants`, replace `...set_workflow_placeholders_variants` with `...set_workflow_values_variants`
  - in `allToolVariants`, replace `...build_review_diff_output_variants` with `...build_workflow_document_variants`
  - leave the rest of the non-workflow registrations unchanged

### `src/core/prompts/system-prompt/tools/index.ts`

- Lines `7`, `21`, and `1`-`32`: rewrite the workflow-tool export surface in one pass so the prompt-tools barrel matches the foundational workflow tool set.
  - delete `export * from "./build_review_diff_output"`
  - delete `export * from "./set_workflow_placeholders"`
  - add `export * from "./set_workflow_values"`
  - add `export * from "./build_workflow_document"`
  - leave all non-workflow exports unchanged

### `src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts`

- Lines `1`-`29`: delete this file during Foundational Build after prompt-tool registration/export rewiring is complete. Delete `id = ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS`, the `generic` `ClineToolSpec`, its placeholder-specific description and `contextRequirements`, and `set_workflow_placeholders_variants`. Do not preserve placeholder-era model-facing schema wording, managed-workflow/placeholder gating, or `.cline/workflow-config.yaml` references here; `set_workflow_values` is the only live model-facing workflow-value persistence tool.

### `src/core/prompts/system-prompt/tools/build_review_diff_output.ts`

- Lines `1`-`83`: delete this workflow-specific model-facing document-generation schema during Foundational Build after `tools/init.ts` is rewired to `build_workflow_document_variants`. Delete the `BUILD_REVIEW_DIFF_OUTPUT` generic variant, the diff-source object contract, `scoped_paths`, `context_lines`, and the `diff_output` / `.cline/workflow-config.yaml` wording rather than preserving them in reduced form.

### `src/core/prompts/system-prompt/tools/workflow_progress_request.ts`

- Lines `3` and `8`-`21`: rewrite this file in one pass so it remains only the model-facing schema/description for the surviving `workflow_progress_request` tool.
  - delete the import of `shouldExposeWorkflowProgressRequest`
  - rewrite `generic.description` to concise tool-usage wording only: ask the user to confirm whether the current workflow step is ready to advance, and the system will show the exact approval prompt
  - delete the placeholder-era `contextRequirements` callback entirely; this file must not own workflow-specific tool visibility logic
  - leave `id`, `variant`, `name`, `parameters: []`, and `workflow_progress_request_variants = [generic]` unchanged

### `src/core/prompts/system-prompt/tools/attempt_completion.ts`

- Lines `4`, `28`-`39`, `63`-`75`, and `97`-`105`: rewrite this file in one pass so `attempt_completion` no longer carries the retired auxiliary feedback/progress contract surface.
  - delete `AGENT_FEEDBACK_PARAMETER` from the import in line `4`
  - delete `AGENT_FEEDBACK_PARAMETER` plus the inline `task_progress` parameter object from `generic`
  - delete `AGENT_FEEDBACK_PARAMETER` plus the inline `task_progress` parameter object from `GPT_5`
  - delete `AGENT_FEEDBACK_PARAMETER` plus the inline `task_progress` parameter object from `NATIVE_NEXT_GEN`
  - leave `result`, `command`, `id`, the variant descriptions, `NATIVE_GPT_5`, and `attempt_completion_variants` unchanged

### `src/core/prompts/system-prompt/tools/generate_plan_output.ts`

- Lines `4`, `6`-`21`, `48`-`58`, `75`-`81`, and `106`-`115`: rewrite this file in one pass so `generate_plan_output` no longer carries the retired auxiliary feedback/progress contract surface.
  - delete `AGENT_FEEDBACK_PARAMETER` from the import in line `4`
  - delete the legacy header-comment `task_progress` parameter/usage text in lines `6`-`21`
  - delete `AGENT_FEEDBACK_PARAMETER` plus the inline `task_progress` parameter object from `generic`
  - delete `AGENT_FEEDBACK_PARAMETER` plus the inline `task_progress` parameter object from `NATIVE_GPT_5`
  - delete `AGENT_FEEDBACK_PARAMETER` plus the inline `task_progress` parameter object from `GEMINI_3`
  - leave `response`, `needs_more_exploration`, `id`, the variant descriptions, `NATIVE_NEXT_GEN`, and `generate_plan_output_variants` unchanged

### `src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts`

- Lines `5`-`124`: rewrite this file in one pass so it remains only the generic native-tool filtering seam.
  - stop importing `ACT_MODE_RESPONSE_TOOL_IDS`, `PLAN_MODE_RESPONSE_TOOL_IDS`, and `ALWAYS_PRESERVED_NATIVE_TOOL_IDS` from `./contextualToolMatrix`; rehome those three generic preservation constants in this file as part of the rewrite
  - delete imports/usages of `PLACEHOLDER_BUILTIN_BUNDLE_TOOLS`, `PLACEHOLDER_INDXR_BUNDLE_TOOLS`, and `PLACEHOLDER_WORKFLOW_STEP_MATRIX`
  - delete `BuiltInBundleName`, `IndxrBundleName`, `hasWorkflowMatrixRow(...)`, `normalizeWorkflowNameForMatrixLookup(...)`, `isBuiltInBundleName(...)`, and `isIndxrBundleName(...)`
  - keep `canonicalizeMcpToolName(...)`
  - keep the provider-mode response-tool filtering in `filterContextualNativeToolSpecs(...)`
  - replace all placeholder-workflow gating with a generic `context.workflowToolSchemaOverride` path: if no override is projected, return the mode-filtered registered tools plus MCP tools; if an override is projected, filter built-in and MCP tool specs against that override only
  - do not read `managedWorkflowActive`, `activePlaceholderWorkflowName`, `activePlaceholderWorkflowStepNumber`, or any `.md`-suffix heuristics in this file

### `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`

- Lines `74`-`91`: remove the generic native-tool preservation constants from this legacy workflow-matrix file in one pass after their replacements are moved into the surviving generic native-tool filter seam.
  - delete `ACT_MODE_RESPONSE_TOOL_IDS`
  - delete `PLAN_MODE_RESPONSE_TOOL_IDS`
  - delete `ALWAYS_PRESERVED_NATIVE_TOOL_IDS`
  - leave `PlaceholderToolBundle`, `PLACEHOLDER_BUILTIN_BUNDLE_TOOLS`, `PLACEHOLDER_INDXR_BUNDLE_TOOLS`, and `PLACEHOLDER_WORKFLOW_STEP_MATRIX` untouched as reference-only dead code until Cleanup

## Prompt Variant Files

### `src/core/prompts/system-prompt/variants/config.template.ts`

- Lines `33`-`67`, `109`-`120`, and `126`-`161`: rewrite the shared variant-config examples/helpers in one pass so they model the foundational prompt architecture.
  - delete `SystemPromptSection.AGENT_ROLE` from `config`, `createMinimalVariant(...)`, and `createAdvancedVariant(...)`
  - add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT` to the `config` and `createAdvancedVariant(...)` component lists
  - replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES` in `createAdvancedVariant(...)`
  - leave the non-workflow tool ordering, validation flow, helper names, and minimal helper tool list unchanged

### `src/core/prompts/system-prompt/variants/generic/config.ts`

- Lines `44`-`91`: rewrite the generic variant config in one pass so it uses only the foundational workflow prompt/tool surface.
  - delete `SystemPromptSection.AGENT_ROLE`
  - delete `SystemPromptSection.TASK_PROGRESS`
  - add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT` to the component list
  - replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES`
  - replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`
  - leave the matcher, template, remaining component order, remaining tool order, placeholders, validation, and exports unchanged

### `src/core/prompts/system-prompt/variants/generic/template.ts`

- Lines `3`-`49`: rewrite the generic prompt template in one pass so it renders only the foundational workflow prompt carriers.
  - delete the `SystemPromptSection.AGENT_ROLE` placeholder
  - delete the `SystemPromptSection.TASK_PROGRESS` placeholder
  - add the `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` placeholder in the template’s system-instructions flow
  - add the `SystemPromptSection.WORKFLOW_INPUT` placeholder in the template’s input-instructions flow
  - leave the surviving generic placeholders and separator structure unchanged

### `src/core/prompts/system-prompt/variants/next-gen/config.ts`

- Lines `35`-`90`: rewrite the next-gen variant config in one pass so it uses only the foundational workflow prompt/tool surface.
  - delete `SystemPromptSection.AGENT_ROLE`
  - delete `SystemPromptSection.TASK_PROGRESS`
  - add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT` to the component list
  - replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES`
  - replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`
  - leave the matcher, template, remaining component order, remaining tool order, `RULES` override, placeholders, validation, and exports unchanged

### `src/core/prompts/system-prompt/variants/next-gen/template.ts`

- Lines `5`-`51`: rewrite the next-gen prompt template in one pass so it renders only the foundational workflow prompt carriers.
  - delete the `SystemPromptSection.AGENT_ROLE` placeholder
  - delete the `SystemPromptSection.TASK_PROGRESS` placeholder
  - add the `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` placeholder in the template’s system-instructions flow
  - add the `SystemPromptSection.WORKFLOW_INPUT` placeholder in the template’s input-instructions flow
  - leave `rules_template` plus the surviving generic placeholders and separator structure unchanged

### `src/core/prompts/system-prompt/variants/native-next-gen/config.ts`

- Lines `33`-`97`: rewrite the native next-gen variant config in one pass so it uses only the foundational workflow prompt/tool surface.
  - delete `SystemPromptSection.AGENT_ROLE`
  - delete `SystemPromptSection.TASK_PROGRESS`
  - add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT` to the component list
  - replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES`
  - replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`
  - leave the matcher, template, remaining component order, remaining tool order, override wiring, placeholders, validation, and exports unchanged

### `src/core/prompts/system-prompt/variants/native-next-gen/template.ts`

- Lines `10`-`56`: rewrite the native next-gen prompt template in one pass so it renders only the foundational workflow prompt carriers.
  - delete the `SystemPromptSection.AGENT_ROLE` placeholder
  - delete the `SystemPromptSection.TASK_PROGRESS` placeholder
  - add the `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` placeholder in the template’s system-instructions flow
  - add the `SystemPromptSection.WORKFLOW_INPUT` placeholder in the template’s input-instructions flow
  - leave `RULES`, `TOOL_USE`, `ACT_VS_PLAN`, `OBJECTIVE`, `FEEDBACK`, and the surviving generic placeholders unchanged

### `src/core/prompts/system-prompt/variants/gpt-5/config.ts`

- Lines `32`-`94`: rewrite the GPT-5 variant config in one pass so it uses only the foundational workflow prompt/tool surface.
  - delete `SystemPromptSection.AGENT_ROLE`
  - delete `SystemPromptSection.TASK_PROGRESS`
  - add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT` to the component list
  - replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES`
  - replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`
  - delete the `SystemPromptSection.TASK_PROGRESS` override wiring
  - leave the matcher, template, remaining component order, remaining tool order, other override wiring, placeholders, validation, and exports unchanged

### `src/core/prompts/system-prompt/variants/gpt-5/template.ts`

- Lines `10`-`107`: rewrite the GPT-5 template overrides in one pass so they no longer preserve standalone agent-role or task-progress prompt carriers.
  - in `BASE`, delete the `SystemPromptSection.AGENT_ROLE` and `SystemPromptSection.TASK_PROGRESS` placeholders
  - in `BASE`, add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT`
  - delete `TASK_PROGRESS`
  - remove `TASK_PROGRESS` from `GPT_5_TEMPLATE_OVERRIDES`
  - leave `ACT_VS_PLAN`, `TOOL_USE`, `RULES`, the export name, and the remaining override entries unchanged

### `src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`

- Lines `46`-`109`: rewrite the native GPT-5 variant config in one pass so it uses only the foundational workflow prompt/tool surface.
  - delete `SystemPromptSection.AGENT_ROLE`
  - delete `SystemPromptSection.TASK_PROGRESS`
  - add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT` to the component list
  - replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES`
  - replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`
  - delete the `SystemPromptSection.TASK_PROGRESS` override wiring
  - leave the matcher, template, remaining component order, remaining tool order, other override wiring, placeholders, validation, and exports unchanged

### `src/core/prompts/system-prompt/variants/native-gpt-5/template.ts`

- Lines `9`-`82`: rewrite the native GPT-5 template overrides in one pass so they no longer preserve standalone agent-role or task-progress prompt carriers.
  - in `BASE`, delete the `SystemPromptSection.AGENT_ROLE` and `SystemPromptSection.TASK_PROGRESS` placeholders
  - in `BASE`, add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT`
  - delete `TASK_PROGRESS`
  - remove `TASK_PROGRESS` from `GPT_5_TEMPLATE_OVERRIDES`
  - leave `RULES`, `TOOL_USE`, `OBJECTIVE`, `FEEDBACK`, the export name, and the remaining override entries unchanged

### `src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`

- Lines `40`-`94`: rewrite the native GPT-5.1 variant config in one pass so it uses only the foundational workflow prompt/tool surface.
  - delete `SystemPromptSection.AGENT_ROLE`
  - delete `SystemPromptSection.TASK_PROGRESS`
  - add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT` to the component list
  - replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES`
  - replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`
  - delete the `SystemPromptSection.AGENT_ROLE` override wiring
  - leave the matcher, template, remaining component order, remaining tool order, remaining override wiring, placeholders, validation, and exports unchanged

### `src/core/prompts/system-prompt/variants/native-gpt-5-1/template.ts`

- Lines `6`-`44`: rewrite the native GPT-5.1 prompt template in one pass so it renders only the foundational workflow prompt carriers.
  - delete the `SystemPromptSection.AGENT_ROLE` placeholder
  - delete the `SystemPromptSection.TASK_PROGRESS` placeholder
  - add the `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` placeholder in the template’s system-instructions flow
  - add the `SystemPromptSection.WORKFLOW_INPUT` placeholder in the template’s input-instructions flow
  - leave `GPT_5_1_TEMPLATE_OVERRIDES = { BASE }` and the surviving generic placeholders unchanged

### `src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts`

- Lines `7`-`8`, `48`-`58`, and `129`-`141`: rewrite the GPT-5.1 override surface in one pass so it no longer preserves standalone agent-role or task-progress component overrides.
  - delete `GPT5_1_AGENT_ROLE`
  - delete `GPT5_1_TASK_PROGRESS`
  - delete the `SystemPromptSection.AGENT_ROLE` override entry
  - delete the `SystemPromptSection.TASK_PROGRESS` override entry
  - leave `GPT5_1_RULES`, `GPT5_1_TOOL_USE`, `GPT5_1_ACT_VS_PLAN`, `GPT5_1_OBJECTIVE`, `GPT5_1_FEEDBACK`, and the remaining `gpt51ComponentOverrides` entries unchanged

### `src/core/prompts/system-prompt/variants/gemini-3/config.ts`

- Lines `32`-`92`: rewrite the Gemini 3 variant config in one pass so it uses only the foundational workflow prompt/tool surface.
  - delete `SystemPromptSection.AGENT_ROLE`
  - delete `SystemPromptSection.TASK_PROGRESS`
  - add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT` to the component list
  - replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES`
  - replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`
  - delete the `SystemPromptSection.AGENT_ROLE` and `SystemPromptSection.TASK_PROGRESS` override wiring
  - leave the matcher, template, remaining component order, remaining tool order, remaining override wiring, placeholders, validation, and exports unchanged

### `src/core/prompts/system-prompt/variants/gemini-3/template.ts`

- Lines `3`-`50`: rewrite the Gemini 3 prompt template in one pass so it renders only the foundational workflow prompt carriers.
  - delete the `SystemPromptSection.AGENT_ROLE` placeholder
  - delete the `SystemPromptSection.TASK_PROGRESS` placeholder
  - add the `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` placeholder in the template’s system-instructions flow
  - add the `SystemPromptSection.WORKFLOW_INPUT` placeholder in the template’s input-instructions flow
  - leave the surviving generic placeholders and separator structure unchanged

### `src/core/prompts/system-prompt/variants/gemini-3/overrides.ts`

- Lines `6`-`7`, `215`-`223`, and `225`-`249`: rewrite the Gemini 3 override surface in one pass so it no longer preserves standalone agent-role or task-progress component overrides.
  - delete `GEMINI_3_AGENT_ROLE_TEMPLATE`
  - delete `GEMINI_3_UPDATING_TASK_PROGRESS_TEMPLATE`
  - delete the `SystemPromptSection.AGENT_ROLE` override entry
  - delete the `SystemPromptSection.TASK_PROGRESS` override entry
  - leave `GEMINI_3_TOOL_USE_TEMPLATE`, `GEMINI_3_EDITING_FILES_TEMPLATE`, `GEMINI_3_OBJECTIVE_TEMPLATE`, `GEMINI_3_RULES_TEMPLATE`, `GEMINI_3_FEEDBACK_TEMPLATE`, `GEMINI_3_ACT_VS_PLAN_TEMPLATE`, and the remaining `gemini3ComponentOverrides` entries unchanged

### `src/core/prompts/system-prompt/variants/glm/config.ts`

- Lines `23`-`77`: rewrite the GLM variant config in one pass so it uses only the foundational workflow prompt/tool surface.
  - delete `SystemPromptSection.AGENT_ROLE`
  - delete `SystemPromptSection.TASK_PROGRESS`
  - add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT` to the component list
  - replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES`
  - replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`
  - delete the `SystemPromptSection.TASK_PROGRESS` override wiring
  - leave the matcher, template, remaining component order, remaining tool order, remaining override wiring, placeholders, validation, and exports unchanged

### `src/core/prompts/system-prompt/variants/glm/template.ts`

- Lines `3`-`27`: rewrite the GLM prompt template in one pass so it renders only the foundational workflow prompt carriers.
  - delete the `SystemPromptSection.AGENT_ROLE` placeholder
  - delete the `SystemPromptSection.TASK_PROGRESS` placeholder
  - add the `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` placeholder in the template’s system-instructions flow
  - add the `SystemPromptSection.WORKFLOW_INPUT` placeholder in the template’s input-instructions flow
  - leave the surviving generic placeholders and heading structure unchanged

### `src/core/prompts/system-prompt/variants/glm/overrides.ts`

- Lines `157`-`164` and `208`-`209`: delete the legacy task-progress override from the GLM override surface.
  - delete `GLM_TASK_PROGRESS_TEMPLATE`
  - delete the `SystemPromptSection.TASK_PROGRESS` override entry
  - leave `GLM_OBJECTIVE_TEMPLATE`, `GLM_TOOL_USE_TEMPLATE`, `GLM_RULES_TEMPLATE`, `GLM_MCP_TEMPLATE`, and the remaining `glmComponentOverrides` entries unchanged

### `src/core/prompts/system-prompt/variants/hermes/config.ts`

- Lines `24`-`80`: rewrite the Hermes variant config in one pass so it uses only the foundational workflow prompt/tool surface.
  - delete `SystemPromptSection.AGENT_ROLE`
  - delete `SystemPromptSection.TASK_PROGRESS`
  - add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT` to the component list
  - replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES`
  - replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`
  - delete the `SystemPromptSection.AGENT_ROLE` and `SystemPromptSection.TASK_PROGRESS` override wiring
  - leave the matcher, template, remaining component order, remaining tool order, remaining override wiring, placeholders, validation, and exports unchanged

### `src/core/prompts/system-prompt/variants/hermes/template.ts`

- Lines `3`-`27`: rewrite the Hermes prompt template in one pass so it renders only the foundational workflow prompt carriers.
  - delete the `SystemPromptSection.AGENT_ROLE` placeholder
  - delete the `SystemPromptSection.TASK_PROGRESS` placeholder
  - add the `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` placeholder in the template’s system-instructions flow
  - add the `SystemPromptSection.WORKFLOW_INPUT` placeholder in the template’s input-instructions flow
  - leave the surviving generic placeholders and heading structure unchanged

### `src/core/prompts/system-prompt/variants/hermes/overrides.ts`

- Lines `7`-`12`, `128`-`135`, and `169`-`184`: rewrite the Hermes override surface in one pass so it no longer preserves standalone agent-role or task-progress component overrides.
  - delete `HERMES_AGENT_ROLE_TEMPLATE`
  - delete `HERMES_TASK_PROGRESS_TEMPLATE`
  - delete the `SystemPromptSection.AGENT_ROLE` override entry
  - delete the `SystemPromptSection.TASK_PROGRESS` override entry
  - leave `HERMES_TOOL_USE_TEMPLATE`, `HERMES_OBJECTIVE_TEMPLATE`, `HERMES_MCP_TEMPLATE`, `HERMES_RULES_TEMPLATE`, and the remaining `hermesComponentOverrides` entries unchanged

### `src/core/prompts/system-prompt/variants/devstral/config.ts`

- Lines `8`, `23`-`74`: rewrite the Devstral variant config in one pass so it uses only the foundational workflow prompt/tool surface.
  - delete the import of `DEVSTRAL_AGENT_ROLE_TEMPLATE`
  - delete `SystemPromptSection.AGENT_ROLE`
  - delete `SystemPromptSection.TASK_PROGRESS`
  - add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT` to the component list
  - replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES`
  - replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`
  - delete the `SystemPromptSection.AGENT_ROLE` override wiring
  - leave the matcher, template, remaining component order, remaining tool order, placeholders, validation, and exports unchanged

### `src/core/prompts/system-prompt/variants/devstral/template.ts`

- Lines `3`-`49`: rewrite the Devstral prompt template in one pass so it renders only the foundational workflow prompt carriers.
  - delete the `SystemPromptSection.AGENT_ROLE` placeholder
  - delete the `SystemPromptSection.TASK_PROGRESS` placeholder
  - add the `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` placeholder in the template’s system-instructions flow
  - add the `SystemPromptSection.WORKFLOW_INPUT` placeholder in the template’s input-instructions flow
  - leave the surviving generic placeholders and separator structure unchanged

### `src/core/prompts/system-prompt/variants/devstral/overrides.ts`

- Lines `1`-`10`: delete this file during Foundational Build. Delete `DEVSTRAL_AGENT_ROLE_TEMPLATE` and `devstralComponentOverrides`; the file exists only to preserve the legacy standalone `AGENT_ROLE` override.

### `src/core/prompts/system-prompt/variants/trinity/config.ts`

- Lines `25`-`74`: rewrite the Trinity variant config in one pass so it uses only the foundational workflow prompt/tool surface.
  - delete `SystemPromptSection.AGENT_ROLE`
  - delete `SystemPromptSection.TASK_PROGRESS`
  - add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT` to the component list
  - replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES`
  - replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`
  - leave the matcher, template, remaining component order, remaining tool order, override wiring, placeholders, validation, and exports unchanged

### `src/core/prompts/system-prompt/variants/trinity/template.ts`

- Lines `3`-`49`: rewrite the Trinity prompt template in one pass so it renders only the foundational workflow prompt carriers.
  - delete the `SystemPromptSection.AGENT_ROLE` placeholder
  - delete the `SystemPromptSection.TASK_PROGRESS` placeholder
  - add the `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` placeholder in the template’s system-instructions flow
  - add the `SystemPromptSection.WORKFLOW_INPUT` placeholder in the template’s input-instructions flow
  - leave the surviving generic placeholders and separator structure unchanged

### `src/core/prompts/system-prompt/variants/xs/config.ts`

- Lines `31`-`88`: rewrite the XS variant config in one pass so it uses only the foundational workflow prompt/tool surface.
  - delete `SystemPromptSection.AGENT_ROLE`
  - add `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` and `SystemPromptSection.WORKFLOW_INPUT` to the component list
  - replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES`
  - replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`
  - delete the `SystemPromptSection.AGENT_ROLE` override wiring
  - leave the matcher, template, remaining component order, remaining tool order, remaining override wiring, placeholders, validation, and exports unchanged

### `src/core/prompts/system-prompt/variants/xs/template.ts`

- Lines `3`-`21`: rewrite the XS prompt template in one pass so it renders only the foundational workflow prompt carriers.
  - delete the `SystemPromptSection.AGENT_ROLE` placeholder
  - add the `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` placeholder in the template’s system-instructions flow
  - add the `SystemPromptSection.WORKFLOW_INPUT` placeholder in the template’s input-instructions flow
  - leave the surviving generic placeholders and heading structure unchanged

### `src/core/prompts/system-prompt/variants/xs/overrides.ts`

- Lines `77`-`81`: rewrite `xsComponentOverrides` in one pass so the XS variant no longer preserves a standalone generic identity block outside the workflow runtime prompt projection.
  - delete the `AGENT_ROLE` property from `xsComponentOverrides`
  - leave the surviving `RULES`, `ACT_VS_PLAN`, `CAPABILITIES`, `OBJECTIVE`, `EDITING_FILES`, and `TOOL_USE` overrides unchanged

### `src/core/prompts/system-prompt/variants/variant-validator.ts`

- Lines `169`-`187`: rewrite `validateBestPractices(...)` in one pass so variant validation no longer assumes a standalone `AGENT_ROLE` section exists.
  - replace `recommendedComponents = [SystemPromptSection.AGENT_ROLE, SystemPromptSection.RULES, SystemPromptSection.SYSTEM_INFO]` with a recommended-components list that omits `SystemPromptSection.AGENT_ROLE`
  - delete `agentRoleIndex`
  - delete the warning `AGENT_ROLE should typically be the first component`
  - delete the warning `TOOL_USE should typically come after AGENT_ROLE`
  - leave the remaining best-practice warnings unchanged

## Focus Chain And Progression

### `src/shared/workflow-progress-request.ts`

- Lines `1`-`76`: rewrite this file in one pass so it remains only the generic shared helper for the surviving `workflow_progress_request` capability.
  - delete `WORKFLOW_PROGRESS_REQUEST_WORKFLOW_STEPS`
  - delete `normalizeWorkflowProgressRequestWorkflowName(...)`
  - delete `isWorkflowProgressRequestWorkflowName(...)`
  - delete `isWorkflowProgressRequestStep(...)`
  - keep `WORKFLOW_PROGRESS_REQUEST_QUESTION` and `WORKFLOW_PROGRESS_REQUEST_OPTIONS` unchanged
  - rewrite `shouldExposeWorkflowProgressRequest(...)` so it consumes already-projected permission from runtime-owned callers instead of `workflowName` / `stepNumber`, while still returning `false` when `yoloModeToggled === true`

### `src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`

- Lines `1`-`9` and `40`-`103`: rewrite this file in one pass so `WorkflowProgressRequestToolHandler` remains only the generic interactive approval handler for the surviving `workflow_progress_request` response-tool capability.
  - delete imports/usages of `FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL` and `isWorkflowProgressRequestWorkflowName(...)`
  - in `execute(...)`, keep the YOLO rejection, shared question/options payload, response-tool delivery flow, followup-message selection persistence, `user_feedback` fallback, queued followup, and success finalization unchanged
  - replace all placeholder-workflow/focus-chain gating and mutation with `config.workflowRuntime`: ask runtime whether `workflow_progress_request` is permitted for the active step before prompting, and hand any canonical option response back to runtime for validation and canonical state mutation
  - do not read `config.taskState.activePlaceholderWorkflowSource`, do not read `config.taskState.currentFocusChainChecklist`, and do not call `config.callbacks.updateFCListFromToolResponse(...)` from this handler
  - rewrite error text to generic active-workflow/progression-approval wording only

### `src/core/task/focus-chain/index.ts`

- Lines `1`-`964`: rewrite `FocusChainManager` in one pass so `src/core/task/focus-chain/index.ts` becomes only the downstream workflow checklist/status projection surface required by the foundational architecture.
  - delete imports/usages of placeholder-workflow, managed-workflow, and deterministic-placeholder helpers: `buildPlaceholderWorkflowChecklist`, `getActivePlaceholderWorkflowChecklistLabel`, `getActivePlaceholderWorkflowStepDetails`, `findUnresolvedWorkflowPlaceholders`, `renderManagedWorkflowTaskProgress`, `applyDeterministicPlaceholderProgression`, `isDeterministicPlaceholderWorkflowSupported`, `isFocusChainCompleteNextStepSentinel`, story-task prompt helpers, and placeholder metadata persistence via `getTaskMetadata` / `saveTaskMetadata`
  - replace placeholder/managed-workflow branching in instruction decisions, prompt generation, current-step prompt emission, checklist projection refresh, deterministic progression, and checklist update handling with runtime-owned focus-chain projection consumption from `WorkflowRuntime`, using canonical unsuffixed `activeWorkflowName` and runtime-projected step/status/checklist data only
  - retire AI-facing `task_progress` progression semantics entirely from this file: do not infer the active step from checklist text, do not accept `__COMPLETE_NEXT_STEP__`, and do not emit prompt text telling the model to create or advance workflow progress through `task_progress`
  - keep only the generic focus-chain file watcher, disk read/write, telemetry, webview posting, and downstream checklist/status rendering mechanics needed for runtime-projected workflow focus-chain state and teardown cleanup

### `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`

- Lines `1`-`1487`: delete this file during Foundational Build after caller rewiring removes all live imports/usages. Delete exported contracts `DeterministicPlaceholderToolContext`, `DeterministicPlaceholderProgressionResult`, `isDeterministicPlaceholderWorkflowSupported(...)`, and `applyDeterministicPlaceholderProgression(...)`, plus all private placeholder-era workflow-name allowlists, placeholder-value merging, artifact-path resolution, write-proof heuristics, scaffold validation, review-layer fallback logic, checklist mutation, and placeholder deterministic-state mutation in this file. Do not preserve any helper or compatibility shim; replacement behavior belongs in `WorkflowRuntime` plus workflow-module-owned next-action and deterministic-operation definitions.

### `src/core/controller/file/openFocusChainFile.ts`

- Lines `1`-`40`: delete this file during Foundational Build after caller rewiring removes all live imports/usages. Delete `openFocusChainFile(...)`, `openFileIntegration`, `telemetryService.captureFocusChainListOpened(...)`, `ensureFocusChainFile(...)`, `extractFocusChainListFromText(...)`, and the latest-`task_progress`-message bootstrap logic. Do not preserve a runtime-projection replacement in this file; the legacy focus-chain file-open/bootstrap seam is removed rather than remapped.

## Webview Consumers

### `webview-ui/src/components/chat/ChatRow.tsx`

- Lines `1`-`17`, `328`-`388`, `568`-`635`, `1701`-`1702`, and `1890`-`1894`: rewrite this file in one pass so `ChatRow` consumes the renamed shared workflow message contracts and renders the foundational project-selection workflow start-card UI.
  - replace imports and parsed casts of `ClineWorkflowForm` and `ClineWorkflowStartCard` with `WorkflowForm` and `WorkflowStartCard`
  - keep workflow-form parsing, reset behavior, and rendering generic with no remaining resolver-era assumptions in this file
  - replace the continue-only workflow-start-card handler/renderer with controlled project-selection UI bound to `projectMode`, `existingProjectOptions`, `selectedExistingProject`, `newProjectTitle`, and `submitLabel`
  - require an existing-project selection when `projectMode === "existing"`, require a title when `projectMode === "new"`, and disable submit until the active selection path is valid
  - keep both workflow-form render routes and the workflow-start-card render route pointing at the updated render helpers

### `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`

- Lines `1`-`71`: rewrite the workflow-form and workflow-start-card request-builder block in one pass so it matches the foundational shared message/proto contracts.
  - replace imports and types `ClineWorkflowForm` and `ClineWorkflowStartCard` with `WorkflowForm` and `WorkflowStartCard`
  - keep `buildWorkflowFormSubmissionRequest(...)`, `submitWorkflowForm(...)`, and field serialization generic, with no resolver-era assumptions or workflow-specific branching added here
  - rewrite `buildWorkflowStartCardSubmissionRequest(...)` and `submitWorkflowStartCard(...)` so the emitted proto request matches the foundational workflow-start-card submission contract: replace `WorkflowStartCardAction.CONTINUE` with `WorkflowStartCardAction.SUBMIT`, and populate `projectMode`, `selectedExistingProject`, and `newProjectTitle` from the shared `WorkflowStartCard` payload using the exact proto field mapping required by `WorkflowStartCardSubmissionRequest`
  - leave `serializeWorkflowFormFieldValue(...)` and the other generic value serializers unchanged

## Verification Files Likely Touched During Foundational Build

### `src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts`

- Lines `1`-`64`: rewrite this test file in one pass so it no longer depends on `WorkflowStartCardRegistry.ts` and instead covers the foundational shared start-card payload contract emitted by `buildWorkflowStartCardPayload(...)`. Delete `fs`, `path`, `parseWorkflowStartMessagesReference()`, `getWorkflowStartCardRegistryEntry(...)`, the registry-alignment test, and the nonexistent-workflow assertion. Replace the old title/`ctaLabel` test with payload assertions for the foundational `WorkflowStartCard` shape: `sessionId`, `title`, `markdownBody`, `submitLabel`, `projectMode`, `existingProjectOptions`, `selectedExistingProject`, and `newProjectTitle`, using canonical unsuffixed workflow names and project-selection session data.

### `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

- Lines `1`-`1967`: rewrite this test suite in one pass so it covers only generic `WorkflowFormRuntime` engine behavior under the foundational contract surface. Replace `resolverId`/`ClineWorkflowForm` assertions with `workflowFormId`/`WorkflowForm` terminology, and delete all dependencies on `WorkflowFormRegistry`, registry constants/builders, `placeholder_workflow_step` owner semantics, and `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS`. Keep coverage only for generic engine behavior that survives the foundational rewrite: session creation, payload building, stale panel rejection, sequential/conditional transitions, value normalization, back/retry behavior, failure/success payloads, and generic deterministic-operation outcome handling using local test definitions rather than registry-owned workflow-specific fixtures.

### `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

- Lines `1`-`641`: update this suite only as needed to keep it compiling against foundational shared workflow-form contract changes. Replace `resolverId`-based session construction/assertions with `workflowFormId` terminology wherever this file constructs or inspects shared workflow-form session state, and update any renamed shared workflow-form type imports required by foundational edits to `workflow-form/types.ts`. Do not rewrite resolver-specific behavior, registry builders, placeholder-era workflow expectations, or workflow-specific assertions in this suite during Foundational Build; defer those behavioral changes to module-build and cleanup phases.

### `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts`

- Lines `8`-`92`: update this suite only as needed to keep it aligned with foundational shared step-resolution contract changes. Replace placeholder-specific session-owner fixtures/assertions (`kind: "placeholder_workflow_step"` and `.md`-suffixed workflow names) with the renamed runtime-owned step-resolution owner/session terminology defined in `src/core/task/workflow-step-resolution/types.ts`, and update any payload assertions that reflect the renamed shared owner shape. Keep the rest of the runtime behavior coverage unchanged.

### `src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts`

- Lines `1`-`61`: rewrite this suite in one pass so it stops covering legacy `task_progress` checklist-mutation behavior and instead covers the foundational focus-chain projection behavior required by the runtime-owned architecture. Delete assertions for `evaluateFocusChainChecklistUpdate(...)`, `parseFocusChainChecklistItems(...)`, reordered/renamed checklist rejection, and `__COMPLETE_NEXT_STEP__` sentinel handling. Replace them with assertions against the surviving foundational focus-chain seam showing that runtime-projected active workflow checklist/step-status is reflected while a workflow is active, updates when the runtime projection changes, and clears after completion/teardown so no stale workflow-owned focus-chain state remains visible.

### `src/core/workflows/__tests__/placeholder-workflow-rendering.test.ts`

- Lines `1`-`38`: delete this file in the same change set that deletes `src/core/workflows/placeholder-workflow-rendering.ts` and removes that helper from the compiled runtime via the caller-file changes mapped elsewhere. Delete the import of `../placeholder-workflow-rendering` and all three adapter tests covering single/double-curly substitution, unresolved-placeholder passthrough, and stable/dynamic placeholder-map merge precedence. Do not remap this suite’s assertions onto `WorkflowRuntime` or any surviving runtime-owned workflow session coverage.

### `src/core/workflows/__tests__/workflow-placeholders.test.ts`

- Lines `1`-`84`: delete this legacy unit test during Foundational Build after `src/core/workflows/workflow-placeholders.ts` is removed from the live runtime plan. Remove direct coverage of `buildWorkflowStablePlaceholders(...)`, `extractWorkflowPlaceholderKeys(...)`, and `getCanonicalWorkflowConfigPath(...)` rather than preserving tests for `.cline/workflow-config.yaml` loading, placeholder-key extraction, or placeholder-era stable-value assembly.

### `src/core/workflows/__tests__/placeholder-workflow-step-details.test.ts`

- Lines `1`-`292`: delete this legacy unit test during Foundational Build after `src/core/workflows/placeholder-workflow-step-details.ts` is removed from the live runtime plan. Remove direct coverage of `buildActivePlaceholderWorkflowSource(...)`, `buildPlaceholderWorkflowChecklist(...)`, `getActivePlaceholderWorkflowStepDetails(...)`, and `resolveActivePlaceholderWorkflowPromptContext(...)` rather than remapping those placeholder-era assertions onto the new runtime architecture.

### `src/core/workflows/resolution/__tests__/resolveAvailableWorkflows.test.ts`

- Lines `1`-`74`: delete this legacy unit test during Foundational Build after `src/core/workflows/resolution/resolveAvailableWorkflows.ts` is removed from the live runtime plan. Remove direct coverage of `resolveAvailableWorkflows(...)`, `resolveWorkflowByName(...)`, and `createWorkflowSkillMetadata(...)` rather than remapping legacy discovery precedence or legacy workflow-source semantics onto the new shipped-workflow registry architecture.

### `src/core/task/__tests__/workflowCompletionRunner.test.ts`

- Lines `1`-`134`: delete this legacy unit test during Foundational Build after `src/core/task/workflowCompletionRunner.ts` is removed from the live runtime plan. Remove direct coverage of `workflowCompletionRunner(...)`, `WorkflowCompletionRunnerResult`, placeholder-workflow-id completion gating, checklist-transition heuristics, notice-count heuristics, and completed-workflow-id-based follow-up behavior rather than remapping those legacy completion-runner assertions onto `WorkflowRuntime`.

### `src/core/task/bmad-agent-mode.test.ts`

- Lines `1`-`59`: delete this legacy unit test during Foundational Build after `src/core/task/bmad-agent-mode.ts` is removed from the live runtime plan. Remove direct coverage of `getBmadWorkflowReminder(...)`, `_bmad/_config/workflow-reminders.json` loading, missing-reminder fallback behavior, and BMAD reminder block rendering rather than remapping those assertions onto `WorkflowRuntime` or workflow-module prompt builders.

### `src/core/slash-commands/__tests__/index.test.ts`

- Lines `1`-`344`: rewrite this file in one pass so it matches the foundational slash-command architecture. Keep the `formatMcpPromptResponse(...)` suite in lines `16`-`103` unchanged. Update the surviving MCP `parseSlashCommands(...)` call sites in lines `116`-`148` to the foundational signature by removing `localWorkflowToggles`, `globalWorkflowToggles`, and `cwd`. Delete the legacy workflow-persona and workflow-resolution suites in lines `155`-`343`, then replace them with shipped-workflow slash-command activation coverage that stubs `resolveWorkflowBySlashCommand(...)`, asserts slash-command removal from task text, and verifies the canonical persistent action shape `{ type: "activate_workflow", workflowName, invocationSource: "slash_command" }`. Remove now-unused imports `fs`, `os`, `path`, `sinon`, `StateManager`, and `getCanonicalWorkflowConfigPath` once those legacy assertions are gone.

### `src/test/slash-commands.test.ts`

- Lines `1`-`329`: rewrite this RPC test file in one pass so it matches foundational shipped-workflow slash-command discovery. Keep the built-in slash-command and retired-BMAD-persona absence assertions in lines `55`-`107` unchanged. Delete the managed-workflow assertion in lines `109`-`119` plus the legacy local/global/remote workflow discovery suites in lines `122`-`328`, then replace them with coverage that stubs `getShippedWorkflowSlashCommands()` from `@/core/task/workflow-runtime/WorkflowRegistry` and verifies the RPC projects shipped workflow slash commands into `SlashCommandInfo` entries with `section: "custom"` and `cliCompatible: true`. Remove now-unused imports/usages of `clearManagedWorkflowRegistryCache`, workspace-manager stubs, workflow-toggle stubs, remote-workflow-toggle stubs, and remote-config fixtures once those legacy assertions are gone.

### `src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`

- Lines `74`-`95`: rewrite the registry-facing assertions in one pass so they match the foundational workflow tool surface. Keep the governed response-tool `defaultTurnBehavior === "end_turn"` assertions in lines `74`-`80` unchanged. Rewrite the non-response assertions in lines `82`-`95` so they remove deleted workflow-specific document tool ids `BUILD_EPICS_DOCUMENT`, `BUILD_EPIC_DELIVERY_SPEC`, `BUILD_STORY_DOCUMENT`, and `BUILD_TECH_SPEC_DOCUMENT`, add `ResponseToolRegistry.get(ClineDefaultTool.SET_WORKFLOW_VALUES) === undefined` and `ResponseToolRegistry.get(ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT) === undefined`, and keep `undefined` assertions for deferred surviving non-response workflow/module tools including `BUILD_REVIEW_INPUT`, `SELECT_TARGET_EPIC`, `CONTINUE_BRAINSTORMING_SESSION`, `CREATE_BRAINSTORMING_SESSION`, `SELECT_BRAINSTORMING_SESSION`, `PERSIST_BRAINSTORMING_APPROACH`, `SELECT_RANDOM_BRAINSTORMING_TECHNIQUE`, `PERSIST_BRAINSTORMING_TECHNIQUE`, and `REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION`.

### `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

- Lines `5`-`18`, `38`-`65`, `378`-`449`, `1009`-`2474`, and `2520`-`2723`: rewrite the workflow-specific harness and suites in one pass so this file matches the foundational child-workflow runtime architecture. Delete imports/usages of `ManagedWorkflowRunState`, `@core/task/workflow-activation`, `@core/workflows/resolution/resolveAvailableWorkflows`, and `resolveWorkflowPersonaInstructions(...)`, plus the private-method bindings and prompt-context fields tied to managed/placeholder workflows. Replace the legacy child-workflow activation, inheritance, checklist/task_progress, reminder, and persona suites with coverage that activates child workflows through `WorkflowRegistry.resolveWorkflowByUseSkillName(...)` and `WorkflowRuntime.activateWorkflow(...)`, verifies isolated child workflow state and unchanged parent state, verifies definition-declared inherited workflow values with copy semantics, verifies subagent-local focus-chain storage, and verifies runtime-projected prompt/tool context for child execution. Keep the non-workflow subagent engine coverage elsewhere in the file unchanged.

### `src/core/task/__tests__/prompt-context.test.ts`

- Lines `1`-`80`: delete this legacy unit test during Foundational Build after the helper exports `shouldIncludePersistentPromptContext(...)`, `appendPromptInjectionBlocksToSystemPrompt(...)`, and `isActiveDeterministicPlaceholderWorkflowEnabled(...)` are removed from `src/core/task/index.ts`. Delete the assertions for `activeWorkflowId`, `activePlaceholderWorkflowId`, placeholder-source-based deterministic workflow detection, and prompt-injection block concatenation rather than remapping those legacy helper expectations onto the runtime-owned workflow projection architecture.

### `src/core/task/__tests__/prompt-refresh.test.ts`

- Lines `86`-`125`: update the `shouldUseContinuationTurnPrompt(...)` test block in one pass so it matches the foundational helper signature. Remove `managedWorkflowActive` from every helper call, rename the first test so it asserts continuation-turn use for non-human turns without a full prompt refresh, keep the human-authored-input and full-prompt-refresh false cases, and delete the legacy `returns false when a managed workflow is active` test entirely. Leave the frequency and counter tests in lines `11`-`84` unchanged.

### `src/core/prompts/system-prompt/__tests__/integration.test.ts`

- Lines `30` and `2254`-`2343`: rewrite the workflow-specific integration coverage in one pass so this suite validates foundational workflow prompt assembly instead of standalone persona injection. Delete the import and usage of `resolveWorkflowPersonaInstructions`, and delete the four tests that pass or assert `activeWorkflowPersonaInstructions`. Replace them with coverage that seeds `workflowSystemInstructionsBlock` and `workflowInputInstructionsBlock` on the prompt context, then asserts workflow identity/persona/instruction text is rendered only from those runtime-projected blocks for full prompts and is omitted or altered on continuation turns only when the runtime-projected blocks differ. Do not assert workflow guidance through a standalone `AGENT_ROLE` section or `activeWorkflowPersonaInstructions`. Leave surrounding native-tool and non-agent prompt coverage unchanged.
  - after the integration assertions are rewritten, refresh the snapshot baselines emitted by `integration.test.ts` in `src/core/prompts/system-prompt/__tests__/__snapshots__/` so they match the foundational prompt/tool output surface, and delete any obsolete snapshots for retired prompt or tool-visibility coverage that no longer has a generating test

### `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`

- Lines `1`-`1484`: delete this legacy unit test during Foundational Build after the placeholder-workflow matrix and placeholder-specific native-tool gating logic are removed from `src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts`. Delete all assertions for `PLACEHOLDER_WORKFLOW_STEP_MATRIX`, `activePlaceholderWorkflowName`, `activePlaceholderWorkflowStepNumber`, `managedWorkflowActive`, `.md` suffix normalization, placeholder bundle/tool exposure, legacy tool ids such as `SET_WORKFLOW_PLACEHOLDERS` and `BUILD_REVIEW_DIFF_OUTPUT`, and placeholder-matrix-driven `workflow_progress_request` exposure rather than remapping those legacy assertions onto the runtime-owned workflow tool-schema override architecture.

### `src/core/prompts/system-prompt/__tests__/PromptBuilder.test.ts`

- Lines `302`-`355`: rewrite the `VariantBuilder auto-generation` block in one pass so it no longer references the retiring `SystemPromptSection.AGENT_ROLE` placeholder and remains purely a generic variant-builder test.
  - in the auto-generated-template test, delete `SystemPromptSection.AGENT_ROLE` from the component list and rewrite the include assertions and `expectedTemplate` to cover only the surviving generic component list `SystemPromptSection.TOOL_USE`, `SystemPromptSection.CAPABILITIES`, and `SystemPromptSection.RULES`
  - in the explicit-template test, replace `Custom template with {{AGENT_ROLE_SECTION}}` with a plain literal string such as `Custom template`, and replace the component list with surviving generic sections only
  - leave the empty-component error test unchanged

### `src/core/prompts/system-prompt/__tests__/response_tools.test.ts`

- Lines `6`-`234`: rewrite this file in one pass so it no longer tests placeholder-workflow step gating and instead matches the final generic/native response-tool visibility behavior of `components/response_tools.ts`.
  - delete the placeholder-workflow base contexts and the `pi-planning`, `create-story`, `quick-dev`, and `quick-spec` step-specific suites that assert `workflow_progress_request` exposure from `activePlaceholderWorkflowName` and `activePlaceholderWorkflowStepNumber`
  - add generic non-native ACT and PLAN tests that assert the default response-tool sets omit `workflow_progress_request`
  - add native-tool visibility tests that assert `workflow_progress_request` appears in `getCurrentModeResponseToolsLine(...)` and `getResponseToolsSection(...)` only when `enableNativeToolCalls === true` and `visibleNativeToolNames` includes it
  - add native ACT coverage that asserts `act_mode_respond` is mentioned only when it is present in `visibleNativeToolNames`
  - keep the shared `workflow_progress_request` description-string assertion only in the visibility-driven cases where that tool is actually present

### `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`

- Lines `1`-`284`: delete this file during Foundational Build after `components/task_progress.ts` is removed. Delete all coverage of `getUpdatingTaskProgress(...)`, managed-workflow prompt text, placeholder-workflow prompt text, deterministic-placeholder prompt behavior, and placeholder-step-specific `workflow_progress_request` prompt instructions because the foundational prompt architecture removes `task_progress` as a prompt component entirely.

### `webview-ui/src/components/chat/ChatRow.test.tsx`

- Lines `42`-`69` and `84`-`449`: rewrite the workflow UI test helpers and suites in one pass so this file matches the foundational shared workflow-form and workflow-start-card rendering contracts used by `ChatRow.tsx`.
  - in `createWorkflowFormMessage(...)`, replace the mocked payload field `resolverId` with `workflowFormId`
  - keep the existing workflow-form rendering coverage, but update it only as needed so all mocked payloads and assertions compile against the renamed shared `WorkflowForm` contract
  - add a new workflow-start-card rendering suite after the existing workflow-form suite that asserts the structured project-selection payload is rendered from the shared start-card contract: `submitLabel`, `projectMode`, `existingProjectOptions`, `selectedExistingProject`, and `newProjectTitle`
  - do not add teardown-clears-UI assertions in this file; `ChatRowContent` renders from the row message payload itself, so teardown projection must be covered at a higher-level UI/state seam instead of this row renderer unit test

### `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`

- Lines `1`-`50` and `263`-`271`: rewrite this suite in one pass so it matches the foundational shared workflow-form and workflow-start-card submission contracts.
  - replace the shared type imports `ClineWorkflowForm` and `ClineWorkflowStartCard` with `WorkflowForm` and `WorkflowStartCard`
  - in `createWorkflowForm(...)`, replace `resolverId` with `workflowFormId`; leave the existing workflow-form field-serialization assertions unchanged because the submit request shape does not carry that field
  - in `createWorkflowStartCard(...)`, replace `ctaLabel` with `submitLabel` and add `projectMode`, `existingProjectOptions`, `selectedExistingProject`, and `newProjectTitle`
  - replace the single legacy start-card assertion with structured submission coverage for both valid decision paths: existing-project submission and new-project submission, asserting `WorkflowStartCardAction.SUBMIT` plus the exact mapped request fields required by `WorkflowStartCardSubmissionRequest`

## Notes For The Action Plan

- The foundational action plan should stay infrastructure-first. It should not pull workflow-module-specific prompt strings, workflow-form definitions, start-card definitions, or document-builder content into this phase unless the requirements explicitly place that work in `Foundational Build`.
- The biggest churn centers are `task/index.ts`, prompt assembly, shared message/proto contracts, and focus chain. Those should be batched carefully so the action plan does not bounce between those files repeatedly.
- Generated protobuf outputs and prompt snapshots should be refreshed late in the foundational sequence, after the source contracts and prompt-section wiring have stabilized.
- The foundational action plan is not complete until every legacy workflow-related surface touched during Foundational Build has been implemented in alignment with its approved migration-matrix disposition.
- The foundational action plan must explicitly account for migration away from placeholder workflows, BMAD support files, managed workflows, and fragmented workflow state while preserving shipped behavior for the approved in-scope workflow set throughout the migration.
- The action plan must trace the workflow-value contract as one end-to-end migration surface across backend-owned writes, `set_workflow_values` schema exposure, `SetWorkflowValuesToolHandler`, parent-to-child inheritance, persisted workflow-session state, resume reconstruction, and teardown clearing; do not split those contract changes across disconnected foundational subtasks.
- The action plan must not introduce environment-specific runtime assumptions or new host/hardware dependencies; foundational workflow-runtime changes must stay within the repo's current extension-host, Node/TypeScript, local-workstation, and existing message/proto execution model.
- The action plan must keep workflow orchestration inside the repo's existing application security and tool-execution controls. Foundational workflow-runtime work must not introduce bespoke workflow execution paths that bypass existing tool approval, validation, permission, or runtime control surfaces.
- The foundational architecture must remain an in-process backend capability inside the existing extension/runtime process and must not be re-scoped into a separate service, daemon, worker service, or remote orchestration boundary.
