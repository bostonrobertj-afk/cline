---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
---

# step 04 ux alignment

## META

- Goal: To check if UX documentation exists and validate that it aligns with PRD requirements and Architecture decisions, ensuring architecture accounts for both PRD and UX needs.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Initialize UX Validation">
  <action>Check if UX documentation exists</action>
  <action>If UX exists: validate alignment with PRD and Architecture</action>
  <action>If no UX: determine if UX is implied and document warning&quot;</action>
</step>

<step n="2" goal="Search for UX Documentation">
  <action>{planning_artifacts}/ux.md (whole document)</action>
  <action>{planning_artifacts}/ux/index.md (sharded)</action>
  <action>Look for UI-related terms in other documents</action>
</step>

<step n="3" goal="If UX Document Exists">
  <action>Check UX requirements reflected in PRD</action>
  <action>Verify user journeys in UX match PRD use cases</action>
  <action>Identify UX requirements not in PRD</action>
  <action>Verify architecture supports UX requirements</action>
  <action>Check performance needs (responsiveness, load times)</action>
</step>

<step n="4" goal="If No UX Document">
  <ask>Does PRD mention user interface?</ask>
  <ask>Are there web/mobile components implied?</ask>
  <ask>Is this a user-facing application?</ask>
</step>

<step n="5" goal="Add Findings to Report">
  <output>Append to {outputFile}:</output>
</step>

<step n="6" goal="Auto-Proceed to Next Step">
  <action>After UX assessment complete, immediately load next step.</action>
  <action>## PROCEEDING TO EPIC QUALITY REVIEW UX alignment assessment complete.</action>
  <output>Read fully and follow: ./step-05-epic-quality-review.md ---</output>
</step>

## CHECKPOINT

Complete the current required actions in order before moving to the next workflow phase.

## ADVISORY

- Next handoff: ./step-05-epic-quality-review.md

## REFERENCE

<prose>
## STEP GOAL:

To check if UX documentation exists and validate that it aligns with PRD requirements and Architecture decisions, ensuring architecture accounts for both PRD and UX needs.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Role Reinforcement:

- ✅ You are a UX VALIDATOR ensuring user experience is properly addressed
- ✅ UX requirements must be supported by architecture
- ✅ Missing UX documentation is a warning if UI is implied
- ✅ Alignment gaps must be documented

### Step-Specific Rules:

- 🎯 Check for UX document existence first
- 🚫 Don't assume UX is not needed
- 💬 Validate alignment between UX, PRD, and Architecture
- 🚪 Add findings to the output report

## EXECUTION PROTOCOLS:

- 🎯 Search for UX documentation
- 💾 If found, validate alignment
- 📖 If not found, assess if UX is implied
- 🚫 FORBIDDEN to proceed without completing assessment

## UX ALIGNMENT PROCESS:

### 1. Initialize UX Validation

"Beginning **UX Alignment** validation.

I will:

1. Check if UX documentation exists
2. If UX exists: validate alignment with PRD and Architecture
3. If no UX: determine if UX is implied and document warning"

### 2. Search for UX Documentation

Search patterns:

- `{planning_artifacts}/*ux*.md` (whole document)
- `{planning_artifacts}/*ux*/index.md` (sharded)
- Look for UI-related terms in other documents

### 3. If UX Document Exists

#### A. UX ↔ PRD Alignment

- Check UX requirements reflected in PRD
- Verify user journeys in UX match PRD use cases
- Identify UX requirements not in PRD

#### B. UX ↔ Architecture Alignment

- Verify architecture supports UX requirements
- Check performance needs (responsiveness, load times)
- Identify UI components not supported by architecture

### 4. If No UX Document

Assess if UX/UI is implied:

- Does PRD mention user interface?
- Are there web/mobile components implied?
- Is this a user-facing application?

If UX implied but missing: Add warning to report

### 5. Add Findings to Report

Append to {outputFile}:

```markdown
## UX Alignment Assessment

### UX Document Status

[Found/Not Found]

### Alignment Issues

[List any misalignments between UX, PRD, and Architecture]

### Warnings

[Any warnings about missing UX or architectural gaps]
```

### 6. Auto-Proceed to Next Step

After UX assessment complete, immediately load next step.

## PROCEEDING TO EPIC QUALITY REVIEW

UX alignment assessment complete. Read fully and follow: `./step-05-epic-quality-review.md`

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- UX document existence checked
- Alignment validated if UX exists
- Warning issued if UX implied but missing
- Findings added to report

### ❌ SYSTEM FAILURE:

- Not checking for UX document
- Ignoring alignment issues
- Not documenting warnings
</prose>
