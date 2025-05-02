import app from './app.mjs'
import serverlessExpress from '@codegenie/serverless-express'
export const handler = serverlessExpress({ app })
