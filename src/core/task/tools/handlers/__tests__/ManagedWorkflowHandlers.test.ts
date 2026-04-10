import * as disk from "@core/storage/disk"
import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import simpleGit from "simple-git"
import sinon from "sinon"
import { formatResponse } from "@/core/prompts/responses"
import { getCanonicalWorkflowConfigPath } from "@/core/workflows/workflow-placeholders"
import { HostProvider } from "@/hosts/host-provider"
import { setVscodeHostProviderMock } from "@/test/host-provider-test-utils"
import { startOrResumeManagedWorkflowRun } from "../../../managed-workflows/ManagedWorkflowController"
import type { ManagedWorkflowRunState } from "../../../managed-workflows/types"
import { TaskState } from "../../../TaskState"
import { RESPONSE_TOOL_SUCCESS_MESSAGE } from "../../response/types"
import type { TaskConfig } from "../../types/TaskConfig"
import { AttemptCompletionHandler } from "../AttemptCompletionHandler"
import { BuildEpicDeliverySpecToolHandler } from "../BuildEpicDeliverySpecToolHandler"
import { BuildEpicsDocumentToolHandler } from "../BuildEpicsDocumentToolHandler"
import { BuildReviewDiffOutputToolHandler } from "../BuildReviewDiffOutputToolHandler"
import { BuildReviewInputToolHandler } from "../BuildReviewInputToolHandler"
import { BuildStoryDocumentToolHandler } from "../BuildStoryDocumentToolHandler"
import { BuildTechSpecDocumentToolHandler } from "../BuildTechSpecDocumentToolHandler"
import { CaptureBrainstormingTopicToolHandler } from "../CaptureBrainstormingTopicToolHandler"
import { CodeReviewSpecUpdateToolHandler } from "../CodeReviewSpecUpdateToolHandler"
import { CompleteWorkflowItemToolHandler } from "../CompleteWorkflowItemToolHandler"
import { ContinueBrainstormingSessionToolHandler } from "../ContinueBrainstormingSessionToolHandler"
import { CreateBrainstormingSessionToolHandler } from "../CreateBrainstormingSessionToolHandler"
import { PersistBrainstormingApproachToolHandler } from "../PersistBrainstormingApproachToolHandler"
import { PersistBrainstormingTechniqueToolHandler } from "../PersistBrainstormingTechniqueToolHandler"
import { RequestBrainstormingTechniqueSuggestionToolHandler } from "../RequestBrainstormingTechniqueSuggestionToolHandler"
import { SelectBrainstormingSessionToolHandler } from "../SelectBrainstormingSessionToolHandler"
import { SelectRandomBrainstormingTechniqueToolHandler } from "../SelectRandomBrainstormingTechniqueToolHandler"
import { SetWorkflowPlaceholdersToolHandler } from "../SetWorkflowPlaceholdersToolHandler"
import { UseSkillToolHandler } from "../UseSkillToolHandler"

function createManagedWorkflowRun(): ManagedWorkflowRunState {
	return {
		workflowId: "bmad-code-review",
		slashCommand: "bmad-code-review",
		status: "active",
		currentPhaseIndex: 0,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		allRequiredComplete: false,
		phases: [
			{
				id: "step-01-gather-context",
				title: "Gather Context",
				sourcePath: ".cline/skills/bmad-code-review/steps/step-01-gather-context.md",
				sourceContent: "# Step 1",
				completed: false,
				items: [
					{ id: "step-01-gather-context::item-1", label: "Load context", sourceText: "Load context", completed: false },
					{
						id: "step-01-gather-context::item-2",
						label: "Summarize scope",
						sourceText: "Summarize scope",
						completed: false,
					},
				],
			},
		],
	}
}

function createConfig(overrides: Partial<TaskConfig> = {}): TaskConfig {
	const taskState = new TaskState()
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		ask: sinon.stub().resolves({ response: "yesButtonClicked" }),
		shouldAutoApproveToolWithPath: sinon.stub().resolves(true),
		saveCheckpoint: sinon.stub().resolves(),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
		removeLastPartialMessageIfExistsWithType: sinon.stub().resolves(),
		clearPartialResponseToolPreview: sinon.stub().resolves(false),
		updateFCListFromToolResponse: sinon.stub().resolves(),
		doesLatestTaskCompletionHaveNewChanges: sinon.stub().resolves(false),
		executeCommandTool: sinon.stub().resolves([false, "ok"]),
	} as any

	return {
		taskId: "task-managed-workflow",
		ulid: "ulid-managed-workflow",
		cwd: process.cwd(),
		mode: "act",
		strictPlanModeEnabled: false,
		yoloModeToggled: false,
		doubleCheckCompletionEnabled: false,
		vscodeTerminalExecutionMode: "backgroundExec",
		enableParallelToolCalling: true,
		isSubagentExecution: true,
		taskState,
		messageState: {
			getClineMessages: () => [],
			setClineMessages: sinon.stub(),
			saveClineMessagesAndUpdateHistory: sinon.stub().resolves(),
		} as any,
		api: {
			getModel: () => ({ id: "test-model", info: { supportsImages: false } }),
		} as any,
		autoApprovalSettings: {
			enableNotifications: false,
			actions: { executeSafeCommands: false, executeAllCommands: false },
		} as any,
		autoApprover: {
			shouldAutoApproveTool: sinon.stub().returns([true, true]),
		} as any,
		browserSettings: {} as any,
		focusChainSettings: { enabled: false } as any,
		services: {
			stateManager: {
				getGlobalStateKey: () => undefined,
				getGlobalSettingsKey: (key: string) => (key === "hooksEnabled" ? false : undefined),
				getWorkspaceStateKey: () => undefined,
				getRemoteConfigSettings: () => ({}),
				getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
			},
		} as any,
		callbacks,
		coordinator: { getHandler: sinon.stub() } as any,
		...overrides,
	} as TaskConfig
}

function expectPlaceholderWorkflowGuidance(text: string) {
	expect(text).to.be.a("string")
	expect(text).to.contain("task_progress")
	expect(text).to.contain("__COMPLETE_NEXT_STEP__")
}

function expectPlaceholderWorkflowActivationResult(text: string, workflowName: string) {
	expect(text).to.be.a("string")
	expect(text).to.contain(workflowName)
	expect(text.trim().length).to.be.greaterThan(workflowName.length)
}

async function createReviewDiffRepo() {
	const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), "build-review-diff-output-"))
	const git = simpleGit(repoDir)
	const workflowConfigPath = getCanonicalWorkflowConfigPath(repoDir)

	await git.init()
	await git.addConfig("user.name", "Test User")
	await git.addConfig("user.email", "test@example.com")

	await fs.mkdir(path.dirname(workflowConfigPath), { recursive: true })
	await fs.writeFile(
		workflowConfigPath,
		[
			"user_name: Rob",
			"communication_language: English",
			"document_output_language: English",
			'output_folder: "{project-root}/_bmad-output"',
			'diff_output: "{output_folder}/review-input.diff"',
			"",
		].join("\n"),
	)

	await fs.mkdir(path.join(repoDir, "src"), { recursive: true })
	await fs.writeFile(path.join(repoDir, "src", "in-scope.ts"), "export const inScope = 1\n")
	await git.add(".")
	await git.commit("add in scope file")
	const firstCommit = (await git.revparse(["HEAD"])).trim()

	await fs.mkdir(path.join(repoDir, "docs"), { recursive: true })
	await fs.writeFile(path.join(repoDir, "docs", "notes.md"), "# notes\n")
	await git.add(".")
	await git.commit("add out of scope notes")
	const secondCommit = (await git.revparse(["HEAD"])).trim()

	return {
		repoDir,
		firstCommit,
		secondCommit,
		diffOutputPath: path.join(repoDir, "_bmad-output", "review-input.diff"),
	}
}

async function createReviewInputRepo(options?: { diffTouchesStory?: boolean }) {
	const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), "build-review-input-"))
	const git = simpleGit(repoDir)
	const workflowConfigPath = getCanonicalWorkflowConfigPath(repoDir)
	const diffTouchesStory = options?.diffTouchesStory ?? true
	const storyRelativePath = "docs/story.md"
	const storyPath = path.join(repoDir, storyRelativePath)
	const diffOutputPath = path.join(repoDir, "_bmad-output", "review-input.diff")
	const reviewInputPath = path.join(repoDir, "_bmad-output", "review-input.md")

	await git.init()
	await git.addConfig("user.name", "Test User")
	await git.addConfig("user.email", "test@example.com")

	await fs.mkdir(path.dirname(workflowConfigPath), { recursive: true })
	await fs.writeFile(
		workflowConfigPath,
		[
			"user_name: Rob",
			"communication_language: English",
			"document_output_language: English",
			'output_folder: "{project-root}/_bmad-output"',
			'diff_output: "{output_folder}/review-input.diff"',
			"",
		].join("\n"),
	)

	await fs.mkdir(path.dirname(storyPath), { recursive: true })
	await fs.writeFile(
		storyPath,
		`# Story 3.2: Review Input Artifact
Status: review

## Acceptance Criteria
- AC 1
- AC 2

## Prior Review Findings
- Investigate prior QA feedback
- Added prior review finding

## Tasks / Subtasks
- [x] Added completed task
- [ ] Existing incomplete task

## Dev Agent Record
### Completion Notes List
- Existing completion note
  - Added completion note
`,
	)

	await fs.mkdir(path.join(repoDir, "src"), { recursive: true })
	await fs.writeFile(path.join(repoDir, "src", "other.ts"), "export const other = 1\n")
	await fs.mkdir(path.dirname(diffOutputPath), { recursive: true })
	await fs.writeFile(
		diffOutputPath,
		`# Review Diff Output

## Source
- Type: commit
- Commit: \`abc123\`
- Parent: \`def456\`
- Commit message: \`test\`
- Command: \`git show abc123\`

## Diff
\`\`\`diff
${
	diffTouchesStory
		? `diff --git a/${storyRelativePath} b/${storyRelativePath}
index 1111111..2222222 100644
--- a/${storyRelativePath}
+++ b/${storyRelativePath}
@@ -6,8 +6,10 @@ Status: review
 ## Prior Review Findings
 - Investigate prior QA feedback
+- Added prior review finding
 
 ## Tasks / Subtasks
+- [x] Added completed task
 - [ ] Existing incomplete task
 
 ## Dev Agent Record
 ### Completion Notes List
+  - Added completion note`
		: `diff --git a/src/other.ts b/src/other.ts
index 1111111..2222222 100644
--- a/src/other.ts
+++ b/src/other.ts
@@ -1 +1 @@
-export const other = 1
+export const other = 2`
}
\`\`\`
`,
	)

	return {
		repoDir,
		storyPath,
		diffOutputPath,
		reviewInputPath,
	}
}

async function createBuildEpicsDocumentRepo(options?: { includeWorkflowConfig?: boolean; preexistingArtifact?: string }) {
	const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), "build-epics-document-"))
	const git = simpleGit(repoDir)
	const workflowConfigPath = getCanonicalWorkflowConfigPath(repoDir)
	const includeWorkflowConfig = options?.includeWorkflowConfig !== false
	const templatePath = path.join(repoDir, ".cline", "skills", "bmad-create-epics-and-stories", "templates", "epics-template.md")
	const architectureRelativePath = "docs/architecture.md"
	const prdRelativePath = "docs/prd.md"
	const uiSpecRelativePath = "docs/ui-spec.md"
	const uxSpecRelativePath = "docs/ux-spec.md"
	const architecturePath = path.join(repoDir, architectureRelativePath)
	const prdPath = path.join(repoDir, prdRelativePath)
	const uiSpecPath = path.join(repoDir, uiSpecRelativePath)
	const uxSpecPath = path.join(repoDir, uxSpecRelativePath)
	const artifactPath = path.join(repoDir, "planning", "planning_artifacts", "epics.md")

	await git.init()
	await git.addConfig("user.name", "Test User")
	await git.addConfig("user.email", "test@example.com")

	if (includeWorkflowConfig) {
		await fs.mkdir(path.dirname(workflowConfigPath), { recursive: true })
		await fs.writeFile(workflowConfigPath, ['output_folder: "planning"', ""].join("\n"))
	}

	await fs.mkdir(path.dirname(templatePath), { recursive: true })
	await fs.writeFile(
		templatePath,
		`---
stepsCompleted: []
---

# {{project_name}} - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for {{project_name}}, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements


### NonFunctional Requirements

### Additional Requirements

### UX Design Requirements

### Domain-Specific Requirements

## Roadmap

### FR Coverage Map

## Epic List

<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic {{N}}: {{epic_title_N}}



`,
	)

	await fs.mkdir(path.dirname(architecturePath), { recursive: true })
	await fs.writeFile(architecturePath, "# Architecture\n\nSystem architecture context.\n")
	await fs.writeFile(
		prdPath,
		`# PRD

## Functional Requirements

FR1: Users can define epics from planning inputs.
FR2: The document should preserve the template tail.

## Non-Functional Requirements

NFR1: Artifact generation must be deterministic.

## Domain-Specific Requirements

DSR1: Planning artifacts must stay inside the configured output folder.

## Roadmap

1. Draft epics
2. Review coverage
`,
	)
	await fs.writeFile(uiSpecPath, "# UI Spec\n\nUI notes.\n")
	await fs.writeFile(uxSpecPath, "# UX Spec\n\nUX notes.\n")

	if (options?.preexistingArtifact !== undefined) {
		await fs.mkdir(path.dirname(artifactPath), { recursive: true })
		await fs.writeFile(artifactPath, options.preexistingArtifact)
	}

	return {
		repoDir,
		architectureRelativePath,
		prdRelativePath,
		uiSpecRelativePath,
		uxSpecRelativePath,
		artifactPath,
	}
}

async function createBuildEpicDeliverySpecRepo(options?: {
	includeWorkflowConfig?: boolean
	preexistingArtifact?: string
	omitRequiredSection?: "Objective" | "Description" | "Success Measures" | "Scope" | "Scope Boundary"
	selectedEpicMissing?: boolean
}) {
	const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), "build-epic-delivery-spec-"))
	const workflowConfigPath = getCanonicalWorkflowConfigPath(repoDir)
	const includeWorkflowConfig = options?.includeWorkflowConfig !== false
	const epicsRelativePath = "docs/epics.md"
	const epicsPath = path.join(repoDir, epicsRelativePath)
	const templatePath = path.join(repoDir, ".cline", "skills", "create-epics", "epic-delivery-spec-template.md")
	const artifactPath = path.join(repoDir, "planning", "implementation-artifacts", "epic-3-delivery-spec.md")

	if (includeWorkflowConfig) {
		await fs.mkdir(path.dirname(workflowConfigPath), { recursive: true })
		await fs.writeFile(workflowConfigPath, ['output_folder: "planning"', ""].join("\n"))
	}

	await fs.mkdir(path.dirname(templatePath), { recursive: true })
	await fs.writeFile(
		templatePath,
		`# Epic Name

### Epic #: Epic_Name

#### Objective
As a Product Owner
I want
So that

#### Description


#### Success Measures


#### Scope


#### Scope Boundary

# User Stories

## Story #
<!-- Repeat this block for each epic -->

### Objective
As a
I want
so that

### Acceptance Criteria

### Sequencing/ Dependencies
`,
	)

	const epicThreeSections = [
		options?.omitRequiredSection === "Objective" ? undefined : "#### Objective\nDeliver checkout.\n",
		options?.omitRequiredSection === "Description" ? undefined : "#### Description\nDetailed checkout description.\n",
		options?.omitRequiredSection === "Success Measures" ? undefined : "#### Success Measures\n- Conversion improves.\n",
		options?.omitRequiredSection === "Scope" ? undefined : "#### Scope\n- Checkout flow.\n",
		options?.omitRequiredSection === "Scope Boundary" ? undefined : "#### Scope Boundary\n- No post-purchase changes.\n",
	]
		.filter((section): section is string => typeof section === "string")
		.join("\n")

	await fs.mkdir(path.dirname(epicsPath), { recursive: true })
	await fs.writeFile(
		epicsPath,
		`# Epics

### Epic List

### Epic 2: Catalog

### Epic 3: Checkout
${options?.selectedEpicMissing === true ? "" : `\n${epicThreeSections}`}
`,
	)

	if (options?.preexistingArtifact !== undefined) {
		await fs.mkdir(path.dirname(artifactPath), { recursive: true })
		await fs.writeFile(artifactPath, options.preexistingArtifact)
	}

	return {
		repoDir,
		epicsRelativePath,
		epicsPath,
		templatePath,
		artifactPath,
	}
}

