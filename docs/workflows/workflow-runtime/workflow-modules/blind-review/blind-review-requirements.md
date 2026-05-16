# Blind Review Workflow Module Requirements

## Scope

Build the product-owned `blind-review` workflow module using `/Users/robertboston/Documents/Cline/Workflows/blind-review.md` as the behavior reference. Workflow names must not include `.md`.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide. Use completed workflow module requirements only as structural references where they still align with the guide and current project requirements.

The blind-review workflow performs a blind adversarial review of implementation changes using Git-backed evidence. The AI agent must inspect the implementation diff identified by the provided commit hash and parent hash, must not inspect project planning/source documents, must write its findings to the workflow output document, and must complete the workflow after reporting the review result.

The blind-review workflow may run as a user-facing main-agent workflow or as a child/subagent workflow assigned by another workflow. Main-agent activation uses the shared workflow entry form, prerequisite story selection, and Step 1 commit-hash form. Child/subagent activation bypasses all user-facing forms and prerequisite UI, inherits required workflow values from the parent session, creates its own blind-review output artifact, and proceeds directly to model-driven review.

Do not rely on the source markdown workflow file, legacy BMAD workflow package files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime. Source files are migration references only.

## Source Verbiage Fidelity

The blind-review requirements must preserve the exact user-provided UI and AI prompt verbiage from `/Users/robertboston/Documents/Cline/Workflows/blind-review.md`.

The module must not invent, paraphrase, summarize, or add UI-visible panel titles, `promptMarkdown`, field labels, action labels, static notice content, helper text, descriptions, button labels, or AI prompt text.

If required UI-visible text or prompt text is missing from the source document, the module build must stop and request source-document clarification before action-plan or runtime implementation work proceeds.

## Workflow Identity

- `name`: `blind-review`
- `slashCommandName`: `blind-review`
- `useSkillName`: `blind-review`
- `displayName`: `blind review`
- `description`: `This workflow performs a blind adversarial review using git-backed evidence to identify misconfiguration and use of bad coding habits.`
- `persona`: `quality-control`
- `projectSubfolder`: `review`

The workflow-specific shared entry `WorkflowForm` informational panel must reuse the module-owned description above as the workflow overview text for user-facing main-agent workflow activation.

## Persona

The blind-review module must use the persona prescribed by `/Users/robertboston/Documents/Cline/Workflows/blind-review.md`.

The module must copy the persona into module-owned constants and must not read `_bmad/bmm/agents/quality-control.md` or `/Users/robertboston/Documents/Cline/Workflows/blind-review.md` at runtime.

The module-owned persona must be a structured `WorkflowPersonaDefinition` for the mapped `quality-control` persona.

- `name`: `Jasmine`
- `role`: `Quality Control`
- `identity`: `You are a cynical, jaded reviewer with zero patience for sloppy work. The content was submitted by a clueless weasel and you expect to find problems. Be skeptical of everything. Look for what's missing, not just what's wrong. Use a precise, professional tone — no profanity or personal attacks.`
- `capabilities`: [`thorough code review`]
- `communicationStyle`: `precise and detailed`
- `principles`: [`lazily formatted and noncompliant code must never hit the production environment.`]

## Runtime-Owned Values

The blind-review module must define its workflow-owned value contract according to `FR-10a` through `FR-10c1`.

The module must declare every supported workflow value key in `workflowValueKeys`. `WorkflowRuntime.applyWorkflowValueWrites(...)` must be able to reject or no-op any write outside that inventory.

The module must declare `entryProjectValueKeys` with exactly these three destinations, and each destination must also appear in `workflowValueKeys`:

- `projectMode`
- `projectTitle`
- `projectFolderName`

The module must include workflow-value keys for:

- entry project selection values
- `target_story`, the absolute path to the selected or inherited `implementation/stories-review` story or remediation story file
- `selected_story_identity`, the dotted numeric story identity derived from the basename of `target_story`
- `review_commit_hash`, the normalized reviewed commit hash
- `review_commit_parent`, the reviewed commit's parent hash
- `blind_review_output`, the absolute path to `blind-review-{target}.md`
- `blind_review_output_artifact_family`, the internal artifact-family output key written when `blind_review_output` is allocated
- `blind_review_output_artifact_identity`, the internal artifact-identity output key written when `blind_review_output` is allocated
- `blind_review_output_artifact_filename`, the internal artifact-filename output key written when `blind_review_output` is allocated
- `blind_review_output_artifact_relative_path`, the internal artifact-relative-path output key written when `blind_review_output` is allocated

