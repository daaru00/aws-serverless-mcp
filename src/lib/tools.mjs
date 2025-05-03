import AWSXRay from 'aws-xray-sdk'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
const lambda = process.env.AWS_SAM_LOCAL ? new LambdaClient() : AWSXRay.captureAWSv3Client(new LambdaClient())

const TOOLS_SSM_PREFIX = process.env.TOOLS_SSM_PREFIX
const TOOL_LAMBDA_PREFIX = process.env.TOOL_LAMBDA_PREFIX

/**
 * @param {import('@aws-sdk/client-ssm').Parameter[]} parameters
 * @returns {Promise<object[]>}
 */
export async function listTools(parameters) {
	let tools = []
	if (!TOOLS_SSM_PREFIX) {
		return tools
	}

	for (const parameter of parameters) {
		if (!parameter.Name.startsWith(TOOLS_SSM_PREFIX)) {
			continue
		}

		try {
			const toolSpec = JSON.parse(parameter.Value)
			tools.push(toolSpec)	
		} catch (error) {
			console.error('Error parsing tool', parameter.Name, error)
		}
	}

	return tools.map((toolSpec) => ({
		name: toolSpec.name,
		description: toolSpec.description,
		inputSchema: toolSpec.inputSchema.json,
	}))
}

/**
 * @param {string} format
 * @returns {string|null}
 */
function getMimeType (format) {
	switch (format) {
	case 'gif':
		return 'image/gif'
	case 'jpeg':
	case 'jpg':
		return 'image/jpeg'
	case 'png':
		return 'image/png'
	case 'webp':
		return 'image/webp'
	default:
		return null
	}
}

/**
 * @param {string} tool
 * @param {object} payload
 * @param {object} context
 */
export async function invokeTool(tool, input, context = {}) {
	if (!tool) {
		throw new Error('Tool name not found')
	}

	const { Payload: payload } = await lambda.send(new InvokeCommand({
		FunctionName: TOOL_LAMBDA_PREFIX + tool,
		Payload: JSON.stringify({ toolUseId: null, name: null, input }),
		ClientContext: Buffer.from(JSON.stringify(context)).toString('base64'),
	}))

	const payloadString = Buffer.from(payload).toString()
	const response = JSON.parse(payloadString)
	if (response.errorType) {
		throw new Error(response.errorMessage)
	}
	if (response.status === 'error') {
		throw new Error(response.content[0].text)
	}

	return {
		content: response.content.map(content => {
			if (content.text) {
				return {
					type: 'text',
					text: content.text,
				}
			}
			if (content.json) {
				return {
					type: 'text',
					text: JSON.stringify(content.json),
				}
			}
			if (content.image) {
				return {
					type: 'image',
					data: Buffer.from(content.image.source.bytes).toString('base64'),
					mimeType: getMimeType(content.image.format),
				}
			}
			return null
		}).filter(content => content !== null),
	}
}
