# Workflow Runtime Architecture

## 1. Introduction and Goals

This document translates the workflow runtime project overview into a high-level architecture for the next generation of workflow execution in this repo.

The core problem is that workflow behavior is currently fragmented across placeholder workflow markdown, focus chain ownership, prompt assembly seams, workflow forms, deterministic step handlers, task state, and BMAD support files. That fragmentation has made workflow expansion increasingly bespoke and has created multiple competing owners for workflow identity, step state, prompting, progression, and teardown.

The proposed architecture introduces a shared workflow runtime that is invoked by `task/index.ts` whenever an in-scope workflow is active. `task/index.ts` remains the primary application-level orchestrator. The workflow runtime acts as a workflow-specific subrunner responsible for workflow session lifecycle, orchestration, and projection into existing specialist capabilities.

The primary goals are:

- eliminate runtime reliance on placeholder workflow markdown, BMAD support documents, and user-accessible workflow assets as the canonical source of workflow behavior
- establish one canonical workflow runtime and one canonical workflow identity flag, `activeWorkflowName`
- retire the managed workflow capability and the placeholder-workflow ownership model
- move workflow step ownership out of focus chain and into workflow runtime session state
- preserve specialist capabilities such as prompt assembly, tool execution, and workflow forms while moving workflow-specific orchestration into the workflow runtime

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
- Legacy workflow placeholders are being retired as a concept. Runtime-owned workflow prompt value references are allowed only as code-owned prompt-template syntax rendered by the shared workflow runtime.
- Workflow-owned values discovered during execution still require one canonical runtime-owned persistence surface after placeholder workflows are retired.
- Focus chain becomes a workflow-only downstream surface and no longer owns active-step state.
- `task_progress` is retired.
- The system prompt architecture remains responsible for final prompt assembly.
- Existing specialist capabilities such as workflow forms and tool execution should remain external specialist capabilities rather than being inlined into the workflow runtime.
- The architecture document must remain faithful to existing discovery and must not introduce new implementation-level decisions that have not yet been made.

## 3. Context and Scope

### 3.1 System Under Design

The system under design is the workflow runtime slice inside the extension backend. It is responsible for orchestrating an active workflow across turns and projecting workflow state into downstream capabilities.

### 3.2 In Scope

This architecture covers:

- workflow activation after slash-command or `useSkill` invocation for the in-scope workflow set
- workflow definition resolution from a product-owned registry
- workflow session state ownership
- workflow value ownership and mutation
- active-step ownership
- lifecycle orchestration across turns
- workflow prompting projection into the system prompt architecture
- workflow tool-surface projection into contextual tool gating
- workflow form orchestration, including the mandatory shared pre-workflow entry form
- deterministic step-resolution orchestration
- progression, completion, teardown, persistence, and resume
- subagent-local workflow sessions
- the following in-scope workflow set only:
  - `brainstorming`- done
  - `create-prd`
  - `create-architecture`- done
  - `create-epics`- done
  - `pi-planning`- done
  - `create-story`- done
  - `dev-story`- done
  - `code-review`- done
  - `acceptability-audit`- done
  - `edge-case-hunter-review`- done
  - `blind-review`- done
  - `problem-solving`
  - `create-product-brief`
  - `document-project`
  - `quick-spec`
  - `quick-dev`
  - `correct-course`
  - `validate-story`
  - `write-remediation-story`- done

### 3.3 Out of Scope

This architecture does not redesign:

- the extension’s overall application shell
- the final requirements or action-plan-level implementation sequence
- the internal implementation details of the generic tool executor
- the internal implementation details of the generic system prompt builder
- the generic UI rendering internals of the workflow form surface
- migration of any shipped workflow outside the in-scope workflow set listed in Section 3.2

### 3.4 External Interfaces and Neighboring Systems

The workflow runtime interacts with the following neighboring systems:

- `task/index.ts`
  Detects workflow invocation and delegates workflow-specific orchestration to the workflow runtime.
- System prompt architecture
  Consumes runtime-projected workflow prompt data and workflow-owned tool schema, then performs final system prompt assembly.
- Focus chain capability
  Receives workflow step/checklist projection from runtime state and reflects it in UI and prompts.
- Workflow form capability
  Receives the shared mandatory pre-workflow entry form for user-facing main-agent workflow invocations and any workflow-specific per-panel payloads, then returns user input/results back to runtime orchestration.
