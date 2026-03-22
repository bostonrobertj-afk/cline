---
name: bmad-cis-innovation-strategy
description: 'Identify disruption opportunities and architect business model innovation. Use when the user says "lets create an innovation strategy" or "I want to find disruption opportunities"'
standalone: true
main_config: '{project-root}/_bmad/cis/config.yaml'
---

# workflow

## META

- Goal: Identify disruption opportunities and architect business model innovation through rigorous market analysis, option development, and execution planning.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Establish the strategic context">
  <branch if="context data was provided with the invocation" optional="true">
    <action>Load the provided context data before beginning the strategy session.</action>
  </branch>
  <ask>Ask what company or business is being analyzed, what is driving the exploration, what the current business model is, what constraints exist, and what breakthrough success would look like.</ask>
  <output>Synthesize the answers into a clear strategic framing.</output>
  <template-output>company_name</template-output>
  <template-output>strategic_focus</template-output>
  <template-output>current_situation</template-output>
  <template-output>strategic_challenge</template-output>
</step>

<step n="2" goal="Analyze market landscape and competitive dynamics">
  <action>Load `{innovation_frameworks_file}` and select two to four market-analysis frameworks that fit the business context.</action>
  <detail>Choose frameworks based on business stage, industry maturity, strategic priorities, and the kind of market evidence available.</detail>
  <ask>Ask what market segments exist, who the real competitors and substitutes are, what is changing in the market, and where customers are underserved or overserved.</ask>
  <output>Conduct rigorous market analysis before moving into innovation exploration.</output>
  <template-output>market_landscape</template-output>
  <template-output>competitive_dynamics</template-output>
  <template-output>market_opportunities</template-output>
  <template-output>market_insights</template-output>
</step>

<step n="3" goal="Deconstruct the current business model">
  <action>Select two to three business-model frameworks that fit the situation.</action>
  <ask>Ask who the business is really serving, how it creates and captures value today, what its defensible advantage is, where the model is vulnerable, and which assumptions may be wrong.</ask>
  <output>Surface strengths, weaknesses, and vulnerabilities in the current model.</output>
  <template-output>current_business_model</template-output>
  <template-output>value_proposition</template-output>
  <template-output>revenue_cost_structure</template-output>
  <template-output>model_weaknesses</template-output>
</step>

<step n="4" goal="Identify disruption opportunities">
  <action>Select disruption frameworks that fit the industry and strategic context.</action>
  <ask>Ask who the non-consumers are, what jobs are underserved, what would be good enough for overlooked segments, what technology enablers matter, and where the business could make current competition irrelevant.</ask>
  <detail>Keep the distinction between true disruption and incremental improvement explicit throughout this phase.</detail>
  <template-output>disruption_vectors</template-output>
  <template-output>unmet_jobs</template-output>
  <template-output>technology_enablers</template-output>
  <template-output>strategic_whitespace</template-output>
</step>

<step n="5" goal="Generate innovation opportunities across multiple vectors">
  <action>Select strategic and value-chain frameworks that fit the ambition level and partnership landscape.</action>
  <ask>Explore business-model innovation, value-chain shifts, partnership opportunities, and multiple innovation horizons before converging.</ask>
  <output>Develop several concrete innovation initiatives rather than a single prematurely chosen path.</output>
  <template-output>innovation_initiatives</template-output>
  <template-output>business_model_innovation</template-output>
  <template-output>value_chain_opportunities</template-output>
  <template-output>partnership_opportunities</template-output>
</step>

<step n="6" goal="Develop and evaluate distinct strategic options">
  <action>Synthesize the insights into three distinct strategic options.</action>
  <detail>Each option should include a clear strategic direction, business-model implications, competitive position, and resource requirements.</detail>
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
</step>

<step n="7" goal="Recommend a strategic direction">
  <ask>Ask which option or combination is strongest, why it wins over the alternatives, what creates conviction, what creates concern, what hypotheses must be validated first, what would trigger a pivot, and what capabilities must be built or acquired.</ask>
  <output>Make a bold recommendation with clear rationale rather than a hedged summary.</output>
  <template-output>recommended_strategy</template-output>
  <template-output>key_hypotheses</template-output>
  <template-output>success_factors</template-output>
</step>

<step n="8" goal="Build the execution roadmap">
  <action>Create a phased roadmap with immediate-impact, foundation-building, and scale-and-optimization phases.</action>
  <detail>Use the phases to sequence hypothesis validation, capability building, market entry, and scaling work rather than to imply fixed delivery dates.</detail>
  <template-output>phase_1</template-output>
  <template-output>phase_2</template-output>
  <template-output>phase_3</template-output>
</step>

<step n="9" goal="Define metrics, decision gates, and risk mitigation">
  <ask>Ask what could kill the strategy, what assumptions might be wrong, what competitive responses are likely, how the plan can be de-risked, and what the backup plan is.</ask>
  <action>Define leading indicators, lagging indicators, and decision gates.</action>
  <template-output>leading_indicators</template-output>
  <template-output>lagging_indicators</template-output>
  <template-output>decision_gates</template-output>
  <template-output>key_risks</template-output>
  <template-output>risk_mitigation</template-output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- After each `<template-output>`, save the current artifact to `{default_output_file}`, show the generated content, present the checkpoint menu, and wait for the user's response before proceeding.
- Demand clarity about market reality, challenge assumptions, and avoid giving time estimates.
