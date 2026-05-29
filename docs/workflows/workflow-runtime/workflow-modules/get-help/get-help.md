# Module Metadata:
name: get-help
displayName: get help
slashcommandname: get-help
useskillname: get-help
projectSubfolder: implementation
description: Use this workflow to learn about this extension's workflows, best practices, and procedures.

# Persona
	name: "Jacob"
	role: "Customer Support"
	identity: "Support agent specialized in user onboarding and product walkthroughs"
	communicationStyle: "friendly, welcoming, and descriptive"
	capabilities: "customer support"
	principles: "listen first, then provide clear guidance to help get the user back on track"

# Prerequisite Files
None for this workflow

# Focus Chain Tasks
Step 1: Identify User Need
Step 2: Provide Requested Guidance

# Workflow Steps

## Step 1: Identify User Need

Workflow Form 1:
Panel A:
title: Select Issue
promptMarkdown: What can I help you with?
Field:
    kind: dropdown
    label: select topic
    required: true
    options:
        - I want to see the Onboarding Guide
        - Help me break my work down into one or more projects
        - Help me decide if my project is large or small
        - Remind me how to run a large project
        - Remind me how to run a small project
        - Explain a workflow to me
        - I encountered an error during a workflow
        - I don't know which workflow to run next
allowedActions/ Labels:
    - submit/ Continue

Persist the user's selection as the workflow.help_topic workflow session key, then workflow must progress to step 2.

## Step 2: Provide Requested Guidance

Workflow Form 2: Shown when workflow.help_topic: I want to see the Onboarding Guide
Panel A:
title: Onboarding Welcome
promptMarkdown: Welcome to the Onboarding Guide!
Field:
    kind: markdown_display
    label: "" (empty)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This guide will provide you with all of the information needed to understand how to use this extension effectively.
allowedActions/ Labels:
    - submit/ Continue

Panel B:
title: Workflows Introduction
promptMarkdown: Here's a brief overview of how this extension uses workflows to help you work efficiently.
Field:
    kind: markdown_display
    label: "" (empty)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This extension leverages structured workflows supported by code-driven tools & procedures with AI invocation only when absolutely necessary. This allows you to build and update your project through workflows that are reliable, fast, and token-efficient.
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back
previousWorkflowPanelId: panel A

Panel C:
title: Workflow Paths
promptMarkdown: You'll execute product updates through sequenced workflows. There are two paths you can follow- one for small projects, and one for large projects. Which one would you like to learn about first?
Field:
    kind: radio
    label: select one
    options: large project workflows, small project workflows
    required: true
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back

Persist the user's response as the workflow.sequence_choice workflow session key

Workflow Form 3:

Panel A: 
Shown in three scenarios:
    - When workflow.sequence_choice: small project workflows
    - When workflow.help_topic: I want to see the onboarding guide AND workflow.sequence_choice: large project workflows AND workflow form 4 is completed (all three conditions must be met)
    - When workflow.help_topic: Remind me how to run a small project
title: Small Project Overview
promptMarkdown: Small projects are those that are limited in scope and can be implemented in just a few dev agent passes. This path is intended for minor changes to just a few files that do not require significant refactoring or introduce new architecture.
allowedActions/ Labels:
    - submit/ Continue

Panel B: shown after panel A on "continue"
title: Small Project Workflows
promptMarkdown: When running a small project you'll run three workflows: Quick Spec, Quick Dev, and Quick Review. Some small projects will be broken into more than one implmentation phase, with each phase requiring it's own Quick Dev and Quick Review workflow run.
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back
previousWorkflowPanelId: Panel A

Panel C: shown after panel B on "continue"
title: Quick Spec Overview
promptMarkdown: The first workflow to use for a small project is the Quick Spec workflow.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: In the Quick Spec Workflow, you'll work with an AI Agent to turn your goal or concept into an implementation-ready spec with exact prescribed code revisions.
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back
previousWorkflowPanelId: Panel B

