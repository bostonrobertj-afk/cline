import { FocusChainSettings } from "@shared/FocusChainSettings"
import * as chokidar from "chokidar"
import * as fs from "fs/promises"
import * as path from "path"
import {
	buildPlaceholderWorkflowChecklist,
	getActivePlaceholderWorkflowStepDetails,
} from "@/core/workflows/placeholder-workflow-step-details"
import { telemetryService } from "@/services/telemetry"
import { Logger } from "@/shared/services/Logger"
import { ClineSay } from "../../../shared/ExtensionMessage"
import { Mode } from "../../../shared/storage/types"
import { writeFile } from "../../../utils/fs"
import { ensureTaskDirectoryExists } from "../../storage/disk"
import { StateManager } from "../../storage/StateManager"
import { renderManagedWorkflowTaskProgress } from "../managed-workflows/ManagedWorkflowRenderer"
import { TaskState } from "../TaskState"
import { logFocusChainDiagnosticEvent, summarizeFocusChainText, summarizeFocusChainTextBlocks } from "./diagnostics"
import {
	buildFocusChainChecklistRejectionFeedback,
	createFocusChainMarkdownContent,
	evaluateFocusChainChecklistUpdate,
	extractFocusChainItemsFromText,
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
	placeholderWorkflowActive: boolean
	justSwitchedFromPlanMode: boolean
	userUpdatedList: boolean
	reachedReminderInterval: boolean
	isFirstApiRequest: boolean
	hasNoTodoListAfterMultipleRequests: boolean
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

	private async resolveFocusChainFilePath(): Promise<string> {
		const taskDir = await ensureTaskDirectoryExists(this.focusChainStorageTaskId)
		return getFocusChainFilePath(taskDir, this.taskId, this.focusChainStorageIdentity)
	}

	public getFocusChainInstructionsDecision(): FocusChainInstructionDecision {
		const inPlanMode = this.stateManager.getGlobalSettingsKey("mode") === "plan"
		const placeholderWorkflowActive = !!this.taskState.activePlaceholderWorkflowSource
		const justSwitchedFromPlanMode = this.taskState.didRespondToPlanAskBySwitchingMode
		const userUpdatedList = this.taskState.todoListWasUpdatedByUser
		const reachedReminderInterval =
			this.taskState.apiRequestsSinceLastTodoUpdate >= this.focusChainSettings.remindClineInterval
		const isFirstApiRequest = this.taskState.apiRequestCount === 1 && !this.taskState.currentFocusChainChecklist
		const hasNoTodoListAfterMultipleRequests =
			!this.taskState.currentFocusChainChecklist && this.taskState.apiRequestCount >= 2

		return {
			shouldInclude:
				placeholderWorkflowActive ||
				reachedReminderInterval ||
				justSwitchedFromPlanMode ||
				userUpdatedList ||
				inPlanMode ||
				isFirstApiRequest ||
				hasNoTodoListAfterMultipleRequests,
			inPlanMode,
			placeholderWorkflowActive,
			justSwitchedFromPlanMode,
			userUpdatedList,
			reachedReminderInterval,
			isFirstApiRequest,
			hasNoTodoListAfterMultipleRequests,
		}
	}

	/**
	 * Sets up a file watcher to monitor changes to the focus chain list markdown file.
	 * Automatically updates the UI when the file is created, modified, or deleted by external editors.
	 * @requires this.taskId, this.context to be initialized
	 * @returns Promise<void> - Resolves when watcher is set up, logs errors if setup fails
	 */
	public async setupFocusChainFileWatcher() {
		try {
			const focusChainFilePath = await this.resolveFocusChainFilePath()

			// Initialize chokidar watcher
			this.focusChainFileWatcher = chokidar.watch(focusChainFilePath, {
				persistent: true,
				ignoreInitial: true,
				awaitWriteFinish: {
					stabilityThreshold: 300,
					pollInterval: 100,
				},
			})

			// Handle file changes
			this.focusChainFileWatcher
				.on("add", async () => {
					await this.updateFCListFromMarkdownFileAndNotifyUI()
				})
				.on("change", async () => {
					await this.updateFCListFromMarkdownFileAndNotifyUI()
				})
				.on("unlink", async () => {
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

	/**
	 * Reads the current focus chain list from the markdown file and updates the UI with any changes.
	 * Uses debouncing (300ms) to prevent excessive updates and only notifies the webview when content actually changes.
	 * @requires File watcher to be active and markdown file to exist
	 * @returns Promise<void> - Updates taskState.currentFocusChainChecklist and calls postStateToWebview()
	 */
	private async updateFCListFromMarkdownFileAndNotifyUI() {
		if (this.taskState.managedWorkflowRun) {
			const managedTaskProgress = renderManagedWorkflowTaskProgress(this.taskState.managedWorkflowRun)
			this.taskState.currentFocusChainChecklist = managedTaskProgress
			await this.say("task_progress", managedTaskProgress)
			await this.postStateToWebview()
			return
		}

		if (this.fileUpdateDebounceTimer) {
			clearTimeout(this.fileUpdateDebounceTimer)
		}

		// Debounce file watcher to prevent false positives
		this.fileUpdateDebounceTimer = setTimeout(async () => {
			try {
				const markdownTodoList = await this.readFocusChainFromDisk()
				if (markdownTodoList) {
					const previousList = this.taskState.currentFocusChainChecklist

					// Only update if the content actually changed
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
				Logger.error(`[Task ${this.taskId}] Error updating focuss chain list from markdown file:`, error)
			}
		}, 300)
	}

	/**
	 * Generates contextual instructions for focus chain list creation and management based on current task state.
	 * Returns formatted markdown instructions that guide the AI on when and how to update progress tracking.
	 * @requires this.taskState with current focus chain list state and API request counts
	 * @returns string - Formatted markdown instructions for focus chain list management, varies by context
	 */
	public async generateFocusChainInstructions(): Promise<string> {
		if (this.taskState.managedWorkflowRun) {
			const currentChecklist = renderManagedWorkflowTaskProgress(this.taskState.managedWorkflowRun)
			return this.joinPromptSections(
				"# WORKFLOW PROGRESS IS BACKEND MANAGED",
				this.renderChecklistForPrompt(currentChecklist),
				"Use the complete_workflow_item tool to mark the active workflow item complete.\nDo not create or rewrite task_progress manually.",
			)
		}

		// If list exists already exists, we need to remind it to update rather than demand initialization
		if (this.taskState.currentFocusChainChecklist) {
			// Parse the current list for counts/stats
			const { totalItems, completedItems } = parseFocusChainListCounts(this.taskState.currentFocusChainChecklist)
			const percentComplete = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

			const introUpdateRequired =
				"### Reminder: Detailed instructions are automatically sent for the first incomplete task in your task list. Failure to maintain your task list can lead to old instructions persisting, and prevent you from seeing the details for the step you're currently on. To update your task list, include the full current checklist as task_progress on your next tool call. Keep the step labels and order, and change only completed items from - [ ] to - [x]."
			const listCurrentProgress = `**Current Progress: ${completedItems}/${totalItems} items completed (${percentComplete}%)**`
			const userHasUpdatedList =
				"**CRITICAL INFORMATION:** The user has modified this todo list - review ALL changes carefully"

			const placeholderWorkflowStepPrompt = await this.buildPlaceholderWorkflowStepPrompt(
				this.taskState.currentFocusChainChecklist,
				listCurrentProgress,
			)
			if (placeholderWorkflowStepPrompt) {
				return placeholderWorkflowStepPrompt
			}

			// If user has updated the list, inform the model (and provide latest copy)
			if (this.taskState.todoListWasUpdatedByUser) {
				return this.joinPromptSections(
					introUpdateRequired,
					listCurrentProgress,
					this.renderChecklistForPrompt(this.taskState.currentFocusChainChecklist),
					userHasUpdatedList,
					FocusChainPrompts.reminder,
				)

				// If there are no user changes, proceed with reminders based on list progress
			}
			let progressBasedMessageStub = ""
			// If there are items on the list, but none have been completed yet, remind the model to update the list when appropriate
			if (completedItems === 0 && totalItems > 0) {
				progressBasedMessageStub =
					"\n\n**Note:** No items are marked complete yet. As you work through the task, remember to mark items as complete when finished."
			} else if (percentComplete >= 25 && percentComplete < 50) {
				progressBasedMessageStub = `\n\n**Note:** ${percentComplete}% of items are complete.`
			} else if (percentComplete >= 50 && percentComplete < 75) {
				progressBasedMessageStub = `\n\n**Note:** ${percentComplete}% of items are complete. Proceed with the task.`
			} else if (percentComplete >= 75) {
				progressBasedMessageStub = `\n\n**Note:** ${percentComplete}% of items are complete! Focus on finishing the remaining items.`
			}
			// Every item on the list has been completed. Hooray!
			else if (completedItems === totalItems && totalItems > 0) {
				progressBasedMessageStub = FocusChainPrompts.completed
					.replace("{{totalItems}}", totalItems.toString())
					.replace("{{currentFocusChainChecklist}}", this.taskState.currentFocusChainChecklist)
			}

			// Return with progress-based stub
			return this.joinPromptSections(
				introUpdateRequired,
				listCurrentProgress,
				this.renderChecklistForPrompt(this.taskState.currentFocusChainChecklist),
				FocusChainPrompts.reminder,
				progressBasedMessageStub,
			)
		}
		// When switching from Plan to Act, request that a new list be generated
		if (this.taskState.didRespondToPlanAskBySwitchingMode) {
			return `${FocusChainPrompts.initial}`
		}

		// When in plan mode, lists are optional. TODO - May want to improve this soft prompt approach in a future version
		if (this.stateManager.getGlobalSettingsKey("mode") === "plan") {
			return FocusChainPrompts.planModeReminder
		}
		// Check if we're early in the task
		const isEarlyInTask = this.taskState.apiRequestCount < 10
		if (isEarlyInTask) {
			return FocusChainPrompts.recommended
		}
		return FocusChainPrompts.apiRequestCount.replace("{{apiRequestCount}}", this.taskState.apiRequestCount.toString())
	}

	private async buildPlaceholderWorkflowStepPrompt(
		currentChecklist: string,
		listCurrentProgress: string,
	): Promise<string | undefined> {
		if (!this.taskState.activePlaceholderWorkflowSource) {
			await logFocusChainDiagnosticEvent(this.taskId, "placeholder_step_prompt_resolution", {
				entered: true,
				resolved: false,
				reason: "no_active_placeholder_workflow_source",
				hasActivePlaceholderWorkflowSource: false,
				currentChecklistItems: parseFocusChainListCounts(currentChecklist).totalItems,
			})
			return undefined
		}

		try {
			const stepDetails = await getActivePlaceholderWorkflowStepDetails({
				checklistMarkdown: currentChecklist,
				source: this.taskState.activePlaceholderWorkflowSource,
				stablePlaceholderValues: this.taskState.activePlaceholderWorkflowStableValues,
				placeholderValues: this.taskState.activePlaceholderWorkflowValues,
			})
			if (!stepDetails) {
				logFocusChainDiagnosticEvent(this.taskId, "placeholder_step_prompt_resolution", {
					entered: true,
					resolved: false,
					reason: "no_step_details",
					hasActivePlaceholderWorkflowSource: !!this.taskState.activePlaceholderWorkflowSource,
					currentChecklistItems: parseFocusChainListCounts(currentChecklist).totalItems,
				})
				return undefined
			}

			const userUpdatedWarning = this.taskState.todoListWasUpdatedByUser
				? "**CRITICAL INFORMATION:** I updated this checklist manually. Review the current checklist carefully before you continue."
				: ""
			logFocusChainDiagnosticEvent(this.taskId, "placeholder_step_prompt_resolution", {
				entered: true,
				resolved: true,
				checklistLabel: stepDetails.checklistLabel,
				hasActivePlaceholderWorkflowSource: !!this.taskState.activePlaceholderWorkflowSource,
				currentChecklistItems: parseFocusChainListCounts(currentChecklist).totalItems,
			})

			return this.joinPromptSections(
				"### Reminder: Detailed instructions are automatically sent for the first incomplete task in your task list. Failure to maintain your task list can lead to old instructions persisting, and prevent you from seeing the details for the step you're currently on. To update your task list, include the full current checklist as task_progress on your next tool call. Keep the step labels and order, and change only completed items from - [ ] to - [x].",
				listCurrentProgress,
				this.renderChecklistForPrompt(currentChecklist),
				userUpdatedWarning,
				[
					"# CURRENT WORKFLOW STEP",
					`You are currently on this step: ${stepDetails.checklistLabel}`,
					stepDetails.details.trim(),
					"Focus on completing this step.",
					"I track which step you're on based on your last `task_progress` update.",
					"If you finish this step, include the full current checklist as `task_progress` on your next tool call.",
					"Keep the same step labels in the same order. Change only this completed step from `- [ ]` to `- [x]`, and leave future steps unchecked.",
					"Do not resend the same unchanged all-unchecked checklist after you finish this step.",
					"Once you do, I'll give you the next step's details.",
				].join("\n\n"),
			)
		} catch (error) {
			logFocusChainDiagnosticEvent(this.taskId, "placeholder_step_prompt_resolution", {
				entered: true,
				resolved: false,
				reason: "error",
				errorMessage: error instanceof Error ? error.message : String(error),
				hasActivePlaceholderWorkflowSource: !!this.taskState.activePlaceholderWorkflowSource,
				currentChecklistItems: parseFocusChainListCounts(currentChecklist).totalItems,
			})
			Logger.warn(`[Task ${this.taskId}] Failed to resolve workflow step details`, error)
			return undefined
		}
	}

	public async refreshManagedWorkflowChecklistProjection(): Promise<void> {
		if (!this.taskState.managedWorkflowRun) {
			await this.clearManagedWorkflowChecklistProjection()
			return
		}

		const managedTaskProgress = renderManagedWorkflowTaskProgress(this.taskState.managedWorkflowRun)
		this.taskState.apiRequestsSinceLastTodoUpdate = 0
		this.taskState.todoListWasUpdatedByUser = false
		this.taskState.currentFocusChainChecklist = managedTaskProgress

		try {
			await this.writeFocusChainToDisk(managedTaskProgress)
			await this.say("task_progress", managedTaskProgress)
		} catch (error) {
			Logger.error(`[Task ${this.taskId}] managed workflow checklist projection refresh failed:`, error)
			await this.say("task_progress", managedTaskProgress)
		}

		await this.postStateToWebview()
	}

	public async refreshPlaceholderWorkflowChecklistProjection(force = false): Promise<void> {
		if (!this.taskState.activePlaceholderWorkflowSource) {
			return
		}
		if (!force && this.taskState.currentFocusChainChecklist) {
			return
		}

		const checklist = await buildPlaceholderWorkflowChecklist({
			source: this.taskState.activePlaceholderWorkflowSource,
			stablePlaceholderValues: this.taskState.activePlaceholderWorkflowStableValues,
			placeholderValues: this.taskState.activePlaceholderWorkflowValues,
		})
		if (!checklist) {
			return
		}

		this.taskState.apiRequestsSinceLastTodoUpdate = 0
		this.taskState.todoListWasUpdatedByUser = false
		this.taskState.currentFocusChainChecklist = checklist

		try {
			await this.writeFocusChainToDisk(checklist)
			await this.say("task_progress", checklist)
		} catch (error) {
			Logger.error(`[Task ${this.taskId}] placeholder workflow checklist projection refresh failed:`, error)
			await this.say("task_progress", checklist)
		}

		await this.postStateToWebview()
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

		logFocusChainDiagnosticEvent(this.taskId, "load_context_snapshot", {
			providerId: context.providerId,
			modelId: context.modelId,
			useCompactPrompt: context.useCompactPrompt,
			reducedEnvironmentDetails: !context.includeDetailedEnvironmentDetails,
			focusChainManagerPresent: context.focusChainManagerPresent,
			activePlaceholderWorkflowId: this.taskState.activePlaceholderWorkflowId ?? null,
			activePlaceholderWorkflowSourcePresent: !!this.taskState.activePlaceholderWorkflowSource,
			currentFocusChainChecklistPresent: !!checklist,
			currentFocusChainChecklistItemCount: checklistStats?.totalItems ?? 0,
			apiRequestCount: this.taskState.apiRequestCount,
			apiRequestsSinceLastTodoUpdate: this.taskState.apiRequestsSinceLastTodoUpdate,
			placeholderWorkflowJustStarted: this.taskState.activeWorkflowJustStarted,
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
		this.taskState.currentFocusChainChecklist = null
		this.taskState.todoListWasUpdatedByUser = false
		this.taskState.apiRequestsSinceLastTodoUpdate = 0

		try {
			const todoFilePath = await this.resolveFocusChainFilePath()
			await fs.unlink(todoFilePath)
		} catch {
			// Missing focus chain file is fine when clearing projection state.
		}

		await this.postStateToWebview()
	}

	/**
	 * Reads the focus chain list from the task's markdown file on disk and extracts the checklist content.
	 * Returns the raw focus chain list string if found, or null if the file doesn't exist or contains no valid todos.
	 * @requires this.taskId and this.context to locate the task directory
	 * @returns Promise<string | null> - focus chain list content as string, or null if file missing/invalid
	 * @throws Returns null on file read errors (file not found, permission issues)
	 */
	private async readFocusChainFromDisk(): Promise<string | null> {
		try {
			const todoFilePath = await this.resolveFocusChainFilePath()
			const markdownContent = await fs.readFile(todoFilePath, "utf8")
			const todoList = extractFocusChainListFromText(markdownContent)

			if (todoList) {
				const _todoLines = extractFocusChainItemsFromText(markdownContent)
				return todoList
			}

			return null
		} catch (error) {
			// File doesn't exist or can't be read, return null
			Logger.log(`[Task ${this.taskId}] focus chain list: Could not load from markdown file: ${error}`)
			return null
		}
	}

	/**
	 * Writes the provided focus chain list to the task's markdown file on disk with proper formatting.
	 * Creates the full markdown document structure and triggers file watchers to update the UI.
	 * @param todoList - Raw focus chain list string with markdown checklist items
	 * @requires this.taskId and this.context for file path generation
	 * @returns Promise<void> - Resolves when file is written successfully
	 * @throws Error if file write fails (disk full, permissions, etc.)
	 */
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

	/**
	 * Processes focus chain list updates from the AI model's task_progress parameter and persists them to disk.
	 * Handles telemetry tracking for progress updates and falls back to reading existing files if no update provided.
	 * Also manages the apiRequestsSinceLastTodoUpdate counter and includes comprehensive error handling.
	 * @param taskProgress - Optional focus chain list string from AI model's task_progress parameter
	 * @requires this.taskState, this.say method, and telemetryService to be available
	 * @returns Promise<void> - Updates taskState.currentFocusChainChecklist and sends UI messages
	 */
	public async updateFCListFromToolResponse(taskProgress: string | undefined): Promise<FocusChainChecklistUpdateResult> {
		try {
			if (this.taskState.managedWorkflowRun) {
				await this.refreshManagedWorkflowChecklistProjection()
				return { accepted: true }
			}
			if (!taskProgress && this.taskState.activePlaceholderWorkflowSource && !this.taskState.currentFocusChainChecklist) {
				await this.refreshPlaceholderWorkflowChecklistProjection()
				return { accepted: true }
			}

			if (taskProgress && taskProgress.trim()) {
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

					const mergedChecklist = updateResult.checklist || trimmedTaskProgress
					const previousList = this.taskState.currentFocusChainChecklist
					this.taskState.apiRequestsSinceLastTodoUpdate = 0
					this.taskState.currentFocusChainChecklist = mergedChecklist
					Logger.debug(
						`[Task ${this.taskId}] focus chain list: LLM provided focus chain list update via task_progress parameter. Length ${previousList?.length || 0} > ${this.taskState.currentFocusChainChecklist.length}`,
					)

					// Parse focus chain list counts for telemetry
					const { totalItems, completedItems } = parseFocusChainListCounts(mergedChecklist)

					// Track first progress creation
					if (!this.hasTrackedFirstProgress && totalItems > 0) {
						telemetryService.captureFocusChainProgressFirst(this.taskId, totalItems)
						this.hasTrackedFirstProgress = true
					}
					// Track progress updates (only if not the first, and has items)
					else if (this.hasTrackedFirstProgress && totalItems > 0) {
						telemetryService.captureFocusChainProgressUpdate(this.taskId, totalItems, completedItems)
					}

					// Write the model's update to the markdown file
					try {
						await this.writeFocusChainToDisk(mergedChecklist)

						// Send the task_progress message to the UI immediately
						await this.say("task_progress", mergedChecklist)
					} catch (error) {
						Logger.error(`[Task ${this.taskId}] focus chain list: Failed to write to markdown file:`, error)
						// Fall back to creating a task_progress message directly if file write fails
						await this.say("task_progress", mergedChecklist)
						Logger.log(`[Task ${this.taskId}] focus chain list: Sent fallback task_progress message to UI`)
					}
				} else {
					this.taskState.apiRequestsSinceLastTodoUpdate = 0
					this.taskState.currentFocusChainChecklist = trimmedTaskProgress
					Logger.debug(
						`[Task ${this.taskId}] focus chain list: LLM provided focus chain list update via task_progress parameter. Length 0 > ${this.taskState.currentFocusChainChecklist.length}`,
					)

					// Parse focus chain list counts for telemetry
					const { totalItems, completedItems } = parseFocusChainListCounts(trimmedTaskProgress)

					// Track first progress creation
					if (!this.hasTrackedFirstProgress && totalItems > 0) {
						telemetryService.captureFocusChainProgressFirst(this.taskId, totalItems)
						this.hasTrackedFirstProgress = true
					}
					// Track progress updates (only if not the first, and has items)
					else if (this.hasTrackedFirstProgress && totalItems > 0) {
						telemetryService.captureFocusChainProgressUpdate(this.taskId, totalItems, completedItems)
					}

					// Write the model's update to the markdown file
					try {
						await this.writeFocusChainToDisk(trimmedTaskProgress)

						// Send the task_progress message to the UI immediately
						await this.say("task_progress", trimmedTaskProgress)
					} catch (error) {
						Logger.error(`[Task ${this.taskId}] focus chain list: Failed to write to markdown file:`, error)
						// Fall back to creating a task_progress message directly if file write fails
						await this.say("task_progress", trimmedTaskProgress)
						Logger.log(`[Task ${this.taskId}] focus chain list: Sent fallback task_progress message to UI`)
					}
				}
			} else {
				// No model update provided, check if markdown file exists and load it
				const markdownTodoList = await this.readFocusChainFromDisk()
				if (markdownTodoList) {
					const _previousList = this.taskState.currentFocusChainChecklist
					this.taskState.currentFocusChainChecklist = markdownTodoList

					// Create a task_progress message to display the focus chain list in the UI
					await this.say("task_progress", markdownTodoList)
				} else {
					Logger.debug(`[Task ${this.taskId}] focus chain list: No valid task progress to update with`)
				}
			}
			return { accepted: true }
		} catch (error) {
			Logger.error(`[Task ${this.taskId}] focus chain list: Error in updateFCListFromToolResponse:`, error)
			return { accepted: false, feedback: "Failed to update task progress." }
		}
	}

	/**
	 * Evaluates multiple conditions to determine if focus chain list instructions should be included in the AI prompt.
	 * Returns true when in plan mode, after mode switches, when user edits exist, or at reminder intervals.
	 * @requires this.mode, this.taskState, and this.focusChainSettings to be initialized
	 * @returns boolean - True if instructions should be included in AI prompt, false otherwise
	 */
	public shouldIncludeFocusChainInstructions(): boolean {
		// Always include when in Plan mode
		const inPlanMode = this.stateManager.getGlobalSettingsKey("mode") === "plan"
		// Always include when a placeholder workflow is active so the checklist and current-step details
		// remain present on every turn after activation.
		const placeholderWorkflowActive = !!this.taskState.activePlaceholderWorkflowSource
		// Always include when switching from Plan > Act
		const justSwitchedFromPlanMode = this.taskState.didRespondToPlanAskBySwitchingMode
		// Always include when user had edited the list manually
		const userUpdatedList = this.taskState.todoListWasUpdatedByUser
		// Include when reaching the reminder interval, configured by settings
		const reachedReminderInterval =
			this.taskState.apiRequestsSinceLastTodoUpdate >= this.focusChainSettings.remindClineInterval
		// Include on first API request or if list does not exist
		const isFirstApiRequest = this.taskState.apiRequestCount === 1 && !this.taskState.currentFocusChainChecklist
		// Include if no list has been created and multiple requests have completed
		const hasNoTodoListAfterMultipleRequests =
			!this.taskState.currentFocusChainChecklist && this.taskState.apiRequestCount >= 2

		const shouldInclude =
			placeholderWorkflowActive ||
			reachedReminderInterval ||
			justSwitchedFromPlanMode ||
			userUpdatedList ||
			inPlanMode ||
			isFirstApiRequest ||
			hasNoTodoListAfterMultipleRequests

		return shouldInclude
	}

	/**
	 * Analyzes the current focus chain list for incomplete items when a task is marked as complete.
	 * Captures telemetry data about unfinished progress items to help improve the focus chain system.
	 * @param modelId The model ID being used (for telemetry)
	 * @param provider The API provider being used (for telemetry)
	 * @requires this.focusChainSettings.enabled and this.taskState.currentFocusChainChecklist to exist
	 * @returns void - Sends telemetry data if incomplete items found, no return value
	 */
	public checkIncompleteProgressOnCompletion(modelId: string, provider: string) {
		if (this.focusChainSettings.enabled && this.taskState.currentFocusChainChecklist) {
			const { totalItems, completedItems } = parseFocusChainListCounts(this.taskState.currentFocusChainChecklist)

			// Only track if there are items and not all are marked as completed
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

	/**
	 * Performs cleanup operations when the focus chain manager is no longer needed.
	 * Cancels active file watchers and clears any pending debounce timers to prevent memory leaks.
	 * @requires No parameters needed
	 * @returns void - Cleans up timers and watchers, no return value
	 */
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
