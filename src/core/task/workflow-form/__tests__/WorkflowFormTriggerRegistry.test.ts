import { expect } from "chai"
import { describe, it } from "mocha"
import { resolveWorkflowFormSlashCommandStartCandidate } from "../WorkflowFormTriggerRegistry"
import { parseWorkflowStartRequirements } from "../workflowStartRequirements"

describe("WorkflowFormTriggerRegistry", () => {
	it("returns a slash-command start candidate for review-adversarial-general step 1", async () => {
		const candidate = await resolveWorkflowFormSlashCommandStartCandidate({
			cwd: "/workspace",
			taskState: {
				activePlaceholderWorkflowSource: {
					type: "remote",
					name: "review-adversarial-general.md",
					contents: `# Review

## Step 1: Gather Inputs
Required: {review_input}
Optional: {spec_file}
One of: {review_input}, {diff_output}, {spec_file}

## Step 2: Review
Continue the workflow.
`,
				},
				currentFocusChainChecklist: "- [ ] Step 1: Gather Inputs\n- [ ] Step 2: Review",
				activePlaceholderWorkflowStableValues: {
					diff_output: "/tmp/review-input.diff",
				},
				activePlaceholderWorkflowValues: {},
			},
			currentTurnSlashCommandAction: {
				type: "activate_placeholder_workflow",
				workflowId: "review-adversarial-general",
				workflowSource: {
					type: "remote",
					name: "review-adversarial-general.md",
					contents: "",
				},
			},
		})

		expect(candidate).to.not.equal(undefined)
		expect(candidate?.resolverId).to.equal("placeholder_workflow_start_set_workflow_placeholders")
		expect(candidate?.initialPhase).to.equal("collect_inputs")
		expect(candidate?.context).to.deep.equal({
			workflowName: "review-adversarial-general.md",
			workflowStartRequirements: {
				requiredFieldKeys: ["review_input"],
				optionalFieldKeys: ["spec_file"],
				oneOfRequirement: {
					id: "workflow_start_one_of",
					fieldKeys: ["review_input", "diff_output", "spec_file"],
				},
			},
		})
	})

	it("returns undefined when the current turn did not activate a placeholder workflow by slash command", async () => {
		const candidate = await resolveWorkflowFormSlashCommandStartCandidate({
			cwd: "/workspace",
			taskState: {
				activePlaceholderWorkflowSource: {
					type: "remote",
					name: "review-adversarial-general.md",
					contents: `# Review

## Step 1: Gather Inputs
Required: {review_input}
`,
				},
				currentFocusChainChecklist: "- [ ] Step 1: Gather Inputs",
				activePlaceholderWorkflowStableValues: {},
				activePlaceholderWorkflowValues: {},
			},
			currentTurnSlashCommandAction: undefined,
		})

		expect(candidate).to.equal(undefined)
	})

	it("returns undefined when step 1 has no workflow-start directive lines", async () => {
		const candidate = await resolveWorkflowFormSlashCommandStartCandidate({
			cwd: "/workspace",
			taskState: {
				activePlaceholderWorkflowSource: {
					type: "remote",
					name: "code-review.md",
					contents: `# Review

## Step 1: Gather Inputs
Collect the review context from the user.
`,
				},
				currentFocusChainChecklist: "- [ ] Step 1: Gather Inputs",
				activePlaceholderWorkflowStableValues: {},
				activePlaceholderWorkflowValues: {},
			},
			currentTurnSlashCommandAction: {
				type: "activate_placeholder_workflow",
				workflowId: "code-review",
				workflowSource: {
					type: "remote",
					name: "code-review.md",
					contents: "",
				},
			},
		})

		expect(candidate).to.equal(undefined)
	})

	it("parses required and optional directive lines into workflow-start requirements", () => {
		const requirements = parseWorkflowStartRequirements(`
Required: {review_input}, {spec_file}
Optional: {diff_output}, {notes_file}
One of: {review_input}, {diff_output}
`)

		expect(requirements).to.deep.equal({
			requiredFieldKeys: ["review_input", "spec_file"],
			optionalFieldKeys: ["diff_output", "notes_file"],
			oneOfRequirement: {
				id: "workflow_start_one_of",
				fieldKeys: ["review_input", "diff_output"],
			},
		})
	})

	it("ignores Optional semantics when the same placeholder is also Required", () => {
		const requirements = parseWorkflowStartRequirements(`
Required: {review_input}
Optional: {review_input}, {diff_output}
`)

		expect(requirements).to.deep.equal({
			requiredFieldKeys: ["review_input"],
			optionalFieldKeys: ["diff_output"],
			oneOfRequirement: undefined,
		})
	})

	it("uses only the first One of line and ignores later One of lines", () => {
		const requirements = parseWorkflowStartRequirements(`
One of: {review_input}, {diff_output}
One of: {spec_file}, {notes_file}
`)

		expect(requirements).to.deep.equal({
			requiredFieldKeys: [],
			optionalFieldKeys: [],
			oneOfRequirement: {
				id: "workflow_start_one_of",
				fieldKeys: ["review_input", "diff_output"],
			},
		})
	})

	it("ignores placeholders after the fifth member of the first One of line", () => {
		const requirements = parseWorkflowStartRequirements(`
One of: {one}, {two}, {three}, {four}, {five}, {six}
`)

		expect(requirements).to.deep.equal({
			requiredFieldKeys: [],
			optionalFieldKeys: [],
			oneOfRequirement: {
				id: "workflow_start_one_of",
				fieldKeys: ["one", "two", "three", "four", "five"],
			},
		})
	})
})