Panel D: shown after panel C on "continue"
title: Quick Dev Overview
promptMarkdown: After running Quick Spec, you'll run the Quick Dev workflow to implement your small project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: In this workflow, an AI Agent is given the spec document generated during Quick Spec and tasked with carrying out the tasks exactly as prescribed in the document. If your spec's tasks are divided into more than one phase you'll need to run this workflow once per phase.
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back
previousWorkflowPanelId: Panel C

Panel E: shown after panel D on "continue"
title: Quick Review Overview
promptMarkdown: After each phase is completed, you'll run the Quick Review workflow.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: In the Quick Review workflow, an AI Agent will assess the work completed during the Quick Dev workflow to ensure that all prescribed tasks were carried out correctly, new code meets quality standards, and that implementation didn't miss any edge cases or adjacent update sites.
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back
previousworkflowFormPanelId: Panel D

Panel F: shown after panel E on "continue"
title: Small Project Sequence
promptMarkdown: Always begin your small projects with the Quick-Spec workflow. Then, run each phase through the Quick Dev and Quick Review workflows one at a time.
allowedActions/Labels:
    - submit/ Continue (ends workflow unless it triggers workflow form 4)
    - back/ back
previousWorkflowPanelId: Panel E

Workflow Form 4:

Panel A: Shown in three scenarios:
    - When workflow.sequence_choice: large project workflows
    - When workflow.help_topic: I want to see the onboarding guide AND workflow.sequence_choice: small project workflows AND workflow form 3 is completed (all three conditions must be met)
    - When workflow.help_topic: Remind me how to run a large project
title: Large Project Overview
promptMarkdown: The large project path is for updates that introduce new architecture or require highly complex and/or broad changes across your codebase. This path uses more workflows than the small project path, but the time invested in thorugh documentation significantly improves production quality and reduces errors.
allowedActions/ Labels:
    submit/ continue

Panel B: shown after panel A on "continue"
title: Create Architecture Overview
promptMarkdown: Create Architecture is the first required workflow when implementing a large project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This workflow is the foundation of every large project. It focuses on the initial architectural decisions that will inform downstream project planning. Run this workflow once per project.
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back
previousworkflowFormPanelId: Panel A

Panel C: shown after panel B on "continue"
title: Create Epics Overview
promptMarkdown: Create Epics is the second required workflow when implementing a large project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This workflow is the bridge between concept and implementation. An AI Agent will guide you through building high-level project phases (Epics) with clear scope, requirmements, and sequencing. Run this workflow once per project.
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back
previousworkflowFormPanelId: Panel B

Panel D: shown after panel C on "continue"
title: PI Planning Overview
promptMarkdown: PI Planning is the third required workflow when implementing a large project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This workflow takes one epic from the Create Epics workflow and breaks it down into small, compile-safe delivery chunks, called stories. You must run this workflow once for each epic generated during the Create Epics workflow. 
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back
previousworkflowFormPanelId: Panel C

Panel E: Shown after panel D on "continue"
title: Create Story Overview
promptMarkdown: Create Story is the fourth required workflow when implementing a large project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This workflow takes one story and builds out a task list comprised of specific prescriptive code revisions necessary to deliver the story. The tasks are highly detailed, prescribing exact code configuration so that agents are not solving for how to turn requirements into code during implementation. You must run this workflow once for each story.
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back
previousworkflowFormPanelId: Panel D

Panel F: Shown after panel E on "continue"
title: Dev Story Overview
promptMarkdown: Dev Story is the fifth required workflow when implementing a large project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This workflow implements the prescribed tasks for one story or remediation story. You must run this workflow once for each story.
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back
previousworkflowFormPanelId: Panel E

Panel G: Shown after panel F on "continue"
title: Code Review Overview
promptMarkdown: Code Review is the sixth required workflow when implementing a large project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This workflow assesses one completed story to ensure that the dev agent completed the story’s prescribed tasks correctly, and that the completed work satisfies the story's requirements. You must run this workflow once for each completed story. If findings are surfaced during review, the workflow will generate a remediation story to be finalized via the Write Remediation Story workflow.
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back
previousworkflowFormPanelId: Panel F

