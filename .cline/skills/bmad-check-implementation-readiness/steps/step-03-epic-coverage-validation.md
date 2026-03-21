---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
---

# step 03 epic coverage validation

## META

- Goal: validate that every functional requirement extracted from the PRD is covered in the selected epics and stories artifacts.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Load the selected epics and stories artifact completely">
  <action>
    Load the epics and stories artifact confirmed during document discovery.
    <detail>
      If the confirmed artifact is a whole document, read it completely.
      If it is sharded, read every file in the shard set completely.
    </detail>
  </action>
  <action>Look for FR coverage maps, traceability lists, epic mappings, story mappings, or equivalent coverage indicators.</action>
</step>

<step n="2" goal="Extract the FR coverage claims from the epics and stories artifact">
  <action>
    Extract which PRD functional requirements are claimed to be covered and where they are covered.
    <detail>
      Record which epics and stories map to each FR whenever that information is available.
    </detail>
  </action>
  <output>Produce a structured FR coverage list or matrix based on the epics and stories artifact.</output>
</step>

<step n="3" goal="Compare epic coverage against the PRD FR list">
  <action>
    Compare each PRD functional requirement from the prior phase against the extracted epic coverage information.
    <detail>
      Identify:
      - PRD FRs that are not covered anywhere in epics or stories
      - FRs referenced in epics or stories that do not exist in the PRD
      - weak or ambiguous mappings that do not clearly show coverage
    </detail>
  </action>
  <output>Produce a coverage analysis with a status for each PRD FR.</output>
</step>

<step n="4" goal="Document missing or questionable coverage with impact and remediation guidance">
  <action>
    Document every uncovered or weakly covered FR.
    <detail>
      For each coverage issue, include:
      - the full FR text
      - why the gap is important
      - which epic or story should likely absorb the requirement
      - any ambiguity that blocks traceability confidence
    </detail>
  </action>
</step>

<step n="5" goal="Append coverage findings and statistics to the readiness report">
  <action>
    Append an epic-coverage validation section to `{outputFile}`.
    <detail>
      Include:
      - the coverage matrix or equivalent structured analysis
      - missing or weakly covered requirements
      - coverage statistics such as total PRD FRs, covered FRs, and coverage percentage
    </detail>
  </action>
</step>

## CHECKPOINT

Complete the coverage comparison and report update before the workflow advances to UX alignment.

## ADVISORY

- Every PRD functional requirement must have a traceable implementation path.
- Do not treat weak or implied coverage as fully validated coverage without explicit evidence.
