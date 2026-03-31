import { expect } from "chai"
import { describe, it } from "mocha"
import { buildReviewInputExtraction } from "../buildReviewInputExtraction"

const storyMarkdown = `# Story 3.2: Review Input Artifact
Status: review

## Acceptance Criteria
- AC 1
- AC 2

## Prior Review Findings
- Fix the remediation issue

## Tasks / Subtasks
- [ ] Existing incomplete task

## Dev Agent Record
### Completion Notes List
- Existing completion note
`

const successStoryMarkdown = `# Story 3.2: Review Input Artifact
Status: review

## Acceptance Criteria
- AC 1
- AC 2

## Prior Review Findings
- Fix the remediation issue
- Added prior review finding

## Tasks / Subtasks
- [x] Added completed task
- [ ] Existing incomplete task

## Dev Agent Record
### Completion Notes List
- Existing completion note
  - Added completion note
`

function createDiffArtifact(diffBody: string): string {
	return `# Review Diff Output

## Diff
\`\`\`diff
${diffBody}
\`\`\`
`
}

describe("buildReviewInputExtraction", () => {
	it("builds normalized review-input markdown from a story file and matching story diff", () => {
		const result = buildReviewInputExtraction({
			storyMarkdown: successStoryMarkdown,
			storyAbsolutePath: "/repo/docs/story.md",
			storyRelativePaths: ["docs/story.md"],
			diffArtifactMarkdown: createDiffArtifact(`diff --git a/docs/story.md b/docs/story.md
index 1111111..2222222 100644
--- a/docs/story.md
+++ b/docs/story.md
@@ -6,8 +6,10 @@ Status: review
 ## Prior Review Findings
 - Fix the remediation issue
+- Added prior review finding
 
 ## Tasks / Subtasks
+- [x] Added completed task
 - [ ] Existing incomplete task
 
 ## Dev Agent Record
 ### Completion Notes List
+  - Added completion note`),
		})

		expect(result).to.deep.equal({
			kind: "success",
			recentStoryChangesDetected: true,
			markdown: `# Story 3.2: Review Input Artifact
Status: review
This QA pass is reviewing work performed during a remediation cycle. Only the remediation tasks and subtasks are shown here. These tasks and subtasks may or may not satisfy all provided acceptance criteria. Do not treat failure to fully satisfy all acceptance criteria as a defect.

## Acceptance Criteria
- AC 1
- AC 2

## Prior Review Findings
- Added prior review finding

## Tasks / Subtasks
- [x] Added completed task

## Completion Notes
  - Added completion note`,
		})
	})

	it("maps added checked tasks and completion notes from the story file even when the diff hunk omits section headings", () => {
		const result = buildReviewInputExtraction({
			storyMarkdown: `# Story 3.2: Review Input Artifact
Status: review

## Acceptance Criteria
- AC 1

## Prior Review Findings
- Existing prior review finding
- Added prior review finding

## Tasks / Subtasks
- [x] Existing completed task
- [x] Added completed task

## Dev Agent Record
### Completion Notes List
- Existing completion note
  - Added completion note
`,
			storyAbsolutePath: "/repo/docs/story.md",
			storyRelativePaths: ["docs/story.md"],
			diffArtifactMarkdown: createDiffArtifact(`diff --git a/docs/story.md b/docs/story.md
index 1111111..2222222 100644
--- a/docs/story.md
+++ b/docs/story.md
@@ -8,4 +8,6 @@
+- Added prior review finding
 
+- [x] Added completed task
+  - Added completion note
  `),
		})

		expect(result.kind).to.equal("success")
		if (result.kind === "success") {
			expect(result.markdown).to.contain("- Added prior review finding")
			expect(result.markdown).to.contain("- [x] Added completed task")
			expect(result.markdown).to.contain("  - Added completion note")
			expect(result.markdown).to.not.contain("- Existing prior review finding")
			expect(result.markdown).to.not.contain("- [x] Existing completed task")
			expect(result.markdown).to.not.contain("- Existing completion note")
		}
	})

	it("returns no_recent_story_changes when added prior-review, task, or completion-note candidates cannot be matched back into the parsed story sections", () => {
		const result = buildReviewInputExtraction({
			storyMarkdown: `# Story 3.2: Review Input Artifact
Status: review

## Acceptance Criteria
- AC 1

## Prior Review Findings
- Fix the remediation issue

## Tasks / Subtasks
- [ ] Existing incomplete task

## Dev Agent Record
### Completion Notes List
- Existing completion note
`,
			storyAbsolutePath: "/repo/docs/story.md",
			storyRelativePaths: ["docs/story.md"],
			diffArtifactMarkdown: createDiffArtifact(`diff --git a/docs/story.md b/docs/story.md
index 1111111..2222222 100644
--- a/docs/story.md
+++ b/docs/story.md
@@ -8,4 +8,6 @@
+- Added prior review finding
 
+- [x] Added completed task
+  - Added completion note`),
		})

		expect(result).to.deep.equal({
			kind: "no_recent_story_changes",
			recentStoryChangesDetected: false,
		})
	})

	it("returns no_recent_story_changes when the diff artifact does not touch the story path", () => {
		const result = buildReviewInputExtraction({
			storyMarkdown,
			storyAbsolutePath: "/repo/docs/story.md",
			storyRelativePaths: ["docs/story.md"],
			diffArtifactMarkdown: createDiffArtifact(`diff --git a/src/other.ts b/src/other.ts
index 1111111..2222222 100644
--- a/src/other.ts
+++ b/src/other.ts
@@ -1 +1 @@
-export const value = 1
+export const value = 2`),
		})

		expect(result).to.deep.equal({
			kind: "no_recent_story_changes",
			recentStoryChangesDetected: false,
		})
	})

	it("includes the no recent completed tasks note when the story diff has no added checked checklist lines", () => {
		const result = buildReviewInputExtraction({
			storyMarkdown,
			storyAbsolutePath: "/repo/docs/story.md",
			storyRelativePaths: ["docs/story.md"],
			diffArtifactMarkdown: createDiffArtifact(`diff --git a/docs/story.md b/docs/story.md
index 1111111..2222222 100644
--- a/docs/story.md
+++ b/docs/story.md
@@ -6,8 +6,10 @@ Status: review
 ## Prior Review Findings
 - Fix the remediation issue
 
 ## Tasks / Subtasks
+- [ ] Added incomplete task
 - [ ] Existing incomplete task
 
 ## Dev Agent Record
 ### Completion Notes List`),
		})

		expect(result.kind).to.equal("success")
		if (result.kind === "success") {
			expect(result.markdown).to.not.contain("## Prior Review Findings")
			expect(result.markdown).to.include("No recent completed tasks were identified from the story-file diff.")
		}
	})

	it("throws for malformed story files missing deterministic structure", () => {
		expect(() =>
			buildReviewInputExtraction({
				storyMarkdown: `# Not A Story

## Tasks / Subtasks
- [x] Missing required structure
`,
				storyAbsolutePath: "/repo/docs/story.md",
				storyRelativePaths: ["docs/story.md"],
				diffArtifactMarkdown: createDiffArtifact(""),
			}),
		).to.throw(
			"The provided story file does not contain the required story structure for deterministic review-input generation.",
		)
	})
})
