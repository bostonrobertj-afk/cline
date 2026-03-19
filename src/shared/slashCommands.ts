export interface SlashCommand {
	name: string
	description?: string
	section?: "default" | "custom" | "mcp"
	cliCompatible?: boolean
}

export const BASE_SLASH_COMMANDS: SlashCommand[] = [
	{
		name: "bmad-analyst",
		description: "Activate the BMAD analyst persona for this task",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "bmad-pm",
		description: "Activate the BMAD PM persona for this task",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "bmad-architect",
		description: "Activate the BMAD architect persona for this task",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "bmad-ux-designer",
		description: "Activate the BMAD UX designer persona for this task",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "bmad-sm",
		description: "Activate the BMAD scrum master persona for this task",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "bmad-dev",
		description: "Activate the BMAD developer persona for this task",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "bmad-qa",
		description: "Activate the BMAD QA persona for this task",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "bmad-tech-writer",
		description: "Activate the BMAD tech writer persona for this task",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "bmad-quick-flow-solo-dev",
		description: "Activate the BMAD quick-flow solo dev persona for this task",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "bmad-exit",
		description: "Exit the active BMAD agent persona for this task",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "newtask",
		description: "Create a new task with context from the current task",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "deep-planning",
		description: "Create a comprehensive implementation plan before coding",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "smol",
		description: "Condenses your current context window",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "newrule",
		description: "Create a new Cline rule based on your conversation",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "reportbug",
		description: "Create a Github issue with Cline",
		section: "default",
		cliCompatible: true,
	},
]

// VS Code-only slash commands
export const VSCODE_ONLY_COMMANDS: SlashCommand[] = [
	{
		name: "explain-changes",
		description: "Explain code changes between git refs (PRs, commits, branches, etc.)",
		section: "default",
	},
]

// CLI-only slash commands (handled locally, not sent to backend)
export const CLI_ONLY_COMMANDS: SlashCommand[] = [
	{
		name: "help",
		description: "Learn how to use Cline CLI",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "settings",
		description: "Change API provider, auto-approve, and feature settings",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "models",
		description: "Change the model used for the current mode",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "history",
		description: "Browse and search task history",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "clear",
		description: "Clear the current task and start fresh",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "exit",
		description: "Alternative to Ctrl+C",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "q",
		description: "Alternative to Ctrl+C",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "skills",
		description: "View and manage installed skills",
		section: "default",
		cliCompatible: true,
	},
]