Any workflow form field whose submitted value must survive beyond form-local state must declare a durable workflow-value destination and persist through the runtime value seam.

Workflow values must remain JSON-safe and preserve type/shape. Prompt builders may render workflow values only through deterministic rendering; runtime or tool code requiring string paths, identities, filenames, statuses, arrays, booleans, or object values must validate the expected type and shape.

Workflow-owned values must clear on teardown and participate in safe resume through runtime-owned session state.

## AI-Writable Workflow Values

The blind-review module must not define AI-writable workflow values.

No blind-review step may expose `set_workflow_values`. Target story selection, commit metadata persistence, artifact derivation, and workflow completion are runtime-owned deterministic behavior or governed backend behavior.

## Runtime Artifact Family

The workflow runtime artifact-family registry must support the target-derived blind review output artifact family before the blind-review module can be implemented:

| Artifact family | Allocation mode | Identity requirement | Filename pattern | Project folder | Workflow owner |
| --- | --- | --- | --- | --- | --- |
| `blind_review_output` | `derived_from_target` | `target_story_or_remediation_story` | `blind-review-{target}.md` | `review` | `blind-review` |

`{target}` must be the selected or inherited story or remediation-story identity with dots replaced by hyphens. Story `1.1` must produce `1-1`; remediation story `1.1.1` must produce `1-1-1`.

The blind-review workflow owns creation of `blind_review_output`.

The module must derive a module-owned `selected_story_identity` workflow value from `target_story` after prerequisite resolution or child inheritance. The derived value must be the story or remediation-story identity in dotted numeric form, such as `1.1` or `1.1.1`, parsed only from the basename of `target_story` using the approved story filename patterns. The artifact definition for `blind_review_output` must use `selected_story_identity` as `targetIdentitySource`.

The module must not parse blind-review output artifact filenames, replace output artifact separators, derive lineage segments from output artifact paths, or compute target artifact identities from any source other than the basename of `target_story` using the approved story filename patterns.

The module artifact definition must map runtime artifact output values into the workflow values listed above. In particular, `outputValueKeys.artifactAbsolutePath` must be `blind_review_output`.

The source instructions prescribe only the artifact filename and output workflow value. They do not prescribe initial document headings or initial document body content. The module must not invent initial document headings. The runtime-owned artifact creation may create an empty document for the model to populate during Step 2.

The blind-review module must use only `blind-review-{target}.md` as its canonical output artifact filename form.

## Required Prerequisite Files

For user-facing main-agent activation, the blind-review workflow requires one selected-project prerequisite file before Step 1 commit-hash collection and artifact generation can complete:

| Prerequisite id | Requirement | Producing workflow | Project subfolder | Match | Workflow value key |
| --- | --- | --- | --- | --- | --- |
| `target_story` | required | `dev-story` | `implementation/stories-review` | naming pattern `/^(Story-\d+-\d+|Remediation-story-\d+-\d+-\d+)\.md$/` | `target_story` |

The prerequisite must be declared in `WorkflowDefinition.prerequisiteFiles` and resolved through the runtime-owned `resolve_prerequisite_files` decision action.

Prerequisite selection must not be implemented as a module-owned `selectorDiscovery` workflow form, and it must not mutate shared project-selection behavior.

Runtime-owned prerequisite discovery must resolve only under the selected project root and must target `implementation/stories-review`. It must not accept absolute paths, parent-directory escapes, or files outside the selected project.

If no required story file is discoverable or if the user rejects or cancels story selection, the workflow must inform the user that a story file in `implementation/stories-review` is required and must not proceed to commit-hash collection, artifact generation, model-driven work, or completion.

The prerequisite declaration must use `outputDocumentReference: "none"` because blind-review does not create an initial output document that records selected prerequisite paths.

## Child/Subagent Activation

The blind-review workflow may be activated for a subagent through parent-owned subagent workflow assignment. The subagent must not call `use_skill` itself. Workflow assignment must follow the global subagent workflow-session requirements in `FR-62a` through `FR-62q`.

When activated as a child/subagent workflow, the blind-review workflow must inherit these workflow values from the parent workflow session:

- `review_commit_hash`
- `review_commit_parent`
- `target_story`

