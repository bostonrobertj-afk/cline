# Workflow Runtime Architecture

## 1. Introduction and Goals

This document translates the workflow runtime project overview into a high-level architecture for the next generation of workflow execution in this repo.

The core problem is that workflow behavior is currently fragmented across placeholder workflow markdown, focus chain ownership, prompt assembly seams, workflow forms, deterministic step handlers, task state, and BMAD support files. That fragmentation has made workflow expansion increasingly bespoke and has created multiple competing owners for workflow identity, step state, prompting, progression, and teardown.

The proposed architecture introduces a shared workflow runtime that is invoked by `task/index.ts` whenever a workflow is active. `task/index.ts` remains the primary application-level orchestrator. The workflow runtime acts as a workflow-specific subrunner responsible for workflow session lifecycle, orchestration, and projection into existing specialist capabilities.

The primary goals are:

- eliminate runtime reliance on placeholder workflow markdown, BMAD support documents, and user-accessible workflow assets as the canonical source of workflow behavior
- establish one canonical workflow runtime and one canonical workflow identity flag, `activeWorkflowName`
- retire the managed workflow capability and the placeholder-workflow ownership model
- move workflow step ownership out of focus chain and into workflow runtime session state
- preserve specialist capabilities such as prompt assembly, tool execution, workflow forms, and start cards while moving workflow-specific orchestration into the workflow runtime

The highest-priority quality goals for this architecture are:

1. Single ownership of workflow state:
   Workflow identity, active step, progression, completion, and resume must have one canonical owner.
2. Cohesive orchestration:
   Workflow behavior should be orchestrated from one shared runtime instead of being scattered across many registries and helper seams.
3. Code-owned workflow definition:
   Workflow behavior, prompt content, document builders, and transition logic should be owned by product code rather than markdown documents and placeholder substitution.
4. Safe resume and teardown:
   Workflow sessions must persist the minimum necessary state to resume safely and must teardown cleanly without leaving orphaned workflow UI or prompt state behind.
5. Controlled extensibility:
   New workflows should be added by implementing a workflow module against a shared runtime contract rather than by adding more bespoke runtime seams.

## 2. Constraints

The architecture is constrained by the following discovery decisions and existing repo shape:

- `task/index.ts` remains the app-level orchestrator and the entrypoint that detects workflow invocation.
- The new workflow runtime is a subrunner, not a replacement for `task/index.ts`.
- `activeWorkflowName` is the sole canonical workflow-identity flag that answers whether a workflow is active and which workflow is active.
- `activeWorkflowName` is not the carrier for workflow session state, active-step state, or per-turn orchestration state.
- The system will not continue supporting user-authored workflows as part of this architecture direction.
- Workflows will ship with the product and will be registered in product-owned runtime code.
- Managed workflows are being retired.
- Workflow placeholders are being retired as a concept.
- Workflow-owned values discovered during execution still require one canonical runtime-owned persistence surface after placeholder workflows are retired.
- Focus chain becomes a workflow-only downstream surface and no longer owns active-step state.
- `task_progress` is retired.
- The system prompt architecture remains responsible for final prompt assembly.
- Existing specialist capabilities such as workflow forms, start cards, and tool execution should remain external specialist capabilities rather than being inlined into the workflow runtime.
- The architecture document must remain faithful to existing discovery and must not introduce new implementation-level decisions that have not yet been made.

## 3. Context and Scope

### 3.1 System Under Design

The system under design is the workflow runtime slice inside the extension backend. It is responsible for orchestrating an active workflow across turns and projecting workflow state into downstream capabilities.

### 3.2 In Scope

This architecture covers:

- workflow activation after slash-command or `useSkill` invocation
- workflow definition resolution from a product-owned registry
- workflow session state ownership
- workflow value ownership and mutation
- active-step ownership
- lifecycle orchestration across turns
- workflow prompting projection into the system prompt architecture
- workflow tool-surface projection into contextual tool gating
- workflow form orchestration
- workflow start-card orchestration
- deterministic step-resolution orchestration
- progression, completion, teardown, persistence, and resume
- subagent-local workflow sessions

### 3.3 Out of Scope

This architecture does not redesign:

- the extension’s overall application shell
- the final requirements or action-plan-level implementation sequence
- the internal implementation details of the generic tool executor
- the internal implementation details of the generic system prompt builder
- the generic UI rendering internals of the workflow start-card or workflow form surfaces

