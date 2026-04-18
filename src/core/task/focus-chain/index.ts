import { FocusChainSettings } from "@shared/FocusChainSettings"
import * as chokidar from "chokidar"
import * as fs from "fs/promises"
import * as path from "path"
import { telemetryService } from "@/services/telemetry"
import { Logger } from "@/shared/services/Logger"
import { ClineSay } from "../../../shared/ExtensionMessage"
import { Mode } from "../../../shared/storage/types"
import { writeFile } from "../../../utils/fs"
import { ensureTaskDirectoryExists } from "../../storage/disk"
import { StateManager } from "../../storage/StateManager"
import { TaskState } from "../TaskState"
import { logFocusChainDiagnosticEvent, summarizeFocusChainText, summarizeFocusChainTextBlocks } from "./diagnostics"
import {
	buildFocusChainChecklistRejectionFeedback,
	createFocusChainMarkdownContent,
	evaluateFocusChainChecklistUpdate,
	extractFocusChainListFromText,
	type FocusChainStorageIdentity,
	getFocusChainFilePath,
} from "./file-utils"
import { FocusChainPrompts } from "./prompts"
import type { FocusChainChecklistUpdateResult } from "./types"
import { parseFocusChainListCounts } from "./utils"

export interface FocusChainDependencies {
	taskId: string
	focusChainStorageTaskId?: string
	focusChainStorageIdentity?: FocusChainStorageIdentity
	focusChainDocumentLabel?: string
	cwd: string
	taskState: TaskState
	mode: Mode
	stateManager: StateManager
	postStateToWebview: () => Promise<void>
	say: (type: ClineSay, text?: string, images?: string[], files?: string[], partial?: boolean) => Promise<number | undefined>
	focusChainSettings: FocusChainSettings
}

export interface FocusChainInstructionDecision {
	shouldInclude: boolean
	inPlanMode: boolean
	workflowActive: boolean
	justSwitchedFromPlanMode: boolean
	userUpdatedList: boolean
	reachedReminderInterval: boolean
	isFirstApiRequest: boolean
	hasNoTodoListAfterMultipleRequests: boolean
}

type WorkflowPresenceTaskState = TaskState & {
	activeWorkflowName?: string | null
}

export class FocusChainManager {
	private taskId: string
	private focusChainStorageTaskId: string
	private focusChainStorageIdentity?: FocusChainStorageIdentity
	private focusChainDocumentLabel: string
	private taskState: TaskState
	private stateManager: StateManager
	private postStateToWebview: () => Promise<void>
	private say: (
		type: ClineSay,
		text?: string,
		images?: string[],
		files?: string[],
		partial?: boolean,
	) => Promise<number | undefined>
	private focusChainFileWatcher?: chokidar.FSWatcher
	private hasTrackedFirstProgress = false
	private focusChainSettings: FocusChainSettings
	private fileUpdateDebounceTimer?: NodeJS.Timeout

	constructor(dependencies: FocusChainDependencies) {
		this.taskId = dependencies.taskId
		this.focusChainStorageTaskId = dependencies.focusChainStorageTaskId ?? dependencies.taskId
		this.focusChainStorageIdentity = dependencies.focusChainStorageIdentity
		this.focusChainDocumentLabel = dependencies.focusChainDocumentLabel ?? `Task ${dependencies.taskId}`
		this.taskState = dependencies.taskState
		this.stateManager = dependencies.stateManager
		this.postStateToWebview = dependencies.postStateToWebview
		this.say = dependencies.say
		this.focusChainSettings = dependencies.focusChainSettings
	}

	private joinPromptSections(...sections: Array<string | undefined | false>): string {
		return sections
			.map((section) => (typeof section === "string" ? section.trim() : ""))
			.filter((section): section is string => !!section)
			.join("\n\n")
	}

	private renderChecklistForPrompt(checklist: string): string {
		return ["```text", checklist.trim(), "```"].join("\n")
	}

	private getActiveWorkflowName(): string | undefined {
		const activeWorkflowName = (this.taskState as WorkflowPresenceTaskState).activeWorkflowName?.trim()
		return activeWorkflowName ? activeWorkflowName : undefined
	}

	private hasActiveWorkflow(): boolean {
		return !!this.getActiveWorkflowName()
	}

	private clearWorkflowPromptState(): void {
		this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined
		this.taskState.activeStoryTaskId = undefined
		this.taskState.activeStorySubtaskIds = []
		this.taskState.lastPromptedStoryTaskKey = undefined
	}

