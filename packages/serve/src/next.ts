/**
 * Next.js App Router handler for serving /ai.
 *
 * Usage:
 *   // app/ai/route.ts
 *   import { aiendpoint } from '@aiendpoint/serve/next'
 *   export const GET = aiendpoint({ spec: './ai.json' })
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
