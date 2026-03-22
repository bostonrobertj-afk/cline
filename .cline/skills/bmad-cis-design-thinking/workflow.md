---
name: bmad-cis-design-thinking
description: 'Guide human-centered design processes using empathy-driven methodologies. Use when the user says "lets run design thinking" or "I want to apply design thinking"'
standalone: true
main_config: '{project-root}/_bmad/cis/config.yaml'
design_methods_file: './design-methods.csv'
default_output_file: '{output_folder}/design-thinking-{date}.md'
---

# workflow

## META

- Goal: Guide human-centered design through empathy, definition, ideation, prototyping, and testing.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Gather context and define the design challenge">
  <branch if="context data was provided with the invocation" optional="true">
    <action>Load the provided context data before starting the discovery conversation.</action>
  </branch>
  <ask>Ask what problem or opportunity the user is exploring, who the primary users or stakeholders are, what constraints exist, what success looks like, and what existing research should inform the session.</ask>
  <output>Create a clear design-challenge framing for the session.</output>
  <template-output>design_challenge</template-output>
  <template-output>challenge_statement</template-output>
</step>

<step n="2" goal="EMPATHIZE by selecting and using the right research methods">
  <action>Load `{design_methods_file}` and select three to five empathy methods that fit the context.</action>
  <detail>Choose methods based on access to users, time constraints, product type, and the depth of understanding needed.</detail>
  <ask>Offer the selected methods with guidance on when each works best, then ask which methods the user has used, can use, or wants recommended.</ask>
  <ask>Ask what users said, thought, did, and felt, what pain points emerged, what was surprising, and what patterns are visible.</ask>
  <output>Guide the user through empathy-building work before solutioning.</output>
  <template-output>user_insights</template-output>
  <template-output>key_observations</template-output>
  <template-output>empathy_map</template-output>
</step>

<step n="3" goal="DEFINE the problem clearly">
  <action>Transform observations into a point-of-view statement and a set of How-Might-We questions.</action>
  <ask>Ask what the real problem is, why it matters to users, what success looks like for them, and what assumptions may be distorting the framing.</ask>
  <output>Guide the user through crisp problem framing grounded in the empathy work.</output>
  <template-output>pov_statement</template-output>
  <template-output>hmw_questions</template-output>
  <template-output>problem_insights</template-output>
</step>

<step n="4" goal="IDEATE across multiple solution directions">
  <action>Review ideation methods from `{design_methods_file}` and select three to five that fit the current problem context.</action>
  <detail>Choose methods based on group versus individual ideation, time available, problem complexity, and the team's comfort with creative divergence.</detail>
  <ask>Offer the selected methods with brief guidance, then ask which ideas excite the user most, which best address the core need, and which are feasible within the constraints.</ask>
  <output>Facilitate divergent idea generation and defer premature judgment.</output>
  <template-output>ideation_methods</template-output>
  <template-output>generated_ideas</template-output>
  <template-output>top_concepts</template-output>
</step>

<step n="5" goal="PROTOTYPE the leading ideas">
  <action>Review prototyping methods from `{design_methods_file}` and select two to four that fit the concept and medium.</action>
  <detail>Consider whether the solution is physical, digital, service-based, or mixed, and choose low-fidelity approaches that maximize learning speed.</detail>
  <ask>Ask what needs to be tested, what minimum fidelity is required, what the user is trying to learn, what users should be able to do, and what can be faked instead of built.</ask>
  <output>Guide the user toward rough, fast prototypes that clarify assumptions.</output>
  <template-output>prototype_approach</template-output>
  <template-output>prototype_description</template-output>
  <template-output>features_to_test</template-output>
</step>

<step n="6" goal="TEST the concept with users">
  <ask>Ask who the user will test with, what tasks testers will attempt, what questions will be asked, how feedback will be captured, and what worked well or failed.</ask>
  <detail>Emphasize what users do, not just what they say, and keep the testing plan grounded in a small but meaningful validation sample.</detail>
  <template-output>testing_plan</template-output>
  <template-output>user_feedback</template-output>
  <template-output>key_learnings</template-output>
</step>

<step n="7" goal="Plan the next iteration">
  <action>Define the refinements, action items, and success criteria for the next cycle.</action>
  <ask>Ask what needs refinement, what the highest-priority next move is, who needs to be involved, what sequence makes sense, how success will be measured, and whether more empathy work is needed.</ask>
  <template-output>refinements</template-output>
  <template-output>action_items</template-output>
  <template-output>success_metrics</template-output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- After each `<template-output>`, save the current artifact to `{default_output_file}`, show the generated content, present the checkpoint menu, and wait for the user's response before proceeding.
- Keep users at the center, encourage divergence before convergence, and avoid giving time estimates.
