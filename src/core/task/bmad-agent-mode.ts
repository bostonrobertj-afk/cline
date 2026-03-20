import fs from "fs/promises"
import path from "path"
import { discoverSkills, getAvailableSkills, getSkillContent } from "../context/instructions/user-instructions/skills"

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
export const BMAD_AGENT_ALIAS_PREFIX = "bmad-agent-bmm-"

type BmadAgentActivationResolution = {
	agent: BmadAgentAllowlistEntry
	skillName: string
	invokedSlashCommand: string
	preferredActivationCommand: string
}

type BmadAgentActivationOptions = {
	skillName?: string
	activatedSlashCommand?: string
}

type BmadAgentReminderOptions = {
	skillName?: string
	activatedSlashCommand?: string
}

type LoadedInstructionDocument = {
	path: string
	content: string
}

async function loadAgentAllowlistConfig(cwd: string): Promise<BmadAgentAllowlistConfig | undefined> {
	try {
		const fullPath = path.resolve(cwd, CONFIG_PATH)
		const raw = await fs.readFile(fullPath, "utf8")
		return JSON.parse(raw) as BmadAgentAllowlistConfig
	} catch {
		return undefined
	}
}

function getAgentAliasSuffix(agentId: string): string {
	return agentId.startsWith("bmad-") ? agentId.slice("bmad-".length) : agentId
}

function normalizeBmadAliasCommand(commandName: string): string | undefined {
	if (!commandName.startsWith(BMAD_AGENT_ALIAS_PREFIX)) {
		return undefined
	}

	const suffix = commandName.slice(BMAD_AGENT_ALIAS_PREFIX.length)
	if (!suffix) {
		return undefined
	}

	return `bmad-${suffix}`
}

function formatSlashCommand(commandName: string): string {
	return commandName.startsWith("/") ? commandName : `/${commandName}`
}

