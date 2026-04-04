# Build Epics Document Tool Requirements

## Purpose

This document defines the requirements for introducing a new workflow-owned tool named `build_epics_document` to satisfy Step 2 of [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md).

This document is intentionally limited to the custom-tool capability. It does not define workflow-start form behavior or deterministic workflow progression for `create-epics.md`.

## Source Of Truth

These requirements are grounded in the current workflow text, current sibling tool implementations, and the current tool registration/runtime seams:

- [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md)
- [epics-template.md](/Users/robertboston/Documents/Cline/.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md)
- [create-prd.md](/Users/robertboston/Documents/Cline/Workflows/create-prd.md)
- [build_review_input.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_review_input.ts)
- [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts)
- [build_review_diff_output.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_review_diff_output.ts)
- [BuildReviewDiffOutputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewDiffOutputToolHandler.ts)
- [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts)
- [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts)
- [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts)
- [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts)
- [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts)
- [workflow-placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts)

## Capability Boundary

This document does not define:

- workflow-start form collection for `architecture_document`, `prd`, `mode`, `ui_spec`, or `ux_spec`
- deterministic completion of Step 1 or Step 2
- workflow-form UI, resolver, or fallback behavior
- Step 3 epic drafting behavior

Those requirements belong in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/requirements.md)
- [deterministic-progression-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/deterministic-progression-requirements.md)

## Current Workflow Audit

