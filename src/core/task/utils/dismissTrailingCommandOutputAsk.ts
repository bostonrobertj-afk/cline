export async function dismissTrailingCommandOutputAskIfPresent({
	getClineMessages,
	dismissCommandOutputAsk,
}: {
	getClineMessages: () => Array<{ ask?: string }>
	dismissCommandOutputAsk: () => Promise<void>
}): Promise<boolean> {
	const lastMessage = getClineMessages().at(-1)
	if (lastMessage?.ask !== "command_output") {
		return false
	}

	await dismissCommandOutputAsk()
	return true
}
