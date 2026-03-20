import { extractManagedWorkflowPhases } from "./ManagedWorkflowPhaseExtractor"
import { getManagedWorkflowDefinition } from "./ManagedWorkflowRegistry"
import type { ManagedWorkflowDefinition, ManagedWorkflowItemState, ManagedWorkflowRunState } from "./types"

function isRequiredManagedWorkflowItem(item: ManagedWorkflowItemState): boolean {
	return item.required !== false && item.optional !== true
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

	if (existingRun && existingRun.workflowId === definition.workflowId && existingRun.status === "active") {
		return {
			run: slashCommand ? { ...existingRun, slashCommand, updatedAt: Date.now() } : existingRun,
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
	return {
		workflowId: definition.workflowId,
		slashCommand,
		status: "active",
		currentPhaseIndex: 0,
		phases,
		createdAt: now,
		updatedAt: now,
		allRequiredComplete: false,
	}
}

export function getCurrentManagedWorkflowItems(run: ManagedWorkflowRunState): ManagedWorkflowItemState[] {
	return run.phases[run.currentPhaseIndex]?.items ?? []
}

export function completeManagedWorkflowItem(run: ManagedWorkflowRunState, itemId: string): ManagedWorkflowRunState {
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
	if (targetItem.blocked && hasIncompleteEarlierRequiredItems) {
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
