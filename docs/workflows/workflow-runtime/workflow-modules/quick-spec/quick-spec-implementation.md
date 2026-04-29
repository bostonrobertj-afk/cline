### `src/shared/build-tech-spec-document.ts`

Status: pending

- Whole file: delete this file entirely from disk at `src/shared/build-tech-spec-document.ts`.
  - this file is a workflow-specific shared helper that gates tech-spec document exposure for the legacy quick-spec flow
  - do not create a replacement shared helper file in this step
  - the surviving step/tool exposure logic must migrate into the `quick-spec` workflow module during quick-spec module buildout rather than remain in shared legacy gating code
