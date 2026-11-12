import type { Mode, OpenaiReasoningEffort } from "@shared/storage/types"
import { getModelReasoningEfforts, resolveModelReasoningEffort } from "@shared/utils/reasoning-support"
import { memo } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { getModeSpecificFields, normalizeApiConfiguration } from "./utils/providerUtils"
import { useApiConfigurationHandlers } from "./utils/useApiConfigurationHandlers"

interface ReasoningEffortSelectorProps {
	currentMode: Mode
	label?: string
	description?: string
	allowedEfforts?: readonly OpenaiReasoningEffort[]
}

const ReasoningEffortSelector = ({
	currentMode,
	label = "Reasoning Effort",
	description = "Higher effort improves depth, but uses more tokens.",
	allowedEfforts,
}: ReasoningEffortSelectorProps) => {
	const { apiConfiguration } = useExtensionState()
	const { handleModeFieldChange } = useApiConfigurationHandlers()
	const modeFields = getModeSpecificFields(apiConfiguration, currentMode)
	const { selectedProvider, selectedModelId } = normalizeApiConfiguration(apiConfiguration, currentMode)
	const supportedEfforts = getModelReasoningEfforts(selectedModelId, selectedProvider)
	const effectiveAllowedEfforts = allowedEfforts
		? supportedEfforts.filter((effort) => allowedEfforts.includes(effort))
		: supportedEfforts
	const resolvedEffort = resolveModelReasoningEffort(selectedModelId, selectedProvider, modeFields.reasoningEffort)
	const selectedEffort = effectiveAllowedEfforts.find((effort) => effort === resolvedEffort) ?? "medium"

	return (
		<div style={{ marginTop: 10, marginBottom: 5 }}>
			<Label className="text-xs font-medium">{label}</Label>
			<Select
				onValueChange={(value) =>
					handleModeFieldChange({ plan: "planModeReasoningEffort", act: "actModeReasoningEffort" }, value, currentMode)
				}
				value={selectedEffort}>
				<SelectTrigger className="w-full mt-1">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{effectiveAllowedEfforts.map((effort) => (
						<SelectItem key={effort} value={effort}>
							{effort.charAt(0).toUpperCase() + effort.slice(1)}
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

export default memo(ReasoningEffortSelector)
