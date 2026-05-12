### `src/core/task/tools/handlers/__tests__/DevStoryStoryTools.test.ts`

Status: pending

- Whole file: replace legacy workflow-identifier strings `dev-story.md` -> `dev-story`; apply only those exact replacements where they name workflows in this file, including string literals, object keys, test fixtures, assertions, manifests, persisted metadata, and prose examples; do not change real markdown document paths, markdown filenames, or unrelated `.md` references; do not make any other changes in this file



## Story Prompt State Migration

- During the dev Story module build, explicitly migrate or delete the story prompt-state fields `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey` from `TaskState` and persisted `TaskMetadata`. These fields must not remain as unowned foundational runtime state after the dev Story module owns its workflow-specific prompt/progression model.
