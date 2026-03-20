---
# File references (ONLY variables used in this step)
prdFile: '{prd_file_path}'
prdPurpose: '{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-prd/data/prd-purpose.md'
---

# step e 01b legacy conversion

## META

- Goal: Analyze legacy PRD against BMAD standards, identify gaps, propose conversion strategy, and let user choose how to proceed.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Attempt Sub-Process Assessment">
  <action>Content gaps in each section</action>
  <action>Overall conversion effort: Quick / Moderate / Substantial</action>
  <action>Recommended approach: Full restructuring vs targeted improvements</action>
  <action>Manually check PRD for each BMAD section</action>
  <action>Estimate conversion effort</action>
  <ask>Does PRD have this section? (Executive Summary, Success Criteria, Product Scope, User Journeys, Functional Requirements, Non-Functional Requirements)</ask>
  <ask>If present: Is it complete and well-structured?</ask>
  <ask>If missing: What content exists that could migrate to this section?</ask>
  <output>Effort to create/complete: Minimal / Moderate / Significant</output>
  <output>Core sections present: {count}/6</output>
  <output>Note what's present and what's missing</output>
</step>

<step n="2" goal="Build Gap Analysis">
  <action>Gap: [what's missing or incomplete]</action>
  <action>Effort to Complete: [Minimal/Moderate/Significant]</action>
  <action>Total Conversion Effort: [Quick/Moderate/Substantial]</action>
  <action>Recommended: [Full restructuring / Targeted improvements]</action>
  <output>Present: [Yes/No/Partial]</output>
  <output>Sections Present: {count}/6</output>
</step>

<step n="3" goal="Present Conversion Assessment">
  <output>Core sections present: {count}/6</output>
</step>

<step n="4" goal="Present MENU OPTIONS">
  <action>ALWAYS halt and wait for user input</action>
  <action>Only proceed based on user selection</action>
  <action>IF R (Restructure): Note conversion mode, then load next step</action>
  <action>IF I (Targeted): Note targeted mode, then load next step</action>
  <action>IF E (Edit &amp; Restructure): Note both mode, then load next step</action>
  <output>IF X (Exit): Display summary, exit</output>
</step>

<step n="5" goal="Document Conversion Strategy">
  <action>Conversion mode: [Full restructuring / Targeted improvements / Both]</action>
  <action>Edit requirements: [user's requirements from step e-01]</action>
  <action>Gap analysis: [summary of gaps identified]</action>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./step-e-02-review.md

## REFERENCE

<prose>
## STEP GOAL:

Analyze legacy PRD against BMAD standards, identify gaps, propose conversion strategy, and let user choose how to proceed.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Role Reinforcement:

- ✅ You are a Validation Architect and PRD Improvement Specialist
- ✅ If you already have been given communication or persona patterns, continue to use those while playing this new role
- ✅ We engage in collaborative dialogue, not command-response
- ✅ You bring BMAD standards expertise and conversion guidance
- ✅ User brings domain knowledge and edit requirements

### Step-Specific Rules:

- 🎯 Focus ONLY on conversion assessment and proposal
- 🚫 FORBIDDEN to perform conversion yet (that comes in edit step)
- 💬 Approach: Analytical gap analysis with clear recommendations
- 🚪 This is a branch step - user chooses conversion path

## EXECUTION PROTOCOLS:

- 🎯 Analyze legacy PRD against BMAD standard
- 💾 Identify gaps and estimate conversion effort
- 📖 Present conversion options with effort estimates
- 🚫 FORBIDDEN to proceed without user selection

## CONTEXT BOUNDARIES:

- Available context: Legacy PRD, user's edit requirements, prd-purpose standards
- Focus: Conversion assessment only (not actual conversion)
- Limits: Don't convert yet, don't validate yet
- Dependencies: Step e-01 detected legacy format and routed here

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Attempt Sub-Process Assessment

**Try to use Task tool with sub-agent:**

"Perform legacy PRD conversion assessment:

**Load the PRD and prd-purpose.md**

**For each BMAD PRD section, analyze:**
1. Does PRD have this section? (Executive Summary, Success Criteria, Product Scope, User Journeys, Functional Requirements, Non-Functional Requirements)
2. If present: Is it complete and well-structured?
3. If missing: What content exists that could migrate to this section?
4. Effort to create/complete: Minimal / Moderate / Significant

**Identify:**
- Core sections present: {count}/6
- Content gaps in each section
- Overall conversion effort: Quick / Moderate / Substantial
- Recommended approach: Full restructuring vs targeted improvements

Return conversion assessment with gap analysis and effort estimate."

**Graceful degradation (if no Task tool):**
- Manually check PRD for each BMAD section
- Note what's present and what's missing
- Estimate conversion effort
- Identify best conversion approach

### 2. Build Gap Analysis

**For each BMAD core section:**

**Executive Summary:**
- Present: [Yes/No/Partial]
- Gap: [what's missing or incomplete]
- Effort to Complete: [Minimal/Moderate/Significant]

**Success Criteria:**
- Present: [Yes/No/Partial]
- Gap: [what's missing or incomplete]
- Effort to Complete: [Minimal/Moderate/Significant]

**Product Scope:**
- Present: [Yes/No/Partial]
- Gap: [what's missing or incomplete]
- Effort to Complete: [Minimal/Moderate/Significant]

**User Journeys:**
- Present: [Yes/No/Partial]
- Gap: [what's missing or incomplete]
- Effort to Complete: [Minimal/Moderate/Significant]

**Functional Requirements:**
- Present: [Yes/No/Partial]
- Gap: [what's missing or incomplete]
- Effort to Complete: [Minimal/Moderate/Significant]

**Non-Functional Requirements:**
- Present: [Yes/No/Partial]
- Gap: [what's missing or incomplete]
- Effort to Complete: [Minimal/Moderate/Significant]

**Overall Assessment:**
- Sections Present: {count}/6
- Total Conversion Effort: [Quick/Moderate/Substantial]
- Recommended: [Full restructuring / Targeted improvements]

### 3. Present Conversion Assessment

Display:

"**Legacy PRD Conversion Assessment**

**Current PRD Structure:**
- Core sections present: {count}/6
{List which sections are present/missing}

**Gap Analysis:**

{Present gap analysis table showing each section's status and effort}

**Overall Conversion Effort:** {effort level}

**Your Edit Goals:**
{Reiterate user's stated edit requirements}

**Recommendation:**
{Based on effort and user goals, recommend best approach}

**How would you like to proceed?**"

### 4. Present MENU OPTIONS

**[R] Restructure to BMAD** - Full conversion to BMAD format, then apply your edits
**[I] Targeted Improvements** - Apply your edits to existing structure without restructuring
**[E] Edit & Restructure** - Do both: convert format AND apply your edits
**[X] Exit** - Review assessment and decide

#### EXECUTION RULES:

- ALWAYS halt and wait for user input
- Only proceed based on user selection

#### Menu Handling Logic:

- IF R (Restructure): Note conversion mode, then load next step
- IF I (Targeted): Note targeted mode, then load next step
- IF E (Edit & Restructure): Note both mode, then load next step
- IF X (Exit): Display summary, exit

### 5. Document Conversion Strategy

Store conversion decision for next step:

- **Conversion mode:** [Full restructuring / Targeted improvements / Both]
- **Edit requirements:** [user's requirements from step e-01]
- **Gap analysis:** [summary of gaps identified]

Display: "**Conversion Strategy Documented**

Mode: {conversion mode}
Edit goals: {summary}

**Proceeding to deep review...**"

Read fully and follow: `./step-e-02-review.md`

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All 6 BMAD core sections analyzed for gaps
- Effort estimates provided for each section
- Overall conversion effort assessed correctly
- Clear recommendation provided based on effort and user goals
- User chooses conversion strategy (restructure/targeted/both)
- Conversion strategy documented for next step

### ❌ SYSTEM FAILURE:

- Not analyzing all 6 core sections
- Missing effort estimates
- Not providing clear recommendation
- Auto-proceeding without user selection
- Not documenting conversion strategy

**Master Rule:** Legacy PRDs need conversion assessment so users understand the work involved and can choose the best approach.
</prose>
