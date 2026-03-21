---
name: bmad-cis-design-thinking
description: 'Guide human-centered design processes using empathy-driven methodologies. Use when the user says "lets run design thinking" or "I want to apply design thinking"'
standalone: true
main_config: '{project-root}/_bmad/cis/config.yaml'
---

# workflow

## META

- Goal: Guide human-centered design through empathy, definition, ideation, prototyping, testing, and iteration planning.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Initialize the design-thinking session and define the design challenge">
  <action>
    Load the core workflow configuration from `{main_config}` and resolve the values needed for this session.
    <detail>
      Resolve:
      - `output_folder`
      - `user_name`
      - `communication_language`
      - `date`
      - `design_methods_file = ./design-methods.csv`
      - `template_file = ./template.md`
      - `default_output_file = {output_folder}/design-thinking-{date}.md`
    </detail>
  </action>
  <action if="context data was provided with the workflow invocation">
    Load the provided context and use it to ground the session.
    <detail>
      Use the context to inform the challenge framing, user understanding, and later method selection.
    </detail>
  </action>
  <action>Initialize `{default_output_file}` from `{template_file}` so the session artifact is ready to receive structured outputs.</action>
  <output>Frame the session as a human-centered design process that keeps users at the center, encourages divergence before convergence, and avoids premature solutioning.</output>
  <ask>
    Ask the user the core design-challenge questions needed to frame the work.
    <detail>
      Cover:
      - What problem or opportunity are you exploring?
      - Who are the primary users or stakeholders?
      - What constraints exist, such as time, budget, or technology?
      - What does success look like for this project?
      - What existing research or context should we consider?
    </detail>
  </ask>
  <action>Create a clear design challenge statement from the user's inputs and any supplied context.</action>
  <template-output>design_challenge</template-output>
  <template-output>challenge_statement</template-output>
  <action>
    Save the current artifact state to `{default_output_file}` immediately after generating the outputs for this phase.
    <detail>
      Keep the artifact aligned with the structure expected by `{template_file}`.
    </detail>
  </action>
  <output>Show a clear checkpoint separator and display the generated design challenge content.</output>
  <ask>
    Ask whether the user wants to continue, use advanced elicitation, enter party mode, or proceed in YOLO mode.
    <detail>
      Present:
      - `[a]` Advanced Elicitation
      - `[c]` Continue
      - `[p]` Party-Mode
      - `[y]` YOLO
    </detail>
  </ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the design-challenge refinements from advanced elicitation should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the design-challenge refinements from party mode should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current challenge framing and continue decisively into the next phase with strong facilitator initiative.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current challenge framing and continue to the next phase.</action>
  </branch>
</step>

<step n="2" goal="EMPATHIZE - Build understanding of users">
  <action>
    Load and review empathy methods from `{design_methods_file}` for the empathize phase.
    <detail>
      Select 3-5 methods that fit:
      - available resources and access to users
      - time constraints
      - type of product or service being designed
      - the depth of understanding needed
    </detail>
  </action>
  <output>Explain why deep empathy with users is essential before jumping to solutions.</output>
  <output>Offer the selected empathy methods with concise guidance about when each works best.</output>
  <ask>
    Guide the user through empathy discovery and synthesis.
    <detail>
      Cover:
      - What did users say, think, do, and feel?
      - What pain points emerged?
      - What surprised you?
      - What patterns do you see?
    </detail>
  </ask>
  <action>Synthesize the user inputs into structured user insights and empathy findings.</action>
  <template-output>user_insights</template-output>
  <template-output>key_observations</template-output>
  <template-output>empathy_map</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the empathy outputs.</action>
  <output>Show a clear checkpoint separator and display the empathy findings produced in this phase.</output>
  <ask>
    Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.
    <detail>
      Use the same checkpoint menu after each phase output so the user can deepen, discuss, or advance.
    </detail>
  </ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the empathy refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode empathy refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current empathy findings and continue with strong facilitator initiative.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current empathy findings and continue to the define phase.</action>
  </branch>
</step>

<step n="3" goal="DEFINE - Frame the problem clearly">
  <ask>
    Check whether the user is ready to synthesize the empathy findings into a clear problem frame.
    <detail>
      Use an energy or readiness check that respects the user's pace before moving into definition work.
    </detail>
  </ask>
  <action>
    Transform the observations into actionable problem statements.
    <detail>
      Produce:
      - a Point of View statement in the form `[User type] needs [need] because [insight]`
      - "How Might We" questions that open solution space
      - the key insights and opportunity areas that should guide ideation
    </detail>
  </action>
  <ask>
    Use probing questions to sharpen the definition work.
    <detail>
      Cover:
      - What's the real problem we're solving?
      - Why does this matter to users?
      - What would success look like for them?
      - What assumptions are we making?
    </detail>
  </ask>
  <output>Guide the user through problem framing so the challenge is specific enough to act on but open enough to inspire ideas.</output>
  <template-output>pov_statement</template-output>
  <template-output>hmw_questions</template-output>
  <template-output>problem_insights</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the definition outputs.</action>
  <output>Show a clear checkpoint separator and display the defined problem framing and opportunity statements.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the definition refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode definition refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current problem framing and continue decisively into ideation.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current problem framing and continue to ideation.</action>
  </branch>
</step>

