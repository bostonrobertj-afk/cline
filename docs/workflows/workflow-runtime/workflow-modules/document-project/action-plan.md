# Document Project Workflow Module Action Plan

## FrontMatter

- Read this plan from top to bottom before making any changes.
- Read each task and subtask in full immediately before executing it.
- Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.
  - Exception: You may execute multiple sequential subtasks with one patch only if they are scoped to the same file, but must review each subtask vs the landed code after the patch to ensure that every subtask was implemented exactly as prescribed before marking the subtask as complete.
  - After completing a task or subtask, update that step's checkbox from "[ ]" to "[x]".
- Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
- Do not edit any file not listed in the current step's allowed-files list.
- If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.
- Implement tasks and subtasks exactly as instructed. If deviation seems necessary, stop, inform the user, and explain why you believe the task or subtask should be carried out differently than prescribed.

## Scope

Build the `document-project` workflow module from `docs/workflows/workflow-runtime/workflow-modules/document-project/document-project-requirements.md`.

Authorized implementation method:

- Register the two artifact-family enum members first, then perform the project-selection/output-placement and prerequisite/session contract cutovers as two atomic multi-file patches before adding the module.
- Apply the approved legacy migration-matrix disposition for `projectSubfolder`: migrate every existing shipped workflow definition, affected runtime call site, shipped-metadata shape, fixture, and assertion to explicit interactive project selection and its equivalent `projectOutputPlacement` in the same atomic cutover; remove `projectSubfolder` and retain no compatibility alias, optional transition field, or parallel placement carrier.
- Resolve Document Project's fixed `Agent Guidance` / `agent-guidance` project through the existing `discoverWorkflowCandidates(...)` seam and one shared `finalizeWorkflowProjectSelection(...)` helper.
- User-approved clarification: treat registered workflow definitions as the shipped workflow inventory. Update `ShippedWorkflowMetadata` as a structural type contract and cover that contract directly in tests; do not add a separate metadata registry, projection function, accessor, or second production representation of shipped workflows.
- User-approved clarification: persist deterministic prerequisite results in declaration order by staging each result plus its path and linked-artifact metadata changes on a cloned session, validating the complete staged session, and replacing the active session once. Do not mutate the live session and roll changes back.
- User-approved clarification: after a failed deterministic prerequisite commit has left the session on the resolve route's following branch, use the existing `findContinuationSourceRoute(...)` seam to re-enter only unresolved deterministic prerequisite work. Preserve the existing branch advance; do not roll the branch back or add a resume ledger or lifecycle field.
- User-approved clarification: the existing canonical epic inventory production output, including `"story-index-generated": false`, is authoritative. Update only the stale `UpsertEpicToolHandler.test.ts` expected epic objects during the Subtask 2.2 fixture cutover; do not change production behavior or any other assertion.
- Reuse the existing shared prerequisite discovery, artifact allocation, empty-file creation, deterministic document-build, form, prompt rendering, persistence, resume, and teardown capabilities.
- Preserve the live three-output prompt projection contract: full-turn input workflow block, continuation-turn input workflow block, and tool-schema override only. Both input blocks retain current-step details; no workflow-specific system-instructions block is added.
- Reuse Step 4's shared registration, strict-plan, approval, auto-approval, hook, `.clineignore`, and workspace path-policy controls as-is. Run their existing regression suites, but do not add, reorganize, or recast shared execution-control tests merely because this module projects those tools.
- Define the code-owned module under `src/core/task/workflow-runtime/workflow-modules/document-project`.
- Use `run_deterministic_procedure` only for Step 1 prerequisite-state validation and Step 2 atomic creation-flag derivation.
- Apply the successfully derived, validated Step 2 Boolean map through the existing shared deterministic-procedure workflow-value persistence contract as-is; do not add a Document Project-specific persistence-failure route or mapping.
- Use declarative workflow-form transitions, including Form 2 Panel I's conditional transition based on form-session data; do not add `continue_workflow_form` routing.
- Use runtime-owned `allocate_artifact` and `build_workflow_document` actions. Do not add a Document Project handler, scanner, allocator, resume ledger, lifecycle field, or form runtime.
- Project Step 4 tools from registered `ModelFamily.NATIVE_GPT_5` shared specs; Steps 1 through 3 must return exact empty arrays.

Do not modify:

- `docs/workflows/workflow-runtime/workflow-modules/document-project/document-project.md`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/document-project-requirements.md`
- `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md`
- `docs/workflows/workflow-runtime/requirements.md`
- `docs/workflows/workflow-runtime/architecture.md`
- `.cline/skills/bmad-document-project/**/*`

Protected-document authoring baseline:

```text
303e0c78e00e86f946aabfc61635dca5ac7454289a5072eadc18d4f6b388660a  docs/workflows/workflow-runtime/workflow-modules/document-project/document-project.md
09eef98f8645cfd4f66733182e1f070eb6a2a2d786378929b0b374f849acf994  docs/workflows/workflow-runtime/workflow-modules/document-project/document-project-requirements.md
1f73d80903834bc2566de8d29f767a2da038680ef003629699913f09b63008d1  docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md
5d86dabb25d99d02c33cce0a2048917a3661f1988c99c41364354987911084cb  docs/workflows/workflow-runtime/requirements.md
bac75aa6317361ecfe8feeac047cafc16fa96c4235ab06e20f3ab388f37062ce  docs/workflows/workflow-runtime/architecture.md
```

These SHA-256 values capture the complete current content, including the user-approved FR-20p8e clarification and the approved `projectSubfolder` legacy migration-matrix disposition completed during action-plan authoring, plus the user's other pre-existing modified or untracked state. A mismatch at final scope review means a protected governing document changed after action-plan authoring; stop and ask the user rather than accepting, reverting, or overwriting it.

## Verified Live Contracts

- `WorkflowDefinition`, `ShippedWorkflowMetadata`, `WorkflowArtifactDefinition`, `WorkflowPrerequisiteFileDefinition`, `ActiveWorkflowSession`, decision actions, branch events, and prompt builders are defined in `src/core/task/workflow-runtime/types.ts`.
- `WorkflowArtifactFamily` and `WORKFLOW_ARTIFACT_FAMILY_REGISTRY` are defined in `src/core/task/workflow-runtime/artifactFamilies.ts`.
- `WorkflowRuntime.activateWorkflow(...)`, `resolveNextAction(...)`, `applyWorkflowValueWrites(...)`, `cloneWorkflowSession(...)`, prerequisite resolution, artifact allocation, artifact discovery, restore validation, and definition validation are in `src/core/task/workflow-runtime/WorkflowRuntime.ts`.
- `buildNextActionFromDecisionTreeRoute(...)` advances a non-transition route to its following branch before invoking its action. `findContinuationSourceRoute(...)` already locates a source route whose `followingBranchId` is the current branch; deterministic prerequisite re-entry extends that existing continuation pattern.
- `discoverWorkflowCandidates(...)` already owns directory discovery and `discoverWorkflowPrerequisiteFileCandidates(...)` already supports exact filenames, empty project-relative segments, containment, workspace path policy, and `ENOENT`; `discovery.ts` and `prerequisiteFiles.ts` require no production revision.
- `WorkflowFormRuntime` resolves conditional transitions from form values and form-session data. Form 2 can therefore use a declarative Panel I transition and requires no runtime-routed form continuation.
- `quick-spec/quickSpecWorkflow.ts` supplies the existing allocation, retry, document-build, source-route correlation, and explicit completion patterns.
- `correct-course/correctCourseWorkflow.ts` supplies the existing deterministic-procedure, runtime-only step, form-session-data, and shared-tool-projection patterns.
- `quick-spec/quickSpecDocument.ts` supplies the deterministic code-owned document-builder pattern.
- `WorkflowRegistry.ts` is the canonical shipped workflow inventory and has no separate `ShippedWorkflowMetadata` producer.
- `SubagentRunner.autoActivateAssignedWorkflow(...)` owns parent-assigned child workflow resolution before `WorkflowRuntime.activateWorkflow(...)`; its existing parent-project guard and exact failure message must remain for interactive child selection but must not reject an automatic-fixed child solely because the parent project selection is incomplete.
- `WorkflowRuntime.buildTurnProjection(...)` returns only `workflowInputPayloadBlock`, `continuationWorkflowInputPayloadBlock`, and `workflowToolSchemaOverride`; both input payload builders include the current-step wrapper, while only the full-turn block is eligible for persona projection.
- `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` is the focused shared-runtime test surface.
- `src/core/prompts/system-prompt/__tests__/integration.test.ts` is the workflow prompt/tool projection integration surface.
- `src/core/slash-commands/__tests__/index.test.ts` and `src/test/slash-commands.test.ts` cover canonical slash activation and shipped slash discovery.

## Phase 1: Module Build And Focused Verification

### Foundational Shared Contracts

### [x] Task 1: Register The Two Singleton Artifact Families

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/artifactFamilies.ts`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

Full target file paths for this task and its numbered subtask: `src/core/task/workflow-runtime/artifactFamilies.ts` and `src/core/task/workflow-runtime/WorkflowRuntime.ts`. The action-plan path is allowed only for checkbox updates.

- [x] Subtask 1.1: Perform one atomic two-file patch so the artifact-family enum, singleton-family unions, exhaustive registry, and filename-parser switch remain compile-complete together. In `src/core/task/workflow-runtime/artifactFamilies.ts`, add:

```ts
ProjectOverview = "project_overview",
DeveloperGuide = "developer_guide",
```

to `WorkflowArtifactFamily`. Add both new enum members to `WorkflowSingletonProjectArtifactFamilyDefinition["family"]`, add `"project_overview" | "developer_guide"` to its `singletonIdentity` union, and add these exact registry records:

```ts
[WorkflowArtifactFamily.ProjectOverview]: {
	family: WorkflowArtifactFamily.ProjectOverview,
	allocationMode: "singleton_project",
	identityRequirement: "none",
	filenamePattern: "project-overview.md",
	fileExtension: ".md",
	contentKind: "markdown",
	numberingScope: "project_singleton",
	singletonIdentity: "project_overview",
	discoveryPattern: /^project-overview\.md$/,
},
[WorkflowArtifactFamily.DeveloperGuide]: {
	family: WorkflowArtifactFamily.DeveloperGuide,
	allocationMode: "singleton_project",
	identityRequirement: "none",
	filenamePattern: "developer-guide.md",
	fileExtension: ".md",
	contentKind: "markdown",
	numberingScope: "project_singleton",
	singletonIdentity: "developer_guide",
	discoveryPattern: /^developer-guide\.md$/,
},
```

In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, add `WorkflowArtifactFamily.ProjectOverview` and `WorkflowArtifactFamily.DeveloperGuide` to the existing singleton-family case group in `parseWorkflowArtifactFilenameIdentity(...)` that returns `undefined`. These registered singleton artifacts use their linked deterministic exact-filename prerequisites as the sole existing-file resolution route; do not add either family to `normalizeExistingProjectArtifactIdentity(...)`, do not manufacture a `ParsedWorkflowArtifactIdentity`, and do not add generic existing-artifact resolution for either family. Do not add sidecar behavior or alter any existing family record.

### [x] Task 2: Perform The Compile-Safe Shared Contract Cutovers

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/types.ts`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `src/core/task/workflow-runtime/workflow-modules/acceptance-audit-review/acceptanceAuditReviewWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/correct-course/correctCourseWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/edgeCaseHunterReviewWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/quick-review/quickReviewWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryWorkflow.ts`
- `src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
- `src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `src/core/slash-commands/__tests__/index.test.ts`
- `src/core/task/__tests__/ToolExecutor.workflowModelToolLifecycle.test.ts`
- `src/core/task/__tests__/workflow-runtime-metadata.test.ts`
- `src/core/task/tools/handlers/__tests__/AppendBrainstormingSelectedTechniqueToolHandler.test.ts`
- `src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`
- `src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts`
- `src/core/task/tools/handlers/__tests__/DevStoryGitFinalizeToolHandler.test.ts`
- `src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`
- `src/core/task/tools/handlers/__tests__/RecordFindingsToolHandler.test.ts`
- `src/core/task/tools/handlers/__tests__/UpsertEpicToolHandler.test.ts`
- `src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts`
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `src/core/task/workflow-runtime/__tests__/prerequisiteFiles.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/acceptance-audit-review/__tests__/acceptanceAuditReviewWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingDocument.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseDocument.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureDocument.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsDocument.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

Full target file paths for this task and every numbered subtask below: every explicit production and test path in this allowed-files list. The action-plan path is allowed only for checkbox updates.

Each numbered subtask below is one atomic multi-file compile boundary and must be executed as one patch. Do not split either cutover across patches, add optional transitional fields, retain a compatibility alias, or defer any affected call site, fixture, or assertion to a later task.

- [x] Subtask 2.1: Perform the project-selection/output-placement cutover atomically.

  In `types.ts`, add these exact exported types immediately after `WorkflowProjectSubfolder`:

```ts
export type WorkflowProjectSelectionDefinition =
	| { kind: "interactive" }
	| {
			kind: "automatic_fixed"
			projectTitle: string
			projectFolderName: string
	  }

export type WorkflowProjectOutputPlacement =
	| { kind: "selected_project_root" }
	| { kind: "selected_project_subfolder"; subfolder: WorkflowProjectSubfolder }
```

  Replace `WorkflowDefinition.projectSubfolder` and `ShippedWorkflowMetadata.projectSubfolder` with required `projectSelection: WorkflowProjectSelectionDefinition` and `projectOutputPlacement: WorkflowProjectOutputPlacement`. Retain `entryProjectValueKeys` only on `WorkflowDefinition`; do not add it to `ShippedWorkflowMetadata`.

  In `WorkflowRuntime.ts`, add:

```ts
private resolveWorkflowProjectOutputPlacementSegments(
	workflow: WorkflowDefinition,
): readonly WorkflowProjectSubfolder[]
```

  Return `[]` for `selected_project_root`; after narrowing, return `[workflow.projectOutputPlacement.subfolder]` for `selected_project_subfolder`. In `resolveWorkflowArtifactAllocation(...)`, set `artifactRelativePath` with `join(...this.resolveWorkflowProjectOutputPlacementSegments(args.workflow), artifactFilename)`. In `discoverWorkflowArtifactFilenames(...)`, preserve the existing `searchProjectWide === true` target sets—every `WORKFLOW_PROJECT_SUBFOLDERS` entry and the current implementation story-child sets—without adding the selected-project root; for `searchProjectWide === false`, build exactly one target set as `[projectFolderName, ...this.resolveWorkflowProjectOutputPlacementSegments(args.workflow)]`. In `loadEpicsIndex(...)`, build the path with `join(this.resolveWorkflowProjectOutputFolder(args.session), ...this.resolveWorkflowProjectOutputPlacementSegments(args.workflow), "Epics.index.json")`.

  At the start of `validateWorkflowDefinition(...)`, before nested field access, require `workflow.projectSelection`, `workflow.projectOutputPlacement`, and `workflow.entryProjectValueKeys` to pass `this.isPlainRecord(...)`. Accept only `projectSelection.kind === "interactive"` or `"automatic_fixed"`; for automatic fixed, require non-empty already-trimmed string `projectTitle` and `projectFolderName`, require `isWorkflowDiscoveryTargetPathSegment(projectFolderName)`, assign `const normalizedProjectFolderName = this.normalizeProjectFolderName(projectFolderName)`, and require `normalizedProjectFolderName !== "" && normalizedProjectFolderName === projectFolderName`. This reuses the existing runtime normalization contract and accepts only an already-canonical fixed filesystem identity. Accept only `projectOutputPlacement.kind === "selected_project_root"` without an own `subfolder`, or `"selected_project_subfolder"` with a string `subfolder` included in `WORKFLOW_PROJECT_SUBFOLDERS`. Only after those guards may the existing three `entryProjectValueKeys` destinations be validated. Remove every runtime read and validation branch for singular `WorkflowDefinition.projectSubfolder`; retain `WorkflowProjectSubfolder`, `WORKFLOW_PROJECT_SUBFOLDERS`, and every prerequisite/action `projectSubfolderSegments` contract.

  In all 16 production workflow definitions listed above, add `projectSelection: { kind: "interactive" }` and replace `projectSubfolder: X` with `projectOutputPlacement: { kind: "selected_project_subfolder", subfolder: X }`. Preserve the existing constant or literal: `review` for acceptance-audit-review, blind-review, code-review, edge-case-hunter-review, and quick-review; `discovery` for brainstorming; `implementation` for dev-story and quick-dev; and `planning` for correct-course, create-architecture, create-epics, create-story, pi-planning, quick-spec, validate-story, and write-remediation-story. Preserve every now-reused project-subfolder constant/import.

  In `WorkflowRuntime.test.ts`, rename the existing test title `scans prerequisite files from a project subfolder different from the active workflow projectSubfolder` to `scans prerequisite files from a project subfolder different from the active workflow output placement`; replace `createWorkflowDefinition(...)`'s `projectSubfolder` argument with optional `projectSelection?: WorkflowDefinition["projectSelection"]` and `projectOutputPlacement?: WorkflowDefinition["projectOutputPlacement"]`, defaulting to `{ kind: "interactive" }` and `{ kind: "selected_project_subfolder", subfolder: "planning" }`; replace both prerequisite helper parameters/pass-throughs with `projectOutputPlacement`; and convert the seven direct definition calls and one prerequisite helper call to their exact former placement. In the 16 corresponding workflow tests, replace singular-field fixtures/assertions with the exact interactive selection and unchanged placement assertions and assert no own `projectSubfolder` property. Replace the one metadata fixture, three `CreateWorkflowArtifactToolHandler.test.ts` fixtures in current `planning`, `discovery`, `planning` order, one `UseSkillToolHandler.test.ts` planning fixture, one `SubagentRunner.test.ts` review fixture, and one `src/core/slash-commands/__tests__/index.test.ts` planning fixture with the same two-field contract. Remove only direct singular-field fixture properties/assertions; preserve every `projectSubfolderSegments` occurrence and every still-used project-subfolder constant/import.

  After this patch, `rg -n '\bprojectSubfolder\b' src --glob '*.ts' --glob '!**/__tests__/**' --glob '!**/*.test.ts'` must return no production match: the singular production field is removed completely, while `projectSubfolderSegments` remains because the word-boundary pattern does not match it. The exact negative test assertions prescribed in this subtask and Subtask 11.1 remain permitted test-only matches. Do not add a compatibility alias, metadata registry, projection, accessor, or second shipped-workflow representation.

- [x] Subtask 2.2: Perform the prerequisite-resolution/session-state cutover atomically.

  In `types.ts`, add:

```ts
export type WorkflowPrerequisiteFileResolutionMode = "interactive" | "deterministic_exact_filename"

export type WorkflowPrerequisiteFileResolution =
	| { prerequisiteId: string; outcome: "found"; resolvedAbsolutePath: string }
	| { prerequisiteId: string; outcome: "not_found" }
```

  Make `WorkflowPrerequisiteFileDefinition.resolutionMode` a required `WorkflowPrerequisiteFileResolutionMode`, add optional `artifactId?: string`, and add required `prerequisiteFileResolutions: readonly WorkflowPrerequisiteFileResolution[]` to `ActiveWorkflowSession` between `entryArtifactResolution` and `ui`. Extend the standalone `intentMode: "new"` artifact-family union with the Task 1 enum members `WorkflowArtifactFamily.ProjectOverview` and `WorkflowArtifactFamily.DeveloperGuide`; do not add a new artifact-definition variant or change existing output-key types.

  In `WorkflowRuntime.resolveWorkflowArtifactIdentity(...)`, add `WorkflowArtifactFamily.ProjectOverview` and `WorkflowArtifactFamily.DeveloperGuide` beside the existing singleton-project cases in this same atomic patch. Require `args.familyDefinition.allocationMode === "singleton_project"` and return its registry-owned `singletonIdentity` with `parentIdentity: undefined` and `targetIdentity: undefined`. This keeps the extended `WorkflowArtifactDefinition` union compile-complete at the moment the two families become legal.

  In `WorkflowRuntime.activateWorkflow(...)`, initialize every new session with `prerequisiteFileResolutions: []`. In `WorkflowRuntime.test.ts`, make `createPrerequisiteFileDefinition(...)` default `resolutionMode` to `"interactive"` and emit `artifactId` only when supplied; add the new session field to its three existing active/persisted session literals. In `prerequisiteFiles.test.ts`, make `createPrerequisiteDefinition(...)` return `resolutionMode: "interactive"`.

  Add `resolutionMode: "interactive"` to every existing prerequisite declaration and matching exact expected object in acceptance-audit-review, blind-review, code-review, correct-course, create-epics, create-story, dev-story, edge-case-hunter-review, pi-planning, quick-dev, quick-review, validate-story, and write-remediation-story. Preserve every other prerequisite field and do not add `artifactId`.

  Add `prerequisiteFileResolutions: []` immediately after `entryArtifactResolution` in every existing explicit active/persisted session literal in the allowed test files, using these verified current counts: 16 in `integration.test.ts`; 14 in `SubagentRunner.test.ts`; 3 in `validateStoryWorkflow.test.ts`; 2 each in `response_tools.test.ts`, `workflow-runtime-metadata.test.ts`, and the acceptance-audit-review, blind-review, brainstorming, code-review, correct-course, create-architecture, create-epics, create-story, dev-story, edge-case-hunter-review, pi-planning, quick-spec, and write-remediation-story workflow tests; and 1 each in `ToolExecutor.workflowModelToolLifecycle.test.ts`, the seven listed handler tests other than `UseSkillToolHandler.test.ts`, `brainstormingDocument.test.ts`, `correctCourseDocument.test.ts`, `createArchitectureDocument.test.ts`, `createEpicsDocument.test.ts`, `piPlanningToolSchemas.test.ts`, `quickDevWorkflow.test.ts`, and `quickReviewWorkflow.test.ts`. Do not add the field to a deliberately malformed fixture later created to test missing or malformed resolution state. Remove no import, helper, export, or assertion solely because of this additive session field.

  In `src/core/task/tools/handlers/__tests__/UpsertEpicToolHandler.test.ts`, update the existing `epics` deep-equality expectation in `inserts, replaces, orders, preserves canonical epics, returns inventory, and clears the file-read cache` so each expected epic includes exactly `"story-index-generated": false`, matching the existing canonical epic inventory returned by production. Do not change production behavior or any other assertion.

  Complete the same atomic production-session cutover in `WorkflowRuntime.ts`. Add `WorkflowPrerequisiteFileResolution` to the existing type-only import from `./types`. In `cloneWorkflowSession(...)`, add `prerequisiteFileResolutions: session.prerequisiteFileResolutions.map((resolution) => ({ ...resolution }))`, so neither the array nor either resolution object aliases the source session. Beside the existing restore type guards, add `private isWorkflowPrerequisiteFileResolution(value: unknown): value is WorkflowPrerequisiteFileResolution`, requiring a plain object with exactly `prerequisiteId` and `outcome` for `not_found`, or exactly those keys plus `resolvedAbsolutePath` for `found`; require a non-empty prerequisite id and require the found path to be a non-empty absolute path through the existing `isAbsolute` import. Add `private isWorkflowPrerequisiteFileResolutionArray(value: unknown): value is readonly WorkflowPrerequisiteFileResolution[]`, requiring an array whose entries all pass that guard. In `validatePersistedWorkflowSessionForRestore(...)`, reject a missing or malformed `prerequisiteFileResolutions`; after that guard, add `prerequisiteFileResolutions: persistedSession.prerequisiteFileResolutions.map((resolution) => ({ ...resolution }))` to both the restore-time `compatibilitySession` literal and the final normalized session. Do not defer any required `ActiveWorkflowSession` production literal, structural restore guard, or final clone shape past this subtask.

### Shared Runtime Support

### [x] Task 3: Implement Automatic Fixed Project Selection

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `src/core/task/tools/subagent/SubagentRunner.ts`
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

Full target file paths for this task and every numbered subtask below: `src/core/task/workflow-runtime/WorkflowRuntime.ts`, `src/core/task/tools/subagent/SubagentRunner.ts`, and `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`. The action-plan path is allowed only for checkbox updates.

- [x] Subtask 3.1: Refactor main-agent entry handling so `buildWorkflowEntryFormDefinition(...)` always renders the existing informational panel first, but adds the existing project-selection panel only when `workflow.projectSelection.kind === "interactive"`. Preserve the current informational-panel fields/actions/copy. For interactive selection, preserve its transition to `WORKFLOW_ENTRY_PROJECT_SELECTION_PANEL_ID` and the existing selector panel unchanged. For `automatic_fixed`, return a `panels` record containing only the informational panel and give that panel the exact terminal transition `{ type: "conditional", conditionSourceKey: "__terminal__", branches: [], defaultTerminal: true }`. Successful automatic informational-panel submission must not itself clear the entry form or mutate project lifecycle state; it must hand off to Subtask 3.3.

- [x] Subtask 3.2: Extract the existing successful project-selection finalization sequence into:

```ts
private async finalizeWorkflowProjectSelection(args: {
	taskState: TaskState
	definition: WorkflowDefinition
	projectSelection: WorkflowProjectSelectionState
}): Promise<WorkflowNextAction>
```

Return `{ kind: "no_op" }` if the active session is absent. Otherwise, assign `session.projectSelection = args.projectSelection`, set `session.ui.formSession = undefined`, and `await this.applyWorkflowValueWrites(...)` once with:

```ts
{
	taskState: args.taskState,
	values: {
		[args.definition.entryProjectValueKeys.projectMode]: args.projectSelection.projectMode,
		[args.definition.entryProjectValueKeys.projectTitle]: args.projectSelection.projectTitle,
		[args.definition.entryProjectValueKeys.projectFolderName]: args.projectSelection.projectFolderName,
	},
}
```

Then `await this.ensureProjectFoldersExist(session)` and call `this.recordWorkflowProjectSelectionCompleted(session)`. For `projectMode === "existing"`, return `this.continueWorkflowEntryArtifactResolution({ taskState: args.taskState, workflow: args.definition, artifactResolutions: [] })`. Otherwise return `this.completeWorkflowEntryArtifactResolution({ taskState: args.taskState, artifactResolutions: await this.resolveNewProjectWorkflowEntryArtifactResolutions({ taskState: args.taskState }) })`. Move that exact sequence out of `handleWorkflowEntryFormOutcome(...)` without changing either continuation. Both interactive and automatic selection must return this helper's result and call the helper exactly once.

- [x] Subtask 3.3: Add:

```ts
private async resolveAutomaticFixedWorkflowProjectSelection(args: {
	taskState: TaskState
	definition: WorkflowDefinition
}): Promise<WorkflowNextAction>
```

First narrow with this exact false branch:

```ts
if (args.definition.projectSelection.kind !== "automatic_fixed") {
	return { kind: "no_op" }
}
```

Only after that guard may the helper read the fixed fields. Then call `discoverWorkflowCandidates(...)` with exactly:

```ts
{
	rootDirectory: this.resolveWorkflowProjectOutputRoot(),
	workspacePathPolicy: this.workspacePathPolicy,
	entryType: "directory",
	immediateChildrenOnly: true,
	buildLabel: (entryName) => entryName,
	sort: "alpha_asc",
}
```

It must not pass `targetPathSegments` or `namingPattern`. Build `WorkflowProjectSelectionState` from the definition, with `projectMode: "existing"` only when a candidate's `value` exactly equals `projectFolderName`, otherwise `"new"`, then return `this.finalizeWorkflowProjectSelection(...)`.

- [x] Subtask 3.4: In `handleWorkflowEntryFormOutcome(...)`, after obtaining the active definition, add a branch for a failure-free `WorkflowFormAction.SUBMIT` on `WORKFLOW_ENTRY_INFO_PANEL_ID` when `definition.projectSelection.kind === "automatic_fixed"`. Return `this.resolveAutomaticFixedWorkflowProjectSelection(...)` directly from that branch. Retain the current interactive project-selection-panel branch, but replace its inlined finalization sequence with one returned call to `this.finalizeWorkflowProjectSelection(...)`. Do not synthesize a project-selection panel or submission, and do not run discovery or create the fixed folder before successful informational-panel submission.

- [x] Subtask 3.5: In `WorkflowRuntime.activateWorkflow(...)`, derive `inheritsParentProjectSelection = parentSession !== undefined && workflow.projectSelection.kind === "interactive"` immediately before the existing incomplete-parent-project guard. Make that guard return `{ kind: "no_op" }` only when `inheritsParentProjectSelection` is true and the parent project title or folder name trims to an empty string; an automatic-fixed child with a present but incomplete parent session must pass this guard. Copy `parentSession.projectSelection` and initialize `lifecycle.projectSelectionCompleted: true` only when `inheritsParentProjectSelection` is true; otherwise initialize the existing blank `new` selection and `projectSelectionCompleted: false`. After assigning and refreshing the new session, when `parentSession !== undefined && workflow.projectSelection.kind === "automatic_fixed"`, return `this.resolveAutomaticFixedWorkflowProjectSelection({ taskState, definition: workflow })`; otherwise preserve the existing `this.resolveNextAction(...)` return. Preserve the incomplete-parent no-op for interactive child selection, the existing prohibition on active-step child forms, and every parent-session isolation behavior.

- [x] Subtask 3.6: In `SubagentRunner.autoActivateAssignedWorkflow(...)`, keep the existing `const parentSession = this.baseConfig.taskState.activeWorkflowSession` read in its current position after the assigned-skill-name guard. Split the current combined parent-session/project-completeness guard so a missing `parentSession` still returns the existing exact failure result before registry resolution:

```ts
{
	kind: "failed",
	error: "Subagent workflow assignment failed: parent workflow project selection is required before activating a child workflow.",
}
```

Then preserve the existing `resolveWorkflowByUseSkillName(assignedSkillName)` lookup and unresolved-workflow failure block. Immediately after successful workflow resolution, apply the project-title/project-folder completeness check only when `resolvedWorkflow.projectSelection.kind === "interactive"`; on failure, return the same exact existing failure result above. Do not apply that completeness check when `resolvedWorkflow.projectSelection.kind === "automatic_fixed"`: continue through the existing state snapshot, active-name assignment, `WorkflowRuntime.activateWorkflow(...)` call with `structuredClone(parentSession)`, next-action handling, and failure restoration. Add no import, new error string, fallback assignment path, or child project-selection implementation to `SubagentRunner`.

- [x] Subtask 3.7: In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add optional `projectSelection?: WorkflowDefinition["projectSelection"]` to `createResolvedWorkflow(...)` and make its migrated `projectSelection` property equal `args?.projectSelection ?? { kind: "interactive" }`; preserve the migrated `projectOutputPlacement: { kind: "selected_project_subfolder", subfolder: "review" }` and every other helper default.

Rename the existing `fails marker-present runs without complete parent project selection before the first child model request` test to `fails marker-present interactive workflow runs without complete parent project selection before the first child model request`. Preserve its missing-session, blank-title, and blank-folder cases, the exact existing user-visible error assertions, absence of child model requests, and per-case `activateWorkflow(...)` non-call. Because the revised runner resolves the workflow before testing completeness only for the two present-but-incomplete sessions, replace the final `resolveWorkflowByUseSkillNameStub` non-call assertion with exact call-count `2`; the missing-parent-session case must remain the sole case rejected before registry resolution.

Add one test named `allows marker-present automatic-fixed workflow activation with incomplete parent project selection`. Create the resolved fixture with:

```ts
projectSelection: {
	kind: "automatic_fixed",
	projectTitle: "Agent Guidance",
	projectFolderName: "agent-guidance",
},
```

