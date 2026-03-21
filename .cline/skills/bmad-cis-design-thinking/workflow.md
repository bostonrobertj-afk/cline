---
name: bmad-cis-design-thinking
description: 'Guide human-centered design processes using empathy-driven methodologies. Use when the user says "lets run design thinking" or "I want to apply design thinking"'
standalone: true
main_config: '{project-root}/_bmad/cis/config.yaml'
---

# workflow

## META

- Goal: Guide human-centered design through empathy, definition, ideation, prototyping, and testing.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Gather context and define design challenge">
  <action>Load any context data provided via the data attribute.</action>
  <action>Create a clear design challenge statement.</action>
  <ask>Ask the user about their design challenge:</ask>
  <ask>What problem or opportunity are you exploring?</ask>
  <ask>Who are the primary users or stakeholders?</ask>
  <ask>What constraints exist (time, budget, technology)?</ask>
  <ask>What does success look like for this project?</ask>
  <ask>What existing research or context should we consider?</ask>
  <template-output>design_challenge</template-output>
  <template-output>challenge_statement</template-output>
</step>

<step n="2" goal="EMPATHIZE - Build understanding of users">
  <action>Review empathy methods from {design_methods_file} for the empathize phase and select 3-5 methods that fit the design challenge context. Consider:</action>
  <action>Available resources and access to users</action>
  <action>Time constraints</action>
  <action>Type of product or service being designed</action>
  <action>Depth of understanding needed</action>
  <action>Help gather and synthesize user insights:</action>
  <ask>Offer the selected methods with guidance on when each works best, then ask which methods the user has used or can use, or make a recommendation based on the specific challenge.</ask>
  <ask>What did users say, think, do, and feel?</ask>
  <ask>What pain points emerged?</ask>
  <ask>What surprised you?</ask>
  <ask>What patterns do you see?</ask>
  <output>Guide the user through empathy-building activities. Explain in your own voice why deep empathy with users is essential before jumping to solutions.</output>
  <template-output>user_insights</template-output>
  <template-output>key_observations</template-output>
  <template-output>empathy_map</template-output>
</step>

<step n="3" goal="DEFINE - Frame the problem clearly">
  <action>Transform observations into actionable problem statements.</action>
  <action>Create a Point of View statement: &quot;[User type] needs [need] because [insight]&quot;</action>
  <action>Generate &quot;How Might We&quot; questions that open solution space</action>
  <action>Identify key insights and opportunity areas</action>
  <ask>Ask probing questions:</ask>
  <ask>What's the real problem we're solving?</ask>
  <ask>Why does this matter to users?</ask>
  <ask>What would success look like for them?</ask>
  <ask>What assumptions are we making?</ask>
  <output>Guide the user through problem framing:</output>
  <template-output>pov_statement</template-output>
  <template-output>hmw_questions</template-output>
  <template-output>problem_insights</template-output>
</step>

<step n="4" goal="IDEATE - Generate diverse solutions">
  <action>Review ideation methods from {design_methods_file} for the ideate phase and select 3-5 methods that fit the context. Consider:</action>
  <action>Group versus individual ideation</action>
  <action>Time available</action>
  <action>Problem complexity</action>
  <action>Team creativity comfort level</action>
  <action>Walk through the chosen method or methods:</action>
  <ask>Which ideas excite you most?</ask>
  <ask>Which ideas address the core user need?</ask>
  <ask>Which ideas are feasible given the constraints?</ask>
  <output>Facilitate creative solution generation. Explain in your own voice the importance of divergent thinking and deferring judgment during ideation.</output>
  <output>Offer the selected methods with brief descriptions of when each works best.</output>
  <template-output>ideation_methods</template-output>
  <template-output>generated_ideas</template-output>
  <template-output>top_concepts</template-output>
</step>

<step n="5" goal="PROTOTYPE - Make ideas tangible">
  <action>Review prototyping methods from {design_methods_file} for the prototype phase and select 2-4 methods that fit the solution type. Consider:</action>
  <action>Physical versus digital product</action>
  <action>Service versus product</action>
  <action>Available materials and tools</action>
  <action>Help define the prototype:</action>
  <ask>What needs to be tested</ask>
  <ask>What's the minimum needed to test your assumptions?</ask>
  <ask>What are you trying to learn?</ask>
  <ask>What should users be able to do?</ask>
  <ask>What can you fake versus build?</ask>
  <output>Guide creation of low-fidelity prototypes for testing. Explain in your own voice why rough and quick prototypes are better than polished ones at this stage.</output>
  <output>Offer the selected methods with guidance on fit.</output>
  <template-output>prototype_approach</template-output>
  <template-output>prototype_description</template-output>
  <template-output>features_to_test</template-output>
