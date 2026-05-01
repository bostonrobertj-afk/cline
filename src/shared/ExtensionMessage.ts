// type that represents json data that is sent from extension to webview, called ExtensionMessage and has 'type' enum which can be 'plusButtonClicked' or 'settingsButtonClicked' or 'hello'

import { WorkspaceRoot } from "@shared/multi-root/types"
import { RemoteConfigFields } from "@shared/storage/state-keys"
import type { Environment } from "../config"
import { AutoApprovalSettings } from "./AutoApprovalSettings"
import { ApiConfiguration } from "./api"
import { BrowserSettings } from "./BrowserSettings"
import { ClineFeatureSetting } from "./ClineFeatureSetting"
import { BannerCardData } from "./cline/banner"
import { ClineRulesToggles } from "./cline-rules"
import { FocusChainSettings } from "./FocusChainSettings"
import { HistoryItem } from "./HistoryItem"
import { McpDisplayMode } from "./McpDisplayMode"
import { ClineMessageModelInfo } from "./messages"
import { OnboardingModelGroup } from "./proto/cline/state"
import { Mode } from "./storage/types"
import { TelemetrySetting } from "./TelemetrySetting"
import { UserInfo } from "./UserInfo"
// webview will hold state
export interface ExtensionMessage {
	type: "grpc_response" // New type for gRPC responses
	grpc_response?: GrpcResponse
}

export type GrpcResponse = {
	message?: any // JSON serialized protobuf message
	request_id: string // Same ID as the request
	error?: string // Optional error message
	is_streaming?: boolean // Whether this is part of a streaming response
	sequence_number?: number // For ordering chunks in streaming responses
}

export type Platform = "aix" | "darwin" | "freebsd" | "linux" | "openbsd" | "sunos" | "win32" | "unknown"

export const DEFAULT_PLATFORM = "unknown"

export const COMMAND_CANCEL_TOKEN = "__cline_command_cancel__"

export const ThreadDisplayStates = {
	ACTIVE_RUN: "active_run",
	ACTIVE_USER: "active_user",
	AWAITING_USER_RESPONSE: "awaiting_user_response",
	COMPLETED: "completed",
	IDLE_OPEN: "idle_open",
	PAUSED: "paused",
} as const

export type ThreadDisplayState = (typeof ThreadDisplayStates)[keyof typeof ThreadDisplayStates]

export const AwaitingUserResponseSubtypes = {
	USER: "user",
	SYSTEM: "system",
} as const

export type AwaitingUserResponseSubtype = (typeof AwaitingUserResponseSubtypes)[keyof typeof AwaitingUserResponseSubtypes]

