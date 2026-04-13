# Workflow Runtime Workflow Buildout Extract

This file stores the workflow-specific configuration and buildout steps extracted from [action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md).

It intentionally excludes shared workflow-runtime contract, registry, orchestration, prompt/tool projection, persistence, subagent, teardown, test, and documentation work. Those shared tasks remain in [action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/action-plan.md).

Original checkbox state and original subtask numbering are preserved here for traceability.

## Approved In-Scope Workflow Buildout Set

- `blind-review.md`
- `brainstorming.md`
- `code-review.md`
- `correct-course.md`
- `create-architecture.md`
- `create-epics.md`
- `create-prd.md`
- `create-product-brief.md`
- `create-story.md`
- `dev-story.md`
- `document-project.md`
- `pi-planning.md`
- `problem-solving.md`
- `quick-dev.md`
- `quick-spec.md`
- `review-adversarial-general.md`
- `review-edge-case-hunter.md`
- `write-remediation-story.md`

## Extraction Notes

- This extract preserves the workflow-specific source-map guidance and per-workflow buildout subtasks that were previously embedded in the main action plan.
- This extract preserves the workflow-specific Phase 6 definition-hydration subtasks that update per-workflow `workflowForms` and `deterministicResolvers`.
- `problem-solving.md` is part of the approved in-scope architecture and requirements set, but no workflow-specific buildout subtask for it exists in the current source action plan. This extract does not invent one.

## Canonical Workflow Project-Subfolder Map

Use this exact map when setting `WorkflowDefinition.projectSubfolder` in every workflow definition module:

| Workflow | Project Subfolder |
| --- | --- |
| `blind-review.md` | `review` |
| `brainstorming.md` | `discovery` |
| `code-review.md` | `review` |
| `correct-course.md` | `planning` |
| `create-architecture.md` | `planning` |
| `create-epics.md` | `planning` |
| `create-prd.md` | `planning` |
| `create-product-brief.md` | `planning` |
| `create-story.md` | `planning` |
| `dev-story.md` | `implementation` |
| `document-project.md` | `implementation` |
| `pi-planning.md` | `planning` |
| `problem-solving.md` | `discovery` |
| `quick-dev.md` | `implementation` |
| `quick-spec.md` | `planning` |
| `review-adversarial-general.md` | `review` |
| `review-edge-case-hunter.md` | `review` |
| `write-remediation-story.md` | `planning` |

## Workflow-Specific Source Map

Create one workflow definition module for each approved shipped workflow listed below. For each module:

