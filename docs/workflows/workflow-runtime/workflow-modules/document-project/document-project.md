Document Project Workflow

# Module metadata:
displayName: document project
slashcommandname: document-project
useskillname: document-project
name: document-project
description: This workflow builds and/or updates documentation to leverage as context while planning and implementing development projects. It focuses on a developer guide and project overview which together explain the nature of your project as well as your preferences and rules for working in the repo.

# Entry Panel
entryPanel.promptMarkdown: In this workflow, you'll generate or update the developer guide and project overview, which are used in other workflows to provide agents with context regarding your project and ways of working.

# Persona
- `name` must be `Mary`.
- `role` must be `Technical Writer`.
- `identity` must be exactly: producing product documentation for developer teams.
- `communicationStyle` must be exactly: crisp, checklist-driven, and ambiguity-free.
- `capabilities` must be exactly: product analysis, technical documentation.
- `principles` must be exactly: Developers do their best work when they have comprehenvise product documentation at their disposal.

# Tool Schema Override
Step 1: empty
Step 2: empty
Step 3: empty
Step 4: read files, ask followup question, write files, send general message, use attempt_completion, run CLI commands (exact tools should be derived from module build guide)

# Automatic Project Selection And Prerequisite Resolution

Document Project always uses the project folder `docs/projects/agent-guidance`. It must complete the standard project-selection state automatically and must not ask the user to select a project.

Before prerequisite document resolution:

- Set `projectMode` to `existing` if `docs/projects/agent-guidance` exists. Otherwise, set `projectMode` to `new`.
- Set `projectTitle` to `Agent Guidance`.
- Set `projectFolderName` to `agent-guidance`.
- Mark project selection complete through the normal project-selection contract.

Declare both guidance documents as optional prerequisite documents produced by `document-project`. Both documents are located directly in the selected project root, with no project subfolder segments:

- `project_overview`: exact filename `project-overview.md`; persist its full absolute path as `workflow.project_overview`.
- `developer_guide`: exact filename `developer-guide.md`; persist its full absolute path as `workflow.developer_guide`.

At the start of Step 1 and before Workflow Form 1 is rendered, run normal prerequisite document resolution for both optional prerequisite documents. Each persisted resolution result must contain the prerequisite identifier and the resolved full absolute path if the target file was located.


# Documentation Outputs

Document Project generates either optional prerequisite document if they did not exist at prerequisite file resolution.

# Runtime And User-Visible Failure Messages

- Prerequisite-state or creation-state derivation failure: `I could not determine which reference documents need to be generated.`
- Project Overview creation failure: `I could not create project-overview.md in the Agent Guidance folder.`
- Project Overview initialization failure: `I could not populate the initial content for project-overview.md.`
- Developer Guide creation failure: `I could not create developer-guide.md in the Agent Guidance folder.`
- Developer Guide initialization failure: `I could not populate the initial content for developer-guide.md.`
- Baseline-data routing failure: `I could not determine which baseline information must be collected.`
- Step 4 prompt-routing failure: `I could not determine the appropriate documentation task for the current session.`

# Focus Chain Task List (Steps)
Step 1: Identify Session Objective
Step 2: Document Generation
Step 3: Identify Baseline Data
Step 4: Support System Documentation

# Workflow Steps

## Step 1: Identify Session Objective

After both optional prerequisite document resolution results have been persisted, render Workflow Form 1.

Exactly one of Workflow Form 1's four panels is rendered to whether prerequisite file resolution located the workflow's artifacts and set their file paths or not.

Workflow Form Title: Confirm Document Generation
Tool Dictionary: Empty String

Panel A: shown if workflow.developer_guide and workflow.project_overview both did not have file paths set during prerequisite file resolution.
title: Full Scan Needed
promptMarkdown: The Agent Guidance folder exists, but it’s currently empty. I’ll proceed with a full scan to generate the necessary repo documentation.
allowedActions/ Labels:
	- submit/ continue
Panel A submission performs no workflow-value writes and transitions to Step 2.

Panel B: shown if workflow.developer_guide was found and had a file path set during prerequisite file resolution and workflow.project_overview was NOT found and did NOT have a file path set during prerequisite file resolution.
title: Missing Project Overview
promptMarkdown: The required Project Overview document is missing from the Agent Guidance folder in this repo. I'll generate that file for you during this workflow.
allowedActions/ labels:
    submit/ continue
