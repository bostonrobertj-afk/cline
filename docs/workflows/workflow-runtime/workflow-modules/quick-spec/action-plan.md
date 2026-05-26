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

This plan builds and registers the product-owned `quick-spec` workflow module described by [quick-spec-requirements.md](./quick-spec-requirements.md).

The module produces one runtime-owned singleton project artifact, `quick-spec.md`, in the selected project's `planning` folder. Step 1 is runtime-driven and renders one workflow form after entry artifact resolution. Steps 2 and 3 are model-driven progress-gated steps. Step 4 is the final model-driven completion step and is the only quick-spec step that exposes `use_subagents`.

Approved implementation decisions derived from the requirements and module build guide:

- The new `quick_spec` artifact family is runtime-owned in `artifactFamilies.ts`, `types.ts`, and `WorkflowRuntime.ts` singleton-family resolution switches.
- The quick-spec module owns metadata, persona, form definition, prompts, decision trees, document shell rendering, and tool-schema selection.
- The quick-spec tool schemas resolve normal shared/default tools through `ClineToolSet.getToolByNameWithFallback(..., ModelFamily.NATIVE_GPT_5)`.
- The Step 2 conditional prompt uses named section assembly and must not render source-authoring conditional markers.
- The module defines no AI-writable workflow values, no `prerequisiteFiles`, no child workflow activation, no specialized backend tools, and no markdown filename activation alias.

## Scope Boundary

- Do not edit `docs/workflows/workflow-runtime/requirements.md` in this plan.
- Do not edit `/Users/robertboston/Documents/Cline/Workflows/quick-spec.md`.
- Do not edit or delete `.cline/skills/bmad-quick-spec/**/*`.
- Do not read source markdown, BMAD files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or legacy workflow assets at runtime.
- Do not add a quick-spec project requirements task or project requirements validation subtask.
- Do not expose `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `write_to_file`, or `build_tech_spec_document` in any quick-spec model-facing schema.
- Do not preserve `quick-spec.md` as a workflow name, slash-command alias, or use-skill alias.
- Do not add exact full-prose prompt snapshot assertions for editable prompt text; use prompt shape, materialized workflow-value, forbidden-marker, and projected-tool invariants.

## Verified Live Status

- `src/shared/build-tech-spec-document.ts` exists and is the only live non-test TypeScript source reference to legacy `build-tech-spec-document` behavior.
- `src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts` is absent; no deletion task is prescribed for that missing file.
- `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts` is absent; no edit task is prescribed for that missing file.
- `src/core/task/workflow-runtime/workflow-modules/quick-spec/` does not exist in runtime source and must be created by this plan.

## Known Issues / Risks / Technical Debt

- `npm run check-types` may fail before TypeScript checking if generated proto files are missing or host probing fails. If that happens, run `npm run protos`, then rerun the exact blocked `npm run check-types` command before treating the failure as a code defect.
- The current workflow-module pattern stores module-owned prompt and workflow-form copy in TypeScript constants instead of a string resource system. This plan follows the established runtime workflow-module pattern.

## Tasks / Subtasks

### Phase 1 - Runtime Artifact Family Support

Relevant requirements: Runtime Artifacts And Output Documents, Expected Implementation Surfaces, Testing Requirements, Validation Requirements.

After completing this phase, pause for QA review before moving to Phase 2.

[x] Task 1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`, register the runtime-owned quick-spec singleton artifact family.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 1.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`, add enum member `QuickSpec = "quick_spec"` immediately after `ArchitectureDocument = "architecture_document"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 1.2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`, add `| WorkflowArtifactFamily.QuickSpec` to `WorkflowSingletonProjectArtifactFamilyDefinition.family` and add `| "quick_spec"` to `WorkflowSingletonProjectArtifactFamilyDefinition.singletonIdentity`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 1.3: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`, add this registry entry immediately after `[WorkflowArtifactFamily.ArchitectureDocument]`: `{ family: WorkflowArtifactFamily.QuickSpec, allocationMode: "singleton_project", identityRequirement: "none", filenamePattern: "quick-spec.md", fileExtension: ".md", contentKind: "markdown", numberingScope: "project_singleton", singletonIdentity: "quick_spec", discoveryPattern: /^quick-spec\.md$/ }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/artifactFamilies.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[x] Task 2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts` and `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`, extend the workflow artifact definition union and runtime singleton-family switch logic for quick-spec singleton artifacts.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 2.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`, add `| WorkflowArtifactFamily.QuickSpec` to the first `WorkflowArtifactDefinition` union member's `family` union that currently includes `WorkflowArtifactFamily.Epics`, `WorkflowArtifactFamily.EpicsIndex`, `WorkflowArtifactFamily.BrainstormingSession`, and `WorkflowArtifactFamily.ArchitectureDocument`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 2.2: In `WorkflowRuntime.ts`, in `normalizeExistingProjectArtifactIdentity(...)`, add `case WorkflowArtifactFamily.QuickSpec:` immediately after `case WorkflowArtifactFamily.ArchitectureDocument:` so quick-spec uses the existing singleton identity comparison branch.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 2.3: In `WorkflowRuntime.ts`, in `resolveWorkflowArtifactIdentity(...)`, add `case WorkflowArtifactFamily.QuickSpec:` immediately after `case WorkflowArtifactFamily.ArchitectureDocument:` so quick-spec uses the existing singleton allocation branch that returns `artifactIdentity: args.familyDefinition.singletonIdentity`, `parentIdentity: undefined`, and `targetIdentity: undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 2.4: In `WorkflowRuntime.ts`, in `parseWorkflowArtifactFilenameIdentity(...)`, add `case WorkflowArtifactFamily.QuickSpec:` immediately after `case WorkflowArtifactFamily.ArchitectureDocument:` so quick-spec is treated as a singleton/no-parsed-identity artifact and returns `undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[x] Task 3: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add runtime artifact-family coverage for `quick_spec`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 3.1: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, in the `allocates and creates canonical workflow artifacts with persisted output values` test, add `const quickSpecKeys = createStandaloneArtifactOutputValueKeys("quick_spec")`; include `quickSpecKeys` in `collectArtifactOutputWorkflowValueKeys(...)`; add artifact definition key `quick_spec_doc` with `id: "quick_spec_doc"`, `family: WorkflowArtifactFamily.QuickSpec`, `intentMode: "new"`, `parentIdentitySource: undefined`, `targetIdentitySource: undefined`, and `outputValueKeys: quickSpecKeys`; call `runtime.createWorkflowArtifact({ taskState, artifactId: "quick_spec_doc", expectedArtifactAbsolutePath: undefined })`; assert the result includes `artifactIdentity: "quick_spec"`, `artifactFilename: "quick-spec.md"`, `artifactRelativePath: join("planning", "quick-spec.md")`, `artifactAbsolutePath: join(cwd, "docs", "projects", "artifact-allocation-project", "planning", "quick-spec.md")`, `parentIdentity: undefined`, and `targetIdentity: undefined`; call `await access(quickSpecResult.artifactAbsolutePath)`; and assert active workflow values include `[quickSpecKeys.artifactFamily]: WorkflowArtifactFamily.QuickSpec`, `[quickSpecKeys.artifactIdentity]: "quick_spec"`, and `[quickSpecKeys.artifactFilename]: "quick-spec.md"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 3.2: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add a test named `allocates the quick-spec singleton artifact in planning and maps its absolute path to output_document`. The test must create `const quickSpecKeys = { ...createStandaloneArtifactOutputValueKeys("quick_spec"), artifactAbsolutePath: "output_document" }`, create a workflow with `projectSubfolder: "planning"`, `workflowValueKeys: collectArtifactOutputWorkflowValueKeys(quickSpecKeys)`, and artifact `quick_spec` using `WorkflowArtifactFamily.QuickSpec`; activate it, submit new project selection `"Quick Spec Artifact Project"`, call `runtime.createWorkflowArtifact({ taskState, artifactId: "quick_spec", expectedArtifactAbsolutePath: undefined })`, and assert the result includes identity `quick_spec`, filename `quick-spec.md`, relative path `join("planning", "quick-spec.md")`, absolute path `join(cwd, "docs", "projects", "quick-spec-artifact-project", "planning", "quick-spec.md")`, `parentIdentity: undefined`, and `targetIdentity: undefined`. The test must assert workflow values include `[quickSpecKeys.artifactFamily]: WorkflowArtifactFamily.QuickSpec`, `[quickSpecKeys.artifactIdentity]: "quick_spec"`, `[quickSpecKeys.artifactFilename]: "quick-spec.md"`, and `output_document: artifactAbsolutePath`, then call `await access(artifactAbsolutePath)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[x] Task 4: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`, run Phase 1 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 4.1: Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 4.2: Run `npm run check-types`. If it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` before treating the failure as a code defect.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 4.3: Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 4.4: Run `git diff --name-only` and `git ls-files --others --exclude-standard`; confirm persistent diffs and untracked files are limited to Phase 1 authorized files: `src/core/task/workflow-runtime/artifactFamilies.ts`, `src/core/task/workflow-runtime/types.ts`, `src/core/task/workflow-runtime/WorkflowRuntime.ts`, `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, and this action plan.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

### Phase 2 - Quick Spec Document Builder

Relevant requirements: Runtime Artifacts And Output Documents, Source Verbiage Fidelity, Expected Implementation Surfaces, Testing Requirements, Validation Requirements.

After completing this phase, pause for QA review before moving to Phase 3.

[x] Task 5: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecDocument.ts`, add the module-owned initial quick-spec document builder.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecDocument.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 5.1: Create `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecDocument.ts` with no imports.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecDocument.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 5.2: In `quickSpecDocument.ts`, export heading constants with exact names and values: `QUICK_SPEC_DOCUMENT_HEADING_PRODUCT_VISION = "Product Vision"`, `QUICK_SPEC_DOCUMENT_HEADING_USER_CONTEXT = "User Context"`, `QUICK_SPEC_DOCUMENT_HEADING_PROJECT_SCOPE = "Project Scope"`, `QUICK_SPEC_DOCUMENT_HEADING_BOUNDARIES_CONSTRAINTS = "Boundaries & Constraints"`, `QUICK_SPEC_DOCUMENT_HEADING_TECHNICAL_DECISIONS = "Technical Decisions"`, `QUICK_SPEC_DOCUMENT_HEADING_SOLUTION_OVERVIEW = "Solution Overview"`, `QUICK_SPEC_DOCUMENT_HEADING_ACCEPTANCE_CRITERIA = "Acceptance Criteria"`, `QUICK_SPEC_DOCUMENT_HEADING_CODE_MAP = "Code Map"`, `QUICK_SPEC_DOCUMENT_HEADING_SEQUENCING = "Sequencing"`, `QUICK_SPEC_DOCUMENT_HEADING_DEV_AGENT_INSTRUCTIONS = "Dev Agent Instructions"`, and `QUICK_SPEC_DOCUMENT_HEADING_IMPLEMENTATION_PHASES = "Implementation Phases"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecDocument.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 5.3: In `quickSpecDocument.ts`, export `QUICK_SPEC_DOCUMENT_HEADINGS: readonly string[]` in this exact order: `QUICK_SPEC_DOCUMENT_HEADING_PRODUCT_VISION`, `QUICK_SPEC_DOCUMENT_HEADING_USER_CONTEXT`, `QUICK_SPEC_DOCUMENT_HEADING_PROJECT_SCOPE`, `QUICK_SPEC_DOCUMENT_HEADING_BOUNDARIES_CONSTRAINTS`, `QUICK_SPEC_DOCUMENT_HEADING_TECHNICAL_DECISIONS`, `QUICK_SPEC_DOCUMENT_HEADING_SOLUTION_OVERVIEW`, `QUICK_SPEC_DOCUMENT_HEADING_ACCEPTANCE_CRITERIA`, `QUICK_SPEC_DOCUMENT_HEADING_CODE_MAP`, `QUICK_SPEC_DOCUMENT_HEADING_SEQUENCING`, `QUICK_SPEC_DOCUMENT_HEADING_DEV_AGENT_INSTRUCTIONS`, `QUICK_SPEC_DOCUMENT_HEADING_IMPLEMENTATION_PHASES`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecDocument.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 5.4: In `quickSpecDocument.ts`, export `function buildInitialQuickSpecDocument(): string` returning `` `${QUICK_SPEC_DOCUMENT_HEADINGS.map((heading) => `# ${heading}`).join("\n\n")}\n` ``. Do not read files, import markdown templates, import `.cline/skills`, import `fs`, import `path`, add frontmatter, add title/slug/date/status fields, or reference `tech-spec-wip.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecDocument.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[x] Task 6: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`, add focused quick-spec document builder tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 6.1: Create `quickSpecDocument.test.ts` with imports `expect` from `chai`, `describe` and `it` from `mocha`, and `QUICK_SPEC_DOCUMENT_HEADINGS` plus `buildInitialQuickSpecDocument` from `../quickSpecDocument`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 6.2: In `quickSpecDocument.test.ts`, add `const EXPECTED_INITIAL_QUICK_SPEC_DOCUMENT` with this exact string value:

```ts
`# Product Vision

# User Context

# Project Scope

# Boundaries & Constraints

# Technical Decisions

# Solution Overview

# Acceptance Criteria

# Code Map

# Sequencing

# Dev Agent Instructions

# Implementation Phases
`
```

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 6.3: In `quickSpecDocument.test.ts`, add a test named `builds the initial quick-spec heading shell exactly` asserting `buildInitialQuickSpecDocument()` equals `EXPECTED_INITIAL_QUICK_SPEC_DOCUMENT`, `buildInitialQuickSpecDocument().match(/^# /gm)` has length `QUICK_SPEC_DOCUMENT_HEADINGS.length`, and `QUICK_SPEC_DOCUMENT_HEADINGS` deep-equals `["Product Vision", "User Context", "Project Scope", "Boundaries & Constraints", "Technical Decisions", "Solution Overview", "Acceptance Criteria", "Code Map", "Sequencing", "Dev Agent Instructions", "Implementation Phases"]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 6.4: In `quickSpecDocument.test.ts`, add a test named `does not preserve legacy quick-spec scaffold text` asserting the generated document does not include any of these strings: `"tech-spec-wip.md"`, `"title:"`, `"slug:"`, `"date:"`, `"status:"`, `"quick-spec.md"`, `"*** begin quick spec template example ***"`, and `"*** end quick spec template example ***"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[x] Task 7: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`, run Phase 2 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 7.1: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 7.2: Run `npm run check-types`. If it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` before treating the failure as a code defect.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 7.3: Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 7.4: Run `rg -n "fs|readFile|readFileSync|\\.cline/skills|quick-spec\\.md|tech-spec-wip\\.md|title:|slug:|date:|status:" src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecDocument.ts` and confirm it returns no matches; exit code `1` with no output is success for this no-match guard.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [x] Subtask 7.5: Run `git diff --name-only` and `git ls-files --others --exclude-standard`; confirm persistent diffs and untracked files are limited to Phase 1 and Phase 2 authorized files: `src/core/task/workflow-runtime/artifactFamilies.ts`, `src/core/task/workflow-runtime/types.ts`, `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecDocument.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`, and this action plan.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

### Phase 3 - Quick Spec Tool Schemas

Relevant requirements: Tool Schema Requirements, Decision Tree Requirements, Expected Implementation Surfaces, Testing Requirements, Validation Requirements.

After completing this phase, pause for QA review before moving to Phase 4.

