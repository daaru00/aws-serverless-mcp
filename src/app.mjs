import express from 'express'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js'
import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js'
import getServer from './mcp.mjs'

const AUTHENTICATION_TYPE = process.env.AUTHENTICATION_TYPE

// Initialize Express app
const app = express()
app.use(express.json())

// Log all requests
app.use((req, res, next) => {
	console.log(`${req.method} ${req.url}`)
	next()
})

// Validate authorization header
const auth = async (req, res, next) => {
	res.locals.query = req.query

	if (AUTHENTICATION_TYPE === 'DISABLED' || AUTHENTICATION_TYPE === 'OAUTH') {
		return next()
	}

	res.locals.token = (req.headers['authorization'] || req.headers['Authorization'] || '').replace('Bearer ').trim()
	if (AUTHENTICATION_TYPE === 'TOKEN_REQUIRED' && !res.locals.token) {
		console.error('Missing or invalid authorization token')
		return res.status(401).json({
			jsonrpc: '2.0',
			error: {
				code: -32600,
				message: 'Unauthorized',
			},
			id: null,
		})
	}
  
	next()
}

if (AUTHENTICATION_TYPE === 'OAUTH') {
	const proxyProvider = new ProxyOAuthServerProvider({
		endpoints: {
			authorizationUrl: process.env.OAUTH_AUTHORIZATION_URL,
			tokenUrl: process.env.OAUTH_TOKEN_URL,
			revocationUrl: process.env.OAUTH_REVOCATION_URL,
		},
		verifyAccessToken: async (token) => {
			return {
				token,
				clientId: '123',
				scopes: ['openid', 'email', 'profile'],
			}
		},
		getClient: async (client_id) => {
			return {
				client_id,
				redirect_uris: (process.env.OAUTH_REDIRECT_URIS || '').split(',').map((uri) => uri.trim()),
			}
		}
	})

	app.use(mcpAuthRouter({
		provider: proxyProvider,
		issuerUrl: new URL(process.env.OAUTH_ISSUER_URL),
	}))
}

app.post('/mcp', auth, async (req, res) => {
	console.log('Received POST MCP request')

	try {
		const server = await getServer(res.locals.shop)
		const transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
			enableJsonResponse: true
		})
		res.on('close', () => {
			console.log('Request closed')
			transport.close()
			server.close()
		})
		await server.connect(transport)
		await transport.handleRequest(req, res, req.body)
	} catch (error) {
		console.error('Error handling MCP request:', error)
		if (!res.headersSent) {
			return res.status(500).json({
				jsonrpc: '2.0',
				error: {
					code: -32603,
					message: 'Internal server error',
				},
				id: null,
			})
		}
	}
})

app.get('/mcp', async (req, res) => {
	console.log('Received GET MCP request')
	res.writeHead(405).end(JSON.stringify({
		jsonrpc: '2.0',
		error: {
			code: -32000,
			message: 'Method not allowed.'
		},
		id: null
	}))
})

app.delete('/mcp', async (req, res) => {
	console.log('Received DELETE MCP request')
	res.writeHead(405).end(JSON.stringify({
		jsonrpc: '2.0',
		error: {
			code: -32000,
			message: 'Method not allowed.'
		},
		id: null
	}))
})

export default app