Panel B submission performs no workflow-value writes and transitions to Step 2.

Panel C: shown if workflow.project_overview was found and had a file path set during prerequisite file resolution and workflow.developer_guide was NOT found and did NOT have a file path set during prerequisite file resolution.
title: Missing Developer Guide
promptMarkdown: The required Developer Guide document is missing from the Agent Guidance folder in this repo. I'll generate that file for you during this workflow.
allowedActions/ Labels:
    submit/ continue
Panel C submission performs no workflow-value writes and transitions to Step 2.

Panel D: shown if workflow.developer_guide was found and a file path was set during prerequisite file resolution and workflow.project_overview was found and did have a file path set during prerequisite file resolution.
title: Clarify Intent
promptMarkdown: It looks like the foundational reference documents are in place. What would you like to do?
Field:
	kind: dropdown
	required: true
    label: Select One
	options: Update existing documents, Add supporting documentation
allowedActions/ Labels:
    submit/ continue

Panel D submission must persist the user's response as `workflow.session_objective`, then transition to Step 2.

If the prerequisite resolution results do not match exactly one of the four panel conditions, emit `I could not determine which reference documents need to be generated.`

# Step 2: Document Generation

Determine whether either of the two workflow artifacts need to be generated based on whether their file paths were set during prerequisite file resolution.
Set creationRequired to either true or false based on whether the files were found:
    - workflow.project_overview_creation_required = true if workflow.project_overview was unset after prerequisite resolution.
    - workflow.developer_guide_creation_required = true if workflow.developer_guide was unset after prerequisite resolution.

Generate any of the two workflow artifacts which were not located during prerequisite file resolution based on whether workflow.project_overview and/or workflow.developer_guide had file paths discovered and persisted as variables during prerequisite file resolution.

Follow procedure & tool use for artifact generation & scaffolding demonstrated by already-built workflows, including populating the artifacts with the templatized content below. Once any missing artifacts are generated and populated with the required templatized content, proceed to step 3.

The full absolute file path for any artifacts generated in this step must be persisted as the appropriate workflow variables- workflow.developer_guide and/or workflow.project_overview


project-overview.md, which must be populated with this content:
*** begin project-overview initial content example ***
# Executive Summary

# Classification

Repository Type:
Product Type:
Primary Language:
Repo Status: 
Architecture Pattern:

# Structure

# Technology Stack Summary

# Key Features

# Architecture Highlights

# Repository Structure

# Dependency Graph & Data Flow

# Integration Points & API Contracts

# Documentation Map

*** end project-overview initial content example ***

developer-guide.md, which must be populated with this content:
*** begin project-index initial content example ***
# Coding Style

# Before Contributing
All updates should start with a clean working tree. Always check for a clean tree before beginning work, and ask the user to commit anything already in the working tree before you begin if the tree is not clean.

# Local Development Instructions
- You must always follow workflow instructions exactly
- You must always stop and ask for guidance when faced with anything ambiguous or for which a decision is required that has not been explicitly deferred to you by the user or workflow instructions
- You must avoid broad file scan behavior. Limit system access to the files necessary to perform the task assigned to you.
- You must only use attempt_completion once, as your final completion report at the end of a workflow.

# Code Quality
- Keep changes narrowly scoped to the requested behavior and follow the existing architecture, naming conventions, helper APIs, and file organization already present in the codebase.
- Prefer type-safe, explicit implementations. Avoid `any`, unchecked casts, ad hoc string parsing, duplicated constants, and broad fallback behavior unless the project already uses that pattern or the requirements explicitly call for it.
- Do not invent user-facing text, prompts, labels, errors, configuration values, or workflow behavior. Reuse existing repo-owned strings and patterns where available; if required wording is missing, ask for clarification.
- When changing behavior, update the directly affected tests and remove stale imports, helpers, fixtures, assertions, and validation guards. Do not leave dead code behind.
- Before considering work complete, run the repository’s relevant focused tests plus the standard quality gates, such as typecheck, lint/format, and build/package commands if configured. Record the exact commands and outcomes.

# End to End Testing