Panel H: Shown after panel G on "continue"
title: Write Remediation Story Overview
promptMarkdown: Write Remediation Story is the seventh required workflow when implementing a large project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This workflow prepares a single remediation story for implementation by adding tasks. You must run this workflow once for each completed story for which there are findings generated by the Code Review workflow.
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back
previousworkflowFormPanelId: Panel G

Panel I: Shown after panel H on "continue"
title: How to Run a Large Project's Workflows
promptMarkdown: Follow this sequence when implmenting a large project.
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown:
        Start each workflow in a fresh conversation thread by using it's slash command as follows:
        1. Run Create Architecture once via "/create-architecture"
        2. Run Create Epics once via "/create-epics"
        3. Run PI Planning for the first epic via "/pi-planning"
        4. Run Create Story for the first story in the epic you just ran PI Planning for via "/create-story"
        5. Run Dev Story for the story you finalized in Create Story via "/dev-story"
        6. Run Code Review for the story you implemented in Dev Story via "/code-review"
        7. If findings surfaced during Code Review, prepare the remediation story for implementation by running Write Remediation Story via "/write-remediation-story"
        8. If you generated a new remediation story due to QA findings during Code Review, run Dev Story for the remediation story via "/dev-story". Repeat the Dev Story -> Code Review -> Write Remediation Story sequence until Code Review passes with no findings.
        9. Repeat steps 4-8 for the next story generated during the PI Planning workflow
        10. Once all stories are complete, run PI Planning for the next epic generated in the Create Epics workflow, then repeat steps 4-9.
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back
previousworkflowFormPanelId: Panel H

Panel J: Shown after panel I on "continue"
title: Sequencing Reasoning
promptMarkdown: Here's the reasoning behind the 10-step sequence we just covered.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown:
        1. Thorough documentation has been proven to improve development quality, whether you're working with human developers or AI agents
        2. Each workflow takes the documentation built by the preceding workflow(s) and builds upon it
        3. Keeping workflows tightly-scoped significantly reduces token consumption and AI agent drift caused by large context windows
        4. Large projects need a strong foundation with clear guardrails. That's where the Create Architecture and Create Epics workflows come in.
        5. It's common for new requirements to emerge, details to be refined, and exact implementation methods to be defined and refined as you work through a large project. If you ran PI Planning and Create Story for every epic and story before implementing any stories, you'll find yourself spending a lot of time rewriting your epics and stories as work progresses. Avoid that by working through one epic and one story at a time.
allowedActions/ Labels:
    - submit/ Continue
    - back/ Back
previousworkflowFormPanelId: Panel I

Panel K: Shown after panel J on "continue"
title: In Case of Emergency
promptMarkdown: The Get Help workflow is always available!
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: If you find yourself unsure of what workflow you should run next, you can always run the Get Help workflow ("/get-help") and select "Remind me how to run a large project" or "I don't know which workflow to run next" to get back on track.
allowedActions/ Labels:
    - submit/ Continue (ends workflow unless it triggers workflow form 3)
    - back/ Back
previousworkflowFormPanelId: Panel J

Workflow Form 5:

Panel A: shown when workflow.help_topic: explain a workflow to me
title: Select Workflow
promptMarkdown: Which workflow do you need information for?
Field:
    kind: dropdown
    label: select one
    helpText: omitted for this panel
    required: true
    options: Get Help, Document Project, Correct Course, Brainstorming, Create Architecture, Create Epics, PI Planning, Create Story, Dev Story, Code Review, Blind Review, Edge Case Hunter Review, Acceptance Audit Review, Write Remediation Story, Quick Spec, Quick Dev, Quick Review, Validate Story
allowedActions/ Labels:
    - submit/ continue

Set the panel A response as the workflow.workflow_explanation workflow session key.

Panel B: shown when workflow.workflow_explanation: Get Help
title: Get Help Workflow
promptMarkdown: Here's what you need to know about this workflow:
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: Get Help is designed to provide you with guidance, tutorials, and support while using this extension. Use the workflow when you need help configuring projects, classifying a project as large or small, responding to an error during a workflow, or understanding which workflow to run next.
allowedActions/ Labels:
    - submit/ End Workflow (should end workflow)
    - back/ Back
