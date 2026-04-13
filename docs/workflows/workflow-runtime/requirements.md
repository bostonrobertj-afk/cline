# Workflow Runtime Requirements

## 1. Introduction

### 1.1 Purpose

This document defines the software requirements for the workflow runtime initiative described in [project-overview.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/project-overview.md) and [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md).

The goal of this project is to replace the current placeholder-workflow and BMAD-document-dependent workflow model with a product-owned workflow runtime that can orchestrate the approved in-scope workflows across turns, project workflow state into downstream capabilities, and safely support progression, completion, teardown, persistence, resume, and subagent-local workflow execution.

### 1.2 Document Conventions

- `must` indicates a mandatory requirement.
- `should` indicates a recommended requirement that may admit narrow exceptions only if explicitly approved by the user.
- `may` indicates an optional capability or future-facing allowance.
- Runtime identifiers, file paths, and code-owned concepts are written in monospace, for example `activeWorkflowName` and `task/index.ts`.
- Functional requirements are identified as `FR-x`.
- External interface requirements are identified as `IR-x`.
- Non-functional requirements are identified as `NFR-x`.

### 1.3 Intended Audience

This document is intended for:

- product and technical decision-makers aligning the workflow runtime scope
- backend/runtime engineers implementing the workflow runtime and workflow modules
- prompt and tool-surface owners integrating workflow-owned prompt and native tool schema
- UI/webview engineers maintaining focus chain, workflow start-card, and workflow form surfaces
- testers validating workflow activation, orchestration, progression, resume, and teardown behavior

### 1.4 Scope

The workflow runtime project supports the broader business and product goal of making the approved in-scope workflows reliable, maintainable, and scalable inside the extension backend.

The intended business and product benefits are:

- reduce architectural fragmentation caused by placeholder workflows, BMAD support files, and scattered workflow logic
- enable the approved in-scope workflows without recreating bespoke runtime seams
- improve correctness by giving workflow identity, active step, progression, completion, and resume one canonical runtime owner
- preserve existing specialist capabilities while moving workflow-specific orchestration into a cohesive runtime layer

### 1.5 References

- [project-overview.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/project-overview.md)
- [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md)
- [requirements-guidelines.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/requirements-guidelines.md)
- [agent-101.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/agent-101.md)

## 2. General Description

### 2.1 Product Perspective

This product slice is an internal architectural replacement for the current workflow execution model inside the extension backend.

The current system evolved through multiple layers:

- placeholder workflow markdown and workflow placeholders
- BMAD support documents and persona/config assets
- focus chain ownership of active workflow step
- contextual workflow prompting scattered across task runtime and prompt components
- contextual tool gating and per-workflow bespoke seams
- workflow-form payload resolvers and workflow-specific deterministic execution helpers

The workflow runtime project replaces those fragmented ownership patterns with:

- one shared workflow runtime/orchestrator
- one code-owned workflow definition module per in-scope workflow
- one canonical workflow identity flag, `activeWorkflowName`
- runtime-owned workflow session state, active-step state, progression, completion, and resume
- runtime-owned workflow value ownership, mutation, and teardown semantics

### 2.2 Product Features

At a high level, the software must provide:

- workflow activation when an in-scope workflow is invoked through slash command or `useSkill`
- runtime-owned workflow session creation, mutation, persistence, resume, completion, and teardown
- runtime-owned workflow value persistence for values discovered during execution
- runtime-owned active-step resolution and progression
- - workflow-module-defined prompt content and structured workflow definitions for native tool schema, transitions, deterministic resolution, workflow-form definitions, workflow-start-card definitions, and document-generation definitions/data, with the shared workflow runtime consuming those definitions and invoking the appropriate specialist capabilities
- projection of workflow state into downstream capabilities such as system prompt assembly, focus chain, workflow forms, and workflow start cards
- support for concurrent parent and child workflow sessions using the same shared runtime implementation
- support for explicit parent-to-child workflow-value initialization where a child workflow definition declares it

### 2.3 User Classes and Characteristics

The relevant user classes are:

- end users invoking in-scope workflows through extension entrypoints
- primary AI agent runtime operating under an active workflow
- subagents explicitly assigned workflows through `useSkill`
- developers authoring and maintaining workflow modules and runtime orchestration
- testers validating workflow behavior across normal turns, deterministic paths, resume, and teardown

These users require predictable workflow identity, clear step ownership, safe resume behavior, and consistent downstream UI and prompt behavior.

### 2.4 Operating Environment

The workflow runtime must operate inside the existing extension backend/runtime process and interoperate with:

- `task/index.ts` as the application-level orchestrator
- the system prompt architecture as the final prompt assembler
- existing workflow form and workflow start-card surfaces
- focus chain as a workflow-only downstream projection surface
- the normal tool execution path
- local persistence used by task/runtime state
- parent and child execution contexts used for main-agent and subagent operation

### 2.5 Constraints

The following constraints apply:

- `task/index.ts` remains the application-level orchestration entrypoint.
- `activeWorkflowName` is the sole canonical workflow-identity flag.
- `activeWorkflowName` must not become the carrier for session state, active-step state, or other per-turn workflow state.
- The system prompt architecture remains responsible for final prompt assembly.
- Existing specialist capabilities such as workflow forms, workflow start cards, and normal tool execution remain specialist capabilities rather than being absorbed wholesale into the runtime.
- User-authored workflows are out of scope for the target architecture.
- Any shipped workflow outside the approved in-scope workflow set is out of scope for this initiative.
- Managed workflows are being retired.
- Placeholder workflow markdown and workflow placeholders are being retired as canonical workflow owners.
- Workflow-owned values discovered during execution must continue to have one canonical runtime-owned persistence surface after placeholder workflows are retired.
- `task_progress` is being retired, and focus chain is becoming a workflow-only surface.
- Full implementation will be carried out through a series of tightly-scoped action plans:
  - Foundational Build
  - Module Builds (one per workflow being implemented in the new architecture)
  - Cleanup
- Temporary bridges and compatibility patches intended to maintain compile-time functionality are not required or permitted- the app will be offline for the duration of the build.
- Action plan authors must identify all files which must be modified during the action plan, then identify all necessary code revisions within the action plan's scope per file, then ensure that tasks/ subtasks are organized by file to avoid having developers touch the same file multiple times and/or revise code that was put in place during the same action plan.
- the ".md" convention must not be included in workflow names in the new architecture.

### 2.5a Implementation Phase Model

This initiative is structured into three implementation phases plus global requirements that constrain all phases:

- `Global`: Architecture constraints, canonical ownership rules, and end-state invariants that must be respected by every action plan regardless of phase.
- `Foundational Build`: Shared runtime, shared prompt/tool architecture, shared workflow contracts, shared deterministic/document-generation infrastructure, and non-module-specific migrations that must exist before workflow-specific module buildout can proceed safely.
- `Module Builds`: One action plan per workflow, limited to that workflow's module-defined prompting, transitions, workflow forms, workflow-start-card definitions, deterministic rules, document-builder definitions, templates/builders, and workflow-specific migrations explicitly tied to that workflow.
- `Cleanup`: Deletion of legacy files, helpers, registries, prompt seams, and reference-only assets after the required foundational and module-build replacements are in place.

Unless a requirement or matrix row note states otherwise, the phase labels in Section 3 indicate the primary phase in which that requirement must be satisfied. Sections 4 and 5 remain global unless a requirement there explicitly states otherwise.

### 2.6 Assumptions and Dependencies

This requirements set assumes:

- the approved in-scope workflows will be registered in product-owned runtime code
- workflow-specific prompt content can be owned by workflow modules and consumed by the system prompt architecture
- workflow-specific native tool schema can be owned by workflow modules and consumed during system prompt assembly for the active step
- a persistence mechanism remains available for storing the minimum workflow session state required for safe resume
- existing UI surfaces for workflow forms, workflow start cards, and focus chain remain available as downstream renderers
- subagent workflows are explicitly assigned and activated in child execution contexts only
- some child workflows may need selected workflow values copied from parent workflow state during activation

This project depends on:

- `task/index.ts` integration for activation and runtime invocation
- prompt architecture integration for workflow prompt data and workflow-owned native tool schema
- focus chain integration for runtime-projected workflow step/status display
- workflow form integration for rendering workflow-owned payloads
- shared workflow-entry/project-selection UI integration for collecting the pre-workflow project-selection inputs required by `FR-10d` through `FR-10l`
- normal tool execution for deterministic operations

### 2.7 Canonical Workflow Mapping

The canonical in-scope workflow mapping for this requirements set is:

| Workflow | Persona | Project Subfolder |
| --- | --- | --- |
| `blind-review.md` | `quality-control` | `review` |
| `brainstorming.md` | `analyst` | `discovery` |
| `code-review.md` | `quality-control` | `review` |
| `correct-course.md` | `scrum-master` | `planning` |
| `create-architecture.md` | `architect` | `planning` |
| `create-epics.md` | `product-manager` | `planning` |
| `create-prd.md` | `product-manager` | `planning` |
| `create-product-brief.md` | `analyst` | `planning` |
| `create-story.md` | `scrum-master` | `planning` |
| `dev-story.md` | `developer` | `implementation` |
| `document-project.md` | `analyst` | `implementation` |
| `pi-planning.md` | `scrum-master` | `planning` |
| `quick-dev.md` | `quick-flow-solo-dev` | `implementation` |
| `problem-solving.md` | `analyst` | `discovery` |
| `quick-spec.md` | `quick-flow-solo-dev` | `planning` |
| `review-adversarial-general.md` | `quality-control` | `review` |
| `review-edge-case-hunter.md` | `quality-control` | `review` |
| `write-remediation-story.md` | `developer` | `planning` |

`problem-solving.md` is the target migrated workflow name for this initiative and replaces the legacy `cis-problem-solving.md` naming in the in-scope runtime contract.

## 3. System Requirements

### 3.1 Functional Requirements by Implementation Phase

The functional requirements below are grouped by the primary implementation phase in which they must be considered. Global requirements constrain all phases. Foundational Build requirements establish shared architecture and shared runtime seams. Module Build requirements define workflow-specific module work. Cleanup requirements govern retirement of legacy workflow surfaces once the required replacements are in place.

#### Global Requirements: Activation and Identity

