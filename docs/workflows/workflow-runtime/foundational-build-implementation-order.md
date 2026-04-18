# Foundational Build Implementation Order

This document reorganizes the exact `###` entries from [foundational-build-change-map.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/foundational-build-change-map.md) into a recommended implementation order.

Each file entry below is copied verbatim from the source change map. Only the grouping and ordering have changed.

## Phase 1: Contract Bedrock And Foundational State

### `src/shared/tools.ts`

Status: complete

- Lines `8`-`98`: revise this file in one pass so the shared workflow tool-id surface reaches the foundational end state.
  - in `ClineDefaultTool`, add `SET_WORKFLOW_VALUES = "set_workflow_values"`
  - in `ClineDefaultTool`, add `BUILD_WORKFLOW_DOCUMENT = "build_workflow_document"`
  - delete `SET_WORKFLOW_PLACEHOLDERS`
  - delete the workflow-specific document-generation ids being replaced in this phase: `BUILD_REVIEW_DIFF_OUTPUT`, `BUILD_EPICS_DOCUMENT`, `BUILD_EPIC_DELIVERY_SPEC`, `BUILD_STORY_DOCUMENT`, and `BUILD_TECH_SPEC_DOCUMENT`
  - do not delete deferred non-foundational tool ids here, including `BUILD_REVIEW_INPUT` and `CONTINUE_BRAINSTORMING_SESSION`, because other rows defer those removals to later module-build or cleanup phases
  - leave `toolUseNames` in place so it continues to derive automatically from the enum after the enum rewrite
  - leave `READ_ONLY_TOOLS` unchanged, because neither `SET_WORKFLOW_VALUES` nor `BUILD_WORKFLOW_DOCUMENT` is read-only, and none of the removed workflow tool ids are listed in that block today

### `src/core/task/tools/backendWorkflowToolContracts.ts`

Status: complete

- Lines `4`-`160`: rewrite `backendWorkflowToolContracts` in one pass so the foundational canonical workflow-tool contract map matches the new shared tool surface.
  - change `backendWorkflowToolContracts` from `Record<ClineDefaultTool, BackendWorkflowToolContract | undefined>` to `Partial<Record<ClineDefaultTool, BackendWorkflowToolContract>>` so deleted legacy workflow-helper contracts are removed from the map instead of being retained as `undefined` placeholders
  - keep exactly these four live contract entries in the map after the rewrite: `SET_WORKFLOW_VALUES`, `BUILD_WORKFLOW_DOCUMENT`, `BUILD_REVIEW_INPUT`, and `CODE_REVIEW_SPEC_UPDATE`
  - add `[ClineDefaultTool.SET_WORKFLOW_VALUES]: { id: ClineDefaultTool.SET_WORKFLOW_VALUES, name: "set_workflow_values", parameters: [{ name: "values", required: true, type: "object", description: "Workflow-value key/value map for the active workflow session.", additionalProperties: { type: "string" } }] }`
  - add `[ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT]: { id: ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT, name: "build_workflow_document", parameters: [{ name: "artifact_id", required: true, type: "string", description: "Canonical workflow artifact id selected upstream from the active workflow module's document-builder/artifact definition." }, { name: "destination_path", required: true, type: "string", description: "Resolved absolute destination path prepared upstream by WorkflowRuntime." }, { name: "content", required: true, type: "string", description: "Fully resolved markdown content to atomically write to the destination path." }, { name: "workflow_value_writes", required: false, type: "object", description: "Optional workflow-value writeback map to persist after a successful document write.", additionalProperties: { type: "string" } }] }`
  - delete the legacy helper contract entries for `SET_WORKFLOW_PLACEHOLDERS`, `BUILD_REVIEW_DIFF_OUTPUT`, `BUILD_EPICS_DOCUMENT`, `CONTINUE_BRAINSTORMING_SESSION`, `CREATE_BRAINSTORMING_SESSION`, `SELECT_BRAINSTORMING_SESSION`, `PERSIST_BRAINSTORMING_APPROACH`, `SELECT_RANDOM_BRAINSTORMING_TECHNIQUE`, `PERSIST_BRAINSTORMING_TECHNIQUE`, `REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION`, `PREPARE_BRAINSTORMING_SESSION`, `CAPTURE_BRAINSTORMING_TOPIC`, `SELECT_TARGET_EPIC`, `BUILD_EPIC_DELIVERY_SPEC`, `BUILD_STORY_DOCUMENT`, and `BUILD_TECH_SPEC_DOCUMENT`
  - leave the surviving `BUILD_REVIEW_INPUT` and `CODE_REVIEW_SPEC_UPDATE` contracts unchanged in this phase
  - leave `getBackendWorkflowToolContract(...)` and `isBackendWorkflowToolContractTool(...)` in place, but align them to the partial map shape

### `src/core/task/tools/response/ResponseToolRegistry.ts`

Status: complete

- Lines `5`-`121`: rewrite `RESPONSE_TOOL_METADATA` in one pass so it matches the foundational workflow tool surface.
  - remove deleted enum keys `SET_WORKFLOW_PLACEHOLDERS`, `BUILD_REVIEW_DIFF_OUTPUT`, `BUILD_EPICS_DOCUMENT`, `BUILD_EPIC_DELIVERY_SPEC`, `BUILD_STORY_DOCUMENT`, and `BUILD_TECH_SPEC_DOCUMENT`
  - add `[ClineDefaultTool.SET_WORKFLOW_VALUES]: undefined`
  - add `[ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT]: undefined`
  - keep deferred surviving workflow/module tool ids present with `undefined` entries
  - leave the true governed response-tool metadata entries unchanged: `ATTEMPT`, `ASK`, `SEND_USER_MESSAGE`, `WORKFLOW_PROGRESS_REQUEST`, `PLAN_MODE`, and `ACT_MODE`
  - leave `get(...)` and `isResponseTool(...)` unchanged, aligned to the rewritten map

### `src/shared/ExtensionMessage.ts`

Status: complete

- Lines `562`-`602`: rewrite the shared workflow-form and workflow-start-card message contracts in one pass. Rename `ClineWorkflowForm` to `WorkflowForm`, rename `resolverId` to `workflowFormId`, and leave no compatibility alias. Rename `ClineWorkflowStartCard` to `WorkflowStartCard`, and replace the fixed markdown-body/continue-only payload with the foundational shared project-selection payload: keep `sessionId`, `title`, and `markdownBody`, replace `ctaLabel` with `submitLabel`, and add `projectMode?: "new" | "existing"`, `existingProjectOptions: Array<{ value: string; label: string }>`, `selectedExistingProject?: string`, and `newProjectTitle?: string`. Do not add a normalized project-id/slug field to this shared message contract; filesystem-safe normalization remains runtime-owned.

### `proto/cline/task.proto`

Status: complete

- Lines `165`-`179`: rewrite the workflow-start-card submission contract in one pass using package-unique enum value names so the proto compiles cleanly alongside `WorkflowFormAction`.
  - in `WorkflowStartCardAction`, replace `CONTINUE = 1;` with `WORKFLOW_START_CARD_ACTION_SUBMIT = 1;`; do not use bare `SUBMIT` because `WorkflowFormAction.SUBMIT` already exists in the same `cline` package
  - add enum `WorkflowStartCardProjectMode` with exactly `WORKFLOW_START_CARD_PROJECT_MODE_UNSPECIFIED = 0;`, `WORKFLOW_START_CARD_PROJECT_MODE_NEW = 1;`, and `WORKFLOW_START_CARD_PROJECT_MODE_EXISTING = 2;`; do not use bare `NEW` / `EXISTING`
  - expand `WorkflowStartCardSubmissionRequest` to carry `session_id`, `action`, `project_mode`, `selected_existing_project`, and `new_project_title`
  - the request contract must support exactly one user decision path: `WORKFLOW_START_CARD_PROJECT_MODE_EXISTING` plus `selected_existing_project`, or `WORKFLOW_START_CARD_PROJECT_MODE_NEW` plus `new_project_title`

### `src/shared/proto/cline/task.ts`

Status: complete

- Generated file from `proto/cline/task.proto`; regenerate via `npm run protos` after the workflow-start-card submission proto changes land so the shared TypeScript message/request types reflect the updated wire contract.

### `src/generated/nice-grpc/cline/task.ts`

Status: complete

- Generated file from `proto/cline/task.proto`; regenerate via `npm run protos` after the workflow-start-card submission proto changes land so the grpc/nice-grpc client types reflect the updated wire contract.

### `src/generated/grpc-js/cline/task.ts`

Status: complete

- Generated file from `proto/cline/task.proto`; regenerate via `npm run protos` after the workflow-start-card submission proto changes land so the grpc-js server/client types reflect the updated wire contract.

### `src/core/task/workflow-start-card/types.ts`

Status: complete

- Lines `1`-`10`: rewrite this file in one pass so it contains only the foundational workflow start-card specialist session contract. Delete `WorkflowStartCardRegistryEntry`, and replace the markdown-only `WorkflowStartCardSessionState` surface with the shared project-selection session state needed to drive `WorkflowStartCard`: keep `sessionId` and canonical `workflowName`, keep `markdownBody` only as supplemental copy sourced from runtime-owned start-card definition data, and add `projectMode?: "new" | "existing"`, `existingProjectOptions: Array<{ value: string; label: string }>`, `selectedExistingProject?: string`, `newProjectTitle?: string`, and `submitLabel`. Do not add filesystem-normalized project identity to this session contract; normalization remains runtime-owned.

### `src/core/task/workflow-form/types.ts`

Status: complete

- Lines `1`-`134`: rewrite this file in one pass so it becomes the generic workflow-form engine contract surface only. Replace all imports/usages of `ClineWorkflowForm` with `WorkflowForm` and rename resolver terminology to workflow-form terminology by replacing `WorkflowFormResolverId` with `WorkflowFormId` and `resolverId` fields with `workflowFormId`. Delete placeholder-specific owner semantics and remove `WorkflowFormTriggerSource` and `WorkflowFormSessionOwner` from the generic session/create-options surface. Delete or move workflow-specific orchestration contracts `WorkflowFormStartRequirements`, `WorkflowFormToolExecutionRequest`, `WorkflowFormOperationApplicationResult`, and `WorkflowFormResolverDefinition` out of this file so `WorkflowRuntime` owns definition lookup, deterministic-operation requests, result application, and failure-fallback messaging. Simplify `WorkflowFormSessionState`, `WorkflowFormRuntimeCreateSessionOptions`, `WorkflowFormRuntimeOutcome`, and `WorkflowFormRuntimeLike` to only the generic engine responsibilities that remain after `WorkflowRuntime` owns workflow-specific selection, identity, and next-action orchestration.
  - in `WorkflowFormRuntimeOutcome`, delete the `kind: "fallback_to_agent"` variant entirely
  - in the `kind: "invoke_deterministic_operation"` variant, delete `resultDataKey`, `rebuildDefinitionAfterSuccess`, and `recomputeDestinationAfterSuccess`; keep only the generic deterministic-operation fields needed for the engine to signal that an operation must run before the next panel is rendered
  - in `WorkflowFormRuntimeLike`, delete `continueAfterDeterministicOperation(...)`; post-operation continuation, destination recomputation, result application, and fallback decisioning belong to `WorkflowRuntime`
  - do not add any replacement workflow-specific cancel/fallback outcome to this file; cancel-path ownership belongs to `WorkflowRuntime`, not the generic workflow-form engine contract

### `src/core/task/workflow-step-resolution/types.ts`

Status: complete

- Lines `10`-`14`: replace the placeholder-era owner literal in `WorkflowStepResolutionSessionOwner` so `kind` is exactly `"workflow_step"` instead of `"placeholder_workflow_step"`, leaving the owner payload shape as `{ workflowName: string; stepNumber: number }`.
- Lines `37`-`53`: update `WorkflowStepResolutionSessionState` and `WorkflowStepResolutionRuntimeLike.createSession(...)` only as needed to consume the renamed owner contract everywhere this file references `WorkflowStepResolutionSessionOwner`.
- Leave `WorkflowStepResolutionTriggerSource`, `WorkflowStepResolutionEvaluationResult`, `WorkflowStepResolutionToolExecutionRequest`, `WorkflowStepResolutionDefinition`, and `WorkflowStepResolutionRuntimeOutcome` unchanged in this phase.

### `src/core/task/workflow-runtime/types.ts`

Status: complete

- New file, whole file:
  - import exactly:
    - `type ClineToolSpec` from `@/core/prompts/system-prompt/spec`
    - `type BackendWorkflowToolContract` from `@/core/task/tools/backendWorkflowToolContractTypes`
    - `type WorkflowForm`, `type WorkflowFormDefinitionPayload` from `@shared/ExtensionMessage`
    - `type WorkflowFormId`, `type WorkflowFormSessionState` from `@/core/task/workflow-form/types`
    - `type WorkflowStartCardSessionState` from `@/core/task/workflow-start-card/types`
    - `type WorkflowStepResolutionDefinition`, `type WorkflowStepResolutionSessionState`, and `type WorkflowStepResolutionToolExecutionRequest` from `@/core/task/workflow-step-resolution/types`
    - `type SkillMetadata` from `@/shared/skills`
  - export exactly these root contracts:
    - `type WorkflowName = string`
    - `type WorkflowValue = string`
    - `type WorkflowValues = Record<string, WorkflowValue>`
    - `type WorkflowProjectMode = "new" | "existing"`
    - `type WorkflowProjectSubfolder = "discovery" | "planning" | "implementation" | "review" | "testing"`
    - `interface WorkflowDiscoveryCandidate { value: string; label: string }`
    - `interface WorkflowProjectSelectionState { projectMode: WorkflowProjectMode; projectTitle: string; projectFolderName: string }`
    - `interface WorkflowUiSessionState { startCardSession?: WorkflowStartCardSessionState; formSession?: WorkflowFormSessionState; stepResolutionSession?: WorkflowStepResolutionSessionState; suppressedWorkflowFormIds: WorkflowFormId[]; suppressedWorkflowStepResolutionDefinitionIds: string[] }`
    - `interface ActiveWorkflowSession { workflowName: WorkflowName; activeStepNumber: number; workflowValues: WorkflowValues; projectSelection: WorkflowProjectSelectionState; ui: WorkflowUiSessionState }`
    - `type PersistedWorkflowSession = ActiveWorkflowSession`
  - export exactly this prompt projection contract:
    - `interface WorkflowPromptProjection { workflowSystemInstructionsBlock?: string; workflowInputInstructionsBlock?: string; workflowToolSchemaOverride?: readonly ClineToolSpec[] }`
  - export exactly these next-action contracts:
    - `interface WorkflowRenderStartCardNextAction { kind: "render_workflow_start_card"; startCardSession: WorkflowStartCardSessionState }`
    - `interface WorkflowRenderFormNextAction { kind: "render_workflow_form"; formSession: WorkflowFormSessionState; payload: WorkflowForm }`
    - `interface WorkflowRunDeterministicNextAction { kind: "run_deterministic_operation"; toolRequest: WorkflowStepResolutionToolExecutionRequest; stepResolutionSession?: WorkflowStepResolutionSessionState; fallbackDecision?: WorkflowDeterministicFallbackDecision }`
    - `interface WorkflowProjectPromptNextAction { kind: "project_prompt"; promptProjection: WorkflowPromptProjection }`
    - `interface WorkflowCompleteNextAction { kind: "complete_workflow" }`
    - `interface WorkflowNoOpNextAction { kind: "no_op" }`
    - `type WorkflowNextAction = WorkflowRenderStartCardNextAction | WorkflowRenderFormNextAction | WorkflowRunDeterministicNextAction | WorkflowProjectPromptNextAction | WorkflowCompleteNextAction | WorkflowNoOpNextAction`
  - export exactly these workflow-definition/module contracts:
    - `interface WorkflowPromptBuilderInput { session: ActiveWorkflowSession; step: WorkflowStepDefinition }`
    - `interface WorkflowSetWorkflowValuesOverrideSelection { contract: BackendWorkflowToolContract; buildToolSchemaOverride(input: WorkflowPromptBuilderInput): readonly ClineToolSpec[] | undefined }`
    - `interface WorkflowNextActionCondition { id: string; matches(session: ActiveWorkflowSession): boolean }`
    - `interface WorkflowNextActionRule { id: string; condition: WorkflowNextActionCondition; action: WorkflowNextAction["kind"]; workflowFormId?: WorkflowFormId; stepResolutionDefinitionId?: string; documentBuilderId?: string }`
    - `interface WorkflowCompletionRule { id: string; isComplete(session: ActiveWorkflowSession): boolean }`
    - `interface WorkflowChildInheritanceRule { parentKey: string; childKey: string }`
    - `interface WorkflowStartCardDefinition { markdownBody: string; submitLabel: string }`
    - `interface WorkflowDocumentBuilderDefinition { id: string; artifactId: string; toolContract: BackendWorkflowToolContract; buildContent(session: ActiveWorkflowSession): string | Promise<string>; workflowValueWrites?: WorkflowValues }`
    - `interface WorkflowStepDefinition { id: \`step-\${number}\`; stepNumber: number; checklistLabel: string; buildPromptProjection(input: WorkflowPromptBuilderInput): WorkflowPromptProjection; allowWorkflowProgressRequest: boolean; workflowFormId?: WorkflowFormId; stepResolutionDefinitionId?: string; nextActionRules?: WorkflowNextActionRule[]; completionRules?: WorkflowCompletionRule[]; setWorkflowValuesToolOverride?: WorkflowSetWorkflowValuesOverrideSelection; documentBuilderIds?: string[] }`
    - `interface WorkflowDefinition { name: WorkflowName; slashCommandName: string; useSkillName: string; persona: SkillMetadata["name"] | string; projectSubfolder: WorkflowProjectSubfolder; startCard: WorkflowStartCardDefinition; steps: Record<WorkflowStepDefinition["id"], WorkflowStepDefinition>; workflowForms?: Record<WorkflowFormId, WorkflowFormDefinitionPayload>; stepResolutionDefinitions?: Record<string, WorkflowStepResolutionDefinition>; documentBuilders?: Record<string, WorkflowDocumentBuilderDefinition>; childInheritance?: WorkflowChildInheritanceRule[] }`
  - export exactly these support contracts:
    - `interface WorkflowDiscoveryRequest { baseDirectory: string; targetPathSegments?: string[]; entryType: "file" | "directory" | "any"; immediateChildrenOnly: boolean; namingPattern?: RegExp; buildLabel?: (entryName: string) => string; sort: "alpha_asc" | "alpha_desc" }`
    - `interface ShippedWorkflowMetadata { name: WorkflowName; persona: SkillMetadata["name"] | string; projectSubfolder: WorkflowProjectSubfolder }`
    - `type WorkflowValidationResult = { valid: true } | { valid: false; errorMessage: string }`
    - `type WorkflowRuntimeErrorCategory = "activation" | "validation" | "discovery" | "progression" | "deterministic" | "persistence" | "resume" | "teardown"`
    - `type WorkflowDeterministicFallbackDecision = "fallback_to_agent" | "stay_on_step" | "advance_step"`
    - `interface WorkflowDiagnosticEvent { category: WorkflowRuntimeErrorCategory; message: string; workflowName?: WorkflowName; stepNumber?: number }`

### `src/core/prompts/system-prompt/types.ts`

Status: complete

- Lines `105`-`113`, `139`-`142`, and `280`-`286`: rewrite the workflow-specific prompt-context and parameter-gating seams in one pass so this type surface matches the foundational prompt-projection model.
  - keep `activeWorkflowName`
  - rename `activePlaceholderWorkflowStepNumber` to `activeWorkflowStepNumber`
  - delete `activeWorkflowPersonaInstructions`, `activeWorkflowReminder`, `activeWorkflowSupportsPlaceholders`, `activePlaceholderWorkflowName`, `activeDeterministicPlaceholderWorkflowEnabled`, and `managedWorkflowActive`
  - add `workflowSystemInstructionsBlock?: string`, `workflowInputInstructionsBlock?: string`, and `workflowToolSchemaOverride?: readonly ClineToolSpec[]`
  - in `TASK_PROGRESS_PARAMETER`, delete the workflow-specific `contextRequirements` predicate that references `activeDeterministicPlaceholderWorkflowEnabled`; do not preserve any parameter-level gating in this file that depends on removed workflow prompt-context fields
  - leave the rest of `TASK_PROGRESS_PARAMETER` unchanged
  - leave non-workflow prompt-context fields unchanged

### `src/core/task/TaskState.ts`

Status: complete

- Lines `4`-`10`, `35`-`63`, and `152`-`170`: perform one foundational workflow-state rewrite in this file.
  - in the import block, remove placeholder-era and managed-workflow-only imports that become dead with the field rewrite, and add the runtime-owned workflow imports from `src/core/task/workflow-runtime/types.ts` needed for `activeWorkflowName` and the canonical workflow session carrier
  - delete the local placeholder-only type declarations that exist only to support removed task-state fields; do not leave placeholder-era deterministic or auto-complete notice types in this file after the field rewrite
  - replace only the workflow carrier fields in lines `152`-`159` and `163`-`170`; leave `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey` unchanged because create-story module build owns any migration of those fields
  - add the canonical fields `activeWorkflowName?: WorkflowName` and `activeWorkflowSession?: ActiveWorkflowSession`
  - delete `activeWorkflowId`, `activePlaceholderWorkflowId`, `activePlaceholderWorkflowSource`, `activePlaceholderWorkflowStableValues`, `activePlaceholderWorkflowValues`, `activePlaceholderWorkflowDeterministicState`, `activePlaceholderWorkflowTaskWriteProofPaths`, `lastPromptedPlaceholderWorkflowChecklistLabel`, `pendingAutoCompletedPlaceholderWorkflowStepNotices`, `activeWorkflowJustStarted`, and `managedWorkflowRun`
  - keep `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, `activeWorkflowStepResolutionSession`, `suppressedWorkflowStepResolutionDefinitionIds`, and `suppressedWorkflowFormResolverIds` as the surviving workflow UI/specialist-session carriers, aligned to the runtime-owned workflow semantics introduced by the corresponding specialist-type edits elsewhere in this change map

### `src/core/context/context-tracking/ContextTrackerTypes.ts`

Status: complete

- Lines `1`-`60`: align the `TaskMetadata` workflow persistence mirror with the foundational runtime-owned workflow persistence model.
  - remove imports used only by deleted placeholder-era and managed-workflow metadata fields, including `ManagedWorkflowRunState`, `ActivePlaceholderWorkflowDeterministicState`, `AutoCompletedPlaceholderWorkflowStepNotice`, and `ActivePlaceholderWorkflowSource`
  - add the runtime-owned workflow persistence imports from `src/core/task/workflow-runtime/types.ts` needed for canonical workflow identity and the minimum persisted workflow session contract required for safe resume
  - delete the legacy metadata mirror fields `activeWorkflowId`, `activePlaceholderWorkflowId`, `activePlaceholderWorkflowSource`, `activePlaceholderWorkflowStableValues`, `activePlaceholderWorkflowValues`, `activePlaceholderWorkflowDeterministicState`, `activePlaceholderWorkflowTaskWriteProofPaths`, `lastPromptedPlaceholderWorkflowChecklistLabel`, `pendingAutoCompletedPlaceholderWorkflowStepNotices`, and `managedWorkflowRun`
  - leave `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey` unchanged because create-story module build owns any migration of those metadata fields
  - keep `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, and `activeWorkflowStepResolutionSession` as the surviving workflow UI-session metadata mirrors, aligned to the runtime-owned workflow semantics introduced elsewhere in this change map

### `src/core/task/tools/types/TaskConfig.ts`

Status: complete

- Lines `1`-`29`, `68`-`70`, and `128`-`131`: update this file in one pass so `TaskConfig` carries the shared workflow runtime contract and no longer depends on deterministic-placeholder tool-context types. Add type import `WorkflowRuntime` from `@/core/task/workflow-runtime/WorkflowRuntime`, and add required field `workflowRuntime: WorkflowRuntime` to `TaskConfig` alongside the existing tool-coordination fields. Do not make the field optional; every constructed `TaskConfig` in the foundational runtime must carry the shared workflow runtime instance.
  - delete the import of `DeterministicPlaceholderToolContext`
  - rewrite `updateFCListFromToolResponse` so its callback signature is exactly `(taskProgress: string | undefined) => Promise<FocusChainChecklistUpdateResult>`


## Phase 2: Runtime Specialists And New Workflow Surfaces

### `src/core/task/workflow-runtime/WorkflowRegistry.ts`

Status: complete

- New file, whole file:
  - directly import the shipped workflow definition modules in this file as those definition modules are introduced by downstream Module Build action plans, plus `type WorkflowDefinition` and `type WorkflowName` from `src/core/task/workflow-runtime/types.ts` and `type SkillMetadata` from `src/shared/skills.ts`; do not introduce or depend on a separate workflow registration barrel/index file as part of this change
  - declare one module-scope shipped-definition collection and three private lookup maps keyed by `definition.name`, `definition.slashCommandName`, and `definition.useSkillName`; downstream Module Build action plans extend that collection by adding the newly approved workflow definition imports for each shipped workflow, and those imported definitions remain the sole source of truth for shipped workflow identity and the Section 2.7 workflow-to-persona-to-project-subfolder mapping already encoded in those definitions
  - export exactly these five functions and no additional exported constants or helper types: `resolveWorkflowDefinition(workflowName)`, `resolveWorkflowBySlashCommand(commandName)`, `resolveWorkflowByUseSkillName(skillName)`, `getShippedWorkflowSlashCommands()`, and `getWorkflowSkillMetadata()`
  - implement `resolveWorkflowDefinition(...)`, `resolveWorkflowBySlashCommand(...)`, and `resolveWorkflowByUseSkillName(...)` as pure lookups over the shipped-definition collection so `WorkflowRuntime`, slash-command activation, and `useSkill` activation all resolve through the same product-owned registry seam
  - implement `getShippedWorkflowSlashCommands()` as a pure projection of the shipped-definition collection that returns one entry per shipped workflow in the shape `{ name: definition.slashCommandName, description: \`Shipped workflow: ${definition.name}\` }` for `getAvailableSlashCommands.ts`
  - implement `getWorkflowSkillMetadata()` as a pure projection of the shipped-definition collection that returns one `SkillMetadata` per shipped workflow in the shape `{ name: definition.useSkillName, description: \`Shipped workflow: ${definition.name}\`, path: \`shipped-workflow://${definition.name}\`, source: "global" }` for main-agent and subagent prompt skill exposure
  - keep this file limited to shipped-workflow definition lookup and metadata projection only; do not read toggle state, workspace state, remote config, managed-workflow registries, BMAD assets, or any legacy workflow-resolution helper such as `resolveAvailableWorkflows(...)`, `resolveWorkflowByName(...)`, or `createWorkflowSkillMetadata(...)`

### `src/core/task/workflow-runtime/discovery.ts`

Status: complete

- New file, whole file:
  - export exactly `async function discoverWorkflowCandidates(request: WorkflowDiscoveryRequest): Promise<WorkflowDiscoveryCandidate[]>`; import `type WorkflowDiscoveryRequest` and `type WorkflowDiscoveryCandidate` from `src/core/task/workflow-runtime/types.ts`
  - implement `discoverWorkflowCandidates(...)` as the one shared runtime-owned filesystem-enumeration seam; the request must carry target-directory resolution inputs, requested entry-type filtering, immediate-child filtering, optional naming-convention matching, candidate-label projection, and deterministic sort behavior
  - resolve the target directory from that request inside this file, then perform enumeration only with `fs.readdir(resolvedTargetDirectory, { withFileTypes: true })`; filter the returned `Dirent`s, apply any naming-convention matcher, and project survivors into the normalized discovery candidate contract
  - keep this file generic: do not read workflow session state, placeholder values, or workflow-specific config, and do not hardcode brainstorming/project/artifact folder names or filename patterns here; workflow-specific discovery rules must arrive through the typed request contract
  - return normalized discovery candidates with separate canonical value and display text so the same result can support project-selection start-card flows, workflow-form artifact-selection flows, and runtime-owned next-action or deterministic evaluation
  - treat `ENOENT` as an empty candidate set and rethrow all other filesystem failures; caller-file edits elsewhere must route convention-driven project/artifact enumeration through this file instead of preserving bespoke helpers such as brainstorming-session discovery

### `src/core/task/workflow-start-card/buildWorkflowStartCardPayload.ts`

Status: complete

- Lines `1`-`20`: rewrite this file in one pass so it projects `WorkflowStartCardSessionState` into the renamed shared `WorkflowStartCard` contract. Replace the import/return type `ClineWorkflowStartCard` with `WorkflowStartCard`, remove the fixed `ctaLabel`-only payload shape, and map the full project-selection session state into the shared message payload: `sessionId`, `title`, `markdownBody`, `submitLabel`, `projectMode`, `existingProjectOptions`, `selectedExistingProject`, and `newProjectTitle`. Keep title generation aligned to the canonical unsuffixed workflow name already supplied by session state, and do not perform workflow discovery, project normalization, or registry lookups in this file.

### `src/core/task/workflow-form/buildWorkflowFormPayload.ts`

Status: complete

- Lines `1`-`19`: rewrite this file in one pass so it remains the generic shared workflow-form payload formatter. Replace the import/return type `ClineWorkflowForm` with `WorkflowForm`, replace the base-payload field `resolverId` with `workflowFormId` sourced from `args.session.workflowFormId`, and leave `sessionId`, `title`, `toolDictionaryTitle`, `toolDictionaryMarkdown`, `values`, and the existing success/failure/panel `renderState` branches unchanged. Do not add workflow-definition lookup, panel resolution, or any other workflow-specific orchestration to this file.

### `src/core/task/workflow-form/WorkflowFormRuntime.ts`

Status: complete

- Lines `1`-`29` and `612`-`1145`: rewrite `WorkflowFormRuntime` in one pass so it remains only the generic workflow-form engine. Replace `ClineWorkflowForm` with `WorkflowForm` and `resolverId` with `workflowFormId`, remove the import of `workflowFormRegistry` from `./WorkflowFormRegistry`, remove the `WorkflowFormResolverDefinition`-typed default constructor coupling, and delete `resolvePanelPayload(...)`, `buildValidatedDefinition(...)`, `rebuildSessionDefinition(...)`, `getResolver(...)`, and `continueAfterDeterministicOperation(...)`. Keep only generic session creation, submission normalization/validation, value merging/reset handling, back/retry navigation, transition evaluation against the already-supplied definition payload, and shared payload formatting. Do not let this class own workflow-form definition lookup, per-panel payload resolution, workflow-specific fallback decisions, or workflow-specific result/orchestration logic; those belong to `WorkflowRuntime`.
  - in `handleSubmission(...)`, delete the `WorkflowFormAction.CANCEL` branch that returns `kind: "fallback_to_agent"`; `WorkflowRuntime` must intercept and own cancel-path behavior before or around generic workflow-form submission handling
  - in `resolveTransitionOutcome(...)`, delete `resultDataKey`, `rebuildDefinitionAfterSuccess`, and `recomputeDestinationAfterSuccess` from the local return shape and from every callsite that forwards that data into `WorkflowFormRuntimeOutcome`
  - keep only the generic transition-evaluation data needed for the engine to either render the next panel immediately or surface that a deterministic operation must run; do not preserve any workflow-level result-application, rebuild-definition, recompute-destination, or fallback metadata in this class

### `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`

Status: complete

- Lines `118`-`135`: rewrite `buildWorkflowStartRuntimeToolDictionary(...)` in one pass so the workflow-start runtime dictionary reflects the foundational workflow-value persistence tool. Replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES`, replace the `## set_workflow_placeholders` heading and placeholder-era title/overview/parameter copy with `set_workflow_values` / workflow-value persistence wording, and keep `termKeys`, the returned `{ title, markdown }` shape, and `buildRuntimeToolDictionaryMarkdownFromConfig(config)` unchanged. Do not add shared document-generation dictionary logic to this function.

### `src/core/task/workflow-step-resolution/WorkflowStepResolutionRuntime.ts`

Status: complete

- Lines `1`-`16` and `51`-`62`: rewrite the registry-coupled portions of this file in one pass so `WorkflowStepResolutionRuntime` remains only the generic shared deterministic-execution runtime.
  - delete imports of `getWorkflowStepResolutionDefinition` and `workflowStepResolutionRegistry`
  - change the constructor so `definitions: Record<string, WorkflowStepResolutionDefinition>` is required input with no registry-backed default
  - replace `getDefinition(...)` with a plain lookup against `this.definitions` that throws `Unknown workflow step resolution definition: ${definitionId}` when missing
  - keep `createSession(...)`, `buildPayload(...)`, and `buildTerminalSession(...)` as the surviving generic runtime API, updating them only as needed to consume the renamed runtime-owned `triggerSource` / `owner` contracts from `types.ts`
  - preserve `randomUUID()` session creation, default `"pending"` state, payload building through `buildWorkflowStepResolutionStatusPayload(...)`, and terminal session shaping; this file must not retain any live workflow-specific registry fallback or trigger ownership

### `src/core/prompts/system-prompt/tools/set_workflow_values.ts`

Status: complete

- New file, whole file:
  - import `ModelFamily`, `ClineDefaultTool`, and `type ClineToolSpec`; define one fallback `generic` variant with `id = ClineDefaultTool.SET_WORKFLOW_VALUES`, `variant = ModelFamily.GENERIC`, and `name = "set_workflow_values"`
  - export `set_workflow_values_variants = [generic]` and keep this file limited to the shared fallback schema only; do not implement workflow-specific key lists or per-step restrictions here because those belong to workflow-module override projections
  - define the tool description in workflow-value terms only: wrapper shape `{"values": {...}}`, writes apply to the active workflow session, and no references to placeholders, managed workflows, or `.cline/workflow-config.yaml`
  - define exactly one required parameter named `values` with `type: "object"` and `additionalProperties: { type: "string" }`; do not enumerate fallback keys in this file, and leave workflow-specific key restrictions to runtime validation and workflow-module overrides
  - do not add legacy `contextRequirements` based on `managedWorkflowActive`, `activeWorkflowSupportsPlaceholders`, or `activePlaceholderWorkflowName`; live exposure is handled by the runtime-owned workflow projection and downstream prompt-tool wiring edits already mapped elsewhere

### `src/core/prompts/system-prompt/tools/build_workflow_document.ts`

Status: complete

- New file, whole file:
  - import `ModelFamily`, `ClineDefaultTool`, and `type ClineToolSpec`; define one fallback `generic` variant with `id = ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`, `variant = ModelFamily.GENERIC`, and `name = "build_workflow_document"`
  - export `build_workflow_document_variants = [generic]` and keep this file limited to the shared fallback schema only; do not implement workflow-specific artifact-family branching or workflow-specific destination logic here because those belong to `WorkflowRuntime` plus workflow-module document-builder definitions
  - define the tool description only in normalized request terms: `artifact_id`, `destination_path`, `content`, and optional `workflow_value_writes`; do not reference review diffs, placeholders, managed workflows, BMAD assets, or `.cline/workflow-config.yaml`
  - define exactly these parameters in the fallback schema: required string `artifact_id`, required string `destination_path`, required string `content`, and optional object `workflow_value_writes` with `additionalProperties: { type: "string" }`
  - do not add legacy `contextRequirements` or workflow-name-specific exposure logic here; live exposure is handled by the runtime-owned workflow projection and downstream prompt-tool wiring edits already mapped elsewhere

### `src/core/task/workflow-runtime/WorkflowRuntime.ts`