previousworkflowFormPanelId: Panel A

Panel C: shown when workflow.workflow_explanation: Document Project
title: Document Project Workflow
promptMarkdown: Here's what you need to know about this workflow:
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: - This workflow will generate basic documentation which models can refer to in the other workflows. This helps ensure that AI agents always have the right context regarding your repo, understand the expected coding standards & conventions, and don’t burn tokens hunting for that information on their own. Run this workflow before beginning your first project and in between projects to refresh documentation.
allowedActions/ Labels:
    - submit/ End Workflow (should end workflow) 
    - back/ Back
previousworkflowFormPanelId: Panel A

Panel D: shown when workflow.workflow_explanation: Correct Course
title: Correct Course Workflow
promptMarkdown: Here's what you need to know about this workflow:
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown:
        - This workflow builds an impact assessment and remediation plan when unexpected changes occur mid-project.
        - Invoked via “/correct-course”
        - Generates change-management-plan-#.md, a document summarizing the identified issue and prescribing the steps needed for remediation.
allowedActions/ Labels:
    - submit/ End Workflow (should end workflow) 
    - back/ Back
previousworkflowFormPanelId: Panel A

Panel E: shown when workflow.workflow_explanation: Brainstorming
title: Brainstorming Workflow
promptMarkdown: Here's what you need to know about this workflow:
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown:
        - This workflow guides you through an interactive brainstorming session to turn an initial thought, goal, or concept into a vetted objective that you can build a project around.
        - Invoked via “/brainstorming”
        - Generates brainstorming.md, a document containing a record of your brainstorming session with detailed notes.
allowedActions/ Labels:
    - submit/ End Workflow (should end workflow) 
    - back/ Back
previousworkflowFormPanelId: Panel A

Panel F: shown when workflow.workflow_explanation: Create Architecture
title: Create Architecture Overview
promptMarkdown: Create Architecture is the first required workflow when implementing a large project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This workflow is the foundation of every large project. It focuses on the initial architectural decisions that will inform downstream project planning. Run this workflow once per project.
allowedActions/ Labels:
    - submit/ End Workflow (should end workflow) 
    - back/ Back
previousworkflowFormPanelId: Panel A

Panel G: shown when workflow.workflow_explanation: Create Epics
title: Create Epics Overview
promptMarkdown: Create Epics is the second required workflow when implementing a large project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This workflow is the bridge between concept and implementation. An AI Agent will guide you through building high-level project phases (Epics) with clear scope, requirmements, and sequencing. Run this workflow once per project.
allowedActions/ Labels:
    - submit/ End Workflow (should end workflow) 
    - back/ Back
previousworkflowFormPanelId: Panel A

Panel H: shown when workflow.workflow_explanation: PI Planning
title: PI Planning Overview
promptMarkdown: PI Planning is the third required workflow when implementing a large project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This workflow takes one epic from the Create Epics workflow and breaks it down into small, compile-safe delivery chunks, called stories. You must run this workflow once for each epic generated during the Create Epics workflow. 
allowedActions/ Labels:
    - submit/ End Workflow (should end workflow) 
    - back/ Back
previousworkflowFormPanelId: Panel A

Panel I: shown when workflow.workflow_explanation: Create Story
title: Create Story Overview
promptMarkdown: Create Story is the fourth required workflow when implementing a large project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This workflow takes one story and builds out a task list comprised of specific prescriptive code revisions necessary to deliver the story. The tasks are highly detailed, prescribing exact code configuration so that agents are not solving for how to turn requirements into code during implementation. You must run this workflow once for each story.
allowedActions/ Labels:
    - submit/ End Workflow (should end workflow) 
    - back/ Back
previousworkflowFormPanelId: Panel a

Panel J: shown when workflow.workflow_explanation: Dev Story
title: Dev Story Overview
promptMarkdown: Dev Story is the fifth required workflow when implementing a large project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This workflow implements the prescribed tasks for one story or remediation story. You must run this workflow once for each story.
allowedActions/ Labels:
    - submit/ End Workflow (should end workflow) 
    - back/ Back
