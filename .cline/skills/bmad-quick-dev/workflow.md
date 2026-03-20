# workflow

## META

- Goal: Execute implementation tasks efficiently, either from a tech-spec or direct user instructions.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Execute implementation tasks efficiently, either from a tech-spec or direct user instructions.">
  <action>Load the context, configuration, and prerequisites referenced for workflow.</action>
  <action>Execute the instructions in this file in order without skipping required work.</action>
  <output>When this file is complete, continue with ./steps/step-01-mode-detection.md.</output>
</step>

## CHECKPOINT

Complete the current required actions in order before moving to the next workflow phase.

## ADVISORY

- Next handoff: ./steps/step-01-mode-detection.md

## REFERENCE

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

Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve:

- `user_name`, `communication_language`, `user_skill_level`
- `planning_artifacts`, `implementation_artifacts`
- `date` as system-generated current datetime
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Paths

- `project_context` = `**/project-context.md` (load if exists)

---

## EXECUTION

Read fully and follow: `./steps/step-01-mode-detection.md` to begin the workflow.
</prose>
