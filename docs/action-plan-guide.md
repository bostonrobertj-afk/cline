# Authoring Non-Negotiables:
- Each action plan must be a standalone document and must be saved in the project folder if one exists
- The action plan must directly support achievement/delivery of every project requirement
- If you encounter a decision point which was not already explicitly discussed and decided/approved by the user, you must STOP and present the decision to them along with a recommendation, then gain their approval and/or alignment before continuing your work authoring the action plan. YOU DO NOT SOLVE FOR AMBIGUOUS REQUIREMENTS UNLESS YOU CLEARLY STATE TO THE USER THAT THE REQUIREMENTS ARE AMBIGUOUS OR LEAVE ROOM FOR INTERPRETATION AND YOU ARE PROPOSING A SPECIFIC APPROACH.
-When a plan references existing artifacts or placeholders, trace the exact runtime resolution path end to end:
    config/source of truth
    resolver/helper
    handler/runtime consumer
    tests/docs that assert the convention
    For any plan that introduces a new artifact, tool, or schema entry, perform a sibling-pattern audit:
    registration
    executor wiring
    prompt/tool exposure
    approval/path policy
    tests
    snapshots/generated surfaces
    docs/reference surfaces if treated as canonical in-repo
- After writing an action plan, reach each line of the action plan and seek out any inconsistencies or conflicts. During this review, assess each task and subtask for internal dependencies, and ensure that no task or subtask is dependent upon a task or subtask which is sequenced after it in the action plan. Resolve them appropriately, asking the user for input if necessary, before indicating that the action plan is complete.
- NEVER prescribe retyping, casting, renaming, or otherwise mutating existing capabilities/functionality within an action plan unless you have surfaced the proposed change as a single topic to the user and gained their approval. 

# Required Action Plan Sections:
- FrontMatter
- Scope
- Scope Boundary (what is out of scope)
- Known Issues/ Risks/ Technical Debt (may be omitted if there is nothing relevant to include for the action plan)
- Tasks / Subtasks
- Validation

# Required Frontmatter:
Include this exact frontmatter at the top of every action plan document:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.
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
- Tasks & Subtasks must be on their own lines starting with "[ ]" so that dev agents can mark completion as they progress through the action plan.
- Subtasks must prescribe exact line-level revisions with target file indicated.
- Subtasks must never prescribe more than ONE required revision
- Each task & subtasks should have clearly defined allowed files for the prescribed edit.
- You must not leave decision space to the agent who will implement the action plan. As the action plan author, it is your job to review runtime code, identify the complete and correct necessary revisions, and prescribe those revisions clearly within the action plan. This includes test fixtures associated with any runtime code that is being revised, removed, or added.

*** Before turning a necessary revision into a task or subtask, you MUST: ***
1. Verify solution quality and standards
   - Ensure the proposed code or fix is appropriate, elegant, and consistent with modern, industry-standard practices for the project's tech stack, including CLEAN architecture.
   - If you must deviate from best practices (e.g., due to constraints), clearly explain why and what the ideal pattern would be.

2. Prescribe deep, architectural fixes over surface workarounds
   - Check whether the issue can and should be solved at a deeper architectural layer (design, data flow, responsibilities) rather than with a shallow or hacky workaround.
   - If you choose a workaround for pragmatic reasons, explicitly label it as such and describe the deeper architectural fix that would be ideal.

3. Look for underlying design-pattern flaws
   - Examine whether the issue reveals deeper design or pattern problems (e.g., responsibilities mixed, poor separation of concerns, leaky abstractions).
   - If such problems exist, call them out explicitly and propose how they could be addressed, even if the full fix is out of scope for the immediate change.

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

8. Do not introduce architecture in the action plan that is not prescribed in an upstream document.
    - If there is an architecture or requirements document, the action plan must not introduce additional architecture beyond the scope of what those documents prescribe. There is no such thing as inferred architecture. If something is not explicitly prescribed, it is not prescribed at all.
    - If you determine that additional or different architecture is necessary while authoring the action plan, you must stop and inform the user so that the appropriate revisions can be made to upstream documents first.

If at any point you cannot satisfy one or more of these rules (for example, due to missing context or constraints in the existing architecture), you MUST:
- Explicitly state which rule(s) you cannot fully satisfy, and why.
- Propose the best available compromise, and outline what a more ideal long-term fix would look like.
9. Avoid in-plan churn. Do not prescribe code in one task/ subtask only to replace the prescribed code in a subsequent task/ subtask. Identify the final shape of every line being prescribed, and require the dev agent to implement it that way in one task / subtask. 

# Validation Section Rules
- Prescribe exact tests to be executed after all tasks and subtasks are complete
- Review the test expectations/ assertions and ensure that they will not be stale due to changes made during action plan implementation
- Ensure that prescribed testing is supported by the repo

# Test Prescription Calibration
- Prescribe tests only for behavior, contracts, regressions, and material risks required by the requirements, architecture, or approved action plan scope.
- Each prescribed test must have a clear purpose: success path, required failure path, boundary/security behavior, persistence contract, schema/tool exposure contract, or integration wiring.
- Do not prescribe exhaustive deep-equality assertions for objects containing editable prompt prose, persona prose, descriptions, or other copy unless exact text is itself the approved runtime contract.
- Use exact assertions for canonical machine-consumed outputs and stable contracts, including tool names/schema shape, artifact file formats, persisted metadata keys, required route/action kinds, generated index JSON, and canonical document structures.
- Use shape and invariant assertions for editable content: required fields exist, strings are non-empty, arrays are non-empty, mapped role/category is correct, and forbidden legacy values are absent.
- Avoid duplicative coverage across layers. Prefer unit tests for pure builders and handlers, integration tests for runtime projection/wiring, and E2E tests only when user-visible extension behavior cannot be adequately verified below that layer.
- Do not add static guards unless they protect an approved boundary, forbidden legacy dependency, forbidden model-facing tool, or known regression risk.
- Before prescribing validation, review the assertions that will be introduced or updated and ensure they will not fail only because approved editable wording changed.
