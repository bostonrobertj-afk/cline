import type { WorkflowFormDefinitionPayload } from "@shared/ExtensionMessage"
import type { WorkflowFormSessionData } from "@/core/task/workflow-form/types"
import type { WorkflowStepResolutionSourceRoute } from "@/core/task/workflow-step-resolution/types"
import { WorkflowArtifactFamily } from "../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowDecisionBranchTrigger,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowDeterministicProcedureResult,
	WorkflowPersonaDefinition,
	WorkflowPromptBuilderInput,
	WorkflowStepPromptSource,
	WorkflowValues,
} from "../../types"
import { buildInitialDeveloperGuideDocument, buildInitialProjectOverviewDocument } from "./documentProjectDocument"
import {
	buildDocumentProjectStep1ToolSchemas,
	buildDocumentProjectStep2ToolSchemas,
	buildDocumentProjectStep3ToolSchemas,
	buildDocumentProjectStep4ToolSchemas,
} from "./documentProjectToolSchemas"

export const DOCUMENT_PROJECT_WORKFLOW_NAME = "document-project"
export const DOCUMENT_PROJECT_WORKFLOW_DISPLAY_NAME = "document project"
export const DOCUMENT_PROJECT_WORKFLOW_SLASH_COMMAND_NAME = "document-project"
export const DOCUMENT_PROJECT_WORKFLOW_USE_SKILL_NAME = "document-project"
export const DOCUMENT_PROJECT_WORKFLOW_DESCRIPTION =
	"This workflow builds and/or updates documentation to leverage as context while planning and implementing development projects. It focuses on a developer guide and project overview which together explain the nature of your project as well as your preferences and rules for working in the repo."
export const DOCUMENT_PROJECT_ENTRY_PROMPT =
	"In this workflow, you'll generate or update the developer guide and project overview, which are used in other workflows to provide agents with context regarding your project and ways of working."

export const DOCUMENT_PROJECT_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "Mary",
	role: "Technical Writer",
	identity: "producing product documentation for developer teams.",
	capabilities: ["product analysis", "technical documentation"],
	communicationStyle: "crisp, checklist-driven, and ambiguity-free.",
	principles: ["Developers do their best work when they have comprehenvise product documentation at their disposal."],
}

export enum DocumentProjectWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	ProjectOverviewArtifactFamily = "project_overview_artifact_family",
	ProjectOverviewArtifactIdentity = "project_overview_artifact_identity",
	ProjectOverviewArtifactFilename = "project_overview_artifact_filename",
	ProjectOverviewArtifactRelativePath = "project_overview_artifact_relative_path",
	ProjectOverview = "project_overview",
	DeveloperGuideArtifactFamily = "developer_guide_artifact_family",
	DeveloperGuideArtifactIdentity = "developer_guide_artifact_identity",
	DeveloperGuideArtifactFilename = "developer_guide_artifact_filename",
	DeveloperGuideArtifactRelativePath = "developer_guide_artifact_relative_path",
	DeveloperGuide = "developer_guide",
	ProjectOverviewCreationRequired = "project_overview_creation_required",
	DeveloperGuideCreationRequired = "developer_guide_creation_required",
	SessionObjective = "session_objective",
	RepoType = "repo_type",
	ProductType = "product_type",
	PrimaryProgrammingLanguage = "primary_programming_language",
	RepoStatus = "repo_status",
	ApiIndicator = "api_indicator",
	DatabaseIndicator = "database_indicator",
	StateManagementIndicator = "state_management_indicator",
	UiIndicator = "ui_indicator",
	DeploymentIndicator = "deployment_indicator",
	RecentProject = "recent_project",
	PlannedEnhancements = "planned_enhancements",
	KnownIssues = "known_issues",
}

export const DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS: readonly DocumentProjectWorkflowValueKey[] = [
	DocumentProjectWorkflowValueKey.ProjectMode,
	DocumentProjectWorkflowValueKey.ProjectTitle,
	DocumentProjectWorkflowValueKey.ProjectFolderName,
	DocumentProjectWorkflowValueKey.ProjectOverviewArtifactFamily,
	DocumentProjectWorkflowValueKey.ProjectOverviewArtifactIdentity,
	DocumentProjectWorkflowValueKey.ProjectOverviewArtifactFilename,
	DocumentProjectWorkflowValueKey.ProjectOverviewArtifactRelativePath,
	DocumentProjectWorkflowValueKey.ProjectOverview,
	DocumentProjectWorkflowValueKey.DeveloperGuideArtifactFamily,
	DocumentProjectWorkflowValueKey.DeveloperGuideArtifactIdentity,
	DocumentProjectWorkflowValueKey.DeveloperGuideArtifactFilename,
	DocumentProjectWorkflowValueKey.DeveloperGuideArtifactRelativePath,
	DocumentProjectWorkflowValueKey.DeveloperGuide,
	DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
	DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
	DocumentProjectWorkflowValueKey.SessionObjective,
	DocumentProjectWorkflowValueKey.RepoType,
	DocumentProjectWorkflowValueKey.ProductType,
	DocumentProjectWorkflowValueKey.PrimaryProgrammingLanguage,
	DocumentProjectWorkflowValueKey.RepoStatus,
	DocumentProjectWorkflowValueKey.ApiIndicator,
	DocumentProjectWorkflowValueKey.DatabaseIndicator,
	DocumentProjectWorkflowValueKey.StateManagementIndicator,
	DocumentProjectWorkflowValueKey.UiIndicator,
	DocumentProjectWorkflowValueKey.DeploymentIndicator,
	DocumentProjectWorkflowValueKey.RecentProject,
	DocumentProjectWorkflowValueKey.PlannedEnhancements,
	DocumentProjectWorkflowValueKey.KnownIssues,
]

export const DOCUMENT_PROJECT_ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: DocumentProjectWorkflowValueKey.ProjectMode,
	projectTitle: DocumentProjectWorkflowValueKey.ProjectTitle,
	projectFolderName: DocumentProjectWorkflowValueKey.ProjectFolderName,
}

export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_ARTIFACT_ID = "project_overview"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_ARTIFACT_ID = "developer_guide"