# Commit Guidelines
When asked to commit your work, follow these rules:
	- Write clear, descriptive commit messages
	- Use conventional commit format (e.g. “feat:”, “fix:”, “docs:”)
	- Reference project title, story number, epic number, or phase number where relevant.

# Most Recent Project Notes

# Planned Enhancements

# Known Issues & Technical Debt

*** end developer-guide initial content example ***

## Step 3: Identify Baseline Data

Workflow Form 2 is shown when at least one artifact's variable (workflow.project_overview_creation_required, workflow.developer_guide_creation_required) is `true`. If both variables are set to `false`, skip Workflow Form 2 and transition directly to Step 4.
Workflow Form Title: Gather Baseline Project Data
Tool Dictionary: Empty String

Panel A: the initial panel when workflow.project_overview_creation_required is true
title: Repository Type
PromptMarkdown: Please select which of the following best describes this repository.
Field:
    kind: dropdown
    required: true
    Label: Select One
    options: Monolith: Single cohesive codebase, Monorepo: Multiple parts in one repository, Multi-part: Separate client/server or similar architecture
allowedActions/ Labels:
    submit/ continue

Set user's response as workflow.repo_type

Panel B: always shown after panel A
title: Project Type
promptMarkdown: Which of the following best matches this product's niche?
Field:
    kind: dropdown
    required: true
    label: Select One
    options: healthcare, fintech, govtech, edtech, aerospace, automotive, scientific, legaltech, insurtech, energy, process control, building automation, gaming, entertainment, mobile application, web application, desktop application, CLI, library, extension, infrastructure, other
allowedActions/ Labels:
    submit/ continue

Set user's response as workflow.product_type

Panel C: always shown after panel B
title: Primary Language
promptMarkdown: What is this project's primary programming language?
Field:
    kind: small_text
    required: true
    label: Select One
allowedActions/ Labels:
    submit/ continue

Set user's response as workflow.primary_programming_language

Panel D: always shown after panel C
title: Repo Status
promptMarkdown: Is this a Greenfield or Brownfield project?
Field:
    kind: radio_group
    label: Select One
    cardinality: single
    required: true
    options: Greenfield: Brand-new project with minimal files/folders in place, Brownfield: Established project with existing architecture
allowedActions/ Labels:
    submit/ continue

set panel D response as workflow.repo_status

Panel E: shown after panel D
title: API Usage
promptMarkdown: Does your product leverage internal or external APIs?
Field:
    kind: boolean
    required: true
    label: Select One
allowedActions/ Labels:
    submit/ continue

Set panel E response as workflow.api_indicator

Panel F: shown after panel E
title: Data Models
promptMarkdown: Does your product leverage data models or backend databases?
Field:
    kind: boolean
    required: true
    label: Select One
allowedActions/ Labels:
    submit/ continue

Set panel F response as workflow.database_indicator

Panel G: shown after panel F
title: State Management
promptMarkdown: Does your product leverage State Management?
Field:
    kind: boolean
    required: true
    label: Select One
allowedActions/ Labels:
    submit/ continue

Set panel G response as workflow.state_management_indicator

Panel H: shown after panel G
title: User Interface
promptMarkdown: Does your product have a UI?
Field:
    kind: boolean
    required: true
    Label: Select One
allowedActions/ Labels:
    submit/ continue

Set panel H response as workflow.ui_indicator

Panel I: shown after panel H
title: Deployment Configuration
promptMarkdown: Does your product require a deployment configuration?
Field:
    kind: boolean
    required: true
    label: Select One
allowedActions/ Labels:
    submit/ continue

Set panel I response as workflow.deployment_indicator

Panel J: shown after Panel I when `workflow.developer_guide_creation_required` is `true`. Panel J is the initial panel when `workflow.project_overview_creation_required` is `false` and `workflow.developer_guide_creation_required` is `true`. If `workflow.developer_guide_creation_required` is `false`, complete Workflow Form 2 after Panel I.
title: Recent Project
promptMarkdown: Tell me about the most recent update or enhancement you completed for this repository.
Field:
    kind: large_text
    label: Describe your most recent product update
    required: true
allowedActions/ Labels:
    submit/ continue

Set user's response as workflow.recent_project

