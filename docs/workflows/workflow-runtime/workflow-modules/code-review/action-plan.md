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

[ ] Task 3. Add the shared `record_findings` tool contract and remove the retired `code_review_spec_update` contract.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[ ] Subtask 3.1. In `tools.ts`, delete `ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE` and add `ClineDefaultTool.RECORD_FINDINGS = "record_findings"` in the workflow-tool group.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[ ] Subtask 3.2. In `tools.ts`, keep `record_findings` out of `READ_ONLY_TOOLS` because it mutates the findings document.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`

[ ] Subtask 3.3. In `assistant-message/index.ts`, add `"findings"` to `toolParamNames`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/assistant-message/index.ts`

[ ] Subtask 3.4. In `backendWorkflowToolContracts.ts`, delete the `CODE_REVIEW_SPEC_UPDATE` contract entry and add a `RECORD_FINDINGS` contract entry named `record_findings` with one required `findings` array parameter whose items are objects with required `finding`, `categories`, and `description` fields; `finding` and `description` are strings, and `categories` is an array of strings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`

[ ] Subtask 3.5. In `ResponseToolRegistry.ts`, delete the `CODE_REVIEW_SPEC_UPDATE` metadata entry and add `[ClineDefaultTool.RECORD_FINDINGS]: undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

[ ] Subtask 3.6. In `workflow-runtime-metadata.test.ts`, add assertions that `getBackendWorkflowToolContract(ClineDefaultTool.RECORD_FINDINGS)` returns the `record_findings` contract with a required `findings` parameter, and that `ResponseToolRegistry.get(ClineDefaultTool.RECORD_FINDINGS)` and `ResponseToolRegistry.isResponseTool(ClineDefaultTool.RECORD_FINDINGS)` identify it as a non-response tool.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflow-runtime-metadata.test.ts`

[ ] Subtask 3.7. In `ResponseToolRuntime.test.ts`, add `ClineDefaultTool.RECORD_FINDINGS` to the non-response workflow tool assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`

[ ] Task 4. Implement `RecordFindingsToolHandler`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/RecordFindingsToolHandler.test.ts`

[ ] Subtask 4.1. Add `RecordFindingsToolHandler.ts` with `readonly name = ClineDefaultTool.RECORD_FINDINGS`, a constructor accepting `ToolValidator`, and `getDescription(...)` returning `[record_findings]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[ ] Subtask 4.2. In `RecordFindingsToolHandler.ts`, add typed parser helpers that read only the `findings` param, accept either a JSON string or a materialized value, reject unsupported top-level params, and narrow to `readonly CodeReviewFindingRequest[]` without `any` or forced assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[ ] Subtask 4.3. In `RecordFindingsToolHandler.ts`, model categories with an enum or literal union containing exactly `task_failure`, `dev_agent_failure`, and `upstream_failure`, and map those values to exactly `## Task Failures`, `## Dev Agent Failures`, and `## Upstream Failures`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[ ] Subtask 4.4. In `RecordFindingsToolHandler.ts`, resolve the target file from `config.taskState.activeWorkflowSession.workflowValues.code_review_output`, require `activeWorkflowName === "code-review"`, require a non-empty string path, and reject calls that do not have an active code-review workflow session.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[ ] Subtask 4.5. In `RecordFindingsToolHandler.ts`, validate the resolved `code_review_output` path with `ToolValidator.checkClineIgnorePath(...)`, read the existing document, require all three headings to exist, and fail without mutation when any path, read, or heading validation fails.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[ ] Subtask 4.6. In `RecordFindingsToolHandler.ts`, implement append-only markdown updates so each finding is appended below each selected category heading in exactly this shape: `### {finding}`, blank line, `{description}`; preserve heading order and existing content.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[ ] Subtask 4.7. In `RecordFindingsToolHandler.ts`, return success without file write when `findings` is an empty array; the result JSON must report `recordedFindingCount: 0` and `updatedHeadings: []`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[ ] Subtask 4.8. In `RecordFindingsToolHandler.ts`, for non-empty successful writes, use the existing approval/path policy pattern from `UpsertEpicToolHandler`, atomically replace the document, clear the file-read cache for the findings path, set `didEditFile`, reset `consecutiveMistakeCount`, and return JSON with exactly `recordedFindingCount` and `updatedHeadings`; do not return raw document content.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/RecordFindingsToolHandler.ts`

[ ] Subtask 4.9. Add `RecordFindingsToolHandler.test.ts` covering active workflow gating, missing `code_review_output`, blocked path, missing file, missing headings, unsupported category, malformed finding entries, empty-array no-op success, single-category append, multi-category duplication, append-only preservation, exact result keys, and absence of raw document content; build fixtures with explicit helper return types and use JSON-string params for `findings`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/RecordFindingsToolHandler.test.ts`

