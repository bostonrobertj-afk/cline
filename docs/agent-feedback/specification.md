# Agent Feedback Specification

## Purpose

This document records the exact implementation-facing decisions that support the requirements in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/agent-feedback/requirements.md)

## Feature Contract

### Supported Tools

`agent_feedback` is supported only on:

- `send_user_message`
- `ask_followup_question`
- `attempt_completion`
- `generate_plan_output`

### Parameter Shape

The v1 shape is:

```json
{
  "agent_feedback": {
    "message": "Concise description of the blocker, ambiguity, instability, or confusing scenario."
  }
}
```

Rules:

- `agent_feedback` is optional.
- `agent_feedback.message` is required when `agent_feedback` is present.
- No additional v1 fields are required.

## Prompting Contract

Prompting should instruct the agent to use `agent_feedback` only when:

- it encounters a meaningful blocker
- ambiguity materially affects correctness
- instability or unresolvable tool/runtime behavior prevents confident completion

Prompting should not imply that `agent_feedback` is for routine narration, minor uncertainty, or ordinary status updates.

The same instruction text should be reused across:

- Tool Use guidance
- continuation-turn guidance

## UI Contract

When `agent_feedback` is present on a supported response tool call:

- the response tool’s normal primary artifact renders first
- the agent feedback renders immediately beneath it
- the UI label must be exactly:
  - `Real-Time Agent Feedback`

The UI presentation must use a distinct agent-authored path and must not reuse the existing user-authored `user_feedback` semantics.

## Message/Persistence Semantics

### Distinct Message Type

Do not reuse the existing `user_feedback` message type.

Reason:

- existing `user_feedback` represents human-authored follow-up after response tools
- reusing it would make history and UI semantics misleading

The implementation should introduce a distinct persisted/UI concept for agent-authored real-time feedback.

## Logging Contract

Each `agent_feedback` event must emit a runtime log line through existing logging methods.

Each log entry should include:

- ISO 8601 timestamp
- task identifier
- response tool name
- message text
- turn identifier
- API-call or equivalent per-turn sequencing metadata, if available without disproportionate complexity

## Audit File Contract

### File Goal

Maintain one user-visible audit file that a user can send externally and that can be copied into this repo for product analysis.

### Recommended File Shape

Use a single rolling JSONL file:

- one JSON object per line
- append-friendly
- easy to diff, parse, trim, and ingest into later analysis scripts

### Recommended Location

Use a user-visible global path under the Documents-based Cline area rather than a hidden internal task-storage file.

Recommended target:

- `~/Documents/Cline/Audits/agent-feedback-audit.jsonl`

### Retention Rule

The file must contain only entries whose timestamps fall within the last 7 days.

Operational rule:

- on each new write, load existing entries
- drop entries older than 7 days
- append the new event
- write back the pruned file atomically

### Required Audit Entry Fields

Each persisted entry should include:

- `timestamp`
- `taskId`
- `toolName`
- `message`
- `turnIdentifier`
- `apiCallIdentifier` when available

Recommended entry example:

```json
{
  "timestamp": "2026-03-28T21:15:02.114Z",
  "taskId": "task_abc123",
  "toolName": "attempt_completion",
  "message": "Final verification is blocked because the target output file is intermittently overwritten by another process.",
  "turnIdentifier": 14,
  "apiCallIdentifier": 27
}
```

## Schema Exposure Rule

`agent_feedback` should be present whenever a supported response tool is present in the active schema.

This should not be interpreted as “globally always present regardless of whether the parent tool is visible.”

## Implementation Guidance Boundaries

These decisions are intentional and should not be changed during implementation without revisiting requirements:

- keep the payload minimal in v1
- do not reuse `user_feedback`
- use one user-visible rolling audit file
- keep only the last 7 days of audit entries
- keep feedback attached to the response tool call rather than inventing a standalone feedback tool