- New file, whole file:
  - add the shared `WorkflowRuntime` class as the sole runtime owner of workflow orchestration
  - treat this row as the only authoritative implementation contract for this file during Foundational Build. Do not inspect adjacent placeholder-era, managed-workflow-era, or partially migrated runtime files to infer behavior for `WorkflowRuntime.ts`; the live repo is intentionally mid-flight and those surrounding files are not the source of truth for this row.
  - import exactly the types and seams this file needs for its public API and core orchestration:
    - `randomUUID` from `crypto`
    - `mkdir` from `fs/promises`
    - `join` from `path`
    - `type ClineToolSpec` from `@/core/prompts/system-prompt/spec`
    - `type TaskState` from `@/core/task/TaskState`
    - `WorkflowFormRuntime` from `@/core/task/workflow-form/WorkflowFormRuntime`
    - `WorkflowStepResolutionRuntime` from `@/core/task/workflow-step-resolution/WorkflowStepResolutionRuntime`
    - `discoverWorkflowCandidates` from `@/core/task/workflow-runtime/discovery`
    - `resolveWorkflowDefinition` from `@/core/task/workflow-runtime/WorkflowRegistry`
    - `WorkflowStartCardAction`, `type WorkflowFormSubmissionRequest`, and `type WorkflowStartCardSubmissionRequest` from `@shared/proto/cline/task`
    - `ClineDefaultTool` from `@/shared/tools`
    - from `./types`, import only these already-pinned runtime contracts: `type ActiveWorkflowSession`, `type PersistedWorkflowSession`, `type WorkflowDefinition`, `type WorkflowDiscoveryCandidate`, `type WorkflowNextAction`, `type WorkflowPromptProjection`, `type WorkflowProjectSelectionState`, `type WorkflowStepDefinition`, `type WorkflowValidationResult`, and `type WorkflowValues`
  - define the constructor signature exactly as `constructor(args: { cwd: string })`; store `cwd` on the instance and do not add any other constructor parameters in this phase
  - inside the class, instantiate exactly one generic form engine as `private readonly workflowFormRuntime = new WorkflowFormRuntime()`
  - do not cache `WorkflowStepResolutionRuntime` on the class; instantiate it only inside the deterministic-step paths with `new WorkflowStepResolutionRuntime(definition.stepResolutionDefinitions ?? {})`
  - add one private file-local pending-form-operation map so the runtime can coordinate `WorkflowFormRuntime` deterministic outcomes without introducing new public contracts in this phase:
    - `private readonly pendingWorkflowFormOperationByTaskState = new WeakMap<TaskState, { session: import("@/core/task/workflow-form/types").WorkflowFormSessionState; operationId: string; nextPanelId?: string; terminal?: boolean }>()`
  - define the public class surface exactly as these methods and no others:
    - `async activateWorkflow(args: { taskState: TaskState; workflow: WorkflowDefinition; parentSession?: ActiveWorkflowSession }): Promise<WorkflowNextAction>`
    - `async resolveNextAction(args: { taskState: TaskState }): Promise<WorkflowNextAction>`
    - `async submitWorkflowStartCard(args: { taskState: TaskState; request: WorkflowStartCardSubmissionRequest }): Promise<WorkflowNextAction>`
    - `async submitWorkflowForm(args: { taskState: TaskState; request: WorkflowFormSubmissionRequest }): Promise<WorkflowNextAction>`
    - `async handleDeterministicToolResult(args: { taskState: TaskState; toolResultText?: string }): Promise<WorkflowNextAction>`
    - `isWorkflowProgressRequestAllowed(args: { taskState: TaskState }): boolean`
    - `async submitWorkflowProgressRequest(args: { taskState: TaskState; approved: boolean }): Promise<WorkflowNextAction>`
    - `async applyWorkflowValueWrites(args: { taskState: TaskState; values: WorkflowValues }): Promise<{ changedValues: WorkflowValues; unchangedValues: WorkflowValues }>`
    - `async buildTurnProjection(args: { taskState: TaskState }): Promise<WorkflowPromptProjection>`
    - `getPersistedSession(args: { taskState: TaskState }): PersistedWorkflowSession | undefined`
    - `async restorePersistedSession(args: { taskState: TaskState; persistedSession?: PersistedWorkflowSession }): Promise<WorkflowNextAction | undefined>`
    - `async teardownWorkflow(args: { taskState: TaskState }): Promise<void>`
  - do not add any additional public methods to this file during Foundational Build; any helper needed beyond the list above must be private
  - add private helpers only for the file-local mechanics below; do not expose them publicly:
    - one helper that mirrors `taskState.activeWorkflowSession?.ui` into the task-state mirror fields `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, `activeWorkflowStepResolutionSession`, `suppressedWorkflowFormResolverIds`, and `suppressedWorkflowStepResolutionDefinitionIds`
    - one helper that returns the active workflow definition from `taskState.activeWorkflowName`
    - one helper that returns the active step definition as `definition.steps[\`step-\${session.activeStepNumber}\`]`
    - one helper that derives the first step number by sorting `Object.values(workflow.steps)` ascending by `stepNumber` and taking the lowest value
    - one helper that normalizes a new-project title into `projectFolderName` exactly as `title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "")`
    - one helper that validates a workflow definition and returns `WorkflowValidationResult`; `activateWorkflow(...)`, `resolveNextAction(...)`, and `restorePersistedSession(...)` must call this helper before orchestrating a definition. The helper must return `{ valid: false, errorMessage }` for exactly these cases and no others in this phase:
      - `workflow.name.trim() === ""`
      - `workflow.slashCommandName.trim() === ""`
      - `workflow.useSkillName.trim() === ""`
      - `workflow.startCard.markdownBody.trim() === ""`
      - `workflow.startCard.submitLabel.trim() === ""`
      - `Object.values(workflow.steps).length === 0`
      - any step where `step.id !== \`step-\${step.stepNumber}\``
      - any step where `step.checklistLabel.trim() === ""`
      - duplicate `step.stepNumber` values
      - any step-level `workflowFormId` that is absent from `workflow.workflowForms`
      - any step-level `stepResolutionDefinitionId` that is absent from `workflow.stepResolutionDefinitions`
      - any step-level `documentBuilderIds[]` entry that is absent from `workflow.documentBuilders`
      - any next-action rule with `action === "render_workflow_form"` whose `workflowFormId` is missing or absent from `workflow.workflowForms`
      - any next-action rule with `action === "run_deterministic_operation"` whose `stepResolutionDefinitionId` is missing or absent from `workflow.stepResolutionDefinitions`
      - any next-action rule whose `documentBuilderId` is present but absent from `workflow.documentBuilders`
    - one helper that ensures the selected per-project folder and the canonical subfolders `discovery`, `planning`, `implementation`, `review`, and `testing` exist under the exact path `join(this.cwd, session.projectSelection.projectFolderName)` by calling `mkdir(..., { recursive: true })` first on the project folder itself and then on each canonical subfolder path within it
    - one helper that refreshes `taskState.currentFocusChainChecklist` from runtime-owned workflow step/status state and clears it when no workflow is active; this helper must use only the active workflow definition plus `taskState.activeWorkflowSession` and must not call placeholder or managed-workflow checklist builders. It must build `taskState.currentFocusChainChecklist` exactly by sorting `Object.values(definition.steps)` ascending by `stepNumber` and joining these lines with `\"\\n\"`:
      - for each step whose `stepNumber` is less than `session.activeStepNumber`, `- [x] ${step.checklistLabel}`
      - for each step whose `stepNumber` is greater than or equal to `session.activeStepNumber`, `- [ ] ${step.checklistLabel}`
      - if there is no active session or no valid active definition/step, set `taskState.currentFocusChainChecklist = null`
    - one helper that builds the project-selection start-card session from the active workflow plus discovery output
  - `activateWorkflow(...)` must validate that the supplied workflow contains at least one step before mutating task state; if no step exists, return `{ kind: "no_op" }` and leave task state unchanged
  - on successful activation, `activateWorkflow(...)` must set `taskState.activeWorkflowName = workflow.name` and create `taskState.activeWorkflowSession` exactly as:
    - `workflowName: workflow.name`
    - `activeStepNumber: <lowest step number in the definition>`
    - `workflowValues: {}` unless `parentSession` plus `workflow.childInheritance` copies values in
    - `projectSelection: { projectMode: "new", projectTitle: "", projectFolderName: "" }` as the canonical unresolved pre-project-selection sentinel state
    - `ui: { startCardSession: undefined, formSession: undefined, stepResolutionSession: undefined, suppressedWorkflowFormIds: [], suppressedWorkflowStepResolutionDefinitionIds: [] }`
  - when `parentSession` is provided, apply `workflow.childInheritance` only as explicit copy-only inheritance: for each declared `{ parentKey, childKey }`, if `parentSession.workflowValues[parentKey]` is defined, copy that string value into the new session’s `workflowValues[childKey]`; do not inherit any undeclared keys and do not share mutable references between parent and child sessions
  - after activation, clear `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, `activeWorkflowStepResolutionSession`, `suppressedWorkflowFormResolverIds`, and `suppressedWorkflowStepResolutionDefinitionIds`, clear any pending form operation entry in the private `WeakMap`, refresh `taskState.currentFocusChainChecklist` through the private runtime-owned checklist helper, sync the session mirrors, and then return `resolveNextAction(...)`
  - `resolveNextAction(...)` is the only public method in this file allowed to emit `render_workflow_start_card`, `render_workflow_form`, `run_deterministic_operation`, `project_prompt`, `complete_workflow`, or `no_op`; all other mutating public methods must finish by delegating back to `resolveNextAction(...)`
  - `resolveNextAction(...)` must follow exactly this evaluation order and no other:
    - if `taskState.activeWorkflowSession` or `taskState.activeWorkflowName` is missing, return `{ kind: "no_op" }`
    - resolve the workflow definition from `taskState.activeWorkflowName`; if it is missing, call `teardownWorkflow(...)` and return `{ kind: "no_op" }`
    - validate that workflow definition through the private `WorkflowValidationResult` helper; if validation fails, call `teardownWorkflow(...)` and return `{ kind: "no_op" }`
    - resolve the active step as `definition.steps[\`step-\${session.activeStepNumber}\`]`; if it is missing, call `teardownWorkflow(...)` and return `{ kind: "no_op" }`
    - refresh `taskState.currentFocusChainChecklist` through the private runtime-owned checklist helper immediately after definition/step validation and before any branching below
    - if the project-selection sentinel is still unresolved because `session.projectSelection.projectTitle === ""` or `session.projectSelection.projectFolderName === ""`, build/render the workflow start card and return `render_workflow_start_card`
    - if the private `pendingWorkflowFormOperationByTaskState` map contains an entry for the current `taskState`, emit `run_deterministic_operation` with `toolRequest: { toolName: pending.operationId as ClineDefaultTool, toolInput: {}, toolParams: {} }`; do not inspect other files to reconstruct legacy workflow-form operation payloads in this phase
    - if `session.ui.formSession` is present, mirror it to `taskState.activeWorkflowFormSession`, build `payload` with `this.workflowFormRuntime.buildPayload(session.ui.formSession)`, and return `render_workflow_form` with both `formSession` and `payload`
    - if `session.ui.stepResolutionSession` is present and its `state === "pending"`, rebuild the deterministic tool request from the active workflow definition plus the session’s `definitionId`, and return `run_deterministic_operation`
    - if `activeStep.completionRules` exists and any rule’s `isComplete(session)` returns `true`, call `teardownWorkflow(...)` and return `{ kind: "complete_workflow" }`
    - evaluate `activeStep.nextActionRules` in array order and use only the first rule whose `condition.matches(session)` returns `true`
    - if no next-action rule matches, fall back in this exact order: unsuppressed `activeStep.workflowFormId`, then unsuppressed `activeStep.stepResolutionDefinitionId`, then `project_prompt`
  - when `resolveNextAction(...)` renders the shared pre-workflow start card, it must call `discoverWorkflowCandidates(...)` exactly as:
    - `baseDirectory: this.cwd`
    - `entryType: "directory"`
    - `immediateChildrenOnly: true`
    - `sort: "alpha_asc"`
    - `buildLabel: (entryName) => entryName`
    - do not pass `targetPathSegments` for the shared pre-workflow project-selection gate; existing project choices must come from immediate child project folders beneath the visible project output root
  - the start-card session that `resolveNextAction(...)` creates or refreshes must be populated exactly as:
    - `sessionId: existing start-card session id if one already exists for the active session, otherwise randomUUID()`
    - `workflowName: definition.name`
    - `markdownBody: definition.startCard.markdownBody`
    - `submitLabel: definition.startCard.submitLabel`
    - `projectMode: existing start-card session project mode if present, otherwise "new"`
    - `existingProjectOptions: <the discovered candidates>`
    - `selectedExistingProject: existing start-card selection only if that value still exists in the refreshed candidate list`
    - `newProjectTitle: existing start-card free-text value if present`
  - when `resolveNextAction(...)` renders a workflow form, it must create a new session only from `definition.workflowForms?.[workflowFormId]` plus `this.workflowFormRuntime.createSession(...)`, then immediately build `payload` with `this.workflowFormRuntime.buildPayload(formSession)` and return both `formSession` and `payload`; do not inspect `WorkflowFormRegistry.ts`, trigger registries, or any placeholder-era form lookup helper from this file
  - when `resolveNextAction(...)` renders a deterministic workflow-step operation, it must create a `WorkflowStepResolutionRuntime` from `definition.stepResolutionDefinitions ?? {}`, create or reuse the `stepResolutionSession`, build the tool request from the referenced step-resolution definition, mirror that session into both `session.ui.stepResolutionSession` and `taskState.activeWorkflowStepResolutionSession`, and return `run_deterministic_operation`
  - when `resolveNextAction(...)` falls through to prompt projection, it must call `buildTurnProjection(...)` and return `{ kind: "project_prompt", promptProjection }`
  - `submitWorkflowStartCard(...)`, `submitWorkflowForm(...)`, `handleDeterministicToolResult(...)`, and `submitWorkflowProgressRequest(...)` must validate the active session/user action, mutate `taskState.activeWorkflowSession` plus the workflow-owned UI/session carriers as needed, and then immediately reevaluate through `resolveNextAction(...)` instead of open-coding branch-specific next-step logic
  - `submitWorkflowStartCard(...)` must validate exactly these conditions before mutating project selection:
    - there is an active workflow session
    - there is an active workflow start-card session
    - `request.sessionId === taskState.activeWorkflowStartCardSession.sessionId`
    - `request.action === WorkflowStartCardAction.WORKFLOW_START_CARD_ACTION_SUBMIT`
  - `submitWorkflowStartCard(...)` must support only these two canonical decision paths:
    - `request.projectMode === "existing"` with a non-empty `request.selectedExistingProject` that exactly matches one of `existingProjectOptions[].value`; on success set `projectSelection = { projectMode: "existing", projectTitle: request.selectedExistingProject, projectFolderName: request.selectedExistingProject }`
    - `request.projectMode === "new"` with a non-empty trimmed `request.newProjectTitle`; on success set `projectSelection = { projectMode: "new", projectTitle: <trimmed title>, projectFolderName: <normalized title> }`
  - for a `new` project submission, if the normalized folder name is empty after the exact slugging rule above, treat the request as invalid, leave task state unchanged, and return `{ kind: "no_op" }`
  - after a valid start-card submission, resolve the active workflow definition, validate it, ensure the selected per-project folder plus the canonical `discovery`, `planning`, `implementation`, `review`, and `testing` subfolders exist under `join(this.cwd, session.projectSelection.projectFolderName)`, then clear `session.ui.startCardSession`, `taskState.activeWorkflowStartCardSession`, and any stale pending form operation entry, refresh `taskState.currentFocusChainChecklist` through the private runtime-owned checklist helper, sync the mirrors, and return `resolveNextAction(...)`
  - `submitWorkflowForm(...)` must validate that an active workflow session and `session.ui.formSession` both exist and that `request.sessionId === session.ui.formSession.sessionId`; otherwise return `{ kind: "no_op" }`
  - in `submitWorkflowForm(...)`, delegate form submission handling only to `this.workflowFormRuntime.handleSubmission(session.ui.formSession, request)` and then apply the returned outcome exactly as follows:
    - `render_form`: replace `session.ui.formSession` with the returned session, sync mirrors, and return `resolveNextAction(...)`
    - `complete_success`: clear `session.ui.formSession`, append that form’s `workflowFormId` to `session.ui.suppressedWorkflowFormIds` if it is not already present, sync mirrors, and return `resolveNextAction(...)`
    - `invoke_deterministic_operation`: store `{ session: outcome.session, operationId: outcome.operationId, nextPanelId: outcome.nextPanelId, terminal: outcome.terminal }` in the private `WeakMap`, clear `session.ui.formSession`, sync mirrors, and return `resolveNextAction(...)`
  - `handleDeterministicToolResult(...)` must read deterministic state from only one of these two runtime-owned carriers:
    - `session.ui.stepResolutionSession` for workflow-step deterministic operations
    - the private `pendingWorkflowFormOperationByTaskState` entry for workflow-form deterministic operations
  - for a workflow-step deterministic result, `handleDeterministicToolResult(...)` must evaluate the result through the referenced step-resolution definition, terminalize the step-resolution session with `WorkflowStepResolutionRuntime.buildTerminalSession(...)`, and then:
    - on success, clear `session.ui.stepResolutionSession`, append the definition id to `session.ui.suppressedWorkflowStepResolutionDefinitionIds` if it is not already present, increment `session.activeStepNumber` by exactly `1`, refresh `taskState.currentFocusChainChecklist` through the private runtime-owned checklist helper, sync mirrors, and return `resolveNextAction(...)`
    - on failure with `fallbackToAgent === true`, clear `session.ui.stepResolutionSession`, append the definition id to `session.ui.suppressedWorkflowStepResolutionDefinitionIds`, refresh `taskState.currentFocusChainChecklist` through the private runtime-owned checklist helper, sync mirrors, and return `resolveNextAction(...)`
    - on failure without `fallbackToAgent`, keep `session.activeStepNumber` unchanged, clear `session.ui.stepResolutionSession`, append the definition id to `session.ui.suppressedWorkflowStepResolutionDefinitionIds`, refresh `taskState.currentFocusChainChecklist` through the private runtime-owned checklist helper, sync mirrors, and return `resolveNextAction(...)`
  - for a workflow-form deterministic result, `handleDeterministicToolResult(...)` must use only the pending private `WeakMap` entry plus the stored form session; do not inspect any other file to derive behavior. Apply the tool result exactly as:
    - if `toolResultText` is falsy or starts with `Error:`, treat the operation as failed, restore the stored form session to `session.ui.formSession`, clear the pending `WeakMap` entry, sync mirrors, and return `resolveNextAction(...)`
    - if `terminal === true`, clear the pending entry, append the stored form session’s `workflowFormId` to `session.ui.suppressedWorkflowFormIds` if needed, sync mirrors, and return `resolveNextAction(...)`
    - if `terminal !== true` and `nextPanelId` is present, restore the stored form session with `currentPanelId` replaced by `nextPanelId`, clear the pending entry, sync mirrors, and return `resolveNextAction(...)`
    - if neither terminal completion nor `nextPanelId` is available, restore the stored form session unchanged, clear the pending entry, sync mirrors, and return `resolveNextAction(...)`
  - `applyWorkflowValueWrites(...)` is the canonical workflow-value mutation seam used by `SetWorkflowValuesToolHandler` and later runtime-owned deterministic/document handlers; centralize workflow-value write validation, any runtime-owned normalization, changed/unchanged key classification, and active-step write-permission enforcement in this method instead of re-implementing them in callers
  - in `applyWorkflowValueWrites(...)`, derive the active-step write-permission key set only from the active step definition’s `setWorkflowValuesToolOverride?.buildToolSchemaOverride(...)` result:
    - build the override input from the canonical active workflow session plus the active step definition
    - from the returned `readonly ClineToolSpec[] | undefined`, find the spec with `id === ClineDefaultTool.SET_WORKFLOW_VALUES`
    - inside that spec, find the parameter with `name === "values"` and `type === "object"`
    - if that parameter has `properties`, treat exactly those property keys as the allowed workflow-value write set for the active step
    - if there is no active workflow session, no active step definition, no `setWorkflowValuesToolOverride`, no matching `SET_WORKFLOW_VALUES` spec, no `values` object parameter, or no `properties` map, treat the active-step write-permission set as empty and do not infer writable keys from backend tool contracts, prompt prose, existing workflow values, or any other source
    - classify attempted keys outside that allowed set as unchanged rather than writing them
  - `applyWorkflowValueWrites(...)` must trim each candidate value before comparison and storage; classify a key as changed only when the trimmed value differs from the currently stored workflow value
  - `isWorkflowProgressRequestAllowed(...)` must return `false` unless all of the following are true: there is an active workflow session, the active workflow definition resolves, the active step resolves, the project-selection sentinel has already been satisfied, and `activeStep.allowWorkflowProgressRequest === true`
  - `submitWorkflowProgressRequest(...)` must return `{ kind: "no_op" }` when `approved !== true`; when `approved === true`, it must increment `session.activeStepNumber` by exactly `1`, clear both suppression arrays, refresh `taskState.currentFocusChainChecklist` from runtime-owned workflow step/status state, sync mirrors, and return `resolveNextAction(...)`
  - `buildTurnProjection(...)` must build and return the prompt projection consumed by prompt assembly by calling only `activeStep.buildPromptProjection({ session, step })`; it must not mutate `TaskState`, and when there is no active session, no active workflow definition, or no active step, it must return an empty object literal `{}`
  - `getPersistedSession(...)` and `restorePersistedSession(...)` are the only public persistence/resume seams in this file; do not add separate public save/load/rehydrate helpers
  - `getPersistedSession(...)` must return `structuredClone(taskState.activeWorkflowSession)` when an active session exists, otherwise `undefined`
  - `restorePersistedSession(...)` must behave exactly as follows:
    - if `persistedSession` is absent, return `undefined`
    - resolve the workflow definition from `persistedSession.workflowName`; if it is missing, call `teardownWorkflow(...)` and return `undefined`
    - validate that workflow definition through the private `WorkflowValidationResult` helper; if validation fails, call `teardownWorkflow(...)` and return `undefined`
    - resolve the persisted active step from that definition; if it is missing, call `teardownWorkflow(...)` and return `undefined`
    - otherwise attach `taskState.activeWorkflowName = persistedSession.workflowName` and `taskState.activeWorkflowSession = structuredClone(persistedSession)`, refresh `taskState.currentFocusChainChecklist` from runtime-owned workflow step/status state, sync the UI/session mirrors from the restored session, and return `resolveNextAction(...)`
  - `handleDeterministicToolResult(...)` must refresh `taskState.currentFocusChainChecklist` through the private runtime-owned checklist helper whenever deterministic evaluation changes the active step or clears step-resolution state; do not leave focus-chain projection ownership in placeholder helpers
  - `teardownWorkflow(...)` must clear `activeWorkflowName`, `activeWorkflowSession`, all workflow-owned UI/session carriers, `taskState.currentFocusChainChecklist`, the two suppressed-id arrays, and any pending form operation entry in the private `WeakMap`; this is the only public teardown seam in the file
  - consume workflow-module definitions plus the shared discovery/document-generation/specialist seams through `resolveWorkflowDefinition(...)`, `discoverWorkflowCandidates(...)`, `WorkflowFormRuntime`, and `WorkflowStepResolutionRuntime`; do not read from legacy placeholder, managed-workflow, registry-fallback, or `.cline/workflow-config.yaml` surfaces

### `src/core/task/tools/handlers/SetWorkflowValuesToolHandler.ts`

Status: complete

- New file, whole file:
  - treat this row as the only authoritative implementation contract for this file during Foundational Build. Do not inspect `SetWorkflowPlaceholdersToolHandler.ts` or any other legacy workflow handler to infer behavior for this file.
  - import exactly:
    - `type ToolUse` from `@core/assistant-message`
    - `formatResponse` from `@core/prompts/responses`
    - `type WorkflowValues` from `@/core/task/workflow-runtime/types`
    - `ClineDefaultTool` from `@/shared/tools`
    - `type ToolResponse` from `../../index`
    - `type IPartialBlockHandler`, `type IToolHandler` from `../ToolExecutorCoordinator`
    - `type TaskConfig` from `../types/TaskConfig`
    - `type StronglyTypedUIHelpers` from `../types/UIHelpers`
  - implement exactly one exported class, `SetWorkflowValuesToolHandler`, as `IToolHandler, IPartialBlockHandler` with `readonly name = ClineDefaultTool.SET_WORKFLOW_VALUES`; do not export any additional types, helper functions, or constants from this file
  - add exactly one file-local input helper that reads `(block.params as Record<string, unknown>).values` and returns `WorkflowValues | undefined` using these validation rules only:
    - accept only a non-null, non-array plain object with at least one own property
    - accept only entries whose values are strings
    - preserve accepted string values exactly as provided; do not trim, normalize, path-resolve, or coerce them in this file
    - if the shape is invalid, any property value is non-string, or the object is empty, return `undefined`
    - do not preserve legacy JSON-string parsing compatibility
  - implement `getDescription(block)` exactly as:
    - parse values through the helper above
    - if valid keys exist, return ``[${block.name} ${keys.join(", ")}]``
    - otherwise return ``[${block.name}]``
  - implement `handlePartialBlock(block, uiHelpers)` exactly as:
    - parse values through the helper above
    - if the helper returns `undefined`, do nothing
    - otherwise compute `keys = Object.keys(values)` and call `await uiHelpers.say("tool", JSON.stringify({ tool: "setWorkflowValues", values: keys }), undefined, undefined, true)`
  - implement `execute(config, block)` exactly as:
    - parse values through the helper above
    - if the helper returns `undefined`, increment `config.taskState.consecutiveMistakeCount` and return `formatResponse.toolError("Missing required parameter 'values'. Provide a non-empty object whose property values are strings.")`
    - otherwise compute `keys = Object.keys(values)`
    - if `config.isSubagentExecution !== true`, call `await config.callbacks.say("tool", JSON.stringify({ tool: "setWorkflowValues", values: keys }), undefined, undefined, false)` before the runtime call
    - call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values })` and use only that result to decide success versus no-op
    - on runtime throw, increment `config.taskState.consecutiveMistakeCount` and return `formatResponse.toolError(error instanceof Error ? error.message : String(error))`
    - on successful runtime completion, set `config.taskState.consecutiveMistakeCount = 0`
  - build the result text from the runtime return exactly as follows:
    - let `changedKeys = Object.keys(result.changedValues)`
    - let `unchangedKeys = Object.keys(result.unchangedValues)`
    - if `changedKeys.length === 0`, let `unchangedSummary = unchangedKeys.length > 0 ? unchangedKeys.join(", ") : keys.join(", ")` and return `formatResponse.toolResult(\`No workflow values changed. Existing stored values already matched the requested values: ${unchangedSummary}. Do not call set_workflow_values again unless one of those values changes.\`)`
    - if `changedKeys.length > 0`, let `unchangedSuffix = unchangedKeys.length > 0 ? \` Unchanged existing values: ${unchangedKeys.join(", ")}.\` : ""` and return `formatResponse.toolResult(\`Stored ${changedKeys.length} workflow value${changedKeys.length === 1 ? "" : "s"}: ${changedKeys.join(", ")}.${unchangedSuffix}\`.trim())`
  - keep handler-side state changes minimal: touch only `config.taskState.consecutiveMistakeCount`, the non-subagent preview `say(...)` call, and the delegated `workflowRuntime.applyWorkflowValueWrites(...)` call
  - do not read or mutate any workflow task-state carrier directly from this file beyond `consecutiveMistakeCount`
  - do not read or write task metadata, focus-chain state, placeholder state, managed-workflow state, deterministic-placeholder state, `.cline/workflow-config.yaml`, or any artifact-path normalization logic from this file
  - changed/unchanged classification, active-step permission enforcement, and any runtime-owned normalization belong only to `config.workflowRuntime.applyWorkflowValueWrites(...)`; do not re-implement them here

### `src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`

Status: complete

- New file, whole file:
  - treat this row as the only authoritative implementation contract for this file during Foundational Build. Do not inspect legacy document builders or placeholder-era workflow handlers to infer behavior for this file.
  - save the new file at exactly `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildWorkflowDocumentToolHandler.ts`
  - import exactly:
    - `type ToolUse` from `@core/assistant-message`
    - `formatResponse` from `@core/prompts/responses`
    - `getWorkspaceBasename` from `@core/workspace`
    - `getReadablePath`, `isLocatedInWorkspace` from `@utils/path`
    - `fs` from `fs/promises`
    - `path` from `path`
    - `PreToolUseHookCancellationError` from `@core/hooks/PreToolUseHookCancellationError`
    - `type WorkflowValues` from `@/core/task/workflow-runtime/types`
    - `ClineDefaultTool` from `@/shared/tools`
    - `getBackendWorkflowToolContract` from `../backendWorkflowToolContracts`
    - `type ToolResponse` from `../../index`
    - `showNotificationForApproval` from `../../utils`
    - `type IPartialBlockHandler`, `type IToolHandler` from `../ToolExecutorCoordinator`
    - `type TaskConfig` from `../types/TaskConfig`
    - `type StronglyTypedUIHelpers` from `../types/UIHelpers`
    - `ToolResultUtils` from `../utils/ToolResultUtils`
  - implement exactly one exported class, `BuildWorkflowDocumentToolHandler`, as `IToolHandler, IPartialBlockHandler` with `readonly name = ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`; do not export any additional types, helper functions, or constants from this file
  - the class method signatures must be exactly:
    - `getDescription(block: ToolUse): string`
    - `async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void>`
    - `async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse>`
  - add exactly two file-local helpers and no others:
    - one `parseRequest(block)` helper that reads `block.params` and returns `{ artifactId: string; destinationPath: string; content: string; workflowValueWrites?: WorkflowValues } | undefined` using these rules only:
      - require non-empty strings for `artifact_id`, `destination_path`, and `content`
      - accept optional `workflow_value_writes` only when it is a non-null, non-array plain object whose property values are strings
      - preserve all accepted string values exactly as provided; do not trim `content`, normalize paths, or rewrite workflow values in this file
      - if any required field is missing/empty or `workflow_value_writes` is invalid, return `undefined`
    - one `atomicReplaceTextFile(filePath, content)` helper identical in behavior to the existing shared pattern used by other write handlers:
      - create the parent directory with `fs.mkdir(..., { recursive: true })`
      - write to a temp file in the same directory
      - rename the temp file over the destination
      - attempt temp-file cleanup on failure
  - at the start of both `handlePartialBlock(...)` and `execute(...)`, call `getBackendWorkflowToolContract(ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT)` and, if it returns `undefined`, treat that as a hard error; in `execute(...)` return `formatResponse.toolError("Backend workflow tool contract missing for build_workflow_document.")`
  - implement `getDescription(block)` exactly as:
    - parse the request through the helper above
    - if parsing succeeds, return ``[${block.name} ${request.artifactId}]``
    - otherwise return ``[${block.name}]``
  - implement `handlePartialBlock(block, uiHelpers)` exactly as:
    - ensure the backend contract exists as described above
    - parse the request through the helper above
    - if parsing fails, do nothing
    - otherwise call `await uiHelpers.say("tool", JSON.stringify({ tool: "buildWorkflowDocument", artifactId: request.artifactId, destinationPath: request.destinationPath }), undefined, undefined, true)`
  - implement `execute(config, block)` exactly as:
    - ensure the backend contract exists as described above
    - parse the request through the helper above
    - if parsing fails, increment `config.taskState.consecutiveMistakeCount` and return `formatResponse.toolError("Missing required parameters. Provide non-empty string values for 'artifact_id', 'destination_path', and 'content'. Optional 'workflow_value_writes' must be an object whose property values are strings.")`
    - otherwise bind the parsed request to local variables `artifactId`, `destinationPath`, `content`, and `workflowValueWrites`
    - keep all workflow resolution out of this file: do not inspect placeholder state, managed-workflow state, workflow markdown, BMAD template files, or `.cline/workflow-config.yaml`, and do not resolve artifact selection, project subfolder, naming, numbering, or destination path here
  - before any approval or write attempt in `execute(...)`, read the current file content with `fs.readFile(destinationPath, "utf8")`:
    - if the file does not exist with `ENOENT`, treat the prior content as `undefined`
    - rethrow any other read error through the normal tool-error path
    - let `documentWouldChange = priorContent !== content`
  - build the full preview/approval message exactly as:
    - `JSON.stringify({ tool: "buildWorkflowDocument", path: getReadablePath(config.cwd, destinationPath), content: \`Artifact: ${artifactId}\`, operationIsLocatedInWorkspace: await isLocatedInWorkspace(destinationPath) })`
  - approval flow must be exactly:
    - `shouldAutoApprove = config.isSubagentExecution || (await config.callbacks.shouldAutoApproveToolWithPath(block.name, destinationPath))`
    - if auto-approved and not subagent execution, first call `await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")`, then emit the full preview with `config.callbacks.say("tool", completeMessage, undefined, undefined, false)`
    - otherwise show the approval notification with `showNotificationForApproval(\`Cline wants to build ${getWorkspaceBasename(destinationPath, "BuildWorkflowDocument.notification")}\`, config.autoApprovalSettings.enableNotifications)`
    - remove the partial tool say with exactly `await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")`
    - call `ToolResultUtils.askApprovalAndPushFeedback("tool", completeMessage, config)`
    - if approval is denied, return `formatResponse.toolDenied()`
  - pre-tool hook flow must match the existing shared write-handler pattern exactly:
    - dynamically import `../utils/ToolHookUtils`
    - call `await ToolHookUtils.runPreToolUseIfEnabled(config, block)`
    - if that throws `PreToolUseHookCancellationError`, return `formatResponse.toolDenied()`
    - otherwise rethrow unexpected hook errors to the normal error path
  - document/writeback execution flow must be exactly:
    - if `documentWouldChange === true`, call `atomicReplaceTextFile(destinationPath, content)`
    - if `workflowValueWrites` is present, call `await config.workflowRuntime.applyWorkflowValueWrites({ taskState: config.taskState, values: workflowValueWrites })`
    - derive `changedWorkflowValueKeys = workflowWriteResult ? Object.keys(workflowWriteResult.changedValues) : []`
    - derive `unchangedWorkflowValueKeys = workflowWriteResult ? Object.keys(workflowWriteResult.unchangedValues) : []`
    - if `documentWouldChange === true`, set `config.taskState.didEditFile = true` and invalidate the file read cache with `config.taskState.fileReadCache.delete(destinationPath.toLowerCase())`
    - on successful completion, set `config.taskState.consecutiveMistakeCount = 0`
  - the result payload must be exactly one of these two JSON strings wrapped in `formatResponse.toolResult(...)`:
    - no-op result when `documentWouldChange === false` and `changedWorkflowValueKeys.length === 0`:
      - `JSON.stringify({ persisted: false, artifact_id: artifactId, destination_path: destinationPath, document_updated: false, workflow_value_writes_applied: false, reason: "Destination already contained the requested content and no workflow values changed." })`
    - persisted result otherwise:
      - `JSON.stringify({ persisted: true, artifact_id: artifactId, destination_path: destinationPath, document_updated: documentWouldChange, workflow_value_writes_applied: changedWorkflowValueKeys.length > 0, changed_workflow_value_keys: changedWorkflowValueKeys, unchanged_workflow_value_keys: unchangedWorkflowValueKeys })`
  - on any thrown error, increment `config.taskState.consecutiveMistakeCount` and return `formatResponse.toolError(error instanceof Error ? error.message : String(error))`
  - do not record placeholder write proofs, do not mutate legacy workflow/task-state carriers directly, and do not add per-artifact-family branches in this file


## Phase 3: Executor Plumbing And Core Caller Integration

### `src/core/task/tools/utils/ToolConstants.ts`

Status: complete

- Lines `8`-`33`: update `TASK_CONFIG_KEYS` so runtime `TaskConfig` validation enforces the new shared workflow runtime contract. Insert exactly one new string entry, `"workflowRuntime"`, immediately before `"coordinator"` in the `TASK_CONFIG_KEYS` array. Leave `TASK_SERVICES_KEYS`, `TASK_CALLBACKS_KEYS`, the surrounding comments, and the derived key-type exports unchanged.

### `src/core/task/tools/ToolExecutorCoordinator.ts`

Status: complete

- Lines `1`-`56` and `104`-`162`: rewrite only the workflow-related handler imports and `toolHandlersMap` entries so this file reaches the foundational handler-registry end state without changing any coordinator mechanics.
  - in the handler import block, delete exactly these imports because their registrations are being removed or retired in this phase:
    - `BuildEpicDeliverySpecToolHandler`
    - `BuildEpicsDocumentToolHandler`
    - `BuildReviewDiffOutputToolHandler`
    - `BuildStoryDocumentToolHandler`
    - `BuildTechSpecDocumentToolHandler`
    - `ContinueBrainstormingSessionToolHandler`
    - `SetWorkflowPlaceholdersToolHandler`
  - in the handler import block, add exactly these imports:
    - `BuildWorkflowDocumentToolHandler` from `./handlers/BuildWorkflowDocumentToolHandler`
    - `SetWorkflowValuesToolHandler` from `./handlers/SetWorkflowValuesToolHandler`
  - do not change any other imports in this file
  - in `toolHandlersMap`, replace the retired workflow-value registration exactly as:
    - delete `[ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS]: (_v: ToolValidator) => new SetWorkflowPlaceholdersToolHandler(),`
    - add `[ClineDefaultTool.SET_WORKFLOW_VALUES]: (_v: ToolValidator) => new SetWorkflowValuesToolHandler(),`
  - in `toolHandlersMap`, add exactly one new document-builder registration:
    - `[ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT]: (_v: ToolValidator) => new BuildWorkflowDocumentToolHandler(),`
  - keep `[ClineDefaultTool.BUILD_REVIEW_INPUT]: (_v: ToolValidator) => new BuildReviewInputToolHandler(),` unchanged
  - delete exactly these obsolete map entries because those tool ids are no longer part of the foundational registry surface:
    - `[ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT]: (_v: ToolValidator) => new BuildReviewDiffOutputToolHandler(),`
    - `[ClineDefaultTool.BUILD_EPICS_DOCUMENT]: (_v: ToolValidator) => new BuildEpicsDocumentToolHandler(),`
    - `[ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC]: (_v: ToolValidator) => new BuildEpicDeliverySpecToolHandler(),`
    - `[ClineDefaultTool.BUILD_STORY_DOCUMENT]: (_v: ToolValidator) => new BuildStoryDocumentToolHandler(),`
    - `[ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT]: (_v: ToolValidator) => new BuildTechSpecDocumentToolHandler(),`
  - change the brainstorming continuation registration only, from a live handler to an intentionally deferred registration:
    - replace `[ClineDefaultTool.CONTINUE_BRAINSTORMING_SESSION]: (_v: ToolValidator) => new ContinueBrainstormingSessionToolHandler(),`
    - with `[ClineDefaultTool.CONTINUE_BRAINSTORMING_SESSION]: (_v: ToolValidator) => undefined,`
  - leave the rest of `toolHandlersMap` unchanged, including `BUILD_REVIEW_INPUT` and the other deferred workflow/module registrations that already return `undefined`
  - do not change `IToolHandler`, `IPartialBlockHandler`, `IFullyManagedTool`, `SharedToolHandler`, `register(...)`, `registerByName(...)`, `has(...)`, `getHandler(...)`, or `execute(...)`

### `src/core/task/ToolExecutor.ts`

Status: complete

- Lines `1`-`35`, `71`-`143`, and `538`-`808`: update this file in one pass so `ToolExecutor` carries and forwards the shared workflow runtime and stops using the retired pre/post-tool `task_progress` wrapper seam. This row is the only implementation authority for this file during this step; do not inspect adjacent workflow/focus-chain files to infer extra behavior.
  - in the import block:
    - add `import { WorkflowRuntime } from "./workflow-runtime/WorkflowRuntime"`
    - delete `applyPostToolTaskProgressUpdate` and `applyPreToolTaskProgressUpdate` from the `./focus-chain/updateFromToolResponse` import
    - do not change any other imports
  - in the constructor parameter list, add exactly one new stored dependency:
    - `private workflowRuntime: WorkflowRuntime,`
    - insert it immediately after `private stateManager: StateManager,`
    - do not reorder any other constructor parameters
  - in `asToolConfig()`, add exactly one new property to the `config` object:
    - `workflowRuntime: this.workflowRuntime,`
    - insert it immediately before `coordinator: this.coordinator,`
    - leave every other `TaskConfig` property assignment unchanged
  - leave `registerToolHandlers()` unchanged as the generic `toolUseNames` registration loop; do not add workflow-specific registration logic to this file
  - in `handleCompleteBlock(...)`, delete the retired pre-tool wrapper path exactly as follows:
    - delete `let skipPostExecutionFocusChainUpdate = false`
    - delete the entire block that starts with `const preToolTaskProgressUpdate = await applyPreToolTaskProgressUpdate({`
    - delete that block through its early-return path ending at `return { status: "skipped", emittedToolResult }`
    - after deletion, the code must proceed directly from the final abort check to `Logger.info(...starting tool...)`
  - in `handleCompleteBlock(...)`, delete the retired post-tool wrapper path exactly as follows:
    - delete the entire block that starts with `const postToolTaskProgressUpdate = await applyPostToolTaskProgressUpdate({`
    - delete that block through the conditional feedback push ending at `feedbackTarget.push({`
    - after deletion, the method must return `return { status: "executed", emittedToolResult }` immediately after the existing `if (shouldCancelAfterHook) { ... }` block
  - do not build, pass, or preserve any placeholder-era `toolContext` object in this file
  - leave the rest of the core tool execution flow unchanged:
    - rejection and budget checks
    - plan-mode restriction handling
    - browser close behavior
    - partial-block handling
    - actual tool execution through `this.coordinator.execute(...)`
    - governed response-tool failure handling
    - tool-result emission through `pushToolResult(...)`
    - PostToolUse hook execution
    - logging
  - do not change any other method signatures in this file
  - do not edit constructor call sites in other files during this step; if the added `workflowRuntime` constructor dependency creates downstream compile errors elsewhere, those are for later rows

### `src/shared/workflow-progress-request.ts`

Status: complete

- Lines `1`-`76`: rewrite this file in one pass so it remains only the generic shared helper for the surviving `workflow_progress_request` capability. This row is the only implementation authority for this file during this step; do not inspect prompt, handler, or workflow files to infer a new contract.
  - delete the exported constant `WORKFLOW_PROGRESS_REQUEST_WORKFLOW_STEPS`
  - delete the local helper `normalizeWorkflowProgressRequestWorkflowName(...)`
  - delete the exported helper `isWorkflowProgressRequestWorkflowName(...)`
  - delete the exported helper `isWorkflowProgressRequestStep(...)`
  - keep `WORKFLOW_PROGRESS_REQUEST_QUESTION` exactly unchanged
  - keep `WORKFLOW_PROGRESS_REQUEST_OPTIONS` exactly unchanged
  - keep the exported function name `shouldExposeWorkflowProgressRequest(...)`, but replace its parameter shape exactly with:
    - `({ workflowProgressRequestAllowed, yoloModeToggled }: { workflowProgressRequestAllowed?: boolean; yoloModeToggled?: boolean }): boolean`
  - implement `shouldExposeWorkflowProgressRequest(...)` exactly as:
    - if `yoloModeToggled === true`, return `false`
    - otherwise return `workflowProgressRequestAllowed === true`
  - after the rewrite, this file must export only:
    - `WORKFLOW_PROGRESS_REQUEST_QUESTION`
    - `WORKFLOW_PROGRESS_REQUEST_OPTIONS`
    - `shouldExposeWorkflowProgressRequest(...)`
  - do not leave any `.md` filename normalization, workflow-name allowlists, step allowlists, or workflow-specific branching in this file
  - do not add any replacement helper exports beyond the three surviving exports above

### `src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`

Status: complete

- Lines `1`-`16` and `40`-`103`: rewrite this file in one pass so `WorkflowProgressRequestToolHandler` remains only the generic interactive approval handler for the surviving `workflow_progress_request` response-tool capability. This row is the only implementation authority for this file during this step; do not inspect focus-chain, placeholder-workflow, or runtime-adjacent files to infer behavior.
  - in the import block:
    - delete `FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL` from `@shared/focus-chain-utils`
    - delete `isWorkflowProgressRequestWorkflowName` from the `@shared/workflow-progress-request` import
    - keep `WORKFLOW_PROGRESS_REQUEST_OPTIONS` and `WORKFLOW_PROGRESS_REQUEST_QUESTION` imported from `@shared/workflow-progress-request`
    - leave every other import unchanged
  - leave `responseToolRuntime`, the class name, `readonly name`, `getDescription(...)`, and `handlePartialBlock(...)` unchanged
  - in `execute(config, _block)`, keep the existing YOLO rejection exactly unchanged, including its current error string
  - replace both legacy gating branches:
    - `if (!isWorkflowProgressRequestWorkflowName(config.taskState.activePlaceholderWorkflowSource?.name)) { ... }`
    - `if (!config.taskState.currentFocusChainChecklist) { ... }`
    - with exactly one runtime gate:
      - `if (!config.workflowRuntime.isWorkflowProgressRequestAllowed({ taskState: config.taskState })) {`
      - `  return formatResponse.toolError("workflow_progress_request can only be used when the active workflow step allows progression approval.")`
      - `}`
  - keep the shared followup message payload exactly unchanged:
    - same `question`
    - same `options`
    - same `satisfies ClineAskQuestion`
  - keep `responseToolRuntime.prepareForResponseDelivery(...)`, `config.callbacks.ask("followup", ...)`, followup-message selection persistence through `findLast(...)`, `config.messageState.saveClineMessagesAndUpdateHistory()`, `user_feedback` fallback, `responseToolRuntime.queueFollowup(...)`, and `responseToolRuntime.finalizeSuccess(...)` unchanged
  - inside the `if (text === "Yes" || text === "No") { ... }` branch, replace the legacy focus-chain advancement block with exactly this runtime handoff:
    - `const nextAction = await config.workflowRuntime.submitWorkflowProgressRequest({`
    - `  taskState: config.taskState,`
    - `  approved: text === "Yes",`
    - `})`
    - `if (text === "Yes" && nextAction.kind === "no_op") {`
    - `  return formatResponse.toolError("workflow_progress_request could not advance the active workflow step.")`
    - `}`
  - do not read `config.taskState.activePlaceholderWorkflowSource`
  - do not read `config.taskState.currentFocusChainChecklist`
  - do not call `config.callbacks.updateFCListFromToolResponse(...)`
  - do not reference `FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL`
  - do not add any placeholder-workflow names, step allowlists, focus-chain sentinels, or workflow-specific branching to this file beyond the runtime gate and runtime submission call above

### `src/core/task/index.ts`

- Lines `42`-`70`, `213`-`320`, and `770`-`876`: replace legacy workflow imports, exported helper seams, and retained runtime fields with the completed foundational `WorkflowRuntime` and `WorkflowRegistry` seams.
  - remove imports of `applyDeterministicPlaceholderProgression`, `type DeterministicPlaceholderToolContext`, `isDeterministicPlaceholderWorkflowSupported`, `getWorkflowFormResolverDefinition(...)`, `WorkflowFormRuntime`, `resolveWorkflowFormSlashCommandStartCandidate(...)`, `resolveWorkflowFormWorkflowStepCandidate(...)`, `getWorkflowStepResolutionDefinition(...)`, `getWorkflowStepResolutionTriggerDefinition(...)`, placeholder-workflow step-detail helpers, and `createWorkflowSkillMetadata(...)` / `resolveAvailableWorkflows(...)`
  - add imports of `WorkflowRuntime` from `@/core/task/workflow-runtime/WorkflowRuntime`, `type WorkflowNextAction` from `@/core/task/workflow-runtime/types`, and `resolveWorkflowDefinition(...)` plus `getWorkflowSkillMetadata()` from `@/core/task/workflow-runtime/WorkflowRegistry`
  - replace `type ClineWorkflowForm` with `type WorkflowForm` and replace `type ClineWorkflowStartCard` with `type WorkflowStartCard` in the `@shared/ExtensionMessage` import list and in `renderWorkflowFormMessage(...)` / `renderWorkflowStartCardMessage(...)`; leave `type ClineWorkflowStepResolutionStatus` unchanged
  - keep `WorkflowStepResolutionRuntime` imported only as a generic payload builder for `renderWorkflowStepResolutionStatusMessage(...)` in the runtime-next-action consumer; do not keep it as a class-level orchestration dependency
  - rewrite `shouldIncludePersistentPromptContext(...)` so its signature is exactly `taskState: Pick<TaskState, "activeWorkflowName">` and it returns exactly `!!taskState.activeWorkflowName`
  - leave `appendPromptInjectionBlocksToSystemPrompt(...)` unchanged
  - delete the exported helper seams `isActiveDeterministicPlaceholderWorkflowEnabled(...)`, `resolveWorkflowFormInterceptionCandidate(...)`, `resolveWorkflowStepResolutionInterceptionCandidate(...)`, and `shouldInterceptWorkflowFormBeforeApiTurn(...)`; do not preserve any registry-driven workflow interception/export surface outside `WorkflowRuntime`
  - replace the class fields `workflowFormRuntime`, `workflowStepResolutionRuntime`, and `pendingWorkflowFormOutcome` with exactly one field `private workflowRuntime: WorkflowRuntime`
  - in the constructor, instantiate exactly `this.workflowRuntime = new WorkflowRuntime({ cwd: this.cwd })`
  - in the `this.toolExecutor = new ToolExecutor(...)` constructor call, pass the shared runtime instance as a positional argument exactly once:
    - insert `this.workflowRuntime`
    - place it immediately after `this.stateManager`
    - do not reorder any other `ToolExecutor` constructor arguments
- Lines `1388`-`1545`, `1838`-`2268`, `2428`-`2520`, `2639`-`2795`, `3867`-`3927`, and `5521`-`5529`: collapse the live workflow control path to thin `WorkflowRuntime` delegation and specialist rendering only.
  - replace `handleWorkflowStartCardSubmission(...)` so it no longer checks `WorkflowStartCardAction.CONTINUE` and no longer clears start-card state directly; it must:
    - return early only when `this.taskState.activeWorkflowStartCardSession` is absent or `request.sessionId` does not match the active session
    - call `await this.workflowRuntime.submitWorkflowStartCard({ taskState: this.taskState, request })`
    - immediately call the new shared workflow-metadata persistence helper described below
    - not call `clearWorkflowStartCardSession()`
  - replace `handleWorkflowFormSubmission(...)` so it no longer calls `this.workflowFormRuntime.handleSubmission(...)` and no longer switches on `WorkflowFormRuntimeOutcome`; it must:
    - return early only when `this.taskState.activeWorkflowFormSession` is absent or `request.sessionId` does not match the active session
    - call `await this.workflowRuntime.submitWorkflowForm({ taskState: this.taskState, request })`
    - immediately call the new shared workflow-metadata persistence helper described below
    - not read or write `resolverId`
    - not mutate `suppressedWorkflowFormResolverIds` locally
    - not use `pendingWorkflowFormOutcome`
  - delete `persistWorkflowStartCardSession()`, `clearWorkflowStartCardSession()`, `persistWorkflowFormSession()`, `clearWorkflowFormSession()`, `persistWorkflowStepResolutionSession()`, and `clearWorkflowStepResolutionSession()`
  - replace those six helpers with exactly one helper `persistWorkflowRuntimeMetadata()` that writes only the surviving workflow/runtime metadata fields:
    - `taskMetadata.activeWorkflowName = this.taskState.activeWorkflowName`
    - `taskMetadata.activeWorkflowSession = this.workflowRuntime.getPersistedSession({ taskState: this.taskState })`
    - `taskMetadata.activeStoryTaskId = this.taskState.activeStoryTaskId`
    - `taskMetadata.activeStorySubtaskIds = this.taskState.activeStorySubtaskIds`
    - `taskMetadata.lastPromptedStoryTaskKey = this.taskState.lastPromptedStoryTaskKey`
    - `taskMetadata.activeWorkflowStartCardSession = this.taskState.activeWorkflowStartCardSession`
    - `taskMetadata.activeWorkflowFormSession = this.taskState.activeWorkflowFormSession`
    - `taskMetadata.activeWorkflowStepResolutionSession = this.taskState.activeWorkflowStepResolutionSession`
    - `taskMetadata.suppressedWorkflowStepResolutionDefinitionIds = this.taskState.suppressedWorkflowStepResolutionDefinitionIds`
    - `taskMetadata.suppressedWorkflowFormResolverIds = this.taskState.suppressedWorkflowFormResolverIds`
  - do not persist any removed placeholder-era or managed-workflow metadata fields in this helper
  - add one new private helper `consumeWorkflowNextAction(nextAction?: WorkflowNextAction): Promise<void>` and make it the only workflow-specific orchestration loop that remains in `task/index.ts`
  - change `applyPersistentSlashCommandAction(...)` to return `Promise<WorkflowNextAction | undefined>`
  - `consumeWorkflowNextAction(...)` must behave exactly as follows:
    - if `nextAction` is absent, return immediately
    - while `this.taskState.abort !== true`:
      - if `nextAction.kind === "no_op"` or `nextAction.kind === "project_prompt"`, return
      - if `nextAction.kind === "complete_workflow"`, call `await this.persistWorkflowRuntimeMetadata()` and return
      - if `nextAction.kind === "render_workflow_start_card"`:
        - call `await this.persistWorkflowRuntimeMetadata()`
        - build the payload only with `buildWorkflowStartCardPayload(nextAction.startCardSession)`
        - call `await this.renderWorkflowStartCardMessage(payload)`
        - `await pWaitFor(() => this.taskState.activeWorkflowStartCardSession !== nextAction.startCardSession || this.taskState.abort, { interval: 100 })`
        - if aborted, return
        - set `nextAction = await this.workflowRuntime.resolveNextAction({ taskState: this.taskState })` and continue the loop
      - if `nextAction.kind === "render_workflow_form"`:
        - call `await this.persistWorkflowRuntimeMetadata()`
        - call `await this.renderWorkflowFormMessage(nextAction.payload)`
        - `await pWaitFor(() => this.taskState.activeWorkflowFormSession !== nextAction.formSession || this.taskState.abort, { interval: 100 })`
        - if aborted, return
        - set `nextAction = await this.workflowRuntime.resolveNextAction({ taskState: this.taskState })` and continue the loop
      - if `nextAction.kind === "run_deterministic_operation"`:
        - if `nextAction.stepResolutionSession` is present and `this.taskState.activeWorkflowName` resolves through `resolveWorkflowDefinition(...)`, instantiate `new WorkflowStepResolutionRuntime(definition.stepResolutionDefinitions ?? {})` locally and render the pending status payload with `renderWorkflowStepResolutionStatusMessage(...)`
        - capture `const previousUserMessageContentLength = this.taskState.userMessageContent.length`
        - execute the deterministic tool only through the existing normal tool path:
          - `await this.toolExecutor.executeTool({`
          - `  type: "tool_use",`
          - `  name: nextAction.toolRequest.toolName,`
          - `  params: nextAction.toolRequest.toolParams as any,`
          - `  partial: false,`
          - `  isNativeToolCall: true,`
          - `  call_id: nextAction.stepResolutionSession ? \`workflow_step_resolution_\${nextAction.stepResolutionSession.sessionId}\` : \`workflow_form_\${this.taskId}\`,`
          - `})`
        - do not call `syncDeterministicProgressionAfterWorkflowFormTool(...)`, `applyDeterministicPlaceholderProgression(...)`, `buildPlaceholderWorkflowChecklist(...)`, or any other placeholder-era checklist progression helper here; `WorkflowRuntime.handleDeterministicToolResult(...)` is now the only post-tool workflow progression seam
        - compute `const toolResultText = this.getWorkflowFormToolResultText(previousUserMessageContentLength)`
        - set `nextAction = await this.workflowRuntime.handleDeterministicToolResult({ taskState: this.taskState, toolResultText })`
        - call `await this.persistWorkflowRuntimeMetadata()`
        - continue the loop
  - delete `syncDeterministicProgressionAfterWorkflowFormTool(...)`, `updatePlaceholderWorkflowProgressAndMaybeRunCompletion(...)`, `maybeFinalizeCompletedPlaceholderWorkflow(...)`, `getWorkflowFormOperationErrorMessage(...)`, `executeWorkflowFormOperationAndSync(...)`, `executeWorkflowStepResolutionToolAndSync(...)`, `maybeResolveWorkflowStartCardBeforeApiTurn(...)`, `maybeResolveWorkflowFormBeforeApiTurn(...)`, and `maybeResolveWorkflowStepResolutionBeforeApiTurn(...)`
  - replace `applyPersistentSlashCommandAction(...)` so it handles only the foundational slash-command action `{ type: "activate_workflow"; workflowName; invocationSource: "slash_command" }`
  - inside `applyPersistentSlashCommandAction(...)`:
    - delete the managed-workflow activation branch entirely
    - delete the placeholder-workflow activation branch entirely
    - resolve the definition with `resolveWorkflowDefinition(action.workflowName)`
    - if the definition is absent, return `undefined`
    - otherwise call `const nextAction = await this.workflowRuntime.activateWorkflow({ taskState: this.taskState, workflow: definition })`
    - call `await this.persistWorkflowRuntimeMetadata()`
    - return that `nextAction`
  - at the main request-loop callsite around lines `5521`-`5529`, replace the three legacy pre-turn calls:
    - `maybeResolveWorkflowStartCardBeforeApiTurn(...)`
    - `maybeResolveWorkflowFormBeforeApiTurn(...)`
    - `maybeResolveWorkflowStepResolutionBeforeApiTurn()`
    - plus `buildPlaceholderWorkflowActivationInstructions(...)`
    - with exactly:
      - `const workflowAction = await this.applyPersistentSlashCommandAction(persistentSlashCommandAction)`
      - `await this.consumeWorkflowNextAction(workflowAction ?? (await this.workflowRuntime.resolveNextAction({ taskState: this.taskState })))`
    - do not append placeholder-workflow activation text to `processedUserContent`
  - replace `restoreBmadStateFromMetadata()` with runtime-owned workflow restore behavior:
    - keep restoring `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey`
    - restore `this.taskState.activeWorkflowName = metadata.activeWorkflowName`
    - call `await this.workflowRuntime.restorePersistedSession({ taskState: this.taskState, persistedSession: metadata.activeWorkflowSession })`
    - restore `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, `activeWorkflowStepResolutionSession`, `suppressedWorkflowStepResolutionDefinitionIds`, and `suppressedWorkflowFormResolverIds` only from the surviving metadata fields
    - if `metadata.activeWorkflowName` exists but `metadata.activeWorkflowSession` is absent, clear `metadata.activeWorkflowName` and save the metadata once
    - do not read any removed placeholder-era or managed-workflow metadata fields
  - after `await this.restoreBmadStateFromMetadata()` in the resume path, delete the live follow-on calls to `refreshManagedWorkflowChecklistProjection()` and `restorePlaceholderWorkflowChecklistFromDiskIfNeeded()`; the restored `WorkflowRuntime` session now owns `currentFocusChainChecklist` projection already
  - delete `restorePlaceholderWorkflowChecklistFromDiskIfNeeded()`, `teardownCompletedPlaceholderWorkflow()`, `persistClearedPlaceholderWorkflowMetadata()`, `persistLastPromptedPlaceholderWorkflowChecklistLabel()`, `clearLastPromptedPlaceholderWorkflowChecklistLabelForContextCompaction()`, `refreshManagedWorkflowChecklistProjection()`, `refreshPlaceholderWorkflowChecklistProjection()`, `clearManagedWorkflowChecklistProjection()`, and `buildPlaceholderWorkflowActivationInstructions(...)`
  - remove the direct assignment `this.taskState.activeWorkflowJustStarted = false`; this file must stop mutating the deleted task-state field
  - at the `focus_chain_decision` fallback diagnostics payload around lines `4608`-`4618`, replace the legacy property `placeholderWorkflowActive: false` with exactly `workflowActive: false` so this file matches the renamed `FocusChainInstructionDecision` contract from `src/core/task/focus-chain/index.ts`; do not leave any fallback diagnostics payload in this file using the placeholder-era property name
- Lines `2593`-`2607` and `3867`-`3927`: remove fragmented workflow prompt assembly and legacy workflow skill discovery.
  - delete `buildWorkflowPromptInstructions(...)` entirely
  - replace `resolveAvailableWorkflows(...)` plus `createWorkflowSkillMetadata(...)` with only `getWorkflowSkillMetadata()`
  - keep `discoverSkills(...)` and the existing non-workflow skill-toggle filtering unchanged
  - when `shouldIncludeBmadPromptContext` is true, call `this.mergePromptSkillEntries(availableSkills, getWorkflowSkillMetadata())`
  - delete `resolveActivePlaceholderWorkflowPromptContext(...)` and `isActiveDeterministicPlaceholderWorkflowEnabled(...)` usage from this block
  - build `const workflowPromptProjection = await this.workflowRuntime.buildTurnProjection({ taskState: this.taskState })`
  - in `promptContext`, set only the foundational workflow fields:
    - `activeWorkflowName: this.taskState.activeWorkflowName`
    - `activeWorkflowStepNumber: this.taskState.activeWorkflowSession?.activeStepNumber`
    - `workflowSystemInstructionsBlock: workflowPromptProjection.workflowSystemInstructionsBlock`
    - `workflowInputInstructionsBlock: workflowPromptProjection.workflowInputInstructionsBlock`
    - `workflowToolSchemaOverride: workflowPromptProjection.workflowToolSchemaOverride`
  - delete `activeWorkflowPersonaInstructions`, `activeWorkflowReminder`, `activeWorkflowSupportsPlaceholders`, `activePlaceholderWorkflowName`, `activeDeterministicPlaceholderWorkflowEnabled`, and `managedWorkflowActive` from this caller
  - do not source workflow prompt context from `activePlaceholderWorkflowSource?.name`, `managedWorkflowRun`, placeholder reminder lookups, or `.md`-suffix workflow-name assumptions
  - in `shouldSendFullPromptAssemblyForCurrentTurn(...)`, stop passing `activeWorkflowJustStarted`; the deleted task-state field must not be referenced in this file
  - in every context-compaction path that currently calls `clearLastPromptedPlaceholderWorkflowChecklistLabelForContextCompaction()`, delete that call and leave only `clearLastPromptedStoryTaskKeyForContextCompaction()`
  - in the non-compact prompt-input path around the old `previousPromptedChecklistLabel` bookkeeping, delete all placeholder-checklist-label tracking and persistence:
    - do not read `this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel`
    - do not compare `lastPromptedPlaceholderWorkflowChecklistLabel` in `didPromptStateChange`
    - do not call `persistLastPromptedPlaceholderWorkflowChecklistLabel()`
    - keep the surviving story-task prompt-state comparison and `persistActiveStoryTaskPromptState()` behavior only
- Lines `5425`-`5439`: update the `parseSlashCommands(...)` call to match the foundational slash-command contract.
  - remove `localWorkflowToggles` and `globalWorkflowToggles` from this caller
  - remove `cwd` from this caller
  - keep `ulid`, `focusChainSettings`, `useNativeToolCalls`, `providerInfo`, and the MCP prompt fetcher unchanged

### `src/core/task/tools/handlers/UseSkillToolHandler.ts`

Status: complete

- Lines `1`-`230`: rewrite this file in one pass so `use_skill` supports only two foundational behaviors: activating a shipped workflow through the shared runtime, or loading a generic skill without mutating workflow state. Treat this row as the only implementation contract for this file during this step; do not read adjacent workflow, slash-command, or legacy handler files to infer behavior.
  - in the import block:
    - delete `getTaskMetadata`, `saveTaskMetadata`, `activateManagedWorkflowInTaskState`, `activatePlaceholderWorkflowInTaskState`, `buildPlaceholderWorkflowChecklist`, and `resolveWorkflowByName(...)`
    - add `resolveWorkflowByUseSkillName` from `@/core/task/workflow-runtime/WorkflowRegistry`
    - leave `discoverSkills`, `getAvailableSkills`, `getSkillContent`, `telemetryService`, `ClineDefaultTool`, `TaskConfig`, and `StronglyTypedUIHelpers` unchanged
  - keep `getDescription(...)` unchanged
  - keep `handlePartialBlock(...)` unchanged
  - in `execute(config, block)`:
    - keep the missing-`skill_name` guard exactly unchanged
    - delete the workflow-toggle and remote-workflow resolution block entirely:
      - `localWorkflowToggles`
      - `globalWorkflowToggles`
      - `remoteWorkflowToggles`
      - `remoteConfigSettings`
      - `remoteWorkflows`
      - `resolveWorkflowByName(...)`
    - replace that block with exactly:
      - `const resolvedWorkflow = resolveWorkflowByUseSkillName(skillName)`
      - `const resolvedSkillName = resolvedWorkflow?.useSkillName ?? skillName`
    - keep the provider-resolution block exactly unchanged:
      - `const apiConfig = stateManager.getApiConfiguration()`
      - `const currentMode = stateManager.getGlobalSettingsKey("mode")`
      - `const provider = currentMode === "plan" ? apiConfig.planModeApiProvider : apiConfig.actModeApiProvider`
    - keep the non-subagent tool preview message unchanged:
      - `const message = JSON.stringify({ tool: "useSkill", path: skillName })`
      - `if (!config.isSubagentExecution) { await config.callbacks.say("tool", message, undefined, undefined, false) }`
  - delete the entire managed-workflow branch; there must be no remaining reads of `activateManagedWorkflowInTaskState(...)`, `managedWorkflowRun`, or task-metadata persistence in this file
  - replace the existing resolved-workflow branch with exactly one shipped-workflow activation path:
    - call `const nextAction = await config.workflowRuntime.activateWorkflow({ taskState: config.taskState, workflow: resolvedWorkflow })`
    - if `nextAction.kind === "no_op"`, return exactly `Error: Workflow "${skillName}" could not be activated.`
    - set `config.taskState.consecutiveMistakeCount = 0`
    - emit telemetry with exactly:
      - `skillName: resolvedWorkflow.useSkillName`
      - `skillSource: "global"`
      - `skillsAvailableGlobal: 0`
      - `skillsAvailableProject: 0`
      - `provider`
      - `modelId: config.api.getModel().id`
    - return exactly:
      - `# Workflow "${resolvedWorkflow.name}" is now active`
      - blank line
      - `The workflow started successfully. Continue using the workflow runtime state and follow any workflow UI or prompt instructions that appear next.`
      - blank line
      - `IMPORTANT: The workflow is now loaded. Do NOT call use_skill again for this task unless a later step explicitly requires a different workflow.`
    - do not persist task metadata in this branch
    - do not call `config.callbacks.updateFCListFromToolResponse(...)` in this branch
    - do not build checklist markdown in this branch
    - do not mutate workflow-owned task-state carriers directly in this branch, including `activeWorkflowName`, `activeWorkflowSession`, `currentFocusChainChecklist`, `activeWorkflowStartCardSession`, `activeWorkflowFormSession`, or `activeWorkflowStepResolutionSession`
  - keep the generic skill-loading path after the workflow branch, including:
    - `discoverSkills(config.cwd)`
    - `getAvailableSkills(...)`
    - skill-toggle filtering
    - the `availableSkills.length === 0` error
    - `getSkillContent(resolvedSkillName, availableSkills)`
    - the generic telemetry capture
    - the final generic skill instructions response text
  - in the generic skill-loading path, delete the direct workflow-state reset block entirely:
    - `config.taskState.activeWorkflowId = skillName`
    - `config.taskState.activePlaceholderWorkflowId = undefined`
    - `config.taskState.activePlaceholderWorkflowSource = undefined`
    - `config.taskState.activePlaceholderWorkflowStableValues = undefined`
    - `config.taskState.activePlaceholderWorkflowValues = undefined`
    - `config.taskState.activePlaceholderWorkflowDeterministicState = undefined`
    - `config.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined`
    - `config.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = []`
    - `config.taskState.activeWorkflowJustStarted = true`
    - loading a non-workflow skill must not mutate any workflow-related task-state fields in this file
  - after the rewrite, this file must have only these two workflow-facing behaviors:
    - shipped workflow activation delegated to `config.workflowRuntime.activateWorkflow(...)`
    - generic skill loading that leaves workflow state untouched

### `src/core/slash-commands/index.ts`

Status: complete

- Lines `1`-`276`: rewrite this file in one pass so slash-command workflow activation uses only shipped workflow definitions from the foundational runtime registry. Treat this row as the only implementation contract for this file during this step; do not read adjacent workflow, task, or legacy resolution files to infer behavior.
  - in the import block:
    - delete `ClineRulesToggles`
    - delete `GlobalInstructionsFile`
    - delete `StateManager`
    - delete `ActivePlaceholderWorkflowSource`
    - delete `buildActivePlaceholderWorkflowSource(...)`
    - delete `loadResolvedWorkflowContent(...)`
    - delete `resolveWorkflowByName(...)`
    - add `type WorkflowName` from `@/core/task/workflow-runtime/types`
    - add `resolveWorkflowBySlashCommand` from `@/core/task/workflow-runtime/WorkflowRegistry`
    - leave `ApiProviderInfo`, `McpPromptResponse`, `telemetryService`, `Logger`, `isNativeToolCallingConfig`, and the builtin command-response helpers unchanged
  - replace `PersistentSlashCommandAction` with exactly:
    - `export type PersistentSlashCommandAction = { type: "activate_workflow"; workflowName: WorkflowName; invocationSource: "slash_command" }`
    - do not preserve the `activate_managed_workflow` or `activate_placeholder_workflow` variants
  - replace the `parseSlashCommands(...)` signature exactly with:
    - `text: string`
    - `ulid: string`
    - `focusChainSettings?: { enabled: boolean }`
    - `enableNativeToolCalls?: boolean`
    - `providerInfo?: ApiProviderInfo`
    - `mcpPromptFetcher?: McpPromptFetcher`
    - remove `localWorkflowToggles`
    - remove `globalWorkflowToggles`
    - remove `cwd`
  - keep these parts of `parseSlashCommands(...)` exactly unchanged:
    - `SUPPORTED_DEFAULT_COMMANDS`
    - `willUseNativeTools`
    - `commandReplacements`
    - `tagPatterns`
    - `slashCommandInTextRegex`
    - `removeCommand(...)`
    - the outer tag-iteration structure
    - slash-command extraction through `slashMatch`, `bareCommandAtStartMatch`, `slashCommandName`, `bareCommandName`, and `commandName`
    - `removeMatchedCommand()`
    - builtin slash-command handling
    - MCP prompt handling
    - `formatMcpPromptResponse(...)`
  - in `parseSlashCommands(...)`, delete the entire legacy workflow-resolution block:
    - the `remoteWorkflowToggles` local
    - the `remoteWorkflows` local
    - the `try/catch` that reads `StateManager.get()`
    - the `resolveWorkflowByName(...)` call and all of its arguments
    - the managed-workflow activation return branch
    - the placeholder-workflow load/build/return branch
  - keep builtin slash-command precedence exactly as it already works in this file:
    - if `SUPPORTED_DEFAULT_COMMANDS.includes(commandName)`, preserve the existing builtin replacement path unchanged
    - do not let shipped workflows override builtin slash commands
  - keep MCP prompt handling exactly before shipped workflow activation:
    - if a valid MCP prompt command resolves, preserve the existing MCP prompt injection path unchanged
    - only fall through to workflow activation when the MCP prompt branch does not return
  - after the builtin and MCP prompt branches, add exactly one shipped-workflow activation branch:
    - `const resolvedWorkflow = resolveWorkflowBySlashCommand(commandName)`
    - if `resolvedWorkflow` is `undefined`, continue the loop exactly as the current file does when no command branch matches
    - require `slashMatch` for workflow activation; if `slashMatch` is absent, continue without returning
    - compute `const textWithoutSlashCommand = removeMatchedCommand()`
    - emit telemetry exactly as `telemetryService.captureSlashCommandUsed(ulid, commandName, "workflow")`
    - return exactly:
      - `processedText: textWithoutSlashCommand`
      - `needsClinerulesFileCheck: false`
      - `persistentSlashCommandAction: { type: "activate_workflow", workflowName: resolvedWorkflow.name, invocationSource: "slash_command" }`
    - do not load workflow markdown/content in this file
    - do not build an `ActivePlaceholderWorkflowSource` in this file
    - do not inspect workspace toggle state, remote config state, or filesystem paths in this file
  - keep the no-command fallback exactly unchanged:
    - `return { processedText: text, needsClinerulesFileCheck: false }`

### `src/core/controller/slash/getAvailableSlashCommands.ts`

Status: complete

- Lines `1`-`48`: rewrite this file in one pass so slash-command autocomplete exposes built-in commands plus shipped workflow slash commands only. Treat this row as the only implementation contract for this file during this step; do not read adjacent controller, workspace, or legacy workflow-discovery files to infer behavior.
  - in the import block:
    - delete `resolveAvailableWorkflows` from `@/core/workflows/resolution/resolveAvailableWorkflows`
    - add `getShippedWorkflowSlashCommands` from `@/core/task/workflow-runtime/WorkflowRegistry`
    - leave `EmptyRequest`, `SlashCommandInfo`, `SlashCommandsResponse`, `BASE_SLASH_COMMANDS`, `VSCODE_ONLY_COMMANDS`, and `Controller` unchanged
  - keep the exported function signature exactly unchanged:
    - `export async function getAvailableSlashCommands(controller: Controller, _request: EmptyRequest): Promise<SlashCommandsResponse>`
  - keep `const commands: SlashCommandInfo[] = []` exactly unchanged
  - keep the built-in slash-command assembly loop exactly unchanged:
    - iterate `for (const cmd of [...BASE_SLASH_COMMANDS, ...VSCODE_ONLY_COMMANDS])`
    - push `SlashCommandInfo.create({ name: cmd.name, description: cmd.description, section: "default", cliCompatible: cmd.cliCompatible })`
  - delete the entire workspace- and legacy-workflow-discovery block:
    - `workspaceManager`
    - `cwd`
    - `localWorkflowToggles`
    - `globalWorkflowToggles`
    - `remoteWorkflowToggles`
    - `remoteConfigSettings`
    - `remoteWorkflows`
    - the `resolveAvailableWorkflows(...)` call
    - the `workflows` local
  - replace the deleted workflow block with exactly:
    - `for (const workflow of getShippedWorkflowSlashCommands()) {`
    - `  commands.push(`
    - `    SlashCommandInfo.create({`
    - `      name: workflow.name,`
    - `      description: workflow.description,`
    - `      section: "custom",`
    - `      cliCompatible: true,`
    - `    }),`
    - `  )`
    - `}`
  - do not read `controller.getWorkspaceManager?.()`, `controller.ensureWorkspaceManager?.()`, `controller.stateManager`, workspace roots, workflow toggles, remote config, or filesystem state anywhere in this file after the rewrite
  - keep the return statement exactly unchanged:
    - `return SlashCommandsResponse.create({ commands })`

### `src/core/task/tools/subagent/SubagentRunner.ts`

Status: complete

- Lines `9`-`35`, `469`-`575`, `797`-`889`, `914`-`1173`, and `1175`-`1206`: rewrite the workflow-facing portion of this file in one pass so `SubagentRunner` uses only the shared foundational workflow runtime and runtime-owned workflow prompt projection. Treat this row as the only implementation contract for this file during this step; do not read adjacent workflow, focus-chain, slash-command, or legacy workflow-resolution files to infer behavior.
  - in the import block:
    - delete `resolveWorkflowPersonaInstructions`
    - delete `getBmadWorkflowReminder`
    - delete `DeterministicPlaceholderToolContext`
    - delete `isDeterministicPlaceholderWorkflowSupported`
    - delete `applyPostToolTaskProgressUpdate`
    - delete `applyPreToolTaskProgressUpdate`
    - delete `getManagedWorkflowDefinition`
    - delete `buildManagedWorkflowPrompt`
    - delete `activateManagedWorkflowInTaskState`
    - delete `activatePlaceholderWorkflowInTaskState`
    - delete `getPlaceholderWorkflowValueMap`
    - delete `resolveActivePlaceholderWorkflowPromptContext`
    - delete `createWorkflowSkillMetadata`
    - delete `findResolvedWorkflowByName`
    - delete `resolveAvailableWorkflows`
    - delete `extractWorkflowPlaceholderKeys`
    - add `getWorkflowSkillMetadata` and `resolveWorkflowByUseSkillName` from `@/core/task/workflow-runtime/WorkflowRegistry`
    - leave `discoverSkills`, `getAvailableSkills`, prompt-refresh helpers, `PromptRegistry`, `FocusChainManager`, `TaskState`, `TaskConfig`, `ToolExecutorCoordinator`, `ToolValidator`, and the surrounding generic subagent imports unchanged
  - in the top-level subagent setup path inside `run(...)`:
    - delete `workflowEntries = await resolveAvailableWorkflows(...)`
    - replace the workflow-skill merge input with exactly `getWorkflowSkillMetadata()`
    - keep `discoverSkills(this.baseConfig.cwd)` and `getAvailableSkills(discoveredSkills)` unchanged
    - replace `await this.autoActivateAssignedWorkflow(state, assignedSkillNames, workflowEntries)` with `await this.autoActivateAssignedWorkflow(state, assignedSkillNames)`
    - delete `await this.maybeAppendCurrentStepInputPrompt(state, initialUserContent)`
    - when computing `shouldUseContinuationPrompt`, delete the `managedWorkflowActive` argument and pass only:
      - `hasHumanAuthoredInput: false`
      - `shouldSendFullPromptAssembly`
    - replace the assigned-skill directive guard:
      - delete `!state.activeWorkflowId && !state.managedWorkflowRun && !state.activePlaceholderWorkflowId`
      - use only `!state.activeWorkflowName`
    - delete the direct assignment `state.activeWorkflowJustStarted = false`
    - in both context-compaction paths, replace `this.clearSubagentCurrentStepPromptMarkerForContextCompaction(state)` with exactly `state.lastPromptedStoryTaskKey = undefined`
  - in the child tool-execution loop:
    - delete `const focusChainEnabled = !!subagentConfig.focusChainSettings.enabled`
    - delete the `applyPreToolTaskProgressUpdate(...)` call and all use of `preToolTaskProgressUpdate`
    - in the `ATTEMPT` tool branch, delete the `applyPostToolTaskProgressUpdate(...)` call entirely
    - in the general handler branch, delete the `applyPostToolTaskProgressUpdate(...)` call and delete any addition of `postToolTaskProgressUpdate.feedback` into `toolResultBlocks`
    - delete `await this.maybeAppendCurrentStepInputPrompt(state, toolResultBlocks)`
    - leave the rest of tool execution unchanged:
      - building `ToolUse`
      - creating `subagentConfig`
      - enforcing `allowedTools`
      - calling the registered handler
      - serializing/pushing tool results
      - stats/progress updates
  - in `createSubagentTaskConfig(state)`:
    - keep creation of `coordinator`, `validator`, and `focusChainManager` unchanged
    - keep the per-allowed-tool `coordinator.registerByName(...)` loop unchanged
    - in the returned `TaskConfig`, explicitly preserve the shared runtime by keeping `workflowRuntime: this.baseConfig.workflowRuntime`
    - keep `taskState: state` so the child state remains isolated from the parent task state object
    - keep `isSubagentExecution: true` and `vscodeTerminalExecutionMode: "backgroundExec"` unchanged
    - if `updateFCListFromToolResponse` remains in the callback object, rewrite it to accept only `taskProgress: string | undefined` and call `focusChainManager.updateFCListFromToolResponse(taskProgress)` with no `toolContext` argument
  - in `buildPromptContext(params)`:
    - keep the prompt-skill resolution preamble unchanged
    - delete all placeholder-/managed-workflow prompt fields:
      - `activeWorkflowPersonaInstructions`
      - `activeWorkflowReminder`
      - `activeWorkflowSupportsPlaceholders`
      - placeholder spread from `resolveActivePlaceholderWorkflowPromptContext(...)`
      - `activeDeterministicPlaceholderWorkflowEnabled`
      - `managedWorkflowActive`
      - `currentFocusChainChecklist`
    - build exactly `const workflowPromptProjection = await this.baseConfig.workflowRuntime.buildTurnProjection({ taskState: params.state })`
    - return the foundational workflow prompt fields only:
      - `activeWorkflowName: params.state.activeWorkflowName`
      - `activeWorkflowStepNumber: params.state.activeWorkflowSession?.activeStepNumber`
      - `workflowSystemInstructionsBlock: workflowPromptProjection.workflowSystemInstructionsBlock`
      - `workflowInputInstructionsBlock: workflowPromptProjection.workflowInputInstructionsBlock`
      - `workflowToolSchemaOverride: workflowPromptProjection.workflowToolSchemaOverride`
    - leave the generic fields unchanged:
      - `providerInfo`
      - `cwd`
      - `ide`
      - `skills`
      - `isContinuationTurn`
      - `focusChainSettings`
      - `browserSettings`
      - `mcpHub`
      - `yoloModeToggled: false`
      - `enableNativeToolCalls`
      - `enableParallelToolCalling: false`
      - `isSubagentRun: true`
  - in `shouldSendFullPromptAssembly(state)`, delete the `activeWorkflowJustStarted` argument and keep only:
    - `isFirstRequest: state.apiRequestCount === 1`
    - `hasHumanAuthoredInput: false`
    - `didRespondToPlanAskBySwitchingMode: false`
    - `turnsSinceFullPromptRefresh: state.turnsSinceFullPromptRefresh`
    - `promptRefreshFrequency: this.getPromptRefreshFrequency()`
  - replace `autoActivateAssignedWorkflow(...)` exactly as follows:
    - change the signature to `private async autoActivateAssignedWorkflow(state: TaskState, assignedSkillNames: string[]): Promise<void>`
    - return early unless `assignedSkillNames.length === 1`
    - return early if `state.activeWorkflowName` or `state.activeWorkflowSession` is already present
    - resolve the assigned workflow only through `const resolvedWorkflow = resolveWorkflowByUseSkillName(assignedSkillNames[0])`
    - if no shipped workflow resolves, return
    - call `await this.baseConfig.workflowRuntime.activateWorkflow({`
    - `  taskState: state,`
    - `  workflow: resolvedWorkflow,`
    - `  parentSession: this.baseConfig.taskState.activeWorkflowSession ? structuredClone(this.baseConfig.taskState.activeWorkflowSession) : undefined,`
    - `})`
    - do not call managed-workflow activation helpers
    - do not call placeholder-workflow activation helpers
    - do not seed placeholder checklists
    - do not run deterministic-placeholder bootstrap
  - delete these placeholder-specific helper methods entirely:
    - `inheritSharedParentPlaceholdersToActivatedWorkflow(...)`
    - `applyInitialDeterministicPlaceholderProgressionIfNeeded(...)`
    - `seedPlaceholderChecklistIfNeeded(...)`
    - `maybeAppendCurrentStepInputPrompt(...)`
    - `clearSubagentCurrentStepPromptMarkerForContextCompaction(...)`
  - leave `buildSubagentPromptInjectionBlocks(...)` in place for generic focus-chain instructions only, but do not add any workflow-specific prompt injection or placeholder current-step prompt consumption back into this file


## Phase 4: Prompt Assembly And Tool Prompt Wiring

### `src/core/task/prompt-refresh.ts`

Status: complete

- Lines `51`-`60`: rewrite `shouldUseContinuationTurnPrompt(...)` in one pass so this helper no longer depends on legacy workflow state. Delete the `managedWorkflowActive?: boolean` parameter and remove the `params.managedWorkflowActive !== true` gate. Leave the function returning `true` only when `hasHumanAuthoredInput === false` and `shouldSendFullPromptAssembly === false`. Leave `normalizePromptRefreshFrequency(...)`, `getPromptRefreshInterval(...)`, `shouldSendFullPromptAssembly(...)`, and `getNextTurnsSinceFullPromptRefresh(...)` unchanged.

### `src/core/prompts/system-prompt/templates/placeholders.ts`

Status: complete

- Lines `1`-`18` and `23`-`40`: rewrite the prompt-section placeholder surface in one pass so workflow prompting uses only the dedicated foundational workflow carriers.
  - in `SystemPromptSection`, delete `AGENT_ROLE`
  - in `SystemPromptSection`, add `WORKFLOW_SYSTEM_INSTRUCTIONS = "WORKFLOW_SYSTEM_INSTRUCTIONS_SECTION"`
  - in `SystemPromptSection`, add `WORKFLOW_INPUT = "WORKFLOW_INPUT_SECTION"`
  - in `SystemPromptSection`, delete `TASK_PROGRESS`
  - leave `USER_INSTRUCTIONS` in place as the surviving generic user-instructions carrier
  - leave `STANDARD_PLACEHOLDERS` structurally unchanged so it continues to spread `...SystemPromptSection`, which will automatically add the two new workflow placeholders and remove `TASK_PROGRESS`
  - replace `REQUIRED_PLACEHOLDERS` so `STANDARD_PLACEHOLDERS.SYSTEM_INFO` remains required and `STANDARD_PLACEHOLDERS.AGENT_ROLE` is removed
  - leave `OPTIONAL_PLACEHOLDERS` and `validateRequiredPlaceholders(...)` unchanged

### `src/core/prompts/system-prompt/components/workflow_system_instructions.ts`

Status: complete

- New file, whole file:
  - create this file at `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/workflow_system_instructions.ts`
  - add exactly one import line:
    - `import type { PromptVariant, SystemPromptContext } from "../types"`
  - export exactly one function with this exact signature:
    - `export async function getWorkflowSystemInstructionsSection(_variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined>`
  - implement this file only as the dedicated carrier for `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS`
  - inside the function:
    - bind `const block = context.workflowSystemInstructionsBlock`
    - return `block` when `typeof block === "string"` and `block.trim().length > 0`
    - otherwise return `undefined`
  - do not add any other imports, exports, helper functions, constants, template text, or override handling in this file
  - do not inject fallback persona text, generic identity text, workflow reminders, placeholder guidance, managed-workflow guidance, or `task_progress` instructions in this file
  - do not read `activeWorkflowPersonaInstructions`, `activeWorkflowReminder`, `activePlaceholderWorkflowName`, `activePlaceholderWorkflowStepNumber`, `activeDeterministicPlaceholderWorkflowEnabled`, or `managedWorkflowActive`; this file must depend only on the runtime-owned workflow system-instructions block

### `src/core/prompts/system-prompt/components/workflow_input.ts`

Status: complete

- New file, whole file:
  - create this file at `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/workflow_input.ts`
  - add exactly one import line:
    - `import type { PromptVariant, SystemPromptContext } from "../types"`
  - export exactly one function with this exact signature:
    - `export async function getWorkflowInputSection(_variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined>`
  - implement this file only as the dedicated carrier for `SystemPromptSection.WORKFLOW_INPUT`
  - inside the function:
    - bind `const block = context.workflowInputInstructionsBlock`
    - return `block` when `typeof block === "string"` and `block.trim().length > 0`
    - otherwise return `undefined`
  - do not add any other imports, exports, helper functions, constants, template text, or override handling in this file
  - do not inject workflow reminders, persona text, placeholder guidance, managed-workflow guidance, or `task_progress` instructions in this file
  - do not read `activeWorkflowReminder`, `activePlaceholderWorkflowName`, `activePlaceholderWorkflowStepNumber`, `activeDeterministicPlaceholderWorkflowEnabled`, `activeWorkflowSupportsPlaceholders`, or `managedWorkflowActive`; this file must depend only on the runtime-owned workflow input block

### `src/core/prompts/system-prompt/components/index.ts`

Status: complete

- Lines `1`-`15` and `22`-`53`: rewrite the prompt-component import block and `getSystemPromptComponents()` return list in one pass so prompt-section registration matches the foundational workflow prompt architecture. Treat this row as the only implementation contract for this file during this step; do not read adjacent component files to infer ordering.
  - in the import block:
    - delete `getAgentRoleSection` from `./agent_role`
    - delete `getUpdatingTaskProgress` from `./task_progress`
    - add `getWorkflowInputSection` from `./workflow_input`
    - add `getWorkflowSystemInstructionsSection` from `./workflow_system_instructions`
    - leave all other imports unchanged
  - in `getSystemPromptComponents()`:
    - delete the entry `{ id: SystemPromptSection.AGENT_ROLE, fn: getAgentRoleSection }`
    - insert `{ id: SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS, fn: getWorkflowSystemInstructionsSection }` in that same first position of the returned array
    - keep the existing `CONTINUATION_TURN`, `SYSTEM_INFO`, `MCP`, `USER_INSTRUCTIONS`, `TOOL_USE`, `EDITING_FILES`, `CAPABILITIES`, `SKILLS`, `RULES`, `OBJECTIVE`, `ACT_VS_PLAN`, and `FEEDBACK` entries unchanged and in the same relative order
    - delete the final entry `{ id: SystemPromptSection.TASK_PROGRESS, fn: getUpdatingTaskProgress }`
    - insert `{ id: SystemPromptSection.WORKFLOW_INPUT, fn: getWorkflowInputSection }` in that same final position of the returned array
  - do not add, remove, or reorder any other component registrations
  - keep the file-level comment and exported function name unchanged

### `src/core/prompts/system-prompt/components/user_instructions.ts`

Status: complete

- Lines `10`-`77`: rewrite this file in one pass so `user_instructions.ts` remains only the generic repository/user-instructions carrier and no longer transports workflow-specific prompt text. Treat this row as the only implementation contract for this file during this step; do not read adjacent workflow component files to infer behavior.
  - in `getUserInstructions(...)`, delete the first argument currently passed into `buildUserInstructions(...)`:
    - remove `context.activeWorkflowReminder`
    - leave all other arguments in their current order unchanged
  - in `buildUserInstructions(...)`, delete the `activeWorkflowReminder?: string` parameter from the signature
  - in `buildUserInstructions(...)`, delete the block:
    - `if (activeWorkflowReminder) {`
    - `  customInstructions.push(activeWorkflowReminder)`
    - `}`
  - leave `USER_CUSTOM_INSTRUCTIONS_TEMPLATE_TEXT` unchanged
  - leave the `TemplateEngine` usage unchanged
  - leave the remaining generic instruction carriers unchanged:
    - `preferredLanguageInstructions`
    - `globalClineRulesFileInstructions`
    - `localClineRulesFileInstructions`
    - `localCursorRulesFileInstructions`
    - `localCursorRulesDirInstructions`
    - `localWindsurfRulesFileInstructions`
    - `localAgentsRulesFileInstructions`
    - `clineIgnoreInstructions`
  - do not add any replacement workflow reminder handling in this file; workflow-specific input instructions must come only from the runtime-owned workflow input block

### `src/core/prompts/system-prompt/components/continuation_turn.ts`

Status: complete

- Lines `1`-`33` and `35`-`74`: rewrite this file in one pass so the existing continuation-turn prompt pipeline stays in place while workflow-specific continuation content comes only from `WorkflowRuntime`.
  - delete imports of `FocusChainPrompts` and `shouldExposeWorkflowProgressRequest`
  - delete `renderChecklistForPrompt(...)` and `getFocusChainReminderLine(...)`
  - remove local branching on `activePlaceholderWorkflowName`, `activePlaceholderWorkflowStepNumber`, `activeDeterministicPlaceholderWorkflowEnabled`, `activeWorkflowSupportsPlaceholders`, and `managedWorkflowActive`
  - keep the surviving generic continuation scaffold in `getContinuationTurnSection(...)`: header, cwd guidance, current-mode tools line, agent-feedback line, multi-root hint, and Indxr guidance
  - delete the entire trailing checklist block:
    - `const checklist = context.currentFocusChainChecklist?.trim()`
    - the nested `if (!context.activePlaceholderWorkflowName) { ... }`
    - the `lines.push(getFocusChainReminderLine(context))` call
  - replace that deleted block with exactly this runtime-projected workflow block append logic:
    - bind `const workflowSystemBlock = context.workflowSystemInstructionsBlock`
    - if `typeof workflowSystemBlock === "string"` and `workflowSystemBlock.trim().length > 0`, call `lines.push("", workflowSystemBlock)`
    - bind `const workflowInputBlock = context.workflowInputInstructionsBlock`
    - if `typeof workflowInputBlock === "string"` and `workflowInputBlock.trim().length > 0`, call `lines.push("", workflowInputBlock)`
  - append the runtime-projected workflow blocks in system-block-then-input-block order only, preserving the block text exactly as already supplied by `WorkflowRuntime`
  - do not locally derive checklist text, workflow reminder text, workflow progression guidance, or `Current Step`; the continuation workflow input block must already omit `Current Step` before it reaches this file

### `src/core/prompts/system-prompt/components/response_tools.ts`

Status: complete

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

### `src/core/prompts/system-prompt/components/mcp.ts`

Status: complete

- Lines `112`-`149`, `170`-`212`, and `233`-`284`: rewrite the workflow-sensitive guidance block in one pass so only generic MCP/Indxr prompt behavior survives. Treat this row as the only implementation contract for this file during this step; do not read adjacent workflow files to infer the replacement logic.
  - delete `normalizeActivePlaceholderWorkflowName(...)`
  - delete `isDevStoryImplementationStep(...)`
  - delete `isDirectMaterialReviewStep(...)`
  - in `getIndxrExplorationGuidance(...)`:
    - keep the native-tool-calls branch structure in place
    - in the native-tool-calls branch:
      - keep `const visibleIndxrToolNames = getVisibleIndxrToolNames(context)`
      - keep the early return `""` when `visibleIndxrToolNames.length === 0`
      - delete the `isDevStoryImplementationStep(context)` branch entirely
      - delete the `isDirectMaterialReviewStep(context)` branch entirely
      - return exactly ``${renderIndxrExplorationPreferenceGuidance(visibleIndxrToolNames)} ${BUILTIN_FILE_TOOL_FALLBACK_GUIDANCE}``
    - in the non-native branch:
      - keep the early return `""` when `!hasConnectedIndxrServer(context)`
      - keep the existing `defaultIndxrToolNames` array unchanged
      - delete the `isDevStoryImplementationStep(context)` branch entirely
      - delete the `isDirectMaterialReviewStep(context)` branch entirely
      - return exactly ``${renderIndxrExplorationPreferenceGuidance(defaultIndxrToolNames)} ${BUILTIN_FILE_TOOL_FALLBACK_GUIDANCE}``
  - in `replacePromptPlaceholders(...)`:
    - delete `const isDevStoryStep = isDevStoryImplementationStep(context)`
    - delete `const isDirectReviewStep = isDirectMaterialReviewStep(context)`
    - keep `const hasUsableIndxr = hasUsableIndxrExplorationContext(context)`
    - rewrite `searchFilesGuidance` exactly as:
      - when `hasUsableIndxr === true`: `"Use this only when you need exact regex search across raw files or when Indxr is unavailable or insufficient."`
      - otherwise: `"Start here when you need to narrow candidate files or regions before using list_code_definition_names, read_file, or read_file_range."`
    - rewrite `listCodeDefinitionsGuidance` exactly as:
      - when `hasUsableIndxr === true`: `"Use this only when Indxr is unavailable or insufficient and you specifically need a built-in directory-level definition pass."`
      - otherwise: `"Results include human-friendly 1-based line numbers so you can target a later read_file or read_file_range call instead of loading large files blindly."`
    - rewrite `readFileGuidance` exactly as:
      - when `hasUsableIndxr === true`: `"When Indxr is available, use its tools first for discovery, summaries, symbol lookup, dependency tracing, and targeted source reads. Once you have narrowed the work to one concrete file, prefer a single read_file call when that file is at or below 800 lines and 65536 bytes and you need the full raw contents for editing; otherwise keep using targeted source reads or read_file_range."`
      - otherwise: `"Prefer using search_files and list_code_definition_names first to narrow the target, then use read_file_range for targeted inspection. Once you have narrowed the work to one concrete file, prefer a single read_file call when that file is at or below 800 lines and 65536 bytes and you need the full raw contents, rather than stitching together many nearby range reads."`
    - rewrite `readFileRangeGuidance` exactly as:
      - when `hasUsableIndxr === true`: `"Use this when you need exact raw line-based inspection after Indxr has already narrowed the target, when the file exceeds the full-read limit, or when Indxr is insufficient."`
      - otherwise: `"Use this after search_files or list_code_definition_names has narrowed the problem to a focused region, when the file exceeds the full-read limit, or when you need a targeted refresher without replaying the entire file."`
    - rewrite `useMcpToolGuidance` exactly as:
      - when `hasUsableIndxr === true`: `` When Indxr is available, default to its MCP tools first for code exploration, symbol lookup, file understanding, dependency tracing, and targeted source reads before using built-in `search_files`, `list_code_definition_names`, `read_file`, or `read_file_range`. After you have narrowed the task to one concrete file, prefer one full raw read only when the file is at or below 800 lines and 65536 bytes; otherwise prefer symbol-targeted or explicit line-range reads. Use built-in file tools only when exact raw file contents, regex search, or direct line inspection are required.``
      - otherwise: `""`
    - leave the final chained `.replace(...)` calls unchanged
  - leave MCP server discovery, Indxr signature detection, visible-native-tool normalization, generic visible-Indxr extraction, `getSubagentIndxrExplorationGuidance(...)`, `getCodeExplorationGuidance(...)`, `getMcp(...)`, and `getMcpServers(...)` unchanged

### `src/core/prompts/contextManagement.ts`

Status: complete

- Lines `1`-`16`, `46`-`57`, and `95`-`103`: rewrite `summarizeTask(...)` in one pass so this file remains a generic context-compaction prompt surface only.
  - remove the `focusChainSettings?: { enabled: boolean }` parameter from `summarizeTask(...)`
  - delete the `task_progress` completion-gating text in lines `14`-`16`
  - delete the conditional `Updating task progress:` block in lines `46`-`50`
  - delete the `<task_progress>` usage/example output in lines `54`-`57` and `95`-`103`
  - leave the CWD/multi-root text and the rest of the summary instructions unchanged
  - leave `continuationPrompt(...)` unchanged

### `src/core/prompts/system-prompt/tools/workflow_progress_request.ts`

Status: complete

- Lines `3` and `8`-`21`: rewrite this file in one pass so it remains only the model-facing schema/description for the surviving `workflow_progress_request` tool. Treat this row as the only implementation contract for this file during this step; do not read adjacent prompt-tool files to infer wording or visibility logic.
  - delete the import of `shouldExposeWorkflowProgressRequest`
  - in `generic`, replace the entire current `description` value with exactly:
    - `"Ask the user to confirm whether the current workflow step is ready to advance. The system will display the exact approval prompt and process the response."`
  - delete the entire `contextRequirements` callback property
  - leave `id`, `variant`, `name`, `parameters: []`, and `workflow_progress_request_variants = [generic]` unchanged
  - do not add any replacement visibility gating in this file; workflow-specific tool visibility is owned elsewhere

### `src/core/prompts/system-prompt/tools/attempt_completion.ts`

Status: complete

- Lines `4`, `28`-`39`, `63`-`75`, and `97`-`105`: rewrite this file in one pass so `attempt_completion` no longer carries the retired auxiliary feedback/progress contract surface.
  - delete `AGENT_FEEDBACK_PARAMETER` from the import in line `4`
  - delete `AGENT_FEEDBACK_PARAMETER` plus the inline `task_progress` parameter object from `generic`
  - delete `AGENT_FEEDBACK_PARAMETER` plus the inline `task_progress` parameter object from `GPT_5`
  - delete `AGENT_FEEDBACK_PARAMETER` plus the inline `task_progress` parameter object from `NATIVE_NEXT_GEN`
  - leave `result`, `command`, `id`, the variant descriptions, `NATIVE_GPT_5`, and `attempt_completion_variants` unchanged

### `src/core/prompts/system-prompt/tools/generate_plan_output.ts`

Status: complete

- Lines `4`, `6`-`21`, `48`-`58`, `75`-`81`, and `106`-`115`: rewrite this file in one pass so `generate_plan_output` no longer carries the retired auxiliary feedback/progress contract surface.
  - delete `AGENT_FEEDBACK_PARAMETER` from the import in line `4`
  - delete the legacy header-comment `task_progress` parameter/usage text in lines `6`-`21`
  - delete `AGENT_FEEDBACK_PARAMETER` plus the inline `task_progress` parameter object from `generic`
  - delete `AGENT_FEEDBACK_PARAMETER` plus the inline `task_progress` parameter object from `NATIVE_GPT_5`
  - delete `AGENT_FEEDBACK_PARAMETER` plus the inline `task_progress` parameter object from `GEMINI_3`
  - leave `response`, `needs_more_exploration`, `id`, the variant descriptions, `NATIVE_NEXT_GEN`, and `generate_plan_output_variants` unchanged

### `src/core/prompts/system-prompt/tools/index.ts`

Status: complete

- Lines `7`, `21`, and `1`-`32`: rewrite the workflow-tool export surface in one pass so the prompt-tools barrel matches the foundational workflow tool set while preserving the existing barrel order.
  - replace `export * from "./build_review_diff_output"` with `export * from "./build_workflow_document"` in the same export position
  - replace `export * from "./set_workflow_placeholders"` with `export * from "./set_workflow_values"` in the same export position
  - leave every other export line unchanged

### `src/core/prompts/system-prompt/tools/init.ts`

Status: complete

- Lines `9`, `24`, and `44`-`78`: rewrite the workflow-tool import/registration surface in one pass so the prompt tool registry matches the foundational workflow tool set while preserving the existing import order and `allToolVariants` order.
  - replace `import { build_review_diff_output_variants } from "./build_review_diff_output"` with `import { build_workflow_document_variants } from "./build_workflow_document"` in the same import position
  - replace `import { set_workflow_placeholders_variants } from "./set_workflow_placeholders"` with `import { set_workflow_values_variants } from "./set_workflow_values"` in the same import position
  - in `allToolVariants`, replace `...build_review_diff_output_variants` with `...build_workflow_document_variants` in the same array position
  - in `allToolVariants`, replace `...set_workflow_placeholders_variants` with `...set_workflow_values_variants` in the same array position
  - leave every other import and every other `allToolVariants` entry unchanged

### `src/core/prompts/system-prompt/registry/ClineToolSet.ts`

Status: complete

- Lines `88`-`198`: rewrite `getEnabledToolSpecs(...)` and keep `getEnabledTools(...)` / `getNativeTools(...)` aligned so `ClineToolSet.ts` becomes the canonical seam for consuming `context.workflowToolSchemaOverride` without changing the registered-tool lookup contract.
  - leave `getEnabledTools(...)` as the registered-tool resolution seam only: it must continue returning `ClineToolSet[]` resolved from `variant.tools` through `getToolByNameWithFallback(...)`, then filtered by each tool’s `contextRequirements`; do not thread `context.workflowToolSchemaOverride` into this method
  - in `getEnabledToolSpecs(...)`, keep the current first step exactly: `const registeredTools = ClineToolSet.getEnabledTools(variant, context).map((tool) => tool.config)`
  - in `getEnabledToolSpecs(...)`, define the built-in spec list exactly as:
    - `const builtInTools = context.workflowToolSchemaOverride ?? registeredTools`
  - keep dynamic subagent tool creation exactly in `getDynamicSubagentToolSpecs(...)`; do not move or duplicate that logic
  - in `getEnabledToolSpecs(...)`, keep the current subagent de-duplication behavior but apply it to `builtInTools` instead of `registeredTools`:
    - if dynamic subagent tools are present, filter out any built-in entry whose `id === ClineDefaultTool.USE_SUBAGENTS`
    - otherwise leave `builtInTools` unchanged
  - return the final enabled spec list exactly as the filtered built-in list followed by any dynamic subagent tool specs
  - do not wrap `context.workflowToolSchemaOverride` entries in `ClineToolSet` instances and do not attempt to re-resolve them through variant registration; consume the override only as a `readonly ClineToolSpec[]`
  - in `getNativeTools(...)`, keep deriving `toolConfigs` from `getEnabledToolSpecs(...)` exactly as it does now so native tool exposure consumes the same override-shaped built-in spec list before contextual filtering and provider conversion
  - keep `getToolByNameWithFallback(...)`, variant registration, dynamic subagent tool creation, `getNativeConverter(...)`, provider-specific native converter selection, `mcpToolToClineToolSpec(...)`, and every method outside `getEnabledToolSpecs(...)` unchanged except for any minimal call-site alignment required by the spec-layer override handling above
  - do not add placeholder-era workflow gating, `.md` workflow-name heuristics, or any second workflow-specific override seam outside `context.workflowToolSchemaOverride`

### `src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts`

Status: complete

- Lines `1`-`124`: rewrite this file in one pass so it remains only the generic native-tool filtering seam with no placeholder-workflow matrix dependency.
  - keep only these imports:
    - `CLINE_MCP_TOOL_IDENTIFIER` from `@/shared/mcp`
    - `ClineDefaultTool` from `@/shared/tools`
    - `type ClineToolSpec` from `../spec`
    - `type SystemPromptContext` from `../types`
  - stop importing `ACT_MODE_RESPONSE_TOOL_IDS`, `PLAN_MODE_RESPONSE_TOOL_IDS`, `ALWAYS_PRESERVED_NATIVE_TOOL_IDS`, `PLACEHOLDER_BUILTIN_BUNDLE_TOOLS`, `PLACEHOLDER_INDXR_BUNDLE_TOOLS`, and `PLACEHOLDER_WORKFLOW_STEP_MATRIX` from `./contextualToolMatrix`
  - define file-local generic preservation constants in this file exactly as:
    - `const ACT_MODE_RESPONSE_TOOL_IDS = [ClineDefaultTool.ASK, ClineDefaultTool.SEND_USER_MESSAGE, ClineDefaultTool.ATTEMPT, ClineDefaultTool.ACT_MODE] as const`
    - `const PLAN_MODE_RESPONSE_TOOL_IDS = [ClineDefaultTool.ASK, ClineDefaultTool.SEND_USER_MESSAGE, ClineDefaultTool.PLAN_MODE] as const`
    - `const ALWAYS_PRESERVED_NATIVE_TOOL_IDS = [ClineDefaultTool.NEW_TASK, ClineDefaultTool.BROWSER, ClineDefaultTool.MCP_ACCESS] as const`
  - delete `BuiltInBundleName`, `IndxrBundleName`, `hasWorkflowMatrixRow(...)`, `normalizeWorkflowNameForMatrixLookup(...)`, `isBuiltInBundleName(...)`, and `isIndxrBundleName(...)`
  - keep `canonicalizeMcpToolName(...)` exactly unchanged
  - in `filterContextualNativeToolSpecs(...)`, keep the existing provider-mode `responseFilteredRegisteredTools` filtering logic unchanged
  - delete every branch that reads `managedWorkflowActive`, `activePlaceholderWorkflowName`, `activePlaceholderWorkflowStepNumber`, workflow-name normalization, or `PLACEHOLDER_WORKFLOW_STEP_MATRIX`
  - after computing `responseFilteredRegisteredTools`, if `context.workflowToolSchemaOverride` is absent, return exactly `[...responseFilteredRegisteredTools, ...mcpTools]`
  - when `context.workflowToolSchemaOverride` is present, derive the allowlists exactly as follows:
    - `const currentModeResponseToolIds = context.providerInfo.mode === "plan" ? PLAN_MODE_RESPONSE_TOOL_IDS : ACT_MODE_RESPONSE_TOOL_IDS`
    - `const overrideBuiltInToolIds = new Set(context.workflowToolSchemaOverride.filter((tool) => !tool.name.includes(CLINE_MCP_TOOL_IDENTIFIER)).map((tool) => tool.id))`
    - `const allowedBuiltInToolIds = new Set<ClineDefaultTool>([...currentModeResponseToolIds, ...ALWAYS_PRESERVED_NATIVE_TOOL_IDS, ...overrideBuiltInToolIds])`
    - `const allowedMcpCanonicalNames = new Set(context.workflowToolSchemaOverride.filter((tool) => tool.name.includes(CLINE_MCP_TOOL_IDENTIFIER)).map((tool) => canonicalizeMcpToolName(tool.name)))`
  - in that override branch, filter registered tools exactly as follows:
    - keep any dynamic subagent tool where `tool.id === ClineDefaultTool.USE_SUBAGENTS && tool.name !== "use_subagents"`
    - otherwise keep only tools whose `id` is in `allowedBuiltInToolIds`
  - in that override branch, filter MCP tools only by `allowedMcpCanonicalNames.has(canonicalizeMcpToolName(tool.name))`
  - return the override-branch result exactly as `[...filteredRegisteredTools, ...filteredMcpTools]`
  - do not read `.md`-suffix heuristics or add any second workflow-specific override seam outside `context.workflowToolSchemaOverride`

### `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`

Status: complete

- Lines `74`-`91`: remove the generic native-tool preservation constants from this legacy workflow-matrix file in one pass after their replacements are moved into the surviving generic native-tool filter seam.
  - delete `ACT_MODE_RESPONSE_TOOL_IDS`
  - delete `PLAN_MODE_RESPONSE_TOOL_IDS`
  - delete `ALWAYS_PRESERVED_NATIVE_TOOL_IDS`
  - leave `PlaceholderToolBundle`, `PLACEHOLDER_BUILTIN_BUNDLE_TOOLS`, `PLACEHOLDER_INDXR_BUNDLE_TOOLS`, and `PLACEHOLDER_WORKFLOW_STEP_MATRIX` untouched as reference-only dead code until Cleanup


## Phase 5: Prompt Variant Rewire

### `src/core/prompts/system-prompt/variants/config.template.ts`

Status: complete

- Lines `33`-`67`, `109`-`120`, and `126`-`161`: rewrite the shared variant-config examples/helpers in one pass so they model the foundational prompt architecture with exact file-local component placement.
  - in `config.components(...)`, replace the first entry `SystemPromptSection.AGENT_ROLE` with `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS`
  - in `config.components(...)`, insert `SystemPromptSection.WORKFLOW_INPUT` immediately before `SystemPromptSection.USER_INSTRUCTIONS`
  - in `createMinimalVariant(...).components(...)`, delete `SystemPromptSection.AGENT_ROLE` and leave `TOOL_USE`, `RULES`, and `SYSTEM_INFO` in their current order
  - in `createAdvancedVariant(...).components(...)`, replace the first entry `SystemPromptSection.AGENT_ROLE` with `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS`
  - in `createAdvancedVariant(...).components(...)`, insert `SystemPromptSection.WORKFLOW_INPUT` immediately before `SystemPromptSection.USER_INSTRUCTIONS`
  - in `createAdvancedVariant(...).tools(...)`, replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES` in the same tool position
  - leave `config.tools(...)`, the non-workflow tool ordering, validation flow, helper names, comments, and minimal helper tool list unchanged

### `src/core/prompts/system-prompt/variants/generic/config.ts`

Status: complete

- Lines `44`-`91`: rewrite the generic variant config in one pass so it uses only the foundational workflow prompt/tool surface with exact file-local component and tool placement.
  - in `.components(...)`, replace the first entry `SystemPromptSection.AGENT_ROLE` with `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS`
  - in `.components(...)`, delete `SystemPromptSection.TASK_PROGRESS` and do not add any replacement in that position
  - in `.components(...)`, insert `SystemPromptSection.WORKFLOW_INPUT` immediately before `SystemPromptSection.USER_INSTRUCTIONS`
  - in `.tools(...)`, replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES` in the same tool position
  - in `.tools(...)`, replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT` in the same tool position
  - leave the matcher, template, remaining component order, remaining tool order, placeholders, validation, comments, and exports unchanged

### `src/core/prompts/system-prompt/variants/generic/template.ts`

Status: complete

- Lines `3`-`49`: rewrite the generic prompt template in one pass so it renders only the foundational workflow prompt carriers with exact placeholder placement and separator preservation.
  - replace the first placeholder `{{${SystemPromptSection.AGENT_ROLE}}}` with `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}` in the same top-of-template position
  - delete the entire `TASK_PROGRESS` section block between `TOOL_USE` and `MCP`, including its placeholder and one adjacent `====` separator, so that `TOOL_USE` is followed directly by `MCP` using the existing single separator pattern
  - insert `{{${SystemPromptSection.WORKFLOW_INPUT}}}` immediately before `{{${SystemPromptSection.USER_INSTRUCTIONS}}}`, separated by the existing `====` pattern
  - leave every other surviving placeholder and separator block unchanged

### `src/core/prompts/system-prompt/variants/next-gen/config.ts`

Status: complete

- Lines `35`-`90`: rewrite the next-gen variant config in one pass so it uses only the foundational workflow prompt/tool surface with exact file-local component and tool placement.
  - in `.components(...)`, replace the first entry `SystemPromptSection.AGENT_ROLE` with `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS`
  - in `.components(...)`, delete `SystemPromptSection.TASK_PROGRESS` and do not add any replacement in that position
  - in `.components(...)`, insert `SystemPromptSection.WORKFLOW_INPUT` immediately before `SystemPromptSection.USER_INSTRUCTIONS`
  - in `.tools(...)`, replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES` in the same tool position
  - in `.tools(...)`, replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT` in the same tool position
  - leave the matcher, template, remaining component order, remaining tool order, `RULES` override, placeholders, validation, comments, and exports unchanged

### `src/core/prompts/system-prompt/variants/next-gen/template.ts`

Status: complete

- Lines `5`-`51`: rewrite the next-gen prompt template in one pass so it renders only the foundational workflow prompt carriers with exact placeholder placement and separator preservation.
  - replace the first placeholder `{{${SystemPromptSection.AGENT_ROLE}}}` with `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}` in the same top-of-template position
  - delete the entire `TASK_PROGRESS` section block between `TOOL_USE` and `MCP`, including its placeholder and one adjacent `====` separator, so that `TOOL_USE` is followed directly by `MCP` using the existing single separator pattern
  - insert `{{${SystemPromptSection.WORKFLOW_INPUT}}}` immediately before `{{${SystemPromptSection.USER_INSTRUCTIONS}}}`, separated by the existing `====` pattern
  - leave `rules_template` plus every other surviving placeholder and separator block unchanged

### `src/core/prompts/system-prompt/variants/native-next-gen/config.ts`

Status: complete

- Lines `33`-`97`: rewrite the native next-gen variant config in one pass so it uses only the foundational workflow prompt/tool surface with exact file-local component and tool placement.
  - in `.components(...)`, replace the first entry `SystemPromptSection.AGENT_ROLE` with `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS`
  - in `.components(...)`, delete `SystemPromptSection.TASK_PROGRESS` and do not add any replacement in that position
  - in `.components(...)`, insert `SystemPromptSection.WORKFLOW_INPUT` immediately before `SystemPromptSection.USER_INSTRUCTIONS`
  - in `.tools(...)`, replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES` in the same tool position
  - in `.tools(...)`, replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT` in the same tool position
  - leave the matcher, template, remaining component order, remaining tool order, override wiring, placeholders, validation, comments, and exports unchanged

### `src/core/prompts/system-prompt/variants/native-next-gen/template.ts`

Status: complete

- Lines `10`-`56`: rewrite the native next-gen prompt template in one pass so it renders only the foundational workflow prompt carriers with exact placeholder placement and separator preservation.
  - in `BASE`, replace the first placeholder `{{${SystemPromptSection.AGENT_ROLE}}}` with `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}` in the same top-of-template position
  - in `BASE`, delete the entire `TASK_PROGRESS` section block between `TODO` and `EDITING_FILES`, including its placeholder and one adjacent `====` separator, so that `TODO` is followed directly by `EDITING_FILES` using the existing single separator pattern
  - in `BASE`, insert `{{${SystemPromptSection.WORKFLOW_INPUT}}}` immediately before `{{${SystemPromptSection.USER_INSTRUCTIONS}}}`, separated by the existing `====` pattern
  - leave `RULES`, `TOOL_USE`, `ACT_VS_PLAN`, `OBJECTIVE`, `FEEDBACK`, `TEMPLATE_OVERRIDES`, and every other surviving placeholder and separator block unchanged

### `src/core/prompts/system-prompt/variants/gpt-5/config.ts`

Status: complete

- Lines `32`-`94`: rewrite the GPT-5 variant config in one pass so it uses only the foundational workflow prompt/tool surface with exact file-local component, tool, and override placement.
  - in `.components(...)`, replace the first entry `SystemPromptSection.AGENT_ROLE` with `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS`
  - in `.components(...)`, delete `SystemPromptSection.TASK_PROGRESS` and do not add any replacement in that position
  - in `.components(...)`, insert `SystemPromptSection.WORKFLOW_INPUT` immediately before `SystemPromptSection.USER_INSTRUCTIONS`
  - in `.tools(...)`, replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES` in the same tool position
  - in `.tools(...)`, replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT` in the same tool position
  - delete the entire `.overrideComponent(SystemPromptSection.TASK_PROGRESS, { template: GPT_5_TEMPLATE_OVERRIDES.TASK_PROGRESS, })` call
  - leave the matcher, template, remaining component order, remaining tool order, the surviving `TOOL_USE`, `ACT_VS_PLAN`, and `RULES` override wiring, placeholders, validation, comments, and exports unchanged

### `src/core/prompts/system-prompt/variants/gpt-5/template.ts`

Status: complete

- Lines `10`-`107`: rewrite the GPT-5 template overrides in one pass so they no longer preserve standalone agent-role or task-progress prompt carriers with exact inline-template and override-surface edits.
  - in `BASE`, replace the first placeholder `{{${SystemPromptSection.AGENT_ROLE}}}` with `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}` in the same top-of-template position
  - in `BASE`, delete the entire `TASK_PROGRESS` section block between `TOOL_USE` and `MCP`, including its placeholder and one adjacent `====` separator, so that `TOOL_USE` is followed directly by `MCP` using the existing single separator pattern
  - in `BASE`, insert `{{${SystemPromptSection.WORKFLOW_INPUT}}}` immediately before `{{${SystemPromptSection.USER_INSTRUCTIONS}}}`, separated by the existing `====` pattern
  - delete the entire `const TASK_PROGRESS = ...` helper
  - remove the `TASK_PROGRESS` entry from `GPT_5_TEMPLATE_OVERRIDES`
  - leave `ACT_VS_PLAN`, `TOOL_USE`, `RULES`, the export name, and the remaining override entries unchanged

### `src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`

Status: complete

- Lines `46`-`109`: rewrite the native GPT-5 variant config in one pass so it uses only the foundational workflow prompt/tool surface with exact file-local component, tool, and override placement.
  - in `.components(...)`, replace `SystemPromptSection.AGENT_ROLE` with `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS` in the same component position
  - in `.components(...)`, replace `SystemPromptSection.TASK_PROGRESS` with `SystemPromptSection.WORKFLOW_INPUT` in the same component position
  - in `.tools(...)`, replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES` in the same tool position
  - in `.tools(...)`, replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT` in the same tool position
  - delete the entire `.overrideComponent(SystemPromptSection.TASK_PROGRESS, { template: GPT_5_TEMPLATE_OVERRIDES.TASK_PROGRESS, })` call
  - leave the matcher, template, every other component entry, remaining tool order, the surviving `RULES`, `TOOL_USE`, `FEEDBACK`, and `EDITING_FILES` override wiring, placeholders, validation, comments, and exports unchanged

### `src/core/prompts/system-prompt/variants/native-gpt-5/template.ts`

Status: complete

- Lines `9`-`82`: rewrite the native GPT-5 template overrides in one pass so they no longer preserve standalone agent-role or task-progress prompt carriers with exact inline-template and override-surface edits.
  - in `BASE`, replace the first placeholder `{{${SystemPromptSection.AGENT_ROLE}}}` with `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}` in the same top-of-template position
  - in `BASE`, delete the entire `TASK_PROGRESS` section block between `TOOL_USE` and `MCP`, including its placeholder and one adjacent `====` separator, so that `TOOL_USE` is followed directly by `MCP` using the existing single separator pattern
  - in `BASE`, insert `{{${SystemPromptSection.WORKFLOW_INPUT}}}` immediately before `{{${SystemPromptSection.USER_INSTRUCTIONS}}}`, separated by the existing `====` pattern
  - delete the entire `const TASK_PROGRESS = ...` helper
  - remove the `TASK_PROGRESS` entry from `GPT_5_TEMPLATE_OVERRIDES`
  - leave `RULES`, `TOOL_USE`, `OBJECTIVE`, `FEEDBACK`, the export name, and the remaining override entries unchanged

### `src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`

Status: complete

- Lines `40`-`94`: rewrite the native GPT-5.1 variant config in one pass so it uses only the foundational workflow prompt/tool surface with exact file-local component, tool, and override placement.
  - in `.components(...)`, replace the first entry `SystemPromptSection.AGENT_ROLE` with `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS`
  - in `.components(...)`, delete `SystemPromptSection.TASK_PROGRESS` and do not add any replacement in that position
  - in `.components(...)`, insert `SystemPromptSection.WORKFLOW_INPUT` immediately before `SystemPromptSection.USER_INSTRUCTIONS`
  - in `.tools(...)`, replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES` in the same tool position
  - in `.tools(...)`, replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT` in the same tool position
  - delete the entire `.overrideComponent(SystemPromptSection.AGENT_ROLE, gpt51ComponentOverrides[SystemPromptSection.AGENT_ROLE]!)` call
  - leave the matcher, template, every other component entry, remaining tool order, the surviving `RULES`, `TOOL_USE`, `ACT_VS_PLAN`, and `FEEDBACK` override wiring, placeholders, validation, comments, and exports unchanged

### `src/core/prompts/system-prompt/variants/native-gpt-5-1/template.ts`

Status: complete

- Lines `6`-`44`: rewrite the native GPT-5.1 prompt template in one pass so it renders only the foundational workflow prompt carriers with exact placeholder placement and separator preservation.
  - replace the first placeholder `{{${SystemPromptSection.AGENT_ROLE}}}` with `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}` in the same top-of-template position
  - delete the entire `TASK_PROGRESS` section block between `TOOL_USE` and `ACT_VS_PLAN`, including its placeholder and one adjacent `====` separator, so that `TOOL_USE` is followed directly by `ACT_VS_PLAN` using the existing single separator pattern
  - insert `{{${SystemPromptSection.WORKFLOW_INPUT}}}` immediately before `{{${SystemPromptSection.USER_INSTRUCTIONS}}}`, separated by the existing `====` pattern
  - leave `GPT_5_1_TEMPLATE_OVERRIDES = { BASE }` and every other surviving placeholder and separator block unchanged

### `src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts`

Status: complete

- Lines `7`-`8`, `48`-`58`, and `129`-`141`: rewrite the GPT-5.1 override surface in one pass so it no longer preserves standalone agent-role or task-progress component overrides.
  - delete `GPT5_1_AGENT_ROLE`
  - delete `GPT5_1_TASK_PROGRESS`
  - delete the `SystemPromptSection.AGENT_ROLE` override entry
  - delete the `SystemPromptSection.TASK_PROGRESS` override entry
  - leave `GPT5_1_RULES`, `GPT5_1_TOOL_USE`, `GPT5_1_ACT_VS_PLAN`, `GPT5_1_OBJECTIVE`, `GPT5_1_FEEDBACK`, and the remaining `gpt51ComponentOverrides` entries unchanged

### `src/core/prompts/system-prompt/variants/gemini-3/config.ts`

Status: complete

- Lines `32`-`92`: rewrite the Gemini 3 variant config in one pass so it uses only the foundational workflow prompt/tool surface with exact file-local component, tool, and override placement.
  - in `.components(...)`, replace the first entry `SystemPromptSection.AGENT_ROLE` with `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS`
  - in `.components(...)`, delete `SystemPromptSection.TASK_PROGRESS` and do not add any replacement in that position
  - in `.components(...)`, insert `SystemPromptSection.WORKFLOW_INPUT` immediately before `SystemPromptSection.USER_INSTRUCTIONS`
  - in `.tools(...)`, replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES` in the same tool position
  - in `.tools(...)`, replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT` in the same tool position
  - delete the entire `.overrideComponent(SystemPromptSection.AGENT_ROLE, gemini3ComponentOverrides[SystemPromptSection.AGENT_ROLE]!)` call
  - delete the entire `.overrideComponent(SystemPromptSection.TASK_PROGRESS, gemini3ComponentOverrides[SystemPromptSection.TASK_PROGRESS]!)` call
  - leave the matcher, template, every other component entry, remaining tool order, the surviving `TOOL_USE`, `EDITING_FILES`, `OBJECTIVE`, `RULES`, `FEEDBACK`, and `ACT_VS_PLAN` override wiring, placeholders, validation, comments, and exports unchanged

### `src/core/prompts/system-prompt/variants/gemini-3/template.ts`

Status: complete

- Lines `3`-`50`: rewrite the Gemini 3 prompt template in one pass so it renders only the foundational workflow prompt carriers with exact placeholder placement and separator preservation.
  - replace the first placeholder `{{${SystemPromptSection.AGENT_ROLE}}}` with `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}` in the same top-of-template position
  - leave the `TODO`, `ACT_VS_PLAN`, `CAPABILITIES`, `SKILLS`, and `EDITING_FILES` blocks in their current order and preserve the existing blank-line formatting around `EDITING_FILES`
  - delete the entire `TASK_PROGRESS` section block that currently follows `EDITING_FILES`, including its placeholder and its adjacent `====` separator
  - insert `{{${SystemPromptSection.WORKFLOW_INPUT}}}` immediately before `{{${SystemPromptSection.USER_INSTRUCTIONS}}}`, separated by the existing `====` pattern
  - leave every other surviving placeholder and separator block unchanged

### `src/core/prompts/system-prompt/variants/gemini-3/overrides.ts`

Status: complete

- Lines `6`-`7`, `215`-`223`, and `225`-`249`: rewrite the Gemini 3 override surface in one pass so it no longer preserves standalone agent-role or task-progress component overrides.
  - delete `GEMINI_3_AGENT_ROLE_TEMPLATE`
  - delete `GEMINI_3_UPDATING_TASK_PROGRESS_TEMPLATE`
  - delete the `SystemPromptSection.AGENT_ROLE` override entry
  - delete the `SystemPromptSection.TASK_PROGRESS` override entry
  - leave `GEMINI_3_TOOL_USE_TEMPLATE`, `GEMINI_3_EDITING_FILES_TEMPLATE`, `GEMINI_3_OBJECTIVE_TEMPLATE`, `GEMINI_3_RULES_TEMPLATE`, `GEMINI_3_FEEDBACK_TEMPLATE`, `GEMINI_3_ACT_VS_PLAN_TEMPLATE`, and the remaining `gemini3ComponentOverrides` entries unchanged

### `src/core/prompts/system-prompt/variants/glm/config.ts`

Status: complete

- Lines `23`-`77`: rewrite the GLM variant config in one pass so it uses only the foundational workflow prompt/tool surface with exact file-local component, tool, and override placement.
  - in `.components(...)`, replace the first entry `SystemPromptSection.AGENT_ROLE` with `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS`
  - in `.components(...)`, delete `SystemPromptSection.TASK_PROGRESS` and do not add any replacement in that position
  - in `.components(...)`, insert `SystemPromptSection.WORKFLOW_INPUT` immediately before `SystemPromptSection.USER_INSTRUCTIONS`
  - in `.tools(...)`, replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES` in the same tool position
  - in `.tools(...)`, replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT` in the same tool position
  - delete the entire `.overrideComponent(SystemPromptSection.TASK_PROGRESS, glmComponentOverrides[SystemPromptSection.TASK_PROGRESS])` call
  - leave the matcher, template, every other component entry, remaining tool order, the surviving `TOOL_USE`, `OBJECTIVE`, `RULES`, and `MCP` override wiring, placeholders, validation, comments, and exports unchanged

### `src/core/prompts/system-prompt/variants/glm/template.ts`

Status: complete

- Lines `3`-`27`: rewrite the GLM prompt template in one pass so it renders only the foundational workflow prompt carriers with exact placeholder placement and heading preservation.
  - replace the first placeholder `{{${SystemPromptSection.AGENT_ROLE}}}` with `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}` in the same top-of-template position
  - delete the entire heading block `## {{${SystemPromptSection.TASK_PROGRESS}}}`
  - insert `## {{${SystemPromptSection.WORKFLOW_INPUT}}}` immediately before `## {{${SystemPromptSection.USER_INSTRUCTIONS}}}`
  - leave every other surviving placeholder and heading line unchanged