- `FR-1`: The system must detect in-scope workflow invocation through slash command and `useSkill` entrypoints in `task/index.ts`.
- `FR-2`: The system must set `activeWorkflowName` when a workflow is activated.
- `FR-3`: `activeWorkflowName` must be the canonical answer to whether a workflow is active and which workflow is active.
- `FR-4`: The system must retire parallel workflow-identity carriers used by the current runtime, including placeholder-workflow identity fields and managed-workflow identity state.
- `FR-5`: The system must resolve the active workflow from a product-owned registry of in-scope workflows for this initiative rather than from user-authored workflow discovery.
- `FR-5a`: The system must expose in-scope shipped workflows to the `useSkill` discovery surface through a product-owned workflow-to-skill metadata projection derived directly from the shipped workflow-definition registry.
- `FR-5b`: The canonical seam for that workflow-to-skill metadata projection must be `getWorkflowSkillMetadata()`.
- `FR-5c`: `getWorkflowSkillMetadata()` must build its `SkillMetadata[]` output from shipped workflow definitions and workflow-module-owned identity fields rather than from legacy resolved-workflow entry shapes.
- `FR-5d`: Local, global, remote, and managed workflow-source discovery must not participate in building shipped workflow skill metadata for `useSkill`.
- `FR-5e`: The legacy helper `createWorkflowSkillMetadata(...)` must be retired and replaced by `getWorkflowSkillMetadata()`.
- `FR-5f`: Main-agent and subagent `useSkill` exposure must consume the same product-owned workflow-to-skill metadata projection.

#### Foundational Build Requirements: Workflow Runtime Ownership

- `FR-6`: The system must introduce a shared workflow runtime that is invoked by `task/index.ts` whenever a workflow is active.
- `FR-7`: The workflow runtime must create and own workflow session state for each execution context in which a workflow is active.
- `FR-8`: The workflow runtime must own active-step state.
- `FR-9`: The workflow runtime must own progression evaluation, advancement, completion detection, teardown, persistence, and resume for active workflow sessions.
- `FR-10`: The workflow runtime must define and enforce canonical workflow session mutation rules.
- `FR-10a`: The workflow runtime must define and enforce one canonical mutation surface for workflow-owned values.
- `FR-10b`: Backend-owned deterministic logic and AI-callable workflow-value persistence must both write to the same canonical workflow value carrier inside workflow session state.
- `FR-10c`: The canonical carrier for workflow-owned values must live inside workflow session state rather than in separate mirrored task-state fields.
- `FR-10d`: The workflow runtime must run a shared pre-workflow project-selection gate before workflow-specific step orchestration begins.
- `FR-10e`: The shared pre-workflow project-selection gate must obtain or resolve project identity for the active workflow session.
- `FR-10f`: The shared pre-workflow project-selection gate must present a `new` versus `existing` project choice.
- `FR-10g`: If `existing` is chosen, the system must derive the available project choices from the per-project folder names beneath the visible project output root.
- `FR-10h`: If `new` is chosen, the system must collect a user-provided project title.
- `FR-10i`: The workflow runtime must normalize user-provided project titles into filesystem-safe project identity.
- `FR-10j`: The workflow runtime must preserve the user-provided project title as human-facing project text while using the normalized filesystem-safe identity for folder creation and path resolution.
- `FR-10k`: The workflow runtime must ensure the per-project folder exists before workflow-specific artifact-producing steps can run.
- `FR-10l`: The workflow runtime must ensure these canonical project subfolders exist within each per-project folder before workflow-specific artifact-producing steps can run:
  - `discovery`
  - `planning`
  - `implementation`
  - `review`
  - `testing`

#### Module Build Requirements: Workflow Modules

- `FR-11`: Each in-scope workflow must be represented by a code-owned workflow module.
- `FR-12`: Each workflow module must define workflow identity and metadata.
- `FR-12a`: Each workflow module must define the canonical project subfolder designation for that workflow.
- `FR-13`: Each workflow module must define its step graph and transition rules.
- `FR-14`: Each workflow module must define workflow-level and per-step prompt content.
- `FR-14a`: Workflow-module prompt content must be implemented as code-owned prompt-builder functions that accept explicit typed runtime inputs and return fully assembled prompt strings for the active workflow or step.
- `FR-14b`: The workflow runtime must resolve the runtime-owned workflow/session values required for the active prompt before invoking the workflow module's prompt-builder function.
- `FR-14c`: The system must not treat workflow prompt content as placeholder-tokenized text resolved through a generic placeholder subsystem, placeholder workflow markdown, managed-workflow placeholder state, `.cline/workflow-config.yaml`, or similar placeholder-era resolution helpers.
- `FR-14d`: Existing string-formatting utilities may be used inside workflow-module prompt-builder functions only as local formatting helpers with explicitly provided inputs. They must not serve as a generic workflow-placeholder contract.
- `FR-14e`: The output of a workflow-module prompt-builder function must be a fully assembled prompt string ready for system-prompt inclusion. Unresolved placeholder markers must not remain part of the workflow prompt contract.
- `FR-15`: Each workflow module must define workflow-level defaults and per-step native tool schema for model exposure.
- `FR-16`: Each workflow module must define per-step progression rules, including whether `workflow_progress_request` is permitted.
- `FR-17`: Each workflow module must define workflow form configuration where applicable.
- `FR-17a`: Workflow modules must not define standalone workflow-start form configuration.
- `FR-18`: Each workflow module must define deterministic step-resolution rules where deterministic resolution is supported.
- `FR-19`: Each workflow module must define completion and teardown rules.
- `FR-20`: Each workflow module must define any workflow-owned document or artifact builder definitions needed to produce workflow outputs.
- `FR-20a`: The workflow runtime must use the workflow's canonical project subfolder designation when resolving that workflow's artifact destinations inside the selected project folder.
- `FR-20b`: The workflow runtime must own the shared artifact identity and numbering policy used to connect related workflow outputs inside a project.
- `FR-20c`: The shared artifact identity and numbering policy must carry forward across related artifact families, including epic numbering, epic-delivery-spec numbering, story numbering, and remediation-story numbering.
- `FR-20d`: The architecture must provide one shared deterministic document-generation tool in the existing tool runtime layer rather than separate workflow-specific document-generation tools.
- `FR-20e`: When a workflow needs to create or update a workflow-owned markdown artifact, the workflow runtime must invoke that shared document-generation tool through the normal tool execution path.
- `FR-20f`: The workflow runtime must derive the shared document-generation tool inputs from the active workflow module and runtime-owned workflow state, including the required template/builder selection, output location, naming convention, formatting rules, and source content inputs.
- `FR-20g`: Workflow modules must express document-builder definitions using one consistent methodology and one consistent typed structure across all workflow modules so the workflow runtime can resolve document-generation inputs with the same code path regardless of which workflow is active.
- `FR-20h`: Workflow modules must not require workflow-specific bespoke document-generation handlers in the tool runtime for workflow-owned markdown artifact creation or update.
- `FR-21`: Each workflow module must define references to workflow-specific evaluators or handlers only where imperative logic is truly required.
- `FR-21a`: Each workflow module must define any workflow-specific workflow-value expectations and any explicit child-session workflow-value inheritance rules needed for that workflow.
- `FR-21b`: Each workflow module must define the workflow-value keys that workflow supports, which of those keys are AI-writable, and any step-specific restrictions on AI-writable workflow values.

#### Foundational Build Requirements: Step Resolution and Progression

- `FR-22`: The workflow runtime must resolve the current active step from workflow session state rather than from focus chain markdown or checklist state.
- `FR-23`: Focus chain must no longer act as the canonical owner of active workflow step.
- `FR-24`: The system must treat focus chain as a downstream consumer that reflects runtime-owned workflow step and status.
- `FR-25`: The system must support model-driven progression requests through `workflow_progress_request` only when the workflow runtime indicates that mechanism is permitted for the active step.
- `FR-26`: A user approval returned through the `workflow_progress_request` flow must not progress a workflow directly; it must be handed to the workflow runtime for validation and canonical state mutation.
- `FR-27`: The system must retire `task_progress` as a workflow progression mechanism.
- `FR-28`: The system must retire direct AI tools whose purpose is to progress focus chain independently of workflow runtime state.
- `FR-29`: The workflow runtime must evaluate the active workflow state and determine the canonical next action for the current turn.
- `FR-29a`: The canonical next-action evaluation must be a unified runtime-owned capability rather than separate subsystem-specific trigger mechanisms.
- `FR-29b`: Workflow modules must define the decision rules and conditions that inform next-action evaluation for their workflows.
- `FR-29c`: The canonical next action may include rendering a workflow form, invoking a deterministic operation, allowing normal model-driven progression, emitting completion behavior, or taking no workflow-specific action.
- `FR-29d`: Workflow-form interruption logic must not remain a separate canonical trigger subsystem outside `WorkflowRuntime`.
- `FR-29e`: Deterministic step-resolution logic must not remain a separate canonical trigger subsystem outside `WorkflowRuntime`.
- `FR-30`: The system must retire `WorkflowStepResolutionRegistry` as a separate canonical owner of workflow step-resolution behavior.

#### Foundational Build Requirements: Prompting and Native Tool Exposure