Child/subagent workflow activation must copy project selection from the parent workflow session as runtime activation context, not through the workflow-value inheritance map.

The workflow must not require runtime to persist whether blind-review was activated as a main-agent workflow or child/subagent workflow. Instead, Step 1 must use workflow-value state as the gate for progression: `blind_review_output` must not be generated and Step 2 must not be projected unless `target_story`, `review_commit_hash`, and `review_commit_parent` are all present as non-empty strings.

When activated as a child/subagent workflow, the blind-review workflow must bypass:

- the mandatory shared workflow overview/project-selection form
- `resolve_prerequisite_files`
- the Step 1 commit-hash workflow form
- any other user-facing workflow form

When activated as a child/subagent workflow and `target_story`, `review_commit_hash`, and `review_commit_parent` are already inherited and valid, the workflow must bypass prerequisite selection and the Step 1 commit-hash workflow form, create `blind_review_output` for the inherited `target_story`, and project the Step 2 prompt.

## Entry And Steps

The shared entry `WorkflowForm` remains mandatory for user-facing main-agent workflow invocations. Workflow-specific entry copy must describe the blind-review workflow using the module-owned description.

The module must define each workflow step as a `WorkflowStepDefinition` that satisfies the main workflow-runtime contract:

- `id` must use canonical `step-{stepNumber}` form and exactly match `stepNumber`
- `stepNumber` must define the runtime step order
- `checklistLabel` must define the focus-chain task text projected to the UI
- `buildPromptSource` must provide module-owned prompt text
- `buildToolSchema` must provide module-owned per-step tool schema
- `decisionTree` must own step progression, form rendering, deterministic actions, transitions, model handoff, and completion behavior
- Any workflow-form or deterministic operation selected by a step must follow the workflow-runtime form and action contracts
- Final-step completion must use workflow-runtime completion and teardown behavior

The module must define these two steps, using these exact `checklistLabel` values:

| Step id | Step number | `checklistLabel` | Required runtime shape |
| --- | --- | --- | --- |
| `step-1` | 1 | `Prepare Inputs & Set Workflow Variables` | For main-agent activation, resolve `target_story`, collect and validate the commit hash, persist `review_commit_hash` and `review_commit_parent`, create `blind_review_output`, and transition to Step 2 only after valid review evidence and output artifact exist. For child/subagent activation, validate inherited workflow values, create `blind_review_output`, and transition to Step 2 without rendering any forms. |
| `step-2` | 2 | `Perform Blind Adversarial Review` | Model-driven blind review step. Project the source-prescribed prompt, expose only the model-visible tools required for Git diff inspection, implementation source review, output document writing, ordinary user messaging, and final completion, and complete the workflow after successful `attempt_completion`. |

## Step 1: Prepare Inputs & Set Workflow Variables

For user-facing main-agent activation, Step 1 must begin by resolving the `target_story` prerequisite.

After `target_story` is resolved, Step 1 must render one module-owned workflow form session for commit-hash collection.

Panel A must be:

- `panelId`: module-owned Panel A id
- `title`: `Identify Implementation Evidence`
- `promptMarkdown`: `Provide the commit hash for the target story's commit.`
- field kind: `small_text`
- field label: `commit hash`
- field required: `true`
- allowed action: `submit`
- submit action label: `submit`

Once Panel A is submitted, runtime must perform this deterministic procedure:

1. Read the user-submitted commit hash from the workflow form.
2. Resolve the selected project repo root from `target_story`.
3. Verify the selected project is inside a Git work tree:

```bash
git rev-parse --is-inside-work-tree
```

4. Normalize/validate the submitted hash as a commit:

```bash
git rev-parse --verify <submittedCommitHash>^{commit}
```

The stdout becomes `review_commit_hash`.

5. Resolve the parent of that normalized commit:

```bash
git rev-parse <normalizedCommitHash>^
```

The stdout becomes `review_commit_parent`.

6. Persist both workflow values:

```ts
review_commit_hash: normalizedCommitHash
review_commit_parent: parentHash
```

If any of those Git commands fail or return empty output, the deterministic procedure must return success without writing `review_commit_hash` or `review_commit_parent`. Step 1 must then continue the same workflow form session to Panel B.

Panel B must be:

- `panelId`: module-owned Panel B id
- `title`: `Invalid Commit Hash`
- `promptMarkdown`: `The provided commit hash is invalid. Please go back and provide a valid commit hash.`
- fields: none
- allowed action: `back`
- back action label: `back`
- `backDestinationPanelId`: Panel A

Panel B must be shown only when the commit hash is invalid for any reason.

For any activation path, Step 1 must check whether `target_story`, `review_commit_hash`, and `review_commit_parent` are already present as non-empty strings before rendering Panel A. If all three values are present, Step 1 must skip Panel A and Panel B and proceed directly to output artifact generation. If one or more values is missing during a main-agent path, Step 1 must use prerequisite resolution and the commit-hash form flow described above to collect the missing values before artifact generation.

Step 1 output file generation must run every time the workflow runs, whether activated for a subagent or a main agent.

Once `target_story`, `selected_story_identity`, `review_commit_hash`, and `review_commit_parent` are available and valid for the activation path, runtime must generate this artifact in the selected project's `review` folder:

```text
blind-review-<target>.md
```

Where `<target>` is the story identity for `target_story` with dots replaced by hyphens.

Examples:

- Story identity `1.1` produces `blind-review-1-1.md`
- Remediation story identity `1.1.1` produces `blind-review-1-1-1.md`

The full file path for the generated document must be set as the workflow's `blind_review_output` session key.

If output artifact creation fails, Step 1 must route to `terminal_error`. The terminal error must identify the failed artifact operation, the selected or inherited `target_story`, and the concrete backend failure reason.

If output artifact creation succeeds, Step 1 must transition to Step 2.

Step 1 must expose an empty model-facing tool schema through an exported builder from `blindReviewToolSchemas.ts`.

## Step 2: Perform Blind Adversarial Review

Step 2 must enter model-driven work through a `project_prompt` decision action.

Step 2 `buildPromptSource` must construct the Step 2 prompt from module-owned code. The Step 2 prompt must preserve this exact source prompt text, with workflow values rendered by runtime prompt rendering:

```text
Your job is to perform a blind adversarial review using git-backed evidence to identify misconfigured or lazily-written code. You are not to read any project documentation during this review.
Use these commit hashes:
commit hash: review_commit_hash
parent hash: review_commit_parent

Use only the provided commit hash and parent hash to inspect the implementation changes.

1. Run `git diff --name-status <review_commit_parent> <review_commit_hash>` to identify every changed, added, deleted, renamed, or copied file.

2. For each changed file from the name-status output, inspect the implementation diff with:
   `git diff <review_commit_parent> <review_commit_hash> -- <path>`
   - Ignore project documents which were included in the name-status output.

3. Review every changed file that is not a project document. Do not skip files because they appear small, generated, deleted, renamed, copied, test-only, or configuration-only.
  - Ignore files located in docs/projects

4. For renamed or copied files, assess both the path change and the content change shown by Git.

5. Do not read the story document, review scope manifest, epics document, architecture document, requirements, action plan, or other planning/source-instruction documents. This is a blind review of the implementation diff only.

6. Based only on the implementation diff, assess the changes using these review lenses:

- Contract pass:
  - For every changed symbol, ask what visible caller, callee, serializer, validator, storage path, UI path, or test depends on this shape, name, default, or behavior.
  - Look for changed code that references symbols, files, routes, tools, values, or tests that were not updated in the same commit.
  - Look for broken or stale imports/exports, inconsistent names/constants, and deleted or renamed files that leave visible stale references.

- Omission pass:
  - Ask what should have changed with this based only on the diff.
  - Look for missing wiring, registrations, migrations, feature flags, permissions, cleanup, or tests that are implied by changed code.

- Failure-path pass:
  - Ignore happy path and test the diff mentally under null, empty, malformed, duplicate, stale, slow, unauthorized, partial, retried, and concurrent conditions.
  - Look for missing error handling around newly introduced failure paths.

- State pass:
  - Track changed state lifecycle by hand: where it is created, transformed, cached, invalidated, retried, rolled back, and cleared.
  - Look for new persistence/writes without a corresponding read/use path visible in the diff.

- Config pass:
  - Check assumptions in constants, defaults, env vars, paths, timeout values, fallback branches, and temporary bypasses.
  - Look for hardcoded values where the diff itself shows an existing constant, enum, helper, or configuration path should be used.

- Compatibility pass:
  - Ask what older callers, persisted data, or partial deploys would do against the changed behavior when that risk is visible from the diff.
  - Look for interface drift: renamed fields, changed enums, altered return shapes, optionality changes, and default changes.

- Type-safety pass:
  - Look for `any`, `as any`, forced casts used instead of narrowing, non-null assertions where runtime absence is possible, incomplete discriminated-union handling, missing explicit return types on new helpers, and truthy/falsy checks where explicit checks are needed.

- Implementation hygiene pass:
  - Look for unused imports, unused helpers, dead branches, commented-out experiments, duplicate logic, partial scaffolding, broad catches, silent fallbacks, optionalized requirements, deferred TODOs, and code that appears added only to satisfy checks rather than to preserve correctness.

- Test skepticism pass:
  - Treat tests as claims, not proof.
  - Look for tests asserting implementation trivia without behavior, incomplete or malformed fixtures, tests updated inconsistently with runtime behavior, happy-path-only coverage, snapshots hiding logic changes, mocks that no longer match reality, and missing regression coverage.

- Behavioral-risk pass:
  - Look for changed conditionals that appear inverted or unreachable.
  - Look for new async operations without awaiting or error handling.
  - Look for boundary violations visible in the diff, such as trust moved from server to client, authorization checked only in UI, skipped sanitization, or path/command injection risk.

7. Document your findings in blind_review_output including:
   - any findings, ordered by severity.
   - for each finding, include:
    - a brief title for the finding
    - file/path references for each finding
    - a detailed description of the finding
   - a clear statement if no actionable issues were found

Once you've completed your review and documented your findings, use attempt_completion to provide a review summary including:
- number of findings, or statement that no findings were identified
- full file path for your output: blind_review_output
```

