# AWS Serverless MCP

MCP Server implementation with AWS Serverless services.

## Development

Requirements:
- [NodeJS](https://nodejs.org/en/download) >= 22.x

Install NPM modules
```bash
npm install
```

Configure the .env file with MCP server specifications:
```
SERVER_NAME=local
SERVER_VERSION=1.0.0
INSTRUCTIONS=""
```

Configure the .env file with AWS environment configuration:
```
AWS_PROFILE=<your AWS profile>
AWS_REGION=<selected AWS region>

SSM_PREFIX=
TOOLS_SSM_PREFIX=
RESOURCES_SSM_PREFIX=
PROMPTS_SSM_PREFIX=
TOOL_LAMBDA_PREFIX=
```

Run local MCP server
```bash
npm run dev
```

The MCP server is running on `http://localhost:3000/mcp`.

### Tool Inspector

Run the [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
```bash
npm run inspector
```

Configure the inspector with:
- Transport Type: `Streamable HTTP`
- URL: `http://localhost:3000/mcp`

Connect to the MCP server with "Connect" button.

## Deploy

Requirements:
- [SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- [NodeJS](https://nodejs.org/en/download) >= 22.x

Build project
```bash
sam build
```

Deploy the stack
```bash
sam deploy --profile <your AWS profile> --guided
```
