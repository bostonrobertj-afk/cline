import { expect } from "chai"
import { describe, it } from "mocha"
import type { ActiveWorkflowSession, WorkflowValues } from "../../../types"
import { buildCreateArchitectureDocumentFromSession, buildInitialCreateArchitectureDocument } from "../createArchitectureDocument"

const EXPECTED_INITIAL_ARCHITECTURE_DOCUMENT = `# Scope, Context, & Goals

## Relevant Context

## Scope

## Architectural goals

## Core architectural rules

## Project Context Analysis

## Interpretation

# Responsibility boundaries

## Durable vs transient ownership

### Required additional baseline for authority enforcement

# Current code assessment

### Aligned

### Partially aligned

### Not aligned / conflicts

# Key tradeoffs and risks

## Tradeoffs

## Risks

# Project Blast Radius

# Dependencies

# Project Roadmap
`

function createSession(workflowValues: WorkflowValues): ActiveWorkflowSession {
	return {
		activeStepNumber: 2,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Architecture Project",
			projectFolderName: "architecture-project",
		},
		lifecycle: {
			projectSelectionCompleted: true,
		},
		entryArtifactResolution: undefined,
		ui: {
			formSession: undefined,
			stepResolutionSession: undefined,
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext: {
			activeBranchId: "entry",
		},
	}
}

describe("createArchitectureDocument", () => {
	it("builds the initial architecture heading shell exactly", () => {
		const document = buildInitialCreateArchitectureDocument()

		expect(document).to.equal(EXPECTED_INITIAL_ARCHITECTURE_DOCUMENT)
	})

	it("renders submitted durable values under matching headings only", () => {
		const document = buildCreateArchitectureDocumentFromSession(
			createSession({
				has_context_files: true,
				context_files: "/workspace/docs/context.md",
				scope: "Define the workflow-runtime architecture.",
				has_architectural_goals: true,
				architectural_goals: "Keep runtime-owned operations deterministic.",
				has_core_architectural_rules: true,
				core_architectural_rules: "Do not expose internal mutation tools to model-facing steps.",
			}),
		)

		expect(document).to.include("## Relevant Context\n\n/workspace/docs/context.md\n\n## Scope")
		expect(document).to.include("## Scope\n\nDefine the workflow-runtime architecture.\n\n## Architectural goals")
		expect(document).to.include(
			"## Architectural goals\n\nKeep runtime-owned operations deterministic.\n\n## Core architectural rules",
		)
		expect(document).to.include(
			"## Core architectural rules\n\nDo not expose internal mutation tools to model-facing steps.\n\n## Project Context Analysis",
		)
		expect(document).to.include("## Project Context Analysis\n\n## Interpretation")
		expect(document).to.include("### Required additional baseline for authority enforcement\n\n# Current code assessment")
		expect(document).not.to.include("true")
		expect(document).not.to.include("false")
	})

	it("omits empty optional values while preserving the heading shell", () => {
		const document = buildCreateArchitectureDocumentFromSession(
			createSession({
				has_context_files: false,
				context_files: "   ",
				scope: "Document the architecture scope.",
				has_architectural_goals: false,
				architectural_goals: "",
				has_core_architectural_rules: false,
				core_architectural_rules: "   ",
			}),
		)

		expect(document).to.include("## Relevant Context\n\n## Scope\n\nDocument the architecture scope.")
		expect(document).to.include("## Architectural goals\n\n## Core architectural rules\n\n## Project Context Analysis")
		expect(document).to.include("# Project Blast Radius\n\n# Dependencies\n\n# Project Roadmap\n")
		expect(document).not.to.include("has_context_files")
		expect(document).not.to.include("has_architectural_goals")
		expect(document).not.to.include("has_core_architectural_rules")
		expect(document).not.to.include("false")
	})
})
