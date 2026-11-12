import type { ApiConfiguration } from "@shared/api"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { OpenAINativeProvider } from "../providers/OpenAINative"
import ReasoningEffortSelector from "../ReasoningEffortSelector"

const { apiConfiguration, state, handleModeFieldChange, handleFieldChange } = vi.hoisted(() => {
	const apiConfiguration: ApiConfiguration = {}
	return {
		apiConfiguration,
		state: { apiConfiguration, planActSeparateModelsSetting: true },
		handleModeFieldChange: vi.fn(),
		handleFieldChange: vi.fn(),
	}
})

const modes: Array<"plan" | "act"> = ["plan", "act"]

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => state,
}))

vi.mock("../utils/useApiConfigurationHandlers", () => ({
	useApiConfigurationHandlers: () => ({ handleModeFieldChange, handleFieldChange }),
}))

vi.mock("../common/ApiKeyField", () => ({ ApiKeyField: () => null }))
vi.mock("../common/ModelInfoView", () => ({ ModelInfoView: () => null }))
vi.mock("../common/ModelSelector", () => ({
	ModelSelector: ({
		models,
		selectedModelId,
		onChange,
	}: {
		models: Record<string, { name?: string }>
		selectedModelId: string
		onChange: (event: { target: { value: string } }) => void
	}) => (
		<select aria-label="Model" onChange={(event) => onChange(event)} value={selectedModelId}>
			{Object.keys(models).map((id) => (
				<option key={id} value={id}>
					{models[id].name ?? id}
				</option>
			))}
		</select>
	),
}))

vi.mock("@/components/ui/select", () => ({
	Select: ({
		children,
		value,
		onValueChange,
	}: {
		children: ReactNode
		value: string
		onValueChange: (value: string) => void
	}) => (
		<select aria-label="Reasoning Effort" onChange={(event) => onValueChange(event.target.value)} value={value}>
			{children}
		</select>
	),
	SelectContent: ({ children }: { children: ReactNode }) => children,
	SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <option value={value}>{children}</option>,
	SelectTrigger: () => null,
	SelectValue: () => null,
}))

vi.mock("../ReasoningSummarySelector", () => ({ default: () => null }))

function resetConfiguration() {
	for (const key of Object.keys(apiConfiguration)) {
		Reflect.deleteProperty(apiConfiguration, key)
	}
}

function configureNative(modelId: string, effort: string) {
	Object.assign(apiConfiguration, {
		planModeApiProvider: "openai-native",
		actModeApiProvider: "openai-native",
		planModeApiModelId: modelId,
		actModeApiModelId: modelId,
		planModeReasoningEffort: effort,
		actModeReasoningEffort: effort,
	})
}

function getSelect(label: "Model" | "Reasoning Effort") {
	const element = screen.getByLabelText(label)
	if (!(element instanceof HTMLSelectElement)) {
		throw new Error(`${label} is not a select`)
	}
	return element
}

function optionValues(select: HTMLSelectElement) {
	return Array.from(select.options).map((option) => option.value)
}

afterEach(() => {
	cleanup()
	resetConfiguration()
	vi.clearAllMocks()
})

