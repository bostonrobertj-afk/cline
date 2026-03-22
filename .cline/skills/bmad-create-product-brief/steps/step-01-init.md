---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'
---

# step 01 init

## META

- Goal: Initialize the product brief workflow by detecting continuation state and setting up the document structure for collaborative product discovery.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Check whether the workflow should resume or start fresh">
  <action>Look for `{outputFile}`.</action>
  <branch if="the output file already exists" optional="true">
    <action>Read the existing document, including frontmatter, to determine the saved workflow state.</action>
    <handoff path="./step-01b-continue.md">Resume using the continuation step instead of reinitializing the document.</handoff>
  </branch>
  <branch if="the output file does not exist" optional="true">
    <output>State that this is a fresh product-brief run and initialization will continue.</output>
  </branch>
</step>

<step n="2" goal="Discover and confirm the supporting input documents for a fresh run">
  <action>Search for relevant planning, output, project-knowledge, and docs artifacts under `{planning_artifacts}`, `{output_folder}`, `{project_knowledge}`, and `{project-root}/docs`.</action>
  <detail>When a whole markdown file is not present, also look for a sharded folder with an `index.md` file and use the full shard set when the user confirms it should be included.</detail>
  <ask>Ask the user to confirm which discovered files should be loaded and whether any additional files should be included before initialization proceeds.</ask>
  <output>Present a discovery summary covering brainstorming, research, project documentation, and project context files.</output>
</step>

<step n="3" goal="Create the initial product brief document and record the confirmed context">
  <action>Copy `../product-brief.template.md` to `{outputFile}`.</action>
  <action>Initialize the frontmatter and record the confirmed input documents.</action>
  <output>Report that the product brief workspace is initialized and list the confirmed files now associated with the run.</output>
</step>

<step n="4" goal="Proceed directly into product vision discovery after setup">
  <detail>This initialization path auto-proceeds once the document is created and the context inventory has been confirmed.</detail>
  <handoff path="./step-02-vision.md">Move into collaborative product vision discovery.</handoff>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./step-02-vision.md
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
