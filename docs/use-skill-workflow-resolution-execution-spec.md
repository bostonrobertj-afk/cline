# Execution Spec: Unify `use_skill` With Slash-Command Workflow Resolution

## Objective

Update `use_skill` so that workflow activation uses the same underlying workflow resolution layer currently used by human-authored `/` workflow commands.

After this execution lands, `use_skill` must be able to activate:

- local workflows from `.clinerules/workflows`
- global workflows from `~/Documents/Cline/Workflows`
- remote workflows from remote config
- existing managed BMAD workflows

This execution does **not** need to add support for BMAD agent persona commands such as `/bmad-dev`.

This execution does **not** need to update prompting, prompt templates, or prompt skill exposure yet.

## Problem Statement

Today there are two separate activation paths:

1. Human-authored `/` commands
   - resolved through the slash-command pipeline
   - can activate local workflows, global workflows, remote workflows, and managed BMAD workflows

2. `use_skill`
   - resolves managed BMAD workflows specially
   - otherwise only discovers directory-backed skills via `SKILL.md`
   - does not see normal Cline workflows created through the workflow UI

This means a workflow like `/code-review` may be runnable by the human user but not activatable from `use_skill("code-review")` inside an agent or subagent.

## Existing Resolution Paths

### Slash-command path

Current behavior is split across:

- [src/core/controller/slash/getAvailableSlashCommands.ts](../src/core/controller/slash/getAvailableSlashCommands.ts)
- [src/core/slash-commands/index.ts](../src/core/slash-commands/index.ts)

That path already merges:

- built-in slash commands
- managed BMAD workflows from `ManagedWorkflowRegistry`
- enabled local workflows from workspace workflow toggles
- enabled global workflows from global workflow toggles
- enabled remote workflows from remote config

### `use_skill` path

Current behavior is in:

- [src/core/task/tools/handlers/UseSkillToolHandler.ts](../src/core/task/tools/handlers/UseSkillToolHandler.ts)
- [src/core/context/instructions/user-instructions/skills.ts](../src/core/context/instructions/user-instructions/skills.ts)

That path currently:

- resolves managed BMAD workflows through `ManagedWorkflowRegistry`
- otherwise discovers only directory-backed skills from skill directories
- does not reuse slash-command workflow discovery

## Target Outcome

The system should have a shared workflow resolution layer used by:

- slash-command execution
- slash-command autocomplete/listing
- `use_skill`

That shared layer should resolve the non-agent workflow inventory consistently.

`use_skill("code-review")` should become the tool-based equivalent of the user invoking `/code-review`, apart from any explicit runtime guards that intentionally remain in place.

## Scope

### In scope

- shared workflow discovery/resolution for:
  - managed BMAD workflows
  - local workflows
  - global workflows
  - remote workflows
- `use_skill` activation of those workflows
- handler/test updates needed to support workflow-backed activation through `use_skill`

### Out of scope

- BMAD agent persona slash commands
- prompt templates
- system prompt skill lists
- exposing workflow-backed entries in prompt `context.skills`
- redesigning slash-command syntax
- changing the remote workflow trust model

## Key Design Rule

Do **not** make `use_skill` literally call the slash-command parser.

Instead:

1. extract a shared workflow discovery/resolution layer
2. use that layer from both slash-command execution and `use_skill`

This keeps:

- user input preprocessing
- runtime tool activation

as separate boundaries that share a common source of truth.

## Proposed Architecture

Introduce a shared workflow resolution module that exposes a normalized workflow entry shape.

### Suggested normalized type

Example shape:

```ts
type ResolvedWorkflowActivation = {
	name: string
	source: "managed" | "local" | "global" | "remote"
	description: string
	fileName?: string
	fullPath?: string
	contents?: string
	workflowId?: string
	slashCommand?: string
}
```

Notes:

- managed workflows may carry `workflowId` and `slashCommand`
- local/global workflows may carry `fullPath`
- remote workflows may carry inline `contents`
- `name` should be the activation name that matches the slash command the user would type

## Implementation Plan

### 1. Extract shared workflow discovery

