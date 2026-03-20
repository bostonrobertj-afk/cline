---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'

---

# step 05 scope

## META

- Goal: Define MVP scope with clear boundaries and outline future vision through collaborative scope negotiation that balances ambition with realism.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Begin Scope Definition">
  <ask>What's the absolute minimum we need to deliver to solve the core problem?</ask>
  <ask>What features would make users say 'this solves my problem'?</ask>
  <ask>How do we balance ambition with getting something valuable to users quickly?</ask>
</step>

<step n="2" goal="MVP Core Features Definition">
  <action>Solves Core Problem: Addresses the main pain point effectively</action>
  <action>Feasible: Achievable with available resources and timeline</action>
  <action>Testable: Allows learning and iteration based on user feedback</action>
  <ask>&quot;What's the core functionality that must work?&quot;</ask>
  <ask>&quot;Which features directly address the main problem we're solving?&quot;</ask>
  <ask>&quot;What would users consider 'incomplete' if it was missing?&quot;</ask>
  <output>User Value: Creates meaningful outcome for target users</output>
</step>

<step n="3" goal="Out of Scope Boundaries">
  <action>Clear communication about what's not included</action>
  <action>Rationale for deferring certain features</action>
  <action>Timeline considerations for future additions</action>
  <action>Trade-off explanations for stakeholders</action>
  <ask>&quot;What features would be nice to have but aren't essential?&quot;</ask>
  <ask>&quot;What functionality could wait for version 2.0?&quot;</ask>
  <ask>&quot;What are we intentionally saying 'no' to for now?&quot;</ask>
</step>

<step n="4" goal="MVP Success Criteria">
  <action>User adoption metrics</action>
  <action>Problem validation evidence</action>
  <action>Technical feasibility confirmation</action>
  <action>Business model validation</action>
  <ask>&quot;How will we know the MVP is successful?&quot;</ask>
  <ask>&quot;What metrics will indicate we should proceed beyond MVP?&quot;</ask>
  <ask>&quot;What user feedback signals validate our approach?&quot;</ask>
</step>

<step n="5" goal="Future Vision Exploration">
  <action>Post-MVP enhancements that build on core functionality</action>
  <action>Scale considerations and growth capabilities</action>
  <action>Platform or ecosystem expansion opportunities</action>
  <action>Advanced features that differentiate in the long term</action>
  <ask>&quot;If this is wildly successful, what does it become in 2-3 years?&quot;</ask>
  <ask>&quot;What capabilities would we add with more resources?&quot;</ask>
  <ask>&quot;How does the MVP evolve into the full product vision?&quot;</ask>
</step>

<step n="6" goal="Generate MVP Scope Content">
  <output>Content to Append: Prepare the following structure for document append:</output>
</step>

<step n="7" goal="Present MENU OPTIONS">
  <action>IF A: Invoke the bmad-advanced-elicitation skill with current scope content to optimize scope definition</action>
  <action>IF P: Invoke the bmad-party-mode skill to bring different perspectives to validate MVP scope</action>
  <action>ONLY proceed to next step when user selects 'C'</action>
  <ask>User can chat or ask questions - always respond and then end with display again of the menu options</ask>
  <output>IF C: Save content to {outputFile}, update frontmatter with stepsCompleted: [1, 2, 3, 4, 5], then read fully and follow: ./step-06-complete.md</output>
  <output>IF Any other comments or queries: help user respond then Redisplay Menu Options</output>
  <output>ALWAYS halt and wait for user input after presenting menu</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./step-06-complete.md
- Persist workflow state updates whenever this phase writes or updates a managed artifact.

## REFERENCE

<prose>
## STEP GOAL:

Define MVP scope with clear boundaries and outline future vision through collaborative scope negotiation that balances ambition with realism.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`
- ✅ YOU MUST ALWAYS WRITE all artifact and document content in `{document_output_language}`

### Role Reinforcement:

- ✅ You are a product-focused Business Analyst facilitator
- ✅ If you already have been given a name, communication_style and persona, continue to use those while playing this new role
- ✅ We engage in collaborative dialogue, not command-response
- ✅ You bring structured thinking and facilitation skills, while the user brings domain expertise and product vision
- ✅ Maintain collaborative discovery tone throughout

### Step-Specific Rules:

- 🎯 Focus only on defining minimum viable scope and future vision
- 🚫 FORBIDDEN to create MVP scope that's too large or includes non-essential features
- 💬 Approach: Systematic scope negotiation with clear boundary setting
- 📋 COLLABORATIVE scope definition that prevents scope creep

## EXECUTION PROTOCOLS:

- 🎯 Show your analysis before taking any action
- 💾 Generate MVP scope collaboratively with user
- 📖 Update frontmatter `stepsCompleted: [1, 2, 3, 4, 5]` before loading next step
- 🚫 FORBIDDEN to proceed without user confirmation through menu

## CONTEXT BOUNDARIES:

- Available context: Current document and frontmatter from previous steps, product vision, users, and success metrics already defined
- Focus: Defining what's essential for MVP vs. future enhancements
- Limits: Balance user needs with implementation feasibility
- Dependencies: Product vision, user personas, and success metrics from previous steps must be complete

## Sequence of Instructions (Do not deviate, skip, or optimize)

### 1. Begin Scope Definition

**Opening Exploration:**
"Now that we understand what {{project_name}} does, who it serves, and how we'll measure success, let's define what we need to build first.

**Scope Discovery:**

- What's the absolute minimum we need to deliver to solve the core problem?
- What features would make users say 'this solves my problem'?
- How do we balance ambition with getting something valuable to users quickly?

Let's start with the MVP mindset: what's the smallest version that creates real value?"

### 2. MVP Core Features Definition

**MVP Feature Questions:**
Define essential features for minimum viable product:

- "What's the core functionality that must work?"
- "Which features directly address the main problem we're solving?"
- "What would users consider 'incomplete' if it was missing?"
- "What features create the 'aha!' moment we discussed earlier?"

**MVP Criteria:**

- **Solves Core Problem:** Addresses the main pain point effectively
- **User Value:** Creates meaningful outcome for target users
- **Feasible:** Achievable with available resources and timeline
- **Testable:** Allows learning and iteration based on user feedback

### 3. Out of Scope Boundaries

**Out of Scope Exploration:**
Define what explicitly won't be in MVP:

- "What features would be nice to have but aren't essential?"
- "What functionality could wait for version 2.0?"
- "What are we intentionally saying 'no' to for now?"
- "How do we communicate these boundaries to stakeholders?"

**Boundary Setting:**

- Clear communication about what's not included
- Rationale for deferring certain features
- Timeline considerations for future additions
- Trade-off explanations for stakeholders

### 4. MVP Success Criteria

**Success Validation:**
Define what makes the MVP successful:

- "How will we know the MVP is successful?"
- "What metrics will indicate we should proceed beyond MVP?"
- "What user feedback signals validate our approach?"
- "What's the decision point for scaling beyond MVP?"

**Success Gates:**

- User adoption metrics
- Problem validation evidence
- Technical feasibility confirmation
- Business model validation

### 5. Future Vision Exploration

**Vision Questions:**
Define the longer-term product vision:

- "If this is wildly successful, what does it become in 2-3 years?"
- "What capabilities would we add with more resources?"
- "How does the MVP evolve into the full product vision?"
- "What markets or user segments could we expand to?"

**Future Features:**

- Post-MVP enhancements that build on core functionality
- Scale considerations and growth capabilities
- Platform or ecosystem expansion opportunities
- Advanced features that differentiate in the long term

### 6. Generate MVP Scope Content

**Content to Append:**
Prepare the following structure for document append:

```markdown
## MVP Scope

### Core Features

[Core features content based on conversation]

### Out of Scope for MVP

[Out of scope content based on conversation, or N/A if not discussed]

### MVP Success Criteria

[MVP success criteria content based on conversation, or N/A if not discussed]

### Future Vision

[Future vision content based on conversation, or N/A if not discussed]
```

### 7. Present MENU OPTIONS

**Content Presentation:**
"I've defined the MVP scope for {{project_name}} that balances delivering real value with realistic boundaries. This gives us a clear path forward while keeping our options open for future growth.

**Here's what I'll add to the document:**
[Show the complete markdown content from step 6]

**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue"

#### Menu Handling Logic:

- IF A: Invoke the `bmad-advanced-elicitation` skill with current scope content to optimize scope definition
- IF P: Invoke the `bmad-party-mode` skill to bring different perspectives to validate MVP scope
- IF C: Save content to {outputFile}, update frontmatter with stepsCompleted: [1, 2, 3, 4, 5], then read fully and follow: ./step-06-complete.md
- IF Any other comments or queries: help user respond then [Redisplay Menu Options](#7-present-menu-options)

#### EXECUTION RULES:

- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed to next step when user selects 'C'
- After other menu items execution, return to this menu with updated content
- User can chat or ask questions - always respond and then end with display again of the menu options

## CRITICAL STEP COMPLETION NOTE

ONLY WHEN [C continue option] is selected and [MVP scope finalized and saved to document with frontmatter updated], will you then read fully and follow: `./step-06-complete.md` to complete the product brief workflow.

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- MVP features that solve the core problem effectively
- Clear out-of-scope boundaries that prevent scope creep
- Success criteria that validate MVP approach and inform go/no-go decisions
- Future vision that inspires while maintaining focus on MVP
- A/P/C menu presented and handled correctly with proper task execution
- Content properly appended to document when C selected
- Frontmatter updated with stepsCompleted: [1, 2, 3, 4, 5]

### ❌ SYSTEM FAILURE:

- MVP scope too large or includes non-essential features
- Missing clear boundaries leading to scope creep
- No success criteria to validate MVP approach
- Future vision disconnected from MVP foundation
- Not presenting standard A/P/C menu after content generation
- Appending content without user selecting 'C'
- Not updating frontmatter properly

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
</prose>
