# Managed Workflow Placeholder Resolution Plan

## Purpose

Add managed-workflow runtime support so placeholder values inside workflow and step files are resolved before they are injected into the AI agent prompt.

This plan covers two classes of placeholders:

- Stable runtime/config placeholders such as `{project-root}`, `{user_name}`, `{communication_language}`, `{output_folder}`, and `{date}` loaded from `.cline/workflow-config.yaml`
- Dynamic workflow-state placeholders such as `{{research_topic}}`, `{prd_file_path}`, `{validation_report_path}`, `{spec_file}`, and other values discovered or established while the workflow is running

The target outcome is that the managed workflow reminder shown under `USER'S CUSTOM INSTRUCTIONS` contains real resolved values instead of raw placeholder tokens.

## Current Findings

- Managed workflow extraction currently parses workflow and step files into instruction nodes, but does not resolve placeholders before storing or rendering them.
- Managed workflow rendering currently emits node text directly into the prompt.
- The outer prompt assembly resolves `{{CUSTOM_INSTRUCTIONS}}`, but does not recursively resolve placeholders inside the managed workflow text.
- Placeholder text using `{{...}}` is currently stripped in some extraction paths by `stripMarkdown()`, which makes dynamic placeholders impossible to render correctly.
- Managed workflow run state is already persisted and restored, so adding managed placeholder state is structurally straightforward.

Relevant files:

- [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts)
- [ManagedWorkflowRenderer.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRenderer.ts)
- [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts)
- [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/types.ts)
- [CompleteWorkflowItemToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CompleteWorkflowItemToolHandler.ts)
- [TemplateEngine.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/templates/TemplateEngine.ts)
- [user_instructions.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/user_instructions.ts)

## Design Goals

- Preserve placeholder text during extraction instead of stripping it.
- Resolve stable runtime/config placeholders automatically when a managed workflow run starts.
- Resolve dynamic workflow-state placeholders from persisted workflow state.
- Leave unknown placeholders visible instead of erasing them.
- Support current authoring with both `{placeholder}` and `{{placeholder}}`.
- Keep the implementation scoped to the managed-workflow path without changing unrelated prompt systems.

## Action Plan

### 1. Add Placeholder State to Managed Workflow Run State

Extend managed workflow runtime types to store placeholder values directly on the run state.

Add to `ManagedWorkflowRunState`:

- `stablePlaceholders: Record<string, string>`
- `dynamicPlaceholders: Record<string, string>`

Add a small helper that returns the effective merged placeholder map:

- dynamic values override stable values
- stable values override nothing

This keeps runtime resolution predictable and persistence-friendly.

### 2. Preserve Placeholders During Extraction

Update `stripMarkdown()` in `ManagedWorkflowPhaseExtractor.ts` so it no longer removes `{{...}}`.

Current behavior removes double-curly placeholders entirely. That must stop.

Requirements:

- Do not strip `{{placeholder}}`
- Do not strip `{placeholder}`
- Continue stripping markdown formatting and HTML-like wrapper tags as today

This change is required before any runtime resolution will work reliably.

### 3. Seed Stable Runtime and Config Placeholders at Workflow Start

When a managed workflow run is created in `ManagedWorkflowController.ts`, build `stablePlaceholders` from runtime data plus the canonical workspace config file at `.cline/workflow-config.yaml`.

Initial supported values should include:

- `project-root`
- `cwd`
- `project_name`
- `output_folder`
- `planning_artifacts`
- `implementation_artifacts`
- `project_knowledge`
- `user_name`
- `communication_language`
- `document_output_language`
- `user_skill_level`
- `date`

If any value is unavailable, omit it rather than creating a blank substitution.

### 4. Add a Dynamic Placeholder Update Mechanism

Introduce a dedicated managed-workflow tool for storing dynamic placeholder values during execution.

Recommended tool name:

- `set_workflow_placeholders`

Recommended input shape:

```json
{
  "values": {
    "research_topic": "industrial automation",
    "prd_file_path": "docs/prd.md",
    "validation_report_path": "docs/validation-report.md"
  }
}
```

Behavior:

- merge into `managedWorkflowRun.dynamicPlaceholders`
- update in-memory task state
- persist into task metadata the same way `complete_workflow_item` already does

Why a dedicated tool:

- dynamic values cannot be reliably inferred from arbitrary conversation text
- explicit persistence is simpler, more debuggable, and easier to test

### 5. Resolve Placeholders When Rendering the Managed Workflow Prompt

Add a managed-workflow-specific resolver in `ManagedWorkflowRenderer.ts`.

Apply it to:

- current phase title if needed
- item labels
- step goals
- instruction node `text`
- instruction node `condition`
- checkpoint text
- route text when displayed to the model

Support both syntaxes:

- `{placeholder}`
- `{{placeholder}}`

Resolution order:

1. `dynamicPlaceholders`
2. `stablePlaceholders`
3. leave token unchanged if unresolved

The resolver should be local to the managed-workflow system rather than trying to reuse the generic prompt `TemplateEngine` directly.

### 6. Keep Missing Placeholders Visible

Do not erase unresolved placeholders.

