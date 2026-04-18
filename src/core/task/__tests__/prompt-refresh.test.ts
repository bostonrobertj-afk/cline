import { expect } from "chai"
import {
	DEFAULT_PROMPT_REFRESH_FREQUENCY,
	getNextTurnsSinceFullPromptRefresh,
	getPromptRefreshInterval,
	normalizePromptRefreshFrequency,
	shouldSendFullPromptAssembly,
	shouldUseContinuationTurnPrompt,
} from "../prompt-refresh"

describe("prompt refresh helpers", () => {
	it("uses the documented default frequency when unset", () => {
		expect(normalizePromptRefreshFrequency(undefined)).to.equal(DEFAULT_PROMPT_REFRESH_FREQUENCY)
	})

	it("clamps the configured frequency to the supported 0-20 range", () => {
		expect(normalizePromptRefreshFrequency(-1)).to.equal(0)
		expect(normalizePromptRefreshFrequency(20)).to.equal(20)
		expect(normalizePromptRefreshFrequency(21)).to.equal(20)
	})

	it("treats zero as refreshing every eligible internal turn", () => {
		expect(getPromptRefreshInterval(0)).to.equal(1)
		expect(
			shouldSendFullPromptAssembly({
				isFirstRequest: false,
				hasHumanAuthoredInput: false,
				turnsSinceFullPromptRefresh: 0,
				promptRefreshFrequency: 0,
			}),
		).to.equal(true)
	})

	it("refreshes on the configured fifth eligible internal turn by default", () => {
		expect(
			shouldSendFullPromptAssembly({
				isFirstRequest: false,
				hasHumanAuthoredInput: false,
				turnsSinceFullPromptRefresh: 3,
				promptRefreshFrequency: 5,
			}),
		).to.equal(false)

		expect(
			shouldSendFullPromptAssembly({
				isFirstRequest: false,
				hasHumanAuthoredInput: false,
				turnsSinceFullPromptRefresh: 4,
				promptRefreshFrequency: 5,
			}),
		).to.equal(true)
	})

	it("always sends the full prompt when human-authored input is present", () => {
		expect(
			shouldSendFullPromptAssembly({
				isFirstRequest: false,
				hasHumanAuthoredInput: true,
				turnsSinceFullPromptRefresh: 999,
				promptRefreshFrequency: 10,
			}),
		).to.equal(true)
	})

	it("resets the counter whenever a full prompt is sent", () => {
		expect(
			getNextTurnsSinceFullPromptRefresh({
				didSendFullPromptAssembly: true,
				hasHumanAuthoredInput: false,
				turnsSinceFullPromptRefresh: 4,
			}),
		).to.equal(0)
	})

	it("increments the counter only on suppressed internal turns", () => {
		expect(
			getNextTurnsSinceFullPromptRefresh({
				didSendFullPromptAssembly: false,
				hasHumanAuthoredInput: false,
				turnsSinceFullPromptRefresh: 2,
			}),
		).to.equal(3)
	})
})

describe("shouldUseContinuationTurnPrompt", () => {
	it("returns true for non-human turns without a full prompt refresh", () => {
		expect(
			shouldUseContinuationTurnPrompt({
				hasHumanAuthoredInput: false,
				shouldSendFullPromptAssembly: false,
			}),
		).to.equal(true)
	})

	it("returns false when human-authored input is present", () => {
		expect(
			shouldUseContinuationTurnPrompt({
				hasHumanAuthoredInput: true,
				shouldSendFullPromptAssembly: false,
			}),
		).to.equal(false)
	})

	it("returns false when a full prompt refresh is required", () => {
		expect(
			shouldUseContinuationTurnPrompt({
				hasHumanAuthoredInput: false,
				shouldSendFullPromptAssembly: true,
			}),
		).to.equal(false)
	})
})
