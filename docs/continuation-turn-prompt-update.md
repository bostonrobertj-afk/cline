# Requirements

Trigger:
- `currentRequestHasHumanAuthoredInput == false`

This continuation-turn prompt should be its own prompt component, but the dynamic lines should be assembled from existing prompt helpers/constants where possible rather than paraphrased into new wording.

## Final Continuation Prompt Shape

```md
CONTINUATION TURN

Continue the current task from the latest tool results and conversation state.

- Use the native tool schema as the source of truth for tool names, parameters, and required fields.
- Operate from {cwd}; use explicit paths.
- {current mode response-tools line}
- Ask the user only if required to unblock progress or reduce risk.
- Prefer completing the next concrete step instead of restating prior context.
- {multi-root line, only when multi-root is enabled}
- {Indxr line, only when a connected Indxr server is present}

CURRENT TASK LIST
{focus chain checklist, only when one is active}
{focus-chain reminder line, chosen from existing prompt strings based on context}
```

## Dynamic Assembly Sources

### 1. Current mode response-tools line

Source file:
- [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts)

Existing reusable logic:
- `getActModeResponseTools(context)`
- `getPlanModeResponseTools(context)`
- `joinToolNames(toolNames)`

Use:
- derive the current mode response tool list with the existing helpers
- render a single continuation-turn line from the exact current-mode tool names

Recommended final line shape:
- `- Use ${joinToolNames(currentModeResponseTools)} when responding to the user.`

Implementation note:
- the helper functions in `response_tools.ts` are currently file-local, so either:
  - export them directly, or
  - extract a new public helper there such as `getCurrentModeResponseToolsLine(context, mode)`
- do not duplicate the tool-selection logic in the continuation component

### 2. Multi-root line

Source files:
- [constants.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/constants.ts)
- [tool_use/tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/tool_use/tools.ts)
- [contextManagement.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/contextManagement.ts)

Existing reusable constant:
- `MULTI_ROOT_HINT = " Use @workspace:path syntax (e.g., @frontend:src/index.ts) to specify a workspace."`

Use:
- when `context.isMultiRootEnabled === true`, include a one-line continuation reminder built directly from `MULTI_ROOT_HINT`

Recommended final line shape:
- `- Use @workspace:path syntax (e.g., @frontend:src/index.ts) to specify a workspace.`

Implementation note:
- trim the leading space from `MULTI_ROOT_HINT` rather than rewriting the sentence

### 3. Indxr line

Source file:
- [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts)

Existing reusable constant:
- `INDXR_EXPLORATION_PREFERENCE_GUIDANCE`

Optional secondary constant:
- `BUILTIN_FILE_TOOL_FALLBACK_GUIDANCE`

Use:
- when `hasConnectedIndxrServer(context) === true`, include the existing Indxr preference sentence

Recommended final line shape:
- exactly `INDXR_EXPLORATION_PREFERENCE_GUIDANCE`

Implementation note:
- do not include the second fallback sentence in the first pass unless testing shows the single sentence is insufficient
- this keeps the continuation prompt small

### 4. Focus chain checklist block

Primary source of checklist data:
- `taskState.currentFocusChainChecklist`

Existing rendering logic source:
- [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)

Relevant existing helper:
- private `renderChecklistForPrompt(checklist)` currently renders:
  - opening ```` ```text ````
  - trimmed checklist
  - closing fence

Use:
- when a focus chain checklist exists, include:
  - `CURRENT TASK LIST`
  - the current checklist rendered in the same fenced-text style

Implementation note:
- do not invent a new checklist rendering format
- either:
  - extract `renderChecklistForPrompt(...)` into a reusable exported helper, or
  - reproduce that exact fenced-text rendering in the continuation component

### 5. Focus-chain reminder line

This must be context-sensitive.

#### Placeholder workflow active

Source files:
- [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts)
- [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)

Existing exact line:
- `When the active step's "Done Signal" is true, use \`task_progress\` with \`__COMPLETE_NEXT_STEP__\` on the next relevant tool call, and use it only once in that assistant turn.`

Use:
- only when placeholder-workflow behavior is active
- specifically when the task is in the focus-chain / active-step style flow where this sentence already appears today

#### Generic focus chain checklist active, but no placeholder workflow

Source file:
- [focus-chain/prompts.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/prompts.ts)

Existing exact reminder:
- `If you finish the current checklist step, include "task_progress" in your next tool call so the checklist advances.`

Use:
- when a focus chain checklist exists but placeholder-workflow step guidance is not active

Why this split matters:
- the “Done Signal” sentence is not a generic focus-chain rule in the current codebase
- it is a placeholder-workflow-specific instruction
- generic focus-chain continuation should reuse `FocusChainPrompts.reminder` instead of borrowing placeholder-workflow wording

## Recommended Final Dynamic Logic

Base prompt always includes:
- static continuation intro
- native tool schema line
- cwd / explicit path line
- current mode response-tools line
- ask-user-only-if-needed line
- next-concrete-step line

Add these only when true:
- `context.isMultiRootEnabled === true`
  - include trimmed `MULTI_ROOT_HINT`
- `hasConnectedIndxrServer(context) === true`
  - include `INDXR_EXPLORATION_PREFERENCE_GUIDANCE`
- `taskState.currentFocusChainChecklist` exists
  - include `CURRENT TASK LIST`
  - include fenced checklist
  - include:
    - placeholder-workflow done-signal line when placeholder-workflow step guidance is active
    - otherwise `FocusChainPrompts.reminder`

## Things To Reuse Exactly

Reuse existing wording/logic from these places rather than inventing new near-duplicates:
- response-tool selection logic from `response_tools.ts`
- multi-root wording from `MULTI_ROOT_HINT`
- Indxr sentence from `INDXR_EXPLORATION_PREFERENCE_GUIDANCE`
- placeholder-workflow done-signal sentence from `task_progress.ts` / `focus-chain/index.ts`
- generic focus-chain reminder from `FocusChainPrompts.reminder`
- focus-chain checklist fenced rendering style from `focus-chain/index.ts`
