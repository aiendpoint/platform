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
  /** Explicit route path override. When set, ONLY this path is served. */
  path?: string
  /** Also serve the legacy '/ai' alias alongside '/.well-known/ai' (default: true). */
  legacyAlias?: boolean
  /** Cache-Control max-age in seconds (default: 3600) */
  maxAge?: number
}

async function aiendpointPlugin(app: FastifyInstance, opts: AiEndpointOptions) {
  const { maxAge = 3600 } = opts
  // /.well-known/ai is authoritative (draft-01); /ai stays as a legacy alias
  const paths = opts.path
    ? [opts.path]
    : opts.legacyAlias === false
      ? ['/.well-known/ai']
      : ['/.well-known/ai', '/ai']

  let specData: Record<string, unknown>

  if (typeof opts.spec === 'string') {
    const specPath = resolve(process.cwd(), opts.spec)
    const raw = readFileSync(specPath, 'utf-8')
    specData = JSON.parse(raw)
  } else {
    specData = opts.spec
  }

  for (const routePath of paths) {
    app.get(routePath, async (_req, reply) => {
      reply
        .header('Content-Type', 'application/json')
        .header('Cache-Control', `public, max-age=${maxAge}`)
        .send(specData)
    })
  }
}

export default aiendpointPlugin
export { aiendpointPlugin as aiendpoint }
