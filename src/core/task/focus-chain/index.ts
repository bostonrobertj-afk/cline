import { FocusChainSettings } from "@shared/FocusChainSettings"
import { telemetryService } from "@/services/telemetry"
import { TaskState } from "../TaskState"
import type { FocusChainChecklistUpdateResult } from "./types"
import { parseFocusChainListCounts } from "./utils"

export interface FocusChainDependencies {
	taskId: string
	taskState: TaskState
	postStateToWebview: () => Promise<void>
	focusChainSettings: FocusChainSettings
}

type WorkflowPresenceTaskState = TaskState & {
	activeWorkflowName?: string | null
}

export class FocusChainManager {
	private taskId: string
	private taskState: TaskState
	private postStateToWebview: () => Promise<void>
	private focusChainSettings: FocusChainSettings

	constructor(dependencies: FocusChainDependencies) {
		this.taskId = dependencies.taskId
		this.taskState = dependencies.taskState
		this.postStateToWebview = dependencies.postStateToWebview
		this.focusChainSettings = dependencies.focusChainSettings
	}

	private getActiveWorkflowName(): string | undefined {
		const activeWorkflowName = (this.taskState as WorkflowPresenceTaskState).activeWorkflowName?.trim()
		return activeWorkflowName ? activeWorkflowName : undefined
	}

	private hasActiveWorkflow(): boolean {
		return !!this.getActiveWorkflowName()
	}

	private async refreshWorkflowChecklistProjection(): Promise<void> {
		const checklist = this.taskState.currentFocusChainChecklist?.trim()
		this.taskState.apiRequestsSinceLastTodoUpdate = 0
		this.taskState.todoListWasUpdatedByUser = false

		if (!checklist) {
			await this.postStateToWebview()
			return
		}

		this.taskState.currentFocusChainChecklist = checklist
		await this.postStateToWebview()
	}

	private async clearChecklistProjection(): Promise<void> {
		this.taskState.currentFocusChainChecklist = null
		this.taskState.todoListWasUpdatedByUser = false
		this.taskState.apiRequestsSinceLastTodoUpdate = 0
		await this.postStateToWebview()
	}

	public async refreshActiveWorkflowChecklistProjection(): Promise<void> {
		if (!this.hasActiveWorkflow()) {
			await this.clearChecklistProjection()
			return
		}

		await this.refreshWorkflowChecklistProjection()
	}

	public async refreshActiveWorkflowChecklistProjectionIfActive(_force = false): Promise<void> {
		if (!this.hasActiveWorkflow()) {
			return
		}

		await this.refreshWorkflowChecklistProjection()
	}

	public async restoreCurrentChecklistFromDisk(): Promise<string | null> {
		return this.taskState.currentFocusChainChecklist ?? null
	}

	public async updateFCListFromToolResponse(
		_taskProgress: string | undefined,
		_toolContext?: unknown,
	): Promise<FocusChainChecklistUpdateResult> {
		if (this.hasActiveWorkflow()) {
			await this.refreshWorkflowChecklistProjection()
			return { accepted: true }
		}

		return { accepted: true }
	}

	public checkIncompleteProgressOnCompletion(modelId: string, provider: string) {
		if (this.focusChainSettings.enabled && this.taskState.currentFocusChainChecklist) {
			const { totalItems, completedItems } = parseFocusChainListCounts(this.taskState.currentFocusChainChecklist)

			if (totalItems > 0 && completedItems < totalItems) {
				const incompleteItems = totalItems - completedItems
				telemetryService.captureFocusChainIncompleteOnCompletion(
					this.taskId,
					totalItems,
					completedItems,
					incompleteItems,
					modelId,
					provider,
				)
			}
		}
	}

	public dispose() {}
}
