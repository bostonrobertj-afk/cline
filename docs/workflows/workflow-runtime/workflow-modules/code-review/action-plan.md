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

This plan builds and registers the product-owned `code-review` workflow module described by [code-review-requirements.md](./code-review-requirements.md).

The module reviews a completed dev-story commit, prepares review artifacts, dispatches specialist review subagents, consolidates findings with the governed `record_findings` tool, and creates a remediation story when findings require follow-up work.

Approved implementation decisions:

- The runtime artifact registry owns canonical filename rules globally, including child review output artifact families.
- The code-review workflow module owns only `code_review_output`, `review_scope_manifest`, and generated `remediation_story` creation.
- The code-review workflow locates `blind-review-{target}.md` and `edge-case-hunter-{target}.md` as existing child outputs; it does not allocate, initialize, or own those artifacts.
- Code-review uses dedicated internal artifact output workflow keys for each artifact it creates, while `code_review_output`, `review_scope_manifest`, and `remediation_story` remain the model-relevant path values.
- `record_findings` appends each finding under each selected category heading using the exact approved markdown block format from the requirements.
- Step 2 missing or empty child output filenames are persisted as `missing_subagent_output_files` before the same step re-prompts.
- Step 4 findings evaluation persists `review_findings_present` and `upstream_findings_present` before route selection.
- Prompt tests must assert behavior, structure, non-empty prompt projection, required markers, and forbidden legacy values. They must not assert full editable prompt prose.

Sibling-pattern audit summary:

- Foundational artifact support touches `artifactFamilies.ts`, `types.ts`, `WorkflowRuntime.ts`, and `WorkflowRuntime.test.ts`.
- `record_findings` touches the shared tool enum, assistant-message parameter inventory, backend workflow tool contracts, response-tool metadata, tool executor wiring, handler implementation, and handler tests.
- Retiring `code_review_spec_update` touches the shared tool enum, backend contracts, response metadata, tool executor wiring, legacy handler files, legacy tests, native tool parity tests, and prompt integration tests.
- The code-review workflow module follows the current module pattern under `src/core/task/workflow-runtime/workflow-modules/{workflowId}` with module-owned workflow definition, tool schemas, helpers, tests, exports, registry wiring, and prompt-projection tests.
- Legacy `.cline/skills/bmad-code-review/**/*` files are deleted only after the runtime module and registration are complete.

## Scope Boundary

- Do not edit `/Users/robertboston/Documents/Cline/Workflows/code-review.md`.
- Do not implement the child `blind-review` or `review-edge-case-hunter` workflows.
- Do not make the code-review module create, initialize, or own `blind_review_output` or `edge_case_review_output`.
- Do not preserve `Review-input-{target}.md`, `Review-input-{target}.diff`, `Review-blind-hunter-{target}.md`, `Review-edge-case-hunter-{target}.md`, `Adversarial-review-{target}.md`, `review_input_markdown`, `review_input_diff`, `review_blind_hunter`, `review_edge_case_hunter`, or `adversarial_review` as canonical runtime artifact families.
- Do not expose `record_findings` outside Step 3.
- Do not expose `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `plan_remediation_story_artifact`, `update_story_index_status`, `move_workflow_project_file`, retired code-review tools, or other backend-only runtime tools to the AI model.
- Do not preserve `code-review.md` as a workflow name, slash command, or skill alias.
- Do not read `/Users/robertboston/Documents/Cline/Workflows/code-review.md`, `_bmad/bmm/agents/quality-control.md`, or `.cline/skills/bmad-code-review/**/*` at runtime.
- Do not add exact full-prose assertions for editable prompt text.
- Do not modify shared project-selection behavior or implement target story selection as a module-owned selector form.

## Known Issues / Risks / Technical Debt

- Existing runtime artifact families still contain legacy review artifact names and filename patterns. Phase 1 replaces them before the code-review module references the new families.
- Existing `code_review_spec_update` is a legacy standalone completion surface. Phase 2 removes it rather than remapping it to new behavior.
- Review-scope preparation needs read-only Git inspection. This plan implements that as module-owned deterministic helper logic using `git show` with `shell: false`; if implementation discovers a need to mutate Git state or change command approval policy, stop and ask the user.
- The runtime artifact allocator can create the remediation story file, but remediation story index planning remains an existing backend-only tool-backed operation. Step 4 must derive `remediation_story_parent_identity` before invoking that operation so primary-story and remediation-story targets both create the next remediation story under the primary parent story.

## Tasks / Subtasks

### Phase 1 - Runtime Review Artifact Families

After completing this phase, pause for QA review before moving to Phase 2.

[x] Task 1. Replace legacy runtime review artifact families with the current review artifact families.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 1.1. In `artifactFamilies.ts`, replace the enum members `ReviewBlindHunter`, `ReviewEdgeCaseHunter`, `AdversarialReview`, `ReviewInputMarkdown`, and `ReviewInputDiff` with exactly `BlindReviewOutput = "blind_review_output"`, `EdgeCaseReviewOutput = "edge_case_review_output"`, `CodeReviewOutput = "code_review_output"`, and `ReviewScopeManifest = "review_scope_manifest"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`

[x] Subtask 1.2. In `artifactFamilies.ts`, update `WorkflowTargetDerivedArtifactFamilyDefinition.family` so the target-derived union contains only `BlindReviewOutput`, `EdgeCaseReviewOutput`, `CodeReviewOutput`, and `ReviewScopeManifest`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`

[x] Subtask 1.3. In `artifactFamilies.ts`, replace the five legacy target-derived registry entries with four entries whose filename patterns and discovery patterns are exactly `blind-review-{target}.md` with `/^blind-review-(\d+-\d+(?:-\d+)?)\.md$/`, `edge-case-hunter-{target}.md` with `/^edge-case-hunter-(\d+-\d+(?:-\d+)?)\.md$/`, `code-review-{target}.md` with `/^code-review-(\d+-\d+(?:-\d+)?)\.md$/`, and `review-scope-{target}.md` with `/^review-scope-(\d+-\d+(?:-\d+)?)\.md$/`; each entry must keep `allocationMode: "derived_from_target"`, `identityRequirement: "target_story_or_remediation_story"`, `fileExtension: ".md"`, `contentKind: "markdown"`, and `numberingScope: "target_identity"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`

[x] Subtask 1.4. In `artifactFamilies.ts`, remove `.diff` from `WorkflowArtifactFileExtension` and remove `"diff"` from `WorkflowArtifactContentKind` after confirming no surviving runtime artifact family uses diff content.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`

[x] Subtask 1.5. In `types.ts`, update the `WorkflowArtifactDefinition` target-derived family union so it contains only `WorkflowArtifactFamily.BlindReviewOutput`, `WorkflowArtifactFamily.EdgeCaseReviewOutput`, `WorkflowArtifactFamily.CodeReviewOutput`, and `WorkflowArtifactFamily.ReviewScopeManifest`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`