Exercise two typed `ActiveWorkflowSession` parent cases: one with `projectTitle: " "` and `projectFolderName: "unrelated-parent"`, and one with `projectTitle: "Unrelated Parent"` and `projectFolderName: " "`. Each must have `projectMode: "existing"`, `lifecycle: { projectSelectionCompleted: false }`, `workflowValues: {}`, `entryArtifactResolution: undefined`, `prerequisiteFileResolutions: []`, an empty workflow-form/step-resolution UI state with both suppression arrays empty, and `branchContext.activeBranchId: "project-prompt"`. For each case, set the parent active workflow name to `"parent-workflow"`, stub `config.workflowRuntime.activateWorkflow(...)` to resolve to `{ kind: "project_prompt", promptProjection: createEmptyWorkflowPromptProjection() }`, call the existing reflected `autoActivateAssignedWorkflow` helper with a new child `TaskState` and `[workflow.useSkillName]`, and assert:

- the activation stub is called exactly once;
- its sole argument has the child task state, `workflowName: workflow.name`, `parentWorkflowName: "parent-workflow"`, and a parent session deeply equal but not reference-equal to that case;
- the cloned parent project-selection and workflow-values objects are each not reference-equal to the parent objects;
- neither parent object changes;
- the child state's active workflow name equals `workflow.name`.

Immediately before each activation, assign:

```ts
const parentProjectSelectionReference = parentSession.projectSelection
const parentWorkflowValuesReference = parentSession.workflowValues
const parentProjectSelectionSnapshot = structuredClone(parentSession.projectSelection)
const parentWorkflowValuesSnapshot = structuredClone(parentSession.workflowValues)
```

After activation, assert the parent still owns both exact references and deep-equals both snapshots. Use the captured references for the activation-argument non-aliasing assertions.

Assert the registry resolver is called exactly twice across the automatic-fixed cases. Add no filesystem setup, child form, model request, or replacement error copy; the stub isolates the runner guard, while Subtask 10.4 owns real-runtime automatic-fixed resolution with incomplete parent projects.

- [x] Subtask 3.8: Run the focused child-activation validation:

```sh
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts
```

### [x] Task 4: Implement Deterministic Artifact-Linked Prerequisite Resolution

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

Full target file path for this task and every numbered subtask below: `src/core/task/workflow-runtime/WorkflowRuntime.ts`. The action-plan path is allowed only for checkbox updates.

Subtasks 4.2 through 4.7 are one compile boundary because the commit and resolver call the validator introduced in Subtask 4.7. Execute those six sequential same-file subtasks in one patch under the FrontMatter exception, then review and mark each subtask separately before proceeding to Subtask 4.8.

- [x] Subtask 4.1: Extract the value-map mutation core currently inside `applyWorkflowValueWrites(...)` into:

```ts
private applyWorkflowValueWritesToSession(args: {
	definition: WorkflowDefinition | undefined
	session: ActiveWorkflowSession | undefined
	values: WorkflowValues
	clearKeys?: readonly string[]
}): {
	changedValues: WorkflowValues
	unchangedValues: WorkflowValues
	clearedKeys: readonly string[]
	unchangedClearKeys: readonly string[]
}
```

Move the existing key-inventory, JSON-safety, deduplication, equality, set, and clear behavior into this synchronous helper without changing it; it must not emit a trigger. Keep `applyWorkflowValueWrites(...)` as the public canonical seam by calling this helper against the live session and, only when the deduplicated changed/cleared key list is non-empty, invoking `this.recordWorkflowValuesPersistedTriggerIfRouted(...)` exactly once. Preserve that recorder's current routed-only behavior; do not require a trigger when no matching route exists.

- [x] Subtask 4.2: Implement the user-approved staged-clone atomic commit method by adding:

```ts
private commitDeterministicPrerequisiteResolution(args: {
	taskState: TaskState
	definition: WorkflowDefinition
	prerequisiteId: string
	resolution: WorkflowPrerequisiteFileResolution
	values: WorkflowValues
	clearKeys: readonly string[]
}): void
```

It must:
  1. assign `const session = args.taskState.activeWorkflowSession`; when absent, throw exactly `new Error("Cannot commit deterministic workflow prerequisite resolution without an active workflow session.")`; otherwise assign `const stagedSession = this.cloneWorkflowSession(session)`;
  2. assign `const workflowValueWriteResult = this.applyWorkflowValueWritesToSession({ definition: args.definition, session: stagedSession, values: args.values, clearKeys: args.clearKeys })`, where `stagedSession` is the clone, then assign `const changedKeys = this.dedupeWorkflowValueKeys([...Object.keys(workflowValueWriteResult.changedValues), ...workflowValueWriteResult.clearedKeys])`;
  3. replace or insert exactly one result for the prerequisite in definition declaration order;
  4. assign `const validationResult = this.validateCurrentPrerequisiteFileResolutions(args.definition, stagedSession)` and narrow with `if (validationResult.valid === false) { throw new Error(validationResult.errorMessage) }`; the accepted state is only an empty list or a declaration-order prefix with one consistent result per included id;
  5. assign `args.taskState.activeWorkflowSession = stagedSession` exactly once;
  6. when `changedKeys.length > 0`, invoke `this.recordWorkflowValuesPersistedTriggerIfRouted({ taskState: args.taskState, changedKeys })` exactly once after clone assignment. Preserve the recorder's routed-only contract: it records at most one `workflow_values_persisted` trigger and records none when the current branch has no matching route. Do not invoke the recorder for an empty list.

If any step before assignment throws or fails validation, leave the live session's prerequisite results, workflow values, and trigger state unchanged by this commit helper. Preserve the route's already-completed active-branch advance; Subtask 4.12 owns re-entry from that following branch. Do not implement live-session mutation plus rollback.

- [x] Subtask 4.3: In `buildResolvePrerequisiteFilesNextAction(...)`, narrow each prerequisite's `resolutionMode` before the current persisted-path shortcut or candidate/UI branches. For `"interactive"`, execute the current `hasPersistedPrerequisiteWorkflowValue(...)`, discovery, required/optional, single/multiple-match, skipped-id, and form behavior unchanged. For `"deterministic_exact_filename"`, do not use path presence as completion state; validate and consult `prerequisiteFileResolutions` as prescribed in Subtask 4.7. After narrowing the mode, require `prerequisite.requirement === "optional"` and `prerequisite.match.kind === "exact_filename"`; when either check fails, throw exactly `new Error(\`Workflow prerequisite file ${prerequisite.id} has an invalid deterministic exact-filename definition.\`)`. Call the existing `this.discoverPrerequisiteFileCandidates({ session, prerequisite })` wrapper, which owns selected-root resolution, workspace path policy, and `discoverWorkflowPrerequisiteFileCandidates(...)`. At each current-state validation call, narrow `validationResult.valid`; when it is `false`, execute `throw new Error(validationResult.errorMessage)` before discovery or mutation so the existing runtime caller owns failure reporting. Reuse a completed prefix member, and scan only the next unresolved declaration. Do not return `no_op`, construct module-specific failure copy, call local teardown, append/repair state, or create a terminal route from this shared resolver. Resolve valid state without any prerequisite choice, confirmation, rejection, cancel, skipped-id, or cannot-continue form.

- [x] Subtask 4.4: For deterministic resolution, persist exactly `{ prerequisiteId, outcome: "found", resolvedAbsolutePath: candidate.absolutePath }` for one exact match and exactly `{ prerequisiteId, outcome: "not_found" }` for no match. When `candidates.length > 1`, throw exactly `new Error(\`Workflow prerequisite file ${prerequisite.id} deterministic exact-filename resolution returned more than one candidate.\`)` before any commit. For an unlinked `found`, invoke:

```ts
this.commitDeterministicPrerequisiteResolution({
	taskState: args.taskState,
	definition: args.definition,
	prerequisiteId,
	resolution: { prerequisiteId, outcome: "found", resolvedAbsolutePath: candidate.absolutePath },
	values: { [prerequisite.workflowValueKey]: candidate.absolutePath },
	clearKeys: [],
})
```

For an unlinked `not_found`, invoke:

```ts
this.commitDeterministicPrerequisiteResolution({
	taskState: args.taskState,
	definition: args.definition,
	prerequisiteId,
	resolution: { prerequisiteId, outcome: "not_found" },
	values: {},
	clearKeys: [prerequisite.workflowValueKey],
})
```

Subtasks 4.5 and 4.6 prescribe the linked variants. Never persist an intended path for `not_found`. Immediately after any successful staged commit, return this exact recursive call so it reacquires the replaced active session before inspecting the next declaration:

```ts
return this.buildResolvePrerequisiteFilesNextAction({
	taskState: args.taskState,
	definition: args.definition,
	action: args.action,
	skippedPrerequisiteIds,
})
```

Do not `await` that returned call and do not continue the current loop with its stale pre-commit `session` reference.

- [x] Subtask 4.5: For an artifact-linked result, first narrow with `if (prerequisite.artifactId !== undefined)`. Inside that branch, assign `const artifactDefinition = args.definition.artifacts?.[prerequisite.artifactId]`; when absent, throw exactly `new Error(\`Workflow prerequisite file ${prerequisite.id} references missing workflow artifact ${prerequisite.artifactId}.\`)`. For a `found` result, after that narrowing and the Subtask 4.10 guards, assign the result of exactly one awaited call as `const resolvedArtifactOutput = await this.resolveWorkflowArtifactAllocation({ workflow: args.definition, session, artifactDefinition })`. When `resolve(candidate.absolutePath) !== resolve(resolvedArtifactOutput.artifactAbsolutePath)`, throw exactly `new Error(\`Workflow prerequisite file ${prerequisite.id} resolved path does not match linked workflow artifact ${artifactDefinition.id}.\`)` before committing. Then invoke:

```ts
this.commitDeterministicPrerequisiteResolution({
	taskState: args.taskState,
	definition: args.definition,
	prerequisiteId,
	resolution: { prerequisiteId, outcome: "found", resolvedAbsolutePath: candidate.absolutePath },
	values: resolvedArtifactOutput.workflowValueWrites,
	clearKeys: [],
})
```

Because the validated artifact absolute-path output key equals the prerequisite `workflowValueKey`, that one map atomically writes the prerequisite path plus the complete registry-derived project, family, singleton identity, filename, filename-only relative-path, absolute-path, and undefined parent/target output behavior that a new allocation would use. This call resolves canonical metadata only: do not call `this.prepareWorkflowArtifactCreation(...)`, `this.createWorkflowArtifact(...)`, document building, archive, delete, replace, suffix, or any file mutation.

- [x] Subtask 4.6: For an artifact-linked `not_found`, use the narrowed `artifactDefinition` from Subtask 4.5 and invoke:

```ts
this.commitDeterministicPrerequisiteResolution({
	taskState: args.taskState,
	definition: args.definition,
	prerequisiteId,
	resolution: { prerequisiteId, outcome: "not_found" },
	values: {},
	clearKeys: [
		artifactDefinition.outputValueKeys.artifactFamily,
		artifactDefinition.outputValueKeys.artifactIdentity,
		artifactDefinition.outputValueKeys.artifactFilename,
		artifactDefinition.outputValueKeys.artifactRelativePath,
		artifactDefinition.outputValueKeys.artifactAbsolutePath,
	],
})
```

Retain `projectMode`, `projectTitle`, and `projectFolderName`; do not include any of those keys in `clearKeys`.

- [x] Subtask 4.7: Add `private validateCurrentPrerequisiteFileResolutions(definition: WorkflowDefinition, session: ActiveWorkflowSession): WorkflowValidationResult`. Treat `session.prerequisiteFileResolutions` as an empty list or a declaration-order prefix of the definition's deterministic exact-filename prerequisites. Each included id must appear exactly once. For every populated deterministic prerequisite path, derive the one canonical absolute path from `this.resolveWorkflowProjectOutputFolder(session)`, the declaration's exact `projectSubfolderSegments`, and `prerequisite.match.filename`; for an artifact-linked prerequisite, the Subtask 4.10 definition guard additionally proves that filename equals the registered filename. Require `resolve(populatedPath) === resolve(canonicalAbsolutePath)` so the path remains contained in the selected project at the declared placement, and call `this.assertWorkspacePathAllowed(populatedPath)` before accepting it. Catch only an `Error` from that path-policy guard and return `{ valid: false, errorMessage: error.message }`, preserving the shared path-policy diagnostic unchanged; rethrow a non-`Error` value. For every other invalid state prescribed here, return exactly `{ valid: false, errorMessage: "Workflow prerequisite file resolution state is inconsistent with the active workflow definition or session." }`.

For an artifact-linked prerequisite, synchronously derive the expected metadata without calling the async `resolveWorkflowArtifactAllocation(...)`: read its linked definition and family registry entry; narrow `allocationMode === "singleton_project"` and `identityRequirement === "none"`; use the registry's exact `singletonIdentity` and `filenamePattern`; derive the relative and absolute paths from `this.resolveWorkflowProjectOutputPlacementSegments(definition)`, `this.resolveWorkflowProjectOutputFolder(session)`, and the registered filename; construct the expected project/family/identity/filename/relative-path/absolute-path values with `parentIdentity` and `targetIdentity` undefined; then pass that object and the artifact definition's exact `outputValueKeys` to the existing synchronous `this.buildWorkflowArtifactOutputValueWrites(...)`. Define the artifact-specific output keys as exactly `artifactFamily`, `artifactIdentity`, `artifactFilename`, `artifactRelativePath`, and `artifactAbsolutePath`; `projectTitle` and `projectFolderName` are shared entry-project outputs and are never part of an unset-state check.

A `found` result must agree with that non-empty canonical path workflow value and, when artifact-linked, every key/value in the complete canonical output map, including the two shared project values. A `not_found` result owns no `resolvedAbsolutePath`; for an artifact-linked prerequisite, accept either all five artifact-specific outputs unset while the shared project values remain untouched, or every key/value in the complete canonical output map produced later by shared allocation. Never treat the latter as changing the historical `not_found` result. Every deterministic declaration after the prefix must have its path and, when linked, its five artifact-specific outputs unset; do not require shared project values to be unset. Before scanning each requested declaration, validate the whole prefix; reuse that declaration's result when it is already the current prefix member, scan it only when it is the next unresolved declaration, and never rescan a completed result. Return invalid for duplicate, contradictory, undeclared, skipped/out-of-order, unresolved-but-populated, partially populated, path-inconsistent, placement-inconsistent, workspace-policy-denied, or metadata-inconsistent state, and route that invalid result through the existing shared runtime failure handling rather than appending or repairing.

In `commitDeterministicPrerequisiteResolution(...)`, additionally require the just-committed `not_found` prerequisite's path and, when linked, the five artifact-specific outputs to be entirely unset; otherwise throw exactly `new Error(\`Workflow prerequisite file ${args.prerequisiteId} not_found commit must leave its path and linked artifact outputs unset.\`)` before clone assignment. Do not inspect or clear the shared project values for this check. This proves the atomic resolution mutation itself did not retain or create allocation output.

- [x] Subtask 4.8: Update `resolveActiveWorkflowNewSingletonArtifactOutputs(...)` to exclude artifacts linked to deterministic exact-filename prerequisites so they never enter entry singleton conflict/replacement/archive/delete handling or the `entry_artifact_resolution_completed` payload.

- [x] Subtask 4.9: In `prepareWorkflowArtifactCreation(...)`, when the target artifact is linked to a deterministic prerequisite, first call `this.validateCurrentPrerequisiteFileResolutions(definition, session)` and narrow with `if (validationResult.valid === false) { throw new Error(validationResult.errorMessage) }`; every invalid category enumerated in Subtask 4.7 therefore fails with that exact validator or preserved path-policy diagnostic. After valid-state narrowing, authorize allocation only when exactly one persisted current result exists for that prerequisite, its outcome is `not_found`, and that artifact's family, identity, filename, relative-path, and absolute-path workflow values are all `undefined`. When that complete authorization conjunction is false—including an unresolved prefix, `found` result, or fully allocated historical `not_found` result—throw exactly `new Error(\`Cannot allocate workflow artifact ${artifactId} because its linked deterministic prerequisite is not a completed not_found result with entirely unset artifact outputs.\`)`. Preserve all existing allocation authorization for unlinked artifacts.

- [x] Subtask 4.10: Extend `validateWorkflowDefinition(...)` for `resolutionMode` and `artifactId`. An artifact link is valid only for optional deterministic exact-filename prerequisites targeting a same-definition `intentMode: "new"` singleton artifact whose registry filename equals the exact prerequisite filename and whose absolute-path output key equals `workflowValueKey`. Require exact placement equivalence: selected root with `[]`, or selected subfolder `X` with `[X]`.

- [x] Subtask 4.11: In `validatePersistedWorkflowSessionForRestore(...)`, after constructing the structurally validated `compatibilitySession` from Subtask 2.2 and before branch-trigger compatibility checks, call `this.validateCurrentPrerequisiteFileResolutions(definition, compatibilitySession)` and return `undefined` when the result is invalid.

  The restore validation must apply the same empty-or-declaration-order-prefix contract from Subtask 4.7: at most one result per included declared id, no skipped declaration, valid matching full path on `found`, no result-owned `resolvedAbsolutePath` on `not_found`, and complete linked metadata consistency. For an artifact-linked `not_found`, accept either the five artifact-specific outputs from Subtask 4.7 all unset before allocation or every key/value in the complete canonical output map after shared allocation; reject partial or noncanonical population and never require the retained shared project values to be unset. Accept a valid partial prefix so shared resume can resolve only the next declaration, and preserve the existing shared branch context, trigger, suppression, and step-resolution session state used by allocation/build resume. Reject invalid persisted sessions without repair or append; do not add a Document Project-specific lifecycle field or resume ledger.

- [x] Subtask 4.12: Add `private findIncompleteDeterministicPrerequisiteContinuationRoute(args: { definition: WorkflowDefinition; session: ActiveWorkflowSession; step: WorkflowStepDefinition }): WorkflowContinuationSourceRoute | undefined`. Return `undefined` when the definition has no deterministic exact-filename prerequisite. Otherwise, first call `this.findContinuationSourceRoute(...)` with the current active branch and a matcher that selects a `resolve_prerequisite_files` route containing at least one deterministic exact-filename prerequisite. Return `undefined` when no such continuation route exists. Build `completedIds` directly from `args.session.prerequisiteFileResolutions`, then derive the deterministic prerequisite ids named by that continuation route. If every one of those route-owned deterministic ids is represented in `completedIds`, return `undefined` before shared validation. That complete-state bypass is required so ordinary evaluation reaches the module-owned deterministic validation procedure and its exact terminal error when a complete Document Project result/path state is inconsistent; the shared continuation helper owns only incomplete resolution resume.

  Use this exact route lookup, required post-lookup narrowing, complete-id bypass, partial-prefix validation, and return sequence:

```ts
const continuationRoute = this.findContinuationSourceRoute({
	step: args.step,
	activeBranchId: args.session.branchContext.activeBranchId,
	matches: ({ route }) => {
		if (route.action.kind !== "resolve_prerequisite_files") {
			return false
		}

		return route.action.prerequisiteIds.some((prerequisiteId) => {
			const prerequisite = args.definition.prerequisiteFiles?.[prerequisiteId]
			return prerequisite?.resolutionMode === "deterministic_exact_filename"
		})
	},
})

if (continuationRoute === undefined || continuationRoute.route.action.kind !== "resolve_prerequisite_files") {
	return undefined
}

const completedIds = new Set(args.session.prerequisiteFileResolutions.map((resolution) => resolution.prerequisiteId))
const deterministicPrerequisiteIds = continuationRoute.route.action.prerequisiteIds.filter((prerequisiteId) => {
	const prerequisite = args.definition.prerequisiteFiles?.[prerequisiteId]
	return prerequisite?.resolutionMode === "deterministic_exact_filename"
})

if (deterministicPrerequisiteIds.every((prerequisiteId) => completedIds.has(prerequisiteId))) {
	return undefined
}

const validationResult = this.validateCurrentPrerequisiteFileResolutions(args.definition, args.session)
if (validationResult.valid === false) {
	throw new Error(validationResult.errorMessage)
}

return continuationRoute
```

  This validated incomplete state is therefore reused only as a declaration-order prefix; invalid partial state fails through the existing shared diagnostic, while complete state proceeds to ordinary module routing.

  In `resolveNextAction(...)`, immediately after the existing active prerequisite-form re-render block and before completion-rule or ordinary active-branch route evaluation, call this helper. When it returns a route, narrow its action to `resolve_prerequisite_files` and return `this.buildResolvePrerequisiteFilesNextAction({ taskState, definition, action: continuationRoute.route.action })` directly. Do not call `buildNextActionFromDecisionTreeRoute(...)`, change or reset `activeBranchId`, clear or replace any pending trigger, return to the source branch, add a ledger/lifecycle field, or re-enter an interactive-only prerequisite route. This preserves the already-selected following branch while rerunning the first unresolved deterministic declaration; a valid completed prefix is reused without rescanning, whether its prior successful commit left no routed trigger or a routed `workflow_values_persisted` trigger. After the final deterministic result commits, the helper returns `undefined` and ordinary evaluation of the current following branch and its then-current trigger continues unchanged.

### Foundational Cutover Validation

### [x] Task 5: Validate The Compile-Safe Shared Contract Cutovers

Allowed files for this task and every numbered subtask below:

- `src/shared/proto/**/*`
- `src/generated/**/*`
- `src/core/controller/**/*`
- `src/hosts/**/*`
- `webview-ui/src/services/grpc-client.ts`
- `dist-standalone/proto/descriptor_set.pb`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

The six generated-code paths immediately above are allowed only as command-owned side effects of `npm run check-types`; they are not implementation targets and must not be edited manually.

Full target file path for this task and every numbered subtask below: `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`. The six generated-code paths are command-owned output targets only.

- [x] Subtask 5.1: Run:

```sh
npm run check-types
```

`npm run check-types` already invokes `npm run protos`. After it succeeds, run `git diff --exit-code -- src/shared/proto src/generated src/core/controller src/hosts webview-ui/src/services/grpc-client.ts`. The command must report no new tracked diff; the ignored `dist-standalone/proto/descriptor_set.pb` output may remain as a command-owned build product. If a tracked generated or formatter diff appears, stop and inspect it rather than accepting or repairing it implicitly.

- [x] Subtask 5.2: Run the exact migrated workflow-definition regression set:

```sh
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/acceptance-audit-review/__tests__/acceptanceAuditReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts
```

- [x] Subtask 5.3: Run the exact non-definition fixture regression set affected by the two atomic cutovers:

```sh
npm run test:unit -- src/core/prompts/system-prompt/__tests__/response_tools.test.ts src/core/task/__tests__/ToolExecutor.workflowModelToolLifecycle.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts src/core/task/tools/handlers/__tests__/AppendBrainstormingSelectedTechniqueToolHandler.test.ts src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts src/core/task/tools/handlers/__tests__/DevStoryGitFinalizeToolHandler.test.ts src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts src/core/task/tools/handlers/__tests__/RecordFindingsToolHandler.test.ts src/core/task/tools/handlers/__tests__/UpsertEpicToolHandler.test.ts src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingDocument.test.ts src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseDocument.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureDocument.test.ts src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsDocument.test.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts src/core/slash-commands/__tests__/index.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts
```

### Document Project Module

### [x] Task 6: Add Deterministic Initial Document Builders

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectDocument.ts`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

Full target file path for this task and every numbered subtask below: `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectDocument.ts`. The action-plan path is allowed only for checkbox updates.

- [x] Subtask 6.1: The verified production module directory does not yet exist. Run `mkdir -p src/core/task/workflow-runtime/workflow-modules/document-project`, then add `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectDocument.ts`. Export these exact Project Overview heading constants and ordered inventory:

```ts
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_EXECUTIVE_SUMMARY = "Executive Summary"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_CLASSIFICATION = "Classification"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_STRUCTURE = "Structure"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_TECHNOLOGY_STACK_SUMMARY = "Technology Stack Summary"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_KEY_FEATURES = "Key Features"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_ARCHITECTURE_HIGHLIGHTS = "Architecture Highlights"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_REPOSITORY_STRUCTURE = "Repository Structure"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_DEPENDENCY_GRAPH_AND_DATA_FLOW =
	"Dependency Graph & Data Flow"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_INTEGRATION_POINTS_AND_API_CONTRACTS =
	"Integration Points & API Contracts"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_DOCUMENTATION_MAP = "Documentation Map"

export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADINGS: readonly string[] = [
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_EXECUTIVE_SUMMARY,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_CLASSIFICATION,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_STRUCTURE,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_TECHNOLOGY_STACK_SUMMARY,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_KEY_FEATURES,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_ARCHITECTURE_HIGHLIGHTS,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_REPOSITORY_STRUCTURE,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_DEPENDENCY_GRAPH_AND_DATA_FLOW,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_INTEGRATION_POINTS_AND_API_CONTRACTS,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_DOCUMENTATION_MAP,
]
```

Export `buildInitialProjectOverviewDocument(): string`. Its code-owned template must interpolate these heading constants at the exact Appendix A heading positions and return the complete exact Project Overview content with one final newline.

- [x] Subtask 6.2: Export these exact Developer Guide heading constants and ordered inventory:

```ts
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_CODING_STYLE = "Coding Style"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_BEFORE_CONTRIBUTING = "Before Contributing"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_LOCAL_DEVELOPMENT_INSTRUCTIONS =
	"Local Development Instructions"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_CODE_QUALITY = "Code Quality"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_END_TO_END_TESTING = "End to End Testing"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_COMMIT_GUIDELINES = "Commit Guidelines"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_MOST_RECENT_PROJECT_NOTES = "Most Recent Project Notes"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_PLANNED_ENHANCEMENTS = "Planned Enhancements"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_KNOWN_ISSUES_AND_TECHNICAL_DEBT =
	"Known Issues & Technical Debt"

export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADINGS: readonly string[] = [
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_CODING_STYLE,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_BEFORE_CONTRIBUTING,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_LOCAL_DEVELOPMENT_INSTRUCTIONS,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_CODE_QUALITY,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_END_TO_END_TESTING,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_COMMIT_GUIDELINES,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_MOST_RECENT_PROJECT_NOTES,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_PLANNED_ENHANCEMENTS,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_KNOWN_ISSUES_AND_TECHNICAL_DEBT,
]
```

Export `buildInitialDeveloperGuideDocument(): string`. Its code-owned template must interpolate these heading constants at the exact Appendix A heading positions and return the complete exact Developer Guide content with one final newline.

- [x] Subtask 6.3: Use code-owned template literals and the exact exported heading constants only. Do not accept a session, import `fs` or `fs/promises`, compute a path, read the source workflow, read BMAD files, include source example delimiters, or add a generic renderer.

### [x] Task 7: Add Exact Per-Step Tool Schema Builders

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectToolSchemas.ts`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

Full target file path for this task and every numbered subtask below: `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectToolSchemas.ts`. The action-plan path is allowed only for checkbox updates.

- [x] Subtask 7.1: Add `documentProjectToolSchemas.ts` with these exact imports:

```ts
import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
```

- [x] Subtask 7.2: Add this exact exported ordered list:

```ts
export const DOCUMENT_PROJECT_STEP_4_TOOL_IDS: readonly ClineDefaultTool[] = [
	ClineDefaultTool.BASH,
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.FILE_READ_RANGE,
	ClineDefaultTool.APPLY_PATCH,
	ClineDefaultTool.FILE_NEW,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.ASK,
	ClineDefaultTool.ATTEMPT,
]
```

- [x] Subtask 7.3: Add this exact file-local helper:

```ts
function resolveDocumentProjectSharedToolSpec(toolId: ClineDefaultTool): ClineToolSpec {
	registerClineToolSets()
	const tool = ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)
	if (tool === undefined) {
		throw new Error(`Missing shared/default tool schema for ${toolId}.`)
	}

	return tool.config
}
```

- [x] Subtask 7.4: Add these exact named exports:

```ts
export function buildDocumentProjectStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildDocumentProjectStep2ToolSchemas(): readonly ClineToolSpec[] {
	return []
}

export function buildDocumentProjectStep3ToolSchemas(): readonly ClineToolSpec[] {
	return []
}
```

- [x] Subtask 7.5: Add:

```ts
export function buildDocumentProjectStep4ToolSchemas(): readonly ClineToolSpec[] {
	return DOCUMENT_PROJECT_STEP_4_TOOL_IDS.map((toolId) => resolveDocumentProjectSharedToolSpec(toolId))
}
```

Do not copy or wrap any shared tool config.

### [x] Task 8: Add The Document Project Workflow Definition

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

Full target file path for this task and every numbered subtask below: `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts`. The action-plan path is allowed only for checkbox updates.

- [x] Subtask 8.1: Add `documentProjectWorkflow.ts` with `WorkflowFormDefinitionPayload` imported as a type from `@shared/ExtensionMessage`; `WorkflowFormSessionData` imported as a type from `@/core/task/workflow-form/types`; `WorkflowArtifactFamily` imported as a value from `../../artifactFamilies`; `ActiveWorkflowSession`, `WorkflowDecisionBranchTrigger`, `WorkflowDecisionTree`, `WorkflowDefinition`, `WorkflowDeterministicProcedureResult`, `WorkflowPersonaDefinition`, `WorkflowPromptBuilderInput`, `WorkflowStepPromptSource`, and `WorkflowValues` imported as types from `../../types`; `buildInitialProjectOverviewDocument` and `buildInitialDeveloperGuideDocument` imported from `./documentProjectDocument`; and `buildDocumentProjectStep1ToolSchemas`, `buildDocumentProjectStep2ToolSchemas`, `buildDocumentProjectStep3ToolSchemas`, and `buildDocumentProjectStep4ToolSchemas` imported from `./documentProjectToolSchemas`. Remove no prescribed import; Subtask 8.19 removes any provisional import outside this list and Subtask 8.12's one additional type import.

- [x] Subtask 8.2: Export identity/entry constants with these exact values:

```ts
export const DOCUMENT_PROJECT_WORKFLOW_NAME = "document-project"
export const DOCUMENT_PROJECT_WORKFLOW_DISPLAY_NAME = "document project"
export const DOCUMENT_PROJECT_WORKFLOW_SLASH_COMMAND_NAME = "document-project"
export const DOCUMENT_PROJECT_WORKFLOW_USE_SKILL_NAME = "document-project"
export const DOCUMENT_PROJECT_WORKFLOW_DESCRIPTION =
	"This workflow builds and/or updates documentation to leverage as context while planning and implementing development projects. It focuses on a developer guide and project overview which together explain the nature of your project as well as your preferences and rules for working in the repo."
export const DOCUMENT_PROJECT_ENTRY_PROMPT =
	"In this workflow, you'll generate or update the developer guide and project overview, which are used in other workflows to provide agents with context regarding your project and ways of working."
```

- [x] Subtask 8.3: Export `DOCUMENT_PROJECT_WORKFLOW_PERSONA: WorkflowPersonaDefinition` exactly:

```ts
{
	name: "Mary",
	role: "Technical Writer",
	identity: "producing product documentation for developer teams.",
	capabilities: ["product analysis", "technical documentation"],
	communicationStyle: "crisp, checklist-driven, and ambiguity-free.",
	principles: ["Developers do their best work when they have comprehenvise product documentation at their disposal."],
}
```

- [x] Subtask 8.4: Add this exact exported enum, then define `DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS` by listing these enum members in the same order:

```ts
export enum DocumentProjectWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	ProjectOverviewArtifactFamily = "project_overview_artifact_family",
	ProjectOverviewArtifactIdentity = "project_overview_artifact_identity",
	ProjectOverviewArtifactFilename = "project_overview_artifact_filename",
	ProjectOverviewArtifactRelativePath = "project_overview_artifact_relative_path",
	ProjectOverview = "project_overview",
	DeveloperGuideArtifactFamily = "developer_guide_artifact_family",
	DeveloperGuideArtifactIdentity = "developer_guide_artifact_identity",
	DeveloperGuideArtifactFilename = "developer_guide_artifact_filename",
	DeveloperGuideArtifactRelativePath = "developer_guide_artifact_relative_path",
	DeveloperGuide = "developer_guide",
	ProjectOverviewCreationRequired = "project_overview_creation_required",
	DeveloperGuideCreationRequired = "developer_guide_creation_required",
	SessionObjective = "session_objective",
	RepoType = "repo_type",
	ProductType = "product_type",
	PrimaryProgrammingLanguage = "primary_programming_language",
	RepoStatus = "repo_status",
	ApiIndicator = "api_indicator",
	DatabaseIndicator = "database_indicator",
	StateManagementIndicator = "state_management_indicator",
	UiIndicator = "ui_indicator",
	DeploymentIndicator = "deployment_indicator",
	RecentProject = "recent_project",
	PlannedEnhancements = "planned_enhancements",
	KnownIssues = "known_issues",
}
```

Define the ordered inventory exactly:

```ts
export const DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS: readonly DocumentProjectWorkflowValueKey[] = [
	DocumentProjectWorkflowValueKey.ProjectMode,
	DocumentProjectWorkflowValueKey.ProjectTitle,
	DocumentProjectWorkflowValueKey.ProjectFolderName,
	DocumentProjectWorkflowValueKey.ProjectOverviewArtifactFamily,
	DocumentProjectWorkflowValueKey.ProjectOverviewArtifactIdentity,
	DocumentProjectWorkflowValueKey.ProjectOverviewArtifactFilename,
	DocumentProjectWorkflowValueKey.ProjectOverviewArtifactRelativePath,
	DocumentProjectWorkflowValueKey.ProjectOverview,
	DocumentProjectWorkflowValueKey.DeveloperGuideArtifactFamily,
	DocumentProjectWorkflowValueKey.DeveloperGuideArtifactIdentity,
	DocumentProjectWorkflowValueKey.DeveloperGuideArtifactFilename,
	DocumentProjectWorkflowValueKey.DeveloperGuideArtifactRelativePath,
	DocumentProjectWorkflowValueKey.DeveloperGuide,
	DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
	DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
	DocumentProjectWorkflowValueKey.SessionObjective,
	DocumentProjectWorkflowValueKey.RepoType,
	DocumentProjectWorkflowValueKey.ProductType,
	DocumentProjectWorkflowValueKey.PrimaryProgrammingLanguage,
	DocumentProjectWorkflowValueKey.RepoStatus,
	DocumentProjectWorkflowValueKey.ApiIndicator,
	DocumentProjectWorkflowValueKey.DatabaseIndicator,
	DocumentProjectWorkflowValueKey.StateManagementIndicator,
	DocumentProjectWorkflowValueKey.UiIndicator,
	DocumentProjectWorkflowValueKey.DeploymentIndicator,
	DocumentProjectWorkflowValueKey.RecentProject,
	DocumentProjectWorkflowValueKey.PlannedEnhancements,
	DocumentProjectWorkflowValueKey.KnownIssues,
]

export const DOCUMENT_PROJECT_ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: DocumentProjectWorkflowValueKey.ProjectMode,
	projectTitle: DocumentProjectWorkflowValueKey.ProjectTitle,
	projectFolderName: DocumentProjectWorkflowValueKey.ProjectFolderName,
}
```

Add no AI-writable value list and no generic `creationRequired`.

- [x] Subtask 8.5: Add `export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_ARTIFACT_ID = "project_overview"` and `export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_ARTIFACT_ID = "developer_guide"`, then export `DOCUMENT_PROJECT_ARTIFACTS: NonNullable<WorkflowDefinition["artifacts"]>` with exactly:

```ts
{
	project_overview: {
		id: "project_overview",
		family: WorkflowArtifactFamily.ProjectOverview,
		intentMode: "new",
		parentIdentitySource: undefined,
		targetIdentitySource: undefined,
		outputValueKeys: {
			projectTitle: "projectTitle",
			projectFolderName: "projectFolderName",
			artifactFamily: "project_overview_artifact_family",
			artifactIdentity: "project_overview_artifact_identity",
			artifactFilename: "project_overview_artifact_filename",
			artifactRelativePath: "project_overview_artifact_relative_path",
			artifactAbsolutePath: "project_overview",
			parentIdentity: undefined,
			targetIdentity: undefined,
		},
	},
	developer_guide: {
		id: "developer_guide",
		family: WorkflowArtifactFamily.DeveloperGuide,
		intentMode: "new",
		parentIdentitySource: undefined,
		targetIdentitySource: undefined,
		outputValueKeys: {
			projectTitle: "projectTitle",
			projectFolderName: "projectFolderName",
			artifactFamily: "developer_guide_artifact_family",
			artifactIdentity: "developer_guide_artifact_identity",
			artifactFilename: "developer_guide_artifact_filename",
			artifactRelativePath: "developer_guide_artifact_relative_path",
			artifactAbsolutePath: "developer_guide",
			parentIdentity: undefined,
			targetIdentity: undefined,
		},
	},
}
```

- [x] Subtask 8.6: Add `export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_PREREQUISITE_ID = "project_overview"` and `export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_PREREQUISITE_ID = "developer_guide"`, then export `DOCUMENT_PROJECT_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]>` with exactly this insertion order and shape:

```ts
{
	project_overview: {
		id: "project_overview",
		requirement: "optional",
		resolutionMode: "deterministic_exact_filename",
		projectSubfolderSegments: [],
		match: { kind: "exact_filename", filename: "project-overview.md" },
		producingWorkflowName: "document-project",
		workflowValueKey: "project_overview",
		outputDocumentReference: "none",
		artifactId: "project_overview",
	},
	developer_guide: {
		id: "developer_guide",
		requirement: "optional",
		resolutionMode: "deterministic_exact_filename",
		projectSubfolderSegments: [],
		match: { kind: "exact_filename", filename: "developer-guide.md" },
		producingWorkflowName: "document-project",
		workflowValueKey: "developer_guide",
		outputDocumentReference: "none",
		artifactId: "developer_guide",
	},
}
```

- [x] Subtask 8.7: Export these exact named constants and reuse them in every matching route without variants:

```ts
export const DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR =
	"I could not determine which reference documents need to be generated."
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_ALLOCATION_TERMINAL_ERROR =
	"I could not create project-overview.md in the Agent Guidance folder."
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_BUILD_TERMINAL_ERROR =
	"I could not populate the initial content for project-overview.md."
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_ALLOCATION_TERMINAL_ERROR =
	"I could not create developer-guide.md in the Agent Guidance folder."
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_BUILD_TERMINAL_ERROR =
	"I could not populate the initial content for developer-guide.md."
export const DOCUMENT_PROJECT_BASELINE_DATA_TERMINAL_ERROR =
	"I could not determine which baseline information must be collected."
export const DOCUMENT_PROJECT_DOCUMENTATION_TASK_TERMINAL_ERROR =
	"I could not determine the appropriate documentation task for the current session."
```

- [x] Subtask 8.8: Export these exact Form 1 constants:

```ts
export const DOCUMENT_PROJECT_STEP_1_FORM_ID = "step-1-confirm-document-generation-form"
export const DOCUMENT_PROJECT_STEP_1_PANEL_A_ID = "step-1-panel-a-full-scan-needed"
export const DOCUMENT_PROJECT_STEP_1_PANEL_B_ID = "step-1-panel-b-missing-project-overview"
export const DOCUMENT_PROJECT_STEP_1_PANEL_C_ID = "step-1-panel-c-missing-developer-guide"
export const DOCUMENT_PROJECT_STEP_1_PANEL_D_ID = "step-1-panel-d-clarify-intent"
```

Export `buildDocumentProjectStep1WorkflowForm(): WorkflowFormDefinitionPayload` with `definitionVersion: 2`, `title: "Confirm Document Generation"`, `toolDictionaryTitle: ""`, `toolDictionaryMarkdown: ""`, `firstPanelId: DOCUMENT_PROJECT_STEP_1_PANEL_A_ID`, and these exact panels:

| Panel | Title | `promptMarkdown` | Fields |
| --- | --- | --- | --- |
| A | `Full Scan Needed` | `The Agent Guidance folder exists, but it’s currently empty. I’ll proceed with a full scan to generate the necessary repo documentation.` | `[]` |
| B | `Missing Project Overview` | `The required Project Overview document is missing from the Agent Guidance folder in this repo. I'll generate that file for you during this workflow.` | `[]` |
| C | `Missing Developer Guide` | `The required Developer Guide document is missing from the Agent Guidance folder in this repo. I'll generate that file for you during this workflow.` | `[]` |
| D | `Clarify Intent` | `It looks like the foundational reference documents are in place. What would you like to do?` | one required `dropdown`, `key: "session_objective"`, `workflowValueKey: "session_objective"`, label `Select One`, `allowedValueType: "string"`, options `{ value: "Update existing documents", label: "Update existing documents" }`, then `{ value: "Add supporting documentation", label: "Add supporting documentation" }`; omit `selectionCardinality` so the shared single-selection default applies |

Use each exported panel constant as both its `panels` record key and its `panelId`. Every panel has only `allowedActions: ["submit"]`, `actionLabels: { submit: "continue" }`, and transition `{ type: "conditional", conditionSourceKey: "__terminal__", branches: [], defaultTerminal: true }`. Add no other field property or copy.

- [x] Subtask 8.9: Export these exact Form 2 constants:

```ts
export const DOCUMENT_PROJECT_STEP_3_FORM_ID = "step-3-gather-baseline-project-data-form"
export const DOCUMENT_PROJECT_STEP_3_PANEL_A_ID = "step-3-panel-a-repository-type"
export const DOCUMENT_PROJECT_STEP_3_PANEL_B_ID = "step-3-panel-b-project-type"
export const DOCUMENT_PROJECT_STEP_3_PANEL_C_ID = "step-3-panel-c-primary-language"
export const DOCUMENT_PROJECT_STEP_3_PANEL_D_ID = "step-3-panel-d-repo-status"
export const DOCUMENT_PROJECT_STEP_3_PANEL_E_ID = "step-3-panel-e-api-usage"
export const DOCUMENT_PROJECT_STEP_3_PANEL_F_ID = "step-3-panel-f-data-models"
export const DOCUMENT_PROJECT_STEP_3_PANEL_G_ID = "step-3-panel-g-state-management"
export const DOCUMENT_PROJECT_STEP_3_PANEL_H_ID = "step-3-panel-h-user-interface"
export const DOCUMENT_PROJECT_STEP_3_PANEL_I_ID = "step-3-panel-i-deployment-configuration"
export const DOCUMENT_PROJECT_STEP_3_PANEL_J_ID = "step-3-panel-j-recent-project"
export const DOCUMENT_PROJECT_STEP_3_PANEL_K_ID = "step-3-panel-k-planned-enhancements"
export const DOCUMENT_PROJECT_STEP_3_PANEL_L_ID = "step-3-panel-l-known-issues"
```

Export `buildDocumentProjectStep3WorkflowForm(): WorkflowFormDefinitionPayload` with `definitionVersion: 2`, `title: "Gather Baseline Project Data"`, `toolDictionaryTitle: ""`, `toolDictionaryMarkdown: ""`, `firstPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_A_ID`, and the exact panel contract:

| Panel | Title | Prompt | Kind | Label | Required | Destination |
| --- | --- | --- | --- | --- | --- | --- |
| A | `Repository Type` | `Please select which of the following best describes this repository.` | `dropdown` | `Select One` | true | `repo_type` |
| B | `Project Type` | `Which of the following best matches this product's niche?` | `dropdown` | `Select One` | true | `product_type` |
| C | `Primary Language` | `What is this project's primary programming language?` | `small_text` | `Select One` | true | `primary_programming_language` |
| D | `Repo Status` | `Is this a Greenfield or Brownfield project?` | `radio_group` | `Select One` | true | `repo_status` |
| E | `API Usage` | `Does your product leverage internal or external APIs?` | `boolean` | `Select One` | true | `api_indicator` |
| F | `Data Models` | `Does your product leverage data models or backend databases?` | `boolean` | `Select One` | true | `database_indicator` |
| G | `State Management` | `Does your product leverage State Management?` | `boolean` | `Select One` | true | `state_management_indicator` |
| H | `User Interface` | `Does your product have a UI?` | `boolean` | `Select One` | true | `ui_indicator` |
| I | `Deployment Configuration` | `Does your product require a deployment configuration?` | `boolean` | `Select One` | true | `deployment_indicator` |
| J | `Recent Project` | `Tell me about the most recent update or enhancement you completed for this repository.` | `large_text` | `Describe your most recent product update` | true | `recent_project` |
| K | `Planned Enhancements` | `What future enhancements, fixes, or updates do you have in mind for this product?` | `large_text` | `Planned Product Enhancements` | true | `planned_enhancements` |
| L | `Known Issues` | `What known issues, risks, or technical debt should I know about?` | `large_text` | `Known Issues & Technical Debt` | true | `known_issues` |

Use each exported panel constant as both its `panels` record key and its `panelId`. For every field, set both `key` and `workflowValueKey` to the exact destination in the table. String fields use `allowedValueType: "string"`; booleans use `"boolean"` with no `trueLabel` or `falseLabel`. A options, in order, are `Monolith: Single cohesive codebase`, `Monorepo: Multiple parts in one repository`, and `Multi-part: Separate client/server or similar architecture`. B options, in order, are `healthcare`, `fintech`, `govtech`, `edtech`, `aerospace`, `automotive`, `scientific`, `legaltech`, `insurtech`, `energy`, `process control`, `building automation`, `gaming`, `entertainment`, `mobile application`, `web application`, `desktop application`, `CLI`, `library`, `extension`, `infrastructure`, `other`. D must set `selectionCardinality: "single"` and its options are `Greenfield: Brand-new project with minimal files/folders in place` then `Brownfield: Established project with existing architecture`. Every option is exactly `{ value: sourceString, label: sourceString }`. Do not set `selectionCardinality` on A or B; their effective cardinality remains the shared `"single"` default. Every panel has only `allowedActions: ["submit"]` and `actionLabels: { submit: "continue" }`.

Use these exact transitions:

```ts
A: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_B_ID }
B: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_C_ID }
C: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_D_ID }
D: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_E_ID }
E: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_F_ID }
F: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_G_ID }
G: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_H_ID }
H: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_I_ID }
I: {
	type: "conditional",
	conditionSourceKey: "developer_guide_creation_required",
	branches: [
		{ matchValue: true, nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_J_ID },
		{ matchValue: false, terminal: true },
	],
	defaultTerminal: true,
}
J: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_K_ID }
K: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_L_ID }
L: { type: "conditional", conditionSourceKey: "__terminal__", branches: [], defaultTerminal: true }
```

- [x] Subtask 8.10: Add `readWorkflowStringValue(workflowValues: WorkflowValues, key: DocumentProjectWorkflowValueKey): string | undefined`, returning only a non-empty trimmed string; and `readWorkflowBooleanValue(workflowValues: WorkflowValues, key: DocumentProjectWorkflowValueKey): boolean | undefined`, returning only booleans. Also add:

```ts
type DocumentProjectSessionObjective = "Update existing documents" | "Add supporting documentation"

function readDocumentProjectSessionObjective(
	workflowValues: WorkflowValues,
): DocumentProjectSessionObjective | undefined
```

The objective reader must read the raw `workflowValues[DocumentProjectWorkflowValueKey.SessionObjective]` value and return it only when it equals one of those two exact strings; it must return `undefined` for every other value, including a trimmed-equivalent value with leading or trailing whitespace. It must not call `readWorkflowStringValue(...)`, trim, or normalize the objective.

Add:

```ts
interface DocumentProjectReferenceDocumentState {
	projectOverviewCreationRequired: boolean
	developerGuideCreationRequired: boolean
}
```

and `readDocumentProjectReferenceDocumentState(session: ActiveWorkflowSession): DocumentProjectReferenceDocumentState | undefined`. First assign `const orderedPrerequisites = Object.values(DOCUMENT_PROJECT_PREREQUISITE_FILES)`, then require `session.prerequisiteFileResolutions.length === orderedPrerequisites.length`. Iterate `for (const [index, prerequisite] of orderedPrerequisites.entries())`; assign `const result = session.prerequisiteFileResolutions[index]`, return `undefined` when `result === undefined || result.prerequisiteId !== prerequisite.id`, and only after that guard assign `const rawPath = session.workflowValues[prerequisite.workflowValueKey]`. A `found` result requires `typeof rawPath === "string" && rawPath.length > 0 && rawPath === result.resolvedAbsolutePath`; it must compare the raw value directly and must not trim it or compare the return from `readWorkflowStringValue(...)`. A `not_found` result requires `rawPath === undefined`. A present empty, whitespace-only, padded, or wrong-typed raw value is invalid and must not be treated as an exact `found` path or an unset `not_found` path. Return both pre-allocation creation states only after both declarations pass. Decision predicates must not read `prerequisiteFileResolutions` directly.

- [x] Subtask 8.11: Add `validateReferenceDocumentResolutionState(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult`, invoking the shared reader and returning `{ kind: "succeeded" }` with no writes when valid or `{ kind: "failed", errorMessage: DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR }`. Add `deriveDocumentCreationRequirements(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult`, invoking the same reader and returning one `{ kind: "succeeded", workflowValueWrites: { project_overview_creation_required: boolean, developer_guide_creation_required: boolean } }`, or the same exact failure. The runtime must apply this successfully derived, validated Boolean map through its existing `run_deterministic_procedure` workflow-value persistence seam; add no module-specific persistence-failure route, mapping, callback, or post-write carrier. Add `buildBaselineProjectDataFormSessionData(session: ActiveWorkflowSession): WorkflowFormSessionData`: assign both values through `readWorkflowBooleanValue(...)`; if either is `undefined`, throw `new Error(DOCUMENT_PROJECT_BASELINE_DATA_TERMINAL_ERROR)`; after that narrowing, return exactly `{ project_overview_creation_required: projectOverviewCreationRequired, developer_guide_creation_required: developerGuideCreationRequired }`. Do not coerce an invalid value to `false`; the Step 3 route prevents this helper from being called for invalid state, and the exact guard keeps the helper fail-closed if invoked directly.

- [x] Subtask 8.12: Add `sourceRouteMatches(sourceRoute: WorkflowStepResolutionSourceRoute, branchId: string, routeId: string): boolean`, comparing both fields; `toolBackedOperationSucceeded(branchId: string, routeId: string): WorkflowDecisionBranchTrigger`; `toolBackedOperationFailed(branchId: string, routeId: string): WorkflowDecisionBranchTrigger`; and `workflowFormCompleted(workflowFormId: string): WorkflowDecisionBranchTrigger`. The operation helpers must return `event_predicate` triggers requiring the corresponding event kind and exact source-route match; the form helper must require `workflow_form_completed` and the exact form id. Add `WorkflowStepResolutionSourceRoute` to the type imports from `@/core/task/workflow-step-resolution/types`. Require these helpers for every artifact-operation result.

- [x] Subtask 8.13: Add `buildDocumentProjectStep1DecisionTree(): WorkflowDecisionTree` with entry branch `step-1-resolve-branch` and these exact branch/route transitions:

| Branch | Route | Predicate | Action / next branch |
| --- | --- | --- | --- |
| `step-1-resolve-branch` | `step-1-resolve-prerequisites` | unconditional | `{ kind: "resolve_prerequisite_files", prerequisiteIds: ["project_overview", "developer_guide"] }` → `step-1-validate-branch` |
| `step-1-validate-branch` | `step-1-validate-prerequisites` | unconditional | `{ kind: "run_deterministic_procedure", instruction: { run: validateReferenceDocumentResolutionState } }` → `step-1-form-selection-branch` |
| `step-1-form-selection-branch` | `step-1-render-form-a` | both declared path values absent | `{ kind: "render_workflow_form", workflowFormId: DOCUMENT_PROJECT_STEP_1_FORM_ID, startPanelId: DOCUMENT_PROJECT_STEP_1_PANEL_A_ID }` → `step-1-await-form-branch` |
| same | `step-1-render-form-b` | Project Overview path absent; Developer Guide path non-empty | same exact action with Panel B id → await branch |
| same | `step-1-render-form-c` | Project Overview path non-empty; Developer Guide path absent | same exact action with Panel C id → await branch |
| same | `step-1-render-form-d` | both paths non-empty | same exact action with Panel D id → await branch |
| `step-1-await-form-branch` | `step-1-complete-form` | `workflow_form_completed` for exact Form 1 id | `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } }` |

Each form-selection route uses `session_predicate` and calls `readWorkflowStringValue(input.workflowValues, DocumentProjectWorkflowValueKey.ProjectOverview)` and `readWorkflowStringValue(input.workflowValues, DocumentProjectWorkflowValueKey.DeveloperGuide)`, comparing each result to `undefined` or non-`undefined` for its exact table state. The four routes are mutually exclusive and exhaustive after `validateReferenceDocumentResolutionState(...)` succeeds. That preceding deterministic procedure owns all reads of `prerequisiteFileResolutions` and returns the exact `DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR` failure before this branch when results are unresolved, inconsistent, or cannot select one valid pre-allocation path state. Add no overlapping `always` fallback to the form-selection branch, and do not rely on route order as priority.

- [x] Subtask 8.14: Add `buildDocumentProjectStep2DecisionTree(): WorkflowDecisionTree` with `entryBranchId: "step-2-derive-branch"` and exactly these branch ids:

```ts
[
	"step-2-derive-branch",
	"step-2-project-overview-branch",
	"step-2-await-project-overview-allocation-branch",
	"step-2-await-project-overview-retry-branch",
	"step-2-await-project-overview-build-branch",
	"step-2-developer-guide-branch",
	"step-2-await-developer-guide-allocation-branch",
	"step-2-await-developer-guide-retry-branch",
	"step-2-await-developer-guide-build-branch",
	"step-2-complete-branch",
]
```

Each record key and its `id` must be the same string. Build the routes exactly as follows:

1. `step-2-derive-branch` has one always route, `step-2-derive-creation-requirements`, whose action is `{ kind: "run_deterministic_procedure", instruction: { run: deriveDocumentCreationRequirements } }` and whose `followingBranchId` is `step-2-project-overview-branch`.
2. `step-2-project-overview-branch` orders three routes:
   - `step-2-skip-project-overview`: `session_predicate` requiring `readWorkflowBooleanValue(input.workflowValues, DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired) === false`; transition to `{ kind: "named_branch", stepNumber: 2, branchId: "step-2-developer-guide-branch" }`.
   - `step-2-allocate-project-overview`: the same predicate with `=== true`; action `{ kind: "allocate_artifact", artifactId: DOCUMENT_PROJECT_PROJECT_OVERVIEW_ARTIFACT_ID }`; `followingBranchId: "step-2-await-project-overview-allocation-branch"`.
   - `step-2-invalid-project-overview-state`: `session_predicate` requiring `readWorkflowBooleanValue(input.workflowValues, DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired) === undefined`; terminal error `DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR`.
3. `step-2-await-project-overview-allocation-branch` orders:
   - `step-2-build-project-overview-after-allocation`: `toolBackedOperationSucceeded("step-2-project-overview-branch", "step-2-allocate-project-overview")`; build the Project Overview through `{ kind: "build_workflow_document", instruction: { artifactId: DOCUMENT_PROJECT_PROJECT_OVERVIEW_ARTIFACT_ID, buildContent: buildInitialProjectOverviewDocument } }`; follow `step-2-await-project-overview-build-branch`.
   - `step-2-retry-project-overview-allocation`: the corresponding `toolBackedOperationFailed(...)`; repeat the identical allocation action once; follow `step-2-await-project-overview-retry-branch`.
4. `step-2-await-project-overview-retry-branch` orders:
   - `step-2-build-project-overview-after-retry`: success for source `("step-2-await-project-overview-allocation-branch", "step-2-retry-project-overview-allocation")`; use the identical Project Overview build action; follow `step-2-await-project-overview-build-branch`.
   - `step-2-project-overview-retry-failed`: failure for that same source; terminal error `DOCUMENT_PROJECT_PROJECT_OVERVIEW_ALLOCATION_TERMINAL_ERROR`.
5. `step-2-await-project-overview-build-branch` has four source-correlated routes:
   - `step-2-project-overview-build-succeeded-after-allocation`: success from `("step-2-await-project-overview-allocation-branch", "step-2-build-project-overview-after-allocation")`; transition to named branch `step-2-developer-guide-branch`.
   - `step-2-project-overview-build-succeeded-after-retry`: success from `("step-2-await-project-overview-retry-branch", "step-2-build-project-overview-after-retry")`; use the same transition.
   - `step-2-project-overview-build-failed-after-allocation`: failure from the first source; terminal error `DOCUMENT_PROJECT_PROJECT_OVERVIEW_BUILD_TERMINAL_ERROR`.
   - `step-2-project-overview-build-failed-after-retry`: failure from the second source; use the same terminal error.
6. `step-2-developer-guide-branch` orders:
   - `step-2-skip-developer-guide`: `session_predicate` requiring `readWorkflowBooleanValue(input.workflowValues, DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired) === false`; transition to `{ kind: "named_branch", stepNumber: 2, branchId: "step-2-complete-branch" }`.
   - `step-2-allocate-developer-guide`: the same predicate with `=== true`; action `{ kind: "allocate_artifact", artifactId: DOCUMENT_PROJECT_DEVELOPER_GUIDE_ARTIFACT_ID }`; `followingBranchId: "step-2-await-developer-guide-allocation-branch"`.
   - `step-2-invalid-developer-guide-state`: `session_predicate` requiring `readWorkflowBooleanValue(input.workflowValues, DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired) === undefined`; terminal error `DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR`.
7. `step-2-await-developer-guide-allocation-branch` orders:
   - `step-2-build-developer-guide-after-allocation`: `toolBackedOperationSucceeded("step-2-developer-guide-branch", "step-2-allocate-developer-guide")`; build through `{ kind: "build_workflow_document", instruction: { artifactId: DOCUMENT_PROJECT_DEVELOPER_GUIDE_ARTIFACT_ID, buildContent: buildInitialDeveloperGuideDocument } }`; follow `step-2-await-developer-guide-build-branch`.
   - `step-2-retry-developer-guide-allocation`: the corresponding `toolBackedOperationFailed(...)`; repeat the identical Developer Guide allocation once; follow `step-2-await-developer-guide-retry-branch`.
8. `step-2-await-developer-guide-retry-branch` orders:
   - `step-2-build-developer-guide-after-retry`: success for source `("step-2-await-developer-guide-allocation-branch", "step-2-retry-developer-guide-allocation")`; use the identical Developer Guide build action; follow `step-2-await-developer-guide-build-branch`.
   - `step-2-developer-guide-retry-failed`: failure for that same source; terminal error `DOCUMENT_PROJECT_DEVELOPER_GUIDE_ALLOCATION_TERMINAL_ERROR`.
9. `step-2-await-developer-guide-build-branch` has:
   - `step-2-developer-guide-build-succeeded-after-allocation`: success from `("step-2-await-developer-guide-allocation-branch", "step-2-build-developer-guide-after-allocation")`; transition to named branch `step-2-complete-branch`.
   - `step-2-developer-guide-build-succeeded-after-retry`: success from `("step-2-await-developer-guide-retry-branch", "step-2-build-developer-guide-after-retry")`; use the same transition.
   - `step-2-developer-guide-build-failed-after-allocation`: failure from the first source; terminal error `DOCUMENT_PROJECT_DEVELOPER_GUIDE_BUILD_TERMINAL_ERROR`.
   - `step-2-developer-guide-build-failed-after-retry`: failure from the second source; use the same terminal error.
10. `step-2-complete-branch` has two mutually exclusive `session_predicate` routes. `step-2-complete` requires non-`undefined` results from `readWorkflowStringValue(...)` for `ProjectOverview` and `DeveloperGuide` and `readWorkflowBooleanValue(...)` for `ProjectOverviewCreationRequired` and `DeveloperGuideCreationRequired`; its action is `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 3 } }`. `step-2-invalid-completion-state` requires at least one of those same four reader results to equal `undefined` and terminates with `DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR`. Add no `always` fallback.

Use `toolBackedOperationSucceeded(...)` or `toolBackedOperationFailed(...)` for every operation-result route with the exact branch and route that initiated the operation. Within every multi-route branch, the prescribed false, true, undefined, success, failure, valid-completion, and invalid-completion predicates are mutually exclusive for one evaluation; add no priority-dependent fallback. The two allocation attempts must be consecutive runtime-owned operations; build failures do not retry; every failure blocks later actions. When both flags are true, the order is Project Overview allocation/build followed by Developer Guide allocation/build.

- [x] Subtask 8.15: Add `buildDocumentProjectStep3DecisionTree(): WorkflowDecisionTree` with entry branch `step-3-route-branch` and await branch `step-3-await-form-branch`. In the entry branch, add four mutually exclusive `session_predicate` routes that each call `readWorkflowBooleanValue(input.workflowValues, DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired)` and `readWorkflowBooleanValue(input.workflowValues, DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired)` and compare them to the exact combinations below, plus one disjoint invalid-state `session_predicate`:
  - `step-3-skip-form`: false/false; `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 4 } }`.
  - `step-3-render-form-a-project-overview-only`: true/false; `{ kind: "render_workflow_form", workflowFormId: DOCUMENT_PROJECT_STEP_3_FORM_ID, startPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_A_ID, buildSessionData: buildBaselineProjectDataFormSessionData }`; `followingBranchId: "step-3-await-form-branch"`.
  - `step-3-render-form-j-developer-guide-only`: false/true; the same action with `DOCUMENT_PROJECT_STEP_3_PANEL_J_ID`; the same following branch.
  - `step-3-render-form-a-both`: true/true; the same action with `DOCUMENT_PROJECT_STEP_3_PANEL_A_ID`; the same following branch.
  - `step-3-invalid-state`: either Boolean reader result is `undefined`; `{ kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_BASELINE_DATA_TERMINAL_ERROR }`.

The four valid predicates exhaust only the Boolean/Boolean combinations, and the invalid predicate matches only an absent or wrong-typed flag; add no `always` fallback and do not use route order as priority. The await branch has only `step-3-complete-form`, triggered by `workflowFormCompleted(DOCUMENT_PROJECT_STEP_3_FORM_ID)`, with `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 4 } }`.

- [x] Subtask 8.16: Define the Appendix B text exactly in these named constants: `DOCUMENT_PROJECT_STEP_4_BASE_PROMPT`, `DOCUMENT_PROJECT_STEP_4_BOTH_CREATED_STATUS_PROMPT`, `DOCUMENT_PROJECT_STEP_4_SHARED_PATHS_PROMPT`, `DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_ONLY_STATUS_PROMPT`, `DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_ONLY_STATUS_PROMPT`, `DOCUMENT_PROJECT_STEP_4_INPUT_INTRODUCTION_PROMPT`, `DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_INPUTS_PROMPT`, `DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_INPUTS_PROMPT`, `DOCUMENT_PROJECT_STEP_4_BOTH_DOCUMENT_WORK_PROMPT`, `DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_ONLY_WORK_PROMPT`, `DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_ONLY_WORK_PROMPT`, `DOCUMENT_PROJECT_STEP_4_UPDATE_EXISTING_DOCUMENTS_WORK_PROMPT`, and `DOCUMENT_PROJECT_STEP_4_ADD_SUPPORTING_DOCUMENTATION_WORK_PROMPT`. Each constant must be a readable multiline template literal, flush-left except for whitespace prescribed by Appendix B; do not encode a prompt body with `\n`, concatenate prompt prose, use `String.raw`, or mutate text with replacement.