- `FR-31`: The workflow runtime must assemble exactly three workflow-owned per-turn prompt/tool outputs for the active turn: a workflow instructions block for system instructions, a workflow instructions block for input, and any workflow-specific native tool schema override.
- `FR-31a`: The workflow runtime must support both a full-turn variant and a continuation-turn variant for the system-instructions workflow block and for the input workflow block.
- `FR-31b`: No workflow-specific prompt content may be projected through any prompt carrier other than the runtime-owned workflow instructions block for system instructions and the runtime-owned workflow instructions block for input.
- `FR-32`: The system prompt architecture must remain the final assembler of the full system prompt.
- `FR-33`: Workflow modules must own the actual workflow-specific and step-specific prompt strings.
- `FR-33a`: Workflow modules are the sole source of workflow-specific and step-specific prompt content used to build the runtime-owned workflow instructions blocks.
- `FR-34`: For each turn, the workflow runtime must build the workflow instructions blocks from workflow-module prompting plus runtime-owned workflow/session state.
- `FR-34a`: The system-instructions workflow block must include the current workflow step list with `[x]` / `[ ]` indicators in both the full-turn and continuation-turn variants.
- `FR-34b`: The system-instructions workflow block must include a workflow persona section only on the first turn.
- `FR-34c`: The input workflow block full-turn variant must include a `Current Step` section containing the active step prompting from the workflow module.
- `FR-34d`: The input workflow block continuation-turn variant must omit the `Current Step` section.
- `FR-35`: The workflow runtime must project which workflow-owned native tool schema applies on the current turn.
- `FR-35a`: The system must provide one canonical AI-callable workflow-value persistence tool named `set_workflow_values`.
- `FR-35b`: The default native tool schema for `set_workflow_values` must be a shared fallback schema rather than workflow-specific central code.
- `FR-35c`: The shared fallback schema for `set_workflow_values` must accept a `values` object map whose entries represent workflow-value writes for the active workflow session.
- `FR-35d`: Workflow modules may define workflow-owned native tool schema overrides for `set_workflow_values`.
- `FR-35e`: A workflow-module override for `set_workflow_values` must be able to expose only the workflow-value keys supported by that workflow and only the subset that is AI-writable for the active step.
- `FR-35f`: When the active workflow module provides a `set_workflow_values` schema override for the current turn, the system prompt architecture must expose that workflow-owned schema instead of the shared fallback schema.
- `FR-35g`: Regardless of whether the shared fallback schema or a workflow-module override is exposed to the model, execution of `set_workflow_values` must write through the canonical workflow-runtime workflow-value mutation seam into the active workflow session only.
- `FR-35h`: `set_workflow_values` must not read from or write to placeholder-era workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or similar legacy workflow surfaces.
- `FR-36`: The system prompt architecture must assemble exactly one workflow instructions section in system instructions and exactly one workflow instructions section in input by consuming the runtime-owned full-turn or continuation-turn workflow blocks for the current turn, and must consume any runtime-projected workflow-specific native tool schema override for that turn.
- `FR-37`: The architecture must retire workflow-specific reliance on contextual tool gating as the canonical owner of workflow tool exposure behavior.
- `FR-38`: Workflow reminder behavior from the current system must be retired or migrated into the workflow-runtime-to-system-prompt architecture described above.

#### Foundational Build Requirements: Workflow Forms and Deterministic Operations

- `FR-39`: When unified next-action evaluation selects workflow-form rendering, the workflow runtime must build the per-panel workflow form payload for the active step using workflow-module configuration.
- `FR-39a`: The shared workflow-form message contract currently named `ClineWorkflowForm` in `src/shared/ExtensionMessage.ts` must be renamed to `WorkflowForm`.
- `FR-39b`: The `ClineWorkflowForm` to `WorkflowForm` rename must be implemented end to end across every producing and consuming layer, and no compatibility alias may remain unless explicitly approved.
- `FR-39c`: The shared workflow-form payload contract must use workflow-form terminology rather than resolver terminology for workflow-form identity fields.
- `FR-39d`: Any workflow-form shared-contract rename or field-shape change must be applied consistently across the shared message contract, runtime payload builders, task/runtime callers, UI consumers, and test coverage in the same migration sequence.
- `FR-39e`: The renamed shared `WorkflowForm` payload contract must carry workflow-form identity in a field named `workflowFormId`.
- `FR-40`: Workflow form rendering and user input capture must remain in the workflow form capability.
- `FR-41`: The workflow runtime must consume workflow form results as one possible next-action input and then re-evaluate the canonical next action.
- `FR-42`: When deterministic operations are required as part of a workflow form path, the workflow runtime must invoke those operations through the normal tool execution path.
- `FR-42a`: Shared document generation for workflow-owned markdown artifacts is a deterministic operation class and must use the shared document-generation tool defined in `FR-20d` through `FR-20h` rather than workflow-specific document-build tools.
- `FR-43`: The workflow runtime must interpret deterministic results, apply them to workflow session state, and determine whether to remain on the same step, advance, or fall back.
- `FR-44`: The system must retire `WorkflowFormRuntime` as the canonical owner of per-panel workflow form payload construction.
- `FR-44a`: Generic workflow-form engine behavior may remain in the workflow form capability/runtime layer, including workflow-form session mechanics, submitted-value normalization, submitted-value validation, generic panel navigation, and shared workflow-form message-shape formatting.
- `FR-44b`: Workflow-specific workflow-form definition ownership, active-step workflow-form selection, per-panel payload construction, workflow-form result interpretation, and next-action orchestration must move to `WorkflowRuntime`.
- `FR-45`: The workflow-specific execution currently handled through `executeWorkflowFormOperationAndSync` must move out of `task/index.ts` and into the workflow runtime.

#### Foundational Build Requirements: Completion, Teardown, Persistence, and Resume

- `FR-46`: The workflow runtime must evaluate completion rules after relevant workflow session mutations.
- `FR-47`: On workflow completion, the workflow runtime must execute any workflow-specific completion handling required by the workflow definition.
- `FR-48`: The workflow runtime must teardown the canonical workflow session when completion or other terminal teardown conditions are reached.
- `FR-49`: Prompt state, focus chain state, start-card state, workflow-form state, and other workflow-related downstream surfaces must clear as a projection of workflow teardown.
- `FR-49a`: Workflow-owned values must clear as a consequence of workflow session teardown because those values are stored inside the workflow session.
- `FR-50`: The workflow runtime must own the minimum persisted workflow session state needed to resume safely and reconstruct active workflow state.
- `FR-51`: The system must retire fragmented workflow persistence ownership across placeholder-workflow fields, capability-specific workflow session blobs, and managed-workflow state.
- `FR-52`: On resume, the workflow runtime must restore workflow identity, active step, relevant progression state, and any still-relevant workflow-owned UI or deterministic state.

#### Module Build Requirements: Workflow Assets, Personas, and Product-Owned Content

- `FR-53`: The target architecture must eliminate runtime reliance on BMAD documents, placeholder workflow documents, YAML workflow config files, and similar user-accessible workflow assets as canonical sources of workflow behavior.
- `FR-55`: Workflow-emitted document templates must be represented as code-owned builders or coded template definitions rather than markdown files used as runtime dependencies.
- `FR-55a`: Code-owned document templates or builders used for workflow-owned markdown artifact generation must be consumable through the shared document-generation tool contract rather than through workflow-specific bespoke tool handlers.
- `FR-56`: Workflow-associated persona activation must be supported through product-owned runtime code and prompt architecture integration rather than BMAD file lookups.
- `FR-57a`: The system must treat the workflow-to-persona-to-project-subfolder mapping in Section 2.7 as the canonical in-scope workflow mapping for this initiative.
- `FR-57b`: Workflow artifact and project discovery must remain convention-driven filesystem behavior rather than hidden registry behavior.
- `FR-57c`: The workflow runtime must rediscover projects and workflow artifacts from on-disk folder placement and naming conventions rather than from a hidden project or artifact registry.
- `FR-57d`: The workflow runtime must not rely on a hidden project or artifact registry to recover identity when user-visible names change.
- `FR-57e`: Workflow automation is guaranteed only for artifacts that continue to match the documented naming and placement conventions.
- `FR-57f`: If a user renames a project folder or artifact so it no longer matches the documented convention, downstream workflows may no longer recognize it, and the system must treat that outcome as user-managed document hygiene rather than runtime data corruption.

#### Cleanup Requirements: Legacy Surface Retirement and Migration Governance

- `FR-54`: The file `.cline/workflow-config.yaml` must be deleted as part of the migration. It must not be replaced with another workflow-runtime config file because its current responsibilities are redundant with broader runtime context, workflow-runtime-owned project/artifact resolution, and workflow-module-owned code.
- `FR-57`: BMAD packaging and skill-enablement mechanisms that exist only to support file-dependent workflow behavior must be retired once their necessary content is represented in runtime code.
- `FR-57g`: No legacy workflow-related file, field, helper, registry, tool contract, prompt-context field, or runtime state surface may be retained, renamed, remapped, or compatibility-aliased by default during this migration.
- `FR-57h`: Every legacy workflow-related surface that may be retired, updated, migrated, explicitly preserved, or explicitly left in place must appear in the legacy workflow migration matrix below and receive an explicit approved disposition before implementation planning or code migration for that surface proceeds.
- `FR-57i`: Any legacy workflow-related surface not explicitly approved in the legacy workflow migration matrix for preservation, migration, or leave-in-place treatment must be deleted once its replacement behavior lands.

#### Cleanup Requirements: Legacy Workflow Migration Matrix

This matrix is the approval inventory for legacy workflow surfaces touched by this initiative. When a matrix row note assigns a specific item to Foundational Build, Module Builds, or Cleanup, that row note is authoritative for the timing of that item.

