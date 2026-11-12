import { expect } from "chai"
import { describe, it } from "mocha"
import { openAiNativeModels } from "@/shared/api"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import { isGptPromptModel, isNativeToolCallingConfig, isNextGenModelFamily } from "@/utils/model-utils"
import { getSystemPrompt, PromptRegistry } from "../index"
import type { ClineToolSpec } from "../spec"
import type { SystemPromptContext } from "../types"

const MODEL_IDS = ["gpt-5.5", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"] as const

function makeContext(id: keyof typeof openAiNativeModels): SystemPromptContext {
	return {
		cwd: "/test/project",
		ide: "TestIde",
		isTesting: true,
		providerInfo: {
			providerId: "openai-native",
			model: { id, info: openAiNativeModels[id] },
			mode: "act",
		},
		enableNativeToolCalls: true,
		useMinimalGptPrompt: isGptPromptModel(id, "openai-native"),
		supportsBrowserUse: false,
		clineWebToolsEnabled: false,
		subagentsEnabled: false,
	}
}

type PromptTool = NonNullable<Awaited<ReturnType<typeof getSystemPrompt>>["tools"]>[number]

function getToolName(tool: PromptTool): string | undefined {
	if (
		"function" in tool &&
		tool.function !== null &&
		typeof tool.function === "object" &&
		"name" in tool.function &&
		typeof tool.function.name === "string"
	) {
		return tool.function.name
	}
	if ("name" in tool && typeof tool.name === "string") {
		return tool.name
	}
	return undefined
}

function getToolParameters(tool: PromptTool): unknown {
	if ("function" in tool && tool.function !== null && typeof tool.function === "object" && "parameters" in tool.function) {
		return tool.function.parameters
	}
	if ("parameters" in tool) {
		return tool.parameters
	}
	return undefined
}

describe("OpenAI native model prompt integration", () => {
	it("selects the GPT-5.4 native family for every addition", () => {
		const registry = PromptRegistry.getInstance()
		for (const id of MODEL_IDS) {
			const context = makeContext(id)
			expect(registry.getModelFamily(context)).to.equal(ModelFamily.NATIVE_GPT_5)
			expect(context.useMinimalGptPrompt).to.equal(true)
			expect(isNativeToolCallingConfig(context.providerInfo, true)).to.equal(true)
			expect(isNativeToolCallingConfig(context.providerInfo, false)).to.equal(false)
			expect(isNextGenModelFamily(id, "openai-native")).to.equal(true)
		}

		for (const id of ["gpt-5.1", "gpt-5.2"] as const) {
			const context: SystemPromptContext = {
				...makeContext(id),
				providerInfo: {
					providerId: "openai-native",
					model: { id, info: { supportsPromptCache: true } },
					mode: "act",
				},
			}
			expect(registry.getModelFamily(context)).to.equal(ModelFamily.NATIVE_GPT_5_1)
		}
	})

	it("preserves provider boundaries", () => {
		for (const providerId of ["openai", "openai-codex", "openrouter"]) {
			expect(isGptPromptModel("gpt-6-astra", providerId)).to.equal(false)
			expect(isNextGenModelFamily("gpt-6-astra", providerId)).to.equal(false)
		}
		expect(isGptPromptModel("gpt-6-astra", "openai-native")).to.equal(true)
		expect(isNextGenModelFamily("gpt-6-astra", "openai-native")).to.equal(true)
		expect(isGptPromptModel("gpt-7", "openai-native")).to.equal(false)
		expect(isNextGenModelFamily("gpt-7", "openai-native")).to.equal(false)
		for (const providerId of ["openai", "openai-codex", "openrouter"]) {
			expect(isGptPromptModel("gpt-5.4-2026-03-05", providerId)).to.equal(true)
			expect(isNextGenModelFamily("gpt-5.4-2026-03-05", providerId)).to.equal(true)
		}
	})

	it("matches the baseline native tool schema", async () => {
		const baseline = await getSystemPrompt(makeContext("gpt-5.4-2026-03-05"))
		expect(baseline.systemPrompt.length).to.be.greaterThan(0)
		expect(baseline.tools).not.to.equal(undefined)

		for (const id of MODEL_IDS) {
			const result = await getSystemPrompt(makeContext(id))
			expect(result.systemPrompt.length).to.be.greaterThan(0)
			expect(result.tools).to.deep.equal(baseline.tools)
			const names = (result.tools ?? []).map(getToolName).filter((name): name is string => name !== undefined)
			expect(names).to.include("apply_patch")
			expect(names).to.include("read_file")
		}
	})

	it("retains workflow tool overrides on full and continuation turns", async () => {
		const workflowToolSchemaOverride: readonly ClineToolSpec[] = [
			{
				variant: ModelFamily.NATIVE_GPT_5,
				id: ClineDefaultTool.FILE_READ,
				name: "read_file",
				description: "Read a file",
				parameters: [{ name: "path", required: true, instruction: "Path to the file" }],
			},
		]

		for (const isContinuationTurn of [false, true]) {
			const baseline = await getSystemPrompt({
				...makeContext("gpt-5.4-2026-03-05"),
				activeWorkflowName: "document-project",
				activeWorkflowStepNumber: 2,
				workflowToolSchemaOverride,
				isContinuationTurn,
			})
			expect(baseline.systemPrompt.length).to.be.greaterThan(0)
			expect(baseline.tools).to.have.length(1)

			for (const id of MODEL_IDS) {
				const result = await getSystemPrompt({
					...makeContext(id),
					activeWorkflowName: "document-project",
					activeWorkflowStepNumber: 2,
					workflowToolSchemaOverride,
					isContinuationTurn,
				})
				expect(result.systemPrompt.length).to.be.greaterThan(0)
				expect(result.tools).to.deep.equal(baseline.tools)
				expect(result.tools).to.have.length(1)
				const tool = result.tools?.[0]
				expect(tool).not.to.equal(undefined)
				if (!tool) {
					throw new Error("Expected a workflow tool")
				}
				expect(getToolName(tool)).to.equal("read_file")
				const parameters = getToolParameters(tool)
				expect(parameters).to.be.an("object")
				if (typeof parameters !== "object" || parameters === null || !("required" in parameters)) {
					throw new Error("Expected workflow tool parameters with required fields")
				}
				expect(parameters.required).to.deep.equal(["path"])
				const names = (result.tools ?? []).map(getToolName).filter((name): name is string => name !== undefined)
				expect(names).not.to.include("apply_patch")
			}
		}
	})
})
