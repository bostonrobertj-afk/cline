import "should"
import { buildTokenEstimateLogPayload, estimateRequestTokenUsage } from "../tokenUsageLogging"

describe("estimateRequestTokenUsage", () => {
	it("estimates request tokens across key system prompt and history buckets", () => {
		const systemPrompt = `TOOL USE

Use tools.
RESPONSE TOOLS
Use attempt_completion.
====

SKILLS

Installed skills and workflow activations available on this turn: bmad-code-review
====

<active_bmad_workflow workflow_id="bmad-code-review" managed="true" phase_id="step-01">
Current active step: Gather context
</active_bmad_workflow>`

		const messages = [
			{ role: "user", content: "Review this change set." },
			{
				role: "assistant",
				content: [{ type: "tool_use", id: "toolu_1", name: "read_file", input: { path: "src/app.ts" } }],
			},
			{
				role: "user",
				content: [{ type: "tool_result", tool_use_id: "toolu_1", content: "const value = 1\n".repeat(20) }],
			},
		] as any

		const estimate = estimateRequestTokenUsage(systemPrompt, messages)

		estimate.estimatedTotal.should.be.greaterThan(0)
		estimate.systemPrompt.should.be.greaterThan(0)
		estimate.systemSections.toolUse.should.be.greaterThan(0)
		estimate.systemSections.skills.should.be.greaterThan(0)
		estimate.systemSections.managedWorkflow.should.be.greaterThan(0)
		estimate.history.total.should.be.greaterThan(0)
		estimate.history.currentUserInput.should.be.greaterThan(0)
		estimate.history.toolOutputs.should.be.greaterThan(0)
		estimate.history.toolCalls.should.be.greaterThan(0)
		estimate.history.priorTurns.should.be.greaterThan(0)
	})

	it("builds a log payload with stable thread identifiers", () => {
		const estimate = estimateRequestTokenUsage("TOOL USE\n\nUse tools.", [{ role: "user", content: "Hello" }] as any)

		const payload = buildTokenEstimateLogPayload({
			taskId: "task-123",
			ulid: "01ABCDEF1234567890XYZ",
			apiRequestCount: 7,
			modelId: "gpt-5.4-mini-2026-03-17",
			providerId: "openai-native",
			estimate,
		})

		payload.taskId.should.equal("task-123")
		payload.ulid.should.equal("01ABCDEF1234567890XYZ")
		payload.apiRequestCount.should.equal(7)
		payload.modelId.should.equal("gpt-5.4-mini-2026-03-17")
		payload.providerId.should.equal("openai-native")
		payload.estimatedTotal.should.equal(estimate.estimatedTotal)
	})
})
