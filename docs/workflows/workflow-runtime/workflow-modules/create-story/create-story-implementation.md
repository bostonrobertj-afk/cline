# Create Story Module Implementation Notes

## Story Prompt State Migration

- During the Create Story module build, explicitly migrate or delete the story prompt-state fields `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey` from `TaskState` and persisted `TaskMetadata`. These fields must not remain as unowned foundational runtime state after the Create Story module owns its workflow-specific prompt/progression model.
