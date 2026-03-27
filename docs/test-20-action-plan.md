# Test 20 Action Plan

## Final Requirements

1. Remove `enableButtons` as a durable shared chat-state authority.
   - `Steer` / `Cancel` availability must be determined by the footer's current `buttonConfig` plus the local `isProcessing` latch in [ActionButtons.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/components/layout/ActionButtons.tsx).
   - `useMessageHandlers.ts` must stop writing `setEnableButtons(false)` / `setEnableButtons(true)`.
   - `useChatState.ts` and `chatTypes.ts` must stop storing `enableButtons`, `setEnableButtons`, `primaryButtonText`, `secondaryButtonText`, `setPrimaryButtonText`, and `setSecondaryButtonText`.

2. Make composer disabled state canonical and state-driven only.
   - The composer send path (`Enter` and the send icon in [ChatTextArea.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatTextArea.tsx)) must be disabled only for:
     - `active_run`
     - `awaiting_user_response.system`
   - The composer send path must be enabled for:
     - `active_user`
     - `idle_open`
     - `completed`
     - `paused`
     - `awaiting_user_response.user`
     - missing / undefined thread state
   - No code path may imperatively call `setSendingDisabled(...)` after this change.

3. Keep `awaiting_user_response` as the top-level state, but add a subtype discriminator.
   - `awaiting_user_response.user`
     - Scope: the run is awaiting human input, approval, or selection.
     - The composer is enabled.
     - The next user response resumes the blocked ask/run using the existing ask-response mechanism.
   - `awaiting_user_response.system`
     - Scope: the current ask/message state is internal system or tool-preview plumbing and is not a true human wait state.
     - The composer is disabled.
   - `askResponse.ts` must remain unchanged in this remediation. Backend ask-response routing continues to fall through to `handleWebviewAskResponse(...)` for `awaiting_user_response`.

4. Do not introduce new footer-button mappings for the new subtypes.
   - [buttonConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts) remains responsible for deciding which buttons appear and which actions they map to.
   - There is no new requirement for `.user` vs `.system` to show different footer actions in this change set.

5. Preserve current auto-focus behavior without reintroducing shared UI authority.
   - [ChatView.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatView.tsx) must continue suppressing composer auto-focus when footer actions are visible.
   - That suppression must be derived fresh from the current footer config, not from shared `enableButtons` state.

6. Make loader suppression subtype-aware.
   - `awaiting_user_response.user` is a user-ready wait state and must suppress the synthetic "Thinking..." row.
   - `awaiting_user_response.system` is not user-ready and must not be treated as a loader-suppressing wait state.

## Canonical Representation

### Shared Type Additions

In [src/shared/ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts):

- Immediately after `ThreadDisplayState`, add:

```ts
export const AwaitingUserResponseSubtypes = {
	USER: "user",
	SYSTEM: "system",
} as const

export type AwaitingUserResponseSubtype =
	(typeof AwaitingUserResponseSubtypes)[keyof typeof AwaitingUserResponseSubtypes]
```

- Add `awaitingUserResponseSubtype?: AwaitingUserResponseSubtype` to:
  - `ExtensionState`
  - `ClineMessage`

Do not add this field to `HistoryItem`. It is runtime UI state, not persisted task-history metadata.

### Proto Additions For Partial Message Streaming

In [proto/cline/ui.proto](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/ui.proto):

- Immediately after `ThreadDisplayState`, add:

```proto
enum AwaitingUserResponseSubtype {
  AWAITING_USER_RESPONSE_SUBTYPE_UNSPECIFIED = 0;
  USER = 1;
  SYSTEM = 2;
}
```

- In `message ClineMessage`, add:

```proto
  AwaitingUserResponseSubtype awaiting_user_response_subtype = 25;
```

Use field number `25`. Do not renumber existing fields.

- Regenerate:
  - [src/shared/proto/cline/ui.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto/cline/ui.ts)
  - [src/generated/grpc-js/cline/ui.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/generated/grpc-js/cline/ui.ts)
  - [src/generated/nice-grpc/cline/ui.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/generated/nice-grpc/cline/ui.ts)

Use:

```bash
npm run protos
```

### Proto Conversion Updates

In [src/shared/proto-conversions/cline-message.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto-conversions/cline-message.ts):

