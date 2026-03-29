# How to Build This Document:
These steps are intended for a full architecture design for a brand-new repo. Since we're working in an existing project we need to be mindful of that and use these steps as inspiration, not as hard "must do" requirements.

## Make the core architecture decisions
Identify the remaining decisions that are not already fixed by the discovery document.
Work through only the unresolved categories that this feature actually touches in the existing product. Categories such as data architecture, authentication and security, API and communication, frontend architecture, and infrastructure and deployment are examples, not mandatory sections. Do not force greenfield-style coverage of categories the feature does not materially affect.
Record each decision, the rationale, and any important trade-offs. If a decision needs deeper exploration, explain the options before locking it in. If a non-critical decision is deferred, record the deferral explicitly.
Document decisions incrementally as they are made so the architecture document remains the authoritative record even if conversation context is later compacted.

## Define implementation patterns
Identify the naming, structure, API, data, event, state, and process conventions where different implementation agents could diverge.
Ask the user to choose the preferred standards for the highest-conflict areas first, then record the concrete patterns and consistency rules that should keep implementation aligned.

## Define project structure
Map the requirements and decisions onto the repo's existing modules, services, directories, shared components, and integration boundaries before proposing any new top-level subsystem.
Define the core project directory structure, the major API and data boundaries, and the shared areas that multiple agents need to treat consistently. Prefer extension points and existing runtime seams over inventing parallel systems.

## Validate the architecture
Review the full architecture for coherence, requirement coverage, implementation readiness, pattern and structure alignment, and consistency with existing repo patterns and architecture documents.
Classify any issues as critical, important, or minor.
Treat invented parallel subsystems or architecture that ignores established repo patterns as a design smell that should be called out explicitly.
If there are critical issues, present them and ask how the user wants to resolve them before implementation. If there are important or minor issues, present them as refinements and ask whether to address them now.

# Architecture

## Working Approach

This document uses the steps above as guidance, not as rigid requirements. Those steps were written for a brand-new project, but this feature is being added to an existing product with established runtime, workflow, task, and UI architecture.

For this document, that means:

- decisions should be framed as extensions to existing systems, not greenfield subsystems unless absolutely necessary
- only architecture categories that are actually relevant to this feature should be expanded
- decisions should be recorded incrementally as they are made so the document remains a reliable source of truth even if chat context is later compacted

## Blast Radius

This feature has a real cross-system blast radius and must be treated as an integrated runtime change, not as an isolated UI enhancement.

At minimum, the blast radius includes:

- placeholder workflow source documents
  - supported use cases may require workflow-step reshaping so the form-driven procedure is a single dedicated step
- deterministic workflow progression
  - the capability is inserted between two existing deterministic progression events and depends on that system to enter and exit cleanly
- transition events within deterministic workflow progression
  - the event that triggers the form-based procedure and the event triggered by the invoked tool's output must both remain usable and must not be swallowed or replaced

It also likely includes:

- slash-command activation flow
  - for use cases that gather deterministic inputs at invocation time
- task ask/say and shared submission contracts
  - because this architecture introduces a dedicated workflow-form ask/say type and a dedicated structured workflow-form submission request
- task persistence and resume behavior
  - because in-progress workflow-form sessions must survive reload without introducing a second workflow engine
- existing tool architecture
  - because the capability is treated as a tool-like runtime component and must follow the repo's established tool-extension patterns

Every supported use case should therefore be evaluated for blast radius across workflow source, progression behavior, trigger semantics, runtime transport, and persistence before implementation is considered complete.

## Core Architecture Decisions

### Decision 1: Trigger Scope

The workflow UI surface capability must support both trigger types from the start:

- deterministic workflow progression
- slash-command invocation

#### Rationale

- Phase 2 use cases are already known to require slash-command invocation.
- The core capability should not need to be reworked later just to add a second trigger source.
- The underlying mechanism should therefore be trigger-agnostic, with multiple entry paths into the same form-driven deterministic resolution flow.

#### Implications

- The architecture must support both:
  - a workflow-step-driven entry path
  - a slash-command-driven entry path
- Trigger handling should converge into the same underlying workflow-form runtime rather than creating two unrelated implementations.

