import { expect } from "chai"
import { describe, it } from "mocha"
import { buildInitialQuickSpecDocument, QUICK_SPEC_DOCUMENT_HEADINGS } from "../quickSpecDocument"

const EXPECTED_INITIAL_QUICK_SPEC_DOCUMENT = `# Product Vision

# User Context

# Project Scope

# Boundaries & Constraints

# Technical Decisions

# Solution Overview

# Acceptance Criteria

# Code Map

# Sequencing

# Dev Agent Instructions

# Implementation Phases
`

describe("quickSpecDocument", () => {
	it("builds the initial quick-spec heading shell exactly", () => {
		expect(buildInitialQuickSpecDocument()).to.equal(EXPECTED_INITIAL_QUICK_SPEC_DOCUMENT)
		expect(buildInitialQuickSpecDocument().match(/^# /gm)).to.have.length(QUICK_SPEC_DOCUMENT_HEADINGS.length)
		expect(QUICK_SPEC_DOCUMENT_HEADINGS).to.deep.equal([
			"Product Vision",
			"User Context",
			"Project Scope",
			"Boundaries & Constraints",
			"Technical Decisions",
			"Solution Overview",
			"Acceptance Criteria",
			"Code Map",
			"Sequencing",
			"Dev Agent Instructions",
			"Implementation Phases",
		])
	})

	it("does not preserve legacy quick-spec scaffold text", () => {
		const document = buildInitialQuickSpecDocument()

		for (const forbiddenText of [
			"tech-spec-wip.md",
			"title:",
			"slug:",
			"date:",
			"status:",
			"quick-spec.md",
			"*** begin quick spec template example ***",
			"*** end quick spec template example ***",
		]) {
			expect(document).to.not.include(forbiddenText)
		}
	})
})