- Normal tool execution path
  Executes deterministic operations requested by the runtime.
- Persistence layer
  Stores workflow session state needed to resume safely.
- Subagent execution
  Hosts child workflow sessions when a subagent is explicitly assigned a workflow through `useSkill`.
- Webview/UI surfaces
  Render workflow-specific downstream projections such as focus chain and workflow forms.

## 4. Solution Strategy

The solution strategy is to replace the current document-owned workflow model for the in-scope workflow set with a two-layer code-owned model:

- one shared workflow runtime/orchestrator
- one workflow-specific module per in-scope workflow

The shared workflow runtime owns lifecycle and orchestration:

- activation entrypoint
- mandatory shared pre-workflow entry workflow form for user-facing main-agent workflow invocations
- workflow session creation and mutation
- workflow value mutation and validation
- shared artifact-family registry, artifact allocation/create capability, canonical naming, numbering, and path resolution
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
- workflow-entry informational panel content and workflow-form definitions
- deterministic step-resolution definitions
- completion and teardown rules
- artifact intent declarations and workflow-owned content builders; modules do not own canonical artifact filename patterns, numbering scopes, or discovery patterns
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
   Product-owned inventory of in-scope workflows and their canonical identifiers for this initiative.
4. Workflow Modules
   One code-owned module per workflow implementing the runtime contract.
5. Workflow Value Mutation Seam
   Canonical runtime-owned seam for persisting workflow values into the active session from backend logic or AI-callable tool paths.
6. Runtime Projection Adapters
   Translate workflow session state into downstream prompt, focus-chain, and workflow-form payloads.
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

- run the mandatory shared pre-workflow entry workflow form before workflow-specific step orchestration begins for user-facing main-agent workflow invocations
- obtain or resolve project identity for the active main-agent workflow session through that shared entry workflow form
- drive the shared two-panel pre-workflow entry flow before workflow-specific step orchestration begins for main-agent workflow invocations:
  - the first panel is informational only and carries the workflow-specific informational content that legacy workflow start cards used to carry
  - the second panel presents a `new` versus `existing` project choice
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
- persist shared entry project selection into workflow-module-declared `entryProjectValueKeys`
- create and own canonical normalization of user-provided project titles into filesystem-safe project identity
- create and own the canonical artifact identity and numbering chain used across related workflow outputs
- load workflow definition by `activeWorkflowName`
- determine active step from session state
- own workflow discovery root resolution; selector discovery roots resolve only to the visible project output root or selected project folder beneath it
- validate module-declared selector discovery target path segments as relative path-name components and reject absolute paths, parent-directory traversal, separators, drive/root syntax, or normalized root escapes
- own decision-tree source-route identity as structural runtime metadata for persistence, suppression, status/result correlation, and restore validation
- emit only documented `WorkflowBranchTriggerEvent` variants and payloads for branch-result correlation and next-action re-evaluation
- orchestrate workflow lifecycle across turns
- orchestrate multiple concurrent workflow sessions across parent and child execution contexts
- validate and apply workflow-value mutations from backend-owned logic and AI-callable tool paths
- validate and render workflow prompt value references through one shared runtime-owned prompt-template renderer before prompt projection
- validate allowed transitions and progression mechanisms
- coordinate completion and teardown
- persist and restore workflow session state

#### Workflow Registry

Responsibilities:

- define the canonical inventory of in-scope workflows for this initiative
- map slash command and `useSkill` entrypoints to workflow ids
- resolve workflow id to workflow module

#### Workflow Modules

Responsibilities:

- declare workflow metadata
- declare the canonical project subfolder designation for the workflow
- declare step graph and transition behavior through per-step next-action decision trees whose satisfied routes select exactly one decision action
- assign stable non-empty route ids that are unique within each decision-tree branch; route ids are structural identifiers for runtime correlation, not user-visible instructions, route priority, or standalone workflow behavior
- branch only on documented `WorkflowBranchTriggerEvent` variants and payloads; modules must not define custom trigger-event variants or depend on runtime-internal event fields
- Model-called workflow-projected tool success and failure are emitted as model-tool lifecycle events carrying the canonical tool name. These events allow workflow modules to route success, retry, recovery, user notification, step transition, or completion behavior after AI-invoked tools without treating those tools as runtime-selected source-route operations. `tool_backed_operation_succeeded` and `tool_backed_operation_failed` remain reserved for runtime-selected deterministic tool-backed actions with `{ branchId, routeId }` source-route correlation.
- declare selector discovery only through documented roots, target path segments, filters, labels, and sort rules; modules must not provide arbitrary filesystem paths or path traversal conventions
- declare per-step prompt templates using runtime-owned workflow value reference syntax; modules must not hand-render workflow-value references
- declare workflow-level and per-step native tool schema
- declare workflow-entry informational panel content and workflow-form configuration
- declare deterministic step-resolution rules
- declare next-action decision actions as self-contained action instructions; when an action invokes a tool-backed operation, that action owns the tool/capability instruction rather than referencing a workflow-level generic operation registry
- declare workflow-owned artifact/document builders
- declare expected workflow values, mandatory `entryProjectValueKeys`, and any explicit child-session inheritance rules
- declare completion rules; any workflow-specific follow-up work must be modeled as normal workflow steps, decision actions, document builders, or tool-backed operations before completion

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
- build the mandatory shared pre-workflow entry workflow-form payload
- build workflow-form payloads for the active step

#### Specialist Capabilities

These remain external and runtime-driven:

- system prompt builder
- generic tool executor
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
6. Workflow runtime runs the mandatory shared pre-workflow entry workflow form before workflow-specific step orchestration begins:
   - the first panel is informational only and carries the workflow-specific informational content that legacy workflow start cards used to carry
   - the second panel obtains or resolves project identity by presenting a `new` versus `existing` project choice
   - if `existing` is chosen, populate the selection choices from the per-project folder names beneath the visible project output root
   - if `new` is chosen, collect a user-provided project title
7. Workflow runtime normalizes the chosen or provided project identity, ensures the per-project folder exists, and ensures these canonical project subfolders within that project folder are ready:
   - `discovery`
   - `planning`
   - `implementation`
     - `drafts`
     - `stories-backlog`
     - `stories-review`
     - `stories-complete`
   - `review`
   - `testing`
   - `archive`
8. Workflow runtime initializes active-step state and marks the workflow as just started.
9. Workflow runtime projects downstream state for prompts, focus chain, tools, and any active workflow-form UI.
10. The activation caller routes the returned `WorkflowNextAction` into the shared next-action consumer for the same execution context before workflow execution continues. Tool-based activation paths may record the tool result first, but they must not drop, privately consume, or re-resolve around the returned activation action.

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
2. Workflow runtime builds and finalizes the per-panel payload for the active step using workflow-module configuration, runtime-owned workflow/session state, and the canonical panel-rendering pipeline.
   - Dynamic prompt/content interpolation and JSON-backed option lists are resolved during panel finalization. JSON-backed option lists resolve source JSON files from selected-project-relative `sourcePathSegments`. Source path segments may use lookup-only workflow-form interpolation from workflow/session values; runtime interpolates those segments before selected-root path resolution and validates unresolved placeholders, resolved path segments, selected-root containment, and workspace path policy before file read.
3. Workflow form capability renders the payload and captures user input.
4. Workflow runtime receives the result and applies any declared durable form values through the workflow-value persistence seam.
5. If the result completes the workflow form, workflow runtime emits `workflow_form_completed` and re-enters canonical next-action evaluation.
6. If the result is a runtime-routed non-terminal panel submission, workflow runtime keeps the active workflow form session open, emits `workflow_form_panel_submitted`, and re-enters canonical next-action evaluation.
7. Workflow runtime performs any runtime-owned deterministic procedures needed to evaluate workflow/session state.
8. If the selected next action is `continue_workflow_form`, workflow runtime targets the existing active workflow form session, finalizes the target panel payload through the canonical panel-rendering pipeline, and returns that panel to the workflow form capability in the same UI form frame.
9. If the selected next action is an action-owned tool-backed deterministic instruction, workflow runtime invokes that one instruction through the normal tool path.
10. Workflow runtime applies the result to workflow session state and either:
   - keeps the workflow on the same step
   - advances the step
   - if a tool-backed deterministic operation failed, executes the retry procedure defined for the active workflow and step, and if that retry fails, surfaces a final user-visible error

### 6.3a Scenario: Workflow Value Persistence