[ ] Task 8: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts`, add quick-spec shared/default tool-schema builders.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 8.1: Create `quickSpecToolSchemas.ts` with exactly these imports: `ClineToolSet` from `@/core/prompts/system-prompt/registry/ClineToolSet`, type `ClineToolSpec` from `@/core/prompts/system-prompt/spec`, `registerClineToolSets` from `@/core/prompts/system-prompt/tools/init`, `ModelFamily` from `@/shared/prompts`, and `ClineDefaultTool` from `@/shared/tools`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 8.2: In `quickSpecToolSchemas.ts`, add `const QUICK_SPEC_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5`; export `QUICK_SPEC_STEP_2_TOOL_IDS` with exact ordered array `[ClineDefaultTool.FILE_READ, ClineDefaultTool.FILE_READ_RANGE, ClineDefaultTool.LIST_FILES, ClineDefaultTool.SEARCH, ClineDefaultTool.LIST_CODE_DEF, ClineDefaultTool.APPLY_PATCH, ClineDefaultTool.SEND_USER_MESSAGE, ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST]`; export `QUICK_SPEC_STEP_3_TOOL_IDS` with the same exact ordered array; and export `QUICK_SPEC_STEP_4_TOOL_IDS` with exact ordered array `[ClineDefaultTool.FILE_READ, ClineDefaultTool.FILE_READ_RANGE, ClineDefaultTool.LIST_FILES, ClineDefaultTool.SEARCH, ClineDefaultTool.LIST_CODE_DEF, ClineDefaultTool.APPLY_PATCH, ClineDefaultTool.SEND_USER_MESSAGE, ClineDefaultTool.USE_SUBAGENTS, ClineDefaultTool.ATTEMPT]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 8.3: In `quickSpecToolSchemas.ts`, add `function resolveQuickSpecSharedToolSpec(toolId: ClineDefaultTool): ClineToolSpec` that calls `registerClineToolSets()`, assigns `const tool = ClineToolSet.getToolByNameWithFallback(toolId, QUICK_SPEC_TOOL_SCHEMA_VARIANT)`, throws `new Error(\`Missing shared/default tool schema for ${toolId}.\`)` when `tool === undefined`, and returns `tool.config`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 8.4: In `quickSpecToolSchemas.ts`, export `buildQuickSpecStep1ToolSchemas(): readonly ClineToolSpec[]` returning `[]`; export `buildQuickSpecStep2ToolSchemas(): readonly ClineToolSpec[]` returning `QUICK_SPEC_STEP_2_TOOL_IDS.map((toolId) => resolveQuickSpecSharedToolSpec(toolId))`; export `buildQuickSpecStep3ToolSchemas(): readonly ClineToolSpec[]` returning `QUICK_SPEC_STEP_3_TOOL_IDS.map((toolId) => resolveQuickSpecSharedToolSpec(toolId))`; and export `buildQuickSpecStep4ToolSchemas(): readonly ClineToolSpec[]` returning `QUICK_SPEC_STEP_4_TOOL_IDS.map((toolId) => resolveQuickSpecSharedToolSpec(toolId))`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[ ] Task 9: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts`, add focused quick-spec tool-schema tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 9.1: Create `quickSpecToolSchemas.test.ts` with imports `expect` from `chai`, `describe` and `it` from `mocha`, `ClineToolSet` from `@/core/prompts/system-prompt/registry/ClineToolSet`, type `ClineToolSpec` from `@/core/prompts/system-prompt/spec`, `registerClineToolSets` from `@/core/prompts/system-prompt/tools/init`, `ModelFamily` from `@/shared/prompts`, `ClineDefaultTool` from `@/shared/tools`, and `buildQuickSpecStep1ToolSchemas`, `buildQuickSpecStep2ToolSchemas`, `buildQuickSpecStep3ToolSchemas`, `buildQuickSpecStep4ToolSchemas`, `QUICK_SPEC_STEP_2_TOOL_IDS`, `QUICK_SPEC_STEP_3_TOOL_IDS`, and `QUICK_SPEC_STEP_4_TOOL_IDS` from `../quickSpecToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 9.2: In `quickSpecToolSchemas.test.ts`, add constants `STEP_2_AND_3_TOOL_NAMES = ["read_file", "read_file_range", "list_files", "search_files", "list_code_definition_names", "apply_patch", "send_user_message", "workflow_progress_request"]`, `STEP_4_TOOL_NAMES = ["read_file", "read_file_range", "list_files", "search_files", "list_code_definition_names", "apply_patch", "send_user_message", "use_subagents", "attempt_completion"]`, and `FORBIDDEN_MODEL_FACING_TOOL_NAMES = ["set_workflow_values", "build_workflow_document", "create_workflow_artifact", "archive_workflow_artifact", "delete_workflow_artifact", "move_workflow_project_file", "write_to_file", "build_tech_spec_document"]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 9.3: In `quickSpecToolSchemas.test.ts`, add helper `function schemaNames(schemas: readonly ClineToolSpec[]): readonly string[]` returning `schemas.map((schema) => schema.name)` and helper `function expectedSharedToolSpecs(toolIds: readonly ClineDefaultTool[]): readonly ClineToolSpec[]` that calls `registerClineToolSets()`, resolves each id with `ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)`, throws `new Error(\`Missing shared/default tool schema for ${toolId}.\`)` when undefined, and returns each `tool.config`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 9.4: In `quickSpecToolSchemas.test.ts`, add test `returns an empty model-facing schema for runtime-driven Step 1` with exact assertion `expect(buildQuickSpecStep1ToolSchemas()).to.deep.equal([])`. Add test `exposes the exact Step 2 shared/default tool schema order` assigning `const schemas = buildQuickSpecStep2ToolSchemas()` and asserting `schemaNames(schemas)` deep-equals `STEP_2_AND_3_TOOL_NAMES`. Add test `exposes the exact Step 3 shared/default tool schema order` assigning `const schemas = buildQuickSpecStep3ToolSchemas()` and asserting `schemaNames(schemas)` deep-equals `STEP_2_AND_3_TOOL_NAMES`. Add test `exposes the exact Step 4 shared/default tool schema order` assigning `const schemas = buildQuickSpecStep4ToolSchemas()` and asserting `schemaNames(schemas)` deep-equals `STEP_4_TOOL_NAMES`. Add test `uses shared default Step 2, Step 3, and Step 4 tool specs without module-owned schema prose` asserting `buildQuickSpecStep2ToolSchemas()` deep-equals `expectedSharedToolSpecs(QUICK_SPEC_STEP_2_TOOL_IDS)`, `buildQuickSpecStep3ToolSchemas()` deep-equals `expectedSharedToolSpecs(QUICK_SPEC_STEP_3_TOOL_IDS)`, and `buildQuickSpecStep4ToolSchemas()` deep-equals `expectedSharedToolSpecs(QUICK_SPEC_STEP_4_TOOL_IDS)`. Add test `uses only the approved Cline default tool ids` asserting `QUICK_SPEC_STEP_2_TOOL_IDS` deep-equals `[ClineDefaultTool.FILE_READ, ClineDefaultTool.FILE_READ_RANGE, ClineDefaultTool.LIST_FILES, ClineDefaultTool.SEARCH, ClineDefaultTool.LIST_CODE_DEF, ClineDefaultTool.APPLY_PATCH, ClineDefaultTool.SEND_USER_MESSAGE, ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST]`, `QUICK_SPEC_STEP_3_TOOL_IDS` deep-equals `[ClineDefaultTool.FILE_READ, ClineDefaultTool.FILE_READ_RANGE, ClineDefaultTool.LIST_FILES, ClineDefaultTool.SEARCH, ClineDefaultTool.LIST_CODE_DEF, ClineDefaultTool.APPLY_PATCH, ClineDefaultTool.SEND_USER_MESSAGE, ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST]`, and `QUICK_SPEC_STEP_4_TOOL_IDS` deep-equals `[ClineDefaultTool.FILE_READ, ClineDefaultTool.FILE_READ_RANGE, ClineDefaultTool.LIST_FILES, ClineDefaultTool.SEARCH, ClineDefaultTool.LIST_CODE_DEF, ClineDefaultTool.APPLY_PATCH, ClineDefaultTool.SEND_USER_MESSAGE, ClineDefaultTool.USE_SUBAGENTS, ClineDefaultTool.ATTEMPT]`. Add test `does not expose forbidden model-facing tools in any quick-spec step` assigning `const exposedNames = [...schemaNames(buildQuickSpecStep1ToolSchemas()), ...schemaNames(buildQuickSpecStep2ToolSchemas()), ...schemaNames(buildQuickSpecStep3ToolSchemas()), ...schemaNames(buildQuickSpecStep4ToolSchemas())]`, then for each `FORBIDDEN_MODEL_FACING_TOOL_NAMES` entry asserting `expect(exposedNames).to.not.include(forbiddenToolName)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[ ] Task 10: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`, run Phase 3 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 10.1: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 10.2: Run `npm run check-types`. If it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` before treating the failure as a code defect.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 10.3: Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 10.4: Run `rg -n "build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|set_workflow_values|write_to_file" src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts` and confirm it returns no matches; exit code `1` with no output is success for this no-match guard.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 10.5: Run `git diff --name-only` and `git ls-files --others --exclude-standard`; confirm persistent diffs and untracked files are limited to Phase 1, Phase 2, and Phase 3 authorized files: `src/core/task/workflow-runtime/artifactFamilies.ts`, `src/core/task/workflow-runtime/types.ts`, `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecDocument.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts`, and this action plan.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

### Phase 4 - Quick Spec Workflow Definition

Relevant requirements: Workflow Identity, Persona, Runtime-Owned Values, AI-Writable Workflow Values, Runtime Artifacts And Output Documents, Required Prerequisite Files, Entry And Steps, Step 1, Step 2, Step 3, Step 4, Decision Tree Requirements, Testing Requirements, Validation Requirements.

After completing this phase, pause for QA review before moving to Phase 5.

[ ] Task 11: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`, add quick-spec workflow identity, values, prompt constants, helper functions, form definition, decision trees, and `quickSpecWorkflowDefinition`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.1: Create `quickSpecWorkflow.ts` with exactly these imports: type `WorkflowFormDefinitionPayload` from `@shared/ExtensionMessage`; `WorkflowArtifactFamily` from `../../artifactFamilies`; type `WorkflowDecisionBranchTrigger`, `WorkflowDecisionTree`, `WorkflowDefinition`, `WorkflowPersonaDefinition`, `WorkflowPromptBuilderInput`, `WorkflowStepDefinition`, and `WorkflowStepPromptSource` from `../../types`; `buildInitialQuickSpecDocument` from `./quickSpecDocument`; and `buildQuickSpecStep1ToolSchemas`, `buildQuickSpecStep2ToolSchemas`, `buildQuickSpecStep3ToolSchemas`, and `buildQuickSpecStep4ToolSchemas` from `./quickSpecToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.2: In `quickSpecWorkflow.ts`, export constants `QUICK_SPEC_WORKFLOW_NAME = "quick-spec"`, `QUICK_SPEC_WORKFLOW_SLASH_COMMAND_NAME = "quick-spec"`, `QUICK_SPEC_WORKFLOW_USE_SKILL_NAME = "quick-spec"`, `QUICK_SPEC_WORKFLOW_DISPLAY_NAME = "quick spec"`, `QUICK_SPEC_WORKFLOW_PROJECT_SUBFOLDER = "planning"`, and `QUICK_SPEC_WORKFLOW_DESCRIPTION = "In this workflow, the agent builds a delivery spec for a small enhancement or update. This workflow is intended for limited-scope projects. For larger projects, use the standard workflow process beginning with the Create Architecture workflow."`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.3: In `quickSpecWorkflow.ts`, add `const QUICK_SPEC_ARTIFACT_ID = "quick_spec"`; `const STEP_1_INPUT_FORM_ID = "step-1-quick-spec-input-form"`; `const STEP_1_EXISTING_DOCUMENTATION_PANEL_ID = "step-1-existing-documentation-panel"`; `const STEP_1_DOCUMENTATION_FILE_PATHS_PANEL_ID = "step-1-documentation-file-paths-panel"`; and `const STEP_1_VISION_STATEMENT_PANEL_ID = "step-1-vision-statement-panel"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.4: In `quickSpecWorkflow.ts`, export `QUICK_SPEC_WORKFLOW_PERSONA: WorkflowPersonaDefinition` with exact fields `{ name: "Bob", role: "Scrum Master", identity: "A pragmatic scrum master with a background in software development", communicationStyle: "crisp, checklist-driven, and ambiguity-free.", capabilities: ["translating user vision into a delivery spec via interviews and codebase assessment"], principles: ["bridging the gap between stakeholder vision and product reality requires patience and diligence."] }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.5: In `quickSpecWorkflow.ts`, export enum `QuickSpecWorkflowValueKey` with exact members `ProjectMode = "projectMode"`, `ProjectTitle = "projectTitle"`, `ProjectFolderName = "projectFolderName"`, `AdditionalContext = "additional_context"`, `VisionStatement = "vision_statement"`, `OutputDocument = "output_document"`, `OutputArtifactFamily = "output_artifact_family"`, `OutputArtifactIdentity = "output_artifact_identity"`, `OutputArtifactFilename = "output_artifact_filename"`, and `OutputArtifactRelativePath = "output_artifact_relative_path"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.6: In `quickSpecWorkflow.ts`, export `QUICK_SPEC_WORKFLOW_VALUE_KEYS: readonly QuickSpecWorkflowValueKey[]` with every enum member from Subtask 11.5 in enum order, and export `QUICK_SPEC_ENTRY_PROJECT_VALUE_KEYS = { projectMode: QuickSpecWorkflowValueKey.ProjectMode, projectTitle: QuickSpecWorkflowValueKey.ProjectTitle, projectFolderName: QuickSpecWorkflowValueKey.ProjectFolderName }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.7: In `quickSpecWorkflow.ts`, add Step 2 prompt constants with these exact string values and section boundaries:

`QUICK_SPEC_STEP_2_READ_LIST_WITH_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE`:

```text
You have been called inside a Quick Spec workflow. Your role is to assist the user in building out a delivery spec for a limited-scope project.
Read the following:
- {workflow.output_document}
- {workflow.additional_context}
```

`QUICK_SPEC_STEP_2_READ_LIST_WITHOUT_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE`:

```text
You have been called inside a Quick Spec workflow. Your role is to assist the user in building out a delivery spec for a limited-scope project.
Read the following:
- {workflow.output_document}
```

`QUICK_SPEC_STEP_2_MIDDLE_PROMPT_TEMPLATE`:

```text
The system generated the spec file for you from a standardized template here:
- {workflow.output_document}

The user provided a vision statement for this product update:
{workflow.vision_statement}

Review the vision statement and add it to the spec file under the "Product Vision" Heading.
```

`QUICK_SPEC_STEP_2_ADDITIONAL_CONTEXT_DOCUMENT_UPDATE_SENTENCE`:

```text
Add the additional context provided to the spec file under the "User Context" heading.
```

`QUICK_SPEC_STEP_2_FINAL_PROMPT_TEMPLATE`:

```text
Next, inform the user that the first step is to develop a buildable solution from the product vision, starting by defining the boundaries and constraints. Aid the user in defining the project's scope, boundaries, and constraints, assessing runtime code where necessary, and updating {workflow.output_document} to reflect decisions under the "Project Scope" and "Boundaries & Constraints" headings.

Once scope, boundaries, and constraints are clear, inform the user that the next step is to document any technical decisions needed to inform the solution. Identify any technical solutions relevant to the project, gain alignment from the user, then update the "Technical Decisions" section of {workflow.output_document} to reflect the approved technical decisions.

Do not touch any of the sections in the spec file beyond the "Technical Decisions" section in this step. Instructions for populating the remaining sections will be provided in later workflow steps.

Once the spec file is complete up to and including the "Technical Decisions" section, call workflow_progress_request to unlock the next step's instructions.
```

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.8: In `quickSpecWorkflow.ts`, add `const QUICK_SPEC_STEP_3_PROMPT_TEMPLATE` with this exact string value:

```text
The next step is to capture the solution overview based on what was added to {workflow.output_document} in step 2. Work with the user to draft an approved solution overview, then add it to the spec file under the "Solution Overview" heading.

Once the solution overview is complete, inform the user that you will scan the codebase to identify the seams which must be touched during implementation, then review runtime code & test configuration to identify all revisions necessary to deliver the intended solution. Add content to {workflow.output_document} under the "Code Map" heading indicating all surfaces which must be touched during implementation with guidance on what needs to be added, removed, or updated.

After reviewing code and populating the "Code Map" section in the spec file, notify the user that you've mapped the solution to it's implementation seams and provide them with the content you added to the "Code Map" section of the spec file. Revise or expand as needed based on their feedback before moving on. Once the use approves the code map content, move on.

Lastly, inform the user that you'll identify the correct implementation sequence based on the code map and dependencies within the codebase. Review the surfaces to be touched based on the code map, identify where dependencies exist, and populate the "Sequencing" section of {workflow.output_document} with a suggested implementation sequence. Then provide the user with the sequencing content and adjust as needed based on their feedback.

Once the user approves the content under the spec file's "Sequencing" heading, call workflow_progress_request to unlock the next workflow step's instructions.
```

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.9: In `quickSpecWorkflow.ts`, add `const QUICK_SPEC_STEP_4_PROMPT_TEMPLATE` with this exact string value:

```text
Next, inform the user that the next step is to divide the work into tightly-scoped seams if needed to make identifying tasks and subtasks easier later. Offer to review what has been captured so far and provide a recommendation. 

*** Determine Task-Discovery Strategy ***
Review {workflow.output_document}, perform any code review necessary (limiting this to only where it is truly necessary) then decide whether this work should be planned as a single story or divided into separate stories.

Keep the work as a single phase when:
- the implementation can be understood as one coherent change slice
- the required revisions cannot be divided into compile-safe chunks
- the affected code follows one primary execution path or one tightly-coupled vertical slice
- likely file touches, tests, typing changes, and wiring impacts can be understood together without separate investigations
- one bounded `Tasks / Subtasks` plan can be authored without splitting file ownership or seam boundaries

Break the work into multiple phases when:
- there are 2 or more independently traceable implementation slices
- the work can be divided into compile-safe chunks
- different layers or subsystems require separate repo exploration
- different task groups would naturally require different allowed-files boundaries
- one seam can be analyzed and planned without reading the others in full
- keeping the work as one seam would force broad repo exploration before executable task blocks can be written

Do not break work into multiple phases if the split would create overlapping file ownership, duplicate investigation, or artificial task boundaries.

Share your recommendation for how this project should be divided into implementation phases (if at all), then capture the phase(s) under the "implementation phases" heading in {workflow.output_document}.

Next, inform the user that you will use subagents to quickly identify the exact steps necessary to execute this project, including file and line targets. Then, launch a subagent for each phase, up to four subagents at a time. Provide the spec file's file path to each subagent ({workflow.output_document}) and provide them with clear direction regarding the phase they are assigned to.
Subagents must:
- Confirm the exact runtime code and test revisions necessary to deliver their assigned phase
- Identify the exact code revisions necessary during implementation
- Trace relevant seams end-to-end
- Assess types, interfaces, schemas, validators, imports, and exports to ensure comprehensive task coverage
- Respond with a full set of required revisions including full file path for target files

Once subagents have delivered their output to you, use their responses to build out the implementation phase(s) under the spec file's "Implementation Phases" heading, following these rules exactly:

ACCEPTANCE CRITERIA TRACE:
For each requirement, identify
- Exact required behavior.
- Exact user-facing, terminal-error, panel, option, tool, or schema text
- Required persisted values, artifacts, routes, actions, fixtures, and validation coverage.
- Owning runtime, module, test, documentation, and validation files.

LIVE CONTRACT INSPECTION:
For each affected file, verify the live contract before drafting subtasks:
- Existing imports and exports.
- Helper names, signatures, return types, and call sites.
- Type definitions, discriminated unions, required fields, and narrowing requirements.
- Constructor, method, action, route, event, session, and fixture object shapes.
- Existing assertions and validation commands.
- Existing files and exact paths for every command.
Every referenced symbol must be classified as one of:
- Existing symbol verified in live code.
- New symbol created earlier in the same phase.
- Invalid and requiring rewrite before the plan can be used.

CONFIRM IMPLEMENTATION METHOD:
Use the content in the spec file and any available repo documentation (readmes, etc) to determine the approved implementation method.
If more than one implementation method is viable and the approved documents do not clearly select one, stop and ask the user to choose.
Do not invent architecture, compatibility bridges, aliases, fallback paths, or legacy preservation unless requirements explicitly approve them.

DRAFT TASKS & SUBTASKS:
Tasks and subtasks must be sequentially numbered.
Tasks may summarize a file or capability area. Subtasks must prescribe exact changes.
Each task or subtask must include:
- Full target file path.
- Allowed files list.
- One exact prescribed revision unless subordinate subtasks split the work.
- Exact imports to add or remove.
- Exact helper/function/type/object shape.
- Exact required narrowing before union-field access.
- Exact fixture/session/action/event shape.
- Exact assertions for stable machine-consumed contracts.
- Exact raw-placeholder negative assertions for required prompt placeholders.
- Exact cleanup of now-unused imports, helpers, exports, fixtures, assertions, and validation guards.

Do not use vague phrases such as:
- "all helpers"
- "matching sibling pattern"
- "equivalent shape"
- "update tests"
- "as needed"
- "fixture like the existing one"
- "all exported constants"
- "each static branch template"
Name every symbol, constant, fixture, assertion, and command exactly.

DELTA FALLOUT PASS:
After drafting each task, inspect the consequences of every prescribed change.
For every deletion, replacement, de-parameterization, signature change, type change, or removed call site, prescribe cleanup for:
- Now-unused imports.
- Dead helpers.
- Dead exports.
- Stale fixture fields.
- Stale test assertions.
- Stale validation guards.
- Scope-diff allowlists.
Validation commands do not replace this pass. It is a guide violation to rely on typecheck, lint, or implementation-time discovery to find fallout.

DRAFT VALIDATION:
Validation must be exact and repo-supported.
Include:
- Focused tests for touched runtime and test layers.
- Typecheck.
- Lint or formatting gate required by the repo.
- Package/build validation when required by project guidance.
- Static guards only for approved forbidden legacy concepts or regression risks.
- Scope diff using both `git diff --name-only` and `git ls-files --others --exclude-standard`.
If a command path does not exist, rewrite the validation command before completing the plan.

COMPLIANCE MATRIX:
Before reporting completion, audit every task and subtask with this matrix:

| Task/Subtask | Requirement Source | Target File | Symbols Verified | Live Contract Verified | Fallout Cleanup Prescribed | Validation Coverage |
| --- | --- | --- | --- | --- | --- | --- |

Every row must be complete. If any row requires inference by the implementing agent, rewrite the task or subtask.

FINAL LINE-BY-LINE AUDIT:
Re-read each phase from top to bottom.
For each task and subtask, confirm:
- It is backed by the spec file's acceptance criteria, project scope, technical decisions, and/or solution overview
- It is compile-safe.
- It has exact imports and cleanup.
- It has exact fixture/action/session shapes.
- It has exact assertions where stable contracts are involved.
- It does not invent prose.
- It does not preserve unauthorized legacy behavior.
- It does not require the dev agent to infer implementation details.

DEV AGENT INSTRUCTIONS:
Add this exact content to the "Dev Agent Instructions" section of {workflow.output_document}. Do not paraphrase or invent additional instructions.
Required instructions:
- Read this plan from top to bottom before making any changes.
- Read each task and subtask in full immediately before executing it.
- Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.
  - Exception: You may execute multiple sequential subtasks with one patch only if they are scoped to the same file, but must review each subtask vs the landed code after the patch to ensure that every subtask was implemented exactly as prescribed before marking the subtask as complete.
  - After completing a task or subtask, update that step's checkbox from "[ ]" to "[x]".
- Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
- Do not edit any file not listed in the current step's allowed-files list.
- If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.
- Implement tasks and subtasks exactly as instructed. If deviation seems necessary, stop, inform the user, and explain why you believe the task or subtask should be carried out differently than prescribed.

Once you've authored the implementation phases, audited and reviewed them, and added the prescribed agent instructions, notify the user that you've completed the implementation document. Provide them with the full file path for the document ({workflow.output_document}), and ask them to review. Adjust as needed based on their feedback. Once the user approves the drafted content, call attempt_completion and provide a final recap before the workflow automatically concludes.
```

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.10: In `quickSpecWorkflow.ts`, add helper `function buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"]` returning `{ type: "conditional", conditionSourceKey: "__terminal__", branches: [], defaultTerminal: true }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.11: In `quickSpecWorkflow.ts`, add helper `function buildStep1InputWorkflowForm(): WorkflowFormDefinitionPayload` returning one form with `definitionVersion: 2`, `title: "Gather Context & Generate Spec Document"`, `toolDictionaryTitle: "Gather Context & Generate Spec Document"`, `toolDictionaryMarkdown: QUICK_SPEC_WORKFLOW_DESCRIPTION`, `firstPanelId: STEP_1_EXISTING_DOCUMENTATION_PANEL_ID`, and exactly three panels keyed by `STEP_1_EXISTING_DOCUMENTATION_PANEL_ID`, `STEP_1_DOCUMENTATION_FILE_PATHS_PANEL_ID`, and `STEP_1_VISION_STATEMENT_PANEL_ID`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.12: In `buildStep1InputWorkflowForm()`, implement Panel A exactly: `panelId: STEP_1_EXISTING_DOCUMENTATION_PANEL_ID`, `title: "Existing Documentation"`, `promptMarkdown: "Would you like to provide any existing documentation as context?"`, one field `{ key: "has_existing_documentation", kind: "boolean", label: "Existing Documentation", required: true, allowedValueType: "boolean", trueLabel: "yes", falseLabel: "no" }` with no `workflowValueKey`, `allowedActions: ["submit"]`, `actionLabels: { submit: "continue" }`, and conditional transition with `conditionSourceKey: "has_existing_documentation"`, true branch next panel `STEP_1_DOCUMENTATION_FILE_PATHS_PANEL_ID`, false branch next panel `STEP_1_VISION_STATEMENT_PANEL_ID` plus `staleValueKeysToClear: [QuickSpecWorkflowValueKey.AdditionalContext]`, and `defaultNextPanelId: STEP_1_VISION_STATEMENT_PANEL_ID`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.13: In `buildStep1InputWorkflowForm()`, implement Panel B exactly: `panelId: STEP_1_DOCUMENTATION_FILE_PATHS_PANEL_ID`, `title: "Documentation File Paths"`, `promptMarkdown: "Please provide the full file path(s) for any documentation you'd like to use as context."`, one field `{ key: QuickSpecWorkflowValueKey.AdditionalContext, workflowValueKey: QuickSpecWorkflowValueKey.AdditionalContext, kind: "large_text", label: "Documentation File Paths", required: true, allowedValueType: "string", presentation: { textareaSize: "large" } }`, `allowedActions: ["submit", "back"]`, `actionLabels: { submit: "continue", back: "back" }`, `backDestinationPanelId: STEP_1_EXISTING_DOCUMENTATION_PANEL_ID`, and sequential transition to `STEP_1_VISION_STATEMENT_PANEL_ID`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.14: In `buildStep1InputWorkflowForm()`, implement Panel C exactly: `panelId: STEP_1_VISION_STATEMENT_PANEL_ID`, `title: "Vision Statement"`, `promptMarkdown: "Please describe what you'd like to achieve with this update."`, one field `{ key: QuickSpecWorkflowValueKey.VisionStatement, workflowValueKey: QuickSpecWorkflowValueKey.VisionStatement, kind: "large_text", label: "Vision Statement", required: true, allowedValueType: "string", presentation: { textareaSize: "large" } }`, `allowedActions: ["submit", "back"]`, `actionLabels: { submit: "Continue", back: "Back" }`, `backDestinationPanelId: STEP_1_EXISTING_DOCUMENTATION_PANEL_ID`, and `transition: buildTerminalTransition()`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.15: In `quickSpecWorkflow.ts`, add the following helper bodies exactly:

```ts
function sourceRouteMatches(sourceRoute: { branchId: string; routeId: string }, branchId: string, routeId: string): boolean {
	return sourceRoute.branchId === branchId && sourceRoute.routeId === routeId
}

function toolBackedOperationSucceeded(branchId: string, routeId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "tool_backed_operation_succeeded" &&
			sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId),
	}
}

function toolBackedOperationFailed(branchId: string, routeId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "tool_backed_operation_failed" &&
			sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId),
	}
}

function entryArtifactResolutionCompletedWithCreationRequired(
	creationRequired: boolean,
): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "entry_artifact_resolution_completed" &&
			triggerEvent.artifactResolutions.some(
				(artifactResolution) =>
					artifactResolution.artifactId === QUICK_SPEC_ARTIFACT_ID &&
					artifactResolution.creationRequired === creationRequired,
			),
	}
}

function workflowFormCompleted(workflowFormId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_form_completed" && triggerEvent.workflowFormId === workflowFormId,
	}
}

function workflowProgressRequestConfirmed(): WorkflowDecisionBranchTrigger {
	return {
		kind: "on_event",
		eventKind: "workflow_progress_request_confirmed",
	}
}

function workflowProgressRequestDenied(): WorkflowDecisionBranchTrigger {
	return {
		kind: "on_event",
		eventKind: "workflow_progress_request_denied",
	}
}

function attemptCompletionSucceeded(): WorkflowDecisionBranchTrigger {
	return {
		kind: "on_event",
		eventKind: "attempt_completion_succeeded",
	}
}
```

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.16: In `quickSpecWorkflow.ts`, add `function readTrimmedWorkflowStringValue(input: WorkflowPromptBuilderInput, key: QuickSpecWorkflowValueKey): string | undefined` that reads `input.session.workflowValues[key]`, returns `undefined` unless the value is a string with `trim().length > 0`, and returns the trimmed string only for non-empty strings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.17: In `quickSpecWorkflow.ts`, add `function createEmptyPromptSource(): WorkflowStepPromptSource` returning `{ kind: "none" }` and `function createStepDefinition(args: { stepNumber: number; checklistLabel: string; decisionTree: WorkflowDecisionTree; buildPromptSource?: WorkflowStepDefinition["buildPromptSource"]; promptTemplates?: WorkflowStepDefinition["promptTemplates"]; buildToolSchema: WorkflowStepDefinition["buildToolSchema"] }): WorkflowStepDefinition`. `createStepDefinition` must construct `id: \`step-${args.stepNumber}\``, use `args.buildPromptSource ?? createEmptyPromptSource`, use `args.buildToolSchema` without fallback arrays, preserve `promptTemplates` when provided, and return the constructed `WorkflowStepDefinition`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.18: In `quickSpecWorkflow.ts`, add `function buildStep1DecisionTree(): WorkflowDecisionTree` with `entryBranchId: "step-1-resolve-entry-artifact"`. The `step-1-resolve-entry-artifact` branch must have route `step-1-allocate-artifact` triggered by `entryArtifactResolutionCompletedWithCreationRequired(true)` with action `{ kind: "allocate_artifact", artifactId: QUICK_SPEC_ARTIFACT_ID }` and following branch `step-1-await-allocation`, plus route `step-1-render-existing-artifact-input-form` triggered by `entryArtifactResolutionCompletedWithCreationRequired(false)` with action `{ kind: "render_workflow_form", workflowFormId: STEP_1_INPUT_FORM_ID, startPanelId: STEP_1_EXISTING_DOCUMENTATION_PANEL_ID }` and following branch `step-1-await-input-form`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.19: In `buildStep1DecisionTree()`, add branch `step-1-await-allocation` with route `step-1-build-initial-shell` triggered by `toolBackedOperationSucceeded("step-1-resolve-entry-artifact", "step-1-allocate-artifact")`, action `{ kind: "build_workflow_document", instruction: { artifactId: QUICK_SPEC_ARTIFACT_ID, buildContent: buildInitialQuickSpecDocument } }`, and following branch `step-1-await-initial-shell`; and route `step-1-retry-allocate-artifact` triggered by `toolBackedOperationFailed("step-1-resolve-entry-artifact", "step-1-allocate-artifact")`, action `{ kind: "allocate_artifact", artifactId: QUICK_SPEC_ARTIFACT_ID }`, and following branch `step-1-await-retry-allocation`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.20: In `buildStep1DecisionTree()`, add branch `step-1-await-retry-allocation` with route `step-1-build-initial-shell-after-retry` triggered by `toolBackedOperationSucceeded("step-1-await-allocation", "step-1-retry-allocate-artifact")`, action `{ kind: "build_workflow_document", instruction: { artifactId: QUICK_SPEC_ARTIFACT_ID, buildContent: buildInitialQuickSpecDocument } }`, and following branch `step-1-await-initial-shell`; and route `step-1-terminal-error-after-retry-allocation` triggered by `toolBackedOperationFailed("step-1-await-allocation", "step-1-retry-allocate-artifact")`, action `{ kind: "terminal_error", errorMessage: "Unable to allocate quick-spec.md after retrying artifact creation." }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.21: In `buildStep1DecisionTree()`, add branch `step-1-await-initial-shell` with route `step-1-render-input-form` triggered by an `event_predicate` matching `tool_backed_operation_succeeded` from either `step-1-await-allocation/step-1-build-initial-shell` or `step-1-await-retry-allocation/step-1-build-initial-shell-after-retry`, action `{ kind: "render_workflow_form", workflowFormId: STEP_1_INPUT_FORM_ID, startPanelId: STEP_1_EXISTING_DOCUMENTATION_PANEL_ID }`, and following branch `step-1-await-input-form`; and route `step-1-terminal-error-after-initial-shell` triggered by an `event_predicate` matching `tool_backed_operation_failed` from either shell-build route, action `{ kind: "terminal_error", errorMessage: "Unable to initialize quick-spec.md." }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.22: In `buildStep1DecisionTree()`, add branch `step-1-await-input-form` with route `step-1-transition-to-step-2` triggered by `workflowFormCompleted(STEP_1_INPUT_FORM_ID)` and action `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } }`. Step 1 decision routes must not include `project_prompt`, `workflow_progress_request`, `attempt_completion`, `set_workflow_values`, or `run_deterministic_procedure`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.23: In `quickSpecWorkflow.ts`, add `function buildProgressGatedDecisionTree(nextStepNumber: number): WorkflowDecisionTree` returning an entry branch `project-prompt` with always route `project-prompt` action `{ kind: "project_prompt" }` and following branch `await-progress-request`; branch `await-progress-request` with route `progress-confirmed` triggered by `workflowProgressRequestConfirmed()` and action `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: nextStepNumber } }`; and route `progress-denied` triggered by `workflowProgressRequestDenied()` and action `{ kind: "project_prompt" }` with following branch `await-progress-request`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.24: In `quickSpecWorkflow.ts`, add `function buildStep4DecisionTree(): WorkflowDecisionTree` returning entry branch `project-prompt` with always route `project-prompt` action `{ kind: "project_prompt" }` and following branch `step-4-await-attempt-completion`; branch `step-4-await-attempt-completion` with route `step-4-complete-after-attempt-completion` triggered by `attemptCompletionSucceeded()` and action `{ kind: "complete_workflow" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.25: In `quickSpecWorkflow.ts`, add `function buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource` that checks `readTrimmedWorkflowStringValue(input, QuickSpecWorkflowValueKey.AdditionalContext) !== undefined`, pushes either `QUICK_SPEC_STEP_2_READ_LIST_WITH_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE` or `QUICK_SPEC_STEP_2_READ_LIST_WITHOUT_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE`, then pushes `QUICK_SPEC_STEP_2_MIDDLE_PROMPT_TEMPLATE`, conditionally pushes `QUICK_SPEC_STEP_2_ADDITIONAL_CONTEXT_DOCUMENT_UPDATE_SENTENCE`, pushes `QUICK_SPEC_STEP_2_FINAL_PROMPT_TEMPLATE`, joins sections with `"\n\n"`, and returns `{ kind: "current_step_instruction_template", currentStepInstructionTemplate: sections.join("\n\n") }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.26: In `quickSpecWorkflow.ts`, add `function buildStaticPromptSource(template: string): WorkflowStepDefinition["buildPromptSource"]` returning a function that returns `{ kind: "current_step_instruction_template", currentStepInstructionTemplate: template }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.27: In `quickSpecWorkflow.ts`, export `quickSpecWorkflowDefinition: WorkflowDefinition` with identity and persona constants from Subtasks 11.2 and 11.4, `projectSubfolder: QUICK_SPEC_WORKFLOW_PROJECT_SUBFOLDER`, `workflowValueKeys: QUICK_SPEC_WORKFLOW_VALUE_KEYS`, `entryProjectValueKeys: QUICK_SPEC_ENTRY_PROJECT_VALUE_KEYS`, `entryPanel: { promptMarkdown: QUICK_SPEC_WORKFLOW_DESCRIPTION }`, no `prerequisiteFiles`, no `childInheritance`, `workflowForms: { [STEP_1_INPUT_FORM_ID]: buildStep1InputWorkflowForm() }`, and artifacts `{ [QUICK_SPEC_ARTIFACT_ID]: { id: QUICK_SPEC_ARTIFACT_ID, family: WorkflowArtifactFamily.QuickSpec, intentMode: "new", parentIdentitySource: undefined, targetIdentitySource: undefined, outputValueKeys: { projectTitle: QuickSpecWorkflowValueKey.ProjectTitle, projectFolderName: QuickSpecWorkflowValueKey.ProjectFolderName, artifactFamily: QuickSpecWorkflowValueKey.OutputArtifactFamily, artifactIdentity: QuickSpecWorkflowValueKey.OutputArtifactIdentity, artifactFilename: QuickSpecWorkflowValueKey.OutputArtifactFilename, artifactRelativePath: QuickSpecWorkflowValueKey.OutputArtifactRelativePath, artifactAbsolutePath: QuickSpecWorkflowValueKey.OutputDocument, parentIdentity: undefined, targetIdentity: undefined } } }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.28: In `quickSpecWorkflowDefinition.steps`, define exactly four steps: `step-1` with `stepNumber: 1`, checklist label `Gather Context & Generate Spec Document`, decision tree `buildStep1DecisionTree()`, and `buildToolSchema: buildQuickSpecStep1ToolSchemas`; `step-2` with checklist label `Assess Vision & Develop Solution Foundation`, decision tree `buildProgressGatedDecisionTree(3)`, prompt source `buildStep2PromptSource`, `buildToolSchema: buildQuickSpecStep2ToolSchemas`, and `promptTemplates: [QUICK_SPEC_STEP_2_READ_LIST_WITH_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE, QUICK_SPEC_STEP_2_READ_LIST_WITHOUT_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE, QUICK_SPEC_STEP_2_MIDDLE_PROMPT_TEMPLATE, QUICK_SPEC_STEP_2_ADDITIONAL_CONTEXT_DOCUMENT_UPDATE_SENTENCE, QUICK_SPEC_STEP_2_FINAL_PROMPT_TEMPLATE]`; `step-3` with checklist label `Finalize Solution & Implementation Spec`, decision tree `buildProgressGatedDecisionTree(4)`, prompt source `buildStaticPromptSource(QUICK_SPEC_STEP_3_PROMPT_TEMPLATE)`, `buildToolSchema: buildQuickSpecStep3ToolSchemas`, and `promptTemplates: [QUICK_SPEC_STEP_3_PROMPT_TEMPLATE]`; and `step-4` with checklist label `Generate Implementation Details`, decision tree `buildStep4DecisionTree()`, prompt source `buildStaticPromptSource(QUICK_SPEC_STEP_4_PROMPT_TEMPLATE)`, `buildToolSchema: buildQuickSpecStep4ToolSchemas`, and `promptTemplates: [QUICK_SPEC_STEP_4_PROMPT_TEMPLATE]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 11.29: In `quickSpecWorkflow.ts`, verify the import list is exactly the imports prescribed in Subtask 11.1 and delete these imports if present: `ActiveWorkflowSession`, `WorkflowValue`, `WorkflowValues`, `ClineToolSpec`, `ClineDefaultTool`, `fs`, and `path`. Verify the helper function declarations are exactly `buildTerminalTransition`, `buildStep1InputWorkflowForm`, `sourceRouteMatches`, `toolBackedOperationSucceeded`, `toolBackedOperationFailed`, `entryArtifactResolutionCompletedWithCreationRequired`, `workflowFormCompleted`, `workflowProgressRequestConfirmed`, `workflowProgressRequestDenied`, `attemptCompletionSucceeded`, `readTrimmedWorkflowStringValue`, `createEmptyPromptSource`, `createStepDefinition`, `buildStep1DecisionTree`, `buildProgressGatedDecisionTree`, `buildStep4DecisionTree`, `buildStep2PromptSource`, and `buildStaticPromptSource`; delete helper declarations named `readWorkflowStringValue`, `buildInlineToolSchemas`, `buildQuickSpecToolSchemas`, `resolveQuickSpecSharedToolSpec`, `buildQuickSpecPromptFromSourceMarkdown`, `loadQuickSpecSourceMarkdown`, `replaceWorkflowTokens`, or `buildQuickSpecMarkdownAlias` if present. Verify the only exported non-test quick-spec constants are `QUICK_SPEC_WORKFLOW_NAME`, `QUICK_SPEC_WORKFLOW_SLASH_COMMAND_NAME`, `QUICK_SPEC_WORKFLOW_USE_SKILL_NAME`, `QUICK_SPEC_WORKFLOW_DISPLAY_NAME`, `QUICK_SPEC_WORKFLOW_PROJECT_SUBFOLDER`, `QUICK_SPEC_WORKFLOW_DESCRIPTION`, `QUICK_SPEC_WORKFLOW_PERSONA`, `QuickSpecWorkflowValueKey`, `QUICK_SPEC_WORKFLOW_VALUE_KEYS`, `QUICK_SPEC_ENTRY_PROJECT_VALUE_KEYS`, and `quickSpecWorkflowDefinition`; delete exported constants named `QUICK_SPEC_WORKFLOW_MARKDOWN_NAME`, `QUICK_SPEC_STEP_2_TOOL_SCHEMAS`, `QUICK_SPEC_STEP_3_TOOL_SCHEMAS`, `QUICK_SPEC_STEP_4_TOOL_SCHEMAS`, `QUICK_SPEC_PREREQUISITE_FILES`, or `QUICK_SPEC_CHILD_INHERITANCE` if present. Do not add local `ClineToolSpec` arrays, local fallback tool schema bodies, `replace`, `replaceAll`, regex substitution for workflow values, `set_workflow_values`, `prerequisiteFiles`, child workflow activation, `quick-spec.md` aliases, or runtime reads from source markdown/BMAD assets.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[ ] Task 12: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`, add focused quick-spec workflow-definition tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 12.1: Create `quickSpecWorkflow.test.ts` with imports `expect` from `chai`, `describe` and `it` from `mocha`, `WorkflowArtifactFamily` from `../../../artifactFamilies`, type `ActiveWorkflowSession`, `WorkflowBranchTriggerEvent`, `WorkflowDecisionAction`, `WorkflowDecisionBranchRoute`, `WorkflowPromptBuilderInput`, `WorkflowStepDefinition`, and `WorkflowValues` from `../../../types`, `renderWorkflowPromptTemplate` from `../../../workflowPromptTemplates`, quick-spec document builder imports from `../quickSpecDocument`, quick-spec tool-schema builder imports from `../quickSpecToolSchemas`, and `quickSpecWorkflowDefinition` from `../quickSpecWorkflow`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 12.2: In `quickSpecWorkflow.test.ts`, add constants and helpers: `const OUTPUT_DOCUMENT = "/tmp/quick-spec-project/planning/quick-spec.md"`; `function createSession(workflowValues: WorkflowValues): ActiveWorkflowSession` returning a Step 2 existing-project session with `workflowValues`, project selection `{ projectMode: "existing", projectTitle: "Quick Spec Project", projectFolderName: "quick-spec-project" }`, completed lifecycle, `entryArtifactResolution: undefined`, no active form or step-resolution sessions, empty suppressed arrays, and `branchContext.activeBranchId: "project-prompt"`; `function createPromptInput(step: WorkflowStepDefinition, workflowValues: WorkflowValues): WorkflowPromptBuilderInput` returning `{ session: createSession(workflowValues), step }`; `function findRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute` that looks up `quickSpecWorkflowDefinition.steps[stepId]?.decisionTree.branches[branchId]?.routes.find((candidate) => candidate.id === routeId)` and throws `new Error(\`Missing route ${stepId}/${branchId}/${routeId}.\`)` when undefined; `function getAction(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionAction` returning `findRoute(stepId, branchId, routeId).action`; `function buildEntryArtifactResolutionCompletedEvent(creationRequired: boolean): WorkflowBranchTriggerEvent` returning `entry_artifact_resolution_completed` with one artifact resolution for `quick_spec`, family `WorkflowArtifactFamily.QuickSpec`, identity `quick_spec`, filename `quick-spec.md`, relative path `planning/quick-spec.md`, absolute path `OUTPUT_DOCUMENT`, the provided `creationRequired`, and `existingArtifactAction: creationRequired ? "none" : "continue_existing"`; `function buildToolBackedOperationEvent(kind: "tool_backed_operation_succeeded" | "tool_backed_operation_failed", branchId: string, routeId: string): WorkflowBranchTriggerEvent` using an `if (kind === "tool_backed_operation_succeeded")` branch and returning `{ kind, sourceRoute: { branchId, routeId } }` from both narrowed branches; `function expectRouteMatchesEntryArtifactResolution(route: WorkflowDecisionBranchRoute, creationRequired: boolean): void` that throws `new Error(\`Expected event_predicate trigger, received ${route.trigger.kind}.\`)` unless `route.trigger.kind === "event_predicate"`, then asserts `route.trigger.matches({ activeBranchId: "step-1-resolve-entry-artifact", workflowValues: {}, step: quickSpecWorkflowDefinition.steps["step-1"], triggerEvent: buildEntryArtifactResolutionCompletedEvent(creationRequired) }) === true`; `function expectRouteMatchesToolBackedOperationEvent(route: WorkflowDecisionBranchRoute, kind: "tool_backed_operation_succeeded" | "tool_backed_operation_failed", branchId: string, routeId: string): void` with the same `event_predicate` narrowing and a trigger input using `activeBranchId: branchId`, `workflowValues: {}`, `step: quickSpecWorkflowDefinition.steps["step-1"]`, and `triggerEvent: buildToolBackedOperationEvent(kind, branchId, routeId)`; `function listRouteActionKinds(step: WorkflowStepDefinition): readonly WorkflowDecisionAction["kind"][]` returning `Object.values(step.decisionTree.branches).flatMap((branch) => branch.routes.map((route) => route.action.kind))`; and `function buildPrompt(stepId: WorkflowStepDefinition["id"], workflowValues: WorkflowValues): string` that reads the step, builds the prompt source with `createPromptInput(step, workflowValues)`, throws `new Error("Expected current step instruction template.")` unless `promptSource.kind === "current_step_instruction_template"`, and returns `renderWorkflowPromptTemplate({ template: promptSource.currentStepInstructionTemplate, workflowValueKeys: quickSpecWorkflowDefinition.workflowValueKeys, workflowValues, context: \`quick-spec ${stepId} test prompt\` })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 12.3: In `quickSpecWorkflow.test.ts`, add a test named `declares workflow identity, persona, project subfolder, entry copy, checklist labels, value inventory, entry keys, and artifact mapping`. Assert exact workflow name, displayName `quick spec`, slash command, use-skill name, description, projectSubfolder `planning`, exact Bob persona object, `entryPanel.promptMarkdown === quickSpecWorkflowDefinition.description`, exact checklist labels, exact workflow value key array, exact `entryProjectValueKeys`, no `prerequisiteFiles`, no `childInheritance`, and artifact `quick_spec` deep-equals the artifact definition prescribed in Subtask 11.27.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 12.4: In `quickSpecWorkflow.test.ts`, add a test named `defines the Step 1 input workflow form exactly`. Assert the form id `step-1-quick-spec-input-form` exists, title, toolDictionaryTitle, toolDictionaryMarkdown, firstPanelId, all three panel ids in order, Panel A exact title/prompt/field/action labels/conditional transition/stale clearing, Panel B exact title/prompt/field/action labels/back destination/sequential transition, and Panel C exact title/prompt/field/action labels/back destination/terminal transition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 12.5: In `quickSpecWorkflow.test.ts`, add a test named `routes Step 1 creation-required entry through allocation, initial shell build, form rendering, and Step 2 transition`. Assert `step-1` delegates `buildToolSchema` to `buildQuickSpecStep1ToolSchemas`, `decisionTree.entryBranchId === "step-1-resolve-entry-artifact"`, the creation-required route matches an `entry_artifact_resolution_completed` event for `quick_spec`, allocation action uses `artifactId: "quick_spec"`, allocation success builds the initial shell with `artifactId: "quick_spec"` and `buildContent === buildInitialQuickSpecDocument`, shell success renders form `step-1-quick-spec-input-form` from `step-1-existing-documentation-panel`, form completion transitions to entry branch Step 2, and Step 1 route action kinds do not include `project_prompt`, `run_deterministic_procedure`, or `complete_workflow`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 12.6: In `quickSpecWorkflow.test.ts`, add a test named `routes Step 1 continue-existing entry directly to the same input form without allocation or initial document build`. Assert the continue-existing route matches `creationRequired: false`, action deep-equals `{ kind: "render_workflow_form", workflowFormId: "step-1-quick-spec-input-form", startPanelId: "step-1-existing-documentation-panel" }`, following branch is `step-1-await-input-form`, and the route action kind is not `allocate_artifact` or `build_workflow_document`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 12.7: In `quickSpecWorkflow.test.ts`, add a test named `defines allocation retry and terminal-error routes`. Assert first allocation failure retries `allocate_artifact` for `quick_spec`, retry allocation success builds the initial shell, retry allocation failure routes to terminal error `Unable to allocate quick-spec.md after retrying artifact creation.`, and initial shell failure routes to terminal error `Unable to initialize quick-spec.md.`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 12.8: In `quickSpecWorkflow.test.ts`, add a test named `builds Step 2 prompt with and without additional context`. Render Step 2 with `output_document`, non-empty `additional_context`, and `vision_statement`; assert the prompt includes `OUTPUT_DOCUMENT`, the additional-context value, the vision statement, the additional-context read-list bullet, and the sentence `Add the additional context provided to the spec file under the "User Context" heading.`. Render Step 2 with blank `additional_context`; assert the prompt includes `OUTPUT_DOCUMENT` and vision statement but does not include the additional-context value or update sentence. For both rendered prompts, assert no raw `{workflow.output_document}`, `{workflow.additional_context}`, `{workflow.vision_statement}`, `*** conditional prompt segment`, or `*** end conditional prompt segment ***` appears.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 12.9: In `quickSpecWorkflow.test.ts`, add a test named `builds Step 3 and Step 4 prompt sources with materialized workflow values and required invariants`. Assert Step 3 prompt includes `OUTPUT_DOCUMENT`, `Once the use approves`, `workflow_progress_request`, no raw `{workflow.output_document}`, and no conditional marker text. Assert Step 4 prompt includes `OUTPUT_DOCUMENT`, `use subagents`, `under the "implementation phases" heading`, `under the spec file's "Implementation Phases" heading`, `DEV AGENT INSTRUCTIONS:`, the template-literal expected string `` `Add this exact content to the "Dev Agent Instructions" section of ${OUTPUT_DOCUMENT}. Do not paraphrase or invent additional instructions.` ``, `Required instructions:`, `Read this plan from top to bottom before making any changes.`, `Read each task and subtask in full immediately before executing it.`, `Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.`, `Exception: You may execute multiple sequential subtasks with one patch only if they are scoped to the same file, but must review each subtask vs the landed code after the patch to ensure that every subtask was implemented exactly as prescribed before marking the subtask as complete.`, `After completing a task or subtask, update that step's checkbox from "[ ]" to "[x]".`, `Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.`, `Do not edit any file not listed in the current step's allowed-files list.`, `If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.`, `Implement tasks and subtasks exactly as instructed. If deviation seems necessary, stop, inform the user, and explain why you believe the task or subtask should be carried out differently than prescribed.`, `attempt_completion`, and no raw `{workflow.output_document}`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 12.10: In `quickSpecWorkflow.test.ts`, add a test named `routes Step 2 and Step 3 progress decisions and Step 4 attempt completion`. Assert Step 2 and Step 3 entry branches route to `project_prompt`, confirmed progress routes transition to Step 3 and Step 4 respectively, denied progress routes return to `project_prompt`, Step 4 entry routes to `project_prompt`, and Step 4 `attempt_completion_succeeded` routes to `{ kind: "complete_workflow" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 12.11: In `quickSpecWorkflow.test.ts`, add a test named `delegates every step to the module-owned tool schema builders and excludes unauthorized legacy behavior`. Assert `step-1`, `step-2`, `step-3`, and `step-4` buildToolSchema references equal `buildQuickSpecStep1ToolSchemas`, `buildQuickSpecStep2ToolSchemas`, `buildQuickSpecStep3ToolSchemas`, and `buildQuickSpecStep4ToolSchemas`; assert all model-facing tool names exclude `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `write_to_file`, and `build_tech_spec_document`; assert Step 4 includes `use_subagents` and `attempt_completion`; and assert serialized workflow definition does not include `.cline/workflow-config.yaml`, `tech-spec-wip.md`, `BuildTechSpecDocumentToolHandler`, `QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID`, `build_tech_spec_document`, or `build-tech-spec-document`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[ ] Task 13: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`, run Phase 4 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 13.1: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 13.2: Run `npm run check-types`. If it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` before treating the failure as a code defect.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 13.3: Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 13.4: Run `rg -n "conditional prompt segment|end conditional prompt segment" src/core/task/workflow-runtime/workflow-modules/quick-spec -g "*.ts" -g "!**/__tests__/**"` and confirm it returns no matches; exit code `1` with no output is success for this no-match guard.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 13.5: Run `git diff --name-only` and `git ls-files --others --exclude-standard`; confirm persistent diffs and untracked files are limited to Phase 1 through Phase 4 authorized files: `src/core/task/workflow-runtime/artifactFamilies.ts`, `src/core/task/workflow-runtime/types.ts`, `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecDocument.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`, and this action plan.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

### Phase 5 - Registration, Prompt Projection, Slash Commands, And Legacy Cleanup

Relevant requirements: Registration Requirements, Legacy Cleanup Requirements, Expected Implementation Surfaces, Testing Requirements, Validation Requirements.

After completing this phase, pause for QA review before moving to Phase 6.

[ ] Task 14: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/index.ts`, export the quick-spec module.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 14.1: Create `index.ts` with exactly these exports: `export * from "./quickSpecDocument"`, `export * from "./quickSpecToolSchemas"`, and `export * from "./quickSpecWorkflow"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-spec/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[ ] Task 15: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`, register quick-spec in the shipped workflow registry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 15.1: In `WorkflowRegistry.ts`, add import `import { quickSpecWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/quick-spec"` immediately after the `piPlanningWorkflowDefinition` import.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 15.2: In `WorkflowRegistry.ts`, add `quickSpecWorkflowDefinition` to `shippedWorkflowDefinitions` immediately after `piPlanningWorkflowDefinition`. Do not add `quick-spec.md` or any markdown filename alias to any registry map.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[ ] Task 16: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add quick-spec registry and shared runtime activation coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 16.1: In `WorkflowRuntime.test.ts`, add import `quickSpecWorkflowDefinition` from `../workflow-modules/quick-spec`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 16.2: In `WorkflowRuntime.test.ts`, add a test named `resolves the shipped quick-spec workflow by workflow name, slash command, and use-skill name`. The test must restore `resolveWorkflowDefinitionStub`, assert `WorkflowRegistry.resolveWorkflowDefinition("quick-spec")`, `WorkflowRegistry.resolveWorkflowBySlashCommand("quick-spec")`, and `WorkflowRegistry.resolveWorkflowByUseSkillName("quick-spec")` each equal `quickSpecWorkflowDefinition`, and assert the same three lookups with `"quick-spec.md"` return `undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 16.3: In `WorkflowRuntime.test.ts`, add a test named `activates the quick-spec workflow through the shared entry form and resolves its first Step 1 action`. The test must call `registerResolvedWorkflow(quickSpecWorkflowDefinition)`, assign `const entryFormAction = await runtime.activateWorkflow({ taskState, workflowName: quickSpecWorkflowDefinition.name })`, assert `entryFormAction.kind === "render_workflow_form"`, narrow by throwing `new Error(\`Expected render_workflow_form, received ${entryFormAction.kind}.\`)` when not render, assert `entryFormAction.payload.panel?.promptMarkdown === quickSpecWorkflowDefinition.description`, assert `taskState.currentFocusChainChecklist === "1. Gather Context & Generate Spec Document - Active\n2. Assess Vision & Develop Solution Foundation - Not Started\n3. Finalize Solution & Implementation Spec - Not Started\n4. Generate Implementation Details - Not Started"`, assign `const stepOneAction = await submitNewProjectSelection(taskState, "Quick Spec Runtime Project")`, assert `stepOneAction.kind === "execute_tool_backed_operation"`, narrow by throwing `new Error(\`Expected execute_tool_backed_operation, received ${stepOneAction.kind}.\`)` when not execute, assert `stepOneAction.toolRequest.toolName === ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT`, assert `stepOneAction.toolRequest.toolParams` deep-equals `{ artifact_id: "quick_spec" }`, assert `stepOneAction.runtimeOwnedSourceRoute` deep-equals `{ branchId: "step-1-resolve-entry-artifact", routeId: "step-1-allocate-artifact" }`, assert `stepOneAction.toolBackedOperationSession === undefined`, and assert `getActiveWorkflowSession(taskState).entryArtifactResolution?.artifactResolutions` deep-equals `[{ artifactId: "quick_spec", artifactFamily: WorkflowArtifactFamily.QuickSpec, artifactIdentity: "quick_spec", artifactFilename: "quick-spec.md", artifactRelativePath: join("planning", "quick-spec.md"), artifactAbsolutePath: join(cwd, "docs", "projects", "quick-spec-runtime-project", "planning", "quick-spec.md"), creationRequired: true, existingArtifactAction: "none" }]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 16.4: In `WorkflowRuntime.test.ts`, add a test named `routes quick-spec allocation success and initial document build success to the Step 1 input form`. The test must call `registerResolvedWorkflow(quickSpecWorkflowDefinition)`, activate quick-spec with `await runtime.activateWorkflow({ taskState, workflowName: quickSpecWorkflowDefinition.name })`, assign `const allocationAction = await submitNewProjectSelection(taskState, "Quick Spec Runtime Project")`, assert `allocationAction.kind === "execute_tool_backed_operation"`, narrow by throwing `new Error(\`Expected execute_tool_backed_operation, received ${allocationAction.kind}.\`)` when not execute, assign `const artifactResult = await runtime.createWorkflowArtifact({ taskState, artifactId: "quick_spec", expectedArtifactAbsolutePath: undefined })`, assign `const documentBuildAction = await runtime.handleToolBackedOperationToolResult({ taskState, toolResultText: JSON.stringify({ ok: true }), runtimeOwnedSourceRoute: allocationAction.runtimeOwnedSourceRoute })`, assert `documentBuildAction.kind === "execute_tool_backed_operation"`, narrow by throwing `new Error(\`Expected execute_tool_backed_operation, received ${documentBuildAction.kind}.\`)` when not execute, assert `documentBuildAction.toolRequest.toolName === ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`, assert `documentBuildAction.toolRequest.toolParams.artifact_id === "quick_spec"`, assert `documentBuildAction.toolRequest.toolParams.destination_path === artifactResult.artifactAbsolutePath`, assert `documentBuildAction.runtimeOwnedSourceRoute` deep-equals `{ branchId: "step-1-await-allocation", routeId: "step-1-build-initial-shell" }`, assign `const inputFormAction = await runtime.handleToolBackedOperationToolResult({ taskState, toolResultText: JSON.stringify({ ok: true }), runtimeOwnedSourceRoute: documentBuildAction.runtimeOwnedSourceRoute })`, assert `inputFormAction.kind === "render_workflow_form"`, narrow by throwing `new Error(\`Expected render_workflow_form, received ${inputFormAction.kind}.\`)` when not render, assert `inputFormAction.formSession.workflowFormId === "step-1-quick-spec-input-form"`, and assert `inputFormAction.formSession.currentPanelId === "step-1-existing-documentation-panel"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 16.5: In `WorkflowRuntime.test.ts`, add a test named `continues an existing quick-spec artifact to Step 1 input form without artifact or document tool operations`. The test must assign `const projectName = "Existing Quick Spec"`, `const existingArtifactPath = join(cwd, "docs", "projects", projectName, "planning", "quick-spec.md")`, create the parent directory with `await mkdir(dirname(existingArtifactPath), { recursive: true })`, write `"# Existing Quick Spec\n"` to `existingArtifactPath`, register `quickSpecWorkflowDefinition`, call `setDiscoveredProjects([projectName])`, activate quick-spec, call `await submitExistingProjectSelectionFromExistingFolder(taskState, projectName)`, then assign `const result = await submitEntryArtifactConflictAction(taskState, "continue_existing")`. Assert `result.kind === "render_workflow_form"`, narrow by throwing `new Error(\`Expected render_workflow_form, received ${result.kind}.\`)` when not render, assert `result.formSession.workflowFormId === "step-1-quick-spec-input-form"` and `result.formSession.currentPanelId === "step-1-existing-documentation-panel"`, assert active session remains on Step 1, assert workflow values include `projectMode: "existing"`, `projectTitle: "Existing Quick Spec"`, `projectFolderName: "Existing Quick Spec"`, `output_artifact_family: WorkflowArtifactFamily.QuickSpec`, `output_artifact_identity: "quick_spec"`, `output_artifact_filename: "quick-spec.md"`, `output_artifact_relative_path: join("planning", "quick-spec.md")`, and `output_document: existingArtifactPath`, assert entry artifact resolution has `creationRequired: false` and `existingArtifactAction: "continue_existing"`, and assert `await readFile(existingArtifactPath, "utf8") === "# Existing Quick Spec\n"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[ ] Task 17: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, add quick-spec prompt projection tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 17.1: In `integration.test.ts`, add imports from `@/core/task/workflow-runtime/workflow-modules/quick-spec`: `QuickSpecWorkflowValueKey`, `quickSpecWorkflowDefinition`, `buildQuickSpecStep2ToolSchemas`, `buildQuickSpecStep3ToolSchemas`, and `buildQuickSpecStep4ToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 17.2: In `integration.test.ts`, add constants `QUICK_SPEC_OUTPUT_DOCUMENT = "/test/project/docs/projects/quick-spec-project/planning/quick-spec.md"`, `QUICK_SPEC_ADDITIONAL_CONTEXT = "/test/project/docs/context/brief.md"`, and `QUICK_SPEC_VISION_STATEMENT = "Add a compact delivery-planning workflow."`; add type `QuickSpecPromptStepNumber = 2 | 3 | 4`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 17.3: In `integration.test.ts`, add helper `function createQuickSpecWorkflowValues(args?: { additionalContext?: string }): WorkflowValues` returning exactly `{ [QuickSpecWorkflowValueKey.ProjectMode]: "existing", [QuickSpecWorkflowValueKey.ProjectTitle]: "Quick Spec Prompt Project", [QuickSpecWorkflowValueKey.ProjectFolderName]: "quick-spec-project", [QuickSpecWorkflowValueKey.OutputDocument]: QUICK_SPEC_OUTPUT_DOCUMENT, [QuickSpecWorkflowValueKey.VisionStatement]: QUICK_SPEC_VISION_STATEMENT, [QuickSpecWorkflowValueKey.OutputArtifactFamily]: "quick_spec", [QuickSpecWorkflowValueKey.OutputArtifactIdentity]: "quick_spec", [QuickSpecWorkflowValueKey.OutputArtifactFilename]: "quick-spec.md", [QuickSpecWorkflowValueKey.OutputArtifactRelativePath]: "planning/quick-spec.md", [QuickSpecWorkflowValueKey.AdditionalContext]: args?.additionalContext ?? QUICK_SPEC_ADDITIONAL_CONTEXT }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 17.4: In `integration.test.ts`, add helper `function createQuickSpecWorkflowSession(activeStepNumber: QuickSpecPromptStepNumber, args?: { additionalContext?: string }): ActiveWorkflowSession` returning exactly `{ activeStepNumber, workflowValues: createQuickSpecWorkflowValues(args), projectSelection: { projectMode: "existing", projectTitle: "Quick Spec Prompt Project", projectFolderName: "quick-spec-project" }, lifecycle: { projectSelectionCompleted: true }, entryArtifactResolution: undefined, ui: { formSession: undefined, stepResolutionSession: undefined, suppressedWorkflowFormIds: [], suppressedWorkflowStepResolutionRoutes: [] }, branchContext: { activeBranchId: "project-prompt" } }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 17.5: In `integration.test.ts`, add the following helper body exactly:

```ts
const buildQuickSpecPromptContext = async (
	activeStepNumber: QuickSpecPromptStepNumber,
	args?: { additionalContext?: string },
): Promise<SystemPromptContext & WorkflowPromptProjection> => {
	const workspacePathPolicy: WorkflowWorkspacePathPolicy = { validateAccess: () => true }
	const runtime = new WorkflowRuntime({ cwd: "/test/project", workspacePathPolicy })
	const taskState = new TaskState()
	taskState.activeWorkflowName = quickSpecWorkflowDefinition.name
	taskState.activeWorkflowSession = createQuickSpecWorkflowSession(activeStepNumber, args)
	taskState.apiRequestCount = 1
	const workflowProjection = await runtime.buildTurnProjection({ taskState })
	return {
		...baseContext,
		mcpHub: makeMcpHub([]),
		providerInfo: makeProviderInfo("gpt-5-codex", "openai"),
		enableNativeToolCalls: true,
		useMinimalGptPrompt: true,
		...workflowProjection,
	}
}
```

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 17.6: In `integration.test.ts`, add helper `async function expectQuickSpecProjectedToolSurface(testCtx: TestRunner, activeStepNumber: QuickSpecPromptStepNumber, expectedToolSpecs: readonly ClineToolSpec[]): Promise<void>` that builds quick-spec context, asserts `context.workflowToolSchemaOverride` deep-equals `expectedToolSpecs`, and uses `runPromptTest(testCtx, context, "gpt-5-codex", async ({ tools }) => { expect(getNativeToolNames(tools)).to.deep.equal(expectedToolSpecs.map((tool) => tool.name)) })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 17.7: In `integration.test.ts`, add tests named `projects active quick-spec Step 2 tools into native GPT-5 prompts`, `projects active quick-spec Step 3 tools into native GPT-5 prompts`, and `projects active quick-spec Step 4 tools into native GPT-5 prompts`, calling `expectQuickSpecProjectedToolSurface` with `buildQuickSpecStep2ToolSchemas()`, `buildQuickSpecStep3ToolSchemas()`, and `buildQuickSpecStep4ToolSchemas()`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 17.8: In `integration.test.ts`, add a test named `projects quick-spec current step details into the workflow input payload only`. Build Step 2 context with `const context = await buildQuickSpecPromptContext(2)`, assign `const workflowInputPayloadBlock = context.workflowInputPayloadBlock`, then add exact narrowing block `if (workflowInputPayloadBlock === undefined || workflowInputPayloadBlock === "") { throw new Error("Expected quick-spec Step 2 workflow input payload.") }` before any includes assertions. Assert `workflowInputPayloadBlock` includes `Workflow:\nquick spec`, exact quick-spec description, `Name: Bob`, `Role: Scrum Master`, the exact persona identity, `1. Gather Context & Generate Spec Document - Complete`, `2. Assess Vision & Develop Solution Foundation - Active`, `4. Generate Implementation Details - Not Started`, `CURRENT STEP DETAILED INSTRUCTIONS`, `Step 2: Assess Vision & Develop Solution Foundation`, `QUICK_SPEC_OUTPUT_DOCUMENT`, `QUICK_SPEC_ADDITIONAL_CONTEXT`, and `QUICK_SPEC_VISION_STATEMENT`; assert the system prompt from `runPromptTest` does not include `CURRENT STEP DETAILED INSTRUCTIONS`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 17.9: In `integration.test.ts`, add a test named `renders quick-spec Step 2 conditional additional context only when non-empty`. Build Step 2 contexts with `const contextWithAdditionalContext = await buildQuickSpecPromptContext(2, { additionalContext: QUICK_SPEC_ADDITIONAL_CONTEXT })` and `const contextWithoutAdditionalContext = await buildQuickSpecPromptContext(2, { additionalContext: "   " })`. Assign `const fullPayloadWithAdditionalContext = contextWithAdditionalContext.workflowInputPayloadBlock`, `const continuationPayloadWithAdditionalContext = contextWithAdditionalContext.continuationWorkflowInputPayloadBlock`, `const fullPayloadWithoutAdditionalContext = contextWithoutAdditionalContext.workflowInputPayloadBlock`, and `const continuationPayloadWithoutAdditionalContext = contextWithoutAdditionalContext.continuationWorkflowInputPayloadBlock`. Before includes/excludes assertions, add exact narrowing blocks `if (fullPayloadWithAdditionalContext === undefined || fullPayloadWithAdditionalContext === "") { throw new Error("Expected quick-spec Step 2 full workflow input payload with additional context.") }`, `if (continuationPayloadWithAdditionalContext === undefined || continuationPayloadWithAdditionalContext === "") { throw new Error("Expected quick-spec Step 2 continuation workflow input payload with additional context.") }`, `if (fullPayloadWithoutAdditionalContext === undefined || fullPayloadWithoutAdditionalContext === "") { throw new Error("Expected quick-spec Step 2 full workflow input payload without additional context.") }`, and `if (continuationPayloadWithoutAdditionalContext === undefined || continuationPayloadWithoutAdditionalContext === "") { throw new Error("Expected quick-spec Step 2 continuation workflow input payload without additional context.") }`. For `fullPayloadWithAdditionalContext` and `continuationPayloadWithAdditionalContext`, assert each includes `QUICK_SPEC_ADDITIONAL_CONTEXT` and `Add the additional context provided to the spec file under the "User Context" heading.`. For `fullPayloadWithoutAdditionalContext` and `continuationPayloadWithoutAdditionalContext`, assert each excludes `QUICK_SPEC_ADDITIONAL_CONTEXT` and `Add the additional context provided to the spec file under the "User Context" heading.`. For all four narrowed payloads, assert each does not include `{workflow.output_document}`, `{workflow.additional_context}`, `{workflow.vision_statement}`, `*** conditional prompt segment`, or `*** end conditional prompt segment ***`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 17.10: In `integration.test.ts`, add a test named `renders quick-spec response-tool guidance for progress and completion steps only`. For Step 2 and Step 3 contexts, use `runPromptTest` and `expectResponseToolNames(systemPrompt, ["`workflow_progress_request`"], ["`attempt_completion`"])`; for Step 4, use `expectResponseToolNames(systemPrompt, ["`attempt_completion`"], ["`workflow_progress_request`"])`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 17.11: In `integration.test.ts`, add a test named `does not statically expose forbidden runtime or legacy tools in quick-spec prompt projection`. For active steps 2, 3, and 4, assert projected tool names do not include `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `write_to_file`, or `build_tech_spec_document`; assert Step 4 projected tool names include `use_subagents` and Steps 2 and 3 do not.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[ ] Task 18: In `/Users/robertboston/Documents/Cline Extension/cline/src/test/slash-commands.test.ts`, add shipped quick-spec slash-command availability coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/test/slash-commands.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 18.1: In `src/test/slash-commands.test.ts`, inside `describe("Shipped Workflow Slash Commands", ...)`, add a test named `includes the registered quick-spec workflow slash command` that calls `getResponse()`, finds command name `"quick-spec"`, asserts it is not undefined, asserts `section === "custom"`, `cliCompatible === true`, and `description === "Shipped workflow: quick-spec"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/test/slash-commands.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[ ] Task 19: In `/Users/robertboston/Documents/Cline Extension/cline/src/shared/build-tech-spec-document.ts`, delete the retired legacy helper.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/build-tech-spec-document.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 19.1: Delete `/Users/robertboston/Documents/Cline Extension/cline/src/shared/build-tech-spec-document.ts` entirely. Do not add a replacement helper, compatibility alias, or redirected export.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/build-tech-spec-document.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[ ] Task 20: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts`, remove the stale legacy quick-spec test string.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 20.1: In the `does not preserve unauthorized workflow behavior` test, remove only the `"BuildTechSpecDocumentToolHandler"` entry from the forbidden text array. Leave every other correct-course forbidden text assertion unchanged.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

[ ] Task 21: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`, run Phase 5 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 21.1: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 21.2: Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 21.3: Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 21.4: Run `npm run test:unit -- src/test/slash-commands.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 21.5: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 21.6: Run `npm run check-types`. If it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` before treating the failure as a code defect.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 21.7: Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 21.8: Run `test ! -e src/shared/build-tech-spec-document.ts` and confirm it exits `0`. Then run `rg -n "build_tech_spec_document|build-tech-spec-document|BuildTechSpecDocumentToolHandler|BUILD_TECH_SPEC_DOCUMENT_WORKFLOW_STEPS|isBuildTechSpecDocumentStep|shouldExposeBuildTechSpecDocument|QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID|tech-spec-wip\\.md" src -g "*.ts" -g "!**/__tests__/**" -g "!**/*.test.ts"` and confirm it returns no matches; exit code `1` with no output is success for the no-match guard.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 21.9: Run `rg -n "conditional prompt segment|end conditional prompt segment" src/core/task/workflow-runtime/workflow-modules/quick-spec -g "*.ts" -g "!**/__tests__/**"` and confirm it returns no matches; exit code `1` with no output is success for this no-match guard.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 21.10: Run `rg -n "build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|set_workflow_values|write_to_file" src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts` and confirm it returns no matches; exit code `1` with no output is success for this no-match guard.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 21.11: Run `git diff --name-only` and `git ls-files --others --exclude-standard`; confirm persistent diffs and untracked files are limited to Phase 1 through Phase 5 authorized files: `src/core/task/workflow-runtime/artifactFamilies.ts`, `src/core/task/workflow-runtime/types.ts`, `src/core/task/workflow-runtime/WorkflowRegistry.ts`, `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/index.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecDocument.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`, `src/core/prompts/system-prompt/__tests__/integration.test.ts`, `src/test/slash-commands.test.ts`, `src/shared/build-tech-spec-document.ts`, `src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts`, and this action plan.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

### Phase 6 - Final Validation

Relevant requirements: Validation Requirements, Action Plan Requirements.

[ ] Task 22: In `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`, run final validation for the complete quick-spec build.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 22.1: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 22.2: Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 22.3: Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 22.4: Run `npm run test:unit -- src/test/slash-commands.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 22.5: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 22.6: Run `npm run check-types`. If it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` before treating the failure as a code defect.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 22.7: Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 22.8: Run `npm run package`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 22.9: Run `test ! -e src/shared/build-tech-spec-document.ts` and confirm it exits `0`. Then run `rg -n "build_tech_spec_document|build-tech-spec-document|BuildTechSpecDocumentToolHandler|BUILD_TECH_SPEC_DOCUMENT_WORKFLOW_STEPS|isBuildTechSpecDocumentStep|shouldExposeBuildTechSpecDocument|QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID|tech-spec-wip\\.md" src -g "*.ts" -g "!**/__tests__/**" -g "!**/*.test.ts"` and confirm it returns no matches; exit code `1` with no output is success for the no-match guard.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 22.10: Run `rg -n "conditional prompt segment|end conditional prompt segment" src/core/task/workflow-runtime/workflow-modules/quick-spec -g "*.ts" -g "!**/__tests__/**"` and confirm it returns no matches; exit code `1` with no output is success for this no-match guard.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 22.11: Run `rg -n "build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|set_workflow_values|write_to_file" src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts` and confirm it returns no matches; exit code `1` with no output is success for this no-match guard.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`

    [ ] Subtask 22.12: Run `git diff --name-only` and `git ls-files --others --exclude-standard`; confirm persistent diffs and untracked files introduced by this action plan are limited to this final authorized file set: `src/core/task/workflow-runtime/artifactFamilies.ts`, `src/core/task/workflow-runtime/types.ts`, `src/core/task/workflow-runtime/WorkflowRegistry.ts`, `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/index.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecDocument.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts`, `src/core/prompts/system-prompt/__tests__/integration.test.ts`, `src/test/slash-commands.test.ts`, `src/shared/build-tech-spec-document.ts`, `src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts`, and `docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-spec/action-plan.md`
