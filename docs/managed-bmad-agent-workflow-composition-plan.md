# Managed BMAD Agent + Workflow Composition Plan

## Purpose

This document defines the next architectural step for BMAD runtime behavior:

- agent persona activation and managed workflow activation should be composable
- invoking a managed workflow by slash command should also activate the matching BMAD agent persona
- agent mode and managed workflow mode should no longer be treated as mutually exclusive top-level states

The target model is:

- Agent = persona + scope of work
- Workflow = execution structure + checklist progression + completion gating
- Slash workflow command = activate both together

Example:

- `/bmad-agent-bmm-dev` activates the `dev` persona
- `/bmad-code-review` should activate:
  - the `dev` persona
  - the `bmad-code-review` managed workflow

## Execution Status

Status: Implemented for the first composition pass.

Delivered in this pass:

- Managed workflow ownership is now derived from `agent-workflow-allowlist.json`.
- Managed workflow slash activation no longer clears compatible BMAD agent state.
- Workflow slash activation now auto-activates the owning BMAD agent persona when no BMAD agent is active.
- Incompatible agent/workflow combinations are rejected instead of silently replacing active state.
- BMAD agent activation no longer clears an active managed workflow when the workflow is compatible with that agent.
- `use_skill` managed workflow activation now preserves compatible BMAD agent state and auto-activates the owning agent when needed.
- BMAD built-in fallback allowlist metadata was realigned with the workspace allowlist.

Primary files updated:

- `src/core/task/bmad-agent-mode.ts`
- `src/core/task/index.ts`
- `src/core/task/tools/handlers/UseSkillToolHandler.ts`
- `src/core/task/bmad-agent-mode.test.ts`
- `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`

Verification note:

- Focused automated execution was not run end-to-end here because this repo still has the pre-existing mocha / TypeScript loader and generated-proto test harness issues seen in prior passes.
- The implementation was validated by direct code-path review and targeted state/ownership updates.

## Current Problem

The current implementation treats BMAD agent mode and managed workflow mode as competing controllers.

Today:

- activating a managed workflow clears the active BMAD agent
- activating a BMAD agent clears the active managed workflow

That simplifies state handling, but it is not a good domain model for BMAD. Agent and workflow are orthogonal concerns:

- the agent defines who is doing the work
- the workflow defines how that in-scope work is executed

Because the runtime collapses these into one active mode at a time, slash-invoked workflows currently discard persona context even when the workflow clearly belongs to a specific agent.

## Design Goal

Enable a composition model where:

1. a workflow slash command activates the owning/default BMAD agent persona
2. the workflow also activates the managed workflow run and checklist
3. both remain active together during execution
4. runtime enforcement still uses the allowlist to prevent unauthorized agent/workflow combinations

## Governing Source Of Truth

Use [_bmad/_config/agent-workflow-allowlist.json](/Users/robertboston/Documents/Cline%20Extension/cline/_bmad/_config/agent-workflow-allowlist.json) as the governing runtime source for workflow-to-agent pairing.

Rationale:

- it already governs agent workflow permissions
- all currently registered managed workflows have a unique BMAD agent owner in the allowlist
- using the allowlist avoids splitting ownership logic across multiple configs

Do not use [_bmad/_config/bmad-help.csv](/Users/robertboston/Documents/Cline%20Extension/cline/_bmad/_config/bmad-help.csv) as the runtime authority for ownership.

`bmad-help.csv` should remain:

- a menu/help/reference surface
- a file that can be validated against the allowlist

but not the authoritative runtime pairing source.

## Current State Summary

Current architectural assumptions:

- one `activeAgentId`
- one `activeWorkflowId`
- one `managedWorkflowRun`
- slash workflow activation clears agent mode
- slash agent activation clears managed workflow state

Current enforcement split:

- `use_skill` enforces active-agent allowlist restrictions
- slash-invoked managed workflows bypass that agent restriction path because they activate directly at the task level

This is why workflow slash commands currently replace agent state instead of running inside it.

## Desired Runtime Model

### Persistent State Model

Task state should allow both:

- active BMAD agent persona state
- active managed workflow state

at the same time.

The runtime should support this combined state shape:

