/**
 * Express middleware for serving the AI discovery document.
 *
 * Usage:
 *   import { aiendpoint } from '@aiendpoint/serve/express'
 *   app.use(aiendpoint({ spec: './ai.json' }))
 *
 * Serves /.well-known/ai (authoritative) and the /ai legacy alias.
 * Pass `path` to serve a single custom path, or `legacyAlias: false`
 * to drop the alias.
 */

import type { Request, Response, NextFunction } from 'express'
import { loadSpec, cacheHeader, resolvePaths, type ServeOptions } from './handler.js'

export function aiendpoint(options: ServeOptions) {
  const { maxAge = 3600 } = options
  const paths = resolvePaths(options)
  const specData = loadSpec(options.spec)

  return (req: Request, res: Response, next: NextFunction) => {
    if (!paths.includes(req.path) || req.method !== 'GET') {
      next()
      return
    }
    res
      .set('Content-Type', 'application/json')
      .set('Cache-Control', cacheHeader(maxAge))
      .json(specData)
  }
}
