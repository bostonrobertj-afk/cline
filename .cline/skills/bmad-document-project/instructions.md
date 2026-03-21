# Document Project Router

## META
- Workflow ID: `bmad-document-project`
- Purpose: route the document-project family to the correct managed workflow branch
- Runtime state: `project-scan-report.json`

## EXECUTION

<step n="1" goal="Resolve runtime context and resume state">
  <action>Load and resolve `project_knowledge`, `user_name`, `user_skill_level`, `communication_language`, `document_output_language`, and `date` from `{project-root}/_bmad/bmm/config.yaml`.</action>
  <action>Check for `{project_knowledge}/project-scan-report.json`.</action>
  <detail>Use the resolved values before asking the user for any routing choice. Format-looking tokens such as `<step>`, `<action>`, `<check>`, `<ask>`, `<output>`, and `<detail>` are workflow markup, not user-facing text.</detail>
</step>

<step n="2" goal="Route to the appropriate managed workflow">
  <branch if="project-scan-report.json exists">
    <action>Read the state file and extract `timestamps`, `mode`, `scan_level`, `current_step`, `completed_steps`, `project_classification`, and cached `project_type_id(s)`.</action>
    <action>Calculate the state age from `last_updated`.</action>

    <ask>I found an in-progress workflow state from {{last_updated}}.

Current progress:
- Mode: {{mode}}
- Scan level: {{scan_level}}
- Completed steps: {{completed_steps_count}}/{{total_steps}}
- Last step: {{current_step}}
- Project type(s): {{cached_project_types}}

Choose one:
1. Resume from the saved state
2. Start fresh and archive the old state
3. Cancel without changes

Your choice [1/2/3]:
</ask>

    <branch if="user selects 1">
      <action>Set `resume_mode = true`.</action>
      <action>Set `workflow_mode = {{mode}}`.</action>
      <action>Load findings summaries from the state file.</action>
      <action>Load cached project type IDs from the state file.</action>
      <action>For each cached project type ID, load only the matching row from `./documentation-requirements.csv`.</action>
      <action>Skip any broader CSV loading that is not needed for resume.</action>
      <action>Display: "Resuming {{workflow_mode}} from {{current_step}} with cached project type(s): {{cached_project_types}}"</action>

      <branch if="workflow_mode == deep_dive">
        <action>Load `./workflows/deep-dive-workflow.md` with the resume context.</action>
      </check>

      <branch if="workflow_mode == initial_scan OR workflow_mode == full_rescan">
        <action>Load `./workflows/full-scan-workflow.md` with the resume context.</action>
      </check>
    </check>

    <branch if="user selects 2">
      <action>Create `{project_knowledge}/.archive/` if needed.</action>
      <action>Move the old state file to `{project_knowledge}/.archive/project-scan-report-{{timestamp}}.json`.</action>
      <action>Set `resume_mode = false`.</action>
      <action>Continue to the next routing branch.</action>
    </check>

    <branch if="user selects 3">
      <action>Display: "Exiting workflow without changes."</action>
      <action>Exit workflow.</action>
    </check>

    <branch if="state file age >= 24 hours">
      <action>Display: "Found old state file (&gt;24 hours). Starting fresh scan."</action>
      <action>Archive the old state file to `{project_knowledge}/.archive/project-scan-report-{{timestamp}}.json`.</action>
      <action>Set `resume_mode = false`.</action>
      <action>Continue to the next routing branch.</action>
    </check>
  </branch>

  <branch if="project-scan-report.json does not exist">
    <action>Set `resume_mode = false`.</action>
  </branch>

  <branch if="resume_mode == false">
    <action>Check whether `{project_knowledge}/index.md` exists.</action>

    <branch if="index.md exists">
      <action>Read `index.md` and extract `existing_doc_date` and `existing_structure`.</action>

      <ask>I found existing documentation generated on {{existing_doc_date}}.

What would you like to do?
1. Re-scan the entire project
2. Deep-dive into a specific area
3. Cancel and keep the existing documentation

Your choice [1/2/3]:
</ask>

      <branch if="user selects 1">
        <action>Set `workflow_mode = "full_rescan"`.</action>
        <action>Display: "Starting full project rescan..."</action>
        <action>Load `./workflows/full-scan-workflow.md`.</action>
      </check>

      <branch if="user selects 2">
        <action>Set `workflow_mode = "deep_dive"`.</action>
        <action>Set `scan_level = "exhaustive"`.</action>
        <action>Display: "Starting deep-dive documentation mode..."</action>
        <action>Load `./workflows/deep-dive-workflow.md`.</action>
      </check>

      <branch if="user selects 3">
        <action>Display message: "Keeping existing documentation. Exiting workflow."</action>
        <action>Exit workflow.</action>
      </check>
    </check>

    <branch if="index.md does not exist">
      <action>Set `workflow_mode = "initial_scan"`.</action>
      <action>Display: "No existing documentation found. Starting initial project scan..."</action>
      <action>Load `./workflows/full-scan-workflow.md`.</action>
    </check>
  </branch>

  <detail>
    - Only the current phase should be visible in the prompt at any time.
    - The next step's detail should appear only after the current step is completed.
    - Optional steps that are skipped should be marked complete so the backend can reveal the next step.
  </detail>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Keep routing logic backend-friendly and avoid repeating the full workflow content here.
- Preserve the managed workflow state file contract and archive behavior.
