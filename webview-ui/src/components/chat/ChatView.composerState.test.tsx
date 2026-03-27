import { render, screen } from "@testing-library/react"
import { createRef, type ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockThreadDisplayState, mockAwaitingUserResponseSubtype } = vi.hoisted(() => ({
	mockThreadDisplayState: { value: undefined as string | null | undefined },
	mockAwaitingUserResponseSubtype: { value: undefined as "user" | "system" | undefined },
}))

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		version: "test-version",
		clineMessages: [],
		taskHistory: [],
		apiConfiguration: undefined,
		telemetrySetting: "enabled",
		mode: "act",
		userInfo: undefined,
		currentFocusChainChecklist: null,
		focusChainSettings: { enabled: false },
		hooksEnabled: false,
		threadDisplayState: mockThreadDisplayState.value,
		awaitingUserResponseSubtype: mockAwaitingUserResponseSubtype.value,
	}),
}))

vi.mock("@/context/PlatformContext", () => ({
	useShowNavbar: () => false,
}))

vi.mock("react-use", () => ({
	useMount: () => undefined,
}))

vi.mock("@/components/settings/utils/providerUtils", () => ({
	normalizeApiConfiguration: () => ({
		selectedModelInfo: {
			supportsPromptCache: false,
			supportsImages: false,
		},
	}),
}))

vi.mock("@/services/grpc-client", () => ({
	FileServiceClient: {
		copyToClipboard: vi.fn(),
		selectFiles: vi.fn(),
	},
	UiServiceClient: {
		subscribeToShowWebview: vi.fn(() => () => undefined),
		subscribeToAddToInput: vi.fn(() => () => undefined),
	},
}))

vi.mock("./auto-approve-menu/AutoApproveBar", () => ({
	default: () => null,
}))

vi.mock("./chat-view", () => ({
	ActionButtons: () => null,
	CHAT_CONSTANTS: {
		MAX_IMAGES_AND_FILES_PER_MESSAGE: 20,
	},
	ChatLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	convertHtmlToMarkdown: vi.fn(),
	filterVisibleMessages: (messages: unknown[]) => messages,
	groupLowStakesTools: (messages: unknown[]) => messages,
	groupMessages: (messages: unknown[]) => messages,
	InputSection: ({ chatState }: { chatState: { sendingDisabled: boolean } }) => (
		<button data-testid="send-button" disabled={chatState.sendingDisabled} type="button">
			Send
		</button>
	),
	MessagesArea: () => null,
	TaskSection: () => null,
	useChatState: () => ({
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
		textAreaRef: createRef<HTMLTextAreaElement>(),
		lastMessage: undefined,
		secondLastMessage: undefined,
		clineAsk: undefined,
		task: undefined,
		handleFocusChange: vi.fn(),
		clearExpandedRows: vi.fn(),
		resetState: vi.fn(),
	}),
	useMessageHandlers: () => ({
		executeButtonAction: vi.fn(),
		handleSendMessage: vi.fn(),
		handleTaskCloseButtonClick: vi.fn(),
		startNewTask: vi.fn(),
	}),
	useScrollBehavior: () => ({
		virtuosoRef: createRef(),
		scrollContainerRef: createRef(),
		disableAutoScrollRef: { current: false },
		scrollToBottomSmooth: vi.fn(),
		scrollToBottomAuto: vi.fn(),
		scrollToMessage: vi.fn(),
		toggleRowExpansion: vi.fn(),
		handleRowHeightChange: vi.fn(),
		showScrollToBottom: false,
		setShowScrollToBottom: vi.fn(),
		isAtBottom: true,
		setIsAtBottom: vi.fn(),
		pendingScrollToMessage: null,
		setPendingScrollToMessage: vi.fn(),
		scrolledPastUserMessage: null,
		handleRangeChanged: vi.fn(),
	}),
	WelcomeSection: () => null,
}))

import ChatView from "./ChatView"

describe("ChatView composer disabled state", () => {
	beforeEach(() => {
		mockThreadDisplayState.value = undefined
		mockAwaitingUserResponseSubtype.value = undefined
	})

	it("matches the composer enabled/disabled matrix for thread state and subtype", () => {
		const { rerender } = render(
			<ChatView hideAnnouncement={vi.fn()} isHidden={false} showAnnouncement={false} showHistoryView={vi.fn()} />,
		)

		const expectDisabled = (
			threadDisplayState: string | null | undefined,
			subtype: "user" | "system" | undefined,
			disabled: boolean,
		) => {
			mockThreadDisplayState.value = threadDisplayState
			mockAwaitingUserResponseSubtype.value = subtype
			rerender(<ChatView hideAnnouncement={vi.fn()} isHidden={false} showAnnouncement={false} showHistoryView={vi.fn()} />)
			if (disabled) {
				expect(screen.getByTestId("send-button")).toBeDisabled()
			} else {
				expect(screen.getByTestId("send-button")).not.toBeDisabled()
			}
		}

		expectDisabled("active_run", undefined, true)
		expectDisabled("active_user", undefined, false)
		expectDisabled("awaiting_user_response", "user", false)
		expectDisabled("awaiting_user_response", "system", true)
		expectDisabled("idle_open", undefined, false)
		expectDisabled("completed", undefined, false)
		expectDisabled("paused", undefined, false)
	})
})