Create a shared helper module for non-agent workflow discovery and lookup.

Suggested location:

- `src/core/workflows/resolution/resolveAvailableWorkflows.ts`

Responsibilities:

- load managed BMAD workflows from `ManagedWorkflowRegistry`
- load enabled local workflows from workspace workflow toggles
- load enabled global workflows from global workflow toggles
- load enabled remote workflows from remote config
- normalize all entries into a single list
- apply the same precedence rules slash commands already use

Required precedence:

1. local
2. global
3. remote

Managed workflows should be included as first-class resolved entries by slash command / alias name rather than bolted on separately in a later phase.

### 2. Extract shared workflow content loading

Add a shared loader that can turn a resolved workflow entry into executable instructions.

Suggested location:

- `src/core/workflows/resolution/loadResolvedWorkflowContent.ts`

Responsibilities:

- if source is `local` or `global`, read the workflow file from disk
- if source is `remote`, return `contents`
- if source is `managed`, return enough metadata for `use_skill` to route into managed workflow activation rather than inline content injection

This helper should be used by both slash-command execution and `use_skill`.

### 3. Refactor slash-command execution to use the shared layer

Update:

- [src/core/slash-commands/index.ts](../src/core/slash-commands/index.ts)

Required changes:

- replace the current ad hoc workflow assembly logic with the shared workflow resolution helper
- resolve the command name through the shared resolver
- load workflow contents through the shared loader
- preserve current behavior for:
  - local workflows
  - global workflows
  - remote workflows
  - managed BMAD workflows

This is important so the new shared layer is proven correct by existing slash-command behavior rather than becoming a second code path.

### 4. Refactor slash-command listing to use the shared layer

Update:

- [src/core/controller/slash/getAvailableSlashCommands.ts](../src/core/controller/slash/getAvailableSlashCommands.ts)

Required changes:

- replace the current split workflow enumeration with the shared workflow discovery helper
- emit slash-command suggestions from the normalized resolved entries
- preserve command names and descriptions as closely as possible to current behavior

This keeps autocomplete/listing aligned with execution.

### 5. Update `use_skill` to use the shared workflow resolution layer

Update:

- [src/core/task/tools/handlers/UseSkillToolHandler.ts](../src/core/task/tools/handlers/UseSkillToolHandler.ts)

Required behavior:

- keep the current managed BMAD workflow handling path, but source its lookup from the shared workflow resolver where possible
- before falling back to directory-backed skill discovery, attempt to resolve `skill_name` through the shared workflow resolver
- if the name matches a resolved non-agent workflow:
  - local/global/remote workflow: load the workflow content and return it as activated instructions
  - managed workflow: continue using the managed workflow runtime activation path

### 6. Preserve current managed workflow behavior

Managed BMAD workflows already have special runtime activation semantics through:

- [src/core/task/managed-workflows/ManagedWorkflowRegistry.ts](../src/core/task/managed-workflows/ManagedWorkflowRegistry.ts)
- [src/core/task/managed-workflows/ManagedWorkflowController.ts](../src/core/task/managed-workflows/ManagedWorkflowController.ts)

Do not replace that runtime with inline workflow text injection.

Instead:

- detect a managed workflow in the shared resolution layer
- route it back into the existing managed workflow activation path inside `UseSkillToolHandler`

### 7. Keep BMAD agent persona commands out of scope

Do not include:

- `/bmad-dev`
- `/bmad-pm`
- `/bmad-architect`
- any other BMAD persona activation command

Those are resolved through:

- [src/core/task/bmad-agent-mode.ts](../src/core/task/bmad-agent-mode.ts)

and should remain outside the workflow-unification pass.

### 8. Preserve current toggle semantics

The shared workflow resolution layer must respect:

- workspace workflow toggles
- global workflow toggles
- remote workflow toggles

Do not make `use_skill` bypass toggles that already gate slash-command availability.

### 9. Preserve source-specific behavior

The shared layer must preserve the differences between workflow sources:

- local/global workflows:
  - file-backed
  - loaded from disk

- remote workflows:
  - content-backed
  - loaded from remote config contents

