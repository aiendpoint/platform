/**
 * Fastify plugin for serving /ai.
 *
 * Usage:
 *   import { aiendpoint } from '@aiendpoint/serve/fastify'
 *   app.register(aiendpoint, { spec: './ai.json' })
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { loadSpec, cacheHeader, type ServeOptions } from './handler.js'

interface FastifyServeOptions extends FastifyPluginOptions, ServeOptions {}

async function aiendpointPlugin(app: FastifyInstance, opts: FastifyServeOptions) {
  const { path: routePath = '/ai', maxAge = 3600 } = opts
  const specData = loadSpec(opts.spec)

  app.get(routePath, async (_req, reply) => {
    reply
      .header('Content-Type', 'application/json')
      .header('Cache-Control', cacheHeader(maxAge))
      .send(specData)
  })
}

export default aiendpointPlugin
export { aiendpointPlugin as aiendpoint }