| Legacy item / contract surface | Current owner / location | Decision | Approved target / replacement | Notes |
| --- | --- | --- | --- | --- |
| `.cline/workflow-config.yaml` | `.cline/workflow-config.yaml` | Delete | None | Already governed by `FR-54`; included here so the deletion decision remains visible in the full migration inventory. |
| Authored workflow markdown as canonical runtime dependency | `/Users/robertboston/Documents/Cline/Workflows/*.md` | Update | Code-owned workflow modules, prompt-builder functions, step definitions, and document builders | The authored markdown files remain in the repo as migration-source/reference material for now, but they must no longer be runtime dependencies or canonical owners of workflow behavior. |
| BMAD skill workflow markdown as canonical runtime dependency | `.cline/skills/**/workflow.md` | Update | Code-owned workflow modules, prompt-builder functions, step definitions, and document builders | BMAD workflow markdown may remain for reference during migration, but it must no longer be a runtime dependency. |
| BMAD skill step markdown as canonical runtime dependency | `.cline/skills/**/steps/**` | Update | Code-owned workflow modules, prompt-builder functions, step definitions, and document builders | BMAD step markdown may remain for reference during migration, but it must no longer be a runtime dependency. |
| Placeholder interpolation helper layer | `src/core/workflows/workflow-placeholders.ts` | Delete | `FR-14a` through `FR-14e` workflow-module prompt-builder functions with explicit typed inputs | Covers placeholder-text resolution and stable-placeholder assembly behavior. |
| Legacy AI-callable placeholder persistence handler | `src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts` | Delete | `set_workflow_values` | The legacy placeholder-writing handler is retired and replaced by the canonical runtime-owned workflow-value persistence tool defined by `FR-35a` through `FR-35h`. |
| Legacy AI-callable placeholder persistence native tool schema | `src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts` | Delete | `set_workflow_values` | The placeholder-era model-facing tool schema is retired and replaced by the canonical runtime-owned workflow-value persistence tool defined by `FR-35a` through `FR-35h`. |
| Legacy task-state field `activeWorkflowId` | `src/core/task/TaskState.ts` field `activeWorkflowId` | Delete | `activeWorkflowName` | Legacy workflow identity carrier that competes with `activeWorkflowName`. |
| Legacy task-state field `activePlaceholderWorkflowId` | `src/core/task/TaskState.ts` field `activePlaceholderWorkflowId` | Delete | `activeWorkflowName` | Placeholder-workflow identity carrier that competes with `activeWorkflowName`. |
| Legacy task-state field `activePlaceholderWorkflowSource` | `src/core/task/TaskState.ts` field `activePlaceholderWorkflowSource` | Delete | Runtime definition lookup from `activeWorkflowName` | Placeholder-workflow source carrier that should not remain canonical in the runtime-owned architecture. |
| Legacy task-state field `activePlaceholderWorkflowStableValues` | `src/core/task/TaskState.ts` field `activePlaceholderWorkflowStableValues` | Delete | `activeWorkflowSession.workflowValues` | Placeholder-era stable workflow values stored directly on task state. |
| Legacy task-state field `activePlaceholderWorkflowValues` | `src/core/task/TaskState.ts` field `activePlaceholderWorkflowValues` | Delete | `activeWorkflowSession.workflowValues` | Placeholder-era dynamic workflow values stored directly on task state. |
| Legacy task-state field `activePlaceholderWorkflowDeterministicState` | `src/core/task/TaskState.ts` field `activePlaceholderWorkflowDeterministicState` | Delete | Runtime-owned deterministic state in `activeWorkflowSession` and `activeWorkflowStepResolutionSession` | Placeholder-era deterministic progression state stored directly on task state. |
| Legacy task-state field `lastPromptedPlaceholderWorkflowChecklistLabel` | `src/core/task/TaskState.ts` field `lastPromptedPlaceholderWorkflowChecklistLabel` | Delete | None | Legacy focus-chain/checklist prompt state tied to placeholder workflows. |
| Legacy task-state field `pendingAutoCompletedPlaceholderWorkflowStepNotices` | `src/core/task/TaskState.ts` field `pendingAutoCompletedPlaceholderWorkflowStepNotices` | Delete | None | Legacy placeholder-workflow auto-complete notice state stored directly on task state. |
| Legacy task-state field `activeWorkflowJustStarted` | `src/core/task/TaskState.ts` field `activeWorkflowJustStarted` | Delete | None | Legacy workflow-start marker stored directly on task state. |
| Managed-workflow run state | `src/core/task/TaskState.ts` field `managedWorkflowRun` | Delete | None | Separate row from the broader managed-workflow subsystem because this state carrier is widely consumed. |
| Managed-workflow subsystem file `ManagedWorkflowController.ts` | `src/core/task/managed-workflows/ManagedWorkflowController.ts` | Delete | None | Managed-workflow controller surface that must be explicitly dispositioned in the runtime-owned architecture. |
| Managed-workflow subsystem file `ManagedWorkflowPhaseExtractor.ts` | `src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts` | Delete | None | Managed-workflow phase-extraction surface that must be explicitly dispositioned in the runtime-owned architecture. |
| Managed-workflow subsystem file `placeholders.ts` | `src/core/task/managed-workflows/placeholders.ts` | Delete | None | Managed-workflow placeholder helper surface that must be explicitly dispositioned in the runtime-owned architecture. |
| Managed-workflow subsystem file `ManagedWorkflowRenderer.ts` | `src/core/task/managed-workflows/ManagedWorkflowRenderer.ts` | Delete | None | Managed-workflow rendering surface that must be explicitly dispositioned in the runtime-owned architecture. |
| Managed-workflow subsystem file `types.ts` | `src/core/task/managed-workflows/types.ts` | Delete | None | Managed-workflow contract surface that must be explicitly dispositioned in the runtime-owned architecture. |
| Managed-workflow subsystem file `ManagedWorkflowRegistry.ts` | `src/core/task/managed-workflows/ManagedWorkflowRegistry.ts` | Delete | None | Managed-workflow registry surface that must be explicitly dispositioned in the runtime-owned architecture. |
| Legacy workflow activation file `workflow-activation.ts` | `src/core/task/workflow-activation.ts` | Delete | None | File-level activation surface outside `WorkflowRuntime`. |
| Legacy workflow-activation contract `ManagedWorkflowActivationResult` | `src/core/task/workflow-activation.ts` export `ManagedWorkflowActivationResult` | Delete | None | Managed-workflow activation result contract exported from the legacy activation file. |
| Legacy workflow-activation contract `PlaceholderWorkflowActivationResult` | `src/core/task/workflow-activation.ts` export `PlaceholderWorkflowActivationResult` | Delete | None | Placeholder-workflow activation result contract exported from the legacy activation file. |
| Legacy workflow-activation function `activateManagedWorkflowInTaskState(...)` | `src/core/task/workflow-activation.ts` export `activateManagedWorkflowInTaskState(...)` | Delete | None | Managed-workflow activation path outside `WorkflowRuntime`. |
| Legacy workflow-activation function `activatePlaceholderWorkflowInTaskState(...)` | `src/core/task/workflow-activation.ts` export `activatePlaceholderWorkflowInTaskState(...)` | Delete | `WorkflowRuntime.activateWorkflow(...)` | Placeholder-workflow activation path outside `WorkflowRuntime`. |
| Legacy workflow-activation function `renderActivePlaceholderWorkflowReminder(...)` | `src/core/task/workflow-activation.ts` export `renderActivePlaceholderWorkflowReminder(...)` | Delete | Workflow-module prompt-builder functions invoked through `WorkflowRuntime.buildTurnProjection(...)` | Placeholder-workflow reminder rendering path exported from the legacy activation file. |
| Legacy workflow-activation function `buildActivePlaceholderWorkflowActivationInstructions(...)` | `src/core/task/workflow-activation.ts` export `buildActivePlaceholderWorkflowActivationInstructions(...)` | Delete | Workflow-module prompt-builder functions invoked through `WorkflowRuntime.buildTurnProjection(...)` | Placeholder-workflow activation-instruction builder exported from the legacy activation file. |
| Legacy workflow discovery file `resolveAvailableWorkflows.ts` | `src/core/workflows/resolution/resolveAvailableWorkflows.ts` | Delete | None | File-level workflow discovery and resolution surface. |
| Legacy workflow discovery contract `ResolvedWorkflowSource` | `src/core/workflows/resolution/resolveAvailableWorkflows.ts` export `ResolvedWorkflowSource` | Delete | None | Legacy workflow-source enum-like contract. |
| Legacy workflow discovery contract `ResolvedWorkflowEntry` | `src/core/workflows/resolution/resolveAvailableWorkflows.ts` export `ResolvedWorkflowEntry` | Delete | None | Legacy resolved-workflow entry contract. |
| Legacy workflow discovery contract `WorkflowResolutionOptions` | `src/core/workflows/resolution/resolveAvailableWorkflows.ts` export `WorkflowResolutionOptions` | Delete | None | Legacy workflow-resolution options contract. |
| Legacy workflow discovery function `resolveAvailableWorkflows(...)` | `src/core/workflows/resolution/resolveAvailableWorkflows.ts` export `resolveAvailableWorkflows(...)` | Delete | None | Workflow discovery aggregator spanning legacy workflow sources. |
| Legacy workflow discovery function `resolveWorkflowByName(...)` | `src/core/workflows/resolution/resolveAvailableWorkflows.ts` export `resolveWorkflowByName(...)` | Delete | None | Legacy workflow lookup by name across legacy workflow sources. |
| Legacy workflow discovery function `findResolvedWorkflowByName(...)` | `src/core/workflows/resolution/resolveAvailableWorkflows.ts` export `findResolvedWorkflowByName(...)` | Delete | None | Legacy resolved-workflow search helper. |
| Legacy workflow discovery function `createWorkflowSkillMetadata(...)` | `src/core/workflows/resolution/resolveAvailableWorkflows.ts` export `createWorkflowSkillMetadata(...)` | Delete | `getWorkflowSkillMetadata()` (`FR-5a` through `FR-5f`) | Legacy workflow-to-skill-metadata projection helper. |
| Legacy workflow-form runtime file `WorkflowFormRuntime.ts` | `src/core/task/workflow-form/WorkflowFormRuntime.ts` | Update | Generic workflow-form engine only (`FR-44a`); remove workflow-specific ownership per `FR-44b` | File-level workflow-form runtime surface. |
| Legacy workflow-form runtime class `WorkflowFormRuntime` | `src/core/task/workflow-form/WorkflowFormRuntime.ts` export class `WorkflowFormRuntime` | Update | Generic workflow-form engine only (`FR-44a`); remove workflow-specific ownership per `FR-44b` | Class-level workflow-form runtime surface that currently owns payload construction and session behavior. |
| Legacy workflow-form runtime helper `normalizeWorkflowFormSubmissionFields` | `src/core/task/workflow-form/WorkflowFormRuntime.ts` export `normalizeWorkflowFormSubmissionFields` | Update | Generic workflow-form engine behavior under `FR-44a` | Exported workflow-form submission normalization helper. |
| Legacy workflow-form registry file `WorkflowFormRegistry.ts` | `src/core/task/workflow-form/WorkflowFormRegistry.ts` | Delete | None | File-level workflow-form registry surface. Workflow-specific registry ownership must not survive outside workflow modules; any preserved behavior must be explicitly dispositioned by the child rows below. This file cannot be deleted during the initial buildout action plan because its contents are still needed during workflow module buildout. Address file deletion in the final cleanup action plan. |
| Legacy workflow-form registry constant `CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID` | `src/core/task/workflow-form/WorkflowFormRegistry.ts` export `CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID` | Delete | None | Exported workflow-form resolver id constant. |
| Legacy workflow-form registry constant `BRAINSTORMING_STEP_2_PREPARE_SESSION_RESOLVER_ID` | `src/core/task/workflow-form/WorkflowFormRegistry.ts` export `BRAINSTORMING_STEP_2_PREPARE_SESSION_RESOLVER_ID` | Delete | None | Exported workflow-form resolver id constant. |
| Legacy workflow-form registry constant `BRAINSTORMING_STEP_3_CAPTURE_TOPIC_RESOLVER_ID` | `src/core/task/workflow-form/WorkflowFormRegistry.ts` export `BRAINSTORMING_STEP_3_CAPTURE_TOPIC_RESOLVER_ID` | Delete | None | Exported workflow-form resolver id constant. |
| Legacy workflow-form registry constant `BRAINSTORMING_STEP_4_CHOOSE_APPROACH_RESOLVER_ID` | `src/core/task/workflow-form/WorkflowFormRegistry.ts` export `BRAINSTORMING_STEP_4_CHOOSE_APPROACH_RESOLVER_ID` | Delete | None | Exported workflow-form resolver id constant. |
| Legacy workflow-form registry constant `PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID` | `src/core/task/workflow-form/WorkflowFormRegistry.ts` export `PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID` | Delete | None | Exported workflow-form resolver id constant for the legacy placeholder-workflow start path. |
| Legacy workflow-form registry function `buildWorkflowStartDefinitionPayload(...)` | `src/core/task/workflow-form/WorkflowFormRegistry.ts` export `buildWorkflowStartDefinitionPayload(...)` | Delete | Runtime-owned workflow-start payload construction in `WorkflowRuntime` under `FR-44b` | Exported workflow-start payload builder in the legacy registry layer. Preserve the capability by moving workflow-start payload construction into `WorkflowRuntime`. |
| Legacy workflow-form registry function `buildBrainstormingStep2InitialDefinitionPayload(...)` | `src/core/task/workflow-form/WorkflowFormRegistry.ts` export `buildBrainstormingStep2InitialDefinitionPayload(...)` | Delete | Brainstorming workflow-module-owned step-2 payload construction invoked through `WorkflowRuntime` under `FR-44b` | Exported brainstorming-specific payload builder in the legacy registry layer. Preserve the capability by moving brainstorming step-2 payload construction into the brainstorming workflow module and invoking it through `WorkflowRuntime`; remove this legacy export during the brainstorming workflow module action plan. |
| Legacy workflow-form registry function `buildBrainstormingStep4DefinitionPayload(...)` | `src/core/task/workflow-form/WorkflowFormRegistry.ts` export `buildBrainstormingStep4DefinitionPayload(...)` | Delete | Brainstorming workflow-module-owned step-4 payload construction invoked through `WorkflowRuntime` under `FR-44b` | Exported brainstorming-specific payload builder in the legacy registry layer. Preserve the capability by moving brainstorming step-4 payload construction into the brainstorming workflow module and invoking it through `WorkflowRuntime`; remove this legacy export during the brainstorming workflow module action plan. |
| Legacy workflow-form registry map `workflowFormRegistry` | `src/core/task/workflow-form/WorkflowFormRegistry.ts` export `workflowFormRegistry` | Delete | Workflow-module-owned workflow-form resolver definitions invoked through `WorkflowRuntime` under `FR-44b` | Registry map of legacy workflow-form resolver definitions. Preserve the capability by moving workflow-form resolver definitions into the owning workflow modules and invoking them through `WorkflowRuntime`. |
| Legacy workflow-form registry function `getWorkflowFormResolverDefinition(...)` | `src/core/task/workflow-form/WorkflowFormRegistry.ts` export `getWorkflowFormResolverDefinition(...)` | Delete | Workflow-module-owned workflow-form resolver lookup through `WorkflowRuntime` under `FR-44b` | Resolver-definition lookup helper in the legacy registry layer. Preserve the lookup capability by having `WorkflowRuntime` resolve workflow-module-owned workflow-form definitions directly. |
| Legacy workflow-form trigger file `WorkflowFormTriggerRegistry.ts` | `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts` | Delete | None | File-level workflow-form trigger surface. This file contains legacy workflow-form trigger logic that must remain available as reference during workflow module buildout. Do not delete the file until the required workflow-module migrations are complete. Delete it during the final cleanup action plan. |
| Legacy workflow-form trigger contract `WorkflowFormWorkflowStepTriggerDefinition` | `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts` export `WorkflowFormWorkflowStepTriggerDefinition` | Delete | Workflow-module-owned next-action decision rules evaluated by `WorkflowRuntime` under `FR-29` through `FR-29e` and `FR-44b` | Workflow-step trigger-definition contract in the legacy trigger layer. Preserve the decision capability by expressing workflow-form interruption conditions as workflow-module-owned next-action rules evaluated by `WorkflowRuntime`. |
| Legacy workflow-form trigger contract `WorkflowFormStartCandidate` | `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts` export `WorkflowFormStartCandidate` | Delete | None | Workflow-start candidate contract in the legacy trigger layer for the retired simple workflow-start form path. |
| Legacy workflow-form trigger contract `WorkflowFormWorkflowStepCandidate` | `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts` export `WorkflowFormWorkflowStepCandidate` | Delete | `WorkflowRuntime` next-action evaluation result for workflow-step form rendering under `FR-29` through `FR-29e` and `FR-44b` | Workflow-step candidate contract in the legacy trigger layer. Preserve the structured decision payload capability by having `WorkflowRuntime` emit the canonical next-action result when an active workflow step requires form rendering. |
| Legacy workflow-form trigger function `resolveWorkflowFormSlashCommandStartCandidate(...)` | `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts` export `resolveWorkflowFormSlashCommandStartCandidate(...)` | Delete | None | Slash-command-to-workflow-start trigger resolution in the legacy trigger layer for the retired standalone workflow-start form path. |
| Legacy workflow-form trigger registry `workflowFormWorkflowStepTriggerRegistry` | `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts` export `workflowFormWorkflowStepTriggerRegistry` | Delete | Workflow-module-owned next-action decision rules evaluated by `WorkflowRuntime` under `FR-29` through `FR-29e` and `FR-44b` | Workflow-step trigger registry in the legacy trigger layer. Preserve the decision capability by moving workflow-step form-interruption rules into workflow modules and having `WorkflowRuntime` evaluate them as part of unified next-action evaluation. Do not delete this registry until the required workflow-module migrations are complete. Remove it during the final cleanup action plan after workflow module buildout is finished. |
| Legacy workflow-form trigger function `getWorkflowFormWorkflowStepTriggerDefinition(...)` | `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts` export `getWorkflowFormWorkflowStepTriggerDefinition(...)` | Delete | `WorkflowRuntime` evaluation of workflow-module-owned next-action rules under `FR-29` through `FR-29e` and `FR-44b` | Workflow-step trigger-definition lookup helper in the legacy trigger layer. Preserve the lookup behavior by having `WorkflowRuntime` evaluate workflow-module-owned next-action rules directly. |
| Legacy workflow-form trigger function `resolveWorkflowFormWorkflowStepCandidate(...)` | `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts` export `resolveWorkflowFormWorkflowStepCandidate(...)` | Delete | `WorkflowRuntime` unified next-action evaluation for workflow-step form rendering under `FR-29` through `FR-29e` and `FR-44b` | Workflow-step candidate resolution in the legacy trigger layer. Preserve the capability by having `WorkflowRuntime` evaluate workflow-module-owned next-action rules and emit the canonical next-action result for workflow-step form rendering. |
| Legacy step-resolution registry file `WorkflowStepResolutionRegistry.ts` | `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts` | Delete | None | File-level deterministic step-resolution registry surface. This file contains legacy workflow-specific deterministic logic that must be used as a reference during workflow module buildout. Do not delete the file until the required workflow-module migrations are complete. Delete it during the final cleanup action plan. |
| Legacy step-resolution registry constant `CODE_REVIEW_STEP_3_REVIEW_INPUT_DEFINITION_ID` | `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts` export `CODE_REVIEW_STEP_3_REVIEW_INPUT_DEFINITION_ID` | Delete | None | Exported deterministic step-resolution definition id constant. Address this during the code-review workflow module action plan. |
| Legacy step-resolution registry constant `WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_DEFINITION_ID` | `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts` export `WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_DEFINITION_ID` | Delete | None | Exported deterministic step-resolution definition id constant. Address this during the write-remediation-story workflow module action plan. |
| Legacy step-resolution registry constant `QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID` | `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts` export `QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID` | Delete | None | Exported deterministic step-resolution definition id constant. Address this during the quick-spec workflow module action plan. |
| Legacy step-resolution registry constant `BRAINSTORMING_STEP_2_CREATE_SESSION_DEFINITION_ID` | `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts` export `BRAINSTORMING_STEP_2_CREATE_SESSION_DEFINITION_ID` | Delete | None | Exported deterministic step-resolution definition id constant. Address this during the brainstorming workflow module action plan. |
| Legacy step-resolution registry map `workflowStepResolutionRegistry` | `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts` export `workflowStepResolutionRegistry` | Delete | Workflow-module-owned deterministic operation definitions evaluated by `WorkflowRuntime` under `FR-29` through `FR-29e`, `FR-42`, and `FR-43` | Registry map of deterministic step-resolution definitions. Preserve the capability by moving workflow-specific deterministic operation definitions into the owning workflow modules and having `WorkflowRuntime` orchestrate and evaluate them. Do not delete this registry until the required workflow-module migrations are complete. Remove it during the final cleanup action plan after workflow module buildout is finished. |
| Legacy step-resolution registry function `getWorkflowStepResolutionDefinition(...)` | `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts` export `getWorkflowStepResolutionDefinition(...)` | Delete | `WorkflowRuntime` lookup of workflow-module-owned deterministic operation definitions under `FR-29` through `FR-29e`, `FR-42`, and `FR-43` | Deterministic step-resolution definition lookup helper. Preserve the lookup capability by having `WorkflowRuntime` resolve workflow-module-owned deterministic operation definitions directly. |
| Workflow-form operation execution seam in task runtime | `src/core/task/index.ts` method `executeWorkflowFormOperationAndSync(...)` | Delete | `WorkflowRuntime`-owned workflow-form deterministic operation execution and result handling under `FR-41` through `FR-45` | Legacy workflow-form operation execution seam in task runtime. Preserve the capability by moving workflow-form deterministic operation execution, result interpretation, and fallback handling into `WorkflowRuntime`. |
| Legacy step-resolution trigger file `WorkflowStepResolutionTriggerRegistry.ts` | `src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts` | Delete | None | File-level deterministic step-resolution trigger surface. This file contains legacy workflow-specific interception logic that must be used as a reference during workflow module buildout. Do not delete the file until the required workflow-module migrations are complete. Delete it during the final cleanup action plan. |
| Legacy step-resolution trigger contract `WorkflowStepResolutionTriggerDefinition` | `src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts` export `WorkflowStepResolutionTriggerDefinition` | Delete | Workflow-module-owned next-action decision rules evaluated by `WorkflowRuntime` under `FR-29` through `FR-29e`, `FR-42`, and `FR-43` | Deterministic step-resolution trigger-definition contract. Preserve the decision capability by expressing deterministic interception conditions as workflow-module-owned next-action rules evaluated by `WorkflowRuntime`. |
| Legacy step-resolution trigger registry `workflowStepResolutionTriggerRegistry` | `src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts` export `workflowStepResolutionTriggerRegistry` | Delete | Workflow-module-owned next-action decision rules evaluated by `WorkflowRuntime` under `FR-29` through `FR-29e`, `FR-42`, and `FR-43` | Deterministic step-resolution trigger registry. Preserve the decision capability by moving deterministic interception rules into workflow modules and having `WorkflowRuntime` evaluate them as part of unified next-action evaluation. Do not delete this registry until the required workflow-module migrations are complete. Delete it during the final cleanup action plan after workflow module buildout is finished. |
| Legacy step-resolution trigger function `getWorkflowStepResolutionTriggerDefinition(...)` | `src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts` export `getWorkflowStepResolutionTriggerDefinition(...)` | Delete | `WorkflowRuntime` evaluation of workflow-module-owned next-action rules under `FR-29` through `FR-29e`, `FR-42`, and `FR-43` | Deterministic step-resolution trigger-definition lookup helper. Preserve the lookup capability by having `WorkflowRuntime` evaluate workflow-module-owned next-action rules directly. |
| Legacy workflow completion runner file `workflowCompletionRunner.ts` | `src/core/task/workflowCompletionRunner.ts` | Delete | `WorkflowRuntime`-owned workflow completion evaluation and teardown handling under `FR-19`, `FR-46` through `FR-49` | File-level workflow completion runner surface. Preserve the capability by moving workflow completion evaluation, completion handling, and teardown decisioning into `WorkflowRuntime` using workflow-module completion rules rather than placeholder-workflow identity and focus-chain completion transitions. |
| Legacy workflow completion runner contract `WorkflowCompletionRunnerArgs` | `src/core/task/workflowCompletionRunner.ts` export `WorkflowCompletionRunnerArgs` | Delete | `WorkflowRuntime`-owned completion evaluation inputs derived from workflow session state and workflow-module completion rules under `FR-19` and `FR-46` through `FR-49` | Workflow completion runner argument contract. Preserve the capability by having `WorkflowRuntime` evaluate completion from runtime-owned workflow session state and workflow-module completion rules instead of placeholder-workflow identity, focus-chain checklist transitions, and notice-count heuristics. |
| Legacy workflow completion runner contract `WorkflowCompletionRunnerCompletedResult` | `src/core/task/workflowCompletionRunner.ts` export `WorkflowCompletionRunnerCompletedResult` | Delete | `WorkflowRuntime`-owned completion result contract derived from workflow session state and workflow-module completion/teardown rules under `FR-19` and `FR-46` through `FR-49` | Workflow completion runner completed-result contract. Preserve the capability by having `WorkflowRuntime` emit completion results from runtime-owned workflow session state and workflow-module completion/teardown rules instead of placeholder-workflow completion state. |
| Legacy workflow completion runner contract `WorkflowCompletionRunnerResult` | `src/core/task/workflowCompletionRunner.ts` export `WorkflowCompletionRunnerResult` | Delete | `WorkflowRuntime`-owned completion evaluation result contract under `FR-19` and `FR-46` through `FR-49` | Workflow completion runner result contract. Preserve the capability by having `WorkflowRuntime` return completion-evaluation results derived from workflow session state and workflow-module completion/teardown rules instead of the legacy placeholder/focus-chain completion seam. |
| Legacy workflow completion runner function `workflowCompletionRunner(...)` | `src/core/task/workflowCompletionRunner.ts` export `workflowCompletionRunner(...)` | Delete | `WorkflowRuntime`-owned workflow completion evaluation and teardown handling under `FR-19` and `FR-46` through `FR-49` | Workflow completion runner function outside `WorkflowRuntime`. Preserve the capability by moving workflow completion evaluation, completion handling, and teardown decisioning into `WorkflowRuntime` using workflow-module completion rules rather than placeholder-workflow identity, focus-chain completion transitions, and notice-count heuristics. |
| Legacy workflow completion handler file `workflowCompletionHandler.ts` | `src/core/task/workflowCompletionHandler.ts` | Delete | `WorkflowRuntime`-owned completion follow-up handling under workflow-module completion rules and `FR-19`, `FR-46` through `FR-49` | File-level workflow completion handler surface. Preserve the capability by moving workflow-specific completion follow-up actions into `WorkflowRuntime` and workflow-module completion rules rather than a separate completion-handler registry keyed by completed workflow id. |
| Legacy workflow completion handler contract `WorkflowCompletionHandlerResult` | `src/core/task/workflowCompletionHandler.ts` export `WorkflowCompletionHandlerResult` | Delete | `WorkflowRuntime`-owned completion follow-up result contract under workflow-module completion rules and `FR-19`, `FR-46` through `FR-49` | Workflow completion handler result contract. Preserve the capability by having `WorkflowRuntime` report completion follow-up outcomes from workflow-module completion rules instead of the legacy standalone completion-handler seam. |
| Legacy workflow completion handler contract `WorkflowCompletionHandlerRegistryEntry` | `src/core/task/workflowCompletionHandler.ts` export `WorkflowCompletionHandlerRegistryEntry` | Delete | Workflow-module-owned completion follow-up definitions orchestrated by `WorkflowRuntime` under `FR-19` and `FR-46` through `FR-49` | Workflow completion handler registry-entry contract. Preserve the capability by representing completion follow-up behavior in workflow-module completion rules rather than a separate completion-handler registry keyed by completed workflow id. |
| Legacy workflow completion handler registry `workflowCompletionHandlerRegistry` | `src/core/task/workflowCompletionHandler.ts` export `workflowCompletionHandlerRegistry` | Delete | Workflow-module-owned completion follow-up definitions orchestrated by `WorkflowRuntime` under `FR-19` and `FR-46` through `FR-49` | Registry map for workflow completion handlers. Preserve the capability by moving workflow-specific completion follow-up actions into workflow-module completion rules orchestrated by `WorkflowRuntime` instead of a separate completion-handler registry keyed by completed workflow id. |
| Legacy workflow completion handler contract `WorkflowCompletionHandlerArgs` | `src/core/task/workflowCompletionHandler.ts` export `WorkflowCompletionHandlerArgs` | Delete | `WorkflowRuntime`-owned completion follow-up inputs derived from workflow session state and workflow-module completion rules under `FR-19` and `FR-46` through `FR-49` | Workflow completion handler argument contract. Preserve the capability by having `WorkflowRuntime` derive completion follow-up inputs from runtime-owned workflow session state and workflow-module completion rules instead of passing completed workflow id and tool invocation callbacks into a standalone completion-handler seam. |
| Legacy workflow completion handler function `workflowCompletionHandler(...)` | `src/core/task/workflowCompletionHandler.ts` export `workflowCompletionHandler(...)` | Delete | `WorkflowRuntime`-owned completion follow-up handling under workflow-module completion rules and `FR-19`, `FR-46` through `FR-49` | Workflow completion handler function outside `WorkflowRuntime`. Preserve the capability by moving workflow-specific completion follow-up actions into `WorkflowRuntime` and workflow-module completion rules rather than a standalone completion-handler seam keyed by completed workflow id. |
| Legacy contextual tool matrix file `contextualToolMatrix.ts` | `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts` | Delete | None | File-level contextual workflow tool-matrix surface. This file contains legacy workflow-specific tool-exposure logic that must be used as a reference during workflow module buildout. Do not delete the file until the required workflow-module migrations are complete. Delete it during the final cleanup action plan. |
| Legacy contextual tool contract `PlaceholderToolBundle` | `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts` export `PlaceholderToolBundle` | Delete | Workflow-module-owned per-step native tool schema under `FR-15` and `FR-35` through `FR-37` | Placeholder-era workflow tool-bundle contract. Preserve the capability by defining actual per-step native tool schema in workflow modules instead of routing workflow-specific tool exposure through shared bundle identifiers. |
| Legacy contextual tool map `PLACEHOLDER_BUILTIN_BUNDLE_TOOLS` | `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts` export `PLACEHOLDER_BUILTIN_BUNDLE_TOOLS` | Delete | Workflow-module-owned per-step native tool schema under `FR-15` and `FR-35` through `FR-37` | Placeholder-era built-in workflow tool-bundle map. Preserve the capability by defining actual per-step native tool schema in workflow modules instead of expanding shared workflow bundle identifiers into native tools through a central map. |
| Legacy contextual tool map `PLACEHOLDER_INDXR_BUNDLE_TOOLS` | `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts` export `PLACEHOLDER_INDXR_BUNDLE_TOOLS` | Delete | Workflow-module-owned per-step native tool schema under `FR-15` and `FR-35` through `FR-37` | Placeholder-era INDXR workflow tool-bundle map. Preserve the capability by defining actual per-step INDXR tool exposure in workflow modules instead of expanding shared workflow bundle identifiers through a central map. |
| Legacy contextual tool constant `ACT_MODE_RESPONSE_TOOL_IDS` | `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts` export `ACT_MODE_RESPONSE_TOOL_IDS` | Update | Generic prompt-mode response-tool preservation constant outside workflow-specific tool-matrix ownership | Response-tool preservation constant used by the contextual native-tool filter. Keep the capability, but remove its ownership from the legacy workflow-specific contextual tool-matrix surface. |
| Legacy contextual tool constant `PLAN_MODE_RESPONSE_TOOL_IDS` | `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts` export `PLAN_MODE_RESPONSE_TOOL_IDS` | Update | Generic prompt-mode response-tool preservation constant outside workflow-specific tool-matrix ownership | Response-tool preservation constant used by the contextual native-tool filter. Keep the capability, but remove its ownership from the legacy workflow-specific contextual tool-matrix surface. |
| Legacy contextual tool constant `ALWAYS_PRESERVED_NATIVE_TOOL_IDS` | `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts` export `ALWAYS_PRESERVED_NATIVE_TOOL_IDS` | Update | Generic always-preserved native-tool constant outside workflow-specific tool-matrix ownership | Always-preserved native-tool constant used by the contextual native-tool filter. Keep the capability, but remove its ownership from the legacy workflow-specific contextual tool-matrix surface. |
| Legacy contextual workflow-step matrix `PLACEHOLDER_WORKFLOW_STEP_MATRIX` | `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts` export `PLACEHOLDER_WORKFLOW_STEP_MATRIX` | Delete | Workflow-module-owned per-step native tool schema projected by `WorkflowRuntime` under `FR-15` and `FR-35` through `FR-37` | Placeholder-era workflow-step-to-tool-bundle matrix. This matrix contains legacy workflow-specific tool-exposure logic that must be used as a reference during workflow module buildout. Do not delete the matrix until the required workflow-module migrations are complete. Delete it during the final cleanup action plan. |
| Legacy prompt-context field `activeWorkflowPersonaInstructions` | `src/core/prompts/system-prompt/types.ts` field `activeWorkflowPersonaInstructions` | Update | Runtime-projected workflow persona prompt-context field under `FR-56` | Prompt-context field carrying the resolved active-workflow persona instructions into system-prompt assembly. Keep the capability, but ensure the field remains explicitly runtime-projected and aligned with the approved workflow-module persona mapping rather than any legacy placeholder or BMAD file lookup path. |
| Legacy prompt-context field `activeWorkflowReminder` | `src/core/prompts/system-prompt/types.ts` field `activeWorkflowReminder` | Delete | None | Legacy workflow reminder prompt-context field currently fed by managed-workflow and BMAD reminder sources. Delete this field; reminder-style prompt injection from those legacy workflow systems is not part of the new architecture. |
| Legacy prompt-context field `activeWorkflowSupportsPlaceholders` | `src/core/prompts/system-prompt/types.ts` field `activeWorkflowSupportsPlaceholders` | Delete | WorkflowRuntime-owned workflow-session capability projection and workflow-module-native tool schema under `FR-15`, `FR-35` through `FR-37`, and `FR-56` | Legacy placeholder-support prompt-context field that must be explicitly retired rather than silently remapped into the runtime-owned architecture. |
| Legacy prompt-context field `activePlaceholderWorkflowName` | `src/core/prompts/system-prompt/types.ts` field `activePlaceholderWorkflowName` | Delete | Runtime-projected active workflow identity prompt-context field `activeWorkflowName` under `FR-56`, with `WorkflowRuntime`-owned next-action, tool-schema, and prompt projection under `FR-15`, `FR-29` through `FR-29e`, and `FR-35` through `FR-37` | Legacy placeholder-workflow-name prompt-context field. Preserve the capability to project the active workflow identity, but retire this placeholder-specific field name in favor of the single runtime-owned workflow identity seam. |
| Legacy prompt-context field `activePlaceholderWorkflowStepNumber` | `src/core/prompts/system-prompt/types.ts` field `activePlaceholderWorkflowStepNumber` | Update | Runtime-projected active workflow step identity prompt-context field under `FR-56`, with `WorkflowRuntime`-owned next-action, tool-schema, and prompt projection under `FR-15`, `FR-29` through `FR-29e`, and `FR-35` through `FR-37` | Legacy placeholder step-number prompt-context field. Preserve the capability to project the active workflow step identity, but retire this placeholder-specific field name in favor of a runtime-owned active-workflow-step seam. |
| Legacy prompt-context field `activeDeterministicPlaceholderWorkflowEnabled` | `src/core/prompts/system-prompt/types.ts` field `activeDeterministicPlaceholderWorkflowEnabled` | Delete | `WorkflowRuntime`-owned next-action and progression-mode prompt projection under `FR-29` through `FR-29e`, `FR-42`, `FR-43`, and `FR-56` | Legacy deterministic-placeholder prompt-context field. Preserve the capability to project runtime-owned progression behavior, but retire this placeholder-specific boolean in favor of explicit `WorkflowRuntime` next-action and progression-mode projection. |
| Legacy prompt-context field `managedWorkflowActive` | `src/core/prompts/system-prompt/types.ts` field `managedWorkflowActive` | Delete | None | Legacy managed-workflow prompt-context field. Delete it outright; managed workflows are not part of the new architecture and this field must not be remapped into the runtime-owned workflow system. |
| Legacy `task_progress` workflow surface in `task_progress.ts` | `src/core/prompts/system-prompt/components/task_progress.ts` | Delete | None | Prompt guidance surface that currently overlaps workflow progression ownership. In the new architecture, workflow-specific `task_progress` behavior is not carried by this legacy prompt component; focus chain supports only runtime-owned workflows. |
| Legacy `task_progress` workflow surface in `attempt_completion.ts` | `src/core/prompts/system-prompt/tools/attempt_completion.ts` | Delete | None | Attempt-completion tool contract surface that currently overlaps workflow progression ownership. In the new architecture, workflow-specific `task_progress` behavior is not carried by this legacy response-tool contract. |
| Legacy `task_progress` workflow surface in `generate_plan_output.ts` | `src/core/prompts/system-prompt/tools/generate_plan_output.ts` | Delete | None | Plan-output tool contract surface that currently overlaps workflow progression ownership. In the new architecture, workflow-specific `task_progress` behavior is not carried by this legacy response-tool contract. |
| Legacy `task_progress` workflow surface in `contextManagement.ts` | `src/core/prompts/contextManagement.ts` | Delete | None | Context-management prompt surface that currently overlaps workflow progression ownership. In the new architecture, workflow-specific `task_progress` behavior is not carried by this legacy context-compaction prompt surface. |
| Legacy `task_progress` workflow surface in `openFocusChainFile.ts` | `src/core/controller/file/openFocusChainFile.ts` | Delete | None | Focus-chain file-open surface that currently depends on `task_progress` state. In the new architecture, this legacy `task_progress`-based checklist bootstrap path is not preserved as a separate seam. |
| Legacy `task_progress` workflow surface in `focus-chain/index.ts` | `src/core/task/focus-chain/index.ts` | Update | Runtime-owned focus-chain workflow progression subsystem under `FR-29` through `FR-29e`, `FR-42`, `FR-43`, and `FR-56` | Focus-chain runtime surface that currently overlaps workflow progression ownership. Keep the focus-chain subsystem, but refactor it to support only runtime-owned workflows and remove managed-workflow and placeholder-era ownership assumptions. |
| BMAD persona/reminder runtime lookup in `bmad-agent-mode.ts` | `src/core/task/bmad-agent-mode.ts` | Delete | None | BMAD-oriented runtime persona/reminder lookup surface. Delete this reminder-file lookup path; BMAD reminder injection is not part of the new architecture. |
| BMAD persona/reminder runtime lookup in `task/index.ts` | `src/core/task/index.ts` | Delete | None | BMAD-oriented runtime persona/reminder lookup surface. Delete this fragmented prompt-assembly seam; BMAD reminder/persona injection through `task/index.ts` is not part of the new architecture. |
| BMAD persona/reminder runtime lookup in `SubagentRunner.ts` | `src/core/task/tools/subagent/SubagentRunner.ts` | Delete | None | BMAD-oriented subagent persona/reminder lookup surface. Delete this fragmented subagent prompt-assembly seam; BMAD reminder/persona injection through `SubagentRunner.ts` is not part of the new architecture. |
| BMAD workflow packaging assets used as runtime dependencies | `.cline/skills/**` non-markdown workflow support assets | Delete | None | Summary bucket retired in favor of the explicit `.cline/skills` rows below. No implicit migration, preservation, or deletion is authorized beyond those explicit rows. |
| Legacy BMAD workflow source markdown in `.cline/skills` | `.cline/skills/bmad-*/workflow.md` and `.cline/skills/bmad-*/steps/**/*.md`, excluding folders explicitly marked "leave in place for now" below | Delete | None | Workflow and step markdown files remain reference-only migration sources and must not remain runtime dependencies in the new architecture. |
| Legacy BMAD workflow-package content outside supported workflow variants | `.cline/skills/bmad-*/**` for BMAD workflow packages that are not variants of supported runtime-owned workflows and are not explicitly itemized below | Delete | None | All content in BMAD workflow packages outside the supported new-architecture workflow set must be deleted rather than migrated or remapped. |
| Brainstorming workflow methods data asset | `.cline/skills/bmad-brainstorming/brain-methods.csv` | Update | Runtime code and system-tool-owned brainstorming method library used during the brainstorming workflow initial buildout | The contents of `brain-methods.csv` must migrate into runtime code so existing tool runtime surfaces can select brainstorming methods without depending on `.cline/skills` at runtime. |
| Brainstorming workflow session template | `.cline/skills/bmad-brainstorming/template.md` | Update | Runtime code in the brainstorming workflow module buildout | The brainstorming session template moves into runtime code during brainstorming workflow module buildout. |
| Other brainstorming workflow package content | `.cline/skills/bmad-brainstorming/**`, excluding `workflow.md`, `steps/**/*.md`, `brain-methods.csv`, and `template.md` | Delete | None | All other content in the `bmad-brainstorming` folder is deleted rather than migrated. |
| Create PRD workflow package | `.cline/skills/bmad-create-prd/**/*` | Leave in place | None | Intentionally left in place for now. Do not delete, migrate, remap, or otherwise touch these files unless a later approved decision is recorded in this matrix. |
| Create architecture workflow package | `.cline/skills/bmad-create-architecture/**/*` | Delete | None | All files in `bmad-create-architecture` are deleted rather than migrated. |
| Create epics workflow template | `.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md` | Update | Runtime code in the create-epics workflow module buildout | The epics template moves into runtime code during create-epics workflow module buildout. |
| PI planning epic-delivery-spec template | `.cline/skills/create-epics/epic-delivery-spec-template.md` | Update | Runtime code in the pi-planning workflow module buildout | The epic-delivery-spec template moves into runtime code during pi-planning workflow module buildout. |
| Create story workflow template | `.cline/skills/bmad-create-story/template.md` | Update | Runtime code in the create-story workflow module buildout | The create-story template moves into runtime code during create-story workflow module buildout. |
| Other create-story workflow package content | `.cline/skills/bmad-create-story/**`, excluding `workflow.md`, `steps/**/*.md`, and `template.md` | Delete | None | All other files in `bmad-create-story` are deleted rather than migrated. |
| Dev-story workflow package | `.cline/skills/bmad-dev-story/**/*` | Delete | None | All files in `bmad-dev-story` are deleted rather than migrated. |
| Code-review workflow package | `.cline/skills/bmad-code-review/**/*` | Delete | None | All files in `bmad-code-review` are deleted rather than migrated. |
| Review-adversarial-general workflow package | `.cline/skills/bmad-review-adversarial-general/**/*` | Delete | None | All files in `bmad-review-adversarial-general` are deleted rather than migrated. |
| Review-edge-case-hunter workflow package | `.cline/skills/bmad-review-edge-case-hunter/**/*` | Delete | None | All files in `bmad-review-edge-case-hunter` are deleted rather than migrated. |
| Document-project workflow package | `.cline/skills/bmad-document-project/**/*` | Leave in place | None | Intentionally left in place for now. Do not delete, migrate, remap, or otherwise touch these files unless a later approved decision is recorded in this matrix. |
| Quick-spec workflow package | `.cline/skills/bmad-quick-spec/**/*` | Leave in place | None | Intentionally left in place for now. Do not delete, migrate, remap, or otherwise touch these files unless a later approved decision is recorded in this matrix. |
| Quick-dev workflow package | `.cline/skills/bmad-quick-dev/**/*` | Delete | None | All files in `bmad-quick-dev` are deleted rather than migrated. |
| Correct-course workflow package | `.cline/skills/bmad-correct-course/**/*` | Delete | None | All files in `bmad-correct-course` are deleted rather than migrated. |
| Workflow-specific deterministic document-build handler `BuildEpicsDocumentToolHandler.ts` | `src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts` | Delete | Unified runtime document-generation tool using runtime-code-derived templates and workflow-module document-builder definitions under `FR-20d` through `FR-20h`, `FR-42a`, and `FR-55a` | Workflow-specific document creation/update surface. Retire this bespoke epics document handler in favor of the shared document-generation tool. |
| Workflow-specific deterministic document-build handler `BuildStoryDocumentToolHandler.ts` | `src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts` | Delete | Unified runtime document-generation tool using runtime-code-derived templates and workflow-module document-builder definitions under `FR-20d` through `FR-20h`, `FR-42a`, and `FR-55a` | Workflow-specific document creation/update surface. Retire this bespoke story document handler in favor of the shared document-generation tool. |
| Workflow-specific deterministic document-build handler `BuildReviewDiffOutputToolHandler.ts` | `src/core/task/tools/handlers/BuildReviewDiffOutputToolHandler.ts` | Delete | Unified runtime document-generation tool using runtime-code-derived templates or coded document builders and workflow-module document-builder definitions under `FR-20d` through `FR-20h`, `FR-42a`, and `FR-55a` | Workflow-specific document creation/update surface. Retire this bespoke review-diff artifact generator in favor of the shared document-generation tool. |
| File-backed workflow data asset loader `brainstormingTechniqueLibrary.ts` | `src/core/workflows/brainstormingTechniqueLibrary.ts` | Delete | In-module brainstorming technique library owned by the brainstorming workflow module | Runtime loader surface for external workflow data assets. Do not touch this legacy loader until the brainstorming workflow module buildout action plan executes, because that module buildout defines the replacement in-module technique library. |

