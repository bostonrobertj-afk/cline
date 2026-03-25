import { Anthropic } from "@anthropic-ai/sdk"
import { AssistantMessageContent } from "@core/assistant-message"
import { ClineAskResponse } from "@shared/WebviewMessage"
import type { ActivePlaceholderWorkflowSource } from "@/core/workflows/placeholder-workflow-step-details"
import type { ManagedWorkflowRunState } from "./managed-workflows/types"
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
	pendingAttemptCompletionFollowupText?: string
	pendingAttemptCompletionFollowupImages?: string[]
	pendingAttemptCompletionFollowupFiles?: string[]
	pendingAttemptCompletionFollowupHookContext?: string
	hasPendingAttemptCompletionFollowup = false

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

	setPendingAttemptCompletionFollowup(followup: {
		text?: string
		images?: string[]
		files?: string[]
		hookContext?: string
	}): void {
		this.pendingAttemptCompletionFollowupText = followup.text
		this.pendingAttemptCompletionFollowupImages = followup.images?.length ? [...followup.images] : undefined
		this.pendingAttemptCompletionFollowupFiles = followup.files?.length ? [...followup.files] : undefined
		this.pendingAttemptCompletionFollowupHookContext = followup.hookContext
		this.hasPendingAttemptCompletionFollowup = !!(
			(followup.text && followup.text.trim().length > 0) ||
			(followup.images && followup.images.length > 0) ||
			(followup.files && followup.files.length > 0) ||
			(followup.hookContext && followup.hookContext.trim().length > 0)
		)
	}

	consumePendingAttemptCompletionFollowup():
		| {
				text?: string
				images?: string[]
				files?: string[]
				hookContext?: string
		  }
		| undefined {
		if (!this.hasPendingAttemptCompletionFollowup) {
			return undefined
		}

		const followup = {
			text: this.pendingAttemptCompletionFollowupText,
			images: this.pendingAttemptCompletionFollowupImages,
			files: this.pendingAttemptCompletionFollowupFiles,
			hookContext: this.pendingAttemptCompletionFollowupHookContext,
		}

		this.clearPendingAttemptCompletionFollowup()
		this.didAttemptCompletionEndTask = false

		return followup
	}

	clearPendingAttemptCompletionFollowup(): void {
		this.pendingAttemptCompletionFollowupText = undefined
		this.pendingAttemptCompletionFollowupImages = undefined
		this.pendingAttemptCompletionFollowupFiles = undefined
		this.pendingAttemptCompletionFollowupHookContext = undefined
		this.hasPendingAttemptCompletionFollowup = false
	}
}
