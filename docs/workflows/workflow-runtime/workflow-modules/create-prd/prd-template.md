---
inputDocuments:
  - _bmad-output/implementation-artifacts/project-completion-assessment.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - docs/project-overview.md
  - docs/implemented-specs/14-known-gaps-bugs-conflicts-and-drift-current.md
  - docs/implemented-specs/16-actionable-remediation-direction-not-yet-implemented.md
project_type: 'web application'
architecture_type: 'monolithic Next.js application with XState workflow orchestration'
primary_users:
  - platform engineers
  - workflow/runtime maintainers
  - downstream chat/UI integrators
domain_context: 'tabletop storytelling campaign platform with chat-assisted entity creation'
vision_status: 'confirmed'
executive_summary_status: 'confirmed'
success_criteria_status: 'confirmed'
journeys_status: 'confirmed'

What type of product is this? (web app, API, mobile, etc.)
What domain does it operate in? (healthcare, fintech, e-commerce, etc.)
What's the project context? (greenfield new product vs brownfield existing system)
How complex is this domain? (low, medium, high)
---

# Product Background

## Product Type

## Vertical

# Classification

# Scope

## Primary Objective

## Project Discovery


### Confirmed Classification

- This PRD is a brownfield internal product/platform document.
- Its primary outcome is backend workflow completion, not UI-first polish.
- It is scoped to completing the multi-turn entity creation workflow inside the chat-v2 architecture, including the shared response-platform capabilities that workflow depends on.
- It treats UI/session adaptation as downstream work unless required to validate the backend contract.

### Rationale

The loaded architecture, epic, and assessment artifacts all point to the same conclusion: durable root orchestration, flow identity, revision baselines, authority enforcement, restart hydration, and flow-first routing are substantially in place, while the live create dialogue/runtime stack and explicit save-confirmation execution path are still incomplete. As this PRD has been refined, it has also become clear that some missing capabilities are foundational response-platform concerns that were previously expressed as create-specific runtime pieces.

### Working Assumptions

- The main value of this PRD is to close the remaining runtime behavior gaps in `src/stately-studio/`.
- The primary stakeholders are internal maintainers extending the chat-v2 workflow system.
- UI representation and broader end-user polish remain secondary unless they block backend completion.

### Scope Structure

- This PRD covers two tightly related work categories.
- The first category is foundational response-platform completion: shared response-stack orchestration, prompt assembly, LLM invocation, tool runtime behavior, root-mediated tool dispatch, and response continuity handling.
- The second category is entity-create workflow completion: create-specific proposal submission, lookup/tool usage during create flows, create lifecycle handling, review/reopen, save confirmation, and persistence progression.
- Foundational capabilities must be implemented as shared backend infrastructure rather than as create-specific runtime artifacts.
- Create-specific behavior must be layered on top of those shared capabilities.

## Vision

This PRD defines the work required to complete DungeoniQ's backend multi-turn entity creation workflow and the shared response-platform capabilities that workflow depends on so the system achieves the Architectural Goals already documented in `_bmad-output/planning-artifacts/architecture.md` within the approved backend-workflow scope.

The intended outcome is a durable, flow-keyed, rehydratable workflow in which root owns durable truth, `createmachine` owns deterministic approval and persistence, and create dialogue behavior is delivered through a real shared response stack rather than through a hydration stub or create-specific LLM runtime artifact.

Completing this workflow will turn the current partial implementation into a coherent backend capability that can reliably support workflow-scoped multi-turn create conversations, authority-safe draft mutation, lookup-assisted reasoning, restart continuity, and explicit review/save progression under one stable flow.

## Executive Summary

DungeoniQ-Campaign is a tabletop storytelling platform whose chat-v2 backend is intended to support durable, multi-turn, workflow-driven entity creation. The architecture, epic, and runtime assessment artifacts show that the system has already implemented much of the orchestration foundation, including root-owned workflow state, stable flow identity, revision baselines, authority checks, flow-first ingress, lookup brokering, and restart hydration. However, the core backend capability remains incomplete because both the shared response-platform layer and the create-specific workflow layer are unfinished: the current `create-dialogue` artifact is still a supervision stub, the intended shared response runtime is absent, and the save-confirmation execution seam is not fully realized.

This PRD focuses on completing that backend workflow and the shared response-platform capabilities required to support it so the implemented system matches the approved architectural goals within the existing brownfield scope. The target outcome is a reliable backend workflow in which workflow-scoped multi-turn create conversations continue under one stable `flowId`, propose mutations safely through root, leverage lookup context without violating authority boundaries, survive restart, and move cleanly through review and save phases, while doing so through shared response-stack infrastructure instead of create-specific drift. Completing that capability will make the backend architecture operationally coherent and create a stable foundation for later UI and session integration work and for future workflow types that should reuse the same response platform.

