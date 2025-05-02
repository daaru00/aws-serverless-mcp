import AWSXRay from 'aws-xray-sdk'
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm'
const ssm = process.env.AWS_SAM_LOCAL ? new SSMClient() : AWSXRay.captureAWSv3Client(new SSMClient())

const RESOURCES_SSM_PREFIX = process.env.RESOURCES_SSM_PREFIX

/**
 * @param {string|undefined} previousToken
 * @returns {Promise<object[]>}
 */
export async function listResources(previousToken) {
	/** @type {object[]} */
	let resources = []
    
	if (!RESOURCES_SSM_PREFIX) {
		return resources
	}

	const { Parameters: parameters, NextToken: nextToken } = await ssm.send(new GetParametersByPathCommand({
		Path: RESOURCES_SSM_PREFIX,
		Recursive: true,
		NextToken: previousToken,
	}))

	for (const parameter of parameters) {
		try {
			const resourceSpec = JSON.parse(parameter.Value)
			resources.push(resourceSpec)	
		} catch (error) {
			console.error('Error parsing tool', parameter.Name, error)
		}
	}

	if (nextToken) {
		const nextTools = await listResources(nextToken)
		resources = resources.concat(nextTools)
	}

	return resources.map((resourceSpec) => ({
		name: resourceSpec.name,
		uri: resourceSpec.uri,
		content: resourceSpec.content,
	}))
}
