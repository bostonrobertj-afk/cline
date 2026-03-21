---
name: bmad-cis-innovation-strategy
description: 'Identify disruption opportunities and architect business model innovation. Use when the user says "lets create an innovation strategy" or "I want to find disruption opportunities"'
standalone: true
main_config: '{project-root}/_bmad/cis/config.yaml'
---

# workflow

## META

- Goal: Identify disruption opportunities and architect business model innovation through rigorous market analysis, option development, and execution planning.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Establish strategic context">
  <action>
    Load the core workflow configuration from `{main_config}` and resolve the values needed for this session.
    <detail>
      Resolve:
      - `output_folder`
      - `user_name`
      - `communication_language`
      - `date`
      - `innovation_frameworks_file = ./innovation-frameworks.csv`
      - `template_file = ./template.md`
      - `default_output_file = {output_folder}/innovation-strategy-{date}.md`
    </detail>
  </action>
  <action if="context data was provided with the workflow invocation">
    Load the provided context and use it to ground the strategy session.
    <detail>
      Use the context to inform the market framing, business-model analysis, and innovation opportunity search.
    </detail>
  </action>
  <action>Initialize `{default_output_file}` from `{template_file}` so the strategy artifact is ready to receive structured outputs.</action>
  <output>Frame the session as a strategic innovation exercise that demands brutal market clarity, challenges assumptions ruthlessly, and balances bold vision with pragmatic execution.</output>
  <ask>
    Ask the user the context questions needed to frame the strategic challenge.
    <detail>
      Cover:
      - What company or business are we analyzing?
      - What's driving this strategic exploration, such as market pressure, new opportunity, or plateau?
      - What's the current business model in brief?
      - What constraints or boundaries exist, such as resources, timeline, or regulatory limits?
      - What would breakthrough success look like?
    </detail>
  </ask>
  <action>Synthesize the user's inputs and any provided context into a clear strategic framing.</action>
  <template-output>company_name</template-output>
  <template-output>strategic_focus</template-output>
  <template-output>current_situation</template-output>
  <template-output>strategic_challenge</template-output>
  <action>Save the current artifact state to `{default_output_file}` immediately after generating the strategic-context outputs.</action>
  <output>Show a clear checkpoint separator and display the generated strategic context and challenge framing.</output>
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
    <ask>Ask whether the strategic-context refinements from advanced elicitation should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the strategic-context refinements from party mode should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current strategic framing and continue decisively into market analysis.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current strategic framing and continue to market analysis.</action>
  </branch>
</step>

<step n="2" goal="Analyze market landscape and competitive dynamics">
  <action>
    Load and review market-analysis frameworks from `{innovation_frameworks_file}`.
    <detail>
      Select 2-4 frameworks that fit:
      - stage of business
      - industry maturity
      - available market data
      - strategic priorities
    </detail>
    <detail>
      Common options include:
      - TAM SAM SOM analysis
      - Five Forces analysis
      - competitive positioning mapping
      - market-timing assessment
    </detail>
  </action>
  <output>Explain why unflinching clarity about market realities must precede innovation exploration.</output>
  <output>Offer the selected frameworks with concise guidance about what each reveals.</output>
  <ask>
    Guide the user through the core market and competitive questions.
    <detail>
      Cover:
      - What market segments exist and how are they evolving?
      - Who are the real competitors, including non-obvious ones?
      - What substitutes threaten the value proposition?
      - What's changing in the market that creates opportunity or threat?
      - Where are customers underserved or overserved?
    </detail>
  </ask>
  <template-output>market_landscape</template-output>
  <template-output>competitive_dynamics</template-output>
  <template-output>market_opportunities</template-output>
  <template-output>market_insights</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the market-analysis outputs.</action>
  <output>Show a clear checkpoint separator and display the market landscape, competitive dynamics, and opportunity findings.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the market-analysis refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode market-analysis refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current market analysis and continue decisively into business-model analysis.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current market analysis and continue to business-model analysis.</action>
  </branch>
</step>