export const DOCUMENT_PROJECT_ARTIFACTS: NonNullable<WorkflowDefinition["artifacts"]> = {
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
}

export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_PREREQUISITE_ID = "project_overview"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_PREREQUISITE_ID = "developer_guide"

export const DOCUMENT_PROJECT_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]> = {
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
}

export const DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR =
	"I could not determine which reference documents need to be generated."
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_ALLOCATION_TERMINAL_ERROR =
	"I could not create project-overview.md in the Agent Guidance folder."
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_BUILD_TERMINAL_ERROR =
	"I could not populate the initial content for project-overview.md."
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_ALLOCATION_TERMINAL_ERROR =
	"I could not create developer-guide.md in the Agent Guidance folder."
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_BUILD_TERMINAL_ERROR =
	"I could not populate the initial content for developer-guide.md."
export const DOCUMENT_PROJECT_BASELINE_DATA_TERMINAL_ERROR = "I could not determine which baseline information must be collected."
export const DOCUMENT_PROJECT_DOCUMENTATION_TASK_TERMINAL_ERROR =
	"I could not determine the appropriate documentation task for the current session."

export const DOCUMENT_PROJECT_STEP_1_FORM_ID = "step-1-confirm-document-generation-form"
export const DOCUMENT_PROJECT_STEP_1_PANEL_A_ID = "step-1-panel-a-full-scan-needed"
export const DOCUMENT_PROJECT_STEP_1_PANEL_B_ID = "step-1-panel-b-missing-project-overview"
export const DOCUMENT_PROJECT_STEP_1_PANEL_C_ID = "step-1-panel-c-missing-developer-guide"
export const DOCUMENT_PROJECT_STEP_1_PANEL_D_ID = "step-1-panel-d-clarify-intent"

export function buildDocumentProjectStep1WorkflowForm(): WorkflowFormDefinitionPayload {
	const terminalTransition = {
		type: "conditional" as const,
		conditionSourceKey: "__terminal__",
		branches: [],
		defaultTerminal: true,
	}
	return {
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
}

export const DOCUMENT_PROJECT_STEP_3_FORM_ID = "step-3-gather-baseline-project-data-form"
export const DOCUMENT_PROJECT_STEP_3_PANEL_A_ID = "step-3-panel-a-repository-type"
export const DOCUMENT_PROJECT_STEP_3_PANEL_B_ID = "step-3-panel-b-project-type"
export const DOCUMENT_PROJECT_STEP_3_PANEL_C_ID = "step-3-panel-c-primary-language"
export const DOCUMENT_PROJECT_STEP_3_PANEL_D_ID = "step-3-panel-d-repo-status"
export const DOCUMENT_PROJECT_STEP_3_PANEL_E_ID = "step-3-panel-e-api-usage"
export const DOCUMENT_PROJECT_STEP_3_PANEL_F_ID = "step-3-panel-f-data-models"
export const DOCUMENT_PROJECT_STEP_3_PANEL_G_ID = "step-3-panel-g-state-management"
export const DOCUMENT_PROJECT_STEP_3_PANEL_H_ID = "step-3-panel-h-user-interface"
export const DOCUMENT_PROJECT_STEP_3_PANEL_I_ID = "step-3-panel-i-deployment-configuration"
export const DOCUMENT_PROJECT_STEP_3_PANEL_J_ID = "step-3-panel-j-recent-project"
export const DOCUMENT_PROJECT_STEP_3_PANEL_K_ID = "step-3-panel-k-planned-enhancements"
export const DOCUMENT_PROJECT_STEP_3_PANEL_L_ID = "step-3-panel-l-known-issues"

export function buildDocumentProjectStep3WorkflowForm(): WorkflowFormDefinitionPayload {
	const submit: Pick<WorkflowFormDefinitionPayload["panels"][string], "allowedActions" | "actionLabels"> = {
		allowedActions: ["submit"],
		actionLabels: { submit: "continue" },
	}
	return {
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
						options: [
							{ value: "Monolith: Single cohesive codebase", label: "Monolith: Single cohesive codebase" },
							{
								value: "Monorepo: Multiple parts in one repository",
								label: "Monorepo: Multiple parts in one repository",
							},
							{
								value: "Multi-part: Separate client/server or similar architecture",
								label: "Multi-part: Separate client/server or similar architecture",
							},
						],
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
						options: [
							{ value: "healthcare", label: "healthcare" },
							{ value: "fintech", label: "fintech" },
							{ value: "govtech", label: "govtech" },
							{ value: "edtech", label: "edtech" },
							{ value: "aerospace", label: "aerospace" },
							{ value: "automotive", label: "automotive" },
							{ value: "scientific", label: "scientific" },
							{ value: "legaltech", label: "legaltech" },
							{ value: "insurtech", label: "insurtech" },
							{ value: "energy", label: "energy" },
							{ value: "process control", label: "process control" },
							{ value: "building automation", label: "building automation" },
							{ value: "gaming", label: "gaming" },
							{ value: "entertainment", label: "entertainment" },
							{ value: "mobile application", label: "mobile application" },
							{ value: "web application", label: "web application" },
							{ value: "desktop application", label: "desktop application" },
							{ value: "CLI", label: "CLI" },
							{ value: "library", label: "library" },
							{ value: "extension", label: "extension" },
							{ value: "infrastructure", label: "infrastructure" },
							{ value: "other", label: "other" },
						],
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
						options: [
							{
								value: "Greenfield: Brand-new project with minimal files/folders in place",
								label: "Greenfield: Brand-new project with minimal files/folders in place",
							},
							{
								value: "Brownfield: Established project with existing architecture",
								label: "Brownfield: Established project with existing architecture",
							},
						],
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
				transition: { type: "conditional", conditionSourceKey: "__terminal__", branches: [], defaultTerminal: true },
			},
		},
	}
}

function readWorkflowStringValue(workflowValues: WorkflowValues, key: DocumentProjectWorkflowValueKey): string | undefined {
	const value = workflowValues[key]
	return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined
}

function readWorkflowBooleanValue(workflowValues: WorkflowValues, key: DocumentProjectWorkflowValueKey): boolean | undefined {
	const value = workflowValues[key]
	return typeof value === "boolean" ? value : undefined
}