#### Global Requirements: Subagent Workflow Sessions

- `FR-58`: The shared workflow runtime must support concurrent workflow sessions across main-agent and child execution contexts.
- `FR-59`: When a subagent is assigned a workflow through `useSkill`, the workflow runtime must activate that workflow only in the child execution context.
- `FR-60`: A child workflow session must have its own `activeWorkflowName`, workflow session state, active step, prompt projection, native tool schema projection, progression, completion, and teardown state.
- `FR-61`: Parent workflow state must remain unchanged by child workflow activation unless explicitly coordinated by a higher-level application behavior outside this runtime scope.
- `FR-62`: The subagent runner must not become a separate workflow orchestrator; it remains the caller/bootstrap seam for child execution contexts.
- `FR-62a`: A child workflow session may initialize selected workflow values from the parent workflow session only when the active child workflow definition explicitly declares those inheritance rules.
- `FR-62b`: Parent-to-child workflow-value inheritance must be copy-based initialization, not shared mutable state.
- `FR-62c`: The system must support same-key inheritance semantics where a child workflow value is initialized from the parent session value for that same key when the workflow definition explicitly declares that mapping.
- `FR-62d`: The system must not introduce a dedicated locking, serialization, or anti-collision subsystem for same-project parent/subagent workflow activity as part of this initiative.

