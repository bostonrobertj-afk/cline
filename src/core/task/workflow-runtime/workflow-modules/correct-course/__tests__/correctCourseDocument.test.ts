import { expect } from "chai"
import { describe, it } from "mocha"
import type { ActiveWorkflowSession, WorkflowValues } from "../../../types"
import {
	buildInitialCorrectCourseDocument,
	CORRECT_COURSE_DOCUMENT_HEADING_ARCHITECTURE_MODIFICATIONS,
	CORRECT_COURSE_DOCUMENT_HEADING_CHANGE_MANAGEMENT_IMPLEMENTATION,
	CORRECT_COURSE_DOCUMENT_HEADING_EPIC_MODIFICATIONS,
	CORRECT_COURSE_DOCUMENT_HEADING_IDENTIFIED_ISSUE,
	CORRECT_COURSE_DOCUMENT_HEADING_IMPACT_ASSESSMENT,
	CORRECT_COURSE_DOCUMENT_HEADING_ISSUE_SOURCE,
	CORRECT_COURSE_DOCUMENT_HEADING_STORY_MODIFICATIONS,
} from "../correctCourseDocument"

const EXPECTED_HEADINGS = [
	CORRECT_COURSE_DOCUMENT_HEADING_IDENTIFIED_ISSUE,
	CORRECT_COURSE_DOCUMENT_HEADING_ISSUE_SOURCE,
	CORRECT_COURSE_DOCUMENT_HEADING_IMPACT_ASSESSMENT,
	CORRECT_COURSE_DOCUMENT_HEADING_ARCHITECTURE_MODIFICATIONS,
	CORRECT_COURSE_DOCUMENT_HEADING_EPIC_MODIFICATIONS,
	CORRECT_COURSE_DOCUMENT_HEADING_STORY_MODIFICATIONS,
	CORRECT_COURSE_DOCUMENT_HEADING_CHANGE_MANAGEMENT_IMPLEMENTATION,
] as const

function createSession(workflowValues: WorkflowValues): ActiveWorkflowSession {
	return {
		activeStepNumber: 2,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Correct Course Session",
			projectFolderName: "correct-course-project",
		},
		lifecycle: {
			projectSelectionCompleted: true,
		},
		entryArtifactResolution: undefined,
		prerequisiteFileResolutions: [],
		ui: {
			suppressedWorkflowFormIds: [],
			suppressedWorkflowStepResolutionRoutes: [],
		},
		branchContext: {
			activeBranchId: "entry",
		},
	}
}

describe("correctCourseDocument", () => {
	it("builds the initial change management plan headings in requirements order", () => {
		const document = buildInitialCorrectCourseDocument(createSession({}))

		expect(document).to.equal(`${EXPECTED_HEADINGS.map((heading) => `# ${heading}`).join("\n\n")}\n`)
		expect(document.match(/^# /gm)).to.have.length(EXPECTED_HEADINGS.length)
	})

	it("renders issue_description under the Identified Issue heading without placeholder copy", () => {
		const document = buildInitialCorrectCourseDocument(
			createSession({ issue_description: "OAuth callback fails in staging." }),
		)

		expect(document).to.include("# Identified Issue\n\nOAuth callback fails in staging.")
		for (const heading of EXPECTED_HEADINGS) {
			expect(document).to.include(`# ${heading}`)
		}
		expect(document).not.to.include("TODO")
		expect(document).not.to.include("placeholder")
		expect(document).to.include("# Issue Source\n\n# Impact Assessment")
	})
})
