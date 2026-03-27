import { Anthropic } from "@anthropic-ai/sdk"
import { AssistantMessageContent } from "@core/assistant-message"
import { ClineAskResponse } from "@shared/WebviewMessage"
import type { ActivePlaceholderWorkflowSource } from "@/core/workflows/placeholder-workflow-step-details"
import type { ThreadDisplayState } from "@/shared/ExtensionMessage"
import type { ClineDefaultTool } from "@/shared/tools"
import type { ManagedWorkflowRunState } from "./managed-workflows/types"
import type {
	PendingResponseToolFollowup,
	ResponseToolFailureCause,
	ResponseToolFailureState,
	ResponseToolTurnBehavior,
} from "./tools/response/types"
import type { HookExecution } from "./types/HookExecution"

export interface PendingSteerFeedback {
	text?: string
	images?: string[]
	files?: string[]
	ts: number
}

export interface PartialResponseToolPreview {
	key: string
	toolName: ClineDefaultTool
	sayType: string
	fingerprint: string
	messageTs?: number
	status: "streaming" | "completed" | "interrupted"
}

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
	completedResponseToolResultContent: (
		| Anthropic.TextBlockParam
		| Anthropic.ImageBlockParam
		| Anthropic.ToolResultBlockParam
	)[] = []
	userMessageContentReady = false
	// Map of tool names to their tool_use_id for creating proper ToolResultBlockParam
	toolUseIdMap: Map<string, string> = new Map()
	nativeToolCallIdsSeen: Set<string> = new Set()
	nativeToolCallIdsExecuted: Set<string> = new Set()
	nativeToolCallIdsSkipped: Set<string> = new Set()
	nativeToolCallIdsWithResults: Set<string> = new Set()
	nativeToolCallIdsBreakingPreviousResponseChain: Set<string> = new Set()

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
	responseToolThreadDisplayStateAfterTurnEnds?: ThreadDisplayState
	pendingResponseToolFollowup?: PendingResponseToolFollowup
	pendingSteerFeedback: PendingSteerFeedback[] = []
	partialResponseToolPreviews: Map<string, PartialResponseToolPreview> = new Map()
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
	completedNextStepUpdatesThisTurn = 0

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

	markResponseToolTurnComplete(
		toolName: ClineDefaultTool,
		behavior: ResponseToolTurnBehavior,
		threadDisplayStateAfterTurnEnds?: ThreadDisplayState,
	): void {
		this.activeResponseToolName = undefined
		this.responseToolTurnCompletedBy = toolName
		this.responseToolTurnShouldEnd = behavior === "end_turn"
		this.responseToolThreadDisplayStateAfterTurnEnds = threadDisplayStateAfterTurnEnds
		this.didAttemptCompletionEndTask = toolName === "attempt_completion" && behavior === "end_turn"
	}

	consumeCompletedResponseTool():
		| { toolName: ClineDefaultTool; threadDisplayStateAfterTurnEnds?: ThreadDisplayState }
		| undefined {
		if (!this.responseToolTurnShouldEnd || !this.responseToolTurnCompletedBy) {
			return undefined
		}

		const toolName = this.responseToolTurnCompletedBy
		const threadDisplayStateAfterTurnEnds = this.responseToolThreadDisplayStateAfterTurnEnds
		this.responseToolTurnCompletedBy = undefined
		this.responseToolTurnShouldEnd = false
		this.responseToolThreadDisplayStateAfterTurnEnds = undefined
		this.didAttemptCompletionEndTask = false

		return { toolName, threadDisplayStateAfterTurnEnds }
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

	peekPendingResponseToolFollowup(): PendingResponseToolFollowup | undefined {
		if (!this.pendingResponseToolFollowup) {
			return undefined
		}

		return {
			...this.pendingResponseToolFollowup,
			images: this.pendingResponseToolFollowup.images?.length ? [...this.pendingResponseToolFollowup.images] : undefined,
			files: this.pendingResponseToolFollowup.files?.length ? [...this.pendingResponseToolFollowup.files] : undefined,
		}
	}

	consumePendingResponseToolFollowup(): PendingResponseToolFollowup | undefined {
		if (!this.pendingResponseToolFollowup) {
			return undefined
		}

		const followup = this.pendingResponseToolFollowup
		this.pendingResponseToolFollowup = undefined
		return followup
	}

	enqueueSteerFeedback(feedback: Omit<PendingSteerFeedback, "ts"> & { ts?: number }): void {
		const hasContent = !!(
			(feedback.text && feedback.text.trim().length > 0) ||
			(feedback.images && feedback.images.length > 0) ||
			(feedback.files && feedback.files.length > 0)
		)
		if (!hasContent) {
			return
		}

		this.pendingSteerFeedback.push({
			text: feedback.text,
			images: feedback.images?.length ? [...feedback.images] : undefined,
			files: feedback.files?.length ? [...feedback.files] : undefined,
			ts: feedback.ts ?? Date.now(),
		})
	}

	hasPendingSteerFeedback(): boolean {
		return this.pendingSteerFeedback.length > 0
	}

	consumePendingSteerFeedback(): PendingSteerFeedback[] {
		if (this.pendingSteerFeedback.length === 0) {
			return []
		}

		const queuedFeedback = this.pendingSteerFeedback.map((feedback) => ({
			text: feedback.text,
			images: feedback.images?.length ? [...feedback.images] : undefined,
			files: feedback.files?.length ? [...feedback.files] : undefined,
			ts: feedback.ts,
		}))
		this.pendingSteerFeedback = []
		return queuedFeedback
	}

	clearNativeToolCallTracking(): void {
		this.nativeToolCallIdsSeen.clear()
		this.nativeToolCallIdsExecuted.clear()
		this.nativeToolCallIdsSkipped.clear()
		this.nativeToolCallIdsWithResults.clear()
		this.nativeToolCallIdsBreakingPreviousResponseChain.clear()
	}

	setPartialResponseToolPreview(preview: PartialResponseToolPreview): void {
		this.partialResponseToolPreviews.set(preview.key, preview)
	}

	getPartialResponseToolPreview(key: string): PartialResponseToolPreview | undefined {
		return this.partialResponseToolPreviews.get(key)
	}

	deletePartialResponseToolPreview(key: string): PartialResponseToolPreview | undefined {
		const existing = this.partialResponseToolPreviews.get(key)
		if (existing) {
			this.partialResponseToolPreviews.delete(key)
		}
		return existing
	}

	getAllPartialResponseToolPreviews(): PartialResponseToolPreview[] {
		return [...this.partialResponseToolPreviews.values()]
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
		this.responseToolThreadDisplayStateAfterTurnEnds = undefined
		this.pendingResponseToolFollowup = undefined
		this.partialResponseToolPreviews.clear()
		this.clearResponseToolFailureState()
		this.didAttemptCompletionEndTask = false
	}
}
