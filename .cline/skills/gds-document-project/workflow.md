---
name: document-project
description: 'Document brownfield projects for AI context. Use when the user says "document this project" or "generate project docs"'
---
# Document Project Workflow

## META
- managed_workflow_extraction: enabled
- phase_type: workflow
- source_format: procedural

## EXECUTION
<step n="1" goal="Review Detailed Guidance">
  <action>Read the advisory, reference, and prose sections in this file completely before taking action.</action>
</step>

<step n="2" goal="Follow Workflow">
  <action>Execute this file in order, preserving every approval gate, routing rule, document update instruction, and constraint described below.</action>
</step>

## CHECKPOINT
Workflow progress can advance only after the required outputs, approvals, and routing conditions in this file are satisfied.

## ADVISORY
- Treat the <prose> section as the authoritative detailed instructions for this file.
- Preserve all existing user-input pauses, continuation checks, and referenced companion files.
- Keep any document templates, frontmatter updates, and save instructions exactly as authored.

## REFERENCE
- Original authored procedure retained below for managed workflow extraction compatibility.

<prose>
**Goal:** Document brownfield projects for AI context.

**Your Role:** Project documentation specialist.
- Communicate all responses in {communication_language}

---

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/_bmad/gds/config.yaml` and resolve:

- `project_knowledge`
- `user_name`
- `communication_language`
- `document_output_language`
- `game_dev_experience`
- `date` as system-generated current datetime

### Paths

- `installed_path` = `{project-root}/_bmad/gds/workflows/gds-document-project`
- `instructions` = `{installed_path}/instructions.md`
- `validation` = `{installed_path}/checklist.md`
- `documentation_requirements_csv` = `{installed_path}/documentation-requirements.csv`

---

## EXECUTION

Read fully and follow: `{installed_path}/instructions.md`
</prose>