### `src/core/prompts/system-prompt/variants/glm/overrides.ts`

Status: complete

- Lines `157`-`164` and `208`-`209`: delete the legacy task-progress override from the GLM override surface.
  - delete `GLM_TASK_PROGRESS_TEMPLATE`
  - delete the `SystemPromptSection.TASK_PROGRESS` override entry
  - leave `GLM_OBJECTIVE_TEMPLATE`, `GLM_TOOL_USE_TEMPLATE`, `GLM_RULES_TEMPLATE`, `GLM_MCP_TEMPLATE`, and the remaining `glmComponentOverrides` entries unchanged

### `src/core/prompts/system-prompt/variants/hermes/config.ts`

Status: complete

- Lines `24`-`80`: rewrite the Hermes variant config in one pass so it uses only the foundational workflow prompt/tool surface with exact file-local component, tool, and override placement.
  - in `.components(...)`, replace the first entry `SystemPromptSection.AGENT_ROLE` with `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS`
  - in `.components(...)`, delete `SystemPromptSection.TASK_PROGRESS` and do not add any replacement in that position
  - in `.components(...)`, insert `SystemPromptSection.WORKFLOW_INPUT` immediately before `SystemPromptSection.USER_INSTRUCTIONS`
  - in `.tools(...)`, replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES` in the same tool position
  - in `.tools(...)`, replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT` in the same tool position
  - delete the entire `.overrideComponent(SystemPromptSection.AGENT_ROLE, hermesComponentOverrides[SystemPromptSection.AGENT_ROLE])` call
  - delete the entire `.overrideComponent(SystemPromptSection.TASK_PROGRESS, hermesComponentOverrides[SystemPromptSection.TASK_PROGRESS])` call
  - leave the matcher, template, every other component entry, remaining tool order, the surviving `TOOL_USE`, `OBJECTIVE`, `RULES`, and `MCP` override wiring, placeholders, validation, comments, and exports unchanged

