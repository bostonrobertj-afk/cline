# Workflow Runtime Requirements

## 1. Introduction

### 1.1 Purpose

This document defines the software requirements for the workflow runtime initiative described in [project-overview.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/project-overview.md) and [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md).

The goal of this project is to replace the current placeholder-workflow and BMAD-document-dependent workflow model with a product-owned workflow runtime that can orchestrate shipped workflows across turns, project workflow state into downstream capabilities, and safely support progression, completion, teardown, persistence, resume, and subagent-local workflow execution.

### 1.2 Document Conventions

- `must` indicates a mandatory requirement.
- `should` indicates a recommended requirement that may admit narrow exceptions only if explicitly approved.
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

The workflow runtime project supports the broader business and product goal of making shipped workflows reliable, maintainable, and scalable inside the extension backend.

The intended business and product benefits are:

- reduce architectural fragmentation caused by placeholder workflows, BMAD support files, and scattered workflow logic
- enable additional shipped workflows without recreating bespoke runtime seams
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
- one code-owned workflow definition module per shipped workflow
- one canonical workflow identity flag, `activeWorkflowName`
- runtime-owned workflow session state, active-step state, progression, completion, and resume
- runtime-owned workflow value ownership, mutation, and teardown semantics

### 2.2 Product Features

At a high level, the software must provide:

- workflow activation when a shipped workflow is invoked through slash command or `useSkill`
- runtime-owned workflow session creation, mutation, persistence, resume, completion, and teardown
- runtime-owned workflow value persistence for values discovered during execution
- runtime-owned active-step resolution and progression
- workflow-module-defined prompt content, native tool schema, transition rules, deterministic resolution rules, forms, start cards, and artifact builders
- projection of workflow state into downstream capabilities such as system prompt assembly, focus chain, workflow forms, and workflow start cards
- support for concurrent parent and child workflow sessions using the same shared runtime implementation
- support for explicit parent-to-child workflow-value initialization where a child workflow definition declares it

### 2.3 User Classes and Characteristics

The relevant user classes are:

- end users invoking shipped workflows through extension entrypoints
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
- Managed workflows are being retired.
- Placeholder workflow markdown and workflow placeholders are being retired as canonical workflow owners.
- Workflow-owned values discovered during execution must continue to have one canonical runtime-owned persistence surface after placeholder workflows are retired.
- `task_progress` is being retired, and focus chain is becoming a workflow-only surface.

### 2.6 Assumptions and Dependencies

This requirements set assumes:

- shipped workflows will be registered in product-owned runtime code
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
- workflow form and workflow start-card integration for rendering workflow-owned payloads
- normal tool execution for deterministic operations

### 2.7 Canonical Workflow Mapping

The canonical shipped workflow mapping for this requirements set is:

| Workflow | Persona | Project Subfolder |
| --- | --- | --- |
| `advanced-elicitation.md` | `analyst` | `planning` |
| `blind-review.md` | `quality-control` | `review` |
| `brainstorming.md` | `analyst` | `discovery` |
| `check-implementation-readiness.md` | `architect` | `planning` |
| `cis-design-thinking.md` | `ux-designer` | `planning` |
| `cis-innovation-strategy.md` | `architect` | `planning` |
| `cis-problem-solving.md` | `analyst` | `discovery` |
| `cis-storytelling.md` | `creative-writer` | `implementation` |
| `code-review.md` | `quality-control` | `review` |
| `correct-course.md` | `scrum-master` | `planning` |
| `create-architecture.md` | `architect` | `planning` |
| `create-epics-and-stories.md` | `product-manager` | `planning` |
| `create-prd.md` | `product-manager` | `planning` |
| `create-product-brief.md` | `analyst` | `planning` |
| `create-story.md` | `scrum-master` | `planning` |
| `create-ux-design.md` | `ux-designer` | `planning` |
| `dev-story.md` | `developer` | `implementation` |
| `distillator.md` | `unassigned` | `implementation` |
| `document-project.md` | `analyst` | `implementation` |
| `domain-research.md` | `analyst` | `discovery` |
| `edit-prd.md` | `product-manager` | `discovery` |
| `editorial-review-prose.md` | `tech-writer` | `review` |
| `editorial-review-structure.md` | `tech-writer` | `review` |
| `generate-project-context.md` | `analyst` | `implementation` |
| `help.md` | `unassigned` | `planning` |
| `index-docs.md` | `tech-writer` | `implementation` |
| `market-research.md` | `analyst` | `discovery` |
| `pi-planning.md` | `scrum-master` | `planning` |
| `qa-generate-e2e-tests.md` | `quality-control` | `testing` |
| `quick-dev-new-preview.md` | `quick-flow-solo-dev` | `implementation` |
| `quick-dev.md` | `quick-flow-solo-dev` | `implementation` |
| `quick-spec.md` | `quick-flow-solo-dev` | `planning` |
| `retrospective.md` | `scrum-master` | `planning` |
| `review-adversarial-general.md` | `quality-control` | `review` |
| `review-edge-case-hunter.md` | `quality-control` | `review` |
| `shard-doc.md` | `tech-writer` | `implementation` |
| `sprint-planning.md` | `scrum-master` | `planning` |
| `sprint-status.md` | `scrum-master` | `planning` |
| `teach-me-testing.md` | `master-test-architect` | `testing` |
| `technical-research.md` | `analyst` | `discovery` |
| `validate-prd.md` | `product-manager` | `planning` |
| `write-remediation-story.md` | `developer` | `planning` |

