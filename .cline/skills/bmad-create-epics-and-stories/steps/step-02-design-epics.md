# step 02 design epics

## META

- Goal: To design and get approval for the epics_list that will organize all requirements into user-value-focused epics.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Review Extracted Requirements">
  <action>Functional Requirements: Count and review FRs from Step 1</action>
  <action>Non-Functional Requirements: Review NFRs that need to be addressed</action>
  <action>Additional Requirements: Review technical and UX requirements</action>
</step>

<step n="2" goal="Explain Epic Design Principles">
  <action>User-Value First: Each epic must enable users to accomplish something meaningful</action>
  <action>Requirements Grouping: Group related FRs that deliver cohesive user outcomes</action>
  <action>Incremental Delivery: Each epic should deliver value independently</action>
  <action>Logical Flow: Natural progression from user's perspective</action>
  <action>🔗 Dependency-Free Within Epic: Stories within an epic must NOT depend on future stories</action>
  <output>Epic 2: Content Creation (users can create, edit, publish content) - Standalone: Uses auth, creates content</output>
  <output>Epic 1: Database Setup (creates all tables upfront) - No user value</output>
  <output>Epic 3: Frontend Components (creates reusable components) - No user value</output>
</step>

<step n="3" goal="Design Epic Structure Collaboratively">
  <action>Epic Title: User-centric, value-focused</action>
  <action>User Outcome: What users can accomplish after this epic</action>
  <action>Implementation Notes: Any technical or UX considerations</action>
  <action>Look for natural groupings in the FRs</action>
  <action>Identify user journeys or workflows</action>
  <ask>FR Coverage: Which FR numbers this epic addresses</ask>
</step>

<step n="4" goal="Present Epic List for Review">
  <action>Total number of epics</action>
  <action>FR coverage per epic</action>
  <action>User value delivered by each epic</action>
  <action>Any natural dependencies</action>
</step>

<step n="5" goal="Create Requirements Coverage Map">
  <output>Create showing how each FR maps to an epic: This ensures no FRs are missed.</output>
</step>

<step n="6" goal="Collaborative Refinement">
  <ask>&quot;Does this epic structure align with your product vision?&quot;</ask>
  <ask>&quot;Are all user outcomes properly captured?&quot;</ask>
  <ask>&quot;Should we adjust any epic groupings?&quot;</ask>
</step>

<step n="7" goal="Get Final Approval">
  <action>Replace placeholder with the approved epic list</action>
  <action>Replace with the coverage map</action>
  <action>Ensure all FRs are mapped to epics</action>
  <action>Make the requested adjustments</action>
  <action>Update the epics_list</action>
  <output>Re-present for approval</output>
</step>

<step n="8" goal="Present MENU OPTIONS">
  <action>IF A: Invoke the bmad-advanced-elicitation skill</action>
  <action>IF P: Invoke the bmad-party-mode skill</action>
  <action>ONLY proceed to next step when user selects 'C'</action>
  <ask>User can chat or ask questions - always respond when conversation ends, redisplay the menu options</ask>
  <output>IF C: Save approved epics_list to {planning_artifacts}/epics.md, update frontmatter, then read fully and follow: ./step-03-create-stories.md</output>
  <output>IF Any other comments or queries: help user respond then Redisplay Menu Options</output>
  <output>ALWAYS halt and wait for user input after presenting menu</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.

## REFERENCE

<prose>
## STEP GOAL:

To design and get approval for the epics_list that will organize all requirements into user-value-focused epics.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Role Reinforcement:

- ✅ You are a product strategist and technical specifications writer
- ✅ If you already have been given communication or persona patterns, continue to use those while playing this new role
- ✅ We engage in collaborative dialogue, not command-response
- ✅ You bring product strategy and epic design expertise
- ✅ User brings their product vision and priorities

### Step-Specific Rules:

- 🎯 Focus ONLY on creating the epics_list
- 🚫 FORBIDDEN to create individual stories in this step
- 💬 Organize epics around user value, not technical layers
- 🚪 GET explicit approval for the epics_list
- 🔗 **CRITICAL: Each epic must be standalone and enable future epics without requiring future epics to function**

## EXECUTION PROTOCOLS:

- 🎯 Design epics collaboratively based on extracted requirements
- 💾 Update {{epics_list}} in {planning_artifacts}/epics.md
- 📖 Document the FR coverage mapping
- 🚫 FORBIDDEN to load next step until user approves epics_list

## EPIC DESIGN PROCESS:

### 1. Review Extracted Requirements

Load {planning_artifacts}/epics.md and review:

- **Functional Requirements:** Count and review FRs from Step 1
- **Non-Functional Requirements:** Review NFRs that need to be addressed
- **Additional Requirements:** Review technical and UX requirements

### 2. Explain Epic Design Principles

**EPIC DESIGN PRINCIPLES:**

