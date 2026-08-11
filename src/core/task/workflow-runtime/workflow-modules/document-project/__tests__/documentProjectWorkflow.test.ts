import type { WorkflowFormTransitionDefinition } from "@shared/ExtensionMessage"
import { expect } from "chai"
import { describe, it } from "mocha"
import { WORKFLOW_ARTIFACT_FAMILY_REGISTRY, WorkflowArtifactFamily } from "../../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowBranchTriggerEvent,
	WorkflowDecisionBranchEvaluationInput,
	WorkflowDecisionBranchRoute,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowValues,
} from "../../../types"
import {
	resolveWorkflowBySlashCommand,
	resolveWorkflowByUseSkillName,
	resolveWorkflowDefinition,
} from "../../../WorkflowRegistry"
import { renderWorkflowPromptTemplate } from "../../../workflowPromptTemplates"
import {
	buildDocumentProjectStep1ToolSchemas,
	buildDocumentProjectStep2ToolSchemas,
	buildDocumentProjectStep3ToolSchemas,
	buildDocumentProjectStep4ToolSchemas,
} from "../documentProjectToolSchemas"
import {
	buildDocumentProjectStep1WorkflowForm,
	buildDocumentProjectStep3WorkflowForm,
	DOCUMENT_PROJECT_ARTIFACTS,
	DOCUMENT_PROJECT_BASELINE_DATA_TERMINAL_ERROR,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_ALLOCATION_TERMINAL_ERROR,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_BUILD_TERMINAL_ERROR,
	DOCUMENT_PROJECT_DOCUMENTATION_TASK_TERMINAL_ERROR,
	DOCUMENT_PROJECT_ENTRY_PROJECT_VALUE_KEYS,
	DOCUMENT_PROJECT_ENTRY_PROMPT,
	DOCUMENT_PROJECT_PREREQUISITE_FILES,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_ALLOCATION_TERMINAL_ERROR,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_BUILD_TERMINAL_ERROR,
	DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR,
	DOCUMENT_PROJECT_STEP_1_FORM_ID,
	DOCUMENT_PROJECT_STEP_1_PANEL_A_ID,
	DOCUMENT_PROJECT_STEP_1_PANEL_B_ID,
	DOCUMENT_PROJECT_STEP_1_PANEL_C_ID,
	DOCUMENT_PROJECT_STEP_1_PANEL_D_ID,
	DOCUMENT_PROJECT_STEP_3_FORM_ID,
	DOCUMENT_PROJECT_STEP_3_PANEL_A_ID,
	DOCUMENT_PROJECT_STEP_3_PANEL_B_ID,
	DOCUMENT_PROJECT_STEP_3_PANEL_C_ID,
	DOCUMENT_PROJECT_STEP_3_PANEL_D_ID,
	DOCUMENT_PROJECT_STEP_3_PANEL_E_ID,
	DOCUMENT_PROJECT_STEP_3_PANEL_F_ID,
	DOCUMENT_PROJECT_STEP_3_PANEL_G_ID,
	DOCUMENT_PROJECT_STEP_3_PANEL_H_ID,
	DOCUMENT_PROJECT_STEP_3_PANEL_I_ID,
	DOCUMENT_PROJECT_STEP_3_PANEL_J_ID,
	DOCUMENT_PROJECT_STEP_3_PANEL_K_ID,
	DOCUMENT_PROJECT_STEP_3_PANEL_L_ID,
	DOCUMENT_PROJECT_WORKFLOW_DESCRIPTION,
	DOCUMENT_PROJECT_WORKFLOW_DISPLAY_NAME,
	DOCUMENT_PROJECT_WORKFLOW_NAME,
	DOCUMENT_PROJECT_WORKFLOW_PERSONA,
	DOCUMENT_PROJECT_WORKFLOW_SLASH_COMMAND_NAME,
	DOCUMENT_PROJECT_WORKFLOW_USE_SKILL_NAME,
	DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS,
	DocumentProjectWorkflowValueKey,
	documentProjectWorkflowDefinition,
} from "../documentProjectWorkflow"

const DOCUMENT_PROJECT_STEP_4_RAW_PLACEHOLDERS = [
	"{workflow.api_indicator}",
	"{workflow.database_indicator}",
	"{workflow.deployment_indicator}",
	"{workflow.developer_guide}",
	"{workflow.known_issues}",
	"{workflow.planned_enhancements}",
	"{workflow.primary_programming_language}",
	"{workflow.product_type}",
	"{workflow.project_overview}",
	"{workflow.recent_project}",
	"{workflow.repo_status}",
	"{workflow.repo_type}",
	"{workflow.state_management_indicator}",
	"{workflow.ui_indicator}",
] as const

const FORBIDDEN_MODEL_FACING_TOOL_NAMES: readonly string[] = [
	"workflow_progress_request",
	"replace_in_file",
	"browser_action",
	"use_mcp_tool",
	"access_mcp_resource",
	"load_mcp_documentation",
	"new_task",
	"generate_plan_output",
	"act_mode_respond",
	"focus_chain",
	"web_fetch",
	"web_search",
	"condense",
	"summarize_task",
	"report_bug",
	"new_rule",
	"generate_explanation",
	"use_skill",
	"set_workflow_values",
	"build_workflow_document",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
	"resolve_existing_project_artifact",
	"validate_story_index_entry",
	"get_brainstorming_methods",
	"append_brainstorming_selected_technique",
	"upsert_epic",
	"plan_story_artifacts",
	"plan_remediation_story_artifact",
	"generate_story_files",
	"update_story_index_status",
	"dev_story_git_finalize",
	"record_findings",
	"story_task_reminder",
	"story_task_complete",
	"request_task_detail",
	"show_incomplete_tasks",
	"use_subagents",
]

const DOCUMENT_PROJECT_SOURCE_AUTHORING_MARKERS = [
	"# Module metadata:",
	"# Persona",
	"# Tool Schema Override",
	"# Workflow Steps",
	"### Prompt:",
	"*** conditional prompt",
	"*** conditional prompt segment",
	"*** end conditional prompt",
	"*** end conditional prompt segment",
	"Panel A:",
	"Field:",
	"allowedActions/ Labels:",
] as const

const DOCUMENT_PROJECT_STEP_4_REQUIRED_BRANCH_VALUE_KEYS = [
	{
		projectOverviewCreationRequired: true,
		developerGuideCreationRequired: true,
		stringKeys: [
			DocumentProjectWorkflowValueKey.RepoType,
			DocumentProjectWorkflowValueKey.ProductType,
			DocumentProjectWorkflowValueKey.PrimaryProgrammingLanguage,
			DocumentProjectWorkflowValueKey.RepoStatus,
			DocumentProjectWorkflowValueKey.RecentProject,
			DocumentProjectWorkflowValueKey.PlannedEnhancements,
			DocumentProjectWorkflowValueKey.KnownIssues,
		],
		booleanKeys: [
			DocumentProjectWorkflowValueKey.ApiIndicator,
			DocumentProjectWorkflowValueKey.DatabaseIndicator,
			DocumentProjectWorkflowValueKey.StateManagementIndicator,
			DocumentProjectWorkflowValueKey.UiIndicator,
			DocumentProjectWorkflowValueKey.DeploymentIndicator,
		],
	},
	{
		projectOverviewCreationRequired: true,
		developerGuideCreationRequired: false,
		stringKeys: [
			DocumentProjectWorkflowValueKey.RepoType,
			DocumentProjectWorkflowValueKey.ProductType,
			DocumentProjectWorkflowValueKey.PrimaryProgrammingLanguage,
			DocumentProjectWorkflowValueKey.RepoStatus,
		],
		booleanKeys: [
			DocumentProjectWorkflowValueKey.ApiIndicator,
			DocumentProjectWorkflowValueKey.DatabaseIndicator,
			DocumentProjectWorkflowValueKey.StateManagementIndicator,
			DocumentProjectWorkflowValueKey.UiIndicator,
			DocumentProjectWorkflowValueKey.DeploymentIndicator,
		],
	},
	{
		projectOverviewCreationRequired: false,
		developerGuideCreationRequired: true,
		stringKeys: [
			DocumentProjectWorkflowValueKey.RecentProject,
			DocumentProjectWorkflowValueKey.PlannedEnhancements,
			DocumentProjectWorkflowValueKey.KnownIssues,
		],
		booleanKeys: [],
	},
] as const

function getStep(stepNumber: 1 | 2 | 3 | 4): WorkflowStepDefinition {
	const step = documentProjectWorkflowDefinition.steps[`step-${stepNumber}`]
	if (step === undefined) {
		throw new Error(`Expected Document Project step ${stepNumber}.`)
	}

	return step
}

function findStepRoute(stepNumber: 1 | 2 | 3 | 4, branchId: string, routeId: string): WorkflowDecisionBranchRoute {
	const route = getStep(stepNumber).decisionTree.branches[branchId]?.routes.find((candidate) => candidate.id === routeId)
	if (route === undefined) {
		throw new Error(`Expected Document Project route ${branchId}/${routeId} in step ${stepNumber}.`)
	}

	return route
}

function createDocumentProjectSession(workflowValues: WorkflowValues): ActiveWorkflowSession {
	return {
		activeStepNumber: 1,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Agent Guidance",
			projectFolderName: "agent-guidance",
		},
		lifecycle: { projectSelectionCompleted: true },
		entryArtifactResolution: undefined,
		prerequisiteFileResolutions: [],
		ui: {
			formSession: undefined,
			stepResolutionSession: undefined,
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext: { activeBranchId: getStep(1).decisionTree.entryBranchId },
	}
}

function createDocumentProjectPromptBuilderInput(
	stepNumber: 1 | 2 | 3 | 4,
	workflowValues: WorkflowValues,
): WorkflowPromptBuilderInput {
	const step = getStep(stepNumber)
	const session = createDocumentProjectSession(workflowValues)
	return {
		step,
		session: {
			...session,
			activeStepNumber: stepNumber,
			branchContext: { activeBranchId: step.decisionTree.entryBranchId },
		},
	}
}

function routeMatches(
	route: WorkflowDecisionBranchRoute,
	session: ActiveWorkflowSession,
	triggerEvent?: WorkflowBranchTriggerEvent,
): boolean {
	const step = documentProjectWorkflowDefinition.steps[`step-${session.activeStepNumber}`]
	if (step === undefined) {
		return false
	}
	const input: WorkflowDecisionBranchEvaluationInput = {
		activeBranchId: session.branchContext.activeBranchId,
		workflowValues: session.workflowValues,
		step,
		session,
	}

	switch (route.trigger.kind) {
		case "always":
			return true
		case "on_event":
			return triggerEvent?.kind === route.trigger.eventKind
		case "session_predicate":
			return route.trigger.matches(input)
		case "event_predicate":
			return triggerEvent === undefined ? false : route.trigger.matches({ ...input, triggerEvent })
	}
}

function createDocumentProjectBranchSession(args: {
	stepNumber: 1 | 2 | 3 | 4
	branchId: string
	workflowValues: WorkflowValues
	prerequisiteFileResolutions?: ActiveWorkflowSession["prerequisiteFileResolutions"]
}): ActiveWorkflowSession {
	const session = createDocumentProjectSession(args.workflowValues)
	return {
		...session,
		activeStepNumber: args.stepNumber,
		prerequisiteFileResolutions: args.prerequisiteFileResolutions ?? [],
		branchContext: { activeBranchId: args.branchId },
	}
}