### 3.4 External Interfaces and Neighboring Systems

The workflow runtime interacts with the following neighboring systems:

- `task/index.ts`
  Detects workflow invocation and delegates workflow-specific orchestration to the workflow runtime.
- System prompt architecture
  Consumes runtime-projected workflow prompt data and workflow-owned tool schema, then performs final system prompt assembly.
- Focus chain capability
  Receives workflow step/checklist projection from runtime state and reflects it in UI and prompts.
- Workflow start-card capability
  Receives workflow-specific start-card configuration and payloads from the runtime.
- Workflow form capability
  Receives workflow-specific per-panel payloads and returns user input/results back to runtime orchestration.
- Normal tool execution path
  Executes deterministic operations requested by the runtime.
- Persistence layer
  Stores workflow session state needed to resume safely.
- Subagent execution
  Hosts child workflow sessions when a subagent is explicitly assigned a workflow through `useSkill`.
- Webview/UI surfaces
  Render workflow-specific downstream projections such as focus chain, workflow forms, and start cards.

## 4. Solution Strategy

The solution strategy is to replace the current document-owned workflow model with a two-layer code-owned model:

- one shared workflow runtime/orchestrator
- one workflow-specific module per shipped workflow

The shared workflow runtime owns lifecycle and orchestration:

- activation entrypoint
- pre-workflow project bootstrap gate
- workflow session creation and mutation
- workflow value mutation and validation
- shared artifact identity and numbering policy
- current-step resolution from session state
- orchestration across turns
- dispatch to specialist capabilities
- progression evaluation and advancement
- completion detection and teardown
- persistence and resume

Each workflow-specific module owns workflow definition and workflow-owned content:

- workflow identity and metadata
- step graph and transition rules
- per-step prompt content
- workflow-level tool defaults and per-step native tool schema
- start-card and workflow-form definitions
- deterministic step-resolution definitions
- completion and teardown rules
- workflow-owned artifact/document builders
- workflow-owned value rules, including explicit child-session inheritance rules where needed
- references to workflow-specific evaluators or handlers

The architecture intentionally removes several current concepts as canonical owners:

- placeholder workflow markdown as source of truth
- workflow placeholders as a runtime concern
- focus chain as owner of active-step state
- managed workflow state as a parallel workflow model

Instead, the workflow runtime becomes the canonical owner and downstream systems become consumers of runtime projections.

## 5. Building Block View

### 5.1 Level 1

The workflow runtime slice is composed of the following major building blocks:

1. Workflow Invocation Seam
   Lives at the `task/index.ts` boundary and detects workflow activation through slash command or `useSkill`.
2. Shared Workflow Runtime
   Canonical orchestrator for workflow lifecycle and session state across main-agent and subagent execution contexts.
3. Workflow Registry
   Product-owned inventory of shipped workflows and their canonical identifiers.
4. Workflow Modules
   One code-owned module per workflow implementing the runtime contract.
5. Workflow Value Mutation Seam
   Canonical runtime-owned seam for persisting workflow values into the active session from backend logic or AI-callable tool paths.
6. Runtime Projection Adapters
   Translate workflow session state into downstream prompt, focus-chain, form, and start-card payloads.
7. Specialist Capabilities
   Existing external capabilities that the runtime orchestrates rather than absorbs.

### 5.2 Level 2

#### Workflow Invocation Seam

Responsibilities:

- detect workflow invocation method
- set `activeWorkflowName`
- invoke workflow runtime activation

#### Shared Workflow Runtime

Responsibilities:

- run the shared pre-workflow gate before workflow-specific step orchestration begins
- obtain or resolve project identity for the active workflow session
- drive the shared pre-workflow project-selection flow before workflow-specific step orchestration begins:
  - present a `new` versus `existing` project choice
  - if `existing` is chosen, project choices are derived from the per-project folder names beneath the visible project output root
  - if `new` is chosen, collect a user-provided project title
- ensure the per-project folder exists and that these canonical project subfolders exist within that project folder before workflow-specific artifact-producing steps can run:
  - `discovery`
  - `planning`
  - `implementation`
  - `review`
  - `testing`
