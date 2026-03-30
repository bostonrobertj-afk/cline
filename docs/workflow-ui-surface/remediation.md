# Workflow UI Surface Remediation Requirements

## Purpose

This document defines the remediation requirements needed to restore the intended workflow-form help experience for the Phase 1 `code-review.md` Step 3 UI surface.

The original buildout intent was:

- the tool dictionary is a user-facing, read-only runtime reference linked from the workflow form
- the system dictionary is an internal translation source used to generate the tool dictionary
- the user should be able to understand the form inputs at runtime without being exposed to internal implementation labels or repo-only documentation structure

This remediation exists because the current implementation incorrectly made the runtime help experience depend on `docs/workflow-ui-surface/...`, which is not an appropriate runtime asset boundary and is excluded from packaged extension installs.

## Problem Statement

The current implementation has the following architectural mismatch:

- the workflow form runtime expects the tool dictionary to be available at runtime
- the current runtime-facing path points into `docs/workflow-ui-surface/`
- `docs/**` is excluded from the packaged extension
- the current user-facing link exposes an internal repo path and internal naming that are not part of the intended UX

As a result:

- packaged installs can fail to open or read the tool dictionary
- the runtime help experience is not reliable
- the visible path leaks internal implementation structure such as `workflow-ui-surface`

## Remediation Goals

The remediation must ensure that:

- the workflow form can always present the user-facing tool dictionary in packaged installs
- the tool dictionary remains a read-only runtime reference for the active tool
- the system dictionary remains internal and does not need to appear in the user-visible file tree
- runtime UX does not expose internal implementation labels or internal repo folder names
- repo documentation layout and packaged runtime asset layout are no longer coupled

## Core Requirements

### 1. Runtime Help Must Not Depend On `docs/`

The workflow form runtime must not depend on files under `docs/` for any required live behavior.

This includes:

- reading the tool dictionary during workflow-form payload construction
- opening the user-facing dictionary reference from the workflow form UI

Repo documentation may still exist under `docs/`, but those files must be treated as documentation mirrors only and must not be required for packaged runtime behavior.

### 2. The Tool Dictionary Remains A User-Facing Runtime Reference

The human-friendly tool dictionary must remain available to the user from the workflow form at runtime.

The remediation must preserve the original UX intent:

- the user can access a read-only reference from the form
- the reference explains:
  - what the tool does
  - what it produces
  - what inputs the form is asking for
  - which inputs are required vs optional
- the reference opens to the current tool's entry or equivalent anchored section

The remediation must not replace this with:

- a raw repo path leak
- a developer-only artifact
- a requirement that the user manually locate files in the workspace

### 3. The System Dictionary Must Remain Internal

The system dictionary must remain an internal translation source used to generate the tool dictionary and drive human-friendly terminology in the workflow-form experience.

The remediation must not require the system dictionary to:

- be packaged as a user-visible workspace document
- be exposed in the runtime file tree
- be linked directly from the form UI

If a generated markdown mirror of the system dictionary is kept for maintainers, it must remain non-essential to runtime behavior.

### 4. Runtime UX Must Not Expose Internal Implementation Naming

The runtime help experience must not expose internal implementation names such as:

- `workflow-ui-surface`
- internal repo-relative `docs/...` locations
- other implementation-only folder conventions

User-facing copy and labels must instead describe the purpose of the reference in human terms, such as a tool reference, input reference, or diff source reference.

### 5. Packaged Installs Must Carry The Runtime Tool Dictionary

The packaged extension must include everything required for the workflow form to present the tool dictionary in installed environments.

This requirement applies whether the final implementation uses:

- a packaged extension asset
- runtime-generated dictionary content delivered directly through the workflow-form payload
- another extension-owned runtime help surface

What matters is that packaged installs must not lose the user-facing tool dictionary capability.

### 6. Runtime Help Resolution And Presentation Must Use A Single Intentional Contract

The remediation must eliminate the current ambiguity where one relative path field is doing multiple jobs at once.

