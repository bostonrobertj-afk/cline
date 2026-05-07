import { expect } from "chai"
import { describe, it } from "mocha"
import type { ActiveWorkflowSession, WorkflowValues } from "../../../types"
import {
	BRAINSTORMING_DOCUMENT_HEADING_CONTEXT_FILE,
	BRAINSTORMING_DOCUMENT_HEADING_IDEAS_GENERATED,
	BRAINSTORMING_DOCUMENT_HEADING_INPUT_DOCUMENTS,
	BRAINSTORMING_DOCUMENT_HEADING_SELECTED_APPROACH,
	BRAINSTORMING_DOCUMENT_HEADING_SELECTED_TECHNIQUES,
	BRAINSTORMING_DOCUMENT_HEADING_SESSION_GOALS,
	BRAINSTORMING_DOCUMENT_HEADING_SESSION_TOPIC,
	BRAINSTORMING_DOCUMENT_HEADING_STEPS_COMPLETED,
	buildBrainstormingDocumentFromSession,
	buildInitialBrainstormingDocument,
} from "../brainstormingDocument"

const EXPECTED_HEADINGS = [
	BRAINSTORMING_DOCUMENT_HEADING_STEPS_COMPLETED,
	BRAINSTORMING_DOCUMENT_HEADING_INPUT_DOCUMENTS,
	BRAINSTORMING_DOCUMENT_HEADING_SESSION_TOPIC,
	BRAINSTORMING_DOCUMENT_HEADING_SESSION_GOALS,
	BRAINSTORMING_DOCUMENT_HEADING_SELECTED_APPROACH,
	BRAINSTORMING_DOCUMENT_HEADING_SELECTED_TECHNIQUES,
	BRAINSTORMING_DOCUMENT_HEADING_IDEAS_GENERATED,
	BRAINSTORMING_DOCUMENT_HEADING_CONTEXT_FILE,
] as const

function createSession(workflowValues: WorkflowValues): ActiveWorkflowSession {
	return {
		activeStepNumber: 1,
		workflowValues,
		projectSelection: {
			projectMode: "existing",
			projectTitle: "Brainstorming Project",
			projectFolderName: "brainstorming-project",
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

describe("brainstormingDocument", () => {
	it("builds the initial heading shell in requirements order", () => {
		const document = buildInitialBrainstormingDocument()

		expect(document).to.equal(`${EXPECTED_HEADINGS.map((heading) => `# ${heading}`).join("\n\n")}\n`)
		expect(document.match(/^# /gm)).to.have.length(EXPECTED_HEADINGS.length)
	})

	it("renders Step 1 setup values into the document shell", () => {
		const document = buildBrainstormingDocumentFromSession(
			createSession({
				context_file: "/tmp/context.md",
				session_topic: "Improve onboarding activation",
				session_goals: "Generate experiment ideas for first-run success",
			}),
		)

		expect(document).to.include("# session topic\n\nImprove onboarding activation")
		expect(document).to.include("# session goals\n\nGenerate experiment ideas for first-run success")
		expect(document).to.include("# context file\n\n/tmp/context.md")
	})

	it("renders selected technique arrays as name and description bullets", () => {
		const document = buildBrainstormingDocumentFromSession(
			createSession({
				selected_approach: "I want to choose",
				selected_techniques: [
					{
						id: "five-whys",
						name: "Five Whys",
						category: "Deep",
						description: "Drill into root causes.",
					},
					{
						name: "Mind Mapping",
						description: "Branch ideas from a central concept.",
					},
				],
			}),
		)

		expect(document).to.include("# selected approach\n\nI want to choose")
		expect(document).to.include("- Five Whys: Drill into root causes.")
		expect(document).to.include("- Mind Mapping: Branch ideas from a central concept.")
	})

	it("renders only the approved suggestion placeholder for non-array selected techniques", () => {
		const suggestionDocument = buildBrainstormingDocumentFromSession(
			createSession({
				selected_techniques: "user requested technique suggestion",
			}),
		)
		const unsupportedDocument = buildBrainstormingDocumentFromSession(
			createSession({
				selected_techniques: "unexpected selected technique text",
			}),
		)

		expect(suggestionDocument).to.include("# selected techniques\n\nuser requested technique suggestion")
		expect(unsupportedDocument).not.to.include("unexpected selected technique text")
	})

	it("renders techniques used and generated ideas when present", () => {
		const document = buildBrainstormingDocumentFromSession(
			createSession({
				techniques_used: ["Five Whys", "Mind Mapping"],
				ideas_generated: ["Shorten first-run setup", "Show progress during onboarding"],
			}),
		)

		expect(document).to.include("# ideas generated")
		expect(document).to.include('"Five Whys"')
		expect(document).to.include('"Mind Mapping"')
		expect(document).to.include('"Shorten first-run setup"')
		expect(document).to.include('"Show progress during onboarding"')
	})
})