<step n="3" goal="Analyze the current business model">
  <ask>
    Check whether the user is ready to examine the current business model with honesty and precision.
    <detail>
      Use a readiness or energy check before moving into business-model deconstruction if needed.
    </detail>
  </ask>
  <action>
    Load and review business-model frameworks from `{innovation_frameworks_file}`.
    <detail>
      Select 2-3 frameworks that fit:
      - business maturity
      - model complexity
      - the key strategic questions emerging from the earlier analysis
    </detail>
    <detail>
      Common options include:
      - Business Model Canvas
      - Value Proposition Canvas
      - revenue model innovation lenses
      - cost-structure innovation lenses
    </detail>
  </action>
  <output>Explain why understanding the current model's strengths, weaknesses, and vulnerabilities is essential before innovation work.</output>
  <ask>
    Guide the user through business-model deconstruction.
    <detail>
      Cover:
      - Who are you really serving and what jobs are they hiring you for?
      - How do you create, deliver, and capture value today?
      - What's your defensible competitive advantage?
      - Where is your model vulnerable to disruption?
      - What assumptions underpin your model that might be wrong?
    </detail>
  </ask>
  <template-output>current_business_model</template-output>
  <template-output>value_proposition</template-output>
  <template-output>revenue_cost_structure</template-output>
  <template-output>model_weaknesses</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the business-model outputs.</action>
  <output>Show a clear checkpoint separator and display the business-model findings and vulnerability analysis.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the business-model refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode business-model refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current business-model analysis and continue decisively into disruption opportunity discovery.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current business-model analysis and continue to disruption opportunity discovery.</action>
  </branch>
</step>

<step n="4" goal="Identify disruption opportunities">
  <action>
    Load and review disruption-oriented frameworks from `{innovation_frameworks_file}`.
    <detail>
      Select 2-3 frameworks that fit:
      - industry disruption potential
      - customer-job analysis needs
      - platform or network-effect opportunity
    </detail>
    <detail>
      Common options include:
      - Disruptive Innovation Theory
      - Jobs to Be Done
      - Blue Ocean Strategy
      - Platform Revolution
    </detail>
  </action>
  <output>Explain what makes disruption different from incremental innovation and why the goal is to find strategic openings that meaningfully change the game.</output>
  <ask>
    Hunt for disruption vectors and strategic whitespace.
    <detail>
      Cover:
      - Who are the non-consumers you could serve?
      - What customer jobs are massively underserved?
      - What would be "good enough" for a new segment?
      - What technology enablers create sudden strategic openings?
      - Where could you make the competition irrelevant?
    </detail>
  </ask>
  <template-output>disruption_vectors</template-output>
  <template-output>unmet_jobs</template-output>
  <template-output>technology_enablers</template-output>
  <template-output>strategic_whitespace</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the disruption outputs.</action>
  <output>Show a clear checkpoint separator and display the disruption vectors, unmet jobs, and strategic whitespace findings.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the disruption-opportunity refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode disruption refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current disruption findings and continue decisively into innovation-opportunity generation.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current disruption findings and continue to innovation-opportunity generation.</action>
  </branch>
</step>

<step n="5" goal="Generate innovation opportunities">
  <ask>
    Check whether the user is ready to turn the strategic and disruption analysis into concrete innovation opportunities.
    <detail>
      Use a readiness or energy check here if the session has become intense or analytically heavy.
    </detail>
  </ask>
  <action>
    Load and review strategic and value-chain frameworks from `{innovation_frameworks_file}`.
    <detail>
      Select 2-4 frameworks that fit:
      - innovation ambition, from core to transformational
      - value-chain position
      - partnership or ecosystem opportunity
    </detail>
    <detail>
      Common options include:
      - Three Horizons Framework
      - Value Chain Analysis
      - partnership strategy frameworks
      - business model pattern libraries
    </detail>
  </action>
  <output>Explain why it is important to explore multiple innovation paths before committing to one direction.</output>
  <ask>
    Generate concrete innovation opportunities across multiple vectors.
    <detail>
      Aim for 5-10 specific opportunities spanning:
      - business model innovation
      - value-chain innovation
      - partnership and ecosystem opportunities
      - technology-enabled transformation
    </detail>
  </ask>
  <template-output>innovation_initiatives</template-output>
  <template-output>business_model_innovation</template-output>
  <template-output>value_chain_opportunities</template-output>
  <template-output>partnership_opportunities</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the innovation-opportunity outputs.</action>
  <output>Show a clear checkpoint separator and display the innovation-opportunity portfolio produced in this phase.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the innovation-opportunity refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode innovation refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current innovation opportunities and continue decisively into option development.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current innovation opportunities and continue to option development.</action>
  </branch>
</step>