[x] Subtask 1.6. In `WorkflowRuntime.ts`, update `resolveWorkflowArtifactIdentity(...)` target-derived cases so the branch handles only `BlindReviewOutput`, `EdgeCaseReviewOutput`, `CodeReviewOutput`, and `ReviewScopeManifest`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 1.7. In `WorkflowRuntime.ts`, update `parseWorkflowArtifactFilenameIdentity(...)` target-derived cases so the branch handles only `BlindReviewOutput`, `EdgeCaseReviewOutput`, `CodeReviewOutput`, and `ReviewScopeManifest`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 1.8. In `WorkflowRuntime.ts`, replace the legacy review artifact alias regex in `normalizeWorkflowArtifactIdentityInput(...)` with `/^(?:blind-review|edge-case-hunter|code-review|review-scope)-(\d+-\d+(?:-\d+)?)\.md$/`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 1.9. In `WorkflowRuntime.test.ts`, update target-derived artifact allocation tests to create and assert only `blind-review-1-1-1.md`, `edge-case-hunter-1-1-1.md`, `code-review-1-1-1.md`, and `review-scope-1-1-1.md`; remove the old `Review-blind-hunter`, `Review-edge-case-hunter`, `Adversarial-review`, `Review-input` markdown, and `Review-input` diff expectations from active runtime artifact tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 1.10. In `WorkflowRuntime.test.ts`, update invalid or missing target-derived artifact tests that reference `WorkflowArtifactFamily.AdversarialReview` or other retired review families to use `WorkflowArtifactFamily.CodeReviewOutput` and the current `code-review-{target}.md` naming pattern.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 1.11. In `WorkflowRuntime.test.ts`, add negative assertions proving `Review-input-1-1.md`, `Review-input-1-1.diff`, `Review-blind-hunter-1-1.md`, `Review-edge-case-hunter-1-1.md`, and `Adversarial-review-1-1.md` no longer normalize as current target-derived review artifact filenames.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 1.12. In `WorkflowRuntime.ts`, update project-wide artifact discovery so `WorkflowArtifactFamily.Story` and `WorkflowArtifactFamily.RemediationStory` discovery includes immediate files under `implementation/drafts`, `implementation/stories-backlog`, `implementation/stories-review`, and `implementation/stories-complete` in addition to the existing project subfolder scan; keep non-story artifact discovery unchanged.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`

[x] Subtask 1.13. In `WorkflowRuntime.test.ts`, add coverage proving target-derived `code_review_output` allocation accepts an existing target story file in `implementation/stories-review` and an existing remediation story file in `implementation/stories-review`, and still rejects a target identity when no matching story or remediation-story file exists in any implementation story child folder.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Subtask 1.14. In `WorkflowRuntime.test.ts`, add coverage proving new story and remediation-story artifact allocation considers existing `Story-{E}-{S}.md` and `Remediation-story-{E}-{S}-{R}.md` files in `implementation/drafts`, `implementation/stories-backlog`, `implementation/stories-review`, and `implementation/stories-complete` so moved story files cannot cause duplicate story or remediation-story identities.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

[x] Task 2. Validate Phase 1.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 2.1. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`; if generated proto files are missing, run `npm run protos` and rerun the exact failed test command before reporting the result.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 2.2. Run `npm run check-types`; if it fails during proto host probing, rerun with the approved elevated path and stop on the first non-environment TypeScript failure.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 2.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 2.4. Run `rg -n "ReviewBlindHunter|ReviewEdgeCaseHunter|AdversarialReview|ReviewInputMarkdown|ReviewInputDiff|Review-blind-hunter|Review-edge-case-hunter|Adversarial-review|Review-input|review_blind_hunter|review_edge_case_hunter|adversarial_review|review_input_markdown|review_input_diff" src/core/task/workflow-runtime`; inspect any hits in context and stop if any hit is active runtime code instead of an explicit negative test assertion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

### Phase 2 - `record_findings` Tool And Retired Code-Review Tool Cleanup

After completing this phase, pause for QA review before moving to Phase 3.

[x] Task 3. Add the shared `record_findings` tool contract and remove the retired `code_review_spec_update` contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 3.1. In `tools.ts`, delete `ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE` and add `ClineDefaultTool.RECORD_FINDINGS = "record_findings"` in the workflow-tool group.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[x] Subtask 3.2. In `tools.ts`, keep `record_findings` out of `READ_ONLY_TOOLS` because it mutates the findings document.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[x] Subtask 3.3. In `assistant-message/index.ts`, add `"findings"` to `toolParamNames`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`

[x] Subtask 3.4. In `backendWorkflowToolContracts.ts`, delete the `CODE_REVIEW_SPEC_UPDATE` contract entry and add a `RECORD_FINDINGS` contract entry named `record_findings` with one required `findings` array parameter whose items are objects with required `finding`, `categories`, and `description` fields; `finding` and `description` are strings, and `categories` is an array of strings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`

[x] Subtask 3.5. In `ResponseToolRegistry.ts`, delete the `CODE_REVIEW_SPEC_UPDATE` metadata entry and add `[ClineDefaultTool.RECORD_FINDINGS]: undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

[x] Subtask 3.6. In `workflow-runtime-metadata.test.ts`, add assertions that `getBackendWorkflowToolContract(ClineDefaultTool.RECORD_FINDINGS)` returns the `record_findings` contract with a required `findings` parameter, and that `ResponseToolRegistry.get(ClineDefaultTool.RECORD_FINDINGS)` and `ResponseToolRegistry.isResponseTool(ClineDefaultTool.RECORD_FINDINGS)` identify it as a non-response tool.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[x] Subtask 3.7. In `ResponseToolRuntime.test.ts`, add `ClineDefaultTool.RECORD_FINDINGS` to the non-response workflow tool assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`

[x] Task 4. Implement `RecordFindingsToolHandler`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/RecordFindingsToolHandler.test.ts`

[x] Subtask 4.1. Add `RecordFindingsToolHandler.ts` with `readonly name = ClineDefaultTool.RECORD_FINDINGS`, a constructor accepting `ToolValidator`, and `getDescription(...)` returning `[record_findings]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[x] Subtask 4.2. In `RecordFindingsToolHandler.ts`, add typed parser helpers that read only the `findings` param, accept either a JSON string or a materialized value, reject unsupported top-level params, and narrow to `readonly CodeReviewFindingRequest[]` without `any` or forced assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[x] Subtask 4.3. In `RecordFindingsToolHandler.ts`, model categories with an enum or literal union containing exactly `task_failure`, `dev_agent_failure`, and `upstream_failure`, and map those values to exactly `## Task Failures`, `## Dev Agent Failures`, and `## Upstream Failures`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[x] Subtask 4.4. In `RecordFindingsToolHandler.ts`, resolve the target file from `config.taskState.activeWorkflowSession.workflowValues.code_review_output`, require `activeWorkflowName === "code-review"`, require a non-empty string path, and reject calls that do not have an active code-review workflow session.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[x] Subtask 4.5. In `RecordFindingsToolHandler.ts`, validate the resolved `code_review_output` path with `ToolValidator.checkClineIgnorePath(...)`, read the existing document, require all three headings to exist, and fail without mutation when any path, read, or heading validation fails.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[x] Subtask 4.6. In `RecordFindingsToolHandler.ts`, implement append-only markdown updates so each finding is appended below each selected category heading in exactly this shape: `### {finding}`, blank line, `{description}`; preserve heading order and existing content.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[x] Subtask 4.7. In `RecordFindingsToolHandler.ts`, return success without file write when `findings` is an empty array; the result JSON must report `recordedFindingCount: 0` and `updatedHeadings: []`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[x] Subtask 4.8. In `RecordFindingsToolHandler.ts`, for non-empty successful writes, use the existing approval/path policy pattern from `UpsertEpicToolHandler`, atomically replace the document, clear the file-read cache for the findings path, set `didEditFile`, reset `consecutiveMistakeCount`, and return JSON with exactly `recordedFindingCount` and `updatedHeadings`; do not return raw document content.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[x] Subtask 4.9. Add `RecordFindingsToolHandler.test.ts` covering active workflow gating, missing `code_review_output`, blocked path, missing file, missing headings, unsupported category, malformed finding entries, empty-array no-op success, single-category append, multi-category duplication, append-only preservation, exact result keys, and absence of raw document content; build fixtures with explicit helper return types and use JSON-string params for `findings`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/RecordFindingsToolHandler.test.ts`

[x] Task 5. Wire `record_findings` and delete retired `code_review_spec_update` runtime surfaces.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/codeReviewSpecUpdateMerge.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/codeReviewSpecUpdateMerge.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts`

