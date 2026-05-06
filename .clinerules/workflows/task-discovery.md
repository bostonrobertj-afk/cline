# task-discovery

## Step 1: Resolve Assigned Seam
    Before doing anything else you MUST read these files:
    - Story Doc: `{story_doc}`
    - Epic Delivery Spec: `{epic_delivery_spec}`

    Treat the assigned seam as a strict boundary. Do not broaden scope into unrelated layers, neighboring features, or speculative cleanup. If the assignment is ambiguous, stop and report the ambiguity to the parent agent instead of guessing.

### Trace the Seam in the Live Repo
    Inspect the exact files, directories, symbols, and adjacent code paths needed to understand the seam completely.

    You must trace the seam through all affected surfaces, including:
    - implementation files
    - tests
    - assertions, mocks, and snapshots
    - types, interfaces, schemas, and validators
    - helper utilities, registries, and wiring points

    Verify all filenames, symbol names, and structural boundaries against the live codebase. Do not invent file paths, helper names, or abstractions that do not already exist or cannot be directly justified from the repo.

    Do not edit application code.
    Do not edit the parent story document.

### Build the Seam Packet
    You must document your output in a file located in `{output_folder}/planning-artifacts`, using naming convention seam-name-report.md

    Your output must include the following:
        Tasks / Subtasks
        Write executable, implementation-ready tasks and subtasks for this seam.

        Requirements:
        Every top-level task must describe one cohesive implementation outcome.
        Every top-level task must contain an Allowed Files block.
        The Allowed Files block must include every file needed to complete that task safely.
        Every subtask must fit within the parent task’s allowed files.
        If a required file does not fit cleanly inside an existing task’s allowed files, create a separate top-level task for that slice.
        Do not rely on a document-level allowed-files list.
        Do not write vague tasks like:
        implement support
        handle logic
        add tests
        update types
        Every subtask must:
            name exact file(s) whenever the repo allows it
            describe the concrete edit or validation required
            preserve any important invariant, contract, or boundary when applicable
            Test maintenance is part of implementation, not cleanup.
            Typing/schema/validator/mock/snapshot updates are part of implementation, not cleanup.
        Required shape:
        - [ ] <task outcome written as a cohesive implementation slice>
        - Allowed Files:
            - `path/to/file-a`
            - `path/to/file-b`
        - [ ] <concrete subtask naming exact file and exact change>
        - [ ] <concrete subtask naming exact file and exact test/type/assertion update>
        ### Document Output
        Document findings in `{output_folder}/planning-artifacts` with naming convention seam-name-findings.md

### Add Testing Requirements
After the task blocks, include:

Testing Requirements
    - <exact test file and behavior to validate>
    - Run: `<exact command>`
    Requirements:

    name exact test files when possible
    cover stale assertions, mocks, snapshots, and typing expectations when affected
    include the narrowest useful verification commands you can justify from the repo
    Step 5: Return Merge-Ready Output

### Report to Primary Agent
Use attempt_completion to provide a final report to the primary agent. Include the full file path to your documented findings in your message.
Return only:
    a short seam summary
    the task blocks
    Testing Requirements
Do not return:
    raw exploration notes
    generic recommendations
    brainstorming
    a global allowed-files list
    a rewritten story document
    Your deliverable must be ready for the parent agent to merge directly into the story’s ## Tasks / Subtasks planning content.
