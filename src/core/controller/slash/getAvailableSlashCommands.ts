import { EmptyRequest } from "@shared/proto/cline/common"
import { SlashCommandInfo, SlashCommandsResponse } from "@shared/proto/cline/slash"
import { getShippedWorkflowSlashCommands } from "@/core/task/workflow-runtime/WorkflowRegistry"
import { BASE_SLASH_COMMANDS, VSCODE_ONLY_COMMANDS } from "@/shared/slashCommands"
import { Controller } from ".."

/**
 * Returns all available slash commands for autocomplete.
 */
export async function getAvailableSlashCommands(controller: Controller, _request: EmptyRequest): Promise<SlashCommandsResponse> {
	const commands: SlashCommandInfo[] = []

	// Add built-in commands
	for (const cmd of [...BASE_SLASH_COMMANDS, ...VSCODE_ONLY_COMMANDS]) {
		commands.push(
			SlashCommandInfo.create({
				name: cmd.name,
				description: cmd.description,
				section: "default",
				cliCompatible: cmd.cliCompatible,
			}),
		)
	}

	for (const workflow of getShippedWorkflowSlashCommands()) {
		commands.push(
			SlashCommandInfo.create({
				name: workflow.name,
				description: workflow.description,
				section: "custom",
				cliCompatible: true,
			}),
		)
	}

	return SlashCommandsResponse.create({ commands })
}