Step 2 of [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md#L10) is already authored as a system-owned step with a deterministic branch:

- if `{mode}` is `new`, scaffold and populate `{output_folder}/planning_artifacts/epics.md`
- if `{mode}` is `continue`, resolve the existing epics document and set it as `{output_file}`

The live runtime already has sibling examples for this pattern:

- `build_review_input` is a workflow-owned tool with no required human-supplied parameters
- it resolves workflow-owned inputs from placeholder state
- it writes a deterministic artifact
- it returns machine-checkable structured success/failure output

`build_epics_document` should follow that sibling pattern more closely than the human-input-collecting `build_review_diff_output` pattern.

## Core Requirement

The system must support a workflow-owned Step 2 tool named `build_epics_document` that resolves the active workflow inputs from placeholder state, prepares the `epics.md` planning artifact according to the authored Step 2 rules, and leaves the workflow ready for Step 3 to use that artifact as `{output_file}`.

## Tool Contract Requirements

### 1. Tool id and prompt exposure

The new tool's canonical id and exposed tool name must both be:

- `build_epics_document`

This tool must be registered as a normal prompt tool, not as an internal-only response tool.

### 2. Public parameter surface

The tool should follow the current `build_review_input` convention and expose no required human-supplied parameters.

It must resolve its inputs from active workflow state instead of recollecting them from the human.

### 3. Workflow-owned input contract

The tool must resolve the active workflow values from placeholder state using these canonical keys:

- `mode`
- `architecture_document`
- `prd`
- `ui_spec` when present
- `ux_spec` when present

The tool must also rely on the live stable placeholder contract for:

- `output_folder`
- `project-root` and equivalent runtime resolution support for `project_root` / `cwd`

### 4. Missing-input behavior

The tool must fail with an explicit tool error when any required workflow-owned Step 2 input is absent or empty:

- `mode`
- `architecture_document`
- `prd`
- `output_folder`

The tool must not silently guess default values for those inputs.

### 5. Mode contract

The tool must support exactly these workflow-authored modes:

- `new`
- `continue`

Unsupported `mode` values must return a concrete tool error. The tool must not treat arbitrary non-empty strings as valid modes.

## Artifact Requirements

### 1. Canonical artifact path

The canonical Step 2 artifact path must be:

- `{output_folder}/planning_artifacts/epics.md`

The tool must resolve that path from stable placeholders at runtime. It must not ask the human to provide the artifact path.

### 2. `new` mode behavior

When `mode === "new"`, the tool must:

- load [epics-template.md](/Users/robertboston/Documents/Cline/.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md)
- create or replace the canonical `epics.md` artifact at `{output_folder}/planning_artifacts/epics.md`
- preserve the template's existing document structure
- add the workflow-required source-document references into the artifact frontmatter
- populate the requirements inventory content required by Step 2

This path is the only mode that may scaffold a new `epics.md` document.

### 3. `continue` mode behavior

When `mode === "continue"`, the tool must treat the existing canonical `epics.md` path as the workflow artifact and make it available as `{output_file}` for downstream steps.

This mode must not silently create a new epics document. If the expected `epics.md` artifact does not exist, the tool must fail with a concrete tool error that tells the runtime the continue path could not be satisfied.

### 4. Atomic persistence

When the tool writes `epics.md`, it must use the same class of atomic replacement behavior used by the sibling artifact-building tools so partial writes do not leave a corrupted planning artifact behind.

### 5. Write-proof behavior

When `mode === "new"` and the tool writes `epics.md`, it must record placeholder-workflow write proof for the artifact in the same way sibling workflow-owned edit tools do today.

`continue` mode must not fabricate a current-task write proof for an artifact it did not write.

## Document Construction Requirements

### 1. Template fidelity

The output document must remain based on the existing epics template rather than being regenerated from ad hoc inline strings.

At minimum, the tool must preserve the template's current top-level structure:

- frontmatter
- `# {{project_name}} - Epic Breakdown`
- `## Overview`
- `## Requirements Inventory`
- `## Epic List`

### 2. Frontmatter augmentation

The tool must augment the template frontmatter with the Step 2 source-document references required by the authored workflow:

- architecture document path
- PRD path
- optional UI/UX document paths when provided

The tool must preserve existing template frontmatter fields while adding those references. It must not replace the entire frontmatter block with a narrower custom structure.

### 3. Requirements inventory population

The generated `epics.md` must include Step 2 inventory content derived from the PRD for these categories:

- functional requirements
- non-functional requirements
- UI/UX requirements
- domain-specific requirements
- roadmap

### 4. PRD contract alignment

The tool must align its extraction behavior to the live PRD workflow contract in [create-prd.md](/Users/robertboston/Documents/Cline/Workflows/create-prd.md), not to invented headings.

Grounded implications:

- functional requirements map to the content authored in PRD Step 10
- non-functional requirements map to the content authored in PRD Step 11
- domain-specific requirements map to the content authored in PRD Step 6
- roadmap maps to the content authored in PRD Step 13

The current PRD workflow does not define a clearly canonical standalone UI/UX section heading. Because of that, `build_epics_document` must not hard-code a brittle dependency on one invented PRD heading such as `## UI/UX Requirements` unless the PRD document contract is separately aligned first.

### 5. Optional UI/UX document handling

If `ui_spec` and/or `ux_spec` are provided, the tool must record those paths in the output document metadata.

This Step 2 buildout does not require the tool to parse and merge those documents into the requirements inventory unless that behavior is separately specified later. The authored workflow text only requires the paths to be added to frontmatter.

## Workflow-State Outcome Requirements

### 1. `{output_file}` availability

On successful completion in either mode, the workflow-observable state must satisfy the Step 2 contract that the canonical `epics.md` path is available as `{output_file}` for Step 3.

This document does not prescribe the exact implementation seam used to make `{output_file}` available. It does require that the state be established before Step 3 executes.

### 2. No human recollection

The tool must not ask the user to resupply:

- the epics artifact path
- the template path
- workflow-owned source document paths already present in placeholder state

## Result Contract Requirements

The tool must return structured, machine-checkable success/failure output consistent with the sibling deterministic artifact tools.

On success, the result must clearly communicate:

- whether an artifact was written during this call
- the resolved canonical artifact path
- the mode that was executed
- whether the workflow now has an `output_file`-ready epics artifact

On failure, the tool must return a concrete tool error rather than vague prose.

## Registration Requirements

The sibling-pattern registration surfaces for `build_epics_document` must include:

- a new enum member in [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts)
- a prompt-tool spec file under [tools](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools)
- registration through [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts)
- a tool handler registered through [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts)
- edit-file auto-approval treatment in [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts)
- an explicit non-response-tool entry in [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts)

## Non-Requirements

This buildout does not require:

- a new workflow form
- a new deterministic progression gate
- a new stable placeholder in `.cline/workflow-config.yaml`
- a public parameter schema for artifact paths
- UI/UX document parsing beyond recording the provided paths
- epic drafting, refinement, or approval logic from Step 3

## Test Requirements

### 1. Registration coverage

Add tests proving the tool is registered across the standard sibling surfaces:

- tool enum
- tool spec registry
- executor handler registry
- auto-approval classification
- response-tool registry exhaustiveness

### 2. `new` mode positive coverage

Add focused handler tests proving that when placeholder state contains valid Step 2 inputs and `mode === "new"`:

- the template is loaded
- `{output_folder}/planning_artifacts/epics.md` is created or replaced
- the output document preserves template structure
- source-document references are added to frontmatter
- the requirements inventory is populated for the required categories
- write proof is recorded

### 3. `continue` mode positive coverage

Add focused handler tests proving that when `mode === "continue"` and the canonical `epics.md` artifact already exists:

- the tool resolves the existing artifact path successfully
- the tool does not rewrite the artifact unnecessarily
- the success result makes the artifact available for downstream `{output_file}` use

### 4. Negative coverage

Add handler tests proving the tool fails concretely when:

- `mode` is missing
- `mode` is not `new` or `continue`
- `architecture_document` is missing
- `prd` is missing
- `output_folder` cannot be resolved
- `continue` mode is requested but the canonical `epics.md` artifact is absent

### 5. Relative-path coverage

Add coverage proving the tool behaves correctly when:

- `output_folder` is relative and must be resolved from workflow cwd
- workflow-owned document paths are relative and must be resolved from placeholder workflow context

## Practical Outcome

If the requirements above are met:

- Step 2 of `create-epics.md` can run through a system-owned deterministic tool
- `new` mode can scaffold and populate the epics planning artifact
- `continue` mode can rebind the workflow to the existing epics artifact without recreating it
- the tool capability stays cleanly separated from both workflow-start-form collection and deterministic progression ownership
