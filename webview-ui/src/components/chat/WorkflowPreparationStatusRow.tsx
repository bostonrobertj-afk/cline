import { CheckIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react"

interface WorkflowPreparationStatusRowProps {
	state: "pending" | "success" | "failure"
	label: string
}

export function WorkflowPreparationStatusRow({ state, label }: WorkflowPreparationStatusRowProps) {
	const icon =
		state === "pending" ? (
			<LoaderCircleIcon className="size-4 animate-spin" />
		) : state === "success" ? (
			<CheckIcon className="size-4" />
		) : (
			<TriangleAlertIcon className="size-4" />
		)

	return (
		<div className="border border-editor-group-border rounded-xs bg-code/40 p-3">
			<div className="flex items-center gap-2 text-sm">
				{icon}
				<span>{label}</span>
			</div>
		</div>
	)
}