- Import:
  - `AwaitingUserResponseSubtype as AppAwaitingUserResponseSubtype`
  - `AwaitingUserResponseSubtype as ProtoAwaitingUserResponseSubtype`

- Add two helpers mirroring the thread-display-state converters:

```ts
function convertAwaitingUserResponseSubtypeToProto(
	subtype: AppAwaitingUserResponseSubtype | undefined,
): ProtoAwaitingUserResponseSubtype | undefined

function convertProtoAwaitingUserResponseSubtypeToCline(
	subtype: ProtoAwaitingUserResponseSubtype,
): AppAwaitingUserResponseSubtype | undefined
```

- Extend `convertClineMessageToProto(...)` so `protoMessage.awaitingUserResponseSubtype` is populated from `message.awaitingUserResponseSubtype`.
- Extend `convertProtoToClineMessage(...)` so `message.awaitingUserResponseSubtype` is restored when present.

## Backend Runtime Changes

### Task State / Getter Surface

In [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts):

- At the class fields near line 443, add:

```ts
private awaitingUserResponseSubtype: AwaitingUserResponseSubtype | undefined
```

- Immediately after `getThreadDisplayState()` at lines 489-491, add:

```ts
public getAwaitingUserResponseSubtype(): AwaitingUserResponseSubtype | undefined {
	return this.awaitingUserResponseSubtype
}
```

- Change `setThreadDisplayState(...)` at lines 493-514 to accept an optional fourth parameter:

```ts
private setThreadDisplayState(
	threadDisplayState: ThreadDisplayState,
	reason: string,
	details?: Record<string, unknown>,
	awaitingUserResponseSubtype?: AwaitingUserResponseSubtype,
): void
```

- Inside that method:
  - assign `this.threadDisplayState = threadDisplayState`
  - assign:

```ts
this.awaitingUserResponseSubtype =
	threadDisplayState === ThreadDisplayStates.AWAITING_USER_RESPONSE ? awaitingUserResponseSubtype : undefined
```

  - add `awaitingUserResponseSubtype: this.awaitingUserResponseSubtype` to the logged JSON payload

### Ask-State Classification Rule

Do not classify by ask type alone.

Use this exact rule in [src/core/task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts):

- `ask_partial_started` => `awaiting_user_response.system`
- `ask_completed` => if resulting top-level state is `awaiting_user_response`, subtype is `user`
- `ask_started` => if resulting top-level state is `awaiting_user_response`, subtype is `user`
- `completion_result` => `completed` with no subtype
- `idle_open`, `paused`, `active_run`, `active_user`, `completed` => no subtype

Implement this by adding a helper immediately below `getThreadDisplayStateForAsk(...)`:

```ts
private getAwaitingUserResponseSubtypeForAsk(
	type: ClineAsk,
	partialLifecycle: "partial_started" | "finalized",
	threadDisplayState: ThreadDisplayState,
): AwaitingUserResponseSubtype | undefined {
	if (threadDisplayState !== ThreadDisplayStates.AWAITING_USER_RESPONSE) {
		return undefined
	}

	return partialLifecycle === "partial_started"
		? AwaitingUserResponseSubtypes.SYSTEM
		: AwaitingUserResponseSubtypes.USER
}
```

### Apply The Helper In `ask(...)`

At lines 943-955 (`ask_partial_started` path):

- replace:

```ts
this.setThreadDisplayState(threadDisplayState ?? this.getThreadDisplayStateForAsk(type), "ask_partial_started", {
	askType: type,
	partial: true,
})
```

- with:

```ts
const nextThreadDisplayState = threadDisplayState ?? this.getThreadDisplayStateForAsk(type)
const nextAwaitingSubtype = this.getAwaitingUserResponseSubtypeForAsk(type, "partial_started", nextThreadDisplayState)

this.setThreadDisplayState(
	nextThreadDisplayState,
	"ask_partial_started",
	{
		askType: type,
		partial: true,
	},
	nextAwaitingSubtype,
)
```

- When adding the partial ask message, include:

```ts
awaitingUserResponseSubtype: this.awaitingUserResponseSubtype,
```

At lines 979-986 (`ask_completed` updating previous partial) and lines 995-1006 (`ask_completed` new complete ask):

- compute `nextThreadDisplayState` and `nextAwaitingSubtype` the same way, but call:

```ts
this.getAwaitingUserResponseSubtypeForAsk(type, "finalized", nextThreadDisplayState)
```

