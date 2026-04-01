import fs from "fs/promises"
import path from "path"
import { getPlaceholderWorkflowValueMap } from "@/core/workflows/placeholder-workflow-rendering"
import { getActivePlaceholderWorkflowStepDetails } from "@/core/workflows/placeholder-workflow-step-details"
import { FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL } from "@/shared/focus-chain-utils"
import {
	type ActivePlaceholderWorkflowDeterministicState,
	type DeterministicPlaceholderWorkflowName,
	TaskState,
} from "../TaskState"
import { evaluateFocusChainChecklistUpdate } from "./file-utils"
import {
	fileExistsForPlaceholderWorkflowWriteProof,
	taskStateHasPlaceholderWorkflowWriteProof,
} from "./placeholderWorkflowWriteProofs"

export interface DeterministicPlaceholderToolContext {
	toolName: string
	toolParams?: Record<string, unknown>
	toolResult?: unknown
	toolWasExecuted: boolean
}

export interface DeterministicPlaceholderProgressionResult {
	checklist: string
	placeholderValuesChanged: boolean
	deterministicStateChanged: boolean
	noticesAdded: boolean
}

export function isDeterministicPlaceholderWorkflowSupported(
	workflowName?: string,
): workflowName is DeterministicPlaceholderWorkflowName {
	return (
		workflowName === "code-review.md" ||
		workflowName === "dev-story.md" ||
		workflowName === "review-adversarial-general.md" ||
		workflowName === "blind-review.md" ||
		workflowName === "review-edge-case-hunter.md"
	)
}

type DeterministicStepEvaluationResult = {
	completed: boolean
	reason?: string
	placeholderValuesChanged?: boolean
	deterministicStateChanged?: boolean
}

function getMergedPlaceholderValues(taskState: TaskState): Record<string, string> {
	return (
		getPlaceholderWorkflowValueMap(
			taskState.activePlaceholderWorkflowStableValues,
			taskState.activePlaceholderWorkflowValues,
		) ?? {}
	)
}

function resolveArtifactPlaceholderPath(placeholders: Record<string, string>, placeholderPath: string): string {
	if (path.isAbsolute(placeholderPath)) {
		return placeholderPath
	}

	const workflowCwd = placeholders.cwd?.trim() || placeholders.project_root?.trim() || placeholders["project-root"]?.trim()
	if (!workflowCwd) {
		return placeholderPath
	}

	return path.resolve(workflowCwd, placeholderPath)
}

async function readFileIfExists(filePath: string): Promise<string | undefined> {
	try {
		return await fs.readFile(filePath, "utf8")
	} catch {
		return undefined
	}
}

function hasTopLevelStatusValue(fileText: string, allowedValues: string[]): boolean {
	const statusMatch = /^Status:\s*(.+)\s*$/m.exec(fileText)
	if (!statusMatch) {
		return false
	}

	return allowedValues.includes(statusMatch[1].trim())
}

function extractMarkdownSection(fileText: string, heading: string): string | undefined {
	const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	const headingRegex = new RegExp(`^${escapedHeading}\\s*$`, "m")
	const headingMatch = headingRegex.exec(fileText)
	if (!headingMatch) {
		return undefined
	}

	const sectionStart = headingMatch.index + headingMatch[0].length
	const remainingText = fileText.slice(sectionStart)
	const nextHeadingMatch = /^##\s+/m.exec(remainingText)
	const sectionEnd = nextHeadingMatch ? sectionStart + nextHeadingMatch.index : fileText.length
	return fileText.slice(sectionStart, sectionEnd).trim()
}

function sectionHasNoUncheckedChecklistItems(sectionText: string): boolean {
	return !/^\s*-\s*\[\s\]\s+/m.test(sectionText)
}

function resolveOutputFolderFile(placeholders: Record<string, string>, fileName: string): string | undefined {
	const outputFolder = placeholders.output_folder?.trim()
	if (!outputFolder) {
		return undefined
	}

	return path.join(outputFolder, fileName)
}

function didSuccessfulAttemptCompletionOccur(toolContext?: DeterministicPlaceholderToolContext): boolean {
	return toolContext?.toolName === "attempt_completion" && toolContext.toolWasExecuted === true
}

