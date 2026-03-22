# workflow

## META

- Goal: Create a comprehensive story file that gives the development agent everything needed for implementation.


## EXECUTION

<step n="1" goal="Resolve the target story and begin the story-creation workflow">
  <handoff path="./steps/step-01-determine-target-story.md">Determine which story should be created before any artifact analysis begins.</handoff>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- Keep the resulting story file focused on implementation guidance instead of reprinting the source documents.
