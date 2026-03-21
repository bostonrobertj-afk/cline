---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
---

# step 01 document discovery

## META

- Goal: discover, inventory, and organize all project planning documents, identify duplicates, and confirm which versions should be used for the assessment.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Discover all relevant planning documents without analyzing their contents">
  <action>
    Search for PRD, architecture, epics/stories, and UX documents in `{planning_artifacts}`.
    <detail>
      Search patterns should include:
      - PRD whole-file candidates like `{planning_artifacts}/*prd*.md`
      - PRD sharded candidates like `{planning_artifacts}/*prd*/index.md`
      - architecture whole-file candidates like `{planning_artifacts}/*architecture*.md`
      - architecture sharded candidates like `{planning_artifacts}/*architecture*/index.md`
      - epic whole-file candidates like `{planning_artifacts}/*epic*.md`
      - epic sharded candidates like `{planning_artifacts}/*epic*/index.md`
      - UX whole-file candidates like `{planning_artifacts}/*ux*.md`
      - UX sharded candidates like `{planning_artifacts}/*ux*/index.md`
    </detail>
  </action>
  <action>
    Group sharded documents together and separate them from whole-file versions.
    <detail>
      Do not analyze document bodies in this phase beyond what is necessary to identify and classify the files.
    </detail>
  </action>
</step>

<step n="2" goal="Organize the inventory and identify duplicates or gaps">
  <action>Produce an organized inventory for each document type, showing whole-file candidates and sharded candidates separately.</action>
  <action>
    Identify critical duplicate situations where both whole and sharded versions exist for the same document type.
    <detail>
      Treat duplicate format collisions as critical issues that require user resolution before the assessment proceeds.
    </detail>
  </action>
  <action>
    Identify required document types that appear to be missing.
    <detail>
      Missing documents are warnings because they reduce assessment completeness.
    </detail>
  </action>
</step>

<step n="3" goal="Initialize the readiness report and record the document inventory">
  <action>Initialize `{outputFile}` from `../templates/readiness-report-template.md`.</action>
  <action>
    Add a document-discovery section to `{outputFile}`.
    <detail>
      Record:
      - the organized file inventory
      - duplicate-format issues
      - missing-document warnings
      - a placeholder or pending-selection note for the document versions that still require user confirmation
    </detail>
  </action>
</step>

<step n="4" goal="Present findings and get user confirmation before continuing">
  <output>Present the organized file inventory, duplicate issues, and missing-document warnings.</output>
  <ask>
    Ask the user to resolve any duplicate-format conflicts and confirm which document versions should be used for the assessment.
    <detail>
      Use a continuation gate such as:
      - `[C]` Continue after duplicate issues are resolved and document choices are confirmed
    </detail>
  </ask>
  <branch if="duplicate-format issues remain unresolved">
    <output>Explain that the assessment cannot proceed until duplicate document formats are resolved.</output>
  </branch>
  <branch if="the user confirms the document set and duplicate issues are resolved">
    <action>
      Update the report with the confirmed document set and mark this phase complete.
      <detail>
        Replace any pending-selection note from the earlier report section with the final approved document choices.
      </detail>
    </action>
  </branch>
</step>

## CHECKPOINT

Halt until duplicate-format conflicts are resolved and the user confirms which document versions should be used.

## ADVISORY

- Focus only on file discovery, inventory, duplicate detection, and document selection in this phase.
- Do not begin substantive PRD or epic analysis until the assessment document set is confirmed.
