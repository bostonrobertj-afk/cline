import type { ClineMessage, WorkflowForm, WorkflowFormFieldDefinition } from "@shared/ExtensionMessage"
import { EmptyRequest, StringRequest } from "@shared/proto/cline/common"
import {
	AskResponseRequest,
	NewTaskRequest,
	WorkflowFormAction,
	WorkflowFormSubmissionRequest,
	type WorkflowFormValue,
} from "@shared/proto/cline/task"
import { useCallback, useRef } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { SlashServiceClient, TaskServiceClient } from "@/services/grpc-client"
import type { ButtonActionType } from "../shared/buttonConfig"
import { isPassiveThreadOpen } from "../shared/buttonConfig"
import type { ChatState, MessageHandlers } from "../types/chatTypes"

export function buildWorkflowFormSubmissionRequest(
	workflowForm: WorkflowForm,
	action: WorkflowFormAction,
	values: Record<string, unknown> = {},
): WorkflowFormSubmissionRequest {
	const panel = workflowForm.panel
	const fields = []

	if (workflowForm.renderState !== "success" && panel) {
		for (const field of panel.fields) {
			const serializedValue = serializeWorkflowFormFieldValue(field, values[field.key])
			if (!serializedValue) {
				continue
			}

			fields.push({
				key: field.key,
				value: serializedValue,
			})
		}
	}

	return WorkflowFormSubmissionRequest.create({
		sessionId: workflowForm.sessionId,
		panelId: panel?.panelId ?? "",
		action,
		fields,
	})
}

export async function submitWorkflowForm(
	workflowForm: WorkflowForm,
	action: WorkflowFormAction,
	values: Record<string, unknown> = {},
) {
	await TaskServiceClient.submitWorkflowForm(buildWorkflowFormSubmissionRequest(workflowForm, action, values))
}

function serializeWorkflowFormFieldValue(field: WorkflowFormFieldDefinition, value: unknown): WorkflowFormValue | undefined {
	if (field.kind === "markdown_display" || field.kind === "static_notice") {
		return undefined
	}

	if (value === undefined || value === null) {
		return undefined
	}

	switch (field.kind) {
		case "boolean":
			return typeof value === "boolean" ? { booleanValue: value } : undefined
		case "number": {
			if (typeof value === "string" && value.trim().length === 0) {
				return undefined
			}
			const normalized = typeof value === "number" ? value : Number(String(value).trim())
			if (Number.isNaN(normalized)) {
				return undefined
			}
			if (field.allowedValueType === "integer") {
				return Number.isInteger(normalized) ? { integerValue: normalized } : undefined
			}
			return { numberValue: normalized }
		}
		case "multi_select":
		case "checkbox_group":
			return Array.isArray(value)
				? {
						arrayValue: {
							values: value
								.filter((entry): entry is string => typeof entry === "string")
								.map((entry) => ({ stringValue: entry })),
						},
					}
				: undefined
		case "dropdown":
			if ((field.selectionCardinality ?? "single") === "single") {
				return serializeStringWorkflowFormFieldValue(value, true)
			}
			return Array.isArray(value)
				? {
						arrayValue: {
							values: value
								.filter((entry): entry is string => typeof entry === "string")
								.map((entry) => ({ stringValue: entry })),
						},
					}
				: undefined
		case "radio_group":
		case "date":
		case "date_time":
		case "file_path":
		case "directory_path":
		case "artifact_picker":
		case "small_text":
			if (typeof value !== "string") {
				return undefined
			}
			if (field.kind === "small_text" && field.allowedValueType === "integer") {
				if (value.trim().length === 0) {
					return undefined
				}
				const normalized = Number(value.trim())
				return Number.isInteger(normalized) ? { integerValue: normalized } : undefined
			}
			return serializeStringWorkflowFormFieldValue(value, true)
		case "large_text":
			if (field.allowedValueType === "array") {
				const parsedArray = typeof value === "string" ? tryParseJson(value) : value
				return Array.isArray(parsedArray)
					? {
							arrayValue: {
								values: parsedArray.map((entry) => serializeUnknownValue(entry)),
							},
						}
					: undefined
			}
			if (field.allowedValueType === "object") {
				const parsedObject = typeof value === "string" ? tryParseJson(value) : value
				return parsedObject && typeof parsedObject === "object" && !Array.isArray(parsedObject)
					? {
							objectValue: {
								entries: Object.entries(parsedObject).map(([key, entryValue]) => ({
									key,
									value: serializeUnknownValue(entryValue),
								})),
							},
						}
					: undefined
			}
			return serializeStringWorkflowFormFieldValue(value, false)
		default:
			return serializeStringWorkflowFormFieldValue(value, true)
	}
}

