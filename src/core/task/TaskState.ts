import { Anthropic } from "@anthropic-ai/sdk"
import { AssistantMessageContent } from "@core/assistant-message"
import { ClineAskResponse } from "@shared/WebviewMessage"
import type { ActivePlaceholderWorkflowSource } from "@/core/workflows/placeholder-workflow-step-details"
import type { ClineDefaultTool } from "@/shared/tools"
import type { ManagedWorkflowRunState } from "./managed-workflows/types"
import type {
	PendingResponseToolFollowup,
	ResponseToolFailureCause,
	ResponseToolFailureState,
	ResponseToolTurnBehavior,
} from "./tools/response/types"
import type { HookExecution } from "./types/HookExecution"

export class TaskState {
	// Task-level timing
	taskStartTimeMs = Date.now()
	taskFirstTokenTimeMs?: number

	// Streaming flags
	isStreaming = false
	isWaitingForFirstChunk = false
	didCompleteReadingStream = false

	// Content processing
	currentStreamingContentIndex = 0
	assistantMessageContent: AssistantMessageContent[] = []
	userMessageContent: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam | Anthropic.ToolResultBlockParam)[] = []
	userMessageContentReady = false
	// Map of tool names to their tool_use_id for creating proper ToolResultBlockParam
	toolUseIdMap: Map<string, string> = new Map()

	// Presentation locks
	presentAssistantMessageLocked = false
	presentAssistantMessageHasPendingUpdates = false

	// Ask/Response handling
	askResponse?: ClineAskResponse
	askResponseText?: string
	askResponseImages?: string[]
	askResponseFiles?: string[]
	lastMessageTs?: number

	// Plan mode specific state
	isAwaitingPlanResponse = false
	didRespondToPlanAskBySwitchingMode = false

	// Context and history
	conversationHistoryDeletedRange?: [number, number]

	// Tool execution flags
	didRejectTool = false
	didAlreadyUseTool = false
	didEditFile = false
	lastToolName = "" // Track last tool used for consecutive call detection
	activeResponseToolName?: ClineDefaultTool
	responseToolTurnShouldEnd = false
	responseToolTurnCompletedBy?: ClineDefaultTool
	pendingResponseToolFollowup?: PendingResponseToolFollowup
	responseToolFailureCount = 0
	lastFailedResponseTool?: ClineDefaultTool
	lastResponseToolFailureMessage?: string
	lastResponseToolFailureCause?: ResponseToolFailureCause

	// File read cache - tracks recent reads so repeated reads can return compact unchanged notices or diffs
	// instead of replaying the full file when the latest snapshot is still valid for this task.
	fileReadCache: Map<
		string,
		{
			readCount: number
			mtime: number
			imageBlock?: Anthropic.ImageBlockParam
			snapshotText?: string
		}
	> = new Map()

	// Error tracking
	consecutiveMistakeCount = 0
	doubleCheckCompletionPending = false
	didAutomaticallyRetryFailedApiRequest = false
	checkpointManagerErrorMessage?: string

	// Retry tracking for auto-retry feature
	autoRetryAttempts = 0

	// Task Initialization
	isInitialized = false
	activeAgentId?: string
	activeAgentSkillName?: string
	activeAgentInvokedSlashCommand?: string
	activeAgentJustActivated = false
	activeWorkflowId?: string
	activePlaceholderWorkflowId?: string
	activePlaceholderWorkflowSource?: ActivePlaceholderWorkflowSource
	activePlaceholderWorkflowStableValues?: Record<string, string>
	activePlaceholderWorkflowValues?: Record<string, string>
	activeWorkflowJustStarted = false
	managedWorkflowRun?: ManagedWorkflowRunState

	// Focus Chain / Todo List Management
	apiRequestCount = 0
	apiRequestsSinceLastTodoUpdate = 0
	turnsSinceFullPromptRefresh = 0
	currentFocusChainChecklist: string | null = null
	todoListWasUpdatedByUser = false

	// Task Abort / Cancellation
	abort = false
	didFinishAbortingStream = false
	abandoned = false
	didAttemptCompletionEndTask = false

	// Hook execution tracking for cancellation
	activeHookExecution?: HookExecution

	// Auto-context summarization
	currentlySummarizing = false
	lastAutoCompactTriggerIndex?: number

	markResponseToolTurnComplete(toolName: ClineDefaultTool, behavior: ResponseToolTurnBehavior): void {
		this.activeResponseToolName = undefined
		this.responseToolTurnCompletedBy = toolName
		this.responseToolTurnShouldEnd = behavior === "end_turn"
		this.didAttemptCompletionEndTask = toolName === "attempt_completion" && behavior === "end_turn"
	}

	consumeCompletedResponseTool(): ClineDefaultTool | undefined {
		if (!this.responseToolTurnShouldEnd || !this.responseToolTurnCompletedBy) {
			return undefined
		}

		const toolName = this.responseToolTurnCompletedBy
		this.responseToolTurnCompletedBy = undefined
		this.responseToolTurnShouldEnd = false
		this.didAttemptCompletionEndTask = false

		return toolName
	}

	setPendingResponseToolFollowup(followup: PendingResponseToolFollowup): void {
		const hasContent = !!(
			(followup.text && followup.text.trim().length > 0) ||
			(followup.images && followup.images.length > 0) ||
			(followup.files && followup.files.length > 0) ||
			(followup.hookContext && followup.hookContext.trim().length > 0)
		)

		this.pendingResponseToolFollowup = hasContent
			? {
					...followup,
					images: followup.images?.length ? [...followup.images] : undefined,
					files: followup.files?.length ? [...followup.files] : undefined,
				}
			: undefined
	}

	consumePendingResponseToolFollowup(): PendingResponseToolFollowup | undefined {
		if (!this.pendingResponseToolFollowup) {
			return undefined
		}

		const followup = this.pendingResponseToolFollowup
		this.pendingResponseToolFollowup = undefined
		return followup
	}

	recordResponseToolFailure(toolName: ClineDefaultTool, message: string, cause?: ResponseToolFailureCause): void {
		this.responseToolFailureCount += 1
		this.lastFailedResponseTool = toolName
		this.lastResponseToolFailureMessage = message
		this.lastResponseToolFailureCause = cause
	}

	getResponseToolFailureState(): ResponseToolFailureState {
		return {
			failureCount: this.responseToolFailureCount,
			lastFailedTool: this.lastFailedResponseTool,
			lastFailureMessage: this.lastResponseToolFailureMessage,
			lastFailureCause: this.lastResponseToolFailureCause,
		}
	}

	clearResponseToolFailureState(): void {
		this.responseToolFailureCount = 0
		this.lastFailedResponseTool = undefined
		this.lastResponseToolFailureMessage = undefined
		this.lastResponseToolFailureCause = undefined
	}

	hasExhaustedResponseToolFailureBudget(): boolean {
		return this.responseToolFailureCount >= 2
	}

	clearResponseToolTurnState(): void {
		this.activeResponseToolName = undefined
		this.responseToolTurnShouldEnd = false
		this.responseToolTurnCompletedBy = undefined
		this.pendingResponseToolFollowup = undefined
		this.clearResponseToolFailureState()
		this.didAttemptCompletionEndTask = false
	}
}
