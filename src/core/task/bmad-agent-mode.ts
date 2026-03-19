import fs from "fs/promises"
import path from "path"

export type BmadAgentAllowlistEntry = {
	id: string
	slashCommand: string
	personaFile: string
	personaReminder?: string
	allowedSkills: string[]
}

type BmadAgentAllowlistConfig = {
	exitCommand: string
	agents: BmadAgentAllowlistEntry[]
}

type WorkflowReminderEntry = {
	purpose: string
}

type WorkflowReminderConfig = Record<string, WorkflowReminderEntry>

const CONFIG_PATH = path.join("_bmad", "_config", "agent-workflow-allowlist.json")
const WORKFLOW_REMINDERS_PATH = path.join("_bmad", "_config", "workflow-reminders.json")

async function loadAgentAllowlistConfig(cwd: string): Promise<BmadAgentAllowlistConfig | undefined> {
	try {
		const fullPath = path.resolve(cwd, CONFIG_PATH)
		const raw = await fs.readFile(fullPath, "utf8")
		return JSON.parse(raw) as BmadAgentAllowlistConfig
	} catch {
		return undefined
	}
}

export async function getBmadAgentBySlashCommand(
	cwd: string,
	commandName: string,
): Promise<BmadAgentAllowlistEntry | undefined> {
	const config = await loadAgentAllowlistConfig(cwd)
	return config?.agents.find((agent) => agent.slashCommand === commandName)
}

export async function getBmadAgentById(cwd: string, agentId: string): Promise<BmadAgentAllowlistEntry | undefined> {
	const config = await loadAgentAllowlistConfig(cwd)
	return config?.agents.find((agent) => agent.id === agentId)
}

export async function isBmadExitCommand(cwd: string, commandName: string): Promise<boolean> {
	const config = await loadAgentAllowlistConfig(cwd)
	return config?.exitCommand === commandName
}

export async function getBmadAgentReference(cwd: string): Promise<string | undefined> {
	try {
		const referencePath = path.resolve(cwd, "_bmad", "_config", "agent-reference.md")
		return (await fs.readFile(referencePath, "utf8")).trim()
	} catch {
		return undefined
	}
}

export async function getBmadWorkflowReminder(cwd: string, workflowId: string): Promise<string | undefined> {
	try {
		const remindersPath = path.resolve(cwd, WORKFLOW_REMINDERS_PATH)
		const raw = await fs.readFile(remindersPath, "utf8")
		const config = JSON.parse(raw) as WorkflowReminderConfig
		const entry = config[workflowId]
		if (!entry) {
			return undefined
		}
		return `<active_bmad_workflow workflow_id="${workflowId}">
The active BMAD workflow for this task is ${workflowId}.
${entry.purpose}
</active_bmad_workflow>`
	} catch {
		return undefined
	}
}

export async function buildBmadAgentActivationInstructions(cwd: string, agentId: string): Promise<string | undefined> {
	const agent = await getBmadAgentById(cwd, agentId)
	if (!agent) {
		return undefined
	}

	try {
		const personaPath = path.resolve(cwd, agent.personaFile)
		const personaContent = await fs.readFile(personaPath, "utf8")
		return `<active_bmad_agent activated="true" agent_id="${agent.id}" slash_command="/${agent.slashCommand}">
The user explicitly activated this BMAD agent persona with /${agent.slashCommand}.
You must enter this persona now and follow its activation/menu instructions.
${agent.personaReminder ? `${agent.personaReminder}` : ""}
While this agent mode is active, only use these skills: ${agent.allowedSkills.join(", ")}.

${personaContent}
</active_bmad_agent>`
	} catch {
		return `<active_bmad_agent activated="true" agent_id="${agent.id}" slash_command="/${agent.slashCommand}">
The user explicitly activated this BMAD agent persona with /${agent.slashCommand}.
Remain in this persona until /bmad-exit.
${agent.personaReminder ? `${agent.personaReminder}` : ""}
Only use these skills: ${agent.allowedSkills.join(", ")}.
</active_bmad_agent>`
	}
}

export function buildBmadAgentReminder(agent: BmadAgentAllowlistEntry): string {
	return `<active_bmad_agent activated="false" agent_id="${agent.id}" slash_command="/${agent.slashCommand}">
The active BMAD agent persona for this task is ${agent.id}.
Remain in this persona until /bmad-exit.
${agent.personaReminder ? `${agent.personaReminder}` : ""}
Only use these skills: ${agent.allowedSkills.join(", ")}.
</active_bmad_agent>`
}

export function buildBmadExitInstructions(): string {
	return `<active_bmad_agent_exit>
The user explicitly exited BMAD agent mode with /bmad-exit.
Do not continue any previously active BMAD agent persona unless reactivated with another /bmad-* command.
</active_bmad_agent_exit>`
}