import { isOpenaiReasoningSummary, Mode, OPENAI_REASONING_SUMMARY_OPTIONS, OpenaiReasoningSummary } from "@shared/storage/types"
import { memo } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { getModeSpecificFields } from "./utils/providerUtils"
import { useApiConfigurationHandlers } from "./utils/useApiConfigurationHandlers"

interface ReasoningSummarySelectorProps {
	currentMode: Mode
	label?: string
	description?: string
	allowedSummaries?: readonly OpenaiReasoningSummary[]
}

const LABELS: Record<OpenaiReasoningSummary, string> = {
	none: "None",
	auto: "Auto",
	concise: "Concise",
	detailed: "Detailed",
}

const ReasoningSummarySelector = ({
	currentMode,
	label = "Reasoning Summary",
	description = "Controls returned reasoning summary detail. Lower settings reduce summary text, not reasoning effort.",
	allowedSummaries = OPENAI_REASONING_SUMMARY_OPTIONS,
}: ReasoningSummarySelectorProps) => {
	const { apiConfiguration } = useExtensionState()
	const { handleModeFieldChange } = useApiConfigurationHandlers()
	const modeFields = getModeSpecificFields(apiConfiguration, currentMode)
	const selectedSummary =
		isOpenaiReasoningSummary(modeFields.reasoningSummary) && allowedSummaries.includes(modeFields.reasoningSummary)
			? modeFields.reasoningSummary
			: "auto"

	return (
		<div style={{ marginTop: 10, marginBottom: 5 }}>
			<Label className="text-xs font-medium">{label}</Label>
			<Select
				onValueChange={(value) =>
					handleModeFieldChange(
						{ plan: "planModeReasoningSummary", act: "actModeReasoningSummary" },
						value,
						currentMode,
					)
				}
				value={selectedSummary}>
				<SelectTrigger className="w-full mt-1">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{allowedSummaries.map((summary) => (
						<SelectItem key={summary} value={summary}>
							{LABELS[summary]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<p
				style={{
					fontSize: "12px",
					marginTop: 3,
					marginBottom: 0,
					color: "var(--vscode-descriptionForeground)",
				}}>
				{description}
			</p>
		</div>
	)
}

export default memo(ReasoningSummarySelector)
