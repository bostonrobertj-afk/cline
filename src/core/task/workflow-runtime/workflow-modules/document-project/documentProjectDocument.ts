export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_EXECUTIVE_SUMMARY = "Executive Summary"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_CLASSIFICATION = "Classification"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_STRUCTURE = "Structure"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_TECHNOLOGY_STACK_SUMMARY = "Technology Stack Summary"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_KEY_FEATURES = "Key Features"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_ARCHITECTURE_HIGHLIGHTS = "Architecture Highlights"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_REPOSITORY_STRUCTURE = "Repository Structure"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_DEPENDENCY_GRAPH_AND_DATA_FLOW = "Dependency Graph & Data Flow"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_INTEGRATION_POINTS_AND_API_CONTRACTS = "Integration Points & API Contracts"
export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_DOCUMENTATION_MAP = "Documentation Map"

export const DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADINGS: readonly string[] = [
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

export function buildInitialProjectOverviewDocument(): string {
	return `# ${DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_EXECUTIVE_SUMMARY}

# ${DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_CLASSIFICATION}

Repository Type:
Product Type:
Primary Language:
Repo Status:
Architecture Pattern:

# ${DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_STRUCTURE}

# ${DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_TECHNOLOGY_STACK_SUMMARY}

# ${DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_KEY_FEATURES}

# ${DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_ARCHITECTURE_HIGHLIGHTS}

# ${DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_REPOSITORY_STRUCTURE}

# ${DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_DEPENDENCY_GRAPH_AND_DATA_FLOW}

# ${DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_INTEGRATION_POINTS_AND_API_CONTRACTS}

# ${DOCUMENT_PROJECT_PROJECT_OVERVIEW_HEADING_DOCUMENTATION_MAP}
`
}

export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_CODING_STYLE = "Coding Style"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_BEFORE_CONTRIBUTING = "Before Contributing"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_LOCAL_DEVELOPMENT_INSTRUCTIONS = "Local Development Instructions"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_CODE_QUALITY = "Code Quality"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_END_TO_END_TESTING = "End to End Testing"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_COMMIT_GUIDELINES = "Commit Guidelines"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_MOST_RECENT_PROJECT_NOTES = "Most Recent Project Notes"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_PLANNED_ENHANCEMENTS = "Planned Enhancements"
export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_KNOWN_ISSUES_AND_TECHNICAL_DEBT = "Known Issues & Technical Debt"

export const DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADINGS: readonly string[] = [
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

export function buildInitialDeveloperGuideDocument(): string {
	return `# ${DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_CODING_STYLE}

# ${DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_BEFORE_CONTRIBUTING}
All updates should start with a clean working tree. Always check for a clean tree before beginning work, and ask the user to commit anything already in the working tree before you begin if the tree is not clean.

# ${DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_LOCAL_DEVELOPMENT_INSTRUCTIONS}
- You must always follow workflow instructions exactly
- You must always stop and ask for guidance when faced with anything ambiguous or for which a decision is required that has not been explicitly deferred to you by the user or workflow instructions
- You must avoid broad file scan behavior. Limit system access to the files necessary to perform the task assigned to you.
- You must only use attempt_completion once, as your final completion report at the end of a workflow.

# ${DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_CODE_QUALITY}
- Keep changes narrowly scoped to the requested behavior and follow the existing architecture, naming conventions, helper APIs, and file organization already present in the codebase.
- Prefer type-safe, explicit implementations. Avoid \`any\`, unchecked casts, ad hoc string parsing, duplicated constants, and broad fallback behavior unless the project already uses that pattern or the requirements explicitly call for it.
- Do not invent user-facing text, prompts, labels, errors, configuration values, or workflow behavior. Reuse existing repo-owned strings and patterns where available; if required wording is missing, ask for clarification.
- When changing behavior, update the directly affected tests and remove stale imports, helpers, fixtures, assertions, and validation guards. Do not leave dead code behind.
- Before considering work complete, run the repository’s relevant focused tests plus the standard quality gates, such as typecheck, lint/format, and build/package commands if configured. Record the exact commands and outcomes.

# ${DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_END_TO_END_TESTING}

# ${DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_COMMIT_GUIDELINES}
When asked to commit your work, follow these rules:
	- Write clear, descriptive commit messages
	- Use conventional commit format (e.g. “feat:”, “fix:”, “docs:”)
	- Reference project title, story number, epic number, or phase number where relevant.

# ${DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_MOST_RECENT_PROJECT_NOTES}

# ${DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_PLANNED_ENHANCEMENTS}

# ${DOCUMENT_PROJECT_DEVELOPER_GUIDE_HEADING_KNOWN_ISSUES_AND_TECHNICAL_DEBT}
`
}
