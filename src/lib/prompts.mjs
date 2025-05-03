import pug from 'pug'

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
			if (!promptSpec.name || !promptSpec.content) {
				throw new Error('Missing name or content')
			}

			prompts.push(promptSpec)	
		} catch (error) {
			console.error('Error parsing prompt', parameter.Name, error)
		}
	}

	return prompts.map((promptSpec) => ({
		name: promptSpec.name,
		description: promptSpec.description,
		inputSchema: promptSpec.inputSchema.json,
		content: promptSpec.content,
	}))
}

/**
 * @param {string} content 
 * @param {object} input 
 * @returns {string}
 */
export function buildPrompt(content, input) {
	const template = pug.compile(content)
	return template(input)
}
