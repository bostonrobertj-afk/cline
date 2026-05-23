import { expect } from "chai"
import { describe, it } from "mocha"
import type { WorkflowValues } from "../types"
import { renderWorkflowPromptTemplate, validateWorkflowPromptTemplate } from "../workflowPromptTemplates"

describe("workflow prompt templates", () => {
	it("renders declared workflow references with deterministic workflow values", () => {
		const workflowValues: WorkflowValues = {
			project_title: "Project Alpha",
			target_story: "/tmp/story.md",
			details: { ready: true, priority: 2 },
		}
		const result = renderWorkflowPromptTemplate({
			template:
				"Project {workflow.project_title}\nStory {workflow.target_story}\nDetails {workflow.details}\nMissing {workflow.missing_value}",
			workflowValueKeys: ["project_title", "target_story", "details", "missing_value"],
			workflowValues,
			context: "unit test prompt",
		})

		expect(result).to.equal('Project Project Alpha\nStory /tmp/story.md\nDetails {"priority":2,"ready":true}\nMissing ')
	})

	it("allows repeated references to the same declared workflow value", () => {
		const result = validateWorkflowPromptTemplate({
			template: "{workflow.target_story} then {workflow.target_story}",
			workflowValueKeys: ["target_story"],
			context: "duplicate reference prompt",
		})

		expect(result).to.deep.equal({ valid: true })
	})

	it("allows non-workflow braced prose as literal text", () => {
		const template = "Use {data.target_story} and { finding: string }."
		const validationResult = validateWorkflowPromptTemplate({
			template,
			workflowValueKeys: ["target_story"],
			context: "literal brace prompt",
		})

		expect(validationResult).to.deep.equal({ valid: true })
		const renderedPrompt = renderWorkflowPromptTemplate({
			template,
			workflowValueKeys: ["target_story"],
			workflowValues: { target_story: "/tmp/story.md" },
			context: "literal brace prompt",
		})
		expect(renderedPrompt).to.equal(template)
	})

	it("rejects blank workflow value references", () => {
		const result = validateWorkflowPromptTemplate({
			template: "Use {workflow.}",
			workflowValueKeys: ["target_story"],
			context: "blank reference prompt",
		})

		expect(result).to.deep.equal({
			valid: false,
			errorMessage: "Workflow prompt template blank reference prompt contains blank workflow value reference.",
		})
	})

	it("rejects workflow references that do not exactly match declared workflow value keys", () => {
		const result = validateWorkflowPromptTemplate({
			template: "Use {workflow.target.story}",
			workflowValueKeys: ["target_story"],
			context: "undeclared reference prompt",
		})

		expect(result).to.deep.equal({
			valid: false,
			errorMessage:
				"Workflow prompt template undeclared reference prompt references undeclared workflow value target.story.",
		})
	})

	it("rejects undeclared workflow value references", () => {
		const result = validateWorkflowPromptTemplate({
			template: "Use {workflow.target_story}",
			workflowValueKeys: ["architecture_document"],
			context: "undeclared reference prompt",
		})

		expect(result).to.deep.equal({
			valid: false,
			errorMessage:
				"Workflow prompt template undeclared reference prompt references undeclared workflow value target_story.",
		})
	})

	it("throws the validation error before rendering invalid templates", () => {
		let thrownError: Error | undefined
		try {
			renderWorkflowPromptTemplate({
				template: "Use {workflow.target_story}",
				workflowValueKeys: ["architecture_document"],
				workflowValues: { target_story: "/tmp/story.md" },
				context: "invalid render prompt",
			})
		} catch (error) {
			if (error instanceof Error) {
				thrownError = error
			}
		}
		if (thrownError === undefined) {
			throw new Error("Expected invalid render prompt to throw.")
		}

		expect(thrownError.message).to.equal(
			"Workflow prompt template invalid render prompt references undeclared workflow value target_story.",
		)
	})

	it("recursively resolves declared workflow references contained in string workflow values", () => {
		const workflowValues: WorkflowValues = {
			workspace_root: "/Users/robertboston/Documents/Cline Extension/cline",
			workflow_folder_path: "/docs/projects/project-a/discovery/",
			target_file_name: "brainstorming.md",
			target_file_path: "{workflow.workspace_root}{workflow.workflow_folder_path}{workflow.target_file_name}",
		}
		const result = renderWorkflowPromptTemplate({
			template: "Target {workflow.target_file_path}",
			workflowValueKeys: ["workspace_root", "workflow_folder_path", "target_file_name", "target_file_path"],
			workflowValues,
			context: "composed path prompt",
		})

		expect(result).to.equal(
			"Target /Users/robertboston/Documents/Cline Extension/cline/docs/projects/project-a/discovery/brainstorming.md",
		)
		expect(result).to.not.contain("{workflow.")
	})

	it("rejects cyclic workflow value references during recursive rendering", () => {
		const workflowValues: WorkflowValues = { first_value: "{workflow.first_value}" }
		let thrownError: Error | undefined
		try {
			renderWorkflowPromptTemplate({
				template: "Value {workflow.first_value}",
				workflowValueKeys: ["first_value"],
				workflowValues,
				context: "cyclic prompt",
			})
		} catch (error) {
			if (error instanceof Error) {
				thrownError = error
			}
		}
		if (thrownError === undefined) {
			throw new Error("Expected cyclic prompt to throw.")
		}

		expect(thrownError.message).to.equal(
			"Workflow prompt template cyclic prompt contains cyclic workflow value reference first_value.",
		)
	})

	it("recursively resolves workflow references inside array and object workflow values", () => {
		const workflowValues: WorkflowValues = {
			item_name: "brainstorming.md",
			nested: { files: ["{workflow.item_name}"], info: { target: "{workflow.item_name}" } },
		}
		const result = renderWorkflowPromptTemplate({
			template: "Nested {workflow.nested}",
			workflowValueKeys: ["item_name", "nested"],
			workflowValues,
			context: "nested value prompt",
		})

		expect(result).to.equal('Nested {"files":["brainstorming.md"],"info":{"target":"brainstorming.md"}}')
		expect(result).to.not.contain("{workflow.")
	})

	it("rejects malformed unclosed workflow references", () => {
		const result = validateWorkflowPromptTemplate({
			template: "Use {workflow.target_story",
			workflowValueKeys: ["target_story"],
			context: "malformed unclosed prompt",
		})

		expect(result).to.deep.equal({
			valid: false,
			errorMessage:
				"Workflow prompt template malformed unclosed prompt contains malformed workflow value reference {workflow.target_story.",
		})
	})

	it("throws when recursive string workflow values contain malformed workflow references", () => {
		const workflowValues: WorkflowValues = { first_value: "{workflow.second_value", second_value: "must not render" }
		let thrownError: Error | undefined
		try {
			renderWorkflowPromptTemplate({
				template: "Value {workflow.first_value}",
				workflowValueKeys: ["first_value", "second_value"],
				workflowValues,
				context: "malformed recursive prompt",
			})
		} catch (error) {
			if (error instanceof Error) {
				thrownError = error
			}
		}
		if (thrownError === undefined) {
			throw new Error("Expected malformed recursive prompt to throw.")
		}

		expect(thrownError.message).to.equal(
			"Workflow prompt template malformed recursive prompt contains malformed workflow value reference {workflow.second_value.",
		)
		expect(thrownError.message).to.not.contain("must not render")
	})

	it("rejects malformed unopened workflow references", () => {
		const result = validateWorkflowPromptTemplate({
			template: "Use workflow.target_story}",
			workflowValueKeys: ["target_story"],
			context: "malformed unopened prompt",
		})

		expect(result).to.deep.equal({
			valid: false,
			errorMessage:
				"Workflow prompt template malformed unopened prompt contains malformed workflow value reference workflow.target_story}.",
		})
	})
})