- `activeAgentId`
- `activeAgentSkillName`
- `activeAgentInvokedSlashCommand`
- `managedWorkflowRun`
- `activeWorkflowId`

without clearing one when the other becomes active, unless the user explicitly exits or switches.

### Workflow Activation Semantics

When a user invokes a managed workflow slash command:

1. resolve the managed workflow definition
2. resolve the owning/default BMAD agent from the allowlist
3. activate or preserve the matching agent persona
4. activate or resume the managed workflow run
5. render the backend-owned checklist
6. build prompts that include both persona context and workflow progression context

### Agent Activation Semantics

When a user invokes a BMAD agent slash command:

1. activate the agent persona
2. do not clear an existing managed workflow if the workflow is allowed for that agent
3. if an incompatible workflow is active, either:
   - block the agent activation, or
   - switch with an explicit reset policy

The preferred default for v1 composition is:

- preserve a compatible workflow
- reject incompatible pairings

## Ownership Resolution

### Inference Rule

Because each registered managed workflow currently maps to only one BMAD agent in the allowlist, ownership can be inferred by inverting:

- `agent -> allowedSkills`

into:

- `workflow -> owningAgent`

This can be done at load time or via a generated runtime registry.

### Recommended Runtime Artifact

Add a derived runtime map such as:

```ts
type ManagedWorkflowOwnerMap = Record<string, string>
```

Example:

```json
{
  "bmad-code-review": "bmad-dev",
  "bmad-create-prd": "bmad-pm",
  "bmad-create-architecture": "bmad-architect",
  "bmad-create-story": "bmad-sm"
}
```

This map should be derived from `agent-workflow-allowlist.json`, not hand-maintained separately.

## Allowlist Behavior

### Workflow Slash Command While No Agent Is Active

If the user invokes `/bmad-code-review` with no active agent:

- resolve owner from allowlist
- activate `bmad-dev`
- activate managed workflow `bmad-code-review`

### Workflow Slash Command While Matching Agent Is Already Active

If the user invokes `/bmad-code-review` while `bmad-dev` is active:

- keep `bmad-dev` active
- activate or resume managed workflow `bmad-code-review`

### Workflow Slash Command While A Different Agent Is Active

If the user invokes `/bmad-code-review` while `bmad-sm` is active:

preferred behavior for first implementation:

- reject the activation with a clear error
- explain that the active agent is not permitted to run that workflow
- instruct the user to:
  - exit the current agent, or
  - switch to the owning/matching agent automatically via the workflow command

Optional future behavior:

- explicit auto-switch with a user-visible notice

### `use_skill` Behavior

`use_skill` should preserve the same enforcement model:

- if active agent is compatible, allow the managed workflow activation
- if not compatible, reject it

The key change is that a compatible active agent should remain active instead of being replaced.

## Prompt Composition Model

The prompt should include both layers:

### Agent Layer

- persona reminder
- scope constraints
- BMAD agent behavior framing

### Workflow Layer

- active workflow reminder
- current phase content only
- backend-owned checklist state
- instructions to use `complete_workflow_item`

Priority rule:

- the agent defines style, role, and allowed scope
- the workflow defines step progression and completion structure

These are complementary, not competing.

## Required Code Changes

### 1. Task State Must Support Composition

Primary file:

- [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)

Required changes:

- stop clearing agent state on `activate_managed_workflow`
- stop clearing workflow state on agent activation when the workflow is compatible
- only clear either side when:
  - the user explicitly exits
  - the user activates an incompatible state transition
  - the runtime intentionally resets state

Related persistence files:

- [src/core/task/TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)
- [src/core/context/context-tracking/ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts)

### 2. Add Workflow Owner Resolution

Recommended new module:

- `src/core/task/managed-workflows/ManagedWorkflowOwnership.ts`

Responsibilities:

- load `agent-workflow-allowlist.json`
- invert the allowlist
- resolve:
  - owning/default agent for a workflow
  - whether an active agent is permitted for a workflow

### 3. Update Slash Workflow Activation

Primary file:

- [src/core/slash-commands/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/index.ts)

Required changes:

- keep the current managed workflow slash detection
- preserve enough information so task-level activation can also resolve the owning agent