Add:

```ts
type DocumentProjectStep4PromptSectionSelection =
	| { valid: true; sections: readonly string[] }
	| { valid: false }

function selectDocumentProjectStep4PromptSections(
	session: ActiveWorkflowSession,
): DocumentProjectStep4PromptSectionSelection

function buildDocumentProjectStep4PromptSource(
	input: WorkflowPromptBuilderInput,
): WorkflowStepPromptSource
```

The selector must require `project_overview` and `developer_guide` to be non-empty strings and both creation-required values to be booleans. For true/true, additionally require non-empty string `repo_type`, `product_type`, `primary_programming_language`, `repo_status`, `recent_project`, `planned_enhancements`, and `known_issues`, plus boolean `api_indicator`, `database_indicator`, `state_management_indicator`, `ui_indicator`, and `deployment_indicator`. For true/false, require the four Project Overview strings and five Project Overview booleans only. For false/true, require the three Developer Guide strings only. For false/false, require no baseline field, call `readDocumentProjectSessionObjective(session.workflowValues)` exactly once, return `{ valid: false }` when it returns `undefined`, and select the corresponding exact existing-document section only from the returned `DocumentProjectSessionObjective`. Do not read this objective through `readWorkflowStringValue(...)` or compare a trimmed value. The selector returns `{ valid: true, sections }` in the exact Subtask 8.17 order or `{ valid: false }`. The Step 4 valid-route predicate must call it with `input.session` and test `.valid`; the prompt builder must call it with `input.session`, return `{ kind: "none" }` for invalid selection, or return `{ kind: "current_step_instruction_template", currentStepInstructionTemplate: selection.sections.join("\n\n") }` for valid selection. Neither caller may independently duplicate the selection logic.

- [x] Subtask 8.17: Add `buildDocumentProjectStep4DecisionTree(): WorkflowDecisionTree` with entry branch `step-4-prompt-branch` and completion branch `step-4-await-completion-branch`. Route `step-4-project-prompt` uses `{ kind: "session_predicate", matches: (input) => selectDocumentProjectStep4PromptSections(input.session).valid === true }`, action `{ kind: "project_prompt" }`, and `followingBranchId: "step-4-await-completion-branch"`. Route `step-4-invalid-state` uses `{ kind: "session_predicate", matches: (input) => selectDocumentProjectStep4PromptSections(input.session).valid === false }` and `{ kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_DOCUMENTATION_TASK_TERMINAL_ERROR }`. These two routes are mutually exclusive and exhaustive; add no `always` fallback or route-priority dependency. In the completion branch, only route `step-4-complete-workflow`, triggered by `{ kind: "on_event", eventKind: "attempt_completion_succeeded" }`, uses `{ kind: "complete_workflow" }`. Implement the five prompt section sequences exactly:
  - true/true: Base, Both-created status, Shared paths, Input introduction, Project Overview inputs, Developer Guide inputs, Both-document work;
  - true/false: Base, Shared paths, Project Overview-only status, Input introduction, Project Overview inputs, Project Overview-only work;
  - false/true: Base, Shared paths, Developer Guide-only status, Input introduction, Developer Guide inputs, Developer Guide-only work;
  - false/false + `Update existing documents`: Base, Shared paths, Update-existing-documents work;
  - false/false + `Add supporting documentation`: Base, Shared paths, Add-supporting-documentation work.

The valid route returns `project_prompt`; invalid state terminates with the exact documentation-task failure; only `attempt_completion_succeeded` routes to `complete_workflow`. Add no `completionRules`.

- [x] Subtask 8.18: Export the exact complete definition below. It contains only four steps; Steps 1–3 return `{ kind: "none" }` and delegate to the three empty schema builders, while Step 4 uses `buildDocumentProjectStep4PromptSource` and the Step 4 schema builder. The exact 13-entry `promptTemplates` list exposes every possible token-bearing Step 4 section to shared definition validation. Do not add `childInheritance` or `completionRules`.

```ts
export const documentProjectWorkflowDefinition: WorkflowDefinition = {
	name: DOCUMENT_PROJECT_WORKFLOW_NAME,
	displayName: DOCUMENT_PROJECT_WORKFLOW_DISPLAY_NAME,
	description: DOCUMENT_PROJECT_WORKFLOW_DESCRIPTION,
	slashCommandName: DOCUMENT_PROJECT_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: DOCUMENT_PROJECT_WORKFLOW_USE_SKILL_NAME,
	persona: DOCUMENT_PROJECT_WORKFLOW_PERSONA,
	projectSelection: {
		kind: "automatic_fixed",
		projectTitle: "Agent Guidance",
		projectFolderName: "agent-guidance",
	},
	projectOutputPlacement: {
		kind: "selected_project_root",
	},
	workflowValueKeys: DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: DOCUMENT_PROJECT_ENTRY_PROJECT_VALUE_KEYS,
	entryPanel: { promptMarkdown: DOCUMENT_PROJECT_ENTRY_PROMPT },
	workflowForms: {
		[DOCUMENT_PROJECT_STEP_1_FORM_ID]: buildDocumentProjectStep1WorkflowForm(),
		[DOCUMENT_PROJECT_STEP_3_FORM_ID]: buildDocumentProjectStep3WorkflowForm(),
	},
	artifacts: DOCUMENT_PROJECT_ARTIFACTS,
	prerequisiteFiles: DOCUMENT_PROJECT_PREREQUISITE_FILES,
	steps: {
		"step-1": {
			id: "step-1",
			stepNumber: 1,
			checklistLabel: "Identify Session Objective",
			buildPromptSource: () => ({ kind: "none" }),
			buildToolSchema: buildDocumentProjectStep1ToolSchemas,
			decisionTree: buildDocumentProjectStep1DecisionTree(),
		},
		"step-2": {
			id: "step-2",
			stepNumber: 2,
			checklistLabel: "Document Generation",
			buildPromptSource: () => ({ kind: "none" }),
			buildToolSchema: buildDocumentProjectStep2ToolSchemas,
			decisionTree: buildDocumentProjectStep2DecisionTree(),
		},
		"step-3": {
			id: "step-3",
			stepNumber: 3,
			checklistLabel: "Identify Baseline Data",
			buildPromptSource: () => ({ kind: "none" }),
			buildToolSchema: buildDocumentProjectStep3ToolSchemas,
			decisionTree: buildDocumentProjectStep3DecisionTree(),
		},
		"step-4": {
			id: "step-4",
			stepNumber: 4,
			checklistLabel: "Support System Documentation",
			buildPromptSource: buildDocumentProjectStep4PromptSource,
			buildToolSchema: buildDocumentProjectStep4ToolSchemas,
			promptTemplates: [
				DOCUMENT_PROJECT_STEP_4_BASE_PROMPT,
				DOCUMENT_PROJECT_STEP_4_BOTH_CREATED_STATUS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_SHARED_PATHS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_ONLY_STATUS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_ONLY_STATUS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_INPUT_INTRODUCTION_PROMPT,
				DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_INPUTS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_INPUTS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_BOTH_DOCUMENT_WORK_PROMPT,
				DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_ONLY_WORK_PROMPT,
				DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_ONLY_WORK_PROMPT,
				DOCUMENT_PROJECT_STEP_4_UPDATE_EXISTING_DOCUMENTS_WORK_PROMPT,
				DOCUMENT_PROJECT_STEP_4_ADD_SUPPORTING_DOCUMENTATION_WORK_PROMPT,
			],
			decisionTree: buildDocumentProjectStep4DecisionTree(),
		},
	},
}
```

- [x] Subtask 8.19: Make the final import surface exactly the imports prescribed by Subtasks 8.1 and 8.12; remove any provisional import not in those two lists. Retain only the named builders, readers, selectors, trigger helpers, form builders, deterministic procedures, and decision-tree builders prescribed in Subtasks 8.2–8.18; remove any provisional helper outside that inventory. The file must contain no direct filesystem access, local path construction, local prompt-token replacement, source/BMAD import, `continue_workflow_form`, `entry_artifact_resolution_completed`, specialized handler, module-owned resume state, or source-authoring delimiter.

### [x] Task 9: Add The Module Barrel And Registry Entry

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/workflow-modules/document-project/index.ts`
- `src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

Full target file paths for this task and every numbered subtask below: `src/core/task/workflow-runtime/workflow-modules/document-project/index.ts` and `src/core/task/workflow-runtime/WorkflowRegistry.ts`. The action-plan path is allowed only for checkbox updates.

- [x] Subtask 9.1: Add `index.ts` with exactly these barrel exports:

```ts
export * from "./documentProjectDocument"
export * from "./documentProjectToolSchemas"
export * from "./documentProjectWorkflow"
```

- [x] Subtask 9.2: In `WorkflowRegistry.ts`, add `import { documentProjectWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/document-project"` with the existing module imports and add `documentProjectWorkflowDefinition` once to `shippedWorkflowDefinitions`. Preserve every existing entry and lookup implementation.

- [x] Subtask 9.3: Per the user-approved structural-contract clarification, `shippedWorkflowDefinitions` remains the sole shipped inventory. Do not add a `.md` alias, metadata registry/accessor/projection, Document Project-specific registry, or any registration outside `WorkflowRegistry.ts`.

### Focused Tests And Migration Fallout

### [x] Task 10: Update Shared Runtime And Prerequisite Tests

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `src/core/task/workflow-runtime/__tests__/prerequisiteFiles.test.ts`
- `src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

Full target file paths for this task and every numbered subtask below: `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, `src/core/task/workflow-runtime/__tests__/prerequisiteFiles.test.ts`, and `src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts`. The action-plan path is allowed only for checkbox updates.

- [x] Subtask 10.1: In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, replace the existing `WorkflowArtifactFamily` import with `import { WORKFLOW_ARTIFACT_FAMILY_REGISTRY, WorkflowArtifactFamily } from "../artifactFamilies"` and add exactly one namespace import `import * as WorkflowPrerequisiteFiles from "../prerequisiteFiles"`. Also add one named import from `../workflow-modules/document-project` containing exactly:

```ts
buildInitialDeveloperGuideDocument,
buildInitialProjectOverviewDocument,
DOCUMENT_PROJECT_BASELINE_DATA_TERMINAL_ERROR,
DOCUMENT_PROJECT_DEVELOPER_GUIDE_ALLOCATION_TERMINAL_ERROR,
DOCUMENT_PROJECT_DEVELOPER_GUIDE_BUILD_TERMINAL_ERROR,
DOCUMENT_PROJECT_DEVELOPER_GUIDE_ARTIFACT_ID,
DOCUMENT_PROJECT_DOCUMENTATION_TASK_TERMINAL_ERROR,
DOCUMENT_PROJECT_PROJECT_OVERVIEW_ALLOCATION_TERMINAL_ERROR,
DOCUMENT_PROJECT_PROJECT_OVERVIEW_BUILD_TERMINAL_ERROR,
DOCUMENT_PROJECT_PROJECT_OVERVIEW_ARTIFACT_ID,
DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR,
DOCUMENT_PROJECT_STEP_1_FORM_ID,
DOCUMENT_PROJECT_STEP_1_PANEL_A_ID,
DOCUMENT_PROJECT_STEP_1_PANEL_B_ID,
DOCUMENT_PROJECT_STEP_1_PANEL_C_ID,
DOCUMENT_PROJECT_STEP_1_PANEL_D_ID,
DOCUMENT_PROJECT_STEP_3_FORM_ID,
DOCUMENT_PROJECT_STEP_3_PANEL_A_ID,
DOCUMENT_PROJECT_STEP_3_PANEL_B_ID,
DOCUMENT_PROJECT_STEP_3_PANEL_C_ID,
DOCUMENT_PROJECT_STEP_3_PANEL_D_ID,
DOCUMENT_PROJECT_STEP_3_PANEL_E_ID,
DOCUMENT_PROJECT_STEP_3_PANEL_F_ID,
DOCUMENT_PROJECT_STEP_3_PANEL_G_ID,
DOCUMENT_PROJECT_STEP_3_PANEL_H_ID,
DOCUMENT_PROJECT_STEP_3_PANEL_I_ID,
DOCUMENT_PROJECT_STEP_3_PANEL_J_ID,
DOCUMENT_PROJECT_STEP_3_PANEL_K_ID,
DOCUMENT_PROJECT_STEP_3_PANEL_L_ID,
documentProjectWorkflowDefinition,
```

These imports are consumed by Subtasks 10.2 and 10.6–10.10. The two document builders are consumed by Subtask 10.10; the handler test imports its builders directly under Subtask 10.12. Task 2 already completed every compile-boundary fixture and helper migration; do not repeat or replace those migrated fields here. Remove no import: every newly prescribed import has an exact consumer.

- [x] Subtask 10.2: In `WorkflowRuntime.test.ts`, add `expectDefinitionRejected(workflow: WorkflowDefinition, label: string): Promise<void>`. Inside it, assign `const result = await activateWorkflow(taskState, workflow)`; the existing `activateWorkflow(...)` test helper owns the `resolveWorkflowDefinitionStub` registration. Assert `expect(result, label).to.deep.equal({ kind: "no_op" })`, `expect(taskState.activeWorkflowName, label).to.equal(undefined)`, and `expect(taskState.activeWorkflowSession, label).to.equal(undefined)`; the supplied label is assertion context, not runtime copy. Build one valid linked fixture using `WorkflowArtifactFamily.ProjectOverview`, `intentMode: "new"`, the complete standalone output-key map from Subtask 8.5, the exact Project Overview prerequisite from Subtask 8.6, and root placement. Produce every malformed required or discriminated-union field below only with `Reflect.deleteProperty(...)` or `Reflect.set(...)`, so the malformed runtime objects do not weaken production types. Start every rejection from a fresh valid fixture and apply exactly one listed mutation unless that case explicitly prescribes a paired inventory update:

- delete `projectSelection`; set it to `{ kind: "unsupported" }`; set automatic `projectTitle` in separate cases to `""` and `" Agent Guidance "`; set automatic `projectFolderName` in separate cases to `""` and `" agent-guidance "`;
- set automatic `projectFolderName`, in separate cases, to `.`, `..`, `agent/guidance`, `agent\\guidance`, `join(cwd, "agent-guidance")`, `C:`, `Agent Guidance`, `agent guidance`, `agent--guidance`, `Agent-Guidance`, `agent_guidance`, and `agent@guidance`; assert a separate unchanged `agent-guidance` case activates successfully;
- delete `projectOutputPlacement`; set it to `{ kind: "unsupported" }`; set selected-root placement to `{ kind: "selected_project_root", subfolder: "planning" }`; delete `subfolder` from `{ kind: "selected_project_subfolder", subfolder: "planning" }`; and set that subfolder to `"stories"`;
- delete `entryProjectValueKeys`;
- delete the Project Overview prerequisite's `resolutionMode`; set it to `"unsupported"`; set `requirement: "required"` while retaining `resolutionMode: "deterministic_exact_filename"`; and replace its exact match with `{ kind: "naming_pattern", pattern: /^project-overview\.md$/ }`;
- change that prerequisite to `resolutionMode: "interactive"` while retaining `artifactId: "project_overview"`; set its `artifactId` to `"missing_artifact"`; set the linked artifact object's `id` to `"mismatched_project_overview"` while retaining the record key and prerequisite link `"project_overview"`; set the linked artifact's `intentMode` to `"derived"`; and set its family to `WorkflowArtifactFamily.ChangeManagementPlan`, whose registry allocation mode is `new_numbered`;
- change the linked prerequisite's exact filename to `"project-summary.md"`; change its `workflowValueKey` to `"project_overview_path"` and add that exact key once to `workflowValueKeys` while leaving the linked artifact's absolute-path output key equal to `"project_overview"`; set selected-root prerequisite segments to `["planning"]`; and pair `{ kind: "selected_project_subfolder", subfolder: "planning" }`, in separate cases, with prerequisite segments `[]`, `["review"]`, and `["planning", "nested"]`.

Also add one valid selected-subfolder case pairing `{ kind: "selected_project_subfolder", subfolder: "planning" }` with prerequisite segments `["planning"]`; assert both that case and the unchanged valid selected-root/empty-segments case activate successfully and return the entry form. Preserve validation of `projectSubfolderSegments` on prerequisites and decision actions; the type migration, production static guard, and exact module-definition assertions own proof that singular `projectSubfolder` is removed rather than treating it as an alias.

- [x] Subtask 10.3: Add project-selection tests proving: informational panel first; no automatic discovery/finalization/folder creation before submit; exact-match `existing` and absent `new`; exact fixed selection plus the three fixed values persisted through entry keys; one finalization; cleared entry-form state; `lifecycle.projectSelectionCompleted === true`; no synthetic selector submission; no separate root value; and normal new/existing entry-artifact continuation. In the absent/new case, begin with `join(cwd, "docs", "projects", "agent-guidance")` absent. Inside the asynchronous `discoverWorkflowCandidatesStub.callsFake(...)`, call `access(...)` for that exact folder and assert the caught Node error has `code === "ENOENT"` before returning `[]`; after informational-panel submission resolves, assert `access(...)` succeeds for that root and for each exact shared canonical folder beneath it: `discovery`, `planning`, `implementation`, `review`, `testing`, `archive`, `implementation/drafts`, `implementation/stories-backlog`, `implementation/stories-review`, and `implementation/stories-complete`. This directly proves discovery runs after submission but before new-folder creation and that the shared finalizer completes its existing folder contract.

Capture the `discoverWorkflowCandidates(...)` request from one existing interactive-selection submission and from one automatic-fixed informational submission. For each request, assert `Object.keys(request).sort()` exactly equals `["buildLabel", "entryType", "immediateChildrenOnly", "rootDirectory", "sort", "workspacePathPolicy"]`; destructure `buildLabel` from each request; assert both remaining request objects deeply equal the exact common `{ rootDirectory, workspacePathPolicy, entryType: "directory", immediateChildrenOnly: true, sort: "alpha_asc" }` object; require both `buildLabel` values to be functions; and assert each returns its supplied entry name. The exact key assertion proves neither request owns `targetPathSegments` or `namingPattern`.

- [x] Subtask 10.4: Preserve the current complete-parent interactive-child project-selection test and its fixture shape, adding assertions that `discoverWorkflowCandidatesStub` was not called and the child owns no entry form. Rename the current `no-ops child workflow activation without mutating state when parent project selection is incomplete` test to `no-ops interactive child workflow activation without mutating state when parent project selection is incomplete`; preserve both incomplete-parent cases and every existing no-op/no-mutation assertion.

Add two automatic-fixed child cases, one where discovery returns an exact `agent-guidance` directory candidate and one where it returns `[]`. For the exact-candidate case, create the parent with `projectTitle: ""`, `projectFolderName: "unrelated-parent"`, and `lifecycle.projectSelectionCompleted: false`; for the absent-candidate case, create it with `projectTitle: "Unrelated Parent"`, `projectFolderName: ""`, and `lifecycle.projectSelectionCompleted: false`. Activate each automatic-fixed child with its incomplete parent session. Before each activation, assign exactly:

```ts
const parentProjectSelectionReference = parentSession.projectSelection
const parentWorkflowValuesReference = parentSession.workflowValues
const parentProjectSelectionSnapshot = structuredClone(parentSession.projectSelection)
const parentWorkflowValuesSnapshot = structuredClone(parentSession.workflowValues)
```

Assert the child uses exact fixed `Agent Guidance` / `agent-guidance`, derives `projectMode: "existing"` for the exact candidate and `"new"` for absence, persists those exact three entry values, has `lifecycle.projectSelectionCompleted === true` and the existing `parentWorkflowName`, does not copy any parent project field, owns no form, and invokes discovery and finalization exactly once. After activation, assert `parentSession.projectSelection === parentProjectSelectionReference` and `parentSession.workflowValues === parentWorkflowValuesReference`; deeply equal the two parent values to their respective snapshots; and assert the child `projectSelection` and `workflowValues` objects are each not reference-equal to their parent counterparts. This proves the automatic-fixed branch neither mutates the parent nor shares either mutable map.

- [x] Subtask 10.5: Add output-placement tests that call the existing allocation seam for root and subfolder definitions and assert `artifactRelativePath` equals the canonical filename for root and `join("planning", artifactFilename)` for subfolder. For targeted numbered-artifact discovery, capture each `discoverWorkflowCandidates(...)` request and assert `targetPathSegments` deeply equals `[projectFolderName]` for root or `[projectFolderName, "planning"]` for subfolder. Write `Epics.index.json` at each exact placement and assert `loadEpicsIndex(...)` reads it successfully. For `searchProjectWide === true` Story discovery, filter captured requests by the Story registry discovery expression and assert the target sets, in existing runtime order, are exactly `[projectFolderName, "discovery"]`, `[projectFolderName, "planning"]`, `[projectFolderName, "implementation"]`, `[projectFolderName, "review"]`, `[projectFolderName, "testing"]`, `[projectFolderName, "archive"]`, `[projectFolderName, "implementation", "drafts"]`, `[projectFolderName, "implementation", "stories-backlog"]`, `[projectFolderName, "implementation", "stories-review"]`, and `[projectFolderName, "implementation", "stories-complete"]`; assert `[projectFolderName]` is absent.

- [x] Subtask 10.6: Assign:

```ts
const projectOverview = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[WorkflowArtifactFamily.ProjectOverview]
const developerGuide = WORKFLOW_ARTIFACT_FAMILY_REGISTRY[WorkflowArtifactFamily.DeveloperGuide]
```

Assert `WorkflowArtifactFamily.ProjectOverview === "project_overview"` and `WorkflowArtifactFamily.DeveloperGuide === "developer_guide"`, then assert those two records deeply equal the exact corresponding Task 1.1 objects. Add this exact shared fixture helper and call it inside each Subtask 10.6–10.9 test after the suite's asynchronous `beforeEach(...)` has assigned `cwd`; destructure only the returned values used by that test:

```ts
function createDocumentProjectArtifactFixtureVocabulary() {
	const selectedProjectRoot = join(cwd, "docs", "projects", "agent-guidance")
	const projectOverviewAbsolutePath = join(selectedProjectRoot, "project-overview.md")
	const developerGuideAbsolutePath = join(selectedProjectRoot, "developer-guide.md")

	return {
		selectedProjectRoot,
		projectOverviewAbsolutePath,
		developerGuideAbsolutePath,
		projectOverviewMetadata: {
			projectTitle: "Agent Guidance",
			projectFolderName: "agent-guidance",
			project_overview_artifact_family: WorkflowArtifactFamily.ProjectOverview,
			project_overview_artifact_identity: "project_overview",
			project_overview_artifact_filename: "project-overview.md",
			project_overview_artifact_relative_path: "project-overview.md",
			project_overview: projectOverviewAbsolutePath,
		},
		developerGuideMetadata: {
			projectTitle: "Agent Guidance",
			projectFolderName: "agent-guidance",
			developer_guide_artifact_family: WorkflowArtifactFamily.DeveloperGuide,
			developer_guide_artifact_identity: "developer_guide",
			developer_guide_artifact_filename: "developer-guide.md",
			developer_guide_artifact_relative_path: "developer-guide.md",
			developer_guide: developerGuideAbsolutePath,
		},
	}
}
```

Define and iterate this exact filename matrix:

```ts
const documentProjectArtifactFilenameCases = [
	{
		family: WorkflowArtifactFamily.ProjectOverview,
		artifactId: "project_overview",
		canonicalFilename: "project-overview.md",
		rejectedFilenames: [
			"Project-overview.md",
			"project-Overview.md",
			"project-overview.MD",
			"project_overview.md",
			"project overview.md",
			"project-overview-1.md",
			"copy-project-overview.md",
			"project-overview.md.bak",
		],
	},
	{
		family: WorkflowArtifactFamily.DeveloperGuide,
		artifactId: "developer_guide",
		canonicalFilename: "developer-guide.md",
		rejectedFilenames: [
			"Developer-guide.md",
			"developer-Guide.md",
			"developer-guide.MD",
			"developer_guide.md",
			"developer guide.md",
			"developer-guide-1.md",
			"copy-developer-guide.md",
			"developer-guide.md.bak",
		],
	},
] as const
```

For each row, create a fresh definition containing only the row's linked standalone artifact and matching deterministic prerequisite. Run one `found` case and one historical `not_found` case followed by `createWorkflowArtifact(...)`; assert `session.workflowValues` deeply includes every exact key/value in the corresponding complete `projectOverviewMetadata` or `developerGuideMetadata` object in both cases, and assert that artifact definition's `outputValueKeys.parentIdentity` and `outputValueKeys.targetIdentity` are both `undefined`. Read the adopted file before and after resolution and assert its content is unchanged. Assert the registry discovery expression returns `true` for only that row's `canonicalFilename` and `false` for every string in that row's finite `rejectedFilenames`; make no unbounded variant assertion. Assert these exact regex source/flag pairs:

```ts
expect(projectOverview.discoveryPattern.source).to.equal("^project-overview\\.md$")
expect(projectOverview.discoveryPattern.flags).to.equal("")
expect(developerGuide.discoveryPattern.source).to.equal("^developer-guide\\.md$")
expect(developerGuide.discoveryPattern.flags).to.equal("")
```

Assert `Object.keys(projectOverview).sort()` and `Object.keys(developerGuide).sort()` each deeply equal:

```ts
[
	"allocationMode",
	"contentKind",
	"discoveryPattern",
	"family",
	"fileExtension",
	"filenamePattern",
	"identityRequirement",
	"numberingScope",
	"singletonIdentity",
]
```

Assert allocation normalizes to the exact registry singleton identity `"project_overview"` or `"developer_guide"` for the corresponding row. The exact own-key list and complete deep equality to the Task 1.1 registry objects are the finite no-sidecar-behavior assertions. Do not call the generic existing-artifact parser or resolver for either singleton family.

- [x] Subtask 10.7: Reuse the single `WorkflowPrerequisiteFiles` namespace import added by Subtask 10.1; do not add a second import. Stub `WorkflowPrerequisiteFiles.discoverWorkflowPrerequisiteFileCandidates(...)` with these exact canonical candidates:

```ts
const projectOverviewCandidate = {
	filename: "project-overview.md",
	absolutePath: projectOverviewAbsolutePath,
	projectRelativePath: "project-overview.md",
}
const developerGuideCandidate = {
	filename: "developer-guide.md",
	absolutePath: developerGuideAbsolutePath,
	projectRelativePath: "developer-guide.md",
}
```

Write `"# existing project overview\n"` and `"# existing developer guide\n"` as the respective found-file sentinel bytes. Exercise the active-step `resolve_prerequisite_files` action in this exact matrix:

| Project Overview candidates | Developer Guide candidates | Exact ordered persisted results | Panel |
| --- | --- | --- | --- |
| `[]` | `[]` | `{ prerequisiteId: "project_overview", outcome: "not_found" }`, `{ prerequisiteId: "developer_guide", outcome: "not_found" }` | `DOCUMENT_PROJECT_STEP_1_PANEL_A_ID` |
| `[]` | `[developerGuideCandidate]` | `{ prerequisiteId: "project_overview", outcome: "not_found" }`, `{ prerequisiteId: "developer_guide", outcome: "found", resolvedAbsolutePath: developerGuideAbsolutePath }` | `DOCUMENT_PROJECT_STEP_1_PANEL_B_ID` |
| `[projectOverviewCandidate]` | `[]` | `{ prerequisiteId: "project_overview", outcome: "found", resolvedAbsolutePath: projectOverviewAbsolutePath }`, `{ prerequisiteId: "developer_guide", outcome: "not_found" }` | `DOCUMENT_PROJECT_STEP_1_PANEL_C_ID` |
| `[projectOverviewCandidate]` | `[developerGuideCandidate]` | `{ prerequisiteId: "project_overview", outcome: "found", resolvedAbsolutePath: projectOverviewAbsolutePath }`, `{ prerequisiteId: "developer_guide", outcome: "found", resolvedAbsolutePath: developerGuideAbsolutePath }` | `DOCUMENT_PROJECT_STEP_1_PANEL_D_ID` |

For each row, assert discovery call order `project_overview`, then `developer_guide`; every discovery request scans `selectedProjectRoot`; no prerequisite-choice form is rendered; each `not_found` result leaves its path and five artifact-specific outputs unset; and each `found` result writes exactly its canonical path and corresponding complete metadata object. Inside the second-prerequisite discovery stub, assert only the first ordered result is persisted and `session.ui.formSession === undefined`; after the outer next-action call returns, assert both ordered results are persisted and the action renders `DOCUMENT_PROJECT_STEP_1_FORM_ID` at the table's exact panel. Assert the found sentinel bytes are unchanged and linked artifacts are omitted from entry singleton resolution.

Add one separate Project Overview cardinality case whose discovery stub returns exactly:

```ts
[
	projectOverviewCandidate,
	{
		filename: "project-overview.md",
		absolutePath: projectOverviewAbsolutePath,
		projectRelativePath: "project-overview.md",
	},
]
```

Assert exactly `"Workflow prerequisite file project_overview deterministic exact-filename resolution returned more than one candidate."`; assert `prerequisiteFileResolutions` remains `[]`; assert the Project Overview path and all five artifact-specific outputs remain unset; assert Developer Guide discovery is not called; and assert no workflow form is rendered. This directly covers the Subtask 4.4 pre-commit cardinality failure.

Add one containment rejection whose Project Overview discovery returns `{ filename: "project-overview.md", absolutePath: join(cwd, "outside-project", "project-overview.md"), projectRelativePath: "project-overview.md" }`; assert exactly `"Workflow prerequisite file project_overview resolved path does not match linked workflow artifact project_overview."`. Add one policy rejection whose mutable `WorkflowWorkspacePathPolicy` denies only `projectOverviewAbsolutePath`; assert exactly ``Workflow runtime path is blocked by workspace path policy: ${projectOverviewAbsolutePath}``.

Add one separate optional unlinked fixture exactly as:

```ts
{
	id: "unlinked_reference",
	requirement: "optional",
	resolutionMode: "deterministic_exact_filename",
	projectSubfolderSegments: [],
	match: { kind: "exact_filename", filename: "unlinked-reference.md" },
	producingWorkflowName: "workflow-runtime-test",
	workflowValueKey: "unlinked_reference",
	outputDocumentReference: "none",
}
```

Use `join(selectedProjectRoot, "unlinked-reference.md")` as its canonical path. For one exact candidate, assert exactly `{ prerequisiteId: "unlinked_reference", outcome: "found", resolvedAbsolutePath: join(selectedProjectRoot, "unlinked-reference.md") }` and only `unlinked_reference` is written. For `[]`, assert exactly `{ prerequisiteId: "unlinked_reference", outcome: "not_found" }` and `unlinked_reference` remains unset. Begin every no-match case with outputs unset; do not preload stale unresolved outputs, because Subtask 4.7 must reject unresolved populated state before clearing it.

- [x] Subtask 10.8: Add `createDeterministicPrerequisiteContinuationDecisionTree(): WorkflowDecisionTree`, returning exactly:

```ts
{
	entryBranchId: "resolve-prerequisites",
	branches: {
		"resolve-prerequisites": {
			id: "resolve-prerequisites",
			routes: [
				{
					id: "resolve-prerequisites-route",
					trigger: { kind: "always" },
					action: {
						kind: "resolve_prerequisite_files",
						prerequisiteIds: ["project_overview", "developer_guide"],
					},
					followingBranchId: "after-prerequisites",
				},
			],
		},
		"after-prerequisites": {
			id: "after-prerequisites",
			routes: [
				{
					id: "consume-persisted-values",
					trigger: { kind: "on_event", eventKind: "workflow_values_persisted" },
					action: { kind: "no_op" },
					followingBranchId: "trigger-consumed",
				},
			],
		},
		"trigger-consumed": {
			id: "trigger-consumed",
			routes: [
				{
					id: "trigger-consumed-no-op",
					trigger: { kind: "always" },
					action: { kind: "no_op" },
				},
			],
		},
	},
}
```