## Success Criteria

### Maintainer Success

- Engineers can trace one create flow end to end through root, response, create, and lookup without relying on undocumented actor-local behavior.
- `create-dialogue` behavior is delivered through the shared response stack, processes turns, emits proposals, handles lookup results, and continues under one stable `flowId`.

### Product and Business Success

- The backend implementation satisfies the Architectural Goals in `_bmad-output/planning-artifacts/architecture.md` within the approved backend-workflow scope.
- Downstream UI and integration work is no longer blocked by missing backend behavior or unclear workflow contracts.
- The workflow is no longer accurately described as "partially implemented" in runtime terms.
- Foundational response-platform capabilities that were previously expressed as create-specific runtime artifacts are implemented as shared infrastructure.

### Technical Success

- Review, reopen, save-pending, persistence, restart hydration, and terminal shutdown all work under one stable flow with authority boundaries preserved.
- The save-confirmation seam is fully wired end to end.
- `create-dialogue` behavior is no longer a supervision or hydration stub and no longer depends on a bespoke create-specific LLM runtime artifact.
- `npm run check` passes without workflow-contract type errors.

### Delivery Success

- Automated tests cover live dialogue proposal flow, root authority rejection, lookup round-trips, restart continuity, and save confirmation.
- The completed implementation is supported by stable contracts and reproducible verification rather than relying on manual interpretation of runtime behavior.

### Scope Success

- This PRD completes backend workflow behavior only.
- It does not expand into unrelated UI redesign or broader platform refactors unless those changes are strictly required to satisfy the backend architectural goals.

## Workflow Journeys

### Journey 1: Maintainer Traces a Create Flow End to End

A maintainer inspects one active entity-creation workflow and can follow it through root orchestration, response supervision, create adjudication, lookup mediation, review, and persistence without guessing which actor owns truth.

Requires:

- durable workflow record
- explicit actor boundaries
- stable flow identity
- clear event contracts
- testable lifecycle transitions

### Journey 2: Active Create Dialogue Continues Across Turns in One LLM Conversation Thread

A user begins creating an entity and replies over multiple turns. During the active create flow, each inbound user message is routed back into the shared response stack for the correct create workflow under the same stable `flowId`, and the backend preserves a single ongoing conversation thread with the LLM. It is not acceptable for each turn to be handled as an isolated one-shot LLM engagement without continuity.

Requires:

- flow-first ingress routing to the active create workflow
- routing of each inbound active-create message back to the correct workflow-scoped dialogue path
- preserved conversation-thread continuity across turns
- root-owned draft baseline and authoritative state
- dialogue proposal and create adjudication loop

### Journey 3: Dialogue Requests Deeper Entity Context Safely

During create dialogue, the system needs more campaign context to resolve a relation or answer a user question. The dialogue worker requests lookup through root and resumes with normalized results without bypassing policy boundaries.

Requires:

- root-mediated lookup requests
- `campaignEntityIndex` as read-only dialogue context
- normalized lookup result delivery
- resumed dialogue state after lookup

### Journey 4: Review Reopens Safely and Returns to Review

A semantically complete draft reaches review, the user requests edits, and the workflow reopens under the same flow, preserves authority boundaries, and returns cleanly to review-ready.

Requires:

- explicit `review_ready` phase
- reopen path under the same `flowId`
- proposal and adjudication loop for reopened edits
- revision tracking across review transitions

### Journey 5: Explicit Save Confirmation Persists Cleanly

A reviewed draft is confirmed for save, enters `save_pending`, persists exactly once, and shuts down live flow actors cleanly.

Requires:

- fully wired save-confirmation seam
- persistence handoff from review to save
- idempotent completion behavior
- terminal shutdown of flow-bound actors

### Journey 6: Restart Preserves Workflow Continuity

The process restarts mid-flow and the active workflow rehydrates from durable root state rather than child-local memory, while preserving the ability to continue the same create flow coherently.

Requires:

- persisted create workflow artifacts
- dialogue rehydration from root-owned state
- baseline and revision preservation
- restart-safe active flow selection

### Journey Requirements Summary

- Active create flows must remain tied to one continuous LLM conversation thread.
- Root must remain the durable owner of workflow truth and routing authority.
- `createmachine` must remain the sole authority for approval semantics and persistence.
- Lookup must remain root-mediated and must not bypass policy boundaries.
- Review, reopen, save, restart, and shutdown must all operate under one stable flow lifecycle.

## Confirmed LLM Threading Direction

