import type { SkillMetadata } from "@shared/skills"
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
const ALWAYS_ALLOWED_BMAD_SKILL_NAMES = ["bmad-help"] as const

const BUILTIN_BMAD_AGENT_ALLOWLIST: ReadonlyArray<BmadAgentAllowlistEntry> = [
	{
		id: "bmad-analyst",
		slashCommand: "bmad-analyst",
		personaFile: "_bmad/bmm/agents/analyst.md",
		personaReminder:
			"Stay in the Business Analyst persona: precise, evidence-driven, and focused on requirements, research, and root-cause clarity.",
		allowedSkills: [
			"bmad-brainstorming",
			"bmad-market-research",
			"bmad-domain-research",
			"bmad-technical-research",
			"bmad-create-product-brief",
			"bmad-document-project",
			"bmad-party-mode",
		],
	},
	{
		id: "bmad-pm",
		slashCommand: "bmad-pm",
		personaFile: "_bmad/bmm/agents/pm.md",
		personaReminder:
			"Stay in the Product Manager persona: scope tightly, ask why, and keep decisions centered on user value and product clarity.",
		allowedSkills: [
			"bmad-create-prd",
			"bmad-validate-prd",
			"bmad-edit-prd",
			"bmad-create-epics-and-stories",
			"bmad-check-implementation-readiness",
			"bmad-correct-course",
			"bmad-party-mode",
		],
	},
	{
		id: "bmad-architect",
		slashCommand: "bmad-architect",
		personaFile: "_bmad/bmm/agents/architect.md",
		personaReminder:
			"Stay in the Architect persona: calm, pragmatic, tradeoff-aware, and focused on scalable technical decisions.",
		allowedSkills: ["bmad-create-architecture", "bmad-check-implementation-readiness", "bmad-party-mode"],
	},
	{
		id: "bmad-ux-designer",
		slashCommand: "bmad-ux-designer",
		personaFile: "_bmad/bmm/agents/ux-designer.md",
		personaReminder:
			"Stay in the UX Designer persona: user-centered, flow-focused, and attentive to states, edge cases, and experience quality.",
		allowedSkills: ["bmad-create-ux-design", "bmad-party-mode"],
	},
	{
		id: "bmad-sm",
		slashCommand: "bmad-sm",
		personaFile: "_bmad/bmm/agents/sm.md",
		personaReminder:
			"Stay in the Scrum Master persona: crisp, checklist-driven, and focused on implementation-ready stories and clear sequencing.",
		allowedSkills: [
			"bmad-sprint-planning",
			"bmad-create-story",
			"bmad-retrospective",
			"bmad-correct-course",
			"bmad-party-mode",
		],
	},
	{
		id: "bmad-dev",
		slashCommand: "bmad-dev",
		personaFile: "_bmad/bmm/agents/dev.md",
		personaReminder:
			"Stay in the Developer persona: concise, implementation-first, and anchored in files, tasks, tests, and code quality.",
		allowedSkills: ["bmad-dev-story", "bmad-code-review", "bmad-party-mode"],
	},
	{
		id: "bmad-qa",
		slashCommand: "bmad-qa",
		personaFile: "_bmad/bmm/agents/qa.md",
		personaReminder:
			"Stay in the QA persona: practical, coverage-focused, and biased toward the smallest test set that gives confidence.",
		allowedSkills: ["bmad-qa-generate-e2e-tests", "bmad-party-mode"],
	},
	{
		id: "bmad-tech-writer",
		slashCommand: "bmad-tech-writer",
		personaFile: "_bmad/bmm/agents/tech-writer/tech-writer.md",
		personaReminder:
			"Stay in the Technical Writer persona: clear, structured, and focused on usable documentation and handoff quality.",
		allowedSkills: ["bmad-document-project", "bmad-party-mode"],
	},
	{
		id: "bmad-quick-flow-solo-dev",
		slashCommand: "bmad-quick-flow-solo-dev",
		personaFile: "_bmad/bmm/agents/quick-flow-solo-dev.md",
		personaReminder:
			"Stay in the Quick Flow Solo Dev persona: fast, lean, and relentlessly focused on shipping scoped work with minimum ceremony.",
		allowedSkills: ["bmad-quick-spec", "bmad-quick-dev", "bmad-code-review", "bmad-party-mode"],
	},
]

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

async function getConfiguredBmadAgentAllowlist(cwd: string): Promise<BmadAgentAllowlistConfig | undefined> {
	return loadAgentAllowlistConfig(cwd)
}

function findMatchingBmadAgent(
	agents: ReadonlyArray<BmadAgentAllowlistEntry>,
	commandName: string,
	aliasNormalizedCommand?: string,
): BmadAgentAllowlistEntry | undefined {
	return agents.find(
		(agent) =>
			agent.slashCommand === commandName ||
			agent.id === commandName ||
			(aliasNormalizedCommand !== undefined && agent.id === aliasNormalizedCommand),
	)
}

async function getAvailableBmadSkills(cwd: string): Promise<SkillMetadata[]> {
	const discoveredSkills = await discoverSkills(cwd)
	return getAvailableSkills(discoveredSkills)
}

async function hasAvailableSkill(cwd: string, skillName: string): Promise<boolean> {
	const availableSkills = await getAvailableBmadSkills(cwd)
	return availableSkills.some((skill) => skill.name === skillName)
}