export interface ExtensionState {
	isNewUser: boolean
	welcomeViewCompleted: boolean
	onboardingModels: OnboardingModelGroup | undefined
	apiConfiguration?: ApiConfiguration
	autoApprovalSettings: AutoApprovalSettings
	browserSettings: BrowserSettings
	remoteBrowserHost?: string
	preferredLanguage?: string
	mode: Mode
	checkpointManagerErrorMessage?: string
	clineMessages: ClineMessage[]
	currentTaskItem?: HistoryItem
	threadDisplayState?: ThreadDisplayState
	awaitingUserResponseSubtype?: AwaitingUserResponseSubtype
	currentFocusChainChecklist?: string | null
	mcpMarketplaceEnabled?: boolean
	mcpDisplayMode: McpDisplayMode
	planActSeparateModelsSetting: boolean
	enableCheckpointsSetting?: boolean
	platform: Platform
	environment?: Environment
	shouldShowAnnouncement: boolean
	taskHistory: HistoryItem[]
	telemetrySetting: TelemetrySetting
	shellIntegrationTimeout: number
	terminalReuseEnabled?: boolean
	terminalOutputLineLimit: number
	maxConsecutiveMistakes: number
	defaultTerminalProfile?: string
	vscodeTerminalExecutionMode: string
	backgroundCommandRunning?: boolean
	backgroundCommandTaskId?: string
	lastCompletedCommandTs?: number
	userInfo?: UserInfo
	version: string
	distinctId: string
	globalClineRulesToggles: ClineRulesToggles
	localClineRulesToggles: ClineRulesToggles
	localCursorRulesToggles: ClineRulesToggles
	localWindsurfRulesToggles: ClineRulesToggles
	remoteRulesToggles?: ClineRulesToggles
	localAgentsRulesToggles: ClineRulesToggles
	mcpResponsesCollapsed?: boolean
	strictPlanModeEnabled?: boolean
	yoloModeToggled?: boolean
	useAutoCondense?: boolean
	subagentsEnabled?: boolean
	clineWebToolsEnabled?: ClineFeatureSetting
	worktreesEnabled?: ClineFeatureSetting
	focusChainSettings: FocusChainSettings
	customPrompt?: string
	favoritedModelIds: string[]
	// NEW: Add workspace information
	workspaceRoots: WorkspaceRoot[]
	primaryRootIndex: number
	isMultiRootWorkspace: boolean
	multiRootSetting: ClineFeatureSetting
	lastDismissedInfoBannerVersion: number
	lastDismissedModelBannerVersion: number
	lastDismissedCliBannerVersion: number
	dismissedBanners?: Array<{ bannerId: string; dismissedAt: number }>
	hooksEnabled?: boolean
	remoteConfigSettings?: Partial<RemoteConfigFields>
	globalSkillsToggles?: Record<string, boolean>
	localSkillsToggles?: Record<string, boolean>
	nativeToolCallSetting?: boolean
	enableParallelToolCalling?: boolean
	promptRefreshFrequency?: number
	backgroundEditEnabled?: boolean
	optOutOfRemoteConfig?: boolean
	doubleCheckCompletionEnabled?: boolean
	banners?: BannerCardData[]
	welcomeBanners?: BannerCardData[]
	openAiCodexIsAuthenticated?: boolean
}

export interface ClineMessage {
	ts: number
	type: "ask" | "say"
	ask?: ClineAsk
	say?: ClineSay
	threadDisplayState?: ThreadDisplayState
	awaitingUserResponseSubtype?: AwaitingUserResponseSubtype
	text?: string
	reasoning?: string
	images?: string[]
	files?: string[]
	partial?: boolean
	commandCompleted?: boolean
	lastCheckpointHash?: string
	isCheckpointCheckedOut?: boolean
	isOperationOutsideWorkspace?: boolean
	conversationHistoryIndex?: number
	conversationHistoryDeletedRange?: [number, number] // for when conversation history is truncated for API requests
	modelInfo?: ClineMessageModelInfo
}

export type ClineAsk =
	| "followup"
	| "generate_plan_output"
	| "act_mode_respond"
	| "command"
	| "command_output"
	| "completion_result"
	| "tool"
	| "api_req_failed"
	| "resume_task"
	| "resume_completed_task"
	| "mistake_limit_reached"
	| "browser_action_launch"
	| "use_mcp_server"
	| "new_task"
	| "condense"
	| "summarize_task"
	| "report_bug"
	| "use_subagents"
	| "workflow_form"

export type ClineSay =
	| "task"
	| "error"
	| "error_retry"
	| "api_req_started"
	| "api_req_finished"
	| "text"
	| "reasoning"
	| "agent_feedback"
	| "completion_result"
	| "user_feedback"
	| "user_feedback_diff"
	| "api_req_retried"
	| "command"
	| "command_output"
	| "tool"
	| "shell_integration_warning"
	| "shell_integration_warning_with_suggestion"
	| "browser_action_launch"
	| "browser_action"
	| "browser_action_result"
	| "mcp_server_request_started"
	| "mcp_server_response"
	| "mcp_notification"
	| "use_mcp_server"
	| "diff_error"
	| "deleted_api_reqs"
	| "clineignore_error"
	| "command_permission_denied"
	| "checkpoint_created"
	| "load_mcp_documentation"
	| "generate_explanation"
	| "info" // Added for general informational messages like retry status
	| "hook_status"
	| "hook_output_stream"
	| "subagent"
	| "use_subagents"
	| "subagent_usage"
	| "conditional_rules_applied"
	| "workflow_form"
	| "workflow_step_resolution_status"

