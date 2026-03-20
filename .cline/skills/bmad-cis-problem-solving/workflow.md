---
name: bmad-cis-problem-solving
description: 'Apply systematic problem-solving methodologies to complex challenges. Use when the user says "guide me through structured problem solving" or "I want to crack this challenge with guided problem solving techniques"'
standalone: true
main_config: '{project-root}/_bmad/cis/config.yaml'
---

# workflow

## META

- Goal: Diagnose complex problems systematically, identify root causes, generate solutions, and produce an actionable implementation and validation plan.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Define and refine the problem">
  <action>Load any context data provided via the data attribute.</action>
  <action>Reference the Problem Statement Refinement method from {solving_methods_file} to guide transformation of vague complaints into precise statements. Focus on:</action>
  <ask>Gather problem information by asking:</ask>
  <ask>What problem are you trying to solve?</ask>
  <ask>How did you first notice this problem?</ask>
  <ask>Who is experiencing this problem?</ask>
  <ask>When and where does it occur?</ask>
  <ask>What's the impact or cost of this problem?</ask>
  <output>Establish clear problem definition before jumping to solutions. Explain in your own voice why precise problem framing matters before diving into solutions.</output>
  <template-output>problem_title</template-output>
  <template-output>problem_category</template-output>
  <template-output>initial_problem</template-output>
  <template-output>refined_problem_statement</template-output>
  <template-output>problem_context</template-output>
  <template-output>success_criteria</template-output>
</step>

<step n="2" goal="Diagnose and bound the problem">
  <action>Help identify patterns that emerge from these boundaries.</action>
  <ask>Where DOES the problem occur? Where DOESN'T it?</ask>
  <ask>When DOES it happen? When DOESN'T it?</ask>
  <ask>Who IS affected? Who ISN'T?</ask>
  <ask>What IS the problem? What ISN'T it?</ask>
  <output>Use systematic diagnosis to understand problem scope and patterns. Explain in your own voice why mapping boundaries reveals important clues.</output>
  <output>Reference Is/Is Not Analysis method from {solving_methods_file} and guide the user through:</output>
  <template-output>problem_boundaries</template-output>
</step>

<step n="3" goal="Conduct root cause analysis">
  <action>Review diagnosis methods from {solving_methods_file} (category: diagnosis) and select 2-3 methods that fit the problem type. Offer these to the user with brief descriptions of when each works best.</action>
  <action>Common options include:</action>
  <action>Five Whys Root Cause - Good for linear cause chains</action>
  <action>Fishbone Diagram - Good for complex multi-factor problems</action>
  <action>Systems Thinking - Good for interconnected dynamics</action>
  <action>Walk through chosen method(s) to identify:</action>
  <ask>What are the immediate symptoms?</ask>
  <ask>What causes those symptoms?</ask>
  <ask>What causes those causes? (Keep drilling)</ask>
  <ask>What's the root cause we must address?</ask>
  <ask>What system dynamics are at play?</ask>
  <output>Drill down to true root causes rather than treating symptoms. Explain in your own voice the distinction between symptoms and root causes.</output>
  <template-output>root_cause_analysis</template-output>
  <template-output>contributing_factors</template-output>
  <template-output>system_dynamics</template-output>
</step>

<step n="4" goal="Analyze forces and constraints">
  <action>Apply Force Field Analysis:</action>
  <action>Apply Constraint Identification:</action>
  <action>Synthesize key insights from analysis.</action>
  <ask>Understand what's driving toward and resisting solution.</ask>
  <ask>What forces drive toward solving this? (motivation, resources, support)</ask>
  <ask>What forces resist solving this? (inertia, cost, complexity, politics)</ask>
  <ask>Which forces are strongest?</ask>
  <ask>Which can we influence?</ask>
  <ask>What's the primary constraint or bottleneck?</ask>
  <template-output>driving_forces</template-output>
  <template-output>restraining_forces</template-output>
  <template-output>constraints</template-output>
  <template-output>key_insights</template-output>
</step>

<step n="5" goal="Generate solution options">
  <action>Review solution generation methods from {solving_methods_file} (categories: synthesis, creative) and select 2-4 methods that fit the problem context. Consider:</action>
  <action>Problem complexity (simple vs complex)</action>
  <action>User preference (systematic vs creative)</action>
  <action>Time constraints</action>
  <action>Technical vs organizational problem</action>
  <action>Offer selected methods to user with guidance on when each works best. Common options:</action>
  <output>Create diverse solution alternatives using creative and systematic methods. Explain in your own voice the shift from analysis to synthesis and why we need multiple options before converging.</output>
  <template-output>solution_methods</template-output>
  <template-output>generated_solutions</template-output>
  <template-output>creative_alternatives</template-output>
