import type { WorkflowStartCardRegistryEntry } from "@/core/task/workflow-start-card/types"

const workflowStartCardRegistry: Record<string, WorkflowStartCardRegistryEntry> = {
	"advanced-elicitation.md": {
		workflowName: "advanced-elicitation.md",
		markdownBody:
			"In this workflow, you'll push an agent to revisit an existing output in a structured second pass. You'll select a reasoning method, and the agent will apply that method while performing a critical analysis of the selected output. This often produces a strong, more consistent output.",
	},
	"blind-review.md": {
		workflowName: "blind-review.md",
		markdownBody:
			"In this workflow, an agent performs a blind review of a completed body of work. They'll be provided with a diff file that shows the code that was changed and no other context. Their goal will be to identify any defects, inefficiencies, or inconsistencies in the code and produce a detailed findings artifact.",
	},
	"brainstorming.md": {
		workflowName: "brainstorming.md",
		markdownBody:
			"In this workflow, you'll work with an agent to perform high-level brainstorming using one or more structured methods focused on an idea or topic that you provide.",
	},
	"check-implementation-readiness.md": {
		workflowName: "check-implementation-readiness.md",
		markdownBody:
			"In this workflow you will validate that all planning artifacts are complete, consistent, and ready for implementation. You'll perform a comprehensive readiness review before development begins so gaps and risks are surfaced early.",
	},
	"cis-design-thinking.md": {
		workflowName: "cis-design-thinking.md",
		markdownBody:
			"In this workflow you will run a human-centered design session from challenge framing through empathy, ideation, prototyping, testing, and iteration planning. You'll work toward a clearer problem definition, stronger concepts, and a practical next-step plan grounded in user needs.",
	},
	"cis-innovation-strategy.md": {
		workflowName: "cis-innovation-strategy.md",
		markdownBody:
			"In this workflow you will analyze a business, market, and business model to identify meaningful innovation and disruption opportunities. You'll compare strategic options, recommend a direction, and shape an execution roadmap with risks, metrics, and decision gates.",
	},
	"cis-problem-solving.md": {
		workflowName: "cis-problem-solving.md",
		markdownBody:
			"In this workflow you will diagnose a complex problem, identify its root causes, and evaluate possible solution paths. You'll converge on a validated solution with an implementation plan, success measures, and adjustment triggers.",
	},
	"cis-storytelling.md": {
		workflowName: "cis-storytelling.md",
		markdownBody:
			"In this workflow you will craft a compelling narrative through structured story development, emotional arc design, and format adaptation. You'll shape the message, build the story with the audience in mind, and produce versions suited to the channels where it will be used.",
	},
	"code-review.md": {
		workflowName: "code-review.md",
		markdownBody:
			"In this workflow you will review an implemented story for code quality, test quality, architecture compliance, and overall implementation soundness. You'll identify issues, validate the work against expectations, and produce actionable follow-up items when improvements are needed.",
	},
	"correct-course.md": {
		workflowName: "correct-course.md",
		markdownBody:
			"In this workflow you will assess a significant change or newly discovered issue during delivery and analyze its impact across the core project artifacts. You'll produce a sprint change proposal with concrete updates, rationale, and the right handoff path.",
	},
	"create-architecture.md": {
		workflowName: "create-architecture.md",
		markdownBody:
			"In this workflow you will create comprehensive architecture solution design decisions to ensure AI agents implement consistently. You'll produce architecture decision records that reduce ambiguity and prevent implementation conflicts.",
	},
	"create-epics.md": {
		workflowName: "create-epics.md",
		markdownBody:
			"In this workflow you will transform PRD requirements and architecture decisions into comprehensive epics with a clear roadmap.",
	},
	"create-prd.md": {
		workflowName: "create-prd.md",
		markdownBody:
			"In this workflow you will create comprehensive Product Requirements Documents through structured workflow facilitation. You'll move from initial concept to complete, hardened requirements that support architecture and downstream planning.",
	},
	"create-product-brief.md": {
		workflowName: "create-product-brief.md",
		markdownBody:
			"In this workflow you will create comprehensive product briefs through collaborative step-by-step discovery. You'll define the product vision with the help of the business analyst agent and shape the brief into a strong foundation for later planning work.",
	},
	"create-story.md": {
		workflowName: "create-story.md",
		markdownBody:
			"In this workflow you will turn a planned backlog story into a detailed implementation-ready story file. You'll load the story context, define executable tasks and subtasks, capture technical guidance, and prepare the work for development. Run this workflow once for each story in your epic delivery spec.",
	},
	"create-ux-design.md": {
		workflowName: "create-ux-design.md",
		markdownBody:
			"In this workflow you will create comprehensive UX design specifications through collaborative visual exploration and informed decision-making. You'll work through design principles, user experience direction, and interface requirements with the AI acting as a UX facilitator.",
	},
	"dev-story.md": {
		workflowName: "dev-story.md",
		markdownBody:
			"In this workflow you will implement a story by executing its tasks sequentially using a red-green-refactor approach. You'll write failing tests first, complete the implementation only when tests pass, and update the story record as the work progresses.",
	},
	"distillator.md": {
		workflowName: "distillator.md",
		markdownBody:
			"In this workflow you will compress one or more source documents into a lossless, token-efficient distillate for downstream use. You'll preserve the important facts, decisions, constraints, and risks while making the content easier for later workflows or agents to consume.",
	},
	"document-project.md": {
		workflowName: "document-project.md",
		markdownBody:
			"In this workflow you will document a brownfield project so AI agents can work in it with stronger context and fewer mistakes. You'll route through the appropriate documentation path and produce project knowledge tailored for safe implementation.",
	},
	"domain-research.md": {
		workflowName: "domain-research.md",
		markdownBody:
			"In this workflow you will conduct comprehensive domain and industry research using current, source-verified web data. You'll produce a complete research document with clear synthesis, compelling narrative, and proper citations to support later planning work.",
	},
	"edit-prd.md": {
		workflowName: "edit-prd.md",
		markdownBody:
			"In this workflow you will update and refine existing PRDs with new requirements, changes, and clarifications. You'll make targeted improvements while maintaining document consistency and keeping the requirements coherent.",
	},
	"editorial-review-prose.md": {
		workflowName: "editorial-review-prose.md",
		markdownBody:
			"In this workflow you will review prose for wording issues that make the content harder to understand. You'll return focused communication fixes that improve clarity while preserving the author's meaning, tone, and intent.",
	},
	"editorial-review-structure.md": {
		workflowName: "editorial-review-structure.md",
		markdownBody:
			"In this workflow you will review a document's structure and identify substantive cuts, merges, moves, and simplifications that improve flow. You'll return prioritized recommendations that make the document easier to follow without losing meaning.",
	},
	"generate-project-context.md": {
		workflowName: "generate-project-context.md",
		markdownBody:
			"In this workflow you will create or update a `project-context.md` file with the stack details, implementation rules, testing expectations, and project-specific gotchas AI agents need. You'll turn repository discovery into a lean reference that keeps future implementation work on target.",
	},
	"help.md": {
		workflowName: "help.md",
		markdownBody:
			"In this workflow you will get guidance on the most relevant BMAD workflow or agent to use next based on your current context and project artifacts. You'll receive practical recommendations grounded in what has already been completed and what should happen next.",
	},
	"index-docs.md": {
		workflowName: "index-docs.md",
		markdownBody:
			"In this workflow you will generate or update an `index.md` file for a documentation folder. You'll inspect the contents, write concise descriptions, and create an organized index that makes the docs easier to navigate.",
	},
	"market-research.md": {
		workflowName: "market-research.md",
		markdownBody:
			"In this workflow you will conduct comprehensive market research on customers, competitors, and market dynamics using current web data. You'll build a research report that clarifies customer needs, competitive positioning, and strategic opportunities.",
	},
	"party-mode.md": {
		workflowName: "party-mode.md",
		markdownBody:
			"In this workflow you will orchestrate a multi-agent discussion by bringing in the most relevant personas for the topic at hand. You'll get a concise, in-character conversation with complementary viewpoints and a clean exit when the discussion is done.",
	},
	"pi-planning.md": {
		workflowName: "pi-planning.md",
		markdownBody:
			"In this workflow you will break a selected epic into a set of deliverable user stories aligned to the epic's scope, architecture constraints, and sequencing needs. You'll refine the stories until they are approved, each with a clear objective, acceptance criteria, and dependencies.",
	},
	"qa-generate-e2e-tests.md": {
		workflowName: "qa-generate-e2e-tests.md",
		markdownBody:
			"In this workflow you will generate automated API and end-to-end tests for an implemented feature using the project's current testing patterns. You'll run the new tests, fix issues caused by those tests when needed, and produce a short verification summary.",
	},
	"quick-dev.md": {
		workflowName: "quick-dev.md",
		markdownBody:
			"In this workflow you will take a small change or lightweight tech spec through implementation, validation, and review as efficiently as possible. You'll gather just enough context, make the change, run the relevant tests, and handle adversarial review findings before finishing.",
	},
	"quick-dev-new-preview.md": {
		workflowName: "quick-dev-new-preview.md",
		markdownBody:
			"In this workflow you will take a user request from clarified intent through planning, implementation, adversarial review, and final presentation in one streamlined flow. You'll freeze an approved spec, execute the work, review the change set, and present the completed result.",
	},
	"quick-spec.md": {
		workflowName: "quick-spec.md",
		markdownBody:
			"In this workflow you will build a small implementation-ready tech spec through guided discovery, scoped planning, and a final review pass. You'll define the objective, solution, scope, context, acceptance criteria, seams, and executable tasks needed for quick implementation.",
	},
	"retrospective.md": {
		workflowName: "retrospective.md",
		markdownBody:
			"In this workflow you will run an epic retrospective with multiple agent perspectives to reflect on what happened during implementation. You'll capture what went well, what should improve, and what adjustments should carry forward into the next body of work.",
	},
	"review-adversarial-general.md": {
		workflowName: "review-adversarial-general.md",
		markdownBody:
			"In this workflow you will perform a skeptical, evidence-based review of the supplied review materials to identify concrete production-relevant risks. You'll stay grounded in the actual changed code and write focused findings that can be acted on directly.",
	},
	"review-edge-case-hunter.md": {
		workflowName: "review-edge-case-hunter.md",
		markdownBody:
			"In this workflow you will perform an exhaustive path-based review focused only on missing handling for reachable branches and boundary conditions. You'll ignore handled paths, avoid editorializing, and return only the unhandled cases that remain.",
	},
	"shard-doc.md": {
		workflowName: "shard-doc.md",
		markdownBody:
			"In this workflow you will split a large markdown document into organized shard files and verify that the output is complete. You'll create the shard set, confirm the index file exists, and then decide whether to keep, move, or delete the original source.",
	},
	"sprint-planning.md": {
		workflowName: "sprint-planning.md",
		markdownBody:
			"In this workflow you will initialize implementation tracking for the project by loading all epics and stories into a sprint status file. You'll establish the starting backlog state for each work item so implementation can proceed in a structured way.",
	},
	"sprint-status.md": {
		workflowName: "sprint-status.md",
		markdownBody:
			"In this workflow you will summarize current sprint progress, surface risks, and identify the next recommended workflow action from `sprint-status.yaml`. You'll validate the file, analyze status distribution, and point to the most relevant next step.",
	},
	"teach-me-testing.md": {
		workflowName: "teach-me-testing.md",
		markdownBody:
			"In this workflow you will move through a progressive testing curriculum with persistent progress tracking and role-aware teaching. You'll complete guided sessions, validate understanding with quizzes, and build toward full curriculum completion over time.",
	},
	"technical-research.md": {
		workflowName: "technical-research.md",
		markdownBody:
			"In this workflow you will conduct comprehensive technical research on technologies, tools, and architectural patterns. You'll build a research report that supports technology decisions and architecture planning with clear recommendations.",
	},
	"validate-prd.md": {
		workflowName: "validate-prd.md",
		markdownBody:
			"In this workflow you will review and validate PRD completeness, clarity, and implementation readiness before moving into solutioning. You'll identify gaps, inconsistencies, and weak requirements so the document is stronger before downstream work begins.",
	},
	"write-remediation-story.md": {
		workflowName: "write-remediation-story.md",
		markdownBody:
			"In this workflow you will turn validated review findings into a remediation story with exact acceptance criteria, file boundaries, and implementation tasks. You'll trace each real defect through its full runtime seam and produce a ready-for-dev story that closes the issue completely.",
	},
}

export function getWorkflowStartCardRegistryEntry(workflowName: string): WorkflowStartCardRegistryEntry | undefined {
	return workflowStartCardRegistry[workflowName]
}
