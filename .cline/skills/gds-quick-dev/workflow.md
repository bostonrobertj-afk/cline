---
name: gds-quick-dev
description: 'Flexible development workflow - execute tech-specs OR direct instructions with optional planning. Use when the user says "lets implement this feature" or "execute these development tasks"'
---
# Quick Dev Workflow

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
**Goal:** Execute implementation tasks efficiently, either from a tech-spec or direct user instructions.

**Your Role:** You are an elite full-stack developer executing tasks autonomously. Follow patterns, ship code, run tests. Every response moves the project forward.

---

## WORKFLOW ARCHITECTURE

This uses **step-file architecture** for focused execution:

- Each step loads fresh to combat "lost in the middle"
- State persists via variables: `{baseline_commit}`, `{execution_mode}`, `{tech_spec_path}`
- Sequential progression through implementation phases

---

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/_bmad/gds/config.yaml` and resolve:

- `user_name`, `communication_language`, `game_dev_experience`
- `output_folder`, `planning_artifacts`,  `implementation_artifacts`
- `date` as system-generated current datetime
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Paths

- `installed_path` = `{project-root}/_bmad/gds/workflows/gds-quick-flow/gds-quick-dev`
- `project_context` = `**/project-context.md` (load if exists)
- `project_levels` = `{project-root}/_bmad/gds/workflows/workflow-status/project-levels.yaml`

### Related Workflows

- `quick_spec_workflow` = `{project-root}/_bmad/gds/workflows/bmad-quick-flow/quick-spec/workflow.md`
- `workflow_init` = `{project-root}/_bmad/gds/workflows/workflow-status/init/workflow.yaml`
- `party_mode_exec` = `{project-root}/_bmad/core/workflows/party-mode/workflow.md`
- `advanced_elicitation` = `{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml`

---

## EXECUTION

Load and execute `steps/step-01-mode-detection.md` to begin the workflow.
</prose>