When the persisted-values event is absent, no route in `after-prerequisites` matches; add no fallback route or priority dependency to that branch. After the event is consumed, `trigger-consumed-no-op` provides the runtime-required parking route and must remain an `always`-triggered `no_op` without a following branch. Stub the exact Subtask 10.7 canonical candidates. Inject the atomic failure with a mutable `WorkflowWorkspacePathPolicy` that permits discovery but rejects only `projectOverviewAbsolutePath` when staged validation runs. Assert the thrown attempt leaves `taskState.activeWorkflowSession` as the same object reference; leaves result, path, linked metadata, and trigger state empty/unchanged; preserves `activeBranchId === "after-prerequisites"`; and adds no own session key containing `resume`, `rollback`, or `ledger` and no own lifecycle key beyond the existing `lifecycle`.

Permit that path and call `runtime.resolveNextAction({ taskState })`; assert the first declaration scans again. Seed a valid one-result prefix with no trigger and assert the first declaration is reused and only the second scans. In a separate case, allow the first Project Overview `found` commit, reject the second candidate path, and assert the surviving prefix plus the exact routed `{ kind: "workflow_values_persisted", changedKeys: ["project_overview_artifact_family", "project_overview_artifact_identity", "project_overview_artifact_filename", "project_overview_artifact_relative_path", "project_overview"] }`; `projectTitle` and `projectFolderName` are unchanged fixed entry values and therefore must not appear. On retry, assert inside the second discovery stub that the trigger is still present and the first prerequisite is not rescanned. With a complete result list, assert zero discovery calls and normal following-branch consumption of its then-current trigger. On one successful `found` commit, capture the old session and assert exactly one replacement: the old object remains unchanged while the new object contains result, path, and metadata together.

For restore-shape validation, mutate a fresh valid fixture once per case with exactly: delete `prerequisiteFileResolutions`; set it to `"not-an-array"`; set it to `[null]`; set it to `[{ prerequisiteId: "", outcome: "not_found" }]`; delete `outcome` from `{ prerequisiteId: "project_overview", outcome: "not_found" }`; set that outcome to `"unsupported"`; use a `found` result without `resolvedAbsolutePath`; use `resolvedAbsolutePath: ""`; use relative `resolvedAbsolutePath: "project-overview.md"`; give a `not_found` result `resolvedAbsolutePath: projectOverviewAbsolutePath`; and add `extra: true` to an otherwise canonical Project Overview `found` result. Produce malformed runtime values only through `Reflect.deleteProperty(...)` or `Reflect.set(...)`.

For state-consistency validation, mutate a fresh fixture once per case with exactly: two identical canonical Project Overview `found` results; canonical Project Overview `found` followed by Project Overview `not_found`; `{ prerequisiteId: "undeclared_prerequisite", outcome: "not_found" }`; Developer Guide `not_found` as the first result; canonical Project Overview `found` with `project_overview: developerGuideAbsolutePath`; Project Overview `found` whose result path, metadata absolute path, and metadata relative path are `join(selectedProjectRoot, "planning", "project-overview.md")`, that same absolute path, and `join("planning", "project-overview.md")`; empty results with `project_overview: projectOverviewAbsolutePath`; canonical Project Overview `found` with `project_overview_artifact_identity` deleted; canonical Project Overview `found` with `project_overview_artifact_identity: "wrong_project_overview"`; Project Overview `not_found` with only `project_overview_artifact_family: WorkflowArtifactFamily.ProjectOverview`; and Project Overview `not_found` with the complete `projectOverviewMetadata` map except `project_overview_artifact_identity: "wrong_project_overview"`. Add one canonical Project Overview `found` case whose policy denies only `projectOverviewAbsolutePath`.

Reject every listed restore-shape and state-consistency mutation. Accept Project Overview `not_found` with all five artifact-specific outputs unset and the same historical result with the complete canonical `projectOverviewMetadata` map populated. Every accepted populated path must equal the selected project's exact canonical declared-placement path and pass workspace path policy.

- [x] Subtask 10.9: From the same valid Project Overview-linked fixture, call `runtime.createWorkflowArtifact({ taskState, artifactId: "project_overview", expectedArtifactAbsolutePath: undefined })` with one current `{ prerequisiteId: "project_overview", outcome: "not_found" }` result and all five artifact-specific outputs unset; assert `projectOverviewAbsolutePath` and the complete `projectOverviewMetadata` map are created.

For the exact Subtask 4.9 authorization error, test separately: unresolved `[]` with all five outputs unset; canonical Project Overview `found` with complete `projectOverviewMetadata`; and Project Overview `not_found` with complete `projectOverviewMetadata`. Assert exactly `"Cannot allocate workflow artifact project_overview because its linked deterministic prerequisite is not a completed not_found result with entirely unset artifact outputs."`.

For the exact Subtask 4.7 generic validator error, test separately: two identical Project Overview `not_found` results; Project Overview `not_found` followed by canonical Project Overview `found`; Project Overview `not_found` with only `project_overview_artifact_family: WorkflowArtifactFamily.ProjectOverview`; empty results with `project_overview: projectOverviewAbsolutePath`; and canonical Project Overview `found` with `project_overview_artifact_identity: "wrong_project_overview"`. Assert exactly `"Workflow prerequisite file resolution state is inconsistent with the active workflow definition or session."`. Add one canonical Project Overview `found` plus complete metadata case whose policy denies only `projectOverviewAbsolutePath`; assert exactly ``Workflow runtime path is blocked by workspace path policy: ${projectOverviewAbsolutePath}``.

In every failure case, assert unchanged session values/results and unchanged files. After the valid `not_found` result, pre-create `projectOverviewAbsolutePath` with `"collision project overview sentinel\n"`, capture the thrown Node error and assert `code === "EEXIST"`, assert the selected-project directory entries deeply equal `["project-overview.md"]`, assert the sentinel bytes are unchanged, and assert all five artifact-specific outputs remain unset. Preserve unchanged the existing test named `allocates the quick-spec singleton artifact in planning and maps its absolute path to output_document`.

- [x] Subtask 10.10: Import the shipped `documentProjectWorkflowDefinition`; `DOCUMENT_PROJECT_STEP_1_FORM_ID`; `DOCUMENT_PROJECT_STEP_1_PANEL_A_ID`, `DOCUMENT_PROJECT_STEP_1_PANEL_B_ID`, `DOCUMENT_PROJECT_STEP_1_PANEL_C_ID`, and `DOCUMENT_PROJECT_STEP_1_PANEL_D_ID`; `DOCUMENT_PROJECT_STEP_3_FORM_ID`; `DOCUMENT_PROJECT_STEP_3_PANEL_A_ID`, `DOCUMENT_PROJECT_STEP_3_PANEL_B_ID`, `DOCUMENT_PROJECT_STEP_3_PANEL_C_ID`, `DOCUMENT_PROJECT_STEP_3_PANEL_D_ID`, `DOCUMENT_PROJECT_STEP_3_PANEL_E_ID`, `DOCUMENT_PROJECT_STEP_3_PANEL_F_ID`, `DOCUMENT_PROJECT_STEP_3_PANEL_G_ID`, `DOCUMENT_PROJECT_STEP_3_PANEL_H_ID`, `DOCUMENT_PROJECT_STEP_3_PANEL_I_ID`, `DOCUMENT_PROJECT_STEP_3_PANEL_J_ID`, `DOCUMENT_PROJECT_STEP_3_PANEL_K_ID`, and `DOCUMENT_PROJECT_STEP_3_PANEL_L_ID`; and `DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR`, `DOCUMENT_PROJECT_PROJECT_OVERVIEW_ALLOCATION_TERMINAL_ERROR`, `DOCUMENT_PROJECT_PROJECT_OVERVIEW_BUILD_TERMINAL_ERROR`, `DOCUMENT_PROJECT_DEVELOPER_GUIDE_ALLOCATION_TERMINAL_ERROR`, `DOCUMENT_PROJECT_DEVELOPER_GUIDE_BUILD_TERMINAL_ERROR`, `DOCUMENT_PROJECT_BASELINE_DATA_TERMINAL_ERROR`, and `DOCUMENT_PROJECT_DOCUMENTATION_TASK_TERMINAL_ERROR`, exactly as prescribed in Subtask 10.1. Reuse `submitActiveWorkflowFormPanel(state: TaskState)` for the automatic informational entry panel. Add:

```ts
async function completeSuccessfulDocumentProjectAllocation(
	state: TaskState,
	artifactId: string,
	allocationAction: WorkflowExecuteToolBackedOperationNextAction,
): Promise<WorkflowNextAction>

async function completeSuccessfulDocumentProjectBuild(
	state: TaskState,
	buildAction: WorkflowExecuteToolBackedOperationNextAction,
): Promise<WorkflowNextAction>
```

The allocation helper must call `runtime.createWorkflowArtifact({ taskState: state, artifactId, expectedArtifactAbsolutePath: undefined })`, then return `runtime.handleToolBackedOperationToolResult({ taskState: state, toolResultText: JSON.stringify({ ok: true }), runtimeOwnedSourceRoute: allocationAction.runtimeOwnedSourceRoute })`. Before the result-handler call, assert the canonical selected-project-root destination exists as an empty file. The build helper must return that same result-handler call using `buildAction.runtimeOwnedSourceRoute`; it must not invoke artifact allocation.

Cover the four file-presence states and assert they map exactly to Form 1 Panels A–D and creation flags `(true, true)`, `(true, false)`, `(false, true)`, and `(false, false)` respectively. For each emitted Project Overview build action, assert `buildAction.toolRequest.toolName === ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`, `buildAction.toolRequest.toolParams` deeply equals `{ artifact_id: DOCUMENT_PROJECT_PROJECT_OVERVIEW_ARTIFACT_ID, destination_path: join(cwd, "docs", "projects", "agent-guidance", "project-overview.md"), content: buildInitialProjectOverviewDocument() }`, and `buildAction.toolRequest.toolInput` deeply equals `{}`. For each emitted Developer Guide build action, assert the same shape with `DOCUMENT_PROJECT_DEVELOPER_GUIDE_ARTIFACT_ID`, `developer-guide.md`, and `buildInitialDeveloperGuideDocument()`. Assert both flags are durably present before inspecting the first returned allocation action and remain strictly unchanged after every allocation and build result. Record and assert exact Project Overview allocate/build then Developer Guide allocate/build order.

For every `found` fixture, write distinct sentinel bytes before activation. Assert no `CREATE_WORKFLOW_ARTIFACT` or `BUILD_WORKFLOW_DOCUMENT` next action is emitted for that artifact and its file bytes remain exactly unchanged after the complete workflow-owned generation sequence. Keep Task 10.9 as the exclusive-write collision/no-overwrite proof; do not change the shared document-build handler's full-document replacement semantics.

Inject each runtime-owned operation failure only with `formatResponse.toolError("injected")`. Assert Project Overview allocation exhaustion selects `DOCUMENT_PROJECT_PROJECT_OVERVIEW_ALLOCATION_TERMINAL_ERROR`, Project Overview build failure selects `DOCUMENT_PROJECT_PROJECT_OVERVIEW_BUILD_TERMINAL_ERROR`, Developer Guide allocation exhaustion selects `DOCUMENT_PROJECT_DEVELOPER_GUIDE_ALLOCATION_TERMINAL_ERROR`, Developer Guide build failure selects `DOCUMENT_PROJECT_DEVELOPER_GUIDE_BUILD_TERMINAL_ERROR`, invalid reference-document state selects `DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR`, invalid baseline-data state selects `DOCUMENT_PROJECT_BASELINE_DATA_TERMINAL_ERROR`, and the Step 4 invalid-objective path selects `DOCUMENT_PROJECT_DOCUMENTATION_TASK_TERMINAL_ERROR`. For the reference-document case, place the session on `step-1-validate-branch` with both declared prerequisite ids represented but a complete result/path inconsistency, call `runtime.resolveNextAction({ taskState })`, and assert it returns the module-owned terminal error rather than rejecting with the shared generic resolution-state error; this proves Subtask 4.12 does not preempt complete-state Step 1 validation. Each allocation failure retries that same allocation exactly once; neither build failure retries. The reference-document and artifact-operation failures must block every later artifact action and entry into Step 3; the baseline-data failure must block entry into Step 4; and the documentation-task failure must block completion.

Cover all three shared resume boundaries without adding module state. First, persist and restore after `createWorkflowArtifact(...)` has created the empty file but before its successful result is consumed; call `handleToolBackedOperationToolResult(...)` with `runtimeOwnedSourceRoute: undefined` and that serialized successful result, then assert the existing `findPendingArtifactAllocationSourceRoute(...)` recovery produces the corresponding build action and never a second allocation. Second, execute the real build result shape, persist and restore before consuming it, feed it back with `runtimeOwnedSourceRoute: undefined`, and assert existing `findPendingDocumentBuildSourceRoute(...)` recovery advances only to the next required artifact while the first scaffold bytes remain unchanged and no first-artifact allocation/build repeats. Third, consume the first build success, persist and restore the fully initialized first-artifact state, and assert continuation requests only the second artifact without reallocating or overwriting the first file.

For Step 3, preload a distinct sentinel value for every panel destination that the chosen path skips. Cover skip, A–I, J–L, and A–L. Submit every displayed panel through `WorkflowRuntime.submitWorkflowForm(...)`; store the returned action without inspecting it, assert the submitted exact durable value, then inspect its next panel. Assert each skipped destination retains its sentinel. Before Step 4 completion, preload workflow values and UI form/step-resolution state and assert `buildTurnProjection(...)` is non-empty. Call `handleAttemptCompletionSucceeded(...)`, assert it returns `complete_workflow`, then assert `activeWorkflowName === undefined`, `activeWorkflowSession === undefined`, `currentFocusChainChecklist === null`, and a fresh projection deeply equals `{ workflowInputPayloadBlock: undefined, continuationWorkflowInputPayloadBlock: undefined, workflowToolSchemaOverride: undefined }`.

- [x] Subtask 10.11: In `prerequisiteFiles.test.ts`, add three exact empty-segment scanner tests using `createPrerequisiteDefinition({ kind: "exact_filename", filename: "project-overview.md" }, [])`. First, write both root `project-overview.md` and `planning/project-overview.md`, then assert the result contains only `{ filename: "project-overview.md", absolutePath: rootPath, projectRelativePath: "project-overview.md" }`. Second, write only `planning/project-overview.md` and assert the result is `[]`, proving empty segments do not broaden into subfolders. Third, deny the selected project root through `WorkflowWorkspacePathPolicy`, assert the call throws an `Error`, and assert its message equals the existing scanner contract ``Workflow prerequisite file directory is blocked by workspace path policy: ${selectedProjectRoot}``. Preserve every existing scanner test and do not change production `prerequisiteFiles.ts`.

- [x] Subtask 10.12: In `src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts`, add:

```ts
import {
	buildInitialDeveloperGuideDocument,
	buildInitialProjectOverviewDocument,
} from "@/core/task/workflow-runtime/workflow-modules/document-project/documentProjectDocument"
```

Preserve `createBuildWorkflowDocumentBlock(...)` unchanged. Add:

```ts
function createDocumentProjectBuildBlock(args: {
	artifactId: "project_overview" | "developer_guide"
	destinationPath: string
	content: string
}): ToolUse
```

Implement it by creating the existing block for `args.destinationPath` and assigning only `artifact_id: args.artifactId` and `content: args.content` on that block's existing `params`.

Add a table with exactly `{ artifactId: "project_overview", filename: "project-overview.md", buildContent: buildInitialProjectOverviewDocument }` and `{ artifactId: "developer_guide", filename: "developer-guide.md", buildContent: buildInitialDeveloperGuideDocument }`. For each row, create a temporary `cwd`, initialize `ClineIgnoreController`, set `destinationPath = path.join(cwd, "docs", "projects", "agent-guidance", filename)`, create its parent directory and empty allocated file, make `shouldAutoApproveToolWithPath` resolve `true`, stub `pathUtils.isLocatedInWorkspace` to resolve `true`, and execute the real `BuildWorkflowDocumentToolHandler` with the helper-built request. Assert `destinationPath` is the canonical selected-project-root path and the file's UTF-8 bytes equal `buildContent()` exactly including its final newline. Before parsing the handler result, narrow it exactly with:

```ts
if (typeof result !== "string") {
	throw new Error("Expected Document Project build handler result to be a string.")
}
```

Then assert `JSON.parse(result)` deeply equals:

```ts
{
	persisted: true,
	artifact_id: artifactId,
	destination_path: destinationPath,
	document_updated: true,
	workflow_value_writes_applied: false,
	changed_workflow_value_keys: [],
	unchanged_workflow_value_keys: [],
}
```

Then spy on `fs.rename`, execute the identical request again, assert the spy is not called, and assert the bytes remain exactly equal. Before parsing the replay result, narrow it exactly with:

```ts
if (typeof replayResult !== "string") {
	throw new Error("Expected Document Project replay handler result to be a string.")
}
```

Then assert `JSON.parse(replayResult)` deeply equals:

```ts
{
	persisted: false,
	artifact_id: artifactId,
	destination_path: destinationPath,
	document_updated: false,
	workflow_value_writes_applied: false,
	reason: "Destination already contained the requested content and no workflow values changed.",
}
```

Dispose the controller and remove the temporary directory in `finally`; preserve every existing handler test. This is Document Project's exact scaffold-through-shared-handler integration proof, not a change to shared handler behavior or execution-control coverage.

- [x] Subtask 10.13: Run the focused shared-runtime and deterministic-document validation in this implementation phase:

```sh
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/workflow-runtime/__tests__/prerequisiteFiles.test.ts src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts
```

### [x] Task 11: Add Shipped Metadata Coverage And Run Existing Shared Regressions

Allowed files for this task and every numbered subtask below:

- `src/core/task/__tests__/workflow-runtime-metadata.test.ts`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

Full target file path for this task and every numbered subtask below: `src/core/task/__tests__/workflow-runtime-metadata.test.ts`. The action-plan path is allowed only for checkbox updates; every shared regression path named in Subtask 11.3 is read/executed but not edited.

- [x] Subtask 11.1: In `workflow-runtime-metadata.test.ts`, add `ShippedWorkflowMetadata` to the existing type-only import from `@/core/task/workflow-runtime/types`; reuse the existing `import * as WorkflowRegistry` without adding a registry import. Add one test that assigns `const registeredDefinition = WorkflowRegistry.resolveWorkflowDefinition("document-project")`, asserts it is not `undefined`, and narrows it with:

```ts
if (registeredDefinition === undefined) {
	throw new Error("Expected registered document-project workflow definition.")
}
```

Then create exactly:

```ts
const metadata = {
	name: registeredDefinition.name,
	displayName: registeredDefinition.displayName,
	description: registeredDefinition.description,
	persona: registeredDefinition.persona,
	projectSelection: registeredDefinition.projectSelection,
	projectOutputPlacement: registeredDefinition.projectOutputPlacement,
} satisfies ShippedWorkflowMetadata
```

Assert `metadata.projectSelection` deeply equals `{ kind: "automatic_fixed", projectTitle: "Agent Guidance", projectFolderName: "agent-guidance" }`, `metadata.projectOutputPlacement` deeply equals `{ kind: "selected_project_root" }`, and `Object.hasOwn(metadata, "entryProjectValueKeys")` and `Object.hasOwn(metadata, "projectSubfolder")` are both `false`. This is compile-time/runtime regression proof for the user-approved structural metadata contract; do not add a production metadata producer, projection, registry, or accessor. Task 2 already migrated the file's existing fixture fields atomically; do not repeat that migration. Preserve all unrelated metadata assertions and remove no import.

- [x] Subtask 11.2: Run the focused metadata test:

```sh
npm run test:unit -- src/core/task/__tests__/workflow-runtime-metadata.test.ts
```

- [x] Subtask 11.3: Run the existing shared execution-control regression suites without editing them or adding Document Project-specific shared-control assertions:

```sh
npm run test:unit -- src/core/ignore/ClineIgnoreController.test.ts src/core/permissions/CommandPermissionController.test.ts src/core/workspace/__tests__/WorkspaceResolver.test.ts src/core/workspace/__tests__/WorkspacePathAdapter.test.ts src/core/workspace/__tests__/parseWorkspaceInlinePath.test.ts src/core/task/tools/utils/__tests__/ToolHookUtils.test.ts src/test/tool-executor-hooks.test.ts src/core/task/__tests__/ToolExecutor.test.ts src/core/task/tools/handlers/__tests__/ExecuteCommandToolHandler.timeout.test.ts src/core/task/tools/handlers/__tests__/PathToolHandlers.gracefulErrors.test.ts src/core/task/tools/handlers/__tests__/ReadFileToolHandler.fileNotFound.test.ts src/core/task/tools/handlers/__tests__/ReadFileToolHandler.repeatReads.test.ts src/core/task/tools/handlers/__tests__/ReadFileRangeToolHandler.test.ts src/core/task/tools/handlers/__tests__/WriteToFileToolHandler.consecutiveMistakeCount.test.ts
```

These suites are shared-capability regression gates only. Do not add, reorganize, or recast shared strict-plan, approval, auto-approval, hook, `.clineignore`, workspace-policy, or handler-control coverage in this module build.

### [x] Task 12: Add Document Project Module Tests

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectDocument.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectToolSchemas.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectWorkflow.test.ts`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

Full target file paths for this task and every numbered subtask below: `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectDocument.test.ts`, `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectToolSchemas.test.ts`, and `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectWorkflow.test.ts`. The action-plan path is allowed only for checkbox updates.

- [x] Subtask 12.1: The verified module test directory does not yet exist. Run `mkdir -p src/core/task/workflow-runtime/workflow-modules/document-project/__tests__`, then add `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectDocument.test.ts` with `expect` from `chai`, `describe`/`it` from `mocha`, and this exact import from `../documentProjectDocument`:

```ts
import {
	buildInitialDeveloperGuideDocument,
	buildInitialProjectOverviewDocument,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_BEFORE_CONTRIBUTING,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_CODE_QUALITY,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_CODING_STYLE,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_COMMIT_GUIDELINES,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_END_TO_END_TESTING,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_KNOWN_ISSUES_AND_TECHNICAL_DEBT,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_LOCAL_DEVELOPMENT_INSTRUCTIONS,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_MOST_RECENT_PROJECT_NOTES,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_PLANNED_ENHANCEMENTS,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADINGS,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_ARCHITECTURE_HIGHLIGHTS,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_CLASSIFICATION,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_DEPENDENCY_GRAPH_AND_DATA_FLOW,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_DOCUMENTATION_MAP,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_EXECUTIVE_SUMMARY,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_INTEGRATION_POINTS_AND_API_CONTRACTS,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_KEY_FEATURES,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_REPOSITORY_STRUCTURE,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_STRUCTURE,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_TECHNOLOGY_STACK_SUMMARY,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADINGS,
} from "../documentProjectDocument"
```

Define this exact forbidden inventory:

```ts
const FORBIDDEN_DOCUMENT_SOURCE_TEXT = [
	"*** begin project-overview initial content example ***",
	"*** end project-overview initial content example ***",
	"*** begin project-index initial content example ***",
	"*** end developer-guide initial content example ***",
	"docs/workflows/workflow-runtime/workflow-modules/document-project/document-project.md",
	".cline/skills/bmad-document-project",
	".cline/workflow-config.yaml",
	"_bmad/_config/workflow-reminders.json",
	"src/core/task/bmad-agent-mode.ts",
] as const
```

Assert each ordered heading inventory deeply equals both its ordered individual-constant list and its exact string list from Task 6. Extract every line beginning `# ` from each built document, remove that prefix, and assert the resulting sequence deeply equals the corresponding heading inventory. Assert full exact equality to both Appendix A documents, including blank lines, indentation, punctuation, Developer Guide pre-generated lines, and one final newline. Assert every `FORBIDDEN_DOCUMENT_SOURCE_TEXT` entry is absent from both generated documents; the production static guard, not a mocked filesystem, proves runtime filesystem independence.

- [x] Subtask 12.2: Add `documentProjectToolSchemas.test.ts` with `expect`, `describe`/`it`, `ClineToolSet`, type `ClineToolSpec`, `registerClineToolSets`, `ModelFamily`, `ClineDefaultTool`, the four builders, and `DOCUMENT_PROJECT_STEP_4_TOOL_IDS`. Add:

```ts
function expectedSharedToolSpecs(toolIds: readonly ClineDefaultTool[]): readonly ClineToolSpec[] {
	registerClineToolSets()
	return toolIds.map((toolId) => {
		const tool = ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)
		if (tool === undefined) {
			throw new Error(`Missing shared/default tool schema for ${toolId}.`)
		}

		return tool.config
	})
}
```

Assert Steps 1–3 each equal `[]`; Step 4 ids equal the exact 11 enum ids; names equal `execute_command`, `list_files`, `search_files`, `list_code_definition_names`, `read_file`, `read_file_range`, `apply_patch`, `write_to_file`, `send_user_message`, `ask_followup_question`, `attempt_completion`; and each spec deeply equals the registered config.

- [x] Subtask 12.3: In `documentProjectToolSchemas.test.ts`, define `FORBIDDEN_MODEL_FACING_TOOL_NAMES` exactly as:

```ts
[
	"workflow_progress_request",
	"replace_in_file",
	"browser_action",
	"use_mcp_tool",
	"access_mcp_resource",
	"load_mcp_documentation",
	"new_task",
	"generate_plan_output",
	"act_mode_respond",
	"focus_chain",
	"web_fetch",
	"web_search",
	"condense",
	"summarize_task",
	"report_bug",
	"new_rule",
	"generate_explanation",
	"use_skill",
	"set_workflow_values",
	"build_workflow_document",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
	"resolve_existing_project_artifact",
	"validate_story_index_entry",
	"get_brainstorming_methods",
	"append_brainstorming_selected_technique",
	"upsert_epic",
	"plan_story_artifacts",
	"plan_remediation_story_artifact",
	"generate_story_files",
	"update_story_index_status",
	"dev_story_git_finalize",
	"record_findings",
	"story_task_reminder",
	"story_task_complete",
	"request_task_detail",
	"show_incomplete_tasks",
	"use_subagents",
]
```

Assert every name is absent, the three response tools are present, and descriptions, parameters, required fields, and context requirements are inherited by deep equality rather than copied expected prose.

- [x] Subtask 12.4: Add `documentProjectWorkflow.test.ts` with `expect` from `chai`; `describe` and `it` from `mocha`; type `WorkflowFormTransitionDefinition` from `@shared/ExtensionMessage`; types `ActiveWorkflowSession`, `WorkflowBranchTriggerEvent`, `WorkflowDecisionBranchEvaluationInput`, `WorkflowDecisionBranchRoute`, `WorkflowPromptBuilderInput`, `WorkflowStepDefinition`, and `WorkflowValues` from `../../../types`; `WorkflowArtifactFamily` and `WORKFLOW_ARTIFACT_FAMILY_REGISTRY` from `../../../artifactFamilies`; `resolveWorkflowDefinition`, `resolveWorkflowBySlashCommand`, and `resolveWorkflowByUseSkillName` from `../../../WorkflowRegistry`; `renderWorkflowPromptTemplate` from `../../../workflowPromptTemplates`; `buildDocumentProjectStep1ToolSchemas`, `buildDocumentProjectStep2ToolSchemas`, `buildDocumentProjectStep3ToolSchemas`, and `buildDocumentProjectStep4ToolSchemas` from `../documentProjectToolSchemas`; and these exact named imports from `../documentProjectWorkflow`:

```ts
buildDocumentProjectStep1WorkflowForm
buildDocumentProjectStep3WorkflowForm
DocumentProjectWorkflowValueKey
DOCUMENT_PROJECT_ARTIFACTS
DOCUMENT_PROJECT_ENTRY_PROJECT_VALUE_KEYS
DOCUMENT_PROJECT_PREREQUISITE_FILES
DOCUMENT_PROJECT_STEP_1_FORM_ID
DOCUMENT_PROJECT_STEP_1_PANEL_A_ID
DOCUMENT_PROJECT_STEP_1_PANEL_B_ID
DOCUMENT_PROJECT_STEP_1_PANEL_C_ID
DOCUMENT_PROJECT_STEP_1_PANEL_D_ID
DOCUMENT_PROJECT_STEP_3_FORM_ID
DOCUMENT_PROJECT_STEP_3_PANEL_A_ID
DOCUMENT_PROJECT_STEP_3_PANEL_B_ID
DOCUMENT_PROJECT_STEP_3_PANEL_C_ID
DOCUMENT_PROJECT_STEP_3_PANEL_D_ID
DOCUMENT_PROJECT_STEP_3_PANEL_E_ID
DOCUMENT_PROJECT_STEP_3_PANEL_F_ID
DOCUMENT_PROJECT_STEP_3_PANEL_G_ID
DOCUMENT_PROJECT_STEP_3_PANEL_H_ID
DOCUMENT_PROJECT_STEP_3_PANEL_I_ID
DOCUMENT_PROJECT_STEP_3_PANEL_J_ID
DOCUMENT_PROJECT_STEP_3_PANEL_K_ID
DOCUMENT_PROJECT_STEP_3_PANEL_L_ID
DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR
DOCUMENT_PROJECT_PROJECT_OVERVIEW_ALLOCATION_TERMINAL_ERROR
DOCUMENT_PROJECT_PROJECT_OVERVIEW_BUILD_TERMINAL_ERROR
DOCUMENT_PROJECT_DEVELOPER_GUIDE_ALLOCATION_TERMINAL_ERROR
DOCUMENT_PROJECT_DEVELOPER_GUIDE_BUILD_TERMINAL_ERROR
DOCUMENT_PROJECT_BASELINE_DATA_TERMINAL_ERROR
DOCUMENT_PROJECT_DOCUMENTATION_TASK_TERMINAL_ERROR
DOCUMENT_PROJECT_WORKFLOW_NAME
DOCUMENT_PROJECT_WORKFLOW_DISPLAY_NAME
DOCUMENT_PROJECT_WORKFLOW_SLASH_COMMAND_NAME
DOCUMENT_PROJECT_WORKFLOW_USE_SKILL_NAME
DOCUMENT_PROJECT_WORKFLOW_DESCRIPTION
DOCUMENT_PROJECT_ENTRY_PROMPT
DOCUMENT_PROJECT_WORKFLOW_PERSONA
DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS
documentProjectWorkflowDefinition
```

Add these exact typed test helpers:

```ts
function getStep(stepNumber: 1 | 2 | 3 | 4): WorkflowStepDefinition
function findStepRoute(
	stepNumber: 1 | 2 | 3 | 4,
	branchId: string,
	routeId: string,
): WorkflowDecisionBranchRoute
function createDocumentProjectSession(workflowValues: WorkflowValues): ActiveWorkflowSession
function createDocumentProjectPromptBuilderInput(
	stepNumber: 1 | 2 | 3 | 4,
	workflowValues: WorkflowValues,
): WorkflowPromptBuilderInput
function routeMatches(
	route: WorkflowDecisionBranchRoute,
	session: ActiveWorkflowSession,
	triggerEvent?: WorkflowBranchTriggerEvent,
): boolean
```