The main logic can still live in task-level activation rather than the parser itself.

### 4. Update Persistent Slash Command Application

Primary file:

- [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)

Required changes:

- on `activate_managed_workflow`, resolve the owning agent
- if no agent is active:
  - activate the owning agent
- if the owning agent is already active:
  - keep it active
- if a different agent is active:
  - reject or explicitly switch according to policy
- then activate/resume the workflow run
- persist both states together

### 5. Update Prompt Assembly

Primary files:

- [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- [src/core/task/bmad-agent-mode.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/bmad-agent-mode.ts)
- [src/core/task/managed-workflows/ManagedWorkflowRenderer.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRenderer.ts)

Required changes:

- include both active agent reminder and managed workflow reminder in the prompt when both exist
- ensure prompt order makes sense:
  - persona first
  - workflow phase/checklist second

### 6. Update `use_skill` Enforcement

Primary file:

- [src/core/task/tools/handlers/UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts)

Required changes:

- preserve current allowlist checks
- when a managed workflow is activated via `use_skill` under a compatible agent, do not discard agent state
- when invoked without an active agent, optionally activate the owning agent as part of managed workflow activation

## Policy Decisions

### Decision 1: Should Workflow Slash Commands Auto-Switch Agents?

Recommended v1 policy:

- if no agent is active, auto-activate the owning agent
- if the matching agent is active, keep it
- if a different agent is active, reject with a clear message

Why:

- safer than silent cross-agent switching
- easier to reason about in the first implementation
- aligns with allowlist semantics

### Decision 2: Should `bmad-help` Be Special?

`bmad-help` is a managed workflow but is not currently assigned in the allowlist.

Options:

1. keep it special and agent-agnostic
2. add it explicitly to all agents
3. exclude it from owner inference and treat it as universally accessible

Recommended v1 policy:

- treat `bmad-help` as agent-agnostic and exclude it from ownership requirements

### Decision 3: What About `bmad-party-mode`?

`bmad-party-mode` is allowlisted for many agents but is not a managed workflow.

No change is required for this plan beyond ensuring:

- party mode remains outside managed workflow ownership logic

## Acceptance Criteria

The composition model should be considered successful when:

1. `/bmad-code-review` activates both:
   - `bmad-dev` persona
   - managed workflow `bmad-code-review`

2. `/bmad-create-prd` activates both:
   - `bmad-pm` persona
   - managed workflow `bmad-create-prd`

3. If the matching agent is already active, workflow invocation preserves it and starts the workflow.

4. If an incompatible agent is active, the workflow invocation is rejected with a clear message instead of silently replacing agent state.

5. Prompt construction includes both persona context and workflow progression context.

6. `use_skill` and slash workflow activation follow the same permission model.

7. The workflow owner is resolved from `agent-workflow-allowlist.json`, not `bmad-help.csv`.

## Test Plan

### Unit Tests

- workflow owner resolution from allowlist
- slash workflow activation with no active agent
- slash workflow activation with matching active agent
- slash workflow activation with incompatible active agent
- `use_skill` managed workflow activation while compatible agent is active

### Integration Tests

- `/bmad-agent-bmm-dev` then `/bmad-code-review` keeps `dev` active and starts managed workflow
- `/bmad-agent-bmm-sm` then `/bmad-code-review` rejects the workflow activation
- `/bmad-code-review` from neutral state activates both persona and workflow
- task resume restores both active agent persona and managed workflow

## Delivery Order

1. Add workflow-owner resolution from the allowlist
2. Update task state and activation logic to permit coexistence
3. Update slash workflow activation to auto-activate the owning agent
4. Update `use_skill` so compatible agent + workflow can coexist
5. Update prompt composition to include both layers
6. Add regression tests
7. Update documentation to describe the new composition model

## Review Checklist

- [ ] Ownership is derived from `agent-workflow-allowlist.json`
- [ ] Agent persona and managed workflow can coexist in task state
- [ ] Workflow slash commands activate the matching agent persona
- [ ] Compatible agent/workflow combinations are preserved
- [ ] Incompatible combinations are rejected clearly
- [ ] Prompt composition includes both persona and workflow layers
- [ ] `use_skill` and slash workflow activation follow the same permission model
