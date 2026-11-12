import { render } from "ink-testing-library"
// biome-ignore lint/correctness/noUnusedImports: React must be in scope for JSX in this test file.
import React from "react"
import { describe, expect, it } from "vitest"
import { FocusChain } from "./FocusChain"

describe("FocusChain", () => {
	it("renders the canonical active workflow step and expanded status list", () => {
		const { lastFrame } = render(
			<FocusChain
				expanded={true}
				focusChainChecklist={"1. Gather Inputs - Complete\n2. Perform Work - Active\n3. Finalize - Not Started"}
			/>,
		)

		expect(lastFrame()).toContain("[2/3]")
		expect(lastFrame()).toContain("1. Gather Inputs - Complete")
		expect(lastFrame()).toContain("2. Perform Work - Active")
		expect(lastFrame()).toContain("3. Finalize - Not Started")
	})

	it("ignores malformed and checkbox lines", () => {
		const { lastFrame } = render(<FocusChain focusChainChecklist={"Unrelated prose\n- [x] Legacy Step"} />)

		expect(lastFrame() ?? "").toBe("")
	})
})
