import { EmptyRequest } from "@shared/proto/cline/common"
import { SlashCommandInfo, SlashCommandsResponse } from "@shared/proto/cline/slash"
import { resolveAvailableWorkflows } from "@/core/workflows/resolution/resolveAvailableWorkflows"
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

	const workspaceManager = controller.getWorkspaceManager?.() ?? (await controller.ensureWorkspaceManager?.())
	const cwd = workspaceManager?.getPrimaryRoot()?.path
	const localWorkflowToggles = controller.stateManager.getWorkspaceStateKey("workflowToggles") ?? {}
	const globalWorkflowToggles = controller.stateManager.getGlobalSettingsKey("globalWorkflowToggles") ?? {}
	const remoteWorkflowToggles = controller.stateManager.getGlobalStateKey("remoteWorkflowToggles") ?? {}
	const remoteConfigSettings = controller.stateManager.getRemoteConfigSettings()
	const remoteWorkflows = remoteConfigSettings?.remoteGlobalWorkflows ?? []

	const workflows = await resolveAvailableWorkflows({
		cwd,
		localWorkflowToggles,
		globalWorkflowToggles,
		remoteWorkflowToggles,
		remoteWorkflows,
	})

	for (const workflow of workflows) {
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