### `src/core/prompts/system-prompt/variants/hermes/template.ts`

Status: complete

- Lines `1`-`27`: rewrite this file in one pass so `baseTemplate` equals exactly the following placeholder and heading sequence, with no other file changes beyond that rewrite.
  - keep the import of `SystemPromptSection` unchanged
  - keep the export name `baseTemplate` unchanged
  - replace the current template body with exactly:
    - `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}`
    - blank line
    - `## {{${SystemPromptSection.TOOL_USE}}}`
    - blank line
    - `## {{${SystemPromptSection.RULES}}}`
    - blank line
    - `## {{${SystemPromptSection.ACT_VS_PLAN}}}`
    - blank line
    - `## {{${SystemPromptSection.CAPABILITIES}}}`
    - blank line
    - `## {{${SystemPromptSection.SKILLS}}}`
    - blank line
    - `## {{${SystemPromptSection.EDITING_FILES}}}`
    - blank line
    - `## {{${SystemPromptSection.TODO}}}`
    - blank line
    - `## {{${SystemPromptSection.MCP}}}`
    - blank line
    - `## {{${SystemPromptSection.SYSTEM_INFO}}}`
    - blank line
    - `## {{${SystemPromptSection.OBJECTIVE}}}`
    - blank line
    - `## {{${SystemPromptSection.WORKFLOW_INPUT}}}`
    - blank line
    - `## {{${SystemPromptSection.USER_INSTRUCTIONS}}}`
  - do not leave any `SystemPromptSection.AGENT_ROLE` placeholder in the file
  - do not leave any `SystemPromptSection.TASK_PROGRESS` placeholder in the file
  - do not add, remove, or reorder any other heading lines or placeholders beyond the exact sequence above