	private async resolveFocusChainFilePath(): Promise<string> {
		const taskDir = await ensureTaskDirectoryExists(this.focusChainStorageTaskId)
		return getFocusChainFilePath(taskDir, this.taskId, this.focusChainStorageIdentity)
	}

	private async removeFocusChainFileFromDisk(): Promise<void> {
		try {
			const todoFilePath = await this.resolveFocusChainFilePath()
			await fs.unlink(todoFilePath)
		} catch {
			// Missing focus chain file is fine when clearing projection state.
		}
	}

	private async refreshWorkflowChecklistProjection(): Promise<void> {
		const checklist = this.taskState.currentFocusChainChecklist?.trim()
		this.taskState.apiRequestsSinceLastTodoUpdate = 0
		this.taskState.todoListWasUpdatedByUser = false

		if (!checklist) {
			await this.removeFocusChainFileFromDisk()
			await this.postStateToWebview()
			return
		}

		this.taskState.currentFocusChainChecklist = checklist

		try {
			await this.writeFocusChainToDisk(checklist)
			await this.say("task_progress", checklist)
		} catch (error) {
			Logger.error(`[Task ${this.taskId}] workflow checklist projection refresh failed:`, error)
			await this.say("task_progress", checklist)
		}

		await this.postStateToWebview()
	}

	private async clearChecklistProjection(): Promise<void> {
		this.taskState.currentFocusChainChecklist = null
		this.taskState.todoListWasUpdatedByUser = false
		this.taskState.apiRequestsSinceLastTodoUpdate = 0
		await this.removeFocusChainFileFromDisk()
		await this.postStateToWebview()
	}

	public getFocusChainInstructionsDecision(): FocusChainInstructionDecision {
		const inPlanMode = this.stateManager.getGlobalSettingsKey("mode") === "plan"
		const workflowActive = this.hasActiveWorkflow()
		const justSwitchedFromPlanMode = this.taskState.didRespondToPlanAskBySwitchingMode
		const userUpdatedList = this.taskState.todoListWasUpdatedByUser
		const reachedReminderInterval =
			this.taskState.apiRequestsSinceLastTodoUpdate >= this.focusChainSettings.remindClineInterval
		const isFirstApiRequest = this.taskState.apiRequestCount === 1 && !this.taskState.currentFocusChainChecklist
		const hasNoTodoListAfterMultipleRequests =
			!this.taskState.currentFocusChainChecklist && this.taskState.apiRequestCount >= 2

		return {
			shouldInclude:
				workflowActive ||
				reachedReminderInterval ||
				justSwitchedFromPlanMode ||
				userUpdatedList ||
				inPlanMode ||
				isFirstApiRequest ||
				hasNoTodoListAfterMultipleRequests,
			inPlanMode,
			workflowActive,
			justSwitchedFromPlanMode,
			userUpdatedList,
			reachedReminderInterval,
			isFirstApiRequest,
			hasNoTodoListAfterMultipleRequests,
		}
	}

	public async setupFocusChainFileWatcher() {
		try {
			const focusChainFilePath = await this.resolveFocusChainFilePath()

			this.focusChainFileWatcher = chokidar.watch(focusChainFilePath, {
				persistent: true,
				ignoreInitial: true,
				awaitWriteFinish: {
					stabilityThreshold: 300,
					pollInterval: 100,
				},
			})

			this.focusChainFileWatcher
				.on("add", async () => {
					await this.updateFCListFromMarkdownFileAndNotifyUI()
				})
				.on("change", async () => {
					await this.updateFCListFromMarkdownFileAndNotifyUI()
				})
				.on("unlink", async () => {
					if (this.hasActiveWorkflow()) {
						await this.postStateToWebview()
						return
					}

					this.taskState.currentFocusChainChecklist = null
					await this.postStateToWebview()
				})
				.on("error", (error) => {
					Logger.error(`[Task ${this.taskId}] Failed to watch focus chain file:`, error)
				})

			Logger.log(`[Task ${this.taskId}] Todo file watcher initialized`)
		} catch (error) {
			Logger.error(`[Task ${this.taskId}] Failed to setup todo file watcher:`, error)
		}
	}

