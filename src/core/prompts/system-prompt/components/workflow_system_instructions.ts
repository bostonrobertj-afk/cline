import type { PromptVariant, SystemPromptContext } from "../types"

export async function getWorkflowSystemInstructionsSection(
	_variant: PromptVariant,
	context: SystemPromptContext,
): Promise<string | undefined> {
	const block =
		context.isContinuationTurn === true
			? context.continuationTurnWorkflowSystemInstructionsBlock
			: context.fullTurnWorkflowSystemInstructionsBlock

	return typeof block === "string" && block.trim().length > 0 ? block : undefined
}
