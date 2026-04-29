export enum WorkflowArtifactFamily {
	Epic = "epic",
	Story = "story",
	RemediationStory = "remediation_story",
	ReviewBlindHunter = "review_blind_hunter",
	ReviewEdgeCaseHunter = "review_edge_case_hunter",
	AdversarialReview = "adversarial_review",
	ReviewInputMarkdown = "review_input_markdown",
	ReviewInputDiff = "review_input_diff",
}

export type WorkflowArtifactAllocationMode = "new_numbered" | "derived_from_target"
export type WorkflowArtifactIdentityRequirement = "none" | "parent_epic" | "parent_story" | "target_story_or_remediation_story"
export type WorkflowArtifactNumberingScope = "project" | "parent_epic" | "parent_story" | "target_identity"

export interface WorkflowArtifactFamilyDefinition {
	family: WorkflowArtifactFamily
	allocationMode: WorkflowArtifactAllocationMode
	identityRequirement: WorkflowArtifactIdentityRequirement
	filenamePattern: string
	fileExtension: ".md" | ".diff"
	numberingScope: WorkflowArtifactNumberingScope
	discoveryPattern: RegExp
}

export const WORKFLOW_ARTIFACT_FAMILY_REGISTRY: Readonly<Record<WorkflowArtifactFamily, WorkflowArtifactFamilyDefinition>> = {
	[WorkflowArtifactFamily.Epic]: {
		family: WorkflowArtifactFamily.Epic,
		allocationMode: "new_numbered",
		identityRequirement: "none",
		filenamePattern: "Epic-{E}.md",
		fileExtension: ".md",
		numberingScope: "project",
		discoveryPattern: /^Epic-(\d+)\.md$/,
	},
	[WorkflowArtifactFamily.Story]: {
		family: WorkflowArtifactFamily.Story,
		allocationMode: "new_numbered",
		identityRequirement: "parent_epic",
		filenamePattern: "Story-{E}-{S}.md",
		fileExtension: ".md",
		numberingScope: "parent_epic",
		discoveryPattern: /^Story-(\d+)-(\d+)\.md$/,
	},
	[WorkflowArtifactFamily.RemediationStory]: {
		family: WorkflowArtifactFamily.RemediationStory,
		allocationMode: "new_numbered",
		identityRequirement: "parent_story",
		filenamePattern: "Remediation-story-{E}-{S}-{R}.md",
		fileExtension: ".md",
		numberingScope: "parent_story",
		discoveryPattern: /^Remediation-story-(\d+)-(\d+)-(\d+)\.md$/,
	},
	[WorkflowArtifactFamily.ReviewBlindHunter]: {
		family: WorkflowArtifactFamily.ReviewBlindHunter,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "Review-blind-hunter-{target}.md",
		fileExtension: ".md",
		numberingScope: "target_identity",
		discoveryPattern: /^Review-blind-hunter-(\d+-\d+(?:-\d+)?)\.md$/,
	},
	[WorkflowArtifactFamily.ReviewEdgeCaseHunter]: {
		family: WorkflowArtifactFamily.ReviewEdgeCaseHunter,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "Review-edge-case-hunter-{target}.md",
		fileExtension: ".md",
		numberingScope: "target_identity",
		discoveryPattern: /^Review-edge-case-hunter-(\d+-\d+(?:-\d+)?)\.md$/,
	},
	[WorkflowArtifactFamily.AdversarialReview]: {
		family: WorkflowArtifactFamily.AdversarialReview,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "Adversarial-review-{target}.md",
		fileExtension: ".md",
		numberingScope: "target_identity",
		discoveryPattern: /^Adversarial-review-(\d+-\d+(?:-\d+)?)\.md$/,
	},
	[WorkflowArtifactFamily.ReviewInputMarkdown]: {
		family: WorkflowArtifactFamily.ReviewInputMarkdown,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "Review-input-{target}.md",
		fileExtension: ".md",
		numberingScope: "target_identity",
		discoveryPattern: /^Review-input-(\d+-\d+(?:-\d+)?)\.md$/,
	},
	[WorkflowArtifactFamily.ReviewInputDiff]: {
		family: WorkflowArtifactFamily.ReviewInputDiff,
		allocationMode: "derived_from_target",
		identityRequirement: "target_story_or_remediation_story",
		filenamePattern: "Review-input-{target}.diff",
		fileExtension: ".diff",
		numberingScope: "target_identity",
		discoveryPattern: /^Review-input-(\d+-\d+(?:-\d+)?)\.diff$/,
	},
}
