import type {
	ClineMessage,
	ClineWorkflowForm,
	WorkflowFormFieldDefinition,
	WorkflowFormJsonSchema,
} from "@shared/ExtensionMessage"
import { WorkflowFormAction } from "@shared/proto/cline/task"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatState } from "../types/chatTypes"

const {
	mockAskResponse,
	mockNewTask,
	mockSubmitWorkflowForm,
	mockClearTask,
	mockCancelTask,
	mockCancelBackgroundCommand,
	mockCondense,
	mockReportBug,
	mockThreadDisplayState,
	mockAwaitingUserResponseSubtype,
} = vi.hoisted(() => ({
	mockAskResponse: vi.fn().mockResolvedValue(undefined),
	mockNewTask: vi.fn(),
	mockSubmitWorkflowForm: vi.fn().mockResolvedValue(undefined),
	mockClearTask: vi.fn(),
	mockCancelTask: vi.fn(),
	mockCancelBackgroundCommand: vi.fn(),
	mockCondense: vi.fn(),
	mockReportBug: vi.fn(),
	mockThreadDisplayState: { value: "active_user" as string | null },
	mockAwaitingUserResponseSubtype: { value: undefined as "user" | "system" | undefined },
}))

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		backgroundCommandRunning: false,
		threadDisplayState: mockThreadDisplayState.value,
		awaitingUserResponseSubtype: mockAwaitingUserResponseSubtype.value,
	}),
}))

vi.mock("@/services/grpc-client", () => ({
	SlashServiceClient: {
		condense: mockCondense,
		reportBug: mockReportBug,
	},
	TaskServiceClient: {
		askResponse: mockAskResponse,
		newTask: mockNewTask,
		submitWorkflowForm: mockSubmitWorkflowForm,
		clearTask: mockClearTask,
		cancelTask: mockCancelTask,
		cancelBackgroundCommand: mockCancelBackgroundCommand,
	},
}))

import { submitWorkflowForm, useMessageHandlers } from "./useMessageHandlers"

function createField(args: {
	key: string
	label: string
	control: WorkflowFormFieldDefinition["control"]
	valueSchema: WorkflowFormJsonSchema
	required?: boolean
}): WorkflowFormFieldDefinition {
	return {
		key: args.key,
		label: args.label,
		help: args.label,
		control: args.control,
		valueSchema: args.valueSchema,
		required: args.required ?? false,
		visible: true,
		options: args.valueSchema.enum?.map((value) => ({ value, label: value })),
	}
}

function createWorkflowForm(args: {
	phase: ClineWorkflowForm["phase"]
	fields?: WorkflowFormFieldDefinition[]
}): ClineWorkflowForm {
	const fields = args.fields ?? []

	return {
		sessionId: "session-1",
		resolverId: "code_review_step_3_diff_source",
		toolName: "build_review_diff_output",
		phase: args.phase,
		definition: {
			toolName: "build_review_diff_output",
			title: "Workflow Form",
			toolDictionaryTitle: "Reference",
			toolDictionaryMarkdown: "## build_review_diff_output",
			pages: {
				confirm: {
					prompt: "Confirm",
					options: ["Yes", "No"],
				},
				select_source: {
					prompt: "Select source",
					fields,
					submitLabel: "Next",
					cancelLabel: "Cancel",
				},
				collect_inputs: {
					prompt: "Collect inputs",
					fields,
					submitLabel: "Submit",
					cancelLabel: "Cancel",
				},
				retry_error: {
					prompt: "Retry",
					fields,
					submitLabel: "Submit",
					cancelLabel: "Cancel",
					retryLabel: "Start Over",
				},
			},
			successMessage: "Done",
		},
		values: {},
	}
}

function createChatState(): ChatState {
	return {
		inputValue: "",
		setInputValue: vi.fn(),
		activeQuote: null,
		setActiveQuote: vi.fn(),
		isTextAreaFocused: false,
		setIsTextAreaFocused: vi.fn(),
		selectedImages: [],
		setSelectedImages: vi.fn(),
		selectedFiles: [],
		setSelectedFiles: vi.fn(),
		sendingDisabled: false,
		expandedRows: {},
		setExpandedRows: vi.fn(),
		textAreaRef: { current: null },
		lastMessage: undefined,
		secondLastMessage: undefined,
		clineAsk: undefined,
		task: undefined,
		handleFocusChange: vi.fn(),
		clearExpandedRows: vi.fn(),
		resetState: vi.fn(),
	}
}