- managed workflows:
  - registry-backed
  - runtime-activated through managed workflow machinery

### 10. Add tests for shared resolution

Add focused unit tests for the new shared resolution layer.

Suggested coverage:

1. resolves enabled local workflows
2. resolves enabled global workflows
3. resolves enabled remote workflows
4. resolves managed BMAD workflows
5. enforces precedence local > global > remote
6. excludes disabled workflows
7. resolves by slash-command name consistently

### 11. Add tests for slash-command compatibility

Update or add tests under:

- `src/core/slash-commands/__tests__`
- `src/test/slash-commands.test.ts`

Required assertions:

- existing slash workflow commands still resolve
- remote workflows still resolve
- managed BMAD workflow slash commands still resolve

### 12. Add tests for `use_skill` workflow activation

Update or add tests under:

- `src/core/task/tools/handlers/__tests__`

Required assertions:

1. `use_skill("code-review")` activates a local workflow
2. `use_skill(...)` activates a global workflow
3. `use_skill(...)` activates a remote workflow
4. `use_skill(...)` activates a managed BMAD workflow through the existing managed workflow runtime
5. `use_skill(...)` still activates directory-backed skills normally
6. disabled workflows are not activatable

## Recommended File Ownership

### Shared resolution layer

New files:

- `src/core/workflows/resolution/resolveAvailableWorkflows.ts`
- `src/core/workflows/resolution/loadResolvedWorkflowContent.ts`
- matching tests

### Slash-command integration

Update:

- [src/core/slash-commands/index.ts](../src/core/slash-commands/index.ts)
- [src/core/controller/slash/getAvailableSlashCommands.ts](../src/core/controller/slash/getAvailableSlashCommands.ts)

### Tool activation integration

Update:

- [src/core/task/tools/handlers/UseSkillToolHandler.ts](../src/core/task/tools/handlers/UseSkillToolHandler.ts)

### No prompt work in this execution

Do not update:

- prompt templates
- `context.skills`
- system prompt skill sections

That should be a later execution.

## Behavioral Notes

### What will work after this execution

Assuming the workflow is enabled and not blocked by some separate runtime rule:

- human can run `/code-review`
- agent can run `use_skill("code-review")`
- subagent can run `use_skill("code-review")`

### What still will not happen automatically

Because prompting is out of scope for this pass:

- the model may not automatically know every workflow-backed activation name exists
- manual instruction or subagent assignment may still be needed until prompt exposure is updated

This is acceptable for this execution because the goal is runtime/tool-path parity, not prompt discoverability.

## Validation Plan

### Static checks

Run:

```bash
npx biome check src/core/slash-commands/index.ts src/core/controller/slash/getAvailableSlashCommands.ts src/core/task/tools/handlers/UseSkillToolHandler.ts
```

```bash
npx tsc --noEmit --pretty false
```

### Tests

Run:

- targeted slash-command tests
- targeted `UseSkillToolHandler` tests
- new shared workflow resolution tests

If there are existing repo-standard commands that cover these suites, use those instead of inventing ad hoc runners.

## Acceptance Criteria

This execution is complete only when all of the following are true:

- slash-command workflow listing and execution use the shared workflow resolution layer
- `use_skill` uses the same shared workflow resolution layer for non-agent workflows
- `use_skill` can activate local workflows
- `use_skill` can activate global workflows
- `use_skill` can activate remote workflows
- `use_skill` still activates managed BMAD workflows correctly
- BMAD agent persona commands remain out of scope and unchanged
- toggle state is respected consistently across slash commands and `use_skill`
- existing slash-command workflow behavior remains intact
- TypeScript passes
- targeted tests pass

## Non-Goals

This execution should not:

- add BMAD persona activation through `use_skill`
- change prompt templates
- change system prompt skill exposure
- redesign workflow file format
- redesign remote workflow policy
- merge personas and workflows into one registry

## Recommended Follow-Up Execution

After this runtime unification lands, the next logical execution is:

- update prompt/context exposure so workflow-backed `use_skill` names are discoverable to the model without manual instruction

That follow-up should update prompt generation only after the runtime path is stable and tested.
