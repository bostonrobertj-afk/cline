import type { ToolUse } from "@core/assistant-message"
import { discoverSkills, getAvailableSkills, getSkillContent } from "@core/context/instructions/user-instructions/skills"
import { getTaskMetadata, saveTaskMetadata } from "@core/storage/disk"
import { startOrResumeManagedWorkflowRun } from "@core/task/managed-workflows/ManagedWorkflowController"
import { getManagedWorkflowDefinition } from "@core/task/managed-workflows/ManagedWorkflowRegistry"
import type { SkillMetadata } from "@shared/skills"
import { telemetryService } from "@/services/telemetry"
import { ClineDefaultTool } from "@/shared/tools"
import { getBmadAgentById, getOwningBmadAgentForSkill, isSkillAllowedForBmadAgent } from "../../bmad-agent-mode"
import type { ToolResponse } from "../../index"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"

export class UseSkillToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.USE_SKILL

	constructor() {}

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

		if (!skillName) {
			config.taskState.consecutiveMistakeCount++
			return `Error: Missing required parameter 'skill_name'. Please provide the name of the skill to activate.`
		}

		const managedWorkflowDefinition = await getManagedWorkflowDefinition(config.cwd, skillName)
		const resolvedSkillName = managedWorkflowDefinition?.skillName ?? skillName
		const owningAgent = managedWorkflowDefinition
			? await getOwningBmadAgentForSkill(config.cwd, resolvedSkillName)
			: undefined

		if (config.taskState.activeAgentId) {
			const activeAgent = await getBmadAgentById(config.cwd, config.taskState.activeAgentId)
			if (activeAgent && !isSkillAllowedForBmadAgent(activeAgent, resolvedSkillName)) {
				return `Error: Active agent "${activeAgent.id}" is not allowed to use skill "${skillName}". Allowed skills: ${activeAgent.allowedSkills.join(
					", ",
				)}. Use /bmad-exit to leave agent mode or switch to another /bmad-* agent.`
			}
		}

		// Discover skills on-demand (lazy loading)
		const allSkills = await discoverSkills(config.cwd)
		const resolvedSkills = getAvailableSkills(allSkills)

		// Filter by toggle state
		const stateManager = config.services.stateManager
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

		const apiConfig = config.services.stateManager.getApiConfiguration()
		const currentMode = config.services.stateManager.getGlobalSettingsKey("mode")
		const provider = currentMode === "plan" ? apiConfig.planModeApiProvider : apiConfig.actModeApiProvider

		// Show tool message
		const message = JSON.stringify({ tool: "useSkill", path: skillName })
		if (!config.isSubagentExecution) {
			await config.callbacks.say("tool", message, undefined, undefined, false)
		}

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

			if (managedWorkflowDefinition) {
				if (!config.taskState.activeAgentId && owningAgent) {
					config.taskState.activeAgentId = owningAgent.id
					config.taskState.activeAgentSkillName = owningAgent.id
					config.taskState.activeAgentInvokedSlashCommand = skillName
					config.taskState.activeAgentJustActivated = true
				}

				const { run: managedWorkflowRun, resumed } = await startOrResumeManagedWorkflowRun(
					config.cwd,
					skillName,
					config.taskState.managedWorkflowRun,
				)
				config.taskState.managedWorkflowRun = managedWorkflowRun
				config.taskState.activeWorkflowId = managedWorkflowRun.workflowId
				config.taskState.activeWorkflowJustStarted = !resumed
				await config.callbacks.updateFCListFromToolResponse(undefined)
				try {
					const taskMetadata = await getTaskMetadata(config.taskId)
					taskMetadata.activeAgentId = config.taskState.activeAgentId
					taskMetadata.activeAgentSkillName = config.taskState.activeAgentSkillName
					taskMetadata.activeAgentInvokedSlashCommand = config.taskState.activeAgentInvokedSlashCommand
					taskMetadata.activeWorkflowId = managedWorkflowRun.workflowId
					taskMetadata.managedWorkflowRun = managedWorkflowRun
					await saveTaskMetadata(config.taskId, taskMetadata)
				} catch {
					// non-fatal: workflow persistence should not block the skill activation
				}

				const aliasNote =
					skillName !== managedWorkflowRun.workflowId
						? `\nInvoked via alias "${skillName}". Canonical managed workflow: "${managedWorkflowRun.workflowId}".`
						: ""

				if (resumed) {
					return `# Managed workflow "${skillContent.name}" resumed

The backend restored the existing workflow checklist and preserved current progress.${aliasNote}

IMPORTANT: Do not create or rewrite the checklist manually. Follow the current phase instructions in the prompt and use the complete_workflow_item tool to mark workflow items complete.`
				}

				return `# Managed workflow "${skillContent.name}" is now active

The backend created the workflow checklist and owns workflow progression for this task.${aliasNote}

IMPORTANT: Do not create or rewrite the checklist manually. Follow the current phase instructions in the prompt and use the complete_workflow_item tool to mark workflow items complete.`
			}

			config.taskState.activeWorkflowId = skillName
			config.taskState.activeWorkflowJustStarted = true
			try {
				const taskMetadata = await getTaskMetadata(config.taskId)
				taskMetadata.activeWorkflowId = skillName
				await saveTaskMetadata(config.taskId, taskMetadata)
			} catch {
				// non-fatal: workflow persistence should not block the skill activation
			}

			return `# Skill "${skillContent.name}" is now active

${skillContent.instructions}

---
IMPORTANT: The skill is now loaded. Do NOT call use_skill again for this task. Simply follow the instructions above to complete the user's request. You may access other files in the skill directory at: ${skillContent.path.replace(/SKILL\.md$/, "")}`
		} catch (error) {
			return `Error loading skill "${skillName}": ${(error as Error)?.message}`
		}
	}
}