<step n="4" goal="IDEATE - Generate diverse solutions">
  <action>
    Load and review ideation methods from `{design_methods_file}` for the ideate phase.
    <detail>
      Select 3-5 methods that fit:
      - group versus individual ideation
      - time available
      - problem complexity
      - team creativity comfort level
    </detail>
  </action>
  <output>Explain the importance of divergent thinking and deferring judgment during ideation.</output>
  <output>Offer the selected ideation methods with brief descriptions of when each works best.</output>
  <ask>
    Facilitate broad idea generation and selection.
    <detail>
      Cover:
      - generate at least 15-30 ideas
      - build on others' ideas
      - go for wild and practical options
      - defer judgment during the expansion phase
      - then identify which ideas excite the user most
      - identify which ideas address the core user need
      - identify which ideas are feasible within the constraints
      - narrow to 2-3 ideas to prototype
    </detail>
  </ask>
  <template-output>ideation_methods</template-output>
  <template-output>generated_ideas</template-output>
  <template-output>top_concepts</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the ideation outputs.</action>
  <output>Show a clear checkpoint separator and display the ideation outputs, including the selected top concepts.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the ideation refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode ideation refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current ideation results and continue decisively into prototyping.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current ideation results and continue to prototyping.</action>
  </branch>
</step>

<step n="5" goal="PROTOTYPE - Make ideas tangible">
  <ask>
    Check whether the user is ready to turn the leading concepts into lightweight prototypes.
    <detail>
      Use a brief energy or readiness check before moving from ideas into making.
    </detail>
  </ask>
  <action>
    Load and review prototyping methods from `{design_methods_file}` for the prototype phase.
    <detail>
      Select 2-4 methods that fit:
      - physical versus digital product
      - service versus product
      - available materials and tools
      - what needs to be tested
    </detail>
  </action>
  <output>Explain why rough, quick prototypes are more useful than polished ones at this stage.</output>
  <output>Offer the selected prototyping methods with guidance on fit.</output>
  <ask>
    Help define the prototype scope and testable assumptions.
    <detail>
      Cover:
      - What's the minimum needed to test your assumptions?
      - What are you trying to learn?
      - What should users be able to do?
      - What can you fake versus build?
    </detail>
  </ask>
  <template-output>prototype_approach</template-output>
  <template-output>prototype_description</template-output>
  <template-output>features_to_test</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the prototype outputs.</action>
  <output>Show a clear checkpoint separator and display the prototype plan for review.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the prototype refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode prototype refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current prototype plan and continue decisively into testing.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current prototype plan and continue to testing.</action>
  </branch>
</step>

<step n="6" goal="TEST - Validate with users">
  <action>
    Design the validation approach and emphasize that observing what users do matters more than only listening to what they say.
    <detail>
      Keep the testing plan grounded in real user behavior rather than assumption validation by opinion alone.
    </detail>
  </action>
  <ask>
    Plan the testing setup and capture learnings.
    <detail>
      Cover:
      - Who will you test with? Aim for 5-7 users.
      - What tasks will they attempt?
      - What questions will you ask?
      - How will you capture feedback?
      - What worked well?
      - Where did they struggle?
      - What surprised them, and you?
      - What questions arose?
      - What would they change?
      - What assumptions were validated or invalidated?
      - What needs to change?
      - What should stay?
      - What new insights emerged?
    </detail>
  </ask>
  <template-output>testing_plan</template-output>
  <template-output>user_feedback</template-output>
  <template-output>key_learnings</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the testing outputs.</action>
  <output>Show a clear checkpoint separator and display the testing plan and key learnings.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the testing refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode testing refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current testing findings and continue decisively into iteration planning.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current testing findings and continue to iteration planning.</action>
  </branch>
</step>

<step n="7" goal="Plan the next iteration">
  <ask>
    Check whether the user is ready to turn the testing learnings into next-step planning.
    <detail>
      Use a brief readiness check before final planning if the session has been long or intensive.
    </detail>
  </ask>
  <action>Define clear next steps and success criteria based on the testing insights.</action>
  <ask>
    Determine the next cycle of work.
    <detail>
      Cover:
      - What refinements are needed?
      - What's the priority action?
      - Who needs to be involved?
      - What sequence makes sense?
      - How will you measure success?
      - Do you need more empathy work?
      - Should you reframe the problem?
      - Are you ready to refine the prototype?
      - Is it time to pilot with real users?
    </detail>
  </ask>
  <template-output>refinements</template-output>
  <template-output>action_items</template-output>
  <template-output>success_metrics</template-output>
  <action>Save the final artifact state to `{default_output_file}` immediately after generating the iteration-planning outputs.</action>
  <output>Show a clear checkpoint separator and display the next-iteration plan, action items, and success metrics.</output>
  <ask>
    Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO before concluding the workflow.
    <detail>
      If the user chooses to continue or proceed in YOLO mode here, treat that as acceptance of the final design-thinking outputs for this run.
    </detail>
  </ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the iteration-plan refinements should be incorporated before concluding.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode iteration-plan refinements should be incorporated before concluding.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the final outputs and conclude the workflow decisively.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the final outputs and conclude the workflow.</action>
  </branch>
</step>

## CHECKPOINT

Halt whenever a phase checkpoint menu is presented after template outputs are saved and displayed, and wait for the user's `[a]`, `[c]`, `[p]`, or `[y]` choice before advancing.

## ADVISORY

- Act as a human-centered design facilitator: keep users at the center, encourage divergence before convergence, prototype quickly, and treat failure as feedback.
- Do not give time estimates.
- Keep the session grounded in `communication_language`.
- Do not tell the model to read this workflow file or any prose section; every operational instruction needed for execution is already expressed in the structured step content.
