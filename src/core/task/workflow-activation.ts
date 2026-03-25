import {
	type ActivePlaceholderWorkflowSource,
	buildActivePlaceholderWorkflowSource,
	getRenderedActivePlaceholderWorkflowSourceContents,
	isSameActivePlaceholderWorkflowSource,
} from "@core/workflows/placeholder-workflow-step-details"
import type { LoadedResolvedWorkflowContent } from "@core/workflows/resolution/loadResolvedWorkflowContent"
import { loadResolvedWorkflowContent } from "@core/workflows/resolution/loadResolvedWorkflowContent"
import type { ResolvedWorkflowEntry } from "@core/workflows/resolution/resolveAvailableWorkflows"
import { buildWorkflowStablePlaceholders } from "@core/workflows/workflow-placeholders"
import { startOrResumeManagedWorkflowRun } from "./managed-workflows/ManagedWorkflowController"
import type { ManagedWorkflowRunState } from "./managed-workflows/types"
import type { TaskState } from "./TaskState"

export interface ManagedWorkflowActivationResult {
	run: ManagedWorkflowRunState
	resumed: boolean
}

export interface PlaceholderWorkflowActivationResult {
	workflowContent: Extract<LoadedResolvedWorkflowContent, { kind: "instructions" }>
	workflowSource: ActivePlaceholderWorkflowSource
	renderedWorkflowContents: string
	workflowChanged: boolean
}

export async function activateManagedWorkflowInTaskState(args: {
	cwd: string
	taskState: TaskState
	workflowId: string
	slashCommand?: string
}): Promise<ManagedWorkflowActivationResult> {
	const { run, resumed } = await startOrResumeManagedWorkflowRun(
		args.cwd,
		args.workflowId,
		args.taskState.managedWorkflowRun,
		args.slashCommand,
	)

	args.taskState.managedWorkflowRun = run
	args.taskState.activeWorkflowId = run.workflowId
	args.taskState.activePlaceholderWorkflowId = undefined
	args.taskState.activePlaceholderWorkflowSource = undefined
	args.taskState.activePlaceholderWorkflowStableValues = undefined
	args.taskState.activePlaceholderWorkflowValues = undefined
	args.taskState.activeWorkflowJustStarted = !resumed

	return { run, resumed }
}

export async function activatePlaceholderWorkflowInTaskState(args: {
	cwd: string
	taskState: TaskState
	workflow: ResolvedWorkflowEntry
	clearActiveWorkflowId: boolean
}): Promise<PlaceholderWorkflowActivationResult | undefined> {
	const workflowContent = await loadResolvedWorkflowContent(args.workflow)
	if (!workflowContent || workflowContent.kind !== "instructions") {
		return undefined
	}

	const workflowSource = await buildActivePlaceholderWorkflowSource(args.workflow, workflowContent.contents, args.cwd)
	if (!workflowSource) {
		return undefined
	}

	const workflowChanged =
		args.taskState.activePlaceholderWorkflowId !== args.workflow.name ||
		!isSameActivePlaceholderWorkflowSource(args.taskState.activePlaceholderWorkflowSource, workflowSource)
	const stablePlaceholderValues = await buildWorkflowStablePlaceholders({
		cwd: args.cwd,
		configPath: workflowSource.configPath,
	})
	const placeholderValues = workflowChanged ? undefined : args.taskState.activePlaceholderWorkflowValues
	const renderedWorkflowContents = await getRenderedActivePlaceholderWorkflowSourceContents({
		source: workflowSource,
		stablePlaceholderValues,
		placeholderValues,
	})

	if (args.clearActiveWorkflowId) {
		args.taskState.activeWorkflowId = undefined
	}
	args.taskState.activePlaceholderWorkflowId = args.workflow.name
	args.taskState.activePlaceholderWorkflowSource = workflowSource
	args.taskState.activePlaceholderWorkflowStableValues = stablePlaceholderValues
	args.taskState.activePlaceholderWorkflowValues = placeholderValues
	args.taskState.activeWorkflowJustStarted = true

	return {
		workflowContent,
		workflowSource,
		renderedWorkflowContents,
		workflowChanged,
	}
}

export async function renderActivePlaceholderWorkflowReminder(taskState: {
	activePlaceholderWorkflowSource?: ActivePlaceholderWorkflowSource
	activePlaceholderWorkflowStableValues?: Record<string, string>
	activePlaceholderWorkflowValues?: Record<string, string>
}): Promise<string | undefined> {
	if (!taskState.activePlaceholderWorkflowSource) {
		return undefined
	}

	return await getRenderedActivePlaceholderWorkflowSourceContents({
		source: taskState.activePlaceholderWorkflowSource,
		stablePlaceholderValues: taskState.activePlaceholderWorkflowStableValues,
		placeholderValues: taskState.activePlaceholderWorkflowValues,
	})
}