1. A workflow turn discovers or computes one or more workflow values.
2. The values may come from backend-owned deterministic logic or from an AI-callable workflow-value persistence tool.
3. Workflow runtime validates that the write is allowed for the active workflow session.
4. Workflow runtime writes the values into the active session's canonical workflow value map while preserving each value's JSON-safe type and shape.
5. Workflow runtime compares workflow values with deterministic equality for JSON-safe values, not by string-only comparison.
6. Downstream prompt, artifact-path, form, and focus-chain projections consume those values from workflow session state.
7. Prompt template projection consumes workflow values through the shared runtime-owned prompt-template renderer, which validates `{workflow.<workflowValueKey>}` references against the active workflow definition and renders values deterministically.
8. Tool payload builders consume the typed workflow values directly when the target tool supports that shape; any runtime or tool code that requires a string workflow value must validate a non-empty string before use and fail clearly otherwise.
9. When workflow-value persistence returns a next action, the tool or backend path carries that action to the shared next-action consumer after its normal result is recorded.

### 6.4 Scenario: Deterministic Step Resolution

1. Workflow runtime determines that the current step has a deterministic resolution path.
2. Workflow runtime checks that deterministic progression is permitted for the current step.
3. Workflow runtime executes any direct runtime-owned deterministic procedures needed to evaluate state, resolve workflow values, build runtime-owned payload inputs, or decide whether an action-owned tool-backed instruction is selected.
4. If resolution selects an action-owned tool-backed deterministic instruction, workflow runtime invokes the normal tool path for that one instruction.
5. Workflow runtime interprets the direct runtime result or tool-backed instruction result using workflow-module configuration.
6. On success, workflow runtime updates session state and active-step state.
7. On failure, workflow runtime executes the retry procedure defined for the active workflow and step.
8. If that retry fails, workflow runtime surfaces a final user-visible error.

If the selected decision action is a step transition, workflow runtime mutates the active step, evaluates completion rules against the resulting workflow state, persists required workflow metadata, and re-enters canonical next-action evaluation from the newly active step. The previous step's selected route must not also execute a second action after the transition.

### 6.5 Scenario: AI-Initiated Progression Request

1. The active step allows `workflow_progress_request`.
2. The tool is exposed only because the workflow runtime projected it for the current step.
3. The model requests progression.
4. The runtime receives the user’s answer through the existing tool flow.
5. The workflow runtime validates that the requested progression mechanism is allowed for the active step.
6. The workflow runtime updates the canonical active-step state if progression is valid.
7. The progression result is returned as a workflow next action and consumed through the shared next-action consumer rather than through a local tool-specific branch.
8. Focus chain updates only as a downstream reflection of the step change.

### 6.6 Scenario: Completion and Teardown

1. Response tools, including `attempt_completion`, do not own workflow completion. When a response tool succeeds during an active workflow, runtime records the tool result, emits any supported workflow lifecycle event, and re-enters workflow next-action evaluation.
2. Workflow runtime evaluates workflow completion rules after relevant workflow session mutations, including active-step mutation caused by a step-transition decision action.
3. If completion criteria are satisfied, workflow runtime treats completion as a terminal condition; no workflow-specific completion handler runs at this point.
4. Workflow runtime performs workflow-agnostic teardown of the canonical workflow session.
5. Because workflow-owned values live inside that session, teardown clears workflow values by clearing the workflow session rather than by clearing separate mirrored state.
6. Downstream prompt, focus-chain, UI, and persisted workflow state are cleared as projections of that teardown.

### 6.7 Scenario: Subagent Workflow Session

1. A subagent is created.
2. The subagent runner creates a child execution context but does not become a separate workflow orchestrator.
3. If the subagent is assigned a workflow through `useSkill`, the shared workflow runtime activates that workflow in the child session only.
4. The child session copies project selection from the parent workflow session during activation rather than rendering the mandatory shared pre-workflow entry form.
5. The workflow module may declare specific workflow values that should be initialized in the child session from values already present in the parent session.
6. Workflow runtime copies only those explicitly declared inherited values into the child session during activation.
7. The child session gets its own workflow identity, session state, workflow values, active step, prompt projection, tool gating, and completion lifecycle.
8. After activation, parent and child workflow-value maps are separate. Inherited object/array values are treated as read-only shared context unless a later runtime hardening phase adds deep-copy inheritance.
9. The parent workflow session remains unchanged by child-session mutations.
10. The child activation next action is consumed in the child execution context before the first child prompt assembly.
11. Child workflows do not render workflow forms. A child next action that requests workflow-form rendering is an invalid child workflow configuration and fails clearly.
12. Child workflow tool-backed operations execute through the same child tool-handler path used for model-authored child tools, including workflow-projected tool availability, then feed the result back into the shared runtime and continue next-action consumption.