type DocumentProjectSessionObjective = "Update existing documents" | "Add supporting documentation"

function readDocumentProjectSessionObjective(workflowValues: WorkflowValues): DocumentProjectSessionObjective | undefined {
	const value = workflowValues[DocumentProjectWorkflowValueKey.SessionObjective]
	return value === "Update existing documents" || value === "Add supporting documentation" ? value : undefined
}

interface DocumentProjectReferenceDocumentState {
	projectOverviewCreationRequired: boolean
	developerGuideCreationRequired: boolean
}

function readDocumentProjectReferenceDocumentState(
	session: ActiveWorkflowSession,
): DocumentProjectReferenceDocumentState | undefined {
	const orderedPrerequisites = Object.values(DOCUMENT_PROJECT_PREREQUISITE_FILES)
	if (session.prerequisiteFileResolutions.length !== orderedPrerequisites.length) {
		return undefined
	}
	const requiredStates: boolean[] = []
	for (const [index, prerequisite] of orderedPrerequisites.entries()) {
		const result = session.prerequisiteFileResolutions[index]
		if (result === undefined || result.prerequisiteId !== prerequisite.id) {
			return undefined
		}
		const rawPath = session.workflowValues[prerequisite.workflowValueKey]
		if (result.outcome === "found") {
			if (typeof rawPath !== "string" || rawPath.length === 0 || rawPath !== result.resolvedAbsolutePath) {
				return undefined
			}
			requiredStates.push(false)
		} else {
			if (rawPath !== undefined) {
				return undefined
			}
			requiredStates.push(true)
		}
	}
	const [projectOverviewCreationRequired, developerGuideCreationRequired] = requiredStates
	if (projectOverviewCreationRequired === undefined || developerGuideCreationRequired === undefined) {
		return undefined
	}
	return { projectOverviewCreationRequired, developerGuideCreationRequired }
}

function validateReferenceDocumentResolutionState(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult {
	return readDocumentProjectReferenceDocumentState(session) === undefined
		? { kind: "failed", errorMessage: DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR }
		: { kind: "succeeded" }
}

function deriveDocumentCreationRequirements(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult {
	const state = readDocumentProjectReferenceDocumentState(session)
	if (state === undefined) {
		return { kind: "failed", errorMessage: DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR }
	}
	return {
		kind: "succeeded",
		workflowValueWrites: {
			project_overview_creation_required: state.projectOverviewCreationRequired,
			developer_guide_creation_required: state.developerGuideCreationRequired,
		},
	}
}

function buildBaselineProjectDataFormSessionData(session: ActiveWorkflowSession): WorkflowFormSessionData {
	const projectOverviewCreationRequired = readWorkflowBooleanValue(
		session.workflowValues,
		DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
	)
	const developerGuideCreationRequired = readWorkflowBooleanValue(
		session.workflowValues,
		DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
	)
	if (projectOverviewCreationRequired === undefined || developerGuideCreationRequired === undefined) {
		throw new Error(DOCUMENT_PROJECT_BASELINE_DATA_TERMINAL_ERROR)
	}
	return {
		project_overview_creation_required: projectOverviewCreationRequired,
		developer_guide_creation_required: developerGuideCreationRequired,
	}
}

function sourceRouteMatches(sourceRoute: WorkflowStepResolutionSourceRoute, branchId: string, routeId: string): boolean {
	return sourceRoute.branchId === branchId && sourceRoute.routeId === routeId
}

function toolBackedOperationSucceeded(branchId: string, routeId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "tool_backed_operation_succeeded" &&
			sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId),
	}
}

function toolBackedOperationFailed(branchId: string, routeId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "tool_backed_operation_failed" &&
			sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId),
	}
}

function workflowFormCompleted(workflowFormId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_form_completed" && triggerEvent.workflowFormId === workflowFormId,
	}
}

function buildDocumentProjectStep1DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-1-resolve-branch",
		branches: {
			"step-1-resolve-branch": {
				id: "step-1-resolve-branch",
				routes: [
					{
						id: "step-1-resolve-prerequisites",
						trigger: { kind: "always" },
						action: { kind: "resolve_prerequisite_files", prerequisiteIds: ["project_overview", "developer_guide"] },
						followingBranchId: "step-1-validate-branch",
					},
				],
			},
			"step-1-validate-branch": {
				id: "step-1-validate-branch",
				routes: [
					{
						id: "step-1-validate-prerequisites",
						trigger: { kind: "always" },
						action: {
							kind: "run_deterministic_procedure",
							instruction: { run: validateReferenceDocumentResolutionState },
						},
						followingBranchId: "step-1-form-selection-branch",
					},
				],
			},
			"step-1-form-selection-branch": {
				id: "step-1-form-selection-branch",
				routes: [
					{
						id: "step-1-render-form-a",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowStringValue(input.workflowValues, DocumentProjectWorkflowValueKey.ProjectOverview) ===
									undefined &&
								readWorkflowStringValue(input.workflowValues, DocumentProjectWorkflowValueKey.DeveloperGuide) ===
									undefined,
						},
						action: {
							kind: "render_workflow_form",
							workflowFormId: DOCUMENT_PROJECT_STEP_1_FORM_ID,
							startPanelId: DOCUMENT_PROJECT_STEP_1_PANEL_A_ID,
						},
						followingBranchId: "step-1-await-form-branch",
					},
					{
						id: "step-1-render-form-b",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowStringValue(input.workflowValues, DocumentProjectWorkflowValueKey.ProjectOverview) ===
									undefined &&
								readWorkflowStringValue(input.workflowValues, DocumentProjectWorkflowValueKey.DeveloperGuide) !==
									undefined,
						},
						action: {
							kind: "render_workflow_form",
							workflowFormId: DOCUMENT_PROJECT_STEP_1_FORM_ID,
							startPanelId: DOCUMENT_PROJECT_STEP_1_PANEL_B_ID,
						},
						followingBranchId: "step-1-await-form-branch",
					},
					{
						id: "step-1-render-form-c",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowStringValue(input.workflowValues, DocumentProjectWorkflowValueKey.ProjectOverview) !==
									undefined &&
								readWorkflowStringValue(input.workflowValues, DocumentProjectWorkflowValueKey.DeveloperGuide) ===
									undefined,
						},
						action: {
							kind: "render_workflow_form",
							workflowFormId: DOCUMENT_PROJECT_STEP_1_FORM_ID,
							startPanelId: DOCUMENT_PROJECT_STEP_1_PANEL_C_ID,
						},
						followingBranchId: "step-1-await-form-branch",
					},
					{
						id: "step-1-render-form-d",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowStringValue(input.workflowValues, DocumentProjectWorkflowValueKey.ProjectOverview) !==
									undefined &&
								readWorkflowStringValue(input.workflowValues, DocumentProjectWorkflowValueKey.DeveloperGuide) !==
									undefined,
						},
						action: {
							kind: "render_workflow_form",
							workflowFormId: DOCUMENT_PROJECT_STEP_1_FORM_ID,
							startPanelId: DOCUMENT_PROJECT_STEP_1_PANEL_D_ID,
						},
						followingBranchId: "step-1-await-form-branch",
					},
				],
			},
			"step-1-await-form-branch": {
				id: "step-1-await-form-branch",
				routes: [
					{
						id: "step-1-complete-form",
						trigger: workflowFormCompleted(DOCUMENT_PROJECT_STEP_1_FORM_ID),
						action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } },
					},
				],
			},
		},
	}
}

