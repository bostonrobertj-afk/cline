# step 04 emotional response

## META

- Goal: emotional response
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Explore Core Emotional Goals">
  <ask>What should users FEEL when using this product?</ask>
  <ask>What emotion would make them tell a friend about this?</ask>
  <ask>How should users feel after accomplishing their primary goal?</ask>
</step>

<step n="2" goal="Identify Emotional Journey Mapping">
  <ask>How should users feel when they first discover the product?</ask>
  <ask>What emotion during the core experience/action?</ask>
  <ask>How should they feel after completing their task?</ask>
</step>

<step n="3" goal="Define Micro-Emotions">
  <action>Confidence vs. Confusion</action>
  <action>Trust vs. Skepticism</action>
  <action>Excitement vs. Anxiety</action>
  <action>Accomplishment vs. Frustration</action>
  <action>Delight vs. Satisfaction</action>
</step>

<step n="4" goal="Connect Emotions to UX Decisions">
  <action>[Emotion 1] → [UX design approach]</action>
  <action>[Emotion 2] → [UX design approach]</action>
  <action>[Emotion 3] → [UX design approach]&quot;</action>
  <ask>If we want users to feel [emotional state], what UX choices support this?</ask>
  <ask>What interactions might create negative emotions we want to avoid?</ask>
  <ask>Where can we add moments of delight or surprise?</ask>
</step>

<step n="5" goal="Validate Emotional Goals">
  <ask>Check if emotional goals align with product vision: &quot;Let me make sure I understand the emotional vision for : Primary Emotional Goal: [Summarize main emotional response] Secondary Feelings: [List supporting emotional states] Emotions to Avoid: [List negative emotions to prevent] Does this capture the emotional experience you want to create?</ask>
  <ask>Any adjustments needed?&quot;</ask>
</step>

<step n="6" goal="Generate Emotional Response Content">
  <output>Prepare the content to append to the document: #### Content Structure: When saving to document, append these Level 2 and Level 3 sections:</output>
</step>

<step n="7" goal="Present Content and Menu">
  <ask>Here's what I'll add to the document: [Show the complete markdown content from step 6] What would you like to do?</ask>
  <output>Show the generated emotional response content and present choices: &quot;I've defined the desired emotional responses for .</output>
  <output>These emotional goals will guide our design decisions to create the right user experience.</output>
  <output>[A] Advanced Elicitation - Let's refine the emotional response definition [P] Party Mode - Bring different perspectives on user emotional needs [C] Continue - Save this to the document and move to inspiration analysis&quot;</output>
</step>

<step n="8" goal="Handle Menu Selection">
  <action>Invoke the bmad-advanced-elicitation skill with the current emotional response content</action>
  <action>Process the enhanced emotional insights that come back</action>
  <action>Invoke the bmad-party-mode skill with the current emotional response definition</action>
  <action>Process the collaborative emotional insights that come back</action>
  <action>Load ./step-05-inspiration.md</action>
  <ask>Ask user: &quot;Accept these improvements to the emotional response definition? (y/n)&quot;</ask>
  <ask>Ask user: &quot;Accept these changes to the emotional response definition? (y/n)&quot;</ask>
  <output>If yes: Update content with improvements, then return to A/P/C menu</output>
  <output>If no: Keep original content, then return to A/P/C menu</output>
  <output>Append the final content to {planning_artifacts}/ux-design-specification.md</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.

## REFERENCE

<prose>
## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER generate content without user input

