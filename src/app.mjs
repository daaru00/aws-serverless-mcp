import express from 'express'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import getServer from './mcp.mjs'

const REQUIRE_AUTH = process.env.REQUIRE_AUTH === 'TRUE'

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
	res.locals.token = (req.headers['authorization'] || req.headers['Authorization'] || '').replace('Bearer ').trim()

	if (REQUIRE_AUTH && !res.locals.token) {
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
