# Authoring Non-Negotiables:
- This action plan guide is not to be treated as a checklist for the document's broad structure. While the guide does provide the document structure, it also serves as a hard constraint and acceptability standard for every task and subtask written into any action plan and must be treated as such.
- An action plan must be a standalone document, and must be saved in the project folder in which the action plan's backing requirements documentation is saved.
- An action plan must not introduce architecture or functionality which is not clearly prescribed in the provided requirements. While requirements do not provide exact code shape and file coverage, they should be clear enough that a single implementation solution is clear and easy to derive and build into the action plan. In these situations, you must stop, inform the user that the requirements need additional detail before the action plan can be authored in a compliant manner, and await their direction:
    - The requirements may be implemented via more than one compliant method and do not clearly define the user-approved method.
    - The necessary code revisions (adds/deletes/updates) uncover additional necessary revisions for which the user-approved approach is unclear or unaddressed in the requirements.
    - The necessary code revisions conflict with the repo's established functionality, architecture, or coding conventions, and the requirements do not clearly acknowledge and resolve the conflict.
- An action plan must never prescribe retyping, casting, renaming, or otherwise mutating existing capabilities/functionality unless the requirements clearly state that user approval was gained in advance.

# Prohibited Behavior, or what NOT to do:
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

# Action Plan Guide Authoring Procedure- to be followed EXACTLY:

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

## Step 3: Identify the Appropriate Action Plan Phases:
- If possible, the action plan should be divided into ordered phases, each of which end in a repo-valid intermediate state during which targeted testing and validation can be run during phase quality assessment.
- An action plan phase must not end with unused imports, unreachable private helpers, dead branches, or unvalidated new exports. A phase may introduce exported builders or helper modules before runtime integration when they are compile-safe, directly covered by phase validation, and wired into their runtime consumer in a later prescribed phase.
- Likewise, an action plan must never prescribe removal of code which leaves behind "dead code" at the end of the action plan phase in which the code's deletion is prescribed.
- Phase boundaries must be implementation-cohesive, not merely topical. Each phase must represent a valid, reviewable increment that can be committed cleanly.
- Before moving on, add clear phase headings with brief descriptions to the action plan document, then add a subheading for each phase indicating the requirements which are relevant during the phase's implementation.

## Step 4: Identify and Document the tasks and subtasks one phase at a time:
### Follow these steps to derive the appropriate tasks and subtasks for a phase:
    - Parse the relevant requirements into observable obligations including runtime behavior, persisted values, artifacts, UI elements, tool configuration, prompt projection, routing, validation, cleanup, and tests
    - Map each obligation to the owning layer, e.g. workflow definition, shared runtime, tool handlers, schema builders, artifact registry, prompt integration, runtime tests, handler tests, cleanup, or validation.
    - For each owning layer, inspect the existing files including current code, sibling patterns, imports, exports, shared types, route/action contracts, prompt integration, tool schemas, fixture helpers, and existing test styles
    - Check compile contracts including required imports, discriminated unions, required fields, typed return values, event/session/action shape, workflow values, mocks, stubs, and fixtures.
    - Evaluate how each revision may affect other modules, call sites, tests, and features, and ensure that appropriate revisions are prescribed for end-to-end coverage.
    - Identify the exact delta which must be prescribed by the action plan phase's tasks & subtasks.