- create and own workflow session state per execution context
- create and own the canonical workflow value map for each workflow session
- create and own canonical normalization of user-provided project titles into filesystem-safe project identity
- create and own the canonical artifact identity and numbering chain used across related workflow outputs
- load workflow definition by `activeWorkflowName`
- determine active step from session state
- orchestrate workflow lifecycle across turns
- orchestrate multiple concurrent workflow sessions across parent and child execution contexts
- validate and apply workflow-value mutations from backend-owned logic and AI-callable tool paths
- validate allowed transitions and progression mechanisms
- coordinate completion and teardown
- persist and restore workflow session state

#### Workflow Registry

Responsibilities:

- define the canonical inventory of shipped workflows
- map slash command and `useSkill` entrypoints to workflow ids
- resolve workflow id to workflow module

#### Workflow Modules

Responsibilities:

- declare workflow metadata
- declare the canonical project subfolder designation for the workflow
- declare step graph and transition rules
- declare per-step prompt content
- declare workflow-level and per-step native tool schema
- declare workflow start-card and form configuration
- declare deterministic step-resolution rules
- declare workflow-owned artifact/document builders
- declare expected workflow values and any explicit child-session inheritance rules
- declare completion rules and workflow-specific handlers

#### Workflow Value Mutation Seam

Responsibilities:

- provide one canonical runtime-owned way to persist workflow values into the active session
- support backend-owned writes to workflow values
- support AI-callable writes to workflow values
- ensure both write paths target the same workflow session state surface

#### Runtime Projection Adapters

Responsibilities:

- build prompt-context payloads for the prompt architecture
- build focus-chain projection from session state
- build workflow-form payloads for the active step
- build start-card payloads at workflow start

#### Specialist Capabilities

These remain external and runtime-driven:

- system prompt builder
- generic tool executor
- workflow start-card renderer
- workflow form renderer/runner
- focus chain renderer

### 5.3 Static Decomposition Summary

The intended static shape is:

- `task/index.ts`
  - invokes `WorkflowRuntime`
- `WorkflowRuntime`
  - consumes `WorkflowRegistry`
  - owns `WorkflowSession`
  - uses workflow modules
  - projects into downstream adapters
- `workflows/<workflow>/definition.ts`
  - exports workflow definition, prompt content, transitions, capability configuration, and document builders

Exact filenames beyond this level are deferred to requirements and implementation planning.

## 6. Runtime View

### 6.1 Scenario: Workflow Activation

1. User invokes a workflow by slash command or `useSkill`.
2. `task/index.ts` detects the invocation and sets `activeWorkflowName`.
3. `task/index.ts` invokes the workflow runtime activation entrypoint.
4. Workflow runtime resolves the workflow definition from the shipped workflow registry.
5. Workflow runtime creates or resumes the workflow session.
6. Workflow runtime runs the shared pre-workflow gate to obtain or resolve project identity:
   - present a `new` versus `existing` project choice
   - if `existing` is chosen, populate the selection choices from the per-project folder names beneath the visible project output root
   - if `new` is chosen, collect a user-provided project title
7. Workflow runtime normalizes the chosen or provided project identity, ensures the per-project folder exists, and ensures these canonical project subfolders within that project folder are ready:
   - `discovery`
   - `planning`
   - `implementation`
   - `review`
   - `testing`
8. Workflow runtime initializes active-step state and marks the workflow as just started.
9. Workflow runtime projects downstream state for prompts, focus chain, tools, and any workflow start UI.

### 6.2 Scenario: Normal Turn Orchestration

1. A turn begins while a workflow is active.
2. Workflow runtime reads workflow session state and workflow definition.
3. Workflow runtime resolves the active step.
4. Workflow runtime projects:
   - prompt-context data for the system prompt architecture
   - workflow-owned native tool schema for the active step
   - focus-chain checklist/status derived from runtime state
5. `task/index.ts` continues normal turn execution using those runtime projections.

### 6.3 Scenario: Workflow Form Step

1. Workflow runtime determines that the active step requires workflow-form interaction.
2. Workflow runtime builds the per-panel payload for the active step using workflow-module configuration.
3. Workflow form capability renders the payload and captures user input.
4. Workflow runtime receives the result and decides the next workflow action.
5. If deterministic operations are required, workflow runtime invokes them through the normal tool path.
6. Workflow runtime applies the result to workflow session state and either:
   - keeps the workflow on the same step
   - advances the step
   - falls back to the model-driven path

### 6.3a Scenario: Workflow Value Persistence