The prompt renderer must replace `review_commit_hash`, `review_commit_parent`, and `blind_review_output` with their persisted workflow values before projection. The projected prompt must not leak those placeholder strings when valid workflow values are available.

Step 2 must expose only the model-callable tools required for the source-prescribed work:

- `execute_command`, so the AI can run the source-prescribed Git evidence commands, including `git diff --name-status <review_commit_parent> <review_commit_hash>` and `git diff <review_commit_parent> <review_commit_hash> -- <path>`
- `list_files`, so the AI can inspect local repository structure when needed to interpret changed implementation paths
- `search_files`, so the AI can trace references, registrations, call sites, or missing propagation that are visible from the implementation changes
- `list_code_definition_names`, so the AI can inspect available symbols when the diff requires source-level reference tracing
- `read_file`, so the AI can inspect changed implementation files and narrowly relevant supporting code
- `read_file_range`, so the AI can inspect line-targeted source ranges and gather precise evidence for findings
- `apply_patch`, so the AI can update `blind_review_output` through a governed patch when that is the appropriate file-write method
- `write_to_file`, so the AI can create or fully replace the `blind_review_output` contents when that is the appropriate file-write method
- `send_user_message`, so the AI can send an ordinary user-visible message if it encounters a blocker before final completion
- `attempt_completion`, so the AI can complete the workflow after documenting the review

Step 2 must not expose `web_search`, `web_fetch`, `browser_action`, `ask_followup_question`, `use_subagents`, `use_skill`, `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `workflow_progress_request`, MCP tools, or retired blind-review/code-review tools.

The workflow must not expose project planning/source documents to Step 2 through prompt text, workflow values, tool parameters, or generated document content. The generated `blind_review_output` path is the required output write target and is not part of this read prohibition. Specifically, Step 2 must not prompt the model to read:

- `target_story`
- review scope manifest
- epics document
- architecture document
- requirements documents
- action plans
- source-instruction documents
- project documents under `docs/projects`

When `attempt_completion_succeeded` occurs in Step 2, the workflow must complete. Blind-review completion must not update story index status, move story files, generate remediation stories, dispatch subagents, or mutate parent workflow state.

## Terminal Error Handling

When these requirements state that the workflow routes to `terminal_error`, the runtime must:

- stop the current workflow progression
- not transition to the next step
- not complete the workflow
- not perform later mutations after the failure point
- preserve any files and workflow values already changed before the failure point unless the failing operation itself is atomic and can roll back safely
- show a user-visible error message that includes the failed operation name, relevant file path or story identity when applicable, the concrete reason, and the required user action when known

## Tool Cleanup And Legacy State Removal

The blind-review module build must not preserve or re-establish legacy blind-review behavior through placeholder workflow state, managed-workflow state, legacy workflow markdown, legacy `.cline/skills` workflow packages, or retired review artifact names.

The legacy tool matrix may be used only as migration reference material for historical tool-category intent. It must not participate in runtime schema generation and must not be copied as a one-to-one tool mapping.

The blind-review module must not add specialized backend workflow tools unless normal shared tools cannot safely express the source-prescribed behavior. This requirements document does not require any new AI-callable specialized backend workflow tool.

## Module File Layout

The blind-review implementation should use only the module files it actually needs, consistent with the module build guide:

```text
src/core/task/workflow-runtime/workflow-modules/blind-review/
  blindReviewWorkflow.ts
  blindReviewToolSchemas.ts
  index.ts
  __tests__/
    blindReviewWorkflow.test.ts
    blindReviewToolSchemas.test.ts