### Add the derived tasks and subtasks to the action plan phase following these rules:
    - Tasks and subtasks must have sequential numerical IDs. Subtasks must inherit the parent task's ID.
    - Tasks & subtasks must start on a new line beginning with "[ ]", then the ID, then the target file's full file path, then the prescribed change.
    - Subtasks must be nested under their parent task with indentation for readability.
    - Tasks may be scoped in one of the following ways. Both methods may be used within the same action plan:
        Method 1: Target File Scoped- this method is appropriate when there are many necessary revisions in a single file. Common when building a new file.
        Method 2: Function-Scoped: this method groups subtasks for a single function or capability across many files. Common when renaming an existing function or introducing a new capability which requires integration across many files. 
    - A task must only encompasss more than one single prescribed revision when those revisions are prescribed through subordinate subtasks. A task with no subordinate subtasks must ony prescribe a single exact revision in a single target file. 
    - A task without subordinate subtasks must include the full full file path for the target file.
    - If a task is suppported by subordinate subtasks, the task itself may be a simple summarization of the prescribed changes, with the subtasks indicating the exact required revisions in compliance with this guide.
    - Subtasks must always include the full file path for the target file.
    - Tasks without subordinate subtasks and all subtasks must prescribe the exact complile-safe type narrowing, object construction, fixture shape, typing, imports, helper shapes, event/action/session objects, type guards, discriminant checks, typed intermediate objects, 'satisfies' clause, explicit return types, stable behavioral assertions, and legacy assertions required.
    - Prescribed changes must be thorough, deep architectural revisions aligned to the provided requirements. Workarounds are not permitted without documented user authorization.
        - Common underspecifications to avoid include but are not limited to: "empty ui state", "all helpers", "all imports", "all exports", "transition to step" without prescribing exact step-transition action objects
    - Prescribe removal of dead code including obsolete functions, unused imports, commented-out experiments, dead branches, or outdated patterns.
    - Do NOT introduce hardcoded strings or values when they represent configuration, thresholds, labels, messages, or anything reasonably likely to change. ALL user-facing or UI strings MUST go into a strings.xml (or similar).
    - Avoid common low-quality development practices, including "any" typing, "as any" in tests, optional properties when it is possible to model the existing and non-existing combinations, bang bang operators, != null, not declaring function return types, inappropriate or overuse of type assertions, failure to use utility types, failing to use enums to manage constants, failing to use appropriate type narrowing, semantic aliasing, stale domain naming, unauthorized preservation of legacy concepts via compatiblity remaps, reading variant-specific fields from a union before narrowing on the discriminant, relying on TypeScript inference for complex test helpers, and using test fixture objects that omit required fields from typed runtime events, sessions, route actions, tool requests, workflow values, or metadata contracts.
    - Do not introduce architecture that is not clearly backed by the provided requirements.
    - user or AI Agent-facing prose, descriptions, and instructions must be prescribed via the requirements and reflected exactly as the requirments prescribe in the action plan. If requirements do not provide the necessary content, stop and ask the user to add approved content to the requirements. 
        - You do not need error messaging for missing required prerequisite files after the prerequisite resolution stage of the workflow. The workflow will end in terminal error during prerequisite file resolution if required files are missing.
    Example task & subtask configuration:
    [ ] Task 1: In <target file path a>, add two helper functions:
        [ ] Subtask 1.1: In <target file path a>, add <helper function 1 exact prescribed code>
        [ ] Subtask 1.2: In <target file path a>, add <helper function 2 exact prescribed code>
    [ ] Task 2: In <target file path a>, replace <existing code> with <exact prescribed replacement code>.
    [ ] Task 3: Delete <existing import a> in both files it appears in:
        [ ] Subtask 3.1: In <target file path a>, delete <existing import a>
        [ ] Subtask 3.2: In <target file path b>, delete <existing import a>

### Validate the drafted phase's compliance with this guide:
- Re-read the drafted phase line by line:
    - Validate that every task and subtask fullly complies with the rules outlined above.
    - If a dev agent would need to choose architecture, infer a type shape, discover an import path, design a fixture, or decide what proves correctness, rewrite the subtask.
    - Perform a symbol existence pass over every prescribed import and return type. Each must be classified as:
        - existing symbol verified in live code,
        - new symbol created by an earlier subtask in this phase, or
        - invalid and requiring rewrite before the plan can be used.

## Step 5: Author the validation section of the action plan:

Author the validation section following the Validation Section Rules.
Derive validation from the touched layers:
focused unit tests, integration tests, check-types, lint, negative guards for retired runtime concepts, and scope-diff checks. Validation commands must be exact and supported by the repo.

### Validation Section Rules
- Prescribe exact tests to be executed after all tasks and subtasks are complete
- Review the test expectations/ assertions and ensure that they will not be stale due to changes made during action plan implementation
- Ensure that prescribed testing is supported by the repo
- For phased plans, prescribe phase-level validation at every QA pause, including the repo’s formatting/lint/typecheck gates needed for a clean commit.
- If `npm run check-types` fails in files modified by the current phase, treat it as an action-plan prescription gap unless investigation proves it is unrelated drift or environment failure.

### Test Prescription Calibration
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

