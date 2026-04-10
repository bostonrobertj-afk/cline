import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import {
	getWorkflowFormWorkflowStepTriggerDefinition,
	resolveWorkflowFormSlashCommandStartCandidate,
	resolveWorkflowFormWorkflowStepCandidate,
} from "../WorkflowFormTriggerRegistry"
import { parseWorkflowStartRequirements } from "../workflowStartRequirements"

describe("WorkflowFormTriggerRegistry", () => {
	it("returns a V2 slash-command start candidate with a built workflow-start definition payload", async () => {
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

		expect(candidate?.resolverId).to.equal("placeholder_workflow_start_set_workflow_placeholders")
		expect(candidate?.triggerSource).to.equal("slash_command")
		expect(candidate?.owner).to.deep.equal({
			kind: "slash_command",
			workflowName: "review-adversarial-general.md",
			stepNumber: 1,
		})
		expect(candidate?.definitionPayload.firstPanelId).to.equal("workflow_start_inputs")
		expect(candidate?.definitionPayload.panels.workflow_start_inputs.fields.map((field) => field.key)).to.deep.equal([
			"review_input",
			"spec_file",
			"diff_output",
		])
	})

	it("returns a V2 slash-command start candidate for create-epics when the workflow uses canonical directive placeholders", async () => {
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

		expect(candidate?.definitionPayload.panels.workflow_start_inputs.fields.map((field) => field.key)).to.deep.equal([
			"architecture_document",
			"prd",
			"mode",
			"ux_spec",
			"ui_spec",
		])
		expect(candidate?.definitionPayload.title).to.equal("Inputs for This Workflow")
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

	it("returns a Code Review Step 2 trigger candidate with a built V2 definition payload", async () => {
		const candidate = await resolveWorkflowFormWorkflowStepCandidate({
			cwd: "/workspace",
			taskState: {
				activePlaceholderWorkflowSource: {
					type: "remote",
					name: "code-review.md",
					contents: `# Code Review

## Step 1: Gather Inputs
Required: {review_input}

## Step 2: Resolve Diff Source
Collect the diff source.

## Step 3: Review
Run the review.
`,
				},
				currentFocusChainChecklist:
					"- [x] Step 1: Gather Inputs\n- [ ] Step 2: Resolve Diff Source\n- [ ] Step 3: Review",
				activePlaceholderWorkflowStableValues: {},
				activePlaceholderWorkflowValues: {},
				activePlaceholderWorkflowTaskWriteProofPaths: [],
			},
		})

		expect(candidate?.resolverId).to.equal("code_review_step_3_diff_source")
		expect(candidate?.triggerSource).to.equal("deterministic_workflow_progression")
		expect(candidate?.definitionPayload.firstPanelId).to.equal("confirm_resolution")
		expect(candidate?.definitionPayload.panels.source_selection.fields[0]?.key).to.equal("source.type")
	})

	it("returns a Brainstorming Step 3 trigger candidate with a built V2 definition payload", async () => {
		const candidate = await resolveWorkflowFormWorkflowStepCandidate({
			cwd: "/workspace",
			taskState: {
				activePlaceholderWorkflowSource: {
					type: "remote",
					name: "brainstorming.md",
					contents: `# Brainstorming

## Step 1: Pick a Session
Prepare the session.

## Step 2: Capture Topic
Capture the topic.

## Step 3: Capture Topic
Collect the brainstorming topic.
`,
				},
				currentFocusChainChecklist:
					"- [x] Step 1: Pick a Session\n- [x] Step 2: Capture Topic\n- [ ] Step 3: Capture Topic",
				activePlaceholderWorkflowStableValues: {},
				activePlaceholderWorkflowValues: {},
				activePlaceholderWorkflowTaskWriteProofPaths: [],
			},
		})

		expect(candidate?.resolverId).to.equal("brainstorming_step_3_capture_topic")
		expect(candidate?.definitionPayload.panels[candidate.definitionPayload.firstPanelId]?.fields[0]?.key).to.equal("topic")
	})

	it("returns a Brainstorming Step 2 trigger candidate with existing session options already embedded", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-form-brainstorming-step-2-"))
		const sessionDir = path.join(tempDir, "planning", "brainstorming")

		try {
			await fs.mkdir(sessionDir, { recursive: true })
			await fs.writeFile(path.join(sessionDir, "brainstorming-session-2026-04-10.md"), "# existing\n", "utf8")
			await fs.writeFile(path.join(sessionDir, "brainstorming-session-2026-04-10-2.md"), "# newer\n", "utf8")

			const candidate = await resolveWorkflowFormWorkflowStepCandidate({
				cwd: tempDir,
				taskState: {
					activePlaceholderWorkflowSource: {
						type: "remote",
						name: "brainstorming.md",
						contents: `# Brainstorming

## Step 1: Establish Context
Collect context.

## Step 2: Prepare Session
Prepare the session file.

## Step 3: Capture Topic
Capture the brainstorming topic.
`,
					},
					currentFocusChainChecklist:
						"- [x] Step 1: Establish Context\n- [ ] Step 2: Prepare Session\n- [ ] Step 3: Capture Topic",
					activePlaceholderWorkflowStableValues: {},
					activePlaceholderWorkflowValues: {
						output_folder: path.join(tempDir, "planning"),
					},
					activePlaceholderWorkflowTaskWriteProofPaths: [],
				},
			})

			expect(candidate?.resolverId).to.equal("brainstorming_step_2_prepare_session")
			expect(candidate?.definitionPayload.firstPanelId).to.equal("session_strategy")
			expect(
				candidate?.definitionPayload.panels.session_selection.fields[0]?.options?.map((option) => option.label),
			).to.deep.equal(["brainstorming-session-2026-04-10-2.md", "brainstorming-session-2026-04-10.md"])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not return a Brainstorming Step 2 trigger candidate when no sessions exist", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-form-brainstorming-step-2-empty-"))

		try {
			const candidate = await resolveWorkflowFormWorkflowStepCandidate({
				cwd: tempDir,
				taskState: {
					activePlaceholderWorkflowSource: {
						type: "remote",
						name: "brainstorming.md",
						contents: `# Brainstorming

## Step 1: Establish Context
Collect context.

## Step 2: Prepare Session
Prepare the session file.

## Step 3: Capture Topic
Capture the brainstorming topic.
`,
					},
					currentFocusChainChecklist:
						"- [x] Step 1: Establish Context\n- [ ] Step 2: Prepare Session\n- [ ] Step 3: Capture Topic",
					activePlaceholderWorkflowStableValues: {},
					activePlaceholderWorkflowValues: {
						output_folder: path.join(tempDir, "planning"),
					},
					activePlaceholderWorkflowTaskWriteProofPaths: [],
				},
			})

			expect(candidate).to.equal(undefined)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not return a Brainstorming Step 3 candidate once the topic section is populated and has a write proof", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-form-trigger-"))
		const brainstormingPath = path.join(tempDir, "brainstorming.md")

		try {
			await fs.writeFile(
				brainstormingPath,
				"# Brainstorming Session Results\n\n## Topic\nFocus on release automation.\n\n## Selected Approach\n\n## Selected Techniques\n\n### Techniques Used\n\n## Ideas Generated\n",
				"utf8",
			)

			const candidate = await resolveWorkflowFormWorkflowStepCandidate({
				cwd: tempDir,
				taskState: {
					activePlaceholderWorkflowSource: {
						type: "remote",
						name: "brainstorming.md",
						contents: `# Brainstorming

## Step 1: Pick a Session
Prepare the session.

## Step 2: Capture Topic
Capture the topic.

## Step 3: Capture Topic
Collect the brainstorming topic.
`,
					},
					currentFocusChainChecklist:
						"- [x] Step 1: Pick a Session\n- [x] Step 2: Capture Topic\n- [ ] Step 3: Capture Topic",
					activePlaceholderWorkflowStableValues: { output_file: brainstormingPath },
					activePlaceholderWorkflowValues: {},
					activePlaceholderWorkflowTaskWriteProofPaths: [brainstormingPath],
				},
			})

			expect(candidate).to.equal(undefined)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("returns a Brainstorming Step 4 trigger candidate while the selected approach or techniques sections are still empty", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-form-brainstorming-step-4-"))
		const brainstormingPath = path.join(tempDir, "planning", "brainstorming", "brainstorming-session-2026-04-10.md")
		const csvPath = path.join(tempDir, ".cline", "skills", "bmad-brainstorming", "brain-methods.csv")

		try {
			await fs.mkdir(path.dirname(brainstormingPath), { recursive: true })
			await fs.mkdir(path.dirname(csvPath), { recursive: true })
			await fs.writeFile(
				csvPath,
				[
					"category,technique_name,description",
					"creative,Reverse Brainstorming,Generate problems first.",
					"structured,Six Thinking Hats,Explore six perspectives.",
					"",
				].join("\n"),
				"utf8",
			)
			await fs.writeFile(
				brainstormingPath,
				"# Brainstorming Session Results\n\n## Topic\nLaunch planning.\n\n## Selected Approach\n\n## Selected Techniques\n\n### Techniques Used\n\n## Ideas Generated\n",
				"utf8",
			)

			const candidate = await resolveWorkflowFormWorkflowStepCandidate({
				cwd: tempDir,
				taskState: {
					activePlaceholderWorkflowSource: {
						type: "remote",
						name: "brainstorming.md",
						contents: `# Brainstorming

## Step 1: Establish Context
Collect context.

## Step 2: Prepare Session
Prepare the session file.

## Step 3: Capture Topic
Capture the brainstorming topic.

## Step 4: Choose Technique
Choose the brainstorming technique.
`,
					},
					currentFocusChainChecklist:
						"- [x] Step 1: Establish Context\n- [x] Step 2: Prepare Session\n- [x] Step 3: Capture Topic\n- [ ] Step 4: Choose Technique",
					activePlaceholderWorkflowStableValues: { output_file: brainstormingPath },
					activePlaceholderWorkflowValues: {},
					activePlaceholderWorkflowTaskWriteProofPaths: [],
				},
			})

			expect(candidate?.resolverId).to.equal("brainstorming_step_4_choose_approach")
			expect(candidate?.definitionPayload.firstPanelId).to.equal("approach_selection")
			expect(candidate?.definitionPayload.panels.random_preview.allowedActions).to.deep.equal([
				"submit",
				"cancel",
				"back",
				"retry",
			])
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("maps the deterministic trigger registry to the remediated Brainstorming and Code Review workflow steps", () => {
		expect(getWorkflowFormWorkflowStepTriggerDefinition("code-review.md", 2)?.resolverId).to.equal(
			"code_review_step_3_diff_source",
		)
		expect(getWorkflowFormWorkflowStepTriggerDefinition("brainstorming.md", 2)?.resolverId).to.equal(
			"brainstorming_step_2_prepare_session",
		)
		expect(getWorkflowFormWorkflowStepTriggerDefinition("brainstorming.md", 3)?.resolverId).to.equal(
			"brainstorming_step_3_capture_topic",
		)
		expect(getWorkflowFormWorkflowStepTriggerDefinition("brainstorming.md", 4)?.resolverId).to.equal(
			"brainstorming_step_4_choose_approach",
		)
	})
})
