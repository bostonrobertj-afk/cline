### `src/core/prompts/system-prompt/__tests__/spec.test.ts`

Status: pending

- Whole file: replace legacy workflow-identifier strings `create-prd.md` -> `create-prd`, `dev-story.md` -> `dev-story`, `review-edge-case-hunter.md` -> `review-edge-case-hunter`; apply only those exact replacements where they name workflows in this file, including string literals, object keys, test fixtures, assertions, manifests, persisted metadata, and prose examples; do not change real markdown document paths, markdown filenames, or unrelated `.md` references; do not make any other changes in this file

### `src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts`

Status: pending

- Whole file: replace legacy workflow-identifier strings `blind-review.md` -> `blind-review`, `brainstorming.md` -> `brainstorming`, `code-review.md` -> `code-review`, `create-epics.md` -> `create-epics`, `create-prd.md` -> `create-prd`, `dev-story.md` -> `dev-story`, `pi-planning.md` -> `pi-planning`, `quick-spec.md` -> `quick-spec`, `review-adversarial-general.md` -> `review-adversarial-general`, `review-edge-case-hunter.md` -> `review-edge-case-hunter`; apply only those exact replacements where they name workflows in this file, including string literals, object keys, test fixtures, assertions, manifests, persisted metadata, and prose examples; do not change real markdown document paths, markdown filenames, or unrelated `.md` references; do not make any other changes in this file

### `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`

Status: pending

- Whole file: delete this file entirely from disk at `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`.
  - this file is a legacy shared workflow-specific prompt/tool matrix surface
  - do not create a replacement shared matrix file in this step
