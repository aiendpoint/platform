/**
 * Next.js App Router handler for serving the AI discovery document.
 *
 * The route file's location decides the path. The App Router cannot route
 * dot-folders, so serve the handler at /ai and rewrite the authoritative
 * well-known location onto it:
 *
 *   // app/ai/route.ts
 *   import { aiendpoint } from '@aiendpoint/serve/next'
 *   export const GET = aiendpoint({ spec: './ai.json' })
 *
 *   // next.config.ts
 *   async rewrites() {
 *     return [{ source: '/.well-known/ai', destination: '/ai' }]
 *   }
 */

import { NextResponse } from 'next/server'
import { loadSpec, cacheHeader, type ServeOptions } from './handler.js'

export function aiendpoint(options: ServeOptions) {
  const { maxAge = 3600 } = options
  const specData = loadSpec(options.spec)

  return async function GET() {
    return NextResponse.json(specData, {
      headers: { 'Cache-Control': cacheHeader(maxAge) },
    })
  }
}
