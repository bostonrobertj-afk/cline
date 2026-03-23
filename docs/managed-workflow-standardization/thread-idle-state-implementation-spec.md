# Thread Idle State Implementation Spec

## Objective

Add a true passive thread-idle state to Cline so reopening, cancelling, or interrupting a task can leave the conversation visible and interactable without forcing the backend to issue a resume-style prompt.

The target outcome is:

- opening a historical thread shows the thread and waits for the human to speak first
- cancel stops active work and returns the thread to a passive state instead of dumping the user out of the thread
- steer/interrupt can stop active work without converting the thread into a synthetic ask state
- thread navigation, run status, and follow-up policy become separate concerns

## Why This Spec Exists

Current Cline behavior is still centered on `ask` states:

- active execution
- `resume_task`
- `resume_completed_task`
- `completion_result`
- other ask/button states

That creates a lifecycle gap:

- there is no first-class state meaning “thread is open, nothing is actively prompting, and the human may speak first”

This gap explains several observed problems:

- reopening a thread behaves like the system is prompting the agent again
- canceling work dumps the user out of the thread or reopens into a synthetic prompt state
- steer/interruption needs to fake passivity through `followup`
- interaction semantics are coupled to task/ask semantics

## External Design Signal

The installed Codex VS Code extension suggests a different architecture:

- it exposes an explicit follow-up handling policy: `queue`, `steer`, `interrupt`
  - see [`package.json:128`](/Users/robertboston/.vscode/extensions/openai.chatgpt-26.318.11754-darwin-arm64/package.json#L128)
- it appears to track thread/run lifecycle by status and events rather than by resume asks
  - conversation tracking uses symbols like `pendingConversations`, `registerPendingConversation(...)`, and `updateConversationStatus(...)`
  - status changes are driven by events such as `codex/event/task_started`, `codex/event/task_complete`, and `codex/event/turn_aborted`
  - see the installed bundle at [`out/extension.js`](/Users/robertboston/.vscode/extensions/openai.chatgpt-26.318.11754-darwin-arm64/out/extension.js)
- local conversation opening appears to navigate to a conversation route rather than emitting a resume prompt
  - see [`use-navigate-to-local-conversation-CSadjK7W.js`](/Users/robertboston/.vscode/extensions/openai.chatgpt-26.318.11754-darwin-arm64/webview/assets/use-navigate-to-local-conversation-CSadjK7W.js)

Inference:

- Codex likely separates:
  - thread navigation/display
  - run status
  - follow-up policy
- Cline currently conflates those concerns inside task initialization and ask handling

This spec adopts that separation for Cline without attempting to copy Codex implementation details verbatim.

## Non-Goals

This work does not need to:

- redesign managed workflow execution semantics
- remove existing ask states that are still valid for real user questions
- change the meaning of `attempt_completion`
- redesign the entire task history storage model
- add cloud-thread synchronization or cross-device thread state

## Current Cline Behavior

### Reopen Path

When a historical thread is opened:

1. [`showTaskWithId.ts`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/task/showTaskWithId.ts) calls `initTask(...historyItem)`
2. [`index.ts`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/index.ts) sees `historyItem` and calls `resumeTaskFromHistory()`
3. [`src/core/task/index.ts`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts) issues `ask("resume_task" | "resume_completed_task")`

This means “open thread” is not passive. It is a live task-resume operation.

### Cancel Path

Cancel currently has to choose between bad options:

- clear the active task and lose the current thread view
- or reopen the thread through the same resume-driven path

### Steer Path

Steer currently has to interrupt active work and then fake passivity through an ask-like path, which is brittle and UI-sensitive.

## Proposed Model

Introduce a first-class passive thread state separate from ask states.

### New Concept: Thread Display State

Add an explicit UI/backend concept for thread display mode:

- `active_run`
- `awaiting_user_response`
- `completed`
- `idle_open`
- optionally `paused`

Definitions:

- `active_run`
  - model or tools are actively executing
- `awaiting_user_response`
  - the agent has intentionally asked the user something and is waiting
- `completed`
  - the task reached a normal completion boundary
- `idle_open`
  - the thread is visible
  - no active ask is pending
  - no auto-resume should occur
  - the human may send the next message directly
- `paused`
  - optional explicit state for interrupted runs that are neither active nor completed

### Key Principle

Thread visibility must not imply task resumption.

Opening a thread from history should become:

- “display the thread in passive mode”

not:

- “rehydrate a live task and immediately ask the user whether to resume”

## Required Architecture Changes

## 1. Separate Thread Opening From Task Resumption

### Current Problem

`showTaskWithId()` currently reinitializes a live task.

### Required Change

Introduce a passive thread-open path that:

- loads thread history/messages
- posts them to the webview
- sets thread display mode to `idle_open`
- does not call `resumeTaskFromHistory()`
- does not emit `resume_task` or `resume_completed_task`

Implementation direction:

- keep a path for explicit resume when needed
- split “open existing thread” from “resume existing task”

Likely impact areas:

- [`src/core/controller/task/showTaskWithId.ts`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/task/showTaskWithId.ts)
- [`src/core/controller/index.ts`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/index.ts)
- [`src/core/task/index.ts`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- thread-state projection sent through `postStateToWebview()`

## 2. Add Explicit Passive Thread State To Extension State

### Required Change

Extend the state sent to the webview so the frontend can distinguish:

- active run
- real ask
- passive open thread
- completed thread

The frontend must not infer passivity from:

- absence of partial content
- specific ask strings
- presence or absence of `completion_result`

Instead it should receive explicit thread/task lifecycle state.

Likely impact areas:

- extension state types
- controller state serialization
- webview context/state hooks

## 3. Reserve Ask States For Real Questions

### Required Change

`followup`, `resume_task`, and `resume_completed_task` must no longer be abused to represent passivity.

Rules:

- use `ask` states only when the agent/runtime is genuinely requesting a user decision or answer
- do not use `followup` as a synthetic passive-thread marker
- do not use `resume_*` as a default thread-open state

The UI should render a passive open thread using explicit thread display state, not a fake question bubble.

## 4. Introduce Explicit Resume Actions

### Required Change

If a user wants to resume a paused/incomplete task, that should become an explicit action, not an automatic side effect of opening the thread.

Examples:

- “Resume Task” button shown only when a resumable run actually exists
- explicit command to continue a paused run

This keeps:

- open thread
- resume run

as separate user intents.

## 5. Redesign Cancel Around Passive State

### Required Change

Cancel should:

- abort active work
- preserve the thread
- transition the thread to `idle_open` or `paused`
- keep composer and controls usable

Cancel should not:

- clear the thread from view
- route through `resume_task`
- fabricate an active-looking follow-up question

## 6. Redesign Steer Around Follow-Up Policy

### Required Change

Add explicit follow-up policy semantics similar to the Codex model:

- queue
- steer
- interrupt

These may be runtime behaviors or user-configurable behaviors.

Minimum requirement:

- the backend should know whether a new human message is meant to:
  - queue behind active work
  - redirect current work
  - hard-interrupt current work

The result must not depend on reusing ask-state machinery to represent passive idle.

## 7. Update UI Rendering

### Required Change

The webview should render passive threads distinctly from questions.

When `threadDisplayState === idle_open`:

- do not render “Cline has a question:”
- do not disable input
- do not show resume-style CTA unless resumable work explicitly exists
- show neutral language such as:
  - “Conversation reopened”
  - or no status banner at all

Likely impact areas:

- [`webview-ui/src/components/chat/ChatRow.tsx`](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)
- button config / chat state derivation
- message handlers and composer enablement

## Proposed Lifecycle Model

### States

1. `running`
2. `awaiting_user_response`
3. `completed`
4. `idle_open`
5. `paused` (optional but recommended)

### Allowed Transitions

- `running -> awaiting_user_response`
  - agent asks the user a real question
- `running -> completed`
  - task completes normally
- `running -> paused`
  - user interrupts/cancels but chooses to preserve thread/run context
- `running -> idle_open`
  - system aborts execution and leaves the thread passive
- `completed -> idle_open`
  - user reopens a completed thread
- `paused -> idle_open`
  - user opens thread without resuming it
- `idle_open -> running`
  - human sends a new message that starts or resumes work explicitly
- `idle_open -> awaiting_user_response`
  - should generally not happen directly

### Important Constraint

`idle_open` must be stable and non-transient. It cannot merely be a special rendering of some existing ask state.

## UX Expectations

### Reopen Completed Thread

Expected:

- thread opens
- no resume ask appears
- input is enabled
- human can say something immediately

### Reopen Incomplete Thread

Expected:

- thread opens passively
- if resumable work exists, show an explicit resume affordance
- human may either resume or send a new message first

### Cancel During Active Run

Expected:

- active work stops
- thread remains visible
- UI returns to passive interactable state

### Steer During Active Run

Expected:

- the chosen policy is applied
- on interrupt/steer, thread remains usable
- no dimmed dead state

## Test Plan

Add or update tests for:

- opening completed thread yields `idle_open`, not `resume_completed_task`
- opening incomplete thread yields passive open state plus explicit resumable metadata
- cancel transitions active run to passive thread state
- steer transitions preserve interaction without fake follow-up prompts
- UI renders passive open thread without “has a question” messaging
- sending a new message from `idle_open` starts a new active turn cleanly

Likely test targets:

- controller tests around `showTaskWithId`
- controller/task cancel tests
- interrupt/steer tests
- webview rendering tests
- state serialization tests

## Acceptance Criteria

- Opening a thread from history no longer auto-resumes execution.
- Completed and incomplete threads can both be opened passively.
- Cancel no longer ejects the user from the thread.
- Passive thread open is represented by explicit lifecycle state, not a fake ask state.
- UI text for passive thread open is neutral and non-questioning.
- Real questions still use real ask states.
- Steer/interrupt behavior is compatible with passive thread open and does not deadlock the UI.

## Primary Files Likely To Change

- [`src/core/controller/task/showTaskWithId.ts`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/task/showTaskWithId.ts)
- [`src/core/controller/index.ts`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/index.ts)
- [`src/core/task/index.ts`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- task/extension state typing and serialization files
- [`webview-ui/src/components/chat/ChatRow.tsx`](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)
- webview button/configuration/state hooks

## Suggested Execution Order

1. Define explicit thread display state in shared state/types.
2. Split passive thread open from explicit task resume in controller/task lifecycle.
3. Update cancel behavior to target passive state.
4. Update steer/follow-up policy to work with passive state.
5. Update webview rendering and composer/button behavior.
6. Add focused tests for reopen, cancel, and passive rendering.

## Open Questions

- Should `paused` be a separate first-class state, or is `idle_open + resumable metadata` sufficient?
- Should follow-up policy become a user-visible setting in Cline, similar to Codex’s `queue / steer / interrupt` model?
- Should passive thread open show any banner at all, or should the thread simply open with no special status row?