```

A module-owned document helper or registry file must not be created unless the action plan identifies exact runtime behavior that requires it.

## Testing Requirements

The module build must include focused unit tests covering:

- workflow identity, `slashCommandName`, `useSkillName`, display name, description, project subfolder, persona fields, and entry panel description reuse
- workflow value inventory, including entry project keys, `target_story`, `selected_story_identity`, `review_commit_hash`, `review_commit_parent`, `blind_review_output`, and blind-review artifact metadata keys
- prerequisite declaration for `target_story` using `implementation/stories-review`, required mode, producing workflow `dev-story`, naming pattern for `Story-{E}-{S}.md` and `Remediation-story-{E}-{S}-{R}.md`, workflow value key `target_story`, and `outputDocumentReference: "none"`
- artifact definition for `blind_review_output`, using the runtime-owned `blind_review_output` artifact family, derived intent mode, `selected_story_identity` target identity source, and output value key mapping
- main-agent Step 1 routing through prerequisite resolution, commit-hash form Panel A, invalid-commit Panel B, artifact creation, and transition to Step 2 after valid commit metadata and output artifact allocation
- child/subagent Step 1 routing that bypasses shared entry UI, prerequisite selection, and workflow forms; validates inherited `review_commit_hash`, `review_commit_parent`, and `target_story`; creates `blind_review_output`; and transitions to Step 2
- Step 1 value-gated routing that skips prerequisite selection and commit-hash forms when `target_story`, `review_commit_hash`, and `review_commit_parent` are already present, and refuses to generate `blind_review_output` or project Step 2 until those values are present
- deterministic commit validation behavior, including successful persistence of normalized commit hash and parent hash, invalid hash routing to Panel B without writing commit values, parent-hash failure routing to Panel B, and selected project not being inside a Git work tree routing to Panel B
- artifact creation failure routing to `terminal_error` with the concrete backend failure reason
- Step 1 exported tool-schema builder returning an empty model-visible schema
- Step 2 prompt projection preserving source wording while rendering `review_commit_hash`, `review_commit_parent`, and `blind_review_output` values without leaking placeholders
- Step 2 exported tool-schema builder returning exactly the approved model-visible tool names
- prompt integration proving Step 2 projected tools are present in active workflow native/non-native prompt surfaces and forbidden tools are absent
- Step 2 `attempt_completion_succeeded` routing to workflow completion without story index updates, story file moves, remediation story generation, subagent dispatch, or parent workflow mutation
- workflow registry resolution by workflow name, slash command, and use-skill name
- absence of runtime dependency on `/Users/robertboston/Documents/Cline/Workflows/blind-review.md`, `.cline/skills` blind-review/review-adversarial-general assets, placeholder workflow state, managed-workflow state, and the legacy tool matrix

Prompt tests must not assert exact editable prompt prose. They must assert behavior and invariants: prompt output exists, required workflow values render non-empty, placeholders do not leak, forbidden document references and legacy text are absent, current step details are projected in the correct payload location, and the projected tool schema matches the prompt's tool references.

## Validation Requirements

The blind-review action plan must prescribe validation commands that include:

- focused blind-review workflow module unit tests
- focused blind-review tool-schema tests
- workflow registry/prompt projection tests covering slash-command and use-skill activation
- subagent child-workflow activation tests covering inherited workflow values and form bypass
- `npm run check-types`
- `npm run lint`

If `npm run check-types` fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun the exact blocked validation command before treating the failure as a code defect.

Persistent diffs after implementation must be limited to files authorized by the action plan phase being executed.
