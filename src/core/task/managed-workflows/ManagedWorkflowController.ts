import { extractManagedWorkflowPhases } from "./ManagedWorkflowPhaseExtractor"
import { getManagedWorkflowDefinition } from "./ManagedWorkflowRegistry"
import { buildManagedWorkflowStablePlaceholders, mergeManagedWorkflowPlaceholderMaps } from "./placeholders"
import type { ManagedWorkflowDefinition, ManagedWorkflowItemState, ManagedWorkflowRunState } from "./types"

function isRequiredManagedWorkflowItem(item: ManagedWorkflowItemState): boolean {
	return item.required !== false && item.optional !== true
}

function isCheckpointManagedWorkflowItem(item: ManagedWorkflowItemState): boolean {
	return item.blocked === true
}

function canResumeManagedWorkflowRun(existingRun: ManagedWorkflowRunState, freshRun: ManagedWorkflowRunState): boolean {
	if (existingRun.status !== "active") {
		return false
	}

	if (existingRun.workflowId !== freshRun.workflowId) {
		return false
	}

	if (existingRun.phases.length !== freshRun.phases.length) {
		return false
	}

	return existingRun.phases.every((phase, phaseIndex) => {
		const freshPhase = freshRun.phases[phaseIndex]
		if (!freshPhase) {
			return false
		}

		if (phase.sourcePath !== freshPhase.sourcePath || phase.id !== freshPhase.id) {
			return false
		}

		if (phase.items.length !== freshPhase.items.length) {
			return false
		}

		return phase.items.every((item, itemIndex) => {
			const freshItem = freshPhase.items[itemIndex]
			return (
				!!freshItem &&
				item.id === freshItem.id &&
				item.label === freshItem.label &&
				item.required === freshItem.required &&
				item.optional === freshItem.optional &&
				item.advisory === freshItem.advisory &&
				item.blocked === freshItem.blocked
			)
		})
	})
}

export async function startOrResumeManagedWorkflowRun(
	cwd: string,
	workflowId: string,
	existingRun?: ManagedWorkflowRunState,
	slashCommand?: string,
): Promise<{ run: ManagedWorkflowRunState; resumed: boolean }> {
	const definition = await getManagedWorkflowDefinition(cwd, workflowId)
	if (!definition) {
		throw new Error(`Managed workflow "${workflowId}" is not registered.`)
	}

	if (existingRun && existingRun.workflowId === definition.workflowId) {
		const freshRun = await createManagedWorkflowRunFromDefinition(cwd, definition, slashCommand)
		if (!canResumeManagedWorkflowRun(existingRun, freshRun)) {
			return {
				run: freshRun,
				resumed: false,
			}
		}

		const resumedRun: ManagedWorkflowRunState = {
			...existingRun,
			slashCommand: slashCommand ?? existingRun.slashCommand,
			stablePlaceholders: freshRun.stablePlaceholders,
			dynamicPlaceholders: mergeManagedWorkflowPlaceholderMaps(
				freshRun.dynamicPlaceholders,
				existingRun.dynamicPlaceholders,
			),
			updatedAt: Date.now(),
		}

		return {
			run: resumedRun,
			resumed: true,
		}
	}

	return {
		run: await createManagedWorkflowRunFromDefinition(cwd, definition, slashCommand),
		resumed: false,
	}
}

export async function startManagedWorkflowRun(
	cwd: string,
	workflowId: string,
	slashCommand?: string,
): Promise<ManagedWorkflowRunState> {
	return (await startOrResumeManagedWorkflowRun(cwd, workflowId, undefined, slashCommand)).run
}

export async function createManagedWorkflowRunFromDefinition(
	cwd: string,
	definition: ManagedWorkflowDefinition,
	slashCommand = definition.slashCommand,
): Promise<ManagedWorkflowRunState> {
	const phases = await extractManagedWorkflowPhases(cwd, definition)
	const now = Date.now()
	const stablePlaceholders = await buildManagedWorkflowStablePlaceholders(cwd, definition.module)
	return {
		workflowId: definition.workflowId,
		slashCommand,
		status: "active",
		currentPhaseIndex: 0,
		phases,
		createdAt: now,
		updatedAt: now,
		allRequiredComplete: false,
		stablePlaceholders,
		dynamicPlaceholders: {},
	}
}

export function getCurrentManagedWorkflowItems(run: ManagedWorkflowRunState): ManagedWorkflowItemState[] {
	return run.phases[run.currentPhaseIndex]?.items ?? []
}

