import { expect } from "chai"
import { describe, it } from "mocha"
import { buildWorkflowStartCardPayload } from "../buildWorkflowStartCardPayload"
import { type WorkflowStartCardSessionState } from "../types"

function createSession(args: Partial<WorkflowStartCardSessionState> = {}): WorkflowStartCardSessionState {
	return {
		sessionId: "session-default",
		workflowName: "quick-spec",
		markdownBody: "Start card body",
		submitLabel: "Continue",
		projectMode: "new",
		existingProjectOptions: [],
		selectedExistingProject: undefined,
		newProjectTitle: undefined,
		...args,
	}
}

describe("workflow-start-card/WorkflowStartCardRegistry", () => {
	it("builds a payload from an unsuffixed workflow name", () => {
		const payload = buildWorkflowStartCardPayload(
			createSession({
				sessionId: "session-quick-spec",
				workflowName: "quick-spec",
				markdownBody: "Quick spec body",
				newProjectTitle: "Project Phoenix",
			}),
		)

		expect(payload).to.deep.equal({
			sessionId: "session-quick-spec",
			title: "Welcome to the Quick Spec Workflow!",
			markdownBody: "Quick spec body",
			submitLabel: "Continue",
			projectMode: "new",
			existingProjectOptions: [],
			selectedExistingProject: undefined,
			newProjectTitle: "Project Phoenix",
		})
	})

	it("builds a payload for existing-project selection", () => {
		const payload = buildWorkflowStartCardPayload(
			createSession({
				sessionId: "session-existing",
				workflowName: "create-story",
				markdownBody: "Create story body",
				projectMode: "existing",
				existingProjectOptions: [
					{ value: "alpha", label: "alpha" },
					{ value: "beta", label: "beta" },
				],
				selectedExistingProject: "beta",
			}),
		)

		expect(payload).to.deep.equal({
			sessionId: "session-existing",
			title: "Welcome to the Create Story Workflow!",
			markdownBody: "Create story body",
			submitLabel: "Continue",
			projectMode: "existing",
			existingProjectOptions: [
				{ value: "alpha", label: "alpha" },
				{ value: "beta", label: "beta" },
			],
			selectedExistingProject: "beta",
			newProjectTitle: undefined,
		})
	})
})