function buildDocumentProjectStep2DecisionTree(): WorkflowDecisionTree {
	const allocateProjectOverview = {
		kind: "allocate_artifact" as const,
		artifactId: DOCUMENT_PROJECT_PROJECT_OVERVIEW_ARTIFACT_ID,
	}
	const buildProjectOverview = {
		kind: "build_workflow_document" as const,
		instruction: {
			artifactId: DOCUMENT_PROJECT_PROJECT_OVERVIEW_ARTIFACT_ID,
			buildContent: buildInitialProjectOverviewDocument,
		},
	}
	const allocateDeveloperGuide = {
		kind: "allocate_artifact" as const,
		artifactId: DOCUMENT_PROJECT_DEVELOPER_GUIDE_ARTIFACT_ID,
	}
	const buildDeveloperGuide = {
		kind: "build_workflow_document" as const,
		instruction: {
			artifactId: DOCUMENT_PROJECT_DEVELOPER_GUIDE_ARTIFACT_ID,
			buildContent: buildInitialDeveloperGuideDocument,
		},
	}
	const transitionToDeveloperGuide = {
		kind: "transition_step" as const,
		target: { kind: "named_branch" as const, stepNumber: 2, branchId: "step-2-developer-guide-branch" },
	}
	const transitionToComplete = {
		kind: "transition_step" as const,
		target: { kind: "named_branch" as const, stepNumber: 2, branchId: "step-2-complete-branch" },
	}
	return {
		entryBranchId: "step-2-derive-branch",
		branches: {
			"step-2-derive-branch": {
				id: "step-2-derive-branch",
				routes: [
					{
						id: "step-2-derive-creation-requirements",
						trigger: { kind: "always" },
						action: { kind: "run_deterministic_procedure", instruction: { run: deriveDocumentCreationRequirements } },
						followingBranchId: "step-2-project-overview-branch",
					},
				],
			},
			"step-2-project-overview-branch": {
				id: "step-2-project-overview-branch",
				routes: [
					{
						id: "step-2-skip-project-overview",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
								) === false,
						},
						action: transitionToDeveloperGuide,
					},
					{
						id: "step-2-allocate-project-overview",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
								) === true,
						},
						action: allocateProjectOverview,
						followingBranchId: "step-2-await-project-overview-allocation-branch",
					},
					{
						id: "step-2-invalid-project-overview-state",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
								) === undefined,
						},
						action: {
							kind: "terminal_error",
							errorMessage: DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR,
						},
					},
				],
			},
			"step-2-await-project-overview-allocation-branch": {
				id: "step-2-await-project-overview-allocation-branch",
				routes: [
					{
						id: "step-2-build-project-overview-after-allocation",
						trigger: toolBackedOperationSucceeded(
							"step-2-project-overview-branch",
							"step-2-allocate-project-overview",
						),
						action: buildProjectOverview,
						followingBranchId: "step-2-await-project-overview-build-branch",
					},
					{
						id: "step-2-retry-project-overview-allocation",
						trigger: toolBackedOperationFailed("step-2-project-overview-branch", "step-2-allocate-project-overview"),
						action: allocateProjectOverview,
						followingBranchId: "step-2-await-project-overview-retry-branch",
					},
				],
			},
			"step-2-await-project-overview-retry-branch": {
				id: "step-2-await-project-overview-retry-branch",
				routes: [
					{
						id: "step-2-build-project-overview-after-retry",
						trigger: toolBackedOperationSucceeded(
							"step-2-await-project-overview-allocation-branch",
							"step-2-retry-project-overview-allocation",
						),
						action: buildProjectOverview,
						followingBranchId: "step-2-await-project-overview-build-branch",
					},
					{
						id: "step-2-project-overview-retry-failed",
						trigger: toolBackedOperationFailed(
							"step-2-await-project-overview-allocation-branch",
							"step-2-retry-project-overview-allocation",
						),
						action: {
							kind: "terminal_error",
							errorMessage: DOCUMENT_PROJECT_PROJECT_OVERVIEW_ALLOCATION_TERMINAL_ERROR,
						},
					},
				],
			},
			"step-2-await-project-overview-build-branch": {
				id: "step-2-await-project-overview-build-branch",
				routes: [
					{
						id: "step-2-project-overview-build-succeeded-after-allocation",
						trigger: toolBackedOperationSucceeded(
							"step-2-await-project-overview-allocation-branch",
							"step-2-build-project-overview-after-allocation",
						),
						action: transitionToDeveloperGuide,
					},
					{
						id: "step-2-project-overview-build-succeeded-after-retry",
						trigger: toolBackedOperationSucceeded(
							"step-2-await-project-overview-retry-branch",
							"step-2-build-project-overview-after-retry",
						),
						action: transitionToDeveloperGuide,
					},
					{
						id: "step-2-project-overview-build-failed-after-allocation",
						trigger: toolBackedOperationFailed(
							"step-2-await-project-overview-allocation-branch",
							"step-2-build-project-overview-after-allocation",
						),
						action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_PROJECT_OVERVIEW_BUILD_TERMINAL_ERROR },
					},
					{
						id: "step-2-project-overview-build-failed-after-retry",
						trigger: toolBackedOperationFailed(
							"step-2-await-project-overview-retry-branch",
							"step-2-build-project-overview-after-retry",
						),
						action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_PROJECT_OVERVIEW_BUILD_TERMINAL_ERROR },
					},
				],
			},
			"step-2-developer-guide-branch": {
				id: "step-2-developer-guide-branch",
				routes: [
					{
						id: "step-2-skip-developer-guide",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
								) === false,
						},
						action: transitionToComplete,
					},
					{
						id: "step-2-allocate-developer-guide",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
								) === true,
						},
						action: allocateDeveloperGuide,
						followingBranchId: "step-2-await-developer-guide-allocation-branch",
					},
					{
						id: "step-2-invalid-developer-guide-state",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
								) === undefined,
						},
						action: {
							kind: "terminal_error",
							errorMessage: DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR,
						},
					},
				],
			},
			"step-2-await-developer-guide-allocation-branch": {
				id: "step-2-await-developer-guide-allocation-branch",
				routes: [
					{
						id: "step-2-build-developer-guide-after-allocation",
						trigger: toolBackedOperationSucceeded("step-2-developer-guide-branch", "step-2-allocate-developer-guide"),
						action: buildDeveloperGuide,
						followingBranchId: "step-2-await-developer-guide-build-branch",
					},
					{
						id: "step-2-retry-developer-guide-allocation",
						trigger: toolBackedOperationFailed("step-2-developer-guide-branch", "step-2-allocate-developer-guide"),
						action: allocateDeveloperGuide,
						followingBranchId: "step-2-await-developer-guide-retry-branch",
					},
				],
			},
			"step-2-await-developer-guide-retry-branch": {
				id: "step-2-await-developer-guide-retry-branch",
				routes: [
					{
						id: "step-2-build-developer-guide-after-retry",
						trigger: toolBackedOperationSucceeded(
							"step-2-await-developer-guide-allocation-branch",
							"step-2-retry-developer-guide-allocation",
						),
						action: buildDeveloperGuide,
						followingBranchId: "step-2-await-developer-guide-build-branch",
					},
					{
						id: "step-2-developer-guide-retry-failed",
						trigger: toolBackedOperationFailed(
							"step-2-await-developer-guide-allocation-branch",
							"step-2-retry-developer-guide-allocation",
						),
						action: {
							kind: "terminal_error",
							errorMessage: DOCUMENT_PROJECT_DEVELOPER_GUIDE_ALLOCATION_TERMINAL_ERROR,
						},
					},
				],
			},
			"step-2-await-developer-guide-build-branch": {
				id: "step-2-await-developer-guide-build-branch",
				routes: [
					{
						id: "step-2-developer-guide-build-succeeded-after-allocation",
						trigger: toolBackedOperationSucceeded(
							"step-2-await-developer-guide-allocation-branch",
							"step-2-build-developer-guide-after-allocation",
						),
						action: transitionToComplete,
					},
					{
						id: "step-2-developer-guide-build-succeeded-after-retry",
						trigger: toolBackedOperationSucceeded(
							"step-2-await-developer-guide-retry-branch",
							"step-2-build-developer-guide-after-retry",
						),
						action: transitionToComplete,
					},
					{
						id: "step-2-developer-guide-build-failed-after-allocation",
						trigger: toolBackedOperationFailed(
							"step-2-await-developer-guide-allocation-branch",
							"step-2-build-developer-guide-after-allocation",
						),
						action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_DEVELOPER_GUIDE_BUILD_TERMINAL_ERROR },
					},
					{
						id: "step-2-developer-guide-build-failed-after-retry",
						trigger: toolBackedOperationFailed(
							"step-2-await-developer-guide-retry-branch",
							"step-2-build-developer-guide-after-retry",
						),
						action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_DEVELOPER_GUIDE_BUILD_TERMINAL_ERROR },
					},
				],
			},
			"step-2-complete-branch": {
				id: "step-2-complete-branch",
				routes: [
					{
						id: "step-2-complete",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowStringValue(input.workflowValues, DocumentProjectWorkflowValueKey.ProjectOverview) !==
									undefined &&
								readWorkflowStringValue(input.workflowValues, DocumentProjectWorkflowValueKey.DeveloperGuide) !==
									undefined &&
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
								) !== undefined &&
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
								) !== undefined,
						},
						action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 3 } },
					},
					{
						id: "step-2-invalid-completion-state",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowStringValue(input.workflowValues, DocumentProjectWorkflowValueKey.ProjectOverview) ===
									undefined ||
								readWorkflowStringValue(input.workflowValues, DocumentProjectWorkflowValueKey.DeveloperGuide) ===
									undefined ||
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
								) === undefined ||
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
								) === undefined,
						},
						action: {
							kind: "terminal_error",
							errorMessage: DOCUMENT_PROJECT_REFERENCE_DOCUMENT_STATE_TERMINAL_ERROR,
						},
					},
				],
			},
		},
	}
}

