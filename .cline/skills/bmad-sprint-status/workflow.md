
# Workflow

## META
- managed_workflow_extraction: enabled
- phase_type: workflow
- source_format: procedural

## EXECUTION
<step n="1" goal="Review Detailed Guidance">
  <action>Read the advisory, reference, and prose sections in this file completely before taking action.</action>
</step>

<step n="2" goal="Follow Workflow">
  <action>Execute this file in order, preserving every approval gate, routing rule, document update instruction, and constraint described below.</action>
</step>

## CHECKPOINT
Workflow progress can advance only after the required outputs, approvals, and routing conditions in this file are satisfied.

## ADVISORY
- Treat the <prose> section as the authoritative detailed instructions for this file.
- Preserve all existing user-input pauses, continuation checks, and referenced companion files.
- Keep any document templates, frontmatter updates, and save instructions exactly as authored.

## REFERENCE
- Original authored procedure retained below for managed workflow extraction compatibility.

<prose>
## META

- Goal: summarize sprint status, surface risks, and recommend the next workflow action.
- Role: Scrum Master providing clear and actionable sprint visibility.
- Speak in `{communication_language}`.
- Input file: `{implementation_artifacts}/sprint-status.yaml`
- Optional context file: `project-context.md`

## EXECUTION

<mode name="interactive" default="true">
<workflow>

<step n="0" goal="Determine execution mode">
  <action>Set `mode = {{mode}}` if the caller provided it. Otherwise set `mode = interactive`.</action>
</step>

<step n="1" goal="Locate sprint status file">
  <action>Load `project-context.md` if it exists and is relevant.</action>
  <action>Try to read `{sprint_status_file}`.</action>
  <check if="file not found">
    <output>Report that `sprint-status.yaml` was not found and direct the user to run sprint-planning before retrying.</output>
    <action>Exit the workflow.</action>
  </check>
</step>

<step n="2" goal="Read and parse sprint status">
  <action>Read the full sprint status file.</action>
  <action>Parse metadata fields, development status entries, epic/story/retrospective groupings, and legacy status aliases.</action>
  <action>Validate status values against the allowed story, epic, and retrospective status sets.</action>
  <check if="unrecognized statuses exist">
    <output>Show the invalid entries and the valid status values.</output>
    <ask>Ask the user how the invalid statuses should be corrected or whether they want to skip correction.</ask>
    <action>If corrections are provided, update the file and re-parse it.</action>
  </check>
  <action>Detect risks such as stale status data, orphaned stories, in-progress epics without stories, and workflow recommendation conflicts.</action>
</step>

<step n="3" goal="Select next action recommendation">
  <action>Choose the recommended next workflow using status priority: in-progress story, review story, ready-for-dev story, backlog story, optional retrospective, or completion.</action>
  <action>Store `next_story_id`, `next_workflow_id`, and `next_agent` for use in the response.</action>
</step>

<step n="4" goal="Display sprint summary">
  <output>Display the sprint status summary, counts by story and epic status, the recommended next workflow, and any detected risks.</output>
</step>

<step n="5" goal="Offer interactive actions">
  <ask>Ask the user whether to run the recommended workflow, show stories grouped by status, show the raw sprint-status file, or exit.</ask>
  <action>If the user chooses the recommendation path, tell them which workflow to run and include `story_key` when applicable.</action>
  <action>If the user chooses grouped stories, display the grouped story status summary.</action>
  <action>If the user chooses raw file output, display the full sprint-status file.</action>
  <action>If the user chooses exit, end the workflow cleanly.</action>
</step>

</workflow>
</mode>

<mode name="data">
<workflow>

<step n="20" goal="Data mode output">
  <action>Load and parse `{sprint_status_file}` using the same parsing logic as the interactive path.</action>
  <action>Compute the same recommendation fields as the interactive path.</action>
  <template-output>next_workflow_id = {{next_workflow_id}}</template-output>
  <template-output>next_story_id = {{next_story_id}}</template-output>
  <template-output>count_backlog = {{count_backlog}}</template-output>
  <template-output>count_ready = {{count_ready}}</template-output>
  <template-output>count_in_progress = {{count_in_progress}}</template-output>
  <template-output>count_review = {{count_review}}</template-output>
  <template-output>count_done = {{count_done}}</template-output>
  <template-output>epic_backlog = {{epic_backlog}}</template-output>
  <template-output>epic_in_progress = {{epic_in_progress}}</template-output>
  <template-output>epic_done = {{epic_done}}</template-output>
  <template-output>risks = {{risks}}</template-output>
  <action>Return to the caller.</action>
</step>

</workflow>
</mode>

<mode name="validate">
<workflow>

<step n="30" goal="Validate sprint-status file">
  <action>Check that `{sprint_status_file}` exists.</action>
  <check if="missing">
    <template-output>is_valid = false</template-output>
    <template-output>error = "sprint-status.yaml missing"</template-output>
    <template-output>suggestion = "Run sprint-planning to create it"</template-output>
    <action>Return.</action>
  </check>
  <action>Read and parse `{sprint_status_file}`.</action>
  <action>Validate required metadata fields and confirm the development status section exists with at least one entry.</action>
  <check if="required metadata is missing">
    <template-output>is_valid = false</template-output>
    <template-output>error = "Missing required field(s): {{missing_fields}}"</template-output>
    <template-output>suggestion = "Re-run sprint-planning or add the missing fields manually"</template-output>
    <action>Return.</action>
  </check>
  <check if="development_status is missing or empty">
    <template-output>is_valid = false</template-output>
    <template-output>error = "development_status missing or empty"</template-output>
    <template-output>suggestion = "Re-run sprint-planning or repair the file manually"</template-output>
    <action>Return.</action>
  </check>
  <action>Validate every status value against the known valid status sets.</action>
  <check if="invalid statuses exist">
    <template-output>is_valid = false</template-output>
    <template-output>error = "Invalid status values: {{invalid_entries}}"</template-output>
    <template-output>suggestion = "Fix invalid statuses in sprint-status.yaml"</template-output>
    <action>Return.</action>
  </check>
  <template-output>is_valid = true</template-output>
  <template-output>message = "sprint-status.yaml valid: metadata complete, all statuses recognized"</template-output>
</step>

</workflow>
</mode>

## ADVISORY

- The interactive mode is the default managed workflow path.
- Data and validate modes are alternate entry paths for callers that need structured outputs or validation-only behavior.

## REFERENCE

- Story status values: backlog, ready-for-dev, in-progress, review, done.
- Epic status values: backlog, in-progress, done.
- Retrospective status values: optional, done.
</prose>