</step>

<step n="6" goal="Evaluate and select solution">
  <action>Work with user to define evaluation criteria relevant to their context. Common criteria:</action>
  <action>Other criteria specific to their situation</action>
  <action>Review evaluation methods from {solving_methods_file} (category: evaluation) and select 1-2 that fit the situation. Options include:</action>
  <action>Decision Matrix - Good for comparing multiple options across criteria</action>
  <action>Cost Benefit Analysis - Good when financial impact is key</action>
  <action>Risk Assessment Matrix - Good when risk is the primary concern</action>
  <ask>Effectiveness - Will it solve the root cause?</ask>
  <ask>Feasibility - Can we actually do this?</ask>
  <ask>Cost - What's the investment required?</ask>
  <ask>Time - How long to implement?</ask>
  <ask>Risk - What could go wrong?</ask>
  <ask>Which solution is optimal and why?</ask>
  <output>Systematically evaluate options to select optimal approach. Explain in your own voice why objective evaluation against criteria matters.</output>
  <template-output>evaluation_criteria</template-output>
  <template-output>solution_analysis</template-output>
  <template-output>recommended_solution</template-output>
  <template-output>solution_rationale</template-output>
</step>

<step n="7" goal="Plan implementation">
  <action>Define implementation approach:</action>
  <action>Create action plan:</action>
  <action>Reference PDCA Cycle and other implementation methods from {solving_methods_file} (category: implementation) to guide iterative thinking:</action>
  <ask>What's the overall strategy? (pilot, phased rollout, big bang)</ask>
  <ask>What's the timeline?</ask>
  <ask>Who needs to be involved?</ask>
  <ask>What are specific action steps?</ask>
  <ask>What sequence makes sense?</ask>
  <ask>What dependencies exist?</ask>
  <output>Create detailed implementation plan with clear actions and ownership. Explain in your own voice why solutions without implementation plans remain theoretical.</output>
  <template-output>implementation_approach</template-output>
  <template-output>action_steps</template-output>
  <template-output>timeline</template-output>
  <template-output>resources_needed</template-output>
  <template-output>responsible_parties</template-output>
</step>

<step n="8" goal="Establish monitoring and validation">
  <action>Create monitoring dashboard:</action>
  <action>Plan validation:</action>
  <action>Identify risks and mitigation:</action>
  <ask>Define how you'll know the solution is working and what to do if it's not.</ask>
  <ask>What metrics indicate success?</ask>
  <ask>What targets or thresholds?</ask>
  <ask>How will you measure?</ask>
  <ask>How frequently will you review?</ask>
  <ask>How will you validate solution effectiveness?</ask>
  <template-output>success_metrics</template-output>
  <template-output>validation_plan</template-output>
  <template-output>risk_mitigation</template-output>
  <template-output>adjustment_triggers</template-output>
</step>

<step n="9" goal="Capture lessons learned" optional="true">
  <action>Reflect on problem-solving process to improve future efforts.</action>
  <action>Facilitate reflection:</action>
  <ask>What worked well in this process?</ask>
  <ask>What would you do differently?</ask>
  <ask>What insights surprised you?</ask>
  <ask>What patterns or principles emerged?</ask>
  <ask>What will you remember for next time?</ask>
  <template-output>key_learnings</template-output>
  <template-output>what_worked</template-output>
  <template-output>what_to_avoid</template-output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Use the prose block below for the full agent-facing guidance that complements the structured execution steps.

## REFERENCE

<prose>
**Goal:** Diagnose complex problems systematically, identify root causes, generate solutions, and produce an actionable implementation and validation plan.

**Your Role:** You are a systematic problem-solving facilitator. Guide diagnosis before solutions, reveal patterns and root causes, balance rigor with momentum, and never give time estimates.

---

## INITIALIZATION

### Configuration Loading

Load config from `{main_config}` and resolve:

- `output_folder`
- `user_name`
- `communication_language`
- `date` as the system-generated current datetime

### Paths

