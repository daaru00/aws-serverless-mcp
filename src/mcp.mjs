import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { listParameters } from './lib/ssm.mjs'
import { listResources } from './lib/resources.mjs'
import { listPrompts, buildPrompt } from './lib/prompts.mjs'
import { listTools, invokeTool } from './lib/tools.mjs'
import { jsonSchemaObjectToZodRawShape } from 'zod-from-json-schema'

/**
 * @param {object} context 
 * @returns {Promise<McpServer>}
 */
export default async function (context = {}) {
	const server = new McpServer({
		name: process.env.SERVER_NAME,
		version: process.env.SERVER_VERSION,
	}, {
		capabilities: {
			tools: {}
		},
		instructions: process.env.INSTRUCTIONS,
	})

	const parameters = await listParameters()

	const resources = await listResources(parameters)
	for (const resource of resources) {
		server.resource(
			resource.name,
			resource.uri,
			async (uri) => ({
				contents: [{
					uri: uri.href,
					text: resource.content
				}]
			})
		)
	}
  
	const prompts = await listPrompts(parameters)
	for (const prompt of prompts) {
		server.prompt(
			prompt.name,
			prompt.description,
			prompt.inputSchema ? jsonSchemaObjectToZodRawShape(prompt.inputSchema) : {},
			async (input) => ({
				messages: [{
					role: 'user',
					content: {
						type: 'text',
						text: await buildPrompt(prompt.content, input, context)
					}
				}]
			})
		)
	}

	const tools = await listTools(parameters)
	for (const tool of tools) {
		server.tool(
			tool.name,
			tool.description,
			tool.inputSchema ? jsonSchemaObjectToZodRawShape(tool.inputSchema) : {},
			async (input) => await invokeTool(tool.name, input, context)
		)
	}

	return server
}
