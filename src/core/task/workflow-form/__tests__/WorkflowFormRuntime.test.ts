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
				valueSchema: { type: "string" },
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
			const fields = sessionAwareCustomResolver.buildDefinition(session).pages.collect_inputs?.fields ?? []
			const filteredValues = fields.reduce<Record<string, string>>((acc, field) => {
				const value = values[field.key]?.rawValue
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

	const confirmToCollectFormResolver: WorkflowFormResolverDefinition = {
		id: "confirm_to_collect_form",
		toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
		buildDefinition: (): WorkflowFormDefinition => ({
			toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
			title: "Confirm To Collect Form",
			toolDictionaryTitle: "Placeholder Reference",
			toolDictionaryMarkdown: "## set_workflow_placeholders",
			pages: {
				confirm: {
					prompt: "Confirm the placeholder form.",
					options: ["Yes", "No"],
				},
				collect_inputs: {
					prompt: "Collect the placeholder value.",
					fields: [
						{
							key: "placeholder_value",
							label: "Placeholder Value",
							help: "Generic value used only for the confirm-to-collect transition test.",
							control: "text",
							valueSchema: { type: "string" },
							required: true,
							visible: true,
						},
					],
				},
				retry_error: {
					prompt: "Retry the placeholder form.",
					fields: [
						{
							key: "placeholder_value",
							label: "Placeholder Value",
							help: "Generic value used only for the confirm-to-collect transition test.",
							control: "text",
							valueSchema: { type: "string" },
							required: true,
							visible: true,
						},
					],
				},
			},
			successMessage: "success",
		}),
		buildToolExecutionFailureFallbackMessage: () => "error",
		evaluateToolExecutionResult: () => ({ succeeded: true }),
		buildToolExecutionRequest: (_session: WorkflowFormSessionState, values: WorkflowFormValues) => ({
			toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
			toolInput: {
				values: {
					placeholder_value: values.placeholder_value?.rawValue ?? "",
				},
			},
			toolParams: {
				values: JSON.stringify({
					placeholder_value: values.placeholder_value?.rawValue ?? "",
				}),
			},
		}),
	}

	function createCustomRuntime() {
		return new WorkflowFormRuntime({ generic_form: sessionAwareCustomResolver })
	}

	function createConfirmToCollectRuntime() {
		return new WorkflowFormRuntime({ confirm_to_collect_form: confirmToCollectFormResolver })
	}

	it("creates a confirm payload for the Phase 1 workflow form session", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 2,
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

	it("transitions from confirm to select_source when the Phase 1 resolver submission confirms yes", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 2,
			},
		})

		const request = WorkflowFormSubmissionRequest.create({
			sessionId: session.sessionId,
			action: WorkflowFormAction.SUBMIT,
			fields: [{ key: "confirm", value: { rawValue: "yes" } }],
		})

		const outcome = runtime.handleSubmission(session, request)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.phase).to.equal("select_source")
			expect(outcome.payload.phase).to.equal("select_source")
		}
	})

	it("transitions from confirm to collect_inputs when the resolver has no select_source page", () => {
		const customRuntime = createConfirmToCollectRuntime()
		const session = customRuntime.createSession({
			resolverId: "confirm_to_collect_form",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
			},
		})

		const outcome = customRuntime.handleSubmission(
			session,
			WorkflowFormSubmissionRequest.create({
				sessionId: session.sessionId,
				action: WorkflowFormAction.SUBMIT,
				fields: [{ key: "confirm", value: { rawValue: "yes" } }],
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.phase).to.equal("collect_inputs")
			expect(outcome.payload.phase).to.equal("collect_inputs")
		}
	})

	it("returns from collect_inputs to select_source when BACK is submitted", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 2,
			},
		})

		const outcome = runtime.handleSubmission(
			{
				...session,
				phase: "collect_inputs",
				initialPhase: "confirm",
				values: {
					confirm: { rawValue: "yes" },
					"source.type": { rawValue: "commit" },
					"source.commit": { rawValue: "abc1234" },
					context_lines: { rawValue: "5" },
				},
			},
			WorkflowFormSubmissionRequest.create({
				sessionId: session.sessionId,
				action: WorkflowFormAction.BACK,
				fields: [],
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.phase).to.equal("select_source")
			expect(outcome.payload.phase).to.equal("select_source")
			expect(outcome.session.values).to.deep.equal({
				confirm: { rawValue: "yes" },
				"source.type": { rawValue: "commit" },
			})
		}
	})

	it("returns from retry_error to select_source when BACK is submitted and clears downstream values", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 2,
			},
		})

		const outcome = runtime.handleSubmission(
			{
				...session,
				phase: "retry_error",
				initialPhase: "confirm",
				values: {
					confirm: { rawValue: "yes" },
					"source.type": { rawValue: "commit_range" },
					"source.base": { rawValue: "main" },
					"source.head": { rawValue: "feature/review-form" },
					context_lines: { rawValue: "7" },
				},
				lastError: "required fields are missing input",
			},
			WorkflowFormSubmissionRequest.create({
				sessionId: session.sessionId,
				action: WorkflowFormAction.BACK,
				fields: [],
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.phase).to.equal("select_source")
			expect(outcome.session.lastError).to.equal(undefined)
			expect(outcome.session.values).to.deep.equal({
				confirm: { rawValue: "yes" },
				"source.type": { rawValue: "commit_range" },
			})
		}
	})

	it("re-renders the current phase unchanged when BACK is submitted for a resolver without select_source", () => {
		const customRuntime = createConfirmToCollectRuntime()
		const session = customRuntime.createSession({
			resolverId: "confirm_to_collect_form",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
			},
		})

		const outcome = customRuntime.handleSubmission(
			{
				...session,
				phase: "collect_inputs",
				initialPhase: "confirm",
				values: {
					confirm: { rawValue: "yes" },
					placeholder_value: { rawValue: "example" },
				},
			},
			WorkflowFormSubmissionRequest.create({
				sessionId: session.sessionId,
				action: WorkflowFormAction.BACK,
				fields: [],
			}),
		)

		expect(outcome.kind).to.equal("render_form")
		if (outcome.kind === "render_form") {
			expect(outcome.session.phase).to.equal("collect_inputs")
			expect(outcome.payload.phase).to.equal("collect_inputs")
			expect(outcome.session.values.placeholder_value?.rawValue).to.equal("example")
		}
	})

	it("transitions from select_source to collect_inputs without invoking the tool", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 2,
			},
		})

		const request = WorkflowFormSubmissionRequest.create({
			sessionId: session.sessionId,
			action: WorkflowFormAction.SUBMIT,
			fields: [{ key: "source.type", value: { rawValue: "commit" } }],
		})

		const outcome = runtime.handleSubmission(
			{
				...session,
				phase: "select_source",
				values: {
					confirm: { rawValue: "yes" },
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
				stepNumber: 2,
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
				stepNumber: 2,
			},
		})

		const request = WorkflowFormSubmissionRequest.create({
			sessionId: session.sessionId,
			action: WorkflowFormAction.SUBMIT,
			fields: [
				{ key: "source.type", value: { rawValue: "commit_range" } },
				{ key: "source.base", value: { rawValue: "main" } },
				{ key: "source.head", value: { rawValue: "feature/review-form" } },
				{ key: "scoped_paths", value: { rawValue: "src/core/task/index.ts\n webview-ui/src/components/chat " } },
				{ key: "context_lines", value: { rawValue: "5" } },
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
				fields: [{ key: "review_input", value: { rawValue: "docs/review.md" } }],
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
					{ key: "review_input", value: { rawValue: "docs/review.md" } },
					{ key: "spec_file", value: { rawValue: "docs/spec.md" } },
					{ key: "ignored", value: { rawValue: "drop-me" } },
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

	it("builds workflow-start payloads with contextual mapped term reference rows", () => {
		const session = runtime.createSession({
			resolverId: "placeholder_workflow_start_set_workflow_placeholders",
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			initialPhase: "collect_inputs",
			context: createWorkflowStartContext({
				requiredFieldKeys: ["review_input"],
				optionalFieldKeys: ["spec_file", "diff_output"],
			}),
		})

		const payload = runtime.buildPayload(session)

		expect(payload.definition.toolDictionaryTitle).to.equal("Workflow Placeholder Reference")
		expect(payload.definition.toolDictionaryMarkdown).to.include("`review_input`")
		expect(payload.definition.toolDictionaryMarkdown).to.include("`diff_output`")
		expect(payload.definition.toolDictionaryMarkdown).to.include("### Term Reference")
	})

	it("builds workflow-start payloads without a term reference section when all keys are unmapped", () => {
		const session = runtime.createSession({
			resolverId: "placeholder_workflow_start_set_workflow_placeholders",
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			initialPhase: "collect_inputs",
			context: createWorkflowStartContext({
				requiredFieldKeys: ["unmapped_input"],
				optionalFieldKeys: [],
			}),
		})

		const payload = runtime.buildPayload(session)

		expect(payload.definition.toolDictionaryMarkdown).to.not.include("### Term Reference")
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
				fields: [{ key: "review_input", value: { rawValue: "docs/review.md" } }],
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
					{ key: "review_input", value: { rawValue: "docs/review.md" } },
					{ key: "spec_file", value: { rawValue: "docs/spec.md" } },
				],
			}),
		)

		expect(outcome.kind).to.equal("invoke_tool")
	})

	it("invokes the tool when collect_inputs has zero fields", () => {
		const zeroFieldResolver: WorkflowFormResolverDefinition = {
			id: "zero_field_review_input",
			toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
			buildDefinition: (): WorkflowFormDefinition => ({
				toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
				title: "Zero Field Review Input",
				toolDictionaryTitle: "Review Input Reference",
				toolDictionaryMarkdown: "## build_review_input",
				pages: {
					confirm: {
						prompt: "Confirm the zero-field review-input form.",
						options: ["Yes", "No"],
					},
					collect_inputs: {
						prompt: "Build the review input.",
						fields: [],
					},
					retry_error: {
						prompt: "Retry the zero-field review-input form.",
						fields: [],
					},
				},
				successMessage: "success",
			}),
			buildToolExecutionFailureFallbackMessage: () => "error",
			evaluateToolExecutionResult: () => ({ succeeded: true }),
			buildToolExecutionRequest: () => ({
				toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
				toolInput: {},
				toolParams: {},
			}),
		}
		const customRuntime = new WorkflowFormRuntime({ zero_field_review_input: zeroFieldResolver })
		const session = customRuntime.createSession({
			resolverId: "zero_field_review_input",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
			initialPhase: "collect_inputs",
		})

		const outcome = customRuntime.handleSubmission(
			session,
			WorkflowFormSubmissionRequest.create({
				sessionId: session.sessionId,
				action: WorkflowFormAction.SUBMIT,
				fields: [],
			}),
		)

		expect(outcome.kind).to.equal("invoke_tool")
		if (outcome.kind === "invoke_tool") {
			expect(outcome.toolInput).to.deep.equal({})
			expect(outcome.toolParams).to.deep.equal({})
		}
	})

	it("drops schema-invalid optional collect_inputs values while still invoking the tool", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 2,
			},
		})

		const outcome = runtime.handleSubmission(
			{
				...session,
				phase: "collect_inputs",
				values: {
					confirm: { rawValue: "yes" },
					"source.type": { rawValue: "commit" },
				},
			},
			WorkflowFormSubmissionRequest.create({
				sessionId: session.sessionId,
				action: WorkflowFormAction.SUBMIT,
				fields: [
					{ key: "source.commit", value: { rawValue: "abc1234" } },
					{ key: "context_lines", value: { rawValue: "not-a-number" } },
				],
			}),
		)

		expect(outcome.kind).to.equal("invoke_tool")
		if (outcome.kind === "invoke_tool") {
			expect(outcome.toolInput).to.not.have.property("context_lines")
			expect(outcome.toolParams).to.not.have.property("context_lines")
		}
	})

	it("uses corrected retry_error values when submitting after a tool failure", () => {
		const session = runtime.createSession({
			resolverId: "code_review_step_3_diff_source",
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 2,
			},
		})

		const request = WorkflowFormSubmissionRequest.create({
			sessionId: session.sessionId,
			action: WorkflowFormAction.SUBMIT,
			fields: [
				{ key: "source.commit", value: { rawValue: "def5678" } },
				{ key: "scoped_paths", value: { rawValue: "src/core/task/index.ts\n webview-ui/src/components/chat " } },
				{ key: "context_lines", value: { rawValue: "7" } },
			],
		})

		const outcome = runtime.handleSubmission(
			{
				...session,
				phase: "retry_error",
				values: {
					confirm: { rawValue: "yes" },
					"source.type": { rawValue: "commit" },
					"source.commit": { rawValue: "abc1234" },
					scoped_paths: { rawValue: "src/old/path.ts" },
					context_lines: { rawValue: "3" },
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
				stepNumber: 2,
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
					confirm: { rawValue: "yes" },
					"source.type": { rawValue: "commit_range" },
					"source.base": { rawValue: "main" },
					"source.head": { rawValue: "feature/review-form" },
					scoped_paths: { rawValue: "src/core/task/index.ts" },
					context_lines: { rawValue: "5" },
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
				confirm: { rawValue: "yes" },
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
					review_input: { rawValue: "docs/review.md" },
					spec_file: { rawValue: "docs/spec.md" },
					ignored: { rawValue: "drop-me" },
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
				review_input: { rawValue: "docs/review.md" },
				spec_file: { rawValue: "docs/spec.md" },
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
				stepNumber: 2,
			},
		})

		const request = WorkflowFormSubmissionRequest.create({
			sessionId: session.sessionId,
			action: WorkflowFormAction.SUBMIT,
			fields: [{ key: "source.type", value: { rawValue: "commit" } }],
		})

		const outcome = runtime.handleSubmission(
			{
				...session,
				phase: "select_source",
				values: {
					confirm: { rawValue: "yes" },
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
					stepNumber: 2,
				},
			})

			const payload = runtimeWithDefaultReader.buildPayload(session)
			expect(payload.definition.title).to.equal("Review Diff Artifact")
			expect(payload.definition.toolDictionaryTitle).to.equal("Diff Output Reference")
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
