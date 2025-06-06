import express from 'express'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js'
import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js'
import getServer from './mcp.mjs'

const AUTHENTICATION_TYPE = process.env.AUTHENTICATION_TYPE || 'DISABLED'
const AUTHENTICATION_TOKEN = process.env.AUTHENTICATION_TOKEN || ''

// Initialize Express app
const app = express()
app.use(express.json())
app.disable('x-powered-by')

// Global middleware
app.use((req, res, next) => {
	res.contentType('application/json')
	console.debug(`${req.method} ${req.url}`, req.body ? JSON.stringify(req.body, null, 2) : '')
	next()
})

// Validate authorization header
const auth = async (req, res, next) => {
	res.locals.query = req.query || {}
	res.locals.userAgent = (req.headers['user-agent'] || req.headers['User-Agent'] || '')

	if (AUTHENTICATION_TYPE === 'DISABLED') {
		return next()
	}

	res.locals.token = (req.headers['authorization'] || req.headers['Authorization'] || '').replace('Bearer ').trim()
	if (AUTHENTICATION_TYPE === 'TOKEN_REQUIRED' && !res.locals.token) {
		console.error('Missing authorization token')
		return res.writeHead(403).end(JSON.stringify({
			jsonrpc: '2.0',
			error: {
				code: -32600,
				message: 'Forbidden',
			},
			id: null,
		}))
	} else if (AUTHENTICATION_TYPE === 'OAUTH' && !res.locals.token) {
		console.error('Missing authorization token, requesting login..')
		return res.writeHead(401).end(JSON.stringify({
			jsonrpc: '2.0',
			error: {
				code: -32600,
				message: 'Unauthorized',
			},
			id: null,
		}))
	}

	if (AUTHENTICATION_TYPE === 'TOKEN_REQUIRED' && AUTHENTICATION_TOKEN && res.locals.token !== AUTHENTICATION_TOKEN) {
		console.error('Invalid authorization token')
		return res.writeHead(403).end(JSON.stringify({
			jsonrpc: '2.0',
			error: {
				code: -32600,
				message: 'Forbidden',
			},
			id: null,
		}))
	}
  
	next()
}

// Work in progress
if (AUTHENTICATION_TYPE === 'OAUTH') {
	console.log('Initializing OAuth2 authentication (WIP)')
	const proxyProvider = new ProxyOAuthServerProvider({
		endpoints: {
			authorizationUrl: process.env.OAUTH_AUTHORIZATION_URL,
			tokenUrl: process.env.OAUTH_TOKEN_URL,
			revocationUrl: process.env.OAUTH_REVOCATION_URL,
		},
		verifyAccessToken: async (token) => {
			console.log('Verifying access token:', token)
			return {
				token,
				clientId: '123',
				scopes: ['openid', 'email', 'profile'],
			}
		},
		getClient: async (client_id) => {
			console.log('Getting client:', client_id)
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
	try {
		const server = await getServer(res.locals)
		const transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
			enableJsonResponse: true
		})
		res.on('close', () => {
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
					message: 'Internal Server Error',
				},
				id: null,
			})
		}
	}
})

app.get('/mcp', async (req, res) => {
	res.writeHead(405).end(JSON.stringify({
		jsonrpc: '2.0',
		error: {
			code: -32000,
			message: 'Method Not Allowed'
		},
		id: null
	}))
})

app.delete('/mcp', async (req, res) => {
	res.writeHead(405).end(JSON.stringify({
		jsonrpc: '2.0',
		error: {
			code: -32000,
			message: 'Method Not Allowed'
		},
		id: null
	}))
})

export default app
