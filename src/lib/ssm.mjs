import AWSXRay from 'aws-xray-sdk'
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm'
const ssm = process.env.AWS_LAMBDA_FUNCTION_NAME ? AWSXRay.captureAWSv3Client(new SSMClient()) : new SSMClient()

const SSM_PREFIX = process.env.SSM_PREFIX

/**
 * @param {string|undefined} previousToken
 * @returns {Promise<object[]>}
 */
export async function listParameters(previousToken) {
	if (!SSM_PREFIX) {
		return []
	}

	let { Parameters: parameters, NextToken: nextToken } = await ssm.send(new GetParametersByPathCommand({
		Path: SSM_PREFIX,
		Recursive: true,
		NextToken: previousToken,
	}))

	if (nextToken) {
		const nextParameters = await listParameters(nextToken)
		parameters = parameters.concat(nextParameters)
	}

	return parameters
}
