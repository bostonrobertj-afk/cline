import type { ClineDefaultTool } from "@shared/tools"

import { parseFocusChainListCounts } from "./focus-chain/utils"
import { type WorkflowCompletionHandlerResult, workflowCompletionHandler } from "./workflowCompletionHandler"

export interface WorkflowCompletionRunnerArgs {
	previousChecklist: string | null | undefined
	currentChecklist: string | null | undefined
	activePlaceholderWorkflowId: string | undefined
	noticeCountBefore: number
	noticeCountAfter: number
	invokeInternalTool: (toolName: ClineDefaultTool) => Promise<boolean>
}

export interface WorkflowCompletionRunnerCompletedResult {
	kind: "completed"
	completedWorkflowId: string
	handlerResult: WorkflowCompletionHandlerResult
	shouldTeardown: boolean
}

export type WorkflowCompletionRunnerResult = { kind: "no_completion" } | WorkflowCompletionRunnerCompletedResult

function checklistHasIncompleteStep(checklist: string | null | undefined): boolean {
	if (!checklist?.trim()) {
		return false
	}

	const { totalItems, completedItems } = parseFocusChainListCounts(checklist)
	return totalItems > 0 && completedItems < totalItems
}

function checklistIsFullyComplete(checklist: string | null | undefined): boolean {
	if (!checklist?.trim()) {
		return false
	}

	const { totalItems, completedItems } = parseFocusChainListCounts(checklist)
	return totalItems > 0 && completedItems === totalItems
}

export async function workflowCompletionRunner(args: WorkflowCompletionRunnerArgs): Promise<WorkflowCompletionRunnerResult> {
	if (!args.activePlaceholderWorkflowId) {
		return { kind: "no_completion" }
	}

	if (!checklistIsFullyComplete(args.currentChecklist)) {
		return { kind: "no_completion" }
	}

	const transitionedFromIncompleteToComplete = checklistHasIncompleteStep(args.previousChecklist)
	const noticesAdded = args.noticeCountAfter > args.noticeCountBefore

	if (!transitionedFromIncompleteToComplete && !noticesAdded) {
		return { kind: "no_completion" }
	}

	const handlerResult = await workflowCompletionHandler({
		completedWorkflowId: args.activePlaceholderWorkflowId,
		invokeInternalTool: args.invokeInternalTool,
	})

	return {
		kind: "completed",
		completedWorkflowId: args.activePlaceholderWorkflowId,
		handlerResult,
		shouldTeardown: handlerResult !== "tool_failed",
	}
}