function getCodeReviewFallbackPromptPath(
	placeholders: Record<string, string>,
	layer: "blind_review" | "edge_case_hunter",
): string | undefined {
	const fileName = layer === "blind_review" ? "blind-review.md" : "review-edge-case-hunter.md"
	return resolveOutputFolderFile(placeholders, fileName)
}

function cloneDeterministicState(taskState: TaskState): ActivePlaceholderWorkflowDeterministicState {
	return {
		codeReview: taskState.activePlaceholderWorkflowDeterministicState?.codeReview
			? {
					completedReviewLayers: {
						...taskState.activePlaceholderWorkflowDeterministicState.codeReview.completedReviewLayers,
					},
				}
			: undefined,
	}
}

async function resolveTaskWrittenPlaceholderArtifactPath(args: {
	taskState: TaskState
	placeholders: Record<string, string>
	placeholderKey: "review_input" | "diff_output"
}): Promise<string | undefined> {
	const placeholderPath = args.placeholders[args.placeholderKey]?.trim()
	if (!placeholderPath) {
		return undefined
	}

	const resolvedPath = resolveArtifactPlaceholderPath(args.placeholders, placeholderPath)
	return taskStateHasPlaceholderWorkflowWriteProof(args.taskState, resolvedPath) &&
		(await fileExistsForPlaceholderWorkflowWriteProof(resolvedPath))
		? resolvedPath
		: undefined
}

async function evaluateCodeReviewStep(args: {
	taskState: TaskState
	stepNumber: number
	toolContext?: DeterministicPlaceholderToolContext
}): Promise<DeterministicStepEvaluationResult> {
	const placeholders = getMergedPlaceholderValues(args.taskState)

	switch (args.stepNumber) {
		case 1: {
			const specFile = placeholders.spec_file?.trim()
			if (!specFile) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "spec_file is present.",
			}
		}
		case 2: {
			const diffOutputPath = await resolveTaskWrittenPlaceholderArtifactPath({
				taskState: args.taskState,
				placeholders,
				placeholderKey: "diff_output",
			})
			if (!diffOutputPath) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "diff_output was written during this task and the artifact still exists.",
			}
		}
		case 3: {
			const reviewInputPath = await resolveTaskWrittenPlaceholderArtifactPath({
				taskState: args.taskState,
				placeholders,
				placeholderKey: "review_input",
			})
			if (!reviewInputPath) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "review_input was written during this task and the artifact still exists.",
			}
		}
		case 4: {
			const reviewInputPath = await resolveTaskWrittenPlaceholderArtifactPath({
				taskState: args.taskState,
				placeholders,
				placeholderKey: "review_input",
			})
			const diffOutputPath = await resolveTaskWrittenPlaceholderArtifactPath({
				taskState: args.taskState,
				placeholders,
				placeholderKey: "diff_output",
			})

			const nextReviewMode =
				reviewInputPath && diffOutputPath ? "full" : reviewInputPath ? "file-scope" : diffOutputPath ? "diff" : undefined
			if (!nextReviewMode) {
				return { completed: false }
			}

			const existingPlaceholderValues = args.taskState.activePlaceholderWorkflowValues ?? {}
			const placeholderValuesChanged = existingPlaceholderValues.review_mode !== nextReviewMode
			if (placeholderValuesChanged) {
				args.taskState.activePlaceholderWorkflowValues = {
					...existingPlaceholderValues,
					review_mode: nextReviewMode,
				}
			}

			return {
				completed: true,
				reason: "review_mode was derived deterministically from current-task review artifacts.",
				placeholderValuesChanged,
			}
		}
		case 5: {
			const nextDeterministicState = cloneDeterministicState(args.taskState)
			const completedReviewLayers = nextDeterministicState.codeReview?.completedReviewLayers ?? {}
			let deterministicStateChanged = false

			for (const layer of ["blind_review", "edge_case_hunter"] as const) {
				if (completedReviewLayers[layer]) {
					continue
				}

				const fallbackPromptPath = getCodeReviewFallbackPromptPath(placeholders, layer)
				if (
					!fallbackPromptPath ||
					!taskStateHasPlaceholderWorkflowWriteProof(args.taskState, fallbackPromptPath) ||
					!(await fileExistsForPlaceholderWorkflowWriteProof(fallbackPromptPath))
				) {
					return { completed: false }
				}

				if (!nextDeterministicState.codeReview) {
					nextDeterministicState.codeReview = { completedReviewLayers: {} }
				}
				nextDeterministicState.codeReview.completedReviewLayers[layer] = "fallback_prompt"
				deterministicStateChanged = true
			}

			if (deterministicStateChanged) {
				args.taskState.activePlaceholderWorkflowDeterministicState = nextDeterministicState
			}

			return {
				completed: true,
				reason: "Every required review layer has a final report or a current-task fallback prompt artifact.",
				deterministicStateChanged,
			}
		}
		case 6: {
			const reviewInputPath = placeholders.review_input?.trim()
			if (!reviewInputPath) {
				return { completed: false }
			}

			const resolvedReviewInputPath = resolveArtifactPlaceholderPath(placeholders, reviewInputPath)
			if (
				!taskStateHasPlaceholderWorkflowWriteProof(args.taskState, resolvedReviewInputPath) ||
				!(await fileExistsForPlaceholderWorkflowWriteProof(resolvedReviewInputPath))
			) {
				return { completed: false }
			}

			const reviewInputText = await readFileIfExists(resolvedReviewInputPath)
			if (!reviewInputText || !hasTopLevelStatusValue(reviewInputText, ["ready-for-dev", "complete"])) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "review_input was updated during this task and now contains a terminal review status.",
			}
		}
		case 7: {
			if (!didSuccessfulAttemptCompletionOccur(args.toolContext)) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "attempt_completion was executed successfully for the final QA findings report.",
			}
		}
		default:
			return { completed: false }
	}
}