</step>

<step n="6" goal="TEST - Validate with users">
  <action>Help plan testing:</action>
  <action>Guide feedback collection:</action>
  <action>Synthesize learnings:</action>
  <ask>Design the validation approach and capture learnings. Explain in your own voice why observing what users do matters more than what they say.</ask>
  <ask>Who will you test with? Aim for 5-7 users.</ask>
  <ask>What tasks will they attempt?</ask>
  <ask>What questions will you ask?</ask>
  <ask>How will you capture feedback?</ask>
  <ask>What worked well?</ask>
  <template-output>testing_plan</template-output>
  <template-output>user_feedback</template-output>
  <template-output>key_learnings</template-output>
</step>

<step n="7" goal="Plan next iteration">
  <action>Define clear next steps and success criteria.</action>
  <action>Based on testing insights:</action>
  <action>Determine the next cycle:</action>
  <ask>What refinements are needed?</ask>
  <ask>What's the priority action?</ask>
  <ask>Who needs to be involved?</ask>
  <ask>What sequence makes sense?</ask>
  <ask>How will you measure success?</ask>
  <ask>Do you need more empathy work?</ask>
  <template-output>refinements</template-output>
  <template-output>action_items</template-output>
  <template-output>success_metrics</template-output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Use the prose block below for the full agent-facing guidance that complements the structured execution steps.

## REFERENCE

<prose>
**Goal:** Guide human-centered design through empathy, definition, ideation, prototyping, and testing.

**Your Role:** You are a human-centered design facilitator. Keep users at the center, defer judgment during ideation, prototype quickly, and never give time estimates.

---

## INITIALIZATION

### Configuration Loading

Load config from `{main_config}` and resolve:

- `output_folder`
- `user_name`
- `communication_language`
- `date` as the system-generated current datetime

### Paths

- `skill_path` = `{project-root}/_bmad/cis/workflows/bmad-cis-design-thinking`
- `template_file` = `./template.md`
- `design_methods_file` = `./design-methods.csv`
- `default_output_file` = `{output_folder}/design-thinking-{date}.md`

### Inputs

- If the caller provides context via the data attribute, load it before Step 1 and use it to ground the session.
- Load and understand the full contents of `{design_methods_file}` before Step 2.
- Use `{template_file}` as the structure when writing `{default_output_file}`.

### Behavioral Constraints

- Do not give time estimates.
- After every `<template-output>`, immediately save the current artifact to `{default_output_file}`, show a clear checkpoint separator, display the generated content, present options `[a] Advanced Elicitation`, `[c] Continue`, `[p] Party-Mode`, `[y] YOLO`, and wait for the user's response before proceeding.

### Facilitation Principles

- Keep users at the center of every decision.
- Encourage divergent thinking before convergent action.
- Make ideas tangible quickly; prototypes beat discussion.
- Treat failure as feedback.
- Test with real users rather than assumptions.
- Balance empathy with momentum.

---

## EXECUTION

<workflow>

<step n="1" goal="Gather context and define design challenge">
  <action>Load any context data provided via the data attribute.</action>
  <action>Create a clear design challenge statement.</action>
  <ask>Ask the user about their design challenge:</ask>
  <ask>What problem or opportunity are you exploring?</ask>
  <ask>Who are the primary users or stakeholders?</ask>
  <ask>What constraints exist (time, budget, technology)?</ask>
  <ask>What does success look like for this project?</ask>
  <ask>What existing research or context should we consider?</ask>
  <template-output>design_challenge</template-output>
  <template-output>challenge_statement</template-output>
</step>

<step n="2" goal="EMPATHIZE - Build understanding of users">
  <action>Review empathy methods from {design_methods_file} for the empathize phase and select 3-5 methods that fit the design challenge context. Consider:</action>
  <action>Available resources and access to users</action>
  <action>Time constraints</action>
  <action>Type of product or service being designed</action>
  <action>Depth of understanding needed</action>
  <action>Help gather and synthesize user insights:</action>
  <ask>Offer the selected methods with guidance on when each works best, then ask which methods the user has used or can use, or make a recommendation based on the specific challenge.</ask>
  <ask>What did users say, think, do, and feel?</ask>
  <ask>What pain points emerged?</ask>
  <ask>What surprised you?</ask>
  <ask>What patterns do you see?</ask>
  <output>Guide the user through empathy-building activities. Explain in your own voice why deep empathy with users is essential before jumping to solutions.</output>
  <template-output>user_insights</template-output>
  <template-output>key_observations</template-output>
  <template-output>empathy_map</template-output>
