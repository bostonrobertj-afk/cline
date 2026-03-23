const Module = require("module")
const originalRequire = Module.prototype.require

/**
 * VSCode is not available during unit tests
 * @see {@link file://./vscode-mock.ts}
 */
Module.prototype.require = function (path: string) {
	if (path === "vscode") {
		return require("./vscode-mock")
	}
	// Avoid pulling in VSCode-integrated checkpoint/editor code during unit tests
	if (path === "@integrations/checkpoints") {
		return {}
	}
	if (path === "@integrations/checkpoints/MultiRootCheckpointManager") {
		return { MultiRootCheckpointManager: class {} }
	}

	return originalRequire.call(this, path)
}

// Keep the unit-test bootstrap lightweight and fully CommonJS-compatible.
// Mocha loads this file via `--require`, so avoid importing runtime modules that
// bring in app aliases or ESM-only dependency chains just to install the helper.
if (typeof (String.prototype as any).toPosix !== "function") {
	;(String.prototype as any).toPosix = function (this: string): string {
		return this.replace(/\\/g, "/")
	}
}
