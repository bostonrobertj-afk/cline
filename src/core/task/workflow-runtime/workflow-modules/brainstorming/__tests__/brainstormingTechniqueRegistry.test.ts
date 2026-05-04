import { expect } from "chai"
import { readFileSync } from "fs"
import { describe, it } from "mocha"
import { resolve } from "path"
import {
	BRAINSTORMING_TECHNIQUES,
	BrainstormingTechniqueCategory,
	findBrainstormingTechniqueByIdOrName,
	listBrainstormingTechniqueCategories,
	listBrainstormingTechniquesByCategory,
	selectRandomBrainstormingTechnique,
} from "../brainstormingTechniqueRegistry"

describe("brainstormingTechniqueRegistry", () => {
	it("migrates all source technique rows into code-owned module data", () => {
		expect(BRAINSTORMING_TECHNIQUES).to.have.length(61)
		expect(BRAINSTORMING_TECHNIQUES[0]).to.deep.equal({
			id: "yes-and-building",
			name: "Yes And Building",
			category: BrainstormingTechniqueCategory.Collaborative,
			description:
				"Build momentum through positive additions where each idea becomes a launching pad - use prompts like 'Yes and we could also...' or 'Building on that idea...' to create energetic collaborative flow that builds upon previous contributions",
		})
		expect(BRAINSTORMING_TECHNIQUES[BRAINSTORMING_TECHNIQUES.length - 1]).to.deep.equal({
			id: "mythic-frameworks",
			name: "Mythic Frameworks",
			category: BrainstormingTechniqueCategory.Cultural,
			description:
				"Use myths and archetypal stories as frameworks for understanding and solving problems - taps into collective unconscious by asking what myth parallels this, what archetypes are involved, and how mythic structure informs solution",
		})
	})

	it("returns categories in the Step 2 dropdown order", () => {
		expect(listBrainstormingTechniqueCategories()).to.deep.equal([
			BrainstormingTechniqueCategory.Collaborative,
			BrainstormingTechniqueCategory.Creative,
			BrainstormingTechniqueCategory.Deep,
			BrainstormingTechniqueCategory.IntrospectiveDelight,
			BrainstormingTechniqueCategory.Structured,
			BrainstormingTechniqueCategory.Theatrical,
			BrainstormingTechniqueCategory.Wild,
			BrainstormingTechniqueCategory.Biomimetic,
			BrainstormingTechniqueCategory.Quantum,
			BrainstormingTechniqueCategory.Cultural,
		])
	})

	it("filters techniques by category", () => {
		const creativeTechniques = listBrainstormingTechniquesByCategory(BrainstormingTechniqueCategory.Creative)

		expect(creativeTechniques.map((technique) => technique.name)).to.deep.equal([
			"What If Scenarios",
			"Analogical Thinking",
			"Reversal Inversion",
			"First Principles Thinking",
			"Forced Relationships",
			"Time Shifting",
			"Metaphor Mapping",
			"Cross-Pollination",
			"Concept Blending",
			"Reverse Brainstorming",
			"Sensory Exploration",
		])
	})

	it("finds techniques by id or display name", () => {
		expect(findBrainstormingTechniqueByIdOrName({ id: "natures-solutions" })?.name).to.equal("Nature's Solutions")
		expect(findBrainstormingTechniqueByIdOrName({ name: "  six thinking hats  " })?.id).to.equal("six-thinking-hats")
		expect(findBrainstormingTechniqueByIdOrName({ id: "missing-technique" })).to.equal(undefined)
	})

	it("selects a random eligible technique while respecting excluded ids", () => {
		const excludedIds = BRAINSTORMING_TECHNIQUES.map((technique) => technique.id).filter((id) => id !== "mythic-frameworks")

		expect(selectRandomBrainstormingTechnique({ excludedIds, random: () => 0.75 })?.id).to.equal("mythic-frameworks")
		expect(
			selectRandomBrainstormingTechnique({
				excludedIds: ["yes-and-building"],
				random: () => 0,
			})?.id,
		).to.equal("brain-writing-round-robin")
	})

	it("returns undefined when exclusions remove every technique", () => {
		const excludedIds = BRAINSTORMING_TECHNIQUES.map((technique) => technique.id)

		expect(selectRandomBrainstormingTechnique({ excludedIds, random: () => 0 })).to.equal(undefined)
	})

	it("does not read or reference the source CSV at runtime", () => {
		const source = readFileSync(resolve(__dirname, "../brainstormingTechniqueRegistry.ts"), "utf8")

		expect(source).not.to.include("brain-methods.csv")
		expect(source).not.to.include(".cline/skills/bmad-brainstorming")
	})
})