function summarizeRoute(route: WorkflowDecisionBranchRoute): object {
	const action = route.action
	let actionSummary: object
	switch (action.kind) {
		case "resolve_prerequisite_files":
			actionSummary = { kind: action.kind, prerequisiteIds: action.prerequisiteIds }
			break
		case "run_deterministic_procedure":
			actionSummary = { kind: action.kind }
			break
		case "render_workflow_form":
			actionSummary = {
				kind: action.kind,
				workflowFormId: action.workflowFormId,
				startPanelId: "startPanelId" in action ? action.startPanelId : undefined,
				hasBuildSessionData: "buildSessionData" in action,
			}
			break
		case "transition_step":
			actionSummary = { kind: action.kind, target: action.target }
			break
		case "allocate_artifact":
			actionSummary = { kind: action.kind, artifactId: action.artifactId }
			break
		case "build_workflow_document":
			actionSummary = { kind: action.kind, artifactId: action.instruction.artifactId }
			break
		case "terminal_error":
			actionSummary = { kind: action.kind, errorMessage: action.errorMessage }
			break
		default:
			actionSummary = { kind: action.kind }
	}

	return {
		id: route.id,
		triggerKind: route.trigger.kind,
		action: actionSummary,
		followingBranchId: route.followingBranchId,
	}
}

function createValidDocumentProjectStep4Values(args: {
	projectOverviewCreationRequired: boolean
	developerGuideCreationRequired: boolean
	sessionObjective?: "Update existing documents" | "Add supporting documentation"
}): WorkflowValues {
	const workflowValues: WorkflowValues = {
		[DocumentProjectWorkflowValueKey.ProjectOverview]: "/test/project/docs/projects/agent-guidance/project-overview.md",
		[DocumentProjectWorkflowValueKey.DeveloperGuide]: "/test/project/docs/projects/agent-guidance/developer-guide.md",
		[DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired]: args.projectOverviewCreationRequired,
		[DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired]: args.developerGuideCreationRequired,
		[DocumentProjectWorkflowValueKey.RepoType]: "Monorepo test value",
		[DocumentProjectWorkflowValueKey.ProductType]: "extension test value",
		[DocumentProjectWorkflowValueKey.PrimaryProgrammingLanguage]: "TypeScript test value",
		[DocumentProjectWorkflowValueKey.RepoStatus]: "Brownfield test value",
		[DocumentProjectWorkflowValueKey.ApiIndicator]: true,
		[DocumentProjectWorkflowValueKey.DatabaseIndicator]: false,
		[DocumentProjectWorkflowValueKey.StateManagementIndicator]: true,
		[DocumentProjectWorkflowValueKey.UiIndicator]: false,
		[DocumentProjectWorkflowValueKey.DeploymentIndicator]: true,
		[DocumentProjectWorkflowValueKey.RecentProject]: "Recent project test value",
		[DocumentProjectWorkflowValueKey.PlannedEnhancements]: "Planned enhancements test value",
		[DocumentProjectWorkflowValueKey.KnownIssues]: "Known issues test value",
	}
	if (args.sessionObjective !== undefined) {
		workflowValues[DocumentProjectWorkflowValueKey.SessionObjective] = args.sessionObjective
	}
	return workflowValues
}