[ ] Task 5. Wire `record_findings` and delete retired `code_review_spec_update` runtime surfaces.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/codeReviewSpecUpdateMerge.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/codeReviewSpecUpdateMerge.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts`

[ ] Subtask 5.1. In `ToolExecutorCoordinator.ts`, delete the `CodeReviewSpecUpdateToolHandler` import and `CODE_REVIEW_SPEC_UPDATE` map entry, import `RecordFindingsToolHandler`, and register `[ClineDefaultTool.RECORD_FINDINGS]: (v: ToolValidator) => new RecordFindingsToolHandler(v)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

[ ] Subtask 5.2. Delete `CodeReviewSpecUpdateToolHandler.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts`

[ ] Subtask 5.3. Delete `codeReviewSpecUpdateMerge.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/codeReviewSpecUpdateMerge.ts`

[ ] Subtask 5.4. Delete `codeReviewSpecUpdateMerge.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/codeReviewSpecUpdateMerge.test.ts`

[ ] Subtask 5.5. In `ToolExecutor.nativeToolParity.test.ts`, remove `CODE_REVIEW_SPEC_UPDATE` executions and replace the surviving parity assertions with `ClineDefaultTool.RECORD_FINDINGS` handler registration checks where a real execution would require an active workflow session; use raw string lookup APIs for deleted `code_review_spec_update` absence checks rather than constructing a `ToolUse` with a deleted enum member.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts`

[ ] Task 6. Validate Phase 2.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 6.1. Run `npm run test:unit -- src/core/task/tools/handlers/__tests__/RecordFindingsToolHandler.test.ts src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 6.2. Run `npm run check-types`; if it fails during proto host probing, rerun with the approved elevated path and stop on the first non-environment TypeScript failure.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 6.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 6.4. Run `rg -n "code_review_spec_update|CODE_REVIEW_SPEC_UPDATE|CodeReviewSpecUpdateToolHandler|codeReviewSpecUpdateMerge" src/core src/shared`; inspect any hits in context and stop if any hit is active runtime code instead of an explicit negative test assertion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

### Phase 3 - Code-Review Module Definition, Review-Scope Builder, And Module Tests

After completing this phase, pause for QA review before moving to Phase 4.

[ ] Task 7. Add module-owned tool schemas.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewToolSchemas.test.ts`

[ ] Subtask 7.1. Create `codeReviewToolSchemas.ts` with named exported builders `buildCodeReviewStep1ToolSchemas`, `buildCodeReviewStep2ToolSchemas`, `buildCodeReviewStep3ToolSchemas`, and `buildCodeReviewStep4ToolSchemas`; Step 1 must return `[]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewToolSchemas.ts`

[ ] Subtask 7.2. In `codeReviewToolSchemas.ts`, implement Step 2 schemas with exactly `use_subagents`, `send_user_message`, and `workflow_progress_request`, using `ModelFamily.NATIVE_GPT_5` and module-local schema builders.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewToolSchemas.ts`

[ ] Subtask 7.3. In `codeReviewToolSchemas.ts`, implement Step 3 schemas with exactly `read_file`, `read_file_range`, `record_findings`, `send_user_message`, and `workflow_progress_request`, using the `record_findings` schema shape from the requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewToolSchemas.ts`

[ ] Subtask 7.4. In `codeReviewToolSchemas.ts`, implement Step 4 schemas with exactly `read_file`, `read_file_range`, `apply_patch`, `ask_followup_question`, `send_user_message`, and `attempt_completion`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewToolSchemas.ts`

[ ] Subtask 7.5. Add `codeReviewToolSchemas.test.ts` asserting exact tool names for each step, `record_findings` only in Step 3, `attempt_completion` only in Step 4, and absence of `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `plan_remediation_story_artifact`, `update_story_index_status`, `move_workflow_project_file`, and retired code-review tools from all step schemas.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewToolSchemas.test.ts`

[ ] Task 8. Add review-scope manifest helper logic.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/reviewScopeManifest.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/reviewScopeManifest.test.ts`

[ ] Subtask 8.1. Create `reviewScopeManifest.ts` with explicit exported types for changed file status, additions, deletions, allowed-file comparison, story task summary, and the final manifest content; do not use `any`, forced assertions, or untyped object helpers.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/reviewScopeManifest.ts`

