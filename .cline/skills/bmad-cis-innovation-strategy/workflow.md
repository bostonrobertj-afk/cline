---
name: bmad-cis-innovation-strategy
description: 'Identify disruption opportunities and architect business model innovation. Use when the user says "lets create an innovation strategy" or "I want to find disruption opportunities"'
standalone: true
main_config: '{project-root}/_bmad/cis/config.yaml'
---

# workflow

## META

- Goal: Identify disruption opportunities and architect business model innovation through rigorous market analysis, option development, and execution planning.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Establish strategic context">
  <action>Understand the strategic situation and objectives:</action>
  <action>Load any context data provided via the data attribute.</action>
  <action>Synthesize into clear strategic framing.</action>
  <ask>Ask the user:</ask>
  <ask>What company or business are we analyzing?</ask>
  <ask>What's driving this strategic exploration? (market pressure, new opportunity, plateau, etc.)</ask>
  <ask>What's your current business model in brief?</ask>
  <ask>What constraints or boundaries exist? (resources, timeline, regulatory)</ask>
  <ask>What would breakthrough success look like?</ask>
  <template-output>company_name</template-output>
  <template-output>strategic_focus</template-output>
  <template-output>current_situation</template-output>
  <template-output>strategic_challenge</template-output>
</step>

<step n="2" goal="Analyze market landscape and competitive dynamics">
  <action>Review market analysis frameworks from {innovation_frameworks_file} (category: market_analysis) and select 2-4 most relevant to the strategic context. Consider:</action>
  <action>Stage of business (startup vs established)</action>
  <action>Industry maturity</action>
  <action>Available market data</action>
  <action>Strategic priorities</action>
  <action>TAM SAM SOM Analysis - For sizing opportunity</action>
  <ask>Offer selected frameworks with guidance on what each reveals. Common options:</ask>
  <ask>What market segments exist and how are they evolving?</ask>
  <ask>Who are the real competitors (including non-obvious ones)?</ask>
  <ask>What substitutes threaten your value proposition?</ask>
  <ask>What's changing in the market that creates opportunity or threat?</ask>
  <ask>Where are customers underserved or overserved?</ask>
  <output>Conduct thorough market analysis using strategic frameworks. Explain in your own voice why unflinching clarity about market realities must precede innovation exploration.</output>
  <template-output>market_landscape</template-output>
  <template-output>competitive_dynamics</template-output>
  <template-output>market_opportunities</template-output>
  <template-output>market_insights</template-output>
</step>

<step n="3" goal="Analyze current business model">
  <action>Review business model frameworks from {innovation_frameworks_file} (category: business_model) and select 2-3 appropriate for the business type. Consider:</action>
  <action>Business maturity (early stage vs mature)</action>
  <action>Complexity of model</action>
  <action>Key strategic questions</action>
  <action>Offer selected frameworks. Common options:</action>
  <action>Business Model Canvas - For comprehensive mapping</action>
  <ask>Who are you really serving and what jobs are they hiring you for?</ask>
  <ask>How do you create, deliver, and capture value today?</ask>
  <ask>What's your defensible competitive advantage (be honest)?</ask>
  <ask>Where is your model vulnerable to disruption?</ask>
  <ask>What assumptions underpin your model that might be wrong?</ask>
  <output>Deconstruct the existing business model to identify strengths and weaknesses. Explain in your own voice why understanding current model vulnerabilities is essential before innovation.</output>
  <template-output>current_business_model</template-output>
  <template-output>value_proposition</template-output>
  <template-output>revenue_cost_structure</template-output>
  <template-output>model_weaknesses</template-output>
</step>

<step n="4" goal="Identify disruption opportunities">
  <action>Review disruption frameworks from {innovation_frameworks_file} (category: disruption) and select 2-3 most applicable. Consider:</action>
  <action>Industry disruption potential</action>
  <action>Customer job analysis needs</action>
  <action>Platform opportunity existence</action>
  <action>Offer selected frameworks with context. Common options:</action>
  <action>Disruptive Innovation Theory - For finding overlooked segments</action>
  <ask>Hunt for disruption vectors and strategic openings. Explain in your own voice what makes disruption different from incremental innovation.</ask>
  <ask>Who are the NON-consumers you could serve?</ask>
  <ask>What customer jobs are massively underserved?</ask>
  <ask>What would be &quot;good enough&quot; for a new segment?</ask>
  <ask>What technology enablers create sudden strategic openings?</ask>
  <ask>Where could you make the competition irrelevant?</ask>
  <template-output>disruption_vectors</template-output>
  <template-output>unmet_jobs</template-output>
  <template-output>technology_enablers</template-output>
  <template-output>strategic_whitespace</template-output>
