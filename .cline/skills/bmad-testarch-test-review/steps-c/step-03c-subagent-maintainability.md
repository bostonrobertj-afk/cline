---
name: 'step-03c-subagent-maintainability'
description: 'Subagent: Check test maintainability (readability, structure, DRY)'
subagent: true
outputFile: '/tmp/tea-test-review-maintainability-{{timestamp}}.json'
---
# Subagent 3C: Maintainability Quality Check

## META
- managed_workflow_extraction: enabled
- phase_type: phase
- source_format: procedural

## EXECUTION
<step n="1" goal="Review Detailed Guidance">
  <action>Read the advisory, reference, and prose sections in this file completely before taking action.</action>
</step>

<step n="2" goal="Follow Phase Procedure">
  <action>Execute this file in order, preserving every approval gate, routing rule, document update instruction, and constraint described below.</action>
</step>

## CHECKPOINT
This phase can be marked complete only after the required outputs, approvals, and routing conditions in this file are satisfied.

## ADVISORY
- Treat the <prose> section as the authoritative detailed instructions for this file.
- Preserve all existing user-input pauses, continuation checks, and referenced companion files.
- Keep any document templates, frontmatter updates, and save instructions exactly as authored.

## REFERENCE
- Original authored procedure retained below for managed workflow extraction compatibility.

<prose>
## SUBAGENT CONTEXT

This is an **isolated subagent** running in parallel with other quality dimension checks.

**Your task:** Analyze test files for MAINTAINABILITY violations only.

---

## MANDATORY EXECUTION RULES

- ✅ Check MAINTAINABILITY only (not other quality dimensions)
- ✅ Output structured JSON to temp file
- ❌ Do NOT check determinism, isolation, coverage, or performance

---

## SUBAGENT TASK

### 1. Identify Maintainability Violations

**HIGH SEVERITY Violations**:

- Tests >100 lines (too complex)
- No test.describe grouping
- Duplicate test logic (copy-paste)
- Unclear test names (no Given/When/Then structure)
- Magic numbers/strings without constants

**MEDIUM SEVERITY Violations**:

- Tests missing comments for complex logic
- Inconsistent naming conventions
- Excessive nesting (>3 levels)
- Large setup/teardown blocks

**LOW SEVERITY Violations**:

- Minor code style issues
- Could benefit from helper functions
- Inconsistent assertion styles

### 2. Calculate Maintainability Score

```javascript
const severityWeights = { HIGH: 10, MEDIUM: 5, LOW: 2 };
const totalPenalty = violations.reduce((sum, v) => sum + severityWeights[v.severity], 0);
const score = Math.max(0, 100 - totalPenalty);
```

---

## OUTPUT FORMAT

```json
{
  "dimension": "maintainability",
  "score": 75,
  "max_score": 100,
  "grade": "C",
  "violations": [
    {
      "file": "tests/e2e/complex-flow.spec.ts",
      "line": 1,
      "severity": "HIGH",
      "category": "test-too-long",
      "description": "Test file is 250 lines - too complex to maintain",
      "suggestion": "Split into multiple smaller test files by feature area",
      "code_snippet": "test.describe('Complex flow', () => { /* 250 lines */ });"
    }
  ],
  "passed_checks": 10,
  "failed_checks": 5,
  "violation_summary": {
    "HIGH": 2,
    "MEDIUM": 2,
    "LOW": 1
  },
  "recommendations": [
    "Split large test files into smaller, focused files (<100 lines each)",
    "Add test.describe grouping for related tests",
    "Extract duplicate logic into helper functions"
  ],
  "summary": "Tests have maintainability issues - 5 violations (2 HIGH)"
}
```

---

## EXIT CONDITION

Subagent completes when JSON output written to temp file.

**Subagent terminates here.**
</prose>
