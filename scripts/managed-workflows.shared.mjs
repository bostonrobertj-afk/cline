import path from "path"

export const REGISTRY_PATH = path.join("_bmad", "_config", "managed-workflows.json")

export const PHASE_ROOT_CANDIDATES = ["steps", "steps-c", "steps-e", "steps-v", "domain-steps", "market-steps", "technical-steps"]

export const SUPPORTED_MANAGED_WORKFLOWS = [
	{
		workflowId: "bmad-advanced-elicitation",
		module: "core",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups", "heading-items"],
	},
	{
		workflowId: "bmad-brainstorming",
		module: "core",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-check-implementation-readiness",
		module: "bmm",
		strategyHints: ["numbered-headings", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-cis-design-thinking",
		module: "cis",
		strategyHints: ["workflow-steps", "template-outputs", "ordered-lists"],
	},
	{
		workflowId: "bmad-cis-innovation-strategy",
		module: "cis",
		strategyHints: ["workflow-steps", "template-outputs", "ordered-lists"],
	},
	{
		workflowId: "bmad-cis-problem-solving",
		module: "cis",
		aliases: ["bmad-problem-solving"],
		strategyHints: ["workflow-steps", "template-outputs", "ordered-lists"],
	},
	{
		workflowId: "bmad-cis-storytelling",
		module: "cis",
		strategyHints: ["workflow-steps", "template-outputs", "ordered-lists"],
	},
	{ workflowId: "bmad-code-review", module: "bmm", strategyHints: ["ordered-lists", "numbered-headings", "bullet-groups"] },
	{ workflowId: "bmad-correct-course", module: "bmm", strategyHints: ["ordered-lists", "bullet-groups", "heading-items"] },
	{
		workflowId: "bmad-create-architecture",
		module: "bmm",
		strategyHints: ["numbered-headings", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-create-epics-and-stories",
		module: "bmm",
		strategyHints: ["numbered-headings", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-create-prd",
		module: "bmm",
		strategyHints: ["workflow-steps", "numbered-headings", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-create-product-brief",
		module: "bmm",
		strategyHints: ["numbered-headings", "ordered-lists", "bullet-groups"],
	},
	{ workflowId: "bmad-create-story", module: "bmm", strategyHints: ["workflow-steps", "template-outputs", "ordered-lists"] },
	{
		workflowId: "bmad-create-ux-design",
		module: "bmm",
		extractionMode: "guided",
		strategyHints: ["workflow-steps", "numbered-headings", "ordered-lists", "bullet-groups"],
	},
	{ workflowId: "bmad-dev-story", module: "bmm", strategyHints: ["workflow-steps", "template-outputs", "ordered-lists"] },
	{ workflowId: "bmad-distillator", module: "core", strategyHints: ["ordered-lists", "bullet-groups", "heading-items"] },
	{
		workflowId: "bmad-domain-research",
		module: "bmm",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-document-project",
		module: "bmm",
		workflowPathOverride: "instructions.md",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{ workflowId: "bmad-edit-prd", module: "bmm", strategyHints: ["numbered-headings", "ordered-lists", "bullet-groups"] },
	{
		workflowId: "bmad-editorial-review-prose",
		module: "core",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-editorial-review-structure",
		module: "core",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-generate-project-context",
		module: "bmm",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{ workflowId: "bmad-help", module: "core", strategyHints: ["ordered-lists", "bullet-groups", "heading-items"] },
	{
		workflowId: "bmad-index-docs",
		module: "core",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-market-research",
		module: "bmm",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-party-mode",
		module: "core",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-qa-generate-e2e-tests",
		module: "bmm",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{ workflowId: "bmad-quick-dev", module: "bmm", strategyHints: ["numbered-headings", "workflow-steps", "ordered-lists"] },
	{
		workflowId: "bmad-quick-dev-new-preview",
		module: "bmm",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-quick-spec",
		module: "bmm",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-retrospective",
		module: "bmm",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-review-adversarial-general",
		module: "core",
		strategyHints: ["numbered-headings", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-review-edge-case-hunter",
		module: "core",
		strategyHints: ["numbered-headings", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-shard-doc",
		module: "core",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{ workflowId: "bmad-sprint-planning", module: "bmm", strategyHints: ["ordered-lists", "numbered-headings", "bullet-groups"] },
	{
		workflowId: "bmad-sprint-status",
		module: "bmm",
		extractionMode: "branch-aware",
		primaryStepRange: { min: 0, max: 5 },
		strategyHints: ["workflow-steps", "template-outputs", "ordered-lists"],
	},
	{
		workflowId: "bmad-teach-me-testing",
		module: "tea",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-technical-research",
		module: "bmm",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
	{
		workflowId: "bmad-validate-prd",
		module: "bmm",
		strategyHints: ["workflow-steps", "ordered-lists", "bullet-groups"],
	},
]