`getStep` must throw exactly `new Error(\`Expected Document Project step ${stepNumber}.\`)` when absent. `findStepRoute` must throw exactly `new Error(\`Expected Document Project route ${branchId}/${routeId} in step ${stepNumber}.\`)` when absent. The base session must use the supplied values, Step 1 and its entry branch, fixed `existing` Agent Guidance selection, completed project-selection lifecycle, `prerequisiteFileResolutions: []`, undefined entry-artifact resolution, and empty form/step-resolution state and suppression arrays. `createDocumentProjectPromptBuilderInput` must clone that base, set the requested step number and that step's entry branch, and return the matching step. `routeMatches` must evaluate `always`, `session_predicate`, and `event_predicate` against a complete `WorkflowDecisionBranchEvaluationInput`, returning false when an event predicate has no event. Assert exact identity, entry copy, persona, fixed selection, root placement, entry mapping, 28 keys, no AI-writable values, four labels, no child inheritance, no `.md` alias, no legacy property, exact artifacts, and exact ordered prerequisites.

- [x] Subtask 12.5: Assert both full form objects: version/titles/empty dictionaries, exact ids/titles/prompts, exact fields/options/order/types/required/destinations, submit-only `continue`, no boolean labels, no extra optional copy, and every exact transition object from Tasks 8.8–8.9. Assert Form 1 Panel D, Form 2 Panels A and B have effective cardinality `(field.selectionCardinality ?? "single") === "single"`; assert Form 2 Panel D explicitly owns `selectionCardinality: "single"`; and assert no other field owns `selectionCardinality`.

- [x] Subtask 12.6: Assert Step 1 prerequisite validation and all A–D matrix states; separately cover unresolved/missing result, result/path disagreement, and a `not_found` path holding `""`, whitespace, or Boolean `true`, and assert each fails through `validateReferenceDocumentResolutionState(...)` before form selection. Add an exact padded-`found` case whose ordered results are `{ prerequisiteId: "project_overview", outcome: "found", resolvedAbsolutePath: "/test/project/docs/projects/agent-guidance/project-overview.md" }` followed by `{ prerequisiteId: "developer_guide", outcome: "not_found" }`, whose `project_overview` value equals `" /test/project/docs/projects/agent-guidance/project-overview.md "`, and whose `developer_guide` value is unset; assert it fails through the same validator before form selection. Assert the form-selection branch owns exactly the four mutually exclusive panel predicates with no `always` fallback. Assert Step 2 derivation failure and the exact atomic Boolean write map, with no module-specific persistence-failure route or mapping; every exact branch id, route id, predicate, action, following branch, skip, allocate, retry, build, failure, and order from Subtask 8.14; and exact false/true/undefined and valid/invalid-completion predicate complementarity with no overlapping fallback. Assert Step 3's four Boolean-combination routes and its disjoint either-flag-undefined invalid route. Define the exact helper below and use it to assert the A–I and J–L sequences:

```ts
const collectSequentialPanelIds = (startPanelId: string): string[] => {
	const panelIds: string[] = []
	let panelId: string | undefined = startPanelId

	while (panelId !== undefined) {
		panelIds.push(panelId)
		const transition: WorkflowFormTransitionDefinition = form.panels[panelId].transition
		panelId = transition.type === "sequential" ? transition.nextPanelId : undefined
	}

	return panelIds
}
```

The explicit `WorkflowFormTransitionDefinition` annotation is required so the helper passes the repository's strict TypeScript configuration without `TS7022`; do not use `any`, a type assertion, or a suppression directive. Also assert operation source-route correlation and the exact seven terminal messages. For every enumerated Step 1–3 state case, evaluate every route in its branch and assert exactly one matches. For each operation-result branch, assert the exact correlated success event matches only its success route, the exact correlated failure event matches only its failure route, and an absent or unrelated event matches no route. Task 10.10 owns successful persistence of the validated Boolean map through the shared deterministic-procedure seam plus shared runtime form-persistence and skipped-panel non-mutation coverage.

- [x] Subtask 12.7: Read `const step4PromptTemplates = getStep(4).promptTemplates` and narrow the optional inventory exactly with:

```ts
if (step4PromptTemplates === undefined || step4PromptTemplates.length !== 13) {
	throw new Error("Expected exactly 13 Document Project Step 4 prompt templates.")
}
```

Then bind every inventory position exactly:

```ts
const [
	basePrompt,
	bothCreatedStatusPrompt,
	sharedPathsPrompt,
	projectOverviewOnlyStatusPrompt,
	developerGuideOnlyStatusPrompt,
	inputIntroductionPrompt,
	projectOverviewInputsPrompt,
	developerGuideInputsPrompt,
	bothDocumentWorkPrompt,
	developerGuideOnlyWorkPrompt,
	projectOverviewOnlyWorkPrompt,
	updateExistingDocumentsWorkPrompt,
	addSupportingDocumentationWorkPrompt,
] = step4PromptTemplates
```

Use only these bindings to define each expected section sequence and its unselected-section exclusion set. Assert all five Step 4 variants by named-section order, required inclusion, unselected-section exclusion, non-empty required values, token materialization, Shared paths presence, exact `docs/projects/agent-guidance` path literals, preserved `misonfigurations` token, preserved requirements-mandated invariant phrase `focused on updating existing documentation` in both existing-document work branches, duplicate `3.` list marker, and absence of bare workflow references, source markers, and delimiters. Define this exact file-local raw-placeholder inventory:

```ts
const DOCUMENT_PROJECT_STEP_4_RAW_PLACEHOLDERS = [
	"{workflow.api_indicator}",
	"{workflow.database_indicator}",
	"{workflow.deployment_indicator}",
	"{workflow.developer_guide}",
	"{workflow.known_issues}",
	"{workflow.planned_enhancements}",
	"{workflow.primary_programming_language}",
	"{workflow.product_type}",
	"{workflow.project_overview}",
	"{workflow.recent_project}",
	"{workflow.repo_status}",
	"{workflow.repo_type}",
	"{workflow.state_management_indicator}",
	"{workflow.ui_indicator}",
] as const
```

Also define a second file-local `FORBIDDEN_MODEL_FACING_TOOL_NAMES` readonly array containing, in the exact order, the complete 40-string inventory prescribed in Subtask 12.3. Do not import that file-local test constant from `documentProjectToolSchemas.test.ts` and do not export production data for this assertion.

Define this exact file-local array:

```ts
const DOCUMENT_PROJECT_SOURCE_AUTHORING_MARKERS = [
	"# Module metadata:",
	"# Persona",
	"# Tool Schema Override",
	"# Workflow Steps",
	"### Prompt:",
	"*** conditional prompt",
	"*** conditional prompt segment",
	"*** end conditional prompt",
	"*** end conditional prompt segment",
	"Panel A:",
	"Field:",
	"allowedActions/ Labels:",
] as const
```

For every rendered variant, assert every entry in that array is absent and both `/\*\*\* begin [^\n]* example \*\*\*/` and `/\*\*\* end [^\n]* example \*\*\*/` do not match. Extract every `/\{workflow\.([^}]+)\}/g` match from `step4PromptTemplates` and assert every captured key is present in `DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS`; this is the explicit undeclared-template-key contract. For every rendered variant, assert every entry in the exact raw-placeholder list is absent and assert the generic raw-token pattern `/\{workflow\.[^}]+\}/` does not match. Also derive the Step 4 projected names from `buildDocumentProjectStep4ToolSchemas()`. Assert every rendered variant contains `attempt_completion` and that the projected-name list contains it; assert the `Update existing documents` variant contains `ask_followup_question` and that the projected-name list contains it; and assert every entry in the file-local exact 40-string `FORBIDDEN_MODEL_FACING_TOOL_NAMES` array is absent from every rendered variant. These are the requirements-mandated source-preservation, token-materialization, and prompt/tool-correlation invariants only; do not add any other sentence-level prompt-prose assertion.

Add a table-driven fail-closed suite built from valid fixtures for each selected branch. Define this exact test inventory:

```ts
const DOCUMENT_PROJECT_STEP_4_REQUIRED_BRANCH_VALUE_KEYS = [
	{
		projectOverviewCreationRequired: true,
		developerGuideCreationRequired: true,
		stringKeys: [
			DocumentProjectWorkflowValueKey.RepoType,
			DocumentProjectWorkflowValueKey.ProductType,
			DocumentProjectWorkflowValueKey.PrimaryProgrammingLanguage,
			DocumentProjectWorkflowValueKey.RepoStatus,
			DocumentProjectWorkflowValueKey.RecentProject,
			DocumentProjectWorkflowValueKey.PlannedEnhancements,
			DocumentProjectWorkflowValueKey.KnownIssues,
		],
		booleanKeys: [
			DocumentProjectWorkflowValueKey.ApiIndicator,
			DocumentProjectWorkflowValueKey.DatabaseIndicator,
			DocumentProjectWorkflowValueKey.StateManagementIndicator,
			DocumentProjectWorkflowValueKey.UiIndicator,
			DocumentProjectWorkflowValueKey.DeploymentIndicator,
		],
	},
	{
		projectOverviewCreationRequired: true,
		developerGuideCreationRequired: false,
		stringKeys: [
			DocumentProjectWorkflowValueKey.RepoType,
			DocumentProjectWorkflowValueKey.ProductType,
			DocumentProjectWorkflowValueKey.PrimaryProgrammingLanguage,
			DocumentProjectWorkflowValueKey.RepoStatus,
		],
		booleanKeys: [
			DocumentProjectWorkflowValueKey.ApiIndicator,
			DocumentProjectWorkflowValueKey.DatabaseIndicator,
			DocumentProjectWorkflowValueKey.StateManagementIndicator,
			DocumentProjectWorkflowValueKey.UiIndicator,
			DocumentProjectWorkflowValueKey.DeploymentIndicator,
		],
	},
	{
		projectOverviewCreationRequired: false,
		developerGuideCreationRequired: true,
		stringKeys: [
			DocumentProjectWorkflowValueKey.RecentProject,
			DocumentProjectWorkflowValueKey.PlannedEnhancements,
			DocumentProjectWorkflowValueKey.KnownIssues,
		],
		booleanKeys: [],
	},
] as const
```

For each globally required artifact-path key `DocumentProjectWorkflowValueKey.ProjectOverview` and `DocumentProjectWorkflowValueKey.DeveloperGuide`, separately delete the key, set it to `""`, and replace it with Boolean `true`. For each creation-required key `DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired` and `DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired`, separately delete the key and replace it with string `"true"`. For each row in the exact branch inventory, separately delete each `stringKeys` entry, set it to `""`, and replace it with Boolean `true`; separately delete each `booleanKeys` entry and replace it with string `"true"`. For false/false, separately delete `DocumentProjectWorkflowValueKey.SessionObjective`, replace it with Boolean `true`, and set it to each exact invalid string in `["unsupported", " Update existing documents ", " Add supporting documentation "]`. For every mutation, the Step 4 `buildPromptSource(...)` result must be `{ kind: "none" }` and decision-tree evaluation must select `DOCUMENT_PROJECT_DOCUMENTATION_TASK_TERMINAL_ERROR`. Do not assert one monolithic editable prompt snapshot.

- [x] Subtask 12.8: Assert Step 4's valid selector matches only `step-4-project-prompt`, its invalid selector matches only `step-4-invalid-state`, and the entry branch owns no `always` fallback or priority dependency. Assert Step 4 initially returns `project_prompt`, only `attempt_completion_succeeded` selects `complete_workflow`, failures/unrelated tools remain incomplete, Steps 1–3 expose `{ kind: "none" }` prompt sources and exact empty tool overrides, Step 4 exposes the exact schema and exact 13-entry `promptTemplates` inventory, and no module-owned form-failure wrapper or completion rule exists. For every literal tool name matched from the exact 11-name projected list in a rendered Step 4 prompt, assert that name is present in the projected list; Subtask 12.7 owns the complementary exact 40-name unprojected-tool absence assertions. Task 10.10 owns the shared-runtime teardown assertions after this route.

- [x] Subtask 12.9: Add registry-resolution assertions for canonical name, slash command, and use-skill name, and assert `document-project.md` does not resolve.

- [x] Subtask 12.10: Run the focused module validation in this implementation phase:

```sh
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectDocument.test.ts
```

Because Task 12 adds TypeScript test files after Task 5's compile-safe cutover validation, run this post-Task-12 typecheck before considering Phase 1 complete:

```sh
npm run check-types
```

Apply Subtask 5.1's generated-proto fallback and generated-code diff-guard instructions unchanged. After `npm run check-types` succeeds, run `git diff --exit-code -- src/shared/proto src/generated src/core/controller src/hosts webview-ui/src/services/grpc-client.ts`; it must report no new tracked diff.

### [x] Task 13: Add Prompt, Slash, And Registration Regression Coverage

Allowed files for this task and every numbered subtask below:

- `src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `src/core/slash-commands/__tests__/index.test.ts`
- `src/test/slash-commands.test.ts`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

Full target file paths for this task and every numbered subtask below: `src/core/prompts/system-prompt/__tests__/integration.test.ts`, `src/core/slash-commands/__tests__/index.test.ts`, and `src/test/slash-commands.test.ts`. The action-plan path is allowed only for checkbox updates.

- [x] Subtask 13.1: In `integration.test.ts`, add this exact module import:

```ts
import {
	buildDocumentProjectStep1ToolSchemas,
	buildDocumentProjectStep2ToolSchemas,
	buildDocumentProjectStep3ToolSchemas,
	buildDocumentProjectStep4ToolSchemas,
	DocumentProjectWorkflowValueKey,
	documentProjectWorkflowDefinition,
} from "@/core/task/workflow-runtime/workflow-modules/document-project"
```

Add `type DocumentProjectPromptStepNumber = 1 | 2 | 3 | 4`, this required-projection interface, and four helpers:

```ts
interface RequiredDocumentProjectPromptProjection {
	workflowInputPayloadBlock: string
	continuationWorkflowInputPayloadBlock: string
	workflowToolSchemaOverride: readonly ClineToolSpec[]
}

function createDocumentProjectWorkflowValues(): WorkflowValues
function createDocumentProjectWorkflowSession(
	activeStepNumber: DocumentProjectPromptStepNumber,
	workflowValues: WorkflowValues,
): ActiveWorkflowSession
async function buildDocumentProjectPromptContext(
	activeStepNumber: DocumentProjectPromptStepNumber,
	apiRequestCount: 1 | 2,
	workflowValues: WorkflowValues,
): Promise<SystemPromptContext & WorkflowPromptProjection>
function requireDocumentProjectPromptProjection(
	context: SystemPromptContext & WorkflowPromptProjection,
): SystemPromptContext & RequiredDocumentProjectPromptProjection
```

Implement `requireDocumentProjectPromptProjection(...)` exactly as:

```ts
function requireDocumentProjectPromptProjection(
	context: SystemPromptContext & WorkflowPromptProjection,
): SystemPromptContext & RequiredDocumentProjectPromptProjection {
	const {
		workflowInputPayloadBlock,
		continuationWorkflowInputPayloadBlock,
		workflowToolSchemaOverride,
	} = context

	if (workflowInputPayloadBlock === undefined) {
		throw new Error("Expected Document Project full-turn workflow input payload.")
	}

	if (continuationWorkflowInputPayloadBlock === undefined) {
		throw new Error("Expected Document Project continuation workflow input payload.")
	}

	if (workflowToolSchemaOverride === undefined) {
		throw new Error("Expected Document Project workflow tool-schema override.")
	}

	return {
		...context,
		workflowInputPayloadBlock,
		continuationWorkflowInputPayloadBlock,
		workflowToolSchemaOverride,
	}
}
```

These three strings are test-only assertion diagnostics and are not user- or AI Agent-facing copy. `createDocumentProjectWorkflowValues()` must use the `DocumentProjectWorkflowValueKey` members and return the default true/true fixture containing: fixed `existing` Agent Guidance project values; complete canonical metadata and `/test/project/docs/projects/agent-guidance/...` absolute paths for both artifacts; both creation flags `true`; `session_objective: "Update existing documents"`; non-empty string sentinels equal to their key names for `repo_type`, `product_type`, `primary_programming_language`, `repo_status`, `recent_project`, `planned_enhancements`, and `known_issues`; and `true` for all five indicator booleans. The session helper must use the supplied `workflowValues` map; the requested step and its definition entry branch; fixed `existing` Agent Guidance selection; `{ projectSelectionCompleted: true }`; ordered `not_found` results for both prerequisites, representing their historical pre-allocation outcome; undefined entry-artifact resolution; and undefined form/step-resolution state with empty suppression arrays. The context helper must pass its supplied `workflowValues` map to the session helper, construct `WorkflowRuntime` with `cwd: "/test/project"` and `{ validateAccess: () => true }`, set the shipped workflow name/session and assign `taskState.apiRequestCount = apiRequestCount`, call `buildTurnProjection({ taskState, isFirstTaskRequest: taskState.apiRequestCount === 1 })`, and merge the result into the existing native GPT-5 `baseContext`/empty-MCP/provider context shape used by `buildQuickSpecPromptContext(...)`.

For each Steps 1–3 context, pass a fresh `createDocumentProjectWorkflowValues()` result and use `apiRequestCount: 2`. For the true/true Step 4 context, pass a fresh default map once with `apiRequestCount: 1` and once with `apiRequestCount: 2`. Also create one false/false Update Existing Documents map exactly as follows and pass it to an additional Step 4 context with `apiRequestCount: 2`:

```ts
const updateExistingWorkflowValues = createDocumentProjectWorkflowValues()
updateExistingWorkflowValues[DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired] = false
updateExistingWorkflowValues[DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired] = false
updateExistingWorkflowValues[DocumentProjectWorkflowValueKey.SessionObjective] = "Update existing documents"
```

Pass every Step 1–4 result from `buildDocumentProjectPromptContext(...)` immediately through `requireDocumentProjectPromptProjection(...)`, name the narrowed local value `projection`, and use that value before every payload `.indexOf(...)` or `.slice(...)`, tool-schema `.map(...)`, and `runPromptTest(...)` call. Apply the Step 4 payload-carrier assertions below to both the true/true projections and the false/false Update Existing Documents projection.

For each of Steps 1–3, require both input payload blocks to be non-empty, assert each contains `Workflow:\ndocument project`, and assert each contains ``Description: ${documentProjectWorkflowDefinition.description}`` using the imported registered definition as the single expected-value source. Do not repeat or snapshot the editable description prose in this runtime prompt test. Assert both blocks contain exactly the following four checklist-state lines for the active-step context, in order:

- Step 1: `1. Identify Session Objective - Active`, `2. Document Generation - Not Started`, `3. Identify Baseline Data - Not Started`, `4. Support System Documentation - Not Started`.
- Step 2: `1. Identify Session Objective - Complete`, `2. Document Generation - Active`, `3. Identify Baseline Data - Not Started`, `4. Support System Documentation - Not Started`.
- Step 3: `1. Identify Session Objective - Complete`, `2. Document Generation - Complete`, `3. Identify Baseline Data - Active`, `4. Support System Documentation - Not Started`.

For each context, assert both blocks include `CURRENT STEP DETAILED INSTRUCTIONS` plus that step's exact shared label—`Step 1: Identify Session Objective`, `Step 2: Document Generation`, or `Step 3: Identify Baseline Data`—while omitting `Role and Objective:`, both fixture artifact paths, and every raw placeholder in the exact Subtask 13.2 inventory. Assert `workflowToolSchemaOverride` deeply equals its corresponding builder's exact `[]`, then use `runPromptTest(...)` and assert `getNativeToolNames(tools)` deeply equals `[]`; this proves the complete empty override does not fall back to defaults.

For Step 4, require both payload blocks to be non-empty. Assert both the full-turn and continuation-turn blocks include `CURRENT STEP DETAILED INSTRUCTIONS`, `Step 4: Support System Documentation`, `Role and Objective:`, and both materialized absolute artifact paths from the fixture. Slice each payload from its `Role and Objective:` index and assert those two suffixes are exactly equal; this proves both carriers receive the same rendered current-step prompt without snapshotting that editable prose. Assert both blocks contain exactly the four checklist-state lines `1. Identify Session Objective - Complete`, `2. Document Generation - Complete`, `3. Identify Baseline Data - Complete`, and `4. Support System Documentation - Active`, in that order. With `apiRequestCount: 1`, assert only the full-turn block contains the existing persona projection marker plus `Name: Mary` and `Role: Technical Writer`; with `apiRequestCount: 2`, assert neither payload block contains those three strings. This directly proves the `TaskState.apiRequestCount === 1` persona gate. Assert generated `systemPrompt` contains no `CURRENT STEP DETAILED INSTRUCTIONS`, proving no workflow-specific system-instructions carrier was introduced.

Assert the Step 4 override deeply equals `buildDocumentProjectStep4ToolSchemas()` and its names deeply equal `["execute_command", "list_files", "search_files", "list_code_definition_names", "read_file", "read_file_range", "apply_patch", "write_to_file", "send_user_message", "ask_followup_question", "attempt_completion"]`. Through `runPromptTest(...)`, assert native tool names deeply equal that list and call the existing `expectResponseToolNames(systemPrompt, ["\`send_user_message\`", "\`ask_followup_question\`", "\`attempt_completion\`"], ["\`workflow_progress_request\`"])`.

- [x] Subtask 13.2: In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, define file-local `DOCUMENT_PROJECT_FORBIDDEN_MODEL_FACING_TOOL_NAMES` as a readonly array containing, in the exact order, the complete 40-string array prescribed in Subtask 12.3; do not import from another test file or export production data for this assertion. Also define file-local `DOCUMENT_PROJECT_STEP_4_RAW_PLACEHOLDERS` as the exact 14-string array prescribed in Subtask 12.7 and file-local `DOCUMENT_PROJECT_SOURCE_AUTHORING_MARKERS` as the exact 12-string array prescribed in Subtask 12.7.

For the full-turn and continuation carriers of both Step 4 value states from Subtask 13.1, derive `projectedToolNames = projection.workflowToolSchemaOverride.map((tool) => tool.name)` from the narrowed `projection`. Assert each applicable true/true payload contains the exact prompt reference `attempt_completion` and that the name is present in `projectedToolNames`. Assert each applicable false/false Update Existing Documents payload contains the exact prompt references `ask_followup_question` and `attempt_completion` and that both names are present in `projectedToolNames`. For every projection, assert every string in the 40-string forbidden array is absent from `projectedToolNames` and the applicable non-empty input payload block; this directly proves no unprojected tool is referenced by the module prompt or projected schema. Do not apply the 40-string inventory to generated `systemPrompt`, because unchanged shared Native GPT-5 guidance legitimately names tools outside this module's projection. The existing `expectResponseToolNames(...)` assertion in Subtask 13.1 separately proves that system response guidance references all three projected response tools and omits `workflow_progress_request`.

For each applicable payload block and generated `systemPrompt`, assert every entry in the 14-string raw-placeholder array and exact 12-string source-authoring-marker array is absent; assert `/\{workflow\.[^}]+\}/`, `/\bworkflow\.[A-Za-z_][A-Za-z0-9_]*/`, `/\*\*\* begin [^\n]* example \*\*\*/`, and `/\*\*\* end [^\n]* example \*\*\*/` do not match; and assert absence of `document-project.md`, `.cline/skills/bmad-document-project`, and `.cline/workflow-config.yaml`. The key-bearing `workflow.<key>` guard must not reject ordinary source-prescribed prose whose sentence ends with the standalone word `workflow.`. Apply the payload assertions to `workflowInputPayloadBlock` on the full turn and `continuationWorkflowInputPayloadBlock` on the continuation turn; do not add or update an editable system-prompt snapshot.

- [x] Subtask 13.3: In `src/core/slash-commands/__tests__/index.test.ts`, add canonical `/document-project` activation assertions resolving to the registered unsuffixed workflow and assert `/document-project.md` does not activate.

- [x] Subtask 13.4: In `src/test/slash-commands.test.ts`, assert the shipped command list contains exactly one `document-project` custom CLI-compatible command with description `Shipped workflow: document-project`, while preserving every existing registered workflow and built-in command assertion.

- [x] Subtask 13.5: Run the focused prompt and activation validation in this implementation phase:

```sh
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
```

then:

```sh
npm run test:unit -- src/core/slash-commands/__tests__/index.test.ts src/test/slash-commands.test.ts
```

## Phase 2: Final Validation And Scope Review

### [ ] Task 14: Run Focused And Full Quality Gates

Allowed files for this task and every numbered subtask below:

- `src/shared/proto/**/*`
- `src/generated/**/*`
- `src/core/controller/**/*`
- `src/hosts/**/*`
- `webview-ui/src/services/grpc-client.ts`
- `dist-standalone/proto/descriptor_set.pb`
- `webview-ui/build/**/*`
- `dist/**/*`
- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

The eight generated/build paths immediately above are allowed only as command-owned side effects of `npm run check-types` and `npm run package`; they are not implementation targets and must not be edited manually.

Full target file path for this task and every numbered subtask below: `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`. The eight generated/build paths are command-owned output targets only.

- [ ] Subtask 14.1: Run:

```sh
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectDocument.test.ts
```

- [ ] Subtask 14.2: Run:

```sh
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/workflow-runtime/__tests__/prerequisiteFiles.test.ts src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts
```

- [ ] Subtask 14.3: Run:

```sh
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
```

- [ ] Subtask 14.4: Run:

```sh
npm run test:unit -- src/core/slash-commands/__tests__/index.test.ts src/test/slash-commands.test.ts
```

- [ ] Subtask 14.5: Run the directly migrated existing module workflow tests:

```sh
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/acceptance-audit-review/__tests__/acceptanceAuditReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts
```

- [ ] Subtask 14.6: Run the remaining directly touched tests and the existing shared execution-control regression gates:

```sh
npm run test:unit -- src/core/prompts/system-prompt/__tests__/response_tools.test.ts src/core/task/__tests__/ToolExecutor.workflowModelToolLifecycle.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts src/core/task/tools/handlers/__tests__/AppendBrainstormingSelectedTechniqueToolHandler.test.ts src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts src/core/task/tools/handlers/__tests__/CreateWorkflowArtifactToolHandler.test.ts src/core/task/tools/handlers/__tests__/DevStoryGitFinalizeToolHandler.test.ts src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts src/core/task/tools/handlers/__tests__/RecordFindingsToolHandler.test.ts src/core/task/tools/handlers/__tests__/UpsertEpicToolHandler.test.ts src/core/task/tools/handlers/__tests__/UseSkillToolHandler.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingDocument.test.ts src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseDocument.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureDocument.test.ts src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsDocument.test.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts src/core/ignore/ClineIgnoreController.test.ts src/core/permissions/CommandPermissionController.test.ts src/core/workspace/__tests__/WorkspaceResolver.test.ts src/core/workspace/__tests__/WorkspacePathAdapter.test.ts src/core/workspace/__tests__/parseWorkspaceInlinePath.test.ts src/core/task/tools/utils/__tests__/ToolHookUtils.test.ts src/test/tool-executor-hooks.test.ts src/core/task/__tests__/ToolExecutor.test.ts src/core/task/tools/handlers/__tests__/ExecuteCommandToolHandler.timeout.test.ts src/core/task/tools/handlers/__tests__/PathToolHandlers.gracefulErrors.test.ts src/core/task/tools/handlers/__tests__/ReadFileToolHandler.fileNotFound.test.ts src/core/task/tools/handlers/__tests__/ReadFileToolHandler.repeatReads.test.ts src/core/task/tools/handlers/__tests__/ReadFileRangeToolHandler.test.ts src/core/task/tools/handlers/__tests__/WriteToFileToolHandler.consecutiveMistakeCount.test.ts
```

The shared execution-control suites are validation-only and remain unmodified.

- [ ] Subtask 14.7: Run `npm run check-types` with elevated permissions:

```sh
npm run check-types
```

`npm run check-types` already invokes `npm run protos`. If it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions. Regardless of whether the typecheck succeeds or fails, immediately run:

```sh
git diff --exit-code -- src/shared/proto src/generated src/core/controller src/hosts webview-ui/src/services/grpc-client.ts
```

The command must report no tracked generated or formatter diff. Do not accept, repair, stage, or revert generated fallout implicitly. If TypeScript checking is reached and fails, treat that failure as a code defect.

- [ ] Subtask 14.8: Run:

```sh
npm run lint
```

- [ ] Subtask 14.9: Run `npm run package` with elevated permissions because it invokes `npm run check-types`:

```sh
npm run package
```

`npm run package` invokes `npm run check-types`, which already invokes `npm run protos`. If its nested typecheck fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, run `npm run check-types` with elevated permissions, and then rerun `npm run package` with elevated permissions. Regardless of whether the package command succeeds or fails, immediately run `git diff --exit-code -- src/shared/proto src/generated src/core/controller src/hosts webview-ui/src/services/grpc-client.ts`. The command must report no tracked generated or formatter diff; ignored `dist`, `dist-standalone/proto`, and `webview-ui/build` outputs may remain as build products. If a tracked generated or formatter diff appears, stop and inspect it rather than accepting, repairing, staging, or reverting it implicitly.

### [ ] Task 15: Run Static Guards

Allowed files for this task and every numbered subtask below:

- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

Full target file path for this task and every numbered subtask below: `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`.

- [ ] Subtask 15.1: Confirm no legacy definition/metadata field remains:

```sh
rg -n '\bprojectSubfolder\b' src --glob '*.ts' --glob '!**/__tests__/**' --glob '!**/*.test.ts'
```

The command must return no production matches, including inline declarations, quoted keys, or property reads. The word-boundary pattern must not reject valid `projectSubfolderSegments`.

- [ ] Subtask 15.2: Confirm no runtime source/BMAD dependency:

```sh
rg -n 'document-project\.md|\.cline/skills/bmad-document-project|bmad-document-project|\.cline/workflow-config\.yaml|placeholder-workflow' src/core/task/workflow-runtime --glob '!**/__tests__/**' --glob '!**/*.test.ts'
```

The command must return no production matches.

- [ ] Subtask 15.3: Confirm no forbidden module implementation:

```sh
rg -n "from[[:space:]]+['\"](?:node:)?fs(?:/promises)?['\"]|require\\([[:space:]]*['\"](?:node:)?fs|import\\([[:space:]]*['\"](?:node:)?fs|replaceAll|\\.replace\\(|continue_workflow_form|entry_artifact_resolution_completed|creationRequired|\\bprojectSubfolder\\b" src/core/task/workflow-runtime/workflow-modules/document-project --glob '!**/__tests__/**' --glob '!**/*.test.ts'
```

The command must return no production-file matches. The exact `projectSubfolderSegments` prerequisite field must not match the word-boundary alternative.

- [ ] Subtask 15.4: Confirm no forbidden Step 4 tool id is declared:

```sh
rg -n "ClineDefaultTool\\.(WORKFLOW_PROGRESS_REQUEST|FILE_EDIT|BROWSER|MCP_USE|MCP_ACCESS|MCP_DOCS|NEW_TASK|PLAN_MODE|ACT_MODE|TODO|WEB_FETCH|WEB_SEARCH|CONDENSE|SUMMARIZE_TASK|REPORT_BUG|NEW_RULE|GENERATE_EXPLANATION|USE_SKILL|SET_WORKFLOW_VALUES|BUILD_WORKFLOW_DOCUMENT|CREATE_WORKFLOW_ARTIFACT|ARCHIVE_WORKFLOW_ARTIFACT|DELETE_WORKFLOW_ARTIFACT|MOVE_WORKFLOW_PROJECT_FILE|GET_BRAINSTORMING_METHODS|APPEND_BRAINSTORMING_SELECTED_TECHNIQUE|UPSERT_EPIC|PLAN_STORY_ARTIFACTS|PLAN_REMEDIATION_STORY_ARTIFACT|GENERATE_STORY_FILES|UPDATE_STORY_INDEX_STATUS|DEV_STORY_GIT_FINALIZE|RECORD_FINDINGS|STORY_TASK_REMINDER|STORY_TASK_COMPLETE|REQUEST_TASK_DETAIL|SHOW_INCOMPLETE_TASKS|USE_SUBAGENTS)|['\"](workflow_progress_request|replace_in_file|browser_action|use_mcp_tool|access_mcp_resource|load_mcp_documentation|new_task|generate_plan_output|act_mode_respond|focus_chain|web_fetch|web_search|condense|summarize_task|report_bug|new_rule|generate_explanation|use_skill|set_workflow_values|build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|resolve_existing_project_artifact|validate_story_index_entry|get_brainstorming_methods|append_brainstorming_selected_technique|upsert_epic|plan_story_artifacts|plan_remediation_story_artifact|generate_story_files|update_story_index_status|dev_story_git_finalize|record_findings|story_task_reminder|story_task_complete|request_task_detail|show_incomplete_tasks|use_subagents)['\"]" src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectToolSchemas.ts
```

The command must return no matches.

- [ ] Subtask 15.5: Confirm the BMAD package is untouched:

```sh
git diff --name-only -- .cline/skills/bmad-document-project
```

then:

```sh
git diff --cached --name-only -- .cline/skills/bmad-document-project
```

then:

```sh
git ls-files --others --exclude-standard -- .cline/skills/bmad-document-project
```

All three commands must return no output.

### [ ] Task 16: Run Scope-Diff And Final Compliance Review

Allowed files for this task and every numbered subtask below:

- `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`

Full target file path for this task and every numbered subtask below: `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`.

- [ ] Subtask 16.1: Run:

```sh
git diff --name-only
```

- [ ] Subtask 16.2: Run:

```sh
git diff --cached --name-only
```

- [ ] Subtask 16.3: Run:

```sh
git ls-files --others --exclude-standard
```

- [ ] Subtask 16.4: Run:

```sh
shasum -a 256 docs/workflows/workflow-runtime/workflow-modules/document-project/document-project.md docs/workflows/workflow-runtime/workflow-modules/document-project/document-project-requirements.md docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md docs/workflows/workflow-runtime/requirements.md docs/workflows/workflow-runtime/architecture.md
```

Require the five output lines to equal the Protected-document authoring baseline byte-for-byte. A protected path reported by Subtask 16.1, 16.2, or 16.3 whose hash still equals that baseline is preserved authoring-baseline state and is explicitly exempt from the implementation allowlist comparison; it must remain reported and must not be edited, reverted, staged, or treated as implementation fallout. If any hash differs, stop and ask the user. For every other path from Subtasks 16.1, 16.2, and 16.3, confirm it is either this action plan or appears in the exact allowed-files set of the task that prescribed the implementation change.

- [ ] Subtask 16.5: Reread `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` and `docs/action-plan-guide.md`, then perform a line-by-line review of this action plan against both guides. Confirm every task/subtask is requirements-backed, compile-safe, uses the module guide's prescribed method, is exact about imports/symbols/types/fixtures/actions/events/assertions/cleanup, contains no invented user or AI-facing copy, and leaves no implementation choice to the developer.

- [ ] Subtask 16.6: Confirm every task/subtask has a checkbox, an allowed-files list inherited from its numbered task, an exact target path, prescribed fallout cleanup, and validation coverage. If any requirement or live contract has changed, stop and ask the user rather than improvising.

## Appendix A: Exact Initial Documents

### Project Overview

```text
# Executive Summary