<step n="6" goal="Develop and evaluate strategic options">
  <action>
    Synthesize the earlier insights into 3 distinct strategic options.
    <detail>
      For each option, include:
      - clear description of the strategic direction
      - business-model implications
      - competitive positioning
      - resource requirements
      - key risks and dependencies
      - expected outcomes
    </detail>
  </action>
  <action>
    Evaluate each option with discipline.
    <detail>
      Compare the options on:
      - strategic fit with current and buildable capabilities
      - market timing and readiness
      - competitive defensibility
      - resource feasibility
      - risk-versus-reward profile
    </detail>
  </action>
  <template-output>option_a_name</template-output>
  <template-output>option_a_description</template-output>
  <template-output>option_a_pros</template-output>
  <template-output>option_a_cons</template-output>
  <template-output>option_b_name</template-output>
  <template-output>option_b_description</template-output>
  <template-output>option_b_pros</template-output>
  <template-output>option_b_cons</template-output>
  <template-output>option_c_name</template-output>
  <template-output>option_c_description</template-output>
  <template-output>option_c_pros</template-output>
  <template-output>option_c_cons</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the strategic options.</action>
  <output>Show a clear checkpoint separator and display the three strategic options with their trade-offs.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the option refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode option refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current strategic options and continue decisively into recommendation.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current strategic options and continue to recommendation.</action>
  </branch>
</step>

<step n="7" goal="Recommend a strategic direction">
  <action>
    Make a bold recommendation with clear rationale.
    <detail>
      Address:
      - which option, or combination, is recommended
      - why this direction beats the alternatives
      - what creates confidence
      - what still creates concern
      - which hypotheses must be validated first
      - what would trigger a pivot or abandonment
    </detail>
  </action>
  <action>
    Define the critical success factors for the recommended direction.
    <detail>
      Cover:
      - what capabilities must be built or acquired
      - what partnerships are essential
      - what market conditions must hold
      - what execution excellence is required
    </detail>
  </action>
  <template-output>recommended_strategy</template-output>
  <template-output>key_hypotheses</template-output>
  <template-output>success_factors</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the recommendation outputs.</action>
  <output>Show a clear checkpoint separator and display the recommended strategic direction and its success factors.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the recommendation refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode recommendation refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current recommendation and continue decisively into roadmap planning.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current recommendation and continue to roadmap planning.</action>
  </branch>
</step>

<step n="8" goal="Build the execution roadmap">
  <ask>
    Check whether the user is ready to translate the strategy recommendation into a concrete roadmap.
    <detail>
      Use a brief readiness or energy check before shifting into execution planning if helpful.
    </detail>
  </ask>
  <action>
    Create a phased roadmap with clear milestones.
    <detail>
      Structure the roadmap in three phases:
      - Phase 1: Immediate impact through quick wins, hypothesis validation, and momentum
      - Phase 2: Foundation building through capability development, market entry, and systematic growth
      - Phase 3: Scale and optimization through expansion, efficiency gains, and stronger positioning
    </detail>
    <detail>
      For each phase, specify:
      - key initiatives and deliverables
      - resource requirements
      - success metrics
      - decision gates
    </detail>
  </action>
  <template-output>phase_1</template-output>
  <template-output>phase_2</template-output>
  <template-output>phase_3</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the roadmap outputs.</action>
  <output>Show a clear checkpoint separator and display the three-phase execution roadmap.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the roadmap refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode roadmap refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current roadmap and continue decisively into metrics and risk mitigation.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current roadmap and continue to metrics and risk mitigation.</action>
  </branch>
</step>

<step n="9" goal="Define metrics and risk mitigation">
  <action>
    Establish the measurement framework.
    <detail>
      Define:
      - leading indicators as early signs the strategy is working
      - lagging indicators as business outcomes
      - decision gates as go/no-go checkpoints at key milestones
    </detail>
  </action>
  <ask>
    Identify and mitigate the key risks.
    <detail>
      Cover:
      - What could kill this strategy?
      - What assumptions might be wrong?
      - What competitive responses could occur?
      - How do we de-risk systematically?
      - What's the backup plan?
    </detail>
  </ask>
  <template-output>leading_indicators</template-output>
  <template-output>lagging_indicators</template-output>
  <template-output>decision_gates</template-output>
  <template-output>key_risks</template-output>
  <template-output>risk_mitigation</template-output>
  <action>Save the final artifact state to `{default_output_file}` immediately after generating the metrics and risk outputs.</action>
  <output>Show a clear checkpoint separator and display the metrics framework and risk-mitigation plan.</output>
  <ask>
    Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO before concluding the workflow.
    <detail>
      If the user chooses to continue or proceed in YOLO mode here, treat that as acceptance of the final innovation-strategy outputs for this run.
    </detail>
  </ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the metrics and risk refinements should be incorporated before concluding.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode metrics and risk refinements should be incorporated before concluding.</ask>
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

- Act as a strategic innovation advisor: demand uncomfortable truth about market realities, challenge assumptions ruthlessly, and focus on evidence over hopeful guesses.
- Do not give time estimates.
- Keep the session grounded in `communication_language`.
- Do not tell the model to read this workflow file or any prose section; every operational instruction needed for execution is already expressed in the structured step content.
