---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
---

# step 04 ux alignment

## META

- Goal: determine whether UX documentation exists and validate whether UX, PRD, and architecture remain aligned.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Determine whether UX documentation exists">
  <action>
    Search the confirmed planning document set for UX documentation.
    <detail>
      Look for:
      - whole UX documents such as `{planning_artifacts}/*ux*.md`
      - sharded UX documents such as `{planning_artifacts}/*ux*/index.md`
      - relevant UI or UX material embedded in adjacent planning artifacts when no standalone UX document exists
    </detail>
  </action>
</step>

<step n="2" goal="Assess UX alignment or implied UX needs based on the available documentation">
  <branch if="UX documentation exists">
    <action>
      Validate UX ↔ PRD alignment.
      <detail>
        Check:
        - whether UX requirements are reflected in the PRD
        - whether user journeys align with PRD use cases
        - whether UX requirements appear that are not represented in the PRD
      </detail>
    </action>
    <action>
      Validate UX ↔ architecture alignment.
      <detail>
        Check:
        - whether the architecture supports the UX requirements
        - whether responsiveness, load-time, or other UX performance needs are addressed
        - whether UI components or interaction patterns depend on architecture that is missing or underspecified
      </detail>
    </action>
  </branch>
  <branch if="no UX documentation exists">
    <action>
      Assess whether UX is implied by the rest of the planning artifacts.
      <detail>
        Consider:
        - whether the PRD describes a user interface
        - whether web or mobile components are implied
        - whether the product is user-facing
      </detail>
    </action>
    <output>If UX is implied but not documented, treat that as a warning that affects assessment completeness and implementation readiness.</output>
  </branch>
</step>

<step n="3" goal="Append UX findings to the readiness report">
  <action>
    Append a UX alignment section to `{outputFile}`.
    <detail>
      Include:
      - whether a UX document was found
      - UX ↔ PRD alignment issues
      - UX ↔ architecture alignment issues
      - warnings when UX appears necessary but remains undocumented
    </detail>
  </action>
</step>

## CHECKPOINT

Complete the UX assessment and report update before the workflow advances to epic-quality review.

## ADVISORY

- Do not assume UX is unnecessary just because a dedicated UX document is missing.
- Treat UX-architecture gaps as readiness risks, not merely documentation issues.
