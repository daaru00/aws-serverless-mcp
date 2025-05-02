import Handlebars from 'handlebars'
import AWSXRay from 'aws-xray-sdk'
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm'
const ssm = process.env.AWS_SAM_LOCAL ? new SSMClient() : AWSXRay.captureAWSv3Client(new SSMClient())

const PROMPT_SSM_PREFIX = process.env.PROMPT_SSM_PREFIX

/**
 * @param {string|undefined} previousToken
 * @returns {Promise<object[]>}
 */
export async function listPrompts(previousToken) {
	/** @type {object[]} */
	let prompts = []
    
	if (!PROMPT_SSM_PREFIX) {
		return prompts
	}

	const { Parameters: parameters, NextToken: nextToken } = await ssm.send(new GetParametersByPathCommand({
		Path: PROMPT_SSM_PREFIX,
		Recursive: true,
		NextToken: previousToken,
	}))

	for (const parameter of parameters) {
		try {
			const promptSpec = JSON.parse(parameter.Value)
			prompts.push(promptSpec)	
		} catch (error) {
			console.error('Error parsing tool', parameter.Name, error)
		}
	}

	if (nextToken) {
		const nextTools = await listPrompts(nextToken)
		prompts = prompts.concat(nextTools)
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
