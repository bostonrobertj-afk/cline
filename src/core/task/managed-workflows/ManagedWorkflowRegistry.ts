import fs from "fs/promises"
import path from "path"
import { Logger } from "@/shared/services/Logger"
import type { ManagedWorkflowDefinition } from "./types"

export const MANAGED_WORKFLOWS_CONFIG_PATH = path.join("_bmad", "_config", "managed-workflows.json")

let registryCache = new Map<string, ManagedWorkflowDefinition[]>()

export async function loadManagedWorkflowRegistry(cwd: string): Promise<ManagedWorkflowDefinition[]> {
	const cached = registryCache.get(cwd)
	if (cached) {
		return cached
	}

	try {
		const registryPath = path.resolve(cwd, MANAGED_WORKFLOWS_CONFIG_PATH)
		const parsed = JSON.parse(await fs.readFile(registryPath, "utf8")) as ManagedWorkflowDefinition[]
		const workflows = parsed.filter((workflow) => workflow.supportsManagedExecution)
		registryCache.set(cwd, workflows)
		return workflows
	} catch (error) {
		Logger.warn("[ManagedWorkflowRegistry] Failed to load managed workflow registry", error)
		return []
	}
}

export async function getManagedWorkflowDefinition(
	cwd: string,
	workflowId: string,
): Promise<ManagedWorkflowDefinition | undefined> {
	const registry = await loadManagedWorkflowRegistry(cwd)
	return registry.find(
		(workflow) =>
			workflow.workflowId === workflowId ||
			workflow.skillName === workflowId ||
			workflow.aliases?.includes(workflowId) === true,
	)
}

export async function getManagedWorkflowDefinitionBySlashCommand(
	cwd: string,
	commandName: string,
): Promise<ManagedWorkflowDefinition | undefined> {
	const normalized = commandName.replace(/^\//, "")
	const registry = await loadManagedWorkflowRegistry(cwd)
	return registry.find((workflow) => workflow.slashCommand === normalized || workflow.aliases?.includes(normalized) === true)
}

export async function isManagedWorkflow(cwd: string, workflowId: string): Promise<boolean> {
	return (await getManagedWorkflowDefinition(cwd, workflowId)) !== undefined
}

export function clearManagedWorkflowRegistryCache(cwd?: string): void {
	if (cwd) {
		registryCache.delete(cwd)
		return
	}
	registryCache = new Map<string, ManagedWorkflowDefinition[]>()
}
