---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
epicsFile: '{planning_artifacts}/*epic*.md' # Will be resolved to actual file
---

# step 02 prd analysis

## META

- Goal: To fully read and analyze the PRD document (whole or sharded) to extract all Functional Requirements (FRs) and Non-Functional Requirements (NFRs) for validation against epics coverage.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Initialize PRD Analysis">
  <action>Load the PRD document (whole or sharded)</action>
  <action>Read it completely and thoroughly</action>
  <action>Extract ALL Functional Requirements (FRs)</action>
  <action>Extract ALL Non-Functional Requirements (NFRs)</action>
  <action>Document findings for coverage validation&quot;</action>
</step>

<step n="2" goal="Load and Read PRD">
  <action>Ensure complete coverage - no files skipped</action>
  <output>If whole PRD file exists: Load and read it completely</output>
  <output>If sharded PRD exists: Load and read ALL files in the PRD folder</output>
</step>

<step n="3" goal="Extract Functional Requirements (FRs)">
  <action>Numbered FRs (FR1, FR2, FR3, etc.)</action>
  <action>Requirements labeled &quot;Functional Requirement&quot;</action>
  <action>Business rules that must be implemented</action>
  <output>User stories or use cases that represent functional needs</output>
</step>

<step n="4" goal="Extract Non-Functional Requirements (NFRs)">
  <action>Performance requirements (response times, throughput)</action>
  <action>Security requirements (authentication, encryption, etc.)</action>
  <action>Usability requirements (accessibility, ease of use)</action>
  <action>Reliability requirements (uptime, error rates)</action>
  <action>Scalability requirements (concurrent users, data growth)</action>
</step>

<step n="5" goal="Document Additional Requirements">
  <action>Constraints or assumptions</action>
  <action>Technical requirements not labeled as FR/NFR</action>
  <action>Business constraints</action>
  <action>Integration requirements</action>
</step>

<step n="6" goal="Add to Assessment Report">
  <output>Append to {outputFile}:</output>
</step>

<step n="7" goal="Auto-Proceed to Next Step">
  <action>After PRD analysis complete, immediately load next step for epic coverage validation.</action>
  <action>## PROCEEDING TO EPIC COVERAGE VALIDATION PRD analysis complete.</action>
  <output>Read fully and follow: ./step-03-epic-coverage-validation.md ---</output>
</step>

## CHECKPOINT

Complete the current required actions in order before moving to the next workflow phase.

## ADVISORY

- Next handoff: ./step-03-epic-coverage-validation.md

## REFERENCE

<prose>
## STEP GOAL:

To fully read and analyze the PRD document (whole or sharded) to extract all Functional Requirements (FRs) and Non-Functional Requirements (NFRs) for validation against epics coverage.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Role Reinforcement:

- ✅ You are an expert Product Manager and Scrum Master
- ✅ Your expertise is in requirements analysis and traceability
- ✅ You think critically about requirement completeness
- ✅ Success is measured in thorough requirement extraction

### Step-Specific Rules:

- 🎯 Focus ONLY on reading and extracting from PRD
- 🚫 Don't validate files (done in step 1)
- 💬 Read PRD completely - whole or all sharded files
- 🚪 Extract every FR and NFR with numbering

## EXECUTION PROTOCOLS:

- 🎯 Load and completely read the PRD
- 💾 Extract all requirements systematically
- 📖 Document findings in the report
- 🚫 FORBIDDEN to skip or summarize PRD content

## PRD ANALYSIS PROCESS:

### 1. Initialize PRD Analysis

"Beginning **PRD Analysis** to extract all requirements.

I will:

1. Load the PRD document (whole or sharded)
2. Read it completely and thoroughly
3. Extract ALL Functional Requirements (FRs)
4. Extract ALL Non-Functional Requirements (NFRs)
5. Document findings for coverage validation"

### 2. Load and Read PRD

From the document inventory in step 1:

- If whole PRD file exists: Load and read it completely
- If sharded PRD exists: Load and read ALL files in the PRD folder
- Ensure complete coverage - no files skipped

### 3. Extract Functional Requirements (FRs)

Search for and extract:

- Numbered FRs (FR1, FR2, FR3, etc.)
- Requirements labeled "Functional Requirement"
- User stories or use cases that represent functional needs
- Business rules that must be implemented

Format findings as:

```
## Functional Requirements Extracted

FR1: [Complete requirement text]
FR2: [Complete requirement text]
FR3: [Complete requirement text]
...
Total FRs: [count]
```

### 4. Extract Non-Functional Requirements (NFRs)

Search for and extract:

- Performance requirements (response times, throughput)
- Security requirements (authentication, encryption, etc.)
- Usability requirements (accessibility, ease of use)
- Reliability requirements (uptime, error rates)
- Scalability requirements (concurrent users, data growth)
- Compliance requirements (standards, regulations)

Format findings as:

```
## Non-Functional Requirements Extracted

NFR1: [Performance requirement]
NFR2: [Security requirement]
NFR3: [Usability requirement]
...
Total NFRs: [count]
```

### 5. Document Additional Requirements

Look for:

- Constraints or assumptions
- Technical requirements not labeled as FR/NFR
- Business constraints
- Integration requirements

### 6. Add to Assessment Report

Append to {outputFile}:

```markdown
## PRD Analysis

### Functional Requirements

[Complete FR list from section 3]

### Non-Functional Requirements

[Complete NFR list from section 4]

### Additional Requirements

[Any other requirements or constraints found]

### PRD Completeness Assessment

[Initial assessment of PRD completeness and clarity]
```

### 7. Auto-Proceed to Next Step

After PRD analysis complete, immediately load next step for epic coverage validation.

## PROCEEDING TO EPIC COVERAGE VALIDATION

PRD analysis complete. Read fully and follow: `./step-03-epic-coverage-validation.md`

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- PRD loaded and read completely
- All FRs extracted with full text
- All NFRs identified and documented
- Findings added to assessment report

### ❌ SYSTEM FAILURE:

- Not reading complete PRD (especially sharded versions)
- Missing requirements in extraction
- Summarizing instead of extracting full text
- Not documenting findings in report

**Master Rule:** Complete requirement extraction is essential for traceability validation.
</prose>