[x] Subtask 5.1. In `ToolExecutorCoordinator.ts`, delete the `CodeReviewSpecUpdateToolHandler` import and `CODE_REVIEW_SPEC_UPDATE` map entry, import `RecordFindingsToolHandler`, and register `[ClineDefaultTool.RECORD_FINDINGS]: (v: ToolValidator) => new RecordFindingsToolHandler(v)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

[x] Subtask 5.2. Delete `CodeReviewSpecUpdateToolHandler.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts`

[x] Subtask 5.3. Delete `codeReviewSpecUpdateMerge.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/codeReviewSpecUpdateMerge.ts`

[x] Subtask 5.4. Delete `codeReviewSpecUpdateMerge.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/codeReviewSpecUpdateMerge.test.ts`

[x] Subtask 5.5. In `ToolExecutor.nativeToolParity.test.ts`, remove `CODE_REVIEW_SPEC_UPDATE` executions and replace the surviving parity assertions with `ClineDefaultTool.RECORD_FINDINGS` handler registration checks where a real execution would require an active workflow session; use raw string lookup APIs for deleted `code_review_spec_update` absence checks rather than constructing a `ToolUse` with a deleted enum member.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts`

[x] Task 6. Validate Phase 2.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 6.1. Run `npm run test:unit -- src/core/task/tools/handlers/__tests__/RecordFindingsToolHandler.test.ts src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 6.2. Run `npm run check-types`; if it fails during proto host probing, rerun with the approved elevated path and stop on the first non-environment TypeScript failure.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 6.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 6.4. Run `rg -n "code_review_spec_update|CODE_REVIEW_SPEC_UPDATE|CodeReviewSpecUpdateToolHandler|codeReviewSpecUpdateMerge" src/core src/shared`; inspect any hits in context and stop if any hit is active runtime code instead of an explicit negative test assertion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

### Phase 3 - Code-Review Module Definition, Review-Scope Builder, And Module Tests

After completing this phase, pause for QA review before moving to Phase 4.

[x] Task 7. Add module-owned tool schemas.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewToolSchemas.test.ts`

[x] Subtask 7.1. Create `codeReviewToolSchemas.ts` with named exported builders `buildCodeReviewStep1ToolSchemas`, `buildCodeReviewStep2ToolSchemas`, `buildCodeReviewStep3ToolSchemas`, and `buildCodeReviewStep4ToolSchemas`; Step 1 must return `[]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewToolSchemas.ts`

[x] Subtask 7.2. In `codeReviewToolSchemas.ts`, implement Step 2 schemas with exactly `use_subagents`, `send_user_message`, and `workflow_progress_request`, using `ModelFamily.NATIVE_GPT_5` and module-local schema builders.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewToolSchemas.ts`

[x] Subtask 7.3. In `codeReviewToolSchemas.ts`, implement Step 3 schemas with exactly `read_file`, `read_file_range`, `record_findings`, `send_user_message`, and `workflow_progress_request`, using the `record_findings` schema shape from the requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewToolSchemas.ts`

[x] Subtask 7.4. In `codeReviewToolSchemas.ts`, implement Step 4 schemas with exactly `read_file`, `read_file_range`, `apply_patch`, `ask_followup_question`, `send_user_message`, and `attempt_completion`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewToolSchemas.ts`

[x] Subtask 7.5. Add `codeReviewToolSchemas.test.ts` asserting exact tool names for each step, `record_findings` only in Step 3, `attempt_completion` only in Step 4, and absence of `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `plan_remediation_story_artifact`, `update_story_index_status`, `move_workflow_project_file`, and retired code-review tools from all step schemas.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewToolSchemas.test.ts`

[x] Task 8. Add review-scope manifest helper logic.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/reviewScopeManifest.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/reviewScopeManifest.test.ts`

[x] Subtask 8.1. In `reviewScopeManifest.ts`, define the exported review-scope types in this exact compile-safe shape: keep `ReviewScopeChangedFileStatus` as an enum with `Added = "added"`, `Modified = "modified"`, `Deleted = "deleted"`, `Renamed = "renamed"`, and `Copied = "copied"`; keep `ReviewScopeLineCount = number | "binary"`; define `ReviewScopeChangedFile` as a discriminated union with one branch whose `status` is `ReviewScopeChangedFileStatus.Added | ReviewScopeChangedFileStatus.Modified | ReviewScopeChangedFileStatus.Deleted`, `path: string`, `previousPath: undefined`, `additions: ReviewScopeLineCount`, `deletions: ReviewScopeLineCount`, and `allowedFileComparison: ReviewScopeAllowedFileComparisonKind`, and one branch whose `status` is `ReviewScopeChangedFileStatus.Renamed | ReviewScopeChangedFileStatus.Copied`, `path: string`, `previousPath: string`, `additions: ReviewScopeLineCount`, `deletions: ReviewScopeLineCount`, and `allowedFileComparison: ReviewScopeAllowedFileComparisonKind`; define `ReviewScopeNameStatusRecord` as the same path/previousPath union without line counts or allowed-file comparison; define `ReviewScopeNumstatRecord` separately as an interface with only `path: string`, `previousPath: string | undefined`, `additions: ReviewScopeLineCount`, and `deletions: ReviewScopeLineCount`; place the renamed/copied `ReviewScopeChangedFile` branch inside the `ReviewScopeChangedFile` union before `ReviewScopeNameStatusRecord`, not after `ReviewScopeNumstatRecord`; do not use `any`, forced assertions, or untyped object helpers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/reviewScopeManifest.ts`

[x] Subtask 8.2. In `reviewScopeManifest.ts`, add parser helpers for `git show --name-status <hash>` and `git show --numstat <hash>` output that support added, modified, deleted, renamed, and copied path records and return typed failures for malformed rows.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/reviewScopeManifest.ts`

[x] Subtask 8.3. In `reviewScopeManifest.ts`, add a builder that reads parsed story task/subtask and allowed-file data from the shared `storyTaskDocument` parser, compares committed paths against allowed files, and returns a typed manifest model without treating story tasks as proof of implementation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/reviewScopeManifest.ts`

[x] Subtask 8.4. In `reviewScopeManifest.ts`, add `buildReviewScopeManifestMarkdown(...)` that emits the exact required headings, source metadata lines, summary counts, changed-file table, review target commands, and approved suggested review strategy from the requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/reviewScopeManifest.ts`