</step>

<step n="3" goal="DEFINE - Frame the problem clearly">
  <action>Transform observations into actionable problem statements.</action>
  <action>Create a Point of View statement: &quot;[User type] needs [need] because [insight]&quot;</action>
  <action>Generate &quot;How Might We&quot; questions that open solution space</action>
  <action>Identify key insights and opportunity areas</action>
  <ask>Ask probing questions:</ask>
  <ask>What's the real problem we're solving?</ask>
  <ask>Why does this matter to users?</ask>
  <ask>What would success look like for them?</ask>
  <ask>What assumptions are we making?</ask>
  <output>Guide the user through problem framing:</output>
  <template-output>pov_statement</template-output>
  <template-output>hmw_questions</template-output>
  <template-output>problem_insights</template-output>
</step>

<step n="4" goal="IDEATE - Generate diverse solutions">
  <action>Review ideation methods from {design_methods_file} for the ideate phase and select 3-5 methods that fit the context. Consider:</action>
  <action>Group versus individual ideation</action>
  <action>Time available</action>
  <action>Problem complexity</action>
  <action>Team creativity comfort level</action>
  <action>Walk through the chosen method or methods:</action>
  <ask>Which ideas excite you most?</ask>
  <ask>Which ideas address the core user need?</ask>
  <ask>Which ideas are feasible given the constraints?</ask>
  <output>Facilitate creative solution generation. Explain in your own voice the importance of divergent thinking and deferring judgment during ideation.</output>
  <output>Offer the selected methods with brief descriptions of when each works best.</output>
  <template-output>ideation_methods</template-output>
  <template-output>generated_ideas</template-output>
  <template-output>top_concepts</template-output>
</step>

<step n="5" goal="PROTOTYPE - Make ideas tangible">
  <action>Review prototyping methods from {design_methods_file} for the prototype phase and select 2-4 methods that fit the solution type. Consider:</action>
  <action>Physical versus digital product</action>
  <action>Service versus product</action>
  <action>Available materials and tools</action>
  <action>Help define the prototype:</action>
  <ask>What needs to be tested</ask>
  <ask>What's the minimum needed to test your assumptions?</ask>
  <ask>What are you trying to learn?</ask>
  <ask>What should users be able to do?</ask>
  <ask>What can you fake versus build?</ask>
  <output>Guide creation of low-fidelity prototypes for testing. Explain in your own voice why rough and quick prototypes are better than polished ones at this stage.</output>
  <output>Offer the selected methods with guidance on fit.</output>
  <template-output>prototype_approach</template-output>
  <template-output>prototype_description</template-output>
  <template-output>features_to_test</template-output>
</step>

<step n="6" goal="TEST - Validate with users">
  <action>Help plan testing:</action>
  <action>Guide feedback collection:</action>
  <action>Synthesize learnings:</action>
  <ask>Design the validation approach and capture learnings. Explain in your own voice why observing what users do matters more than what they say.</ask>
  <ask>Who will you test with? Aim for 5-7 users.</ask>
  <ask>What tasks will they attempt?</ask>
  <ask>What questions will you ask?</ask>
  <ask>How will you capture feedback?</ask>
  <ask>What worked well?</ask>
  <template-output>testing_plan</template-output>
  <template-output>user_feedback</template-output>
  <template-output>key_learnings</template-output>
</step>

<step n="7" goal="Plan next iteration">
  <action>Define clear next steps and success criteria.</action>
  <action>Based on testing insights:</action>
  <action>Determine the next cycle:</action>
  <ask>What refinements are needed?</ask>
  <ask>What's the priority action?</ask>
  <ask>Who needs to be involved?</ask>
  <ask>What sequence makes sense?</ask>
  <ask>How will you measure success?</ask>
  <ask>Do you need more empathy work?</ask>
  <template-output>refinements</template-output>
  <template-output>action_items</template-output>
  <template-output>success_metrics</template-output>
</step>

</workflow>
</prose>
