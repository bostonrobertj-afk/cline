import { getManagedWorkflowPlaceholderMap, resolveManagedWorkflowPlaceholderText } from "./placeholders"
import type {
	ManagedWorkflowInstructionNode,
	ManagedWorkflowPhaseState,
	ManagedWorkflowRunState,
	ManagedWorkflowStepDefinition,
} from "./types"

function flattenPhaseItems(
	run: ManagedWorkflowRunState,
): Array<{ phase: ManagedWorkflowPhaseState; label: string; completed: boolean; required: boolean; advisory: boolean }> {
	const placeholders = getManagedWorkflowPlaceholderMap(run)
	return run.phases.flatMap((phase) =>
		phase.items.map((item) => ({
			phase,
			label: `${resolveManagedWorkflowPlaceholderText(phase.title, placeholders) ?? phase.title}: ${
				resolveManagedWorkflowPlaceholderText(item.label, placeholders) ?? item.label
			}`,
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

function formatRoute(node: ManagedWorkflowInstructionNode, placeholders: Record<string, string>): string {
	const routeTarget = resolveManagedWorkflowPlaceholderText(node.routeTarget, placeholders)
	switch (node.routeKind) {
		case "goto":
			return `Go to step ${routeTarget ?? "the specified step"}`
		case "handoff":
			return `Read fully and follow ${routeTarget ?? "the specified workflow file"}`
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

function renderInstructionLeaf(node: ManagedWorkflowInstructionNode, placeholders: Record<string, string>): string {
	const condition = resolveManagedWorkflowPlaceholderText(node.condition, placeholders)
	const labelPrefix = condition ? `If ${condition}: ` : ""
	const baseText =
		node.type === "route"
			? formatRoute(node, placeholders)
			: (resolveManagedWorkflowPlaceholderText(node.text, placeholders) ?? node.text ?? "")
	const leaf = `${labelPrefix}${baseText}`.trim()
	const childDetails = node.children?.length ? renderGroupedInstructionContent(node.children, 1, placeholders) : ""
	return childDetails ? `${leaf}\n${childDetails}` : leaf
}

function renderBranch(node: ManagedWorkflowInstructionNode, level = 0, placeholders: Record<string, string>): string {
	const condition = resolveManagedWorkflowPlaceholderText(node.condition, placeholders)
	const heading = `${"  ".repeat(level)}If ${condition ?? "the branch condition applies"}:`
	const body = renderGroupedInstructionContent(node.children ?? [], level + 1, placeholders)
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

function renderGroupedInstructionContent(
	nodes: ManagedWorkflowInstructionNode[],
	level = 0,
	placeholders: Record<string, string> = {},
): string {
	if (nodes.length === 0) {
		return ""
	}

	const grouped = groupInstructionNodes(nodes)
	const sections = [
		renderGroupedSection(
			"Actions",
			grouped.actions.map((node) => renderInstructionLeaf(node, placeholders)),
			level,
		),
		renderGroupedSection(
			"Asks",
			grouped.asks.map((node) => renderInstructionLeaf(node, placeholders)),
			level,
		),
		renderGroupedSection(
			"Outputs",
			grouped.outputs.map((node) => renderInstructionLeaf(node, placeholders)),
			level,
		),
		renderGroupedSection(
			"Details",
			grouped.details.map((node) => renderInstructionLeaf(node, placeholders)),
			level,
		),
		renderGroupedSection(
			"Template Outputs",
			grouped.templateOutputs.map((node) => renderInstructionLeaf(node, placeholders)),
			level,
		),
		renderGroupedSection(
			"Annotations",
			grouped.annotations.map((node) =>
				`${node.annotationKind ? `${node.annotationKind}: ` : ""}${renderInstructionLeaf(node, placeholders)}`.trim(),
			),
			level,
		),
		renderGroupedSection(
			"Routes",
			grouped.routes.map((node) => renderInstructionLeaf(node, placeholders)),
			level,
		),
		renderGroupedSection(
			"Branches",
			grouped.branches.map((node) => renderBranch(node, level + 1, placeholders).trimStart()),
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
	const placeholders = getManagedWorkflowPlaceholderMap(run)
	if (!currentPhase) {
		return `<active_bmad_workflow workflow_id="${run.workflowId}">
The managed workflow ${run.workflowId} is active and all required phases are complete.
How to finalize and exit this workflow:
- call complete_workflow_item for all items in the task list, up to and including the final item
- Call attempt_completion and include your full final report to the user.
- STOP and await further instruction from the user.</active_bmad_workflow>`
	}

	const items = currentPhase.items
		.map(
			(item) =>
				`- [${item.completed ? "x" : " "}] ${
					resolveManagedWorkflowPlaceholderText(item.label, placeholders) ?? item.label
				}${item.required === false ? " (advisory)" : ""} (\`${item.id}\`)`,
		)
		.join("\n")
	const activeItem = findActiveWorkflowItem(run)
	const activeStep = findStepForItem(currentPhase, activeItem?.stepId)
	const activeStepInstructions =
		activeStep && activeStep.instructions.length > 0
			? `Current active step: ${resolveManagedWorkflowPlaceholderText(activeStep.goal, placeholders) ?? activeStep.goal} (\`${activeStep.id}\`)\n\n${renderGroupedInstructionContent(activeStep.instructions, 0, placeholders)}`
			: activeItem?.blocked && currentPhase.checkpointText
				? `Current checkpoint: ${resolveManagedWorkflowPlaceholderText(currentPhase.checkpointText, placeholders) ?? currentPhase.checkpointText}`
				: activeItem
					? `Current active step: ${resolveManagedWorkflowPlaceholderText(activeItem.label, placeholders) ?? activeItem.label} (\`${activeItem.id}\`)`
					: "No active workflow item remains in this phase."

	return `<active_bmad_workflow workflow_id="${run.workflowId}" managed="true" phase_id="${currentPhase.id}">
The active BMAD workflow for this task is ${run.workflowId}.
This is a backend-managed workflow. Do not invent or rewrite the checklist manually.
You MUST limit your scope to the detailed instructions for the active step under current phase checklist.
You MUST mark each step as complete using the complete_workflow_item tool before moving on, even if you are skipping an optional step.
You MUST NOT attempt to mark multiple steps complete simultaneously. The system will not accept batched completion attempts.
The workflow may be broken into phases, each with distinct phase checklists.
The workflow will present details for the next step or phase as you complete existing items on the list.
Do not assume that you are done with this workflow until you see a message indicating "all required phases are complete".


Current phase: ${resolveManagedWorkflowPlaceholderText(currentPhase.title, placeholders) ?? currentPhase.title}

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