1. A workflow turn discovers or computes one or more workflow values.
2. The values may come from backend-owned deterministic logic or from an AI-callable workflow-value persistence tool.
3. Workflow runtime validates that the write is allowed for the active workflow session.
4. Workflow runtime writes the values into the active session's canonical workflow value map.
5. Downstream prompt, artifact-path, form, and focus-chain projections consume those values from workflow session state.

### 6.4 Scenario: Deterministic Step Resolution

1. Workflow runtime determines that the current step has a deterministic resolution path.
2. Workflow runtime checks that deterministic progression is permitted for the current step.
3. Workflow runtime invokes the normal tool path for the relevant deterministic operation.
4. Workflow runtime interprets the result using workflow-module configuration.
5. On success, workflow runtime updates session state and active-step state.
6. On failure, workflow runtime follows the workflow-defined fallback path.

### 6.5 Scenario: AI-Initiated Progression Request

1. The active step allows `workflow_progress_request`.
2. The tool is exposed only because the workflow runtime projected it for the current step.
3. The model requests progression.
4. The runtime receives the user’s answer through the existing tool flow.
5. The workflow runtime validates that the requested progression mechanism is allowed for the active step.
6. The workflow runtime updates the canonical active-step state if progression is valid.
7. Focus chain updates only as a downstream reflection of the step change.

### 6.6 Scenario: Completion and Teardown

1. Workflow runtime evaluates workflow completion rules after a step mutation.
2. If completion criteria are satisfied, workflow runtime executes any workflow-specific completion handling.
3. Workflow runtime tears down the canonical workflow session.
4. Because workflow-owned values live inside that session, teardown clears workflow values by clearing the workflow session rather than by clearing separate mirrored state.
5. Downstream prompt, focus-chain, UI, and persisted workflow state are cleared as projections of that teardown.

### 6.7 Scenario: Subagent Workflow Session

1. A subagent is created.
2. The subagent runner creates a child execution context but does not become a separate workflow orchestrator.
3. If the subagent is assigned a workflow through `useSkill`, the shared workflow runtime activates that workflow in the child session only.
4. The workflow module may declare specific workflow values that should be initialized in the child session from values already present in the parent session.
5. Workflow runtime copies only those explicitly declared inherited values into the child session during activation.
6. The child session gets its own workflow identity, session state, workflow values, active step, prompt projection, tool gating, and completion lifecycle.
7. After activation, parent and child workflow values are isolated mutable state unless a higher-level coordination behavior explicitly synchronizes them.
8. The parent workflow session remains unchanged by child-session mutations.

### 6.8 Scenario: Concurrent Parent and Child Workflow Sessions

1. The main agent may have an active workflow session.
2. One or more subagents may also have assigned workflows activated in their own child execution contexts.
3. The shared workflow runtime orchestrates each session independently using the same runtime contract.
4. Prompt projection, tool schema, active step, progression, and teardown are computed per execution context rather than globally.
5. State mutation in one workflow session does not overwrite another workflow session.

### 6.9 Error and Fallback Behavior

Important error behavior in this architecture:

- deterministic workflow paths may fail
- workflow forms may fail to collect or apply required data
- completion handlers may fail
- resume may fail due to invalid or stale workflow session state

In all cases, the workflow runtime is the owner of fallback decisioning. Specialist capabilities report results, but workflow runtime decides whether to retry, remain on step, fall back to model-driven execution, or teardown.

## 7. Deployment View

This architecture does not introduce a new standalone service.

The workflow runtime lives inside the extension backend/runtime process alongside the existing task orchestration code. Its deployment context is:

- extension backend / task runtime
  Hosts `task/index.ts`, workflow runtime, workflow registry, workflow modules, prompt projection, and orchestration logic.
- webview/UI layer
  Renders downstream workflow surfaces such as start cards, workflow forms, and focus chain.
- local persistence layer
  Stores workflow session state needed for safe resume.

Subagent workflow sessions are logical child execution contexts inside the same backend environment rather than separately deployed services.

## 8. Crosscutting Concepts

### 8.1 Canonical State Ownership

The workflow runtime owns:

- active workflow session
- workflow-owned values contained within the active workflow session
- active step
- progression status
- completion state
- workflow resume state

Other systems consume projected workflow state rather than owning it.

### 8.2 Projection Instead of Ownership

Several existing systems become downstream consumers:

- focus chain reflects runtime-owned step state
- system prompt consumes runtime-owned workflow prompt data
- workflow forms and start cards consume runtime-owned payloads

### 8.3 Code-Owned Workflow Content

