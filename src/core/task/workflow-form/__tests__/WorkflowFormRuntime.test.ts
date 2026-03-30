import { WorkflowFormAction, WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"
import { expect } from "chai"
import { describe, it } from "mocha"
import { WorkflowFormRuntime } from "../WorkflowFormRuntime"

describe("WorkflowFormRuntime", () => {
	const runtime = new WorkflowFormRuntime()

	it("creates a confirm payload for the Phase 1 workflow form session", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
		})

		const payload = runtime.buildPayload(session)

		expect(payload.phase).to.equal("confirm")
		expect(payload.title).to.equal("Review Diff Artifact")
		expect(payload.prompt).to.equal(
			"This workflow requires the following tool-produced artifact: `review-input.diff`.\n\nCan you provide the inputs required to produce `review-input.diff`?",
		)
		expect(payload.options).to.deep.equal(["Yes", "No"])
	})

	it("transitions from confirm to select_source when the submission confirms yes", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
		})

		const request = WorkflowFormSubmissionRequest.create({
			sessionId: session.sessionId,
			action: WorkflowFormAction.SUBMIT,
			fields: [{ key: "confirm", value: { stringValue: "yes" } }],
		})

		const outcome = runtime.handleSubmission(session, request)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.phase).to.equal("select_source")
			expect(outcome.payload.phase).to.equal("select_source")
		}
	})

	it("transitions from select_source to collect_inputs without invoking the tool", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
		})

		const request = WorkflowFormSubmissionRequest.create({
			sessionId: session.sessionId,
			action: WorkflowFormAction.SUBMIT,
			fields: [{ key: "source.type", value: { stringValue: "commit" } }],
		})

		const outcome = runtime.handleSubmission(
			{
				...session,
				phase: "select_source",
				values: {
					confirm: { stringValue: "yes" },
				},
			},
			request,
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.phase).to.equal("collect_inputs")
			expect(outcome.payload.phase).to.equal("collect_inputs")
		}
	})

	it("falls back to the agent when the confirm flow is cancelled", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
		})

		const request = WorkflowFormSubmissionRequest.create({
			sessionId: session.sessionId,
			action: WorkflowFormAction.CANCEL,
		})

		const outcome = runtime.handleSubmission(session, request)

		expect(outcome.kind).to.equal("fallback_to_agent")
	})

	it("translates structured submissions into the canonical Phase 1 tool shape", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
		})

		const request = WorkflowFormSubmissionRequest.create({
			sessionId: session.sessionId,
			action: WorkflowFormAction.SUBMIT,
			fields: [
				{ key: "source.type", value: { stringValue: "commit_range" } },
				{ key: "source.base", value: { stringValue: "main" } },
				{ key: "source.head", value: { stringValue: "feature/review-form" } },
				{
					key: "scoped_paths",
					value: { stringArrayValue: { values: ["src/core/task/index.ts", " webview-ui/src/components/chat "] } },
				},
				{ key: "context_lines", value: { integerValue: 5 } },
			],
		})

		const outcome = runtime.handleSubmission(
			{
				...session,
				phase: "collect_inputs",
			},
			request,
		)

		expect(outcome.kind).to.equal("invoke_tool")
		if (outcome.kind === "invoke_tool") {
			expect(outcome.toolName).to.equal("build_review_diff_output")
			expect(outcome.toolInput).to.deep.equal({
				source: {
					type: "commit_range",
					base: "main",
					head: "feature/review-form",
				},
				scoped_paths: ["src/core/task/index.ts", "webview-ui/src/components/chat"],
				context_lines: 5,
			})
		}
	})

	it("uses corrected retry_error values when submitting after a tool failure", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
		})

		const request = WorkflowFormSubmissionRequest.create({
			sessionId: session.sessionId,
			action: WorkflowFormAction.SUBMIT,
			fields: [
				{ key: "source.commit", value: { stringValue: "def5678" } },
				{
					key: "scoped_paths",
					value: { stringArrayValue: { values: ["src/core/task/index.ts", " webview-ui/src/components/chat "] } },
				},
				{ key: "context_lines", value: { integerValue: 7 } },
			],
		})

		const outcome = runtime.handleSubmission(
			{
				...session,
				phase: "retry_error",
				values: {
					confirm: { stringValue: "yes" },
					"source.type": { stringValue: "commit" },
					"source.commit": { stringValue: "abc1234" },
					scoped_paths: { stringArrayValue: ["src/old/path.ts"] },
					context_lines: { integerValue: 3 },
				},
				lastError: "Failed to produce review-input.diff",
			},
			request,
		)

		expect(outcome.kind).to.equal("invoke_tool")
		if (outcome.kind === "invoke_tool") {
			expect(outcome.toolInput).to.deep.equal({
				source: {
					type: "commit",
					commit: "def5678",
				},
				scoped_paths: ["src/core/task/index.ts", "webview-ui/src/components/chat"],
				context_lines: 7,
			})
		}
	})

	it("resets retry_error back to select_source while preserving only confirm", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
		})

		const request = WorkflowFormSubmissionRequest.create({
			sessionId: session.sessionId,
			action: WorkflowFormAction.RETRY,
		})

		const outcome = runtime.handleSubmission(
			{
				...session,
				phase: "retry_error",
				values: {
					confirm: { stringValue: "yes" },
					"source.type": { stringValue: "commit_range" },
					"source.base": { stringValue: "main" },
					"source.head": { stringValue: "feature/review-form" },
					scoped_paths: { stringArrayValue: ["src/core/task/index.ts"] },
					context_lines: { integerValue: 5 },
				},
				lastError: "Failed to produce review-input.diff",
			},
			request,
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.phase).to.equal("select_source")
			expect(outcome.payload.phase).to.equal("select_source")
			expect(outcome.session.values).to.deep.equal({
				confirm: { stringValue: "yes" },
			})
		}
	})

	it("never produces a tool input from a select_source submission missing source.commit", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
		})

		const request = WorkflowFormSubmissionRequest.create({
			sessionId: session.sessionId,
			action: WorkflowFormAction.SUBMIT,
			fields: [{ key: "source.type", value: { stringValue: "commit" } }],
		})

		const outcome = runtime.handleSubmission(
			{
				...session,
				phase: "select_source",
				values: {
					confirm: { stringValue: "yes" },
				},
			},
			request,
		)

		expect(outcome.kind).to.not.equal("invoke_tool")
		if (outcome.kind === "render_form") {
			expect(outcome.session.phase).to.equal("collect_inputs")
			expect(outcome.session.values["source.commit"]).to.equal(undefined)
		}
	})

	it("builds the runtime dictionary payload in an install-like environment without docs path resolution", () => {
		const originalCwd = process.cwd()

		try {
			process.chdir("/")
			const runtimeWithDefaultReader = new WorkflowFormRuntime()
			const session = runtimeWithDefaultReader.createSession({
				resolverId: "code_review_step_3_diff_source",
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 3,
				},
			})

			const payload = runtimeWithDefaultReader.buildPayload(session)
			expect(payload.title).to.equal("Review Diff Artifact")
			expect(payload.toolDictionaryTitle).to.equal("Diff Source Reference")
			expect(payload.toolDictionaryMarkdown).to.include("## build_review_diff_output")
			expect(payload.toolDictionaryMarkdown).to.not.include("# Workflow UI Surface Tool Dictionary")
			expect(payload.toolDictionaryMarkdown).to.not.include("Generated from")
		} finally {
			process.chdir(originalCwd)
		}
	})
})
