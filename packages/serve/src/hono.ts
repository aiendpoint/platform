/**
 * Hono middleware for serving /ai.
 *
 * Usage:
 *   import { aiendpoint } from '@aiendpoint/serve/hono'
 *   app.use(aiendpoint({ spec: './ai.json' }))
 *
 *   // or register at specific path:
 *   app.get('/ai', aiendpoint({ spec: './ai.json' }))
 */

import type { Context, MiddlewareHandler } from 'hono'
import { loadSpec, cacheHeader, type ServeOptions } from './handler.js'

export function aiendpoint(options: ServeOptions): MiddlewareHandler {
  const { maxAge = 3600, path: routePath = '/ai' } = options
  const specData = loadSpec(options.spec)

  return async (c: Context, next) => {
    if (c.req.path !== routePath || c.req.method !== 'GET') {
      await next()
      return
    }
    return c.json(specData, 200, {
      'Cache-Control': cacheHeader(maxAge),
    })
  }
}
