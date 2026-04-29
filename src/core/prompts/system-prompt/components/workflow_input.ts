import type { PromptVariant, SystemPromptContext } from "../types"

export async function getWorkflowInputSection(
	_variant: PromptVariant,
	context: SystemPromptContext,
): Promise<string | undefined> {
	const block =
		context.isContinuationTurn === true
			? context.continuationTurnWorkflowInputInstructionsBlock
			: context.fullTurnWorkflowInputInstructionsBlock

	if (typeof block === "string" && block.trim().length > 0) {
		return block
	}

	return undefined
}
