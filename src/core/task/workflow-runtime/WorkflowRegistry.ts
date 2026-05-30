import type { WorkflowDefinition, WorkflowName } from "@/core/task/workflow-runtime/types"
import { acceptanceAuditReviewWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/acceptance-audit-review"
import { blindReviewWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/blind-review"
import { brainstormingWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/brainstorming"
import { codeReviewWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/code-review"
import { correctCourseWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/correct-course"
import { createArchitectureWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/create-architecture"
import { createEpicsWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/create-epics"
import { createStoryWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/create-story"
import { devStoryWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/dev-story"
import { edgeCaseHunterReviewWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review"
import { piPlanningWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/pi-planning"
import { quickDevWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/quick-dev"
import { quickReviewWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/quick-review"
import { quickSpecWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/quick-spec"
import { validateStoryWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/validate-story"
import { writeRemediationStoryWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/write-remediation-story"

const shippedWorkflowDefinitions: WorkflowDefinition[] = [
	brainstormingWorkflowDefinition,
	createArchitectureWorkflowDefinition,
	createEpicsWorkflowDefinition,
	createStoryWorkflowDefinition,
	devStoryWorkflowDefinition,
	piPlanningWorkflowDefinition,
	quickSpecWorkflowDefinition,
	quickDevWorkflowDefinition,
	quickReviewWorkflowDefinition,
	validateStoryWorkflowDefinition,
	codeReviewWorkflowDefinition,
	correctCourseWorkflowDefinition,
	writeRemediationStoryWorkflowDefinition,
	blindReviewWorkflowDefinition,
	acceptanceAuditReviewWorkflowDefinition,
	edgeCaseHunterReviewWorkflowDefinition,
]

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
