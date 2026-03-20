import type { ManagedWorkflowPhaseState, ManagedWorkflowRunState } from "./types"

function flattenPhaseItems(
	run: ManagedWorkflowRunState,
): Array<{ phase: ManagedWorkflowPhaseState; label: string; completed: boolean; required: boolean; advisory: boolean }> {
	return run.phases.flatMap((phase) =>
		phase.items.map((item) => ({
			phase,
			label: `${phase.title}: ${item.label}`,
			completed: item.completed,
			required: item.required !== false && item.optional !== true,
			advisory: item.advisory === true || item.required === false,
		})),
	)
}

export function renderManagedWorkflowTaskProgress(run: ManagedWorkflowRunState): string {
	return flattenPhaseItems(run)
		.map((entry) => `- [${entry.completed ? "x" : " "}] ${entry.advisory ? "(Advisory) " : ""}${entry.label}`)
		.join("\n")
}

export function buildManagedWorkflowPrompt(run: ManagedWorkflowRunState): string {
	const currentPhase = run.phases[run.currentPhaseIndex]
	if (!currentPhase) {
		return `<active_bmad_workflow workflow_id="${run.workflowId}">
The managed workflow ${run.workflowId} is active and all required phases are complete.
Do not call attempt_completion until the user's request is otherwise fully satisfied.
</active_bmad_workflow>`
	}

	const items = currentPhase.items
		.map(
			(item) =>
				`- [${item.completed ? "x" : " "}] ${item.label}${item.required === false ? " (advisory)" : ""} (\`${item.id}\`)`,
		)
		.join("\n")

	return `<active_bmad_workflow workflow_id="${run.workflowId}" managed="true" phase_id="${currentPhase.id}">
The active BMAD workflow for this task is ${run.workflowId}.
This is a backend-managed workflow. Do not invent or rewrite the checklist manually.
Use the complete_workflow_item tool to mark items complete one at a time.
Do not advance beyond the current phase until all required items are complete.

Current phase: ${currentPhase.title}
Current phase file: ${currentPhase.sourcePath}

Current phase checklist:
${items}

<managed_workflow_phase path="${currentPhase.sourcePath}">
${currentPhase.sourceContent}
</managed_workflow_phase>
</active_bmad_workflow>`
}

export function listIncompleteManagedWorkflowItems(run: ManagedWorkflowRunState): string[] {
	return flattenPhaseItems(run)
		.filter((entry) => !entry.completed && entry.required)
		.map((entry) => entry.label)
}