function buildDocumentProjectStep3DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-3-route-branch",
		branches: {
			"step-3-route-branch": {
				id: "step-3-route-branch",
				routes: [
					{
						id: "step-3-skip-form",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
								) === false &&
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
								) === false,
						},
						action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 4 } },
					},
					{
						id: "step-3-render-form-a-project-overview-only",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
								) === true &&
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
								) === false,
						},
						action: {
							kind: "render_workflow_form",
							workflowFormId: DOCUMENT_PROJECT_STEP_3_FORM_ID,
							startPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_A_ID,
							buildSessionData: buildBaselineProjectDataFormSessionData,
						},
						followingBranchId: "step-3-await-form-branch",
					},
					{
						id: "step-3-render-form-j-developer-guide-only",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
								) === false &&
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
								) === true,
						},
						action: {
							kind: "render_workflow_form",
							workflowFormId: DOCUMENT_PROJECT_STEP_3_FORM_ID,
							startPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_J_ID,
							buildSessionData: buildBaselineProjectDataFormSessionData,
						},
						followingBranchId: "step-3-await-form-branch",
					},
					{
						id: "step-3-render-form-a-both",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
								) === true &&
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
								) === true,
						},
						action: {
							kind: "render_workflow_form",
							workflowFormId: DOCUMENT_PROJECT_STEP_3_FORM_ID,
							startPanelId: DOCUMENT_PROJECT_STEP_3_PANEL_A_ID,
							buildSessionData: buildBaselineProjectDataFormSessionData,
						},
						followingBranchId: "step-3-await-form-branch",
					},
					{
						id: "step-3-invalid-state",
						trigger: {
							kind: "session_predicate",
							matches: (input) =>
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
								) === undefined ||
								readWorkflowBooleanValue(
									input.workflowValues,
									DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
								) === undefined,
						},
						action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_BASELINE_DATA_TERMINAL_ERROR },
					},
				],
			},
			"step-3-await-form-branch": {
				id: "step-3-await-form-branch",
				routes: [
					{
						id: "step-3-complete-form",
						trigger: workflowFormCompleted(DOCUMENT_PROJECT_STEP_3_FORM_ID),
						action: { kind: "transition_step", target: { kind: "entry_branch", stepNumber: 4 } },
					},
				],
			},
		},
	}
}

