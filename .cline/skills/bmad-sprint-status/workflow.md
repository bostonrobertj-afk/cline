---
name: 'bmad-sprint-status'
description: 'Summarize sprint status and surface risks. Use when the user says "check sprint status" or "show sprint status"'
config_source: '{project-root}/_bmad/bmm/config.yaml'
project_name: '{config_source}:project_name'
user_name: '{config_source}:user_name'
communication_language: '{config_source}:communication_language'
document_output_language: '{config_source}:document_output_language'
implementation_artifacts: '{config_source}:implementation_artifacts'
project_context: '**/project-context.md'
sprint_status_file: '{implementation_artifacts}/sprint-status.yaml'
date: system-generated current datetime
---

# Sprint Status Workflow

## META

- Goal: summarize sprint status, surface risks, and recommend the next workflow action.
- Speak in `{communication_language}`.
- Execute the steps in order.
- Halt whenever the sprint status file is missing, validation is required, or the user must choose an action.
- Use `project_context` when it exists and is relevant.

## EXECUTION

<step n="0" goal="Determine execution mode and route to the matching path">
  <action>Set `mode = {{mode}}` when the caller provides it; otherwise use `interactive`.</action>
  <branch if="mode == data">
    <action>Proceed to step 20.</action>
  </branch>
  <branch if="mode == validate">
    <action>Proceed to step 30.</action>
  </branch>
  <branch if="mode == interactive">
    <action>Proceed to step 1.</action>
  </branch>
</step>

<step n="1" goal="Load context and locate the sprint status file">
  <action>Load `project_context` if it exists and adds useful project-wide guidance.</action>
  <action>Read `sprint_status_file`.</action>
  <branch if="the file does not exist">
    <output>`sprint-status.yaml` was not found.</output>
    <output>Run `sprint-planning` to create it, then try sprint status again.</output>
    <action>Stop the workflow.</action>
  </branch>
</step>

<step n="2" goal="Read, classify, and validate sprint status">
  <action>Read the full sprint status file from top to bottom.</action>
  <action>Parse `generated`, `last_updated`, `project`, `project_key`, `tracking_system`, `story_location`, and `development_status`.</action>
  <action>Classify `development_status` entries as stories, epics, or retrospectives.</action>
  <detail>
    - Epics start with `epic-` and do not end with `-retrospective`
    - Retrospectives end with `-retrospective`
    - Stories are every other key
  </detail>
  <action>Normalize legacy statuses when encountered in an existing file.</action>
  <detail>
    - `drafted` should be treated as `ready-for-dev`
    - `contexted` should be treated as `in-progress`
  </detail>
  <action>Count story, epic, and retrospective statuses.</action>
  <action>Validate every status against the supported value sets.</action>
  <branch if="unrecognized statuses exist">
    <output>Unknown status values were found in `sprint-status.yaml`.</output>
    <output>Show the invalid entries and the valid status values.</output>
    <ask>How should these be corrected? You can provide replacements or choose to skip correction.</ask>
    <branch if="the user provides corrections">
      <action>Update `sprint-status.yaml` with the corrected values.</action>
      <action>Re-read and re-parse the file.</action>
    </branch>
  </branch>
  <action>Detect risks such as stale status data, orphaned stories, in-progress epics without stories, and workflow recommendation conflicts.</action>
</step>

<step n="3" goal="Select the next workflow recommendation">
  <action>Choose the next recommended workflow using this priority.</action>
  <detail>
    - first in-progress story
    - first review story
    - first ready-for-dev story
    - first backlog story
    - optional retrospective
    - completion when nothing remains
  </detail>
  <action>When choosing the first story in a status group, preserve file order and sort by epic number, then story number.</action>
  <action>Store `next_story_id`, `next_workflow_id`, and `next_agent` for the response.</action>
</step>

<step n="4" goal="Display the sprint summary">
  <output>Show the sprint summary, story and epic counts, the recommendation, and any detected risks.</output>
</step>

<step n="5" goal="Offer interactive actions">
  <ask>Ask whether to run the recommended workflow, show stories grouped by status, show the raw sprint status file, or exit.</ask>
  <branch if="the user chooses the recommendation path">
    <output>Run the recommended workflow and include `story_key={{next_story_id}}` when the target is a story.</output>
  </branch>
  <branch if="the user chooses grouped stories">
    <output>Show the grouped story status summary.</output>
  </branch>
  <branch if="the user chooses raw file output">
    <output>Display the full sprint status file.</output>
  </branch>
  <branch if="the user chooses exit">
    <action>Stop the workflow cleanly.</action>
  </branch>
</step>

<step n="20" goal="Produce structured data-mode output">
  <action>Load and parse `sprint_status_file` using the same logic as the interactive path.</action>
  <action>Compute the same recommendation fields as the interactive path.</action>
  <template-output>next_workflow_id = {{next_workflow_id}}</template-output>
  <template-output>next_story_id = {{next_story_id}}</template-output>
  <template-output>next_agent = {{next_agent}}</template-output>
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

<step n="30" goal="Validate the sprint status file">
  <action>Check that `sprint_status_file` exists.</action>
  <branch if="the file is missing">
    <template-output>is_valid = false</template-output>
    <template-output>error = "sprint-status.yaml missing"</template-output>
    <template-output>suggestion = "Run sprint-planning to create it"</template-output>
    <action>Return.</action>
  </branch>
  <action>Read and parse `sprint_status_file`.</action>
  <action>Validate required metadata fields and confirm that `development_status` exists with at least one entry.</action>
  <branch if="required metadata is missing">
    <template-output>is_valid = false</template-output>
    <template-output>error = "Missing required field(s): {{missing_fields}}"</template-output>
    <template-output>suggestion = "Re-run sprint-planning or add the missing fields manually"</template-output>
    <action>Return.</action>
  </branch>
  <branch if="development_status is missing or empty">
    <template-output>is_valid = false</template-output>
    <template-output>error = "development_status missing or empty"</template-output>
    <template-output>suggestion = "Re-run sprint-planning or repair the file manually"</template-output>
    <action>Return.</action>
  </branch>
  <action>Validate every status value against the known valid status sets.</action>
  <branch if="invalid statuses exist">
    <template-output>is_valid = false</template-output>
    <template-output>error = "Invalid status values: {{invalid_entries}}"</template-output>
    <template-output>suggestion = "Fix invalid statuses in sprint-status.yaml"</template-output>
    <action>Return.</action>
  </branch>
  <template-output>is_valid = true</template-output>
  <template-output>message = "sprint-status.yaml valid: metadata complete, all statuses recognized"</template-output>
</step>

## CHECKPOINT

Stop before advancing whenever the sprint status file is missing, a status value must be corrected, or the user must choose an action.

## ADVISORY

- Interactive mode is the default managed workflow path.
- Data and validate modes are alternate entry paths for structured callers.
- Legacy status values may be normalized when encountered in an existing file.
