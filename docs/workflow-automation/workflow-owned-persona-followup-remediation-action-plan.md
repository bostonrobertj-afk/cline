---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not make changes outside the allowed files listed for the current step.
  - If any ambiguity is discovered, or if any change is needed outside the allowed files for the current step, stop and ask the user before proceeding.
  - Do not infer additional cleanup, compatibility shims, or unrelated refactors beyond what is explicitly prescribed here.
---

# Workflow-Owned Persona Follow-Up Remediation Action Plan

## Scope

This plan closes the post-QA gaps left after the workflow-owned persona activation buildout.

The required end state is:

- retired BMAD persona slash commands are no longer discoverable through the shared slash-command inventory
- adjacent unit coverage no longer imports or depends on deleted BMAD persona helper exports
- the canonical workflow-automation readme no longer claims `activeAgent*` runtime state survives workflow teardown

This plan must not:

- change the shipped workflow-owned persona runtime
- reintroduce any BMAD persona activation path
- change workflow execution, workflow reminders, or prompt assembly behavior
- expand into unrelated doc cleanup outside the exact stale section listed below

## Verified Live Seams

The current live QA gaps are:

- retired BMAD persona slash commands still published through [src/shared/slashCommands.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/slashCommands.ts#L8)
- backend autocomplete still returns that shared inventory through [src/core/controller/slash/getAvailableSlashCommands.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/slash/getAvailableSlashCommands.ts#L10)
- the webview fallback slash-command list still consumes the same shared inventory through [webview-ui/src/utils/slash-commands.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/utils/slash-commands.ts#L7)
- adjacent unit coverage still imports deleted BMAD helper exports in [src/core/task/__tests__/managedWorkflowCoverage.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/managedWorkflowCoverage.test.ts#L1)
- the canonical teardown doc still lists removed `activeAgent*` fields in [docs/workflow-automation/workflow-automation-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-automation-readme.md#L240)

## Action Plan

[x] Step 1: Remove retired BMAD persona slash commands from the shared discoverable slash-command inventory.
Allowed files: `src/shared/slashCommands.ts`, `src/test/slash-commands.test.ts`
In [slashCommands.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/slashCommands.ts#L8), delete every BMAD persona activation and exit entry from `BASE_SLASH_COMMANDS`.
Delete these exact command names:
- `bmad-agent-bmm-analyst`
- `bmad-agent-bmm-pm`
- `bmad-agent-bmm-architect`
- `bmad-agent-bmm-ux-designer`
- `bmad-agent-bmm-sm`
- `bmad-agent-bmm-dev`
- `bmad-agent-bmm-qa`
- `bmad-agent-bmm-tech-writer`
- `bmad-agent-bmm-quick-flow-solo-dev`
- `bmad-analyst`
- `bmad-pm`
- `bmad-architect`
- `bmad-ux-designer`
- `bmad-sm`
- `bmad-dev`
- `bmad-qa`
- `bmad-tea`
- `bmad-tech-writer`
- `bmad-quick-flow-solo-dev`
- `bmad-exit`
Do not change the remaining built-in commands (`newtask`, `deep-planning`, `smol`, `newrule`, `reportbug`) or the `VSCODE_ONLY_COMMANDS` block.
In [src/test/slash-commands.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/test/slash-commands.test.ts#L46), keep the existing generic base-command assertions intact, then add one new explicit regression in the `Base Slash Commands` block named exactly `should not advertise retired BMAD persona slash commands`.
That test must call `getAvailableSlashCommands(...)` and assert the response does not contain:
- `bmad-agent-bmm-dev`
- `bmad-dev`
- `bmad-exit`
Do not add assertions about parser behavior in this file; this step is inventory-only.

[x] Step 2: Remove stale BMAD-owner assertions from the adjacent managed-workflow coverage suite while preserving the registry coverage it still provides.
Allowed files: `src/core/task/__tests__/managedWorkflowCoverage.test.ts`
In [managedWorkflowCoverage.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/managedWorkflowCoverage.test.ts#L1), delete the import of:
- `getBuiltinBmadAgentAllowlist`
- `getOwningBmadAgentForSkill`
Then remove the allowlist/owner-only constants and helpers that are no longer valid after BMAD persona retirement:
- `EXPECTED_WORKFLOW_AGENT_ENTRIES`
- `UNIQUE_OWNER_WORKFLOWS`
- `buildWorkflowAgentIndex(...)`
Keep `ADDED_MANAGED_WORKFLOWS`, `getRepoRoot()`, and `listInScopeWorkflowIds(...)`.
Inside the test suite:
- keep the first test `registers every in-scope bmad workflow for managed execution`
- delete the second test `keeps configured and builtin agent allowlists aligned for every newly managed workflow`
- delete the third test `returns the expected unique owning agent for newly managed workflows that should auto-bind to one agent`
After this step, `managedWorkflowCoverage.test.ts` must remain a valid focused registry-coverage test file with no imports from `bmad-agent-mode.ts`.

[x] Step 3: Update the canonical workflow-automation doc so it no longer references removed `activeAgent*` teardown state.
Allowed files: `docs/workflow-automation/workflow-automation-readme.md`
In [workflow-automation-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-automation-readme.md#L240), replace the current `It does **not** clear unrelated runtime state such as:` list.
Delete these exact bullets:
- `activeAgentId`
- `activeAgentSkillName`
- `activeAgentInvokedSlashCommand`
Keep these remaining bullets:
- `activeWorkflowId`
- `managedWorkflowRun`
Do not change any other section of this readme in this pass.

[x] Step 4: Run the exact focused verification suite for the remediation pass.
Allowed files: none
Run this exact command:
```bash
npm run test:unit -- src/core/task/__tests__/managedWorkflowCoverage.test.ts src/test/slash-commands.test.ts --exit
```
If the command fails, stop and surface the failure instead of making unplanned fixes.

[x] Step 5: Perform a final string-contract and scope-boundary audit before handing the change back.
Allowed files: `src/shared/slashCommands.ts`, `src/test/slash-commands.test.ts`, `src/core/task/__tests__/managedWorkflowCoverage.test.ts`, `docs/workflow-automation/workflow-automation-readme.md`
Before marking this step complete, verify all of these exact conditions:
- no `BASE_SLASH_COMMANDS` entry name starts with `bmad-agent-bmm-`
- no `BASE_SLASH_COMMANDS` entry name equals `bmad-exit`
- no file in the allowed set reintroduces `getBuiltinBmadAgentAllowlist` or `getOwningBmadAgentForSkill`
- `managedWorkflowCoverage.test.ts` still validates managed-workflow registry coverage
- the readme’s teardown-state list no longer mentions any `activeAgent*` field
If any of those checks fail, fix only the mismatch inside the already-allowed files for the relevant earlier step. If any additional file seems necessary, stop and ask the user.