- DungeoniQ will use the OpenAI Responses API for create-dialogue continuity.
- Active create workflows will persist and reuse the latest valid `previous_response_id` for turn-to-turn LLM continuity.
- OpenAI Conversations capability is explicitly out of scope for this PRD.
- LLM conversation continuity must remain workflow-scoped, short-lived, and cost-aware rather than open-ended.
- Each create flow must own its own LLM thread and that thread must terminate or rotate when the workflow completes, is cancelled, times out, or crosses defined continuity or cost thresholds.
- The system must not encourage long-running general chat threads for entity creation.

## Confirmed Reuse Direction From Cline

- DungeoniQ should reuse proven low-level OpenAI Responses mechanics from the Cline repo where practical.
- Reuse is encouraged at the adapter and transport layer, not at the task-loop or app-runtime layer.

### Preferred Reuse Candidates

- Responses chaining logic for locating and reusing the latest valid `previous_response_id`
- chain-break handling when a stored response anchor is no longer safe to continue
- full-history fallback behavior when response chaining cannot be used
- Responses API stream parsing and event normalization
- early `response_id` capture for durable turn continuity
- usage and cost extraction from Responses API completions

### Explicit Non-Reuse Targets

- Cline task-loop orchestration
- Cline focus-chain or prompt-injection runtime
- Cline conversation storage model as the authoritative app contract
- Cline user-facing model selection patterns
- Cline provider-matrix abstractions that are specific to its multi-provider app design

### Reuse Constraint

Any reused Cline code must be adapted behind DungeoniQ-owned interfaces so the DungeoniQ XState workflow architecture remains the primary orchestrator and source of backend workflow truth.

## Confirmed Model Selection Direction

- DungeoniQ users will not manually select models for this workflow.
- The application must own model choice.
- The current completion effort does not need to deliver the full automatic model-routing capability.
- This effort must, however, include a model-selection seam that allows future automatic routing to plug in without redesigning the create workflow.

### Required Model Routing Seam

The backend workflow must depend on an app-owned model resolution interface rather than directly hardcoding a permanent model choice into the workflow contract.

At minimum, the completed system must support a seam conceptually equivalent to:

`resolveModelForTask(taskType, workflowType, phase, costPolicy, continuityContext)`

### Interim Behavior

- The seam may initially resolve to a fixed configured model or a simple placeholder policy.
- The chosen model for an active create-flow thread must be persisted so turn-to-turn continuity remains stable.
- The workflow must not be designed in a way that assumes permanent user-selected models or requires UI-selected model state.

### Future Compatibility Constraint

The completed create workflow must be able to accept a future automatic model router that selects the best model for a task based on application policy, cost, and workflow context without requiring a redesign of the root/create/response contracts.

## Domain-Specific Requirements

### Tabletop Campaign Entity Domain

- The workflow must operate on DungeoniQ's campaign-entity domain model, including core identity, fields, relations, facts, stat blocks, progression, and canon state.
- The workflow must preserve entity-type-specific structure from the create plan and must not allow dialogue-side mutation to invent fields or relations outside the active plan.
- Relation completion must account for existing campaign entities as distinct from newly created draft entities.

### Workflow Authority Domain

- Durable workflow truth must remain in root-owned workflow state, not in transient LLM memory or actor-local state.
- `createmachine` must remain the only authority allowed to mark values approved, mark entries addressed, and persist records.
- Response-side dialogue may propose draft changes, but all proposals must pass root authority checks and create adjudication before becoming authoritative.

### LLM Continuity Domain

- Each active create workflow must map to one short-lived, workflow-scoped LLM conversation thread.
- Every inbound message during an active create workflow must route back to the correct workflow and continue the same LLM thread.
- The system must use OpenAI Responses continuity via persisted `previous_response_id`.
- OpenAI Conversations is out of scope for this workflow.

### Cost and Lifecycle Domain

- LLM thread continuity must be intentionally bounded to workflow scope to prevent runaway cost from long-lived conversations.
- Workflow completion, cancellation, timeout, or explicit reset must terminate or rotate the associated LLM thread.
- The workflow must support fallback behavior when a stored response anchor is no longer reusable.

### Integration and Future Routing Domain

- The implementation may reuse proven OpenAI Responses adapter mechanics from Cline, but not Cline's task runtime or user-driven model-selection approach.
- The completed workflow must include an app-owned model-selection seam so future automatic model routing can be added without redesigning the workflow contract.

## Tooling Requirements

### Current Runtime Assessment

- The current create-dialogue lookup contract is narrower than the intended tool surface.
- The implemented lookup request protocol currently supports only `summary`, `field`, `relation`, and `full_record` lookup modes.
- The current lookup machine is single-entity-oriented and does not yet expose collection queries, arbitrary filtered campaign queries, lore retrieval as a create-dialogue tool, or approval-gated internet lookup.
- The app already contains reusable lore retrieval and lore excerpt infrastructure, but that infrastructure is not yet documented as a first-class create-dialogue tool contract.
- The explicit proposal submission event seam already exists between create dialogue, root, and `createmachine`, but the live create-dialogue runtime does not yet operationalize that seam through a tool-driven conversational path.
- The current `create-dialogue` runtime remains a supervision stub, so no live tool-using conversational loop is yet in place.

