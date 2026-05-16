# Authoring Non-Negotiables:
- This action plan guide is not to be treated as a checklist for the document's broad structure. While the guide does provide the document structure, it also serves as a hard constraint and acceptability standard for every task and subtask written into any action plan and must be treated as such.
- An action plan must be a standalone document, and must be saved in the project folder in which the action plan's backing requirements documentation is saved.
- An action plan must not introduce architecture or functionality which is not clearly prescribed in the provided requirements. While requirements do not provide exact code shape and file coverage, they should be clear enough that a single implementation solution is clear and easy to derive and build into the action plan. In these situations, you must stop, inform the user that the requirements need additional detail before the action plan can be authored in a compliant manner, and await their direction:
    - The requirements may be implemented via more than one compliant method and do not clearly define the user-approved method.
    - The necessary code revisions (adds/deletes/updates) uncover additional necessary revisions for which the user-approved approach is unclear or unaddressed in the requirements.
    - The necessary code revisions conflict with the repo's established functionality, architecture, or coding conventions, and the requirements do not clearly acknowledge and resolve the conflict.
- An action plan must never prescribe retyping, casting, renaming, or otherwise mutating existing capabilities/functionality unless the requirements clearly state that user approval was gained in advance.

# Prohibited Behavior
This action plan guide is intended to PREVENT & PROHIBIT this behavior:
- Agent read the requirements and converted them into broad implementation objectives.
- Agent did not fully trace every target test/runtime file to the actual TypeScript contracts before writing each subtask.
- Agent treated this guide as a checklist for broad document structure, not a hard constraint for individual subtasks
- Agent used sibling architecture similarity as a shortcut, including verbiage like "equivalent to" in subtasks rather than prescricing exact code shape.
- Agent failed to scope each subtask to a single prescribed change by including subtask language like "add registry tests..." and "add prompt tests asserting..."
- Agent wrote milestone-style subtasks where the guide requires exact revisions.
- Agent relied on validation to expose details that the action plan author is supposed to catch up front.
- Agent failed to trace implementation thoroughly, causing the action plan to sequence dependencies in reverse order
- Agent performed a cursory audit only before signalling completion, treating subtasks that did not exhibit obvious violations like "if needed" as compliant rather than ensuring that each subtask fully complied with this guide.

# Action Plan Guide Authoring Procedure

## Step 1: Build the initial action plan structure with the following required headings:
- FrontMatter
- Scope
- Scope Boundary (what is out of scope)
- Known Issues/ Risks/ Technical Debt (may be omitted if there is nothing relevant to include for the action plan)
- Tasks / Subtasks
- Validation

## Step 2: Populate frontmatter, scope, scope boundary, and known issues/ risks/ technical debt sections:

### FrontMatter
Start with the exact required frontmatter from this guide. This is the execution contract for dev agents.

### Scope
After parsing requirements, summarize only the approved obligations the action plan will deliver: runtime behavior, tools, forms, artifacts, prompt projection, cleanup, and tests.

### Scope Boundary
List what the requirements do not authorize. This prevents accidental inferred work, such as implementing child workflows, changing shared runtime architecture, or preserving legacy aliases.

### Known Issues / Risks / Technical Debt
Add only real risks discovered during code inspection: dirty worktree constraints, legacy code being deleted, known environment validation behavior, or dependencies on existing shared runtime seams. Do not use this section for unresolved decisions; unresolved decisions must stop authoring. You may add to this section in step 3 while authoring tasks and subtasks if additional issues/ risks/ technical debt are discovered.

## Step 3: Identify and document the action plan's tasks and subtasks:

1. Treat this action-plan guide as the acceptance contract. Read it first and use it as the checklist for whether the plan is valid. Every line of the action plan, every task and subtask, must be written in compliance with this guide and validated before completion to ensure compliance with this guide. 

2. Read the requirements and parse them into observable obligations:
   runtime behavior, persisted values, artifacts, form UI, tool exposure, prompt projection, routing, validation, cleanup, and tests.