### Decision 2: Runtime Contract

This feature will use a new dedicated workflow-form ask/say type.

#### Rationale

- A workflow form is not semantically the same as an agent-authored follow-up question, a tool approval, or any existing ask/say interaction.
- Giving it a dedicated contract keeps the feature explicit in task runtime handling, task history, and webview rendering.
- This avoids overloading existing mechanisms such as `followup` with semantics they were not designed to carry.

#### Implications

- The task/runtime layer will need dedicated workflow-form ask/say handling.
- The webview/chat layer will need a dedicated rendering path for workflow-form interactions.
- Existing UI primitives and chat insertion patterns may still be reused, but the semantic contract should remain distinct.

### Decision 3: Submission Transport

This feature will use a new dedicated structured workflow-form submission request.

#### Rationale

- Workflow-form submission is a structured interaction and should not be forced through existing text-based ask-response submission.
- The submission path is internal product transport from the webview back to the active task/runtime, not prompt transport to the AI agent.
- A structured submission request gives the feature a durable contract for multi-field form data, validation-ready values, and future expansion.

#### Implications

- The webview will submit workflow-form data to the active task/runtime through a dedicated structured request path.
- This submission should not be routed through generic freeform `text` payloads.
- The form submission transport should terminate in the existing task/runtime layer, where the workflow-form execution logic can translate the validated values into the canonical tool call shape.

### Decision 4: Configuration Location And Ownership

This capability should follow the repo's existing tool architecture rather than introducing a new standalone configuration subsystem.

#### Decision

- the workflow-form capability is treated as a tool-like runtime component within the existing tool architecture
- capability-owned configuration should live with that capability in the same general way other tools are defined in this repo
- trigger references should remain with the existing runtime mechanisms that invoke the capability

#### Rationale

- This repo already has an established tool pattern:
  - canonical tool ids in [src/shared/tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts)
  - handlers under [src/core/task/tools/handlers/](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/)
  - coordinator registration in [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts)
  - prompt/native tool definitions under [src/core/prompts/system-prompt/tools/](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/)
- The repo already documents this extension path in [src/core/prompts/system-prompt/tools/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/README.md).
- Concrete tool-integration planning in this repo already assumes this architecture, for example [docs/local-diff-output-builder.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/local-diff-output-builder.md).
- Treating this capability as tool-like keeps it aligned with existing registration, handler, prompt, and transport patterns instead of inventing a greenfield config system.

#### Implications

- the capability's own resolver/form configuration should be co-located with the capability
- workflow-step trigger references should live with the workflow progression/runtime logic that decides when to invoke the capability
- slash-command trigger references should live with the slash-command/runtime path that decides when to invoke the capability
- the capability should not own workflow orchestration policy; it should only own its own behavior and configuration

#### Boundary

There are still two kinds of information, but only one of them is tool-owned:

- tool-owned:
  - form behavior
  - field definitions
  - help/dictionary references
  - target-tool mapping
  - value-to-tool-argument transformation rules
- runtime-owned:
  - which workflow step invokes the capability
  - which slash command invokes the capability
  - when in the lifecycle the capability is entered

### Decision 5: Persistence And Resume Behavior

Persistence and resume should use the repo's existing task persistence seams. The feature should persist one minimal active workflow-form session per task and must not introduce a second workflow state engine.

#### Rationale

- The repo already persists task/runtime/workflow metadata through existing task metadata and task history structures.
- Existing workflow state is already represented in persisted task metadata, including active workflow identity, active placeholder workflow data, and deterministic workflow progression state.
- Ordinary ask-response state in `TaskState` is mostly ephemeral, which is acceptable for simple asks but too weak for a richer multi-field workflow form that may need to survive reload/reopen.
- The feature needs resumability, but that resumability should attach to the existing task model rather than inventing a new persistence subsystem.

#### Decision

- persist a single active workflow-form session in the existing task persistence model
- reuse existing task message history and thread-display lifecycle semantics
- on reopen or resume, if an unresolved workflow-form session exists, reconstruct the workflow-form ask from persisted session state and render it again

#### Minimum Persisted Session State

