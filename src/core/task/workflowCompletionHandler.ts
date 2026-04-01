import type { ClineDefaultTool } from "@shared/tools"

export type WorkflowCompletionHandlerResult = "no_op" | "tool_completed" | "tool_failed"

export interface WorkflowCompletionHandlerRegistryEntry {
	toolName: ClineDefaultTool
}

export const workflowCompletionHandlerRegistry: Record<string, WorkflowCompletionHandlerRegistryEntry> = {}

export interface WorkflowCompletionHandlerArgs {
	completedWorkflowId: string
	invokeInternalTool: (toolName: ClineDefaultTool) => Promise<boolean>
}

export async function workflowCompletionHandler(args: WorkflowCompletionHandlerArgs): Promise<WorkflowCompletionHandlerResult> {
	const entry = workflowCompletionHandlerRegistry[args.completedWorkflowId]
	if (!entry) {
		return "no_op"
	}

	try {
		const succeeded = await args.invokeInternalTool(entry.toolName)
		return succeeded ? "tool_completed" : "tool_failed"
	} catch {
		return "tool_failed"
	}
}