# Classification

Repository Type:
Product Type:
Primary Language:
Repo Status:
Architecture Pattern:

# Structure

# Technology Stack Summary

# Key Features

# Architecture Highlights

# Repository Structure

# Dependency Graph & Data Flow

# Integration Points & API Contracts

# Documentation Map
```

### Developer Guide

```text
# Coding Style

# Before Contributing
All updates should start with a clean working tree. Always check for a clean tree before beginning work, and ask the user to commit anything already in the working tree before you begin if the tree is not clean.

# Local Development Instructions
- You must always follow workflow instructions exactly
- You must always stop and ask for guidance when faced with anything ambiguous or for which a decision is required that has not been explicitly deferred to you by the user or workflow instructions
- You must avoid broad file scan behavior. Limit system access to the files necessary to perform the task assigned to you.
- You must only use attempt_completion once, as your final completion report at the end of a workflow.

# Code Quality
- Keep changes narrowly scoped to the requested behavior and follow the existing architecture, naming conventions, helper APIs, and file organization already present in the codebase.
- Prefer type-safe, explicit implementations. Avoid `any`, unchecked casts, ad hoc string parsing, duplicated constants, and broad fallback behavior unless the project already uses that pattern or the requirements explicitly call for it.
- Do not invent user-facing text, prompts, labels, errors, configuration values, or workflow behavior. Reuse existing repo-owned strings and patterns where available; if required wording is missing, ask for clarification.
- When changing behavior, update the directly affected tests and remove stale imports, helpers, fixtures, assertions, and validation guards. Do not leave dead code behind.
- Before considering work complete, run the repository’s relevant focused tests plus the standard quality gates, such as typecheck, lint/format, and build/package commands if configured. Record the exact commands and outcomes.

# End to End Testing

# Commit Guidelines
When asked to commit your work, follow these rules:
	- Write clear, descriptive commit messages
	- Use conventional commit format (e.g. “feat:”, “fix:”, “docs:”)
	- Reference project title, story number, epic number, or phase number where relevant.

# Most Recent Project Notes

# Planned Enhancements

# Known Issues & Technical Debt
```

## Appendix B: Exact Step 4 Prompt Sections

### Base

```text
Role and Objective:
You are an expert technical writer and principal software architect. Your task is to generate comprehensive, production-ready system documentation for the codebase in the current workspace.
```

### Both-Created Status

```text
These documents were automatically generated by the system with required headings and will be completed by you during this workflow.
```

### Shared Paths

```text
    - Project Overview: {workflow.project_overview}
    - Developer Guide: {workflow.developer_guide}
```

### Project Overview-Only Status

```text
This document was missing at workflow invocation and has been generated as an initial scaffold for you to complete during this workflow:
    - Project Overview: {workflow.project_overview}
Completing this document is your primary focus during this workflow. You may add content and edit as-needed.

This document appears to have been generated during an earlier session. You'll need to ask the user to review and indicate whether additional revisions are needed:
    - Developer Guide: {workflow.developer_guide}
If you identify any inaccuracies or gaps in this document during your work, do not automatically update this document. Stop, inform the user of your discovery, and gain their consent before editing this document.
```

### Developer Guide-Only Status

```text
This document was missing at workflow invocation and has been generated as an initial scaffold for you to complete during this workflow:
    - Developer Guide: {workflow.developer_guide}
Completing this document is your primary focus during this workflow. You may add content and edit as-needed.

This document appears to have been generated during an earlier session. You'll need to ask the user to review and indicate whether additional revisions are needed:
    - Project Overview: {workflow.project_overview}
If you identify any inaccuracies or gaps in this document during your work, do not automatically update this document. Stop, inform the user of your discovery, and gain their consent before editing this document.
```

### Input Introduction

```text
The user provided the following inputs, which you must immediately add to the owning document under the appropriate headings:
```

### Project Overview Inputs

```text
Project Overview:
    - Repository Type: {workflow.repo_type}
    - Product Type: {workflow.product_type}
    - Primary Programming Language: {workflow.primary_programming_language}
    - Repo Status: {workflow.repo_status}
```

### Developer Guide Inputs

```text
Developer Guide:
    - Recent Project Notes: {workflow.recent_project}
    - Planned Enhancements: {workflow.planned_enhancements}
    - Known Issues/ Tech Debt: {workflow.known_issues}
```

### Both-Document Work

```text
After saving the user's inputs, notify them that you've added their inputs to the documents and are beginning your initial repo scan.

Perform an exhaustive system review in order to generate the needed content for the remaining sections in both of the provided documents. The user has provided these indicators to inform your scan:
- Uses APIs: {workflow.api_indicator}
- Uses Data Models or Databases: {workflow.database_indicator}
- Uses State Management: {workflow.state_management_indicator}
- Has a UI: {workflow.ui_indicator}
- Requires Deployment Config: {workflow.deployment_indicator}

The steps below are considered the appropriate method to conduct this system scan to populate the Project Overview:

# Context Gathering
1. Scan all active source files, configuration files, and data schemas in the repository.
2. Analyze the system's entry points, primary module dependencies, and external integrations.
3. Add content to {workflow.project_overview} as you work.

## 1. System Overview
- High-level functional purpose of the application.
- Target audience and primary use cases.
- Core business logic flows.

## 2. Architecture & Tech Stack
- Complete list of languages, frameworks, databases, and major third-party dependencies.
- High-level structural pattern used (e.g., MVC, Microservices, Clean Architecture).
- Data flow mapping from ingestion to storage.

## 3. Module & Directory Breakdown
- A visual directory tree of critical source folders.
- Detailed explanations for the responsibilities of each key module/package.

## 4. Core API & Interface Specifications
- Publicly exposed APIs, webhook listeners, or event-driven queues.
- Key function signatures, inputs, outputs, and expected error handling mechanisms.

## 5. Setup, Deployment & Testing
- Exact step-by-step local installation and environment variable configuration instructions.
- Test suites execution scripts and continuous integration deployment workflows.

## 6. Existing Documentation
- Full inventory of any existing system context, guides, or readme files

# Content Constraints
- Be explicit, factual, and strictly technical.
- Do not invent, extrapolate, or hallucinate features not found in the source code.
- Format all code blocks, variables, and path names with appropriate markdown notation.
- If a specific architecture pattern is ambiguous, state the observable code organization rather than guessing.

To populate the Developer Guide, walk the user through each section, preferring their input augmented by your own system review as needed.
Here's how to think about each section of the document:
- Before Contributing: What does a dev agent need to know before they write a single line of code in this repo? A good way to approach this is to identify the top 3-5 "gotchas" or "must-knows" that agents can't afford to overlook.
- Local Development Instructions: This section is more procedure-oriented, as you can see by the pregenerated content. You may add content to this section, but do not remove the pregenerated content in this section.
- Code Quality: This section also includes pregenerated content, which can be revised if the user requests changes. This is intended to ensure that dev agents output is clean, consistent, scalable, and reliable.
- End to End Testing: This section should detail the end-to-end testing for the product as well as any targeted testing suites. If any tests run automatically, this section should indicate what triggers them and which tests are automatically run.
- Commit Guidelines: This section also includes pregenerated content which can be revised if the user wishes.
- Most Recent Project Notes: This section should provide an overview of the most recent work in this repo (where applicable)
- Planned Enhancements: This section should be a backlog of future product changes that the user has identified but is not ready to act on yet.
- Known Issues & Technical Debt: This section should be an inventory of any known system issues, tech debt, or misconfigurations.

Stop and ask the user for guidance and clarification as needed. Once you complete your system scan and have documented your findings, inform the user and work with them to ensure that your drafted content is correct and comprehensive.

Once the document is fully populated and the user has approved the content, use attempt_completion to deliver a final recap of the work completed and end this workflow.
```

### Developer Guide-Only Work

```text
To populate the Developer Guide, walk the user through each section, preferring their input augmented by your own system review as needed.
Here's how to think about each section of the document:
- Before Contributing: What does a dev agent need to know before they write a single line of code in this repo? A good way to approach this is to identify the top 3-5 "gotchas" or "must-knows" that agents can't afford to overlook.
- Local Development Instructions: This section is more procedure-oriented, as you can see by the pregenerated content. You may add content to this section, but do not remove the pregenerated content in this section.
- Code Quality: This section also includes pregenerated content, which can be revised if the user requests changes. This is intended to ensure that dev agents output is clean, consistent, scalable, and reliable.
- End to End Testing: This section should detail the end-to-end testing for the product as well as any targeted testing suites. If any tests run automatically, this section should indicate what triggers them and which tests are automatically run.
- Commit Guidelines: This section also includes pregenerated content which can be revised if the user wishes.
- Most Recent Project Notes: This section should provide an overview of the most recent work in this repo (where applicable)
- Planned Enhancements: This section should be a backlog of future product changes that the user has identified but is not ready to act on yet.
- Known Issues & Technical Debt: This section should be an inventory of any known system issues, tech debt, or misonfigurations.

Once the document is fully populated and the user has approved the content, use attempt_completion to deliver a final recap of the work completed and end this workflow.
```

### Project Overview-Only Work

```text
After saving the user's inputs, notify them that you've added their inputs to the document and are beginning your system scan.

Perform an exhaustive system review in order to generate the needed content for the remaining sections in the Project Overview document. The user has provided these indicators to inform your scan:
- Uses APIs: {workflow.api_indicator}
- Uses Data Models or Databases: {workflow.database_indicator}
- Uses State Management: {workflow.state_management_indicator}
- Has a UI: {workflow.ui_indicator}
- Requires Deployment Config: {workflow.deployment_indicator}

The steps below are considered the appropriate method to conduct this system scan:

# Context Gathering
1. Scan all active source files, configuration files, and data schemas in the repository.
2. Analyze the system's entry points, primary module dependencies, and external integrations.
3. Add content to {workflow.project_overview} as you work.

## 1. System Overview
- High-level functional purpose of the application.
- Target audience and primary use cases.
- Core business logic flows.

## 2. Architecture & Tech Stack
- Complete list of languages, frameworks, databases, and major third-party dependencies.
- High-level structural pattern used (e.g., MVC, Microservices, Clean Architecture).
- Data flow mapping from ingestion to storage.

## 3. Module & Directory Breakdown
- A visual directory tree of critical source folders.
- Detailed explanations for the responsibilities of each key module/package.

## 4. Core API & Interface Specifications
- Publicly exposed APIs, webhook listeners, or event-driven queues.
- Key function signatures, inputs, outputs, and expected error handling mechanisms.

## 5. Setup, Deployment & Testing
- Exact step-by-step local installation and environment variable configuration instructions.
- Test suites execution scripts and continuous integration deployment workflows.

## 6. Existing Documentation
- Full inventory of any existing system context, guides, or readme files

# Content Constraints
- Be explicit, factual, and strictly technical.
- Do not invent, extrapolate, or hallucinate features not found in the source code.
- Format all code blocks, variables, and path names with appropriate markdown notation.
- If a specific architecture pattern is ambiguous, state the observable code organization rather than guessing.

Stop and ask the user for guidance and clarification as needed. Once you complete your system scan and have documented your findings, inform the user and work with them to ensure that your drafted content is correct and comprehensive.

Once the document is fully populated and the user has approved the content, use attempt_completion to deliver a final recap of the work completed and end this workflow.
```

### Update Existing Documents Work

```text
You have been called inside a project documentation workflow focused on updating existing documentation. The existing project documentation is located at docs/projects/agent-guidance.

Follow these steps:
1. Identify which documents exist in the documentation folder
2. Use ask_followup_question to provide the user with a list of all existing documents in the folder asking them which file they'd like to update first
3. Make revisions as needed based on the user's direction and/or any documentation they provide you with.
4. Ensure that the user has reviewed and approved all new content, then use attempt_completion to provide a final change summary and end the workflow.
```

### Add Supporting Documentation Work

```text
You have been called inside a project documentation workflow focused on updating existing documentation. The existing project documentation is located at docs/projects/agent-guidance.

