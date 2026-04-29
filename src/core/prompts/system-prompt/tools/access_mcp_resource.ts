import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import { hasConnectedMcpResources } from "../components/mcp"
import type { ClineToolSpec } from "../spec"

/**
 * ## access_mcp_resource
Description: Request to access a resource provided by a connected MCP server. Resources represent data sources that can be used as context, such as files, API responses, or system information.
Parameters:
- server_name: (required) The name of the MCP server providing the resource
- uri: (required) The URI identifying the specific resource to access
Usage:
<access_mcp_resource>
<server_name>server name here</server_name>
<uri>resource URI here</uri>
</access_mcp_resource>
 */

const generic: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.MCP_ACCESS,
	name: "access_mcp_resource",
	description:
		"Request to access a resource provided by a connected MCP server. Resources represent data sources that can be used as context, such as files, API responses, or system information.",
	contextRequirements: (context) => hasConnectedMcpResources(context),
	parameters: [
		{
			name: "server_name",
			required: true,
			instruction: "The name of the MCP server providing the resource",
			usage: "server name here",
		},
		{
			name: "uri",
			required: true,
			instruction: "The URI identifying the specific resource to access",
			usage: "resource URI here",
		},
	],
}

const NATIVE_GPT_5: ClineToolSpec = {
	variant: ModelFamily.NATIVE_GPT_5,
	id: ClineDefaultTool.MCP_ACCESS,
	name: "access_mcp_resource",
	description:
		"Request to access a resource provided by a connected MCP server. Resources represent data sources that can be used as context, such as files, API responses, or system information. You must only use this tool if you have been informed of the MCP server and the resource you are trying to access.",
	contextRequirements: (context) => hasConnectedMcpResources(context),
	parameters: [
		{
			name: "server_name",
			required: true,
			instruction: "The name of the MCP server providing the resource",
			usage: "server name here",
		},
		{
			name: "uri",
			required: true,
			instruction: "The URI identifying the specific resource to access",
			usage: "resource URI here",
		},
	],
}

const nextGen = { ...generic, variant: ModelFamily.NEXT_GEN }
const gpt = { ...generic, variant: ModelFamily.GPT }

const NATIVE_NEXT_GEN: ClineToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.NATIVE_NEXT_GEN,
}

export const access_mcp_resource_variants = [generic, nextGen, gpt, NATIVE_GPT_5, NATIVE_NEXT_GEN]