export interface ClineSayTool {
	tool:
		| "editedExistingFile"
		| "newFileCreated"
		| "fileDeleted"
		| "readFile"
		| "listFilesTopLevel"
		| "listFilesRecursive"
		| "listCodeDefinitionNames"
		| "searchFiles"
		| "webFetch"
		| "webSearch"
		| "summarizeTask"
		| "useSkill"
	path?: string
	diff?: string
	content?: string
	regex?: string
	filePattern?: string
	operationIsLocatedInWorkspace?: boolean
	/** Starting line numbers in the original file where each SEARCH block matched */
	startLineNumbers?: number[]
}

export interface ClineSayHook {
	hookName: string // Name of the hook (e.g., "PreToolUse", "PostToolUse")
	toolName?: string // Tool name if applicable (for PreToolUse/PostToolUse)
	status: "running" | "completed" | "failed" | "cancelled" // Execution status
	exitCode?: number // Exit code when completed
	hasJsonResponse?: boolean // Whether a JSON response was parsed
	// Pending tool information (only present during PreToolUse "running" status)
	pendingToolInfo?: {
		tool: string // Tool name (e.g., "write_to_file", "execute_command")
		path?: string // File path for file operations
		command?: string // Command for execute_command
		content?: string // Content preview (first 200 chars)
		diff?: string // Diff preview (first 200 chars)
		regex?: string // Regex pattern for search_files
		url?: string // URL for web_fetch or browser_action
		mcpTool?: string // MCP tool name
		mcpServer?: string // MCP server name
		resourceUri?: string // MCP resource URI
	}
	// Structured error information (only present when status is "failed")
	error?: {
		type: "timeout" | "validation" | "execution" | "cancellation" // Type of error
		message: string // User-friendly error message
		details?: string // Technical details for expansion
		scriptPath?: string // Path to the hook script
	}
}

export type HookOutputStreamMeta = {
	/** Which hook configuration the script originated from (global vs workspace). */
	source: "global" | "workspace"
	/** Full path to the hook script that emitted the output. */
	scriptPath: string
}

// must keep in sync with system prompt
export const browserActions = ["launch", "click", "type", "scroll_down", "scroll_up", "close"] as const
export type BrowserAction = (typeof browserActions)[number]

export interface ClineSayBrowserAction {
	action: BrowserAction
	coordinate?: string
	text?: string
}

export interface ClineSayGenerateExplanation {
	title: string
	fromRef: string
	toRef: string
	status: "generating" | "complete" | "error"
	error?: string
}

export type SubagentExecutionStatus = "pending" | "running" | "completed" | "failed"

export interface SubagentStatusItem {
	index: number
	prompt: string
	status: SubagentExecutionStatus
	toolCalls: number
	inputTokens: number
	outputTokens: number
	totalCost: number
	contextTokens: number
	contextWindow: number
	contextUsagePercentage: number
	latestToolCall?: string
	result?: string
	error?: string
}

export interface ClineSaySubagentStatus {
	subagentBatchId?: string
	status: "running" | "completed" | "failed"
	total: number
	completed: number
	successes: number
	failures: number
	toolCalls: number
	inputTokens: number
	outputTokens: number
	contextWindow: number
	maxContextTokens: number
	maxContextUsagePercentage: number
	items: SubagentStatusItem[]
}

export type BrowserActionResult = {
	screenshot?: string
	logs?: string
	currentUrl?: string
	currentMousePosition?: string
}

export interface ClineAskUseMcpServer {
	serverName: string
	type: "use_mcp_tool" | "access_mcp_resource"
	toolName?: string
	arguments?: string
	uri?: string
}

export interface ClineAskUseSubagents {
	subagentBatchId?: string
	prompts: string[]
}

export interface ClineSayAgentFeedback {
	label: "Real-Time Agent Feedback"
	message: string
	timestamp: string
	toolName: string
	taskId: string
	turnIdentifier: number
	apiCallIdentifier: number
}