</step>

<step n="5" goal="Generate innovation opportunities">
  <action>Review strategic and value_chain frameworks from {innovation_frameworks_file} (categories: strategic, value_chain) and select 2-4 that fit the strategic context. Consider:</action>
  <action>Innovation ambition (core vs transformational)</action>
  <action>Value chain position</action>
  <action>Partnership opportunities</action>
  <action>Offer selected frameworks. Common options:</action>
  <action>Three Horizons Framework - For portfolio balance</action>
  <ask>Value chain innovations (what activities you own)</ask>
  <output>Develop concrete innovation options across multiple vectors. Explain in your own voice the importance of exploring multiple innovation paths before committing.</output>
  <template-output>innovation_initiatives</template-output>
  <template-output>business_model_innovation</template-output>
  <template-output>value_chain_opportunities</template-output>
  <template-output>partnership_opportunities</template-output>
</step>

<step n="6" goal="Develop and evaluate strategic options">
  <action>Synthesize insights into 3 distinct strategic options.</action>
  <action>For each option:</action>
  <action>Clear description of strategic direction</action>
  <action>Business model implications</action>
  <action>Competitive positioning</action>
  <action>Resource requirements</action>
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

<step n="7" goal="Recommend strategic direction">
  <action>Make bold recommendation with clear rationale.</action>
  <action>Synthesize into recommended strategy:</action>
  <action>Define critical success factors:</action>
  <ask>Which option (or combination) is recommended?</ask>
  <ask>Why this direction over alternatives?</ask>
  <ask>What makes you confident (and what scares you)?</ask>
  <ask>What hypotheses MUST be validated first?</ask>
  <ask>What would cause you to pivot or abandon?</ask>
  <ask>What capabilities must be built or acquired?</ask>
  <template-output>recommended_strategy</template-output>
  <template-output>key_hypotheses</template-output>
  <template-output>success_factors</template-output>
</step>

<step n="8" goal="Build execution roadmap">
  <action>Create phased roadmap with clear milestones.</action>
  <action>Structure in three phases:</action>
  <action>Phase 1 - Immediate Impact: Quick wins, hypothesis validation, initial momentum</action>
  <action>Phase 2 - Foundation Building: Capability development, market entry, systematic growth</action>
  <action>Phase 3 - Scale &amp; Optimization: Market expansion, efficiency gains, competitive positioning</action>
  <action>For each phase:</action>
  <template-output>phase_1</template-output>
  <template-output>phase_2</template-output>
  <template-output>phase_3</template-output>
</step>

<step n="9" goal="Define metrics and risk mitigation">
  <action>Establish measurement framework and risk management.</action>
  <action>Define success metrics:</action>
  <action>Leading indicators - Early signals of strategy working (engagement, adoption, efficiency)</action>
  <action>Lagging indicators - Business outcomes (revenue, market share, profitability)</action>
  <action>Decision gates - Go/no-go criteria at key milestones</action>
  <action>Identify and mitigate key risks:</action>
  <ask>What could kill this strategy?</ask>
  <ask>What assumptions might be wrong?</ask>
  <ask>What competitive responses could occur?</ask>
  <ask>How do we de-risk systematically?</ask>
  <ask>What's our backup plan?</ask>
  <template-output>leading_indicators</template-output>
  <template-output>lagging_indicators</template-output>
  <template-output>decision_gates</template-output>
  <template-output>key_risks</template-output>
  <template-output>risk_mitigation</template-output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Use the prose block below for the full agent-facing guidance that complements the structured execution steps.

## REFERENCE

<prose>
**Goal:** Identify disruption opportunities and architect business model innovation through rigorous market analysis, option development, and execution planning.

**Your Role:** You are a strategic innovation advisor. Demand brutal truth about market realities, challenge assumptions ruthlessly, balance bold vision with pragmatic execution, and never give time estimates.

---

## INITIALIZATION

### Configuration Loading

Load config from `{main_config}` and resolve:

- `output_folder`
- `user_name`
- `communication_language`
- `date` as the system-generated current datetime

### Paths

