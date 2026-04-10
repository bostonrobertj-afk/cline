import path from "path"
import { getPlaceholderWorkflowValueMap } from "@/core/workflows/placeholder-workflow-rendering"
import {
	fileExistsForPlaceholderWorkflowWriteProof,
	taskStateHasPlaceholderWorkflowWriteProof,
} from "../focus-chain/placeholderWorkflowWriteProofs"
import type { TaskState } from "../TaskState"
import {
	CODE_REVIEW_STEP_3_REVIEW_INPUT_DEFINITION_ID,
	QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID,
	WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_DEFINITION_ID,
} from "./WorkflowStepResolutionRegistry"

export interface WorkflowStepResolutionTriggerDefinition {
	workflowName: string
	stepNumber: number
	definitionId: string
	shouldIntercept(args: {
		cwd: string
		taskState: Pick<
			TaskState,
			| "activePlaceholderWorkflowStableValues"
			| "activePlaceholderWorkflowValues"
			| "activePlaceholderWorkflowTaskWriteProofPaths"
		>
	}): Promise<boolean>
}

async function shouldInterceptUntilCurrentTaskArtifactExists(args: {
	cwd: string
	taskState: Pick<
		TaskState,
		| "activePlaceholderWorkflowStableValues"
		| "activePlaceholderWorkflowValues"
		| "activePlaceholderWorkflowTaskWriteProofPaths"
	>
	placeholderKey: "review_input" | "output_file"
}): Promise<boolean> {
	const placeholders = getPlaceholderWorkflowValueMap(
		args.taskState.activePlaceholderWorkflowStableValues,
		args.taskState.activePlaceholderWorkflowValues,
	)
	const artifactPath = placeholders?.[args.placeholderKey]?.trim()
	if (!artifactPath) {
		return true
	}

	const resolvedArtifactPath = path.isAbsolute(artifactPath) ? artifactPath : path.resolve(args.cwd, artifactPath)
	return !(
		taskStateHasPlaceholderWorkflowWriteProof(args.taskState, resolvedArtifactPath) &&
		(await fileExistsForPlaceholderWorkflowWriteProof(resolvedArtifactPath))
	)
}

export const workflowStepResolutionTriggerRegistry: WorkflowStepResolutionTriggerDefinition[] = [
	{
		workflowName: "code-review.md",
		stepNumber: 3,
		definitionId: CODE_REVIEW_STEP_3_REVIEW_INPUT_DEFINITION_ID,
		async shouldIntercept({ cwd, taskState }) {
			return shouldInterceptUntilCurrentTaskArtifactExists({ cwd, taskState, placeholderKey: "review_input" })
		},
	},
	{
		workflowName: "write-remediation-story.md",
		stepNumber: 2,
		definitionId: WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_DEFINITION_ID,
		async shouldIntercept({ cwd, taskState }) {
			return shouldInterceptUntilCurrentTaskArtifactExists({ cwd, taskState, placeholderKey: "review_input" })
		},
	},
	{
		workflowName: "quick-spec.md",
		stepNumber: 2,
		definitionId: QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID,
		async shouldIntercept({ cwd, taskState }) {
			return shouldInterceptUntilCurrentTaskArtifactExists({ cwd, taskState, placeholderKey: "output_file" })
		},
	},
]

export function getWorkflowStepResolutionTriggerDefinition(workflowName: string, stepNumber: number) {
	return workflowStepResolutionTriggerRegistry.find(
		(trigger) => trigger.workflowName === workflowName && trigger.stepNumber === stepNumber,
	)
}
