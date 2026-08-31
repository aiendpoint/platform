/**
 * Next.js App Router handler for serving the AI discovery document.
 *
 * The route file's location decides the path. Serve the authoritative
 * well-known location, plus the /ai legacy alias if you want one:
 *
 *   // app/.well-known/ai/route.ts
 *   import { aiendpoint } from '@aiendpoint/serve/next'
 *   export const GET = aiendpoint({ spec: './ai.json' })
 *
 *   // app/ai/route.ts (optional legacy alias — same spec)
 *   export { GET } from '../.well-known/ai/route'
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