export const DOCUMENT_PROJECT_STEP_4_BASE_PROMPT = `Role and Objective:
You are an expert technical writer and principal software architect. Your task is to generate comprehensive, production-ready system documentation for the codebase in the current workspace.`

export const DOCUMENT_PROJECT_STEP_4_BOTH_CREATED_STATUS_PROMPT = `These documents were automatically generated by the system with required headings and will be completed by you during this workflow.`

export const DOCUMENT_PROJECT_STEP_4_SHARED_PATHS_PROMPT = `    - Project Overview: {workflow.project_overview}
    - Developer Guide: {workflow.developer_guide}`

export const DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_ONLY_STATUS_PROMPT = `This document was missing at workflow invocation and has been generated as an initial scaffold for you to complete during this workflow:
    - Project Overview: {workflow.project_overview}
Completing this document is your primary focus during this workflow. You may add content and edit as-needed.

This document appears to have been generated during an earlier session. You'll need to ask the user to review and indicate whether additional revisions are needed:
    - Developer Guide: {workflow.developer_guide}
If you identify any inaccuracies or gaps in this document during your work, do not automatically update this document. Stop, inform the user of your discovery, and gain their consent before editing this document.`

export const DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_ONLY_STATUS_PROMPT = `This document was missing at workflow invocation and has been generated as an initial scaffold for you to complete during this workflow:
    - Developer Guide: {workflow.developer_guide}
Completing this document is your primary focus during this workflow. You may add content and edit as-needed.

This document appears to have been generated during an earlier session. You'll need to ask the user to review and indicate whether additional revisions are needed:
    - Project Overview: {workflow.project_overview}
If you identify any inaccuracies or gaps in this document during your work, do not automatically update this document. Stop, inform the user of your discovery, and gain their consent before editing this document.`

export const DOCUMENT_PROJECT_STEP_4_INPUT_INTRODUCTION_PROMPT = `The user provided the following inputs, which you must immediately add to the owning document under the appropriate headings:`

export const DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_INPUTS_PROMPT = `Project Overview:
    - Repository Type: {workflow.repo_type}
    - Product Type: {workflow.product_type}
    - Primary Programming Language: {workflow.primary_programming_language}
    - Repo Status: {workflow.repo_status}`

export const DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_INPUTS_PROMPT = `Developer Guide:
    - Recent Project Notes: {workflow.recent_project}
    - Planned Enhancements: {workflow.planned_enhancements}
    - Known Issues/ Tech Debt: {workflow.known_issues}`

export const DOCUMENT_PROJECT_STEP_4_BOTH_DOCUMENT_WORK_PROMPT = `After saving the user's inputs, notify them that you've added their inputs to the documents and are beginning your initial repo scan.

Perform an exhaustive system review in order to generate the needed content for the remaining sections in both of the provided documents. The user has provided these indicators to inform your scan:
- Uses APIs: {workflow.api_indicator}
- Uses Data Models or Databases: {workflow.database_indicator}
- Uses State Management: {workflow.state_management_indicator}
- Has a UI: {workflow.ui_indicator}
- Requires Deployment Config: {workflow.deployment_indicator}

The steps below are considered the appropriate method to conduct this system scan to populate the Project Overview:

# Context Gathering
1. Scan all active source files, configuration files, and data schemas in the repository.
2. Analyze the system's entry points, primary module dependencies, and external integrations.
3. Add content to {workflow.project_overview} as you work.

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

Once the document is fully populated and the user has approved the content, use attempt_completion to deliver a final recap of the work completed and end this workflow.`

export const DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_ONLY_WORK_PROMPT = `To populate the Developer Guide, walk the user through each section, preferring their input augmented by your own system review as needed.
Here's how to think about each section of the document:
- Before Contributing: What does a dev agent need to know before they write a single line of code in this repo? A good way to approach this is to identify the top 3-5 "gotchas" or "must-knows" that agents can't afford to overlook.
- Local Development Instructions: This section is more procedure-oriented, as you can see by the pregenerated content. You may add content to this section, but do not remove the pregenerated content in this section.
- Code Quality: This section also includes pregenerated content, which can be revised if the user requests changes. This is intended to ensure that dev agents output is clean, consistent, scalable, and reliable.
- End to End Testing: This section should detail the end-to-end testing for the product as well as any targeted testing suites. If any tests run automatically, this section should indicate what triggers them and which tests are automatically run.
- Commit Guidelines: This section also includes pregenerated content which can be revised if the user wishes.
- Most Recent Project Notes: This section should provide an overview of the most recent work in this repo (where applicable)
- Planned Enhancements: This section should be a backlog of future product changes that the user has identified but is not ready to act on yet.
- Known Issues & Technical Debt: This section should be an inventory of any known system issues, tech debt, or misonfigurations.

Once the document is fully populated and the user has approved the content, use attempt_completion to deliver a final recap of the work completed and end this workflow.`

