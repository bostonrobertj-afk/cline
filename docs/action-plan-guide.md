# Action Plan Guide

## Purpose

This guide defines the required process for authoring implementation action plans. An action plan is acceptable only when it faithfully translates approved requirements into exact, compile-safe, executable tasks and subtasks.

## Authoring Rule

Follow this guide in order. Do not skip ahead. Do not rely on memory or validation commands to discover details that must be prescribed in the plan.

If a required detail is missing from requirements, architecture, module guides, or live code inspection, stop and ask for clarification before writing the affected task or subtask.

## Step 1: Read Required Inputs

Before writing or revising an action plan, read:

- The backing requirements document.
- Any referenced architecture document.
- Any referenced module/build guide.
- The existing action plan, if this is a new phase.
- Every runtime, test, fixture, registry, schema, prompt, and validation file likely affected by the change.

Do not begin drafting tasks until the affected code and tests have been inspected.

## Step 2: Build the Requirement Trace

Create a requirement trace before writing tasks.

For each requirement, identify:

- Exact required behavior.
- Exact user-facing, AI-facing, terminal-error, panel, option, tool, schema, or prompt text.
- Required persisted values, artifacts, routes, actions, fixtures, and validation coverage.
- Owning runtime, module, test, documentation, and validation files.

If exact prose is required but not present in requirements or existing repo-owned strings, stop.

## Step 3: Inspect Live Contracts

For each affected file, verify the live contract before drafting subtasks:

- Existing imports and exports.
- Helper names, signatures, return types, and call sites.
- Type definitions, discriminated unions, required fields, and narrowing requirements.
- Constructor, method, action, route, event, session, and fixture object shapes.
- Existing assertions and validation commands.
- Existing files and exact paths for every command.

Every referenced symbol must be classified as one of:

- Existing symbol verified in live code.
- New symbol created earlier in the same phase.
- Invalid and requiring rewrite before the plan can be used.

## Step 4: Select the Implementation Method

Use requirements and project/module guides to determine the approved implementation method.

If more than one implementation method is viable and the approved documents do not clearly select one, stop and ask the user to choose.

Do not invent architecture, compatibility bridges, aliases, fallback paths, or legacy preservation unless requirements explicitly approve them.

## Step 5: Draft Tasks and Subtasks

Tasks and subtasks must be sequentially numbered.

Tasks may summarize a file or capability area. Subtasks must prescribe exact changes.

Each task or subtask must include:

- Full target file path.
- Allowed files list.
- One exact prescribed revision unless subordinate subtasks split the work.
- Exact imports to add or remove.
- Exact helper/function/type/object shape.
- Exact required narrowing before union-field access.
- Exact fixture/session/action/event shape.
- Exact assertions for stable machine-consumed contracts.
- Exact raw-placeholder negative assertions for required prompt placeholders.
- Exact cleanup of now-unused imports, helpers, exports, fixtures, assertions, and validation guards.

Do not use vague phrases such as:

- “all helpers”
- “matching sibling pattern”
- “equivalent shape”
- “update tests”
- “as needed”
- “fixture like the existing one”
- “all exported constants”
- “each static branch template”

Name every symbol, constant, fixture, assertion, and command exactly.

## Step 6: Run the Delta Fallout Pass

After drafting each task, inspect the consequences of every prescribed change.

For every deletion, replacement, de-parameterization, signature change, type change, or removed call site, prescribe cleanup for:

- Now-unused imports.
- Dead helpers.
- Dead exports.
- Stale fixture fields.
- Stale test assertions.
- Stale validation guards.
- Scope-diff allowlists.
- Prompt placeholder coverage.
- Downstream call sites.

Validation commands do not replace this pass. It is a guide violation to rely on typecheck, lint, or implementation-time discovery to find fallout.

## Step 7: Draft Validation

Validation must be exact and repo-supported.

Include:

- Focused tests for touched runtime and test layers.
- Typecheck.
- Lint or formatting gate required by the repo.
- Package/build validation when required by project guidance.
- Static guards only for approved forbidden legacy concepts or regression risks.
- Scope diff using both `git diff --name-only` and `git ls-files --others --exclude-standard`.

If a command path does not exist, rewrite the validation command before completing the plan.

## Step 8: Build the Compliance Matrix

Before reporting completion, audit every task and subtask with this matrix:

| Task/Subtask | Requirement Source | Target File | Symbols Verified | Live Contract Verified | Fallout Cleanup Prescribed | Validation Coverage |
| --- | --- | --- | --- | --- | --- | --- |

Every row must be complete. If any row requires inference by the implementing agent, rewrite the task or subtask.

## Step 9: Final Line-by-Line Audit

Re-read the full phase from top to bottom.

For each task and subtask, confirm:

- It is requirements-backed.
- It is compile-safe.
- It has exact imports and cleanup.
- It has exact fixture/action/session shapes.
- It has exact assertions where stable contracts are involved.
- It does not invent prose.
- It does not preserve unauthorized legacy behavior.
- It does not require the dev agent to infer implementation details.

Only report completion after this audit is complete.

## Required Frontmatter

Include this exact frontmatter at the top of every action plan document:

- Read this plan from top to bottom before making any changes.
- Read each task and subtask in full immediately before executing it.
- Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.
  - Exception: You may execute multiple sequential subtasks with one patch only if they are scoped to the same file, but must review each subtask vs the landed code after the patch to ensure that every subtask was implemented exactly as prescribed before marking the subtask as complete.
  - After completing a task or subtask, update that step's checkbox from "[ ]" to "[x]".
- Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
- Do not edit any file not listed in the current step's allowed-files list.
- If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.
- Implement tasks and subtasks exactly as instructed. If deviation seems necessary, stop, inform the user, and explain why you believe the task or subtask should be carried out differently than prescribed.
