import type { ToolUse } from "@core/assistant-message"
import { discoverSkills, getAvailableSkills, getSkillContent } from "@core/context/instructions/user-instructions/skills"
import { getTaskMetadata, saveTaskMetadata } from "@core/storage/disk"
import { activateManagedWorkflowInTaskState, activatePlaceholderWorkflowInTaskState } from "@core/task/workflow-activation"
import type { SkillMetadata } from "@shared/skills"
import { buildPlaceholderWorkflowChecklist } from "@/core/workflows/placeholder-workflow-step-details"
import { resolveWorkflowByName } from "@/core/workflows/resolution/resolveAvailableWorkflows"
import { telemetryService } from "@/services/telemetry"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"

export class UseSkillToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.USE_SKILL

	getDescription(block: ToolUse): string {
		const skillName = block.params.skill_name
		return skillName ? `[${block.name} for "${skillName}"]` : `[${block.name}]`
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		const skillName = block.params.skill_name
		if (uiHelpers.getConfig().isSubagentExecution) {
			return
		}
		const message = JSON.stringify({ tool: "useSkill", path: skillName || "" })
		await uiHelpers.say("tool", message, undefined, undefined, true)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const skillName: string | undefined = block.params.skill_name
		const stateManager = config.services.stateManager

		if (!skillName) {
			config.taskState.consecutiveMistakeCount++
			return `Error: Missing required parameter 'skill_name'. Please provide the name of the skill to activate.`
		}

		const localWorkflowToggles = stateManager.getWorkspaceStateKey("workflowToggles") ?? {}
		const globalWorkflowToggles = stateManager.getGlobalSettingsKey("globalWorkflowToggles") ?? {}
		const remoteWorkflowToggles = stateManager.getGlobalStateKey("remoteWorkflowToggles") ?? {}
		const remoteConfigSettings = stateManager.getRemoteConfigSettings()
		const remoteWorkflows = remoteConfigSettings?.remoteGlobalWorkflows ?? []
		const resolvedWorkflow = await resolveWorkflowByName(
			{
				cwd: config.cwd,
				localWorkflowToggles,
				globalWorkflowToggles,
				remoteWorkflowToggles,
				remoteWorkflows,
			},
			skillName,
		)
		const resolvedSkillName = resolvedWorkflow?.skillName ?? skillName

		if (resolvedWorkflow?.source === "managed" && resolvedWorkflow.workflowId && resolvedWorkflow.slashCommand) {
			const { run, resumed } = await activateManagedWorkflowInTaskState({
				cwd: config.cwd,
				taskState: config.taskState,
				workflowId: resolvedWorkflow.workflowId,
				slashCommand: resolvedWorkflow.slashCommand,
			})

			config.taskState.consecutiveMistakeCount = 0

			if (!config.isSubagentExecution) {
				try {
					const metadata = await getTaskMetadata(config.taskId)
					metadata.activeWorkflowId = config.taskState.activeWorkflowId
					metadata.activePlaceholderWorkflowId = config.taskState.activePlaceholderWorkflowId
					metadata.activePlaceholderWorkflowSource = config.taskState.activePlaceholderWorkflowSource
					metadata.activePlaceholderWorkflowStableValues = config.taskState.activePlaceholderWorkflowStableValues
					metadata.activePlaceholderWorkflowValues = config.taskState.activePlaceholderWorkflowValues
					metadata.lastPromptedPlaceholderWorkflowChecklistLabel =
						config.taskState.lastPromptedPlaceholderWorkflowChecklistLabel
					metadata.managedWorkflowRun = config.taskState.managedWorkflowRun
					await saveTaskMetadata(config.taskId, metadata)
				} catch {
					// Non-fatal: keep the workflow activation in memory even if persistence fails.
				}
			}

			await config.callbacks.updateFCListFromToolResponse(undefined)

			return resumed
				? `Managed workflow "${run.workflowId}" is active again. Resume the workflow from its current phase and follow the active checklist.`
				: `Managed workflow "${run.workflowId}" is now active. Follow the active checklist and current step instructions.`
		}

		const apiConfig = stateManager.getApiConfiguration()
		const currentMode = stateManager.getGlobalSettingsKey("mode")
		const provider = currentMode === "plan" ? apiConfig.planModeApiProvider : apiConfig.actModeApiProvider

		// Show tool message
		const message = JSON.stringify({ tool: "useSkill", path: skillName })
		if (!config.isSubagentExecution) {
			await config.callbacks.say("tool", message, undefined, undefined, false)
		}

		if (resolvedWorkflow) {
			try {
				const activation = await activatePlaceholderWorkflowInTaskState({
					cwd: config.cwd,
					taskState: config.taskState,
					workflow: resolvedWorkflow,
					clearActiveWorkflowId: true,
				})
				if (!activation) {
					return `Error: Workflow "${skillName}" could not be loaded.`
				}

				config.taskState.consecutiveMistakeCount = 0

				if (!config.isSubagentExecution) {
					try {
						const metadata = await getTaskMetadata(config.taskId)
						metadata.activeWorkflowId = config.taskState.activeWorkflowId
						metadata.activePlaceholderWorkflowId = config.taskState.activePlaceholderWorkflowId
						metadata.activePlaceholderWorkflowSource = config.taskState.activePlaceholderWorkflowSource
						metadata.activePlaceholderWorkflowStableValues = config.taskState.activePlaceholderWorkflowStableValues
						metadata.activePlaceholderWorkflowValues = config.taskState.activePlaceholderWorkflowValues
						metadata.lastPromptedPlaceholderWorkflowChecklistLabel =
							config.taskState.lastPromptedPlaceholderWorkflowChecklistLabel
						metadata.managedWorkflowRun = config.taskState.managedWorkflowRun
						await saveTaskMetadata(config.taskId, metadata)
					} catch {
						// Non-fatal: keep the placeholder workflow activation in memory even if persistence fails.
					}
				}

				if (activation.workflowChanged || !config.taskState.currentFocusChainChecklist) {
					const checklist = await buildPlaceholderWorkflowChecklist({
						source: config.taskState.activePlaceholderWorkflowSource!,
						stablePlaceholderValues: config.taskState.activePlaceholderWorkflowStableValues,
						placeholderValues: config.taskState.activePlaceholderWorkflowValues,
					})
					if (checklist) {
						await config.callbacks.updateFCListFromToolResponse(checklist)
					}
				}

				telemetryService.safeCapture(
					() =>
						telemetryService.captureSkillUsed({
							ulid: config.ulid,
							skillName: resolvedWorkflow.name,
							skillSource: resolvedWorkflow.source === "local" ? "project" : "global",
							skillsAvailableGlobal: 0,
							skillsAvailableProject: 0,
							provider,
							modelId: config.api.getModel().id,
						}),
					"UseSkillToolHandler.execute",
				)

				const locationHint = activation.workflowContent.displayPath
					? ` You may access the workflow file at: ${activation.workflowContent.displayPath}`
					: ""

				return `# Workflow "${resolvedWorkflow.name}" is now active

The workflow started successfully. Use the current checklist and current workflow step details to continue.${locationHint}

IMPORTANT: The workflow is now loaded. Do NOT call use_skill again for this task unless a later step explicitly requires a different workflow.`
			} catch (error) {
				return `Error loading workflow "${skillName}": ${(error as Error)?.message}`
			}
		}

		// Discover skills on-demand (lazy loading)
		const allSkills = await discoverSkills(config.cwd)
		const resolvedSkills = getAvailableSkills(allSkills)

		// Filter by toggle state
		const globalSkillsToggles = stateManager.getGlobalSettingsKey("globalSkillsToggles") ?? {}
		const localSkillsToggles = stateManager.getWorkspaceStateKey("localSkillsToggles") ?? {}
		const availableSkills = resolvedSkills.filter((skill) => {
			const toggles = skill.source === "global" ? globalSkillsToggles : localSkillsToggles
			return toggles[skill.path] !== false
		})

		if (availableSkills.length === 0) {
			return `Error: No skills are available. Skills may be disabled or not configured.`
		}

		const globalCount = availableSkills.filter((skill) => skill.source === "global").length
		const projectCount = availableSkills.filter((skill) => skill.source === "project").length

		config.taskState.consecutiveMistakeCount = 0

		try {
			const skillContent = await getSkillContent(resolvedSkillName, availableSkills)

			if (!skillContent) {
				const availableNames = availableSkills.map((s: SkillMetadata) => s.name).join(", ")
				return `Error: Skill "${skillName}" not found. Available skills: ${availableNames || "none"}`
			}

			telemetryService.safeCapture(
				() =>
					telemetryService.captureSkillUsed({
						ulid: config.ulid,
						skillName: resolvedSkillName,
						skillSource: skillContent.source === "global" ? "global" : "project",
						skillsAvailableGlobal: globalCount,
						skillsAvailableProject: projectCount,
						provider,
						modelId: config.api.getModel().id,
					}),
				"UseSkillToolHandler.execute",
			)

			config.taskState.activeWorkflowId = skillName
			config.taskState.activePlaceholderWorkflowId = undefined
			config.taskState.activePlaceholderWorkflowSource = undefined
			config.taskState.activePlaceholderWorkflowStableValues = undefined
			config.taskState.activePlaceholderWorkflowValues = undefined
			config.taskState.activePlaceholderWorkflowDeterministicState = undefined
			config.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined
			config.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = []
			config.taskState.activeWorkflowJustStarted = true

			return `# Skill "${skillContent.name}" is now active

${skillContent.instructions}

---
IMPORTANT: The skill is now loaded. Do NOT call use_skill again for this task. Simply follow the instructions above to complete the user's request. You may access other files in the skill directory at: ${skillContent.path.replace(/SKILL\.md$/, "")}`
		} catch (error) {
			return `Error loading skill "${skillName}": ${(error as Error)?.message}`
		}
	}
}