### `src/core/prompts/system-prompt/variants/hermes/overrides.ts`

Status: complete

- Lines `1`-`188`: rewrite this file in one pass so `hermesComponentOverrides` no longer preserves standalone agent-role or task-progress component overrides, with no other behavioral changes.
  - keep all four imports unchanged
  - delete the leading comment `// Hermes-specific system prompt component overrides - Nous recommends the thinking component be added explicitly for hermes-4`
  - delete the entire `HERMES_AGENT_ROLE_TEMPLATE` constant block
  - delete the entire `HERMES_TASK_PROGRESS_TEMPLATE` constant block
  - keep the export name `hermesComponentOverrides` unchanged
  - inside `hermesComponentOverrides`, delete the entire `[SystemPromptSection.AGENT_ROLE]: { template: HERMES_AGENT_ROLE_TEMPLATE }` entry block
  - inside `hermesComponentOverrides`, delete the entire `[SystemPromptSection.TASK_PROGRESS]: { template: HERMES_TASK_PROGRESS_TEMPLATE }` entry block
  - leave `HERMES_TOOL_USE_TEMPLATE`, `HERMES_OBJECTIVE_TEMPLATE`, `HERMES_MCP_TEMPLATE`, `HERMES_RULES_TEMPLATE`, and the remaining `hermesComponentOverrides` entries unchanged
  - do not add any replacement agent-role or task-progress constants, comments, or override entries

### `src/core/prompts/system-prompt/variants/devstral/config.ts`

Status: complete

- Lines `1`-`78`: rewrite this file in one pass so the Devstral variant config uses only the foundational workflow prompt/tool surface with exact component, tool, and override placement.
  - in the import block, delete `DEVSTRAL_AGENT_ROLE_TEMPLATE` from `./overrides`
  - leave every other import unchanged
  - in `.components(...)`, replace the first entry `SystemPromptSection.AGENT_ROLE` with `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS`
  - in `.components(...)`, delete `SystemPromptSection.TASK_PROGRESS` and do not add any replacement in that position
  - in `.components(...)`, insert `SystemPromptSection.WORKFLOW_INPUT` immediately before `SystemPromptSection.USER_INSTRUCTIONS`
  - do not reorder any other `.components(...)` entries
  - in `.tools(...)`, replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES` in the same tool position
  - in `.tools(...)`, replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT` in the same tool position
  - do not reorder any other `.tools(...)` entries
  - delete the entire `.overrideComponent(SystemPromptSection.AGENT_ROLE, { template: DEVSTRAL_AGENT_ROLE_TEMPLATE, })` call
  - do not add any replacement override wiring
  - leave the matcher, template, placeholders, validation, comments, `.config({})`, `.build()`, and exports unchanged

### `src/core/prompts/system-prompt/variants/devstral/template.ts`

Status: complete

- Lines `1`-`49`: rewrite this file in one pass so `baseTemplate` equals exactly the following placeholder and separator sequence, with no other file changes beyond that rewrite.
  - keep the import of `SystemPromptSection` unchanged
  - keep the export name `baseTemplate` unchanged
  - replace the current template body with exactly:
    - `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}`
    - blank line
    - `{{${SystemPromptSection.TOOL_USE}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.MCP}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.EDITING_FILES}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.ACT_VS_PLAN}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.CAPABILITIES}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.SKILLS}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.FEEDBACK}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.RULES}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.SYSTEM_INFO}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.OBJECTIVE}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.WORKFLOW_INPUT}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.USER_INSTRUCTIONS}}}`
  - do not leave any `SystemPromptSection.AGENT_ROLE` placeholder in the file
  - do not leave any `SystemPromptSection.TASK_PROGRESS` placeholder in the file
  - do not add, remove, or reorder any other placeholders or `====` separator lines beyond the exact sequence above

### `src/core/prompts/system-prompt/variants/devstral/overrides.ts`

Status: complete

- Existing file, whole file: delete `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/devstral/overrides.ts` entirely during Foundational Build.
  - remove the whole file rather than rewriting it in place
  - do not leave any `DEVSTRAL_AGENT_ROLE_TEMPLATE` export
  - do not leave any `devstralComponentOverrides` export
  - do not create any replacement file, stub module, empty export, or comment-only placeholder at this path
  - this file exists only to preserve the legacy standalone `AGENT_ROLE` override, so the foundational-build result for this path is file absence

### `src/core/prompts/system-prompt/variants/trinity/config.ts`

Status: complete

- Lines `1`-`84`: rewrite this file in one pass so the Trinity variant config uses only the foundational workflow prompt/tool surface with exact component and tool placement.
  - leave the import block unchanged
  - in `.components(...)`, replace the first entry `SystemPromptSection.AGENT_ROLE` with `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS`
  - in `.components(...)`, delete `SystemPromptSection.TASK_PROGRESS` and do not add any replacement in that position
  - in `.components(...)`, insert `SystemPromptSection.WORKFLOW_INPUT` immediately before `SystemPromptSection.USER_INSTRUCTIONS`
  - do not reorder any other `.components(...)` entries
  - in `.tools(...)`, replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES` in the same tool position
  - in `.tools(...)`, replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT` in the same tool position
  - do not reorder any other `.tools(...)` entries
  - leave the matcher, template, override wiring, placeholders, validation, comments, `.config({})`, `.build()`, and exports unchanged

### `src/core/prompts/system-prompt/variants/trinity/template.ts`

Status: complete

- Lines `1`-`49`: rewrite this file in one pass so `baseTemplate` equals exactly the following placeholder and separator sequence, with no other file changes beyond that rewrite.
  - keep the import of `SystemPromptSection` unchanged
  - keep the export name `baseTemplate` unchanged
  - replace the current template body with exactly:
    - `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}`
    - blank line
    - `{{${SystemPromptSection.TOOL_USE}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.MCP}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.EDITING_FILES}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.ACT_VS_PLAN}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.CAPABILITIES}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.SKILLS}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.FEEDBACK}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.RULES}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.SYSTEM_INFO}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.OBJECTIVE}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.WORKFLOW_INPUT}}}`
    - blank line
    - `====`
    - blank line
    - `{{${SystemPromptSection.USER_INSTRUCTIONS}}}`
  - do not leave any `SystemPromptSection.AGENT_ROLE` placeholder in the file
  - do not leave any `SystemPromptSection.TASK_PROGRESS` placeholder in the file
  - do not add, remove, or reorder any other placeholders or `====` separator lines beyond the exact sequence above

### `src/core/prompts/system-prompt/variants/xs/config.ts`

Status: complete

- Lines `1`-`96`: rewrite this file in one pass so the XS variant config uses only the foundational workflow prompt/tool surface with exact component, tool, and override placement.
  - leave the import block unchanged
  - in `.components(...)`, replace the first entry `SystemPromptSection.AGENT_ROLE` with `SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS`
  - in `.components(...)`, insert `SystemPromptSection.WORKFLOW_INPUT` immediately before `SystemPromptSection.USER_INSTRUCTIONS`
  - do not reorder any other `.components(...)` entries
  - in `.tools(...)`, replace `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS` with `ClineDefaultTool.SET_WORKFLOW_VALUES` in the same tool position
  - in `.tools(...)`, replace `ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT` with `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT` in the same tool position
  - do not reorder any other `.tools(...)` entries
  - delete the entire `.overrideComponent(SystemPromptSection.AGENT_ROLE, { template: xsComponentOverrides.AGENT_ROLE, })` call
  - leave the remaining override wiring unchanged
  - leave the matcher, template, placeholders, validation, comments, `.config({})`, `.build()`, and exports unchanged

### `src/core/prompts/system-prompt/variants/xs/template.ts`

Status: complete

- Lines `1`-`21`: rewrite this file in one pass so `baseTemplate` equals exactly the following placeholder and heading sequence, with no other file changes beyond that rewrite.
  - keep the import of `SystemPromptSection` unchanged
  - keep the export name `baseTemplate` unchanged
  - replace the current template body with exactly:
    - `{{${SystemPromptSection.WORKFLOW_SYSTEM_INSTRUCTIONS}}}`
    - blank line
    - `## {{${SystemPromptSection.RULES}}}`
    - blank line
    - `## {{${SystemPromptSection.ACT_VS_PLAN}}}`
    - blank line
    - `## {{${SystemPromptSection.CAPABILITIES}}}`
    - blank line
    - `## {{${SystemPromptSection.SKILLS}}}`
    - blank line
    - `## {{${SystemPromptSection.EDITING_FILES}}}`
    - blank line
    - `## {{${SystemPromptSection.TOOL_USE}}}`
    - blank line
    - `## {{${SystemPromptSection.OBJECTIVE}}}`
    - blank line
    - `## {{${SystemPromptSection.SYSTEM_INFO}}}`
    - blank line
    - `## {{${SystemPromptSection.WORKFLOW_INPUT}}}`
    - blank line
    - `## {{${SystemPromptSection.USER_INSTRUCTIONS}}}`
  - do not leave any `SystemPromptSection.AGENT_ROLE` placeholder in the file
  - do not add, remove, or reorder any other placeholders or heading lines beyond the exact sequence above

### `src/core/prompts/system-prompt/variants/xs/overrides.ts`

Status: complete

- Lines `77`-`81`: rewrite `xsComponentOverrides` in one pass so the XS variant no longer preserves a standalone generic identity block outside the workflow runtime prompt projection.
  - delete the `AGENT_ROLE` property from `xsComponentOverrides`
  - leave the surviving `RULES`, `ACT_VS_PLAN`, `CAPABILITIES`, `OBJECTIVE`, `EDITING_FILES`, and `TOOL_USE` overrides unchanged

### `src/core/prompts/system-prompt/variants/variant-validator.ts`

Status: complete

