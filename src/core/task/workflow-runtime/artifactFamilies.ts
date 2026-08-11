export enum WorkflowArtifactFamily {
	Epics = "epics",
	EpicsIndex = "epics_index",
	BrainstormingSession = "brainstorming_session",
	ArchitectureDocument = "architecture_document",
	QuickSpec = "quick_spec",
	ChangeManagementPlan = "change_management_plan",
	EpicDeliverySpec = "epic_delivery_spec",
	EpicStoriesIndex = "epic_stories_index",
	Story = "story",
	RemediationStory = "remediation_story",
	BlindReviewOutput = "blind_review_output",
	AcceptanceAuditOutput = "acceptance_audit_output",
	EdgeCaseReviewOutput = "edge_case_review_output",
	CodeReviewOutput = "code_review_output",
	ReviewScopeManifest = "review_scope_manifest",
	ProjectOverview = "project_overview",
	DeveloperGuide = "developer_guide",
}

export type WorkflowArtifactAllocationMode =
	| "singleton_project"
	| "derived_from_epic_index"
	| "new_numbered"
	| "derived_from_target"
export type WorkflowArtifactIdentityRequirement =
	| "none"
	| "epic_index"
	| "parent_epic_delivery_spec"
	| "parent_story"
	| "target_story_or_remediation_story"
export type WorkflowArtifactNumberingScope =
	| "project_singleton"
	| "project_numbered"
	| "epic_index"
	| "parent_epic"
	| "parent_story"
	| "target_identity"
export type WorkflowArtifactFileExtension = ".md" | ".json"
export type WorkflowArtifactContentKind = "markdown" | "structured_json_index"

interface WorkflowArtifactFamilyDefinitionBase {
	family: WorkflowArtifactFamily
	filenamePattern: string
	fileExtension: WorkflowArtifactFileExtension
	contentKind: WorkflowArtifactContentKind
	discoveryPattern: RegExp
}

export interface WorkflowSingletonProjectArtifactFamilyDefinition extends WorkflowArtifactFamilyDefinitionBase {
	family:
		| WorkflowArtifactFamily.Epics
		| WorkflowArtifactFamily.EpicsIndex
		| WorkflowArtifactFamily.BrainstormingSession
		| WorkflowArtifactFamily.ArchitectureDocument
		| WorkflowArtifactFamily.QuickSpec
		| WorkflowArtifactFamily.ProjectOverview
		| WorkflowArtifactFamily.DeveloperGuide
	allocationMode: "singleton_project"
	identityRequirement: "none"
	numberingScope: "project_singleton"
	singletonIdentity:
		| "epics"
		| "epics_index"
		| "brainstorming_session"
		| "architecture_document"
		| "quick_spec"
		| "project_overview"
		| "developer_guide"
}

export interface WorkflowEpicIndexDerivedArtifactFamilyDefinition extends WorkflowArtifactFamilyDefinitionBase {
	family: WorkflowArtifactFamily.EpicDeliverySpec | WorkflowArtifactFamily.EpicStoriesIndex
	allocationMode: "derived_from_epic_index"
	identityRequirement: "epic_index"
	numberingScope: "epic_index"
}

export interface WorkflowParentScopedNewNumberedArtifactFamilyDefinition extends WorkflowArtifactFamilyDefinitionBase {
	family: WorkflowArtifactFamily.Story | WorkflowArtifactFamily.RemediationStory
	allocationMode: "new_numbered"
	identityRequirement: "parent_epic_delivery_spec" | "parent_story"
	numberingScope: "parent_epic" | "parent_story"
}

export interface WorkflowProjectScopedNewNumberedArtifactFamilyDefinition extends WorkflowArtifactFamilyDefinitionBase {
	family: WorkflowArtifactFamily.ChangeManagementPlan
	allocationMode: "new_numbered"
	identityRequirement: "none"
	numberingScope: "project_numbered"
}

export interface WorkflowTargetDerivedArtifactFamilyDefinition extends WorkflowArtifactFamilyDefinitionBase {
	family:
		| WorkflowArtifactFamily.BlindReviewOutput
		| WorkflowArtifactFamily.AcceptanceAuditOutput
		| WorkflowArtifactFamily.EdgeCaseReviewOutput
		| WorkflowArtifactFamily.CodeReviewOutput
		| WorkflowArtifactFamily.ReviewScopeManifest
	allocationMode: "derived_from_target"
	identityRequirement: "target_story_or_remediation_story"
	numberingScope: "target_identity"
}

export type WorkflowArtifactFamilyDefinition =
	| WorkflowSingletonProjectArtifactFamilyDefinition
	| WorkflowEpicIndexDerivedArtifactFamilyDefinition
	| WorkflowParentScopedNewNumberedArtifactFamilyDefinition
	| WorkflowProjectScopedNewNumberedArtifactFamilyDefinition
	| WorkflowTargetDerivedArtifactFamilyDefinition