[ ] Subtask 8.2. In `reviewScopeManifest.ts`, add parser helpers for `git show --name-status <hash>` and `git show --numstat <hash>` output that support added, modified, deleted, renamed, and copied path records and return typed failures for malformed rows.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/reviewScopeManifest.ts`

[ ] Subtask 8.3. In `reviewScopeManifest.ts`, add a builder that reads parsed story task/subtask and allowed-file data from the shared `storyTaskDocument` parser, compares committed paths against allowed files, and returns a typed manifest model without treating story tasks as proof of implementation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/reviewScopeManifest.ts`

[ ] Subtask 8.4. In `reviewScopeManifest.ts`, add `buildReviewScopeManifestMarkdown(...)` that emits the exact required headings, source metadata lines, summary counts, changed-file table, review target commands, and approved suggested review strategy from the requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/reviewScopeManifest.ts`

[ ] Subtask 8.5. Add `reviewScopeManifest.test.ts` covering name-status parsing, numstat parsing, deleted files, renamed files, allowed-vs-touched comparison, required heading order, changed-file table shape, source metadata lines, per-file `git show <hash> -- <path>` commands, and no whole-commit diff embedding.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/reviewScopeManifest.test.ts`

[ ] Task 9. Add the code-review workflow definition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[ ] Subtask 9.1. Create `codeReviewWorkflow.ts` with exported identity constants exactly matching the requirements: name, slash command, use skill name, display name, description, project subfolder, and structured Fred quality-control persona.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.2. In `codeReviewWorkflow.ts`, add `CodeReviewWorkflowValueKey` enum and `CODE_REVIEW_WORKFLOW_VALUE_KEYS` containing every requirements value key, including the approved dedicated artifact metadata keys and `remediation_story_parent_identity`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.3. In `codeReviewWorkflow.ts`, add `CODE_REVIEW_ENTRY_PROJECT_VALUE_KEYS` mapping exactly `projectMode`, `projectTitle`, and `projectFolderName`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.4. In `codeReviewWorkflow.ts`, add the required `target_story` prerequisite with `producingWorkflowName: "dev-story"`, `projectSubfolderSegments: ["implementation", "stories-review"]`, naming pattern `/^(Story-\d+-\d+|Remediation-story-\d+-\d+-\d+)\.md$/`, workflow value key `target_story`, and `outputDocumentReference: "none"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.5. In `codeReviewWorkflow.ts`, add artifact definitions for `code_review_output` and `review_scope_manifest` using `WorkflowArtifactFamily.CodeReviewOutput` and `WorkflowArtifactFamily.ReviewScopeManifest`, `intentMode: "derived"`, `targetIdentitySource` from `selected_story_identity`, and the dedicated output value keys prescribed in the requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.6. In `codeReviewWorkflow.ts`, add the `remediation_story` artifact definition using `WorkflowArtifactFamily.RemediationStory`, `intentMode: "new"`, `parentIdentitySource` from `remediation_story_parent_identity`, and the dedicated remediation output value keys prescribed in the requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.7. In `codeReviewWorkflow.ts`, add the Step 1 workflow form with Panel A and Panel B exactly as prescribed, including Panel B same-session back navigation to Panel A. Panel A submit must be `runtime_routed`, and the commit hash field must not declare `workflowValueKey`; the validation route must read the field's form-session value and persist `review_commit_hash` only after Git validation succeeds.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.8. In `codeReviewWorkflow.ts`, add deterministic helpers that derive and validate `selected_story_filename`, `selected_story_identity`, `epic_identity`, `stories_index`, `review_folder`, `epics_document`, and `architecture_document` from the selected `target_story` and selected project root; failures must return typed deterministic failures with concrete messages.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.9. In `codeReviewWorkflow.ts`, add a read-only Git command runner helper for Step 1 using `execa("git", args, { cwd: selectedProjectRoot, shell: false, reject: false })`; commit validation must persist `review_commit_hash` and `review_commit_parent`, and review-scope document building must later collect name-status and numstat output using those persisted values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.10. In `codeReviewWorkflow.ts`, add Step 1 decision routes in this order: resolve `target_story`; derive target/story/project values; allocate `code_review_output`; build the initial code-review output headings document; render Panel A; on Panel A submit validate the commit hash and persist `review_commit_hash` plus `review_commit_parent`; on invalid commit continue the same form session to Panel B; on valid commit allocate `review_scope_manifest`; build the review-scope document by collecting Git changed-file data and story context through the review-scope helper; transition to Step 2.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.11. In `codeReviewWorkflow.ts`, add Step 2 prompt building so it returns the initial Step 2 prompt when `missing_subagent_output_files` is empty or absent, and returns the exact missing-output prompt with the persisted filename list when `missing_subagent_output_files` contains values.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.12. In `codeReviewWorkflow.ts`, add Step 2 decision routes so the entry route projects the prompt, `workflow_progress_request_confirmed` triggers child-output discovery, missing or empty child outputs persist `missing_subagent_output_files` and re-project Step 2, and both non-empty child outputs persist `blind_review_output` and `edge_case_review_output`, clear `missing_subagent_output_files`, and transition to Step 3.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.13. In `codeReviewWorkflow.ts`, add Step 3 prompt building and decision routes so the entry route projects the Step 3 prompt, and `workflow_progress_request_confirmed` transitions to Step 4.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.14. In `codeReviewWorkflow.ts`, add Step 4 findings evaluation helper that reads `code_review_output`, inspects only content under the three required headings, persists `review_findings_present` and `upstream_findings_present`, derives `remediation_story_parent_identity` as the first two identity segments for primary or remediation targets, and fails with a concrete terminal-error message if the findings document or selected identity is invalid.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.15. In `codeReviewWorkflow.ts`, add Step 4 decision routes so no findings routes through backend-only `update_story_index_status` for the selected target story with `storyIndexWorkflowValueKey: CodeReviewWorkflowValueKey.StoriesIndex`, `storyIdentityWorkflowValueKey: CodeReviewWorkflowValueKey.SelectedStoryIdentity`, `status: "complete"`, and `expectedCurrentStatus: "review"`, then through `move_project_file` from `["implementation", "stories-review"]` to `["implementation", "stories-complete"]` using `filenameWorkflowValueKey: CodeReviewWorkflowValueKey.SelectedStoryFilename`, then to `complete_workflow`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.16. In `codeReviewWorkflow.ts`, for every Step 4 tool-backed failure route, route through a `run_deterministic_procedure` terminal-failure helper that reads `session.branchContext.failureState?.terminalErrorMessage` and returns `{ kind: "failed", errorMessage }`; do not use static `terminal_error` strings that drop the backend failure reason.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.17. In `codeReviewWorkflow.ts`, add the Step 4 findings route through backend-only `plan_remediation_story_artifact` using `remediation_story_parent_identity`, `allocate_artifact` for `remediation_story`, `build_workflow_document` with the exact remediation shell headings, and then `project_prompt`; remediation story planning remains the only Step 4 story-index mutation before the model prompt because it appends the draft remediation story entry to the story index.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.18. In `codeReviewWorkflow.ts`, add Step 4 prompt construction so it always includes `Review the findings in code_review_output.`, includes the upstream-failure conditional block only when `upstream_findings_present === true`, includes the remediation-story conditional block only when `remediation_story` is a non-empty string, and routes `attempt_completion_succeeded` through the same selected-target-story completion sequence as the no-findings route: backend-only `update_story_index_status` to `complete` with `expectedCurrentStatus: "review"`, `move_project_file` from `implementation/stories-review` to `implementation/stories-complete`, then `complete_workflow`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.19. In `codeReviewWorkflow.ts`, export `codeReviewWorkflowDefinition` with entry panel prompt equal to the module description, declared value keys, entry project keys, prerequisite files, artifacts, workflow form, and exactly four steps with the checklist labels from the requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

[ ] Subtask 9.20. Create `index.ts` exporting `codeReviewWorkflowDefinition`, value-key constants, artifact ids, form ids, panel ids, and tool-schema builders needed by tests and prompt integration.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/index.ts`

