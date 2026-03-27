# Test 18 Action Plan

## Goal

Fix workflow-derived prompt placeholder resolution by making stable workflow placeholders load from one canonical workspace config file at `.cline/workflow-config.yaml`, while keeping dynamic workflow placeholders owned by `set_workflow_placeholders`.

Target outcome:

- workflow-derived prompt text resolves stable placeholders from `.cline/workflow-config.yaml`
- dynamic placeholders continue to resolve from persisted task state
- unresolved placeholders remain visible
- placeholder workflows and managed workflows use the same stable placeholder source

## Design Rules

- Stable placeholders come from `.cline/workflow-config.yaml` plus a small built-in base (`project-root`, `cwd`, `date`, and related built-ins already supported by the loader).
- Dynamic placeholders come only from workflow runtime state via `set_workflow_placeholders`.
- Workflow-derived prompt text must always be rendered against `stable + dynamic` before injection into the model prompt.
- Placeholder resolution should not depend on `_bmad` module layout or managed-workflow matching.

## Implementation Steps

### 1. Introduce a canonical workflow config path helper

Create a single helper that resolves the stable workflow config location for the current workspace.

Files:

- [workflow-placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts)

Changes:

- Add a helper such as `getCanonicalWorkflowConfigPath(cwd: string): string`.
- Return `path.resolve(cwd, ".cline", "workflow-config.yaml")`.
- Refactor `buildWorkflowStablePlaceholders(...)` so callers can omit `configPath` and it defaults to the canonical workflow config path.
- Keep current built-in placeholders intact.
- Continue loading all scalar/object values from the YAML file and recursively resolving nested placeholder references.

Why:

- This makes `.cline/workflow-config.yaml` the single source of truth for stable workflow variables.
- Adding a new stable placeholder should usually require only editing the config file.

### 2. Stop inferring stable config from placeholder-workflow file paths

Remove `_bmad/...` and `.cline/skills/...` path-shape discovery as the primary mechanism for stable placeholder loading.

Files:

- [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts)

Changes:

- Remove or sharply simplify `resolveConfigPathForWorkflow(...)`.
- Stop storing `configPath` on `ActivePlaceholderWorkflowSource` as the main input for stable placeholder loading.
- If backward compatibility is needed, keep old config-path inference only as a temporary fallback behind the new canonical path.
- Update `buildActivePlaceholderWorkflowSource(...)` so placeholder workflow activation no longer depends on discovering module ownership just to find stable config.

Why:

- Stable placeholder resolution should not depend on where a workflow file lives.
- External workflows like `Workflows/code-review.md` should work the same as packaged workflows.

### 3. Move placeholder workflow activation to the canonical stable config

Ensure placeholder workflow activation always seeds stable placeholders from `.cline/workflow-config.yaml`.

Files:

- [workflow-activation.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts)

Changes:

- Update `activatePlaceholderWorkflowInTaskState(...)` to call `buildWorkflowStablePlaceholders({ cwd })` without relying on `workflowSource.configPath`.
- Keep `activePlaceholderWorkflowStableValues` and `activePlaceholderWorkflowValues` as separate stores.
- Add activation logging showing:
  - workflow id / path
  - canonical config path
  - whether the config file was found
  - sample stable keys loaded such as `output_folder`, `communication_language`, and `project_name`

Why:

- The failing case in Test 18 is specifically that stable placeholders like `{output_folder}` were not available during step-detail rendering.

### 4. Move managed workflows to the same stable config source

Make managed workflows and placeholder workflows load stable placeholders from the same workspace config.

Files:

- [placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/placeholders.ts)
- [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts)

Changes:

- Update `buildManagedWorkflowStablePlaceholders(...)` to call the same canonical stable-placeholder loader used by placeholder workflows instead of deriving `_bmad/<module>/config.yaml`.
- Remove the assumption that stable placeholder config is module-specific.
- Keep `dynamicPlaceholders` behavior unchanged.

Why:

- The product rule is now that all workflows share one stable workflow config.
- This removes divergence between managed and placeholder workflow behavior.

### 5. Ensure workflow-derived prompt text is always rendered against stable + dynamic maps

Keep one resolution path for any text injected from workflow content.

Files:

- [placeholder-workflow-rendering.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-rendering.ts)
- [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts)
- [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)
- [ManagedWorkflowRenderer.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRenderer.ts)

Changes:

- Keep `getPlaceholderWorkflowValueMap(stable, dynamic)` as the merge point where dynamic overrides stable.
- Verify that placeholder workflow step details always render from the merged map before prompt injection.
- Verify that placeholder workflow activation instructions use the same merged map.
- Verify that managed workflow rendering resolves against the same stable config plus managed dynamic placeholders.
- Add diagnostics when rendered workflow text still contains unresolved placeholder tokens.

Why:

- Stable placeholders should resolve automatically.
- Dynamic placeholders should resolve when set.
- Anything still unresolved after both passes is either expected future dynamic state or an authoring/config error.

### 6. Keep `set_workflow_placeholders` scoped to dynamic variables

Do not let stable placeholder resolution depend on `set_workflow_placeholders`.

Files:

- [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts)
- [set_workflow_placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts)
- [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts)

Changes:

- Keep the tool for dynamic placeholder persistence only.
- Update descriptions/examples if needed to reinforce that this tool stores values discovered during workflow execution, not config-backed stable values like `output_folder`.
- Preserve the explicit `{"values": {...}}` shape.

Why:

- This keeps the contract simple:
  - config file for stable values
  - tool calls for dynamic values

### 7. Migrate config from `_bmad/.../config.yaml` to `.cline/workflow-config.yaml`

Adopt the new canonical file and preserve the values currently depended on by workflows.

Files:

- [workflow-placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts)
- workspace config file to add: `.cline/workflow-config.yaml`
- documentation files that mention `_bmad/.../config.yaml`

Changes:

- Create `.cline/workflow-config.yaml` as the new canonical source.
- Copy the stable workflow keys currently relied on from `_bmad/bmm/config.yaml` into the new file.
- Decide whether `_bmad/.../config.yaml` remains temporarily supported as a migration fallback or is removed immediately.
- If a fallback period is used, emit a warning when the old location is read.

Why:

- The config is no longer BMAD-module-specific and should live in a neutral workspace-owned location.

### 8. Add regression coverage for the new contract

Tests should prove the new stable/dynamic split across both workflow systems.

Files:

- [workflow-placeholders.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/__tests__/workflow-placeholders.test.ts)
- [placeholder-workflow-step-details.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/__tests__/placeholder-workflow-step-details.test.ts)
- [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts)
- [ManagedWorkflowController.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/__tests__/ManagedWorkflowController.test.ts)
- prompt integration / focus-chain tests where current-step details are asserted

Add tests for:

- placeholder workflow step details resolve `{output_folder}` from `.cline/workflow-config.yaml`
- activation instructions resolve stable placeholders from `.cline/workflow-config.yaml`
- managed workflows resolve stable placeholders from `.cline/workflow-config.yaml`
- unresolved dynamic placeholders remain visible until set by `set_workflow_placeholders`
- dynamic placeholders override stable placeholders when both exist
- old path-based config inference is no longer required for external workflow files like `Workflows/code-review.md`

### 9. Update docs and authoring guidance

Document the new stable-placeholder contract clearly.

Files:

- [test-18-findings.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-18-findings.md)
- workflow authoring docs / workflow formatting guides
- any docs that currently point authors to `_bmad/.../config.yaml`

Changes:

- Document `.cline/workflow-config.yaml` as the canonical stable placeholder source.
- State that adding a new stable placeholder normally means:
  1. add a key to `.cline/workflow-config.yaml`
  2. reference it in workflow markdown
- State that `set_workflow_placeholders` is only for dynamic runtime values.

## Acceptance Criteria

- Placeholder workflow current-step prompt resolves stable placeholders like `{output_folder}` without any `set_workflow_placeholders` call.
- Managed workflows and placeholder workflows both resolve stable placeholders from `.cline/workflow-config.yaml`.
- Workflow-derived prompt text is always rendered against merged `stable + dynamic` placeholders before injection.
- Unresolved placeholders that remain are only:
  - not-yet-set dynamic placeholders, or
  - authoring/config mismatches
- No workflow depends on `_bmad/<module>/config.yaml` as the primary stable placeholder source.

## Suggested Execution Order

1. Implement canonical config-path helper in [workflow-placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts).
2. Move placeholder workflow activation in [workflow-activation.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts) to the canonical source.
3. Move managed workflow stable-placeholder loading in [placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/placeholders.ts) to the same source.
4. Simplify config-path inference in [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts).
5. Add runtime diagnostics.
6. Add tests.
7. Add `.cline/workflow-config.yaml` and update docs.