async function evaluateReviewAdversarialGeneralStep(args: {
	taskState: TaskState
	stepNumber: number
	toolContext?: DeterministicPlaceholderToolContext
}): Promise<DeterministicStepEvaluationResult> {
	const placeholders = getMergedPlaceholderValues(args.taskState)

	switch (args.stepNumber) {
		case 1: {
			const diffOutput = placeholders.diff_output?.trim()
			if (!diffOutput) {
				return { completed: false }
			}

			const resolvedDiffOutputPath = resolveArtifactPlaceholderPath(placeholders, diffOutput)
			if (!(await fileExistsForPlaceholderWorkflowWriteProof(resolvedDiffOutputPath))) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "diff_output resolves to an existing file path.",
			}
		}
		case 2: {
			const findingsArtifactPath = resolveOutputFolderFile(placeholders, "adversarial-review-findings.md")
			if (!findingsArtifactPath) {
				return { completed: false }
			}

			const resolvedFindingsArtifactPath = resolveArtifactPlaceholderPath(placeholders, findingsArtifactPath)
			if (
				!taskStateHasPlaceholderWorkflowWriteProof(args.taskState, resolvedFindingsArtifactPath) ||
				!(await fileExistsForPlaceholderWorkflowWriteProof(resolvedFindingsArtifactPath))
			) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "adversarial-review-findings.md was written during this task and the artifact still exists.",
			}
		}
		case 3: {
			if (!didSuccessfulAttemptCompletionOccur(args.toolContext)) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "attempt_completion was executed successfully to deliver adversarial findings.",
			}
		}
		default:
			return { completed: false }
	}
}

async function evaluateBlindReviewStep(args: {
	taskState: TaskState
	stepNumber: number
	toolContext?: DeterministicPlaceholderToolContext
}): Promise<DeterministicStepEvaluationResult> {
	const placeholders = getMergedPlaceholderValues(args.taskState)

	switch (args.stepNumber) {
		case 1: {
			const diffOutput = placeholders.diff_output?.trim()
			if (!diffOutput) {
				return { completed: false }
			}

			const resolvedDiffOutputPath = resolveArtifactPlaceholderPath(placeholders, diffOutput)
			if (!(await fileExistsForPlaceholderWorkflowWriteProof(resolvedDiffOutputPath))) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "diff_output resolves to an existing file path.",
			}
		}
		case 2: {
			const findingsArtifactPath = resolveOutputFolderFile(placeholders, "adversarial-review-findings.md")
			if (!findingsArtifactPath) {
				return { completed: false }
			}

			const resolvedFindingsArtifactPath = resolveArtifactPlaceholderPath(placeholders, findingsArtifactPath)
			if (
				!taskStateHasPlaceholderWorkflowWriteProof(args.taskState, resolvedFindingsArtifactPath) ||
				!(await fileExistsForPlaceholderWorkflowWriteProof(resolvedFindingsArtifactPath))
			) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "adversarial-review-findings.md was written during this task and the artifact still exists.",
			}
		}
		case 3: {
			if (!didSuccessfulAttemptCompletionOccur(args.toolContext)) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "attempt_completion was executed successfully to deliver blind-review findings.",
			}
		}
		default:
			return { completed: false }
	}
}