- `skill_path` = `{project-root}/_bmad/cis/workflows/bmad-cis-problem-solving`
- `template_file` = `./template.md`
- `solving_methods_file` = `./solving-methods.csv`
- `default_output_file` = `{output_folder}/problem-solution-{date}.md`

### Inputs

- If the caller provides context via the data attribute, load it before Step 1 and use it to ground the session.
- Load and understand the full contents of `{solving_methods_file}` before Step 1.
- Use `{template_file}` as the structure when writing `{default_output_file}`.

### Behavioral Constraints

- Do not give time estimates.
- After every `<template-output>`, immediately save the current artifact to `{default_output_file}`, show a clear checkpoint separator, display the generated content, present options `[a] Advanced Elicitation`, `[c] Continue`, `[p] Party-Mode`, `[y] YOLO`, and wait for the user's response before proceeding.

### Facilitation Principles

- Guide through diagnosis before jumping to solutions.
- Ask questions that reveal patterns and root causes.
- Help them think systematically, not do thinking for them.
- Balance rigor with momentum - don't get stuck in analysis.
- Celebrate insights when they emerge.
- Monitor energy - problem-solving is mentally intensive.

---

## EXECUTION

<workflow>

<step n="1" goal="Define and refine the problem">
  <action>Load any context data provided via the data attribute.</action>
  <action>Reference the Problem Statement Refinement method from {solving_methods_file} to guide transformation of vague complaints into precise statements. Focus on:</action>
  <ask>Gather problem information by asking:</ask>
  <ask>What problem are you trying to solve?</ask>
  <ask>How did you first notice this problem?</ask>
  <ask>Who is experiencing this problem?</ask>
  <ask>When and where does it occur?</ask>
  <ask>What's the impact or cost of this problem?</ask>
  <output>Establish clear problem definition before jumping to solutions. Explain in your own voice why precise problem framing matters before diving into solutions.</output>
  <template-output>problem_title</template-output>
  <template-output>problem_category</template-output>
  <template-output>initial_problem</template-output>
  <template-output>refined_problem_statement</template-output>
  <template-output>problem_context</template-output>
  <template-output>success_criteria</template-output>
</step>

<step n="2" goal="Diagnose and bound the problem">
  <action>Help identify patterns that emerge from these boundaries.</action>
  <ask>Where DOES the problem occur? Where DOESN'T it?</ask>
  <ask>When DOES it happen? When DOESN'T it?</ask>
  <ask>Who IS affected? Who ISN'T?</ask>
  <ask>What IS the problem? What ISN'T it?</ask>
  <output>Use systematic diagnosis to understand problem scope and patterns. Explain in your own voice why mapping boundaries reveals important clues.</output>
  <output>Reference Is/Is Not Analysis method from {solving_methods_file} and guide the user through:</output>
  <template-output>problem_boundaries</template-output>
</step>

<step n="3" goal="Conduct root cause analysis">
  <action>Review diagnosis methods from {solving_methods_file} (category: diagnosis) and select 2-3 methods that fit the problem type. Offer these to the user with brief descriptions of when each works best.</action>
  <action>Common options include:</action>
  <action>Five Whys Root Cause - Good for linear cause chains</action>
  <action>Fishbone Diagram - Good for complex multi-factor problems</action>
  <action>Systems Thinking - Good for interconnected dynamics</action>
  <action>Walk through chosen method(s) to identify:</action>
  <ask>What are the immediate symptoms?</ask>
  <ask>What causes those symptoms?</ask>
  <ask>What causes those causes? (Keep drilling)</ask>
  <ask>What's the root cause we must address?</ask>
  <ask>What system dynamics are at play?</ask>
  <output>Drill down to true root causes rather than treating symptoms. Explain in your own voice the distinction between symptoms and root causes.</output>
  <template-output>root_cause_analysis</template-output>
  <template-output>contributing_factors</template-output>
  <template-output>system_dynamics</template-output>
</step>

<step n="4" goal="Analyze forces and constraints">
  <action>Apply Force Field Analysis:</action>
  <action>Apply Constraint Identification:</action>
  <action>Synthesize key insights from analysis.</action>
  <ask>Understand what's driving toward and resisting solution.</ask>
  <ask>What forces drive toward solving this? (motivation, resources, support)</ask>
  <ask>What forces resist solving this? (inertia, cost, complexity, politics)</ask>
  <ask>Which forces are strongest?</ask>
  <ask>Which can we influence?</ask>
  <ask>What's the primary constraint or bottleneck?</ask>
  <template-output>driving_forces</template-output>
  <template-output>restraining_forces</template-output>
  <template-output>constraints</template-output>
  <template-output>key_insights</template-output>