- Lines `169`-`193`: rewrite `validateBestPractices(...)` in one pass so variant validation no longer assumes a standalone `AGENT_ROLE` section exists.
  - replace `const recommendedComponents = [SystemPromptSection.AGENT_ROLE, SystemPromptSection.RULES, SystemPromptSection.SYSTEM_INFO]` with exactly `const recommendedComponents = [SystemPromptSection.RULES, SystemPromptSection.SYSTEM_INFO]`
  - delete the declaration `const agentRoleIndex = variant.componentOrder.indexOf(SystemPromptSection.AGENT_ROLE)`
  - delete the declaration `const toolUseIndex = variant.componentOrder.indexOf(SystemPromptSection.TOOL_USE)`
  - delete the entire `if (agentRoleIndex > 0) { warnings.push("AGENT_ROLE should typically be the first component") }` block
  - delete the entire `if (toolUseIndex >= 0 && agentRoleIndex >= 0 && toolUseIndex < agentRoleIndex) { warnings.push("TOOL_USE should typically come after AGENT_ROLE") }` block
  - leave the missing-recommended-components warning, description-length warning, version-label warning, and every other method in the file unchanged


## Phase 6: Focus Chain And Webview Consumers

### `src/core/task/focus-chain/index.ts`

Status: complete

- Lines `1`-`999`: rewrite `FocusChainManager` in one pass so `src/core/task/focus-chain/index.ts` becomes only the downstream workflow checklist/status projection surface required by the foundational architecture. Treat this row as the only implementation authority for this file during this step; do not inspect adjacent placeholder-workflow, managed-workflow, deterministic-progression, story-task, or workflow-runtime files to infer extra behavior. In this phase, this file must consume runtime-owned workflow checklist projection only through `taskState.currentFocusChainChecklist` plus canonical workflow presence on `taskState.activeWorkflowName`; do not add a direct `WorkflowRuntime` import or invent a new runtime API here.
  - in the import block:
    - delete `getTaskMetadata` and `saveTaskMetadata` from `@/core/storage/disk`
    - delete `buildCurrentStoryTaskPrompt`, `buildTestingRequirementsPrompt`, and `resolveActiveStoryPath` from `@/core/task/story-tools/storyTaskDocument`
    - delete `buildPlaceholderWorkflowChecklist`, `getActivePlaceholderWorkflowChecklistLabel`, and `getActivePlaceholderWorkflowStepDetails` from `@/core/workflows/placeholder-workflow-step-details`
    - delete `findUnresolvedWorkflowPlaceholders` from `@/core/workflows/workflow-placeholders`
    - delete `renderManagedWorkflowTaskProgress` from `../managed-workflows/ManagedWorkflowRenderer`
    - delete `isFocusChainCompleteNextStepSentinel` from `@/shared/focus-chain-utils`
    - delete `applyDeterministicPlaceholderProgression`, `type DeterministicPlaceholderToolContext`, and `isDeterministicPlaceholderWorkflowSupported` from `./deterministicPlaceholderProgression`
    - delete `buildFocusChainChecklistRejectionFeedback`, `buildFocusChainMissingChecklistDirectiveFeedback`, `evaluateFocusChainChecklistUpdate`, `extractFocusChainItemsFromText`, and `extractFocusChainListFromText` from `./file-utils`
    - delete `FocusChainPrompts` from `./prompts`
    - leave `FocusChainSettings`, `chokidar`, `fs`, `path`, `telemetryService`, `Logger`, `ClineSay`, `Mode`, `writeFile`, `ensureTaskDirectoryExists`, `StateManager`, `TaskState`, `logFocusChainDiagnosticEvent`, `summarizeFocusChainText`, `summarizeFocusChainTextBlocks`, `createFocusChainMarkdownContent`, `type FocusChainStorageIdentity`, `getFocusChainFilePath`, `type FocusChainChecklistUpdateResult`, and `parseFocusChainListCounts` unchanged
  - keep the exported interfaces `FocusChainDependencies` and `FocusChainInstructionDecision`, and keep the exported class name `FocusChainManager`, unchanged
  - keep `FocusChainDependencies` unchanged in this step
  - in `FocusChainInstructionDecision`, rename the field `placeholderWorkflowActive` to exactly `workflowActive`
  - do not leave any exported interface field, local variable, diagnostics payload field, or other identifier named `placeholderWorkflowActive` in this file after the rewrite
  - delete these private helper methods entirely:
    - `normalizePlaceholderWorkflowSourceName(...)`
    - `clearActiveStoryTaskPromptState(...)`
    - `consumeAutoCompletedPlaceholderWorkflowNoticesForPrompt(...)`
    - `buildPlaceholderWorkflowStatusPrompt(...)`
    - `persistPlaceholderWorkflowMetadata(...)`
    - `applyDeterministicPlaceholderWorkflowProgressionIfNeeded(...)`
  - keep `joinPromptSections(...)`, `renderChecklistForPrompt(...)`, `resolveFocusChainFilePath(...)`, `setupFocusChainFileWatcher(...)`, `updateFCListFromMarkdownFileAndNotifyUI(...)`, `restoreCurrentChecklistFromDisk(...)`, `logPromptAssemblySnapshot(...)`, `logFocusChainDecision(...)`, `logGeneratedFocusChainInstructions(...)`, `logFinalPromptContentSummary(...)`, `readFocusChainFromDisk(...)`, `writeFocusChainToDisk(...)`, `updateFCListFromToolResponse(...)`, `checkIncompleteProgressOnCompletion(...)`, and `dispose()` as the surviving generic focus-chain surface in this step
  - keep the public method name `consumeCurrentPlaceholderWorkflowStepPromptForInput(...)` for compatibility with current callers during this step, but rewrite it into a compatibility no-op:
    - keep the existing signature unchanged
    - return `undefined` immediately
    - do not read or mutate placeholder-workflow state, story-task state, or prompt-marker state in this method
  - keep the public method names `refreshManagedWorkflowChecklistProjection(...)`, `refreshPlaceholderWorkflowChecklistProjection(...)`, `clearManagedWorkflowChecklistProjection(...)`, and `clearPlaceholderWorkflowChecklistProjection(...)` for compatibility with current callers during this step, but rewrite them into generic runtime-projection shims:
    - `refreshManagedWorkflowChecklistProjection(...)` and `refreshPlaceholderWorkflowChecklistProjection(force = false)` must both ignore managed/placeholder distinctions and synchronize only the already-projected `taskState.currentFocusChainChecklist` value to disk/UI
    - if `taskState.currentFocusChainChecklist` is `null`, each refresh method must delegate to its matching clear method
    - `clearManagedWorkflowChecklistProjection(...)` and `clearPlaceholderWorkflowChecklistProjection(...)` must both clear `taskState.currentFocusChainChecklist`, set `taskState.todoListWasUpdatedByUser = false`, set `taskState.apiRequestsSinceLastTodoUpdate = 0`, attempt `fs.unlink(...)` on the resolved focus-chain file path, ignore missing-file errors, and then `await this.postStateToWebview()`
    - keep both public method names and signatures unchanged in this step even though their behavior is now identical
  - rewrite `getFocusChainInstructionsDecision()` to return exactly:
    - `shouldInclude: false`
    - `inPlanMode: false`
    - `workflowActive: !!this.taskState.activeWorkflowName`
    - `justSwitchedFromPlanMode: false`
    - `userUpdatedList: false`
    - `reachedReminderInterval: false`
    - `isFirstApiRequest: false`
    - `hasNoTodoListAfterMultipleRequests: false`
  - in both `getFocusChainInstructionsDecision()` and `shouldIncludeFocusChainInstructions()`, replace any local variable named `placeholderWorkflowActive` with `workflowActive`; if a boolean helper variable is still needed, it must be named `workflowActive`
  - rewrite `generateFocusChainInstructions()` to return exactly the empty string `""`
  - rewrite `shouldIncludeFocusChainInstructions()` to return exactly `false`
  - rewrite `setupFocusChainFileWatcher()` and `updateFCListFromMarkdownFileAndNotifyUI()` so the file watcher remains but disk content no longer mutates canonical checklist state:
    - keep the watcher setup, debounce timer, unlink handling, error logging, and `postStateToWebview()` flow in place
    - do not read checklist markdown from disk inside `updateFCListFromMarkdownFileAndNotifyUI()`
    - do not set `taskState.currentFocusChainChecklist` from disk inside watcher callbacks
    - do not set `taskState.todoListWasUpdatedByUser = true` from disk watcher activity
    - the debounced watcher body must only `await this.postStateToWebview()` and emit no telemetry beyond existing watcher/logging behavior
  - rewrite `restoreCurrentChecklistFromDisk()` so disk is no longer treated as the source of truth:
    - return `this.taskState.currentFocusChainChecklist ?? null`
    - do not read the focus-chain file from disk
    - do not mutate `taskState.todoListWasUpdatedByUser`
    - do not mutate `taskState.apiRequestsSinceLastTodoUpdate`
  - rewrite `logPromptAssemblySnapshot(...)` so it no longer reads placeholder-workflow state:
    - keep the existing method signature unchanged
    - keep logging `providerId`, `modelId`, `useCompactPrompt`, `reducedEnvironmentDetails`, `focusChainManagerPresent`, `currentFocusChainChecklistPresent`, `currentFocusChainChecklistItemCount`, `apiRequestCount`, and `apiRequestsSinceLastTodoUpdate`
    - replace placeholder-specific payload fields with exactly:
      - `activeWorkflowName: this.taskState.activeWorkflowName ?? null`
      - `activeWorkflowSessionPresent: !!this.taskState.activeWorkflowSession`
    - delete payload fields `activePlaceholderWorkflowId`, `activePlaceholderWorkflowSourcePresent`, `placeholderWorkflowJustStarted`, and `placeholderActivationInstructionsAppended`
  - keep `logFocusChainDecision(...)`, `logGeneratedFocusChainInstructions(...)`, and `logFinalPromptContentSummary(...)` unchanged except for any type fallout caused by the other prescribed edits above
  - keep `readFocusChainFromDisk()` as a private generic disk helper, but remove checklist extraction/parsing from it:
    - read the resolved file path as UTF-8
    - return the raw file contents string when the read succeeds
    - return `null` on read failure
    - do not call `extractFocusChainListFromText(...)` or `extractFocusChainItemsFromText(...)`
  - keep `writeFocusChainToDisk(todoList)` unchanged except for any import fallout caused by the other prescribed edits above
  - rewrite `updateFCListFromToolResponse(...)` so it becomes only a runtime-projected checklist sync seam and no longer interprets AI-authored checklist mutations:
    - change the signature to exactly `public async updateFCListFromToolResponse(taskProgress: string | undefined): Promise<FocusChainChecklistUpdateResult>`
    - ignore the `taskProgress` argument entirely
    - do not read checklist text from `taskProgress`
    - do not call `evaluateFocusChainChecklistUpdate(...)`
    - do not accept or reject `__COMPLETE_NEXT_STEP__`
    - do not restore checklist state from disk when `taskProgress` is absent
    - do not branch on `taskState.managedWorkflowRun` or `taskState.activePlaceholderWorkflowSource`
    - if `taskState.currentFocusChainChecklist` is falsy, clear `taskState.currentFocusChainChecklist`, reset `todoListWasUpdatedByUser` and `apiRequestsSinceLastTodoUpdate`, attempt `fs.unlink(...)` on the resolved focus-chain file path, ignore missing-file errors, `await this.postStateToWebview()`, and return `{ accepted: true }`
    - if `taskState.currentFocusChainChecklist` is present, treat it as canonical runtime projection: set `apiRequestsSinceLastTodoUpdate = 0`, set `todoListWasUpdatedByUser = false`, capture the existing first/update telemetry using `parseFocusChainListCounts(...)`, attempt to write the checklist to disk via `writeFocusChainToDisk(...)`, call `await this.say("task_progress", checklist)` whether or not the write succeeds, then `await this.postStateToWebview()` and return `{ accepted: true }`
    - on unexpected exception, keep the existing failure return shape `{ accepted: false, feedback: "Failed to update task progress." }`
  - keep `checkIncompleteProgressOnCompletion(...)` and `dispose()` unchanged
  - do not read or branch on these task-state fields anywhere in the rewritten file:
    - `managedWorkflowRun`
    - `activePlaceholderWorkflowSource`
    - `activePlaceholderWorkflowStableValues`
    - `activePlaceholderWorkflowValues`
    - `activePlaceholderWorkflowDeterministicState`
    - `activePlaceholderWorkflowTaskWriteProofPaths`
    - `pendingAutoCompletedPlaceholderWorkflowStepNotices`
    - `lastPromptedPlaceholderWorkflowChecklistLabel`
    - `activeStoryTaskId`
    - `activeStorySubtaskIds`
    - `lastPromptedStoryTaskKey`
    - `completedNextStepUpdatesThisTurn`
    - `didRespondToPlanAskBySwitchingMode`
  - do not emit any prompt text in this file telling the model to create, update, or advance `task_progress`

### `proto/cline/file.proto`

Status: complete

- Lines `73`-`74`: delete the legacy focus-chain file-open RPC in one pass. Delete the comment `Opens or creates a focus chain checklist markdown file for editing` and `rpc openFocusChainFile(StringRequest) returns (Empty);` so no live proto service seam remains for the retired focus-chain file-open/bootstrap path.

### `webview-ui/src/components/chat/task-header/FocusChain.tsx`

Status: complete

- Lines `1`-`225`: remove the retired focus-chain file-open behavior in one pass while preserving the downstream checklist/status UI and avoiding any caller changes in this step.
  - delete the imports of `StringRequest` and `FileServiceClient`
  - keep `FocusChainProps` unchanged in this step, including `currentTaskItemId?: string`, so no caller rewiring is required yet
  - delete `CLICK_TO_EDIT_TITLE`
  - in `FocusChain`, stop destructuring `currentTaskItemId` from props and destructure only `lastProgressMessageText` and `showPlaceholderWhenEmpty`
  - delete `handleEditClick(...)` entirely
  - remove the root container `title={CLICK_TO_EDIT_TITLE}` affordance
  - remove the expanded checklist `onClick={handleEditClick}` wiring by leaving the expanded checklist wrapper `<div>` in place without any click handler
  - leave checklist parsing, expand/collapse behavior, `ToDoListHeader`, `ChecklistRenderer`, placeholder rendering, and the custom `memo(...)` comparison unchanged
  - after the rewrite, no import, helper, event handler, title affordance, or RPC call for `openFocusChainFile` may remain in this file

### `src/core/controller/file/openFocusChainFile.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller/proto rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/controller/file/openFocusChainFile.ts`
  - do not preserve `openFocusChainFile(...)`
  - do not preserve `openFileIntegration`
  - do not preserve `telemetryService.captureFocusChainListOpened(...)`
  - do not preserve `ensureFocusChainFile(...)`
  - do not preserve `extractFocusChainListFromText(...)`
  - do not preserve the latest-`task_progress`-message bootstrap logic
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or runtime-projection alternative

### `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`

Status: complete

- Lines `1`-`71`: rewrite the workflow-form and workflow-start-card request-builder block in one pass so it matches the foundational shared message/proto contracts, using only the exact contracts named here.
  - in the `@shared/ExtensionMessage` import, replace `ClineWorkflowForm` and `ClineWorkflowStartCard` with `WorkflowForm` and `WorkflowStartCard`; leave `WorkflowFormFieldDefinition` imported
  - in the `@shared/proto/cline/task` import, add `WorkflowStartCardProjectMode`
  - change `buildWorkflowFormSubmissionRequest(...)` and `submitWorkflowForm(...)` to use `WorkflowForm`
  - change `buildWorkflowStartCardSubmissionRequest(...)` and `submitWorkflowStartCard(...)` to use `WorkflowStartCard`
  - in `buildWorkflowStartCardSubmissionRequest(...)`, return `WorkflowStartCardSubmissionRequest.create({...})` with exactly:
    - `sessionId: workflowStartCard.sessionId`
    - `action: WorkflowStartCardAction.WORKFLOW_START_CARD_ACTION_SUBMIT`
    - `projectMode: workflowStartCard.projectMode === "existing" ? WorkflowStartCardProjectMode.WORKFLOW_START_CARD_PROJECT_MODE_EXISTING : workflowStartCard.projectMode === "new" ? WorkflowStartCardProjectMode.WORKFLOW_START_CARD_PROJECT_MODE_NEW : WorkflowStartCardProjectMode.WORKFLOW_START_CARD_PROJECT_MODE_UNSPECIFIED`
    - `selectedExistingProject: workflowStartCard.selectedExistingProject ?? ""`
    - `newProjectTitle: workflowStartCard.newProjectTitle ?? ""`
  - leave `buildWorkflowFormSubmissionRequest(...)`, `submitWorkflowForm(...)`, `submitWorkflowStartCard(...)`, `serializeWorkflowFormFieldValue(...)`, and the other generic value serializers otherwise unchanged
  - do not add resolver-era branching or workflow-specific logic anywhere else in this file

### `webview-ui/src/components/chat/ChatRow.tsx`

Status: complete

- Lines `1`-`17`, `328`-`388`, `568`-`635`, `640`-`703`, `1701`-`1702`, and `1890`-`1894`: rewrite this file in one pass so `ChatRow` consumes the renamed shared workflow message contracts and renders the foundational project-selection workflow start-card UI.
  - in the `@shared/ExtensionMessage` import, replace `ClineWorkflowForm` and `ClineWorkflowStartCard` with `WorkflowForm` and `WorkflowStartCard`; leave the other imports unchanged
  - in the `workflowStartCard` `useMemo(...)`, keep the existing message-kind guard, but parse `message.text` as `WorkflowStartCard`
  - in the `workflowForm` `useMemo(...)`, keep the existing message-kind guard, but parse `message.text` as `WorkflowForm`
  - keep `workflowStartCardSubmissionPending`, and add controlled local state for exactly:
    - `workflowStartCardProjectMode`
    - `workflowStartCardSelectedExistingProject`
    - `workflowStartCardNewProjectTitle`
  - replace the existing `useEffect(...)` that only resets `workflowStartCardSubmissionPending` so it now also syncs those three local state values from the current `workflowStartCard` payload using:
    - `workflowStartCard?.projectMode ?? "new"`
    - `workflowStartCard?.selectedExistingProject ?? ""`
    - `workflowStartCard?.newProjectTitle ?? ""`
  - replace `handleWorkflowStartCardContinue(...)` with `handleWorkflowStartCardSubmit(...)`; keep the existing pending/error handling structure, but call `submitWorkflowStartCard(...)` with a cloned payload whose `projectMode`, `selectedExistingProject`, and `newProjectTitle` come from the controlled local state
  - in `renderWorkflowStartCardContent(...)`, keep the outer card container, header, title, and `MarkdownRow` rendering unchanged, but replace the continue-only action area with controlled project-selection UI:
    - render two radio inputs named `workflow-start-card-project-mode` for `"new"` and `"existing"`
    - when the selected mode is `"existing"`, render a `<select>` with a placeholder option `Select an existing project` and populate the remaining options from `workflowStartCard.existingProjectOptions`
    - treat each `workflowStartCard.existingProjectOptions` entry as the shared object shape `{ value: string; label: string }`, not as a plain string
    - render each populated existing-project option exactly as `<option key={option.value} value={option.value}>{option.label}</option>`
    - do not use `any`, string coercion, or object stringification anywhere in this option mapping
    - when the selected mode is `"new"`, render a text `<input>` bound to `workflowStartCardNewProjectTitle`
    - use the same input class string already used by `renderWorkflowFormField(...)` for the new `<select>` and `<input>`
    - render the submit button label from `workflowStartCard.submitLabel`, not any legacy `ctaLabel`
    - disable the submit button when `workflowStartCardSubmissionPending === true`
    - also disable submit when:
      - mode is `"existing"` and `workflowStartCardSelectedExistingProject.trim()` is empty
      - mode is `"new"` and `workflowStartCardNewProjectTitle.trim()` is empty
  - keep workflow-form reset behavior, workflow-form rendering, workflow-step-resolution rendering, and both workflow render switch cases unchanged apart from the type and start-card UI fallout required above
  - after the rewrite, no `ClineWorkflowForm`, `ClineWorkflowStartCard`, or `workflowStartCard.ctaLabel` reference may remain in this file


## Phase 7: Late Legacy Retirements After Rewiring

### `src/core/task/workflow-activation.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/workflow-activation.ts`
  - do not preserve `ManagedWorkflowActivationResult`
  - do not preserve `PlaceholderWorkflowActivationResult`
  - do not preserve `activateManagedWorkflowInTaskState(...)`
  - do not preserve `activatePlaceholderWorkflowInTaskState(...)`
  - do not preserve `renderActivePlaceholderWorkflowReminder(...)`
  - do not preserve `buildActivePlaceholderWorkflowActivationInstructions(...)`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/workflows/resolution/resolveAvailableWorkflows.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/workflows/resolution/resolveAvailableWorkflows.ts`
  - do not preserve `ResolvedWorkflowSource`
  - do not preserve `ResolvedWorkflowEntry`
  - do not preserve `WorkflowResolutionOptions`
  - do not preserve `resolveAvailableWorkflows(...)`
  - do not preserve `resolveWorkflowByName(...)`
  - do not preserve `findResolvedWorkflowByName(...)`
  - do not preserve `createWorkflowSkillMetadata(...)`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/workflows/resolution/loadResolvedWorkflowContent.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/workflows/resolution/loadResolvedWorkflowContent.ts`
  - do not preserve `LoadedResolvedWorkflowContent`
  - do not preserve `loadResolvedWorkflowContent(...)`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/workflows/placeholder-workflow-rendering.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/workflows/placeholder-workflow-rendering.ts`
  - do not preserve `PlaceholderWorkflowValueMap`
  - do not preserve `getPlaceholderWorkflowValueMap(...)`
  - do not preserve `resolvePlaceholderWorkflowText(...)`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/workflows/placeholder-workflow-step-details.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/workflows/placeholder-workflow-step-details.ts`
  - do not preserve `ActivePlaceholderWorkflowSource`
  - do not preserve `ActivePlaceholderWorkflowStepDetails`
  - do not preserve `ActivePlaceholderWorkflowPromptContext`
  - do not preserve `buildActivePlaceholderWorkflowSource(...)`
  - do not preserve `isSameActivePlaceholderWorkflowSource(...)`
  - do not preserve `getActivePlaceholderWorkflowStepDetails(...)`
  - do not preserve `getActivePlaceholderWorkflowChecklistLabel(...)`
  - do not preserve `resolveActivePlaceholderWorkflowPromptContext(...)`
  - do not preserve `buildPlaceholderWorkflowChecklist(...)`
  - do not preserve `getRenderedActivePlaceholderWorkflowSourceContents(...)`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/workflows/workflow-placeholders.ts`

Status: complete

- Lines `1`-`163`: delete this file during Foundational Build. Delete `WorkflowPlaceholderMap`, `CANONICAL_WORKFLOW_CONFIG_RELATIVE_PATH`, `toWorkflowPlaceholderString(...)`, `resolveWorkflowPlaceholderText(...)`, `mergeWorkflowPlaceholderMaps(...)`, `findUnresolvedWorkflowPlaceholders(...)`, `extractWorkflowPlaceholderKeys(...)`, `getCanonicalWorkflowConfigPath(...)`, and `buildWorkflowStablePlaceholders(...)`. Do not preserve YAML config loading, placeholder-token resolution, placeholder-map merging, unresolved-placeholder scanning, key extraction, or stable-placeholder assembly here as dead code or reference material.

### `src/core/task/workflowCompletionRunner.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/workflowCompletionRunner.ts`
  - do not preserve `WorkflowCompletionRunnerArgs`
  - do not preserve `WorkflowCompletionRunnerCompletedResult`
  - do not preserve `WorkflowCompletionRunnerResult`
  - do not preserve `checklistHasIncompleteStep(...)`
  - do not preserve `checklistIsFullyComplete(...)`
  - do not preserve `workflowCompletionRunner(...)`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/workflowCompletionHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/workflowCompletionHandler.ts`
  - do not preserve `WorkflowCompletionHandlerResult`
  - do not preserve `WorkflowCompletionHandlerRegistryEntry`
  - do not preserve `workflowCompletionHandlerRegistry`
  - do not preserve `WorkflowCompletionHandlerArgs`
  - do not preserve `workflowCompletionHandler(...)`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/bmad-agent-mode.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/bmad-agent-mode.ts`
  - do not preserve `WorkflowReminderEntry`
  - do not preserve `WorkflowReminderConfig`
  - do not preserve `WORKFLOW_REMINDERS_PATH`
  - do not preserve `getBmadWorkflowReminder(...)`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts`
  - do not preserve `ARTIFACT_PLACEHOLDER_KEYS`
  - do not preserve `parseWorkflowPlaceholderValues(...)`
  - do not preserve `getWorkflowPlaceholderValues(...)`
  - do not preserve `normalizeArtifactPlaceholderPath(...)`
  - do not preserve `normalizeArtifactWorkflowPlaceholders(...)`
  - do not preserve `getNextStepGuidance(...)`
  - do not preserve `WorkflowPlaceholderPersistenceResult`
  - do not preserve `applyGenericWorkflowPlaceholders(...)`
  - do not preserve `persistWorkflowPlaceholderValues(...)`
  - do not preserve `SetWorkflowPlaceholdersToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `BuildEpicsDocumentToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `POPULATE_STORY_DOCUMENT_ERROR`
  - do not preserve `BuildStoryDocumentToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/BuildReviewDiffOutputToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/BuildReviewDiffOutputToolHandler.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `BuildReviewDiffOutputToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `POPULATE_DELIVERY_SPEC_ERROR`
  - do not preserve `BuildEpicDeliverySpecToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `BuildTechSpecDocumentToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/CreateBrainstormingSessionToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/CreateBrainstormingSessionToolHandler.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `CreateBrainstormingSessionToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `CaptureBrainstormingTopicToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/RequestBrainstormingTechniqueSuggestionToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/RequestBrainstormingTechniqueSuggestionToolHandler.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `TECHNIQUE_SUGGESTION_SENTINEL`
  - do not preserve `resolveActiveBrainstormingStepFour(...)`
  - do not preserve `isBrainstormingStepFour(...)`
  - do not preserve `RequestBrainstormingTechniqueSuggestionToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/SelectBrainstormingSessionToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/SelectBrainstormingSessionToolHandler.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `resolveActiveBrainstormingStepTwo(...)`
  - do not preserve `SelectBrainstormingSessionToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/SelectRandomBrainstormingTechniqueToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/SelectRandomBrainstormingTechniqueToolHandler.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `resolveActiveBrainstormingStepFour(...)`
  - do not preserve `isBrainstormingStepFour(...)`
  - do not preserve `SelectRandomBrainstormingTechniqueToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/PersistBrainstormingApproachToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/PersistBrainstormingApproachToolHandler.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `resolveActiveBrainstormingStepFour(...)`
  - do not preserve `isBrainstormingStepFour(...)`
  - do not preserve `PersistBrainstormingApproachToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/PersistBrainstormingTechniqueToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/PersistBrainstormingTechniqueToolHandler.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `resolveActiveBrainstormingStepFour(...)`
  - do not preserve `isBrainstormingStepFour(...)`
  - do not preserve `buildTechniqueSectionBody(...)`
  - do not preserve `PersistBrainstormingTechniqueToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/ContinueBrainstormingSessionToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/ContinueBrainstormingSessionToolHandler.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `resolveActiveBrainstormingStepTwo(...)`
  - do not preserve `ContinueBrainstormingSessionToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `extractEpicLabels(...)`
  - do not preserve `resolveActivePiPlanningStepTwo(...)`
  - do not preserve `resolveEpicsDocumentPath(...)`
  - do not preserve `SelectTargetEpicToolHandler`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, or reduced helper

### `src/core/task/workflow-start-card/WorkflowStartCardRegistry.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/workflow-start-card/WorkflowStartCardRegistry.ts`
  - do not preserve any imports in this file
  - do not preserve `workflowStartCardRegistry`
  - do not preserve `getWorkflowStartCardRegistryEntry(...)`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, reduced helper, or replacement static registry

### `src/core/prompts/system-prompt/components/agent_role.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/prompts/system-prompt/components/agent_role.ts`
  - do not preserve any imports in this file
  - do not preserve `AGENT_ROLE`
  - do not preserve `getAgentRoleSection(...)`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, reduced helper, or replacement generic persona component

### `src/core/prompts/system-prompt/components/task_progress.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/prompts/system-prompt/components/task_progress.ts`
  - do not preserve any imports in this file
  - do not preserve `UPDATING_TASK_PROGRESS`
  - do not preserve `UPDATING_TASK_PROGRESS_NATIVE_NEXT_GEN`
  - do not preserve `UPDATING_TASK_PROGRESS_NATIVE_GPT5`
  - do not preserve `UPDATING_TASK_PROGRESS_WORKFLOW_PROGRESS_REQUEST`
  - do not preserve `UPDATING_TASK_PROGRESS_PLACEHOLDER_WORKFLOW`
  - do not preserve `getUpdatingTaskProgress(...)`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, reduced helper, or replacement `task_progress` prompt component

### `src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts`
  - do not preserve any imports in this file
  - do not preserve `id`
  - do not preserve `generic`
  - do not preserve `set_workflow_placeholders_variants`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, reduced helper, or replacement placeholder-era prompt tool schema

### `src/core/prompts/system-prompt/tools/build_review_diff_output.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/prompts/system-prompt/tools/build_review_diff_output.ts`
  - do not preserve any imports in this file
  - do not preserve `id`
  - do not preserve `generic`
  - do not preserve `build_review_diff_output_variants`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, reduced helper, or replacement workflow-specific diff prompt schema

### `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper functions in this file
  - do not preserve `DeterministicPlaceholderToolContext`
  - do not preserve `DeterministicPlaceholderProgressionResult`
  - do not preserve `isDeterministicPlaceholderWorkflowSupported(...)`
  - do not preserve `applyDeterministicPlaceholderProgression(...)`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, reduced helper, or replacement placeholder-era deterministic progression seam

### `src/core/task/focus-chain/updateFromToolResponse.ts`

Status: complete

- Whole file: delete this file in one pass. Treat this row as the only implementation authority for this step and do not inspect callers or adjacent files to decide whether deletion is allowed; for this step, assume the required caller rewiring has already been handled by its own rows elsewhere in the implementation order.
  - delete the file entirely from disk at `src/core/task/focus-chain/updateFromToolResponse.ts`
  - do not preserve any imports in this file
  - do not preserve any local helper contracts in this file
  - do not preserve `TaskProgressCarrier`
  - do not preserve `TaskProgressUpdateOptions`
  - do not preserve `PreToolTaskProgressUpdateResult`
  - do not preserve `PostToolTaskProgressUpdateResult`
  - do not preserve `applyPreToolTaskProgressUpdate(...)`
  - do not preserve `applyPostToolTaskProgressUpdate(...)`
  - do not replace this file with a stub, compatibility shim, deprecated wrapper, reduced helper, or replacement placeholder-era task-progress wrapper seam


## Phase 8: Verification, Deletion Coverage, And Snapshot Refresh

### `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

Status: complete