3. Map each obligation to the owning layer:
   workflow definition, shared runtime, tool handler, schema builder, artifact registry, prompt integration, runtime tests, handler tests, cleanup, or validation.

4. For each owning layer, inspect the actual target files before drafting:
   current code, sibling module patterns, imports, exports, shared types, route/action contracts, workflow value contracts, tool schemas, fixture helpers, and existing test style.

5. Derive the exact delta from code, not from requirement prose:
   add, update, delete, export, register, test, or validate. No “support X” or “cover Y” summaries.

6. Check compile contracts before writing the subtask:
   required imports, discriminated unions, required fields, typed return values, event/session/action shape, workflow values, mocks, stubs, fixtures, and no forced casts.

7. Write tasks & subtasks following the Task/ Subtask Authoring Rules:
   - Each subtask covers one target file with one prescribed change. If a subtask contains multiple independent decisions, split it. Indicate target file for each subtask.
   - Each subtask prescribes a single target file to which the prescribed code is contained.
   - Example of a subtask written in a non-compliant manner due to failure to prescribe the exact helper names or their parameter lists, return types, object shapes, or narrowing patterns:
        [ ] Subtask 8.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`, add typed helpers equivalent to the blind-review test helpers for creating sessions, commit form sessions, finding routes, reading panels/fields, rendering workflow values, building prompt input, building prompt strings, listing tool names, constructing `workflow_form_panel_submitted`, `tool_backed_operation_succeeded`, `tool_backed_operation_failed`, and `attempt_completion_succeeded` events; every event object must include all required fields such as `submittedValueKeys` and `clearedValueKeys`.
   - Example of a subtask that is not compliant because it is milestone-based/descriptive, lumps several revisions together into a single subtask, and fails to prescribe exact required revisions:
        [ ] Subtask 8.3. In `edgeCaseHunterReviewWorkflow.test.ts`, add tests asserting workflow identity, persona, description-backed entry panel, workflow value inventory, entry project keys, and child inheritance exactly include `review_commit_hash`, `review_commit_parent`, `target_story`, and `review_scope_manifest`; do not include registry assertions in this phase.
    - Example of the same subtask, still written in non-compliant fashion due to failure to prescribe the exact parameter list, return type, object shape, and narrowing pattern for the prescribed helpers. It also fails to provide the full path for the target file:
        [ ] Subtask 8.3. In `edgeCaseHunterReviewWorkflow.test.ts`, add these exact typed helpers with explicit return types and edge-case-hunter-review constants: `createSession`, `buildCommitFormSession`, `getStep`, `findRoute`, `getWorkflowForm`, `getPanel`, `getSingleField`, `renderWorkflowValue`, `createPromptInput`, `buildPrompt`, `getToolNamesForStep`, `buildWorkflowFormPanelSubmittedEvent`, `buildToolBackedOperationSucceededEvent`, `buildToolBackedOperationFailedEvent`, `buildAttemptCompletionSucceededEvent`, `isActionKind`, `expectActionKind`, `expectTransitionStepAction`, `expectEventPredicateMatches`, `expectSessionPredicateMatches`, `expectSucceeded`, `runRequiredGitCommand`, `createTemporaryGitProject`, and `expectSucceededWithoutCommitWrites`; every event object must include all required fields such as `submittedValueKeys` and `clearedValueKeys`, and no helper may use `any`, `as any`, `as never`, or incomplete runtime event/session/action shapes.
    - Example of a subtask generated after breaking the example above apart into revision-scoped subtasks, is still not compliant because it does not provide the allowed file for the subtask:
        [ ] Subtask 8.2. Add fixture constants exactly: `PROJECT_ROOT = "/tmp/edge-case-hunter-review-project"`, `TARGET_STORY_PATH = `${PROJECT_ROOT}/implementation/stories-review/Story-1-1.md``, `REVIEW_FOLDER_PATH = `${PROJECT_ROOT}/review``, `REVIEW_SCOPE_MANIFEST_PATH = `${REVIEW_FOLDER_PATH}/review-scope-1-1.md``, `EDGE_CASE_REVIEW_OUTPUT_PATH = `${REVIEW_FOLDER_PATH}/edge-case-hunter-1-1.md``, and `SAMPLE_WORKFLOW_VALUES: WorkflowValues` with exact entries for `TargetStory`, `SelectedStoryIdentity: "1.1"`, `ReviewCommitHash: "abc123"`, `ReviewCommitParent: "def456"`, `ReviewScopeManifest`, all four review-scope artifact metadata keys, `EdgeCaseReviewOutput`, and all four edge-case output artifact metadata keys.
    - Example of a subtask that is still not compliant because it leaves object shapes partially complicit. For createSession, “complete ui state” is vague. It should spell out ui: { formSession, stepResolutionSession: undefined, suppressedWorkflowFormIds: [], suppressedWorkflowStepResolutionRoutes: [] }. The subtask also fails to indicate the target file.
        [ ] Subtask 8.2. Add `createSession(workflowValues: WorkflowValues, projectRoot = PROJECT_ROOT, branchContext: ActiveWorkflowSession["branchContext"] = { activeBranchId: "step-1-route-by-existing-values" }, formSession: WorkflowFormSessionState | undefined = undefined): ActiveWorkflowSession`; it must return a complete active Step 1 session with `projectSelection.projectMode: "existing"`, project title/folder from `basename(projectRoot)`, `lifecycle.projectSelectionCompleted: true`, `entryArtifactResolution: undefined`, complete `ui` state, and the supplied `branchContext`.
     - Example of a subtask that is not compliant because it prescribes a generic narrowing helper that still needs a type assertion to return Extract<...>. This guide forbids forcing assertions unless the exact safe narrowing pattern is prescribed. The subtask says “without forced casts” but fails to prescribe the exact TypeScript-safe implementation. The dev agent would still have to figure out whether the generic predicate narrows enough for the return type, and what to do if TypeScript does not accept it. The subtask also fails to indicate the target file. 
        [ ] Subtask 8.18. Add `expectActionKind<Kind extends WorkflowDecisionAction["kind"]>(action: WorkflowDecisionAction, kind: Kind): Extract<WorkflowDecisionAction, { kind: Kind }>`; it must assert `action.kind`, call `isActionKind`, throw on mismatch, and return the narrowed action without `as any` or forced casts.
    - Example of a subtask that is not compliant because createTemporaryGitProject is not exact enough. It does not prescribe temp folder prefix, file paths, commit file contents, git add/commit order, or cleanup expectations. The subtask also fails to indicate the target file.
        [ ] Subtask 8.24. Add `createTemporaryGitProject(): Promise<{ root: string; targetStory: string; firstCommitHash: string; secondCommitHash: string }>`; it must create a temp Git project, configure user email/name, create `implementation/stories-review/Story-1-1.md`, create two commits, and return root/story/commit hashes.

8. For tests, prescribe setup and assertions explicitly:
   imports, helper shapes, fixture values, event/action/session objects, stable behavioral assertions, and forbidden prompt-prose or legacy assertions.

9. Re-read the drafted phase line by line:
   if a dev agent would need to choose architecture, infer a type shape, discover an import path, design a fixture, or decide what proves correctness, rewrite the subtask.

10. When revising checked work, reopen every materially changed task/subtask.

11. When a blocker exposes a class of issue, audit the rest of the phase for that same issue before returning work to the dev agent.

## Step 4: Author the validation section of the action plan:

Author the validation section following the Validation Section Rules.
Derive validation from the touched layers:
focused unit tests, integration tests, check-types, lint, negative guards for retired runtime concepts, and scope-diff checks. Validation commands must be exact and supported by the repo.

# Required Frontmatter:
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
  - You must avoid these banned development bad habits:
    - "any" typing
    - val as SomeType
    - as any in tests
    - optional properties most of the time (explicitly model which combinations exist and which don't whenever possible)
    - one-letter generics
    - non-boolean boolean checks
    - bang bang operators (explicitly check for the condition instead)
    - != null (explicitly check for the condition instead)
    - not declaring function return types
    - abuse of type assertions (use them only in special scenarios where the type is clearly known, and give priority to type declarations, interfaces, or generics)
    - Failing to use utility types (use utility types such as partial, pick, omit, etc when appropriate)
    - forcing assertions when types don't match
    - not using enums to manage constants
    - not using generics to abstract duplicated code
    - not using type narrowing
    - not explicitly defining generics parameters

# Task / Subtask Authoring Rules:
*** Task / Subtask Section Structure: ***
- If the action plan is not a simple patch with few steps, it must be broken into distinct phases with instructions to pause for QA review before moving on to the next section.
- Tasks may be scoped in one of the following ways. Both methods may be used within the same action plan:
    Method 1: Target File Scoped- this method is appropriate when there are many necessary revisions in a single file. Common when building a new file.
    Method 2: Function-Scoped: this method groups subtasks for a single function or capability across many files. Common when renaming an existing function or introducing a new capability which requires integration across many files. 
- A task must only encompasss more than one single prescribed revision when those revisions are prescribed through subordinate subtasks. A task with no subordinate subtasks must ony prescribe a single exact revision in a single target file. 
- A task without subordinate subtasks must include the full full file path for the target file.
- If a task is suppported by subordinate subtasks, the task itself may be a simple summarization of the prescribed changes, with the subtasks indicating the exact required revisions in compliance with this guide.
    example:
        [ ] Task 8: Add focused edge-case-hunter-review workflow tests
- Tasks & Subtasks must be on their own lines starting with "[ ]" so that dev agents can mark completion as they progress through the action plan.
    - subtasks must be nested with appropriate indentation for readability.
- Each subtask must prescribe exactly one line-level revision with target file indicated- summaries or descriptions of changes are not permitted.
    Example task & subtask structure: (note that this subtask does prescribe the allowed file)
        [ ] Subtask 8.3: In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`, add `STEP_2_TOOL_NAMES: readonly string[]` with exactly `["execute_command", "list_files", "search_files", "list_code_definition_names", "read_file", "read_file_range", "apply_patch", "write_to_file", "send_user_message", "attempt_completion"]`.