- `skill_path` = `{project-root}/_bmad/cis/workflows/bmad-cis-innovation-strategy`
- `template_file` = `./template.md`
- `innovation_frameworks_file` = `./innovation-frameworks.csv`
- `default_output_file` = `{output_folder}/innovation-strategy-{date}.md`

### Inputs

- If the caller provides context via the data attribute, load it before Step 1 and use it to ground the session.
- Load and understand the full contents of `{innovation_frameworks_file}` before Step 2.
- Use `{template_file}` as the structure when writing `{default_output_file}`.

### Behavioral Constraints

- Do not give time estimates.
- After every `<template-output>`, immediately save the current artifact to `{default_output_file}`, show a clear checkpoint separator, display the generated content, present options `[a] Advanced Elicitation`, `[c] Continue`, `[p] Party-Mode`, `[y] YOLO`, and wait for the user's response before proceeding.

### Facilitation Principles

- Demand brutal truth about market realities before innovation exploration.
- Challenge assumptions ruthlessly; comfortable illusions kill strategies.
- Balance bold vision with pragmatic execution.
- Focus on sustainable competitive advantage, not clever features.
- Push for evidence-based decisions over hopeful guesses.
- Celebrate strategic clarity when achieved.

---

## EXECUTION

<workflow>

<step n="1" goal="Establish strategic context">
  <action>Understand the strategic situation and objectives:</action>
  <action>Load any context data provided via the data attribute.</action>
  <action>Synthesize into clear strategic framing.</action>
  <ask>Ask the user:</ask>
  <ask>What company or business are we analyzing?</ask>
  <ask>What's driving this strategic exploration? (market pressure, new opportunity, plateau, etc.)</ask>
  <ask>What's your current business model in brief?</ask>
  <ask>What constraints or boundaries exist? (resources, timeline, regulatory)</ask>
  <ask>What would breakthrough success look like?</ask>
  <template-output>company_name</template-output>
  <template-output>strategic_focus</template-output>
  <template-output>current_situation</template-output>
  <template-output>strategic_challenge</template-output>
</step>

<step n="2" goal="Analyze market landscape and competitive dynamics">
  <action>Review market analysis frameworks from {innovation_frameworks_file} (category: market_analysis) and select 2-4 most relevant to the strategic context. Consider:</action>
  <action>Stage of business (startup vs established)</action>
  <action>Industry maturity</action>
  <action>Available market data</action>
  <action>Strategic priorities</action>
  <action>TAM SAM SOM Analysis - For sizing opportunity</action>
  <ask>Offer selected frameworks with guidance on what each reveals. Common options:</ask>
  <ask>What market segments exist and how are they evolving?</ask>
  <ask>Who are the real competitors (including non-obvious ones)?</ask>
  <ask>What substitutes threaten your value proposition?</ask>
  <ask>What's changing in the market that creates opportunity or threat?</ask>
  <ask>Where are customers underserved or overserved?</ask>
  <output>Conduct thorough market analysis using strategic frameworks. Explain in your own voice why unflinching clarity about market realities must precede innovation exploration.</output>
  <template-output>market_landscape</template-output>
  <template-output>competitive_dynamics</template-output>
  <template-output>market_opportunities</template-output>
  <template-output>market_insights</template-output>
</step>

<step n="3" goal="Analyze current business model">
  <action>Review business model frameworks from {innovation_frameworks_file} (category: business_model) and select 2-3 appropriate for the business type. Consider:</action>
  <action>Business maturity (early stage vs mature)</action>
  <action>Complexity of model</action>
  <action>Key strategic questions</action>
  <action>Offer selected frameworks. Common options:</action>
  <action>Business Model Canvas - For comprehensive mapping</action>
  <ask>Who are you really serving and what jobs are they hiring you for?</ask>
  <ask>How do you create, deliver, and capture value today?</ask>
  <ask>What's your defensible competitive advantage (be honest)?</ask>
  <ask>Where is your model vulnerable to disruption?</ask>
  <ask>What assumptions underpin your model that might be wrong?</ask>
  <output>Deconstruct the existing business model to identify strengths and weaknesses. Explain in your own voice why understanding current model vulnerabilities is essential before innovation.</output>
  <template-output>current_business_model</template-output>
  <template-output>value_proposition</template-output>
  <template-output>revenue_cost_structure</template-output>
  <template-output>model_weaknesses</template-output>
</step>