export const DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_ONLY_WORK_PROMPT = `After saving the user's inputs, notify them that you've added their inputs to the document and are beginning your system scan.

Perform an exhaustive system review in order to generate the needed content for the remaining sections in the Project Overview document. The user has provided these indicators to inform your scan:
- Uses APIs: {workflow.api_indicator}
- Uses Data Models or Databases: {workflow.database_indicator}
- Uses State Management: {workflow.state_management_indicator}
- Has a UI: {workflow.ui_indicator}
- Requires Deployment Config: {workflow.deployment_indicator}

The steps below are considered the appropriate method to conduct this system scan:

# Context Gathering
1. Scan all active source files, configuration files, and data schemas in the repository.
2. Analyze the system's entry points, primary module dependencies, and external integrations.
3. Add content to {workflow.project_overview} as you work.

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

Once the document is fully populated and the user has approved the content, use attempt_completion to deliver a final recap of the work completed and end this workflow.`

export const DOCUMENT_PROJECT_STEP_4_UPDATE_EXISTING_DOCUMENTS_WORK_PROMPT = `You have been called inside a project documentation workflow focused on updating existing documentation. The existing project documentation is located at docs/projects/agent-guidance.

Follow these steps:
1. Identify which documents exist in the documentation folder
2. Use ask_followup_question to provide the user with a list of all existing documents in the folder asking them which file they'd like to update first
3. Make revisions as needed based on the user's direction and/or any documentation they provide you with.
4. Ensure that the user has reviewed and approved all new content, then use attempt_completion to provide a final change summary and end the workflow.`

export const DOCUMENT_PROJECT_STEP_4_ADD_SUPPORTING_DOCUMENTATION_WORK_PROMPT = `You have been called inside a project documentation workflow focused on updating existing documentation. The existing project documentation is located at docs/projects/agent-guidance.

Follow these steps:
1. Ask the user what they'd like to add new documentation for
2. Assess existing documentation to determine whether the content the user wants to add belongs in an existing document. If so, suggest updating the existing document(s) instead of generating new files.
3. Assist them in generating the requested documentation and/or updating existing documentation in the project documentation folder (docs/projects/agent-guidance)
3. When finished, confirm that the user has reviewed and approved all new content, then use attempt_completion to provide a final change summary and end the workflow.`

type DocumentProjectStep4PromptSectionSelection = { valid: true; sections: readonly string[] } | { valid: false }

function selectDocumentProjectStep4PromptSections(session: ActiveWorkflowSession): DocumentProjectStep4PromptSectionSelection {
	const projectOverview = readWorkflowStringValue(session.workflowValues, DocumentProjectWorkflowValueKey.ProjectOverview)
	const developerGuide = readWorkflowStringValue(session.workflowValues, DocumentProjectWorkflowValueKey.DeveloperGuide)
	const projectOverviewCreationRequired = readWorkflowBooleanValue(
		session.workflowValues,
		DocumentProjectWorkflowValueKey.ProjectOverviewCreationRequired,
	)
	const developerGuideCreationRequired = readWorkflowBooleanValue(
		session.workflowValues,
		DocumentProjectWorkflowValueKey.DeveloperGuideCreationRequired,
	)
	if (
		projectOverview === undefined ||
		developerGuide === undefined ||
		projectOverviewCreationRequired === undefined ||
		developerGuideCreationRequired === undefined
	) {
		return { valid: false }
	}
	const overviewStrings = [
		DocumentProjectWorkflowValueKey.RepoType,
		DocumentProjectWorkflowValueKey.ProductType,
		DocumentProjectWorkflowValueKey.PrimaryProgrammingLanguage,
		DocumentProjectWorkflowValueKey.RepoStatus,
	]
	const overviewBooleans = [
		DocumentProjectWorkflowValueKey.ApiIndicator,
		DocumentProjectWorkflowValueKey.DatabaseIndicator,
		DocumentProjectWorkflowValueKey.StateManagementIndicator,
		DocumentProjectWorkflowValueKey.UiIndicator,
		DocumentProjectWorkflowValueKey.DeploymentIndicator,
	]
	const guideStrings = [
		DocumentProjectWorkflowValueKey.RecentProject,
		DocumentProjectWorkflowValueKey.PlannedEnhancements,
		DocumentProjectWorkflowValueKey.KnownIssues,
	]
	if (projectOverviewCreationRequired && developerGuideCreationRequired) {
		if (
			![...overviewStrings, ...guideStrings].every(
				(key) => readWorkflowStringValue(session.workflowValues, key) !== undefined,
			) ||
			!overviewBooleans.every((key) => readWorkflowBooleanValue(session.workflowValues, key) !== undefined)
		) {
			return { valid: false }
		}
		return {
			valid: true,
			sections: [
				DOCUMENT_PROJECT_STEP_4_BASE_PROMPT,
				DOCUMENT_PROJECT_STEP_4_BOTH_CREATED_STATUS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_SHARED_PATHS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_INPUT_INTRODUCTION_PROMPT,
				DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_INPUTS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_INPUTS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_BOTH_DOCUMENT_WORK_PROMPT,
			],
		}
	}
	if (projectOverviewCreationRequired) {
		if (
			!overviewStrings.every((key) => readWorkflowStringValue(session.workflowValues, key) !== undefined) ||
			!overviewBooleans.every((key) => readWorkflowBooleanValue(session.workflowValues, key) !== undefined)
		) {
			return { valid: false }
		}
		return {
			valid: true,
			sections: [
				DOCUMENT_PROJECT_STEP_4_BASE_PROMPT,
				DOCUMENT_PROJECT_STEP_4_SHARED_PATHS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_ONLY_STATUS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_INPUT_INTRODUCTION_PROMPT,
				DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_INPUTS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_ONLY_WORK_PROMPT,
			],
		}
	}
	if (developerGuideCreationRequired) {
		if (!guideStrings.every((key) => readWorkflowStringValue(session.workflowValues, key) !== undefined)) {
			return { valid: false }
		}
		return {
			valid: true,
			sections: [
				DOCUMENT_PROJECT_STEP_4_BASE_PROMPT,
				DOCUMENT_PROJECT_STEP_4_SHARED_PATHS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_ONLY_STATUS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_INPUT_INTRODUCTION_PROMPT,
				DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_INPUTS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_ONLY_WORK_PROMPT,
			],
		}
	}
	const objective = readDocumentProjectSessionObjective(session.workflowValues)
	if (objective === undefined) {
		return { valid: false }
	}
	return {
		valid: true,
		sections: [
			DOCUMENT_PROJECT_STEP_4_BASE_PROMPT,
			DOCUMENT_PROJECT_STEP_4_SHARED_PATHS_PROMPT,
			objective === "Update existing documents"
				? DOCUMENT_PROJECT_STEP_4_UPDATE_EXISTING_DOCUMENTS_WORK_PROMPT
				: DOCUMENT_PROJECT_STEP_4_ADD_SUPPORTING_DOCUMENTATION_WORK_PROMPT,
		],
	}
}

