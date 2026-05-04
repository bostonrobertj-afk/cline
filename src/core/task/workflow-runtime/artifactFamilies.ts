export enum WorkflowArtifactFamily {
	Epics = "epics",
	EpicsIndex = "epics_index",
	BrainstormingSession = "brainstorming_session",
	EpicDeliverySpec = "epic_delivery_spec",
	Story = "story",
	RemediationStory = "remediation_story",
	ReviewBlindHunter = "review_blind_hunter",
	ReviewEdgeCaseHunter = "review_edge_case_hunter",
	AdversarialReview = "adversarial_review",
	ReviewInputMarkdown = "review_input_markdown",
	ReviewInputDiff = "review_input_diff",
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
	| "epic_index"
	| "parent_epic"
	| "parent_story"
	| "target_identity"
export type WorkflowArtifactFileExtension = ".md" | ".json" | ".diff"
export type WorkflowArtifactContentKind = "markdown" | "structured_json_index" | "diff"

interface WorkflowArtifactFamilyDefinitionBase {
	family: WorkflowArtifactFamily
	filenamePattern: string
	fileExtension: WorkflowArtifactFileExtension
	contentKind: WorkflowArtifactContentKind
	discoveryPattern: RegExp
}

export interface WorkflowSingletonProjectArtifactFamilyDefinition extends WorkflowArtifactFamilyDefinitionBase {
	family: WorkflowArtifactFamily.Epics | WorkflowArtifactFamily.EpicsIndex | WorkflowArtifactFamily.BrainstormingSession
	allocationMode: "singleton_project"
	identityRequirement: "none"
	numberingScope: "project_singleton"
	singletonIdentity: "epics" | "epics_index" | "brainstorming_session"
}

export interface WorkflowEpicIndexDerivedArtifactFamilyDefinition extends WorkflowArtifactFamilyDefinitionBase {
	family: WorkflowArtifactFamily.EpicDeliverySpec
	allocationMode: "derived_from_epic_index"
	identityRequirement: "epic_index"
	numberingScope: "epic_index"
}

export interface WorkflowNewNumberedArtifactFamilyDefinition extends WorkflowArtifactFamilyDefinitionBase {
	family: WorkflowArtifactFamily.Story | WorkflowArtifactFamily.RemediationStory
	allocationMode: "new_numbered"
	identityRequirement: "parent_epic_delivery_spec" | "parent_story"
	numberingScope: "parent_epic" | "parent_story"
}

export interface WorkflowTargetDerivedArtifactFamilyDefinition extends WorkflowArtifactFamilyDefinitionBase {
	family:
		| WorkflowArtifactFamily.ReviewBlindHunter
		| WorkflowArtifactFamily.ReviewEdgeCaseHunter
		| WorkflowArtifactFamily.AdversarialReview
		| WorkflowArtifactFamily.ReviewInputMarkdown
		| WorkflowArtifactFamily.ReviewInputDiff
	allocationMode: "derived_from_target"
	identityRequirement: "target_story_or_remediation_story"
	numberingScope: "target_identity"
}

export type WorkflowArtifactFamilyDefinition =
	| WorkflowSingletonProjectArtifactFamilyDefinition
	| WorkflowEpicIndexDerivedArtifactFamilyDefinition
	| WorkflowNewNumberedArtifactFamilyDefinition
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
	[WorkflowArtifactFamily.ReviewBlindHunter]: {
		family: WorkflowArtifactFamily.ReviewBlindHunter,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "Review-blind-hunter-{target}.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "target_identity",
		discoveryPattern: /^Review-blind-hunter-(\d+-\d+(?:-\d+)?)\.md$/,
	},
	[WorkflowArtifactFamily.ReviewEdgeCaseHunter]: {
		family: WorkflowArtifactFamily.ReviewEdgeCaseHunter,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "Review-edge-case-hunter-{target}.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "target_identity",
		discoveryPattern: /^Review-edge-case-hunter-(\d+-\d+(?:-\d+)?)\.md$/,
	},
	[WorkflowArtifactFamily.AdversarialReview]: {
		family: WorkflowArtifactFamily.AdversarialReview,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "Adversarial-review-{target}.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "target_identity",
		discoveryPattern: /^Adversarial-review-(\d+-\d+(?:-\d+)?)\.md$/,
	},
	[WorkflowArtifactFamily.ReviewInputMarkdown]: {
		family: WorkflowArtifactFamily.ReviewInputMarkdown,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "Review-input-{target}.md",
		fileExtension: ".md",
		contentKind: "markdown",
		numberingScope: "target_identity",
		discoveryPattern: /^Review-input-(\d+-\d+(?:-\d+)?)\.md$/,
	},
	[WorkflowArtifactFamily.ReviewInputDiff]: {
		family: WorkflowArtifactFamily.ReviewInputDiff,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "Review-input-{target}.diff",
		fileExtension: ".diff",
		contentKind: "diff",
		numberingScope: "target_identity",
		discoveryPattern: /^Review-input-(\d+-\d+(?:-\d+)?)\.diff$/,
	},
}