- Copy the step titles and step body text from the matching external source file under `/Users/robertboston/Documents/Cline/Workflows/`.
- Copy the start-card body from [WorkflowStartCardRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/WorkflowStartCardRegistry.ts#L3).
- Copy the workflow persona instruction text from the matching entry currently resolved through [workflowPersonaRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts#L14).
- Copy the per-step tool bundles from [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L93).
- If the workflow currently participates in workflow-start parsing, workflow forms, deterministic progression, deterministic step resolution, or completion handling, move that behavior into the module using the exact source seams called out later in this extract.

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
- `create-product-brief.md` <= `bmad-create-product-brief`
- `document-project.md` <= `bmad-document-project`
- `create-prd.md` <= `bmad-create-prd`
- `create-epics.md` <= `bmad-create-epics-and-stories`
- `correct-course.md` <= `bmad-correct-course`
- `create-architecture.md` <= `bmad-create-architecture`
- `create-story.md` <= `bmad-create-story`
- `dev-story.md` <= `bmad-dev-story`
- `code-review.md` <= `bmad-code-review`
- `quick-spec.md` <= `bmad-quick-spec`
- `quick-dev.md` <= `bmad-quick-dev`

No workflow module outside the list above should define `workflowReminderText` in this pass.

## Phase 2 Workflow-Specific Buildout Rules

Definition creation rule used by every `definition.ts` task below:

- Create exactly one exported `WorkflowDefinition` constant named `<camelCaseWorkflowName>WorkflowDefinition`.
- Set `name`, `slashCommandName`, and `useSkillName` to the exact shipped workflow id including `.md`.
- Set `projectSubfolder` to the exact canonical value from the workflow-project-subfolder map in this extract.
- Transcribe the workflow from the matching file under `/Users/robertboston/Documents/Cline/Workflows/`.
- Set each step id exactly to `step-1`, `step-2`, `step-3`, and so on.
- Set each `stepNumber` to the authored step number and each `stepLabel` to the authored step heading text.
- Preserve authored markdown body text in `promptText` except for placeholder-era ownership wording. Replace any instruction that names `workflow placeholder state`, `stable placeholder`, or `.cline/workflow-config.yaml` with equivalent runtime-owned workflow-session wording while preserving the original step intent and workflow value keys.
- When the authored workflow step explicitly tells the model to persist a workflow-owned value, preserve the tool id `set_workflow_placeholders` as the AI-callable workflow-value persistence tool, but rewrite the surrounding wording so it refers to runtime-owned workflow values rather than placeholder ownership.
- Copy `startCardMarkdown` from the matching `WorkflowStartCardRegistry.ts` entry.
- Copy `personaInstruction` from the current workflow persona registry entry for that workflow.
- Copy `toolBundles` from the matching `contextualToolMatrix.ts` workflow row.
- Populate `progress.mechanism` exactly from the derivation order and explicit step map verified in this extract. Do not infer any other mechanism.
- Preserve `{key}` references only when that key is intended to resolve from `activeWorkflowSession.workflowValues` through the runtime-owned token-expansion seam added in Subtasks 1.11g-1.11i of the main action plan.
- Populate `workflowReminderText`, `workflowStartForm`, `completionToolId`, `artifacts`, `dataAssets`, `workflowForms`, and `deterministicResolvers` only where this extract explicitly instructs it.
- Leave `inheritedWorkflowValueKeys` unset in Phase 2 unless a later subagent-specific task in the main action plan explicitly prescribes it.
- Do not add helper functions or extra exports to any `definition.ts` file.

Artifact creation rule used by every `artifacts.ts` task below:

- Create exactly one exported constant named `<camelCaseWorkflowName>Artifacts`.
- Type it as `Record<string, WorkflowArtifactDefinition>`.
- Every artifact entry represents a generated workflow document contract, not a source template file.
- The artifact record key must exactly equal the artifact `id`.
- If the current runtime already persists the generated artifact path under a canonical workflow value key, use that exact key as the artifact record key and `id`.
- `relativePathPattern` must describe the generated document path pattern relative to the workflow's canonical `projectSubfolder`. It must never be a source template location.
- `relativePathPattern` may include `{key}` tokens only for runtime-owned workflow value keys resolved from `activeWorkflowSession.workflowValues`.
- `initialContent` must inline the runtime-coded starter body copied from the current template dependency path recorded in `_bmad/_config/managed-workflows.json` plus `_bmad/_config/files-manifest.csv`.
- Use `collisionStrategy: "append_numeric_suffix"` only when the current runtime creates numbered sibling files on collision. Otherwise use `collisionStrategy: "overwrite"` or omit it when overwrite is the default runtime behavior.
- Preserve the currently verified artifact-path keys where they already exist in live handlers and tests, including `output_file`, `epic_delivery_spec`, and `story_doc`.
- Do not hardcode the visible project output root, the per-project folder name, or the workflow project subfolder into `relativePathPattern`; `resolveWorkflowArtifactPath(...)` in the shared runtime prepends those path segments and owns cross-artifact numbering.

Data-asset creation rule used by every `data.ts` task below:

- Create exactly one exported constant named `<camelCaseWorkflowName>DataAssets`.
- Type it as `Record<string, WorkflowDataAsset>`.
- The data-asset record key must exactly equal the data-asset `id`.
- If the current runtime already reads a static asset through a named helper or canonical file such as `brain-methods.csv`, preserve that source identity in the `id` using snake_case rather than inventing a new label.
- Use `format: "csv"` for comma-separated libraries, `format: "yaml"` for YAML sources, `format: "json"` for JSON sources, and `format: "markdown"` for Markdown content.
- Inline the static data currently sourced by the workflow. No runtime file reads may remain for those data assets after migration.

## Extracted Workflow-Specific Phase 2 Subtasks

- [x] Subtask 2.2
  Allowed files: `src/core/task/workflow-runtime/workflows/blind-review/definition.ts`
  Revision: Update the existing `blind-review/definition.ts` so `blindReviewWorkflowDefinition` fully satisfies the definition creation rule. Include the Step 1 workflow-start requirements derived from the current authored workflow-start fields for `blind-review.md`. Do not add reminder, artifacts, data assets, workflow forms, or deterministic resolvers.

- [x] Subtask 2.3
  Allowed files: `src/core/task/workflow-runtime/workflows/brainstorming/artifacts.ts`
  Revision: Update the existing `brainstorming/artifacts.ts` so `brainstormingArtifacts` fully satisfies the artifact creation rule. This file must export exactly one artifact definition keyed by `output_file` with `id: "output_file"`, `relativePathPattern: "brainstorming-session-{date}.md"`, `collisionStrategy: "append_numeric_suffix"`, and `initialContent` equal to the inlined body currently sourced from `.cline/skills/bmad-brainstorming/template.md`. Do not use `template.md` as an artifact path in this file.

- [x] Subtask 2.4
  Allowed files: `src/core/task/workflow-runtime/workflows/brainstorming/data.ts`
  Revision: Create `brainstorming/data.ts` using the data-asset creation rule with export `brainstormingDataAssets`. This file must export exactly one data asset keyed by `brain_methods` with `id: "brain_methods"`, `format: "csv"`, and `contents` equal to the inlined body currently sourced from `.cline/skills/bmad-brainstorming/brain-methods.csv`.

- [ ] Subtask 2.5
  Allowed files: `src/core/task/workflow-runtime/workflows/brainstorming/definition.ts`
  Revision: Create `brainstorming/definition.ts` using the definition creation rule with export `brainstormingWorkflowDefinition`. Import `brainstormingArtifacts` and `brainstormingDataAssets`, set `workflowReminderText`, include Step 1 workflow-start requirements, and leave `workflowForms` and `deterministicResolvers` unset until Phase 6.

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

- [ ] Subtask 2.33
  Allowed files: `src/core/task/workflow-runtime/workflows/dev-story/definition.ts`
  Revision: Create `dev-story/definition.ts` using the definition creation rule with export `devStoryWorkflowDefinition`. Set `workflowReminderText`, include Step 1 workflow-start requirements, and do not add artifacts, data assets, workflow forms, or deterministic resolvers.
  Note: `dev-story.md` still has left-behind startup-context behavior in `src/core/task/index.ts` through `buildPlaceholderWorkflowActivationInstructions(...)`. That special case resolves the active story path with `resolveActiveStoryPath(...)`, reads the story document, and injects a startup prompt built by `buildDevStoryWorkflowStartPrompt(...)` from the story file's `## Acceptance Criteria` and `## Latest Review Findings` sections. When the `dev-story` workflow module is built, migrate that behavior into the new workflow runtime / workflow-module architecture instead of leaving it in placeholder-era `task/index.ts` logic.

- [ ] Subtask 2.35
  Allowed files: `src/core/task/workflow-runtime/workflows/document-project/definition.ts`
  Revision: Create `document-project/definition.ts` using the definition creation rule with export `documentProjectWorkflowDefinition`. Set `workflowReminderText` and do not add workflow-start requirements, artifacts, data assets, workflow forms, or deterministic resolvers in this pass.

- [ ] Subtask 2.49
  Allowed files: `src/core/task/workflow-runtime/workflows/pi-planning/artifacts.ts`
  Revision: Create `pi-planning/artifacts.ts` using the artifact creation rule with export `piPlanningArtifacts`.

- [ ] Subtask 2.50
  Allowed files: `src/core/task/workflow-runtime/workflows/pi-planning/data.ts`
  Revision: Create `pi-planning/data.ts` using the data-asset creation rule with export `piPlanningDataAssets`.

- [ ] Subtask 2.51
  Allowed files: `src/core/task/workflow-runtime/workflows/pi-planning/definition.ts`
  Revision: Create `pi-planning/definition.ts` using the definition creation rule with export `piPlanningWorkflowDefinition`. Import `piPlanningArtifacts` and `piPlanningDataAssets`, include Step 1 workflow-start requirements, and do not add reminder, workflow forms, or deterministic resolvers in this file until later phases require them.

- [ ] Subtask 2.53
  Allowed files: `src/core/task/workflow-runtime/workflows/quick-dev/definition.ts`
  Revision: Create `quick-dev/definition.ts` using the definition creation rule with export `quickDevWorkflowDefinition`. Set `workflowReminderText`, include Step 1 workflow-start requirements, and do not add artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.57
  Allowed files: `src/core/task/workflow-runtime/workflows/quick-spec/artifacts.ts`
  Revision: Create `quick-spec/artifacts.ts` using the artifact creation rule with export `quickSpecArtifacts`.

- [ ] Subtask 2.58
  Allowed files: `src/core/task/workflow-runtime/workflows/quick-spec/data.ts`
  Revision: Create `quick-spec/data.ts` using the data-asset creation rule with export `quickSpecDataAssets`.

- [ ] Subtask 2.59
  Allowed files: `src/core/task/workflow-runtime/workflows/quick-spec/definition.ts`
  Revision: Create `quick-spec/definition.ts` using the definition creation rule with export `quickSpecWorkflowDefinition`. Import `quickSpecArtifacts` and `quickSpecDataAssets`, set `workflowReminderText`, include Step 1 workflow-start requirements, and leave `workflowForms` and `deterministicResolvers` unset until Phase 6.

- [ ] Subtask 2.61
  Allowed files: `src/core/task/workflow-runtime/workflows/review-adversarial-general/definition.ts`
  Revision: Create `review-adversarial-general/definition.ts` using the definition creation rule with export `reviewAdversarialGeneralWorkflowDefinition`. Include Step 1 workflow-start requirements and do not add reminder, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.62
  Allowed files: `src/core/task/workflow-runtime/workflows/review-edge-case-hunter/definition.ts`
  Revision: Create `review-edge-case-hunter/definition.ts` using the definition creation rule with export `reviewEdgeCaseHunterWorkflowDefinition`. Include Step 1 workflow-start requirements and do not add reminder, artifacts, data assets, workflow forms, or deterministic resolvers.

- [ ] Subtask 2.75
  Allowed files: `src/core/task/workflow-runtime/workflows/write-remediation-story/definition.ts`
  Revision: Create `write-remediation-story/definition.ts` using the definition creation rule with export `writeRemediationStoryWorkflowDefinition`. Include Step 1 workflow-start requirements and leave `workflowForms` and `deterministicResolvers` unset until Phase 6.

## Extracted Workflow-Specific Phase 6 Subtasks

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
