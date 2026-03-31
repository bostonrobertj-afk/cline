import { expect } from "chai"
import { describe, it } from "mocha"
import {
	CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID,
	getWorkflowFormResolverDefinition,
	PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID,
} from "../WorkflowFormRegistry"

describe("WorkflowFormRegistry", () => {
	it("returns the code-review step 3 resolver metadata by id", () => {
		const resolver = getWorkflowFormResolverDefinition(CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID)

		expect(resolver.id).to.equal("code_review_step_3_diff_source")
		expect(resolver.toolName).to.equal("build_review_diff_output")
	})

	it("serializes the Phase 1 review-diff resolver into tool params", () => {
		const resolver = getWorkflowFormResolverDefinition(CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID)
		const outcome = resolver.buildToolExecutionRequest(
			{
				sessionId: "session-1",
				resolverId: resolver.id,
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 3,
				},
				phase: "collect_inputs",
				initialPhase: "confirm",
				values: {},
			},
			{
				"source.type": { rawValue: "commit_range" },
				"source.base": { rawValue: "main" },
				"source.head": { rawValue: "feature/review-form" },
				scoped_paths: { rawValue: "src/core/task/index.ts\nwebview-ui/src/components/chat" },
				context_lines: { rawValue: "5" },
			},
		)

		expect(outcome.toolParams).to.deep.equal({
			source: JSON.stringify({
				type: "commit_range",
				base: "main",
				head: "feature/review-form",
			}),
			scoped_paths: JSON.stringify(["src/core/task/index.ts", "webview-ui/src/components/chat"]),
			context_lines: "5",
		})
	})

	it("derives Phase 1 source-selection options from the build_review_diff_output schema", () => {
		const resolver = getWorkflowFormResolverDefinition(CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID)
		const definition = resolver.buildDefinition({
			sessionId: "session-1",
			resolverId: resolver.id,
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
			phase: "select_source",
			initialPhase: "confirm",
			values: {},
		})
		const sourceTypeField = definition.pages.select_source?.fields?.find((field) => field.key === "source.type")

		expect(sourceTypeField?.options?.map((option) => option.value)).to.deep.equal([
			"commit",
			"commit_range",
			"ref_diff",
			"worktree_head_scoped",
		])
	})

	it("attaches schema-derived value types to Phase 1 concrete input fields", () => {
		const resolver = getWorkflowFormResolverDefinition(CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID)
		const definition = resolver.buildDefinition({
			sessionId: "session-1",
			resolverId: resolver.id,
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
			phase: "collect_inputs",
			initialPhase: "confirm",
			values: {
				"source.type": { rawValue: "commit" },
			},
		})
		const fields = definition.pages.collect_inputs?.fields ?? []

		expect(fields.find((field) => field.key === "source.commit")?.valueSchema.type).to.equal("string")
		expect(fields.find((field) => field.key === "scoped_paths")?.valueSchema.type).to.equal("array")
		expect(fields.find((field) => field.key === "context_lines")?.valueSchema.type).to.equal("integer")
	})

	it("derives Phase 1 branch-specific source fields from the selected source variant schema", () => {
		const resolver = getWorkflowFormResolverDefinition(CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID)
		const definition = resolver.buildDefinition({
			sessionId: "session-1",
			resolverId: resolver.id,
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
			phase: "collect_inputs",
			initialPhase: "confirm",
			values: {
				"source.type": { rawValue: "commit_range" },
			},
		})
		const fieldKeys = (definition.pages.collect_inputs?.fields ?? []).map((field) => field.key)

		expect(fieldKeys).to.include("source.base")
		expect(fieldKeys).to.include("source.head")
		expect(fieldKeys).to.not.include("source.commit")
	})

	it("assembles the Phase 1 source payload from the selected source variant schema", () => {
		const resolver = getWorkflowFormResolverDefinition(CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID)
		const outcome = resolver.buildToolExecutionRequest(
			{
				sessionId: "session-1",
				resolverId: resolver.id,
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 3,
				},
				phase: "collect_inputs",
				initialPhase: "confirm",
				values: {},
			},
			{
				"source.type": { rawValue: "commit" },
				"source.commit": { rawValue: "abc1234" },
			},
		)

		expect(outcome.toolInput.source).to.deep.equal({ type: "commit", commit: "abc1234" })
		expect(outcome.toolParams.source).to.equal(JSON.stringify({ type: "commit", commit: "abc1234" }))
	})

	it("treats persisted diff-output tool results as success", () => {
		const resolver = getWorkflowFormResolverDefinition(CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID)
		const result = resolver.evaluateToolExecutionResult(
			{
				sessionId: "session-1",
				resolverId: resolver.id,
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 3,
				},
				phase: "collect_inputs",
				initialPhase: "confirm",
				values: {},
			},
			{
				toolResultText: JSON.stringify({
					persisted: true,
					diff_available: true,
					artifact_path: "/tmp/review-input.diff",
				}),
			},
		)

		expect(result).to.deep.equal({ succeeded: true })
	})

	it("treats non-persisted diff-output tool results as failure", () => {
		const resolver = getWorkflowFormResolverDefinition(CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID)
		const result = resolver.evaluateToolExecutionResult(
			{
				sessionId: "session-1",
				resolverId: resolver.id,
				triggerSource: "deterministic_workflow_progression",
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "code-review.md",
					stepNumber: 3,
				},
				phase: "collect_inputs",
				initialPhase: "confirm",
				values: {},
			},
			{
				toolResultText: JSON.stringify({
					persisted: false,
					diff_available: false,
					reason: "No Git-backed diff content was available for the requested source and scope.",
				}),
			},
		)

		expect(result).to.deep.equal({
			succeeded: false,
			errorMessage: "No Git-backed diff content was available for the requested source and scope.",
		})
	})

	it("builds workflow-start definitions from normalized requirements", () => {
		const resolver = getWorkflowFormResolverDefinition(PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID)
		const definition = resolver.buildDefinition({
			sessionId: "session-2",
			resolverId: resolver.id,
			triggerSource: "slash_command",
			owner: {
				kind: "slash_command",
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			phase: "collect_inputs",
			initialPhase: "collect_inputs",
			values: {},
			context: {
				workflowName: "review-adversarial-general.md",
				workflowStartRequirements: {
					requiredFieldKeys: ["spec_file", "review_input"],
					optionalFieldKeys: ["review_input", "diff_output"],
					oneOfRequirement: {
						id: "workflow_start_one_of",
						fieldKeys: ["review_input", "spec_file", "diff_output"],
					},
				},
			},
		})
		const fields = definition.pages.collect_inputs?.fields ?? []

		expect(definition.title).to.equal("Adversarial Review Inputs")
		expect(definition.pages.collect_inputs?.prompt).to.equal(
			"Provide the review material needed to begin this workflow. Supply at least one review target. If you also have a supporting spec or story file, include it as `spec_file`.",
		)
		expect(
			fields.map((field) => ({
				key: field.key,
				label: field.label,
				help: field.help,
				required: field.required,
				oneOfGroupId: field.oneOfGroupId,
				valueSchemaType: field.valueSchema.type,
			})),
		).to.deep.equal([
			{
				key: "spec_file",
				label: "Spec or Story File",
				help: "Optional path to a story, spec, or requirements file that defines expected behavior.",
				required: true,
				oneOfGroupId: "workflow_start_one_of",
				valueSchemaType: "string",
			},
			{
				key: "review_input",
				label: "Review Input File",
				help: "Path to an existing review-input markdown file for this review.",
				required: true,
				oneOfGroupId: "workflow_start_one_of",
				valueSchemaType: "string",
			},
			{
				key: "diff_output",
				label: "Review Diff File",
				help: "Path to an existing review-input diff file for this review.",
				required: false,
				oneOfGroupId: "workflow_start_one_of",
				valueSchemaType: "string",
			},
		])
	})

	it("serializes workflow-start placeholder submissions into set_workflow_placeholders input", () => {
		const resolver = getWorkflowFormResolverDefinition(PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID)
		const outcome = resolver.buildToolExecutionRequest(
			{
				sessionId: "session-2",
				resolverId: resolver.id,
				triggerSource: "slash_command",
				owner: {
					kind: "slash_command",
					workflowName: "review-adversarial-general.md",
					stepNumber: 1,
				},
				phase: "collect_inputs",
				initialPhase: "collect_inputs",
				values: {},
				context: {
					workflowName: "review-adversarial-general.md",
					workflowStartRequirements: {
						requiredFieldKeys: ["review_input"],
						optionalFieldKeys: ["spec_file"],
						oneOfRequirement: {
							id: "workflow_start_one_of",
							fieldKeys: ["diff_output", "spec_file"],
						},
					},
				},
			},
			{
				review_input: { rawValue: " /tmp/review.md " },
				diff_output: { rawValue: "   " },
				spec_file: { rawValue: "/tmp/spec.md" },
			},
		)

		expect(outcome.toolName).to.equal("set_workflow_placeholders")
		expect(outcome.toolInput).to.deep.equal({
			values: {
				review_input: "/tmp/review.md",
				spec_file: "/tmp/spec.md",
			},
		})
		expect(outcome.toolParams.values).to.equal(
			JSON.stringify({
				review_input: "/tmp/review.md",
				spec_file: "/tmp/spec.md",
			}),
		)
	})

	it("treats stored workflow-start placeholder results as success", () => {
		const resolver = getWorkflowFormResolverDefinition(PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID)
		const result = resolver.evaluateToolExecutionResult(
			{
				sessionId: "session-2",
				resolverId: resolver.id,
				triggerSource: "slash_command",
				owner: {
					kind: "slash_command",
					workflowName: "review-adversarial-general.md",
					stepNumber: 1,
				},
				phase: "collect_inputs",
				initialPhase: "collect_inputs",
				values: {},
			},
			{
				toolResultText: "Stored 1 workflow placeholder: review_input.",
			},
		)

		expect(result).to.deep.equal({ succeeded: true })
	})

	it("treats the empty-values set_workflow_placeholders error as failure", () => {
		const resolver = getWorkflowFormResolverDefinition(PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID)
		const result = resolver.evaluateToolExecutionResult(
			{
				sessionId: "session-2",
				resolverId: resolver.id,
				triggerSource: "slash_command",
				owner: {
					kind: "slash_command",
					workflowName: "review-adversarial-general.md",
					stepNumber: 1,
				},
				phase: "collect_inputs",
				initialPhase: "collect_inputs",
				values: {},
			},
			{
				toolResultText: "Error: Missing required parameter 'values'. Provide at least one placeholder value to store.",
			},
		)

		expect(result.succeeded).to.equal(false)
	})

	it("returns the canonical Phase 1 definition pages", () => {
		const resolver = getWorkflowFormResolverDefinition(CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID)
		const definition = resolver.buildDefinition({
			sessionId: "session-3",
			resolverId: resolver.id,
			triggerSource: "deterministic_workflow_progression",
			owner: {
				kind: "placeholder_workflow_step",
				workflowName: "code-review.md",
				stepNumber: 3,
			},
			phase: "collect_inputs",
			initialPhase: "confirm",
			values: {},
		})

		expect(definition.title).to.equal("Review Diff Artifact")
		expect(Object.keys(definition.pages)).to.deep.equal(["confirm", "select_source", "collect_inputs", "retry_error"])
	})

	it("uses the canonical workflow-start definition success and failure copy", () => {
		const resolver = getWorkflowFormResolverDefinition(PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID)
		const session = {
			sessionId: "session-3",
			resolverId: resolver.id,
			triggerSource: "slash_command" as const,
			owner: {
				kind: "slash_command" as const,
				workflowName: "review-adversarial-general.md",
				stepNumber: 1,
			},
			phase: "collect_inputs" as const,
			initialPhase: "collect_inputs" as const,
			values: {},
			context: {
				workflowName: "review-adversarial-general.md",
				workflowStartRequirements: {
					requiredFieldKeys: ["review_input"],
					optionalFieldKeys: [],
				},
			},
		}

		expect(resolver.buildDefinition(session).successMessage).to.equal("Workflow start inputs were stored.")
		expect(resolver.buildToolExecutionFailureFallbackMessage(session)).to.equal(
			"The workflow form could not store the workflow start inputs. Review the values and try again.",
		)
	})

	it("throws for an unknown resolver id", () => {
		expect(() => getWorkflowFormResolverDefinition("unknown_resolver")).to.throw(
			"Unknown workflow form resolver: unknown_resolver",
		)
	})
})