The persisted workflow-form session should include only the minimum state required to resume the interaction:

- resolver/capability id
- trigger source
- owning context
  - workflow name + step number, or slash-command source
- current form phase
- current field selections and entered values
- last validation or execution error if retry is supported

#### Non-Goals

Do not persist:

- duplicate workflow progression state already owned by existing workflow systems
- duplicate tool execution result state already owned by existing tool/runtime systems
- raw form submissions in model-visible history
- a separate workflow orchestration model

#### Lifecycle

- create the session when the workflow-form ask is launched
- update the session as the user progresses through the form
- clear the session immediately on success, explicit cancel, or loss of the triggering workflow context
- restore the form from the persisted session on reload when appropriate

### Decision 6: Relationship Between Workflow-Step And Slash-Command Configuration

Workflow-step configuration and slash-command configuration should remain separate trigger-reference layers that point at shared resolver definitions.

#### Rationale

- Workflow progression triggers and slash-command triggers are not the same lifecycle event.
- A workflow-step trigger fires inside an already-active workflow and relies on the workflow's existing done-signal and progression machinery.
- A slash-command trigger fires at command-entry time and may gather inputs needed before or during activation, but it is not inherently the same as an in-workflow step transition.
- Keeping the trigger-reference layers separate avoids forcing two different runtime events into one configuration shape.
- Pointing both trigger types at shared resolver definitions avoids duplicating resolver behavior, form definitions, field mappings, or target-tool mappings.

#### Decision

- keep workflow-step trigger configuration separate from slash-command trigger configuration
- allow both trigger types to reference the same shared resolver ids
- keep resolver definitions capability-owned and reusable across trigger types

#### Important Constraint

Both existing trigger systems already perform other responsibilities. This capability must not swallow or replace those existing outputs.

- workflow progression must continue to perform its existing responsibilities
- slash-command invocation must continue to perform its existing responsibilities
- the new capability should attach as an additive hook/branch, not as a replacement control path that prevents downstream existing behavior from observing or continuing from the trigger

Pause is allowed, replacement is not.

- the trigger path may pause at a defined insertion point while the workflow-form capability runs
- after the capability resolves its deterministic human-assisted step, control must return to the original trigger path
- the behavior before the pause and after resumption should remain unchanged except for the newly resolved inputs, placeholders, or artifacts produced by the capability

#### Implications

- a workflow-step trigger reference should mean:
  - when workflow `X` reaches step `Y`, invoke resolver `Z`
  - then allow the existing workflow progression path to continue doing its normal work
- a slash-command trigger reference should mean:
  - when slash command `X` is invoked, invoke resolver `Z` at the configured entry stage
  - then allow the existing slash-command activation/resolution path to continue doing its normal work
- trigger handling must therefore be compositional rather than substitutive
- resolver definitions must not be duplicated between the workflow-step and slash-command trigger maps

#### Example Constraint

Placeholder workflows are started through slash commands. If a slash-command use case immediately invokes this capability, the workflow must still start and remain available afterward.

That means:

- the slash command may pause before the AI is invoked
- the form capability may gather the workflow's required inputs
- the deterministic resolver may run
- then the existing workflow activation path must continue so the workflow is active and can use the produced inputs or artifacts

If the capability runs and produces output but the workflow itself does not continue into its normal active state, the design is broken.

### Decision 7: Workflow Shaping Requirement For Supported Use Cases

For each use case that adopts this capability, the associated workflow must be assessed and updated so the form-based procedure fits the existing deterministic workflow progression model cleanly.

#### Rationale

- This capability is not a parallel workflow engine.
- It depends on the existing deterministic workflow progression path before and after the form-driven procedure.
- Therefore the surrounding workflow source must be structured so the form-driven procedure is a cleanly isolated step that existing deterministic progression can enter and leave without ambiguity.

#### Decision

For each supported use case, the associated workflow source document must be reviewed and, if needed, updated to ensure all of the following are true:

- the form-based procedure is defined as a single dedicated workflow step
- the workflow is supported by deterministic workflow progression
- the progression event immediately before that step is usable as the trigger that invokes the form-based procedure
- the deterministic progression event immediately after that step is triggered directly by the output of the invoked tool

