import { expect } from "chai"
import { describe, it } from "mocha"

import { ClineDefaultTool } from "@/shared/tools"

import { type WorkflowStepResolutionDefinition, type WorkflowStepResolutionSessionState } from "../types"
import { WorkflowStepResolutionRuntime } from "../WorkflowStepResolutionRuntime"

const createDefinition = (args?: { id?: string; title?: string }): WorkflowStepResolutionDefinition => ({
	id: args?.id ?? "quick_spec_step_2_build_tech_spec_document",
	toolName: ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT,
	buildStatusDefinition: () => ({
		title: args?.title ?? "Tech Spec Scaffold",
		pendingLabel: "Preparing workflow documents",
		successLabel: "Workflow documents ready",
		failureLabel: "Automatic workflow preparation failed- falling back to manual LLM workflow preparation.",
	}),
	buildToolExecutionRequest: () => ({
		toolName: ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT,
		toolInput: {},
		toolParams: {},
	}),
	evaluateToolExecutionResult: () => ({ succeeded: true }),
})

const createRuntime = (definitions?: Record<string, WorkflowStepResolutionDefinition>) =>
	new WorkflowStepResolutionRuntime(
		definitions ?? {
			quick_spec_step_2_build_tech_spec_document: createDefinition(),
		},
	)

const createPendingSession = (args?: Partial<WorkflowStepResolutionSessionState>): WorkflowStepResolutionSessionState => ({
	sessionId: args?.sessionId ?? "session-quick-spec-step-2",
	definitionId: args?.definitionId ?? "quick_spec_step_2_build_tech_spec_document",
	triggerSource: "deterministic_workflow_progression",
	owner: args?.owner ?? {
		kind: "workflow_step",
		workflowName: "quick-spec",
		stepNumber: 2,
	},
	state: args?.state ?? "pending",
	lastError: args?.lastError,
})

describe("WorkflowStepResolutionRuntime", () => {
	it("creates a session through runtime.createSession(...)", () => {
		const runtime = createRuntime()
		const session = runtime.createSession({
			definitionId: "quick_spec_step_2_build_tech_spec_document",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "workflow_step",
				workflowName: "quick-spec",
				stepNumber: 2,
			},
		})

		expect(session.definitionId).to.equal("quick_spec_step_2_build_tech_spec_document")
		expect(session.triggerSource).to.equal("deterministic_workflow_progression")
		expect(session.owner).to.deep.equal({
			kind: "workflow_step",
			workflowName: "quick-spec",
			stepNumber: 2,
		})
		expect(session.state).to.equal("pending")
		expect(session.sessionId).to.be.a("string").and.not.empty
	})

	it("builds a payload from createPendingSession()", () => {
		const runtime = createRuntime()
		const payload = runtime.buildPayload(createPendingSession())

		expect(payload).to.deep.equal({
			sessionId: "session-quick-spec-step-2",
			definitionId: "quick_spec_step_2_build_tech_spec_document",
			owner: {
				workflowName: "quick-spec",
				stepNumber: 2,
			},
			state: "pending",
			definition: {
				title: "Tech Spec Scaffold",
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