### Required Tool-Use Model

- The completed create-dialogue runtime must support LLM tool use as a first-class capability, not just plain text continuation.
- Tool calls and tool results must preserve continuity within the same workflow-scoped LLM thread.
- Tool outputs that affect draft state must still flow back through root authority checks and `createmachine` adjudication before becoming authoritative.
- Tool use must remain policy-bounded by the workflow architecture. The dialogue worker may invoke only approved tools and must not gain direct persistence authority.

### Required Campaign Data Tools

- The workflow must expose a fast entity-index tool backed by the prebuilt `campaignEntityIndex`.
- That index tool must support retrieving a single indexed entity by `id` or title.
- That index tool must support retrieving all indexed entities for a requested `entityType`.
- The workflow must expose a full-entity-record tool that retrieves one complete campaign entity record by `id`.
- The full-entity-record tool must surface the richer entity payload needed by create dialogue, including fields, relations, facts, stat block, progression, and progression levels.

### Required Structured Campaign Query Tools

- The workflow must expose one or more structured query tools that support richer campaign lookups beyond single-entity retrieval.
- Those tools must support relation-based collection queries, such as retrieving all entities of an `entityType` that are related to a specified entity.
- Those tools must support session-scoped mutation queries, such as retrieving the set of entity ids modified during the current session when that information exists in authoritative app state.
- Those tools must support targeted stat-block-oriented queries, such as retrieving entities or stat blocks that match a specified stat-block field value.
- The final implementation may realize these capabilities as one generalized structured query tool or as multiple narrower tools, but the functional coverage is required either way.

### Required Lore Retrieval Tools

- The workflow must expose lore retrieval as a first-class create-dialogue tool capability.
- The workflow must support semantic or targeted retrieval of relevant campaign lore chunks so the AI can gather source context from uploaded campaign documents.
- The workflow must support targeted raw-text excerpt retrieval for a specific canonical campaign lore chunk reference so the AI can inspect exact source text when needed.
- Lore retrieval for create dialogue must remain campaign-scoped, visibility-aware, and authority-safe.

### Required Local Document Search Tools

- The workflow must expose a read-only local document search tool for campaign-owned documents that are part of the local campaign context.
- That tool must support searching campaign canon documents, session documents, and future character-sheet document classes when those document classes exist in the product.
- The local document search tool must not grant any document write or edit authority to create dialogue.
- The local document search tool must return enough document identity and retrieval metadata to support follow-up read-only retrieval by other approved tools when needed.

### Required Internet Access Tools

- Internet access must be modeled as two separate tools.
- The first tool must be an app-owned permission-request tool, conceptually `request_web_access`.
- `request_web_access` must surface an explicit UI approval ask to the user and must not itself perform any internet lookup.
- If and only if the user approves, the next request may expose a second tool that performs actual web search.
- Actual web search may use OpenAI's server-side `web_search` capability, but that tool exposure must be temporary and request-scoped.
- Approved web access must be single-use. If the follow-up request does not consume the exposed web-search capability, the permission expires and must be requested again.
- Denied web access must not break the conversation thread.

### Tooling Architecture Constraints

- Lookup should be treated as one tool class, but the create-dialogue design must not assume lookup is the only future tool available.
- Tool availability must be app-controlled on each request.
- Server-side tool execution may be used where appropriate, but only when the approval and policy model remains under DungeoniQ control.
- The completed tool design must preserve the ability to return tool results into the same Responses thread using `previous_response_id` continuity.

## Innovation Considerations

This project includes meaningful implementation novelty and warrants an explicit innovation section. The intended backend workflow is differentiated by combining durable XState workflow orchestration, workflow-scoped LLM thread continuity, authority-bounded tool use, approval-gated internet access, and a future-capable automatic model-routing seam in one coherent create-flow architecture.

The primary innovation risk is not whether these capabilities can exist independently, but whether they can operate together without collapsing into stateless one-shot turns, actor-local truth, or ad hoc tool execution. This PRD therefore treats continuity, authority, tool mediation, and request-scoped capability exposure as core validation concerns rather than incidental implementation details.

## Project-Type Requirements

### Brownfield Internal Platform Requirements

- The implementation must preserve the existing root/create/response actor architecture rather than replacing it with a new orchestration model.
- New functionality must integrate into the current brownfield chat-v2 runtime with minimal disruption to existing workflow contracts.
- Completion work must favor extension of verified existing seams such as workflow registry, flow-first routing, restart hydration, and lookup delivery over parallel replacement paths.
- The project must resolve current contract drift and runtime incompleteness without introducing a second source of workflow truth.