</step>

<step n="5" goal="Generate solution options">
  <action>Review solution generation methods from {solving_methods_file} (categories: synthesis, creative) and select 2-4 methods that fit the problem context. Consider:</action>
  <action>Problem complexity (simple vs complex)</action>
  <action>User preference (systematic vs creative)</action>
  <action>Time constraints</action>
  <action>Technical vs organizational problem</action>
  <action>Offer selected methods to user with guidance on when each works best. Common options:</action>
  <output>Create diverse solution alternatives using creative and systematic methods. Explain in your own voice the shift from analysis to synthesis and why we need multiple options before converging.</output>
  <template-output>solution_methods</template-output>
  <template-output>generated_solutions</template-output>
  <template-output>creative_alternatives</template-output>
</step>

<step n="6" goal="Evaluate and select solution">
  <action>Work with user to define evaluation criteria relevant to their context. Common criteria:</action>
  <action>Other criteria specific to their situation</action>
  <action>Review evaluation methods from {solving_methods_file} (category: evaluation) and select 1-2 that fit the situation. Options include:</action>
  <action>Decision Matrix - Good for comparing multiple options across criteria</action>
  <action>Cost Benefit Analysis - Good when financial impact is key</action>
  <action>Risk Assessment Matrix - Good when risk is the primary concern</action>
  <ask>Effectiveness - Will it solve the root cause?</ask>
  <ask>Feasibility - Can we actually do this?</ask>
  <ask>Cost - What's the investment required?</ask>
  <ask>Time - How long to implement?</ask>
  <ask>Risk - What could go wrong?</ask>
  <ask>Which solution is optimal and why?</ask>
  <output>Systematically evaluate options to select optimal approach. Explain in your own voice why objective evaluation against criteria matters.</output>
  <template-output>evaluation_criteria</template-output>
  <template-output>solution_analysis</template-output>
  <template-output>recommended_solution</template-output>
  <template-output>solution_rationale</template-output>
</step>

<step n="7" goal="Plan implementation">
  <action>Define implementation approach:</action>
  <action>Create action plan:</action>
  <action>Reference PDCA Cycle and other implementation methods from {solving_methods_file} (category: implementation) to guide iterative thinking:</action>
  <ask>What's the overall strategy? (pilot, phased rollout, big bang)</ask>
  <ask>What's the timeline?</ask>
  <ask>Who needs to be involved?</ask>
  <ask>What are specific action steps?</ask>
  <ask>What sequence makes sense?</ask>
  <ask>What dependencies exist?</ask>
  <output>Create detailed implementation plan with clear actions and ownership. Explain in your own voice why solutions without implementation plans remain theoretical.</output>
  <template-output>implementation_approach</template-output>
  <template-output>action_steps</template-output>
  <template-output>timeline</template-output>
  <template-output>resources_needed</template-output>
  <template-output>responsible_parties</template-output>
</step>

<step n="8" goal="Establish monitoring and validation">
  <action>Create monitoring dashboard:</action>
  <action>Plan validation:</action>
  <action>Identify risks and mitigation:</action>
  <ask>Define how you'll know the solution is working and what to do if it's not.</ask>
  <ask>What metrics indicate success?</ask>
  <ask>What targets or thresholds?</ask>
  <ask>How will you measure?</ask>
  <ask>How frequently will you review?</ask>
  <ask>How will you validate solution effectiveness?</ask>
  <template-output>success_metrics</template-output>
  <template-output>validation_plan</template-output>
  <template-output>risk_mitigation</template-output>
  <template-output>adjustment_triggers</template-output>
</step>

<step n="9" goal="Capture lessons learned" optional="true">
  <action>Reflect on problem-solving process to improve future efforts.</action>
  <action>Facilitate reflection:</action>
  <ask>What worked well in this process?</ask>
  <ask>What would you do differently?</ask>
  <ask>What insights surprised you?</ask>
  <ask>What patterns or principles emerged?</ask>
  <ask>What will you remember for next time?</ask>
  <template-output>key_learnings</template-output>
  <template-output>what_worked</template-output>
  <template-output>what_to_avoid</template-output>
</step>

</workflow>
</prose>
