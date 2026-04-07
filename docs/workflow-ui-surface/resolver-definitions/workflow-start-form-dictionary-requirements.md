# Workflow Start Form Dictionary Requirements

## Purpose

This document defines the requirements for cleaning up workflow-start form dictionary configuration so that:

- workflow-start dictionary configuration is defined in [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts), not [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- the workflow-start reference modal is contextual to the actual inputs shown in the active workflow-start form
- the dictionary content pulls glossary definitions from [systemDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts)
- drift between workflow-start form UI fields and workflow-start reference-modal content is reduced

## Current Runtime Baseline

The live workflow-start form currently works like this:

- Step 1 requirements are parsed from the workflow source by [parseWorkflowStartRequirements](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/workflowStartRequirements.ts#L18)
- workflow-start field definitions are built from those parsed `required`, `optional`, and `oneOf` keys in [WorkflowFormRegistry.ts#L304-L335](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L304)
- the workflow-start reference modal currently uses an inline config object in [WorkflowFormRegistry.ts#L235-L244](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L235)
- that inline config currently produces a generic `set_workflow_placeholders` reference modal with an empty `### Term Reference` section

## Required Outcome

After this work:

- workflow-start dictionary configuration must be centralized in [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts)
- the workflow-start reference modal must include term-reference content based on the actual workflow-start fields being shown to the user
- the workflow-start resolver must no longer own its own inline dictionary config object
- the active workflow-start modal must remain runtime-generated and must not depend on `docs/`

## Source Of Truth Requirements

### 1. Canonical Dictionary Configuration Location

The workflow-start dictionary configuration must live in [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts).

The implementation must not keep the workflow-start dictionary config as a local object inside [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts).

### 2. Workflow-Start Field Set Must Drive Term Selection

The workflow-start reference modal must derive its `Term Reference` content from the same parsed workflow-start requirements that drive the visible UI fields.

That means the term-selection input must come from the active workflow-start field set derived from:

- `requiredFieldKeys`
- `optionalFieldKeys`
- `oneOfRequirement.fieldKeys`

as parsed by [parseWorkflowStartRequirements](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/workflowStartRequirements.ts#L18) and used to build visible fields in [WorkflowFormRegistry.ts#L304-L335](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L304).

The modal must not use a fixed empty `termKeys: []` configuration for workflow-start forms.

### 3. System Dictionary Must Supply Definitions

Workflow-start term-reference entries must be pulled from [systemDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts).

The expected model is:

- workflow-start fields determine which keys should be considered for inclusion
- matching definitions are read from `workflowFormSystemDictionary`
- those definitions are rendered into the runtime workflow-start reference modal through the shared tool-dictionary builder path

## Fallback Behavior Requirement

If an active workflow-start field has no matching entry in [systemDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts), the workflow-start reference modal must fall back silently.

That means:

- runtime modal generation must not fail
- the form must remain usable
- unmapped fields may be omitted from `Term Reference`
- the runtime must not surface an error, warning, placeholder row, or developer-facing message to the user for missing glossary coverage

## Modal Content Requirements

### 4. Title And Overview

The workflow-start modal may continue to use the workflow-start reference title and workflow-start overview copy, but that configuration must be sourced through [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts), not inline inside [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts).

### 5. Parameter Section

The workflow-start modal must continue to reflect the underlying `set_workflow_placeholders` tool contract for the `values` parameter.

This means the `### Parameters` section may remain schema-driven from [set_workflow_placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts#L12-L24), while the `### Term Reference` section becomes contextual to the active workflow-start fields.

### 6. Contextual Term Reference Section

The workflow-start modal must no longer render an empty `### Term Reference` section when at least one active workflow-start field has a matching system-dictionary entry.

When one or more active fields map to system-dictionary entries, those entries must be rendered under `### Term Reference`.

When none of the active workflow-start fields have matching system-dictionary entries, silent fallback is allowed.

## Runtime Contract Requirements

### 7. Runtime Builder Ownership

The workflow-start resolver in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts) must consume workflow-start dictionary content through shared dictionary-builder APIs from [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts).

The workflow-start resolver must not own a bespoke inline dictionary config after this cleanup.

### 8. Active-Context Awareness

The runtime workflow-start dictionary content must remain contextual to the active workflow instance.

This means the builder path must be able to use the currently parsed workflow-start requirements for the active workflow session when generating the `Term Reference` section.

### 9. No Docs Dependency

The workflow-start reference modal must remain runtime-generated and must not depend on files under `docs/`.

## Scope Boundaries

This requirements slice is limited to workflow-start dictionary configuration and workflow-start reference-modal content.

It does not require:

- changing how workflow-start fields are parsed from workflow source documents
- changing how workflow-start field labels or help text are chosen
- changing the workflow-start slash-command trigger path
- changing non-workflow-start workflow form dictionaries

## Verification Requirements

Implementation must include verification proving all of the following:

- workflow-start dictionary config is no longer defined inline in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- workflow-start dictionary config is defined in [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts)
- workflow-start runtime modal content is built through the shared dictionary builder path
- the active workflow-start `required`, `optional`, and `oneOf` field keys determine which `Term Reference` entries are included
- matching entries are rendered from [systemDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts)
- missing system-dictionary entries fall back silently without breaking runtime behavior
- the workflow-start modal continues to include the `values` parameter description from the `set_workflow_placeholders` tool schema
- the workflow-start modal no longer shows a meaningless empty `Term Reference` section when active mapped terms exist
