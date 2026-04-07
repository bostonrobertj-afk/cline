# Workflow Start Keys

## Key Definitions Draft

agent_party: The agent persona or party mode selection used to shape how an elicitation workflow engages with the user.
approach_description: A short description of the selected brainstorming or elicitation approach, stored so later steps can explain and reuse that approach consistently.
architecture_document: A document outlining the architectural expectations for a project. Used as the primary source when creating a project's Project Requirements Document.
brainstorming_session_output_file: The active brainstorming session document path where the workflow stores the session scaffold, prompts, and generated ideas.
change_trigger: A short statement describing what changed and why a corrective-planning workflow was invoked.
communication_language: The language to use when speaking to the user during the workflow.
context_file: An optional supporting document path used to ground a brainstorming or exploratory workflow.
date: The current date value used in filenames, frontmatter, or generated content.
default_output_file: The default document path a workflow should create when no custom output filename has been chosen.
deferred_work_file: A path to a file where work that should not be handled in the current pass is recorded for later follow-up.
detected_epic: The epic identifier or epic name detected from existing implementation artifacts.
diff_output: A persisted diff artifact file that captures the code changes to be reviewed or consumed by downstream review workflows.
document_output_language: The language the workflow should use when writing saved deliverable documents.
epic: A large body of work within a project that is too large to deliver within an agent's context window.
epic_delivery_spec: Defines the story structure for a single epic with basic story details. Is built from the epics document, and used when writing final deliverable stories.
epics_document: Defines the requirements, scope, roadmap, and epics for a project. Built from an architecture document, and used when building epic delivery specs.
ideas_generated: A stored marker or count indicating that brainstorming ideas have been generated and captured.
implementation_artifacts: The project folder where implementation-facing artifacts such as stories, delivery specs, sprint files, and test outputs are stored.
methods: A selected set of elicitation or brainstorming methods to use in the next step of a workflow.
mode: A workflow operating mode such as `new` or `continue` that determines whether the workflow creates new artifacts or resumes existing ones.
next_story_id: The next story identifier available for use in sprint-status or implementation planning flows.
num: A numeric epic identifier used in naming patterns such as `epic-{num}`.
outputFile: A camelCase output file path variable used in some workflows for the main generated deliverable document.
output_file: A snake_case output file path variable used in some workflows for the main generated deliverable document.
output_folder: The base folder where a workflow writes its generated artifacts and documents.
planning_artifacts: The folder where planning-stage documents such as PRDs, briefs, research outputs, and architecture docs are stored.
prd: The path to a Product Requirements Document used as a primary planning input.
prd_document: The path to a Product Requirements Document used by workflows that use the more explicit `_document` suffix.
project-root: The absolute root path of the current project workspace. This hyphenated form appears in many workflow templates.
project_context: A supporting context document or context value that helps a planning workflow understand the project domain and delivery shape.
project_knowledge: A folder or file path containing project-specific knowledge artifacts used to ground workflow behavior.
project_name: The human-readable name of the current project.
project_root: The absolute root path of the current project workspace. This underscore form appears in some workflow templates.
quality: A workflow-owned assessment value representing the current implementation-readiness or document quality judgment.
research_goals: The specific questions or goals that a research workflow should investigate.
research_topic: The main topic a research workflow should study and document.
review_input: A persisted review-input markdown document used as the primary source for several review and remediation workflows.
review_mode: A stored review mode value that determines which review path or review depth the workflow should use.
review_target: An optional code review target such as a specific file or folder that narrows the review scope.
selected_approach: The brainstorming or elicitation approach chosen for the current session.
slug: A short filesystem-safe identifier used in generated filenames.
spec_file: A supporting spec or story file path used to provide additional context to the workflow.
story: A story identifier token used in naming patterns such as `{epic}-{story}-{title}`.
story-key: A hyphenated story identifier used in some workflow naming patterns.
story_doc: The path to the story document being created or updated.
story_key: An underscore-based story identifier used in some workflow naming patterns.
story_number: The story number to be assigned to a newly created story.
story_path: The path to a story file that serves as the main input to the workflow.
target_epic: The selected epic that the workflow should focus on for downstream story or planning work.
target_file: The file the workflow should read, analyze, or use as its main subject.
test_artifacts: The folder where testing-session artifacts or generated testing outputs are stored.
time: The current time value used in generated filenames or session identifiers.
title: A human-readable title token used in naming patterns and generated identifiers.
ui_spec: The path to a UI specification document. This lowercase form appears in some workflows.
UI_spec: The path to a UI specification document. This mixed-case form appears in some workflows and should be treated as a distinct authored key unless normalized elsewhere.
user_name: The current user's name, used in generated documents or personalized workflow output.
user_skill_level: A value describing the user's skill level so the workflow can adapt tone, depth, or output complexity.
ux_spec: The path to a UX specification document. This lowercase form appears in some workflows.
UX_spec: The path to a UX specification document. This mixed-case form appears in some workflows and should be treated as a distinct authored key unless normalized elsewhere.
validation_report_path: The output path where a PRD or deliverable validation report is written.
wipFile: A camelCase work-in-progress file path used in quick-spec and quick-dev preview workflows.
workflow_completed: A stored completion flag used to indicate that the workflow has reached its terminal state.
workflow_status: A stored workflow status value used to reflect the current corrective-planning or progress state.

