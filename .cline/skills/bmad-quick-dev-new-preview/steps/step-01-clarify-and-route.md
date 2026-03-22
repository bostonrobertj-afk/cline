---
wipFile: '{implementation_artifacts}/tech-spec-wip.md'
deferred_work_file: '{implementation_artifacts}/deferred-work.md'
spec_file: ''
---

# Step 1: Clarify and Route

## META

- Speak in the configured communication language.
- Treat the user prompt as the starting intent, not as a substitute for investigation.
- Do not skip clarification, planning, implementation, review, or presentation steps.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Clarify the request, inspect artifacts, and route the workflow">
  <action>List files in {planning_artifacts} and {implementation_artifacts} and inspect any relevant intent or spec files.</action>
  <branch if="an active spec or work-in-progress file is found" optional="true">
    <output>Found an active spec. Ask the user whether to resume it or start a new one.</output>
    <ask>Resume the active spec or start a new workflow?</ask>
  </branch>
  <branch if="the intent appears to span multiple independently shippable goals" optional="true">
    <output>Explain the distinct goals, the coupling risk, and the recommended first goal.</output>
    <ask>Choose [S] split or [K] keep all goals together.</ask>
  </branch>
  <action>Derive {spec_file} when the scope is clear and choose `one-shot` only when the blast radius is truly zero.</action>
  <output>Route to the next step based on the chosen execution mode.</output>
  <detail>
    If the user selected an existing spec, set `execution_mode = "plan-code-review"` and route accordingly. If the request is small and isolated, use `one-shot`; otherwise default to `plan-code-review`.
  </detail>
</step>
