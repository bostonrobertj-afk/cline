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

# Workflow-Owned Persona Activation Action Plan

## Scope

This plan replaces BMAD agent persona activation with workflow-owned persona prompting that is resolved entirely inside `src/core/prompts` on full-prompt turns.

The required end state is:

- workflow personas are resolved from the active workflow name, not from BMAD agent activation state
- persona prompt strings live inline in prompt-owned code under `src/core/prompts/system-prompt/`
- the prompt-facing context uses `activeWorkflowName` and `activeWorkflowPersonaInstructions`
- `AGENT_ROLE_SECTION` injects the active workflow persona block only on full-prompt turns
- slash-command persona activation (`/bmad-*`, `/bmad-agent-bmm-*`, `/bmad-exit`) is removed
- placeholder and managed workflow activation no longer auto-bind `activeAgent*` state
- task metadata, history metadata, and notification naming no longer depend on BMAD agent ids

This plan must not:

- rename or remove the existing `activePlaceholderWorkflow*` prompt/runtime fields that other workflow systems still consume
- change managed workflow execution or managed workflow reminder behavior
- change workflow markdown source files
- change deterministic progression logic

## Verified Live Seams

The current live implementation that this plan replaces is:

- prompt context still exposing BMAD persona fields in [src/core/prompts/system-prompt/types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts#L95)
- `AGENT_ROLE_SECTION` still preferring `activeAgentId` and `activeAgentRoleInstructions` in [src/core/prompts/system-prompt/components/agent_role.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_role.ts#L11)
- full-prompt assembly still building BMAD persona instructions in [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2231) and injecting them into prompt context in [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3472)
- subagent full-prompt assembly still rebuilding BMAD persona instructions in [src/core/task/tools/subagent/SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L972)
- slash commands still supporting `activate_bmad_agent` and `exit_bmad_agent` in [src/core/slash-commands/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/index.ts#L25) and [src/core/slash-commands/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/index.ts#L187)
- placeholder workflow activation still auto-binding BMAD agents in [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2020), [src/core/task/tools/handlers/UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts#L63), and [src/core/task/tools/subagent/SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1081)
- prompt skill/tool surfaces still referencing `activeAgentId` in [src/core/prompts/system-prompt/components/skills.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/skills.ts#L1) and [src/core/prompts/system-prompt/tools/use_skill.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/use_skill.ts#L11)
- persisted metadata and UI naming still carrying `activeAgent*` fields in [src/core/context/context-tracking/ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts#L36), [src/shared/HistoryItem.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/HistoryItem.ts#L1), [src/core/controller/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/index.ts#L1051), and [webview-ui/src/components/chat/chat-view/shared/assistantName.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/assistantName.ts#L1)

## Action Plan

[x] Step 1: Normalize the workflow-to-persona source-of-truth document so implementation does not inherit stale BMAD and `party-mode` rules.
Allowed files: `docs/workflow-automation/persona-activation/workflow-persona-mapping.md`
In [workflow-persona-mapping.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/persona-activation/workflow-persona-mapping.md#L5), replace the current Mapping Rules block so it no longer mentions the BMAD allowlist or `party-mode.md`.
Make these exact document-level changes:
- replace the current rule at line 9 with `Existing workflow-to-persona decisions listed below are the canonical source of truth for the prompt-owned persona registry.`
- replace the current rule at line 10 with `Workflows marked \`unassigned\` must not inject any workflow persona.`
- delete the current line 11 rule for `party-mode.md`
- insert a new `## Persona Source Files` section immediately after `## Mapping Rules` with one row for each canonical persona id used in the inventory and these exact source paths:
  - `analyst` -> `_bmad/bmm/agents/analyst.md`
  - `architect` -> `_bmad/bmm/agents/architect.md`
  - `creative-writer` -> `_bmad/bmm/agents/creative-writer.md`
  - `developer` -> `_bmad/bmm/agents/dev.md`
  - `master-test-architect` -> `_bmad/tea/agents/bmad-tea/SKILL.md`
  - `product-manager` -> `_bmad/bmm/agents/pm.md`
  - `quality-control` -> `_bmad/bmm/agents/quality-control.md`
  - `quick-flow-solo-dev` -> `_bmad/bmm/agents/quick-flow-solo-dev.md`
  - `scrum-master` -> `_bmad/bmm/agents/sm.md`
  - `tech-writer` -> `_bmad/bmm/agents/tech-writer/tech-writer.md`
  - `ux-designer` -> `_bmad/bmm/agents/ux-designer.md`
Do not add any new workflow rows in this step. The inventory table must remain the canonical workflow list already present in this file.

[x] Step 2: Add a prompt-owned workflow persona registry with inline persona blocks and no runtime file loading.
Allowed files: `src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts`
Add a new file at [workflowPersonaRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts) with these exact exports:
- `export type WorkflowPersonaId = "analyst" | "architect" | "creative-writer" | "developer" | "master-test-architect" | "product-manager" | "quality-control" | "quick-flow-solo-dev" | "scrum-master" | "tech-writer" | "ux-designer"`
- `export const WORKFLOW_PERSONA_BY_WORKFLOW: Record<string, WorkflowPersonaId | undefined>`
- `export const WORKFLOW_PERSONA_INSTRUCTIONS: Record<WorkflowPersonaId, string>`
- `export function resolveWorkflowPersonaInstructions(workflowName?: string): string | undefined`
- `export function resolveWorkflowPersonaId(workflowName?: string): WorkflowPersonaId | undefined`
The helper must normalize workflow names exactly like the contextual matrix lookup does:
- accept canonical `.md` names first
- accept unsuffixed names by appending `.md`
- accept `.md` inputs whose registry key is unsuffixed by trimming `.md`
Use the inventory in [workflow-persona-mapping.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/persona-activation/workflow-persona-mapping.md#L15) as the exact source for `WORKFLOW_PERSONA_BY_WORKFLOW`.
Do not include rows whose persona is `unassigned`.
For every persona string in `WORKFLOW_PERSONA_INSTRUCTIONS`, transcribe only the persona content from the canonical source file into this exact plain-text block shape:
- first line: `Persona`
- then `Role: ...`
- then `Identity: ...`
- then `Communication Style: ...`
- then `Principles:`
- then one `- ...` line per principle
Do not carry over frontmatter, XML, activation steps, capability tables, config-loading steps, greeting instructions, or exit-command instructions into the inline prompt strings.

[x] Step 3: Replace the prompt-facing BMAD persona contract with workflow-owned persona context while preserving existing placeholder workflow context fields for other systems.
Allowed files: `src/core/prompts/system-prompt/types.ts`, `src/core/prompts/system-prompt/components/agent_role.ts`, `src/core/prompts/system-prompt/components/skills.ts`, `src/core/prompts/system-prompt/tools/use_skill.ts`
In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts#L105), remove `activeAgentId?: string` and `activeAgentRoleInstructions?: string` from `SystemPromptContext`.
Insert these exact fields in their place:
- `readonly activeWorkflowName?: string`
- `readonly activeWorkflowPersonaInstructions?: string`
Do not rename `activePlaceholderWorkflowName` or `activePlaceholderWorkflowStepNumber` in this file.
In [agent_role.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_role.ts#L11), replace the current BMAD branch with:
- if `context.activeWorkflowPersonaInstructions?.trim()` is truthy, return it
- otherwise keep the existing default `AGENT_ROLE` template resolution unchanged
In [skills.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/skills.ts#L1), remove the `bmad-agent-mode` import and all builtin-BMAD-agent filtering helpers.
Then change the `skills` assignment at line 27 so it simply reads from `context.skills ?? []`.
Do not change `SKILLS_PROMPT_SECTION_GATE`.
In [use_skill.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/use_skill.ts#L11), replace the description sentence that mentions `parent active-agent prompt` with:
- `After activation, follow the returned or injected workflow or skill instructions directly and do not call use_skill again unless a later step explicitly requires a different workflow or skill.`
Then change `contextRequirements` at line 13 so it no longer references `context.activeAgentId`; it must require only `context.skills !== undefined && context.skills.length > 0`.

[x] Step 4: Wire the main-task and subagent full-prompt builders to resolve workflow personas from the active workflow name and inject them through the new prompt context fields.
Allowed files: `src/core/task/index.ts`, `src/core/task/tools/subagent/SubagentRunner.ts`, `src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts`
In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2231), rename `buildBmadPromptInstructions()` to `buildWorkflowPromptInstructions()`.
Its new return type must be:
- `activeWorkflowPersonaInstructions?: string`
- `activeWorkflowReminder?: string`
Inside that method:
- derive `const activeWorkflowName = this.taskState.activePlaceholderWorkflowSource?.name`
- set `activeWorkflowPersonaInstructions = resolveWorkflowPersonaInstructions(activeWorkflowName)`
- keep the existing managed-workflow reminder logic unchanged:
  - `buildManagedWorkflowPrompt(this.taskState.managedWorkflowRun)`
  - `getBmadWorkflowReminder(this.cwd, this.taskState.activeWorkflowId)`
Do not attempt to resolve workflow personas from `activeWorkflowId`.
In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3472), replace the `activeAgentRoleInstructions` destructure with `activeWorkflowPersonaInstructions`.
In the `promptContext` object at [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3499):
- delete `activeAgentId`
- delete `activeAgentRoleInstructions`
- add `activeWorkflowName: this.taskState.activePlaceholderWorkflowSource?.name`
- add `activeWorkflowPersonaInstructions`
- keep `...activePlaceholderWorkflowPromptContext` in place so existing contextual-tool and checklist systems still receive `activePlaceholderWorkflowName`
In [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L972), make the same prompt-context conversion:
- remove `activeAgentRoleInstructions`
- resolve `activeWorkflowName` from `params.state.activePlaceholderWorkflowSource?.name`
- resolve `activeWorkflowPersonaInstructions` from `resolveWorkflowPersonaInstructions(activeWorkflowName)`
- keep managed workflow reminders unchanged
- return `activeWorkflowName` and `activeWorkflowPersonaInstructions` in the `SystemPromptContext`

[x] Step 5: Remove the old slash-command and runtime BMAD agent activation path, and stop persisting or restoring `activeAgent*` task state.
Allowed files: `src/core/slash-commands/index.ts`, `src/core/task/index.ts`, `src/core/task/TaskState.ts`, `src/core/task/prompt-refresh.ts`, `src/core/task/tools/handlers/UseSkillToolHandler.ts`, `src/core/task/tools/subagent/SubagentRunner.ts`, `src/core/context/context-tracking/ContextTrackerTypes.ts`, `src/shared/HistoryItem.ts`, `src/core/controller/index.ts`, `webview-ui/src/components/chat/chat-view/shared/assistantName.ts`, `src/core/task/tools/handlers/AskFollowupQuestionToolHandler.ts`, `src/core/task/tools/handlers/SubagentToolHandler.ts`
In [slash-commands/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/index.ts#L17), remove the `bmad-agent-mode` imports.
Then delete these `PersistentSlashCommandAction` union members at [slash-commands/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/index.ts#L25):
- `{ type: "activate_bmad_agent"; agentId: string; skillName: string; invokedSlashCommand: string }`
- `{ type: "exit_bmad_agent" }`
Delete the entire BMAD activation block at [slash-commands/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/index.ts#L187-L211).
In [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L145), remove:
- `activeAgentId`
- `activeAgentSkillName`
- `activeAgentInvokedSlashCommand`
- `activeAgentJustActivated`
In [prompt-refresh.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/prompt-refresh.ts#L18), remove `activeAgentJustActivated` from the `shouldSendFullPromptAssembly` parameter type and condition.
In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L196), change `shouldIncludePersistentPromptContext(...)` so its `Pick<TaskState, ...>` signature becomes exactly `Pick<TaskState, "activeWorkflowId" | "activePlaceholderWorkflowId">` and its body no longer references `activeAgentId`. Its only live checks after this step must be `activeWorkflowId` and `activePlaceholderWorkflowId`.
In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1993), remove all `activeAgent*` compatibility checks and auto-bind writes from both:
- `activate_managed_workflow`
- `activate_placeholder_workflow`
In the same method, delete the `activate_bmad_agent` and `exit_bmad_agent` branches entirely.
In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2138) and [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2286), remove all `activeAgent*` save/restore lines.
In the same file, remove every remaining `activeAgentJustActivated` read or write, including:
- the workflow-activation writes at [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2007) and [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2033)
- the prompt-refresh input at [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2260)
- the post-load and post-turn resets at [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2289) and [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3557)
In [UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts#L63), remove:
- `resolvePlaceholderWorkflowManagedVariant`
- `getBmadAgentById`
- `getOwningBmadAgentForSkill`
- `isSkillAllowedForBmadAgent`
- all `activeAgent*` gate logic
- all `activeAgent*` metadata persistence
Managed workflow activation must still work, but it must no longer seed persona state.
Placeholder workflow activation must still work, but it must no longer seed persona state or reject activation because of persona allowlists.
In [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1050), remove all `activeAgent*` auto-binding writes from `autoActivateAssignedWorkflow(...)`.
In the same file, remove every remaining `activeAgentJustActivated` read or write, including:
- the reset at [src/core/task/tools/subagent/SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L577)
- the prompt-context read at [src/core/task/tools/subagent/SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1037)
In [ContextTrackerTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-tracking/ContextTrackerTypes.ts#L36) and [HistoryItem.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/HistoryItem.ts#L1), remove all `activeAgent*` metadata fields.
In [controller/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/index.ts#L1051), stop computing `activeAgentDisplayName` and stop adding `activeAgentId` / `activeAgentDisplayName` to `currentTaskItem`.
In [assistantName.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/assistantName.ts#L1), remove the `currentTaskItem.activeAgentDisplayName` dependency and always return the existing `FALLBACK_ASSISTANT_NAME`.
In [AskFollowupQuestionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AskFollowupQuestionToolHandler.ts#L1) and [SubagentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SubagentToolHandler.ts#L154), remove `getBmadAgentDisplayName` usage and use the literal assistant name `Cline` for notifications and approval prompts.

[x] Step 6: Retire obsolete BMAD persona helpers and replace the old BMAD-state tests with workflow-owned persona coverage.
Allowed files: `src/core/task/bmad-agent-mode.ts`, `src/core/task/bmad-agent-mode.test.ts`, `src/core/slash-commands/__tests__/index.test.ts`, `src/core/task/__tests__/prompt-context.test.ts`, `src/core/prompts/system-prompt/__tests__/integration.test.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`, `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`, `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
In [bmad-agent-mode.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/bmad-agent-mode.ts#L1), delete every export whose only purpose is BMAD agent persona activation or BMAD agent allowlist enforcement:
- `getBuiltinBmadAgentAllowlist`
- `resolveBmadAgentActivation`
- `buildBmadAgentActivationInstructions`
- `buildBmadAgentReminder`
- `buildBmadAgentRoleInstructions`
- `filterSkillsForBmadAgentMode`
- `getOwningBmadAgentForSkill`
- `resolvePlaceholderWorkflowManagedVariant`
- `getBmadAgentById`
- `isSkillAllowedForBmadAgent`
- `isBmadExitCommand`
- `getBmadAgentDisplayName`
Keep `getBmadWorkflowReminder(...)` intact because managed workflow reminder injection remains in scope.
In [bmad-agent-mode.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/bmad-agent-mode.test.ts#L1), replace the BMAD agent activation suite with reminder-only tests for `getBmadWorkflowReminder(...)`. Do not leave any tests for removed BMAD persona helpers.
In [slash-commands/__tests__/index.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/slash-commands/__tests__/index.test.ts#L156), replace the entire `parseSlashCommands BMAD activation` describe block with one regression block that asserts:
- managed workflow aliases like `/bmad-problem-solving` still resolve to `activate_managed_workflow`
- `/bmad-agent-bmm-quick-flow-solo-dev` and bare `bmad-agent-bmm-quick-flow-solo-dev` no longer produce a persistent slash-command action
- `/bmad-exit` no longer produces a persistent slash-command action
In [prompt-context.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/prompt-context.test.ts#L8), replace the current BMAD-agent test cases so `shouldIncludePersistentPromptContext(...)` now covers:
- no workflow state -> `false`
- `activeWorkflowId` present -> `true`
- `activePlaceholderWorkflowId` present -> `true`
In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1311), replace the current BMAD-active prompt test with a workflow-persona test that uses:
- `activeWorkflowName: "code-review.md"`
- `activeWorkflowPersonaInstructions: resolveWorkflowPersonaInstructions("code-review.md")`
That test must assert:
- the system prompt includes `Persona`
- the system prompt includes the `quality-control` role text
- the system prompt does not include XML tags from the source persona file
- the system prompt does not include `Active BMAD agent persona`
Add one continuation-turn regression next to it asserting the workflow persona block is absent when `isContinuationTurn === true`.
In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L2409), replace the placeholder auto-bind tests with:
- one activation test that proves placeholder workflow activation still succeeds and persists workflow source without any `activeAgent*` state
- no incompatible-agent rejection test
In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L1037) and [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L1542), remove the active-agent rejection and auto-bind assertions. Replace them with assertions that:
- managed workflow activation still succeeds with no `activeAgent*` writes
- placeholder workflow activation still succeeds with no `activeAgent*` writes in task state or saved metadata
In [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1848) and [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L2604), replace the active-agent assertions with:
- no `activeAgent*` writes during assigned workflow auto-activation
- full-prompt subagent context includes `activeWorkflowName` and `activeWorkflowPersonaInstructions` for placeholder workflows
- internal-turn subagent context omits `activeWorkflowPersonaInstructions`

[x] Step 7: Run the exact focused verification suite for workflow-owned persona activation.
Allowed files: none
Run this exact command:
```bash
npm run test:unit -- src/core/task/__tests__/prompt-context.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/slash-commands/__tests__/index.test.ts src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/task/bmad-agent-mode.test.ts --exit
```
If the command fails, stop and surface the failure instead of making unplanned fixes.

[x] Step 8: Perform a final string-contract and scope-boundary audit before handing the change back.
Allowed files: `docs/workflow-automation/persona-activation/workflow-persona-mapping.md`, `src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts`, `src/core/prompts/system-prompt/types.ts`, `src/core/prompts/system-prompt/components/agent_role.ts`, `src/core/prompts/system-prompt/components/skills.ts`, `src/core/prompts/system-prompt/tools/use_skill.ts`, `src/core/task/index.ts`, `src/core/task/tools/subagent/SubagentRunner.ts`, `src/core/slash-commands/index.ts`, `src/core/task/TaskState.ts`, `src/core/task/prompt-refresh.ts`, `src/core/task/tools/handlers/UseSkillToolHandler.ts`, `src/core/context/context-tracking/ContextTrackerTypes.ts`, `src/shared/HistoryItem.ts`, `src/core/controller/index.ts`, `webview-ui/src/components/chat/chat-view/shared/assistantName.ts`, `src/core/task/tools/handlers/AskFollowupQuestionToolHandler.ts`, `src/core/task/tools/handlers/SubagentToolHandler.ts`, `src/core/task/bmad-agent-mode.ts`, `src/core/task/bmad-agent-mode.test.ts`, `src/core/slash-commands/__tests__/index.test.ts`, `src/core/task/__tests__/prompt-context.test.ts`, `src/core/prompts/system-prompt/__tests__/integration.test.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`, `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`, `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
Before marking this step complete, verify all of these exact conditions:
- no new prompt-facing field name contains the word `placeholder`
- `activeWorkflowName` and `activeWorkflowPersonaInstructions` appear in prompt context construction for both main-task and subagent full-prompt turns
- no runtime branch still sets, restores, or persists `activeAgentId`, `activeAgentSkillName`, `activeAgentInvokedSlashCommand`, or `activeAgentJustActivated`
- no slash-command parser branch still emits `activate_bmad_agent` or `exit_bmad_agent`
- no prompt component or tool spec still depends on `context.activeAgentId`
- managed workflow reminders still use `activeWorkflowReminder`
- workflow persona strings are inline plain text only and contain no XML, frontmatter, or activation instructions
- the canonical workflow names in `WORKFLOW_PERSONA_BY_WORKFLOW` exactly match the inventory document
If any of those checks fail, fix only the mismatch inside the already-allowed files for the relevant earlier step. If any additional file seems necessary, stop and ask the user.
