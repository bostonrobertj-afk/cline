import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import {
	getWorkflowFormWorkflowStepTriggerDefinition,
	resolveWorkflowFormSlashCommandStartCandidate,
} from "../WorkflowFormTriggerRegistry"
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

	it("returns a slash-command start candidate for create-epics step 1 when the workflow uses canonical directive placeholders", async () => {
		const candidate = await resolveWorkflowFormSlashCommandStartCandidate({
			cwd: "/workspace",
			taskState: {
				activePlaceholderWorkflowSource: {
					type: "remote",
					name: "create-epics.md",
					contents: `# Create Epics

## Step 1: (System-Owned) Confirm the input set
Required: {architecture_document}, {prd}, {mode}
Optional: {ux_spec}, {ui_spec}

Use \`set_workflow_placeholders\` to persist the collected Step 1 inputs for this workflow before continuing.

Done Signal: \`{architecture_document}\`, \`{prd}\`, and \`{mode}\` are present and non-empty in workflow placeholder state for the active task/workflow session.

## Step 2: (System-Owned) Build the requirements inventory
Build the epics scaffold.
`,
				},
				currentFocusChainChecklist: "- [ ] Step 1: Confirm the input set\n- [ ] Step 2: Build the requirements inventory",
				activePlaceholderWorkflowStableValues: {},
				activePlaceholderWorkflowValues: {},
			},
			currentTurnSlashCommandAction: {
				type: "activate_placeholder_workflow",
				workflowId: "create-epics",
				workflowSource: {
					type: "remote",
					name: "create-epics.md",
					contents: "",
				},
			},
		})

		expect(candidate?.resolverId).to.equal("placeholder_workflow_start_set_workflow_placeholders")
		expect(candidate?.initialPhase).to.equal("collect_inputs")
		expect(candidate?.context).to.deep.equal({
			workflowName: "create-epics.md",
			workflowStartRequirements: {
				requiredFieldKeys: ["architecture_document", "prd", "mode"],
				optionalFieldKeys: ["ux_spec", "ui_spec"],
				oneOfRequirement: undefined,
			},
		})
	})

	it("returns undefined for create-epics step 1 when the workflow regresses to backticked bare keys", async () => {
		const candidate = await resolveWorkflowFormSlashCommandStartCandidate({
			cwd: "/workspace",
			taskState: {
				activePlaceholderWorkflowSource: {
					type: "remote",
					name: "create-epics.md",
					contents: `# Create Epics

## Step 1: (System-Owned) Confirm the input set
Required: \`architecture_document\`, \`PRD\`, \`mode\`
Optional: \`ux_spec\`, \`ui_spec\`
`,
				},
				currentFocusChainChecklist: "- [ ] Step 1: Confirm the input set",
				activePlaceholderWorkflowStableValues: {},
				activePlaceholderWorkflowValues: {},
			},
			currentTurnSlashCommandAction: {
				type: "activate_placeholder_workflow",
				workflowId: "create-epics",
				workflowSource: {
					type: "remote",
					name: "create-epics.md",
					contents: "",
				},
			},
		})

		expect(candidate).to.equal(undefined)
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

	it("maps code-review step 2 to the diff workflow-form resolver", () => {
		expect(getWorkflowFormWorkflowStepTriggerDefinition("code-review.md", 2)?.resolverId).to.equal(
			"code_review_step_3_diff_source",
		)
	})

	it("maps brainstorming step 3 to the topic-capture workflow-form resolver", () => {
		expect(getWorkflowFormWorkflowStepTriggerDefinition("brainstorming.md", 3)?.resolverId).to.equal(
			"brainstorming_step_3_capture_topic",
		)
	})

	it("intercepts brainstorming step 3 when output_file is missing", async () => {
		const trigger = getWorkflowFormWorkflowStepTriggerDefinition("brainstorming.md", 3)
		const shouldIntercept = await trigger?.shouldIntercept({
			cwd: "/workspace",
			taskState: {
				activePlaceholderWorkflowStableValues: {},
				activePlaceholderWorkflowValues: {},
				activePlaceholderWorkflowTaskWriteProofPaths: [],
			},
		})

		expect(shouldIntercept).to.equal(true)
	})

	it("intercepts brainstorming step 3 when the canonical topic section is empty", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-form-trigger-"))
		const brainstormingPath = path.join(tempDir, "brainstorming.md")

		try {
			await fs.writeFile(
				brainstormingPath,
				"# Brainstorming Session Results\n\n## Topic\n\n## Selected Approach\n\n## Selected Techniques\n\n### Techniques Used\n\n## Ideas Generated\n",
				"utf8",
			)

			const trigger = getWorkflowFormWorkflowStepTriggerDefinition("brainstorming.md", 3)
			const shouldIntercept = await trigger?.shouldIntercept({
				cwd: tempDir,
				taskState: {
					activePlaceholderWorkflowStableValues: { output_file: brainstormingPath },
					activePlaceholderWorkflowValues: {},
					activePlaceholderWorkflowTaskWriteProofPaths: [brainstormingPath],
				},
			})

			expect(shouldIntercept).to.equal(true)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not intercept brainstorming step 3 when the canonical topic section contains text and the file has a write proof", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-form-trigger-"))
		const brainstormingPath = path.join(tempDir, "brainstorming.md")

		try {
			await fs.writeFile(
				brainstormingPath,
				"# Brainstorming Session Results\n\n## Topic\nFocus on release automation.\n\n## Selected Approach\n\n## Selected Techniques\n\n### Techniques Used\n\n## Ideas Generated\n",
				"utf8",
			)

			const trigger = getWorkflowFormWorkflowStepTriggerDefinition("brainstorming.md", 3)
			const shouldIntercept = await trigger?.shouldIntercept({
				cwd: tempDir,
				taskState: {
					activePlaceholderWorkflowStableValues: { output_file: brainstormingPath },
					activePlaceholderWorkflowValues: {},
					activePlaceholderWorkflowTaskWriteProofPaths: [brainstormingPath],
				},
			})

			expect(shouldIntercept).to.equal(false)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("intercepts brainstorming step 3 when the topic section contains text but the file lacks a current-task write proof", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-form-trigger-"))
		const brainstormingPath = path.join(tempDir, "brainstorming.md")

		try {
			await fs.writeFile(
				brainstormingPath,
				"# Brainstorming Session Results\n\n## Topic\nFocus on release automation.\n\n## Selected Approach\n\n## Selected Techniques\n\n### Techniques Used\n\n## Ideas Generated\n",
				"utf8",
			)

			const trigger = getWorkflowFormWorkflowStepTriggerDefinition("brainstorming.md", 3)
			const shouldIntercept = await trigger?.shouldIntercept({
				cwd: tempDir,
				taskState: {
					activePlaceholderWorkflowStableValues: { output_file: brainstormingPath },
					activePlaceholderWorkflowValues: {},
					activePlaceholderWorkflowTaskWriteProofPaths: [],
				},
			})

			expect(shouldIntercept).to.equal(true)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})
})
