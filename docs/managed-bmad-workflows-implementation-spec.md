# Managed BMAD Workflows Implementation Spec

## Objective

Implement backend-managed BMAD workflows for an explicit first-pass allowlist of BMAD skills so that:

- Each supported workflow can be invoked deterministically via a real `/` command.
- The backend creates and owns the workflow task list.
- The UI `task_progress` element becomes a rendered view of backend state rather than model-authored source of truth.
- The model must explicitly mark workflow items complete to advance.
- The runtime blocks `attempt_completion` until all required workflow items are complete.
- Required workflow assets ship reliably in packaged artifacts so this does not break in another project due to missing files or path drift.

This is a v1 progression system. It does not semantically validate whether the model truly executed a step correctly. It only guarantees that the workflow is surfaced, tracked, advanced in order, and completed explicitly.

It is also not a full declarative branch engine. For supported single-file workflows, the backend applies first-wave branch-aware extraction and required-vs-advisory item classification so obvious alternate paths and post-completion guidance do not block completion by default.

## Execution Tracker

Use this section as the live implementation checklist while building the feature.

- [x] Phase 1: Add managed workflow registry and committed config
- [x] Phase 2: Add task state and metadata persistence for managed workflow runs
- [x] Phase 3: Add slash activation path for managed workflows
- [x] Phase 4: Add workflow phase/item extraction and canonical rendering
- [x] Phase 5: Route managed workflows through backend-owned `task_progress`
- [x] Phase 6: Inject current phase only into prompts
- [x] Phase 7: Add explicit item completion and phase advancement
- [x] Phase 8: Block `attempt_completion` until all required items are complete
- [x] Phase 9: Add package generation and asset verification scripts
- [x] Phase 10: Update BMAD manifests and packaging hooks
- [x] Phase 11: Add focused unit coverage for managed workflow runtime and slash discovery
- [x] Final review: Confirm runtime behavior matches this spec
- [x] Final review: Confirm packaged artifacts contain all required workflow assets

Verification note:

- `node scripts/generate-managed-workflows.mjs` passes.
- `node scripts/verify-managed-workflow-assets.mjs` passes.
- Full repo typecheck and mocha execution remain blocked in this environment by the repo's existing protobuf-generation prerequisite (`npm run protos` aborts because Rosetta-dependent tooling is unavailable, which also leaves `src/shared/proto/**` unresolved for downstream test/typecheck commands).

## Review Checklist

Use this checklist when implementation is complete.

- [x] Every supported workflow has a deterministic slash command path
- [x] Managed workflow runs persist across task continuation/restart
- [x] The backend creates the checklist without asking the model to invent it
- [x] `task_progress` reflects canonical backend state, not freeform model edits
- [x] Only the current phase is injected into the prompt
- [x] Advancing to the next phase requires explicit completion of all current required items
- [x] `attempt_completion` is rejected while required workflow items remain incomplete
- [x] Packaging fails if any managed workflow asset is missing, renamed, or moved
- [x] Packaged output includes `_bmad/_config/managed-workflows.json`
- [x] Packaged output includes every registered managed workflow asset

## Supported Workflows

The managed-workflow MVP supports only the following workflow IDs:

- `bmad-advanced-elicitation`
- `bmad-check-implementation-readiness`
- `bmad-cis-design-thinking`
- `bmad-cis-innovation-strategy`
- `bmad-cis-problem-solving`
- `bmad-cis-storytelling`
- `bmad-code-review`
- `bmad-correct-course`
- `bmad-create-architecture`
- `bmad-create-epics-and-stories`
- `bmad-create-prd`
- `bmad-create-product-brief`
- `bmad-create-story`
- `bmad-create-ux-design`
- `bmad-dev-story`
- `bmad-distillator`
- `bmad-document-project`
- `bmad-edit-prd`
- `bmad-help`
- `bmad-quick-dev`
- `bmad-review-adversarial-general`
- `bmad-review-edge-case-hunter`
- `bmad-sprint-planning`
- `bmad-sprint-status`

Note:

- `bmad-problem-solving` normalizes to `bmad-cis-problem-solving`.
- Persona activators like `bmad-dev`, `bmad-pm`, `bmad-qa`, and `bmad-sm` are intentionally out of scope for this feature.

## Definitions

- Managed workflow: A workflow whose phase/item state is owned by the backend.
- Phase: One workflow step file such as `steps/step-01-gather-context.md`.
- Item: One deterministic checklist item extracted from a phase file.
- Required item: A checklist item that must be completed for a phase or workflow to finish.
- Advisory item: Visible follow-up or next-step guidance that may appear in the checklist but does not block completion.
- Workflow run: The persisted state for one active managed workflow inside a task.

## User Experience

### Slash Invocation

