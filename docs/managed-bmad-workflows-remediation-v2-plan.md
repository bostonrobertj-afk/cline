# Managed BMAD Workflows Remediation V2 Plan

## Purpose

This document captures the newly identified gaps in the managed BMAD workflow implementation and records the intended code-level remediation approach before any additional runtime changes are made.

It is intentionally focused on:

1. The specific findings raised in review
2. The exact code surfaces involved
3. The intended line-level change strategy
4. The acceptance criteria that should be met after the next patch set

## Scope

This remediation pass is limited to the following four issues:

1. `use_skill("bmad-problem-solving")` still fails before it can reach the managed-workflow alias path
2. Slash-command workflow activation does not render the initial backend-owned checklist into `task_progress`
3. Checkpoint items are tagged as blocking but are not actually enforced at runtime
4. Archive verification exists, but the real VSIX marketplace publish flow does not use it

No additional workflow support should be broadened as part of this pass.

## Execution Status

This remediation plan has now been implemented in the repo.

- `UseSkillToolHandler` now resolves managed workflow aliases before plain skill lookup
- managed slash activation now refreshes the backend-owned checklist immediately
- checkpoint items now enforce blocking semantics in `ManagedWorkflowController`
- release-facing VSIX packaging/publish scripts now route through archive verification

Local verification note:

- `node scripts/generate-managed-workflows.mjs` passes
- `node scripts/verify-managed-workflow-assets.mjs` passes
- focused mocha execution for the new regression tests is still blocked in this environment by the repo's current mocha/Node TypeScript loader issue

## Findings And Intended Fixes

### 1. `use_skill("bmad-problem-solving")` Still Fails Before Alias Resolution

#### Finding

The current `use_skill` flow still resolves skill content before it commits to the managed-workflow path. Because `bmad-problem-solving` is only registered as an alias in the managed workflow registry, not as a discovered skill name, `getSkillContent("bmad-problem-solving", availableSkills)` returns `undefined` and the handler exits with "Skill not found".

Impacted code:

- [UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts)
  - current lookup/setup happens in the region around the existing `skillContent` resolution and `isManagedWorkflow(...)` check
- [ManagedWorkflowRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowRegistry.ts)
  - alias support already exists here, but `UseSkillToolHandler` is not using canonical managed workflow resolution early enough

#### Intent

Change `UseSkillToolHandler` so managed workflow resolution happens before plain skill-content lookup.

#### Line-Level Code Intent

1. In [UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts):
   - Add an early managed-workflow definition lookup near the top of `execute(...)`, immediately after validating `skill_name`
   - Resolve:
     - `managedWorkflowDefinition = await getManagedWorkflowDefinition(config.cwd, skillName)`
     - `resolvedSkillName = managedWorkflowDefinition?.skillName ?? skillName`

2. Update BMAD agent allowlist enforcement in the same handler:
   - Where the code currently checks `activeAgent.allowedSkills.includes(skillName)`, switch that check to the canonical managed skill name when alias resolution exists
   - This prevents valid aliases from being rejected inside agent mode purely because the allowlist stores the canonical ID

3. Update skill-content lookup:
   - Replace `getSkillContent(skillName, availableSkills)` with `getSkillContent(resolvedSkillName, availableSkills)`
   - This lets the alias path load the canonical skill instructions and metadata

4. Update managed workflow activation:
   - Replace `isManagedWorkflow(config.cwd, skillName)` with a direct branch on `managedWorkflowDefinition`
   - Pass the user-entered alias into `startOrResumeManagedWorkflowRun(...)` as the requested workflow ID
   - Persist the canonical workflow ID from the resulting run, not the alias

5. Update user-facing activation text:
   - If the invocation came from an alias, mention the canonical managed workflow ID in the success message for debugging clarity

#### Acceptance Criteria

- `use_skill("bmad-problem-solving")` activates the managed `bmad-cis-problem-solving` workflow
- The canonical workflow run is persisted even when the alias is used
- Agent allowlist checks do not reject the alias when the canonical workflow is allowed

### 2. Slash Activation Does Not Render Initial Backend-Owned Checklist

#### Finding

The managed slash-command path creates and persists `managedWorkflowRun`, but it does not immediately refresh the focus-chain state. As a result, the primary `/bmad-*` activation path can start a managed workflow without emitting the initial canonical checklist into `task_progress`.

Impacted code:

- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
  - `applyPersistentSlashCommandAction(...)`
- [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts)
  - `updateFCListFromToolResponse(...)`
  - current managed-workflow rendering logic already exists here

#### Intent

Make slash activation refresh the backend-owned checklist immediately, the same way managed `use_skill` does.

#### Line-Level Code Intent

1. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts):
   - In the `activate_managed_workflow` branch of `applyPersistentSlashCommandAction(...)`, after `managedWorkflowRun` and task state fields are set, call the same focus-chain refresh path used by managed `use_skill`

2. Specifically:
   - If `this.FocusChainManager` exists, call:
     - `await this.FocusChainManager.updateFCListFromToolResponse(undefined)`
   - Then call:
     - `await this.postStateToWebview()`

3. If focus chain is disabled:
   - Add a lightweight fallback so `taskState.currentFocusChainChecklist` is still initialized from `renderManagedWorkflowTaskProgress(...)`
   - Then call `postStateToWebview()` so the UI reflects the run state even without the focus-chain manager instance

4. Keep persistence ordering safe:
   - State mutation should happen first
   - Metadata save can remain after state mutation
   - Checklist render should happen after state mutation and before returning from the method

