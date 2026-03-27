## Goal

Fix the `Human Input Double-Tagged in Prompts` finding from [test-18-findings.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-18-findings.md) so normal next-turn human input is framed exactly once instead of nesting `[LATEST HUMAN USER INPUT]` inside `[NORMAL NEXT-TURN HUMAN INPUT]`.

## Problem Summary

The current implementation in [responses.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/responses.ts) makes `formatResponse.normalNextTurnDialogue(...)` call `formatResponse.latestHumanInput(...)` verbatim. That creates two wrappers around the same content:

- `[NORMAL NEXT-TURN HUMAN INPUT]`
- `[LATEST HUMAN USER INPUT]`

This is mechanical, not conditional, so every prompt path using `normalNextTurnDialogue(...)` inherits the duplicate framing.

## Implementation Steps

### 1. Refactor the human-input framing helpers in `responses.ts`

File: [src/core/prompts/responses.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/responses.ts)

Current change points:
- [responses.ts:168](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/responses.ts#L168)
- [responses.ts:177](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/responses.ts#L177)

Required changes:
- Introduce one shared low-level helper that formats the tagged raw content block:
  - `<task>...</task>`
  - `<feedback>...</feedback>`
  - `<user_message>...</user_message>`
- Keep `latestHumanInput(...)` as the canonical helper for the reopened-thread / latest-human-input framing, but have it compose from the raw content helper rather than duplicating structure inline.
- Change `normalNextTurnDialogue(...)` so it composes from raw tagged content, not from `latestHumanInput(...)`.
- Preserve the distinct wrapper text for each helper:
  - `latestHumanInput(...)` should still emit `[LATEST HUMAN USER INPUT]`
  - `normalNextTurnDialogue(...)` should still emit `[NORMAL NEXT-TURN HUMAN INPUT]`
- Do not remove either helper; the fix is to remove nested wrappers, not to collapse both concepts into one label.

Recommended implementation shape:
- Add a private helper in `responses.ts`, for example:
  - `formatTaggedHumanInputContent(tag, text)`
- Then:
  - `latestHumanInput(...) = [header, explanatory line, formatTaggedHumanInputContent(...)]`
  - `normalNextTurnDialogue(...) = [header, explanatory line, formatTaggedHumanInputContent(...)]`

Acceptance criteria:
- `normalNextTurnDialogue(...)` no longer contains `[LATEST HUMAN USER INPUT]`.
- The actual payload tag block remains unchanged.

### 2. Update the unit tests that currently encode the nested behavior

File: [src/core/prompts/__tests__/responses.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/__tests__/responses.test.ts)

Current change points:
- [responses.test.ts:14](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/__tests__/responses.test.ts#L14)

Required changes:
- Update the `wraps normal next-turn dialogue separately from reopened-thread copy` test so it asserts:
  - `[NORMAL NEXT-TURN HUMAN INPUT]` is present
  - the tagged `<user_message>...</user_message>` block is present
  - `[LATEST HUMAN USER INPUT]` is **not** present
- Keep the reopened-thread test intact for `latestHumanInput(...)` behavior, but add a stronger assertion that this path alone owns the `[LATEST HUMAN USER INPUT]` wrapper.
- Add a direct regression assertion that the two helpers are peers, not nested compositions.

Recommended additional test:
- A helper-specific test that compares:
  - `formatResponse.latestHumanInput("user_message", "...")`
  - `formatResponse.normalNextTurnDialogue("user_message", "...")`
  and asserts each contains only its own top-level wrapper label.

Acceptance criteria:
- The tests fail if `normalNextTurnDialogue(...)` ever re-embeds `latestHumanInput(...)`.

### 3. Spot-check adjacent prompt consumers that rely on these helpers

Primary consumer references:
- [responses.ts:415](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/responses.ts#L415)
- [responseToolTurnFlow.test.ts:20](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/responseToolTurnFlow.test.ts#L20)

Required changes:
- Review prompt assembly sites that use `latestHumanInput(...)` and `normalNextTurnDialogue(...)` to confirm the fix does not change semantic routing:
  - reopened-thread / latest-human-input contexts should continue using `latestHumanInput(...)`
  - normal next-turn follow-up / deferred response-tool content should continue using `normalNextTurnDialogue(...)`
- No logic rewrite is expected here unless any caller was compensating for the previous nested structure.

Acceptance criteria:
- The framing fix changes only the duplicated wrapper text, not the turn-routing semantics.

### 4. Add or update regression coverage for response-tool follow-up formatting if needed

Candidate file:
- [src/core/task/__tests__/responseToolTurnFlow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/responseToolTurnFlow.test.ts)

Why:
- This file already uses `formatResponse.normalNextTurnDialogue(...)` in deferred follow-up turn content.
- While it currently compares exact strings built with the helper, it does not independently assert the absence of nested human-input markers.

Required changes:
- Add one focused assertion in this test file, or a nearby prompt-format test, that a synthesized normal next-turn follow-up contains:
  - `[NORMAL NEXT-TURN HUMAN INPUT]`
  - the expected tagged content
  - no `[LATEST HUMAN USER INPUT]`

Acceptance criteria:
- The follow-up user-content path is explicitly protected against reintroducing nested markers.

## Verification

Run at least:

1. `npm run test:unit -- --exit src/core/prompts/__tests__/responses.test.ts src/core/task/__tests__/responseToolTurnFlow.test.ts`
2. `npx tsc --noEmit`

If broader prompt-format tests already cover these helpers transitively, they can be run as an additional confidence pass, but the two files above should be the direct regression boundary.

## Expected Result

After these changes:
- normal next-turn human input is tagged once
- reopened-thread latest human input is tagged once
- the two helper formats remain distinct, but no longer nest one another
- prompt tests clearly encode the non-nesting contract so this regression cannot silently return