- A task without subordinate subtasks and all subtasks must include clear indication of the target file for the prescribed revision.
- You must not leave decision space to the agent who will implement the action plan. As the action plan author, it is your job to review runtime code, identify the complete and correct necessary revisions, and prescribe those revisions clearly within the action plan. This includes test fixtures associated with any runtime code that is being revised, removed, or added.
- Every code/test subtask must be compile-path reviewed before it is written. The action-plan author must inspect the target runtime file, target test file, adjacent sibling patterns, and relevant shared types to identify TypeScript constraints the dev agent will encounter.
- If a subtask touches parsed JSON, `unknown`, discriminated unions, optional properties, workflow values, tool params/results, schema objects, event objects, persisted metadata, stubs, mocks, fixtures, or helper return types, the subtask must prescribe the exact compile-safe type narrowing, object construction, or fixture shape required.
- Do not leave TypeScript narrowing, union discrimination, fixture typing, or helper return typing for the dev agent to discover during validation.

*** Before turning a necessary revision into a task or subtask, you MUST: ***
1. Verify solution quality and standards
   - Ensure the proposed code or fix is appropriate, elegant, and consistent with modern, industry-standard practices for the project's tech stack, including CLEAN architecture.
   - If you must deviate from best practices (e.g., due to constraints), clearly explain why and what the ideal pattern would be.