#### Acceptance Criteria

- `/bmad-code-review` and other managed slash commands immediately surface the backend-owned checklist
- The initial checklist appears without waiting for a later tool call
- `currentFocusChainChecklist` matches the managed workflow renderer immediately after slash activation

### 3. Checkpoint Items Are Marked Blocking But Not Enforced

#### Finding

Checkpoint items are extracted with `blocked: true`, but the workflow controller does not use that field at all when marking items complete or when determining whether a phase may advance.

Impacted code:

- [ManagedWorkflowPhaseExtractor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowPhaseExtractor.ts)
  - checkpoint items are appended with `blocked: true`
- [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts)
  - `completeManagedWorkflowItem(...)` currently permits any current-phase item to be completed in any order

#### Intent

Make `blocked` meaningful in v1 by enforcing checkpoint ordering, even if semantic confirmation is still deferred to a future version.

#### Line-Level Code Intent

1. In [ManagedWorkflowController.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/ManagedWorkflowController.ts):
   - Inside `completeManagedWorkflowItem(...)`, capture the target item index within the current phase
   - Evaluate earlier items in the phase before allowing completion

2. Add blocking rules:
   - If the target item itself has `blocked: true`, require all earlier non-optional items in the phase to already be complete before permitting completion
   - If there is any earlier incomplete `blocked: true` item, reject completion of later items until that blocked item is resolved

3. Enforce via explicit error:
   - Throw a structured error message such as:
     - `Item "<id>" is blocked until earlier required workflow items are complete.`
   - This is sufficient for v1 because the runtime already treats tool handler failures as hard stops

4. Preserve current phase advancement logic:
   - Phase completion can still remain `items.every(item => item.completed || item.optional === true)`
   - The key change is that blocked items can no longer be prematurely completed or bypassed

5. Optional follow-up if needed in same patch:
   - Render blocked checkpoint items distinctly in the managed workflow prompt text so the model sees them as gating steps rather than ordinary checklist entries

#### Acceptance Criteria

- A checkpoint item cannot be completed until all earlier required items in the phase are complete
- Later items cannot be completed if an earlier blocked checkpoint remains unresolved
- Phase advancement remains impossible until the checkpoint item is complete

### 4. Archive Verification Is Not Wired Into The Real Publish Flow

#### Finding

Archive verification exists and is used by standalone packaging and one e2e build path, but the actual marketplace publish scripts still go straight to `vsce publish` and `ovsx publish`. That means the release path does not currently guarantee archive-level managed-workflow asset verification.

Impacted code:

- [package.json](/Users/robertboston/Documents/Cline%20Extension/cline/package.json)
  - `publish:marketplace`
  - `publish:marketplace:prerelease`
  - `vscode:prepublish`
- [verify-managed-workflow-assets.mjs](/Users/robertboston/Documents/Cline%20Extension/cline/scripts/verify-managed-workflow-assets.mjs)
  - archive verification support already exists

#### Intent

Route real release flows through a verified packaged artifact before publishing.

#### Line-Level Code Intent

1. Add a dedicated release-packaging script under [scripts](/Users/robertboston/Documents/Cline%20Extension/cline/scripts):
   - Example: `scripts/package-vsix-with-managed-workflow-verification.mjs`

2. In that script:
   - Run `vsce package --allow-package-secrets sendgrid --out <target-vsix>`
   - Immediately run:
     - `node scripts/verify-managed-workflow-assets.mjs --archive=<target-vsix>`
   - Exit non-zero if verification fails

3. Update [package.json](/Users/robertboston/Documents/Cline%20Extension/cline/package.json):
   - Add a reusable script such as:
     - `package:vsix:verified`
   - Make `test:e2e:build` call that script instead of inlining `vsce package`
   - Make `publish:marketplace` and `publish:marketplace:prerelease` route through the verified packaging step before any publish command runs

4. Preferred release flow:
   - `npm run package:vsix:verified`
   - `vsce publish --packagePath <verified-vsix>`
   - `ovsx publish <verified-vsix>`

5. Keep `vscode:prepublish` as the existing source-tree/build hook:
   - It can continue to run `npm run package`
   - But the actual publish scripts must additionally verify the final VSIX archive before publish

#### Acceptance Criteria

- `publish:marketplace` verifies a real VSIX archive before publishing
- `publish:marketplace:prerelease` verifies a real VSIX archive before publishing
- The publish path fails if required managed workflow assets are missing from the VSIX

## Recommended Delivery Order

1. Fix `use_skill` alias resolution
2. Fix slash activation checklist rendering
3. Enforce checkpoint blocking semantics
4. Wire real publish scripts through verified archive packaging
5. Add targeted tests for the above

## Test Intent For The Next Patch Set

The next implementation pass should add or extend tests for:

1. `UseSkillToolHandler`
   - alias invocation `bmad-problem-solving`
   - canonical managed workflow persistence

2. `Task.applyPersistentSlashCommandAction(...)`
   - slash activation initializes `currentFocusChainChecklist`
   - slash activation emits the managed checklist path

3. `ManagedWorkflowController`
   - blocked checkpoint item cannot complete early
   - later items cannot bypass unresolved blocked checkpoints

4. publish wiring
   - script-level tests if practical
   - otherwise fixture-based verification of the new packaging script behavior

## Review Checklist

- [x] `use_skill("bmad-problem-solving")` works through the managed alias path
- [x] managed slash activation renders the initial backend-owned checklist immediately
- [x] blocked checkpoint items are enforced, not just annotated
- [x] real publish scripts verify a packaged VSIX archive before publish
