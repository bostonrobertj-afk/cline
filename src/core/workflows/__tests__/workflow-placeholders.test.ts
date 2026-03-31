import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import {
	buildWorkflowStablePlaceholders,
	extractWorkflowPlaceholderKeys,
	getCanonicalWorkflowConfigPath,
} from "../workflow-placeholders"

describe("workflow placeholders", () => {
	it("builds built-in stable placeholders even without a config file", async () => {
		const cwd = path.join("/tmp", "workflow-placeholders-builtins")
		const placeholders = await buildWorkflowStablePlaceholders({ cwd })

		expect(placeholders["project-root"]).to.equal(cwd)
		expect(placeholders.project_root).to.equal(cwd)
		expect(placeholders.cwd).to.equal(cwd)
		expect(placeholders.date).to.match(/^\d{4}-\d{2}-\d{2}$/)
		expect(placeholders.config_source).to.equal(".cline/workflow-config.yaml")
	})

	it("loads config values and resolves nested placeholders recursively", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-placeholders-config-"))
		const configPath = getCanonicalWorkflowConfigPath(tempDir)
		await fs.mkdir(path.dirname(configPath), { recursive: true })
		await fs.writeFile(
			configPath,
			[
				'communication_language: "English"',
				'project_name: "{project_root}/app"',
				'nested_path: "{{project_name}}/stories"',
				'config_ref: "{config_source}"',
			].join("\n"),
			"utf8",
		)

		try {
			const placeholders = await buildWorkflowStablePlaceholders({
				cwd: tempDir,
			})

			expect(placeholders.communication_language).to.equal("English")
			expect(placeholders.project_name).to.equal(`${tempDir}/app`)
			expect(placeholders.nested_path).to.equal(`${tempDir}/app/stories`)
			expect(placeholders.config_source).to.equal(".cline/workflow-config.yaml")
			expect(placeholders.config_ref).to.equal(".cline/workflow-config.yaml")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("leaves unresolved placeholders unchanged when config values cannot be fully resolved", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-placeholders-unresolved-"))
		const configPath = getCanonicalWorkflowConfigPath(tempDir)
		await fs.mkdir(path.dirname(configPath), { recursive: true })
		await fs.writeFile(configPath, ['known_value: "resolved"', 'report_path: "{missing_value}/report.md"'].join("\n"), "utf8")

		try {
			const placeholders = await buildWorkflowStablePlaceholders({
				cwd: tempDir,
			})

			expect(placeholders.known_value).to.equal("resolved")
			expect(placeholders.report_path).to.equal("{missing_value}/report.md")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("extracts unique normalized placeholder keys from single-curly and double-curly tokens", () => {
		expect(
			extractWorkflowPlaceholderKeys(
				"Review {diff_output}, compare {{ review_input }}, keep {diff_output}, and ignore plain text.",
			),
		).to.deep.equal(["diff_output", "review_input"])
	})

	it("returns an empty array when there are no placeholder tokens", () => {
		expect(extractWorkflowPlaceholderKeys(undefined)).to.deep.equal([])
		expect(extractWorkflowPlaceholderKeys("No placeholders here.")).to.deep.equal([])
	})
})
