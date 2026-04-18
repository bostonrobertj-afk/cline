import type { PromptVariant, SystemPromptContext } from "../types"

export async function getWorkflowSystemInstructionsSection(
	_variant: PromptVariant,
	context: SystemPromptContext,
): Promise<string | undefined> {
	const block = context.workflowSystemInstructionsBlock

	return typeof block === "string" && block.trim().length > 0 ? block : undefined
}