If a placeholder has no known value:

- keep the original token in the rendered prompt

This makes authoring mistakes visible and avoids silently degrading instructions.

### 7. Standardize Syntax Going Forward

For backward compatibility, runtime should resolve both placeholder syntaxes.

For authoring guidance, standardize on one syntax after rollout. Recommendation:

- prefer `{{placeholder}}`

Reason:

- there is already an established double-curly placeholder engine elsewhere in the prompt system
- it is easier to distinguish from literal brace use in examples and path descriptions

### 8. Update Documentation

After implementation, update the managed workflow formatting guide to define:

- supported placeholder syntax
- which placeholders are stable runtime/config values
- which placeholders must be set dynamically
- how unresolved placeholders behave

## Implementation Checklist

### Data Model

- [ ] Add `stablePlaceholders` to `ManagedWorkflowRunState` in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/types.ts)
- [ ] Add `dynamicPlaceholders` to `ManagedWorkflowRunState` in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/types.ts)
- [ ] Add helper for merged placeholder lookup

### Extraction

- [ ] Update `stripMarkdown()` in [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts) so `{{...}}` is preserved
- [ ] Verify instruction node parsing still works for `action`, `ask`, `output`, `detail`, `branch`, and route nodes
- [ ] Verify placeholder text survives in step goals, node text, and branch conditions

### Stable Placeholder Initialization

- [ ] Build a stable placeholder map when creating the run in [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts)
- [ ] Populate the first supported set of runtime/config placeholders
- [ ] Persist those values in task metadata via the existing managed workflow save path

### Dynamic Placeholder Updates

- [ ] Add a new managed-workflow tool definition for `set_workflow_placeholders`
- [ ] Add a tool handler that merges new values into `dynamicPlaceholders`
- [ ] Persist updated dynamic placeholders in task metadata
- [ ] Return a clear tool success message showing which keys were stored

### Rendering

- [ ] Add a managed workflow placeholder resolver to [ManagedWorkflowRenderer.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRenderer.ts)
- [ ] Resolve placeholders in item labels
- [ ] Resolve placeholders in step goals
- [ ] Resolve placeholders in instruction text
- [ ] Resolve placeholders in branch conditions
- [ ] Resolve placeholders in checkpoint text
- [ ] Leave unresolved placeholders unchanged

### Prompt Assembly Validation

- [ ] Verify [user_instructions.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/user_instructions.ts) continues to inject the already-resolved managed workflow string without further escaping or stripping

### Docs

- [ ] Update [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md) with placeholder authoring rules
- [ ] Document the new dynamic placeholder tool and when workflows should use it

## QA Plan

### Unit Tests

Add or extend tests for:

- `ManagedWorkflowPhaseExtractor`
- `ManagedWorkflowRenderer`
- managed workflow controller persistence
- dynamic placeholder tool handler

Specific test cases:

1. Placeholder Preservation
- fixture step contains `{communication_language}` and `{{research_topic}}`
- extractor preserves both tokens in parsed instruction nodes

2. Stable Placeholder Resolution
- run state includes stable placeholders for `communication_language` and `user_name`
- rendered prompt shows real values instead of placeholder tokens

3. Dynamic Placeholder Resolution
- run state includes `dynamicPlaceholders.research_topic = "industrial automation"`
- rendered prompt shows `industrial automation` where `{{research_topic}}` was authored

4. Missing Placeholder Behavior
- placeholder key is absent from both maps
- rendered prompt still contains the original placeholder token

5. Branch Condition Resolution
- branch condition includes a placeholder
- rendered prompt shows the resolved condition text

6. Persistence
- save metadata with both stable and dynamic placeholder maps
- restore metadata and verify values survive

7. Tool Update Flow
- call `set_workflow_placeholders`
- verify in-memory run state changes
- verify task metadata is updated

### Integration Tests

Create one end-to-end managed workflow fixture with:

- stable placeholders in workflow root
- dynamic placeholders in step text
- branch conditions using placeholders
- checkpoint text using placeholders

Validate:

- initial prompt resolves stable placeholders only
- after dynamic placeholder update tool runs, later prompt refresh resolves dynamic placeholders too

### Manual QA

Use one real workflow from `.cline/skills/` that contains both stable and dynamic placeholders.

Suggested manual flow:

1. start the managed workflow
2. inspect first injected prompt block
3. confirm stable placeholders are resolved
4. trigger a step that discovers or sets a dynamic value
5. call the dynamic placeholder tool
6. inspect the next prompt block
7. confirm the dynamic value now appears in current-step instructions

### Regression Checks

Verify that:

- workflows without placeholders render exactly as before
- unresolved placeholders are not stripped
- prompt rendering still works when no stable or dynamic placeholder map exists
- managed workflow resume logic still works across saved metadata

## Acceptance Criteria

- Stable runtime/config placeholders render as real values in the AI agent prompt.
- Dynamic workflow-state placeholders render as real values after they are explicitly stored.
- Unknown placeholders remain visible rather than disappearing.
- No placeholder text is stripped during extraction.
- Managed workflow placeholder state persists across task metadata save and restore.
- Existing workflows without placeholder usage do not regress.
