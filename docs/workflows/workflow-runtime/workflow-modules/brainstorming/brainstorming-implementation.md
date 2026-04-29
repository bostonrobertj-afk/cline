### `src/core/workflows/brainstormingTechniqueLibrary.ts`

Status: pending

- Whole file: revise this file in one pass.
  - delete the import of `resolveCanonicalBrainstormingSkillPath`
  - add `import path from "path"`
  - in `loadBrainstormingTechniqueEntries(cwd)`, replace the deleted helper call with this exact path-resolution flow:
    - compute `const workspaceCsvPath = path.resolve(cwd, ".cline/skills/bmad-brainstorming/brain-methods.csv")`
    - try `await fs.access(workspaceCsvPath)` and use `workspaceCsvPath` when that access succeeds
    - otherwise fall back to `path.resolve(__dirname, "../../../_bmad/core/skills/bmad-brainstorming/brain-methods.csv")`
  - leave CSV parsing, category filtering, random selection, and error text unchanged
  - after the edit, this file must contain no import from `./brainstormingSessionFiles`
  - do not make any other changes in this file

### `src/shared/capture-brainstorming-topic.ts`

Status: pending

- Whole file: replace legacy workflow-identifier strings `brainstorming.md` -> `brainstorming`; apply only those exact replacements where they name workflows in this file, including string literals, object keys, test fixtures, assertions, manifests, persisted metadata, and prose examples; do not change real markdown document paths, markdown filenames, or unrelated `.md` references; do not make any other changes in this file

### `src/shared/prepare-brainstorming-session.ts`

Status: pending

- Whole file: replace legacy workflow-identifier strings `brainstorming.md` -> `brainstorming`; apply only those exact replacements where they name workflows in this file, including string literals, object keys, test fixtures, assertions, manifests, persisted metadata, and prose examples; do not change real markdown document paths, markdown filenames, or unrelated `.md` references; do not make any other changes in this file