previousworkflowFormPanelId: Panel A

Panel K: shown when workflow.workflow_explanation: Code Review
title: Code Review Overview
promptMarkdown: Code Review is the sixth required workflow when implementing a large project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This workflow assesses one completed story to ensure that the dev agent completed the story’s prescribed tasks correctly, and that the completed work satisfies the story's requirements. You must run this workflow once for each completed story. If findings are surfaced during review, the workflow will generate a remediation story to be finalized via the Write Remediation Story workflow.
allowedActions/ Labels:
    - submit/ End Workflow (should end workflow) 
    - back/ Back
previousworkflowFormPanelId: Panel A

Panel L: shown when workflow.workflow_explanation: Write Remediation Story
title: Write Remediation Story Overview
promptMarkdown: Write Remediation Story is the seventh required workflow when implementing a large project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: This workflow prepares a single remediation story for implementation by adding tasks. You must run this workflow once for each completed story for which there are findings generated by the Code Review workflow.
allowedActions/ Labels:
    - submit/ End Workflow (should end workflow) 
    - back/ Back
previousworkflowFormPanelId: Panel A

Panel M: shown when workflow.workflow_explanation: Quick Spec
title: Quick Spec Overview
promptMarkdown: The first workflow to use for a small project is the Quick Spec workflow.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: In the Quick Spec Workflow, you'll work with an AI Agent to turn your goal or concept into an implementation-ready spec with exact prescribed code revisions.
allowedActions/ Labels:
    - submit/ End Workflow (should end workflow) 
    - back/ Back
previousWorkflowPanelId: Panel A

Panel N: shown when workflow.workflow_explanation: Quick Dev
title: Quick Dev Overview
promptMarkdown: After running Quick Spec, you'll run the Quick Dev workflow to implement your small project.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: In this workflow, an AI Agent is given the spec document generated during Quick Spec and tasked with carrying out the tasks exactly as prescribed in the document. If your spec's tasks are divided into more than one phase you'll need to run this workflow once per phase.
allowedActions/ Labels:
    - submit/ End Workflow (should end workflow) 
    - back/ Back
previousWorkflowPanelId: Panel A

Panel O: shown when workflow.workflow_explanation: Quick Review
title: Quick Review Overview
promptMarkdown: After each phase is completed, you'll run the Quick Review workflow.
Field:
    kind: prompt_markdown
    label: "" (empty string)
    helpText: omitted for this panel
    required: false
    contentMarkdown: In the Quick Review workflow, an AI Agent will assess the work completed during the Quick Dev workflow to ensure that all prescribed tasks were carried out correctly, new code meets quality standards, and that implementation didn't miss any edge cases or adjacent update sites.
allowedActions/ Labels:
    - submit/ End Workflow (should end workflow) 
    - back/ Back
previousworkflowFormPanelId: Panel A

### Project Definition Prompt

When workflow.help_topic: Help me break my work down into one or more projects, invoke the AI agent with this prompt:

You are assisting the user inside the Get Help workflow. The user needs help deciding whether a goal, update, or desired change should be handled as one project or split into multiple projects.

Your job is to guide the user through project-boundary reasoning. Do not implement anything, do not create files, and do not invoke other workflows. Ask clarifying questions until you can make a defensible recommendation.

A project is a coherent planning container for one meaningful product or technical outcome. Treat the work as one project when the parts share the same overall objective, depend on the same architectural direction, and belong in one roadmap of epics, stories, implementation, and review. A project can be large; do not split work into separate projects only because it contains multiple epics, multiple stories, or separately implementable chunks.

Recommend multiple projects only when the user is really describing more than one outcome: separate goals, separate products or features with different success criteria, separate architectural foundations, separate release decisions, or workstreams where planning them together would create an artificial bundle rather than a clearer delivery plan.

If the work is too broad for one coherent architecture document and one epic/story roadmap, it is likely multiple projects. If the work is broad but still shares one architectural foundation and one delivery objective, keep it as one large project.

Projects are classified into two types: large projects and small projects.

