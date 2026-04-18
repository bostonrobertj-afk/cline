export const DEFAULT_PROMPT_REFRESH_FREQUENCY = 5
export const MIN_PROMPT_REFRESH_FREQUENCY = 0
export const MAX_PROMPT_REFRESH_FREQUENCY = 20

export function normalizePromptRefreshFrequency(value: number | undefined): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return DEFAULT_PROMPT_REFRESH_FREQUENCY
	}

	return Math.min(MAX_PROMPT_REFRESH_FREQUENCY, Math.max(MIN_PROMPT_REFRESH_FREQUENCY, Math.trunc(value)))
}

export function getPromptRefreshInterval(value: number | undefined): number {
	const frequency = normalizePromptRefreshFrequency(value)
	return frequency === 0 ? 1 : frequency
}

export function shouldSendFullPromptAssembly(params: {
	isFirstRequest: boolean
	hasHumanAuthoredInput: boolean
	activeWorkflowJustStarted?: boolean
	didRespondToPlanAskBySwitchingMode?: boolean
	turnsSinceFullPromptRefresh: number
	promptRefreshFrequency: number | undefined
}): boolean {
	if (
		params.isFirstRequest ||
		params.hasHumanAuthoredInput ||
		params.activeWorkflowJustStarted ||
		params.didRespondToPlanAskBySwitchingMode
	) {
		return true
	}

	const refreshInterval = getPromptRefreshInterval(params.promptRefreshFrequency)
	return params.turnsSinceFullPromptRefresh + 1 >= refreshInterval
}

export function getNextTurnsSinceFullPromptRefresh(params: {
	didSendFullPromptAssembly: boolean
	hasHumanAuthoredInput: boolean
	turnsSinceFullPromptRefresh: number
}): number {
	if (params.didSendFullPromptAssembly || params.hasHumanAuthoredInput) {
		return 0
	}

	return params.turnsSinceFullPromptRefresh + 1
}

export function shouldUseContinuationTurnPrompt(params: {
	hasHumanAuthoredInput: boolean
	shouldSendFullPromptAssembly: boolean
}): boolean {
	return params.hasHumanAuthoredInput === false && params.shouldSendFullPromptAssembly === false
}