describe("documentProjectWorkflow", () => {
	it("defines the exact Document Project metadata and structural contracts", () => {
		expect(documentProjectWorkflowDefinition.name).to.equal(DOCUMENT_PROJECT_WORKFLOW_NAME)
		expect(documentProjectWorkflowDefinition.displayName).to.equal(DOCUMENT_PROJECT_WORKFLOW_DISPLAY_NAME)
		expect(documentProjectWorkflowDefinition.slashCommandName).to.equal(DOCUMENT_PROJECT_WORKFLOW_SLASH_COMMAND_NAME)
		expect(documentProjectWorkflowDefinition.useSkillName).to.equal(DOCUMENT_PROJECT_WORKFLOW_USE_SKILL_NAME)
		expect(documentProjectWorkflowDefinition.description).to.equal(DOCUMENT_PROJECT_WORKFLOW_DESCRIPTION)
		expect(documentProjectWorkflowDefinition.entryPanel).to.deep.equal({ promptMarkdown: DOCUMENT_PROJECT_ENTRY_PROMPT })
		expect(DOCUMENT_PROJECT_WORKFLOW_NAME).to.equal("document-project")
		expect(DOCUMENT_PROJECT_WORKFLOW_DISPLAY_NAME).to.equal("document project")
		expect(DOCUMENT_PROJECT_WORKFLOW_SLASH_COMMAND_NAME).to.equal("document-project")
		expect(DOCUMENT_PROJECT_WORKFLOW_USE_SKILL_NAME).to.equal("document-project")
		expect(DOCUMENT_PROJECT_WORKFLOW_DESCRIPTION).to.equal(
			"This workflow builds and/or updates documentation to leverage as context while planning and implementing development projects. It focuses on a developer guide and project overview which together explain the nature of your project as well as your preferences and rules for working in the repo.",
		)
		expect(DOCUMENT_PROJECT_ENTRY_PROMPT).to.equal(
			"In this workflow, you'll generate or update the developer guide and project overview, which are used in other workflows to provide agents with context regarding your project and ways of working.",
		)
		expect(documentProjectWorkflowDefinition.persona).to.deep.equal(DOCUMENT_PROJECT_WORKFLOW_PERSONA)
		expect(DOCUMENT_PROJECT_WORKFLOW_PERSONA).to.deep.equal({
			name: "Mary",
			role: "Technical Writer",
			identity: "producing product documentation for developer teams.",
			capabilities: ["product analysis", "technical documentation"],
			communicationStyle: "crisp, checklist-driven, and ambiguity-free.",
			principles: ["Developers do their best work when they have comprehenvise product documentation at their disposal."],
		})
		expect(documentProjectWorkflowDefinition.projectSelection).to.deep.equal({
			kind: "automatic_fixed",
			projectTitle: "Agent Guidance",
			projectFolderName: "agent-guidance",
		})
		expect(documentProjectWorkflowDefinition.projectOutputPlacement).to.deep.equal({ kind: "selected_project_root" })
		expect(documentProjectWorkflowDefinition.entryProjectValueKeys).to.deep.equal(DOCUMENT_PROJECT_ENTRY_PROJECT_VALUE_KEYS)
		expect(DOCUMENT_PROJECT_ENTRY_PROJECT_VALUE_KEYS).to.deep.equal({
			projectMode: "projectMode",
			projectTitle: "projectTitle",
			projectFolderName: "projectFolderName",
		})
		expect(documentProjectWorkflowDefinition.workflowValueKeys).to.deep.equal(DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS)
		expect(DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS).to.deep.equal([
			"projectMode",
			"projectTitle",
			"projectFolderName",
			"project_overview_artifact_family",
			"project_overview_artifact_identity",
			"project_overview_artifact_filename",
			"project_overview_artifact_relative_path",
			"project_overview",
			"developer_guide_artifact_family",
			"developer_guide_artifact_identity",
			"developer_guide_artifact_filename",
			"developer_guide_artifact_relative_path",
			"developer_guide",
			"project_overview_creation_required",
			"developer_guide_creation_required",
			"session_objective",
			"repo_type",
			"product_type",
			"primary_programming_language",
			"repo_status",
			"api_indicator",
			"database_indicator",
			"state_management_indicator",
			"ui_indicator",
			"deployment_indicator",
			"recent_project",
			"planned_enhancements",
			"known_issues",
		])
		expect(DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS).to.have.length(28)
		expect(Reflect.has(documentProjectWorkflowDefinition, "aiWritableWorkflowValueKeys")).to.equal(false)
		expect(documentProjectWorkflowDefinition.childInheritance).to.equal(undefined)
		expect(documentProjectWorkflowDefinition.name).not.to.equal("document-project.md")
		expect(documentProjectWorkflowDefinition.slashCommandName).not.to.equal("document-project.md")
		expect(documentProjectWorkflowDefinition.useSkillName).not.to.equal("document-project.md")
		expect(Object.hasOwn(documentProjectWorkflowDefinition, "projectSubfolder")).to.equal(false)
		expect(Object.values(documentProjectWorkflowDefinition.steps).map((step) => step.checklistLabel)).to.deep.equal([
			"Identify Session Objective",
			"Document Generation",
			"Identify Baseline Data",
			"Support System Documentation",
		])
	})

	it("defines the exact singleton artifacts and family records", () => {
		expect(documentProjectWorkflowDefinition.artifacts).to.deep.equal(DOCUMENT_PROJECT_ARTIFACTS)
		expect(DOCUMENT_PROJECT_ARTIFACTS).to.deep.equal({
			project_overview: {
				id: "project_overview",
				family: WorkflowArtifactFamily.ProjectOverview,
				intentMode: "new",
				parentIdentitySource: undefined,
				targetIdentitySource: undefined,
				outputValueKeys: {
					projectTitle: "projectTitle",
					projectFolderName: "projectFolderName",
					artifactFamily: "project_overview_artifact_family",
					artifactIdentity: "project_overview_artifact_identity",
					artifactFilename: "project_overview_artifact_filename",
					artifactRelativePath: "project_overview_artifact_relative_path",
					artifactAbsolutePath: "project_overview",
					parentIdentity: undefined,
					targetIdentity: undefined,
				},
			},
			developer_guide: {
				id: "developer_guide",
				family: WorkflowArtifactFamily.DeveloperGuide,
				intentMode: "new",
				parentIdentitySource: undefined,
				targetIdentitySource: undefined,
				outputValueKeys: {
					projectTitle: "projectTitle",
					projectFolderName: "projectFolderName",
					artifactFamily: "developer_guide_artifact_family",
					artifactIdentity: "developer_guide_artifact_identity",
					artifactFilename: "developer_guide_artifact_filename",
					artifactRelativePath: "developer_guide_artifact_relative_path",
					artifactAbsolutePath: "developer_guide",
					parentIdentity: undefined,
					targetIdentity: undefined,
				},
			},
		})
		expect(WORKFLOW_ARTIFACT_FAMILY_REGISTRY[WorkflowArtifactFamily.ProjectOverview]).to.deep.equal({
			family: WorkflowArtifactFamily.ProjectOverview,
			allocationMode: "singleton_project",
			identityRequirement: "none",
			filenamePattern: "project-overview.md",
			fileExtension: ".md",
			contentKind: "markdown",
			numberingScope: "project_singleton",
			singletonIdentity: "project_overview",
			discoveryPattern: /^project-overview\.md$/,
		})
		expect(WORKFLOW_ARTIFACT_FAMILY_REGISTRY[WorkflowArtifactFamily.DeveloperGuide]).to.deep.equal({
			family: WorkflowArtifactFamily.DeveloperGuide,
			allocationMode: "singleton_project",
			identityRequirement: "none",
			filenamePattern: "developer-guide.md",
			fileExtension: ".md",
			contentKind: "markdown",
			numberingScope: "project_singleton",
			singletonIdentity: "developer_guide",
			discoveryPattern: /^developer-guide\.md$/,
		})
	})

	it("defines the exact ordered deterministic prerequisites", () => {
		expect(Object.keys(DOCUMENT_PROJECT_PREREQUISITE_FILES)).to.deep.equal(["project_overview", "developer_guide"])
		expect(documentProjectWorkflowDefinition.prerequisiteFiles).to.deep.equal(DOCUMENT_PROJECT_PREREQUISITE_FILES)
		expect(DOCUMENT_PROJECT_PREREQUISITE_FILES).to.deep.equal({
			project_overview: {
				id: "project_overview",
				requirement: "optional",
				resolutionMode: "deterministic_exact_filename",
				projectSubfolderSegments: [],
				match: { kind: "exact_filename", filename: "project-overview.md" },
				producingWorkflowName: "document-project",
				workflowValueKey: "project_overview",
				outputDocumentReference: "none",
				artifactId: "project_overview",
			},
			developer_guide: {
				id: "developer_guide",
				requirement: "optional",
				resolutionMode: "deterministic_exact_filename",
				projectSubfolderSegments: [],
				match: { kind: "exact_filename", filename: "developer-guide.md" },
				producingWorkflowName: "document-project",
				workflowValueKey: "developer_guide",
				outputDocumentReference: "none",
				artifactId: "developer_guide",
			},
		})
	})

	it("builds and registers the exact Step 1 workflow form", () => {
		const terminalTransition = {
			type: "conditional",
			conditionSourceKey: "__terminal__",
			branches: [],
			defaultTerminal: true,
		}
		const expectedForm = {
			definitionVersion: 2,
			title: "Confirm Document Generation",
			toolDictionaryTitle: "",
			toolDictionaryMarkdown: "",
			firstPanelId: DOCUMENT_PROJECT_STEP_1_PANEL_A_ID,
			panels: {
				[DOCUMENT_PROJECT_STEP_1_PANEL_A_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_1_PANEL_A_ID,
					title: "Full Scan Needed",
					promptMarkdown:
						"The Agent Guidance folder exists, but it’s currently empty. I’ll proceed with a full scan to generate the necessary repo documentation.",
					fields: [],
					allowedActions: ["submit"],
					actionLabels: { submit: "continue" },
					transition: terminalTransition,
				},
				[DOCUMENT_PROJECT_STEP_1_PANEL_B_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_1_PANEL_B_ID,
					title: "Missing Project Overview",
					promptMarkdown:
						"The required Project Overview document is missing from the Agent Guidance folder in this repo. I'll generate that file for you during this workflow.",
					fields: [],
					allowedActions: ["submit"],
					actionLabels: { submit: "continue" },
					transition: terminalTransition,
				},
				[DOCUMENT_PROJECT_STEP_1_PANEL_C_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_1_PANEL_C_ID,
					title: "Missing Developer Guide",
					promptMarkdown:
						"The required Developer Guide document is missing from the Agent Guidance folder in this repo. I'll generate that file for you during this workflow.",
					fields: [],
					allowedActions: ["submit"],
					actionLabels: { submit: "continue" },
					transition: terminalTransition,
				},
				[DOCUMENT_PROJECT_STEP_1_PANEL_D_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_1_PANEL_D_ID,
					title: "Clarify Intent",
					promptMarkdown: "It looks like the foundational reference documents are in place. What would you like to do?",
					fields: [
						{
							key: "session_objective",
							workflowValueKey: "session_objective",
							kind: "dropdown",
							label: "Select One",
							required: true,
							allowedValueType: "string",
							options: [
								{ value: "Update existing documents", label: "Update existing documents" },
								{ value: "Add supporting documentation", label: "Add supporting documentation" },
							],
						},
					],
					allowedActions: ["submit"],
					actionLabels: { submit: "continue" },
					transition: terminalTransition,
				},
			},
		}

		const form = buildDocumentProjectStep1WorkflowForm()
		expect(form).to.deep.equal(expectedForm)
		expect(documentProjectWorkflowDefinition.workflowForms?.[DOCUMENT_PROJECT_STEP_1_FORM_ID]).to.deep.equal(expectedForm)
		const panelDField = form.panels[DOCUMENT_PROJECT_STEP_1_PANEL_D_ID].fields[0]
		expect(panelDField?.selectionCardinality ?? "single").to.equal("single")
		expect(Object.hasOwn(panelDField ?? {}, "selectionCardinality")).to.equal(false)
	})

	it("builds and registers the exact Step 3 workflow form", () => {
		const submit = { allowedActions: ["submit"], actionLabels: { submit: "continue" } }
		const options = (values: readonly string[]) => values.map((value) => ({ value, label: value }))
		const expectedForm = {
			definitionVersion: 2,
			title: "Gather Baseline Project Data",
			toolDictionaryTitle: "",
			toolDictionaryMarkdown: "",
			firstPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_A_ID,
			panels: {
				[DOCUMENT_PROJECT_STEP_3_PANEL_A_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_3_PANEL_A_ID,
					title: "Repository Type",
					promptMarkdown: "Please select which of the following best describes this repository.",
					fields: [
						{
							key: "repo_type",
							workflowValueKey: "repo_type",
							kind: "dropdown",
							label: "Select One",
							required: true,
							allowedValueType: "string",
							options: options([
								"Monolith: Single cohesive codebase",
								"Monorepo: Multiple parts in one repository",
								"Multi-part: Separate client/server or similar architecture",
							]),
						},
					],
					...submit,
					transition: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_B_ID },
				},
				[DOCUMENT_PROJECT_STEP_3_PANEL_B_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_3_PANEL_B_ID,
					title: "Project Type",
					promptMarkdown: "Which of the following best matches this product's niche?",
					fields: [
						{
							key: "product_type",
							workflowValueKey: "product_type",
							kind: "dropdown",
							label: "Select One",
							required: true,
							allowedValueType: "string",
							options: options([
								"healthcare",
								"fintech",
								"govtech",
								"edtech",
								"aerospace",
								"automotive",
								"scientific",
								"legaltech",
								"insurtech",
								"energy",
								"process control",
								"building automation",
								"gaming",
								"entertainment",
								"mobile application",
								"web application",
								"desktop application",
								"CLI",
								"library",
								"extension",
								"infrastructure",
								"other",
							]),
						},
					],
					...submit,
					transition: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_C_ID },
				},
				[DOCUMENT_PROJECT_STEP_3_PANEL_C_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_3_PANEL_C_ID,
					title: "Primary Language",
					promptMarkdown: "What is this project's primary programming language?",
					fields: [
						{
							key: "primary_programming_language",
							workflowValueKey: "primary_programming_language",
							kind: "small_text",
							label: "Select One",
							required: true,
							allowedValueType: "string",
						},
					],
					...submit,
					transition: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_D_ID },
				},
				[DOCUMENT_PROJECT_STEP_3_PANEL_D_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_3_PANEL_D_ID,
					title: "Repo Status",
					promptMarkdown: "Is this a Greenfield or Brownfield project?",
					fields: [
						{
							key: "repo_status",
							workflowValueKey: "repo_status",
							kind: "radio_group",
							label: "Select One",
							required: true,
							allowedValueType: "string",
							selectionCardinality: "single",
							options: options([
								"Greenfield: Brand-new project with minimal files/folders in place",
								"Brownfield: Established project with existing architecture",
							]),
						},
					],
					...submit,
					transition: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_E_ID },
				},
				[DOCUMENT_PROJECT_STEP_3_PANEL_E_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_3_PANEL_E_ID,
					title: "API Usage",
					promptMarkdown: "Does your product leverage internal or external APIs?",
					fields: [
						{
							key: "api_indicator",
							workflowValueKey: "api_indicator",
							kind: "boolean",
							label: "Select One",
							required: true,
							allowedValueType: "boolean",
						},
					],
					...submit,
					transition: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_F_ID },
				},
				[DOCUMENT_PROJECT_STEP_3_PANEL_F_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_3_PANEL_F_ID,
					title: "Data Models",
					promptMarkdown: "Does your product leverage data models or backend databases?",
					fields: [
						{
							key: "database_indicator",
							workflowValueKey: "database_indicator",
							kind: "boolean",
							label: "Select One",
							required: true,
							allowedValueType: "boolean",
						},
					],
					...submit,
					transition: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_G_ID },
				},
				[DOCUMENT_PROJECT_STEP_3_PANEL_G_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_3_PANEL_G_ID,
					title: "State Management",
					promptMarkdown: "Does your product leverage State Management?",
					fields: [
						{
							key: "state_management_indicator",
							workflowValueKey: "state_management_indicator",
							kind: "boolean",
							label: "Select One",
							required: true,
							allowedValueType: "boolean",
						},
					],
					...submit,
					transition: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_H_ID },
				},
				[DOCUMENT_PROJECT_STEP_3_PANEL_H_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_3_PANEL_H_ID,
					title: "User Interface",
					promptMarkdown: "Does your product have a UI?",
					fields: [
						{
							key: "ui_indicator",
							workflowValueKey: "ui_indicator",
							kind: "boolean",
							label: "Select One",
							required: true,
							allowedValueType: "boolean",
						},
					],
					...submit,
					transition: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_I_ID },
				},
				[DOCUMENT_PROJECT_STEP_3_PANEL_I_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_3_PANEL_I_ID,
					title: "Deployment Configuration",
					promptMarkdown: "Does your product require a deployment configuration?",
					fields: [
						{
							key: "deployment_indicator",
							workflowValueKey: "deployment_indicator",
							kind: "boolean",
							label: "Select One",
							required: true,
							allowedValueType: "boolean",
						},
					],
					...submit,
					transition: {
						type: "conditional",
						conditionSourceKey: "developer_guide_creation_required",
						branches: [
							{ matchValue: true, nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_J_ID },
							{ matchValue: false, terminal: true },
						],
						defaultTerminal: true,
					},
				},
				[DOCUMENT_PROJECT_STEP_3_PANEL_J_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_3_PANEL_J_ID,
					title: "Recent Project",
					promptMarkdown: "Tell me about the most recent update or enhancement you completed for this repository.",
					fields: [
						{
							key: "recent_project",
							workflowValueKey: "recent_project",
							kind: "large_text",
							label: "Describe your most recent product update",
							required: true,
							allowedValueType: "string",
						},
					],
					...submit,
					transition: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_K_ID },
				},
				[DOCUMENT_PROJECT_STEP_3_PANEL_K_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_3_PANEL_K_ID,
					title: "Planned Enhancements",
					promptMarkdown: "What future enhancements, fixes, or updates do you have in mind for this product?",
					fields: [
						{
							key: "planned_enhancements",
							workflowValueKey: "planned_enhancements",
							kind: "large_text",
							label: "Planned Product Enhancements",
							required: true,
							allowedValueType: "string",
						},
					],
					...submit,
					transition: { type: "sequential", nextPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_L_ID },
				},
				[DOCUMENT_PROJECT_STEP_3_PANEL_L_ID]: {
					panelId: DOCUMENT_PROJECT_STEP_3_PANEL_L_ID,
					title: "Known Issues",
					promptMarkdown: "What known issues, risks, or technical debt should I know about?",
					fields: [
						{
							key: "known_issues",
							workflowValueKey: "known_issues",
							kind: "large_text",
							label: "Known Issues & Technical Debt",
							required: true,
							allowedValueType: "string",
						},
					],
					...submit,
					transition: {
						type: "conditional",
						conditionSourceKey: "__terminal__",
						branches: [],
						defaultTerminal: true,
					},
				},
			},
		}

		const form = buildDocumentProjectStep3WorkflowForm()
		expect(form).to.deep.equal(expectedForm)
		expect(documentProjectWorkflowDefinition.workflowForms?.[DOCUMENT_PROJECT_STEP_3_FORM_ID]).to.deep.equal(expectedForm)

		const fields = Object.values(form.panels).flatMap((panel) => panel.fields)
		const panelAField = form.panels[DOCUMENT_PROJECT_STEP_3_PANEL_A_ID].fields[0]
		const panelBField = form.panels[DOCUMENT_PROJECT_STEP_3_PANEL_B_ID].fields[0]
		const panelDField = form.panels[DOCUMENT_PROJECT_STEP_3_PANEL_D_ID].fields[0]
		expect(panelAField?.selectionCardinality ?? "single").to.equal("single")
		expect(panelBField?.selectionCardinality ?? "single").to.equal("single")
		expect(panelDField?.selectionCardinality).to.equal("single")
		expect(Object.hasOwn(panelDField ?? {}, "selectionCardinality")).to.equal(true)
		for (const field of fields) {
			if (field !== panelDField) {
				expect(Object.hasOwn(field, "selectionCardinality")).to.equal(false)
			}
			if (field.kind === "boolean") {
				expect(Object.hasOwn(field, "trueLabel")).to.equal(false)
				expect(Object.hasOwn(field, "falseLabel")).to.equal(false)
			}
		}
	})

	it("validates Step 1 prerequisites before selecting exactly one A-D form route", async () => {
		const step = getStep(1)
		expect(step.decisionTree.entryBranchId).to.equal("step-1-resolve-branch")
		expect(Object.keys(step.decisionTree.branches)).to.deep.equal([
			"step-1-resolve-branch",
			"step-1-validate-branch",
			"step-1-form-selection-branch",
			"step-1-await-form-branch",
		])
		for (const [branchId, branch] of Object.entries(step.decisionTree.branches)) {
			expect(branch.id).to.equal(branchId)
		}
		expect(step.decisionTree.branches["step-1-resolve-branch"].routes.map(summarizeRoute)).to.deep.equal([
			{
				id: "step-1-resolve-prerequisites",
				triggerKind: "always",
				action: { kind: "resolve_prerequisite_files", prerequisiteIds: ["project_overview", "developer_guide"] },
				followingBranchId: "step-1-validate-branch",
			},
		])
		expect(step.decisionTree.branches["step-1-validate-branch"].routes.map(summarizeRoute)).to.deep.equal([
			{
				id: "step-1-validate-prerequisites",
				triggerKind: "always",
				action: { kind: "run_deterministic_procedure" },
				followingBranchId: "step-1-form-selection-branch",
			},
		])
		expect(step.decisionTree.branches["step-1-form-selection-branch"].routes.map(summarizeRoute)).to.deep.equal([
			{
				id: "step-1-render-form-a",
				triggerKind: "session_predicate",
				action: {
					kind: "render_workflow_form",
					workflowFormId: DOCUMENT_PROJECT_STEP_1_FORM_ID,
					startPanelId: DOCUMENT_PROJECT_STEP_1_PANEL_A_ID,
					hasBuildSessionData: false,
				},
				followingBranchId: "step-1-await-form-branch",
			},
			{
				id: "step-1-render-form-b",
				triggerKind: "session_predicate",
				action: {
					kind: "render_workflow_form",
					workflowFormId: DOCUMENT_PROJECT_STEP_1_FORM_ID,
					startPanelId: DOCUMENT_PROJECT_STEP_1_PANEL_B_ID,
					hasBuildSessionData: false,
				},
				followingBranchId: "step-1-await-form-branch",
			},
			{
				id: "step-1-render-form-c",
				triggerKind: "session_predicate",
				action: {
					kind: "render_workflow_form",
					workflowFormId: DOCUMENT_PROJECT_STEP_1_FORM_ID,
					startPanelId: DOCUMENT_PROJECT_STEP_1_PANEL_C_ID,
					hasBuildSessionData: false,
				},
				followingBranchId: "step-1-await-form-branch",
			},
			{
				id: "step-1-render-form-d",
				triggerKind: "session_predicate",
				action: {
					kind: "render_workflow_form",
					workflowFormId: DOCUMENT_PROJECT_STEP_1_FORM_ID,
					startPanelId: DOCUMENT_PROJECT_STEP_1_PANEL_D_ID,
					hasBuildSessionData: false,
				},
				followingBranchId: "step-1-await-form-branch",
			},
		])
		expect(
			step.decisionTree.branches["step-1-form-selection-branch"].routes.some((route) => route.trigger.kind === "always"),
		).to.equal(false)
		expect(step.decisionTree.branches["step-1-await-form-branch"].routes.map(summarizeRoute)).to.deep.equal([
			{
				id: "step-1-complete-form",
				triggerKind: "event_predicate",
				action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } },
				followingBranchId: undefined,
			},
		])

		const validateAction = findStepRoute(1, "step-1-validate-branch", "step-1-validate-prerequisites").action
		if (validateAction.kind !== "run_deterministic_procedure") {
			throw new Error("Expected Document Project Step 1 validation procedure.")
		}
		const projectOverviewPath = "/test/project/docs/projects/agent-guidance/project-overview.md"
		const developerGuidePath = "/test/project/docs/projects/agent-guidance/developer-guide.md"
		const matrix: Array<{
			name: string
			workflowValues: WorkflowValues
			prerequisiteFileResolutions: ActiveWorkflowSession["prerequisiteFileResolutions"]
			expectedRouteId: string
		}> = [
			{
				name: "A",
				workflowValues: {},
				prerequisiteFileResolutions: [
					{ prerequisiteId: "project_overview", outcome: "not_found" },
					{ prerequisiteId: "developer_guide", outcome: "not_found" },
				],
				expectedRouteId: "step-1-render-form-a",
			},
			{
				name: "B",
				workflowValues: { developer_guide: developerGuidePath },
				prerequisiteFileResolutions: [
					{ prerequisiteId: "project_overview", outcome: "not_found" },
					{ prerequisiteId: "developer_guide", outcome: "found", resolvedAbsolutePath: developerGuidePath },
				],
				expectedRouteId: "step-1-render-form-b",
			},
			{
				name: "C",
				workflowValues: { project_overview: projectOverviewPath },
				prerequisiteFileResolutions: [
					{ prerequisiteId: "project_overview", outcome: "found", resolvedAbsolutePath: projectOverviewPath },
					{ prerequisiteId: "developer_guide", outcome: "not_found" },
				],
				expectedRouteId: "step-1-render-form-c",
			},
			{
				name: "D",
				workflowValues: { project_overview: projectOverviewPath, developer_guide: developerGuidePath },
				prerequisiteFileResolutions: [
					{ prerequisiteId: "project_overview", outcome: "found", resolvedAbsolutePath: projectOverviewPath },
					{ prerequisiteId: "developer_guide", outcome: "found", resolvedAbsolutePath: developerGuidePath },
				],
				expectedRouteId: "step-1-render-form-d",
			},
		]

		for (const state of matrix) {
			const session = createDocumentProjectBranchSession({
				stepNumber: 1,
				branchId: "step-1-form-selection-branch",
				workflowValues: state.workflowValues,
				prerequisiteFileResolutions: state.prerequisiteFileResolutions,
			})
			expect(await validateAction.instruction.run(session), state.name).to.deep.equal({ kind: "succeeded" })
			const matchingRoutes = step.decisionTree.branches["step-1-form-selection-branch"].routes.filter((route) =>
				routeMatches(route, session),
			)
			expect(
				matchingRoutes.map((route) => route.id),
				state.name,
			).to.deep.equal([state.expectedRouteId])
		}

		const invalidCases: Array<{
			name: string
			workflowValues: WorkflowValues
			prerequisiteFileResolutions: ActiveWorkflowSession["prerequisiteFileResolutions"]
		}> = [
			{ name: "missing results", workflowValues: {}, prerequisiteFileResolutions: [] },
			{
				name: "missing declared result",
				workflowValues: {},
				prerequisiteFileResolutions: [{ prerequisiteId: "project_overview", outcome: "not_found" }],
			},
			{
				name: "result and path disagree",
				workflowValues: { project_overview: "/test/project/wrong.md" },
				prerequisiteFileResolutions: [
					{ prerequisiteId: "project_overview", outcome: "found", resolvedAbsolutePath: projectOverviewPath },
					{ prerequisiteId: "developer_guide", outcome: "not_found" },
				],
			},
			...(["", "   ", true] as const).map((rawPath) => ({
				name: `not_found with ${JSON.stringify(rawPath)}`,
				workflowValues: { project_overview: rawPath },
				prerequisiteFileResolutions: [
					{ prerequisiteId: "project_overview", outcome: "not_found" as const },
					{ prerequisiteId: "developer_guide", outcome: "not_found" as const },
				],
			})),
			{
				name: "padded found path",
				workflowValues: { project_overview: ` ${projectOverviewPath} ` },
				prerequisiteFileResolutions: [
					{ prerequisiteId: "project_overview", outcome: "found", resolvedAbsolutePath: projectOverviewPath },
					{ prerequisiteId: "developer_guide", outcome: "not_found" },
				],
			},
		]

		for (const state of invalidCases) {
			const session = createDocumentProjectBranchSession({
				stepNumber: 1,
				branchId: "step-1-validate-branch",
				workflowValues: state.workflowValues,
				prerequisiteFileResolutions: state.prerequisiteFileResolutions,
			})
			expect(await validateAction.instruction.run(session), state.name).to.deep.equal({
				kind: "failed",
				errorMessage: DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR,
			})
		}

		const awaitSession = createDocumentProjectBranchSession({
			stepNumber: 1,
			branchId: "step-1-await-form-branch",
			workflowValues: {},
		})
		const completeFormRoute = findStepRoute(1, "step-1-await-form-branch", "step-1-complete-form")
		expect(routeMatches(completeFormRoute, awaitSession)).to.equal(false)
		expect(
			routeMatches(completeFormRoute, awaitSession, {
				kind: "workflow_form_completed",
				workflowFormId: DOCUMENT_PROJECT_STEP_1_FORM_ID,
			}),
		).to.equal(true)
		expect(
			routeMatches(completeFormRoute, awaitSession, {
				kind: "workflow_form_completed",
				workflowFormId: DOCUMENT_PROJECT_STEP_3_FORM_ID,
			}),
		).to.equal(false)
	})

	it("defines the exact Step 2 derivation, artifact sequence, retries, failures, and completion predicates", async () => {
		const step = getStep(2)
		const expectedBranchIds = [
			"step-2-derive-branch",
			"step-2-project-overview-branch",
			"step-2-await-project-overview-allocation-branch",
			"step-2-await-project-overview-retry-branch",
			"step-2-await-project-overview-build-branch",
			"step-2-developer-guide-branch",
			"step-2-await-developer-guide-allocation-branch",
			"step-2-await-developer-guide-retry-branch",
			"step-2-await-developer-guide-build-branch",
			"step-2-complete-branch",
		]
		expect(step.decisionTree.entryBranchId).to.equal("step-2-derive-branch")
		expect(Object.keys(step.decisionTree.branches)).to.deep.equal(expectedBranchIds)
		for (const branchId of expectedBranchIds) {
			expect(step.decisionTree.branches[branchId].id).to.equal(branchId)
			for (const route of step.decisionTree.branches[branchId].routes) {
				const expectedRouteKeys = ["id", "trigger", "action"]
				if (route.followingBranchId !== undefined) {
					expectedRouteKeys.push("followingBranchId")
				}
				expect(Object.keys(route)).to.have.members(expectedRouteKeys)
				switch (route.trigger.kind) {
					case "always":
						expect(Object.keys(route.trigger)).to.deep.equal(["kind"])
						break
					case "session_predicate":
					case "event_predicate":
						expect(Object.keys(route.trigger)).to.have.members(["kind", "matches"])
						break
					default:
						throw new Error(`Unexpected Document Project Step 2 trigger ${route.trigger.kind}.`)
				}

				const action = route.action
				switch (action.kind) {
					case "run_deterministic_procedure":
						expect(Object.keys(action)).to.deep.equal(["kind", "instruction"])
						expect(Object.keys(action.instruction)).to.deep.equal(["run"])
						expect(action.instruction.run).to.be.a("function")
						break
					case "transition_step":
						expect(Object.keys(action)).to.deep.equal(["kind", "target"])
						expect(Object.keys(action.target)).to.have.members(
							action.target.kind === "named_branch" ? ["kind", "stepNumber", "branchId"] : ["kind", "stepNumber"],
						)
						break
					case "allocate_artifact":
						expect(Object.keys(action)).to.deep.equal(["kind", "artifactId"])
						break
					case "build_workflow_document":
						expect(Object.keys(action)).to.deep.equal(["kind", "instruction"])
						expect(Object.keys(action.instruction)).to.have.members(["artifactId", "buildContent"])
						expect(Object.hasOwn(action.instruction, "workflowValueWrites")).to.equal(false)
						expect(action.instruction.buildContent).to.be.a("function")
						break
					case "terminal_error":
						expect(Object.keys(action)).to.deep.equal(["kind", "errorMessage"])
						break
					default:
						throw new Error(`Unexpected Document Project Step 2 action ${action.kind}.`)
				}
			}
		}

		expect(step.decisionTree.branches["step-2-derive-branch"].routes.map(summarizeRoute)).to.deep.equal([
			{
				id: "step-2-derive-creation-requirements",
				triggerKind: "always",
				action: { kind: "run_deterministic_procedure" },
				followingBranchId: "step-2-project-overview-branch",
			},
		])
		expect(step.decisionTree.branches["step-2-project-overview-branch"].routes.map(summarizeRoute)).to.deep.equal([
			{
				id: "step-2-skip-project-overview",
				triggerKind: "session_predicate",
				action: {
					kind: "transition_step",
					target: { kind: "named_branch", stepNumber: 2, branchId: "step-2-developer-guide-branch" },
				},
				followingBranchId: undefined,
			},
			{
				id: "step-2-allocate-project-overview",
				triggerKind: "session_predicate",
				action: { kind: "allocate_artifact", artifactId: "project_overview" },
				followingBranchId: "step-2-await-project-overview-allocation-branch",
			},
			{
				id: "step-2-invalid-project-overview-state",
				triggerKind: "session_predicate",
				action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR },
				followingBranchId: undefined,
			},
		])
		expect(
			step.decisionTree.branches["step-2-await-project-overview-allocation-branch"].routes.map(summarizeRoute),
		).to.deep.equal([
			{
				id: "step-2-build-project-overview-after-allocation",
				triggerKind: "event_predicate",
				action: { kind: "build_workflow_document", artifactId: "project_overview" },
				followingBranchId: "step-2-await-project-overview-build-branch",
			},
			{
				id: "step-2-retry-project-overview-allocation",
				triggerKind: "event_predicate",
				action: { kind: "allocate_artifact", artifactId: "project_overview" },
				followingBranchId: "step-2-await-project-overview-retry-branch",
			},
		])
		expect(step.decisionTree.branches["step-2-await-project-overview-retry-branch"].routes.map(summarizeRoute)).to.deep.equal(
			[
				{
					id: "step-2-build-project-overview-after-retry",
					triggerKind: "event_predicate",
					action: { kind: "build_workflow_document", artifactId: "project_overview" },
					followingBranchId: "step-2-await-project-overview-build-branch",
				},
				{
					id: "step-2-project-overview-retry-failed",
					triggerKind: "event_predicate",
					action: {
						kind: "terminal_error",
						errorMessage: DOCUMENT_PROJECT_PROJECT_OVERVIEW_ALLOCATION_TERMINAL_ERROR,
					},
					followingBranchId: undefined,
				},
			],
		)
		expect(step.decisionTree.branches["step-2-await-project-overview-build-branch"].routes.map(summarizeRoute)).to.deep.equal(
			[
				{
					id: "step-2-project-overview-build-succeeded-after-allocation",
					triggerKind: "event_predicate",
					action: {
						kind: "transition_step",
						target: { kind: "named_branch", stepNumber: 2, branchId: "step-2-developer-guide-branch" },
					},
					followingBranchId: undefined,
				},
				{
					id: "step-2-project-overview-build-succeeded-after-retry",
					triggerKind: "event_predicate",
					action: {
						kind: "transition_step",
						target: { kind: "named_branch", stepNumber: 2, branchId: "step-2-developer-guide-branch" },
					},
					followingBranchId: undefined,
				},
				{
					id: "step-2-project-overview-build-failed-after-allocation",
					triggerKind: "event_predicate",
					action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_PROJECT_OVERVIEW_BUILD_TERMINAL_ERROR },
					followingBranchId: undefined,
				},
				{
					id: "step-2-project-overview-build-failed-after-retry",
					triggerKind: "event_predicate",
					action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_PROJECT_OVERVIEW_BUILD_TERMINAL_ERROR },
					followingBranchId: undefined,
				},
			],
		)
		expect(step.decisionTree.branches["step-2-developer-guide-branch"].routes.map(summarizeRoute)).to.deep.equal([
			{
				id: "step-2-skip-developer-guide",
				triggerKind: "session_predicate",
				action: {
					kind: "transition_step",
					target: { kind: "named_branch", stepNumber: 2, branchId: "step-2-complete-branch" },
				},
				followingBranchId: undefined,
			},
			{
				id: "step-2-allocate-developer-guide",
				triggerKind: "session_predicate",
				action: { kind: "allocate_artifact", artifactId: "developer_guide" },
				followingBranchId: "step-2-await-developer-guide-allocation-branch",
			},
			{
				id: "step-2-invalid-developer-guide-state",
				triggerKind: "session_predicate",
				action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR },
				followingBranchId: undefined,
			},
		])
		expect(
			step.decisionTree.branches["step-2-await-developer-guide-allocation-branch"].routes.map(summarizeRoute),
		).to.deep.equal([
			{
				id: "step-2-build-developer-guide-after-allocation",
				triggerKind: "event_predicate",
				action: { kind: "build_workflow_document", artifactId: "developer_guide" },
				followingBranchId: "step-2-await-developer-guide-build-branch",
			},
			{
				id: "step-2-retry-developer-guide-allocation",
				triggerKind: "event_predicate",
				action: { kind: "allocate_artifact", artifactId: "developer_guide" },
				followingBranchId: "step-2-await-developer-guide-retry-branch",
			},
		])
		expect(step.decisionTree.branches["step-2-await-developer-guide-retry-branch"].routes.map(summarizeRoute)).to.deep.equal([
			{
				id: "step-2-build-developer-guide-after-retry",
				triggerKind: "event_predicate",
				action: { kind: "build_workflow_document", artifactId: "developer_guide" },
				followingBranchId: "step-2-await-developer-guide-build-branch",
			},
			{
				id: "step-2-developer-guide-retry-failed",
				triggerKind: "event_predicate",
				action: {
					kind: "terminal_error",
					errorMessage: DOCUMENT_PROJECT_DEVELOPER_GUIDE_ALLOCATION_TERMINAL_ERROR,
				},
				followingBranchId: undefined,
			},
		])
		expect(step.decisionTree.branches["step-2-await-developer-guide-build-branch"].routes.map(summarizeRoute)).to.deep.equal([
			{
				id: "step-2-developer-guide-build-succeeded-after-allocation",
				triggerKind: "event_predicate",
				action: {
					kind: "transition_step",
					target: { kind: "named_branch", stepNumber: 2, branchId: "step-2-complete-branch" },
				},
				followingBranchId: undefined,
			},
			{
				id: "step-2-developer-guide-build-succeeded-after-retry",
				triggerKind: "event_predicate",
				action: {
					kind: "transition_step",
					target: { kind: "named_branch", stepNumber: 2, branchId: "step-2-complete-branch" },
				},
				followingBranchId: undefined,
			},
			{
				id: "step-2-developer-guide-build-failed-after-allocation",
				triggerKind: "event_predicate",
				action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_DEVELOPER_GUIDE_BUILD_TERMINAL_ERROR },
				followingBranchId: undefined,
			},
			{
				id: "step-2-developer-guide-build-failed-after-retry",
				triggerKind: "event_predicate",
				action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_DEVELOPER_GUIDE_BUILD_TERMINAL_ERROR },
				followingBranchId: undefined,
			},
		])
		expect(step.decisionTree.branches["step-2-complete-branch"].routes.map(summarizeRoute)).to.deep.equal([
			{
				id: "step-2-complete",
				triggerKind: "session_predicate",
				action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 3 } },
				followingBranchId: undefined,
			},
			{
				id: "step-2-invalid-completion-state",
				triggerKind: "session_predicate",
				action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR },
				followingBranchId: undefined,
			},
		])

		const deriveAction = findStepRoute(2, "step-2-derive-branch", "step-2-derive-creation-requirements").action
		if (deriveAction.kind !== "run_deterministic_procedure") {
			throw new Error("Expected Document Project Step 2 derivation procedure.")
		}
		const projectOverviewPath = "/test/project/docs/projects/agent-guidance/project-overview.md"
		const validDerivationSession = createDocumentProjectBranchSession({
			stepNumber: 2,
			branchId: "step-2-derive-branch",
			workflowValues: { project_overview: projectOverviewPath },
			prerequisiteFileResolutions: [
				{ prerequisiteId: "project_overview", outcome: "found", resolvedAbsolutePath: projectOverviewPath },
				{ prerequisiteId: "developer_guide", outcome: "not_found" },
			],
		})
		expect(await deriveAction.instruction.run(validDerivationSession)).to.deep.equal({
			kind: "succeeded",
			workflowValueWrites: {
				project_overview_creation_required: false,
				developer_guide_creation_required: true,
			},
		})
		const failedDerivationSession = createDocumentProjectBranchSession({
			stepNumber: 2,
			branchId: "step-2-derive-branch",
			workflowValues: {},
		})
		expect(await deriveAction.instruction.run(failedDerivationSession)).to.deep.equal({
			kind: "failed",
			errorMessage: DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR,
		})

		for (const branchCase of [
			{
				branchId: "step-2-project-overview-branch",
				key: DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
				expectedRouteIds: [
					"step-2-skip-project-overview",
					"step-2-allocate-project-overview",
					"step-2-invalid-project-overview-state",
				],
			},
			{
				branchId: "step-2-developer-guide-branch",
				key: DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
				expectedRouteIds: [
					"step-2-skip-developer-guide",
					"step-2-allocate-developer-guide",
					"step-2-invalid-developer-guide-state",
				],
			},
		] as const) {
			for (const [index, value] of [false, true, undefined].entries()) {
				const workflowValues: WorkflowValues = value === undefined ? {} : { [branchCase.key]: value }
				const session = createDocumentProjectBranchSession({
					stepNumber: 2,
					branchId: branchCase.branchId,
					workflowValues,
				})
				const matchingRouteIds = step.decisionTree.branches[branchCase.branchId].routes
					.filter((route) => routeMatches(route, session))
					.map((route) => route.id)
				expect(matchingRouteIds).to.deep.equal([branchCase.expectedRouteIds[index]])
			}
			expect(
				step.decisionTree.branches[branchCase.branchId].routes.some((route) => route.trigger.kind === "always"),
			).to.equal(false)
		}

		const completeBranch = step.decisionTree.branches["step-2-complete-branch"]
		const completeStateCases: Array<{ name: string; workflowValues: WorkflowValues; expectedRouteId: string }> = [
			{
				name: "valid",
				workflowValues: {
					project_overview: "/test/project/project-overview.md",
					developer_guide: "/test/project/developer-guide.md",
					project_overview_creation_required: false,
					developer_guide_creation_required: true,
				},
				expectedRouteId: "step-2-complete",
			},
			{
				name: "invalid missing path",
				workflowValues: {
					developer_guide: "/test/project/developer-guide.md",
					project_overview_creation_required: false,
					developer_guide_creation_required: true,
				},
				expectedRouteId: "step-2-invalid-completion-state",
			},
			{
				name: "invalid missing flag",
				workflowValues: {
					project_overview: "/test/project/project-overview.md",
					developer_guide: "/test/project/developer-guide.md",
					project_overview_creation_required: false,
				},
				expectedRouteId: "step-2-invalid-completion-state",
			},
		]
		for (const state of completeStateCases) {
			const session = createDocumentProjectBranchSession({
				stepNumber: 2,
				branchId: "step-2-complete-branch",
				workflowValues: state.workflowValues,
			})
			const matchingRouteIds = completeBranch.routes
				.filter((route) => routeMatches(route, session))
				.map((route) => route.id)
			expect(matchingRouteIds, state.name).to.deep.equal([state.expectedRouteId])
		}
		expect(completeBranch.routes.some((route) => route.trigger.kind === "always")).to.equal(false)

		const operationCorrelationCases = [
			{
				branchId: "step-2-await-project-overview-allocation-branch",
				sourceBranchId: "step-2-project-overview-branch",
				sourceRouteId: "step-2-allocate-project-overview",
				successRouteId: "step-2-build-project-overview-after-allocation",
				failureRouteId: "step-2-retry-project-overview-allocation",
			},
			{
				branchId: "step-2-await-project-overview-retry-branch",
				sourceBranchId: "step-2-await-project-overview-allocation-branch",
				sourceRouteId: "step-2-retry-project-overview-allocation",
				successRouteId: "step-2-build-project-overview-after-retry",
				failureRouteId: "step-2-project-overview-retry-failed",
			},
			{
				branchId: "step-2-await-project-overview-build-branch",
				sourceBranchId: "step-2-await-project-overview-allocation-branch",
				sourceRouteId: "step-2-build-project-overview-after-allocation",
				successRouteId: "step-2-project-overview-build-succeeded-after-allocation",
				failureRouteId: "step-2-project-overview-build-failed-after-allocation",
			},
			{
				branchId: "step-2-await-project-overview-build-branch",
				sourceBranchId: "step-2-await-project-overview-retry-branch",
				sourceRouteId: "step-2-build-project-overview-after-retry",
				successRouteId: "step-2-project-overview-build-succeeded-after-retry",
				failureRouteId: "step-2-project-overview-build-failed-after-retry",
			},
			{
				branchId: "step-2-await-developer-guide-allocation-branch",
				sourceBranchId: "step-2-developer-guide-branch",
				sourceRouteId: "step-2-allocate-developer-guide",
				successRouteId: "step-2-build-developer-guide-after-allocation",
				failureRouteId: "step-2-retry-developer-guide-allocation",
			},
			{
				branchId: "step-2-await-developer-guide-retry-branch",
				sourceBranchId: "step-2-await-developer-guide-allocation-branch",
				sourceRouteId: "step-2-retry-developer-guide-allocation",
				successRouteId: "step-2-build-developer-guide-after-retry",
				failureRouteId: "step-2-developer-guide-retry-failed",
			},
			{
				branchId: "step-2-await-developer-guide-build-branch",
				sourceBranchId: "step-2-await-developer-guide-allocation-branch",
				sourceRouteId: "step-2-build-developer-guide-after-allocation",
				successRouteId: "step-2-developer-guide-build-succeeded-after-allocation",
				failureRouteId: "step-2-developer-guide-build-failed-after-allocation",
			},
			{
				branchId: "step-2-await-developer-guide-build-branch",
				sourceBranchId: "step-2-await-developer-guide-retry-branch",
				sourceRouteId: "step-2-build-developer-guide-after-retry",
				successRouteId: "step-2-developer-guide-build-succeeded-after-retry",
				failureRouteId: "step-2-developer-guide-build-failed-after-retry",
			},
		] as const

		for (const correlation of operationCorrelationCases) {
			const branch = step.decisionTree.branches[correlation.branchId]
			const session = createDocumentProjectBranchSession({
				stepNumber: 2,
				branchId: correlation.branchId,
				workflowValues: {},
			})
			const sourceRoute = { branchId: correlation.sourceBranchId, routeId: correlation.sourceRouteId }
			const successMatches = branch.routes
				.filter((route) => routeMatches(route, session, { kind: "tool_backed_operation_succeeded", sourceRoute }))
				.map((route) => route.id)
			const failureMatches = branch.routes
				.filter((route) =>
					routeMatches(route, session, {
						kind: "tool_backed_operation_failed",
						sourceRoute,
						errorMessage: "injected",
					}),
				)
				.map((route) => route.id)
			expect(successMatches).to.deep.equal([correlation.successRouteId])
			expect(failureMatches).to.deep.equal([correlation.failureRouteId])
			expect(branch.routes.filter((route) => routeMatches(route, session))).to.deep.equal([])
			expect(
				branch.routes.filter((route) =>
					routeMatches(route, session, {
						kind: "tool_backed_operation_succeeded",
						sourceRoute: { branchId: "unrelated", routeId: "unrelated" },
					}),
				),
			).to.deep.equal([])
		}

		const overviewBuildAfterAllocation = findStepRoute(
			2,
			"step-2-await-project-overview-allocation-branch",
			"step-2-build-project-overview-after-allocation",
		).action
		const overviewBuildAfterRetry = findStepRoute(
			2,
			"step-2-await-project-overview-retry-branch",
			"step-2-build-project-overview-after-retry",
		).action
		const guideBuildAfterAllocation = findStepRoute(
			2,
			"step-2-await-developer-guide-allocation-branch",
			"step-2-build-developer-guide-after-allocation",
		).action
		const guideBuildAfterRetry = findStepRoute(
			2,
			"step-2-await-developer-guide-retry-branch",
			"step-2-build-developer-guide-after-retry",
		).action
		if (
			overviewBuildAfterAllocation.kind !== "build_workflow_document" ||
			overviewBuildAfterRetry.kind !== "build_workflow_document" ||
			guideBuildAfterAllocation.kind !== "build_workflow_document" ||
			guideBuildAfterRetry.kind !== "build_workflow_document"
		) {
			throw new Error("Expected Document Project build actions.")
		}
		const buildSession = createDocumentProjectBranchSession({
			stepNumber: 2,
			branchId: "step-2-project-overview-branch",
			workflowValues: {},
		})
		expect(await overviewBuildAfterAllocation.instruction.buildContent(buildSession)).to.equal(
			await overviewBuildAfterRetry.instruction.buildContent(buildSession),
		)
		expect(await guideBuildAfterAllocation.instruction.buildContent(buildSession)).to.equal(
			await guideBuildAfterRetry.instruction.buildContent(buildSession),
		)
	})

	it("defines the exact Step 3 Boolean routes, form sequences, form correlation, and terminal messages", () => {
		const step = getStep(3)
		expect(step.decisionTree.entryBranchId).to.equal("step-3-route-branch")
		expect(Object.keys(step.decisionTree.branches)).to.deep.equal(["step-3-route-branch", "step-3-await-form-branch"])
		expect(step.decisionTree.branches["step-3-route-branch"].id).to.equal("step-3-route-branch")
		expect(step.decisionTree.branches["step-3-await-form-branch"].id).to.equal("step-3-await-form-branch")
		expect(step.decisionTree.branches["step-3-route-branch"].routes.map(summarizeRoute)).to.deep.equal([
			{
				id: "step-3-skip-form",
				triggerKind: "session_predicate",
				action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 4 } },
				followingBranchId: undefined,
			},
			{
				id: "step-3-render-form-a-project-overview-only",
				triggerKind: "session_predicate",
				action: {
					kind: "render_workflow_form",
					workflowFormId: DOCUMENT_PROJECT_STEP_3_FORM_ID,
					startPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_A_ID,
					hasBuildSessionData: true,
				},
				followingBranchId: "step-3-await-form-branch",
			},
			{
				id: "step-3-render-form-j-developer-guide-only",
				triggerKind: "session_predicate",
				action: {
					kind: "render_workflow_form",
					workflowFormId: DOCUMENT_PROJECT_STEP_3_FORM_ID,
					startPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_J_ID,
					hasBuildSessionData: true,
				},
				followingBranchId: "step-3-await-form-branch",
			},
			{
				id: "step-3-render-form-a-both",
				triggerKind: "session_predicate",
				action: {
					kind: "render_workflow_form",
					workflowFormId: DOCUMENT_PROJECT_STEP_3_FORM_ID,
					startPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_A_ID,
					hasBuildSessionData: true,
				},
				followingBranchId: "step-3-await-form-branch",
			},
			{
				id: "step-3-invalid-state",
				triggerKind: "session_predicate",
				action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_BASELINE_DATA_TERMINAL_ERROR },
				followingBranchId: undefined,
			},
		])
		expect(
			step.decisionTree.branches["step-3-route-branch"].routes.some((route) => route.trigger.kind === "always"),
		).to.equal(false)
		expect(step.decisionTree.branches["step-3-await-form-branch"].routes.map(summarizeRoute)).to.deep.equal([
			{
				id: "step-3-complete-form",
				triggerKind: "event_predicate",
				action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 4 } },
				followingBranchId: undefined,
			},
		])

		const stateCases: Array<{
			name: string
			workflowValues: WorkflowValues
			expectedRouteId: string
		}> = [
			{
				name: "false false",
				workflowValues: {
					project_overview_creation_required: false,
					developer_guide_creation_required: false,
				},
				expectedRouteId: "step-3-skip-form",
			},
			{
				name: "true false",
				workflowValues: {
					project_overview_creation_required: true,
					developer_guide_creation_required: false,
				},
				expectedRouteId: "step-3-render-form-a-project-overview-only",
			},
			{
				name: "false true",
				workflowValues: {
					project_overview_creation_required: false,
					developer_guide_creation_required: true,
				},
				expectedRouteId: "step-3-render-form-j-developer-guide-only",
			},
			{
				name: "true true",
				workflowValues: {
					project_overview_creation_required: true,
					developer_guide_creation_required: true,
				},
				expectedRouteId: "step-3-render-form-a-both",
			},
			{
				name: "project flag undefined",
				workflowValues: { developer_guide_creation_required: false },
				expectedRouteId: "step-3-invalid-state",
			},
			{
				name: "developer guide flag undefined",
				workflowValues: { project_overview_creation_required: false },
				expectedRouteId: "step-3-invalid-state",
			},
			{
				name: "wrong typed flag",
				workflowValues: {
					project_overview_creation_required: "true",
					developer_guide_creation_required: true,
				},
				expectedRouteId: "step-3-invalid-state",
			},
		]
		for (const state of stateCases) {
			const session = createDocumentProjectBranchSession({
				stepNumber: 3,
				branchId: "step-3-route-branch",
				workflowValues: state.workflowValues,
			})
			const matchingRouteIds = step.decisionTree.branches["step-3-route-branch"].routes
				.filter((route) => routeMatches(route, session))
				.map((route) => route.id)
			expect(matchingRouteIds, state.name).to.deep.equal([state.expectedRouteId])
		}

		for (const routeId of [
			"step-3-render-form-a-project-overview-only",
			"step-3-render-form-j-developer-guide-only",
			"step-3-render-form-a-both",
		]) {
			const action = findStepRoute(3, "step-3-route-branch", routeId).action
			if (action.kind !== "render_workflow_form" || !("buildSessionData" in action)) {
				throw new Error(`Expected Document Project Step 3 form route ${routeId}.`)
			}
			const validSession = createDocumentProjectBranchSession({
				stepNumber: 3,
				branchId: "step-3-route-branch",
				workflowValues: {
					project_overview_creation_required: true,
					developer_guide_creation_required: false,
				},
			})
			expect(action.buildSessionData(validSession)).to.deep.equal({
				project_overview_creation_required: true,
				developer_guide_creation_required: false,
			})
			const invalidSession = createDocumentProjectBranchSession({
				stepNumber: 3,
				branchId: "step-3-route-branch",
				workflowValues: { project_overview_creation_required: true },
			})
			expect(() => action.buildSessionData(invalidSession)).to.throw(DOCUMENT_PROJECT_BASELINE_DATA_TERMINAL_ERROR)
		}

		const form = buildDocumentProjectStep3WorkflowForm()
		const collectSequentialPanelIds = (startPanelId: string): string[] => {
			const panelIds: string[] = []
			let panelId: string | undefined = startPanelId

			while (panelId !== undefined) {
				panelIds.push(panelId)
				const transition: WorkflowFormTransitionDefinition = form.panels[panelId].transition
				panelId = transition.type === "sequential" ? transition.nextPanelId : undefined
			}

			return panelIds
		}
		expect(collectSequentialPanelIds(DOCUMENT_PROJECT_STEP_3_PANEL_A_ID)).to.deep.equal([
			DOCUMENT_PROJECT_STEP_3_PANEL_A_ID,
			DOCUMENT_PROJECT_STEP_3_PANEL_B_ID,
			DOCUMENT_PROJECT_STEP_3_PANEL_C_ID,
			DOCUMENT_PROJECT_STEP_3_PANEL_D_ID,
			DOCUMENT_PROJECT_STEP_3_PANEL_E_ID,
			DOCUMENT_PROJECT_STEP_3_PANEL_F_ID,
			DOCUMENT_PROJECT_STEP_3_PANEL_G_ID,
			DOCUMENT_PROJECT_STEP_3_PANEL_H_ID,
			DOCUMENT_PROJECT_STEP_3_PANEL_I_ID,
		])
		expect(collectSequentialPanelIds(DOCUMENT_PROJECT_STEP_3_PANEL_J_ID)).to.deep.equal([
			DOCUMENT_PROJECT_STEP_3_PANEL_J_ID,
			DOCUMENT_PROJECT_STEP_3_PANEL_K_ID,
			DOCUMENT_PROJECT_STEP_3_PANEL_L_ID,
		])

		const awaitSession = createDocumentProjectBranchSession({
			stepNumber: 3,
			branchId: "step-3-await-form-branch",
			workflowValues: {},
		})
		const completeFormRoute = findStepRoute(3, "step-3-await-form-branch", "step-3-complete-form")
		expect(routeMatches(completeFormRoute, awaitSession)).to.equal(false)
		expect(
			routeMatches(completeFormRoute, awaitSession, {
				kind: "workflow_form_completed",
				workflowFormId: DOCUMENT_PROJECT_STEP_3_FORM_ID,
			}),
		).to.equal(true)
		expect(
			routeMatches(completeFormRoute, awaitSession, {
				kind: "workflow_form_completed",
				workflowFormId: DOCUMENT_PROJECT_STEP_1_FORM_ID,
			}),
		).to.equal(false)

		const terminalMessages = Object.values(documentProjectWorkflowDefinition.steps).flatMap((workflowStep) =>
			Object.values(workflowStep.decisionTree.branches).flatMap((branch) =>
				branch.routes.flatMap((route) => (route.action.kind === "terminal_error" ? [route.action.errorMessage] : [])),
			),
		)
		const exactTerminalMessages = [
			DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR,
			DOCUMENT_PROJECT_PROJECT_OVERVIEW_ALLOCATION_TERMINAL_ERROR,
			DOCUMENT_PROJECT_PROJECT_OVERVIEW_BUILD_TERMINAL_ERROR,
			DOCUMENT_PROJECT_DEVELOPER_GUIDE_ALLOCATION_TERMINAL_ERROR,
			DOCUMENT_PROJECT_DEVELOPER_GUIDE_BUILD_TERMINAL_ERROR,
			DOCUMENT_PROJECT_BASELINE_DATA_TERMINAL_ERROR,
			DOCUMENT_PROJECT_DOCUMENTATION_TASK_TERMINAL_ERROR,
		]
		expect(new Set(terminalMessages).size).to.equal(7)
		expect([...new Set(terminalMessages)]).to.have.members(exactTerminalMessages)
		expect(exactTerminalMessages).to.deep.equal([
			"I could not determine which reference documents need to be generated.",
			"I could not create project-overview.md in the Agent Guidance folder.",
			"I could not populate the initial content for project-overview.md.",
			"I could not create developer-guide.md in the Agent Guidance folder.",
			"I could not populate the initial content for developer-guide.md.",
			"I could not determine which baseline information must be collected.",
			"I could not determine the appropriate documentation task for the current session.",
		])
	})

	it("renders all five exact Step 4 prompt section variants with materialized contract values", () => {
		const step4PromptTemplates = getStep(4).promptTemplates
		if (step4PromptTemplates === undefined || step4PromptTemplates.length !== 13) {
			throw new Error("Expected exactly 13 Document Project Step 4 prompt templates.")
		}
		const [
			basePrompt,
			bothCreatedStatusPrompt,
			sharedPathsPrompt,
			projectOverviewOnlyStatusPrompt,
			developerGuideOnlyStatusPrompt,
			inputIntroductionPrompt,
			projectOverviewInputsPrompt,
			developerGuideInputsPrompt,
			bothDocumentWorkPrompt,
			developerGuideOnlyWorkPrompt,
			projectOverviewOnlyWorkPrompt,
			updateExistingDocumentsWorkPrompt,
			addSupportingDocumentationWorkPrompt,
		] = step4PromptTemplates
		const allSections = [
			basePrompt,
			bothCreatedStatusPrompt,
			sharedPathsPrompt,
			projectOverviewOnlyStatusPrompt,
			developerGuideOnlyStatusPrompt,
			inputIntroductionPrompt,
			projectOverviewInputsPrompt,
			developerGuideInputsPrompt,
			bothDocumentWorkPrompt,
			developerGuideOnlyWorkPrompt,
			projectOverviewOnlyWorkPrompt,
			updateExistingDocumentsWorkPrompt,
			addSupportingDocumentationWorkPrompt,
		]
		const variants = [
			{
				name: "both created",
				workflowValues: createValidDocumentProjectStep4Values({
					projectOverviewCreationRequired: true,
					developerGuideCreationRequired: true,
				}),
				sections: [
					basePrompt,
					bothCreatedStatusPrompt,
					sharedPathsPrompt,
					inputIntroductionPrompt,
					projectOverviewInputsPrompt,
					developerGuideInputsPrompt,
					bothDocumentWorkPrompt,
				],
				requiredKeys: [
					...DOCUMENT_PROJECT_STEP_4_REQUIRED_BRANCH_VALUE_KEYS[0].stringKeys,
					...DOCUMENT_PROJECT_STEP_4_REQUIRED_BRANCH_VALUE_KEYS[0].booleanKeys,
				],
				expectsMisonfigurations: false,
				existingDocumentBranch: false,
				expectsDuplicateThreeMarker: false,
			},
			{
				name: "project overview only",
				workflowValues: createValidDocumentProjectStep4Values({
					projectOverviewCreationRequired: true,
					developerGuideCreationRequired: false,
				}),
				sections: [
					basePrompt,
					sharedPathsPrompt,
					projectOverviewOnlyStatusPrompt,
					inputIntroductionPrompt,
					projectOverviewInputsPrompt,
					projectOverviewOnlyWorkPrompt,
				],
				requiredKeys: [
					...DOCUMENT_PROJECT_STEP_4_REQUIRED_BRANCH_VALUE_KEYS[1].stringKeys,
					...DOCUMENT_PROJECT_STEP_4_REQUIRED_BRANCH_VALUE_KEYS[1].booleanKeys,
				],
				expectsMisonfigurations: false,
				existingDocumentBranch: false,
				expectsDuplicateThreeMarker: false,
			},
			{
				name: "developer guide only",
				workflowValues: createValidDocumentProjectStep4Values({
					projectOverviewCreationRequired: false,
					developerGuideCreationRequired: true,
				}),
				sections: [
					basePrompt,
					sharedPathsPrompt,
					developerGuideOnlyStatusPrompt,
					inputIntroductionPrompt,
					developerGuideInputsPrompt,
					developerGuideOnlyWorkPrompt,
				],
				requiredKeys: [...DOCUMENT_PROJECT_STEP_4_REQUIRED_BRANCH_VALUE_KEYS[2].stringKeys],
				expectsMisonfigurations: true,
				existingDocumentBranch: false,
				expectsDuplicateThreeMarker: false,
			},
			{
				name: "update existing documents",
				workflowValues: createValidDocumentProjectStep4Values({
					projectOverviewCreationRequired: false,
					developerGuideCreationRequired: false,
					sessionObjective: "Update existing documents",
				}),
				sections: [basePrompt, sharedPathsPrompt, updateExistingDocumentsWorkPrompt],
				requiredKeys: [],
				expectsMisonfigurations: false,
				existingDocumentBranch: true,
				expectsDuplicateThreeMarker: false,
			},
			{
				name: "add supporting documentation",
				workflowValues: createValidDocumentProjectStep4Values({
					projectOverviewCreationRequired: false,
					developerGuideCreationRequired: false,
					sessionObjective: "Add supporting documentation",
				}),
				sections: [basePrompt, sharedPathsPrompt, addSupportingDocumentationWorkPrompt],
				requiredKeys: [],
				expectsMisonfigurations: false,
				existingDocumentBranch: true,
				expectsDuplicateThreeMarker: true,
			},
		] as const

		const capturedTemplateKeys = step4PromptTemplates.flatMap((template) =>
			Array.from(template.matchAll(/\{workflow\.([^}]+)\}/g), (match) => match[1]),
		)
		for (const capturedKey of capturedTemplateKeys) {
			expect(DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS).to.include(capturedKey)
		}

		const projectedNames = buildDocumentProjectStep4ToolSchemas().map((spec) => spec.name)
		expect(projectedNames).to.include("attempt_completion")
		expect(projectedNames).to.include("ask_followup_question")

		for (const variant of variants) {
			const selectedSections: readonly string[] = variant.sections
			const input = createDocumentProjectPromptBuilderInput(4, variant.workflowValues)
			const promptSource = getStep(4).buildPromptSource(input)
			if (promptSource.kind !== "current_step_instruction_template") {
				throw new Error(`Expected valid Document Project Step 4 prompt source for ${variant.name}.`)
			}
			expect(promptSource.currentStepInstructionTemplate, variant.name).to.equal(selectedSections.join("\n\n"))
			const renderedPrompt = renderWorkflowPromptTemplate({
				template: promptSource.currentStepInstructionTemplate,
				workflowValueKeys: DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS,
				workflowValues: variant.workflowValues,
				context: `Document Project Step 4 ${variant.name}`,
			})
			const renderSection = (section: string): string =>
				renderWorkflowPromptTemplate({
					template: section,
					workflowValueKeys: DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS,
					workflowValues: variant.workflowValues,
					context: `Document Project Step 4 ${variant.name} section`,
				})

			let previousSectionIndex = -1
			for (const selectedSection of selectedSections) {
				const renderedSection = renderSection(selectedSection)
				const sectionIndex = renderedPrompt.indexOf(renderedSection)
				expect(sectionIndex, `${variant.name}: ${renderedSection}`).to.be.greaterThan(previousSectionIndex)
				previousSectionIndex = sectionIndex
			}
			for (const unselectedSection of allSections.filter((section) => !selectedSections.includes(section))) {
				expect(renderedPrompt, variant.name).not.to.include(renderSection(unselectedSection))
			}

			expect(promptSource.currentStepInstructionTemplate, variant.name).to.include(sharedPathsPrompt)
			expect(renderedPrompt, variant.name).to.include("/test/project/docs/projects/agent-guidance/project-overview.md")
			expect(renderedPrompt, variant.name).to.include("/test/project/docs/projects/agent-guidance/developer-guide.md")
			expect(renderedPrompt, variant.name).to.include("docs/projects/agent-guidance/project-overview.md")
			expect(renderedPrompt, variant.name).to.include("docs/projects/agent-guidance/developer-guide.md")
			for (const requiredKey of variant.requiredKeys) {
				const requiredValue = variant.workflowValues[requiredKey]
				if (typeof requiredValue === "string") {
					expect(requiredValue.trim(), `${variant.name}: ${requiredKey}`).not.to.equal("")
				}
				expect(renderedPrompt, `${variant.name}: ${requiredKey}`).to.include(String(requiredValue))
			}
			expect(renderedPrompt.includes("misonfigurations"), variant.name).to.equal(variant.expectsMisonfigurations)
			expect(renderedPrompt.includes("focused on updating existing documentation"), variant.name).to.equal(
				variant.existingDocumentBranch,
			)
			const duplicateThreeMarkerCount = renderedPrompt.match(/^3\./gm)?.length ?? 0
			expect(duplicateThreeMarkerCount === 2, variant.name).to.equal(variant.expectsDuplicateThreeMarker)
			expect(renderedPrompt, variant.name).to.include("attempt_completion")
			if (variant.name === "update existing documents") {
				expect(renderedPrompt).to.include("ask_followup_question")
			}
			for (const rawPlaceholder of DOCUMENT_PROJECT_STEP_4_RAW_PLACEHOLDERS) {
				expect(renderedPrompt, variant.name).not.to.include(rawPlaceholder)
			}
			expect(/\{workflow\.[^}]+\}/.test(renderedPrompt), variant.name).to.equal(false)
			expect(/\bworkflow\.[A-Za-z0-9_]+/.test(renderedPrompt), variant.name).to.equal(false)
			for (const marker of DOCUMENT_PROJECT_SOURCE_AUTHORING_MARKERS) {
				expect(renderedPrompt, variant.name).not.to.include(marker)
			}
			expect(/\*\*\* begin [^\n]* example \*\*\*/.test(renderedPrompt), variant.name).to.equal(false)
			expect(/\*\*\* end [^\n]* example \*\*\*/.test(renderedPrompt), variant.name).to.equal(false)
			for (const forbiddenToolName of FORBIDDEN_MODEL_FACING_TOOL_NAMES) {
				expect(renderedPrompt, variant.name).not.to.include(forbiddenToolName)
			}
		}
	})

	it("fails closed for every missing, empty, or wrong-typed Step 4 branch value", () => {
		const validFixtures = [
			{
				name: "both created",
				workflowValues: createValidDocumentProjectStep4Values({
					projectOverviewCreationRequired: true,
					developerGuideCreationRequired: true,
				}),
			},
			{
				name: "project overview only",
				workflowValues: createValidDocumentProjectStep4Values({
					projectOverviewCreationRequired: true,
					developerGuideCreationRequired: false,
				}),
			},
			{
				name: "developer guide only",
				workflowValues: createValidDocumentProjectStep4Values({
					projectOverviewCreationRequired: false,
					developerGuideCreationRequired: true,
				}),
			},
			{
				name: "update existing documents",
				workflowValues: createValidDocumentProjectStep4Values({
					projectOverviewCreationRequired: false,
					developerGuideCreationRequired: false,
					sessionObjective: "Update existing documents",
				}),
			},
			{
				name: "add supporting documentation",
				workflowValues: createValidDocumentProjectStep4Values({
					projectOverviewCreationRequired: false,
					developerGuideCreationRequired: false,
					sessionObjective: "Add supporting documentation",
				}),
			},
		]
		const mutations: Array<{ name: string; workflowValues: WorkflowValues }> = []
		const withoutKey = (workflowValues: WorkflowValues, key: DocumentProjectWorkflowValueKey): WorkflowValues => {
			const mutatedValues = { ...workflowValues }
			delete mutatedValues[key]
			return mutatedValues
		}
		const withValue = (
			workflowValues: WorkflowValues,
			key: DocumentProjectWorkflowValueKey,
			value: string | boolean,
		): WorkflowValues => ({ ...workflowValues, [key]: value })

		for (const fixture of validFixtures) {
			for (const key of [DocumentProjectWorkflowValueKey.ProjectOverview, DocumentProjectWorkflowValueKey.DeveloperGuide]) {
				mutations.push(
					{ name: `${fixture.name}: delete ${key}`, workflowValues: withoutKey(fixture.workflowValues, key) },
					{ name: `${fixture.name}: empty ${key}`, workflowValues: withValue(fixture.workflowValues, key, "") },
					{ name: `${fixture.name}: Boolean ${key}`, workflowValues: withValue(fixture.workflowValues, key, true) },
				)
			}
			for (const key of [
				DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
				DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
			]) {
				mutations.push(
					{ name: `${fixture.name}: delete ${key}`, workflowValues: withoutKey(fixture.workflowValues, key) },
					{ name: `${fixture.name}: string ${key}`, workflowValues: withValue(fixture.workflowValues, key, "true") },
				)
			}
		}

		for (const branchKeys of DOCUMENT_PROJECT_STEP_4_REQUIRED_BRANCH_VALUE_KEYS) {
			const validValues = createValidDocumentProjectStep4Values({
				projectOverviewCreationRequired: branchKeys.projectOverviewCreationRequired,
				developerGuideCreationRequired: branchKeys.developerGuideCreationRequired,
			})
			for (const key of branchKeys.stringKeys) {
				mutations.push(
					{ name: `delete required ${key}`, workflowValues: withoutKey(validValues, key) },
					{ name: `empty required ${key}`, workflowValues: withValue(validValues, key, "") },
					{ name: `Boolean required ${key}`, workflowValues: withValue(validValues, key, true) },
				)
			}
			for (const key of branchKeys.booleanKeys) {
				mutations.push(
					{ name: `delete required ${key}`, workflowValues: withoutKey(validValues, key) },
					{ name: `string required ${key}`, workflowValues: withValue(validValues, key, "true") },
				)
			}
		}

		const falseFalseValues = createValidDocumentProjectStep4Values({
			projectOverviewCreationRequired: false,
			developerGuideCreationRequired: false,
			sessionObjective: "Update existing documents",
		})
		mutations.push(
			{
				name: "delete session objective",
				workflowValues: withoutKey(falseFalseValues, DocumentProjectWorkflowValueKey.SessionObjective),
			},
			{
				name: "Boolean session objective",
				workflowValues: withValue(falseFalseValues, DocumentProjectWorkflowValueKey.SessionObjective, true),
			},
		)
		for (const invalidObjective of ["unsupported", " Update existing documents ", " Add supporting documentation "]) {
			mutations.push({
				name: `invalid session objective ${JSON.stringify(invalidObjective)}`,
				workflowValues: withValue(falseFalseValues, DocumentProjectWorkflowValueKey.SessionObjective, invalidObjective),
			})
		}

		const step = getStep(4)
		const promptBranch = step.decisionTree.branches["step-4-prompt-branch"]
		const invalidRoute = findStepRoute(4, "step-4-prompt-branch", "step-4-invalid-state")
		expect(invalidRoute.action).to.deep.equal({
			kind: "terminal_error",
			errorMessage: DOCUMENT_PROJECT_DOCUMENTATION_TASK_TERMINAL_ERROR,
		})
		for (const mutation of mutations) {
			const input = createDocumentProjectPromptBuilderInput(4, mutation.workflowValues)
			expect(step.buildPromptSource(input), mutation.name).to.deep.equal({ kind: "none" })
			const matchingRouteIds = promptBranch.routes
				.filter((route) => routeMatches(route, input.session))
				.map((route) => route.id)
			expect(matchingRouteIds, mutation.name).to.deep.equal(["step-4-invalid-state"])
		}
	})

	it("projects Step 4 only for valid state and completes only after attempt_completion succeeds", () => {
		const step4 = getStep(4)
		expect(step4.decisionTree.entryBranchId).to.equal("step-4-prompt-branch")
		expect(Object.keys(step4.decisionTree.branches)).to.deep.equal(["step-4-prompt-branch", "step-4-await-completion-branch"])
		expect(step4.decisionTree.branches["step-4-prompt-branch"].routes.map(summarizeRoute)).to.deep.equal([
			{
				id: "step-4-project-prompt",
				triggerKind: "session_predicate",
				action: { kind: "project_prompt" },
				followingBranchId: "step-4-await-completion-branch",
			},
			{
				id: "step-4-invalid-state",
				triggerKind: "session_predicate",
				action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_DOCUMENTATION_TASK_TERMINAL_ERROR },
				followingBranchId: undefined,
			},
		])
		expect(
			step4.decisionTree.branches["step-4-prompt-branch"].routes.some((route) => route.trigger.kind === "always"),
		).to.equal(false)
		expect(step4.decisionTree.branches["step-4-await-completion-branch"].routes.map(summarizeRoute)).to.deep.equal([
			{
				id: "step-4-complete-workflow",
				triggerKind: "on_event",
				action: { kind: "complete_workflow" },
				followingBranchId: undefined,
			},
		])

		const validValues = createValidDocumentProjectStep4Values({
			projectOverviewCreationRequired: true,
			developerGuideCreationRequired: true,
		})
		const validInput = createDocumentProjectPromptBuilderInput(4, validValues)
		const invalidInput = createDocumentProjectPromptBuilderInput(4, {})
		const promptBranch = step4.decisionTree.branches["step-4-prompt-branch"]
		expect(
			promptBranch.routes.filter((route) => routeMatches(route, validInput.session)).map((route) => route.id),
		).to.deep.equal(["step-4-project-prompt"])
		expect(
			promptBranch.routes.filter((route) => routeMatches(route, invalidInput.session)).map((route) => route.id),
		).to.deep.equal(["step-4-invalid-state"])
		expect(findStepRoute(4, "step-4-prompt-branch", "step-4-project-prompt").action).to.deep.equal({
			kind: "project_prompt",
		})

		const completionSession = createDocumentProjectBranchSession({
			stepNumber: 4,
			branchId: "step-4-await-completion-branch",
			workflowValues: validValues,
		})
		const completionRoute = findStepRoute(4, "step-4-await-completion-branch", "step-4-complete-workflow")
		const firstProjectedSpec = buildDocumentProjectStep4ToolSchemas()[0]
		if (firstProjectedSpec === undefined) {
			throw new Error("Expected Document Project Step 4 projected tools.")
		}
		expect(routeMatches(completionRoute, completionSession)).to.equal(false)
		expect(routeMatches(completionRoute, completionSession, { kind: "attempt_completion_succeeded" })).to.equal(true)
		expect(
			routeMatches(completionRoute, completionSession, {
				kind: "model_tool_failed",
				toolName: firstProjectedSpec.id,
				errorMessage: "injected",
			}),
		).to.equal(false)
		expect(
			routeMatches(completionRoute, completionSession, {
				kind: "model_tool_succeeded",
				toolName: firstProjectedSpec.id,
			}),
		).to.equal(false)
		expect(routeMatches(completionRoute, completionSession, { kind: "workflow_progress_request_denied" })).to.equal(false)

		for (const [stepNumber, buildExpectedSchema] of [
			[1, buildDocumentProjectStep1ToolSchemas],
			[2, buildDocumentProjectStep2ToolSchemas],
			[3, buildDocumentProjectStep3ToolSchemas],
		] as const) {
			const step = getStep(stepNumber)
			const input = createDocumentProjectPromptBuilderInput(stepNumber, {})
			expect(step.buildPromptSource(input)).to.deep.equal({ kind: "none" })
			expect(step.buildToolSchema(input)).to.deep.equal([])
			expect(step.buildToolSchema(input)).to.deep.equal(buildExpectedSchema())
		}

		const projectedNames = step4.buildToolSchema(validInput).map((spec) => spec.name)
		expect(projectedNames).to.deep.equal([
			"execute_command",
			"list_files",
			"search_files",
			"list_code_definition_names",
			"read_file",
			"read_file_range",
			"apply_patch",
			"write_to_file",
			"send_user_message",
			"ask_followup_question",
			"attempt_completion",
		])
		expect(step4.buildToolSchema(validInput)).to.deep.equal(buildDocumentProjectStep4ToolSchemas())
		expect(step4.promptTemplates).to.have.length(13)

		const promptSource = step4.buildPromptSource(validInput)
		if (promptSource.kind !== "current_step_instruction_template") {
			throw new Error("Expected valid Document Project Step 4 prompt source.")
		}
		const updateValues = createValidDocumentProjectStep4Values({
			projectOverviewCreationRequired: false,
			developerGuideCreationRequired: false,
			sessionObjective: "Update existing documents",
		})
		const updatePromptSource = step4.buildPromptSource(createDocumentProjectPromptBuilderInput(4, updateValues))
		if (updatePromptSource.kind !== "current_step_instruction_template") {
			throw new Error("Expected valid Document Project Step 4 update prompt source.")
		}
		const renderedToolPrompt = renderWorkflowPromptTemplate({
			template: `${promptSource.currentStepInstructionTemplate}\n\n${updatePromptSource.currentStepInstructionTemplate}`,
			workflowValueKeys: DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS,
			workflowValues: validValues,
			context: "Document Project Step 4 projected tool names",
		})
		for (const match of renderedToolPrompt.matchAll(
			/\b(execute_command|list_files|search_files|list_code_definition_names|read_file|read_file_range|apply_patch|write_to_file|send_user_message|ask_followup_question|attempt_completion)\b/g,
		)) {
			expect(projectedNames).to.include(match[1])
		}

		for (const step of Object.values(documentProjectWorkflowDefinition.steps)) {
			expect(step.completionRules).to.equal(undefined)
		}
		expect(getStep(1).decisionTree.branches["step-1-await-form-branch"].routes.map((route) => route.id)).to.deep.equal([
			"step-1-complete-form",
		])
		expect(getStep(3).decisionTree.branches["step-3-await-form-branch"].routes.map((route) => route.id)).to.deep.equal([
			"step-3-complete-form",
		])
	})

	it("registers only the canonical Document Project workflow identities", () => {
		expect(resolveWorkflowDefinition(DOCUMENT_PROJECT_WORKFLOW_NAME)).to.equal(documentProjectWorkflowDefinition)
		expect(resolveWorkflowBySlashCommand(DOCUMENT_PROJECT_WORKFLOW_SLASH_COMMAND_NAME)).to.equal(
			documentProjectWorkflowDefinition,
		)
		expect(resolveWorkflowByUseSkillName(DOCUMENT_PROJECT_WORKFLOW_USE_SKILL_NAME)).to.equal(
			documentProjectWorkflowDefinition,
		)
		expect(resolveWorkflowDefinition("document-project.md")).to.equal(undefined)
		expect(resolveWorkflowBySlashCommand("document-project.md")).to.equal(undefined)
		expect(resolveWorkflowByUseSkillName("document-project.md")).to.equal(undefined)
	})
})
