import 'dotenv/config'
import app from './src/app.mjs'

app.listen(process.env.PORT || 3000, () => {
	console.log(`MCP Server is running on http://localhost:${process.env.PORT || 3000}`)
})
