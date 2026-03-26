import type { ClineMessage, ThreadDisplayState } from "@shared/ExtensionMessage"
import { ThreadDisplayStates } from "@shared/ExtensionMessage"

type TaskItemWithThreadState = {
	id?: string
	threadDisplayState?: ThreadDisplayState | string | null
}

export function shouldPreservePreviousClineMessages(args: {
	previousClineMessages: readonly ClineMessage[]
	previousTaskItem?: TaskItemWithThreadState
	nextClineMessages?: readonly ClineMessage[]
	nextTaskItem?: TaskItemWithThreadState
}): boolean {
	const { previousClineMessages, previousTaskItem, nextClineMessages, nextTaskItem } = args

	if (previousClineMessages.length === 0) {
		return false
	}

	if (nextClineMessages?.length) {
		return false
	}

	if (!previousTaskItem?.id || !nextTaskItem?.id) {
		return false
	}

	if (previousTaskItem.id !== nextTaskItem.id) {
		return false
	}

	return nextTaskItem.threadDisplayState === ThreadDisplayStates.ACTIVE_RUN
}
