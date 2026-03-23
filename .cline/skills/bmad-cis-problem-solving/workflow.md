---
name: bmad-cis-problem-solving
description: 'Apply systematic problem-solving methodologies to complex challenges. Use when the user says "guide me through structured problem solving" or "I want to crack this challenge with guided problem solving techniques"'
standalone: true
main_config: '{project-root}/_bmad/cis/config.yaml'
solving_methods_file: './solving-methods.csv'
default_output_file: '{output_folder}/problem-solution-{date}.md'
---

# workflow

## META

- Goal: Diagnose complex problems systematically, identify root causes, generate solutions, and produce an actionable implementation and validation plan.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
## EXECUTION

<step n="1" goal="Define and refine the problem">
  <branch if="context data was provided with the invocation" optional="true">
    <action>Load the provided context before starting the diagnosis.</action>
  </branch>
  <action>Use the problem-statement-refinement method from `{solving_methods_file}` to turn vague complaints into a precise statement.</action>
  <ask>Ask what problem the user is trying to solve, how they first noticed it, who experiences it, when and where it occurs, and what the impact or cost is.</ask>
  <output>Establish a precise problem definition before entertaining solutions.</output>
  <template-output>problem_title</template-output>
  <template-output>problem_category</template-output>
  <template-output>initial_problem</template-output>
  <template-output>refined_problem_statement</template-output>
  <template-output>problem_context</template-output>
  <template-output>success_criteria</template-output>
</step>

<step n="2" goal="Diagnose the boundaries and patterns of the problem">
  <ask>Ask where the problem does and does not occur, when it does and does not happen, who is and is not affected, and what the problem is and is not.</ask>
  <output>Use Is/Is-Not analysis to reveal meaningful boundaries and patterns.</output>
  <template-output>problem_boundaries</template-output>
</step>

<step n="3" goal="Conduct root-cause analysis">
  <action>Select two to three diagnosis methods from `{solving_methods_file}` that fit the problem type.</action>
  <detail>Choose among linear, multi-factor, or systems-oriented methods depending on the nature of the issue rather than forcing a single diagnosis style.</detail>
  <ask>Ask about symptoms, causes, causes behind those causes, the likely root cause, and any system dynamics that may be reinforcing the issue.</ask>
  <output>Separate symptoms from causes and keep drilling until a defensible root-cause model emerges.</output>
  <template-output>root_cause_analysis</template-output>
  <template-output>contributing_factors</template-output>
  <template-output>system_dynamics</template-output>
</step>

<step n="4" goal="Analyze forces and constraints">
  <ask>Ask what forces drive toward resolution, what forces resist it, which are strongest, which are influenceable, and what the main constraint or bottleneck is.</ask>
  <action>Synthesize the main insights from force-field and constraint analysis.</action>
  <template-output>driving_forces</template-output>
  <template-output>restraining_forces</template-output>
  <template-output>constraints</template-output>
  <template-output>key_insights</template-output>
</step>

<step n="5" goal="Generate multiple solution options">
  <action>Select two to four solution-generation methods from `{solving_methods_file}` that fit the problem context.</action>
  <detail>Balance systematic and creative methods depending on problem complexity, user preference, time pressure, and whether the issue is technical, organizational, or mixed.</detail>
  <output>Generate multiple viable solution paths before converging.</output>
  <template-output>solution_methods</template-output>
  <template-output>generated_solutions</template-output>
  <template-output>creative_alternatives</template-output>
</step>

<step n="6" goal="Evaluate and select the best solution">
  <ask>Ask what evaluation criteria matter most, including effectiveness, feasibility, cost, time, risk, and any context-specific criteria.</ask>
  <action>Select one or two evaluation methods from `{solving_methods_file}` that fit the situation.</action>
  <output>Evaluate the options against explicit criteria and select the best path deliberately.</output>
  <template-output>evaluation_criteria</template-output>
  <template-output>solution_analysis</template-output>
  <template-output>recommended_solution</template-output>
  <template-output>solution_rationale</template-output>
</step>

<step n="7" goal="Plan implementation">
  <ask>Ask about the overall implementation strategy, timeline shape, stakeholders, action steps, sequencing, and dependencies.</ask>
  <output>Create a concrete implementation plan with ownership and sequencing.</output>
  <template-output>implementation_approach</template-output>
  <template-output>action_steps</template-output>
  <template-output>timeline</template-output>
  <template-output>resources_needed</template-output>
  <template-output>responsible_parties</template-output>
</step>

<step n="8" goal="Establish monitoring and validation">
  <ask>Ask what metrics indicate success, what thresholds matter, how results will be measured, how often they will be reviewed, and how solution effectiveness will be validated.</ask>
  <action>Define the monitoring, validation, and risk-mitigation plan.</action>
  <template-output>success_metrics</template-output>
  <template-output>validation_plan</template-output>
  <template-output>risk_mitigation</template-output>
  <template-output>adjustment_triggers</template-output>
</step>

<step n="9" goal="Capture lessons learned" optional="true">
  <ask>Ask what worked well in the process, what would be done differently next time, what was surprising, what patterns emerged, and what should be remembered for future problem solving.</ask>
  <template-output>key_learnings</template-output>
  <template-output>what_worked</template-output>
  <template-output>what_to_avoid</template-output>
</step>

## CHECKPOINT

After ensuring that all task list items are complete (one-by-one, in order, using the complete_workflow_item tool),
Use the attempt_completion tool to send a final message to the user informing them that this workflow is complete, then HALT and await further instruction.
## ADVISORY

- After each `<template-output>`, save the current artifact to `{default_output_file}`, show the generated content, present the checkpoint menu, and wait for the user's response before proceeding.
- Diagnose before solutioning, reveal patterns and root causes, and avoid giving time estimates.
