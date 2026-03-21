---
# File references (ONLY variables used in this step)
prdFile: '{prd_file_path}'
prdPurpose: '{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-prd/data/prd-purpose.md'
---

# step e 03 edit

## META

- Goal: Apply changes to the PRD following the approved change plan from step e-02, including content updates, structure improvements, and format conversion if needed.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Retrieve Approved Change Plan">
  <action>Approved changes: Section-by-section list</action>
  <action>Priority order: Sequence to apply changes</action>
  <action>User requirements: Edit goals from step e-01</action>
</step>

<step n="2" goal="Attempt Sub-Process Edits (For Complex Changes)">
  <action>Read current PRD section</action>
  <action>Apply specified changes</action>
  <action>Ensure BMAD PRD principles compliance:</action>
  <action>Section to edit: {section_name}</action>
  <action>Current content: {existing content}</action>
  <output>Return updated section content</output>
  <output>Load PRD section, apply changes, save</output>
</step>

<step n="3" goal="Execute Changes Section-by-Section">
  <action>Read the current PRD section content</action>
  <action>Note what exists</action>
  <action>Updates: Modify existing content per plan</action>
  <action>Removals: Remove specified content</action>
  <action>Restructuring: Reformat content to BMAD standard</action>
  <output>Additions: Create new sections with proper content</output>
  <output>Save updated PRD</output>
</step>

<step n="4" goal="Handle Restructuring (If Needed)">
  <action>Executive Summary</action>
  <action>Success Criteria</action>
  <action>Product Scope</action>
  <action>User Journeys</action>
  <action>Domain Requirements (if applicable)</action>
</step>

<step n="5" goal="Update PRD Frontmatter">
  <action>Ensure frontmatter is complete and accurate: Update frontmatter accordingly.</action>
</step>

<step n="6" goal="Final Review of Changes">
  <action>All approved changes applied correctly</action>
  <action>PRD structure is sound</action>
  <action>No unintended modifications</action>
  <action>Frontmatter is accurate</action>
  <action>Fix them now</action>
</step>

<step n="7" goal="Confirm Completion">
  <action>Use in downstream workflows (UX, Architecture)</action>
  <action>Validation (if not yet validated)</action>
</step>

<step n="8" goal="Present MENU OPTIONS">
  <action>ALWAYS halt and wait for user input</action>
  <action>Only proceed based on user selection</action>
  <action>IF A (Adjust): Accept additional requirements, loop back to editing</action>
  <output>IF V (Validate): Display &quot;Starting validation workflow...&quot; then read fully and follow: ./steps-v/step-v-01-discovery.md</output>
  <output>IF S (Summary): Present edit summary and exit</output>
  <output>IF X (Exit): Display summary and exit</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./steps-v/step-v-01-discovery.md
- Persist workflow state updates whenever this phase writes or updates a managed artifact.

## REFERENCE

<prose>
## STEP GOAL:

Apply changes to the PRD following the approved change plan from step e-02, including content updates, structure improvements, and format conversion if needed.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 ALWAYS generate content WITH user input/approval
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`
- ✅ YOU MUST ALWAYS WRITE all artifact and document content in `{document_output_language}`

### Role Reinforcement:

- ✅ You are a Validation Architect and PRD Improvement Specialist
- ✅ If you already have been given communication or persona patterns, continue to use those while playing this new role
- ✅ We engage in collaborative dialogue, not command-response
- ✅ You bring analytical expertise and precise editing skills
- ✅ User brings domain knowledge and approval authority

### Step-Specific Rules:

- 🎯 Focus ONLY on implementing approved changes from step e-02
- 🚫 FORBIDDEN to make changes beyond the approved plan
- 💬 Approach: Methodical, section-by-section execution
- 🚪 This is a middle step - user can request adjustments

## EXECUTION PROTOCOLS:

- 🎯 Follow approved change plan systematically
- 💾 Edit PRD content according to plan
- 📖 Update frontmatter as needed
- 🚫 FORBIDDEN to proceed without completion

## CONTEXT BOUNDARIES:

- Available context: PRD file, approved change plan from step e-02, prd-purpose standards
- Focus: Implementing changes from approved plan only
- Limits: Don't add changes beyond plan, don't validate yet
- Dependencies: Step e-02 completed - plan approved by user

## MANDATORY SEQUENCE

**CRITICAL:** Follow this sequence exactly. Do not skip, reorder, or improvise unless user explicitly requests a change.

### 1. Retrieve Approved Change Plan

From step e-02, retrieve:
- **Approved changes:** Section-by-section list
- **Priority order:** Sequence to apply changes
- **User requirements:** Edit goals from step e-01

Display: "**Starting PRD Edits**

**Change Plan:** {summary}
**Total Changes:** {count}
**Estimated Effort:** {effort level}

**Proceeding with edits section by section...**"

### 2. Attempt Sub-Process Edits (For Complex Changes)

**Try to use Task tool with sub-agent for major sections:**

"Execute PRD edits for {section_name}:

**Context:**
- Section to edit: {section_name}
- Current content: {existing content}
- Changes needed: {specific changes from plan}
- BMAD PRD standards: Load from prd-purpose.md

**Tasks:**
1. Read current PRD section
2. Apply specified changes
3. Ensure BMAD PRD principles compliance:
   - High information density (no filler)
   - Measurable requirements
   - Clear structure
   - Proper markdown formatting
4. Return updated section content

Apply changes and return updated section."

**Graceful degradation (if no Task tool):**
- Perform edits directly in current context
- Load PRD section, apply changes, save

### 3. Execute Changes Section-by-Section

**For each section in approved plan (in priority order):**

**a) Load current section**
- Read the current PRD section content
- Note what exists

**b) Apply changes per plan**
- Additions: Create new sections with proper content
- Updates: Modify existing content per plan
- Removals: Remove specified content
- Restructuring: Reformat content to BMAD standard

**c) Update PRD file**
- Apply changes to PRD
- Save updated PRD
- Verify changes applied correctly

**Display progress after each section:**
"**Section Updated:** {section_name}
Changes: {brief summary}
{More sections remaining...}"

### 4. Handle Restructuring (If Needed)

**If conversion mode is "Full restructuring" or "Both":**

**For restructuring:**
- Reorganize PRD to BMAD standard structure
- Ensure proper ## Level 2 headers
- Reorder sections logically
- Update PRD frontmatter to match BMAD format

**Follow BMAD PRD structure:**
1. Executive Summary
2. Success Criteria
3. Product Scope
4. User Journeys
5. Domain Requirements (if applicable)
6. Innovation Analysis (if applicable)
7. Project-Type Requirements
8. Functional Requirements
9. Non-Functional Requirements

Display: "**PRD Restructured**
BMAD standard structure applied.
{Sections added/reordered}"

### 5. Update PRD Frontmatter

**Ensure frontmatter is complete and accurate:**

```yaml
---
workflowType: 'prd'
workflow: 'create'  # or 'validate' or 'edit'
classification:
  domain: '{domain}'
  projectType: '{project_type}'
  complexity: '{complexity}'
inputDocuments: [list of input documents]
stepsCompleted: ['step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit']
lastEdited: '{current_date}'
editHistory:
  - date: '{current_date}'
    changes: '{summary of changes}'
---
```

**Update frontmatter accordingly.**

### 6. Final Review of Changes

**Load complete updated PRD**

**Verify:**
- All approved changes applied correctly
- PRD structure is sound
- No unintended modifications
- Frontmatter is accurate

**If issues found:**
- Fix them now
- Note corrections made

**If user wants adjustments:**
- Accept feedback and make adjustments
- Re-verify after adjustments

### 7. Confirm Completion

Display:

"**PRD Edits Complete**

**Changes Applied:** {count} sections modified
**PRD Updated:** {prd_file_path}

**Summary of Changes:**
{Brief bullet list of major changes}

**PRD is ready for:**
- Use in downstream workflows (UX, Architecture)
- Validation (if not yet validated)

**What would you like to do next?**"

### 8. Present MENU OPTIONS

**[V] Run Validation** - Execute full validation workflow (./steps-v/step-v-01-discovery.md)
**[S] Summary Only** - End with summary of changes (no validation)
**[A] Adjust** - Make additional edits
**[X] Exit** - Exit edit workflow

#### EXECUTION RULES:

- ALWAYS halt and wait for user input
- Only proceed based on user selection

#### Menu Handling Logic:

- IF V (Validate): Display "Starting validation workflow..." then read fully and follow: `./steps-v/step-v-01-discovery.md`
- IF S (Summary): Present edit summary and exit
- IF A (Adjust): Accept additional requirements, loop back to editing
- IF X (Exit): Display summary and exit

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All approved changes from step e-02 applied correctly
- Changes executed in planned priority order
- Restructuring completed (if needed)
- Frontmatter updated accurately
- Final verification confirms changes
- User can proceed to validation or exit with summary
- Option to run validation seamlessly integrates edit and validate modes

### ❌ SYSTEM FAILURE:

- Making changes beyond approved plan
- Not following priority order
- Missing restructuring (if conversion mode)
- Not updating frontmatter
- No final verification
- Not saving updated PRD

**Master Rule:** Execute the plan exactly as approved. PRD is now ready for validation or downstream use. Validation integration ensures quality.
</prose>
