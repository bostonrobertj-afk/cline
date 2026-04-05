# Workflow Progress Request Requirements

## Purpose

This document defines the requirements for introducing a new AI-callable response tool named `workflow_progress_request`.

The goal is to let the runtime ask the human for explicit permission to advance the active placeholder-workflow step, while keeping workflow progression authoritative in the existing focus-chain system.

## Current Runtime Seams

This requirement is grounded in the current runtime and UI seams:

- `src/core/task/tools/handlers/AskFollowupQuestionToolHandler.ts`
- `webview-ui/src/components/chat/ChatRow.tsx`
- `webview-ui/src/components/chat/OptionsButtons.tsx`
- `src/core/task/tools/response/ResponseToolRuntime.ts`
- `src/core/task/tools/response/ResponseToolRegistry.ts`
- `src/core/task/focus-chain/index.ts`
- `src/core/task/focus-chain/file-utils.ts`
- `src/core/prompts/system-prompt/tools/send_user_message.ts`
- `src/core/task/tools/handlers/SendUserMessageHandler.ts`

The live runtime already has:

- an inline `followup` ask surface with option buttons
- response-tool turn finalization and next-turn handoff behavior
- the `__COMPLETE_NEXT_STEP__` focus-chain sentinel for completing the next incomplete placeholder-workflow step
- a text-message response-tool presentation used by `send_user_message`

## Goals

- Add a new tool named `workflow_progress_request` to the AI-visible tool catalog.
- Let the tool present an inline yes/no workflow-progress confirmation to the human.
- Advance the active placeholder-workflow focus chain only when the human selects `Yes`.
- Keep the `No` branch conversational and non-progressing through the existing response-tool continuation path.
- Reuse existing response-tool and chat-UI primitives where they already satisfy the desired behavior.

## Non-Goals

- Replacing the existing placeholder-workflow focus-chain progression system.
- Introducing a new generic workflow-form subsystem for this capability.
- Treating the human’s `Yes` as a managed-workflow item completion signal.
- Requiring freeform human input before the runtime can branch.

## Core Behavioral Contract

When the AI calls `workflow_progress_request`, the runtime must surface this exact user-visible question:

- `Ready to move on to the next step in the workflow?`

The runtime must surface exactly two selectable options:

- `Yes`
- `No`

The interaction must render inline in the task chat UI using the same general presentation family already used for inline follow-up questions with option buttons.

## Tool Call Contract

`workflow_progress_request` must be a deterministic runtime-owned tool.

The AI-callable contract must therefore require no user-supplied behavioral payload.

Specifically:

- the tool must not require the model to provide the question text
- the tool must not require the model to provide the option labels
- the tool must not require the model to provide workflow identifiers, step identifiers, checklist text, or focus-chain mutations
- the tool must not require the model to provide fallback conversational text for either branch

The runtime must own all of the following:

- the exact question text
- the exact `Yes` / `No` option labels
- resolution of the active placeholder-workflow state from task state
- the focus-chain mutation applied on `Yes`
- the continuation handling that sends the selected human response into the next model turn

If the runtime cannot resolve a valid active placeholder-workflow/focus-chain target from task state, the tool must fail safely rather than accepting model-supplied substitute identifiers or payload fields.

## Required Yes-Branch Behavior

If the human selects `Yes`:

- the runtime must complete the next incomplete item in the active placeholder-workflow focus chain
- the completion mechanism must use the existing focus-chain progression contract rather than a parallel workflow-progression implementation
- the resulting focus-chain update must be equivalent to applying the live `__COMPLETE_NEXT_STEP__` sentinel through the existing focus-chain update path
- the existing downstream workflow mechanisms that react to a completed active step must remain the only progression path
- after the focus-chain update succeeds, the runtime must hand the `Yes` response back into the next model turn through the existing response-tool continuation mechanism
- the focus-chain update must happen before the runtime builds the next request prompt that carries the human's `Yes` back to the model
- the next model turn must therefore see both:
  - the updated workflow/focus-chain state
  - the carried-forward human confirmation response

This tool must not directly implement next-step rendering, workflow-step resolution, or workflow-specific post-progress messaging outside the existing focus-chain machinery.

## Required No-Branch Behavior

If the human selects `No`:

- the runtime must not modify the focus-chain markdown
- the `No` branch must not synthesize checklist progress, workflow completion, or deterministic step advancement
- the runtime must hand the `No` response back into the next model turn through the existing response-tool continuation mechanism used by `ask_followup_question`
- the next model turn must be able to continue the conversation from the human's negative response without requiring a separate manual user message first