Panel K: shown after panel J
title: Planned Enhancements
promptMarkdown: What future enhancements, fixes, or updates do you have in mind for this product?
Field:
    kind: large_text
    label: Planned Product Enhancements
    required: true
allowedActions/ Labels:
    submit/ continue

Set user's response as workflow.planned_enhancements

Panel L: shown after panel K.
title: Known Issues
promptMarkdown: What known issues, risks, or technical debt should I know about?
Field:
    kind: large_text
    label: Known Issues & Technical Debt
    required: true
allowedActions/ Labels:
    submit/ continue

Set user's response as workflow.known_issues

Complete Workflow Form 2 after Panel L. Successful Workflow Form 2 completion transitions to Step 4. If Workflow Form 2 cannot determine whether Panel A or Panel J is the required initial panel, emit `I could not determine which baseline information must be collected.`


## Step 4: Support System Documentation

Step 4 must render exactly one document-status prompt branch according to the two persisted `creation_required` variables. When both values are `false`, it must instead render the branch selected by `workflow.session_objective`: `Update existing documents` or `Add supporting documentation`. If the prerequisite resolution results or `workflow.session_objective` do not select exactly one valid Step 4 prompt branch, emit `I could not determine the appropriate documentation task for the current session.`

### Prompt:
Role and Objective:
You are an expert technical writer and principal software architect. Your task is to generate comprehensive, production-ready system documentation for the codebase in the current workspace.

*** conditional prompt: only shown when workflow.project_overview_creation_required and workflow.developer_guide_creation_required are both true ***
These documents were automatically generated by the system with required headings and will be completed by you during this workflow.
*** end conditional prompt ***
    - Project Overview: workflow.project_overview
    - Developer Guide: workflow.developer_guide
*** conditional prompt: only shown when workflow.project_overview_creation_required is true and workflow.developer_guide_creation_required is false ***
This document was missing at workflow invocation and has been generated as an initial scaffold for you to complete during this workflow:
    - Project Overview: workflow.project_overview
Completing this document is your primary focus during this workflow. You may add content and edit as-needed.

This document appears to have been generated during an earlier session. You'll need to ask the user to review and indicate whether additional revisions are needed:
    - Developer Guide: workflow.developer_guide
If you identify any inaccuracies or gaps in this document during your work, do not automatically update this document. Stop, inform the user of your discovery, and gain their consent before editing this document.
*** end conditional prompt segment ***
*** conditional prompt segment: only shown when workflow.project_overview_creation_required is false and workflow.developer_guide_creation_required is true ***
This document was missing at workflow invocation and has been generated as an initial scaffold for you to complete during this workflow:
    - Developer Guide: workflow.developer_guide
Completing this document is your primary focus during this workflow. You may add content and edit as-needed.

This document appears to have been generated during an earlier session. You'll need to ask the user to review and indicate whether additional revisions are needed:
    - Project Overview: workflow.project_overview
If you identify any inaccuracies or gaps in this document during your work, do not automatically update this document. Stop, inform the user of your discovery, and gain their consent before editing this document.
*** end conditional prompt segment ***

*** conditional prompt segment: shown when one or both creation_required variables are true ***
The user provided the following inputs, which you must immediately add to the owning document under the appropriate headings:
*** end conditional prompt segment ***
*** conditional prompt segment: only shown when workflow.project_overview_creation_required is true ***
Project Overview:
    - Repository Type: workflow.repo_type
    - Product Type: workflow.product_type
    - Primary Programming Language: workflow.primary_programming_language
    - Repo Status: workflow.repo_status
*** end conditional prompt segment ***
*** conditional prompt segment: only shown when workflow.developer_guide_creation_required is true ***
Developer Guide:
    - Recent Project Notes: workflow.recent_project
    - Planned Enhancements: workflow.planned_enhancements
    - Known Issues/ Tech Debt: workflow.known_issues
*** end conditional prompt segment ***

*** conditional prompt: only shown when workflow.project_overview_creation_required and workflow.developer_guide_creation_required are both true ***
After saving the user's inputs, notify them that you've added their inputs to the documents and are beginning your initial repo scan.