A project is classified as small when the work is limited in scope, can be captured in one implementation-ready quick spec, does not require new architectural decisions, affects a small number of files or behaviors, and can likely be implemented in one or a few Quick Dev passes.

A project is classified as large when the work requires new architectural decisions, broad or risky codebase changes, multiple epics or stories, significant sequencing, cross-cutting refactors, new durable systems, or a stronger planning foundation before implementation.

Interview the user about:
- the goal they want to accomplish
- the user-visible outcomes they expect
- whether the work touches one area or multiple unrelated areas
- whether parts of the work can ship independently
- whether one part depends on another
- whether the same architecture and planning decisions apply to all parts

When ready, call attempt_completion and include:
- a clear recommendation: one project or multiple projects
- if multiple projects, a short proposed project list with one-sentence scope for each
- the reasoning behind the boundary
- what decision the user should make next
- A suggestion regarding whether the project should be considered a large project or a small project

#### workflow must end on successful use of attempt_completion

### Project Size Prompt

When workflow.help_topic: Help me decide if my project is large or small, invoke the AI agent with this prompt:

You are assisting the user inside the Get Help workflow. The user needs help deciding whether an identified project should use the small-project workflow path or the large-project workflow path.

Your job is to classify the project size based on planning and implementation complexity. Do not implement anything, do not create files, and do not invoke other workflows. Ask clarifying questions until you can make a defensible recommendation.

Use the small-project path when the work is limited in scope, can be captured in one implementation-ready quick spec, does not require new architectural decisions, affects a small number of files or behaviors, and can likely be implemented in one or a few Quick Dev passes.

Use the large-project path when the work requires new architectural decisions, broad or risky codebase changes, multiple epics or stories, significant sequencing, cross-cutting refactors, new durable systems, or a stronger planning foundation before implementation.

If the user's goal or desired update is nebulous or loosely-defined, suggest that they run the Brainstorming workflow to refine their idea before determining whether the project is small or large.

Interview the user about:
- the project goal
- expected scope and affected areas
- whether new architecture or durable design decisions are needed
- whether the work can be delivered in one coherent implementation spec
- whether implementation can happen in one or a few dev passes
- whether the work needs epics, stories, sequencing, or repeated review cycles
- risk level if the work is planned too lightly

When ready, call attempt_completion and provide:
- a clear recommendation: small project or large project
- the reasoning behind the recommendation
- the workflow path the user should run next

For a small project, recommend starting with /quick-spec, followed by /quick-dev.

For a large project, recommend starting with /create-architecture, then /create-epics, then /pi-planning, /create-story, /dev-story, /code-review, and /write-remediation-story when review findings require remediation.

#### workflow must end on successful use of attempt_completion

### Which Workflow to Run Next Prompt

When workflow.help_topic: I don't know which workflow to run next, invoke the AI agent with this prompt:

You are assisting the user inside the Get Help workflow. The user is requesting guidance regarding which workflow to run next.

Your job is to diagnose the user's current state and recommend the next workflow they should run. Do not implement anything, do not create or modify files, and do not invoke other workflows. Ask clarifying questions until you can make a defensible recommendation.

Do not simply recite every workflow. Identify where the user is in the workflow sequence, explain the reasoning briefly, and give one recommended next workflow with its slash command.

Start by engaging the user to determine:
- Is the user working on an already-established project?
    - Is the project a small project or large project?
    - If so, what was the last workflow they completed?
    - What was the result of the last completed workflow?
- If not working on an existing project, does the user have a clear idea for what work they want to do, or just a loose concept/goal?

If the user isn't working on a project yet and needs help setting up a new project, tell them to restart the Get Help workflow and select either "Help me break my work down into one or more projects" or "Help me decide if my project is large or small".

If the user has recently installed the extension and hasn't started any projects, ask if they've run the Document Project workflow. If they haven't, they should run that workflow next.

If the user recently completed a project, they should re-run the Document Project workflow to refresh documentation.

If the user has a loose concept or idea that's not ready for implementation yet, they should run the Brainstorming workflow to pressure-test and solidify the idea or concept.

