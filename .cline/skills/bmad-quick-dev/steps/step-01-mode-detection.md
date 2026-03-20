---
---

# Step 1: Mode Detection

**Goal:** Determine execution mode, capture baseline, handle escalation if needed.

---

# step 01 mode detection

## META

- Goal: mode detection
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Capture Baseline">
  <action>Run git rev-parse HEAD and store result as {baseline_commit}</action>
  <action>Set {baseline_commit} = &quot;NO_GIT&quot;</action>
  <output>First, check if the project uses Git version control: If Git repo exists (.git directory present or git rev-parse --is-inside-work-tree succeeds): - Run git rev-parse HEAD and store result as {baseline_commit} If NOT a Git repo: - Set {baseline_commit} = &quot;NO_GIT&quot;</output>
</step>

<step n="2" goal="Load Project Context">
  <action>Load Project Context</action>
</step>

<step n="3" goal="Parse User Input">
  <action>User provided a path to a tech-spec file (e.g., quick-dev tech-spec-auth.md)</action>
  <action>Load the spec, extract tasks/context/AC</action>
  <action>Set {execution_mode} = &quot;tech-spec&quot;</action>
  <action>Set {tech_spec_path} = provided path</action>
  <action>NEXT: Read fully and follow: ./step-03-execute.md</action>
  <ask>Analyze the user's input to determine mode: Mode A: Tech-Spec - User provided a path to a tech-spec file (e.g., quick-dev tech-spec-auth.md) - Load the spec, extract tasks/context/AC - Set {execution_mode} = &quot;tech-spec&quot; - Set {tech_spec_path} = provided path - NEXT: Read fully and follow: ./step-03-execute.md Mode B: Direct Instructions - User provided task description directly (e.g., refactor src/foo.ts...) - Set {execution_mode} = &quot;direct&quot; - NEXT: Evaluate escalation threshold, then proceed --- ## ESCALATION THRESHOLD (Mode B only) Evaluate user input with minimal token usage (no file loading): Triggers escalation (if 2+ signals present): - Multiple components mentioned (dashboard + api + database) - System-level language (platform, integration, architecture) - Uncertainty about approach (&quot;how should I&quot;, &quot;best way to&quot;) - Multi-layer scope (UI + backend + data together) - Extended timeframe (&quot;this week&quot;, &quot;over the next few days&quot;) Reduces signal: - Simplicity markers (&quot;just&quot;, &quot;quickly&quot;, &quot;fix&quot;, &quot;bug&quot;, &quot;typo&quot;, &quot;simple&quot;) - Single file/component focus - Confident, specific request Use holistic judgment, not mechanical keyword matching.</ask>
  <ask>- IF E: Ask for any additional guidance, then NEXT: Read fully and follow: ./step-02-context-gathering.md #### EXECUTION RULES: - ALWAYS halt and wait for user input after presenting menu - ONLY proceed when user makes a selection --- ### Escalation Triggered - Level 0-2 Present: &quot;This looks like a focused feature with multiple components.&quot; Display: [P] Plan first (tech-spec) (recommended) [W] Seems bigger than quick-dev - Recommend the Full BMad Flow PRD Process [E] Execute directly #### Menu Handling Logic: - IF P: Direct user to invoke the bmad-quick-spec skill.</ask>
  <output>Analyze the user's input to determine mode: Mode A: Tech-Spec - User provided a path to a tech-spec file (e.g., quick-dev tech-spec-auth.md) - Load the spec, extract tasks/context/AC - Set {execution_mode} = &quot;tech-spec&quot; - Set {tech_spec_path} = provided path - NEXT: Read fully and follow: ./step-03-execute.md Mode B: Direct Instructions - User provided task description directly (e.g., refactor src/foo.ts...) - Set {execution_mode} = &quot;direct&quot; - NEXT: Evaluate escalation threshold, then proceed --- ## ESCALATION THRESHOLD (Mode B only) Evaluate user input with minimal token usage (no file loading): Triggers escalation (if 2+ signals present): - Multiple components mentioned (dashboard + api + database) - System-level language (platform, integration, architecture) - Uncertainty about approach (&quot;how should I&quot;, &quot;best way to&quot;) - Multi-layer scope (UI + backend + data together) - Extended timeframe (&quot;this week&quot;, &quot;over the next few days&quot;) Reduces signal: - Simplicity markers (&quot;just&quot;, &quot;quickly&quot;, &quot;fix&quot;, &quot;bug&quot;, &quot;typo&quot;, &quot;simple&quot;) - Single file/component focus - Confident, specific request Use holistic judgment, not mechanical keyword matching.</output>
  <output>--- ## ESCALATION HANDLING ### No Escalation (simple request) Display: &quot;Select: [P] Plan first (tech-spec) [E] Execute directly&quot; #### Menu Handling Logic: - IF P: Direct user to invoke the bmad-quick-spec skill.</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./step-03-execute.md

## REFERENCE

<prose>
## STATE VARIABLES (capture now, persist throughout)

