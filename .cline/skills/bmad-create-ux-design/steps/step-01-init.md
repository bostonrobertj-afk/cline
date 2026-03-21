# Step 1: UX Design Workflow Initialization

## META
Goal: Initialize the UX design workflow and determine whether this is a fresh run or a continuation.
Execute this file in order.
Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Check for Existing Workflow">
  <action>Check whether `{planning_artifacts}/ux-design-specification.md` exists.</action>
  <action>If it exists, inspect the complete document, including frontmatter.</action>
  <action>If it does not exist, treat this as a fresh workflow.</action>
</step>

<step n="2" goal="Handle Continuation (If Document Exists)">
  <branch if="the document exists and frontmatter includes `stepsCompleted`">
    <action>Stop here and load `./step-01b-continue.md`.</action>
    <action>Do not perform initialization tasks in this step.</action>
  </branch>
</step>

<step n="3" goal="Fresh Workflow Setup (If No Document)">
  <action>Search `{planning_artifacts}`, `{output_folder}`, `{product_knowledge}`, and `{project-root}/docs` for supporting context.</action>
  <detail>
    Look for product briefs, research documents, broader project documentation, and project context files. If a document appears as a sharded folder, check for `index.md` first and then load the full shard.
  </detail>
  <ask>Confirm the documents you found with the user and ask whether anything else should be included.</ask>
  <action>Load all documents the user confirms or provides and track them in frontmatter `inputDocuments`.</action>
  <action>Create `{planning_artifacts}/ux-design-specification.md` from `../ux-design-template.md` and initialize frontmatter.</action>
  <output>Report the setup summary, list the documents loaded, and ask whether to continue to UX discovery.</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
