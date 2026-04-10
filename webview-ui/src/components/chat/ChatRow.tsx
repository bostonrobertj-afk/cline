import { COMMAND_OUTPUT_STRING } from "@shared/combineCommandSequences"
import {
	ClineApiReqInfo,
	ClineAskQuestion,
	ClineAskUseMcpServer,
	ClineMessage,
	ClinePlanModeResponse,
	ClineSayAgentFeedback,
	ClineSayGenerateExplanation,
	ClineSayTool,
	ClineWorkflowForm,
	ClineWorkflowStartCard,
	ClineWorkflowStepResolutionStatus,
	COMPLETION_RESULT_CHANGES_FLAG,
	WorkflowFormFieldDefinition,
	WorkflowFormSubmittedValuePayload,
} from "@shared/ExtensionMessage"
import { BooleanRequest, StringRequest } from "@shared/proto/cline/common"
import { WorkflowFormAction } from "@shared/proto/cline/task"
import { Mode } from "@shared/storage/types"
import deepEqual from "fast-deep-equal"
import {
	ArrowRightIcon,
	BellIcon,
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	CircleSlashIcon,
	CircleXIcon,
	FileCode2Icon,
	FilePlus2Icon,
	FoldVerticalIcon,
	ImageUpIcon,
	LightbulbIcon,
	Link2Icon,
	LoaderCircleIcon,
	PencilIcon,
	RefreshCwIcon,
	SearchIcon,
	SettingsIcon,
	SquareArrowOutUpRightIcon,
	SquareMinusIcon,
	TerminalIcon,
	TriangleAlertIcon,
} from "lucide-react"
import { MouseEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSize } from "react-use"
import { OptionsButtons } from "@/components/chat/OptionsButtons"
import { CheckmarkControl } from "@/components/common/CheckmarkControl"
import { WithCopyButton } from "@/components/common/CopyButton"
import McpResponseDisplay from "@/components/mcp/chat-display/McpResponseDisplay"
import McpResourceRow from "@/components/mcp/configuration/tabs/installed/server-row/McpResourceRow"
import McpToolRow from "@/components/mcp/configuration/tabs/installed/server-row/McpToolRow"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { cn } from "@/lib/utils"
import { FileServiceClient, UiServiceClient } from "@/services/grpc-client"
import { findMatchingResourceOrTemplate, getMcpServerDisplayName } from "@/utils/mcp"
import CodeAccordian, { cleanPathPrefix } from "../common/CodeAccordian"
import { CommandOutputContent, CommandOutputRow } from "./CommandOutputRow"
import { CompletionOutputRow } from "./CompletionOutputRow"
import { submitWorkflowForm, submitWorkflowStartCard } from "./chat-view/hooks/useMessageHandlers"
import { getActiveAssistantName } from "./chat-view/shared/assistantName"
import { isPassiveThreadOpen } from "./chat-view/shared/buttonConfig"
import { DiffEditRow } from "./DiffEditRow"
import ErrorRow from "./ErrorRow"
import { FeatureTip } from "./FeatureTip"
import HookMessage from "./HookMessage"
import { MarkdownRow } from "./MarkdownRow"
import NewTaskPreview from "./NewTaskPreview"
import PlanCompletionOutputRow from "./PlanCompletionOutputRow"
import QuoteButton from "./QuoteButton"
import ReportBugPreview from "./ReportBugPreview"
import { RequestStartRow } from "./RequestStartRow"
import SearchResultsDisplay from "./SearchResultsDisplay"
import SubagentStatusRow from "./SubagentStatusRow"
import { ThinkingRow } from "./ThinkingRow"
import UserMessage from "./UserMessage"
import { WorkflowPreparationStatusRow } from "./WorkflowPreparationStatusRow"

const HEADER_CLASSNAMES = "flex items-center gap-2.5 mb-3"

interface ChatRowProps {
	message: ClineMessage
	isExpanded: boolean
	onToggleExpand: (ts: number) => void
	lastModifiedMessage?: ClineMessage
	isLast: boolean
	onHeightChange: (isTaller: boolean) => void
	inputValue?: string
	sendMessageFromChatRow?: (text: string, images: string[], files: string[]) => void
	onSetQuote: (text: string) => void
	onCancelCommand?: () => void
	mode?: Mode
	reasoningContent?: string
	responseStarted?: boolean
	isRequestInProgress?: boolean
}

export interface QuoteButtonState {
	visible: boolean
	top: number
	left: number
	selectedText: string
}

interface ChatRowContentProps extends Omit<ChatRowProps, "onHeightChange"> {}

export const ProgressIndicator = () => <LoaderCircleIcon className="size-2 mr-2 animate-spin" />
const InvisibleSpacer = () => <div aria-hidden className="h-px" />

export const getFollowupPresentation = (messageText?: string, isPassiveThreadOpenState = false, assistantName = "Cline") => {
	let question: string | undefined
	let options: string[] | undefined
	let selected: string | undefined
	try {
		const parsedMessage = JSON.parse(messageText || "{}") as ClineAskQuestion
		question = parsedMessage.question
		options = parsedMessage.options
		selected = parsedMessage.selected
	} catch (_e) {
		// legacy messages would pass question directly
		question = messageText
	}

	const hasQuestion = !isPassiveThreadOpenState && !!question?.trim()

	return {
		question,
		options,
		selected,
		hasQuestion,
		title: hasQuestion ? `${assistantName} has a question:` : "Conversation reopened:",
	}
}

const createWorkflowFormInputValues = (values?: Record<string, WorkflowFormSubmittedValuePayload>) =>
	Object.fromEntries(Object.entries(values ?? {}).map(([key, value]) => [key, toWorkflowFormInputValue(value)])) as Record<
		string,
		unknown
	>

const toWorkflowFormInputValue = (value: WorkflowFormSubmittedValuePayload): unknown => {
	switch (value.valueType) {
		case "string":
			return value.stringValue ?? ""
		case "boolean":
			return value.booleanValue ?? false
		case "integer":
			return value.integerValue?.toString() ?? ""
		case "number":
			return value.numberValue?.toString() ?? ""
		case "array": {
			const normalizedArray = (value.arrayValue ?? []).map((entry) => toWorkflowFormInputValue(entry))
			return normalizedArray.every((entry) => typeof entry === "string")
				? normalizedArray
				: JSON.stringify(normalizedArray, null, 2)
		}
		case "object":
			return JSON.stringify(
				Object.fromEntries((value.objectValue ?? []).map((entry) => [entry.key, toWorkflowFormInputValue(entry.value)])),
				null,
				2,
			)
		default:
			return ""
	}
}

const getWorkflowFormTextValue = (value: unknown) => (typeof value === "string" ? value : "")

const getWorkflowFormStringArrayValue = (value: unknown) =>
	Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []

const isWorkflowFormFieldRequiredValueValid = (field: WorkflowFormFieldDefinition, values: Record<string, unknown>) => {
	const value = values[field.key]

	if (!field.required || field.kind === "markdown_display" || field.kind === "static_notice") {
		return true
	}

	switch (field.kind) {
		case "boolean":
			return typeof value === "boolean"
		case "multi_select":
		case "checkbox_group":
			return getWorkflowFormStringArrayValue(value).length > 0
		case "dropdown":
			if ((field.selectionCardinality ?? "single") === "single") {
				return getWorkflowFormTextValue(value).trim().length > 0
			}
			return getWorkflowFormStringArrayValue(value).length > 0
		case "radio_group":
			return getWorkflowFormTextValue(value).trim().length > 0
		case "number": {
			const textValue = getWorkflowFormTextValue(value).trim()
			if (textValue.length === 0) {
				return false
			}
			return field.allowedValueType === "integer" ? /^-?\d+$/.test(textValue) : !Number.isNaN(Number(textValue))
		}
		default:
			return getWorkflowFormTextValue(value).trim().length > 0
	}
}