These variables MUST be set in this step and available to all subsequent steps:

- `{baseline_commit}` - Git HEAD at workflow start (or "NO_GIT" if not a git repo)
- `{execution_mode}` - "tech-spec" or "direct"
- `{tech_spec_path}` - Path to tech-spec file (if Mode A)

---

## EXECUTION SEQUENCE

### 1. Capture Baseline

First, check if the project uses Git version control:

**If Git repo exists** (`.git` directory present or `git rev-parse --is-inside-work-tree` succeeds):

- Run `git rev-parse HEAD` and store result as `{baseline_commit}`

**If NOT a Git repo:**

- Set `{baseline_commit}` = "NO_GIT"

### 2. Load Project Context

Check if `{project_context}` exists (`**/project-context.md`). If found, load it as a foundational reference for ALL implementation decisions.

### 3. Parse User Input

Analyze the user's input to determine mode:

**Mode A: Tech-Spec**

- User provided a path to a tech-spec file (e.g., `quick-dev tech-spec-auth.md`)
- Load the spec, extract tasks/context/AC
- Set `{execution_mode}` = "tech-spec"
- Set `{tech_spec_path}` = provided path
- **NEXT:** Read fully and follow: `./step-03-execute.md`

**Mode B: Direct Instructions**

- User provided task description directly (e.g., `refactor src/foo.ts...`)
- Set `{execution_mode}` = "direct"
- **NEXT:** Evaluate escalation threshold, then proceed

---

## ESCALATION THRESHOLD (Mode B only)

Evaluate user input with minimal token usage (no file loading):

**Triggers escalation (if 2+ signals present):**

- Multiple components mentioned (dashboard + api + database)
- System-level language (platform, integration, architecture)
- Uncertainty about approach ("how should I", "best way to")
- Multi-layer scope (UI + backend + data together)
- Extended timeframe ("this week", "over the next few days")

**Reduces signal:**

- Simplicity markers ("just", "quickly", "fix", "bug", "typo", "simple")
- Single file/component focus
- Confident, specific request

Use holistic judgment, not mechanical keyword matching.

---

## ESCALATION HANDLING

### No Escalation (simple request)

Display: "**Select:** [P] Plan first (tech-spec) [E] Execute directly"

#### Menu Handling Logic:

- IF P: Direct user to invoke the `bmad-quick-spec` skill. **EXIT Quick Dev.**
- IF E: Ask for any additional guidance, then **NEXT:** Read fully and follow: `./step-02-context-gathering.md`

#### EXECUTION RULES:

- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed when user makes a selection

---

### Escalation Triggered - Level 0-2

Present: "This looks like a focused feature with multiple components."

Display:

**[P] Plan first (tech-spec)** (recommended)
**[W] Seems bigger than quick-dev** - Recommend the Full BMad Flow PRD Process
**[E] Execute directly**

#### Menu Handling Logic:

- IF P: Direct user to invoke the `bmad-quick-spec` skill. **EXIT Quick Dev.**
- IF W: Direct user to run the PRD workflow instead. **EXIT Quick Dev.**
- IF E: Ask for guidance, then **NEXT:** Read fully and follow: `./step-02-context-gathering.md`

#### EXECUTION RULES:

- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed when user makes a selection

---

### Escalation Triggered - Level 3+

Present: "This sounds like platform/system work."

Display:

**[W] Start BMad Method** (recommended)
**[P] Plan first (tech-spec)** (lighter planning)
**[E] Execute directly** - feeling lucky

#### Menu Handling Logic:

- IF P: Direct user to invoke the `bmad-quick-spec` skill. **EXIT Quick Dev.**
- IF W: Direct user to run the PRD workflow instead. **EXIT Quick Dev.**
- IF E: Ask for guidance, then **NEXT:** Read fully and follow: `./step-02-context-gathering.md`

#### EXECUTION RULES:

- ALWAYS halt and wait for user input after presenting menu
- ONLY proceed when user makes a selection

---

## NEXT STEP DIRECTIVE

**CRITICAL:** When this step completes, explicitly state which step to load:

- Mode A (tech-spec): "**NEXT:** read fully and follow: `./step-03-execute.md`"
- Mode B (direct, [E] selected): "**NEXT:** Read fully and follow: `./step-02-context-gathering.md`"
- Escalation ([P] or [W]): "**EXITING Quick Dev.** Follow the directed workflow."

---

## SUCCESS METRICS

- `{baseline_commit}` captured and stored
- `{execution_mode}` determined ("tech-spec" or "direct")
- `{tech_spec_path}` set if Mode A
- Project context loaded if exists
- Escalation evaluated appropriately (Mode B)
- Explicit NEXT directive provided

## FAILURE MODES

- Proceeding without capturing baseline commit
- Not setting execution_mode variable
- Loading step-02 when Mode A (tech-spec provided)
- Attempting to "return" after escalation instead of EXIT
- No explicit NEXT directive at step completion
</prose>
