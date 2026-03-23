import type { ClineRulesToggles } from "@shared/cline-rules"
import type { GlobalInstructionsFile } from "@shared/remote-config/schema"
import type { SkillMetadata } from "@shared/skills"
import path from "path"
import { loadManagedWorkflowRegistry } from "@/core/task/managed-workflows/ManagedWorkflowRegistry"

export type ResolvedWorkflowSource = "managed" | "local" | "global" | "remote"

export type ResolvedWorkflowEntry = {
	name: string
	source: ResolvedWorkflowSource
	description: string
	fileName: string
	fullPath?: string
	contents?: string
	workflowId?: string
	slashCommand?: string
	aliases?: string[]
	skillName?: string
}

export type WorkflowResolutionOptions = {
	cwd?: string
	localWorkflowToggles?: ClineRulesToggles
	globalWorkflowToggles?: ClineRulesToggles
	remoteWorkflowToggles?: Record<string, boolean>
	remoteWorkflows?: GlobalInstructionsFile[]
}

function buildWorkflowDescription(name: string, source: ResolvedWorkflowSource, workflowId?: string): string {
	switch (source) {
		case "managed":
			return `Managed workflow: ${workflowId ?? name}`
		case "local":
			return `Workspace workflow: ${name}`
		case "global":
			return `Global workflow: ${name}`
		case "remote":
			return `Remote workflow: ${name}`
	}
}

function isWorkflowEnabled(workflow: GlobalInstructionsFile, toggles: Record<string, boolean>): boolean {
	return workflow.alwaysEnabled || toggles[workflow.name] !== false
}

export async function resolveAvailableWorkflows(options: WorkflowResolutionOptions): Promise<ResolvedWorkflowEntry[]> {
	const entries: ResolvedWorkflowEntry[] = []
	const seenNames = new Set<string>()

	if (options.cwd) {
		const managedWorkflows = await loadManagedWorkflowRegistry(options.cwd)
		for (const workflow of managedWorkflows) {
			if (seenNames.has(workflow.slashCommand)) {
				continue
			}

			seenNames.add(workflow.slashCommand)
			entries.push({
				name: workflow.slashCommand,
				source: "managed",
				description: buildWorkflowDescription(workflow.slashCommand, "managed", workflow.workflowId),
				fileName: workflow.slashCommand,
				workflowId: workflow.workflowId,
				slashCommand: workflow.slashCommand,
				aliases: workflow.aliases,
				skillName: workflow.skillName,
			})
		}
	}

	for (const [workflowPath, enabled] of Object.entries(options.localWorkflowToggles ?? {})) {
		if (!enabled) {
			continue
		}

		const name = path.basename(workflowPath)
		if (seenNames.has(name)) {
			continue
		}

		seenNames.add(name)
		entries.push({
			name,
			source: "local",
			description: buildWorkflowDescription(name, "local"),
			fileName: name,
			fullPath: workflowPath,
		})
	}

	for (const [workflowPath, enabled] of Object.entries(options.globalWorkflowToggles ?? {})) {
		if (!enabled) {
			continue
		}

		const name = path.basename(workflowPath)
		if (seenNames.has(name)) {
			continue
		}

		seenNames.add(name)
		entries.push({
			name,
			source: "global",
			description: buildWorkflowDescription(name, "global"),
			fileName: name,
			fullPath: workflowPath,
		})
	}

	for (const workflow of options.remoteWorkflows ?? []) {
		if (!isWorkflowEnabled(workflow, options.remoteWorkflowToggles ?? {})) {
			continue
		}

		if (seenNames.has(workflow.name)) {
			continue
		}

		seenNames.add(workflow.name)
		entries.push({
			name: workflow.name,
			source: "remote",
			description: buildWorkflowDescription(workflow.name, "remote"),
			fileName: workflow.name,
			contents: workflow.contents,
		})
	}

	return entries
}

export async function resolveWorkflowByName(
	options: WorkflowResolutionOptions,
	name: string,
): Promise<ResolvedWorkflowEntry | undefined> {
	const workflows = await resolveAvailableWorkflows(options)
	const managedMatch = workflows.find(
		(workflow) =>
			workflow.source === "managed" &&
			(workflow.name === name ||
				workflow.workflowId === name ||
				workflow.skillName === name ||
				workflow.aliases?.includes(name) === true),
	)
	if (managedMatch) {
		return managedMatch
	}

	return workflows.find((workflow) => workflow.name === name)
}

export function createWorkflowSkillMetadata(workflows: ResolvedWorkflowEntry[]): SkillMetadata[] {
	return workflows.map((workflow) => ({
		name: workflow.name,
		description: workflow.description,
		path:
			workflow.fullPath ??
			(workflow.source === "managed"
				? `managed-workflow://${workflow.workflowId ?? workflow.name}`
				: `remote-workflow://${workflow.name}`),
		source: workflow.source === "local" ? "project" : "global",
	}))
}