- New file, whole file:
  - create the new test file at `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
  - use `mocha`/`chai` style exactly:
    - import `expect` from `chai`
    - import `describe`, `it`, `beforeEach`, and `afterEach` from `mocha`
    - import `* as sinon` from `sinon`
  - import exactly the seams this suite must exercise and stub:
    - `TaskState` from `@/core/task/TaskState`
    - `WorkflowRuntime` from `../WorkflowRuntime`
    - `type ActiveWorkflowSession`, `type WorkflowDefinition`, `type WorkflowStepDefinition`, and `type WorkflowValues` from `../types`
    - `type ClineToolSpec` from `@/core/prompts/system-prompt/spec`
    - `type WorkflowFormDefinitionPayload` and `type WorkflowFormPanelDefinition` from `@shared/ExtensionMessage`
    - `WorkflowFormAction`, `WorkflowFormSubmissionRequest`, `WorkflowStartCardAction`, `type WorkflowStartCardProjectMode`, and `type WorkflowStartCardSubmissionRequest` from `@shared/proto/cline/task`
    - `ClineDefaultTool` from `@/shared/tools`
    - `type WorkflowStepResolutionDefinition` from `@/core/task/workflow-step-resolution/types`
    - namespace-import `* as WorkflowRegistry` from `../WorkflowRegistry`
    - namespace-import `* as WorkflowDiscovery` from `../discovery`
    - `mkdtemp`, `rm`, and `access` from `fs/promises`
    - `tmpdir` from `os`
    - `join` from `path`
  - call only this exact public `WorkflowRuntime` surface from the test body:
    - `await runtime.activateWorkflow({ taskState, workflow, parentSession? })`
    - `await runtime.resolveNextAction({ taskState })`
    - `await runtime.submitWorkflowStartCard({ taskState, request })`
    - `await runtime.submitWorkflowForm({ taskState, request })`
    - `await runtime.handleDeterministicToolResult({ taskState, toolResultText? })`
    - `runtime.isWorkflowProgressRequestAllowed({ taskState })`
    - `await runtime.submitWorkflowProgressRequest({ taskState, approved })`
    - `await runtime.applyWorkflowValueWrites({ taskState, values })`
    - `await runtime.buildTurnProjection({ taskState })`
    - `runtime.getPersistedSession({ taskState })`
    - `await runtime.restorePersistedSession({ taskState, persistedSession })`
    - `await runtime.teardownWorkflow({ taskState })`
  - in `beforeEach(...)`:
    - create a fresh sinon sandbox
    - create a fresh temp cwd with `mkdtemp(join(tmpdir(), "workflow-runtime-test-"))`
    - create `runtime = new WorkflowRuntime({ cwd })`
    - create `taskState = new TaskState()`
    - stub `WorkflowDiscovery.discoverWorkflowCandidates` to return `[]` by default
    - stub `WorkflowRegistry.resolveWorkflowDefinition` to return `undefined` by default
  - in `afterEach(...)`:
    - `sandbox.restore()`
    - remove the temp cwd with `rm(cwd, { recursive: true, force: true })`
  - define all test fixtures locally in this file; do not import shipped workflow modules or registry-owned workflow definitions
  - assert against these canonical `TaskState` property names exactly; do not infer or rename them:
    - `taskState.activeWorkflowName`
    - `taskState.activeWorkflowSession`
    - `taskState.activeWorkflowStartCardSession`
    - `taskState.activeWorkflowFormSession`
    - `taskState.activeWorkflowStepResolutionSession`
    - `taskState.suppressedWorkflowFormResolverIds`
    - `taskState.suppressedWorkflowStepResolutionDefinitionIds`
    - `taskState.currentFocusChainChecklist`
  - add local helpers with these responsibilities:
    - `createWorkflowDefinition(args?: {`
      - `name?: string`
      - `workflowForms?: Record<string, WorkflowFormDefinitionPayload>`
      - `stepResolutionDefinitions?: Record<string, WorkflowStepResolutionDefinition>`
      - `steps?: WorkflowDefinition["steps"]`
      - `childInheritance?: WorkflowDefinition["childInheritance"]`
      - `}): WorkflowDefinition`
      - it must return a valid `WorkflowDefinition` with exactly these minimum non-empty top-level fields:
        - `name`
        - `slashCommandName`
        - `useSkillName`
        - `persona`
        - `projectSubfolder`
        - `startCard: { markdownBody, submitLabel }`
        - `steps`
      - its default `steps` value must contain two valid steps keyed exactly as `"step-1"` and `"step-2"`
      - each default step must include:
        - `id`
        - `stepNumber`
        - `checklistLabel`
        - `allowWorkflowProgressRequest`
        - `buildPromptProjection`
        - when the test needs form coverage, `workflowFormId?: string`
        - when the test needs deterministic coverage, `stepResolutionDefinitionId?: string`
        - when the test needs completion coverage, `completionRules?: Array<{ id: string; isComplete(session: ActiveWorkflowSession): boolean }>`
        - when the test needs workflow-value-write coverage, `setWorkflowValuesToolOverride?: { contract: never; buildToolSchemaOverride(input: { session: ActiveWorkflowSession; step: WorkflowStepDefinition }): readonly ClineToolSpec[] | undefined }`
      - the default `buildPromptProjection` must return a stable object literal such as `{ workflowSystemInstructionsBlock: "system", workflowInputInstructionsBlock: "input" }`
      - when a test needs completion behavior, use exactly `completionRules: [{ id: "complete-now", isComplete: () => true }]`
    - `registerResolvedWorkflow(workflow)` that makes the stubbed `resolveWorkflowDefinition(...)` return the supplied workflow only when called with `workflow.name`
    - `createStartCardSubmitRequest(args: {`
      - `sessionId: string`
      - `projectMode: "new" | "existing"`
      - `selectedExistingProject?: string`
      - `newProjectTitle?: string`
      - `action?: WorkflowStartCardAction`
      - `}): WorkflowStartCardSubmissionRequest`
      - because the current live `WorkflowRuntime.submitWorkflowStartCard(...)` implementation compares `request.projectMode` to the raw strings `"new"` and `"existing"`, this helper must return a plain object literal cast to `WorkflowStartCardSubmissionRequest`, not `WorkflowStartCardSubmissionRequest.create(...)`
      - the helper must return exactly:
        - `metadata: undefined`
        - `sessionId: args.sessionId`
        - `action: args.action ?? WorkflowStartCardAction.WORKFLOW_START_CARD_ACTION_SUBMIT`
        - `projectMode: args.projectMode as unknown as WorkflowStartCardProjectMode`
        - `selectedExistingProject: args.selectedExistingProject ?? ""`
        - `newProjectTitle: args.newProjectTitle ?? ""`
    - `createFormSubmitRequest(args: {`
      - `sessionId: string`
      - `panelId: string`
      - `action?: WorkflowFormAction`
      - `fields?: WorkflowFormSubmissionRequest["fields"]`
      - `})`
      - it must return exactly `WorkflowFormSubmissionRequest.create({ sessionId, panelId, action: args.action ?? WorkflowFormAction.SUBMIT, fields: args.fields ?? [] })`
    - `createWorkflowFormDefinitionPayload(args?: { deterministic?: boolean; nextPanelId?: string; terminal?: boolean }): WorkflowFormDefinitionPayload`
      - `WorkflowFormDefinitionPayload.panels` must be a record object exactly shaped as `Record<string, WorkflowFormPanelDefinition>`, not an array
      - it must return a minimal valid definition payload with:
        - `definitionVersion: 2`
        - `title`
        - `toolDictionaryTitle`
        - `toolDictionaryMarkdown`
        - `firstPanelId: "panel-1"`
        - `panels`
      - for the terminal-success form case, `panel-1` must have:
        - `panelId: "panel-1"`
        - `title`
        - `promptMarkdown`
        - `fields: []`
        - `allowedActions: ["submit"]`
        - `transition: { type: "sequential", nextPanelId: "panel-2" }`
      - and `panel-2` must have either:
        - terminal success case:
          - `allowedActions: ["submit"]`
          - `transition: { type: "deterministic_operation", operationId: "persist_form", terminal: true }`
        - deterministic-next-panel case:
          - `allowedActions: ["submit"]`
          - `transition: { type: "deterministic_operation", operationId: "persist_form", nextPanelId: args.nextPanelId ?? "panel-3", terminal: args.terminal ?? false }`
    - `createStepResolutionDefinition(args?: { fallbackToAgent?: boolean; shouldSucceed?: boolean }): WorkflowStepResolutionDefinition`
      - it must return:
        - `id: "step-resolution-1"`
        - `toolName: ClineDefaultTool.SET_WORKFLOW_VALUES`
        - `buildStatusDefinition(...)` returning a minimal valid status definition object with non-empty `title`, `pendingLabel`, `successLabel`, and `failureLabel`
        - `buildToolExecutionRequest(...)` returning exactly `{ toolName: ClineDefaultTool.SET_WORKFLOW_VALUES, toolInput: {}, toolParams: {} }`
        - `evaluateToolExecutionResult(...)` configurable to return one of:
          - `{ succeeded: true }`
          - `{ succeeded: false, errorMessage: "failure", fallbackToAgent: true }`
          - `{ succeeded: false, errorMessage: "failure" }`
    - `createAllowedValueWriteOverride(args?: { allowedKeys: string[] })`
      - it must return the exact shape `WorkflowRuntime.applyWorkflowValueWrites(...)` consumes:
        - `{`
        - `  contract: {} as never,`
        - `  buildToolSchemaOverride: () => [{`
        - `    id: ClineDefaultTool.SET_WORKFLOW_VALUES,`
        - `    parameters: [{`
        - `      name: "values",`
        - `      type: "object",`
        - `      properties: Object.fromEntries(args.allowedKeys.map((key) => [key, { type: "string" }]))`
        - `    }]`
        - `  }]`
        - `}`
      - do not invent any additional override wrapper fields
    - `setDiscoveredProjects(projectNames: string[])`
      - it must configure the stubbed `discoverWorkflowCandidates(...)` to return exactly `projectNames.map((name) => ({ value: name, label: name }))`
  - cover exactly these cases with separate `it(...)` blocks:
    - activation:
      - `activateWorkflow(...)` on a valid two-step workflow returns `kind === "render_workflow_start_card"`
      - it sets `taskState.activeWorkflowName`
      - it creates `taskState.activeWorkflowSession`
      - it clears all workflow-owned mirror/session fields and suppression arrays
      - it projects `taskState.currentFocusChainChecklist`
    - activation validation failure:
      - a workflow with `steps: {}` returns `{ kind: "no_op" }`
      - task state remains unchanged
    - start-card project selection:
      - when `discoverWorkflowCandidates(...)` returns existing projects, it must return `Array<{ value: string; label: string }>` and `resolveNextAction(...)` returns `render_workflow_start_card`
      - a valid `"new"` submission trims the title, normalizes `projectFolderName`, clears the start-card session, and creates the five canonical subfolders under the temp cwd
      - a valid `"existing"` submission sets `projectSelection` to the selected project value for both `projectTitle` and `projectFolderName`
      - an invalid session id or invalid action returns `no_op`
      - a `"new"` submission whose normalized slug becomes `""` returns `no_op`
      - for the folder-creation assertion, use `await access(join(cwd, projectFolderName, subfolderName))` for each of `discovery`, `planning`, `implementation`, `review`, and `testing`
    - prompt projection:
      - after project selection is satisfied and there is no form or deterministic step, `resolveNextAction(...)` returns `project_prompt`
      - `buildTurnProjection(...)` returns the exact projection from `activeStep.buildPromptProjection(...)`
      - when no active session exists, `buildTurnProjection(...)` returns `{}`
    - workflow form behavior:
      - an active step with `workflowFormId` returns `render_workflow_form`
      - `submitWorkflowForm(...)` with a successful terminal submission suppresses that `workflowFormId` and re-evaluates through `resolveNextAction(...)`
      - a form configured for deterministic operation stores pending form state and causes the next action to be `run_deterministic_operation`
      - `handleDeterministicToolResult(...)` restores the form on falsy or `"Error:"` results
      - `handleDeterministicToolResult(...)` advances to `nextPanelId` when present
      - `handleDeterministicToolResult(...)` suppresses the form id on terminal success
    - deterministic step-resolution behavior:
      - an active step with `stepResolutionDefinitionId` returns `run_deterministic_operation`
      - a successful deterministic result increments `activeStepNumber`, suppresses the definition id, and re-evaluates
      - a failure with `fallbackToAgent: true` suppresses the definition id, does not increment the step, and re-evaluates
      - a failure without fallback also suppresses the definition id, does not increment the step, and re-evaluates
    - workflow progress request:
      - `isWorkflowProgressRequestAllowed(...)` is `false` before project selection is complete
      - it is `false` when the active step sets `allowWorkflowProgressRequest: false`
      - it is `true` only when project selection is satisfied and the active step sets `allowWorkflowProgressRequest: true`
      - `submitWorkflowProgressRequest({ approved: false })` returns `no_op`
      - `submitWorkflowProgressRequest({ approved: true })` increments `activeStepNumber`, clears both suppression arrays, and re-evaluates
    - workflow value writes:
      - `applyWorkflowValueWrites(...)` trims values before comparison and storage
      - it writes only keys exposed by `setWorkflowValuesToolOverride.buildToolSchemaOverride(...)` for `ClineDefaultTool.SET_WORKFLOW_VALUES` -> `"values"` object properties
      - it returns disallowed keys in `unchangedValues`
      - it returns changed allowed keys in `changedValues`
      - when no override is present, all attempted keys remain unchanged
    - persistence and resume:
      - `getPersistedSession(...)` returns a deep-cloned session
      - `restorePersistedSession(...)` returns `undefined` for `undefined`
      - `restorePersistedSession(...)` tears down and returns `undefined` when the resolved workflow is missing
      - `restorePersistedSession(...)` tears down and returns `undefined` when the persisted `activeStepNumber` does not resolve to a real step
      - `restorePersistedSession(...)` restores valid state and re-enters `resolveNextAction(...)`
    - teardown and completion:
      - a step whose `completionRules` return `true` causes `resolveNextAction(...)` to return `complete_workflow`
      - `teardownWorkflow(...)` clears `activeWorkflowName`, `activeWorkflowSession`, all workflow-owned mirror/session fields, both suppression arrays, and `currentFocusChainChecklist`
      - because pending form-operation state is private `WorkflowRuntime` state, verify teardown indirectly by:
        - first creating a pending form deterministic-operation path
        - then calling `teardownWorkflow(...)`
        - then asserting `resolveNextAction(...)` returns `no_op` and no previously pending form operation is resumed

### `src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts`

Status: complete

- Whole file, rewrite in one pass:
  - keep the file at `src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts`
  - use `mocha`/`chai` style exactly:
    - import `expect` from `chai`
    - import `describe` and `it` from `mocha`
  - import exactly:
    - `buildWorkflowStartCardPayload` from `../buildWorkflowStartCardPayload`
    - `type WorkflowStartCardSessionState` from `../types`
  - delete these legacy imports and helpers entirely:
    - `fs`
    - `path`
    - `parseWorkflowStartMessagesReference()`
    - `getWorkflowStartCardRegistryEntry(...)`
  - replace the entire file with only local test fixtures plus payload assertions for `buildWorkflowStartCardPayload(...)`
  - add one local helper:
    - `createSession(args?: Partial<WorkflowStartCardSessionState>): WorkflowStartCardSessionState`
    - it must return a complete session object with these default fields:
      - `sessionId: "session-default"`
      - `workflowName: "quick-spec"`
      - `markdownBody: "Start card body"`
      - `submitLabel: "Continue"`
      - `projectMode: "new"`
      - `existingProjectOptions: []`
      - `selectedExistingProject: undefined`
      - `newProjectTitle: undefined`
  - add exactly these `it(...)` blocks:
    - one test that builds a payload from an unsuffixed workflow name `"quick-spec"` and asserts exact equality with:
      - `sessionId: "session-quick-spec"`
      - `title: "Welcome to the Quick Spec Workflow!"`
      - `markdownBody: "Quick spec body"`
      - `submitLabel: "Continue"`
      - `projectMode: "new"`
      - `existingProjectOptions: []`
      - `selectedExistingProject: undefined`
      - `newProjectTitle: "Project Phoenix"`
    - one test that builds a payload for existing-project selection and asserts exact equality with:
      - `sessionId: "session-existing"`
      - `title: "Welcome to the Create Story Workflow!"`
      - `markdownBody: "Create story body"`
      - `submitLabel: "Continue"`
      - `projectMode: "existing"`
      - `existingProjectOptions: [{ value: "alpha", label: "alpha" }, { value: "beta", label: "beta" }]`
      - `selectedExistingProject: "beta"`
      - `newProjectTitle: undefined`
  - do not preserve:
    - the registry-alignment test
    - the nonexistent-workflow assertion
    - any `.md`-suffixed workflow-name fixture
    - any `ctaLabel` assertion

### `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

Status: complete

- Whole file, rewrite in one pass:
  - keep the file at `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
  - use `mocha`/`chai` style exactly:
    - import `expect` from `chai`
    - import `describe` and `it` from `mocha`
  - import exactly:
    - `type WorkflowFormDefinitionPayload` and `type WorkflowFormPanelDefinition` from `@shared/ExtensionMessage`
    - `WorkflowFormAction` and `WorkflowFormSubmissionRequest` from `@shared/proto/cline/task`
    - `type WorkflowFormSessionState` from `../types`
    - `WorkflowFormRuntime` from `../WorkflowFormRuntime`
  - delete all legacy imports and dependencies entirely:
    - `ClineDefaultTool`
    - `type WorkflowFormResolverDefinition`
    - every import from `../WorkflowFormRegistry`
    - every resolver-id constant
    - every placeholder-workflow owner fixture
  - do not preserve any `resolverId`, `triggerSource`, or `owner` usage in this file
  - do not preserve any `kind: "placeholder_workflow_step"` fixture
  - do not preserve any dependency on `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS`
  - use only local generic helpers:
    - `createDefinition(args: { firstPanelId: string; panels: Record<string, WorkflowFormPanelDefinition>; title?: string }): WorkflowFormDefinitionPayload`
      - return exactly:
        - `definitionVersion: 2`
        - `title: args.title ?? "Workflow Form V2"`
        - `toolDictionaryTitle: "Dictionary"`
        - `toolDictionaryMarkdown: "## tool"`
        - `firstPanelId: args.firstPanelId`
        - `panels: args.panels`
    - `createRuntime()`
      - return `new WorkflowFormRuntime()`
    - `createSession(args: { runtime: WorkflowFormRuntime; workflowFormId?: string; definitionPayload: WorkflowFormDefinitionPayload })`
      - call `runtime.createSession({ workflowFormId: args.workflowFormId ?? "test-form", definitionPayload: args.definitionPayload })`
    - `createSubmitRequest(args: { sessionId: string; panelId: string; action?: WorkflowFormAction; fields?: WorkflowFormSubmissionRequest["fields"] })`
      - return exactly `WorkflowFormSubmissionRequest.create({ sessionId: args.sessionId, panelId: args.panelId, action: args.action ?? WorkflowFormAction.SUBMIT, fields: args.fields ?? [] })`
  - when this file needs a draft/manual session fixture, use the canonical `WorkflowFormSessionState` shape only:
    - `sessionId`
    - `workflowFormId`
    - `definitionVersion`
    - `definitionPayload`
    - `firstPanelId`
    - `currentPanelId`
    - `values`
    - `data`
    - optional `failure`
  - add exactly these `it(...)` blocks:
    - one test that creates a V2 session and asserts:
      - `definitionVersion === 2`
      - `firstPanelId` equals the definition’s first panel id
      - `currentPanelId` starts at the first panel id
      - `values` and `data` start empty
      - `buildPayload(...)` returns `renderState === "panel"` and the first panel payload
    - one test that rejects stale panel mismatches by asserting `handleSubmission(...)` throws `Workflow form submission panel mismatch`
    - one test that advances through a sequential transition and persists a submitted string value in `session.values`
    - one test that routes through a conditional transition using a radio-group field and lands on the correct next panel
    - one test that returns `kind === "invoke_deterministic_operation"` for a `deterministic_operation` transition and asserts the exact `operationId`, `nextPanelId`, and `terminal` values
    - one test that supports back navigation and clears `backStaleValueKeysToClear`
    - one test that restarts a retry flow at the first panel and clears `failure`
    - one test that returns a failure render outcome when a required field is missing on submit
    - one test that verifies value normalization using at least:
      - one numeric field
      - one multi-select or checkbox-group field
    - one test that verifies `buildSuccessPayload(...)` returns a success payload with the provided success message
  - keep coverage only for generic engine behavior that survives the foundational rewrite:
    - session creation
    - payload building
    - stale panel rejection
    - sequential transitions
    - conditional transitions
    - value normalization
    - back behavior
    - retry behavior
    - failure payloads
    - success payloads
    - deterministic-operation outcomes
  - do not preserve:
    - `testResolvers`
    - `createResolver(...)`
    - `createDraftSession(...)` in its resolver/owner-based form
    - `createRegistrySession(...)`
    - any brainstorming-specific registry fixture
    - any code-review-specific registry fixture
    - any placeholder-workflow-step owner assertion

### `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

Status: complete

- Update this file in one pass, but keep it at `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`
- Keep the existing `mocha`/`chai` style and the existing registry-specific test coverage/assertions unless explicitly changed below
- update imports exactly as follows:
  - keep `WorkflowFormDefinitionPayload` and `WorkflowFormSubmittedValuePayload` from `@shared/ExtensionMessage`
  - keep the existing imports from `../WorkflowFormRegistry`
  - replace `import type { WorkflowFormSessionOwner, WorkflowFormSessionState, WorkflowFormTriggerSource } from "../types"` with exactly `import type { WorkflowFormSessionState } from "../types"`
- rewrite the local `createSession(...)` helper so it no longer references deleted shared types or deleted session fields
  - replace the helper args shape with exactly:
    - `workflowFormId?: string`
    - `definitionPayload?: WorkflowFormDefinitionPayload`
    - `values?: Record<string, WorkflowFormSubmittedValuePayload>`
    - `currentPanelId?: string`
    - `data?: WorkflowFormSessionState["data"]`
  - replace the returned session object so it contains exactly:
    - `sessionId: \`session-\${args.workflowFormId ?? "test-form"}\``
    - `workflowFormId: args.workflowFormId ?? "test-form"`
    - `definitionVersion: 2`
    - `definitionPayload`
    - `firstPanelId: definitionPayload.firstPanelId`
    - `currentPanelId: args.currentPanelId ?? definitionPayload.firstPanelId`
    - `values: args.values ?? {}`
    - `data: args.data ?? {}`
  - delete `resolverId`, `triggerSource`, and `owner` from both the helper args and the returned session
- at every `createSession(...)` callsite in this file:
  - replace `resolverId: resolver.id` with `workflowFormId: resolver.id`
  - delete the `triggerSource` property entirely
  - delete the `owner` property entirely, including all nested `kind`, `workflowName`, and `stepNumber` literals
- do not change:
  - the `describe("WorkflowFormRegistry", ...)` suite name
  - the existing `it(...)` names
  - resolver ids
  - operation ids
  - `.md`-suffixed workflow-name fixtures inside non-session arguments
  - registry-specific assertions, success/failure expectations, or placeholder-era workflow behavior covered by this suite
- do not introduce local compatibility shim types or `any`
- do not rewrite this file into generic runtime tests; keep it as a registry test suite with only the shared-session-shape migration applied

### `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts`

Status: complete

- Whole file, rewrite in one pass:
  - keep the file at `src/core/task/workflow-step-resolution/__tests__/WorkflowStepResolutionRuntime.test.ts`
  - use `mocha`/`chai` style exactly:
    - import `expect` from `chai`
    - import `describe` and `it` from `mocha`
  - import exactly:
    - `ClineDefaultTool` from `@/shared/tools`
    - `type WorkflowStepResolutionDefinition` and `type WorkflowStepResolutionSessionState` from `../types`
    - `WorkflowStepResolutionRuntime` from `../WorkflowStepResolutionRuntime`
  - do not import registry definitions or registry constants in this file
  - do not preserve any `placeholder_workflow_step` owner fixture
  - do not preserve any `.md`-suffixed workflow-name fixture
  - add local helpers exactly as follows:
    - `createDefinition(args?: { id?: string; title?: string }): WorkflowStepResolutionDefinition`
      - return exactly:
        - `id: args.id ?? "code_review_step_3_review_input"`
        - `toolName: ClineDefaultTool.BUILD_REVIEW_INPUT`
        - `buildStatusDefinition: () => ({ title: args.title ?? "Review Input Artifact", pendingLabel: "Preparing workflow documents", successLabel: "Workflow documents ready", failureLabel: "Automatic workflow preparation failed- falling back to manual LLM workflow preparation." })`
        - `buildToolExecutionRequest: () => ({ toolName: ClineDefaultTool.BUILD_REVIEW_INPUT, toolInput: {}, toolParams: {} })`
        - `evaluateToolExecutionResult: () => ({ succeeded: true })`
    - `createRuntime(definitions?: Record<string, WorkflowStepResolutionDefinition>)`
      - return `new WorkflowStepResolutionRuntime(definitions ?? { code_review_step_3_review_input: createDefinition() })`
    - `createPendingSession(args?: Partial<WorkflowStepResolutionSessionState>): WorkflowStepResolutionSessionState`
      - return exactly:
        - `sessionId: args?.sessionId ?? "session-code-review-step-3"`
        - `definitionId: args?.definitionId ?? "code_review_step_3_review_input"`
        - `triggerSource: "deterministic_workflow_progression"`
        - `owner: args?.owner ?? { kind: "workflow_step", workflowName: "code-review", stepNumber: 3 }`
        - `state: args?.state ?? "pending"`
        - `lastError: args?.lastError`
  - add exactly these `it(...)` blocks:
    - one test that creates a session through `runtime.createSession(...)` and asserts:
      - `definitionId === "code_review_step_3_review_input"`
      - `triggerSource === "deterministic_workflow_progression"`
      - `owner` deep-equals `{ kind: "workflow_step", workflowName: "code-review", stepNumber: 3 }`
      - `state === "pending"`
      - `sessionId` is a non-empty string
    - one test that builds a payload from `createPendingSession()` and asserts exact deep equality with:
      - `sessionId: "session-code-review-step-3"`
      - `definitionId: "code_review_step_3_review_input"`
      - `owner: { workflowName: "code-review", stepNumber: 3 }`
      - `state: "pending"`
      - `definition: { title: "Review Input Artifact", pendingLabel: "Preparing workflow documents", successLabel: "Workflow documents ready", failureLabel: "Automatic workflow preparation failed- falling back to manual LLM workflow preparation." }`
    - one test that builds a terminal success session from `createPendingSession({ sessionId: "session-success" })` and asserts:
      - `state === "success"`
      - `lastError === undefined`
      - `owner.kind` remains `"workflow_step"`
    - one test that builds a terminal failure session from `createPendingSession({ sessionId: "session-failure" })` with `"fallback message"` and asserts:
      - `state === "failure"`
      - `lastError === "fallback message"`
      - `owner.kind` remains `"workflow_step"`
  - do not preserve:
    - zero-argument `new WorkflowStepResolutionRuntime()`
    - any `owner.kind === "placeholder_workflow_step"` assertion
    - any owner fixture with `workflowName: "code-review.md"`

### `src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts`

Status: complete

- Whole file, rewrite in one pass:
  - keep the file at `src/core/task/focus-chain/__tests__/focus-chain-checklist-update.test.ts`
  - use `mocha`/`chai` style exactly
  - import exactly:
    - `* as disk` from `@core/storage/disk`
    - `expect` from `chai`
    - `fs` from `fs/promises`
    - `describe` and `it` from `mocha`
    - `os` from `os`
    - `path` from `path`
    - `sinon` from `sinon`
    - `TaskState` from `../../TaskState`
    - `getFocusChainFilePath` from `../file-utils`
    - `FocusChainManager` from `../index`
  - delete these legacy imports entirely:
    - `evaluateFocusChainChecklistUpdate`
    - `parseFocusChainChecklistItems`
  - replace the entire file with runtime-projection coverage against `FocusChainManager`
  - add one local helper exactly as:
    - `function createDependencies(taskState: TaskState) {`
    - `  return {`
    - `    taskId: "task-focus-chain-workflow",`
    - `    cwd: "/tmp",`
    - `    taskState,`
    - `    mode: "act" as const,`
    - `    stateManager: { getGlobalSettingsKey: sinon.stub().returns("act") } as any,`
    - `    postStateToWebview: sinon.stub().resolves(),`
    - `    say: sinon.stub().resolves(undefined),`
    - `    focusChainSettings: { enabled: true, remindClineInterval: 6 } as any,`
    - `  }`
    - `}`
  - set the suite title exactly to:
    - `describe("FocusChainManager workflow checklist projection", () => { ... })`
  - add exactly these `it(...)` blocks with these exact titles and construction steps:
    - `it("renders runtime-managed workflow checklist instructions when a workflow is active", async () => { ... })`
      - construct exactly:
        - `const taskState = new TaskState()`
        - `taskState.activeWorkflowName = "quick-spec"`
        - `taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Project Info\n- [ ] Step 2: Draft Spec"`
        - `const dependencies = createDependencies(taskState)`
        - `const manager = new FocusChainManager(dependencies)`
      - call exactly:
        - `const instructions = await manager.generateFocusChainInstructions()`
      - assert exact equality with:
        - ``# CURRENT WORKFLOW STATUS\n\n## ACTIVE WORKFLOW: quick-spec\n\n```text\n- [ ] Step 1: Gather Project Info\n- [ ] Step 2: Draft Spec\n```\n\nWorkflow progress is runtime managed. Use the workflow tools for progress changes.\nDo not create or rewrite task_progress manually.``
    - `it("refreshes the workflow-owned checklist projection when the projected checklist changes", async () => { ... })`
      - start exactly with:
        - `const sandbox = sinon.createSandbox()`
        - `const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-workflow-refresh-"))`
      - use exact cleanup pattern:
        - `try { ... } finally {`
        - `  sandbox.restore()`
        - `  await fs.rm(tempDir, { recursive: true, force: true })`
        - `}`
      - inside the `try` block:
        - `sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)`
        - `const taskState = new TaskState()`
        - `taskState.activeWorkflowName = "quick-spec"`
        - `taskState.todoListWasUpdatedByUser = true`
        - `taskState.apiRequestsSinceLastTodoUpdate = 3`
        - `taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Project Info"`
        - `const dependencies = createDependencies(taskState)`
        - `const manager = new FocusChainManager(dependencies)`
        - `await manager.refreshManagedWorkflowChecklistProjection()`
        - `taskState.currentFocusChainChecklist = "- [x] Step 1: Gather Project Info\n- [ ] Step 2: Draft Spec"`
        - `await manager.refreshManagedWorkflowChecklistProjection()`
      - assert exactly:
        - `taskState.currentFocusChainChecklist === "- [x] Step 1: Gather Project Info\n- [ ] Step 2: Draft Spec"`
        - `taskState.todoListWasUpdatedByUser === false`
        - `taskState.apiRequestsSinceLastTodoUpdate === 0`
        - `(dependencies.say as sinon.SinonStub).calledWith("task_progress", "- [x] Step 1: Gather Project Info\n- [ ] Step 2: Draft Spec") === true`
        - `(dependencies.postStateToWebview as sinon.SinonStub).callCount === 2`
        - `const focusChainFilePath = getFocusChainFilePath(tempDir, dependencies.taskId)`
        - `const written = await fs.readFile(focusChainFilePath, "utf8")`
        - `written` contains `"- [x] Step 1: Gather Project Info\n- [ ] Step 2: Draft Spec"`
    - `it("clears the workflow-owned checklist projection after workflow teardown", async () => { ... })`
      - start exactly with:
        - `const sandbox = sinon.createSandbox()`
        - `const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "focus-chain-workflow-clear-"))`
      - use exact cleanup pattern:
        - `try { ... } finally {`
        - `  sandbox.restore()`
        - `  await fs.rm(tempDir, { recursive: true, force: true })`
        - `}`
      - inside the `try` block:
        - `sandbox.stub(disk, "ensureTaskDirectoryExists").resolves(tempDir)`
        - `const taskState = new TaskState()`
        - `taskState.activeWorkflowName = "quick-spec"`
        - `taskState.currentFocusChainChecklist = "- [ ] Step 1: Gather Project Info"`
        - `const dependencies = createDependencies(taskState)`
        - `const manager = new FocusChainManager(dependencies)`
        - `await manager.refreshManagedWorkflowChecklistProjection()`
        - `taskState.activeWorkflowName = undefined`
        - `await manager.refreshManagedWorkflowChecklistProjection()`
      - assert exactly:
        - `taskState.currentFocusChainChecklist === null`
        - `taskState.todoListWasUpdatedByUser === false`
        - `taskState.apiRequestsSinceLastTodoUpdate === 0`
        - `const focusChainFilePath = getFocusChainFilePath(tempDir, dependencies.taskId)`
        - check file absence exactly with:
          - `let exists = true`
          - `try { await fs.access(focusChainFilePath) } catch { exists = false }`
          - `expect(exists).to.equal(false)`
        - `const instructions = await manager.generateFocusChainInstructions()`
        - `instructions` does not contain `"ACTIVE WORKFLOW"`
        - `instructions` does not contain `"Step 1: Gather Project Info"`
  - do not preserve:
    - reordered-item rejection coverage
    - renamed-item rejection coverage
    - added-or-removed-item rejection coverage
    - `__COMPLETE_NEXT_STEP__` sentinel coverage
    - direct coverage of `evaluateFocusChainChecklistUpdate(...)`
    - direct coverage of `parseFocusChainChecklistItems(...)`
    - any `managedWorkflowRun` fixture
    - any placeholder-workflow fixture

### `src/core/task/focus-chain/__tests__/diagnostics.test.ts`

Status: complete

- Lines `1`-`47`: update this suite in one pass so it aligns with the renamed foundational focus-chain decision field and no longer asserts placeholder-era contract names.
  - in the `focus_chain_decision` fixture passed to `logFocusChainDiagnosticEvent(...)`, replace `placeholderWorkflowActive: true` with exactly `workflowActive: true`
  - replace the string assertion containing `"placeholderWorkflowActive":true` with exactly `"workflowActive":true`
  - leave the logger setup/teardown, event name `focus_chain_decision`, `shouldInclude` assertion, and the text-summary assertions unchanged

### `src/core/workflows/__tests__/placeholder-workflow-rendering.test.ts`

Status: complete

- Lines `1`-`38`: delete this file in the same change set that deletes `src/core/workflows/placeholder-workflow-rendering.ts` and removes that helper from the compiled runtime via the caller-file changes mapped elsewhere. Delete the import of `../placeholder-workflow-rendering` and all three adapter tests covering single/double-curly substitution, unresolved-placeholder passthrough, and stable/dynamic placeholder-map merge precedence. Do not remap this suite’s assertions onto `WorkflowRuntime` or any surviving runtime-owned workflow session coverage.

### `src/core/workflows/__tests__/workflow-placeholders.test.ts`

Status: complete

- Lines `1`-`84`: delete this legacy unit test during Foundational Build after `src/core/workflows/workflow-placeholders.ts` is removed from the live runtime plan. Remove direct coverage of `buildWorkflowStablePlaceholders(...)`, `extractWorkflowPlaceholderKeys(...)`, and `getCanonicalWorkflowConfigPath(...)` rather than preserving tests for `.cline/workflow-config.yaml` loading, placeholder-key extraction, or placeholder-era stable-value assembly.

### `src/core/workflows/__tests__/placeholder-workflow-step-details.test.ts`

Status: complete

- Lines `1`-`292`: delete this legacy unit test during Foundational Build after `src/core/workflows/placeholder-workflow-step-details.ts` is removed from the live runtime plan. Remove direct coverage of `buildActivePlaceholderWorkflowSource(...)`, `buildPlaceholderWorkflowChecklist(...)`, `getActivePlaceholderWorkflowStepDetails(...)`, and `resolveActivePlaceholderWorkflowPromptContext(...)` rather than remapping those placeholder-era assertions onto the new runtime architecture.

### `src/core/workflows/resolution/__tests__/resolveAvailableWorkflows.test.ts`

Status: complete

- Lines `1`-`74`: delete this legacy unit test during Foundational Build after `src/core/workflows/resolution/resolveAvailableWorkflows.ts` is removed from the live runtime plan. Remove direct coverage of `resolveAvailableWorkflows(...)`, `resolveWorkflowByName(...)`, and `createWorkflowSkillMetadata(...)` rather than remapping legacy discovery precedence or legacy workflow-source semantics onto the new shipped-workflow registry architecture.

### `src/core/task/__tests__/workflowCompletionRunner.test.ts`

Status: complete

- Lines `1`-`134`: delete this legacy unit test during Foundational Build after `src/core/task/workflowCompletionRunner.ts` is removed from the live runtime plan. Remove direct coverage of `workflowCompletionRunner(...)`, `WorkflowCompletionRunnerResult`, placeholder-workflow-id completion gating, checklist-transition heuristics, notice-count heuristics, and completed-workflow-id-based follow-up behavior rather than remapping those legacy completion-runner assertions onto `WorkflowRuntime`.

### `src/core/task/bmad-agent-mode.test.ts`

Status: complete

- Lines `1`-`59`: delete this legacy unit test during Foundational Build after `src/core/task/bmad-agent-mode.ts` is removed from the live runtime plan. Remove direct coverage of `getBmadWorkflowReminder(...)`, `_bmad/_config/workflow-reminders.json` loading, missing-reminder fallback behavior, and BMAD reminder block rendering rather than remapping those assertions onto `WorkflowRuntime` or workflow-module prompt builders.

### `src/core/slash-commands/__tests__/index.test.ts`

Status: complete

- Rewrite this file in one pass, but keep it at `src/core/slash-commands/__tests__/index.test.ts`
- keep the `formatMcpPromptResponse(...)` suite unchanged
- update imports exactly:
  - keep `type McpPromptResponse` from `@shared/mcp`
  - keep `expect` from `chai`
  - keep `* as sinon` from `sinon`
  - keep `formatMcpPromptResponse`, `type McpPromptFetcher`, and `parseSlashCommands` from `../index`
  - add `* as WorkflowRegistry` from `@/core/task/workflow-runtime/WorkflowRegistry`
  - add `type WorkflowDefinition` from `@/core/task/workflow-runtime/types`
  - delete `fs`
  - delete `os`
  - delete `path`
  - delete `StateManager`
  - delete `getCanonicalWorkflowConfigPath`
- keep `afterEach(() => { sinon.restore() })` unchanged
- in the `parseSlashCommands MCP handling` suite, update every `parseSlashCommands(...)` call to the live foundational signature:
  - `parseSlashCommands(text, "test-ulid", undefined, undefined, undefined, mockMcpPromptFetcher)`
  - for the second fetcher, use `parseSlashCommands(text, "test-ulid", undefined, undefined, undefined, fetcherWithColons)`
- delete these two suites entirely:
  - `describe("parseSlashCommands workflow persona regression", ...)`
  - `describe("parseSlashCommands workflow resolution", ...)`
- add one local helper exactly as:
  - `function createResolvedWorkflow(args?: Partial<Pick<WorkflowDefinition, "name" | "slashCommandName" | "useSkillName">>): WorkflowDefinition {`
  - `  return {`
  - `    name: args?.name ?? "quick-spec",`
  - `    slashCommandName: args?.slashCommandName ?? "quick-spec",`
  - `    useSkillName: args?.useSkillName ?? "quick-spec",`
  - `    persona: "engineer",`
  - `    projectSubfolder: "planning",`
  - `    startCard: { markdownBody: "", submitLabel: "Continue" },`
  - `    steps: {`
  - `      "step-1": {`
  - `        id: "step-1",`
  - `        stepNumber: 1,`
  - `        checklistLabel: "Step 1",`
  - `        buildPromptProjection: () => ({}),`
  - `        allowWorkflowProgressRequest: false,`
  - `      },`
  - `    },`
  - `  }`
  - `}`
- replace the deleted workflow suites with exactly:
  - `describe("parseSlashCommands shipped workflow activation", () => { ... })`
  - inside it, add exactly one `it(...)` block:
    - `it("activates a shipped workflow slash command and strips it from the task text", async () => { ... })`
    - inside the test:
      - stub `WorkflowRegistry.resolveWorkflowBySlashCommand` to return `createResolvedWorkflow()`
      - call `parseSlashCommands("<task>/quick-spec draft a plan</task>", "test-ulid")`
      - assert:
        - `processedText === "<task> draft a plan</task>"`
        - `needsClinerulesFileCheck === false`
        - `persistentSlashCommandAction` deep-equals exactly `{ type: "activate_workflow", workflowName: "quick-spec", invocationSource: "slash_command" }`
