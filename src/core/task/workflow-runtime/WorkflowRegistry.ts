import type { WorkflowDefinition, WorkflowName } from "@/core/task/workflow-runtime/types"

const shippedWorkflowDefinitions: WorkflowDefinition[] = []

const shippedWorkflowDefinitionsByName = new Map<WorkflowName, WorkflowDefinition>(
	shippedWorkflowDefinitions.map((definition) => [definition.name, definition]),
)

const shippedWorkflowDefinitionsBySlashCommand = new Map<string, WorkflowDefinition>(
	shippedWorkflowDefinitions.map((definition) => [definition.slashCommandName, definition]),
)

const shippedWorkflowDefinitionsByUseSkillName = new Map<string, WorkflowDefinition>(
	shippedWorkflowDefinitions.map((definition) => [definition.useSkillName, definition]),
)

export function resolveWorkflowDefinition(workflowName: WorkflowName) {
	return shippedWorkflowDefinitionsByName.get(workflowName)
}

export function resolveWorkflowBySlashCommand(commandName: string) {
	return shippedWorkflowDefinitionsBySlashCommand.get(commandName)
}

export function resolveWorkflowByUseSkillName(skillName: string) {
	return shippedWorkflowDefinitionsByUseSkillName.get(skillName)
}

export function getShippedWorkflowSlashCommands() {
	return shippedWorkflowDefinitions.map((definition) => ({
		name: definition.slashCommandName,
		description: `Shipped workflow: ${definition.name}`,
	}))
}
