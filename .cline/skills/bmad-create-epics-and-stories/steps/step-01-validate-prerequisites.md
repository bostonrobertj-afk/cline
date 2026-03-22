# step 01 validate prerequisites

## META

- Goal: Validate that all required input documents exist and extract the requirements inventory needed for epic and story creation.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Discover the input documents and confirm the analysis set">
  <action>Search for the PRD using whole-document and sharded index patterns under {planning_artifacts}.</action>
  <action>Search for the Architecture document using whole-document and sharded index patterns under {planning_artifacts}.</action>
  <branch if="a UX document exists" optional="true">
    <action>Search for the UX Design document using whole-document and sharded index patterns under {planning_artifacts}.</action>
    <detail>Treat the UX document as a first-class source when it exists; do not treat it as optional flavor text.</detail>
  </branch>
  <ask>Ask the user whether any discovered planning documents should be excluded and whether any additional documents should be included in the analysis set.</ask>
  <output>Present the discovered document set, clearly identifying which files will be used as the confirmed analysis inputs.</output>
</step>

<step n="2" goal="Initialize the epics document from the template once the input set is confirmed">
  <action>Load `../templates/epics-template.md`.</action>
  <action>Create or refresh `{planning_artifacts}/epics.md` from the template.</action>
  <output>Write the confirmed input document list into the `inputDocuments` frontmatter array in `{planning_artifacts}/epics.md`.</output>
</step>

<step n="3" goal="Extract the requirements inventory from the confirmed sources">
  <action>Read the full PRD content from the chosen source and extract every functional requirement.</action>
  <action>Extract every non-functional requirement from the chosen PRD source.</action>
  <detail>Functional requirements should describe what the system must do. Non-functional requirements should capture quality attributes, constraints, standards, and compliance needs.</detail>
  <action>Review the Architecture document for technical requirements that affect epic and story design.</action>
  <branch if="the Architecture document specifies a starter or greenfield template" optional="true">
    <action>Record the starter-template requirement prominently so Epic 1 Story 1 can reflect it.</action>
    <detail>This should influence the first implementation story rather than being buried in a generic technical-notes section.</detail>
  </branch>
  <branch if="a UX document exists" optional="true">
    <action>Extract actionable UX design requirements as a separate UX-specific requirements section.</action>
    <detail>Call out design tokens, reusable components, accessibility work, responsive behaviors, interaction patterns, and browser or device requirements as discrete implementation requirements.</detail>
    <output>List every UX requirement concretely. If the UX spec identifies six components, list all six instead of summarizing them as generic component work.</output>
  </branch>
</step>

<step n="4" goal="Write the extracted inventory into the epics document">
  <action>Populate the Functional Requirements section with the complete FR list.</action>
  <action>Populate the Non-Functional Requirements section with the complete NFR list.</action>
  <action>Populate the additional technical-requirements section with Architecture-derived requirements.</action>
  <branch if="UX requirements were extracted" optional="true">
    <action>Populate the dedicated UX requirements section with the extracted UX design requirements.</action>
  </branch>
</step>

<step n="5" goal="Review the extracted requirements with the user and capture corrections">
  <output>Show the count of extracted functional requirements and a representative sample.</output>
  <output>Show the count of extracted non-functional requirements and the key constraints they express.</output>
  <output>Summarize the Architecture-derived requirements that affect epic and story creation.</output>
  <branch if="UX requirements were extracted" optional="true">
    <output>Show the count of extracted UX requirements and highlight the most consequential UX implementation items.</output>
  </branch>
  <ask>Ask whether any requirements are missing, misclassified, or incorrectly worded.</ask>
  <branch if="the user requests corrections" optional="true">
    <action>Update the extracted inventory in `{planning_artifacts}/epics.md` and re-present the revised inventory for confirmation.</action>
  </branch>
  <branch if="the user confirms the inventory is accurate" optional="true">
    <output>State that the requirements inventory is approved and ready for epic design.</output>
  </branch>
</step>

<step n="6" goal="Present the continuation menu for moving into epic design">
  <ask>Ask the user to choose whether to continue to epic design, use Advanced Elicitation, or use Party Mode.</ask>
  <detail>Keep the menu visible after answering side questions. Only move forward when the user explicitly chooses the continuation path.</detail>
  <branch if="the user chooses Advanced Elicitation" optional="true">
    <action>
      Dispatch a dedicated subagent for Advanced Elicitation.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-advanced-elicitation"`.
        Prompt the subagent with the current requirements inventory context and the instruction to surface missing assumptions, gaps, or ambiguities before epic design.
        Tell the subagent to return concise proposed improvements and any replacement text the user should review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Party Mode" optional="true">
    <action>
      Dispatch a dedicated subagent for Party Mode.
      <detail>
        Instruct the subagent to call `use_skill` with `skill_name = "bmad-party-mode"`.
        Prompt the subagent with the current requirements inventory context and the instruction to critique it from multiple stakeholder perspectives before epic design.
        Tell the subagent to return concise proposed improvements and decision guidance for the user to review before acceptance.
      </detail>
    </action>
  </branch>
  <branch if="the user chooses Continue" optional="true">
    <action>Persist the approved requirements inventory and workflow state in `{planning_artifacts}/epics.md`.</action>
    <handoff path="./step-02-design-epics.md">Proceed to collaborative epic design.</handoff>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
