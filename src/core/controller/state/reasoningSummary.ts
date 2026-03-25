import {
	isOpenaiReasoningSummary,
	normalizeOpenaiReasoningSummary as normalizeOpenaiReasoningSummaryString,
	OpenaiReasoningSummary,
} from "@/shared/storage/types"

export function normalizeOpenaiReasoningSummary(summary: OpenaiReasoningSummary | string): OpenaiReasoningSummary {
	if (isOpenaiReasoningSummary(summary)) {
		return summary
	}

	return normalizeOpenaiReasoningSummaryString(summary)
}