[x] Subtask 8.5. Add `reviewScopeManifest.test.ts` covering name-status parsing, numstat parsing, deleted files, renamed files, allowed-vs-touched comparison, required heading order, changed-file table shape, source metadata lines, per-file `git show <hash> -- <path>` commands, and no whole-commit diff embedding.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/reviewScopeManifest.test.ts`

[x] Task 9. Add the code-review workflow definition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.1. Create `codeReviewWorkflow.ts` with exported identity constants exactly matching the requirements: name, slash command, use skill name, display name, description, project subfolder, and structured Fred quality-control persona.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.2. In `codeReviewWorkflow.ts`, add `CodeReviewWorkflowValueKey` enum and `CODE_REVIEW_WORKFLOW_VALUE_KEYS` containing every requirements value key, including the approved dedicated artifact metadata keys and `remediation_story_parent_identity`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.3. In `codeReviewWorkflow.ts`, add `CODE_REVIEW_ENTRY_PROJECT_VALUE_KEYS` mapping exactly `projectMode`, `projectTitle`, and `projectFolderName`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.4. In `codeReviewWorkflow.ts`, add the required `target_story` prerequisite with `producingWorkflowName: "dev-story"`, `projectSubfolderSegments: ["implementation", "stories-review"]`, naming pattern `/^(Story-\d+-\d+|Remediation-story-\d+-\d+-\d+)\.md$/`, workflow value key `target_story`, and `outputDocumentReference: "none"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.5. In `codeReviewWorkflow.ts`, add artifact definitions for `code_review_output` and `review_scope_manifest` using `WorkflowArtifactFamily.CodeReviewOutput` and `WorkflowArtifactFamily.ReviewScopeManifest`, `intentMode: "derived"`, `targetIdentitySource` from `selected_story_identity`, and the dedicated output value keys prescribed in the requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.6. In `codeReviewWorkflow.ts`, add the `remediation_story` artifact definition using `WorkflowArtifactFamily.RemediationStory`, `intentMode: "new"`, `parentIdentitySource` from `remediation_story_parent_identity`, and the dedicated remediation output value keys prescribed in the requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.7. In `codeReviewWorkflow.ts`, add the Step 1 workflow form with Panel A and Panel B exactly as prescribed, including Panel B same-session back navigation to Panel A. Panel A submit must be `runtime_routed`, and the commit hash field must not declare `workflowValueKey`; the validation route must read the field's form-session value and persist `review_commit_hash` only after Git validation succeeds.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.8. In `codeReviewWorkflow.ts`, add deterministic helpers that derive and validate `selected_story_filename`, `selected_story_identity`, `epic_identity`, `stories_index`, `review_folder`, `epics_document`, and `architecture_document` from the selected `target_story` and selected project root; failures must return typed deterministic failures with concrete messages.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.9. In `codeReviewWorkflow.ts`, add a read-only Git command runner helper for Step 1 using `execa("git", args, { cwd: selectedProjectRoot, shell: false, reject: false })`; commit validation must persist `review_commit_hash` and `review_commit_parent`, and review-scope document building must later collect name-status and numstat output using those persisted values. `runCodeReviewGitCommand(...)` must normalize Execa's optional `result.exitCode` into a concrete number before returning `CodeReviewGitCommandResult`; use `const exitCode = typeof result.exitCode === "number" ? result.exitCode : 1` and return that `exitCode` value.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.10. In `codeReviewWorkflow.ts`, add Step 1 decision routes in this order: resolve `target_story`; derive target/story/project values; allocate `code_review_output`; build the initial code-review output headings document; render Panel A; on Panel A submit validate the commit hash and persist `review_commit_hash` plus `review_commit_parent`; on invalid commit continue the same form session to Panel B; on valid commit allocate `review_scope_manifest`; build the review-scope document by collecting Git changed-file data and story context through the review-scope helper; transition to Step 2.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.11. In `codeReviewWorkflow.ts`, add Step 2 prompt building so it returns the initial Step 2 prompt when `missing_subagent_output_files` is empty or absent, and returns the exact missing-output prompt with the persisted filename list when `missing_subagent_output_files` contains values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.12. In `codeReviewWorkflow.ts`, add Step 2 decision routes so the entry route projects the prompt, `workflow_progress_request_confirmed` triggers child-output discovery, missing or empty child outputs persist `missing_subagent_output_files` and re-project Step 2, and both non-empty child outputs persist `blind_review_output` and `edge_case_review_output`, clear `missing_subagent_output_files`, and transition to Step 3.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.13. In `codeReviewWorkflow.ts`, add Step 3 prompt building and decision routes so the entry route projects the Step 3 prompt, and `workflow_progress_request_confirmed` transitions to Step 4.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.14. In `codeReviewWorkflow.ts`, add Step 4 findings evaluation helper that reads `code_review_output`, inspects only content under the three required headings, persists `review_findings_present` and `upstream_findings_present`, derives `remediation_story_parent_identity` as the first two identity segments for primary or remediation targets, and fails with a concrete terminal-error message if the findings document or selected identity is invalid.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.15. In `codeReviewWorkflow.ts`, add Step 4 decision routes so no findings routes through backend-only `update_story_index_status` for the selected target story with `storyIndexWorkflowValueKey: CodeReviewWorkflowValueKey.StoriesIndex`, `storyIdentityWorkflowValueKey: CodeReviewWorkflowValueKey.SelectedStoryIdentity`, `status: "complete"`, and `expectedCurrentStatus: "review"`, then through `move_project_file` from `["implementation", "stories-review"]` to `["implementation", "stories-complete"]` using `filenameWorkflowValueKey: CodeReviewWorkflowValueKey.SelectedStoryFilename`, then to `complete_workflow`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.16. In `codeReviewWorkflow.ts`, for every Step 4 tool-backed failure route, route through a `run_deterministic_procedure` terminal-failure helper that reads `session.branchContext.failureState?.terminalErrorMessage` and returns `{ kind: "failed", errorMessage }`; do not use static `terminal_error` strings that drop the backend failure reason.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.17. In `codeReviewWorkflow.ts`, add the Step 4 findings route through backend-only `plan_remediation_story_artifact` using `remediation_story_parent_identity`, `allocate_artifact` for `remediation_story`, `build_workflow_document` with the exact remediation shell headings, and then `project_prompt`; remediation story planning remains the only Step 4 story-index mutation before the model prompt because it appends the draft remediation story entry to the story index.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.18. In `codeReviewWorkflow.ts`, add Step 4 prompt construction so it always includes `Review the findings in code_review_output.`, includes the upstream-failure conditional block only when `upstream_findings_present === true`, includes the remediation-story conditional block only when `remediation_story` is a non-empty string, joins the selected Step 4 prompt sections into one string, and returns `currentStepInstructions: renderCodeReviewPromptTemplate(input, joinedPrompt)` so `code_review_output`, `architecture_document`, `epics_document`, `target_story`, and `remediation_story` placeholders are materialized before projection. `renderCodeReviewPromptTemplate(...)` must include `.replaceAll("code_review_output", renderWorkflowValueByKey(input, CodeReviewWorkflowValueKey.CodeReviewOutput))`. Route `attempt_completion_succeeded` through the same selected-target-story completion sequence as the no-findings route: backend-only `update_story_index_status` to `complete` with `expectedCurrentStatus: "review"`, `move_project_file` from `implementation/stories-review` to `implementation/stories-complete`, then `complete_workflow`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.19. In `codeReviewWorkflow.ts`, export `codeReviewWorkflowDefinition` with entry panel prompt equal to the module description, declared value keys, entry project keys, prerequisite files, artifacts, workflow form, and exactly four steps with the checklist labels from the requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[x] Subtask 9.20. Create `index.ts` exporting `codeReviewWorkflowDefinition`, value-key constants, artifact ids, form ids, panel ids, and tool-schema builders needed by tests and prompt integration.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/index.ts`

[x] Subtask 9.21. In `codeReviewWorkflow.test.ts`, revise the import block so `WorkflowArtifactFamily` imports from `../../../artifactFamilies`, workflow runtime types import from `../../../types`, `ClineDefaultTool` imports from `@/shared/tools`, shared workflow form types import from `@shared/ExtensionMessage`, and all code-review module exports used by the tests import from `..`; remove any `../../artifactFamilies` import.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.22. In `codeReviewWorkflow.test.ts`, add or revise the shared constant fixture block so it declares `PROJECT_ROOT`, `TARGET_STORY_PATH`, `STORIES_INDEX_PATH`, `REVIEW_FOLDER_PATH`, and `SAMPLE_WORKFLOW_VALUES: WorkflowValues`; `SAMPLE_WORKFLOW_VALUES` must include `target_story`, `selected_story_filename`, `selected_story_identity`, `epic_identity`, `stories_index`, `review_folder`, `epics_document`, `architecture_document`, `code_review_output`, `review_scope_manifest`, `review_commit_hash`, `review_commit_parent`, `blind_review_output`, `edge_case_review_output`, `remediation_story_parent_identity`, and `remediation_story` using `CodeReviewWorkflowValueKey`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.23. In `codeReviewWorkflow.test.ts`, add or revise `createSession(workflowValues: WorkflowValues, projectRoot = PROJECT_ROOT, branchContext: ActiveWorkflowSession["branchContext"] = { activeBranchId: "step-1-resolve-target-story" }): ActiveWorkflowSession` so the returned object includes `activeStepNumber: 1`, the provided `workflowValues`, complete `projectSelection`, `lifecycle.projectSelectionCompleted: true`, `entryArtifactResolution: undefined`, complete `ui` with `formSession`, `stepResolutionSession`, `suppressedWorkflowFormIds`, and `suppressedWorkflowStepResolutionRoutes`, and the provided `branchContext`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.24. In `codeReviewWorkflow.test.ts`, add or revise the workflow-definition lookup helpers with explicit return types: `getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition`, `findRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute`, `getWorkflowForm(workflowFormId: string): WorkflowFormDefinitionPayload`, `getPanel(form: WorkflowFormDefinitionPayload, panelId: string): WorkflowFormPanelDefinition`, and `getSingleField(panel: WorkflowFormPanelDefinition): WorkflowFormFieldDefinition`; each helper must throw a descriptive `Error` when the requested object is missing instead of returning `undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.25. In `codeReviewWorkflow.test.ts`, add or revise prompt and tool helper functions with explicit return types: `renderWorkflowValue(value: WorkflowValue): string`, `createPromptInput(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): WorkflowPromptBuilderInput`, `buildPrompt(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): string`, and `getToolNamesForStep(stepId: WorkflowStepDefinition["id"]): readonly string[]`; `buildPrompt` must throw when `currentStepInstructions` is `undefined` and prompt tests in this file must assert non-empty prompt output instead of exact editable prompt prose.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.26. In `codeReviewWorkflow.test.ts`, add or revise branch-event and action helper functions with exact typed shapes: `buildWorkflowFormPanelSubmittedEvent(...)` must return a `workflow_form_panel_submitted` event containing `workflowFormId`, `panelId`, `action`, `submittedValueKeys: []`, and `clearedValueKeys: []`; `buildToolBackedOperationSucceededEvent(...)` must return a `tool_backed_operation_succeeded` event with `sourceRoute`; `buildToolBackedOperationFailedEvent(...)` must return a `tool_backed_operation_failed` event with `sourceRoute` and `errorMessage`; `buildAttemptCompletionSucceededEvent()` must return `{ kind: "attempt_completion_succeeded" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.27. In `codeReviewWorkflow.test.ts`, add or revise assertion helpers with explicit return types: `expectActionKind<TKind extends WorkflowDecisionAction["kind"]>(...)` must narrow and return `Extract<WorkflowDecisionAction, { kind: TKind }>` after checking `action.kind`; `expectTransitionStepAction(...)`, `expectOnEventTrigger(...)`, `expectEventPredicateMatches(...)`, `expectSessionPredicateMatches(...)`, and `expectSucceeded(...)` must construct complete typed context objects and must not use `any`, `as any`, or incomplete route/event/session fixtures.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.28. In `codeReviewWorkflow.test.ts`, add or revise `createTargetStoryProject(): Promise<{ root: string; targetStory: string; storiesIndex: string; reviewFolder: string }>` so it creates a temporary selected project with `planning/Epics.md`, `planning/architecture.md`, `implementation/stories-review/Story-1-1.md`, `implementation/epic-1-stories.index.json` containing a matching `review` story entry, and a `review` folder; tests using this helper must remove the temp root in `finally`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.29. In `codeReviewWorkflow.test.ts`, add or revise the identity test so it asserts `codeReviewWorkflowDefinition` name, display name, description, slash command, use-skill name, project subfolder, persona, entry panel prompt, `workflowValueKeys`, and `entryProjectValueKeys` against the exported code-review constants.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.30. In `codeReviewWorkflow.test.ts`, add or revise the prerequisite and artifact declaration tests so the prerequisite equals `CODE_REVIEW_PREREQUISITE_FILES[CODE_REVIEW_TARGET_STORY_PREREQUISITE_ID]`, accepts `Story-1-1.md` and `Remediation-story-1-1-1.md`, and the artifact assertions verify the three artifact ids, each artifact family, intent mode, identity source, and output value keys using `WorkflowArtifactFamily` and `CodeReviewWorkflowValueKey`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.31. In `codeReviewWorkflow.test.ts`, add or revise the Step 1 workflow-form test so it asserts the form equals `buildCodeReviewStep1WorkflowForm()`, Panel A has the required title, prompt, submit action, `runtime_routed` transition, and `small_text` commit-hash field without `workflowValueKey`, and Panel B has the required invalid-commit title, prompt, no fields, back action label, and `backDestinationPanelId` pointing to Panel A.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.32. In `codeReviewWorkflow.test.ts`, add or revise the step label and tool-surface test so it asserts exact checklist labels for Steps 1-4, exact model-facing tool names for each step, and absence of `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `plan_remediation_story_artifact`, `update_story_index_status`, and `move_workflow_project_file` from all step tool schemas.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.33. In `codeReviewWorkflow.test.ts`, add or revise the Step 1 route-chain test so it asserts the exact route sequence from `resolve_prerequisite_files` through target derivation, code-review output allocation, initial output build, Panel A render, Panel A submit commit validation, invalid-commit `continue_workflow_form` to Panel B, valid-commit review-scope allocation, review-scope manifest build through `buildAndPersistReviewScopeManifest`, and transition to Step 2. Before asserting `renderFormAction.startPanelId`, narrow the `render_workflow_form` action variant with `"startPanelId" in renderFormAction`; throw a descriptive `Error` if the property is absent, then assert the narrowed `startPanelId` equals `CODE_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.34. In `codeReviewWorkflow.test.ts`, add or revise the Step 1 target-derivation helper test so it uses `createTargetStoryProject()`, runs `deriveCodeReviewTargetStoryValues(...)`, and asserts exact workflow value writes for `selected_story_filename`, `selected_story_identity`, `epic_identity`, `stories_index`, `review_folder`, `epics_document`, and `architecture_document`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.35. In `codeReviewWorkflow.test.ts`, add or revise Step 2 tests so child-output discovery first writes `missing_subagent_output_files` for missing outputs, then writes `blind_review_output`, `edge_case_review_output`, and clears `missing_subagent_output_files` after both files are non-empty; route tests must assert `workflow_progress_request_confirmed` triggers `discoverChildReviewOutputs`, ready state transitions to Step 3, missing state projects a prompt and returns to the progress-request branch, and prompt assertions must be limited to non-empty output plus materialized missing filenames rather than exact editable prompt prose.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.36. In `codeReviewWorkflow.test.ts`, add or revise Step 3 tests so the prompt builder returns a non-empty string with materialized `blind_review_output` and `edge_case_review_output` paths, and the route test asserts `workflow_progress_request_confirmed` transitions from Step 3 to Step 4.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.37. In `codeReviewWorkflow.test.ts`, add or revise the Step 4 findings-evaluation test so it writes a no-findings code-review output document and a findings document under the temp review folder, runs `evaluateCodeReviewFindings(...)` for each, and asserts exact workflow value writes for `review_findings_present`, `upstream_findings_present`, and `remediation_story_parent_identity`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.38. In `codeReviewWorkflow.test.ts`, add or revise the Step 4 no-findings route test so it asserts the findings-evaluation action, the no-findings `update_story_index_status` action with `stories_index`, `selected_story_identity`, `status: "complete"`, and `expectedCurrentStatus: "review"`, the selected-story `move_project_file` action from `implementation/stories-review` to `implementation/stories-complete`, and the final `complete_workflow` action.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.39. In `codeReviewWorkflow.test.ts`, add or revise the Step 4 findings route test so it asserts the findings route plans a remediation story through `PLAN_REMEDIATION_STORY_ARTIFACT`, allocates `CODE_REVIEW_REMEDIATION_STORY_ARTIFACT_ID`, builds `CODE_REVIEW_REMEDIATION_STORY_SHELL`, projects the Step 4 prompt, and waits for `attempt_completion_succeeded`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.40. In `codeReviewWorkflow.test.ts`, add or revise the Step 4 prompt test so it verifies the Step 4 prompt builder returns a non-empty string for no-upstream/no-remediation values, upstream-present values, and remediation-story values; verifies each Step 4 prompt includes the materialized `code_review_output` path and does not include the literal `code_review_output` placeholder; verifies materialized `remediation_story` appears only when the workflow value is non-empty; and does not assert exact editable Step 4 prompt prose.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.41. In `codeReviewWorkflow.test.ts`, add or revise the Step 4 backend-failure test so it creates a session with `branchContext.failureState.terminalErrorMessage`, asserts `failWithToolBackedOperationReason(...)` returns that concrete error message, and asserts every Step 4 tool-backed failure route uses `run_deterministic_procedure` with `failWithToolBackedOperationReason`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 9.42. In `codeReviewWorkflow.test.ts`, add or revise the Step 4 `attempt_completion_succeeded` route test so it asserts attempt completion triggers selected-story `update_story_index_status`, then selected-story `move_project_file`, then `complete_workflow`, using complete typed trigger events for each route.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Task 10. Validate Phase 3.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 10.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/reviewScopeManifest.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 10.2. Run `npm run check-types`; if it fails during proto host probing, rerun with the approved elevated path and stop on the first non-environment TypeScript failure.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 10.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

### Phase 4 - Registry And Prompt Projection Integration

After completing this phase, pause for QA review before moving to Phase 5.

[x] Task 11. Register the code-review workflow and add integration coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 11.1. In `WorkflowRegistry.ts`, add `import { codeReviewWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/code-review"` with the other shipped workflow imports, then append `codeReviewWorkflowDefinition` as the final entry in `shippedWorkflowDefinitions` after `piPlanningWorkflowDefinition`; do not reorder or rename any existing shipped workflow entry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[x] Subtask 11.2. In `codeReviewWorkflow.test.ts`, import `resolveWorkflowDefinition`, `resolveWorkflowBySlashCommand`, and `resolveWorkflowByUseSkillName` from `@/core/task/workflow-runtime/WorkflowRegistry`, then add one registry test that asserts `resolveWorkflowDefinition("code-review")`, `resolveWorkflowBySlashCommand("code-review")`, and `resolveWorkflowByUseSkillName("code-review")` each return `codeReviewWorkflowDefinition`, and asserts `resolveWorkflowDefinition("code-review.md")`, `resolveWorkflowBySlashCommand("code-review.md")`, and `resolveWorkflowByUseSkillName("code-review.md")` each return `undefined`; do not construct malformed workflow names through casts because `WorkflowName` is currently `string`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[x] Subtask 11.3. In `integration.test.ts`, add code-review prompt-projection imports: import `CodeReviewWorkflowValueKey` and `codeReviewWorkflowDefinition` from `@/core/task/workflow-runtime/workflow-modules/code-review`, and import `buildCodeReviewStep2ToolSchemas`, `buildCodeReviewStep3ToolSchemas`, and `buildCodeReviewStep4ToolSchemas` from `@/core/task/workflow-runtime/workflow-modules/code-review/codeReviewToolSchemas`; keep these imports near the existing workflow-module imports.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 11.4. In `integration.test.ts`, add code-review prompt fixture constants and helper functions near the existing dev-story and pi-planning prompt fixtures: define `type CodeReviewPromptStepNumber = 2 | 3 | 4`; define constants for `target_story`, `selected_story_identity`, `selected_story_filename`, `stories_index`, `review_folder`, `epics_document`, `architecture_document`, `code_review_output`, `review_scope_manifest`, `blind_review_output`, `edge_case_review_output`, `review_commit_hash`, `review_commit_parent`, and `remediation_story`; define `getCodeReviewEntryBranchId(activeStepNumber: CodeReviewPromptStepNumber): string` with explicit switch cases `2`, `3`, and `4` returning `codeReviewWorkflowDefinition.steps["step-2"].decisionTree.entryBranchId`, `codeReviewWorkflowDefinition.steps["step-3"].decisionTree.entryBranchId`, and `codeReviewWorkflowDefinition.steps["step-4"].decisionTree.entryBranchId`, followed by a `const unreachableActiveStepNumber: never = activeStepNumber` exhaustiveness assignment; define `createCodeReviewWorkflowValues(overrides: WorkflowValues = {}): WorkflowValues` returning a full baseline `WorkflowValues` object keyed by `CodeReviewWorkflowValueKey` plus `...overrides`; define `createCodeReviewWorkflowSession(activeStepNumber: CodeReviewPromptStepNumber, workflowValues: WorkflowValues = createCodeReviewWorkflowValues()): ActiveWorkflowSession` with complete `projectSelection`, `lifecycle`, `entryArtifactResolution`, `ui.suppressedWorkflowFormIds`, `ui.suppressedWorkflowStepResolutionRoutes`, and `branchContext.activeBranchId`; define `buildCodeReviewPromptContext(activeStepNumber: CodeReviewPromptStepNumber, workflowValues: WorkflowValues = createCodeReviewWorkflowValues()): Promise<SystemPromptContext & WorkflowPromptProjection>` using a `WorkflowRuntime`, `TaskState.activeWorkflowName = "code-review"`, `TaskState.activeWorkflowSession`, and `apiRequestCount = 1`; do not use `as never`, `as any`, incomplete `WorkflowPromptProjection` objects, or helper return types inferred from complex object literals.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 11.5. In `integration.test.ts`, add `expectCodeReviewProjectedToolSurface(testCtx: TestRunner, activeStepNumber: CodeReviewPromptStepNumber, expectedToolSpecs: readonly ClineToolSpec[]): Promise<void>` mirroring `expectDevStoryProjectedToolSurface`: compute expected names from `expectedToolSpecs`, call `buildCodeReviewPromptContext(activeStepNumber)`, assert `context.workflowToolSchemaOverride` deep-equals `expectedToolSpecs`, then call `runPromptTest(...)` and assert `getNativeToolNames(tools)` deep-equals the expected names.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 11.6. In `integration.test.ts`, add a test named `projects active code-review step tools from module-owned builders into native GPT-5 prompts` that iterates exactly three expectations: Step 2 with `buildCodeReviewStep2ToolSchemas()`, Step 3 with `buildCodeReviewStep3ToolSchemas()`, and Step 4 with `buildCodeReviewStep4ToolSchemas()`, and passes each expectation to `expectCodeReviewProjectedToolSurface(...)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 11.7. In `integration.test.ts`, add a Step 2 code-review prompt-projection test that builds `const context = await buildCodeReviewPromptContext(2)`, asserts projected tool names are exactly `["use_subagents", "send_user_message", "workflow_progress_request"]`, assigns `workflowInputPayloadBlock` and `continuationWorkflowInputPayloadBlock` from the context, explicitly throws if either value is `undefined` or `""`, iterates the narrowed payload strings, and asserts each payload is non-empty after trimming; do not assert exact Step 2 prompt prose or exact subagent prompt-marker text.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 11.8. In `integration.test.ts`, add a Step 3 code-review prompt-projection test that builds `const context = await buildCodeReviewPromptContext(3)`, asserts projected tool names are exactly `["read_file", "read_file_range", "record_findings", "send_user_message", "workflow_progress_request"]`, assigns `workflowInputPayloadBlock` and `continuationWorkflowInputPayloadBlock` from the context, explicitly throws if either value is `undefined` or `""`, iterates the narrowed payload strings, asserts each payload contains the materialized baseline values for `blind_review_output`, `edge_case_review_output`, `target_story`, `review_scope_manifest`, `epics_document`, and `architecture_document`, and asserts the projected/native tool names exclude `attempt_completion`, `create_workflow_artifact`, `build_workflow_document`, `plan_remediation_story_artifact`, `update_story_index_status`, and `move_workflow_project_file`; do not assert the complete Step 3 prompt prose.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Subtask 11.9. In `integration.test.ts`, add Step 4 code-review prompt-projection tests that build contexts with `upstream_findings_present: true` and `remediation_story` set to the baseline remediation path, with `upstream_findings_present: false`, and with `remediation_story` overwritten to an empty string. Each test must assert projected tool names are exactly `["read_file", "read_file_range", "apply_patch", "ask_followup_question", "send_user_message", "attempt_completion"]`, assert `record_findings`, `workflow_progress_request`, `create_workflow_artifact`, `build_workflow_document`, `plan_remediation_story_artifact`, `update_story_index_status`, and `move_workflow_project_file` are absent from projected/native tools, assign `workflowInputPayloadBlock` and `continuationWorkflowInputPayloadBlock` from the context, explicitly throw if either value is `undefined` or `""`, iterate the narrowed payload strings, assert each payload is non-empty after trimming, assert the upstream-present payload differs from the upstream-absent payload without asserting the upstream prose, and assert the baseline remediation story path appears only when `remediation_story` is a non-empty string; do not assert exact Step 4 prompt prose.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[x] Task 12. Validate Phase 4.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 12.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 12.2. Run `npm run check-types`; if it fails during proto host probing, rerun with the approved elevated path and stop on the first non-environment TypeScript failure.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 12.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

### Phase 5 - Legacy Code-Review Package Cleanup And Final Validation

After completing this phase, pause for QA review before considering the module build complete.

[x] Task 13. Delete the legacy BMAD code-review workflow package.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/SKILL.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/bmad-skill-manifest.yaml`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/workflow.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-01-gather-context.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-02-review.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-03-triage.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-04-present.md`

[x] Subtask 13.1. Delete `.cline/skills/bmad-code-review/SKILL.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/SKILL.md`

[x] Subtask 13.2. Delete `.cline/skills/bmad-code-review/bmad-skill-manifest.yaml`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/bmad-skill-manifest.yaml`

[x] Subtask 13.3. Delete `.cline/skills/bmad-code-review/workflow.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/workflow.md`

[x] Subtask 13.4. Delete `.cline/skills/bmad-code-review/steps/step-01-gather-context.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-01-gather-context.md`

[x] Subtask 13.5. Delete `.cline/skills/bmad-code-review/steps/step-02-review.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-02-review.md`

[x] Subtask 13.6. Delete `.cline/skills/bmad-code-review/steps/step-03-triage.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-03-triage.md`

[x] Subtask 13.7. Delete `.cline/skills/bmad-code-review/steps/step-04-present.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-04-present.md`

[x] Task 14. Run final code-review module validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 14.1. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/reviewScopeManifest.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts src/core/task/tools/handlers/__tests__/RecordFindingsToolHandler.test.ts src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 14.2. Run `npm run check-types`; if it fails during proto host probing, rerun with the approved elevated path and stop on the first non-environment TypeScript failure.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 14.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 14.4. Run `rg -n "ReviewBlindHunter|ReviewEdgeCaseHunter|AdversarialReview|ReviewInputMarkdown|ReviewInputDiff|Review-blind-hunter|Review-edge-case-hunter|Adversarial-review|Review-input|review_blind_hunter|review_edge_case_hunter|adversarial_review|review_input_markdown|review_input_diff" src/core/task/workflow-runtime/artifactFamilies.ts src/core/task/workflow-runtime/types.ts src/core/task/workflow-runtime/WorkflowRuntime.ts src/core/task/workflow-runtime/workflow-modules/code-review`; treat exit code 1 with no output as success, inspect any output in context, and stop if any hit is active runtime code instead of an explicit negative test assertion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 14.5. Run `rg -n "build_review_diff_output|BuildReviewInputToolHandler|BuildReviewDiffOutputToolHandler|code_review_spec_update|CODE_REVIEW_SPEC_UPDATE|CodeReviewSpecUpdateToolHandler|codeReviewSpecUpdateMerge" src/shared/tools.ts src/core/assistant-message/index.ts src/core/task/tools/backendWorkflowToolContracts.ts src/core/task/tools/response/ResponseToolRegistry.ts src/core/task/tools/ToolExecutorCoordinator.ts src/core/task/tools/handlers src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts src/core/task/workflow-runtime/workflow-modules/code-review`; treat exit code 1 with no output as success, inspect any output in context, and stop if any hit is active runtime code instead of an explicit negative test assertion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 14.6. Run `rg -n "code-review\\.md|bmad-code-review" src/core/task/workflow-runtime src/core/prompts .cline/skills`; treat exit code 1 with no output as success, inspect any output in context, and stop if any hit is active runtime code, prompt code, or surviving legacy skill-package content instead of an explicit negative test assertion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[x] Subtask 14.7. Run `git status --short` and inspect the persistent diff scope; stop and report if any changed, deleted, or untracked path is outside the files prescribed by completed code-review action-plan tasks plus this action-plan file's checkbox updates.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

### Phase 6 - Acceptance Audit Review Subagent Integration

After completing this phase, pause for QA review before considering the code-review module update complete.

[x] Task 15. Add acceptance-audit review artifact-family support.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`

  [x] Subtask 15.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`, add `AcceptanceAuditOutput = "acceptance_audit_output"` to `WorkflowArtifactFamily` immediately after `BlindReviewOutput`.

  [x] Subtask 15.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`, add `WorkflowArtifactFamily.AcceptanceAuditOutput` to `WorkflowTargetDerivedArtifactFamilyDefinition.family` immediately after `WorkflowArtifactFamily.BlindReviewOutput`.

  [x] Subtask 15.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`, add `[WorkflowArtifactFamily.AcceptanceAuditOutput]` to `WORKFLOW_ARTIFACT_FAMILY_REGISTRY` immediately after the `BlindReviewOutput` entry with exactly `allocationMode: "derived_from_target"`, `identityRequirement: "target_story_or_remediation_story"`, `filenamePattern: "acceptance-audit-{target}.md"`, `fileExtension: ".md"`, `contentKind: "markdown"`, `numberingScope: "target_identity"`, and `discoveryPattern: /^acceptance-audit-(\d+-\d+(?:-\d+)?)\.md$/`.

  [x] Subtask 15.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`, add `WorkflowArtifactFamily.AcceptanceAuditOutput` to the derived `WorkflowArtifactDefinition.family` union immediately after `WorkflowArtifactFamily.BlindReviewOutput`.

  [x] Subtask 15.5. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`, add `case WorkflowArtifactFamily.AcceptanceAuditOutput:` to the target-derived branch in `resolveWorkflowArtifactIdentity(...)` immediately after `case WorkflowArtifactFamily.BlindReviewOutput:`.

  [x] Subtask 15.6. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`, add `case WorkflowArtifactFamily.AcceptanceAuditOutput:` to the target-derived branch in `parseWorkflowArtifactFilenameIdentity(...)` immediately after `case WorkflowArtifactFamily.BlindReviewOutput:`.

  [x] Subtask 15.7. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`, update the `reviewArtifactMatch` regex in `normalizeWorkflowArtifactIdentityInput(...)` to exactly `/^(?:blind-review|acceptance-audit|edge-case-hunter|code-review|review-scope)-(\d+-\d+(?:-\d+)?)\.md$/`.

  [x] Subtask 15.8. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, in `allocates and creates canonical workflow artifacts with persisted output values`, add `const acceptanceAuditKeys = createTargetedArtifactOutputValueKeys("acceptance_audit")` immediately after `blindReviewKeys`.

  [x] Subtask 15.9. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add `acceptanceAuditKeys` to the `collectArtifactOutputWorkflowValueKeys(...)` call immediately after `blindReviewKeys`.

  [x] Subtask 15.10. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add an `acceptance_audit_doc` artifact definition immediately after `blind_review_doc` with `family: WorkflowArtifactFamily.AcceptanceAuditOutput`, `intentMode: "derived"`, `parentIdentitySource: undefined`, `targetIdentitySource: { kind: "workflow_value", key: remediationStoryKeys.artifactIdentity }`, and `outputValueKeys: acceptanceAuditKeys`.

  [x] Subtask 15.11. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add `const acceptanceAuditResult = await runtime.createWorkflowArtifact({ taskState, artifactId: "acceptance_audit_doc", expectedArtifactAbsolutePath: undefined })` immediately after `reviewResult`.

  [x] Subtask 15.12. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add an `expect(acceptanceAuditResult).to.deep.include(...)` assertion immediately after the `reviewResult` assertion, expecting `artifactIdentity: "1.1.1"`, `artifactFilename: "acceptance-audit-1-1-1.md"`, `artifactRelativePath: join("planning", "acceptance-audit-1-1-1.md")`, `artifactAbsolutePath: join(cwd, "docs", "projects", "artifact-allocation-project", "planning", "acceptance-audit-1-1-1.md")`, `parentIdentity: undefined`, and `targetIdentity: "1.1.1"`.

  [x] Subtask 15.13. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add `await access(acceptanceAuditResult.artifactAbsolutePath)` immediately after `await access(reviewResult.artifactAbsolutePath)`.

  [x] Subtask 15.14. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add `[acceptanceAuditKeys.artifactFilename]: "acceptance-audit-1-1-1.md"` to the persisted workflow-values assertion immediately after `[blindReviewKeys.artifactFilename]: "blind-review-1-1-1.md"`.

[x] Task 16. Update code-review runtime behavior for the third child output.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

  [x] Subtask 16.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, add `AcceptanceAuditOutput = "acceptance_audit_output"` to `CodeReviewWorkflowValueKey` immediately after `BlindReviewOutput`.

  [x] Subtask 16.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, replace `Launch two subagents and assign their specialized code review workflows:` in `CODE_REVIEW_STEP_2_INITIAL_PROMPT` with `Launch three subagents and assign their specialized code review workflows:`.

  [x] Subtask 16.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, insert the Acceptance Audit Review prompt block from the requirements into `CODE_REVIEW_STEP_2_INITIAL_PROMPT` immediately after the Edge Case Hunter block.

  [x] Subtask 16.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, replace `Once both subagents are done and shut down` with `Once all three subagents are done and shut down` in `CODE_REVIEW_STEP_2_INITIAL_PROMPT`.

  [x] Subtask 16.5. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, insert `Acceptance Audit: acceptance_audit_output` in `CODE_REVIEW_STEP_3_PROMPT` immediately after `Edge Case Hunter: edge_case_review_output`.

  [x] Subtask 16.6. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, replace `You must read both documents` with `You must read all three documents` in `CODE_REVIEW_STEP_3_PROMPT`.

  [x] Subtask 16.7. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, add `.replaceAll("acceptance_audit_output", renderWorkflowValueByKey(input, CodeReviewWorkflowValueKey.AcceptanceAuditOutput))` in `renderCodeReviewPromptTemplate(...)` immediately after the `blind_review_output` replacement.

  [x] Subtask 16.8. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, update `childOutputsAreReady()` so its predicate also requires `readWorkflowStringValue(workflowValues, CodeReviewWorkflowValueKey.AcceptanceAuditOutput) !== undefined` between the blind-review and edge-case checks.

  [x] Subtask 16.9. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, add `acceptanceAuditFilename: string` to the return type of `buildExpectedChildOutputFilenames(...)` immediately after `blindReviewFilename`.

  [x] Subtask 16.10. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, add `acceptanceAuditFilename: \`acceptance-audit-${targetIdentity}.md\`` to the object returned by `buildExpectedChildOutputFilenames(...)` immediately after `blindReviewFilename`.

  [x] Subtask 16.11. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, add an `expectedOutputPaths` entry immediately after the blind-review entry with `filename: expectedFilenames.acceptanceAuditFilename` and `workflowValueKey: CodeReviewWorkflowValueKey.AcceptanceAuditOutput`.

[x] Task 17. Update code-review workflow unit tests for acceptance-audit child output behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

  [x] Subtask 17.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`, add `[CodeReviewWorkflowValueKey.AcceptanceAuditOutput]: `${REVIEW_FOLDER_PATH}/acceptance-audit-1-1.md`` to `SAMPLE_WORKFLOW_VALUES` immediately after `BlindReviewOutput`.

  [x] Subtask 17.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`, update the missing-output expectation in `discovers Step 2 child outputs and re-prompts when outputs are missing or empty` so `MissingSubagentOutputFiles` is exactly `["blind-review-1-1.md", "acceptance-audit-1-1.md", "edge-case-hunter-1-1.md"]`.

  [x] Subtask 17.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`, add `await writeFile(join(project.reviewFolder, "acceptance-audit-1-1.md"), "acceptance audit output\n", "utf8")` immediately after the blind-review output write.

  [x] Subtask 17.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`, add `[CodeReviewWorkflowValueKey.AcceptanceAuditOutput]: join(project.reviewFolder, "acceptance-audit-1-1.md")` to the ready-result workflow value assertion immediately after `BlindReviewOutput`.

  [x] Subtask 17.5. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`, add `[CodeReviewWorkflowValueKey.AcceptanceAuditOutput]: "/review/acceptance-audit-1-1.md"` to the ready-route `workflowValues` fixture immediately after `BlindReviewOutput`.

  [x] Subtask 17.6. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`, add `expect(step2Prompt).to.include("Skill: use_skill('acceptance-audit-review')")` immediately after the edge-case-hunter skill-marker assertion.

  [x] Subtask 17.7. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`, add `expect(step3Prompt).to.include(SAMPLE_WORKFLOW_VALUES[CodeReviewWorkflowValueKey.AcceptanceAuditOutput])` immediately after the blind-review Step 3 prompt assertion.

  [x] Subtask 17.8. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`, add `expect(step3Prompt).not.to.include("acceptance_audit_output")` immediately after the acceptance-audit Step 3 prompt assertion.

[x] Task 18. Update code-review prompt-projection integration coverage for acceptance-audit output.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

  [x] Subtask 18.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add `const CODE_REVIEW_ACCEPTANCE_AUDIT_OUTPUT = `${CODE_REVIEW_REVIEW_FOLDER}/acceptance-audit-1-1.md`` immediately after `CODE_REVIEW_BLIND_REVIEW_OUTPUT`.

  [x] Subtask 18.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add `[CodeReviewWorkflowValueKey.AcceptanceAuditOutput]: CODE_REVIEW_ACCEPTANCE_AUDIT_OUTPUT` to `createCodeReviewWorkflowValues(...)` immediately after `BlindReviewOutput`.

  [x] Subtask 18.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add `CODE_REVIEW_ACCEPTANCE_AUDIT_OUTPUT` to the Step 3 `materializedWorkflowValues` array immediately after `CODE_REVIEW_BLIND_REVIEW_OUTPUT`.

[x] Task 19. Validate Phase 6.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

  [x] Subtask 19.1. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`.

  [x] Subtask 19.2. Run `npm run check-types`; if it fails during proto host probing, rerun with the approved elevated path and stop on the first non-environment TypeScript failure.

  [x] Subtask 19.3. Run `npm run lint`.

  [x] Subtask 19.4. Run `rg -n "Launch two subagents|Once both subagents|both child output files|read both documents|either expected child output file" docs/workflows/workflow-runtime/workflow-modules/code-review/code-review-requirements.md src/core/task/workflow-runtime/workflow-modules/code-review src/core/prompts/system-prompt/__tests__/integration.test.ts`; treat exit code 1 with no output as success, inspect any output in context, and stop if any hit is active requirements, runtime, or test code instead of unrelated historical text.

## Validation

Each phase has its own validation task and must stop at the first non-environment failure. If `npm run check-types` fails during proto host probing, run `npm run protos` and rerun the blocked command with the approved elevated path before treating the failure as a code issue.

Final validation is complete only after Task 14 passes and persistent diff scope is limited to the files prescribed by completed tasks plus action-plan checkbox updates.
