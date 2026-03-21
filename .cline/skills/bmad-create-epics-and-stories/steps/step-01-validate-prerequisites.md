# step 01 validate prerequisites

## META

- Goal: Validate required input documents and extract the requirements needed for epic and story creation.
- Execute this step in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for checklist items and routing; use `<detail>` for supporting guidance.

## EXECUTION

<step n="1" goal="Confirm the required source documents">
  <action>Check for PRD content, Architecture content, and UX content if the product includes UI.</action>
  <detail>
    Required sources are:
    - `PRD.md` for requirements and product scope
    - `Architecture.md` for technical decisions, API contracts, and data models
    - `UX Design.md` if UI exists, for interaction patterns, mockups, and user flows
  </detail>
</step>

<step n="2" goal="Discover and validate the available planning artifacts">
  <action>Search `{planning_artifacts}/*prd*.md` first, then `{planning_artifacts}/*prd*/index.md` if needed.</action>
  <action>Search `{planning_artifacts}/*architecture*.md` first, then `{planning_artifacts}/*architecture*/index.md` if needed.</action>
  <action>Search `{planning_artifacts}/*ux*.md` first, then `{planning_artifacts}/*ux*/index.md` if needed.</action>
  <ask>Before proceeding, ask whether there are any other documents to include for analysis, and whether anything found should be excluded.</ask>
  <detail>
    If a whole document exists, prefer it over the sharded version. Only treat UX as required when UI work is present.
  </detail>
</step>

<step n="3" goal="Extract functional requirements">
  <action>Identify all FRs from the PRD content.</action>
  <detail>
    Look for numbered items like `FR1:`, `Functional Requirement 1:`, or similar requirement statements that describe what the system must do.
    Include user actions, system behaviors, and business rules.
  </detail>
</step>

<step n="4" goal="Extract non-functional requirements">
  <action>Identify all NFRs from the PRD content.</action>
  <detail>
    Look for performance, security, usability, reliability, technical standards, and compliance requirements.
  </detail>
</step>

<step n="5" goal="Extract additional technical requirements">
  <action>Review the Architecture content for implementation constraints that affect epic and story creation.</action>
  <detail>
    Capture infrastructure and deployment requirements, integrations, data migration or setup requirements, monitoring and logging requirements, API versioning or compatibility requirements, and security implementation requirements.
    If Architecture specifies a starter or greenfield template, note it prominently because it affects Epic 1 Story 1.
  </detail>
  <ask>Confirm the Architecture review for technical requirements that affect epic and story creation.</ask>
</step>

<step n="6" goal="Extract UX design requirements when UX content exists">
  <branch if="UX content exists">
    <action>Read the full UX content and extract actionable implementation requirements.</action>
    <detail>
      Treat UX requirements as first-class inputs. Capture design token work, reusable component proposals, visual standardization, accessibility requirements, responsive design requirements, interaction patterns, and browser or device compatibility requirements.
      If the UX spec identifies a specific count of reusable components, list them explicitly rather than summarizing them.
    </detail>
  </branch>
  <branch if="UX content does not exist">
    <output>No UX source was found, so continue with PRD and Architecture inputs only.</output>
  </branch>
</step>

<step n="7" goal="Initialize the epics document from the template">
  <action>Copy `../templates/epics-template.md` to `{planning_artifacts}/epics.md`.</action>
  <action>Replace the template placeholders with the project name and extracted requirement sections.</action>
  <detail>
    Include the input document list in frontmatter under `inputDocuments`, and leave placeholder sections ready for the reviewed content.
  </detail>
</step>

<step n="8" goal="Present the extracted requirements for review">
  <output>Present the FR count and a few examples, then ask whether any FRs are missing or incorrectly captured.</output>
  <output>Present the NFR count and the key NFRs, then ask whether any constraints were missed.</output>
  <output>Summarize the Architecture-derived technical requirements and verify completeness.</output>
  <output>Summarize UX design requirements when present and verify they are specific enough for story creation.</output>
</step>

<step n="9" goal="Get user confirmation">
  <ask>Do these extracted requirements accurately represent what needs to be built, and are there any additions or corrections?</ask>
  <detail>
    Update the requirement sections in `{planning_artifacts}/epics.md` until the user confirms the extraction is correct.
  </detail>
</step>

<step n="10" goal="Present the continuation menu">
  <output>Confirm the requirements are complete and correct, then offer `[C]` continue.</output>
  <ask>Would you like to continue after confirming the requirements?</ask>
  <handoff path="./step-02-design-epics.md" />
  <detail>
    If the user selects `C`, save the reviewed requirements to `{planning_artifacts}/epics.md`, update workflow state, and hand off to `./step-02-design-epics.md`.
    If the user asks questions or adds comments, answer them and redisplay the same menu.
  </detail>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