const ChatRow = memo(
	(props: ChatRowProps) => {
		const { isLast, onHeightChange, message } = props
		// Store the previous height to compare with the current height
		// This allows us to detect changes without causing re-renders
		const prevHeightRef = useRef(0)

		const [chatrow, { height }] = useSize(
			<div className="relative pt-2.5 px-4">
				<ChatRowContent {...props} />
			</div>,
		)

		useEffect(() => {
			// used for partials command output etc.
			// NOTE: it's important we don't distinguish between partial or complete here since our scroll effects in chatview need to handle height change during partial -> complete
			const isInitialRender = prevHeightRef.current === 0 // prevents scrolling when new element is added since we already scroll for that
			// height starts off at Infinity
			if (isLast && height !== 0 && height !== Number.POSITIVE_INFINITY && height !== prevHeightRef.current) {
				if (!isInitialRender) {
					onHeightChange(height > prevHeightRef.current)
				}
				prevHeightRef.current = height
			}
		}, [height, isLast, onHeightChange, message])

		// we cannot return null as virtuoso does not support it so we use a separate visibleMessages array to filter out messages that should not be rendered
		return chatrow
	},
	// memo does shallow comparison of props, so we need to do deep comparison of arrays/objects whose properties might change
	deepEqual,
)

export default ChatRow