When the user invokes `/bmad-code-review` or another supported workflow slash command:

1. The slash command activates a managed workflow run.
2. The backend resolves the registered workflow definition.
3. The backend loads the workflow assets and extracts ordered phases and items.
4. The backend renders the initial checklist into `task_progress`.
5. The prompt injects only the active phase instructions, not the entire workflow corpus.

### Workflow Progression

During execution:

1. The model sees the current phase and its remaining items.
2. The model explicitly marks items complete using a dedicated workflow action.
3. The backend updates canonical workflow state.
4. The backend regenerates `task_progress`.
5. When all required items in the current phase are complete, the backend advances to the next phase.
6. The next prompt injects the next phase file.

Notes:

- Required items advance in strict order.
- Advisory items can be shown to the model and user without blocking phase completion or `attempt_completion`.
- For first-wave branch-aware workflows, alternate-mode branches and obvious post-completion guidance are filtered or reclassified before they become blocking checklist items.

### Completion

If the model calls `attempt_completion` while required workflow items remain incomplete:

- The runtime rejects completion.
- The runtime responds with the remaining incomplete phases/items.
- The task remains in-progress.

## Non-Goals

- Semantic verification that a marked item was actually executed correctly.
- Generic managed support for every skill in `.cline/skills`.
- Automatic support for persona activators.
- Deep interpretation of arbitrary prose beyond deterministic phase/item extraction rules.

## Existing Runtime Anchors

This feature will build on these existing systems:

- Slash command parsing: `src/core/slash-commands/index.ts`
- Skill activation: `src/core/task/tools/handlers/UseSkillToolHandler.ts`
- Task state: `src/core/task/TaskState.ts`
- Task metadata persistence: `src/core/context/context-tracking/ContextTrackerTypes.ts`
- Prompt context building: `src/core/task/index.ts`
- Skills discovery: `src/core/context/instructions/user-instructions/skills.ts`
- Focus chain / task_progress rendering: `src/core/task/focus-chain/index.ts`
- Attempt completion handling: `src/core/task/tools/handlers/AttemptCompletionHandler.ts`

## Architecture

### 1. Managed Workflow Registry

Add a committed config file:

- `_bmad/_config/managed-workflows.json`

This is the runtime contract for the MVP. It must not rely only on ad hoc discovery.

Each entry contains:

```json
{
  "workflowId": "bmad-code-review",
  "slashCommand": "bmad-code-review",
  "skillName": "bmad-code-review",
  "module": "bmm",
  "skillPath": ".cline/skills/bmad-code-review/SKILL.md",
  "workflowPath": ".cline/skills/bmad-code-review/workflow.md",
  "phaseRoots": [
    ".cline/skills/bmad-code-review/steps"
  ],
  "checklistPath": null,
  "supportsManagedExecution": true,
  "packagedAssetPaths": [
    ".cline/skills/bmad-code-review/SKILL.md",
    ".cline/skills/bmad-code-review/workflow.md",
    ".cline/skills/bmad-code-review/steps/step-01-gather-context.md",
    ".cline/skills/bmad-code-review/steps/step-02-review.md",
    ".cline/skills/bmad-code-review/steps/step-03-triage.md",
    ".cline/skills/bmad-code-review/steps/step-04-present.md"
  ]
}
```

Rules:

- Only workflows in this file are managed by v1.
- `slashCommand` must match the canonical workflow ID.
- Every asset path must be repo-relative and package-verifiable.

### 2. Workflow Run State

Add a backend-owned persisted state model:

```ts
export type ManagedWorkflowStatus = "active" | "completed" | "blocked" | "cancelled"

export interface ManagedWorkflowItemState {
  id: string
  label: string
  sourceText: string
  completed: boolean
  optional?: boolean
  required?: boolean
  advisory?: boolean
  blocked?: boolean
}

export interface ManagedWorkflowPhaseState {
  id: string
  title: string
  sourcePath: string
  items: ManagedWorkflowItemState[]
  completed: boolean
}

export interface ManagedWorkflowRunState {
  workflowId: string
  slashCommand: string
  status: ManagedWorkflowStatus
  currentPhaseIndex: number
  phases: ManagedWorkflowPhaseState[]
  createdAt: number
  updatedAt: number
  allRequiredComplete: boolean
}
```

Persistence targets:

- `src/core/task/TaskState.ts`
- `src/core/context/context-tracking/ContextTrackerTypes.ts`

Recommended metadata addition:

```ts
managedWorkflowRun?: ManagedWorkflowRunState
```

## Phase And Item Extraction

### Phase Discovery

For each managed workflow:

1. Read `managed-workflows.json`.
2. Use `phaseRoots` to find ordered phase files.
3. Sort deterministically by filename.

Supported phase roots in v1:

- `steps`
- `steps-c`
- `steps-e`
- `steps-v`
- `domain-steps`
- `market-steps`
- `technical-steps`

### Item Extraction

Each phase file becomes one phase with multiple items.

Extraction rules for v1:

1. Read the full phase file.
2. Find the `## INSTRUCTIONS` section.
3. Convert top-level ordered list items into workflow items.
4. If an item contains nested bullet obligations, fold them into the parent item label or create deterministic child suffixes.
5. If the phase contains a `### CHECKPOINT` section, create one explicit blocking item at the end of the phase.
6. Ignore `## NEXT` when building current-phase items; `NEXT` defines the following phase boundary instead.

Example for `bmad-code-review/steps/step-01-gather-context.md`:

- Detect review intent
- Ask what to review if intent is unresolved
- Construct diff output
- Ask whether spec/story context exists
- Load referenced context docs if needed
- Run large diff sanity check
- Present checkpoint summary and wait for confirmation

This is intentionally deterministic but shallow. It is acceptable in v1 to derive items from markdown structure rather than deep semantic parsing.

## Backend Control Flow

### New Slash Command Action

Add a new persistent slash action:

```ts
type PersistentSlashCommandAction =
  | { type: "activate_managed_workflow"; workflowId: string; slashCommand: string }
  | { type: "activate_bmad_agent"; ... }
  | { type: "exit_bmad_agent" }
```

Behavior:

- If `/command` matches a managed workflow registry entry, return `activate_managed_workflow`.
- This path takes precedence over prompt-only workflow injection.

### Workflow Activation

On `activate_managed_workflow`:

1. Load the registry entry.
2. Build the initial `ManagedWorkflowRunState`.
3. Persist it to task state and task metadata.
4. Set `activeWorkflowId`.
5. Render `task_progress` from canonical workflow state.

### Workflow Item Completion

Add a backend action for item completion.

Preferred shape:

```ts
completeManagedWorkflowItem({
  workflowId,
  phaseId,
  itemId
})
```

Rules:

- Only the current phase can be updated.
- Only incomplete items in the current phase can be completed.
- Items are monotonic: complete means complete for the remainder of the run.
- When all required items in the current phase are complete, advance to the next phase automatically.

### Attempt Completion Gate

In `AttemptCompletionHandler`:

- If `managedWorkflowRun` exists and `allRequiredComplete !== true`, reject the call.
- Return a deterministic message listing incomplete phases/items.
- Do not allow `attempt_completion` to succeed based solely on model-authored `task_progress`.

## Prompting Behavior

### Replace Prompt-Owned Checklist Creation

For managed workflows, the prompt must stop instructing the model to invent the checklist.

Change `task_progress` prompting to:

- explain that the checklist is backend-owned
- instruct the model to keep it current by explicitly completing workflow items
- explain that only the current phase is active

### Add Managed Workflow Prompt Block

Extend `SystemPromptContext` with:

```ts
readonly managedWorkflowInstructions?: string
readonly managedWorkflowTaskProgress?: string
```

Add a new prompt component or reuse active workflow instructions to inject:

```xml
<active_managed_workflow workflow_id="bmad-code-review" phase_id="step-01-gather-context">
Current phase file: .cline/skills/bmad-code-review/steps/step-01-gather-context.md
Complete the remaining workflow items in this phase before moving on.
Do not mark items complete out of order.
Do not attempt task completion until the workflow is fully complete.
</active_managed_workflow>
```

Prompt injection rules:

- Inject only the current phase file contents.
- Do not inject future phase files until phase advancement occurs.
- Include the current canonical checklist state.

### UseSkill Behavior

For managed workflows, `use_skill` should not simply dump the entire skill instructions body into the prompt and trust the model to comply.

New behavior:

- `use_skill` on a managed workflow starts or resumes the managed workflow run.
- The prompt then includes managed workflow instructions plus current phase contents.
- Non-managed skills keep existing behavior.

## File-Level Implementation Plan

### New Files

- `src/core/task/managed-workflows/ManagedWorkflowTypes.ts`
- `src/core/task/managed-workflows/ManagedWorkflowRegistry.ts`
- `src/core/task/managed-workflows/ManagedWorkflowAssetLoader.ts`
- `src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts`
- `src/core/task/managed-workflows/ManagedWorkflowRenderer.ts`
- `src/core/task/managed-workflows/ManagedWorkflowController.ts`
- `src/core/task/managed-workflows/__tests__/ManagedWorkflowPhaseExtractor.test.ts`
- `src/core/task/managed-workflows/__tests__/ManagedWorkflowController.test.ts`
- `scripts/generate-managed-workflows.mjs`
- `scripts/verify-managed-workflow-assets.mjs`
- `_bmad/_config/managed-workflows.json`

### Files To Modify