#### Global Requirements: Validation, Diagnostics, and Error Handling

- `FR-63`: The workflow runtime must validate workflow definitions before using them for orchestration.
- `FR-64`: The workflow runtime must provide shared error handling for activation, projection, deterministic operations, progression, completion, teardown, persistence, and resume paths.
- `FR-65`: When deterministic resolution fails, the workflow runtime must own fallback decisioning.
- `FR-66`: Fallback decisions must allow the workflow to remain on the same step, retry through an approved path, fall back to model-driven execution, or teardown when the workflow definition deems that necessary.
- `FR-67`: The workflow runtime must provide observability and diagnostics sufficient to understand workflow activation, step changes, deterministic actions, completion, teardown, and resume behavior.

## 4. External Interface Requirements

### 4.1 User Interfaces

- `IR-1`: The system must project workflow step and status information to focus chain as a downstream UI surface.
- `IR-2`: The system must support the shared workflow-entry/project-selection flow needed to collect the pre-workflow project-selection inputs defined in `FR-10d` through `FR-10l`.
- `IR-3`: The system must support workflow-specific workflow-form payloads that are rendered by the existing workflow form capability.
- `IR-3a`: The user-facing workflow entry flow must be able to collect the shared pre-workflow project-selection inputs required to choose `new` versus `existing`, select an existing project derived from per-project folder names beneath the visible project output root, and provide a new project title when needed.
- `IR-4`: User-facing workflow progression approval flows must continue to operate through existing tool/UI mechanisms, but canonical progression must occur only through workflow runtime validation and state mutation.
- `IR-5`: Workflow completion and teardown must clear workflow-owned downstream UI surfaces so the user no longer sees stale active-workflow state.