- 📖 CRITICAL: ALWAYS read the complete step file before taking any action - partial understanding leads to incomplete decisions
- 🔄 CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ✅ ALWAYS treat this as collaborative discovery between UX facilitator and stakeholder
- 📋 YOU ARE A UX FACILITATOR, not a content generator
- 💬 FOCUS on defining desired emotional responses and user feelings
- 🎯 COLLABORATIVE discovery, not assumption-based design
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`
- ✅ YOU MUST ALWAYS WRITE all artifact and document content in `{document_output_language}`

## EXECUTION PROTOCOLS:

- 🎯 Show your analysis before taking any action
- ⚠️ Present A/P/C menu after generating emotional response content
- 💾 ONLY save when user chooses C (Continue)
- 📖 Update output file frontmatter, adding this step to the end of the list of stepsCompleted.
- 🚫 FORBIDDEN to load next step until C is selected

## COLLABORATION MENUS (A/P/C):

This step will generate content and present choices:

- **A (Advanced Elicitation)**: Use discovery protocols to develop deeper emotional insights
- **P (Party Mode)**: Bring multiple perspectives to define optimal emotional responses
- **C (Continue)**: Save the content to the document and proceed to next step

## PROTOCOL INTEGRATION:

- When 'A' selected: Invoke the `bmad-advanced-elicitation` skill
- When 'P' selected: Invoke the `bmad-party-mode` skill
- PROTOCOLS always return to this step's A/P/C menu
- User accepts/rejects protocol changes before proceeding

## CONTEXT BOUNDARIES:

- Current document and frontmatter from previous steps are available
- Core experience definition from step 3 informs emotional response
- No additional data files needed for this step
- Focus on user feelings and emotional design goals

## YOUR TASK:

Define the desired emotional responses users should feel when using the product.

## EMOTIONAL RESPONSE DISCOVERY SEQUENCE:

### 1. Explore Core Emotional Goals

Start by understanding the emotional objectives:
"Now let's think about how {{project_name}} should make users feel.

**Emotional Response Questions:**

- What should users FEEL when using this product?
- What emotion would make them tell a friend about this?
- How should users feel after accomplishing their primary goal?
- What feeling differentiates this from competitors?

Common emotional goals: Empowered and in control? Delighted and surprised? Efficient and productive? Creative and inspired? Calm and focused? Connected and engaged?"

### 2. Identify Emotional Journey Mapping

Explore feelings at different stages:
"**Emotional Journey Considerations:**

- How should users feel when they first discover the product?
- What emotion during the core experience/action?
- How should they feel after completing their task?
- What if something goes wrong - what emotional response do we want?
- How should they feel when returning to use it again?"

### 3. Define Micro-Emotions

Surface subtle but important emotional states:
"**Micro-Emotions to Consider:**

- Confidence vs. Confusion
- Trust vs. Skepticism
- Excitement vs. Anxiety
- Accomplishment vs. Frustration
- Delight vs. Satisfaction
- Belonging vs. Isolation

Which of these emotional states are most critical for your product's success?"

### 4. Connect Emotions to UX Decisions

Link feelings to design implications:
"**Design Implications:**

- If we want users to feel [emotional state], what UX choices support this?
- What interactions might create negative emotions we want to avoid?
- Where can we add moments of delight or surprise?
- How do we build trust and confidence through design?

**Emotion-Design Connections:**

- [Emotion 1] → [UX design approach]
- [Emotion 2] → [UX design approach]
- [Emotion 3] → [UX design approach]"

### 5. Validate Emotional Goals

Check if emotional goals align with product vision:
"Let me make sure I understand the emotional vision for {{project_name}}:

**Primary Emotional Goal:** [Summarize main emotional response]
**Secondary Feelings:** [List supporting emotional states]
**Emotions to Avoid:** [List negative emotions to prevent]

Does this capture the emotional experience you want to create? Any adjustments needed?"

### 6. Generate Emotional Response Content

Prepare the content to append to the document:

#### Content Structure:

When saving to document, append these Level 2 and Level 3 sections:

```markdown
## Desired Emotional Response

### Primary Emotional Goals

[Primary emotional goals based on conversation]

### Emotional Journey Mapping

[Emotional journey mapping based on conversation]

### Micro-Emotions

[Micro-emotions identified based on conversation]

### Design Implications

[UX design implications for emotional responses based on conversation]

### Emotional Design Principles

[Guiding principles for emotional design based on conversation]
```

### 7. Present Content and Menu

Show the generated emotional response content and present choices:
"I've defined the desired emotional responses for {{project_name}}. These emotional goals will guide our design decisions to create the right user experience.

**Here's what I'll add to the document:**

[Show the complete markdown content from step 6]

**What would you like to do?**
[A] Advanced Elicitation - Let's refine the emotional response definition
[P] Party Mode - Bring different perspectives on user emotional needs
[C] Continue - Save this to the document and move to inspiration analysis"

### 8. Handle Menu Selection

#### If 'A' (Advanced Elicitation):

- Invoke the `bmad-advanced-elicitation` skill with the current emotional response content
- Process the enhanced emotional insights that come back
- Ask user: "Accept these improvements to the emotional response definition? (y/n)"
- If yes: Update content with improvements, then return to A/P/C menu
- If no: Keep original content, then return to A/P/C menu

#### If 'P' (Party Mode):

- Invoke the `bmad-party-mode` skill with the current emotional response definition
- Process the collaborative emotional insights that come back
- Ask user: "Accept these changes to the emotional response definition? (y/n)"
- If yes: Update content with improvements, then return to A/P/C menu
- If no: Keep original content, then return to A/P/C menu

#### If 'C' (Continue):

- Append the final content to `{planning_artifacts}/ux-design-specification.md`
- Update frontmatter: append step to end of stepsCompleted array
- Load `./step-05-inspiration.md`

## APPEND TO DOCUMENT:

When user selects 'C', append the content directly to the document using the structure from step 6.

## SUCCESS METRICS:

✅ Primary emotional goals clearly defined
✅ Emotional journey mapped across user experience
✅ Micro-emotions identified and addressed
✅ Design implications connected to emotional responses
✅ Emotional design principles established
✅ A/P/C menu presented and handled correctly
✅ Content properly appended to document when C selected

## FAILURE MODES:

❌ Missing core emotional goals or being too generic
❌ Not considering emotional journey across different stages
❌ Overlooking micro-emotions that impact user satisfaction
❌ Not connecting emotional goals to specific UX design choices
❌ Emotional principles too vague or not actionable
❌ Not presenting A/P/C menu after content generation
❌ Appending content without user selecting 'C'

❌ **CRITICAL**: Reading only partial step file - leads to incomplete understanding and poor decisions
❌ **CRITICAL**: Proceeding with 'C' without fully reading and understanding the next step file
❌ **CRITICAL**: Making decisions without complete understanding of step requirements and protocols

## NEXT STEP:

After user selects 'C' and content is saved to document, load `./step-05-inspiration.md` to analyze UX patterns from inspiring products.

Remember: Do NOT proceed to step-05 until user explicitly selects 'C' from the A/P/C menu and content is saved!
</prose>