## 3. System Requirements

### 3.1 Functional Requirements

#### Activation and Identity

- `FR-1`: The system must detect shipped workflow invocation through slash command and `useSkill` entrypoints in `task/index.ts`.
- `FR-2`: The system must set `activeWorkflowName` when a workflow is activated.
- `FR-3`: `activeWorkflowName` must be the canonical answer to whether a workflow is active and which workflow is active.
- `FR-4`: The system must retire parallel workflow-identity carriers used by the current runtime, including placeholder-workflow identity fields and managed-workflow identity state.
- `FR-5`: The system must resolve the active workflow from a product-owned registry of shipped workflows rather than from user-authored workflow discovery.

#### Workflow Runtime Ownership

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

#### Workflow Modules

- `FR-11`: Each shipped workflow must be represented by a code-owned workflow module.
- `FR-12`: Each workflow module must define workflow identity and metadata.
- `FR-12a`: Each workflow module must define the canonical project subfolder designation for that workflow.
- `FR-13`: Each workflow module must define its step graph and transition rules.
- `FR-14`: Each workflow module must define workflow-level and per-step prompt content.
- `FR-15`: Each workflow module must define workflow-level defaults and per-step native tool schema for model exposure.
- `FR-16`: Each workflow module must define per-step progression rules, including whether `workflow_progress_request` is permitted.
- `FR-17`: Each workflow module must define workflow start-card configuration and workflow form configuration where applicable.
- `FR-18`: Each workflow module must define deterministic step-resolution rules where deterministic resolution is supported.
- `FR-19`: Each workflow module must define completion and teardown rules.
- `FR-20`: Each workflow module must define any workflow-owned document or artifact builders needed to produce workflow outputs.
- `FR-20a`: The workflow runtime must use the workflow's canonical project subfolder designation when resolving that workflow's artifact destinations inside the selected project folder.
- `FR-20b`: The workflow runtime must own the shared artifact identity and numbering policy used to connect related workflow outputs inside a project.
- `FR-20c`: The shared artifact identity and numbering policy must carry forward across related artifact families, including epic numbering, epic-delivery-spec numbering, story numbering, and remediation-story numbering.
- `FR-21`: Each workflow module must define references to workflow-specific evaluators or handlers only where imperative logic is truly required.
- `FR-21a`: Each workflow module must define any workflow-specific workflow-value expectations and any explicit child-session workflow-value inheritance rules needed for that workflow.

#### Step Resolution and Progression