2. Prescribe deep, architectural fixes over surface workarounds
   - Check whether the issue can and should be solved at a deeper architectural layer (design, data flow, responsibilities) rather than with a shallow or hacky workaround.
    - A pragmatic workaround must not be prescribed unless it is clearly authorized in the separate requirements document and approved by the user. In these cases, the deeper architectural solution must be clearly documented in the separate requirements document. If it is not, then the pragmatic solution should be considered underspecified and unauthorized until the user authorizes an update to the requirements document.

3. Look for underlying design-pattern flaws
   - Examine whether the necessary revision reveals deeper design or pattern problems (e.g., responsibilities mixed, poor separation of concerns, leaky abstractions).
   - If such problems exist, you must stop and inform the user of them. When you do, provide detailed information and propose how they could be addressed, even if the full fix is out of scope based on the provided requirements.

4. Consider downstream and peripheral impact
   - Evaluate how the change may affect other modules, call sites, and features, including edge cases and lifecycle interactions. Search the codbase and read peripheral files if uncertain.
   - If the change is likely to cause downstream or peripheral issues, that is acceptable only if:
     a) You clearly identify and describe these risks, AND
     b) You propose follow-up steps or mitigations as part of the solution.

5. Avoid hardcoded values; prescribe integration with config/strings where appropriate
   - Do NOT introduce hardcoded strings or values when they represent configuration, thresholds, labels, messages, or anything reasonably likely to change.
   - Instead, integrate such values into the app’s configuration system when appropriate for user/admin/dev tweaking
   - All user-facing or UI strings MUST go into a strings.xml (or similar)
   - If you cannot follow this rule for some reason, explicitly state why.