#### Implications

- adopting this capability for a use case is not only a UI/runtime integration task; it is also a workflow-shaping task
- if a workflow cannot satisfy these conditions in its current source structure, the workflow source must be refactored before the capability is applied to that use case
- post-resolution progression and prompt injection remain owned by the existing deterministic workflow progression system rather than by this capability

## Implementation Patterns

This section captures architectural guardrails that should keep future implementation aligned with the decisions above.

### 1. Additive Trigger Pattern

- workflow progression triggers and slash-command triggers may pause to let this capability run
- after the capability resolves its deterministic human-assisted step, control must return to the original trigger path
- the capability must not swallow, replace, or short-circuit the normal downstream behavior of the trigger that invoked it

### 2. Tool-Architecture Pattern

- the capability should be implemented as a tool-like runtime component
- it should follow the repo's existing tool architecture and extension patterns
- capability-owned behavior and configuration should live with the capability, while trigger references remain owned by the runtime systems that invoke it

### 3. Dedicated Contract Pattern

- the capability must use its own dedicated workflow-form ask/say type
- the capability must use its own dedicated structured workflow-form submission request
- existing `followup` and generic text-based ask-response contracts must not be overloaded to impersonate workflow-form interactions

### 4. No Parallel Workflow Engine Pattern

- this feature must not introduce a second workflow orchestration model
- existing deterministic workflow progression remains authoritative for entering and leaving supported form-driven steps
- existing tool execution remains authoritative for invoked tool behavior and validation
- persisted state should therefore be limited to the minimum active workflow-form session data needed for resume/reload

### 5. Workflow-Shaping Pattern

- a supported use case must be represented as a single dedicated system-owned workflow step
- workflow source should make that ownership explicit
- agent-facing step details for such a step should exist as fallback instructions rather than the primary execution path

### 6. No Input Replay Pattern

- raw human form inputs must not be replayed into model context
- the capability exists to avoid spending tokens on agent-side relay work, so UI-to-runtime submission must stay separate from model-visible conversational input

### 7. Existing-System-First Pattern

- when implementation choices arise, prefer extension of existing runtime seams, message contracts, persistence seams, and UI primitives before introducing new top-level subsystems
- any proposed new subsystem should be treated as exceptional and should require justification against the repo's existing architecture

## Project Structure Mapping

This feature should be implemented as an enhancement across several existing system components that already work together, with one new capability flowing through them. It should not be modeled as a single monolithic subsystem that sits beside the existing architecture.

### Shared Contract Layer

Owns the shared contract additions required by the new procedure:

- the dedicated workflow-form ask/say type
- the dedicated structured workflow-form submission request

Best-fit existing areas:

- [src/shared/ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)
- [src/shared/WebviewMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/WebviewMessage.ts)
- [src/shared/proto/cline/task.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto/cline/task.ts)

### Task/Tool Runtime Layer

Owns the new workflow-form capability itself as a tool-like runtime component.

Best-fit existing areas:

- [src/core/task/tools/](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/)
- [src/core/task/tools/handlers/](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/)
- [src/core/task/tools/ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts)
- [src/core/prompts/system-prompt/tools/](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/)

### Workflow Progression Integration Layer

Owns the workflow-step trigger side of the procedure.

Best-fit existing areas:

- [src/core/task/focus-chain/](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/)
- [src/core/workflows/](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/)

This layer should determine when workflow progression pauses to invoke the capability and when normal deterministic workflow progression resumes afterward.

### Slash-Command Integration Layer

Owns the slash-command trigger side of the procedure.

Best-fit existing areas:

- [src/core/slash-commands/](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/)
- the existing workflow/slash resolution seam described in [docs/use-skill-workflow-resolution-execution-spec.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/use-skill-workflow-resolution-execution-spec.md)

This layer should determine where command-entry flow pauses to invoke the capability and how normal slash-command/workflow activation resumes afterward.

### Persistence Layer

Owns only the minimum persisted workflow-form session state needed for reload and resume.

Best-fit existing areas:

- [src/core/task/TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)
- [src/core/context/context-tracking/ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts)
- [src/core/storage/disk.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/storage/disk.ts)