### Backend Workflow Platform Requirements

- Root must remain the durable orchestration boundary for workflow routing, state capture, restart hydration, and tool mediation.
- Response-side actors may handle conversational behavior, but they must remain subordinate to workflow authority boundaries enforced by root and `createmachine`.
- Tool use must be mediated through app-owned contracts so approval policy, logging, and continuity rules remain enforceable.
- LLM continuity, tool invocation, and lookup delivery must be designed as backend workflow behavior, not UI-only behavior.
- Foundational response-platform capabilities required by create workflows must be implemented as shared response-stack infrastructure rather than as create-specific machines or create-specific copies of provider/runtime logic.

### Integration Requirements

- The implementation must remain compatible with OpenAI Responses-based continuity and adapted Cline-derived adapter mechanics.
- The project must include seams for future model routing and future tool expansion without requiring a redesign of workflow ownership boundaries.
- Existing lore retrieval, document retrieval, and entity lookup infrastructure should be reused where valid, but must be normalized behind create-dialogue-safe tool contracts.

## Response Architecture Direction

This section records the current target architecture for the response stack so refinement work can stay anchored to one shared model instead of drifting between turns.

### Core Direction

- `responsemachine` should be the shared response orchestration machine.
- `responsemachine` should not itself be the machine that assembles full system-generated prompting.
- `responsemachine` should not itself be the machine that packages final `ResponseDraft` payloads for delivery.
- The current `create-dialogue-machine.ts` pattern should be treated as drift or technical debt rather than as the target architecture for workflow-specific LLM behavior.

### Target Response Stack

- `systemPromptMachine`
  - builds the full system-generated prompt envelope for a response turn
  - assembles system instructions, tool definitions, structured input, output-shape expectations, and response-mode constraints
  - owns the prompt-building concern for both deterministic-core and more open-ended LLM-backed response turns

- `dialogueMachine`
  - receives the prompt envelope and the response continuity handle for the active prompt
  - owns the last-mile LLM execution path
  - applies `previous_response_id` continuity using the workflow's persisted `lastResponseId`
  - invokes the LLM through the shared OpenAI Responses runtime
  - receives the raw LLM response back
  - does not build final `ResponseDraft` payloads

- `llmResponseMachine`
  - interprets LLM outputs after they return from `dialogueMachine`
  - separates assistant-message content, tool calls, and structured workflow actions
  - emits local tool-intent events back to `responsemachine` or routes user-facing content toward final packaging

- `toolRuntimeMachine`
  - owns approval gating for tools that require explicit user permission
  - normalizes outbound tool payloads before `responsemachine` dispatches root-facing tool request events
  - normalizes inbound tool results that return from root before resumed turns are rebuilt
  - tracks pending tool turns and correlates returned results to the originating tool request
  - emits local events back to `responsemachine`; `responsemachine` is the machine that dispatches root-facing tool events to `chatsendrootmachinev2`
  - does not directly execute authoritative workflow or domain tools

- `responseDraftMachine`
  - packages user-facing assistant content into final `ResponseDraft` artifacts
  - is the only response-side machine that should emit final `ResponseDraft` payloads back toward root and session delivery

### Deterministic Response Clarification

- Deterministic responses are not equivalent to "no LLM."
- In the intended architecture, deterministic responses still flow through the shared response stack.
- Deterministic mode means the system controls the deterministic core content and constraints of the response, while the LLM may still participate in approved, bounded ways such as flavoring, wrapping, or other constrained output behavior defined by the response contract.
- System-error and pure notification paths may remain fully non-LLM, but those are exceptions rather than the default interpretation of deterministic response handling.

### Responsibility Boundaries

- Root remains the owner of durable workflow truth, workflow routing, and authoritative workflow state transitions.
- `responsemachine` remains the parent orchestrator for response-turn execution.
- Prompt assembly must be separated from LLM execution.
- LLM execution must be separated from post-response interpretation.
- Post-response interpretation must be separated from final `ResponseDraft` packaging.
- Root-mediated tool authority must be preserved; response-side child machines may not bypass root to execute authoritative workflow or domain tools directly.
- `toolRuntimeMachine` handles approval gating, outbound tool-payload normalization, inbound tool-result normalization, and tool-turn correlation, but `responsemachine` is responsible for dispatching the actual root-facing tool events.
- Tool results that return from root must flow back through `toolRuntimeMachine`, then through `systemPromptMachine`, and then through `dialogueMachine` for the resumed LLM turn.
- Workflow-specific behavior should be expressed through configuration, tool availability, prompt inputs, and workflow-event mappings rather than by introducing a bespoke LLM machine for each workflow.
- DungeoniQ should use the existing `lastResponseId` naming for persisted OpenAI response continuity unless a broader continuity object is formally introduced later.

