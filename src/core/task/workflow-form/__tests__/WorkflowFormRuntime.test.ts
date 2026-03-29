import { WorkflowFormAction, WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"
import { expect } from "chai"
import { describe, it } from "mocha"
import { buildToolDictionaryMarkdown } from "@/core/task/workflow-form/dictionaries/buildToolDictionary"
import { WorkflowFormRuntime } from "../WorkflowFormRuntime"

describe("WorkflowFormRuntime", () => {
	const runtime = new WorkflowFormRuntime(undefined, () => buildToolDictionaryMarkdown())

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
		expect(payload.title).to.equal("Prepare Diff Input")
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
})
