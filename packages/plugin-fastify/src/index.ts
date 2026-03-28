/**
 * @aiendpoint/fastify - Serve /ai from Fastify in one line.
 *
 * Usage:
 *   import aiendpoint from '@aiendpoint/fastify'
 *   app.register(aiendpoint, { spec: './ai.json' })
 *
 *   // or with inline spec:
 *   app.register(aiendpoint, { spec: { aiendpoint: '1.0', ... } })
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { FastifyInstance, FastifyPluginOptions } from 'fastify'

interface AiEndpointOptions extends FastifyPluginOptions {
  /** Path to ai.json file (relative to cwd) or inline spec object */
  spec: string | Record<string, unknown>
  /** Route path (default: '/ai') */
  path?: string
  /** Cache-Control max-age in seconds (default: 3600) */
  maxAge?: number
}

async function aiendpointPlugin(app: FastifyInstance, opts: AiEndpointOptions) {
  const { path: routePath = '/ai', maxAge = 3600 } = opts

  let specData: Record<string, unknown>

  if (typeof opts.spec === 'string') {
    const specPath = resolve(process.cwd(), opts.spec)
    const raw = readFileSync(specPath, 'utf-8')
    specData = JSON.parse(raw)
  } else {
    specData = opts.spec
  }

  app.get(routePath, async (_req, reply) => {
    reply
      .header('Content-Type', 'application/json')
      .header('Cache-Control', `public, max-age=${maxAge}`)
      .send(specData)
  })
}

export default aiendpointPlugin
export { aiendpointPlugin as aiendpoint }