export interface ClinePlanModeResponse {
	response: string
	options?: string[]
	selected?: string
}

export interface ClineAskQuestion {
	question: string
	options?: string[]
	selected?: string
}

export interface ClineAskNewTask {
	context: string
}

export type WorkflowFormFieldKind =
	| "dropdown"
	| "boolean"
	| "small_text"
	| "large_text"
	| "number"
	| "multi_select"
	| "radio_group"
	| "checkbox_group"
	| "date"
	| "date_time"
	| "file_path"
	| "directory_path"
	| "artifact_picker"
	| "markdown_display"
	| "static_notice"

export type WorkflowFormAllowedValueType = "string" | "boolean" | "integer" | "number" | "array" | "object"

export type WorkflowFormSelectionCardinality = "single" | "fixed_count" | "unbounded"

export type WorkflowFormPanelAction = "submit" | "cancel" | "back" | "retry"

export type WorkflowFormRenderState = "panel" | "failure" | "success"

export interface WorkflowFormOptionDefinition {
	value: string
	label: string
	description?: string
}

export type WorkflowFormJsonSchemaType = "string" | "integer" | "number" | "boolean" | "array" | "object"

export interface WorkflowFormJsonSchema {
	type: WorkflowFormJsonSchemaType
	enum?: string[]
	const?: string | number | boolean
	items?: WorkflowFormJsonSchema
	properties?: Record<string, WorkflowFormJsonSchema>
	required?: string[]
	additionalProperties?: WorkflowFormJsonSchema
	oneOf?: WorkflowFormJsonSchema[]
}

export interface WorkflowFormFieldPresentation {
	textareaSize?: "default" | "large"
}

export interface WorkflowFormSubmittedValueObjectEntry {
	key: string
	value: WorkflowFormSubmittedValuePayload
}

export interface WorkflowFormSubmittedValuePayload {
	valueType: WorkflowFormAllowedValueType
	stringValue?: string
	booleanValue?: boolean
	integerValue?: number
	numberValue?: number
	arrayValue?: WorkflowFormSubmittedValuePayload[]
	objectValue?: WorkflowFormSubmittedValueObjectEntry[]
}

export type WorkflowFormComparableValue = string | boolean | number

export interface WorkflowFormConditionDefinition {
	sourceKey: string
	operator?: "equals" | "not_equals" | "contains" | "not_contains" | "is_truthy" | "is_falsy"
	value?: WorkflowFormComparableValue
	values?: WorkflowFormComparableValue[]
}

export interface WorkflowFormConditionalOptionDefinition {
	when: WorkflowFormConditionDefinition
	options: WorkflowFormOptionDefinition[]
}

export interface WorkflowFormConditionalFieldOverrideDefinition {
	when: WorkflowFormConditionDefinition
	allowedValueType?: WorkflowFormAllowedValueType
	required?: boolean
	selectionCardinality?: WorkflowFormSelectionCardinality
	selectionCount?: number
	minimumSelectionCount?: number
	contentMarkdown?: string
}

export type WorkflowFormSelectorDiscoveryRoot =
	| {
			kind: "project_output_root"
	  }
	| {
			kind: "selected_project_root"
	  }

export interface WorkflowFormSelectorDiscoveryConfig {
	root: WorkflowFormSelectorDiscoveryRoot
	entryType: "file" | "directory" | "any"
	targetPathSegments?: string[]
	namingPattern?: string
	labelTemplate?: string
	immediateChildrenOnly: boolean
	sort: "alpha_asc" | "alpha_desc"
}