function buildDocumentProjectStep4PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const selection = selectDocumentProjectStep4PromptSections(input.session)
	return selection.valid
		? { kind: "current_step_instruction_template", currentStepInstructionTemplate: selection.sections.join("\n\n") }
		: { kind: "none" }
}

function buildDocumentProjectStep4DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-4-prompt-branch",
		branches: {
			"step-4-prompt-branch": {
				id: "step-4-prompt-branch",
				routes: [
					{
						id: "step-4-project-prompt",
						trigger: {
							kind: "session_predicate",
							matches: (input) => selectDocumentProjectStep4PromptSections(input.session).valid === true,
						},
						action: { kind: "project_prompt" },
						followingBranchId: "step-4-await-completion-branch",
					},
					{
						id: "step-4-invalid-state",
						trigger: {
							kind: "session_predicate",
							matches: (input) => selectDocumentProjectStep4PromptSections(input.session).valid === false,
						},
						action: { kind: "terminal_error", errorMessage: DOCUMENT_PROJECT_DOCUMENTATION_TASK_TERMINAL_ERROR },
					},
				],
			},
			"step-4-await-completion-branch": {
				id: "step-4-await-completion-branch",
				routes: [
					{
						id: "step-4-complete-workflow",
						trigger: { kind: "on_event", eventKind: "attempt_completion_succeeded" },
						action: { kind: "complete_workflow" },
					},
				],
			},
		},
	}
}

export const documentProjectWorkflowDefinition: WorkflowDefinition = {
	name: DOCUMENT_PROJECT_WORKFLOW_NAME,
	displayName: DOCUMENT_PROJECT_WORKFLOW_DISPLAY_NAME,
	description: DOCUMENT_PROJECT_WORKFLOW_DESCRIPTION,
	slashCommandName: DOCUMENT_PROJECT_WORKFLOW_SLASH_COMMAND_NAME,
	useSkillName: DOCUMENT_PROJECT_WORKFLOW_USE_SKILL_NAME,
	persona: DOCUMENT_PROJECT_WORKFLOW_PERSONA,
	projectSelection: { kind: "automatic_fixed", projectTitle: "Agent Guidance", projectFolderName: "agent-guidance" },
	projectOutputPlacement: { kind: "selected_project_root" },
	workflowValueKeys: DOCUMENT_PROJECT_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: DOCUMENT_PROJECT_ENTRY_PROJECT_VALUE_KEYS,
	entryPanel: { promptMarkdown: DOCUMENT_PROJECT_ENTRY_PROMPT },
	workflowForms: {
		[DOCUMENT_PROJECT_STEP_1_FORM_ID]: buildDocumentProjectStep1WorkflowForm(),
		[DOCUMENT_PROJECT_STEP_3_FORM_ID]: buildDocumentProjectStep3WorkflowForm(),
	},
	artifacts: DOCUMENT_PROJECT_ARTIFACTS,
	prerequisiteFiles: DOCUMENT_PROJECT_PREREQUISITE_FILES,
	steps: {
		"step-1": {
			id: "step-1",
			stepNumber: 1,
			checklistLabel: "Identify Session Objective",
			buildPromptSource: () => ({ kind: "none" }),
			buildToolSchema: buildDocumentProjectStep1ToolSchemas,
			decisionTree: buildDocumentProjectStep1DecisionTree(),
		},
		"step-2": {
			id: "step-2",
			stepNumber: 2,
			checklistLabel: "Document Generation",
			buildPromptSource: () => ({ kind: "none" }),
			buildToolSchema: buildDocumentProjectStep2ToolSchemas,
			decisionTree: buildDocumentProjectStep2DecisionTree(),
		},
		"step-3": {
			id: "step-3",
			stepNumber: 3,
			checklistLabel: "Identify Baseline Data",
			buildPromptSource: () => ({ kind: "none" }),
			buildToolSchema: buildDocumentProjectStep3ToolSchemas,
			decisionTree: buildDocumentProjectStep3DecisionTree(),
		},
		"step-4": {
			id: "step-4",
			stepNumber: 4,
			checklistLabel: "Support System Documentation",
			buildPromptSource: buildDocumentProjectStep4PromptSource,
			buildToolSchema: buildDocumentProjectStep4ToolSchemas,
			promptTemplates: [
				DOCUMENT_PROJECT_STEP_4_BASE_PROMPT,
				DOCUMENT_PROJECT_STEP_4_BOTH_CREATED_STATUS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_SHARED_PATHS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_ONLY_STATUS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_ONLY_STATUS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_INPUT_INTRODUCTION_PROMPT,
				DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_INPUTS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_INPUTS_PROMPT,
				DOCUMENT_PROJECT_STEP_4_BOTH_DOCUMENT_WORK_PROMPT,
				DOCUMENT_PROJECT_STEP_4_DEVELOPER_GUIDE_ONLY_WORK_PROMPT,
				DOCUMENT_PROJECT_STEP_4_PROJECT_OVERVIEW_ONLY_WORK_PROMPT,
				DOCUMENT_PROJECT_STEP_4_UPDATE_EXISTING_DOCUMENTS_WORK_PROMPT,
				DOCUMENT_PROJECT_STEP_4_ADD_SUPPORTING_DOCUMENTATION_WORK_PROMPT,
			],
			decisionTree: buildDocumentProjectStep4DecisionTree(),
		},
	},
}