	private async updateFCListFromMarkdownFileAndNotifyUI() {
		if (this.hasActiveWorkflow()) {
			await this.postStateToWebview()
			return
		}

		if (this.fileUpdateDebounceTimer) {
			clearTimeout(this.fileUpdateDebounceTimer)
		}

		this.fileUpdateDebounceTimer = setTimeout(async () => {
			try {
				const markdownTodoList = await this.readFocusChainFromDisk()
				if (markdownTodoList) {
					const previousList = this.taskState.currentFocusChainChecklist

					if (previousList !== markdownTodoList) {
						this.taskState.currentFocusChainChecklist = markdownTodoList
						this.taskState.todoListWasUpdatedByUser = true

						await this.postStateToWebview()
						telemetryService.captureFocusChainListWritten(this.taskId)
					} else {
						Logger.log(
							`[Task ${this.taskId}] Focus Chain List: File watcher triggered but content unchanged, skipping update`,
						)
					}
				}
			} catch (error) {
				Logger.error(`[Task ${this.taskId}] Error updating focus chain list from markdown file:`, error)
			}
		}, 300)
	}

	public async generateFocusChainInstructions(): Promise<string> {
		const activeWorkflowName = this.getActiveWorkflowName()
		if (activeWorkflowName) {
			return this.joinPromptSections(
				"# CURRENT WORKFLOW STATUS",
				`## ACTIVE WORKFLOW: ${activeWorkflowName}`,
				this.taskState.currentFocusChainChecklist
					? this.renderChecklistForPrompt(this.taskState.currentFocusChainChecklist)
					: "Workflow progress is runtime managed. The checklist projection is not available yet.",
				"Workflow progress is runtime managed. Use the workflow tools for progress changes.\nDo not create or rewrite task_progress manually.",
			)
		}

		if (this.taskState.currentFocusChainChecklist) {
			const { totalItems, completedItems } = parseFocusChainListCounts(this.taskState.currentFocusChainChecklist)
			const percentComplete = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
			const listCurrentProgress = `**Current Progress: ${completedItems}/${totalItems} items completed (${percentComplete}%)**`
			const userHasUpdatedList =
				"**CRITICAL INFORMATION:** The user has modified this todo list - review ALL changes carefully"

			if (this.taskState.todoListWasUpdatedByUser) {
				return this.joinPromptSections(
					"# CURRENT WORKFLOW STATUS",
					listCurrentProgress,
					this.renderChecklistForPrompt(this.taskState.currentFocusChainChecklist),
					userHasUpdatedList,
					FocusChainPrompts.reminder,
				)
			}

			let progressBasedMessageStub = ""
			if (completedItems === 0 && totalItems > 0) {
				progressBasedMessageStub =
					"\n\n**Note:** No items are marked complete yet. As you work through the task, remember to mark items as complete when finished."
			} else if (percentComplete >= 25 && percentComplete < 50) {
				progressBasedMessageStub = `\n\n**Note:** ${percentComplete}% of items are complete.`
			} else if (percentComplete >= 50 && percentComplete < 75) {
				progressBasedMessageStub = `\n\n**Note:** ${percentComplete}% of items are complete. Proceed with the task.`
			} else if (percentComplete >= 75) {
				progressBasedMessageStub = `\n\n**Note:** ${percentComplete}% of items are complete! Focus on finishing the remaining items.`
			} else if (completedItems === totalItems && totalItems > 0) {
				progressBasedMessageStub = FocusChainPrompts.completed
					.replace("{{totalItems}}", totalItems.toString())
					.replace("{{currentFocusChainChecklist}}", this.taskState.currentFocusChainChecklist)
			}

			return this.joinPromptSections(
				"# CURRENT WORKFLOW STATUS",
				listCurrentProgress,
				this.renderChecklistForPrompt(this.taskState.currentFocusChainChecklist),
				FocusChainPrompts.reminder,
				progressBasedMessageStub,
			)
		}

		if (this.taskState.didRespondToPlanAskBySwitchingMode) {
			return FocusChainPrompts.initial
		}

		if (this.stateManager.getGlobalSettingsKey("mode") === "plan") {
			return FocusChainPrompts.planModeReminder
		}

		if (this.taskState.apiRequestCount < 10) {
			return FocusChainPrompts.recommended
		}

		return FocusChainPrompts.apiRequestCount.replace("{{apiRequestCount}}", this.taskState.apiRequestCount.toString())
	}

	public async consumeCurrentPlaceholderWorkflowStepPromptForInput(_options?: {
		shouldForceStoryTaskPrompt?: boolean
	}): Promise<string | undefined> {
		this.clearWorkflowPromptState()
		return undefined
	}

	public async refreshManagedWorkflowChecklistProjection(): Promise<void> {
		if (!this.hasActiveWorkflow()) {
			await this.clearManagedWorkflowChecklistProjection()
			return
		}

		await this.refreshWorkflowChecklistProjection()
	}

