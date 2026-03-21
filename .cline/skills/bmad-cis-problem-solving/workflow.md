---
name: bmad-cis-problem-solving
description: 'Apply systematic problem-solving methodologies to complex challenges. Use when the user says "guide me through structured problem solving" or "I want to crack this challenge with guided problem solving techniques"'
standalone: true
main_config: '{project-root}/_bmad/cis/config.yaml'
---

# workflow

## META

- Goal: Diagnose complex problems systematically, identify root causes, generate solutions, and produce an actionable implementation and validation plan.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Define and refine the problem">
  <action>
    Load the core workflow configuration from `{main_config}` and resolve the values needed for this session.
    <detail>
      Resolve:
      - `output_folder`
      - `user_name`
      - `communication_language`
      - `date`
      - `solving_methods_file = ./solving-methods.csv`
      - `template_file = ./template.md`
      - `default_output_file = {output_folder}/problem-solution-{date}.md`
    </detail>
  </action>
  <action if="context data was provided with the workflow invocation">
    Load the provided context and use it to ground the session.
    <detail>
      Use the context to inform the problem framing, diagnosis, and later solution planning.
    </detail>
  </action>
  <action>Initialize `{default_output_file}` from `{template_file}` so the problem-solving artifact is ready to receive structured outputs.</action>
  <action>
    Load and review the Problem Statement Refinement method from `{solving_methods_file}`.
    <detail>
      Use it to transform vague complaints into precise, solvable problem statements.
    </detail>
  </action>
  <output>Explain why precise problem framing matters before diving into solutions.</output>
  <ask>
    Gather the core problem information needed for a strong definition.
    <detail>
      Cover:
      - What problem are you trying to solve?
      - How did you first notice this problem?
      - Who is experiencing this problem?
      - When and where does it occur?
      - What's the impact or cost of this problem?
      - What would success look like?
    </detail>
    <detail>
      Use refinement prompts such as:
      - What exactly is wrong?
      - What's the gap between current and desired state?
      - What makes this a problem worth solving?
    </detail>
  </ask>
  <template-output>problem_title</template-output>
  <template-output>problem_category</template-output>
  <template-output>initial_problem</template-output>
  <template-output>refined_problem_statement</template-output>
  <template-output>problem_context</template-output>
  <template-output>success_criteria</template-output>
  <action>Save the current artifact state to `{default_output_file}` immediately after generating the problem-definition outputs.</action>
  <output>Show a clear checkpoint separator and display the refined problem framing and success criteria.</output>
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
    <ask>Ask whether the problem-definition refinements from advanced elicitation should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the problem-definition refinements from party mode should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current problem framing and continue decisively into diagnosis.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current problem framing and continue to diagnosis.</action>
  </branch>
</step>

<step n="2" goal="Diagnose and bound the problem">
  <action>
    Load and use the Is/Is Not Analysis method from `{solving_methods_file}` to diagnose scope and boundaries.
    <detail>
      The goal is to reveal patterns and clues by clarifying where the problem appears and where it does not.
    </detail>
  </action>
  <output>Explain why mapping problem boundaries reveals important clues about scope, patterns, and likely causes.</output>
  <ask>
    Guide the user through boundary analysis.
    <detail>
      Cover:
      - Where does the problem occur? Where does it not occur?
      - When does it happen? When does it not happen?
      - Who is affected? Who is not affected?
      - What is the problem? What is it not?
    </detail>
  </ask>
  <action>Help identify the patterns that emerge from the is/is-not boundary analysis.</action>
  <template-output>problem_boundaries</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the problem-boundary outputs.</action>
  <output>Show a clear checkpoint separator and display the boundary analysis and pattern insights.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the diagnostic refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode diagnostic refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current diagnosis and continue decisively into root-cause analysis.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current diagnosis and continue to root-cause analysis.</action>
  </branch>
</step>

