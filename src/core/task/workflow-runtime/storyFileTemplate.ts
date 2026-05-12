export function buildWorkflowStoryFileTemplate(): string {
	return [
		"# Story",
		"",
		"## General Instructions",
		"",
		"## Objective",
		"",
		"## Scope",
		"",
		"## Scope Boundary",
		"",
		"## Requirements",
		"",
		"## Known Issues/ Risks/ Technical Debt",
		"",
		"## Tasks",
		"",
		"## Validation",
		"",
	].join("\n")
}
