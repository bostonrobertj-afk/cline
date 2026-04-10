import { formatResponse } from "@/core/prompts/responses"
import { ClineDefaultTool } from "@/shared/tools"
import type { WorkflowStepResolutionDefinition } from "./types"

export const CODE_REVIEW_STEP_3_REVIEW_INPUT_DEFINITION_ID = "code_review_step_3_review_input"
export const WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_DEFINITION_ID = "write_remediation_story_step_2_review_input"
export const QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID = "quick_spec_step_2_build_tech_spec_document"
export const BRAINSTORMING_STEP_2_CREATE_SESSION_DEFINITION_ID = "brainstorming_step_2_create_session"

const CODE_REVIEW_STEP_3_REVIEW_INPUT_DIFF_MISMATCH_MESSAGE =
	"diff_output does not identify recent changes to the story file. Proceeding with AI generation of review_input.md using the fallback Step 3 instructions."
const CODE_REVIEW_STEP_3_REVIEW_INPUT_FAILURE_MESSAGE =
	"The workflow form could not build the Step 3 review-input artifact from stored workflow inputs. The workflow will return to the Step 3 fallback instructions."
const WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_FAILURE_MESSAGE =
	"The workflow form could not build the Step 2 review-input artifact from stored workflow inputs. The workflow will return to the Step 2 fallback instructions."
const QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_FAILURE_MESSAGE =
	"The workflow form could not build the Step 2 tech-spec scaffold from stored workflow inputs. The workflow will return to the Step 2 fallback instructions."
const BRAINSTORMING_STEP_2_CREATE_SESSION_FAILURE_MESSAGE =
	"The workflow could not create the initial brainstorming session file automatically. The workflow will return to the Step 2 fallback instructions."

function buildDefaultStatusDefinition(title: string) {
	return {
		title,
		pendingLabel: "Preparing workflow documents",
		successLabel: "Workflow documents ready",
		failureLabel: "Automatic workflow preparation failed- falling back to manual LLM workflow preparation.",
	}
}

function parseWorkflowStepResolutionJsonToolResult(text?: string): Record<string, unknown> | undefined {
	if (!text) {
		return undefined
	}

	try {
		const parsed = JSON.parse(text)
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : undefined
	} catch {
		return undefined
	}
}

function isWorkflowStepResolutionFailureText(text?: string): boolean {
	const trimmed = text?.trim()
	if (!trimmed) {
		return true
	}

	return (
		trimmed === formatResponse.toolDenied() ||
		trimmed.startsWith("The tool execution failed with the following error:") ||
		trimmed.startsWith("Error:")
	)
}