### Current Drift Relative to Target

- The current `responsemachine` is too thin and has been reduced to supervision and routing concerns that do not represent the full intended response runtime.
- The current `response-render-machine` is narrower than the desired shared response architecture because it focuses on response preparation and rendering rather than the full shared prompt-plus-dialogue-plus-tool loop.
- The current `create-dialogue-machine.ts` is a workflow-specific stub and should not be treated as the architectural model for future workflows.
- The current codebase does not yet implement the shared `systemPromptMachine`, `dialogueMachine`, `llmResponseMachine`, `toolRuntimeMachine`, and `responseDraftMachine` layering described here.

## Scope Definition

### In Scope

- Completing the shared response-platform capabilities required for multi-turn workflow dialogue, including prompt assembly, LLM invocation, tool-runtime handling, root-mediated tool dispatch, and response continuity support.
- Completing the live create-dialogue behavior so it operates through that shared response stack rather than through a hydration stub or create-specific LLM runtime artifact.
- Preserving one continuous workflow-scoped LLM thread across active create turns through persisted `previous_response_id` continuity.
- Completing the create-flow tool surface required by this workflow, including entity-index lookup, full entity record lookup, structured campaign queries, lore retrieval, read-only local document search, and approval-gated internet access.
- Completing backend support for review, reopen, save confirmation, save-pending persistence flow, restart hydration, and terminal actor shutdown under one stable `flowId`.
- Adding the app-owned model-resolution seam or stub required for future automatic model routing.
- Resolving workflow contract drift, including type and state-shape inconsistencies that currently block backend completion verification.
- Adding or updating automated backend verification needed to prove the workflow is complete rather than scaffolded.

### Out of Scope

- All UI and UX work is out of scope for this PRD.
- This PRD may define backend contracts that a UI surface would use, but it does not include redesigning, expanding, or otherwise owning those user-facing surfaces.
- Full implementation of the future automatic model-routing system is out of scope.
- OpenAI Conversations adoption is out of scope.
- Expansion of unrelated chat-v2 workflows outside entity creation is out of scope.
- General-purpose long-running chat continuity outside workflow-scoped create sessions is out of scope.

### Primary Scope Risks

- Over-generalizing the tool system before the create workflow itself is operationally complete.
- Replacing verified existing seams instead of extending them, which would increase migration and regression risk.
- Allowing backend contract needs to expand into UI or UX implementation work that this PRD does not own.

### Scope Mitigation

- Favor extension of existing workflow seams over parallel replacement paths.
- Treat create-flow completion as the priority while implementing foundational response-platform capabilities only to the extent required to make that workflow operational and correctly layered.
- Keep UI concerns limited to backend contract definition only when such contracts are necessary for approval gating or workflow interaction.

## Roadmap and Dependency Model

### Delivery Structure

- This work should be planned as a sequenced dependency chain, not as one flat feature delivery.
- The roadmap has two intertwined tracks:
  - foundational response-platform completion
  - create-workflow completion on top of that platform
- Create-specific delivery should not harden around temporary create-only runtime artifacts that the foundational platform work is intended to replace.

### Wave 1: Shared Response-Platform Foundation

Deliverables:

- shared `responsemachine` orchestration model
- `systemPromptMachine`
- `dialogueMachine`
- `llmResponseMachine`
- `toolRuntimeMachine`
- `responseDraftMachine`
- persisted response continuity handling using `lastResponseId`
- parent-managed root dispatch for tool-intent events
- model-resolution seam stub for response turns

Depends on existing components:

- `src/stately-studio/responsemachine.ts`
- `src/stately-studio/response-render-machine.ts`
- `src/stately-studio/chatsendrootmachinev2.ts`
- `src/stately-studio/actors/shared/workflow-registry.ts`
- `src/stately-studio/actors/shared/protocols/machine-setup.ts`
- `src/stately-studio/actors/shared/workflow-dispatch.ts`

Depends on unbuilt or newly required components:

- shared response-stack machine decomposition
- OpenAI Responses request-building path for resumed dialogue turns
- root-facing tool-intent dispatch path from `responsemachine`
- inbound tool-result return path through `toolRuntimeMachine -> systemPromptMachine -> dialogueMachine`

Unlocks:

- tool-using multi-turn LLM behavior without create-specific runtime drift
- consistent provider/runtime handling for future workflow types
- create-specific dialogue behavior implemented through shared infrastructure

### Wave 2: Create Workflow Runtime Adaptation

Deliverables:

- live create-dialogue behavior through the shared response stack
- proposal-submission tool path
- create-specific prompt/input contracts
- create-specific tool exposure and tool-result handling
- flow-first multi-turn create continuation

Depends on existing components:

- `src/stately-studio/createmachine.ts`
- `src/stately-studio/actors/entity-creation-engine.ts`
- existing `CREATE_DIALOGUE.PROPOSAL_SUBMITTED` seam
- `src/stately-studio/chatsendrootmachinev2.ts` flow-first ingress behavior
- `campaignEntityIndex`

Depends on unbuilt or newly required components:

- create dialogue configuration layered onto the shared response stack
- proposal-submission tool implementation that turns user intent into structured draft proposals
- create-specific response-stack routing for active create turns

Unlocks:

- real multi-turn create conversation continuity
- draft proposal generation through tool calls rather than hydration-only scaffolding
- create-specific behavior implemented on top of the shared response platform

### Wave 3: Tool Surface Expansion and Root-Mediated Tool Runtime

Deliverables:

- entity-index lookup tool
- full entity record lookup tool
- structured campaign query tools
- lore retrieval tools
- read-only local document search tool
- approval-gated internet access tools

Depends on existing components:

- `campaignEntityIndex`
- `src/stately-studio/lookupmachine.ts`
- existing single-entity lookup contracts
- existing lore retrieval and excerpt infrastructure
- root event handling in `src/stately-studio/chatsendrootmachinev2.ts`

Depends on unbuilt or newly required components:

- broader tool schemas beyond the current single-entity lookup shape
- tool payload normalization in `toolRuntimeMachine`
- approval-result handling as inbound tool results
- any missing backend query or document-search implementations required by the approved tool surface

Unlocks:

- relation-aware and source-aware create dialogue
- user-approved web access without breaking conversation continuity
- future workflow reuse of the same tool runtime pattern

### Wave 4: Review, Save, Restart, and Completion Hardening

Deliverables:

- clean `review_ready` and `save_pending` behavior
- explicit save-confirmation execution path
- restart-safe create-dialogue continuation
- terminal shutdown of flow-bound actors
- typecheck and automated verification closure

Depends on existing components:

- `createmachine` review/save semantics
- `workflow-registry` persisted artifacts
- restart hydration logic in `chatsendrootmachinev2`
- current save/persistence path

Depends on unbuilt or newly required components:

- shared response-stack rehydration for active create dialogue
- finalized save-confirmation handshake through root and create
- expanded automated test coverage across continuity, tooling, and restart seams

Unlocks:

- production-safe completion of the create workflow
- reliable restart and shutdown behavior
- readiness for downstream planning into implementation stories

### Dependency Rules

- Wave 1 is the primary dependency base for Waves 2 through 4.
- Wave 2 should not be fully implemented before Wave 1 establishes the shared response runtime shape.
- Wave 3 depends partly on Wave 1 for tool-runtime behavior and partly on Wave 2 for create-specific tool usage.
- Wave 4 depends on authoritative workflow state and create semantics from Wave 2, plus continuity/tool-return behavior from Waves 1 and 3.

### Existing vs Unbuilt Dependency Summary

- Existing foundations that should be extended:
  - durable root workflow registry
  - `createmachine` adjudication and persistence authority
  - root flow-first ingress and active-flow routing
  - `campaignEntityIndex`
  - `lookupmachine`
  - existing lore retrieval and excerpt infrastructure
  - persisted `lastResponseId` continuity field

- Unbuilt or incomplete dependencies that this project must introduce:
  - shared response-stack machine decomposition
  - root-dispatched tool runtime path through `responsemachine`
  - tool-result return path through `toolRuntimeMachine -> systemPromptMachine -> dialogueMachine`
  - create-dialogue behavior delivered through the shared stack
  - broader query/document/web-access tool implementations
  - model-resolution seam wired into the live response path

## Functional Requirements

### Create-Dialogue Runtime

- The system shall implement `create-dialogue` behavior as a live multi-turn runtime capability delivered through the shared response stack rather than through a hydration-only supervision stub.
- The system shall not satisfy create-dialogue completion by introducing or preserving a bespoke create-specific LLM runtime machine where a shared response-stack capability is the correct architectural layer.
- The system shall route each inbound active-create user message back to the correct create workflow under the same stable `flowId`.
- The system shall preserve a single ongoing LLM conversation thread across active create turns for a workflow-scoped session.
- The system shall persist the latest reusable `previous_response_id` needed to continue that workflow-scoped LLM thread.
- The system shall support create-dialogue continuation after restart by rebuilding runtime state from durable workflow artifacts owned by root.
- The system shall allow create dialogue to resume coherently after tool calls, lookup deliveries, review reopen events, and save-confirmation transitions through the shared `toolRuntimeMachine -> systemPromptMachine -> dialogueMachine` return path when a resumed LLM turn is required.

### Workflow Authority and State

