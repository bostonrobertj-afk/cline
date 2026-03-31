# Attempt Completion Deterministic Signal Requirements

## Purpose

This document defines the requirements for allowing `attempt_completion` to act as a deterministic workflow-progression signal for supported placeholder workflows.

This work is specifically about deterministic progression.

It is not intended to restore the older model where `attempt_completion` is treated as a task-ending or thread-ending lifecycle event.

## Background

The runtime already has a tool-context seam for deterministic placeholder progression:

- `src/core/task/focus-chain/updateFromToolResponse.ts`
- `src/core/task/focus-chain/index.ts`
- `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`

The current gap is that:

- `attempt_completion` still follows a dedicated pre-tool focus-chain path
- that path skips the normal post-tool focus-chain update
- deterministic evaluators currently do not consume `toolContext`

As a result, supported workflows cannot currently use a successful `attempt_completion` call as a deterministic step-completion gate.

## Goals

- Allow supported deterministic placeholder workflows to use `attempt_completion` as a machine-checkable step-completion signal.
- Keep the signal inside the deterministic progression system rather than scattering logic across unrelated handlers.
- Preserve the newer response-tool model where `attempt_completion` is a presentation/tool signal, not a task-ending semantic.
- Keep deterministic gates explicit, workflow-specific, and opt-in.

## Non-Goals

- Reintroducing `attempt_completion` as a trusted proxy for thread end, task end, or user acceptance.
- Parsing arbitrary workflow prose into generic `attempt_completion` gates.
- Expanding deterministic support to unmanaged workflows automatically.
- Solving all focus-chain timing parity issues in the same change unless they are required to make this signal work.

## Core Principle

`attempt_completion` may be used as a deterministic progression signal only as:

- a tool-execution fact

It must not be treated as:

- proof that the user accepted the answer
- proof that the thread ended
- proof that the task is globally complete

## Required Signal Semantics

For deterministic progression purposes, the preferred signal is:

- a successful `attempt_completion` execution in the current turn

The system should prefer successful execution over mere invocation because:

- invocation alone may be rejected by focus-chain protections or other runtime checks
- deterministic progression should advance only on the accepted tool event

If the current runtime architecture still requires a pre-tool validation phase, that validation must remain separate from the deterministic completion signal.

## Required Runtime Behavior

### 1. Tool Context Must Reach Deterministic Evaluation

The deterministic evaluator must receive tool-context information for `attempt_completion`, including:

- `toolName`
- `toolParams`
- `toolResult`
- `toolWasExecuted`

This requirement should be satisfied through the existing deterministic tool-context seam rather than by adding workflow-specific logic directly to `AttemptCompletionHandler`.

### 2. Deterministic Evaluators Must Be Able to Inspect Tool Context

The deterministic step-evaluation path must be able to evaluate workflow steps using the tool context from the current turn.

That includes:

- threading `toolContext` through `evaluateDeterministicStep(...)`
- threading `toolContext` into the relevant per-workflow evaluators

### 3. Attempt Completion Must Be Gateable by Successful Execution

A supported workflow step must be allowed to declare a deterministic gate of the form:

- complete this step when `toolContext.toolName === "attempt_completion"` and `toolContext.toolWasExecuted === true`

This gate must remain:

- workflow-specific
- step-specific
- explicit in deterministic resolver code

### 4. Pre-Tool Validation and Post-Tool Deterministic Completion Must Be Separable

If `attempt_completion` still needs a pre-tool focus-chain validation pass for checklist safety, that validation must not prevent post-tool deterministic evaluation from seeing the successful tool execution.

In other words:

- checklist-protection logic may remain pre-tool if needed
- deterministic progression must still be able to evaluate the accepted `attempt_completion` result afterward

The runtime must not use one boolean that suppresses both:

- post-tool checklist feedback
- post-tool deterministic progression

unless both behaviors are intentionally meant to be suppressed.

### 5. No New Lifecycle Semantics

This work must not reintroduce any of the removed lifecycle coupling around `attempt_completion`.

Specifically, this change must not:

- set or depend on task-ended state
- assume user acceptance
- treat `attempt_completion` as thread termination
- restore managed-workflow blocking, double-check completion, or completion hooks

## Supported Usage Pattern

The intended deterministic pattern is:

1. A supported placeholder workflow reaches a step whose done signal is an `attempt_completion` event.
2. The model calls `attempt_completion`.
3. The runtime accepts and executes the tool.
4. Deterministic progression evaluates the current active step with the current-turn tool context.
5. The workflow-specific evaluator sees a successful `attempt_completion` and auto-completes that step.
6. The next prompt reflects the updated workflow state through the normal deterministic notice path.

## Registry Requirement

The system must continue to use explicit deterministic workflow/step logic.

`attempt_completion` support must therefore be added as:

- explicit workflow-step evaluator logic in `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`

It must not be added as:

- a generic global rule that all workflows advance on `attempt_completion`

## Prompting Requirement

If a supported workflow uses `attempt_completion` as a deterministic gate, the resulting auto-completion must still be surfaced through the existing deterministic notice mechanism.

The model must be told:

- which step auto-completed
- that the runtime completed it
- why the runtime was able to complete it

Silent progression remains unacceptable.

## Verification Requirements

Any implementation of this requirement must include focused tests proving:

- `attempt_completion` can reach deterministic evaluation as tool context
- a supported workflow step can complete based on successful `attempt_completion`
- rejected or non-executed `attempt_completion` calls do not trigger deterministic completion
- existing non-`attempt_completion` deterministic gates continue to behave unchanged

## Out of Scope For This Requirements Doc

This document does not prescribe:

- which specific workflow step should adopt an `attempt_completion` gate first
- the exact code patch sequence
- whether the pre-tool focus-chain protection should ultimately be removed entirely

Those decisions belong in the follow-on implementation spec or action plan.
