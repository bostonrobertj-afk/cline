import type {
	ManagedWorkflowInstructionNode,
	ManagedWorkflowPhaseState,
	ManagedWorkflowRunState,
	ManagedWorkflowStepDefinition,
} from "./types"

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

function findActiveWorkflowItem(run: ManagedWorkflowRunState) {
	const currentPhase = run.phases[run.currentPhaseIndex]
	if (!currentPhase) {
		return undefined
	}

	return currentPhase.items.find((item) => !item.completed && item.required !== false && item.optional !== true)
}

function findStepForItem(phase: ManagedWorkflowPhaseState, itemId?: string): ManagedWorkflowStepDefinition | undefined {
	if (!itemId || !phase.execution) {
		return undefined
	}

	return phase.execution.steps.find((step) => step.id === itemId)
}

function formatRoute(node: ManagedWorkflowInstructionNode): string {
	switch (node.routeKind) {
		case "goto":
			return `Go to step ${node.routeTarget ?? "the specified step"}`
		case "handoff":
			return `Read fully and follow ${node.routeTarget ?? "the specified workflow file"}`
		case "return":
			return "Return to the caller"
		case "exit":
			return "Exit the workflow"
		default:
			return "Follow the routing instruction"
	}
}

function groupInstructionNodes(nodes: ManagedWorkflowInstructionNode[]) {
	return {
		actions: nodes.filter((node) => node.type === "action"),
		asks: nodes.filter((node) => node.type === "ask"),
		outputs: nodes.filter((node) => node.type === "output"),
		branches: nodes.filter((node) => node.type === "branch"),
		details: nodes.filter((node) => node.type === "detail"),
		templateOutputs: nodes.filter((node) => node.type === "template-output"),
		annotations: nodes.filter((node) => node.type === "annotation"),
		routes: nodes.filter((node) => node.type === "route"),
	}
}

function renderInstructionLeaf(node: ManagedWorkflowInstructionNode): string {
	const labelPrefix = node.condition ? `If ${node.condition}: ` : ""
	const baseText = node.type === "route" ? formatRoute(node) : (node.text ?? "")
	const leaf = `${labelPrefix}${baseText}`.trim()
	const childDetails = node.children?.length ? renderGroupedInstructionContent(node.children, 1) : ""
	return childDetails ? `${leaf}\n${childDetails}` : leaf
}

function renderBranch(node: ManagedWorkflowInstructionNode, level = 0): string {
	const heading = `${"  ".repeat(level)}If ${node.condition ?? "the branch condition applies"}:`
	const body = renderGroupedInstructionContent(node.children ?? [], level + 1)
	return body ? `${heading}\n${body}` : `${heading}\n${"  ".repeat(level + 1)}- Follow this branch`
}

function renderGroupedSection(title: string, entries: string[], level = 0): string {
	if (entries.length === 0) {
		return ""
	}

	const prefix = "  ".repeat(level)
	const bullets = entries.map((entry) => `${prefix}- ${entry}`).join("\n")
	return `${prefix}${title}:\n${bullets}`
}

function renderGroupedInstructionContent(nodes: ManagedWorkflowInstructionNode[], level = 0): string {
	if (nodes.length === 0) {
		return ""
	}

	const grouped = groupInstructionNodes(nodes)
	const sections = [
		renderGroupedSection(
			"Actions",
			grouped.actions.map((node) => renderInstructionLeaf(node)),
			level,
		),
		renderGroupedSection(
			"Asks",
			grouped.asks.map((node) => renderInstructionLeaf(node)),
			level,
		),
		renderGroupedSection(
			"Outputs",
			grouped.outputs.map((node) => renderInstructionLeaf(node)),
			level,
		),
		renderGroupedSection(
			"Details",
			grouped.details.map((node) => renderInstructionLeaf(node)),
			level,
		),
		renderGroupedSection(
			"Template Outputs",
			grouped.templateOutputs.map((node) => renderInstructionLeaf(node)),
			level,
		),
		renderGroupedSection(
			"Annotations",
			grouped.annotations.map((node) =>
				`${node.annotationKind ? `${node.annotationKind}: ` : ""}${renderInstructionLeaf(node)}`.trim(),
			),
			level,
		),
		renderGroupedSection(
			"Routes",
			grouped.routes.map((node) => renderInstructionLeaf(node)),
			level,
		),
		renderGroupedSection(
			"Branches",
			grouped.branches.map((node) => renderBranch(node, level + 1).trimStart()),
			level,
		),
	].filter(Boolean)

	return sections.join("\n\n")
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
	const activeItem = findActiveWorkflowItem(run)
	const activeStep = findStepForItem(currentPhase, activeItem?.stepId)
	const activeStepInstructions =
		activeStep && activeStep.instructions.length > 0
			? `Current active step: ${activeStep.goal} (\`${activeStep.id}\`)\n\n${renderGroupedInstructionContent(activeStep.instructions)}`
			: activeItem?.blocked && currentPhase.checkpointText
				? `Current checkpoint: ${currentPhase.checkpointText}`
				: activeItem
					? `Current active step: ${activeItem.label} (\`${activeItem.id}\`)`
					: "No active workflow item remains in this phase."

	return `<active_bmad_workflow workflow_id="${run.workflowId}" managed="true" phase_id="${currentPhase.id}">
The active BMAD workflow for this task is ${run.workflowId}.
This is a backend-managed workflow. Do not invent or rewrite the checklist manually.
Use the complete_workflow_item tool to mark items complete one at a time.
Do not advance beyond the current phase until all required items are complete.

Current phase: ${currentPhase.title}

Current phase checklist:
${items}

${activeStepInstructions}
</active_bmad_workflow>`
}

export function listIncompleteManagedWorkflowItems(run: ManagedWorkflowRunState): string[] {
	return flattenPhaseItems(run)
		.filter((entry) => !entry.completed && entry.required)
		.map((entry) => entry.label)
}