The `No` branch must not be implemented as a bespoke runtime-authored fallback message path if the existing response-tool continuation path can satisfy the behavior.

## Response-Tool Semantics

`workflow_progress_request` must behave as a response tool, not as a normal work tool.

That means:

- it must end the current AI turn after presenting the prompt and resolving the human’s choice
- it must use the response-tool turn model rather than ad hoc task-state branching
- it must not inject the human’s button click into model context as if it were ordinary freeform user feedback unless a later branch explicitly requires that behavior

For this requirement set:

- the `Yes` branch first performs a system-owned progression update, then feeds the human's affirmative answer back to the model as the next normal turn input
- the `No` branch is a response-tool continuation branch that feeds the human's negative answer back to the model as the next normal turn input

## UI Requirements

The feature must reuse the existing inline option-button chat pattern unless a concrete gap is identified in the live implementation.

It must not require:

- a brand-new bespoke chat card system
- a modal-only UX
- a workflow-form session

The final visible interaction must satisfy all of these:

- the question appears inline in chat
- `Yes` and `No` appear as clickable buttons
- after selection, the message reflects the selected option in the same way existing option-based follow-up rows do
- after `Yes`, the UI does not require a separate manual user message before the next model turn can continue
- after `No`, the UI does not require a separate manual user message before the next model turn can continue

## Focus-Chain Requirements

This capability applies to the active placeholder-workflow focus chain.

It must not:

- update managed workflow phase/item state
- call `complete_workflow_item`
- create a second checklist authority outside `currentFocusChainChecklist`

If no active focus-chain checklist exists, the tool must fail safely and must not claim to have advanced the workflow.

If focus-chain progression is rejected by the existing checklist protection rules, the tool must not silently report success.

## Prompting Requirements

The tool description must instruct the AI to use `workflow_progress_request` only when:

- the active workflow step is ready for explicit human confirmation to advance
- the desired behavior is a yes/no progression check rather than freeform clarification

The description must not imply that the tool:

- completes managed workflows
- writes arbitrary workflow state
- asks the human for open-ended input directly

The tool description must also make clear that:

- the tool takes no user-authored arguments
- the runtime owns the prompt text, option labels, and workflow-state resolution

The description should make clear that:

- `Yes` advances the active placeholder-workflow step through the existing focus-chain system before the runtime continues the conversation with the model
- `No` returns control to the model so it can continue the conversation without advancing the workflow

## Verification Requirements

Any implementation of this requirement must include focused coverage for:

- tool registration and prompt exposure
- response-tool exhaustiveness metadata
- inline yes/no rendering behavior
- `Yes` causing the existing focus-chain completion path to run
- `Yes` being delivered through the response-tool continuation path only after the focus-chain update has been applied
- `No` leaving the focus chain unchanged
- `No` being delivered through the same response-tool continuation model used by `ask_followup_question`
- contextual exposure only for `create-prd.md` steps 3 through 14
- absence of regression to managed-workflow completion behavior

## Contextual Gating Requirements

- `workflow_progress_request` must be exposed only when the active placeholder workflow is `create-prd.md`
- `workflow_progress_request` must be exposed only when the active placeholder-workflow step number is 3 through 14 inclusive
- `workflow_progress_request` must be absent for `create-prd.md` steps 1, 2, and 15
- `workflow_progress_request` must be absent from every other placeholder workflow unless a later requirements update explicitly adds that workflow

## Runtime Validation Boundary

The implementation must preserve the distinction between prompt-time gating and runtime validation.

Specifically:

- prompt construction and native-tool filtering may gate `workflow_progress_request` by both workflow name and active placeholder-workflow step number
- the runtime handler must validate that the active placeholder workflow is `create-prd`
- the runtime handler must validate that an active placeholder-workflow focus-chain checklist exists before attempting progression
- the runtime handler must not invent or infer a second step-number source of truth if the live task runtime state does not already expose one

This means step-specific eligibility is prompt-owned unless and until the live task runtime state gains a canonical active placeholder-workflow step-number field.

## Out Of Scope

- Replacing the existing placeholder-workflow focus-chain progression system.
- Introducing a new generic workflow-form subsystem for this capability.
- Treating the human’s `Yes` as a managed-workflow item completion signal.
- Requiring freeform human input before the runtime can branch.