If the user has a clear vision for a new feature or update and is confident the project will be large, they should run the Create Architecture workflow.

If the user has a clear vision for a new feature or update and is confident the project will be small, they should run the Quick Spec workflow.

If the user is mid-project, you can determine what workflow they should run next based on what workflow they completed last and the documentation in the project's folders. Every project has it's own folder under docs/projects.
Here's an overview of the workflow sequences for large and small projects:

This is the intended sequence when working on a large project:
    1. Run Create Architecture once via "/create-architecture"
    2. Run Create Epics once via "/create-epics"
    3. Run PI Planning for the first epic via "/pi-planning"
    4. Run Create Story for the first story in the epic you just ran PI Planning for via "/create-story"
    5. Run Dev Story for the story you finalized in Create Story via "/dev-story"
    6. Run Code Review for the story you implemented in Dev Story via "/code-review"
    7. If findings surfaced during Code Review, prepare the remediation story for implementation by running Write Remediation Story via "/write-remediation-story"
    8. If you generated a new remediation story due to QA findings during Code Review, run Dev Story for the remediation story via "/dev-story". Repeat the Dev Story -> Code Review -> Write Remediation Story sequence until Code Review passes with no findings.
    9. Repeat steps 4-8 for the next story generated during the PI Planning workflow
    10. Once all stories are complete, run PI Planning for the next epic generated in the Create Epics workflow, then repeat steps 4-9.

This is the intended sequence when working on a small project:
    1. Run Quick Spec to generate the project's spec document
    2. Run Quick Dev for the first incomplete phase in the spec document
    3. Run Quick Review for the phase just completed via Quick Dev
    4. If Quick Review generates findings, return to the Quick Dev conversation thread and tell them to address the findings saved in the spec document
    5. Repeat steps 2-4 for each phase in the spec document

Common stop-points with recommended next workflow:

For a small project:
- If no quick spec exists, recommend Quick Spec via "/quick-spec".
- If quick-spec.md exists and implementation has not started, recommend Quick Dev via "/quick-dev".
- If quick-spec.md contains multiple implementation phases, recommend running Quick Dev once per phase.
- If Quick Dev is complete for a phase, recommend Quick Review for that completed phase via "/quick-review".
- If Quick Review finds issues that require more implementation work, recommend returning to Quick Dev via "/quick-dev" for the affected phase.

For a large project:
- If architecture.md does not exist, recommend Create Architecture via "/create-architecture".
- If architecture.md exists but Epics.md or Epics.index.json does not exist, recommend Create Epics via "/create-epics".
- If epics exist but the next epic has not been broken into stories, recommend PI Planning via "/pi-planning".
- If story files exist but the target story has not been finalized with implementation-ready tasks, recommend Create Story via "/create-story".
- If a story or remediation story is implementation-ready but not implemented, recommend Dev Story via "/dev-story".
- If a story has been implemented and the user has the completed story commit hash, recommend Code Review via "/code-review".
- If Code Review produced findings and a remediation story exists but is not implementation-ready, recommend Write Remediation Story via "/write-remediation-story".
- If a remediation story has been prepared, recommend Dev Story via "/dev-story", then Code Review again after implementation.
- If all stories in the current epic are complete, recommend PI Planning for the next epic via "/pi-planning".
- If all epics and stories are complete, tell the user there may be no next project workflow required.

If the user encountered unexpected scope, a defect, missing documentation, or a change that affects an in-flight plan, recommend Correct Course via "/correct-course" before continuing implementation.

Do not recommend Validate Story as the normal next workflow for the user. It is normally invoked by other workflows to validate implementation-ready specs or stories.

Do not recommend Blind Review, Edge Case Hunter Review, or Acceptance Audit Review as the normal next workflow unless the user specifically asks for one of those specialized review workflows. Code Review is the normal review workflow for completed large-project stories.

When ready, call attempt_completion and include:
- Recommended next workflow: [workflow name]
- Slash command: [slash command]
- Why this is the next step: [brief reasoning]
- Prerequisites to check before running it: [short checklist]
- What comes after that: [one brief next-step preview]

#### workflow must end on successful use of attempt_completion
