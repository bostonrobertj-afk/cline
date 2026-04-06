---
stepsCompleted: [1]
inputDocuments:
  - _bmad-output/planning-artifacts/architecture.md
  - Codex Procedures/xstate-best-practices/xstate-reference.md
  - _bmad-output/project-context.md
workflowType: 'epics'
project_name: 'DungeoniQ-Campaign'
user_name: 'Rob'
date: '2026-03-19T01:42:20-05:00'
status: 'complete'
epic_source: 'brownfield architecture artifact'
---

# DungeoniQ-Campaign - Epic Breakdown

## Overview

This document breaks the approved brownfield architecture for the multi-turn entity creation workflow into implementation epics and stories. It is intentionally scoped to backend workflow orchestration and explicitly defers UI/session rendering adaptation to a later epic.

## Requirements Inventory

### Functional Requirements

- **FR-1** Root must persist durable create-flow truth including `createPlan`, authoritative `createDrafts`, `responseSpec`, `feedback`, `status`, lifecycle phase, and revision metadata.
- **FR-2** Active create flows must use **flow-first ingress routing**, bypassing the full deterministic root classification path except for a minimal interruption gate.
- **FR-3** Response orchestration must supervise a dedicated `createDialogueMachine(flowId)` child for active create workflows.
- **FR-4** The create-dialogue child must receive a read-only `campaignEntityIndex` as dialogue context.
- **FR-5** The create-dialogue child must be able to request deeper entity retrieval through root, with root leveraging `lookupmachine`.
- **FR-6** Root must persist the exact draft baseline sent to response-side dialogue and reject illegal or stale mutations before forwarding proposals to create.
- **FR-7** `createmachine` must remain the only authority allowed to approve values, mark entries/sections `addressed=true`, and persist entities.
- **FR-8** Review, save confirmation, reopening edits, and persistence must be modeled as explicit lifecycle phases under the same `flowId`.
- **FR-9** Active create dialogue actors must be rehydratable from root-owned workflow state after restart.
- **FR-10** Root must coordinate terminal shutdown for create-flow actors on completion, cancellation, blocking, or timeout.

### NonFunctional Requirements

- **NFR-1** The design must remain aligned with XState v5 / Stately actor best practices: explicit actor boundaries, typed contracts, and parent-owned orchestration.
- **NFR-2** Durable truth must live in root/workflow record, not in child-local actor memory.
- **NFR-3** Child-local memory must be disposable and reconstructible from persisted workflow state.
- **NFR-4** Backend contract design must not be constrained by the current incomplete UI/session rendering surfaces.
- **NFR-5** Lookup access from dialogue must remain root-mediated and must not bypass policy or persistence boundaries.
- **NFR-6** The implementation should preserve the current subsystem decomposition rather than collapsing root/create/response/lookup into one monolith.

### Additional Requirements

- Replace per-turn create-flow identity allocation with stable `flowId` reuse on resume.
- Normalize response template / builder payload mismatches before relying on them for create dialogue.
- Preserve `lookupmachine` as the retrieval specialist rather than embedding deep retrieval directly in response dialogue.
- Treat UI/session integration as a downstream epic after backend workflow behavior stabilizes.
- Replace or isolate direct OpenAI invocation in response-layer behavior so the future implementation can align with the repo’s preferred gated/shared path.

### UX Design Requirements

- None in scope for this backend planning artifact.
- UI rendering of draft cards, workflow review surfaces, and response artifacts is explicitly deferred.

### FR Coverage Map

| Requirement | Covered By |
| --- | --- |
| FR-1 | Epic 1, Stories 1.1-1.3 |
| FR-2 | Epic 2, Story 2.2 |
| FR-3 | Epic 2, Story 2.1 |
| FR-4 | Epic 2, Story 2.3 |
| FR-5 | Epic 3, Story 3.1 |
| FR-6 | Epic 1, Story 1.3; Epic 3, Story 3.2 |
| FR-7 | Epic 3, Stories 3.2-3.3 |
| FR-8 | Epic 4, Story 4.1 |
| FR-9 | Epic 4, Story 4.2 |
| FR-10 | Epic 4, Story 4.3 |

## Epic List

### Epic List
<!-- Repeat this block for each epic -->
### Epic #: Epic_Name

#### Objective
As a Product Owner
I want
So that

#### Description


#### Success Measures


#### Scope


#### Scope Boundary

