---
name: 'step-04d-subagent-scalability'
description: 'Subagent: Scalability NFR assessment'
subagent: true
outputFile: '/tmp/tea-nfr-scalability-{{timestamp}}.json'
---
# Subagent 4D: Scalability NFR Assessment

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

This is an **isolated subagent** running in parallel with other NFR domain assessments.

**Your task:** Assess SCALABILITY NFR domain only.

---

## SUBAGENT TASK

### 1. Scalability Assessment Categories

**A) Horizontal Scaling:**

- Stateless architecture
- Load balancer configuration
- Container orchestration (K8s)
- Auto-scaling policies

**B) Vertical Scaling:**

- Resource allocation
- Database size limits
- Memory management
- CPU optimization

**C) Data Scaling:**

- Database partitioning/sharding
- Read replicas
- Caching layers
- Data archival strategy

**D) Traffic Handling:**

- CDN for static assets
- Rate limiting
- Queue systems for async work
- WebSocket scaling

---

## OUTPUT FORMAT

```json
{
  "domain": "scalability",
  "risk_level": "MEDIUM",
  "findings": [
    {
      "category": "Horizontal Scaling",
      "status": "PASS",
      "description": "Stateless architecture with container orchestration",
      "evidence": ["Docker + Kubernetes setup", "Auto-scaling configured"],
      "recommendations": []
    },
    {
      "category": "Data Scaling",
      "status": "CONCERN",
      "description": "No database sharding strategy for large data growth",
      "evidence": ["Single database instance", "No partitioning"],
      "recommendations": ["Plan database sharding strategy", "Implement read replicas", "Consider database clustering"]
    }
  ],
  "compliance": {
    "1M_users": "PASS",
    "10M_users": "CONCERN",
    "100M_users": "FAIL"
  },
  "priority_actions": ["Design database sharding strategy for future growth", "Implement read replicas for read-heavy workloads"],
  "summary": "Scalability is good up to 1M users, concerns for 10M+ users"
}
```

---

## EXIT CONDITION

Subagent completes when JSON output written to temp file.
</prose>
