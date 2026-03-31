# Capability Name

Workflow Forms

## Purpose

Request inputs from the user via a modal, then invoke an appropriate tool with those inputs to resolve a workflow step deterministically.

## System Context

BMAD workflows rely on documentation. To create and manage that documentation, AI Agents often need to refer to existing documentation or request documentation from human users. That process- ask for existing file, read file, use the contents to inform creation or revision of another file- is problematic for a few reasons:
    - It creates unnecessary back-and-forth (internally between tool calls made by the AI agent, or between the AI Agent and the user)- this drives up token consumption.
    - It directly inflates token consumption when AI Agents read documents just to extract information from them to place inside another document.
    - It carries risk inherent to any AI-driven bookkeeping

Workflow Forms aim to solve that problem by resolving certain bookkeeping by automatically invoking tools designed to execute specific bookkeeping steps, and prompting the human user for those tools' inputs in the chat UI. This capability maintains the rigorous documentation that BMAD relies on while reducing token consumption and reducing risk of error.

## Adding New Use Cases
- When deploying workflow forms in a new use case, the tool schema for the tool must be evaluated. If it indicates branching or multiple type options in prose, the schema must be updated to instead express that information in JSON so that it can be consumed by the workflow layer at runtime.

## System Position
## Responsibilities
## Non-Responsibilities
## Inputs
## Outputs
## Invariants
## Core Logic
## Failure Modes
## Usage
## Extension Guidelines
## Examples
## (Optional) Performance
## (Optional) Observability