export const WORKFLOW_ARTIFACT_FAMILY_REGISTRY: Readonly<Record<WorkflowArtifactFamily, WorkflowArtifactFamilyDefinition>> = {
	[WorkflowArtifactFamily.Epics]: {
		family: WorkflowArtifactFamily.Epics,
		allocationMode: "singleton_project",
		identityRequirement: "none",
		filenamePattern: "Epics.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "project_singleton",
		singletonIdentity: "epics",
		discoveryPattern: /^Epics\.md$/,
	},
	[WorkflowArtifactFamily.EpicsIndex]: {
		family: WorkflowArtifactFamily.EpicsIndex,
		allocationMode: "singleton_project",
		identityRequirement: "none",
		filenamePattern: "Epics.index.json",
		fileExtension: ".json",
		contentKind: "structured_json_index",
		numberingScope: "project_singleton",
		singletonIdentity: "epics_index",
		discoveryPattern: /^Epics\.index\.json$/,
	},
	[WorkflowArtifactFamily.BrainstormingSession]: {
		family: WorkflowArtifactFamily.BrainstormingSession,
		allocationMode: "singleton_project",
		identityRequirement: "none",
		filenamePattern: "brainstorming.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "project_singleton",
		singletonIdentity: "brainstorming_session",
		discoveryPattern: /^brainstorming\.md$/,
	},
	[WorkflowArtifactFamily.ArchitectureDocument]: {
		family: WorkflowArtifactFamily.ArchitectureDocument,
		allocationMode: "singleton_project",
		identityRequirement: "none",
		filenamePattern: "architecture.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "project_singleton",
		singletonIdentity: "architecture_document",
		discoveryPattern: /^architecture\.md$/,
	},
	[WorkflowArtifactFamily.QuickSpec]: {
		family: WorkflowArtifactFamily.QuickSpec,
		allocationMode: "singleton_project",
		identityRequirement: "none",
		filenamePattern: "quick-spec.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "project_singleton",
		singletonIdentity: "quick_spec",
		discoveryPattern: /^quick-spec\.md$/,
	},
	[WorkflowArtifactFamily.ProjectOverview]: {
		family: WorkflowArtifactFamily.ProjectOverview,
		allocationMode: "singleton_project",
		identityRequirement: "none",
		filenamePattern: "project-overview.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "project_singleton",
		singletonIdentity: "project_overview",
		discoveryPattern: /^project-overview\.md$/,
	},
	[WorkflowArtifactFamily.DeveloperGuide]: {
		family: WorkflowArtifactFamily.DeveloperGuide,
		allocationMode: "singleton_project",
		identityRequirement: "none",
		filenamePattern: "developer-guide.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "project_singleton",
		singletonIdentity: "developer_guide",
		discoveryPattern: /^developer-guide\.md$/,
	},
	[WorkflowArtifactFamily.ChangeManagementPlan]: {
		family: WorkflowArtifactFamily.ChangeManagementPlan,
		allocationMode: "new_numbered",
		identityRequirement: "none",
		filenamePattern: "change-management-plan-{C}.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "project_numbered",
		discoveryPattern: /^change-management-plan-(\d+)\.md$/,
	},
	[WorkflowArtifactFamily.EpicDeliverySpec]: {
		family: WorkflowArtifactFamily.EpicDeliverySpec,
		allocationMode: "derived_from_epic_index",
		identityRequirement: "epic_index",
		filenamePattern: "Epic-{E}-delivery-spec.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "epic_index",
		discoveryPattern: /^Epic-(\d+)-delivery-spec\.md$/,
	},
	[WorkflowArtifactFamily.EpicStoriesIndex]: {
		family: WorkflowArtifactFamily.EpicStoriesIndex,
		allocationMode: "derived_from_epic_index",
		identityRequirement: "epic_index",
		filenamePattern: "epic-{E}-stories.index.json",
		fileExtension: ".json",
		contentKind: "structured_json_index",
		numberingScope: "epic_index",
		discoveryPattern: /^epic-(\d+)-stories\.index\.json$/,
	},
	[WorkflowArtifactFamily.Story]: {
		family: WorkflowArtifactFamily.Story,
		allocationMode: "new_numbered",
		identityRequirement: "parent_epic_delivery_spec",
		filenamePattern: "Story-{E}-{S}.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "parent_epic",
		discoveryPattern: /^Story-(\d+)-(\d+)\.md$/,
	},
	[WorkflowArtifactFamily.RemediationStory]: {
		family: WorkflowArtifactFamily.RemediationStory,
		allocationMode: "new_numbered",
		identityRequirement: "parent_story",
		filenamePattern: "Remediation-story-{E}-{S}-{R}.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "parent_story",
		discoveryPattern: /^Remediation-story-(\d+)-(\d+)-(\d+)\.md$/,
	},
	[WorkflowArtifactFamily.BlindReviewOutput]: {
		family: WorkflowArtifactFamily.BlindReviewOutput,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "blind-review-{target}.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "target_identity",
		discoveryPattern: /^blind-review-(\d+-\d+(?:-\d+)?)\.md$/,
	},
	[WorkflowArtifactFamily.AcceptanceAuditOutput]: {
		family: WorkflowArtifactFamily.AcceptanceAuditOutput,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "acceptance-audit-{target}.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "target_identity",
		discoveryPattern: /^acceptance-audit-(\d+-\d+(?:-\d+)?)\.md$/,
	},
	[WorkflowArtifactFamily.EdgeCaseReviewOutput]: {
		family: WorkflowArtifactFamily.EdgeCaseReviewOutput,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "edge-case-hunter-{target}.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "target_identity",
		discoveryPattern: /^edge-case-hunter-(\d+-\d+(?:-\d+)?)\.md$/,
	},
	[WorkflowArtifactFamily.CodeReviewOutput]: {
		family: WorkflowArtifactFamily.CodeReviewOutput,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "code-review-{target}.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "target_identity",
		discoveryPattern: /^code-review-(\d+-\d+(?:-\d+)?)\.md$/,
	},
	[WorkflowArtifactFamily.ReviewScopeManifest]: {
		family: WorkflowArtifactFamily.ReviewScopeManifest,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "review-scope-{target}.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "target_identity",
		discoveryPattern: /^review-scope-(\d+-\d+(?:-\d+)?)\.md$/,
	},
}