Follow these steps:
1. Ask the user what they'd like to add new documentation for
2. Assess existing documentation to determine whether the content the user wants to add belongs in an existing document. If so, suggest updating the existing document(s) instead of generating new files.
3. Assist them in generating the requested documentation and/or updating existing documentation in the project documentation folder (docs/projects/agent-guidance)
3. When finished, confirm that the user has reviewed and approved all new content, then use attempt_completion to provide a final change summary and end the workflow.
```

## Compliance Matrix

Every task and numbered subtask has its own complete row.

| Task/Subtask | Requirement Source | Target File | Symbols Verified | Live Contract Verified | Fallout Cleanup Prescribed | Validation Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Task 1 | Main FR-20j3d, FR-20p4; module Artifact-Family Registration | `src/core/task/workflow-runtime/artifactFamilies.ts`<br>`src/core/task/workflow-runtime/WorkflowRuntime.ts` | `WorkflowArtifactFamily`, singleton family/identity unions, registry, singleton parser case group | Existing registry shape, ownership, parser return type, and singleton case group verified | Preserve existing families; add no sidecar or generic existing-artifact resolution behavior | 10.6, 12.4, 14.1-14.2 |
| 1.1 | Main FR-20b1a, FR-20j3d; module exact family ids and registration table | `src/core/task/workflow-runtime/artifactFamilies.ts`<br>`src/core/task/workflow-runtime/WorkflowRuntime.ts` | Two enum members, singleton unions, two complete registry records, and parser singleton `undefined` cases | Discriminated singleton contract, exhaustive registry, and `ParsedWorkflowArtifactIdentity` requirements verified | One atomic two-file patch; preserve existing records; do not add normalization or manufacture parser identity | 10.6, 12.4, 14.1-14.2 |
| Task 2 | Main FR-12a-b3, FR-20j3d, FR-20j6g-k, FR-57h-k and approved `projectSubfolder` matrix disposition; module Foundational contract | Every explicit production/test target in Task 2's allowed-files list | Two atomic multi-file contract cutovers, including every production session constructor/clone/restore carrier | Every live singular-field, prerequisite declaration, session fixture, and production session literal was inventoried | No optional transition field, alias, deferred call site, or second state carrier | 5.1-5.3, 10.2-10.8, 14.2, 14.5-14.7, 15.1 |
| 2.1 | Main FR-10d2-d6, FR-12a-b3, FR-20a/l, FR-57h-k and approved `projectSubfolder` matrix disposition, NFR-7a; module project selection and placement | `types.ts`, `WorkflowRuntime.ts`, 16 shipped definitions, and exact affected fixtures enumerated in Task 2 | Selection/placement unions; required fields; canonical fixed-folder normalization equality; placement resolver; path callers; validators; test-title cleanup; all migrated definitions/fixtures | Live types, `normalizeProjectFolderName(...)`, three runtime singular-field reads, 16 definitions, and every direct test occurrence verified | One atomic patch removes singular `projectSubfolder`; preserves segment contracts/constants/imports; accepts no safe-but-noncanonical fixed identity; adds no metadata replica | 5.1-5.3, 10.2-10.5, 11.1-11.2, 14.2, 14.5-14.7, 15.1 |
| 2.2 | Main FR-20j3d, FR-20j6g-k; module prerequisite/session contract; user-approved canonical epic inventory expectation alignment | `types.ts`, `WorkflowRuntime.ts`, 13 prerequisite owners, and every explicit session/prerequisite fixture enumerated in Task 2 | Resolution mode/result types; `artifactId`; session array; artifact union; singleton identity switch cases; structural restore guards; final activation, clone, compatibility-restore, and normalized-restore carriers; exact migrations/counts; exact canonical epic inventory expectation | Live prerequisite owners, exhaustive artifact-definition switch, every production session literal, restore guard seam, session fixture inventory, and production canonical epic inventory output verified | One atomic final-shape patch; no intermediate carrier, incomplete union, legacy default in types, parallel carrier, lifecycle field, deferred fixture, production epic-output change, or unrelated assertion change | 5.1-5.3, 10.2, 10.7-10.8, 14.2, 14.5-14.7 |
| Task 3 | Main FR-10d2-d6, FR-10g-g2, FR-10j5, FR-62e/i; module automatic fixed selection | `src/core/task/workflow-runtime/WorkflowRuntime.ts`<br>`src/core/task/tools/subagent/SubagentRunner.ts`<br>`src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts` | Entry form, shared finalizer, automatic discovery, submission route, runtime and runner child-activation guards | Existing entry-selection, child-activation, assignment-resolution, and runner-test seams verified | Interactive behavior and existing failure copy unchanged; no synthetic selector or parallel project state | 3.8, 5.3, 10.3-10.4, 10.10, 14.2, 14.6 |
| 3.1 | Main FR-10d-d6; module Entry contract | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | `buildWorkflowEntryFormDefinition(...)` conditional panel inventory | Existing info/selector panels and copy verified | Preserve interactive panel; automatic path is info-only | 10.3-10.4, 14.2 |
| 3.2 | Main FR-10j1-j5 | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | Exact `finalizeWorkflowProjectSelection(...)` | Existing finalization sequence and continuations verified | Remove duplicate sequence; one call per mode | 10.3-10.4, 10.10, 14.2 |
| 3.3 | Main FR-10d4-d6, FR-10g-g2 | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | Exact automatic resolver, explicit non-automatic `no_op` narrowing branch, and six-key discovery request | Shared candidate discovery and `WorkflowNextAction` no-op shape verified | Read no fixed union field before narrowing; add no target segments, naming pattern, or separate root value | 10.3-10.4, 14.2 |
| 3.4 | Main FR-10d4-d6 | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | Automatic info-submit outcome route | Existing interactive outcome branch verified | No discovery/folder work before successful submit | 10.3, 10.10, 14.2 |
| 3.5 | Main FR-10d2, FR-58-65, NFR-4/4a where applicable | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | `inheritsParentProjectSelection`, interactive-only incomplete-parent guard, and automatic child self-resolution | Existing pre-session guard, child isolation, and form prohibition verified | Incomplete automatic parent passes; no unrelated parent selection copied, parent state mutated, or mutable map shared | 3.8, 10.4, 14.2, 14.6 |
| 3.6 | Main FR-10d2, FR-62e/i; module child automatic activation | `src/core/task/tools/subagent/SubagentRunner.ts` | `autoActivateAssignedWorkflow(...)`, existing resolver, split missing-parent and interactive-completeness guards, exact existing failure result | Parent-session read, registry resolution, activation/restoration, and next-action path verified | Preserve missing-parent and interactive failure behavior/copy; add no runner-owned project selection or fallback | 3.7-3.8, 5.3, 14.6 |
| 3.7 | Main FR-10d2, FR-62e/i; module child automatic activation coverage | `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts` | `createResolvedWorkflow(...)`, interactive failure matrix, two incomplete-parent automatic-fixed cases, activation argument/reference assertions | Reflected activation helper, existing parent fixtures, exact error assertions, and empty prompt projection verified | Preserve existing interactive/missing-parent regressions; add no filesystem/model/form setup or copy | 3.8, 5.3, 14.6 |
| 3.8 | Main FR-10d2, FR-62e/i; module focused child-activation validation | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact two-path `npm run test:unit -- ...` command | Script and both test paths verified | Command-only; no implicit repair | Exact command result; repeated by 14.2 and 14.6 |
| Task 4 | Main FR-10m8, FR-16n, FR-20j6g-m, FR-20p7-p9; module prerequisites and Step 1/2 runtime | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | Write/commit/resolver/validator/entry exclusion/allocation/identity/restore/continuation symbols | Existing final clone/restore contract from Task 2, interactive resolver, continuation lookup, artifact allocation, and routed-value trigger verified | Staged clone prevents partial mutation; preserve branch advance, interactive behavior, and unlinked allocation | 10.2, 10.6-10.11, 14.2, 14.6 |
| 4.1 | Main FR-10a-c1, FR-16n; atomic writes | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | Exact `applyWorkflowValueWritesToSession(...)` signature and result; existing `applyWorkflowValueWrites(...)` wrapper | Inventory, JSON safety, dedupe, equality, set/clear, and routed trigger behavior verified | Move logic without semantic drift; keep one canonical public seam and one trigger | 10.8, 10.10, 14.2 |
| 4.2 | Main FR-16n, FR-20j6j, FR-20p7-p9; user-approved staged commit | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | Exact `commitDeterministicPrerequisiteResolution(...)`, cloned session, ordered upsert, validator, single assignment, routed trigger | Task 2 final `cloneWorkflowSession`, mutation core, task session ownership, and `recordWorkflowValuesPersistedTriggerIfRouted` verified | No live mutation/rollback; on failure preserve results, values, trigger, and already-advanced branch | 10.8, 10.10, 14.2 |
| 4.3 | Main FR-20j6g-i; interactive/deterministic resolution | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | `buildResolvePrerequisiteFilesNextAction(...)` mode narrowing and existing discovery wrapper | Existing persisted-path shortcut, candidate/UI paths, skipped ids, and shared failure owner verified | Interactive path unchanged; deterministic path has no forms/skips/local error copy/teardown | 10.2, 10.7-10.8, 10.11, 14.2 |
| 4.4 | Main FR-20j6h-j; exact result contract | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | Exact `found`/`not_found` objects, unlinked path set/clear maps, cardinality check, staged commit, recursive reacquisition | Exact-filename discovery result and replaced-session hazard verified | Never write intended path; never continue with stale pre-commit session | 10.7-10.8, 14.2 |
| 4.5 | Main FR-20j8h, FR-20l1, FR-20p7a; adopted artifact | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | Linked `WorkflowArtifactDefinition`, awaited `resolveWorkflowArtifactAllocation(...)`, exact resolved-path equality, one metadata map | Metadata-only allocation resolver and canonical output writes verified | No create/build/archive/delete/replace/suffix/file mutation | 10.6-10.8, 14.2 |
| 4.6 | Main FR-20p7a; missing linked artifact | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | Clear family, identity, filename, relative and absolute path; retain three project keys | Artifact output-key map verified | Do not clear shared project identity or create a path | 10.7-10.9, 14.2 |
| 4.7 | Main FR-16n, FR-20j6j, FR-20p7-p9; deterministic state integrity | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | `validateCurrentPrerequisiteFileResolutions(...)`; ordered-prefix, canonical path/policy, metadata, pre/post-allocation states | Selected-project path resolver, exact match definition, artifact outputs, validation result contract verified | Reject rather than append/repair; never rescan completed results; `not_found` commit must remain unallocated | 10.7-10.9, 10.11, 14.2 |
| 4.8 | Main FR-10m8, FR-29j1; entry artifact exclusion | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | `resolveActiveWorkflowNewSingletonArtifactOutputs(...)` linked-artifact filter | Shared singleton conflict/result payload owner verified | Preserve ordinary singleton handling; linked artifacts never enter conflict/archive/delete event flow | 10.7, 10.9-10.10, 14.2 |
| 4.9 | Main FR-20i8; allocation authorization | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | `prepareWorkflowArtifactCreation(...)` linked prerequisite/result/output-state guard | Existing unlinked allocation authorization and exclusive creation verified | Fail closed for unresolved/found/duplicate/partial/already allocated; preserve unlinked flow | 10.9-10.10, 14.2 |
| 4.10 | Main FR-20j6g-i, FR-63 | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | `validateWorkflowDefinition(...)` mode/link/same-definition/singleton/filename/output-key/placement guards | Artifact definition/registry/match/placement shapes verified | Preserve segment validators; no loose placement equivalence | 10.2, 12.4, 14.1-14.2 |
| 4.11 | Main FR-20j6j, FR-48-52d; restore | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | `validatePersistedWorkflowSessionForRestore(...)` semantic consistency call against the Task 2 structurally normalized `compatibilitySession` | Existing structural guards/copies, compatibility session, final normalized session, and trigger/branch restore order verified | Reject partial/noncanonical state; retain no repair or module ledger | 10.8, 10.10, 14.2, 14.6 |
| 4.12 | Main FR-20j6j, FR-29, FR-48-52d; user-approved continuation re-entry | `src/core/task/workflow-runtime/WorkflowRuntime.ts` | Exact `findIncompleteDeterministicPrerequisiteContinuationRoute(...)`; route-first lookup; complete-id bypass; partial-prefix validation; `resolveNextAction(...)` insertion | Existing following-branch advancement, continuation-source correlation, and module-owned complete-state validation route verified | Re-enter unresolved deterministic route only; do not preempt complete-state module terminal handling, reset branch/trigger, call route builder, or re-enter interactive work | 10.8, 10.10, 14.2 |
| Task 5 | Main OR-2; module migration safety; Action Plan Guide compile-safe requirement | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` plus six command-owned generated paths, including `dist-standalone/proto/descriptor_set.pb` | Early typecheck and exact migrated regression commands | Repo scripts, proto descriptor output, and every affected test path verified | Validation only; inspect tracked fallout, permit only the declared ignored descriptor output, and never repair implicitly | 5.1-5.3 command results |
| 5.1 | Main OR-2; compile safety | Action-plan checkbox plus six command-owned generated paths, including `dist-standalone/proto/descriptor_set.pb` | `npm run check-types` and tracked generated-diff guard | Script invokes protos and writes the ignored descriptor | No manual generated edit; descriptor remains command-owned | Exact command results |
| 5.2 | Main FR-12a-b3, FR-20j6k | Action-plan checkbox; 16 read-only test targets | Exact migrated workflow-definition suite | Each path maps to Task 2 production cutover | Command-only | Exact test result; repeated by 14.5 |
| 5.3 | Main FR-12a-b3, FR-20j6j-k | Action-plan checkbox; exact read-only fixture suites | Non-definition fixture regression set | Every path maps to Task 2 fixture cutover | Command-only | Exact test result; repeated by 14.3, 14.4, 14.6 |
| Task 6 | Module Initial Document Builders; Main FR-20d-h, FR-53/55 | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectDocument.ts` | Two builders; 19 exact heading constants; two ordered heading inventories | Quick Spec heading-constant/builder pattern verified | No session/path/fs/source/BMAD dependency or generic renderer | 10.12, 12.1, 12.10, 14.1-14.2, 15.2-15.3 |
| 6.1 | Module exact Project Overview scaffold | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectDocument.ts` | Ten Project Overview constants, inventory, builder | Appendix A and live builder pattern verified | Interpolate constants; exact bytes and final newline | 10.10, 10.12, 12.1, 14.1-14.2 |
| 6.2 | Module exact Developer Guide scaffold | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectDocument.ts` | Nine Developer Guide constants, inventory, builder | Appendix A and live builder pattern verified | Interpolate constants; preserve all generated prose | 10.10, 10.12, 12.1, 14.1-14.2 |
| 6.3 | Main FR-53/55; module Source Independence | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectDocument.ts` | Code-owned templates/constants only | Shared deterministic builder consumes complete content | No fs/path/source/BMAD/generic renderer | 12.1, 15.2-15.3 |
| Task 7 | Main FR-15 through FR-15h, FR-31-38; module Exact Per-Turn Tool Schema Override | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectToolSchemas.ts` | Four step builders, ordered Step 4 ids, registered shared-spec resolver | `ClineToolSet`, registration initializer, Native GPT-5 fallback lookup verified | No copied/wrapped config and no deterministic/backend-only tools | 12.2-12.3, 13.1-13.2, 14.1, 14.3, 15.4 |
| 7.1 | Module exact tool-schema imports | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectToolSchemas.ts` | Exact five imports and type/value classification | Shared registry locations verified | Add no additional import or local spec | 12.2, 12.10, 14.1, 14.7 |
| 7.2 | Module Step 4 exact schema order | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectToolSchemas.ts` | `DOCUMENT_PROJECT_STEP_4_TOOL_IDS`, exact 11 `ClineDefaultTool` ids/order | Each id exists in registered shared/default tool inventory | No forbidden tool id or reordered response tools | 12.2-12.3, 13.1-13.2, 15.4 |
| 7.3 | Main FR-15g; shared spec reuse | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectToolSchemas.ts` | `resolveDocumentProjectSharedToolSpec(...)`, exact lookup and existing internal error | `registerClineToolSets`, `getToolByNameWithFallback`, `tool.config` verified | Do not copy/wrap descriptions, parameters, requirements, or context | 12.2-12.3, 14.1 |
| 7.4 | Module Steps 1-3 empty overrides | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectToolSchemas.ts` | Three exact named builders returning `[]` | Runtime honors a complete empty override for runtime-only steps | No fallback tool exposure | 12.2, 12.8, 13.1, 14.1, 14.3 |
| 7.5 | Module Step 4 complete override | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectToolSchemas.ts` | `buildDocumentProjectStep4ToolSchemas()` maps ordered ids through resolver | Shared configs are complete `ClineToolSpec` values | No local wrapper/spec mutation | 12.2-12.3, 13.1-13.2, 14.1, 14.3, 15.4 |
| Task 8 | Main FR-11-21b, FR-20p4-p9, FR-22-45, FR-46/48-52d; module identity/persona/values/artifacts/prerequisites/forms/Steps 1-4/failure copy | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | Exact module constants, 28 values, artifacts, prerequisites, forms, state readers, procedures, trigger helpers, four decision trees, 13 prompt sections, complete definition | Quick Spec allocation/retry/build, Correct Course deterministic/form/session-data/tool patterns, form conditional transitions, prompt renderer verified | No bespoke handler/scanner/allocator/form runtime/resume state; no invented copy or local token/path logic | 10.2, 10.6-10.10, 12.4-12.9, 13.1-13.4, 14.1-14.4, 15.2-15.4 |
| 8.1 | Main FR-11-20; module production-file contract | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | Exact prescribed type/value imports plus document/tool builders | All import sources and symbol classifications verified | 8.19 removes every provisional import; remove no prescribed import | 12.4, 12.10, 14.1, 14.7 |
| 8.2 | Module Workflow Identity And Entry | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | Six exact identity/description/entry constants | Exact source-backed user-facing copy available | No paraphrase, `.md` alias, or alternate constant | 12.4, 12.9, 13.3-13.4, 14.1, 14.4 |
| 8.3 | Module Persona; Main FR-53/55 | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | `DOCUMENT_PROJECT_WORKFLOW_PERSONA` exact six-field contract | `WorkflowPersonaDefinition` shape verified | Preserve exact spelling/punctuation; invent no persona text | 12.4, 13.1, 14.1, 14.3 |
| 8.4 | Module Runtime-Owned Workflow Values; Main FR-10c1, FR-21 | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | Exact 28-member enum, ordered inventory, exact three entry keys | `WorkflowValues`, inventory enforcement, entry mapping verified | No AI-writable list or generic `creationRequired` | 10.10, 12.4, 12.6-12.7, 14.1-14.2 |
| 8.5 | Main FR-20p4-p6; module Artifact Definitions | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | Two artifact ids and exact `DOCUMENT_PROJECT_ARTIFACTS` mappings | Standalone singleton definition/output-key shape verified | Undefined parent/target retained; no filename/path computation | 10.2, 10.6-10.10, 12.4, 14.1-14.2 |
| 8.6 | Main FR-20p7-p7a; module Optional Artifact-Linked Prerequisites | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | Two ids and exact ordered `DOCUMENT_PROJECT_PREREQUISITE_FILES` records | Required resolution/link/empty-segment/exact-match fields verified | No interactive UI, intended missing path, extra field, or reordered declaration | 10.2, 10.7-10.8, 12.4, 14.1-14.2 |
| 8.7 | Module Module-Owned Failure Copy; Main FR-65 | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | Seven exact named terminal-error constants | Every string is source-backed | Reuse constants without wording variants; add no form/transition wrapper copy | 10.10, 12.6-12.7, 14.1-14.2 |
| 8.8 | Module Workflow Form 1 and Step 1 Routing | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | Five ids; `buildDocumentProjectStep1WorkflowForm`; exact title/dictionaries/panels/field/actions/transitions | `WorkflowFormDefinitionPayload`, fieldless submit-only panel, shared single-selection default verified | No filler fields, optional copy, cancel, labels variant, or extra property | 10.10, 12.5-12.6, 14.1-14.2 |
| 8.9 | Module Workflow Form 2 and Step 3 Sequencing | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | 13 ids; `buildDocumentProjectStep3WorkflowForm`; exact fields/options/order/cardinality/actions/transitions | Form runtime resolves conditional transitions from form-session data | No boolean labels, extra copy, `continue_workflow_form`, or runtime change | 10.10, 12.5-12.6, 14.1-14.2 |
| 8.10 | Main FR-16n, FR-29j; module prerequisite and objective state | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | `readWorkflowStringValue`, `readWorkflowBooleanValue`, `DocumentProjectSessionObjective`, exact raw objective reader, `DocumentProjectReferenceDocumentState`, `Object.values(DOCUMENT_PROJECT_PREREQUISITE_FILES)` ordered iteration, raw exact-found and unset checks | Record-shaped prerequisite definitions, exact two-result declaration order, raw path/objective types, and workflow-value ownership verified | Wrong-typed, empty, whitespace, and padded present paths plus trimmed-equivalent objectives fail closed; decision predicates read declared values only; no post-allocation inference | 10.10, 12.6-12.7, 14.1-14.2 |
| 8.11 | Main FR-20p8/e; module Steps 1-3 deterministic state/form data | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | `validateReferenceDocumentResolutionState`, `deriveDocumentCreationRequirements`, `buildBaselineProjectDataFormSessionData`, exact invalid-boolean narrowing | `WorkflowDeterministicProcedureResult`, shared deterministic write persistence, and `WorkflowFormSessionData` shapes verified | One validated atomic flag map; no module persistence-failure mapping, coercion, or duplicate state reader | 10.10, 12.6, 14.1-14.2 |
| 8.12 | Main FR-29 through FR-29j; source-route correlation | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | `WorkflowStepResolutionSourceRoute` import; `sourceRouteMatches`, operation success/failure triggers, `workflowFormCompleted` | Existing event-predicate/source-route/form-complete event contracts verified | Every operation route uses exact source; no uncorrelated result predicate | 10.10, 12.6, 14.1-14.2 |
| 8.13 | Main FR-29b2; module Step 1 Routing | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | `buildDocumentProjectStep1DecisionTree`; exact branches/routes/actions and four mutually exclusive panel predicates | Runtime decision action/trigger/form transition shapes and preceding deterministic validation verified | Preceding procedure alone owns invalid-result failure; add no unreachable/overlapping `always` fallback or priority dependency | 10.10, 12.6, 14.1-14.2 |
| 8.14 | Main FR-20p8-p8e, FR-29b2, FR-65; module Step 2 | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | `buildDocumentProjectStep2DecisionTree`; ten branches; exact derive/skip/allocate/retry/build/error/complete routes and complementary predicates | Quick Spec tool-backed source correlation and build/transition patterns verified | Exactly one allocation retry, no build retry, strict overview-before-guide order, failure blocks later actions, and no overlapping fallback | 10.10, 12.6, 14.1-14.2 |
| 8.15 | Main FR-29b2; module Step 3 Routing/Form Sequencing | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | `buildDocumentProjectStep3DecisionTree`; four Boolean states, disjoint invalid state, exact form start panels/completion | Session predicates, form session-data builder, form-complete trigger verified | No form when false/false; no coercion, `always` fallback, or priority dependency | 10.10, 12.5-12.6, 14.1-14.2 |
| 8.16 | Module Exact Step 4 Prompt Sections and Prompt Rendering | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | 13 exact constants; `DocumentProjectStep4PromptSectionSelection`; selector, exact raw objective reader use, and prompt builder | Shared prompt-template token renderer and `WorkflowPromptBuilderInput` verified | No prose concatenation/replacement/`String.raw` or trimmed objective; invalid selection returns `none`; one selector owns logic | 12.7-12.8, 13.1-13.2, 14.1, 14.3, 15.3 |
| 8.17 | Main FR-29b2; module Step 4 Prompt Selection/Routing/Completion | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | `buildDocumentProjectStep4DecisionTree`; five exact section sequences; complementary valid/invalid selectors; `project_prompt`; `attempt_completion_succeeded` | Runtime prompt and explicit completion event/action contracts verified | Add no overlapping `always` fallback or `completionRules`; unrelated/failure events cannot complete | 10.10, 12.7-12.8, 13.1-13.2, 14.1, 14.3 |
| 8.18 | Module complete Workflow Definition; Main FR-11-21b | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | `documentProjectWorkflowDefinition` exact metadata/fixed project/root placement/values/forms/artifacts/prerequisites/four steps/13 templates | `WorkflowDefinition` current shape and module builder interfaces verified | No child inheritance/completion rules; Steps 1-3 no prompt/tools | 10.2, 10.10, 12.4-12.9, 13.1-13.4, 14.1-14.4 |
| 8.19 | Main FR-53/55/57; module Registration And Source Independence | `src/core/task/workflow-runtime/workflow-modules/document-project/documentProjectWorkflow.ts` | Final exact import/helper inventory; forbidden concepts absent | All required behavior is owned by prescribed shared seams | Remove provisional imports/helpers and prohibit fs/path/token replacement/source/BMAD/legacy events/bespoke state | 12.1, 12.7-12.8, 13.2, 15.2-15.3 |
| Task 9 | Main FR-1-5i, FR-11; module Registration And Source Independence | `src/core/task/workflow-runtime/workflow-modules/document-project/index.ts`<br>`src/core/task/workflow-runtime/WorkflowRegistry.ts` | Barrel exports, module import, `shippedWorkflowDefinitions` | Registry is sole shipped inventory and existing lookup implementation is verified | Preserve all entries/lookups; no alias or second metadata representation | 11.1, 12.9, 13.3-13.4, 14.1, 14.4, 14.6 |
| 9.1 | Main FR-11; module code-owned registration | `src/core/task/workflow-runtime/workflow-modules/document-project/index.ts` | Exact three `export *` statements | Existing workflow-module `index.ts` barrels use direct local `export * from` statements | Export no extra source/BMAD surface | 12.4, 12.9, 14.1 |
| 9.2 | Main FR-1-5i, FR-11 | `src/core/task/workflow-runtime/WorkflowRegistry.ts` | Exact module import and one `documentProjectWorkflowDefinition` array entry | Existing module imports, shipped array, and lookup functions verified | Preserve every existing entry/lookup | 11.1, 12.9, 13.3-13.4, 14.4, 14.6 |
| 9.3 | User-approved structural metadata clarification; main FR-1-5i | `src/core/task/workflow-runtime/WorkflowRegistry.ts` | `shippedWorkflowDefinitions` remains sole inventory | No separate metadata producer exists | No `.md` alias, metadata registry/accessor/projection, module registry, or outside registration | 11.1, 12.9, 13.3-13.4, 15.2 |
| Task 10 | Module prescribed runtime, prerequisite, artifact, form, resume, and deterministic-document coverage | `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`<br>`src/core/task/workflow-runtime/__tests__/prerequisiteFiles.test.ts`<br>`src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts` | Shared-runtime contracts and exact scaffold/handler integration | Existing runtime, scanner, artifact, form, restore, and document-build harnesses verified | Task 2 owns fixture-shape migration; shared scanner and handler behavior remain unchanged | 10.13; 14.2 |
| 10.1 | Test preparation for Tasks 10.2-10.10 | `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` | Exact registry, prerequisite namespace, and module imports | Existing imports and every new consumer verified | Add one prerequisite namespace import; repeat no Task 2 migration; remove no import | 10.13; 14.2 |
| 10.2 | Main FR-12a-b3, FR-20j6g-i, FR-63, NFR-7a | `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` | Finite exact definition mutations, canonical root/subfolder controls, and `expectDefinitionRejected(...)` | Activation rejection helper, existing project-name normalization, exact malformed-object values, and placement/link mismatch shapes verified | Preserve segment validation and strong production types; accept only the two exact valid controls from the prescribed matrix | 10.13; 14.2 |
| 10.3 | Main FR-10d4-d6, FR-10g-g2, FR-10j5 | `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` | Information-first gating, discovery-before-folder order, exact discovery requests, selection/value/form/lifecycle finalization, and 10 canonical folders | Existing discovery stub, `access(...)`, entry-form submit, lifecycle, and shared folder contracts verified | No synthetic selector, pre-submit work, root mirror, target segments, or naming pattern | 10.13; 14.2 |
| 10.4 | Main FR-10d2, FR-58-65, NFR-4/4a | `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` | Automatic-fixed child self-selection from both incomplete-parent shapes, parent snapshots/reference preservation/non-aliasing, and complete/incomplete interactive-child behavior | Child activation/session harness and existing incomplete-parent test verified | Automatic selection must not require parent project completeness; do not mutate/copy parent project data, share mutable maps, or add a child entry form | 10.13; 14.2 |
| 10.5 | Main FR-12b2, FR-20a/l | `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` | Root/subfolder allocation, discovery, index loading, and project-wide scan sets | Existing path, candidate-discovery, and index-loading seams verified | Preserve canonical project-wide target sets and ordering | 10.13; 14.2 |
| 10.6 | Main FR-20j3d, FR-20j8h, FR-20l1 | `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` | Exact enum string ids, shared paths/metadata, finite filename matrices, regex source/flags, registry keys, adoption, and allocation | Enum, registry, singleton parser return contract, discovery expression, own-key inventory, and allocation assertions verified | No generic existing-artifact parser/resolver call, alternate identity, filename, relative path, extra registry key, or sidecar behavior | 10.13; 14.2 |
| 10.7 | Main FR-10m8, FR-20j6g-j, FR-20p7a | `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` | Exact candidates/sentinels, four-state ordered results/panels, pre-commit multiple-candidate diagnostic, containment/policy diagnostics, and unlinked fixture | Resolver, policy, form, artifact, content-preservation, cardinality, and canonical-path seams verified | Reuse one namespace import; persist no intended path and render no prerequisite-choice form | 10.13; 14.2 |
| 10.8 | Main FR-16n, FR-20j6j, FR-29b2, FR-48-52d | `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` | Exact validated three-branch tree with terminal no-op parking route, atomic commits, prefix reuse, continuation re-entry, trigger preservation, and finite restore/state mutations | Session replacement, route-trigger, branch, restore-shape, metadata, placement, and policy harnesses verified | No `after-prerequisites` fallback, priority dependency, rollback/resume ledger, rescan, repair, or partial/noncanonical-state acceptance | 10.13; 14.2 |
| 10.9 | Main FR-20i8, FR-20b9 | `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` | Finite authorization/validator fixtures, exact diagnostics, canonical allocation, and sentinel collision contract | Existing create-artifact, path-policy, error-code, directory-entry, byte-preservation, and unlinked regression seams verified | Fail without suffix/overwrite; preserve unchanged state/files and named unlinked success | 10.13; 14.2 |
| 10.10 | Module Steps 1-4 runtime integration | `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts` | Exact build requests/content, four presence states, found-file preservation, retries/failures, complete-state module terminal routing, three restore boundaries, form durability, and teardown | Runtime allocation/build source recovery, forms, persistence, projection, continuation-helper bypass, and completion verified | Shared continuation validation must not preempt the exact module error; no overwrite, reallocation, or module resume state; skipped values remain untouched | 10.13; 14.2 |
| 10.11 | Main FR-20j7-j7b | `src/core/task/workflow-runtime/__tests__/prerequisiteFiles.test.ts` | Three exact empty-segment root-only scanner cases | Existing scanner result and path-policy error contracts verified | Preserve production scanner and every existing scanner test | 10.13; 14.2 |
| 10.12 | Module deterministic scaffold integration | `src/core/task/tools/handlers/__tests__/BuildWorkflowDocumentToolHandler.test.ts` | Two exact builders through the real handler; exact bytes, string-narrowed success result, and string-narrowed identical replay | Existing `ToolResponse` union, handler helper, atomic replacement, and idempotent-result contracts verified | Use exact `typeof` guards; change no shared handler, overwrite, approval, hook, or policy behavior | 10.13; 14.2 |
| 10.13 | Module required focused validation | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact three-path `npm run test:unit -- ...` command | Script and all three test paths verified | Command-only; no implicit repair | Exact command result; repeated by 14.2 |
| Task 11 | Module shipped metadata coverage and shared-capability regression gates | `src/core/task/__tests__/workflow-runtime-metadata.test.ts` | Registered definition metadata projection plus two exact validation commands | Existing metadata harness and shared regression suites verified | Add no production metadata surface; edit none of the shared regression suites | 11.2-11.3; 14.6 |
| 11.1 | Main FR-12b3; user-approved structural metadata contract | `src/core/task/__tests__/workflow-runtime-metadata.test.ts` | `ShippedWorkflowMetadata`, existing `WorkflowRegistry` namespace, exact narrowing, metadata object, and assertions | Registered-definition lookup and current metadata test imports verified | Reuse the namespace import; add no production projection/registry/accessor; repeat no Task 2 migration; remove no import | 11.2; 14.6; 15.1 |
| 11.2 | Module focused metadata validation | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact metadata-test command | Repo script and test path verified | Command-only; no implicit repair | Exact command result; repeated by 14.6 |
| 11.3 | Module shared-capability boundary; existing execution-control regressions | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact 14-suite shared regression command | Existing strict-plan, permission, workspace, hook, and handler-control suites verified | Validation-only: add, reorganize, or recast no shared control test or implementation | Exact command result; repeated by 14.6 |
| Task 12 | Module prescribed document, schema, definition, form, route, prompt, completion, and registration tests | `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectDocument.test.ts`<br>`src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectToolSchemas.test.ts`<br>`src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectWorkflow.test.ts` | Exact builders/headings, shared tool schemas, definition/forms/routes/prompts/completion/registry | Chai/Mocha, registered-tool lookup, prompt renderer, registry, and decision-tree contracts verified | Use invariant/negative assertions; copy no shared tool prose or monolithic editable prompt | 12.10; 14.1 |
| 12.1 | Module Initial Document Builders and Source Independence tests | `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectDocument.test.ts` | Exact 19 heading constants, two ordered heading inventories, both builders, full Appendix A outputs, and nine-entry forbidden-source inventory | Module test directory absence and Chai exact-string/finite-absence assertions verified | Create only the prescribed test directory/file; assert final newline and every exact forbidden entry; add no fs mock | 12.10; 14.1; 15.2-15.3 |
| 12.2 | Module Exact Per-Turn Tool Schema tests | `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectToolSchemas.test.ts` | Exact imports, `expectedSharedToolSpecs`, four builders, and 11 ids/names/configs | Registered Native GPT-5 lookup and shared missing-schema error verified | Deep-equal registered configs; copy no description, parameters, requirements, or context | 12.10; 14.1 |
| 12.3 | Main FR-15g-h; model-facing negative coverage | `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectToolSchemas.test.ts` | Exact ordered 40-name forbidden array and exact projected response-tool positions | Live `ClineDefaultTool` inventory, projected names, and registered configs verified | Keep test inventory file-local; add no production export or copied tool prose | 12.10; 13.2; 14.1; 15.4 |
| 12.4 | Module Definition/Metadata/Artifact/Prerequisite tests | `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectWorkflow.test.ts` | Exact imports, five typed helpers, base session/prompt input, identity/persona/28 values/fixed project/artifacts/ordered prerequisites | Registry, prompt-template, runtime type, and route-evaluation contracts verified | Exact internal test guards only; assert no AI writes, child inheritance, `.md` alias, or retired property | 12.10; 14.1 |
| 12.5 | Module Workflow Form tests | `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectWorkflow.test.ts` | Both complete forms, exact transitions/options/cardinality, and absence assertions | Shared default cardinality and form payload shapes verified | No extra optional copy, Boolean labels, field properties, or actions | 12.10; 14.1 |
| 12.6 | Main FR-20p8/e, FR-29b2; module Steps 1-3 and Failure tests | `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectWorkflow.test.ts` | All matrix states, exact padded-`found` rejection, derivation failure, exact atomic Boolean map, absent persistence-failure mapping, exact branches/routes/predicates/actions/following sources, route-exclusivity tables, and seven messages | Decision-tree, deterministic-result, raw path-state, shared deterministic persistence, and source-route contracts verified | Prove exactly one match per valid/invalid evaluation; add no overlapping fallback; duplicate no shared-runtime persistence coverage | 12.10; 14.1 |
| 12.7 | Main FR-14h, FR-15; module Step 4 prompt invariants | `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectWorkflow.test.ts` | Guarded/destructured 13-template inventory; five exact section variants; 14 raw placeholders; file-local 40-name and 12-marker inventories; token/key and direct prompt/tool correlation; complete typed fail-closed matrix including exact padded objectives | Shared prompt renderer, optional `promptTemplates`, exact Subtask 8.16 required-value/objective sets, and Step 4 schema builders verified | No monolithic editable prompt snapshot or objective normalization; preserve required source anomalies; forbid source delimiters and all 40 unprojected names | 12.10; 13.1-13.2; 14.1; 14.3 |
| 12.8 | Main FR-29b2; module Prompt/Tool/Completion tests | `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectWorkflow.test.ts` | Complementary Step 4 valid/invalid routes, `project_prompt`, exact completion event, empty Steps 1-3, exact Step 4 schema/templates, direct referenced-tool membership, and absent wrappers/rules | Runtime prompt, event/action, route-exclusivity, and tool-projection shapes verified | No overlapping `always` fallback; failures/unrelated tools remain incomplete; Task 10.10 owns teardown | 12.10; 13.1-13.2; 14.1; 14.3 |
| 12.9 | Main FR-1-5i; module registration tests | `src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectWorkflow.test.ts` | Name, slash-command, and use-skill resolution plus negative `.md` alias | Three registry resolution functions verified | Add no alias or duplicate registration | 12.10; 13.3-13.4; 14.1; 14.4 |
| 12.10 | Module required focused validation | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact three-path module test command | Script and all three test paths verified | Command-only; no implicit repair | Exact command result; repeated by 14.1 |
| Task 13 | Main FR-1-5i, FR-14h/15, FR-31-38, FR-53/55/57; module prompt/tool/activation coverage | `src/core/prompts/system-prompt/__tests__/integration.test.ts`<br>`src/core/slash-commands/__tests__/index.test.ts`<br>`src/test/slash-commands.test.ts` | Full/continuation prompt projection, exact tool override, persona gate, canonical activation, and shipped command | Existing integration, native-tool, response-tool, and slash-command harnesses verified | No system-instructions carrier, editable prompt snapshot, alias, source leakage, or unprojected tool reference | 13.5; 14.3-14.4 |
| 13.1 | Main FR-31-38; module prompt and exact tool projection | `src/core/prompts/system-prompt/__tests__/integration.test.ts` | Exact module import; supplied-value step/session/context helpers; exact required-projection interface and narrowing helper; Steps 1-3 identity, definition-owned description projection, exact four-line checklist/statuses, shared wrappers, and empty overrides; true/true plus false/false Update Existing Documents Step 4 projections in both input blocks; `apiRequestCount` 1/2 persona gate; exact 11 tools | Existing `baseContext`, registered definition, projection builder's three possibly undefined fields, `ClineToolSpec`, `runPromptTest(...)`, native-tool, and response-tool helpers verified | Narrow every context before payload/string/schema use; add no workflow-specific system-instructions carrier; empty overrides must not fall back; snapshot no editable prompt prose | 13.5; 14.3 |
| 13.2 | Main FR-14h, FR-15; module prompt/tool negative coverage | `src/core/prompts/system-prompt/__tests__/integration.test.ts` | Exact file-local 40-name, 14-placeholder, and 12-marker arrays; key-bearing bare-reference and example-delimiter regexes; narrowed projected/payload absence; case-specific true/true and false/false prompt/tool correlation; shared-system source-leak checks | Both narrowed input payload slots, generated system prompt, projected schema, and unchanged shared Native GPT-5 guidance verified | Apply the 40-name inventory only to module payload/schema, not shared system guidance; import no cross-test inventory; export no production test data; reject raw tokens, key-bearing bare refs, and legacy/source markers without rejecting source-prescribed sentence punctuation | 13.5; 14.3; 15.2-15.4 |
| 13.3 | Main FR-1-5i; canonical slash activation | `src/core/slash-commands/__tests__/index.test.ts` | Positive `/document-project` and negative `/document-project.md` assertions | Existing slash activation resolver/harness verified | Add no alias; preserve existing activation assertions | 13.5; 14.4 |
| 13.4 | Main FR-1-5i; shipped command registration | `src/test/slash-commands.test.ts` | Exactly one custom CLI-compatible `document-project` entry with exact existing description | Existing shipped/built-in command-list assertions verified | Preserve every existing workflow and built-in command assertion | 13.5; 14.4 |
| 13.5 | Module required prompt and activation validation | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Two exact focused test commands | Repo script and all three test paths verified | Command-only; no implicit repair | Exact command results; repeated by 14.3-14.4 |
| Task 14 | Module Required Validation; Main OR-2; Action Plan Guide Step 7 | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact focused suites, direct migration regressions, shared regression gates, typecheck, lint, package, and generated-diff guard | All npm scripts and command paths verified | Generated/build paths are command-owned side effects only; never edit them manually or accept tracked fallout implicitly | 14.1-14.9 command results |
| 14.1 | Module focused module validation | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact three Document Project test arguments | `npm run test:unit --` and all paths verified | Command-only; no repair beyond runner outputs | Exact command result |
| 14.2 | Module focused runtime/scanner/document-handler validation | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact runtime, prerequisite scanner, and build-handler test arguments | All three focused suites and script verified | Command-only; no implicit fix | Exact command result |
| 14.3 | Main FR-31-38; prompt integration validation | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact system-prompt integration test argument | Integration suite and script verified | Command-only | Exact command result |
| 14.4 | Main FR-1-5i; slash/registration validation | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact core and shipped slash-test arguments | Both slash suites and script verified | Command-only | Exact command result |
| 14.5 | Main compile-safe contract migration regressions | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact 16 directly migrated module workflow-test arguments | Every path corresponds to a Task 2 definition/fixture cutover | Command-only; omit or substitute no suite | Exact command result |
| 14.6 | Main directly touched and shared-capability regressions | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact directly touched metadata/fixture/handler/document/tool-schema paths plus existing shared execution-control suites | Every directly touched path and every shared validation-only suite verified | Do not edit the shared regression suites or rely on typecheck in place of tests | Exact command result |
| 14.7 | Main OR-2; type safety | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`<br>command-owned: `src/shared/proto/**/*`, `src/generated/**/*`, `src/core/controller/**/*`, `src/hosts/**/*`, `webview-ui/src/services/grpc-client.ts`, `dist-standalone/proto/descriptor_set.pb` | Elevated `npm run check-types`; implicit `npm run protos`; proto/host-probing fallback; exact tracked-generated diff guard | Repo script chain, fallback, and generated-output paths verified | Edit no generated path manually; run the guard after success or failure; accept, repair, stage, or revert no generated fallout implicitly | Typecheck result plus exact `git diff --exit-code` result |
| 14.8 | Main OR-2; lint gate | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | `npm run lint` | Repo lint script verified | Command-only; silently reformat no out-of-scope file | Exact command result |
| 14.9 | Main OR-2; package/build gate | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md`<br>command-owned: `src/shared/proto/**/*`, `src/generated/**/*`, `src/core/controller/**/*`, `src/hosts/**/*`, `webview-ui/src/services/grpc-client.ts`, `dist-standalone/proto/descriptor_set.pb`, `webview-ui/build/**/*`, `dist/**/*` | Elevated `npm run package`, implicit check-types/protos, proto/host-probing fallback, and exact tracked-generated diff guard | Package script chain, fallback, and ignored build outputs verified | Run the guard after success or failure; stop on tracked generated/formatter diff; accept, repair, stage, or revert nothing implicitly | Package result plus exact `git diff --exit-code` result |
| Task 15 | Module Source Independence and Tool Schema restrictions; Action Plan Guide Steps 6-7 | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Five exact `rg`/git static guard groups | Repo-supported `rg`, git pathspecs, runtime root, and schema path verified | Guards cover only approved retired/dependency/tool/scope risks; edit no file | 15.1-15.5 command output |
| 15.1 | Main FR-12b2-b3; retired-field guard | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact production `rg` for word-boundary `projectSubfolder` | Glob exclusions and non-match with `projectSubfolderSegments` verified | Require zero production matches; remove no valid segment field | Exact zero-match result |
| 15.2 | Main FR-53/55/57; source independence guard | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact whole-runtime `rg` for source/BMAD/placeholder dependencies | `src/core/task/workflow-runtime` production scope and protected source paths verified | Require zero matches; alter no protected source or BMAD file | Exact zero-match result |
| 15.3 | Main FR-14/20/53; forbidden module implementation guard | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact `rg` alternatives for fs, replacement, retired form/event/state/placement concepts | Word-boundary and test exclusions verified | Require zero production matches while retaining `projectSubfolderSegments` | Exact zero-match result |
| 15.4 | Main FR-15g-h; forbidden Step 4 tool guard | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact 38 enum-id alternatives plus complete 40 string-name alternatives | Live enum inventory and Subtasks 12.3/13.2 verified | Require zero matches; weaken no regex and add no local alias | Exact zero-match result |
| 15.5 | Scope protection; module Source Independence | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Unstaged, staged, and untracked checks for `.cline/skills/bmad-document-project` | Protected package path verified | All three outputs empty; do not edit, revert, or stage the package | Exact three command results |
| Task 16 | Main OR-1/OR-1a/OR-2; Action Plan Guide Steps 7-9 | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Unstaged, staged, and untracked scope; protected hashes; both-guide audit; and per-row completeness | Guides, allowed-file sets, protected baseline, and plan structure verified | Stop on scope/hash/contract drift; never infer, revert, or broaden scope | 16.1-16.6 command/manual audit results |
| 16.1 | Action Plan Guide Step 7 unstaged scope diff | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | `git diff --name-only` | Repo root and unstaged tracked-diff command verified | Review every returned path; perform no implicit cleanup | Exact command output checked against allowed files |
| 16.2 | Action Plan Guide Step 7 staged scope diff | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | `git diff --cached --name-only` | Repo root and staged-diff command verified | Review every returned path; perform no implicit cleanup | Exact command output checked against allowed files |
| 16.3 | Action Plan Guide Step 7 untracked scope | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | `git ls-files --others --exclude-standard` | Repo root and untracked-file command verified | Review every returned path; delete nothing implicitly | Exact command output checked against allowed files |
| 16.4 | Protected governing-document baseline | Read-only: `docs/workflows/workflow-runtime/workflow-modules/document-project/document-project.md`<br>`docs/workflows/workflow-runtime/workflow-modules/document-project/document-project-requirements.md`<br>`docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md`<br>`docs/workflows/workflow-runtime/requirements.md`<br>`docs/workflows/workflow-runtime/architecture.md`<br>checkbox target: `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Exact five-file SHA-256 command/baseline and reconciliation across unstaged, staged, and untracked scope | Protected-document hashes and allowed-file sets verified | Stop on any hash mismatch; edit/revert no protected file; map every other diff path to its prescribing task | Byte-for-byte hash equality plus scope reconciliation |
| 16.5 | Action Plan Guide Step 9; module build guide compliance | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Full line-by-line requirements, method, compile, import, type, fixture, action, event, assertion, copy, cleanup, and choice audit | Both `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` and `docs/action-plan-guide.md` verified as audit inputs | Rewrite deficient plan text only with authority; do not declare completion while inference remains | Recorded line-by-line audit result |
| 16.6 | Action Plan Guide Steps 5, 6, and 8 | `docs/workflows/workflow-runtime/workflow-modules/document-project/action-plan.md` | Every Task 1-16 and Subtask 1.1-16.6 checkbox, inherited allowed files, exact target, cleanup, and validation row | Plan numbering, allowed-files lists, and matrix contract verified | Stop on changed requirement/live contract; no implementation improvisation | Complete row-by-row compliance review |