6. Prescribe removal of cruft and failed-attempt remnants
   - Ensure that your changes do not leave behind obsolete code/imports, commented-out experiments, dead branches, or outdated patterns related to prior failed attempts.
   - Consider related/downstream modules that may now contain redundant or inconsistent code as a result of your change.
   - De-crufting should be treated as part of the fix: either perform it in your changes, or clearly specify what should be removed/refactored and where.
- When deleting or retiring a domain concept, delete its named gates, helper methods, variables, and tests rather than repointing them at another surviving concept.

7. Practice Good Code Hygiene by avoiding common bad habits:
    - "any" typing
    - val as SomeType
    - as any in tests
    - optional properties most of the time (explicitly model which combinations exist and which don't whenever possible)
    - one-letter generics
    - non-boolean boolean checks
    - bang bang operators (explicitly check for the condition instead)
    - != null (explicitly check for the condition instead)
    - not declaring function return types
    - abuse of type assertions (use them only in special scenarios where the type is clearly known, and give priority to type declarations, interfaces, or generics)
    - Failing to use utility types (use utility types such as partial, pick, omit, etc when appropriate)
    - forcing assertions when types don't match
    - not using enums to manage constants
    - not using generics to abstract duplicated code
    - not using type narrowing
    - not explicitly defining generics parameters
    - semantic aliasing, where a variable/function/type with an old domain meaning is reassigned to a new generic or unrelated concept instead of being deleted
    - stale domain naming after behavior migration; names must describe the current approved responsibility, not the historical source of the code
    - compatibility remaps that preserve retired concepts by pointing them at surviving generic behavior unless the upstream requirements explicitly approve that remap
    - boolean aliases whose name does not exactly match the condition they represent; use the existing boolean directly or introduce a correctly named concept only if the architecture requires it
    - retaining obsolete gates/seams/flags after their original behavior is removed
    - returning a value typed only as `object` from a helper declared to return `Record<string, unknown>`; build a new record from `Object.entries(...)` after validating the value is a non-null, non-array object
    - reading variant-specific fields from a union before narrowing on the discriminant
    - using test fixture objects that omit required fields from typed runtime events, sessions, route actions, tool requests, workflow values, or metadata contracts
    - relying on TypeScript inference for complex test helpers when an explicit return type or typed intermediate object is required

8. Do not introduce architecture in the action plan that is not prescribed in an upstream document.
    - If there is an architecture or requirements document, the action plan must not introduce additional architecture beyond the scope of what those documents prescribe. There is no such thing as inferred architecture. If something is not explicitly prescribed, it is not prescribed at all.
    - If you determine that additional or different architecture is necessary while authoring the action plan, you must stop and inform the user so that the appropriate revisions can be made to upstream documents first.

9. Avoid in-plan churn. Do not prescribe code in one task/ subtask only to replace the prescribed code in a subsequent task/ subtask. Identify the final shape of every line being prescribed, and require the dev agent to implement it that way in one task / subtask. 

10. Every phase must end in a repo-valid intermediate state.
- If an action plan is split into phases with QA pauses, each phase must leave the repo in a state that passes the same static gates required before commit, including formatting, lint, typecheck, and any focused tests prescribed for that phase.
- Do not prescribe unused imports, unused helpers, placeholder scaffolding, future-step code, or partially wired definitions in an earlier phase unless that phase also wires them into legitimate runtime use.
- If code cannot be cleanly introduced without being used until a later phase, move that code to the later phase or merge the phases so the pause point occurs after the code is used.
- Phase boundaries must be implementation-cohesive, not merely topical. A phase should represent a valid, reviewable increment that can be committed without bypassing repo hooks.

11. Every phase must be compile-ready by construction.
- Before finalizing a phase, review every prescribed runtime helper, test helper, fixture, stub, mock, schema object, tool result, workflow value, and route/event object for likely `npm run check-types` failures.
- If the final implementation will require a specific type guard, discriminant check, typed intermediate object, `satisfies` clause, or explicit return type, prescribe that exact pattern in the relevant subtask.
- If the action-plan author cannot determine the compile-safe pattern from the existing codebase, stop and ask the user before marking the action plan ready.

12. When a plan references existing artifacts or placeholders, trace the exact runtime resolution path end to end:
    config/source of truth
    resolver/helper
    handler/runtime consumer
    tests/docs that assert the convention
    
13. For any plan that introduces a new artifact, tool, or schema entry, perform a sibling-pattern audit:
    registration
    executor wiring
    prompt/tool exposure
    approval/path policy
    tests
    snapshots/generated surfaces
    docs/reference surfaces if treated as canonical in-repo

14. Do not compress tasks/ subtasks into milestone-style implementation summaries. Each subtask must prescribe a single, exact, unambiguous code revision, removal, or addition with exact required code shape. 


If at any point you cannot satisfy one or more of these rules (for example, due to missing context or constraints in the existing architecture), you MUST notify the user:
- Explicitly state which rule(s) you cannot fully satisfy, and why.
- Propose the best available compromise, and outline what a more ideal long-term fix would look like.

# Validation Section Rules
- Prescribe exact tests to be executed after all tasks and subtasks are complete
- Review the test expectations/ assertions and ensure that they will not be stale due to changes made during action plan implementation
- Ensure that prescribed testing is supported by the repo
- For phased plans, prescribe phase-level validation at every QA pause, including the repo’s formatting/lint/typecheck gates needed for a clean commit.
- If `npm run check-types` fails in files modified by the current phase, treat it as an action-plan prescription gap unless investigation proves it is unrelated drift or environment failure.

## Test Prescription Calibration
- Prescribe tests only for behavior, contracts, regressions, and material risks required by the requirements, architecture, or approved action plan scope.
- Tests related to prompting should look for non-empty prompt strings; they should never prescribe or assert specific prompt verbiage. 
- Each prescribed test must have a clear purpose: success path, required failure path, boundary/security behavior, persistence contract, schema/tool exposure contract, or integration wiring.
- Do not prescribe exhaustive deep-equality assertions for objects containing editable prompt prose, persona prose, descriptions, or other copy unless exact text is itself the approved runtime contract.
- Use exact assertions for canonical machine-consumed outputs and stable contracts, including tool names/schema shape, artifact file formats, persisted metadata keys, required route/action kinds, generated index JSON, and canonical document structures.
- Use shape and invariant assertions for editable content: required fields exist, strings are non-empty, arrays are non-empty, mapped role/category is correct, and forbidden legacy values are absent.
- Avoid duplicative coverage across layers. Prefer unit tests for pure builders and handlers, integration tests for runtime projection/wiring, and E2E tests only when user-visible extension behavior cannot be adequately verified below that layer.
- Do not add static guards unless they protect an approved boundary, forbidden legacy dependency, forbidden model-facing tool, or known regression risk.
- Before prescribing validation, review the assertions that will be introduced or updated and ensure they will not fail only because approved editable wording changed.
- For tests focused on prompt behavior, ensure that coverage exists ensuring that required prompts are non-empty, conditional prompting is included when required, and that each placeholder is materialized in the prompt rather than the prompt including the raw placeholder text.