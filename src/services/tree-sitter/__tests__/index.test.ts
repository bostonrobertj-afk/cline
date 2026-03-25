import * as fs from "fs/promises"
import { after, describe, it } from "mocha"
import * as os from "os"
import * as path from "path"
import "should"
import sinon from "sinon"
import { parseSourceCodeForDefinitionsTopLevel } from ".."

describe("parseSourceCodeForDefinitionsTopLevel", () => {
	const tmpDir = path.join(os.tmpdir(), `cline-tree-sitter-test-${Math.random().toString(36).slice(2)}`)

	after(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined)
	})

	it("returns file-specific error when path points to a file", async () => {
		await fs.mkdir(tmpDir, { recursive: true })
		const filePath = path.join(tmpDir, "backends.py")
		await fs.writeFile(filePath, "class Backend:\n    pass\n")

		const result = await parseSourceCodeForDefinitionsTopLevel(filePath)

		result.should.containEql("is a file, not a directory")
		result.should.containEql("read_file")
	})

	it("returns directory-not-found error for non-existent path", async () => {
		const result = await parseSourceCodeForDefinitionsTopLevel(path.join(tmpDir, "nonexistent"))

		result.should.equal("This directory does not exist or you do not have permission to access it.")
	})

	it("includes 1-based line numbers for discovered definitions", async () => {
		await fs.mkdir(tmpDir, { recursive: true })
		await fs.writeFile(
			path.join(tmpDir, "example.ts"),
			["const topLevel = 1", "", "function greet() {", "  return topLevel", "}", ""].join("\n"),
		)

		const parserModule = await import("../languageParser")
		const sandbox = sinon.createSandbox()
		sandbox.stub(parserModule, "loadRequiredLanguageParsers").resolves({
			ts: {
				parser: {
					parse: () => ({ rootNode: {} }),
				},
				query: {
					captures: () => [
						{
							name: "name.definition",
							node: {
								startPosition: { row: 0 },
								endPosition: { row: 0 },
							},
						},
						{
							name: "name.definition",
							node: {
								startPosition: { row: 2 },
								endPosition: { row: 4 },
							},
						},
					],
				},
			},
		} as any)

		try {
			const result = await parseSourceCodeForDefinitionsTopLevel(tmpDir)

			result.should.containEql("│1: const topLevel = 1")
			result.should.containEql("│3: function greet() {")
		} finally {
			sandbox.restore()
		}
	})
})