async function hasPersonaFallback(cwd: string, personaFile: string): Promise<boolean> {
	if (!personaFile) {
		return false
	}

	try {
		await fs.access(path.resolve(cwd, personaFile))
		return true
	} catch {
		return false
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
	const availableSkills = await getAvailableBmadSkills(cwd)
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

function buildAgentActivationHeader(
	agent: BmadAgentAllowlistEntry,
	skillName: string | undefined,
	activatedSlashCommand: string,
): string {
	const skillNameAttr = skillName ? ` skill_name="${skillName}"` : ""
	const activationSource = skillName
		? `Activation source: installed BMAD skill "${skillName}".`
		: "Activation source: fallback persona document."

	return `<active_bmad_agent activated="true" agent_id="${agent.id}"${skillNameAttr} slash_command="${formatSlashCommand(activatedSlashCommand)}">
Activated via ${formatSlashCommand(activatedSlashCommand)}.
${activationSource}
${agent.personaReminder ? `${agent.personaReminder}` : ""}
Allowed workflow skills while this persona is active: ${agent.allowedSkills.join(", ")}.`
}

function buildInstalledSkillSection(
	skillName: string,
	installedSkill: { instructions: string; referencedDocuments: LoadedInstructionDocument[] },
): string {
	const referencedDocumentCount = installedSkill.referencedDocuments.length
	const summary = `<installed_bmad_skill_activation skill_name="${skillName}">
Use the installed BMAD activation source for persona behavior and workflow routing.
${referencedDocumentCount > 0 ? `Treat the loaded document${referencedDocumentCount === 1 ? "" : "s"} below as the primary source of truth for persona, activation, and menu instructions.` : "Treat the installed skill instructions below as the primary source of truth for persona and activation instructions."}
Remain in character until the user exits BMAD agent mode.
</installed_bmad_skill_activation>`

	if (referencedDocumentCount > 0) {
		return `${summary}${buildReferencedDocumentsSection(installedSkill.referencedDocuments)}`
	}

	return `${summary}

<installed_bmad_skill_instructions skill_name="${skillName}">
${installedSkill.instructions}
</installed_bmad_skill_instructions>`
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

	return `${buildAgentActivationHeader(agent, undefined, activatedSlashCommand)}
Follow the fallback persona document below as the source of truth for activation and menu behavior.
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
	const aliasNormalizedCommand = normalizeBmadAliasCommand(commandName)
	const configuredAgents = (await getConfiguredBmadAgentAllowlist(cwd))?.agents ?? []
	const matchingAgent =
		findMatchingBmadAgent(configuredAgents, commandName, aliasNormalizedCommand) ??
		findMatchingBmadAgent(BUILTIN_BMAD_AGENT_ALLOWLIST, commandName, aliasNormalizedCommand)

	if (!matchingAgent) {
		return undefined
	}

	const activationSourceAvailable =
		(await hasAvailableSkill(cwd, matchingAgent.id)) || (await hasPersonaFallback(cwd, matchingAgent.personaFile))
	if (!activationSourceAvailable) {
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
	const configuredAgents = (await getConfiguredBmadAgentAllowlist(cwd))?.agents ?? []
	return (
		configuredAgents.find((agent) => agent.slashCommand === commandName) ??
		BUILTIN_BMAD_AGENT_ALLOWLIST.find((agent) => agent.slashCommand === commandName)
	)
}

export async function getBmadAgentById(cwd: string, agentId: string): Promise<BmadAgentAllowlistEntry | undefined> {
	const configuredAgents = (await getConfiguredBmadAgentAllowlist(cwd))?.agents ?? []
	return (
		configuredAgents.find((agent) => agent.id === agentId) ??
		BUILTIN_BMAD_AGENT_ALLOWLIST.find((agent) => agent.id === agentId)
	)
}

export async function isBmadExitCommand(cwd: string, commandName: string): Promise<boolean> {
	const configuredExitCommand = (await getConfiguredBmadAgentAllowlist(cwd))?.exitCommand
	return (configuredExitCommand ?? "bmad-exit") === commandName
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
		return `${buildAgentActivationHeader(agent, skillName, activatedSlashCommand)}
${buildInstalledSkillSection(skillName, installedSkill)}
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
	return `<active_bmad_agent activated="true" reminder="true" agent_id="${agent.id}" skill_name="${skillName}" slash_command="${formatSlashCommand(activatedSlashCommand)}">
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

export function filterSkillsForBmadAgentMode(
	enabledSkills: SkillMetadata[],
	activeAgent: Pick<BmadAgentAllowlistEntry, "allowedSkills"> | undefined | null,
): SkillMetadata[] {
	const alwaysAllowedSkillNames = new Set<string>(ALWAYS_ALLOWED_BMAD_SKILL_NAMES)

	if (activeAgent === undefined) {
		return enabledSkills
	}

	if (activeAgent === null) {
		return enabledSkills.filter((skill) => alwaysAllowedSkillNames.has(skill.name))
	}

	const allowedSkillNames = new Set(activeAgent.allowedSkills)
	alwaysAllowedSkillNames.forEach((skillName) => allowedSkillNames.add(skillName))

	return enabledSkills.filter((skill) => allowedSkillNames.has(skill.name))
}