- pass the subtype into `setThreadDisplayState(...)`
- include `awaitingUserResponseSubtype: this.awaitingUserResponseSubtype` when adding a new message

At lines 1017-1028 (`ask_started` non-partial path):

- compute the same `nextThreadDisplayState` / `nextAwaitingSubtype`
- pass subtype into `setThreadDisplayState(...)`
- include `awaitingUserResponseSubtype: this.awaitingUserResponseSubtype` in the added message

At lines 1065-1069 (`ask_resolved`):

- keep the transition to `active_run`
- do not pass a subtype so the field clears automatically

At lines 1235-1244 (`partial_ask_removed`):

- tighten the repair condition so it only fires when:
  - `this.threadDisplayState === ThreadDisplayStates.AWAITING_USER_RESPONSE`
  - `this.awaitingUserResponseSubtype === AwaitingUserResponseSubtypes.SYSTEM`
  - `newLastMessage?.type !== "ask"`
  - `!this.taskState.abort`

Do not repair a `.user` wait state back to `active_run`.

### Controller State Payload

In [src/core/controller/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/controller/index.ts):

- In the `currentTaskItem` ad hoc object near lines 1055-1063, do not add subtype.
- In the returned top-level state object near lines 1138-1141, add:

```ts
awaitingUserResponseSubtype: this.task?.getAwaitingUserResponseSubtype(),
```

This keeps subtype as top-level runtime state next to `threadDisplayState`.

## Frontend Runtime Changes

### Remove Shared `enableButtons` / Button Label State

In [webview-ui/src/components/chat/chat-view/hooks/useChatState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useChatState.ts):

- Delete these state declarations at lines 18-21:

```ts
const [enableButtons, setEnableButtons] = useState<boolean>(false)
const [primaryButtonText, setPrimaryButtonText] = useState<string | undefined>("Approve")
const [secondaryButtonText, setSecondaryButtonText] = useState<string | undefined>("Reject")
```

- Remove them from the returned object.

In [webview-ui/src/components/chat/chat-view/types/chatTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/types/chatTypes.ts):

- In `ChatState`, delete:
  - `setSendingDisabled`
  - `enableButtons`
  - `setEnableButtons`
  - `primaryButtonText`
  - `setPrimaryButtonText`
  - `secondaryButtonText`
  - `setSecondaryButtonText`
- Delete the entire `ButtonState` interface at lines 97-104.
- Delete the `buttonState: ButtonState` prop from `TaskSectionProps`.

### Make `sendingDisabled` Derived Instead Of Mutable

In [webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts):

- Remove `sendingDisabled` from `ButtonConfig`.
- Remove every `sendingDisabled: ...` property from every `BUTTON_CONFIGS` entry.
- Add this new helper directly below `isPassiveThreadOpen(...)`:

```ts
import type { AwaitingUserResponseSubtype } from "@shared/ExtensionMessage"

export function getComposerSendingDisabled(
	threadDisplayState?: string | null,
	awaitingUserResponseSubtype?: AwaitingUserResponseSubtype | null,
): boolean {
	switch (threadDisplayState) {
		case "active_run":
			return true
		case "awaiting_user_response":
			return awaitingUserResponseSubtype === "system"
		case "active_user":
		case "completed":
		case "idle_open":
		case "paused":
		case undefined:
		case null:
			return false
		default:
			return false
	}
}
```

- Do not add subtype branching to `getButtonConfig(...)` in this remediation.

In [webview-ui/src/components/chat/ChatView.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatView.tsx):

- Import:
  - `getButtonConfig`
  - `getComposerSendingDisabled`
  - `BUTTON_CONFIGS`
- Read these from `useExtensionState()`:
  - `threadDisplayState`
  - `awaitingUserResponseSubtype`
- Stop destructuring `sendingDisabled` and `enableButtons` from `chatState`.
- Add:

```ts
const sendingDisabled = useMemo(
	() => getComposerSendingDisabled(threadDisplayState, awaitingUserResponseSubtype),
	[threadDisplayState, awaitingUserResponseSubtype],
)
```

- Add a second memo for auto-focus suppression:

```ts
const currentFooterConfig = useMemo(() => {
	const lastMessage = messages.at(-1)
	return lastMessage ? getButtonConfig(lastMessage, mode, threadDisplayState) : BUTTON_CONFIGS.default
}, [messages, mode, threadDisplayState])

const shouldSuppressComposerAutoFocus = Boolean(currentFooterConfig.primaryText || currentFooterConfig.secondaryText)
```

