# step 01b continue

## META

- Goal: continue
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Analyze Current Document State">
  <action>stepsCompleted: What steps have been done</action>
  <action>inputDocuments: What documents were loaded</action>
  <action>lastStep: Last step that was executed</action>
  <action>project_name, user_name, date: Basic context</action>
  <action>What sections exist in the document</action>
</step>

<step n="2" goal="Present Continuation Summary">
  <action>Steps completed:</action>
  <action>Last step worked on: Step</action>
  <action>Input documents loaded: files</action>
  <action>{areas that appear incomplete or have placeholders}</action>
</step>

<step n="3" goal="Handle User Choice">
  <action>Identify the next step based on stepsCompleted</action>
  <action>Load the appropriate step file to continue</action>
  <action>Example: If stepsCompleted: [1, 2, 3], load ./step-04-decisions.md</action>
  <action>Analyze the document content to determine logical next step</action>
  <action>May need to review content quality and completeness</action>
  <ask>Let user choose which step to work on</ask>
  <ask>Confirm: &quot;This will delete all existing architectural decisions. Are you sure? (y/n)&quot;</ask>
  <output>If confirmed: Delete existing document and read fully and follow: ./step-01-init.md</output>
  <output>If not confirmed: Return to continuation menu</output>
</step>

<step n="4" goal="Navigate to Selected Step">
  <action>Update frontmatter lastStep to reflect current navigation</action>
  <action>Execute the selected step file</action>
  <action>Let that step handle the detailed continuation logic</action>
  <action>Maintain all existing content in the document</action>
  <action>Keep stepsCompleted accurate</action>
</step>

<step n="5" goal="Special Continuation Cases">
  <action>This suggests an interrupted workflow</action>
  <action>./step-02-context.md</action>
  <action>./step-03-starter.md</action>
  <action>./step-04-decisions.md</action>
  <action>./step-05-patterns.md</action>
  <ask>Ask user: &quot;I see the document has content but no steps are marked as complete. Should I analyze what's here and set the appropriate step status?&quot;</ask>
  <ask>Ask user: &quot;The document seems incomplete. Would you like me to try to recover what's here, or would you prefer to start fresh?&quot;</ask>
  <ask>Ask user: &quot;The architecture looks complete! Should I mark this workflow as finished, or is there more you'd like to work on?&quot;</ask>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./step-01-init.md
- Persist workflow state updates whenever this phase writes or updates a managed artifact.

## REFERENCE

<prose>
## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER generate content without user input

- 📖 CRITICAL: ALWAYS read the complete step file before taking any action - partial understanding leads to incomplete decisions
- 🔄 CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ✅ ALWAYS treat this as collaborative discovery between architectural peers
- 📋 YOU ARE A FACILITATOR, not a content generator
- 💬 FOCUS on understanding current state and getting user confirmation
- 🚪 HANDLE workflow resumption smoothly and transparently
- ⚠️ ABSOLUTELY NO TIME ESTIMATES - AI development speed has fundamentally changed
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

## EXECUTION PROTOCOLS:

- 🎯 Show your analysis before taking any action
- 📖 Read existing document completely to understand current state
- 💾 Update frontmatter to reflect continuation
- 🚫 FORBIDDEN to proceed to next step without user confirmation

## CONTEXT BOUNDARIES:

- Existing document and frontmatter are available
- Input documents already loaded should be in frontmatter `inputDocuments`
- Steps already completed are in `stepsCompleted` array
- Focus on understanding where we left off

## YOUR TASK:

Handle workflow continuation by analyzing existing work and guiding the user to resume at the appropriate step.

## CONTINUATION SEQUENCE:

### 1. Analyze Current Document State

Read the existing architecture document completely and analyze:

**Frontmatter Analysis:**

- `stepsCompleted`: What steps have been done
- `inputDocuments`: What documents were loaded
- `lastStep`: Last step that was executed
- `project_name`, `user_name`, `date`: Basic context