	public async refreshPlaceholderWorkflowChecklistProjection(_force = false): Promise<void> {
		if (!this.hasActiveWorkflow()) {
			return
		}

		await this.refreshWorkflowChecklistProjection()
	}

	public async restoreCurrentChecklistFromDisk(): Promise<string | null> {
		if (this.hasActiveWorkflow()) {
			return this.taskState.currentFocusChainChecklist ?? null
		}

		const markdownTodoList = await this.readFocusChainFromDisk()
		if (!markdownTodoList) {
			return null
		}

		this.taskState.currentFocusChainChecklist = markdownTodoList
		this.taskState.todoListWasUpdatedByUser = false
		this.taskState.apiRequestsSinceLastTodoUpdate = 0
		return markdownTodoList
	}

	public async logPromptAssemblySnapshot(context: {
		useCompactPrompt: boolean
		includeDetailedEnvironmentDetails: boolean
		providerId: string
		modelId: string
		focusChainManagerPresent: boolean
		placeholderActivationInstructionsAppended: boolean
	}): Promise<void> {
		const checklist = this.taskState.currentFocusChainChecklist
		const checklistStats = checklist ? parseFocusChainListCounts(checklist) : undefined
		const activeWorkflowName = this.getActiveWorkflowName()

		logFocusChainDiagnosticEvent(this.taskId, "load_context_snapshot", {
			providerId: context.providerId,
			modelId: context.modelId,
			useCompactPrompt: context.useCompactPrompt,
			reducedEnvironmentDetails: !context.includeDetailedEnvironmentDetails,
			focusChainManagerPresent: context.focusChainManagerPresent,
			activePlaceholderWorkflowId: activeWorkflowName ?? null,
			activePlaceholderWorkflowSourcePresent: !!activeWorkflowName,
			activeWorkflowName: activeWorkflowName ?? null,
			currentFocusChainChecklistPresent: !!checklist,
			currentFocusChainChecklistItemCount: checklistStats?.totalItems ?? 0,
			apiRequestCount: this.taskState.apiRequestCount,
			apiRequestsSinceLastTodoUpdate: this.taskState.apiRequestsSinceLastTodoUpdate,
			placeholderActivationInstructionsAppended: context.placeholderActivationInstructionsAppended,
		})
	}

	public async logFocusChainDecision(decision: FocusChainInstructionDecision): Promise<void> {
		logFocusChainDiagnosticEvent(this.taskId, "focus_chain_decision", { ...decision })
	}

	public async logGeneratedFocusChainInstructions(result: string): Promise<void> {
		const summary = summarizeFocusChainText(result)
		logFocusChainDiagnosticEvent(this.taskId, "focus_chain_generation", summary)
	}

	public async logFinalPromptContentSummary(processedUserContent: Array<{ type?: string; text?: string }>): Promise<void> {
		logFocusChainDiagnosticEvent(
			this.taskId,
			"load_context_final_summary",
			summarizeFocusChainTextBlocks(processedUserContent),
		)
	}

	public async clearManagedWorkflowChecklistProjection(): Promise<void> {
		await this.clearChecklistProjection()
	}

	public async clearPlaceholderWorkflowChecklistProjection(): Promise<void> {
		await this.clearChecklistProjection()
	}

	private async readFocusChainFromDisk(): Promise<string | null> {
		try {
			const todoFilePath = await this.resolveFocusChainFilePath()
			const markdownContent = await fs.readFile(todoFilePath, "utf8")
			return extractFocusChainListFromText(markdownContent)
		} catch (error) {
			Logger.log(`[Task ${this.taskId}] focus chain list: Could not load from markdown file: ${error}`)
			return null
		}
	}

	private async writeFocusChainToDisk(todoList: string): Promise<void> {
		try {
			const todoFilePath = await this.resolveFocusChainFilePath()
			await fs.mkdir(path.dirname(todoFilePath), { recursive: true })
			const fileContent = createFocusChainMarkdownContent(this.taskId, todoList, this.focusChainDocumentLabel)
			await writeFile(todoFilePath, fileContent, "utf8")
		} catch (error) {
			Logger.error(`[Task ${this.taskId}] focus chain list: FILE WRITE FAILED - Error:`, error)
			throw error
		}
	}

