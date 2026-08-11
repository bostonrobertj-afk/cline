import { expect } from "chai"
import { describe, it } from "mocha"
import {
	buildInitialDeveloperGuideDocument,
	buildInitialProjectOverviewDocument,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_BEFORE_CONTRIBUTING,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_CODE_QUALITY,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_CODING_STYLE,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_COMMIT_GUIDELINES,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_END_TO_END_TESTING,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_KNOWN_ISSUES_AND_TECHNICAL_DEBT,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_LOCAL_DEVELOPMENT_INSTRUCTIONS,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_MOST_RECENT_PROJECT_NOTES,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_PLANNED_ENHANCEMENTS,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADINGS,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_ARCHITECTURE_HIGHLIGHTS,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_CLASSIFICATION,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_DEPENDENCY_GRAPH_AND_DATA_FLOW,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_DOCUMENTATION_MAP,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_EXECUTIVE_SUMMARY,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_INTEGRATION_POINTS_AND_API_CONTRACTS,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_KEY_FEATURES,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_REPOSITORY_STRUCTURE,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_STRUCTURE,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_TECHNOLOGY_STACK_SUMMARY,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADINGS,
} from "../documentProjectDocument"

const FORBIDDEN_DOCUMENT_SOURCE_TEXT = [
	"*** begin project-overview initial content example ***",
	"*** end project-overview initial content example ***",
	"*** begin project-index initial content example ***",
	"*** end developer-guide initial content example ***",
	"docs/workflows/workflow-runtime/workflow-modules/document-project/document-project.md",
	".cline/skills/bmad-document-project",
	".cline/workflow-config.yaml",
	"_bmad/_config/workflow-reminders.json",
	"src/core/task/bmad-agent-mode.ts",
] as const

const PROJECT_OVERVIEW_HEADINGS = [
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_EXECUTIVE_SUMMARY,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_CLASSIFICATION,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_STRUCTURE,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_TECHNOLOGY_STACK_SUMMARY,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_KEY_FEATURES,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_ARCHITECTURE_HIGHLIGHTS,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_REPOSITORY_STRUCTURE,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_DEPENDENCY_GRAPH_AND_DATA_FLOW,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_INTEGRATION_POINTS_AND_API_CONTRACTS,
	DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_DOCUMENTATION_MAP,
]

const DEVELOPER_GUIDE_HEADINGS = [
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_CODING_STYLE,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_BEFORE_CONTRIBUTING,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_LOCAL_DEVELOPMENT_INSTRUCTIONS,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_CODE_QUALITY,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_END_TO_END_TESTING,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_COMMIT_GUIDELINES,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_MOST_RECENT_PROJECT_NOTES,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_PLANNED_ENHANCEMENTS,
	DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_KNOWN_ISSUES_AND_TECHNICAL_DEBT,
]

const EXPECTED_PROJECT_OVERVIEW = `# Executive Summary

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
`

const EXPECTED_DEVELOPER_GUIDE = `# Coding Style

# Before Contributing
All updates should start with a clean working tree. Always check for a clean tree before beginning work, and ask the user to commit anything already in the working tree before you begin if the tree is not clean.

# Local Development Instructions
- You must always follow workflow instructions exactly
- You must always stop and ask for guidance when faced with anything ambiguous or for which a decision is required that has not been explicitly deferred to you by the user or workflow instructions
- You must avoid broad file scan behavior. Limit system access to the files necessary to perform the task assigned to you.
- You must only use attempt_completion once, as your final completion report at the end of a workflow.

# Code Quality
- Keep changes narrowly scoped to the requested behavior and follow the existing architecture, naming conventions, helper APIs, and file organization already present in the codebase.
- Prefer type-safe, explicit implementations. Avoid \`any\`, unchecked casts, ad hoc string parsing, duplicated constants, and broad fallback behavior unless the project already uses that pattern or the requirements explicitly call for it.
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
`

function extractTopLevelHeadings(document: string): string[] {
	return document
		.split("\n")
		.filter((line) => line.startsWith("# "))
		.map((line) => line.slice(2))
}

describe("Document Project initial documents", () => {
	it("exports the exact ordered heading inventories", () => {
		expect(DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADINGS).to.deep.equal(PROJECT_OVERVIEW_HEADINGS)
		expect(DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADINGS).to.deep.equal([
			"Executive Summary",
			"Classification",
			"Structure",
			"Technology Stack Summary",
			"Key Features",
			"Architecture Highlights",
			"Repository Structure",
			"Dependency Graph & Data Flow",
			"Integration Points & API Contracts",
			"Documentation Map",
		])
		expect(DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADINGS).to.deep.equal(DEVELOPER_GUIDE_HEADINGS)
		expect(DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADINGS).to.deep.equal([
			"Coding Style",
			"Before Contributing",
			"Local Development Instructions",
			"Code Quality",
			"End to End Testing",
			"Commit Guidelines",
			"Most Recent Project Notes",
			"Planned Enhancements",
			"Known Issues & Technical Debt",
		])
	})

	it("builds the exact Project Overview scaffold", () => {
		const document = buildInitialProjectOverviewDocument()

		expect(extractTopLevelHeadings(document)).to.deep.equal(DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADINGS)
		expect(document).to.equal(EXPECTED_PROJECT_OVERVIEW)
		for (const forbiddenText of FORBIDDEN_DOCUMENT_SOURCE_TEXT) {
			expect(document).not.to.include(forbiddenText)
		}
	})

	it("builds the exact Developer Guide scaffold", () => {
		const document = buildInitialDeveloperGuideDocument()

		expect(extractTopLevelHeadings(document)).to.deep.equal(DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADINGS)
		expect(document).to.equal(EXPECTED_DEVELOPER_GUIDE)
		for (const forbiddenText of FORBIDDEN_DOCUMENT_SOURCE_TEXT) {
			expect(document).not.to.include(forbiddenText)
		}
	})
})