describe("OpenAI native model reasoning settings", () => {
	it("shows model-specific reasoning options", () => {
		const rows = [
			{ id: "gpt-5.5", efforts: ["none", "low", "medium", "high", "xhigh"] },
			{ id: "gpt-5.6-sol", efforts: ["none", "low", "medium", "high", "xhigh", "max"] },
			{ id: "gpt-5.6-terra", efforts: ["none", "low", "medium", "high", "xhigh", "max"] },
			{ id: "gpt-5.6-luna", efforts: ["none", "low", "medium", "high", "xhigh", "max"] },
			{ id: "gpt-6-astra", efforts: ["low", "medium", "high", "xhigh", "max"] },
		]

		for (const mode of modes) {
			for (const { id, efforts } of rows) {
				configureNative(id, "medium")
				const view = render(<OpenAINativeProvider currentMode={mode} showModelOptions={true} />)
				const select = getSelect("Reasoning Effort")
				expect(optionValues(select)).toEqual(efforts)
				expect(select.value).toBe("medium")
				view.unmount()
			}
		}
	})

	it("shows low for saved Astra none without a write", () => {
		for (const mode of modes) {
			configureNative("gpt-6-astra", "none")
			const astraView = render(<OpenAINativeProvider currentMode={mode} showModelOptions={true} />)
			expect(getSelect("Reasoning Effort").value).toBe("low")
			expect(apiConfiguration.planModeReasoningEffort).toBe("none")
			expect(apiConfiguration.actModeReasoningEffort).toBe("none")
			expect(handleModeFieldChange).not.toHaveBeenCalled()
			expect(handleFieldChange).not.toHaveBeenCalled()
			astraView.unmount()

			configureNative("gpt-5.5", "none")
			const gpt55View = render(<OpenAINativeProvider currentMode={mode} showModelOptions={true} />)
			expect(getSelect("Reasoning Effort").value).toBe("none")
			expect(handleModeFieldChange).not.toHaveBeenCalled()
			expect(handleFieldChange).not.toHaveBeenCalled()
			gpt55View.unmount()
		}
	})

	it("persists max through the existing Plan and Act handler", () => {
		for (const mode of modes) {
			for (const id of ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"]) {
				configureNative(id, "medium")
				const view = render(<OpenAINativeProvider currentMode={mode} showModelOptions={true} />)
				fireEvent.change(getSelect("Reasoning Effort"), { target: { value: "max" } })
				expect(handleModeFieldChange).toHaveBeenCalledWith(
					{ plan: "planModeReasoningEffort", act: "actModeReasoningEffort" },
					"max",
					mode,
				)
				view.unmount()
				vi.clearAllMocks()
			}
		}
	})

	it("retains older native options", () => {
		for (const mode of modes) {
			configureNative("gpt-5.4-mini", "max")
			const view = render(<OpenAINativeProvider currentMode={mode} showModelOptions={true} />)
			const select = getSelect("Reasoning Effort")
			expect(optionValues(select)).toEqual(["none", "low", "medium", "high", "xhigh"])
			expect(select.value).toBe("medium")
			expect(apiConfiguration.planModeReasoningEffort).toBe("max")
			expect(apiConfiguration.actModeReasoningEffort).toBe("max")
			expect(handleModeFieldChange).not.toHaveBeenCalled()
			view.unmount()
		}
	})

	it("selects every approved model", () => {
		for (const mode of modes) {
			for (const id of ["gpt-5.5", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"]) {
				configureNative("gpt-5.2", "medium")
				const view = render(<OpenAINativeProvider currentMode={mode} showModelOptions={true} />)
				fireEvent.change(getSelect("Model"), { target: { value: id } })
				expect(handleModeFieldChange).toHaveBeenCalledWith(
					{ plan: "planModeApiModelId", act: "actModeApiModelId" },
					id,
					mode,
				)
				view.unmount()
				vi.clearAllMocks()
			}
		}
	})

	it("does not expose max to unextended providers", () => {
		for (const mode of modes) {
			for (const provider of ["openai", "openai-codex", "openrouter", "vercel-ai-gateway", "cline", "gemini", "vertex"]) {
				Object.assign(apiConfiguration, {
					planModeApiProvider: provider,
					actModeApiProvider: provider,
					planModeApiModelId: "gpt-5.6-sol",
					actModeApiModelId: "gpt-5.6-sol",
					planModeOpenAiModelId: "gpt-5.6-sol",
					actModeOpenAiModelId: "gpt-5.6-sol",
					planModeOpenRouterModelId: "openai/gpt-5.6-sol",
					actModeOpenRouterModelId: "openai/gpt-5.6-sol",
					planModeVercelAiGatewayModelId: "openai/gpt-5.6-sol",
					actModeVercelAiGatewayModelId: "openai/gpt-5.6-sol",
					planModeReasoningEffort: "max",
					actModeReasoningEffort: "max",
				})
				const view = render(<ReasoningEffortSelector currentMode={mode} />)
				const select = getSelect("Reasoning Effort")
				expect(optionValues(select)).toEqual(["none", "low", "medium", "high", "xhigh"])
				expect(select.value).toBe("medium")
				expect(apiConfiguration.planModeReasoningEffort).toBe("max")
				expect(apiConfiguration.actModeReasoningEffort).toBe("max")
				expect(handleModeFieldChange).not.toHaveBeenCalled()
				expect(handleFieldChange).not.toHaveBeenCalled()
				view.unmount()
			}
		}
	})

	it("resolves Plan and Act independently", () => {
		Object.assign(apiConfiguration, {
			planModeApiProvider: "openai-native",
			actModeApiProvider: "openai",
			planModeApiModelId: "gpt-6-astra",
			actModeApiModelId: "gpt-5.6-sol",
			actModeOpenAiModelId: "gpt-5.6-sol",
			planModeReasoningEffort: "none",
			actModeReasoningEffort: "max",
		})

		const planView = render(<ReasoningEffortSelector currentMode="plan" />)
		const planSelect = getSelect("Reasoning Effort")
		expect(optionValues(planSelect)).toEqual(["low", "medium", "high", "xhigh", "max"])
		expect(planSelect.value).toBe("low")
		planView.unmount()

		const actView = render(<ReasoningEffortSelector currentMode="act" />)
		const actSelect = getSelect("Reasoning Effort")
		expect(optionValues(actSelect)).toEqual(["none", "low", "medium", "high", "xhigh"])
		expect(actSelect.value).toBe("medium")
		expect(handleModeFieldChange).not.toHaveBeenCalled()
		expect(handleFieldChange).not.toHaveBeenCalled()
		actView.unmount()
	})

	it("optional allowed efforts only restrict capabilities", () => {
		configureNative("gpt-5.5", "medium")
		render(<ReasoningEffortSelector allowedEfforts={["medium", "max"]} currentMode="plan" />)
		const select = getSelect("Reasoning Effort")
		expect(optionValues(select)).toEqual(["medium"])
		expect(select.value).toBe("medium")
	})
})