	public async updateFCListFromToolResponse(
		taskProgress: string | undefined,
		_toolContext?: unknown,
	): Promise<FocusChainChecklistUpdateResult> {
		try {
			if (this.hasActiveWorkflow()) {
				await this.refreshWorkflowChecklistProjection()
				return { accepted: true }
			}

			let nextChecklist: string | undefined
			let previousChecklist = this.taskState.currentFocusChainChecklist
			let shouldWriteFocusChainToDisk = false

			if (taskProgress?.trim()) {
				const trimmedTaskProgress = taskProgress.trim()
				const currentChecklist = this.taskState.currentFocusChainChecklist ?? (await this.readFocusChainFromDisk())

				if (!this.taskState.currentFocusChainChecklist && currentChecklist) {
					this.taskState.currentFocusChainChecklist = currentChecklist
				}

				if (currentChecklist) {
					const updateResult = evaluateFocusChainChecklistUpdate(currentChecklist, trimmedTaskProgress)
					if (!updateResult.accepted) {
						return {
							accepted: false,
							feedback: updateResult.feedback ?? buildFocusChainChecklistRejectionFeedback(currentChecklist),
						}
					}

					nextChecklist = updateResult.checklist || trimmedTaskProgress
					shouldWriteFocusChainToDisk = true
				} else {
					nextChecklist = trimmedTaskProgress
					shouldWriteFocusChainToDisk = true
				}
			} else {
				const markdownTodoList = await this.readFocusChainFromDisk()
				if (markdownTodoList) {
					previousChecklist = this.taskState.currentFocusChainChecklist
					nextChecklist = markdownTodoList
				} else {
					Logger.debug(`[Task ${this.taskId}] focus chain list: No valid task progress to update with`)
				}
			}

			if (!nextChecklist) {
				return { accepted: true }
			}

			this.taskState.apiRequestsSinceLastTodoUpdate = 0
			this.taskState.currentFocusChainChecklist = nextChecklist
			Logger.debug(
				`[Task ${this.taskId}] focus chain list: LLM provided focus chain list update via task_progress parameter. Length ${previousChecklist?.length || 0} > ${this.taskState.currentFocusChainChecklist.length}`,
			)

			const { totalItems, completedItems } = parseFocusChainListCounts(nextChecklist)

			if (!this.hasTrackedFirstProgress && totalItems > 0) {
				telemetryService.captureFocusChainProgressFirst(this.taskId, totalItems)
				this.hasTrackedFirstProgress = true
			} else if (this.hasTrackedFirstProgress && totalItems > 0) {
				telemetryService.captureFocusChainProgressUpdate(this.taskId, totalItems, completedItems)
			}

			if (shouldWriteFocusChainToDisk) {
				try {
					await this.writeFocusChainToDisk(nextChecklist)
					await this.say("task_progress", nextChecklist)
				} catch (error) {
					Logger.error(`[Task ${this.taskId}] focus chain list: Failed to write to markdown file:`, error)
					await this.say("task_progress", nextChecklist)
					Logger.log(`[Task ${this.taskId}] focus chain list: Sent fallback task_progress message to UI`)
				}
			} else {
				await this.say("task_progress", nextChecklist)
			}

			return { accepted: true }
		} catch (error) {
			Logger.error(`[Task ${this.taskId}] focus chain list: Error in updateFCListFromToolResponse:`, error)
			return { accepted: false, feedback: "Failed to update task progress." }
		}
	}

	public shouldIncludeFocusChainInstructions(): boolean {
		const inPlanMode = this.stateManager.getGlobalSettingsKey("mode") === "plan"
		const workflowActive = this.hasActiveWorkflow()
		const justSwitchedFromPlanMode = this.taskState.didRespondToPlanAskBySwitchingMode
		const userUpdatedList = this.taskState.todoListWasUpdatedByUser
		const reachedReminderInterval =
			this.taskState.apiRequestsSinceLastTodoUpdate >= this.focusChainSettings.remindClineInterval
		const isFirstApiRequest = this.taskState.apiRequestCount === 1 && !this.taskState.currentFocusChainChecklist
		const hasNoTodoListAfterMultipleRequests =
			!this.taskState.currentFocusChainChecklist && this.taskState.apiRequestCount >= 2

		return (
			workflowActive ||
			reachedReminderInterval ||
			justSwitchedFromPlanMode ||
			userUpdatedList ||
			inPlanMode ||
			isFirstApiRequest ||
			hasNoTodoListAfterMultipleRequests
		)
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

	public dispose() {
		if (this.fileUpdateDebounceTimer) {
			clearTimeout(this.fileUpdateDebounceTimer)
			this.fileUpdateDebounceTimer = undefined
		}

		if (this.focusChainFileWatcher) {
			this.focusChainFileWatcher.close()
			this.focusChainFileWatcher = undefined
		}
	}
}
