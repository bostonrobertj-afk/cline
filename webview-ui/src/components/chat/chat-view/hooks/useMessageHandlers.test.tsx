import type { ClineMessage } from "@shared/ExtensionMessage"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatState } from "../types/chatTypes"

const {
	mockAskResponse,
	mockNewTask,
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
		clearTask: mockClearTask,
		cancelTask: mockCancelTask,
		cancelBackgroundCommand: mockCancelBackgroundCommand,
	},
}))

import { useMessageHandlers } from "./useMessageHandlers"

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
})