Parent-owned subagent workflow assignment may be represented in the parent-authored subagent prompt only through explicit assignment markers: `use_skill("workflow-name")`, `use_skill('workflow-name')`, `skill_name = "workflow-name"`, or `skill_name = 'workflow-name'`. These markers are bootstrap metadata consumed before the child turn, not child-authored `use_skill` tool calls.

### 6.8 Scenario: Concurrent Parent and Child Workflow Sessions

1. The main agent may have an active workflow session.
2. One or more subagents may also have assigned workflows activated in their own child execution contexts.
3. The shared workflow runtime orchestrates each session independently using the same runtime contract.
4. Prompt projection, tool schema, active step, progression, and teardown are computed per execution context rather than globally.
5. State mutation in one workflow session does not overwrite another workflow session.

### 6.9 Error and Retry Behavior

Important error behavior in this architecture:

- deterministic workflow paths may fail
- workflow forms may fail to collect or apply required data
- completion detection or teardown may fail
- resume may fail due to invalid or stale workflow session state

For deterministic workflow failures, workflow runtime owns retry and final error handling. Specialist capabilities report results, but workflow runtime executes the workflow-defined retry procedure and, if retry fails, surfaces the final user-visible error.

## 7. Deployment View

This architecture does not introduce a new standalone service.

The workflow runtime lives inside the extension backend/runtime process alongside the existing task orchestration code. Its deployment context is:

- extension backend / task runtime
  Hosts `task/index.ts`, workflow runtime, workflow registry, workflow modules, prompt projection, and orchestration logic.
- webview/UI layer
  Renders downstream workflow surfaces such as workflow forms and focus chain.
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
- workflow forms consume runtime-owned payloads

### 8.3 Code-Owned Workflow Content

Workflow behavior moves into code-owned workflow modules, including:

- prompt strings
- native tool schema
- progression logic
- deterministic resolution rules
- document/artifact builders

This removes the need for placeholder substitution as a first-class runtime concept.

Workflow-owned values remain a first-class concept, but they are session-owned runtime state rather than placeholder-system state.

Workflow-owned values are typed JSON-safe session data, not a string-only placeholder map. Workflow prompt templates may reference workflow values only through runtime-owned workflow value reference syntax, and the shared workflow runtime renders those references before prompt projection. Workflow modules must not perform local ad hoc workflow-value substitution or leave unresolved workflow value reference markers in the prompt contract.

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
- workflow runtime owns same-session workflow form continuation, including route/action evaluation between panels and final panel payload construction
- workflow runtime executes direct runtime-owned deterministic procedures inside `WorkflowRuntime` or shared runtime-owned seams
- workflow runtime decides when deterministic tool execution should happen
- the normal tool path still executes the tool

### 8.6a Runtime Workspace Path Policy

Runtime-owned deterministic filesystem procedures are subject to the same workspace path-policy as normal tool execution.

`Task` owns the initialized `ClineIgnoreController` for the execution context and passes it into `WorkflowRuntime` through a narrow runtime dependency. `WorkflowRuntime` must not instantiate its own independent path-policy controller and must not depend on tool-handler-only classes such as `ToolValidator`.

The workflow discovery root boundary is enforced before workspace path-policy. `project_output_root` resolves to the visible project output root, and `selected_project_root` resolves to the selected project folder beneath that root. Runtime validates `targetPathSegments` as relative single path components, joins them beneath the resolved root, verifies the normalized target remains inside that root, and only then applies workspace path-policy checks. Absence of `.clineignore` must not authorize discovery outside the resolved workflow discovery root.

`WorkflowRuntime` and shared runtime discovery helpers must use that runtime path-policy dependency before runtime-owned filesystem access:

- discovery validates the target directory before `readdir`
- discovery filters discovered child entries through path policy before exposing candidates
- artifact creation validates the artifact parent directory before `mkdir`
- artifact creation validates the artifact file path before `writeFile`
- entry project setup validates the project root and each canonical subfolder before `mkdir`

Handler-level path-policy checks remain required for tool boundaries, but they do not replace runtime-level checks for runtime-owned discovery, allocation, or filesystem creation.

### 8.6b Shared Next-Action Consumption

Returned workflow next actions are the canonical continuation of workflow execution. Activation, workflow value persistence, workflow progress requests, workflow-form submission, same-session workflow-form continuation, and tool-backed operation result handling must route their returned next action into one shared consumer.