[ ] Subtask 9.21. Add `codeReviewWorkflow.test.ts` covering workflow identity, persona, entry panel, value keys, entry project keys, prerequisite declaration, artifact declarations and output keys, form panel shapes, Step 1 target derivation, invalid commit same-session Panel B route, valid commit review-scope route, Step 2 child output discovery and missing-output re-prompt, Step 3 route to Step 4, Step 4 no-findings route through selected-target-story status update, selected-target-story file move, and completion, Step 4 findings remediation route sequence, Step 4 upstream conditional prompt inclusion, Step 4 backend failure reason propagation, and Step 4 `attempt_completion_succeeded` route through selected-target-story status update, selected-target-story file move, and completion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[ ] Task 10. Validate Phase 3.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 10.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/reviewScopeManifest.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 10.2. Run `npm run check-types`; if it fails during proto host probing, rerun with the approved elevated path and stop on the first non-environment TypeScript failure.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 10.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

### Phase 4 - Registry And Prompt Projection Integration

After completing this phase, pause for QA review before moving to Phase 5.

[ ] Task 11. Register the code-review workflow and add integration coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 11.1. In `WorkflowRegistry.ts`, import `codeReviewWorkflowDefinition` from the code-review module and add it to `shippedWorkflowDefinitions` without changing the existing workflow order except appending code-review after the currently shipped modules.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`

[ ] Subtask 11.2. In `codeReviewWorkflow.test.ts`, add registry assertions proving `resolveWorkflowDefinition("code-review")`, `resolveWorkflowBySlashCommand("code-review")`, and `resolveWorkflowByUseSkillName("code-review")` return `codeReviewWorkflowDefinition`, and proving `code-review.md` resolves through none of those registry paths.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

[ ] Subtask 11.3. In `integration.test.ts`, import `codeReviewWorkflowDefinition` and code-review tool-schema builders, then add prompt-projection tests proving active Step 2 projects required subagent assignment markers and only Step 2 tools without asserting the full Step 2 prompt prose.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 11.4. In `integration.test.ts`, add prompt-projection tests proving active Step 3 projects non-empty current step instructions, renders non-empty document path placeholders, includes `record_findings` in the workflow tool schema override, and excludes backend-only and retired code-review tools.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Subtask 11.5. In `integration.test.ts`, add prompt-projection tests proving active Step 4 projects `attempt_completion`, excludes `record_findings`, excludes backend-only and retired code-review tools, includes the upstream conditional block only when `upstream_findings_present === true`, and includes remediation-story instructions only when `remediation_story` is a non-empty string.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

[ ] Task 12. Validate Phase 4.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 12.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 12.2. Run `npm run check-types`; if it fails during proto host probing, rerun with the approved elevated path and stop on the first non-environment TypeScript failure.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 12.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

### Phase 5 - Legacy Code-Review Package Cleanup And Final Validation

After completing this phase, pause for QA review before considering the module build complete.

[ ] Task 13. Delete the legacy BMAD code-review workflow package.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/SKILL.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/bmad-skill-manifest.yaml`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/workflow.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-01-gather-context.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-02-review.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-03-triage.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-04-present.md`

[ ] Subtask 13.1. Delete `.cline/skills/bmad-code-review/SKILL.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/SKILL.md`

[ ] Subtask 13.2. Delete `.cline/skills/bmad-code-review/bmad-skill-manifest.yaml`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/bmad-skill-manifest.yaml`