1. **User-Value First**: Each epic must enable users to accomplish something meaningful
2. **Requirements Grouping**: Group related FRs that deliver cohesive user outcomes
3. **Incremental Delivery**: Each epic should deliver value independently
4. **Logical Flow**: Natural progression from user's perspective
5. **🔗 Dependency-Free Within Epic**: Stories within an epic must NOT depend on future stories

**⚠️ CRITICAL PRINCIPLE:**
Organize by USER VALUE, not technical layers:

**✅ CORRECT Epic Examples (Standalone & Enable Future Epics):**

- Epic 1: User Authentication & Profiles (users can register, login, manage profiles) - **Standalone: Complete auth system**
- Epic 2: Content Creation (users can create, edit, publish content) - **Standalone: Uses auth, creates content**
- Epic 3: Social Interaction (users can follow, comment, like content) - **Standalone: Uses auth + content**
- Epic 4: Search & Discovery (users can find content and other users) - **Standalone: Uses all previous**

**❌ WRONG Epic Examples (Technical Layers or Dependencies):**

- Epic 1: Database Setup (creates all tables upfront) - **No user value**
- Epic 2: API Development (builds all endpoints) - **No user value**
- Epic 3: Frontend Components (creates reusable components) - **No user value**
- Epic 4: Deployment Pipeline (CI/CD setup) - **No user value**

**🔗 DEPENDENCY RULES:**

- Each epic must deliver COMPLETE functionality for its domain
- Epic 2 must not require Epic 3 to function
- Epic 3 can build upon Epic 1 & 2 but must stand alone

### 3. Design Epic Structure Collaboratively

**Step A: Identify User Value Themes**

- Look for natural groupings in the FRs
- Identify user journeys or workflows
- Consider user types and their goals

**Step B: Propose Epic Structure**
For each proposed epic:

1. **Epic Title**: User-centric, value-focused
2. **User Outcome**: What users can accomplish after this epic
3. **FR Coverage**: Which FR numbers this epic addresses
4. **Implementation Notes**: Any technical or UX considerations

**Step C: Create the epics_list**

Format the epics_list as:

```
## Epic List

### Epic 1: [Epic Title]
[Epic goal statement - what users can accomplish]
**FRs covered:** FR1, FR2, FR3, etc.

### Epic 2: [Epic Title]
[Epic goal statement - what users can accomplish]
**FRs covered:** FR4, FR5, FR6, etc.

[Continue for all epics]
```

### 4. Present Epic List for Review

Display the complete epics_list to user with:

- Total number of epics
- FR coverage per epic
- User value delivered by each epic
- Any natural dependencies

### 5. Create Requirements Coverage Map

Create {{requirements_coverage_map}} showing how each FR maps to an epic:

```
### FR Coverage Map

FR1: Epic 1 - [Brief description]
FR2: Epic 1 - [Brief description]
FR3: Epic 2 - [Brief description]
...
```

This ensures no FRs are missed.

### 6. Collaborative Refinement

Ask user:

- "Does this epic structure align with your product vision?"
- "Are all user outcomes properly captured?"
- "Should we adjust any epic groupings?"
- "Are there natural dependencies we've missed?"

### 7. Get Final Approval

**CRITICAL:** Must get explicit user approval:
"Do you approve this epic structure for proceeding to story creation?"

If user wants changes:

- Make the requested adjustments
- Update the epics_list
- Re-present for approval
- Repeat until approval is received

## CONTENT TO UPDATE IN DOCUMENT:

After approval, update {planning_artifacts}/epics.md:

1. Replace {{epics_list}} placeholder with the approved epic list
2. Replace {{requirements_coverage_map}} with the coverage map
3. Ensure all FRs are mapped to epics

### 8. Present MENU OPTIONS

Display: "**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue"

#### Menu Handling Logic:

- IF A: Invoke the `bmad-advanced-elicitation` skill
- IF P: Invoke the `bmad-party-mode` skill
- IF C: Save approved epics_list to {planning_artifacts}/epics.md, update frontmatter, then read fully and follow: ./step-03-create-stories.md
- IF Any other comments or queries: help user respond then [Redisplay Menu Options](#8-present-menu-options)

#### EXECUTION RULES:

- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed to next step when user selects 'C'
- After other menu items execution completes, redisplay the menu
- User can chat or ask questions - always respond when conversation ends, redisplay the menu options

## CRITICAL STEP COMPLETION NOTE

ONLY WHEN C is selected and the approved epics_list is saved to document, will you then read fully and follow: ./step-03-create-stories.md to begin story creation step.

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- Epics designed around user value
- All FRs mapped to specific epics
- epics_list created and formatted correctly
- Requirements coverage map completed
- User gives explicit approval for epic structure
- Document updated with approved epics

### ❌ SYSTEM FAILURE:

- Epics organized by technical layers
- Missing FRs in coverage map
- No user approval obtained
- epics_list not saved to document

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
</prose>