## Workflow Inventory

### advanced-elicitation.md

- `target_file`
- `project-root`
- `agent_party`
- `methods`

### blind-review.md

- `diff_output`
- `output_folder`

### brainstorming.md

- `context_file`
- `brainstorming_session_output_file`
- `output_folder`
- `date`
- `time`
- `project-root`
- `selected_approach`
- `approach_description`
- `ideas_generated`
- `workflow_completed`

### check-implementation-readiness.md

- `output_folder`
- `project-root`
- `output_file`
- `quality`

### cis-design-thinking.md

- `project-root`

### cis-innovation-strategy.md

- `project-root`

### cis-problem-solving.md

- `project-root`

### cis-storytelling.md

- `project-root`
- `project_name`
- `output_folder`
- `user_name`
- `communication_language`
- `document_output_language`
- `date`
- `default_output_file`

### code-review.md

- `story_path`
- `review_target`
- `output_folder`
- `review_input`
- `review_mode`
- `diff_output`

### correct-course.md

- `output_folder`
- `project-root`
- `mode`
- `change_trigger`
- `planning_artifacts`
- `date`
- `output_file`
- `workflow_status`
- `architecture_document`
- `prd_document`
- `UI_spec`
- `UX_spec`

### create-architecture.md

- `planning_artifacts`
- `output_folder`
- `project_root`
- `output_file`
- `date`

### create-epics.md

- `architecture_document`
- `prd`
- `mode`
- `ux_spec`
- `ui_spec`
- `project-root`
- `output_folder`
- `output_file`
- `planning_artifacts`

### create-prd.md

- `architecture_document`
- `mode`
- `prd`
- `output_folder`
- `project-root`
- `project_context`
- `output_file`

### create-product-brief.md

- `project-root`
- `project_name`
- `output_folder`
- `planning_artifacts`
- `user_name`
- `communication_language`
- `document_output_language`
- `user_skill_level`
- `outputFile`
- `date`
- `project_knowledge`

### create-story.md

- `epic_delivery_spec`
- `story_number`
- `output_folder`
- `project_root`
- `story_doc`
- `epics_document`
- `architecture_document`
- `implementation_artifacts`
- `story_key`
- `project-root`

### create-ux-design.md

- `planning_artifacts`
- `project-root`
- `output_folder`
- `project_knowledge`
- `communication_language`
- `document_output_language`

### dev-story.md

- `story_path`

### distillator.md

- `project-root`

### document-project.md

- `project_knowledge`
- `user_name`
- `communication_language`
- `document_output_language`
- `user_skill_level`
- `date`
- `project-root`

### domain-research.md

- `project-root`
- `project_name`
- `planning_artifacts`
- `output_folder`
- `user_name`
- `communication_language`
- `document_output_language`
- `research_topic`
- `research_goals`
- `date`
- `outputFile`

### edit-prd.md

- `project-root`

### editorial-review-prose.md

- No `{...}` / directive-line workflow variables found.

### editorial-review-structure.md

- No `{...}` / directive-line workflow variables found.

### generate-project-context.md

- `project-root`
- `output_folder`

### help.md

- `project-root`
- `communication_language`

### index-docs.md

- No `{...}` / directive-line workflow variables found.

### market-research.md

- `outputFile`
- `planning_artifacts`
- `research_topic`
- `date`
- `project-root`
- `document_output_language`

### party-mode.md

- `project-root`
- `communication_language`

### pi-planning.md

- `epics_document`
- `architecture_document`
- `epic_delivery_spec`
- `target_epic`
- `output_folder`
- `project_root`

### qa-generate-e2e-tests.md

- `project-root`
- `implementation_artifacts`

### quick-dev-new-preview.md

- `wipFile`
- `implementation_artifacts`
- `planning_artifacts`
- `spec_file`
- `project-root`
- `deferred_work_file`

### quick-dev.md

- No `{...}` / directive-line workflow variables found.

### quick-spec.md

- `wipFile`
- `implementation_artifacts`
- `planning_artifacts`
- `project-root`
- `slug`

### retrospective.md

- `implementation_artifacts`
- `detected_epic`

### review-adversarial-general.md

- `diff_output`
- `review_input`
- `spec_file`
- `output_folder`

### review-edge-case-hunter.md

- `review_input`
- `diff_output`
- `output_folder`

### shard-doc.md

- No `{...}` / directive-line workflow variables found.

### sprint-planning.md

- `project-root`
- `planning_artifacts`
- `num`
- `epic`
- `story`
- `title`
- `implementation_artifacts`
- `story-key`

### sprint-status.md

- `implementation_artifacts`
- `next_story_id`

### teach-me-testing.md

- `project-root`
- `test_artifacts`
- `date`

### technical-research.md

- `outputFile`
- `planning_artifacts`
- `research_topic`
- `date`
- `project-root`
- `document_output_language`
- `communication_language`

### validate-prd.md

- `project-root`
- `planning_artifacts`
- `validation_report_path`

### write-remediation-story.md

- `story_path`
- `review_input`
- `output_folder`
- `project_context`
