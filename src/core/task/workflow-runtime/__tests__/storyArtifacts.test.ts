import { expect } from "chai"
import { describe, it } from "mocha"
import {
	buildEpicStoriesIndexFilename,
	buildPrimaryStoryIndexEntry,
	buildRemediationStoryIndexEntry,
	isWorkflowStoryStatus,
	isWorkflowStoryType,
	parseWorkflowStoryIndexJson,
	stringifyWorkflowStoryIndex,
} from "../storyArtifacts"

describe("storyArtifacts", () => {
	it("builds and parses valid primary story index entries", () => {
		const entry = buildPrimaryStoryIndexEntry({ epicIdentity: "2", storyNumber: 3 })
		const parsedIndex = parseWorkflowStoryIndexJson(
			JSON.stringify({
				version: 1,
				stories: [entry],
			}),
		)

		expect(buildEpicStoriesIndexFilename("2")).to.equal("epic-2-stories.index.json")
		expect(parsedIndex).to.deep.equal({
			version: 1,
			stories: [
				{
					story_identity: "2.3",
					story_file_name: "Story-2-3.md",
					story_type: "primary",
					parent_story_identity: null,
					story_file_generated: false,
					status: "draft",
				},
			],
		})
	})

	it("builds and parses valid remediation story index entries", () => {
		const entry = buildRemediationStoryIndexEntry({ parentStoryIdentity: "2.3", remediationStoryNumber: 4 })
		const parsedIndex = parseWorkflowStoryIndexJson(
			JSON.stringify({
				version: 1,
				stories: [entry],
			}),
		)

		expect(parsedIndex.stories[0]).to.deep.equal({
			story_identity: "2.3.4",
			story_file_name: "Remediation-story-2-3-4.md",
			story_type: "remediation",
			parent_story_identity: "2.3",
			story_file_generated: false,
			status: "draft",
		})
	})

	it("rejects malformed story indexes", () => {
		const invalidIndexes = [
			{
				label: "malformed json",
				rawJson: "{",
			},
			{
				label: "wrong version",
				rawJson: JSON.stringify({ version: 2, stories: [] }),
			},
			{
				label: "missing stories array",
				rawJson: JSON.stringify({ version: 1, stories: {} }),
			},
			{
				label: "bad identity",
				rawJson: JSON.stringify({
					version: 1,
					stories: [
						{
							story_identity: "0.1",
							story_file_name: "Story-0-1.md",
							story_type: "primary",
							parent_story_identity: null,
							story_file_generated: false,
							status: "draft",
						},
					],
				}),
			},
			{
				label: "noncanonical filename",
				rawJson: JSON.stringify({
					version: 1,
					stories: [
						{
							story_identity: "1.2",
							story_file_name: "Story-1-3.md",
							story_type: "primary",
							parent_story_identity: null,
							story_file_generated: false,
							status: "draft",
						},
					],
				}),
			},
			{
				label: "wrong story type",
				rawJson: JSON.stringify({
					version: 1,
					stories: [
						{
							story_identity: "1.2",
							story_file_name: "Story-1-2.md",
							story_type: "remediation",
							parent_story_identity: null,
							story_file_generated: false,
							status: "draft",
						},
					],
				}),
			},
			{
				label: "wrong parent",
				rawJson: JSON.stringify({
					version: 1,
					stories: [
						{
							story_identity: "1.2.3",
							story_file_name: "Remediation-story-1-2-3.md",
							story_type: "remediation",
							parent_story_identity: "1.9",
							story_file_generated: false,
							status: "draft",
						},
					],
				}),
			},
			{
				label: "nonboolean generated flag",
				rawJson: JSON.stringify({
					version: 1,
					stories: [
						{
							story_identity: "1.2",
							story_file_name: "Story-1-2.md",
							story_type: "primary",
							parent_story_identity: null,
							story_file_generated: "false",
							status: "draft",
						},
					],
				}),
			},
			{
				label: "bad status",
				rawJson: JSON.stringify({
					version: 1,
					stories: [
						{
							story_identity: "1.2",
							story_file_name: "Story-1-2.md",
							story_type: "primary",
							parent_story_identity: null,
							story_file_generated: false,
							status: "ready",
						},
					],
				}),
			},
		]

		for (const invalidIndex of invalidIndexes) {
			expect(() => parseWorkflowStoryIndexJson(invalidIndex.rawJson), invalidIndex.label).to.throw(Error)
		}
	})

	it("serializes story indexes as stable pretty JSON with a trailing newline", () => {
		const serializedIndex = stringifyWorkflowStoryIndex({
			version: 1,
			stories: [
				buildPrimaryStoryIndexEntry({ epicIdentity: "1", storyNumber: 1 }),
				buildRemediationStoryIndexEntry({ parentStoryIdentity: "1.1", remediationStoryNumber: 1 }),
			],
		})

		expect(serializedIndex).to.equal(`{
  "version": 1,
  "stories": [
    {
      "story_identity": "1.1",
      "story_file_name": "Story-1-1.md",
      "story_type": "primary",
      "parent_story_identity": null,
      "story_file_generated": false,
      "status": "draft"
    },
    {
      "story_identity": "1.1.1",
      "story_file_name": "Remediation-story-1-1-1.md",
      "story_type": "remediation",
      "parent_story_identity": "1.1",
      "story_file_generated": false,
      "status": "draft"
    }
  ]
}
`)
	})

	it("exports story type and status guards", () => {
		expect(isWorkflowStoryType("primary")).to.equal(true)
		expect(isWorkflowStoryType("remediation")).to.equal(true)
		expect(isWorkflowStoryType("feature")).to.equal(false)
		expect(isWorkflowStoryStatus("draft")).to.equal(true)
		expect(isWorkflowStoryStatus("backlog")).to.equal(true)
		expect(isWorkflowStoryStatus("review")).to.equal(true)
		expect(isWorkflowStoryStatus("complete")).to.equal(true)
		expect(isWorkflowStoryStatus("ready")).to.equal(false)
	})
})
