# PI Planning Persona Activation Requirements

## Purpose

This document defines the persona-activation requirements for [pi-planning.md](/Users/robertboston/Documents/Cline/Workflows/pi-planning.md).

This slice covers:

- workflow-to-persona mapping for `pi-planning.md`
- runtime prompt injection through the existing workflow persona registry
- documentation alignment for the canonical workflow-persona mapping inventory

This slice does not cover:

- deterministic workflow progression
- workflow-start form behavior
- Step 2 or Step 3 tool automation
- contextual tool matrix behavior
- adding a new persona id
- changing persona instruction text for existing personas

## Source Of Truth

These requirements are grounded in:

- [progress-tracker.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/pi-planning/progress-tracker.md)
- [workflowPersonaRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts)
- [workflow-persona-mapping.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/persona-activation/workflow-persona-mapping.md)
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2154)
- [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L975)
- [agent_role.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_role.ts#L12)

## Capability Boundary

This slice is about mapping `pi-planning.md` to an existing workflow persona and ensuring the runtime resolves that persona through the existing workflow-owned prompt path.

It must:

- add `pi-planning.md` to the workflow persona registry
- map `pi-planning.md` to the existing `scrum-master` persona id
- preserve the existing runtime path that injects active workflow persona instructions into full prompts
- update the human-facing workflow persona mapping document to match the registry

It must not:

- add a new persona id
- change the `scrum-master` persona instruction text
- create a workflow-specific prompt branch outside the persona registry
- alter continuation-turn suppression behavior
- alter subagent prompt-assembly rules

## Canonical Mapping Requirement

The canonical workflow-to-persona mapping for this slice is:

- `pi-planning.md` -> `scrum-master`

The exact persona id must be `scrum-master`, matching the existing union in [workflowPersonaRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts).

No alias, renamed value, or new persona variant is allowed in this slice.

## Registry Requirements

### 1. Workflow registry entry

[workflowPersonaRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts) must include an explicit `WORKFLOW_PERSONA_BY_WORKFLOW` entry for:

- `pi-planning.md`: `scrum-master`

### 2. Existing persona instructions reused unchanged

This slice must reuse the existing `scrum-master` persona instructions already defined in [workflowPersonaRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts).

This slice must not edit:

- the `WorkflowPersonaId` union
- the `scrum-master` instruction text
- workflow normalization behavior in `resolveWorkflowPersonaId(...)`

### 3. No workflow-specific injection logic

`pi-planning.md` persona activation must be achieved by the registry mapping only.

This slice must not introduce:

- a `pi-planning.md` special case in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- a `pi-planning.md` special case in [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts)
- a `pi-planning.md` special case in [agent_role.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_role.ts)

## Runtime Behavior Requirements

### 1. Main task full-prompt injection

When `pi-planning.md` is the active placeholder workflow and the runtime is building a full prompt, the main task path must resolve workflow persona instructions through:

- `resolveWorkflowPersonaInstructions(activeWorkflowName)`

as already performed in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2154).

The resulting `activeWorkflowPersonaInstructions` must be the existing `scrum-master` persona text.

### 2. Subagent full-prompt injection

When a subagent is being given a full prompt assembly while `pi-planning.md` is active, the subagent prompt context must resolve workflow persona instructions through the same registry path, as already performed in [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L975).

### 3. Agent-role section behavior

When `activeWorkflowPersonaInstructions` is present, [agent_role.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_role.ts#L12) must continue to return the workflow persona instructions instead of the default generic agent-role text.

`pi-planning.md` must use that same existing behavior.

### 4. Continuation-turn behavior remains unchanged

This slice must not change the existing continuation-turn behavior.

If continuation turns currently omit workflow persona guidance by leaving `activeWorkflowPersonaInstructions` unset for that prompt path, that behavior must remain unchanged for `pi-planning.md`.

### 5. Internal-turn suppression remains unchanged

This slice must not change the existing subagent/internal-turn rule that suppresses dynamic reminder/persona fields when full prompt assembly is not being sent.

## Documentation Requirements

### 1. Mapping document alignment

[workflow-persona-mapping.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/persona-activation/workflow-persona-mapping.md) must be updated so the inventory includes:

- `pi-planning.md` | `scrum-master`

### 2. Canonical alignment

The documentation entry must align with the exact runtime registry spelling:

- workflow name: `pi-planning.md`
- persona id: `scrum-master`

This slice must not leave the runtime registry and the mapping document in disagreement.

## Non-Requirements

This slice does not require:

- changing the `scrum-master` persona prose
- adding `pi-planning.md` to any tool matrix
- changing deterministic progression
- changing workflow-step behavior
- changing UI messaging
- changing workflow form behavior
- changing managed-workflow persona behavior

## Test Requirements

Add or update tests proving:

- `resolveWorkflowPersonaId("pi-planning.md")` resolves to `scrum-master`
- `resolveWorkflowPersonaInstructions("pi-planning.md")` resolves to the existing `scrum-master` persona instructions
- a full prompt for active `pi-planning.md` includes persona guidance with:
  - `Persona`
  - `Role: Scrum Master`
- the prompt remains free of old XML persona artifacts such as `<agent` or `<persona`
- continuation-turn behavior remains unchanged for persona injection
- subagent full-prompt assembly resolves workflow persona instructions for `pi-planning.md`
- subagent non-full-prompt/internal-turn behavior still suppresses workflow persona instructions

The tests for this slice must verify runtime behavior through existing persona-injection seams rather than introducing a new `pi-planning.md`-specific prompt path.
