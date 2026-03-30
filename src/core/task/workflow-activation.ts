import {
	type ActivePlaceholderWorkflowSource,
	buildActivePlaceholderWorkflowSource,
	getRenderedActivePlaceholderWorkflowSourceContents,
	isSameActivePlaceholderWorkflowSource,
} from "@core/workflows/placeholder-workflow-step-details"
import type { LoadedResolvedWorkflowContent } from "@core/workflows/resolution/loadResolvedWorkflowContent"
import { loadResolvedWorkflowContent } from "@core/workflows/resolution/loadResolvedWorkflowContent"
import type { ResolvedWorkflowEntry } from "@core/workflows/resolution/resolveAvailableWorkflows"
import {
	buildWorkflowStablePlaceholders,
	findUnresolvedWorkflowPlaceholders,
	getCanonicalWorkflowConfigPath,
} from "@core/workflows/workflow-placeholders"
import fs from "fs/promises"
import { Logger } from "@/shared/services/Logger"
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
	args.taskState.activePlaceholderWorkflowDeterministicState = undefined
	args.taskState.activePlaceholderWorkflowTaskWriteProofPaths = []
	args.taskState.suppressedWorkflowFormResolverIds = []
	args.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = []
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
	})
	const canonicalConfigPath = getCanonicalWorkflowConfigPath(args.cwd)
	const canonicalConfigFound = await fs
		.access(canonicalConfigPath)
		.then(() => true)
		.catch(() => false)
	const placeholderValues = workflowChanged ? undefined : args.taskState.activePlaceholderWorkflowValues
	const renderedWorkflowContents = await getRenderedActivePlaceholderWorkflowSourceContents({
		source: workflowSource,
		stablePlaceholderValues,
		placeholderValues,
	})
	const unresolvedPlaceholders = findUnresolvedWorkflowPlaceholders(renderedWorkflowContents)
	Logger.info(
		`[WorkflowActivation] placeholder_workflow_stable_config ${JSON.stringify({
			workflowId: args.workflow.name,
			workflowSourceType: workflowSource.type,
			canonicalConfigPath,
			canonicalConfigFound,
			stablePlaceholderCount: Object.keys(stablePlaceholderValues).length,
			stablePlaceholdersLoadedFromConfig: canonicalConfigFound && Object.keys(stablePlaceholderValues).length > 4,
			hasOutputFolder: stablePlaceholderValues.output_folder !== undefined,
			hasCommunicationLanguage: stablePlaceholderValues.communication_language !== undefined,
			hasProjectName: stablePlaceholderValues.project_name !== undefined,
			loadedStableKeysSample: ["output_folder", "communication_language", "project_name"].filter(
				(key) => stablePlaceholderValues[key] !== undefined,
			),
			unresolvedPlaceholderCount: unresolvedPlaceholders.length,
		})}`,
	)

	if (args.clearActiveWorkflowId) {
		args.taskState.activeWorkflowId = undefined
	}
	args.taskState.activePlaceholderWorkflowId = args.workflow.name
	args.taskState.activePlaceholderWorkflowSource = workflowSource
	args.taskState.activePlaceholderWorkflowStableValues = stablePlaceholderValues
	args.taskState.activePlaceholderWorkflowValues = placeholderValues
	if (workflowChanged) {
		args.taskState.activePlaceholderWorkflowDeterministicState = undefined
		args.taskState.activePlaceholderWorkflowTaskWriteProofPaths = []
		args.taskState.suppressedWorkflowFormResolverIds = []
		args.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = []
	}
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

export async function buildActivePlaceholderWorkflowActivationInstructions(taskState: {
	activePlaceholderWorkflowSource?: ActivePlaceholderWorkflowSource
	activePlaceholderWorkflowStableValues?: Record<string, string>
	activePlaceholderWorkflowValues?: Record<string, string>
}): Promise<string | undefined> {
	const renderedWorkflowContents = await renderActivePlaceholderWorkflowReminder(taskState)
	if (!renderedWorkflowContents || !taskState.activePlaceholderWorkflowSource) {
		return undefined
	}
	const unresolvedPlaceholders = findUnresolvedWorkflowPlaceholders(renderedWorkflowContents)
	if (unresolvedPlaceholders.length > 0) {
		Logger.info(
			`[WorkflowActivation] unresolved placeholders remain in activation instructions for ${taskState.activePlaceholderWorkflowSource.name}: ${unresolvedPlaceholders.join(", ")}`,
		)
	}

	return `<explicit_instructions type="${taskState.activePlaceholderWorkflowSource.name}">\n${renderedWorkflowContents}\n</explicit_instructions>\n`
}