- `src/core/slash-commands/index.ts`
  - register and resolve managed workflow slash commands
- `src/core/task/TaskState.ts`
  - add `managedWorkflowRun`
- `src/core/context/context-tracking/ContextTrackerTypes.ts`
  - persist `managedWorkflowRun`
- `src/core/task/index.ts`
  - activate managed workflow run
  - load managed workflow prompt context
- `src/core/task/tools/handlers/UseSkillToolHandler.ts`
  - route managed skills into managed execution path
- `src/core/task/tools/handlers/AttemptCompletionHandler.ts`
  - block premature completion
- `src/core/task/focus-chain/index.ts`
  - render canonical workflow checklist to `task_progress`
- `src/core/prompts/system-prompt/types.ts`
  - add managed workflow prompt fields
- `src/core/prompts/system-prompt/components/task_progress.ts`
  - change guidance for managed workflows
- `src/core/task/__tests__/prompt-context.test.ts`
  - update for managed workflow prompt inclusion
- `package.json`
  - add generation and verification scripts

### Optional Early Follow-Up

- `src/shared/slashCommands.ts`
  - expose managed workflow slash commands to command listings

## Packaging And Install Guarantees

This feature depends on packaged workflow assets. Today, `_bmad/**` and `.cline/skills/**` are not excluded by `.vscodeignore`, but there is no explicit verification that all required managed workflow files are actually present in packaged output.

### Required Packaging Contract

The following must be true after packaging:

- `managed-workflows.json` is present.
- Every file listed in `packagedAssetPaths` exists in the package.
- No managed workflow points to a missing or renamed asset.

### Packaging Scripts

Add these scripts:

- `generate-managed-workflows.mjs`
  - Generates `_bmad/_config/managed-workflows.json`
  - Normalizes `bmad-problem-solving` to `bmad-cis-problem-solving`
  - Resolves repo-relative asset paths

- `verify-managed-workflow-assets.mjs`
  - Loads `_bmad/_config/managed-workflows.json`
  - Validates every `packagedAssetPaths` entry exists in the repo before packaging
  - Validates these files are present in the built package output after packaging

### Package Hook Changes

Add verification in these paths:

- `npm run package`
- `scripts/package-standalone.mjs`
- any other publish or packaging flow that emits a VSIX or standalone artifact

Recommended `package.json` changes:

```json
{
  "scripts": {
    "generate-managed-workflows": "node scripts/generate-managed-workflows.mjs",
    "verify-managed-workflow-assets": "node scripts/verify-managed-workflow-assets.mjs",
    "package": "npm run generate-managed-workflows && npm run verify-managed-workflow-assets && ..."
  }
}
```

### Manifest Updates

Update these committed BMAD config files when introducing the new registry:

- `_bmad/_config/files-manifest.csv`
  - add `_bmad/_config/managed-workflows.json`
- `_bmad/_config/manifest.yaml`
  - bump install/update metadata as needed by project convention

Note:

- Existing BMAD manifests do not appear to be consumed by runtime today, so they should be treated as packaging/install metadata, not the active runtime source of truth.

## Tests

### Unit Tests

- Slash invocation resolves to `activate_managed_workflow`
- Registry loads only allowed managed workflow IDs
- Phase extraction produces expected items for:
  - `bmad-code-review`
  - `bmad-create-prd`
  - `bmad-review-edge-case-hunter`
- Completing final item in a phase advances to the next phase
- `attempt_completion` is blocked until all required items are complete

### Integration Tests

- Start a managed workflow, verify initial `task_progress`
- Complete phase items, verify prompt context advances to next phase only
- Package build includes every required managed workflow asset

## Implementation Sequence

### Phase 1: Registry And State

1. Add `managed-workflows.json`
2. Add managed workflow types and registry loader
3. Extend task state and metadata persistence

### Phase 2: Activation And Rendering

1. Add slash activation path
2. Add managed workflow controller
3. Render workflow state into `task_progress`

### Phase 3: Prompt Gating

1. Add managed workflow prompt context
2. Inject current phase only
3. Update `use_skill` behavior for managed workflows

### Phase 4: Completion Guard

1. Add item completion action
2. Add phase advancement
3. Block `attempt_completion`

### Phase 5: Packaging Safety

1. Add generation and verification scripts
2. Update package scripts
3. Update BMAD file manifests
4. Add package smoke test

## Risks

- Markdown phase files are heterogeneous, so deterministic item extraction will need workflow-specific edge handling.
- Nested instructions may require extraction heuristics to stay stable across future workflow edits.
- Prompting changes must avoid breaking non-managed skills.

## Future Extensions

- Semantic validation of completed items
- Optional item support and `not_applicable` transitions
- Persona-activated workflow orchestration
- Managed support for the full BMAD catalog
- UI controls for item completion and phase advancement
