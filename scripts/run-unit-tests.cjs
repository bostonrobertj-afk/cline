#!/usr/bin/env node

const path = require("path")
const Mocha = require("mocha")
const { loadOptions } = require("mocha/lib/cli/options")
const collectFiles = require("mocha/lib/cli/collect-files")

function extractExplicitSpecArgs(argv) {
	const valueOptions = new Set([
		"--config",
		"--extension",
		"--fgrep",
		"--file",
		"--global",
		"--grep",
		"--ignore",
		"--jobs",
		"--node-option",
		"--package",
		"--reporter",
		"--reporter-option",
		"--reporter-options",
		"--require",
		"--retries",
		"--slow",
		"--timeout",
		"--ui",
		"--watch-files",
		"--watch-ignore",
		"-f",
		"-g",
		"-j",
		"-n",
		"-O",
		"-r",
		"-R",
		"-s",
		"-t",
		"-u",
	])

	const explicitSpecs = []

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index]
		if (!arg || arg === "--") {
			continue
		}
		if (valueOptions.has(arg)) {
			index += 1
			continue
		}
		if (arg.startsWith("-")) {
			continue
		}
		// Only treat path-like positional args as explicit spec overrides.
		if (arg.includes("/") || arg.includes("*") || arg.endsWith(".ts") || arg.endsWith(".js")) {
			explicitSpecs.push(arg)
		}
	}

	return explicitSpecs
}

function forceExit(code) {
	process.exitCode = code

	const streams = [process.stdout, process.stderr]
	let pending = streams.length

	const done = () => {
		pending -= 1
		if (pending <= 0) {
			process.exit(code)
		}
	}

	for (const stream of streams) {
		stream.write("", done)
	}
}

function requireUnitTestBootstrap() {
	// Keep everything on the CommonJS loader path. The mocha CLI in v10
	// import()-loads test files first, which conflicts with this repo's
	// ts-node + path-alias + bootstrap setup under Node 20.
	// Transpile-only keeps unit runs from stalling in type-resolution walks of
	// very large module graphs; typechecking belongs in the dedicated TS/lint jobs.
	require("ts-node/register/transpile-only")
	require("tsconfig-paths/register")
	require("source-map-support/register")
	require(path.resolve(__dirname, "../src/test/requires.ts"))
}

async function main() {
	const argv = process.argv.slice(2)
	const options = loadOptions(argv)
	const explicitSpecs = extractExplicitSpecArgs(argv)

	requireUnitTestBootstrap()

	const mocha = new Mocha({
		...options,
		require: [],
		spec: undefined,
		_: undefined,
		package: false,
		config: false,
	})

	const fileCollection = collectFiles({
		ignore: options.ignore || [],
		extension: options.extension || ["ts"],
		file: options.file || [],
		recursive: options.recursive || false,
		sort: options.sort || false,
		spec:
			explicitSpecs.length > 0 ? explicitSpecs : options._ && options._.length > 0 ? options._ : ["src/**/__tests__/*.ts"],
	})

	if (fileCollection.unmatchedFiles.length > 0) {
		for (const { pattern, absolutePath } of fileCollection.unmatchedFiles) {
			console.error(`Warning: Cannot find any files matching pattern "${pattern}" at the absolute path "${absolutePath}"`)
		}
		process.exitCode = 1
		return
	}

	mocha.files = fileCollection.files
	mocha.loadFiles()

	const runner = mocha.run((failures) => {
		const code = failures > 0 ? 1 : 0
		if (options.exit) {
			forceExit(code)
			return
		}
		process.exitCode = code
	})

	if (options.failZero) {
		runner.once("end", () => {
			if (runner.stats?.tests === 0) {
				const code = 1
				if (options.exit) {
					forceExit(code)
					return
				}
				process.exitCode = code
			}
		})
	}
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