export const workflowStepResolutionRegistry: Record<string, WorkflowStepResolutionDefinition> = {
	[CODE_REVIEW_STEP_3_REVIEW_INPUT_DEFINITION_ID]: {
		id: CODE_REVIEW_STEP_3_REVIEW_INPUT_DEFINITION_ID,
		toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
		buildStatusDefinition() {
			return buildDefaultStatusDefinition("Review Input Artifact")
		},
		buildToolExecutionRequest() {
			return {
				toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
				toolInput: {},
				toolParams: {},
			}
		},
		evaluateToolExecutionResult(_session, args) {
			const parsed = parseWorkflowStepResolutionJsonToolResult(args.toolResultText)
			if (parsed?.persisted === true && parsed?.review_input_available === true) {
				return { succeeded: true }
			}

			if (parsed?.reason === "diff_output does not identify recent changes to the story file.") {
				return {
					succeeded: false,
					errorMessage: CODE_REVIEW_STEP_3_REVIEW_INPUT_DIFF_MISMATCH_MESSAGE,
					fallbackToAgent: true,
				}
			}

			if (isWorkflowStepResolutionFailureText(args.toolResultText)) {
				return {
					succeeded: false,
					errorMessage: args.toolResultText?.trim() ?? CODE_REVIEW_STEP_3_REVIEW_INPUT_FAILURE_MESSAGE,
					fallbackToAgent: true,
				}
			}

			return {
				succeeded: false,
				errorMessage: CODE_REVIEW_STEP_3_REVIEW_INPUT_FAILURE_MESSAGE,
				fallbackToAgent: true,
			}
		},
	},
	[WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_DEFINITION_ID]: {
		id: WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_DEFINITION_ID,
		toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
		buildStatusDefinition() {
			return buildDefaultStatusDefinition("Review Input Artifact")
		},
		buildToolExecutionRequest() {
			return {
				toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
				toolInput: {},
				toolParams: {},
			}
		},
		evaluateToolExecutionResult(_session, args) {
			const parsed = parseWorkflowStepResolutionJsonToolResult(args.toolResultText)
			if (parsed?.persisted === true && parsed?.review_input_available === true) {
				return { succeeded: true }
			}

			if (parsed?.reason === "diff_output does not identify recent changes to the story file.") {
				return {
					succeeded: false,
					errorMessage: CODE_REVIEW_STEP_3_REVIEW_INPUT_DIFF_MISMATCH_MESSAGE,
					fallbackToAgent: true,
				}
			}

			if (isWorkflowStepResolutionFailureText(args.toolResultText)) {
				return {
					succeeded: false,
					errorMessage: args.toolResultText?.trim() ?? WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_FAILURE_MESSAGE,
					fallbackToAgent: true,
				}
			}

			return {
				succeeded: false,
				errorMessage: WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_FAILURE_MESSAGE,
				fallbackToAgent: true,
			}
		},
	},
	[QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID]: {
		id: QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID,
		toolName: ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT,
		buildStatusDefinition() {
			return buildDefaultStatusDefinition("Tech Spec Scaffold")
		},
		buildToolExecutionRequest() {
			return {
				toolName: ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT,
				toolInput: {},
				toolParams: {},
			}
		},
		evaluateToolExecutionResult(_session, args) {
			const parsed = parseWorkflowStepResolutionJsonToolResult(args.toolResultText)
			if (parsed?.persisted === true && parsed?.output_file_available === true) {
				return { succeeded: true }
			}

			if (isWorkflowStepResolutionFailureText(args.toolResultText)) {
				return {
					succeeded: false,
					errorMessage: args.toolResultText?.trim() ?? QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_FAILURE_MESSAGE,
					fallbackToAgent: true,
				}
			}

			return {
				succeeded: false,
				errorMessage: QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_FAILURE_MESSAGE,
				fallbackToAgent: true,
			}
		},
	},
	[BRAINSTORMING_STEP_2_CREATE_SESSION_DEFINITION_ID]: {
		id: BRAINSTORMING_STEP_2_CREATE_SESSION_DEFINITION_ID,
		toolName: ClineDefaultTool.CREATE_BRAINSTORMING_SESSION,
		buildStatusDefinition() {
			return buildDefaultStatusDefinition("Brainstorming Session File")
		},
		buildToolExecutionRequest() {
			return {
				toolName: ClineDefaultTool.CREATE_BRAINSTORMING_SESSION,
				toolInput: {},
				toolParams: {},
			}
		},
		evaluateToolExecutionResult(_session, args) {
			const parsed = parseWorkflowStepResolutionJsonToolResult(args.toolResultText)
			if (parsed?.persisted === true && parsed?.output_file_available === true && parsed?.created === true) {
				return { succeeded: true }
			}

			if (isWorkflowStepResolutionFailureText(args.toolResultText)) {
				return {
					succeeded: false,
					errorMessage: args.toolResultText?.trim() ?? BRAINSTORMING_STEP_2_CREATE_SESSION_FAILURE_MESSAGE,
					fallbackToAgent: true,
				}
			}

			return {
				succeeded: false,
				errorMessage: BRAINSTORMING_STEP_2_CREATE_SESSION_FAILURE_MESSAGE,
				fallbackToAgent: true,
			}
		},
	},
}

export function getWorkflowStepResolutionDefinition(id: string): WorkflowStepResolutionDefinition {
	const definition = workflowStepResolutionRegistry[id]
	if (!definition) {
		throw new Error(`Unknown workflow step resolution definition: ${id}`)
	}

	return definition
}
