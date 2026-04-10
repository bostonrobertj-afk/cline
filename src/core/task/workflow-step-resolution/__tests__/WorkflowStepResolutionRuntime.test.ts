import { expect } from "chai"
import { describe, it } from "mocha"
import { WorkflowStepResolutionRuntime } from "../WorkflowStepResolutionRuntime"

describe("WorkflowStepResolutionRuntime", () => {
	const runtime = new WorkflowStepResolutionRuntime()

	it("creates sessions with a pending default state", () => {
		const session = runtime.createSession({
			definitionId: "code_review_step_3_review_input",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
		})

		expect(session.definitionId).to.equal("code_review_step_3_review_input")
		expect(session.state).to.equal("pending")
		expect(session.sessionId).to.be.a("string").and.not.empty
	})

	it("assembles payloads with the exact definition id and owner metadata", () => {
		const payload = runtime.buildPayload({
			sessionId: "session-code-review-step-3",
			definitionId: "code_review_step_3_review_input",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
			state: "pending",
		})

		expect(payload).to.deep.equal({
			sessionId: "session-code-review-step-3",
			definitionId: "code_review_step_3_review_input",
			owner: {
				workflowName: "code-review.md",
				stepNumber: 3,
			},
			state: "pending",
			definition: {
				title: "Review Input Artifact",
				pendingLabel: "Preparing workflow documents",
				successLabel: "Workflow documents ready",
				failureLabel: "Automatic workflow preparation failed- falling back to manual LLM workflow preparation.",
			},
		})
	})

	it('builds a terminal success session by changing the state to "success"', () => {
		const terminalSession = runtime.buildTerminalSession(
			{
				sessionId: "session-success",
				definitionId: "code_review_step_3_review_input",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 3,
				},
				state: "pending",
			},
			"success",
		)

		expect(terminalSession.state).to.equal("success")
		expect(terminalSession.lastError).to.equal(undefined)
	})

	it('builds a terminal failure session by changing the state to "failure" and preserving lastError', () => {
		const terminalSession = runtime.buildTerminalSession(
			{
				sessionId: "session-failure",
				definitionId: "code_review_step_3_review_input",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 3,
				},
				state: "pending",
			},
			"failure",
			"fallback message",
		)

		expect(terminalSession.state).to.equal("failure")
		expect(terminalSession.lastError).to.equal("fallback message")
	})
})