- Replace the auto-focus effect at lines 285-294:

```ts
if (!isHidden && !sendingDisabled && !shouldSuppressComposerAutoFocus) {
	textAreaRef.current?.focus()
}
```

- Update the dependency array to `[isHidden, sendingDisabled, shouldSuppressComposerAutoFocus]`.

### Footer Changes

In [webview-ui/src/components/chat/chat-view/components/layout/ActionButtons.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/components/layout/ActionButtons.tsx):

- Remove `setSendingDisabled` from `chatState` destructuring at line 39.
- Replace the effect at lines 55-59 with:

```ts
useEffect(() => {
	setIsProcessing(false)
}, [buttonConfig])
```

- Leave `canInteract = enableButtons && !isProcessing` unchanged.

This preserves the footer's brief in-flight latch without making it a second UI-state authority.

### Message Send / Cancel Routing

In [webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts):

- Read `awaitingUserResponseSubtype` from `useExtensionState()`.
- Replace the single `isAwaitingUserResponseThreadState` boolean with:

```ts
const isAwaitingUserResponseThreadState = threadDisplayState === "awaiting_user_response"
const isAwaitingUserResponseUserState =
	isAwaitingUserResponseThreadState && awaitingUserResponseSubtype !== "system"
const isAwaitingUserResponseSystemState =
	isAwaitingUserResponseThreadState && awaitingUserResponseSubtype === "system"
```

- Remove `setSendingDisabled` and `setEnableButtons` from the `chatState` destructuring.
- In `handleSendMessage(...)`:
  - keep `active_user`, passive, and `active_run` behavior unchanged
  - change the ask-response branch from:

```ts
} else if (isAwaitingUserResponseThreadState && clineAsk) {
```

  - to:

```ts
} else if (isAwaitingUserResponseUserState && clineAsk) {
```

  - leave `.system` with no send route

- In the `messageSent` cleanup block at lines 186-202, delete:

```ts
if (!sentAsInterruption) {
	setSendingDisabled(true)
	setEnableButtons(false)
}
```

- In `executeButtonAction("cancel")`, delete:

```ts
setSendingDisabled(true)
setEnableButtons(false)
...
setSendingDisabled(false)
setEnableButtons(true)
```

- Remove those identifiers from dependency arrays.

### Composer UI

In [webview-ui/src/components/chat/ChatTextArea.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatTextArea.tsx):

- Keep the existing `sendingDisabled` prop checks at:
  - lines 602-608 for Enter
  - lines 1557-1563 for the send icon
- No behavioral change is needed in this file beyond any type updates caused by removing `setSendingDisabled` from `ChatState`.

### Loader Suppression

In [webview-ui/src/components/chat/chat-view/utils/messageUtils.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/utils/messageUtils.ts):

- Import `AwaitingUserResponseSubtype`.
- Replace `USER_READY_THREAD_DISPLAY_STATES` with a helper:

```ts
function isUserReadyThreadDisplayState(
	threadDisplayState?: string | null,
	awaitingUserResponseSubtype?: AwaitingUserResponseSubtype | null,
): boolean {
	switch (threadDisplayState) {
		case ThreadDisplayStates.ACTIVE_USER:
		case ThreadDisplayStates.COMPLETED:
		case ThreadDisplayStates.IDLE_OPEN:
		case ThreadDisplayStates.PAUSED:
			return true
		case ThreadDisplayStates.AWAITING_USER_RESPONSE:
			return awaitingUserResponseSubtype !== "system"
		default:
			return false
	}
}
```

- Change both:
  - `shouldShowThinkingLoaderRow(...)`
  - `shouldAppendThinkingLoaderRow(...)`

to accept an optional fourth argument:

```ts
awaitingUserResponseSubtype?: AwaitingUserResponseSubtype | null
```

- Replace the set-membership check at lines 83-85 with the helper above.

In [webview-ui/src/components/chat/chat-view/components/layout/MessagesArea.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/components/layout/MessagesArea.tsx):

- Read `awaitingUserResponseSubtype` from `useExtensionState()`.
- Pass it into `shouldAppendThinkingLoaderRow(...)`.

This is plumbing for the agreed `messageUtils.ts` behavior; it does not introduce a new visual mode beyond the loader decision.

