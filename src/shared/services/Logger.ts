/**
 * Simple Logger utility for the extension's backend code.
 */
export class Logger {
	private static readonly levelPriority = {
		trace: 10,
		debug: 20,
		log: 30,
		info: 40,
		warn: 50,
		error: 60,
	} as const

	private static subscribers: Set<(msg: string) => void> = new Set()

	private static isVerbose(): boolean {
		return Logger.getConfiguredLevel() <= Logger.levelPriority.log
	}

	private static getConfiguredLevel(): number {
		const configured = (process.env.CLINE_LOG_LEVEL || "").trim().toLowerCase()
		if (configured && configured in Logger.levelPriority) {
			return Logger.levelPriority[configured as keyof typeof Logger.levelPriority]
		}

		return process.env.IS_DEV === "true" ? Logger.levelPriority.debug : Logger.levelPriority.info
	}

	private static shouldEmit(level: keyof typeof Logger.levelPriority): boolean {
		return Logger.levelPriority[level] >= Logger.getConfiguredLevel()
	}

	private static output(msg: string): void {
		for (const subscriber of Logger.subscribers) {
			try {
				subscriber(msg)
			} catch {
				// ignore errors from subscribers
			}
		}
	}

	/**
	 * Register a callback to receive log output messages.
	 */
	static subscribe(outputFn: (msg: string) => void) {
		Logger.subscribers.add(outputFn)
	}

	static unsubscribe(outputFn: (msg: string) => void) {
		Logger.subscribers.delete(outputFn)
	}

	static error(message: string, ...args: any[]) {
		Logger.#output("error", "ERROR", message, undefined, args)
	}

	static warn(message: string, ...args: any[]) {
		Logger.#output("warn", "WARN", message, undefined, args)
	}

	static log(message: string, ...args: any[]) {
		Logger.#output("log", "LOG", message, undefined, args)
	}

	static debug(message: string, ...args: any[]) {
		Logger.#output("debug", "DEBUG", message, undefined, args)
	}

	static info(message: string, ...args: any[]) {
		Logger.#output("info", "INFO", message, undefined, args)
	}

	static trace(message: string, ...args: any[]) {
		Logger.#output("trace", "TRACE", message, undefined, args)
	}

	static #output(
		levelKey: keyof typeof Logger.levelPriority,
		levelLabel: string,
		message: string,
		error: Error | undefined,
		args: any[],
	) {
		try {
			if (!Logger.shouldEmit(levelKey)) {
				return
			}
			let fullMessage = message
			if (Logger.isVerbose() && args.length > 0) {
				fullMessage += ` ${args.map((arg) => JSON.stringify(arg)).join(" ")}`
			}
			const errorSuffix = error?.message ? ` ${error.message}` : ""
			Logger.output(`${levelLabel} ${fullMessage}${errorSuffix}`.trimEnd())
		} catch {
			// do nothing if Logger fails
		}
	}
}
