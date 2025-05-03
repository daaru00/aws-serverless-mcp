import Handlebars from 'handlebars'

const PROMPTS_SSM_PREFIX = process.env.PROMPTS_SSM_PREFIX

/**
 * @param {import('@aws-sdk/client-ssm').Parameter[]} parameters
 * @returns {Promise<object[]>}
 */
export async function listPrompts(parameters) {
	let prompts = []
	if (!PROMPTS_SSM_PREFIX) {
		return prompts
	}

	for (const parameter of parameters) {
		if (!parameter.Name.startsWith(PROMPTS_SSM_PREFIX)) {
			continue
		}

		try {
			const promptSpec = JSON.parse(parameter.Value)
			prompts.push(promptSpec)	
		} catch (error) {
			console.error('Error parsing tool', parameter.Name, error)
		}
	}

	return prompts.map((promptSpec) => ({
		name: promptSpec.name,
		description: promptSpec.description,
		inputSchema: promptSpec.inputSchema.json,
		content: promptSpec.content,
	}))
}

export async function buildPrompt(content, input, context) {
	const template = Handlebars.compile(content)
	return template({
		input,
		context,
	})
}
