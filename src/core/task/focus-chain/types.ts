export interface FocusChainUpdateResult {
	accepted: boolean
	feedback?: string
}

export interface FocusChainChecklistUpdateResult extends FocusChainUpdateResult {
	checklist?: string
}

export interface ParsedFocusChainItem {
	checked: boolean
	label: string
	normalizedLabel: string
}