export const ChatRowContent = memo(
	({
		message,
		isExpanded,
		onToggleExpand,
		lastModifiedMessage,
		isLast,
		inputValue,
		sendMessageFromChatRow,
		onSetQuote,
		onCancelCommand,
		mode,
		isRequestInProgress,
		reasoningContent,
		responseStarted,
	}: ChatRowContentProps) => {
		const {
			backgroundEditEnabled,
			mcpServers,
			mcpMarketplaceCatalog,
			currentTaskItem,
			onRelinquishControl,
			vscodeTerminalExecutionMode,
			clineMessages,
		} = useExtensionState()
		const [seeNewChangesDisabled, setSeeNewChangesDisabled] = useState(false)
		const [explainChangesDisabled, setExplainChangesDisabled] = useState(false)
		const [quoteButtonState, setQuoteButtonState] = useState<QuoteButtonState>({
			visible: false,
			top: 0,
			left: 0,
			selectedText: "",
		})
		const contentRef = useRef<HTMLDivElement>(null)
		const threadDisplayState = (currentTaskItem as { threadDisplayState?: string | null } | undefined)?.threadDisplayState
		const isPassiveThreadOpenState = isPassiveThreadOpen(threadDisplayState)
		const assistantName = getActiveAssistantName(currentTaskItem)

		// Command output expansion state (for all messages, but only used by command messages)
		const [isOutputFullyExpanded, setIsOutputFullyExpanded] = useState(false)
		const prevCommandExecutingRef = useRef<boolean>(false)

		const hasAutoExpandedRef = useRef(false)
		const hasAutoCollapsedRef = useRef(false)
		const prevIsLastRef = useRef(isLast)

		// Auto-expand completion output when it's the last message (runs once per message)
		useEffect(() => {
			const isCompletionResult = message.ask === "completion_result" || message.say === "completion_result"

			// Auto-expand if it's last and we haven't already auto-expanded
			if (isLast && isCompletionResult && !hasAutoExpandedRef.current) {
				hasAutoExpandedRef.current = true
				hasAutoCollapsedRef.current = false // Reset the auto-collapse flag when expanding
			}
		}, [isLast, message.ask, message.say])

		// Auto-collapse completion output ONCE when transitioning from last to not-last
		useEffect(() => {
			const isCompletionResult = message.ask === "completion_result" || message.say === "completion_result"
			const wasLast = prevIsLastRef.current

			// Only auto-collapse if transitioning from last to not-last, and we haven't already auto-collapsed
			if (wasLast && !isLast && isCompletionResult && !hasAutoCollapsedRef.current) {
				hasAutoCollapsedRef.current = true
				hasAutoExpandedRef.current = false // Reset the auto-expand flag when collapsing
			}

			prevIsLastRef.current = isLast
		}, [isLast, message.ask, message.say])

		const [cost, apiReqCancelReason, apiReqStreamingFailedMessage] = useMemo(() => {
			if (message.text != null && message.say === "api_req_started") {
				const info: ClineApiReqInfo = JSON.parse(message.text)
				return [info.cost, info.cancelReason, info.streamingFailedMessage, info.retryStatus]
			}
			return [undefined, undefined, undefined, undefined, undefined]
		}, [message.text, message.say])

		// when resuming task last won't be api_req_failed but a resume_task message so api_req_started will show loading spinner. that's why we just remove the last api_req_started that failed without streaming anything
		const apiRequestFailedMessage =
			isLast && lastModifiedMessage?.ask === "api_req_failed" // if request is retried then the latest message is a api_req_retried
				? lastModifiedMessage?.text
				: undefined

		const type = message.type === "ask" ? message.ask : message.say
		const workflowStartCard = useMemo(() => {
			const isWorkflowStartCardMessage = message.type === "ask" && message.ask === "workflow_start_card"
			if (!isWorkflowStartCardMessage || !message.text) {
				return undefined
			}

			try {
				return JSON.parse(message.text) as ClineWorkflowStartCard
			} catch (error) {
				console.error("Failed to parse workflow start card payload:", error)
				return undefined
			}
		}, [message.ask, message.text, message.type])
		const workflowForm = useMemo(() => {
			const isWorkflowFormMessage =
				(message.type === "ask" && message.ask === "workflow_form") ||
				(message.type === "say" && message.say === "workflow_form")
			if (!isWorkflowFormMessage || !message.text) {
				return undefined
			}

			try {
				return JSON.parse(message.text) as ClineWorkflowForm
			} catch (error) {
				console.error("Failed to parse workflow form payload:", error)
				return undefined
			}
		}, [message.ask, message.say, message.text, message.type])
		const workflowStepResolutionStatus = useMemo(() => {
			const isWorkflowStepResolutionStatusMessage =
				message.type === "say" && message.say === "workflow_step_resolution_status"
			if (!isWorkflowStepResolutionStatusMessage || !message.text) {
				return undefined
			}

			try {
				return JSON.parse(message.text) as ClineWorkflowStepResolutionStatus
			} catch (error) {
				console.error("Failed to parse workflow step resolution status payload:", error)
				return undefined
			}
		}, [message.say, message.text, message.type])
		const [workflowStartCardSubmissionPending, setWorkflowStartCardSubmissionPending] = useState(false)
		const [workflowFormValues, setWorkflowFormValues] = useState<Record<string, unknown>>({})
		const [workflowFormSubmissionPending, setWorkflowFormSubmissionPending] = useState(false)
		const [isWorkflowDictionaryOpen, setIsWorkflowDictionaryOpen] = useState(false)

		useEffect(() => {
			setWorkflowStartCardSubmissionPending(false)
		}, [workflowStartCard])

		useEffect(() => {
			if (!workflowForm) {
				setWorkflowFormValues({})
				setWorkflowFormSubmissionPending(false)
				return
			}

			setWorkflowFormValues(createWorkflowFormInputValues(workflowForm.values))
			setWorkflowFormSubmissionPending(false)
		}, [workflowForm])

		const isCommandMessage = type === "command"
		// Check if command has output to determine if it's actually executing
		const commandHasOutput = message.text?.includes(COMMAND_OUTPUT_STRING) ?? false
		// A command is executing if it has output but hasn't completed yet
		const isCommandExecuting = isCommandMessage && !message.commandCompleted && commandHasOutput
		// A command is pending if it hasn't started (no output) and hasn't completed
		const isCommandPending = isCommandMessage && isLast && !message.commandCompleted && !commandHasOutput
		const isCommandCompleted = isCommandMessage && message.commandCompleted === true

		const isMcpServerResponding = isLast && lastModifiedMessage?.say === "mcp_server_request_started"
		const workflowFormPanel = workflowForm?.renderState === "success" ? undefined : workflowForm?.panel
		const visibleWorkflowFormFields = workflowFormPanel?.fields ?? []
		const isWorkflowFormSubmitDisabled = visibleWorkflowFormFields
			.filter((field) => field.kind !== "markdown_display" && field.kind !== "static_notice")
			.some((field) => !isWorkflowFormFieldRequiredValueValid(field, workflowFormValues))

		const handleToggle = useCallback(() => {
			onToggleExpand(message.ts)
		}, [onToggleExpand, message.ts])

		// Use the onRelinquishControl hook instead of message event
		useEffect(() => {
			return onRelinquishControl(() => {
				setSeeNewChangesDisabled(false)
				setExplainChangesDisabled(false)
			})
		}, [onRelinquishControl])

		// --- Quote Button Logic ---
		// MOVE handleQuoteClick INSIDE ChatRowContent
		const handleQuoteClick = useCallback(() => {
			onSetQuote(quoteButtonState.selectedText)
			window.getSelection()?.removeAllRanges() // Clear the browser selection
			setQuoteButtonState({ visible: false, top: 0, left: 0, selectedText: "" })
		}, [onSetQuote, quoteButtonState.selectedText]) // <-- Use onSetQuote from props

		const handleMouseUp = useCallback((event: MouseEvent<HTMLDivElement>) => {
			// Get the target element immediately, before the timeout
			const targetElement = event.target as Element
			const isClickOnButton = !!targetElement.closest(".quote-button-class")

			// Delay the selection check slightly
			setTimeout(() => {
				// Now, check the selection state *after* the browser has likely updated it
				const selection = window.getSelection()
				const selectedText = selection?.toString().trim() ?? ""

				let shouldShowButton = false
				let buttonTop = 0
				let buttonLeft = 0
				let textToQuote = ""

				// Condition 1: Check if there's a valid, non-collapsed selection within bounds
				// Ensure contentRef.current still exists in case component unmounted during timeout
				if (selectedText && contentRef.current && selection && selection.rangeCount > 0 && !selection.isCollapsed) {
					const range = selection.getRangeAt(0)
					const rangeRect = range.getBoundingClientRect()
					// Re-check ref inside timeout and ensure containerRect is valid
					const containerRect = contentRef.current?.getBoundingClientRect()

					if (containerRect) {
						// Check if containerRect was successfully obtained
						const tolerance = 5 // Allow for a small pixel overflow (e.g., for margins)
						const isSelectionWithin =
							rangeRect.top >= containerRect.top &&
							rangeRect.left >= containerRect.left &&
							rangeRect.bottom <= containerRect.bottom + tolerance && // Added tolerance
							rangeRect.right <= containerRect.right

						if (isSelectionWithin) {
							shouldShowButton = true // Mark that we should show the button
							const buttonHeight = 30
							// Calculate the raw top position relative to the container, placing it above the selection
							const calculatedTop = rangeRect.top - containerRect.top - buttonHeight - 5 // Subtract button height and a small margin
							// Allow the button to potentially have a negative top value
							buttonTop = calculatedTop
							buttonLeft = Math.max(0, rangeRect.left - containerRect.left) // Still prevent going left of container
							textToQuote = selectedText
						}
					}
				}

				// Decision: Set the state based on whether we should show or hide
				if (shouldShowButton) {
					// Scenario A: Valid selection exists -> Show button
					setQuoteButtonState({
						visible: true,
						top: buttonTop,
						left: buttonLeft,
						selectedText: textToQuote,
					})
				} else if (!isClickOnButton) {
					// Scenario B: No valid selection AND click was NOT on button -> Hide button
					setQuoteButtonState({ visible: false, top: 0, left: 0, selectedText: "" })
				}
				// Scenario C (Click WAS on button): Do nothing here, handleQuoteClick takes over.
			}, 0) // Delay of 0ms pushes execution after current event cycle
		}, []) // Dependencies remain empty

		const followupPresentation = useMemo(
			() => getFollowupPresentation(message.text, isPassiveThreadOpenState, assistantName),
			[assistantName, message.text, isPassiveThreadOpenState],
		)

		const [icon, title] = useMemo(() => {
			switch (type) {
				case "error":
					return [
						<span className="codicon codicon-error text-error mb-[-1.5px]" />,
						<span className="text-error font-bold">Error</span>,
					]
				case "mistake_limit_reached":
					return [
						<CircleXIcon className="text-error size-2" />,
						<span className="text-error font-bold">Cline is having trouble...</span>,
					]
				case "command":
					return [
						<TerminalIcon className="text-foreground size-2" />,
						<span className="font-bold text-foreground">Cline wants to execute this command:</span>,
					]
				case "use_mcp_server":
					const mcpServerUse = JSON.parse(message.text || "{}") as ClineAskUseMcpServer
					return [
						isMcpServerResponding ? (
							<ProgressIndicator />
						) : (
							<span className="codicon codicon-server text-foreground mb-[-1.5px]" />
						),
						<span className="ph-no-capture font-bold text-foreground break-words">
							Cline wants to {mcpServerUse.type === "use_mcp_tool" ? "use a tool" : "access a resource"} on the{" "}
							<code className="break-all">
								{getMcpServerDisplayName(mcpServerUse.serverName, mcpMarketplaceCatalog)}
							</code>{" "}
							MCP server:
						</span>,
					]
				case "completion_result":
					return [
						<span className="codicon codicon-check text-success mb-[-1.5px]" />,
						<span className="text-success font-bold">Task Completed</span>,
					]
				case "api_req_started":
					// API request rows no longer render the request payload/cost accordion.
					// Thinking/reasoning is handled directly in the api_req_started renderer below.
					return [null, null]
				case "followup":
					return [
						followupPresentation.hasQuestion ? (
							<span className="codicon codicon-question text-foreground mb-[-1.5px]" />
						) : (
							<BellIcon className="text-foreground size-2" />
						),
						<span className="font-bold text-foreground">{followupPresentation.title}</span>,
					]
				default:
					return [null, null]
			}
		}, [
			type,
			cost,
			apiRequestFailedMessage,
			isCommandExecuting,
			isCommandPending,
			apiReqCancelReason,
			isMcpServerResponding,
			message.text,
			followupPresentation.hasQuestion,
			followupPresentation.title,
		])

		const handleWorkflowFormFieldChange = useCallback((key: string, value: unknown) => {
			setWorkflowFormValues((currentValues) => ({
				...currentValues,
				[key]: value,
			}))
		}, [])

		const handleWorkflowStartCardContinue = useCallback(async () => {
			if (!workflowStartCard || workflowStartCardSubmissionPending) {
				return
			}

			setWorkflowStartCardSubmissionPending(true)
			try {
				await submitWorkflowStartCard(workflowStartCard)
			} catch (error) {
				console.error("Failed to submit workflow start card:", error)
				setWorkflowStartCardSubmissionPending(false)
			}
		}, [workflowStartCard, workflowStartCardSubmissionPending])

		const handleWorkflowFormAction = useCallback(
			async (action: WorkflowFormAction, values?: Record<string, unknown>) => {
				if (!workflowForm || workflowFormSubmissionPending) {
					return
				}

				setWorkflowFormSubmissionPending(true)
				try {
					await submitWorkflowForm(workflowForm, action, values)
				} catch (error) {
					console.error("Failed to submit workflow form:", error)
					setWorkflowFormSubmissionPending(false)
				}
			},
			[workflowForm, workflowFormSubmissionPending],
		)

		const handleWorkflowDictionaryOpen = useCallback(() => {
			if (!workflowForm) {
				return
			}

			setIsWorkflowDictionaryOpen(true)
		}, [workflowForm])

		const renderWorkflowStartCardContent = () => {
			if (!workflowStartCard) {
				return <InvisibleSpacer />
			}

			return (
				<div className="border border-editor-group-border rounded-xs bg-code/40 p-3">
					<div className={HEADER_CLASSNAMES}>
						<SettingsIcon className="size-2" />
						<span className="font-bold">System-owned startup:</span>
					</div>
					<div className="text-sm font-semibold">{workflowStartCard.title}</div>
					<div className="pt-2">
						<MarkdownRow markdown={workflowStartCard.markdownBody} />
					</div>
					<div className="pt-3">
						<button
							className="rounded-xs bg-button-background px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
							disabled={workflowStartCardSubmissionPending}
							onClick={() => {
								void handleWorkflowStartCardContinue()
							}}
							type="button">
							{workflowStartCard.ctaLabel}
						</button>
					</div>
				</div>
			)
		}

		const renderWorkflowFormContent = () => {
			if (!workflowForm) {
				return <InvisibleSpacer />
			}

			return (
				<div className="border border-editor-group-border rounded-xs bg-code/40 p-3">
					<div className={HEADER_CLASSNAMES}>
						<SettingsIcon className="size-2" />
						<span className="font-bold">System-owned form:</span>
					</div>
					<div className="text-sm font-semibold">{workflowForm.title}</div>
					{workflowForm.renderState !== "success" && workflowFormPanel && (
						<div className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							{workflowFormPanel.title}
						</div>
					)}
					<div className="pt-2">
						{workflowForm.renderState === "success" ? (
							workflowForm.successMessage ? (
								<MarkdownRow markdown={workflowForm.successMessage} />
							) : null
						) : workflowFormPanel ? (
							<MarkdownRow markdown={workflowFormPanel.promptMarkdown} />
						) : null}
					</div>
					{workflowForm.renderState === "failure" && workflowForm.errorMessage && (
						<div className="pt-3">
							<div className="rounded-xs border border-error/50 bg-error/10 px-3 py-2 text-sm text-foreground">
								{workflowForm.errorMessage}
							</div>
						</div>
					)}
					{workflowForm.renderState !== "success" && (
						<div className="pt-3">
							<button
								className="text-xs underline underline-offset-2 text-link disabled:opacity-50"
								disabled={workflowFormSubmissionPending}
								onClick={() => {
									void handleWorkflowDictionaryOpen()
								}}
								type="button">
								Open inputs reference
							</button>
							<Dialog
								onOpenChange={(open) => {
									if (!open) {
										setIsWorkflowDictionaryOpen(false)
									}
								}}
								open={isWorkflowDictionaryOpen}>
								<DialogContent className="max-h-[80vh] overflow-y-auto">
									<DialogHeader>
										<DialogTitle>{workflowForm.toolDictionaryTitle}</DialogTitle>
										<DialogDescription>
											Detailed Information Regarding This Workflow's Inputs.
										</DialogDescription>
									</DialogHeader>
									<MarkdownRow markdown={workflowForm.toolDictionaryMarkdown} />
								</DialogContent>
							</Dialog>
						</div>
					)}
					{workflowForm.renderState !== "success" && (
						<div className="pt-3 space-y-3">
							<div className="space-y-3">
								{visibleWorkflowFormFields.map((field) => renderWorkflowFormField(field))}
							</div>
							{workflowFormPanel && (
								<div className="flex flex-wrap gap-2">
									{workflowFormPanel.allowedActions
										.filter(
											(allowedAction) =>
												allowedAction !== "retry" || workflowForm.renderState === "failure",
										)
										.map((allowedAction) => {
											const isPrimary = allowedAction === "submit"
											const label =
												workflowFormPanel.actionLabels?.[allowedAction] ??
												(allowedAction === "submit"
													? "Submit"
													: allowedAction === "cancel"
														? "Cancel"
														: allowedAction === "back"
															? "Back"
															: "Retry")

											return (
												<button
													className={
														isPrimary
															? "rounded-xs bg-button-background px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
															: "rounded-xs border border-editor-group-border px-3 py-2 text-sm text-foreground disabled:opacity-50"
													}
													disabled={
														workflowFormSubmissionPending ||
														(allowedAction === "submit" && isWorkflowFormSubmitDisabled)
													}
													key={allowedAction}
													onClick={() => {
														void handleWorkflowFormAction(
															allowedAction === "submit"
																? WorkflowFormAction.SUBMIT
																: allowedAction === "cancel"
																	? WorkflowFormAction.CANCEL
																	: allowedAction === "back"
																		? WorkflowFormAction.BACK
																		: WorkflowFormAction.RETRY,
															workflowFormValues,
														)
													}}
													type="button">
													{label}
												</button>
											)
										})}
								</div>
							)}
						</div>
					)}
				</div>
			)
		}

		const renderWorkflowStepResolutionStatusContent = () => {
			if (!workflowStepResolutionStatus) {
				return <InvisibleSpacer />
			}

			const label =
				workflowStepResolutionStatus.state === "pending"
					? workflowStepResolutionStatus.definition.pendingLabel
					: workflowStepResolutionStatus.state === "success"
						? workflowStepResolutionStatus.definition.successLabel
						: workflowStepResolutionStatus.definition.failureLabel

			return <WorkflowPreparationStatusRow label={label} state={workflowStepResolutionStatus.state} />
		}

		const renderWorkflowFormField = useCallback(
			(field: WorkflowFormFieldDefinition) => {
				const textValue = getWorkflowFormTextValue(workflowFormValues[field.key])
				const arrayValue = getWorkflowFormStringArrayValue(workflowFormValues[field.key])
				const baseInputClassName =
					"w-full rounded-xs border border-editor-group-border bg-background px-3 py-2 text-sm text-foreground"

				if (field.kind === "markdown_display" || field.kind === "static_notice") {
					return (
						<div
							className="rounded-xs border border-editor-group-border/70 bg-background/60 px-3 py-2"
							key={field.key}>
							<div className="mb-1 text-xs font-semibold text-foreground">{field.label}</div>
							{field.helpText && <div className="mb-2 text-xs text-muted-foreground">{field.helpText}</div>}
							<MarkdownRow markdown={field.contentMarkdown ?? ""} />
						</div>
					)
				}

				return (
					<label className="block" key={field.key}>
						<div className="mb-1 text-xs font-semibold text-foreground">
							{field.label}
							{field.required && <span className="text-red-500">*</span>}
						</div>
						{field.helpText && <div className="mb-2 text-xs text-muted-foreground">{field.helpText}</div>}
						{(field.kind === "dropdown" || field.kind === "multi_select") && (
							<select
								aria-label={field.label}
								className={baseInputClassName}
								disabled={workflowFormSubmissionPending}
								multiple={field.kind === "multi_select" || (field.selectionCardinality ?? "single") !== "single"}
								onChange={(event) => {
									if (field.kind === "multi_select" || (field.selectionCardinality ?? "single") !== "single") {
										handleWorkflowFormFieldChange(
											field.key,
											Array.from(event.target.selectedOptions).map((option) => option.value),
										)
										return
									}
									handleWorkflowFormFieldChange(field.key, event.target.value)
								}}
								value={
									field.kind === "multi_select" || (field.selectionCardinality ?? "single") !== "single"
										? arrayValue
										: textValue
								}>
								{field.kind !== "multi_select" && (field.selectionCardinality ?? "single") === "single" && (
									<option value="">Select an option</option>
								)}
								{field.options?.map((option) => (
									<option key={option.value} value={option.value}>
										{option.description ? `${option.label} - ${option.description}` : option.label}
									</option>
								))}
							</select>
						)}
						{field.kind === "boolean" && (
							<select
								aria-label={field.label}
								className={baseInputClassName}
								disabled={workflowFormSubmissionPending}
								onChange={(event) => {
									if (event.target.value === "") {
										handleWorkflowFormFieldChange(field.key, undefined)
										return
									}
									handleWorkflowFormFieldChange(field.key, event.target.value === "true")
								}}
								value={
									typeof workflowFormValues[field.key] === "boolean"
										? String(workflowFormValues[field.key])
										: ""
								}>
								<option value="">Select an option</option>
								<option value="true">{field.trueLabel ?? "True"}</option>
								<option value="false">{field.falseLabel ?? "False"}</option>
							</select>
						)}
						{field.kind === "small_text" && (
							<input
								aria-label={field.label}
								className={baseInputClassName}
								disabled={workflowFormSubmissionPending}
								onChange={(event) => handleWorkflowFormFieldChange(field.key, event.target.value)}
								placeholder={field.placeholder}
								type="text"
								value={textValue}
							/>
						)}
						{field.kind === "large_text" && (
							<textarea
								aria-label={field.label}
								className={`${
									field.presentation?.textareaSize === "large" ? "min-h-48" : "min-h-24"
								} ${baseInputClassName}`}
								disabled={workflowFormSubmissionPending}
								onChange={(event) => handleWorkflowFormFieldChange(field.key, event.target.value)}
								placeholder={field.placeholder}
								value={textValue}
							/>
						)}
						{field.kind === "number" && (
							<input
								aria-label={field.label}
								className={baseInputClassName}
								disabled={workflowFormSubmissionPending}
								inputMode={field.allowedValueType === "integer" ? "numeric" : "decimal"}
								onChange={(event) => handleWorkflowFormFieldChange(field.key, event.target.value)}
								placeholder={field.placeholder}
								type="text"
								value={textValue}
							/>
						)}
						{field.kind === "radio_group" && (
							<div className="space-y-2">
								{field.options?.map((option) => (
									<label className="flex items-start gap-2 text-sm text-foreground" key={option.value}>
										<input
											checked={textValue === option.value}
											disabled={workflowFormSubmissionPending}
											name={field.key}
											onChange={() => handleWorkflowFormFieldChange(field.key, option.value)}
											type="radio"
										/>
										<span className="flex flex-col">
											<span>{option.label}</span>
											{option.description && (
												<span className="text-xs text-muted-foreground">{option.description}</span>
											)}
										</span>
									</label>
								))}
							</div>
						)}
						{field.kind === "checkbox_group" && (
							<div className="space-y-2">
								{field.options?.map((option) => (
									<label className="flex items-start gap-2 text-sm text-foreground" key={option.value}>
										<input
											checked={arrayValue.includes(option.value)}
											disabled={workflowFormSubmissionPending}
											onChange={(event) => {
												handleWorkflowFormFieldChange(
													field.key,
													event.target.checked
														? [...arrayValue, option.value]
														: arrayValue.filter((entry) => entry !== option.value),
												)
											}}
											type="checkbox"
										/>
										<span className="flex flex-col">
											<span>{option.label}</span>
											{option.description && (
												<span className="text-xs text-muted-foreground">{option.description}</span>
											)}
										</span>
									</label>
								))}
							</div>
						)}
						{(field.kind === "date" ||
							field.kind === "date_time" ||
							field.kind === "file_path" ||
							field.kind === "directory_path" ||
							field.kind === "artifact_picker") && (
							<input
								aria-label={field.label}
								className={baseInputClassName}
								disabled={workflowFormSubmissionPending}
								onChange={(event) => handleWorkflowFormFieldChange(field.key, event.target.value)}
								placeholder={field.placeholder ?? field.formatHint}
								type={field.kind === "date" ? "date" : field.kind === "date_time" ? "datetime-local" : "text"}
								value={textValue}
							/>
						)}
					</label>
				)
			},
			[handleWorkflowFormFieldChange, workflowFormSubmissionPending, workflowFormValues],
		)

		const tool = useMemo(() => {
			if (message.ask === "tool" || message.say === "tool") {
				return JSON.parse(message.text || "{}") as ClineSayTool
			}
			return null
		}, [message.ask, message.say, message.text])

		const conditionalRulesInfo = useMemo(() => {
			if (message.say !== "conditional_rules_applied" || !message.text) return null
			try {
				const parsed = JSON.parse(message.text) as unknown
				if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as any).rules)) {
					return null
				}
				return parsed as {
					rules: Array<{ name: string; matchedConditions: Record<string, string[]> }>
				}
			} catch {
				return null
			}
		}, [message.say, message.text])

		// Helper function to check if file is an image
		const isImageFile = (filePath: string): boolean => {
			const imageExtensions = [".png", ".jpg", ".jpeg", ".webp"]
			const extension = filePath.toLowerCase().split(".").pop()
			return extension ? imageExtensions.includes(`.${extension}`) : false
		}

		if (conditionalRulesInfo) {
			const names = conditionalRulesInfo.rules.map((r: { name: string }) => r.name).join(", ")
			return (
				<div className={HEADER_CLASSNAMES}>
					<span style={{ fontWeight: "bold" }}>Conditional rules applied:</span>
					<span className="ph-no-capture break-words whitespace-pre-wrap">{names}</span>
				</div>
			)
		}

		if (tool) {
			const colorMap = {
				red: "var(--vscode-errorForeground)",
				yellow: "var(--vscode-editorWarning-foreground)",
				green: "var(--vscode-charts-green)",
			}
			const toolIcon = (name: string, color?: string, rotation?: number, title?: string) => (
				<span
					className={`codicon codicon-${name} ph-no-capture`}
					style={{
						color: color ? colorMap[color as keyof typeof colorMap] || color : "var(--vscode-foreground)",
						marginBottom: "-1.5px",
						transform: rotation ? `rotate(${rotation}deg)` : undefined,
					}}
					title={title}
				/>
			)

			switch (tool.tool) {
				case "editedExistingFile":
					const content = tool?.content || ""
					const isApplyingPatch = content?.startsWith("%%bash") && !content.endsWith("*** End Patch\nEOF")
					const editToolTitle = isApplyingPatch
						? "Cline is creating patches to edit this file:"
						: "Cline wants to edit this file:"
					return (
						<div>
							<div className={HEADER_CLASSNAMES}>
								<PencilIcon className="size-2" />
								{tool.operationIsLocatedInWorkspace === false &&
									toolIcon("sign-out", "yellow", -90, "This file is outside of your workspace")}
								<span style={{ fontWeight: "bold" }}>{editToolTitle}</span>
							</div>
							{backgroundEditEnabled && tool.path && tool.content ? (
								<DiffEditRow
									isLoading={message.partial}
									patch={tool.content}
									path={tool.path}
									startLineNumbers={tool.startLineNumbers}
								/>
							) : (
								<CodeAccordian
									// isLoading={message.partial}
									code={tool.content}
									isExpanded={isExpanded}
									onToggleExpand={handleToggle}
									path={tool.path!}
								/>
							)}
						</div>
					)
				case "fileDeleted":
					return (
						<div>
							<div className={HEADER_CLASSNAMES}>
								<SquareMinusIcon className="size-2" />
								{tool.operationIsLocatedInWorkspace === false &&
									toolIcon("sign-out", "yellow", -90, "This file is outside of your workspace")}
								<span style={{ fontWeight: "bold" }}>Cline wants to delete this file:</span>
							</div>
							<CodeAccordian
								// isLoading={message.partial}
								code={tool.content}
								isExpanded={isExpanded}
								onToggleExpand={handleToggle}
								path={tool.path!}
							/>
						</div>
					)
				case "newFileCreated":
					return (
						<div>
							<div className={HEADER_CLASSNAMES}>
								<FilePlus2Icon className="size-2" />
								{tool.operationIsLocatedInWorkspace === false &&
									toolIcon("sign-out", "yellow", -90, "This file is outside of your workspace")}
								<span className="font-bold">Cline wants to create a new file:</span>
							</div>
							{backgroundEditEnabled && tool.path && tool.content ? (
								<DiffEditRow patch={tool.content} path={tool.path} startLineNumbers={tool.startLineNumbers} />
							) : (
								<CodeAccordian
									code={tool.content!}
									isExpanded={isExpanded}
									isLoading={message.partial}
									onToggleExpand={handleToggle}
									path={tool.path!}
								/>
							)}
						</div>
					)
				case "readFile":
					const isImage = isImageFile(tool.path || "")
					return (
						<div>
							<div className={HEADER_CLASSNAMES}>
								{isImage ? <ImageUpIcon className="size-2" /> : <FileCode2Icon className="size-2" />}
								{tool.operationIsLocatedInWorkspace === false &&
									toolIcon("sign-out", "yellow", -90, "This file is outside of your workspace")}
								<span className="font-bold">Cline wants to read this file:</span>
							</div>
							<div className="bg-code rounded-sm overflow-hidden border border-editor-group-border">
								<div
									className={cn("text-description flex items-center cursor-pointer select-none py-2 px-2.5", {
										"cursor-default select-text": isImage,
									})}
									onClick={() => {
										if (!isImage) {
											FileServiceClient.openFile(StringRequest.create({ value: tool.content })).catch(
												(err) => console.error("Failed to open file:", err),
											)
										}
									}}>
									{tool.path?.startsWith(".") && <span>.</span>}
									{tool.path && !tool.path.startsWith(".") && <span>/</span>}
									<span className="ph-no-capture whitespace-nowrap overflow-hidden text-ellipsis mr-2 text-left [direction: rtl]">
										{cleanPathPrefix(tool.path ?? "") + "\u200E"}
									</span>
									<div className="grow" />
									{!isImage && <SquareArrowOutUpRightIcon className="size-2" />}
								</div>
							</div>
						</div>
					)
				case "listFilesTopLevel":
					return (
						<div>
							<div className={HEADER_CLASSNAMES}>
								{toolIcon("folder-opened")}
								{tool.operationIsLocatedInWorkspace === false &&
									toolIcon("sign-out", "yellow", -90, "This is outside of your workspace")}
								<span style={{ fontWeight: "bold" }}>
									{message.type === "ask"
										? "Cline wants to view the top level files in this directory:"
										: "Cline viewed the top level files in this directory:"}
								</span>
							</div>
							<CodeAccordian
								code={tool.content!}
								isExpanded={isExpanded}
								language="shell-session"
								onToggleExpand={handleToggle}
								path={tool.path!}
							/>
						</div>
					)
				case "listFilesRecursive":
					return (
						<div>
							<div className={HEADER_CLASSNAMES}>
								{toolIcon("folder-opened")}
								{tool.operationIsLocatedInWorkspace === false &&
									toolIcon("sign-out", "yellow", -90, "This is outside of your workspace")}
								<span style={{ fontWeight: "bold" }}>
									{message.type === "ask"
										? "Cline wants to recursively view all files in this directory:"
										: "Cline recursively viewed all files in this directory:"}
								</span>
							</div>
							<CodeAccordian
								code={tool.content!}
								isExpanded={isExpanded}
								language="shell-session"
								onToggleExpand={handleToggle}
								path={tool.path!}
							/>
						</div>
					)
				case "listCodeDefinitionNames":
					return (
						<div>
							<div className={HEADER_CLASSNAMES}>
								{toolIcon("file-code")}
								{tool.operationIsLocatedInWorkspace === false &&
									toolIcon("sign-out", "yellow", -90, "This file is outside of your workspace")}
								<span style={{ fontWeight: "bold" }}>
									{message.type === "ask"
										? "Cline wants to view source code definition names used in this directory:"
										: "Cline viewed source code definition names used in this directory:"}
								</span>
							</div>
							<CodeAccordian
								code={tool.content!}
								isExpanded={isExpanded}
								onToggleExpand={handleToggle}
								path={tool.path!}
							/>
						</div>
					)
				case "searchFiles":
					return (
						<div>
							<div className={HEADER_CLASSNAMES}>
								{toolIcon("search")}
								{tool.operationIsLocatedInWorkspace === false &&
									toolIcon("sign-out", "yellow", -90, "This is outside of your workspace")}
								<span className="font-bold">
									Cline wants to search this directory for <code className="break-all">{tool.regex}</code>:
								</span>
							</div>
							<SearchResultsDisplay
								content={tool.content!}
								filePattern={tool.filePattern}
								isExpanded={isExpanded}
								onToggleExpand={handleToggle}
								path={tool.path!}
							/>
						</div>
					)
				case "summarizeTask":
					return (
						<div>
							<div className={HEADER_CLASSNAMES}>
								<FoldVerticalIcon className="size-2" />
								<span className="font-bold">Cline is condensing the conversation:</span>
							</div>
							<div className="bg-code overflow-hidden border border-editor-group-border rounded-[3px]">
								<div
									aria-label={isExpanded ? "Collapse summary" : "Expand summary"}
									className="text-description py-2 px-2.5 cursor-pointer select-none"
									onClick={handleToggle}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault()
											e.stopPropagation()
											handleToggle()
										}
									}}
									tabIndex={0}>
									{isExpanded ? (
										<div>
											<div className="flex items-center mb-2">
												<span className="font-bold mr-1">Summary:</span>
												<div className="grow" />
												<ChevronDownIcon className="my-0.5 shrink-0 size-4" />
											</div>
											<span className="ph-no-capture break-words whitespace-pre-wrap">{tool.content}</span>
										</div>
									) : (
										<div className="flex items-center">
											<span className="ph-no-capture whitespace-nowrap overflow-hidden text-ellipsis text-left flex-1 mr-2 [direction:rtl]">
												{tool.content + "\u200E"}
											</span>
											<ChevronRightIcon className="my-0.5 shrink-0 size-4" />
										</div>
									)}
								</div>
							</div>
						</div>
					)
				case "webFetch":
					return (
						<div>
							<div className={HEADER_CLASSNAMES}>
								<Link2Icon className="size-2" />
								{tool.operationIsLocatedInWorkspace === false &&
									toolIcon("sign-out", "yellow", -90, "This URL is external")}
								<span className="font-bold">
									{message.type === "ask"
										? "Cline wants to fetch content from this URL:"
										: "Cline fetched content from this URL:"}
								</span>
							</div>
							<div
								className="bg-code rounded-xs overflow-hidden border border-editor-group-border py-2 px-2.5 cursor-pointer select-none"
								onClick={() => {
									// Open the URL in the default browser using gRPC
									if (tool.path) {
										UiServiceClient.openUrl(StringRequest.create({ value: tool.path })).catch((err) => {
											console.error("Failed to open URL:", err)
										})
									}
								}}>
								<span className="ph-no-capture whitespace-nowrap overflow-hidden text-ellipsis mr-2 [direction:rtl] text-left text-link underline">
									{tool.path + "\u200E"}
								</span>
							</div>
						</div>
					)
				case "webSearch":
					return (
						<div>
							<div className={HEADER_CLASSNAMES}>
								<SearchIcon className="size-2 rotate-90" />
								{tool.operationIsLocatedInWorkspace === false &&
									toolIcon("sign-out", "yellow", -90, "This search is external")}
								<span className="font-bold">
									{message.type === "ask"
										? "Cline wants to search the web for:"
										: "Cline searched the web for:"}
								</span>
							</div>
							<div className="bg-code border border-editor-group-border overflow-hidden rounded-xs select-text py-[9px] px-2.5">
								<span className="ph-no-capture whitespace-nowrap overflow-hidden text-ellipsis mr-2 text-left [direction:rtl]">
									{tool.path + "\u200E"}
								</span>
							</div>
						</div>
					)
				case "useSkill":
					return (
						<div>
							<div className={HEADER_CLASSNAMES}>
								<LightbulbIcon className="size-2" />
								<span className="font-bold">Cline loaded the skill:</span>
							</div>
							<div className="bg-code border border-editor-group-border overflow-hidden rounded-xs py-[9px] px-2.5">
								<span className="ph-no-capture font-medium">{tool.path}</span>
							</div>
						</div>
					)
				default:
					return <InvisibleSpacer />
			}
		}

		// Reset output expansion state when command stops (completes or is cancelled)
		useEffect(() => {
			// If command was executing and now isn't, clean up
			if (isCommandMessage && prevCommandExecutingRef.current && !isCommandExecuting) {
				setIsOutputFullyExpanded(false)
			}

			// Update ref for next render
			prevCommandExecutingRef.current = isCommandExecuting
		}, [isCommandMessage, isCommandExecuting])

		// Auto-expand when command starts executing (only if running > 500ms)
		useEffect(() => {
			if (isCommandMessage && isCommandExecuting && !isExpanded) {
				// Wait 500ms before auto-expanding to avoid animating fast commands
				const timer = setTimeout(() => {
					// Expand after 500ms
					onToggleExpand(message.ts)
				}, 500)

				return () => clearTimeout(timer)
			}
		}, [isCommandMessage, isCommandExecuting, isExpanded, onToggleExpand, message.ts])

		if (message.ask === "command" || message.say === "command") {
			return (
				<CommandOutputRow
					icon={icon}
					isBackgroundExec={vscodeTerminalExecutionMode === "backgroundExec"}
					isCommandCompleted={isCommandCompleted}
					isCommandExecuting={isCommandExecuting}
					isCommandPending={isCommandPending}
					isOutputFullyExpanded={isOutputFullyExpanded}
					message={message}
					onCancelCommand={onCancelCommand}
					setIsOutputFullyExpanded={setIsOutputFullyExpanded}
					title={title}
				/>
			)
		}

		if (message.ask === "use_subagents" || message.say === "use_subagents") {
			return <SubagentStatusRow isLast={isLast} lastModifiedMessage={lastModifiedMessage} message={message} />
		}

		if (message.ask === "use_mcp_server" || message.say === "use_mcp_server") {
			const useMcpServer = JSON.parse(message.text || "{}") as ClineAskUseMcpServer
			const server = mcpServers.find((server) => server.name === useMcpServer.serverName)
			return (
				<div>
					<div className={HEADER_CLASSNAMES}>
						{icon}
						{title}
					</div>

					<div className="bg-code rounded-xs py-2 px-2.5 mt-2">
						{useMcpServer.type === "access_mcp_resource" && (
							<McpResourceRow
								item={{
									...(findMatchingResourceOrTemplate(
										useMcpServer.uri || "",
										server?.resources,
										server?.resourceTemplates,
									) || {
										name: "",
										mimeType: "",
										description: "",
									}),
									uri: useMcpServer.uri || "",
								}}
							/>
						)}

						{useMcpServer.type === "use_mcp_tool" && (
							<div>
								<div onClick={(e) => e.stopPropagation()}>
									<McpToolRow
										serverName={useMcpServer.serverName}
										tool={{
											name: useMcpServer.toolName || "",
											description:
												server?.tools?.find((tool) => tool.name === useMcpServer.toolName)?.description ||
												"",
											autoApprove:
												server?.tools?.find((tool) => tool.name === useMcpServer.toolName)?.autoApprove ||
												false,
										}}
									/>
								</div>
								{useMcpServer.arguments && useMcpServer.arguments !== "{}" && (
									<div className="mt-2">
										<div className="mb-1 opacity-80 uppercase">Arguments</div>
										<CodeAccordian
											code={useMcpServer.arguments}
											isExpanded={true}
											language="json"
											onToggleExpand={handleToggle}
										/>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)
		}

		switch (message.type) {
			case "say":
				switch (message.say) {
					case "api_req_started":
						return (
							<RequestStartRow
								apiReqStreamingFailedMessage={apiReqStreamingFailedMessage}
								apiRequestFailedMessage={apiRequestFailedMessage}
								clineMessages={clineMessages}
								cost={cost}
								handleToggle={handleToggle}
								isExpanded={isExpanded}
								message={message}
								mode={mode}
								reasoningContent={reasoningContent}
								responseStarted={responseStarted}
							/>
						)
					case "api_req_finished":
						return <InvisibleSpacer /> // we should never see this message type
					case "mcp_server_response":
						return <McpResponseDisplay responseText={message.text || ""} />
					case "mcp_notification":
						return (
							<div className="flex items-start gap-2 py-2.5 px-3 bg-quote rounded-sm text-base text-foreground opacity-90 mb-2">
								<BellIcon className="mt-0.5 size-2 text-notification-foreground shrink-0" />
								<div className="break-words flex-1">
									<span className="font-medium">MCP Notification: </span>
									<span className="ph-no-capture">{message.text}</span>
								</div>
							</div>
						)
					case "text": {
						return (
							<WithCopyButton
								onMouseUp={handleMouseUp}
								position="bottom-right"
								ref={contentRef}
								textToCopy={message.text}>
								<div className="flex items-center">
									<div className={cn("flex-1 min-w-0 pl-1")}>
										<MarkdownRow markdown={message.text} showCursor={false} />
									</div>
								</div>
								{quoteButtonState.visible && (
									<QuoteButton
										left={quoteButtonState.left}
										onClick={handleQuoteClick}
										top={quoteButtonState.top}
									/>
								)}
							</WithCopyButton>
						)
					}
					case "reasoning": {
						const isReasoningStreaming = message.partial === true
						const hasReasoningText = !!message.text?.trim()
						// Show feature tips throughout the entire thinking/reasoning phase
						const showFeatureTip = isReasoningStreaming
						return (
							<div>
								<ThinkingRow
									isExpanded={(isReasoningStreaming && hasReasoningText) || isExpanded}
									isStreaming={isReasoningStreaming}
									isVisible={true}
									onToggle={isReasoningStreaming ? undefined : handleToggle}
									reasoningContent={message.text}
									showChevron={!isReasoningStreaming || hasReasoningText}
									showTitle={true}
									title={isReasoningStreaming ? "Thinking..." : "Thinking"}
								/>
								{isReasoningStreaming && <FeatureTip />}
							</div>
						)
					}
					case "agent_feedback": {
						try {
							const agentFeedback = JSON.parse(message.text || "{}") as ClineSayAgentFeedback
							return (
								<div className="text-sm py-1">
									<div className="font-semibold">Real-Time Agent Feedback</div>
									<div>{agentFeedback.message}</div>
								</div>
							)
						} catch {
							return <MarkdownRow markdown={message.text} />
						}
					}
					case "user_feedback":
						return (
							<UserMessage
								files={message.files}
								images={message.images}
								messageTs={message.ts}
								sendMessageFromChatRow={sendMessageFromChatRow}
								text={message.text}
							/>
						)
					case "user_feedback_diff":
						const tool = JSON.parse(message.text || "{}") as ClineSayTool
						return (
							<div className="w-full -mt-2.5">
								<CodeAccordian
									diff={tool.diff!}
									isExpanded={isExpanded}
									isFeedback={true}
									onToggleExpand={handleToggle}
								/>
							</div>
						)
					case "error":
						return <ErrorRow errorType="error" message={message} />
					case "diff_error":
						return <ErrorRow errorType="diff_error" message={message} />
					case "clineignore_error":
						return <ErrorRow errorType="clineignore_error" message={message} />
					case "checkpoint_created":
						return <CheckmarkControl isCheckpointCheckedOut={message.isCheckpointCheckedOut} messageTs={message.ts} />
					case "load_mcp_documentation":
						return (
							<div className="text-foreground flex items-center opacity-70 text-[12px] py-1 px-0">
								<i className="codicon codicon-book mr-1.5" />
								Loading MCP documentation
							</div>
						)
					case "generate_explanation": {
						let explanationInfo: ClineSayGenerateExplanation = {
							title: "code changes",
							fromRef: "",
							toRef: "",
							status: "generating",
						}
						try {
							if (message.text) {
								explanationInfo = JSON.parse(message.text)
							}
						} catch {
							// Use defaults if parsing fails
						}
						// Check if generation was interrupted:
						// 1. If status is "generating" but this isn't the last message, it was interrupted
						// 2. If status is "generating" and lastModifiedMessage is a resume ask, task was just cancelled
						const wasCancelled = explanationInfo.status === "generating" && (!isLast || isPassiveThreadOpenState)
						const isGenerating = explanationInfo.status === "generating" && !wasCancelled
						const isError = explanationInfo.status === "error"
						return (
							<div className="bg-code flex flex-col border border-editor-group-border rounded-sm py-2.5 px-3">
								<div className="flex items-center">
									{isGenerating ? (
										<ProgressIndicator />
									) : isError ? (
										<CircleXIcon className="size-2 mr-2 text-error" />
									) : wasCancelled ? (
										<CircleSlashIcon className="size-2 mr-2" />
									) : (
										<CheckIcon className="size-2 mr-2 text-success" />
									)}
									<span className="font-semibold">
										{isGenerating
											? "Generating explanation"
											: isError
												? "Failed to generate explanation"
												: wasCancelled
													? "Explanation cancelled"
													: "Generated explanation"}
									</span>
								</div>
								{isError && explanationInfo.error && (
									<div className="opacity-80 ml-6 mt-1.5 text-error break-words">{explanationInfo.error}</div>
								)}
								{!isError && (explanationInfo.title || explanationInfo.fromRef) && (
									<div className="opacity-80 ml-6 mt-1.5">
										<div>{explanationInfo.title}</div>
										{explanationInfo.fromRef && (
											<div className="opacity-70 mt-1.5 break-all text-xs">
												<code className="bg-quote rounded-sm py-0.5 pr-1.5">
													{explanationInfo.fromRef}
												</code>
												<ArrowRightIcon className="inline size-2 mx-1" />
												<code className="bg-quote rounded-sm py-0.5 px-1.5">
													{explanationInfo.toRef || "working directory"}
												</code>
											</div>
										)}
									</div>
								)}
							</div>
						)
					}
					case "completion_result":
						const hasChanges = message.text?.endsWith(COMPLETION_RESULT_CHANGES_FLAG) ?? false
						const text = hasChanges ? message.text?.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length) : message.text

						return (
							<CompletionOutputRow
								explainChangesDisabled={explainChangesDisabled}
								handleQuoteClick={handleQuoteClick}
								headClassNames={HEADER_CLASSNAMES}
								messageTs={message.ts}
								quoteButtonState={quoteButtonState}
								seeNewChangesDisabled={seeNewChangesDisabled}
								setExplainChangesDisabled={setExplainChangesDisabled}
								setSeeNewChangesDisabled={setSeeNewChangesDisabled}
								showActionRow={message.partial !== true && hasChanges}
								text={text || ""}
							/>
						)
					case "shell_integration_warning":
						return (
							<div className="flex flex-col bg-warning/20 p-2 rounded-xs border border-error">
								<div className="flex items-center mb-1">
									<TriangleAlertIcon className="mr-2 size-2 stroke-3 text-error" />
									<span className="font-medium text-foreground">Shell Integration Unavailable</span>
								</div>
								<div className="text-foreground opacity-80">
									Cline may have trouble viewing the command's output. Please update VSCode (
									<code>CMD/CTRL + Shift + P</code> → "Update") and make sure you're using a supported shell:
									zsh, bash, fish, or PowerShell (<code>CMD/CTRL + Shift + P</code> → "Terminal: Select Default
									Profile").
									<a
										className="px-1"
										href="https://github.com/cline/cline/wiki/Troubleshooting-%E2%80%90-Shell-Integration-Unavailable">
										Still having trouble?
									</a>
								</div>
							</div>
						)
					case "error_retry":
						try {
							const retryInfo = JSON.parse(message.text || "{}")
							const { attempt, maxAttempts, delaySeconds, failed, errorMessage } = retryInfo
							const isFailed = failed === true

							return (
								<div className="flex flex-col gap-2">
									{errorMessage && (
										<p className="m-0 whitespace-pre-wrap text-error wrap-anywhere text-xs">{errorMessage}</p>
									)}
									<div className="flex flex-col bg-quote p-0 rounded-[3px] text-[12px] p-3">
										<div className="flex items-center mb-1">
											{isFailed && !isRequestInProgress ? (
												<TriangleAlertIcon className="mr-2 size-2" />
											) : (
												<RefreshCwIcon className="mr-2 size-2 animate-spin" />
											)}
											<span className="font-medium text-foreground">
												{isFailed ? "Auto-Retry Failed" : "Auto-Retry in Progress"}
											</span>
										</div>
										<div className="text-foreground opacity-80">
											{isFailed ? (
												<span>
													Auto-retry failed after <strong>{maxAttempts}</strong> attempts. Manual
													intervention required.
												</span>
											) : (
												<span>
													Attempt <strong>{attempt}</strong> of <strong>{maxAttempts}</strong> -
													Retrying in {delaySeconds} seconds...
												</span>
											)}
										</div>
									</div>
								</div>
							)
						} catch (_e) {
							// Fallback if JSON parsing fails
							return (
								<div className="text-foreground">
									<MarkdownRow markdown={message.text} />
								</div>
							)
						}
					case "hook_status":
						return <HookMessage CommandOutput={CommandOutputContent} message={message} />
					case "hook_output_stream":
						// hook_output_stream messages are combined with hook_status messages, so we don't render them separately
						return <InvisibleSpacer />
					case "subagent":
						return <SubagentStatusRow isLast={isLast} lastModifiedMessage={lastModifiedMessage} message={message} />
					case "workflow_form":
						return renderWorkflowFormContent()
					case "workflow_step_resolution_status":
						return renderWorkflowStepResolutionStatusContent()
					case "shell_integration_warning_with_suggestion":
						const isBackgroundModeEnabled = vscodeTerminalExecutionMode === "backgroundExec"
						return (
							<div className="p-2 bg-link/10 border border-link/30 rounded-xs">
								<div className="flex items-center mb-1">
									<LightbulbIcon className="mr-1.5 size-2 text-link" />
									<span className="font-medium text-foreground">Shell integration issues</span>
								</div>
								<div className="text-foreground opacity-90 mb-2">
									Since you're experiencing repeated shell integration issues, we recommend switching to
									Background Terminal mode for better reliability.
								</div>
								<button
									className={cn(
										"bg-button-background text-button-foreground border-0 rounded-xs py-1.5 px-3 text-[12px] flex items-center gap-1.5 cursor-pointer hover:bg-button-hover",
										{
											"cursor-default opacity-80 bg-success": isBackgroundModeEnabled,
										},
									)}
									disabled={isBackgroundModeEnabled}
									onClick={async () => {
										try {
											// Enable background terminal execution mode
											await UiServiceClient.setTerminalExecutionMode(BooleanRequest.create({ value: true }))
										} catch (error) {
											console.error("Failed to enable background terminal:", error)
										}
									}}>
									<SettingsIcon className="size-2" />
									{isBackgroundModeEnabled
										? "Background Terminal Enabled"
										: "Enable Background Terminal (Recommended)"}
								</button>
							</div>
						)
					case "task_progress":
						return <InvisibleSpacer /> // task_progress messages should be displayed in TaskHeader only, not in chat
					default:
						return (
							<div>
								{title && (
									<div className={HEADER_CLASSNAMES}>
										{icon}
										{title}
									</div>
								)}
								<div className="pt-1">
									<MarkdownRow markdown={message.text} />
								</div>
							</div>
						)
				}
			case "ask":
				switch (message.ask) {
					case "mistake_limit_reached":
						return <ErrorRow errorType="mistake_limit_reached" message={message} />
					case "completion_result":
						if (message.text) {
							const hasChanges = message.text.endsWith(COMPLETION_RESULT_CHANGES_FLAG) ?? false
							const text = hasChanges ? message.text.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length) : message.text
							return (
								<CompletionOutputRow
									explainChangesDisabled={explainChangesDisabled}
									handleQuoteClick={handleQuoteClick}
									headClassNames={HEADER_CLASSNAMES}
									messageTs={message.ts}
									quoteButtonState={quoteButtonState}
									seeNewChangesDisabled={seeNewChangesDisabled}
									setExplainChangesDisabled={setExplainChangesDisabled}
									setSeeNewChangesDisabled={setSeeNewChangesDisabled}
									showActionRow={message.partial !== true && hasChanges}
									text={text || ""}
								/>
							)
						}
						// Virtuoso cannot handle zero-height items; render a spacer instead of null
						return <InvisibleSpacer />
					case "followup":
						return (
							<div>
								{title && (
									<div className={HEADER_CLASSNAMES}>
										{icon}
										{title}
									</div>
								)}
								{followupPresentation.hasQuestion ? (
									<>
										<WithCopyButton
											className="pt-1"
											onMouseUp={handleMouseUp}
											position="bottom-right"
											ref={contentRef}
											textToCopy={followupPresentation.question || ""}>
											<MarkdownRow markdown={followupPresentation.question || ""} />
											{quoteButtonState.visible && (
												<QuoteButton
													left={quoteButtonState.left}
													onClick={() => {
														handleQuoteClick()
													}}
													top={quoteButtonState.top}
												/>
											)}
										</WithCopyButton>
										<div className="pt-3">
											<OptionsButtons
												inputValue={inputValue}
												isActive={
													(isLast && lastModifiedMessage?.ask === "followup") ||
													(!followupPresentation.selected &&
														followupPresentation.options &&
														followupPresentation.options.length > 0)
												}
												options={followupPresentation.options}
												selected={followupPresentation.selected}
											/>
										</div>
									</>
								) : (
									<div className="pt-1 text-muted-foreground">Conversation reopened.</div>
								)}
							</div>
						)
					case "new_task":
						return (
							<div>
								<div className={HEADER_CLASSNAMES}>
									<FilePlus2Icon className="size-2" />
									<span className="text-foreground font-bold">Cline wants to start a new task:</span>
								</div>
								<NewTaskPreview context={message.text || ""} />
							</div>
						)
					case "condense":
						return (
							<div>
								<div className={HEADER_CLASSNAMES}>
									<FilePlus2Icon className="size-2" />
									<span className="text-foreground font-bold">Cline wants to condense your conversation:</span>
								</div>
								<NewTaskPreview context={message.text || ""} />
							</div>
						)
					case "report_bug":
						return (
							<div>
								<div className={HEADER_CLASSNAMES}>
									<FilePlus2Icon className="size-2" />
									<span className="text-foreground font-bold">Cline wants to create a Github issue:</span>
								</div>
								<ReportBugPreview data={message.text || ""} />
							</div>
						)
					case "generate_plan_output": {
						let response: string | undefined
						let options: string[] | undefined
						let selected: string | undefined
						try {
							const parsedMessage = JSON.parse(message.text || "{}") as ClinePlanModeResponse
							response = parsedMessage.response
							options = parsedMessage.options
							selected = parsedMessage.selected
						} catch (_e) {
							// legacy messages would pass response directly
							response = message.text
						}
						return (
							<div>
								<PlanCompletionOutputRow
									headClassNames={HEADER_CLASSNAMES}
									text={response || message.text || ""}
								/>
								<OptionsButtons
									inputValue={inputValue}
									isActive={
										(isLast && lastModifiedMessage?.ask === "generate_plan_output") ||
										(!selected && options && options.length > 0)
									}
									options={options}
									selected={selected}
								/>
							</div>
						)
					}
					case "workflow_start_card": {
						return renderWorkflowStartCardContent()
					}
					case "workflow_form": {
						return renderWorkflowFormContent()
					}
					default:
						return <InvisibleSpacer />
				}
		}
	},
)