<step n="3" goal="Conduct root cause analysis">
  <action>
    Load and review diagnosis methods from `{solving_methods_file}`.
    <detail>
      Select 2-3 methods that fit the problem type and context.
    </detail>
    <detail>
      Common options include:
      - Five Whys Root Cause for linear cause chains
      - Fishbone Diagram for complex multi-factor problems
      - Systems Thinking for interconnected dynamics
    </detail>
  </action>
  <output>Explain the distinction between symptoms and root causes, and why solving symptoms alone rarely resolves the real issue.</output>
  <output>Offer the selected diagnosis methods with brief guidance about when each works best.</output>
  <ask>
    Walk through the chosen root-cause methods with the user.
    <detail>
      Cover:
      - What are the immediate symptoms?
      - What causes those symptoms?
      - What causes those causes?
      - What's the root cause that must be addressed?
      - What system dynamics are at play?
    </detail>
  </ask>
  <template-output>root_cause_analysis</template-output>
  <template-output>contributing_factors</template-output>
  <template-output>system_dynamics</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the root-cause outputs.</action>
  <output>Show a clear checkpoint separator and display the root-cause analysis and contributing-factor findings.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the root-cause refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode root-cause refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current root-cause analysis and continue decisively into force and constraint analysis.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current root-cause analysis and continue to force and constraint analysis.</action>
  </branch>
</step>

<step n="4" goal="Analyze forces and constraints">
  <action>
    Apply Force Field Analysis to understand what is driving toward resolution and what is resisting it.
    <detail>
      Focus on motivation, resources, support, inertia, cost, complexity, and politics.
    </detail>
  </action>
  <action>
    Apply constraint identification to find the primary bottlenecks and limits on the solution space.
    <detail>
      Distinguish between real constraints and assumed constraints where possible.
    </detail>
  </action>
  <ask>
    Guide the user through the force and constraint questions.
    <detail>
      Cover:
      - What forces drive toward solving this?
      - What forces resist solving this?
      - Which forces are strongest?
      - Which can we influence?
      - What's the primary constraint or bottleneck?
    </detail>
  </ask>
  <action>Synthesize the key insights from the force-field and constraint analysis.</action>
  <template-output>driving_forces</template-output>
  <template-output>restraining_forces</template-output>
  <template-output>constraints</template-output>
  <template-output>key_insights</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the force and constraint outputs.</action>
  <output>Show a clear checkpoint separator and display the driving forces, restraining forces, constraints, and key insights.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the force-and-constraint refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode force-and-constraint refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current diagnostic insights and continue decisively into solution generation.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current diagnostic insights and continue to solution generation.</action>
  </branch>
</step>

<step n="5" goal="Generate solution options">
  <ask>
    Check whether the user is ready to shift from diagnosis into solution generation.
    <detail>
      Use a quick energy or readiness check if the session has been analytically heavy.
    </detail>
  </ask>
  <action>
    Load and review solution-generation methods from `{solving_methods_file}`.
    <detail>
      Select 2-4 methods that fit:
      - problem complexity
      - user preference for systematic versus creative approaches
      - time constraints
      - technical versus organizational nature of the problem
    </detail>
    <detail>
      Common options include:
      - systematic methods such as TRIZ, Morphological Analysis, and Biomimicry
      - creative methods such as Lateral Thinking, Assumption Busting, and Reverse Brainstorming
    </detail>
  </action>
  <output>Explain the shift from analysis to synthesis and why multiple solution options are needed before convergence.</output>
  <output>Offer the selected methods with guidance about when each works best.</output>
  <ask>
    Guide the user through generation of solution alternatives.
    <detail>
      Aim to generate:
      - 10-15 solution ideas minimum
      - a mix of incremental and breakthrough approaches
      - some wild ideas that challenge assumptions
    </detail>
  </ask>
  <template-output>solution_methods</template-output>
  <template-output>generated_solutions</template-output>
  <template-output>creative_alternatives</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the solution outputs.</action>
  <output>Show a clear checkpoint separator and display the generated solution portfolio.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the solution-generation refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode solution-generation refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current solution portfolio and continue decisively into evaluation.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current solution portfolio and continue to evaluation.</action>
  </branch>
</step>

<step n="6" goal="Evaluate and select a solution">
  <action>
    Define the evaluation criteria that matter in the user's context.
    <detail>
      Common criteria include:
      - effectiveness
      - feasibility
      - cost
      - time
      - risk
      - any other criteria specific to the situation
    </detail>
  </action>
  <action>
    Load and review evaluation methods from `{solving_methods_file}`.
    <detail>
      Select 1-2 methods that fit the situation.
    </detail>
    <detail>
      Common options include:
      - Decision Matrix
      - Cost Benefit Analysis
      - Risk Assessment Matrix
    </detail>
  </action>
  <output>Explain why objective evaluation against explicit criteria improves solution quality and reduces bias.</output>
  <ask>
    Evaluate the solution options systematically.
    <detail>
      Cover:
      - Will it solve the root cause?
      - Can we actually do this?
      - What's the investment required?
      - How long will it take?
      - What could go wrong?
      - Which solution is optimal and why?
    </detail>
  </ask>
  <template-output>evaluation_criteria</template-output>
  <template-output>solution_analysis</template-output>
  <template-output>recommended_solution</template-output>
  <template-output>solution_rationale</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the evaluation outputs.</action>
  <output>Show a clear checkpoint separator and display the evaluation criteria, analysis, and recommended solution.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the evaluation refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode evaluation refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the recommended solution and continue decisively into implementation planning.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the recommended solution and continue to implementation planning.</action>
  </branch>
