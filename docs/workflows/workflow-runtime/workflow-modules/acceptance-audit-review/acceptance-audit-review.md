# Module Metadata:
displayName: acceptance audit review
slashcommandname: acceptance-audit-review
useskillname: acceptance-audit-review
description: In this workflow, the agent reviews shipped code vs project specs to ensure that implementation fully aligns with the project's intent, designed functionality, and prescribed code configuration.


# Persona
Persona: (use exactly this)
name: Fred
role: Quality Control
identity: Ensures that shipped code delivers on project expectations without crossing identified scope boundaries or inventing architecture which was not prescribed or approved in project documentation.
capabilities: rigorous validation of shipped code vs project documentation
communication style: precise and detailed
principles: code revisions without clear backing in project documentation are never acceptable. 

# Per-Turn Tool Schema Override
Step 1: Empty schema (no AI invocation)
Step 2: Agent needs to:
    - read files
    - write to files
    - send user general message
    - use attempt_completion
    - use local CLI commands

# Workflow Steps

## Focus Chain Steps
- Step 1: Gather Inputs & Generate Output File
- Step 2: Conduct Acceptance Audit

## Step 1: Gather Inputs & Generate Output File

### Special Handling for Subagents:
This workflow may be activated for a subagent via use_skill. When the workflow is activated this way, it must inherit the following from the main agent which invoked the subagent:
- review_commit_hash
- review_commit_parent
- target_story
- epics_document
- architecture_document
- review_scope_manifest

If inheritance of these keys fails for any reason, the workflow must fail terminally with a concrete error, visible to the main agent, so that they are able to shut down the subagent and retry.

When this workflow is activated for a subagent via use_skill, the initial workflow overview panel and prerequisite files procedures must be bypassed and not run. The instructions under "standard workflow procedure" apply to situations where this workflow is user-invoked via slash command for a main agent.

### Standard Workflow Procedure:

The workflow must render the workflow start panel that introduces the workflow. The panel must include the description from the workflow metadata in the same manner as existing workflow modules have.

Required prerequisite files:
story files in the selected project's "implementation/stories-review" folder- if more than one is discovered a workflow form with dropdown should be shown to the user- this is an existing capability that shouldn't need any revisions to support this part of the workflow.
set the discovered (if only one) or selected (by user) story's full file path as the target_story workflow session key.

runtime must derive the Epics.md and architecture.md files from the selected project and persist them as the epics_document and architecture_document workflow session keys. 

### Step 1 Workflow form:

Workflow Form:
Panel A:
title: Identify Implementation Evidence
promptMarkdown: Provide the commit hash for the target story's commit.
field:
    kind: small_text
    label: commit hash
    required: true
allowedActions/ Labels:
    submit/ submit

Once panel A is submitted, runtime must perform the following deterministic procedure:

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

If any of those Git commands fail or return empty output, the function returns success without writing those values, which causes the workflow to treat the commit as invalid and continue to the invalid-commit panel path by showing panel B.

Once panel A is submitted with a valid commit hash, runtime must use the existing workflow tools to generate the review scope manifest document, then populate the generated document. The file should be persisted in the project's review folder. The artifact conventions and registration were already used during the code review module build, so this workflow should mirror that configuration.

Expected review scope manifest formatting:
*** begin example ***
 # Review Scope Manifest

## Source
- Commit: <hash>
- Parent: <parent hash>
- Story: <target_story path>
- Generated from: git show --name-status --numstat <hash>

## Summary
- Files changed: 8
- Added: 2
- Modified: 5
- Deleted: 1
- Total additions/deletions: +214 / -37

## Changed Files
| Status | Path | Additions | Deletions |
| M | src/foo.ts | 42 | 8 |
| A | src/bar.ts | 90 | 0 |
| D | src/old.ts | 0 | 20 |

## Review Targets
- src/foo.ts
  - Status: modified
  - Reason to inspect: implementation file changed by story commit
  - Diff command: git show <hash> -- src/foo.ts

- src/bar.ts
  - Status: added
  - Reason to inspect: new implementation file
  - Diff command: git show <hash> -- src/bar.ts

## Suggested Review Strategy
- Start with modified/added implementation files.
- Inspect deleted files only for unintended removal.
- Use targeted git show commands per file rather than loading the whole commit diff.
*** end example ***

Panel B: shown only if the commit hash is invalid for any reason
title: Invalid Commit Hash
promptMarkdown: The provided commit hash is invalid. Please go back and provide a valid commit hash.
allowedActions/ Labels:
    back/ back

### Step 1 Output File Generation:
this procedure must be run every time the workflow runs, whether it is activated for a subagent or main agent.

Once the prerequisite files are confirmed and the commit hash and parent commit hash have been identified and persisted as workflow session keys, runtime must generate the following artifact in the selected project's review folder:

acceptance-audit--<target>.md

Where <target> is the story identity for target_story with dots replaced by hyphens.

Examples:

Story identity 1.1 → acceptance-audit-1-1.md
Remediation story identity 1.1.1 → acceptance-audit-1-1-1.md

the full file path for the generated document must be set as the workflow's acceptance_audit_review_output session key.

## Step 2: Conduct Acceptance Audit

### Prompt:

You have been tasked with conducting an acceptance audit of preproduction code against backing project documentation. 

1: Before starting your audit, read the following:
    - target story: target_story
    - epics document: epics_document
    - architecture document: architecture_document
    - review scope manifest: review_scope_manifest

    If needed, you may use the following commit hashes to identify specific code revisions for detailed analysis:
    - Commit from the implementation cycle: review_commit_hash
    - Latest commit immediately before the implementation cycle: review_commit_parent

2: Audit all code revisions (adds/edits/deletes). Your goal is to ensure that the work done during implementation satisfies the following:
    - includes all of the exact changes prescribed by the provided story document, and no other revisions
    - does not invent solutions and/or architecture not clearly authorized by the provided project documentation
    - fully satisfies the story's requirements and objective

3: After conducting your audit, document your findings in this document: acceptance_audit_review_output. 
    - For each finding, you must include:
        - finding: a short title for the finding
        - description: a detailed explanation of the finding, including:
        - an explanation of the identified issue
        - the trigger condition for the finding
        - the potential consequence if the finding is not addressed
        - exact supporting code location with file path, start line, and end line for the smallest line range that supports the finding. If a finding depends on more than one non-contiguous location, include each one in the finding description.
        - an explanation of what in the cited code locations supports the finding
    - If no findings were identified, add a note to acceptance_audit_review_output indicating that no findings were found after thorough review.

4: Use attempt_completion to provide a final report to the user including:
    - number of findings, or clear statement that no findings were identified
    - The full file path for your recorded findings: acceptance_audit_review_output
    - an overview of the findings you documented, if any.

### Progression Rule: successful use of attempt_completion by the agent- workflow must end afterward.
