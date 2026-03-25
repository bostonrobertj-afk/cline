import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import { buildWorkflowStablePlaceholders } from "../workflow-placeholders"

describe("workflow placeholders", () => {
	it("builds built-in stable placeholders even without a config file", async () => {
		const cwd = path.join("/tmp", "workflow-placeholders-builtins")
		const placeholders = await buildWorkflowStablePlaceholders({ cwd })

		expect(placeholders["project-root"]).to.equal(cwd)
		expect(placeholders.project_root).to.equal(cwd)
		expect(placeholders.cwd).to.equal(cwd)
		expect(placeholders.date).to.match(/^\d{4}-\d{2}-\d{2}$/)
		expect(placeholders.config_source).to.equal(undefined)
	})

	it("loads config values and resolves nested placeholders recursively", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-placeholders-config-"))
		const configPath = path.join(tempDir, "_bmad", "bmm", "config.yaml")
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
				configPath,
			})

			expect(placeholders.communication_language).to.equal("English")
			expect(placeholders.project_name).to.equal(`${tempDir}/app`)
			expect(placeholders.nested_path).to.equal(`${tempDir}/app/stories`)
			expect(placeholders.config_source).to.equal("_bmad/bmm/config.yaml")
			expect(placeholders.config_ref).to.equal("_bmad/bmm/config.yaml")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("leaves unresolved placeholders unchanged when config values cannot be fully resolved", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-placeholders-unresolved-"))
		const configPath = path.join(tempDir, "_bmad", "bmm", "config.yaml")
		await fs.mkdir(path.dirname(configPath), { recursive: true })
		await fs.writeFile(configPath, ['known_value: "resolved"', 'report_path: "{missing_value}/report.md"'].join("\n"), "utf8")

		try {
			const placeholders = await buildWorkflowStablePlaceholders({
				cwd: tempDir,
				configPath,
			})

			expect(placeholders.known_value).to.equal("resolved")
			expect(placeholders.report_path).to.equal("{missing_value}/report.md")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})
})