describe("useMessageHandlers active_user routing", () => {
	beforeEach(() => {
		mockThreadDisplayState.value = "active_user"
		mockAwaitingUserResponseSubtype.value = undefined
		vi.clearAllMocks()
	})

	it("sends active_user composer input as the next normal turn", async () => {
		const messages: ClineMessage[] = [
			{
				ts: Date.now(),
				type: "say",
				say: "text",
				text: "assistant handoff complete",
			},
		]

		const chatState = createChatState()
		const { result } = renderHook(() => useMessageHandlers(messages, chatState))

		await act(async () => {
			await result.current.handleSendMessage("Follow-up from the human", [], [])
		})

		expect(mockAskResponse).toHaveBeenCalledTimes(1)
		const request = mockAskResponse.mock.calls[0]?.[0] as { responseType?: string; text?: string }
		expect(request.responseType).toBe("messageResponse")
		expect(request.text).toBe("Follow-up from the human")
		expect(chatState.setInputValue).toHaveBeenCalledWith("")
	})

	it("does not degrade active_user sends into steer routing when the last row still looks streaming", async () => {
		const messages: ClineMessage[] = [
			{
				ts: Date.now(),
				type: "say",
				say: "api_req_started",
				partial: true,
			},
		]

		const chatState = createChatState()
		const { result } = renderHook(() => useMessageHandlers(messages, chatState))

		await act(async () => {
			await result.current.handleSendMessage("Follow-up despite stale partial", [], [])
		})

		expect(mockAskResponse).toHaveBeenCalledTimes(1)
		const request = mockAskResponse.mock.calls[0]?.[0] as { responseType?: string; text?: string }
		expect(request.responseType).toBe("messageResponse")
		expect(request.text).toBe("Follow-up despite stale partial")
	})

	it("treats stale tool asks in active_user as normal next-turn input", async () => {
		const messages: ClineMessage[] = [
			{
				ts: Date.now(),
				type: "ask",
				ask: "tool",
				text: JSON.stringify({ tool: "readFile" }),
			},
		]

		const chatState = {
			...createChatState(),
			clineAsk: "tool" as const,
			lastMessage: messages[0],
		}
		const { result } = renderHook(() => useMessageHandlers(messages, chatState))

		await act(async () => {
			await result.current.handleSendMessage("Human follow-up after handoff", [], [])
		})

		expect(mockAskResponse).toHaveBeenCalledTimes(1)
		const request = mockAskResponse.mock.calls[0]?.[0] as { responseType?: string; text?: string }
		expect(request.responseType).toBe("messageResponse")
		expect(request.text).toBe("Human follow-up after handoff")
	})

	it("treats stale followup asks in active_user as normal next-turn input", async () => {
		const messages: ClineMessage[] = [
			{
				ts: Date.now(),
				type: "ask",
				ask: "followup",
				text: "stale question",
			},
		]

		const chatState = {
			...createChatState(),
			clineAsk: "followup" as const,
			lastMessage: messages[0],
		}
		const { result } = renderHook(() => useMessageHandlers(messages, chatState))

		await act(async () => {
			await result.current.handleSendMessage("Human next turn still goes through", [], [])
		})

		expect(mockAskResponse).toHaveBeenCalledTimes(1)
		const request = mockAskResponse.mock.calls[0]?.[0] as { responseType?: string; text?: string }
		expect(request.responseType).toBe("messageResponse")
		expect(request.text).toBe("Human next turn still goes through")
	})

	it("preserves ask-response routing while awaiting_user_response", async () => {
		mockThreadDisplayState.value = "awaiting_user_response"
		const messages: ClineMessage[] = [
			{
				ts: Date.now(),
				type: "ask",
				ask: "tool",
				text: JSON.stringify({ tool: "readFile" }),
			},
		]

		const chatState = {
			...createChatState(),
			clineAsk: "tool" as const,
			lastMessage: messages[0],
		}
		const { result } = renderHook(() => useMessageHandlers(messages, chatState))

		await act(async () => {
			await result.current.handleSendMessage("Approval-thread response", [], [])
		})

		expect(mockAskResponse).toHaveBeenCalledTimes(1)
		const request = mockAskResponse.mock.calls[0]?.[0] as { responseType?: string; text?: string }
		expect(request.responseType).toBe("messageResponse")
		expect(request.text).toBe("Approval-thread response")
	})

	it("does not route composer sends while awaiting_user_response.system", async () => {
		mockThreadDisplayState.value = "awaiting_user_response"
		mockAwaitingUserResponseSubtype.value = "system"
		const messages: ClineMessage[] = [
			{
				ts: Date.now(),
				type: "ask",
				ask: "tool",
				text: JSON.stringify({ tool: "readFile" }),
			},
		]

		const chatState = {
			...createChatState(),
			clineAsk: "tool" as const,
			lastMessage: messages[0],
		}
		const { result } = renderHook(() => useMessageHandlers(messages, chatState))

		await act(async () => {
			await result.current.handleSendMessage("Blocked system wait state", [], [])
		})

		expect(mockAskResponse).not.toHaveBeenCalled()
		expect(chatState.setInputValue).not.toHaveBeenCalled()
	})

	it("routes structured workflow form submissions through submitWorkflowForm", async () => {
		const workflowForm = createWorkflowForm({
			phase: "collect_inputs",
			fields: [
				createField({
					key: "source.type",
					label: "Source type",
					control: "select",
					valueSchema: { type: "string", enum: ["commit", "commit_range"] },
					required: true,
				}),
				createField({
					key: "source.base",
					label: "Base",
					control: "text",
					valueSchema: { type: "string" },
				}),
				createField({
					key: "source.head",
					label: "Head",
					control: "text",
					valueSchema: { type: "string" },
				}),
				createField({
					key: "scoped_paths",
					label: "Scoped paths",
					control: "textarea",
					valueSchema: { type: "array", items: { type: "string" } },
				}),
				createField({
					key: "context_lines",
					label: "Context lines",
					control: "number",
					valueSchema: { type: "integer" },
				}),
			],
		})

		await submitWorkflowForm(workflowForm, WorkflowFormAction.SUBMIT, {
			"source.type": "commit_range",
			"source.base": "main",
			"source.head": "feature/review",
			scoped_paths: "src/core/task/index.ts\nsrc/core/task/TaskState.ts",
			context_lines: "5",
		})

		expect(mockSubmitWorkflowForm).toHaveBeenCalledTimes(1)
		expect(mockSubmitWorkflowForm).toHaveBeenCalledWith(
			expect.objectContaining({
				sessionId: "session-1",
				action: WorkflowFormAction.SUBMIT,
				fields: [
					{
						key: "source.type",
						value: {
							rawValue: "commit_range",
						},
					},
					{
						key: "source.base",
						value: {
							rawValue: "main",
						},
					},
					{
						key: "source.head",
						value: {
							rawValue: "feature/review",
						},
					},
					{
						key: "scoped_paths",
						value: {
							rawValue: "src/core/task/index.ts\nsrc/core/task/TaskState.ts",
						},
					},
					{
						key: "context_lines",
						value: {
							rawValue: "5",
						},
					},
				],
			}),
		)
	})

	it("includes generic workflow-start placeholder fields in workflow form submissions", async () => {
		const workflowForm = createWorkflowForm({
			phase: "collect_inputs",
			fields: [
				createField({
					key: "story_path",
					label: "Story path",
					control: "text",
					valueSchema: { type: "string" },
				}),
				createField({
					key: "project_context",
					label: "Project context",
					control: "text",
					valueSchema: { type: "string" },
				}),
			],
		})

		await submitWorkflowForm(workflowForm, WorkflowFormAction.SUBMIT, {
			story_path: "docs/stories/story-123.md",
			project_context: "docs/project-context.md",
		})

		expect(mockSubmitWorkflowForm).toHaveBeenCalledTimes(1)
		expect(mockSubmitWorkflowForm).toHaveBeenCalledWith(
			expect.objectContaining({
				sessionId: "session-1",
				action: WorkflowFormAction.SUBMIT,
				fields: [
					{
						key: "story_path",
						value: {
							rawValue: "docs/stories/story-123.md",
						},
					},
					{
						key: "project_context",
						value: {
							rawValue: "docs/project-context.md",
						},
					},
				],
			}),
		)
	})

	it("includes confirm submissions for workflow-form confirm screens", async () => {
		const workflowForm = createWorkflowForm({ phase: "confirm" })

		await submitWorkflowForm(workflowForm, WorkflowFormAction.SUBMIT, {
			confirm: "yes",
		})

		expect(mockSubmitWorkflowForm).toHaveBeenCalledTimes(1)
		expect(mockSubmitWorkflowForm).toHaveBeenCalledWith(
			expect.objectContaining({
				sessionId: "session-1",
				action: WorkflowFormAction.SUBMIT,
				fields: [
					{
						key: "confirm",
						value: {
							rawValue: "yes",
						},
					},
				],
			}),
		)
	})

	it("submits workflow-form fields generically without field-name transport mapping", async () => {
		const workflowForm = createWorkflowForm({
			phase: "collect_inputs",
			fields: [
				createField({
					key: "source.type",
					label: "Source type",
					control: "select",
					valueSchema: { type: "string", enum: ["commit", "commit_range"] },
				}),
				createField({
					key: "review_input",
					label: "Review input",
					control: "text",
					valueSchema: { type: "string" },
				}),
				createField({
					key: "context_lines",
					label: "Context lines",
					control: "number",
					valueSchema: { type: "integer" },
				}),
			],
		})

		await submitWorkflowForm(workflowForm, WorkflowFormAction.SUBMIT, {
			"source.type": "commit",
			review_input: "docs/review.md",
			context_lines: "7",
		})

		expect(mockSubmitWorkflowForm).toHaveBeenCalledWith(
			expect.objectContaining({
				sessionId: "session-1",
				action: WorkflowFormAction.SUBMIT,
				fields: [
					{ key: "source.type", value: { rawValue: "commit" } },
					{ key: "review_input", value: { rawValue: "docs/review.md" } },
					{ key: "context_lines", value: { rawValue: "7" } },
				],
			}),
		)
	})

	it("submits confirm answers without depending on field definitions", async () => {
		const workflowForm = createWorkflowForm({ phase: "confirm" })

		await submitWorkflowForm(workflowForm, WorkflowFormAction.SUBMIT, { confirm: "yes" })

		expect(mockSubmitWorkflowForm).toHaveBeenCalledWith(
			expect.objectContaining({
				sessionId: "session-1",
				action: WorkflowFormAction.SUBMIT,
				fields: [{ key: "confirm", value: { rawValue: "yes" } }],
			}),
		)
	})

	it("does not allow composer sends while a system-owned workflow form is awaiting input", async () => {
		mockThreadDisplayState.value = "awaiting_user_response"
		mockAwaitingUserResponseSubtype.value = "system"
		const messages: ClineMessage[] = [
			{
				ts: Date.now(),
				type: "ask",
				ask: "workflow_form",
				text: JSON.stringify({
					sessionId: "session-1",
					resolverId: "code_review_step_3_diff_source",
					toolName: "build_review_diff_output",
					title: "Prepare Diff Input",
					prompt: "System-owned collection flow",
					phase: "confirm",
					toolDictionaryTitle: "Diff Output Reference",
					toolDictionaryMarkdown: "## build_review_diff_output\n\nTool reference body.",
					options: ["Yes", "No"],
				}),
			},
		]

		const chatState = {
			...createChatState(),
			clineAsk: "workflow_form" as const,
			lastMessage: messages[0],
		}
		const { result } = renderHook(() => useMessageHandlers(messages, chatState))

		await act(async () => {
			await result.current.handleSendMessage("Blocked system-owned form input", [], [])
		})

		expect(mockAskResponse).not.toHaveBeenCalled()
		expect(mockSubmitWorkflowForm).not.toHaveBeenCalled()
		expect(chatState.setInputValue).not.toHaveBeenCalled()
	})
})