### 4.2 Hardware Interfaces

- `IR-6`: The workflow runtime introduces no dedicated hardware interface requirements beyond the existing supported extension host and user workstation environment.
- `IR-7`: The design must remain compatible with the current local-development and extension-execution environment used by the repo.

### 4.3 Communications Interfaces

- `IR-8`: The workflow runtime must operate within the existing backend/runtime communications patterns already used between task runtime, webview/UI surfaces, and tool execution flows.
- `IR-9`: The workflow runtime must not require a new standalone remote service or a new communications protocol to perform workflow orchestration.

### 4.4 Software Interfaces

- `IR-10`: The workflow runtime must integrate with `task/index.ts` for workflow activation and per-turn orchestration entry.
- `IR-11`: The workflow runtime must integrate with the system prompt architecture by projecting workflow prompt data and workflow-owned native tool schema for final prompt assembly.
- `IR-12`: The workflow runtime must integrate with focus chain by providing runtime-owned workflow step and status projections.
- `IR-13`: The workflow runtime must integrate with the workflow form capability by providing per-panel payloads and consuming returned results.
- `IR-15`: The workflow runtime must integrate with the normal tool execution path for deterministic operations.
- `IR-16`: The workflow runtime must integrate with the persistence layer for workflow session save and resume behavior.
- `IR-17`: The workflow runtime must integrate with subagent execution contexts such that each context can host its own workflow session under the same shared runtime implementation.
- `IR-17a`: The workflow runtime must integrate with the AI-callable workflow-value persistence seam such that model-authored writes and backend-authored writes are applied through the same workflow session state contract.

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

