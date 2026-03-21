---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
---

# step 05 epic quality review

## META

- Goal: validate epics and stories against strong epic/story best practices, with emphasis on user value, independence, dependency quality, and implementation readiness.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Establish the quality-review criteria for epics and stories">
  <action>
    Apply best-practice criteria rigorously across the epics and stories artifact.
    <detail>
      The review must assess:
      - whether epics deliver user value rather than technical milestones
      - whether epics remain independent and sequentially sensible
      - whether stories are appropriately sized and independently completable
      - whether forward dependencies or future-work assumptions exist
      - whether acceptance criteria are clear, testable, and complete
    </detail>
  </action>
  <annotation annotationKind="critical">Do not normalize or excuse structural quality problems simply because work could theoretically continue.</annotation>
</step>

<step n="2" goal="Validate epic structure and user-value alignment">
  <action>
    Review each epic for user-centric value and independence.
    <detail>
      Check:
      - epic title: does it describe what a user can do or gain?
      - epic goal: does it describe a user outcome rather than a technical milestone?
      - value proposition: can users benefit from this epic on its own?
      - epic sequencing: does Epic N depend on Epic N+1 to function?
    </detail>
  </action>
  <output>
    Flag red-flag examples such as technical-milestone epics or epics that depend on future epics to make sense.
    <detail>
      Red flags include examples like:
      - "Setup Database"
      - "API Development"
      - "Infrastructure Setup"
      - epics whose usefulness depends on capabilities only delivered later
    </detail>
  </output>
</step>

<step n="3" goal="Assess story quality, sizing, and acceptance criteria">
  <action>
    Review each story for meaningful user value and independent completeness.
    <detail>
      Check:
      - whether the story delivers something meaningful to the user or business
      - whether it can be completed without relying on future stories
      - whether acceptance criteria follow solid BDD-style structure when appropriate
      - whether acceptance criteria are specific, testable, and complete
    </detail>
  </action>
  <output>
    Flag common story-quality failures.
    <detail>
      Common failures include:
      - stories that are really technical setup tasks
      - vague criteria like "user can login"
      - missing error conditions
      - incomplete happy paths
      - non-measurable outcomes
      - forward dependencies such as "depends on Story 1.4"
    </detail>
  </output>
</step>

<step n="4" goal="Analyze dependency structure and creation timing">
  <action>
    Map within-epic dependencies and identify forward-reference violations.
    <detail>
      Check whether:
      - Story 1.1 stands alone
      - Story 1.2 can depend on Story 1.1 output but not on future stories
      - Story 1.3 can depend only on already completed groundwork
      - stories require future stories or future features to become valid
    </detail>
  </action>
  <action>
    Validate database or entity creation timing.
    <detail>
      Prefer incremental creation when needed over upfront creation of everything in the earliest story.
    </detail>
  </action>
</step>

<step n="5" goal="Run special implementation-readiness checks">
  <action>
    Check for starter-template implications.
    <detail>
      If the architecture specifies a starter template, verify that early stories explicitly cover:
      - initial setup from the starter template
      - dependency installation
      - initial configuration
    </detail>
  </action>
  <action>
    Check whether the epic/story plan reflects the project context appropriately.
    <detail>
      For greenfield efforts, look for early project setup, environment configuration, and CI/CD setup.
      For brownfield efforts, look for integration, migration, or compatibility work.
    </detail>
  </action>
</step>

<step n="6" goal="Document quality violations, severity, and remediation guidance">
  <action>
    Document every significant quality problem found in the epics and stories artifact.
    <detail>
      Organize findings by severity, such as:
      - critical violations
      - major issues
      - minor concerns
    </detail>
  </action>
  <action>
    Provide remediation guidance for each issue.
    <detail>
      Guidance should explain how to restore user value, eliminate forward dependencies, improve story sizing, or clarify acceptance criteria.
    </detail>
  </action>
</step>

<step n="7" goal="Append epic-quality findings to the readiness report">
  <action>
    Append an epic quality review section to `{outputFile}`.
    <detail>
      Include:
      - epic structure findings
      - story quality findings
      - dependency-analysis findings
      - special implementation-readiness findings
      - severity-based issue breakdown
      - recommended remediation actions
    </detail>
  </action>
</step>

## CHECKPOINT

Complete the quality review and report update before the workflow advances to final assessment.

## ADVISORY

- Challenge technical epics, forward dependencies, and structurally weak stories directly.
- The goal of this phase is not to excuse problems but to surface them clearly before implementation begins.