`Task` and `SubagentRunner` may provide context-specific adapters, but they must not interpret workflow branches independently.

The consumer persists workflow metadata for model-driven handoff actions, renders workflow forms only in main-task contexts, continues active workflow form sessions only in main-task contexts, rejects workflow-form rendering or continuation in child contexts, executes action-owned tool-backed instructions through the normal tool path for that context without resolving generic operation ids through a workflow-level registry, feeds tool results back into `WorkflowRuntime`, and continues evaluation until control is handed back, completed, or failed.

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
- parent-authored workflow assignment markers are bootstrap metadata consumed by `SubagentRunner`; those marker snippets are removed before the first child model request
- when a workflow assignment marker is present but cannot be honored, the subagent run fails before the first child model request and reports the cause when available
- failed workflow assignment must not be converted into child-visible fallback instructions, prompt-visible skill assignment conventions, or child-authored `use_skill` behavior
- assignment marker names do not filter child prompt skills; child prompt skills come from configured subagent skills or normal available-skill discovery, while workflow instructions/tools come only from successful runtime activation
- child workflow activation copies parent project selection as activation context and does not render the mandatory shared pre-workflow entry form
- child-session workflow values may be initialized from parent-session values only through workflow-module-declared inheritance rules
- parent and child sessions use separate workflow-value maps; inherited object/array values are not for independently mutated parent/child state in the foundational build
- parent workflow identity and state are not overwritten by child workflow activation
- the shared runtime may orchestrate multiple parent/child workflow sessions simultaneously

### 8.9 Workflow-Owned Artifact Builders

Workflow-emitted text artifacts remain output artifacts, but their template/source ownership moves into runtime code. Workflow modules own artifact intent declarations and content builders rather than markdown template files as runtime dependencies.

Each shipped workflow has one canonical designated project subfolder, and workflow runtime uses that designation when resolving the workflow's artifact destinations inside the selected project folder.

Workflow runtime owns the shared artifact identity and numbering policy used to connect related workflow outputs inside a project.

Workflow runtime also owns the typed artifact-family convention registry used for canonical artifact families. That registry defines allocation mode, parent or target requirements, filename pattern, file extension, numbering scope, and discovery pattern. Workflow modules may reference artifact-family identifiers from that registry, but modules do not own canonical artifact filename patterns, numbering scopes, extensions, or discovery patterns.

Artifact identity is not always numeric. Numbered lineage artifacts use dotted numeric identities. Singleton project artifacts use stable registry-owned string identities.

`Epics.index.json` is the structured epic inventory sidecar for `Epics.md`. It uses this schema: `{ "version": 1, "epics": [{ "identity": "1", "title": "...", "story-index-generated": false }] }`. `identity` is a positive numeric string, `title` is a non-empty string, `story-index-generated` is a boolean, and the index does not contain story, remediation-story, or review data.

The canonical artifact dependency chain is:

```text
Epics.md + Epics.index.json
  -> implementation/epic-{E}-stories.index.json
      -> implementation/drafts/Story-{E}-{S}.md
          -> implementation/drafts/Remediation-story-{E}-{S}-{R}.md
          -> review/input artifacts
```

Story planning validates the selected epic against `Epics.index.json`. Story file generation validates against the selected epic's `implementation/epic-{E}-stories.index.json`; `Epics.index.json` alone is not sufficient proof that a specific story file exists or should be generated.

That numbering policy must carry forward across related artifact families, for example:

- the epics document assigns canonical epic numbers
- story indexes consume those epic numbers
- workflow runtime assigns canonical story numbers within an epic through runtime-owned story planning tools, using the selected parent epic identity and existing `epic-{E}-stories.index.json` entries
- story documents consume the composite epic/story identifiers
- remediation stories extend the same identifier lineage rather than inventing a new naming scheme
- QA/review artifacts inherit the selected story or remediation-story target identity rather than allocating a review-specific number

Workflow runtime owns artifact allocation and derivation:

- allocated artifact families receive the next canonical number in the correct scope
- derived artifact families inherit the selected parent or target identity
- runtime produces the canonical artifact filename, project-relative path, and absolute path
- runtime creates the empty artifact file before reporting allocation success
- runtime persists project context, artifact family, artifact identity, artifact filename, artifact relative path, artifact absolute path, and parent or target identity into workflow session values where applicable
- document builders consume runtime-resolved artifact destination paths and remain content builders rather than artifact identity, filename, or project-folder allocators