- `FR-22`: The workflow runtime must resolve the current active step from workflow session state rather than from focus chain markdown or checklist state.
- `FR-23`: Focus chain must no longer act as the canonical owner of active workflow step.
- `FR-24`: The system must treat focus chain as a downstream consumer that reflects runtime-owned workflow step and status.
- `FR-25`: The system must support model-driven progression requests through `workflow_progress_request` only when the workflow runtime indicates that mechanism is permitted for the active step.
- `FR-26`: A user approval returned through the `workflow_progress_request` flow must not progress a workflow directly; it must be handed to the workflow runtime for validation and canonical state mutation.
- `FR-27`: The system must retire `task_progress` as a workflow progression mechanism.
- `FR-28`: The system must retire direct AI tools whose purpose is to progress focus chain independently of workflow runtime state.
- `FR-29`: Deterministic workflow progression and deterministic step resolution must be defined by workflow modules and orchestrated by the workflow runtime.
- `FR-30`: The system must retire `WorkflowStepResolutionRegistry` as a separate canonical owner of workflow step-resolution behavior.

#### Prompting and Native Tool Exposure

- `FR-31`: The workflow runtime must build canonical workflow prompt data for the active turn.
- `FR-32`: The system prompt architecture must remain the final assembler of the full system prompt.
- `FR-33`: Workflow modules must own the actual workflow-specific and step-specific prompt strings.
- `FR-34`: The workflow runtime must project to the system prompt architecture which workflow prompt content applies on the current turn.
- `FR-35`: The workflow runtime must project which workflow-owned native tool schema applies on the current turn.
- `FR-36`: The system prompt architecture must consume runtime-projected workflow prompt data and workflow-owned native tool schema during prompt assembly.
- `FR-37`: The architecture must retire workflow-specific reliance on contextual tool gating as the canonical owner of workflow tool exposure behavior.
- `FR-38`: Workflow reminder behavior from the current system must be retired or migrated into the workflow-runtime-to-system-prompt architecture described above.

#### Workflow Forms and Deterministic Operations

- `FR-39`: The workflow runtime must build per-panel workflow form payloads for the active step using workflow-module configuration.
- `FR-39a`: The shared workflow-form message contract currently named `ClineWorkflowForm` in `src/shared/ExtensionMessage.ts` must be renamed to `WorkflowForm`.
- `FR-39b`: The `ClineWorkflowForm` to `WorkflowForm` rename must be implemented end to end across every producing and consuming layer, and no compatibility alias may remain unless explicitly approved.
- `FR-39c`: The shared workflow-form payload contract must use workflow-form terminology rather than resolver terminology for workflow-form identity fields.
- `FR-39d`: Any workflow-form shared-contract rename or field-shape change must be applied consistently across the shared message contract, runtime payload builders, task/runtime callers, UI consumers, and test coverage in the same migration sequence.
- `FR-39e`: The renamed shared `WorkflowForm` payload contract must carry workflow-form identity in a field named `workflowFormId`.
- `FR-40`: Workflow form rendering and user input capture must remain in the workflow form capability.
- `FR-41`: The workflow runtime must receive workflow form results and decide the next workflow action.
- `FR-42`: When deterministic operations are required as part of a workflow form path, the workflow runtime must invoke those operations through the normal tool execution path.
- `FR-43`: The workflow runtime must interpret deterministic results, apply them to workflow session state, and determine whether to remain on the same step, advance, or fall back.
- `FR-44`: The system must retire `WorkflowFormRuntime` as the canonical owner of per-panel workflow form payload construction.
- `FR-45`: The workflow-specific execution currently handled through `executeWorkflowFormOperationAndSync` must move out of `task/index.ts` and into the workflow runtime.

#### Completion, Teardown, Persistence, and Resume

- `FR-46`: The workflow runtime must evaluate completion rules after relevant workflow session mutations.
- `FR-47`: On workflow completion, the workflow runtime must execute any workflow-specific completion handling required by the workflow definition.
- `FR-48`: The workflow runtime must teardown the canonical workflow session when completion or other terminal teardown conditions are reached.
- `FR-49`: Prompt state, focus chain state, start-card state, workflow-form state, and other workflow-related downstream surfaces must clear as a projection of workflow teardown.
- `FR-49a`: Workflow-owned values must clear as a consequence of workflow session teardown because those values are stored inside the workflow session.
- `FR-50`: The workflow runtime must own the minimum persisted workflow session state needed to resume safely and reconstruct active workflow state.
- `FR-51`: The system must retire fragmented workflow persistence ownership across placeholder-workflow fields, capability-specific workflow session blobs, and managed-workflow state.
- `FR-52`: On resume, the workflow runtime must restore workflow identity, active step, relevant progression state, and any still-relevant workflow-owned UI or deterministic state.