## Compatibility Rule

Treat missing `awaitingUserResponseSubtype` as `user` semantics in the frontend.

Exact consequences:
- `getComposerSendingDisabled(...)` treats missing subtype as enabled
- `useMessageHandlers.ts` treats missing subtype under `awaiting_user_response` as user-routable
- `messageUtils.ts` treats missing subtype under `awaiting_user_response` as user-ready

This preserves existing behavior for old history rows and partially upgraded state.

## Tests To Update / Add

### Shared / Backend

1. Update [src/core/task/__tests__/thread-display-state.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/thread-display-state.test.ts)
   - Add round-trip coverage for `awaitingUserResponseSubtype: "user"` and `"system"` on a `ClineMessage` with `threadDisplayState: "awaiting_user_response"`.

2. Update [src/core/task/__tests__/askLifecycle.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/askLifecycle.test.ts)
   - Add a test that `ask_partial_started` records:
     - `threadDisplayState === AWAITING_USER_RESPONSE`
     - `awaitingUserResponseSubtype === SYSTEM`
   - Add a test that finalized asks (`ask_completed` / `ask_started`) record:
     - `threadDisplayState === AWAITING_USER_RESPONSE`
     - `awaitingUserResponseSubtype === USER`
   - Update the stale partial removal repair test to assert:
     - repair only occurs from `.system`
     - the subtype clears when the state returns to `ACTIVE_RUN`

### Frontend

3. Update [webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx)
   - Remove all expectations for `setSendingDisabled(...)` and `setEnableButtons(...)`.
   - Add a hoisted `mockAwaitingUserResponseSubtype`.
   - Add one new test:
     - `threadDisplayState = "awaiting_user_response"`
     - `mockAwaitingUserResponseSubtype.value = "system"`
     - `clineAsk = "tool"`
     - calling `handleSendMessage(...)` does not call `mockAskResponse`
     - input is not cleared

4. Update [webview-ui/src/components/chat/chat-view/shared/buttonConfig.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/shared/buttonConfig.test.ts)
   - Remove all `config.sendingDisabled` assertions.
   - Add a new describe block for `getComposerSendingDisabled(...)` covering:
     - `active_run => true`
     - `active_user => false`
     - `idle_open => false`
     - `completed => false`
     - `paused => false`
     - `awaiting_user_response + user => false`
     - `awaiting_user_response + system => true`
     - `awaiting_user_response + undefined subtype => false`

5. Update [webview-ui/src/components/chat/chat-view/utils/messageUtils.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/utils/messageUtils.test.ts)
   - Add:
     - `awaiting_user_response + user subtype => no thinking loader`
     - `awaiting_user_response + system subtype => thinking loader still allowed when the last row is an in-flight API marker`

6. Add a new focused composer-state regression test:
   - file: [webview-ui/src/components/chat/ChatView.composerState.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatView.composerState.test.tsx)
   - mock `useExtensionState()` so `threadDisplayState` and `awaitingUserResponseSubtype` are mutable
   - render `ChatView`
   - assert send button disabled/enabled for:
     - `active_run`
     - `active_user`
     - `awaiting_user_response.user`
     - `awaiting_user_response.system`
     - `idle_open`
     - `completed`
     - `paused`

This test is required. It is the direct guard against the `test-20` regression seam.

## Verification Commands

Run exactly:

```bash
npm run protos
npx tsc --noEmit
npm run test:unit -- --exit src/core/task/__tests__/thread-display-state.test.ts src/core/task/__tests__/askLifecycle.test.ts
cd webview-ui && npm run test -- src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx src/components/chat/chat-view/shared/buttonConfig.test.ts src/components/chat/chat-view/utils/messageUtils.test.ts src/components/chat/ChatView.composerState.test.tsx
```

## Definition Of Done

- `enableButtons` no longer exists in shared chat state.
- `setSendingDisabled(...)` is removed from `useMessageHandlers.ts` and `ActionButtons.tsx`.
- Composer disabled/enabled behavior follows the exact matrix in **Final Requirements**.
- `awaiting_user_response` carries a runtime subtype through:
  - backend task state
  - top-level extension state
  - streamed `ClineMessage` partial events
- `askResponse.ts` remains unchanged.
- Footer button visibility / action mapping are unchanged for the new subtypes.
- The new and updated tests all pass.
