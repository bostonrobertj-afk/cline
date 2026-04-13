# Workflow Runtime Registry Contract Trace Findings

## Purpose

This document traces the shipped-workflow registry/discovery replacement seam end to end across live callers so the action plan does not prescribe invented helper names or bundle unrelated responsibilities into one step.

## Live Legacy Discovery And Resolution Surfaces

- Legacy workflow discovery and lookup:
  [src/core/workflows/resolution/resolveAvailableWorkflows.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/resolution/resolveAvailableWorkflows.ts#L1)
  - `resolveAvailableWorkflows(options)`
  - `resolveWorkflowByName(options, name)`
  - `findResolvedWorkflowByName(workflows, name)`
  - `createWorkflowSkillMetadata(workflows)`

- Current legacy result shape:
  [resolveAvailableWorkflows.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/resolution/resolveAvailableWorkflows.ts#L7-L20)
  - `ResolvedWorkflowEntry`
  - carries `name`, `source`, `description`, `fileName`, `workflowId`, `slashCommand`, `aliases`, `skillName`

## Caller Family 1: Main-Agent Slash Command Autocomplete

- Caller:
  [src/core/controller/slash/getAvailableSlashCommands.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/slash/getAvailableSlashCommands.ts#L10-L52)

- Current behavior:
  - calls `resolveAvailableWorkflows(...)`
  - iterates returned workflow entries
  - emits `SlashCommandInfo` values using:
    - `name: workflow.name`
    - `description: workflow.description`
    - `section: "custom"`
    - `cliCompatible: true`

- What this proves:
  - the shipped-runtime replacement needs one caller-facing seam whose responsibility is:
    - return slash-command-listing metadata only
  - this is distinct from activation lookup and distinct from runtime definition lookup

## Caller Family 2: Main-Agent Slash Command Activation

- Caller:
  [src/core/slash-commands/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/index.ts#L37-L281)

- Current behavior:
  - calls `resolveWorkflowByName(...)` with the parsed slash-command token
  - branches by resolved workflow source:
    - managed workflow path
    - placeholder workflow path
  - creates persistent slash-command actions

- Current persistent action shape:
  [slash-commands/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/index.ts#L24-L27)
  - `"activate_managed_workflow"`
  - `"activate_placeholder_workflow"`

- What this proves:
  - the shipped-runtime replacement needs one caller-facing seam whose responsibility is:
    - resolve a slash-command token to a shipped workflow id
  - that seam is separate from slash-command listing metadata
  - that seam is separate from `use_skill` resolution

## Caller Family 3: Main-Agent `use_skill` Workflow Resolution

- Caller:
  [src/core/task/tools/handlers/UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts#L32-L170)

- Current behavior:
  - calls `resolveWorkflowByName(...)` with `skill_name`
  - uses `resolvedWorkflow.skillName ?? skillName`
  - branches into:
    - managed workflow activation
    - placeholder workflow activation
    - ordinary skills discovery fallback

- What this proves:
  - the shipped-runtime replacement needs one caller-facing seam whose responsibility is:
    - resolve a `use_skill` name to a shipped workflow id
  - that seam is separate from slash-command activation lookup
  - that seam is separate from prompt-skill metadata exposure

## Caller Family 4: Prompt Skill Metadata Exposure In Main Task

- Caller:
  [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3867-L3889)

- Current behavior:
  - discovers ordinary skills
  - calls `resolveAvailableWorkflows(...)`
  - calls `createWorkflowSkillMetadata(workflowEntries)`
  - merges returned workflow skill metadata into the skill list shown in prompts

- `SkillMetadata` contract:
  [src/shared/skills.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/skills.ts#L5-L10)
  - `name`
  - `description`
  - `path`
  - `source`

- What this proves:
  - the shipped-runtime replacement needs one caller-facing seam whose responsibility is:
    - return `SkillMetadata[]` for shipped workflows only
  - this seam is separate from runtime definition resolution

## Caller Family 5: Prompt Skill Metadata Exposure And Activation In Subagents

- Callers:
  [src/core/task/tools/subagent/SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L469-L485)
  [src/core/task/tools/subagent/SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1037-L1065)

- Current behavior:
  - discovers ordinary skills
  - calls `resolveAvailableWorkflows(...)`
  - calls `createWorkflowSkillMetadata(workflowEntries)`
  - auto-activates assigned workflows by:
    - checking managed workflow registry first
    - then calling `findResolvedWorkflowByName(workflowEntries, assignedSkill)`

- What this proves:
  - the shipped-runtime replacement needs the same two seams as main task:
    - workflow skill metadata exposure
    - `use_skill`-name workflow resolution
  - subagent activation should consume the same shipped-workflow resolution contract as main-agent `UseSkillToolHandler`

## Caller Family 6: Workflow Runtime Definition Resolution

- Caller:
  [src/core/task/workflow-runtime/WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts#L12-L24)

- Current behavior:
  - constructor takes `resolveDefinition: (workflowName: WorkflowName) => WorkflowDefinition | undefined`
  - `activateWorkflow(...)` and projection methods depend on that resolver

- What this proves:
  - runtime definition resolution is a separate seam from:
    - slash-command listing
    - slash-command activation lookup
    - `use_skill` lookup
    - skill-metadata exposure

## Existing Shipped-Workflow Source Of Truth Already Present

- Current shipped workflow name list:
  [src/core/task/workflow-runtime/workflowRuntimeConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/workflowRuntimeConfig.ts#L75-L119)
  - `SHIPPED_WORKFLOW_NAMES`

- Current workflow definition surface already present:
  [src/core/task/workflow-runtime/workflows/advanced-elicitation/definition.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/workflows/advanced-elicitation/definition.ts)
  [src/core/task/workflow-runtime/workflows/blind-review/definition.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/workflows/blind-review/definition.ts)
  [src/core/task/workflow-runtime/workflows/brainstorming/artifacts.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/workflows/brainstorming/artifacts.ts)
  [src/core/task/workflow-runtime/workflows/brainstorming/data.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/workflows/brainstorming/data.ts)

## Tests And Deletion Surfaces Verified

- Slash-command tests currently assert the legacy workflow-action shapes and user-authored workflow discovery paths:
  [src/core/slash-commands/__tests__/index.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/__tests__/index.test.ts#L146-L336)
  - expects `"activate_managed_workflow"`
  - expects `"activate_placeholder_workflow"`
  - covers local, global, and remote workflow discovery that the approved architecture removes

- `use_skill` tests currently assert legacy managed/placeholder activation and metadata persistence:
  [src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L1470-L2060)
  - expects `activeWorkflowId`
  - expects `managedWorkflowRun`
  - expects `activePlaceholderWorkflowId`
  - expects local/global/remote workflow activation paths that the approved architecture removes

- Subagent tests currently stub the legacy workflow-resolution module directly:
  [src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1-L2400)
  - stubs `resolveAvailableWorkflows(...)`
  - relies on placeholder inheritance helpers that the approved architecture removes

- The legacy discovery unit test is still anchored to the old resolution module:
  [src/core/workflows/resolution/__tests__/resolveAvailableWorkflows.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/resolution/__tests__/resolveAvailableWorkflows.test.ts#L1-L67)
  - covers precedence across managed/local/global/remote discovery
  - must not be deleted until replacement caller coverage exists

## What This Proves About The Action Plan

The previous action-plan `Subtask 2.77` was too broad and under-traced because it bundled all of these separate responsibilities into one new file and one step:

- runtime definition resolution
- slash-command listing
- slash-command lookup
- `use_skill` lookup
- workflow skill metadata exposure
- task constructor injection update

That is not an executable one-edit task and it also hides unapproved helper names behind one registry label.

## Naming Status

These registry/helper names are now approved:

- `WorkflowRegistry.ts`
- `resolveWorkflowDefinition`
- `resolveWorkflowBySlashCommand`
- `resolveWorkflowByUseSkillName`
- `getShippedWorkflowSlashCommands`
- `getWorkflowSkillMetadata`

## Strong Recommendation

The action plan should not prescribe this registry migration as a single step.

Instead, the registry family should be rewritten into separate atomic tasks matching the real caller families above:

- one task for the exported shipped-definition index surface
- one task for runtime definition resolution
- one task for slash-command listing metadata
- one task for slash-command activation lookup
- one task for `use_skill` lookup
- one task for workflow `SkillMetadata[]` exposure
- one task for wiring the runtime constructor to the approved definition resolver seam
- one task for slash-command tests that still assert the removed local/global/remote paths
- one task for `use_skill` tests that still assert the removed managed/placeholder paths