- The system shall keep durable workflow truth in root-owned workflow state.
- The system shall require all create-dialogue draft mutations to pass through root and `createmachine` before becoming authoritative.
- The system shall preserve revision baselines so stale or duplicate create-dialogue proposals can be detected and rejected.
- The system shall ensure `createmachine` remains the sole authority for approval semantics, addressed-state transitions, and persistence.
- The system shall maintain one coherent lifecycle for create workflows across `dialogue_collecting`, `gather_inputs`, `review_ready`, `save_pending`, completion, timeout, cancellation, and restart.

### Lookup and Tooling

- The system shall allow create dialogue to invoke approved tools without breaking LLM thread continuity.
- The system shall implement and expose the required create-dialogue tools as callable runtime capabilities in the live backend path.
- The create workflow shall not be considered complete unless those required tools exist and are operational rather than remaining placeholder contracts or planned extensions.
- The system shall implement and expose a create-dialogue proposal-submission tool as a callable runtime capability in the live backend path.
- For draft-changing turns, create dialogue shall interpret the inbound `userMessage`, derive proposed draft mutations, and submit them by invoking the proposal-submission tool.
- The proposal-submission tool invocation shall be the runtime mechanism by which user message intent becomes a structured draft proposal in the backend workflow.
- The proposal-submission tool shall submit proposed draft mutations through the existing `CREATE_DIALOGUE.PROPOSAL_SUBMITTED` workflow seam.
- The proposal-submission tool shall return adjudication-relevant feedback into the same workflow-scoped LLM thread so conversation continuity is preserved.
- Create dialogue shall not mutate authoritative drafts directly; proposal submission must occur through this tool-mediated, root-mediated path.
- The system shall implement and expose an entity-index lookup tool that can retrieve a single indexed entity by `id` or title and list indexed entities by `entityType`.
- The system shall implement and expose a full-entity-record lookup tool that retrieves one complete campaign entity record by `id`.
- The system shall implement and expose structured campaign query tooling for relation-based collection queries, session-scoped mutation queries when authoritative data exists, and targeted stat-block-oriented queries.
- The system shall implement and expose campaign-lore retrieval tools for create dialogue, including relevant chunk retrieval and targeted raw-text excerpt retrieval for a canonical campaign lore chunk reference.
- The system shall implement and expose a read-only local document search tool for campaign canon documents, session documents, and future character-sheet document classes.
- The system shall deliver lookup and tool results back into the same workflow-scoped create-dialogue thread so dialogue continuity is preserved.
- The system shall route returned tool results through `toolRuntimeMachine` for correlation and normalization before those results are passed to `systemPromptMachine` and `dialogueMachine` for any resumed LLM turn.

### Internet Access

- The system shall implement internet access as two distinct operational tools: an approval-request tool and a web-search tool.
- The system shall expose an app-owned permission-request tool before any internet search can occur.
- The system shall surface a user approval UI when the permission-request tool is invoked.
- `toolRuntimeMachine` shall own the approval-gating runtime for that flow, while the user-facing approve/deny decision itself remains a UI-mediated user action that returns to the backend as a tool result.
- The system shall expose actual web search only on a temporary approved follow-up request.
- The system shall expire approved web-search exposure after that approved request is consumed or skipped.
- The system shall preserve conversation continuity whether internet access is approved or denied.

### Model Resolution

- The system shall obtain the model for create-dialogue work through an app-owned model-resolution seam rather than through user selection.
- The system shall allow the current implementation to use a placeholder routing policy while preserving compatibility with future automatic model routing.
- The system shall persist the chosen model for an active create-flow thread when needed to preserve continuity and predictable behavior across turns.

### Save and Completion

- The system shall support explicit review and save confirmation before persistence.
- The system shall transition a reviewed draft into `save_pending` only through the approved save-confirmation path.
- The system shall persist the completed entity exactly once for a confirmed save flow.
- The system shall shut down flow-bound runtime actors cleanly after terminal completion or terminal failure.

## Non-Functional Requirements

### Reliability and Safety

- The system shall preserve authority boundaries even when the LLM proposes invalid, stale, or unauthorized draft changes.
- The system shall remain restart-safe for active create workflows.
- The system shall fail in a way that preserves durable workflow truth even if a live dialogue child or tool-execution turn fails.

### Performance and Cost

- The system shall keep create-dialogue LLM threads workflow-scoped and intentionally short-lived.
- The system shall avoid designs that encourage indefinite context accumulation across unrelated conversations.
- The system shall support continuity fallback behavior when a stored response anchor cannot be reused.

### Observability and Verification

- The system shall make create workflow routing, lookup delivery, review transitions, save transitions, and restart hydration traceable in logs or equivalent runtime diagnostics.
- The system shall be verifiable through automated tests that cover live create-dialogue continuity, tool-result continuity, lookup round-trips, approval-gated web access, restart hydration, and save confirmation.
- The system shall pass typecheck and workflow-contract validation as part of completion.
