# Managed BMAD Workflows Remediation V4 Plan

## Purpose

This document captures the remaining gaps identified after the V3 remediation pass and records the intended code-level remediation approach before any additional runtime changes are made.

This pass is focused on three follow-up issues:

1. The verified VSIX publish flow is still miswired because archive verification does not use the VSIX `extension/` prefix
2. Exiting or switching out of managed-workflow mode can leave a stale backend-owned checklist behind
3. Resuming a managed workflow restores backend state without immediately re-rendering the checklist into the UI-facing `task_progress` projection

## Scope

This remediation pass should only address the three issues above.

It should not broaden the managed workflow feature set or redesign the workflow state model beyond what is required to close publish-path verification and checklist synchronization gaps.

## Execution Status

This remediation plan has now been implemented in the repo.

- VSIX archive verification now uses the `extension/` archive prefix
- exiting or replacing managed workflow mode now clears the managed checklist projection
- resuming a managed workflow now eagerly re-renders the backend-owned checklist projection
- focused regression coverage was added for managed checklist refresh/clear behavior

Local verification note:

- `node scripts/generate-managed-workflows.mjs` passes
- `node scripts/verify-managed-workflow-assets.mjs` passes
- `node scripts/audit-managed-workflow-extraction.mjs` passes
- focused mocha execution remains blocked in this environment by the repo's current mocha/Node TypeScript loader issue

## Findings And Intended Fixes

### 1. Verified VSIX Publish Flow Is Still Miswired

#### Finding

The helper for verified VSIX packaging invokes archive verification without the `extension/` prefix used by VSIX archive contents. The verifier does exact archive-path matching, so the publish path is still incorrect even though the standalone packager already passes the prefix correctly.

Impacted code:

- [package-vsix-with-managed-workflow-verification.mjs](/Users/robertboston/Documents/Cline%20Extension/cline/scripts/package-vsix-with-managed-workflow-verification.mjs)
- [verify-managed-workflow-assets.mjs](/Users/robertboston/Documents/Cline%20Extension/cline/scripts/verify-managed-workflow-assets.mjs)
- [package.json](/Users/robertboston/Documents/Cline%20Extension/cline/package.json)

#### Intent

Make the VSIX packaging helper verify the archive using the same prefix-aware contract already used by the standalone packaging path.

#### Line-Level Code Intent

1. In [package-vsix-with-managed-workflow-verification.mjs](/Users/robertboston/Documents/Cline%20Extension/cline/scripts/package-vsix-with-managed-workflow-verification.mjs):
   - Update the verifier invocation so it passes:
     - `--archive=<resolved-vsix-path>`
     - `--archive-prefix=extension`

2. Preserve existing packaging behavior:
   - Keep `vsce package` as the archive creation mechanism
   - Keep verification immediately after packaging and before any publish command runs

3. In [package.json](/Users/robertboston/Documents/Cline%20Extension/cline/package.json):
   - No command structure change should be necessary if the helper is fixed correctly
   - Reconfirm that:
     - `package:vsix:verified`
     - `publish:marketplace`
     - `publish:marketplace:prerelease`
     all route through the fixed helper

#### Acceptance Criteria

- The verified VSIX helper validates archive contents successfully against real VSIX layout
- Marketplace publish flows verify the packaged VSIX with `extension/`-prefixed path matching before publish
- The docs can truthfully claim the real publish path is archive-verified

### 2. Exiting Managed Workflow Mode Can Leave A Stale Backend Checklist Behind

#### Finding

When managed workflow state is cleared during mode transitions, the runtime does not also clear or refresh `currentFocusChainChecklist`. That allows a backend-owned managed checklist to persist after workflow exit or agent activation and then be treated as a normal editable todo list.

Impacted code:

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)
- [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)

#### Intent

When managed workflow mode is exited, the UI projection should no longer show the managed checklist as live editable task progress.

#### Line-Level Code Intent

1. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts):
   - In `applyPersistentSlashCommandAction(...)`, update the non-managed branches:
     - `activate_bmad_agent`
     - the fallback clear/reset branch
   - After clearing `managedWorkflowRun`, also clear the managed checklist projection

2. Preferred behavior:
   - Set:
     - `this.taskState.currentFocusChainChecklist = null`
     - `this.taskState.todoListWasUpdatedByUser = false`
   - Then call `await this.postStateToWebview()`

3. If `this.FocusChainManager` exists:
   - Consider calling a small helper on the focus-chain manager rather than mutating checklist state inline
   - Example helper intent:
     - `clearManagedWorkflowChecklistProjection()`

4. Avoid reclassifying stale managed checklists as editable task-progress state:
   - The key requirement is that once `managedWorkflowRun` is cleared, any leftover managed checklist must also be removed or replaced

#### Acceptance Criteria

- Exiting a managed workflow clears the backend-owned checklist projection
- Switching into agent mode after a managed workflow does not leave the old managed checklist visible as editable todo state
- The normal focus-chain prompt path does not inherit stale managed checklist content

### 3. Resumed Managed Workflows Do Not Immediately Re-Render The Checklist

#### Finding

Managed workflow state is restored on resume, but `currentFocusChainChecklist` starts empty and is not immediately repopulated. Because the focus-chain watcher ignores the initial file event, the restored run may exist without the checklist being projected into the UI until a later tool flow refreshes it.

Impacted code:

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)
- [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)

#### Intent

Whenever a managed workflow is restored into task state, the checklist should be rendered immediately so the UI and prompt context match the backend state from the start of the resumed session.

#### Line-Level Code Intent

1. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts):
   - Identify the task initialization/resume path where persisted `managedWorkflowRun` is restored
   - Immediately after restoring the run into `taskState`, refresh the checklist projection

2. Preferred rendering path:
   - If `this.FocusChainManager` exists, call:
     - `await this.FocusChainManager.updateFCListFromToolResponse(undefined)`
   - Else directly set:
     - `this.taskState.currentFocusChainChecklist = renderManagedWorkflowTaskProgress(this.taskState.managedWorkflowRun)`

3. Ensure the refresh occurs during resume, not only after later tool execution:
   - The objective is that resumed managed workflows appear in the UI as already active, with the checklist visible immediately

4. If needed, add a focused helper for reuse:
   - Example intent:
     - `refreshManagedWorkflowChecklistProjection()`
   - This can then be reused by:
     - managed slash activation
     - managed `use_skill`
     - resume restoration
     - managed workflow clearing logic

#### Acceptance Criteria

- Resumed managed workflows immediately populate `currentFocusChainChecklist`
- The UI reflects restored managed workflow progress before any later tool call occurs
- Resume behavior is consistent with fresh managed slash activation

## Recommended Delivery Order

1. Fix VSIX archive-prefix verification
2. Clear stale managed checklist projection on exit/switch
3. Re-render checklist projection on resume
4. Add focused regression coverage
5. Update remediation tracking docs

## Test Intent For The Next Patch Set

The next implementation pass should add or extend tests for:

1. VSIX verification wiring
   - The helper passes `--archive-prefix=extension`
   - Publish scripts still route through the verified helper

2. Managed checklist clearing
   - Clearing `managedWorkflowRun` also clears `currentFocusChainChecklist`
   - Switching to agent mode does not retain a stale managed checklist

3. Managed checklist resume projection
   - Restoring a managed workflow run eagerly populates `currentFocusChainChecklist`
   - Resume path matches fresh activation behavior

## Review Checklist

- [x] VSIX publish verification uses `extension/`-prefixed archive matching
- [x] Exiting managed workflow mode clears stale backend-owned checklist projection
- [x] Resuming a managed workflow immediately re-renders its checklist into `task_progress`
