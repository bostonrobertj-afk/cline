import { expect } from "chai"
import { describe, it } from "mocha"

import { ClineDefaultTool } from "@/shared/tools"

import { type WorkflowStepResolutionDefinition, type WorkflowStepResolutionSessionState } from "../types"
import { WorkflowStepResolutionRuntime } from "../WorkflowStepResolutionRuntime"

const createDefinition = (args?: { id?: string; title?: string }): WorkflowStepResolutionDefinition => ({
	id: args?.id ?? "code_review_step_3_review_input",
	toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
	buildStatusDefinition: () => ({
		title: args?.title ?? "Review Input Artifact",
		pendingLabel: "Preparing workflow documents",
		successLabel: "Workflow documents ready",
		failureLabel: "Automatic workflow preparation failed- falling back to manual LLM workflow preparation.",
	}),
	buildToolExecutionRequest: () => ({
		toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
		toolInput: {},
		toolParams: {},
	}),
	evaluateToolExecutionResult: () => ({ succeeded: true }),
})

const createRuntime = (definitions?: Record<string, WorkflowStepResolutionDefinition>) =>
	new WorkflowStepResolutionRuntime(
		definitions ?? {
			code_review_step_3_review_input: createDefinition(),
		},
	)

const createPendingSession = (args?: Partial<WorkflowStepResolutionSessionState>): WorkflowStepResolutionSessionState => ({
	sessionId: args?.sessionId ?? "session-code-review-step-3",
	definitionId: args?.definitionId ?? "code_review_step_3_review_input",
	triggerSource: "deterministic_workflow_progression",
	owner: args?.owner ?? {
		kind: "workflow_step",
		workflowName: "code-review",
		stepNumber: 3,
	},
	state: args?.state ?? "pending",
	lastError: args?.lastError,
})

describe("WorkflowStepResolutionRuntime", () => {
	it("creates a session through runtime.createSession(...)", () => {
		const runtime = createRuntime()
		const session = runtime.createSession({
			definitionId: "code_review_step_3_review_input",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "workflow_step",
				workflowName: "code-review",
				stepNumber: 3,
			},
		})

		expect(session.definitionId).to.equal("code_review_step_3_review_input")
		expect(session.triggerSource).to.equal("deterministic_workflow_progression")
		expect(session.owner).to.deep.equal({
			kind: "workflow_step",
			workflowName: "code-review",
			stepNumber: 3,
		})
		expect(session.state).to.equal("pending")
		expect(session.sessionId).to.be.a("string").and.not.empty
	})

	it("builds a payload from createPendingSession()", () => {
		const runtime = createRuntime()
		const payload = runtime.buildPayload(createPendingSession())

		expect(payload).to.deep.equal({
			sessionId: "session-code-review-step-3",
			definitionId: "code_review_step_3_review_input",
			owner: {
				workflowName: "code-review",
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

	it('builds a terminal success session from createPendingSession({ sessionId: "session-success" })', () => {
		const runtime = createRuntime()
		const terminalSession = runtime.buildTerminalSession(createPendingSession({ sessionId: "session-success" }), "success")

		expect(terminalSession.state).to.equal("success")
		expect(terminalSession.lastError).to.equal(undefined)
		expect(terminalSession.owner.kind).to.equal("workflow_step")
	})

	it('builds a terminal failure session from createPendingSession({ sessionId: "session-failure" }) with "fallback message"', () => {
		const runtime = createRuntime()
		const terminalSession = runtime.buildTerminalSession(
			createPendingSession({ sessionId: "session-failure" }),
			"failure",
			"fallback message",
		)

		expect(terminalSession.state).to.equal("failure")
		expect(terminalSession.lastError).to.equal("fallback message")
		expect(terminalSession.owner.kind).to.equal("workflow_step")
	})
})
