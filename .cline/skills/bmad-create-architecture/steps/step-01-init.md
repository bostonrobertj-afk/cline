# step 01 init

## META

- Goal: detect continuation state, discover the core input documents, and initialize the architecture document.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Focus on setup only. Do not start making architecture decisions yet.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Detect whether architecture work already exists">
  <action>Look for an existing architecture document under `{planning_artifacts}`.</action>
  <branch if="an existing architecture document is found" optional="true">
    <action>Read the existing architecture document, including frontmatter, to determine whether this is a continuation.</action>
    <handoff path="./step-01b-continue.md" />
  </branch>
  <branch if="no existing architecture document is found" optional="true">
    <output>No existing architecture workflow state was found. Start fresh initialization.</output>
  </branch>
</step>

<step n="2" goal="Discover the input documents for architecture work">
  <action>
    Search the likely artifact locations for architecture inputs.
    <detail>
      Check:
      - `{planning_artifacts}/**`
      - `{output_folder}/**`
      - `{project_knowledge}/**`
      - `{project-root}/docs/**`
    </detail>
  </action>
  <action>
    Discover both whole-file and sharded-document variants when they exist.
    <detail>
      Look for:
      - Product Brief
      - PRD
      - UX design
      - research documents
      - project documentation
      - `project-context.md`
    </detail>
  </action>
  <output>Summarize what was found and what appears to be missing.</output>
  <ask>Ask the user to confirm the discovered inputs and provide any additional documents that should be included.</ask>
</step>

<step n="3" goal="Validate required inputs and initialize the architecture document">
  <branch if="no PRD is available after discovery and user confirmation" optional="true">
    <ask>HALT and ask the user to provide the PRD or run the PRD workflow first.</ask>
  </branch>
  <branch if="the required inputs are available" optional="true">
    <action>Load the confirmed inputs completely, including all relevant files in any confirmed sharded document.</action>
    <action>Copy `../architecture-decision-template.md` to `{planning_artifacts}/architecture.md`.</action>
    <action>Initialize the document frontmatter with workflow state and the confirmed `inputDocuments` list.</action>
  </branch>
</step>

<step n="4" goal="Present setup summary and continue gate">
  <output>
    Present the initialization summary.
    <detail>
      Include:
      - created architecture document path
      - confirmed input documents
      - whether PRD, UX, research, project docs, and project context were found
    </detail>
  </output>
  <ask>Ask whether the user wants to continue to project-context analysis or adjust the input set first.</ask>
  <branch if="the user wants to add or adjust inputs" optional="true">
    <action>Update the discovered input set and refresh the initialization summary before continuing.</action>
  </branch>
  <branch if="the user confirms setup is complete" optional="true">
    <action>Update workflow state so Step 1 is complete.</action>
    <handoff path="./step-02-context.md" />
  </branch>
</step>

## CHECKPOINT

Do not move on to project-context analysis until the user has confirmed the discovered inputs and the architecture document is initialized.

## ADVISORY

- Track discovered inputs explicitly in frontmatter.
- Keep setup collaborative and transparent.
