import fs from "fs/promises"
import path from "path"
import type { PersistentSlashCommandAction } from "@/core/slash-commands"
import { getPlaceholderWorkflowValueMap } from "@/core/workflows/placeholder-workflow-rendering"
import { getActivePlaceholderWorkflowStepDetails } from "@/core/workflows/placeholder-workflow-step-details"
import {
	fileExistsForPlaceholderWorkflowWriteProof,
	taskStateHasPlaceholderWorkflowWriteProof,
} from "../focus-chain/placeholderWorkflowWriteProofs"
import type { TaskState } from "../TaskState"
import type { WorkflowFormSessionContext, WorkflowFormSessionOwner, WorkflowFormTriggerSource } from "./types"
import {
	BRAINSTORMING_STEP_3_CAPTURE_TOPIC_RESOLVER_ID,
	CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID,
	PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID,
} from "./WorkflowFormRegistry"
import { parseWorkflowStartRequirements } from "./workflowStartRequirements"

export interface WorkflowFormWorkflowStepTriggerDefinition {
	workflowName: string
	stepNumber: number
	resolverId: string
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

export interface WorkflowFormStartCandidate {
	resolverId: string
	triggerSource: WorkflowFormTriggerSource
	owner: WorkflowFormSessionOwner
	initialPhase: "collect_inputs"
	context: WorkflowFormSessionContext
	activeStep: {
		stepNumber: number
		stepTitle: string
	}
}

export async function resolveWorkflowFormSlashCommandStartCandidate(args: {
	cwd: string
	taskState: Pick<
		TaskState,
		| "activePlaceholderWorkflowSource"
		| "currentFocusChainChecklist"
		| "activePlaceholderWorkflowStableValues"
		| "activePlaceholderWorkflowValues"
	>
	currentTurnSlashCommandAction?: PersistentSlashCommandAction
}): Promise<WorkflowFormStartCandidate | undefined> {
	if (args.currentTurnSlashCommandAction?.type !== "activate_placeholder_workflow") {
		return undefined
	}

	if (!args.taskState.activePlaceholderWorkflowSource || !args.taskState.currentFocusChainChecklist) {
		return undefined
	}

	const activeStep = await getActivePlaceholderWorkflowStepDetails({
		checklistMarkdown: args.taskState.currentFocusChainChecklist,
		source: args.taskState.activePlaceholderWorkflowSource,
		stablePlaceholderValues: args.taskState.activePlaceholderWorkflowStableValues,
		placeholderValues: args.taskState.activePlaceholderWorkflowValues,
	})
	if (activeStep?.stepNumber !== 1) {
		return undefined
	}

	const parsedRequirements = parseWorkflowStartRequirements(activeStep.rawDetails)
	if (!parsedRequirements) {
		return undefined
	}

	return {
		resolverId: PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID,
		triggerSource: "slash_command",
		owner: {
			kind: "slash_command",
			workflowName: args.taskState.activePlaceholderWorkflowSource.name,
			stepNumber: 1,
		},
		initialPhase: "collect_inputs",
		context: {
			workflowName: args.taskState.activePlaceholderWorkflowSource.name,
			workflowStartRequirements: parsedRequirements,
		},
		activeStep: {
			stepNumber: 1,
			stepTitle: activeStep.stepTitle,
		},
	}
}

async function shouldInterceptUntilCurrentTaskArtifactExists(args: {
	cwd: string
	taskState: Pick<
		TaskState,
		| "activePlaceholderWorkflowStableValues"
		| "activePlaceholderWorkflowValues"
		| "activePlaceholderWorkflowTaskWriteProofPaths"
	>
	placeholderKey: "diff_output" | "review_input" | "output_file"
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

async function shouldInterceptUntilBrainstormingTopicExists(args: {
	cwd: string
	taskState: Pick<
		TaskState,
		| "activePlaceholderWorkflowStableValues"
		| "activePlaceholderWorkflowValues"
		| "activePlaceholderWorkflowTaskWriteProofPaths"
	>
}): Promise<boolean> {
	const placeholders = getPlaceholderWorkflowValueMap(
		args.taskState.activePlaceholderWorkflowStableValues,
		args.taskState.activePlaceholderWorkflowValues,
	)
	const artifactPath = placeholders?.output_file?.trim()
	if (!artifactPath) {
		return true
	}

	const resolvedArtifactPath = path.isAbsolute(artifactPath) ? artifactPath : path.resolve(args.cwd, artifactPath)
	if (!taskStateHasPlaceholderWorkflowWriteProof(args.taskState, resolvedArtifactPath)) {
		return true
	}

	if (!(await fileExistsForPlaceholderWorkflowWriteProof(resolvedArtifactPath))) {
		return true
	}

	const content = await fs.readFile(resolvedArtifactPath, "utf8")
	const topicMatch = content.match(/^## Topic\s*\n([\s\S]*?)(?=^##\s|$)/m)
	const topicBody = topicMatch?.[1] ?? ""

	return topicBody.trim().length === 0
}

export const workflowFormWorkflowStepTriggerRegistry: WorkflowFormWorkflowStepTriggerDefinition[] = [
	{
		workflowName: "code-review.md",
		stepNumber: 2,
		resolverId: CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID,
		async shouldIntercept({ cwd, taskState }) {
			return shouldInterceptUntilCurrentTaskArtifactExists({ cwd, taskState, placeholderKey: "diff_output" })
		},
	},
	{
		workflowName: "brainstorming.md",
		stepNumber: 3,
		resolverId: BRAINSTORMING_STEP_3_CAPTURE_TOPIC_RESOLVER_ID,
		async shouldIntercept({ cwd, taskState }) {
			return shouldInterceptUntilBrainstormingTopicExists({ cwd, taskState })
		},
	},
]

export function getWorkflowFormWorkflowStepTriggerDefinition(workflowName: string, stepNumber: number) {
	return workflowFormWorkflowStepTriggerRegistry.find(
		(trigger) => trigger.workflowName === workflowName && trigger.stepNumber === stepNumber,
	)
}
