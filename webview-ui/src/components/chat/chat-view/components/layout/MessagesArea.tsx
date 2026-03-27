import type { ClineMessage } from "@shared/ExtensionMessage"
import type React from "react"
import { useCallback, useMemo } from "react"
import { Virtuoso } from "react-virtuoso"
import { StickyUserMessage } from "@/components/chat/task-header/StickyUserMessage"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { cn } from "@/lib/utils"
import { isPassiveThreadOpen } from "../../shared/buttonConfig"
import type { ChatState, MessageHandlers, ScrollBehavior } from "../../types/chatTypes"
import { shouldAppendThinkingLoaderRow } from "../../utils/messageUtils"
import { createMessageRenderer } from "../messages/MessageRenderer"

interface MessagesAreaProps {
	task: ClineMessage
	groupedMessages: (ClineMessage | ClineMessage[])[]
	modifiedMessages: ClineMessage[]
	scrollBehavior: ScrollBehavior
	chatState: ChatState
	messageHandlers: MessageHandlers
}

/**
 * The scrollable messages area with virtualized list
 * Handles rendering of chat rows and browser sessions
 */
export const MessagesArea: React.FC<MessagesAreaProps> = ({
	task,
	groupedMessages,
	modifiedMessages,
	scrollBehavior,
	chatState,
	messageHandlers,
}) => {
	const { clineMessages, threadDisplayState, awaitingUserResponseSubtype } = useExtensionState()
	const isPassiveThreadOpenState = isPassiveThreadOpen(threadDisplayState)

	const {
		virtuosoRef,
		scrollContainerRef,
		toggleRowExpansion,
		handleRowHeightChange,
		setIsAtBottom,
		setShowScrollToBottom,
		disableAutoScrollRef,
		handleRangeChanged,
		scrolledPastUserMessage,
		scrollToMessage,
	} = scrollBehavior

	// Find the index of the scrolled past user message for scrolling
	const scrolledPastUserMessageIndex = useMemo(() => {
		if (!scrolledPastUserMessage) {
			return -1
		}
		return clineMessages.findIndex((msg) => msg.ts === scrolledPastUserMessage.ts)
	}, [clineMessages, scrolledPastUserMessage])

	// Handler to scroll to the scrolled past user message
	const handleScrollToUserMessage = useCallback(() => {
		if (scrollToMessage && scrolledPastUserMessageIndex >= 0) {
			scrollToMessage(scrolledPastUserMessageIndex)
		}
	}, [scrollToMessage, scrolledPastUserMessageIndex])

	const { expandedRows, inputValue, setActiveQuote } = chatState
	const lastVisibleRow = useMemo(() => groupedMessages.at(-1), [groupedMessages])
	const lastVisibleMessage = useMemo(() => {
		if (!lastVisibleRow) {
			return undefined
		}
		return Array.isArray(lastVisibleRow) ? lastVisibleRow.at(-1) : lastVisibleRow
	}, [lastVisibleRow])

	// Keep the loader tied to real assistant activity only. The helper uses raw
	// message state and backend thread state rather than the shape of the visible row.
	const showThinkingLoaderRow = useMemo(() => {
		return shouldAppendThinkingLoaderRow(
			clineMessages,
			groupedMessages.length,
			threadDisplayState,
			lastVisibleMessage,
			awaitingUserResponseSubtype,
		)
	}, [awaitingUserResponseSubtype, clineMessages, groupedMessages.length, lastVisibleMessage, threadDisplayState])

	const displayedGroupedMessages = useMemo<(ClineMessage | ClineMessage[])[]>(() => {
		if (!showThinkingLoaderRow) {
			return groupedMessages
		}
		const waitingRow: ClineMessage = {
			ts: Number.MIN_SAFE_INTEGER,
			type: "say",
			say: "reasoning",
			partial: true,
			text: "",
		}
		return [...groupedMessages, waitingRow]
	}, [groupedMessages, showThinkingLoaderRow])

	const itemContent = useMemo(
		() =>
			createMessageRenderer(
				displayedGroupedMessages,
				modifiedMessages,
				expandedRows,
				toggleRowExpansion,
				handleRowHeightChange,
				setActiveQuote,
				inputValue,
				messageHandlers,
				false,
			),
		[
			displayedGroupedMessages,
			modifiedMessages,
			expandedRows,
			toggleRowExpansion,
			handleRowHeightChange,
			setActiveQuote,
			inputValue,
			messageHandlers,
		],
	)

	// Keep footer as a simple spacer. Thinking loading is rendered as an in-list row.
	const virtuosoComponents = useMemo(
		() => ({
			Footer: () => <div className="min-h-1" />,
		}),
		[],
	)

	return (
		<div className="overflow-hidden flex flex-col h-full relative">
			{/* Sticky User Message - positioned absolutely to avoid layout shifts */}
			<div
				className={cn(
					"absolute top-0 left-0 right-0 z-10 pl-[15px] pr-[14px] bg-background",
					scrolledPastUserMessage && "pb-2",
				)}>
				<StickyUserMessage
					isVisible={!!scrolledPastUserMessage}
					lastUserMessage={scrolledPastUserMessage}
					onScrollToMessage={handleScrollToUserMessage}
				/>
			</div>

			{isPassiveThreadOpenState && (
				<div className="px-4 pt-2 pb-1">
					<div className="rounded-sm border border-editor-group-border bg-editor-background px-3 py-2 text-sm">
						<div className="font-medium text-foreground">Conversation reopened</div>
						<div className="mt-1 text-muted-foreground">
							The composer stays enabled so you can continue the thread.
						</div>
					</div>
				</div>
			)}

			<div className="grow flex" ref={scrollContainerRef}>
				<Virtuoso
					atBottomStateChange={(isAtBottom) => {
						setIsAtBottom(isAtBottom)
						if (isAtBottom) {
							disableAutoScrollRef.current = false
						}
						setShowScrollToBottom(disableAutoScrollRef.current && !isAtBottom)
					}}
					atBottomThreshold={10} // trick to make sure virtuoso re-renders when task changes, and we use initialTopMostItemIndex to start at the bottom
					className="scrollable grow overflow-y-scroll"
					components={virtuosoComponents}
					data={displayedGroupedMessages}
					// increasing top by 3_000 to prevent jumping around when user collapses a row
					increaseViewportBy={{
						top: 3_000,
						bottom: Number.MAX_SAFE_INTEGER,
					}} // hack to make sure the last message is always rendered to get truly perfect scroll to bottom animation when new messages are added (Number.MAX_SAFE_INTEGER is safe for arithmetic operations, which is all virtuoso uses this value for in src/sizeRangeSystem.ts)
					initialTopMostItemIndex={displayedGroupedMessages.length - 1} // messages is the raw format returned by extension, modifiedMessages is the manipulated structure that combines certain messages of related type, and visibleMessages is the filtered structure that removes messages that should not be rendered
					itemContent={itemContent}
					key={task.ts}
					rangeChanged={handleRangeChanged}
					ref={virtuosoRef} // anything lower causes issues with followOutput
					style={{
						scrollbarWidth: "none", // Firefox
						msOverflowStyle: "none", // IE/Edge
						overflowAnchor: "none", // prevent scroll jump when content expands
					}}
				/>
			</div>
		</div>
	)
}
