import { expect } from "chai"
import { describe, it } from "mocha"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"
import { toolSpecFunctionDeclarations, toolSpecFunctionDefinition, toolSpecInputSchema } from "../spec"
import { set_workflow_placeholders_variants } from "../tools/set_workflow_placeholders"
import type { SystemPromptContext } from "../types"

const mockContext: SystemPromptContext = {
	cwd: "/test/project",
	ide: "TestIde",
	supportsBrowserUse: true,
	clineWebToolsEnabled: true,
	subagentsEnabled: true,
	providerInfo: { providerId: "test", model: { id: "test-model", info: { supportsPromptCache: false } }, mode: "act" },
	enableNativeToolCalls: false,
	isTesting: true,
}

const makeTool = (overrides?: Partial<ClineToolSpec>): ClineToolSpec => ({
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.FILE_READ,
	name: "read_file",
	description: "Read a file",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: "The path of the file to read relative to {{CWD}}",
		},
		{
			name: "optional_param",
			required: false,
			instruction: "An optional parameter",
		},
	],
	...overrides,
})

describe("toolSpecFunctionDeclarations (Gemini)", () => {
	it("includes parameter descriptions from instruction field", () => {
		const result = toolSpecFunctionDeclarations(makeTool(), mockContext)

		const pathParam = result.parameters?.properties?.["path"] as any
		expect(pathParam).to.exist
		expect(pathParam.description).to.be.a("string")
		expect(pathParam.description).to.include("path of the file to read")
	})

	it("includes descriptions for all parameters", () => {
		const result = toolSpecFunctionDeclarations(makeTool(), mockContext)

		const props = result.parameters?.properties as any
		expect(props["path"].description).to.be.a("string").and.not.be.empty
		expect(props["optional_param"].description).to.be.a("string").and.not.be.empty
	})

	it("handles function-type instructions", () => {
		const tool = makeTool({
			parameters: [
				{
					name: "dynamic",
					required: true,
					instruction: (ctx: SystemPromptContext) => `Dynamic value: ${ctx.cwd}`,
				},
			],
		})
		const result = toolSpecFunctionDeclarations(tool, mockContext)

		const param = result.parameters?.properties?.["dynamic"] as any
		expect(param.description).to.equal("Dynamic value: /test/project")
	})

	it("omits description when instruction is empty", () => {
		const tool = makeTool({
			parameters: [{ name: "empty", required: false, instruction: "" }],
		})
		const result = toolSpecFunctionDeclarations(tool, mockContext)

		const param = result.parameters?.properties?.["empty"] as any
		expect(param.description).to.be.undefined
	})
})

describe("Gemini and Anthropic parameter descriptions match", () => {
	it("both converters produce the same description text", () => {
		const tool = makeTool()
		const gemini = toolSpecFunctionDeclarations(tool, mockContext)
		const anthropic = toolSpecInputSchema(tool, mockContext)

		const geminiDesc = (gemini.parameters?.properties?.["path"] as any)?.description
		const anthropicDesc = (anthropic.input_schema as any).properties["path"]?.description

		expect(geminiDesc).to.equal(anthropicDesc)
	})
})

describe("workflow placeholder tool gating", () => {
	it("enables set_workflow_placeholders for active non-managed workflows", () => {
		const tool = set_workflow_placeholders_variants[0]
		expect(
			tool.contextRequirements?.({
				...mockContext,
				activeWorkflowSupportsPlaceholders: true,
			}),
		).to.equal(true)
	})
})

describe("native tool placeholder replacement", () => {
	it("replaces CWD and MULTI_ROOT_HINT placeholders in descriptions", () => {
		const context: SystemPromptContext = {
			...mockContext,
			isMultiRootEnabled: true,
		}
		const tool = makeTool({
			parameters: [
				{
					name: "path",
					required: true,
					instruction: "Path (relative to {{CWD}}){{MULTI_ROOT_HINT}}",
				},
			],
		})

		const openAI = toolSpecFunctionDefinition(tool, context)
		const anthropic = toolSpecInputSchema(tool, context)
		const gemini = toolSpecFunctionDeclarations(tool, context)

		const openAIDesc = ((openAI as any).function.parameters.properties.path as any).description as string
		const anthropicDesc = ((anthropic as any).input_schema.properties.path as any).description as string
		const geminiDesc = (gemini.parameters?.properties?.["path"] as any)?.description as string

		for (const desc of [openAIDesc, anthropicDesc, geminiDesc]) {
			expect(desc).to.include("/test/project")
			expect(desc).to.include("Use @workspace:path syntax")
			expect(desc).to.not.include("{{CWD}}")
			expect(desc).to.not.include("{{MULTI_ROOT_HINT}}")
		}
	})

	it("compacts native GPT tool descriptions and task_progress parameter text in minimal GPT mode", () => {
		const context: SystemPromptContext = {
			...mockContext,
			enableNativeToolCalls: true,
			useMinimalGptPrompt: true,
			providerInfo: {
				providerId: "openai",
				model: { id: "gpt-5.4-2026-03-05", info: { supportsPromptCache: false } },
				mode: "act",
			},
		}
		const tool = makeTool({
			name: "apply_patch",
			description:
				'This is a custom utility that makes it more convenient to add, remove, move, or edit code in a single file. To use the `apply_patch` command, you should pass a message of the following structure as "input": ...',
			parameters: [
				{
					name: "input",
					required: true,
					instruction: "The apply_patch command that you wish to execute.",
				},
				{
					name: "task_progress",
					required: false,
					instruction:
						"A checklist showing task progress after this tool use is completed. The task_progress parameter must be included as a separate parameter inside of the parent tool call.",
				},
			],
		})

		const openAI = toolSpecFunctionDefinition(tool, context) as any

		expect(openAI.function.description).to.equal(
			"Apply a V4A patch by passing the complete `apply_patch` command in `input` with `*** Begin Patch` and `*** End Patch`.",
		)
		expect(openAI.function.parameters.properties.input.description).to.equal("Complete `apply_patch` command to execute.")
		expect(openAI.function.parameters.properties.task_progress.description).to.equal(
			"Markdown checklist as a top-level parameter on a tool call. Not a standalone tool.",
		)
	})

	it("compacts native set_workflow_placeholders.values to an object map description", () => {
		const context: SystemPromptContext = {
			...mockContext,
			enableNativeToolCalls: true,
			useMinimalGptPrompt: true,
			providerInfo: {
				providerId: "openai",
				model: { id: "gpt-5.4-2026-03-05", info: { supportsPromptCache: false } },
				mode: "act",
			},
		}
		const tool = makeTool({
			name: "set_workflow_placeholders",
			description: "Persist a workflow placeholder value for the active step.",
			parameters: [
				{
					name: "values",
					required: true,
					type: "object",
					instruction:
						'Object map of placeholder keys to string values. Not an array of {name,value} or {key,value}. Example: {"story_path":"docs/story.md","project_context":"docs/project-context.md"}',
					additionalProperties: { type: "string" },
				},
			],
		})

		const openAI = toolSpecFunctionDefinition(tool, context) as any

		expect(openAI.function.parameters.properties.values.description).to.equal(
			"Object map of placeholder keys to strings. Not arrays of {name,value} or {key,value}.",
		)
	})
})