async function evaluateEdgeCaseHunterStep(args: {
	taskState: TaskState
	stepNumber: number
	toolContext?: DeterministicPlaceholderToolContext
}): Promise<DeterministicStepEvaluationResult> {
	const placeholders = getMergedPlaceholderValues(args.taskState)

	switch (args.stepNumber) {
		case 1: {
			const reviewInput = placeholders.review_input?.trim()
			const diffOutput = placeholders.diff_output?.trim()
			if (!reviewInput || !diffOutput) {
				return { completed: false }
			}

			const resolvedReviewInputPath = resolveArtifactPlaceholderPath(placeholders, reviewInput)
			const resolvedDiffOutputPath = resolveArtifactPlaceholderPath(placeholders, diffOutput)
			if (
				!(await fileExistsForPlaceholderWorkflowWriteProof(resolvedReviewInputPath)) ||
				!(await fileExistsForPlaceholderWorkflowWriteProof(resolvedDiffOutputPath))
			) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "review_input and diff_output resolve to existing file paths.",
			}
		}
		case 2: {
			const findingsArtifactPath = resolveOutputFolderFile(placeholders, "edge-case-review-findings.md")
			if (!findingsArtifactPath) {
				return { completed: false }
			}

			const resolvedFindingsArtifactPath = resolveArtifactPlaceholderPath(placeholders, findingsArtifactPath)
			if (
				!taskStateHasPlaceholderWorkflowWriteProof(args.taskState, resolvedFindingsArtifactPath) ||
				!(await fileExistsForPlaceholderWorkflowWriteProof(resolvedFindingsArtifactPath))
			) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "edge-case-review-findings.md was written during this task and the artifact still exists.",
			}
		}
		case 3: {
			if (!didSuccessfulAttemptCompletionOccur(args.toolContext)) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "attempt_completion was executed successfully to deliver edge-case findings.",
			}
		}
		default:
			return { completed: false }
	}
}

async function evaluateDevStoryStep(args: {
	taskState: TaskState
	stepNumber: number
	toolContext?: DeterministicPlaceholderToolContext
}): Promise<DeterministicStepEvaluationResult> {
	const placeholders = getMergedPlaceholderValues(args.taskState)
	const storyPath = placeholders.story_path?.trim()

	switch (args.stepNumber) {
		case 1: {
			if (!storyPath) {
				return { completed: false }
			}

			try {
				await fs.access(storyPath)
			} catch {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "story_path points to an existing story file.",
			}
		}
		case 2: {
			if (!storyPath) {
				return { completed: false }
			}

			const storyText = await readFileIfExists(storyPath)
			if (!storyText) {
				return { completed: false }
			}

			const tasksSection = extractMarkdownSection(storyText, "## Tasks / Subtasks")
			if (!tasksSection) {
				return { completed: false }
			}

			if (!/^\s*-\s*\[[ xX]\]\s+/m.test(tasksSection)) {
				return { completed: false }
			}

			if (!sectionHasNoUncheckedChecklistItems(tasksSection)) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "The ## Tasks / Subtasks section contains no unchecked items.",
			}
		}
		case 3: {
			if (!storyPath) {
				return { completed: false }
			}

			try {
				const stats = await fs.stat(storyPath)
				if (!stats.isFile() || stats.mtimeMs < args.taskState.taskStartTimeMs) {
					return { completed: false }
				}
			} catch {
				return { completed: false }
			}

			const storyText = await readFileIfExists(storyPath)
			if (!storyText || !hasTopLevelStatusValue(storyText, ["review"])) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "The story file was updated and now contains Status: review.",
			}
		}
		case 4: {
			if (!didSuccessfulAttemptCompletionOccur(args.toolContext)) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "attempt_completion was executed successfully for the final closeout report.",
			}
		}
		default:
			return { completed: false }
	}
}