Perform an exhaustive system review in order to generate the needed content for the remaining sections in both of the provided documents. The user has provided these indicators to inform your scan:
- Uses APIs: workflow.api_indicator
- Uses Data Models or Databases: workflow.database_indicator
- Uses State Management: workflow.state_management_indicator
- Has a UI: workflow.ui_indicator
- Requires Deployment Config: workflow.deployment_indicator

The steps below are considered the appropriate method to conduct this system scan to populate the Project Overview:

# Context Gathering
1. Scan all active source files, configuration files, and data schemas in the repository.
2. Analyze the system's entry points, primary module dependencies, and external integrations.
3. Add content to workflow.project_overview as you work.

## 1. System Overview
- High-level functional purpose of the application.
- Target audience and primary use cases.
- Core business logic flows.

## 2. Architecture & Tech Stack
- Complete list of languages, frameworks, databases, and major third-party dependencies.
- High-level structural pattern used (e.g., MVC, Microservices, Clean Architecture).
- Data flow mapping from ingestion to storage.

## 3. Module & Directory Breakdown
- A visual directory tree of critical source folders.
- Detailed explanations for the responsibilities of each key module/package.

## 4. Core API & Interface Specifications
- Publicly exposed APIs, webhook listeners, or event-driven queues.
- Key function signatures, inputs, outputs, and expected error handling mechanisms.

## 5. Setup, Deployment & Testing
- Exact step-by-step local installation and environment variable configuration instructions.
- Test suites execution scripts and continuous integration deployment workflows.

## 6. Existing Documentation
- Full inventory of any existing system context, guides, or readme files

# Content Constraints
- Be explicit, factual, and strictly technical.
- Do not invent, extrapolate, or hallucinate features not found in the source code.
- Format all code blocks, variables, and path names with appropriate markdown notation.
- If a specific architecture pattern is ambiguous, state the observable code organization rather than guessing.

To populate the Developer Guide, walk the user through each section, preferring their input augmented by your own system review as needed. 
Here's how to think about each section of the document:
- Before Contributing: What does a dev agent need to know before they write a single line of code in this repo? A good way to approach this is to identify the top 3-5 "gotchas" or "must-knows" that agents can't afford to overlook.
- Local Development Instructions: This section is more procedure-oriented, as you can see by the pregenerated content. You may add content to this section, but do not remove the pregenerated content in this section.
- Code Quality: This section also includes pregenerated content, which can be revised if the user requests changes. This is intended to ensure that dev agents output is clean, consistent, scalable, and reliable.
- End to End Testing: This section should detail the end-to-end testing for the product as well as any targeted testing suites. If any tests run automatically, this section should indicate what triggers them and which tests are automatically run.
- Commit Guidelines: This section also includes pregenerated content which can be revised if the user wishes.
- Most Recent Project Notes: This section should provide an overview of the most recent work in this repo (where applicable)
- Planned Enhancements: This section should be a backlog of future product changes that the user has identified but is not ready to act on yet.
- Known Issues & Technical Debt: This section should be an inventory of any known system issues, tech debt, or misconfigurations.

Stop and ask the user for guidance and clarification as needed. Once you complete your system scan and have documented your findings, inform the user and work with them to ensure that your drafted content is correct and comprehensive.

Once the document is fully populated and the user has approved the content, use attempt_completion to deliver a final recap of the work completed and end this workflow.
*** end conditional prompt segment ***
*** conditional prompt: shown only when workflow.project_overview_creation_required is false and workflow.developer_guide_creation_required is true ***

To populate the Developer Guide, walk the user through each section, preferring their input augmented by your own system review as needed. 
Here's how to think about each section of the document:
- Before Contributing: What does a dev agent need to know before they write a single line of code in this repo? A good way to approach this is to identify the top 3-5 "gotchas" or "must-knows" that agents can't afford to overlook.
- Local Development Instructions: This section is more procedure-oriented, as you can see by the pregenerated content. You may add content to this section, but do not remove the pregenerated content in this section.
- Code Quality: This section also includes pregenerated content, which can be revised if the user requests changes. This is intended to ensure that dev agents output is clean, consistent, scalable, and reliable.
- End to End Testing: This section should detail the end-to-end testing for the product as well as any targeted testing suites. If any tests run automatically, this section should indicate what triggers them and which tests are automatically run.
- Commit Guidelines: This section also includes pregenerated content which can be revised if the user wishes.
- Most Recent Project Notes: This section should provide an overview of the most recent work in this repo (where applicable)
- Planned Enhancements: This section should be a backlog of future product changes that the user has identified but is not ready to act on yet.
- Known Issues & Technical Debt: This section should be an inventory of any known system issues, tech debt, or misonfigurations.

