/**
 * @aiendpoint/serve
 *
 * Serve your /ai endpoint from any JS/TS framework.
 *
 * Import the adapter for your framework:
 *   import { aiendpoint } from '@aiendpoint/serve/express'
 *   import { aiendpoint } from '@aiendpoint/serve/fastify'
 *   import { aiendpoint } from '@aiendpoint/serve/next'
 *   import { aiendpoint } from '@aiendpoint/serve/hono'
 *
 * Or use the shared utilities directly:
 *   import { loadSpec, cacheHeader } from '@aiendpoint/serve/handler'
 */

export { loadSpec, cacheHeader, type ServeOptions } from './handler.js'
