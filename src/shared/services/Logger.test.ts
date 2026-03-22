import { expect } from "chai"
import { afterEach, beforeEach, describe, it } from "mocha"
import { Logger } from "./Logger"

describe("Logger", () => {
	let originalIsDev: string | undefined
	let originalLogLevel: string | undefined
	let messages: string[]
	let subscriber: (msg: string) => void

	beforeEach(() => {
		originalIsDev = process.env.IS_DEV
		originalLogLevel = process.env.CLINE_LOG_LEVEL
		messages = []
		subscriber = (msg: string) => {
			messages.push(msg)
		}
		Logger.subscribe(subscriber)
	})

	afterEach(() => {
		Logger.unsubscribe(subscriber)
		if (originalIsDev === undefined) {
			delete process.env.IS_DEV
		} else {
			process.env.IS_DEV = originalIsDev
		}
		if (originalLogLevel === undefined) {
			delete process.env.CLINE_LOG_LEVEL
		} else {
			process.env.CLINE_LOG_LEVEL = originalLogLevel
		}
	})

	it("suppresses log and debug output by default in non-dev mode", () => {
		process.env.IS_DEV = "false"
		delete process.env.CLINE_LOG_LEVEL

		Logger.log("hidden log")
		Logger.debug("hidden debug")
		Logger.info("visible info")

		expect(messages).to.deep.equal(["INFO visible info"])
	})

	it("emits log output in dev mode", () => {
		process.env.IS_DEV = "true"
		delete process.env.CLINE_LOG_LEVEL

		Logger.log("visible log", { detail: "yes" })

		expect(messages).to.have.length(1)
		expect(messages[0]).to.equal('LOG visible log {"detail":"yes"}')
	})

	it("respects CLINE_LOG_LEVEL overrides in non-dev mode", () => {
		process.env.IS_DEV = "false"
		process.env.CLINE_LOG_LEVEL = "log"

		Logger.log("visible log")
		Logger.debug("hidden debug")

		expect(messages).to.deep.equal(["LOG visible log"])
	})
})