function serializeStringWorkflowFormFieldValue(value: unknown, trimNonEmptyValue: boolean): WorkflowFormValue | undefined {
	if (typeof value !== "string") {
		return undefined
	}

	const trimmedValue = value.trim()
	if (trimmedValue.length === 0) {
		return { stringValue: "" }
	}

	return { stringValue: trimNonEmptyValue ? trimmedValue : value }
}

function tryParseJson(value: string): unknown {
	try {
		return JSON.parse(value)
	} catch {
		return undefined
	}
}

function serializeUnknownValue(value: unknown): WorkflowFormValue {
	if (typeof value === "string") {
		return { stringValue: value }
	}
	if (typeof value === "boolean") {
		return { booleanValue: value }
	}
	if (typeof value === "number") {
		return Number.isInteger(value) ? { integerValue: value } : { numberValue: value }
	}
	if (Array.isArray(value)) {
		return {
			arrayValue: {
				values: value.map((entry) => serializeUnknownValue(entry)),
			},
		}
	}
	if (value && typeof value === "object") {
		return {
			objectValue: {
				entries: Object.entries(value).map(([key, entryValue]) => ({
					key,
					value: serializeUnknownValue(entryValue),
				})),
			},
		}
	}

	return { stringValue: String(value ?? "") }
}

/**
 * Custom hook for managing message handlers
 * Handles sending messages, button clicks, and task management
 */