[ ] Subtask 13.3. Delete `.cline/skills/bmad-code-review/workflow.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/workflow.md`

[ ] Subtask 13.4. Delete `.cline/skills/bmad-code-review/steps/step-01-gather-context.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-01-gather-context.md`

[ ] Subtask 13.5. Delete `.cline/skills/bmad-code-review/steps/step-02-review.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-02-review.md`

[ ] Subtask 13.6. Delete `.cline/skills/bmad-code-review/steps/step-03-triage.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-03-triage.md`

[ ] Subtask 13.7. Delete `.cline/skills/bmad-code-review/steps/step-04-present.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-code-review/steps/step-04-present.md`

[ ] Task 14. Run final code-review module validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 14.1. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/reviewScopeManifest.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts src/core/task/tools/handlers/__tests__/RecordFindingsToolHandler.test.ts src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts src/core/task/__tests__/workflow-runtime-metadata.test.ts src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 14.2. Run `npm run check-types`; if it fails during proto host probing, rerun with the approved elevated path and stop on the first non-environment TypeScript failure.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 14.3. Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 14.4. Run `rg -n "ReviewBlindHunter|ReviewEdgeCaseHunter|AdversarialReview|ReviewInputMarkdown|ReviewInputDiff|Review-blind-hunter|Review-edge-case-hunter|Adversarial-review|Review-input|review_blind_hunter|review_edge_case_hunter|adversarial_review|review_input_markdown|review_input_diff|build_review_diff_output|BuildReviewInputToolHandler|BuildReviewDiffOutputToolHandler|code_review_spec_update|CodeReviewSpecUpdateToolHandler|codeReviewSpecUpdateMerge" src/core/task src/core/prompts src/shared docs/workflows/workflow-runtime/workflow-modules/code-review`; inspect hits in context and stop if any hit is active runtime code instead of historical docs or explicit negative test assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

[ ] Subtask 14.5. Run `rg -n "code-review\\.md|bmad-code-review" src/core/task/workflow-runtime src/core/prompts docs/workflows/workflow-runtime/workflow-modules/code-review`; inspect hits in context and stop if any hit is active runtime code instead of explicit negative test assertions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/action-plan.md`

## Validation

Each phase has its own validation task and must stop at the first non-environment failure. If `npm run check-types` fails during proto host probing, run `npm run protos` and rerun the blocked command with the approved elevated path before treating the failure as a code issue.

Final validation is complete only after Task 14 passes and persistent diff scope is limited to the files prescribed by completed tasks plus action-plan checkbox updates.
