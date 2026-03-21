---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
epicsFile: '{planning_artifacts}/*epic*.md' # Will be resolved to actual file
---

# step 02 prd analysis

## META

- Goal: fully read the selected PRD and extract all functional, non-functional, and supporting requirements needed for downstream validation.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Load and read the selected PRD completely">
  <action>
    Load the PRD selected during document discovery.
    <detail>
      If the confirmed PRD is a whole document, read it completely.
      If the confirmed PRD is sharded, read every file in the PRD shard set completely.
    </detail>
  </action>
  <action>Ensure no confirmed PRD file is skipped.</action>
</step>

<step n="2" goal="Extract all functional requirements from the PRD">
  <action>
    Extract every functional requirement from the PRD.
    <detail>
      Include:
      - numbered FRs such as `FR1`, `FR2`, `FR3`
      - requirements explicitly labeled as functional requirements
      - user stories or use cases that define functional behavior
      - business rules that must be implemented
    </detail>
  </action>
  <output>Produce a complete FR list with the full requirement text and a total FR count.</output>
</step>

<step n="3" goal="Extract all non-functional requirements from the PRD">
  <action>
    Extract every non-functional requirement from the PRD.
    <detail>
      Include:
      - performance requirements
      - security requirements
      - usability or accessibility requirements
      - reliability requirements
      - scalability requirements
      - compliance requirements
    </detail>
  </action>
  <output>Produce a complete NFR list with the full requirement text and a total NFR count.</output>
</step>

<step n="4" goal="Capture additional requirements, constraints, and assumptions">
  <action>
    Capture additional requirements and constraints that may affect implementation readiness.
    <detail>
      Include:
      - technical requirements not explicitly labeled as FR or NFR
      - business constraints
      - assumptions
      - integration requirements
    </detail>
  </action>
</step>

<step n="5" goal="Append the PRD analysis to the readiness report">
  <action>
    Append a PRD analysis section to `{outputFile}`.
    <detail>
      Include:
      - the full FR list
      - the full NFR list
      - additional requirements and constraints
      - an initial assessment of PRD completeness and clarity
    </detail>
  </action>
</step>

## CHECKPOINT

Complete the PRD extraction and report update before the workflow advances to epic-coverage validation.

## ADVISORY

- Do not summarize away requirement detail in this phase; the downstream traceability checks depend on complete extraction.
- Use the confirmed PRD from document discovery rather than rediscovering files ad hoc.