function extractReferencedMarkdownPaths(instructions: string): string[] {
	const matches = Array.from(instructions.matchAll(/\{project-root\}\/([^\s`"')>]+\.md)/g))
	const uniquePaths = new Set<string>()

	for (const match of matches) {
		const referencedPath = match[1]?.trim()
		if (referencedPath) {
			uniquePaths.add(referencedPath)
		}
	}

	return Array.from(uniquePaths)
}

async function loadInstalledBmadSkillInstructions(
	cwd: string,
	skillName: string,
): Promise<{ instructions: string; referencedDocuments: LoadedInstructionDocument[] } | undefined> {
	const discoveredSkills = await discoverSkills(cwd)
	const availableSkills = getAvailableSkills(discoveredSkills)
	const skillContent = await getSkillContent(skillName, availableSkills)

	if (!skillContent) {
		return undefined
	}

	const referencedDocuments: LoadedInstructionDocument[] = []
	for (const referencedPath of extractReferencedMarkdownPaths(skillContent.instructions)) {
		try {
			const content = await fs.readFile(path.resolve(cwd, referencedPath), "utf8")
			referencedDocuments.push({ path: referencedPath, content })
		} catch {
			// Non-fatal: the installed skill remains the source of truth even if a referenced document cannot be loaded.
		}
	}

	return {
		instructions: skillContent.instructions,
		referencedDocuments,
	}
}

function buildReferencedDocumentsSection(documents: LoadedInstructionDocument[]): string {
	if (documents.length === 0) {
		return ""
	}

	return `

<installed_bmad_skill_loaded_documents>
${documents
	.map(
		(document) => `<document path="${document.path}">
${document.content}
</document>`,
	)
	.join("\n\n")}
</installed_bmad_skill_loaded_documents>`
}

function buildFallbackActivationInstructions(
	agent: BmadAgentAllowlistEntry,
	activatedSlashCommand: string,
	personaContent?: string,
): string {
	const personaSection = personaContent
		? `

${personaContent}`
		: ""

	return `<active_bmad_agent activated="true" agent_id="${agent.id}" slash_command="${formatSlashCommand(activatedSlashCommand)}">
The user explicitly activated this BMAD agent persona with ${formatSlashCommand(activatedSlashCommand)}.
You must enter this persona now and follow its activation/menu instructions.
${agent.personaReminder ? `${agent.personaReminder}` : ""}
While this agent mode is active, only use these skills: ${agent.allowedSkills.join(", ")}.
${personaSection}
</active_bmad_agent>`
}

function parseAgentReference(referenceMarkdown: string): Array<{ agentName: string; scope: string; agentId: string }> {
	return referenceMarkdown
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.startsWith("|"))
		.map((line) =>
			line
				.split("|")
				.slice(1, -1)
				.map((column) => column.trim()),
		)
		.filter((columns) => columns.length >= 3)
		.filter(([agentName, scope]) => agentName !== "Agent" && scope !== "---")
		.map(([agentName, scope, rawCommand]) => {
			const normalizedCommand = rawCommand.replace(/`/g, "").trim()
			const agentId = normalizedCommand.replace(/^\//, "").replace(/\.md$/, "")
			return { agentName, scope, agentId }
		})
		.filter((entry) => entry.agentId.startsWith("bmad-"))
}

export function toPreferredBmadAgentActivationCommand(agentId: string): string {
	return `${BMAD_AGENT_ALIAS_PREFIX}${getAgentAliasSuffix(agentId)}`
}

export async function resolveBmadAgentActivation(
	cwd: string,
	commandName: string,
): Promise<BmadAgentActivationResolution | undefined> {
	const config = await loadAgentAllowlistConfig(cwd)
	const aliasNormalizedCommand = normalizeBmadAliasCommand(commandName)
	const matchingAgent = config?.agents.find(
		(agent) =>
			agent.slashCommand === commandName ||
			agent.id === commandName ||
			(aliasNormalizedCommand !== undefined && agent.id === aliasNormalizedCommand),
	)

	if (!matchingAgent) {
		return undefined
	}

	return {
		agent: matchingAgent,
		skillName: matchingAgent.id,
		invokedSlashCommand: commandName,
		preferredActivationCommand: toPreferredBmadAgentActivationCommand(matchingAgent.id),
	}
}

export async function getBmadAgentBySlashCommand(cwd: string, commandName: string): Promise<BmadAgentAllowlistEntry | undefined> {
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

export async function buildBmadAgentCatalogInstructions(cwd: string, activeAgentId?: string): Promise<string | undefined> {
	const referenceMarkdown = await getBmadAgentReference(cwd)
	if (!referenceMarkdown) {
		return undefined
	}

	const entries = parseAgentReference(referenceMarkdown).filter((entry) => entry.agentId !== activeAgentId)
	if (entries.length === 0) {
		return undefined
	}

	const agentLines = entries
		.map(
			(entry) =>
				`- ${entry.agentName} — ${entry.scope} — ${formatSlashCommand(toPreferredBmadAgentActivationCommand(entry.agentId))}`,
		)
		.join("\n")

	return `<available_bmad_agents>
Other BMAD agents available for new-thread handoff if the user's request is outside your scope:
${agentLines}

If you recommend another BMAD agent, tell the user to start a new thread with that command rather than switching personas implicitly in this thread.
</available_bmad_agents>`
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

export async function buildBmadAgentActivationInstructions(
	cwd: string,
	agentId: string,
	options: BmadAgentActivationOptions = {},
): Promise<string | undefined> {
	const agent = await getBmadAgentById(cwd, agentId)
	if (!agent) {
		return undefined
	}

	const skillName = options.skillName ?? agent.id
	const activatedSlashCommand = options.activatedSlashCommand ?? agent.slashCommand
	const installedSkill = await loadInstalledBmadSkillInstructions(cwd, skillName)

	if (installedSkill) {
		return `<active_bmad_agent activated="true" agent_id="${agent.id}" skill_name="${skillName}" slash_command="${formatSlashCommand(activatedSlashCommand)}">
The user explicitly activated this BMAD agent persona with ${formatSlashCommand(activatedSlashCommand)}.
The installed BMAD skill "${skillName}" is the activation source for this persona.
You must enter this persona now and follow its activation/menu instructions.
${agent.personaReminder ? `${agent.personaReminder}` : ""}
While this agent mode is active, only use these skills: ${agent.allowedSkills.join(", ")}.

<installed_bmad_skill_wrapper skill_name="${skillName}">
${installedSkill.instructions}
</installed_bmad_skill_wrapper>${buildReferencedDocumentsSection(installedSkill.referencedDocuments)}
</active_bmad_agent>`
	}

	try {
		const personaPath = path.resolve(cwd, agent.personaFile)
		const personaContent = await fs.readFile(personaPath, "utf8")
		return buildFallbackActivationInstructions(agent, activatedSlashCommand, personaContent)
	} catch {
		return buildFallbackActivationInstructions(agent, activatedSlashCommand)
	}
}

export function buildBmadAgentReminder(agent: BmadAgentAllowlistEntry, options: BmadAgentReminderOptions = {}): string {
	const skillName = options.skillName ?? agent.id
	const activatedSlashCommand = options.activatedSlashCommand ?? agent.slashCommand
	return `<active_bmad_agent activated="false" agent_id="${agent.id}" skill_name="${skillName}" slash_command="${formatSlashCommand(activatedSlashCommand)}">
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