<step n="4" goal="Identify disruption opportunities">
  <action>Review disruption frameworks from {innovation_frameworks_file} (category: disruption) and select 2-3 most applicable. Consider:</action>
  <action>Industry disruption potential</action>
  <action>Customer job analysis needs</action>
  <action>Platform opportunity existence</action>
  <action>Offer selected frameworks with context. Common options:</action>
  <action>Disruptive Innovation Theory - For finding overlooked segments</action>
  <ask>Hunt for disruption vectors and strategic openings. Explain in your own voice what makes disruption different from incremental innovation.</ask>
  <ask>Who are the NON-consumers you could serve?</ask>
  <ask>What customer jobs are massively underserved?</ask>
  <ask>What would be &quot;good enough&quot; for a new segment?</ask>
  <ask>What technology enablers create sudden strategic openings?</ask>
  <ask>Where could you make the competition irrelevant?</ask>
  <template-output>disruption_vectors</template-output>
  <template-output>unmet_jobs</template-output>
  <template-output>technology_enablers</template-output>
  <template-output>strategic_whitespace</template-output>
</step>

<step n="5" goal="Generate innovation opportunities">
  <action>Review strategic and value_chain frameworks from {innovation_frameworks_file} (categories: strategic, value_chain) and select 2-4 that fit the strategic context. Consider:</action>
  <action>Innovation ambition (core vs transformational)</action>
  <action>Value chain position</action>
  <action>Partnership opportunities</action>
  <action>Offer selected frameworks. Common options:</action>
  <action>Three Horizons Framework - For portfolio balance</action>
  <ask>Value chain innovations (what activities you own)</ask>
  <output>Develop concrete innovation options across multiple vectors. Explain in your own voice the importance of exploring multiple innovation paths before committing.</output>
  <template-output>innovation_initiatives</template-output>
  <template-output>business_model_innovation</template-output>
  <template-output>value_chain_opportunities</template-output>
  <template-output>partnership_opportunities</template-output>
</step>

<step n="6" goal="Develop and evaluate strategic options">
  <action>Synthesize insights into 3 distinct strategic options.</action>
  <action>For each option:</action>
  <action>Clear description of strategic direction</action>
  <action>Business model implications</action>
  <action>Competitive positioning</action>
  <action>Resource requirements</action>
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

<step n="7" goal="Recommend strategic direction">
  <action>Make bold recommendation with clear rationale.</action>
  <action>Synthesize into recommended strategy:</action>
  <action>Define critical success factors:</action>
  <ask>Which option (or combination) is recommended?</ask>
  <ask>Why this direction over alternatives?</ask>
  <ask>What makes you confident (and what scares you)?</ask>
  <ask>What hypotheses MUST be validated first?</ask>
  <ask>What would cause you to pivot or abandon?</ask>
  <ask>What capabilities must be built or acquired?</ask>
  <template-output>recommended_strategy</template-output>
  <template-output>key_hypotheses</template-output>
  <template-output>success_factors</template-output>
</step>

<step n="8" goal="Build execution roadmap">
  <action>Create phased roadmap with clear milestones.</action>
  <action>Structure in three phases:</action>
  <action>Phase 1 - Immediate Impact: Quick wins, hypothesis validation, initial momentum</action>
  <action>Phase 2 - Foundation Building: Capability development, market entry, systematic growth</action>
  <action>Phase 3 - Scale &amp; Optimization: Market expansion, efficiency gains, competitive positioning</action>
  <action>For each phase:</action>
  <template-output>phase_1</template-output>
  <template-output>phase_2</template-output>
  <template-output>phase_3</template-output>
</step>

<step n="9" goal="Define metrics and risk mitigation">
  <action>Establish measurement framework and risk management.</action>
  <action>Define success metrics:</action>
  <action>Leading indicators - Early signals of strategy working (engagement, adoption, efficiency)</action>
  <action>Lagging indicators - Business outcomes (revenue, market share, profitability)</action>
  <action>Decision gates - Go/no-go criteria at key milestones</action>
  <action>Identify and mitigate key risks:</action>
  <ask>What could kill this strategy?</ask>
  <ask>What assumptions might be wrong?</ask>
  <ask>What competitive responses could occur?</ask>
  <ask>How do we de-risk systematically?</ask>
  <ask>What's our backup plan?</ask>
  <template-output>leading_indicators</template-output>
  <template-output>lagging_indicators</template-output>
  <template-output>decision_gates</template-output>
  <template-output>key_risks</template-output>
  <template-output>risk_mitigation</template-output>
</step>

</workflow>
</prose>