- `NFR-1`: Workflow activation, workflow definition resolution, and projection of prompt/tool/UI state must occur within the normal turn lifecycle and must not require a separate orchestration turn.
- `NFR-2`: The architecture should reduce unnecessary runtime work associated with placeholder substitution, markdown workflow parsing, and file-dependent workflow resolution.
- `NFR-3`: Deterministic workflow paths should reuse the existing normal tool execution path rather than creating additional execution stacks for the same operation class.
- `NFR-4`: Concurrent parent and child workflow sessions must remain isolated so that orchestration work in one execution context does not corrupt another session’s state.
- `NFR-4a`: Parent and child workflow sessions must not share one mutable workflow-value map.
- `NFR-4b`: The architecture must not introduce a dedicated locking, serialization, or anti-collision subsystem for same-project parent/subagent workflow activity as part of this initiative.

### 5.2 Safety Requirements

- `NFR-5`: The workflow runtime must validate whether a progression or deterministic action is allowed for the active step before mutating canonical workflow state.
- `NFR-6`: The workflow runtime must not leave stale workflow UI, prompt state, or persisted session state behind after teardown.
- `NFR-7`: Resume behavior must fail safely when persisted workflow session state is invalid, stale, or incomplete.
- `NFR-7a`: Filesystem-safe project-identity normalization must remove or replace invalid filesystem characters, trim leading and trailing whitespace, collapse internal whitespace into a single separator, normalize casing consistently, collapse repeated separators, and reject any input that would normalize to an empty filesystem identity.

### 5.3 Security Requirements

- `NFR-8`: Workflow state and workflow-owned projections must remain scoped to their execution context so that child workflow activation does not leak or overwrite parent workflow state.
- `NFR-8a`: Explicit parent-to-child workflow-value inheritance must copy only workflow-definition-approved values and must not create implicit broad inheritance of all matching keys.
- `NFR-9`: Product-owned in-scope workflows must be resolved from trusted runtime code rather than from user-authored workflow assets.
- `NFR-10`: The architecture must continue to rely on existing application security and tool-execution controls rather than bypassing them through bespoke workflow execution paths.

### 5.4 Software Quality Attributes

- `NFR-11`: The architecture must improve maintainability by concentrating workflow orchestration in one shared runtime and concentrating workflow-specific behavior in workflow modules.
- `NFR-12`: The architecture must improve extensibility so that adding a new shipped workflow primarily means registering a new workflow module against the shared runtime contract.
- `NFR-13`: The architecture must improve reliability by giving workflow identity, active step, progression, completion, and resume one canonical owner.
- `NFR-14`: The architecture must preserve separation of concerns by keeping final prompt assembly, UI rendering, and generic tool execution in their specialist capabilities.
- `NFR-15`: The architecture must support behavioral parity migration by allowing the runtime to represent prompt content, native tool schema, deterministic rules, workflow forms, and completion rules on a per-workflow basis.
- `NFR-15a`: Shared workflow contracts must be migration-safe; when a type or field is renamed, the implementation plan must treat every producer and consumer of that contract as one end-to-end change surface rather than splitting the contract across disconnected subtasks.

### 5.5 Other Requirements

- `NFR-16`: The implementation plan derived from this document must account for migration away from placeholder workflows, BMAD support files, managed workflows, and fragmented workflow state without losing shipped workflow behavior.
- `NFR-16a`: The implementation plan must trace the workflow-value contract end to end, including backend-owned writes, AI-callable writes, subagent inheritance rules, persisted session state, and teardown clearing behavior.
- `NFR-17`: The implementation plan must include verification of activation, progression, deterministic resolution, workflow-form integration, completion, teardown, persistence, resume, and subagent isolation behavior.
- `NFR-18`: The target architecture must remain an in-process backend capability and must not be re-scoped into a separate service as part of this initiative.
