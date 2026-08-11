import { expect } from "chai"
import { describe, it } from "mocha"
import type { ActiveWorkflowSession, WorkflowValues } from "../../../types"
import type { CreateEpicSectionInput } from "../createEpicsDocument"
import {
	buildCanonicalEpicSection,
	buildEpicsIndexJson,
	buildInitialCreateEpicsDocumentFromSession,
	upsertCanonicalEpicSection,
} from "../createEpicsDocument"

const EXPECTED_EMPTY_CREATE_EPICS_DOCUMENT = `# Context

## Architecture

## Brainstorming

## Additional Context

# Epics
`

function createSession(workflowValues: WorkflowValues): ActiveWorkflowSession {
	return {
		activeStepNumber: 1,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Create Epics Project",
			projectFolderName: "create-epics-project",
		},
		lifecycle: {
			projectSelectionCompleted: true,
		},
		entryArtifactResolution: undefined,
		prerequisiteFileResolutions: [],
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

function createEpicInput(identity: string, title: string, description: string): CreateEpicSectionInput {
	return {
		identity,
		title,
		objective: {
			as_a: `user ${identity}`,
			i_want: `capability ${identity}`,
			so_that: `outcome ${identity}`,
		},
		description,
		requirements: [`Requirement ${identity}`],
		scope: [`Scope ${identity}`],
		scopeBoundary: [`Boundary ${identity}`],
	}
}

describe("createEpicsDocument", () => {
	it("builds the initial create-epics document with the exact heading order and context values", () => {
		const document = buildInitialCreateEpicsDocumentFromSession(
			createSession({
				architecture_document: "/workspace/projects/example/planning/architecture.md",
				brainstorming_document: "/workspace/projects/example/discovery/brainstorming.md",
				additional_context_files: "/workspace/docs/research.md\n/workspace/docs/market.md",
			}),
		)

		expect(document).to.equal(`# Context

## Architecture

/workspace/projects/example/planning/architecture.md

## Brainstorming

/workspace/projects/example/discovery/brainstorming.md

## Additional Context

/workspace/docs/research.md
/workspace/docs/market.md

# Epics
`)
	})

	it("omits empty optional context values while preserving the exact heading shell", () => {
		const document = buildInitialCreateEpicsDocumentFromSession(
			createSession({
				architecture_document: "   ",
				brainstorming_document: "",
				additional_context_files: "   ",
			}),
		)

		expect(document).to.equal(EXPECTED_EMPTY_CREATE_EPICS_DOCUMENT)
	})

	it("builds the canonical epic section markdown exactly", () => {
		const section = buildCanonicalEpicSection({
			identity: "1",
			title: "Project setup foundation",
			objective: {
				as_a: "platform maintainer",
				i_want: "a reliable project foundation",
				so_that: "downstream work can build on stable runtime behavior",
			},
			description: "Establish the project foundation needed for future workflow capabilities.",
			requirements: ["Create the workflow module shell.", "Register the runtime-owned output artifact."],
			scope: ["Create the create-epics workflow definition.", "Add focused module tests."],
			scopeBoundary: ["Do not create downstream stories.", "Do not generate delivery specs."],
		})

		expect(section).to.equal(`## Epic 1: Project setup foundation

### Objective
As a platform maintainer
I want a reliable project foundation
So that downstream work can build on stable runtime behavior

### Description
Establish the project foundation needed for future workflow capabilities.

### Requirements
- Create the workflow module shell.
- Register the runtime-owned output artifact.

### Scope
- Create the create-epics workflow definition.
- Add focused module tests.

### Scope Boundary
- Do not create downstream stories.
- Do not generate delivery specs.
`)
	})

	it("upserts canonical epic sections while preserving other sections and ordering by numeric identity", () => {
		const withSecondEpic = upsertCanonicalEpicSection(
			EXPECTED_EMPTY_CREATE_EPICS_DOCUMENT,
			createEpicInput("2", "Second outcome", "Second description."),
		)
		const withFirstAndSecondEpics = upsertCanonicalEpicSection(
			withSecondEpic,
			createEpicInput("1", "First outcome", "First description."),
		)
		const withReplacement = upsertCanonicalEpicSection(
			withFirstAndSecondEpics,
			createEpicInput("2", "Second revised outcome", "Second revised description."),
		)

		expect(withReplacement).to.include("## Epic 1: First outcome")
		expect(withReplacement).to.include("First description.")
		expect(withReplacement).to.include("## Epic 2: Second revised outcome")
		expect(withReplacement).to.include("Second revised description.")
		expect(withReplacement).not.to.include("## Epic 2: Second outcome")
		expect(withReplacement).not.to.include("Second description.")
		expect(withReplacement.indexOf("## Epic 1: First outcome")).to.be.lessThan(
			withReplacement.indexOf("## Epic 2: Second revised outcome"),
		)
	})

	it("builds Epics.index.json for one canonical epic", () => {
		const document = upsertCanonicalEpicSection(
			EXPECTED_EMPTY_CREATE_EPICS_DOCUMENT,
			createEpicInput("1", "First outcome", "First description with story and review details."),
		)

		expect(buildEpicsIndexJson(document)).to.equal(`{
  "version": 1,
  "epics": [
    {
      "identity": "1",
      "title": "First outcome",
      "story-index-generated": false
    }
  ]
}
`)
	})

	it("builds Epics.index.json for multiple canonical epics without non-index epic data", () => {
		const withTenthEpic = upsertCanonicalEpicSection(
			EXPECTED_EMPTY_CREATE_EPICS_DOCUMENT,
			createEpicInput(
				"10",
				"Tenth outcome",
				"Tenth description with story, review, objective, scope, and requirements details.",
			),
		)
		const withSecondAndTenthEpics = upsertCanonicalEpicSection(
			withTenthEpic,
			createEpicInput("2", "Second outcome", "Second description."),
		)
		const indexJson = buildEpicsIndexJson(withSecondAndTenthEpics)

		expect(indexJson).to.equal(`{
  "version": 1,
  "epics": [
    {
      "identity": "2",
      "title": "Second outcome",
      "story-index-generated": false
    },
    {
      "identity": "10",
      "title": "Tenth outcome",
      "story-index-generated": false
    }
  ]
}
`)
		expect(indexJson).not.to.include("story, review")
		expect(indexJson).not.to.include("review")
		expect(indexJson).not.to.include("objective")
		expect(indexJson).not.to.include("scope")
		expect(indexJson).not.to.include("requirements")
		expect(indexJson).not.to.include("Requirement 10")
		expect(indexJson).not.to.include("Scope 10")
		expect(indexJson).not.to.include(["epic", "delivery", "spec", "generated"].join("-"))
	})

	it("fails clearly when Epics.md contains no canonical epic sections", () => {
		expect(() => buildEpicsIndexJson(EXPECTED_EMPTY_CREATE_EPICS_DOCUMENT)).to.throw(
			Error,
			"Cannot build Epics.index.json because Epics.md contains no canonical epic sections.",
		)
	})

	it("fails clearly when Epics.md contains duplicate canonical epic identities", () => {
		const duplicateDocument = `${EXPECTED_EMPTY_CREATE_EPICS_DOCUMENT.trimEnd()}

${buildCanonicalEpicSection(createEpicInput("1", "First outcome", "First description.")).trim()}

${buildCanonicalEpicSection(createEpicInput("1", "Duplicate first outcome", "Duplicate description.")).trim()}
`

		expect(() => buildEpicsIndexJson(duplicateDocument)).to.throw(
			Error,
			'Cannot build Epics.index.json because duplicate canonical epic identity "1" was found.',
		)
	})
})
