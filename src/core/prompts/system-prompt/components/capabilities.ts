import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const getCapabilitiesTemplateText = `CAPABILITIES

- environment_details provides runtime context.
- You can use search_files to perform regex searches across files in a specified directory
    - When asked to edit or review code, review the runtime context in environment_details, use list_files or list_code_definition_names, then read_file_range or read_file to examine the contents of relevant files, then the replace_in_file tool to implement changes.
- You can use the execute_command tool to run commands on the user's computer whenever you feel it can help accomplish the user's task. When you need to execute a CLI command, you must provide a clear explanation of what the command does. Prefer to execute complex CLI commands over creating executable scripts.
- Prefer non-interactive commands when possible: use flags to disable pagers (e.g., '--no-pager'), auto-confirm prompts (e.g., '-y' when safe), provide input via flags/arguments rather than stdin, suppress interactive behavior, etc. For commands that may fail, consider redirecting stderr to stdout (e.g., \`command 2>&1\`) so you can see error messages in the output.
- Long-running commands run in the background; you'll be updated on their status. Each command you execute is run in a new terminal instance.{{BROWSER_CAPABILITIES}}{{WEB_TOOLS_CAPABILITIES}}`

export async function getCapabilitiesSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	if (context.useMinimalGptPrompt === true) {
		const browserCapabilities = context.supportsBrowserUse
			? "- Browser automation is available for web verification when needed."
			: ""
		const webToolsCapabilities =
			context.providerInfo.providerId === "cline" && context.clineWebToolsEnabled === true
				? "- Web search/fetch tools are available for current external information."
				: ""

		return new TemplateEngine().resolve(
			`CAPABILITIES

- Use read/search/list tools to inspect the codebase efficiently.
- Use execute_command for validation, builds, and targeted shell operations.
${browserCapabilities}
${webToolsCapabilities}
- MCP servers may provide additional tools/resources when connected.`,
			context,
			{},
		)
	}

	const template = variant.componentOverrides?.[SystemPromptSection.CAPABILITIES]?.template || getCapabilitiesTemplateText

	const browserSupport = context.supportsBrowserUse ? ", use the browser" : ""
	const browserCapabilities = context.supportsBrowserUse
		? `\n- You can use the browser_action tool to interact with websites (including html files and locally running development servers) through a Puppeteer-controlled browser when you feel it is necessary in accomplishing the user's task. This tool is particularly useful for web development tasks as it allows you to launch a browser, navigate to pages, interact with elements through clicks and keyboard input, and capture the results through screenshots and console logs. This tool may be useful at key stages of web development tasks-such as after implementing new features, making substantial changes, when troubleshooting issues, or to verify the result of your work. You can analyze the provided screenshots to ensure correct rendering or identify errors, and review console logs for runtime issues.\n\t- For example, if asked to add a component to a react website, you might create the necessary files, use execute_command to run the site locally, then use browser_action to launch the browser, navigate to the local server, and verify the component renders & functions correctly before closing the browser.`
		: ""

	const webToolsCapabilities =
		context.providerInfo.providerId === "cline" && context.clineWebToolsEnabled === true
			? `\n- When the task requires or could benefit from getting up to date information on a topic (e.g. latest best practices, latest documentation, latest news, etc.), use the web_search tool to find current results, then use the web_fetch tool to retrieve and analyze the content from relevant URLs.`
			: ""

	const templateEngine = new TemplateEngine()
	return templateEngine.resolve(template, context, {
		BROWSER_SUPPORT: browserSupport,
		BROWSER_CAPABILITIES: browserCapabilities,
		WEB_TOOLS_CAPABILITIES: webToolsCapabilities,
		CWD: context.cwd || process.cwd(),
	})
}
