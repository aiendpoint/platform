/**
 * Hono middleware for serving the AI discovery document.
 *
 * Usage:
 *   import { aiendpoint } from '@aiendpoint/serve/hono'
 *   app.use(aiendpoint({ spec: './ai.json' }))
 *
 * Serves /.well-known/ai (authoritative) and the /ai legacy alias.
 * Pass `path` to serve a single custom path, or `legacyAlias: false`
 * to drop the alias.
 */

import type { Context, MiddlewareHandler } from 'hono'
import { loadSpec, cacheHeader, resolvePaths, type ServeOptions } from './handler.js'

export function aiendpoint(options: ServeOptions): MiddlewareHandler {
  const { maxAge = 3600 } = options
  const paths = resolvePaths(options)
  const specData = loadSpec(options.spec)

  return async (c: Context, next) => {
    if (!paths.includes(c.req.path) || c.req.method !== 'GET') {
      await next()
      return
    }
    return c.json(specData, 200, {
      'Cache-Control': cacheHeader(maxAge),
    })
  }
}
