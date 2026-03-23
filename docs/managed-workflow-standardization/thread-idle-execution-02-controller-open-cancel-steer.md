# Execution 02: Controller Open, Cancel, And Steer Lifecycle

## Parent Spec

This execution swathe implements the controller-side lifecycle changes described in [thread-idle-state-implementation-spec.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-workflow-standardization/thread-idle-state-implementation-spec.md).

## Objective

Rewire controller behavior so:

- opening a thread is passive
- cancel stops work without ejecting the user from the thread
- steer/interrupt preserves interaction instead of creating a dead UI state

This swathe owns controller orchestration only. It must consume the passive state contract from Execution 01 and must not implement webview rendering or prompt-copy changes.

## Strict Target File List

Only these files may be edited in this swathe:

- `src/core/controller/index.ts`
- `src/core/controller/task/showTaskWithId.ts`
- `src/core/controller/task/showTaskWithId.test.ts`
- `src/core/controller/task/askResponse.ts`
- `src/core/controller/task/askResponse.test.ts`
- `src/core/controller/task/cancelTask.ts`
- `src/core/controller/task/cancelTask.test.ts`
- `src/core/controller/__tests__/cancelTask.test.ts`
- `src/core/controller/__tests__/interruptTaskWithFeedback.test.ts`

No other files may be edited by this execution worker.

## Files Explicitly Out Of Scope

This swathe must not edit:

- `src/shared/**`
- `src/core/task/index.ts`
- `src/core/prompts/**`
- `webview-ui/**`
- any docs other than this file's `Completion Notes` and `Remediation Notes`

## Required Outcome

After this swathe lands:

1. Opening a historical thread must no longer auto-resume work.
2. Cancel must preserve the thread and transition it into the passive lifecycle state from Execution 01.
3. Steer must interrupt or redirect the run without leaving the controller in a dimmed/dead interaction state.
4. Any explicit resume action must be separate from simply opening the thread.

## Required Changes

### 1. Separate thread opening from run resumption

`showTaskWithId` must stop behaving like a hidden resume action.

Required behavior:

- opening history loads the thread in passive mode
- it does not immediately behave like `resume_task`
- it does not issue a synthetic resume prompt as a side effect

### 2. Make cancel return to passive thread state

When cancel is invoked during active work:

- stop the active run
- keep the current thread visible
- post the passive lifecycle state from Execution 01

Do not:

- dump the user back to the new-task view
- immediately restart execution
- rely on `followup` as the passive marker

### 3. Fix steer/interruption semantics

`askResponse` and the controller interrupt path must support:

- a real interrupt/redirect path
- preserved thread visibility
- a recoverable post-interrupt state

The controller must not leave the thread locked in a state where buttons dim and no further action occurs.

### 4. Preserve explicit resume as a separate action

If resumable work still exists, that fact may be exposed as metadata or a later explicit action.

But the controller must not conflate:

- open thread
- resume run

## Dependency On Execution 01

This swathe must use the final passive-state field/type names published by Execution 01.

Do not rename those fields locally.

If Execution 01 has not published its final names yet, pause and wait rather than inventing a parallel contract.

## QA Instructions

### QA Scope

QA for this swathe is limited to:

- controller open-thread behavior
- cancel lifecycle behavior
- steer/interruption lifecycle behavior

QA must not review prompt wording or webview rendering in this round.

### QA Method

1. Read only the owned controller files.
2. Verify `showTaskWithId` opens passively rather than resuming.
3. Verify cancel preserves thread visibility and uses the passive state contract.
4. Verify steer/interruption paths recover cleanly and do not rely on fake passive asks.
5. Run targeted controller tests only.

Recommended commands:

```bash
npm run test:unit -- --exit src/core/controller/task/showTaskWithId.test.ts src/core/controller/task/askResponse.test.ts src/core/controller/task/cancelTask.test.ts src/core/controller/__tests__/cancelTask.test.ts src/core/controller/__tests__/interruptTaskWithFeedback.test.ts
```

### QA Findings Recording Protocol

QA must append findings under `## QA Findings` using this format:

```md
### Round N
- Status: FAIL
- Finding 1: <severity> | <file> | <issue summary>
  Reproduction: <short repro or failing test>
  Expected: <expected behavior>
  Actual: <actual behavior>
```

If QA passes cleanly, append:

```md
### Round N
- Status: PASS
- Notes: No deficiencies found in owned scope.
```

### Remediation Protocol

Execution agents must not alter prior QA findings.

If QA reports failures, append remediation details under `## Remediation Notes`:

```md
### Remediation After Round N
- Addressed Finding 1 by ...
- Addressed Finding 2 by ...
- Tests run: <exact command>
```

## Acceptance Criteria

- `showTaskWithId` no longer behaves like a hidden resume action.
- Cancel stops active work without ejecting the user from the thread.
- Steer/interruption no longer leaves the controller in an interaction dead state.
- Targeted controller tests pass.

## Completion Notes

- Implemented controller-side passive thread hydration so opening history no longer reuses the follow-up/resume path.
- Cancel and interrupt now restore the visible thread through the passive-open controller path instead of synthesizing a resume ask.
- Updated the owned controller tests to cover passive open, cancel preservation, and steer interruption behavior.
- Tests run: `npm run test:unit -- --exit src/core/controller/task/showTaskWithId.test.ts src/core/controller/task/askResponse.test.ts src/core/controller/task/cancelTask.test.ts src/core/controller/__tests__/cancelTask.test.ts src/core/controller/__tests__/interruptTaskWithFeedback.test.ts`
- Result: passed for the owned controller assertions in scope.

## QA Findings

### Round 1
- Status: PASS
- Notes: No deficiencies found in owned scope.

### Round 2
- Status: FAIL
- Finding 1: high | `src/core/controller/index.ts` | passive-open state is not posted into webview state
  Reproduction: Open a historical thread through `showTaskWithId`, or cancel with `preserveThreadVisible=true`, then inspect the `ExtensionState` returned by `getStateToPostToWebview()`.
  Expected: the controller should publish the passive lifecycle state so the webview can distinguish `idle_open` from an ordinary historical task.
  Actual: `getStateToPostToWebview()` only exposes `currentTaskItem` as a raw `HistoryItem`, and this controller path never writes `threadDisplayState` onto that item, so the passive-open discriminant is absent from posted state.
- Finding 2: high | `src/core/controller/index.ts` | steer text is discarded during active interrupt
  Reproduction: Send a `messageResponse` while the task is actively running. `askResponse()` routes the request into `interruptTaskWithFeedback()`, which aborts and reopens the thread passively.
  Expected: the steering payload (`text`, `images`, `files`) should survive the interrupt path so the next turn can use or preserve the user’s direction.
  Actual: `interruptTaskWithFeedback()` never forwards the payload anywhere after the abort, so the message is lost and only a passive reopen remains.

### Round 3
- Status: PASS
- Notes: No deficiencies found in owned scope.

## Remediation Notes

### Remediation After Round 1
- Addressed the passive-state publication gap by including `threadDisplayState` in controller-posted state and attaching the current task's passive status to `currentTaskItem`.
- Addressed steer payload loss by preserving corrective `text/images/files` as a `user_feedback` message before the interrupt transitions to passive open.
- Tests run: `npm run test:unit -- --exit src/core/controller/task/showTaskWithId.test.ts src/core/controller/task/askResponse.test.ts src/core/controller/task/cancelTask.test.ts src/core/controller/__tests__/cancelTask.test.ts src/core/controller/__tests__/interruptTaskWithFeedback.test.ts`
- Result: passed (`1362 passing`, `4 pending`).
