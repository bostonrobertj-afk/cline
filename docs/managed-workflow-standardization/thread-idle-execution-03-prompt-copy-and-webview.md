# Execution 03: Prompt Copy And Webview Passive Thread UX

## Parent Spec

This execution swathe implements the user-facing copy and webview behavior described in [thread-idle-state-implementation-spec.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-workflow-standardization/thread-idle-state-implementation-spec.md).

## Objective

Update prompt/copy and webview behavior so passive reopened threads look and behave passive to the human user.

This swathe owns prompt text, UI rendering, button/composer behavior, and frontend tests. It must consume the explicit passive-state contract from Execution 01 and the controller behavior from Execution 02.

## Strict Target File List

Only these files may be edited in this swathe:

- `src/core/prompts/responses.ts`
- `src/core/prompts/__tests__/responses.test.ts`
- `src/core/prompts/system-prompt/components/rules.ts`
- `src/core/prompts/system-prompt/components/task_progress.ts`
- `src/core/prompts/system-prompt/__tests__/rules.test.ts`
- `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
- `webview-ui/src/App.stories.tsx`
- `webview-ui/src/components/chat/ChatRow.tsx`
- `webview-ui/src/components/chat/ChatRow.test.tsx`
- `webview-ui/src/components/chat/chat-view/components/layout/ActionButtons.tsx`
- `webview-ui/src/components/chat/chat-view/components/layout/MessagesArea.tsx`
- `webview-ui/src/components/chat/chat-view/hooks/useChatState.ts`
- `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`
- `webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts`
- `webview-ui/src/components/chat/chat-view/shared/buttonConfig.test.ts`

No other files may be edited by this execution worker.

## Files Explicitly Out Of Scope

This swathe must not edit:

- `src/shared/**`
- `src/core/controller/**`
- `src/core/task/index.ts`
- any docs other than this file's `Completion Notes` and `Remediation Notes`

## Required Outcome

After this swathe lands:

1. Passive reopened threads must not present themselves as active questions.
2. The UI must keep the composer usable when a thread is passively open.
3. Button state must reflect actual passive/open behavior instead of fake running state.
4. Prompt/copy helpers must use neutral reopened-thread language rather than resume-question framing.

## Required Changes

### 1. Neutral passive-thread copy

Update response-formatting helpers so passive open state uses neutral wording.

Examples:

- "Conversation reopened"
- neutral context banner
- no synthetic resume question

Do not use copy that implies the agent is currently asking something unless there is a real ask payload.

### 2. Relax prompt pressure against ordinary collaboration

In the owned prompt files:

- keep clear distinction between human-authored input and system-generated context
- preserve collaborative question behavior as normal when the human should be able to speak next
- avoid wording that makes passive reopen look like an active instruction from the runtime

### 3. Webview rendering must respect passive state explicitly

The webview must stop inferring passivity from:

- `followup`
- missing partial content
- resume-style message heuristics

Instead, it must consume the explicit passive state from Execution 01.

### 4. Fix controls and composer behavior

When the thread is passively open:

- composer must be enabled
- cancel/steer controls must not stay dimmed as if a run is active
- any resume affordance must be explicit, not automatic

### 5. Update stories and tests

Add or update stories/tests so passive thread open is represented clearly in:

- chat row presentation
- action buttons
- passive/open message handling

## Dependency On Execution 01 And 02

This swathe must use:

- the final passive-state contract from Execution 01
- the passive controller behavior from Execution 02

Do not invent new frontend-only passive-state names.

## QA Instructions

### QA Scope

QA for this swathe is limited to:

- prompt/copy correctness in owned files
- passive thread UI rendering
- composer/button behavior in passive state
- owned stories/tests

QA must not review backend/controller implementation in this round.

### QA Method

1. Read only the owned files.
2. Verify passive threads render as passive, not as active questions.
3. Verify the composer stays enabled for passive reopen.
4. Verify button state reflects passive/open lifecycle correctly.
5. Run the owned prompt and webview tests.

Recommended commands:

```bash
npm run test:unit -- --exit src/core/prompts/__tests__/responses.test.ts src/core/prompts/system-prompt/__tests__/rules.test.ts src/core/prompts/system-prompt/__tests__/task_progress.test.ts webview-ui/src/components/chat/ChatRow.test.tsx webview-ui/src/components/chat/chat-view/shared/buttonConfig.test.ts
```

If story verification is done manually, record that explicitly in the QA notes.

### QA Findings Recording Protocol

QA must append findings under `## QA Findings` using this format:

```md
### Round N
- Status: FAIL
- Finding 1: <severity> | <file> | <issue summary>
  Reproduction: <short repro, screenshot note, or failing test>
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

Execution agents must not rewrite prior QA findings.

If QA reports failures, append remediation details under `## Remediation Notes`:

```md
### Remediation After Round N
- Addressed Finding 1 by ...
- Addressed Finding 2 by ...
- Tests run: <exact command>
- Manual verification: <if applicable>
```

## Acceptance Criteria

- Passive reopened threads render with neutral, non-question framing.
- Passive state keeps the composer and controls usable.
- Button state no longer relies on fake running heuristics for passive open.
- Owned prompt and UI tests pass.

## Completion Notes

- Added neutral reopened-thread prompt copy in `src/core/prompts/responses.ts` and tightened managed-workflow wording in `src/core/prompts/system-prompt/components/task_progress.ts`.
- Introduced explicit passive-open handling in the chat webview via `idle_open` support in the shared button config helper, passive banner rendering, composer send handling, and follow-up row presentation.
- Added/updated owned tests and Storybook coverage for passive-open thread UI, button state, and reopened-thread prompt copy.
- Tests run:
  - `npm run test:unit -- --exit src/core/prompts/__tests__/responses.test.ts src/core/prompts/system-prompt/__tests__/rules.test.ts src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
  - `npm run test -- src/components/chat/ChatRow.test.tsx src/components/chat/chat-view/shared/buttonConfig.test.ts` in `webview-ui/`
- Results:
  - Backend prompt/unit command passed.
  - Webview Vitest command passed (`2` files, `26` tests).

## QA Findings

### Round 1
- Status: PASS
- Notes: No deficiencies found in owned scope.

### Round 2
- Status: FAIL
- Finding 1: medium | webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts:18-19,33-34,320-329 | passive-open send handling can use a stale closure and miss the `idle_open` branch
  Reproduction: Reopen a thread so `currentTaskItem.threadDisplayState` becomes `idle_open`, then send a composer message without any other handler inputs changing. Because `handleSendMessage` reads `isPassiveThreadOpenState` but does not list it in the callback dependencies, the memoized handler can keep the pre-reopen value.
  Expected: passive-open composer sends should always route through the passive-open path for the current thread state.
  Actual: the stale callback can fall through to the active-run check, leaving the message unsent instead of treating the reopened thread as passive.

### Round 3
- Status: PASS
- Notes: No deficiencies found in owned scope.

## Remediation Notes

### Remediation After Round 1
- Addressed the passive-open stale-closure issue in `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts` by including the current passive-open state in the `handleSendMessage` callback dependencies, so reopened threads keep routing composer sends through the current `idle_open` path.
- Tests run: `npm run test -- src/components/chat/ChatRow.test.tsx src/components/chat/chat-view/shared/buttonConfig.test.ts` in `webview-ui/`
- Manual verification: not performed; the targeted webview tests passed.
