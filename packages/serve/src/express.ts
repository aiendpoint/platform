/**
 * Express middleware for serving /ai.
 *
 * Usage:
 *   import { aiendpoint } from '@aiendpoint/serve/express'
 *   app.use(aiendpoint({ spec: './ai.json' }))
 */

import type { Request, Response, NextFunction } from 'express'
import { loadSpec, cacheHeader, type ServeOptions } from './handler.js'

export function aiendpoint(options: ServeOptions) {
  const { maxAge = 3600, path: routePath = '/ai' } = options
  const specData = loadSpec(options.spec)

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path !== routePath || req.method !== 'GET') {
      next()
      return
    }
    res
      .set('Content-Type', 'application/json')
      .set('Cache-Control', cacheHeader(maxAge))
      .json(specData)
  }
}