- do not preserve any assertion for:
  - `activate_managed_workflow`
  - `activate_placeholder_workflow`
  - local workflow loading
  - global workflow precedence
  - remote workflow loading
  - `StateManager.get()`
  - `getCanonicalWorkflowConfigPath(...)`

### `src/test/slash-commands.test.ts`

Status: complete

- Whole file, rewrite in one pass:
  - keep the file at `src/test/slash-commands.test.ts`
  - use `mocha` + `should` style exactly
  - import exactly:
    - `afterEach`, `describe`, and `it` from `mocha`
    - `"should"`
    - `* as sinon` from `sinon`
    - `* as WorkflowRegistry` from `@/core/task/workflow-runtime/WorkflowRegistry`
    - `Controller` from `../core/controller`
    - `getAvailableSlashCommands` from `../core/controller/slash/getAvailableSlashCommands`
    - `EmptyRequest` from `../shared/proto/cline/common`
    - `BASE_SLASH_COMMANDS` and `VSCODE_ONLY_COMMANDS` from `../shared/slashCommands`
  - delete these imports entirely:
    - `beforeEach`
    - `clearManagedWorkflowRegistryCache`
  - delete all mock controller/state-manager/workspace-manager scaffolding
  - add one local helper exactly as:
    - `async function getResponse() {`
    - `  return getAvailableSlashCommands({} as Controller, EmptyRequest.create())`
    - `}`
  - keep `afterEach(() => { sinon.restore() })`
  - keep exactly these built-in assertions as standalone `it(...)` blocks:
    - returns all base slash commands
    - does not include the deprecated `subagent` slash command
    - does not advertise retired BMAD persona slash commands `bmad-agent-bmm-dev`, `bmad-dev`, and `bmad-exit`
    - marks base commands with section `"default"`
    - includes VS Code-only slash commands in the backend response
  - delete entirely:
    - the managed BMAD workflow assertion
    - `Local Workflow Toggles`
    - `Global Workflow Toggles`
    - `Workflow Deduplication`
    - `Remote Workflows`
    - `Edge Cases`
  - add exactly one new suite:
    - `describe("Shipped Workflow Slash Commands", () => { ... })`
  - inside it, add exactly one `it(...)` block:
    - `it("projects shipped workflow slash commands into custom CLI-compatible entries", async () => { ... })`
    - stub `WorkflowRegistry.getShippedWorkflowSlashCommands` to return exactly:
      - `{ name: "quick-spec", description: "Shipped workflow: quick-spec" }`
      - `{ name: "write-prd", description: "Shipped workflow: write-prd" }`
    - call `getResponse()`
    - assert both shipped workflows are present
    - assert each shipped workflow has:
      - `section === "custom"`
      - `cliCompatible === true`
      - the exact stubbed description

### `src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`

Status: complete

- Lines `74`-`95`: rewrite the registry-facing assertions in one pass so they match the foundational workflow tool surface. Keep the governed response-tool `defaultTurnBehavior === "end_turn"` assertions in lines `74`-`80` unchanged. Rewrite the non-response assertions in lines `82`-`95` so they remove deleted workflow-specific document tool ids `BUILD_EPICS_DOCUMENT`, `BUILD_EPIC_DELIVERY_SPEC`, `BUILD_STORY_DOCUMENT`, and `BUILD_TECH_SPEC_DOCUMENT`, add `ResponseToolRegistry.get(ClineDefaultTool.SET_WORKFLOW_VALUES) === undefined` and `ResponseToolRegistry.get(ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT) === undefined`, and keep `undefined` assertions for deferred surviving non-response workflow/module tools including `BUILD_REVIEW_INPUT`, `SELECT_TARGET_EPIC`, `CONTINUE_BRAINSTORMING_SESSION`, `CREATE_BRAINSTORMING_SESSION`, `SELECT_BRAINSTORMING_SESSION`, `PERSIST_BRAINSTORMING_APPROACH`, `SELECT_RANDOM_BRAINSTORMING_TECHNIQUE`, `PERSIST_BRAINSTORMING_TECHNIQUE`, and `REQUEST_BRAINSTORMING_TECHNIQUE_SUGGESTION`.

### `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

Status: complete

- Lines `5`-`65`, `236`-`242`, and the workflow-specific test block beginning with `it("includes workflow-backed activations in subagent prompt context"` and ending with `it("suppresses pi-planning workflow persona instructions on internal turns without full prompt assembly"`: rewrite the workflow-specific harness and suites in one pass so this file matches the foundational child-workflow runtime architecture while leaving the non-workflow subagent engine coverage unchanged.
- Update imports exactly:
  - add `* as WorkflowRegistry` from `@/core/task/workflow-runtime/WorkflowRegistry`
  - add `WorkflowRuntime` from `@/core/task/workflow-runtime/WorkflowRuntime`
  - add `type WorkflowDefinition` from `@/core/task/workflow-runtime/types`
  - delete `type ManagedWorkflowRunState` from `@core/task/managed-workflows/types`
  - delete `* as workflowActivation` from `@core/task/workflow-activation`
  - delete `* as workflowResolution` from `@core/workflows/resolution/resolveAvailableWorkflows`
  - delete `resolveWorkflowPersonaInstructions` from `@/core/prompts/system-prompt/registry/workflowPersonaRegistry`
- Keep `PromptContextArgs` unchanged.
- Replace `PromptContextResult` exactly with:
  - `mcpHub?: unknown`
  - `activeWorkflowName?: string`
  - `activeWorkflowStepNumber?: number`
  - `workflowSystemInstructionsBlock?: string`
  - `workflowInputInstructionsBlock?: string`
  - `workflowToolSchemaOverride?: readonly unknown[]`
  - `skills?: Array<{ name: string }>`
  - `isContinuationTurn?: boolean`
  - `enableNativeToolCalls?: boolean`
  - `enableParallelToolCalling?: boolean`
  - `isSubagentRun?: boolean`
- Keep the `createSubagentTaskConfig` and `buildPromptContext` private-method bindings.
- Update the `autoActivateAssignedWorkflow` private-method binding signature exactly to:
  - `(this: SubagentRunner, state: TaskState, assignedSkillNames: string[]) => Promise<void>`
- Delete the `inheritSharedParentPlaceholdersToActivatedWorkflow` private-method binding entirely.
- Delete the `beforeEach(() => { sinon.stub(workflowResolution, "resolveAvailableWorkflows").resolves([]) })` hook entirely.
- Leave `afterEach(() => { sinon.restore(); HostProvider.reset() })` unchanged.
- In `createTaskConfig(...)`, add exactly:
  - `workflowRuntime: new WorkflowRuntime({ cwd: "/tmp" }),`
- Add one local helper exactly as:
  - `function createResolvedWorkflow(args?: {`
  - `  name?: string`
  - `  useSkillName?: string`
  - `  stepOneChecklistLabel?: string`
  - `  stepTwoChecklistLabel?: string`
  - `  workflowSystemInstructionsBlock?: string`
  - `  workflowInputInstructionsBlock?: string`
  - `  workflowToolSchemaOverride?: readonly unknown[]`
  - `  childInheritance?: WorkflowDefinition["childInheritance"]`
  - `}): WorkflowDefinition {`
  - `  const steps: WorkflowDefinition["steps"] = {`
  - `    "step-1": {`
  - `      id: "step-1",`
  - `      stepNumber: 1,`
  - `      checklistLabel: args?.stepOneChecklistLabel ?? "Step 1: Gather Context",`
  - `      buildPromptProjection: () => ({`
  - `        workflowSystemInstructionsBlock: args?.workflowSystemInstructionsBlock,`
  - `        workflowInputInstructionsBlock: args?.workflowInputInstructionsBlock,`
  - `        workflowToolSchemaOverride: args?.workflowToolSchemaOverride as any,`
  - `      }),`
  - `      allowWorkflowProgressRequest: false,`
  - `    },`
  - `  }`
  - `  if (args?.stepTwoChecklistLabel) {`
  - `    steps["step-2"] = {`
  - `      id: "step-2",`
  - `      stepNumber: 2,`
  - `      checklistLabel: args.stepTwoChecklistLabel,`
  - `      buildPromptProjection: () => ({`
  - `        workflowSystemInstructionsBlock: args?.workflowSystemInstructionsBlock,`
  - `        workflowInputInstructionsBlock: args?.workflowInputInstructionsBlock,`
  - `        workflowToolSchemaOverride: args?.workflowToolSchemaOverride as any,`
  - `      }),`
  - `      allowWorkflowProgressRequest: false,`
  - `    }`
  - `  }`
  - `  return {`
  - `    name: args?.name ?? "review-workflow",`
  - `    slashCommandName: args?.name ?? "review-workflow",`
  - `    useSkillName: args?.useSkillName ?? "review-workflow",`
  - `    persona: "engineer",`
  - `    projectSubfolder: "review",`
  - `    startCard: { markdownBody: "", submitLabel: "Continue" },`
  - `    childInheritance: args?.childInheritance,`
  - `    steps,`
  - `  }`
  - `}`
- Delete the two placeholder-era prompt-context tests exactly:
  - `it("marks suppressed internal subagent turns as continuation turns and forwards the current checklist", ...)`
  - `it("keeps deterministic placeholder workflows enabled even when step details cannot be resolved", ...)`
- Delete every workflow-specific test beginning with:
  - `it("includes workflow-backed activations in subagent prompt context", ...)`
- And ending with:
  - `it("suppresses pi-planning workflow persona instructions on internal turns without full prompt assembly", ...)`
- Replace the deleted workflow-specific tests with exactly these seven `it(...)` blocks:
  - `it("projects foundational workflow runtime fields into subagent prompt context", async () => { ... })`
    - create `const workflowToolSchemaOverride = [{ id: ClineDefaultTool.SET_WORKFLOW_VALUES }] as const`
    - create `const config = createTaskConfig(false)`
    - create `const runner = new SubagentRunner(config)`
    - create `const state = new TaskState()`
    - call `await config.workflowRuntime.activateWorkflow({`
    - `  taskState: state,`
    - `  workflow: createResolvedWorkflow({`
    - `    name: "review-workflow",`
    - `    useSkillName: "review-workflow",`
    - `    workflowSystemInstructionsBlock: "SYSTEM BLOCK",`
    - `    workflowInputInstructionsBlock: "INPUT BLOCK",`
    - `    workflowToolSchemaOverride,`
    - `  }),`
    - `})`
    - call `const context = await (runner as any).buildPromptContext({ ... shouldSendFullPromptAssembly: true, shouldUseContinuationPrompt: false })`
    - assert exactly:
      - `context.activeWorkflowName === "review-workflow"`
      - `context.activeWorkflowStepNumber === 1`
      - `context.workflowSystemInstructionsBlock === "SYSTEM BLOCK"`
      - `context.workflowInputInstructionsBlock === "INPUT BLOCK"`
      - `context.workflowToolSchemaOverride === workflowToolSchemaOverride`
      - `context.skills` deep-equals `[]`
      - `context.isContinuationTurn === false`
      - `context.enableNativeToolCalls === false`
      - `context.enableParallelToolCalling === false`
      - `context.isSubagentRun === true`
  - `it("suppresses prompt skills on internal turns while preserving workflow runtime projection", async () => { ... })`
    - reuse the same activation pattern
    - call `buildPromptContext(...)` with:
      - one available skill `{ name: "alpha-skill", description: "Alpha", path: "/skills/alpha/SKILL.md", source: "project" }`
      - `shouldSendFullPromptAssembly: false`
      - `shouldUseContinuationPrompt: true`
    - assert exactly:
      - `context.skills` deep-equals `[]`
      - `context.activeWorkflowName === "review-workflow"`
      - `context.activeWorkflowStepNumber === 1`
      - `context.workflowSystemInstructionsBlock === "SYSTEM BLOCK"`
      - `context.workflowInputInstructionsBlock === "INPUT BLOCK"`
      - `context.isContinuationTurn === true`
      - `context.isSubagentRun === true`
  - `it("auto-activates an explicitly assigned shipped workflow before the first subagent turn", async () => { ... })`
    - stub `WorkflowRegistry.resolveWorkflowByUseSkillName` to return `createResolvedWorkflow({`
    - `  name: "review-workflow",`
    - `  useSkillName: "review-workflow",`
    - `  workflowSystemInstructionsBlock: "SYSTEM BLOCK",`
    - `  workflowInputInstructionsBlock: "INPUT BLOCK",`
    - `})`
    - stub `PromptRegistry.getInstance().get(...)` to assert exactly:
      - `context.activeWorkflowName === "review-workflow"`
      - `context.activeWorkflowStepNumber === 1`
      - `context.workflowSystemInstructionsBlock === "SYSTEM BLOCK"`
      - `context.workflowInputInstructionsBlock === "INPUT BLOCK"`
      - `context.isSubagentRun === true`
      - return `"system prompt"`
    - keep `SubagentBuilder.prototype.getConfiguredSkills`, `discoverSkills`, and `getAvailableSkills` stubs minimal
    - run `await runner.run("Skill: use_skill('review-workflow')", () => {})`
    - assert result status is `"completed"`
    - assert the model was called exactly once
  - `it("leaves the parent workflow state unchanged while inheriting declared values into the child workflow session", async () => { ... })`
    - seed `config.taskState.activeWorkflowName = "parent-workflow"`
    - seed `config.taskState.activeWorkflowSession` exactly with:
      - `workflowName: "parent-workflow"`
      - `activeStepNumber: 1`
      - `workflowValues: { review_input: "/tmp/review-input.md", ignored_parent: "drop" }`
      - `projectSelection: { projectMode: "new", projectTitle: "", projectFolderName: "" }`
      - `ui: { startCardSession: undefined, formSession: undefined, stepResolutionSession: undefined, suppressedWorkflowFormIds: [], suppressedWorkflowStepResolutionDefinitionIds: [] }`
    - seed `config.taskState.currentFocusChainChecklist = "- [ ] Parent Step"`
    - stub `WorkflowRegistry.resolveWorkflowByUseSkillName` to return `createResolvedWorkflow({`
    - `  name: "child-workflow",`
    - `  useSkillName: "child-workflow",`
    - `  childInheritance: [{ parentKey: "review_input", childKey: "review_input" }],`
    - `})`
    - call `await (runner as any).autoActivateAssignedWorkflow(state, ["child-workflow"])`
    - assert exactly:
      - `state.activeWorkflowName === "child-workflow"`
      - `state.activeWorkflowSession?.workflowValues` deep-equals `{ review_input: "/tmp/review-input.md" }`
      - after mutating `state.activeWorkflowSession!.workflowValues.review_input = "/tmp/child-mutated.md"`, `config.taskState.activeWorkflowSession?.workflowValues.review_input` remains `"/tmp/review-input.md"`
      - `config.taskState.activeWorkflowName === "parent-workflow"`
      - `config.taskState.currentFocusChainChecklist === "- [ ] Parent Step"`
  - `it("does not auto-activate a second workflow when child state is already active", async () => { ... })`
    - seed `state.activeWorkflowName = "existing-workflow"`
    - seed `state.activeWorkflowSession` with a valid one-step session object
    - stub `WorkflowRegistry.resolveWorkflowByUseSkillName`
    - call `await (runner as any).autoActivateAssignedWorkflow(state, ["review-workflow"])`
    - assert the registry stub was not called
    - assert `state.activeWorkflowName` remains `"existing-workflow"`
  - `it("routes subagent task_progress updates to subagent-local focus chain storage instead of the parent callback", async () => { ... })`
    - keep the existing temp-dir, `disk.ensureTaskDirectoryExists`, parent checklist seed, `createSubagentTaskConfig(...)`, and file assertions pattern
    - do not activate any placeholder or managed workflow in this test
    - assert exactly:
      - parent callback was not called
      - `subagentState.currentFocusChainChecklist === "- [ ] Child Step"`
      - parent focus-chain file still contains only the parent checklist
      - subagent focus-chain file contains only `Child Step`
  - `it("uses distinct subagent-local focus-chain storage keys across multiple subagent runs", async () => { ... })`
    - keep the existing temp-dir and `disk.ensureTaskDirectoryExists` scaffold
    - create two runners and two `TaskState` instances
    - create two subagent task configs through `createSubagentTaskConfig(...)`
    - call `updateFCListFromToolResponse("- [ ] Alpha Step")` on the first and `updateFCListFromToolResponse("- [ ] Beta Step")` on the second
    - assert:
      - the two storage keys differ
      - the two subagent file paths differ
      - one file contains `Alpha Step`
      - the other file contains `Beta Step`
- Do not preserve any assertion for:
  - `managedWorkflowActive`
  - `activeWorkflowPersonaInstructions`
  - `activeWorkflowReminder`
  - `activeWorkflowSupportsPlaceholders`
  - `activePlaceholderWorkflowId`
  - `activePlaceholderWorkflowSource`
  - `activePlaceholderWorkflowStepNumber`
  - `activeDeterministicPlaceholderWorkflowEnabled`
  - `resolveAvailableWorkflows(...)`
  - `activateManagedWorkflowInTaskState(...)`
  - `activatePlaceholderWorkflowInTaskState(...)`
  - `inheritSharedParentPlaceholdersToActivatedWorkflow(...)`
  - placeholder markdown parsing, reminder injection, persona injection, or placeholder-step progression

### `src/core/task/__tests__/prompt-context.test.ts`

Status: complete

- Delete this file entirely in one pass: `src/core/task/__tests__/prompt-context.test.ts`
- This is a legacy unit test for retiring helper exports from `src/core/task/index.ts`; do not preserve or remap any of its assertions.
- Delete the direct coverage of:
  - `shouldIncludePersistentPromptContext(...)`
  - `appendPromptInjectionBlocksToSystemPrompt(...)`
  - `isActiveDeterministicPlaceholderWorkflowEnabled(...)`
- Delete the assertions for:
  - `activeWorkflowId`
  - `activePlaceholderWorkflowId`
  - placeholder-source-based deterministic workflow detection
  - runtime prompt-injection block concatenation
- Do not replace this suite with new runtime-owned workflow projection tests in this file.

### `src/core/task/__tests__/prompt-refresh.test.ts`

Status: complete

- Lines `86`-`125`: update the `shouldUseContinuationTurnPrompt(...)` test block in one pass so it matches the foundational helper signature. Remove `managedWorkflowActive` from every helper call, rename the first test so it asserts continuation-turn use for non-human turns without a full prompt refresh, keep the human-authored-input and full-prompt-refresh false cases, and delete the legacy `returns false when a managed workflow is active` test entirely. Leave the frequency and counter tests in lines `11`-`84` unchanged.

### `src/core/prompts/system-prompt/__tests__/integration.test.ts`

Status: complete

- Lines `30` and `2254`-`2343`: rewrite only the workflow-specific integration tests in this file so they validate foundational workflow prompt blocks instead of standalone workflow persona injection. Do not edit snapshot files in this row.
- Delete the import `resolveWorkflowPersonaInstructions` from `../registry/workflowPersonaRegistry`.
- Delete exactly these four tests:
  - `it("injects workflow persona guidance for GPT-5.4 OpenAI full prompts without XML artifacts", async function () { ... })`
  - `it("injects scrum-master workflow persona guidance for pi-planning full prompts without XML artifacts", async function () { ... })`
  - `it("omits workflow persona guidance on continuation turns", async function () { ... })`
  - `it("omits pi-planning workflow persona guidance on continuation turns", async function () { ... })`
- Replace them with exactly these four tests:
  - `it("renders runtime-projected workflow system and input blocks in GPT-5.4 OpenAI full prompts", async function () { ... })`
  - `it("renders continuation-turn workflow blocks when both projected blocks are present", async function () { ... })`
  - `it("omits the workflow system block on continuation turns when only the workflow input block is projected", async function () { ... })`
  - `it("omits the workflow input block on continuation turns when only the workflow system block is projected", async function () { ... })`
- In all four replacement tests:
  - use `runPromptTest(...)`
  - use `providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai")`
  - set `enableNativeToolCalls: true`
  - set `useMinimalGptPrompt: true`
  - do not set `activeWorkflowPersonaInstructions`
  - do not assert `Role: QA Agent`, `Role: Scrum Master`, `Persona`, or `AGENT_ROLE`
- For the full-prompt test, seed exactly:
  - `activeWorkflowName: "review-workflow"`
  - `workflowSystemInstructionsBlock: "## WORKFLOW IDENTITY\nRole: Review Workflow"`
  - `workflowInputInstructionsBlock: "# CURRENT WORKFLOW STEP\nStep 1: Gather Context"`
  - assert `systemPrompt` includes both seeded blocks
  - assert `systemPrompt` does not include `<agent`
  - assert `systemPrompt` does not include `<persona`
  - assert `systemPrompt` does not include `Active BMAD agent persona`
- For the continuation-turn test with both blocks present:
  - also set `isContinuationTurn: true`
  - seed the same two blocks
  - assert `systemPrompt` includes `CONTINUATION TURN`
  - assert `systemPrompt` includes both seeded blocks
- For the continuation-turn test with only the input block:
  - set `isContinuationTurn: true`
  - set `activeWorkflowName: "review-workflow"`
  - set `workflowSystemInstructionsBlock: undefined`
  - set `workflowInputInstructionsBlock: "# CURRENT WORKFLOW STEP\nStep 2: Review"`
  - assert `systemPrompt` includes `CONTINUATION TURN`
  - assert `systemPrompt` includes `# CURRENT WORKFLOW STEP`
  - assert `systemPrompt` includes `Step 2: Review`
  - assert `systemPrompt` does not include `## WORKFLOW IDENTITY`
- For the continuation-turn test with only the system block:
  - set `isContinuationTurn: true`
  - set `activeWorkflowName: "review-workflow"`
  - set `workflowSystemInstructionsBlock: "## WORKFLOW IDENTITY\nRole: Review Workflow"`
  - set `workflowInputInstructionsBlock: undefined`
  - assert `systemPrompt` includes `CONTINUATION TURN`
  - assert `systemPrompt` includes `## WORKFLOW IDENTITY`
  - assert `systemPrompt` includes `Role: Review Workflow`
  - assert `systemPrompt` does not include `# CURRENT WORKFLOW STEP`
- Leave all surrounding native-tool, MCP, continuation-turn, and non-agent prompt coverage unchanged.

### `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`

Status: complete

- Delete this file entirely in one pass: `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
- This file is legacy placeholder-era coverage for retired contextual native-tool gating behavior; do not preserve or remap any of its assertions.
- Delete the direct coverage of:
  - `filterContextualNativeToolSpecs(...)`
  - `PLACEHOLDER_WORKFLOW_STEP_MATRIX`
- Delete the assertions for:
  - `activePlaceholderWorkflowName`
  - `activePlaceholderWorkflowStepNumber`
  - `managedWorkflowActive`
  - `.md` suffix normalization
  - placeholder bundle and placeholder-write tool exposure
  - legacy tool ids including `SET_WORKFLOW_PLACEHOLDERS` and `BUILD_REVIEW_DIFF_OUTPUT`
  - placeholder-matrix-driven `workflow_progress_request` exposure
- Do not replace this suite with runtime-owned workflow tool-schema override tests in this file.

### `src/core/prompts/system-prompt/__tests__/PromptBuilder.test.ts`

Status: complete

- Lines `302`-`355`: rewrite the `VariantBuilder auto-generation` block in one pass so it no longer references the retiring `SystemPromptSection.AGENT_ROLE` placeholder and remains purely a generic variant-builder test.
  - in the auto-generated-template test, delete `SystemPromptSection.AGENT_ROLE` from the component list and rewrite the include assertions and `expectedTemplate` to cover only the surviving generic component list `SystemPromptSection.TOOL_USE`, `SystemPromptSection.CAPABILITIES`, and `SystemPromptSection.RULES`
  - in the explicit-template test, replace `Custom template with {{AGENT_ROLE_SECTION}}` with a plain literal string such as `Custom template`, and replace the component list with surviving generic sections only
  - leave the empty-component error test unchanged

### `src/core/prompts/system-prompt/__tests__/response_tools.test.ts`

Status: complete

- Rewrite this file in one pass, but keep it at `src/core/prompts/system-prompt/__tests__/response_tools.test.ts`.
- Keep imports exactly:
  - `expect` from `chai`
  - `describe` and `it` from `mocha`
  - `getCurrentModeResponseToolsLine` and `getResponseToolsSection` from `../components/response_tools`
  - `type SystemPromptContext` from `../types`
- Delete all placeholder-workflow base contexts and all placeholder step-specific suites and assertions.
- Add one local helper exactly as:
  - `const makeContext = (overrides: Partial<SystemPromptContext> = {}): SystemPromptContext => ({`
  - `  ide: "TestIde",`
  - `  providerInfo: {`
  - `    mode: "act",`
  - `    providerId: "test",`
  - `    model: { id: "test-model", info: { supportsPromptCache: false } },`
  - `  },`
  - `  yoloModeToggled: false,`
  - `  ...overrides,`
  - `}) as SystemPromptContext`
- Replace the entire file body with exactly one suite:
  - `describe("response tools prompt helpers", () => { ... })`
- Inside it, add exactly these six `it(...)` blocks:
  - `it("omits workflow_progress_request from non-native ACT response tools", () => { ... })`
    - use `const context = makeContext()`
    - assert `getCurrentModeResponseToolsLine(context)` contains:
      - `` `attempt_completion` ``
      - `` `ask_followup_question` ``
      - `` `send_user_message` ``
    - assert it does not contain:
      - `` `workflow_progress_request` ``
      - `` `act_mode_respond` ``
    - assert `getResponseToolsSection(context)` contains:
      - `- \`attempt_completion\`: Use once at the end of each workflow`
      - `- \`ask_followup_question\`: Use to ask a question + present options for user to select`
      - `- \`send_user_message\`: Use by default to send messages to the user`
    - assert it does not contain:
      - `- \`workflow_progress_request\`:`
      - `- \`act_mode_respond\`:`
  - `it("omits workflow_progress_request from non-native PLAN response tools", () => { ... })`
    - use `const context = makeContext({ providerInfo: { ...makeContext().providerInfo, mode: "plan" } })`
    - assert `getCurrentModeResponseToolsLine(context)` contains:
      - `` `generate_plan_output` ``
      - `` `ask_followup_question` ``
      - `` `send_user_message` ``
    - assert it does not contain:
      - `` `workflow_progress_request` ``
      - `` `act_mode_respond` ``
    - assert `getResponseToolsSection(context)` contains `- \`generate_plan_output\`: Use to present a structured plan`
    - assert it does not contain `- \`workflow_progress_request\`:`
  - `it("includes workflow_progress_request in ACT response tools only when native visibility includes it", () => { ... })`
    - use `const context = makeContext({`
    - `  enableNativeToolCalls: true,`
    - `  visibleNativeToolNames: ["attempt_completion", "ask_followup_question", "workflow_progress_request", "send_user_message"],`
    - `})`
    - assert `getCurrentModeResponseToolsLine(context)` contains `` `workflow_progress_request` ``
    - assert `getResponseToolsSection(context)` contains exactly:
      - `- \`workflow_progress_request\`: Use when the active workflow step is complete and you need the runtime-owned Yes/No confirmation before advancing`
  - `it("omits workflow_progress_request from ACT response tools when native visibility excludes it", () => { ... })`
    - use `const context = makeContext({`
    - `  enableNativeToolCalls: true,`
    - `  visibleNativeToolNames: ["attempt_completion", "ask_followup_question", "send_user_message"],`
    - `})`
    - assert both helper outputs do not contain `` `workflow_progress_request` ``
  - `it("includes workflow_progress_request in PLAN response tools only when native visibility includes it", () => { ... })`
    - use `const context = makeContext({`
    - `  providerInfo: { ...makeContext().providerInfo, mode: "plan" },`
    - `  enableNativeToolCalls: true,`
    - `  visibleNativeToolNames: ["generate_plan_output", "ask_followup_question", "workflow_progress_request", "send_user_message"],`
    - `})`
    - assert `getCurrentModeResponseToolsLine(context)` contains `` `workflow_progress_request` ``
    - assert `getCurrentModeResponseToolsLine(context)` does not contain `` `act_mode_respond` ``
    - assert `getResponseToolsSection(context)` contains the shared `workflow_progress_request` description line
  - `it("mentions act_mode_respond only when it is visible in native ACT mode", () => { ... })`
    - first use `const visibleContext = makeContext({`
    - `  enableNativeToolCalls: true,`
    - `  visibleNativeToolNames: ["attempt_completion", "ask_followup_question", "workflow_progress_request", "send_user_message", "act_mode_respond"],`
    - `})`
    - assert both helper outputs contain `` `act_mode_respond` ``
    - then use `const hiddenContext = makeContext({`
    - `  enableNativeToolCalls: true,`
    - `  visibleNativeToolNames: ["attempt_completion", "ask_followup_question", "workflow_progress_request", "send_user_message"],`
    - `})`
    - assert both helper outputs do not contain `` `act_mode_respond` ``
- Do not preserve any assertion for:
  - `activePlaceholderWorkflowName`
  - `activePlaceholderWorkflowStepNumber`
  - `activeWorkflowSupportsPlaceholders`
  - `managedWorkflowActive`
  - placeholder-step-driven `workflow_progress_request` exposure

### `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`

Status: complete

- Delete this file entirely in one pass: `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
- This file is legacy prompt-component coverage for retiring `components/task_progress.ts`; do not preserve or remap any of its assertions.
- Delete the direct coverage of:
  - `getUpdatingTaskProgress(...)`
- Delete the assertions for:
  - managed-workflow task-progress prompt text
  - placeholder-workflow task-progress prompt text
  - deterministic-placeholder prompt behavior
  - placeholder-step-specific `workflow_progress_request` prompt instructions
  - generic `task_progress` prompt guidance
  - `__COMPLETE_NEXT_STEP__` prompt instructions
- Do not replace this suite with new runtime-owned workflow prompt-block tests in this file.

### `webview-ui/src/components/chat/ChatRow.test.tsx`

Status: complete

- Lines `1`-`4`, `42`-`82`, and after line `449`: rewrite the workflow UI test helpers and suites in one pass so this file matches the foundational shared workflow-form and workflow-start-card rendering contracts used by `ChatRow.tsx`.
  - in the top import, replace `import type { ClineMessage } from "@shared/ExtensionMessage"` with `import type { ClineMessage, WorkflowStartCard } from "@shared/ExtensionMessage"`
  - in `createWorkflowFormMessage(...)`, replace the mocked payload field `resolverId` with `workflowFormId`
  - keep the existing workflow-form rendering coverage, but update it only as needed so all mocked payloads and assertions compile against the renamed shared `WorkflowForm` contract
  - add a new helper `createWorkflowStartCardMessage(payloadOverrides?: Partial<WorkflowStartCard>): ClineMessage` that returns an `ask: "workflow_start_card"` message with this exact default payload before overrides:
    - `sessionId: "workflow-start-card-session"`
    - `title: "Start New Project"`
    - `markdownBody: "Choose how to begin."`
    - `submitLabel: "Start project"`
    - `projectMode: "existing"`
    - `existingProjectOptions: [{ value: "project-alpha", label: "Project Alpha" }, { value: "project-beta", label: "Project Beta" }]`
    - `selectedExistingProject: "project-beta"`
    - `newProjectTitle: "Fresh Workspace"`
  - add a companion `renderWorkflowStartCard(message: ClineMessage)` helper that mirrors the existing `renderWorkflowForm(...)` wrapper around `ChatRowContent`
  - after the existing workflow-form suite, add `describe("ChatRow workflow start card rendering", () => { ... })` with exactly these two tests:
    - `it("renders existing-project workflow start cards from structured option objects", ...)`
      - render `createWorkflowStartCardMessage()` with default payload
      - assert the title text `Start New Project`
      - assert the markdown body text `Choose how to begin.`
      - assert both radio labels `Create a new project` and `Use an existing project`
      - assert the `<select>` labeled `Existing project` is present and has value `"project-beta"`
      - assert the rendered select options include visible labels `Project Alpha` and `Project Beta`
      - assert the submit button labeled `Start project` is present
      - assert `screen.queryByLabelText("New project title")` returns `null`
    - `it("renders new-project workflow start cards with the seeded title input", ...)`
      - render `createWorkflowStartCardMessage({ projectMode: "new", selectedExistingProject: "", newProjectTitle: "Fresh Workspace" })`
      - assert the input labeled `New project title` is present and has value `"Fresh Workspace"`
      - assert the submit button labeled `Start project` is present
      - assert `screen.queryByLabelText("Existing project")` returns `null`
  - do not add submit/click behavior assertions in this file; this row is render-contract coverage only
  - do not add teardown-clears-UI assertions in this file; `ChatRowContent` renders from the row message payload itself, so teardown projection must be covered at a higher-level UI/state seam instead of this row renderer unit test

### `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`

Status: complete

- Lines `1`-`46` and `264`-`272`: rewrite this suite in one pass so it matches the foundational shared workflow-form and workflow-start-card submission contracts.
  - replace the shared type imports `ClineWorkflowForm` and `ClineWorkflowStartCard` with `WorkflowForm` and `WorkflowStartCard`
  - extend the proto import to include `WorkflowStartCardProjectMode`
  - in `createWorkflowForm(...)`, replace `resolverId` with `workflowFormId`; leave the existing workflow-form field-serialization assertions unchanged because the submit request shape does not carry that field
  - change `createWorkflowStartCard()` to `createWorkflowStartCard(payloadOverrides?: Partial<WorkflowStartCard>): WorkflowStartCard`
  - use this exact default payload before overrides:
    - `sessionId: "start-card-session"`
    - `title: "Workflow Start"`
    - `markdownBody: "Start card body"`
    - `submitLabel: "Start project"`
    - `projectMode: "existing"`
    - `existingProjectOptions: [{ value: "existing-a", label: "Existing Project A" }, { value: "existing-b", label: "Existing Project B" }]`
    - `selectedExistingProject: "existing-b"`
    - `newProjectTitle: "New Workspace"`
  - replace the single legacy start-card test with exactly these two tests:
    - `it("builds and submits existing-project workflow start-card requests", ...)`
      - assert `buildWorkflowStartCardSubmissionRequest(createWorkflowStartCard())` matches:
        - `sessionId: "start-card-session"`
        - `action: WorkflowStartCardAction.WORKFLOW_START_CARD_ACTION_SUBMIT`
        - `projectMode: WorkflowStartCardProjectMode.WORKFLOW_START_CARD_PROJECT_MODE_EXISTING`
        - `selectedExistingProject: "existing-b"`
        - `newProjectTitle: "New Workspace"`
      - then `await submitWorkflowStartCard(createWorkflowStartCard())` and assert the mocked client was called once with the same mapped fields
    - `it("builds and submits new-project workflow start-card requests", ...)`
      - call `createWorkflowStartCard({ projectMode: "new", selectedExistingProject: "", newProjectTitle: "Fresh Workspace" })`
      - assert the built request matches:
        - `action: WorkflowStartCardAction.WORKFLOW_START_CARD_ACTION_SUBMIT`
        - `projectMode: WorkflowStartCardProjectMode.WORKFLOW_START_CARD_PROJECT_MODE_NEW`
        - `selectedExistingProject: ""`
        - `newProjectTitle: "Fresh Workspace"`
      - then assert `submitWorkflowStartCard(...)` forwards the same mapped fields
  - do not assert `existingProjectOptions` on the built request; keep it only in the helper payload because `WorkflowStartCardSubmissionRequest` does not carry that field
