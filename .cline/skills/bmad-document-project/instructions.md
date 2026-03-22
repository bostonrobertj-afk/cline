# Document Project Instructions

## META

- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Check for resumable state and decide how to continue.">
  <action>Check for an existing state file at `{project_knowledge}/project-scan-report.json`.</action>
  <action>Read the file if it exists and extract timestamps, mode, scan level, current step, completed steps, and project classification.</action>
  <action>Calculate the state age from the last updated timestamp.</action>
  <ask>
    I found an in-progress workflow state from {{last_updated}}.

    Current progress:

    - Mode: {{mode}}
    - Scan Level: {{scan_level}}
    - Completed Steps: {{completed_steps_count}}/{{total_steps}}
    - Last Step: {{current_step}}
    - Project Type(s): {{cached_project_types}}

    Would you like to resume, start fresh, or cancel?
  </ask>
  <branch if="the user selects resume and workflow_mode == deep_dive" optional="true">
    <action>Set `resume_mode = true` and restore the cached workflow mode and project type data.</action>
    <detail>When resuming, load only the matching documentation requirements rows for the cached project types.</detail>
    <handoff path="./workflows/deep-dive-workflow.md" />
  </branch>
  <branch if="the user selects resume and workflow_mode == initial_scan OR workflow_mode == full_rescan" optional="true">
    <action>Set `resume_mode = true` and restore the cached workflow mode and project type data.</action>
    <detail>When resuming, load only the matching documentation requirements rows for the cached project types.</detail>
    <handoff path="./workflows/full-scan-workflow.md" />
  </branch>
  <branch if="the user selects start fresh" optional="true">
    <action>Create `{project_knowledge}/.archive/` if needed and move the old state file there with a timestamped name.</action>
    <action>Set `resume_mode = false`.</action>
  </branch>
  <branch if="the user selects cancel" optional="true">
    <output>Exit the workflow without changes.</output>
    <exit />
  </branch>
  <branch if="the state file is older than 24 hours" optional="true">
    <output>Archive the stale state file and start a fresh scan.</output>
    <action>Set `resume_mode = false`.</action>
  </branch>
</step>

<step n="2" goal="Choose the documentation mode when no resume path is used.">
  <action>Check if `{project_knowledge}/index.md` exists.</action>
  <branch if="index.md exists" optional="true">
    <action>Read `index.md` and extract the generated date, project structure, and parts count.</action>
    <ask>
      I found existing documentation generated on {{existing_doc_date}}.

      Do you want to re-scan the entire project, deep-dive into a specific area, or keep the existing documentation as-is?
    </ask>
  </branch>
  <branch if="index.md does not exist" optional="true">
    <action>Set `workflow_mode = "initial_scan"`.</action>
    <output>No existing documentation was found. Starting an initial project scan.</output>
    <handoff path="./workflows/full-scan-workflow.md" />
  </branch>
  <branch if="the user selects re-scan" optional="true">
    <action>Set `workflow_mode = "full_rescan"`.</action>
    <handoff path="./workflows/full-scan-workflow.md" />
  </branch>
  <branch if="the user selects deep-dive" optional="true">
    <action>Set `workflow_mode = "deep_dive"` and `scan_level = "exhaustive"`.</action>
    <handoff path="./workflows/deep-dive-workflow.md" />
  </branch>
  <branch if="the user selects keep existing documentation" optional="true">
    <output>Keep the existing documentation and exit the workflow.</output>
    <exit />
  </branch>
</step>