Once the document is fully populated and the user has approved the content, use attempt_completion to deliver a final recap of the work completed and end this workflow.
*** end conditional prompt segment ***
*** conditional prompt: shown only when workflow.project_overview_creation_required is true and workflow.developer_guide_creation_required is false ***

After saving the user's inputs, notify them that you've added their inputs to the document and are beginning your system scan.

Perform an exhaustive system review in order to generate the needed content for the remaining sections in the Project Overview document. The user has provided these indicators to inform your scan:
- Uses APIs: workflow.api_indicator
- Uses Data Models or Databases: workflow.database_indicator
- Uses State Management: workflow.state_management_indicator
- Has a UI: workflow.ui_indicator
- Requires Deployment Config: workflow.deployment_indicator

The steps below are considered the appropriate method to conduct this system scan:

# Context Gathering
1. Scan all active source files, configuration files, and data schemas in the repository.
2. Analyze the system's entry points, primary module dependencies, and external integrations.
3. Add content to workflow.project_overview as you work.

## 1. System Overview
- High-level functional purpose of the application.
- Target audience and primary use cases.
- Core business logic flows.

## 2. Architecture & Tech Stack
- Complete list of languages, frameworks, databases, and major third-party dependencies.
- High-level structural pattern used (e.g., MVC, Microservices, Clean Architecture).
- Data flow mapping from ingestion to storage.

## 3. Module & Directory Breakdown
- A visual directory tree of critical source folders.
- Detailed explanations for the responsibilities of each key module/package.

## 4. Core API & Interface Specifications
- Publicly exposed APIs, webhook listeners, or event-driven queues.
- Key function signatures, inputs, outputs, and expected error handling mechanisms.

## 5. Setup, Deployment & Testing
- Exact step-by-step local installation and environment variable configuration instructions.
- Test suites execution scripts and continuous integration deployment workflows.

## 6. Existing Documentation
- Full inventory of any existing system context, guides, or readme files

# Content Constraints
- Be explicit, factual, and strictly technical.
- Do not invent, extrapolate, or hallucinate features not found in the source code.
- Format all code blocks, variables, and path names with appropriate markdown notation.
- If a specific architecture pattern is ambiguous, state the observable code organization rather than guessing.

Stop and ask the user for guidance and clarification as needed. Once you complete your system scan and have documented your findings, inform the user and work with them to ensure that your drafted content is correct and comprehensive.

Once the document is fully populated and the user has approved the content, use attempt_completion to deliver a final recap of the work completed and end this workflow.
*** end conditional prompt segment ***
*** conditional prompt: shown only when workflow.session_objective: update existing documents ***
You have been called inside a project documentation workflow focused on updating existing documentation. The existing project documentation is located at docs/projects/agent-guidance.

Follow these steps:
1. Identify which documents exist in the documentation folder
2. Use ask_followup_question to provide the user with a list of all existing documents in the folder asking them which file they'd like to update first
3. Make revisions as needed based on the user's direction and/or any documentation they provide you with.
4. Ensure that the user has reviewed and approved all new content, then use attempt_completion to provide a final change summary and end the workflow.
*** end conditional prompt segment ***
*** conditional prompt: shown only when workflow.session_objective: add supporting documentation ***
You have been called inside a project documentation workflow focused on updating existing documentation. The existing project documentation is located at docs/projects/agent-guidance.

Follow these steps:
1. Ask the user what they'd like to add new documentation for
2. Assess existing documentation to determine whether the content the user wants to add belongs in an existing document. If so, suggest updating the existing document(s) instead of generating new files.
3. Assist them in generating the requested documentation and/or updating existing documentation in the project documentation folder (docs/projects/agent-guidance)
3. When finished, confirm that the user has reviewed and approved all new content, then use attempt_completion to provide a final change summary and end the workflow.
*** end conditional prompt ***
