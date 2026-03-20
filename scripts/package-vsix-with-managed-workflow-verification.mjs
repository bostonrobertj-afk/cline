#!/usr/bin/env node

import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"

function parseArgs(argv) {
	let out = "dist/verified.vsix"
	const passThroughArgs = []

	for (const arg of argv) {
		if (arg.startsWith("--out=")) {
			out = arg.slice("--out=".length)
		} else if (arg === "--out") {
			throw new Error("Use --out=<path> when packaging a verified VSIX.")
		} else {
			passThroughArgs.push(arg)
		}
	}

	return { out, passThroughArgs }
}

function main() {
	const { out, passThroughArgs } = parseArgs(process.argv.slice(2))
	const resolvedOut = path.resolve(process.cwd(), out)
	fs.mkdirSync(path.dirname(resolvedOut), { recursive: true })

	execFileSync("npx", ["vsce", "package", "--allow-package-secrets", "sendgrid", "--out", resolvedOut, ...passThroughArgs], {
		stdio: "inherit",
	})
	execFileSync(
		process.execPath,
		["scripts/verify-managed-workflow-assets.mjs", `--archive=${resolvedOut}`, "--archive-prefix=extension"],
		{
			stdio: "inherit",
		},
	)
}

try {
	main()
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
}
