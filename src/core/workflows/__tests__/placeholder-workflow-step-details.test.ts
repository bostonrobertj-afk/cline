import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import {
	type ActivePlaceholderWorkflowSource,
	buildActivePlaceholderWorkflowSource,
	buildPlaceholderWorkflowChecklist,
	getActivePlaceholderWorkflowStepDetails,
} from "../placeholder-workflow-step-details"
import { getCanonicalWorkflowConfigPath } from "../workflow-placeholders"

const SAMPLE_WORKFLOW = `# Review Workflow

## Step 1: Gather Context
Determine what to review from the user's prompt before asking follow-up questions.
Prefer the explicit story path when the user provides one.

## Step 2: Review
Inspect the prepared review input and write findings.
`

describe("placeholder workflow step details", () => {
	it("matches the first incomplete checklist item by step number for remote workflows", async () => {
		const result = await getActivePlaceholderWorkflowStepDetails({
			checklistMarkdown: "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review",
			source: {
				type: "remote",
				name: "remote-review",
				contents: SAMPLE_WORKFLOW,
			},
		})

		expect(result?.checklistLabel).to.equal("Step 1: Gather Context")
		expect(result?.stepNumber).to.equal(1)
		expect(result?.stepTitle).to.equal("Gather Context")
		expect(result?.details).to.contain("Determine what to review from the user's prompt")
	})

	it("falls back to normalized title matching when the checklist item omits the step prefix", async () => {
		const result = await getActivePlaceholderWorkflowStepDetails({
			checklistMarkdown: "- [ ] Gather Context\n- [ ] Review",
			source: {
				type: "remote",
				name: "remote-review",
				contents: SAMPLE_WORKFLOW,
			},
		})

		expect(result?.stepNumber).to.equal(1)
		expect(result?.stepTitle).to.equal("Gather Context")
	})

	it("builds checklist rows from step headings for remote workflows", async () => {
		const checklist = await buildPlaceholderWorkflowChecklist({
			source: {
				type: "remote",
				name: "remote-review",
				contents: SAMPLE_WORKFLOW,
			},
		})

		expect(checklist).to.equal("- [ ] Step 1: Gather Context\n- [ ] Step 2: Review")
	})

	it("resolves stable placeholders while preserving unresolved dynamic tokens in step details", async () => {
		const workflow = `# Review Workflow

## Step 1: Gather Context
Write notes to {output_folder}/notes.md and keep {{story_id}} visible until it is set.
`

		const result = await getActivePlaceholderWorkflowStepDetails({
			checklistMarkdown: "- [ ] Step 1: Gather Context",
			source: {
				type: "remote",
				name: "remote-review",
				contents: workflow,
			},
			stablePlaceholderValues: {
				output_folder: "/workspace/output",
			},
		})

		expect(result?.details).to.contain("/workspace/output/notes.md")
		expect(result?.details).to.contain("{{story_id}}")
	})

	it("lets dynamic placeholder values override stable workflow values", async () => {
		const workflow = `# Review Workflow

## Step 1: Gather Context
Review story {{story_id}} before continuing.
`

		const result = await getActivePlaceholderWorkflowStepDetails({
			checklistMarkdown: "- [ ] Step 1: Gather Context",
			source: {
				type: "remote",
				name: "remote-review",
				contents: workflow,
			},
			stablePlaceholderValues: {
				story_id: "1.0",
			},
			placeholderValues: {
				story_id: "1.2",
			},
		})

		expect(result?.details).to.contain("Review story 1.2 before continuing.")
		expect(result?.details).to.not.contain("1.0")
	})

	it("builds checklist rows from ### Step N - Title headings without affecting detail extraction", async () => {
		const workflow = `# Review Workflow

### Step 1 - Gather Context
Determine what to review from the user's prompt before asking follow-up questions.

### Step 2 - Review
Inspect the prepared review input and write findings.
`

		const checklist = await buildPlaceholderWorkflowChecklist({
			source: {
				type: "remote",
				name: "remote-review",
				contents: workflow,
			},
		})
		const details = await getActivePlaceholderWorkflowStepDetails({
			checklistMarkdown: checklist!,
			source: {
				type: "remote",
				name: "remote-review",
				contents: workflow,
			},
		})

		expect(checklist).to.equal("- [ ] Step 1: Gather Context\n- [ ] Step 2: Review")
		expect(details?.details).to.contain("Determine what to review from the user's prompt")
	})

	it("returns undefined when there are no incomplete checklist items", async () => {
		const result = await getActivePlaceholderWorkflowStepDetails({
			checklistMarkdown: "- [x] Step 1: Gather Context\n- [x] Step 2: Review",
			source: {
				type: "remote",
				name: "remote-review",
				contents: SAMPLE_WORKFLOW,
			},
		})

		expect(result).to.equal(undefined)
	})

	it("returns undefined when no workflow heading matches the first incomplete checklist item", async () => {
		const result = await getActivePlaceholderWorkflowStepDetails({
			checklistMarkdown: "- [ ] Step 9: Ship It",
			source: {
				type: "remote",
				name: "remote-review",
				contents: SAMPLE_WORKFLOW,
			},
		})

		expect(result).to.equal(undefined)
	})

	it("stops extraction at the next workflow step heading", async () => {
		const result = await getActivePlaceholderWorkflowStepDetails({
			checklistMarkdown: "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review",
			source: {
				type: "remote",
				name: "remote-review",
				contents: SAMPLE_WORKFLOW,
			},
		})

		expect(result?.details).to.not.contain("## Step 2: Review")
		expect(result?.details).to.not.contain("Inspect the prepared review input")
	})

	it("loads local workflow details from the persisted source path", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "placeholder-workflow-local-"))
		const workflowPath = path.join(tempDir, "local-review.md")
		await fs.writeFile(workflowPath, SAMPLE_WORKFLOW, "utf8")

		try {
			const result = await getActivePlaceholderWorkflowStepDetails({
				checklistMarkdown: "- [ ] Step 2: Review",
				source: {
					type: "local",
					name: "local-review.md",
					path: workflowPath,
				},
			})

			expect(result?.stepNumber).to.equal(2)
			expect(result?.sourceType).to.equal("local")
			expect(result?.details).to.contain("Inspect the prepared review input")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("loads global workflow details from the persisted source path", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "placeholder-workflow-global-"))
		const workflowPath = path.join(tempDir, "global-review.md")
		await fs.writeFile(workflowPath, SAMPLE_WORKFLOW, "utf8")

		try {
			const source: ActivePlaceholderWorkflowSource = {
				type: "global",
				name: "global-review.md",
				path: workflowPath,
			}
			const result = await getActivePlaceholderWorkflowStepDetails({
				checklistMarkdown: "- [ ] Step 1: Gather Context",
				source,
			})

			expect(result?.sourceType).to.equal("global")
			expect(result?.details).to.contain("Prefer the explicit story path")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("uses the canonical workflow config path for local placeholder workflows", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "placeholder-workflow-config-discovery-"))
		const workflowPath = path.join(tempDir, ".cline", "skills", "custom-review", "custom-review.md")
		const configPath = getCanonicalWorkflowConfigPath(tempDir)
		await fs.mkdir(path.dirname(workflowPath), { recursive: true })
		await fs.mkdir(path.dirname(configPath), { recursive: true })
		await fs.writeFile(workflowPath, SAMPLE_WORKFLOW, "utf8")
		await fs.writeFile(configPath, 'communication_language: "English"\n', "utf8")

		try {
			const source = await buildActivePlaceholderWorkflowSource(
				{
					name: "custom-review.md",
					source: "local",
					description: "Workspace workflow: custom-review.md",
					fileName: "custom-review.md",
					fullPath: workflowPath,
				},
				SAMPLE_WORKFLOW,
				tempDir,
			)

			expect(source).to.deep.equal({
				type: "local",
				name: "custom-review.md",
				path: workflowPath,
				configPath,
			})
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})
})