Workflow behavior moves into code-owned workflow modules, including:

- prompt strings
- native tool schema
- progression logic
- deterministic resolution rules
- document/artifact builders

This removes the need for placeholder substitution as a first-class runtime concept.

Workflow-owned values remain a first-class concept, but they are session-owned runtime state rather than placeholder-system state.

### 8.4 Workflow-Owned Tool Exposure

Workflow modules own the workflow-level and per-step native tool schema.

The workflow runtime determines which workflow and step are active, and the system prompt architecture imports the applicable workflow-owned tool schema during prompt assembly for that turn.

This replaces the current contextual tool matrix model as the workflow-specific owner of tool exposure behavior.

### 8.5 Prompt Assembly Contract

The workflow runtime does not replace the prompt architecture. Instead:

- workflow modules own workflow prompt content
- workflow modules also own workflow-specific native tool schema
- workflow runtime selects and projects the prompt data needed for the turn
- system prompt architecture remains responsible for final assembly

### 8.6 Specialist Capability Boundary

The workflow runtime orchestrates specialist capabilities but should not absorb them wholesale.

That means:

- workflow runtime decides when to invoke a workflow form
- workflow form capability still renders/runs the form surface
- workflow runtime decides when deterministic tool execution should happen
- the normal tool path still executes the tool

### 8.7 Persistence and Resume

The new runtime owns the minimum persisted workflow session state needed to reconstruct:

- which workflow is active
- what step is active
- what workflow values have been persisted for the active session
- what progression state exists
- what workflow-owned UI or deterministic state still matters

### 8.8 Subagent Isolation

Workflow sessions are execution-context-local, but they are all owned by the same shared workflow runtime implementation.

- parent and child sessions are separate
- the subagent runner is only a caller/bootstrap seam for child execution contexts, not a distinct workflow orchestrator
- assigned child workflows are activated only in child state
- child-session workflow values may be initialized from parent-session values only through workflow-module-declared inheritance rules
- parent and child sessions do not share one mutable workflow-value map
- parent workflow identity and state are not overwritten by child workflow activation
- the shared runtime may orchestrate multiple parent/child workflow sessions simultaneously

### 8.9 Workflow-Owned Artifact Builders

Workflow-emitted markdown artifacts remain output artifacts, but their template/source ownership moves into runtime code. Workflow modules own coded artifact definitions and builders rather than markdown template files as runtime dependencies.

Each shipped workflow has one canonical designated project subfolder, and workflow runtime uses that designation when resolving the workflow's artifact destinations inside the selected project folder.

Workflow runtime owns the shared artifact identity and numbering policy used to connect related workflow outputs inside a project.

That numbering policy must carry forward across related artifact families, for example:

- the epics document assigns canonical epic numbers
- epic delivery specs consume those epic numbers
- epic delivery specs assign canonical story numbers within an epic
- story documents consume the composite epic/story identifiers
- remediation stories extend the same identifier lineage rather than inventing a new naming scheme

Workflow runtime also owns canonical normalization of user-provided project titles into filesystem-safe project identity.

At the architectural level, that means:

- the user-provided project title is preserved as human-facing project text
- runtime derives a separate filesystem-safe identity from that title for folder creation and path resolution
- invalid filesystem characters are removed or replaced during normalization
- leading and trailing whitespace is removed
- internal whitespace is collapsed into a single separator
- casing is normalized consistently
- repeated separators are collapsed
- if normalization would produce an empty filesystem identity, runtime must reject the title rather than inventing an arbitrary folder name

Workflow artifact and project discovery remain convention-driven filesystem behavior rather than hidden registry behavior.

At the architectural level, that means:

- runtime re-discovers projects and workflow artifacts from on-disk folder placement and naming conventions
- runtime does not rely on a hidden project/artifact registry to recover identity when user-visible names change
- workflow automation is only guaranteed for artifacts that continue to match the documented naming and placement conventions
- if a user renames a project folder or artifact so it no longer matches the expected convention, downstream workflows may no longer recognize it
- that outcome is acceptable within this architecture and is treated as user-managed document hygiene rather than runtime data corruption

### 8.10 Canonical Workflow Mapping

The canonical shipped workflow mapping for this architecture is:

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

## 9. Architectural Decisions

### AD-1: Replace placeholder workflow ownership with a shared workflow runtime

Rationale:

- current workflow behavior is fragmented across multiple owners
- one shared runtime creates a canonical orchestration contract