Workflow runtime must provide a backend-owned file-move capability for workflow decision trees that need to move existing project files between canonical project folders. File moves remain runtime/tool-governed filesystem operations and must stay inside the selected project folder.

PI planning creates or updates the canonical story inventory in `implementation/epic-{E}-stories.index.json` before story files are generated. Runtime-owned story planning tools assign primary and remediation story identities and filenames. Runtime-owned story generation creates missing draft story files in `implementation/drafts`, populates prescribed story headings, and updates `story_file_generated` in the story index. AI agents do not provide canonical story identities or canonical story filenames.

Workflow modules can route deterministic story-status changes through a backend-only runtime story-index status update action before workflow completion.

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

Workflow modules may require prerequisite files before model-driven work begins. Prerequisite-file discovery and selection is a distinct runtime workflow capability. It is not part of shared project selection and must not be implemented by mutating or repurposing project-selection behavior.

A workflow module declares each prerequisite file, including whether it is required or optional, the selected-project subfolder to scan, the exact filename or file-naming pattern to match, the workflow that produces the file, the workflow-value destination for the selected full path when persistence is required, and whether the selected path must be added to the workflow's output document by deterministic workflow behavior.

WorkflowRuntime owns prerequisite-file scanning after project selection. It scans only inside the selected project folder and the module-declared subfolder, applies the module-declared filename or naming pattern, validates scan roots and candidate paths through runtime path-boundary and workspace path-policy rules, and produces candidate records containing filename and full absolute path.

For one required match, WorkflowRuntime renders a confirmation panel showing the filename and full path and asks whether to continue with that file selected. For multiple required matches, WorkflowRuntime renders a required dropdown containing every matched file and a cancel option. For no required matches, or for required cancellation/rejection, WorkflowRuntime renders a cannot-continue panel naming the workflow that produces the prerequisite file.

Optional prerequisites use the same discovery and selection behavior, except no-match, cancel, or rejection continues without a cannot-continue panel.

The mandatory shared pre-workflow entry form must not own workflow-specific prerequisite selection.

### 8.10 Canonical Workflow Mapping

The canonical in-scope workflow mapping for this architecture is:

| Workflow | Persona | Project Subfolder |
| --- | --- | --- |
| `blind-review` | `quality-control` | `review` |
| `brainstorming` | `analyst` | `discovery` |
| `code-review` | `quality-control` | `review` |
| `correct-course` | `scrum-master` | `planning` |
| `create-architecture` | `architect` | `planning` |
| `create-epics` | `product-manager` | `planning` |
| `create-prd` | `product-manager` | `planning` |
| `create-product-brief` | `analyst` | `planning` |
| `create-story` | `scrum-master` | `planning` |
| `dev-story` | `developer` | `implementation` |
| `document-project` | `analyst` | `implementation` |
| `pi-planning` | `product-manager` | `planning` |
| `quick-dev` | `quick-flow-solo-dev` | `implementation` |
| `problem-solving` | `analyst` | `discovery` |
| `quick-spec` | `quick-flow-solo-dev` | `planning` |
| `review-adversarial-general` | `quality-control` | `review` |
| `edge-case-hunter-review` | `quality-control` | `review` |
| `validate-story` | `scrum-master` | `planning` |
| `write-remediation-story` | `developer` | `planning` |

`problem-solving` is the target migrated workflow name for this initiative and replaces the legacy `cis-problem-solving` naming in the in-scope runtime design.

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

### AD-10: Child-session workflow-value inheritance is explicit initialization

Rationale:

- some child workflows need selected parent values to initialize correctly
- automatic inheritance of all matching keys would create hidden coupling
- explicit initialization preserves parent/child map ownership while supporting same-key inheritance where explicitly declared; object/array inheritance is reserved for read-only shared context unless deep-copy inheritance is added later

### AD-11: Workflow runtime owns hierarchical artifact identity and numbering

Rationale:

- related workflow outputs depend on a shared numbering lineage across epics, story indexes, stories, remediation stories, and QA/review artifacts
- QA/review outputs must inherit the selected target story or remediation-story identity rather than create a separate review numbering scheme
- distributing numbering, filename, extension, or discovery-pattern logic across workflow modules would recreate drift and fragmented methodology
- one runtime-owned numbering policy and typed artifact-family convention registry provide a single canonical identity chain for related artifacts inside a project

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