async function createBuildStoryDocumentRepo(options?: {
	includeWorkflowConfig?: boolean
	omitStoryTemplate?: boolean
	preexistingArtifact?: string
	omitRequiredSection?: "Objective" | "Acceptance Criteria" | "Sequencing/ Dependencies"
	selectedStoryMissing?: boolean
}) {
	const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), "build-story-document-"))
	const workflowConfigPath = getCanonicalWorkflowConfigPath(repoDir)
	const includeWorkflowConfig = options?.includeWorkflowConfig !== false
	const epicDeliverySpecRelativePath = "planning/implementation-artifacts/epic-3-delivery-spec.md"
	const epicDeliverySpecPath = path.join(repoDir, epicDeliverySpecRelativePath)
	const templatePath = path.join(repoDir, ".cline", "skills", "bmad-create-story", "template.md")
	const artifactPath = path.join(repoDir, "planning", "implementation-artifacts", "story3.2.md")

	if (includeWorkflowConfig) {
		await fs.mkdir(path.dirname(workflowConfigPath), { recursive: true })
		const workflowConfigLines = ['output_folder: "planning"']
		if (options?.omitStoryTemplate !== true) {
			workflowConfigLines.push('story_template: "{project-root}/.cline/skills/bmad-create-story/template.md"')
		}
		workflowConfigLines.push("")
		await fs.writeFile(workflowConfigPath, workflowConfigLines.join("\n"))
	}

	await fs.mkdir(path.dirname(templatePath), { recursive: true })
	await fs.writeFile(
		templatePath,
		`# Story {{epic_num}}.{{story_num}}

Status: backlog

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 
I want 
so that

## Acceptance Criteria

## Sequencing / Dependencies

## Tasks / Subtasks

- [ ] Task 1 (AC: #)
  - [ ] Subtask 1.1
- [ ] Task 2 (AC: #)
  - [ ] Subtask 2.1

## Latest Review Findings

## Dev Notes

- Relevant architecture patterns and constraints
- Source tree components to touch
- Testing standards summary

### Project Structure Notes

- Alignment with unified project structure (paths, modules, naming)
- Detected conflicts or variances (with rationale)

### References

- Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]

## Dev Agent Record

### Debug Log References

### Completion Notes List

### File List
`,
	)

	const selectedStorySections = [
		options?.omitRequiredSection === "Objective"
			? undefined
			: "### Objective\nAs a release manager\nI want checkout instrumentation\nso that launch readiness stays visible\n",
		options?.omitRequiredSection === "Acceptance Criteria"
			? undefined
			: "### Acceptance Criteria\n- Capture checkout success rate.\n- Surface funnel drop-off by step.\n",
		options?.omitRequiredSection === "Sequencing/ Dependencies"
			? undefined
			: "### Sequencing/ Dependencies\n- Depends on Epic 3 platform telemetry hooks.\n- Follow Story 3.1 event contract rollout.\n",
	]
		.filter((section): section is string => typeof section === "string")
		.join("\n")

	await fs.mkdir(path.dirname(epicDeliverySpecPath), { recursive: true })
	await fs.writeFile(
		epicDeliverySpecPath,
		`# Epic 3 Delivery Spec

${options?.selectedStoryMissing === true ? "" : `## Story 3.2\n\n${selectedStorySections}\n`}
`,
	)

	if (options?.preexistingArtifact !== undefined) {
		await fs.mkdir(path.dirname(artifactPath), { recursive: true })
		await fs.writeFile(artifactPath, options.preexistingArtifact)
	}

	return {
		repoDir,
		epicDeliverySpecRelativePath,
		epicDeliverySpecPath,
		templatePath,
		artifactPath,
	}
}

async function createCaptureBrainstormingTopicRepo(options?: { outputFileContents?: string; outputFileRelativePath?: string }) {
	const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), "capture-brainstorming-topic-"))
	const outputFileRelativePath = options?.outputFileRelativePath ?? "planning/brainstorming/brainstorming-session.md"
	const artifactPath = path.join(repoDir, outputFileRelativePath)
	const outputFileContents =
		options?.outputFileContents ??
		`# Brainstorming Session Results

## Topic

## Selected Approach

## Selected Techniques

### Techniques Used

## Ideas Generated
`

	await fs.mkdir(path.dirname(artifactPath), { recursive: true })
	await fs.writeFile(artifactPath, outputFileContents)

	return {
		repoDir,
		artifactPath,
	}
}

async function createBrainstormingWorkflowRepo(options?: {
	existingSessions?: Array<{ fileName: string; contents?: string }>
	outputFolderRelativePath?: string
	outputFileContents?: string
	outputFileRelativePath?: string
	templateContents?: string
}) {
	const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), "brainstorming-workflow-tool-"))
	const outputFolderRelativePath = options?.outputFolderRelativePath ?? "planning"
	const outputFolder = path.join(repoDir, outputFolderRelativePath)
	const sessionDirectory = path.join(outputFolder, "brainstorming")
	const templatePath = path.join(repoDir, ".cline", "skills", "bmad-brainstorming", "template.md")
	const csvPath = path.join(repoDir, ".cline", "skills", "bmad-brainstorming", "brain-methods.csv")

	await fs.mkdir(path.dirname(templatePath), { recursive: true })
	await fs.writeFile(
		templatePath,
		options?.templateContents ??
			`# Brainstorming Session Results

## Topic

## Selected Approach

## Selected Techniques

### Techniques Used

## Ideas Generated
`,
	)
	await fs.writeFile(
		csvPath,
		[
			"category,technique_name,description",
			"creative,Reverse Brainstorming,Generate problems before solutions.",
			"structured,Six Thinking Hats,Explore the problem through six perspectives.",
			"",
		].join("\n"),
	)

	if (options?.existingSessions?.length) {
		await fs.mkdir(sessionDirectory, { recursive: true })
		for (const session of options.existingSessions) {
			await fs.writeFile(path.join(sessionDirectory, session.fileName), session.contents ?? "# existing\n", "utf8")
		}
	}

	const outputFileRelativePath = options?.outputFileRelativePath
	if (outputFileRelativePath) {
		const outputFilePath = path.join(repoDir, outputFileRelativePath)
		await fs.mkdir(path.dirname(outputFilePath), { recursive: true })
		await fs.writeFile(
			outputFilePath,
			options?.outputFileContents ??
				`# Brainstorming Session Results

## Topic

## Selected Approach

## Selected Techniques

### Techniques Used

## Ideas Generated
`,
		)
	}

	return {
		repoDir,
		outputFolder,
		sessionDirectory,
		templatePath,
		csvPath,
	}
}

async function createBuildTechSpecDocumentRepo(options?: {
	includeWorkflowConfig?: boolean
	preexistingArtifact?: string
	title?: string
	templateOverride?: string
}) {
	const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), "build-tech-spec-document-"))
	const workflowConfigPath = getCanonicalWorkflowConfigPath(repoDir)
	const includeWorkflowConfig = options?.includeWorkflowConfig !== false
	const templatePath = path.join(repoDir, ".cline", "skills", "bmad-quick-spec", "tech-spec-template.md")
	const artifactPath = path.join(repoDir, "planning", "implementation-artifacts", "tech-spec-wip.md")
	const title = options?.title ?? "Quick Spec Workflow"

	if (includeWorkflowConfig) {
		await fs.mkdir(path.dirname(workflowConfigPath), { recursive: true })
		await fs.writeFile(
			workflowConfigPath,
			['implementation_artifacts: "{project-root}/planning/implementation-artifacts"', ""].join("\n"),
		)
	}

	await fs.mkdir(path.dirname(templatePath), { recursive: true })
	await fs.writeFile(
		templatePath,
		options?.templateOverride ??
			`---
title: '{title}'
slug: '{slug}'
created: '{date}'
status: 'backlog'
stepsCompleted: []
tech_stack: []
files_to_modify: []
code_patterns: []
test_patterns: []
---

# Tech-Spec: {title}

Created: 

## Overview

### Problem Statement

### Solution

### Scope

#### In Scope

#### Out of Scope

## Context for Development

### Codebase Patterns

### Files to Reference

### Technical Decisions

## Implementation Plan

### Acceptance Criteria

### Implementation Seams

### Tasks


## Latest Review Findings
`,
	)

	if (options?.preexistingArtifact !== undefined) {
		await fs.mkdir(path.dirname(artifactPath), { recursive: true })
		await fs.writeFile(artifactPath, options.preexistingArtifact)
	}

	return {
		repoDir,
		templatePath,
		artifactPath,
		title,
	}
}

async function createCodeReviewSpecUpdateRepo() {
	const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), "code-review-spec-update-"))
	const specFilePath = path.join(repoDir, "docs", "story.md")
	const reviewInputPath = path.join(repoDir, "_bmad-output", "review-input.md")

	await fs.mkdir(path.dirname(specFilePath), { recursive: true })
	await fs.mkdir(path.dirname(reviewInputPath), { recursive: true })

	await fs.writeFile(
		specFilePath,
		`# Story 3.2: Review Input Artifact
Status: review

## Latest Review Findings
- Previous review finding

## Tasks / Subtasks
- [ ] Existing story task
- [ ] Carry-forward remediation task
`,
	)

	await fs.writeFile(
		reviewInputPath,
		`# Story 3.2: Review Input Artifact
Status: ready-for-dev

## Latest Review Findings
- Review finding one
- Review finding two

## Tasks / Subtasks
- [ ] Carry-forward remediation task
- [ ] New remediation task
`,
	)

	return {
		repoDir,
		specFilePath,
		reviewInputPath,
	}
}

function getTopLevelSectionBody(markdown: string, heading: string): string {
	const lines = markdown.replace(/\r\n/g, "\n").split("\n")
	const start = lines.findIndex((line) => line === heading)
	if (start === -1) {
		return ""
	}

	let end = lines.length
	for (let i = start + 1; i < lines.length; i++) {
		if (/^##\s+/.test(lines[i])) {
			end = i
			break
		}
	}

	return lines
		.slice(start + 1, end)
		.join("\n")
		.trim()
}

describe("Managed workflow handlers", () => {
	it("allows attempt_completion to succeed even while a managed workflow still has incomplete items", async () => {
		const handler = new AttemptCompletionHandler()
		const config = createConfig()
		config.taskState.managedWorkflowRun = createManagedWorkflowRun()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "attempt_completion",
			params: {
				result: "done",
			},
			partial: false,
		} as any)

		expect(String(result)).to.equal(RESPONSE_TOOL_SUCCESS_MESSAGE)
		expect((config.callbacks.say as sinon.SinonStub).calledWith("completion_result", "done")).to.equal(true)
		expect((config.callbacks.ask as sinon.SinonStub).notCalled).to.equal(true)
		expect(config.taskState.consecutiveMistakeCount).to.equal(0)
	})

	it("allows attempt_completion once all required managed workflow items are complete", async () => {
		const handler = new AttemptCompletionHandler()
		const config = createConfig()
		const run = createManagedWorkflowRun()
		run.allRequiredComplete = true
		run.status = "completed"
		run.phases[0].completed = true
		run.phases[0].items = [
			...run.phases[0].items.map((item) => ({ ...item, completed: true })),
			{
				id: "step-01-gather-context::item-3",
				label: "Optional next step",
				sourceText: "Optional next step",
				completed: false,
				required: false,
				advisory: true,
			},
		]
		config.taskState.managedWorkflowRun = run

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "attempt_completion",
			params: {
				result: "done",
			},
			partial: false,
		} as any)

		expect(String(result)).to.not.contain("Managed workflow")
		expect(String(result)).to.equal(RESPONSE_TOOL_SUCCESS_MESSAGE)
		expect(config.taskState.consecutiveMistakeCount).to.equal(0)
		expect(config.taskState.responseToolTurnShouldEnd).to.equal(true)
		expect(config.taskState.responseToolTurnCompletedBy).to.equal("attempt_completion")
		expect((config.callbacks.say as sinon.SinonStub).calledWith("completion_result", "done")).to.equal(true)
		expect((config.callbacks.ask as sinon.SinonStub).notCalled).to.equal(true)
	})

	it("ends the task cleanly for managed workflow completion even when attempt_completion includes a command", async () => {
		const handler = new AttemptCompletionHandler()
		const config = createConfig()
		const run = createManagedWorkflowRun()
		run.allRequiredComplete = true
		run.status = "completed"
		run.phases[0].completed = true
		run.phases[0].items = run.phases[0].items.map((item) => ({ ...item, completed: true }))
		config.taskState.managedWorkflowRun = run

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "attempt_completion",
			params: {
				result: "done",
				command: "git status --short",
			},
			partial: false,
		} as any)

		expect(String(result)).to.equal(RESPONSE_TOOL_SUCCESS_MESSAGE)
		expect(config.taskState.responseToolTurnShouldEnd).to.equal(true)
		expect(config.taskState.responseToolTurnCompletedBy).to.equal("attempt_completion")
		expect(
			(config.callbacks.executeCommandTool as sinon.SinonStub).calledWith("git status --short", undefined, {
				suppressBlockingAsk: true,
			}),
		).to.equal(true)
		expect((config.callbacks.ask as sinon.SinonStub).notCalled).to.equal(true)
	})

	it("persists managed workflow item completion to task metadata", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new CompleteWorkflowItemToolHandler()
			const config = createConfig({ isSubagentExecution: false })
			config.taskState.managedWorkflowRun = createManagedWorkflowRun()
			config.taskState.activeWorkflowId = "bmad-code-review"

			const metadata = { activeWorkflowId: "bmad-code-review" } as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			await handler.execute(config, {
				type: "tool_use",
				name: "complete_workflow_item",
				params: {
					item_id: "step-01-gather-context::item-1",
				},
				partial: false,
			} as any)

			expect(config.taskState.managedWorkflowRun?.phases[0].items[0].completed).to.equal(true)
			expect(getMetadataStub.calledOnce).to.equal(true)
			expect(saveMetadataStub.calledOnce).to.equal(true)
			const [, savedMetadata] = saveMetadataStub.firstCall.args
			expect(savedMetadata.managedWorkflowRun).to.exist
			expect(savedMetadata.managedWorkflowRun?.phases[0].items[0].completed).to.equal(true)
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnce).to.equal(true)

			const restoredRun = savedMetadata.managedWorkflowRun
			expect(restoredRun).to.exist
			expect(restoredRun?.workflowId).to.equal("bmad-code-review")
			expect(restoredRun?.phases[0].items[0].completed).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("keeps managed workflow item completion subagent-local without overwriting parent metadata", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new CompleteWorkflowItemToolHandler()
			const config = createConfig()
			config.taskState.managedWorkflowRun = createManagedWorkflowRun()
			config.taskState.activeWorkflowId = "bmad-code-review"

			const parentMetadata = {
				activeWorkflowId: "parent-workflow",
				managedWorkflowRun: { workflowId: "parent-run" },
			} as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(parentMetadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			await handler.execute(config, {
				type: "tool_use",
				name: "complete_workflow_item",
				params: {
					item_id: "step-01-gather-context::item-1",
				},
				partial: false,
			} as any)

			expect(config.taskState.managedWorkflowRun?.phases[0].items[0].completed).to.equal(true)
			expect(getMetadataStub.called).to.equal(false)
			expect(saveMetadataStub.called).to.equal(false)
			expect(parentMetadata.activeWorkflowId).to.equal("parent-workflow")
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("resolves checkpoint items through the complete_workflow_item handler without requiring attempt_completion", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new CompleteWorkflowItemToolHandler()
			const config = createConfig()
			config.taskState.managedWorkflowRun = {
				workflowId: "bmad-code-review",
				slashCommand: "bmad-code-review",
				status: "active",
				currentPhaseIndex: 0,
				createdAt: Date.now(),
				updatedAt: Date.now(),
				allRequiredComplete: false,
				phases: [
					{
						id: "step-01-gather-context",
						title: "Gather Context",
						sourcePath: ".cline/skills/bmad-code-review/steps/step-01-gather-context.md",
						sourceContent: "# Step 1",
						completed: false,
						items: [
							{
								id: "step-01-gather-context::item-1",
								label: "Load context",
								sourceText: "Load context",
								completed: true,
							},
							{
								id: "step-01-gather-context::checkpoint",
								label: "Confirm the summary",
								sourceText: "Confirm the summary",
								completed: false,
								blocked: true,
							},
						],
					},
				],
			}
			config.taskState.activeWorkflowId = "bmad-code-review"

			const metadata = { activeWorkflowId: "bmad-code-review" } as any
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "complete_workflow_item",
				params: {
					item_id: "step-01-gather-context::checkpoint",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('Marked checkpoint "step-01-gather-context::checkpoint" complete.')
			expect(String(result)).to.contain("All required workflow phases are complete.")
			expect(config.taskState.managedWorkflowRun?.phases[0].items[1].completed).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("persists managed workflow placeholders to task metadata", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new SetWorkflowPlaceholdersToolHandler()
			const config = createConfig({ isSubagentExecution: false })
			config.taskState.managedWorkflowRun = createManagedWorkflowRun()
			config.taskState.activeWorkflowId = "bmad-code-review"

			const metadata = { activeWorkflowId: "bmad-code-review" } as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "set_workflow_placeholders",
				params: {
					values: {
						research_topic: "token resolution",
						validation_report_path: "reports/validation.md",
					},
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("Stored 2 workflow placeholders")
			expect(getMetadataStub.calledOnce).to.equal(true)
			expect(saveMetadataStub.calledOnce).to.equal(true)
			expect(config.taskState.managedWorkflowRun?.dynamicPlaceholders).to.deep.equal({
				research_topic: "token resolution",
				validation_report_path: "reports/validation.md",
			})
			expect(config.taskState.managedWorkflowRun?.updatedAt).to.be.greaterThan(0)
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("keeps workflow placeholder updates subagent-local without overwriting parent metadata", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new SetWorkflowPlaceholdersToolHandler()
			const config = createConfig()
			config.taskState.activePlaceholderWorkflowId = "dev-story"

			const parentMetadata = {
				activeWorkflowId: "parent-workflow",
				activePlaceholderWorkflowId: "parent-placeholder",
				activePlaceholderWorkflowValues: { story_path: "parent.md" },
			} as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(parentMetadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "set_workflow_placeholders",
				params: {
					values: {
						research_topic: "workflow gating",
						report_path: "docs/workflow-gating.md",
					},
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("Stored 2 workflow placeholders")
			expect(config.taskState.activePlaceholderWorkflowValues).to.deep.equal({
				research_topic: "workflow gating",
				report_path: "docs/workflow-gating.md",
			})
			expect(getMetadataStub.called).to.equal(false)
			expect(saveMetadataStub.called).to.equal(false)
			expect(parentMetadata.activePlaceholderWorkflowId).to.equal("parent-placeholder")
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("treats duplicate managed workflow placeholder values as a no-op", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new SetWorkflowPlaceholdersToolHandler()
			const config = createConfig()
			const run = createManagedWorkflowRun()
			run.dynamicPlaceholders = {
				research_topic: "token resolution",
				validation_report_path: "reports/validation.md",
			}
			run.updatedAt = 123
			config.taskState.managedWorkflowRun = run
			config.taskState.activeWorkflowId = "bmad-code-review"

			const getMetadataStub = sandbox
				.stub(disk, "getTaskMetadata")
				.resolves({ activeWorkflowId: "bmad-code-review" } as any)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "set_workflow_placeholders",
				params: {
					values: {
						research_topic: "token resolution",
						validation_report_path: "reports/validation.md",
					},
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("No workflow placeholder values changed")
			expect(String(result)).to.contain("Do not call set_workflow_placeholders again")
			expect(getMetadataStub.called).to.equal(false)
			expect(saveMetadataStub.called).to.equal(false)
			expect(config.taskState.managedWorkflowRun?.dynamicPlaceholders).to.deep.equal({
				research_topic: "token resolution",
				validation_report_path: "reports/validation.md",
			})
			expect(config.taskState.managedWorkflowRun?.updatedAt).to.equal(123)
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).called).to.equal(false)
		} finally {
			sandbox.restore()
		}
	})

	it("treats stable managed workflow placeholder values as already available", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new SetWorkflowPlaceholdersToolHandler()
			const config = createConfig()
			const run = createManagedWorkflowRun()
			run.stablePlaceholders = {
				project_name: "cline",
				user_name: "Rob",
			}
			run.updatedAt = 123
			config.taskState.managedWorkflowRun = run
			config.taskState.activeWorkflowId = "bmad-code-review"

			const getMetadataStub = sandbox
				.stub(disk, "getTaskMetadata")
				.resolves({ activeWorkflowId: "bmad-code-review" } as any)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "set_workflow_placeholders",
				params: {
					values: {
						project_name: "cline",
						user_name: "Rob",
					},
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("Success: workflow placeholder values were already available")
			expect(String(result)).to.contain("project_name, user_name")
			expect(getMetadataStub.called).to.equal(false)
			expect(saveMetadataStub.called).to.equal(false)
			expect(config.taskState.managedWorkflowRun?.dynamicPlaceholders).to.equal(undefined)
			expect(config.taskState.managedWorkflowRun?.updatedAt).to.equal(123)
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).called).to.equal(false)
		} finally {
			sandbox.restore()
		}
	})

	it("round-trips managed workflow placeholder state through task metadata save and reload", async () => {
		const tempGlobalStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), "managed-workflow-metadata-"))
		try {
			const handler = new SetWorkflowPlaceholdersToolHandler()
			const config = createConfig({
				taskId: "task-managed-workflow-metadata",
				isSubagentExecution: false,
			})
			config.taskState.managedWorkflowRun = {
				...createManagedWorkflowRun(),
				stablePlaceholders: {
					project_name: "Cline",
					communication_language: "English",
				},
				dynamicPlaceholders: {
					research_topic: "token resolution",
				},
			}
			config.taskState.activeWorkflowId = "bmad-code-review"

			setVscodeHostProviderMock({
				globalStorageFsPath: tempGlobalStorageDir,
			})

			await handler.execute(config, {
				type: "tool_use",
				name: "set_workflow_placeholders",
				params: {
					values: {
						validation_report_path: "reports/validation.md",
					},
				},
				partial: false,
			} as any)

			const reloadedMetadata = await disk.getTaskMetadata(config.taskId)
			expect(reloadedMetadata.managedWorkflowRun).to.exist
			expect(reloadedMetadata.managedWorkflowRun?.stablePlaceholders).to.deep.equal({
				project_name: "Cline",
				communication_language: "English",
			})
			expect(reloadedMetadata.managedWorkflowRun?.dynamicPlaceholders).to.deep.equal({
				research_topic: "token resolution",
				validation_report_path: "reports/validation.md",
			})
		} finally {
			await fs.rm(tempGlobalStorageDir, { recursive: true, force: true })
			HostProvider.reset()
		}
	})

	it("persists placeholders for active non-managed workflows", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new SetWorkflowPlaceholdersToolHandler()
			const config = createConfig({ isSubagentExecution: false })
			config.taskState.activePlaceholderWorkflowId = "dev-story"

			const metadata = { activeWorkflowId: "dev-story" } as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "set_workflow_placeholders",
				params: {
					values: {
						research_topic: "workflow gating",
						report_path: "docs/workflow-gating.md",
					},
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("Stored 2 workflow placeholders")
			expect(getMetadataStub.calledOnce).to.equal(true)
			expect(saveMetadataStub.calledOnce).to.equal(true)
			expect(config.taskState.managedWorkflowRun).to.equal(undefined)
			expect(config.taskState.activePlaceholderWorkflowValues).to.deep.equal({
				research_topic: "workflow gating",
				report_path: "docs/workflow-gating.md",
			})
			expectPlaceholderWorkflowGuidance(String(result))
		} finally {
			sandbox.restore()
		}
	})

	it("accepts native serialized values payloads for active non-managed workflows", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new SetWorkflowPlaceholdersToolHandler()
			const config = createConfig({ isSubagentExecution: false })
			config.taskState.activePlaceholderWorkflowId = "dev-story"

			const metadata = { activeWorkflowId: "dev-story" } as any
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "set_workflow_placeholders",
				params: {
					values: JSON.stringify({
						story_path: "docs/story.md",
						project_context: "docs/project-context.md",
					}),
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("Stored 2 workflow placeholders")
			expect(config.taskState.activePlaceholderWorkflowValues).to.deep.equal({
				story_path: "docs/story.md",
				project_context: "docs/project-context.md",
			})
		} finally {
			sandbox.restore()
		}
	})

	it("normalizes relative artifact placeholders to absolute paths for active non-managed workflows", async () => {
		const sandbox = sinon.createSandbox()
		const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), "placeholder-artifact-normalization-"))
		try {
			const handler = new SetWorkflowPlaceholdersToolHandler()
			const config = createConfig({ cwd: repoDir, isSubagentExecution: false })
			config.taskState.activePlaceholderWorkflowId = "code-review.md"

			const metadata = { activeWorkflowId: "code-review.md" } as any
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "set_workflow_placeholders",
				params: {
					values: {
						review_input: "_bmad-output/review_input.md",
						diff_output: "_bmad-output/review-input.diff",
					},
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("Stored 2 workflow placeholders")
			expect(config.taskState.activePlaceholderWorkflowValues).to.deep.equal({
				review_input: path.join(repoDir, "_bmad-output", "review_input.md"),
				diff_output: path.join(repoDir, "_bmad-output", "review-input.diff"),
			})
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
			sandbox.restore()
		}
	})

	it("uses placeholder-workflow-specific no-op guidance for active non-managed workflows", async () => {
		const handler = new SetWorkflowPlaceholdersToolHandler()
		const config = createConfig()
		config.taskState.activePlaceholderWorkflowId = "dev-story"
		config.taskState.activePlaceholderWorkflowValues = {
			story_path: "docs/story.md",
		}

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "set_workflow_placeholders",
			params: {
				values: {
					story_path: "docs/story.md",
				},
			},
			partial: false,
		} as any)

		expect(String(result)).to.contain("No workflow placeholder values changed")
		expect(String(result)).to.contain("Do not call set_workflow_placeholders again unless one of those values changes.")
		expectPlaceholderWorkflowGuidance(String(result))
		expect(String(result)).to.not.contain("complete_workflow_item")
		expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).called).to.equal(false)
	})

	it("reports workflow completion instead of a stale current phase on the final required item", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new CompleteWorkflowItemToolHandler()
			const config = createConfig({ isSubagentExecution: false })
			config.taskState.managedWorkflowRun = createManagedWorkflowRun()
			config.taskState.activeWorkflowId = "bmad-code-review"
			config.taskState.managedWorkflowRun.phases[0].items[0].completed = true

			const metadata = { activeWorkflowId: "bmad-code-review" } as any
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "complete_workflow_item",
				params: {
					item_id: "step-01-gather-context::item-2",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("All required workflow phases are complete.")
			expect(config.taskState.managedWorkflowRun?.currentPhaseIndex).to.equal(
				config.taskState.managedWorkflowRun?.phases.length,
			)
		} finally {
			sandbox.restore()
		}
	})

	it("activates managed workflow aliases through use_skill and persists the workflow run", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig({ isSubagentExecution: false })
			const metadata = {} as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "bmad-problem-solving",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('Managed workflow "bmad-cis-problem-solving" is now active')
			expect(config.taskState.managedWorkflowRun?.workflowId).to.equal("bmad-cis-problem-solving")
			expect(config.taskState.activeWorkflowId).to.equal("bmad-cis-problem-solving")
			expect((config.taskState as any).activeAgentId).to.equal(undefined)
			expect((config.taskState as any).activeAgentInvokedSlashCommand).to.equal(undefined)
			expect(getMetadataStub.calledOnce).to.equal(true)
			expect(saveMetadataStub.calledOnce).to.equal(true)
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("keeps managed workflow activation through use_skill subagent-local without overwriting parent metadata", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig()
			const parentMetadata = { activeWorkflowId: "parent-workflow" } as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(parentMetadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "bmad-problem-solving",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('Managed workflow "bmad-cis-problem-solving" is now active')
			expect(config.taskState.managedWorkflowRun?.workflowId).to.equal("bmad-cis-problem-solving")
			expect(config.taskState.activeWorkflowId).to.equal("bmad-cis-problem-solving")
			expect(getMetadataStub.called).to.equal(false)
			expect(saveMetadataStub.called).to.equal(false)
			expect(parentMetadata.activeWorkflowId).to.equal("parent-workflow")
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("resumes a managed workflow through use_skill when the same workflow is already active", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig()
			config.taskState.managedWorkflowRun = (
				await startOrResumeManagedWorkflowRun(config.cwd, "bmad-code-review", undefined, "bmad-code-review")
			).run
			config.taskState.activeWorkflowId = "bmad-code-review"
			config.taskState.activeWorkflowJustStarted = false
			const metadata = { activeWorkflowId: "bmad-code-review" } as any
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "bmad-code-review",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('Managed workflow "bmad-code-review" is active again')
			expect(config.taskState.activeWorkflowId).to.equal("bmad-code-review")
			expect(config.taskState.activeWorkflowJustStarted).to.equal(false)
		} finally {
			sandbox.restore()
		}
	})

	it("activates managed workflows on the current thread with no activeAgent writes", async () => {
		const handler = new UseSkillToolHandler()
		const config = createConfig({ isSubagentExecution: false })

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "use_skill",
			params: {
				skill_name: "bmad-code-review",
			},
			partial: false,
		} as any)

		expect(String(result)).to.contain('Managed workflow "bmad-code-review" is now active')
		expect(config.taskState.managedWorkflowRun?.workflowId).to.equal("bmad-code-review")
		expect(config.taskState.activeWorkflowId).to.equal("bmad-code-review")
		expect((config.taskState as any).activeAgentId).to.equal(undefined)
	})

	it("activates local workflows through use_skill", async () => {
		const sandbox = sinon.createSandbox()
		let tempDir: string | undefined
		try {
			tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-local-"))
			const workflowPath = path.join(tempDir, "local-review.md")
			await fs.writeFile(workflowPath, "# Local review\nInspect the staged diff.", "utf8")
			const metadata = {} as any
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const handler = new UseSkillToolHandler()
			const config = createConfig({
				cwd: tempDir,
				isSubagentExecution: false,
				services: {
					stateManager: {
						getGlobalStateKey: () => ({}),
						getGlobalSettingsKey: (key: string) => (key === "globalWorkflowToggles" ? {} : undefined),
						getWorkspaceStateKey: (key: string) => (key === "workflowToggles" ? { [workflowPath]: true } : undefined),
						getRemoteConfigSettings: () => ({}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "local-review.md",
				},
				partial: false,
			} as any)

			expectPlaceholderWorkflowActivationResult(String(result), 'Workflow "local-review.md"')
			expect(String(result)).to.not.contain("Inspect the staged diff.")
			expect(config.taskState.activeWorkflowId).to.equal(undefined)
			expect(config.taskState.activePlaceholderWorkflowId).to.equal("local-review.md")
			expect(config.taskState.activePlaceholderWorkflowSource).to.include({
				type: "local",
				name: "local-review.md",
				path: workflowPath,
			})
			expect(config.taskState.activePlaceholderWorkflowSource?.configPath).to.be.a("string")
			expect(config.taskState.activePlaceholderWorkflowSource?.configPath).to.contain(".cline")
			expect(config.taskState.activePlaceholderWorkflowSource?.configPath).to.contain("workflow-config.yaml")
			expect(config.taskState.activeWorkflowJustStarted).to.equal(true)
			expect(saveMetadataStub.calledOnce).to.equal(true)
			const savedSource = saveMetadataStub.firstCall.args[1].activePlaceholderWorkflowSource
			expect(savedSource).to.exist
			if (!savedSource) {
				throw new Error("expected activePlaceholderWorkflowSource to be persisted")
			}
			expect(savedSource).to.include({
				type: "local",
				name: "local-review.md",
				path: workflowPath,
			})
			expect(savedSource.configPath).to.be.a("string")
			expect(savedSource.configPath).to.contain(".cline")
			expect(savedSource.configPath).to.contain("workflow-config.yaml")
		} finally {
			sandbox.restore()
			if (tempDir) {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		}
	})

	it("keeps placeholder workflow activation through use_skill subagent-local without overwriting parent metadata", async () => {
		const sandbox = sinon.createSandbox()
		let tempDir: string | undefined
		try {
			tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-subagent-local-"))
			const workflowPath = path.join(tempDir, "local-review.md")
			await fs.writeFile(workflowPath, "# Local review\nInspect the staged diff.", "utf8")
			const parentMetadata = {
				activePlaceholderWorkflowId: "parent-placeholder",
				activePlaceholderWorkflowSource: { type: "remote", name: "parent" },
			} as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(parentMetadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const handler = new UseSkillToolHandler()
			const config = createConfig({
				services: {
					stateManager: {
						getGlobalStateKey: () => ({}),
						getGlobalSettingsKey: (key: string) => (key === "globalWorkflowToggles" ? {} : undefined),
						getWorkspaceStateKey: (key: string) => (key === "workflowToggles" ? { [workflowPath]: true } : undefined),
						getRemoteConfigSettings: () => ({}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "local-review.md",
				},
				partial: false,
			} as any)

			expectPlaceholderWorkflowActivationResult(String(result), 'Workflow "local-review.md"')
			expect(config.taskState.activePlaceholderWorkflowId).to.equal("local-review.md")
			expect(getMetadataStub.called).to.equal(false)
			expect(saveMetadataStub.called).to.equal(false)
			expect(parentMetadata.activePlaceholderWorkflowId).to.equal("parent-placeholder")
		} finally {
			sandbox.restore()
			if (tempDir) {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		}
	})

	it("seeds a placeholder checklist through use_skill when the workflow exposes step headings", async () => {
		const sandbox = sinon.createSandbox()
		let tempDir: string | undefined
		try {
			tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-local-checklist-"))
			const workflowPath = path.join(tempDir, "local-review.md")
			await fs.writeFile(
				workflowPath,
				`# Local review

## Step 1: Gather Context
Inspect the scoped story before asking follow-up questions.

## Step 2: Review
Inspect the prepared review input and write findings.`,
				"utf8",
			)
			sandbox.stub(disk, "getTaskMetadata").resolves({} as any)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const handler = new UseSkillToolHandler()
			const config = createConfig({
				services: {
					stateManager: {
						getGlobalStateKey: () => ({}),
						getGlobalSettingsKey: (key: string) => (key === "globalWorkflowToggles" ? {} : undefined),
						getWorkspaceStateKey: (key: string) => (key === "workflowToggles" ? { [workflowPath]: true } : undefined),
						getRemoteConfigSettings: () => ({}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})

			await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "local-review.md",
				},
				partial: false,
			} as any)

			expect(
				(config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnceWithExactly(
					"- [ ] Step 1: Gather Context\n- [ ] Step 2: Review",
				),
			).to.equal(true)
		} finally {
			sandbox.restore()
			if (tempDir) {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		}
	})

	it("computes stable placeholders for placeholder workflows through use_skill and persists them", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-local-stable-"))
		const workflowPath = path.join(tempDir, ".cline", "skills", "custom-review", "custom-review.md")
		const manifestPath = path.join(tempDir, "_bmad", "_config", "skill-manifest.csv")
		const configPath = getCanonicalWorkflowConfigPath(tempDir)
		await fs.mkdir(path.dirname(workflowPath), { recursive: true })
		await fs.mkdir(path.dirname(manifestPath), { recursive: true })
		await fs.mkdir(path.dirname(configPath), { recursive: true })
		await fs.writeFile(workflowPath, "# Custom review\nRespond in {communication_language} from {config_source}.", "utf8")
		await fs.writeFile(
			manifestPath,
			[
				"canonicalId,name,description,module,path,install_to_bmad",
				'"custom-review","custom-review","Custom review workflow","bmm","_bmad/bmm/workflows/custom-review/SKILL.md","true"',
			].join("\n"),
			"utf8",
		)
		await fs.writeFile(configPath, 'communication_language: "English"\n', "utf8")
		sandbox.stub(disk, "getTaskMetadata").resolves({} as any)
		const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig({
				cwd: tempDir,
				isSubagentExecution: false,
				services: {
					stateManager: {
						getGlobalStateKey: () => ({}),
						getGlobalSettingsKey: (key: string) => (key === "globalWorkflowToggles" ? {} : undefined),
						getWorkspaceStateKey: (key: string) => (key === "workflowToggles" ? { [workflowPath]: true } : undefined),
						getRemoteConfigSettings: () => ({}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "custom-review.md",
				},
				partial: false,
			} as any)

			expectPlaceholderWorkflowActivationResult(String(result), 'Workflow "custom-review.md"')
			expect(String(result)).to.not.contain("Respond in English from .cline/workflow-config.yaml.")
			expect(config.taskState.activePlaceholderWorkflowSource).to.deep.equal({
				type: "local",
				name: "custom-review.md",
				path: workflowPath,
				configPath,
			})
			expect(config.taskState.activePlaceholderWorkflowStableValues).to.include({
				communication_language: "English",
				config_source: ".cline/workflow-config.yaml",
			})
			expect(saveMetadataStub.calledOnce).to.equal(true)
			expect(saveMetadataStub.firstCall.args[1].activePlaceholderWorkflowStableValues).to.include({
				communication_language: "English",
				config_source: ".cline/workflow-config.yaml",
			})
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("activates global workflows through use_skill when no local workflow shadows them", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-global-"))
		const workflowPath = path.join(tempDir, "global-review.md")
		await fs.writeFile(workflowPath, "# Global review\nReview the release notes.", "utf8")
		sandbox.stub(disk, "getTaskMetadata").resolves({} as any)
		const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig({
				isSubagentExecution: false,
				services: {
					stateManager: {
						getGlobalStateKey: () => ({}),
						getGlobalSettingsKey: (key: string) =>
							key === "globalWorkflowToggles" ? { [workflowPath]: true } : undefined,
						getWorkspaceStateKey: () => ({}),
						getRemoteConfigSettings: () => ({}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "global-review.md",
				},
				partial: false,
			} as any)

			expectPlaceholderWorkflowActivationResult(String(result), 'Workflow "global-review.md"')
			expect(String(result)).to.not.contain("Review the release notes.")
			expect(config.taskState.activeWorkflowId).to.equal(undefined)
			expect(config.taskState.activePlaceholderWorkflowId).to.equal("global-review.md")
			expect(config.taskState.activePlaceholderWorkflowSource).to.deep.equal({
				type: "global",
				name: "global-review.md",
				path: workflowPath,
				configPath: getCanonicalWorkflowConfigPath(process.cwd()),
			})
			expect(saveMetadataStub.calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("renders preserved dynamic placeholder values when re-activating the same local workflow through use_skill", async () => {
		const sandbox = sinon.createSandbox()
		let tempDir: string | undefined
		try {
			tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-local-rendered-"))
			const workflowPath = path.join(tempDir, ".cline", "skills", "custom-review", "custom-review.md")
			const manifestPath = path.join(tempDir, "_bmad", "_config", "skill-manifest.csv")
			const configPath = getCanonicalWorkflowConfigPath(tempDir)
			await fs.mkdir(path.dirname(workflowPath), { recursive: true })
			await fs.mkdir(path.dirname(manifestPath), { recursive: true })
			await fs.mkdir(path.dirname(configPath), { recursive: true })
			await fs.writeFile(workflowPath, "# Local review\nReview {{story_id}} before continuing.", "utf8")
			await fs.writeFile(
				manifestPath,
				[
					"canonicalId,name,description,module,path,install_to_bmad",
					'"custom-review","custom-review","Custom review workflow","bmm","_bmad/bmm/workflows/custom-review/SKILL.md","true"',
				].join("\n"),
				"utf8",
			)
			await fs.writeFile(configPath, 'story_id: "1.0"\n', "utf8")
			sandbox.stub(disk, "getTaskMetadata").resolves({} as any)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const handler = new UseSkillToolHandler()
			const config = createConfig({
				cwd: tempDir,
				isSubagentExecution: false,
				services: {
					stateManager: {
						getGlobalStateKey: () => ({}),
						getGlobalSettingsKey: (key: string) => (key === "globalWorkflowToggles" ? {} : undefined),
						getWorkspaceStateKey: (key: string) => (key === "workflowToggles" ? { [workflowPath]: true } : undefined),
						getRemoteConfigSettings: () => ({}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})
			config.taskState.activePlaceholderWorkflowId = "custom-review.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "custom-review.md",
				path: workflowPath,
				configPath,
			}
			config.taskState.activePlaceholderWorkflowStableValues = {
				story_id: "1.0",
				config_source: ".cline/workflow-config.yaml",
			}
			config.taskState.activePlaceholderWorkflowValues = {
				story_id: "1.2",
			}
			config.taskState.currentFocusChainChecklist = "- [ ] Existing checklist item"

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "custom-review.md",
				},
				partial: false,
			} as any)

			expectPlaceholderWorkflowActivationResult(String(result), 'Workflow "custom-review.md"')
			expect(String(result)).to.not.contain("Review 1.2 before continuing.")
			expect(String(result)).to.not.contain("{{story_id}}")
			expect(config.taskState.activePlaceholderWorkflowStableValues).to.include({
				story_id: "1.0",
				config_source: ".cline/workflow-config.yaml",
			})
			expect(config.taskState.activePlaceholderWorkflowValues).to.deep.equal({
				story_id: "1.2",
			})
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).called).to.equal(false)
		} finally {
			sandbox.restore()
			if (tempDir) {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		}
	})

	it("activates remote workflows through use_skill", async () => {
		const sandbox = sinon.createSandbox()
		sandbox.stub(disk, "getTaskMetadata").resolves({} as any)
		const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()
		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig({
				isSubagentExecution: false,
				services: {
					stateManager: {
						getGlobalStateKey: (key: string) => (key === "remoteWorkflowToggles" ? {} : undefined),
						getGlobalSettingsKey: () => ({}),
						getWorkspaceStateKey: () => ({}),
						getRemoteConfigSettings: () => ({
							remoteGlobalWorkflows: [
								{ name: "remote-review", contents: "# Remote review\nCheck the config.", alwaysEnabled: true },
							],
						}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "remote-review",
				},
				partial: false,
			} as any)

			expectPlaceholderWorkflowActivationResult(String(result), 'Workflow "remote-review"')
			expect(String(result)).to.not.contain("Check the config.")
			expect(config.taskState.activeWorkflowId).to.equal(undefined)
			expect(config.taskState.activePlaceholderWorkflowId).to.equal("remote-review")
			expect(config.taskState.activePlaceholderWorkflowSource).to.deep.equal({
				type: "remote",
				name: "remote-review",
				contents: "# Remote review\nCheck the config.",
				configPath: getCanonicalWorkflowConfigPath(process.cwd()),
			})
			expect(saveMetadataStub.calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("activates placeholder workflows through use_skill with no activeAgent writes", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-placeholder-autobind-"))
		const managedWorkflowConfigPath = path.join(tempDir, "_bmad", "_config", "managed-workflows.json")
		await fs.mkdir(path.dirname(managedWorkflowConfigPath), { recursive: true })
		await fs.writeFile(
			managedWorkflowConfigPath,
			JSON.stringify([
				{
					workflowId: "bmad-code-review",
					slashCommand: "bmad-code-review",
					skillName: "bmad-code-review",
					module: "bmm",
					skillPath: ".cline/skills/bmad-code-review/SKILL.md",
					workflowPath: ".cline/skills/bmad-code-review/workflow.md",
					aliases: [],
					phaseRoots: [],
					checklistPath: null,
					supportsManagedExecution: true,
					strategyHints: [],
					extractionMode: "linear",
					primaryStepRange: null,
					packagedAssetPaths: [],
				},
			]),
			"utf8",
		)
		sandbox.stub(disk, "getTaskMetadata").resolves({} as any)
		const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()
		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig({
				cwd: tempDir,
				isSubagentExecution: false,
				services: {
					stateManager: {
						getGlobalStateKey: (key: string) => (key === "remoteWorkflowToggles" ? {} : undefined),
						getGlobalSettingsKey: () => ({}),
						getWorkspaceStateKey: () => ({}),
						getRemoteConfigSettings: () => ({
							remoteGlobalWorkflows: [
								{
									name: "code-review",
									contents: "# Placeholder code review\nInspect the implementation.",
									alwaysEnabled: true,
								},
							],
						}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "code-review",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('# Workflow "code-review" is now active')
			expect(String(result)).to.contain(
				"The workflow started successfully. Use the current checklist and current workflow step details to continue.",
			)
			expect(config.taskState.activePlaceholderWorkflowId).to.equal("code-review")
			expect((config.taskState as any).activeAgentId).to.equal(undefined)
			expect(saveMetadataStub.calledOnce).to.equal(true)
			expect((saveMetadataStub.firstCall.args[1] as any).activeAgentId).to.equal(undefined)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("builds and atomically replaces review-input.diff for a commit source", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, firstCommit, diffOutputPath } = await createReviewDiffRepo()

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildReviewDiffOutputToolHandler()
			const config = createConfig({ cwd: repoDir })

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_review_diff_output",
				params: {
					source: { type: "commit", commit: firstCommit },
				},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(true)
			expect(payload.diff_available).to.equal(true)
			expect(path.isAbsolute(payload.artifact_path)).to.equal(true)
			expect(config.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.include(diffOutputPath)

			const artifact = await fs.readFile(diffOutputPath, "utf8")
			expect(artifact).to.contain("# Review Diff Output")
			expect(artifact).to.contain("## Source")
			expect(artifact).to.contain("## Diff")
			expect(artifact).to.contain("diff --git")
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("does not write a new artifact when no diff content is available", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, firstCommit, secondCommit, diffOutputPath } = await createReviewDiffRepo()

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildReviewDiffOutputToolHandler()
			const config = createConfig({ cwd: repoDir })

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_review_diff_output",
				params: {
					source: { type: "commit_range", base: firstCommit, head: secondCommit },
					scoped_paths: ["src/in-scope.ts"],
				},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(false)
			expect(payload.diff_available).to.equal(false)
			expect(
				await fs
					.access(diffOutputPath)
					.then(() => true)
					.catch(() => false),
			).to.equal(false)
			expect(config.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.deep.equal([])
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires scoped_paths for worktree_head_scoped", async () => {
		const handler = new BuildReviewDiffOutputToolHandler()
		const config = createConfig()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "build_review_diff_output",
			params: {
				source: { type: "worktree_head_scoped" },
			},
			partial: false,
		} as any)

		expect(result).to.equal(
			'Error: scoped_paths is required and must contain at least one path when source.type is "worktree_head_scoped".',
		)
	})

	it("respects manual approval when auto-approval does not apply", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, firstCommit, diffOutputPath } = await createReviewDiffRepo()

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildReviewDiffOutputToolHandler()
			const config = createConfig({ cwd: repoDir, isSubagentExecution: false })
			;(config.callbacks.shouldAutoApproveToolWithPath as sinon.SinonStub).resolves(false)
			;(config.callbacks.ask as sinon.SinonStub).resolves({ response: "yesButtonClicked" })

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_review_diff_output",
				params: {
					source: { type: "commit", commit: firstCommit },
				},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(true)
			expect(
				await fs
					.access(diffOutputPath)
					.then(() => true)
					.catch(() => false),
			).to.equal(true)
			expect((config.callbacks.ask as sinon.SinonStub).calledOnce).to.equal(true)
			expect((config.callbacks.shouldAutoApproveToolWithPath as sinon.SinonStub).calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("returns toolDenied when manual approval rejects the write", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, firstCommit, diffOutputPath } = await createReviewDiffRepo()

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildReviewDiffOutputToolHandler()
			const config = createConfig({ cwd: repoDir, isSubagentExecution: false })
			;(config.callbacks.shouldAutoApproveToolWithPath as sinon.SinonStub).resolves(false)
			;(config.callbacks.ask as sinon.SinonStub).resolves({ response: "noButtonClicked" })

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_review_diff_output",
				params: {
					source: { type: "commit", commit: firstCommit },
				},
				partial: false,
			} as any)

			expect(result).to.equal(formatResponse.toolDenied())
			expect(
				await fs
					.access(diffOutputPath)
					.then(() => true)
					.catch(() => false),
			).to.equal(false)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("keeps subagent execution auto-approved and local-only", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, firstCommit, diffOutputPath } = await createReviewDiffRepo()

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildReviewDiffOutputToolHandler()
			const config = createConfig({ cwd: repoDir, isSubagentExecution: true })
			;(config.callbacks.shouldAutoApproveToolWithPath as sinon.SinonStub).resolves(false)

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_review_diff_output",
				params: {
					source: { type: "commit", commit: firstCommit },
				},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(true)
			expect(
				await fs
					.access(diffOutputPath)
					.then(() => true)
					.catch(() => false),
			).to.equal(true)
			expect((config.callbacks.ask as sinon.SinonStub).called).to.equal(false)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("builds and atomically replaces review-input.md from a story file and matching stable diff artifact", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, storyPath, reviewInputPath } = await createReviewInputRepo()

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildReviewInputToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowValues = { story_path: storyPath }

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_review_input",
				params: {},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(true)
			expect(payload.review_input_available).to.equal(true)
			expect(payload.recent_story_changes_detected).to.equal(true)
			expect(path.isAbsolute(payload.artifact_path)).to.equal(true)
			expect(config.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.include(reviewInputPath)

			const artifact = await fs.readFile(reviewInputPath, "utf8")
			expect(artifact).to.contain("# Story 3.2: Review Input Artifact")
			expect(artifact).to.contain("Status: review")
			expect(artifact).to.contain("## Acceptance Criteria")
			expect(artifact).to.contain("## Prior Review Findings")
			expect(artifact).to.contain("## Latest Review Findings")
			expect(artifact).to.contain("## Tasks / Subtasks")
			expect(artifact).to.contain("## Completion Notes")
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("returns the structured no-go result when diff_output does not identify recent changes to the story file", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, storyPath, reviewInputPath } = await createReviewInputRepo({ diffTouchesStory: false })

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildReviewInputToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowValues = { story_path: storyPath }

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_review_input",
				params: {},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(false)
			expect(payload.review_input_available).to.equal(false)
			expect(payload.recent_story_changes_detected).to.equal(false)
			expect(payload.reason).to.equal("diff_output does not identify recent changes to the story file.")
			expect(
				await fs
					.access(reviewInputPath)
					.then(() => true)
					.catch(() => false),
			).to.equal(false)
			expect(config.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.deep.equal([])
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("hard-errors when the provided story file lacks deterministic story structure", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, storyPath } = await createReviewInputRepo()

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)
			await fs.writeFile(
				storyPath,
				`# Not A Story

## Tasks / Subtasks
- [x] Missing deterministic structure
`,
			)

			const handler = new BuildReviewInputToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowValues = { story_path: storyPath }

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_review_input",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"The provided story file does not contain the required story structure for deterministic review-input generation.",
				),
			)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires story_path from merged placeholder state", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir } = await createReviewInputRepo()

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildReviewInputToolHandler()
			const config = createConfig({ cwd: repoDir })

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_review_input",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve workflow placeholder 'story_path' from the active placeholder workflow state.",
				),
			)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("builds and atomically replaces planning_artifacts/epics.md from the template and PRD sections when mode=new", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, architectureRelativePath, prdRelativePath, uiSpecRelativePath, uxSpecRelativePath, artifactPath } =
			await createBuildEpicsDocumentRepo({ preexistingArtifact: "# stale\n" })

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildEpicsDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-epics.md"
			config.taskState.activePlaceholderWorkflowValues = {
				mode: "new",
				architecture_document: architectureRelativePath,
				prd: prdRelativePath,
				ui_spec: uiSpecRelativePath,
				ux_spec: uxSpecRelativePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epics_document",
				params: {},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(true)
			expect(payload.mode).to.equal("new")
			expect(payload.output_file_available).to.equal(true)
			expect(payload.artifact_path).to.equal(artifactPath)
			expect(config.taskState.activePlaceholderWorkflowValues?.output_file).to.equal(artifactPath)
			expect(config.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.include(artifactPath)

			const artifact = await fs.readFile(artifactPath, "utf8")
			expect(artifact).to.contain("stepsCompleted: []")
			expect(artifact).to.contain(`Architecture: ${path.join(repoDir, architectureRelativePath)}`)
			expect(artifact).to.contain(`PRD: ${path.join(repoDir, prdRelativePath)}`)
			expect(artifact).to.contain("UI/UX:")
			expect(artifact).to.contain(`- ${path.join(repoDir, uiSpecRelativePath)}`)
			expect(artifact).to.contain(`- ${path.join(repoDir, uxSpecRelativePath)}`)
			expect(artifact).to.not.contain("inputDocuments:")
			expect(artifact).to.contain("### Functional Requirements")
			expect(artifact).to.contain("FR1:")
			expect(artifact).to.contain("### NonFunctional Requirements")
			expect(artifact).to.contain("NFR1:")
			expect(artifact).to.contain("### Additional Requirements")
			expect(artifact).to.contain("### UX Design Requirements")
			expect(artifact).to.contain("### Domain-Specific Requirements")
			expect(artifact).to.contain("## Roadmap")
			expect(artifact).to.contain("### FR Coverage Map")
			expect(artifact).to.contain("## Epic {{N}}: {{epic_title_N}}")
			expect(artifact).to.contain(
				`### Additional Requirements

### UX Design Requirements

### Domain-Specific Requirements`,
			)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("omits UI/UX frontmatter when optional workflow inputs are absent for build_epics_document", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, architectureRelativePath, prdRelativePath, artifactPath } = await createBuildEpicsDocumentRepo({
			preexistingArtifact: "# stale\n",
		})

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildEpicsDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-epics.md"
			config.taskState.activePlaceholderWorkflowValues = {
				mode: "new",
				architecture_document: architectureRelativePath,
				prd: prdRelativePath,
			}

			await handler.execute(config, {
				type: "tool_use",
				name: "build_epics_document",
				params: {},
				partial: false,
			} as any)

			const artifact = await fs.readFile(artifactPath, "utf8")
			expect(artifact).to.contain("stepsCompleted: []")
			expect(artifact).to.contain(`Architecture: ${path.join(repoDir, architectureRelativePath)}`)
			expect(artifact).to.contain(`PRD: ${path.join(repoDir, prdRelativePath)}`)
			expect(artifact).to.not.contain("UI/UX:")
			expect(artifact).to.not.contain("inputDocuments:")
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("resolves the canonical epics artifact and sets output_file when mode=continue", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, architectureRelativePath, prdRelativePath, artifactPath } = await createBuildEpicsDocumentRepo({
			preexistingArtifact: "# existing epics\n",
		})

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildEpicsDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-epics.md"
			config.taskState.activePlaceholderWorkflowValues = {
				mode: "continue",
				architecture_document: architectureRelativePath,
				prd: prdRelativePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epics_document",
				params: {},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(false)
			expect(payload.mode).to.equal("continue")
			expect(payload.output_file_available).to.equal(true)
			expect(payload.artifact_path).to.equal(artifactPath)
			expect(config.taskState.activePlaceholderWorkflowValues?.output_file).to.equal(artifactPath)
			expect(await fs.readFile(artifactPath, "utf8")).to.equal("# existing epics\n")
			expect(config.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.deep.equal([])
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires mode from merged placeholder state for build_epics_document", async () => {
		const { repoDir, architectureRelativePath, prdRelativePath } = await createBuildEpicsDocumentRepo()

		try {
			const handler = new BuildEpicsDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-epics.md"
			config.taskState.activePlaceholderWorkflowValues = {
				architecture_document: architectureRelativePath,
				prd: prdRelativePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epics_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve workflow placeholder 'mode' from the active placeholder workflow state.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("rejects unsupported mode values for build_epics_document", async () => {
		const { repoDir, architectureRelativePath, prdRelativePath } = await createBuildEpicsDocumentRepo()

		try {
			const handler = new BuildEpicsDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-epics.md"
			config.taskState.activePlaceholderWorkflowValues = {
				mode: "resume",
				architecture_document: architectureRelativePath,
				prd: prdRelativePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epics_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError('Unsupported workflow mode "resume". Supported values: new, continue.'),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires architecture_document from merged placeholder state for build_epics_document", async () => {
		const { repoDir, prdRelativePath } = await createBuildEpicsDocumentRepo()

		try {
			const handler = new BuildEpicsDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-epics.md"
			config.taskState.activePlaceholderWorkflowValues = {
				mode: "new",
				prd: prdRelativePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epics_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve workflow placeholder 'architecture_document' from the active placeholder workflow state.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires prd from merged placeholder state for build_epics_document", async () => {
		const { repoDir, architectureRelativePath } = await createBuildEpicsDocumentRepo()

		try {
			const handler = new BuildEpicsDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-epics.md"
			config.taskState.activePlaceholderWorkflowValues = {
				mode: "new",
				architecture_document: architectureRelativePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epics_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve workflow placeholder 'prd' from the active placeholder workflow state.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires output_folder from workflow-config stable placeholders for build_epics_document", async () => {
		const { repoDir, architectureRelativePath, prdRelativePath } = await createBuildEpicsDocumentRepo({
			includeWorkflowConfig: false,
		})

		try {
			const handler = new BuildEpicsDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-epics.md"
			config.taskState.activePlaceholderWorkflowValues = {
				mode: "new",
				architecture_document: architectureRelativePath,
				prd: prdRelativePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epics_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve stable placeholder 'output_folder' from .cline/workflow-config.yaml.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("fails continue mode when the canonical epics artifact does not exist", async () => {
		const { repoDir, architectureRelativePath, prdRelativePath, artifactPath } = await createBuildEpicsDocumentRepo()

		try {
			const handler = new BuildEpicsDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-epics.md"
			config.taskState.activePlaceholderWorkflowValues = {
				mode: "continue",
				architecture_document: architectureRelativePath,
				prd: prdRelativePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epics_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					`Could not continue create-epics workflow because the canonical epics artifact does not exist at ${artifactPath}.`,
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("builds the canonical epic delivery spec from the full template and persists epic_delivery_spec", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, epicsRelativePath, artifactPath } = await createBuildEpicDeliverySpecRepo({
			preexistingArtifact: "# stale\n",
		})

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildEpicDeliverySpecToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "pi-planning.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "pi-planning.md",
				contents: "## Step 3: Build Epic Delivery Spec\nBuild the canonical delivery spec.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Gather Requirements\n- [x] Step 2: Identify Target Epic\n- [ ] Step 3: Build Epic Delivery Spec"
			config.taskState.activePlaceholderWorkflowValues = {
				epics_document: epicsRelativePath,
				target_epic: "Epic 3: Checkout",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epic_delivery_spec",
				params: {},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(true)
			expect(payload.artifact_path).to.equal(artifactPath)
			expect(payload.epic_delivery_spec_available).to.equal(true)
			expect(config.taskState.activePlaceholderWorkflowValues?.epic_delivery_spec).to.equal(artifactPath)
			expect(config.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.include(artifactPath)
			expect(config.taskState.didEditFile).to.equal(true)
			expect(config.taskState.fileReadCache.has(artifactPath.toLowerCase())).to.equal(false)

			const artifact = await fs.readFile(artifactPath, "utf8")
			expect(artifact).to.contain("# Epic 3: Checkout")
			expect(artifact).to.contain("### Epic 3: Checkout")
			expect(artifact).to.contain("#### Objective")
			expect(artifact).to.contain("#### Description")
			expect(artifact).to.contain("#### Success Measures")
			expect(artifact).to.contain("#### Scope")
			expect(artifact).to.contain("#### Scope Boundary")
			expect(artifact).to.contain("# User Stories")
			expect(artifact).to.contain("## Story #")
			expect(artifact).to.contain("### Objective")
			expect(artifact).to.contain("### Acceptance Criteria")
			expect(artifact).to.contain("### Sequencing/ Dependencies")
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires epics_document from merged placeholder workflow state for build_epic_delivery_spec", async () => {
		const { repoDir } = await createBuildEpicDeliverySpecRepo()

		try {
			const handler = new BuildEpicDeliverySpecToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "pi-planning.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "pi-planning.md",
				contents: "## Step 3: Build Epic Delivery Spec\nBuild the canonical delivery spec.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Gather Requirements\n- [x] Step 2: Identify Target Epic\n- [ ] Step 3: Build Epic Delivery Spec"
			config.taskState.activePlaceholderWorkflowValues = {
				target_epic: "Epic 3: Checkout",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epic_delivery_spec",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve workflow placeholder 'epics_document' from the active placeholder workflow state.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires target_epic from merged placeholder workflow state for build_epic_delivery_spec", async () => {
		const { repoDir, epicsRelativePath } = await createBuildEpicDeliverySpecRepo()

		try {
			const handler = new BuildEpicDeliverySpecToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "pi-planning.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "pi-planning.md",
				contents: "## Step 3: Build Epic Delivery Spec\nBuild the canonical delivery spec.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Gather Requirements\n- [x] Step 2: Identify Target Epic\n- [ ] Step 3: Build Epic Delivery Spec"
			config.taskState.activePlaceholderWorkflowValues = {
				epics_document: epicsRelativePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epic_delivery_spec",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve workflow placeholder 'target_epic' from the active placeholder workflow state.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires output_folder from workflow-config stable placeholders for build_epic_delivery_spec", async () => {
		const { repoDir, epicsRelativePath } = await createBuildEpicDeliverySpecRepo({ includeWorkflowConfig: false })

		try {
			const handler = new BuildEpicDeliverySpecToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "pi-planning.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "pi-planning.md",
				contents: "## Step 3: Build Epic Delivery Spec\nBuild the canonical delivery spec.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Gather Requirements\n- [x] Step 2: Identify Target Epic\n- [ ] Step 3: Build Epic Delivery Spec"
			config.taskState.activePlaceholderWorkflowValues = {
				epics_document: epicsRelativePath,
				target_epic: "Epic 3: Checkout",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epic_delivery_spec",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve stable placeholder 'output_folder' from .cline/workflow-config.yaml.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("fails when the canonical epic delivery spec template cannot be read", async () => {
		const { repoDir, epicsRelativePath, templatePath } = await createBuildEpicDeliverySpecRepo()

		try {
			await fs.rm(templatePath, { force: true })

			const handler = new BuildEpicDeliverySpecToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "pi-planning.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "pi-planning.md",
				contents: "## Step 3: Build Epic Delivery Spec\nBuild the canonical delivery spec.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Gather Requirements\n- [x] Step 2: Identify Target Epic\n- [ ] Step 3: Build Epic Delivery Spec"
			config.taskState.activePlaceholderWorkflowValues = {
				epics_document: epicsRelativePath,
				target_epic: "Epic 3: Checkout",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epic_delivery_spec",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(`Could not read the canonical epic delivery spec template at ${templatePath}.`),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("fails with the approved user-facing message when the selected epic cannot be found", async () => {
		const { repoDir, epicsRelativePath } = await createBuildEpicDeliverySpecRepo({ selectedEpicMissing: true })

		try {
			const handler = new BuildEpicDeliverySpecToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "pi-planning.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "pi-planning.md",
				contents: "## Step 3: Build Epic Delivery Spec\nBuild the canonical delivery spec.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Gather Requirements\n- [x] Step 2: Identify Target Epic\n- [ ] Step 3: Build Epic Delivery Spec"
			config.taskState.activePlaceholderWorkflowValues = {
				epics_document: epicsRelativePath,
				target_epic: "Epic 3: Checkout",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epic_delivery_spec",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Unable to populate delivery spec from the epics document. Please ensure the epics document is complete before attempting this workflow.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("fails with the approved user-facing message when a required epic section is missing", async () => {
		const { repoDir, epicsRelativePath } = await createBuildEpicDeliverySpecRepo({
			omitRequiredSection: "Scope Boundary",
		})

		try {
			const handler = new BuildEpicDeliverySpecToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "pi-planning.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "pi-planning.md",
				contents: "## Step 3: Build Epic Delivery Spec\nBuild the canonical delivery spec.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Gather Requirements\n- [x] Step 2: Identify Target Epic\n- [ ] Step 3: Build Epic Delivery Spec"
			config.taskState.activePlaceholderWorkflowValues = {
				epics_document: epicsRelativePath,
				target_epic: "Epic 3: Checkout",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_epic_delivery_spec",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Unable to populate delivery spec from the epics document. Please ensure the epics document is complete before attempting this workflow.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("overwrites an existing canonical artifact atomically for build_epic_delivery_spec", async () => {
		const sandbox = sinon.createSandbox()
		const staleContent = "# stale\n"
		const { repoDir, epicsRelativePath, artifactPath } = await createBuildEpicDeliverySpecRepo({
			preexistingArtifact: staleContent,
		})

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildEpicDeliverySpecToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "pi-planning.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "pi-planning.md",
				contents: "## Step 3: Build Epic Delivery Spec\nBuild the canonical delivery spec.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Gather Requirements\n- [x] Step 2: Identify Target Epic\n- [ ] Step 3: Build Epic Delivery Spec"
			config.taskState.activePlaceholderWorkflowValues = {
				epics_document: epicsRelativePath,
				target_epic: "Epic 3: Checkout",
			}

			await handler.execute(config, {
				type: "tool_use",
				name: "build_epic_delivery_spec",
				params: {},
				partial: false,
			} as any)

			const artifact = await fs.readFile(artifactPath, "utf8")
			expect(artifact).to.not.equal(staleContent)
			expect(artifact).to.contain("# Epic 3: Checkout")
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("captures the brainstorming topic, preserves the remaining template headings, and records write proof", async () => {
		const sandbox = sinon.createSandbox()
		const topic = "Primary goal: map the MVP.\n\nSecondary goal: identify technical unknowns."
		const { repoDir, artifactPath } = await createCaptureBrainstormingTopicRepo()

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new CaptureBrainstormingTopicToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "brainstorming.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "brainstorming.md",
				contents: "## Step 3: Capture Topic\nCapture the brainstorming topic.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Establish context\n- [x] Step 2: Select or create session\n- [ ] Step 3: Capture topic"
			config.taskState.activePlaceholderWorkflowValues = {
				output_file: artifactPath,
			}
			config.taskState.fileReadCache.set(artifactPath.toLowerCase(), "stale" as any)

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "capture_brainstorming_topic",
				params: {
					topic,
				},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(true)
			expect(payload.artifact_path).to.equal(artifactPath)
			expect(payload.topic_captured).to.equal(true)
			expect(config.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.include(artifactPath)
			expect(config.taskState.didEditFile).to.equal(true)
			expect(config.taskState.fileReadCache.has(artifactPath.toLowerCase())).to.equal(false)

			const artifact = await fs.readFile(artifactPath, "utf8")
			expect(getTopLevelSectionBody(artifact, "## Topic")).to.equal(topic)
			expect(artifact).to.contain("## Selected Approach")
			expect(artifact).to.contain("## Selected Techniques")
			expect(artifact).to.contain("### Techniques Used")
			expect(artifact).to.contain("## Ideas Generated")
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("rejects capture_brainstorming_topic outside brainstorming step 3", async () => {
		const { repoDir, artifactPath } = await createCaptureBrainstormingTopicRepo()

		try {
			const handler = new CaptureBrainstormingTopicToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "brainstorming.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "brainstorming.md",
				contents: "## Step 2: Select or Create Brainstorming Session\nPrepare the session artifact.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Establish context\n- [ ] Step 2: Select or create session\n- [ ] Step 3: Capture topic"
			config.taskState.activePlaceholderWorkflowValues = {
				output_file: artifactPath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "capture_brainstorming_topic",
				params: {
					topic: "Focus the session around onboarding friction.",
				},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"capture_brainstorming_topic can only be used while brainstorming.md Step 3 is the active placeholder workflow context.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires a non-empty topic for capture_brainstorming_topic", async () => {
		const { repoDir, artifactPath } = await createCaptureBrainstormingTopicRepo()

		try {
			const handler = new CaptureBrainstormingTopicToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "brainstorming.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "brainstorming.md",
				contents: "## Step 3: Capture Topic\nCapture the brainstorming topic.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Establish context\n- [x] Step 2: Select or create session\n- [ ] Step 3: Capture topic"
			config.taskState.activePlaceholderWorkflowValues = {
				output_file: artifactPath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "capture_brainstorming_topic",
				params: {
					topic: "   \n\t  ",
				},
				partial: false,
			} as any)

			expect(result).to.equal(formatResponse.toolError("capture_brainstorming_topic requires a non-empty 'topic' value."))
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires output_file from merged placeholder workflow state for capture_brainstorming_topic", async () => {
		const { repoDir } = await createCaptureBrainstormingTopicRepo()

		try {
			const handler = new CaptureBrainstormingTopicToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "brainstorming.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "brainstorming.md",
				contents: "## Step 3: Capture Topic\nCapture the brainstorming topic.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Establish context\n- [x] Step 2: Select or create session\n- [ ] Step 3: Capture topic"

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "capture_brainstorming_topic",
				params: {
					topic: "Focus the session around onboarding friction.",
				},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve workflow placeholder 'output_file' from the active placeholder workflow state.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("fails when the resolved output_file cannot be read for capture_brainstorming_topic", async () => {
		const { repoDir } = await createCaptureBrainstormingTopicRepo()
		const outputFilePath = path.join(repoDir, "planning", "brainstorming", "missing-session.md")

		try {
			const handler = new CaptureBrainstormingTopicToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "brainstorming.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "brainstorming.md",
				contents: "## Step 3: Capture Topic\nCapture the brainstorming topic.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Establish context\n- [x] Step 2: Select or create session\n- [ ] Step 3: Capture topic"
			config.taskState.activePlaceholderWorkflowValues = {
				output_file: outputFilePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "capture_brainstorming_topic",
				params: {
					topic: "Focus the session around onboarding friction.",
				},
				partial: false,
			} as any)

			expect(result).to.equal(formatResponse.toolError(`Could not read the resolved output_file at ${outputFilePath}.`))
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("fails when the brainstorming artifact lacks the canonical Topic heading", async () => {
		const { repoDir, artifactPath } = await createCaptureBrainstormingTopicRepo({
			outputFileContents: `# Brainstorming Session Results

## Selected Approach

## Selected Techniques

### Techniques Used

## Ideas Generated
`,
		})

		try {
			const handler = new CaptureBrainstormingTopicToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "brainstorming.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "brainstorming.md",
				contents: "## Step 3: Capture Topic\nCapture the brainstorming topic.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Establish context\n- [x] Step 2: Select or create session\n- [ ] Step 3: Capture topic"
			config.taskState.activePlaceholderWorkflowValues = {
				output_file: artifactPath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "capture_brainstorming_topic",
				params: {
					topic: "Focus the session around onboarding friction.",
				},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"The resolved brainstorming session output file does not contain the canonical '## Topic' section.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("replaces the existing Topic section body instead of appending for capture_brainstorming_topic", async () => {
		const sandbox = sinon.createSandbox()
		const priorTopic = "Prior topic text that should be replaced."
		const nextTopic = "Replacement topic text.\n\nWith a second paragraph."
		const { repoDir, artifactPath } = await createCaptureBrainstormingTopicRepo({
			outputFileContents: `# Brainstorming Session Results

## Topic
${priorTopic}

## Selected Approach

## Selected Techniques

### Techniques Used

## Ideas Generated
`,
		})

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new CaptureBrainstormingTopicToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "brainstorming.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "brainstorming.md",
				contents: "## Step 3: Capture Topic\nCapture the brainstorming topic.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Establish context\n- [x] Step 2: Select or create session\n- [ ] Step 3: Capture topic"
			config.taskState.activePlaceholderWorkflowValues = {
				output_file: artifactPath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "capture_brainstorming_topic",
				params: {
					topic: nextTopic,
				},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(true)

			const artifact = await fs.readFile(artifactPath, "utf8")
			expect(getTopLevelSectionBody(artifact, "## Topic")).to.equal(nextTopic)
			expect(artifact).to.not.contain(priorTopic)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("continues the newest brainstorming session and persists output_file", async () => {
		const { repoDir, sessionDirectory } = await createBrainstormingWorkflowRepo({
			existingSessions: [
				{ fileName: "brainstorming-session-2026-04-07.md", contents: "# older\n" },
				{ fileName: "brainstorming-session-2026-04-08.md", contents: "# current\n" },
				{ fileName: "brainstorming-session-2026-04-08-2.md", contents: "# newest\n" },
			],
		})

		try {
			const handler = new ContinueBrainstormingSessionToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "brainstorming.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "brainstorming.md",
				contents: "## Step 2: Select or create session\nPrepare the session artifact.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Establish context\n- [ ] Step 2: Select or create session\n- [ ] Step 3: Capture topic\n- [ ] Step 4: Choose approach"
			config.taskState.activePlaceholderWorkflowValues = {
				output_folder: path.join(repoDir, "planning"),
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "continue_brainstorming_session",
				params: {},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(true)
			expect(payload.continued).to.equal(true)
			expect(payload.artifact_path).to.equal(path.join(sessionDirectory, "brainstorming-session-2026-04-08-2.md"))
			expect(config.taskState.activePlaceholderWorkflowValues?.output_file).to.equal(payload.artifact_path)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("creates a new brainstorming session from the canonical template and persists output_file", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, outputFolder } = await createBrainstormingWorkflowRepo({
			existingSessions: [{ fileName: "brainstorming-session-2026-04-09.md", contents: "# existing\n" }],
			templateContents: "# Canonical Brainstorming Template\n",
		})

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new CreateBrainstormingSessionToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "brainstorming.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "brainstorming.md",
				contents: "## Step 2: Select or create session\nPrepare the session artifact.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Establish context\n- [ ] Step 2: Select or create session\n- [ ] Step 3: Capture topic\n- [ ] Step 4: Choose approach"
			config.taskState.activePlaceholderWorkflowValues = {
				output_folder: outputFolder,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "create_brainstorming_session",
				params: {},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(true)
			expect(payload.created).to.equal(true)
			expect(config.taskState.activePlaceholderWorkflowValues?.output_file).to.equal(payload.artifact_path)
			expect(config.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.include(payload.artifact_path)
			expect(config.taskState.didEditFile).to.equal(true)
			expect(await fs.readFile(payload.artifact_path, "utf8")).to.equal("# Canonical Brainstorming Template\n")
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("validates the selected brainstorming session path before persisting output_file", async () => {
		const { repoDir, sessionDirectory } = await createBrainstormingWorkflowRepo({
			existingSessions: [
				{ fileName: "brainstorming-session-2026-04-08.md", contents: "# selected\n" },
				{ fileName: "brainstorming-session-2026-04-07.md", contents: "# older\n" },
			],
		})

		try {
			const handler = new SelectBrainstormingSessionToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "brainstorming.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "brainstorming.md",
				contents: "## Step 2: Select or create session\nPrepare the session artifact.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Establish context\n- [ ] Step 2: Select or create session\n- [ ] Step 3: Capture topic\n- [ ] Step 4: Choose approach"
			config.taskState.activePlaceholderWorkflowValues = {
				output_folder: path.join(repoDir, "planning"),
			}
			const selectedPath = path.join(sessionDirectory, "brainstorming-session-2026-04-08.md")

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "select_brainstorming_session",
				params: {
					output_file: selectedPath,
				},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(true)
			expect(payload.selected).to.equal(true)
			expect(config.taskState.activePlaceholderWorkflowValues?.output_file).to.equal(selectedPath)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("persists the selected brainstorming approach into the canonical artifact", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir } = await createBrainstormingWorkflowRepo({
			outputFileRelativePath: "planning/brainstorming/current-session.md",
		})
		const outputFilePath = path.join(repoDir, "planning", "brainstorming", "current-session.md")

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new PersistBrainstormingApproachToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "brainstorming.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "brainstorming.md",
				contents: "## Step 4: Choose approach\nPersist the selected approach.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Establish context\n- [x] Step 2: Select or create session\n- [x] Step 3: Capture topic\n- [ ] Step 4: Choose approach"
			config.taskState.activePlaceholderWorkflowValues = {
				output_file: outputFilePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "persist_brainstorming_approach",
				params: {
					selected_approach: "user_choose",
				},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.approach_persisted).to.equal(true)
			expect(payload.selected_approach).to.equal("user_choose")
			expect(config.taskState.activePlaceholderWorkflowValues?.selected_approach).to.equal("user_choose")
			expect(getTopLevelSectionBody(await fs.readFile(outputFilePath, "utf8"), "## Selected Approach")).to.equal(
				"user_choose",
			)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("returns machine-readable random brainstorming technique data without writing the artifact", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir } = await createBrainstormingWorkflowRepo()

		try {
			sandbox.stub(Math, "random").returns(0)

			const handler = new SelectRandomBrainstormingTechniqueToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "brainstorming.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "brainstorming.md",
				contents: "## Step 4: Choose approach\nPick a technique.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Establish context\n- [x] Step 2: Select or create session\n- [x] Step 3: Capture topic\n- [ ] Step 4: Choose approach"

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "select_random_brainstorming_technique",
				params: {},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.technique_name).to.equal("Reverse Brainstorming")
			expect(payload.technique_description).to.equal("Generate problems before solutions.")
			expect(payload.technique_category).to.equal("creative")
		} finally {
			sandbox.restore()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("persists the selected brainstorming technique into the canonical artifact", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir } = await createBrainstormingWorkflowRepo({
			outputFileRelativePath: "planning/brainstorming/current-session.md",
		})
		const outputFilePath = path.join(repoDir, "planning", "brainstorming", "current-session.md")

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new PersistBrainstormingTechniqueToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "brainstorming.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "brainstorming.md",
				contents: "## Step 4: Choose approach\nPersist the selected technique.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Establish context\n- [x] Step 2: Select or create session\n- [x] Step 3: Capture topic\n- [ ] Step 4: Choose approach"
			config.taskState.activePlaceholderWorkflowValues = {
				output_file: outputFilePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "persist_brainstorming_technique",
				params: {
					technique_name: "Six Thinking Hats",
					technique_description: "Explore the problem through six perspectives.",
				},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.technique_persisted).to.equal(true)
			expect(payload.selected_technique).to.equal("Six Thinking Hats")
			expect(config.taskState.activePlaceholderWorkflowValues?.selected_technique).to.equal("Six Thinking Hats")
			expect(getTopLevelSectionBody(await fs.readFile(outputFilePath, "utf8"), "## Selected Techniques")).to.equal(
				"### Techniques Used\n- Six Thinking Hats: Explore the problem through six perspectives.",
			)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("persists the suggestion sentinel when the user requests a brainstorming technique recommendation", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir } = await createBrainstormingWorkflowRepo({
			outputFileRelativePath: "planning/brainstorming/current-session.md",
		})
		const outputFilePath = path.join(repoDir, "planning", "brainstorming", "current-session.md")

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new RequestBrainstormingTechniqueSuggestionToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "brainstorming.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "brainstorming.md",
				contents: "## Step 4: Choose approach\nRequest a suggestion.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Establish context\n- [x] Step 2: Select or create session\n- [x] Step 3: Capture topic\n- [ ] Step 4: Choose approach"
			config.taskState.activePlaceholderWorkflowValues = {
				output_file: outputFilePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "request_brainstorming_technique_suggestion",
				params: {},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.technique_suggestion_requested).to.equal(true)
			expect(payload.selected_technique).to.equal("user requested technique suggestion")
			expect(config.taskState.activePlaceholderWorkflowValues?.selected_technique).to.equal(
				"user requested technique suggestion",
			)
			expect(getTopLevelSectionBody(await fs.readFile(outputFilePath, "utf8"), "## Selected Techniques")).to.equal(
				"### Techniques Used\n- user requested technique suggestion",
			)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("builds the canonical story document from the full template and persists story_doc", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, epicDeliverySpecRelativePath, artifactPath } = await createBuildStoryDocumentRepo({
			preexistingArtifact: "# stale\n",
		})

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildStoryDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-story.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "create-story.md",
				contents: "## Step 2: Build Story Document Scaffold\nBuild the canonical story scaffold.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold"
			config.taskState.activePlaceholderWorkflowValues = {
				epic_delivery_spec: epicDeliverySpecRelativePath,
				story_number: "3.2",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_story_document",
				params: {},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload.persisted).to.equal(true)
			expect(payload.artifact_path).to.equal(artifactPath)
			expect(payload.story_doc_available).to.equal(true)
			expect(config.taskState.activePlaceholderWorkflowValues?.story_doc).to.equal(artifactPath)
			expect(config.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.include(artifactPath)
			expect(config.taskState.didEditFile).to.equal(true)
			expect(config.taskState.fileReadCache.has(artifactPath.toLowerCase())).to.equal(false)

			const artifact = await fs.readFile(artifactPath, "utf8")
			expect(artifact).to.contain("# Story 3.2")
			expect(artifact).to.contain("Status: backlog")
			expect(artifact).to.contain("## Story")
			expect(artifact).to.contain("As a release manager")
			expect(artifact).to.contain("I want checkout instrumentation")
			expect(artifact).to.contain("so that launch readiness stays visible")
			expect(artifact).to.contain("## Acceptance Criteria")
			expect(artifact).to.contain("- Capture checkout success rate.")
			expect(artifact).to.contain("- Surface funnel drop-off by step.")
			expect(artifact).to.contain("## Sequencing / Dependencies")
			expect(artifact).to.contain("- Depends on Epic 3 platform telemetry hooks.")
			expect(artifact).to.contain("- Follow Story 3.1 event contract rollout.")
			expect(artifact).to.contain("## Tasks / Subtasks")
			expect(artifact).to.contain("## Latest Review Findings")
			expect(artifact).to.contain("## Dev Notes")
			expect(artifact).to.contain("### Project Structure Notes")
			expect(artifact).to.contain("### References")
			expect(artifact).to.contain("## Dev Agent Record")
			expect(artifact).to.contain("### Debug Log References")
			expect(artifact).to.contain("### Completion Notes List")
			expect(artifact).to.contain("### File List")
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires epic_delivery_spec from merged placeholder workflow state for build_story_document", async () => {
		const { repoDir } = await createBuildStoryDocumentRepo()

		try {
			const handler = new BuildStoryDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-story.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "create-story.md",
				contents: "## Step 2: Build Story Document Scaffold\nBuild the canonical story scaffold.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold"
			config.taskState.activePlaceholderWorkflowValues = {
				story_number: "3.2",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_story_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve workflow placeholder 'epic_delivery_spec' from the active placeholder workflow state.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires story_number from merged placeholder workflow state for build_story_document", async () => {
		const { repoDir, epicDeliverySpecRelativePath } = await createBuildStoryDocumentRepo()

		try {
			const handler = new BuildStoryDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-story.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "create-story.md",
				contents: "## Step 2: Build Story Document Scaffold\nBuild the canonical story scaffold.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold"
			config.taskState.activePlaceholderWorkflowValues = {
				epic_delivery_spec: epicDeliverySpecRelativePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_story_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve workflow placeholder 'story_number' from the active placeholder workflow state.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("rejects build_story_document outside create-story step 2 context", async () => {
		const { repoDir, epicDeliverySpecRelativePath } = await createBuildStoryDocumentRepo()

		try {
			const handler = new BuildStoryDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-story.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "create-story.md",
				contents:
					"## Step 2: Build Story Document Scaffold\nBuild the canonical story scaffold.\n\n## Step 3: Add Dev Notes\nCapture structure guidance.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1:  (System-Owned) Resolve the target story\n- [x] Step 2:  (System-Owned) Build Story Document Scaffold\n- [ ] Step 3: Add Dev Notes"
			config.taskState.activePlaceholderWorkflowValues = {
				epic_delivery_spec: epicDeliverySpecRelativePath,
				story_number: "3.2",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_story_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"build_story_document can only be used while create-story.md Step 2 is the active placeholder workflow context.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("fails with the story_template stable-placeholder error when workflow-config is missing for build_story_document", async () => {
		const { repoDir, epicDeliverySpecRelativePath } = await createBuildStoryDocumentRepo({ includeWorkflowConfig: false })

		try {
			const handler = new BuildStoryDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-story.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "create-story.md",
				contents: "## Step 2: Build Story Document Scaffold\nBuild the canonical story scaffold.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold"
			config.taskState.activePlaceholderWorkflowValues = {
				epic_delivery_spec: epicDeliverySpecRelativePath,
				story_number: "3.2",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_story_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve stable placeholder 'story_template' from .cline/workflow-config.yaml.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires story_template from workflow-config stable placeholders for build_story_document", async () => {
		const { repoDir, epicDeliverySpecRelativePath } = await createBuildStoryDocumentRepo({ omitStoryTemplate: true })

		try {
			const handler = new BuildStoryDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-story.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "create-story.md",
				contents: "## Step 2: Build Story Document Scaffold\nBuild the canonical story scaffold.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold"
			config.taskState.activePlaceholderWorkflowValues = {
				epic_delivery_spec: epicDeliverySpecRelativePath,
				story_number: "3.2",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_story_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve stable placeholder 'story_template' from .cline/workflow-config.yaml.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("fails when the canonical story template cannot be read for build_story_document", async () => {
		const { repoDir, epicDeliverySpecRelativePath, templatePath } = await createBuildStoryDocumentRepo()

		try {
			await fs.rm(templatePath, { force: true })

			const handler = new BuildStoryDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-story.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "create-story.md",
				contents: "## Step 2: Build Story Document Scaffold\nBuild the canonical story scaffold.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold"
			config.taskState.activePlaceholderWorkflowValues = {
				epic_delivery_spec: epicDeliverySpecRelativePath,
				story_number: "3.2",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_story_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(formatResponse.toolError(`Could not read the canonical story template at ${templatePath}.`))
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("fails with the approved user-facing message when the selected story cannot be found", async () => {
		const { repoDir, epicDeliverySpecRelativePath, artifactPath } = await createBuildStoryDocumentRepo({
			selectedStoryMissing: true,
		})

		try {
			const handler = new BuildStoryDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-story.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "create-story.md",
				contents: "## Step 2: Build Story Document Scaffold\nBuild the canonical story scaffold.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold"
			config.taskState.activePlaceholderWorkflowValues = {
				epic_delivery_spec: epicDeliverySpecRelativePath,
				story_number: "3.2",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_story_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Unable to populate story document from the epic delivery spec. Please ensure the epic delivery spec is complete before attempting this workflow.",
				),
			)
			const artifactExists = await fs
				.access(artifactPath)
				.then(() => true)
				.catch(() => false)
			expect(artifactExists).to.equal(false)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("fails with the approved user-facing message when the Objective section is missing", async () => {
		const { repoDir, epicDeliverySpecRelativePath, artifactPath } = await createBuildStoryDocumentRepo({
			omitRequiredSection: "Objective",
		})

		try {
			const handler = new BuildStoryDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-story.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "create-story.md",
				contents: "## Step 2: Build Story Document Scaffold\nBuild the canonical story scaffold.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold"
			config.taskState.activePlaceholderWorkflowValues = {
				epic_delivery_spec: epicDeliverySpecRelativePath,
				story_number: "3.2",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_story_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Unable to populate story document from the epic delivery spec. Please ensure the epic delivery spec is complete before attempting this workflow.",
				),
			)
			const artifactExists = await fs
				.access(artifactPath)
				.then(() => true)
				.catch(() => false)
			expect(artifactExists).to.equal(false)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("fails with the approved user-facing message when the Acceptance Criteria section is missing", async () => {
		const { repoDir, epicDeliverySpecRelativePath, artifactPath } = await createBuildStoryDocumentRepo({
			omitRequiredSection: "Acceptance Criteria",
		})

		try {
			const handler = new BuildStoryDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-story.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "create-story.md",
				contents: "## Step 2: Build Story Document Scaffold\nBuild the canonical story scaffold.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold"
			config.taskState.activePlaceholderWorkflowValues = {
				epic_delivery_spec: epicDeliverySpecRelativePath,
				story_number: "3.2",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_story_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Unable to populate story document from the epic delivery spec. Please ensure the epic delivery spec is complete before attempting this workflow.",
				),
			)
			const artifactExists = await fs
				.access(artifactPath)
				.then(() => true)
				.catch(() => false)
			expect(artifactExists).to.equal(false)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("fails with the approved user-facing message when the Sequencing/ Dependencies section is missing", async () => {
		const { repoDir, epicDeliverySpecRelativePath, artifactPath } = await createBuildStoryDocumentRepo({
			omitRequiredSection: "Sequencing/ Dependencies",
		})

		try {
			const handler = new BuildStoryDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-story.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "create-story.md",
				contents: "## Step 2: Build Story Document Scaffold\nBuild the canonical story scaffold.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold"
			config.taskState.activePlaceholderWorkflowValues = {
				epic_delivery_spec: epicDeliverySpecRelativePath,
				story_number: "3.2",
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_story_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Unable to populate story document from the epic delivery spec. Please ensure the epic delivery spec is complete before attempting this workflow.",
				),
			)
			const artifactExists = await fs
				.access(artifactPath)
				.then(() => true)
				.catch(() => false)
			expect(artifactExists).to.equal(false)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("overwrites an existing canonical artifact atomically for build_story_document", async () => {
		const sandbox = sinon.createSandbox()
		const staleContent = "# stale\n"
		const { repoDir, epicDeliverySpecRelativePath, artifactPath } = await createBuildStoryDocumentRepo({
			preexistingArtifact: staleContent,
		})

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildStoryDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-story.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "create-story.md",
				contents: "## Step 2: Build Story Document Scaffold\nBuild the canonical story scaffold.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold"
			config.taskState.activePlaceholderWorkflowValues = {
				epic_delivery_spec: epicDeliverySpecRelativePath,
				story_number: "3.2",
			}

			await handler.execute(config, {
				type: "tool_use",
				name: "build_story_document",
				params: {},
				partial: false,
			} as any)

			const artifact = await fs.readFile(artifactPath, "utf8")
			expect(artifact).to.not.equal(staleContent)
			expect(artifact).to.contain("# Story 3.2")
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("copies objective, acceptance criteria, and sequencing/dependencies into the correct destination sections for build_story_document", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, epicDeliverySpecRelativePath, artifactPath } = await createBuildStoryDocumentRepo()

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildStoryDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "create-story.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "create-story.md",
				contents: "## Step 2: Build Story Document Scaffold\nBuild the canonical story scaffold.\n",
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold"
			config.taskState.activePlaceholderWorkflowValues = {
				epic_delivery_spec: epicDeliverySpecRelativePath,
				story_number: "3.2",
			}

			await handler.execute(config, {
				type: "tool_use",
				name: "build_story_document",
				params: {},
				partial: false,
			} as any)

			const artifact = await fs.readFile(artifactPath, "utf8")
			const objectiveSection = artifact.slice(artifact.indexOf("## Story\n"), artifact.indexOf("## Acceptance Criteria\n"))
			const acceptanceCriteriaSection = artifact.slice(
				artifact.indexOf("## Acceptance Criteria\n"),
				artifact.indexOf("## Sequencing / Dependencies\n"),
			)
			const sequencingDependenciesSection = artifact.slice(
				artifact.indexOf("## Sequencing / Dependencies\n"),
				artifact.indexOf("## Tasks / Subtasks\n"),
			)

			expect(objectiveSection).to.contain("As a release manager")
			expect(objectiveSection).to.contain("I want checkout instrumentation")
			expect(objectiveSection).to.contain("so that launch readiness stays visible")
			expect(objectiveSection).to.not.contain("- Capture checkout success rate.")
			expect(objectiveSection).to.not.contain("- Depends on Epic 3 platform telemetry hooks.")

			expect(acceptanceCriteriaSection).to.contain("- Capture checkout success rate.")
			expect(acceptanceCriteriaSection).to.contain("- Surface funnel drop-off by step.")
			expect(acceptanceCriteriaSection).to.not.contain("As a release manager")
			expect(acceptanceCriteriaSection).to.not.contain("- Depends on Epic 3 platform telemetry hooks.")

			expect(sequencingDependenciesSection).to.contain("- Depends on Epic 3 platform telemetry hooks.")
			expect(sequencingDependenciesSection).to.contain("- Follow Story 3.1 event contract rollout.")
			expect(sequencingDependenciesSection).to.not.contain("As a release manager")
			expect(sequencingDependenciesSection).to.not.contain("- Capture checkout success rate.")
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("builds the canonical quick-spec scaffold from the full template and persists output_file", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, artifactPath, title } = await createBuildTechSpecDocumentRepo({
			preexistingArtifact: "# stale\n",
		})

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildTechSpecDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "quick-spec.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "quick-spec.md",
				contents: `# Quick Spec

## Step 1: Gather Project Info
Required: \`{title}\`

## Step 2: (System-Owned) Resolve or start the spec draft
Set \`{output_file}\` to \`{implementation_artifacts}/tech-spec-wip.md\`.
`,
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Gather Project Info\n- [ ] Step 2:  (System-Owned) Resolve or start the spec draft"
			config.taskState.activePlaceholderWorkflowValues = { title }
			config.taskState.fileReadCache.set(artifactPath.toLowerCase(), "stale" as any)

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_tech_spec_document",
				params: {},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			const createdDate = new Date().toISOString().split("T")[0]
			expect(payload.persisted).to.equal(true)
			expect(payload.artifact_path).to.equal(artifactPath)
			expect(payload.output_file_available).to.equal(true)
			expect(config.taskState.activePlaceholderWorkflowValues?.output_file).to.equal(artifactPath)
			expect(config.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.include(artifactPath)
			expect(config.taskState.didEditFile).to.equal(true)
			expect(config.taskState.fileReadCache.has(artifactPath.toLowerCase())).to.equal(false)

			const artifact = await fs.readFile(artifactPath, "utf8")
			expect(artifact).to.contain(`title: '${title}'`)
			expect(artifact).to.contain("slug: 'quick-spec-workflow'")
			expect(artifact).to.contain(`created: '${createdDate}'`)
			expect(artifact).to.contain("status: 'backlog'")
			expect(artifact).to.contain(`# Tech-Spec: ${title}`)
			expect(artifact).to.not.contain("# stale")
			for (const heading of [
				"## Overview",
				"### Problem Statement",
				"### Solution",
				"### Scope",
				"#### In Scope",
				"#### Out of Scope",
				"## Context for Development",
				"### Codebase Patterns",
				"### Files to Reference",
				"### Technical Decisions",
				"## Implementation Plan",
				"### Acceptance Criteria",
				"### Implementation Seams",
				"### Tasks",
				"## Latest Review Findings",
			]) {
				expect(artifact).to.contain(heading)
			}
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires title from merged placeholder workflow state for build_tech_spec_document", async () => {
		const { repoDir } = await createBuildTechSpecDocumentRepo()

		try {
			const handler = new BuildTechSpecDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "quick-spec.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "quick-spec.md",
				contents: `# Quick Spec

## Step 1: Gather Project Info
Required: \`{title}\`

## Step 2: (System-Owned) Resolve or start the spec draft
Set \`{output_file}\` to \`{implementation_artifacts}/tech-spec-wip.md\`.
`,
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Gather Project Info\n- [ ] Step 2:  (System-Owned) Resolve or start the spec draft"
			config.taskState.activePlaceholderWorkflowValues = {}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_tech_spec_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve workflow placeholder 'title' from the active placeholder workflow state.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("rejects build_tech_spec_document outside quick-spec step 2 context", async () => {
		const { repoDir, title } = await createBuildTechSpecDocumentRepo()

		try {
			const handler = new BuildTechSpecDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "quick-spec.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "quick-spec.md",
				contents: `# Quick Spec

## Step 1: Gather Project Info
Required: \`{title}\`

## Step 3: Identify the Objective
Ask the user to describe what they'd like to work on.
`,
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Gather Project Info\n- [ ] Step 2:  (System-Owned) Resolve or start the spec draft"
			config.taskState.activePlaceholderWorkflowValues = { title }

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_tech_spec_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"build_tech_spec_document can only be used while quick-spec.md Step 2 is the active placeholder workflow context.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires implementation_artifacts from workflow-config stable placeholders for build_tech_spec_document", async () => {
		const { repoDir, title } = await createBuildTechSpecDocumentRepo({ includeWorkflowConfig: false })

		try {
			const handler = new BuildTechSpecDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "quick-spec.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "quick-spec.md",
				contents: `# Quick Spec

## Step 1: Gather Project Info
Required: \`{title}\`

## Step 2: (System-Owned) Resolve or start the spec draft
Set \`{output_file}\` to \`{implementation_artifacts}/tech-spec-wip.md\`.
`,
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Gather Project Info\n- [ ] Step 2:  (System-Owned) Resolve or start the spec draft"
			config.taskState.activePlaceholderWorkflowValues = { title }

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_tech_spec_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve stable placeholder 'implementation_artifacts' from .cline/workflow-config.yaml.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("fails when the canonical quick-spec template cannot be read for build_tech_spec_document", async () => {
		const { repoDir, templatePath, title } = await createBuildTechSpecDocumentRepo()

		try {
			await fs.rm(templatePath, { force: true })

			const handler = new BuildTechSpecDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "quick-spec.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "quick-spec.md",
				contents: `# Quick Spec

## Step 1: Gather Project Info
Required: \`{title}\`

## Step 2: (System-Owned) Resolve or start the spec draft
Set \`{output_file}\` to \`{implementation_artifacts}/tech-spec-wip.md\`.
`,
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Gather Project Info\n- [ ] Step 2:  (System-Owned) Resolve or start the spec draft"
			config.taskState.activePlaceholderWorkflowValues = { title }

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "build_tech_spec_document",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(`Could not read the canonical quick-spec template at ${templatePath}.`),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("overwrites an existing canonical tech-spec-wip artifact atomically for build_tech_spec_document", async () => {
		const sandbox = sinon.createSandbox()
		const staleContent = "# stale\n"
		const { repoDir, artifactPath, title } = await createBuildTechSpecDocumentRepo({
			preexistingArtifact: staleContent,
		})

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new BuildTechSpecDocumentToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowId = "quick-spec.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "remote",
				name: "quick-spec.md",
				contents: `# Quick Spec

## Step 1: Gather Project Info
Required: \`{title}\`

## Step 2: (System-Owned) Resolve or start the spec draft
Set \`{output_file}\` to \`{implementation_artifacts}/tech-spec-wip.md\`.
`,
			}
			config.taskState.currentFocusChainChecklist =
				"- [x] Step 1: Gather Project Info\n- [ ] Step 2:  (System-Owned) Resolve or start the spec draft"
			config.taskState.activePlaceholderWorkflowValues = { title }

			await handler.execute(config, {
				type: "tool_use",
				name: "build_tech_spec_document",
				params: {},
				partial: false,
			} as any)

			const artifact = await fs.readFile(artifactPath, "utf8")
			expect(artifact).to.not.equal(staleContent)
			expect(artifact).to.contain(`# Tech-Spec: ${title}`)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("updates story_path from merged workflow placeholders, clears review_input.md, and records write proof for story_path", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, specFilePath, reviewInputPath } = await createCodeReviewSpecUpdateRepo()

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new CodeReviewSpecUpdateToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowStableValues = {
				review_input: reviewInputPath,
				cwd: repoDir,
				project_root: repoDir,
				"project-root": repoDir,
			}
			config.taskState.activePlaceholderWorkflowValues = {
				story_path: specFilePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "code_review_spec_update",
				params: {
					story_path: "ignored.md",
				},
				partial: false,
			} as any)

			const payload = JSON.parse(String(result))
			expect(payload).to.deep.equal({
				persisted: true,
				story_path_updated: true,
				review_input_cleared: true,
				story_path_path: specFilePath,
				review_input_path: reviewInputPath,
			})

			const specFileMarkdown = await fs.readFile(specFilePath, "utf8")
			expect(specFileMarkdown).to.contain("Status: ready-for-dev")
			expect(getTopLevelSectionBody(specFileMarkdown, "## Latest Review Findings")).to.equal(
				"- Review finding one\n- Review finding two",
			)
			expect(specFileMarkdown.match(/- \[ \] New remediation task/g)?.length ?? 0).to.equal(1)
			expect(await fs.readFile(reviewInputPath, "utf8")).to.equal("")
			expect(config.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.include(specFilePath)
			expect(config.taskState.activePlaceholderWorkflowTaskWriteProofPaths).to.not.include(reviewInputPath)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires review_input from merged placeholder state", async () => {
		const handler = new CodeReviewSpecUpdateToolHandler()
		const { repoDir, specFilePath } = await createCodeReviewSpecUpdateRepo()

		try {
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowStableValues = {
				cwd: repoDir,
				project_root: repoDir,
				"project-root": repoDir,
			}
			config.taskState.activePlaceholderWorkflowValues = {
				story_path: specFilePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "code_review_spec_update",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve workflow placeholder 'review_input' from the active placeholder workflow state.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires story_path from merged placeholder state", async () => {
		const handler = new CodeReviewSpecUpdateToolHandler()
		const { repoDir, reviewInputPath } = await createCodeReviewSpecUpdateRepo()

		try {
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowStableValues = {
				review_input: reviewInputPath,
				cwd: repoDir,
				project_root: repoDir,
				"project-root": repoDir,
			}
			config.taskState.activePlaceholderWorkflowValues = {}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "code_review_spec_update",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError(
					"Could not resolve workflow placeholder 'story_path' from the active placeholder workflow state.",
				),
			)
		} finally {
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("requires approval when either mutated path is not auto-approved", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, specFilePath, reviewInputPath } = await createCodeReviewSpecUpdateRepo()

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const handler = new CodeReviewSpecUpdateToolHandler()
			const config = createConfig({ cwd: repoDir, isSubagentExecution: false })
			config.taskState.activePlaceholderWorkflowStableValues = {
				review_input: reviewInputPath,
				cwd: repoDir,
				project_root: repoDir,
				"project-root": repoDir,
			}
			config.taskState.activePlaceholderWorkflowValues = {
				story_path: specFilePath,
			}
			;(config.callbacks.shouldAutoApproveToolWithPath as sinon.SinonStub).callsFake(
				async (_toolName: string, filePath: string) => filePath === specFilePath,
			)

			await handler.execute(config, {
				type: "tool_use",
				name: "code_review_spec_update",
				params: {},
				partial: false,
			} as any)

			expect((config.callbacks.ask as sinon.SinonStub).calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})

	it("does not persist either file when merge evaluation fails", async () => {
		const sandbox = sinon.createSandbox()
		const { repoDir, specFilePath, reviewInputPath } = await createCodeReviewSpecUpdateRepo()

		try {
			setVscodeHostProviderMock()
			sandbox.stub(HostProvider.workspace, "getWorkspacePaths").resolves({ paths: [repoDir] } as any)

			const malformedReviewInputMarkdown = `# Story 3.2: Review Input Artifact
Status: ready-for-dev

## Tasks / Subtasks
- [ ] New remediation task
`
			await fs.writeFile(reviewInputPath, malformedReviewInputMarkdown, "utf8")

			const originalSpecFileMarkdown = await fs.readFile(specFilePath, "utf8")
			const originalReviewInputMarkdown = await fs.readFile(reviewInputPath, "utf8")

			const handler = new CodeReviewSpecUpdateToolHandler()
			const config = createConfig({ cwd: repoDir })
			config.taskState.activePlaceholderWorkflowStableValues = {
				review_input: reviewInputPath,
				cwd: repoDir,
				project_root: repoDir,
				"project-root": repoDir,
			}
			config.taskState.activePlaceholderWorkflowValues = {
				story_path: specFilePath,
			}

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "code_review_spec_update",
				params: {},
				partial: false,
			} as any)

			expect(result).to.equal(
				formatResponse.toolError("review_input.md does not contain the required ## Latest Review Findings section."),
			)
			expect(await fs.readFile(specFilePath, "utf8")).to.equal(originalSpecFileMarkdown)
			expect(await fs.readFile(reviewInputPath, "utf8")).to.equal(originalReviewInputMarkdown)
		} finally {
			sandbox.restore()
			HostProvider.reset()
			await fs.rm(repoDir, { recursive: true, force: true })
		}
	})
})
