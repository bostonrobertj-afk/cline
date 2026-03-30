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

	it("transitions from confirm to collect when the submission confirms yes", () => {
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
			expect(outcome.session.phase).to.equal("collect")
			expect(outcome.payload.phase).to.equal("collect")
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
				phase: "collect",
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
