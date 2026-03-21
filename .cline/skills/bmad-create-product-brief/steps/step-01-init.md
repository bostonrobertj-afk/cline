---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'
---

# step 01 init

## META

- Goal: initialize the product brief workflow by detecting continuation state and preparing the document structure for collaborative discovery.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Detect existing workflow state">
  <action>
    Check whether `{outputFile}` already exists and, if so, load the full file including frontmatter.
  </action>
  <branch if="the output file exists and has continuation state">
    <output>This is a continuation case, so hand off to `./step-01b-continue.md`.</output>
    <handoff path="./step-01b-continue.md" />
  </branch>
</step>

<step n="2" goal="Discover supporting documents for a fresh brief">
  <action>
    Search the project sources for context that should inform the brief.
    <detail>
      Look in:
      - `{planning_artifacts}/**`
      - `{output_folder}/**`
      - `{product_knowledge}/**`
      - `{project-root}/docs/**`

      Prioritize:
      - brainstorming reports
      - research documents
      - project documentation
      - `**/project-context.md`

      When a topic appears to be sharded, inspect the folder index first and then load the complete shard set that the user confirms.
    </detail>
  </action>
  <ask>Share the discovered files with the user and ask whether any other documents should be included before loading them.</ask>
</step>

<step n="3" goal="Initialize the briefing artifact after confirmation">
  <action>
    Load the confirmed source documents completely and record them in frontmatter.
    <detail>
      Track successful loads in `inputDocuments`.
      Use only the documents the user confirmed or provided.
    </detail>
  </action>
  <action>Copy `../product-brief.template.md` to `{outputFile}` and initialize workflow frontmatter.</action>
  <output>Report the created file, the documents loaded, and that the brief is ready for vision discovery.</output>
</step>

<step n="4" goal="Hand off to product vision discovery">
  <output>Proceed to `./step-02-vision.md` once setup is complete.</output>
  <handoff path="./step-02-vision.md" />
</step>

## CHECKPOINT

Pause for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: `./step-02-vision.md`
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
