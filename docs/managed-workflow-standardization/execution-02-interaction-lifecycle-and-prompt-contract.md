# Execution 02: Interaction Lifecycle And Prompt Contract

## Objective

Restore direct human-agent interaction during and after managed workflows by changing prompt/lifecycle behavior so workflow control no longer walls off the conversation.

This workstream owns prompt assembly, managed-workflow rendering, interaction lifecycle, and reopen/cancel/steer semantics. It must not edit authored workflow markdown in `.cline/skills`.

## Why This Exists

Even after workflow authoring improvements, the runtime still exerts too much control over interaction:

- reopening a task immediately injects `resume_task` or `resume_completed_task`
- there is no true passive reopened-thread idle state
- step-level dialogue instructions are advisory only
- the system prompt strongly discourages asking the user unless input is strictly required
- checkpoints and completion states are still treated as gating mechanisms for communication

The result is that workflow guidance becomes a wall between the human and the agent.

## Discovery Summary

The current interaction constraints are spread across:

- [showTaskWithId.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/task/showTaskWithId.ts)
  - reopening a task always calls `initTask(...historyItem)`
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/index.ts)
  - `initTask()` always calls `resumeTaskFromHistory()` for history items
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
  - `resumeTaskFromHistory()` always issues `ask("resume_task" | "resume_completed_task")`
- [ManagedWorkflowRenderer.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRenderer.ts)
  - renders `Actions`, `Asks`, `Outputs`, and checkpoint rules only as prompt text
- [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts)
  - frames managed workflows as backend-owned progress with strong completion pressure
- [rules.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/rules.ts)
  - says not to ask for more information than necessary
  - says the goal is to accomplish the task, not engage in back-and-forth conversation
  - says `attempt_completion` should never end with a question
- [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts)
  - controls steer/cancel UI behavior

## Owned Write Scope

This workstream owns only these areas:

- `src/core/prompts/**`
- `src/core/task/managed-workflows/ManagedWorkflowRenderer.ts`
- `src/core/controller/**` when needed for reopen/cancel/steer lifecycle
- `src/core/task/index.ts` only for resume/open idle-state lifecycle changes
- `webview-ui/**`
- prompt/lifecycle tests under `src/core/**/__tests__`
- UI tests under `webview-ui/**`

This workstream must not edit:

- `.cline/skills/**`
- `docs/managed-bmad-workflow-formatting-guide.md`
- runtime checkpoint-resolution logic owned by Execution 01, except for prompt-copy updates that consume the new runtime contract

## Required Design Outcome

After this refactor:

1. Managed workflow guidance should keep the agent aware of the workflow, not prevent dialogue.
2. Reopening a task thread should be able to show the conversation without auto-resuming execution.
3. Cancel should stop work and leave the thread interactable.
4. Steer should interrupt reliably without trapping the UI in a dimmed dead state.
5. Prompt assembly must clearly separate:
   - human-authored input
   - system-generated context
   - workflow state guidance

## Required Changes

### 1. Introduce a true idle reopened-thread state

Implement a passive state for opened historical tasks where:

- the thread can be shown without immediately issuing `resume_task` or `resume_completed_task`
- the human can speak first
- the agent does not auto-jump back into work

Expected impact areas:

- `showTaskWithId`
- `initTask`
- `resumeTaskFromHistory`
- button config / ask-state UI

### 2. Fix cancel semantics

Cancel must:

- stop active work
- keep the current thread visible
- return the thread to an interactable idle/passive state

Cancel must not:

- dump the user back to the blank new-conversation view
- reopen the thread into an auto-resume state

### 3. Fix steer semantics

Steer must:

- reliably interrupt active work
- preserve the thread context
- let the human provide corrective feedback mid-workflow

Acceptance requirement:

- clicking `Steer` must not leave the UI dimmed and unresponsive
- if interruption fails, the UI must recover visibly rather than silently deadlocking

### 4. Reduce prompt bias against dialogue

Revise prompt assembly so the system stops over-constraining interaction.

Required prompt changes:

- keep human-authored input first and clearly labeled
- clearly label everything after that as system-generated context
- relax wording that implies conversation is undesirable
- stop treating all user questions as exceptional unless strictly required

Specific targets:

- [rules.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/rules.ts)
- [task_progress.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/task_progress.ts)
- any prompt assembly files responsible for ordering and labeling human input vs generated context

### 5. Render interactive workflow obligations more explicitly

This workstream owns the presentation-side update for workflow dialogue obligations.

Required behavior:

- `Asks` should read as actual conversational obligations, not decorative prompt prose
- regular steps that include user interaction should be rendered in a way that signals pause-and-engage behavior
- the renderer should consume the new runtime contract from Execution 01 once available

Important:

- do not change authored workflow markdown here
- do not invent new workflow syntax here

### 6. Keep user communication independent from workflow progression

Prompt and lifecycle behavior must assume:

- workflow tools progress workflow state
- response tools communicate with the human
- mistakes in workflow progression should not cut off the conversation

## Required Test Changes

Update or add tests for:

- opening a historical task without auto-resume
- cancel returning the thread to an interactable passive state
- steer interrupting active work and preserving follow-up interaction
- prompt ordering showing human input first and generated context second
- managed workflow prompt rendering that supports dialogue without collapsing into raw XML or duplicated prose

Suggested targets:

- controller tests around `showTaskWithId`, `cancelTask`, and `interruptTaskWithFeedback`
- task resume tests
- prompt snapshot/integration tests
- webview button/input state tests

## Deliverables

- interaction lifecycle changes
- prompt/lifecycle test updates
- a short implementation note in this file under `## Completion Notes`

## Completion Notes

- Reopened historical tasks and user-facing cancel/steer paths now enter the passive `followup` ask state instead of auto-resuming with `resume_task` / `resume_completed_task`.
- Added controller and handler coverage for passive reopen, visible cancel, and steer interruption behavior.
- Prompt assembly now softens follow-up-question guidance, labels managed-workflow task progress as human-authored input versus system-generated context, and renders passive reopened-thread followups without a question prompt when no actual question payload is present.
- QA round 2 passed after remediation. The prompt-contract and passive reopen findings were resolved, and the remaining test failure encountered during verification was in the standalone packaging/archive step rather than this interaction slice.

## QA Findings

- Resolved: the prompt-contract slice now relaxes follow-up-question guidance in shared prompt assembly, and managed-workflow task progress explicitly labels human-authored input and system-generated context.
- Resolved: the reopened-thread `followup` state now renders passive copy when it is not carrying an actual question payload, so the thread can open without presenting itself as a live question.
