# Backend Workflow Tool Contract Realignment Requirements

## Purpose

This document defines the requirements to realign backend-owned workflow automation tools so they no longer depend on prompt-tool configuration when they are never surfaced to the LLM.

The required outcome is:

- backend-only workflow automation tools use a runtime-owned contract registry
- prompt-exposed tools remain in the existing system-prompt tool architecture
- future contributors have explicit bucket rules that tell them which architecture to use
- canonical docs and READMEs are updated so future agents do not continue driving backend-only workflow automation through prompt-tool registration

## Current Runtime Baseline

The live codebase currently has a mixed architecture:

- shared tool ids live in [src/shared/tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts)
- prompt-defined tools are registered through [src/core/prompts/system-prompt/tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts) and resolved through [src/core/prompts/system-prompt/registry/ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts)
- workflow-form schema lookup currently depends on that prompt registry in [src/core/task/workflow-form/schema.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts)
- workflow-form dictionary generation also depends on that same lookup path in [src/core/task/workflow-form/dictionaries/buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts)
- runtime execution already belongs to backend handlers in [src/core/task/tools/ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts)
- workflow-form execution already runs through runtime tool execution in [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- workflow-end automation already has an internal-only runtime path through [src/core/task/ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts) and [src/core/task/workflowCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflowCompletionHandler.ts)

This means the primary architectural drift is not runtime execution. The drift is that backend-only workflow automation still depends on prompt-tool schema/configuration because workflow-form schema discovery currently treats the prompt-tool registry as the only canonical tool-contract source.

## Required Outcome

After this update:

- backend-only workflow automation tools must no longer require:
  - prompt-tool spec files
  - registration in [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts)
  - prompt variant exposure
  - native-schema compaction in [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts)
  - contextual prompt-tool gating in the system-prompt registry
- workflow forms must resolve backend-only tool contracts from a runtime-owned registry rather than from `ClineToolSet`
- workflow completion and other internal workflow automation must use the same backend-only contract bucket
- prompt-exposed tools must remain in the existing prompt-tool architecture
- the documentation must explicitly define what belongs in each bucket moving forward

## Architecture Buckets

### 1. Shared Tool Ids

All built-in tool ids must continue to live in [src/shared/tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts) under `ClineDefaultTool`.

This is a shared namespace, not a prompt-exposure decision.

Adding a tool id to `ClineDefaultTool` must not, by itself, imply that the tool belongs in the prompt-tool architecture.

### 2. Prompt-Exposed Tools

Prompt-exposed tools are tools that may be surfaced to the model through any prompt or native-tool path.

This includes:

- tools registered through the system-prompt tool layer
- tools included in prompt variant configs
- tools subject to native-schema compaction or contextual tool filtering
- dual-surface workflow tools that the workflow instructions or model-visible tool surfaces can still direct the AI to call

Prompt-exposed tools must continue to use the existing architecture documented in:

- [docs/tools-reference/how-to-add-a-tool.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/tools-reference/how-to-add-a-tool.md)
- [docs/system-prompt-tool-reference.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/system-prompt-tool-reference.md)
- [src/core/prompts/system-prompt/tools/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/README.md)

### 3. Backend-Only Workflow Automation Tools

Backend-only workflow automation tools are tools invoked only by runtime-owned workflow automation paths and never surfaced to the LLM as prompt/native/contextual tools.

This includes tools invoked by:

- workflow forms
- workflow completion handlers
- other internal workflow-orchestration seams owned by runtime code rather than assistant-authored tool selection

Backend-only workflow automation tools must not require prompt-tool registration or prompt-tool maintenance work.

## Bucket Classification Requirements

The implementation and documentation must lock the following classification rules for future work.

### A. A Tool Must Be Prompt-Exposed When

A tool belongs in the prompt-exposed bucket when any of the following is true:

- the model may call it directly in normal operation
- the tool may appear in prompt-built or native tool schemas
- the tool must be gated by prompt variant exposure or contextual tool filtering
- authored workflow instructions explicitly tell the AI to use that tool

### B. A Tool Must Be Backend-Only When

A tool belongs in the backend-only workflow automation bucket when all of the following are true:

- runtime code invokes it without relying on model selection
- it is used only by workflow automation seams such as workflow forms or workflow completion
- it is not intended to appear in prompt tool catalogs, native tool schemas, or contextual tool matrices
- authored workflow documents do not rely on the AI seeing that tool as an available tool

### C. Dual-Surface Tools

Dual-surface tools remain part of the prompt-exposed bucket for this update.

There is no separate third implementation architecture for dual-surface tools in this scope.

## Locked Initial Migration Set

The requirements must lock the following tools into the backend-only workflow automation bucket for this update:

- `build_review_input`
- `build_tech_spec_document`
- `capture_brainstorming_topic`
- `prepare_brainstorming_session`
- `select_target_epic`
- `build_epic_delivery_spec`
- `build_story_document`
- `build_epics_document`
- `code_review_spec_update`

The requirements must also lock the following tools into the prompt-exposed bucket for this update:

- `set_workflow_placeholders`
- `build_review_diff_output`
- `workflow_progress_request`
- `complete_workflow_item`

These prompt-exposed tools must not be migrated into the backend-only registry in this update.

## Runtime-Owned Backend Contract Requirements

### 1. Canonical Registry Location

The canonical registry for backend-only workflow automation tool contracts must live under [src/core/task/tools](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools).

It must not live under [src/core/task/workflow-form](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form), because the bucket must serve both workflow forms and non-form workflow automation such as workflow completion.

### 2. Canonical Contract Shape

The backend-only registry must use a runtime-specific contract type.

It must not reuse `ClineToolSpec` as the stored shape.

The runtime-specific contract must exclude prompt-only concerns, including:

- `variant`
- prompt-facing `instruction` content written for model guidance
- prompt-facing description wording written for model consumption
- `contextRequirements`
- native-schema compaction concerns

The runtime-specific contract must include only the fields needed by runtime consumers such as:

- tool id
- the JSON-schema-like parameter contract required by workflow-form schema resolution
- stable metadata required by runtime dictionary builders if that metadata remains necessary at runtime

### 3. Shared Use Across Backend Automation

The backend-only contract registry must be shared across:

- workflow-form schema resolution
- workflow-form tool dictionary generation
- workflow completion and other internal workflow automation seams that need a backend-owned tool contract reference

This update must not create one registry for workflow forms and a separate registry for workflow completion.

## Workflow-Form Requirements

### 4. Schema Lookup Ownership

[src/core/task/workflow-form/schema.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts) must stop resolving backend-only workflow automation tool contracts from `registerClineToolSets()` and `ClineToolSet`.

For backend-only tools, workflow-form schema lookup must resolve from the runtime-owned backend contract registry.

### 5. Dictionary Builder Ownership

[src/core/task/workflow-form/dictionaries/buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts) must stop depending on prompt-tool lookup for backend-only tools.

Runtime workflow-form dictionary content for backend-only tools must be built from the backend-owned contract source.

### 6. Runtime Generation Rule

Workflow-form UI definitions and dictionaries must remain runtime-generated.

They must not depend on `docs/`.

## Workflow Completion And Internal Automation Requirements

### 7. Internal Runtime Tool Pattern

The existing internal runtime execution model must remain valid:

- runtime handler registration remains in [src/core/task/tools/ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts)
- internal workflow automation may continue using [ToolExecutor.executeInternalToolSilently(...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts)

This update must not redesign execution ownership away from backend handlers.

### 8. Workflow Completion Alignment

The backend-only contract bucket must explicitly include non-form workflow automation such as `code_review_spec_update`.

The architecture must not treat workflow-form automation as the only valid backend-only tool consumer.

## Prompt-Tool Bucket Requirements

### 9. No Projection Requirement In This Update

This update must not require prompt-exposed workflow tools to be projected from the backend-only registry.

Prompt-exposed tools may continue to use separately authored prompt-tool specs.

The update is limited to removing prompt-tool configuration burden from backend-only workflow automation tools.

### 10. Prompt Bucket Scope Boundary

Prompt-exposed workflow tools may continue to use:

- prompt-tool spec files
- `init.ts` registration
- prompt variant exposure
- native-schema compaction
- contextual tool filtering

This remains the correct architecture for tools that the model can actually see or call.

## Bucket-Specific Implementation Rules For Future Tools

### 11. Future Prompt-Exposed Tools

When a future workflow-related tool belongs in the prompt-exposed bucket, contributors must continue following the prompt-tool architecture and related docs.

### 12. Future Backend-Only Workflow Automation Tools

When a future workflow-related tool belongs in the backend-only bucket, contributors must:

- add the shared tool id to `ClineDefaultTool`
- define the runtime-owned backend contract in the backend tool-contract registry
- register the runtime handler in `ToolExecutorCoordinator`
- wire approval behavior when the tool reads, writes, or executes commands
- maintain `ResponseToolRegistry` exhaustiveness when a new enum member is added
- add runtime tests for the actual backend seam that invokes the tool

Contributors must not add backend-only workflow automation tools to:

- system-prompt tool spec files
- [src/core/prompts/system-prompt/tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts)
- prompt variant configs
- prompt-tool native compaction branches
- contextual prompt-tool matrices

## Documentation Update Requirements

The implementation must update the following docs as part of the same change.

### 13. How-To Guide

[docs/tools-reference/how-to-add-a-tool.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/tools-reference/how-to-add-a-tool.md) must be updated to define the bucket-selection decision before the implementation steps.

It must explicitly describe:

- shared tool ids
- prompt-exposed tools
- backend-only workflow automation tools
- the exact work required for each bucket
- the work that must not be done for backend-only workflow automation tools

### 14. Prompt Tool Reference

[docs/system-prompt-tool-reference.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/system-prompt-tool-reference.md) must be updated so it no longer treats the locked backend-only migration set as prompt-defined tools.

It must explicitly distinguish:

- prompt-defined tool inventory
- shared tool ids that are not in the normal prompt tool catalog
- backend-only workflow automation tools

### 15. Prompt Tool README

[src/core/prompts/system-prompt/tools/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/README.md) must be updated to state clearly that this directory is only for prompt-exposed tools.

It must explicitly say backend-only workflow automation tools do not belong in this directory.

### 16. Workflow Automation Readme

[docs/workflows/workflow-automation-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-automation-readme.md) must be updated to describe the backend-only workflow automation bucket and its runtime contract path.

It must explicitly explain that backend-only workflow automation tools are not prompt-exposed tools.

### 17. Forward-Looking Classification Guidance

The updated documentation must explicitly define what goes into each bucket moving forward.

Future contributors must be able to answer, from docs alone:

- whether a workflow-related tool belongs in the prompt-exposed or backend-only bucket
- which files and registries they must touch for that bucket
- which prompt-tool steps are intentionally skipped for backend-only workflow automation tools

## Scope Boundaries

This requirements slice does not require:

- redesigning the existing prompt-tool architecture for prompt-exposed tools
- projecting prompt specs from backend contracts
- removing shared tool ids from `ClineDefaultTool`
- changing authored workflow instructions for the locked prompt-exposed tools
- changing runtime handler ownership away from backend handlers

## Verification Requirements

Implementation must include verification proving all of the following:

- the locked backend-only migration set no longer depends on prompt-tool registration or prompt-tool gating
- workflow-form schema lookup resolves backend-only tool contracts from the runtime-owned backend registry
- workflow-form dictionary generation resolves backend-only tool contracts from the runtime-owned backend registry
- workflow completion remains able to invoke backend-only tools through the internal runtime path
- prompt-exposed tools in the locked prompt bucket remain prompt-defined and continue to work
- the updated docs and READMEs explicitly define the bucket rules and future classification guidance

At minimum, verification must cover the touched seams through focused tests in the existing runtime areas, including the relevant workflow-form tests, workflow-completion tests, and any prompt-tool tests needed to prove the migrated tools are no longer treated as prompt-defined.