#### Workflow Assets, Personas, and Product-Owned Content

- `FR-53`: The target architecture must eliminate runtime reliance on BMAD documents, placeholder workflow documents, YAML workflow config files, and similar user-accessible workflow assets as canonical sources of workflow behavior.
- `FR-54`: Static workflow runtime constants currently sourced from workflow config files must be represented as product-owned typed runtime code.
- `FR-55`: Workflow-emitted document templates must be represented as code-owned builders or coded template definitions rather than markdown files used as runtime dependencies.
- `FR-56`: Workflow-associated persona activation must be supported through product-owned runtime code and prompt architecture integration rather than BMAD file lookups.
- `FR-57`: BMAD packaging and skill-enablement mechanisms that exist only to support file-dependent workflow behavior must be retired once their necessary content is represented in runtime code.
- `FR-57a`: The system must treat the workflow-to-persona-to-project-subfolder mapping in Section 2.7 as the canonical shipped workflow mapping for this initiative.
- `FR-57b`: Workflow artifact and project discovery must remain convention-driven filesystem behavior rather than hidden registry behavior.
- `FR-57c`: The workflow runtime must rediscover projects and workflow artifacts from on-disk folder placement and naming conventions rather than from a hidden project or artifact registry.
- `FR-57d`: The workflow runtime must not rely on a hidden project or artifact registry to recover identity when user-visible names change.
- `FR-57e`: Workflow automation is guaranteed only for artifacts that continue to match the documented naming and placement conventions.
- `FR-57f`: If a user renames a project folder or artifact so it no longer matches the documented convention, downstream workflows may no longer recognize it, and the system must treat that outcome as user-managed document hygiene rather than runtime data corruption.

#### Subagent Workflow Sessions

- `FR-58`: The shared workflow runtime must support concurrent workflow sessions across main-agent and child execution contexts.
- `FR-59`: When a subagent is assigned a workflow through `useSkill`, the workflow runtime must activate that workflow only in the child execution context.
- `FR-60`: A child workflow session must have its own `activeWorkflowName`, workflow session state, active step, prompt projection, native tool schema projection, progression, completion, and teardown state.
- `FR-61`: Parent workflow state must remain unchanged by child workflow activation unless explicitly coordinated by a higher-level application behavior outside this runtime scope.
- `FR-62`: The subagent runner must not become a separate workflow orchestrator; it remains the caller/bootstrap seam for child execution contexts.
- `FR-62a`: A child workflow session may initialize selected workflow values from the parent workflow session only when the active child workflow definition explicitly declares those inheritance rules.
- `FR-62b`: Parent-to-child workflow-value inheritance must be copy-based initialization, not shared mutable state.
- `FR-62c`: The system must support same-key inheritance semantics where a child workflow value is initialized from the parent session value for that same key when the workflow definition explicitly declares that mapping.
- `FR-62d`: The system must not introduce a dedicated locking, serialization, or anti-collision subsystem for same-project parent/subagent workflow activity as part of this initiative.

#### Validation, Diagnostics, and Error Handling

- `FR-63`: The workflow runtime must validate workflow definitions before using them for orchestration.
- `FR-64`: The workflow runtime must provide shared error handling for activation, projection, deterministic operations, progression, completion, teardown, persistence, and resume paths.
- `FR-65`: When deterministic resolution fails, the workflow runtime must own fallback decisioning.
- `FR-66`: Fallback decisions must allow the workflow to remain on the same step, retry through an approved path, fall back to model-driven execution, or teardown when the workflow definition deems that necessary.
- `FR-67`: The workflow runtime must provide observability and diagnostics sufficient to understand workflow activation, step changes, deterministic actions, completion, teardown, and resume behavior.

## 4. External Interface Requirements

### 4.1 User Interfaces

- `IR-1`: The system must project workflow step and status information to focus chain as a downstream UI surface.
- `IR-2`: The system must support workflow-specific start-card payloads that are rendered by the existing start-card capability.
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
- `IR-14`: The workflow runtime must integrate with the workflow start-card capability by providing workflow-specific render payloads.
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
- `NFR-9`: Product-owned shipped workflows must be resolved from trusted runtime code rather than from user-authored workflow assets.
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
