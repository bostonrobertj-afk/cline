---
main_config: '{project-root}/_bmad/bmm/config.yaml'
workflow_path: '{project-root}/cline-skills/bmad-dev-story'
checklist_file: '{workflow_path}/checklist.md'
---
# workflow

## META

- Goal: implement the next ready story from the provided story spec file and move it to review only when the work is actually complete.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Speak in `{communication_language}` and tailor tone and depth to `{user_skill_level}`.
- Only the current phase should be surfaced in prompt injection; later phase details appear after the current phase is completed.

## EXECUTION

<step n="1" goal="Load workflow context and identify the active story">
  <action>Load and resolve `{main_config}`.</action>
  <detail>
    Resolve `project_name`, `user_name`, `communication_language`, `document_output_language`, `user_skill_level`, `planning_artifacts`, `implementation_artifacts`, and `date`.
    Use repo context to safely fill any missing values only when they can be resolved without guesswork.
  </detail>
  <action>Load `{project_context}` if it exists for coding standards and project-wide patterns.</action>
  <action>Find the active story from `{story_path}` if provided, or discover the next `ready-for-dev` story from `{implementation_artifacts}`.</action>
  <action>Read the complete story file and identify the first incomplete task or subtask.</action>
  <detail>
    The advisory guidance for this phase is attached below and should be surfaced with the active step.
    Details for later phases are hidden until this phase is complete.
  </detail>
</step>

<step n="2" goal="Load story context and confirm implementation scope">
  <action>Parse the story sections for Story, Acceptance Criteria, Tasks/Subtasks, Dev Notes, Dev Agent Record, File List, Change Log, and Status.</action>
  <action>Extract the implementation guidance from Dev Notes, including architecture requirements, technical specifications, and prior learnings.</action>
  <action>Identify any optional tasks or subtasks and decide whether they will be executed or intentionally skipped.</action>
  <detail>
    If an optional task is intentionally skipped, mark it complete with a brief note so workflow progression can continue and the next phase details can be revealed.
  </detail>
  <output>Proceed with only the validated scope for this story and keep the current task as the working focus.</output>
</step>

<step n="3" goal="Detect review continuation and summarize the current state">
  <action>Check for a `Senior Developer Review (AI)` section in the story file.</action>
  <action>Check for a `Review Follow-ups (AI)` subsection under Tasks/Subtasks.</action>
  <branch if="review continuation exists">
    <action>Summarize the review outcome, review date, remaining action items, and severity mix.</action>
    <output>Resume implementation by prioritizing unresolved review follow-ups before regular story tasks.</output>
  </branch>
  <branch if="review continuation does not exist">
    <output>Start fresh with the current story, current status, and first incomplete task.</output>
  </branch>
  <detail>
    Treat review follow-up items marked `[AI-Review]` as story work that must be completed and recorded before moving on.
  </detail>
</step>

<step n="4" goal="Mark the story in progress and preserve tracking state">
  <action>Update sprint tracking to `in-progress` when sprint tracking is configured and the story is ready to begin.</action>
  <action>Keep the story file as the source of truth when sprint tracking is unavailable.</action>
  <action>Store the current sprint status for later update.</action>
  <detail>
    Preserve the existing file structure and only update the permitted tracking sections in the story file when making progress.
  </detail>
</step>

<step n="5" goal="Implement the current story task sequence">
  <action>Follow the story file tasks and subtasks in order, using the current incomplete item as the authoritative scope.</action>
  <action>Apply the red-green-refactor cycle when code changes are needed.</action>
  <action>Write or update tests before finalizing implementation when the task requires validation.</action>
  <action>Record implementation notes, debug notes, and changed files in the permitted story sections only.</action>
  <branch if="a task is optional and will be skipped">
    <action>Mark the optional item complete with a concise note that it was intentionally skipped.</action>
  </branch>
  <detail>
    Do not add scope that is not mapped to a specific task or subtask.
    Do not advance to the next task until the current one is complete and the required tests or validation checks pass.
    Only the active step's detail is visible at runtime; the next phase detail appears after this step is completed.
  </detail>
</step>

<step n="6" goal="Validate completion and close out the story">
  <action>Verify all tasks and subtasks are complete, the file list is accurate, and the story status is ready for review.</action>
  <action>Run the required validation and regression checks for the changed code.</action>
  <action>Update the story status to `review` and update sprint tracking when configured.</action>
  <output>Summarize what was completed, what was tested, and what the user should review next.</output>
  <detail>
    Completion should only happen when the story is truly finished, the required items are complete, and no blocking issues remain.
  </detail>
</step>

## CHECKPOINT

The workflow may advance only after the current phase is complete and any required user confirmation or gating decisions have been resolved.

## ADVISORY

- This section is phase-scoped guidance for the active step and should be surfaced under the current phase details.
- Keep the prompt injection self-contained; do not rely on the model reading this source file as a separate document.
- Resolve configuration values from `{main_config}` up front so user name, experience level, languages, and artifact paths are concrete in the prompt.
- Format-looking labels are structural markers only; they are not part of the story implementation instructions.
- If a required item is intentionally skipped, record it as completed so the next phase can surface cleanly.