### Webview/UI Layer

Owns only presentation and interaction rendering.

Best-fit existing areas:

- [webview-ui/src/components/chat/](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/)
- [webview-ui/src/components/ui/dialog.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/ui/dialog.tsx)
- [webview-ui/src/components/common/AlertDialog.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/common/AlertDialog.tsx)
- [webview-ui/src/components/ui/button.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/ui/button.tsx)
- [webview-ui/src/components/ui/select.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/ui/select.tsx)
- [webview-ui/src/components/chat/OptionsButtons.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/OptionsButtons.tsx)

### Dictionary And Tool-Help Content Layer

Owns the read-only system dictionary and human-friendly tool dictionary content.

This layer should remain separate from:

- runtime orchestration logic
- UI rendering logic
- tool execution logic

Its purpose is translation and explanation, not execution.

## Pending Decisions

The following architecture decisions are still unresolved and should be worked through next:

None currently.

## Phase 1 Workflow/Source Restructuring Decision

Phase 1 supports only one deterministic form-driven step in one workflow:

- `code-review.md`
- Step 3

For this first use case, the required workflow-source update is intentionally narrow.

### Decision

The Step 3 source details in `code-review.md` should be updated so that:

- the step's `## ...` heading/description explicitly indicates that it is a system-owned step
- the step body is rewritten as fallback instructions for the AI agent
- those fallback instructions exist because Step 3 details should only be sent to the AI if the form-based procedure fails

### Rationale

- In Phase 1, Step 3 is no longer primarily an AI-executed step.
- The normal path is deterministic human-assisted resolution through the new form-based capability.
- The AI should see Step 3 instructions only when the deterministic path fails and the system needs to fall back to agent execution.
- Making that ownership explicit in the workflow source reduces ambiguity and keeps the workflow aligned with the actual runtime behavior.

### Implications

- `code-review.md` Step 3 becomes the reference example for how a workflow step is authored when the primary execution path is system-owned and the agent instructions are fallback-only.
- This restructuring should remain minimal for Phase 1 and should not expand into broader workflow-source rewrites outside the first supported use case.

## Architecture Validation

### Coherence Review

The architecture is coherent.

The document now describes one consistent system story:

- the feature is an integrated procedure that flows through existing systems
- trigger systems remain authoritative for their own lifecycle responsibilities
- the new workflow-form capability is inserted as a pause-and-resume stage rather than as a replacement subsystem
- deterministic workflow progression remains authoritative for progression before and after supported form-driven steps
- tool execution remains authoritative for invoked tool behavior and validation

No critical contradictions were identified between the recorded decisions.

### Requirement Coverage Review

At the architecture level, the document covers the major needs identified in discovery:

- support for both deterministic workflow progression triggers and slash-command triggers
- dedicated workflow-form runtime contracts
- dedicated structured submission transport
- alignment with existing tool architecture
- persistence/resume through existing task persistence seams
- workflow-source shaping as a prerequisite for supported use cases
- explicit blast-radius acknowledgment across workflow source, progression, trigger semantics, contracts, persistence, UI, and tool/runtime integration

### Existing-Architecture Alignment Review

The architecture remains aligned with the repo's existing system shape.

It explicitly prefers:

- existing tool architecture over a new standalone capability subsystem
- existing workflow progression seams over a second workflow engine
- existing task persistence seams over a new persistence subsystem
- existing chat/webview primitives over a bespoke UI stack

This is the correct alignment for the current product.

### Issue Classification

#### Critical

- None identified

#### Important

- Implementation must continue to respect the architecture/requirements boundary. This document now stays on the architecture side, but later artifacts should carry the concrete behavioral requirements and execution detail rather than pushing that detail back into this document.
- Implementation must continue to treat trigger behavior as additive and pausable rather than substitutive. If a future implementation path causes slash-command activation or workflow progression to be swallowed or replaced, that would violate the architecture.

#### Minor

- The document previously carried an in-progress "pending next steps" list. Now that validation is present, those items are complete and the section should be retired to avoid making the document feel unfinished.

### Readiness

This architecture is ready to hand off to a requirements document.