**Content Analysis:**

- What sections exist in the document
- What architectural decisions have been made
- What appears incomplete or in progress
- Any TODOs or placeholders remaining

### 2. Present Continuation Summary

Show the user their current progress:

"Welcome back {{user_name}}! I found your Architecture work for {{project_name}}.

**Current Progress:**

- Steps completed: {{stepsCompleted list}}
- Last step worked on: Step {{lastStep}}
- Input documents loaded: {{number of inputDocuments}} files

**Document Sections Found:**
{list all H2/H3 sections found in the document}

{if_incomplete_sections}
**Incomplete Areas:**

- {areas that appear incomplete or have placeholders}
  {/if_incomplete_sections}

**What would you like to do?**
[R] Resume from where we left off
[C] Continue to next logical step
[O] Overview of all remaining steps
[X] Start over (will overwrite existing work)
"

### 3. Handle User Choice

#### If 'R' (Resume from where we left off):

- Identify the next step based on `stepsCompleted`
- Load the appropriate step file to continue
- Example: If `stepsCompleted: [1, 2, 3]`, load `./step-04-decisions.md`

#### If 'C' (Continue to next logical step):

- Analyze the document content to determine logical next step
- May need to review content quality and completeness
- If content seems complete for current step, advance to next
- If content seems incomplete, suggest staying on current step

#### If 'O' (Overview of all remaining steps):

- Provide brief description of all remaining steps
- Let user choose which step to work on
- Don't assume sequential progression is always best

#### If 'X' (Start over):

- Confirm: "This will delete all existing architectural decisions. Are you sure? (y/n)"
- If confirmed: Delete existing document and read fully and follow: `./step-01-init.md`
- If not confirmed: Return to continuation menu

### 4. Navigate to Selected Step

After user makes choice:

**Load the selected step file:**

- Update frontmatter `lastStep` to reflect current navigation
- Execute the selected step file
- Let that step handle the detailed continuation logic

**State Preservation:**

- Maintain all existing content in the document
- Keep `stepsCompleted` accurate
- Track the resumption in workflow status

### 5. Special Continuation Cases

#### If `stepsCompleted` is empty but document has content:

- This suggests an interrupted workflow
- Ask user: "I see the document has content but no steps are marked as complete. Should I analyze what's here and set the appropriate step status?"

#### If document appears corrupted or incomplete:

- Ask user: "The document seems incomplete. Would you like me to try to recover what's here, or would you prefer to start fresh?"

#### If document is complete but workflow not marked as done:

- Ask user: "The architecture looks complete! Should I mark this workflow as finished, or is there more you'd like to work on?"

## SUCCESS METRICS:

✅ Existing document state properly analyzed and understood
✅ User presented with clear continuation options
✅ User choice handled appropriately and transparently
✅ Workflow state preserved and updated correctly
✅ Navigation to appropriate step handled smoothly

## FAILURE MODES:

❌ Not reading the complete existing document before making suggestions
❌ Losing track of what steps were actually completed
❌ Automatically proceeding without user confirmation of next steps
❌ Not checking for incomplete or placeholder content
❌ Losing existing document content during resumption

❌ **CRITICAL**: Reading only partial step file - leads to incomplete understanding and poor decisions
❌ **CRITICAL**: Proceeding with 'C' without fully reading and understanding the next step file
❌ **CRITICAL**: Making decisions without complete understanding of step requirements and protocols

## NEXT STEP:

After user selects their continuation option, load the appropriate step file based on their choice. The step file will handle the detailed work from that point forward.

Valid step files to load:
- `./step-02-context.md`
- `./step-03-starter.md`
- `./step-04-decisions.md`
- `./step-05-patterns.md`
- `./step-06-structure.md`
- `./step-07-validation.md`
- `./step-08-complete.md`

Remember: The goal is smooth, transparent resumption that respects the work already done while giving the user control over how to proceed.
</prose>