function advanceManagedWorkflowItem(
	run: ManagedWorkflowRunState,
	itemId: string,
	mode: "step" | "checkpoint",
): ManagedWorkflowRunState {
	if (run.status !== "active") {
		throw new Error(`Managed workflow "${run.workflowId}" is not active.`)
	}

	const phase = run.phases[run.currentPhaseIndex]
	if (!phase) {
		throw new Error(`Managed workflow "${run.workflowId}" has no active phase.`)
	}

	const targetItemIndex = phase.items.findIndex((item) => item.id === itemId)
	const targetItem = targetItemIndex >= 0 ? phase.items[targetItemIndex] : undefined
	if (!targetItem) {
		throw new Error(`Item "${itemId}" is not in the current phase "${phase.id}".`)
	}

	const targetIsCheckpoint = isCheckpointManagedWorkflowItem(targetItem)
	if (mode === "step" && targetIsCheckpoint) {
		throw new Error(`Item "${itemId}" is a checkpoint and cannot be completed as a regular workflow item.`)
	}
	if (mode === "checkpoint" && !targetIsCheckpoint) {
		throw new Error(`Item "${itemId}" is not a checkpoint.`)
	}

	if (targetItem.completed) {
		throw new Error(`Item "${itemId}" is already complete. Do not mark it complete again.`)
	}

	const firstIncompleteRequiredItem = phase.items.find((item) => !item.completed && isRequiredManagedWorkflowItem(item))
	if (isRequiredManagedWorkflowItem(targetItem) && firstIncompleteRequiredItem && firstIncompleteRequiredItem.id !== itemId) {
		if (firstIncompleteRequiredItem.blocked) {
			throw new Error(
				`Item "${itemId}" is not the active workflow item. Complete checkpoint "${firstIncompleteRequiredItem.id}" first.`,
			)
		}
		throw new Error(`Item "${itemId}" is not the active workflow item. Complete "${firstIncompleteRequiredItem.id}" first.`)
	}

	const earlierItems = phase.items.slice(0, targetItemIndex)
	const hasIncompleteEarlierRequiredItems = earlierItems.some((item) => !item.completed && isRequiredManagedWorkflowItem(item))
	if (targetIsCheckpoint && hasIncompleteEarlierRequiredItems) {
		throw new Error(`Item "${itemId}" is blocked until earlier required workflow items are complete.`)
	}

	const unresolvedPriorBlockedItem = earlierItems.find(
		(item) => item.blocked && !item.completed && isRequiredManagedWorkflowItem(item),
	)
	if (unresolvedPriorBlockedItem) {
		throw new Error(`Item "${itemId}" is blocked until checkpoint "${unresolvedPriorBlockedItem.id}" is complete.`)
	}

	const phases = run.phases.map((existingPhase, phaseIndex) => {
		if (phaseIndex !== run.currentPhaseIndex) {
			return existingPhase
		}

		const items = existingPhase.items.map((item) => (item.id === itemId ? { ...item, completed: true } : item))
		const completed = items.every((item) => item.completed || !isRequiredManagedWorkflowItem(item))
		return {
			...existingPhase,
			items,
			completed,
		}
	})

	const currentPhaseCompleted = phases[run.currentPhaseIndex]?.completed === true
	const isFinalPhase = run.currentPhaseIndex >= phases.length - 1
	const allRequiredComplete = phases.every((existingPhase) =>
		existingPhase.items.every((item) => item.completed || !isRequiredManagedWorkflowItem(item)),
	)
	const nextPhaseIndex = allRequiredComplete
		? phases.length
		: currentPhaseCompleted && !isFinalPhase
			? run.currentPhaseIndex + 1
			: run.currentPhaseIndex

	return {
		...run,
		status: allRequiredComplete ? "completed" : "active",
		currentPhaseIndex: nextPhaseIndex,
		phases,
		updatedAt: Date.now(),
		allRequiredComplete,
	}
}

export function completeManagedWorkflowItem(run: ManagedWorkflowRunState, itemId: string): ManagedWorkflowRunState {
	return advanceManagedWorkflowItem(run, itemId, "step")
}

export function resolveManagedWorkflowCheckpoint(run: ManagedWorkflowRunState, itemId: string): ManagedWorkflowRunState {
	return advanceManagedWorkflowItem(run, itemId, "checkpoint")
}