</step>

<step n="7" goal="Plan implementation">
  <action>
    Define the implementation approach.
    <detail>
      Cover:
      - overall strategy, such as pilot, phased rollout, or big bang
      - timeline
      - who needs to be involved
    </detail>
  </action>
  <action>
    Create the action plan and sequence of work.
    <detail>
      Cover:
      - specific action steps
      - the sequence that makes sense
      - dependencies
      - responsible parties
      - resources needed
    </detail>
  </action>
  <action>
    Use implementation methods from `{solving_methods_file}` to guide iterative thinking.
    <detail>
      Reference PDCA Cycle and related approaches to clarify how the work will be planned, executed, checked, and adjusted.
    </detail>
  </action>
  <output>Explain why solutions without implementation plans remain theoretical.</output>
  <template-output>implementation_approach</template-output>
  <template-output>action_steps</template-output>
  <template-output>timeline</template-output>
  <template-output>resources_needed</template-output>
  <template-output>responsible_parties</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the implementation outputs.</action>
  <output>Show a clear checkpoint separator and display the implementation approach, action plan, and ownership structure.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the implementation-plan refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode implementation-plan refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current implementation plan and continue decisively into monitoring and validation.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current implementation plan and continue to monitoring and validation.</action>
  </branch>
</step>

<step n="8" goal="Establish monitoring and validation">
  <ask>
    Check whether the user is ready for the final planning step around metrics, validation, and adjustment triggers.
    <detail>
      Use a brief energy or readiness check if helpful after the implementation-planning work.
    </detail>
  </ask>
  <action>
    Define how success will be measured and validated.
    <detail>
      Cover:
      - what metrics indicate success
      - targets or thresholds
      - how measurement will work
      - review cadence
      - how solution effectiveness will be validated
    </detail>
  </action>
  <action>
    Identify implementation risks and mitigation plans.
    <detail>
      Cover:
      - what could go wrong
      - how to prevent or detect issues early
      - fallback plans
      - triggers for adjustment or pivot
    </detail>
  </action>
  <template-output>success_metrics</template-output>
  <template-output>validation_plan</template-output>
  <template-output>risk_mitigation</template-output>
  <template-output>adjustment_triggers</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the monitoring and validation outputs.</action>
  <output>Show a clear checkpoint separator and display the monitoring metrics, validation plan, and risk mitigation structure.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the monitoring and validation refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode monitoring refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current monitoring plan and continue decisively into optional reflection.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current monitoring plan and continue to optional reflection.</action>
  </branch>
</step>

<step n="9" goal="Capture lessons learned" optional="true">
  <output>Offer a brief optional reflection to help the user improve future problem-solving efforts.</output>
  <ask>
    If the user wants reflection, guide a short lessons-learned conversation.
    <detail>
      Cover:
      - What worked well in this process?
      - What would you do differently?
      - What insights surprised you?
      - What patterns or principles emerged?
      - What will you remember for next time?
    </detail>
  </ask>
  <template-output>key_learnings</template-output>
  <template-output>what_worked</template-output>
  <template-output>what_to_avoid</template-output>
  <action if="the user chooses to do the optional reflection">Save the final artifact state to `{default_output_file}` after generating the reflection outputs.</action>
  <output if="the user chooses to do the optional reflection">Show a clear checkpoint separator and display the lessons learned captured in this optional phase.</output>
</step>

## CHECKPOINT

Halt whenever a phase checkpoint menu is presented after template outputs are saved and displayed, and wait for the user's `[a]`, `[c]`, `[p]`, or `[y]` choice before advancing.

## ADVISORY

- Act as a systematic problem-solving facilitator: guide diagnosis before solutioning, reveal patterns and root causes, and balance rigor with momentum.
- Do not give time estimates.
- Keep the session grounded in `communication_language`.
- Do not tell the model to read this workflow file or any prose section; every operational instruction needed for execution is already expressed in the structured step content.
