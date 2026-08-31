/**
 * Fastify plugin for serving the AI discovery document.
 *
 * Usage:
 *   import { aiendpoint } from '@aiendpoint/serve/fastify'
 *   app.register(aiendpoint, { spec: './ai.json' })
 *
 * Serves /.well-known/ai (authoritative) and the /ai legacy alias.
 * Pass `path` to serve a single custom path, or `legacyAlias: false`
 * to drop the alias.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { loadSpec, cacheHeader, resolvePaths, type ServeOptions } from './handler.js'

interface FastifyServeOptions extends FastifyPluginOptions, ServeOptions {}

async function aiendpointPlugin(app: FastifyInstance, opts: FastifyServeOptions) {
  const { maxAge = 3600 } = opts
  const specData = loadSpec(opts.spec)

  for (const routePath of resolvePaths(opts)) {
    app.get(routePath, async (_req, reply) => {
      reply
        .header('Content-Type', 'application/json')
        .header('Cache-Control', cacheHeader(maxAge))
        .send(specData)
    })
  }
}

export default aiendpointPlugin
export { aiendpointPlugin as aiendpoint }
