
# Injection Approach by Section

## Acceptance Criteria
- inject only on workflow start 

## Allowed Files List / File List
- do not inject

## Tasks / Subtasks
- Inject first incomplete task with it's subtasks
- Must only inject on turns when task status in source document changed, and on full-prompt turns
- Specifically, the task status change must require that a task (not subtask) newly becomes the next incomplete task
- If a task is completed but has subtasks incomplete, new prompt injection does not trigger
- This means that the current task and it's subtasks must be complete before the next task and subtasks are injected
- `story_task_manager` is runtime-owned and is not exposed to the LLM as a callable tool
- The Step 2 current-step prompt should be split into:
  - a concise static instruction block in the workflow step itself
  - a dynamic task payload injected by `story_task_manager`
- The dynamic task payload must be delivered through the existing current-step prompting seam so it benefits from the same first-send, full-prompt-turn, and context-compaction reinjection behavior
- `story_task_manager` resolves the hidden `story_path` from workflow placeholders populated during Step 1 workflow start
- Task / subtask addressing is runtime-only and must not add visible identifiers to the story file
- `storyTaskId` is the 1-based ordinal of the top-level task within `## Tasks / Subtasks`
- `storySubtaskId` is the 1-based ordinal of the subtask within its parent task

### Tasks / Subtasks Markdown Grammar
- Parser contract is locked to the existing remediation-story checklist shape already used by workflow code-review artifacts
- The parser only reads the top-level `## Tasks / Subtasks` section and stops at the next `##` heading
- A top-level task row must match `^- \[( |x|X)\] `
- A subtask row must match `^  - \[( |x|X)\] `
- Only one subtask nesting level is supported
- Parent/child relationships are determined purely by this indentation and ordering
- The first incomplete task is the first top-level task row with an unchecked checkbox
- The injected task payload includes that first incomplete task plus every immediately following indented subtask row that belongs to it
- When `story_task_complete` marks the last remaining incomplete subtask under a parent task complete, the tool should determine that by reparsing the markdown and then auto-complete the parent task row
- `story_notes_update` is append-only

## Latest Review Findings
- inject only on workflow start 

## Testing Requirements
- separate workflow step
- inject when that step becomes active


# Tools
## story_task_manager 
- pulls content from a story file and injects it into the prompt along with system-generated storyTaskId and storySubtaskIds for each task / subtask
- determines what tasks / subtasks to send based on the source file's markdown checklists- sends first incomplete task and that task's subtasks.
- sends on first turn of workflow
- sends on full-prompt turns
- leverages existing "already prompted" marker so that it resends if context is compacted
- must not expose the story file path to the LLM

## story_task_reminder
- resends the first incomplete task & it's subtasks + their storyTaskIds and storySubtaskIds- this is so the LLM can request that info if it is unsure what it is supposed to be doing rather than reading the file
- must not expose the story file path to the LLM

## story_task_complete
- marks tasks / subtasks complete in the story file
- called by LLM as it completes tasks / subtasks
- LLM provides storyTaskId and/or storySubtaskIds that it wants to mark complete
- tool updates the source file's markdown checklist, marking task / subtask rows as complete by changing "[ ]" to "[x]"
- must not expose the story file path to the LLM
- must have an automated validate/retry mechanism for writes to the story file
- if automated retry fails, must use `ask("followup", ...)` to send a tool-specific failure notice with the target file path and the exact manual checklist update the user needs to apply
- must not prepend a `say(...)` message before that failure ask
- after a failed write, the thread must remain in the normal ask-driven `awaiting_user_response` path until the user replies that it is safe to continue

## story_notes_update
- called by LLM to provide new content for "Completion Notes List" or "File List" sections in the story file
- adds new content under "Completion Notes List" or "File List"
- must not expose the story file path to the LLM
- must have an automated validate/retry mechanism for writes to the story file
- if automated retry fails, must use `ask("followup", ...)` to send a tool-specific failure notice with the target file path and the exact manual notes/file-list update the user needs to apply
- must not prepend a `say(...)` message before that failure ask
- after a failed write, the thread must remain in the normal ask-driven `awaiting_user_response` path until the user replies that it is safe to continue

## story_testing_complete
- accepts a "done" call from LLM, updates status to "review"
- must not expose the story file path to the LLM
- must have an automated validate/retry mechanism for writes to the story file
- if automated retry fails, must use `ask("followup", ...)` to send a tool-specific failure notice with the target file path and the exact manual status update the user needs to apply
- must not prepend a `say(...)` message before that failure ask
- after a failed write, the thread must remain in the normal ask-driven `awaiting_user_response` path until the user replies that it is safe to continue
