# Authoring Non-Negotiables:
- Each action plan must be a standalone document and must be saved in the project folder if one exists
- The action plan must directly support achievement/delivery of every project requirement
- If you encounter a decision point which was not already explicitly discussed and decided/approved by the user, you must STOP and present the decision to them along with a recommendation, then gain their approval and/or alignment before continuing your work authoring the action plan.
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
- Do not defer decision space to the dev agent - they have enough to manage ensuring that they execute every task given without having to solve for "how".
- If the action plan is not a simple patch with few steps, it must be broken into distinct phases with instructions to pause for QA review before moving on to the next section.
- Tasks & Subtasks must be on their own lines starting with "[ ]" so that dev agents can mark completion as they progress through the action plan.
- Subtasks must prescribe exact line-level revisions with target file indicated.
- Subtasks must never prescribe more than ONE required revision
- Every variable, field, file, and enum name/naming convention must be presented to the user for approval unless existing project documentation specifically indicates the appropriate/required convention. Do not infer naming conventions from runtime code.
- Verify the real type/state shape at each target seam before prescribing exact edits. Do not infer data shapes from adjacent layers or related systems. If the plan touches data across backend, shared types, and UI, trace the value shape in each touched layer and ensure the prescribed changes match the actual declarations and runtime state in the target files.
When prescribing revisions via tasks and sutasks, you must avoid these banned development bad habits:
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

# Validation Section Rules
- Prescribe exact tests to be executed after all tasks and subtasks are complete
- Review the test expectations/ assertions and ensure that they will not be stale due to changes made during action plan implementation
- Ensure that prescribed testing is supported by the repo