export function useMessageHandlers(messages: ClineMessage[], chatState: ChatState): MessageHandlers {
	const { backgroundCommandRunning, threadDisplayState, awaitingUserResponseSubtype } = useExtensionState()
	const isPassiveThreadOpenState = isPassiveThreadOpen(threadDisplayState)
	const isActiveRunThreadState = threadDisplayState === "active_run"
	const isActiveUserThreadState = threadDisplayState === "active_user"
	const isAwaitingUserResponseThreadState = threadDisplayState === "awaiting_user_response"
	const isAwaitingUserResponseUserState = isAwaitingUserResponseThreadState && awaitingUserResponseSubtype !== "system"
	const isAwaitingUserResponseSystemState = isAwaitingUserResponseThreadState && awaitingUserResponseSubtype === "system"
	const { setInputValue, activeQuote, setActiveQuote, setSelectedImages, setSelectedFiles, clineAsk, lastMessage } = chatState
	const cancelInFlightRef = useRef(false)
	const isWorkflowFormAwaitingSystemState =
		isAwaitingUserResponseThreadState && awaitingUserResponseSubtype === "system" && clineAsk === "workflow_form"

	const sendSteerMessage = useCallback(async (text: string, images: string[], files: string[]) => {
		await TaskServiceClient.askResponse(
			AskResponseRequest.create({
				responseType: "steerMessage",
				text,
				images,
				files,
			}),
		)
	}, [])

	// Handle sending a message
	const handleSendMessage = useCallback(
		async (text: string, images: string[], files: string[]) => {
			let messageToSend = text.trim()
			const hasContent = messageToSend || images.length > 0 || files.length > 0

			if (isWorkflowFormAwaitingSystemState) {
				return
			}

			// Prepend the active quote if it exists
			if (activeQuote && hasContent) {
				const prefix = "[context] \n> "
				const formattedQuote = activeQuote
				const suffix = "\n[/context] \n\n"
				messageToSend = `${prefix} ${formattedQuote} ${suffix} ${messageToSend}`
			}

			if (hasContent) {
				console.log("[ChatView] handleSendMessage - Sending message:", messageToSend)
				let messageSent = false
				let sentAsInterruption = false

				if (messages.length === 0) {
					await TaskServiceClient.newTask(
						NewTaskRequest.create({
							text: messageToSend,
							images,
							files,
						}),
					)
					messageSent = true
				} else if (messages.length > 0) {
					const lastMessage = messages[messages.length - 1]
					const lastMessageLooksStreaming =
						lastMessage?.partial === true || (lastMessage?.type === "say" && lastMessage.say === "api_req_started")

					if (clineAsk && (isActiveUserThreadState || isActiveRunThreadState || isPassiveThreadOpenState)) {
						console.info("[useMessageHandlers] canonical thread state overrides clineAsk routing", {
							threadDisplayState,
							clineAsk,
							lastMessageType: lastMessage?.type,
							lastMessageAsk: lastMessage?.type === "ask" ? lastMessage.ask : undefined,
							lastMessageSay: lastMessage?.type === "say" ? lastMessage.say : undefined,
						})
					}

					if (isActiveUserThreadState) {
						// Active-user threads are the normal live next-turn handoff after a governed response tool.
						// Send the message as the next human-authored turn rather than a passive reopen.
						if (lastMessageLooksStreaming) {
							console.info("[useMessageHandlers] active_user routing overrides stale streaming row", {
								threadDisplayState,
								lastMessageType: lastMessage?.type,
								lastMessageSay: lastMessage?.type === "say" ? lastMessage.say : undefined,
								lastMessagePartial: lastMessage?.partial === true,
								route: "messageResponse",
							})
						}
						await TaskServiceClient.askResponse(
							AskResponseRequest.create({
								responseType: "messageResponse",
								text: messageToSend,
								images,
								files,
							}),
						)
						messageSent = true
					} else if (isPassiveThreadOpenState) {
						// Passive-open threads are conversationally open without a pending ask.
						// Route the message through the controller's explicit passive-thread continuation path
						// and keep the composer semantics aligned with interruption-style sends.
						await TaskServiceClient.askResponse(
							AskResponseRequest.create({
								responseType: "messageResponse",
								text: messageToSend,
								images,
								files,
							}),
						)
						messageSent = true
						sentAsInterruption = true
					} else if (isActiveRunThreadState) {
						await sendSteerMessage(messageToSend, images, files)
						messageSent = true
						sentAsInterruption = true
					} else if (isAwaitingUserResponseUserState && clineAsk) {
						// For resume_task and resume_completed_task, use yesButtonClicked to match Resume button behavior
						// This ensures Enter key and Resume button work identically
						if (clineAsk === "resume_task" || clineAsk === "resume_completed_task") {
							await TaskServiceClient.askResponse(
								AskResponseRequest.create({
									responseType: "yesButtonClicked",
									text: messageToSend,
									images,
									files,
								}),
							)
							messageSent = true
						} else {
							// All other ask types use messageResponse
							switch (clineAsk) {
								case "followup":
								case "generate_plan_output":
								case "tool":
								case "browser_action_launch":
								case "command":
								case "command_output":
								case "use_mcp_server":
								case "use_subagents":
								case "completion_result":
								case "mistake_limit_reached":
								case "api_req_failed":
								case "new_task":
								case "condense":
								case "report_bug":
									await TaskServiceClient.askResponse(
										AskResponseRequest.create({
											responseType: "messageResponse",
											text: messageToSend,
											images,
											files,
										}),
									)
									messageSent = true
									break
							}
						}
					}

					const isTaskRunning =
						!isActiveUserThreadState &&
						!isPassiveThreadOpenState &&
						!isAwaitingUserResponseUserState &&
						!isAwaitingUserResponseSystemState &&
						lastMessageLooksStreaming

					if (!messageSent && isTaskRunning) {
						// Task is running - queue the message as steer feedback for the next outbound request.
						await sendSteerMessage(messageToSend, images, files)
						messageSent = true
						sentAsInterruption = true
					}
				}

				// Only clear input and disable UI if message was actually sent
				if (messageSent) {
					setInputValue("")
					setActiveQuote(null)
					setSelectedImages([])
					setSelectedFiles([])

					// Reset auto-scroll
					if ("disableAutoScrollRef" in chatState) {
						;(chatState as any).disableAutoScrollRef.current = false
					}
				}
			}
		},
		[
			messages.length,
			clineAsk,
			activeQuote,
			isActiveRunThreadState,
			isActiveUserThreadState,
			isAwaitingUserResponseThreadState,
			isAwaitingUserResponseUserState,
			isAwaitingUserResponseSystemState,
			isWorkflowFormAwaitingSystemState,
			isPassiveThreadOpenState,
			sendSteerMessage,
			setInputValue,
			setActiveQuote,
			setSelectedImages,
			setSelectedFiles,
			chatState,
		],
	)

	// Start a new task
	const startNewTask = useCallback(async () => {
		setActiveQuote(null)
		await TaskServiceClient.clearTask(EmptyRequest.create({}))
	}, [setActiveQuote])

	// Clear input state helper
	const clearInputState = useCallback(() => {
		setInputValue("")
		setActiveQuote(null)
		setSelectedImages([])
		setSelectedFiles([])
	}, [setInputValue, setActiveQuote, setSelectedImages, setSelectedFiles])

	// Execute button action based on type
	const executeButtonAction = useCallback(
		async (actionType: ButtonActionType, text?: string, images?: string[], files?: string[]) => {
			const trimmedInput = text?.trim()
			const hasContent = trimmedInput || (images && images.length > 0) || (files && files.length > 0)

			switch (actionType) {
				case "retry":
					// For API retry (api_req_failed), always send simple approval without content
					await TaskServiceClient.askResponse(
						AskResponseRequest.create({
							responseType: "yesButtonClicked",
						}),
					)
					clearInputState()
					break
				case "approve":
					if (hasContent) {
						await TaskServiceClient.askResponse(
							AskResponseRequest.create({
								responseType: "yesButtonClicked",
								text: trimmedInput,
								images: images,
								files: files,
							}),
						)
					} else {
						await TaskServiceClient.askResponse(
							AskResponseRequest.create({
								responseType: "yesButtonClicked",
							}),
						)
					}
					clearInputState()
					break

				case "reject":
					if (hasContent) {
						await TaskServiceClient.askResponse(
							AskResponseRequest.create({
								responseType: "noButtonClicked",
								text: trimmedInput,
								images: images,
								files: files,
							}),
						)
					} else {
						await TaskServiceClient.askResponse(
							AskResponseRequest.create({
								responseType: "noButtonClicked",
							}),
						)
					}
					clearInputState()
					break

				case "proceed":
					if (hasContent) {
						await TaskServiceClient.askResponse(
							AskResponseRequest.create({
								responseType: "yesButtonClicked",
								text: trimmedInput,
								images: images,
								files: files,
							}),
						)
					} else {
						await TaskServiceClient.askResponse(
							AskResponseRequest.create({
								responseType: "yesButtonClicked",
							}),
						)
					}
					clearInputState()
					break

				case "steer":
					if (hasContent) {
						await sendSteerMessage(trimmedInput ?? "", images ?? [], files ?? [])
						clearInputState()
					}
					break

				case "new_task":
					if (clineAsk === "new_task") {
						await TaskServiceClient.newTask(
							NewTaskRequest.create({
								text: lastMessage?.text,
								images: [],
								files: [],
							}),
						)
					} else {
						await startNewTask()
					}
					break

				case "cancel": {
					if (cancelInFlightRef.current) {
						return
					}
					cancelInFlightRef.current = true
					try {
						if (backgroundCommandRunning) {
							await TaskServiceClient.cancelBackgroundCommand(EmptyRequest.create({})).catch((err) =>
								console.error("Failed to cancel background command:", err),
							)
						}
						await TaskServiceClient.cancelTask(EmptyRequest.create({}))
					} finally {
						cancelInFlightRef.current = false
					}
					break
				}

				case "utility":
					switch (clineAsk) {
						case "condense":
							await SlashServiceClient.condense(StringRequest.create({ value: lastMessage?.text })).catch((err) =>
								console.error(err),
							)
							break
						case "report_bug":
							await SlashServiceClient.reportBug(StringRequest.create({ value: lastMessage?.text })).catch((err) =>
								console.error(err),
							)
							break
					}
					break
			}

			if ("disableAutoScrollRef" in chatState) {
				;(chatState as any).disableAutoScrollRef.current = false
			}
		},
		[
			clineAsk,
			lastMessage,
			messages,
			clearInputState,
			handleSendMessage,
			startNewTask,
			chatState,
			isActiveUserThreadState,
			backgroundCommandRunning,
			isPassiveThreadOpenState,
		],
	)

	// Handle task close button click
	const handleTaskCloseButtonClick = useCallback(() => {
		startNewTask()
	}, [startNewTask])

	return {
		handleSendMessage,
		executeButtonAction,
		handleTaskCloseButtonClick,
		startNewTask,
	}
}