The system must clearly separate:

- runtime access to the tool dictionary content
- user-facing presentation of that content
- optional repo documentation mirrors for maintainers

The same field or path must not simultaneously mean:

- a packaged runtime asset lookup
- a workspace-relative file to open in the user's repo
- a documentation source-of-truth location

### 7. The Workflow Form Must Continue To Be System-Owned

This remediation must not alter the core workflow-form execution model.

Specifically, it must not change:

- deterministic workflow progression ownership
- the system-owned nature of the Phase 1 Step 3 form flow
- form-to-tool submission transport
- AI-out-of-the-loop handling of raw human inputs

This remediation is about the runtime help/documentation surface associated with the form, not about changing the workflow-form execution model itself.

## Source Of Truth Requirements

### 8. Generator Logic Remains Authoritative

The source of truth for dictionary content must remain code-driven and schema-driven.

The remediation must preserve the current generator-driven model in which:

- tool dictionary structure is derived from tool schema
- human-friendly terminology is supplied through the system dictionary layer
- generated output remains deterministic and verifiable

The remediation must not introduce hand-maintained runtime dictionary copies that can silently drift from the generator outputs.

### 9. Optional Documentation Mirrors Must Be Explicit Mirrors

If repository documentation copies of the dictionaries are retained, they must be treated as generated mirrors of the authoritative generator output.

That means:

- they may continue to exist for discovery, review, and maintenance
- they must not be the runtime dependency used by the packaged extension
- verification must ensure they stay in sync with the generator when they are intentionally retained

## Runtime Surface Requirements

### 10. The User-Facing Dictionary Access Pattern Must Be Read-Only

The form-linked tool dictionary experience must remain read-only from the user's perspective.

The remediation must preserve the current product intent that the dictionary is:

- explanatory
- reference-oriented
- non-editable in normal use

If the implementation uses an in-app surface instead of opening a repo file, that surface must still be read-only.

### 11. The Current Tool Entry Must Remain Directly Reachable

The workflow form must continue to direct the user to the relevant tool entry rather than forcing them to browse manually.

This may be satisfied by:

- opening at the correct line or section anchor
- rendering the dictionary already focused on the relevant tool
- another equivalent mechanism that takes the user directly to the current tool's explanation

The remediation must not degrade this to a generic unanchored document open.

## Packaging And Verification Requirements

### 12. Packaging Verification Must Cover The Runtime Help Surface

The project must include verification that catches future regressions where the packaged install lacks the runtime help artifact or runtime help content path needed by the workflow form.

This verification must prove packaged-runtime viability, not just in-repo path resolution.

At minimum, the verification should fail if:

- the runtime tool dictionary content cannot be resolved in a packaged/install-like environment
- the workflow form still depends on `docs/...` for required runtime behavior

### 13. Runtime Tests Must Reflect The Intended UX Contract

Regression coverage must validate the intended UX contract, not only local repo behavior.

Coverage should prove that:

- the workflow form can obtain the tool dictionary in an install-like environment
- the user-facing dictionary access path no longer depends on repo `docs/`
- the system dictionary remains internal and does not need to be surfaced as a runtime workspace document

## Non-Goals

This remediation does not require:

- redesigning the entire workflow-form system
- changing the deterministic progression contract
- exposing the system dictionary to end users
- making the dictionary documents generally discoverable in the user's workspace
- carrying the repo `docs/` folder into packaged installs

## Acceptance Criteria

The remediation is complete only when all of the following are true:

- a packaged/install-like environment can render the Phase 1 Step 3 workflow form without dictionary-path ENOENT failures
- the workflow form still provides a read-only user-facing reference for the current tool
- that reference no longer depends on `docs/workflow-ui-surface/...` at runtime
- the runtime UX does not expose internal implementation labels like `workflow-ui-surface`
- the system dictionary remains internal to generation/rendering logic
- any retained repo docs copies are mirrors only and are not required for live runtime behavior
