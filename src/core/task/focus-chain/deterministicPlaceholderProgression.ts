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
	return workflowName === "code-review.md" || workflowName === "dev-story.md"
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

async function fileExistsAndIsFresh(filePath: string, taskStartTimeMs: number): Promise<boolean> {
	try {
		const stats = await fs.stat(filePath)
		return stats.isFile() && stats.mtimeMs >= taskStartTimeMs
	} catch {
		return false
	}
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

function getCodeReviewFallbackPromptPath(
	placeholders: Record<string, string>,
	layer: "adversarial_general" | "edge_case_hunter",
): string | undefined {
	const fileName = layer === "adversarial_general" ? "review-adversarial-general.md" : "review-edge-case-hunter.md"
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

async function resolveFreshPlaceholderArtifactPath(args: {
	placeholders: Record<string, string>
	placeholderKey: "review_input" | "diff_output"
	taskStartTimeMs: number
}): Promise<string | undefined> {
	const placeholderPath = args.placeholders[args.placeholderKey]?.trim()
	if (!placeholderPath) {
		return undefined
	}

	const resolvedPath = resolveArtifactPlaceholderPath(args.placeholders, placeholderPath)
	return (await fileExistsAndIsFresh(resolvedPath, args.taskStartTimeMs)) ? resolvedPath : undefined
}

async function evaluateCodeReviewStep(args: {
	taskState: TaskState
	stepNumber: number
}): Promise<DeterministicStepEvaluationResult> {
	const placeholders = getMergedPlaceholderValues(args.taskState)

	switch (args.stepNumber) {
		case 1: {
			const reviewTarget = placeholders.review_target?.trim()
			const specFile = placeholders.spec_file?.trim()
			if (!reviewTarget || !specFile) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "review_target and spec_file are both present.",
			}
		}
		case 2: {
			const reviewInputPath = await resolveFreshPlaceholderArtifactPath({
				placeholders,
				placeholderKey: "review_input",
				taskStartTimeMs: args.taskState.taskStartTimeMs,
			})
			if (!reviewInputPath) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "review_input points to a fresh review-input.md artifact.",
			}
		}
		case 3: {
			const diffOutputPath = await resolveFreshPlaceholderArtifactPath({
				placeholders,
				placeholderKey: "diff_output",
				taskStartTimeMs: args.taskState.taskStartTimeMs,
			})
			if (!diffOutputPath) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "diff_output points to a fresh review-input.diff artifact.",
			}
		}
		case 4: {
			const reviewInputPath = await resolveFreshPlaceholderArtifactPath({
				placeholders,
				placeholderKey: "review_input",
				taskStartTimeMs: args.taskState.taskStartTimeMs,
			})
			const diffOutputPath = await resolveFreshPlaceholderArtifactPath({
				placeholders,
				placeholderKey: "diff_output",
				taskStartTimeMs: args.taskState.taskStartTimeMs,
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
				reason: "review_mode was derived deterministically from fresh review artifacts.",
				placeholderValuesChanged,
			}
		}
		case 5: {
			const nextDeterministicState = cloneDeterministicState(args.taskState)
			const completedReviewLayers = nextDeterministicState.codeReview?.completedReviewLayers ?? {}
			let deterministicStateChanged = false

			for (const layer of ["adversarial_general", "edge_case_hunter"] as const) {
				if (completedReviewLayers[layer]) {
					continue
				}

				const fallbackPromptPath = getCodeReviewFallbackPromptPath(placeholders, layer)
				if (!fallbackPromptPath || !(await fileExistsAndIsFresh(fallbackPromptPath, args.taskState.taskStartTimeMs))) {
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
				reason: "Every required review layer has a final report or a fresh fallback prompt artifact.",
				deterministicStateChanged,
			}
		}
		case 6: {
			const specFilePath = placeholders.spec_file?.trim()
			if (!specFilePath || !(await fileExistsAndIsFresh(specFilePath, args.taskState.taskStartTimeMs))) {
				return { completed: false }
			}

			const specFileText = await readFileIfExists(specFilePath)
			if (!specFileText || !hasTopLevelStatusValue(specFileText, ["ready-for-dev", "complete"])) {
				return { completed: false }
			}

			return {
				completed: true,
				reason: "spec_file was updated and now contains a terminal review status.",
			}
		}
		default:
			return { completed: false }
	}
}

async function evaluateDevStoryStep(args: {
	taskState: TaskState
	stepNumber: number
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
			if (!storyPath || !(await fileExistsAndIsFresh(storyPath, args.taskState.taskStartTimeMs))) {
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
		default:
			return { completed: false }
	}
}

async function evaluateDeterministicStep(args: {
	taskState: TaskState
	workflowName: DeterministicPlaceholderWorkflowName
	stepNumber: number
}): Promise<DeterministicStepEvaluationResult> {
	if (args.workflowName === "code-review.md") {
		return evaluateCodeReviewStep({
			taskState: args.taskState,
			stepNumber: args.stepNumber,
		})
	}

	return evaluateDevStoryStep({
		taskState: args.taskState,
		stepNumber: args.stepNumber,
	})
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