export interface WorkflowFormFieldDefinition {
	key: string
	workflowValueKey?: string
	kind: WorkflowFormFieldKind
	label: string
	helpText?: string
	required: boolean
	oneOfGroupId?: string
	allowedValueType?: WorkflowFormAllowedValueType
	placeholder?: string
	formatHint?: string
	options?: WorkflowFormOptionDefinition[]
	conditionalOptions?: WorkflowFormConditionalOptionDefinition[]
	conditionalFieldOverrides?: WorkflowFormConditionalFieldOverrideDefinition[]
	selectionCardinality?: WorkflowFormSelectionCardinality
	selectionCount?: number
	minimumSelectionCount?: number
	trueLabel?: string
	falseLabel?: string
	dependsOn?: string[]
	resetValueKeysOnChange?: string[]
	resetDataKeysOnChange?: string[]
	visible?: boolean
	visibilityCondition?: WorkflowFormConditionDefinition
	valueSchema?: WorkflowFormJsonSchema
	contentMarkdown?: string
	presentation?: WorkflowFormFieldPresentation
	selectorDiscovery?: WorkflowFormSelectorDiscoveryConfig
}

export type WorkflowFormTransitionDefinition =
	| {
			type: "sequential"
			nextPanelId: string
			staleValueKeysToClear?: string[]
			staleDataKeysToClear?: string[]
	  }
	| {
			type: "conditional"
			conditionSourceKey: string
			branches: Array<{
				matchValue: WorkflowFormComparableValue
				nextPanelId?: string
				terminal?: boolean
				staleValueKeysToClear?: string[]
				staleDataKeysToClear?: string[]
			}>
			defaultNextPanelId?: string
			defaultTerminal?: boolean
	  }

export interface WorkflowFormPanelDefinition {
	panelId: string
	title: string
	promptMarkdown: string
	fields: WorkflowFormFieldDefinition[]
	allowedActions: WorkflowFormPanelAction[]
	actionLabels?: Partial<Record<WorkflowFormPanelAction, string>>
	transition: WorkflowFormTransitionDefinition
	backDestinationPanelId?: string
	backStaleValueKeysToClear?: string[]
	backStaleDataKeysToClear?: string[]
}

export interface WorkflowFormDefinitionPayload {
	definitionVersion: number
	title: string
	toolDictionaryTitle: string
	toolDictionaryMarkdown: string
	firstPanelId: string
	panels: Record<string, WorkflowFormPanelDefinition>
}

export interface WorkflowFormResolvedPanelPayload {
	panelId: string
	title: string
	promptMarkdown: string
	fields: WorkflowFormFieldDefinition[]
	allowedActions: WorkflowFormPanelAction[]
	actionLabels?: Partial<Record<WorkflowFormPanelAction, string>>
}

export interface WorkflowForm {
	sessionId: string
	workflowFormId: string
	title: string
	toolDictionaryTitle: string
	toolDictionaryMarkdown: string
	renderState: WorkflowFormRenderState
	panel?: WorkflowFormResolvedPanelPayload
	values: Record<string, WorkflowFormSubmittedValuePayload>
	errorMessage?: string
	successMessage?: string
}

export type WorkflowStepResolutionStatusState = "pending" | "success" | "failure"

export interface WorkflowStepResolutionStatusDefinition {
	title: string
	pendingLabel: string
	successLabel: string
	failureLabel: string
}

export interface WorkflowStepResolutionStatusOwner {
	workflowName: string
	stepNumber: number
}

export interface ClineWorkflowStepResolutionStatus {
	sessionId: string
	definitionId: string
	owner: WorkflowStepResolutionStatusOwner
	state: WorkflowStepResolutionStatusState
	definition: WorkflowStepResolutionStatusDefinition
}

export interface ClineApiReqInfo {
	request?: string
	tokensIn?: number
	tokensOut?: number
	cacheWrites?: number
	cacheReads?: number
	cost?: number
	cancelReason?: ClineApiReqCancelReason
	streamingFailedMessage?: string
	retryStatus?: {
		attempt: number
		maxAttempts: number
		delaySec: number
		errorSnippet?: string
	}
}

export interface ClineSubagentUsageInfo {
	source: "subagents"
	tokensIn: number
	tokensOut: number
	cacheWrites: number
	cacheReads: number
	cost: number
}

export type ClineApiReqCancelReason = "streaming_failed" | "user_cancelled" | "retries_exhausted"

export const COMPLETION_RESULT_CHANGES_FLAG = "HAS_CHANGES"
