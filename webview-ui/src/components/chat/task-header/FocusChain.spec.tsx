import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FocusChain } from "./FocusChain"

describe("FocusChain", () => {
	it("renders the canonical active workflow step and expanded status list", () => {
		render(
			<FocusChain
				lastProgressMessageText={"1. Gather Inputs - Complete\n2. Perform Work - Active\n3. Finalize - Not Started"}
			/>,
		)

		const expandSurface = screen.getByLabelText("Expand focus chain")
		expect(expandSurface).toBeInTheDocument()
		expect(screen.getByText("2/3")).toBeVisible()
		expect(screen.getByText("2. Perform Work - Active")).toBeVisible()

		fireEvent.click(expandSurface)

		expect(screen.getByLabelText("Collapse focus chain")).toBeInTheDocument()
		expect(screen.getByText("1. Gather Inputs - Complete")).toBeVisible()
		expect(screen.getByText("3. Finalize - Not Started")).toBeVisible()
		expect(screen.getAllByText("2. Perform Work - Active")).toHaveLength(2)
	})

	it("ignores malformed and checkbox lines", () => {
		render(<FocusChain lastProgressMessageText={"Unrelated prose\n- [x] Legacy Step"} />)

		expect(screen.queryByLabelText("Expand focus chain")).not.toBeInTheDocument()
	})
})
