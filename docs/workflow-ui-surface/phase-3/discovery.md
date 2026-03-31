
# Initialization
- Workflow form must ask if user has a story file path to provide
- If no, workflow ends; GPT receives the step instructions to hand-build the review input from another source provided by the user
# Story Title
- tool extracts the top "Story #: Story name" line from the story file
# Status
- tool extracts the status line from the story file
# Acceptance Criteria
- Extracts all
# Prior Review Findings
- the tool extracts only the newly added bullet content in `## Prior Review Findings`
- added content is identified through `review-input.diff`
- if any content is extracted from this section, the tool must add a note below "status" that says:
    - This QA pass is reviewing work performed during a remediation cycle. Only the remediation tasks and subtasks are shown here. These tasks and subtasks may or may not satisfy all provided acceptance criteria. Do not treat failure to fully satisfy all acceptance criteria as a defect.
# Latest Review Findings
- the tool writes an empty `## Latest Review Findings` section into `review-input.md` as the writable surface for the current review cycle
- the tool does not copy existing `## Latest Review Findings` content from the story file into `review-input.md`
# Tasks / Subtasks
- User has to provide a story file path
- tool requires that the diff output file already be available to identify tasks completed in the last dev cycle
- tool extracts only those tasks and adds them to a "## Tasks / Subtasks" section in the review-input.md file
- tool must be configured to automatically ingest review-input.diff because it is a stable file path- the build_review-output_diff tool just overwrites the existing file each time it runs
### Completion Notes List
- Filtered extraction using review-input.diff to extract only the notes added in the most recent dev cycle
### Failure Behavior
- if the tool cannot find changes to the story file in review-input.diff, it must surface this error in the workflow UI:
    - diff_output does not identify recent changes to the story file. Proceeding with AI generation of review_input.md using the fallback Step 2 instructions.
- the workflow must then fallback to the manual method where the step's detailed instructions are presented to the AI Agent so that it can build review-input.md by hand.

Expected Output File Shape:
===========================BEGIN EXAMPLE=======================================

# Story ##: Story Name

status:

# Acceptance Criteria:

# Prior Review Findings:

# Latest Review Findings:

# Tasks / Subtasks:

# Completion Notes:

===========================END EXAMPLE=======================================

# Implementation
Build this out in three phases:

## Phase 1: Build the tool
- build build_review_input tool

## Phase 2: Build the workflow form use case
- build the workflow form use case which invokes build_review_input

## Phase 3: Build deterministic workflow progression
- update deterministic workflow progression (if needed) to align with the new workflow step structure

## Required Action Plans
### Tool silo - done
build build_review_input
story-file extraction
diff-assisted filtering for tasks and completion notes
review_input.md generation
tool result contract
### Workflow-form silo - done
add the Phase 3 form use case
collect the story file path
auto-resolve diff_output
invoke build_review_input
surface the exact fallback/error message and return control to the fallback step when needed
### Deterministic progression silo- done
update the code-review.md deterministic evaluator for the new step order
align the pre-form and post-form gates with the reauthored workflow
update the step/tool-schema matrix for code-review.md