### AD-2: Use one code-owned workflow module per workflow

Rationale:

- workflows need more expressive power than static JSON or markdown config provides
- the repo already demonstrates workflow-specific prompting, gating, deterministic seams, and artifact building

### AD-3: `activeWorkflowName` is the only canonical workflow identity flag

Rationale:

- multiple current workflow identity carriers create ambiguity
- one workflow-identity flag simplifies activation and orchestration entry

### AD-4: Active-step ownership moves from focus chain to workflow runtime

Rationale:

- focus chain is currently acting as a canonical owner it should not be
- workflow runtime must own the active step to orchestrate forms, prompting, progression, and teardown coherently

### AD-5: Final prompt assembly remains inside the system prompt architecture

Rationale:

- prompt orchestration should improve without bypassing the existing prompt system
- workflow modules can own prompt content while the prompt architecture still owns final prompt construction

### AD-6: Workflow placeholders are retired

Rationale:

- placeholders exist only because runtime currently renders external markdown workflow documents
- code-owned workflow definitions can use normal typed values and builders instead

### AD-7: Managed workflows are retired

Rationale:

- the overview explicitly identifies managed workflows as an abandoned and incompatible approach
- maintaining two workflow models increases architectural fragmentation

### AD-8: Subagent workflows are child-local

Rationale:

- subagents receive explicit workflow assignment through `useSkill`
- child workflow activation must not overwrite parent workflow state

### AD-9: Workflow values are session-owned and use one canonical mutation seam

Rationale:

- workflow values discovered during execution still need a runtime-owned persisted carrier after placeholder workflows are retired
- backend-owned writes and AI-callable writes must target the same state surface to avoid split ownership
- teardown is safest when clearing the workflow session also clears workflow-owned values

### AD-10: Child-session workflow-value inheritance is explicit and copy-based

Rationale:

- some child workflows need selected parent values to initialize correctly
- automatic inheritance of all matching keys would create hidden coupling
- copy-based initialization preserves parent/child isolation while still supporting same-key inheritance where explicitly declared

### AD-11: Workflow runtime owns hierarchical artifact identity and numbering

Rationale:

- related workflow outputs depend on a shared numbering lineage across epics, delivery specs, stories, and remediation stories
- distributing numbering logic across workflow modules would recreate drift and fragmented methodology
- one runtime-owned numbering policy provides a single canonical identity chain for related artifacts inside a project

### AD-12: Workflow runtime normalizes project titles into filesystem-safe identity

Rationale:

- user-provided project titles are human-facing text, not a safe filesystem contract
- runtime needs a deterministic and cross-platform-safe folder identity for project output persistence
- keeping display title separate from filesystem identity prevents whitespace, casing, and invalid-character variance from creating unstable path behavior

### AD-13: Workflow discovery is convention-driven and filesystem-visible

Rationale:

- the chosen architecture keeps projects and workflow artifacts user-accessible on disk
- hidden registry ownership is not required for this model
- downstream workflow automation can rely on documented folder and filename conventions rather than opaque internal identity tracking

### AD-14: Same-project concurrency is not a first-class runtime problem

Rationale:

- the intended operating model is a single user working in a normal workspace and source-control flow rather than multiple humans concurrently mutating the same project artifacts outside branch hygiene
- parent and subagent workflow sessions may run concurrently, but the architecture does not introduce a dedicated locking, serialization, or anti-collision subsystem for that case
- the runtime is designed around normal filesystem behavior and documented artifact conventions rather than a hidden coordination layer


## 10. Risks and Technical Debt

The main known risks and technical-debt areas are:

- high migration breadth:
  workflow behavior is currently scattered across task runtime, prompt assembly, focus chain, workflow forms, deterministic progression, and BMAD support files
- state migration risk:
  moving from current task-state fields to a new runtime-owned session model risks resume regressions if not handled carefully
- behavioral parity risk:
  existing workflows may rely on subtle prompt, form, or progression behavior that is easy to lose during migration
- boundary confusion risk:
  if the workflow runtime absorbs too much specialist capability behavior, the architecture may recreate another monolith instead of a clean orchestrator
- temporary duplication risk:
  transition work may create a period where old and new workflow paths coexist, increasing complexity until the old path is fully retired

This document intentionally stops at the architectural level. Requirements and action plans should define exact contracts, file shapes, migration sequencing, and validation strategy.
