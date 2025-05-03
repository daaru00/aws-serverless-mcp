const RESOURCES_SSM_PREFIX = process.env.RESOURCES_SSM_PREFIX

/**
 * @param {import('@aws-sdk/client-ssm').Parameter[]} parameters
 * @returns {Promise<object[]>}
 */
export async function listResources(parameters) {
	let resources = []
	if (!RESOURCES_SSM_PREFIX) {
		return resources
	}

	for (const parameter of parameters) {
		if (!parameter.Name.startsWith(RESOURCES_SSM_PREFIX)) {
			continue
		}

		try {
			const resourceSpec = JSON.parse(parameter.Value)
			resources.push(resourceSpec)	
		} catch (error) {
			console.error('Error parsing tool', parameter.Name, error)
		}
	}

	return resources.map((resourceSpec) => ({
		name: resourceSpec.name,
		uri: resourceSpec.uri,
		content: resourceSpec.content,
	}))
}
