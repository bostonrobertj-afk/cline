import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineDefaultTool } from "@/shared/tools"
import {
	BRAINSTORMING_STEP_2_CREATE_SESSION_DEFINITION_ID,
	CODE_REVIEW_STEP_3_REVIEW_INPUT_DEFINITION_ID,
	getWorkflowStepResolutionDefinition,
	QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID,
	WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_DEFINITION_ID,
} from "../WorkflowStepResolutionRegistry"

function createSession(definitionId: string, workflowName: string, stepNumber: number) {
	return {
		sessionId: `session-${definitionId}`,
		definitionId,
		triggerSource: "deterministic_workflow_progression" as const,
		owner: {
			kind: "placeholder_workflow_step" as const,
			workflowName,
			stepNumber,
		},
		state: "pending" as const,
	}
}

describe("WorkflowStepResolutionRegistry", () => {
	it("returns the code-review step 3 review-input definition metadata by id", () => {
		const definition = getWorkflowStepResolutionDefinition(CODE_REVIEW_STEP_3_REVIEW_INPUT_DEFINITION_ID)

		expect(definition.id).to.equal("code_review_step_3_review_input")
		expect(definition.toolName).to.equal(ClineDefaultTool.BUILD_REVIEW_INPUT)
	})

	it("returns the write-remediation-story step 2 review-input definition metadata by id", () => {
		const definition = getWorkflowStepResolutionDefinition(WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_DEFINITION_ID)

		expect(definition.id).to.equal("write_remediation_story_step_2_review_input")
		expect(definition.toolName).to.equal(ClineDefaultTool.BUILD_REVIEW_INPUT)
	})

	it("returns the quick-spec step 2 tech-spec definition metadata by id", () => {
		const definition = getWorkflowStepResolutionDefinition(QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID)

		expect(definition.id).to.equal("quick_spec_step_2_build_tech_spec_document")
		expect(definition.toolName).to.equal(ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT)
	})

	it("returns the brainstorming step 2 create-session definition metadata by id", () => {
		const definition = getWorkflowStepResolutionDefinition(BRAINSTORMING_STEP_2_CREATE_SESSION_DEFINITION_ID)

		expect(definition.id).to.equal("brainstorming_step_2_create_session")
		expect(definition.toolName).to.equal(ClineDefaultTool.CREATE_BRAINSTORMING_SESSION)
	})

	it("treats the code-review step 3 tool result as success when the review-input artifact is persisted", () => {
		const definition = getWorkflowStepResolutionDefinition(CODE_REVIEW_STEP_3_REVIEW_INPUT_DEFINITION_ID)
		const evaluation = definition.evaluateToolExecutionResult(createSession(definition.id, "code-review.md", 3), {
			toolResultText: '{"persisted":true,"review_input_available":true}',
		})

		expect(evaluation).to.deep.equal({ succeeded: true })
	})

	it("treats the code-review step 3 diff mismatch as a fallback-to-agent failure", () => {
		const definition = getWorkflowStepResolutionDefinition(CODE_REVIEW_STEP_3_REVIEW_INPUT_DEFINITION_ID)
		const evaluation = definition.evaluateToolExecutionResult(createSession(definition.id, "code-review.md", 3), {
			toolResultText: '{"reason":"diff_output does not identify recent changes to the story file."}',
		})

		expect(evaluation).to.deep.equal({
			succeeded: false,
			errorMessage:
				"diff_output does not identify recent changes to the story file. Proceeding with AI generation of review_input.md using the fallback Step 3 instructions.",
			fallbackToAgent: true,
		})
	})

	it("treats the write-remediation-story step 2 tool result as success when the review-input artifact is persisted", () => {
		const definition = getWorkflowStepResolutionDefinition(WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_DEFINITION_ID)
		const evaluation = definition.evaluateToolExecutionResult(createSession(definition.id, "write-remediation-story.md", 2), {
			toolResultText: '{"persisted":true,"review_input_available":true}',
		})

		expect(evaluation).to.deep.equal({ succeeded: true })
	})

	it("treats the quick-spec step 2 tool result as success when the output file is persisted", () => {
		const definition = getWorkflowStepResolutionDefinition(QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID)
		const evaluation = definition.evaluateToolExecutionResult(createSession(definition.id, "quick-spec.md", 2), {
			toolResultText: '{"persisted":true,"output_file_available":true}',
		})

		expect(evaluation).to.deep.equal({ succeeded: true })
	})

	it("treats the brainstorming step 2 tool result as success when the initial session file is created", () => {
		const definition = getWorkflowStepResolutionDefinition(BRAINSTORMING_STEP_2_CREATE_SESSION_DEFINITION_ID)
		const evaluation = definition.evaluateToolExecutionResult(createSession(definition.id, "brainstorming.md", 2), {
			toolResultText: '{"persisted":true,"output_file_available":true,"created":true}',
		})

		expect(evaluation).to.deep.equal({ succeeded: true })
	})

	it("treats ordinary brainstorming step 2 tool failure text as a fallback-to-agent failure", () => {
		const definition = getWorkflowStepResolutionDefinition(BRAINSTORMING_STEP_2_CREATE_SESSION_DEFINITION_ID)
		const evaluation = definition.evaluateToolExecutionResult(createSession(definition.id, "brainstorming.md", 2), {
			toolResultText: "Error: session creation failed",
		})

		expect(evaluation).to.deep.equal({
			succeeded: false,
			errorMessage: "Error: session creation failed",
			fallbackToAgent: true,
		})
	})
})
