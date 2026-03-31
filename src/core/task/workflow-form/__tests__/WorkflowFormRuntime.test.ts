import type { WorkflowFormDefinition, WorkflowFormFieldDefinition } from "@shared/ExtensionMessage"
import { WorkflowFormAction, WorkflowFormSubmissionRequest } from "@shared/proto/cline/task"
import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineDefaultTool } from "@/shared/tools"
import type {
	WorkflowFormResolverDefinition,
	WorkflowFormSessionContext,
	WorkflowFormSessionState,
	WorkflowFormValues,
} from "../types"
import { WorkflowFormRuntime } from "../WorkflowFormRuntime"

describe("WorkflowFormRuntime", () => {
	const runtime = new WorkflowFormRuntime()

	function createWorkflowStartContext(args: {
		requiredFieldKeys: string[]
		optionalFieldKeys: string[]
		oneOfFieldKeys?: string[]
	}): WorkflowFormSessionContext {
		return {
			workflowName: "review-adversarial-general.md",
			workflowStartRequirements: {
				requiredFieldKeys: args.requiredFieldKeys,
				optionalFieldKeys: args.optionalFieldKeys,
				oneOfRequirement: args.oneOfFieldKeys
					? {
							id: "workflow_start_one_of",
							fieldKeys: args.oneOfFieldKeys,
						}
					: undefined,
			},
		}
	}

	function buildWorkflowStartFields(session: WorkflowFormSessionState): WorkflowFormFieldDefinition[] | undefined {
		const requirements = session.context?.workflowStartRequirements
		if (!requirements) {
			return undefined
		}

		const orderedKeys = [
			...requirements.requiredFieldKeys,
			...requirements.optionalFieldKeys,
			...(requirements.oneOfRequirement?.fieldKeys ?? []),
		]
		const requiredFieldKeys = new Set(requirements.requiredFieldKeys)
		const oneOfFieldKeys = new Set(requirements.oneOfRequirement?.fieldKeys ?? [])

		return orderedKeys.reduce<WorkflowFormFieldDefinition[]>((fields, key) => {
			if (fields.some((field) => field.key === key)) {
				return fields
			}

			fields.push({
				key,
				label: key,
				help: key,
				control: "text",
				required: requiredFieldKeys.has(key),
				oneOfGroupId: oneOfFieldKeys.has(key) ? requirements.oneOfRequirement?.id : undefined,
				visible: true,
			})

			return fields
		}, [])
	}

	const sessionAwareCustomResolver: WorkflowFormResolverDefinition = {
		id: "generic_form",
		toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
		buildDefinition: (session: WorkflowFormSessionState): WorkflowFormDefinition => ({
			toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
			title: "Generic Form",
			toolDictionaryTitle: "Generic Reference",
			toolDictionaryMarkdown: "## set_workflow_placeholders",
			pages: {
				confirm: {
					prompt: "Confirm the generic form.",
					options: ["Yes", "No"],
				},
				select_source: {
					prompt: "Select a source.",
				},
				collect_inputs: {
					prompt: "Collect the values.",
					fields: buildWorkflowStartFields(session),
				},
				retry_error: {
					prompt: "Retry the generic form.",
					fields: buildWorkflowStartFields(session),
				},
			},
			successMessage: "success",
		}),
		buildToolExecutionFailureFallbackMessage: () => "error",
		evaluateToolExecutionResult: () => ({ succeeded: true }),
		buildToolExecutionRequest: (session: WorkflowFormSessionState, values: WorkflowFormValues) => {
			const fields = sessionAwareCustomResolver.buildDefinition(session).pages.collect_inputs.fields ?? []
			const filteredValues = fields.reduce<Record<string, string>>((acc, field) => {
				const value = values[field.key]?.stringValue
				if (value) {
					acc[field.key] = value
				}

				return acc
			}, {})

			return {
				toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
				toolInput: { values: filteredValues },
				toolParams: {
					values: JSON.stringify(filteredValues),
				},
			}
		},
	}

	function createCustomRuntime() {
		return new WorkflowFormRuntime({ generic_form: sessionAwareCustomResolver })
	}

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
		expect(payload.definition.title).to.equal("Review Diff Artifact")
		expect(payload.definition.pages.confirm?.prompt).to.equal(
			"This workflow requires the following tool-produced artifact: `review-input.diff`.\n\nCan you provide the inputs required to produce `review-input.diff`?",
		)
		expect(payload.definition.pages.confirm?.options).to.deep.equal(["Yes", "No"])
	})

	it("creates collect_inputs sessions when the caller supplies an initialPhase", () => {
		const customRuntime = createCustomRuntime()
		const context = createWorkflowStartContext({
			requiredFieldKeys: ["review_input"],
			optionalFieldKeys: ["spec_file"],
		})
		const session = customRuntime.createSession({
			resolverId: "generic_form",
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			initialPhase: "collect_inputs",
			context,
		})

		expect(session.phase).to.equal("collect_inputs")
		expect(session.context).to.deep.equal(context)
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
			expect(outcome.toolParams).to.deep.equal({
				source: JSON.stringify({
					type: "commit_range",
					base: "main",
					head: "feature/review-form",
				}),
				scoped_paths: JSON.stringify(["src/core/task/index.ts", "webview-ui/src/components/chat"]),
				context_lines: "5",
			})
		}
	})

	it("uses whichever resolver id was supplied when building invoke_tool outcomes", () => {
		const customRuntime = createCustomRuntime()
		const session = customRuntime.createSession({
			resolverId: "generic_form",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
			},
			initialPhase: "collect_inputs",
			context: createWorkflowStartContext({
				requiredFieldKeys: [],
				optionalFieldKeys: ["review_input"],
			}),
		})

		const outcome = customRuntime.handleSubmission(
			session,
			WorkflowFormSubmissionRequest.create({
				sessionId: session.sessionId,
				action: WorkflowFormAction.SUBMIT,
				fields: [{ key: "review_input", value: { stringValue: "docs/review.md" } }],
			}),
		)

		expect(outcome.kind).to.equal("invoke_tool")
		if (outcome.kind === "invoke_tool") {
			expect(outcome.toolName).to.equal("set_workflow_placeholders")
			expect(outcome.toolParams).to.deep.equal({
				values: JSON.stringify({ review_input: "docs/review.md" }),
			})
		}
	})

	it("invokes set_workflow_placeholders from a collect_inputs start session", () => {
		const customRuntime = createCustomRuntime()
		const session = customRuntime.createSession({
			resolverId: "generic_form",
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			initialPhase: "collect_inputs",
			context: createWorkflowStartContext({
				requiredFieldKeys: ["review_input"],
				optionalFieldKeys: ["spec_file"],
			}),
		})

		const outcome = customRuntime.handleSubmission(
			session,
			WorkflowFormSubmissionRequest.create({
				sessionId: session.sessionId,
				action: WorkflowFormAction.SUBMIT,
				fields: [
					{ key: "review_input", value: { stringValue: "docs/review.md" } },
					{ key: "spec_file", value: { stringValue: "docs/spec.md" } },
					{ key: "ignored", value: { stringValue: "drop-me" } },
				],
			}),
		)

		expect(outcome.kind).to.equal("invoke_tool")
		if (outcome.kind === "invoke_tool") {
			expect(outcome.toolParams).to.deep.equal({
				values: JSON.stringify({
					review_input: "docs/review.md",
					spec_file: "docs/spec.md",
				}),
			})
		}
	})

	it("renders retry_error when required workflow-start fields are missing", () => {
		const customRuntime = createCustomRuntime()
		const session = customRuntime.createSession({
			resolverId: "generic_form",
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			initialPhase: "collect_inputs",
			context: createWorkflowStartContext({
				requiredFieldKeys: ["review_input"],
				optionalFieldKeys: ["spec_file"],
			}),
		})

		const outcome = customRuntime.handleSubmission(
			session,
			WorkflowFormSubmissionRequest.create({
				sessionId: session.sessionId,
				action: WorkflowFormAction.SUBMIT,
				fields: [],
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.phase).to.equal("retry_error")
			expect(outcome.session.lastError).to.equal("required fields are missing input")
		}
	})

	it("renders retry_error when the workflow-start one-of requirement is unsatisfied", () => {
		const customRuntime = createCustomRuntime()
		const session = customRuntime.createSession({
			resolverId: "generic_form",
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			initialPhase: "collect_inputs",
			context: createWorkflowStartContext({
				requiredFieldKeys: ["review_input"],
				optionalFieldKeys: [],
				oneOfFieldKeys: ["diff_output", "spec_file"],
			}),
		})

		const outcome = customRuntime.handleSubmission(
			session,
			WorkflowFormSubmissionRequest.create({
				sessionId: session.sessionId,
				action: WorkflowFormAction.SUBMIT,
				fields: [{ key: "review_input", value: { stringValue: "docs/review.md" } }],
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.phase).to.equal("retry_error")
			expect(outcome.session.lastError).to.equal(
				"One-of fields require at least one field be completed prior to submitting",
			)
		}
	})

	it("allows workflow-start submit when required and one-of semantics are satisfied", () => {
		const customRuntime = createCustomRuntime()
		const session = customRuntime.createSession({
			resolverId: "generic_form",
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			initialPhase: "collect_inputs",
			context: createWorkflowStartContext({
				requiredFieldKeys: ["review_input"],
				optionalFieldKeys: [],
				oneOfFieldKeys: ["diff_output", "spec_file"],
			}),
		})

		const outcome = customRuntime.handleSubmission(
			session,
			WorkflowFormSubmissionRequest.create({
				sessionId: session.sessionId,
				action: WorkflowFormAction.SUBMIT,
				fields: [
					{ key: "review_input", value: { stringValue: "docs/review.md" } },
					{ key: "spec_file", value: { stringValue: "docs/spec.md" } },
				],
			}),
		)

		expect(outcome.kind).to.equal("invoke_tool")
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

	it("restarts a collect_inputs start session on retry instead of returning to select_source", () => {
		const customRuntime = createCustomRuntime()
		const session = customRuntime.createSession({
			resolverId: "generic_form",
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			initialPhase: "collect_inputs",
			context: createWorkflowStartContext({
				requiredFieldKeys: ["review_input"],
				optionalFieldKeys: ["spec_file"],
			}),
		})

		const outcome = customRuntime.handleSubmission(
			{
				...session,
				phase: "retry_error",
				values: {
					review_input: { stringValue: "docs/review.md" },
					spec_file: { stringValue: "docs/spec.md" },
					ignored: { stringValue: "drop-me" },
				},
				lastError: "Failed to store start inputs",
			},
			WorkflowFormSubmissionRequest.create({
				sessionId: session.sessionId,
				action: WorkflowFormAction.RETRY,
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.phase).to.equal("collect_inputs")
			expect(outcome.payload.phase).to.equal("collect_inputs")
			expect(outcome.session.values).to.deep.equal({
				review_input: { stringValue: "docs/review.md" },
				spec_file: { stringValue: "docs/spec.md" },
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
			expect(payload.definition.title).to.equal("Review Diff Artifact")
			expect(payload.definition.toolDictionaryTitle).to.equal("Diff Source Reference")
			expect(payload.definition.toolDictionaryMarkdown).to.include("## build_review_diff_output")
			expect(payload.definition.toolDictionaryMarkdown).to.not.include("# Workflow UI Surface Tool Dictionary")
			expect(payload.definition.toolDictionaryMarkdown).to.not.include("Generated from")
		} finally {
			process.chdir(originalCwd)
		}
	})

	it("builds confirm and retry payloads from the shared workflow-form definition", () => {
		const customRuntime = createCustomRuntime()
		const session = customRuntime.createSession({
			resolverId: "generic_form",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
			},
		})

		const confirmPayload = customRuntime.buildPayload(session)
		const retryPayload = customRuntime.buildRetryPayload(session, "Retry this form.")

		expect(confirmPayload.definition).to.deep.equal(sessionAwareCustomResolver.buildDefinition(session))
		expect(retryPayload.definition).to.deep.equal(
			sessionAwareCustomResolver.buildDefinition({ ...session, phase: "retry_error" }),
		)
		expect(retryPayload.phase).to.equal("retry_error")
		expect(retryPayload.errorMessage).to.equal("Retry this form.")
	})
})