async function evaluateDeterministicStep(args: {
	taskState: TaskState
	workflowName: DeterministicPlaceholderWorkflowName
	stepNumber: number
	toolContext?: DeterministicPlaceholderToolContext
}): Promise<DeterministicStepEvaluationResult> {
	if (args.workflowName === "code-review.md") {
		return evaluateCodeReviewStep({
			taskState: args.taskState,
			stepNumber: args.stepNumber,
			toolContext: args.toolContext,
		})
	}

	if (args.workflowName === "dev-story.md") {
		return evaluateDevStoryStep({
			taskState: args.taskState,
			stepNumber: args.stepNumber,
			toolContext: args.toolContext,
		})
	}

	if (args.workflowName === "review-adversarial-general.md") {
		return evaluateReviewAdversarialGeneralStep({
			taskState: args.taskState,
			stepNumber: args.stepNumber,
			toolContext: args.toolContext,
		})
	}

	if (args.workflowName === "blind-review.md") {
		return evaluateBlindReviewStep({
			taskState: args.taskState,
			stepNumber: args.stepNumber,
			toolContext: args.toolContext,
		})
	}

	if (args.workflowName === "review-edge-case-hunter.md") {
		return evaluateEdgeCaseHunterStep({
			taskState: args.taskState,
			stepNumber: args.stepNumber,
			toolContext: args.toolContext,
		})
	}

	return { completed: false }
}

export async function applyDeterministicPlaceholderProgression(args: {
	taskState: TaskState
	checklistMarkdown: string
	toolContext?: DeterministicPlaceholderToolContext
}): Promise<DeterministicPlaceholderProgressionResult> {
	if (!args.taskState.activePlaceholderWorkflowSource) {
		return {
			checklist: args.checklistMarkdown,
			placeholderValuesChanged: false,
			deterministicStateChanged: false,
			noticesAdded: false,
		}
	}

	const activeStep = await getActivePlaceholderWorkflowStepDetails({
		checklistMarkdown: args.checklistMarkdown,
		source: args.taskState.activePlaceholderWorkflowSource,
		stablePlaceholderValues: args.taskState.activePlaceholderWorkflowStableValues,
		placeholderValues: args.taskState.activePlaceholderWorkflowValues,
	})
	if (!activeStep || !isDeterministicPlaceholderWorkflowSupported(activeStep.sourceName)) {
		return {
			checklist: args.checklistMarkdown,
			placeholderValuesChanged: false,
			deterministicStateChanged: false,
			noticesAdded: false,
		}
	}

	let checklist = args.checklistMarkdown
	let placeholderValuesChanged = false
	let deterministicStateChanged = false
	let noticesAdded = false

	while (true) {
		const stepDetails = await getActivePlaceholderWorkflowStepDetails({
			checklistMarkdown: checklist,
			source: args.taskState.activePlaceholderWorkflowSource,
			stablePlaceholderValues: args.taskState.activePlaceholderWorkflowStableValues,
			placeholderValues: args.taskState.activePlaceholderWorkflowValues,
		})
		if (!stepDetails || !isDeterministicPlaceholderWorkflowSupported(stepDetails.sourceName) || !stepDetails.stepNumber) {
			break
		}

		const evaluation = await evaluateDeterministicStep({
			taskState: args.taskState,
			workflowName: stepDetails.sourceName,
			stepNumber: stepDetails.stepNumber,
			toolContext: args.toolContext,
		})
		if (!evaluation.completed || !evaluation.reason) {
			break
		}

		placeholderValuesChanged = placeholderValuesChanged || !!evaluation.placeholderValuesChanged
		deterministicStateChanged = deterministicStateChanged || !!evaluation.deterministicStateChanged
		args.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices.push({
			workflowName: stepDetails.sourceName,
			stepNumber: stepDetails.stepNumber,
			checklistLabel: stepDetails.checklistLabel,
			reason: evaluation.reason,
		})
		noticesAdded = true

		const nextChecklistResult = evaluateFocusChainChecklistUpdate(checklist, FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL)
		checklist = nextChecklistResult.checklist ?? checklist
	}

	return {
		checklist,
		placeholderValuesChanged,
		deterministicStateChanged,
		noticesAdded,
	}
}
